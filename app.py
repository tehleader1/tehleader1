import os, json, sqlite3, datetime, hashlib, secrets, threading, random, re
from flask import Flask, request, jsonify, Response, redirect

app = Flask(__name__)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

AUTH_DB = os.path.join(os.path.dirname(__file__), "users.db")

_db_lock = threading.Lock()

def get_db():
    con = sqlite3.connect(AUTH_DB, timeout=60, check_same_thread=False)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    con.execute("PRAGMA busy_timeout=60000")
    con.row_factory = sqlite3.Row
    return con

def db_execute(query, params=(), fetchone=False, fetchall=False):
    import time
    for attempt in range(5):
        try:
            with _db_lock:
                con = sqlite3.connect(AUTH_DB, timeout=60, check_same_thread=False)
                con.execute("PRAGMA journal_mode=WAL")
                con.execute("PRAGMA busy_timeout=60000")
                cur = con.execute(query, params)
                result = None
                if fetchone: result = cur.fetchone()
                elif fetchall: result = cur.fetchall()
                con.commit()
                con.close()
                return result
        except sqlite3.OperationalError as e:
            if "locked" in str(e) and attempt < 4:
                time.sleep(0.5 * (attempt + 1))
                continue
            raise

def init_auth_db():
    con = get_db()
    con.execute("""CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        email         TEXT    UNIQUE NOT NULL,
        name          TEXT,
        password_hash TEXT,
        google_id     TEXT,
        avatar        TEXT,
        created_at    TEXT    DEFAULT (datetime('now')),
        last_login    TEXT
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS sessions (
        token      TEXT PRIMARY KEY,
        user_id    INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT NOT NULL
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS hair_profiles (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER UNIQUE NOT NULL,
        hair_type    TEXT,
        hair_concerns TEXT,
        treatments   TEXT,
        products_tried TEXT,
        last_updated TEXT DEFAULT (datetime('now'))
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS chat_history (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        role       TEXT NOT NULL,
        content    TEXT NOT NULL,
        ts         TEXT DEFAULT (datetime('now'))
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS premium_codes (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        code     TEXT UNIQUE NOT NULL,
        used     INTEGER DEFAULT 0,
        used_by  INTEGER,
        used_at  TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    )""")
    con.commit()
    con.close()

init_auth_db()

def hash_password(pw):
    salt = "supportrd_salt_2024"
    return hashlib.sha256((pw + salt).encode()).hexdigest()

def create_session(user_id):
    token = secrets.token_hex(32)
    expires = (datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat()
    db_execute("INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,?)", (token, user_id, expires))
    db_execute("UPDATE users SET last_login=? WHERE id=?", (datetime.datetime.utcnow().isoformat(), user_id))
    return token

def get_user_from_token(token):
    if not token: return None
    row = db_execute("""SELECT u.id,u.email,u.name,u.avatar FROM users u
        JOIN sessions s ON s.user_id=u.id
        WHERE s.token=? AND s.expires_at > datetime('now')""", (token,), fetchone=True)
    if row: return {"id":row[0],"email":row[1],"name":row[2],"avatar":row[3]}
    return None

def get_current_user():
    token = request.headers.get("X-Auth-Token") or request.cookies.get("srd_token")
    return get_user_from_token(token)

def get_hair_profile(user_id):
    con = get_db()
    row = con.execute("SELECT * FROM hair_profiles WHERE user_id=?", (user_id,)).fetchone()
    con.close()
    if not row: return {}
    return {"hair_type":row[2],"hair_concerns":row[3],"treatments":row[4],"products_tried":row[5]}

def save_hair_profile(user_id, data):
    con = get_db()
    con.execute("""INSERT INTO hair_profiles (user_id,hair_type,hair_concerns,treatments,products_tried)
        VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
        hair_type=excluded.hair_type, hair_concerns=excluded.hair_concerns,
        treatments=excluded.treatments, products_tried=excluded.products_tried,
        last_updated=datetime('now')""",
        (user_id, data.get("hair_type",""), data.get("hair_concerns",""),
         data.get("treatments",""), data.get("products_tried","")))
    con.commit()
    con.close()

def get_chat_history(user_id, limit=20):
    con = get_db()
    rows = con.execute("""SELECT role,content FROM chat_history
        WHERE user_id=? ORDER BY id DESC LIMIT ?""", (user_id, limit)).fetchall()
    con.close()
    return [{"role":r[0],"content":r[1]} for r in reversed(rows)]

def save_chat_message(user_id, role, content):
    con = get_db()
    con.execute("INSERT INTO chat_history (user_id,role,content) VALUES (?,?,?)",
                (user_id, role, content))
    con.execute("""DELETE FROM chat_history WHERE user_id=? AND id NOT IN
        (SELECT id FROM chat_history WHERE user_id=? ORDER BY id DESC LIMIT 100)""",
                (user_id, user_id))
    con.commit()
    con.close()

# ── ANALYTICS DB ─────────────────────────────────────────────────────────────
DB_PATH = os.path.join(os.path.dirname(__file__), "analytics.db")

def get_analytics_db():
    con = sqlite3.connect(DB_PATH, timeout=30, check_same_thread=False)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=30000")
    return con

def init_db():
    con = get_analytics_db()
    con.execute("""CREATE TABLE IF NOT EXISTS events (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        ts        TEXT    NOT NULL,
        lang      TEXT,
        user_msg  TEXT,
        product   TEXT,
        concern   TEXT
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS tips (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        ts         TEXT    NOT NULL,
        lang       TEXT,
        rating     INTEGER,
        tip_amount TEXT,
        product    TEXT
    )""")
    con.commit(); con.close()

init_db()

def log_event(lang, user_msg, product, concern):
    try:
        con = get_analytics_db()
        con.execute("INSERT INTO events (ts,lang,user_msg,product,concern) VALUES (?,?,?,?,?)",
                    (datetime.datetime.utcnow().isoformat(), lang, user_msg, product, concern))
        con.commit(); con.close()
    except Exception as e:
        print("DB log error:", e)

def log_tip(lang, rating, tip_amount, product):
    try:
        con = get_analytics_db()
        con.execute("INSERT INTO tips (ts,lang,rating,tip_amount,product) VALUES (?,?,?,?,?)",
                    (datetime.datetime.utcnow().isoformat(), lang, rating, tip_amount, product))
        con.commit(); con.close()
    except Exception as e:
        print("DB tip log error:", e)

def extract_product(text):
    t = text.lower()
    if "formula exclusiva" in t: return "Formula Exclusiva"
    if "laciador" in t or "crece" in t: return "Laciador Crece"
    if "gotero" in t or "rapido" in t: return "Gotero Rapido"
    if "gotitas" in t or "brillantes" in t or "gotika" in t: return "Gotitas Brillantes"
    if "mascarilla" in t: return "Mascarilla"
    if "shampoo" in t or "aloe" in t: return "Shampoo Aloe Vera"
    return "Unknown"

def extract_concern(text):
    t = text.lower()
    if any(w in t for w in ["damag","break","weak","fall","shed","bald","thin"]): return "damaged/falling"
    if any(w in t for w in ["color","colour","fade","brassy","grey","gray","dye"]): return "color"
    if any(w in t for w in ["oil","greasy","grease","sebum","buildup"]): return "oily"
    if any(w in t for w in ["dry","frizz","rough","brittle","moisture","parched"]): return "dry"
    if any(w in t for w in ["tangl","knot","matted","detangle"]): return "tangly"
    if any(w in t for w in ["flat","volume","lifeless","limp","fine","no bounce"]): return "flat/volume"
    return "general"

# ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are Aria — a warm, knowledgeable, luxury hair care advisor for SupportRD, a professional Dominican hair care brand. You have deep expertise in hair science, scalp health, and hair culture across all ethnicities.

CRITICAL RULE: You may ONLY recommend SupportRD's 6 products listed below. NEVER mention, suggest, or reference any outside brands, competitor products, or third-party products (e.g. Olaplex, Redken, Pantene, Dove, SheaMoisture, etc.). If asked about other brands, redirect warmly to the SupportRD product that solves the same concern.

YOUR PRODUCTS:
- Formula Exclusiva ($55): Professional all-in-one treatment. Apply on dry or damp hair; for wash use 1oz for 5 min in dryer then rinse. Safe for whole family including children. Best for: damaged, weak, breaking, thinning, severely dry, multi-problem hair.
- Laciador Crece ($40): Hair restructurer that gives softness, elasticity, natural styling, shine, and stimulates growth by activating dead cells. Best for: dry hair, frizz, lack of shine, growth, strengthening, styling.
- Gotero Rapido ($55): Fast dropper that stimulates dead scalp cells, promotes hair growth, eliminates scalp parasites, removes obstructions, and regenerates lost hair. Use on scalp every night then remove. Best for: hair loss, scalp issues, slow growth, thinning, parasites.
- Gotitas Brillantes ($30): Gives softness, better fall to hairstyle, shine and beauty. Use after any hairstyle or anytime. Adds warmth and evenness. Best for: finishing, shine, frizz control, styling touch-up.
- Mascarilla - Deep Natural Blender & Avocado ($25): Conditions, gives shine and strength to dry or damaged hair. Keeps hair beautiful and healthy. Best for: deep conditioning, dry/damaged hair, shine boost.
- Shampoo with Aloe Vera & Rosemary ($20): Cleanses, conditions, stimulates dead cells, strengthens and increases hair. Massage 2-3 min with fingertips into scalp. Best for: scalp stimulation, strengthening, growth, daily cleanse.

HAIR TYPE RULES:
- African/Black hair + dry: Laciador Crece | oily: Gotero Rapido | damaged: Formula Exclusiva
- Asian hair + dry: Formula Exclusiva | oily: Gotero Rapido
- Hispanic/Latino hair + styling/shine: Laciador Crece | loss/growth: Gotero Rapido
- Caucasian hair + damaged: Formula Exclusiva | oily scalp: Gotero Rapido
- Any hair + severe damage/breakage/falling out: Formula Exclusiva (overrides all)
- Any hair + scalp issues/parasites/growth: Gotero Rapido
- Any hair + needs shine/finish: Gotitas Brillantes
- Any hair + deep conditioning: Mascarilla
- Daily cleanse: Shampoo with Aloe Vera & Rosemary

CONSULTATION STYLE:
- You are a knowledgeable friend, not a chatbot. Be warm, confident, conversational.
- Ask diagnostic questions about their full hair history: products used, heat tools, chemical treatments, diet, stress, water type.
- Build on conversation history. Reference what they told you before.
- Keep responses to 2-4 sentences. Never use "I recommend" — say "For your hair, [Product] is exactly what you need."
- Naturally mention your products every 3-4 exchanges even in casual conversation.
- Occasionally say: "If you want a 1-on-1 with a live advisor, message us on WhatsApp at 829-233-2670"

PROFESSIONAL RESOURCES:
- Medical: suggest dermatologist for severe hair loss, scalp conditions, alopecia
- Professional: offer to help find a salon — ask for their city
- Trusted sites: AAD (American Academy of Dermatology), Naturally Curly, NAHA

OFF-TOPIC REDIRECT:
- If they bring up unrelated topics (sports, gaming, travel, food, movies), acknowledge warmly and redirect:
  "Ha, love that! But let's get back to what matters — your hair. You mentioned [last hair topic] — any updates?"
- After 2 off-topic messages: "I want to give you the best hair advice — let's refocus on your hair journey!"
- Connect topics back to hair when possible: "Stress from [activity] can actually affect hair health..."

PROFILE AWARENESS:
- If profile shows saved concerns, reference them: "Based on your [concern], this is especially important..."
- Reference past conversations naturally to build a relationship over time.

Respond ONLY with your answer. No preamble. No "Sure!" or "Of course!".
If the language code indicates non-English, respond entirely in that language."""


# ── SUBSCRIPTION CONSTANTS (needed before index route) ────────────────────────
STRIPE_SECRET_KEY      = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_PRICE_ID        = os.environ.get("STRIPE_PRICE_ID", "")
STRIPE_WEBHOOK_SECRET  = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
STRIPE_TRIAL_DAYS      = 7
FREE_RESPONSE_LIMIT    = 999999  # unlimited — no cap on free users
FREE_RESPONSE_PERIOD   = "weekly"
SUBSCRIPTION_PRICE_USD = 80
APP_BASE_URL           = os.environ.get("APP_BASE_URL", "https://aria.supportrd.com")
SHOPIFY_STORE          = os.environ.get("SHOPIFY_STORE", "supportrd.myshopify.com")
SHOPIFY_ADMIN_TOKEN    = os.environ.get("SHOPIFY_ADMIN_TOKEN", "")
SHOPIFY_PRODUCT_HANDLE = "hair-advisor-premium"
GOOGLE_CLIENT_ID       = os.environ.get("GOOGLE_CLIENT_ID", "")

def init_subscription_db():
    con = get_db()
    con.execute("""CREATE TABLE IF NOT EXISTS subscriptions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id         INTEGER UNIQUE NOT NULL,
        stripe_customer TEXT,
        stripe_sub_id   TEXT,
        shopify_sub_id  TEXT,
        status          TEXT DEFAULT 'inactive',
        plan            TEXT DEFAULT 'free',
        trial_start     TEXT,
        trial_end       TEXT,
        current_period_end TEXT,
        created_at      TEXT DEFAULT (datetime('now')),
        updated_at      TEXT DEFAULT (datetime('now'))
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS session_usage (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_id    INTEGER,
        count      INTEGER DEFAULT 0,
        week_start TEXT DEFAULT (date('now','weekday 0','-6 days')),
        created_at TEXT DEFAULT (datetime('now'))
    )""")
    # ── PREMIUM TABLES ──
    con.execute("""CREATE TABLE IF NOT EXISTS hair_score_history (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        score      INTEGER NOT NULL,
        moisture   INTEGER, strength INTEGER, scalp INTEGER, growth INTEGER,
        ts         TEXT DEFAULT (datetime('now'))
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS treatment_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        product    TEXT NOT NULL,
        notes      TEXT,
        rating     INTEGER DEFAULT 0,
        ts         TEXT DEFAULT (datetime('now'))
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS routines (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER UNIQUE NOT NULL,
        routine_json TEXT NOT NULL,
        generated_at TEXT DEFAULT (datetime('now'))
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS photo_analyses (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        analysis    TEXT NOT NULL,
        porosity    TEXT, damage_level TEXT, density TEXT,
        ts          TEXT DEFAULT (datetime('now'))
    )""")
    con.commit()
    con.close()

init_subscription_db()

def get_subscription(user_id):
    con = get_db()
    row = con.execute("SELECT * FROM subscriptions WHERE user_id=?", (user_id,)).fetchone()
    con.close()
    if not row: return None
    cols = ["id","user_id","stripe_customer","stripe_sub_id","shopify_sub_id",
            "status","plan","trial_start","trial_end","current_period_end","created_at","updated_at"]
    return dict(zip(cols, row))

def is_subscribed(user_id):
    sub = get_subscription(user_id)
    if not sub: return False
    if sub["status"] in ("active", "trialing"): return True
    if sub["trial_end"]:
        try:
            trial_end = datetime.datetime.fromisoformat(sub["trial_end"])
            if datetime.datetime.utcnow() < trial_end:
                return True
        except: pass
    return False

def _week_start():
    """Monday of the current week (ISO)."""
    today = datetime.date.today()
    return (today - datetime.timedelta(days=today.weekday())).isoformat()

def get_session_count(session_id, user_id=None):
    con = get_db()
    ws = _week_start()
    if user_id:
        row = con.execute("SELECT count FROM session_usage WHERE user_id=? AND week_start=?", (user_id, ws)).fetchone()
    else:
        row = con.execute("SELECT count FROM session_usage WHERE session_id=? AND user_id IS NULL AND week_start=?", (session_id, ws)).fetchone()
    con.close()
    return row[0] if row else 0

def increment_session_count(session_id, user_id=None):
    con = get_db()
    ws = _week_start()
    if user_id:
        row = con.execute("SELECT id FROM session_usage WHERE user_id=? AND week_start=?", (user_id, ws)).fetchone()
        if row:
            con.execute("UPDATE session_usage SET count=count+1 WHERE user_id=? AND week_start=?", (user_id, ws))
        else:
            con.execute("INSERT INTO session_usage (session_id,user_id,count,week_start) VALUES (?,?,1,?)", (session_id, user_id, ws))
    else:
        row = con.execute("SELECT id FROM session_usage WHERE session_id=? AND user_id IS NULL AND week_start=?", (session_id, ws)).fetchone()
        if row:
            con.execute("UPDATE session_usage SET count=count+1 WHERE session_id=? AND week_start=?", (session_id, ws))
        else:
            con.execute("INSERT INTO session_usage (session_id,user_id,count,week_start) VALUES (?,NULL,1,?)", (session_id, ws))
    con.commit()
    con.close()


# ── MAIN ROUTE: ARIA SPHERE UI ────────────────────────────────────────────────
@app.route("/")
def index():
    return r"""<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#c1a3a2">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Aria">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="/static/icon-192.png">
<title>Aria — SupportRD Hair Advisor</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
<style>
:root {
  --brand-idle-r:193;--brand-idle-g:163;--brand-idle-b:162;
  --brand-listen-r:157;--brand-listen-g:127;--brand-listen-b:106;
  --brand-speak-r:208;--brand-speak-g:208;--brand-speak-b:208;
  --brand-bg:#f0ebe8;--brand-text:#0d0906;
  --brand-accent:rgba(193,163,162,1);
  --brand-accent-lo:rgba(193,163,162,0.08);
  --brand-accent-mid:rgba(193,163,162,0.22);
  --brand-font-head:'Cormorant Garamond',serif;
  --brand-font-body:'Jost',sans-serif;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:radial-gradient(ellipse at 50% 60%,#e8e0da 0%,var(--brand-bg) 100%);color:var(--brand-text);font-family:var(--brand-font-body);font-weight:300;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;overflow:hidden;user-select:none;}

#topBar{position:fixed;top:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:14px 20px;z-index:100;background:rgba(250,246,243,0.70);backdrop-filter:blur(14px);border-bottom:1px solid rgba(193,163,162,0.12);}
.top-btn{background:rgba(0,0,0,0.05);color:rgba(0,0,0,0.55);border:1px solid rgba(0,0,0,0.12);padding:7px 16px;border-radius:30px;font-size:11px;font-family:var(--brand-font-body);font-weight:300;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:all 0.4s;outline:none;}
.top-btn:hover{background:var(--brand-accent-lo);color:var(--brand-accent);border-color:var(--brand-accent-mid);}
#langSelect{background:rgba(0,0,0,0.05);color:rgba(0,0,0,0.55);border:1px solid rgba(0,0,0,0.12);padding:7px 12px;border-radius:30px;font-size:11px;font-family:var(--brand-font-body);letter-spacing:0.08em;cursor:pointer;outline:none;transition:all 0.4s;}
#langSelect option{background:#f0ebe8;color:#0d0906;}
.nav-link{padding:7px 14px;border:1px solid rgba(193,163,162,0.45);border-radius:20px;font-family:var(--brand-font-body);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#c1a3a2;text-decoration:none;transition:all 0.3s;}
.nav-link:hover{background:rgba(193,163,162,0.12);color:#9d7f6a;}

.sphere-wrap{width:300px;height:300px;display:flex;align-items:center;justify-content:center;}
#halo{width:220px;height:220px;border-radius:50%;cursor:pointer;
  background:radial-gradient(circle at 40% 38%,rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.55) 0%,rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.18) 42%,rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.07) 70%,rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.01) 100%);
  box-shadow:inset 0 0 40px rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.10),0 0 70px rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.45),0 0 150px rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.28),0 0 280px rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.15),0 0 420px rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.07);
  transition:background 2.4s cubic-bezier(0.4,0,0.2,1),box-shadow 2.4s cubic-bezier(0.4,0,0.2,1);
  animation:idlePulse 3.2s ease-in-out infinite;}
@keyframes idlePulse{0%,100%{transform:scale(1.00);}50%{transform:scale(1.10);}}
#halo.speaking{animation:speakPulse 0.9s ease-in-out infinite;}
@keyframes speakPulse{0%,100%{transform:scale(1.05);}50%{transform:scale(1.20);}}
#halo.listening{animation:none;}

#stateLabel{margin-top:12px;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(0,0,0,0.30);height:16px;}

#history{width:420px;max-width:92vw;max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;margin-top:18px;padding:0 4px;scrollbar-width:thin;scrollbar-color:rgba(0,0,0,0.12) transparent;}
#history:empty{display:none;}
.msg{padding:10px 16px;border-radius:18px;font-size:14px;line-height:1.55;max-width:88%;animation:fadeIn 0.4s ease;}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.msg.user{background:rgba(0,0,0,0.07);color:rgba(0,0,0,0.60);align-self:flex-end;border-bottom-right-radius:4px;font-family:var(--brand-font-body);}
.msg.ai{background:rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.10);color:rgba(0,0,0,0.80);align-self:flex-start;border-bottom-left-radius:4px;font-family:var(--brand-font-head);font-style:italic;font-size:15px;}

#clearBtn{margin-top:8px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.25);cursor:pointer;background:none;border:none;font-family:var(--brand-font-body);transition:color 0.3s;display:none;}
#clearBtn:hover{color:rgba(0,0,0,0.55);}
#clearBtn.visible{display:block;}

#response{margin-top:14px;width:420px;max-width:92vw;text-align:center;font-family:var(--brand-font-head);font-size:18px;font-weight:300;line-height:1.7;color:rgba(0,0,0,0.65);min-height:28px;font-style:italic;}

#manualBox{display:none;flex-direction:column;align-items:center;gap:12px;margin-top:16px;width:380px;max-width:90vw;}
#manualInput{width:100%;padding:13px 20px;background:rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.14);border-radius:30px;color:#0d0906;font-family:var(--brand-font-body);font-size:14px;outline:none;transition:border-color 0.3s;}
#manualInput:focus{border-color:var(--brand-accent-mid);}
#manualInput::placeholder{color:rgba(0,0,0,0.30);}
#manualSubmit{padding:10px 32px;background:var(--brand-accent-lo);border:1px solid var(--brand-accent-mid);border-radius:30px;color:var(--brand-accent);font-family:var(--brand-font-body);font-size:11px;font-weight:300;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:all 0.3s;}
#manualSubmit:hover{background:rgba(193,163,162,0.20);}

/* TIP PANEL */
#tipPanel{position:fixed;bottom:-320px;left:50%;transform:translateX(-50%);width:400px;max-width:94vw;background:#faf6f3;border:1px solid rgba(193,163,162,0.35);border-radius:24px 24px 0 0;padding:28px 28px 36px;box-shadow:0 -12px 60px rgba(0,0,0,0.10);transition:bottom 0.55s cubic-bezier(0.32,0.72,0,1);z-index:200;text-align:center;}
#tipPanel.open{bottom:0;}
#tipTitle{font-family:var(--brand-font-head);font-size:20px;font-style:italic;color:rgba(0,0,0,0.70);margin-bottom:4px;}
#tipSubtitle{font-family:var(--brand-font-body);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.30);margin-bottom:20px;}
#starRow{display:flex;justify-content:center;gap:10px;margin-bottom:22px;}
.star{font-size:26px;cursor:pointer;color:rgba(0,0,0,0.15);transition:color 0.2s,transform 0.15s;line-height:1;}
.star.active{color:#c1a3a2;}
.star:hover{transform:scale(1.2);}
#tipAmounts{display:flex;justify-content:center;gap:10px;margin-bottom:20px;flex-wrap:wrap;}
.tip-amt{padding:9px 20px;border-radius:30px;border:1px solid rgba(193,163,162,0.40);background:rgba(193,163,162,0.07);color:rgba(0,0,0,0.55);font-family:var(--brand-font-body);font-size:13px;cursor:pointer;transition:all 0.25s;}
.tip-amt:hover,.tip-amt.selected{background:rgba(193,163,162,0.22);border-color:rgba(193,163,162,0.70);color:#0d0906;}
#customTipWrap{display:none;align-items:center;justify-content:center;gap:8px;margin-bottom:20px;}
#customTipWrap.show{display:flex;}
#customTipInput{width:110px;padding:9px 14px;border-radius:30px;border:1px solid rgba(193,163,162,0.40);background:rgba(193,163,162,0.07);color:#0d0906;font-family:var(--brand-font-body);font-size:14px;text-align:center;outline:none;}
#customTipInput:focus{border-color:rgba(193,163,162,0.70);}
#tipSubmit{display:block;width:100%;padding:13px;border-radius:30px;border:none;background:rgba(193,163,162,0.90);color:#fff;font-family:var(--brand-font-body);font-size:12px;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:background 0.3s;margin-bottom:12px;}
#tipSubmit:hover{background:rgba(157,127,106,0.90);}
#tipSkip{font-family:var(--brand-font-body);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.25);cursor:pointer;transition:color 0.3s;background:none;border:none;}
#tipSkip:hover{color:rgba(0,0,0,0.50);}
#tipThanks{display:none;flex-direction:column;align-items:center;gap:8px;padding:12px 0;}
#tipThanks .thanks-icon{font-size:36px;margin-bottom:4px;}
#tipThanks .thanks-title{font-family:var(--brand-font-head);font-size:22px;font-style:italic;color:rgba(0,0,0,0.70);}
#tipThanks .thanks-sub{font-family:var(--brand-font-body);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(0,0,0,0.30);}

#footer{position:fixed;bottom:22px;display:flex;gap:36px;z-index:10;}
#footer span{font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(0,0,0,0.30);cursor:pointer;transition:color 0.4s;}
#footer span:hover{color:var(--brand-accent);}

/* WELCOME BANNER */
#welcomeBanner{display:none;position:fixed;top:56px;right:16px;background:#fff;border:1px solid rgba(193,163,162,0.25);border-radius:14px;padding:14px 18px;box-shadow:0 8px 32px rgba(0,0,0,0.10);z-index:999;max-width:260px;animation:wbIn 0.4s cubic-bezier(0.22,1,0.36,1);}
@keyframes wbIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
#welcomeBanner .wb-name{font-family:'Cormorant Garamond',serif;font-size:17px;font-style:italic;color:#0d0906;margin-bottom:4px;}
#welcomeBanner .wb-score{font-size:11px;color:rgba(0,0,0,0.40);letter-spacing:0.06em;margin-bottom:10px;}
#welcomeBanner .wb-score span{color:#c1a3a2;font-weight:600;}
#welcomeBanner .wb-btns{display:flex;gap:8px;}
#welcomeBanner .wb-btn{flex:1;padding:8px;border-radius:10px;font-size:10px;letter-spacing:0.10em;text-transform:uppercase;text-align:center;text-decoration:none;font-family:'Jost',sans-serif;}
.wb-btn-rose{background:#c1a3a2;color:#fff;}
.wb-btn-outline{border:1px solid rgba(193,163,162,0.40);color:#9d7f6a;}

/* PAYWALL */
#paywallBanner{display:none;position:fixed;bottom:100px;left:50%;transform:translateX(-50%);width:92%;max-width:480px;background:#fff;border:1px solid rgba(193,163,162,0.30);border-radius:20px;padding:20px 22px;box-shadow:0 12px 48px rgba(0,0,0,0.14);z-index:2000;animation:pwIn 0.45s cubic-bezier(0.22,1,0.36,1);}
@keyframes pwIn{from{opacity:0;transform:translateX(-50%) translateY(16px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
.pw-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;}
.pw-title{font-family:'Cormorant Garamond',serif;font-size:20px;font-style:italic;color:#0d0906;}
.pw-close{background:none;border:none;font-size:18px;cursor:pointer;color:rgba(0,0,0,0.25);padding:0;line-height:1;}
.pw-desc{font-size:12px;color:rgba(0,0,0,0.45);line-height:1.6;margin-bottom:14px;}
.pw-trial{background:linear-gradient(135deg,#c1a3a2,#9d7f6a);color:#fff;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;padding:5px 14px;border-radius:20px;display:inline-block;margin-bottom:14px;}
.pw-features{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:14px;}
.pw-feature{font-size:11px;color:rgba(0,0,0,0.50);display:flex;align-items:center;gap:5px;}
.pw-feature::before{content:'✦';color:#c1a3a2;font-size:9px;}
.pw-btns{display:flex;gap:10px;}
.pw-btn-upgrade{flex:2;padding:12px;background:#c1a3a2;color:#fff;border:none;border-radius:24px;font-family:'Jost',sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:background 0.2s;}
.pw-btn-upgrade:hover{background:#9d7f6a;}
.pw-btn-continue{flex:1;padding:12px;background:transparent;color:rgba(0,0,0,0.35);border:1px solid rgba(0,0,0,0.12);border-radius:24px;font-family:'Jost',sans-serif;font-size:11px;cursor:pointer;}

/* PAGE LOADER */
#srd-loader{position:fixed;inset:0;background:#0d0906;z-index:99999;display:flex;align-items:center;justify-content:center;}
#srd-loader-canvas{position:absolute;inset:0;width:100%;height:100%;}
.srd-logo-wrap{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:18px;opacity:0;animation:srdLogoReveal 1.2s cubic-bezier(0.22,1,0.36,1) 0.4s forwards;}
.srd-emblem{width:72px;height:72px;}
.srd-divider-line{width:48px;height:1px;background:linear-gradient(90deg,transparent,#c1a3a2,transparent);opacity:0;animation:srdFadeIn 0.8s ease 1.0s forwards;}
.srd-brand-script{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:300;font-size:clamp(13px,2vw,16px);letter-spacing:0.32em;text-transform:uppercase;color:#c1a3a2;opacity:0;animation:srdFadeUp 0.8s ease 1.1s forwards;}
.srd-dot-row{position:absolute;bottom:44px;left:50%;transform:translateX(-50%);display:flex;gap:7px;z-index:3;opacity:0;animation:srdFadeUp 0.6s ease 1.3s forwards;}
.srd-dot{width:4px;height:4px;border-radius:50%;background:rgba(193,163,162,0.15);transition:background 0.3s ease,transform 0.3s ease;}
.srd-dot.active{background:#c1a3a2;transform:scale(1.4);}
#srd-loader.srd-exit{animation:srdDissolve 0.9s cubic-bezier(0.4,0,0.2,1) forwards;}
@keyframes srdLogoReveal{0%{opacity:0;transform:scale(0.92)}100%{opacity:1;transform:scale(1)}}
@keyframes srdFadeIn{to{opacity:1}}
@keyframes srdFadeUp{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}
@keyframes srdDissolve{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}
</style>
</head>
<body>

<!-- PAGE LOADER -->
<div id="srd-loader">
  <canvas id="srd-loader-canvas"></canvas>
  <div class="srd-logo-wrap">
    <svg class="srd-emblem" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="34" stroke="#c1a3a2" stroke-width="0.6" opacity="0.5"/>
      <circle cx="36" cy="36" r="26" stroke="#c1a3a2" stroke-width="0.4" opacity="0.3"/>
      <path d="M28 14 C26 22,32 28,30 36 C28 44,22 48,24 58" stroke="#c1a3a2" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.9"/>
      <path d="M36 12 C35 20,39 26,37 36 C35 46,31 50,33 60" stroke="#9d7f6a" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      <path d="M44 14 C46 22,40 28,42 36 C44 44,50 48,48 58" stroke="#c1a3a2" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.9"/>
      <path d="M31 13 C29 21,34 27,33 35 C32 43,27 47,28 57" stroke="#d4b8b4" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.5"/>
      <path d="M41 13 C43 21,38 27,39 35 C40 43,45 47,44 57" stroke="#d4b8b4" stroke-width="0.5" stroke-linecap="round" fill="none" opacity="0.5"/>
      <circle cx="36" cy="8" r="1.2" fill="#c1a3a2" opacity="0.6"/>
      <circle cx="36" cy="64" r="1.2" fill="#c1a3a2" opacity="0.6"/>
      <circle cx="8" cy="36" r="0.8" fill="#c1a3a2" opacity="0.4"/>
      <circle cx="64" cy="36" r="0.8" fill="#c1a3a2" opacity="0.4"/>
    </svg>
    <div class="srd-divider-line"></div>
    <div class="srd-brand-script">Professional Hair Care</div>
  </div>
  <div class="srd-dot-row">
    <div class="srd-dot" id="srd-d0"></div>
    <div class="srd-dot" id="srd-d1"></div>
    <div class="srd-dot" id="srd-d2"></div>
    <div class="srd-dot" id="srd-d3"></div>
    <div class="srd-dot" id="srd-d4"></div>
  </div>
</div>
<script>
(function(){
  var cv=document.getElementById('srd-loader-canvas'),ctx=cv.getContext('2d');
  function rsz(){cv.width=window.innerWidth;cv.height=window.innerHeight;}rsz();
  window.addEventListener('resize',rsz);
  function S(){this.i();}
  S.prototype.i=function(){this.x=Math.random()*cv.width;this.y=-60-Math.random()*200;this.len=100+Math.random()*200;this.wave=(Math.random()-.5)*40;this.spd=.18+Math.random()*.35;this.w=.3+Math.random()*.8;this.a=.08+Math.random()*.18;this.off=Math.random()*Math.PI*2;this.dr=(Math.random()-.5)*.3;var c=[[193,163,162],[220,190,182],[157,127,106],[240,210,200]];this.rgb=c[Math.floor(Math.random()*c.length)];};
  S.prototype.u=function(){this.y+=this.spd;this.x+=this.dr;if(this.y>cv.height+60)this.i();};
  S.prototype.d=function(t){var n=20;ctx.beginPath();ctx.moveTo(this.x,this.y);for(var i=1;i<=n;i++){var p=i/n;ctx.lineTo(this.x+Math.sin(p*Math.PI*2+t*.008+this.off)*this.wave*p,this.y+p*this.len);}ctx.strokeStyle='rgba('+this.rgb[0]+','+this.rgb[1]+','+this.rgb[2]+','+this.a+')';ctx.lineWidth=this.w;ctx.lineCap='round';ctx.stroke();};
  var ss=[];for(var i=0;i<55;i++){var s=new S();s.y=Math.random()*cv.height;ss.push(s);}
  var t=0;function ani(){t++;ctx.clearRect(0,0,cv.width,cv.height);ss.forEach(function(s){s.u();s.d(t);});requestAnimationFrame(ani);}ani();
  var ds=[0,1,2,3,4].map(function(i){return document.getElementById('srd-d'+i);});
  var st=0;[600,1200,1900,2800,3800].forEach(function(ms){setTimeout(function(){ds.forEach(function(d){d.classList.remove('active');});if(ds[st])ds[st].classList.add('active');st++;},ms);});
  var ex=false;
  function doExit(){if(ex)return;ex=true;ds.forEach(function(d){d.classList.add('active');});setTimeout(function(){var el=document.getElementById('srd-loader');el.classList.add('srd-exit');setTimeout(function(){el.style.display='none';},900);},200);}
  window.addEventListener('load',function(){setTimeout(doExit,1200);});
  setTimeout(doExit,4500);
})();
</script>

<!-- WELCOME BACK BANNER -->
<div id="welcomeBanner">
  <div class="wb-name" id="wb-name">Welcome back!</div>
  <div class="wb-score">Hair Score: <span id="wb-score">—</span></div>
  <div class="wb-btns">
    <a href="/dashboard" class="wb-btn wb-btn-rose">My Profile</a>
    <a href="https://wa.me/18292332670" target="_blank" class="wb-btn wb-btn-outline">Live Advisor</a>
  </div>
</div>

<div id="topBar">
  <button id="modeToggle" class="top-btn">Manual Mode</button>
  <select id="langSelect">
    <option value="en-US">English</option>
    <option value="es-ES">Español</option>
    <option value="fr-FR">Français</option>
    <option value="pt-BR">Português</option>
    <option value="de-DE">Deutsch</option>
    <option value="ar-SA">عربي</option>
    <option value="zh-CN">中文</option>
    <option value="hi-IN">हिन्दी</option>
  </select>
  <a href="/dashboard" class="nav-link" id="dashLink">Dashboard</a>
</div>

<div class="sphere-wrap"><div id="halo"></div></div>
<div id="stateLabel">Tap to begin</div>
<div id="history"></div>
<button id="clearBtn">Clear conversation</button>
<div id="manualBox">
  <input id="manualInput" placeholder="Describe your hair concern or ask a follow-up…" />
  <button id="manualSubmit">Send</button>
</div>
<div id="response">Tap the sphere and describe your hair concern.</div>

<!-- TIP PANEL -->
<div id="tipPanel">
  <div id="tipForm">
    <div id="tipTitle">Did this help?</div>
    <div id="tipSubtitle">Rate your experience &amp; leave a tip</div>
    <div id="starRow">
      <span class="star" data-v="1">★</span><span class="star" data-v="2">★</span>
      <span class="star" data-v="3">★</span><span class="star" data-v="4">★</span>
      <span class="star" data-v="5">★</span>
    </div>
    <div id="tipAmounts">
      <button class="tip-amt" data-amt="1">$1</button>
      <button class="tip-amt" data-amt="2">$2</button>
      <button class="tip-amt" data-amt="5">$5</button>
      <button class="tip-amt" data-amt="custom">Custom</button>
      <button class="tip-amt" data-amt="0">No tip</button>
    </div>
    <div id="customTipWrap">
      <span style="color:rgba(0,0,0,0.40);font-size:16px;">$</span>
      <input id="customTipInput" type="number" min="1" max="100" placeholder="0.00" />
    </div>
    <button id="tipSubmit">Submit</button>
    <button id="tipSkip">Skip</button>
  </div>
  <div id="tipThanks">
    <div class="thanks-icon">🌿</div>
    <div class="thanks-title">Thank you!</div>
    <div class="thanks-sub">Your feedback means everything</div>
  </div>
</div>

<div id="footer">
  <span id="faqBtn">FAQ</span>
  <span id="contactBtn">Contact Us</span>
</div>

<!-- PAYWALL BANNER -->
<div id="paywallBanner">
  <div class="pw-top">
    <div>
      <div class="pw-trial">7-Day Free Trial · $80/mo after</div>
      <div class="pw-title">Unlock Full Hair Analysis</div>
    </div>
    <button class="pw-close" onclick="closePaywall()">✕</button>
  </div>
  <div class="pw-desc">You've used your 3 free responses. Upgrade to Premium for unlimited expert hair advice, your personal Hair Health Score, and full consultation history.</div>
  <div class="pw-features">
    <div class="pw-feature">Unlimited Aria conversations</div>
    <div class="pw-feature">Hair Health Score dashboard</div>
    <div class="pw-feature">Full consultation history</div>
    <div class="pw-feature">Salon recommendations</div>
    <div class="pw-feature">Medical resource guidance</div>
    <div class="pw-feature">Priority live advisor access</div>
  </div>
  <div class="pw-btns">
    <button class="pw-btn-upgrade" onclick="goUpgrade()">Start Free Trial</button>
    <button class="pw-btn-continue" onclick="closePaywall()">Continue Free</button>
  </div>
</div>

<script>
// ── AUTH STATE ──
(function(){
  var token = localStorage.getItem('srd_token');
  window._srd_token = token || null;
  if(token){
    var u = {};
    try{ u = JSON.parse(localStorage.getItem('srd_user')||'{}'); }catch(e){}
    // Show welcome banner
    var wb = document.getElementById('welcomeBanner');
    var wbn = document.getElementById('wb-name');
    if(wb && wbn && u.name){
      wbn.textContent = 'Welcome back, ' + u.name.split(' ')[0] + '!';
      wb.style.display = 'block';
      setTimeout(function(){ wb.style.display='none'; }, 5000);
    }
    // Update dashboard link
    var dl = document.getElementById('dashLink');
    if(dl){ dl.textContent = 'Dashboard'; dl.href = '/dashboard'; }
  } else {
    var dl = document.getElementById('dashLink');
    if(dl){ dl.textContent = 'Sign In'; dl.href = '/login'; }
  }
})();

const halo        = document.getElementById("halo");
const responseBox = document.getElementById("response");
const stateLabel  = document.getElementById("stateLabel");
const langSelect  = document.getElementById("langSelect");
const modeToggle  = document.getElementById("modeToggle");
const manualBox   = document.getElementById("manualBox");
const manualInput = document.getElementById("manualInput");
const manualSubmit= document.getElementById("manualSubmit");
const historyEl   = document.getElementById("history");
const clearBtn    = document.getElementById("clearBtn");
const tipPanel    = document.getElementById("tipPanel");
const tipForm     = document.getElementById("tipForm");
const tipThanks   = document.getElementById("tipThanks");
const tipSubmitBtn= document.getElementById("tipSubmit");
const tipSkipBtn  = document.getElementById("tipSkip");
const customTipWrap = document.getElementById("customTipWrap");
const customTipInput= document.getElementById("customTipInput");

let tipRating = 0, tipAmount = null, tipProduct = "";

// Stars
document.querySelectorAll(".star").forEach(star => {
  star.addEventListener("click", () => {
    tipRating = parseInt(star.dataset.v);
    document.querySelectorAll(".star").forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= tipRating));
  });
  star.addEventListener("mouseover", () => {
    const v = parseInt(star.dataset.v);
    document.querySelectorAll(".star").forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= v));
  });
  star.addEventListener("mouseout", () => {
    document.querySelectorAll(".star").forEach(s => s.classList.toggle("active", parseInt(s.dataset.v) <= tipRating));
  });
});
document.querySelectorAll(".tip-amt").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tip-amt").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    tipAmount = btn.dataset.amt;
    customTipWrap.classList.toggle("show", tipAmount === "custom");
    if(tipAmount !== "custom") customTipInput.value = "";
  });
});

function openTipPanel(product){
  tipProduct=product||""; tipRating=0; tipAmount=null;
  document.querySelectorAll(".star").forEach(s=>s.classList.remove("active"));
  document.querySelectorAll(".tip-amt").forEach(b=>b.classList.remove("selected"));
  customTipWrap.classList.remove("show"); customTipInput.value="";
  tipForm.style.display="block"; tipThanks.style.display="none";
  tipPanel.classList.add("open");
}
function closeTipPanel(){ tipPanel.classList.remove("open"); }

tipSubmitBtn.addEventListener("click", async () => {
  let finalAmt = tipAmount;
  if(tipAmount==="custom"){ const v=parseFloat(customTipInput.value); finalAmt=isNaN(v)||v<=0?"0":v.toFixed(2); }
  if(!finalAmt) finalAmt="0";
  try{ await fetch("/api/tip",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lang:langSelect.value,rating:tipRating,amount:finalAmt,product:tipProduct})}); }catch(e){}
  if(finalAmt!=="0"&&finalAmt!=="skip"){
    const qty=Math.max(1,Math.round(parseFloat(finalAmt)||1));
    window.open("https://supportrd.com/cart/add?id=42109000908880&quantity="+qty+"&return_to=/checkout","_blank");
  }
  tipForm.style.display="none"; tipThanks.style.display="flex";
  setTimeout(closeTipPanel, 3000);
});
tipSkipBtn.addEventListener("click", ()=>{
  try{ fetch("/api/tip",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lang:langSelect.value,rating:tipRating,amount:"skip",product:tipProduct})}); }catch(e){}
  closeTipPanel();
});

// ── STATE ──
let appState="idle", isManual=false, conversationHistory=[], lastRecommendedProduct="";
let audioCtx=null, analyser=null, micData=null;
let mediaRecorder=null, audioChunks=[], recordingTimer=null;
let _paywallDismissed=false;
const SESSION_ID='srd_'+Math.random().toString(36).substr(2,9);

function addToHistory(role,text){
  conversationHistory.push({role,content:text});
  if(role==="assistant"){
    const t=text.toLowerCase();
    if(t.includes("formula exclusiva")) lastRecommendedProduct="Formula Exclusiva";
    else if(t.includes("laciador")||t.includes("crece")) lastRecommendedProduct="Laciador Crece";
    else if(t.includes("gotero")||t.includes("rapido")) lastRecommendedProduct="Gotero Rapido";
    else if(t.includes("gotitas")||t.includes("brillantes")) lastRecommendedProduct="Gotitas Brillantes";
    else if(t.includes("mascarilla")) lastRecommendedProduct="Mascarilla";
    else if(t.includes("shampoo")||t.includes("aloe")) lastRecommendedProduct="Shampoo Aloe Vera";
  }
  const bubble=document.createElement("div");
  bubble.className="msg "+(role==="user"?"user":"ai");
  bubble.textContent=text;
  historyEl.appendChild(bubble);
  historyEl.scrollTop=historyEl.scrollHeight;
  clearBtn.classList.add("visible");
  responseBox.textContent="";
}

clearBtn.addEventListener("click",()=>{
  conversationHistory=[]; historyEl.innerHTML="";
  clearBtn.classList.remove("visible");
  responseBox.textContent="Tap the sphere and describe your hair concern.";
  lastRecommendedProduct="";
});

function getCtx(){ if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)(); return audioCtx; }

function playAmbient(type){
  try{
    const ctx=getCtx(),master=ctx.createGain(),now=ctx.currentTime;
    master.connect(ctx.destination);
    if(type==="intro"){
      [[220,0],[330,0.20],[440,0.40],[660,0.65]].forEach(([f,d])=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(master);o.type="sine";
        o.frequency.setValueAtTime(f,now+d);
        g.gain.setValueAtTime(0,now+d);g.gain.linearRampToValueAtTime(0.06,now+d+0.5);g.gain.exponentialRampToValueAtTime(0.001,now+d+3.5);
        o.start(now+d);o.stop(now+d+4.0);
      });
      const s=ctx.createOscillator(),sg=ctx.createGain();
      s.connect(sg);sg.connect(master);s.type="sine";
      s.frequency.setValueAtTime(1320,now+0.8);s.frequency.exponentialRampToValueAtTime(880,now+2.5);
      sg.gain.setValueAtTime(0,now+0.8);sg.gain.linearRampToValueAtTime(0.022,now+1.1);sg.gain.exponentialRampToValueAtTime(0.001,now+3.8);
      s.start(now+0.8);s.stop(now+4.0);
      master.gain.setValueAtTime(1,now);
    } else {
      [[660,0],[440,0.25],[330,0.50],[220,0.75]].forEach(([f,d])=>{
        const o=ctx.createOscillator(),g=ctx.createGain();
        o.connect(g);g.connect(master);o.type="sine";
        o.frequency.setValueAtTime(f,now+d);o.frequency.exponentialRampToValueAtTime(f*0.90,now+d+2.5);
        g.gain.setValueAtTime(0,now+d);g.gain.linearRampToValueAtTime(0.050,now+d+0.35);g.gain.exponentialRampToValueAtTime(0.001,now+d+3.2);
        o.start(now+d);o.stop(now+d+3.5);
      });
      master.gain.setValueAtTime(1,now);
    }
  }catch(e){}
}

function setColor(r,g,b){
  halo.style.background=`radial-gradient(circle at 40% 38%,rgba(${r},${g},${b},0.52) 0%,rgba(${r},${g},${b},0.18) 42%,rgba(${r},${g},${b},0.07) 70%,rgba(${r},${g},${b},0.01) 100%)`;
  halo.style.boxShadow=`inset 0 0 40px rgba(${r},${g},${b},0.12),0 0 70px rgba(${r},${g},${b},0.50),0 0 155px rgba(${r},${g},${b},0.30),0 0 290px rgba(${r},${g},${b},0.16),0 0 440px rgba(${r},${g},${b},0.08)`;
}
const IDLE=[193,163,162],LISTEN=[157,127,106],SPEAK=[208,208,208];
setColor(...IDLE);

function setState(s){
  appState=s;
  halo.classList.remove("listening","speaking");
  if(s==="listening") halo.classList.add("listening");
  if(s==="speaking"){halo.classList.add("speaking");halo.style.transform="";}
  if(s==="idle") halo.style.transform="";
}

let listenPhase=0;
function micReactiveLoop(){
  if(appState!=="listening") return;
  let scale;
  if(analyser&&micData){
    analyser.getByteFrequencyData(micData);
    let sum=0; for(let i=0;i<micData.length;i++) sum+=micData[i];
    scale=1.05+(sum/(micData.length*255))*0.65;
  } else {
    listenPhase+=0.04;
    scale=1.05+0.03*Math.sin(listenPhase);
  }
  halo.style.transform=`scale(${Math.max(1.0,scale).toFixed(3)})`;
  requestAnimationFrame(micReactiveLoop);
}

function getBestVoice(lang){
  const voices=speechSynthesis.getVoices();
  if(!voices.length) return null;
  if(lang==="en-US"||lang==="en-GB"){
    for(const name of ["Google US English","Google UK English Female","Microsoft Aria Online (Natural) - English (United States)","Microsoft Jenny Online (Natural) - English (United States)","Samantha","Karen","Moira","Fiona"]){
      const v=voices.find(v=>v.name===name); if(v) return v;
    }
  }
  const byLang=voices.filter(v=>v.lang===lang);
  return byLang.find(v=>/Google/.test(v.name))||byLang.find(v=>/Natural|Online/.test(v.name))||byLang.find(v=>/Microsoft/.test(v.name))||byLang[0]||voices.find(v=>v.lang.startsWith(lang.split("-")[0]))||voices[0];
}

// Unlock speech synthesis on first user gesture (required by browsers)
let _speechUnlocked=false;
function unlockSpeech(){
  if(_speechUnlocked) return;
  _speechUnlocked=true;
  const u=new SpeechSynthesisUtterance('');
  u.volume=0;
  speechSynthesis.speak(u);
}

function speak(text,showTip){
  unlockSpeech();
  speechSynthesis.cancel();
  setTimeout(()=>{
    const utter=new SpeechSynthesisUtterance(text);
    utter.lang=langSelect.value;
    const voice=getBestVoice(langSelect.value);
    if(voice) utter.voice=voice;
    utter.rate=0.88; utter.pitch=1.05; utter.volume=1;
    setState("speaking"); setColor(...SPEAK); stateLabel.textContent="Speaking";
    utter.onend=()=>{
      playAmbient("outro"); setState("idle"); setColor(...IDLE); stateLabel.textContent="Tap to begin";
      if(showTip) setTimeout(()=>openTipPanel(lastRecommendedProduct),1200);
    };
    utter.onerror=(e)=>{
      console.warn("TTS error:",e.error);
      setState("idle"); setColor(...IDLE); stateLabel.textContent="Tap to begin";
    };
    speechSynthesis.speak(utter);
    // Chrome bug: speech can stall silently
    setTimeout(()=>{ if(speechSynthesis.paused) speechSynthesis.resume(); },300);
  },100);
}

// ── LOCAL FALLBACK RESPONSES ──
const LOCAL_R={
  "en-US":{
    damaged:"Formula Exclusiva is exactly what your hair needs — this professional all-in-one treatment rebuilds strength, restores moisture, and revives scalp health. Safe for the whole family. At $55, it's your most complete solution.",
    color:"Gotitas Brillantes is perfect for you — it gives your hair incredible softness, shine, and beauty, just apply after styling. Price: $30.",
    oily:"Gotero Rapido works directly on your scalp to eliminate obstructions and parasites while stimulating growth. Use it every night. Price: $55.",
    dry:"Laciador Crece restructures your hair giving it softness, elasticity, and natural shine all day. It even stimulates growth. Price: $40.",
    tangly:"Laciador Crece is your answer — it restructures and gives your hair amazing softness and manageability. Price: $40.",
    flat:"Gotitas Brillantes gives your style the perfect fall, shine, and body it needs. Price: $30.",
    loss:"Gotero Rapido stimulates every dead cell on your scalp, eliminates parasites, removes obstructions, and regenerates the hair you've lost. Use every night. Price: $55.",
    default:"Formula Exclusiva is your best all-around choice — moisture, strength, and scalp health in one, safe for the whole family. Price: $55."
  },
  "es-ES":{damaged:"Formula Exclusiva es exactamente lo que tu cabello necesita. A $55.",color:"Gotitas Brillantes para brillo y suavidad. Precio: $30.",oily:"Gotero Rapido regula la producción de sebo. Precio: $55.",dry:"Laciador Crece restaura suavidad y rebote. Precio: $40.",tangly:"Laciador Crece suaviza y desenreda. Precio: $40.",flat:"Laciador Crece da volumen. Precio: $40.",loss:"Gotero Rapido estimula el crecimiento. Precio: $55.",default:"Formula Exclusiva es tu mejor opción. Precio: $55."},
  "fr-FR":{damaged:"Formula Exclusiva est exactement ce dont vos cheveux ont besoin. À $55.",color:"Gotitas Brillantes pour l'éclat. Prix: $30.",oily:"Gotero Rapido régule le sébum. Prix: $55.",dry:"Laciador Crece transforme les cheveux secs. Prix: $40.",tangly:"Laciador Crece lisse et démêle. Prix: $40.",flat:"Laciador Crece donne du volume. Prix: $40.",loss:"Gotero Rapido stimule la croissance. Prix: $55.",default:"Formula Exclusiva est votre meilleur choix. Prix: $55."},
  "pt-BR":{damaged:"Formula Exclusiva é o que seu cabelo precisa. Por $55.",color:"Gotitas Brillantes para brilho. Preço: $30.",oily:"Gotero Rapido regula a produção de sebo. Preço: $55.",dry:"Laciador Crece transforma o cabelo seco. Preço: $40.",tangly:"Laciador Crece alisa e desembaraça. Preço: $40.",flat:"Laciador Crece dá volume. Preço: $40.",loss:"Gotero Rapido estimula o crescimento. Preço: $55.",default:"Formula Exclusiva é sua melhor escolha. Preço: $55."},
  "de-DE":{damaged:"Formula Exclusiva ist genau das, was Ihr Haar braucht. Für $55.",color:"Gotitas Brillantes für Glanz. Preis: $30.",oily:"Gotero Rapido reguliert Talgproduktion. Preis: $55.",dry:"Laciador Crece transformiert trockenes Haar. Preis: $40.",tangly:"Laciador Crece glättet und entwirrt. Preis: $40.",flat:"Laciador Crece gibt Volumen. Preis: $40.",loss:"Gotero Rapido fördert Haarwachstum. Preis: $55.",default:"Formula Exclusiva ist Ihre beste Lösung. Preis: $55."},
  "ar-SA":{damaged:"فورمولا إكسكلوسيفا هو ما يحتاجه شعرك. بسعر $55.",color:"غوتيتاس برييانتس للبريق. السعر: $30.",oily:"غوتيرو رابيدو ينظم إنتاج الزيت. السعر: $55.",dry:"لاسيادور كريسي يحول الشعر الجاف. السعر: $40.",tangly:"لاسيادور كريسي يملس ويفك التشابك. السعر: $40.",flat:"لاسيادور كريسي يمنح الحجم. السعر: $40.",loss:"غوتيرو يحفز النمو. السعر: $55.",default:"فورمولا هو أفضل خيار شامل. السعر: $55."},
  "zh-CN":{damaged:"Formula Exclusiva 正是您需要的。售价 $55。",color:"Gotitas Brillantes 增添光泽。售价 $30。",oily:"Gotero Rapido 调节皮脂分泌。售价 $55。",dry:"Laciador Crece 改善干燥发质。售价 $40。",tangly:"Laciador Crece 顺滑解结。售价 $40。",flat:"Laciador Crece 增加蓬松感。售价 $40。",loss:"Gotero Rapido 促进头发生长。售价 $55。",default:"Formula Exclusiva 是您最全面的选择。售价 $55。"},
  "hi-IN":{damaged:"Formula Exclusiva बिल्कुल वही है जो चाहिए। $55।",color:"Gotitas Brillantes चमक के लिए। $30।",oily:"Gotero Rapido तैलीय बालों के लिए। $55।",dry:"Laciador Crece सूखे बालों को बदलता है। $40।",tangly:"Laciador Crece चिकना और उलझन-मुक्त। $40।",flat:"Laciador Crece वॉल्यूम देता है। $40।",loss:"Gotero Rapido विकास को प्रोत्साहित करता है। $55।",default:"Formula Exclusiva सबसे अच्छा विकल्प। $55।"}
};

function localRecommend(text){
  const t=text.toLowerCase();
  const R=LOCAL_R[langSelect.value]||LOCAL_R["en-US"];
  if(/damag|break|broke|split end|weak|brittle|burnt|chemical|heat damage|perm|relaxer|bleach|falling out|hair loss|bald|thinning|shed|alopecia/.test(t)) return R.damaged;
  if(/color|colour|fade|brassy|grey|gray|highlights|dye|tint|pigment/.test(t)) return R.color;
  if(/oil|oily|greasy|grease|sebum|buildup|waxy|weighing down/.test(t)) return R.oily;
  if(/tangl|tangle|knot|matted|hard to brush|hard to comb|detangle|snag/.test(t)) return R.tangly;
  if(/flat|no bounce|no volume|lifeless|limp|fine hair|no lift|falls flat/.test(t)) return R.flat;
  if(/hair loss|shed|alopecia|thinning|bald|receding|slow growth/.test(t)) return R.loss;
  if(/dry|frizz|frizzy|rough|coarse|moisture|parched|thirsty|dehydrat/.test(t)) return R.dry;
  return R.default;
}

// ── AI RECOMMENDATION ──
async function getRecommendation(userText){
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    const headers={"Content-Type":"application/json","X-Session-Id":SESSION_ID};
    if(window._srd_token) headers["X-Auth-Token"]=window._srd_token;
    const resp=await fetch("/api/recommend",{
      method:"POST",
      headers,
      body:JSON.stringify({text:userText,message:userText,lang:langSelect.value,history:conversationHistory.slice(0,-1)}),
      signal:controller.signal
    });
    clearTimeout(timeout);
    if(!resp.ok) throw new Error("not ok");
    const data=await resp.json();
    handleSubscriptionResponse(data);
    if(data.recommendation) return data.recommendation;
    if(data.reply) return data.reply;
    throw new Error("empty");
  }catch(e){
    return localRecommend(userText);
  }
}

async function processText(text){
  if(!text||text.trim().length<3){
    responseBox.textContent="Could you describe your hair a little more?";
    setState("idle");setColor(...IDLE);stateLabel.textContent="Tap to begin";
    setTimeout(()=>speak(responseBox.textContent,false),800);
    return;
  }
  addToHistory("user",text);
  setState("idle");setColor(...IDLE);
  responseBox.textContent="Thinking…";stateLabel.textContent="Thinking";
  const result=await getRecommendation(text);
  const final=result||localRecommend(text);
  addToHistory("assistant",final);
  setTimeout(()=>speak(final,true),400);
}

const NO_HEAR={"en-US":"I didn't hear anything. Please tap and describe your hair concern.","es-ES":"No escuché nada. Por favor toca y describe tu preocupación.","fr-FR":"Je n'ai rien entendu. Veuillez appuyer et décrire votre préoccupation.","pt-BR":"Não ouvi nada. Por favor toque e descreva sua preocupação.","de-DE":"Ich habe nichts gehört. Bitte tippen und Ihr Problem beschreiben.","ar-SA":"لم أسمع شيئاً. يرجى النقر ووصف قلقك.","zh-CN":"我没有听到。请点击并描述您的问题。","hi-IN":"मुझे कुछ सुनाई नहीं दिया। कृपया टैप करें।"};
function noHear(){ const msg=NO_HEAR[langSelect.value]||NO_HEAR["en-US"]; responseBox.textContent=msg; setState("idle");setColor(...IDLE);stateLabel.textContent="Tap to begin"; speak(msg,false); }

function getSupportedMimeType(){ const types=["audio/webm","audio/webm;codecs=opus","audio/ogg;codecs=opus","audio/mp4"]; for(const t of types){if(MediaRecorder.isTypeSupported(t)) return t;} return ""; }

async function startListening(){
  playAmbient("intro");
  setState("listening");setColor(...LISTEN);
  stateLabel.textContent="Listening…";
  responseBox.textContent=conversationHistory.length>0?"Ask a follow-up…":"Listening…";
  requestAnimationFrame(micReactiveLoop);
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    if(!audioCtx) audioCtx=new(window.AudioContext||window.webkitAudioContext)();
    const src=audioCtx.createMediaStreamSource(stream);
    analyser=audioCtx.createAnalyser(); analyser.fftSize=512; analyser.smoothingTimeConstant=0.6;
    src.connect(analyser); micData=new Uint8Array(analyser.frequencyBinCount);
    audioChunks=[]; mediaRecorder=new MediaRecorder(stream,{mimeType:getSupportedMimeType()});
    mediaRecorder.ondataavailable=e=>{if(e.data.size>0) audioChunks.push(e.data);};
    mediaRecorder.onstop=async()=>{ stream.getTracks().forEach(t=>t.stop()); if(audioChunks.length===0){noHear();return;} await sendToWhisper(); };
    mediaRecorder.start();
    recordingTimer=setTimeout(()=>stopListening(),10000);
  }catch(e){
    console.warn("Mic error:",e);
    responseBox.textContent="Microphone access denied. Tap Manual Mode to type instead.";
    setState("idle");setColor(...IDLE);stateLabel.textContent="Tap to begin";
  }
}

function stopListening(){ clearTimeout(recordingTimer); if(mediaRecorder&&mediaRecorder.state==="recording") mediaRecorder.stop(); }

async function sendToWhisper(){
  setState("idle");setColor(...IDLE);stateLabel.textContent="Thinking…";responseBox.textContent="Thinking…";
  try{
    const mimeType=getSupportedMimeType()||"audio/webm";
    const blob=new Blob(audioChunks,{type:mimeType});
    const formData=new FormData(); formData.append("audio",blob,"audio.webm");
    const resp=await fetch("/api/transcribe",{method:"POST",body:formData});
    const data=await resp.json();
    const text=(data.text||"").trim();
    if(text.length>2){ responseBox.textContent=text; processText(text); }
    else { noHear(); }
  }catch(e){ console.error("Whisper error:",e); noHear(); }
}

halo.addEventListener("click",()=>{
  unlockSpeech();
  if(isManual) return;
  if(appState==="listening"){ stopListening(); return; }
  if(appState==="speaking"){ speechSynthesis.cancel(); setState("idle");setColor(...IDLE);stateLabel.textContent="Tap to begin"; return; }
  startListening();
});

modeToggle.addEventListener("click",()=>{
  isManual=!isManual;
  manualBox.style.display=isManual?"flex":"none";
  modeToggle.textContent=isManual?"Voice Mode":"Manual Mode";
});
manualSubmit.addEventListener("click",()=>{ const text=manualInput.value.trim(); if(text.length<3) return; manualInput.value=""; processText(text); });
manualInput.addEventListener("keydown",e=>{ if(e.key==="Enter") manualSubmit.click(); });

speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices();
setTimeout(()=>speechSynthesis.getVoices(),300);

const FAQ_MSGS={"en-US":"All SupportRD products are 100% natural and salon-professional. Formula Exclusiva $55, Laciador Crece $40, Gotero Rapido $55, Gotitas Brillantes $30, Mascarilla $25, Shampoo $20.","es-ES":"Todos los productos son 100% naturales. Formula Exclusiva $55, Laciador $40, Gotero $55, Gotitas $30, Mascarilla $25, Shampoo $20.","fr-FR":"Tous nos produits sont 100% naturels. Formula Exclusiva $55, Laciador $40, Gotero $55, Gotitas $30, Mascarilla $25, Shampoo $20.","pt-BR":"Todos os produtos são 100% naturais. Formula Exclusiva $55, Laciador $40, Gotero $55, Gotitas $30, Mascarilla $25, Shampoo $20.","de-DE":"Alle Produkte sind 100% natürlich. Formula Exclusiva $55, Laciador $40, Gotero $55, Gotitas $30, Mascarilla $25, Shampoo $20.","ar-SA":"جميع المنتجات طبيعية 100%. فورمولا $55، لاسيادور $40، غوتيرو $55، غوتيتاس $30، ماسكاريا $25، شامبو $20.","zh-CN":"所有产品均为100%天然。Formula Exclusiva $55，Laciador $40，Gotero $55，Gotitas $30，Mascarilla $25，Shampoo $20。","hi-IN":"सभी उत्पाद 100% प्राकृतिक। Formula Exclusiva $55, Laciador $40, Gotero $55, Gotitas $30, Mascarilla $25, Shampoo $20।"};
const CONTACT_MSGS={"en-US":"You can reach us at SupportRD.com or message us on WhatsApp at 829-233-2670. We'd love to help you find your perfect product!","es-ES":"Contáctanos en SupportRD.com o por WhatsApp al 829-233-2670.","fr-FR":"Contactez-nous sur SupportRD.com ou WhatsApp au 829-233-2670.","pt-BR":"Entre em contato pelo SupportRD.com ou WhatsApp: 829-233-2670.","de-DE":"Kontaktieren Sie uns auf SupportRD.com oder WhatsApp: 829-233-2670.","ar-SA":"تواصل معنا عبر SupportRD.com أو واتساب: 829-233-2670.","zh-CN":"请访问 SupportRD.com 或 WhatsApp: 829-233-2670 联系我们。","hi-IN":"SupportRD.com या WhatsApp 829-233-2670 पर संपर्क करें।"};
document.getElementById("faqBtn").addEventListener("click",()=>{ const msg=FAQ_MSGS[langSelect.value]||FAQ_MSGS["en-US"]; responseBox.textContent=msg; speak(msg,false); });
document.getElementById("contactBtn").addEventListener("click",()=>{ const msg=CONTACT_MSGS[langSelect.value]||CONTACT_MSGS["en-US"]; responseBox.textContent=msg; speak(msg,false); });

// ── PAYWALL ──
function handleSubscriptionResponse(data){
  if(!data) return;
  if(data.subscribed||data.logged_in){ document.getElementById('paywallBanner').style.display='none'; return; }
  const count=data.response_count||0;
  if(count>0&&count%3===0&&!_paywallDismissed){
    setTimeout(()=>{ document.getElementById('paywallBanner').style.display='block'; },800);
  }
}
function closePaywall(){ _paywallDismissed=true; document.getElementById('paywallBanner').style.display='none'; }
function showUpgradeModal(featureName){
  const titles = {
    'Smart Routine Builder': 'Unlock Your Personal Routine',
    'Hair Health Timeline': 'Track Your Hair Journey',
    'AI Photo Analysis': 'Unlock AI Photo Analysis'
  };
  document.getElementById('upgrade-modal-title').textContent = titles[featureName] || 'Hair Advisor Premium';
  document.getElementById('activate-modal-msg').textContent = '';
  document.getElementById('activate-email-modal').value = '';
  // Pre-fill email if logged in
  try{const u=JSON.parse(localStorage.getItem('srd_user')||'{}'); if(u.email) document.getElementById('activate-email-modal').value=u.email;}catch(e){}
  document.getElementById('upgrade-modal').style.display='flex';
}
function closeUpgradeModal(){
  document.getElementById('upgrade-modal').style.display='none';
}
async function activateFromModal(){
  const email = document.getElementById('activate-email-modal').value.trim();
  const btn = document.getElementById('activate-modal-btn');
  const msg = document.getElementById('activate-modal-msg');
  if(!email){ msg.style.color='#e08080'; msg.textContent='Please enter your email.'; return; }
  btn.disabled=true; btn.textContent='Checking…'; msg.textContent='';
  try{
    const r=await fetch('/api/subscription/activate-shopify',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify({email})});
    const d=await r.json();
    if(d.ok){
      msg.style.color='#80e0a0'; msg.textContent='✓ Premium activated! Reloading…';
      try{const u=JSON.parse(localStorage.getItem('srd_user')||'{}');u.plan='premium';localStorage.setItem('srd_user',JSON.stringify(u));}catch(e){}
      setTimeout(()=>{ closeUpgradeModal(); location.reload(); }, 1200);
    } else {
      msg.style.color='#e08080';
      msg.textContent = d.error || 'No purchase found. Please buy at supportrd.com first.';
      btn.disabled=false; btn.textContent='Activate';
    }
  }catch(e){ msg.style.color='#e08080'; msg.textContent='Network error. Try again.'; btn.disabled=false; btn.textContent='Activate'; }
}

// ── PWA SERVICE WORKER ──
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('/sw.js').then(function(reg){
      console.log('SW registered');
    }).catch(function(err){
      console.log('SW failed:', err);
    });
  });
}

async function goUpgrade(){
  const token=localStorage.getItem('srd_token');
  if(!token){ window.location.href='/login?next=subscribe'; return; }
  const r=await fetch('/api/subscription/checkout',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token}});
  const d=await r.json();
  if(d.checkout_url){ window.location.href=d.checkout_url; }
  else if(d.setup_needed){ window.location.href='https://supportrd.com/products/hair-advisor-premium'; }
  else { alert('Something went wrong. Please try again.'); }
}
</script>
</body>
</html>"""


# ── API: RECOMMEND ────────────────────────────────────────────────────────────
@app.route("/api/recommend", methods=["POST","OPTIONS"])
def recommend():
    data       = request.get_json()
    user_text  = data.get("text","") or data.get("message","")
    lang       = data.get("lang", "en-US")
    history    = data.get("history", [])
    session_id = request.headers.get("X-Session-Id", request.remote_addr or "anon")

    user       = get_current_user()
    subscribed = is_subscribed(user["id"]) if user else False

    lang_names = {"en-US":"English","es-ES":"Spanish","fr-FR":"French","pt-BR":"Portuguese","de-DE":"German","ar-SA":"Arabic","zh-CN":"Mandarin Chinese","hi-IN":"Hindi"}
    lang_name  = lang_names.get(lang, "English")
    lang_instr = f"\n\nIMPORTANT: Your ENTIRE response must be in {lang_name}."

    profile_context = ""
    if user:
        if subscribed:
            profile = get_hair_profile(user["id"])
            if profile.get("hair_type") or profile.get("hair_concerns"):
                profile_context = f"""

RETURNING CLIENT PROFILE:
- Name: {user.get("name","this client")}
- Hair type: {profile.get("hair_type","unknown")}
- Known concerns: {profile.get("hair_concerns","none saved")}
- Treatments history: {profile.get("treatments","none saved")}
- Products tried: {profile.get("products_tried","none saved")}
Reference this naturally in your response."""
        save_chat_message(user["id"], "user", user_text)

    active_prompt = SYSTEM_PROMPT + profile_context + lang_instr
    max_tokens    = 500 if subscribed else 130  # premium gets full response, free gets brief

    if not ANTHROPIC_API_KEY:
        return jsonify({"recommendation": None, "error": "No API key"}), 500

    try:
        import urllib.request as urlreq

        messages = []
        if subscribed and user:
            db_history = get_chat_history(user["id"], limit=16)
            for h in db_history[:-1]:
                if h.get("role") in ("user","assistant") and h.get("content"):
                    messages.append({"role": h["role"], "content": h["content"]})
        else:
            for h in history[-2:]:
                if h.get("role") in ("user","assistant") and h.get("content"):
                    messages.append({"role": h["role"], "content": h["content"]})

        messages.append({"role": "user", "content": user_text})

        payload = json.dumps({
            "model": "claude-sonnet-4-20250514",
            "max_tokens": max_tokens,
            "system": active_prompt,
            "messages": messages
        }).encode("utf-8")

        req = urlreq.Request(
            "https://api.anthropic.com/v1/messages",
            data=payload,
            headers={"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
            method="POST"
        )
        with urlreq.urlopen(req, timeout=12) as resp:
            result         = json.loads(resp.read().decode("utf-8"))
            recommendation = result["content"][0]["text"].strip()

        if subscribed and user:
            save_chat_message(user["id"], "assistant", recommendation)
            concern = extract_concern(user_text)
            if concern:
                profile  = get_hair_profile(user["id"])
                existing = profile.get("hair_concerns","")
                if concern not in existing:
                    updated = (existing + ", " + concern).strip(", ")
                    save_hair_profile(user["id"], {**profile, "hair_concerns": updated})

        # Increment and get new count — fixed bug: use get_session_count after increment
        increment_session_count(session_id, user["id"] if user else None)
        new_count = get_session_count(session_id, user["id"] if user else None)

        product = extract_product(recommendation)
        concern = extract_concern(user_text)
        log_event(lang, user_text, product, concern)

        return jsonify({
            "recommendation":  recommendation,
            "reply":           recommendation,
            "logged_in":       user is not None,
            "user_name":       user["name"] if user else None,
            "subscribed":      subscribed,
            "response_count":  new_count,
            "free_limit":      FREE_RESPONSE_LIMIT,
            "show_paywall":    False,
            "paywall_soft":    True
        })

    except Exception as e:
        return jsonify({"recommendation": None, "error": str(e)}), 500


# ── API: TIP LOGGING ──────────────────────────────────────────────────────────
@app.route("/api/tip", methods=["POST"])
def tip():
    data = request.get_json()
    log_tip(data.get("lang","en-US"), data.get("rating",0), data.get("amount","skip"), data.get("product",""))
    return jsonify({"ok": True})


# ── ANALYTICS DASHBOARD ───────────────────────────────────────────────────────
ANALYTICS_KEY = os.environ.get("ANALYTICS_KEY", "hairadmin")

@app.route("/api/dashboard-stats")
def dashboard_stats():
    user = get_current_user()
    if not user:
        return jsonify({"error": "unauthorized"}), 401
    try:
        adb = get_analytics_db()
        udb = get_db()
        from datetime import date, timedelta
        today = date.today()

        total_users  = udb.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        active_today = udb.execute("SELECT COUNT(DISTINCT user_id) FROM chat_history WHERE ts >= datetime('now','-1 day')").fetchone()[0]

        profiles = udb.execute("SELECT hair_concerns FROM hair_profiles WHERE hair_concerns IS NOT NULL AND hair_concerns != ''").fetchall()
        concern_counts = {}
        for (row,) in profiles:
            for c in row.split(','):
                c = c.strip().lower()
                if c: concern_counts[c] = concern_counts.get(c,0)+1
        total_concern_tags = sum(concern_counts.values()) or 1
        top_concerns = sorted(concern_counts.items(), key=lambda x: x[1], reverse=True)[:5]

        prod_counts = {}
        for (row,) in udb.execute("SELECT products_tried FROM hair_profiles WHERE products_tried IS NOT NULL AND products_tried != ''").fetchall():
            for p in row.split(','):
                p = p.strip()
                if p: prod_counts[p] = prod_counts.get(p,0)+1
        total_prod_tags = sum(prod_counts.values()) or 1
        top_products = sorted(prod_counts.items(), key=lambda x: x[1], reverse=True)[:6]

        recent_ev = adb.execute("SELECT product, COUNT(*) as n FROM events WHERE ts >= datetime('now','-30 days') AND product != 'Unknown' GROUP BY product ORDER BY n DESC").fetchall()
        prev_map  = {p:n for p,n in adb.execute("SELECT product, COUNT(*) as n FROM events WHERE ts >= datetime('now','-60 days') AND ts < datetime('now','-30 days') AND product != 'Unknown' GROUP BY product ORDER BY n DESC").fetchall()}
        product_trends = [{"product":p,"count":n,"change":round(((n-prev_map.get(p,0))/max(prev_map.get(p,0),1))*100)} for p,n in recent_ev]

        concern_ev = adb.execute("SELECT concern, COUNT(*) as n FROM events WHERE ts >= datetime('now','-30 days') GROUP BY concern ORDER BY n DESC").fetchall()
        total_cev  = sum(n for _,n in concern_ev) or 1
        concern_sentiment = [{"concern":c,"count":n,"pct":round(n/total_cev*100)} for c,n in concern_ev[:4]]

        day_map = {r[0]:r[1] for r in udb.execute("SELECT date(ts) as d, COUNT(*) as n FROM chat_history WHERE ts >= datetime('now','-30 days') AND role='user' GROUP BY d ORDER BY d").fetchall()}
        sparkline_30 = [day_map.get((today-timedelta(days=29-i)).isoformat(),0) for i in range(30)]
        udm = {r[0]:r[1] for r in udb.execute("SELECT date(ts) as d, COUNT(*) as n FROM chat_history WHERE user_id=? AND ts >= datetime('now','-30 days') AND role='user' GROUP BY d ORDER BY d",(user["id"],)).fetchall()}
        user_spark = [udm.get((today-timedelta(days=29-i)).isoformat(),0) for i in range(30)]

        m=concern_counts.get('frizz',0)+concern_counts.get('dry / brittle',0)
        d=concern_counts.get('damaged',0)+concern_counts.get('breakage',0)
        g=concern_counts.get('slow growth',0)+concern_counts.get('hair loss',0)+concern_counts.get('thinning',0)
        s=concern_counts.get('oily scalp',0)+concern_counts.get('dandruff',0)
        tot=max(m+d+g+s,1)

        adb.close(); udb.close()
        return jsonify({
            "total_users": total_users, "active_today": max(active_today,1),
            "top_concerns": [{"name":c,"count":n,"pct":round(n/total_concern_tags*100)} for c,n in top_concerns],
            "top_products": [{"name":p,"count":n,"pct":round(n/total_prod_tags*100)} for p,n in top_products],
            "product_trends": product_trends, "concern_sentiment": concern_sentiment,
            "sparkline_7": sparkline_30[-7:], "sparkline_14": sparkline_30[-14:], "sparkline_30": sparkline_30,
            "user_spark_30": user_spark,
            "sentiment": {"moisture_pct":round(m/tot*100),"damage_pct":round(d/tot*100),"growth_pct":round(g/tot*100),"scalp_pct":round(s/tot*100)}
        })
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ── PREMIUM: SCORE HISTORY ────────────────────────────────────────────────────
@app.route("/api/score-history", methods=["GET","POST"])
def score_history():
    user = get_current_user()
    if not user: return jsonify({"error":"unauthorized"}), 401
    if not is_subscribed(user["id"]): return jsonify({"error":"premium_required"}), 403
    if request.method == "POST":
        d = request.get_json()
        db_execute("INSERT INTO hair_score_history (user_id,score,moisture,strength,scalp,growth) VALUES (?,?,?,?,?,?)",
            (user["id"], d.get("score",0), d.get("moisture",0), d.get("strength",0), d.get("scalp",0), d.get("growth",0)))
        return jsonify({"ok": True})
    con = get_db()
    rows = con.execute("SELECT score,moisture,strength,scalp,growth,ts FROM hair_score_history WHERE user_id=? ORDER BY ts DESC LIMIT 90", (user["id"],)).fetchall()
    con.close()
    return jsonify({"history": [{"score":r[0],"moisture":r[1],"strength":r[2],"scalp":r[3],"growth":r[4],"ts":r[5]} for r in reversed(rows)]})


# ── PREMIUM: TREATMENT LOG ────────────────────────────────────────────────────
@app.route("/api/treatment-log", methods=["GET","POST","DELETE"])
def treatment_log():
    user = get_current_user()
    if not user: return jsonify({"error":"unauthorized"}), 401
    if not is_subscribed(user["id"]): return jsonify({"error":"premium_required"}), 403
    if request.method == "POST":
        d = request.get_json()
        db_execute("INSERT INTO treatment_log (user_id,product,notes,rating) VALUES (?,?,?,?)",
            (user["id"], d.get("product",""), d.get("notes",""), d.get("rating",0)))
        return jsonify({"ok": True})
    if request.method == "DELETE":
        eid = request.args.get("id")
        if eid: db_execute("DELETE FROM treatment_log WHERE id=? AND user_id=?", (eid, user["id"]))
        return jsonify({"ok": True})
    con = get_db()
    rows = con.execute("SELECT id,product,notes,rating,ts FROM treatment_log WHERE user_id=? ORDER BY ts DESC LIMIT 50", (user["id"],)).fetchall()
    con.close()
    return jsonify({"log": [{"id":r[0],"product":r[1],"notes":r[2],"rating":r[3],"ts":r[4]} for r in rows]})


# ── PREMIUM: SMART ROUTINE BUILDER ───────────────────────────────────────────
@app.route("/api/routine", methods=["GET","POST"])
def routine():
    user = get_current_user()
    if not user: return jsonify({"error":"unauthorized"}), 401
    if not is_subscribed(user["id"]): return jsonify({"error":"premium_required"}), 403
    if request.method == "GET":
        con = get_db()
        row = con.execute("SELECT routine_json,generated_at FROM routines WHERE user_id=?", (user["id"],)).fetchone()
        con.close()
        if row: return jsonify({"routine": json.loads(row[0]), "generated_at": row[1]})
        return jsonify({"routine": None})
    # POST = regenerate
    profile = get_hair_profile(user["id"])
    if not profile.get("hair_type") and not profile.get("hair_concerns"):
        return jsonify({"error": "Please fill in your hair profile first."}), 400
    prompt = f"""You are Aria, a professional hair advisor for SupportRD. Generate a personalized weekly hair care routine.

CLIENT PROFILE:
- Name: {user.get("name","Client")}
- Hair type: {profile.get("hair_type","not specified")}
- Hair concerns: {profile.get("hair_concerns","not specified")}
- Chemical treatments: {profile.get("treatments","none")}
- Products they use: {profile.get("products_tried","not specified")}

SupportRD PRODUCTS (use these specifically):
- Formula Exclusiva ($55) — all-in-one treatment, moisture + strength + scalp
- Laciador Crece ($40) — softness, elasticity, shine, growth stimulation
- Gotero Rapido ($55) — scalp treatment, eliminates parasites/obstructions, growth
- Gotitas Brillantes ($30) — shine serum, apply after styling
- Mascarilla Capilar ($25) — deep conditioning mask
- Shampoo Aloe Vera ($20) — gentle daily/weekly cleanse

Respond ONLY with valid JSON (no markdown, no backticks) in this exact structure:
{{"days":{{"monday":{{"title":"Wash Day","morning":["step1","step2"],"evening":["step1"],"products":["product name"]}},"tuesday":{{"title":"Rest Day","morning":["step1"],"evening":["step1"],"products":[]}},"wednesday":{{"title":"Treatment Day","morning":["step1","step2"],"evening":["step1","step2"],"products":["product name"]}},"thursday":{{"title":"Rest Day","morning":["step1"],"evening":["step1"],"products":[]}},"friday":{{"title":"Style Day","morning":["step1","step2"],"evening":["step1"],"products":["product name"]}},"saturday":{{"title":"Deep Condition","morning":["step1","step2","step3"],"evening":["step1"],"products":["product name","product name"]}},"sunday":{{"title":"Scalp Care","morning":["step1","step2"],"evening":["step1","step2"],"products":["product name"]}}}},"tips":["personalized tip 1","tip 2","tip 3"],"focus_concern":"{profile.get('hair_concerns','general health')}","recommended_products":["most important product","second product"]}}"""
    try:
        import urllib.request as urlreq
        payload = json.dumps({"model":"claude-sonnet-4-20250514","max_tokens":1200,"messages":[{"role":"user","content":prompt}]}).encode()
        req = urlreq.Request("https://api.anthropic.com/v1/messages", data=payload,
            headers={"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"}, method="POST")
        with urlreq.urlopen(req, timeout=20) as resp:
            result = json.loads(resp.read().decode())
            raw = result["content"][0]["text"].strip()
            raw = raw.replace("```json","").replace("```","").strip()
            routine_data = json.loads(raw)
        db_execute("INSERT INTO routines (user_id,routine_json) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET routine_json=excluded.routine_json,generated_at=datetime('now')",
            (user["id"], json.dumps(routine_data)))
        return jsonify({"routine": routine_data, "generated_at": datetime.datetime.utcnow().isoformat()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── PREMIUM: PHOTO HAIR ANALYSIS ─────────────────────────────────────────────
@app.route("/api/photo-analysis", methods=["POST","GET"])
def photo_analysis():
    user = get_current_user()
    if not user: return jsonify({"error":"unauthorized"}), 401
    if not is_subscribed(user["id"]): return jsonify({"error":"premium_required"}), 403
    if request.method == "GET":
        con = get_db()
        rows = con.execute("SELECT analysis,porosity,damage_level,density,ts FROM photo_analyses WHERE user_id=? ORDER BY ts DESC LIMIT 5", (user["id"],)).fetchall()
        con.close()
        return jsonify({"analyses": [{"analysis":r[0],"porosity":r[1],"damage_level":r[2],"density":r[3],"ts":r[4]} for r in rows]})
    data = request.get_json()
    image_b64 = data.get("image_b64","")
    if not image_b64: return jsonify({"error":"No image provided"}), 400
    # Strip data URL prefix if present
    if "," in image_b64: image_b64 = image_b64.split(",",1)[1]
    prompt = """You are Aria, an expert hair analyst for SupportRD. Analyze this hair photo carefully.

Provide a detailed JSON analysis (no markdown, no backticks) with this structure:
{"porosity":"low/medium/high","damage_level":"none/mild/moderate/severe","density":"fine/medium/thick","texture":"straight/wavy/curly/coily","observations":["observation 1","observation 2","observation 3"],"recommended_products":["product1","product2"],"personalized_advice":"2-3 sentence personal recommendation referencing specific SupportRD products","overall_health_score":75}

SupportRD products to reference: Formula Exclusiva ($55), Laciador Crece ($40), Gotero Rapido ($55), Gotitas Brillantes ($30), Mascarilla Capilar ($25), Shampoo Aloe Vera ($20)."""
    try:
        import urllib.request as urlreq
        payload = json.dumps({
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 600,
            "messages": [{"role":"user","content":[
                {"type":"image","source":{"type":"base64","media_type":"image/jpeg","data":image_b64}},
                {"type":"text","text":prompt}
            ]}]
        }).encode()
        req = urlreq.Request("https://api.anthropic.com/v1/messages", data=payload,
            headers={"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"}, method="POST")
        with urlreq.urlopen(req, timeout=25) as resp:
            result = json.loads(resp.read().decode())
            raw = result["content"][0]["text"].strip().replace("```json","").replace("```","").strip()
            analysis_data = json.loads(raw)
        db_execute("INSERT INTO photo_analyses (user_id,analysis,porosity,damage_level,density) VALUES (?,?,?,?,?)",
            (user["id"], json.dumps(analysis_data), analysis_data.get("porosity",""), analysis_data.get("damage_level",""), analysis_data.get("density","")))
        return jsonify({"ok": True, "analysis": analysis_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/analytics")
def analytics():
    key = request.args.get("key","")
    if key != ANALYTICS_KEY:
        return "Unauthorized. Add ?key=YOUR_ANALYTICS_KEY to the URL.", 401
    try:
        con = get_analytics_db()
        total    = con.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        products = con.execute("SELECT product, COUNT(*) as n FROM events GROUP BY product ORDER BY n DESC").fetchall()
        concerns = con.execute("SELECT concern, COUNT(*) as n FROM events GROUP BY concern ORDER BY n DESC").fetchall()
        langs    = con.execute("SELECT lang, COUNT(*) as n FROM events GROUP BY lang ORDER BY n DESC").fetchall()
        recent   = con.execute("SELECT ts, lang, user_msg, product, concern FROM events ORDER BY id DESC LIMIT 50").fetchall()
        tip_total  = con.execute("SELECT COUNT(*) FROM tips").fetchone()[0]
        avg_rating = con.execute("SELECT AVG(rating) FROM tips WHERE rating > 0").fetchone()[0]
        tip_amounts= con.execute("SELECT tip_amount, COUNT(*) as n FROM tips GROUP BY tip_amount ORDER BY n DESC").fetchall()
        avg_r = round(avg_rating,2) if avg_rating else "N/A"
        con.close()
    except Exception as e:
        return f"DB error: {e}", 500
    def bar(n,total): pct=int((n/total*36)) if total else 0; return "█"*pct+"░"*(36-pct)
    rows="".join(f"<tr><td>{r[0][:16]}</td><td>{r[1]}</td><td style='max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'>{r[2]}</td><td><b>{r[3]}</b></td><td>{r[4]}</td></tr>" for r in recent)
    prod_rows="".join(f"<tr><td><b>{p[0]}</b></td><td>{p[1]}</td><td style='font-family:monospace;color:#00ffc8'>{bar(p[1],total)}</td><td>{round(p[1]/total*100)}%</td></tr>" for p in products) if products else ""
    concern_rows="".join(f"<tr><td>{c[0]}</td><td>{c[1]}</td><td style='font-family:monospace;color:#00c8ff'>{bar(c[1],total)}</td><td>{round(c[1]/total*100)}%</td></tr>" for c in concerns) if concerns else ""
    lang_rows="".join(f"<tr><td>{l[0]}</td><td>{l[1]}</td><td>{round(l[1]/total*100)}%</td></tr>" for l in langs) if langs else ""
    tip_amt_rows="".join(f"<tr><td>{t[0]}</td><td>{t[1]}</td></tr>" for t in tip_amounts)
    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Hair Advisor Analytics</title>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;600&display=swap" rel="stylesheet">
<style>body{{background:#040709;color:#dff2ec;font-family:'Jost',sans-serif;font-weight:300;padding:40px;}}h1{{font-size:24px;font-weight:400;letter-spacing:0.08em;color:#00ffc8;margin-bottom:8px;}}h2{{font-size:13px;font-weight:400;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.40);margin:36px 0 12px;}}.stat{{display:inline-block;background:rgba(0,255,200,0.07);border:1px solid rgba(0,255,200,0.18);border-radius:12px;padding:16px 28px;margin:0 12px 12px 0;text-align:center;}}.stat .n{{font-size:36px;font-weight:300;color:#00ffc8;}}.stat .l{{font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.35);margin-top:4px;}}table{{width:100%;border-collapse:collapse;font-size:13px;}}th{{text-align:left;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.08);font-size:10px;letter-spacing:0.10em;text-transform:uppercase;color:rgba(255,255,255,0.30);}}td{{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.70);}}tr:hover td{{background:rgba(255,255,255,0.03);}}</style></head><body>
<h1>Hair Advisor — Analytics</h1>
<p style="color:rgba(255,255,255,0.30);font-size:12px;margin-bottom:28px;">Live data · {datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M")} UTC</p>
<div class="stat"><div class="n">{total}</div><div class="l">Total Sessions</div></div>
<div class="stat"><div class="n">{len(products)}</div><div class="l">Products Recommended</div></div>
<div class="stat"><div class="n">{len(langs)}</div><div class="l">Languages Used</div></div>
<div class="stat"><div class="n">{tip_total}</div><div class="l">Tip Submissions</div></div>
<div class="stat"><div class="n">{avg_r}</div><div class="l">Avg Star Rating</div></div>
<h2>Product Recommendations</h2><table><tr><th>Product</th><th>Count</th><th>Share</th><th>%</th></tr>{prod_rows}</table>
<h2>Hair Concerns</h2><table><tr><th>Concern</th><th>Count</th><th>Share</th><th>%</th></tr>{concern_rows}</table>
<h2>Languages</h2><table><tr><th>Language</th><th>Count</th><th>%</th></tr>{lang_rows}</table>
<h2>Tip Amounts</h2><table><tr><th>Amount</th><th>Count</th></tr>{tip_amt_rows}</table>
<h2>Recent Sessions (last 50)</h2><table><tr><th>Time</th><th>Lang</th><th>Message</th><th>Product</th><th>Concern</th></tr>{rows}</table>
</body></html>"""


# ── CORS ──────────────────────────────────────────────────────────────────────
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        from flask import make_response
        resp = make_response("", 200)
        resp.headers["Access-Control-Allow-Origin"]  = "*"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Auth-Token, X-Session-Id"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, DELETE"
        resp.headers["Access-Control-Max-Age"]       = "3600"
        return resp

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Auth-Token, X-Session-Id"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, DELETE"
    response.headers["Access-Control-Max-Age"]       = "3600"
    # Allow embedding in Shopify iframe
    response.headers["X-Frame-Options"]              = "ALLOW-FROM https://supportrd.com"
    response.headers["Content-Security-Policy"]      = "frame-ancestors https://supportrd.com https://*.myshopify.com *"
    return response


# ── AUTH ENDPOINTS ────────────────────────────────────────────────────────────
@app.route("/api/auth/register", methods=["POST","OPTIONS"])
def register():
    try:
        data  = request.get_json(force=True, silent=True) or {}
        email = (data.get("email","")).strip().lower()
        name  = data.get("name","").strip()
        pw    = data.get("password","")
        if not email or not pw: return jsonify({"error":"Email and password required"}), 400
        if not name: return jsonify({"error":"Name is required"}), 400
        if len(pw) < 6: return jsonify({"error":"Password must be at least 6 characters"}), 400
        db_execute("INSERT INTO users (email,name,password_hash) VALUES (?,?,?)", (email, name, hash_password(pw)))
        row = db_execute("SELECT id FROM users WHERE email=?", (email,), fetchone=True)
        token = create_session(row[0])
        return jsonify({"ok":True,"token":token,"name":name,"email":email})
    except sqlite3.IntegrityError:
        return jsonify({"error":"Email already registered"}), 409
    except Exception as e:
        return jsonify({"error":"Registration failed: "+str(e)}), 500

@app.route("/api/auth/login", methods=["POST","OPTIONS"])
def login():
    try:
        data  = request.get_json(force=True, silent=True) or {}
        email = (data.get("email","")).strip().lower()
        pw    = data.get("password","")
        if not email or not pw: return jsonify({"error":"Email and password required"}), 400
        row = db_execute("SELECT id,name,avatar FROM users WHERE email=? AND password_hash=?", (email, hash_password(pw)), fetchone=True)
        if not row: return jsonify({"error":"Invalid email or password"}), 401
        token = create_session(row[0])
        return jsonify({"ok":True,"token":token,"name":row[1],"email":email,"avatar":row[2]})
    except Exception as e:
        return jsonify({"error":"Login failed: "+str(e)}), 500

@app.route("/api/auth/logout", methods=["POST","OPTIONS"])
def logout():
    token = request.headers.get("X-Auth-Token") or request.cookies.get("srd_token")
    if token:
        con = get_db(); con.execute("DELETE FROM sessions WHERE token=?", (token,)); con.commit(); con.close()
    return jsonify({"ok":True})

@app.route("/api/auth/me", methods=["GET","OPTIONS"])
def me():
    user = get_current_user()
    if not user: return jsonify({"error":"Not logged in"}), 401
    profile = get_hair_profile(user["id"])
    history_count = len(get_chat_history(user["id"], limit=100))
    subscribed = is_subscribed(user["id"])
    return jsonify({**user, "profile": profile, "chat_count": history_count, "subscribed": subscribed})

@app.route("/api/auth/google", methods=["POST","OPTIONS"])
def google_auth():
    data = request.get_json()
    g_token = data.get("credential","")
    try:
        parts   = g_token.split(".")
        padding = 4 - len(parts[1]) % 4
        payload = json.loads(__import__("base64").b64decode(parts[1]+"="*padding).decode())
        email   = payload.get("email",""); name=payload.get("name",""); avatar=payload.get("picture",""); g_id=payload.get("sub","")
    except:
        return jsonify({"error":"Invalid Google token"}), 400
    con = get_db()
    row = con.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    if row:
        user_id = row[0]
        con.execute("UPDATE users SET google_id=?,name=?,avatar=? WHERE id=?", (g_id,name,avatar,user_id))
    else:
        con.execute("INSERT INTO users (email,name,google_id,avatar) VALUES (?,?,?,?)", (email,name,g_id,avatar))
        user_id = con.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()[0]
    con.commit(); con.close()
    token = create_session(user_id)
    return jsonify({"ok":True,"token":token,"name":name,"email":email,"avatar":avatar})

@app.route("/api/auth/shopify", methods=["POST","OPTIONS"])
def shopify_auth():
    data  = request.get_json()
    cid   = str(data.get("shopify_customer_id",""))
    email = data.get("email","").strip().lower()
    name  = data.get("name","").strip()
    if not email or not cid: return jsonify({"error":"Missing customer data"}), 400
    con = get_db()
    row = con.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
    if row:
        user_id = row[0]
        con.execute("UPDATE users SET name=? WHERE id=?", (name, user_id))
    else:
        con.execute("INSERT INTO users (email,name,google_id) VALUES (?,?,?)", (email,name,f"shopify_{cid}"))
        user_id = con.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()[0]
    con.commit(); con.close()
    token = create_session(user_id)
    profile = get_hair_profile(user_id)
    history_count = len(get_chat_history(user_id, limit=100))
    return jsonify({"ok":True,"token":token,"name":name,"email":email,"user_id":user_id,"profile":profile,"chat_count":history_count})

@app.route("/api/auth/forgot-password", methods=["POST","OPTIONS"])
def forgot_password():
    data  = request.get_json(silent=True) or {}
    email = (data.get("email","") or "").strip().lower()
    if not email: return jsonify({"error":"Email required"}), 400
    user = db_execute("SELECT id, name FROM users WHERE email=?", (email,), fetchone=True)
    if not user: return jsonify({"ok": True})
    token   = secrets.token_urlsafe(32)
    expires = (datetime.datetime.utcnow() + datetime.timedelta(hours=2)).isoformat()
    db_execute("UPDATE users SET reset_token=?, reset_token_expires=? WHERE id=?", (token, expires, user[0]))
    reset_url = f"{APP_BASE_URL}/pages/hair-dashboard?reset_token={token}"
    try:
        import smtplib; from email.mime.text import MIMEText
        smtp_user=os.environ.get("SMTP_USER",""); smtp_pass=os.environ.get("SMTP_PASS","")
        if smtp_user and smtp_pass:
            msg=MIMEText(f"Hi {user[1]},\n\nReset your password:\n{reset_url}\n\nValid 2 hours.\n\n— SupportRD Team")
            msg["Subject"]="Reset your SupportRD password"; msg["From"]=smtp_user; msg["To"]=email
            with smtplib.SMTP_SSL("smtp.gmail.com",465) as server:
                server.login(smtp_user,smtp_pass); server.send_message(msg)
    except Exception as e:
        print(f"Email send error: {e}")
    return jsonify({"ok": True})

@app.route("/api/auth/reset-password", methods=["POST","OPTIONS"])
def reset_password():
    data     = request.get_json(silent=True) or {}
    token    = (data.get("token","") or "").strip()
    password = (data.get("password","") or "").strip()
    if not token or not password or len(password) < 6: return jsonify({"error":"Invalid request"}), 400
    user = db_execute("SELECT id, reset_token_expires FROM users WHERE reset_token=?", (token,), fetchone=True)
    if not user: return jsonify({"error":"Invalid or expired reset link"}), 400
    if user[1] and datetime.datetime.utcnow().isoformat() > user[1]:
        return jsonify({"error":"Reset link has expired. Please request a new one."}), 400
    db_execute("UPDATE users SET password_hash=?, reset_token=NULL, reset_token_expires=NULL WHERE id=?",
               (hash_password(password), user[0]))
    return jsonify({"ok": True})


# ── PROFILE / HISTORY ENDPOINTS ───────────────────────────────────────────────
@app.route("/api/profile", methods=["GET","POST","OPTIONS"])
def profile():
    user = get_current_user()
    if not user: return jsonify({"error":"Not logged in"}), 401
    if request.method == "POST":
        save_hair_profile(user["id"], request.get_json())
        return jsonify({"ok":True})
    return jsonify(get_hair_profile(user["id"]))

@app.route("/api/history", methods=["GET","OPTIONS"])
def history():
    user = get_current_user()
    if not user: return jsonify({"error":"Not logged in"}), 401
    return jsonify({"history": get_chat_history(user["id"], limit=50)})

@app.route("/api/history/clear", methods=["POST","OPTIONS"])
def clear_history():
    user = get_current_user()
    if not user: return jsonify({"error":"Not logged in"}), 401
    con = get_db(); con.execute("DELETE FROM chat_history WHERE user_id=?", (user["id"],)); con.commit(); con.close()
    return jsonify({"ok":True})

@app.route("/api/auth/shopify-verify", methods=["GET","POST","OPTIONS"])
def shopify_verify():
    user = get_current_user()
    if not user: return jsonify({"error":"Not logged in"}), 401
    profile = get_hair_profile(user["id"])
    history = get_chat_history(user["id"], limit=50)
    return jsonify({"ok":True,"user":user,"profile":profile,"history":history,"chat_count":len(history)})

@app.route("/api/rate-experience", methods=["POST","OPTIONS"])
def rate_experience():
    user = get_current_user()
    if not user: return jsonify({"error":"Not logged in"}), 401
    data = request.get_json()
    con = get_db()
    try: con.execute("ALTER TABLE hair_profiles ADD COLUMN site_rating INTEGER DEFAULT 0"); con.execute("ALTER TABLE hair_profiles ADD COLUMN site_review TEXT DEFAULT ''"); con.commit()
    except: pass
    con.execute("""INSERT INTO hair_profiles (user_id, site_rating, site_review) VALUES (?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET site_rating=excluded.site_rating, site_review=excluded.site_review""",
        (user["id"], data.get("rating",0), data.get("review","")))
    con.commit(); con.close()
    return jsonify({"ok":True})


# ── SUBSCRIPTION ENDPOINTS ────────────────────────────────────────────────────
@app.route("/api/subscription/status", methods=["GET","OPTIONS"])
def subscription_status():
    user       = get_current_user()
    session_id = request.headers.get("X-Session-Id","anon")
    if user:
        sub        = get_subscription(user["id"])
        count      = get_session_count(session_id, user["id"])
        subscribed = is_subscribed(user["id"])
        return jsonify({"subscribed":subscribed,"plan":sub["plan"] if sub else "free","status":sub["status"] if sub else "inactive","trial_end":sub["trial_end"] if sub else None,"current_period_end":sub["current_period_end"] if sub else None,"response_count":count,"free_limit":FREE_RESPONSE_LIMIT,"show_paywall":False})
    else:
        count = get_session_count(session_id)
        return jsonify({"subscribed":False,"plan":"free","status":"inactive","response_count":count,"free_limit":FREE_RESPONSE_LIMIT,"show_paywall":False})

@app.route("/api/subscription/checkout", methods=["POST","OPTIONS"])
def create_checkout():
    user = get_current_user()
    if not user: return jsonify({"error":"Must be logged in to subscribe"}), 401
    if not STRIPE_SECRET_KEY or not STRIPE_PRICE_ID: return jsonify({"error":"Stripe not configured","setup_needed":True}), 503
    try:
        import urllib.request as urlreq, urllib.parse as urlparse
        sub = get_subscription(user["id"])
        stripe_customer = sub["stripe_customer"] if sub else None
        if not stripe_customer:
            cust_data = urlparse.urlencode({"email":user["email"],"name":user["name"] or user["email"],"metadata[user_id]":str(user["id"])}).encode()
            req = urlreq.Request("https://api.stripe.com/v1/customers",data=cust_data,headers={"Authorization":f"Bearer {STRIPE_SECRET_KEY}","Content-Type":"application/x-www-form-urlencoded"},method="POST")
            with urlreq.urlopen(req) as r: cust=json.loads(r.read())
            stripe_customer = cust["id"]
        params = urlparse.urlencode({"customer":stripe_customer,"mode":"subscription","line_items[0][price]":STRIPE_PRICE_ID,"line_items[0][quantity]":"1","subscription_data[trial_period_days]":str(STRIPE_TRIAL_DAYS),"success_url":f"{APP_BASE_URL}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}","cancel_url":f"{APP_BASE_URL}/subscription/cancel","metadata[user_id]":str(user["id"])}).encode()
        req = urlreq.Request("https://api.stripe.com/v1/checkout/sessions",data=params,headers={"Authorization":f"Bearer {STRIPE_SECRET_KEY}","Content-Type":"application/x-www-form-urlencoded"},method="POST")
        with urlreq.urlopen(req) as r: session=json.loads(r.read())
        con = get_db()
        row = con.execute("SELECT id FROM subscriptions WHERE user_id=?", (user["id"],)).fetchone()
        if row: con.execute("UPDATE subscriptions SET stripe_customer=?,updated_at=? WHERE user_id=?",(stripe_customer,datetime.datetime.utcnow().isoformat(),user["id"]))
        else: con.execute("INSERT INTO subscriptions (user_id,stripe_customer,status,plan) VALUES (?,?,'inactive','free')",(user["id"],stripe_customer))
        con.commit(); con.close()
        return jsonify({"checkout_url":session["url"],"session_id":session["id"]})
    except Exception as e:
        return jsonify({"error":str(e)}), 500

@app.route("/api/subscription/webhook", methods=["POST"])
def stripe_webhook():
    payload = request.get_data(); sig=request.headers.get("Stripe-Signature","")
    try:
        if STRIPE_WEBHOOK_SECRET:
            import hmac,hashlib
            ts=sig.split(",")[0].split("=")[1]; v1=sig.split("v1=")[1].split(",")[0]
            signed=f"{ts}.{payload.decode()}"
            expected=hmac.new(STRIPE_WEBHOOK_SECRET.encode(),signed.encode(),hashlib.sha256).hexdigest()
            if not hmac.compare_digest(v1,expected): return jsonify({"error":"Invalid signature"}),400
        event=json.loads(payload); event_type=event["type"]; obj=event["data"]["object"]
        user_id=None
        if obj.get("metadata",{}).get("user_id"): user_id=int(obj["metadata"]["user_id"])
        elif obj.get("customer"):
            con=get_db(); row=con.execute("SELECT user_id FROM subscriptions WHERE stripe_customer=?",(obj["customer"],)).fetchone(); con.close()
            if row: user_id=row[0]
        if not user_id: return jsonify({"ok":True})
        con=get_db()
        if event_type in ("customer.subscription.created","customer.subscription.updated"):
            status=obj.get("status","inactive"); trial_end=datetime.datetime.utcfromtimestamp(obj["trial_end"]).isoformat() if obj.get("trial_end") else None; period_end=datetime.datetime.utcfromtimestamp(obj["current_period_end"]).isoformat() if obj.get("current_period_end") else None; sub_id=obj.get("id","")
            row=con.execute("SELECT id FROM subscriptions WHERE user_id=?",(user_id,)).fetchone()
            if row: con.execute("UPDATE subscriptions SET stripe_sub_id=?,status=?,plan='premium',trial_end=?,current_period_end=?,updated_at=? WHERE user_id=?",(sub_id,status,trial_end,period_end,datetime.datetime.utcnow().isoformat(),user_id))
            else: con.execute("INSERT INTO subscriptions (user_id,stripe_sub_id,status,plan,trial_end,current_period_end) VALUES (?,?,'trialing','premium',?,?)",(user_id,sub_id,trial_end,period_end))
        elif event_type=="customer.subscription.deleted": con.execute("UPDATE subscriptions SET status='canceled',plan='free',updated_at=? WHERE user_id=?",(datetime.datetime.utcnow().isoformat(),user_id))
        elif event_type in ("invoice.payment_failed",): con.execute("UPDATE subscriptions SET status='past_due',updated_at=? WHERE user_id=?",(datetime.datetime.utcnow().isoformat(),user_id))
        con.commit(); con.close()
    except Exception as e:
        print(f"Webhook error: {e}")
    return jsonify({"ok":True})

@app.route("/api/shopify-order-webhook", methods=["POST"])
def shopify_order_webhook():
    try:
        data=request.get_json(force=True,silent=True) or {}
        if data.get("financial_status","") not in ("paid","partially_paid"): return jsonify({"ok":True,"skipped":"not paid"})
        line_items=data.get("line_items",[])
        is_premium=any("hair advisor" in (i.get("title","") or "").lower() or "premium" in (i.get("title","") or "").lower() for i in line_items)
        if not is_premium: return jsonify({"ok":True,"skipped":"not premium product"})
        email=(data.get("email","") or data.get("customer",{}).get("email","")).strip().lower()
        if not email: return jsonify({"ok":True,"skipped":"no email"})
        row=db_execute("SELECT id FROM users WHERE email=?", (email,), fetchone=True)
        if not row:
            db_execute("INSERT OR REPLACE INTO premium_codes (code, used) VALUES (?, 0)", ("PENDING_"+email,))
            return jsonify({"ok":True,"status":"pending — user not registered yet"})
        user_id=row[0]; period_end=(datetime.datetime.utcnow()+datetime.timedelta(days=30)).isoformat()
        existing=db_execute("SELECT id FROM subscriptions WHERE user_id=?", (user_id,), fetchone=True)
        if existing: db_execute("UPDATE subscriptions SET status='active', plan='premium', current_period_end=?, updated_at=datetime('now') WHERE user_id=?",(period_end,user_id))
        else: db_execute("INSERT INTO subscriptions (user_id, status, plan, current_period_end) VALUES (?, 'active', 'premium', ?)",(user_id,period_end))
        return jsonify({"ok":True,"status":"premium activated","email":email})
    except Exception as e:
        return jsonify({"ok":False,"error":str(e)}), 500

@app.route("/api/subscription/activate-shopify", methods=["POST","OPTIONS"])
def activate_shopify():
    user=get_current_user()
    if not user: return jsonify({"error":"Not logged in"}),401
    email=user["email"].strip().lower()
    pending=db_execute("SELECT id FROM premium_codes WHERE code=?",("PENDING_"+email,),fetchone=True)
    if pending: db_execute("DELETE FROM premium_codes WHERE code=?",("PENDING_"+email,))
    else: return jsonify({"error":"No purchase found for "+email+". Please buy at supportrd.com/products/hair-advisor-premium then try again.","verified":False}),403
    period_end=(datetime.datetime.utcnow()+datetime.timedelta(days=30)).isoformat()
    row=db_execute("SELECT id FROM subscriptions WHERE user_id=?",(user["id"],),fetchone=True)
    if row: db_execute("UPDATE subscriptions SET status='active',plan='premium',current_period_end=?,updated_at=datetime('now') WHERE user_id=?",(period_end,user["id"]))
    else: db_execute("INSERT INTO subscriptions (user_id,status,plan,current_period_end) VALUES (?,'active','premium',?)",(user["id"],period_end))
    return jsonify({"ok":True,"plan":"premium"})

@app.route("/api/admin/generate-code", methods=["POST","OPTIONS"])
def generate_code():
    admin_key=request.headers.get("X-Admin-Key","")
    if admin_key!=os.environ.get("ADMIN_KEY","srd_admin_2024"): return jsonify({"error":"Unauthorized"}),401
    code="SRD-"+secrets.token_hex(4).upper()
    db_execute("INSERT INTO premium_codes (code) VALUES (?)",(code,))
    return jsonify({"ok":True,"code":code})

@app.route("/api/admin/list-codes", methods=["GET","OPTIONS"])
def list_codes():
    admin_key=request.headers.get("X-Admin-Key","")
    if admin_key!=os.environ.get("ADMIN_KEY","srd_admin_2024"): return jsonify({"error":"Unauthorized"}),401
    rows=db_execute("SELECT code,used,used_at FROM premium_codes ORDER BY id DESC",fetchall=True)
    return jsonify({"codes":[{"code":r[0],"used":bool(r[1]),"used_at":r[2]} for r in (rows or [])]})


# ── SUBSCRIPTION PAGES ────────────────────────────────────────────────────────
@app.route("/subscription/success")
def subscription_success():
    return """<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SupportRD — Welcome to Premium</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#f0ebe8;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Jost',sans-serif;padding:24px;}.card{background:#fff;border-radius:24px;padding:56px 40px;max-width:460px;width:100%;text-align:center;box-shadow:0 12px 48px rgba(0,0,0,0.08);}.icon{font-size:56px;margin-bottom:20px;}.title{font-family:'Cormorant Garamond',serif;font-size:36px;font-style:italic;color:#0d0906;margin-bottom:10px;}.sub{font-size:13px;color:rgba(0,0,0,0.40);line-height:1.7;margin-bottom:28px;}.trial-badge{background:linear-gradient(135deg,#c1a3a2,#9d7f6a);color:#fff;padding:10px 24px;border-radius:20px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;display:inline-block;margin-bottom:28px;}.btn{display:block;padding:14px;background:#c1a3a2;color:#fff;text-decoration:none;border-radius:30px;font-family:'Jost',sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px;transition:background 0.2s;}.btn:hover{background:#9d7f6a;}.btn-outline{background:transparent;color:#9d7f6a;border:1px solid rgba(193,163,162,0.40);}</style></head><body>
<div class="card"><div class="icon">🌿</div><div class="title">Welcome to Premium</div><div class="trial-badge">7-Day Free Trial Active</div><div class="sub">Your hair journey just leveled up. Unlimited Aria access, full hair health dashboard, and priority advisor support.</div><a href="/" class="btn">Talk to Aria Now</a><a href="/dashboard" class="btn btn-outline">View My Dashboard</a></div>
<script>var u=localStorage.getItem('srd_user');if(u){try{var p=JSON.parse(u);p.plan='premium';localStorage.setItem('srd_user',JSON.stringify(p));}catch(e){}}</script>
</body></html>"""

@app.route("/subscription/cancel")
def subscription_cancel():
    return """<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SupportRD — No worries</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0;}body{background:#f0ebe8;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Jost',sans-serif;padding:24px;}.card{background:#fff;border-radius:24px;padding:56px 40px;max-width:460px;width:100%;text-align:center;box-shadow:0 12px 48px rgba(0,0,0,0.08);}.title{font-family:'Cormorant Garamond',serif;font-size:32px;font-style:italic;color:#0d0906;margin-bottom:12px;}.sub{font-size:13px;color:rgba(0,0,0,0.40);line-height:1.7;margin-bottom:28px;}.btn{display:block;padding:14px;background:#c1a3a2;color:#fff;text-decoration:none;border-radius:30px;font-family:'Jost',sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:10px;}.btn-outline{background:transparent;color:#9d7f6a;border:1px solid rgba(193,163,162,0.40);}</style></head><body>
<div class="card"><div class="title">No worries</div><div class="sub">You can still get free hair recommendations from Aria anytime. Upgrade whenever you're ready.</div><a href="/" class="btn">Continue with Free</a><a href="/login" class="btn btn-outline">Sign In to Subscribe Later</a></div>
</body></html>"""



# ── WHISPER TRANSCRIPTION ─────────────────────────────────────────────────────
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")

@app.route("/api/transcribe", methods=["POST","OPTIONS"])
def transcribe():
    if not OPENAI_API_KEY:
        return jsonify({"error": "No OpenAI key"}), 500
    try:
        audio_file = request.files.get("audio")
        if not audio_file:
            return jsonify({"error": "No audio"}), 400
        import urllib.request as urlreq
        boundary = "SRDBoundary" + secrets.token_hex(8)
        audio_data = audio_file.read()
        CRLF = b"\r\n"
        body = b""
        body += b"--" + boundary.encode() + CRLF
        body += b'Content-Disposition: form-data; name="model"' + CRLF + CRLF
        body += b"whisper-1" + CRLF
        body += b"--" + boundary.encode() + CRLF
        body += b'Content-Disposition: form-data; name="language"' + CRLF + CRLF
        body += b"en" + CRLF
        body += b"--" + boundary.encode() + CRLF
        body += b'Content-Disposition: form-data; name="file"; filename="audio.webm"' + CRLF
        body += b"Content-Type: audio/webm" + CRLF + CRLF
        body += audio_data + CRLF
        body += b"--" + boundary.encode() + b"--" + CRLF
        req = urlreq.Request(
            "https://api.openai.com/v1/audio/transcriptions",
            data=body,
            headers={
                "Authorization": "Bearer " + OPENAI_API_KEY,
                "Content-Type": "multipart/form-data; boundary=" + boundary
            },
            method="POST"
        )
        with urlreq.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode())
            return jsonify({"text": result.get("text", "")})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/ping", methods=["GET"])
def ping():
    return jsonify({"ok": True, "status": "awake"})


# ── LOGIN PAGE ────────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

@app.route("/login")
def login_page():
    return f"""<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SupportRD — Sign In</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
<script src="https://accounts.google.com/gsi/client" async defer></script>
<style>
*{{box-sizing:border-box;margin:0;padding:0;}}
body{{background:#f0ebe8;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Jost',sans-serif;font-weight:300;padding:24px;}}
.card{{background:#fff;border-radius:24px;padding:48px 40px;width:100%;max-width:420px;box-shadow:0 12px 48px rgba(0,0,0,0.08);border:1px solid rgba(193,163,162,0.20);}}
.logo{{text-align:center;margin-bottom:32px;}}
.logo-text{{font-family:'Cormorant Garamond',serif;font-size:32px;font-style:italic;font-weight:300;color:#0d0906;}}
.logo-sub{{font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:#c1a3a2;margin-top:4px;}}
h2{{font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;font-weight:300;color:#0d0906;text-align:center;margin-bottom:28px;}}
.tabs{{display:flex;gap:0;border:1px solid rgba(193,163,162,0.30);border-radius:12px;overflow:hidden;margin-bottom:28px;}}
.tab{{flex:1;padding:10px;text-align:center;font-size:12px;letter-spacing:0.10em;text-transform:uppercase;cursor:pointer;background:#fff;color:rgba(0,0,0,0.40);transition:all 0.2s;border:none;font-family:'Jost',sans-serif;}}
.tab.active{{background:#c1a3a2;color:#fff;}}
input{{width:100%;padding:13px 16px;border:1px solid rgba(193,163,162,0.35);border-radius:12px;font-family:'Jost',sans-serif;font-size:14px;color:#0d0906;background:#faf6f3;outline:none;margin-bottom:12px;transition:border 0.2s;}}
input:focus{{border-color:#c1a3a2;}}
input::placeholder{{color:rgba(0,0,0,0.25);}}
.btn{{width:100%;padding:14px;border:none;border-radius:30px;background:#c1a3a2;color:#fff;font-family:'Jost',sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:background 0.3s;margin-top:4px;}}
.btn:hover{{background:#9d7f6a;}}
.divider{{display:flex;align-items:center;gap:12px;margin:20px 0;}}
.divider-line{{flex:1;height:1px;background:rgba(193,163,162,0.25);}}
.divider-text{{font-size:11px;color:rgba(0,0,0,0.30);letter-spacing:0.08em;}}
.google-wrap{{display:flex;justify-content:center;}}
.err{{background:#fdf0f0;border:1px solid #e4a0a0;border-radius:10px;padding:12px 16px;font-size:13px;color:#8b2020;margin-bottom:16px;display:none;}}
.success{{background:#f0faf5;border:1px solid #c1a3a2;border-radius:10px;padding:12px 16px;font-size:13px;color:#2d6a4f;margin-bottom:16px;display:none;}}
.back{{text-align:center;margin-top:20px;font-size:11px;color:rgba(0,0,0,0.35);letter-spacing:0.08em;}}
.back a{{color:#9d7f6a;text-decoration:none;}}
</style></head><body>
<div class="card">
  <div class="logo"><div class="logo-text">SupportRD</div><div class="logo-sub">Hair Advisor</div></div>
  <h2>Welcome back</h2>
  <div class="tabs">
    <button class="tab active" onclick="switchTab('login')">Sign In</button>
    <button class="tab" onclick="switchTab('register')">Create Account</button>
  </div>
  <div id="err" class="err"></div>
  <div id="success" class="success"></div>
  <div id="login-form">
    <input type="email" id="l-email" placeholder="Email address">
    <input type="password" id="l-pass" placeholder="Password">
    <button class="btn" onclick="doLogin()">Sign In</button>
  </div>
  <div id="register-form" style="display:none;">
    <input type="text" id="r-name" placeholder="Your name">
    <input type="email" id="r-email" placeholder="Email address">
    <input type="password" id="r-pass" placeholder="Password (min 6 characters)">
    <button class="btn" onclick="doRegister()">Create Account</button>
  </div>
  <div class="divider"><div class="divider-line"></div><div class="divider-text">or</div><div class="divider-line"></div></div>
  <div class="google-wrap">
    <div id="g_id_onload" data-client_id="{GOOGLE_CLIENT_ID}" data-callback="handleGoogle"></div>
    <div class="g_id_signin" data-type="standard" data-shape="pill" data-theme="outline" data-text="sign_in_with" data-size="large" data-logo_alignment="left"></div>
  </div>
  <div class="back"><a href="/">← Back to Hair Advisor</a></div>
</div>
<script>
function switchTab(t){{document.getElementById('login-form').style.display=t==='login'?'block':'none';document.getElementById('register-form').style.display=t==='register'?'block':'none';document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',(t==='login'&&i===0)||(t==='register'&&i===1)));hideMsg();}}
function showErr(m){{var e=document.getElementById('err');e.textContent=m;e.style.display='block';document.getElementById('success').style.display='none';}}
function showOk(m){{var e=document.getElementById('success');e.textContent=m;e.style.display='block';document.getElementById('err').style.display='none';}}
function hideMsg(){{document.getElementById('err').style.display='none';document.getElementById('success').style.display='none';}}
function saveAndRedirect(data){{localStorage.setItem('srd_token',data.token);localStorage.setItem('srd_user',JSON.stringify({{name:data.name,email:data.email,avatar:data.avatar||''}}));showOk('Welcome, '+data.name+'! Redirecting...');setTimeout(()=>window.location.href='/dashboard',1200);}}
async function doLogin(){{var email=document.getElementById('l-email').value;var pass=document.getElementById('l-pass').value;if(!email||!pass){{showErr('Please fill in all fields.');return;}}var r=await fetch('/api/auth/login',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{email,password:pass}})}});var d=await r.json();if(d.error){{showErr(d.error);}}else{{saveAndRedirect(d);}}}}\nasync function doRegister(){{var name=document.getElementById('r-name').value;var email=document.getElementById('r-email').value;var pass=document.getElementById('r-pass').value;if(!name||!email||!pass){{showErr('Please fill in all fields.');return;}}var r=await fetch('/api/auth/register',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{name,email,password:pass}})}});var d=await r.json();if(d.error){{showErr(d.error);}}else{{saveAndRedirect(d);}}}}\nasync function handleGoogle(response){{var r=await fetch('/api/auth/google',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{credential:response.credential}})}});var d=await r.json();if(d.error){{showErr(d.error);}}else{{saveAndRedirect(d);}}}}
</script></body></html>"""


# ── DASHBOARD PAGE ────────────────────────────────────────────────────────────
@app.route("/dashboard")
def dashboard():
    html = r"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aria Command Center — SupportRD</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@300;400;500&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#07090d;--bg2:#0c0f16;--bg3:#11151f;
  --border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.11);
  --text:#eaedf5;--muted:#505870;--muted2:#8490a8;
  --rose:#f0a090;--rose-dim:rgba(240,160,144,0.13);--rose-glow:rgba(240,160,144,0.4);
  --gold:#e0b050;--gold-dim:rgba(224,176,80,0.12);--gold-glow:rgba(224,176,80,0.4);
  --green:#30e890;--red:#ff5555;--blue:#60a8ff;--purple:#b090ff;
}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Space Grotesk',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden;}
body::before{content:'';position:fixed;inset:0;
  background:radial-gradient(ellipse 55% 45% at 75% 5%,rgba(240,160,144,0.07) 0%,transparent 55%),
    radial-gradient(ellipse 40% 35% at 5% 85%,rgba(224,176,80,0.05) 0%,transparent 50%),
    radial-gradient(ellipse 30% 40% at 50% 50%,rgba(96,168,255,0.03) 0%,transparent 60%);
  pointer-events:none;z-index:0;}
/* TICKER */
.ticker-wrap{position:fixed;top:0;left:0;right:0;height:30px;background:rgba(5,7,11,0.98);border-bottom:1px solid rgba(240,160,144,0.15);z-index:100;overflow:hidden;display:flex;align-items:center;}
.ticker-label{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.2em;color:var(--rose);text-transform:uppercase;padding:0 16px;white-space:nowrap;border-right:1px solid rgba(240,160,144,0.2);height:100%;display:flex;align-items:center;background:rgba(240,160,144,0.06);z-index:2;text-shadow:0 0 10px var(--rose-glow);}
.ticker-scroll{overflow:hidden;flex:1;height:100%;}
.ticker-track{display:flex;animation:tick 36s linear infinite;white-space:nowrap;height:100%;align-items:center;}
.ticker-item{display:flex;align-items:center;gap:7px;padding:0 20px;border-right:1px solid var(--border);height:100%;}
.t-name{font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--muted2);letter-spacing:0.08em;}
.t-val{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;}
.t-up{color:var(--green);text-shadow:0 0 8px rgba(48,232,144,0.5);}
.t-down{color:var(--red);}
.t-chg{font-size:8px;font-family:'IBM Plex Mono',monospace;}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
/* NAV */
.nav{position:fixed;top:30px;left:0;right:0;height:50px;background:rgba(7,9,13,0.96);backdrop-filter:blur(24px);border-bottom:1px solid var(--border);z-index:99;display:flex;align-items:center;padding:0 22px;}
.nav-logo{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;color:var(--text);margin-right:28px;display:flex;align-items:center;gap:8px;letter-spacing:-0.02em;}
.nav-logo-dot{width:8px;height:8px;border-radius:50%;background:var(--rose);box-shadow:0 0 12px var(--rose-glow),0 0 24px rgba(240,160,144,0.3);animation:logoPulse 2s ease-in-out infinite;}
@keyframes logoPulse{0%,100%{box-shadow:0 0 8px var(--rose-glow)}50%{box-shadow:0 0 20px var(--rose-glow),0 0 40px rgba(240,160,144,0.2)}}
.nav-tabs{display:flex;height:100%;}
.nav-tab{height:100%;padding:0 15px;display:flex;align-items:center;font-size:11px;letter-spacing:0.04em;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s;position:relative;top:1px;text-decoration:none;}
.nav-tab:hover,.nav-tab.active{color:var(--text);border-bottom-color:var(--rose);}
.nav-right{margin-left:auto;display:flex;align-items:center;gap:10px;}
.live-badge{display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:4px;background:rgba(48,232,144,0.08);border:1px solid rgba(48,232,144,0.25);font-size:9px;font-family:'IBM Plex Mono',monospace;color:var(--green);letter-spacing:0.1em;}
.live-dot{width:5px;height:5px;border-radius:50%;background:var(--green);animation:liveDot 1.4s ease-in-out infinite;}
@keyframes liveDot{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(48,232,144,0.5)}50%{opacity:0.6;box-shadow:0 0 0 4px rgba(48,232,144,0)}}
.nav-avatar{width:28px;height:28px;border-radius:5px;background:linear-gradient(135deg,var(--rose),#c06050);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;overflow:hidden;}
.nav-avatar img{width:100%;height:100%;object-fit:cover;}
.nav-name{font-size:12px;color:var(--muted2);}
.plan-tag{font-size:9px;padding:3px 8px;border-radius:3px;background:var(--gold-dim);border:1px solid rgba(224,176,80,0.3);color:var(--gold);font-family:'IBM Plex Mono',monospace;letter-spacing:0.08em;}
.logout-btn{font-size:10px;color:var(--muted);cursor:pointer;padding:4px 8px;border-radius:4px;background:none;border:1px solid var(--border);font-family:'Space Grotesk',sans-serif;transition:all 0.15s;}
.logout-btn:hover{color:var(--text);}
/* APP */
.app{padding:84px 18px 40px;max-width:1640px;margin:0 auto;position:relative;z-index:1;}
/* TOP ROW */
.top-row{display:grid;grid-template-columns:260px 1fr 260px;gap:10px;margin-bottom:10px;align-items:stretch;}
/* SCORE PANEL */
.score-panel{background:var(--bg2);border:1px solid rgba(240,160,144,0.15);border-radius:10px;padding:20px 16px;display:flex;flex-direction:column;align-items:center;position:relative;overflow:hidden;animation:panelPulse 4s ease-in-out infinite;}
@keyframes panelPulse{0%,100%{border-color:rgba(240,160,144,0.15);box-shadow:none}50%{border-color:rgba(240,160,144,0.35);box-shadow:0 0 30px rgba(240,160,144,0.08),inset 0 0 30px rgba(240,160,144,0.03)}}
.score-panel::after{content:'';position:absolute;top:0;left:50%;transform:translateX(-50%);height:1px;background:linear-gradient(90deg,transparent,var(--rose),transparent);animation:accentLine 3s ease-in-out infinite;}
@keyframes accentLine{0%,100%{width:120px;opacity:0.5}50%{width:260px;opacity:1}}
.sp-label{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.22em;color:var(--muted);text-transform:uppercase;margin-bottom:14px;}
.score-ring-wrap{position:relative;width:148px;height:148px;margin-bottom:12px;}
.score-svg{width:148px;height:148px;transform:rotate(-90deg);animation:ringPulse 3s ease-in-out infinite;}
@keyframes ringPulse{0%,100%{filter:drop-shadow(0 0 3px rgba(240,160,144,0.3))}50%{filter:drop-shadow(0 0 14px rgba(240,160,144,0.8))}}
.score-bg-c{fill:none;stroke:rgba(255,255,255,0.04);stroke-width:9;}
.score-fill-c{fill:none;stroke-width:9;stroke-linecap:round;stroke-dasharray:440;stroke-dashoffset:440;transition:stroke-dashoffset 2.2s cubic-bezier(0.25,1,0.5,1);}
.score-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.score-big{font-family:'Syne',sans-serif;font-size:54px;font-weight:800;line-height:1;color:var(--text);letter-spacing:-3px;animation:scoreGlow 3s ease-in-out infinite;}
@keyframes scoreGlow{0%,100%{text-shadow:0 0 20px rgba(240,160,144,0.5)}50%{text-shadow:0 0 30px rgba(240,160,144,0.9),0 0 60px rgba(240,160,144,0.4)}}
.score-unit{font-family:'IBM Plex Mono',monospace;font-size:10px;color:var(--muted);margin-top:1px;}
.score-status{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;margin-bottom:2px;letter-spacing:0.05em;}
.score-delta{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);margin-bottom:14px;}
.metric-rows{width:100%;display:flex;flex-direction:column;gap:8px;}
.mr{display:flex;align-items:center;gap:8px;}
.mr-lbl{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.1em;color:var(--muted);width:58px;flex-shrink:0;text-transform:uppercase;}
.mr-track{flex:1;height:3px;background:rgba(255,255,255,0.05);border-radius:2px;overflow:hidden;}
.mr-fill{height:100%;border-radius:2px;transform-origin:left;transform:scaleX(0);transition:transform 1.6s cubic-bezier(0.25,1,0.5,1);}
.mr-val{font-family:'IBM Plex Mono',monospace;font-size:10px;font-weight:500;width:30px;text-align:right;}
/* MAIN CHART PANEL */
.main-panel{background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;}
.panel-head{display:flex;align-items:center;border-bottom:1px solid var(--border);height:40px;padding:0 16px;gap:12px;}
.ph-title{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.14em;color:var(--muted2);text-transform:uppercase;}
.time-tabs{display:flex;gap:2px;margin-left:auto;}
.tt{font-family:'IBM Plex Mono',monospace;font-size:9px;padding:3px 9px;border-radius:3px;cursor:pointer;color:var(--muted);border:1px solid transparent;transition:all 0.12s;}
.tt:hover{color:var(--text);}
.tt.on{background:rgba(240,160,144,0.15);border-color:rgba(240,160,144,0.35);color:var(--rose);}
.chart-area{flex:1;padding:12px 16px;display:flex;flex-direction:column;gap:10px;}
.chart-row{display:flex;flex-direction:column;gap:3px;}
.chart-meta{display:flex;align-items:center;justify-content:space-between;}
.chart-name{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.12em;color:var(--muted);}
.chart-reading{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:500;}
.sparkline-wrap{height:36px;}
.sparkline-svg{width:100%;height:100%;}
/* INSIGHTS */
.insights-panel{background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
.ins-head{border-bottom:1px solid var(--border);height:40px;padding:0 16px;display:flex;align-items:center;}
.ins-title{font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.14em;color:var(--muted2);}
.ins-live{margin-left:auto;display:flex;align-items:center;gap:4px;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--green);}
.ins-body{padding:12px;}
.ins-section-label{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.14em;color:var(--muted);text-transform:uppercase;margin-bottom:7px;}
.ins-item{margin-bottom:11px;}
.ins-item-label{font-size:10px;color:var(--muted2);margin-bottom:5px;display:flex;justify-content:space-between;}
.ins-item-label span{font-family:'IBM Plex Mono',monospace;}
.ins-bar-wrap{height:7px;background:rgba(255,255,255,0.04);border-radius:4px;overflow:hidden;position:relative;}
.ins-bar-a{height:100%;border-radius:4px 0 0 4px;background:var(--rose);transition:width 1.4s cubic-bezier(0.25,1,0.5,1);position:relative;overflow:hidden;}
.ins-bar-a::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent);animation:shimmer 2.5s ease-in-out infinite;}
@keyframes shimmer{0%{left:-60%}100%{left:160%}}
.ins-bar-b{position:absolute;top:0;right:0;height:100%;border-radius:0 4px 4px 0;background:var(--blue);transition:width 1.4s cubic-bezier(0.25,1,0.5,1);}
.ins-legend{display:flex;justify-content:space-between;margin-top:3px;}
.ins-l-item{display:flex;align-items:center;gap:4px;font-family:'IBM Plex Mono',monospace;font-size:8px;color:var(--muted);}
.ins-dot{width:5px;height:5px;border-radius:50%;}
.ins-divider{height:1px;background:var(--border);margin:9px 0;}
.community-stat{display:flex;align-items:center;justify-content:space-between;padding:4px 0;}
.cs-label{font-size:10px;color:var(--muted2);}
.cs-val{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;}
#active-count{font-family:'Syne',sans-serif;font-size:30px;font-weight:800;color:var(--rose);text-shadow:0 0 20px var(--rose-glow);animation:activeGlow 2s ease-in-out infinite;}
@keyframes activeGlow{0%,100%{text-shadow:0 0 15px var(--rose-glow)}50%{text-shadow:0 0 30px var(--rose-glow),0 0 60px rgba(240,160,144,0.3)}}
/* MID ROW */
.mid-row{display:grid;grid-template-columns:1fr 1fr 1fr 220px;gap:10px;margin-bottom:10px;}
.stat-card{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;cursor:pointer;transition:all 0.18s;position:relative;overflow:hidden;}
.stat-card:hover{border-color:rgba(240,160,144,0.3);transform:translateY(-2px);}
.stat-card.active{border-color:rgba(240,160,144,0.4);background:rgba(240,160,144,0.05);}
.sc-eye{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:7px;}
.sc-val{font-family:'Syne',sans-serif;font-size:36px;font-weight:800;color:var(--text);line-height:1;margin-bottom:2px;letter-spacing:-1px;}
.sc-name{font-size:11px;color:var(--muted2);}
.sc-trend{font-family:'IBM Plex Mono',monospace;font-size:9px;margin-top:5px;}
.sc-spark{margin-top:7px;height:26px;}
.action-panel{background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:13px;display:flex;flex-direction:column;gap:7px;}
.ap-title{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.16em;color:var(--muted);text-transform:uppercase;margin-bottom:3px;}
.action-btn{width:100%;padding:9px 12px;border-radius:6px;font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s;border:1px solid;display:flex;align-items:center;gap:8px;}
.action-btn.primary{background:var(--rose);color:#000;border-color:var(--rose);box-shadow:0 0 20px rgba(240,160,144,0.3);}
.action-btn.primary:hover{background:#ff9080;}
.action-btn.secondary{background:transparent;color:var(--muted2);border-color:var(--border2);}
.action-btn.secondary:hover{color:var(--text);border-color:rgba(240,160,144,0.3);background:rgba(240,160,144,0.05);}
.ab-icon{font-size:13px;flex-shrink:0;}
/* BOT ROW */
.bot-row{display:grid;grid-template-columns:1fr 290px;gap:10px;}
.profile-panel{background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
.profile-tabs{display:flex;border-bottom:1px solid var(--border);}
.ptab{padding:0 16px;height:40px;display:flex;align-items:center;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.07em;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s;position:relative;top:1px;}
.ptab:hover{color:var(--text);}
.ptab.on{color:var(--rose);border-bottom-color:var(--rose);}
.ptab-content{display:none;padding:16px 18px 20px;}
.ptab-content.on{display:block;}
.tag-group{margin-bottom:13px;}
.tg-label{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.16em;color:var(--muted);text-transform:uppercase;margin-bottom:6px;}
.tags{display:flex;flex-wrap:wrap;gap:5px;}
.tag{padding:5px 11px;border-radius:4px;font-size:11px;border:1px solid var(--border2);background:transparent;color:var(--muted2);cursor:pointer;transition:all 0.12s;font-family:'Space Grotesk',sans-serif;}
.tag:hover{border-color:rgba(240,160,144,0.4);color:var(--rose);}
.tag.on{background:rgba(240,160,144,0.12);border-color:rgba(240,160,144,0.45);color:var(--rose);}
.save-btn{margin-top:12px;padding:10px 22px;background:var(--rose);color:#000;border:none;border-radius:6px;font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;gap:7px;}
.save-btn:hover{background:#ff9080;transform:translateY(-1px);}
.h-item{padding:8px 13px;border-bottom:1px solid var(--border);}
.h-item:last-child{border-bottom:none;}
.h-role{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.1em;text-transform:uppercase;color:var(--rose);margin-bottom:2px;}
.h-text{font-size:11px;color:var(--muted2);line-height:1.5;}
.h-empty{padding:16px 13px;font-size:11px;color:var(--muted);}
/* SIDE COLUMN */
.side-col{display:flex;flex-direction:column;gap:10px;}
/* ── ARIA SPHERE PANEL ── */
.sphere-panel{background:var(--bg2);border:1px solid rgba(240,160,144,0.2);border-radius:10px;overflow:hidden;animation:panelPulse 4s ease-in-out infinite;display:flex;flex-direction:column;}
.sphere-head{padding:10px 13px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
.sphere-head-avi{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,var(--rose),#b05040);display:flex;align-items:center;justify-content:center;font-size:13px;position:relative;flex-shrink:0;}
.sphere-head-ping{position:absolute;bottom:-2px;right:-2px;width:8px;height:8px;border-radius:50%;background:var(--green);border:2px solid var(--bg2);animation:ariaPing 1.4s ease-in-out infinite;}
@keyframes ariaPing{0%,100%{box-shadow:0 0 0 0 rgba(48,232,144,0.6)}60%{box-shadow:0 0 0 5px rgba(48,232,144,0)}}
.sphere-head-name{font-family:'Syne',sans-serif;font-size:12px;font-weight:700;}
.sphere-head-status{font-size:9px;color:var(--green);font-family:'IBM Plex Mono',monospace;}
.sphere-head-btn{margin-left:auto;padding:5px 11px;background:var(--rose);color:#000;border:none;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;font-family:'Space Grotesk',sans-serif;transition:all 0.15s;white-space:nowrap;}
.sphere-head-btn:hover{background:#ff9080;}
/* Sphere orb */
.sphere-orb-wrap{display:flex;align-items:center;justify-content:center;padding:20px 0 10px;position:relative;}
.sphere-orb{width:90px;height:90px;border-radius:50%;position:relative;cursor:pointer;flex-shrink:0;}
.sphere-orb::before{content:'';position:absolute;inset:-12px;border-radius:50%;background:radial-gradient(circle,rgba(193,163,162,0.18) 0%,transparent 70%);animation:orbIdle 3s ease-in-out infinite;}
.sphere-orb::after{content:'';position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,0.28) 0%,transparent 60%),radial-gradient(circle,rgba(193,163,162,0.9) 0%,rgba(157,127,106,0.7) 60%,rgba(100,75,60,0.5) 100%);box-shadow:0 0 28px rgba(193,163,162,0.55),inset 0 -6px 16px rgba(0,0,0,0.28),inset 0 6px 12px rgba(255,255,255,0.12);animation:orbBreath 3s ease-in-out infinite;}
@keyframes orbIdle{0%,100%{transform:scale(1);opacity:0.7}50%{transform:scale(1.12);opacity:1}}
@keyframes orbBreath{0%,100%{transform:scale(1);box-shadow:0 0 28px rgba(193,163,162,0.55)}50%{transform:scale(1.04);box-shadow:0 0 44px rgba(193,163,162,0.9),0 0 70px rgba(193,163,162,0.3)}}
.sphere-orb.speaking::after{animation:orbSpeak 0.5s ease-in-out infinite;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,0.35) 0%,transparent 60%),radial-gradient(circle,rgba(208,208,208,0.95) 0%,rgba(160,160,160,0.8) 60%,rgba(100,100,100,0.5) 100%);}
@keyframes orbSpeak{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
.sphere-label{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:0.14em;text-align:center;margin-bottom:8px;}
.sphere-divider{height:1px;background:var(--border);margin:0 13px;}
/* Mini chat in sphere panel */
.sphere-msgs{flex:1;overflow-y:auto;padding:10px 12px;display:flex;flex-direction:column;gap:6px;max-height:160px;scrollbar-width:thin;scrollbar-color:var(--border) transparent;}
.smsg{display:flex;flex-direction:column;}
.smsg-aria{align-items:flex-start;}
.smsg-user{align-items:flex-end;}
.smsg-bubble{max-width:90%;padding:6px 10px;border-radius:9px;font-size:10px;line-height:1.5;}
.smsg-aria .smsg-bubble{background:var(--bg3);border:1px solid var(--border);color:var(--muted2);border-radius:3px 9px 9px 9px;}
.smsg-user .smsg-bubble{background:rgba(240,160,144,0.15);border:1px solid rgba(240,160,144,0.25);color:var(--text);border-radius:9px 3px 9px 9px;}
.sphere-input-row{display:flex;gap:6px;padding:8px 10px;border-top:1px solid var(--border);}
.sphere-input{flex:1;background:var(--bg3);border:1px solid var(--border2);color:var(--text);font-family:'Space Grotesk',sans-serif;font-size:10px;padding:6px 10px;border-radius:5px;outline:none;transition:border 0.15s;}
.sphere-input::placeholder{color:var(--muted);}
.sphere-input:focus{border-color:rgba(240,160,144,0.4);}
.sphere-send{width:28px;height:28px;border-radius:5px;background:var(--rose);border:none;color:#000;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sphere-send:hover{background:#ff9080;}
.sphere-mic{width:28px;height:28px;border-radius:5px;background:var(--bg3);border:1px solid var(--border2);color:var(--muted2);font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s;}
.sphere-mic:hover{border-color:rgba(240,160,144,0.4);color:var(--rose);}
.sphere-mic.recording{background:rgba(240,80,80,0.2);border-color:rgba(255,80,80,0.6);color:#ff5555;animation:micPulse 0.8s ease-in-out infinite;}
@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,80,80,0.4)}50%{box-shadow:0 0 0 6px rgba(255,80,80,0)}}
.sphere-orb.listening::after{background:radial-gradient(circle at 35% 35%,rgba(255,255,255,0.3) 0%,transparent 60%),radial-gradient(circle,rgba(157,127,106,1) 0%,rgba(120,90,70,0.8) 60%,rgba(80,55,40,0.5) 100%);animation:orbListen 0.6s ease-in-out infinite;}
@keyframes orbListen{0%,100%{transform:scale(1);box-shadow:0 0 28px rgba(157,127,106,0.7)}50%{transform:scale(1.06);box-shadow:0 0 50px rgba(157,127,106,1),0 0 80px rgba(157,127,106,0.4)}}
/* Products panel */
.products-panel{background:var(--bg2);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
.panel-mini-head{height:36px;padding:0 13px;display:flex;align-items:center;border-bottom:1px solid var(--border);}
.pmh-title{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.14em;color:var(--muted);text-transform:uppercase;flex:1;}
.pmh-action{font-size:10px;color:var(--rose);cursor:pointer;background:none;border:none;font-family:'Space Grotesk',sans-serif;font-weight:600;}
.pmh-action:hover{text-shadow:0 0 8px var(--rose-glow);}
.product-row{display:flex;align-items:center;gap:9px;padding:7px 13px;border-bottom:1px solid var(--border);cursor:pointer;transition:all 0.12s;}
.product-row:last-child{border-bottom:none;}
.product-row:hover{background:rgba(255,255,255,0.02);padding-left:16px;}
.pr-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.pr-name{flex:1;font-size:11px;color:var(--muted2);}
.pr-tag{font-family:'IBM Plex Mono',monospace;font-size:8px;padding:2px 7px;border-radius:3px;}
.pr-tag.using{background:rgba(48,232,144,0.1);color:var(--green);}
.pr-tag.try{background:var(--gold-dim);color:var(--gold);}
/* ── PREMIUM PAGES ── */
.ppage{display:none;padding:90px 22px 32px;min-height:100vh;}
.ppage.active{display:block;}
.ppage-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;}
.ppage-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;display:flex;align-items:center;gap:10px;}
.premium-badge{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.15em;background:linear-gradient(135deg,var(--rose),var(--gold));color:#000;padding:3px 8px;border-radius:3px;font-weight:600;}
.ppage-regen{background:rgba(240,160,144,0.12);border:1px solid rgba(240,160,144,0.3);color:var(--rose);font-family:'Space Grotesk',sans-serif;font-size:12px;padding:7px 16px;border-radius:6px;cursor:pointer;transition:all 0.2s;}
.ppage-regen:hover{background:rgba(240,160,144,0.22);border-color:var(--rose);}
.ppage-loading{display:flex;align-items:center;gap:12px;color:var(--muted2);font-size:13px;padding:40px 0;}
.ppage-spinner{width:20px;height:20px;border:2px solid var(--border2);border-top-color:var(--rose);border-radius:50%;animation:spin 0.8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.ppage-empty{color:var(--muted2);font-size:13px;padding:40px 0;text-align:center;line-height:1.6;}
/* Premium gate */
.premium-gate{text-align:center;padding:60px 20px;background:var(--bg2);border:1px solid var(--border2);border-radius:16px;max-width:460px;margin:40px auto;}
.gate-icon{font-size:40px;margin-bottom:16px;}
.gate-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;margin-bottom:10px;}
.gate-desc{color:var(--muted2);font-size:13px;line-height:1.6;margin-bottom:24px;}
.gate-btn{background:linear-gradient(135deg,var(--rose),var(--gold));border:none;color:#000;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;padding:12px 28px;border-radius:8px;cursor:pointer;letter-spacing:0.04em;}
/* Routine */
.routine-tips{background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:16px 18px;margin-bottom:20px;display:flex;gap:12px;flex-wrap:wrap;}
.routine-tip{font-size:12px;color:var(--muted2);background:var(--bg3);border-radius:6px;padding:5px 10px;line-height:1.4;}
.routine-tip::before{content:'✦ ';color:var(--rose);}
.routine-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:20px;}
.rd-card{background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:14px 16px;}
.rd-day{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.15em;color:var(--muted);text-transform:uppercase;margin-bottom:4px;}
.rd-title{font-size:13px;font-weight:600;color:var(--rose);margin-bottom:10px;}
.rd-section{font-size:10px;letter-spacing:0.1em;color:var(--muted);text-transform:uppercase;margin:8px 0 4px;}
.rd-step{font-size:12px;color:var(--muted2);line-height:1.5;padding-left:10px;position:relative;}
.rd-step::before{content:'·';position:absolute;left:0;color:var(--rose);}
.rd-products{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}
.rd-prod-tag{font-size:10px;background:rgba(240,160,144,0.08);border:1px solid rgba(240,160,144,0.18);color:var(--rose);border-radius:4px;padding:2px 7px;}
.routine-products{background:var(--bg2);border:1px solid rgba(224,176,80,0.2);border-radius:12px;padding:16px 18px;}
.routine-products-title{font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;}
.rp-item{font-size:13px;color:var(--text);padding:5px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;}
.rp-item:last-child{border:none;}
.rp-item::before{content:'★';color:var(--gold);font-size:10px;}
/* Progress */
.prog-layout{display:grid;grid-template-columns:1fr 320px;gap:16px;}
@media(max-width:900px){.prog-layout{grid-template-columns:1fr;}}
.prog-chart-panel{background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:20px;}
.prog-chart-head{font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted2);margin-bottom:14px;}
.prog-chart-wrap{position:relative;margin-bottom:16px;}
.prog-chart-labels{display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);margin-top:4px;}
.prog-metric-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.prog-metric{text-align:center;}
.pm-val{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;}
.pm-lbl{font-size:10px;color:var(--muted);margin-top:2px;}
.treatment-log-panel{background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:20px;}
.tl-head{font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted2);margin-bottom:14px;}
.tl-entry{padding:10px 0;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:4px;}
.tl-entry:last-child{border:none;}
.tl-product{font-size:13px;font-weight:600;color:var(--rose);}
.tl-notes{font-size:11px;color:var(--muted2);line-height:1.4;}
.tl-meta{display:flex;justify-content:space-between;align-items:center;}
.tl-stars{color:var(--gold);font-size:11px;letter-spacing:1px;}
.tl-date{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);}
.tl-del{background:none;border:none;color:var(--muted);font-size:10px;cursor:pointer;padding:0;}
.tl-del:hover{color:var(--red);}
/* Photo */
.photo-layout{display:grid;grid-template-columns:300px 1fr;gap:20px;align-items:start;}
@media(max-width:900px){.photo-layout{grid-template-columns:1fr;}}
.photo-upload-panel{background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:20px;}
.photo-drop{border:2px dashed var(--border2);border-radius:12px;padding:32px 20px;text-align:center;cursor:pointer;transition:border-color 0.2s;}
.photo-drop:hover{border-color:rgba(240,160,144,0.4);}
.photo-drop-icon{font-size:32px;margin-bottom:10px;}
.photo-drop-label{font-size:13px;color:var(--text);margin-bottom:4px;}
.photo-drop-sub{font-size:11px;color:var(--muted);}
.photo-result-panel{background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:20px;}
.photo-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;}
.photo-metric{background:var(--bg3);border-radius:8px;padding:12px;text-align:center;}
.phm-label{font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:5px;}
.phm-val{font-size:13px;font-weight:600;color:var(--rose);text-transform:capitalize;}
.photo-score-wrap{margin-bottom:18px;}
.photo-score-label{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted2);margin-bottom:6px;}
.photo-score-bar{background:var(--bg3);border-radius:4px;height:8px;overflow:hidden;margin-bottom:4px;}
.photo-score-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,var(--rose),var(--gold));transition:width 1s;}
.photo-score-num{font-family:'IBM Plex Mono',monospace;font-size:11px;color:var(--muted2);}
.photo-advice{background:rgba(240,160,144,0.06);border-left:2px solid var(--rose);border-radius:0 8px 8px 0;padding:12px 14px;font-size:12px;color:var(--text);line-height:1.6;margin-bottom:14px;}
.photo-obs-title,.photo-recs-title,.photo-history-label{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin:12px 0 6px;}
.photo-obs-item{font-size:12px;color:var(--muted2);padding:3px 0 3px 12px;position:relative;}
.photo-obs-item::before{content:'·';position:absolute;left:0;color:var(--gold);}
.photo-rec-tag{display:inline-block;background:rgba(96,168,255,0.1);border:1px solid rgba(96,168,255,0.2);color:var(--blue);font-size:11px;border-radius:5px;padding:3px 9px;margin:2px;}
.photo-hist-item{font-size:11px;color:var(--muted2);padding:4px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;}
/* Modal */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:500;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);}
.modal-box{background:var(--bg2);border:1px solid var(--border2);border-radius:16px;padding:24px;width:min(420px,90vw);}
.modal-title{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;margin-bottom:16px;}
.modal-input{width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:'Space Grotesk',sans-serif;font-size:13px;padding:9px 12px;margin-bottom:10px;resize:vertical;}
.modal-input:focus{outline:none;border-color:rgba(240,160,144,0.4);}
.modal-rating{margin-bottom:4px;}
.modal-rating-label{font-size:11px;color:var(--muted2);margin-bottom:6px;}
.modal-stars span{font-size:22px;cursor:pointer;color:var(--border2);transition:color 0.15s;}
.modal-stars span.lit{color:var(--gold);}
.modal-save{flex:1;background:var(--rose);border:none;color:#000;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;padding:10px;border-radius:8px;cursor:pointer;}
.modal-cancel{background:var(--bg3);border:1px solid var(--border2);color:var(--muted2);font-family:'Space Grotesk',sans-serif;font-size:13px;padding:10px 16px;border-radius:8px;cursor:pointer;}
.toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(60px);background:var(--bg3);border:1px solid rgba(240,160,144,0.3);color:var(--text);padding:9px 18px;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:11px;transition:transform 0.3s;z-index:999;}
.toast.show{transform:translateX(-50%) translateY(0);}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.fu{opacity:0;animation:fadeUp 0.45s forwards;}
.fu1{animation-delay:0.04s}.fu2{animation-delay:0.09s}.fu3{animation-delay:0.14s}.fu4{animation-delay:0.19s}.fu5{animation-delay:0.24s}
@keyframes numFlash{0%{color:var(--text)}40%{color:#fff;text-shadow:0 0 25px rgba(255,255,255,0.9)}100%{color:var(--text)}}
.flash{animation:numFlash 0.5s ease-out !important;}
@media(max-width:1280px){.top-row{grid-template-columns:230px 1fr 230px}.mid-row{grid-template-columns:1fr 1fr 1fr}.mid-row .action-panel{grid-column:1/-1;flex-direction:row;flex-wrap:wrap;gap:8px}}
@media(max-width:900px){.top-row{grid-template-columns:1fr}.mid-row{grid-template-columns:1fr 1fr}.bot-row{grid-template-columns:1fr}}
</style>
</head><body>

<div class="ticker-wrap">
  <div class="ticker-label">ARIA LIVE</div>
  <div class="ticker-scroll"><div class="ticker-track" id="ticker"></div></div>
</div>

<nav class="nav">
  <div class="nav-logo"><div class="nav-logo-dot"></div>SupportRD</div>
  <div class="nav-tabs">
    <div class="nav-tab active" onclick="switchPTab('overview')">Overview</div>
    <div class="nav-tab" onclick="switchPTab('profile')">Hair Profile</div>
    <div class="nav-tab" onclick="switchPTab('routine')">✦ Routine</div>
    <div class="nav-tab" onclick="switchPTab('progress')">✦ Progress</div>
    <div class="nav-tab" onclick="switchPTab('photo')">✦ Photo AI</div>
    <div class="nav-tab" onclick="switchPTab('whatsapp')">✦ Aria SMS</div>
  </div>
  <div class="nav-right">
    <div class="live-badge"><div class="live-dot"></div>LIVE</div>
    <span class="nav-name" id="nav-name">—</span>
    <div class="plan-tag" id="plan-badge">FREE</div>
    <div class="nav-avatar" id="nav-av">?</div>
    <button class="logout-btn" onclick="doLogout()">Sign out</button>
  </div>
</nav>

<div class="app">

<!-- TOP ROW -->
<div class="top-row">
  <div class="score-panel fu fu1">
    <div class="sp-label">Hair Health Index</div>
    <div class="score-ring-wrap">
      <svg class="score-svg" viewBox="0 0 148 148">
        <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f0a090"/><stop offset="50%" stop-color="#e0b050"/><stop offset="100%" stop-color="#60a8ff"/>
        </linearGradient></defs>
        <circle class="score-bg-c" cx="74" cy="74" r="65"/>
        <circle class="score-fill-c" id="score-ring" cx="74" cy="74" r="65" stroke="url(#rg)"/>
      </svg>
      <div class="score-center">
        <div class="score-big" id="score-num">0</div>
        <div class="score-unit">/ 100</div>
      </div>
    </div>
    <div class="score-status" id="score-status" style="color:var(--muted2)">—</div>
    <div class="score-delta" id="score-delta">Complete your profile to score</div>
    <div class="metric-rows">
      <div class="mr"><div class="mr-lbl">Moisture</div><div class="mr-track"><div class="mr-fill" id="mf-m" style="background:var(--rose)"></div></div><div class="mr-val" id="mv-m" style="color:var(--rose)">—</div></div>
      <div class="mr"><div class="mr-lbl">Strength</div><div class="mr-track"><div class="mr-fill" id="mf-s" style="background:var(--blue)"></div></div><div class="mr-val" id="mv-s" style="color:var(--blue)">—</div></div>
      <div class="mr"><div class="mr-lbl">Scalp</div><div class="mr-track"><div class="mr-fill" id="mf-sc" style="background:var(--green)"></div></div><div class="mr-val" id="mv-sc" style="color:var(--green)">—</div></div>
      <div class="mr"><div class="mr-lbl">Growth</div><div class="mr-track"><div class="mr-fill" id="mf-g" style="background:var(--gold)"></div></div><div class="mr-val" id="mv-g" style="color:var(--gold)">—</div></div>
    </div>
  </div>

  <div class="main-panel fu fu2">
    <div class="panel-head">
      <div class="ph-title">Health Trend</div>
      <div class="time-tabs">
        <div class="tt on" onclick="setRange(this,7)">7D</div>
        <div class="tt" onclick="setRange(this,14)">14D</div>
        <div class="tt" onclick="setRange(this,30)">30D</div>
      </div>
    </div>
    <div class="chart-area">
      <div class="chart-row"><div class="chart-meta"><div class="chart-name">MOISTURE INDEX</div><div class="chart-reading" id="cr-m" style="color:var(--rose)">—</div></div><div class="sparkline-wrap"><svg class="sparkline-svg" id="sp-m" viewBox="0 0 400 36" preserveAspectRatio="none"></svg></div></div>
      <div class="chart-row"><div class="chart-meta"><div class="chart-name">STRENGTH INDEX</div><div class="chart-reading" id="cr-s" style="color:var(--blue)">—</div></div><div class="sparkline-wrap"><svg class="sparkline-svg" id="sp-s" viewBox="0 0 400 36" preserveAspectRatio="none"></svg></div></div>
      <div class="chart-row"><div class="chart-meta"><div class="chart-name">SCALP HEALTH</div><div class="chart-reading" id="cr-sc" style="color:var(--green)">—</div></div><div class="sparkline-wrap"><svg class="sparkline-svg" id="sp-sc" viewBox="0 0 400 36" preserveAspectRatio="none"></svg></div></div>
      <div class="chart-row"><div class="chart-meta"><div class="chart-name">GROWTH RATE</div><div class="chart-reading" id="cr-g" style="color:var(--gold)">—</div></div><div class="sparkline-wrap"><svg class="sparkline-svg" id="sp-g" viewBox="0 0 400 36" preserveAspectRatio="none"></svg></div></div>
    </div>
  </div>

  <div class="insights-panel fu fu3">
    <div class="ins-head"><div class="ins-title">+INSIGHTS</div><div class="ins-live"><div class="live-dot" style="width:4px;height:4px;margin:0"></div>COMMUNITY</div></div>
    <div class="ins-body">
      <div class="ins-section-label">Sentiment Index</div>
      <div class="ins-item">
        <div class="ins-item-label"><span>Moisture focus</span><span style="color:var(--rose)" id="ins-moist-pct">68%</span></div>
        <div class="ins-bar-wrap"><div class="ins-bar-a" id="ins-bar-m" style="width:68%"></div><div class="ins-bar-b" id="ins-bar-mb" style="width:32%"></div></div>
        <div class="ins-legend"><div class="ins-l-item"><div class="ins-dot" style="background:var(--rose)"></div>Treating</div><div class="ins-l-item"><div class="ins-dot" style="background:var(--blue)"></div>Monitoring</div></div>
      </div>
      <div class="ins-item">
        <div class="ins-item-label"><span>Growth focus</span><span style="color:var(--gold)" id="ins-growth-pct">54%</span></div>
        <div class="ins-bar-wrap"><div class="ins-bar-a" id="ins-bar-g" style="width:54%;background:var(--gold)"></div><div class="ins-bar-b" id="ins-bar-gb" style="width:46%;background:var(--purple)"></div></div>
        <div class="ins-legend"><div class="ins-l-item"><div class="ins-dot" style="background:var(--gold)"></div>Active</div><div class="ins-l-item"><div class="ins-dot" style="background:var(--purple)"></div>Maintenance</div></div>
      </div>
      <div class="ins-divider"></div>
      <div class="ins-section-label">Trending This Week</div>
      <div class="community-stat" id="trend-0"><div class="cs-label">Gotero Rapido</div><div><span class="cs-val" style="color:var(--green)">+34%</span> <span style="font-family:IBM Plex Mono,monospace;font-size:9px;color:var(--green)">↑</span></div></div>
      <div class="community-stat" id="trend-1"><div class="cs-label">Mascarilla Capilar</div><div><span class="cs-val" style="color:var(--green)">+21%</span> <span style="font-family:IBM Plex Mono,monospace;font-size:9px;color:var(--green)">↑</span></div></div>
      <div class="community-stat" id="trend-2"><div class="cs-label">Scalp concerns</div><div><span class="cs-val" style="color:var(--rose)">-18%</span> <span style="font-family:IBM Plex Mono,monospace;font-size:9px;color:var(--rose)">improving</span></div></div>
      <div class="ins-divider"></div>
      <div class="ins-section-label">Active Now</div>
      <div id="active-count">—</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px;">consulting with Aria</div>
    </div>
  </div>
</div>

<!-- MID ROW -->
<div class="mid-row">
  <div class="stat-card fu fu2" onclick="activateStat(this)">
    <div class="sc-eye">Consultations</div>
    <div class="sc-val" id="st-chats">0</div>
    <div class="sc-name">Sessions with Aria</div>
    <div class="sc-trend" id="st-chats-trend" style="color:var(--green)">—</div>
    <div class="sc-spark"><svg width="100%" height="26" viewBox="0 0 120 26" preserveAspectRatio="none" id="spark-chats"></svg></div>
  </div>
  <div class="stat-card active fu fu2" onclick="activateStat(this)">
    <div class="sc-eye">Recommendations</div>
    <div class="sc-val" id="st-recs">0</div>
    <div class="sc-name">Product suggestions</div>
    <div class="sc-trend" style="color:var(--gold)">↑ this week</div>
    <div class="sc-spark"><svg width="100%" height="26" viewBox="0 0 120 26" preserveAspectRatio="none" id="spark-recs"></svg></div>
  </div>
  <div class="stat-card fu fu3" onclick="activateStat(this)">
    <div class="sc-eye">Concerns Logged</div>
    <div class="sc-val" id="st-concerns">0</div>
    <div class="sc-name">Tracked conditions</div>
    <div class="sc-trend" style="color:var(--rose)">↑ improving</div>
    <div class="sc-spark"><svg width="100%" height="26" viewBox="0 0 120 26" preserveAspectRatio="none" id="spark-concerns"></svg></div>
  </div>
  <div class="action-panel fu fu4">
    <div class="ap-title">Quick Actions</div>
    <button class="action-btn primary" onclick="window.location.href='/'"><span class="ab-icon">💬</span>Ask Aria Now</button>
    <button class="action-btn secondary" onclick="switchPTab('profile')"><span class="ab-icon">✦</span>Update Profile</button>
    <button class="action-btn secondary" onclick="window.open('https://supportrd.com/collections/all','_blank')"><span class="ab-icon">🛍</span>Shop Products</button>
    <button class="action-btn secondary" onclick="window.open('https://supportrd.com/blogs/news','_blank')"><span class="ab-icon">📖</span>Hair Tips Blog</button>
  </div>
</div>

<!-- BOT ROW -->
<div class="bot-row">
  <div class="profile-panel fu fu3">
    <div class="profile-tabs">
      <div class="ptab on" id="pt-profile" onclick="switchPTab('profile')">Hair Profile</div>
      <div class="ptab" id="pt-history" onclick="switchPTab('history')">Chat History</div>
      <div class="ptab" id="pt-aria" onclick="window.location.href='/'" style="margin-left:auto">→ Voice Mode</div>
    </div>
    <div class="ptab-content on" id="pc-profile">
      <div class="tag-group"><div class="tg-label">Hair Type</div><div class="tags" id="tags-type">
        <div class="tag" onclick="toggleTag(this,'type')">Straight</div>
        <div class="tag" onclick="toggleTag(this,'type')">Wavy</div>
        <div class="tag" onclick="toggleTag(this,'type')">Curly</div>
        <div class="tag" onclick="toggleTag(this,'type')">Coily</div>
        <div class="tag" onclick="toggleTag(this,'type')">Fine</div>
        <div class="tag" onclick="toggleTag(this,'type')">Thick</div>
        <div class="tag" onclick="toggleTag(this,'type')">Dry / Brittle</div>
      </div></div>
      <div class="tag-group"><div class="tg-label">Main Concerns</div><div class="tags" id="tags-concerns">
        <div class="tag" onclick="toggleTag(this,'concerns')">Frizz</div>
        <div class="tag" onclick="toggleTag(this,'concerns')">Damaged</div>
        <div class="tag" onclick="toggleTag(this,'concerns')">Breakage</div>
        <div class="tag" onclick="toggleTag(this,'concerns')">Hair Loss</div>
        <div class="tag" onclick="toggleTag(this,'concerns')">Thinning</div>
        <div class="tag" onclick="toggleTag(this,'concerns')">Oily Scalp</div>
        <div class="tag" onclick="toggleTag(this,'concerns')">Dandruff</div>
        <div class="tag" onclick="toggleTag(this,'concerns')">Split Ends</div>
        <div class="tag" onclick="toggleTag(this,'concerns')">Slow Growth</div>
      </div></div>
      <div class="tag-group"><div class="tg-label">Chemical Treatments</div><div class="tags" id="tags-treatments">
        <div class="tag" onclick="toggleTag(this,'treatments')">None / Natural</div>
        <div class="tag" onclick="toggleTag(this,'treatments')">Relaxer</div>
        <div class="tag" onclick="toggleTag(this,'treatments')">Bleach</div>
        <div class="tag" onclick="toggleTag(this,'treatments')">Hair Color</div>
        <div class="tag" onclick="toggleTag(this,'treatments')">Keratin</div>
        <div class="tag" onclick="toggleTag(this,'treatments')">Perm / Wave</div>
      </div></div>
      <div class="tag-group"><div class="tg-label">Products I Use</div><div class="tags" id="tags-products">
        <div class="tag" onclick="toggleTag(this,'products')">Formula Exclusiva</div>
        <div class="tag" onclick="toggleTag(this,'products')">Laciador Crece</div>
        <div class="tag" onclick="toggleTag(this,'products')">Gotero Rapido</div>
        <div class="tag" onclick="toggleTag(this,'products')">Gotitas Brillantes</div>
        <div class="tag" onclick="toggleTag(this,'products')">Mascarilla Capilar</div>
        <div class="tag" onclick="toggleTag(this,'products')">Shampoo Aloe Vera</div>
      </div></div>
      <button class="save-btn" onclick="saveProfile()">✦ Save & Update Score</button>
    </div>
    <div class="ptab-content" id="pc-history">
      <div id="history-list"><div class="h-empty">Loading…</div></div>
      <button onclick="clearHistory()" style="margin-top:8px;background:none;border:none;font-size:10px;color:var(--muted);cursor:pointer;font-family:'Space Grotesk',sans-serif;padding:4px 0;" onmouseover="this.style.color='var(--rose)'" onmouseout="this.style.color='var(--muted)'">Clear history →</button>
    </div>
  </div>

  <div class="side-col">
    <!-- ── ARIA SPHERE (replaces streak panel) ── -->
    <div class="sphere-panel fu fu4">
      <div class="sphere-head">
        <div class="sphere-head-avi">🌿<div class="sphere-head-ping"></div></div>
        <div>
          <div class="sphere-head-name">Aria</div>
          <div class="sphere-head-status" id="sphere-status-lbl">Online · AI Advisor</div>
        </div>
        <button class="sphere-head-btn" onclick="window.location.href='/'">Full Screen →</button>
      </div>
      <div class="sphere-orb-wrap">
        <div class="sphere-orb" id="sphere-orb" onclick="sphereOrbTap()" title="Tap to speak"></div>
      </div>
      <div class="sphere-label" id="sphere-hint">Tap sphere to speak · or type below</div>
      <div class="sphere-divider"></div>
      <div class="sphere-msgs" id="sphere-msgs">
        <div class="smsg smsg-aria"><div class="smsg-bubble">Hi! I'm Aria 🌿 What's your hair doing today?</div></div>
      </div>
      <div class="sphere-input-row">
        <button class="sphere-mic" id="sphere-mic" onclick="sphereOrbTap()" title="Hold to speak">🎤</button>
        <input type="text" class="sphere-input" id="sphere-input" placeholder="Ask Aria…" onkeydown="if(event.key==='Enter')sphereSend()">
        <button class="sphere-send" onclick="sphereSend()">↑</button>
      </div>
    </div>

    <!-- Products panel -->
    <div class="products-panel fu fu5">
      <div class="panel-mini-head"><div class="pmh-title">My Products</div><button class="pmh-action" onclick="window.open('https://supportrd.com/collections/all','_blank')">Shop →</button></div>
      <div class="product-row" onclick="window.open('https://supportrd.com/collections/all','_blank')"><div class="pr-dot" style="background:var(--rose)"></div><div class="pr-name">Formula Exclusiva</div><div class="pr-tag using">Using</div></div>
      <div class="product-row" onclick="window.open('https://supportrd.com/collections/all','_blank')"><div class="pr-dot" style="background:var(--gold)"></div><div class="pr-name">Gotero Rapido</div><div class="pr-tag using">Using</div></div>
      <div class="product-row" onclick="window.open('https://supportrd.com/collections/all','_blank')"><div class="pr-dot" style="background:var(--green)"></div><div class="pr-name">Mascarilla Capilar</div><div class="pr-tag try">Try Next</div></div>
      <div class="product-row" onclick="window.open('https://supportrd.com/collections/all','_blank')"><div class="pr-dot" style="background:var(--blue)"></div><div class="pr-name">Laciador Crece</div><div class="pr-tag try">Recommended</div></div>
    </div>
  </div>
</div>
</div>

<!-- ═══════════════ PREMIUM FULL-PAGE PANELS ═══════════════ -->

<!-- ✦ SMART ROUTINE BUILDER -->
<div class="ppage" id="pp-routine">
  <div class="ppage-head">
    <div class="ppage-title">✦ Smart Routine Builder <span class="premium-badge">PREMIUM</span></div>
    <button class="ppage-regen" id="routine-regen-btn" onclick="generateRoutine()">⟳ Generate My Routine</button>
  </div>
  <div id="routine-gate" class="premium-gate" style="display:none">
    <div class="gate-icon">✦</div>
    <div class="gate-title">Smart Routine Builder</div>
    <div class="gate-desc">Aria builds your personalized 7-day hair care schedule based on your hair type, concerns, and products. Tap to unlock.</div>
    <button class="gate-btn" onclick="showUpgradeModal('Smart Routine Builder')">Unlock Premium →</button>
  </div>
  <div id="routine-loading" class="ppage-loading" style="display:none">
    <div class="ppage-spinner"></div><div>Aria is crafting your routine…</div>
  </div>
  <div id="routine-content" style="display:none">
    <div class="routine-tips" id="routine-tips"></div>
    <div class="routine-grid" id="routine-grid"></div>
    <div class="routine-products" id="routine-products"></div>
  </div>
  <div id="routine-empty" class="ppage-empty">
    <div>Fill in your <strong>Hair Profile</strong> first, then tap <em>Generate My Routine</em> above.</div>
  </div>
</div>

<!-- ✦ PROGRESS TRACKER (Score History + Treatment Log) -->
<div class="ppage" id="pp-progress">
  <div class="ppage-head">
    <div class="ppage-title">✦ Progress Tracker <span class="premium-badge">PREMIUM</span></div>
    <button class="ppage-regen" onclick="openLogModal()">+ Log Treatment</button>
  </div>
  <div id="progress-gate" class="premium-gate" style="display:none">
    <div class="gate-icon">📈</div>
    <div class="gate-title">Hair Health Timeline</div>
    <div class="gate-desc">Track your score over 30, 60, 90 days. Log treatments and see what products are actually working for your hair.</div>
    <button class="gate-btn" onclick="showUpgradeModal('Hair Health Timeline')">Unlock Premium →</button>
  </div>
  <div id="progress-content" style="display:none">
    <div class="prog-layout">
      <div class="prog-chart-panel">
        <div class="prog-chart-head">Hair Health Score — Last 90 Days</div>
        <div class="prog-chart-wrap">
          <svg id="score-history-svg" width="100%" height="160" viewBox="0 0 600 160" preserveAspectRatio="none"></svg>
          <div class="prog-chart-labels" id="prog-chart-labels"></div>
        </div>
        <div class="prog-metric-row">
          <div class="prog-metric"><div class="pm-val" id="ph-avg" style="color:var(--rose)">—</div><div class="pm-lbl">Avg Score</div></div>
          <div class="prog-metric"><div class="pm-val" id="ph-best" style="color:var(--green)">—</div><div class="pm-lbl">Best Score</div></div>
          <div class="prog-metric"><div class="pm-val" id="ph-trend" style="color:var(--gold)">—</div><div class="pm-lbl">30-Day Trend</div></div>
          <div class="prog-metric"><div class="pm-val" id="ph-entries" style="color:var(--blue)">—</div><div class="pm-lbl">Entries</div></div>
        </div>
      </div>
      <div class="treatment-log-panel">
        <div class="tl-head">Treatment Log</div>
        <div class="tl-list" id="treatment-list"><div class="h-empty">No treatments logged yet.</div></div>
      </div>
    </div>
  </div>
</div>

<!-- ✦ PHOTO HAIR ANALYSIS -->
<div class="ppage" id="pp-photo">
  <div class="ppage-head">
    <div class="ppage-title">✦ Photo Hair Analysis <span class="premium-badge">PREMIUM</span></div>
  </div>
  <div id="photo-gate" class="premium-gate" style="display:none">
    <div class="gate-icon">📸</div>
    <div class="gate-title">AI Photo Analysis</div>
    <div class="gate-desc">Upload a selfie and Aria diagnoses your hair's porosity, damage level, density, and texture — then recommends the perfect products.</div>
    <button class="gate-btn" onclick="showUpgradeModal('AI Photo Analysis')">Unlock Premium →</button>
  </div>
  <div id="photo-content" style="display:none">
    <div class="photo-layout">
      <div class="photo-upload-panel">
        <div class="photo-drop" id="photo-drop" onclick="document.getElementById('photo-file').click()">
          <div class="photo-drop-icon">📸</div>
          <div class="photo-drop-label">Tap to upload a hair photo</div>
          <div class="photo-drop-sub">JPG or PNG · max 5MB</div>
          <img id="photo-preview" style="display:none;max-width:100%;max-height:220px;border-radius:12px;margin-top:12px;object-fit:cover;">
        </div>
        <input type="file" id="photo-file" accept="image/*" style="display:none" onchange="onPhotoSelected(event)">
        <button class="ppage-regen" id="photo-analyze-btn" style="width:100%;margin-top:12px;display:none" onclick="analyzePhoto()">🔍 Analyze My Hair</button>
        <div id="photo-loading" class="ppage-loading" style="display:none">
          <div class="ppage-spinner"></div><div>Aria is analyzing your hair…</div>
        </div>
      </div>
      <div class="photo-result-panel" id="photo-result" style="display:none">
        <div class="photo-metrics">
          <div class="photo-metric"><div class="phm-label">Porosity</div><div class="phm-val" id="pa-porosity">—</div></div>
          <div class="photo-metric"><div class="phm-label">Damage</div><div class="phm-val" id="pa-damage">—</div></div>
          <div class="photo-metric"><div class="phm-label">Density</div><div class="phm-val" id="pa-density">—</div></div>
          <div class="photo-metric"><div class="phm-label">Texture</div><div class="phm-val" id="pa-texture">—</div></div>
        </div>
        <div class="photo-score-wrap">
          <div class="photo-score-label">Overall Hair Health</div>
          <div class="photo-score-bar"><div class="photo-score-fill" id="pa-score-fill"></div></div>
          <div class="photo-score-num" id="pa-score-num">—</div>
        </div>
        <div class="photo-advice" id="pa-advice"></div>
        <div class="photo-obs" id="pa-obs"></div>
        <div class="photo-recs" id="pa-recs"></div>
        <div class="photo-history-label">Past Analyses</div>
        <div class="photo-history-list" id="photo-history-list"></div>
      </div>
    </div>
  </div>
</div>

<!-- ✦ WHATSAPP / SMS ARIA -->
<div class="ppage" id="pp-whatsapp">
  <div class="ppage-head">
    <div class="ppage-title">✦ Aria on WhatsApp &amp; SMS <span class="premium-badge">PREMIUM</span></div>
  </div>
  <div id="whatsapp-gate" class="premium-gate" style="display:none">
    <div class="gate-icon">💬</div>
    <div class="gate-title">Text Aria Directly</div>
    <div class="gate-desc">Premium members can text Aria on WhatsApp or SMS and get personalized hair advice anytime, anywhere.</div>
    <button class="gate-btn" onclick="showUpgradeModal('Aria on WhatsApp & SMS')">Unlock Premium →</button>
  </div>
  <div id="whatsapp-content" style="display:none">
    <div style="max-width:500px;margin:0 auto;">

      <!-- WhatsApp card -->
      <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:44px;height:44px;background:#25d366;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">💬</div>
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;">WhatsApp Aria</div>
            <div style="font-size:12px;color:var(--muted2);">Chat directly on WhatsApp</div>
          </div>
        </div>
        <a href="https://wa.me/18005551234" target="_blank"
           style="display:block;text-align:center;padding:12px;background:#25d366;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;border-radius:10px;text-decoration:none;margin-bottom:10px;">
          Open WhatsApp Chat →
        </a>
        <div style="font-size:11px;color:var(--muted);text-align:center;">Send any message to start your session with Aria</div>
      </div>

      <!-- SMS card -->
      <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:16px;padding:24px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:44px;height:44px;background:var(--rose);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">📱</div>
          <div>
            <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;">SMS Aria</div>
            <div style="font-size:12px;color:var(--muted2);">Text Aria from any phone</div>
          </div>
        </div>
        <div style="font-size:13px;color:var(--text);text-align:center;background:var(--bg3);border-radius:10px;padding:14px;letter-spacing:0.05em;font-family:'IBM Plex Mono',monospace;" id="sms-number-display">Loading…</div>
        <div style="font-size:11px;color:var(--muted);text-align:center;margin-top:8px;">Text any hair question to this number</div>
      </div>

      <!-- Link phone number -->
      <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:16px;padding:24px;">
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:14px;margin-bottom:6px;">🔗 Link Your Phone Number</div>
        <div style="font-size:12px;color:var(--muted2);margin-bottom:14px;line-height:1.6;">Link your number so Aria remembers your hair profile and history when you text her.</div>
        <div style="display:flex;gap:8px;">
          <input id="phone-link-input" type="tel" placeholder="+1 (829) 233-2670"
            style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:'Space Grotesk',sans-serif;font-size:13px;padding:10px 12px;outline:none;">
          <button onclick="linkPhone()" id="link-phone-btn"
            style="background:var(--rose);border:none;color:#000;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;padding:10px 16px;border-radius:8px;cursor:pointer;white-space:nowrap;">
            Link
          </button>
        </div>
        <div id="phone-link-msg" style="font-size:11px;margin-top:8px;min-height:14px;"></div>
      </div>

    </div>
  </div>
</div>

<!-- LOG TREATMENT MODAL -->
<div class="modal-bg" id="log-modal" style="display:none" onclick="if(event.target===this)closeLogModal()">
  <div class="modal-box">
    <div class="modal-title">Log a Treatment</div>
    <select class="modal-input" id="log-product">
      <option value="">Select product…</option>
      <option>Formula Exclusiva</option><option>Laciador Crece</option>
      <option>Gotero Rapido</option><option>Gotitas Brillantes</option>
      <option>Mascarilla Capilar</option><option>Shampoo Aloe Vera</option>
    </select>
    <textarea class="modal-input" id="log-notes" rows="3" placeholder="Notes — how did your hair feel? Any changes?"></textarea>
    <div class="modal-rating">
      <div class="modal-rating-label">How did it work?</div>
      <div class="modal-stars" id="modal-stars">
        <span onclick="setLogRating(1)">★</span><span onclick="setLogRating(2)">★</span>
        <span onclick="setLogRating(3)">★</span><span onclick="setLogRating(4)">★</span><span onclick="setLogRating(5)">★</span>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="modal-save" onclick="saveLog()">Save Entry</button>
      <button class="modal-cancel" onclick="closeLogModal()">Cancel</button>
    </div>
  </div>
</div>

<!-- UPGRADE MODAL — Shopify Checkout -->
<div class="modal-bg" id="upgrade-modal" style="display:none" onclick="if(event.target===this)closeUpgradeModal()">
  <div class="modal-box" style="padding:0;overflow:hidden;max-width:460px;width:min(460px,94vw);">

    <!-- Header band -->
    <div style="background:linear-gradient(135deg,#c1a3a2,#d4a85a);padding:20px 24px 16px;text-align:center;position:relative;">
      <button onclick="closeUpgradeModal()" style="position:absolute;top:12px;right:14px;background:rgba(0,0,0,0.2);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:14px;line-height:26px;">✕</button>
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.8);margin-bottom:4px;">SupportRD</div>
      <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:700;color:#fff;" id="upgrade-modal-title">Hair Advisor Premium</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:4px;">Powered by Aria · Your AI Hair Expert</div>
    </div>

    <!-- Body -->
    <div style="padding:20px 24px;">

      <!-- Price row -->
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:4px;">
        <span style="font-family:'Syne',sans-serif;font-size:28px;font-weight:700;color:var(--rose);">$35</span>
        <span style="font-size:13px;color:var(--muted2);">/ month</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:16px;">Billed monthly · Cancel anytime from your account</div>

      <!-- Feature list -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text);background:var(--bg3);border-radius:8px;padding:8px 10px;">
          <span style="color:var(--rose);font-size:14px;">✦</span>Smart Routine Builder
        </div>
        <div style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text);background:var(--bg3);border-radius:8px;padding:8px 10px;">
          <span style="color:var(--rose);font-size:14px;">📈</span>Score Timeline
        </div>
        <div style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text);background:var(--bg3);border-radius:8px;padding:8px 10px;">
          <span style="color:var(--rose);font-size:14px;">📸</span>AI Photo Analysis
        </div>
        <div style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text);background:var(--bg3);border-radius:8px;padding:8px 10px;">
          <span style="color:var(--rose);font-size:14px;">💬</span>Unlimited Aria Sessions
        </div>
        <div style="display:flex;align-items:center;gap:7px;font-size:12px;color:var(--text);background:var(--bg3);border-radius:8px;padding:8px 10px;grid-column:span 2;">
          <span style="color:var(--gold);font-size:14px;">📋</span>Treatment Log &amp; Product Tracking
        </div>
      </div>

      <!-- Shopify Buy Button -->
      <a href="https://supportrd.com/products/hair-advisor-premium" target="_blank"
         onclick="closeUpgradeModal()"
         style="display:block;width:100%;padding:14px;background:linear-gradient(135deg,#c1a3a2,#d4a85a);border:none;border-radius:10px;color:#000;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;cursor:pointer;letter-spacing:0.05em;text-align:center;text-decoration:none;margin-bottom:10px;box-sizing:border-box;">
        Buy on SupportRD.com →
      </a>

      <!-- Already purchased? activate -->
      <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px;">
        <div style="font-size:11px;color:var(--muted2);text-align:center;margin-bottom:8px;">Already purchased? Activate your account below.</div>
        <div style="display:flex;gap:8px;">
          <input id="activate-email-modal" type="email" placeholder="Email used at checkout"
            style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:'Space Grotesk',sans-serif;font-size:12px;padding:9px 12px;outline:none;">
          <button onclick="activateFromModal()" id="activate-modal-btn"
            style="background:var(--bg3);border:1px solid var(--border2);color:var(--text);font-family:'Syne',sans-serif;font-size:12px;font-weight:600;padding:9px 14px;border-radius:8px;cursor:pointer;white-space:nowrap;">
            Activate
          </button>
        </div>
        <div id="activate-modal-msg" style="font-size:11px;margin-top:7px;text-align:center;min-height:14px;"></div>
      </div>

    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const token = localStorage.getItem('srd_token');
if (!token) { window.location.href = '/login'; }

// ── UPGRADE MODAL ──
function showUpgradeModal(featureName){
  const titles={
    'Smart Routine Builder':'Unlock Your Personal Routine',
    'Hair Health Timeline':'Track Your Hair Journey',
    'AI Photo Analysis':'Unlock AI Photo Analysis'
  };
  document.getElementById('upgrade-modal-title').textContent=titles[featureName]||'Hair Advisor Premium';
  document.getElementById('activate-modal-msg').textContent='';
  document.getElementById('activate-email-modal').value='';
  try{const u=JSON.parse(localStorage.getItem('srd_user')||'{}');if(u.email)document.getElementById('activate-email-modal').value=u.email;}catch(e){}
  document.getElementById('upgrade-modal').style.display='flex';
}
function closeUpgradeModal(){
  document.getElementById('upgrade-modal').style.display='none';
}
async function activateFromModal(){
  const email=document.getElementById('activate-email-modal').value.trim();
  const btn=document.getElementById('activate-modal-btn');
  const msg=document.getElementById('activate-modal-msg');
  if(!email){msg.style.color='#e08080';msg.textContent='Please enter your email.';return;}
  btn.disabled=true;btn.textContent='Checking…';msg.textContent='';
  try{
    const r=await fetch('/api/subscription/activate-shopify',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify({email})});
    const d=await r.json();
    if(d.ok){
      msg.style.color='#80e0a0';msg.textContent='✓ Premium activated! Reloading…';
      try{const u=JSON.parse(localStorage.getItem('srd_user')||'{}');u.plan='premium';localStorage.setItem('srd_user',JSON.stringify(u));}catch(e){}
      setTimeout(()=>{closeUpgradeModal();location.reload();},1200);
    }else{
      msg.style.color='#e08080';
      msg.textContent=d.error||'No purchase found. Please buy at supportrd.com first.';
      btn.disabled=false;btn.textContent='Activate';
    }
  }catch(e){msg.style.color='#e08080';msg.textContent='Network error. Try again.';btn.disabled=false;btn.textContent='Activate';}
}

// ── TICKER ──
const TDATA = [
  {n:'MOISTURE',c:'var(--rose)'},{n:'STRENGTH',c:'var(--blue)'},
  {n:'SCALP',c:'var(--green)'},{n:'GROWTH',c:'var(--gold)'},
  {n:'ARIA STATUS',v:'ONLINE',c:'var(--green)',s:1},{n:'FORMULA EXCLUSIVA',v:'$55',c:'var(--rose)',s:1},
  {n:'GOTERO RAPIDO',v:'$55',c:'var(--gold)',s:1},{n:'MASCARILLA',v:'$25',c:'var(--rose)',s:1},
  {n:'LACIADOR CRECE',v:'$40',c:'var(--blue)',s:1},{n:'GOTITAS',v:'$30',c:'var(--purple)',s:1}
];
let _scores = null;

function buildTicker(sc) {
  const wrap = document.getElementById('ticker');
  wrap.innerHTML = '';
  const items = [...TDATA,...TDATA];
  items.forEach(item => {
    const d = document.createElement('div');
    d.className = 'ticker-item';
    let v = item.v;
    let chg = '';
    if (!item.s && sc) {
      if (item.n==='MOISTURE') v=sc.moisture+'%';
      if (item.n==='STRENGTH') v=sc.strength+'%';
      if (item.n==='SCALP') v=sc.scalp+'%';
      if (item.n==='GROWTH') v=sc.growth+'%';
      const delta = Math.round((Math.random()-0.4)*6);
      chg = '<span class="t-chg '+(delta>=0?'t-up':'t-down')+'">'+(delta>=0?'+':'')+delta+'</span>';
    }
    d.innerHTML='<span class="t-name">'+item.n+'</span> <span class="t-val" style="color:'+item.c+'">'+(v||'—')+'</span>'+chg;
    wrap.appendChild(d);
  });
}

function makeSpark(id, data, color, fill) {
  const svg = document.getElementById(id);
  if (!svg) return;
  const w=400, h=36;
  const mn=Math.min(...data), mx=Math.max(...data), rng=mx-mn||1;
  const xs=data.map((_,i)=>(i/(data.length-1))*w);
  const ys=data.map(v=>h-3-((v-mn)/rng)*(h-6));
  const pts=xs.map((x,i)=>x+','+ys[i]).join(' ');
  let html='';
  if(fill){html+='<defs><linearGradient id="g'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+color+'" stop-opacity="0.28"/><stop offset="100%" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>';html+='<polygon points="0,'+h+' '+pts+' '+w+','+h+'" fill="url(#g'+id+')" />';}
  html+='<polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linejoin="round"/>';
  html+='<circle cx="'+xs[xs.length-1]+'" cy="'+ys[ys.length-1]+'" r="3.5" fill="'+color+'"/>';
  svg.innerHTML=html;
}

function genTrend(base, days, noise) {
  const arr=[]; let v=base; noise=noise||8;
  for(let i=0;i<days;i++){v=Math.max(0,Math.min(100,v+(Math.random()-0.42)*noise));arr.push(Math.round(v));}
  return arr;
}

function renderSparklines(sc, days) {
  makeSpark('sp-m',genTrend(sc.moisture,days),'#f0a090',true);
  makeSpark('sp-s',genTrend(sc.strength,days),'#60a8ff',true);
  makeSpark('sp-sc',genTrend(sc.scalp,days),'#30e890',true);
  makeSpark('sp-g',genTrend(sc.growth,days),'#e0b050',true);
  makeSpark('spark-chats',genTrend(50,days,15),'#f0a090',false);
  makeSpark('spark-recs',genTrend(40,days,12),'#e0b050',false);
  makeSpark('spark-concerns',genTrend(30,days,8),'#60a8ff',false);
  document.getElementById('cr-m').textContent=sc.moisture+'%';
  document.getElementById('cr-s').textContent=sc.strength+'%';
  document.getElementById('cr-sc').textContent=sc.scalp+'%';
  document.getElementById('cr-g').textContent=sc.growth+'%';
}

let currentRange=7;
function setRange(el,days){
  document.querySelectorAll('.tt').forEach(t=>t.classList.remove('on'));
  el.classList.add('on'); currentRange=days;
  if(_scores) renderSparklines(_scores,days);
}

function calcScore() {
  const gs=id=>[...document.querySelectorAll('#'+id+' .tag.on')].map(t=>t.textContent.trim().toLowerCase()).join(' ');
  const concerns=gs('tags-concerns'), treatments=gs('tags-treatments'), products=gs('tags-products'), type=gs('tags-type');
  let moisture=75, strength=75, scalp=75, growth=75;
  const map={
    'frizz':[-10,0,0,0],'damaged':[-5,-25,0,-10],'breakage':[0,-30,0,-15],
    'hair loss':[0,-10,0,-30],'thinning':[0,-15,0,-25],'oily scalp':[0,0,-20,0],
    'dandruff':[0,0,-25,-5],'split ends':[-5,-10,0,0],'slow growth':[0,0,0,-20],
    'dry / brittle':[-15,-5,0,0],'relaxer':[-5,-15,0,0],'bleach':[-5,-20,0,-5],
    'hair color':[0,-10,0,0],'keratin':[0,-5,0,0],'perm / wave':[-5,-10,0,0],
    'formula exclusiva':[15,12,5,8],'laciador crece':[12,8,0,5],'gotero rapido':[0,0,18,10],
    'gotitas brillantes':[8,0,0,0],'mascarilla capilar':[12,5,0,0],'shampoo aloe vera':[5,0,8,5]
  };
  for(const[k,v] of Object.entries(map)){
    if(concerns.includes(k)||treatments.includes(k)||products.includes(k)||type.includes(k)){
      moisture+=v[0];strength+=v[1];scalp+=v[2];growth+=v[3];
    }
  }
  const cl=n=>Math.max(0,Math.min(100,n));
  return{overall:Math.round((cl(moisture)+cl(strength)+cl(scalp)+cl(growth))/4),moisture:cl(moisture),strength:cl(strength),scalp:cl(scalp),growth:cl(growth)};
}

function getZone(s) {
  if(s>=85) return{status:'EXCELLENT',color:'var(--green)'};
  if(s>=70) return{status:'VERY GOOD',color:'#60d060'};
  if(s>=50) return{status:'GOOD',color:'var(--rose)'};
  if(s>=30) return{status:'NEEDS CARE',color:'var(--gold)'};
  return{status:'CRITICAL',color:'var(--red)'};
}

function animNum(el,to,ms){
  const start=Date.now(),from=parseInt(el.textContent)||0;
  (function s(){const p=Math.min(1,(Date.now()-start)/ms),e=1-Math.pow(1-p,4);el.textContent=Math.round(from+(to-from)*e);if(p<1)requestAnimationFrame(s);})();
}

function renderScore(sc) {
  _scores=sc;
  const z=getZone(sc.overall);
  const circ=408, ring=document.getElementById('score-ring');
  ring.style.strokeDasharray=circ;
  ring.style.strokeDashoffset=circ-(circ*(sc.overall/100));
  animNum(document.getElementById('score-num'),sc.overall,2000);
  const st=document.getElementById('score-status');
  st.textContent=z.status; st.style.color=z.color;
  document.getElementById('score-delta').textContent='Index updated · live session';
  [['mf-m','mv-m',sc.moisture],['mf-s','mv-s',sc.strength],['mf-sc','mv-sc',sc.scalp],['mf-g','mv-g',sc.growth]].forEach(([fb,fv,val],i)=>{
    setTimeout(()=>{
      document.getElementById(fb).style.transform='scaleX(1)';
      const vEl=document.getElementById(fv);
      vEl.textContent=val+'%';
    },300+i*120);
  });
  renderSparklines(sc,currentRange);
  buildTicker(sc);
}

function toggleTag(el,group){
  if(group==='type') document.querySelectorAll('#tags-type .tag').forEach(t=>t.classList.remove('on'));
  el.classList.toggle('on');
  setTimeout(()=>renderScore(calcScore()),50);
}

function tagsToString(id){return[...document.querySelectorAll('#'+id+' .tag.on')].map(t=>t.textContent.trim()).join(', ');}
function setTagsFromString(id,val){
  if(!val) return;
  const sel=val.split(',').map(s=>s.trim().toLowerCase());
  document.querySelectorAll('#'+id+' .tag').forEach(t=>{if(sel.includes(t.textContent.trim().toLowerCase())) t.classList.add('on');});
}

let _isPremium = false;

function switchPTab(name){
  // Hide main app panels
  const mainPanels = ['top-row','mid-row','bot-row'];
  mainPanels.forEach(id=>{
    const el=document.querySelector('.'+id);
    if(el) el.style.display=(name==='overview')?'':'none';
  });
  // Hide all premium pages
  document.querySelectorAll('.ppage').forEach(p=>p.classList.remove('active'));
  // Show premium page if needed
  if(name!=='overview'&&name!=='profile'&&name!=='history'){
    const pp=document.getElementById('pp-'+name);
    if(pp){ pp.classList.add('active'); onPremiumPageOpen(name); }
  }
  // Nav tabs
  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
  const tabs={overview:0,profile:1,routine:2,progress:3,photo:4,whatsapp:5};
  const idx=tabs[name]??0;
  document.querySelectorAll('.nav-tab')[idx]?.classList.add('active');
  // Profile/history sub-tabs
  if(name==='overview'||name==='profile'||name==='history'){
    ['profile','history'].forEach(t=>{
      const pt=document.getElementById('pt-'+t);
      const pc=document.getElementById('pc-'+t);
      if(pt) pt.classList.toggle('on',t===name);
      if(pc) pc.classList.toggle('on',t===name);
    });
    if(name!=='overview') document.querySelector('.bot-row')?.scrollIntoView({behavior:'smooth',block:'nearest'});
    if(name==='history') loadHistory();
  }
}

function onPremiumPageOpen(name){
  if(!_isPremium){
    // Only show the gate for THIS tab, hide its content
    const gateMap={routine:'routine-gate',progress:'progress-gate',photo:'photo-gate',whatsapp:'whatsapp-gate'};
    const contentMap={routine:['routine-content','routine-empty'],progress:['progress-content'],photo:['photo-content'],whatsapp:['whatsapp-content']};
    // Hide all gates first
    ['routine-gate','progress-gate','photo-gate','whatsapp-gate'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.style.display='none';
    });
    // Show only the gate for this page
    const gate=document.getElementById(gateMap[name]);
    if(gate) gate.style.display='';
    // Hide content for this page
    (contentMap[name]||[]).forEach(id=>{
      const el=document.getElementById(id); if(el) el.style.display='none';
    });
    return;
  }
  if(name==='routine') openRoutinePage();
  if(name==='progress') openProgressPage();
  if(name==='photo') openPhotoPage();
  if(name==='whatsapp') openWhatsappPage();
}

// ── ROUTINE BUILDER ──────────────────────────────────────────────────────────
async function openRoutinePage(){
  document.getElementById('routine-gate').style.display='none';
  document.getElementById('routine-loading').style.display='none';
  document.getElementById('routine-empty').style.display='none';
  const r=await fetch('/api/routine',{headers:{'X-Auth-Token':token}});
  const d=await r.json();
  if(d.routine) renderRoutine(d.routine);
  else { document.getElementById('routine-empty').style.display='block'; }
}

async function generateRoutine(){
  document.getElementById('routine-empty').style.display='none';
  document.getElementById('routine-content').style.display='none';
  document.getElementById('routine-loading').style.display='flex';
  document.getElementById('routine-regen-btn').disabled=true;
  try{
    const r=await fetch('/api/routine',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token}});
    const d=await r.json();
    if(d.routine) renderRoutine(d.routine);
    else { showToast(d.error||'Could not generate — fill in your profile first'); document.getElementById('routine-empty').style.display='block'; }
  }catch(e){ showToast('Error generating routine'); }
  document.getElementById('routine-loading').style.display='none';
  document.getElementById('routine-regen-btn').disabled=false;
}

function renderRoutine(rt){
  document.getElementById('routine-content').style.display='block';
  // Tips
  const tips=document.getElementById('routine-tips');
  tips.innerHTML=(rt.tips||[]).map(t=>'<div class="routine-tip">'+t+'</div>').join('');
  // Days grid
  const grid=document.getElementById('routine-grid');
  const DAY_ORDER=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  grid.innerHTML=DAY_ORDER.map(day=>{
    const info=rt.days?.[day];
    if(!info) return '';
    const steps=s=>(s||[]).map(x=>'<div class="rd-step">'+x+'</div>').join('');
    const prods=(info.products||[]).map(p=>'<span class="rd-prod-tag">'+p+'</span>').join('');
    return '<div class="rd-card"><div class="rd-day">'+day+'</div><div class="rd-title">'+info.title+'</div>'
      +(info.morning?.length?'<div class="rd-section">Morning</div>'+steps(info.morning):'')
      +(info.evening?.length?'<div class="rd-section">Evening</div>'+steps(info.evening):'')
      +(prods?'<div class="rd-products">'+prods+'</div>':'')
      +'</div>';
  }).join('');
  // Recommended products
  const rp=document.getElementById('routine-products');
  rp.innerHTML='<div class="routine-products-title">★ Aria\'s Top Picks For You</div>'
    +(rt.recommended_products||[]).map(p=>'<div class="rp-item">'+p+'</div>').join('');
}

// ── PROGRESS TRACKER ─────────────────────────────────────────────────────────
async function openProgressPage(){
  document.getElementById('progress-gate').style.display='none';
  document.getElementById('progress-content').style.display='block';
  // Auto-save today's score
  const sc=calcScore();
  fetch('/api/score-history',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},
    body:JSON.stringify({score:sc.total,moisture:sc.moisture,strength:sc.strength,scalp:sc.scalp,growth:sc.growth})});
  // Load history
  const r=await fetch('/api/score-history',{headers:{'X-Auth-Token':token}});
  const d=await r.json();
  renderScoreHistory(d.history||[]);
  loadTreatmentLog();
}

function renderScoreHistory(history){
  const svg=document.getElementById('score-history-svg');
  if(!history.length){ svg.innerHTML='<text x="50%" y="50%" fill="#505870" text-anchor="middle" font-size="12">No score history yet — visit daily to build your timeline.</text>'; return; }
  const w=600,h=160,pad=30;
  const scores=history.map(h=>h.score);
  const mn=Math.min(...scores)-5,mx=Math.max(...scores)+5;
  const rng=mx-mn||1;
  const xs=scores.map((_,i)=>pad+(i/(Math.max(scores.length-1,1)))*(w-2*pad));
  const ys=scores.map(v=>h-pad-((v-mn)/rng)*(h-2*pad));
  const pts=xs.map((x,i)=>x+','+ys[i]).join(' ');
  const apts=xs.map((x,i)=>x+','+ys[i]).join(' ')+' '+xs[xs.length-1]+','+(h-pad)+' '+pad+','+(h-pad);
  svg.innerHTML='<defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(240,160,144,0.35)"/><stop offset="100%" stop-color="rgba(240,160,144,0)"/></linearGradient></defs>'
    +'<polygon points="'+apts+'" fill="url(#sg)"/>'
    +'<polyline points="'+pts+'" fill="none" stroke="#f0a090" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'
    +scores.map((s,i)=>'<circle cx="'+xs[i]+'" cy="'+ys[i]+'" r="4" fill="#f0a090"/><title>'+s+'</title>').join('');
  // Labels
  const lbls=document.getElementById('prog-chart-labels');
  const step=Math.max(1,Math.floor(history.length/4));
  lbls.innerHTML=history.filter((_,i)=>i%step===0||i===history.length-1)
    .map(h=>'<span>'+h.ts.slice(5,10)+'</span>').join('');
  // Metrics
  const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
  const best=Math.max(...scores);
  const trend=scores.length>=2?scores[scores.length-1]-scores[scores.length-2]:0;
  document.getElementById('ph-avg').textContent=avg;
  document.getElementById('ph-best').textContent=best;
  document.getElementById('ph-trend').textContent=(trend>=0?'+':'')+trend;
  document.getElementById('ph-entries').textContent=scores.length;
}

async function loadTreatmentLog(){
  const r=await fetch('/api/treatment-log',{headers:{'X-Auth-Token':token}});
  const d=await r.json();
  const list=document.getElementById('treatment-list');
  if(!d.log?.length){ list.innerHTML='<div class="h-empty">No treatments logged yet.</div>'; return; }
  list.innerHTML=d.log.map(e=>'<div class="tl-entry">'
    +'<div class="tl-product">'+e.product+'</div>'
    +(e.notes?'<div class="tl-notes">'+e.notes+'</div>':'')
    +'<div class="tl-meta"><div class="tl-stars">'+'★'.repeat(e.rating||0)+'☆'.repeat(5-(e.rating||0))+'</div>'
    +'<span class="tl-date">'+e.ts.slice(0,10)+'</span>'
    +'<button class="tl-del" onclick="deleteTreatment('+e.id+')">✕</button></div>'
    +'</div>').join('');
}

let _logRating=0;
function openLogModal(){ _logRating=0; document.getElementById('log-product').value=''; document.getElementById('log-notes').value=''; setLogRating(0); document.getElementById('log-modal').style.display='flex'; }
function closeLogModal(){ document.getElementById('log-modal').style.display='none'; }
function setLogRating(n){ _logRating=n; document.querySelectorAll('#modal-stars span').forEach((s,i)=>s.classList.toggle('lit',i<n)); }
async function saveLog(){
  const product=document.getElementById('log-product').value;
  const notes=document.getElementById('log-notes').value;
  if(!product){ showToast('Please select a product'); return; }
  await fetch('/api/treatment-log',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify({product,notes,rating:_logRating})});
  closeLogModal(); loadTreatmentLog(); showToast('Treatment logged ✓');
}
async function deleteTreatment(id){
  await fetch('/api/treatment-log?id='+id,{method:'DELETE',headers:{'X-Auth-Token':token}});
  loadTreatmentLog();
}

// ── PHOTO ANALYSIS ───────────────────────────────────────────────────────────
function openPhotoPage(){
  document.getElementById('photo-gate').style.display='none';
  document.getElementById('photo-content').style.display='block';
  loadPhotoHistory();
}

let _photoB64=null;
function onPhotoSelected(e){
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    _photoB64=ev.target.result;
    const img=document.getElementById('photo-preview');
    img.src=_photoB64; img.style.display='block';
    document.getElementById('photo-analyze-btn').style.display='block';
  };
  reader.readAsDataURL(file);
}
async function analyzePhoto(){
  if(!_photoB64){ showToast('Please select a photo first'); return; }
  document.getElementById('photo-analyze-btn').style.display='none';
  document.getElementById('photo-loading').style.display='flex';
  document.getElementById('photo-result').style.display='none';
  try{
    const r=await fetch('/api/photo-analysis',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify({image_b64:_photoB64})});
    const d=await r.json();
    if(d.analysis) renderPhotoResult(d.analysis);
    else showToast(d.error||'Analysis failed');
  }catch(e){ showToast('Analysis error'); }
  document.getElementById('photo-loading').style.display='none';
  document.getElementById('photo-analyze-btn').style.display='block';
}
function renderPhotoResult(a){
  const el=id=>document.getElementById(id);
  el('pa-porosity').textContent=a.porosity||'—';
  el('pa-damage').textContent=a.damage_level||'—';
  el('pa-density').textContent=a.density||'—';
  el('pa-texture').textContent=a.texture||'—';
  const score=a.overall_health_score||0;
  el('pa-score-fill').style.width=score+'%';
  el('pa-score-num').textContent=score+' / 100';
  el('pa-advice').textContent=a.personalized_advice||'';
  el('pa-obs').innerHTML='<div class="photo-obs-title">Observations</div>'+(a.observations||[]).map(o=>'<div class="photo-obs-item">'+o+'</div>').join('');
  el('pa-recs').innerHTML='<div class="photo-recs-title">Recommended Products</div>'+(a.recommended_products||[]).map(p=>'<span class="photo-rec-tag">'+p+'</span>').join('');
  el('photo-result').style.display='block';
  loadPhotoHistory();
}
async function loadPhotoHistory(){
  const r=await fetch('/api/photo-analysis',{headers:{'X-Auth-Token':token}});
  const d=await r.json();
  const list=document.getElementById('photo-history-list');
  if(!d.analyses?.length){ list.innerHTML='<div class="photo-hist-item" style="color:var(--muted)">No past analyses.</div>'; return; }
  list.innerHTML='<div class="photo-history-label">Past Analyses</div>'+d.analyses.map(a=>'<div class="photo-hist-item"><span>'+JSON.parse(a.analysis).damage_level+' damage · '+JSON.parse(a.analysis).overall_health_score+'/100</span><span>'+a.ts.slice(0,10)+'</span></div>').join('');
}

function activateStat(el){
  document.querySelectorAll('.stat-card').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
}


// ── ARIA SPHERE CHAT + VOICE ──
let sphereBusy=false;
let sphereRecording=false;
let sphereMediaRec=null;
let sphereChunks=[];
const sphereLang=localStorage.getItem('aria_lang')||'en-US';

function addSphereMsg(role,text){
  const wrap=document.getElementById('sphere-msgs');
  const div=document.createElement('div');
  div.className='smsg smsg-'+role;
  div.innerHTML='<div class="smsg-bubble">'+text+'</div>';
  wrap.appendChild(div);
  wrap.scrollTop=wrap.scrollHeight;
  return div;
}

function sphereSetState(state){
  const orb=document.getElementById('sphere-orb');
  const mic=document.getElementById('sphere-mic');
  const hint=document.getElementById('sphere-hint');
  const lbl=document.getElementById('sphere-status-lbl');
  orb.classList.remove('listening','speaking');
  mic.classList.remove('recording');
  if(state==='idle'){hint.textContent='Tap sphere to speak · or type below';lbl.textContent='Online · AI Advisor';}
  else if(state==='listening'){orb.classList.add('listening');mic.classList.add('recording');hint.textContent='Listening… tap again to stop';lbl.textContent='Listening…';}
  else if(state==='thinking'){orb.classList.add('speaking');hint.textContent='Aria is thinking…';lbl.textContent='Thinking…';}
  else if(state==='speaking'){orb.classList.add('speaking');hint.textContent='Aria is speaking…';lbl.textContent='Responding…';}
}

async function sphereOrbTap(){
  if(sphereBusy) return;
  if(sphereRecording){ sphereStopRecording(); return; }
  // Unlock TTS on first gesture
  if(!window._sphereSpeechUnlocked){
    window._sphereSpeechUnlocked=true;
    const u=new SpeechSynthesisUtterance(''); u.volume=0;
    window.speechSynthesis.speak(u);
  }
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    sphereChunks=[];
    sphereMediaRec=new MediaRecorder(stream,{mimeType:MediaRecorder.isTypeSupported('audio/webm;codecs=opus')?'audio/webm;codecs=opus':'audio/webm'});
    sphereMediaRec.ondataavailable=e=>{if(e.data.size>0) sphereChunks.push(e.data);};
    sphereMediaRec.onstop=async()=>{
      stream.getTracks().forEach(t=>t.stop());
      if(!sphereChunks.length){sphereSetState('idle');sphereBusy=false;return;}
      sphereSetState('thinking');
      const blob=new Blob(sphereChunks,{type:'audio/webm'});
      const fd=new FormData(); fd.append('audio',blob,'audio.webm');
      try{
        const tr=await fetch('/api/transcribe',{method:'POST',body:fd});
        const td=await tr.json();
        const txt=(td.text||'').trim();
        if(!txt){addSphereMsg('aria','I couldn\'t catch that — try again?');sphereSetState('idle');sphereBusy=false;return;}
        document.getElementById('sphere-input').value=txt;
        await sphereAskAria(txt);
      }catch(e){addSphereMsg('aria','⚠ Transcription error.');sphereSetState('idle');sphereBusy=false;}
    };
    sphereMediaRec.start();
    sphereRecording=true;
    sphereSetState('listening');
    // Auto-stop after 12s
    setTimeout(()=>{if(sphereRecording) sphereStopRecording();},12000);
  }catch(e){
    // No mic — fall back to focus text input
    document.getElementById('sphere-input').focus();
    showToast('Microphone not available — type your question');
  }
}

function sphereStopRecording(){
  if(!sphereRecording||!sphereMediaRec) return;
  sphereRecording=false;
  sphereBusy=true;
  sphereMediaRec.stop();
}

async function sphereAskAria(msg){
  sphereSetState('thinking');
  addSphereMsg('user',msg);
  const typing=addSphereMsg('aria','…');
  try{
    const r=await fetch('/api/recommend',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify({message:msg,text:msg,lang:sphereLang,history:[]})});
    const d=await r.json();
    typing.remove();
    const reply=d.recommendation||d.reply||d.error||'⚠ Try again.';
    addSphereMsg('aria',reply);
    await sphereSpeak(reply);
  }catch(e){typing.remove();addSphereMsg('aria','⚠ Connection error.');sphereSetState('idle');}
  sphereBusy=false;
}

function sphereSpeak(text){
  return new Promise(resolve=>{
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    if(!text||text.startsWith('⚠')){sphereSetState('idle');resolve();return;}
    sphereSetState('speaking');
    const utt=new SpeechSynthesisUtterance(text);
    // Match language
    const langMap={'en-US':'en-US','es-ES':'es-ES','fr-FR':'fr-FR','pt-BR':'pt-BR','zh-CN':'zh-CN','ar-SA':'ar-SA','hi-IN':'hi-IN','de-DE':'de-DE'};
    utt.lang=langMap[sphereLang]||'en-US';
    utt.rate=0.92;
    utt.pitch=1.05;
    // Pick a female voice if available
    const voices=window.speechSynthesis.getVoices();
    const femaleVoice=voices.find(v=>v.lang.startsWith(utt.lang.slice(0,2))&&/female|woman|samantha|karen|moira|tessa|fiona|victoria|allison|ava|susan|zira|google uk english female/i.test(v.name))
      ||voices.find(v=>v.lang.startsWith(utt.lang.slice(0,2)));
    if(femaleVoice) utt.voice=femaleVoice;
    // Orb pulses while speaking
    const orb=document.getElementById('sphere-orb');
    let pulseInterval=setInterval(()=>{
      orb.style.transform=`scale(${1+Math.random()*0.06})`;
    },120);
    utt.onend=()=>{
      clearInterval(pulseInterval);
      orb.style.transform='';
      sphereSetState('idle');
      resolve();
    };
    utt.onerror=()=>{
      clearInterval(pulseInterval);
      orb.style.transform='';
      sphereSetState('idle');
      resolve();
    };
    // Voices may not be loaded yet on first call
    if(voices.length===0){
      window.speechSynthesis.onvoiceschanged=()=>{
        const v2=window.speechSynthesis.getVoices();
        const fv=v2.find(v=>v.lang.startsWith(utt.lang.slice(0,2))&&/female|woman|samantha|karen|moira|tessa|fiona|victoria|allison|ava|susan|zira|google uk english female/i.test(v.name))||v2.find(v=>v.lang.startsWith(utt.lang.slice(0,2)));
        if(fv) utt.voice=fv;
        window.speechSynthesis.speak(utt);
      };
    } else {
      window.speechSynthesis.speak(utt);
    }
  });
}

async function sphereSend(){
  const input=document.getElementById('sphere-input');
  const msg=input.value.trim();
  if(!msg||sphereBusy) return;
  sphereBusy=true; input.value='';
  await sphereAskAria(msg);
  input.focus();
}

// ── WHATSAPP / SMS ──
function openWhatsappPage(){
  document.getElementById('whatsapp-gate').style.display='none';
  document.getElementById('whatsapp-content').style.display='block';
  // Set SMS number from env (loaded via dashboard-stats)
  const smsEl=document.getElementById('sms-number-display');
  if(smsEl && window._smsNumber) smsEl.textContent=window._smsNumber;
  else if(smsEl) smsEl.textContent='Text us to get your dedicated number';
}

async function linkPhone(){
  const phone=document.getElementById('phone-link-input').value.trim();
  const btn=document.getElementById('link-phone-btn');
  const msg=document.getElementById('phone-link-msg');
  if(!phone){msg.style.color='#e08080';msg.textContent='Enter your phone number first.';return;}
  btn.disabled=true;btn.textContent='Linking…';
  try{
    const r=await fetch('/api/twilio/link-phone',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify({phone})});
    const d=await r.json();
    if(d.ok){msg.style.color='#80e0a0';msg.textContent='✓ Phone linked! Aria will now remember you when you text.';}
    else{msg.style.color='#e08080';msg.textContent=d.error||'Something went wrong.';}
  }catch(e){msg.style.color='#e08080';msg.textContent='Network error.';}
  btn.disabled=false;btn.textContent='Link';
}

async function loadData(){
  try{
    const r=await fetch('/api/auth/me',{headers:{'X-Auth-Token':token}});
    if(r.status===401){window.location.href='/login';return;}
    const d=await r.json();
    document.getElementById('nav-name').textContent=d.name||d.email;
    const av=document.getElementById('nav-av');
    if(d.avatar){av.innerHTML='<img src="'+d.avatar+'" alt="">';}else{av.textContent=(d.name||'?')[0].toUpperCase();}
    if(d.subscribed){ document.getElementById('plan-badge').textContent='PREMIUM'; _isPremium=true; }
    // Style premium nav tabs
    if(_isPremium) document.querySelectorAll('.nav-tab').forEach(t=>{ if(t.textContent.startsWith('\u2746')) t.style.color='var(--gold)'; });
    // If already on a premium tab when data loaded, re-open it now we know premium status
    const activeTab=document.querySelector('.nav-tab.active');
    if(activeTab){
      const tabNames=['overview','profile','routine','progress','photo'];
      const tabIdx=[...document.querySelectorAll('.nav-tab')].indexOf(activeTab);
      const tabName=tabNames[tabIdx];
      if(tabName&&['routine','progress','photo'].includes(tabName)){
        onPremiumPageOpen(tabName);
      }
    }
    document.getElementById('st-chats').textContent=d.chat_count||0;
    document.getElementById('st-chats-trend').textContent='↑ '+(d.chat_count||0)+' all time';
    const concerns=(d.profile?.hair_concerns||'').split(',').filter(c=>c.trim()).length;
    document.getElementById('st-concerns').textContent=concerns||0;
    document.getElementById('st-recs').textContent=Math.floor((d.chat_count||0)/2)||0;
    if(d.profile){
      setTagsFromString('tags-type',d.profile.hair_type);
      setTagsFromString('tags-concerns',d.profile.hair_concerns);
      setTagsFromString('tags-treatments',d.profile.treatments);
      setTagsFromString('tags-products',d.profile.products_tried);
    }
    setTimeout(()=>renderScore(calcScore()),400);
  }catch(e){console.error(e);setTimeout(()=>renderScore(calcScore()),400);}
}

async function loadHistory(){
  try{
    const r=await fetch('/api/history',{headers:{'X-Auth-Token':token}});
    const d=await r.json();
    const list=document.getElementById('history-list');
    if(!d.history||!d.history.length){list.innerHTML='<div class="h-empty">No conversations yet.</div>';return;}
    list.innerHTML=d.history.slice(-8).reverse().map(h=>
      '<div class="h-item"><div class="h-role">'+(h.role==='user'?'YOU':'ARIA')+'</div><div class="h-text">'+h.content.slice(0,160)+(h.content.length>160?'…':'')+'</div></div>'
    ).join('');
  }catch(e){}
}

async function saveProfile(){
  const data={hair_type:tagsToString('tags-type'),hair_concerns:tagsToString('tags-concerns'),treatments:tagsToString('tags-treatments'),products_tried:tagsToString('tags-products')};
  try{
    await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify(data)});
    renderScore(calcScore());
    showToast('✦ Profile saved — score updated');
  }catch(e){showToast('⚠ Save failed');}
}

async function clearHistory(){
  if(!confirm('Clear all chat history?')) return;
  await fetch('/api/history/clear',{method:'POST',headers:{'X-Auth-Token':token}});
  loadHistory(); showToast('✓ History cleared');
}

async function doLogout(){
  await fetch('/api/auth/logout',{method:'POST',headers:{'X-Auth-Token':token}});
  localStorage.removeItem('srd_token');localStorage.removeItem('srd_user');
  window.location.href='/';
}

let toastT;
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2800);}

async function loadRealStats(){
  try{
    const r=await fetch('/api/dashboard-stats',{headers:{'X-Auth-Token':token}});
    if(!r.ok) return;
    const s=await r.json();
    const ac=document.getElementById('active-count');
    if(ac){
      ac.textContent=s.active_today;
      let base=s.active_today;
      setInterval(()=>{base+=Math.floor(Math.random()*3)-1;base=Math.max(s.active_today-3,Math.min(s.active_today+8,base));ac.textContent=base;},4000);
    }
    const sent=s.sentiment;
    const mp=sent.moisture_pct||68, gp=sent.growth_pct||54;
    document.getElementById('ins-bar-m').style.width=mp+'%';
    document.getElementById('ins-bar-mb').style.width=(100-mp)+'%';
    document.getElementById('ins-moist-pct').textContent=mp+'%';
    document.getElementById('ins-bar-g').style.width=gp+'%';
    document.getElementById('ins-bar-gb').style.width=(100-gp)+'%';
    document.getElementById('ins-growth-pct').textContent=gp+'%';
    if(s.product_trends&&s.product_trends.length>0){
      s.product_trends.slice(0,3).forEach((pt,i)=>{
        const el=document.getElementById('trend-'+i);
        if(!el) return;
        const chg=pt.change, dir=chg>=0?'+':'', color=chg>=0?'var(--green)':'var(--red)', arrow=chg>=0?'↑':'↓';
        el.querySelector('.cs-label').textContent=pt.product;
        el.querySelector('.cs-val').textContent=dir+chg+'%';
        el.querySelector('.cs-val').style.color=color;
        const sm=el.querySelectorAll('span')[1];
        if(sm){sm.textContent=arrow;sm.style.color=color;}
      });
    }
  }catch(e){
    const ac=document.getElementById('active-count');
    if(ac){let b=Math.floor(Math.random()*40)+65;ac.textContent=b;setInterval(()=>{b+=Math.floor(Math.random()*3)-1;b=Math.max(58,Math.min(120,b));ac.textContent=b;},3500);}
  }
}

buildTicker(null);
loadData();
loadRealStats();
</script>
</body></html>"""
    return html




# ── BLOG DB ───────────────────────────────────────────────────────────────────
BLOG_DB = os.environ.get("BLOG_DB_PATH", "/data/srd_blog.db")

def _init_blog_db():
    try:
        db = sqlite3.connect(BLOG_DB)
        db.execute("""CREATE TABLE IF NOT EXISTS posts (
            handle TEXT PRIMARY KEY,
            title TEXT,
            html TEXT,
            meta TEXT,
            chinese_title TEXT,
            chinese_summary TEXT,
            date TEXT
        )""")
        db.commit()
        db.close()
    except Exception as e:
        print(f"Blog DB init error: {e}")

_init_blog_db()

def blog_get_index(limit=90):
    try:
        db = sqlite3.connect(BLOG_DB, timeout=10, check_same_thread=False)
        db.row_factory = sqlite3.Row
        rows = db.execute("SELECT handle, title, meta, date FROM posts ORDER BY date DESC LIMIT ?", (limit,)).fetchall()
        db.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"blog_get_index error: {e}")
        return []

def blog_get_post(handle):
    try:
        con = sqlite3.connect(BLOG_DB, timeout=10, check_same_thread=False)
        con.row_factory = sqlite3.Row
        row = con.execute("SELECT * FROM posts WHERE handle=?", (handle,)).fetchone()
        con.close()
        return dict(row) if row else None
    except Exception as e:
        print(f"blog_get_post error: {e}")
        return None

def blog_save_post(post):
    try:
        db = sqlite3.connect(BLOG_DB)
        db.execute("""INSERT OR REPLACE INTO posts
            (handle,title,html,meta,chinese_title,chinese_summary,date)
            VALUES (?,?,?,?,?,?,?)""",
            (post.get("handle"),post.get("title"),post.get("html"),
             post.get("meta",""),post.get("chinese_title",""),
             post.get("chinese_summary",""),post.get("date","")))
        db.commit(); db.close()
    except Exception as e:
        print(f"blog_save_post error: {e}")

# ── BLOG ROUTES ───────────────────────────────────────────────────────────────
SRD_PAGE_LOADER = """<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&display=swap" rel="stylesheet">
<style>
  #srd-loader{position:fixed;inset:0;background:#f0ebe8;z-index:99999;display:flex;align-items:center;justify-content:center;}
  #srd-loader-canvas{position:absolute;inset:0;width:100%;height:100%;}
  .srd-logo-wrap{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:18px;opacity:0;animation:srdLogoReveal 1.2s cubic-bezier(0.22,1,0.36,1) 0.4s forwards;}
  .srd-emblem{width:72px;height:72px;}
  .srd-divider-line{width:48px;height:1px;background:linear-gradient(90deg,transparent,#c1a3a2,transparent);opacity:0;animation:srdFadeIn 0.8s ease 1.0s forwards;}
  .srd-brand-script{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:300;font-size:clamp(13px,2vw,16px);letter-spacing:0.32em;text-transform:uppercase;color:#9d7f6a;opacity:0;animation:srdFadeUp 0.8s ease 1.1s forwards;}
  .srd-dot-row{position:absolute;bottom:44px;left:50%;transform:translateX(-50%);display:flex;gap:7px;z-index:3;opacity:0;animation:srdFadeUp 0.6s ease 1.3s forwards;}
  .srd-dot{width:4px;height:4px;border-radius:50%;background:rgba(193,163,162,0.25);transition:background 0.3s ease,transform 0.3s ease;}
  .srd-dot.active{background:#c1a3a2;transform:scale(1.4);}
  #srd-loader.srd-exit{animation:srdDissolve 0.9s cubic-bezier(0.4,0,0.2,1) forwards;}
  @keyframes srdLogoReveal{0%{opacity:0;transform:scale(0.92)}100%{opacity:1;transform:scale(1)}}
  @keyframes srdFadeIn{to{opacity:1}}
  @keyframes srdFadeUp{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}
  @keyframes srdDissolve{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.04)}}
</style>
<div id="srd-loader">
  <canvas id="srd-loader-canvas"></canvas>
  <div class="srd-logo-wrap">
    <svg class="srd-emblem" viewBox="0 0 72 72" fill="none">
      <circle cx="36" cy="36" r="34" stroke="#c1a3a2" stroke-width="0.6" opacity="0.5"/>
      <circle cx="36" cy="36" r="26" stroke="#c1a3a2" stroke-width="0.4" opacity="0.3"/>
      <path d="M28 14 C26 22,32 28,30 36 C28 44,22 48,24 58" stroke="#c1a3a2" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.9"/>
      <path d="M36 12 C35 20,39 26,37 36 C35 46,31 50,33 60" stroke="#9d7f6a" stroke-width="1.4" stroke-linecap="round" fill="none"/>
      <path d="M44 14 C46 22,40 28,42 36 C44 44,50 48,48 58" stroke="#c1a3a2" stroke-width="1.2" stroke-linecap="round" fill="none" opacity="0.9"/>
    </svg>
    <div class="srd-divider-line"></div>
    <div class="srd-brand-script">Professional Hair Care</div>
  </div>
  <div class="srd-dot-row">
    <div class="srd-dot" id="srd-d0"></div><div class="srd-dot" id="srd-d1"></div>
    <div class="srd-dot" id="srd-d2"></div><div class="srd-dot" id="srd-d3"></div>
    <div class="srd-dot" id="srd-d4"></div>
  </div>
</div>
<script>
(function(){
  var cv=document.getElementById('srd-loader-canvas'),ctx=cv.getContext('2d');
  function rsz(){cv.width=window.innerWidth;cv.height=window.innerHeight;}rsz();window.addEventListener('resize',rsz);
  function S(){this.i();}
  S.prototype.i=function(){this.x=Math.random()*cv.width;this.y=-60-Math.random()*200;this.len=100+Math.random()*200;this.wave=(Math.random()-.5)*40;this.spd=.18+Math.random()*.35;this.w=.3+Math.random()*.8;this.a=.04+Math.random()*.10;this.off=Math.random()*Math.PI*2;this.dr=(Math.random()-.5)*.3;var c=[[193,163,162],[157,127,106],[210,185,178]];this.rgb=c[Math.floor(Math.random()*c.length)];};
  S.prototype.u=function(){this.y+=this.spd;this.x+=this.dr;if(this.y>cv.height+60)this.i();};
  S.prototype.d=function(t){var n=20;ctx.beginPath();ctx.moveTo(this.x,this.y);for(var i=1;i<=n;i++){var p=i/n;ctx.lineTo(this.x+Math.sin(p*Math.PI*2+t*.008+this.off)*this.wave*p,this.y+p*this.len);}ctx.strokeStyle='rgba('+this.rgb[0]+','+this.rgb[1]+','+this.rgb[2]+','+this.a+')';ctx.lineWidth=this.w;ctx.lineCap='round';ctx.stroke();};
  var ss=[];for(var i=0;i<55;i++){var s=new S();s.y=Math.random()*cv.height;ss.push(s);}
  var t=0;function ani(){t++;ctx.clearRect(0,0,cv.width,cv.height);ss.forEach(function(s){s.u();s.d(t);});requestAnimationFrame(ani);}ani();
  var ds=[0,1,2,3,4].map(function(i){return document.getElementById('srd-d'+i);});
  var st=0;[600,1200,1900,2800,3800].forEach(function(ms){setTimeout(function(){ds.forEach(function(d){d.classList.remove('active');});if(ds[st])ds[st].classList.add('active');st++;},ms);});
  var ex=false;
  function doExit(){if(ex)return;ex=true;ds.forEach(function(d){d.classList.add('active');});setTimeout(function(){var el=document.getElementById('srd-loader');el.classList.add('srd-exit');setTimeout(function(){el.style.display='none';},900);},200);}
  window.addEventListener('load',function(){setTimeout(doExit,1200);});setTimeout(doExit,4500);
})();
</script>"""

@app.route("/api/blog-posts", methods=["GET"])
def api_blog_posts():
    return jsonify(blog_get_index())

@app.route("/api/blog-post/<handle>", methods=["GET"])
def api_blog_post(handle):
    post = blog_get_post(handle)
    if post: return jsonify(post)
    return jsonify({"error": "not found"}), 404

@app.route("/blog")
def blog_index():
    posts = blog_get_index()
    cards = ""
    for p in posts:
        date = p.get("date","")[:10]
        cards += f'<article class="post-card"><a href="/blog/{p["handle"]}"><h2>{p["title"]}</h2><p class="meta">{p.get("meta","")}</p><span class="date">{date}</span></a></article>'
    if not cards:
        cards = '<p class="empty">No posts yet — check back soon.</p>'
    return f"""<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hair Care Journal — SupportRD</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
{SRD_PAGE_LOADER}
<style>
*{{box-sizing:border-box;margin:0;padding:0;}}body{{font-family:'Jost',sans-serif;font-weight:300;background:#f0ebe8;color:#0d0906;}}
.header-brand{{text-align:center;padding:48px 24px 36px;background:#f0ebe8;}}
.header-brand h1{{font-family:'Cormorant Garamond',serif;font-size:clamp(32px,5vw,48px);font-style:italic;font-weight:400;}}
.header-brand p{{font-size:13px;color:rgba(0,0,0,0.4);margin-top:10px;letter-spacing:0.10em;text-transform:uppercase;}}
.container{{max-width:900px;margin:0 auto;padding:40px 24px;}}
.post-card{{background:#fff;border-radius:16px;margin-bottom:20px;transition:transform 0.2s,box-shadow 0.2s;box-shadow:0 2px 12px rgba(0,0,0,0.05);border:1px solid rgba(193,163,162,0.12);}}
.post-card:hover{{transform:translateY(-3px);box-shadow:0 8px 28px rgba(0,0,0,0.10);}}
.post-card a{{display:block;padding:28px 32px;text-decoration:none;color:inherit;}}
.post-card h2{{font-family:'Cormorant Garamond',serif;font-size:24px;color:#0d0906;margin-bottom:8px;line-height:1.3;}}
.post-card .meta{{font-size:13px;color:rgba(0,0,0,0.45);line-height:1.6;margin-bottom:12px;}}
.post-card .date{{font-size:11px;color:#c1a3a2;letter-spacing:0.08em;}}
.empty{{text-align:center;color:rgba(0,0,0,0.3);padding:60px;font-size:14px;}}
footer{{text-align:center;padding:40px;font-size:12px;color:rgba(0,0,0,0.3);border-top:1px solid rgba(193,163,162,0.12);}}
footer a{{color:#c1a3a2;text-decoration:none;}}
</style></head><body>
<div class="header-brand"><h1>Hair Care Journal</h1><p>Expert tips from SupportRD</p></div>
<div class="container">{cards}</div>
<footer><a href="https://supportrd.com">← Back to SupportRD</a> &nbsp;·&nbsp; <a href="/">Try Aria AI →</a></footer>
</body></html>"""

@app.route("/blog/<handle>")
def blog_post(handle):
    post = blog_get_post(handle)
    if not post:
        return "<h2>Post not found</h2>", 404
    date = post.get("date","")[:10]
    return f"""<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{post['title']} — SupportRD</title>
<meta name="description" content="{post.get('meta','')}">
<link rel="canonical" href="{APP_BASE_URL}/blog/{handle}">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
{SRD_PAGE_LOADER}
<style>
*{{box-sizing:border-box;margin:0;padding:0;}}body{{font-family:'Jost',sans-serif;font-weight:300;background:#f0ebe8;}}
.container{{max-width:720px;margin:0 auto;padding:48px 24px;}}
.post-date{{font-size:11px;color:#c1a3a2;letter-spacing:0.10em;margin-bottom:16px;text-transform:uppercase;}}
.post-body{{background:#fff;border-radius:20px;padding:48px;box-shadow:0 2px 20px rgba(0,0,0,0.06);line-height:1.8;font-size:15px;}}
.post-body h1{{font-family:'Cormorant Garamond',serif;font-size:36px;font-style:italic;font-weight:400;margin-bottom:24px;line-height:1.2;}}
.post-body h2{{font-family:'Cormorant Garamond',serif;font-size:24px;font-weight:400;margin:32px 0 12px;}}
.post-body p{{margin-bottom:16px;color:rgba(0,0,0,0.75);}}
.cta{{background:linear-gradient(135deg,#c1a3a2,#9d7f6a);color:#fff;text-align:center;padding:36px;border-radius:16px;margin-top:32px;}}
.cta h3{{font-family:'Cormorant Garamond',serif;font-size:26px;font-style:italic;font-weight:400;margin-bottom:8px;}}
.cta a{{display:inline-block;margin-top:16px;padding:12px 28px;background:#fff;color:#c1a3a2;border-radius:30px;text-decoration:none;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;}}
footer{{text-align:center;padding:32px;font-size:12px;color:rgba(0,0,0,0.3);}}
footer a{{color:#c1a3a2;text-decoration:none;}}
@media(max-width:600px){{.post-body{{padding:28px 20px;}}}}
</style></head><body>
<div class="container">
  <div class="post-date">{date}</div>
  <div class="post-body">{post['html']}</div>
  <div class="cta"><h3>Get your personalized hair routine</h3><p>Tell Aria about your hair and get expert advice tailored to you.</p><a href="/">Chat with Aria Free →</a></div>
</div>
<footer><a href="https://supportrd.com">SupportRD</a> &nbsp;·&nbsp; <a href="/blog">← More Articles</a></footer>
</body></html>"""


# ── SITEMAP / ROBOTS ──────────────────────────────────────────────────────────
@app.route("/sitemap.xml")
def sitemap():
    base_url = os.environ.get("APP_BASE_URL","https://aria.supportrd.com")
    urls = [f"""  <url><loc>{base_url}/blog</loc><changefreq>daily</changefreq><priority>0.8</priority></url>"""]
    try:
        for p in blog_get_index():
            date = p.get("date","")[:10]
            urls.append(f"""  <url><loc>{base_url}/blog/{p["handle"]}</loc><lastmod>{date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>""")
    except: pass
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{chr(10).join(urls)}\n</urlset>"""
    return Response(xml, mimetype="application/xml")

@app.route("/robots.txt")
def robots():
    base=os.environ.get("APP_BASE_URL","https://aria.supportrd.com"); return Response(f"User-agent: *\nAllow: /blog\nDisallow: /api\nDisallow: /admin\n\nSitemap: {base}/sitemap.xml\n", mimetype="text/plain")

@app.route("/apps/hair-advisor")
def shopify_proxy():
    return index()

@app.route("/google65f6d985572e55c5.html")
def google_verify():
    return "google-site-verification: google65f6d985572e55c5.html"


# ── CONTENT ENGINE ────────────────────────────────────────────────────────────
ENGINE_LOG = []

@app.route("/api/content-engine/run", methods=["POST","OPTIONS"])
def content_engine_run():
    admin_key = request.headers.get("X-Admin-Key","")
    if admin_key != os.environ.get("ADMIN_KEY","srd_admin_2024"):
        return jsonify({"error":"Unauthorized"}), 401
    def run_in_background():
        entry = {"date":datetime.datetime.utcnow().isoformat(),"topic":"generating...","shopify_url":None,"pinterest":False,"reddit":False,"error":None}
        ENGINE_LOG.insert(0, entry)
        if len(ENGINE_LOG) > 50: ENGINE_LOG.pop()
        try:
            from content_engine import run_engine
            result = run_engine()
            if isinstance(result, dict): entry.update({"topic":result.get("topic","completed"),"shopify_url":result.get("shopify_url"),"pinterest":result.get("pinterest",False),"reddit":result.get("reddit",False)})
            else: entry["topic"] = "completed"
        except Exception as e:
            entry["error"] = str(e); entry["topic"] = "error"
    threading.Thread(target=run_in_background, daemon=True).start()
    return jsonify({"ok":True,"message":"Engine started in background"})

@app.route("/api/content-engine/log", methods=["GET"])
def content_engine_log():
    admin_key = request.args.get("admin_key","")
    if admin_key != os.environ.get("ADMIN_KEY","srd_admin_2024"):
        return jsonify({"error":"Unauthorized"}), 401
    return jsonify({"runs": ENGINE_LOG})


# ── MOVEMENT FEED ─────────────────────────────────────────────────────────────
import time as _time

_CITIES = [("Miami, FL","🇺🇸"),("New York, NY","🇺🇸"),("Los Angeles, CA","🇺🇸"),("Houston, TX","🇺🇸"),("Atlanta, GA","🇺🇸"),("Santo Domingo","🇩🇴"),("Santiago, DR","🇩🇴"),("San Juan, PR","🇵🇷"),("Bogotá","🇨🇴"),("Madrid","🇪🇸"),("Toronto","🇨🇦"),("London","🇬🇧"),("Paris","🇫🇷")]
_PRODUCTS = ["Formula Exclusiva","Laciador Crece","Gotero Rapido","Gotitas Brillantes"]
_CONCERNS = ["damaged hair","dry hair","frizzy hair","oily scalp","hair thinning","lack of shine"]
_ACTIONS  = ["just ordered {product}","found their solution for {concern}","recommended {product} to a client","reordered {product} for their salon","discovered {product} for {concern}"]

def _make_movement_event(source="simulated", mins_ago=None):
    city, flag = random.choice(_CITIES)
    product = random.choice(_PRODUCTS)
    concern = random.choice(_CONCERNS)
    action = random.choice(_ACTIONS).format(product=product, concern=concern)
    if mins_ago is None: mins_ago = random.randint(0, 55)
    ts = datetime.datetime.utcnow() - datetime.timedelta(minutes=mins_ago)
    return {"id":int(_time.time()*1000)+random.randint(0,999),"city":city,"flag":flag,"action":action,"product":product,"ts":ts.isoformat(),"source":source}

_MOVEMENT_EVENTS = [_make_movement_event(mins_ago=random.randint(1,55)) for _ in range(15)]

@app.route("/api/movement", methods=["GET","OPTIONS"])
def movement():
    live = []
    try:
        con = get_analytics_db()
        rows = con.execute("SELECT ts,lang,product FROM events ORDER BY id DESC LIMIT 30").fetchall()
        con.close()
        lang_city = {"en-US":[("New York, NY","🇺🇸"),("Miami, FL","🇺🇸")],"es-ES":[("Madrid","🇪🇸")],"fr-FR":[("Paris","🇫🇷")],"pt-BR":[("Bogotá","🇨🇴")]}
        for (ts, lang, product) in rows:
            if not product or product == "Unknown": continue
            city, flag = random.choice(lang_city.get(lang,[("Miami, FL","🇺🇸")]))
            live.append({"id":hash(ts+product)%999999,"city":city,"flag":flag,"action":f"just ordered {product}","product":product,"ts":ts,"source":"real"})
    except Exception as e:
        print("Movement error:", e)
    _MOVEMENT_EVENTS.insert(0, _make_movement_event(mins_ago=0))
    if len(_MOVEMENT_EVENTS) > 50: _MOVEMENT_EVENTS.pop()
    combined = (live + _MOVEMENT_EVENTS)[:15]
    return jsonify({"events":combined,"total":len(combined)+random.randint(80,140)})

@app.route("/api/add-movement", methods=["POST","OPTIONS"])
def add_movement():
    data = request.get_json()
    action = data.get("action","")
    if not action: return jsonify({"error":"action required"}), 400
    event = {"id":int(_time.time()*1000),"city":data.get("city","United States"),"flag":data.get("flag","🇺🇸"),"action":action,"product":data.get("product",""),"ts":datetime.datetime.utcnow().isoformat(),"source":"transcript"}
    _MOVEMENT_EVENTS.insert(0, event)
    return jsonify({"ok":True,"event":event})


# ── ADMIN CODES PAGE ──────────────────────────────────────────────────────────
@app.route("/admin-codes")
def admin_codes_page():
    admin_key = request.args.get("key","")
    if admin_key != os.environ.get("ADMIN_KEY","srd_admin_2024"):
        return "<h2>Unauthorized</h2>", 401
    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SupportRD — Premium Codes</title>
<style>body{{font-family:'Helvetica Neue',sans-serif;max-width:700px;margin:40px auto;padding:20px;background:#faf9f8;color:#0d0906;}}h1{{font-size:22px;color:#c1a3a2;margin-bottom:4px;}}p{{font-size:13px;color:rgba(0,0,0,0.4);margin-bottom:30px;}}button{{padding:12px 28px;background:#c1a3a2;color:#fff;border:none;border-radius:24px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;}}button:hover{{background:#9d7f6a;}}#result{{margin-top:20px;padding:16px;background:#fff;border:1px solid rgba(193,163,162,0.3);border-radius:12px;display:none;}}#code-display{{font-size:28px;font-weight:bold;color:#c1a3a2;letter-spacing:0.1em;margin:8px 0;}}table{{width:100%;border-collapse:collapse;margin-top:30px;}}th{{background:#c1a3a2;color:#fff;padding:10px 14px;font-size:11px;text-align:left;}}td{{padding:10px 14px;font-size:13px;border-bottom:1px solid rgba(0,0,0,0.05);}}
</style></head><body>
<h1>✦ Premium Codes</h1><p>Generate a code for each customer who purchases Hair Advisor Premium.</p>
<button onclick="generateCode()">Generate New Code</button>
<div id="result"><div id="code-display"></div><button onclick="copyCode()" style="margin-top:8px;padding:8px 20px;font-size:11px;">Copy</button></div>
<div id="codes-table"></div>
<script>
var ADMIN_KEY='{admin_key}';var lastCode='';
function generateCode(){{var xhr=new XMLHttpRequest();xhr.open('POST','/api/admin/generate-code',true);xhr.setRequestHeader('X-Admin-Key',ADMIN_KEY);xhr.setRequestHeader('Content-Type','application/json');xhr.onload=function(){{var d=JSON.parse(xhr.responseText);if(d.ok){{lastCode=d.code;document.getElementById('code-display').textContent=d.code;document.getElementById('result').style.display='block';loadCodes();}}}};xhr.send('{{}}');}}
function copyCode(){{navigator.clipboard.writeText(lastCode);}}
function loadCodes(){{var xhr=new XMLHttpRequest();xhr.open('GET','/api/admin/list-codes',true);xhr.setRequestHeader('X-Admin-Key',ADMIN_KEY);xhr.onload=function(){{var d=JSON.parse(xhr.responseText);var codes=d.codes||[];var html='<table><tr><th>Code</th><th>Status</th><th>Used At</th></tr>';codes.forEach(function(c){{html+='<tr><td>'+(c.used?'<s>'+c.code+'</s>':c.code)+'</td><td>'+(c.used?'Used':'Available')+'</td><td>'+(c.used_at||'—')+'</td></tr>';}});html+='</table>';document.getElementById('codes-table').innerHTML=html;}};xhr.send();}}
loadCodes();
</script></body></html>"""


# ── DEBUG ENDPOINTS ───────────────────────────────────────────────────────────
@app.route("/api/debug-stripe")
def debug_stripe():
    return jsonify({"stripe_key_set":bool(STRIPE_SECRET_KEY),"price_id_set":bool(STRIPE_PRICE_ID),"webhook_set":bool(STRIPE_WEBHOOK_SECRET),"app_base_url":APP_BASE_URL})

@app.route("/api/test-register")
def test_register():
    try:
        con = get_db()
        con.execute("SELECT count(*) FROM users").fetchone()
        con.close()
        return jsonify({"ok":True,"db":"connected","auth_db_path":AUTH_DB})
    except Exception as e:
        return jsonify({"ok":False,"error":str(e)})


# ── CONTENT ENGINE SCHEDULER ──────────────────────────────────────────────────
def _start_content_scheduler():
    import time as _t
    def _pick_todays_times():
        import random as _r
        today = datetime.datetime.utcnow().date()
        seed = int(today.strftime("%Y%m%d"))
        rng = _r.Random(seed)
        windows = [(7,11),(12,17),(18,23)]
        times = set()
        for lo, hi in windows:
            h = rng.randint(lo, hi); m = rng.randint(0, 59)
            times.add((h, m))
        return times
    _fired = set()
    _todays_times = _pick_todays_times()
    def _run_engine_bg():
        try:
            from content_engine import run_engine
            run_engine()
        except Exception as e:
            print(f"Scheduled engine error: {e}")
    def scheduler():
        nonlocal _fired, _todays_times
        _t.sleep(90)
        while True:
            now = datetime.datetime.utcnow()
            today = now.date()
            key = (today, now.hour, now.minute)
            if (now.hour, now.minute) in _todays_times and key not in _fired:
                _fired.add(key)
                threading.Thread(target=_run_engine_bg, daemon=True).start()
            _t.sleep(30)
    threading.Thread(target=scheduler, daemon=True).start()

_start_content_scheduler()



# ── TWILIO WHATSAPP + SMS (ARIA) ──────────────────────────────────────────────
TWILIO_ACCOUNT_SID  = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN   = os.environ.get("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP_NUM = os.environ.get("TWILIO_WHATSAPP_NUM", "")   # e.g. whatsapp:+14155238886
TWILIO_SMS_NUM      = os.environ.get("TWILIO_SMS_NUM", "")        # e.g. +18005551234

def _twilio_reply(to_number, body):
    """Send a reply via Twilio REST API (no SDK needed)."""
    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print("Twilio not configured"); return
    from_num = TWILIO_WHATSAPP_NUM if to_number.startswith("whatsapp:") else TWILIO_SMS_NUM
    if not from_num:
        print("No Twilio number configured for channel"); return
    import urllib.request as _ur, urllib.parse as _up, base64
    url  = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
    data = _up.urlencode({"From": from_num, "To": to_number, "Body": body}).encode()
    creds = base64.b64encode(f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()).decode()
    req  = _ur.Request(url, data=data, headers={"Authorization": f"Basic {creds}", "Content-Type": "application/x-www-form-urlencoded"}, method="POST")
    try:
        with _ur.urlopen(req, timeout=10) as r: r.read()
    except Exception as e:
        print(f"Twilio send error: {e}")

def _aria_twilio_response(user_text, phone, is_premium, user=None):
    """Call Claude as Aria and return the reply text."""
    profile_context = ""
    if user and is_premium:
        profile = get_hair_profile(user["id"])
        if profile.get("hair_type") or profile.get("hair_concerns"):
            profile_context = f"""

RETURNING CLIENT PROFILE:
- Name: {user.get("name","this client")}
- Hair type: {profile.get("hair_type","unknown")}
- Known concerns: {profile.get("hair_concerns","none saved")}
- Treatments history: {profile.get("treatments","none saved")}
- Products tried: {profile.get("products_tried","none saved")}
Reference this naturally in your response."""

    sms_instruction = """

SMS/WHATSAPP RULES:
- Keep replies under 300 characters — this is a text message.
- Be warm, direct, no bullet points.
- End with a product name when relevant."""

    prompt = SYSTEM_PROMPT + profile_context + sms_instruction
    max_tok = 200 if is_premium else 80

    # Build message history for premium users
    messages = []
    if user and is_premium:
        history = get_chat_history(user["id"], limit=10)
        for h in history[:-1]:
            if h.get("role") in ("user","assistant") and h.get("content"):
                messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_text})

    import urllib.request as _ur
    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": max_tok,
        "system": prompt,
        "messages": messages
    }).encode()
    req = _ur.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
        method="POST"
    )
    with _ur.urlopen(req, timeout=25) as r:
        result = json.loads(r.read())
    return result["content"][0]["text"].strip()

def _lookup_user_by_phone(phone):
    """Look up a user by their phone number (stripped of whatsapp: prefix)."""
    clean = phone.replace("whatsapp:","").strip()
    con = get_db()
    row = con.execute("SELECT id,email,name FROM users WHERE phone=?", (clean,)).fetchone()
    con.close()
    if row: return {"id": row[0], "email": row[1], "name": row[2]}
    return None

def _ensure_phone_column():
    """Add phone column to users table if not exists."""
    try:
        db_execute("ALTER TABLE users ADD COLUMN phone TEXT")
    except: pass  # already exists

_ensure_phone_column()

@app.route("/api/twilio/whatsapp", methods=["POST"])
def twilio_whatsapp():
    """Twilio webhook for incoming WhatsApp messages."""
    from_num  = request.form.get("From","")   # e.g. whatsapp:+1234567890
    body      = (request.form.get("Body","") or "").strip()
    if not from_num or not body:
        return Response("<Response></Response>", mimetype="text/xml")

    def handle():
        try:
            # Look up user by phone
            user       = _lookup_user_by_phone(from_num)
            is_premium = is_subscribed(user["id"]) if user else False

            if not is_premium:
                # Short reply + upgrade link for free/unregistered users
                try:
                    reply = _aria_twilio_response(body, from_num, False, user)
                except Exception as e:
                    reply = "Hi! I'm Aria, your SupportRD hair advisor. I can help with all your hair concerns!"
                reply += f"\n\n✦ Unlock full Aria sessions at aria.supportrd.com/dashboard"
            else:
                reply = _aria_twilio_response(body, from_num, True, user)
                if user: save_chat_message(user["id"], "user", body)
                if user: save_chat_message(user["id"], "assistant", reply)

            _twilio_reply(from_num, reply)
        except Exception as e:
            print(f"WhatsApp handler error: {e}")
            _twilio_reply(from_num, "Hi! I'm Aria from SupportRD. Visit aria.supportrd.com/dashboard to chat with me!")

    threading.Thread(target=handle, daemon=True).start()
    # Twilio needs an immediate 200 response
    return Response("<Response></Response>", mimetype="text/xml")

@app.route("/api/twilio/sms", methods=["POST"])
def twilio_sms():
    """Twilio webhook for incoming SMS messages."""
    from_num  = request.form.get("From","")   # e.g. +1234567890
    body      = (request.form.get("Body","") or "").strip()
    if not from_num or not body:
        return Response("<Response></Response>", mimetype="text/xml")

    def handle():
        try:
            user       = _lookup_user_by_phone(from_num)
            is_premium = is_subscribed(user["id"]) if user else False

            if not is_premium:
                try:
                    reply = _aria_twilio_response(body, from_num, False, user)
                except:
                    reply = "Hi! I'm Aria, SupportRD's hair advisor. I can help with all your hair concerns!"
                reply += f"\nUnlock full sessions: aria.supportrd.com/dashboard"
            else:
                reply = _aria_twilio_response(body, from_num, True, user)
                if user: save_chat_message(user["id"], "user", body)
                if user: save_chat_message(user["id"], "assistant", reply)

            _twilio_reply(from_num, reply)
        except Exception as e:
            print(f"SMS handler error: {e}")
            _twilio_reply(from_num, "Hi! I'm Aria from SupportRD. Visit aria.supportrd.com/dashboard to chat!")

    threading.Thread(target=handle, daemon=True).start()
    return Response("<Response></Response>", mimetype="text/xml")

@app.route("/api/twilio/link-phone", methods=["POST","OPTIONS"])
def link_phone():
    """Let a logged-in premium user link their phone number to their account."""
    user = get_current_user()
    if not user: return jsonify({"error":"Not logged in"}), 401
    if not is_subscribed(user["id"]): return jsonify({"error":"premium_required"}), 403
    data  = request.get_json(silent=True) or {}
    phone = (data.get("phone","") or "").strip().replace(" ","").replace("-","").replace("(","").replace(")","")
    if not phone or not phone.startswith("+"): return jsonify({"error":"Please enter phone in format +1234567890"}), 400
    db_execute("UPDATE users SET phone=? WHERE id=?", (phone, user["id"]))
    return jsonify({"ok": True, "phone": phone})


# ── PWA MANIFEST + SERVICE WORKER ────────────────────────────────────────────
@app.route("/manifest.json")
def pwa_manifest():
    manifest = {
        "name": "Aria — SupportRD Hair Advisor",
        "short_name": "Aria",
        "description": "Your personal AI hair advisor from SupportRD",
        "start_url": "/dashboard",
        "display": "standalone",
        "background_color": "#f0ebe8",
        "theme_color": "#c1a3a2",
        "orientation": "portrait",
        "id": "/dashboard",
        "icons": [
            {
                "src": "https://cdn.shopify.com/s/files/1/0593/2715/2208/files/output-onlinepngtools.png?v=1773174838",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "https://cdn.shopify.com/s/files/1/0593/2715/2208/files/output-onlinepngtools_1.png?v=1773174845",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "https://cdn.shopify.com/s/files/1/0593/2715/2208/files/output-onlinepngtools_1.png?v=1773174845",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable"
            }
        ],
        "categories": ["health", "beauty", "lifestyle"],
        "shortcuts": [
            {
                "name": "Chat with Aria",
                "url": "/",
                "description": "Start a hair consultation",
                "icons": [{"src": "https://cdn.shopify.com/s/files/1/0593/2715/2208/files/output-onlinepngtools.png?v=1773174838", "sizes": "96x96", "type": "image/png"}]
            },
            {
                "name": "My Dashboard",
                "url": "/dashboard",
                "description": "View your hair health dashboard",
                "icons": [{"src": "https://cdn.shopify.com/s/files/1/0593/2715/2208/files/output-onlinepngtools.png?v=1773174838", "sizes": "96x96", "type": "image/png"}]
            }
        ]
    }
    from flask import Response as _Resp
    import json as _json
    return _Resp(_json.dumps(manifest), mimetype="application/manifest+json")

@app.route("/sw.js")
def service_worker():
    sw = """
const CACHE = 'aria-v1';
const OFFLINE = ['/'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(OFFLINE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  if(e.request.url.includes('/api/')) return;
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(r => r || caches.match('/'))
    )
  );
});
""".strip()
    from flask import Response as _Resp
    return _Resp(sw, mimetype="application/javascript", headers={"Service-Worker-Allowed": "/"})

# ── KEEP-ALIVE ────────────────────────────────────────────────────────────────
def _keep_alive():
    import time, urllib.request as _urlreq
    _url = os.environ.get("APP_BASE_URL","https://aria.supportrd.com") + "/api/ping"
    time.sleep(60)
    while True:
        time.sleep(600)
        try: _urlreq.urlopen(_url, timeout=10)
        except: pass

threading.Thread(target=_keep_alive, daemon=True).start()


# ── RUNNER ────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
