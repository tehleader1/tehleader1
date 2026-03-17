from flask import Flask, jsonify, request, send_from_directory, Response
import os
import requests
import time
from apscheduler.schedulers.background import BackgroundScheduler
from openai import OpenAI

app = Flask(__name__, static_folder="static")

#################################################
# API KEYS
#################################################

OPENAI_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_KEY)

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE", "")
SHOPIFY_STOREFRONT_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_TOKEN", "")

#################################################
# CACHE SYSTEM
#################################################

PRODUCT_CACHE = []
PRODUCT_CACHE_TIME = 0
CACHE_TTL = 300

#################################################
# HEALTH CHECK
#################################################

@app.route("/api/ping")
def ping():
    return {"status": "ok"}

#################################################
# SHOPIFY PRODUCTS
#################################################

def get_products():

    global PRODUCT_CACHE
    global PRODUCT_CACHE_TIME

    now = time.time()

    if PRODUCT_CACHE and now - PRODUCT_CACHE_TIME < CACHE_TTL:
        return PRODUCT_CACHE

    if not SHOPIFY_STORE or not SHOPIFY_STOREFRONT_TOKEN:
        return []

    query = """
    {
      products(first:12){
        edges{
          node{
            title
            images(first:1){
              edges{
                node{
                  url
                }
              }
            }
            variants(first:1){
              edges{
                node{
                  id
                  price{
                    amount
                  }
                }
              }
            }
          }
        }
      }
    }
    """

    try:

        r = requests.post(
            f"https://{SHOPIFY_STORE}/api/2024-01/graphql.json",
            json={"query": query},
            headers={
                "X-Shopify-Storefront-Access-Token": SHOPIFY_STOREFRONT_TOKEN
            },
            timeout=8
        )

        data = r.json()

        products = []

        for p in data["data"]["products"]["edges"]:

            node = p["node"]
            v = node["variants"]["edges"][0]["node"]

            products.append({
                "title": node["title"],
                "price": v["price"]["amount"],
                "variant": v["id"],
                "image": node["images"]["edges"][0]["node"]["url"]
            })

        PRODUCT_CACHE = products
        PRODUCT_CACHE_TIME = now

        return products

    except Exception as e:
        print("Shopify error:", e)
        return []


@app.route("/api/products")
def api_products():
    return jsonify(get_products())


@app.route("/api/checkout", methods=["POST"])
def checkout():

    variant = request.json.get("variant")

    checkout_url = f"https://{SHOPIFY_STORE}/cart/{variant}:1"

    return jsonify({"url": checkout_url})

#################################################
# ARIA AI ASSISTANT
#################################################

@app.route("/api/aria", methods=["POST"])
def aria():

    user_message = request.json.get("message")

    try:

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are ARIA, a friendly AI hair care assistant. Give short practical hair advice and recommend routines."
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ]
        )

        reply = response.choices[0].message.content

        return jsonify({
            "reply": reply
        })

    except Exception as e:

        print("ARIA error:", e)

        return jsonify({
            "reply": "Sorry, ARIA is having trouble right now."
        })


#################################################
# BLOG CONTENT
#################################################

@app.route("/api/engine/blog")
def engine_blog():

    posts = [

        {
            "title": "How to Repair Damaged Hair Naturally",
            "date": "2026-03-10",
            "url": "/blog/hair-repair"
        },

        {
            "title": "Dominican Hair Mask Routine",
            "date": "2026-03-11",
            "url": "/blog/dominican-hair-mask"
        },

        {
            "title": "Best Oils For Hair Growth",
            "date": "2026-03-12",
            "url": "/blog/hair-growth-oils"
        }

    ]

    return jsonify(posts)

#################################################
# BACKGROUND ENGINE
#################################################

def marketing_engine():

    print("Running background marketing engine")

    try:
        get_products()
    except Exception as e:
        print("Engine error:", e)


scheduler = BackgroundScheduler()

scheduler.add_job(
    func=marketing_engine,
    trigger="interval",
    minutes=30
)

scheduler.start()

#################################################
# PWA FILES
#################################################

@app.route("/manifest.json")
def manifest():
    return send_from_directory("static", "manifest.json")


@app.route("/sw.js")
def service_worker():
    return send_from_directory("static", "sw.js")

#################################################
# DASHBOARD PAGE
#################################################

DASHBOARD_HTML = """
<!DOCTYPE html>
<html>

<head>

<meta name="viewport" content="width=device-width, initial-scale=1">

<title>SupportRD</title>

<link rel="manifest" href="/manifest.json">

<link rel="stylesheet" href="/static/style.css">

</head>

<body>

<div id="app">

<div class="header">
SupportRD
</div>

<div class="panel" id="feed">

<h2>Community</h2>
<p>Share routines, results, and hair journeys.</p>

</div>

<div class="panel" id="shop" style="display:none">

<h2>Shop</h2>
<div id="products"></div>

</div>

<div class="panel" id="scan" style="display:none">

<h2>Hair Scan</h2>
<video id="camera" autoplay></video>

<br><br>

<button onclick="startCamera()">
Start Scan
</button>

</div>

<div class="panel" id="aria" style="display:none">

<h2>ARIA AI</h2>

<input id="ariaInput" placeholder="Ask ARIA about your hair..." />

<button onclick="askAria()">
Ask
</button>

<div id="ariaReply"></div>

</div>

</div>

<div id="nav">

<div id="nav-feed" class="navItem active" onclick="showPanel('feed')">
<span class="navIcon">🏠</span>
Home
</div>

<div id="nav-shop" class="navItem" onclick="showPanel('shop')">
<span class="navIcon">🛍</span>
Shop
</div>

<div id="nav-scan" class="navItem" onclick="showPanel('scan')">
<span class="navIcon">📷</span>
Scan
</div>

<div id="nav-aria" class="navItem" onclick="showPanel('aria')">
<span class="navIcon">✨</span>
ARIA
</div>

</div>

<script src="/static/app.js"></script>

</body>

</html>
"""


@app.route("/")
def dashboard():
    return Response(DASHBOARD_HTML, mimetype="text/html")


#################################################
# RUN SERVER
#################################################

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
