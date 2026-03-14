import os
import asyncio
import logging
import random
from datetime import datetime

from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy

from engine_routes import register_engine_routes


# --------------------------------------------------
# APP SETUP
# --------------------------------------------------

app = Flask(__name__)

logging.basicConfig(level=logging.INFO)

# --------------------------------------------------
# DATABASE CONFIG
# --------------------------------------------------

DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

# --------------------------------------------------
# DATABASE MODELS
# --------------------------------------------------

class Keyword(db.Model):

    __tablename__ = "keywords"

    id = db.Column(db.Integer, primary_key=True)

    phrase = db.Column(db.String(255))

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


# --------------------------------------------------
# INITIALIZE DATABASE
# --------------------------------------------------

@app.before_first_request
def create_tables():

    db.create_all()

    logging.info("Database tables ready")


# --------------------------------------------------
# KEYWORD DISCOVERY ENGINE
# --------------------------------------------------

SEED_KEYWORDS = [
    "hair growth tips",
    "how to repair damaged hair",
    "natural hair care routine",
    "best shampoo for dry hair",
    "how to stop hair breakage",
    "how to grow hair faster",
    "curly hair routine",
    "scalp health tips",
    "hair care routine for frizz",
]

LANGUAGES = ["en", "es", "fr", "pt"]


def discover_keywords():

    logging.info("Running keyword discovery")

    for seed in SEED_KEYWORDS:

        for i in range(10):

            phrase = f"{seed} {i+1}"

            exists = Keyword.query.filter_by(phrase=phrase).first()

            if not exists:

                kw = Keyword(

                    phrase=phrase,

                    language=random.choice(LANGUAGES),

                    score=random.randint(1, 100),

                )

                db.session.add(kw)

    db.session.commit()

    logging.info("Keyword discovery completed")


# --------------------------------------------------
# AUTOMATION SCHEDULER
# --------------------------------------------------

def automation_loop():

    import time

    while True:

        try:

            discover_keywords()

            logging.info("Automation cycle complete")

        except Exception as e:

            logging.error(e)

        time.sleep(21600)


def start_scheduler():

    import threading

    t = threading.Thread(target=automation_loop)

    t.daemon = True

    t.start()

    logging.info("Automation scheduler started")


# --------------------------------------------------
# DASHBOARD API
# --------------------------------------------------

@app.route("/dashboard")

async def dashboard():

    return jsonify({

        "system": "AI Command Center",

        "status": "online",

        "time": datetime.utcnow(),

        "engines": [

            "keyword_discovery",

            "content_engine",

            "seo_engine"

        ]

    })


# --------------------------------------------------
# ANALYTICS
# --------------------------------------------------

@app.route("/analytics")

def analytics():

    blog_count = BlogPost.query.count()

    keyword_count = Keyword.query.count()

    return jsonify({

        "total_blogs": blog_count,

        "keywords_discovered": keyword_count

    })


# --------------------------------------------------
# SYSTEM METRICS
# --------------------------------------------------

@app.route("/system/metrics")

def system_metrics():

    import psutil

    return jsonify({

        "cpu": psutil.cpu_percent(),

        "memory": psutil.virtual_memory().percent,

        "disk": psutil.disk_usage('/').percent

    })


# --------------------------------------------------
# TEST DATA
# --------------------------------------------------

@app.route("/dashboard/data")

async def dashboard_data():

    await asyncio.sleep(1)

    return jsonify([

        "AI Content Engine Ready",

        "Keyword Discovery Running",

        "SEO Automation Active"

    ])


# --------------------------------------------------
# REGISTER CONTENT ENGINE ROUTES
# --------------------------------------------------

register_engine_routes(app)


# --------------------------------------------------
# ERROR HANDLER
# --------------------------------------------------

@app.errorhandler(Exception)

def handle_exception(e):

    logging.error(str(e))

    return jsonify({"error": str(e)}), 500


# --------------------------------------------------
# START SERVER
# --------------------------------------------------

if __name__ == "__main__":

    start_scheduler()

    app.run(host="0.0.0.0", port=10000)
