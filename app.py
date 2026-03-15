import os
import json
import sqlite3
import threading
import secrets
from datetime import datetime

from flask import (
    Flask,
    request,
    jsonify,
    render_template,
    redirect,
    url_for,
    session,
)
from werkzeug.middleware.proxy_fix import ProxyFix

# ─────────────────────────────────────────────
# APP INIT
# ─────────────────────────────────────────────

app = Flask(__name__)

app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY", secrets.token_hex(32)
)

app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)

ADMIN_KEY = os.environ.get("ADMIN_KEY", "srd_admin_2024")

# ─────────────────────────────────────────────
# STORAGE PATHS
# ─────────────────────────────────────────────

DATA_DIR = "/data" if os.path.isdir("/data") else os.getcwd()

AUTH_DB = os.path.join(DATA_DIR, "users.db")

db_lock = threading.Lock()

# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────


def get_db():
    con = sqlite3.connect(AUTH_DB, timeout=60, check_same_thread=False)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA busy_timeout=60000")
    return con


def init_db():
    with db_lock:
        con = get_db()

        con.execute(
            """
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE,
            password TEXT,
            created_at TEXT
        )
        """
        )

        con.commit()
        con.close()


init_db()

# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────


@app.route("/api/login", methods=["POST"])
def login():

    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    con = get_db()

    row = con.execute(
        "SELECT * FROM users WHERE email=? AND password=?",
        (email, password),
    ).fetchone()

    con.close()

    if not row:
        return jsonify({"error": "Invalid credentials"}), 401

    session["user"] = row["email"]

    return jsonify({"ok": True})


@app.route("/api/logout")
def logout():
    session.clear()
    return redirect("/")


# ─────────────────────────────────────────────
# ADMIN AUTH
# ─────────────────────────────────────────────


def require_admin(req):

    header = req.headers.get("X-Admin-Key")

    if header == ADMIN_KEY:
        return True

    data = req.get_json(silent=True) or {}

    if data.get("admin_key") == ADMIN_KEY:
        return True

    if req.args.get("admin_key") == ADMIN_KEY:
        return True

    return False


# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────


@app.route("/dashboard")
def dashboard():

    if "user" not in session:
        return redirect("/")

    return render_template("dashboard.html")


# ─────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────


@app.route("/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "time": datetime.utcnow().isoformat(),
        }
    )


# ─────────────────────────────────────────────
# ARIA AI API
# ─────────────────────────────────────────────


@app.route("/api/aria/chat", methods=["POST"])
def aria_chat():

    data = request.get_json()

    prompt = data.get("message", "")

    if not prompt:
        return jsonify({"error": "Missing message"}), 400

    try:
        import anthropic

        client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )

        msg = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=800,
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
        )

        response = msg.content[0].text

    except Exception as e:

        response = "AI temporarily unavailable."

    return jsonify({"reply": response})


# ─────────────────────────────────────────────
# HAIR ANALYZER
# ─────────────────────────────────────────────


@app.route("/api/hair-scan", methods=["POST"])
def hair_scan():

    data = request.get_json()

    answers = data.get("answers", {})

    dryness = answers.get("dryness", 0)
    breakage = answers.get("breakage", 0)

    score = dryness + breakage

    if score < 4:
        result = "Healthy hair"
    elif score < 8:
        result = "Needs moisture"
    else:
        result = "Severe damage detected"

    return jsonify(
        {
            "result": result,
            "score": score,
        }
    )


# ─────────────────────────────────────────────
# CONTENT ENGINE ROUTES
# ─────────────────────────────────────────────

try:

    from engine_routes import register_engine_routes

    register_engine_routes(app)

except Exception as e:

    print("Content engine not loaded:", e)


# ─────────────────────────────────────────────
# STATIC PAGES
# ─────────────────────────────────────────────


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/aria")
def aria():
    return render_template("aria.html")


@app.route("/scan")
def scan():
    return render_template("scan.html")


# ─────────────────────────────────────────────
# START
# ─────────────────────────────────────────────

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False,
    )
