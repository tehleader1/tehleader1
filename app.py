from flask import Flask, jsonify, request, send_from_directory
import os
import requests

app = Flask(__name__, static_folder="static")

#################################################
# SHOPIFY CONFIG
#################################################

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE", "")
SHOPIFY_STOREFRONT_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_TOKEN", "")

#################################################
# SHOPIFY PRODUCT LOADER
#################################################

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


#################################################
# API ROUTES
#################################################

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


#################################################
# BLOG ENGINE
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
# PWA SUPPORT
#################################################

@app.route("/manifest.json")
def manifest():
    return send_from_directory("static", "manifest.json")


@app.route("/sw.js")
def service_worker():
    return send_from_directory("static", "sw.js")


#################################################
# MAIN DASHBOARD
#################################################

@app.route("/")
def dashboard():

    return """
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



<div class="panel" id="engine" style="display:none">

<h2>Growth Stories</h2>

<p>Your ideas are spreading today.</p>

<button onclick="openEngine()">
View Stories
</button>

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

<div class="navItem" onclick="startVoice()">
<span class="navIcon">✨</span>
ARIA
</div>

</div>



<div id="voiceIndicator">
ARIA Listening...
</div>



<div id="enginePopup">

<div id="enginePopupContent">

<button onclick="closeEngine()">Close</button>

<h2>Hair Stories</h2>

<div id="blogList"></div>

</div>

</div>



<script src="/static/app.js"></script>

</body>

</html>
"""


#################################################
# RUN SERVER
#################################################

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
