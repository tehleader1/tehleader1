from flask import Flask, jsonify, request, send_from_directory
import os
import requests

app = Flask(__name__, static_folder="static")

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE")
SHOPIFY_STOREFRONT_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_TOKEN")

#############################################
# SHOPIFY PRODUCTS
#############################################

def get_products():

    if not SHOPIFY_STORE or not SHOPIFY_STOREFRONT_TOKEN:
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
              edges{
                node{
                  id
                  price{amount}
                }
              }
            }
          }
        }
      }
    }
    """

    r = requests.post(
        f"https://{SHOPIFY_STORE}/api/2024-01/graphql.json",
        json={"query":query},
        headers={
            "X-Shopify-Storefront-Access-Token":SHOPIFY_STOREFRONT_TOKEN
        }
    )

    data = r.json()
    products = []

    for p in data["data"]["products"]["edges"]:

        node = p["node"]
        v = node["variants"]["edges"][0]["node"]

        products.append({
            "title":node["title"],
            "price":v["price"]["amount"],
            "variant":v["id"],
            "image":node["images"]["edges"][0]["node"]["url"]
        })

    return products

#############################################
# API
#############################################

@app.route("/api/products")
def api_products():
    return jsonify(get_products())

@app.route("/api/checkout", methods=["POST"])
def checkout():

    variant = request.json["variant"]

    return jsonify({
        "url": f"https://{SHOPIFY_STORE}/cart/{variant}:1"
    })

#############################################
# ENGINE STATUS (GLASS VIEW)
#############################################

@app.route("/api/engine/status")
def engine_status():

    return jsonify({
        "seo_posts_today":12,
        "shopify_products":54,
        "pinterest_pins":8,
        "reddit_posts":3,
        "traffic_today":241,
        "ai_tasks_running":4
    })

#############################################
# STATIC FILES
#############################################

@app.route("/manifest.json")
def manifest():
    return send_from_directory("static","manifest.json")

@app.route("/sw.js")
def sw():
    return send_from_directory("static","sw.js")

#############################################
# DASHBOARD
#############################################

@app.route("/")
def dashboard():

    return """
<!DOCTYPE html>
<html>

<head>

<meta name="viewport" content="width=device-width, initial-scale=1">

<link rel="manifest" href="/manifest.json">

<title>SupportRD</title>

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

<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
<script src="/static/app.js"></script>

</body>
</html>
"""

#############################################

if __name__ == "__main__":
    app.run()
