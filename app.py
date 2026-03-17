from flask import Flask, jsonify, request, send_from_directory, Response
import os
import requests
import time
from apscheduler.schedulers.background import BackgroundScheduler
from openai import OpenAI

app = Flask(__name__, static_folder="static")

#################################################
# ENVIRONMENT
#################################################

OPENAI_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_KEY)

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE", "")
SHOPIFY_STOREFRONT_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_TOKEN", "")

#################################################
# CACHE
#################################################

PRODUCT_CACHE = []
PRODUCT_CACHE_TIME = 0
CACHE_TTL = 300

#################################################
# FREE TRIAL CONFIG
#################################################

FREE_FEATURES = {
    "aria": True,
    "gps": True,
    "scan": False,
    "shop": False
}

#################################################
# HEALTH CHECK
#################################################

@app.route("/api/ping")
def ping():
    return {"status": "ok"}

#################################################
# PRODUCTS
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
      products(first:10){
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

    except:
        return []

@app.route("/api/products")
def products():
    return jsonify(get_products())

#################################################
# ARIA AI
#################################################

@app.route("/api/aria", methods=["POST"])
def aria():

    user = request.json.get("message")

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role":"system",
                "content":"You are ARIA, an AI hair care expert. Provide short practical advice."
            },
            {
                "role":"user",
                "content":user
            }
        ]
    )

    reply = response.choices[0].message.content

    return jsonify({"reply":reply})

#################################################
# HAIR SCAN AI (BETA)
#################################################

@app.route("/api/hair-scan", methods=["POST"])
def hair_scan():

    # placeholder AI scan result

    return jsonify({

        "damage":"medium",
        "hydration":"low",
        "curl_type":"3B",

        "recommendations":[
            "Deep conditioning twice weekly",
            "Use argan oil",
            "Avoid heat styling"
        ]

    })

#################################################
# FREE TRIAL CHECK
#################################################

@app.route("/api/features")
def features():
    return jsonify(FREE_FEATURES)

#################################################
# BLOG CONTENT
#################################################

@app.route("/api/blog")
def blog():

    posts = [

        {"title":"Repair Damaged Hair Naturally","url":"/blog/repair"},
        {"title":"Dominican Hair Mask Routine","url":"/blog/mask"},
        {"title":"Top Oils For Hair Growth","url":"/blog/oils"}

    ]

    return jsonify(posts)

#################################################
# BACKGROUND ENGINE
#################################################

def marketing_engine():

    print("AI engine cycle")

    try:
        get_products()
    except:
        pass

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
    return send_from_directory("static","manifest.json")

@app.route("/sw.js")
def sw():
    return send_from_directory("static","sw.js")

#################################################
# MAIN DASHBOARD
#################################################

DASHBOARD_HTML = """
<!DOCTYPE html>
<html>

<head>

<meta name="viewport" content="width=device-width, initial-scale=1">

<title>SupportRD</title>

<link rel="stylesheet" href="/static/style.css">

<script src="https://cdn.auth0.com/js/auth0/9.24/auth0.min.js"></script>

</head>

<body>

<div id="app">

<h1>SupportRD</h1>

<div id="login">

<button onclick="login()">Login / Sign Up</button>

</div>

<div class="panel">

<h2>ARIA AI</h2>

<input id="ariaInput">

<button onclick="askAria()">Ask ARIA</button>

<div id="ariaReply"></div>

</div>

<div class="panel">

<h2>Hair Scan</h2>

<video id="camera" autoplay></video>

<button onclick="startCamera()">Start Scan</button>

<button onclick="scanHair()">Analyze</button>

<div id="scanResults"></div>

</div>

<div class="panel">

<h2>Shop</h2>

<div id="products"></div>

</div>

</div>

<script src="/static/auth.js"></script>
<script src="/static/app.js"></script>

</body>
</html>
"""

@app.route("/")
def home():
    return Response(DASHBOARD_HTML,mimetype="text/html")

#################################################
# RUN
#################################################

if __name__ == "__main__":
    app.run(host="0.0.0.0",port=5000)
