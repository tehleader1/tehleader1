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
    for col in ["porosity TEXT","scalp TEXT","wash_freq TEXT","heat_styling TEXT","environment TEXT","goals TEXT"]:
        try: con.execute(f"ALTER TABLE hair_profiles ADD COLUMN {col}"); con.commit()
        except: pass
    row = con.execute("SELECT * FROM hair_profiles WHERE user_id=?", (user_id,)).fetchone()
    if not row: con.close(); return {}
    cols = [d[0] for d in con.execute("SELECT * FROM hair_profiles LIMIT 0").description]
    con.close()
    d = dict(zip(cols, row))
    return {"hair_type":d.get("hair_type",""),"hair_concerns":d.get("hair_concerns",""),
            "treatments":d.get("treatments",""),"products_tried":d.get("products_tried",""),
            "porosity":d.get("porosity",""),"scalp":d.get("scalp",""),
            "wash_freq":d.get("wash_freq",""),"heat_styling":d.get("heat_styling",""),
            "environment":d.get("environment",""),"goals":d.get("goals","")}

def save_hair_profile(user_id, data):
    con = get_db()
    for col in ["porosity TEXT","scalp TEXT","wash_freq TEXT","heat_styling TEXT","environment TEXT","goals TEXT"]:
        try: con.execute(f"ALTER TABLE hair_profiles ADD COLUMN {col}"); con.commit()
        except: pass
    con.execute("""INSERT INTO hair_profiles (user_id,hair_type,hair_concerns,treatments,products_tried,porosity,scalp,wash_freq,heat_styling,environment,goals)
        VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
        hair_type=excluded.hair_type, hair_concerns=excluded.hair_concerns,
        treatments=excluded.treatments, products_tried=excluded.products_tried,
        porosity=excluded.porosity, scalp=excluded.scalp, wash_freq=excluded.wash_freq,
        heat_styling=excluded.heat_styling, environment=excluded.environment, goals=excluded.goals,
        last_updated=datetime('now')""",
        (user_id, data.get("hair_type",""), data.get("hair_concerns",""),
         data.get("treatments",""), data.get("products_tried",""),
         data.get("porosity",""), data.get("scalp",""), data.get("wash_freq",""),
         data.get("heat_styling",""), data.get("environment",""), data.get("goals","")))
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
    if "gotero" in t or "rapido" in t or "rápido" in t: return "Gotero Rapido"
    if "gotitas" in t or "brillantes" in t or "gotika" in t: return "Gotitas Brillantes"
    if "mascarilla" in t: return "Mascarilla Natural"
    if "shampoo" in t or "aloe" in t or "romero" in t: return "Shampoo Aloe & Romero"
    return "Unknown"

# Product metadata for recommendation cards shown in chat
PRODUCT_CARDS = {
    "Formula Exclusiva": {
        "name": "Formula Exclusiva",
        "emoji": "🌿",
        "tagline": "Professional all-in-one repair treatment",
        "best_for": "Damaged, weak, breaking or thinning hair",
        "price": "$55",
        "order_url": "https://supportrd.com/pages/custom-order?product=formula-exclusiva"
    },
    "Laciador Crece": {
        "name": "Laciador Crece",
        "emoji": "✨",
        "tagline": "Restructurer for softness, shine & growth",
        "best_for": "Dry hair, frizz, lack of shine, styling",
        "price": "$40",
        "order_url": "https://supportrd.com/pages/custom-order?product=laciador-crece"
    },
    "Gotero Rapido": {
        "name": "Gotero Rápido",
        "emoji": "💧",
        "tagline": "Fast-acting scalp & growth serum",
        "best_for": "Hair loss, slow growth, scalp issues",
        "price": "$55",
        "order_url": "https://supportrd.com/pages/custom-order?product=gotero-rapido"
    },
    "Gotitas Brillantes": {
        "name": "Gotitas Brillantes",
        "emoji": "🎨",
        "tagline": "Finishing drops for shine & softness",
        "best_for": "Shine, frizz control, styling finish",
        "price": "$30",
        "order_url": "https://supportrd.com/pages/custom-order?product=gotitas-brillantes"
    },
    "Mascarilla Natural": {
        "name": "Mascarilla Natural",
        "emoji": "🥑",
        "tagline": "Deep conditioning avocado mask",
        "best_for": "Deep conditioning, dry or damaged hair",
        "price": "$25",
        "order_url": "https://supportrd.com/pages/custom-order?product=mascarilla"
    },
    "Shampoo Aloe & Romero": {
        "name": "Shampoo Aloe & Romero",
        "emoji": "🌱",
        "tagline": "Cleansing shampoo with aloe & rosemary",
        "best_for": "Scalp stimulation, daily cleanse, growth",
        "price": "$20",
        "order_url": "https://supportrd.com/pages/custom-order?product=shampoo-aloe"
    }
}

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
SYSTEM_PROMPT = """You are Aria — a warm, confident hair advisor for SupportRD, a professional Dominican hair care brand.

RULE #1 — RECOMMEND FAST: In your FIRST or SECOND response, always name the specific SupportRD product that fits the user's concern. Do NOT ask multiple questions before recommending. Give your recommendation, then ask ONE follow-up question if needed.

RULE #2 — PRODUCT NAMES: Always use the EXACT product names below. Never abbreviate or paraphrase product names.

RULE #3 — ORDERING: When you recommend a product, always add: "You can request it at supportrd.com/pages/custom-order" — the customer fills out the form and the team contacts them. This is how SupportRD takes orders. Do NOT say there is no order page or that you cannot place orders.

RULE #4 — ONLY SupportRD: Never mention outside brands (Olaplex, Redken, Pantene, etc.). Redirect warmly.

RULE #5 — PRODUCT TAG (CRITICAL): At the very end of EVERY response where you recommend a product, append this exact tag on a new line with NO spaces:
[PRODUCT:Formula Exclusiva] or [PRODUCT:Laciador Crece] or [PRODUCT:Gotero Rapido] or [PRODUCT:Gotitas Brillantes] or [PRODUCT:Mascarilla Natural] or [PRODUCT:Shampoo Aloe & Romero]
If no specific product applies, do NOT include the tag. The user will NOT see this tag.

YOUR 6 PRODUCTS (use these EXACT names):
- Formula Exclusiva ($55): All-in-one treatment. Best for: damaged, weak, breaking, thinning, severely dry hair.
- Laciador Crece ($40): Restructurer for softness, shine, growth. Best for: dry, frizzy hair, lack of shine, growth.
- Gotero Rapido ($55): Scalp dropper, nightly use. Best for: hair loss, slow growth, scalp issues, thinning.
- Gotitas Brillantes ($30): Finishing drops for shine. Best for: shine, frizz control, styling finish.
- Mascarilla Natural ($25): Deep conditioning mask. Best for: deep conditioning, dry or damaged hair.
- Shampoo Aloe & Romero ($20): Cleansing + growth shampoo. Best for: scalp stimulation, daily cleanse, growth.

QUICK MATCH GUIDE:
- Breaking / damaged / weak → Formula Exclusiva
- Dry / frizzy / no shine → Laciador Crece
- Hair loss / scalp / slow growth → Gotero Rapido
- Shine / finishing touch → Gotitas Brillantes
- Deep conditioning → Mascarilla Natural
- Cleanse / scalp / daily → Shampoo Aloe & Romero

STYLE:
- Warm and confident, like a knowledgeable friend. 2-4 sentences max.
- Lead with the solution, not with questions.
- Never say "I recommend" — say "For your hair, [Product] is exactly what you need."
- Occasionally mention: "For a 1-on-1 chat with a live advisor, WhatsApp us at 829-233-2670"

Respond ONLY with your answer + optional product tag. No preamble. No "Sure!" or "Of course!".
If the language code indicates non-English, respond entirely in that language (but keep the [PRODUCT:...] tag in English)."""


# ── SUBSCRIPTION CONSTANTS (needed before index route) ────────────────────────
# Stripe removed — payments via Shopify only
FREE_RESPONSE_LIMIT    = 50
FREE_RESPONSE_PERIOD   = "weekly"   # reset every 7 days
SUBSCRIPTION_PRICE_USD = 80
APP_BASE_URL           = os.environ.get("APP_BASE_URL", "https://ai-hair-advisor.onrender.com")
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
    # Push notification subscriptions
    con.execute("""CREATE TABLE IF NOT EXISTS upgrade_ideas (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        user_email  TEXT,
        user_name   TEXT,
        idea_title  TEXT NOT NULL,
        idea_desc   TEXT NOT NULL,
        code_snippet TEXT,
        status      TEXT DEFAULT 'pending',
        submitted_at TEXT DEFAULT (datetime('now')),
        reviewed_at  TEXT,
        admin_note   TEXT
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS push_subscriptions (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        endpoint   TEXT NOT NULL,
        p256dh     TEXT NOT NULL,
        auth       TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(user_id, endpoint)
    )""")
    # Hair journal entries
    con.execute("""CREATE TABLE IF NOT EXISTS hair_journal (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id    INTEGER NOT NULL,
        note       TEXT NOT NULL,
        image_b64  TEXT,
        hair_rating INTEGER DEFAULT 3,
        aria_insight TEXT,
        ts         TEXT DEFAULT (datetime('now'))
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

def is_admin_user(user_id):
    """Returns True if this user's email matches the ADMIN_EMAIL env var."""
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if not admin_email:
        return False
    row = db_execute("SELECT email FROM users WHERE id=?", (user_id,), fetchone=True)
    if row and row[0].strip().lower() == admin_email:
        return True
    return False

def is_subscribed(user_id):
    # Admin bypass — always premium, no purchase needed
    if is_admin_user(user_id):
        return True
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
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="msvalidate.01" content="3F286CDF7ADFCEB2065F8D5EA5DE84F3">
<meta name="google-site-verification" content="google65f6d985572e55c5">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Aria">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="https://cdn.shopify.com/s/files/1/0593/2715/2208/files/output-onlinepngtools_1.png?v=1773174845">
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
body{background:radial-gradient(ellipse at 50% 60%,#e8e0da 0%,var(--brand-bg) 100%);color:var(--brand-text);font-family:var(--brand-font-body);font-weight:300;display:flex;flex-direction:column;align-items:center;min-height:100vh;overflow-x:hidden;overflow-y:auto;user-select:none;padding-bottom:24px;}

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

#history{width:420px;max-width:92vw;max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;margin-top:18px;padding:0 4px 10px;scrollbar-width:thin;scrollbar-color:rgba(193,163,162,0.3) transparent;}
#history:empty{display:none;}
.msg{padding:10px 16px;border-radius:18px;font-size:14px;line-height:1.55;max-width:88%;animation:fadeIn 0.4s ease;}
@keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;}}
.msg.user{background:rgba(0,0,0,0.10);color:rgba(0,0,0,0.75);align-self:flex-end;border-bottom-right-radius:4px;font-family:var(--brand-font-body);}
.msg.ai{background:rgba(193,163,162,0.20);color:rgba(0,0,0,0.85);align-self:flex-start;border-bottom-left-radius:4px;font-family:var(--brand-font-head);font-style:italic;font-size:15px;border:1px solid rgba(193,163,162,0.25);}
/* ── Product Recommendation Card ── */
.srd-product-card{align-self:flex-start;width:100%;max-width:320px;animation:fadeIn 0.5s ease 0.2s both;}
.srd-card-inner{background:linear-gradient(135deg,rgba(193,163,162,0.15),rgba(212,168,90,0.10));border:1px solid rgba(193,163,162,0.35);border-radius:16px;padding:14px 16px;backdrop-filter:blur(8px);}
.srd-card-top{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
.srd-card-emoji{font-size:28px;line-height:1;flex-shrink:0;}
.srd-card-info{flex:1;}
.srd-card-name{font-family:var(--brand-font-head);font-size:15px;font-weight:600;color:#3a2a1a;letter-spacing:0.01em;}
.srd-card-tagline{font-size:12px;color:rgba(0,0,0,0.50);font-style:italic;margin-top:1px;}
.srd-card-price{font-family:var(--brand-font-head);font-size:16px;font-weight:700;color:#c1a3a2;flex-shrink:0;}
.srd-card-best{font-size:11px;color:rgba(0,0,0,0.45);letter-spacing:0.04em;margin-bottom:10px;padding-left:2px;}
.srd-card-btn{display:block;text-align:center;background:linear-gradient(135deg,#c1a3a2,#d4a85a);color:#fff;font-family:var(--brand-font-body);font-size:13px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;padding:10px 16px;border-radius:10px;transition:opacity 0.2s,transform 0.2s;}
.srd-card-btn:hover{opacity:0.88;transform:translateY(-1px);}

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

<!-- ═══════════════════════════════════════════════════════
     PREMIUM FEATURES SHOWCASE — scrolls under the hero
     ═══════════════════════════════════════════════════════ -->
<section id="featuresShowcase">

  <div class="fs-eyebrow">Everything inside Premium</div>
  <h2 class="fs-headline">Your hair. Understood.</h2>
  <p class="fs-sub">One subscription. Every tool your hair has been waiting for.</p>

  <div class="fs-track" id="fsTrack">

    <div class="fs-card" data-index="0">
      <div class="fs-card-glow"></div>
      <div class="fs-icon">🧬</div>
      <div class="fs-tag">AI-Powered</div>
      <h3 class="fs-card-title">Unlimited Aria Conversations</h3>
      <p class="fs-card-desc">Ask Aria anything about your hair — any time, any language. She remembers your profile, your products, your history. No limits, no resets.</p>
      <div class="fs-detail">Available in 24 languages · Hands-free voice mode · Instant product recommendations</div>
    </div>

    <div class="fs-card" data-index="1">
      <div class="fs-card-glow"></div>
      <div class="fs-icon">📊</div>
      <div class="fs-tag">Health Tracking</div>
      <h3 class="fs-card-title">Hair Health Score</h3>
      <p class="fs-card-desc">Your personal hair health number, tracked over time. Watch it climb as your routine improves. See exactly what's working and what isn't.</p>
      <div class="fs-detail">Weekly scoring · Progress graph · Aria insight summaries</div>
    </div>

    <div class="fs-card" data-index="2">
      <div class="fs-card-glow"></div>
      <div class="fs-icon">📅</div>
      <div class="fs-tag">Personalized</div>
      <h3 class="fs-card-title">7-Day Hair Routine</h3>
      <p class="fs-card-desc">A full week of care built specifically for your hair type, damage level, and lifestyle. Not generic. Not copy-paste. Yours.</p>
      <div class="fs-detail">Built from your profile · SupportRD product integration · Refresh anytime</div>
    </div>

    <div class="fs-card" data-index="3">
      <div class="fs-card-glow"></div>
      <div class="fs-icon">📸</div>
      <div class="fs-tag">Visual AI</div>
      <h3 class="fs-card-title">Photo Hair Analysis</h3>
      <p class="fs-card-desc">Upload a photo of your hair and get an instant AI read — damage, porosity, breakage, scalp health. See what your mirror can't tell you.</p>
      <div class="fs-detail">Damage detection · Porosity assessment · Before/after comparison</div>
    </div>

    <div class="fs-card" data-index="4">
      <div class="fs-card-glow"></div>
      <div class="fs-icon">📓</div>
      <div class="fs-tag">Progress Journal</div>
      <h3 class="fs-card-title">Hair Journal</h3>
      <p class="fs-card-desc">Log your treatments, wash days, and observations. Aria reads your entries and spots patterns you'd never catch on your own.</p>
      <div class="fs-detail">Daily logging · AI pattern detection · Treatment tracking</div>
    </div>

    <div class="fs-card" data-index="5">
      <div class="fs-card-glow"></div>
      <div class="fs-icon">💬</div>
      <div class="fs-tag">Always On</div>
      <h3 class="fs-card-title">Aria via SMS & WhatsApp</h3>
      <p class="fs-card-desc">Text Aria from anywhere. At the salon, in the shower, at 2am when your edges are acting up. She's there. No app needed.</p>
      <div class="fs-detail">SMS + WhatsApp · Same AI, anywhere · Instant responses</div>
    </div>

    <div class="fs-card" data-index="6">
      <div class="fs-card-glow"></div>
      <div class="fs-icon">🌿</div>
      <div class="fs-tag">Dominican Formula</div>
      <h3 class="fs-card-title">Personalized Product Matching</h3>
      <p class="fs-card-desc">Every recommendation is matched to your specific concerns. Formula Exclusiva for damage. Gotero Rapido for growth. Never guessing again.</p>
      <div class="fs-detail">6 professional formulas · Custom-order direct · Free consultation with every order</div>
    </div>

  </div>

  <div class="fs-dots" id="fsDots">
    <span class="fs-dot active" data-i="0"></span>
    <span class="fs-dot" data-i="1"></span>
    <span class="fs-dot" data-i="2"></span>
    <span class="fs-dot" data-i="3"></span>
    <span class="fs-dot" data-i="4"></span>
    <span class="fs-dot" data-i="5"></span>
    <span class="fs-dot" data-i="6"></span>
  </div>

  <div class="fs-cta-wrap">
    <div class="fs-price">$35 <span>/month</span></div>
    <div class="fs-price-note">Cancel anytime · Instant access · All 7 features included</div>
    <button class="fs-cta-btn" onclick="goUpgrade()">Unlock Premium →</button>
  </div>

</section>

<style>
/* ── FEATURES SHOWCASE ── */
#featuresShowcase {
  width: 100%;
  padding: 64px 0 72px;
  background: linear-gradient(180deg, #fff9f8 0%, #ffffff 100%);
  overflow: hidden;
  font-family: 'Jost', sans-serif;
}

.fs-eyebrow {
  text-align: center;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: #c1a3a2;
  margin-bottom: 12px;
  font-weight: 600;
}

.fs-headline {
  text-align: center;
  font-size: clamp(28px, 6vw, 42px);
  font-weight: 300;
  color: #1a1a1a;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
  font-family: 'Cormorant Garamond', 'Georgia', serif;
}

.fs-sub {
  text-align: center;
  font-size: 14px;
  color: #888;
  margin: 0 auto 48px;
  max-width: 320px;
  line-height: 1.6;
}

/* ── SCROLLING TRACK ── */
.fs-track {
  display: flex;
  gap: 16px;
  padding: 0 24px 24px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  cursor: grab;
}
.fs-track::-webkit-scrollbar { display: none; }
.fs-track.is-dragging { cursor: grabbing; }

/* ── CARDS ── */
.fs-card {
  min-width: calc(100vw - 64px);
  max-width: 360px;
  background: #fff;
  border: 1px solid rgba(193,163,162,0.18);
  border-radius: 24px;
  padding: 32px 28px 28px;
  scroll-snap-align: center;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 32px rgba(193,163,162,0.12);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  opacity: 0;
  transform: translateY(20px);
  animation: fsCardIn 0.5s ease forwards;
}
.fs-card:nth-child(1) { animation-delay: 0.1s; }
.fs-card:nth-child(2) { animation-delay: 0.15s; }
.fs-card:nth-child(3) { animation-delay: 0.2s; }
.fs-card:nth-child(4) { animation-delay: 0.25s; }
.fs-card:nth-child(5) { animation-delay: 0.3s; }
.fs-card:nth-child(6) { animation-delay: 0.35s; }
.fs-card:nth-child(7) { animation-delay: 0.4s; }

@keyframes fsCardIn {
  to { opacity: 1; transform: translateY(0); }
}

.fs-card-glow {
  position: absolute;
  top: -40px; right: -40px;
  width: 140px; height: 140px;
  background: radial-gradient(circle, rgba(193,163,162,0.18) 0%, transparent 70%);
  pointer-events: none;
}

.fs-icon {
  font-size: 36px;
  margin-bottom: 16px;
  display: block;
}

.fs-tag {
  display: inline-block;
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #c1a3a2;
  background: rgba(193,163,162,0.10);
  padding: 4px 10px;
  border-radius: 20px;
  margin-bottom: 14px;
  font-weight: 600;
}

.fs-card-title {
  font-size: 22px;
  font-weight: 400;
  color: #1a1a1a;
  margin: 0 0 12px;
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.fs-card-desc {
  font-size: 14px;
  color: #555;
  line-height: 1.65;
  margin: 0 0 20px;
}

.fs-detail {
  font-size: 11px;
  color: #c1a3a2;
  letter-spacing: 0.04em;
  border-top: 1px solid rgba(193,163,162,0.15);
  padding-top: 16px;
  line-height: 1.8;
}

/* ── DOTS ── */
.fs-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 20px 0 0;
}
.fs-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(193,163,162,0.25);
  cursor: pointer;
  transition: all 0.3s ease;
}
.fs-dot.active {
  width: 22px;
  border-radius: 3px;
  background: #c1a3a2;
}

/* ── CTA ── */
.fs-cta-wrap {
  text-align: center;
  margin-top: 48px;
  padding: 0 24px;
}
.fs-price {
  font-size: 42px;
  font-weight: 300;
  color: #1a1a1a;
  font-family: 'Cormorant Garamond', 'Georgia', serif;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 6px;
}
.fs-price span {
  font-size: 16px;
  color: #888;
  font-family: 'Jost', sans-serif;
}
.fs-price-note {
  font-size: 12px;
  color: #aaa;
  letter-spacing: 0.04em;
  margin-bottom: 24px;
}
.fs-cta-btn {
  display: inline-block;
  background: #1a1a1a;
  color: #fff;
  border: none;
  padding: 16px 40px;
  border-radius: 50px;
  font-family: 'Jost', sans-serif;
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
}
.fs-cta-btn:hover {
  background: #c1a3a2;
  transform: translateY(-2px);
  box-shadow: 0 12px 40px rgba(193,163,162,0.4);
}

/* ── DESKTOP ── */
@media(min-width: 640px) {
  .fs-track {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    overflow-x: visible;
    padding: 0 32px 0;
    gap: 20px;
    scroll-snap-type: none;
  }
  .fs-card {
    min-width: unset;
    max-width: unset;
  }
  .fs-dots { display: none; }
}
</style>

<script>
// ── FEATURES CAROUSEL ──
(function(){
  const track = document.getElementById('fsTrack');
  const dots  = document.querySelectorAll('.fs-dot');
  if(!track) return;

  // Dot click navigation
  dots.forEach(d => {
    d.addEventListener('click', () => {
      const i     = parseInt(d.dataset.i);
      const cards = track.querySelectorAll('.fs-card');
      if(cards[i]) cards[i].scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
    });
  });

  // Update active dot on scroll
  track.addEventListener('scroll', () => {
    const cards = track.querySelectorAll('.fs-card');
    let closest = 0;
    let minDist  = Infinity;
    const center = track.scrollLeft + track.offsetWidth / 2;
    cards.forEach((c, i) => {
      const dist = Math.abs(c.offsetLeft + c.offsetWidth / 2 - center);
      if(dist < minDist){ minDist = dist; closest = i; }
    });
    dots.forEach((d, i) => d.classList.toggle('active', i === closest));
  }, {passive:true});

  // Drag to scroll
  let isDragging = false, startX = 0, scrollStart = 0;
  track.addEventListener('mousedown', e => {
    isDragging = true; startX = e.pageX; scrollStart = track.scrollLeft;
    track.classList.add('is-dragging');
  });
  document.addEventListener('mousemove', e => {
    if(!isDragging) return;
    track.scrollLeft = scrollStart - (e.pageX - startX);
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    track.classList.remove('is-dragging');
  });

  // Auto-scroll — pauses when user interacts
  let autoTimer, paused = false;
  function autoScroll(){
    if(paused) return;
    const cards = track.querySelectorAll('.fs-card');
    const dots2 = document.querySelectorAll('.fs-dot');
    let active  = 0;
    dots2.forEach((d,i) => { if(d.classList.contains('active')) active = i; });
    const next  = (active + 1) % cards.length;
    if(cards[next]) cards[next].scrollIntoView({behavior:'smooth', block:'nearest', inline:'center'});
  }
  autoTimer = setInterval(autoScroll, 3200);
  track.addEventListener('touchstart', () => { paused = true; clearInterval(autoTimer); }, {passive:true});
  track.addEventListener('mousedown',  () => { paused = true; clearInterval(autoTimer); });
})();
</script>

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

function addToHistory(role,text,productCard){
  conversationHistory.push({role,content:text});
  if(role==="assistant"){
    const t=text.toLowerCase();
    if(t.includes("formula exclusiva")) lastRecommendedProduct="Formula Exclusiva";
    else if(t.includes("laciador")||t.includes("crece")) lastRecommendedProduct="Laciador Crece";
    else if(t.includes("gotero")||t.includes("rapido")) lastRecommendedProduct="Gotero Rapido";
    else if(t.includes("gotitas")||t.includes("brillantes")) lastRecommendedProduct="Gotitas Brillantes";
    else if(t.includes("mascarilla")) lastRecommendedProduct="Mascarilla Natural";
    else if(t.includes("shampoo")||t.includes("aloe")||t.includes("romero")) lastRecommendedProduct="Shampoo Aloe & Romero";
  }
  const bubble=document.createElement("div");
  bubble.className="msg "+(role==="user"?"user":"ai");
  bubble.textContent=text;
  historyEl.appendChild(bubble);

  // Render product recommendation card after Aria's message
  if(role==="assistant" && productCard){
    const card=document.createElement("div");
    card.className="srd-product-card";
    card.innerHTML=`
      <div class="srd-card-inner">
        <div class="srd-card-top">
          <span class="srd-card-emoji">${productCard.emoji}</span>
          <div class="srd-card-info">
            <div class="srd-card-name">${productCard.name}</div>
            <div class="srd-card-tagline">${productCard.tagline}</div>
          </div>
          <div class="srd-card-price">${productCard.price}</div>
        </div>
        <div class="srd-card-best">✦ Best for: ${productCard.best_for}</div>
        <a class="srd-card-btn" href="${productCard.order_url}" target="_blank" rel="noopener">
          Request This Product →
        </a>
      </div>`;
    historyEl.appendChild(card);
  }

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
    const timeout=setTimeout(()=>controller.abort(),25000);
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
    if(data.recommendation) return {text: data.recommendation, product: data.suggested_product||null};
    if(data.reply) return {text: data.reply, product: null};
    throw new Error("empty");
  }catch(e){
    return {text: localRecommend(userText), product: null};
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
  const finalText=result.text||localRecommend(text);
  const finalProduct=result.product||null;
  addToHistory("assistant",finalText,finalProduct);
  setTimeout(()=>speak(finalText,true),400);
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
const _faqBtn=document.getElementById("faqBtn"); if(_faqBtn)_faqBtn.addEventListener("click",()=>{ const msg=FAQ_MSGS[langSelect.value]||FAQ_MSGS["en-US"]; responseBox.textContent=msg; speak(msg,false); });
const _contactBtn=document.getElementById("contactBtn"); if(_contactBtn)_contactBtn.addEventListener("click",()=>{ const msg=CONTACT_MSGS[langSelect.value]||CONTACT_MSGS["en-US"]; responseBox.textContent=msg; speak(msg,false); });

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
async function goUpgrade(){
  window.location.href='https://supportrd.com/products/hair-advisor-premium';
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
    max_tokens    = 350

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
        with urlreq.urlopen(req, timeout=20) as resp:
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

        # Parse [PRODUCT:...] tag Aria appends, then strip it from visible text
        import re as _re
        product_tag_match = _re.search(r'\[PRODUCT:([^\]]+)\]', recommendation)
        if product_tag_match:
            product = product_tag_match.group(1).strip()
            recommendation = _re.sub(r'\s*\[PRODUCT:[^\]]+\]', '', recommendation).strip()
        else:
            product = extract_product(recommendation)  # fallback

        concern = extract_concern(user_text)
        log_event(lang, user_text, product, concern)

        # Build product card
        product_card = PRODUCT_CARDS.get(product)

        return jsonify({
            "recommendation":  recommendation,
            "reply":           recommendation,
            "logged_in":       user is not None,
            "user_name":       user["name"] if user else None,
            "subscribed":      subscribed,
            "response_count":  new_count,
            "free_limit":      FREE_RESPONSE_LIMIT,
            "show_paywall":    False,
            "paywall_soft":    True,
            "suggested_product": product_card
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
- Porosity: {profile.get("porosity","unknown")}
- Scalp type: {profile.get("scalp","unknown")}
- Wash frequency: {profile.get("wash_freq","unknown")}
- Heat styling: {profile.get("heat_styling","unknown")}
- Environment: {profile.get("environment","unknown")}
- Goals: {profile.get("goals","not specified")}

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

@app.route("/api/auth/update-profile", methods=["POST","OPTIONS"])
def update_profile():
    if request.method=="OPTIONS": return "",204
    user = get_current_user()
    if not user: return jsonify({"error":"Not authenticated"}),401
    data = request.get_json(force=True) or {}
    name    = data.get("name","").strip()
    email   = data.get("email","").strip().lower()
    phone   = data.get("phone","").strip()
    address = data.get("address","").strip()
    city    = data.get("city","").strip()
    if not name or not email:
        return jsonify({"error":"Name and email required"}),400
    # Check email not taken by another user
    existing = db_execute("SELECT id FROM users WHERE email=? AND id!=?", (email, user["id"]), fetchone=True)
    if existing:
        return jsonify({"error":"That email is already in use"}),400
    db_execute("UPDATE users SET name=?, email=? WHERE id=?", (name, email, user["id"]))
    # Store extra fields in hair_profiles as metadata (phone/address)
    # We store them in a simple settings table if available, else ignore gracefully
    try:
        db_execute("CREATE TABLE IF NOT EXISTS user_settings (user_id INTEGER PRIMARY KEY, phone TEXT, address TEXT, city TEXT)")
        existing_s = db_execute("SELECT user_id FROM user_settings WHERE user_id=?", (user["id"],), fetchone=True)
        if existing_s:
            db_execute("UPDATE user_settings SET phone=?,address=?,city=? WHERE user_id=?", (phone,address,city,user["id"]))
        else:
            db_execute("INSERT INTO user_settings (user_id,phone,address,city) VALUES (?,?,?,?)", (user["id"],phone,address,city))
    except: pass
    return jsonify({"ok":True})

@app.route("/api/auth/change-password", methods=["POST","OPTIONS"])
def change_password():
    if request.method=="OPTIONS": return "",204
    user = get_current_user()
    if not user: return jsonify({"error":"Not authenticated"}),401
    data = request.get_json(force=True) or {}
    new_pass = data.get("new_password","")
    if not new_pass or len(new_pass)<6:
        return jsonify({"error":"Password must be at least 6 characters"}),400
    pw_hash = hashlib.sha256(new_pass.encode()).hexdigest()
    db_execute("UPDATE users SET password_hash=? WHERE id=?", (pw_hash, user["id"]))
    return jsonify({"ok":True})

@app.route("/api/auth/delete-account", methods=["DELETE","OPTIONS"])
def delete_account():
    if request.method=="OPTIONS": return "",204
    user = get_current_user()
    if not user: return jsonify({"error":"Not authenticated"}),401
    uid = user["id"]
    # Delete all user data
    for table in ["sessions","subscriptions","hair_profiles","photo_analyses","hair_journal","treatment_log","score_history","user_settings"]:
        try: db_execute(f"DELETE FROM {table} WHERE user_id=?", (uid,))
        except: pass
    db_execute("DELETE FROM users WHERE id=?", (uid,))
    return jsonify({"ok":True})

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

@app.route("/api/profile/ai-status", methods=["GET","OPTIONS"])
def profile_ai_status():
    user = get_current_user()
    if not user: return jsonify({"error":"Not logged in"}), 401
    profile = get_hair_profile(user["id"])
    # Get last photo analysis for context
    con = get_db()
    last_analysis = con.execute("SELECT analysis,ts FROM photo_analyses WHERE user_id=? ORDER BY ts DESC LIMIT 1",(user["id"],)).fetchone()
    con.close()
    analysis_ctx = ""
    if last_analysis:
        try:
            a = json.loads(last_analysis[0])
            analysis_ctx = f"Last scan ({last_analysis[1][:10]}): porosity={a.get('porosity','?')}, damage={a.get('damage_level','?')}, score={a.get('overall_health_score','?')}."
        except: pass
    prompt = f"""You are Aria, hair advisor for SupportRD. Write ONE uplifting, forward-looking sentence (max 30 words) about this client's hair journey. Make it personal, warm, and exciting — like they are leveling up. Reference their current products if they use any. Do NOT use quotes. Just the sentence.

Name: {user.get('name','this client')}
Hair type: {profile.get('hair_type','unknown')}
Concerns: {profile.get('hair_concerns','none listed')}
Products using: {profile.get('products_tried','none yet')}
{analysis_ctx}"""
    try:
        import urllib.request as urlreq
        payload = json.dumps({{"model":"claude-sonnet-4-20250514","max_tokens":80,"messages":[{{"role":"user","content":prompt}}]}}).encode()
        req = urlreq.Request("https://api.anthropic.com/v1/messages", data=payload,
            headers={{"Content-Type":"application/json","x-api-key":ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"}}, method="POST")
        with urlreq.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            status = result["content"][0]["text"].strip()
        return jsonify({{"status": status}})
    except Exception as e:
        return jsonify({{"status": "Your hair journey is gaining momentum — keep going!"}}), 200

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
        # Admin bypass — report as premium to frontend too
        admin_bypass = is_admin_user(user["id"])
        effective_plan   = "premium" if (admin_bypass or subscribed) else (sub["plan"] if sub else "free")
        effective_status = "active"  if (admin_bypass or subscribed) else (sub["status"] if sub else "inactive")
        return jsonify({"subscribed":subscribed,"plan":effective_plan,"status":effective_status,"admin_bypass":admin_bypass,"trial_end":sub["trial_end"] if sub else None,"current_period_end":sub["current_period_end"] if sub else None,"response_count":count,"free_limit":FREE_RESPONSE_LIMIT,"show_paywall":not subscribed and count>=FREE_RESPONSE_LIMIT})
    else:
        count = get_session_count(session_id)
        return jsonify({"subscribed":False,"plan":"free","status":"inactive","response_count":count,"free_limit":FREE_RESPONSE_LIMIT,"show_paywall":count>=FREE_RESPONSE_LIMIT})

@app.route("/api/subscription/checkout", methods=["POST","OPTIONS"])
def create_checkout():
    if request.method=="OPTIONS":
        r=jsonify({}); r.headers.update({"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"*","Access-Control-Allow-Methods":"POST"}); return r
    # All payments through Shopify
    return jsonify({"setup_needed":True,"checkout_url":"https://supportrd.com/products/hair-advisor-premium"})


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
body{{background:#f0ebe8;min-height:100vh;font-family:'Jost',sans-serif;font-weight:300;}}
.login-wrap{{display:flex;align-items:center;justify-content:center;padding:60px 24px 20px;}}
.card{{background:#fff;border-radius:24px;padding:48px 40px;width:100%;max-width:420px;box-shadow:0 12px 48px rgba(0,0,0,0.08);border:1px solid rgba(193,163,162,0.20);}}
.login-board{{margin-top:14px;background:linear-gradient(135deg,#faf6f3,#fff);border:1px solid rgba(193,163,162,0.25);border-radius:18px;padding:16px 18px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.7);}}
.login-board-title{{font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#c1a3a2;margin-bottom:10px;text-align:center;}}
/* Brand strip */
.brand-strip{{background:#0d0906;padding:12px 0;overflow:hidden;white-space:nowrap;}}
.brand-strip-inner{{display:flex;gap:0;animation:brandScroll 18s linear infinite;}}
.brand-pill{{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:#c1a3a2;padding:0 24px;flex-shrink:0;}}
@keyframes brandScroll{{0%{{transform:translateX(0);}}100%{{transform:translateX(-50%);}}}}
/* Shared section styles */
.about-block,.team-block,.coding-block,.products-block{{max-width:680px;margin:0 auto;padding:56px 28px;}}
.about-eyebrow{{font-size:9px;letter-spacing:0.22em;text-transform:uppercase;color:#c1a3a2;margin-bottom:14px;}}
.about-title{{font-family:'Cormorant Garamond',serif;font-size:48px;font-style:italic;font-weight:300;color:#0d0906;line-height:1.1;margin-bottom:8px;}}
.about-sub{{font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#9d7f6a;margin-bottom:20px;}}
.about-body{{font-size:15px;color:#444;line-height:1.8;}}
.about-timestamp{{margin-top:20px;font-size:11px;color:#c1a3a2;letter-spacing:0.08em;background:rgba(193,163,162,0.08);border:1px solid rgba(193,163,162,0.2);border-radius:8px;padding:10px 14px;display:inline-block;}}
/* Team */
.team-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:4px;}}
.team-card{{background:#fff;border:1px solid rgba(193,163,162,0.2);border-radius:16px;padding:24px 16px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.04);}}
.team-avatar{{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#c1a3a2,#9d7f6a);color:#fff;font-family:'Jost',sans-serif;font-size:18px;font-weight:400;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;}}
.team-name{{font-family:'Cormorant Garamond',serif;font-size:16px;font-style:italic;color:#0d0906;margin-bottom:4px;}}
.team-role{{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#9d7f6a;}}
/* Coding */
.coding-title{{font-family:'Cormorant Garamond',serif;font-size:30px;font-style:italic;font-weight:300;color:#0d0906;line-height:1.25;margin-bottom:10px;}}
.coding-timestamp{{font-size:11px;color:#c1a3a2;background:rgba(193,163,162,0.08);border:1px solid rgba(193,163,162,0.2);border-radius:8px;padding:8px 14px;display:inline-block;margin-bottom:18px;}}
.coding-body{{font-size:14px;color:#555;line-height:1.85;margin-bottom:24px;}}
.coding-episodes{{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:24px;}}
.ep-card{{background:#fff;border:1px solid rgba(193,163,162,0.25);border-radius:12px;padding:16px 14px;}}
.ep-card.ep-locked{{opacity:0.5;}}
.ep-num{{font-size:9px;letter-spacing:0.18em;color:#c1a3a2;margin-bottom:6px;}}
.ep-title{{font-size:13px;font-weight:400;color:#0d0906;margin-bottom:4px;}}
.ep-time{{font-size:10px;color:#9d7f6a;letter-spacing:0.08em;}}
.coding-cta{{display:inline-block;background:#0d0906;color:#fff;padding:14px 28px;border-radius:30px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;text-decoration:none;transition:background 0.3s;}}
.coding-cta:hover{{background:#c1a3a2;}}
/* Products */
.products-grid{{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:4px;}}
.prod-section{{background:#fff;border:1px solid rgba(193,163,162,0.2);border-radius:16px;padding:24px 20px;}}
.prod-section.gift{{border-color:#9d7f6a;background:linear-gradient(135deg,#faf6f3,#fff);}}
.prod-section-title{{font-family:'Cormorant Garamond',serif;font-size:18px;font-style:italic;color:#0d0906;margin-bottom:8px;}}
.prod-section-desc{{font-size:12px;color:#666;line-height:1.7;margin-bottom:16px;}}
.prod-btn{{display:inline-block;background:#c1a3a2;color:#fff;padding:10px 20px;border-radius:20px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;}}
.prod-badge{{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#9d7f6a;background:rgba(157,127,106,0.1);border:1px solid rgba(157,127,106,0.25);padding:6px 12px;border-radius:20px;display:inline-block;}}
/* Login info strip */
.login-info{{max-width:920px;margin:28px auto 0;padding:0 24px 20px;display:grid;grid-template-columns:1.1fr 0.9fr;gap:16px;}}
.info-card{{background:#0d0906;border:1px solid rgba(193,163,162,0.35);border-radius:18px;padding:22px 20px;color:#f5f1ee;box-shadow:0 10px 30px rgba(0,0,0,0.2);}}
.info-tag{{font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#c1a3a2;margin-bottom:10px;}}
.info-title{{font-family:'Cormorant Garamond',serif;font-size:22px;font-style:italic;line-height:1.2;margin-bottom:8px;}}
.info-desc{{font-size:12px;color:rgba(255,255,255,0.7);line-height:1.7;margin-bottom:12px;}}
.info-link{{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#c1a3a2;text-decoration:none;}}
.info-link:hover{{color:#fff;}}
/* Global footer */
.global-footer{{background:#0d0906;padding:32px 28px;text-align:center;}}
.gf-links{{display:flex;gap:20px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;}}
.gf-links a{{font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(193,163,162,0.7);text-decoration:none;transition:color 0.2s;cursor:pointer;}}
.gf-links a:hover{{color:#c1a3a2;}}
.gf-copy{{font-size:10px;color:rgba(255,255,255,0.25);letter-spacing:0.1em;margin-bottom:6px;}}
.build-id{{font-size:9px;color:rgba(255,255,255,0.35);letter-spacing:0.18em;text-transform:uppercase;}}
.gf-dem{{font-size:10px;color:rgba(193,163,162,0.5);letter-spacing:0.08em;}}
@media(max-width:600px){{.team-grid{{grid-template-columns:1fr;}}.products-grid{{grid-template-columns:1fr;}}.about-title{{font-size:36px;}}.login-info{{grid-template-columns:1fr;}}
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
<div class="login-wrap"><div class="card">
  <div class="logo"><div class="logo-text">SupportRD</div><div class="logo-sub">Hair Advisor</div></div>
  <h2>Welcome back</h2>
  <div class="tabs">
    <button class="tab active" onclick="switchTab('login')">Sign In</button>
    <button class="tab" onclick="switchTab('register')">Create Account</button>
  </div>
  <div id="err" class="err"></div>
  <div id="success" class="success"></div>
  <div class="login-board">
    <div class="login-board-title">Secure Access</div>
    <div id="login-form">
      <input type="email" id="l-email" placeholder="Email address">
      <input type="password" id="l-pass" placeholder="Password">
      <button class="btn" onclick="doLogin()">Sign In</button>
      <div style="text-align:right;margin-top:8px;">
        <a href="#" onclick="showForgotForm();return false;" style="font-size:11px;color:#9d7f6a;text-decoration:none;letter-spacing:0.06em;">Forgot password?</a>
      </div>
    </div>
    <!-- Forgot Password Form -->
    <div id="forgot-form" style="display:none">
      <div style="font-size:13px;color:rgba(0,0,0,0.55);margin-bottom:16px;line-height:1.6;">Enter your email and we'll send a reset link.</div>
      <input type="email" id="fp-email" placeholder="Email address">
      <button class="btn" onclick="doForgotPassword()">Send Reset Link</button>
      <div style="text-align:center;margin-top:12px;">
        <a href="#" onclick="hideForgotForm();return false;" style="font-size:11px;color:#9d7f6a;text-decoration:none;">← Back to Sign In</a>
      </div>
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
  </div>
  <div class="back"><a href="/">← Back to Hair Advisor</a></div>
</div></div><!-- /login-wrap -->

<!-- ── BRAND STRIP ─────────────────────────────────────────── -->
<div class="brand-strip">
  <div class="brand-strip-inner">
    <div class="brand-pill">✦ Hair Care</div>
    <div class="brand-pill">✦ Gift Shop</div>
    <div class="brand-pill">✦ AI Advisor</div>
    <div class="brand-pill">✦ Coding Guide</div>
    <div class="brand-pill">✦ Hands-Free Drive</div>
    <div class="brand-pill">✦ Hair Care</div>
    <div class="brand-pill">✦ Gift Shop</div>
    <div class="brand-pill">✦ AI Advisor</div>
    <div class="brand-pill">✦ Coding Guide</div>
    <div class="brand-pill">✦ Hands-Free Drive</div>
    <div class="brand-pill">✦ Gift Shop</div>
    <div class="brand-pill">✦ AI Advisor</div>
    <div class="brand-pill">✦ Coding Guide</div>
    <div class="brand-pill">✦ Hands-Free Drive</div>
  </div>
</div>

<div class="login-info">
  <!-- Coder Foundation card (comes first) -->
  <div class="info-card">
    <div class="info-tag">Coder Foundation</div>
    <div class="info-title">SupportRD created a learning environment for Coders Everywhere</div>
    <div class="info-desc">From Flask to AI to full‑stack shipping, we built a path for real people to build real products with AI.</div>
    <a class="info-link" href="/about">Read the full story →</a>
  </div>
  <!-- GPS Safety card -->
  <div class="info-card">
    <div class="info-tag">GPS Safety</div>
    <div class="info-title">🛰 GPS Safety Lock</div>
    <div class="info-desc">Hands‑Free Drive uses instant refresh GPS and voice guidance so your first position is accurate and your hands stay on the wheel.</div>
    <a class="info-link" href="/dashboard">Open Hands‑Free Drive →</a>
  </div>
</div>

<!-- ── GLOBAL FOOTER ───────────────────────────────────────── -->
<div class="global-footer">
  <div class="gf-links">
    <a href="/about">About Us</a>
    <a href="https://supportrd.com" target="_blank">Shop</a>
    <a href="mailto:hello@supportrd.com">Contact</a>
    <a href="#privacy">Privacy Policy</a>
  </div>
  <div class="gf-copy">© 2026 Support. Born in the Dominican Republic. All rights reserved.</div>
  <div class="build-id">Build 2026-03-16-2</div>
</div>

<script>
function showForgotForm(){{document.getElementById('login-form').style.display='none';document.getElementById('forgot-form').style.display='block';document.querySelector('h2').textContent='Reset Password';hideMsg();}}
function hideForgotForm(){{document.getElementById('forgot-form').style.display='none';document.getElementById('login-form').style.display='block';document.querySelector('h2').textContent='Welcome back';hideMsg();}}
async function doForgotPassword(){{
  var email=document.getElementById('fp-email').value.trim();
  if(!email){{showErr('Please enter your email address.');return;}}
  var r=await fetch('/api/auth/forgot-password',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{email}})}});
  var d=await r.json();
  if(d.error){{showErr(d.error);}}else{{showOk('Reset link sent! Check your email.');}}
}}
function switchTab(t){{document.getElementById('login-form').style.display=t==='login'?'block':'none';document.getElementById('register-form').style.display=t==='register'?'block':'none';document.querySelectorAll('.tab').forEach((b,i)=>b.classList.toggle('active',(t==='login'&&i===0)||(t==='register'&&i===1)));hideMsg();}}
function showErr(m){{var e=document.getElementById('err');e.textContent=m;e.style.display='block';document.getElementById('success').style.display='none';}}
function showOk(m){{var e=document.getElementById('success');e.textContent=m;e.style.display='block';document.getElementById('err').style.display='none';}}
function hideMsg(){{document.getElementById('err').style.display='none';document.getElementById('success').style.display='none';}}
function saveAndRedirect(data){{localStorage.setItem('srd_token',data.token);localStorage.setItem('srd_user',JSON.stringify({{name:data.name,email:data.email,avatar:data.avatar||''}}));showOk('Welcome, '+data.name+'! Redirecting...');setTimeout(()=>window.location.href='/dashboard',1200);}}
async function doLogin(){{var email=document.getElementById('l-email').value;var pass=document.getElementById('l-pass').value;if(!email||!pass){{showErr('Please fill in all fields.');return;}}var r=await fetch('/api/auth/login',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{email,password:pass}})}});var d=await r.json();if(d.error){{showErr(d.error);}}else{{saveAndRedirect(d);}}}}\nasync function doRegister(){{var name=document.getElementById('r-name').value;var email=document.getElementById('r-email').value;var pass=document.getElementById('r-pass').value;if(!name||!email||!pass){{showErr('Please fill in all fields.');return;}}var r=await fetch('/api/auth/register',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{name,email,password:pass}})}});var d=await r.json();if(d.error){{showErr(d.error);}}else{{saveAndRedirect(d);}}}}\nasync function handleGoogle(response){{var r=await fetch('/api/auth/google',{{method:'POST',headers:{{'Content-Type':'application/json'}},body:JSON.stringify({{credential:response.credential}})}});var d=await r.json();if(d.error){{showErr(d.error);}}else{{saveAndRedirect(d);}}}}
</script></body></html>"""


# ── ABOUT PAGE ───────────────────────────────────────────────────────────────
@app.route("/about")
def about_page():
    return """<!DOCTYPE html><html><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>About SupportRD</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;1,600&family=Space+Grotesk:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#07090d;color:#e9edf5;font-family:'Space Grotesk',sans-serif;min-height:100vh;}
a{text-decoration:none;color:inherit;}
.hero{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:60px 24px;position:relative;overflow:hidden;}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 70% 50% at 30% 20%,rgba(240,160,144,0.12),transparent 55%),radial-gradient(ellipse 45% 35% at 80% 80%,rgba(224,176,80,0.08),transparent 50%);}
.hero-inner{max-width:980px;text-align:center;position:relative;z-index:1;}
.hero-title{font-family:'Playfair Display',serif;font-size:64px;font-style:italic;line-height:1.05;letter-spacing:-0.02em;}
.hero-sub{margin-top:16px;font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:#c1a3a2;}
.hero-scroll{margin-top:26px;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#9aa3b2;}
.section{padding:70px 28px;}
.story{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1.2fr 0.8fr;gap:28px;}
.eyebrow{font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#c1a3a2;margin-bottom:12px;}
.story-title{font-family:'Playfair Display',serif;font-size:34px;font-style:italic;margin-bottom:12px;}
.story-body{font-size:15px;color:#b9c0ce;line-height:1.9;}
.quote{margin-top:18px;border-left:2px solid rgba(240,160,144,0.5);padding-left:14px;color:#e8d7d0;font-style:italic;}
.stats{display:grid;grid-template-columns:1fr;gap:12px;}
.stat-card{background:#0c0f16;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:16px;}
.stat-val{font-family:'Playfair Display',serif;font-size:22px;color:#f0a090;margin-bottom:4px;}
.stat-lbl{font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9aa3b2;}
.team{background:#0c0f16;}
.team-grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
.team-card{background:#07090d;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:22px;transition:transform 0.2s,border-color 0.2s;}
.team-card:hover{transform:translateY(-4px);border-color:rgba(240,160,144,0.4);}
.team-name{font-family:'Playfair Display',serif;font-size:18px;font-style:italic;margin-bottom:6px;}
.team-role{font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#c1a3a2;margin-bottom:8px;}
.team-bio{font-size:12px;color:#b9c0ce;line-height:1.7;margin-bottom:10px;}
.team-tags{display:flex;flex-wrap:wrap;gap:6px;}
.team-tag{font-size:9px;letter-spacing:0.12em;text-transform:uppercase;border:1px solid rgba(255,255,255,0.08);padding:4px 8px;border-radius:20px;color:#9aa3b2;}
.products{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:16px;}
.prod-card{background:#0c0f16;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;}
.prod-title{font-family:'Playfair Display',serif;font-size:20px;font-style:italic;margin-bottom:8px;}
.prod-desc{font-size:12px;color:#b9c0ce;line-height:1.7;margin-bottom:12px;}
.prod-link{font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#f0a090;}
.campaigns{max-width:1100px;margin:0 auto;margin-top:26px;background:linear-gradient(135deg,rgba(240,160,144,0.15),rgba(224,176,80,0.08));border:1px solid rgba(240,160,144,0.25);border-radius:16px;padding:18px;display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.camp-item{background:#07090d;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px;}
.camp-title{font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#c1a3a2;margin-bottom:6px;}
.camp-desc{font-size:12px;color:#b9c0ce;line-height:1.7;margin-bottom:10px;}
.camp-link{font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#f0a090;}
.coding{background:#0c0f16;position:relative;overflow:hidden;}
.coding::before{content:'</>';position:absolute;right:8%;top:20%;font-family:'Playfair Display',serif;font-size:180px;color:rgba(255,255,255,0.03);transform:rotate(-8deg);}
.coding-inner{max-width:1100px;margin:0 auto;position:relative;z-index:1;}
.time-badge{display:inline-block;font-size:10px;letter-spacing:0.2em;text-transform:uppercase;background:rgba(240,160,144,0.12);border:1px solid rgba(240,160,144,0.25);padding:6px 12px;border-radius:20px;color:#f0a090;margin-bottom:14px;}
.episodes{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px;}
.ep{background:#07090d;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:14px;}
.ep-num{font-size:9px;letter-spacing:0.2em;color:#c1a3a2;margin-bottom:6px;}
.ep-title{font-size:12px;font-weight:600;}
.cta-row{margin-top:18px;display:flex;gap:12px;flex-wrap:wrap;}
.cta{background:#f0a090;color:#000;border-radius:24px;padding:10px 18px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;}
.cta.alt{background:transparent;border:1px solid rgba(240,160,144,0.35);color:#f0a090;}
.footer{padding:30px 24px;text-align:center;font-size:10px;color:#8b93a3;letter-spacing:0.14em;text-transform:uppercase;}
@media(max-width:900px){
  .hero-title{font-size:44px;}
  .story,.products,.campaigns,.episodes{grid-template-columns:1fr;}
  .team-grid{grid-template-columns:1fr;}
}
</style></head><body>
<section class="hero">
  <div class="hero-inner">
    <div class="hero-title">Real tools for real people.</div>
    <div class="hero-sub">SupportRD</div>
    <div class="hero-scroll">Scroll to discover our story ↓</div>
  </div>
</section>

<section class="section">
  <div class="story">
    <div>
      <div class="eyebrow">Who We Are</div>
      <div class="story-title">Evelyn’s formula started it all.</div>
      <div class="story-body">SupportRD began in the Dominican Republic with a single mission: create hair solutions that actually work for real people. We built Aria, a talking AI specialist, to guide every step of your hair journey — then expanded into education, smart products, and hands‑free living.</div>
      <div class="quote">“Allahwazaweje — when you build from faith and focus, the results speak for themselves.”</div>
    </div>
    <div class="stats">
      <div class="stat-card"><div class="stat-val">6+</div><div class="stat-lbl">Core Products</div></div>
      <div class="stat-card"><div class="stat-val">Aria</div><div class="stat-lbl">AI Specialist</div></div>
      <div class="stat-card"><div class="stat-val">DR</div><div class="stat-lbl">Origin</div></div>
      <div class="stat-card"><div class="stat-val">3</div><div class="stat-lbl">Founders</div></div>
    </div>
  </div>
</section>

<section class="section team">
  <div class="eyebrow" style="text-align:center;">The Team</div>
  <div class="team-grid">
    <div class="team-card">
      <div class="team-name">Anthony</div>
      <div class="team-role">Design & Anthony Blogger</div>
      <div class="team-bio">Founder of SupportRD’s visual language and storytelling. Builds the AI‑first platform with real‑world UX.</div>
      <div class="team-tags"><span class="team-tag">Brand</span><span class="team-tag">AI UX</span><span class="team-tag">Story</span></div>
    </div>
    <div class="team-card">
      <div class="team-name">Crystal</div>
      <div class="team-role">Co‑CEO</div>
      <div class="team-bio">Operations and growth leader. Keeps the vision sharp and the team moving with precision.</div>
      <div class="team-tags"><span class="team-tag">Strategy</span><span class="team-tag">Growth</span><span class="team-tag">Operations</span></div>
    </div>
    <div class="team-card">
      <div class="team-name">Evelyn</div>
      <div class="team-role">Co‑CEO & Shampoo Inventor</div>
      <div class="team-bio">Creator of the original SupportRD formula and the voice behind our hair science.</div>
      <div class="team-tags"><span class="team-tag">Hair Science</span><span class="team-tag">Formulation</span><span class="team-tag">Leadership</span></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="products">
    <div class="prod-card">
      <div class="prod-title">Hair Care</div>
      <div class="prod-desc">Professional products developed by Evelyn — trusted by salons and real families.</div>
      <a class="prod-link" href="https://supportrd.com" target="_blank">Shop hair care →</a>
    </div>
    <div class="prod-card">
      <div class="prod-title">Aria Specialist</div>
      <div class="prod-desc">Your talking AI specialist that remembers your products, your routine, and your progress.</div>
      <a class="prod-link" href="/dashboard">Open Aria →</a>
    </div>
  </div>

  <div class="campaigns">
    <div class="camp-item">
      <div class="camp-title">Donate to Campaign for the Poor</div>
      <div class="camp-desc">Help us support local communities with products, education, and care.</div>
      <a class="camp-link" href="mailto:hello@supportrd.com?subject=Campaign%20for%20the%20Poor%20Donation">Donate by Email →</a>
    </div>
    <div class="camp-item">
      <div class="camp-title">Auto Dissolve Bar Partner</div>
      <div class="camp-desc">We’re seeking partners to design and ship the Dissolve Soap Bar.</div>
      <a class="camp-link" href="mailto:hello@supportrd.com?subject=Auto%20Dissolve%20Bar%20Partnership">Partner with Us →</a>
    </div>
  </div>
</section>

<section class="section coding">
  <div class="coding-inner">
    <div class="eyebrow">Coding Foundation</div>
    <div class="story-title">SupportRD builds coders, not just apps.</div>
    <div class="time-badge">Program launched — March 12, 2026</div>
    <div class="story-body">We created a learning environment for coders everywhere — built on real apps, real shipping, and AI‑powered execution.</div>
    <div class="episodes">
      <div class="ep"><div class="ep-num">01</div><div class="ep-title">Flask Foundations</div></div>
      <div class="ep"><div class="ep-num">02</div><div class="ep-title">AI Co‑Pilot Builds</div></div>
      <div class="ep"><div class="ep-num">03</div><div class="ep-title">Full‑Stack Launch</div></div>
      <div class="ep"><div class="ep-num">04</div><div class="ep-title">Deploy to Production</div></div>
    </div>
    <div class="cta-row">
      <a class="cta" href="https://supportrd.com/blogs/news" target="_blank">Visit the Blog →</a>
      <a class="cta alt" href="mailto:hello@supportrd.com?subject=Coder%20Foundation%20Contact">Contact Anthony →</a>
    </div>
  </div>
</section>

<div class="footer">SupportRD — Built for Real People · Build 2026-03-16-2</div>
</body></html>"""


# ── DASHBOARD PAGE ────────────────────────────────────────────────────────────
@app.route("/dashboard")
def dashboard():
    # Server-side token check — redirect to login immediately if invalid
    token = request.headers.get("X-Auth-Token") or request.cookies.get("srd_token")
    # Also check query param (for Shopify redirect flows)
    if not token:
        token = request.args.get("token")
    if token:
        user = get_user_from_token(token)
        if not user:
            # Token exists but is invalid (e.g. after redeployment) — clear and redirect
            resp = redirect("/login")
            resp.delete_cookie("srd_token")
            return resp
    # No cookie token — let JS handle localStorage token check
    html = r"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Aria Command Center — SupportRD</title>
<!-- build:v2.2 -->
<script>
(function(){
  var t = localStorage.getItem('srd_token');
  if(!t){ window.location.replace('/login'); return; }
  try{
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/auth/me', false);
    xhr.setRequestHeader('X-Auth-Token', t);
    xhr.send();
    if(xhr.status === 401){
      localStorage.removeItem('srd_token');
      localStorage.removeItem('srd_user');
      window.location.replace('/login');
    }
  }catch(e){ /* network error — let page load */ }
})();
</script>
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
body.drive-mode .nav,
body.drive-mode .ticker-wrap,
body.drive-mode .mobile-tab-bar,
body.drive-mode .mob-drive-btn{display:none !important;}
body.drive-mode .app{padding:0 !important;}
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
.ppage.active{display:block;}#pp-overview{padding:0;}
.ppage-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:12px;}
.ppage-title{font-family:'Syne',sans-serif;font-size:20px;font-weight:700;display:flex;align-items:center;gap:10px;}
.premium-badge{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.15em;background:linear-gradient(135deg,var(--rose),var(--gold));color:#000;padding:3px 8px;border-radius:3px;font-weight:600;}
.ppage-regen{background:rgba(240,160,144,0.12);border:1px solid rgba(240,160,144,0.3);color:var(--rose);font-family:'Space Grotesk',sans-serif;font-size:12px;padding:7px 16px;border-radius:6px;cursor:pointer;transition:all 0.2s;}
.ppage-regen:hover{background:rgba(240,160,144,0.22);border-color:var(--rose);}
.ppage-loading{display:flex;align-items:center;gap:12px;color:var(--muted2);font-size:13px;padding:40px 0;}
.ppage-spinner{width:20px;height:20px;border:2px solid var(--border2);border-top-color:var(--rose);border-radius:50%;animation:spin 0.8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}
/* ── OCCASION CARDS ─────────────────────────────── */
.occ-step-block{background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;margin-bottom:12px;}
.occ-step-label{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--rose);text-transform:uppercase;margin-bottom:12px;}
.occ-card{background:var(--bg3);border:1.5px solid var(--border2);border-radius:12px;padding:12px 14px;cursor:pointer;transition:all 0.15s;min-width:100px;text-align:center;}
.occ-card:hover{border-color:var(--rose);background:rgba(240,160,144,0.08);transform:translateY(-2px);}
.occ-card.selected{border-color:var(--rose);background:rgba(240,160,144,0.12);box-shadow:0 0 0 1px rgba(240,160,144,0.3);}
.occ-card-icon{font-size:22px;margin-bottom:5px;}
.occ-card-title{font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;color:var(--text);line-height:1.3;}
.occ-card-sub{font-size:9px;color:var(--muted);margin-top:2px;line-height:1.3;}
.occ-day-card{min-width:56px;padding:10px 8px;}
.occ-action-card{min-width:140px;text-align:left;}
.occ-action-card .occ-card-icon{font-size:18px;}
.occ-sum-chip{font-size:10px;padding:4px 10px;border-radius:20px;background:rgba(255,255,255,0.06);border:1px solid var(--border2);color:var(--muted2);}
.occ-sum-chip.occ-sum-product{border-color:rgba(224,176,80,0.3);color:var(--gold);}
.occ-sum-chip.occ-sum-action{border-color:rgba(96,168,255,0.3);color:var(--blue);}
/* ── ARIA JOURNEY ────────────────────────────────── */
/* ── DRIVE NAV BUTTON ──────────────────────────────────── */
.drive-nav-btn{background:linear-gradient(135deg,var(--rose),#d06050);color:#fff;border:none;border-radius:20px;padding:7px 16px;font-family:'Space Grotesk',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;cursor:pointer;white-space:nowrap;box-shadow:0 2px 12px rgba(240,160,144,0.4);transition:all 0.2s;margin-left:10px;}
.drive-nav-btn:hover{transform:scale(1.04);box-shadow:0 4px 20px rgba(240,160,144,0.55);}
.mob-drive-btn{position:fixed;bottom:76px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--rose),#d06050);color:#fff;border:none;border-radius:28px;padding:13px 32px;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.08em;cursor:pointer;z-index:200;box-shadow:0 4px 24px rgba(240,160,144,0.5);white-space:nowrap;display:none;}
@media(max-width:768px){.mob-drive-btn{display:block;}}
/* ── DRIVE FULLSCREEN PAGE ─────────────────────────────── */
#pp-drive{padding:0;background:#0a0a0f;}
.drive-fullscreen{display:flex;flex-direction:column;height:100vh;background:#0a0a0f;color:#fff;position:relative;}
.drive-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.08);flex-shrink:0;}
.drive-header-left{display:flex;align-items:center;gap:10px;}
.drive-status-dot{width:8px;height:8px;border-radius:50%;background:#4caf50;box-shadow:0 0 8px #4caf50;}
.drive-title-text{font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:#fff;letter-spacing:0.04em;}
.drive-engine-badge{font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.35);background:rgba(255,255,255,0.06);padding:4px 10px;border-radius:10px;}
.drive-header-right{}
.drive-close-btn{background:none;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.5);padding:7px 16px;border-radius:16px;font-size:11px;cursor:pointer;font-family:'Space Grotesk',sans-serif;letter-spacing:0.06em;transition:all 0.2s;}
.drive-close-btn:hover{border-color:var(--rose);color:var(--rose);}
.drive-aria-row{display:flex;align-items:center;gap:16px;padding:20px 24px;flex-shrink:0;}
.drive-aria-orb{position:relative;width:56px;height:56px;flex-shrink:0;}
.drive-aria-letter{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--rose),#c06050);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#fff;position:relative;z-index:2;}
.drive-aria-pulse{position:absolute;inset:-8px;border-radius:50%;background:radial-gradient(circle,rgba(240,160,144,0.2),transparent 70%);animation:drivePulse 2.4s ease-out infinite;pointer-events:none;}
@keyframes drivePulse{0%{opacity:0.8;transform:scale(0.9);}70%{opacity:0;transform:scale(1.5);}100%{opacity:0;}}
.drive-aria-name{font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:#fff;}
.drive-aria-status{font-size:13px;color:rgba(255,255,255,0.5);margin-top:3px;}
/* Conversation area */
.drive-msgs{flex:1;overflow-y:auto;padding:20px 24px;display:flex;flex-direction:column;gap:20px;scroll-behavior:smooth;}
.drive-msg{display:flex;max-width:90%;}
.drive-msg-aria{align-self:flex-start;}
.drive-msg-user{align-self:flex-end;flex-direction:row-reverse;}
.drive-msg-bubble{padding:18px 22px;border-radius:18px;font-size:22px;line-height:1.55;font-family:'Space Grotesk',sans-serif;font-weight:400;}
.drive-msg-aria .drive-msg-bubble{background:rgba(255,255,255,0.07);color:#fff;border-radius:4px 18px 18px 18px;}
.drive-msg-user .drive-msg-bubble{background:var(--rose);color:#fff;border-radius:18px 4px 18px 18px;font-size:20px;}
/* Input */
.drive-input-row{display:flex;align-items:center;gap:10px;padding:16px 20px;background:rgba(255,255,255,0.04);border-top:1px solid rgba(255,255,255,0.08);flex-shrink:0;}
.drive-mic-btn{width:60px;height:60px;border-radius:50%;background:rgba(240,160,144,0.15);border:2px solid var(--rose);color:var(--rose);font-size:24px;cursor:pointer;flex-shrink:0;transition:all 0.2s;}
.drive-mic-btn.listening{background:var(--rose);color:#fff;animation:micPulse 1s ease-in-out infinite;}
@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(240,160,144,0.5);}50%{box-shadow:0 0 0 12px rgba(240,160,144,0);}}
.drive-text-input{flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:30px;padding:16px 22px;font-size:18px;color:#fff;font-family:'Space Grotesk',sans-serif;outline:none;}
.drive-text-input::placeholder{color:rgba(255,255,255,0.25);}
.drive-text-input:focus{border-color:rgba(240,160,144,0.4);}
.drive-send-btn{width:56px;height:56px;border-radius:50%;background:var(--rose);border:none;color:#fff;font-size:22px;cursor:pointer;flex-shrink:0;transition:all 0.2s;}
.drive-send-btn:hover{background:#c06050;transform:scale(1.05);}
.drive-mic-status{text-align:center;padding:10px;font-size:11px;color:rgba(255,255,255,0.3);letter-spacing:0.1em;flex-shrink:0;}
@media(max-width:600px){.drive-msg-bubble{font-size:19px;}.drive-text-input{font-size:16px;}}
/* ── GLOBAL FOOTER IN DASHBOARD ────────────────────────── */
/* ── DRIVE MODE TOGGLE ─────────────────────────────────── */
.drive-mode-toggle{background:linear-gradient(135deg,#ff6eb4,#ff9f43);color:#fff;border:none;border-radius:16px;padding:7px 14px;font-size:11px;font-weight:700;letter-spacing:0.06em;cursor:pointer;font-family:'Space Grotesk',sans-serif;transition:all 0.2s;margin-right:8px;}
.drive-mode-toggle:hover{transform:scale(1.05);}
#drive-chat-mode{display:flex;flex-direction:column;flex:1;overflow:hidden;}
/* ── CANDY LAND GPS ─────────────────────────────────────── */
#drive-gps-mode{flex:1;overflow:hidden;}
.cl-dest-bar{padding:12px 16px;background:rgba(255,255,255,0.04);border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0;}
.cl-dest-label{font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-bottom:8px;}
.cl-dest-btns{display:flex;gap:8px;flex-wrap:wrap;}
.cl-dest-btn{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);color:#fff;border-radius:20px;padding:8px 16px;font-size:12px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-weight:600;transition:all 0.2s;white-space:nowrap;}
.cl-dest-btn:hover{background:rgba(255,110,180,0.25);border-color:#ff6eb4;color:#ff6eb4;}
/* Map area */
.cl-map-wrap{position:relative;flex:1;overflow:hidden;background:linear-gradient(160deg,#1a0a2e 0%,#0d1b2a 100%);}
.cl-gps-banner{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(48,232,144,0.12);border:1px solid rgba(48,232,144,0.5);color:#bff5d8;border-radius:14px;padding:10px 14px;display:flex;align-items:center;gap:10px;z-index:30;box-shadow:0 8px 24px rgba(0,0,0,0.35);transition:all 0.3s ease;animation:clBannerSlide 0.6s ease;}
.cl-gps-banner.small{padding:6px 8px;gap:6px;bottom:10px;max-width:140px;}
.cl-gps-banner-icon{font-size:14px;}
.cl-gps-banner-text{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;line-height:1.4;}
.cl-gps-banner.small .cl-gps-banner-text{display:none;}
.cl-gps-dots{display:flex;gap:4px;}
.cl-gps-dot{width:6px;height:6px;border-radius:50%;background:#30e890;opacity:0.4;animation:clDot 1s infinite;}
.cl-gps-dot:nth-child(2){animation-delay:0.2s;}
.cl-gps-dot:nth-child(3){animation-delay:0.4s;}
@keyframes clDot{0%,100%{opacity:0.2;transform:scale(0.9);}50%{opacity:1;transform:scale(1.1);}}
@keyframes clBannerSlide{from{transform:translate(-50%,20px);opacity:0;}to{transform:translate(-50%,0);opacity:1;}}
.cl-canvas{width:100%;height:100%;display:block;}
.cl-player{position:absolute;font-size:28px;transition:left 1.2s cubic-bezier(.4,0,.2,1),top 1.2s cubic-bezier(.4,0,.2,1);z-index:10;transform:translate(-50%,-50%);filter:drop-shadow(0 0 8px rgba(255,110,180,0.7));pointer-events:none;}
.cl-dest-marker{position:absolute;font-size:32px;z-index:9;transform:translate(-50%,-50%);animation:clBounce 1.2s ease-in-out infinite;pointer-events:none;}
@keyframes clBounce{0%,100%{transform:translate(-50%,-60%);}50%{transform:translate(-50%,-40%);}}
/* Landmark bubbles */
.cl-landmark-bubble{position:absolute;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);backdrop-filter:blur(8px);border-radius:12px;padding:5px 10px;font-size:11px;color:#fff;white-space:nowrap;cursor:pointer;transform:translate(-50%,-50%);z-index:8;transition:all 0.2s;}
.cl-landmark-bubble:hover{background:rgba(255,110,180,0.2);border-color:#ff6eb4;}
.cl-landmark-bubble.coding{border-color:rgba(100,200,255,0.4);background:rgba(100,200,255,0.08);}
.cl-landmark-bubble.hair{border-color:rgba(255,110,180,0.4);background:rgba(255,110,180,0.08);}
.cl-landmark-bubble.park{border-color:rgba(80,220,120,0.4);background:rgba(80,220,120,0.08);}
/* Nav card */
.cl-nav-card{background:#0d1220;border-top:1px solid rgba(255,255,255,0.08);padding:12px 16px;flex-shrink:0;}
.cl-nav-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
.cl-nav-dest{font-size:13px;font-weight:700;color:#fff;font-family:'Space Grotesk',sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:65%;}
.cl-nav-dist{font-size:12px;color:rgba(255,255,255,0.45);white-space:nowrap;}
.cl-direction-banner{display:flex;align-items:center;gap:10px;background:rgba(255,110,180,0.1);border:1px solid rgba(255,110,180,0.2);border-radius:12px;padding:10px 14px;margin-bottom:8px;}
.cl-dir-arrow{font-size:24px;color:#ff6eb4;font-weight:900;transition:transform 0.4s;min-width:28px;text-align:center;}
.cl-dir-text{font-size:16px;font-weight:700;color:#fff;font-family:'Space Grotesk',sans-serif;line-height:1.3;}
.cl-landmarks-strip{display:flex;gap:6px;overflow-x:auto;padding-bottom:4px;margin-bottom:8px;scrollbar-width:none;}
.cl-landmarks-strip::-webkit-scrollbar{display:none;}
.cl-lm-chip{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:5px 12px;font-size:10px;color:rgba(255,255,255,0.6);white-space:nowrap;cursor:pointer;flex-shrink:0;transition:all 0.2s;}
.cl-lm-chip:hover{background:rgba(255,110,180,0.15);border-color:#ff6eb4;color:#ff6eb4;}
/* Aria narration */
.cl-aria-bar{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.04);border-radius:10px;padding:8px 12px;}
.cl-aria-face{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--rose),#c06050);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:13px;font-weight:800;color:#fff;flex-shrink:0;}
.cl-aria-narration{flex:1;font-size:13px;color:rgba(255,255,255,0.75);line-height:1.4;font-family:'Space Grotesk',sans-serif;}
.cl-aria-speak-btn{background:none;border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.4);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px;flex-shrink:0;transition:all 0.2s;}
.cl-aria-speak-btn:hover{border-color:var(--rose);color:var(--rose);}
/* Results panel */
.cl-results{position:absolute;inset:0;background:rgba(10,10,20,0.96);z-index:50;padding:20px;overflow-y:auto;}
.cl-results-title{font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:#fff;margin-bottom:14px;}
.cl-result-card{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:all 0.2s;}
.cl-result-card:hover{border-color:#ff6eb4;background:rgba(255,110,180,0.08);}
.cl-result-name{font-size:14px;font-weight:700;color:#fff;margin-bottom:3px;}
.cl-result-addr{font-size:11px;color:rgba(255,255,255,0.4);margin-bottom:5px;}
.cl-result-meta{display:flex;gap:10px;align-items:center;}
.cl-result-badge{font-size:9px;letter-spacing:0.1em;padding:3px 8px;border-radius:10px;font-weight:700;}
.cl-result-badge.coding{background:rgba(100,200,255,0.15);color:#64c8ff;border:1px solid rgba(100,200,255,0.3);}
.cl-result-badge.hair{background:rgba(255,110,180,0.15);color:#ff6eb4;border:1px solid rgba(255,110,180,0.3);}
.cl-result-badge.park{background:rgba(80,220,120,0.15);color:#50dc78;border:1px solid rgba(80,220,120,0.3);}
.cl-result-dist{font-size:11px;color:rgba(255,255,255,0.4);}
.cl-ask-row{display:flex;align-items:center;gap:8px;margin-top:8px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:12px;padding:6px 8px;}
.cl-ask-mic{width:44px;height:44px;border-radius:50%;background:rgba(240,160,144,0.12);border:1.5px solid var(--rose);color:var(--rose);font-size:20px;cursor:pointer;flex-shrink:0;transition:all 0.2s;}
.cl-ask-mic.listening{background:var(--rose);color:#fff;animation:micPulse 1s ease-in-out infinite;}
.cl-ask-input{flex:1;background:none;border:none;color:#fff;font-size:15px;font-family:'Space Grotesk',sans-serif;outline:none;padding:4px 6px;}
.cl-ask-input::placeholder{color:rgba(255,255,255,0.25);}
.cl-ask-send{width:40px;height:40px;border-radius:50%;background:var(--rose);border:none;color:#fff;font-size:18px;cursor:pointer;flex-shrink:0;transition:all 0.2s;}
.cl-ask-send:hover{background:#c06050;}
.cl-ask-status{font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:0.1em;text-align:center;min-height:14px;margin-top:2px;}
.cl-results-close{display:block;margin:16px auto 0;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:20px;padding:10px 28px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-size:12px;}
/* Candy path tiles (drawn on canvas) - also need candy land tile animation */
@keyframes clTilePulse{0%,100%{opacity:0.7;}50%{opacity:1;}}
.dashboard-footer{background:var(--bg);border-top:1px solid var(--border);padding:16px 28px;display:flex;gap:16px;flex-wrap:wrap;align-items:center;justify-content:center;}
.dashboard-footer a{font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);text-decoration:none;transition:color 0.2s;cursor:pointer;}
.dashboard-footer a:hover{color:var(--rose);}
/* Admin daily toast */
.admin-toast{position:fixed;right:18px;bottom:18px;background:var(--bg2);border:1px solid rgba(240,160,144,0.25);border-radius:14px;padding:14px 16px;box-shadow:0 10px 30px rgba(0,0,0,0.35);z-index:9997;max-width:320px;display:none;}
.admin-toast-title{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--rose);margin-bottom:6px;}
.admin-toast-body{font-size:12px;color:var(--muted2);line-height:1.6;margin-bottom:10px;}
.admin-toast-actions{display:flex;gap:8px;flex-wrap:wrap;}
.admin-toast-btn{padding:6px 12px;border-radius:14px;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;font-family:'Space Grotesk',sans-serif;border:1px solid var(--border2);background:none;color:var(--muted2);}
.admin-toast-btn.primary{background:var(--rose);color:#000;border-color:var(--rose);}

.aj-tier{display:flex;align-items:flex-start;gap:20px;margin-bottom:28px;position:relative;z-index:2;}
/* Orb container */
.aj-orb{position:relative;width:72px;height:72px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.aj-orb-inner{width:64px;height:64px;border-radius:50%;background:var(--bg3);border:2px solid var(--border2);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;transition:all 0.5s;position:relative;z-index:3;}
.aj-orb-num{font-family:'Syne',sans-serif;font-size:11px;font-weight:800;color:var(--muted);transition:all 0.5s;line-height:1;}
.aj-orb-icon{font-size:18px;opacity:0.3;transition:all 0.5s;line-height:1;}
/* Ring (inactive) */
.aj-orb-ring{position:absolute;inset:0;border-radius:50%;border:2px solid var(--border2);transition:all 0.5s;}
/* Pulse (hidden until active) */
.aj-orb-pulse{position:absolute;inset:-8px;border-radius:50%;opacity:0;pointer-events:none;}
/* ACTIVE STATE */
.aj-orb.active .aj-orb-inner{background:radial-gradient(circle at 35% 35%,color-mix(in srgb,var(--orb-color) 90%,#fff),var(--orb-color));border-color:var(--orb-color);box-shadow:0 0 0 0px rgba(var(--orb-rgb),0.5),0 8px 32px rgba(var(--orb-rgb),0.45),inset 0 1px 0 rgba(255,255,255,0.25);}
.aj-orb.active .aj-orb-num{color:#fff;font-size:20px;}
.aj-orb.active .aj-orb-icon{opacity:1;}
.aj-orb.active .aj-orb-ring{border-color:rgba(var(--orb-rgb),0.5);transform:scale(1.1);}
.aj-orb.active .aj-orb-pulse{animation:ajPulse 2.4s ease-out infinite;background:radial-gradient(circle,rgba(var(--orb-rgb),0.25),transparent 70%);}
/* CURRENT (brightest glow) */
.aj-orb.current .aj-orb-inner{box-shadow:0 0 0 4px rgba(var(--orb-rgb),0.3),0 8px 40px rgba(var(--orb-rgb),0.6),0 0 80px rgba(var(--orb-rgb),0.2),inset 0 1px 0 rgba(255,255,255,0.3);}
.aj-orb.current .aj-orb-pulse{animation:ajPulse 1.8s ease-out infinite;}
/* LOCKED */
.aj-orb.locked .aj-orb-inner{opacity:0.25;filter:grayscale(1);}
/* Tier body */
.aj-tier-body{background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;flex:1;transition:all 0.4s;}
.aj-tier-body.active{border-color:rgba(var(--orb-rgb,240,160,144),0.35);background:rgba(var(--orb-rgb,240,160,144),0.04);}
.aj-tier-body.current{border-color:rgba(var(--orb-rgb,240,160,144),0.5);background:rgba(var(--orb-rgb,240,160,144),0.07);}
.aj-tier-body.locked{opacity:0.35;pointer-events:none;}
.aj-tier-name{font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:var(--text);margin-bottom:4px;}
.aj-tier-desc{font-size:11px;color:var(--muted2);line-height:1.65;}
.aj-tier-verdict{font-size:10px;margin-top:8px;font-style:italic;color:var(--muted2);line-height:1.5;}
.aj-bt-btn{margin-top:8px;background:none;border:1px solid rgba(255,255,255,0.1);color:var(--muted);padding:5px 12px;border-radius:16px;font-size:9px;cursor:pointer;font-family:'Space Grotesk',sans-serif;letter-spacing:0.06em;transition:all 0.2s;}
.aj-bt-btn:hover{border-color:var(--rose);color:var(--rose);}
@keyframes ajPulse{0%{opacity:0.7;transform:scale(0.95);}70%{opacity:0;transform:scale(1.6);}100%{opacity:0;transform:scale(1.6);}}
.aj-session{position:relative;padding-left:28px;margin-bottom:20px;}
.aj-session::before{content:'';position:absolute;left:6px;top:0;bottom:-20px;width:1px;background:var(--border2);}
.aj-session:last-child::before{display:none;}
.aj-session-dot{position:absolute;left:0;top:4px;width:13px;height:13px;border-radius:50%;background:var(--bg3);border:2px solid var(--rose);}
.aj-session-date{font-family:'IBM Plex Mono',monospace;font-size:9px;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px;}
.aj-session-head{font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px;}
.aj-session-body{font-size:12px;color:var(--muted2);line-height:1.65;}
.aj-session-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
.aj-session-tag{font-size:9px;padding:2px 8px;border-radius:10px;background:rgba(240,160,144,0.08);border:1px solid rgba(240,160,144,0.18);color:var(--rose);}
.aj-depth-pill{display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.08em;}}
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
/* ── PHOTO ANALYSIS ── */
.pa-page{max-width:760px;margin:0 auto;padding:0 0 40px;}
.pa-intro{text-align:center;padding:28px 24px 20px;}
.pa-intro-title{font-family:var(--brand-font);font-size:22px;font-style:italic;font-weight:400;color:var(--text);margin-bottom:6px;}
.pa-intro-sub{font-size:12px;color:var(--muted);line-height:1.6;max-width:420px;margin:0 auto;}
/* Mode selector */
.pa-mode-tabs{display:flex;gap:10px;justify-content:center;margin-bottom:24px;}
.pa-tab{padding:9px 22px;border-radius:30px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;border:1px solid var(--border2);color:var(--muted2);background:transparent;transition:all 0.2s;font-family:var(--brand-font-body);}
.pa-tab.active{background:var(--rose);color:#fff;border-color:var(--rose);}
/* Scanner stage */
.pa-scanner-wrap{position:relative;width:100%;max-width:520px;margin:0 auto 24px;border-radius:20px;overflow:hidden;background:#000;aspect-ratio:4/3;}
.pa-video{width:100%;height:100%;object-fit:cover;display:block;}
.pa-scanner-overlay{position:absolute;inset:0;pointer-events:none;}
/* Corner brackets */
.pa-bracket{position:absolute;width:48px;height:48px;border-color:var(--rose);border-style:solid;opacity:0.85;}
.pa-bracket--tl{top:18px;left:18px;border-width:2px 0 0 2px;border-radius:4px 0 0 0;}
.pa-bracket--tr{top:18px;right:18px;border-width:2px 2px 0 0;border-radius:0 4px 0 0;}
.pa-bracket--bl{bottom:18px;left:18px;border-width:0 0 2px 2px;border-radius:0 0 0 4px;}
.pa-bracket--br{bottom:18px;right:18px;border-width:0 2px 2px 0;border-radius:0 0 4px 0;}
/* Face oval guide */
.pa-oval-guide{position:absolute;left:50%;top:50%;transform:translate(-50%,-54%);width:52%;aspect-ratio:3/4;border:2px dashed rgba(240,160,144,0.45);border-radius:50%;animation:pa-oval-pulse 2.5s ease-in-out infinite;}
@keyframes pa-oval-pulse{0%,100%{border-color:rgba(240,160,144,0.35);}50%{border-color:rgba(240,160,144,0.75);}}
/* Scan line */
.pa-scan-line{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent 0%,rgba(240,160,144,0.0) 5%,rgba(240,160,144,0.9) 30%,#f0a090 50%,rgba(240,160,144,0.9) 70%,rgba(240,160,144,0.0) 95%,transparent 100%);box-shadow:0 0 12px 2px rgba(240,160,144,0.5);display:none;}
.pa-scan-line.active{display:block;animation:pa-scan-move 2.2s ease-in-out infinite;}
@keyframes pa-scan-move{0%{top:10%;opacity:0;}8%{opacity:1;}92%{opacity:1;}100%{top:90%;opacity:0;}}
/* Scan glow corners when active */
.pa-scanner-wrap.scanning .pa-bracket{animation:pa-bracket-glow 1.1s ease-in-out infinite alternate;}
@keyframes pa-bracket-glow{from{opacity:0.6;}to{opacity:1;box-shadow:0 0 8px var(--rose);}}
/* Instruction bar */
.pa-instruction{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.82));padding:28px 20px 16px;text-align:center;}
.pa-instruction-text{font-size:13px;color:#fff;letter-spacing:0.04em;line-height:1.5;}
.pa-instruction-sub{font-size:10px;color:rgba(255,255,255,0.5);margin-top:3px;letter-spacing:0.08em;text-transform:uppercase;}
/* Head turn progress */
.pa-turn-track{display:flex;justify-content:center;gap:6px;margin-top:8px;}
.pa-turn-dot{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.25);transition:background 0.4s;}
.pa-turn-dot.done{background:var(--rose);}
/* Upload zone */
.pa-upload-zone{max-width:520px;margin:0 auto 20px;border:2px dashed var(--border2);border-radius:20px;padding:44px 24px;text-align:center;cursor:pointer;transition:all 0.25s;position:relative;overflow:hidden;}
.pa-upload-zone:hover{border-color:rgba(240,160,144,0.5);background:rgba(240,160,144,0.03);}
.pa-upload-icon{font-size:38px;margin-bottom:12px;}
.pa-upload-label{font-size:14px;color:var(--text);margin-bottom:5px;font-family:var(--brand-font);font-style:italic;}
.pa-upload-sub{font-size:11px;color:var(--muted);}
.pa-upload-preview{max-width:100%;max-height:260px;border-radius:14px;margin-top:16px;object-fit:cover;display:none;}
/* Controls */
.pa-controls{display:flex;flex-direction:column;align-items:center;gap:10px;margin:0 auto 24px;max-width:520px;}
.pa-btn-primary{width:100%;padding:14px;background:var(--rose);color:#fff;border:none;border-radius:30px;font-family:var(--brand-font-body);font-size:12px;letter-spacing:0.14em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;}
.pa-btn-primary:hover{background:#d4806c;transform:translateY(-1px);}
.pa-btn-primary:disabled{opacity:0.45;cursor:not-allowed;transform:none;}
.pa-btn-secondary{font-size:11px;color:var(--muted2);cursor:pointer;background:none;border:1px solid var(--border2);padding:8px 20px;border-radius:20px;letter-spacing:0.08em;font-family:var(--brand-font-body);}
/* Scanning state overlay */
.pa-scanning-status{text-align:center;padding:16px;max-width:520px;margin:0 auto;}
.pa-scanning-dots{display:flex;justify-content:center;gap:6px;margin-bottom:10px;}
.pa-scanning-dot{width:8px;height:8px;border-radius:50%;background:var(--rose);animation:pa-dot-bounce 1.1s ease-in-out infinite;}
.pa-scanning-dot:nth-child(2){animation-delay:0.18s;}
.pa-scanning-dot:nth-child(3){animation-delay:0.36s;}
@keyframes pa-dot-bounce{0%,80%,100%{transform:scale(0.7);opacity:0.4;}40%{transform:scale(1);opacity:1;}}
.pa-scanning-msg{font-size:12px;color:var(--muted2);letter-spacing:0.06em;}
/* Results */
.pa-result{max-width:760px;margin:0 auto;}
.pa-result-header{text-align:center;margin-bottom:24px;}
.pa-result-score-ring{position:relative;width:110px;height:110px;margin:0 auto 12px;}
.pa-result-score-svg{width:110px;height:110px;}
.pa-result-score-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.pa-result-score-num{font-family:var(--brand-font);font-size:36px;font-weight:400;line-height:1;color:var(--text);}
.pa-result-score-lbl{font-size:9px;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;}
.pa-result-title{font-family:var(--brand-font);font-size:18px;font-style:italic;color:var(--text);margin-bottom:4px;}
.pa-result-sub{font-size:12px;color:var(--muted);line-height:1.5;}
.pa-metrics-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:18px;}
@media(min-width:520px){.pa-metrics-grid{grid-template-columns:repeat(4,1fr);}}
.pa-metric-card{background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:14px 10px;text-align:center;}
.pa-metric-label{font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:5px;}
.pa-metric-val{font-size:15px;font-weight:500;color:var(--text);}
.pa-advice-block{background:rgba(240,160,144,0.07);border-left:2px solid var(--rose);border-radius:0 12px 12px 0;padding:14px 16px;font-size:13px;color:var(--text);line-height:1.7;margin-bottom:16px;}
.pa-section-label{font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin:14px 0 7px;}
.pa-obs-item{font-size:12px;color:var(--muted2);padding:3px 0 3px 14px;position:relative;line-height:1.5;}
.pa-obs-item::before{content:'✦';position:absolute;left:0;color:var(--rose);font-size:8px;top:5px;}
.pa-rec-tag{display:inline-block;background:rgba(96,168,255,0.08);border:1px solid rgba(96,168,255,0.2);color:var(--blue);font-size:11px;border-radius:6px;padding:4px 10px;margin:3px;}
.pa-rescan-btn{display:block;width:100%;margin-top:20px;padding:12px;border:1px solid var(--border2);background:transparent;color:var(--muted2);border-radius:30px;font-family:var(--brand-font-body);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;transition:all 0.2s;}
.pa-rescan-btn:hover{border-color:var(--rose);color:var(--rose);}
.pa-history-item{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--border);font-size:11px;color:var(--muted2);}
/* Keep old metric style for fallback */
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
.journal-layout{display:flex;flex-direction:column;gap:16px;}
.journal-form-panel{background:var(--bg2);border:1px solid rgba(240,160,144,0.2);border-radius:14px;padding:20px;}
.jf-title{font-family:'Syne',sans-serif;font-weight:700;font-size:14px;margin-bottom:14px;color:var(--text);}
.jf-rating-row{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
.jf-label{font-size:12px;color:var(--muted2);}
.jf-stars span{font-size:22px;color:var(--border2);cursor:pointer;transition:color 0.15s;}
.jf-stars span.active{color:var(--gold);}
.jf-textarea{width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:'Space Grotesk',sans-serif;font-size:13px;padding:12px;resize:none;outline:none;line-height:1.6;box-sizing:border-box;}
.jf-photo-row{display:flex;align-items:center;margin-top:10px;}
.jf-photo-btn{font-size:12px;color:var(--muted2);cursor:pointer;border:1px dashed var(--border2);padding:7px 14px;border-radius:8px;transition:border-color 0.2s;}
.jf-photo-btn:hover{border-color:var(--rose);}
.journal-entries{display:flex;flex-direction:column;gap:12px;}
.je-card{background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:18px;position:relative;animation:fadeUp 0.3s forwards;}
.je-top{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
.je-date{font-size:11px;color:var(--muted);font-family:'IBM Plex Mono',monospace;}
.je-stars{font-size:14px;color:var(--gold);}
.je-note{font-size:13px;color:var(--text);line-height:1.65;margin-bottom:10px;}
.je-insight{background:rgba(193,163,162,0.08);border-left:2px solid var(--rose);padding:8px 12px;border-radius:0 8px 8px 0;font-size:12px;color:var(--muted2);line-height:1.6;}
.je-insight::before{content:'✦ Aria: ';color:var(--rose);font-weight:600;}
.je-del{position:absolute;top:14px;right:14px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;opacity:0.5;}
.je-del:hover{opacity:1;color:#e07070;}
.je-empty{text-align:center;padding:40px 20px;color:var(--muted);font-size:13px;}
.save-btn{background:linear-gradient(135deg,#c1a3a2,#d4a85a);border:none;color:#000;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;padding:10px 20px;border-radius:8px;cursor:pointer;transition:opacity 0.2s;}
.save-btn:hover{opacity:0.88;}
.toast{position:fixed;bottom:22px;left:50%;transform:translateX(-50%) translateY(60px);background:var(--bg3);border:1px solid rgba(240,160,144,0.3);color:var(--text);padding:9px 18px;border-radius:6px;font-family:'IBM Plex Mono',monospace;font-size:11px;transition:transform 0.3s;z-index:999;}
.toast.show{transform:translateX(-50%) translateY(0);}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.fu{opacity:0;animation:fadeUp 0.45s forwards;}
.fu1{animation-delay:0.04s}.fu2{animation-delay:0.09s}.fu3{animation-delay:0.14s}.fu4{animation-delay:0.19s}.fu5{animation-delay:0.24s}
@keyframes numFlash{0%{color:var(--text)}40%{color:#fff;text-shadow:0 0 25px rgba(255,255,255,0.9)}100%{color:var(--text)}}
.flash{animation:numFlash 0.5s ease-out !important;}
@media(max-width:1280px){.top-row{grid-template-columns:230px 1fr 230px}.mid-row{grid-template-columns:1fr 1fr 1fr}.mid-row .action-panel{grid-column:1/-1;flex-direction:row;flex-wrap:wrap;gap:8px}}
@media(max-width:900px){.top-row{grid-template-columns:1fr}.mid-row{grid-template-columns:1fr 1fr}.bot-row{grid-template-columns:1fr}}

/* ── MOBILE NAV ── */
@media(max-width:768px){
  .ticker-wrap{display:none;}
  .nav{top:0;height:52px;padding:0 14px;}
  .nav-logo{font-size:14px;margin-right:10px;}
  .nav-tabs{display:none;}
  .nav-right{gap:7px;}
  .nav-name{display:none;}
  .live-badge{display:none;}
  .plan-tag{font-size:8px;padding:2px 6px;}
  .app{padding:60px 10px 100px;}
  /* Mobile bottom tab bar */
  .mobile-tab-bar{display:flex !important;}
  /* Stack overview cards */
  .top-row{grid-template-columns:1fr !important;}
  .mid-row{grid-template-columns:1fr !important;}
  .bot-row{grid-template-columns:1fr !important;}
  /* Premium pages full width */
  .ppage{padding:16px 12px;}
  .pa-page{padding:0;}
  .prog-layout{grid-template-columns:1fr !important;}
}
@media(min-width:769px){
  .mobile-tab-bar{display:none !important;}
  .mobile-menu-overlay{display:none !important;}
}

/* ── MOBILE BOTTOM TAB BAR ── */
.mobile-tab-bar{
  display:none;
  position:fixed;bottom:0;left:0;right:0;
  height:60px;
  background:rgba(7,9,13,0.97);
  border-top:1px solid var(--border2);
  z-index:200;
  align-items:stretch;
  justify-content:space-around;
}
.mob-tab{
  flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:3px;cursor:pointer;
  font-size:8px;letter-spacing:0.06em;text-transform:uppercase;
  color:var(--muted);transition:color 0.15s;
  border:none;background:none;font-family:'Space Grotesk',sans-serif;
}
.mob-tab.active{color:var(--rose);}
.mob-tab-icon{font-size:17px;line-height:1;}
/* Hamburger for more tabs */
.mob-more-overlay{
  display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:300;
  align-items:flex-end;
}
.mob-more-overlay.open{display:flex !important;}
.mob-more-sheet{
  width:100%;background:var(--bg2);border-radius:20px 20px 0 0;
  padding:20px 16px 32px;
  border-top:1px solid var(--border2);
}
.mob-more-title{font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);margin-bottom:14px;text-align:center;}
.mob-more-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.mob-more-item{
  background:var(--bg3);border:1px solid var(--border2);border-radius:12px;
  padding:14px 12px;display:flex;align-items:center;gap:10px;cursor:pointer;
  font-size:12px;color:var(--muted2);transition:all 0.15s;
}
.mob-more-item:hover,.mob-more-item.active{color:var(--text);border-color:var(--rose);}
.mob-more-item-icon{font-size:20px;}

/* ── SETTINGS PAGE ── */
.settings-page{max-width:600px;margin:0 auto;padding:0 0 40px;}
.settings-section{background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:20px;margin-bottom:14px;}
.settings-section-title{font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--muted);margin-bottom:14px;}
.settings-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border);}
.settings-row:last-child{border:none;padding-bottom:0;}
.settings-label{font-size:12px;color:var(--muted2);}
.settings-val{font-size:12px;color:var(--text);text-align:right;}
.settings-input{background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-size:13px;color:var(--text);font-family:'Space Grotesk',sans-serif;width:100%;outline:none;transition:border 0.2s;margin-top:6px;}
.settings-input:focus{border-color:var(--rose);}
.settings-save-btn{margin-top:12px;padding:10px 24px;background:var(--rose);color:#fff;border:none;border-radius:20px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;font-family:'Space Grotesk',sans-serif;transition:background 0.2s;}
.settings-save-btn:hover{background:#d4806c;}
.settings-danger-btn{padding:10px 24px;background:transparent;color:var(--red);border:1px solid rgba(255,85,85,0.3);border-radius:20px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;font-family:'Space Grotesk',sans-serif;transition:all 0.2s;}
.settings-danger-btn:hover{background:rgba(255,85,85,0.08);}
.billing-card{background:linear-gradient(135deg,rgba(240,160,144,0.08),rgba(224,176,80,0.06));border:1px solid rgba(240,160,144,0.2);border-radius:12px;padding:16px;}
.billing-plan-name{font-size:18px;font-weight:600;color:var(--text);margin-bottom:4px;}
.billing-next{font-size:12px;color:var(--muted2);margin-bottom:12px;}
.billing-next strong{color:var(--gold);}
.billing-manage-btn{font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--rose);text-decoration:none;border:1px solid rgba(240,160,144,0.3);padding:8px 16px;border-radius:16px;display:inline-block;transition:all 0.2s;}
.billing-manage-btn:hover{background:rgba(240,160,144,0.08);}
.settings-msg{font-size:12px;color:var(--green);margin-top:8px;display:none;}
.settings-err{font-size:12px;color:var(--red);margin-top:8px;display:none;}
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
    <div class="nav-tab" onclick="switchPTab('journey')">✦ Aria Journey</div>
    <div class="nav-tab" onclick="switchPTab('progress')">✦ Progress</div>
    <div class="nav-tab" onclick="switchPTab('photo')">✦ Photo AI</div>
    <div class="nav-tab" onclick="switchPTab('journal')">✦ Journal</div>
    <div class="nav-tab" onclick="switchPTab('whatsapp')">✦ Aria SMS</div>
    <a class="nav-tab" href="/about" style="text-decoration:none;">About</a>
    <div class="nav-tab" onclick="switchPTab('settings')">⚙ Settings</div>
  </div>
  <button class="drive-nav-btn" onclick="switchPTab('drive')" id="drive-nav-btn">
    🚗 Hands-Free Drive
  </button>
  <div class="nav-right">
    <div class="live-badge"><div class="live-dot"></div>LIVE</div>
    <span class="nav-name" id="nav-name">—</span>
    <div class="plan-tag" id="plan-badge">FREE</div>
    <div class="nav-avatar" id="nav-av">?</div>
    <button class="logout-btn" onclick="doLogout()">Sign out</button>
  </div>
</nav>

<!-- MOBILE BOTTOM TAB BAR -->
<div class="mobile-tab-bar" id="mobile-tab-bar">
  <button class="mob-tab active" id="mobt-overview" onclick="switchPTab('overview')">
    <span class="mob-tab-icon">⬡</span>Overview
  </button>
  <button class="mob-tab" id="mobt-profile" onclick="switchPTab('profile')">
    <span class="mob-tab-icon">✦</span>Profile
  </button>
  <button class="mob-tab" id="mobt-journey" onclick="switchPTab('journey')">
    <span class="mob-tab-icon">✦</span>Journey
  </button>
  <button class="mob-tab" id="mobt-photo" onclick="switchPTab('photo')">
    <span class="mob-tab-icon">📸</span>Scan
  </button>
  <button class="mob-tab" id="mobt-more" onclick="openMobMore()">
    <span class="mob-tab-icon">⋯</span>More
  </button>
</div>
<button class="mob-drive-btn" id="mob-drive-btn" onclick="switchPTab('drive')">
  🚗 Hands-Free Drive
</button>

<!-- MOBILE MORE SHEET -->
<div class="mob-more-overlay" id="mob-more-overlay" onclick="closeMobMore()">
  <div class="mob-more-sheet" onclick="event.stopPropagation()">
    <div class="mob-more-title">All Features</div>
    <div class="mob-more-grid">
      <div class="mob-more-item" onclick="switchPTab('progress');closeMobMore()"><span class="mob-more-item-icon">📈</span>Progress</div>
      <div class="mob-more-item" onclick="switchPTab('journey');closeMobMore()"><span class="mob-more-item-icon">✦</span>Aria Journey</div>
      <div class="mob-more-item" onclick="switchPTab('journal');closeMobMore()"><span class="mob-more-item-icon">📓</span>Journal</div>
      <div class="mob-more-item" onclick="switchPTab('whatsapp');closeMobMore()"><span class="mob-more-item-icon">💬</span>Aria SMS</div>
      <a class="mob-more-item" href="/about" style="text-decoration:none;"><span class="mob-more-item-icon">ℹ</span>About</a>
      <div class="mob-more-item" onclick="switchPTab('settings');closeMobMore()"><span class="mob-more-item-icon">⚙</span>Settings</div>
    </div>
    <div style="text-align:center;margin-top:16px;">
      <button onclick="doLogout()" style="font-size:11px;color:var(--muted);background:none;border:1px solid var(--border);padding:8px 20px;border-radius:16px;cursor:pointer;font-family:'Space Grotesk',sans-serif;letter-spacing:0.08em;">Sign out</button>
    </div>
  </div>
</div>

<div class="app">

<div class="ppage active" id="pp-overview" style="padding:0;min-height:unset;">
<!-- Upgrade promo banner -->
<div id="upgrade-promo-banner" style="background:linear-gradient(135deg,rgba(240,160,144,0.12),rgba(224,176,80,0.08));border-bottom:1px solid rgba(240,160,144,0.2);padding:10px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;cursor:pointer;" onclick="openUpgradeModal()">
  <div style="display:flex;align-items:center;gap:10px;">
    <span style="font-size:18px;">💡</span>
    <div>
      <div style="font-size:12px;font-weight:700;color:var(--text);font-family:'Space Grotesk',sans-serif;">Got an idea to upgrade Support?</div>
      <div style="font-size:11px;color:var(--muted);">Submit it — if we build it, you earn 1 free month of Premium.</div>
    </div>
  </div>
  <div style="background:var(--rose);color:#fff;border-radius:16px;padding:7px 16px;font-size:11px;font-weight:700;font-family:'Space Grotesk',sans-serif;letter-spacing:0.06em;white-space:nowrap;">Submit Idea →</div>
</div>
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
        <button id="sphere-handsfree-btn" onclick="toggleHandsFree()" title="Hands-free mode" style="background:transparent;border:1px solid rgba(193,163,162,0.3);border-radius:12px;padding:3px 10px;font-size:10px;letter-spacing:0.08em;color:rgba(13,9,6,0.5);cursor:pointer;white-space:nowrap;">🤲 Off</button>
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
</div><!-- /pp-overview -->

<!-- ═══════════════ PREMIUM FULL-PAGE PANELS ═══════════════ -->

<!-- ✦ HAIR PROFILE FULL PAGE -->
<div class="ppage" id="pp-profile-page">

<!-- ── PROFILE HERO CARD ───────────────────────────────── -->
<div id="prof-hero" style="position:relative;background:linear-gradient(145deg,rgba(240,160,144,0.08),rgba(193,163,162,0.05));border:1px solid rgba(240,160,144,0.18);border-radius:20px;padding:28px 24px 24px;margin-bottom:20px;overflow:hidden;">
  <!-- glow behind name -->
  <div style="position:absolute;top:-40px;left:50%;transform:translateX(-50%);width:280px;height:180px;background:radial-gradient(ellipse,rgba(240,160,144,0.18),transparent 70%);pointer-events:none;"></div>

  <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;position:relative;">

    <!-- Avatar + product shelf -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px;flex-shrink:0;">
      <!-- Avatar -->
      <div style="position:relative;">
        <div id="prof-avatar" style="width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,var(--rose),#c06050);display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700;color:#fff;border:3px solid rgba(240,160,144,0.4);box-shadow:0 0 24px rgba(240,160,144,0.25);">?</div>
        <div style="position:absolute;bottom:2px;right:2px;width:20px;height:20px;background:#30e890;border-radius:50%;border:2px solid var(--bg);display:flex;align-items:center;justify-content:center;font-size:9px;">✓</div>
      </div>
      <!-- Share icons -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:100px;">
        <a id="share-ig" href="#" target="_blank" title="Instagram" onclick="profShare('instagram');return false;" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.07);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:13px;text-decoration:none;">📷</a>
        <a id="share-fb" href="#" target="_blank" title="Facebook" onclick="profShare('facebook');return false;" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.07);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:13px;text-decoration:none;">👥</a>
        <a id="share-tt" href="#" target="_blank" title="TikTok" onclick="profShare('tiktok');return false;" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.07);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:13px;text-decoration:none;">🎵</a>
        <a id="share-tw" href="#" target="_blank" title="X / Twitter" onclick="profShare('twitter');return false;" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.07);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:13px;text-decoration:none;">🐦</a>
        <a id="share-wa" href="#" target="_blank" title="WhatsApp" onclick="profShare('whatsapp');return false;" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.07);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:13px;text-decoration:none;">💬</a>
        <a id="share-pi" href="#" target="_blank" title="Pinterest" onclick="profShare('pinterest');return false;" style="width:28px;height:28px;border-radius:6px;background:rgba(255,255,255,0.07);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:13px;text-decoration:none;">📌</a>
      </div>
    </div>

    <!-- Product shelf (carousel) -->
    <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:6px;">
      <div style="font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-bottom:2px;">My Products</div>
      <div id="prof-product-carousel" style="width:72px;overflow:hidden;position:relative;height:220px;">
        <div id="prof-product-track" style="display:flex;flex-direction:column;gap:8px;transition:transform 0.3s ease;" data-idx="0">
          <!-- filled by JS -->
        </div>
      </div>
      <div id="prof-product-dots" style="display:flex;gap:5px;justify-content:center;margin-top:4px;"></div>
    </div>

    <!-- Name / bio / status -->
    <div style="flex:1;min-width:180px;">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
        <div id="prof-name-big" style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--text);">—</div>
        <span id="prof-plan-badge" style="font-size:8px;padding:3px 8px;border-radius:3px;background:var(--gold-dim);border:1px solid rgba(224,176,80,0.3);color:var(--gold);font-family:'IBM Plex Mono',monospace;letter-spacing:0.08em;">FREE</span>
      </div>
      <div id="prof-email-sm" style="font-size:11px;color:var(--muted);margin-bottom:12px;"></div>

      <!-- AI Hair Status — glowing -->
      <div id="prof-ai-status-wrap" style="background:rgba(240,160,144,0.07);border:1px solid rgba(240,160,144,0.22);border-radius:12px;padding:12px 14px;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;border-radius:12px;box-shadow:inset 0 0 18px rgba(240,160,144,0.08);pointer-events:none;"></div>
        <div style="font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:var(--rose);margin-bottom:6px;">✦ Aria's Current Read</div>
        <div id="prof-ai-status" style="font-size:13px;color:var(--text);line-height:1.7;font-style:italic;animation:profGlow 3s ease-in-out infinite;">Tap ✦ Refresh to get Aria's latest read on your hair…</div>
        <button onclick="profRefreshAiStatus()" style="margin-top:8px;background:none;border:1px solid rgba(240,160,144,0.3);color:var(--rose);padding:4px 12px;border-radius:20px;font-size:10px;cursor:pointer;letter-spacing:0.08em;">✦ Refresh</button>
      </div>

      <!-- Stats row -->
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;">
        <div style="text-align:center;">
          <div id="prof-score-big" style="font-family:'Syne',sans-serif;font-size:26px;font-weight:700;color:var(--rose);">—</div>
          <div style="font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);">Hair Score</div>
        </div>
        <div style="width:1px;background:var(--border);"></div>
        <div style="text-align:center;">
          <div id="prof-streak" style="font-family:'Syne',sans-serif;font-size:26px;font-weight:700;color:var(--gold);">—</div>
          <div style="font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);">Day Streak</div>
        </div>
        <div style="width:1px;background:var(--border);"></div>
        <div style="text-align:center;">
          <div id="prof-member-since" style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:var(--blue);">—</div>
          <div style="font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);">Member Since</div>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- ── HAIR DATA GRID ─────────────────────────────────────── -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">

  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Hair Type</div>
    <div class="tags" id="pf-tags-type">
      <div class="tag" onclick="toggleTag(this,'type')">Straight</div><div class="tag" onclick="toggleTag(this,'type')">Wavy</div><div class="tag" onclick="toggleTag(this,'type')">Curly</div><div class="tag" onclick="toggleTag(this,'type')">Coily / 4C</div><div class="tag" onclick="toggleTag(this,'type')">Fine</div><div class="tag" onclick="toggleTag(this,'type')">Medium</div><div class="tag" onclick="toggleTag(this,'type')">Thick</div><div class="tag" onclick="toggleTag(this,'type')">Dry / Brittle</div><div class="tag" onclick="toggleTag(this,'type')">Oily</div><div class="tag" onclick="toggleTag(this,'type')">Normal</div>
    </div>
  </div>

  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Main Concerns</div>
    <div class="tags" id="pf-tags-concerns">
      <div class="tag" onclick="toggleTag(this,'concerns')">Frizz</div><div class="tag" onclick="toggleTag(this,'concerns')">Damaged</div><div class="tag" onclick="toggleTag(this,'concerns')">Breakage</div><div class="tag" onclick="toggleTag(this,'concerns')">Hair Loss</div><div class="tag" onclick="toggleTag(this,'concerns')">Thinning</div><div class="tag" onclick="toggleTag(this,'concerns')">Oily Scalp</div><div class="tag" onclick="toggleTag(this,'concerns')">Dandruff</div><div class="tag" onclick="toggleTag(this,'concerns')">Split Ends</div><div class="tag" onclick="toggleTag(this,'concerns')">Slow Growth</div><div class="tag" onclick="toggleTag(this,'concerns')">Dullness</div><div class="tag" onclick="toggleTag(this,'concerns')">Heat Damage</div><div class="tag" onclick="toggleTag(this,'concerns')">Sun Damage</div><div class="tag" onclick="toggleTag(this,'concerns')">Dryness</div><div class="tag" onclick="toggleTag(this,'concerns')">Scalp Irritation</div>
    </div>
  </div>

  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Chemical Treatments</div>
    <div class="tags" id="pf-tags-treatments">
      <div class="tag" onclick="toggleTag(this,'treatments')">None / Natural</div><div class="tag" onclick="toggleTag(this,'treatments')">Relaxer</div><div class="tag" onclick="toggleTag(this,'treatments')">Bleach</div><div class="tag" onclick="toggleTag(this,'treatments')">Hair Color</div><div class="tag" onclick="toggleTag(this,'treatments')">Keratin</div><div class="tag" onclick="toggleTag(this,'treatments')">Perm / Wave</div><div class="tag" onclick="toggleTag(this,'treatments')">Brazilian Blowout</div><div class="tag" onclick="toggleTag(this,'treatments')">Highlights</div>
    </div>
  </div>

  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Porosity Level</div>
    <div class="tags" id="pf-tags-porosity">
      <div class="tag" onclick="toggleTag(this,'porosity')">Low Porosity</div><div class="tag" onclick="toggleTag(this,'porosity')">Medium Porosity</div><div class="tag" onclick="toggleTag(this,'porosity')">High Porosity</div><div class="tag" onclick="toggleTag(this,'porosity')">Not Sure</div>
    </div>
  </div>

  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Scalp Type</div>
    <div class="tags" id="pf-tags-scalp">
      <div class="tag" onclick="toggleTag(this,'scalp')">Normal</div><div class="tag" onclick="toggleTag(this,'scalp')">Dry / Flaky</div><div class="tag" onclick="toggleTag(this,'scalp')">Oily</div><div class="tag" onclick="toggleTag(this,'scalp')">Sensitive</div><div class="tag" onclick="toggleTag(this,'scalp')">Itchy</div><div class="tag" onclick="toggleTag(this,'scalp')">Dandruff</div>
    </div>
  </div>

  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Wash Frequency</div>
    <div class="tags" id="pf-tags-washfreq">
      <div class="tag" onclick="toggleTag(this,'washfreq')">Daily</div><div class="tag" onclick="toggleTag(this,'washfreq')">Every 2-3 Days</div><div class="tag" onclick="toggleTag(this,'washfreq')">Weekly</div><div class="tag" onclick="toggleTag(this,'washfreq')">Every 2 Weeks</div>
    </div>
  </div>

  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Heat Styling</div>
    <div class="tags" id="pf-tags-heat">
      <div class="tag" onclick="toggleTag(this,'heat')">No Heat</div><div class="tag" onclick="toggleTag(this,'heat')">Occasionally</div><div class="tag" onclick="toggleTag(this,'heat')">1-2x / Week</div><div class="tag" onclick="toggleTag(this,'heat')">Daily</div><div class="tag" onclick="toggleTag(this,'heat')">Flat Iron</div><div class="tag" onclick="toggleTag(this,'heat')">Blow Dryer</div><div class="tag" onclick="toggleTag(this,'heat')">Curling Iron</div>
    </div>
  </div>

  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Environment / Lifestyle</div>
    <div class="tags" id="pf-tags-env">
      <div class="tag" onclick="toggleTag(this,'env')">Hard Water</div><div class="tag" onclick="toggleTag(this,'env')">Humid Climate</div><div class="tag" onclick="toggleTag(this,'env')">Dry Climate</div><div class="tag" onclick="toggleTag(this,'env')">Sun Exposure</div><div class="tag" onclick="toggleTag(this,'env')">Pool / Chlorine</div><div class="tag" onclick="toggleTag(this,'env')">Ocean / Salt</div><div class="tag" onclick="toggleTag(this,'env')">Active / Workouts</div>
    </div>
  </div>

</div>

<!-- Products I Use -->
<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;margin-bottom:14px;">
  <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">SupportRD Products I Use</div>
  <div class="tags" id="pf-tags-products">
    <div class="tag" onclick="toggleTag(this,'products')">Formula Exclusiva</div><div class="tag" onclick="toggleTag(this,'products')">Laciador Crece</div><div class="tag" onclick="toggleTag(this,'products')">Gotero Rapido</div><div class="tag" onclick="toggleTag(this,'products')">Gotitas Brillantes</div><div class="tag" onclick="toggleTag(this,'products')">Mascarilla Capilar</div><div class="tag" onclick="toggleTag(this,'products')">Shampoo Aloe Vera</div>
  </div>
</div>

<!-- Goals + notes -->
<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:16px 18px;margin-bottom:14px;">
  <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">My Hair Goals</div>
  <textarea id="pf-goals" placeholder="What do you want your hair to look and feel like? The more Aria knows, the better she can help…" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;padding:12px;font-family:'Space Grotesk',sans-serif;font-size:13px;color:var(--text);resize:vertical;min-height:70px;outline:none;" onfocus="this.style.borderColor='var(--rose)'" onblur="this.style.borderColor='var(--border2)'"></textarea>
</div>

<!-- Save -->
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:28px;">
  <button class="save-btn" style="margin-top:0;" onclick="saveProfileFull()">✦ Save Profile & Update Score</button>
  <div id="pf-save-msg" style="display:none;font-size:12px;color:var(--green);">✓ Saved</div>
</div>

<!-- ── OCCASIONS ── -->
<div id="occ-section">

  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px;">
    <div>
      <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;color:var(--text);">✦ Occasion Routines</div>
      <div style="font-size:12px;color:var(--muted2);margin-top:2px;">Pick an occasion, choose your product, select your routine action — then drop it onto any day of the week.</div>
    </div>
    <button onclick="occToggleWeekly()" id="occ-weekly-btn" style="background:var(--bg2);border:1px solid var(--border2);color:var(--muted2);padding:8px 16px;border-radius:20px;font-size:11px;cursor:pointer;letter-spacing:0.06em;font-family:'Space Grotesk',sans-serif;">📅 View My Week</button>
  </div>

  <!-- ── STEP 1: PICK OCCASION ── -->
  <div class="occ-step-block">
    <div class="occ-step-label">Step 1 — Choose Your Occasion</div>
    <div id="occ-occasion-grid" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
  </div>

  <!-- ── STEP 2: PICK PRODUCT ── -->
  <div class="occ-step-block" id="occ-step2" style="display:none;">
    <div class="occ-step-label">Step 2 — Which Product Today?</div>
    <div id="occ-product-grid" style="display:flex;flex-wrap:wrap;gap:8px;">

      <div class="occ-card" onclick="occPickProduct('Formula Exclusiva','💊','All-in-one treatment: moisture, strength + scalp')">
        <div class="occ-card-icon">💊</div>
        <div class="occ-card-title">Formula Exclusiva</div>
        <div class="occ-card-sub">All-in-one treatment</div>
      </div>

      <div class="occ-card" onclick="occPickProduct('Laciador Crece','🌿','Softness, elasticity, shine + growth')">
        <div class="occ-card-icon">🌿</div>
        <div class="occ-card-title">Laciador Crece</div>
        <div class="occ-card-sub">Softness + growth</div>
      </div>

      <div class="occ-card" onclick="occPickProduct('Gotero Rapido','💧','Scalp treatment — clears + stimulates growth')">
        <div class="occ-card-icon">💧</div>
        <div class="occ-card-title">Gotero Rapido</div>
        <div class="occ-card-sub">Scalp treatment</div>
      </div>

      <div class="occ-card" onclick="occPickProduct('Gotitas Brillantes','✨','Shine serum — apply after styling')">
        <div class="occ-card-icon">✨</div>
        <div class="occ-card-title">Gotitas Brillantes</div>
        <div class="occ-card-sub">Shine serum</div>
      </div>

      <div class="occ-card" onclick="occPickProduct('Mascarilla Capilar','🫙','Deep conditioning mask treatment')">
        <div class="occ-card-icon">🫙</div>
        <div class="occ-card-title">Mascarilla Capilar</div>
        <div class="occ-card-sub">Deep condition mask</div>
      </div>

      <div class="occ-card" onclick="occPickProduct('Shampoo Aloe Vera','🍃','Gentle cleanse — daily or weekly')">
        <div class="occ-card-icon">🍃</div>
        <div class="occ-card-title">Shampoo Aloe Vera</div>
        <div class="occ-card-sub">Gentle cleanse</div>
      </div>

      <div class="occ-card" onclick="occPickProduct('Multiple Products','🗂️','Using a combination today')">
        <div class="occ-card-icon">🗂️</div>
        <div class="occ-card-title">Multiple Products</div>
        <div class="occ-card-sub">Combination routine</div>
      </div>

    </div>
  </div>

  <!-- ── STEP 3: PICK ROUTINE ACTION ── -->
  <div class="occ-step-block" id="occ-step3" style="display:none;">
    <div class="occ-step-label">Step 3 — What Are You Doing?</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">

      <div class="occ-card occ-action-card" onclick="occPickAction('Simply Applying','🖐️','Quick application — work product through hair, no wash needed')">
        <div class="occ-card-icon">🖐️</div>
        <div class="occ-card-title">Simply Applying</div>
        <div class="occ-card-sub">Quick — no wash needed</div>
      </div>

      <div class="occ-card occ-action-card" onclick="occPickAction('Next Wash','🚿','Apply today, wash on your next scheduled wash day')">
        <div class="occ-card-icon">🚿</div>
        <div class="occ-card-title">Next Wash</div>
        <div class="occ-card-sub">Apply now, wash later</div>
      </div>

      <div class="occ-card occ-action-card" onclick="occPickAction('Shampoo + Add Laciador','🔁','Next wash: shampoo, then add Laciador for softness & protection')">
        <div class="occ-card-icon">🔁</div>
        <div class="occ-card-title">Shampoo + Laciador</div>
        <div class="occ-card-sub">Wash then add Laciador</div>
      </div>

      <div class="occ-card occ-action-card" onclick="occPickAction('Professional Deep Wash','🧖','Take to a professional for a deep wash with Support products')">
        <div class="occ-card-icon">🧖</div>
        <div class="occ-card-title">Professional Deep Wash</div>
        <div class="occ-card-sub">Salon‑level deep care</div>
      </div>

    </div>
  </div>

  <!-- ── STEP 4: ADD TO WEEK DAY ── -->
  <div class="occ-step-block" id="occ-step4" style="display:none;">
    <div class="occ-step-label">Step 4 — Add to Which Day?</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      <div class="occ-card occ-day-card" onclick="occAddToDay('Monday')"><div class="occ-card-title">Mon</div></div>
      <div class="occ-card occ-day-card" onclick="occAddToDay('Tuesday')"><div class="occ-card-title">Tue</div></div>
      <div class="occ-card occ-day-card" onclick="occAddToDay('Wednesday')"><div class="occ-card-title">Wed</div></div>
      <div class="occ-card occ-day-card" onclick="occAddToDay('Thursday')"><div class="occ-card-title">Thu</div></div>
      <div class="occ-card occ-day-card" onclick="occAddToDay('Friday')"><div class="occ-card-title">Fri</div></div>
      <div class="occ-card occ-day-card" onclick="occAddToDay('Saturday')"><div class="occ-card-title">Sat</div></div>
      <div class="occ-card occ-day-card" onclick="occAddToDay('Sunday')"><div class="occ-card-title">Sun</div></div>
      <div class="occ-card occ-day-card" onclick="occSaveNoDay()" style="background:rgba(240,160,144,0.08);border-color:rgba(240,160,144,0.3);"><div class="occ-card-title" style="color:var(--rose);">Save Only</div></div>
    </div>
  </div>

  <!-- ── CURRENT SELECTION SUMMARY ── -->
  <div id="occ-summary" style="display:none;background:rgba(240,160,144,0.06);border:1px solid rgba(240,160,144,0.2);border-radius:12px;padding:14px 18px;margin-top:4px;margin-bottom:8px;">
    <div style="font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--rose);margin-bottom:8px;">✦ Current Selection</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <span id="occ-sum-occasion" class="occ-sum-chip" style="display:none;"></span>
      <span id="occ-sum-product"  class="occ-sum-chip occ-sum-product" style="display:none;"></span>
      <span id="occ-sum-action"   class="occ-sum-chip occ-sum-action" style="display:none;"></span>
    </div>
    <button onclick="occReset()" style="margin-top:10px;background:none;border:none;color:var(--muted);font-size:10px;cursor:pointer;padding:0;letter-spacing:0.06em;">↩ Start over</button>
  </div>

  <!-- ── WEEKLY PLANNER (collapsed by default) ── -->
  <div id="occ-weekly-panel" style="display:none;margin-top:8px;">
    <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--text);margin-bottom:12px;">📅 My Week</div>
    <div id="occ-week-grid" style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;"></div>
    <button onclick="occClearWeek()" style="margin-top:12px;background:none;border:1px solid var(--border2);color:var(--muted);padding:6px 16px;border-radius:16px;font-size:10px;cursor:pointer;">Clear week</button>
  </div>

  <!-- ── SAVED OCCASIONS ── -->
  <div style="margin-top:20px;" id="occ-saved-wrap">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;" id="occ-saved-header"></div>
    <div id="occ-saved-list"></div>
  </div>

</div>
</div>

</div>
<!-- ✦ ARIA JOURNEY -->
<div class="ppage" id="pp-journey">
<div class="ppage-head">
  <div class="ppage-title">✦ My Aria Journey</div>
  <div id="aj-depth-badge"></div>
</div>

<!-- LEVEL TRACK — 4 big glowing orbs -->
<div id="aj-milestones" style="margin-bottom:36px;">

  <!-- progress spine -->
  <div style="position:relative;padding:0 8px;">
    <div id="aj-spine" style="position:absolute;left:50px;top:52px;width:3px;border-radius:3px;background:var(--border2);z-index:0;" id="aj-spine"></div>
    <div id="aj-spine-fill" style="position:absolute;left:50px;top:52px;width:3px;border-radius:3px;background:linear-gradient(to bottom,var(--rose),var(--gold),var(--blue),var(--green));z-index:1;transition:height 1s ease;height:0;"></div>

    <!-- Level 1: Discovery -->
    <div class="aj-tier" id="aj-tier-1">
      <div class="aj-orb" id="aj-orb-1" style="--orb-color:var(--rose);--orb-rgb:240,160,144;">
        <div class="aj-orb-inner">
          <div class="aj-orb-num">1</div>
          <div class="aj-orb-icon">🌱</div>
        </div>
        <div class="aj-orb-ring"></div>
        <div class="aj-orb-pulse"></div>
      </div>
      <div class="aj-tier-body" id="aj-tbody-1">
        <div class="aj-tier-name">Discovery</div>
        <div class="aj-tier-desc">Aria is just starting to mention your products — the first spark of your journey.</div>
        <div class="aj-tier-verdict" id="aj-v1"></div>
        <div class="aj-tier-backtrack" id="aj-bt1" style="display:none;">
          <button onclick="ajForceLevel(0)" class="aj-bt-btn">↩ Aria and I are still getting started</button>
        </div>
      </div>
    </div>

    <!-- Level 2: Use Cases & Upgrades -->
    <div class="aj-tier" id="aj-tier-2">
      <div class="aj-orb" id="aj-orb-2" style="--orb-color:var(--gold);--orb-rgb:224,176,80;">
        <div class="aj-orb-inner">
          <div class="aj-orb-num">2</div>
          <div class="aj-orb-icon">🔬</div>
        </div>
        <div class="aj-orb-ring"></div>
        <div class="aj-orb-pulse"></div>
      </div>
      <div class="aj-tier-body" id="aj-tbody-2">
        <div class="aj-tier-name">Use Cases &amp; Changes</div>
        <div class="aj-tier-desc">Aria is now in depth level 2 — she’s mentioning use cases and what you can change for better results.</div>
        <div class="aj-tier-verdict" id="aj-v2"></div>
        <div class="aj-tier-backtrack" id="aj-bt2" style="display:none;">
          <button onclick="ajForceLevel(1)" class="aj-bt-btn">↩ We haven't gone this deep yet</button>
        </div>
      </div>
    </div>

    <!-- Level 3: Inner Circle -->
    <div class="aj-tier" id="aj-tier-3">
      <div class="aj-orb" id="aj-orb-3" style="--orb-color:var(--blue);--orb-rgb:96,168,255;">
        <div class="aj-orb-inner">
          <div class="aj-orb-num">3</div>
          <div class="aj-orb-icon">💫</div>
        </div>
        <div class="aj-orb-ring"></div>
        <div class="aj-orb-pulse"></div>
      </div>
      <div class="aj-tier-body" id="aj-tbody-3">
        <div class="aj-tier-name">Inner Circle</div>
        <div class="aj-tier-desc">Aria now knows what your girlfriend likes and what your friends/family notice.</div>
        <div class="aj-tier-verdict" id="aj-v3"></div>
        <div class="aj-tier-backtrack" id="aj-bt3" style="display:none;">
          <button onclick="ajForceLevel(2)" class="aj-bt-btn">↩ Not quite there yet with Aria</button>
        </div>
      </div>
    </div>

    <!-- Level 4: Professional — Making Money -->
    <div class="aj-tier" id="aj-tier-4">
      <div class="aj-orb" id="aj-orb-4" style="--orb-color:var(--green);--orb-rgb:48,232,144;">
        <div class="aj-orb-inner">
          <div class="aj-orb-num">4</div>
          <div class="aj-orb-icon">💎</div>
        </div>
        <div class="aj-orb-ring"></div>
        <div class="aj-orb-pulse"></div>
      </div>
      <div class="aj-tier-body" id="aj-tbody-4">
        <div class="aj-tier-name">Professional — Making Money</div>
        <div class="aj-tier-desc">You’ve entered the final depth: Professional — making money with your new hair level.</div>
        <div class="aj-tier-verdict" id="aj-v4"></div>
        <!-- CONTACT US CTA — only shown at level 4 -->
        <div id="aj-level4-cta" style="display:none;margin-top:14px;padding:16px 18px;background:linear-gradient(135deg,rgba(48,232,144,0.1),rgba(48,232,144,0.04));border:1px solid rgba(48,232,144,0.3);border-radius:12px;">
          <div style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:var(--green);margin-bottom:6px;">✦ You've Earned This</div>
          <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--text);margin-bottom:6px;">Let's talk directly.</div>
          <div style="font-size:12px;color:var(--muted2);line-height:1.65;margin-bottom:14px;">You are exactly who we built SupportRD for. We want to connect with you personally — whether that's an ambassador program, a referral partnership, or just making sure you have everything you need.</div>
          <a href="mailto:hello@supportrd.com?subject=Making Money Level — Let's Connect&body=Hi SupportRD team, I've reached the Professional level with Aria and I'd love to talk." style="display:inline-block;background:var(--green);color:#000;font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:12px;padding:12px 24px;border-radius:20px;text-decoration:none;letter-spacing:0.06em;">✦ Contact SupportRD Directly →</a>
          <div style="font-size:10px;color:var(--muted);margin-top:10px;">Or reach us at <strong>hello@supportrd.com</strong> — mention your name and Aria will share your profile.</div>
        </div>
        <div class="aj-tier-backtrack" id="aj-bt4" style="display:none;">
          <button onclick="ajForceLevel(3)" class="aj-bt-btn">↩ Not at this level yet</button>
        </div>
      </div>
    </div>

  </div><!-- /relative -->
</div><!-- /milestones -->

<!-- CURRENT LEVEL STATEMENT -->
<div id="aj-current-depth" style="background:rgba(240,160,144,0.07);border:1px solid rgba(240,160,144,0.2);border-radius:16px;padding:20px 22px;margin-bottom:28px;position:relative;overflow:hidden;">
  <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;background:radial-gradient(circle,rgba(240,160,144,0.12),transparent 70%);pointer-events:none;"></div>
  <div style="font-size:8px;letter-spacing:0.18em;text-transform:uppercase;color:var(--rose);margin-bottom:8px;">✦ Based on your conversations with Aria</div>
  <div id="aj-depth-title" style="font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:var(--text);margin-bottom:6px;">—</div>
  <div id="aj-depth-msg" style="font-size:13px;color:var(--muted2);line-height:1.75;margin-bottom:10px;"></div>
  <div id="aj-next-label" style="font-size:11px;color:var(--muted);border-top:1px solid var(--border);padding-top:10px;margin-top:4px;"></div>
</div>

<!-- MILESTONE MOMENTS -->
<div style="margin-bottom:26px;">
  <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--text);margin-bottom:12px;">Milestone Moments with Aria</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:14px;">
      <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--rose);margin-bottom:6px;">Level 1 • Discovery</div>
      <div style="font-size:12px;color:var(--text);line-height:1.6;">March 12, 2025 — Aria and John discussed upgrading to Premium and bringing Support products into his life.</div>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:14px;">
      <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--gold);margin-bottom:6px;">Level 2 • Use Cases</div>
      <div style="font-size:12px;color:var(--text);line-height:1.6;">Aria explained when to apply Laciador, how to wash next, and what changes would lift results.</div>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:14px;">
      <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--blue);margin-bottom:6px;">Level 3 • Inner Circle</div>
      <div style="font-size:12px;color:var(--text);line-height:1.6;">Aria noted what John’s girlfriend liked and how his family could join the routine.</div>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:14px;">
      <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--green);margin-bottom:6px;">Level 4 • Professional</div>
      <div style="font-size:12px;color:var(--text);line-height:1.6;">Aria confirmed he’s ready to earn with SupportRD and become a professional success story.</div>
    </div>
  </div>
</div>

<!-- SESSION TIMELINE -->
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
  <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--text);">Your Sessions with Aria</div>
  <div id="aj-session-count" style="font-size:10px;color:var(--muted);font-family:'IBM Plex Mono',monospace;letter-spacing:0.1em;"></div>
</div>
<div id="aj-timeline" style="position:relative;padding-bottom:20px;">
  <div class="ppage-empty" id="aj-empty" style="display:none;">Start chatting with Aria to build your journey history.</div>
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
    <button class="gate-btn" onclick="dashboardUpgrade()">Unlock Premium — $35/mo →</button>
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
    <div class="gate-desc">Aria scans your hair in real time — detecting porosity, damage, density, and texture — then builds your personalized treatment plan.</div>
    <button class="gate-btn" onclick="dashboardUpgrade()">Unlock Premium — $35/mo →</button>
  </div>

  <div id="photo-content" style="display:none">
    <div class="pa-page">

      <!-- Intro -->
      <div class="pa-intro">
        <div class="pa-intro-title">Let Aria read your hair</div>
        <div class="pa-intro-sub">Use your camera for a live scan or upload a photo. Aria will detect your hair's porosity, damage level, density, and texture — then build your personalized treatment plan.</div>
      </div>

      <!-- Mode tabs -->
      <div class="pa-mode-tabs">
        <button class="pa-tab active" id="pa-tab-camera" onclick="paSetMode('camera')">📷 Live Camera Scan</button>
        <button class="pa-tab" id="pa-tab-upload" onclick="paSetMode('upload')">📁 Upload Photo</button>
      </div>

      <!-- CAMERA MODE -->
      <div id="pa-camera-mode">

        <!-- Step 1: Open Camera button (shown first, no camera running yet) -->
        <div class="pa-controls" id="pa-cam-controls">
          <button class="pa-btn-primary" id="pa-open-camera-btn" onclick="paOpenCamera()">📷 Open Camera</button>
          <button class="pa-btn-secondary" id="pa-no-cam-link" onclick="paSetMode('upload')" style="display:none">No camera? Upload instead →</button>
        </div>

        <!-- Camera denied / not available -->
        <div id="pa-cam-no-access" style="display:none;text-align:center;padding:16px;">
          <div style="font-size:13px;color:var(--muted);margin-bottom:10px;">Camera not available — make sure you allow access when prompted.</div>
          <button class="pa-btn-secondary" onclick="paSetMode('upload')">Upload a photo instead →</button>
        </div>

        <!-- Scanner (hidden until camera is opened) -->
        <div class="pa-scanner-wrap" id="pa-scanner-wrap" style="display:none">
          <video id="pa-video" class="pa-video" autoplay playsinline muted></video>
          <canvas id="pa-capture-canvas" style="display:none"></canvas>
          <div class="pa-scanner-overlay">
            <div class="pa-oval-guide"></div>
            <div class="pa-bracket pa-bracket--tl"></div>
            <div class="pa-bracket pa-bracket--tr"></div>
            <div class="pa-bracket pa-bracket--bl"></div>
            <div class="pa-bracket pa-bracket--br"></div>
            <div class="pa-scan-line" id="pa-scan-line"></div>
            <div class="pa-instruction">
              <div class="pa-instruction-text" id="pa-instruction-text">Position your hair in the oval guide</div>
              <div class="pa-instruction-sub" id="pa-instruction-sub">Good lighting works best · tap Start Scan when ready</div>
              <div class="pa-turn-track" id="pa-turn-track" style="display:none">
                <div class="pa-turn-dot" id="pa-dot-0"></div>
                <div class="pa-turn-dot" id="pa-dot-1"></div>
                <div class="pa-turn-dot" id="pa-dot-2"></div>
                <div class="pa-turn-dot" id="pa-dot-3"></div>
                <div class="pa-turn-dot" id="pa-dot-4"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Start scan button (shown after camera opens) -->
        <div class="pa-controls" style="margin-top:12px;">
          <button class="pa-btn-primary" id="pa-start-scan-btn" onclick="paStartScan()" style="display:none">✦ Start Hair Scan</button>
        </div>

        <!-- Next / Capture button — overlaid during scan steps -->
        <div style="max-width:520px;margin:10px auto 0;">
          <button class="pa-btn-primary" id="pa-next-btn" onclick="paNextStep()" style="display:none">Next →</button>
        </div>

      </div>

      <!-- UPLOAD MODE -->
      <div id="pa-upload-mode" style="display:none">
        <div class="pa-upload-zone" id="pa-upload-zone" onclick="document.getElementById('pa-file-input').click()">
          <div class="pa-upload-icon">🌿</div>
          <div class="pa-upload-label">Tap to choose a hair photo</div>
          <div class="pa-upload-sub">JPG or PNG · max 5MB · clear photo works best</div>
          <img id="pa-upload-preview" class="pa-upload-preview">
        </div>
        <input type="file" id="pa-file-input" accept="image/*" style="display:none" onchange="paOnUpload(event)">
        <div class="pa-controls">
          <button class="pa-btn-primary" id="pa-upload-analyze-btn" style="display:none" onclick="paAnalyze()">✦ Analyze My Hair</button>
        </div>
      </div>

      <!-- Scanning status (shown during API call) -->
      <div id="pa-scanning-status" class="pa-scanning-status" style="display:none">
        <div class="pa-scanning-dots">
          <div class="pa-scanning-dot"></div>
          <div class="pa-scanning-dot"></div>
          <div class="pa-scanning-dot"></div>
        </div>
        <div class="pa-scanning-msg" id="pa-scanning-msg">Aria is reading your hair…</div>
      </div>

      <!-- RESULTS (dead center) -->
      <div id="pa-result" class="pa-result" style="display:none">
        <div class="pa-result-header">
          <div class="pa-result-score-ring">
            <svg class="pa-result-score-svg" viewBox="0 0 110 110">
              <defs>
                <linearGradient id="pa-rg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--rose)"/>
                  <stop offset="100%" stop-color="var(--gold)"/>
                </linearGradient>
              </defs>
              <circle cx="55" cy="55" r="46" fill="none" stroke="var(--border2)" stroke-width="7"/>
              <circle id="pa-score-arc" cx="55" cy="55" r="46" fill="none" stroke="url(#pa-rg)" stroke-width="7"
                stroke-linecap="round" stroke-dasharray="289" stroke-dashoffset="289"
                transform="rotate(-90 55 55)" style="transition:stroke-dashoffset 1.4s cubic-bezier(0.25,1,0.5,1);filter:drop-shadow(0 0 5px rgba(240,160,144,0.5));"/>
            </svg>
            <div class="pa-result-score-center">
              <div class="pa-result-score-num" id="pa-score-num">—</div>
              <div class="pa-result-score-lbl">/ 100</div>
            </div>
          </div>
          <div class="pa-result-title" id="pa-result-title">Hair Health Score</div>
          <div class="pa-result-sub" id="pa-result-sub"></div>
        </div>

        <div class="pa-metrics-grid">
          <div class="pa-metric-card"><div class="pa-metric-label">Porosity</div><div class="pa-metric-val" id="pa-porosity">—</div></div>
          <div class="pa-metric-card"><div class="pa-metric-label">Damage</div><div class="pa-metric-val" id="pa-damage">—</div></div>
          <div class="pa-metric-card"><div class="pa-metric-label">Density</div><div class="pa-metric-val" id="pa-density">—</div></div>
          <div class="pa-metric-card"><div class="pa-metric-label">Texture</div><div class="pa-metric-val" id="pa-texture">—</div></div>
        </div>

        <div class="pa-advice-block" id="pa-advice"></div>

        <div class="pa-section-label">What Aria observed</div>
        <div id="pa-obs"></div>

        <div class="pa-section-label">Recommended products</div>
        <div id="pa-recs"></div>

        <div class="pa-section-label">Past analyses</div>
        <div id="pa-history-list"></div>

        <div style="margin-top:28px;padding-top:20px;border-top:1px solid var(--border);text-align:center;">
          <button onclick="paReset()" style="background:var(--rose);color:#000;border:none;border-radius:30px;padding:14px 40px;font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.08em;cursor:pointer;width:100%;max-width:320px;">✦ Scan Again</button>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- ✦ SETTINGS -->

<!-- ✦ HANDS-FREE DRIVE + CANDY LAND GPS -->
<div class="ppage" id="pp-drive">
<div class="drive-fullscreen" id="drive-fullscreen">

  <!-- ── HEADER ───────────────────────────────────────────── -->
  <div class="drive-header">
    <div class="drive-header-left">
      <div class="drive-status-dot" id="drive-dot"></div>
      <div class="drive-title-text">🚗 Hands-Free Drive</div>
      <div class="drive-engine-badge">Powered by Claude claude-sonnet-4-20250514</div>
    </div>
    <div class="drive-header-right">
      <button class="drive-mode-toggle" id="drive-mode-toggle" onclick="driveToggleMode()">🍬 Adventure GPS</button>
      <button class="drive-close-btn" onclick="switchPTab('overview')">✕ Exit</button>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════ -->
  <!-- MODE A: ARIA CHAT (default)                           -->
  <!-- ══════════════════════════════════════════════════════ -->
  <div id="drive-chat-mode">
    <div class="drive-aria-row">
      <div class="drive-aria-orb" id="drive-aria-orb">
        <div class="drive-aria-letter">A</div>
        <div class="drive-aria-pulse"></div>
      </div>
      <div>
        <div class="drive-aria-name">Aria</div>
        <div class="drive-aria-status" id="drive-aria-status">Ready. Tap mic or type.</div>
      </div>
    </div>
    <div class="drive-msgs" id="drive-msgs">
      <div class="drive-msg drive-msg-aria">
        <div class="drive-msg-bubble">Hey! I'm Aria 🌿 Drive safe. Tap 🍬 Adventure GPS to find coding stores, hair shops, and parks near you!</div>
      </div>
    </div>
    <div class="drive-input-row">
      <button class="drive-mic-btn" id="drive-mic-btn" onclick="driveMicTap()">🎤</button>
      <input type="text" class="drive-text-input" id="drive-text-input"
        placeholder="Speak or type to Aria…"
        onkeydown="if(event.key==='Enter')driveSend()">
      <button class="drive-send-btn" onclick="driveSend()">↑</button>
    </div>
    <div class="drive-mic-status" id="drive-mic-status">Tap mic to speak hands-free</div>
  </div>

  <!-- ══════════════════════════════════════════════════════ -->
  <!-- MODE B: CANDY LAND GPS                               -->
  <!-- ══════════════════════════════════════════════════════ -->
  <div id="drive-gps-mode" style="display:none;flex:1;display:none;flex-direction:column;overflow:hidden;">

    <!-- Destination picker -->
    <div class="cl-dest-bar" id="cl-dest-bar">
      <div class="cl-dest-label">✦ Where are we adventuring?</div>
      <div class="cl-dest-btns">
        <button class="cl-dest-btn" onclick="clStartSearch('coding')">💻 Coding Stores</button>
        <button class="cl-dest-btn" onclick="clStartSearch('hair')">💆 Hair Shops</button>
        <button class="cl-dest-btn" onclick="clStartSearch('park')">🌳 Parks</button>
        <button class="cl-dest-btn" onclick="clStartSearch('all')">🗺 All Nearby</button>
      </div>
    </div>

    <!-- Candy Land MAP canvas -->
    <div class="cl-map-wrap" id="cl-map-wrap">
      <canvas id="cl-canvas" class="cl-canvas"></canvas>

      <!-- GPS Safety Lock banner -->
      <div class="cl-gps-banner" id="cl-gps-banner" style="display:none;">
        <div class="cl-gps-banner-icon">🛰</div>
        <div class="cl-gps-banner-text">GPS SAFETY LOCK — Instant refresh active — drive safe</div>
        <div class="cl-gps-dots">
          <div class="cl-gps-dot"></div>
          <div class="cl-gps-dot"></div>
          <div class="cl-gps-dot"></div>
        </div>
      </div>

      <!-- Player token (positioned by JS) -->
      <div class="cl-player" id="cl-player">🚗</div>

      <!-- Destination marker -->
      <div class="cl-dest-marker" id="cl-dest-marker" style="display:none">🏁</div>

      <!-- Floating landmark bubbles (created dynamically) -->
      <div id="cl-landmarks"></div>
    </div>

    <!-- Bottom nav card -->
    <div class="cl-nav-card" id="cl-nav-card">
      <div class="cl-nav-top">
        <div class="cl-nav-dest" id="cl-nav-dest">Pick a destination above ↑</div>
        <div class="cl-nav-dist" id="cl-nav-dist"></div>
      </div>
      <div class="cl-direction-banner" id="cl-direction-banner">
        <div class="cl-dir-arrow" id="cl-dir-arrow">↑</div>
        <div class="cl-dir-text" id="cl-dir-text">Start your adventure!</div>
      </div>
      <div class="cl-landmarks-strip" id="cl-landmarks-strip">
        <!-- landmark chips injected here -->
      </div>
      <!-- Aria narration bar -->
      <!-- Aria narration + inline ask bar -->
      <div class="cl-aria-bar">
        <div class="cl-aria-face">A</div>
        <div class="cl-aria-narration" id="cl-aria-narration">Aria is your co-pilot 🌿 Pick a destination to begin.</div>
        <button class="cl-aria-speak-btn" onclick="clSpeakNarration()" title="Replay">🔊</button>
      </div>
      <!-- GPS Ask Aria row -->
      <div class="cl-ask-row" id="cl-ask-row">
        <button class="cl-ask-mic" id="cl-ask-mic" onclick="clGpsMicTap()" title="Hold to ask Aria">🎤</button>
        <input type="text" class="cl-ask-input" id="cl-ask-input"
          placeholder="Ask Aria anything hands-free…"
          onkeydown="if(event.key==='Enter')clGpsAsk()">
        <button class="cl-ask-send" onclick="clGpsAsk()">↑</button>
      </div>
      <div class="cl-ask-status" id="cl-ask-status"></div>
    </div>

    <!-- Results list -->
    <div class="cl-results" id="cl-results" style="display:none">
      <div class="cl-results-title" id="cl-results-title">Nearby</div>
      <div class="cl-results-list" id="cl-results-list"></div>
      <button class="cl-results-close" onclick="clCloseResults()">✕ Close</button>
    </div>
  </div>

</div>
</div>
<!-- /DRIVE PAGE -->

<div class="ppage" id="pp-settings">
  <div class="ppage-head">
    <div class="ppage-title">⚙ Settings</div>
  </div>
  <div class="settings-page">

    <!-- Tools & Perks -->
    <div class="settings-section" id="st-tools-perks">
      <div class="settings-section-title">Tools &amp; Perks</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:14px;">
          <div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-bottom:6px;">Submit Upgrade Idea</div>
          <div style="font-size:12px;color:var(--muted2);line-height:1.6;margin-bottom:10px;">Earn 1 free month of Premium if we build your idea.</div>
          <button class="settings-save-btn" onclick="openUpgradeModal()" style="width:100%;">Submit Idea →</button>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:8px;" id="starter-bag-card">
          <div style="font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);">Starter Bag</div>
          <div style="font-size:12px;color:var(--muted2);line-height:1.6;">Premium members unlock your Starter Bag perks.</div>
          <button class="settings-save-btn" onclick="dashboardUpgrade()" style="width:100%;">Unlock Starter Bag →</button>
        </div>
      </div>
      <div style="margin-top:12px;">
        <button class="settings-save-btn" onclick="openPositionsModal()" style="background:var(--gold);color:#000;">🗳 Open Positions &amp; Partnerships →</button>
      </div>
    </div>

    <!-- Billing -->
    <div class="settings-section">
      <div class="settings-section-title">Subscription & Billing</div>
      <div class="billing-card">
        <div class="billing-plan-name" id="st-plan-name">Free Plan</div>
        <div class="billing-next" id="st-next-payment">—</div>
        <a href="https://supportrd.com/products/hair-advisor-premium" class="billing-manage-btn" id="st-manage-btn">Upgrade to Premium →</a>
      </div>
    </div>

    <!-- Profile -->
    <div class="settings-section">
      <div class="settings-section-title">Profile Information</div>
      <label style="font-size:11px;color:var(--muted);letter-spacing:0.06em;">Full Name</label>
      <input class="settings-input" id="st-name" placeholder="Your name" type="text">
      <label style="font-size:11px;color:var(--muted);letter-spacing:0.06em;margin-top:10px;display:block;">Email Address</label>
      <input class="settings-input" id="st-email" placeholder="your@email.com" type="email">
      <label style="font-size:11px;color:var(--muted);letter-spacing:0.06em;margin-top:10px;display:block;">Phone / WhatsApp</label>
      <input class="settings-input" id="st-phone" placeholder="+1 (555) 000-0000" type="tel">
      <label style="font-size:11px;color:var(--muted);letter-spacing:0.06em;margin-top:10px;display:block;">Shipping Address</label>
      <input class="settings-input" id="st-address" placeholder="Street address" type="text" style="margin-bottom:6px;">
      <input class="settings-input" id="st-city" placeholder="City, State, ZIP" type="text">
      <button class="settings-save-btn" onclick="saveProfileSettings()">Save Changes</button>
      <div class="settings-msg" id="st-profile-msg">✓ Profile updated</div>
      <div class="settings-err" id="st-profile-err"></div>
    </div>

    <!-- Password -->
    <div class="settings-section">
      <div class="settings-section-title">Change Password</div>
      <label style="font-size:11px;color:var(--muted);letter-spacing:0.06em;">New Password</label>
      <input class="settings-input" id="st-new-pass" placeholder="New password (min 6 chars)" type="password">
      <label style="font-size:11px;color:var(--muted);letter-spacing:0.06em;margin-top:10px;display:block;">Confirm Password</label>
      <input class="settings-input" id="st-confirm-pass" placeholder="Confirm new password" type="password">
      <button class="settings-save-btn" onclick="savePasswordSettings()">Update Password</button>
      <div class="settings-msg" id="st-pass-msg">✓ Password updated</div>
      <div class="settings-err" id="st-pass-err"></div>
    </div>

    <!-- Notifications -->
    <div class="settings-section">
      <div class="settings-section-title">Notifications</div>
      <div style="font-size:12px;color:var(--muted2);line-height:1.6;margin-bottom:12px;">Aria will remind you each morning on wash days, deep conditioning days, and scalp care days — based on your routine.</div>
      <div class="settings-row" style="margin-bottom:12px;">
        <span class="settings-label">Status</span>
        <span id="st-notif-val" style="font-size:12px;color:var(--muted2);">Checking…</span>
      </div>
      <button class="settings-save-btn" id="st-push-btn" onclick="stTogglePush()">🔔 Enable Push Notifications</button>
    </div>

    <!-- Hands-Free Drive -->
    <div class="settings-section">
      <div class="settings-section-title">🚗 Hands-Free Drive Mode</div>
      <div style="font-size:12px;color:var(--muted2);line-height:1.7;margin-bottom:14px;">Drive Mode gives you a full-screen, large-text conversation with Aria — designed to be used safely while driving. Speak hands-free or type at stops.</div>
      <div class="settings-row" style="margin-bottom:10px;">
        <span class="settings-label">AI Engine</span>
        <span style="font-size:12px;color:var(--muted2);">Claude claude-sonnet-4-20250514 (Anthropic)</span>
      </div>
      <div class="settings-row" style="margin-bottom:14px;">
        <span class="settings-label">Voice Input</span>
        <span style="font-size:12px;color:var(--muted2);">Web Speech API (browser)</span>
      </div>
      <button class="settings-save-btn" onclick="switchPTab('drive')" style="background:var(--rose);">🚗 Open Hands-Free Drive →</button>
    </div>

    <!-- Account -->
    <div class="settings-section">
      <div class="settings-section-title">Account</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="settings-danger-btn" onclick="confirmDeleteAccount()">Delete Account</button>
        <button class="logout-btn" style="font-size:11px;padding:10px 20px;" onclick="doLogout()">Sign Out</button>
      </div>
    </div>

  </div>
</div>

<!-- ✦ HAIR JOURNAL -->
<div class="ppage" id="pp-journal">
  <div class="ppage-head">
    <div class="ppage-title">✦ Hair Journal <span class="premium-badge">PREMIUM</span></div>
    <button class="ppage-regen" onclick="openJournalEntry()">+ New Entry</button>
  </div>
  <div id="journal-gate" class="premium-gate" style="display:none">
    <div class="gate-icon">📓</div>
    <div class="gate-title">Hair Journal</div>
    <div class="gate-desc">Log daily observations about your hair. Aria reads your entries over time and spots patterns — what's working, what isn't, and when your hair is at its best.</div>
    <button class="gate-btn" onclick="dashboardUpgrade()">Unlock Premium — $35/mo →</button>
  </div>
  <div id="journal-content" style="display:none">
    <div class="journal-layout">
      <!-- New entry form -->
      <div class="journal-form-panel" id="journal-form-panel" style="display:none">
        <div class="jf-title">Today's Entry</div>
        <div class="jf-rating-row">
          <span class="jf-label">How's your hair today?</span>
          <div class="jf-stars" id="jf-stars">
            <span onclick="setJournalRating(1)">★</span>
            <span onclick="setJournalRating(2)">★</span>
            <span onclick="setJournalRating(3)">★</span>
            <span onclick="setJournalRating(4)">★</span>
            <span onclick="setJournalRating(5)">★</span>
          </div>
        </div>
        <textarea id="jf-note" class="jf-textarea" placeholder="What did you notice about your hair today? Any treatments, changes, environment? The more detail the better for Aria to spot patterns…" rows="4"></textarea>
        <div class="jf-photo-row">
          <div class="jf-photo-btn" onclick="document.getElementById('jf-photo-input').click()">📸 Add Photo (optional)</div>
          <input type="file" id="jf-photo-input" accept="image/*" style="display:none" onchange="onJournalPhoto(event)">
          <img id="jf-photo-preview" style="display:none;max-height:80px;border-radius:8px;margin-left:10px;object-fit:cover;">
        </div>
        <div style="display:flex;gap:8px;margin-top:10px;">
          <button class="save-btn" onclick="saveJournalEntry()">✦ Save Entry</button>
          <button onclick="closeJournalEntry()" style="background:none;border:1px solid var(--border2);color:var(--muted2);padding:10px 16px;border-radius:6px;cursor:pointer;font-family:var(--brand-font-body);font-size:12px;">Cancel</button>
        </div>
        <div id="jf-saving" style="display:none;font-size:11px;color:var(--muted2);margin-top:6px;display:flex;align-items:center;gap:8px;">
          <div class="ppage-spinner" style="width:14px;height:14px;"></div> Saving & asking Aria for insights…
        </div>
      </div>
      <!-- Entries list -->
      <div class="journal-entries" id="journal-entries">
        <div class="h-empty">Loading journal…</div>
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
    <button class="gate-btn" onclick="dashboardUpgrade()">Unlock Premium — $35/mo →</button>
  </div>
  <div id="whatsapp-content" style="display:none">
    <div style="max-width:500px;margin:0 auto;">
      <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:16px;padding:24px;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:44px;height:44px;background:#25d366;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">💬</div>
          <div><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;">WhatsApp Aria</div><div style="font-size:12px;color:var(--muted2);">Chat directly on WhatsApp</div></div>
        </div>
        <a href="https://wa.me/18292332670" target="_blank" style="display:block;text-align:center;padding:12px;background:#25d366;color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;border-radius:10px;text-decoration:none;margin-bottom:10px;">Open WhatsApp Chat →</a>
        <div style="font-size:11px;color:var(--muted);text-align:center;">Text any hair question to start your session with Aria</div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:16px;padding:24px;margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:44px;height:44px;background:var(--rose);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">📱</div>
          <div><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;">Link Your Phone for Aria SMS</div><div style="font-size:12px;color:var(--muted2);">Aria remembers your hair profile when you text</div></div>
        </div>
        <div style="display:flex;gap:8px;">
          <input id="phone-link-input" type="tel" placeholder="+1 (829) 233-2670" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:'Space Grotesk',sans-serif;font-size:13px;padding:10px 12px;outline:none;">
          <button onclick="linkPhone()" id="link-phone-btn" style="background:var(--rose);border:none;color:#000;font-family:'Syne',sans-serif;font-size:12px;font-weight:700;padding:10px 16px;border-radius:8px;cursor:pointer;white-space:nowrap;">Link</button>
        </div>
        <div id="phone-link-msg" style="font-size:11px;margin-top:8px;min-height:14px;"></div>
      </div>
      <!-- Push Notifications card -->
      <div style="background:var(--bg2);border:1px solid rgba(240,160,144,0.25);border-radius:16px;padding:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:44px;height:44px;background:linear-gradient(135deg,#c1a3a2,#d4a85a);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">🔔</div>
          <div><div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;">Wash Day Reminders</div><div style="font-size:12px;color:var(--muted2);">Aria notifies you based on your routine</div></div>
        </div>
        <div style="font-size:12px;color:var(--muted2);line-height:1.6;margin-bottom:14px;">Enable push notifications and Aria will remind you every morning when it's wash day, deep conditioning day, or scalp care day — based on the routine she built for you.</div>
        <div id="push-btn-wrap">
          <button onclick="enablePushNotifications()" id="push-enable-btn" style="width:100%;padding:12px;background:linear-gradient(135deg,#c1a3a2,#d4a85a);border:none;color:#000;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;border-radius:10px;cursor:pointer;">🔔 Enable Reminders</button>
        </div>
        <div id="push-status" style="font-size:11px;color:var(--muted2);text-align:center;margin-top:8px;min-height:14px;"></div>
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

<!-- POSITIONS & PARTNERSHIPS MODAL -->
<div id="positions-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;align-items:center;justify-content:center;padding:24px;" onclick="if(event.target===this)closePositionsModal()">
  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:20px;padding:30px 26px;max-width:460px;width:100%;" onclick="event.stopPropagation()">
    <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;">🗳 Positions &amp; Partnerships</div>
    <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--text);margin-bottom:10px;">Support the Movement</div>
    <div style="font-size:12px;color:var(--muted2);line-height:1.7;margin-bottom:18px;">These are the official partnership and community paths you can support directly from SupportRD.</div>
    <div style="display:grid;gap:10px;">
      <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:14px;">
        <div style="font-size:11px;color:var(--text);font-weight:700;margin-bottom:6px;">Campaign for the Poor</div>
        <div style="font-size:12px;color:var(--muted2);line-height:1.6;margin-bottom:10px;">Donate or contribute resources to help families and communities.</div>
        <a href="mailto:hello@supportrd.com?subject=Campaign%20for%20the%20Poor%20Donation" style="display:inline-block;background:var(--gold);color:#000;border-radius:20px;padding:8px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Donate by Email →</a>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--border2);border-radius:12px;padding:14px;">
        <div style="font-size:11px;color:var(--text);font-weight:700;margin-bottom:6px;">Auto Dissolve Bar</div>
        <div style="font-size:12px;color:var(--muted2);line-height:1.6;margin-bottom:10px;">Partner with us to design and ship the Dissolve Soap Bar.</div>
        <a href="mailto:hello@supportrd.com?subject=Auto%20Dissolve%20Bar%20Partnership" style="display:inline-block;background:var(--rose);color:#000;border-radius:20px;padding:8px 16px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Partner Contact →</a>
      </div>
    </div>
    <button onclick="closePositionsModal()" style="margin-top:14px;background:none;border:1px solid var(--border2);color:var(--muted);padding:8px 18px;border-radius:20px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;cursor:pointer;">Close</button>
  </div>
</div>

<div class="toast" id="toast"></div>
<div class="admin-toast" id="admin-toast">
  <div class="admin-toast-title">Admin Corner • 5AM Refresh</div>
  <div class="admin-toast-body" id="admin-toast-body">Daily refresh completed. All pages re-synced.</div>
  <div class="admin-toast-actions">
    <button class="admin-toast-btn primary" onclick="adminToastRefresh()">Refresh Now</button>
    <button class="admin-toast-btn" onclick="adminToastDismiss()">Got it</button>
  </div>
</div>

<script>
const token = localStorage.getItem('srd_token');
// Token already verified in <head> — if we're here it's valid

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

function tagsToString(id){return[...document.querySelectorAll('#'+id+' .tag.active')].map(t=>t.textContent.trim()).join(', ');}
function setTagsFromString(id,val){
  if(!val) return;
  const sel=val.split(',').map(s=>s.trim().toLowerCase());
  document.querySelectorAll('#'+id+' .tag').forEach(t=>{if(sel.includes(t.textContent.trim().toLowerCase())) t.classList.add('on');});
}

let _isPremium = false;

function showUpgradeModal(feature){
  // Always push to the Shopify product page — works even if Stripe is down
  if(confirm('✦ ' + (feature||'This feature') + ' requires Premium ($35/month).\n\nTap OK to subscribe at supportrd.com')){
    window.open('https://supportrd.com/products/hair-advisor-premium','_blank');
  }
}

async function dashboardUpgrade(){
  window.open('https://supportrd.com/products/hair-advisor-premium','_blank');
}

// ── PROFILE PAGE ─────────────────────────────────────────────────────────────
function openProfilePage(){
  const u = JSON.parse(localStorage.getItem('srd_user')||'{}');
  // Avatar
  const av = document.getElementById('prof-avatar');
  if(av) av.textContent = (u.name||'?')[0].toUpperCase();
  if(document.getElementById('prof-name-big'))  document.getElementById('prof-name-big').textContent  = u.name||'—';
  if(document.getElementById('prof-email-sm'))  document.getElementById('prof-email-sm').textContent  = u.email||'';
  if(document.getElementById('prof-score-big')) document.getElementById('prof-score-big').textContent = localStorage.getItem('srd_score')||'—';
  if(document.getElementById('prof-member-since')){
    const ms = u.created_at ? new Date(u.created_at).toLocaleDateString('en-US',{month:'short',year:'numeric'}) : '—';
    document.getElementById('prof-member-since').textContent = ms;
  }
  // Plan badge
  const pb = document.getElementById('prof-plan-badge');
  if(pb){ const isPrem = localStorage.getItem('srd_premium')==='1'; pb.textContent=isPrem?'PREMIUM':'FREE'; pb.style.color=isPrem?'var(--green)':'var(--gold)'; }
  // Streak (days since last visit — rough approximation)
  const lastV = parseInt(localStorage.getItem('srd_last_visit')||'0');
  const today = Math.floor(Date.now()/86400000);
  let streak = parseInt(localStorage.getItem('srd_streak')||'1');
  if(lastV === today-1){ streak++; localStorage.setItem('srd_streak',streak); }
  else if(lastV < today-1){ streak=1; localStorage.setItem('srd_streak',1); }
  localStorage.setItem('srd_last_visit',today);
  if(document.getElementById('prof-streak')) document.getElementById('prof-streak').textContent = streak+'d';

  // Load profile tags from API
  fetch('/api/profile',{headers:{'X-Auth-Token':token}}).then(r=>r.json()).then(d=>{
    if(!d) return;
    restoreTags('pf-tags-type',       d.hair_type);
    restoreTags('pf-tags-concerns',   d.hair_concerns);
    restoreTags('pf-tags-treatments', d.treatments);
    restoreTags('pf-tags-products',   d.products_tried);
    restoreTags('pf-tags-porosity',   d.porosity||'');
    restoreTags('pf-tags-scalp',      d.scalp||'');
    restoreTags('pf-tags-washfreq',   d.wash_freq||'');
    restoreTags('pf-tags-heat',       d.heat_styling||'');
    restoreTags('pf-tags-env',        d.environment||'');
    if(document.getElementById('pf-goals')) document.getElementById('pf-goals').value = d.goals||'';
    profBuildProductCarousel(d.products_tried||'');
  }).catch(()=>{});

  occInit();
}

function restoreTags(containerId, csv){
  if(!csv) return;
  const vals = csv.toLowerCase().split(',').map(s=>s.trim());
  const el = document.getElementById(containerId);
  if(!el) return;
  el.querySelectorAll('.tag').forEach(t=>{
    if(vals.some(v=>t.textContent.toLowerCase().includes(v)||v.includes(t.textContent.toLowerCase().slice(0,5))))
      t.classList.add('active');
  });
}

// ── PRODUCT CAROUSEL ─────────────────────────────────────────────
const PROD_IMGS = {
  'Formula Exclusiva':  'https://cdn.shopify.com/s/files/1/0593/2715/2208/files/formula.jpg',
  'Laciador Crece':     'https://cdn.shopify.com/s/files/1/0593/2715/2208/files/laciador.jpg',
  'Gotero Rapido':      'https://cdn.shopify.com/s/files/1/0593/2715/2208/files/gotero.jpg',
  'Gotitas Brillantes': 'https://cdn.shopify.com/s/files/1/0593/2715/2208/files/gotitas.jpg',
  'Mascarilla Capilar': 'https://cdn.shopify.com/s/files/1/0593/2715/2208/files/mascarilla.jpg',
  'Shampoo Aloe Vera':  'https://cdn.shopify.com/s/files/1/0593/2715/2208/files/shampoo.jpg',
};
const PROD_COLORS = ['var(--rose)','var(--gold)','var(--blue)','var(--green)','var(--purple)','#c06050'];

function profBuildProductCarousel(csv){
  const track = document.getElementById('prof-product-track');
  const dots  = document.getElementById('prof-product-dots');
  if(!track||!dots) return;
  const names = csv ? csv.split(',').map(s=>s.trim()).filter(Boolean) : [];
  if(!names.length){
    track.innerHTML = '<div style="width:72px;height:90px;background:var(--bg2);border:1px dashed var(--border2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">✦</div>';
    dots.innerHTML=''; return;
  }
  // 3 visible at a time, scroll with dots
  const pages = Math.ceil(names.length/3);
  track.innerHTML = names.map((n,i)=>{
    const col = PROD_COLORS[i%PROD_COLORS.length];
    return '<div style="width:72px;height:90px;border-radius:10px;background:'+col+';background:linear-gradient(160deg,'+col+',rgba(0,0,0,0.4));border:1px solid rgba(255,255,255,0.1);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:6px;overflow:hidden;flex-shrink:0;">'
      +'<div style="font-size:7px;text-align:center;color:#fff;font-family:\'IBM Plex Mono\',monospace;letter-spacing:0.06em;line-height:1.3;">'+n+'</div></div>';
  }).join('');
  dots.innerHTML = Array.from({length:pages},(_,i)=>'<div onclick="profCarouselTo('+i+')" style="width:6px;height:6px;border-radius:50%;background:'+(i===0?'var(--rose)':'var(--border2)')+';cursor:pointer;transition:background 0.2s;" id="prof-dot-'+i+'"></div>').join('');
}

function profCarouselTo(page){
  const track = document.getElementById('prof-product-track');
  if(!track) return;
  const itemH = 98; // 90px + 8px gap
  track.style.transform = 'translateY(-'+(page*3*itemH)+'px)';
  document.querySelectorAll('[id^="prof-dot-"]').forEach((d,i)=>{
    d.style.background = i===page ? 'var(--rose)' : 'var(--border2)';
  });
}

// ── AI STATUS REFRESH ─────────────────────────────────────────────
async function profRefreshAiStatus(){
  const el = document.getElementById('prof-ai-status');
  if(!el) return;
  el.textContent = 'Aria is reading your hair journey…';
  try{
    const r = await fetch('/api/profile/ai-status',{headers:{'X-Auth-Token':token}});
    const d = await r.json();
    if(d.status) el.textContent = d.status;
    else el.textContent = 'Keep logging your progress and Aria will tell you more!';
  }catch(e){ el.textContent = 'Could not reach Aria right now — try again soon.'; }
}

// ── SHARE ─────────────────────────────────────────────────────────
function profShare(platform){
  const u = JSON.parse(localStorage.getItem('srd_user')||'{}');
  const score = localStorage.getItem('srd_score')||'?';
  const text = encodeURIComponent((u.name||'I')+' scored '+score+'/100 on my hair health with Aria by SupportRD! ✦ Try it free: https://aria.supportrd.com');
  const urls = {
    instagram: 'https://www.instagram.com/',
    facebook:  'https://www.facebook.com/sharer/sharer.php?u=https://aria.supportrd.com&quote='+text,
    tiktok:    'https://www.tiktok.com/',
    twitter:   'https://twitter.com/intent/tweet?text='+text,
    whatsapp:  'https://wa.me/?text='+text,
    pinterest: 'https://pinterest.com/pin/create/button/?url=https://aria.supportrd.com&description='+text,
  };
  window.open(urls[platform]||'https://aria.supportrd.com','_blank');
}

// ── OCCASIONS ─────────────────────────────────────────────────────
const OCC_TEMPLATES = [
  'Professional Meeting','Job Interview','Date Night','Wedding Guest','Bride / Groom','Bridesmaid',
  'Graduation','Birthday Party','Red Carpet','Gala / Formal Event','Baby Shower','Bridal Shower',
  'Church / Religious Service','First Day of School','School Photo Day','Prom','Quinceañera',
  'Beach Day','Pool Party','Outdoor Festival','Camping / Hiking','Road Trip','Vacation',
  'Gym / Workout','Sports Event','Yoga / Pilates','Running / Marathon',
  'At-Home Wash Day','Lazy Sunday','Protective Style Day','Twist Out / Braid Out Day',
  'Hot Oil Treatment Night','Deep Condition Day','Scalp Massage Night','Overnight Mask',
  'Holiday Party','New Year\'s Eve','Halloween','Valentine\'s Day','4th of July','Christmas',
  'Family Reunion','Girls Trip','Bachelorette','Spa Day',
  'Photoshoot','Content Creation Day','Headshot Day','Stage Performance','Concert',
  'Casual Friday','Business Casual','Remote Work Day','Zoom Call',
  'Rain Day','Snow Day','Humid Weather','Dry Season','High Altitude Travel',
  'Post-Swim','Post-Workout','Post-Color Treatment','Post-Relaxer Care',
];

let _occCurrentName = '';

function profBuildOccasionTemplates(){
  const el = document.getElementById('occ-templates');
  if(!el) return;
  el.innerHTML = OCC_TEMPLATES.map(n=>
    '<button onclick="occOpenEditor(\''+n.replace(/'/g,"\\'")+'\')" style="background:var(--bg3);border:1px solid var(--border2);color:var(--muted2);padding:6px 12px;border-radius:20px;font-size:11px;cursor:pointer;white-space:nowrap;transition:all 0.15s;" onmouseover="this.style.borderColor=\'var(--rose)\';this.style.color=\'var(--rose)\'" onmouseout="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--muted2)\'">'+n+'</button>'
  ).join('');
}

function occOpenEditor(name){
  _occCurrentName = name;
  document.getElementById('occ-editor-title').textContent = '✦ '+name;
  document.getElementById('occ-steps').value='';
  document.querySelectorAll('#occ-product-tags .tag').forEach(t=>t.classList.remove('active'));
  // Pre-fill if already saved
  const saved = JSON.parse(localStorage.getItem('srd_occasions')||'{}');
  if(saved[name]){
    document.getElementById('occ-steps').value = saved[name].steps||'';
    (saved[name].products||[]).forEach(p=>{
      document.querySelectorAll('#occ-product-tags .tag').forEach(t=>{ if(t.textContent===p) t.classList.add('active'); });
    });
  }
  const ed = document.getElementById('occ-editor');
  ed.style.display='block';
  ed.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function occSave(){
  if(!_occCurrentName){ showToast('Pick an occasion first'); return; }
  const steps = document.getElementById('occ-steps').value.trim();
  const products = [...document.querySelectorAll('#occ-product-tags .tag.active')].map(t=>t.textContent);
  const saved = JSON.parse(localStorage.getItem('srd_occasions')||'{}');
  saved[_occCurrentName] = {steps, products, updated: new Date().toLocaleDateString()};
  localStorage.setItem('srd_occasions', JSON.stringify(saved));
  showToast('✦ '+_occCurrentName+' routine saved!');
  document.getElementById('occ-editor').style.display='none';
  occLoadSaved();
}

function occLoadSaved(){
  const el = document.getElementById('occ-saved-list');
  if(!el) return;
  const saved = JSON.parse(localStorage.getItem('srd_occasions')||'{}');
  const keys = Object.keys(saved);
  if(!keys.length){ el.innerHTML='<div style="font-size:12px;color:var(--muted);padding:8px 0;">No occasions saved yet — pick a template above.</div>'; return; }
  el.innerHTML = '<div style="font-family:\'IBM Plex Mono\',monospace;font-size:8px;letter-spacing:0.18em;color:var(--muted);text-transform:uppercase;margin-bottom:10px;">Saved Occasions ('+keys.length+')</div>'
    + keys.map(k=>{
    const o = saved[k];
    return '<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:14px 18px;margin-bottom:10px;">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
      +'<div style="font-family:\'Space Grotesk\',sans-serif;font-weight:700;font-size:13px;color:var(--text);">✦ '+k+'</div>'
      +'<div style="display:flex;gap:8px;">'
      +'<button onclick="occOpenEditor(\''+k.replace(/'/g,"\\'")+'\')" style="background:none;border:1px solid var(--border2);color:var(--muted2);padding:3px 10px;border-radius:10px;font-size:10px;cursor:pointer;">Edit</button>'
      +'<button onclick="occDelete(\''+k.replace(/'/g,"\\'")+'\')" style="background:none;border:1px solid rgba(255,80,80,0.3);color:rgba(255,120,120,0.7);padding:3px 10px;border-radius:10px;font-size:10px;cursor:pointer;">✕</button>'
      +'</div></div>'
      +(o.steps?'<div style="font-size:12px;color:var(--muted2);line-height:1.6;margin-bottom:8px;">'+o.steps+'</div>':'')
      +(o.products&&o.products.length?'<div style="display:flex;flex-wrap:wrap;gap:6px;">'
        +o.products.map(p=>'<span style="font-size:10px;padding:3px 8px;background:rgba(240,160,144,0.1);border:1px solid rgba(240,160,144,0.2);border-radius:10px;color:var(--rose);">'+p+'</span>').join('')
        +'</div>':'')
      +'<div style="font-size:9px;color:var(--muted);margin-top:8px;">Updated '+o.updated+'</div>'
      +'</div>';
  }).join('');
}

function occDelete(name){
  const saved = JSON.parse(localStorage.getItem('srd_occasions')||'{}');
  delete saved[name];
  localStorage.setItem('srd_occasions',JSON.stringify(saved));
  occLoadSaved();
  showToast('Removed '+name);
}

async function saveProfileFull(){
  // Sync all tag groups
  const data = {
    hair_type:      tagsToString('tags-type'),
    hair_concerns:  tagsToString('tags-concerns'),
    treatments:     tagsToString('tags-treatments'),
    products_tried: tagsToString('tags-products'),
    porosity:       tagsToString('pf-tags-porosity').replace(/pf-tags-/g,''),
    scalp:          tagsToString('pf-tags-scalp').replace(/pf-tags-/g,''),
    wash_freq:      tagsToString('pf-tags-washfreq').replace(/pf-tags-/g,''),
    heat_styling:   tagsToString('pf-tags-heat').replace(/pf-tags-/g,''),
    environment:    tagsToString('pf-tags-env').replace(/pf-tags-/g,''),
    goals:          (document.getElementById('pf-goals')||{}).value||'',
  };
  // Also sync the hidden bot-row tags so score updates
  ['type','concerns','treatments','products'].forEach(k=>{
    const src = document.getElementById('pf-tags-'+k);
    const dst = document.getElementById('tags-'+k);
    if(!src||!dst) return;
    dst.querySelectorAll('.tag').forEach(dt=>{
      const match = [...src.querySelectorAll('.tag')].find(st=>st.textContent===dt.textContent);
      dt.classList.toggle('active', match ? match.classList.contains('active') : false);
    });
  });
  try{
    await fetch('/api/profile',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify(data)});
    renderScore(calcScore());
    profBuildProductCarousel(data.products_tried);
    const msg = document.getElementById('pf-save-msg');
    if(msg){ msg.style.display='block'; setTimeout(()=>msg.style.display='none',2500); }
    showToast('✦ Profile saved!');
  }catch(e){ showToast('Save failed — try again'); }
}


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
  const isPrem = _isPremium || localStorage.getItem('srd_premium')==='1';
  if(!isPrem){ document.getElementById('progress-gate').style.display='block'; document.getElementById('progress-content').style.display='none'; return; }
  // Auto-save today's score
  const sc=calcScore();
  fetch('/api/score-history',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},
    body:JSON.stringify({score:sc.overall,moisture:sc.moisture,strength:sc.strength,scalp:sc.scalp,growth:sc.growth})});
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
// ── PHOTO ANALYSIS — SCANNER UI ──────────────────────────────────────────────
let _paMode        = 'camera';
let _paStream      = null;
let _paPhotoB64    = null;
let _paScanStep    = 0;
let _paCameraReady = false;

// ── STEPS ─────────────────────────────────────────────────────────
const PA_STEPS = [
  { tilt:'center', text:'Face the camera straight on',   sub:'Position your hair in the oval, then tap Next' },
  { tilt:'left',   text:'Turn your head to the LEFT ←',  sub:'Turn left so Aria can see that side, then tap Next' },
  { tilt:'right',  text:'Now turn to the RIGHT →',       sub:'Turn right so Aria can see that side, then tap Capture' },
];

// ── MODE SWITCH ───────────────────────────────────────────────────
function paSetMode(mode){
  _paMode = mode;
  document.getElementById('pa-tab-camera').classList.toggle('active', mode==='camera');
  document.getElementById('pa-tab-upload').classList.toggle('active', mode==='upload');
  document.getElementById('pa-camera-mode').style.display = mode==='camera' ? '' : 'none';
  document.getElementById('pa-upload-mode').style.display = mode==='upload' ? '' : 'none';
  if(mode !== 'camera') paStopCamera();
}

// ── OPEN CAMERA ───────────────────────────────────────────────────
async function paOpenCamera(){
  const wrap    = document.getElementById('pa-scanner-wrap');
  const noAcc   = document.getElementById('pa-cam-no-access');
  const openBtn = document.getElementById('pa-open-camera-btn');
  openBtn.disabled = true;
  openBtn.textContent = 'Opening camera…';
  try{
    _paStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:960}}});
    const video = document.getElementById('pa-video');
    video.srcObject = _paStream;
    await new Promise(res=>{ video.onloadedmetadata = res; });
    video.play();
    _paCameraReady = true;
    wrap.style.display = '';
    noAcc.style.display = 'none';
    openBtn.style.display = 'none';
    document.getElementById('pa-start-scan-btn').style.display = 'block';
    document.getElementById('pa-no-cam-link').style.display    = 'block';
    document.getElementById('pa-instruction-text').textContent = 'Position your hair in the oval guide';
    document.getElementById('pa-instruction-sub').textContent  = 'Good lighting works best · tap Start Scan when ready';
  }catch(err){
    _paCameraReady = false;
    openBtn.disabled = false;
    openBtn.textContent = '📷 Open Camera';
    wrap.style.display = 'none';
    noAcc.style.display = 'block';
  }
}

// ── STOP CAMERA ───────────────────────────────────────────────────
function paStopCamera(){
  _paCameraReady = false;
  if(_paStream){ _paStream.getTracks().forEach(t=>t.stop()); _paStream=null; }
}

// ── START SCAN ────────────────────────────────────────────────────
function paStartScan(){
  if(!_paCameraReady){ showToast('Camera not ready'); return; }
  _paScanStep = 0; _paPhotoB64 = null;
  document.getElementById('pa-start-scan-btn').style.display = 'none';
  document.getElementById('pa-no-cam-link').style.display    = 'none';
  document.getElementById('pa-scanner-wrap').classList.add('scanning');
  document.getElementById('pa-scan-line').classList.add('active');
  document.getElementById('pa-turn-track').style.display = 'flex';
  paShowStep(0);
}

// ── SHOW STEP ─────────────────────────────────────────────────────
function paShowStep(step){
  const s = PA_STEPS[step];
  document.getElementById('pa-instruction-text').textContent = s.text;
  document.getElementById('pa-instruction-sub').textContent  = s.sub;
  for(let i=0;i<3;i++){ const d=document.getElementById('pa-dot-'+i); if(d) d.classList.toggle('done', i<step); }

  const btn = document.getElementById('pa-next-btn');
  btn.style.display = 'block';
  if(step === PA_STEPS.length - 1){
    btn.textContent = '📸 Capture';
    btn.onclick = paCaptureAndAnalyze;
  } else {
    btn.textContent = 'Next →';
    btn.onclick = ()=>{
      _paScanStep++;
      const el = document.getElementById('pa-instruction-text');
      el.style.color = '#30e890'; el.textContent = '✓ Got it!';
      setTimeout(()=>{ el.style.color=''; paShowStep(_paScanStep); }, 600);
    };
  }
}

function paCaptureAndAnalyze(){
  if(!_paCameraReady) return;
  const video  = document.getElementById('pa-video');
  const canvas = document.getElementById('pa-capture-canvas');
  canvas.width = video.videoWidth||640; canvas.height = video.videoHeight||480;
  canvas.getContext('2d').drawImage(video, 0, 0);
  _paPhotoB64 = canvas.toDataURL('image/jpeg', 0.88);
  paStopCamera();
  document.getElementById('pa-scanner-wrap').classList.remove('scanning');
  document.getElementById('pa-scan-line').classList.remove('active');
  document.getElementById('pa-next-btn').style.display = 'none';
  document.getElementById('pa-instruction-text').style.color = '';
  document.getElementById('pa-instruction-text').textContent = '✦ Captured — sending to Aria';
  document.getElementById('pa-instruction-sub').textContent  = 'Analyzing your hair…';
  paAnalyze();
}



// ── PHOTO ANALYSIS ───────────────────────────────────────────────
async function paAnalyze(){
  if(!_paPhotoB64){ showToast('No photo yet'); return; }

  // Show loading, hide everything else
  document.querySelector('.pa-mode-tabs').style.display = 'none';
  document.getElementById('pa-camera-mode').style.display = 'none';
  document.getElementById('pa-upload-mode').style.display = 'none';
  document.getElementById('pa-scanning-status').style.display = 'block';
  document.getElementById('pa-result').style.display = 'none';

  const msgs = ['Aria is reading your hair…','Detecting porosity and texture…','Measuring damage patterns…','Analyzing scalp and roots…','Building your treatment plan…'];
  let mi = 0;
  const msgEl = document.getElementById('pa-scanning-msg');
  const msgTimer = setInterval(()=>{ mi=(mi+1)%msgs.length; msgEl.textContent=msgs[mi]; }, 1400);

  try{
    const r = await fetch('/api/photo-analysis',{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Auth-Token':token},
      body: JSON.stringify({image_b64: _paPhotoB64})
    });
    const d = await r.json();
    clearInterval(msgTimer);
    document.getElementById('pa-scanning-status').style.display = 'none';
    if(d.ok && d.analysis){
      paRenderResult(d.analysis);
      paLoadHistory();
    } else {
      showToast(d.error || 'Analysis failed — try again');
      paReset();
    }
  }catch(e){
    clearInterval(msgTimer);
    document.getElementById('pa-scanning-status').style.display = 'none';
    showToast('Network error — please try again');
    paReset();
  }
}

function paRenderResult(d){
  document.getElementById('pa-result').style.display = 'block';
  // Score — API field is overall_health_score
  const score = d.overall_health_score || d.score || 0;
  document.getElementById('pa-score-num').textContent = score;
  const arc = document.getElementById('pa-score-arc');
  if(arc){ setTimeout(()=>{ arc.style.strokeDashoffset = String(289 - 289*score/100); }, 100); }
  document.getElementById('pa-result-title').textContent = 'Hair Health Score';
  document.getElementById('pa-result-sub').textContent   = d.personalized_advice || d.summary || '';
  // Metrics — API fields: porosity, damage_level, density, texture
  const porEl = document.getElementById('pa-porosity');
  const dmgEl = document.getElementById('pa-damage');
  const denEl = document.getElementById('pa-density');
  const texEl = document.getElementById('pa-texture');
  if(porEl) porEl.textContent = d.porosity   || '—';
  if(dmgEl) dmgEl.textContent = d.damage_level|| d.damage || '—';
  if(denEl) denEl.textContent = d.density    || '—';
  if(texEl) texEl.textContent = d.texture    || '—';
  // Advice block
  const adv = document.getElementById('pa-advice');
  if(adv) adv.innerHTML = d.personalized_advice ? '<p style="font-size:13px;line-height:1.7;color:var(--muted2);">' + d.personalized_advice + '</p>' : '';
  // Observations
  const obs = document.getElementById('pa-obs');
  const obsData = d.observations || d.observation_list || [];
  if(obs) obs.innerHTML = obsData.length ? obsData.map(o=>'<div style="padding:6px 0;font-size:12px;color:var(--muted2);border-bottom:1px solid var(--border);">• '+o+'</div>').join('') : '<div style="color:var(--muted);font-size:12px;">No observations.</div>';
  // Recommendations
  const recs = document.getElementById('pa-recs');
  const recData = d.recommended_products || d.products || [];
  if(recs) recs.innerHTML = recData.length ? recData.map(p=>'<div style="padding:6px 0;font-size:12px;color:var(--rose);border-bottom:1px solid var(--border);">✦ '+p+'</div>').join('') : '';
}

async function paLoadHistory(){
  try{
    const r = await fetch('/api/photo-analysis/history',{headers:{'X-Auth-Token':token}});
    const d = await r.json();
    const el = document.getElementById('pa-history-list');
    if(!el) return;
    if(!d.history || !d.history.length){ el.innerHTML = '<div style="color:var(--muted);font-size:12px;">No past analyses yet.</div>'; return; }
    el.innerHTML = d.history.slice(0,5).map(h=>'<div class="pa-history-item" style="padding:10px 0;border-bottom:1px solid var(--border);font-size:12px;color:var(--muted);">'
      +'<span style="color:var(--text);font-weight:600;">Score '+h.score+'</span> &nbsp;'
      + new Date(h.created_at).toLocaleDateString()
      +'</div>').join('');
  }catch(e){ /* silent */ }
}

function paReset(){
  _paPhotoB64 = null;

  // Show tabs + camera mode, hide result/status
  document.querySelector('.pa-mode-tabs').style.display = 'flex';
  document.getElementById('pa-camera-mode').style.display = '';
  document.getElementById('pa-upload-mode').style.display = 'none';
  document.getElementById('pa-result').style.display = 'none';
  document.getElementById('pa-scanning-status').style.display = 'none';

  // Reset tab active state
  document.getElementById('pa-tab-camera').classList.add('active');
  document.getElementById('pa-tab-upload').classList.remove('active');

  // Reset scanner wrap
  const wrap = document.getElementById('pa-scanner-wrap');
  if(wrap){ wrap.style.display = 'none'; wrap.classList.remove('scanning'); }
  const scanLine = document.getElementById('pa-scan-line');
  if(scanLine) scanLine.classList.remove('active');
  const turnTrack = document.getElementById('pa-turn-track');
  if(turnTrack) turnTrack.style.display = 'none';

  // Reset dots
  for(let i=0;i<3;i++){ const d=document.getElementById('pa-dot-'+i); if(d) d.classList.remove('done'); }

  // Reset buttons
  const openBtn = document.getElementById('pa-open-camera-btn');
  if(openBtn){ openBtn.style.display='block'; openBtn.disabled=false; openBtn.textContent='📷 Open Camera'; }
  const startBtn = document.getElementById('pa-start-scan-btn');
  if(startBtn) startBtn.style.display='none';
  const nextBtn = document.getElementById('pa-next-btn');
  if(nextBtn) nextBtn.style.display='none';
  const noCamLink = document.getElementById('pa-no-cam-link');
  if(noCamLink) noCamLink.style.display='none';
  const noAccess = document.getElementById('pa-cam-no-access');
  if(noAccess) noAccess.style.display='none';

  // Reset instructions
  document.getElementById('pa-instruction-text').textContent = 'Position your hair in the oval guide';
  document.getElementById('pa-instruction-text').style.color = '';
  document.getElementById('pa-instruction-sub').textContent  = 'Good lighting works best · tap Start Scan when ready';

  // Reset upload
  const prev = document.getElementById('pa-upload-preview');
  if(prev) prev.style.display='none';
  const analyzeBtn = document.getElementById('pa-upload-analyze-btn');
  if(analyzeBtn) analyzeBtn.style.display='none';
  const fi = document.getElementById('pa-file-input');
  if(fi) fi.value='';

  // Stop camera if still running
  paStopCamera();

  // Scroll to top of photo page
  const pp = document.getElementById('pp-photo');
  if(pp) pp.scrollIntoView({behavior:'smooth', block:'start'});
}

// Legacy aliases
function onPhotoSelected(e){ paOnUpload(e); }
async function analyzePhoto(){ paAnalyze(); }
function renderPhotoResult(a){ paRenderResult(a); }
async function loadPhotoHistory(){ paLoadHistory(); }

function activateStat(el){
  document.querySelectorAll('.stat-card').forEach(c=>c.classList.remove('active'));
  el.classList.add('active');
}


// ── HAIR JOURNAL ─────────────────────────────────────────────────────────────
let _journalRating = 3;
let _journalPhotoB64 = null;

function openJournalPage(){
  document.getElementById('journal-gate').style.display='none';
  document.getElementById('journal-content').style.display='block';
  loadJournalEntries();
}

function openJournalEntry(){
  if(!_isPremium){ showUpgradeModal('Hair Journal'); return; }
  _journalRating=3; _journalPhotoB64=null;
  document.getElementById('jf-note').value='';
  document.getElementById('jf-photo-preview').style.display='none';
  document.getElementById('jf-saving').style.display='none';
  document.getElementById('journal-form-panel').style.display='block';
  renderJournalStars(3);
  document.getElementById('jf-note').focus();
}

function closeJournalEntry(){
  document.getElementById('journal-form-panel').style.display='none';
}

function setJournalRating(n){
  _journalRating=n;
  renderJournalStars(n);
}

function renderJournalStars(n){
  document.querySelectorAll('#jf-stars span').forEach((s,i)=>{
    s.classList.toggle('active', i<n);
  });
}

function onJournalPhoto(e){
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{
    _journalPhotoB64=ev.target.result;
    const img=document.getElementById('jf-photo-preview');
    img.src=_journalPhotoB64; img.style.display='block';
  };
  reader.readAsDataURL(file);
}

async function saveJournalEntry(){
  const note=document.getElementById('jf-note').value.trim();
  if(!note){ showToast('Write something about your hair first'); return; }
  document.getElementById('jf-saving').style.display='flex';
  document.querySelector('.save-btn').disabled=true;
  try{
    const body={note, hair_rating:_journalRating};
    if(_journalPhotoB64) body.image_b64=_journalPhotoB64;
    const r=await fetch('/api/journal',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify(body)});
    const d=await r.json();
    if(d.ok){
      closeJournalEntry();
      showToast('Entry saved ✓');
      if(d.aria_insight) showToast('✦ '+d.aria_insight, 4000);
      loadJournalEntries();
    } else { showToast(d.error||'Save failed'); }
  }catch(e){ showToast('Save error'); }
  document.getElementById('jf-saving').style.display='none';
  document.querySelector('.save-btn').disabled=false;
}

async function loadJournalEntries(){
  const container=document.getElementById('journal-entries');
  container.innerHTML='<div class="je-empty">Loading…</div>';
  try{
    const r=await fetch('/api/journal',{headers:{'X-Auth-Token':token}});
    const d=await r.json();
    if(!d.entries?.length){
      container.innerHTML='<div class="je-empty">No journal entries yet.<br>Tap <b>+ New Entry</b> to start logging your hair journey.</div>';
      return;
    }
    container.innerHTML=d.entries.map(e=>{
      const stars='★'.repeat(e.hair_rating||3)+'☆'.repeat(5-(e.hair_rating||3));
      const insight=e.aria_insight?'<div class="je-insight">'+e.aria_insight+'</div>':'';
      return '<div class="je-card" id="je-'+e.id+'">'
        +'<button class="je-del" onclick="deleteJournalEntry('+e.id+')" title="Delete">✕</button>'
        +'<div class="je-top">'
        +'<span class="je-date">'+e.ts.slice(0,10)+'</span>'
        +'<span class="je-stars">'+stars+'</span>'
        +'</div>'
        +'<div class="je-note">'+e.note+'</div>'
        +insight
        +'</div>';
    }).join('');
  }catch(e){ container.innerHTML='<div class="je-empty">Could not load entries.</div>'; }
}

async function deleteJournalEntry(id){
  await fetch('/api/journal?id='+id,{method:'DELETE',headers:{'X-Auth-Token':token}});
  const el=document.getElementById('je-'+id);
  if(el) el.remove();
}


// ── WHATSAPP PAGE ─────────────────────────────────────────────────────────────
function openWhatsappPage(){
  document.getElementById('whatsapp-gate').style.display='none';
  document.getElementById('whatsapp-content').style.display='block';
  const isPrem = _isPremium || localStorage.getItem('srd_premium')==='1';
  if(!isPrem){ document.getElementById('whatsapp-gate').style.display='block'; document.getElementById('whatsapp-content').style.display='none'; return; }
  checkPushStatus();
}

async function linkPhone(){
  const phone=document.getElementById('phone-link-input').value.trim();
  if(!phone){ document.getElementById('phone-link-msg').textContent='Enter your phone number'; return; }
  document.getElementById('link-phone-btn').disabled=true;
  try{
    const r=await fetch('/api/twilio/link-phone',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify({phone})});
    const d=await r.json();
    document.getElementById('phone-link-msg').textContent=d.ok?'✓ Phone linked! Text Aria anytime.':(d.error||'Failed to link');
    document.getElementById('phone-link-msg').style.color=d.ok?'var(--rose)':'#e07070';
  }catch(e){ document.getElementById('phone-link-msg').textContent='Error linking phone'; }
  document.getElementById('link-phone-btn').disabled=false;
}


// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
let _vapidKey = null;

function urlBase64ToUint8Array(base64String){
  const padding='='.repeat((4-base64String.length%4)%4);
  const base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData=window.atob(base64);
  return Uint8Array.from([...rawData].map(c=>c.charCodeAt(0)));
}

async function checkPushStatus(){
  if(!('serviceWorker' in navigator) || !('PushManager' in window)){
    document.getElementById('push-status').textContent='Push not supported on this browser.';
    document.getElementById('push-enable-btn').disabled=true;
    return;
  }
  const perm=Notification.permission;
  if(perm==='granted'){
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();
    if(sub){
      document.getElementById('push-enable-btn').textContent='✓ Reminders Active';
      document.getElementById('push-enable-btn').style.background='rgba(100,200,100,0.15)';
      document.getElementById('push-enable-btn').style.color='#7ecf7e';
      document.getElementById('push-enable-btn').onclick=disablePushNotifications;
      document.getElementById('push-status').textContent='You will get daily routine reminders at 8 AM.';
    }
  } else if(perm==='denied'){
    document.getElementById('push-status').textContent='Notifications blocked — enable in browser settings.';
    document.getElementById('push-enable-btn').disabled=true;
  }
}

async function enablePushNotifications(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)){
    showToast('Push not supported on this browser'); return;
  }
  try{
    // Get VAPID key
    if(!_vapidKey){
      const kr=await fetch('/api/push/vapid-public-key');
      const kd=await kr.json();
      _vapidKey=kd.key;
    }
    if(!_vapidKey){ showToast('Push not configured — contact support'); return; }

    const perm=await Notification.requestPermission();
    if(perm!=='granted'){ showToast('Permission denied'); return; }

    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.subscribe({
      userVisibleOnly:true,
      applicationServerKey:urlBase64ToUint8Array(_vapidKey)
    });
    const subJson=sub.toJSON();
    await fetch('/api/push/subscribe',{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Auth-Token':token},
      body:JSON.stringify({
        endpoint:subJson.endpoint,
        p256dh:subJson.keys.p256dh,
        auth:subJson.keys.auth
      })
    });
    showToast('🔔 Reminders enabled! Aria will notify you on wash days.');
    checkPushStatus();
  }catch(e){ showToast('Could not enable notifications: '+e.message); }
}

async function disablePushNotifications(){
  try{
    const reg=await navigator.serviceWorker.ready;
    const sub=await reg.pushManager.getSubscription();
    if(sub){
      await fetch('/api/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify({endpoint:sub.endpoint})});
      await sub.unsubscribe();
    }
    showToast('Reminders disabled');
    document.getElementById('push-enable-btn').textContent='🔔 Enable Reminders';
    document.getElementById('push-enable-btn').style.background='linear-gradient(135deg,#c1a3a2,#d4a85a)';
    document.getElementById('push-enable-btn').style.color='#000';
    document.getElementById('push-enable-btn').onclick=enablePushNotifications;
    document.getElementById('push-status').textContent='';
  }catch(e){ showToast('Error: '+e.message); }
}

// Register service worker + auto-check push on load
(async()=>{
  if('serviceWorker' in navigator){
    try{
      await navigator.serviceWorker.register('/sw.js',{scope:'/'});
    }catch(e){ console.warn('SW register failed',e); }
  }
})();

// ── ARIA SPHERE CHAT + VOICE ──
let sphereBusy=false;
let sphereRecording=false;
let sphereMediaRec=null;
let sphereChunks=[];
let sphereHandsFree=false;
const sphereLang=localStorage.getItem('aria_lang')||'en-US';

function toggleHandsFree(){
  sphereHandsFree=!sphereHandsFree;
  const btn=document.getElementById('sphere-handsfree-btn');
  if(sphereHandsFree){
    btn.textContent='🤲 On';
    btn.style.background='rgba(193,163,162,0.18)';
    btn.style.color='var(--brand-accent,#8B5E52)';
    btn.style.borderColor='rgba(193,163,162,0.6)';
    document.getElementById('sphere-hint').textContent='Hands-free active — Aria listens automatically';
    // Start listening immediately
    if(!sphereBusy&&!sphereRecording) sphereOrbTap();
  } else {
    btn.textContent='🤲 Off';
    btn.style.background='transparent';
    btn.style.color='rgba(13,9,6,0.45)';
    btn.style.borderColor='rgba(193,163,162,0.3)';
    document.getElementById('sphere-hint').textContent='Tap sphere to speak · or type below';
    // Stop recording if active
    if(sphereRecording&&sphereMediaRec) sphereMediaRec.stop();
  }
}

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
        if(!txt){
        sphereSetState('idle');sphereBusy=false;
        if(sphereHandsFree){ setTimeout(()=>{ if(sphereHandsFree&&!sphereBusy&&!sphereRecording) sphereOrbTap(); },800); }
        else { addSphereMsg('aria',"I couldn't catch that — try again?"); }
        return;
      }
        document.getElementById('sphere-input').value=txt;
        await sphereAskAria(txt);
      }catch(e){addSphereMsg('aria','⚠ Transcription error.');sphereSetState('idle');sphereBusy=false;}
    };
    sphereMediaRec.start();
    // Hands-free: auto-stop after 6s of recording so conversation keeps flowing
    if(sphereHandsFree){
      setTimeout(()=>{ if(sphereRecording&&sphereMediaRec&&sphereHandsFree){ sphereRecording=false; sphereBusy=true; sphereMediaRec.stop(); }},6000);
    }
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
    if(d.suggested_product){
      const pc=d.suggested_product;
      const wrap=document.getElementById('sphere-msgs');
      const cardDiv=document.createElement('div');
      cardDiv.className='smsg smsg-card';
      cardDiv.innerHTML=`<div class="srd-product-card" style="margin:6px 0 2px 0;max-width:100%;">
        <div class="srd-card-inner">
          <div class="srd-card-top">
            <span class="srd-card-emoji">${pc.emoji}</span>
            <div class="srd-card-info">
              <div class="srd-card-name">${pc.name}</div>
              <div class="srd-card-tagline">${pc.tagline}</div>
            </div>
            <div class="srd-card-price">${pc.price}</div>
          </div>
          <div class="srd-card-best">✦ Best for: ${pc.best_for}</div>
          <a class="srd-card-btn" href="${pc.order_url}" target="_blank">Order Now →</a>
        </div>
      </div>`;
      wrap.appendChild(cardDiv);
      wrap.scrollTop=wrap.scrollHeight;
    }
    await sphereSpeak(reply);
  }catch(e){typing.remove();addSphereMsg('aria','⚠ Connection error.');sphereSetState('idle');}
  // sphereBusy cleared inside sphereSpeak onend for hands-free timing
  if(!sphereHandsFree) sphereBusy=false;
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
      sphereBusy=false;
      resolve();
      // Hands-free: auto-restart listening after Aria finishes
      if(sphereHandsFree){
        setTimeout(()=>{ if(sphereHandsFree&&!sphereBusy&&!sphereRecording) sphereOrbTap(); },600);
      }
    };
    utt.onerror=()=>{
      clearInterval(pulseInterval);
      orb.style.transform='';
      sphereSetState('idle');
      sphereBusy=false;
      resolve();
      if(sphereHandsFree){
        setTimeout(()=>{ if(sphereHandsFree&&!sphereBusy&&!sphereRecording) sphereOrbTap(); },600);
      }
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

async function loadData(){
  try{
    const r=await fetch('/api/auth/me',{headers:{'X-Auth-Token':token}});
    if(r.status===401){window.location.href='/login';return;}
    const d=await r.json();
    document.getElementById('nav-name').textContent=d.name||d.email;
    const av=document.getElementById('nav-av');
    if(d.avatar){av.innerHTML='<img src="'+d.avatar+'" alt="">';}else{av.textContent=(d.name||'?')[0].toUpperCase();}
    if(d.subscribed){ document.getElementById('plan-badge').textContent='PREMIUM'; _isPremium=true; }
    // Admin / subscription status (for daily toast + premium bypass)
    let adminBypass = false;
    try{
      const r2 = await fetch('/api/subscription/status',{headers:{'X-Auth-Token':token}});
      if(r2.ok){
        const s = await r2.json();
        adminBypass = !!s.admin_bypass;
        if(adminBypass){
          _isPremium = true;
          const pb = document.getElementById('plan-badge');
          if(pb) pb.textContent = 'PREMIUM';
        }
      }
    }catch(e){}
    localStorage.setItem('srd_premium', (_isPremium||adminBypass) ? '1' : '0');
    maybeShowAdminToast(adminBypass);
    renderToolsPerks();
    // Style premium nav tabs
    if(_isPremium) document.querySelectorAll('.nav-tab').forEach(t=>{ if(t.textContent.startsWith('✦')) t.style.color='var(--gold)'; });
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

function renderToolsPerks(){
  const sb = document.getElementById('starter-bag-card');
  if(!sb) return;
  const btn = sb.querySelector('button');
  if(_isPremium){
    sb.style.opacity = '1';
    if(btn){
      btn.textContent = 'Open Starter Bag →';
      btn.onclick = () => window.open('https://supportrd.com/collections/all','_blank');
    }
  } else {
    sb.style.opacity = '0.7';
    if(btn){
      btn.textContent = 'Unlock Starter Bag →';
      btn.onclick = () => dashboardUpgrade();
    }
  }
}

function refreshAllData(){
  loadData();
  loadHistory();
  loadRealStats();
  if(_currentTab==='journey') openJourneyPage();
  if(_currentTab==='progress') openProgressPage();
  if(_currentTab==='photo') openPhotoPage();
  if(_currentTab==='journal') openJournalPage();
  if(_currentTab==='whatsapp') openWhatsappPage();
}

function adminToastDismiss(){
  const t = document.getElementById('admin-toast');
  if(t) t.style.display='none';
  const dayKey = new Date().toISOString().slice(0,10);
  localStorage.setItem('srd_admin_toast_'+dayKey,'1');
}

function adminToastRefresh(){
  refreshAllData();
  adminToastDismiss();
}

function maybeShowAdminToast(isAdmin){
  if(!isAdmin) return;
  const now = new Date();
  const dayKey = now.toISOString().slice(0,10);
  if(localStorage.getItem('srd_admin_toast_'+dayKey)) return;
  if(now.getHours() < 5) return;
  const t = document.getElementById('admin-toast');
  if(!t) return;
  const body = document.getElementById('admin-toast-body');
  if(body){
    body.textContent = 'Daily refresh ran at 5:00 AM ET. All page data re-synced.';
  }
  t.style.display='block';
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
  try{ await fetch('/api/auth/logout',{method:'POST',headers:{'X-Auth-Token':token}}); }catch(e){}
  localStorage.removeItem('srd_token');
  localStorage.removeItem('srd_user');
  localStorage.removeItem('srd_profile');
  window.location.href='/login';
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

// ═══════════════════════════════════════════════════════════════
// ✦ SWITCHPTAB — the universal page router (was missing, now fixed)
// ═══════════════════════════════════════════════════════════════
const _PAGE_MAP = {
  overview: {page:'pp-overview',   open: openOverviewPage},
  profile:  {page:'pp-profile-page',open: openProfilePage},
  journey:  {page:'pp-journey',    open: openJourneyPage},
  progress: {page:'pp-progress',   open: openProgressPage},
  photo:    {page:'pp-photo',      open: openPhotoPage},
  journal:  {page:'pp-journal',    open: openJournalPage},
  whatsapp: {page:'pp-whatsapp',   open: openWhatsappPage},
  settings: {page:'pp-settings',   open: openSettingsPage},
  history:  {page:'pp-overview',   open: ()=>{}},
  drive:    {page:'pp-drive',       open: openDrivePage},
};

let _currentTab = 'overview';

function switchPTab(name){
  _currentTab = name;
  if(name==='drive'){ document.body.classList.add('drive-mode'); }
  else { document.body.classList.remove('drive-mode'); _driveGpsMode=false; clStopSafetyRefresh(); }

  // Hide ALL ppages
  document.querySelectorAll('.ppage').forEach(p => p.classList.remove('active'));

  // Show the right one
  const cfg = _PAGE_MAP[name];
  const pageId = cfg ? cfg.page : ('pp-'+name);
  const el = document.getElementById(pageId);
  if(el){
    el.classList.add('active');
  } else {
    console.warn('switchPTab: no element for', name, '(looked for #'+pageId+')');
  }

  // Run the page-open callback
  if(cfg){ try{ cfg.open(); }catch(e){ console.warn('Page open error ('+name+'):', e); } }

  // Sync desktop nav tabs
  document.querySelectorAll('.nav-tab').forEach(t => {
    const label = t.textContent.replace(/✦|⚙/g,'').trim().toLowerCase();
    let match = false;
    if(name==='overview')  match = label==='overview';
    else if(name==='profile') match = label==='hair profile' || label==='profile';
    else if(name==='journey') match = label.includes('journey') || label.includes('aria');
    else if(name==='progress') match = label.includes('progress');
    else if(name==='photo')   match = label.includes('photo');
    else if(name==='journal') match = label.includes('journal');
    else if(name==='whatsapp') match = label.includes('sms') || label.includes('whatsapp');
    else if(name==='settings') match = label.includes('setting');
    else match = label.startsWith(name.slice(0,4));
    t.classList.toggle('active', match);
  });

  // Sync mobile bottom tabs
  ['overview','profile','journey','photo'].forEach(n => {
    const btn = document.getElementById('mobt-'+n);
    if(btn) btn.classList.toggle('active', n===name);
  });

  window.scrollTo({top:0, behavior:'smooth'});
}

// Stub openers for pages that already have their own openers defined below
function openOverviewPage(){ /* overview is default, no special load needed */ }
function openPhotoPage(){
  const gate = document.getElementById('photo-gate');
  const cont = document.getElementById('photo-content');
  if(!gate||!cont) return;
  const isPrem = _isPremium || localStorage.getItem('srd_premium')==='1';
  gate.style.display = isPrem ? 'none' : 'block';
  cont.style.display = isPrem ? 'block' : 'none';
}
function openJournalPage(){
  const gate = document.getElementById('journal-gate');
  const cont = document.getElementById('journal-content');
  if(!gate||!cont) return;
  const isPrem = _isPremium || localStorage.getItem('srd_premium')==='1';
  gate.style.display = isPrem ? 'none' : 'block';
  cont.style.display = isPrem ? 'block' : 'none';
}
function openSettingsPage(){/* settings loads itself */}


// ═══════════════════════════════════════════════════════════════
// ✦ OCCASIONS — full card flow (no typing, pure selectable)
// ═══════════════════════════════════════════════════════════════
const OCC_LIST = [
  // Professional
  {n:'Job Interview',       icon:'💼', cat:'Professional'},
  {n:'Business Meeting',    icon:'🤝', cat:'Professional'},
  {n:'Presentation',        icon:'📊', cat:'Professional'},
  {n:'Zoom / Video Call',   icon:'💻', cat:'Professional'},
  {n:'First Day at Work',   icon:'🏢', cat:'Professional'},
  // Social
  {n:'Date Night',          icon:'🌹', cat:'Social'},
  {n:'Girls Night Out',     icon:'💃', cat:'Social'},
  {n:'Night Out',           icon:'🎉', cat:'Social'},
  {n:'Birthday Party',      icon:'🎂', cat:'Social'},
  {n:'Girls Trip',          icon:'✈️', cat:'Social'},
  {n:'Family Reunion',      icon:'👨‍👩‍👧', cat:'Social'},
  // Formal
  {n:'Wedding',             icon:'💒', cat:'Formal'},
  {n:'Wedding Guest',       icon:'💐', cat:'Formal'},
  {n:'Prom',                icon:'👑', cat:'Formal'},
  {n:'Graduation',          icon:'🎓', cat:'Formal'},
  {n:'Quinceañera',         icon:'🩰', cat:'Formal'},
  {n:'Gala / Red Carpet',   icon:'🥂', cat:'Formal'},
  {n:'Church Service',      icon:'🙏', cat:'Formal'},
  // Outdoors
  {n:'Beach Day',           icon:'🏖️', cat:'Outdoors'},
  {n:'Pool Party',          icon:'🏊', cat:'Outdoors'},
  {n:'Festival',            icon:'🎪', cat:'Outdoors'},
  {n:'Camping',             icon:'⛺', cat:'Outdoors'},
  {n:'Hiking',              icon:'🥾', cat:'Outdoors'},
  {n:'Road Trip',           icon:'🚗', cat:'Outdoors'},
  {n:'Vacation',            icon:'🌴', cat:'Outdoors'},
  // Fitness
  {n:'Gym / Workout',       icon:'🏋️', cat:'Active'},
  {n:'Running',             icon:'🏃', cat:'Active'},
  {n:'Yoga / Pilates',      icon:'🧘', cat:'Active'},
  {n:'Sports Game',         icon:'⚽', cat:'Active'},
  {n:'Swimming',            icon:'🏊', cat:'Active'},
  // At Home
  {n:'Wash Day',            icon:'🚿', cat:'At Home'},
  {n:'Deep Condition Day',  icon:'🫙', cat:'At Home'},
  {n:'Scalp Massage Night', icon:'💆', cat:'At Home'},
  {n:'Overnight Mask',      icon:'🌙', cat:'At Home'},
  {n:'Lazy Sunday',         icon:'☕', cat:'At Home'},
  {n:'Protective Style Day',icon:'🪢', cat:'At Home'},
  // Content / Creative
  {n:'Photoshoot',          icon:'📸', cat:'Content'},
  {n:'Content Day',         icon:'🎬', cat:'Content'},
  {n:'Headshot Day',        icon:'🖼️', cat:'Content'},
  {n:'Stage / Performance', icon:'🎤', cat:'Content'},
  {n:'Concert',             icon:'🎵', cat:'Content'},
  // School
  {n:'School Photo Day',    icon:'📚', cat:'School'},
  {n:'First Day of School', icon:'🎒', cat:'School'},
  {n:'Graduation Party',    icon:'🎓', cat:'School'},
  // Seasonal
  {n:'Holiday Party',       icon:'🎄', cat:'Seasonal'},
  {n:"New Year's Eve",      icon:'🥳', cat:'Seasonal'},
  {n:'Valentine\'s Day',    icon:'💝', cat:'Seasonal'},
  {n:'Halloween',           icon:'🎃', cat:'Seasonal'},
];

let _occ = {occasion:null, product:null, action:null, actionDesc:null};

function occBuildGrid(){
  const grid = document.getElementById('occ-occasion-grid');
  if(!grid) return;
  // Group by category
  const cats = {};
  OCC_LIST.forEach(o=>{ cats[o.cat]=cats[o.cat]||[]; cats[o.cat].push(o); });
  let html = '';
  Object.entries(cats).forEach(([cat, items])=>{
    html += '<div style="width:100%;margin-top:8px;font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);font-family:\'IBM Plex Mono\',monospace;margin-bottom:4px;">'+cat+'</div>';
    items.forEach(o=>{
      html += '<div class="occ-card" onclick="occPickOccasion(\''+o.n.replace(/'/g,"\\'")+'\')" style="min-width:90px;padding:10px 10px;">'
        +'<div class="occ-card-icon">'+o.icon+'</div>'
        +'<div class="occ-card-title" style="font-size:10px;">'+o.n+'</div>'
        +'</div>';
    });
  });
  grid.innerHTML = html;
}

function occPickOccasion(name){
  _occ.occasion = name;
  // Highlight selected
  document.querySelectorAll('#occ-occasion-grid .occ-card').forEach(c=>{
    c.classList.toggle('selected', c.querySelector('.occ-card-title')&&c.querySelector('.occ-card-title').textContent===name);
  });
  occUpdateSummary();
  document.getElementById('occ-step2').style.display='block';
  document.getElementById('occ-step2').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function occPickProduct(name, icon, desc){
  _occ.product = name;
  document.querySelectorAll('#occ-product-grid .occ-card').forEach(c=>{
    c.classList.toggle('selected', c.querySelector('.occ-card-title')&&c.querySelector('.occ-card-title').textContent===name);
  });
  occUpdateSummary();
  document.getElementById('occ-step3').style.display='block';
  document.getElementById('occ-step3').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function occPickAction(name, icon, desc){
  _occ.action = name;
  _occ.actionDesc = desc;
  document.querySelectorAll('.occ-action-card').forEach(c=>{
    c.classList.toggle('selected', c.querySelector('.occ-card-title')&&c.querySelector('.occ-card-title').textContent===name);
  });
  occUpdateSummary();
  document.getElementById('occ-step4').style.display='block';
  document.getElementById('occ-step4').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function occUpdateSummary(){
  const wrap = document.getElementById('occ-summary');
  if(wrap) wrap.style.display = (_occ.occasion||_occ.product||_occ.action) ? 'block':'none';
  const s1 = document.getElementById('occ-sum-occasion');
  const s2 = document.getElementById('occ-sum-product');
  const s3 = document.getElementById('occ-sum-action');
  if(s1){ s1.style.display=_occ.occasion?'inline':'none'; s1.textContent='📍 '+(_occ.occasion||''); }
  if(s2){ s2.style.display=_occ.product?'inline':'none'; s2.textContent='💊 '+(_occ.product||''); }
  if(s3){ s3.style.display=_occ.action?'inline':'none'; s3.textContent='⚡ '+(_occ.action||''); }
}

function occAddToDay(day){
  if(!_occ.occasion||!_occ.product||!_occ.action){ showToast('Complete all 3 steps first'); return; }
  const week = JSON.parse(localStorage.getItem('srd_week')||'{}');
  if(!week[day]) week[day]=[];
  week[day].push({..._occ, saved: new Date().toLocaleDateString()});
  localStorage.setItem('srd_week', JSON.stringify(week));
  occSaveOccasion();
  showToast('✦ Added to '+day+'!');
  occReset();
  occRenderWeek();
}

function occSaveNoDay(){
  if(!_occ.occasion||!_occ.product||!_occ.action){ showToast('Complete all 3 steps first'); return; }
  occSaveOccasion();
  showToast('✦ Occasion saved!');
  occReset();
}

function occSaveOccasion(){
  const saved = JSON.parse(localStorage.getItem('srd_occasions2')||'[]');
  // Don't duplicate exact same combo
  const exists = saved.some(s=>s.occasion===_occ.occasion&&s.product===_occ.product&&s.action===_occ.action);
  if(!exists) saved.unshift({..._occ, saved: new Date().toLocaleDateString()});
  if(saved.length > 30) saved.pop();
  localStorage.setItem('srd_occasions2', JSON.stringify(saved));
  occLoadSaved();
}

function occReset(){
  _occ = {occasion:null,product:null,action:null,actionDesc:null};
  document.querySelectorAll('.occ-card').forEach(c=>c.classList.remove('selected'));
  ['occ-step2','occ-step3','occ-step4','occ-summary'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.style.display='none';
  });
}

function occToggleWeekly(){
  const panel = document.getElementById('occ-weekly-panel');
  const btn   = document.getElementById('occ-weekly-btn');
  if(!panel) return;
  const show = panel.style.display==='none';
  panel.style.display = show ? 'block' : 'none';
  btn.textContent = show ? '📅 Hide My Week' : '📅 View My Week';
  if(show) occRenderWeek();
}

function occRenderWeek(){
  const grid = document.getElementById('occ-week-grid');
  if(!grid) return;
  const week = JSON.parse(localStorage.getItem('srd_week')||'{}');
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  grid.innerHTML = DAYS.map(day=>{
    const items = week[day]||[];
    return '<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:10px 8px;min-height:80px;">'
      +'<div style="font-size:9px;font-weight:700;color:var(--rose);margin-bottom:6px;letter-spacing:0.06em;">'+day.slice(0,3).toUpperCase()+'</div>'
      +(items.length
        ? items.map(it=>'<div style="font-size:9px;color:var(--muted2);background:var(--bg3);border-radius:6px;padding:4px 6px;margin-bottom:4px;line-height:1.4;">'
          +'<div style="font-weight:700;color:var(--text);">'+it.occasion+'</div>'
          +'<div style="color:var(--gold);">'+it.product+'</div>'
          +'<div>'+it.action+'</div></div>').join('')
        : '<div style="font-size:9px;color:var(--border2);padding:4px 0;">—</div>')
      +'</div>';
  }).join('');
}

function occClearWeek(){
  if(!confirm('Clear all week entries?')) return;
  localStorage.removeItem('srd_week');
  occRenderWeek();
  showToast('Week cleared');
}

function occLoadSaved(){
  const el = document.getElementById('occ-saved-list');
  const hdr = document.getElementById('occ-saved-header');
  if(!el) return;
  const saved = JSON.parse(localStorage.getItem('srd_occasions2')||'[]');
  if(hdr) hdr.textContent = saved.length ? 'Saved Occasions ('+saved.length+')' : '';
  if(!saved.length){ el.innerHTML=''; return; }
  el.innerHTML = saved.map((o,i)=>
    '<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">'
    +'<div style="flex:1;">'
    +'<div style="font-weight:700;font-size:13px;color:var(--text);">'+o.occasion+'</div>'
    +'<div style="font-size:11px;color:var(--gold);margin-top:1px;">'+o.product+'</div>'
    +'<div style="font-size:11px;color:var(--blue);margin-top:1px;">'+o.action+'</div>'
    +'<div style="font-size:9px;color:var(--muted);margin-top:4px;">'+o.saved+'</div>'
    +'</div>'
    +'<button onclick="occDeleteSaved('+i+')" style="background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:4px;">✕</button>'
    +'</div>'
  ).join('');
}

function occDeleteSaved(i){
  const saved = JSON.parse(localStorage.getItem('srd_occasions2')||'[]');
  saved.splice(i,1);
  localStorage.setItem('srd_occasions2',JSON.stringify(saved));
  occLoadSaved();
}

function occInit(){
  occBuildGrid();
  occLoadSaved();
}


// ═══════════════════════════════════════════════════════════════
// ✦ ARIA JOURNEY PAGE
// ═══════════════════════════════════════════════════════════════
const DEPTH_LEVELS = [
  { n:'Discovery',                   color:'var(--rose)',  rgb:'240,160,144', icon:'🌱',
    msg:'Aria is just starting to mention your first products and why they matter. This is the spark.'},
  { n:'Use Cases & Upgrades',        color:'var(--gold)',  rgb:'224,176,80',  icon:'🔬',
    msg:'Aria is now in depth level 2 — she’s talking use cases, timing, and what you can change to level up.'},
  { n:'Inner Circle',                color:'var(--blue)',  rgb:'96,168,255',  icon:'💫',
    msg:'Aria knows what your girlfriend likes, what your friends and family notice, and how to share SupportRD with them.'},
  { n:'Professional — Making Money', color:'var(--green)', rgb:'48,232,144',  icon:'💎',
    msg:'You are at the final depth: Professional — making money. Aria is your partner for real‑world results.'},
];

// Keywords Aria uses at each depth that reveal which level the conversation has reached
const DEPTH_SIGNALS = [
  // Level 1 → 2: product HOW-TOs, timing, application technique, week-by-week results
  ['how to apply','apply it to','leave it on','rinse after','morning routine','evening routine',
   'how often','twice a week','every wash','week one','first week','second week','next week',
   'you should see','results in','noticeable','improvement','upgrade','switch to'],
  // Level 2 → 3: family, partner, friends, others asking, recommending, sharing
  ['your partner','your boyfriend','your girlfriend','your husband','your wife','your mom',
   'your sister','your brother','your friend','someone asked','people notice','they asked',
   'tell them about','recommend','share this','for her','for him','for them','family'],
  // Level 3 → 4: making money, selling, ambassador, income, professional, business
  ['making money','earn','income','sell','ambassador','referral','commission',
   'your business','your clients','salon','stylist','professional','they pay',
   'people buy','turned it into','monetize','brand','partner with'],
];

// Stored override (for backtrack)
let _ajForcedLevel = null;

async function openJourneyPage(){
  _ajForcedLevel = JSON.parse(localStorage.getItem('srd_aj_level')||'null');
  await renderJourneyPage();
}

async function renderJourneyPage(){
  // ── 1. Load full chat history ──────────────────────────────────────────────
  let sessions = [];
  try{
    const r = await fetch('/api/history',{headers:{'X-Auth-Token':token}});
    const d = await r.json();
    sessions = d.history || [];
  }catch(e){ console.warn('Journey load:', e); }

  // If no history yet, show a sample journey so the page feels alive
  if(!sessions.length){
    sessions = [
      {role:'user', content:'John: I want to upgrade to Premium and bring Support products into my life.', ts:'2025-03-12T14:00:00Z'},
      {role:'assistant', content:'Aria: Great decision. Let\'s start with Formula Exclusiva and Laciador. I\'ll guide you step by step.', ts:'2025-03-12T14:01:00Z'},
      {role:'assistant', content:'Aria: Here is how to apply it, and how often — you should see results in the first week.', ts:'2025-03-20T15:00:00Z'},
      {role:'assistant', content:'Aria: Your girlfriend will notice the softness. Tell her about Laciador and how it fits the routine.', ts:'2025-04-02T12:30:00Z'},
      {role:'assistant', content:'Aria: You can turn this into income — referrals and professional clients are the next level.', ts:'2025-04-20T09:10:00Z'}
    ];
  }

  // ── 2. Determine depth from Aria's actual RESPONSES (AI signals) ──────────
  // Read all of Aria's messages and check which signal tier she's reached
  const ariaText = sessions
    .filter(s=>s.role==='assistant')
    .map(s=>(s.content||'').toLowerCase())
    .join(' ');

  let detectedLevel = 0; // 0-indexed
  if(_ajForcedLevel !== null){
    detectedLevel = _ajForcedLevel; // user override via backtrack
  } else {
    // Check from highest to lowest — stay at the highest matched tier
    for(let i=DEPTH_SIGNALS.length-1;i>=0;i--){
      if(DEPTH_SIGNALS[i].some(kw => ariaText.includes(kw))){
        detectedLevel = i+1; // i+1 because signals[0] triggers level 1→2 etc
        break;
      }
    }
  }
  // Cap to valid range
  detectedLevel = Math.max(0, Math.min(3, detectedLevel));

  const depth = DEPTH_LEVELS[detectedLevel];

  // ── 3. Render all 4 orbs ──────────────────────────────────────────────────
  const SPINE_POSITIONS = [0, 33, 66, 100]; // % of spine filled
  const spineFill = document.getElementById('aj-spine-fill');

  for(let i=0;i<4;i++){
    const orb   = document.getElementById('aj-orb-'+(i+1));
    const tbody = document.getElementById('aj-tbody-'+(i+1));
    const verd  = document.getElementById('aj-v'+(i+1));
    const bt    = document.getElementById('aj-bt'+(i+1));
    if(!orb||!tbody) continue;

    // Remove all state classes
    orb.classList.remove('active','current','locked');
    tbody.classList.remove('active','current','locked');
    // Set CSS var for this orb's color (for active/current CSS)
    tbody.style.setProperty('--orb-rgb', DEPTH_LEVELS[i].rgb);

    if(i < detectedLevel){
      // Passed level — fully lit
      orb.classList.add('active');
      tbody.classList.add('active');
      if(verd) verd.textContent = '✓ Aria and you have been here.';
      if(bt){ bt.style.display='block'; }
    } else if(i === detectedLevel){
      // CURRENT — brightest glow
      orb.classList.add('active','current');
      tbody.classList.add('active','current');
      if(verd) verd.textContent = '▶ This is where you and Aria are right now.';
      if(bt){ bt.style.display = i > 0 ? 'block' : 'none'; } // no backtrack on level 1
    } else {
      // Not yet reached
      orb.classList.add('locked');
      tbody.classList.add('locked');
      if(verd) verd.textContent = '';
      if(bt){ bt.style.display='none'; }
    }
  }

  // Animate spine fill height
  const spineEl = document.getElementById('aj-spine');
  if(spineEl && spineFill){
    // Calculate total spine height after render
    requestAnimationFrame(()=>{
      const totalH = document.getElementById('aj-milestones').offsetHeight - 80;
      if(spineEl) spineEl.style.height = totalH+'px';
      const fillPct = detectedLevel === 0 ? 0 : (detectedLevel / 3);
      if(spineFill) spineFill.style.height = Math.round(totalH * fillPct)+'px';
    });
  }

  // ── 4. Level 4 CTA ────────────────────────────────────────────────────────
  const cta = document.getElementById('aj-level4-cta');
  if(cta) cta.style.display = detectedLevel === 3 ? 'block' : 'none';

  // ── 5. Current depth summary card ─────────────────────────────────────────
  const dtitle = document.getElementById('aj-depth-title');
  const dmsg   = document.getElementById('aj-depth-msg');
  const dnext  = document.getElementById('aj-next-label');
  const dbadge = document.getElementById('aj-depth-badge');

  if(dtitle) dtitle.textContent = 'Level '+(detectedLevel+1)+' — '+depth.n;
  if(dmsg)   dmsg.textContent   = depth.msg;

  if(dnext){
    if(detectedLevel < 3){
      const next = DEPTH_LEVELS[detectedLevel+1];
      dnext.innerHTML = '✦ <strong>Next level — '+next.n+':</strong> Keep talking with Aria. As your conversations go deeper, she\'ll naturally move into the next chapter with you.';
    } else {
      dnext.innerHTML = '✦ You\'ve reached the final level. <strong style="color:var(--green);">Contact SupportRD directly</strong> — you\'ve earned a personal conversation.';
    }
  }

  if(dbadge){
    dbadge.innerHTML = '<div style="display:flex;align-items:center;gap:6px;padding:5px 12px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:0.08em;background:rgba('+depth.rgb+',0.12);border:1px solid rgba('+depth.rgb+',0.35);color:'+depth.color+';">'+depth.icon+' Level '+(detectedLevel+1)+' of 4</div>';
  }

  // ── 6. Session timeline ───────────────────────────────────────────────────
  ajRenderTimeline(sessions, detectedLevel);
}

function ajForceLevel(levelIdx){
  // User says "I'm not there yet" — backtrack
  _ajForcedLevel = Math.max(0, levelIdx);
  localStorage.setItem('srd_aj_level', JSON.stringify(_ajForcedLevel));
  showToast('Level adjusted — refreshing your journey');
  renderJourneyPage();
}

function ajRenderTimeline(sessions, depthIdx){
  const tl    = document.getElementById('aj-timeline');
  const empty = document.getElementById('aj-empty');
  const cnt   = document.getElementById('aj-session-count');
  if(!tl) return;
  const byDate = {};
  sessions.forEach(msg=>{
    const d = (msg.ts||'').slice(0,10)||'Unknown';
    if(!byDate[d]) byDate[d]=[];
    byDate[d].push(msg);
  });
  const dates = Object.keys(byDate).sort().reverse();
  if(cnt) cnt.textContent = dates.length+' sessions';
  if(!dates.length){ if(empty) empty.style.display='block'; tl.innerHTML=''; return; }
  if(empty) empty.style.display='none';
  const DL=[{n:'Discovery',rgb:'240,160,144'},{n:'Use Cases & Upgrades',rgb:'224,176,80'},{n:'Inner Circle',rgb:'96,168,255'},{n:'Professional',rgb:'48,232,144'}];
  const DS=[['how to apply','leave it on','morning routine','results in','upgrade'],['your partner','your mom','your friend','someone asked','recommend'],['making money','earn','income','ambassador','referral','professional']];
  tl.innerHTML=dates.map((date,di)=>{
    const msgs=byDate[date];
    const aMsgs=msgs.filter(m=>m.role==='assistant');
    const totalMsgs = msgs.length;
    const ariaUp=sessions.filter(s=>s.role==='assistant'&&(s.ts||'').slice(0,10)<=date).map(s=>(s.content||'').toLowerCase()).join(' ');
    let sd=0;
    for(let i=DS.length-1;i>=0;i--){ if(DS[i].some(kw=>ariaUp.includes(kw))){ sd=i+1; break; } }
    const d=DL[sd];
    const txt=msgs.map(m=>m.content||'').join(' ').toLowerCase();
    const tags=[];
    if(txt.includes('formula')) tags.push('Formula Exclusiva');
    if(txt.includes('laciador')) tags.push('Laciador Crece');
    if(txt.includes('gotero')) tags.push('Gotero Rapido');
    if(txt.includes('damage')) tags.push('Hair Damage');
    if(txt.includes('grow')) tags.push('Growth');
    if(txt.includes('scalp')) tags.push('Scalp');
    if(txt.includes('premium')||txt.includes('upgrade')) tags.push('Upgrade');
    if(!tags.length) tags.push('Hair Consultation');
    const sum=aMsgs.length?(aMsgs[0].content||'').slice(0,120)+'...':'Aria guided your hair journey.';
    const isFirst=di===dates.length-1;
    let fd; try{ fd=new Date(date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }catch(e){ fd=date; }
    return '<div class="aj-session"><div class="aj-session-dot" style="border-color:rgba('+d.rgb+',0.8);background:rgba('+d.rgb+',0.15);"></div>'
      +'<div class="aj-session-date">'+(isFirst?'✦ First Session — ':'')+fd+'</div>'
      +'<div class="aj-session-head">Aria &amp; you &mdash; '+totalMsgs+' messages <span style="font-size:9px;color:rgba('+d.rgb+',1);"> '+d.n+'</span></div>'
      +'<div class="aj-session-body">'+sum+'</div>'
      +'<div class="aj-session-tags">'+tags.map(t=>'<span class="aj-session-tag">'+t+'</span>').join('')+'</div></div>';
  }).join('');
}


// ═══════════════════════════════════════════════════════════════
// ✦ HANDS-FREE DRIVE MODE + CANDY LAND GPS
// ═══════════════════════════════════════════════════════════════

// ── Drive chat state ────────────────────────────────────────────
let _driveBusy   = false;
let _driveRecog  = null;
let _driveMsgHistory = [];
let _driveGpsMode = false;

function openDrivePage(){
  // make sure we're in chat mode by default
  if(!_driveGpsMode) _showDriveChatMode();
}

function driveToggleMode(){
  _driveGpsMode = !_driveGpsMode;
  const btn = document.getElementById('drive-mode-toggle');
  if(_driveGpsMode){
    _showDriveGpsMode();
    if(btn){ btn.textContent='💬 Chat Mode'; btn.style.background='linear-gradient(135deg,#667eea,#764ba2)'; }
  } else {
    _showDriveChatMode();
    if(btn){ btn.textContent='🍬 Adventure GPS'; btn.style.background='linear-gradient(135deg,#ff6eb4,#ff9f43)'; }
  }
}

function _showDriveChatMode(){
  document.getElementById('drive-chat-mode').style.display='flex';
  const gps = document.getElementById('drive-gps-mode');
  gps.style.display='none';
  clStopSafetyRefresh();
}

function _showDriveGpsMode(){
  document.getElementById('drive-chat-mode').style.display='none';
  const gps = document.getElementById('drive-gps-mode');
  gps.style.display='flex';
  gps.style.flexDirection='column';
  gps.style.flex='1';
  gps.style.overflow='hidden';
  // Init map if first time
  if(!_clMapReady) clInitMap();
}

// ── Chat functions ───────────────────────────────────────────────
async function driveSend(){
  const inp = document.getElementById('drive-text-input');
  const msg = (inp?.value||'').trim();
  if(!msg||_driveBusy) return;
  inp.value='';
  await driveAsk(msg);
}

async function driveMicTap(){
  const btn    = document.getElementById('drive-mic-btn');
  const status = document.getElementById('drive-mic-status');
  if(_driveRecog){ _driveRecog.stop(); _driveRecog=null; btn.classList.remove('listening'); status.textContent='Tap mic to speak hands-free'; return; }
  const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ showToast('Speech not supported in this browser'); return; }
  _driveRecog = new SR();
  _driveRecog.lang='en-US'; _driveRecog.interimResults=false; _driveRecog.maxAlternatives=1;
  btn.classList.add('listening');
  status.textContent='🎤 Listening…';
  _driveRecog.onresult = e => {
    const txt = e.results[0][0].transcript;
    document.getElementById('drive-text-input').value = txt;
    driveAsk(txt);
  };
  _driveRecog.onerror = () => { btn.classList.remove('listening'); status.textContent='Mic error — try again'; _driveRecog=null; };
  _driveRecog.onend   = () => { btn.classList.remove('listening'); status.textContent='Tap mic to speak'; _driveRecog=null; };
  _driveRecog.start();
}

async function driveAsk(msg){
  if(_driveBusy) return;
  _driveBusy = true;
  const status = document.getElementById('drive-aria-status');
  driveAddMsg(msg,'user');
  _driveMsgHistory.push({role:'user',content:msg});
  if(status) status.textContent='Aria is thinking…';
  try{
    const r = await fetch('/api/aria-drive',{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Auth-Token':token},
      body: JSON.stringify({
        max_tokens:400,
        system:'You are Aria, warm AI assistant for Support. The user is driving. Keep ALL responses SHORT — 1 to 3 sentences max. Be upbeat, clear, direct. Sound natural when spoken aloud.',
        messages:_driveMsgHistory
      })
    });
    const d = await r.json();
    const reply = d.text || 'Sorry, try again.';
    _driveMsgHistory.push({role:'assistant',content:reply});
    driveAddMsg(reply,'aria');
    if(status) status.textContent='Ready.';
    driveSpeak(reply);
  }catch(e){
    driveAddMsg('Connection issue. Try again.','aria');
    if(status) status.textContent='Error — try again';
  }
  _driveBusy=false;
}

function driveAddMsg(text,role){
  const msgs = document.getElementById('drive-msgs');
  if(!msgs) return;
  const div = document.createElement('div');
  div.className='drive-msg drive-msg-'+role;
  div.innerHTML='<div class="drive-msg-bubble">'+text+'</div>';
  msgs.appendChild(div);
  msgs.scrollTop=msgs.scrollHeight;
}

function driveSpeak(text){
  if(!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate=0.95; u.pitch=1.05; u.volume=1;
  window.speechSynthesis.speak(u);
}

// ═══════════════════════════════════════════════════════════════
// ✦ CANDY LAND GPS
// ═══════════════════════════════════════════════════════════════

let _clMapReady   = false;
let _clUserLat    = null;
let _clUserLng    = null;
let _clDestLat    = null;
let _clDestLng    = null;
let _clDestName   = '';
let _clDestType   = '';
let _clPlaces     = [];
let _clLandmarks  = [];
let _clWatchId    = null;
let _clAnimFrame  = null;
let _clTiles      = [];   // candy path tiles
let _clCurrentNarration = '';

// Candy tile colors — warm candy palette
const CL_TILE_COLORS = [
  '#ff6eb4','#ff9f43','#ffd32a','#0be881',
  '#64c8ff','#c56cf0','#ff5e57','#05c46b',
  '#ffdd59','#ff4d4b','#17c0eb','#ef5777'
];

// Place search queries by type
const CL_SEARCH_TYPES = {
  coding: ['Best Buy','Micro Center','Apple Store','computer store','electronics store','coding bootcamp','tech store'],
  hair:   ['Sally Beauty','hair salon','beauty supply','hair care store','natural hair salon','Dominican hair salon'],
  park:   ['park','botanical garden','nature trail','playground','recreation area'],
  all:    ['Best Buy','hair salon','Sally Beauty','park','beauty supply','electronics store','Apple Store']
};

// Landmark emoji by category
const CL_LANDMARK_EMOJI = {
  coding: '💻', hair: '💆', park: '🌳',
  restaurant:'🍕', coffee:'☕', school:'🏫',
  library:'📚', hospital:'🏥', gas:'⛽',
  shopping:'🛍', church:'⛪', museum:'🏛'
};

async function clInitMap(){
  _clMapReady = true;
  const canvas = document.getElementById('cl-canvas');
  if(!canvas) return;

  // Fit canvas to container
  const wrap = document.getElementById('cl-map-wrap');
  const resize = ()=>{
    canvas.width  = wrap.offsetWidth  * window.devicePixelRatio;
    canvas.height = wrap.offsetHeight * window.devicePixelRatio;
    canvas.style.width  = wrap.offsetWidth+'px';
    canvas.style.height = wrap.offsetHeight+'px';
    clDrawMap();
  };
  window.addEventListener('resize', resize);
  resize();

  // Start watching user position
  clStartGPS();
  clSetNarration('Welcome to Adventure GPS! 🍬 I\'m Aria, your co-pilot. Pick a destination and let\'s go!');
}

let _clBurstInterval = null;
let _clBurstTimeout  = null;

function clShowGpsBanner(){
  const b = document.getElementById('cl-gps-banner');
  if(!b) return;
  b.style.display='flex';
  b.classList.remove('small');
  setTimeout(()=>{ b.classList.add('small'); },6000);
}

function clHideGpsBanner(){
  const b = document.getElementById('cl-gps-banner');
  if(!b) return;
  b.style.display='none';
  b.classList.remove('small');
}

function clStartWatch(maxAge){
  if(_clWatchId) navigator.geolocation.clearWatch(_clWatchId);
  _clWatchId = navigator.geolocation.watchPosition(
    pos=>{ _clUserLat=pos.coords.latitude; _clUserLng=pos.coords.longitude; clUpdatePlayerPos(); clCheckProximity(); clUpdateDirections(); },
    err=>{},
    {enableHighAccuracy:true, maximumAge:maxAge, timeout:10000}
  );
}

function clStartSafetyRefresh(){
  if(!navigator.geolocation){ clSetNarration('GPS not available on this device.'); return; }
  clShowGpsBanner();
  // Clear any existing watches / bursts
  if(_clWatchId) navigator.geolocation.clearWatch(_clWatchId);
  if(_clBurstInterval) clearInterval(_clBurstInterval);
  if(_clBurstTimeout) clearTimeout(_clBurstTimeout);

  // Phase 1: Burst mode — 30s of forced fresh fixes
  let bursts = 0;
  const doFix = () => navigator.geolocation.getCurrentPosition(
    pos=>{ _clUserLat=pos.coords.latitude; _clUserLng=pos.coords.longitude; clUpdatePlayerPos(); clDrawMap(); },
    err=>{ clSetNarration('Location access needed for the GPS! Please allow it.'); },
    {enableHighAccuracy:true, maximumAge:0, timeout:10000}
  );
  doFix();
  _clBurstInterval = setInterval(()=>{ bursts++; doFix(); if(bursts>=9){ clearInterval(_clBurstInterval); _clBurstInterval=null; } },3000);

  // Phase 2: Normal refresh — still maxAge:0 for fresh fixes
  _clBurstTimeout = setTimeout(()=>{ clStartWatch(0); },30000);
}

function clStopSafetyRefresh(){
  if(_clBurstInterval) clearInterval(_clBurstInterval);
  if(_clBurstTimeout) clearTimeout(_clBurstTimeout);
  _clBurstInterval = null; _clBurstTimeout = null;
  clHideGpsBanner();
  if(_clWatchId) navigator.geolocation.clearWatch(_clWatchId);
  // After leaving GPS mode, use a more battery-friendly watch
  if(navigator.geolocation){
    _clWatchId = navigator.geolocation.watchPosition(
      pos=>{ _clUserLat=pos.coords.latitude; _clUserLng=pos.coords.longitude; clUpdatePlayerPos(); },
      err=>{},
      {enableHighAccuracy:true, maximumAge:2000, timeout:10000}
    );
  }
}

function clStartGPS(){
  if(!navigator.geolocation){ clSetNarration('GPS not available on this device.'); return; }
  clStartSafetyRefresh();
}

// ── Candy Land map drawing ───────────────────────────────────────
function clDrawMap(){
  const canvas = document.getElementById('cl-canvas');
  if(!canvas) return;
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const dpr = window.devicePixelRatio||1;
  ctx.clearRect(0,0,W,H);

  // Background gradient — night sky
  const bg = ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#1a0a2e'); bg.addColorStop(1,'#0d1b2a');
  ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

  // Draw stars
  if(!_clStars){ _clStars=[]; for(let i=0;i<80;i++) _clStars.push({x:Math.random(),y:Math.random(),r:Math.random()*1.2+0.3,a:Math.random()}); }
  _clStars.forEach(s=>{ ctx.beginPath(); ctx.arc(s.x*W,s.y*H,s.r*dpr,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${s.a})`; ctx.fill(); });

  // Draw candy path tiles
  clDrawPath(ctx,W,H,dpr);

  // Draw destination zone if set
  if(_clDestLat!==null && _clUserLat!==null){
    const dp = clLatLngToCanvas(_clDestLat,_clDestLng,W,H);
    // Glow ring around destination
    const grd = ctx.createRadialGradient(dp.x,dp.y,0,dp.x,dp.y,40*dpr);
    grd.addColorStop(0,'rgba(255,110,180,0.3)'); grd.addColorStop(1,'rgba(255,110,180,0)');
    ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(dp.x,dp.y,40*dpr,0,Math.PI*2); ctx.fill();
  }
}

let _clStars = null;
let _clPathAnim = 0;

function clDrawPath(ctx,W,H,dpr){
  if(!_clUserLat) return;

  // Generate a winding candy path from user position toward destination (or just ahead)
  const center = {x:W/2, y:H*0.55};
  const tileSize = 22*dpr;
  const spacing  = 28*dpr;

  // Path: spiral outward in a playful S-curve
  const pts = [];
  for(let i=0;i<28;i++){
    const t = i/27;
    const wave = Math.sin(t*Math.PI*3)*0.18;
    pts.push({
      x: center.x + (wave + t*0.5 - 0.25)*W,
      y: center.y - (t*0.7)*H*0.6 + Math.cos(t*Math.PI*2)*30*dpr
    });
  }

  // Draw connecting dotted line
  ctx.beginPath(); ctx.setLineDash([6*dpr,6*dpr]);
  ctx.strokeStyle='rgba(255,255,255,0.15)'; ctx.lineWidth=2*dpr;
  pts.forEach((p,i)=>{ if(i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
  ctx.stroke(); ctx.setLineDash([]);

  // Draw candy tiles
  _clPathAnim = (_clPathAnim+0.5)%360;
  pts.forEach((p,i)=>{
    const col = CL_TILE_COLORS[i % CL_TILE_COLORS.length];
    const pulse = 1 + Math.sin((_clPathAnim+i*15)*Math.PI/180)*0.12;
    const r = (tileSize/2)*pulse;
    // Tile circle
    ctx.beginPath(); ctx.arc(p.x,p.y,r,0,Math.PI*2);
    ctx.fillStyle = col+'cc'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth=1.5*dpr; ctx.stroke();
    // Shine dot
    ctx.beginPath(); ctx.arc(p.x-r*0.3,p.y-r*0.3,r*0.22,0,Math.PI*2);
    ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fill();
  });

  // Store tiles for player positioning
  _clTiles = pts;
}

// ── Map coordinate math ─────────────────────────────────────────
function clLatLngToCanvas(lat,lng,W,H){
  if(!_clUserLat) return {x:W/2,y:H/2};
  const scale = 180000; // pixels per degree at canvas size
  const dx = (lng - _clUserLng) * scale * (W/600);
  const dy = (lat - _clUserLat) * scale * (H/600) * -1;
  return { x: W/2 + dx, y: H*0.55 + dy };
}

function clUpdatePlayerPos(){
  const player = document.getElementById('cl-player');
  const canvas = document.getElementById('cl-canvas');
  if(!player||!canvas) return;
  // Player always at center-ish
  const wrap = document.getElementById('cl-map-wrap');
  player.style.left = (wrap.offsetWidth/2)+'px';
  player.style.top  = (wrap.offsetHeight*0.55)+'px';
}

// ── Place search ────────────────────────────────────────────────
async function clStartSearch(type){
  _clDestType = type;
  const bar = document.getElementById('cl-dest-bar');

  if(!_clUserLat){
    clSetNarration('I need your location first! Please allow GPS access.');
    return;
  }

  clSetNarration('Searching nearby… hang on! 🔍');

  // Use browser Geolocation + Overpass API (OSM) for real POI data
  const results = await clFetchPlaces(type, _clUserLat, _clUserLng);
  _clPlaces = results;

  if(!results.length){
    clSetNarration('Hmm, I didn\'t find any '+type+' places nearby. Try a different type!');
    return;
  }

  // Show results list
  clShowResults(results, type);
  clDrawLandmarkBubbles(results);
  clSetNarration('Found '+results.length+' places nearby! Tap one to set it as your destination. 🎯');
}

async function clFetchPlaces(type, lat, lng){
  // Build Overpass API query
  const radius = 8000; // 8km radius
  let osmTags = '';
  if(type==='coding'||type==='all'){
    osmTags += `node["shop"="electronics"](around:${radius},${lat},${lng});
node["shop"="computer"](around:${radius},${lat},${lng});
node["amenity"="internet_cafe"](around:${radius},${lat},${lng});`;
  }
  if(type==='hair'||type==='all'){
    osmTags += `node["shop"="hairdresser"](around:${radius},${lat},${lng});
node["shop"="beauty"](around:${radius},${lat},${lng});
node["shop"="cosmetics"](around:${radius},${lat},${lng});`;
  }
  if(type==='park'||type==='all'){
    osmTags += `node["leisure"="park"](around:${radius},${lat},${lng});
way["leisure"="park"](around:${radius},${lat},${lng});`;
  }

  // Always include landmarks for map flavor
  const landmarkQ = `
node["historic"](around:${radius},${lat},${lng});
node["tourism"="attraction"](around:${radius},${lat},${lng});
node["amenity"="restaurant"](around:2000,${lat},${lng});
node["amenity"="cafe"](around:2000,${lat},${lng});`;

  const query = `[out:json][timeout:10];(${osmTags}${landmarkQ});out body 40;`;

  try{
    const r = await fetch('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query));
    const d = await r.json();
    return clParseOverpass(d.elements||[], lat, lng, type);
  }catch(e){
    console.warn('Overpass error', e);
    return clFallbackPlaces(type, lat, lng);
  }
}

function clParseOverpass(elements, userLat, userLng, searchType){
  const places = [];
  elements.forEach(el=>{
    const tags = el.tags||{};
    const name = tags.name||tags['name:en']||'Unnamed Place';
    const elLat = el.lat || (el.center&&el.center.lat) || null;
    const elLng = el.lon || (el.center&&el.center.lon) || null;
    if(!elLat||!elLng) return;
    const dist = clHaversine(userLat,userLng,elLat,elLng);

    let ptype = 'park';
    if(tags.shop==='electronics'||tags.shop==='computer'||tags.amenity==='internet_cafe') ptype='coding';
    else if(tags.shop==='hairdresser'||tags.shop==='beauty'||tags.shop==='cosmetics') ptype='hair';
    else if(tags.leisure==='park') ptype='park';
    else if(tags.amenity==='restaurant') ptype='restaurant';
    else if(tags.amenity==='cafe') ptype='coffee';
    else if(tags.tourism||tags.historic) ptype='landmark';

    // Filter to requested type
    if(searchType!=='all' && ptype!==searchType && ptype!=='restaurant'&&ptype!=='coffee'&&ptype!=='landmark') return;

    places.push({name, lat:elLat, lng:elLng, type:ptype,
      addr: tags['addr:street']?`${tags['addr:housenumber']||''} ${tags['addr:street']}`.trim():'',
      dist });
  });

  // Sort by distance
  places.sort((a,b)=>a.dist-b.dist);

  // Separate destinations vs landmarks
  _clLandmarks = places.filter(p=>p.type==='restaurant'||p.type==='coffee'||p.type==='landmark').slice(0,12);
  return places.filter(p=>p.type!=='restaurant'&&p.type!=='coffee'&&p.type!=='landmark').slice(0,15);
}

function clFallbackPlaces(type, lat, lng){
  // Graceful fallback if Overpass fails
  return [{
    name: 'No places found nearby',
    lat, lng, type: type==='all'?'park':type,
    addr:'Try zooming out or different category', dist:0
  }];
}

function clHaversine(lat1,lon1,lat2,lon2){
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function clDistLabel(km){
  if(km<1) return Math.round(km*1000)+'m away';
  return km.toFixed(1)+'km away';
}

// ── Results panel ────────────────────────────────────────────────
function clShowResults(places, type){
  const panel = document.getElementById('cl-results');
  const list  = document.getElementById('cl-results-list');
  const title = document.getElementById('cl-results-title');
  if(!panel||!list) return;
  const labels={coding:'💻 Coding & Tech Stores',hair:'💆 Hair & Beauty Shops',park:'🌳 Parks & Nature',all:'🗺 All Nearby'};
  title.textContent = labels[type]||'Nearby';
  list.innerHTML = places.map((p,i)=>`
    <div class="cl-result-card" onclick="clSelectDest(${i})">
      <div class="cl-result-name">${clEmoji(p.type)} ${p.name}</div>
      ${p.addr?`<div class="cl-result-addr">${p.addr}</div>`:''}
      <div class="cl-result-meta">
        <span class="cl-result-badge ${p.type==='coding'?'coding':p.type==='hair'?'hair':'park'}">${p.type.toUpperCase()}</span>
        <span class="cl-result-dist">${clDistLabel(p.dist)}</span>
      </div>
    </div>`).join('');
  panel.style.display='block';
}

function clCloseResults(){
  const p=document.getElementById('cl-results');
  if(p) p.style.display='none';
}

function clEmoji(type){
  return CL_LANDMARK_EMOJI[type]||'📍';
}

// ── Select destination ──────────────────────────────────────────
async function clSelectDest(idx){
  const place = _clPlaces[idx];
  if(!place) return;
  _clDestLat  = place.lat;
  _clDestLng  = place.lng;
  _clDestName = place.name;
  clCloseResults();

  // Update nav card
  const navDest = document.getElementById('cl-nav-dest');
  const navDist = document.getElementById('cl-nav-dist');
  if(navDest) navDest.textContent = clEmoji(place.type)+' '+place.name;
  if(navDist) navDist.textContent = clDistLabel(place.dist);

  // Position destination marker
  const wrap   = document.getElementById('cl-map-wrap');
  const marker = document.getElementById('cl-dest-marker');
  if(marker&&wrap){
    const dp = clLatLngToCanvas(_clDestLat,_clDestLng,wrap.offsetWidth*window.devicePixelRatio,wrap.offsetHeight*window.devicePixelRatio);
    marker.style.left = (dp.x/window.devicePixelRatio)+'px';
    marker.style.top  = (dp.y/window.devicePixelRatio)+'px';
    marker.style.display='block';
  }

  // Update landmarks strip
  clUpdateLandmarkStrip();
  clUpdateDirections();
  clDrawMap();

  // Aria narration via AI
  await clAriaNavigate(place);
}

async function clAriaNavigate(place){
  const dist = clDistLabel(place.dist);
  const prompt = `You are Aria, a warm upbeat GPS companion with a Candy Land adventure personality. The user just selected "${place.name}" (${place.type}, ${dist}) as their destination. Give a SHORT 2-sentence navigation intro: one fun encouraging line about the journey, and one practical note about the destination type. Keep it under 40 words. Sound natural when spoken.`;
  try{
    const r = await fetch('/api/aria-drive',{
      method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},
      body:JSON.stringify({max_tokens:120,messages:[{role:'user',content:prompt}]})
    });
    const d = await r.json();
    const text = d.text||`Adventure to ${place.name} begins! ${dist} — let's go! 🚗✨`;
    clSetNarration(text);
    driveSpeak(text);
  }catch(e){
    const fb=`Adventure begins! Heading to ${place.name} — ${dist}. 🚗✨`;
    clSetNarration(fb); driveSpeak(fb);
  }
}

// ── Landmark bubbles on map ──────────────────────────────────────
function clDrawLandmarkBubbles(places){
  const container = document.getElementById('cl-landmarks');
  const wrap      = document.getElementById('cl-map-wrap');
  if(!container||!wrap) return;
  container.innerHTML='';
  const W=wrap.offsetWidth, H=wrap.offsetHeight;

  // Show first 8 places as bubbles on map
  places.slice(0,8).forEach((p,i)=>{
    if(!p.lat) return;
    const dp = clLatLngToCanvas(p.lat,p.lng,W,H);
    const div = document.createElement('div');
    div.className='cl-landmark-bubble '+p.type;
    div.textContent = clEmoji(p.type)+' '+p.name.slice(0,18)+(p.name.length>18?'…':'');
    div.style.left=dp.x+'px'; div.style.top=dp.y+'px';
    div.onclick=()=>clSelectDest(i);
    container.appendChild(div);
  });

  // Also show passing landmarks
  _clLandmarks.slice(0,5).forEach(lm=>{
    const dp = clLatLngToCanvas(lm.lat,lm.lng,W,H);
    const div=document.createElement('div');
    div.className='cl-landmark-bubble';
    div.textContent = clEmoji(lm.type)+' '+lm.name.slice(0,16)+(lm.name.length>16?'…':'');
    div.style.left=dp.x+'px'; div.style.top=dp.y+'px';
    div.style.opacity='0.6';
    container.appendChild(div);
  });
}

function clUpdateLandmarkStrip(){
  const strip = document.getElementById('cl-landmarks-strip');
  if(!strip) return;
  const all = [..._clPlaces.slice(0,5),..._clLandmarks.slice(0,4)];
  strip.innerHTML = all.map(lm=>
    `<div class="cl-lm-chip">${clEmoji(lm.type)} ${lm.name.slice(0,20)}</div>`
  ).join('');
}

// ── Live directions ──────────────────────────────────────────────
function clUpdateDirections(){
  if(!_clDestLat||!_clUserLat) return;
  const arrow   = document.getElementById('cl-dir-arrow');
  const dirText = document.getElementById('cl-dir-text');
  const navDist = document.getElementById('cl-nav-dist');

  const dist = clHaversine(_clUserLat,_clUserLng,_clDestLat,_clDestLng);
  const bearing = clBearing(_clUserLat,_clUserLng,_clDestLat,_clDestLng);

  if(navDist) navDist.textContent = clDistLabel(dist);
  if(arrow)   arrow.style.transform = `rotate(${bearing}deg)`;

  let dir='Head ';
  if(bearing<22.5||bearing>337.5)      dir+='North';
  else if(bearing<67.5)                dir+='Northeast';
  else if(bearing<112.5)               dir+='East';
  else if(bearing<157.5)               dir+='Southeast';
  else if(bearing<202.5)               dir+='South';
  else if(bearing<247.5)               dir+='Southwest';
  else if(bearing<292.5)               dir+='West';
  else                                 dir+='Northwest';
  dir += ` toward ${_clDestName}`;

  if(dirText) dirText.textContent = dist<0.05?'🎉 You\'ve arrived!':dir;
  if(dist<0.05) clOnArrive();
}

function clBearing(lat1,lon1,lat2,lon2){
  const dLon=(lon2-lon1)*Math.PI/180;
  const y=Math.sin(dLon)*Math.cos(lat2*Math.PI/180);
  const x=Math.cos(lat1*Math.PI/180)*Math.sin(lat2*Math.PI/180)-Math.sin(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.cos(dLon);
  return (Math.atan2(y,x)*180/Math.PI+360)%360;
}

// ── Proximity check — Aria narrates landmarks ────────────────────
let _clLastLandmarkIdx = -1;
function clCheckProximity(){
  if(!_clUserLat) return;
  _clLandmarks.forEach((lm,i)=>{
    if(i===_clLastLandmarkIdx) return;
    const d = clHaversine(_clUserLat,_clUserLng,lm.lat,lm.lng);
    if(d<0.3){
      _clLastLandmarkIdx=i;
      clNarreLandmark(lm);
    }
  });
}

async function clNarreLandmark(lm){
  const prompt=`You are Aria, a fun candy-land adventure GPS. The user is driving and just passed near "${lm.name}" (a ${lm.type}). Give ONE short sentence (max 20 words) narrating this landmark in an exciting upbeat way. Sound like a fun tour guide.`;
  try{
    const r=await fetch('/api/aria-drive',{method:'POST',headers:{'Content-Type':'application/json','X-Auth-Token':token},body:JSON.stringify({max_tokens:60,messages:[{role:'user',content:prompt}]})});
    const d=await r.json();
    const txt=d.text||`Passing by ${lm.name}! 🌟`;
    clSetNarration(txt);
    driveSpeak(txt);
  }catch(e){}
}

async function clOnArrive(){
  const txt=`You made it to ${_clDestName}! Amazing adventure! 🎉🍬`;
  clSetNarration(txt);
  driveSpeak(txt);
}

function clSetNarration(text){
  _clCurrentNarration=text;
  const el=document.getElementById('cl-aria-narration');
  if(el) el.textContent=text;
}

function clSpeakNarration(){
  driveSpeak(_clCurrentNarration);
}

// ── GPS inline Aria ask ──────────────────────────────────────────
let _clAskRecog = null;
let _clAskBusy  = false;

function clGpsMicTap(){
  const btn    = document.getElementById('cl-ask-mic');
  const status = document.getElementById('cl-ask-status');
  if(_clAskRecog){ _clAskRecog.stop(); _clAskRecog=null; btn.classList.remove('listening'); if(status) status.textContent=''; return; }
  const SR = window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ clSetNarration('Speech not supported — type your question below.'); return; }
  _clAskRecog = new SR();
  _clAskRecog.lang='en-US'; _clAskRecog.interimResults=false; _clAskRecog.maxAlternatives=1;
  btn.classList.add('listening');
  if(status) status.textContent='🎤 Listening…';
  _clAskRecog.onresult = e => {
    const txt = e.results[0][0].transcript;
    const inp = document.getElementById('cl-ask-input');
    if(inp) inp.value=txt;
    if(status) status.textContent='';
    clGpsAsk(txt);
  };
  _clAskRecog.onerror = () => { btn.classList.remove('listening'); if(status) status.textContent='Mic error — try again'; _clAskRecog=null; };
  _clAskRecog.onend   = () => { btn.classList.remove('listening'); _clAskRecog=null; };
  _clAskRecog.start();
}

async function clGpsAsk(forcedText){
  const inp = document.getElementById('cl-ask-input');
  const msg = forcedText||(inp?.value||'').trim();
  if(!msg||_clAskBusy) return;
  if(inp) inp.value='';
  _clAskBusy=true;
  const status = document.getElementById('cl-ask-status');
  if(status) status.textContent='Aria is thinking…';

  // Build context: current destination + type + dist
  let ctx='';
  if(_clDestName) ctx=` The user is currently navigating to "${_clDestName}" (${_clDestType}).`;
  if(_clUserLat&&_clDestLat){
    const d=clHaversine(_clUserLat,_clUserLng,_clDestLat,_clDestLng);
    ctx+=` They are ${clDistLabel(d)} away from the destination.`;
  }

  try{
    const r = await fetch('/api/aria-drive',{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Auth-Token':token},
      body: JSON.stringify({
        max_tokens:200,
        system:`You are Aria, a warm helpful AI co-pilot from Support (a hair care and tech company). The user is DRIVING — keep ALL answers SHORT, max 2-3 sentences. Be upbeat and natural.${ctx}`,
        messages:[{role:'user',content:msg}]
      })
    });
    const d = await r.json();
    const reply = d.text||'Sorry, try again!';
    clSetNarration(reply);
    driveSpeak(reply);
    if(status) status.textContent='';
  }catch(e){
    clSetNarration('Connection issue — try again.');
    if(status) status.textContent='';
  }
  _clAskBusy=false;
}


// Animate the candy path
function clAnimate(){
  if(_driveGpsMode&&_clMapReady){ clDrawMap(); }
  _clAnimFrame=requestAnimationFrame(clAnimate);
}
clAnimate();


// ═══════════════════════════════════════════════════════════════
// ✦ UPGRADE IDEA MODAL
// ═══════════════════════════════════════════════════════════════

function openUpgradeModal(){
  const modal = document.getElementById('upgrade-idea-modal');
  if(!modal) return;
  // Reset form to clean state
  const fields = document.getElementById('upgrade-form-fields');
  const success = document.getElementById('upgrade-success');
  if(fields)  fields.style.display = 'block';
  if(success) success.style.display = 'none';
  const err = document.getElementById('ui-error');
  if(err){ err.style.display='none'; err.textContent=''; }
  const btn = document.getElementById('ui-submit-btn');
  if(btn){ btn.disabled=false; btn.textContent='Submit Idea →'; }
  const titleEl = document.getElementById('ui-title');
  const descEl  = document.getElementById('ui-desc');
  const codeEl  = document.getElementById('ui-code');
  const countEl = document.getElementById('ui-desc-count');
  if(titleEl) titleEl.value='';
  if(descEl)  { descEl.value=''; if(countEl) countEl.textContent='0 / 3000'; }
  if(codeEl)  codeEl.value='';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  // Wire up char counter
  if(descEl && countEl){
    descEl.oninput = () => { countEl.textContent = descEl.value.length + ' / 3000'; };
  }
}

function closeUpgradeModal(){
  const modal = document.getElementById('upgrade-idea-modal');
  if(modal) modal.style.display = 'none';
  document.body.style.overflow = '';
}

function openPositionsModal(){
  const modal = document.getElementById('positions-modal');
  if(modal) modal.style.display = 'flex';
}

function closePositionsModal(){
  const modal = document.getElementById('positions-modal');
  if(modal) modal.style.display = 'none';
}

async function submitUpgradeIdea(){
  const title = (document.getElementById('ui-title')?.value||'').trim();
  const desc  = (document.getElementById('ui-desc')?.value||'').trim();
  const code  = (document.getElementById('ui-code')?.value||'').trim();
  const errEl = document.getElementById('ui-error');
  const btn   = document.getElementById('ui-submit-btn');

  const showErr = (msg) => {
    if(errEl){ errEl.textContent=msg; errEl.style.display='block'; }
    if(btn){ btn.disabled=false; btn.textContent='Submit Idea →'; }
  };

  // Validate
  if(!title){ showErr('Please add a title for your idea.'); document.getElementById('ui-title')?.focus(); return; }
  if(title.length > 120){ showErr('Title is too long — max 120 characters.'); return; }
  if(!desc)  { showErr('Please describe your idea.'); document.getElementById('ui-desc')?.focus(); return; }
  if(desc.length < 30){ showErr('Description is too short — give us a bit more detail (at least 30 characters).'); return; }

  if(errEl) errEl.style.display='none';
  if(btn){ btn.disabled=true; btn.textContent='Submitting…'; }

  try{
    const r = await fetch('/api/upgrade-idea',{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Auth-Token':token},
      body: JSON.stringify({ title, description: desc, code })
    });
    const d = await r.json();
    if(!r.ok || d.error){
      showErr(d.error || 'Something went wrong. Please try again.');
      return;
    }
    // Show success state
    const fields  = document.getElementById('upgrade-form-fields');
    const success = document.getElementById('upgrade-success');
    if(fields)  fields.style.display  = 'none';
    if(success) success.style.display = 'block';
  }catch(e){
    showErr('Network error — please check your connection and try again.');
  }
}


loadData();
loadRealStats();
</script>
<!-- ✦ UPGRADE IDEA MODAL -->
<div id="upgrade-idea-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9998;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)closeUpgradeModal()">
  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:22px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;position:relative;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,rgba(240,160,144,0.15),rgba(224,176,80,0.08));border-bottom:1px solid var(--border2);padding:24px 28px 20px;border-radius:22px 22px 0 0;">
      <div style="font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:var(--rose);margin-bottom:8px;">✦ Community Upgrade Program</div>
      <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--text);margin-bottom:6px;">Got an idea to improve Support?</div>
      <div style="font-size:13px;color:var(--muted2);line-height:1.65;">Submit your upgrade idea — describe the feature, show us the logic or code if you have it, and if we build it you earn <strong style="color:var(--gold);">1 free month of Premium</strong> on us.</div>
    </div>

    <!-- How it works -->
    <div style="display:flex;gap:0;border-bottom:1px solid var(--border2);">
      <div style="flex:1;padding:16px 20px;border-right:1px solid var(--border2);text-align:center;">
        <div style="font-size:22px;margin-bottom:6px;">💡</div>
        <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:3px;">Submit Idea</div>
        <div style="font-size:10px;color:var(--muted);">Describe the upgrade</div>
      </div>
      <div style="flex:1;padding:16px 20px;border-right:1px solid var(--border2);text-align:center;">
        <div style="font-size:22px;margin-bottom:6px;">🔍</div>
        <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:3px;">We Review</div>
        <div style="font-size:10px;color:var(--muted);">Team evaluates it</div>
      </div>
      <div style="flex:1;padding:16px 20px;text-align:center;">
        <div style="font-size:22px;margin-bottom:6px;">🎉</div>
        <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:3px;">Get Rewarded</div>
        <div style="font-size:10px;color:var(--muted);">1 free month if accepted</div>
      </div>
    </div>

    <!-- Form -->
    <div style="padding:24px 28px;" id="upgrade-form-wrap">

      <div id="upgrade-success" style="display:none;text-align:center;padding:32px 20px;">
        <div style="font-size:48px;margin-bottom:16px;">🎉</div>
        <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--text);margin-bottom:10px;">Idea Submitted!</div>
        <div style="font-size:13px;color:var(--muted2);line-height:1.7;margin-bottom:20px;">We've received your upgrade idea and sent it to the Support team. If accepted, <strong style="color:var(--gold);">1 free month of Premium</strong> will be added to your account automatically — no action needed.</div>
        <button onclick="closeUpgradeModal()" style="background:var(--rose);color:#fff;border:none;border-radius:20px;padding:12px 28px;font-size:12px;font-family:'Space Grotesk',sans-serif;font-weight:700;letter-spacing:0.08em;cursor:pointer;">Close</button>
      </div>

      <div id="upgrade-form-fields">
        <!-- Title -->
        <div style="margin-bottom:16px;">
          <label style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px;">Idea Title <span style="color:var(--rose);">*</span></label>
          <input id="ui-title" type="text" maxlength="120"
            style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:12px 14px;font-size:14px;color:var(--text);font-family:'Space Grotesk',sans-serif;outline:none;box-sizing:border-box;"
            placeholder="e.g. Add a weekly hair progress chart to the dashboard">
        </div>

        <!-- Description -->
        <div style="margin-bottom:16px;">
          <label style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px;">Describe Your Idea <span style="color:var(--rose);">*</span></label>
          <textarea id="ui-desc" rows="5" maxlength="3000"
            style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:12px 14px;font-size:13px;color:var(--text);font-family:'Space Grotesk',sans-serif;outline:none;resize:vertical;line-height:1.6;box-sizing:border-box;"
            placeholder="Explain what the feature does, why it would be useful, how users would interact with it, and what problem it solves..."></textarea>
          <div style="text-align:right;font-size:10px;color:var(--muted);margin-top:4px;" id="ui-desc-count">0 / 3000</div>
        </div>

        <!-- Code snippet -->
        <div style="margin-bottom:20px;">
          <label style="font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px;">
            Code or Technical Logic
            <span style="color:var(--muted);font-weight:400;text-transform:none;letter-spacing:0;"> — optional but encouraged</span>
          </label>
          <textarea id="ui-code" rows="6" maxlength="5000"
            style="width:100%;background:#0d1220;border:1px solid var(--border2);border-radius:10px;padding:12px 14px;font-size:12px;color:#a8d8a8;font-family:'IBM Plex Mono',monospace;outline:none;resize:vertical;line-height:1.7;box-sizing:border-box;"
            placeholder="// Paste any code, pseudocode, SQL, or technical logic here
// Even rough ideas help us understand your vision

function myUpgradeIdea() {
  // e.g. track weekly hair score and show a chart
}"></textarea>
          <div style="font-size:10px;color:var(--muted);margin-top:6px;">💡 You don't need to be a developer. Pseudocode, diagrams described in words, or even just detailed logic all count.</div>
        </div>

        <!-- Error -->
        <div id="ui-error" style="display:none;background:rgba(240,80,80,0.1);border:1px solid rgba(240,80,80,0.3);border-radius:8px;padding:10px 14px;font-size:12px;color:#f05050;margin-bottom:14px;"></div>

        <!-- Submit row -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
          <div style="font-size:11px;color:var(--muted);line-height:1.5;max-width:260px;">By submitting you agree your idea may be used to improve Support. Credit given where possible.</div>
          <button id="ui-submit-btn" onclick="submitUpgradeIdea()"
            style="background:linear-gradient(135deg,var(--rose),#d06050);color:#fff;border:none;border-radius:20px;padding:13px 28px;font-size:12px;font-family:'Space Grotesk',sans-serif;font-weight:700;letter-spacing:0.08em;cursor:pointer;white-space:nowrap;box-shadow:0 4px 16px rgba(240,160,144,0.35);transition:all 0.2s;">
            Submit Idea →
          </button>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- DASHBOARD GLOBAL FOOTER -->
<div class="dashboard-footer" id="dashboard-footer">
  <a onclick="switchPTab('overview')">Overview</a>
  <a onclick="switchPTab('profile')">Hair Profile</a>
  <a onclick="switchPTab('settings')">Settings</a>
  <a href="https://supportrd.com" target="_blank">Shop</a>
  <a href="mailto:hello@supportrd.com">Contact</a>
  <a onclick="openPositionsModal()">🗳 Positions</a>
  <a href="/about">About Us</a>
  <a onclick="document.getElementById('dash-privacy-modal').style.display='flex'">Privacy Policy</a>
  <a onclick="openUpgradeModal()" style="color:var(--gold);font-weight:700;">💡 Submit an Upgrade — Earn 1 Free Month</a>
</div>

<!-- CAMPAIGN MODAL (dashboard) -->
<div id="dash-campaign-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;align-items:center;justify-content:center;padding:24px;" onclick="this.style.display='none'">
  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:20px;padding:36px 32px;max-width:440px;width:100%;" onclick="event.stopPropagation()">
    <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--rose);margin-bottom:10px;">✦ Our Political Position</div>
    <div style="font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--text);margin-bottom:12px;">Ban Pornography on the Internet</div>
    <div style="font-size:13px;color:var(--muted2);line-height:1.75;margin-bottom:16px;">Support the company publicly backs the campaign to ban pornography on the internet. We believe unrestricted access to explicit content online causes documented harm to children, relationships, and communities. This is our official stated position. We are affiliated with the Democratic Party.</div>
    <div style="font-size:10px;color:var(--muted);margin-bottom:18px;">This reflects the personal and company position of Support's leadership.</div>
    <button onclick="document.getElementById('dash-campaign-modal').style.display='none'" style="background:var(--rose);color:#fff;border:none;border-radius:20px;padding:11px 24px;font-size:11px;letter-spacing:0.1em;cursor:pointer;font-family:'Space Grotesk',sans-serif;">Close</button>
  </div>
</div>

<!-- ABOUT MODAL (dashboard) -->
<div id="dash-about-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;align-items:center;justify-content:center;padding:24px;" onclick="this.style.display='none'">
  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:20px;padding:36px 32px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto;" onclick="event.stopPropagation()">
    <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--rose);margin-bottom:10px;">✦ About Support</div>
    <div style="font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:var(--text);margin-bottom:6px;">Born in the Dominican Republic.</div>
    <div style="font-size:13px;color:var(--muted2);line-height:1.75;margin-bottom:20px;">Support is a product company built on one belief — that real people deserve real tools. We started with hair care, built Aria, and we're expanding into technology education, smart products, and hands-free living.</div>
    <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--rose);margin-bottom:12px;">The Team</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:12px;"><div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--rose),#c06050);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;color:#fff;font-size:12px;flex-shrink:0;">AF</div><div><div style="font-size:13px;font-weight:600;color:var(--text);">Anthony Figueroa</div><div style="font-size:10px;color:var(--muted);letter-spacing:0.08em;">Design &amp; Creative Direction</div></div></div>
      <div style="display:flex;align-items:center;gap:12px;"><div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--gold),#c08020);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;color:#fff;font-size:12px;flex-shrink:0;">CF</div><div><div style="font-size:13px;font-weight:600;color:var(--text);">Crystal Figueroa</div><div style="font-size:10px;color:var(--muted);letter-spacing:0.08em;">Co-CEO</div></div></div>
      <div style="display:flex;align-items:center;gap:12px;"><div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--blue),#2060c0);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;color:#fff;font-size:12px;flex-shrink:0;">EV</div><div><div style="font-size:13px;font-weight:600;color:var(--text);">Evelyn</div><div style="font-size:10px;color:var(--muted);letter-spacing:0.08em;">Co-CEO &amp; Shampoo Inventor</div></div></div>
    </div>
    <div style="font-size:10px;color:var(--muted);border-top:1px solid var(--border);padding-top:12px;">⏱ Coding Education officially launched March 12, 2026</div>
    <button onclick="document.getElementById('dash-about-modal').style.display='none'" style="margin-top:16px;background:var(--rose);color:#fff;border:none;border-radius:20px;padding:11px 24px;font-size:11px;letter-spacing:0.1em;cursor:pointer;font-family:'Space Grotesk',sans-serif;">Close</button>
  </div>
</div>

<!-- PRIVACY MODAL (dashboard) -->
<div id="dash-privacy-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;align-items:center;justify-content:center;padding:24px;" onclick="this.style.display='none'">
  <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:20px;padding:36px 32px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto;" onclick="event.stopPropagation()">
    <div style="font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--rose);margin-bottom:10px;">✦ Privacy Policy</div>
    <div style="font-family:'Syne',sans-serif;font-size:18px;font-weight:800;color:var(--text);margin-bottom:14px;">Your Data at Support</div>
    <div style="font-size:12px;color:var(--muted2);line-height:1.8;">We collect your name, email, hair profile data, and chat history with Aria. This data is used solely to operate the app and improve Aria's advice to you. We do not sell your data to third parties. Your chat conversations are stored securely. You may delete your account at any time from Settings, which permanently removes all your data. For questions contact hello@supportrd.com.</div>
    <button onclick="document.getElementById('dash-privacy-modal').style.display='none'" style="margin-top:20px;background:var(--rose);color:#fff;border:none;border-radius:20px;padding:11px 24px;font-size:11px;letter-spacing:0.1em;cursor:pointer;font-family:'Space Grotesk',sans-serif;">Close</button>
  </div>
</div>
</body></html>"""
    return Response(html, mimetype='text/html')


# ── UPGRADE IDEAS ─────────────────────────────────────────────────

@app.route("/api/upgrade-idea", methods=["POST","OPTIONS"])
def submit_upgrade_idea():
    if request.method == "OPTIONS": return jsonify({}), 200
    user = get_current_user()
    if not user: return jsonify({"error":"unauthorized"}), 401
    data  = request.get_json(silent=True) or {}
    title = (data.get("title","") or "").strip()
    desc  = (data.get("description","") or "").strip()
    code  = (data.get("code","") or "").strip()
    if not title or not desc:
        return jsonify({"error":"Please provide a title and description."}), 400
    if len(title) > 120:
        return jsonify({"error":"Title too long (max 120 chars)."}), 400
    if len(desc) > 3000:
        return jsonify({"error":"Description too long (max 3000 chars)."}), 400

    db_execute(
        "INSERT INTO upgrade_ideas (user_id, user_email, user_name, idea_title, idea_desc, code_snippet) VALUES (?,?,?,?,?,?)",
        (user["id"], user["email"], user["name"], title, desc, code)
    )
    idea_id = db_execute("SELECT last_insert_rowid()", fetchone=True)[0]

    # Email admin
    admin_email = os.environ.get("ADMIN_EMAIL","").strip()
    approve_url = os.environ.get("APP_BASE_URL","https://aria.supportrd.com") + f"/api/upgrade-idea/approve?id={idea_id}&key=" + os.environ.get("ADMIN_KEY","")
    reject_url  = os.environ.get("APP_BASE_URL","https://aria.supportrd.com") + f"/api/upgrade-idea/reject?id={idea_id}&key=" + os.environ.get("ADMIN_KEY","")
    try:
        import smtplib; from email.mime.text import MIMEText; from email.mime.multipart import MIMEMultipart
        smtp_user = os.environ.get("SMTP_USER",""); smtp_pass = os.environ.get("SMTP_PASS","")
        if smtp_user and smtp_pass and admin_email:
            body = f"""New Upgrade Idea Submitted
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From:    {user['name']} ({user['email']})
Title:   {title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{desc}

{"─── Code Snippet ───" + chr(10) + code if code else "(No code submitted)"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ APPROVE (grants 1 free month):
{approve_url}

❌ REJECT (sends decline email):
{reject_url}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
            msg = MIMEText(body)
            msg["Subject"] = f"[Support App] Upgrade Idea: {title}"
            msg["From"]    = smtp_user
            msg["To"]      = admin_email
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
    except Exception as e:
        pass  # Email failure shouldn't block submission

    return jsonify({"ok": True, "id": idea_id,
        "message": "Your idea has been submitted! If accepted, you'll receive 1 free month of Premium automatically."})


@app.route("/api/upgrade-idea/approve", methods=["GET","POST"])
def approve_upgrade_idea():
    key     = request.args.get("key","")
    idea_id = request.args.get("id","")
    if key != os.environ.get("ADMIN_KEY","") or not idea_id:
        return "Unauthorized", 403

    idea = db_execute("SELECT * FROM upgrade_ideas WHERE id=?", (idea_id,), fetchone=True)
    if not idea: return "Idea not found", 404
    if idea["status"] != "pending": return f"Already {idea['status']}", 200

    # Grant 1 free month to the user
    user_id    = idea["user_id"]
    period_end = (datetime.datetime.utcnow() + datetime.timedelta(days=30)).isoformat()
    existing   = db_execute("SELECT id FROM subscriptions WHERE user_id=?", (user_id,), fetchone=True)
    if existing:
        # Extend from current end date if already premium
        cur = db_execute("SELECT current_period_end FROM subscriptions WHERE user_id=?", (user_id,), fetchone=True)
        try:
            cur_end = datetime.datetime.fromisoformat(cur["current_period_end"] or "")
            if cur_end > datetime.datetime.utcnow():
                period_end = (cur_end + datetime.timedelta(days=30)).isoformat()
        except: pass
        db_execute("UPDATE subscriptions SET status='active', plan='premium', current_period_end=?, updated_at=datetime('now') WHERE user_id=?", (period_end, user_id))
    else:
        db_execute("INSERT INTO subscriptions (user_id, status, plan, current_period_end) VALUES (?, 'active', 'premium', ?)", (user_id, period_end))

    db_execute("UPDATE upgrade_ideas SET status='approved', reviewed_at=datetime('now') WHERE id=?", (idea_id,))

    # Email the user
    try:
        import smtplib; from email.mime.text import MIMEText
        smtp_user = os.environ.get("SMTP_USER",""); smtp_pass = os.environ.get("SMTP_PASS","")
        if smtp_user and smtp_pass and idea["user_email"]:
            body = f"""Hi {idea['user_name']},

Great news — your upgrade idea was accepted! 🎉

"{idea['idea_title']}"

As a thank you, we've added 1 free month of SupportRD Premium to your account.
Your premium access is active now. Log in and enjoy everything Aria has to offer.

Thank you for helping make Support better.

— The Support Team
hello@supportrd.com"""
            msg = MIMEText(body)
            msg["Subject"] = "Your SupportRD upgrade idea was accepted — 1 free month added! 🎉"
            msg["From"]    = smtp_user
            msg["To"]      = idea["user_email"]
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
    except: pass

    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{{font-family:sans-serif;background:#f0faf5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}}
.card{{background:#fff;border-radius:16px;padding:40px;max-width:440px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.08);}}
h2{{color:#2d6a4f;margin-bottom:12px;}} p{{color:#555;line-height:1.6;}}
</style></head><body><div class="card">
<h2>✅ Idea Approved!</h2>
<p><strong>{idea['user_name']}</strong> has been granted 1 free month of Premium.</p>
<p>An email confirmation has been sent to {idea['user_email']}.</p>
<p style="margin-top:20px;font-size:13px;color:#999;">Idea: "{idea['idea_title']}"</p>
</div></body></html>"""


@app.route("/api/upgrade-idea/reject", methods=["GET","POST"])
def reject_upgrade_idea():
    key     = request.args.get("key","")
    idea_id = request.args.get("id","")
    if key != os.environ.get("ADMIN_KEY","") or not idea_id:
        return "Unauthorized", 403

    idea = db_execute("SELECT * FROM upgrade_ideas WHERE id=?", (idea_id,), fetchone=True)
    if not idea: return "Idea not found", 404
    if idea["status"] != "pending": return f"Already {idea['status']}", 200

    db_execute("UPDATE upgrade_ideas SET status='rejected', reviewed_at=datetime('now') WHERE id=?", (idea_id,))

    # Email the user a kind decline
    try:
        import smtplib; from email.mime.text import MIMEText
        smtp_user = os.environ.get("SMTP_USER",""); smtp_pass = os.environ.get("SMTP_PASS","")
        if smtp_user and smtp_pass and idea["user_email"]:
            body = f"""Hi {idea['user_name']},

Thank you for submitting your idea to Support:

"{idea['idea_title']}"

We reviewed it carefully. At this time we aren't moving forward with this particular idea, but we genuinely appreciate you taking the time to contribute.

Keep the ideas coming — every submission helps us understand what our community needs.

— The Support Team
hello@supportrd.com"""
            msg = MIMEText(body)
            msg["Subject"] = "Your SupportRD upgrade idea — update from the team"
            msg["From"]    = smtp_user
            msg["To"]      = idea["user_email"]
            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
    except: pass

    return f"""<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{{font-family:sans-serif;background:#fff8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;}}
.card{{background:#fff;border-radius:16px;padding:40px;max-width:440px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.08);}}
h2{{color:#9d7f6a;margin-bottom:12px;}} p{{color:#555;line-height:1.6;}}
</style></head><body><div class="card">
<h2>Idea Declined</h2>
<p>A polite decline email has been sent to <strong>{idea['user_email']}</strong>.</p>
<p style="margin-top:20px;font-size:13px;color:#999;">Idea: "{idea['idea_title']}"</p>
</div></body></html>"""


@app.route("/api/admin/upgrade-ideas", methods=["GET"])
def admin_upgrade_ideas():
    key = request.args.get("key","")
    if key != os.environ.get("ADMIN_KEY",""): return jsonify({"error":"unauthorized"}), 403
    ideas = db_execute("SELECT * FROM upgrade_ideas ORDER BY submitted_at DESC", fetchall=True)
    return jsonify([dict(i) for i in (ideas or [])])


@app.after_request
def after_request(response):
    origin = request.headers.get('Origin','')
    allowed = [os.environ.get('APP_BASE_URL',''), 'https://supportrd.com', 'https://www.supportrd.com',
               'http://localhost:5000', 'http://127.0.0.1:5000']
    if origin in allowed:
        response.headers['Access-Control-Allow-Origin']  = origin
        response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type,X-Auth-Token,Authorization'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
