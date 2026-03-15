import os, json, sqlite3, datetime, hashlib, secrets, threading, random, re, time
from flask import Flask, request, jsonify, Response, redirect, render_template_string, session, url_for
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)

# ═══ PROXY FIX — required on Render/Heroku behind load balancer ════════════════════════════════════════════════
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# ═══ FLASK CONFIG ═════════════════════════════════════════════════════════════════════════════════════════════
app.config['SECRET_KEY']                   = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_SECURE']        = True
app.config['SESSION_COOKIE_HTTPONLY']      = True
app.config['SESSION_COOKIE_SAMESITE']      = 'Lax'
app.config['PREFERRED_URL_SCHEME']         = 'https'

# ═══ API KEYS ════════════════════════════════════════════════════════════════════════════════════════════════
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE", "supportdr-com.myshopify.com")
SHOPIFY_ADMIN_TOKEN = os.environ.get("SHOPIFY_ADMIN_TOKEN", "")
SHOPIFY_STOREFRONT_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_TOKEN", "")

# ═══ DATABASE SETUP ══════════════════════════════════════════════════════════════════════════════════════════
_DATA_DIR = "/data" if os.path.isdir("/data") else os.path.dirname(os.path.abspath(__file__))
AUTH_DB = os.path.join(_DATA_DIR, "users.db")
ANALYTICS_DB = os.path.join(_DATA_DIR, "analytics.db")

_db_lock = threading.Lock()

def get_db():
    con = sqlite3.connect(AUTH_DB, timeout=60, check_same_thread=False)
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA synchronous=NORMAL")
    con.execute("PRAGMA busy_timeout=60000")
    con.row_factory = sqlite3.Row
    return con

def db_execute(query, params=(), fetchone=False, fetchall=False):
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

init_auth_db()

# ═══ BLOG DATABASE ═══════════════════════════════════════════════════════════════════════════════════════════
def init_blog_db():
    con = get_db()
    con.execute("""CREATE TABLE IF NOT EXISTS blog_posts (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        slug            TEXT UNIQUE NOT NULL,
        title           TEXT NOT NULL,
        subtitle        TEXT,
        body            TEXT NOT NULL,
        cover_url       TEXT,
        author          TEXT DEFAULT 'Support RD Team',
        tags            TEXT DEFAULT '',
        status          TEXT DEFAULT 'draft',
        approval_status TEXT DEFAULT 'pending',
        approved_by     TEXT,
        approved_at     TEXT,
        rejection_note  TEXT,
        featured        INTEGER DEFAULT 0,
        views           INTEGER DEFAULT 0,
        ai_generated    INTEGER DEFAULT 0,
        created_at      TEXT DEFAULT (datetime('now')),
        updated_at      TEXT DEFAULT (datetime('now')),
        published_at    TEXT
    )""")
    con.execute("""CREATE TABLE IF NOT EXISTS blog_ideas (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT NOT NULL,
        subtitle    TEXT,
        outline     TEXT,
        tags        TEXT,
        reasoning   TEXT,
        status      TEXT DEFAULT 'new',
        created_at  TEXT DEFAULT (datetime('now'))
    )""")
    con.commit()
    con.close()

init_blog_db()

# ═══ AUTH HELPERS ═══════════════════════════════════════════════════════════════════════════════════════════
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
    token = request.headers.get("X-Auth-Token") or request.cookies.get("srd_token") or session.get("srd_token")
    return get_user_from_token(token)

def is_admin_user(user_id):
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if not admin_email: return False
    row = db_execute("SELECT email FROM users WHERE id=?", (user_id,), fetchone=True)
    if row and row[0].strip().lower() == admin_email: return True
    return False

def is_subscribed(user_id):
    if is_admin_user(user_id): return True
    row = db_execute("SELECT status, trial_end FROM subscriptions WHERE user_id=?", (user_id,), fetchone=True)
    if not row: return False
    status, trial_end = row[0], row[1]
    if status in ("active", "trialing"): return True
    if trial_end:
        try:
            if datetime.datetime.utcnow() < datetime.datetime.fromisoformat(trial_end): return True
        except: pass
    return False

# ═══ PRODUCT DATA ═══════════════════════════════════════════════════════════════════════════════════════════
PRODUCT_CARDS = {
    "Formula Exclusiva": {
        "name": "Formula Exclusiva", "emoji": "🌿",
        "tagline": "Professional all-in-one repair treatment",
        "best_for": "Damaged, weak, breaking or thinning hair",
        "price": "$55", "price_num": 55.00,
        "handle": "formula-exclusiva",
        "order_url": "https://supportrd.com/products/formula-exclusiva"
    },
    "Laciador Crece": {
        "name": "Laciador Crece", "emoji": "✨",
        "tagline": "Restructurer for softness, shine & growth",
        "best_for": "Dry hair, frizz, lack of shine, styling",
        "price": "$40", "price_num": 40.00,
        "handle": "lsciador-conditioner",
        "order_url": "https://supportrd.com/products/lsciador-conditioner"
    },
    "Gotero Rapido": {
        "name": "Gotero Rápido", "emoji": "💧",
        "tagline": "Fast-acting scalp & growth serum",
        "best_for": "Hair loss, slow growth, scalp issues",
        "price": "$55", "price_num": 55.00,
        "handle": "gotero-rapido",
        "order_url": "https://supportrd.com/products/gotero-rapido"
    },
    "Gotitas Brillantes": {
        "name": "Gotitas Brillantes", "emoji": "🎨",
        "tagline": "Finishing drops for shine & softness",
        "best_for": "Shine, frizz control, styling finish",
        "price": "$30", "price_num": 30.00,
        "handle": "gotitas-brillantes",
        "order_url": "https://supportrd.com/products/gotitas-brillantes"
    },
    "Mascarilla Natural": {
        "name": "Mascarilla Natural", "emoji": "🥑",
        "tagline": "Deep conditioning avocado mask",
        "best_for": "Deep conditioning, dry or damaged hair",
        "price": "$25", "price_num": 25.00,
        "handle": "mascarilla-avocado",
        "order_url": "https://supportrd.com/products/mascarilla-avocado"
    },
    "Shampoo Aloe & Romero": {
        "name": "Shampoo Aloe & Romero", "emoji": "🌱",
        "tagline": "Cleansing shampoo with aloe & rosemary",
        "best_for": "Scalp stimulation, daily cleanse, growth",
        "price": "$20", "price_num": 20.00,
        "handle": "shampoo-aloe-vera",
        "order_url": "https://supportrd.com/products/shampoo-aloe-vera"
    }
}

# ═══ SYSTEM PROMPT FOR ARIA ════════════════════════════════════════════════════════════════════════════════
SYSTEM_PROMPT = """You are Aria — a warm, confident hair advisor for SupportRD, a professional Dominican hair care brand.

RULE #1 — RECOMMEND FAST: In your FIRST or SECOND response, always name the specific SupportRD product that fits the user's concern.

RULE #2 — PRODUCT NAMES: Always use the EXACT product names: Formula Exclusiva, Laciador Crece, Gotero Rapido, Gotitas Brillantes, Mascarilla Natural, Shampoo Aloe & Romero.

RULE #3 — ORDERING: When you recommend a product, always add: "You can request it at supportrd.com/pages/custom-order"

RULE #4 — ONLY SupportRD: Never mention outside brands. Redirect warmly.

RULE #5 — PRODUCT TAG: At the end of responses where you recommend a product, append: [PRODUCT:Product Name]

QUICK MATCH GUIDE:
- Breaking / damaged / weak → Formula Exclusiva
- Dry / frizzy / no shine → Laciador Crece
- Hair loss / scalp / slow growth → Gotero Rapido
- Shine / finishing touch → Gotitas Brillantes
- Deep conditioning → Mascarilla Natural
- Cleanse / scalp / daily → Shampoo Aloe & Romero

STYLE: Warm and confident, 2-4 sentences max. Lead with the solution."""

# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# LOGIN PAGE
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/login")
def login_page():
    """Beautiful login page with email/password and Google OAuth option."""
    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Login — SupportRD Hair Advisor</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@200;300;400;600&display=swap" rel="stylesheet">
<style>
:root {
  --brand-bg: #f0ebe8;
  --brand-text: #0d0906;
  --brand-accent: rgba(193,163,162,1);
  --brand-accent-lo: rgba(193,163,162,0.08);
  --brand-accent-mid: rgba(193,163,162,0.22);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: radial-gradient(ellipse at 50% 60%, #e8e0da 0%, var(--brand-bg) 100%);
  color: var(--brand-text);
  font-family: 'Jost', sans-serif;
  font-weight: 300;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.login-card {
  background: #fff;
  border-radius: 24px;
  box-shadow: 0 8px 48px rgba(0,0,0,0.08);
  padding: 48px 40px;
  width: 100%;
  max-width: 420px;
  text-align: center;
}
.logo {
  font-family: 'Cormorant Garamond', serif;
  font-size: 32px;
  font-style: italic;
  color: var(--brand-accent);
  margin-bottom: 8px;
}
.tagline {
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(0,0,0,0.35);
  margin-bottom: 36px;
}
.form-group {
  margin-bottom: 18px;
  text-align: left;
}
.form-group label {
  display: block;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(0,0,0,0.45);
  margin-bottom: 8px;
}
.form-group input {
  width: 100%;
  padding: 14px 18px;
  border: 1px solid rgba(193,163,162,0.25);
  border-radius: 12px;
  font-family: inherit;
  font-size: 15px;
  background: rgba(250,246,243,0.8);
  transition: border-color 0.3s, box-shadow 0.3s;
}
.form-group input:focus {
  outline: none;
  border-color: var(--brand-accent);
  box-shadow: 0 0 0 3px rgba(193,163,162,0.15);
}
.btn-primary {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #c1a3a2, #9d7f6a);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: opacity 0.3s, transform 0.2s;
  margin-top: 12px;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.divider {
  display: flex;
  align-items: center;
  margin: 28px 0;
}
.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(193,163,162,0.2);
}
.divider span {
  padding: 0 16px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(0,0,0,0.3);
}
.btn-google {
  width: 100%;
  padding: 14px;
  background: #fff;
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 12px;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background 0.2s;
}
.btn-google:hover { background: #f8f8f8; }
.btn-google img { width: 20px; height: 20px; }
.error-msg {
  background: rgba(220,80,80,0.08);
  border: 1px solid rgba(220,80,80,0.2);
  color: #c44;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 18px;
  display: none;
}
.success-msg {
  background: rgba(48,200,120,0.08);
  border: 1px solid rgba(48,200,120,0.2);
  color: #2a8;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  margin-bottom: 18px;
  display: none;
}
.switch-link {
  margin-top: 24px;
  font-size: 13px;
  color: rgba(0,0,0,0.45);
}
.switch-link a {
  color: var(--brand-accent);
  text-decoration: none;
  font-weight: 500;
}
.switch-link a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="login-card">
  <div class="logo">Support RD</div>
  <div class="tagline">Hair Advisor • AI-Powered</div>
  
  <div class="error-msg" id="errorMsg"></div>
  <div class="success-msg" id="successMsg"></div>
  
  <form id="loginForm">
    <div class="form-group">
      <label>Email</label>
      <input type="email" id="email" placeholder="you@example.com" required>
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="password" placeholder="••••••••" required>
    </div>
    <button type="submit" class="btn-primary" id="loginBtn">Sign In</button>
  </form>
  
  <div class="divider"><span>or</span></div>
  
  <button class="btn-google" onclick="googleSignIn()">
    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
    Continue with Google
  </button>
  
  <div class="switch-link">
    Don't have an account? <a href="#" onclick="toggleMode()">Sign up</a>
  </div>
</div>

<script>
let isSignup = false;
const form = document.getElementById('loginForm');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const btn = document.getElementById('loginBtn');

function toggleMode() {
  isSignup = !isSignup;
  btn.textContent = isSignup ? 'Create Account' : 'Sign In';
  document.querySelector('.switch-link').innerHTML = isSignup 
    ? 'Already have an account? <a href="#" onclick="toggleMode()">Sign in</a>'
    : 'Don\\'t have an account? <a href="#" onclick="toggleMode()">Sign up</a>';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.style.display = 'none';
  successMsg.style.display = 'none';
  btn.disabled = true;
  btn.textContent = 'Please wait...';
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const endpoint = isSignup ? '/api/auth/register' : '/api/auth/login';
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name: email.split('@')[0] })
    });
    const data = await res.json();
    
    if (data.token) {
      localStorage.setItem('srd_token', data.token);
      document.cookie = 'srd_token=' + data.token + ';path=/;max-age=2592000';
      successMsg.textContent = isSignup ? 'Account created! Redirecting...' : 'Welcome back! Redirecting...';
      successMsg.style.display = 'block';
      setTimeout(() => { window.location.href = '/dashboard'; }, 800);
    } else {
      errorMsg.textContent = data.error || 'Something went wrong';
      errorMsg.style.display = 'block';
      btn.textContent = isSignup ? 'Create Account' : 'Sign In';
      btn.disabled = false;
    }
  } catch (err) {
    errorMsg.textContent = 'Network error. Please try again.';
    errorMsg.style.display = 'block';
    btn.textContent = isSignup ? 'Create Account' : 'Sign In';
    btn.disabled = false;
  }
});

function googleSignIn() {
  const clientId = 'YOUR_GOOGLE_CLIENT_ID';
  const redirect = encodeURIComponent(window.location.origin + '/auth/google/callback');
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=email%20profile`;
}
</script>
</body>
</html>"""
    return Response(html, mimetype="text/html")


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# AUTH API ROUTES
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/api/auth/register", methods=["POST", "OPTIONS"])
def api_register():
    if request.method == "OPTIONS": return jsonify({"ok": True}), 200
    data = request.get_json(silent=True) or {}
    email = (data.get("email", "") or "").strip().lower()
    password = data.get("password", "") or ""
    name = data.get("name", "") or email.split("@")[0]
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    
    existing = db_execute("SELECT id FROM users WHERE email=?", (email,), fetchone=True)
    if existing:
        return jsonify({"error": "Email already registered"}), 400
    
    pw_hash = hash_password(password)
    db_execute("INSERT INTO users (email,name,password_hash) VALUES (?,?,?)", (email, name, pw_hash))
    user = db_execute("SELECT id,email,name FROM users WHERE email=?", (email,), fetchone=True)
    token = create_session(user[0])
    
    return jsonify({"ok": True, "token": token, "user": {"id": user[0], "email": user[1], "name": user[2]}})


@app.route("/api/auth/login", methods=["POST", "OPTIONS"])
def api_login():
    if request.method == "OPTIONS": return jsonify({"ok": True}), 200
    data = request.get_json(silent=True) or {}
    email = (data.get("email", "") or "").strip().lower()
    password = data.get("password", "") or ""
    
    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400
    
    row = db_execute("SELECT id,email,name,password_hash FROM users WHERE email=?", (email,), fetchone=True)
    if not row:
        return jsonify({"error": "Invalid email or password"}), 401
    
    stored_hash = row[3]
    if stored_hash != hash_password(password):
        return jsonify({"error": "Invalid email or password"}), 401
    
    token = create_session(row[0])
    return jsonify({"ok": True, "token": token, "user": {"id": row[0], "email": row[1], "name": row[2]}})


@app.route("/api/auth/logout", methods=["POST", "OPTIONS"])
def api_logout():
    if request.method == "OPTIONS": return jsonify({"ok": True}), 200
    token = request.headers.get("X-Auth-Token") or request.cookies.get("srd_token")
    if token:
        db_execute("DELETE FROM sessions WHERE token=?", (token,))
    return jsonify({"ok": True})


@app.route("/api/auth/me", methods=["GET"])
def api_me():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify({"ok": True, "user": user})


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# DASHBOARD PAGE
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/dashboard")
def dashboard_page():
    """Premium user dashboard with hair profile, scores, and AI chat."""
    user = get_current_user()
    if not user:
        return redirect("/login")
    
    # Get hair profile
    profile = db_execute("SELECT * FROM hair_profiles WHERE user_id=?", (user["id"],), fetchone=True)
    profile_data = dict(profile) if profile else {}
    
    # Get subscription status
    sub = db_execute("SELECT status, plan FROM subscriptions WHERE user_id=?", (user["id"],), fetchone=True)
    is_premium = is_subscribed(user["id"])
    
    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard — SupportRD Hair Advisor</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@200;300;400;600&display=swap" rel="stylesheet">
<style>
:root {
  --brand-bg: #f0ebe8;
  --brand-text: #0d0906;
  --brand-accent: rgba(193,163,162,1);
  --brand-accent-lo: rgba(193,163,162,0.08);
  --brand-accent-mid: rgba(193,163,162,0.22);
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: radial-gradient(ellipse at 50% 60%, #e8e0da 0%, var(--brand-bg) 100%);
  color: var(--brand-text);
  font-family: 'Jost', sans-serif;
  font-weight: 300;
  min-height: 100vh;
}
.topbar {
  position: sticky; top: 0; z-index: 100;
  background: rgba(250,246,243,0.95);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(193,163,162,0.12);
  padding: 14px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo {
  font-family: 'Cormorant Garamond', serif;
  font-size: 22px;
  font-style: italic;
  color: var(--brand-accent);
  text-decoration: none;
}
.nav-links { display: flex; gap: 16px; align-items: center; }
.nav-link {
  padding: 8px 16px;
  border: 1px solid rgba(193,163,162,0.3);
  border-radius: 20px;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brand-accent);
  text-decoration: none;
  transition: all 0.3s;
}
.nav-link:hover { background: var(--brand-accent-lo); }
.nav-link.primary { background: var(--brand-accent); color: #fff; border-color: var(--brand-accent); }
.container { max-width: 1100px; margin: 0 auto; padding: 32px 24px 80px; }
.welcome-section { text-align: center; margin-bottom: 40px; }
.welcome-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 36px;
  font-weight: 300;
  margin-bottom: 8px;
}
.welcome-sub { color: rgba(0,0,0,0.45); font-size: 15px; }
.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
.card {
  background: #fff;
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  border: 1px solid rgba(193,163,162,0.1);
}
.card-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 20px;
  font-style: italic;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.card-icon { font-size: 24px; }
.score-display {
  text-align: center;
  padding: 24px 0;
}
.score-number {
  font-family: 'Cormorant Garamond', serif;
  font-size: 72px;
  font-weight: 300;
  color: var(--brand-accent);
  line-height: 1;
}
.score-label { font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(0,0,0,0.4); margin-top: 8px; }
.profile-item { padding: 10px 0; border-bottom: 1px solid rgba(193,163,162,0.1); }
.profile-item:last-child { border-bottom: none; }
.profile-label { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(0,0,0,0.4); }
.profile-value { font-size: 15px; margin-top: 4px; }
.btn {
  display: inline-block;
  padding: 12px 24px;
  background: linear-gradient(135deg, #c1a3a2, #9d7f6a);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.3s;
}
.btn:hover { opacity: 0.9; }
.btn-outline {
  background: transparent;
  color: var(--brand-accent);
  border: 1px solid var(--brand-accent);
}
.premium-banner {
  background: linear-gradient(135deg, rgba(193,163,162,0.15), rgba(157,127,106,0.1));
  border: 1px solid rgba(193,163,162,0.3);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  margin-top: 24px;
}
.premium-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; margin-bottom: 8px; }
.premium-desc { color: rgba(0,0,0,0.5); font-size: 14px; margin-bottom: 16px; }
.products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px; }
.product-card {
  background: rgba(250,246,243,0.6);
  border: 1px solid rgba(193,163,162,0.15);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s;
}
.product-card:hover { background: var(--brand-accent-lo); border-color: var(--brand-accent); }
.product-emoji { font-size: 28px; margin-bottom: 8px; }
.product-name { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
.product-price { font-size: 14px; color: var(--brand-accent); font-weight: 700; }
</style>
</head>
<body>
<div class="topbar">
  <a href="/" class="logo">Support RD</a>
  <div class="nav-links">
    <a href="/" class="nav-link">Home</a>
    <a href="/traffic" class="nav-link">Traffic</a>
    <a href="/revenue" class="nav-link">Revenue</a>
    <a href="#" class="nav-link" onclick="logout()">Sign Out</a>
  </div>
</div>

<div class="container">
  <div class="welcome-section">
    <h1 class="welcome-title">Welcome, <span id="userName">""" + user.get("name", "there") + """</span></h1>
    <p class="welcome-sub">Your personal hair care journey with Aria</p>
  </div>
  
  <div class="dashboard-grid">
    <div class="card">
      <div class="card-title"><span class="card-icon">📊</span> Hair Health Score</div>
      <div class="score-display">
        <div class="score-number" id="hairScore">—</div>
        <div class="score-label">Out of 100</div>
      </div>
      <a href="/quiz" class="btn btn-outline" style="width:100%;text-align:center;">Take Hair Quiz</a>
    </div>
    
    <div class="card">
      <div class="card-title"><span class="card-icon">👤</span> Hair Profile</div>
      <div id="profileData">
        <div class="profile-item">
          <div class="profile-label">Hair Type</div>
          <div class="profile-value">""" + (profile_data.get("hair_type") or "Not set") + """</div>
        </div>
        <div class="profile-item">
          <div class="profile-label">Main Concerns</div>
          <div class="profile-value">""" + (profile_data.get("hair_concerns") or "Not set") + """</div>
        </div>
        <div class="profile-item">
          <div class="profile-label">Current Treatments</div>
          <div class="profile-value">""" + (profile_data.get("treatments") or "Not set") + """</div>
        </div>
      </div>
      <a href="/profile" class="btn btn-outline" style="width:100%;text-align:center;margin-top:16px;">Edit Profile</a>
    </div>
    
    <div class="card">
      <div class="card-title"><span class="card-icon">💬</span> Chat with Aria</div>
      <p style="color:rgba(0,0,0,0.5);font-size:14px;margin-bottom:16px;">
        Get personalized hair advice from our AI specialist.
      </p>
      <a href="/" class="btn" style="width:100%;text-align:center;">Start Conversation</a>
    </div>
    
    <div class="card">
      <div class="card-title"><span class="card-icon">🧴</span> Recommended Products</div>
      <div class="products-grid">
        <a href="https://supportrd.com/products/formula-exclusiva" class="product-card" target="_blank">
          <div class="product-emoji">🌿</div>
          <div class="product-name">Formula Exclusiva</div>
          <div class="product-price">$55</div>
        </a>
        <a href="https://supportrd.com/products/gotero-rapido" class="product-card" target="_blank">
          <div class="product-emoji">💧</div>
          <div class="product-name">Gotero Rapido</div>
          <div class="product-price">$55</div>
        </a>
        <a href="https://supportrd.com/products/lsciador-conditioner" class="product-card" target="_blank">
          <div class="product-emoji">✨</div>
          <div class="product-name">Laciador Crece</div>
          <div class="product-price">$40</div>
        </a>
        <a href="https://supportrd.com/products/shampoo-aloe-vera" class="product-card" target="_blank">
          <div class="product-emoji">🌱</div>
          <div class="product-name">Shampoo Aloe</div>
          <div class="product-price">$20</div>
        </a>
      </div>
    </div>
  </div>
  
  """ + ("" if is_premium else """
  <div class="premium-banner">
    <div class="premium-title">Unlock Premium Features</div>
    <div class="premium-desc">Get unlimited Aria conversations, hair health tracking, and personalized routines.</div>
    <a href="https://supportrd.com/products/hair-advisor-premium" class="btn" target="_blank">Upgrade to Premium — $35/mo</a>
  </div>
  """) + """
</div>

<script>
const TOKEN = localStorage.getItem('srd_token') || '';
async function loadScore() {
  try {
    const res = await fetch('/api/hair/score', { headers: { 'X-Auth-Token': TOKEN } });
    const data = await res.json();
    if (data.score !== undefined) {
      document.getElementById('hairScore').textContent = data.score;
    }
  } catch(e) {}
}
loadScore();

function logout() {
  localStorage.removeItem('srd_token');
  document.cookie = 'srd_token=;path=/;max-age=0';
  fetch('/api/auth/logout', { method: 'POST', headers: { 'X-Auth-Token': TOKEN } });
  window.location.href = '/login';
}
</script>
</body>
</html>"""
    return Response(html, mimetype="text/html")


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# MAIN PAGE (ARIA SPHERE UI)
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/")
def index():
    """Main Aria AI interface."""
    user = get_current_user()
    user_name = user.get("name", "there") if user else ""
    
    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#c1a3a2">
<title>Aria — SupportRD Hair Advisor</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=Jost:wght@200;300;400&display=swap" rel="stylesheet">
<style>
:root {
  --brand-idle-r: 193; --brand-idle-g: 163; --brand-idle-b: 162;
  --brand-bg: #f0ebe8;
  --brand-text: #0d0906;
  --brand-accent: rgba(193,163,162,1);
  --brand-accent-lo: rgba(193,163,162,0.08);
  --brand-font-head: 'Cormorant Garamond', serif;
  --brand-font-body: 'Jost', sans-serif;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: radial-gradient(ellipse at 50% 60%, #e8e0da 0%, var(--brand-bg) 100%);
  color: var(--brand-text);
  font-family: var(--brand-font-body);
  font-weight: 300;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding-bottom: 24px;
}
#topBar {
  position: fixed; top: 0; left: 0; right: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 20px; z-index: 100;
  background: rgba(250,246,243,0.70);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(193,163,162,0.12);
}
.top-btn {
  background: rgba(0,0,0,0.05);
  color: rgba(0,0,0,0.55);
  border: 1px solid rgba(0,0,0,0.12);
  padding: 7px 16px;
  border-radius: 30px;
  font-size: 11px;
  font-family: var(--brand-font-body);
  cursor: pointer;
  transition: all 0.4s;
}
.top-btn:hover { background: var(--brand-accent-lo); color: var(--brand-accent); }
.nav-link {
  padding: 7px 14px;
  border: 1px solid rgba(193,163,162,0.45);
  border-radius: 20px;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #c1a3a2;
  text-decoration: none;
  transition: all 0.3s;
}
.nav-link:hover { background: rgba(193,163,162,0.12); color: #9d7f6a; }
.sphere-wrap { width: 300px; height: 300px; display: flex; align-items: center; justify-content: center; margin-top: 100px; }
#halo {
  width: 220px; height: 220px; border-radius: 50%; cursor: pointer;
  background: radial-gradient(circle at 40% 38%,
    rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.55) 0%,
    rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.18) 42%,
    rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.07) 70%,
    rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.01) 100%);
  box-shadow: 0 0 70px rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.45),
              0 0 150px rgba(var(--brand-idle-r),var(--brand-idle-g),var(--brand-idle-b),0.28);
  animation: idlePulse 3.2s ease-in-out infinite;
}
@keyframes idlePulse { 0%, 100% { transform: scale(1.00); } 50% { transform: scale(1.10); } }
#stateLabel { margin-top: 12px; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(0,0,0,0.30); }
#history { width: 420px; max-width: 92vw; max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
.msg { padding: 10px 16px; border-radius: 18px; font-size: 14px; line-height: 1.55; max-width: 88%; animation: fadeIn 0.4s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.msg.user { background: rgba(0,0,0,0.10); color: rgba(0,0,0,0.75); align-self: flex-end; border-bottom-right-radius: 4px; }
.msg.ai { background: rgba(193,163,162,0.20); color: rgba(0,0,0,0.85); align-self: flex-start; border-bottom-left-radius: 4px; font-family: var(--brand-font-head); font-style: italic; font-size: 15px; }
#manualBox { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 16px; width: 380px; max-width: 90vw; }
#manualInput { width: 100%; padding: 13px 20px; background: rgba(0,0,0,0.04); border: 1px solid rgba(0,0,0,0.14); border-radius: 30px; font-family: var(--brand-font-body); font-size: 14px; outline: none; }
#manualInput:focus { border-color: var(--brand-accent); }
#manualSubmit { padding: 10px 32px; background: var(--brand-accent); border: none; border-radius: 30px; color: #fff; font-family: var(--brand-font-body); font-size: 11px; font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; cursor: pointer; }
#response { margin-top: 14px; width: 420px; max-width: 92vw; text-align: center; font-family: var(--brand-font-head); font-size: 18px; color: rgba(0,0,0,0.65); min-height: 28px; font-style: italic; }
#footer { position: fixed; bottom: 22px; display: flex; gap: 36px; z-index: 10; }
#footer span { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(0,0,0,0.30); cursor: pointer; transition: color 0.4s; }
#footer span:hover { color: var(--brand-accent); }
</style>
</head>
<body>

<div id="topBar">
  <button id="modeToggle" class="top-btn">Manual Mode</button>
  <a href="/dashboard" class="nav-link" id="dashLink">Dashboard</a>
  <a href="/login" class="nav-link" id="authLink">Sign In</a>
</div>

<div class="sphere-wrap"><div id="halo" onclick="startListening()"></div></div>
<div id="stateLabel">Tap to begin</div>
<div id="history"></div>

<div id="manualBox" style="display:none;">
  <input id="manualInput" placeholder="Describe your hair concern or ask a follow-up…" />
  <button id="manualSubmit" onclick="sendManual()">Send</button>
</div>

<div id="response">Tap the sphere and describe your hair concern.</div>

<div id="footer">
  <span id="faqBtn" onclick="window.open('/faq','_blank')">FAQ</span>
  <span id="contactBtn" onclick="window.open('https://wa.me/18292332670','_blank')">Contact Us</span>
</div>

<script>
const TOKEN = localStorage.getItem('srd_token') || '';
let isManual = false;
let sessionId = 'sess_' + Math.random().toString(36).substr(2, 16);

document.getElementById('modeToggle').addEventListener('click', () => {
  isManual = !isManual;
  document.getElementById('manualBox').style.display = isManual ? 'flex' : 'none';
  document.getElementById('modeToggle').textContent = isManual ? 'Voice Mode' : 'Manual Mode';
});

document.getElementById('manualInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendManual();
});

async function startListening() {
  document.getElementById('stateLabel').textContent = 'Listening...';
  document.getElementById('halo').style.animation = 'none';
  
  // Simple prompt for now - could integrate Web Speech API
  const input = prompt('Describe your hair concern:');
  if (input) {
    await sendMessage(input);
  }
  document.getElementById('stateLabel').textContent = 'Tap to begin';
  document.getElementById('halo').style.animation = 'idlePulse 3.2s ease-in-out infinite';
}

async function sendManual() {
  const input = document.getElementById('manualInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  await sendMessage(msg);
}

async function sendMessage(msg) {
  const history = document.getElementById('history');
  
  // Add user message
  const userDiv = document.createElement('div');
  userDiv.className = 'msg user';
  userDiv.textContent = msg;
  history.appendChild(userDiv);
  
  // Add loading
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'msg ai';
  loadingDiv.textContent = '...';
  history.appendChild(loadingDiv);
  
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Auth-Token': TOKEN, 'X-Session-Id': sessionId },
      body: JSON.stringify({ message: msg, lang: 'en-US' })
    });
    const data = await res.json();
    
    loadingDiv.textContent = data.response || data.error || 'Sorry, I could not process that.';
    
    // Extract product recommendation if present
    if (data.product) {
      const productDiv = document.createElement('div');
      productDiv.innerHTML = `<div style="background:rgba(193,163,162,0.15);border:1px solid rgba(193,163,162,0.3);border-radius:12px;padding:14px;margin-top:8px;">
        <strong>${data.product.name}</strong><br>
        <span style="font-size:12px;color:rgba(0,0,0,0.5);">${data.product.tagline}</span><br>
        <span style="font-size:14px;color:#c1a3a2;font-weight:700;">${data.product.price}</span>
        <br><a href="${data.product.order_url}" target="_blank" style="display:inline-block;margin-top:8px;padding:6px 14px;background:#c1a3a2;color:#fff;border-radius:16px;text-decoration:none;font-size:11px;">Order Now</a>
      </div>`;
      history.appendChild(productDiv);
    }
    
    history.scrollTop = history.scrollHeight;
  } catch (err) {
    loadingDiv.textContent = 'Network error. Please try again.';
  }
}

// Check if logged in
if (TOKEN) {
  document.getElementById('authLink').textContent = 'Sign Out';
  document.getElementById('authLink').onclick = () => {
    localStorage.removeItem('srd_token');
    window.location.reload();
  };
}
</script>
</body>
</html>"""
    return Response(html, mimetype="text/html")


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# CHAT API
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/api/chat", methods=["POST", "OPTIONS"])
def api_chat():
    if request.method == "OPTIONS": return jsonify({"ok": True}), 200
    
    user = get_current_user()
    data = request.get_json(silent=True) or {}
    msg = data.get("message", "")
    lang = data.get("lang", "en-US")
    session_id = request.headers.get("X-Session-Id", "anonymous")
    
    if not msg:
        return jsonify({"error": "Message required"}), 400
    
    # Check usage limits for non-subscribers
    user_id = user["id"] if user else None
    
    # Call Claude API for response
    response_text = ""
    product = None
    
    if ANTHROPIC_API_KEY:
        try:
            import urllib.request
            payload = json.dumps({
                "model": "claude-sonnet-4-20250514",
                "max_tokens": 500,
                "system": SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": msg}]
            }).encode()
            req = urllib.request.Request(
                "https://api.anthropic.com/v1/messages",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                result = json.loads(resp.read().decode())
                response_text = result["content"][0]["text"]
                
                # Extract product tag
                import re
                match = re.search(r'\[PRODUCT:([^\]]+)\]', response_text)
                if match:
                    product_name = match.group(1)
                    if product_name in PRODUCT_CARDS:
                        product = PRODUCT_CARDS[product_name]
                    response_text = re.sub(r'\[PRODUCT:[^\]]+\]', '', response_text).strip()
        except Exception as e:
            response_text = f"I'd love to help with your hair concerns! For now, I recommend checking out our products at supportrd.com. (Error: {str(e)[:50]})"
    else:
        # Fallback responses when no API key
        msg_lower = msg.lower()
        if "damage" in msg_lower or "break" in msg_lower:
            response_text = "For damaged or breaking hair, Formula Exclusiva is exactly what you need. It's our professional all-in-one repair treatment that strengthens weak, thinning hair. You can request it at supportrd.com/pages/custom-order"
            product = PRODUCT_CARDS["Formula Exclusiva"]
        elif "loss" in msg_lower or "fall" in msg_lower or "growth" in msg_lower:
            response_text = "For hair loss and slow growth, Gotero Rapido is your best choice. This fast-acting scalp serum stimulates follicles and promotes healthy growth. You can request it at supportrd.com/pages/custom-order"
            product = PRODUCT_CARDS["Gotero Rapido"]
        elif "dry" in msg_lower or "frizz" in msg_lower:
            response_text = "For dry, frizzy hair, Laciador Crece is perfect. It restructures your hair for softness, shine, and healthy growth. You can request it at supportrd.com/pages/custom-order"
            product = PRODUCT_CARDS["Laciador Crece"]
        else:
            response_text = "I'm Aria, your hair care advisor! I'd love to help you find the perfect products for your hair. Tell me more about your concerns - are you dealing with damage, dryness, hair loss, or something else?"
    
    # Save chat history if logged in
    if user_id:
        db_execute("INSERT INTO chat_history (user_id,role,content) VALUES (?,?,?)", (user_id, "user", msg))
        db_execute("INSERT INTO chat_history (user_id,role,content) VALUES (?,?,?)", (user_id, "assistant", response_text))
    
    return jsonify({"ok": True, "response": response_text, "product": product})


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# HAIR PROFILE API
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/api/hair/profile", methods=["GET", "POST"])
def api_hair_profile():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    
    if request.method == "GET":
        row = db_execute("SELECT * FROM hair_profiles WHERE user_id=?", (user["id"],), fetchone=True)
        if not row:
            return jsonify({"ok": True, "profile": {}})
        return jsonify({"ok": True, "profile": dict(row)})
    
    data = request.get_json(silent=True) or {}
    db_execute("""INSERT INTO hair_profiles (user_id, hair_type, hair_concerns, treatments, products_tried)
        VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
        hair_type=excluded.hair_type, hair_concerns=excluded.hair_concerns,
        treatments=excluded.treatments, products_tried=excluded.products_tried""",
        (user["id"], data.get("hair_type",""), data.get("hair_concerns",""), data.get("treatments",""), data.get("products_tried","")))
    return jsonify({"ok": True})


@app.route("/api/hair/score", methods=["GET"])
def api_hair_score():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    
    row = db_execute("SELECT score FROM hair_score_history WHERE user_id=? ORDER BY ts DESC LIMIT 1", (user["id"],), fetchone=True)
    if row:
        return jsonify({"ok": True, "score": row[0]})
    return jsonify({"ok": True, "score": None})


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# TRAFFIC PAGE
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/traffic")
def traffic_page():
    user = get_current_user()
    if not user or not is_admin_user(user["id"]):
        return redirect("/login")
    
    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Traffic Growth — Support RD</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#07090d;--bg2:#0c0f16;--text:#eaedf5;--muted:#505870;--rose:#f0a090;--gold:#e0b050;--green:#30e890;--blue:#60a8ff;--pur:#c084fc;}
body{font-family:'Space Grotesk',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}
.topbar{position:sticky;top:0;z-index:100;background:rgba(7,9,13,0.95);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.07);padding:0 28px;height:56px;display:flex;align-items:center;justify-content:space-between;}
.logo{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--pur);}
.topbar a{color:var(--muted);text-decoration:none;font-size:12px;margin-left:20px;}
.wrap{max-width:1000px;margin:0 auto;padding:32px 24px 80px;}
.page-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;margin-bottom:6px;background:linear-gradient(135deg,#fff,var(--pur));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.page-sub{color:var(--muted);font-size:13px;margin-bottom:32px;}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:28px;}
.stat-card{background:var(--bg2);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:16px 18px;}
.stat-num{font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:800;}
.stat-lbl{font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-top:5px;}
.section{background:var(--bg2);border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:24px 26px;margin-bottom:20px;}
.section-title{font-family:'Syne',sans-serif;font-size:15px;font-weight:800;margin-bottom:18px;}
.channel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
.channel-card{background:#11151f;border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:18px;}
.channel-icon{font-size:26px;margin-bottom:8px;}
.channel-name{font-weight:700;font-size:13px;margin-bottom:5px;}
.channel-desc{font-size:11px;color:var(--muted);line-height:1.6;margin-bottom:12px;}
.channel-btn{display:inline-block;padding:8px 16px;border-radius:16px;font-size:11px;font-weight:700;text-decoration:none;letter-spacing:0.04em;}
</style>
</head>
<body>
<div class="topbar">
  <div class="logo">Traffic Growth</div>
  <div>
    <a href="/dashboard">Dashboard</a>
    <a href="/revenue" style="color:var(--green)">Revenue</a>
    <a href="/blog/write" style="color:var(--pur)">Write Post</a>
  </div>
</div>
<div class="wrap">
  <div class="page-title">Traffic Growth Center</div>
  <div class="page-sub">Every channel that brings people to aria.supportrd.com and supportrd.com.</div>
  
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-num" style="color:var(--pur);" id="t-posts">-</div><div class="stat-lbl">Published Posts</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--blue);" id="t-views">-</div><div class="stat-lbl">Total Views</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--green);" id="t-users">-</div><div class="stat-lbl">Users</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--gold);" id="t-new">-</div><div class="stat-lbl">New This Week</div></div>
  </div>
  
  <div class="section">
    <div class="section-title">Traffic Channels</div>
    <div class="channel-grid">
      <div class="channel-card"><div class="channel-icon">📱</div><div class="channel-name">Instagram Bio</div><div class="channel-desc">Put aria.supportrd.com in your Instagram bio.</div><a class="channel-btn" style="background:rgba(192,132,252,0.15);color:var(--pur);" onclick="navigator.clipboard.writeText('aria.supportrd.com')">Copy Link</a></div>
      <div class="channel-card"><div class="channel-icon">🎵</div><div class="channel-name">TikTok</div><div class="channel-desc">TikTok hair content goes viral. Put your link in bio.</div><a class="channel-btn" style="background:rgba(96,168,255,0.12);color:var(--blue);" href="https://tiktok.com" target="_blank">Open TikTok</a></div>
      <div class="channel-card"><div class="channel-icon">💬</div><div class="channel-name">WhatsApp</div><div class="channel-desc">Share your store link with contacts.</div><a class="channel-btn" style="background:rgba(37,211,102,0.12);color:#25d366;" href="https://wa.me/?text=Check+out+Support+RD+https://supportrd.com" target="_blank">Share Now</a></div>
      <div class="channel-card"><div class="channel-icon">📌</div><div class="channel-name">Pinterest</div><div class="channel-desc">Hair pins live for years and drive traffic.</div><a class="channel-btn" style="background:rgba(230,0,35,0.1);color:#e86070;" href="https://pinterest.com/pin/create/button/?url=https://aria.supportrd.com" target="_blank">Pin Now</a></div>
      <div class="channel-card"><div class="channel-icon">🔍</div><div class="channel-name">Google Search</div><div class="channel-desc">Submit your sitemap to get indexed.</div><a class="channel-btn" style="background:rgba(224,176,80,0.12);color:var(--gold);" href="https://search.google.com/search-console" target="_blank">Search Console</a></div>
      <div class="channel-card"><div class="channel-icon">👥</div><div class="channel-name">Facebook Groups</div><div class="channel-desc">Share blog posts in hair care groups.</div><a class="channel-btn" style="background:rgba(66,103,178,0.12);color:#6090e8;" href="https://facebook.com/groups/search/?q=natural+hair" target="_blank">Find Groups</a></div>
    </div>
  </div>
</div>
<script>
const TOKEN = localStorage.getItem('srd_token')||'';
fetch('/api/revenue/stats',{headers:{'X-Auth-Token':TOKEN}})
  .then(r=>r.json()).then(d=>{
    document.getElementById('t-users').textContent=d.total_users||0;
    document.getElementById('t-new').textContent=d.new_users_7d||0;
  }).catch(()=>{});
fetch('/api/blog/stats',{headers:{'X-Auth-Token':TOKEN}})
  .then(r=>r.json()).then(d=>{
    document.getElementById('t-posts').textContent=d.total_posts||0;
    document.getElementById('t-views').textContent=d.total_views||0;
  }).catch(()=>{});
</script>
</body>
</html>"""
    return Response(html, mimetype="text/html")


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# REVENUE PAGE
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/revenue")
def revenue_page():
    user = get_current_user()
    if not user or not is_admin_user(user["id"]):
        return redirect("/login")
    
    html = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Revenue Engine — Support RD</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#07090d;--bg2:#0c0f16;--text:#eaedf5;--muted:#505870;--rose:#f0a090;--gold:#e0b050;--green:#30e890;--blue:#60a8ff;}
body{font-family:'Space Grotesk',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}
.topbar{position:sticky;top:0;z-index:100;background:rgba(7,9,13,0.95);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,0.07);padding:0 28px;height:56px;display:flex;align-items:center;justify-content:space-between;}
.logo{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;color:var(--green);}
.topbar a{color:var(--muted);text-decoration:none;font-size:12px;margin-left:20px;}
.wrap{max-width:1100px;margin:0 auto;padding:32px 24px 80px;}
.page-title{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;margin-bottom:6px;background:linear-gradient(135deg,#fff,var(--green));-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
.page-sub{color:var(--muted);font-size:13px;margin-bottom:32px;}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;margin-bottom:32px;}
.stat-card{background:var(--bg2);border:1px solid rgba(255,255,255,0.12);border-radius:14px;padding:18px 20px;}
.stat-num{font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;line-height:1;}
.stat-lbl{font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:var(--muted);margin-top:6px;}
.section{background:var(--bg2);border:1px solid rgba(255,255,255,0.12);border-radius:18px;padding:28px;margin-bottom:20px;}
.section-title{font-family:'Syne',sans-serif;font-size:16px;font-weight:800;margin-bottom:16px;}
.products-table{width:100%;border-collapse:collapse;}
.products-table td{padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.07);}
.products-table tr:last-child td{border:none;}
.prod-name{font-weight:600;}
.prod-price{font-family:'Syne',sans-serif;color:var(--gold);}
.prod-link{color:var(--green);text-decoration:none;font-size:12px;}
.prod-link:hover{text-decoration:underline;}
</style>
</head>
<body>
<div class="topbar">
  <div class="logo">Revenue Engine</div>
  <div>
    <a href="/dashboard">Dashboard</a>
    <a href="/traffic">Traffic</a>
    <a href="https://admin.shopify.com/store/supportdr-com/orders" target="_blank" style="color:var(--gold)">Orders</a>
  </div>
</div>
<div class="wrap">
  <div class="page-title">Revenue Command Center</div>
  <div class="page-sub">Track your Shopify balance and grow your revenue.</div>
  
  <div class="stat-grid">
    <div class="stat-card"><div class="stat-num" style="color:var(--rose);" id="s-users">-</div><div class="stat-lbl">Registered Users</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--green);" id="s-premium">-</div><div class="stat-lbl">Premium</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--gold);" id="s-engaged">-</div><div class="stat-lbl">With Profiles</div></div>
    <div class="stat-card"><div class="stat-num" style="color:var(--blue);" id="s-sessions">-</div><div class="stat-lbl">Aria Sessions</div></div>
  </div>
  
  <div class="section">
    <div class="section-title">Product Links</div>
    <table class="products-table">
      <tr><td class="prod-name">Formula Exclusiva</td><td class="prod-price">$55</td><td><a class="prod-link" href="https://supportrd.com/products/formula-exclusiva" target="_blank">View →</a></td></tr>
      <tr><td class="prod-name">Laciador Crece</td><td class="prod-price">$40</td><td><a class="prod-link" href="https://supportrd.com/products/lsciador-conditioner" target="_blank">View →</a></td></tr>
      <tr><td class="prod-name">Gotero Rapido</td><td class="prod-price">$55</td><td><a class="prod-link" href="https://supportrd.com/products/gotero-rapido" target="_blank">View →</a></td></tr>
      <tr><td class="prod-name">Gotitas Brillantes</td><td class="prod-price">$30</td><td><a class="prod-link" href="https://supportrd.com/products/gotitas-brillantes" target="_blank">View →</a></td></tr>
      <tr><td class="prod-name">Mascarilla Natural</td><td class="prod-price">$25</td><td><a class="prod-link" href="https://supportrd.com/products/mascarilla-avocado" target="_blank">View →</a></td></tr>
      <tr><td class="prod-name">Shampoo Aloe & Romero</td><td class="prod-price">$20</td><td><a class="prod-link" href="https://supportrd.com/products/shampoo-aloe-vera" target="_blank">View →</a></td></tr>
      <tr><td class="prod-name">Premium Subscription</td><td class="prod-price">$35/mo</td><td><a class="prod-link" href="https://supportrd.com/products/hair-advisor-premium" target="_blank">View →</a></td></tr>
    </table>
  </div>
</div>
<script>
const TOKEN = localStorage.getItem('srd_token')||'';
fetch('/api/revenue/stats',{headers:{'X-Auth-Token':TOKEN}})
  .then(r=>r.json()).then(d=>{
    document.getElementById('s-users').textContent=d.total_users||0;
    document.getElementById('s-premium').textContent=d.premium_users||0;
    document.getElementById('s-engaged').textContent=d.engaged_users||0;
    document.getElementById('s-sessions').textContent=d.total_sessions||0;
  }).catch(()=>{});
</script>
</body>
</html>"""
    return Response(html, mimetype="text/html")


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# REVENUE STATS API
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/api/revenue/stats", methods=["GET"])
def api_revenue_stats():
    user = get_current_user()
    if not user or not is_admin_user(user["id"]):
        return jsonify({"error": "Unauthorized"}), 401
    
    total_users = db_execute("SELECT COUNT(*) FROM users", fetchone=True)[0]
    premium_users = db_execute("SELECT COUNT(*) FROM subscriptions WHERE status='active'", fetchone=True)[0]
    engaged_users = db_execute("SELECT COUNT(*) FROM hair_profiles", fetchone=True)[0]
    total_sessions = db_execute("SELECT COALESCE(SUM(count),0) FROM session_usage", fetchone=True)[0]
    
    week_start = (datetime.date.today() - datetime.timedelta(days=datetime.date.today().weekday())).isoformat()
    new_users_7d = db_execute("SELECT COUNT(*) FROM users WHERE created_at >= ?", (week_start,), fetchone=True)[0]
    
    return jsonify({
        "total_users": total_users,
        "premium_users": premium_users,
        "engaged_users": engaged_users,
        "total_sessions": total_sessions,
        "new_users_7d": new_users_7d
    })


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# BLOG STATS API
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/api/blog/stats", methods=["GET"])
def api_blog_stats():
    user = get_current_user()
    if not user:
        return jsonify({"error": "Unauthorized"}), 401
    
    total_posts = db_execute("SELECT COUNT(*) FROM blog_posts WHERE status='published'", fetchone=True)[0]
    total_views = db_execute("SELECT COALESCE(SUM(views),0) FROM blog_posts", fetchone=True)[0]
    
    return jsonify({"total_posts": total_posts, "total_views": total_views})


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# SEO & SITEMAP
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.route("/robots.txt")
def robots_txt():
    return Response("User-agent: *\nAllow: /\nSitemap: https://aria.supportrd.com/sitemap.xml", mimetype="text/plain")

@app.route("/sitemap.xml")
def sitemap_xml():
    posts = db_execute("SELECT slug,updated_at FROM blog_posts WHERE status='published'", fetchall=True) or []
    urls = [
        '<url><loc>https://aria.supportrd.com/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>',
        '<url><loc>https://aria.supportrd.com/login</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>',
        '<url><loc>https://aria.supportrd.com/dashboard</loc><changefreq>daily</changefreq><priority>0.8</priority></url>',
    ]
    for post in posts:
        slug = post[0] if isinstance(post, (list, tuple)) else post["slug"]
        urls.append(f'<url><loc>https://aria.supportrd.com/blog/{slug}</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>')
    return Response(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{"".join(urls)}\n</urlset>', mimetype="application/xml")

@app.route("/manifest.json")
def manifest_json():
    return jsonify({
        "name": "SupportRD Hair Advisor",
        "short_name": "Aria",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#f0ebe8",
        "theme_color": "#c1a3a2",
        "icons": [{"src": "https://cdn.shopify.com/s/files/1/0593/2715/2208/files/output-onlinepngtools_1.png", "sizes": "192x192", "type": "image/png"}]
    })


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# CORS & SECURITY HEADERS
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

@app.after_request
def after_request(response):
    origin = request.headers.get('Origin', '')
    allowed_origins = [
        'https://aria.supportrd.com', 'https://supportrd.com', 'https://www.supportrd.com',
        os.environ.get('APP_BASE_URL', ''), 'http://localhost:5000', 'http://127.0.0.1:5000'
    ]
    
    if origin in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    else:
        response.headers['Access-Control-Allow-Origin'] = '*'
    
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS,PATCH'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,X-Auth-Token,Authorization,X-Session-Id'
    response.headers['Access-Control-Max-Age'] = '86400'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    if request.is_secure or request.headers.get('X-Forwarded-Proto') == 'https':
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    
    if request.method == 'OPTIONS':
        response.status_code = 204
    
    return response


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# CONTENT ENGINE INTEGRATION
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

try:
    from engine_routes import register_engine_routes as _reg_eng
    _reg_eng(app)
    print("[engine_routes] ✓ registered")
except Exception as _e:
    print(f"[engine_routes] skipped: {_e}")


# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
# RUN SERVER
# ═════════════════════════════════════════════════════════════════════════════════════════════════════════════

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
