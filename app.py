import os
import logging
import threading
import time
from datetime import datetime

from flask import Flask, jsonify, render_template, redirect
from flask_sqlalchemy import SQLAlchemy
from engine_routes import register_engine_routes

# ----------------------
# APP SETUP
# ----------------------
app = Flask(__name__, template_folder="templates", static_folder="static")
logging.basicConfig(level=logging.INFO)

# ----------------------
# DATABASE CONFIG
# ----------------------
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable not set")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db = SQLAlchemy(app)

# ----------------------
# DATABASE MODELS
# ----------------------
class Keyword(db.Model):
    __tablename__ = "keywords"
    id = db.Column(db.Integer, primary_key=True)
    phrase = db.Column(db.String(255), unique=True)
    language = db.Column(db.String(10))
    score = db.Column(db.Integer)
    covered = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class BlogPost(db.Model):
    __tablename__ = "blog_posts"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255))
    keyword = db.Column(db.String(255))
    language = db.Column(db.String(10))
    shopify_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# ----------------------
# DATABASE INIT
# ----------------------
def init_database():
    with app.app_context():
        db.create_all()
        logging.info("Database tables initialized")

# ----------------------
# KEYWORD DISCOVERY ENGINE
# ----------------------
SEED_KEYWORDS = [
    "hair growth tips",
    "repair damaged hair",
    "stop hair breakage",
    "curly hair routine",
    "scalp health",
    "hair hydration tips",
    "hair strengthening routine"
]

def discover_keywords():
    with app.app_context():
        logging.info("Running keyword discovery")
        for seed in SEED_KEYWORDS:
            for i in range(5):
                phrase = f"{seed} {i+1}"
                exists = Keyword.query.filter_by(phrase=phrase).first()
                if not exists:
                    kw = Keyword(phrase=phrase, language="en", score=50)
                    db.session.add(kw)
        db.session.commit()
        logging.info("Keyword discovery complete")

# ----------------------
# AUTOMATION LOOP
# ----------------------
def automation_loop():
    while True:
        try:
            discover_keywords()
        except Exception as e:
            logging.error(e)
        time.sleep(21600)  # 6 hours

def start_scheduler():
    t = threading.Thread(target=automation_loop)
    t.daemon = True
    t.start()
    logging.info("Automation scheduler started")

# ----------------------
# ROUTES
# ----------------------
@app.route("/")
def root():
    return redirect("/login")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/analytics")
def analytics():
    blogs = BlogPost.query.count()
    keywords = Keyword.query.count()
    return jsonify({"blogs": blogs, "keywords": keywords})

@app.route("/system/metrics")
def metrics():
    import psutil
    return jsonify({
        "cpu": psutil.cpu_percent(),
        "memory": psutil.virtual_memory().percent,
        "disk": psutil.disk_usage('/').percent
    })

@app.route("/api/ping")
def ping():
    return jsonify({"status": "ok"})

# ----------------------
# REGISTER ENGINE ROUTES
# ----------------------
register_engine_routes(app)

# ----------------------
# ERROR HANDLER
# ----------------------
@app.errorhandler(Exception)
def handle_exception(e):
    logging.error(str(e))
    return jsonify({"error": str(e)}), 500

# ----------------------
# APP STARTUP
# ----------------------
if __name__ == "__main__":
    init_database()
    start_scheduler()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
