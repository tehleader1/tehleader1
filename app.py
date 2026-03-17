from flask import Flask, jsonify, request, send_from_directory
import os
import requests
import datetime

app = Flask(__name__, static_folder="static")

####################################################
# ENVIRONMENT
####################################################

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE", "")
SHOPIFY_STOREFRONT_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_TOKEN", "")

####################################################
# SHOPIFY PRODUCTS
####################################################

def get_products():

    if not SHOPIFY_STORE or not SHOPIFY_STOREFRONT_TOKEN:
        return []

    query = """
    {
      products(first:12){
        edges{
          node{
            title
            handle
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
            timeout=10
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

        return products

    except Exception as e:
        print("Shopify error:", e)
        return []


####################################################
# API ROUTES
####################################################

@app.route("/api/products")
def api_products():
    return jsonify(get_products())


@app.route("/api/checkout", methods=["POST"])
def checkout():

    variant = request.json.get("variant")

    checkout_url = f"https://{SHOPIFY_STORE}/cart/{variant}:1"

    return jsonify({
        "url": checkout_url
    })


####################################################
# MARKETING ENGINE STATUS
####################################################

@app.route("/api/engine/status")
def engine_status():

    return jsonify({
        "seo_posts_today": 12,
        "shopify_products": 54,
        "pinterest_pins": 8,
        "reddit_posts": 3,
        "traffic_today": 241,
        "ai_tasks_running": 4
    })


####################################################
# BLOG ENGINE (VISIBLE TO USERS)
####################################################

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


####################################################
# PWA FILES
####################################################

@app.route("/manifest.json")
def manifest():
    return send_from_directory("static", "manifest.json")


@app.route("/sw.js")
def service_worker():
    return send_from_directory("static", "sw.js")


####################################################
# MAIN DASHBOARD
####################################################

@app.route("/")
def dashboard():

    return """
<!DOCTYPE html>
<html>

<head>

<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="manifest" href="/manifest.json">

<title>SupportRD Dashboard</title>

<link rel="stylesheet" href="/static/style.css">

</head>

<body>

<div id="nav">

<button onclick="showPanel('feed')">Home</button>
<button onclick="showPanel('shop')">Shop</button>
<button onclick="showPanel('scan')">Scan</button>
<button onclick="startVoice()">ARIA</button>

</div>

<div id="dashboard">

<div class="widget" id="feed">

<h2>Community Feed</h2>

<p>Users can share routines, tips, and results.</p>

</div>


<div class="widget" id="shop">

<h2>Shop</h2>

<div id="products"></div>

</div>


<div class="widget" id="scan">

<h2>Hair Scan</h2>

<video id="camera" autoplay></video>

<button onclick="startCamera()">Start Scan</button>

</div>


<div class="widget" id="engine">

<h2>Marketing Engine</h2>

<div id="engineData"></div>

</div>

</div>


<div id="voiceIndicator">

ARIA Listening...

</div>


<div id="enginePopup">

<div id="enginePopupContent">

<button onclick="closeEngine()">Close</button>

<h2>SEO Blog Engine</h2>

<div id="blogList"></div>

</div>

</div>


<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>

<script src="/static/app.js"></script>

</body>

</html>
"""


####################################################
# RUN SERVER
####################################################

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
