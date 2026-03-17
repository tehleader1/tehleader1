from flask import Flask,jsonify,request,Response,send_from_directory
import os
import requests
import time
from apscheduler.schedulers.background import BackgroundScheduler
from openai import OpenAI

from engine_routes import engine
from content_engine import trending_products,reorder_suggestions

app=Flask(__name__,static_folder="static")

app.register_blueprint(engine)

#################################################
# API KEYS
#################################################

OPENAI_KEY=os.environ.get("OPENAI_API_KEY")
client=OpenAI(api_key=OPENAI_KEY)

SHOPIFY_STORE=os.environ.get("SHOPIFY_STORE","")
SHOPIFY_TOKEN=os.environ.get("SHOPIFY_STOREFRONT_TOKEN","")

#################################################
# CACHE
#################################################

PRODUCT_CACHE=[]
PRODUCT_CACHE_TIME=0
CACHE_TTL=300

#################################################
# PRODUCTS
#################################################

def get_products():

    global PRODUCT_CACHE,PRODUCT_CACHE_TIME

    if time.time()-PRODUCT_CACHE_TIME<CACHE_TTL:
        return PRODUCT_CACHE

    query="""
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

        r=requests.post(

        f"https://{SHOPIFY_STORE}/api/2024-01/graphql.json",

        json={"query":query},

        headers={
        "X-Shopify-Storefront-Access-Token":SHOPIFY_TOKEN
        })

        data=r.json()

        products=[]

        for p in data["data"]["products"]["edges"]:

            node=p["node"]
            v=node["variants"]["edges"][0]["node"]

            products.append({

            "title":node["title"],
            "price":v["price"]["amount"],
            "variant":v["id"],
            "image":node["images"]["edges"][0]["node"]["url"]

            })

        PRODUCT_CACHE=products
        PRODUCT_CACHE_TIME=time.time()

        return products

    except:

        return []

@app.route("/api/products")
def products():

    return jsonify(get_products())

#################################################
# ARIA AI
#################################################

@app.route("/api/aria",methods=["POST"])
def aria():

    msg=request.json.get("message")

    response=client.chat.completions.create(

    model="gpt-4o-mini",

    messages=[

    {"role":"system","content":"You are ARIA hair care AI assistant."},

    {"role":"user","content":msg}

    ])

    reply=response.choices[0].message.content

    return jsonify({"reply":reply})

#################################################
# MARKETING ENGINE
#################################################

@app.route("/api/engine/marketing")
def marketing():

    products=get_products()

    return jsonify({

    "trending":trending_products(products),

    "reorders":reorder_suggestions(products)

    })

#################################################
# BACKGROUND ENGINE
#################################################

def engine_loop():

    print("AI engine running")

    get_products()

scheduler=BackgroundScheduler()

scheduler.add_job(engine_loop,"interval",minutes=30)

scheduler.start()

#################################################
# DASHBOARD
#################################################

@app.route("/")
def home():

    return send_from_directory("static","index.html")

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

if __name__=="__main__":
    app.run(host="0.0.0.0",port=5000)
