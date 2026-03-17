from flask import Flask, jsonify, request, send_from_directory
import sqlite3
import os
import requests

app = Flask(__name__, static_folder="static")

DATABASE = "users.db"

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE")
SHOPIFY_STOREFRONT_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_TOKEN")

################################################
# DATABASE
################################################

def db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

################################################
# SHOPIFY PRODUCTS
################################################

def shopify_products():

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
                node{url}
              }
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
            "title": node["title"],
            "price": v["price"]["amount"],
            "variant": v["id"],
            "image": node["images"]["edges"][0]["node"]["url"]
        })

    return products

################################################
# API
################################################

@app.route("/api/products")
def products():
    return jsonify(shopify_products())

@app.route("/api/checkout", methods=["POST"])
def checkout():

    data = request.json
    variant = data["variant"]

    checkout = f"https://{SHOPIFY_STORE}/cart/{variant}:1"

    return jsonify({"url":checkout})

################################################
# PWA FILES
################################################

@app.route("/manifest.json")
def manifest():
    return send_from_directory("static","manifest.json")

@app.route("/sw.js")
def sw():
    return send_from_directory("static","sw.js")

################################################
# DASHBOARD
################################################

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

<button>Home</button>
<button>Shop</button>
<button>Scan</button>
<button>Aria</button>

</div>

<div id="dashboard">

<div class="widget" id="feed">Community Feed</div>
<div class="widget" id="products">Products</div>
<div class="widget">Hair Routine</div>
<div class="widget">Events</div>

</div>

<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.0/Sortable.min.js"></script>
<script src="/static/app.js"></script>

</body>
</html>
"""

################################################

if __name__ == "__main__":
    app.run()
