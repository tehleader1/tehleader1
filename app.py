import os
import sqlite3
import secrets
from datetime import datetime
from flask import Flask, request, jsonify, session, render_template, redirect, url_for
from werkzeug.middleware.proxy_fix import ProxyFix

# ---------------------------------------------------
# APP SETUP
# ---------------------------------------------------

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))

ADMIN_KEY = os.environ.get("ADMIN_KEY", "supportrd_admin")

DB_PATH = "supportrd.db"


# ---------------------------------------------------
# DATABASE
# ---------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():

    conn = get_db()

    conn.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT,
        created_at TEXT
    )
    """)

    conn.commit()
    conn.close()


init_db()


# ---------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------

@app.route("/api/ping")
def ping():
    return {"status": "ok"}


@app.route("/health")
def health():
    return {
        "status": "running",
        "time": datetime.utcnow().isoformat()
    }


# ---------------------------------------------------
# PAGES
# ---------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/dashboard")
def dashboard():

    if "user" not in session:
        return redirect(url_for("index"))

    return render_template("dashboard.html", user=session["user"])


# ---------------------------------------------------
# AUTH
# ---------------------------------------------------

@app.route("/api/login", methods=["POST"])
def login():

    data = request.json

    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    conn = get_db()

    user = conn.execute(
        "SELECT * FROM users WHERE username=?",
        (username,)
    ).fetchone()

    # If user does not exist, create one
    if not user:

        conn.execute(
            "INSERT INTO users(username,email,password,created_at) VALUES(?,?,?,?)",
            (username, email, password, datetime.utcnow().isoformat())
        )

        conn.commit()

    conn.close()

    session["user"] = username

    return jsonify({
        "status": "success",
        "redirect": "/dashboard"
    })


@app.route("/api/logout")
def logout():

    session.clear()

    return redirect("/")


# ---------------------------------------------------
# DASHBOARD DATA
# ---------------------------------------------------

@app.route("/api/dashboard")
def dashboard_data():

    conn = get_db()

    users = conn.execute(
        "SELECT COUNT(*) as count FROM users"
    ).fetchone()["count"]

    conn.close()

    return jsonify({
        "users": users,
        "time": datetime.utcnow().isoformat()
    })


# ---------------------------------------------------
# HAIR SCAN
# ---------------------------------------------------

@app.route("/api/hair-scan", methods=["POST"])
def hair_scan():

    data = request.json

    dryness = int(data.get("dryness", 0))
    breakage = int(data.get("breakage", 0))
    oil = int(data.get("oil", 0))

    score = dryness + breakage + oil

    if score < 4:
        diagnosis = "Healthy hair"
    elif score < 8:
        diagnosis = "Needs hydration"
    else:
        diagnosis = "Hair damage detected"

    return jsonify({
        "score": score,
        "diagnosis": diagnosis
    })


# ---------------------------------------------------
# ARIA AI
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

        response = client.messages.create(
            model="claude-3-haiku-20240307",
            max_tokens=500,
            messages=[
                {"role": "user", "content": message}
            ]
        )

        reply = response.content[0].text

    except Exception as e:

        print("AI error:", e)

        reply = "Aria AI is temporarily unavailable."

    return jsonify({"reply": reply})


# ---------------------------------------------------
# CONTENT ENGINE
# ---------------------------------------------------

run_engine = None

try:
    from content_engine import run_engine
    print("Content engine loaded")
except Exception as e:
    print("Content engine not loaded:", e)


@app.route("/api/content/run", methods=["POST"])
def run_content():

    if run_engine is None:
        return jsonify({"error": "engine unavailable"}), 500

    result = run_engine()

    return jsonify({
        "status": "ok",
        "result": result
    })


# ---------------------------------------------------
# ENGINE ROUTES
# ---------------------------------------------------

try:
    from engine_routes import register_engine_routes
    register_engine_routes(app)
    print("Engine routes loaded")
except Exception as e:
    print("Engine routes not loaded:", e)


# ---------------------------------------------------
# START
# ---------------------------------------------------

if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port
    )
