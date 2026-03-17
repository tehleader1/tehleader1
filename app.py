import os
import json
import sqlite3
import datetime
import hashlib
import secrets
import requests

from flask import Flask, request, jsonify, render_template_string

app = Flask(__name__)

AUTH_DB="users.db"

SHOPIFY_STORE=os.environ.get("SHOPIFY_STORE","")
SHOPIFY_STOREFRONT_TOKEN=os.environ.get("SHOPIFY_STOREFRONT_TOKEN","")

###################################
# DATABASE
###################################

def get_db():
    con=sqlite3.connect(AUTH_DB)
    con.row_factory=sqlite3.Row
    return con

def init_db():

    con=get_db()

    con.execute("""
    CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    name TEXT,
    password_hash TEXT,
    created_at TEXT
    )
    """)

    con.commit()
    con.close()

init_db()

###################################
# AUTH
###################################

def hash_password(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

@app.route("/api/auth/register",methods=["POST"])
def register():

    data=request.json

    email=data["email"]
    pw=hash_password(data["password"])

    con=get_db()
    con.execute(
    "INSERT INTO users(email,password_hash,created_at) VALUES(?,?,?)",
    (email,pw,datetime.datetime.utcnow().isoformat())
    )

    con.commit()
    con.close()

    return jsonify({"ok":True})

###################################
# SHOPIFY
###################################

def shopify_get_products():

    if not SHOPIFY_STOREFRONT_TOKEN:
        return []

    query="""
    {
      products(first:10){
        edges{
          node{
            id
            title
            handle
            description
            images(first:1){edges{node{url}}}
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

    r=requests.post(
        f"https://{SHOPIFY_STORE}/api/2024-01/graphql.json",
        json={"query":query},
        headers={
            "X-Shopify-Storefront-Access-Token":SHOPIFY_STOREFRONT_TOKEN
        }
    )

    data=r.json()

    products=[]

    for p in data["data"]["products"]["edges"]:
        node=p["node"]
        v=node["variants"]["edges"][0]["node"]

        products.append({
            "id":v["id"],
            "title":node["title"],
            "price":v["price"]["amount"],
            "handle":node["handle"]
        })

    return products

@app.route("/api/shop/products")
def shop_products():

    return jsonify({
        "products":shopify_get_products()
    })

###################################
# CART
###################################

@app.route("/api/shop/cart",methods=["POST"])
def shop_cart():

    data=request.json

    variant=data["variantId"]

    checkout=f"https://{SHOPIFY_STORE}/cart/{variant}:1"

    return jsonify({
        "ok":True,
        "checkoutUrl":checkout
    })

###################################
# DASHBOARD
###################################

@app.route("/")
def dashboard():

    return render_template_string("""
<html>

<head>

<style>

body{
background:#0b0b0b;
color:white;
font-family:system-ui;
margin:0;
}

#grid{
display:grid;
grid-template-columns:240px 1fr 400px;
height:100vh;
}

#sidebar{
background:#111;
padding:20px;
}

#main{
padding:20px;
overflow:auto;
}

#shop{
background:#111;
padding:20px;
}

.product{
border:1px solid #333;
padding:10px;
margin-bottom:10px;
}

button{
padding:6px 10px;
}

</style>

</head>

<body>

<div id="grid">

<div id="sidebar">

<h2>ARIA</h2>

<button onclick="loadProducts()">Shop</button>

</div>

<div id="main">

<h2>Feed</h2>

<div id="feed"></div>

</div>

<div id="shop">

<h2>Products</h2>

<div id="products"></div>

</div>

</div>

<script>

async function loadProducts(){

let r=await fetch("/api/shop/products")
let d=await r.json()

document.getElementById("products").innerHTML=
d.products.map(p=>`
<div class="product">

<b>${p.title}</b>

<br>

$${p.price}

<br><br>

<button onclick="buy('${p.id}')">
Buy
</button>

</div>
`).join("")

}

async function buy(id){

let r=await fetch("/api/shop/cart",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({variantId:id})
})

let d=await r.json()

window.open(d.checkoutUrl)

}

loadProducts()

</script>

</body>

</html>
""")

###################################
# ENGINE ROUTES
###################################

try:
    from engine_routes import register_engine_routes
    register_engine_routes(app)
except:
    pass

###################################

if __name__=="__main__":
    app.run()
