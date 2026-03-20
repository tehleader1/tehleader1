from flask import Flask, jsonify, request, send_from_directory, Response, session, redirect
import json
import random
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
import requests
import time
import sqlite3
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from openai import OpenAI

from engine_routes import engine
from content_engine import trending_products, reorder_suggestions

app = Flask(__name__, static_folder="static")
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or os.urandom(32)

app.register_blueprint(engine)

#################################################
# ENVIRONMENT
#################################################

OPENAI_KEY = os.environ.get("OPENAI_API_KEY")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

client = None
if OPENAI_KEY:
    client = OpenAI(api_key=OPENAI_KEY)

SHOPIFY_STORE = os.environ.get("SHOPIFY_STORE", "")
SHOPIFY_TOKEN = os.environ.get("SHOPIFY_STOREFRONT_TOKEN", "")
SHOPIFY_ADMIN_TOKEN = os.environ.get("SHOPIFY_ADMIN_TOKEN", "")
SHOPIFY_BLOG_ID = os.environ.get("SHOPIFY_BLOG_ID", "")

SEO_ENABLED = os.environ.get("SEO_ENABLED", "false").lower() == "true"
SEO_INTERVAL_HOURS = int(os.environ.get("SEO_INTERVAL_HOURS", "72"))
LAST_SEO_POST = 0

AUTH0_DOMAIN = os.environ.get("AUTH0_DOMAIN", "")
AUTH0_CLIENT_ID = os.environ.get("AUTH0_CLIENT_ID", "")
AUTH0_CLIENT_SECRET = os.environ.get("AUTH0_CLIENT_SECRET", "")
AUTH0_CALLBACK_URL = os.environ.get("AUTH0_CALLBACK_URL", "https://ai-hair-advisor.onrender.com/callback")
AUTH0_LOGOUT_URL = os.environ.get("AUTH0_LOGOUT_URL", "https://supportrd.com")

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "")
DEVELOPER_EMAIL = os.environ.get("DEVELOPER_EMAIL", "")
ADMIN_EMAIL = (os.environ.get("ADMIN_EMAIL") or DEVELOPER_EMAIL).lower()
SEO_RANDOM_ENABLED = os.environ.get("SEO_RANDOM_ENABLED", "false").lower() == "true"
SEO_RANDOM_JOB_IDS = []
CLAIM_CODES = [c.strip().upper() for c in os.environ.get("CLAIM_CODES", "SRD2026,NEW4ALL").split(",") if c.strip()]
CLAIM_NAMES = [n.strip() for n in os.environ.get("CLAIM_NAMES", "Reptar,MrGiggles").split(",") if n.strip()]
CLAIM_DB_PATH = os.environ.get("CLAIM_DB_PATH", "users.db")

#################################################
# CACHE
#################################################

PRODUCT_CACHE = []
PRODUCT_CACHE_TIME = 0
CACHE_TTL = 300

#################################################
# FOUNDER CLAIMS
#################################################

def init_claim_db():
    try:
        conn = sqlite3.connect(CLAIM_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS name_claims ("
            "name TEXT PRIMARY KEY,"
            "claimed_at TEXT,"
            "email TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass

def get_claim(name):
    if not name:
        return None
    try:
        conn = sqlite3.connect(CLAIM_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT name, claimed_at, email FROM name_claims WHERE name = ?", (name,))
        row = cur.fetchone()
        conn.close()
        return row
    except:
        return None

def set_claim(name, email):
    try:
        conn = sqlite3.connect(CLAIM_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT OR REPLACE INTO name_claims (name, claimed_at, email) VALUES (?, ?, ?)",
            (name, datetime.utcnow().isoformat() + "Z", email or "")
        )
        conn.commit()
        conn.close()
        return True
    except:
        return False

#################################################
# HEALTH CHECKS
#################################################

@app.route("/health")
def health():
    return {"status": "healthy"}

@app.route("/api/ping")
def ping():
    return {"status": "ok"}

def is_admin():
    try:
        user = session.get("user") or {}
        email = (user.get("email") or "").lower()
        return bool(email and ADMIN_EMAIL and email == ADMIN_EMAIL)
    except:
        return False

@app.route("/api/seo/publish", methods=["POST"])
def seo_publish():
    if not is_admin():
        return {"ok": False, "message": "unauthorized"}, 401
    ok, msg = publish_shopify_blog()
    return {"ok": ok, "message": msg}

def schedule_random_seo_jobs():
    global SEO_RANDOM_JOB_IDS
    for jid in SEO_RANDOM_JOB_IDS:
        try:
            scheduler.remove_job(jid)
        except:
            pass
    SEO_RANDOM_JOB_IDS = []
    now = time.time()
    for i in range(4):
        offset = random.randint(10 * 60, 24 * 60 * 60 - 1)
        run_at = time.localtime(now + offset)
        run_date = time.strftime("%Y-%m-%d %H:%M:%S", run_at)
        jid = f"seo-rand-{i}-{int(now)}"
        scheduler.add_job(publish_shopify_blog, "date", run_date=run_date, id=jid, replace_existing=True)
        SEO_RANDOM_JOB_IDS.append(jid)

def prune_random_seo_jobs():
    global SEO_RANDOM_JOB_IDS
    keep = []
    for jid in SEO_RANDOM_JOB_IDS:
        if scheduler.get_job(jid):
            keep.append(jid)
    SEO_RANDOM_JOB_IDS = keep

@app.route("/api/seo/auto", methods=["POST"])
def seo_auto():
    global SEO_RANDOM_ENABLED
    if not is_admin():
        return {"ok": False, "message": "unauthorized"}, 401
    data = request.json or {}
    SEO_RANDOM_ENABLED = bool(data.get("enabled"))
    if SEO_RANDOM_ENABLED:
        schedule_random_seo_jobs()
    else:
        for jid in SEO_RANDOM_JOB_IDS:
            try:
                scheduler.remove_job(jid)
            except:
                pass
        SEO_RANDOM_JOB_IDS.clear()
    return {"ok": True, "enabled": SEO_RANDOM_ENABLED}

@app.route("/api/custom-order", methods=["POST"])
def custom_order():
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD and (FROM_EMAIL or SMTP_USER) and DEVELOPER_EMAIL):
        return {"ok": False, "error": "Email not configured"}, 500

    data = request.json or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()
    address = data.get("address", "").strip()
    delivery = data.get("delivery", "").strip()
    source = data.get("source", "").strip()
    notes = data.get("notes", "").strip()
    items = data.get("items", []) or []
    total = data.get("total", 0)

    if not name or not email or not phone or not address:
        return {"ok": False, "error": "Missing required fields"}, 400

    items_html = ""
    for item in items:
        iname = str(item.get("name", ""))
        qty = str(item.get("qty", ""))
        subtotal = str(item.get("subtotal", ""))
        items_html += f"<tr><td>{iname}</td><td>{qty}</td><td>${subtotal}</td></tr>"

    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
      <h1 style="font-size:26px;font-weight:800;margin:0 0 8px;">CUSTOM ORDER ARRIVED ⭐⭐⭐⭐⭐</h1>
      <div style="background:#0b1a0f;color:#fff;padding:12px 16px;border-radius:8px;font-weight:800;display:inline-block;">
        CUSTOM ORDER ARRIVED ⭐⭐⭐⭐⭐
      </div>
      <p style="margin:16px 0 6px;"><strong>Client:</strong> {name}</p>
      <p style="margin:6px 0;"><strong>Email:</strong> {email}</p>
      <p style="margin:6px 0;"><strong>Phone:</strong> {phone}</p>
      <p style="margin:6px 0;"><strong>Address:</strong> {address}</p>
      <p style="margin:6px 0;"><strong>Delivery:</strong> {delivery or "standard"}</p>
      <p style="margin:6px 0;"><strong>Source:</strong> {source or "N/A"}</p>
      <p style="margin:6px 0;"><strong>Notes:</strong> {notes or "N/A"}</p>
      <h3 style="margin:18px 0 6px;">Items</h3>
      <table style="border-collapse:collapse;width:100%;max-width:520px;">
        <thead><tr><th align="left">Product</th><th align="left">Qty</th><th align="left">Subtotal</th></tr></thead>
        <tbody>{items_html}</tbody>
      </table>
      <p style="margin-top:12px;"><strong>Total:</strong> ${total}</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "CUSTOM ORDER ARRIVED ⭐⭐⭐⭐⭐"
    msg["From"] = FROM_EMAIL or SMTP_USER
    msg["To"] = DEVELOPER_EMAIL
    msg.attach(MIMEText(html, "html"))

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(msg["From"], [DEVELOPER_EMAIL], msg.as_string())
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": "Email send failed", "detail": str(e)[:200]}, 500

@app.route("/api/custom-order/test", methods=["POST"])
def custom_order_test():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD and (FROM_EMAIL or SMTP_USER) and DEVELOPER_EMAIL):
        return {"ok": False, "error": "Email not configured"}, 500
    html = """
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
      <h1 style="font-size:26px;font-weight:800;margin:0 0 8px;">CUSTOM ORDER ARRIVED ⭐⭐⭐⭐⭐</h1>
      <div style="background:#0b1a0f;color:#fff;padding:12px 16px;border-radius:8px;font-weight:800;display:inline-block;">
        CUSTOM ORDER ARRIVED ⭐⭐⭐⭐⭐
      </div>
      <p style="margin:16px 0 6px;"><strong>Test Email</strong> — this is a system check.</p>
    </div>
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "CUSTOM ORDER ARRIVED ⭐⭐⭐⭐⭐"
    msg["From"] = FROM_EMAIL or SMTP_USER
    msg["To"] = DEVELOPER_EMAIL
    msg.attach(MIMEText(html, "html"))
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(msg["From"], [DEVELOPER_EMAIL], msg.as_string())
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": "Email send failed", "detail": str(e)[:200]}, 500

@app.route("/api/me")
def me():
    user = session.get("user")
    if not user:
        return {"authenticated": False}
    return {"authenticated": True, "user": user, "admin": is_admin()}

@app.route("/api/claim-name", methods=["POST"])
def claim_name():
    user = session.get("user") or {}
    email = (user.get("email") or "").lower()
    if not email:
        return {"ok": False, "error": "unauthorized"}, 401
    data = request.json or {}
    name = (data.get("name") or "").strip()
    code = (data.get("code") or "").strip().upper()
    if not name or not code:
        return {"ok": False, "error": "missing"}, 400
    if code not in CLAIM_CODES:
        return {"ok": False, "error": "invalid_code"}, 400
    if name not in CLAIM_NAMES:
        return {"ok": False, "error": "not_eligible"}, 400
    if get_claim(name):
        return {"ok": False, "error": "already_claimed"}, 409
    ok = set_claim(name, email)
    return {"ok": ok}

@app.route("/api/claim-status")
def claim_status():
    name = (request.args.get("name") or "").strip()
    if not name:
        return {"ok": False, "error": "missing"}, 400
    row = get_claim(name)
    return {"ok": True, "claimed": bool(row), "name": name}

@app.route("/login")
def login():
    if not AUTH0_DOMAIN or not AUTH0_CLIENT_ID or not AUTH0_CLIENT_SECRET:
        return redirect("/")
    state = os.urandom(16).hex()
    session["oauth_state"] = state
    provider = request.args.get("provider")
    mode = request.args.get("mode", "").lower()
    authorize_url = f"https://{AUTH0_DOMAIN}/authorize"
    params = {
        "response_type": "code",
        "client_id": AUTH0_CLIENT_ID,
        "redirect_uri": AUTH0_CALLBACK_URL,
        "scope": "openid profile email",
        "state": state
    }
    if provider:
        params["connection"] = provider
    if mode == "signup":
        params["screen_hint"] = "signup"
    query = "&".join([f"{k}={requests.utils.quote(str(v))}" for k, v in params.items()])
    return redirect(f"{authorize_url}?{query}")

@app.route("/callback")
def callback():
    code = request.args.get("code")
    state = request.args.get("state")
    if not code or not state or state != session.get("oauth_state"):
        return redirect("/")
    token_url = f"https://{AUTH0_DOMAIN}/oauth/token"
    payload = {
        "grant_type": "authorization_code",
        "client_id": AUTH0_CLIENT_ID,
        "client_secret": AUTH0_CLIENT_SECRET,
        "code": code,
        "redirect_uri": AUTH0_CALLBACK_URL
    }
    try:
        token_res = requests.post(token_url, json=payload, timeout=10)
        token_res.raise_for_status()
        tokens = token_res.json()
        userinfo_url = f"https://{AUTH0_DOMAIN}/userinfo"
        userinfo_res = requests.get(
            userinfo_url,
            headers={"Authorization": f"Bearer {tokens.get('access_token','')}"}, timeout=10
        )
        userinfo_res.raise_for_status()
        session["user"] = userinfo_res.json()
    except:
        return redirect("/")
    return redirect("/")

@app.route("/logout")
def logout():
    session.clear()
    if not AUTH0_DOMAIN or not AUTH0_CLIENT_ID:
        return redirect("/")
    return redirect(
        f"https://{AUTH0_DOMAIN}/v2/logout?client_id={AUTH0_CLIENT_ID}&returnTo={AUTH0_LOGOUT_URL}"
    )

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

def get_shopify_blog_id():
    if SHOPIFY_BLOG_ID:
        return SHOPIFY_BLOG_ID
    if not SHOPIFY_STORE or not SHOPIFY_ADMIN_TOKEN:
        return None
    try:
        r = requests.get(
            f"https://{SHOPIFY_STORE}/admin/api/2024-01/blogs.json",
            headers={"X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN},
            timeout=8
        )
        data = r.json()
        blogs = data.get("blogs", [])
        if blogs:
            return str(blogs[0].get("id"))
    except:
        return None
    return None

def generate_seo_post(products):
    title = "Healthy Hair Routine: Moisture, Bounce, and Shine"
    body = """
    <h2>Start With a Scalp-First Wash Day</h2>
    <p>Clean hair starts at the scalp. Use a gentle cleanser, then follow with a hydrating conditioner. Avoid heavy buildup to keep natural bounce.</p>
    <h2>Midweek Moisture Reset</h2>
    <p>Refresh with a light mist or leave-in. Seal ends with a small amount of oil to reduce frizz and tangles.</p>
    <h2>Styling + Protection</h2>
    <p>Limit heat. Use a heat protectant when needed. Sleep on satin to reduce friction and breakage.</p>
    <h2>Product Pairing</h2>
    <p>Match products to your goals: hydration for dryness, protein for bounce, and gentle detangling for fragile strands.</p>
    <p><strong>Need a custom routine?</strong> Use the SupportRD Custom Order to get a product match and routine plan.</p>
    """
    excerpt = "A simple weekly routine to restore moisture, reduce frizz, and bring back bounce."

    if not client:
        return title, body, excerpt

    try:
        product_list = ", ".join([p.get("title", "") for p in products if p.get("title")])[:600]
        prompt = (
            "Write a Shopify blog post (HTML) about healthy hair care. "
            "Include sections for wash day, midweek refresh, styling protection, and product pairing. "
            "Use a warm, expert tone. 800-1200 words. "
            "Return JSON with keys: title, body_html, excerpt. "
            f"Products to mention if relevant: {product_list}."
        )
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=1200
        )
        content = response.choices[0].message.content or ""
        if content.strip().startswith("{"):
            data = json.loads(content)
            return data.get("title", title), data.get("body_html", body), data.get("excerpt", excerpt)
    except:
        return title, body, excerpt

    return title, body, excerpt

def publish_shopify_blog():
    if not SHOPIFY_STORE or not SHOPIFY_ADMIN_TOKEN:
        return False, "Shopify admin not configured"
    blog_id = get_shopify_blog_id()
    if not blog_id:
        return False, "No blog id found"
    products = get_products()
    title, body_html, excerpt = generate_seo_post(products)
    payload = {
        "article": {
            "title": title,
            "body_html": body_html,
            "summary_html": excerpt,
            "tags": "hair care, moisture, frizz, routine, SupportRD",
            "published": True
        }
    }
    try:
        r = requests.post(
            f"https://{SHOPIFY_STORE}/admin/api/2024-01/blogs/{blog_id}/articles.json",
            headers={
                "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN,
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=10
        )
        if r.status_code >= 400:
            return False, f"Shopify error {r.status_code}"
        return True, "Published"
    except Exception as e:
        return False, str(e)[:200]

@app.route("/api/products")
def products():
    return jsonify(get_products())

#################################################
# ARIA AI
#################################################

HAIR_SYSTEM = (
    "You are ARIA, a hair and scalp care expert for SupportRD. You only discuss hair, scalp, hair products, routines, styling, and hair-related wellness. If the user asks about anything outside hair or scalp care, refuse and redirect to hair help. Always give thorough, structured answers and include a routine (wash day + midweek + styling + protection). When users list multiple issues (dryness, lack of bounce, frizz, oiliness, damage, tangles, color loss), address each one explicitly. When asked for prices or when the user lists products, always repeat the price for each named item and give a total if quantity is 1 each. Prices: Shampoo Aloe Vera $20, Formula Exclusiva $55, Laciador Crece $40, Mascarilla Capilar $25, Gotero Rapido $55, Gotitas Brillantes $30. If user names differ (Gotika, Gotero, Mascrilla, Laciador), map them to Gotitas Brillantes, Gotero Rapido, Mascarilla Capilar, Laciador Crece. Offer a simple total estimate when quantities are 1 each. "
)

HAIR_KEYWORDS = {
    "hair","scalp","shampoo","conditioner","oil","oily","dry","damage","damaged",
    "split","ends","dandruff","itch","itchy","shedding","loss","bald","balding",
    "curl","curls","waves","wavy","straight","frizz","frizzy","color","bleach",
    "treat","treatment","mask","serum","leave-in","moisture","hydration","porosity",
    "breakage","growth","style","styling","heat","protectant","braid","loc","locks",
    "edges","hairline","detangle","tangle","tangled","dryness","oiling","rinse"
}

def is_hair_topic(text):
    if not text:
        return False
    t = text.lower()
    return any(k in t for k in HAIR_KEYWORDS)

@app.route("/api/aria", methods=["POST"])
def aria():

    if not client:
        return {"reply": "AI unavailable"}

    msg = request.json.get("message")
    if not is_hair_topic(msg):
        return {"reply": "I can only help with hair and scalp care. Tell me your hair concern and I’ll help."}

    try:

        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": HAIR_SYSTEM},
                {"role": "user", "content": msg}
            ],
            temperature=0.4,
            max_tokens=400
        )

        reply = response.choices[0].message.content

        return {"reply": reply}

    except:
        return {"reply": "AI error"}



@app.route("/api/aria/transcribe/ping")
def aria_transcribe_ping():
    return {"status": "ok"}

@app.route("/api/aria/transcribe", methods=["POST"])
def aria_transcribe():

    if not OPENAI_KEY:
        return {"error": "OPENAI_API_KEY missing"}, 500

    audio = request.files.get("audio")
    if not audio:
        return {"error": "No audio provided"}, 400

    try:
        audio_bytes = audio.read()
        if not audio_bytes:
            return {"error": "Empty audio"}, 400
        files = {
            "file": (audio.filename or "audio.webm", audio_bytes, audio.mimetype or "audio/webm")
        }
        primary_model = os.environ.get("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe")
        fallback_models = [primary_model, "whisper-1"]
        tried = set()
        last_status = None
        last_detail = ""
        for model in fallback_models:
            if model in tried:
                continue
            tried.add(model)
            data = {"model": model}
            r = requests.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {OPENAI_KEY}"},
                data=data,
                files=files,
                timeout=45
            )
            if r.status_code < 400:
                out = r.json()
                return {"text": out.get("text", ""), "model": model}
            last_status = r.status_code
            last_detail = r.text[:300]
            # Only retry on model-related failures or not found
            if r.status_code not in (400, 404):
                break
        return {"error": "Transcription failed", "status": last_status, "detail": last_detail}, 500
    except Exception as e:
        return {"error": "Transcription error", "detail": str(e)[:300]}, 500

@app.route("/api/aria/speech", methods=["POST"])
def aria_speech():

    if not OPENAI_KEY:
        return {"error": "AI unavailable"}, 503

    text = request.json.get("text", "") if request.is_json else ""
    if not text:
        return {"error": "No text"}, 400

    try:
        payload = {
            "model": os.environ.get("OPENAI_TTS_MODEL", "gpt-4o-mini-tts"),
            "voice": os.environ.get("OPENAI_TTS_VOICE", "shimmer"),
            "input": text,
            "response_format": "mp3"
        }
        r = requests.post(
            "https://api.openai.com/v1/audio/speech",
            headers={
                "Authorization": f"Bearer {OPENAI_KEY}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=30
        )
        if r.status_code >= 400:
            return {"error": "Speech failed"}, 500
        return Response(r.content, mimetype="audio/mpeg")
    except:
        return {"error": "Speech error"}, 500

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

    global LAST_SEO_POST
    if SEO_ENABLED:
        now = time.time()
        min_gap = SEO_INTERVAL_HOURS * 3600
        if now - LAST_SEO_POST > min_gap:
            ok, _ = publish_shopify_blog()
            if ok:
                LAST_SEO_POST = now
    if SEO_RANDOM_ENABLED:
        prune_random_seo_jobs()
        if not SEO_RANDOM_JOB_IDS:
            schedule_random_seo_jobs()


scheduler = BackgroundScheduler()

scheduler.add_job(
    engine_loop,
    "interval",
    minutes=30
)

scheduler.start()
init_claim_db()

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

@app.route("/favicon.ico")
def favicon():
    return send_from_directory("static/images", "woman-waking-up12.jpg")

#################################################

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
