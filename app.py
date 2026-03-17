from flask import Flask, jsonify, request, send_from_directory
import os
import requests
import time
from apscheduler.schedulers.background import BackgroundScheduler
from openai import OpenAI

from engine_routes import engine
from content_engine import trending_products, reorder_suggestions

app = Flask(__name__, static_folder="static")

app.register_blueprint(engine)

#################################################
# ENVIRONMENT
#################################################

OPENAI_KEY = os.environ.get("OPENAI_API_KEY")

client = None
if OPENAI_KEY:
    client = OpenAI(api_key=OPENAI_KEY)

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE", "")
SHOPIFY_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_TOKEN", "")

#################################################
# CACHE
#################################################

PRODUCT_CACHE = []
PRODUCT_CACHE_TIME = 0
CACHE_TTL = 300

#################################################
# HEALTH CHECKS
#################################################

@app.route("/health")
def health():
    return {"status": "healthy"}

@app.route("/api/ping")
def ping():
    return {"status": "ok"}

#################################################
# PRODUCTS
#################################################

def get_products():

    global PRODUCT_CACHE, PRODUCT_CACHE_TIME

    now = time.time()

    if PRODUCT_CACHE and now - PRODUCT_CACHE_TIME < CACHE_TTL:
        return PRODUCT_CACHE

    if not SHOPIFY_STORE:
        return []

    query = """
    {
      products(first:10){
        edges{
          node{
            title
            images(first:1){
              edges{node{url}}
            }
            variants(first:1){
              edges{node{id price{amount}}}
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
                "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN
            },
            timeout=6
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

    if not client:
        return {"reply": "AI unavailable"}

    msg = request.json.get("message")

    try:

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are ARIA, an AI hair expert."},
                {"role": "user", "content": msg}
            ]
        )

        reply = response.choices[0].message.content

        return {"reply": reply}

    except:
        return {"reply": "AI error"}

#################################################
# MARKETING ENGINE
#################################################

@app.route("/api/engine/marketing")
def marketing():

    products = get_products()

    return {

        "trending": trending_products(products),

        "reorders": reorder_suggestions(products)

    }

#################################################
# BACKGROUND ENGINE
#################################################

def engine_loop():

    try:
        get_products()
    except:
        pass


scheduler = BackgroundScheduler()

scheduler.add_job(
    engine_loop,
    "interval",
    minutes=30
)

scheduler.start()

#################################################
# STATIC FILES
#################################################

@app.route("/")
def home():
    return send_from_directory("static", "index.html")

@app.route("/manifest.json")
def manifest():
    return send_from_directory("static", "manifest.json")

@app.route("/sw.js")
def sw():
    return send_from_directory("static", "sw.js")

#################################################

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
