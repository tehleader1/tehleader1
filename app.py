import os
import sqlite3
import secrets
from datetime import datetime
from flask import Flask, request, jsonify, session
from werkzeug.middleware.proxy_fix import ProxyFix

# ---------------------------------------------------
# APP SETUP
# ---------------------------------------------------

app = Flask(__name__)

app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY", secrets.token_hex(32)
)

ADMIN_KEY = os.environ.get("ADMIN_KEY", "supportrd_admin")

DATA_DIR = "/data" if os.path.isdir("/data") else os.getcwd()
DB_PATH = os.path.join(DATA_DIR, "supportrd.db")

# ---------------------------------------------------
# DATABASE
# ---------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()

    conn.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        created_at TEXT
    )
    """)

    conn.execute("""
    CREATE TABLE IF NOT EXISTS events(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        created_at TEXT
    )
    """)

    conn.commit()
    conn.close()


init_db()

# ---------------------------------------------------
# AUTH
# ---------------------------------------------------

@app.route("/api/login", methods=["POST"])
def login():

    data = request.json

    email = data.get("email")
    password = data.get("password")

    conn = get_db()

    user = conn.execute(
        "SELECT * FROM users WHERE email=? AND password=?",
        (email, password)
    ).fetchone()

    conn.close()

    if not user:
        return jsonify({"error": "invalid login"}), 401

    session["user"] = user["email"]

    return jsonify({"status": "ok"})


@app.route("/api/logout")
def logout():

    session.clear()

    return jsonify({"status": "logged_out"})


# ---------------------------------------------------
# ADMIN AUTH
# ---------------------------------------------------

def require_admin():

    header = request.headers.get("X-Admin-Key")

    if header == ADMIN_KEY:
        return True

    data = request.get_json(silent=True) or {}

    if data.get("admin_key") == ADMIN_KEY:
        return True

    return False


# ---------------------------------------------------
# DASHBOARD STATS
# ---------------------------------------------------

@app.route("/api/dashboard")
def dashboard_data():

    conn = get_db()

    users = conn.execute("SELECT COUNT(*) as c FROM users").fetchone()["c"]
    events = conn.execute("SELECT COUNT(*) as c FROM events").fetchone()["c"]

    conn.close()

    return jsonify({
        "users": users,
        "events": events,
        "time": datetime.utcnow().isoformat()
    })


# ---------------------------------------------------
# HAIR SCANNER
# ---------------------------------------------------

@app.route("/api/hair-scan", methods=["POST"])
def hair_scan():

    data = request.json

    dryness = data.get("dryness", 0)
    breakage = data.get("breakage", 0)
    oil = data.get("oil", 0)

    score = dryness + breakage + oil

    if score < 4:
        result = "Healthy hair"
    elif score < 8:
        result = "Needs moisture"
    else:
        result = "Damage detected"

    return jsonify({
        "result": result,
        "score": score
    })


# ---------------------------------------------------
# ARIA AI CHAT
# ---------------------------------------------------

@app.route("/api/aria/chat", methods=["POST"])
def aria_chat():

    data = request.json
    message = data.get("message")

    if not message:
        return jsonify({"error": "missing message"}), 400

    try:

        import anthropic

        client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )

        msg = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=800,
            messages=[
                {"role": "user", "content": message}
            ]
        )

        reply = msg.content[0].text

    except Exception:

        reply = "Aria is temporarily unavailable."

    return jsonify({
        "reply": reply
    })


# ---------------------------------------------------
# CONTENT ENGINE
# ---------------------------------------------------

@app.route("/api/content/run", methods=["POST"])
def run_content_engine():

    if not require_admin():
        return jsonify({"error": "unauthorized"}), 403

    try:

        from content_engine import run_engine

        result = run_engine()

        return jsonify({
            "status": "ok",
            "result": result
        })

    except Exception as e:

        return jsonify({
            "status": "error",
            "message": str(e)
        })


# ---------------------------------------------------
# ENGINE ROUTES
# ---------------------------------------------------

try:

    from engine_routes import register_engine_routes

    register_engine_routes(app)

except Exception as e:

    print("Engine routes not loaded:", e)


# ---------------------------------------------------
# HEALTH
# ---------------------------------------------------

@app.route("/health")
def health():

    return jsonify({
        "status": "ok",
        "time": datetime.utcnow().isoformat()
    })


# ---------------------------------------------------
# START SERVER
# ---------------------------------------------------

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
