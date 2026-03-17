import os
import json
import random
import datetime
import requests

APP_BASE_URL = os.environ.get("APP_BASE_URL","")
SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE","")
SHOPIFY_ADMIN_TOKEN = os.environ.get("SHOPIFY_ADMIN_TOKEN","")

LOG_FILE = os.path.join(os.path.dirname(__file__),"content_engine_log.json")

FALLBACK_TOPICS = [
("how to repair damaged hair","en"),
("best oils for scalp growth","en"),
("dominican hair mask routine","en"),
("how to grow hair faster naturally","en"),
("why scalp health matters","en")
]

def _slugify(text):
    return text.lower().replace(" ","-")

def _load_log():
    if not os.path.exists(LOG_FILE):
        return []
    try:
        with open(LOG_FILE,"r") as f:
            return json.load(f)
    except:
        return []

def _append_log(entry):
    log=_load_log()
    log.insert(0,entry)
    with open(LOG_FILE,"w") as f:
        json.dump(log,f,indent=2)

def _generate_post(topic):

    title = topic.title()

    html = f"""
    <h1>{title}</h1>

    <p>Healthy hair begins with the scalp.</p>

    <p>This guide explains how to improve growth,
    reduce damage, and build stronger hair using
    professional Dominican hair care methods.</p>

    <p>SupportRD treatments are designed to help
    restore moisture, strengthen hair, and
    support long-term growth.</p>
    """

    meta = topic[:150]

    return {
        "title":title,
        "html":html,
        "meta":meta
    }

def _post_to_shopify(title, html, meta, handle):

    if not SHOPIFY_ADMIN_TOKEN:
        return None

    url=f"https://{SHOPIFY_STORE}/admin/api/2024-01/blogs.json"

    headers={
        "X-Shopify-Access-Token":SHOPIFY_ADMIN_TOKEN,
        "Content-Type":"application/json"
    }

    try:
        r=requests.post(url,headers=headers,json={
            "article":{
                "title":title,
                "body_html":html,
                "summary_html":meta,
                "handle":handle
            }
        })

        if r.status_code==201:
            return "shopify_post_created"
    except:
        pass

    return None

def _post_to_pinterest(title, meta, url):
    return True

def _post_to_reddit(title, meta, url):
    return True

def run_engine():

    topic,lang=random.choice(FALLBACK_TOPICS)

    post=_generate_post(topic)

    handle=_slugify(post["title"])

    shopify=_post_to_shopify(
        post["title"],
        post["html"],
        post["meta"],
        handle
    )

    blog_url=f"{APP_BASE_URL}/blog/{handle}"

    entry={
        "ts":datetime.datetime.utcnow().isoformat(),
        "topic":topic,
        "shopify_url":shopify,
        "pinterest":_post_to_pinterest(post["title"],post["meta"],blog_url),
        "reddit":_post_to_reddit(post["title"],post["meta"],blog_url)
    }

    _append_log(entry)

    return entry
