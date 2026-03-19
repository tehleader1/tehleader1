from flask import Flask, jsonify, request, send_from_directory, Response, session, redirect
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
import requests
import time
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

@app.route("/api/me")
def me():
    user = session.get("user")
    if not user:
        return {"authenticated": False}
    return {"authenticated": True, "user": user}

@app.route("/login")
def login():
    if not AUTH0_DOMAIN or not AUTH0_CLIENT_ID or not AUTH0_CLIENT_SECRET:
        return redirect("/")
    state = os.urandom(16).hex()
    session["oauth_state"] = state
    provider = request.args.get("provider")
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
        data = {
            "model": os.environ.get("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe")
        }
        r = requests.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {OPENAI_KEY}"},
            data=data,
            files=files,
            timeout=45
        )
        if r.status_code >= 400:
            return {"error": "Transcription failed", "status": r.status_code, "detail": r.text[:300]}, 500
        out = r.json()
        return {"text": out.get("text", "")}
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
