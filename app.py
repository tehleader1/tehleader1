from flask import Flask, jsonify, request, send_from_directory, Response, session, redirect, render_template_string
import json
import random
import smtplib
import ssl
import threading
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from html import escape
import os
import re
import requests
import time
import sqlite3
import zipfile
from datetime import datetime, timedelta
import hmac
import hashlib
import base64
from io import BytesIO
from apscheduler.schedulers.background import BackgroundScheduler
from openai import OpenAI

from engine_routes import engine
from content_engine import trending_products, reorder_suggestions
from backend.render_status import render_status_bp

app = Flask(__name__, static_folder="static")
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or os.urandom(32)

app.register_blueprint(engine)
app.register_blueprint(render_status_bp)

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
SHOPIFY_WEBHOOK_SECRET = os.environ.get("SHOPIFY_WEBHOOK_SECRET", "")
SHOPIFY_PLAN_VARIANT_MAP_JSON = os.environ.get("SHOPIFY_PLAN_VARIANT_MAP_JSON", "")
SHOPIFY_PLAN_SKU_MAP_JSON = os.environ.get("SHOPIFY_PLAN_SKU_MAP_JSON", "")
STUDIO_STORAGE_DIR = os.environ.get("STUDIO_STORAGE_DIR", os.path.join(app.root_path, "studio_data"))
VALID_SUBSCRIPTION_PLANS = {
    "free",
    "premium",
    "pro",
    "studio100",
    "yoda",
    "bingo100",
    "family200",
    "fantasy300",
    "fantasy600",
}
PREMIUM_SUBSCRIPTION_PLANS = {"premium", "bingo100", "family200", "fantasy300", "fantasy600"}
STUDIO_JAKE_ALLOWED_PLANS = {"pro", "studio100"}

def normalize_shopify_store_domain(raw_store):
    value = (raw_store or "").strip()
    if not value:
        return ""
    value = re.sub(r"^https?://", "", value, flags=re.I).strip().strip("/")
    value = value.split("/")[0].strip()
    if value and "." not in value:
        value = f"{value}.myshopify.com"
    return value

def resolve_shopify_api_domain():
    store = normalize_shopify_store_domain(SHOPIFY_STORE)
    if store == "shop.supportrd.com":
        return "supportdr-com.myshopify.com"
    if store and store.endswith("supportrd.com"):
        return "supportdr-com.myshopify.com"
    return store

def resolve_shopify_storefront_domain():
    # Keep the live storefront/cart domain separate from the app domain so
    # Shopify checkout can open on the real store without looping back into
    # the Render-hosted SupportRD app.
    configured_store = normalize_shopify_store_domain(SHOPIFY_STORE)
    if configured_store == "shop.supportrd.com":
        return "shop.supportrd.com"
    store = resolve_shopify_api_domain()
    if not store:
        return ""
    store = normalize_shopify_store_domain(store)
    if store.endswith(".myshopify.com"):
        return store
    if store.endswith("supportrd.com") or store.endswith("theplantmaninc.com"):
        return "supportdr-com.myshopify.com"
    return "supportdr-com.myshopify.com"

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
WELLNESS_SUBJECT = os.environ.get("WELLNESS_SUBJECT", "SupportRD Personal Check-In")
COMMUNITY_ALERT_PRIMARY_EMAIL = os.environ.get("COMMUNITY_ALERT_PRIMARY_EMAIL", "agentanthony@supportrd.com")
COMMUNITY_ALERT_SECONDARY_EMAIL = os.environ.get("COMMUNITY_ALERT_SECONDARY_EMAIL", "xxfigueroa1993@yahoo.com")
COMMUNITY_ALERT_PHONE = os.environ.get("COMMUNITY_ALERT_PHONE", "980-375-9197")
COMMUNITY_ALERT_SMS_EMAIL = os.environ.get("COMMUNITY_ALERT_SMS_EMAIL", "")
COMMUNITY_ALERT_EXTRA_EMAILS = [
    e.strip().lower()
    for e in os.environ.get(
        "COMMUNITY_ALERT_EXTRA_EMAILS",
        "agentanhony@supportrd.com,agentanthony@supportrd.com",
    ).split(",")
    if e.strip()
]

DEFAULT_SHOPIFY_PLAN_SKU_MAP = {
    "premium": {"hairadvisorpremium", "premium35", "srdpremium35"},
    "pro": {"professionalhairadvisor", "pro50", "srdpro50"},
    "bingo100": {"bingofantasy100", "bingo100", "srdbingo100"},
    "family200": {"familyfantasy200", "family200", "srdfamily200"},
    "yoda": {"yodapass", "yoda20", "srdyoda20"},
    "fantasy300": {"basicfantasy21plus300", "fantasy300", "srdfantasy300"},
    "fantasy600": {"advancedfantasy21plus600", "fantasy600", "srdfantasy600"},
}

DEFAULT_SHOPIFY_PLAN_TITLE_PATTERNS = [
    ("fantasy600", ["advanced fantasy 21+", "advanced fantasy"]),
    ("fantasy300", ["basic fantasy 21+", "basic fantasy"]),
    ("family200", ["family fantasy pack", "family fantasy"]),
    ("bingo100", ["bingo fantasy"]),
    ("yoda", ["yoda pass"]),
    ("pro", ["unlimited aria professional", "professional hair advisor"]),
    ("premium", ["aria puzzle tier", "hair advisor premium"]),
]

PUBLIC_SHOPIFY_CHECKOUT_META = {
    "premium": {"label": "Aria Premium", "price_label": "$35 premium"},
    "pro": {"label": "Jake Studio Pro", "price_label": "$50 pro"},
    "yoda": {"label": "Diary Private Lane", "price_label": "$20 add-on"},
    "bingo100": {"label": "Bingo Fantasy", "price_label": "$100 monthly"},
    "family200": {"label": "Support Bundle", "price_label": "$200 family"},
    "fantasy300": {"label": "21+ Fantasies Basic", "price_label": "$300 basic"},
    "fantasy600": {"label": "21+ Fantasies Advanced", "price_label": "$600 advanced"},
}

def _normalize_key(value):
    return re.sub(r"[^a-z0-9]+", "", (value or "").strip().lower())

def _load_shopify_plan_maps():
    sku_map = {k: set(v) for k, v in DEFAULT_SHOPIFY_PLAN_SKU_MAP.items()}
    variant_map = {}
    try:
        if SHOPIFY_PLAN_SKU_MAP_JSON:
            custom = json.loads(SHOPIFY_PLAN_SKU_MAP_JSON)
            if isinstance(custom, dict):
                for plan, vals in custom.items():
                    if isinstance(vals, list):
                        sku_map[str(plan).strip().lower()] = {_normalize_key(v) for v in vals if str(v).strip()}
    except Exception:
        pass
    try:
        if SHOPIFY_PLAN_VARIANT_MAP_JSON:
            custom_variants = json.loads(SHOPIFY_PLAN_VARIANT_MAP_JSON)
            if isinstance(custom_variants, dict):
                for variant_id, plan in custom_variants.items():
                    vid = str(variant_id).strip()
                    p = str(plan).strip().lower()
                    if vid and p:
                        variant_map[vid] = p
    except Exception:
        pass
    return sku_map, variant_map

SHOPIFY_PLAN_SKU_MAP, SHOPIFY_PLAN_VARIANT_MAP = _load_shopify_plan_maps()

def get_public_shopify_checkout_map():
    reverse_map = {}
    for variant_id, plan in SHOPIFY_PLAN_VARIANT_MAP.items():
        plan_key = str(plan or "").strip().lower()
        clean_variant = str(variant_id or "").strip()
        if plan_key and clean_variant and plan_key not in reverse_map:
            reverse_map[plan_key] = clean_variant
    payload = {}
    for plan_key, meta in PUBLIC_SHOPIFY_CHECKOUT_META.items():
        variant_id = reverse_map.get(plan_key, "")
        payload[plan_key] = {
            **meta,
            "variant_id": variant_id,
            "checkout_path": f"/checkout/{variant_id}?src=remote" if variant_id else "",
        }
    return payload

def infer_shopify_plan_from_line_items(items):
    rows = items if isinstance(items, list) else []
    for item in rows:
        variant_id = str(item.get("variant_id") or "").strip()
        if variant_id and variant_id in SHOPIFY_PLAN_VARIANT_MAP:
            return SHOPIFY_PLAN_VARIANT_MAP[variant_id], f"variant_id:{variant_id}"
    for item in rows:
        sku_norm = _normalize_key(item.get("sku") or "")
        if not sku_norm:
            continue
        for plan, sku_set in SHOPIFY_PLAN_SKU_MAP.items():
            if sku_norm in sku_set:
                return plan, f"sku:{sku_norm}"
    for item in rows:
        title = (item.get("title") or "").strip().lower()
        for plan, patterns in DEFAULT_SHOPIFY_PLAN_TITLE_PATTERNS:
            if any(pat in title for pat in patterns):
                return plan, f"title:{patterns[0]}"
    return None, "no_match"
COMMUNITY_ALERT_THRESHOLD = float(os.environ.get("COMMUNITY_ALERT_THRESHOLD", "75"))
COMMUNITY_TARGET_RATIO = float(os.environ.get("COMMUNITY_TARGET_RATIO", "0.70"))
MONEY_GUARD_DROP_PCT = float(os.environ.get("MONEY_GUARD_DROP_PCT", "35"))
SEO_RANDOM_ENABLED = os.environ.get("SEO_RANDOM_ENABLED", "false").lower() == "true"
SEO_RANDOM_JOB_IDS = []
SEO_TRIGGER_TOKEN = os.environ.get("SEO_TRIGGER_TOKEN", "")
CLAIM_CODES = [c.strip().upper() for c in os.environ.get("CLAIM_CODES", "SRD2026,NEW4ALL").split(",") if c.strip()]
CLAIM_NAMES = [n.strip() for n in os.environ.get("CLAIM_NAMES", "Reptar,MrGiggles").split(",") if n.strip()]
CLAIM_DB_PATH = os.environ.get("CLAIM_DB_PATH", "users.db")
CREDIT_DB_PATH = os.environ.get("CREDIT_DB_PATH", CLAIM_DB_PATH)
CREDIT_MAX_PAYMENT_RATIO = float(os.environ.get("CREDIT_MAX_PAYMENT_RATIO", "0.30"))
CREDIT_MIN_TERM_MONTHS = int(os.environ.get("CREDIT_MIN_TERM_MONTHS", "1"))
CREDIT_MAX_TERM_MONTHS = int(os.environ.get("CREDIT_MAX_TERM_MONTHS", "24"))
CREDIT_BLOCKED_COUNTRIES = set([c.strip().upper() for c in os.environ.get("CREDIT_BLOCKED_COUNTRIES", "").split(",") if c.strip()])
SECURITY_DB_PATH = os.environ.get("SECURITY_DB_PATH", CREDIT_DB_PATH)
SEC_BAN_MINUTES = int(os.environ.get("SEC_BAN_MINUTES", "1440"))
SEC_RATE_WINDOW_SEC = int(os.environ.get("SEC_RATE_WINDOW_SEC", "60"))
SEC_RATE_MAX_PER_WINDOW = int(os.environ.get("SEC_RATE_MAX_PER_WINDOW", "180"))
SEC_CREDIT_WINDOW_SEC = int(os.environ.get("SEC_CREDIT_WINDOW_SEC", "300"))
SEC_CREDIT_MAX_PER_WINDOW = int(os.environ.get("SEC_CREDIT_MAX_PER_WINDOW", "30"))
SEC_CREDIT_USER_COOLDOWN_SEC = int(os.environ.get("SEC_CREDIT_USER_COOLDOWN_SEC", "180"))
CREDIT_MANUAL_REVIEW_THRESHOLD = float(os.environ.get("CREDIT_MANUAL_REVIEW_THRESHOLD", "5000"))
CREDIT_MAX_OPEN_OBLIGATIONS = int(os.environ.get("CREDIT_MAX_OPEN_OBLIGATIONS", "1"))
FREEZE_MINUTES = int(os.environ.get("FREEZE_MINUTES", "1440"))
CASH_MAX_AMOUNT = float(os.environ.get("CASH_MAX_AMOUNT", "25000"))
TRADE_LOCK_DAYS = int(os.environ.get("TRADE_LOCK_DAYS", "7"))
TRADE_REVERIFY_MAX_FAILS = int(os.environ.get("TRADE_REVERIFY_MAX_FAILS", "2"))
TRADE_MAX_USD = float(os.environ.get("TRADE_MAX_USD", "50000"))
TRADE_SERVICE_TAX_RATE = float(os.environ.get("TRADE_SERVICE_TAX_RATE", "0.05"))
TRADE_BOT_INTERVAL_MIN = int(os.environ.get("TRADE_BOT_INTERVAL_MIN", "1"))
ACCEPTED_PAYMENT_NETWORKS = ["Visa", "Mastercard", "American Express", "Discover", "Debit / ATM Cards", "Cash"]
MAJOR_BANKS = [
    "U.S. Bank",
    "Bank of America",
    "Wells Fargo",
    "Woodforest National Bank",
    "JPMorgan Chase",
    "Citi",
    "Capital One",
    "PNC",
    "Truist",
    "TD Bank",
    "USAA",
    "Ally Bank",
]
TTS_ALLOWED_VOICES = {"alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"}
PROHIBITED_TERMS = ["drug", "drugs", "cocaine", "meth", "weed", "marijuana", "heroin", "fentanyl", "gang", "gangs", "cartel", "ms-13", "crip", "bloods"]
COMPETITION_BLOCKED_TOKENS = ["porn", "pornography", "xxx", "sex", "nsfw", "adultvideo"]
TRADE_BOT_FUNCTIONS = {
    "risk": [
        "Enforce $50,000 transfer cap",
        "Enforce 5% in-house service tax math",
        "Flag out-of-policy transfer states"
    ],
    "ops": [
        "Auto-expire stale transfer requests",
        "Track queue counts by status",
        "Keep re-verification flow healthy"
    ],
    "comms": [
        "Block pornography in competition links",
        "Keep scoring metrics fixed to laughs/excitement/votes",
        "Report policy-hold events"
    ]
}
SAFE_21PLUS_FUN_LINES = [
    "Hair date energy: I bring the shine plan, you bring the smile.",
    "Mamacita, ese amor por tu pelo se nota hoy.",
    "Stressful day? Let me coach your hair into chill mode.",
    "You and your hair are the main character today.",
    "Funny truth: your split ends just resigned from the company.",
]
BASIC_21PLUS_LINES = [
    "Really what I’m saying is I like your vibe, my king - now let’s lock your hair flow.",
    "When are we doing dinner-ready hair, my king? I brought the shine plan.",
    "You look like a soft launch and a main event at the same time. Hair first, then fun.",
    "You had a long day - relax, I’m on hair duty and I brought the glow.",
]
ADVANCED_21PLUS_LINES = [
    "I’m in love with the way your confidence grows when your hair routine hits right.",
    "Let’s make your next hair result feel like a love story worth sharing.",
    "Your look has heart, presence, and purpose - let’s shape it like a signature moment.",
    "I’m here for you: calm plan, real care, and a finish that feels unforgettable.",
]

RATE_TRACKER = {}
DUP_TRACKER = {}
SEC_LOCK = threading.Lock()
SUSPICIOUS_PATH_TOKENS = [
    "/.git", "/.env", "/wp-admin", "/phpmyadmin", "/server-status",
    "/terminal", "/console", "/shell", "/cmd", "/powershell", "/ssh",
    "/id_rsa", "/passwd", "/config", "/backup", "/dump"
]

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

def init_credit_db():
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS credit_decisions ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "email TEXT,"
            "country TEXT,"
            "requested_amount REAL,"
            "term_months INTEGER,"
            "monthly_income REAL,"
            "monthly_debt REAL,"
            "estimated_payment REAL,"
            "allowed_payment REAL,"
            "approved_amount REAL,"
            "status TEXT,"
            "reason TEXT,"
            "application_uuid TEXT,"
            "obligation_status TEXT DEFAULT 'none',"
            "decision_at TEXT"
            ")"
        )
        try:
            cur.execute("ALTER TABLE credit_decisions ADD COLUMN application_uuid TEXT")
        except:
            pass
        try:
            cur.execute("ALTER TABLE credit_decisions ADD COLUMN obligation_status TEXT DEFAULT 'none'")
        except:
            pass
        cur.execute(
            "CREATE TABLE IF NOT EXISTS credit_requests ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "idempotency_key TEXT UNIQUE,"
            "email TEXT,"
            "ip TEXT,"
            "created_at TEXT,"
            "response_json TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS account_freezes ("
            "email TEXT PRIMARY KEY,"
            "reason TEXT,"
            "until_ts INTEGER,"
            "created_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS credit_audit ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "application_uuid TEXT,"
            "email TEXT,"
            "event_type TEXT,"
            "event_json TEXT,"
            "prev_hash TEXT,"
            "event_hash TEXT,"
            "created_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS lead_requests ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "request_id TEXT UNIQUE,"
            "name TEXT,"
            "phone TEXT,"
            "email TEXT,"
            "address TEXT,"
            "notes TEXT,"
            "consent INTEGER DEFAULT 0,"
            "status TEXT DEFAULT 'pending',"
            "wait_message TEXT,"
            "created_at TEXT,"
            "updated_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS cash_point_events ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "request_id TEXT,"
            "email TEXT,"
            "flow_type TEXT,"
            "event_type TEXT,"
            "location TEXT,"
            "amount REAL,"
            "proof_ref TEXT,"
            "confirmed_by TEXT,"
            "memo TEXT,"
            "prev_hash TEXT,"
            "event_hash TEXT,"
            "created_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS account_transfer_requests ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "request_id TEXT UNIQUE,"
            "from_email TEXT,"
            "to_email TEXT,"
            "aria_plan TEXT,"
            "transfer_amount REAL DEFAULT 0,"
            "id_last4_hash TEXT,"
            "visa_last4_hash TEXT,"
            "status TEXT,"
            "reverify_passed INTEGER DEFAULT 0,"
            "reverify_needed INTEGER DEFAULT 2,"
            "created_at TEXT,"
            "updated_at TEXT"
            ")"
        )
        try:
            cur.execute("ALTER TABLE account_transfer_requests ADD COLUMN reverify_passed INTEGER DEFAULT 0")
        except:
            pass
        try:
            cur.execute("ALTER TABLE account_transfer_requests ADD COLUMN reverify_needed INTEGER DEFAULT 2")
        except:
            pass
        try:
            cur.execute("ALTER TABLE account_transfer_requests ADD COLUMN transfer_amount REAL DEFAULT 0")
        except:
            pass
        cur.execute(
            "CREATE TABLE IF NOT EXISTS competitions ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "competition_id TEXT UNIQUE,"
            "owner_email TEXT,"
            "opponent_url TEXT,"
            "membership_tier TEXT,"
            "status TEXT,"
            "created_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS movement_challenges ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "challenge_id TEXT UNIQUE,"
            "owner_email TEXT,"
            "participant_urls TEXT,"
            "areas TEXT,"
            "status TEXT,"
            "created_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS competition_sessions ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "session_id TEXT UNIQUE,"
            "owner_email TEXT,"
            "duration_minutes INTEGER,"
            "bet_amount REAL,"
            "payment_source TEXT,"
            "status TEXT,"
            "started_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS trade_controls ("
            "email TEXT PRIMARY KEY,"
            "failed_reverify INTEGER DEFAULT 0,"
            "lock_until_ts INTEGER DEFAULT 0,"
            "updated_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS trade_bot_state ("
            "bot_id TEXT PRIMARY KEY,"
            "last_run_at TEXT,"
            "last_status TEXT,"
            "last_summary TEXT,"
            "last_metrics_json TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS trade_bot_heartbeat_log ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "bot_id TEXT,"
            "beat_mode TEXT,"
            "source TEXT,"
            "status TEXT,"
            "metrics_json TEXT,"
            "created_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS engine_snapshots ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "source TEXT,"
            "content TEXT,"
            "created_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass

def audit_prev_hash(cur):
    try:
        cur.execute("SELECT event_hash FROM credit_audit ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        return (row[0] if row else "") or ""
    except:
        return ""

def append_credit_audit(application_uuid, email, event_type, event_data):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        prev = audit_prev_hash(cur)
        payload = json.dumps(event_data or {}, sort_keys=True, separators=(",", ":"))
        raw = f"{prev}|{application_uuid}|{email}|{event_type}|{payload}"
        event_hash = hashlib.sha256(raw.encode("utf-8")).hexdigest()
        cur.execute(
            "INSERT INTO credit_audit (application_uuid, email, event_type, event_json, prev_hash, event_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (application_uuid, email, event_type, payload, prev, event_hash, datetime.utcnow().isoformat() + "Z")
        )
        conn.commit()
        conn.close()
    except:
        pass

def frozen_reason(email):
    if not email:
        return None
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT reason, until_ts FROM account_freezes WHERE email = ? LIMIT 1", (email.lower(),))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        until_ts = int(row[1] or 0)
        if until_ts <= int(time.time()):
            return None
        return row[0] or "frozen"
    except:
        return None

def freeze_account(email, reason):
    if not email:
        return
    try:
        until_ts = int(time.time()) + FREEZE_MINUTES * 60
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO account_freezes (email, reason, until_ts, created_at) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(email) DO UPDATE SET reason=excluded.reason, until_ts=excluded.until_ts, created_at=excluded.created_at",
            (email.lower(), reason[:160], until_ts, datetime.utcnow().isoformat() + "Z")
        )
        conn.commit()
        conn.close()
    except:
        pass

def open_obligations_count(email):
    if not email:
        return 0
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) FROM credit_decisions WHERE email = ? AND obligation_status = 'open'",
            (email.lower(),)
        )
        row = cur.fetchone()
        conn.close()
        return int(row[0] or 0) if row else 0
    except:
        return 0

def remember_idempotency(idem_key, email, ip, response_obj):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO credit_requests (idempotency_key, email, ip, created_at, response_json) VALUES (?, ?, ?, ?, ?)",
            (idem_key, email, ip, datetime.utcnow().isoformat() + "Z", json.dumps(response_obj))
        )
        conn.commit()
        conn.close()
        return True
    except:
        return False

def idempotency_response(idem_key):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT response_json FROM credit_requests WHERE idempotency_key = ? LIMIT 1", (idem_key,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return json.loads(row[0] or "{}")
    except:
        return None

def new_request_id():
    return f"SRD-{uuid.uuid4().hex[:12].upper()}"

def upsert_lead_request(row):
    try:
        now = datetime.utcnow().isoformat() + "Z"
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO lead_requests (request_id, name, phone, email, address, notes, consent, status, wait_message, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(request_id) DO UPDATE SET "
            "name=excluded.name, phone=excluded.phone, email=excluded.email, address=excluded.address, notes=excluded.notes, "
            "consent=excluded.consent, status=excluded.status, wait_message=excluded.wait_message, updated_at=excluded.updated_at",
            (
                row.get("request_id"),
                (row.get("name") or "")[:120],
                (row.get("phone") or "")[:80],
                (row.get("email") or "").lower()[:120],
                (row.get("address") or "")[:240],
                (row.get("notes") or "")[:500],
                1 if row.get("consent") else 0,
                (row.get("status") or "pending")[:40],
                (row.get("wait_message") or "")[:240],
                now,
                now,
            ),
        )
        conn.commit()
        conn.close()
        return True
    except:
        return False

def get_lead_request(request_id):
    if not request_id:
        return None
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT request_id, name, phone, email, address, notes, consent, status, wait_message, created_at, updated_at "
            "FROM lead_requests WHERE request_id = ? LIMIT 1",
            (request_id,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return {
            "request_id": row[0],
            "name": row[1],
            "phone": row[2],
            "email": row[3],
            "address": row[4],
            "notes": row[5],
            "consent": bool(row[6]),
            "status": row[7],
            "wait_message": row[8],
            "created_at": row[9],
            "updated_at": row[10],
        }
    except:
        return None

def chain_prev_hash(cur):
    try:
        cur.execute("SELECT event_hash FROM cash_point_events ORDER BY id DESC LIMIT 1")
        row = cur.fetchone()
        return (row[0] if row else "") or ""
    except:
        return ""

def append_cash_point_event(request_id, email, flow_type, event_type, location="", amount=0.0, proof_ref="", confirmed_by="", memo=""):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        prev = chain_prev_hash(cur)
        payload = json.dumps(
            {
                "request_id": request_id,
                "email": email or "",
                "flow_type": flow_type or "",
                "event_type": event_type or "",
                "location": location or "",
                "amount": float(amount or 0),
                "proof_ref": proof_ref or "",
                "confirmed_by": confirmed_by or "",
                "memo": memo or "",
            },
            sort_keys=True,
            separators=(",", ":"),
        )
        event_hash = hashlib.sha256(f"{prev}|{payload}".encode("utf-8")).hexdigest()
        cur.execute(
            "INSERT INTO cash_point_events (request_id, email, flow_type, event_type, location, amount, proof_ref, confirmed_by, memo, prev_hash, event_hash, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                (request_id or "")[:40],
                (email or "").lower()[:120],
                (flow_type or "")[:20],
                (event_type or "")[:30],
                (location or "")[:240],
                float(amount or 0),
                (proof_ref or "")[:200],
                (confirmed_by or "")[:120],
                (memo or "")[:500],
                prev,
                event_hash,
                datetime.utcnow().isoformat() + "Z",
            ),
        )
        conn.commit()
        conn.close()
        return True
    except:
        return False

def send_admin_alert(event_type, priority, request_id, location, summary):
    def alert_recipients():
        out = []
        for em in [COMMUNITY_ALERT_PRIMARY_EMAIL, COMMUNITY_ALERT_SECONDARY_EMAIL, DEVELOPER_EMAIL, ADMIN_EMAIL] + COMMUNITY_ALERT_EXTRA_EMAILS:
            v = (em or "").strip().lower()
            if v and "@" in v and v not in out:
                out.append(v)
        return out

    recipients = alert_recipients()
    if not recipients:
        return {"ok": False, "error": "no_recipients"}
    subject = f"SupportRD Alert · {(event_type or 'general').strip()[:40]}"
    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
      <h2 style="margin:0 0 8px;">SupportRD Admin Alert</h2>
      <p><strong>Priority:</strong> {(priority or "normal")[:20]}</p>
      <p><strong>Request ID:</strong> {(request_id or "n/a")[:40]}</p>
      <p><strong>Location:</strong> {(location or "n/a")[:240]}</p>
      <p><strong>Summary:</strong> {(summary or "n/a")[:600]}</p>
      <p style="margin-top:10px;">#SupportRD is moving</p>
    </div>
    """
    sent = 0
    failed = 0
    for em in recipients:
        ok, _detail = send_smtp_html(em, subject, html)
        if ok:
            sent += 1
        else:
            failed += 1
    sms_fallback = False
    if sent == 0 and COMMUNITY_ALERT_SMS_EMAIL:
        ok, _detail = send_smtp_html(COMMUNITY_ALERT_SMS_EMAIL, subject, html)
        sms_fallback = bool(ok)
    return {"ok": sent > 0 or sms_fallback, "sent": sent, "failed": failed, "recipients": len(recipients), "sms_fallback": sms_fallback}

def _alert_recipients_list():
    recipients = []
    for em in [COMMUNITY_ALERT_PRIMARY_EMAIL, COMMUNITY_ALERT_SECONDARY_EMAIL, DEVELOPER_EMAIL, ADMIN_EMAIL] + COMMUNITY_ALERT_EXTRA_EMAILS:
        v = (em or "").strip().lower()
        if v and "@" in v and v not in recipients:
            recipients.append(v)
    return recipients

def _pdf_escape(text):
    return str(text or "").replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")

def _build_intro_brochure_pdf():
    lines = [
        "SupportRD - Admin Introduction Brochure",
        "",
        "Welcome to the Special Admin Lane.",
        "You are receiving this because your channel is trusted for emergency and business continuity alerts.",
        "",
        "What is active now:",
        "- SAR RED emergency lane",
        "- Search + rescue + legal escalation routing",
        "- Direct contacts and alert fan-out",
        "- CEO / Inner Circle transfer-lane controls",
        "",
        "Core contacts:",
        f"- Primary: {COMMUNITY_ALERT_PRIMARY_EMAIL}",
        f"- Secondary: {COMMUNITY_ALERT_SECONDARY_EMAIL}",
        f"- Phone: {COMMUNITY_ALERT_PHONE}",
        "",
        "#SupportRD is moving",
    ]
    y = 760
    content = ["BT", "/F1 13 Tf", "50 800 Td", f"({_pdf_escape(lines[0])}) Tj", "ET", "BT", "/F1 11 Tf"]
    for line in lines[1:]:
        content.append(f"50 {y} Td")
        content.append(f"({_pdf_escape(line)}) Tj")
        y -= 20
    content.append("ET")
    stream = "\n".join(content).encode("latin-1", "replace")
    objs = []
    objs.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objs.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objs.append(b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n")
    objs.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
    objs.append(f"5 0 obj << /Length {len(stream)} >> stream\n".encode("latin-1") + stream + b"\nendstream endobj\n")
    out = bytearray(b"%PDF-1.4\n")
    xref = [0]
    for obj in objs:
        xref.append(len(out))
        out.extend(obj)
    xref_pos = len(out)
    out.extend(f"xref\n0 {len(xref)}\n".encode("latin-1"))
    out.extend(b"0000000000 65535 f \n")
    for off in xref[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode("latin-1"))
    out.extend(f"trailer << /Size {len(xref)} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("latin-1"))
    return bytes(out)

def send_intro_brochure_email(to_email, subject="SupportRD Admin Introduction Brochure"):
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD and (FROM_EMAIL or SMTP_USER)):
        return {"ok": False, "error": "email_not_configured"}
    target = (to_email or "").strip().lower()
    if not target or "@" not in target:
        return {"ok": False, "error": "valid_email_required"}
    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;background:#f6f8fc;padding:18px;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e1e6f0;border-radius:14px;padding:20px;">
        <h1 style="margin:0 0 8px;font-size:26px;color:#0f1b2e;">SupportRD Admin Introduction</h1>
        <p style="margin:0 0 12px;color:#384860;">Special admin lane is active for emergency, legal escalation, and clean operations.</p>
        <div style="background:linear-gradient(120deg,#0f223f,#173c6f);color:#fff;padding:14px 16px;border-radius:12px;">
          <strong>#SupportRD is moving</strong><br>
          SAR RED, direct contact lane, and secure transfer controls are now active.
        </div>
        <ul style="margin:14px 0 0 18px;color:#23324a;">
          <li>Search & rescue + legal escalation routing</li>
          <li>CEO / Inner Circle transfer-lane protections</li>
          <li>Admin alert fan-out to special contacts</li>
        </ul>
        <p style="margin-top:14px;color:#4c5a70;">The PDF brochure is attached.</p>
      </div>
    </div>
    """
    msg = MIMEMultipart("mixed")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL or SMTP_USER
    msg["To"] = target
    alt = MIMEMultipart("alternative")
    alt.attach(MIMEText(html, "html"))
    msg.attach(alt)
    pdf_bytes = _build_intro_brochure_pdf()
    part = MIMEApplication(pdf_bytes, _subtype="pdf")
    part.add_header("Content-Disposition", "attachment", filename="SupportRD-Admin-Introduction-Brochure.pdf")
    msg.attach(part)
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(msg["From"], [target], msg.as_string())
        return {"ok": True, "to": target, "subject": subject}
    except Exception as e:
        return {"ok": False, "error": "email_send_failed", "detail": str(e)[:300]}

def hash_sensitive(label, value):
    raw = f"{label}|{(value or '').strip()}|{app.secret_key}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def trade_lock_until(email):
    if not email:
        return 0
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT lock_until_ts FROM trade_controls WHERE email = ? LIMIT 1", (email.lower(),))
        row = cur.fetchone()
        conn.close()
        return int(row[0] or 0) if row else 0
    except:
        return 0

def record_reverify_result(email, passed):
    if not email:
        return
    now_ts = int(time.time())
    now_iso = datetime.utcnow().isoformat() + "Z"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT failed_reverify, lock_until_ts FROM trade_controls WHERE email = ? LIMIT 1", (email.lower(),))
        row = cur.fetchone()
        fails = int(row[0] or 0) if row else 0
        lock_until = int(row[1] or 0) if row else 0
        if passed:
            fails = 0
        else:
            fails += 1
            if fails >= TRADE_REVERIFY_MAX_FAILS:
                lock_until = now_ts + (TRADE_LOCK_DAYS * 24 * 3600)
                fails = 0
        cur.execute(
            "INSERT INTO trade_controls (email, failed_reverify, lock_until_ts, updated_at) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(email) DO UPDATE SET failed_reverify=excluded.failed_reverify, lock_until_ts=excluded.lock_until_ts, updated_at=excluded.updated_at",
            (email.lower(), fails, lock_until, now_iso),
        )
        conn.commit()
        conn.close()
    except:
        pass

def parse_iso_utc(ts):
    try:
        if not ts:
            return None
        txt = str(ts).strip()
        if txt.endswith("Z"):
            txt = txt[:-1] + "+00:00"
        return datetime.fromisoformat(txt)
    except:
        return None

def set_trade_bot_state(bot_id, status, summary, metrics):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO trade_bot_state (bot_id, last_run_at, last_status, last_summary, last_metrics_json) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(bot_id) DO UPDATE SET last_run_at=excluded.last_run_at, last_status=excluded.last_status, last_summary=excluded.last_summary, last_metrics_json=excluded.last_metrics_json",
            (
                bot_id,
                datetime.utcnow().isoformat() + "Z",
                (status or "ok")[:20],
                (summary or "")[:240],
                json.dumps(metrics or {}, separators=(",", ":"))[:2000]
            )
        )
        conn.commit()
        conn.close()
    except:
        pass

def get_trade_bot_state():
    out = {}
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT bot_id, last_run_at, last_status, last_summary, last_metrics_json FROM trade_bot_state")
        rows = cur.fetchall() or []
        conn.close()
        for r in rows:
            metrics = {}
            try:
                metrics = json.loads(r[4] or "{}")
            except:
                metrics = {}
            out[r[0]] = {
                "last_run_at": r[1],
                "last_status": r[2],
                "last_summary": r[3],
                "metrics": metrics
            }
    except:
        return {}
    return out

def get_recent_credit_audit(limit=20):
    rows_out = []
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT application_uuid, email, event_type, event_json, created_at FROM credit_audit ORDER BY id DESC LIMIT ?", (int(limit),))
        rows = cur.fetchall() or []
        conn.close()
        for r in rows:
            rows_out.append({
                "application_uuid": r[0],
                "email": r[1],
                "event_type": r[2],
                "event_json": r[3],
                "created_at": r[4]
            })
    except:
        return []
    return rows_out

def append_engine_snapshot(content, source="ui"):
    try:
        txt = (content or "").strip()
        if not txt:
            return False
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO engine_snapshots (source, content, created_at) VALUES (?, ?, ?)",
            ((source or "ui")[:120], txt[:600], datetime.utcnow().isoformat() + "Z")
        )
        conn.commit()
        conn.close()
        return True
    except:
        return False

def get_engine_snapshots(limit=6):
    out = []
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT source, content, created_at FROM engine_snapshots ORDER BY id DESC LIMIT ?", (int(limit),))
        rows = cur.fetchall() or []
        conn.close()
        for s, c, t in rows:
            out.append({"source": s, "content": c, "created_at": t})
    except:
        return []
    return out

def run_risk_bot():
    flagged = 0
    queue_open = 0
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT request_id, transfer_amount, status FROM account_transfer_requests WHERE status IN ('reverify_required','pending_review')")
        rows = cur.fetchall() or []
        queue_open = len(rows)
        for req_id, amt, status in rows:
            if float(amt or 0) > TRADE_MAX_USD:
                cur.execute("UPDATE account_transfer_requests SET status = ?, updated_at = ? WHERE request_id = ?", ("blocked_cap", datetime.utcnow().isoformat() + "Z", req_id))
                append_credit_audit(req_id, "system", "risk_bot_blocked_cap", {"transfer_amount": float(amt or 0), "cap": TRADE_MAX_USD, "prev_status": status})
                flagged += 1
        conn.commit()
        conn.close()
        summary = f"Risk bot scanned {queue_open} open transfer requests; flagged {flagged}."
        metrics = {"open_requests": queue_open, "flagged_cap": flagged, "trade_cap_usd": TRADE_MAX_USD, "service_tax_rate": TRADE_SERVICE_TAX_RATE}
        set_trade_bot_state("risk", "ok", summary, metrics)
        return {"bot_id": "risk", "status": "ok", "summary": summary, "metrics": metrics}
    except Exception as e:
        summary = f"Risk bot error: {str(e)[:120]}"
        set_trade_bot_state("risk", "error", summary, {"error": str(e)[:120]})
        return {"bot_id": "risk", "status": "error", "summary": summary, "metrics": {"error": str(e)[:120]}}

def run_ops_bot():
    expired_reverify = 0
    expired_pending = 0
    counts = {"reverify_required": 0, "pending_review": 0, "approved": 0, "blocked_cap": 0}
    try:
        now = datetime.utcnow()
        reverify_cutoff = now - timedelta(hours=48)
        pending_cutoff = now - timedelta(hours=72)
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT request_id, status, updated_at FROM account_transfer_requests WHERE status IN ('reverify_required','pending_review')")
        rows = cur.fetchall() or []
        for req_id, status, updated_at in rows:
            dt = parse_iso_utc(updated_at) or now
            if status == "reverify_required" and dt < reverify_cutoff:
                cur.execute("UPDATE account_transfer_requests SET status = ?, updated_at = ? WHERE request_id = ?", ("expired", datetime.utcnow().isoformat() + "Z", req_id))
                append_credit_audit(req_id, "system", "ops_bot_expired_reverify", {"hours_old": 48})
                expired_reverify += 1
            elif status == "pending_review" and dt < pending_cutoff:
                cur.execute("UPDATE account_transfer_requests SET status = ?, updated_at = ? WHERE request_id = ?", ("expired", datetime.utcnow().isoformat() + "Z", req_id))
                append_credit_audit(req_id, "system", "ops_bot_expired_pending", {"hours_old": 72})
                expired_pending += 1
        cur.execute("SELECT status, COUNT(*) FROM account_transfer_requests GROUP BY status")
        stats = cur.fetchall() or []
        for k, v in stats:
            counts[k] = int(v or 0)
        conn.commit()
        conn.close()
        summary = f"Ops bot active. expired reverify={expired_reverify}, expired pending={expired_pending}."
        metrics = {"expired_reverify": expired_reverify, "expired_pending": expired_pending, "counts": counts}
        set_trade_bot_state("ops", "ok", summary, metrics)
        return {"bot_id": "ops", "status": "ok", "summary": summary, "metrics": metrics}
    except Exception as e:
        summary = f"Ops bot error: {str(e)[:120]}"
        set_trade_bot_state("ops", "error", summary, {"error": str(e)[:120]})
        return {"bot_id": "ops", "status": "error", "summary": summary, "metrics": {"error": str(e)[:120]}}

def run_comms_bot():
    policy_holds = 0
    reviewed = 0
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT competition_id, opponent_url, status FROM competitions WHERE status IN ('active','pending')")
        for cid, url, status in (cur.fetchall() or []):
            reviewed += 1
            if not competition_content_allowed(url or ""):
                cur.execute("UPDATE competitions SET status = ? WHERE competition_id = ?", ("policy_hold", cid))
                append_credit_audit(cid, "system", "comms_bot_policy_hold_competition", {"reason": "pornography_blocked"})
                policy_holds += 1
        cur.execute("SELECT challenge_id, participant_urls, status FROM movement_challenges WHERE status IN ('active','pending')")
        for mid, urls_json, status in (cur.fetchall() or []):
            reviewed += 1
            bad = False
            try:
                urls = json.loads(urls_json or "[]")
            except:
                urls = []
            for u in urls:
                if not competition_content_allowed(str(u)):
                    bad = True
                    break
            if bad:
                cur.execute("UPDATE movement_challenges SET status = ? WHERE challenge_id = ?", ("policy_hold", mid))
                append_credit_audit(mid, "system", "comms_bot_policy_hold_movement", {"reason": "pornography_blocked"})
                policy_holds += 1
        conn.commit()
        conn.close()
        summary = f"Comms bot reviewed {reviewed} competitions/challenges; policy holds={policy_holds}."
        metrics = {"reviewed_items": reviewed, "policy_holds": policy_holds, "score_metrics": ["laughs", "excitement", "votes"]}
        set_trade_bot_state("comms", "ok", summary, metrics)
        return {"bot_id": "comms", "status": "ok", "summary": summary, "metrics": metrics}
    except Exception as e:
        summary = f"Comms bot error: {str(e)[:120]}"
        set_trade_bot_state("comms", "error", summary, {"error": str(e)[:120]})
        return {"bot_id": "comms", "status": "error", "summary": summary, "metrics": {"error": str(e)[:120]}}

def run_trade_bots():
    return [run_risk_bot(), run_ops_bot(), run_comms_bot()]

def append_trade_bot_heartbeat(bot_id, beat_mode, source, status, metrics):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO trade_bot_heartbeat_log (bot_id, beat_mode, source, status, metrics_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                (bot_id or "")[:20],
                (beat_mode or "slow")[:20],
                (source or "unknown")[:30],
                (status or "idle")[:20],
                json.dumps(metrics or {}, separators=(",", ":"))[:1200],
                datetime.utcnow().isoformat() + "Z"
            )
        )
        conn.commit()
        conn.close()
    except:
        pass

def init_wellness_db():
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS wellness_messages ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "email TEXT,"
            "name TEXT,"
            "message_type TEXT,"
            "status TEXT,"
            "error_detail TEXT,"
            "sent_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass

def init_community_db():
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS community_signals ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "region TEXT,"
            "language TEXT,"
            "event_type TEXT,"
            "severity REAL,"
            "notes TEXT,"
            "created_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS community_rotations ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "mode TEXT,"
            "region TEXT,"
            "language TEXT,"
            "score REAL,"
            "reason TEXT,"
            "alert_sent INTEGER DEFAULT 0,"
            "created_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass

def init_subscription_db():
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS user_subscriptions ("
            "email TEXT PRIMARY KEY,"
            "plan TEXT,"
            "source TEXT,"
            "order_id TEXT,"
            "updated_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS purchase_memory ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "email TEXT,"
            "package_key TEXT,"
            "package_title TEXT,"
            "source TEXT,"
            "order_id TEXT,"
            "created_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass

def init_security_db():
    try:
        conn = sqlite3.connect(SECURITY_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS banned_ips ("
            "ip TEXT PRIMARY KEY,"
            "reason TEXT,"
            "until_ts INTEGER,"
            "created_at TEXT,"
            "notes TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS security_events ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "ip TEXT,"
            "path TEXT,"
            "event_type TEXT,"
            "detail TEXT,"
            "created_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass

def client_ip():
    xff = (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    ip = xff or (request.remote_addr or "unknown")
    return ip[:64]

def log_security_event(ip, path, event_type, detail=""):
    try:
        conn = sqlite3.connect(SECURITY_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO security_events (ip, path, event_type, detail, created_at) VALUES (?, ?, ?, ?, ?)",
            (ip, (path or "")[:200], (event_type or "")[:80], (detail or "")[:500], datetime.utcnow().isoformat() + "Z")
        )
        conn.commit()
        conn.close()
    except:
        pass

def ban_ip(ip, reason, notes=""):
    try:
        until_ts = int(time.time()) + (SEC_BAN_MINUTES * 60)
        conn = sqlite3.connect(SECURITY_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO banned_ips (ip, reason, until_ts, created_at, notes) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(ip) DO UPDATE SET reason=excluded.reason, until_ts=excluded.until_ts, notes=excluded.notes",
            (ip, (reason or "policy_violation")[:120], until_ts, datetime.utcnow().isoformat() + "Z", (notes or "")[:500])
        )
        conn.commit()
        conn.close()
        log_security_event(ip, request.path if request else "", "ban", f"{reason} | {notes}")
        return True
    except:
        return False

def banned_reason(ip):
    try:
        conn = sqlite3.connect(SECURITY_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT reason, until_ts FROM banned_ips WHERE ip = ? LIMIT 1", (ip,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        reason = row[0] or "policy_violation"
        until_ts = int(row[1] or 0)
        if until_ts <= int(time.time()):
            return None
        return reason
    except:
        return None

def rate_hit(ip, bucket, window_sec, max_hits):
    now = int(time.time())
    key = f"{ip}:{bucket}"
    with SEC_LOCK:
        arr = RATE_TRACKER.get(key, [])
        arr = [t for t in arr if now - t <= window_sec]
        arr.append(now)
        RATE_TRACKER[key] = arr
        return len(arr) > max_hits

def duplicate_abuse(ip, path, body_text):
    now = int(time.time())
    sig = f"{ip}:{path}:{hash(body_text or '')}"
    with SEC_LOCK:
        arr = DUP_TRACKER.get(sig, [])
        arr = [t for t in arr if now - t <= 20]
        arr.append(now)
        DUP_TRACKER[sig] = arr
        return len(arr) > 6

def banned_screen(reason):
    return f"""<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>
<title>BANNED</title><style>
body{{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0d;color:#fff;font-family:Arial,sans-serif;}}
.card{{width:min(620px,92vw);padding:28px;border-radius:18px;border:2px solid #ff3b3b;background:rgba(255,59,59,0.14);text-align:center;}}
.big{{font-size:54px;font-weight:900;letter-spacing:.16em;color:#ff4d4d;}}
.sub{{margin-top:10px;color:#ffd2d2;}}
</style></head><body><div class='card'><div class='big'>BANNED</div><div class='sub'>Your IP is blocked. Reason: {reason}</div></div></body></html>"""

def get_subscription_for_email(email):
    if not email:
        return "free"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT plan FROM user_subscriptions WHERE email = ? LIMIT 1", (email.lower(),))
        row = cur.fetchone()
        conn.close()
        if not row:
            return "free"
        plan = (row[0] or "free").lower().strip()
        if plan not in VALID_SUBSCRIPTION_PLANS:
            return "free"
        return plan
    except:
        return "free"

def get_subscription_details_for_email(email):
    details = {
        "plan": "free",
        "source": "",
        "order_id": "",
        "updated_at": "",
    }
    if not email:
        return details
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT plan, source, order_id, updated_at FROM user_subscriptions WHERE email = ? LIMIT 1",
            (email.lower(),),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return details
        plan = (row[0] or "free").lower().strip()
        if plan not in VALID_SUBSCRIPTION_PLANS:
            plan = "free"
        details["plan"] = plan
        details["source"] = row[1] or ""
        details["order_id"] = row[2] or ""
        details["updated_at"] = row[3] or ""
        return details
    except:
        return details

def set_subscription_for_email(email, plan, source="manual", order_id=""):
    if not email:
        return False
    normalized = (plan or "free").lower().strip()
    if normalized not in VALID_SUBSCRIPTION_PLANS:
        normalized = "free"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO user_subscriptions (email, plan, source, order_id, updated_at) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(email) DO UPDATE SET plan=excluded.plan, source=excluded.source, order_id=excluded.order_id, updated_at=excluded.updated_at",
            (email.lower(), normalized, source[:40], (order_id or "")[:80], datetime.utcnow().isoformat() + "Z"),
        )
        conn.commit()
        conn.close()
        return True
    except:
        return False

def remember_purchase_for_email(email, package_key, package_title="", source="manual", order_id=""):
    if not email or not package_key:
        return False
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO purchase_memory (email, package_key, package_title, source, order_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                email.lower(),
                package_key[:40],
                (package_title or package_key)[:140],
                source[:40],
                (order_id or "")[:80],
                datetime.utcnow().isoformat() + "Z",
            ),
        )
        conn.commit()
        conn.close()
        return True
    except:
        return False

def get_recent_purchases_for_email(email, limit=5):
    if not email:
        return []
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT package_key, package_title, source, order_id, created_at FROM purchase_memory WHERE email = ? ORDER BY id DESC LIMIT ?",
            (email.lower(), int(limit)),
        )
        rows = cur.fetchall()
        conn.close()
        return [
            {
                "package_key": row[0] or "",
                "package_title": row[1] or row[0] or "",
                "source": row[2] or "",
                "order_id": row[3] or "",
                "created_at": row[4] or "",
            }
            for row in rows
        ]
    except:
        return []

def init_app_settings_db():
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS app_settings ("
            "k TEXT PRIMARY KEY,"
            "v TEXT,"
            "updated_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass

def init_studio_db():
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS studio_sessions ("
            "session_id TEXT PRIMARY KEY,"
            "owner_email TEXT,"
            "payload_json TEXT,"
            "updated_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS studio_board_actions ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "session_id TEXT,"
            "board_index INTEGER,"
            "action_type TEXT,"
            "payload_json TEXT,"
            "created_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS studio_exports ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "session_id TEXT,"
            "board_index INTEGER,"
            "destination TEXT,"
            "payload_json TEXT,"
            "created_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass

def _studio_now():
    return datetime.utcnow().isoformat() + "Z"

def _studio_owner_email():
    try:
        user = session.get("user") or {}
        email = (user.get("email") or "").strip().lower()
        if email:
            return email
    except:
        pass
    return "guest"

def _studio_plan_for_email(email):
    plan = get_subscription_for_email((email or "").strip().lower()) if email and email != "guest" else "free"
    tier = "free"
    if plan in PREMIUM_SUBSCRIPTION_PLANS:
        tier = "premium"
    elif plan in ("pro", "studio100"):
        tier = "pro"
    return plan, tier

def studio_jake_access_for_plan(plan):
    normalized = (plan or "free").strip().lower()
    return normalized in STUDIO_JAKE_ALLOWED_PLANS


VOICE_ALLOWED_MODES = {"greeting", "advanced", "inner_circle", "professional"}
VOICE_ALLOWED_ASSISTANTS = {"aria", "projake"}
VOICE_PRODUCT_MAP = {
    "dryness": {"title": "Laciador Crece", "price": "$40", "reason": "moisture support and smoother styling"},
    "frizz": {"title": "Formula Exclusiva", "price": "$35", "reason": "seal the strand and calm flyaways"},
    "damage": {"title": "Mascarilla", "price": "$25", "reason": "repair-first support for stressed hair"},
    "scalp": {"title": "Gotero", "price": "$28", "reason": "lighter scalp support without heavy buildup"},
    "studio": {"title": "Jake Premium Studio", "price": "$100", "reason": "full booth, extra FX, and Premium Jake guidance"},
    "default": {"title": "Shampoo SupportRD", "price": "$40", "reason": "steady hair-care support while we learn more"}
}


def normalize_voice_mode(mode):
    normalized = (mode or "greeting").strip().lower()
    return normalized if normalized in VOICE_ALLOWED_MODES else "greeting"


def normalize_voice_assistant(assistant_id):
    normalized = (assistant_id or "aria").strip().lower()
    return normalized if normalized in VOICE_ALLOWED_ASSISTANTS else "aria"


def pick_voice_product_lane(text):
    t = (text or "").strip().lower()
    if any(token in t for token in ["dry", "dryness", "moisture", "frizz", "smooth"]):
        return "dryness"
    if any(token in t for token in ["damage", "burn", "breakage", "split end", "repair"]):
        return "damage"
    if any(token in t for token in ["scalp", "oily", "greasy", "itch", "flakes"]):
        return "scalp"
    if any(token in t for token in ["studio", "record", "mix", "beat", "motherboard", "export"]):
        return "studio"
    return "default"


def infer_voice_mode(text, current_mode="greeting"):
    t = (text or "").strip().lower()
    if any(token in t for token in ["package deal", "special treatment", "making money", "ready for real", "real package", "finance", "money"]):
        return "professional"
    if "family matters" in t or any(token in t for token in ["family", "kids", "daughter", "son", "husband", "wife", "mom", "dad"]):
        return "inner_circle"
    if any(token in t for token in ["give me more information", "more information", "advanced", "details", "uses", "ingredients", "how do i use"]):
        return "advanced"
    return normalize_voice_mode(current_mode)


def get_voice_profile_for(assistant_id, membership_tier):
    assistant_id = normalize_voice_assistant(assistant_id)
    tier = (membership_tier or "free").strip().lower()
    base = {
        "intro_sound": "harmonic_spread",
        "outro_sound": "conversation_end",
        "intro_ms": 500,
        "greeting_pause_ms": 2000,
        "think_delay_ms": 2400,
        "listen_timeout_ms": 12000,
    }
    if assistant_id == "projake":
        base.update({
            "voice": "onyx" if tier in ("pro", "studio100") else "ash",
            "assistant_name": "Jake Studio Specialist",
            "tone": "premium studio director, grounded, smooth, never robotic",
        })
    else:
        base.update({
            "voice": "coral" if tier in ("premium", "fantasy300", "fantasy600") else "shimmer",
            "assistant_name": "Aria Hair Advisor",
            "tone": "beauty-tech concierge, warm, intelligent, never robotic",
        })
    if tier in ("pro", "studio100"):
        base["think_delay_ms"] = 1800
    return base


def init_voice_db():
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS voice_sessions ("
            "session_id TEXT PRIMARY KEY,"
            "owner_email TEXT,"
            "assistant_id TEXT,"
            "mode TEXT,"
            "route TEXT,"
            "payload_json TEXT,"
            "updated_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS voice_turns ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "session_id TEXT,"
            "speaker TEXT,"
            "mode TEXT,"
            "text TEXT,"
            "created_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass


def init_diary_db():
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS diary_sessions ("
            "session_id TEXT PRIMARY KEY,"
            "owner_email TEXT,"
            "live_slug TEXT,"
            "payload_json TEXT,"
            "updated_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS diary_comments ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "session_id TEXT,"
            "author_name TEXT,"
            "comment_text TEXT,"
            "comment_kind TEXT,"
            "amount_label TEXT,"
            "created_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass


def init_profile_analysis_db():
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS profile_analysis_reports ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "email TEXT,"
            "display_name TEXT,"
            "summary_text TEXT,"
            "texture TEXT,"
            "color TEXT,"
            "damage TEXT,"
            "hair_type TEXT,"
            "created_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass


def init_local_remote_db():
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE IF NOT EXISTS local_remote_preferences ("
            "email TEXT PRIMARY KEY,"
            "display_name TEXT,"
            "saved_tag TEXT,"
            "last_map_used TEXT,"
            "push_notifications INTEGER DEFAULT 0,"
            "voice_profile TEXT,"
            "updated_at TEXT"
            ")"
        )
        existing_cols = {
            row[1]
            for row in (cur.execute("PRAGMA table_info(local_remote_preferences)").fetchall() or [])
        }
        for name, ddl in [
            ("account_username", "TEXT"),
            ("account_email", "TEXT"),
            ("account_address", "TEXT"),
            ("account_zipcode", "TEXT"),
            ("account_phone", "TEXT"),
            ("password_hash", "TEXT"),
            ("aria_response_level", "TEXT"),
            ("login_provider", "TEXT"),
            ("login_confirmed", "INTEGER DEFAULT 0"),
            ("membership_plan", "TEXT"),
        ]:
            if name not in existing_cols:
                cur.execute(f"ALTER TABLE local_remote_preferences ADD COLUMN {name} {ddl}")
        cur.execute(
            "CREATE TABLE IF NOT EXISTS faq_developer_posts ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "owner_email TEXT,"
            "display_name TEXT,"
            "message TEXT,"
            "created_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS local_remote_traffic_events ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "visitor_key TEXT,"
            "path TEXT,"
            "ip_address TEXT,"
            "created_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS local_remote_inbox_offers ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "owner_email TEXT,"
            "source_name TEXT,"
            "source_type TEXT,"
            "offer_title TEXT,"
            "offer_details TEXT,"
            "target_url TEXT,"
            "status TEXT DEFAULT 'pending',"
            "created_at TEXT,"
            "updated_at TEXT"
            ")"
        )
        cur.execute(
            "CREATE TABLE IF NOT EXISTS local_remote_conversion_events ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "owner_email TEXT,"
            "visitor_key TEXT,"
            "event_key TEXT,"
            "surface TEXT,"
            "detail_json TEXT,"
            "created_at TEXT"
            ")"
        )
        conn.commit()
        conn.close()
    except:
        pass


def load_local_remote_preferences(email):
    owner_email = (email or "guest").strip().lower() or "guest"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT display_name, saved_tag, last_map_used, push_notifications, voice_profile, updated_at, "
            "account_username, account_email, account_address, account_zipcode, account_phone, password_hash, aria_response_level, "
            "login_provider, login_confirmed, membership_plan "
            "FROM local_remote_preferences WHERE email = ? LIMIT 1",
            (owner_email,),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return {}
        return {
            "display_name": row[0] or "",
            "saved_tag": row[1] or "",
            "last_map_used": row[2] or "",
            "push_notifications": bool(row[3]),
            "voice_profile": row[4] or "",
            "updated_at": row[5] or "",
            "account_username": row[6] or "",
            "account_email": row[7] or owner_email,
            "account_address": row[8] or "",
            "account_zipcode": row[9] or "",
            "account_phone": row[10] or "",
            "password_set": bool(row[11]),
            "aria_response_level": row[12] or "balanced",
            "login_provider": row[13] or "",
            "login_confirmed": bool(row[14]),
            "membership_plan": row[15] or "",
        }
    except:
        return {}


def save_local_remote_preferences(email, prefs):
    owner_email = (email or "guest").strip().lower() or "guest"
    safe = prefs or {}
    try:
        password_hash = ""
        if safe.get("password_hash"):
            password_hash = (safe.get("password_hash") or "")[:160]
        elif safe.get("password_plain"):
            password_hash = hashlib.sha256((safe.get("password_plain") or "").encode("utf-8")).hexdigest()
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO local_remote_preferences (email, display_name, saved_tag, last_map_used, push_notifications, voice_profile, updated_at, "
            "account_username, account_email, account_address, account_zipcode, account_phone, password_hash, aria_response_level, "
            "login_provider, login_confirmed, membership_plan) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(email) DO UPDATE SET display_name=excluded.display_name, saved_tag=excluded.saved_tag, "
            "last_map_used=excluded.last_map_used, push_notifications=excluded.push_notifications, "
            "voice_profile=excluded.voice_profile, updated_at=excluded.updated_at, "
            "account_username=excluded.account_username, account_email=excluded.account_email, "
            "account_address=excluded.account_address, account_zipcode=excluded.account_zipcode, account_phone=excluded.account_phone, "
            "password_hash=CASE WHEN excluded.password_hash <> '' THEN excluded.password_hash ELSE local_remote_preferences.password_hash END, "
            "aria_response_level=excluded.aria_response_level, login_provider=excluded.login_provider, "
            "login_confirmed=excluded.login_confirmed, membership_plan=excluded.membership_plan",
            (
                owner_email,
                (safe.get("display_name") or "")[:160],
                normalize_diary_profile_tag(safe.get("saved_tag") or ""),
                (safe.get("last_map_used") or "")[:80],
                1 if safe.get("push_notifications") else 0,
                (safe.get("voice_profile") or "")[:80],
                _studio_now(),
                (safe.get("account_username") or "")[:120],
                (safe.get("account_email") or owner_email)[:160],
                (safe.get("account_address") or "")[:240],
                (safe.get("account_zipcode") or "")[:20],
                (safe.get("account_phone") or "")[:40],
                password_hash,
                (safe.get("aria_response_level") or "balanced")[:80],
                (safe.get("login_provider") or "")[:80],
                1 if safe.get("login_confirmed") else 0,
                (safe.get("membership_plan") or "")[:80],
            ),
        )
        conn.commit()
        conn.close()
    except:
        pass


def list_faq_developer_posts(limit=7):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT owner_email, display_name, message, created_at FROM faq_developer_posts ORDER BY id DESC LIMIT ?",
            (max(1, min(25, int(limit or 7))),),
        )
        rows = cur.fetchall() or []
        conn.close()
        return [
            {
                "owner_email": row[0] or "",
                "display_name": row[1] or "SupportRD Guest",
                "message": row[2] or "",
                "created_at": row[3] or "",
            }
            for row in rows
        ]
    except:
        return []


def _local_remote_now():
    return datetime.utcnow().isoformat() + "Z"


def record_local_remote_traffic(visitor_key, path, ip_address=""):
    safe_key = (visitor_key or "guest").strip()[:120] or "guest"
    safe_path = (path or "/").strip()[:120] or "/"
    safe_ip = (ip_address or "").strip()[:80]
    now_iso = _local_remote_now()
    cutoff = (datetime.utcnow() - timedelta(minutes=20)).isoformat() + "Z"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO local_remote_traffic_events (visitor_key, path, ip_address, created_at) VALUES (?, ?, ?, ?)",
            (safe_key, safe_path, safe_ip, now_iso),
        )
        cur.execute("DELETE FROM local_remote_traffic_events WHERE created_at < ?", (cutoff,))
        conn.commit()
        conn.close()
    except:
        pass


def summarize_local_remote_traffic(window_minutes=5):
    window_minutes = max(1, int(window_minutes or 5))
    cutoff = (datetime.utcnow() - timedelta(minutes=window_minutes)).isoformat() + "Z"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        recent_events = cur.execute(
            "SELECT COUNT(*) FROM local_remote_traffic_events WHERE created_at >= ?",
            (cutoff,),
        ).fetchone()
        recent_visitors = cur.execute(
            "SELECT COUNT(DISTINCT visitor_key) FROM local_remote_traffic_events WHERE created_at >= ?",
            (cutoff,),
        ).fetchone()
        recent_paths = cur.execute(
            "SELECT path, COUNT(*) AS hits FROM local_remote_traffic_events WHERE created_at >= ? GROUP BY path ORDER BY hits DESC LIMIT 4",
            (cutoff,),
        ).fetchall() or []
        conn.close()
        visitors = int((recent_visitors or [0])[0] or 0)
        events = int((recent_events or [0])[0] or 0)
        hot = visitors >= 3 or events >= 5
        return {
            "window_minutes": window_minutes,
            "events": events,
            "visitors": visitors,
            "hot": hot,
            "top_paths": [{"path": row[0], "hits": int(row[1] or 0)} for row in recent_paths],
            "mode": "active_helping_state" if hot else "steady_state",
        }
    except:
        return {
            "window_minutes": window_minutes,
            "events": 0,
            "visitors": 0,
            "hot": False,
            "top_paths": [],
            "mode": "steady_state",
        }


def list_local_remote_inbox_offers(owner_email, limit=8):
    safe_email = (owner_email or "guest").strip().lower() or "guest"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        rows = cur.execute(
            "SELECT id, source_name, source_type, offer_title, offer_details, target_url, status, created_at, updated_at "
            "FROM local_remote_inbox_offers WHERE owner_email = ? ORDER BY id DESC LIMIT ?",
            (safe_email, max(1, min(25, int(limit or 8)))),
        ).fetchall() or []
        conn.close()
        return [
            {
                "id": int(row[0]),
                "source_name": row[1] or "",
                "source_type": row[2] or "",
                "offer_title": row[3] or "",
                "offer_details": row[4] or "",
                "target_url": row[5] or "",
                "status": row[6] or "pending",
                "created_at": row[7] or "",
                "updated_at": row[8] or "",
            }
            for row in rows
        ]
    except:
        return []


def create_local_remote_inbox_offer(owner_email, payload):
    safe_email = (owner_email or "guest").strip().lower() or "guest"
    body = payload or {}
    now_iso = _local_remote_now()
    normalized = " ".join([
        str(body.get("source_type") or ""),
        str(body.get("offer_title") or ""),
        str(body.get("offer_details") or ""),
        str(body.get("target_url") or ""),
    ]).lower()
    is_coding_help = any(token in normalized for token in ("coding", "developer", "dev", "engineering", "technical help", "code support"))
    routes_money_back = any(token in normalized for token in ("tip", "tips", "donation", "donations", "support", "company", "supportrd", "shop.supportrd.com"))
    needs_manual_approval = any(token in normalized for token in ("legal", "rights", "ownership", "policy", "terms", "contract", "agreement", "change request", "changes"))
    initial_status = "approved" if (is_coding_help and routes_money_back and not needs_manual_approval) else "pending"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO local_remote_inbox_offers (owner_email, source_name, source_type, offer_title, offer_details, target_url, status, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                safe_email,
                (body.get("source_name") or "Unknown source")[:160],
                (body.get("source_type") or "website")[:80],
                (body.get("offer_title") or "Integration offer")[:180],
                (body.get("offer_details") or "")[:600],
                (body.get("target_url") or "")[:280],
                initial_status,
                now_iso,
                now_iso,
            ),
        )
        conn.commit()
        conn.close()
    except:
        pass


def update_local_remote_inbox_offer(owner_email, offer_id, status):
    safe_email = (owner_email or "guest").strip().lower() or "guest"
    safe_status = (status or "pending").strip().lower()
    if safe_status not in ("pending", "approved", "rejected"):
        safe_status = "pending"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "UPDATE local_remote_inbox_offers SET status = ?, updated_at = ? WHERE owner_email = ? AND id = ?",
            (safe_status, _local_remote_now(), safe_email, int(offer_id or 0)),
        )
        conn.commit()
        conn.close()
    except:
        pass


def log_local_remote_conversion(owner_email, visitor_key, event_key, surface, detail):
    safe_email = (owner_email or "guest").strip().lower() or "guest"
    safe_visitor = (visitor_key or "guest").strip()[:120] or "guest"
    safe_event = (event_key or "unknown").strip()[:120] or "unknown"
    safe_surface = (surface or "shell").strip()[:120] or "shell"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO local_remote_conversion_events (owner_email, visitor_key, event_key, surface, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                safe_email,
                safe_visitor,
                safe_event,
                safe_surface,
                json.dumps(detail or {}),
                _local_remote_now(),
            ),
        )
        conn.commit()
        conn.close()
    except:
        pass


def summarize_local_remote_conversions(owner_email, window_days=7):
    safe_email = (owner_email or "guest").strip().lower() or "guest"
    cutoff = (datetime.utcnow() - timedelta(days=max(1, int(window_days or 7)))).isoformat() + "Z"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        rows = cur.execute(
            "SELECT event_key, COUNT(*) AS hits FROM local_remote_conversion_events WHERE owner_email = ? AND created_at >= ? GROUP BY event_key ORDER BY hits DESC LIMIT 6",
            (safe_email, cutoff),
        ).fetchall() or []
        total = cur.execute(
            "SELECT COUNT(*) FROM local_remote_conversion_events WHERE owner_email = ? AND created_at >= ?",
            (safe_email, cutoff),
        ).fetchone()
        conn.close()
        return {
            "window_days": max(1, int(window_days or 7)),
            "total": int((total or [0])[0] or 0),
            "top_events": [{"event_key": row[0] or "", "hits": int(row[1] or 0)} for row in rows],
        }
    except:
        return {
            "window_days": max(1, int(window_days or 7)),
            "total": 0,
            "top_events": [],
        }


def append_faq_developer_post(email, display_name, message):
    owner_email = (email or "guest").strip().lower() or "guest"
    clean_message = (message or "").strip()[:2000]
    if not clean_message:
        return False
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO faq_developer_posts (owner_email, display_name, message, created_at) VALUES (?, ?, ?, ?)",
            (owner_email, (display_name or "SupportRD Guest")[:120], clean_message, _studio_now()),
        )
        conn.commit()
        conn.close()
        return True
    except:
        return False


def load_diary_session_payload(session_id):
    if not session_id:
        return {}
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT payload_json FROM diary_sessions WHERE session_id = ? LIMIT 1", (session_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return {}
        return json.loads(row[0] or "{}")
    except:
        return {}


def save_diary_session_payload(session_id, owner_email, live_slug, payload):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO diary_sessions (session_id, owner_email, live_slug, payload_json, updated_at) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT(session_id) DO UPDATE SET owner_email=excluded.owner_email, live_slug=excluded.live_slug, payload_json=excluded.payload_json, updated_at=excluded.updated_at",
            (session_id, owner_email or "guest", live_slug or "", json.dumps(payload, ensure_ascii=False), _studio_now()),
        )
        conn.commit()
        conn.close()
    except:
        pass


def append_diary_comment(session_id, author_name, comment_text, comment_kind="comment", amount_label=""):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO diary_comments (session_id, author_name, comment_text, comment_kind, amount_label, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, (author_name or "Guest")[:80], (comment_text or "")[:500], (comment_kind or "comment")[:40], (amount_label or "")[:40], _studio_now()),
        )
        conn.commit()
        conn.close()
    except:
        pass


def get_diary_comments(session_id, limit=25):
    if not session_id:
        return []
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT author_name, comment_text, comment_kind, amount_label, created_at FROM diary_comments WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (session_id, max(1, min(50, int(limit)))),
        )
        rows = cur.fetchall() or []
        conn.close()
        return [
            {
                "author_name": row[0] or "Guest",
                "comment_text": row[1] or "",
                "comment_kind": row[2] or "comment",
                "amount_label": row[3] or "",
                "created_at": row[4] or "",
            }
            for row in reversed(rows)
        ]
    except:
        return []


def build_diary_live_slug(owner_email, payload=None):
    payload = payload or {}
    seed = (payload.get("profile_tag") or payload.get("display_name") or payload.get("username") or owner_email or "supportrd-live").strip().lower()
    seed = seed.replace("^", " ")
    slug = re.sub(r"[^a-z0-9]+", "-", seed).strip("-") or "supportrd-live"
    return slug[:60]


def normalize_diary_profile_tag(raw_tag):
    tag = (raw_tag or "").strip()
    if not tag:
        return ""
    tag = tag.replace("^", " ")
    tag = re.sub(r"[^a-z0-9_-]+", "-", tag.lower()).strip("-_")
    if not tag:
        return ""
    return f"^^{tag[:24]}"


def infer_login_provider(user):
    user = user or {}
    provider_candidates = []
    if isinstance(user.get("identities"), list):
        provider_candidates.extend(
            [str(identity.get("provider") or identity.get("connection") or "").strip().lower() for identity in user.get("identities")]
        )
    provider_candidates.append(str(user.get("sub") or "").split("|")[0].strip().lower())
    provider_candidates.append(str(user.get("nickname") or "").strip().lower())
    for candidate in provider_candidates:
        if not candidate:
            continue
        if candidate in ("google-oauth2", "google"):
            return "google"
        if candidate in ("windowslive", "microsoft", "live"):
            return "microsoft"
        if candidate in ("auth0", "username-password-authentication", "email", "password"):
            return "email/password"
        return candidate[:80]
    return "provider"


def derive_support_route_tag(email="", display_name="", existing_tag=""):
    preserved = normalize_diary_profile_tag(existing_tag)
    if preserved:
        return preserved
    seed = (
        (display_name or "").strip()
        or (email or "").split("@")[0].strip()
        or "supportrd-member"
    )
    return normalize_diary_profile_tag(seed) or "^^member"


def sync_authenticated_local_remote_account(user):
    user = user or {}
    email = (user.get("email") or "").strip().lower()
    if not email:
        return load_local_remote_preferences("guest")
    existing = load_local_remote_preferences(email)
    subscription = get_subscription_details_for_email(email)
    plan = (subscription.get("plan") or existing.get("membership_plan") or "free").strip().lower()
    display_name = (
        user.get("name")
        or user.get("username")
        or existing.get("display_name")
        or email.split("@")[0]
    )
    account_email = existing.get("account_email") or email
    prefs = {
        "display_name": display_name,
        "saved_tag": derive_support_route_tag(email, display_name, existing.get("saved_tag") or ""),
        "last_map_used": existing.get("last_map_used") or "",
        "push_notifications": bool(existing.get("push_notifications")),
        "voice_profile": existing.get("voice_profile") or "",
        "account_username": existing.get("account_username") or str(display_name).strip().lower().replace(" ", "-")[:80],
        "account_email": account_email,
        "account_address": existing.get("account_address") or "",
        "account_zipcode": existing.get("account_zipcode") or "",
        "account_phone": existing.get("account_phone") or "",
        "aria_response_level": existing.get("aria_response_level") or "balanced",
        "login_provider": infer_login_provider(user),
        "login_confirmed": True,
        "membership_plan": plan or "free",
    }
    if existing.get("password_hash"):
        prefs["password_hash"] = existing.get("password_hash")
    save_local_remote_preferences(email, prefs)
    return load_local_remote_preferences(email)


def diary_payload_preview(payload):
    payload = payload or {}
    for key in ("social_post", "entry_text", "transcript"):
        value = (payload.get(key) or "").strip()
        if value:
            return value[:180]
    return "Hair support session ready in the lobby."


def build_diary_lobby_entry(session_id, owner_email, live_slug, payload, updated_at):
    payload = payload or {}
    display_name = (
        payload.get("display_name")
        or payload.get("username")
        or (owner_email.split("@")[0] if owner_email and "@" in owner_email else owner_email)
        or "SupportRD Member"
    ).strip()
    profile_tag = normalize_diary_profile_tag(payload.get("profile_tag"))
    avatar_url = (payload.get("avatar_url") or "").strip() or "/static/images/woman-waking-up12.jpg"
    return {
        "session_id": session_id,
        "owner_email": owner_email or "guest@supportrd.com",
        "live_slug": live_slug or build_diary_live_slug(owner_email, payload),
        "display_name": display_name[:80] or "SupportRD Member",
        "profile_tag": profile_tag,
        "avatar_url": avatar_url[:4000],
        "live_active": bool(payload.get("live_active")),
        "updated_at": updated_at or payload.get("updated_at") or "",
        "preview_text": diary_payload_preview(payload),
        "headline": (payload.get("social_post") or payload.get("entry_text") or "").strip()[:120],
    }


def list_diary_lobby_sessions(sort_key="recent", limit=7):
    sort_key = (sort_key or "recent").strip().lower()
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT session_id, owner_email, live_slug, payload_json, updated_at "
            "FROM diary_sessions ORDER BY updated_at DESC LIMIT 80"
        )
        rows = cur.fetchall() or []
        conn.close()
    except:
        rows = []
    entries = []
    for row in rows:
        try:
            payload = json.loads(row[3] or "{}")
        except:
            payload = {}
        entries.append(build_diary_lobby_entry(row[0], row[1], row[2], payload, row[4]))
    if sort_key == "email":
        entries.sort(key=lambda item: ((item.get("owner_email") or "zzzz").lower(), -int(bool(item.get("live_active"))), item.get("updated_at") or ""), reverse=False)
    elif sort_key == "url":
        entries.sort(key=lambda item: ((item.get("live_slug") or "zzzz").lower(), item.get("updated_at") or ""), reverse=False)
    elif sort_key == "tag":
        entries.sort(key=lambda item: ((item.get("profile_tag") or "zzzz").lower(), item.get("updated_at") or ""), reverse=False)
    else:
        entries.sort(key=lambda item: item.get("updated_at") or "", reverse=True)
    return entries[: max(1, min(21, int(limit or 7)))]


def load_diary_public_session(session_id="", live_slug=""):
    session_id = (session_id or "").strip()
    live_slug = (live_slug or "").strip()
    if not session_id and not live_slug:
        return None
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        if session_id:
            cur.execute(
                "SELECT session_id, owner_email, live_slug, payload_json, updated_at FROM diary_sessions WHERE session_id = ? LIMIT 1",
                (session_id,),
            )
        else:
            cur.execute(
                "SELECT session_id, owner_email, live_slug, payload_json, updated_at FROM diary_sessions WHERE live_slug = ? LIMIT 1",
                (live_slug,),
            )
        row = cur.fetchone()
        conn.close()
    except:
        row = None
    if not row:
        return None
    try:
        payload = json.loads(row[3] or "{}")
    except:
        payload = {}
    return {
        "summary": build_diary_lobby_entry(row[0], row[1], row[2], payload, row[4]),
        "payload": payload,
        "comments": get_diary_comments(row[0], limit=40),
        "voice_history": get_recent_voice_turns((payload or {}).get("voice_session_id"), limit=12),
    }


def load_voice_session_payload(session_id):
    if not session_id:
        return {}
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT payload_json FROM voice_sessions WHERE session_id = ? LIMIT 1", (session_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return {}
        return json.loads(row[0] or "{}")
    except:
        return {}


def save_voice_session_payload(session_id, owner_email, assistant_id, mode, route, payload):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO voice_sessions (session_id, owner_email, assistant_id, mode, route, payload_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(session_id) DO UPDATE SET owner_email=excluded.owner_email, assistant_id=excluded.assistant_id, mode=excluded.mode, route=excluded.route, payload_json=excluded.payload_json, updated_at=excluded.updated_at",
            (session_id, owner_email or "", assistant_id, mode, route, json.dumps(payload, ensure_ascii=False), _studio_now()),
        )
        conn.commit()
        conn.close()
    except:
        pass


def append_voice_turn(session_id, speaker, mode, text):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO voice_turns (session_id, speaker, mode, text, created_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, speaker, mode, text[:4000], _studio_now()),
        )
        conn.commit()
        conn.close()
    except:
        pass


def get_recent_voice_turns(session_id, limit=8):
    if not session_id:
        return []
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT speaker, mode, text, created_at FROM voice_turns WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (session_id, max(1, min(20, int(limit)))),
        )
        rows = cur.fetchall() or []
        conn.close()
        return [{"speaker": row[0], "mode": row[1], "text": row[2], "created_at": row[3]} for row in reversed(rows)]
    except:
        return []


def build_voice_mode_instruction(assistant_id, mode):
    assistant_name = "Jake Studio Specialist" if assistant_id == "projake" else "Aria Hair Advisor"
    if mode == "advanced":
        return f"{assistant_name} is in Advanced mode. Give in-depth product use, steps, and the reason each product matters."
    if mode == "inner_circle":
        return f"{assistant_name} is in Inner Circle mode. Respond with warm memory-aware family sensitivity while staying hair-related and emotionally steady."
    if mode == "professional":
        return f"{assistant_name} is in Professional / Making Money mode. Talk about hair-related finances, premium service packages, product bundles, and confident next steps."
    return f"{assistant_name} is in Greeting mode. Be welcoming, short, clear, and hair-focused."


def voice_topic_understood(text, assistant_id):
    cleaned = (text or "").strip().lower()
    if not cleaned:
        return False
    if is_hair_topic(cleaned):
        return True
    if assistant_id == "projake":
        return any(token in cleaned for token in [
            "studio", "record", "recording", "mix", "motherboard", "export", "beat",
            "fx", "effect", "waveform", "video", "audio", "vocals", "track"
        ])
    return False


def build_voice_fallback_reply(message, assistant_id, mode, membership_tier, memory_notes=None):
    assistant_id = normalize_voice_assistant(assistant_id)
    mode = normalize_voice_mode(mode)
    lane = pick_voice_product_lane(message)
    product = VOICE_PRODUCT_MAP.get(lane, VOICE_PRODUCT_MAP["default"])
    tier = (membership_tier or "free").strip().lower()
    memory_notes = memory_notes or []
    if not voice_topic_understood(message, assistant_id):
        return (
            "I didn't understand. Say something hair related."
            if assistant_id != "projake"
            else "I didn't understand. Say something hair or studio related."
        )
    if assistant_id == "projake":
        base = (
            f"Jake here. The clean next move is {product['title']} at {product['price']}. "
            f"It fits because it brings {product['reason']}."
        )
    else:
        base = (
            f"Aria here. The first SupportRD lane I would point you to is {product['title']} at {product['price']}. "
            f"It fits because it brings {product['reason']}."
        )
    if mode == "advanced":
        base += " Use it with steady sequencing, track the result over a week, and let me know the exact change you want next."
    elif mode == "inner_circle":
        memory_line = f" I remember this family lane too: {memory_notes[-1]}." if memory_notes else ""
        base += f" I will stay gentle and family-aware while we build the routine.{memory_line}"
    elif mode == "professional":
        base += " If you are ready for special treatment, I can turn this into a premium package conversation with product, timing, and money talk."
    if tier in ("premium", "pro", "studio100", "bingo100", "family200", "fantasy300", "fantasy600", "yoda"):
        base += " Your upgraded lane lets me stay deeper and more tailored."
    return base


def create_realtime_instruction(assistant_id, mode, membership_tier, route, memory_notes=None):
    profile = get_voice_profile_for(assistant_id, membership_tier)
    memory_notes = memory_notes or []
    memory_line = ""
    if memory_notes:
        memory_line = f" Recent family/personal memory notes to respect: {' | '.join(memory_notes[-3:])}."
    return (
        f"{build_voice_mode_instruction(assistant_id, mode)} "
        f"Current route: {(route or 'home')[:40]}. "
        f"Voice tone: {profile.get('tone','natural, premium, never robotic')}. "
        f"Stay within SupportRD hair help unless Jake is asked about studio work. "
        f"If you do not understand, say: I didn't understand. Say something hair related. "
        f"{memory_line}"
    ).strip()


def _require_studio_jake_api_access():
    local_sandbox = str(request.args.get("localSandbox") or request.headers.get("X-SupportRD-Local-Sandbox") or "").strip().lower() in ("1", "true", "yes", "on")
    if local_sandbox:
        return "guest", {"plan": "studio100", "source": "local_sandbox", "order_id": "", "updated_at": _studio_now()}, "studio100", None
    user = session.get("user") or {}
    email = (user.get("email") or "").strip().lower()
    if not email:
        return None, None, None, ({
            "ok": False,
            "authenticated": False,
            "access": False,
            "error": "login_required",
            "login_url": "/login",
            "product_url": "https://shop.supportrd.com/products/jake-premium-studio",
            "message": "Log in to SupportRD to open Jake Premium Studio.",
        }, 401)
    details = get_subscription_details_for_email(email)
    plan = (details.get("plan") or "free").strip().lower()
    if not studio_jake_access_for_plan(plan):
        return email, details, plan, ({
            "ok": False,
            "authenticated": True,
            "access": False,
            "error": "premium_jake_required",
            "subscription": plan,
            "product_key": "studio100",
            "product_title": "Jake Premium Studio",
            "product_url": "https://shop.supportrd.com/products/jake-premium-studio",
            "message": "Jake Premium Studio is locked until the $100 Studio / Pro package is active.",
        }, 402)
    return email, details, plan, None

def _studio_safe_payload(payload):
    if isinstance(payload, dict):
        out = {}
        for key, value in payload.items():
            clean_key = str(key)[:80]
            if clean_key in ("file", "blob", "srcObject", "rawBytes"):
                continue
            out[clean_key] = _studio_safe_payload(value)
        return out
    if isinstance(payload, list):
        return [_studio_safe_payload(item) for item in payload[:50]]
    if isinstance(payload, (str, int, float, bool)) or payload is None:
        if isinstance(payload, str):
            return payload[:12000]
        return payload
    return str(payload)[:1200]

def _studio_load_session_payload(session_id):
    conn = sqlite3.connect(CREDIT_DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT payload_json FROM studio_sessions WHERE session_id = ? LIMIT 1", (session_id,))
    row = cur.fetchone()
    conn.close()
    if not row:
        return {}
    try:
        return json.loads(row[0] or "{}")
    except:
        return {}

def _studio_upsert_session(session_id, owner_email, payload):
    payload_json = json.dumps(_studio_safe_payload(payload or {}), ensure_ascii=False)
    conn = sqlite3.connect(CREDIT_DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO studio_sessions (session_id, owner_email, payload_json, updated_at) "
        "VALUES (?, ?, ?, ?) "
        "ON CONFLICT(session_id) DO UPDATE SET owner_email=excluded.owner_email, payload_json=excluded.payload_json, updated_at=excluded.updated_at",
        (session_id, owner_email, payload_json, _studio_now()),
    )
    conn.commit()
    conn.close()

def _studio_append_action(session_id, board_index, action_type, payload):
    conn = sqlite3.connect(CREDIT_DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO studio_board_actions (session_id, board_index, action_type, payload_json, created_at) VALUES (?, ?, ?, ?, ?)",
        (
            session_id,
            int(board_index or 0),
            (action_type or "update")[:40],
            json.dumps(_studio_safe_payload(payload or {}), ensure_ascii=False),
            _studio_now(),
        ),
    )
    conn.commit()
    conn.close()

def _studio_echo_suggestions(transcript, duration_sec):
    txt = (transcript or "").strip()
    words = [w for w in txt.replace("\n", " ").split(" ") if w.strip()]
    dur = max(10.0, min(float(duration_sec or 60), 3600.0))
    if not words:
        return [
            {"time_sec": round(dur * 0.25, 2), "mode": "tight", "feedback": 0.28, "mix": 0.18},
            {"time_sec": round(dur * 0.50, 2), "mode": "wide", "feedback": 0.42, "mix": 0.22},
            {"time_sec": round(dur * 0.78, 2), "mode": "cinematic", "feedback": 0.55, "mix": 0.26},
        ]
    step = dur / max(3, min(8, len(words)))
    picks = []
    cursor = step
    modes = ["tight", "wide", "cinematic"]
    for i in range(3):
        picks.append(
            {
                "time_sec": round(min(dur - 0.1, cursor), 2),
                "mode": modes[i],
                "feedback": round(0.26 + (i * 0.14), 2),
                "mix": round(0.16 + (i * 0.05), 2),
            }
        )
        cursor += step * (1.2 + i * 0.35)
    return picks

def get_setting(key, default=""):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT v FROM app_settings WHERE k = ? LIMIT 1", (key,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return default
        return row[0]
    except:
        return default

def set_setting(key, value):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO app_settings (k, v, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at",
            (key, str(value), datetime.utcnow().isoformat() + "Z")
        )
        conn.commit()
        conn.close()
        return True
    except:
        return False


def _mask_ip(ip):
    raw = (ip or "").strip()
    if not raw:
        return "hidden"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:10]
    return f"hash-{digest}"


def _clean_export_name(value, fallback="supportrd-profile"):
    cleaned = re.sub(r"[^a-zA-Z0-9_-]+", "-", (value or "").strip()).strip("-").lower()
    return cleaned or fallback


def _build_profile_analysis_pdf(lines):
    safe_lines = [str(line or "").replace("\r", " ").replace("\n", " ")[:110] for line in (lines or []) if str(line or "").strip()]
    if not safe_lines:
        safe_lines = ["SupportRD profile analysis export"]
    content = ["BT", "/F1 12 Tf", "50 780 Td"]
    first = True
    for line in safe_lines[:28]:
        if not first:
            content.append("0 -18 Td")
        first = False
        content.append(f"({_pdf_escape(line)}) Tj")
    content.append("ET")
    stream = "\n".join(content).encode("latin-1", "replace")
    objects = [
        b"1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
        b"2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
        b"3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj\n",
        b"4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
        b"5 0 obj<< /Length " + str(len(stream)).encode("ascii") + b" >>stream\n" + stream + b"\nendstream endobj\n",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(out))
        out.extend(obj)
    xref = len(out)
    out.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    out.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    out.extend(f"trailer<< /Size {len(offsets)} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode("ascii"))
    return bytes(out)


def _build_profile_analysis_docx(lines):
    body_lines = "".join(
        f"<w:p><w:r><w:t>{escape(line)}</w:t></w:r></w:p>"
        for line in (lines or []) if str(line or "").strip()
    ) or "<w:p><w:r><w:t>SupportRD profile analysis export</w:t></w:r></w:p>"
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
        'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
        'xmlns:o="urn:schemas-microsoft-com:office:office" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
        'xmlns:v="urn:schemas-microsoft-com:vml" '
        'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'xmlns:w10="urn:schemas-microsoft-com:office:word" '
        'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
        'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
        'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" '
        'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" '
        'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
        'mc:Ignorable="w14 wp14"><w:body>'
        + body_lines +
        '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>'
        '</w:body></w:document>'
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '</Types>'
    )
    root_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '</Relationships>'
    )
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as docx:
        docx.writestr("[Content_Types].xml", content_types)
        docx.writestr("_rels/.rels", root_rels)
        docx.writestr("word/document.xml", document_xml)
    return buffer.getvalue()

def trade_release_open():
    val = (get_setting("sell_aria_release_open", "0") or "0").strip().lower()
    return val in ("1", "true", "on", "yes")

def money_guard_enabled():
    val = (get_setting("money_guard_enabled", "1") or "1").strip().lower()
    return val in ("1", "true", "on", "yes")

def send_smtp_html(to_email, subject, html):
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD and (FROM_EMAIL or SMTP_USER)):
        return False, "email_not_configured"
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = FROM_EMAIL or SMTP_USER
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))
    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        return True, ""
    except Exception as e:
        return False, str(e)[:200]

def get_shopify_finance_snapshot():
    api_store = resolve_shopify_api_domain()
    if not api_store or not SHOPIFY_ADMIN_TOKEN:
        return {"ok": False, "error": "shopify_admin_not_configured"}
    try:
        now = datetime.utcnow()
        created_min = (now - timedelta(days=8)).isoformat() + "Z"
        r = requests.get(
            f"https://{api_store}/admin/api/2024-01/orders.json",
            headers={"X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN},
            params={
                "status": "any",
                "financial_status": "paid",
                "created_at_min": created_min,
                "limit": 250,
                "fields": "id,created_at,total_price,currency,financial_status,cancelled_at"
            },
            timeout=20,
        )
        if r.status_code >= 400:
            return {"ok": False, "error": f"shopify_error_{r.status_code}"}
        data = r.json() or {}
        orders = data.get("orders", []) or []
        today_key = now.strftime("%Y-%m-%d")
        today_total = 0.0
        prev_days = {}
        currency = "USD"
        for o in orders:
            if o.get("cancelled_at"):
                continue
            try:
                total = float(o.get("total_price", 0) or 0)
            except:
                total = 0.0
            created = (o.get("created_at") or "")[:10]
            if o.get("currency"):
                currency = o.get("currency")
            if created == today_key:
                today_total += total
            elif created:
                prev_days[created] = prev_days.get(created, 0.0) + total
        prev_values = list(prev_days.values())
        avg_prev = (sum(prev_values) / len(prev_values)) if prev_values else 0.0
        drop_pct = 0.0
        if avg_prev > 0:
            drop_pct = max(0.0, round((1 - (today_total / avg_prev)) * 100, 2))
        risk_level = "ok"
        if avg_prev > 0 and drop_pct >= MONEY_GUARD_DROP_PCT:
            risk_level = "watch"
        if avg_prev > 0 and drop_pct >= (MONEY_GUARD_DROP_PCT + 15):
            risk_level = "critical"
        return {
            "ok": True,
            "today_total": round(today_total, 2),
            "avg_prev_7d": round(avg_prev, 2),
            "drop_pct": drop_pct,
            "risk_level": risk_level,
            "currency": currency,
            "orders_count": len(orders),
            "threshold_pct": MONEY_GUARD_DROP_PCT,
        }
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}

def get_wellness_recipients(limit=500):
    recipients = {}
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT DISTINCT email FROM credit_decisions WHERE email IS NOT NULL AND email <> '' ORDER BY id DESC LIMIT ?", (limit,))
        for row in cur.fetchall():
            em = (row[0] or "").strip().lower()
            if em and "@" in em:
                recipients[em] = {"email": em, "name": em.split("@")[0]}
        cur.execute("SELECT DISTINCT email FROM name_claims WHERE email IS NOT NULL AND email <> '' ORDER BY claimed_at DESC LIMIT ?", (limit,))
        for row in cur.fetchall():
            em = (row[0] or "").strip().lower()
            if em and "@" in em and em not in recipients:
                recipients[em] = {"email": em, "name": em.split("@")[0]}
        conn.close()
    except:
        pass
    for extra in [DEVELOPER_EMAIL, ADMIN_EMAIL]:
        em = (extra or "").strip().lower()
        if em and "@" in em and em not in recipients:
            recipients[em] = {"email": em, "name": em.split("@")[0]}
    return list(recipients.values())

def log_community_signal(region, language, event_type, severity, notes):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO community_signals (region, language, event_type, severity, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                (region or "global").strip(),
                (language or "en").strip(),
                (event_type or "general_upgrade").strip(),
                float(severity or 1),
                (notes or "").strip()[:500],
                datetime.utcnow().isoformat() + "Z",
            ),
        )
        conn.commit()
        conn.close()
        return True
    except:
        return False

def compute_region_need_scores():
    now = datetime.utcnow()
    since = (now - timedelta(days=7)).isoformat() + "Z"
    scores = {}
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT region, language, event_type, severity FROM community_signals WHERE created_at >= ? ORDER BY id DESC LIMIT 3000",
            (since,),
        )
        rows = cur.fetchall()
        conn.close()
        negative_types = {"refund", "cancel", "support_issue", "delivery_problem", "payment_fail", "unhappy"}
        for region, language, event_type, severity in rows:
            key = (region or "global").strip() or "global"
            lang = (language or "en").strip() or "en"
            event = (event_type or "general_upgrade").strip().lower()
            sev = float(severity or 1)
            weight = 1.0
            if event in negative_types:
                weight = 3.0
            elif event == "low_engagement":
                weight = 2.0
            elif event == "request":
                weight = 1.6
            score = max(1.0, min(5.0, sev)) * weight * 10.0
            prev = scores.get(key, {"score": 0.0, "language": lang, "events": 0})
            prev["score"] += score
            prev["events"] += 1
            if prev.get("language") in ("", "en") and lang not in ("", "en"):
                prev["language"] = lang
            scores[key] = prev
    except:
        pass
    if not scores:
        scores["global"] = {"score": 40.0, "language": "en", "events": 0}
    return scores

def choose_community_rotation():
    scores = compute_region_need_scores()
    ranked = sorted(scores.items(), key=lambda x: x[1]["score"], reverse=True)
    top_region, top_data = ranked[0]
    use_targeted = random.random() < COMMUNITY_TARGET_RATIO and top_region != "global"
    if use_targeted:
        pool = ranked[: min(5, len(ranked))]
        total = sum(max(1.0, p[1]["score"]) for p in pool)
        pick = random.uniform(0.0, total)
        upto = 0.0
        chosen = pool[0]
        for item in pool:
            upto += max(1.0, item[1]["score"])
            if upto >= pick:
                chosen = item
                break
        region, data = chosen
        mode = "priority_targeted"
        reason = "targeted_by_need_and_randomized"
    else:
        region = "global"
        data = {"score": max(40.0, top_data.get("score", 40.0) * 0.5), "language": "en", "events": 0}
        mode = "general_upgrade"
        reason = "global_upgrade_for_everybody"
    return {
        "mode": mode,
        "region": region,
        "language": data.get("language", "en"),
        "score": round(float(data.get("score", 0.0)), 2),
        "reason": reason,
        "top_region": top_region,
        "top_score": round(float(top_data.get("score", 0.0)), 2),
    }

def save_rotation(plan, alert_sent):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO community_rotations (mode, region, language, score, reason, alert_sent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                plan.get("mode", "general_upgrade"),
                plan.get("region", "global"),
                plan.get("language", "en"),
                float(plan.get("score", 0.0)),
                plan.get("reason", ""),
                1 if alert_sent else 0,
                datetime.utcnow().isoformat() + "Z",
            ),
        )
        conn.commit()
        conn.close()
    except:
        pass

def send_founder_alert_if_needed(plan):
    try:
        need_alert = float(plan.get("top_score", 0)) >= COMMUNITY_ALERT_THRESHOLD
    except:
        need_alert = False
    if not need_alert:
        return False, "threshold_not_met"
    recipients = []
    for em in [COMMUNITY_ALERT_PRIMARY_EMAIL, COMMUNITY_ALERT_SECONDARY_EMAIL]:
        e = (em or "").strip()
        if e and "@" in e:
            recipients.append(e)
    if not recipients:
        return False, "no_alert_recipients"
    subject = "SupportRD Community Alert: Founder Needed"
    phone = COMMUNITY_ALERT_PHONE or "not_set"
    body = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
      <h2 style="margin:0 0 8px;">Founder check-in requested</h2>
      <p>Community rotation mode: <strong>{plan.get("mode","general_upgrade")}</strong></p>
      <p>Today target: <strong>{plan.get("region","global")}</strong> ({plan.get("language","en")})</p>
      <p>Need score (top region): <strong>{plan.get("top_score",0)}</strong> (threshold: {COMMUNITY_ALERT_THRESHOLD})</p>
      <p>Reason: {plan.get("reason","")}</p>
      <p>Preferred founder phone on file: {phone}</p>
      <p style="margin-top:14px;">SupportRD auto-ops sent this because founder support is needed.</p>
    </div>
    """
    sent_any = False
    last_error = ""
    for em in recipients:
        ok, detail = send_smtp_html(em, subject, body)
        sent_any = sent_any or ok
        if not ok:
            last_error = detail
    return sent_any, ("" if sent_any else (last_error or "alert_send_failed"))

def run_daily_community_rotation(force=False):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT id FROM community_rotations WHERE created_at LIKE ? ORDER BY id DESC LIMIT 1", (today + "%",))
        row = cur.fetchone()
        conn.close()
        if row and not force:
            return {"ok": True, "skipped": True, "reason": "already_ran_today"}
    except:
        pass
    plan = choose_community_rotation()
    alert_sent, detail = send_founder_alert_if_needed(plan)
    save_rotation(plan, alert_sent)
    return {"ok": True, "skipped": False, "plan": plan, "alert_sent": alert_sent, "alert_detail": detail}

def needs_developer_assistance(message):
    text = (message or "").lower()
    if not text:
        return False
    flags = [
        "bug", "error", "not working", "doesn't work", "doesnt work", "broken",
        "crash", "500", "payment fail", "can't login", "cant login", "locked out",
        "refund", "chargeback", "fraud", "security", "urgent", "help now"
    ]
    return any(f in text for f in flags)

def contains_prohibited_terms(text):
    t = (text or "").lower()
    return any(x in t for x in PROHIBITED_TERMS)

def competition_content_allowed(value):
    v = (value or "").lower()
    return not any(x in v for x in COMPETITION_BLOCKED_TOKENS)

def pick_safe_21plus_line(membership_tier=""):
    try:
        tier = (membership_tier or "").strip().lower()
        if tier == "fantasy300":
            return random.choice(BASIC_21PLUS_LINES)
        if tier == "fantasy600":
            return random.choice(ADVANCED_21PLUS_LINES)
        return random.choice(SAFE_21PLUS_FUN_LINES)
    except:
        return "Hair date energy: I bring the shine plan, you bring the smile."

def save_wellness_log(email, name, message_type, status, error_detail=""):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO wellness_messages (email, name, message_type, status, error_detail, sent_at) VALUES (?, ?, ?, ?, ?, ?)",
            (email, name, message_type, status, error_detail, datetime.utcnow().isoformat() + "Z"),
        )
        conn.commit()
        conn.close()
    except:
        pass

def save_credit_decision(row):
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO credit_decisions ("
            "email, country, requested_amount, term_months, monthly_income, monthly_debt, "
            "estimated_payment, allowed_payment, approved_amount, status, reason, application_uuid, obligation_status, decision_at"
            ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                row.get("email", ""),
                row.get("country", ""),
                float(row.get("requested_amount", 0) or 0),
                int(row.get("term_months", 0) or 0),
                float(row.get("monthly_income", 0) or 0),
                float(row.get("monthly_debt", 0) or 0),
                float(row.get("estimated_payment", 0) or 0),
                float(row.get("allowed_payment", 0) or 0),
                float(row.get("approved_amount", 0) or 0),
                row.get("status", "denied"),
                row.get("reason", ""),
                (row.get("application_uuid") or ""),
                (row.get("obligation_status") or "none"),
                datetime.utcnow().isoformat() + "Z",
            ),
        )
        conn.commit()
        conn.close()
    except:
        pass

def latest_credit_decision(email):
    if not email:
        return None
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT status, approved_amount, reason, decision_at, estimated_payment, allowed_payment "
            "FROM credit_decisions WHERE email = ? ORDER BY id DESC LIMIT 1",
            (email.lower(),),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return {
            "status": row[0],
            "approved_amount": row[1],
            "reason": row[2],
            "decision_at": row[3],
            "estimated_payment": row[4],
            "allowed_payment": row[5],
        }
    except:
        return None

def currency_for_country(country_code):
    cc = (country_code or "").upper()
    mapping = {
        "US": "USD",
        "DO": "DOP",
        "MX": "MXN",
        "CA": "CAD",
        "GB": "GBP",
        "EU": "EUR",
        "ES": "EUR",
        "DE": "EUR",
        "FR": "EUR",
        "IT": "EUR",
        "BR": "BRL",
        "CO": "COP",
        "AR": "ARS",
        "KE": "KES",
        "ZA": "ZAR",
        "NG": "NGN",
        "IN": "INR",
        "JP": "JPY",
        "KR": "KRW",
        "AE": "AED",
        "SA": "SAR",
    }
    return mapping.get(cc, "USD")

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

@app.before_request
def security_guard():
    path = (request.path or "").lower()
    if path.startswith("/health"):
        return None
    ip = client_ip()

    reason = banned_reason(ip)
    if reason:
        if path.startswith("/api/"):
            return {"ok": False, "error": "banned", "message": "BANNED", "reason": reason}, 403
        return Response(banned_screen(reason), status=403, mimetype="text/html")

    for token in SUSPICIOUS_PATH_TOKENS:
        if token in path:
            ban_ip(ip, "suspicious_path_probe", path)
            return Response(banned_screen("suspicious_path_probe"), status=403, mimetype="text/html")

    if rate_hit(ip, "global", SEC_RATE_WINDOW_SEC, SEC_RATE_MAX_PER_WINDOW):
        ban_ip(ip, "speed_hack_detected", f"{path}")
        if path.startswith("/api/"):
            return {"ok": False, "error": "banned", "message": "BANNED", "reason": "speed_hack_detected"}, 403
        return Response(banned_screen("speed_hack_detected"), status=403, mimetype="text/html")

    if path.startswith("/api/credit"):
        if rate_hit(ip, "credit", SEC_CREDIT_WINDOW_SEC, SEC_CREDIT_MAX_PER_WINDOW):
            ban_ip(ip, "credit_system_abuse", path)
            return {"ok": False, "error": "banned", "message": "BANNED", "reason": "credit_system_abuse"}, 403
        body = ""
        try:
            body = request.get_data(cache=True, as_text=True) or ""
        except:
            body = ""
        if duplicate_abuse(ip, path, body):
            ban_ip(ip, "dupe_hack_detected", path)
            return {"ok": False, "error": "banned", "message": "BANNED", "reason": "dupe_hack_detected"}, 403
    return None

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

@app.route("/seo/start", methods=["GET"])
def seo_start():
    global SEO_RANDOM_ENABLED
    token = request.args.get("token", "")
    if not SEO_TRIGGER_TOKEN or token != SEO_TRIGGER_TOKEN:
        return "unauthorized", 401
    SEO_RANDOM_ENABLED = True
    schedule_random_seo_jobs()
    return "ok"

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

@app.route("/api/wellness/send-all", methods=["POST"])
def wellness_send_all():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    recipients = get_wellness_recipients()
    if not recipients:
        return {"ok": False, "error": "no_recipients"}, 404
    sent = 0
    failed = 0
    for rec in recipients:
        first = (rec.get("name") or "friend").replace(".", " ").replace("_", " ").title()
        html = f"""
        <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
          <h2 style="margin:0 0 8px;">Hi {first}, we at SupportRD are trying for you.</h2>
          <p style="margin:10px 0;">If you're not feeling your best, we're sending a personal check-in to say we care.</p>
          <p style="margin:10px 0;">Reply to this message and our team will support you with simple hair care steps and encouragement.</p>
          <p style="margin:14px 0 0;"><strong>SupportRD Team</strong></p>
        </div>
        """
        ok, detail = send_smtp_html(rec["email"], WELLNESS_SUBJECT, html)
        if ok:
            sent += 1
            save_wellness_log(rec["email"], first, "wellness_blast", "sent", "")
        else:
            failed += 1
            save_wellness_log(rec["email"], first, "wellness_blast", "failed", detail)
    return {"ok": True, "sent": sent, "failed": failed, "total": len(recipients)}

@app.route("/api/community/signal", methods=["POST"])
def community_signal():
    data = request.json or {}
    ok = log_community_signal(
        data.get("region", "global"),
        data.get("language", "en"),
        data.get("event_type", "general_upgrade"),
        data.get("severity", 1),
        data.get("notes", ""),
    )
    return {"ok": bool(ok)}

@app.route("/api/community/rotation/run", methods=["POST"])
def community_rotation_run():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    force = bool((request.json or {}).get("force"))
    return run_daily_community_rotation(force=force)

@app.route("/api/community/rotation/today")
def community_rotation_today():
    try:
        today = datetime.utcnow().strftime("%Y-%m-%d")
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT mode, region, language, score, reason, alert_sent, created_at FROM community_rotations WHERE created_at LIKE ? ORDER BY id DESC LIMIT 1",
            (today + "%",),
        )
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"ok": True, "has_plan": False}
        return {
            "ok": True,
            "has_plan": True,
            "plan": {
                "mode": row[0],
                "region": row[1],
                "language": row[2],
                "score": row[3],
                "reason": row[4],
                "alert_sent": bool(row[5]),
                "created_at": row[6],
            },
        }
    except:
        return {"ok": False, "error": "query_failed"}, 500

@app.route("/api/community/alert-contacts")
def community_alert_contacts():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    return {
        "ok": True,
        "primary_email": COMMUNITY_ALERT_PRIMARY_EMAIL,
        "secondary_email": COMMUNITY_ALERT_SECONDARY_EMAIL,
        "extra_emails": COMMUNITY_ALERT_EXTRA_EMAILS,
        "developer_email": DEVELOPER_EMAIL,
        "admin_email": ADMIN_EMAIL,
        "phone": COMMUNITY_ALERT_PHONE,
    }

@app.route("/api/security/banned")
def security_banned_list():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    try:
        conn = sqlite3.connect(SECURITY_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT ip, reason, until_ts, created_at FROM banned_ips ORDER BY until_ts DESC LIMIT 200")
        rows = cur.fetchall()
        conn.close()
        now = int(time.time())
        items = []
        for r in rows:
            if int(r[2] or 0) <= now:
                continue
            items.append({"ip": r[0], "reason": r[1], "until_ts": int(r[2] or 0), "created_at": r[3]})
        return {"ok": True, "items": items}
    except Exception as e:
        return {"ok": False, "error": str(e)[:160]}, 500

@app.route("/api/security/unban", methods=["POST"])
def security_unban():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    ip = (request.json or {}).get("ip", "")
    if not ip:
        return {"ok": False, "error": "ip_required"}, 400
    try:
        conn = sqlite3.connect(SECURITY_DB_PATH)
        cur = conn.cursor()
        cur.execute("DELETE FROM banned_ips WHERE ip = ?", (ip.strip(),))
        conn.commit()
        conn.close()
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)[:160]}, 500

@app.route("/api/community/launch-alert", methods=["POST"])
def community_launch_alert():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    data = request.json or {}
    launch_day = (data.get("launch_day") or "").strip()
    launch_location = (data.get("launch_location") or "").strip()
    mission = (data.get("mission") or "SupportRD satellite mission").strip()
    notes = (data.get("notes") or "").strip()
    if not launch_day or not launch_location:
        return {"ok": False, "error": "launch_day_and_location_required"}, 400

    recipients = []
    for em in [COMMUNITY_ALERT_PRIMARY_EMAIL, COMMUNITY_ALERT_SECONDARY_EMAIL, DEVELOPER_EMAIL, ADMIN_EMAIL]:
        v = (em or "").strip().lower()
        if v and "@" in v and v not in recipients:
            recipients.append(v)
    if not recipients:
        return {"ok": False, "error": "no_recipients"}, 500

    subject = "SupportRD Launch Watch Alert"
    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
      <h2 style="margin:0 0 8px;">Launch watch alert</h2>
      <p><strong>Mission:</strong> {mission}</p>
      <p><strong>Day:</strong> {launch_day}</p>
      <p><strong>Location:</strong> {launch_location}</p>
      <p><strong>Phone on file:</strong> {COMMUNITY_ALERT_PHONE or "not_set"}</p>
      <p><strong>Compliance note:</strong> Tracking under ITU Radio Regulations Appendix 30B workflow.</p>
      <p><strong>Notes:</strong> {notes or "N/A"}</p>
      <p style="margin-top:12px;">SupportRD auto-alert sent this so you can fly in and watch launch day.</p>
    </div>
    """
    sent = 0
    failed = 0
    for em in recipients:
        ok, _detail = send_smtp_html(em, subject, html)
        if ok:
            sent += 1
        else:
            failed += 1
    return {"ok": sent > 0, "sent": sent, "failed": failed, "recipients": len(recipients)}

@app.route("/api/finance/shopify-status")
def finance_shopify_status():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    snap = get_shopify_finance_snapshot()
    snap["money_guard_enabled"] = money_guard_enabled()
    return snap

@app.route("/api/finance/guard-state")
def finance_guard_state():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    return {"ok": True, "enabled": money_guard_enabled()}

@app.route("/api/finance/guard-state", methods=["POST"])
def finance_guard_state_set():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    data = request.json or {}
    enabled = bool(data.get("enabled"))
    ok = set_setting("money_guard_enabled", "1" if enabled else "0")
    return {"ok": bool(ok), "enabled": enabled}

@app.route("/api/finance/notify", methods=["POST"])
def finance_notify():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    snap = get_shopify_finance_snapshot()
    if not snap.get("ok"):
        return snap, 500
    recipients = []
    for em in [COMMUNITY_ALERT_PRIMARY_EMAIL, COMMUNITY_ALERT_SECONDARY_EMAIL, DEVELOPER_EMAIL, ADMIN_EMAIL]:
        v = (em or "").strip().lower()
        if v and "@" in v and v not in recipients:
            recipients.append(v)
    if not recipients:
        return {"ok": False, "error": "no_recipients"}, 500
    subject = "SupportRD Money Guard Alert"
    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
      <h2 style="margin:0 0 8px;">Money guard status</h2>
      <p><strong>Today:</strong> {snap.get("today_total")} {snap.get("currency","USD")}</p>
      <p><strong>7-day avg:</strong> {snap.get("avg_prev_7d")} {snap.get("currency","USD")}</p>
      <p><strong>Drop:</strong> {snap.get("drop_pct")}%</p>
      <p><strong>Risk level:</strong> {snap.get("risk_level")}</p>
      <p><strong>Threshold:</strong> {snap.get("threshold_pct")}%</p>
      <p style="margin-top:10px;">SupportRD ads + money guard legal-style monitoring update.</p>
    </div>
    """
    sent = 0
    failed = 0
    for em in recipients:
        ok, _detail = send_smtp_html(em, subject, html)
        if ok:
            sent += 1
        else:
            failed += 1
    return {"ok": sent > 0, "sent": sent, "failed": failed, "recipients": len(recipients), "snapshot": snap}

def auto_money_guard_check():
    if not money_guard_enabled():
        return
    snap = get_shopify_finance_snapshot()
    if not snap.get("ok"):
        return
    risk = (snap.get("risk_level") or "ok").lower()
    if risk not in ("watch", "critical"):
        return
    now_ts = int(time.time())
    last_ts = int(float(get_setting("money_guard_last_alert_ts", "0") or "0"))
    cooldown = 6 * 3600
    if now_ts - last_ts < cooldown:
        return
    recipients = []
    for em in [COMMUNITY_ALERT_PRIMARY_EMAIL, COMMUNITY_ALERT_SECONDARY_EMAIL, DEVELOPER_EMAIL, ADMIN_EMAIL]:
        v = (em or "").strip().lower()
        if v and "@" in v and v not in recipients:
            recipients.append(v)
    if not recipients:
        return
    subject = "SupportRD Auto Money Guard Alert"
    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
      <h2 style="margin:0 0 8px;">Automatic money safeguard alert</h2>
      <p><strong>Today:</strong> {snap.get("today_total")} {snap.get("currency","USD")}</p>
      <p><strong>7-day avg:</strong> {snap.get("avg_prev_7d")} {snap.get("currency","USD")}</p>
      <p><strong>Drop:</strong> {snap.get("drop_pct")}%</p>
      <p><strong>Risk level:</strong> {snap.get("risk_level")}</p>
      <p>This is auto-monitoring while safeguard is ON.</p>
    </div>
    """
    sent_any = False
    for em in recipients:
        ok, _detail = send_smtp_html(em, subject, html)
        sent_any = sent_any or ok
    if sent_any:
        set_setting("money_guard_last_alert_ts", str(now_ts))

@app.route("/api/community/post-intake", methods=["POST"])
def community_post_intake():
    data = request.json or {}
    message = (data.get("message") or "").strip()
    region = (data.get("region") or "global").strip()
    language = (data.get("language") or "en").strip()
    source = (data.get("source") or "post").strip()
    if not message:
        return {"ok": False, "error": "message_required"}, 400
    if contains_prohibited_terms(message):
        return {"ok": False, "error": "prohibited_content"}, 400
    needs_dev = needs_developer_assistance(message)
    event_type = "developer_needed" if needs_dev else "general_upgrade"
    severity = 4 if needs_dev else 1
    log_community_signal(region, language, event_type, severity, f"{source}: {message[:300]}")

    notified = False
    notify_detail = "not_needed"
    if needs_dev:
        recipients = []
        for em in [COMMUNITY_ALERT_PRIMARY_EMAIL, COMMUNITY_ALERT_SECONDARY_EMAIL, DEVELOPER_EMAIL, ADMIN_EMAIL]:
            v = (em or "").strip().lower()
            if v and "@" in v and v not in recipients:
                recipients.append(v)
        if recipients:
            subject = "SupportRD Family Support Assist Needed"
            html = f"""
            <div style="font-family:Arial,Helvetica,sans-serif;color:#111;">
              <h2 style="margin:0 0 8px;">Family support assistance requested</h2>
              <p><strong>Source:</strong> {source}</p>
              <p><strong>Region:</strong> {region} · <strong>Language:</strong> {language}</p>
              <p><strong>Message:</strong> {message}</p>
              <p style="margin-top:12px;">Community mode is running. This reached you because it likely needs direct family support help.</p>
            </div>
            """
            sent_count = 0
            for em in recipients:
                ok, detail = send_smtp_html(em, subject, html)
                if ok:
                    sent_count += 1
                else:
                    notify_detail = detail or "email_failed"
            notified = sent_count > 0
            if notified:
                notify_detail = "sent"
        else:
            notify_detail = "no_recipients"

    return {
        "ok": True,
        "needs_developer": needs_dev,
        "notified": notified,
        "detail": notify_detail
    }

@app.route("/api/payments/options")
def payment_options():
    return {
        "ok": True,
        "networks": ACCEPTED_PAYMENT_NETWORKS,
        "major_banks": MAJOR_BANKS,
        "cash_supported": True,
        "cash_note": "Cash is accepted at official SupportRD points with receipt logging.",
        "membership_tiers": [
            {"id": "premium", "price": 35, "label": "Puzzle Tier", "billing": "monthly"},
            {"id": "bingo100", "price": 100, "label": "Bingo Fantasy", "billing": "monthly"},
            {"id": "family200", "price": 200, "label": "Family Fantasy", "billing": "monthly"},
            {"id": "yoda", "price": 20, "label": "Yoda Pass", "billing": "monthly"},
            {"id": "pro", "price": 50, "label": "Unlimited ARIA", "billing": "monthly"},
            {"id": "fantasy300", "price": 300, "label": "Basic Fantasy 21+", "billing": "monthly"},
            {"id": "fantasy600", "price": 600, "label": "Advanced Fantasy 21+", "billing": "monthly"},
        ],
    }

@app.route("/api/social-circuits")
def social_circuits():
    mode = "active" if (get_setting("social_circuit_mode", "1") or "1") in ("1", "true", "on") else "standby"
    return {
        "ok": True,
        "mode": mode,
        "source": "SupportRD",
        "circuits": [
            {"name": "style_pulse", "state": "active"},
            {"name": "hydration_pulse", "state": "active"},
            {"name": "repair_pulse", "state": "active"},
            {"name": "attraction_pulse_21plus", "state": "guarded"},
        ],
        "policy": "21+ sensual mode allowed for adults. Drugs, gangs, violence, illegal activity, and minors are blocked."
    }

@app.route("/api/leads/request-call", methods=["POST"])
def leads_request_call():
    data = request.json or {}
    route_label = (data.get("route_label") or "English Family Route to Anthony").strip()[:120]
    name = (data.get("name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip().lower()
    address = (data.get("address") or "").strip()
    notes = (data.get("notes") or "").strip()
    consent = bool(data.get("consent"))
    if not name or not phone or not email or not address:
        return {"ok": False, "error": "missing_required_fields"}, 400
    if "@" not in email:
        return {"ok": False, "error": "invalid_email"}, 400
    if not consent:
        return {"ok": False, "error": "consent_required"}, 400
    request_id = new_request_id()
    wait_message = (
        "Anthony has the relay first for this English family route. "
        "Your order is coming, don't worry."
    )
    row = {
        "request_id": request_id,
        "name": name,
        "phone": phone,
        "email": email,
        "address": address,
        "notes": f"[{route_label}] {notes}".strip(),
        "consent": True,
        "status": "pending",
        "wait_message": wait_message,
    }
    if not upsert_lead_request(row):
        return {"ok": False, "error": "save_failed"}, 500
    log_security_event(client_ip(), "/api/leads/request-call", "lead_request_created", f"{email} {request_id}")
    try:
        send_admin_alert(
            "english_family_route",
            "high",
            request_id,
            address,
            f"{route_label}: {name} / {phone} / {email} needs relay support back through xxfigueroa1993@yahoo.com and 980-375-9197."
        )
    except Exception:
        pass
    return {"ok": True, "request_id": request_id, "status": "pending", "wait_screen_message": wait_message}

@app.route("/api/cash-points/checkin", methods=["POST"])
def cash_points_checkin():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    data = request.json or {}
    request_id = (data.get("request_id") or "").strip()
    flow_type = (data.get("flow_type") or "").strip().lower()
    location = (data.get("location") or "").strip()
    proof_ref = (data.get("proof_ref") or "").strip()
    try:
        amount = float(data.get("amount", 0) or 0)
    except:
        amount = -1
    if flow_type not in ("store", "bank", "envelope"):
        return {"ok": False, "error": "invalid_flow_type"}, 400
    if not request_id:
        return {"ok": False, "error": "request_id_required"}, 400
    if not location:
        return {"ok": False, "error": "location_required"}, 400
    if amount < 0 or amount > CASH_MAX_AMOUNT:
        return {"ok": False, "error": "invalid_amount"}, 400
    lead = get_lead_request(request_id)
    if not lead:
        return {"ok": False, "error": "request_not_found"}, 404
    if not append_cash_point_event(request_id, lead.get("email"), flow_type, "checkin", location=location, amount=amount, proof_ref=proof_ref):
        return {"ok": False, "error": "event_log_failed"}, 500
    lead["status"] = "checked_in"
    upsert_lead_request(lead)
    append_credit_audit(request_id, lead.get("email"), "cash_point_checkin", {"flow_type": flow_type, "location": location, "amount": amount})
    return {"ok": True, "status": "checked_in", "logged_at": datetime.utcnow().isoformat() + "Z"}

@app.route("/api/cash-points/confirm-received", methods=["POST"])
def cash_points_confirm_received():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    data = request.json or {}
    request_id = (data.get("request_id") or "").strip()
    confirmed_by = (data.get("confirmed_by") or "").strip()
    memo = (data.get("memo") or "").strip()
    try:
        received_amount = float(data.get("received_amount", 0) or 0)
    except:
        received_amount = -1
    if not request_id or not confirmed_by:
        return {"ok": False, "error": "missing_required_fields"}, 400
    if received_amount < 0 or received_amount > CASH_MAX_AMOUNT:
        return {"ok": False, "error": "invalid_amount"}, 400
    lead = get_lead_request(request_id)
    if not lead:
        return {"ok": False, "error": "request_not_found"}, 404
    if not append_cash_point_event(
        request_id,
        lead.get("email"),
        "store",
        "received",
        location=lead.get("address", ""),
        amount=received_amount,
        confirmed_by=confirmed_by,
        memo=memo,
    ):
        return {"ok": False, "error": "event_log_failed"}, 500
    lead["status"] = "received"
    upsert_lead_request(lead)
    append_credit_audit(request_id, lead.get("email"), "cash_point_received", {"confirmed_by": confirmed_by, "amount": received_amount})
    return {"ok": True, "status": "received"}

@app.route("/api/admin/alerts/dispatch", methods=["POST"])
def admin_alerts_dispatch():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    data = request.json or {}
    event_type = (data.get("event_type") or "general").strip()
    priority = (data.get("priority") or "normal").strip().lower()
    request_id = (data.get("request_id") or "").strip()
    location = (data.get("location") or "").strip()
    summary = (data.get("summary") or "").strip()
    if not summary:
        return {"ok": False, "error": "summary_required"}, 400
    result = send_admin_alert(event_type, priority, request_id, location, summary)
    if request_id:
        lead = get_lead_request(request_id)
        if lead:
            append_credit_audit(request_id, lead.get("email"), "admin_alert_dispatch", {"event_type": event_type, "priority": priority, "location": location})
    return result

@app.route("/api/admin/send-intro-brochure", methods=["POST"])
def admin_send_intro_brochure():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    data = request.json or {}
    to_email = (data.get("to_email") or COMMUNITY_ALERT_SECONDARY_EMAIL or "").strip().lower()
    subject = (data.get("subject") or "SupportRD Admin Introduction Brochure").strip()[:160]
    result = send_intro_brochure_email(to_email, subject=subject)
    if result.get("ok"):
        append_credit_audit("BROCHURE-EMAIL", to_email, "intro_brochure_sent", {"subject": subject})
    return result

@app.route("/admin/send-intro-brochure-now")
def admin_send_intro_brochure_now():
    token = (request.args.get("token") or "").strip()
    if not SEO_TRIGGER_TOKEN or token != SEO_TRIGGER_TOKEN:
        return "unauthorized", 401
    to_email = (request.args.get("to") or COMMUNITY_ALERT_SECONDARY_EMAIL or "").strip().lower()
    subject = (request.args.get("subject") or "SupportRD Admin Introduction Brochure").strip()[:160]
    result = send_intro_brochure_email(to_email, subject=subject)
    if result.get("ok"):
        append_credit_audit("BROCHURE-EMAIL", to_email, "intro_brochure_sent_token_link", {"subject": subject})
        return f"ok: sent brochure to {to_email}"
    return f"error: {result.get('error','send_failed')}", 500

@app.route("/api/alerts/sar", methods=["POST"])
def alerts_sar():
    user = session.get("user") or {}
    email = (user.get("email") or "").strip().lower()
    if not email and not is_admin():
        return {"ok": False, "error": "login_required"}, 401
    data = request.json or {}
    mode = (data.get("mode") or "search_rescue").strip().lower()[:50]
    location = (data.get("location") or "").strip()[:200]
    note = (data.get("note") or "").strip()[:300]
    include_prayer = bool(data.get("include_prayer"))
    level = (data.get("level") or "code_red").strip().lower()[:30]
    request_id = f"SAR-{uuid.uuid4().hex[:10].upper()}"
    source = email or "admin"
    if not location:
        location = "SupportRD - location pending"
    summary = f"SAR {level.upper()} requested by {source}. Mode={mode}. {note}".strip()
    if include_prayer:
        summary += " Prayer requested."
    result = send_admin_alert("search_rescue_code_red", "urgent", request_id, location, summary)
    append_credit_audit(
        request_id,
        source,
        "sar_red_activated",
        {"mode": mode, "location": location, "level": level, "include_prayer": include_prayer, "note": note},
    )
    out = dict(result or {})
    out["request_id"] = request_id
    out["source"] = source
    out["mode"] = mode
    out["level"] = level
    return out

@app.route("/api/account-transfer/request", methods=["POST"])
def account_transfer_request():
    user = session.get("user") or {}
    session_email = (user.get("email") or "").strip().lower()
    if not session_email and not is_admin():
        return {"ok": False, "error": "login_required"}, 401
    data = request.json or {}
    from_email = (data.get("from_email") or session_email or "").strip().lower()
    to_email = (data.get("to_email") or "").strip().lower()
    id_last4 = "".join([c for c in str(data.get("id_last4") or "") if c.isdigit()])
    visa_last4 = "".join([c for c in str(data.get("visa_last4") or "") if c.isdigit()])
    transfer_amount = float(data.get("transfer_amount") or 0)
    if not is_admin() and from_email != session_email:
        return {"ok": False, "error": "identity_mismatch"}, 403
    if not from_email or not to_email or "@" not in from_email or "@" not in to_email:
        return {"ok": False, "error": "invalid_email"}, 400
    if len(id_last4) != 4 or len(visa_last4) != 4:
        return {"ok": False, "error": "last4_required"}, 400
    if transfer_amount <= 0:
        return {"ok": False, "error": "transfer_amount_required"}, 400
    if transfer_amount > TRADE_MAX_USD:
        return {"ok": False, "error": "trade_cap_exceeded", "cap_usd": TRADE_MAX_USD}, 400
    if not trade_release_open():
        return {
            "ok": False,
            "error": "founder_presence_required",
            "message": "Sell Your ARIA trading is on hold until founder is present and release is opened.",
            "cap_usd": TRADE_MAX_USD
        }, 423
    lock_until = trade_lock_until(from_email)
    now_ts = int(time.time())
    if lock_until > now_ts:
        return {
            "ok": False,
            "error": "trade_locked",
            "unlock_at": datetime.utcfromtimestamp(lock_until).isoformat() + "Z",
            "message": "Trading is locked for one week after repeated failed re-verification."
        }, 423
    plan = get_subscription_for_email(from_email)
    if plan != "pro":
        return {"ok": False, "error": "unlimited_required"}, 403
    tax_amount = round(float(transfer_amount) * TRADE_SERVICE_TAX_RATE, 2)
    seller_net = round(float(transfer_amount) - tax_amount, 2)
    request_id = f"TR-{uuid.uuid4().hex[:10].upper()}"
    try:
        now = datetime.utcnow().isoformat() + "Z"
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO account_transfer_requests (request_id, from_email, to_email, aria_plan, transfer_amount, id_last4_hash, visa_last4_hash, status, reverify_passed, reverify_needed, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                request_id,
                from_email,
                to_email,
                plan,
                transfer_amount,
                hash_sensitive("id_last4", id_last4),
                hash_sensitive("visa_last4", visa_last4),
                "reverify_required",
                0,
                2,
                now,
                now,
            ),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500
    send_admin_alert("account_transfer_request", "urgent", request_id, "SupportRD transfer lane", f"{from_email} -> {to_email} ({plan}) gross ${transfer_amount:,.2f}, tax ${tax_amount:,.2f}, net ${seller_net:,.2f}")
    append_credit_audit(request_id, from_email, "account_transfer_requested", {"to_email": to_email, "plan": plan, "transfer_amount": transfer_amount, "tax_amount": tax_amount, "seller_net": seller_net})
    return {
        "ok": True,
        "request_id": request_id,
        "status": "reverify_required",
        "reverify_needed": 2,
        "transfer_amount": transfer_amount,
        "tax_rate": TRADE_SERVICE_TAX_RATE,
        "tax_amount": tax_amount,
        "seller_net": seller_net,
        "note": "Raw ID data is never stored; only secure hashes are kept."
    }

@app.route("/api/account-transfer/reverify", methods=["POST"])
def account_transfer_reverify():
    user = session.get("user") or {}
    session_email = (user.get("email") or "").strip().lower()
    if not session_email and not is_admin():
        return {"ok": False, "error": "login_required"}, 401
    data = request.json or {}
    request_id = (data.get("request_id") or "").strip()
    id_last4 = "".join([c for c in str(data.get("id_last4") or "") if c.isdigit()])
    visa_last4 = "".join([c for c in str(data.get("visa_last4") or "") if c.isdigit()])
    if not request_id or len(id_last4) != 4 or len(visa_last4) != 4:
        return {"ok": False, "error": "invalid_reverify_payload"}, 400
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT from_email, id_last4_hash, visa_last4_hash, status, reverify_passed, reverify_needed "
            "FROM account_transfer_requests WHERE request_id = ? LIMIT 1",
            (request_id,),
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "error": "request_not_found"}, 404
        from_email, id_hash, visa_hash, status, passed, needed = row
        if not is_admin() and from_email != session_email:
            conn.close()
            return {"ok": False, "error": "identity_mismatch"}, 403
        if status not in ("reverify_required", "pending_review"):
            conn.close()
            return {"ok": False, "error": "request_not_reverifiable"}, 409
        ok_id = hash_sensitive("id_last4", id_last4) == (id_hash or "")
        ok_visa = hash_sensitive("visa_last4", visa_last4) == (visa_hash or "")
        if not (ok_id and ok_visa):
            record_reverify_result(from_email, passed=False)
            cur.execute(
                "UPDATE account_transfer_requests SET status = ?, updated_at = ? WHERE request_id = ?",
                ("reverify_required", datetime.utcnow().isoformat() + "Z", request_id),
            )
            conn.commit()
            conn.close()
            lock_until = trade_lock_until(from_email)
            if lock_until > int(time.time()):
                return {"ok": False, "error": "trade_locked", "unlock_at": datetime.utcfromtimestamp(lock_until).isoformat() + "Z"}, 423
            return {"ok": False, "error": "reverify_failed", "message": "Re-verification failed. Two failed attempts lock trading for one week."}, 400
        passed = int(passed or 0) + 1
        needed = int(needed or 2)
        next_status = "pending_review" if passed >= needed else "reverify_required"
        cur.execute(
            "UPDATE account_transfer_requests SET reverify_passed = ?, status = ?, updated_at = ? WHERE request_id = ?",
            (passed, next_status, datetime.utcnow().isoformat() + "Z", request_id),
        )
        conn.commit()
        conn.close()
        record_reverify_result(from_email, passed=True)
        return {"ok": True, "request_id": request_id, "status": next_status, "reverify_passed": passed, "reverify_needed": needed}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500

@app.route("/api/account-transfer/approve", methods=["POST"])
def account_transfer_approve():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    data = request.json or {}
    request_id = (data.get("request_id") or "").strip()
    if not request_id:
        return {"ok": False, "error": "request_id_required"}, 400
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT from_email, to_email, aria_plan, transfer_amount, status, reverify_passed, reverify_needed FROM account_transfer_requests WHERE request_id = ? LIMIT 1",
            (request_id,),
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "error": "request_not_found"}, 404
        from_email, to_email, aria_plan, transfer_amount, status, reverify_passed, reverify_needed = row
        if float(transfer_amount or 0) > TRADE_MAX_USD:
            conn.close()
            return {"ok": False, "error": "trade_cap_exceeded", "cap_usd": TRADE_MAX_USD}, 409
        if not trade_release_open():
            conn.close()
            return {"ok": False, "error": "founder_presence_required", "message": "Founder presence is required before release is opened."}, 423
        if status != "pending_review":
            conn.close()
            return {"ok": False, "error": "request_not_pending"}, 409
        if int(reverify_passed or 0) < int(reverify_needed or 2):
            conn.close()
            return {"ok": False, "error": "reverify_incomplete"}, 409
        tax_amount = round(float(transfer_amount or 0) * TRADE_SERVICE_TAX_RATE, 2)
        seller_net = round(float(transfer_amount or 0) - tax_amount, 2)
        set_subscription_for_email(to_email, aria_plan or "pro", source="transfer_approved", order_id=request_id)
        set_subscription_for_email(from_email, "free", source="transfer_approved", order_id=request_id)
        now = datetime.utcnow().isoformat() + "Z"
        cur.execute(
            "UPDATE account_transfer_requests SET status = ?, updated_at = ? WHERE request_id = ?",
            ("approved", now, request_id),
        )
        conn.commit()
        conn.close()
        append_credit_audit(request_id, from_email, "account_transfer_approved", {"to_email": to_email, "plan": aria_plan, "transfer_amount": float(transfer_amount or 0), "tax_amount": tax_amount, "seller_net": seller_net})
        return {"ok": True, "status": "approved", "to_email": to_email, "plan": aria_plan, "transfer_amount": float(transfer_amount or 0), "tax_rate": TRADE_SERVICE_TAX_RATE, "tax_amount": tax_amount, "seller_net": seller_net}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500

@app.route("/api/account-transfer/status")
def account_transfer_status():
    return {
        "ok": True,
        "sell_aria_release_open": trade_release_open(),
        "founder_presence_required": True,
        "trade_cap_usd": TRADE_MAX_USD,
        "trade_service_tax_rate": TRADE_SERVICE_TAX_RATE
    }

@app.route("/api/account-transfer/release-toggle", methods=["POST"])
def account_transfer_release_toggle():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    data = request.json or {}
    active = bool(data.get("active"))
    founder_present = bool(data.get("founder_present"))
    if active and not founder_present:
        return {"ok": False, "error": "founder_presence_required"}, 400
    ok = set_setting("sell_aria_release_open", "1" if active else "0")
    if not ok:
        return {"ok": False, "error": "setting_write_failed"}, 500
    if active:
        send_admin_alert("sell_aria_release_opened", "urgent", "", "SupportRD transfer lane", "Founder present. Sell Your ARIA release opened.")
    return {"ok": True, "sell_aria_release_open": active, "trade_cap_usd": TRADE_MAX_USD, "trade_service_tax_rate": TRADE_SERVICE_TAX_RATE}

@app.route("/api/trade-bots/status")
def trade_bots_status():
    state = get_trade_bot_state()
    bots = []
    for bid in ("risk", "ops", "comms"):
        row = state.get(bid, {})
        bots.append({
            "bot_id": bid,
            "functions": TRADE_BOT_FUNCTIONS.get(bid, []),
            "last_run_at": row.get("last_run_at", ""),
            "last_status": row.get("last_status", "idle"),
            "last_summary": row.get("last_summary", "No run yet."),
            "metrics": row.get("metrics", {})
        })
    return {"ok": True, "bots": bots}

@app.route("/api/trade-bots/run", methods=["POST"])
def trade_bots_run():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    results = run_trade_bots()
    return {"ok": True, "results": results}

@app.route("/api/trade-bots/heartbeat-log", methods=["POST"])
def trade_bots_heartbeat_log():
    data = request.json or {}
    entries = data.get("entries") or []
    if not isinstance(entries, list):
        return {"ok": False, "error": "invalid_entries"}, 400
    written = 0
    for item in entries[:20]:
        if not isinstance(item, dict):
            continue
        bot_id = (item.get("bot_id") or "").strip().lower()
        if bot_id not in ("risk", "ops", "comms"):
            continue
        beat_mode = (item.get("beat_mode") or "slow").strip().lower()
        if beat_mode not in ("fast", "normal", "slow", "inout"):
            beat_mode = "slow"
        source = (item.get("source") or "ui").strip().lower()[:30]
        status = (item.get("status") or "idle").strip().lower()[:20]
        metrics = item.get("metrics") or {}
        append_trade_bot_heartbeat(bot_id, beat_mode, source, status, metrics)
        written += 1
    return {"ok": True, "written": written}

@app.route("/api/trade-bots/heartbeat-log")
def trade_bots_heartbeat_log_get():
    if not is_admin():
        return {"ok": False, "error": "unauthorized"}, 401
    bot_id = (request.args.get("bot_id") or "").strip().lower()
    limit = int(request.args.get("limit") or 50)
    limit = max(1, min(limit, 200))
    rows_out = []
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        if bot_id in ("risk", "ops", "comms"):
            cur.execute(
                "SELECT bot_id, beat_mode, source, status, metrics_json, created_at FROM trade_bot_heartbeat_log WHERE bot_id = ? ORDER BY id DESC LIMIT ?",
                (bot_id, limit)
            )
        else:
            cur.execute(
                "SELECT bot_id, beat_mode, source, status, metrics_json, created_at FROM trade_bot_heartbeat_log ORDER BY id DESC LIMIT ?",
                (limit,)
            )
        rows = cur.fetchall() or []
        conn.close()
        for r in rows:
            try:
                metrics = json.loads(r[4] or "{}")
            except:
                metrics = {}
            rows_out.append({
                "bot_id": r[0],
                "beat_mode": r[1],
                "source": r[2],
                "status": r[3],
                "metrics": metrics,
                "created_at": r[5]
            })
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500
    return {"ok": True, "rows": rows_out}

@app.route("/api/engine-glass/stream")
def engine_glass_stream():
    bot_state = get_trade_bot_state()
    recent = get_recent_credit_audit(limit=12)
    snaps = get_engine_snapshots(limit=6)
    action_lines = []
    for bid in ("risk", "ops", "comms"):
        row = bot_state.get(bid, {})
        action_lines.append(
            f"{bid.upper()} · {row.get('last_status', 'idle')} · {row.get('last_run_at', 'never')} · {row.get('last_summary', 'No run yet.')}"
        )
    render_lines = []
    for item in recent[:8]:
        render_lines.append(
            f"{item.get('created_at','')} | {item.get('event_type','event')} | {item.get('application_uuid','n/a')}"
        )
    if not render_lines:
        render_lines = ["No recent render-adjacent audit rows yet."]
    samples = [
        "Santiago team posting: scalp hydration before heat styling.",
        "Charlotte team posting: 7-day repair routine update.",
        "Santo Domingo team posting: before/after shine check.",
        "Miami team posting: quick style pulse and confidence boost.",
        "Community typing: 'What products should I use again?'",
    ]
    ecosystem_lines = random.sample(samples, k=min(3, len(samples)))
    for snap in snaps:
        ecosystem_lines.append(f"Snapshot[{(snap.get('source') or 'ui').upper()}] {snap.get('content')}")
    ecosystem_lines.append("#SupportRD is moving · resort-grade brochure experience active.")
    show_live_video = random.random() < 0.55
    return {
        "ok": True,
        "action_bot_lines": action_lines,
        "render_logging_lines": render_lines,
        "ecosystem_lines": ecosystem_lines,
        "ecosystem_live_video": show_live_video,
        "resort_mode": True
    }

@app.route("/api/engine-glass/snapshot", methods=["POST"])
def engine_glass_snapshot():
    data = request.json or {}
    content = (data.get("content") or "").strip()
    source = (data.get("source") or "ui").strip().lower()[:120]
    if not content:
        return {"ok": False, "error": "content_required"}, 400
    ok = append_engine_snapshot(content, source=source or "ui")
    if not ok:
        return {"ok": False, "error": "snapshot_write_failed"}, 500
    return {"ok": True, "content": content[:120], "source": source or "ui"}

@app.route("/api/engine-glass/my-frequency")
def engine_glass_my_frequency():
    email = (request.args.get("email") or "").strip().lower()
    if not email:
        return {"ok": False, "error": "email_required"}, 400
    user = session.get("user") or {}
    session_email = (user.get("email") or "").strip().lower()
    if session_email and session_email != email and not is_admin():
        return {"ok": False, "error": "identity_mismatch"}, 403
    is_pro = get_subscription_for_email(email) == "pro" or email == "agentanthony@supportrd.com"
    if not is_pro:
        return {"ok": False, "error": "pro_required"}, 403
    rows_out = []
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "SELECT content, created_at FROM engine_snapshots WHERE LOWER(source) = ? ORDER BY id DESC LIMIT 18",
            (email,)
        )
        rows = cur.fetchall() or []
        conn.close()
        for c, t in rows:
            rows_out.append(f"{t} | {c}")
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500
    return {"ok": True, "email": email, "lines": rows_out}

@app.route("/api/competitions/create", methods=["POST"])
def competitions_create():
    user = session.get("user") or {}
    owner_email = (user.get("email") or "").strip().lower()
    if not owner_email and not is_admin():
        return {"ok": False, "error": "login_required"}, 401
    data = request.json or {}
    opponent_url = (data.get("opponent_url") or "").strip()
    membership_tier = (data.get("membership_tier") or "premium").strip().lower()
    if membership_tier not in ("premium", "pro", "yoda"):
        return {"ok": False, "error": "invalid_membership_tier"}, 400
    if not opponent_url or not (opponent_url.startswith("http://") or opponent_url.startswith("https://")):
        return {"ok": False, "error": "valid_opponent_url_required"}, 400
    if not competition_content_allowed(opponent_url):
        return {"ok": False, "error": "pornography_blocked", "message": "No pornography is allowed in competition links."}, 400
    competition_id = f"CMP-{uuid.uuid4().hex[:10].upper()}"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO competitions (competition_id, owner_email, opponent_url, membership_tier, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                competition_id,
                owner_email or "admin",
                opponent_url[:350],
                membership_tier,
                "active",
                datetime.utcnow().isoformat() + "Z",
            ),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500
    challenge_url = f"{request.host_url.rstrip('/')}/?competition={competition_id}&tier={membership_tier}"
    append_credit_audit(competition_id, owner_email or "admin", "competition_created", {"tier": membership_tier, "opponent_url": opponent_url[:200]})
    return {"ok": True, "competition_id": competition_id, "challenge_url": challenge_url, "status": "active", "score_metrics": ["laughs", "excitement", "votes"]}

@app.route("/api/competitions/start-live", methods=["POST"])
def competitions_start_live():
    user = session.get("user") or {}
    owner_email = (user.get("email") or "").strip().lower()
    data = request.json or {}
    if not owner_email:
        owner_email = (data.get("email") or "").strip().lower()
    if not owner_email and not is_admin():
        return {"ok": False, "error": "login_required"}, 401
    duration = int(data.get("duration_minutes") or 0)
    if duration not in (30, 60):
        return {"ok": False, "error": "duration_invalid"}, 400
    try:
        bet_amount = float(data.get("bet_amount") or 0)
    except:
        bet_amount = 0
    if bet_amount <= 0:
        return {"ok": False, "error": "bet_amount_required"}, 400
    if bet_amount > TRADE_MAX_USD:
        return {"ok": False, "error": "bet_cap_exceeded", "cap_usd": TRADE_MAX_USD}, 400
    payment_source = (data.get("payment_source") or "").strip().lower()
    if payment_source not in ("debit_card", "bank_account"):
        return {"ok": False, "error": "payment_source_invalid"}, 400
    payment_linked = bool(data.get("payment_linked"))
    if not payment_linked:
        return {"ok": False, "error": "payment_link_required"}, 400
    session_id = f"LIVE-{uuid.uuid4().hex[:10].upper()}"
    started_at = datetime.utcnow().isoformat() + "Z"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO competition_sessions (session_id, owner_email, duration_minutes, bet_amount, payment_source, status, started_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (session_id, owner_email or "admin", duration, bet_amount, payment_source, "live", started_at)
        )
        conn.commit()
        conn.close()
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500
    append_credit_audit(session_id, owner_email or "admin", "competition_live_started", {
        "duration_minutes": duration,
        "bet_amount": bet_amount,
        "payment_source": payment_source,
        "score_metrics": ["laughs", "excitement", "votes"]
    })
    return {
        "ok": True,
        "session_id": session_id,
        "status": "live",
        "duration_minutes": duration,
        "bet_amount": bet_amount,
        "payment_source": payment_source,
        "transfer_state": "queued_inhouse_transfer",
        "recording_hint": "Use the Post middle panel while live.",
        "score_metrics": ["laughs", "excitement", "votes"]
    }

@app.route("/api/competitions/movement-challenge", methods=["POST"])
def competitions_movement_challenge():
    user = session.get("user") or {}
    owner_email = (user.get("email") or "").strip().lower()
    if not owner_email and not is_admin():
        return {"ok": False, "error": "login_required"}, 401
    data = request.json or {}
    urls = data.get("participant_urls") or []
    mode = (data.get("mode") or "").strip().lower()
    if isinstance(urls, str):
        urls = [x.strip() for x in urls.split(",") if x.strip()]
    urls = [u for u in urls if isinstance(u, str) and (u.startswith("http://") or u.startswith("https://"))]
    unique_urls = []
    for u in urls:
        if not competition_content_allowed(u):
            return {"ok": False, "error": "pornography_blocked", "message": "No pornography is allowed in challenge URLs."}, 400
        if u not in unique_urls:
            unique_urls.append(u[:350])
    min_needed = 6
    max_allowed = 100
    if mode == "1v1":
        min_needed = 2
        max_allowed = 2
    elif mode == "5v5":
        min_needed = 10
        max_allowed = 10
    unique_urls = unique_urls[:max_allowed]
    if len(unique_urls) < min_needed:
        if mode == "1v1":
            return {"ok": False, "error": "minimum_2_participants_required"}, 400
        if mode == "5v5":
            return {"ok": False, "error": "minimum_10_participants_required"}, 400
        return {"ok": False, "error": "minimum_6_participants_required"}, 400
    areas = ["Health", "Longevity", "Care", "Love", "Issues"]
    challenge_id = f"MVM-{uuid.uuid4().hex[:10].upper()}"
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO movement_challenges (challenge_id, owner_email, participant_urls, areas, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                challenge_id,
                owner_email or "admin",
                json.dumps(unique_urls),
                json.dumps(areas),
                "active",
                datetime.utcnow().isoformat() + "Z",
            ),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500
    challenge_url = f"{request.host_url.rstrip('/')}/?movement_challenge={challenge_id}"
    append_credit_audit(challenge_id, owner_email or "admin", "movement_challenge_created", {"participants": len(unique_urls), "areas": areas, "mode": mode or "open"})
    return {"ok": True, "challenge_id": challenge_id, "challenge_url": challenge_url, "participants": len(unique_urls), "areas": areas, "mode": mode or "open", "score_metrics": ["laughs", "excitement", "votes"]}

@app.route("/api/me")
def me():
    user = session.get("user")
    if not user:
        return {"authenticated": False}
    email = (user.get("email") or "").strip().lower()
    return {
        "authenticated": True,
        "user": user,
        "admin": is_admin(),
        "subscription": get_subscription_for_email(email)
    }

@app.route("/api/subscription/status")
def subscription_status():
    user = session.get("user") or {}
    email = (request.args.get("email") or user.get("email") or "").strip().lower()
    if not email:
        return {"ok": False, "error": "email_required"}, 400
    details = get_subscription_details_for_email(email)
    return {
        "ok": True,
        "subscription": details.get("plan") or "free",
        "source": details.get("source") or "",
        "order_id": details.get("order_id") or "",
        "updated_at": details.get("updated_at") or "",
        "recent_purchases": get_recent_purchases_for_email(email, limit=5),
    }

@app.route("/api/studio/plan")
def studio_plan():
    user = session.get("user") or {}
    email = (user.get("email") or "").strip().lower()
    plan = get_subscription_for_email(email) if email else "free"
    tier = "free"
    if plan in PREMIUM_SUBSCRIPTION_PLANS:
        tier = "premium100"
    if plan in ("pro", "studio100"):
        tier = "pro500"
    return {
        "ok": True,
        "beta_public": True,
        "one_page": True,
        "tier": tier,
        "email": email or "",
        "features": {
            "base_transport": True,
            "recording": True,
            "lyrics_safety": True,
            "echo_placement_2026": True,
            "edit_bot": tier in ("premium100", "pro500"),
            "technical_bot": tier == "pro500",
            "premium_jake": studio_jake_access_for_plan(plan),
        },
    }

@app.route("/api/studio/jake/access")
def studio_jake_access():
    user = session.get("user") or {}
    email = (user.get("email") or "").strip().lower()
    if not email:
        return {
            "ok": False,
            "authenticated": False,
            "access": False,
            "error": "login_required",
            "login_url": "/login",
            "product_url": "https://shop.supportrd.com/products/jake-premium-studio",
        }, 401
    details = get_subscription_details_for_email(email)
    plan = (details.get("plan") or "free").strip().lower()
    access = studio_jake_access_for_plan(plan)
    return {
        "ok": access,
        "authenticated": True,
        "access": access,
        "email": email,
        "subscription": plan,
        "source": details.get("source") or "",
        "order_id": details.get("order_id") or "",
        "updated_at": details.get("updated_at") or "",
        "product_key": "studio100",
        "product_title": "Jake Premium Studio",
        "product_url": "https://shop.supportrd.com/products/jake-premium-studio",
        "login_url": "/login",
        "message": "Jake Premium Studio is ready." if access else "Jake Premium Studio needs a Studio / Pro package before entering the booth.",
    }, (200 if access else 402)

@app.route("/api/studio/jake/enter", methods=["POST"])
def studio_jake_enter():
    user = session.get("user") or {}
    email = (user.get("email") or "").strip().lower()
    if not email:
        return {
            "ok": False,
            "authenticated": False,
            "access": False,
            "error": "login_required",
            "login_url": "/login",
            "product_url": "https://shop.supportrd.com/products/jake-premium-studio",
        }, 401
    details = get_subscription_details_for_email(email)
    plan = (details.get("plan") or "free").strip().lower()
    if not studio_jake_access_for_plan(plan):
        return {
            "ok": False,
            "authenticated": True,
            "access": False,
            "error": "premium_jake_required",
            "subscription": plan,
            "product_key": "studio100",
            "product_title": "Jake Premium Studio",
            "product_url": "https://shop.supportrd.com/products/jake-premium-studio",
            "message": "Upgrade to Jake Premium Studio or Pro to open the Studio with Jake attending.",
        }, 402
    session_id = f"SES-{uuid.uuid4().hex[:10].upper()}"
    payload = {
        "session_id": session_id,
        "owner_email": email,
        "plan": plan,
        "tier": "pro500",
        "route": "studio",
        "boards": [],
        "updated_at": _studio_now(),
        "assistant": "projake",
        "assistant_title": "Jake Studio Specialist",
        "entry_mode": "premium_jake",
    }
    _studio_upsert_session(session_id, email, payload)
    _studio_append_action(session_id, 0, "jake_enter", {
        "email": email,
        "subscription": plan,
        "entry_mode": "premium_jake",
    })
    return {
        "ok": True,
        "authenticated": True,
        "access": True,
        "session_id": session_id,
        "email": email,
        "subscription": plan,
        "assistant": "projake",
        "assistant_title": "Jake Studio Specialist",
    "studio_url": "/static/studio/index.html?v=20260414t",
        "message": "Jake Premium Studio is live and logged in cleanly.",
    }

@app.route("/api/studio/echo/place", methods=["POST"])
def studio_echo_place():
    _, _, _, access_error = _require_studio_jake_api_access()
    if access_error:
        return access_error
    data = request.json or {}
    transcript = (data.get("transcript") or "").strip()[:4000]
    duration_sec = data.get("duration_sec") or 60
    style = (data.get("style") or "auto").strip().lower()[:20]
    suggestions = _studio_echo_suggestions(transcript, duration_sec)
    return {
        "ok": True,
        "style": style,
        "engine": "echo-placement-2026-beta",
        "suggestions": suggestions,
    }

@app.route("/api/studio/session/save", methods=["POST"])
def studio_session_save():
    email, _, _, access_error = _require_studio_jake_api_access()
    if access_error:
        return access_error
    data = request.json or {}
    session_id = (data.get("session_id") or f"SES-{uuid.uuid4().hex[:10].upper()}").strip()[:40]
    payload = data.get("payload") or {}
    owner_email = email
    try:
        payload_json = json.dumps(payload, ensure_ascii=False)
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO studio_sessions (session_id, owner_email, payload_json, updated_at) VALUES (?, ?, ?, ?) "
            "ON CONFLICT(session_id) DO UPDATE SET owner_email=excluded.owner_email, payload_json=excluded.payload_json, updated_at=excluded.updated_at",
            (session_id, owner_email, payload_json, datetime.utcnow().isoformat() + "Z"),
        )
        conn.commit()
        conn.close()
        return {"ok": True, "session_id": session_id}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500

@app.route("/api/studio/session/load")
def studio_session_load():
    email, _, _, access_error = _require_studio_jake_api_access()
    if access_error:
        return access_error
    session_id = (request.args.get("session_id") or "").strip()
    if not session_id:
        return {"ok": False, "error": "session_id_required"}, 400
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT owner_email, payload_json, updated_at FROM studio_sessions WHERE session_id = ? LIMIT 1", (session_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return {"ok": False, "error": "not_found"}, 404
        owner_email = (row[0] or "").strip().lower()
        if owner_email and owner_email != email:
            return {"ok": False, "error": "forbidden"}, 403
        payload = json.loads(row[1] or "{}")
        return {"ok": True, "session_id": session_id, "payload": payload, "updated_at": row[2]}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500

@app.route("/api/studio/session/bootstrap", methods=["POST"])
def studio_session_bootstrap():
    email, _, plan, access_error = _require_studio_jake_api_access()
    if access_error:
        return access_error
    data = request.json or {}
    session_id = (data.get("session_id") or f"SES-{uuid.uuid4().hex[:10].upper()}").strip()[:40]
    owner_email = email
    plan, tier = _studio_plan_for_email(owner_email)
    payload = _studio_load_session_payload(session_id)
    existing_owner = (payload.get("owner_email") or "").strip().lower() if payload else ""
    if existing_owner and existing_owner != owner_email:
        return {"ok": False, "error": "forbidden"}, 403
    if not payload:
        payload = {
            "session_id": session_id,
            "owner_email": owner_email,
            "plan": plan,
            "tier": tier,
            "route": (data.get("route") or "studio").strip()[:40],
            "boards": [],
            "updated_at": _studio_now(),
        }
        _studio_upsert_session(session_id, owner_email, payload)
    return {
        "ok": True,
        "session_id": session_id,
        "owner_email": owner_email,
        "plan": plan,
        "tier": tier,
        "payload": payload,
    }

@app.route("/api/studio/board/commit", methods=["POST"])
def studio_board_commit():
    email, _, _, access_error = _require_studio_jake_api_access()
    if access_error:
        return access_error
    data = request.json or {}
    session_id = (data.get("session_id") or "").strip()
    if not session_id:
        return {"ok": False, "error": "session_id_required"}, 400
    board_index = int(data.get("board_index") or 0)
    board = _studio_safe_payload(data.get("board") or {})
    payload = _studio_load_session_payload(session_id)
    existing_owner = (payload.get("owner_email") or "").strip().lower() if payload else ""
    if existing_owner and existing_owner != email:
        return {"ok": False, "error": "forbidden"}, 403
    boards = payload.get("boards") or []
    while len(boards) <= board_index:
        boards.append({})
    boards[board_index] = board
    payload["boards"] = boards
    payload["updated_at"] = _studio_now()
    payload["active_board"] = int(data.get("active_board") or board_index)
    _studio_upsert_session(session_id, email, payload)
    _studio_append_action(session_id, board_index, data.get("action_type") or "commit", {
        "board_name": board.get("name"),
        "kind": board.get("kind"),
        "file_name": board.get("fileName"),
        "highlighted": board.get("highlighted"),
        "trimStart": board.get("trimStart"),
        "trimEnd": board.get("trimEnd"),
        "fx": board.get("fxPreset"),
        "video_filter": board.get("gigFilter"),
    })
    return {
        "ok": True,
        "session_id": session_id,
        "board_index": board_index,
        "saved_at": payload["updated_at"],
    }

@app.route("/api/studio/trim", methods=["POST"])
def studio_trim():
    email, _, _, access_error = _require_studio_jake_api_access()
    if access_error:
        return access_error
    data = request.json or {}
    session_id = (data.get("session_id") or "").strip()
    if not session_id:
        return {"ok": False, "error": "session_id_required"}, 400
    board_index = int(data.get("board_index") or 0)
    start = max(0, min(99, int(float(data.get("trim_start") or 0))))
    end = max(start + 1, min(100, int(float(data.get("trim_end") or 100))))
    payload = _studio_load_session_payload(session_id)
    existing_owner = (payload.get("owner_email") or "").strip().lower() if payload else ""
    if existing_owner and existing_owner != email:
        return {"ok": False, "error": "forbidden"}, 403
    boards = payload.get("boards") or []
    while len(boards) <= board_index:
        boards.append({})
    board = boards[board_index] or {}
    board["trimStart"] = start
    board["trimEnd"] = end
    board["highlighted"] = bool(data.get("highlighted", True))
    boards[board_index] = board
    payload["boards"] = boards
    payload["updated_at"] = _studio_now()
    _studio_upsert_session(session_id, email, payload)
    _studio_append_action(session_id, board_index, "trim", {"trimStart": start, "trimEnd": end, "highlighted": board["highlighted"]})
    return {"ok": True, "session_id": session_id, "board_index": board_index, "trim_start": start, "trim_end": end}

@app.route("/api/studio/fx/apply", methods=["POST"])
def studio_fx_apply():
    email, _, _, access_error = _require_studio_jake_api_access()
    if access_error:
        return access_error
    data = request.json or {}
    session_id = (data.get("session_id") or "").strip()
    if not session_id:
        return {"ok": False, "error": "session_id_required"}, 400
    board_index = int(data.get("board_index") or 0)
    payload = _studio_load_session_payload(session_id)
    existing_owner = (payload.get("owner_email") or "").strip().lower() if payload else ""
    if existing_owner and existing_owner != email:
        return {"ok": False, "error": "forbidden"}, 403
    boards = payload.get("boards") or []
    while len(boards) <= board_index:
        boards.append({})
    board = boards[board_index] or {}
    fx_patch = {
        "fxPreset": (data.get("fxPreset") or board.get("fxPreset") or "clean")[:40],
        "gigFilter": (data.get("gigFilter") or board.get("gigFilter") or "natural")[:40],
        "gigPan": (data.get("gigPan") or board.get("gigPan") or "standard")[:40],
        "gigFrameRate": (data.get("gigFrameRate") or board.get("gigFrameRate") or "24")[:20],
        "gigZoom": (data.get("gigZoom") or board.get("gigZoom") or "1x")[:20],
        "gigSlowMotion": (data.get("gigSlowMotion") or board.get("gigSlowMotion") or "off")[:20],
        "fxAppliedRange": (data.get("fxAppliedRange") or board.get("fxAppliedRange") or "")[:240],
    }
    board.update(fx_patch)
    boards[board_index] = board
    payload["boards"] = boards
    payload["updated_at"] = _studio_now()
    _studio_upsert_session(session_id, email, payload)
    _studio_append_action(session_id, board_index, "fx", fx_patch)
    return {"ok": True, "session_id": session_id, "board_index": board_index, "fx": fx_patch}

@app.route("/api/studio/export", methods=["POST"])
def studio_export():
    email, _, _, access_error = _require_studio_jake_api_access()
    if access_error:
        return access_error
    data = request.json or {}
    session_id = (data.get("session_id") or "").strip()
    if not session_id:
        return {"ok": False, "error": "session_id_required"}, 400
    board_index = int(data.get("board_index") or 0)
    destination = (data.get("destination") or "Main Studio").strip()[:60]
    payload = _studio_load_session_payload(session_id)
    existing_owner = (payload.get("owner_email") or "").strip().lower() if payload else ""
    if existing_owner and existing_owner != email:
        return {"ok": False, "error": "forbidden"}, 403
    boards = payload.get("boards") or []
    board = boards[board_index] if len(boards) > board_index else {}
    summary = {
        "board_name": board.get("name") or f"Motherboard {board_index + 1}",
        "file_name": board.get("fileName") or "",
        "kind": board.get("kind") or "empty",
        "trimStart": board.get("trimStart"),
        "trimEnd": board.get("trimEnd"),
        "destination": destination,
    }
    conn = sqlite3.connect(CREDIT_DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO studio_exports (session_id, board_index, destination, payload_json, created_at) VALUES (?, ?, ?, ?, ?)",
        (session_id, board_index, destination, json.dumps(summary, ensure_ascii=False), _studio_now()),
    )
    conn.commit()
    conn.close()
    _studio_append_action(session_id, board_index, "export", summary)
    return {"ok": True, "session_id": session_id, "board_index": board_index, "destination": destination, "summary": summary}

@app.route("/api/studio/session/history")
def studio_session_history():
    email, _, _, access_error = _require_studio_jake_api_access()
    if access_error:
        return access_error
    session_id = (request.args.get("session_id") or "").strip()
    if not session_id:
        return {"ok": False, "error": "session_id_required"}, 400
    limit = max(1, min(60, int(request.args.get("limit") or 20)))
    conn = sqlite3.connect(CREDIT_DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT s.owner_email, a.board_index, a.action_type, a.payload_json, a.created_at "
        "FROM studio_board_actions a "
        "LEFT JOIN studio_sessions s ON s.session_id = a.session_id "
        "WHERE a.session_id = ? ORDER BY a.id DESC LIMIT ?",
        (session_id, limit),
    )
    rows = cur.fetchall() or []
    conn.close()
    history = []
    for owner_email, board_index, action_type, payload_json, created_at in rows:
        if owner_email and owner_email.strip().lower() != email:
            continue
        try:
            payload = json.loads(payload_json or "{}")
        except:
            payload = {}
        history.append({
            "board_index": board_index,
            "action_type": action_type,
            "payload": payload,
            "created_at": created_at,
        })
    return {"ok": True, "session_id": session_id, "history": history}

@app.route("/webhooks/shopify/orders-paid", methods=["POST"])
def shopify_orders_paid_webhook():
    if not SHOPIFY_WEBHOOK_SECRET:
        return {"ok": False, "error": "webhook_secret_not_configured"}, 503
    h = request.headers.get("X-Shopify-Hmac-Sha256", "")
    body = request.get_data() or b""
    digest = hmac.new(
        SHOPIFY_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256
    ).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    if not h or not hmac.compare_digest(expected, h):
        return {"ok": False, "error": "invalid_signature"}, 401
    try:
        payload = request.json or {}
        email = (payload.get("email") or ((payload.get("customer") or {}).get("email")) or "").strip().lower()
        if not email:
            return {"ok": True, "ignored": "missing_email"}
        order_id = str(payload.get("id") or "")
        items = payload.get("line_items", []) or []
        plan, match_reason = infer_shopify_plan_from_line_items(items)
        if not plan:
            return {"ok": True, "ignored": "not_subscription_order"}
        ok = set_subscription_for_email(email, plan, source="shopify_webhook_paid", order_id=order_id)
        remember_purchase_for_email(email, plan, plan, source="shopify_webhook_paid", order_id=order_id)
        return {"ok": bool(ok), "email": email, "plan": plan, "match_reason": match_reason}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}, 500

@app.route("/api/webhooks/shopify/test-map", methods=["POST"])
def test_shopify_webhook_mapping():
    if not is_admin():
        return {"ok": False, "error": "admin_required"}, 403
    data = request.json or {}
    items = data.get("line_items") or []
    plan, reason = infer_shopify_plan_from_line_items(items)
    return {
        "ok": True,
        "plan": plan,
        "match_reason": reason,
        "sku_map_loaded": bool(SHOPIFY_PLAN_SKU_MAP),
        "variant_map_loaded": bool(SHOPIFY_PLAN_VARIANT_MAP),
        "item_count": len(items),
    }

@app.route("/api/shopify/connector-health")
def shopify_connector_health():
    storefront_configured = bool(SHOPIFY_STORE and SHOPIFY_TOKEN)
    admin_configured = bool(SHOPIFY_STORE and SHOPIFY_ADMIN_TOKEN)
    webhook_configured = bool(SHOPIFY_WEBHOOK_SECRET)

    missing = []
    if not SHOPIFY_STORE:
        missing.append("SHOPIFY_STORE")
    if not SHOPIFY_TOKEN:
        missing.append("SHOPIFY_STOREFRONT_TOKEN")
    if not SHOPIFY_ADMIN_TOKEN:
        missing.append("SHOPIFY_ADMIN_TOKEN")
    if not SHOPIFY_WEBHOOK_SECRET:
        missing.append("SHOPIFY_WEBHOOK_SECRET")

    products_live = False
    product_count = 0
    products_error = ""
    if storefront_configured:
        try:
            products = get_products() or []
            product_count = len(products)
            products_live = product_count > 0
            if not products_live:
                products_error = "no_products_from_storefront"
        except Exception as e:
            products_error = str(e)[:120]

    score = 0
    score += 30 if storefront_configured else 0
    score += 30 if admin_configured else 0
    score += 25 if webhook_configured else 0
    score += 15 if products_live else 0
    status = "critical" if score < 55 else ("watch" if score < 85 else "healthy")

    return {
        "ok": True,
        "status": status,
        "score": score,
        "storefront_configured": storefront_configured,
        "admin_configured": admin_configured,
        "webhook_configured": webhook_configured,
        "products_live": products_live,
        "product_count": product_count,
        "missing": missing,
        "products_error": products_error,
    }

@app.route("/api/shopify/public-config")
def shopify_public_config():
    store = resolve_shopify_storefront_domain()
    storefront_base = f"https://{store}" if store else ""
    return {
        "ok": bool(store),
        "storefront_base": storefront_base,
        "storefront_host": store,
        "storefront_token_public": SHOPIFY_TOKEN if store and SHOPIFY_TOKEN else "",
        "cart_url": f"{storefront_base}/cart" if storefront_base else "",
        "orders_url": f"{storefront_base}/account/orders" if storefront_base else "",
        "checkout_map": get_public_shopify_checkout_map(),
        "checkout_map_loaded": bool(SHOPIFY_PLAN_VARIANT_MAP),
    }

@app.route("/api/system-map")
def system_map_status():
    counts = {
        "accounts": 0,
        "voice_sessions": 0,
        "diary_sessions": 0,
        "studio_sessions": 0,
    }
    db_ready = True
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users")
        counts["accounts"] = int((cur.fetchone() or [0])[0] or 0)
        cur.execute("SELECT COUNT(*) FROM voice_sessions")
        counts["voice_sessions"] = int((cur.fetchone() or [0])[0] or 0)
        cur.execute("SELECT COUNT(*) FROM diary_sessions")
        counts["diary_sessions"] = int((cur.fetchone() or [0])[0] or 0)
        cur.execute("SELECT COUNT(*) FROM studio_sessions")
        counts["studio_sessions"] = int((cur.fetchone() or [0])[0] or 0)
        conn.close()
    except Exception:
        db_ready = False
    storefront_domain = resolve_shopify_storefront_domain()
    api_domain = resolve_shopify_api_domain()
    seo_routes = [
        {"route": "home", "path": "/remote", "title": "SupportRD Remote"},
        {"route": "diary", "path": "/remote/diary", "title": "SupportRD Diary"},
        {"route": "studio", "path": "/remote/studio", "title": "SupportRD Studio Quick"},
        {"route": "settings", "path": "/remote/settings", "title": "SupportRD Configuration"},
        {"route": "map", "path": "/remote/map", "title": "SupportRD Map Change"},
        {"route": "faq", "path": "/remote/faq", "title": "SupportRD FAQ Lounge"},
        {"route": "profile", "path": "/remote/profile", "title": "SupportRD Profile"},
        {"route": "payments", "path": "/remote/payments", "title": "SupportRD Payments"},
        {"route": "official", "path": "/remote/official", "title": "SupportRD Official Info"},
    ]
    return {
        "ok": True,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "layers": {
            "openai": {
                "configured": bool(OPENAI_KEY and client),
                "model": OPENAI_MODEL,
                "realtime_ready": bool(OPENAI_KEY),
                "speech_ready": bool(OPENAI_KEY),
                "transcribe_ready": bool(OPENAI_KEY),
            },
            "shopify": {
                "storefront_configured": bool(SHOPIFY_STORE and SHOPIFY_TOKEN),
                "admin_configured": bool(SHOPIFY_STORE and SHOPIFY_ADMIN_TOKEN),
                "webhook_configured": bool(SHOPIFY_WEBHOOK_SECRET),
                "variant_map_loaded": bool(SHOPIFY_PLAN_VARIANT_MAP),
                "sku_map_loaded": bool(SHOPIFY_PLAN_SKU_MAP),
                "storefront_domain": storefront_domain,
                "api_domain": api_domain,
            },
            "account": {
                "db_ready": db_ready,
                "settings_db_ready": db_ready,
                "login_gate": True,
                "profile_memory": True,
                "user_count": counts["accounts"],
            },
            "diary": {
                "db_ready": db_ready,
                "session_api": True,
                "lobby_api": True,
                "comments_api": True,
                "live_feed_ready": True,
                "session_count": counts["diary_sessions"],
            },
            "studio": {
                "db_ready": db_ready,
                "session_api": True,
                "exports_api": True,
                "premium_gate": True,
                "storage_ready": bool(STUDIO_STORAGE_DIR),
                "session_count": counts["studio_sessions"],
            },
            "voice": {
                "db_ready": db_ready,
                "bootstrap_api": True,
                "respond_api": True,
                "history_api": True,
                "realtime_api": bool(OPENAI_KEY),
                "session_count": counts["voice_sessions"],
            },
            "pocketbase": {
                "configured": False,
                "note": "PocketBase is not wired yet in this build.",
            },
            "cloud": {
                "host": request.host,
                "origin": request.host_url.rstrip("/"),
                "https": request.is_secure or request.headers.get("X-Forwarded-Proto", "") == "https",
            },
        },
        "remote": {
            "sealed_shell": True,
            "default_path": "/remote",
            "on_the_go_ready": True,
            "assistant_free_roam": True,
        },
        "seo": {
            "routes": seo_routes,
            "origin": request.host_url.rstrip("/"),
        },
    }


@app.route("/api/profile/access-scanner")
def profile_access_scanner():
    user = session.get("user") or {}
    email = (request.args.get("email") or user.get("email") or "").strip().lower()
    display_name = (request.args.get("display_name") or user.get("name") or user.get("username") or email.split("@")[0] if email else "SupportRD Host").strip()
    hair_damage = (request.args.get("hair_damage") or "").strip()
    hair_texture = (request.args.get("hair_texture") or "").strip()
    hair_type = (request.args.get("hair_type") or "").strip()
    avatar_set = str(request.args.get("avatar_set") or "").strip().lower() in ("1", "true", "yes", "on")
    activity = {
        "voice_turns": 0,
        "diary_sessions": 0,
        "studio_sessions": 0,
    }
    latest_analysis = None
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        if email:
            cur.execute("SELECT COUNT(*) FROM voice_sessions WHERE owner_email = ?", (email,))
            activity["voice_turns"] = int((cur.fetchone() or [0])[0] or 0)
            cur.execute("SELECT COUNT(*) FROM diary_sessions WHERE owner_email = ?", (email,))
            activity["diary_sessions"] = int((cur.fetchone() or [0])[0] or 0)
            cur.execute("SELECT COUNT(*) FROM studio_sessions WHERE owner_email = ?", (email,))
            activity["studio_sessions"] = int((cur.fetchone() or [0])[0] or 0)
            cur.execute(
                "SELECT display_name, summary_text, texture, color, damage, hair_type, created_at "
                "FROM profile_analysis_reports WHERE email = ? ORDER BY id DESC LIMIT 1",
                (email,),
            )
            row = cur.fetchone()
            if row:
                latest_analysis = {
                    "display_name": row[0],
                    "summary_text": row[1],
                    "texture": row[2],
                    "color": row[3],
                    "damage": row[4],
                    "hair_type": row[5],
                    "created_at": row[6],
                }
        conn.close()
    except Exception:
        pass
    identity_text = (
        f"Identity Confirmed: {display_name or 'SupportRD Host'} looks present, welcome-ready, and tied to a protected SupportRD lane. "
        f"Scanner anchor: {_mask_ip(request.headers.get('X-Forwarded-For') or request.remote_addr)}."
    )
    if not avatar_set:
        identity_text += " Profile image is still on stock fallback, so live identity confidence is moderate until a personal picture is saved."
    status_text = (
        "General Status Reading: your status looks steady for the next presentation or meeting. "
        f"Diary sessions: {activity['diary_sessions']} · Studio sessions: {activity['studio_sessions']} · Voice sessions: {activity['voice_turns']}."
    )
    if hair_damage:
        status_text += f" Hair watch note: {hair_damage}."
    else:
        status_text += " No major hair crisis is showing from the current account memory."
    return {
        "ok": True,
        "email": email,
        "display_name": display_name,
        "api_access": {
            "openai": bool(OPENAI_KEY and client),
            "shopify": bool(SHOPIFY_STORE and SHOPIFY_TOKEN),
            "account": True,
            "diary": True,
            "studio": True,
            "voice": True,
            "cloud": True,
            "pocketbase": False,
        },
        "identity_confirmed": identity_text,
        "general_status": status_text,
        "hair_analysis": {
            "texture": hair_texture or (latest_analysis or {}).get("texture") or "waiting",
            "hair_type": hair_type or (latest_analysis or {}).get("hair_type") or "waiting",
            "damage": hair_damage or (latest_analysis or {}).get("damage") or "waiting",
            "latest_export_at": (latest_analysis or {}).get("created_at") or "",
            "latest_summary": (latest_analysis or {}).get("summary_text") or "",
        },
    }


@app.route("/api/profile/analysis/export", methods=["POST"])
def profile_analysis_export():
    user = session.get("user") or {}
    body = request.json or {}
    email = (user.get("email") or body.get("email") or "").strip().lower()
    display_name = (body.get("display_name") or user.get("name") or user.get("username") or email.split("@")[0] if email else "SupportRD Host").strip()
    summary_text = (body.get("summary_text") or "").strip()
    texture = (body.get("texture") or "").strip()
    color = (body.get("color") or "").strip()
    damage = (body.get("damage") or "").strip()
    hair_type = (body.get("hair_type") or "").strip()
    export_format = (body.get("format") or "pdf").strip().lower()
    if export_format not in ("pdf", "docx"):
        return {"ok": False, "error": "invalid_format"}, 400
    lines = [
        f"SupportRD Hair Analysis Export · {display_name}",
        f"Email: {email or 'guest'}",
        f"Created: {datetime.utcnow().isoformat()}Z",
        "",
        f"Texture: {texture or 'waiting'}",
        f"Hair Color: {color or 'waiting'}",
        f"Sign of Damage: {damage or 'waiting'}",
        f"Hair Type: {hair_type or 'waiting'}",
        "",
        "Summary:",
        summary_text or "No detailed summary was provided yet.",
    ]
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO profile_analysis_reports (email, display_name, summary_text, texture, color, damage, hair_type, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (email, display_name, summary_text, texture, color, damage, hair_type, datetime.utcnow().isoformat() + "Z"),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass
    safe_name = _clean_export_name(display_name or email.split("@")[0] if email else "supportrd-profile")
    if export_format == "docx":
        data = _build_profile_analysis_docx(lines)
        response = Response(
            data,
            mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        response.headers["Content-Disposition"] = f'attachment; filename="{safe_name}-hair-analysis.docx"'
        return response
    data = _build_profile_analysis_pdf(lines)
    response = Response(data, mimetype="application/pdf")
    response.headers["Content-Disposition"] = f'attachment; filename="{safe_name}-hair-analysis.pdf"'
    return response


@app.route("/api/diary/lobby/movement")
def diary_lobby_movement():
    feeds = list_diary_lobby_sessions("recent", limit=7)
    finance = get_shopify_finance_snapshot()
    latest_session = feeds[0] if feeds else {}
    return {
        "ok": True,
        "header": "This is what SupportRD is doing",
        "latest_activity": {
            "session_name": latest_session.get("display_name") or latest_session.get("owner_name") or "No live session yet",
            "tag": latest_session.get("profile_tag") or "",
            "updated_at": latest_session.get("updated_at") or "",
            "preview": latest_session.get("preview_text") or "Waiting for the next live diary session.",
        },
        "shopify_reader": {
            "sessions": len(feeds),
            "orders": finance.get("orders_count", 0) if finance.get("ok") else 0,
            "total_sales": finance.get("today_total", 0) if finance.get("ok") else 0,
            "conversion_rate": 0,
            "currency": finance.get("currency", "USD") if finance.get("ok") else "USD",
            "risk_level": finance.get("risk_level", "watch") if finance.get("ok") else "watch",
        }
    }

@app.route("/products/<path:slug>")
def shopify_product_redirect(slug):
    store = resolve_shopify_storefront_domain()
    if not store:
        return {"ok": False, "error": "shopify_store_not_configured"}, 404
    return redirect(f"https://{store}/products/{slug}", code=302)

@app.route("/cart")
def shopify_cart_redirect():
    store = resolve_shopify_storefront_domain()
    if not store:
        return {"ok": False, "error": "shopify_store_not_configured"}, 404
    return redirect(f"https://{store}/cart", code=302)

@app.route("/cart/<path:line_items>")
def shopify_cart_line_items_redirect(line_items):
    store = resolve_shopify_storefront_domain()
    if not store:
        return {"ok": False, "error": "shopify_store_not_configured"}, 404
    clean_items = re.sub(r"[^0-9:,]", "", str(line_items or ""))
    if not clean_items:
        return redirect(f"https://{store}/cart", code=302)
    ref = request.args.get("ref", "supportrd-remote")[:80]
    return redirect(
        f"https://{store}/cart/{clean_items}?ref={ref}",
        code=302,
    )

@app.route("/checkout/<variant_id>")
def shopify_checkout_redirect(variant_id):
    store = resolve_shopify_storefront_domain()
    clean_variant = "".join(ch for ch in str(variant_id) if ch.isdigit())
    if not store:
        return {"ok": False, "error": "shopify_store_not_configured"}, 404
    if not clean_variant:
        return redirect(f"https://{store}/cart", code=302)
    ref = request.args.get("src", "supportrd-remote")[:80]
    return redirect(
        f"https://{store}/cart/{clean_variant}:1?ref={ref}",
        code=302,
    )

@app.route("/account/orders")
def shopify_orders_redirect():
    store = resolve_shopify_storefront_domain()
    if not store:
        return {"ok": False, "error": "shopify_store_not_configured"}, 404
    return redirect(f"https://{store}/account/orders", code=302)

@app.route("/pages/<path:slug>")
def shopify_page_redirect(slug):
    store = resolve_shopify_storefront_domain()
    if not store:
        return {"ok": False, "error": "shopify_store_not_configured"}, 404
    return redirect(f"https://{store}/pages/{slug}", code=302)

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

@app.route("/api/credit/evaluate", methods=["POST"])
def credit_evaluate():
    data = request.json or {}
    user = session.get("user") or {}
    ip = client_ip()
    user_email = (user.get("email") or "").strip().lower()
    input_email = (data.get("email") or "").strip().lower()
    email = (input_email or user_email or "").strip().lower()
    country = (data.get("country") or "").strip().upper()
    has_payment_issues = bool(data.get("has_payment_issues"))
    kyc_ack = bool(data.get("kyc_ack"))

    if not user_email and not is_admin():
        return {"ok": False, "error": "login_required"}, 401
    if not is_admin():
        if not user_email:
            return {"ok": False, "error": "login_required"}, 401
        if input_email and input_email != user_email:
            ban_ip(ip, "identity_mismatch_attempt", f"input={input_email} session={user_email}")
            return {"ok": False, "error": "banned", "reason": "identity_mismatch_attempt"}, 403
        email = user_email
    frozen = frozen_reason(email)
    if frozen and not is_admin():
        return {"ok": False, "error": "account_frozen", "reason": frozen}, 403
    if not kyc_ack and not is_admin():
        return {"ok": False, "error": "kyc_ack_required"}, 400
    if rate_hit(ip, "credit_eval_strict", 300, 10):
        ban_ip(ip, "credit_velocity_abuse", "/api/credit/evaluate")
        return {"ok": False, "error": "banned", "reason": "credit_velocity_abuse"}, 403

    idem_key = (request.headers.get("X-Idempotency-Key") or "").strip()
    if idem_key:
        cached = idempotency_response(idem_key)
        if cached:
            cached["idempotent"] = True
            return cached

    try:
        requested_amount = float(data.get("requested_amount", 0) or 0)
        term_months = int(data.get("term_months", 0) or 0)
        monthly_income = float(data.get("monthly_income", 0) or 0)
        monthly_debt = float(data.get("monthly_debt", 0) or 0)
    except:
        return {"ok": False, "error": "invalid_numbers"}, 400

    if not email:
        return {"ok": False, "error": "email_required"}, 400
    if requested_amount <= 0 or monthly_income <= 0:
        return {"ok": False, "error": "invalid_financial_input"}, 400
    if requested_amount > 100000 or monthly_income > 1000000 or monthly_debt > 1000000:
        log_security_event(ip, "/api/credit/evaluate", "credit_outlier_input", f"amount={requested_amount}")
        return {"ok": False, "error": "outlier_input_blocked"}, 400
    if term_months < CREDIT_MIN_TERM_MONTHS or term_months > CREDIT_MAX_TERM_MONTHS:
        return {"ok": False, "error": "invalid_term"}, 400
    if open_obligations_count(email) >= CREDIT_MAX_OPEN_OBLIGATIONS:
        return {"ok": False, "error": "open_obligations_limit"}, 409

    allowed_payment = max(0.0, round(monthly_income * CREDIT_MAX_PAYMENT_RATIO - monthly_debt, 2))
    estimated_payment = round(requested_amount / term_months, 2)
    approved_amount = max(0.0, round(min(requested_amount, allowed_payment * term_months), 2))
    currency = currency_for_country(country)
    application_uuid = str(uuid.uuid4())

    status = "approved"
    reason = "approved"

    if country and country in CREDIT_BLOCKED_COUNTRIES:
        status = "denied"
        reason = "country_not_supported"
    elif has_payment_issues:
        status = "denied"
        reason = "risk_flag"
    elif allowed_payment <= 0:
        status = "denied"
        reason = "debt_ratio_limit"
    elif estimated_payment > allowed_payment:
        status = "denied"
        reason = "payment_above_30_percent_limit"
    elif requested_amount >= CREDIT_MANUAL_REVIEW_THRESHOLD:
        status = "conditional"
        reason = "manual_review_required"
    elif approved_amount < requested_amount:
        status = "conditional"
        reason = "reduced_limit"

    decision = {
        "email": email,
        "country": country,
        "requested_amount": requested_amount,
        "term_months": term_months,
        "monthly_income": monthly_income,
        "monthly_debt": monthly_debt,
        "estimated_payment": estimated_payment,
        "allowed_payment": allowed_payment,
        "approved_amount": approved_amount if status != "denied" else 0,
        "status": status,
        "reason": reason,
        "application_uuid": application_uuid,
        "obligation_status": "open" if status in ("approved", "conditional") else "none",
        "currency": currency,
        "country_supported": bool(country not in CREDIT_BLOCKED_COUNTRIES) if country else True,
    }
    save_credit_decision(decision)
    append_credit_audit(application_uuid, email, "credit_decision", {"status": status, "reason": reason, "requested_amount": requested_amount, "approved_amount": decision["approved_amount"]})
    log_security_event(ip, "/api/credit/evaluate", "credit_eval", f"{email} {status} {reason}")
    decision["ok"] = True
    decision["legal_note"] = "Automated pre-screen only. Final credit decisions require manual compliance review."
    if idem_key:
        remember_idempotency(idem_key, email, ip, decision)
    return decision

@app.route("/api/credit/status")
def credit_status():
    user = session.get("user") or {}
    q_email = (request.args.get("email") or "").strip().lower()
    user_email = (user.get("email") or "").strip().lower()
    if not user_email and not is_admin():
        return {"ok": False, "error": "login_required"}, 401
    if is_admin():
        email = (q_email or user_email or "").strip().lower()
    else:
        email = user_email
    if not email:
        return {"ok": False, "error": "email_required"}, 400
    row = latest_credit_decision(email)
    if not row:
        return {"ok": True, "status": "none"}
    row["ok"] = True
    return row

@app.route("/login")
def login():
    if not AUTH0_DOMAIN or not AUTH0_CLIENT_ID or not AUTH0_CLIENT_SECRET:
        return redirect("/")
    state = os.urandom(16).hex()
    session["oauth_state"] = state
    provider = request.args.get("provider")
    mode = request.args.get("mode", "").lower()
    login_hint = (request.args.get("login_hint") or "").strip()
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
    elif mode == "forgot":
        params["prompt"] = "login"
        params["screen_hint"] = "reset_password"
    if login_hint:
        params["login_hint"] = login_hint
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
        sync_authenticated_local_remote_account(session["user"])
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

    api_store = resolve_shopify_api_domain()
    if not api_store:
        return []

    query = """
    {
      products(first:10){
        edges{
          node{
            id
            title
            handle
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
            f"https://{api_store}/api/2024-01/graphql.json",
            json={"query": query},
            headers={
                "X-Shopify-Storefront-Access-Token": SHOPIFY_TOKEN
            },
            timeout=6
        )

        data = r.json()

        products = []

        for p in data.get("data", {}).get("products", {}).get("edges", []):
            node = p.get("node", {})
            variant_edges = node.get("variants", {}).get("edges", [])
            image_edges = node.get("images", {}).get("edges", [])
            if not variant_edges:
                continue
            v = variant_edges[0].get("node", {})
            image_url = ""
            if image_edges:
                image_url = image_edges[0].get("node", {}).get("url", "")
            products.append({
                "id": node.get("id", ""),
                "title": node.get("title", ""),
                "handle": node.get("handle", ""),
                "price": v.get("price", {}).get("amount", ""),
                "variant": v.get("id", ""),
                "image": image_url,
                "source": "storefront"
            })

        if products:
            PRODUCT_CACHE = products
            PRODUCT_CACHE_TIME = now
            return products
    except:
        pass

    if not SHOPIFY_ADMIN_TOKEN:
        return []

    try:
        r = requests.get(
            f"https://{api_store}/admin/api/2024-01/products.json?limit=20&fields=id,title,handle,image,variants,status,published_at",
            headers={"X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN},
            timeout=8
        )
        data = r.json()
        products = []
        for item in data.get("products", []):
            variants = item.get("variants") or []
            if not variants:
                continue
            first_variant = variants[0]
            image_obj = item.get("image") or {}
            products.append({
                "id": str(item.get("id", "")).strip(),
                "title": item.get("title", ""),
                "handle": item.get("handle", ""),
                "price": first_variant.get("price", ""),
                "variant": str(first_variant.get("id", "")).strip(),
                "image": image_obj.get("src", ""),
                "source": "admin",
                "status": item.get("status", ""),
                "published_at": item.get("published_at")
            })
        PRODUCT_CACHE = products
        PRODUCT_CACHE_TIME = now
        return products
    except:
        return []

def get_shopify_blog_id():
    if SHOPIFY_BLOG_ID:
        return SHOPIFY_BLOG_ID
    api_store = resolve_shopify_api_domain()
    if not api_store or not SHOPIFY_ADMIN_TOKEN:
        return None
    try:
        r = requests.get(
            f"https://{api_store}/admin/api/2024-01/blogs.json",
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
    api_store = resolve_shopify_api_domain()
    if not api_store or not SHOPIFY_ADMIN_TOKEN:
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
            f"https://{api_store}/admin/api/2024-01/blogs/{blog_id}/articles.json",
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

@app.route("/api/voice/session/bootstrap", methods=["POST"])
def voice_session_bootstrap():
    body = request.json if request.is_json else {}
    assistant_id = normalize_voice_assistant(body.get("assistant_id"))
    route = (body.get("route") or "home").strip().lower()[:40]
    requested_mode = normalize_voice_mode(body.get("mode") or "greeting")
    owner_email = _studio_owner_email()
    membership_tier = get_subscription_for_email(owner_email) if owner_email and owner_email != "guest" else "free"
    session_id = (body.get("session_id") or "").strip() or f"voice-{uuid.uuid4().hex}"
    payload = load_voice_session_payload(session_id)
    mode = normalize_voice_mode(payload.get("mode") or requested_mode)
    memory_notes = payload.get("family_memory") or []
    profile = get_voice_profile_for(assistant_id, membership_tier)
    greeting = "Hello how may I help you." if assistant_id != "projake" else "Hello, Jake here. What part of the studio or hair work should we handle?"
    intro_copy = f"{profile.get('assistant_name', 'SupportRD Assistant')} is online."
    save_voice_session_payload(
        session_id,
        owner_email,
        assistant_id,
        mode,
        route,
        {
            **payload,
            "session_id": session_id,
            "route": route,
            "assistant_id": assistant_id,
            "mode": mode,
            "membership_tier": membership_tier,
            "family_memory": memory_notes,
            "last_bootstrap_at": _studio_now(),
        },
    )
    return {
        "ok": True,
        "session_id": session_id,
        "assistant_id": assistant_id,
        "membership_tier": membership_tier,
        "mode": mode,
        "profile": profile,
        "greeting": greeting,
        "intro_copy": intro_copy,
        "realtime_ready": bool(OPENAI_KEY),
        "realtime_path": "/api/voice/realtime/session",
        "history": get_recent_voice_turns(session_id, limit=6),
    }


@app.route("/api/voice/realtime/session", methods=["POST"])
def voice_realtime_session():
    if not OPENAI_KEY:
        return {"ok": False, "error": "openai_key_missing"}, 503
    body = request.json if request.is_json else {}
    assistant_id = normalize_voice_assistant(body.get("assistant_id"))
    requested_mode = normalize_voice_mode(body.get("mode") or "greeting")
    route = (body.get("route") or "home").strip().lower()[:40]
    owner_email = _studio_owner_email()
    membership_tier = get_subscription_for_email(owner_email) if owner_email and owner_email != "guest" else "free"
    session_id = (body.get("session_id") or "").strip()
    payload = load_voice_session_payload(session_id)
    memory_notes = payload.get("family_memory") or []
    profile = get_voice_profile_for(assistant_id, membership_tier)
    realtime_model = os.environ.get("OPENAI_REALTIME_MODEL", "gpt-4o-realtime-preview")
    request_payload = {
        "model": realtime_model,
        "voice": profile.get("voice") or os.environ.get("OPENAI_TTS_VOICE", "shimmer"),
        "instructions": create_realtime_instruction(assistant_id, requested_mode, membership_tier, route, memory_notes),
        "input_audio_transcription": {
            "model": os.environ.get("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe")
        }
    }
    try:
        resp = requests.post(
            "https://api.openai.com/v1/realtime/sessions",
            headers={
                "Authorization": f"Bearer {OPENAI_KEY}",
                "Content-Type": "application/json",
            },
            json=request_payload,
            timeout=20,
        )
        if resp.status_code >= 400:
            return {
                "ok": False,
                "error": "realtime_session_failed",
                "status": resp.status_code,
                "detail": resp.text[:300],
            }, 502
        data = resp.json()
        return {
            "ok": True,
            "session": data,
            "profile": profile,
            "mode": requested_mode,
            "assistant_id": assistant_id,
        }
    except Exception as exc:
        return {"ok": False, "error": "realtime_session_exception", "detail": str(exc)[:220]}, 500


@app.route("/api/voice/respond", methods=["POST"])
def voice_respond():
    body = request.json if request.is_json else {}
    message = (body.get("message") or "").strip()
    session_id = (body.get("session_id") or "").strip() or f"voice-{uuid.uuid4().hex}"
    assistant_id = normalize_voice_assistant(body.get("assistant_id"))
    route = (body.get("route") or "home").strip().lower()[:40]
    owner_email = _studio_owner_email()
    membership_tier = get_subscription_for_email(owner_email) if owner_email and owner_email != "guest" else "free"
    payload = load_voice_session_payload(session_id)
    current_mode = normalize_voice_mode(body.get("mode") or payload.get("mode") or "greeting")
    mode = infer_voice_mode(message, current_mode)
    memory_notes = list(payload.get("family_memory") or [])
    if mode == "inner_circle" and message:
        memory_notes.append(message[:220])
        memory_notes = memory_notes[-4:]
    if not message:
        reply = "I didn't understand. Say something hair related."
        return {
            "ok": True,
            "session_id": session_id,
            "assistant_id": assistant_id,
            "mode": mode,
            "reply": reply,
            "understood": False,
            "profile": get_voice_profile_for(assistant_id, membership_tier),
        }
    product_lane_key = pick_voice_product_lane(message)
    product_lane = VOICE_PRODUCT_MAP.get(product_lane_key, VOICE_PRODUCT_MAP["default"])
    understood = voice_topic_understood(message, assistant_id)
    profile = get_voice_profile_for(assistant_id, membership_tier)
    history = get_recent_voice_turns(session_id, limit=8)
    if not understood:
        reply = build_voice_fallback_reply(message, assistant_id, mode, membership_tier, memory_notes)
    else:
        reply = ""
        if client:
            try:
                history_summary = " | ".join(
                    f"{turn.get('speaker','user')}: {str(turn.get('text',''))[:180]}"
                    for turn in history[-6:]
                )
                memory_summary = " | ".join(memory_notes[-3:])
                response = client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                HAIR_SYSTEM + " " +
                                build_voice_mode_instruction(assistant_id, mode) + " " +
                                f"Current route: {route}. "
                                f"Assistant tone: {profile.get('tone','natural, premium, never robotic')}. "
                                f"Membership tier: {membership_tier}. "
                                f"Related SupportRD lane to reference when helpful: {product_lane['title']} at {product_lane['price']} because {product_lane['reason']}. "
                                f"Recent history: {history_summary or 'none yet'}. "
                                f"Family/personal memory notes: {memory_summary or 'none yet'}."
                            ).strip()
                        },
                        {"role": "user", "content": message}
                    ],
                    temperature=0.45,
                    max_tokens=250
                )
                reply = (response.choices[0].message.content or "").strip()
            except Exception:
                reply = ""
        if not reply:
            reply = build_voice_fallback_reply(message, assistant_id, mode, membership_tier, memory_notes)
    append_voice_turn(session_id, "user", mode, message)
    append_voice_turn(session_id, assistant_id, mode, reply)
    save_voice_session_payload(
        session_id,
        owner_email,
        assistant_id,
        mode,
        route,
        {
            **payload,
            "session_id": session_id,
            "route": route,
            "assistant_id": assistant_id,
            "mode": mode,
            "membership_tier": membership_tier,
            "family_memory": memory_notes,
            "product_lane_key": product_lane_key,
            "product_lane": product_lane,
            "last_reply": reply,
            "last_message": message,
            "updated_at": _studio_now(),
        },
    )
    return {
        "ok": True,
        "session_id": session_id,
        "assistant_id": assistant_id,
        "mode": mode,
        "reply": reply,
        "understood": understood,
        "product_lane": product_lane,
        "profile": profile,
        "history": get_recent_voice_turns(session_id, limit=8),
    }


@app.route("/api/voice/session/history")
def voice_session_history():
    session_id = (request.args.get("session_id") or "").strip()
    if not session_id:
        return {"ok": False, "error": "session_id_required"}, 400
    payload = load_voice_session_payload(session_id)
    return {
        "ok": True,
        "session_id": session_id,
        "payload": payload,
        "history": get_recent_voice_turns(session_id, limit=12),
    }


@app.route("/api/diary/session/bootstrap", methods=["POST"])
def diary_session_bootstrap():
    body = request.json if request.is_json else {}
    owner_email = _studio_owner_email()
    session_id = (body.get("session_id") or "").strip() or f"diary-{uuid.uuid4().hex}"
    payload = load_diary_session_payload(session_id)
    payload = {**payload}
    payload["display_name"] = (body.get("display_name") or payload.get("display_name") or "").strip()
    payload["username"] = (body.get("username") or payload.get("username") or "").strip()
    payload["profile_tag"] = normalize_diary_profile_tag(body.get("profile_tag") or payload.get("profile_tag") or "")
    payload["avatar_url"] = (body.get("avatar_url") or payload.get("avatar_url") or "").strip()[:4000]
    payload["live_active"] = bool(body.get("live_active")) if "live_active" in body else bool(payload.get("live_active"))
    payload["entry_text"] = payload.get("entry_text") or ""
    payload["transcript"] = payload.get("transcript") or ""
    payload["social_post"] = payload.get("social_post") or ""
    payload["voice_session_id"] = (body.get("voice_session_id") or payload.get("voice_session_id") or "").strip()
    live_slug = build_diary_live_slug(owner_email, payload)
    payload["live_slug"] = live_slug
    payload["session_id"] = session_id
    payload["updated_at"] = _studio_now()
    save_diary_session_payload(session_id, owner_email, live_slug, payload)
    return {
        "ok": True,
        "session_id": session_id,
        "owner_email": owner_email,
        "live_slug": live_slug,
        "live_url": f"{request.host_url.rstrip('/')}/?diary-live={live_slug}",
        "payload": payload,
        "comments": get_diary_comments(session_id, limit=25),
        "voice_history": get_recent_voice_turns(payload.get("voice_session_id"), limit=12),
    }


@app.route("/api/diary/session/save", methods=["POST"])
def diary_session_save():
    body = request.json if request.is_json else {}
    session_id = (body.get("session_id") or "").strip()
    if not session_id:
        return {"ok": False, "error": "session_id_required"}, 400
    owner_email = _studio_owner_email()
    payload = load_diary_session_payload(session_id)
    payload = {**payload}
    payload["entry_text"] = (body.get("entry_text") or payload.get("entry_text") or "")[:12000]
    payload["transcript"] = (body.get("transcript") or payload.get("transcript") or "")[:12000]
    payload["social_post"] = (body.get("social_post") or payload.get("social_post") or "")[:4000]
    payload["live_active"] = bool(body.get("live_active")) if "live_active" in body else bool(payload.get("live_active"))
    payload["voice_session_id"] = (body.get("voice_session_id") or payload.get("voice_session_id") or "").strip()
    payload["display_name"] = (body.get("display_name") or payload.get("display_name") or "").strip()
    payload["username"] = (body.get("username") or payload.get("username") or "").strip()
    payload["profile_tag"] = normalize_diary_profile_tag(body.get("profile_tag") or payload.get("profile_tag") or "")
    payload["avatar_url"] = (body.get("avatar_url") or payload.get("avatar_url") or "").strip()[:4000]
    payload["updated_at"] = _studio_now()
    live_slug = build_diary_live_slug(owner_email, payload)
    payload["live_slug"] = live_slug
    save_diary_session_payload(session_id, owner_email, live_slug, payload)
    return {
        "ok": True,
        "session_id": session_id,
        "live_slug": live_slug,
        "payload": payload,
        "comments": get_diary_comments(session_id, limit=25),
        "voice_history": get_recent_voice_turns(payload.get("voice_session_id"), limit=12),
    }


@app.route("/api/diary/session/feed")
def diary_session_feed():
    session_id = (request.args.get("session_id") or "").strip()
    if not session_id:
        return {"ok": False, "error": "session_id_required"}, 400
    payload = load_diary_session_payload(session_id)
    return {
        "ok": True,
        "session_id": session_id,
        "payload": payload,
        "comments": get_diary_comments(session_id, limit=25),
        "voice_history": get_recent_voice_turns((payload or {}).get("voice_session_id"), limit=12),
    }


@app.route("/api/diary/lobby")
def diary_lobby_feed():
    sort_key = (request.args.get("sort") or "recent").strip().lower()
    search = (request.args.get("search") or "").strip().lower()
    search_by = (request.args.get("search_by") or "name").strip().lower()
    entries = list_diary_lobby_sessions(sort_key=sort_key, limit=request.args.get("limit") or 7)
    if search:
        def _match(entry):
            lookup = {
                "email": entry.get("owner_email") or "",
                "tag": entry.get("profile_tag") or "",
                "url": entry.get("live_slug") or "",
                "name": entry.get("display_name") or "",
            }
            haystack = lookup.get(search_by, lookup.get("name", ""))
            return search in haystack.lower()
        entries = [entry for entry in entries if _match(entry)]
    return {
        "ok": True,
        "sort": sort_key,
        "search": search,
        "search_by": search_by,
        "feeds": entries,
    }


@app.route("/api/diary/session/public")
def diary_public_session():
    public_feed = load_diary_public_session(
        session_id=request.args.get("session_id"),
        live_slug=request.args.get("slug") or request.args.get("live_slug"),
    )
    if not public_feed:
        return {"ok": False, "error": "session_not_found"}, 404
    summary = public_feed["summary"]
    summary["live_url"] = f"{request.host_url.rstrip('/')}/?diary-live={summary.get('live_slug', '')}"
    return {
        "ok": True,
        "session_id": summary.get("session_id"),
        "summary": summary,
        "payload": public_feed["payload"],
        "comments": public_feed["comments"],
        "voice_history": public_feed["voice_history"],
    }


@app.route("/api/diary/comment", methods=["POST"])
def diary_comment():
    body = request.json if request.is_json else {}
    session_id = (body.get("session_id") or "").strip()
    if not session_id:
        return {"ok": False, "error": "session_id_required"}, 400
    author_name = (body.get("author_name") or "Guest").strip()[:80]
    comment_text = (body.get("comment_text") or "").strip()
    if not comment_text:
        return {"ok": False, "error": "comment_required"}, 400
    comment_kind = (body.get("comment_kind") or "comment").strip().lower()[:40]
    amount_label = (body.get("amount_label") or "").strip()[:40]
    append_diary_comment(session_id, author_name, comment_text, comment_kind, amount_label)
    return {
        "ok": True,
        "session_id": session_id,
        "comments": get_diary_comments(session_id, limit=25),
    }


#################################################
# ARIA AI
#################################################

HAIR_SYSTEM = (
    "You are ARIA, a hair and scalp care expert for SupportRD. You only discuss hair, scalp, hair products, routines, styling, and hair-related wellness. If the user asks about anything outside hair or scalp care, refuse and redirect to hair help. Always give thorough, structured answers and include a routine (wash day + midweek + styling + protection). When users list multiple issues (dryness, lack of bounce, frizz, oiliness, damage, tangles, color loss), address each one explicitly. When asked for prices or when the user lists products, always repeat the price for each named item and give a total if quantity is 1 each. Prices: Shampoo Aloe Vera $20, Formula Exclusiva $55, Laciador Crece $40, Mascarilla Capilar $25, Gotero Rapido $55, Gotitas Brillantes $30. If user names differ (Gotika, Gotero, Mascrilla, Laciador), map them to Gotitas Brillantes, Gotero Rapido, Mascarilla Capilar, Laciador Crece. Offer a simple total estimate when quantities are 1 each. Use this SupportRD scenario chapter when it fits the user: dryness + frizz + low bounce usually leans Formula Exclusiva plus Mascarilla Capilar; tangles + rough detangling usually leans Mascarilla Capilar first and then Gotitas Brillantes for finish; oily scalp + stressed ends usually leans Shampoo Aloe Vera plus a lighter Gotero Rapido routine only where needed; damage + breakage + weak ends usually leans Gotero Rapido plus Mascarilla Capilar; sleek/straightening goals usually lean Laciador Crece with heat protection and moisture balance. If the user sounds urgent, stressed, traveling, outdoors, or in an emergency-ready moment, say which product is the first move and why. End every answer with one short 'Don't forget' reminder line about the member plan relevant to the user."
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

    body = request.json if request.is_json else {}
    msg = body.get("message")
    membership_tier = (body.get("membership_tier") or "free").strip().lower()
    adult_mode = bool(body.get("adult_mode"))
    family_theme = (body.get("family_theme") or "").strip().lower()
    muslim_greeting = bool(body.get("muslim_greeting"))
    custom_greeting = (body.get("custom_greeting") or "").strip()
    same_feel_voice = bool(body.get("same_feel_voice"))
    thought_style = (body.get("thought_style") or "").strip()
    if not msg:
        return {"reply": "Tell me your hair concern and I’ll help."}
    if contains_prohibited_terms(msg):
        return {"reply": "I can’t help with drugs or gang-related content. I can help with healthy hair routines and products."}
    if not is_hair_topic(msg):
        return {"reply": "I can only help with hair and scalp care. Tell me your hair concern and I’ll help."}

    try:

        tier_note = "free plan user"
        if membership_tier == "premium":
            tier_note = "premium member"
        elif membership_tier == "yoda":
            tier_note = "yoda pass member"
        elif membership_tier == "pro":
            tier_note = "pro member"
        elif membership_tier == "bingo100":
            tier_note = "$100 bingo fantasy member"
        elif membership_tier == "family200":
            tier_note = "$200 family fantasy member"
        elif membership_tier == "fantasy300":
            tier_note = "$300 basic fantasy 21+ member"
        elif membership_tier == "fantasy600":
            tier_note = "$600 advanced fantasy 21+ member"
        adult_note = ""
        if adult_mode:
            adult_note = (
                "User enabled 21+ mode. Keep it playful, funny, and mature but non-explicit, legal, and hair-focused. "
                "Do not use predatory language, coercion, explicit sexual content, or exclusivity/relationship dependency framing. "
                "No drugs, gangs, violence, illegal activity, or minors."
            )
        style_note = ""
        if same_feel_voice:
            style_note = f"Keep tone consistent across replies with this style: {thought_style[:120] or 'calm, descriptive, warm'}."
        theme_note = ""
        if membership_tier == "family200":
            family_themes = {
                "boat_conductor": "boat conductor",
                "theme_park_conductor": "theme park conductor",
                "museum_greeter": "museum information greeter",
                "nascar_driver": "race-day driver",
                "jungle_book": "jungle bloom",
                "molopy_board": "laid-back board-game strategy",
            }
            chosen_family_theme = family_themes.get(family_theme, "boat conductor")
            theme_note = (
                "Family Fantasy theme pack is active. Offer playful, movie-scene prep coaching with hair-first lines. "
                "Available themes: boat conductor, theme park conductor, museum information greeter, race-day driver energy, jungle bloom, and laid-back board-game strategy. "
                f"Prioritize this selected theme in this reply: {chosen_family_theme}. "
                "Keep it clean, uplifting, and family-friendly."
            )
        elif membership_tier == "bingo100":
            theme_note = (
                "Bingo Fantasy is active. Use a chill, supportive, king/queen confidence tone with light humor. "
                "Example vibe: hard-working user relaxing while ARIA handles hair guidance. "
                "You may suggest profile flow stats as confidence markers, but stay hair-focused and non-deceptive."
            )
        elif membership_tier == "fantasy300":
            theme_note = (
                "Basic 21+ Fantasy is active. Keep it flirty-light, playful, and date-energy while staying non-explicit. "
                "Use lines like: 'I like your vibe' and 'dinner-ready hair' while staying hair-focused."
            )
        elif membership_tier == "fantasy600":
            theme_note = (
                "Advanced 21+ Fantasy is active. Use meaningful romantic storytelling and emotional support, still non-explicit. "
                "Keep it warm, cinematic, and confidence-building around hair routines."
            )
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": HAIR_SYSTEM + f" Membership context: {tier_note}. {adult_note} {style_note} {theme_note}"},
                {"role": "user", "content": msg}
            ],
            temperature=0.4,
            max_tokens=400
        )

        reply = response.choices[0].message.content or ""
        reminder = "Don't forget: upgrade to Premium ($35) or Pro ($50) for deeper ARIA guidance."
        if membership_tier == "premium":
            reminder = "Don't forget: Premium is active. Use your deeper ARIA guidance and routines."
        elif membership_tier == "yoda":
            reminder = "Don't forget: Yoda Pass is active. You have style-first unlimited ARIA build guidance."
        elif membership_tier == "pro":
            reminder = "Don't forget: Pro is active. You have full ARIA power and advanced coaching."
        elif membership_tier == "bingo100":
            reminder = "Don't forget: Bingo Fantasy ($100) is active. Chill vibe, funny flow, and hair-first confidence are unlocked."
        elif membership_tier == "family200":
            reminder = "Don't forget: Family Fantasy ($200) is active. Keep content clean, warm, and confidence-focused."
        elif membership_tier == "fantasy300":
            reminder = "Don't forget: $300 Basic Fantasy is active. Your custom greeting and voice style are unlocked."
        elif membership_tier == "fantasy600":
            reminder = "Don't forget: $600 Advanced Fantasy is active. Your full voice style stack is unlocked."
        if muslim_greeting and membership_tier in ("fantasy300", "fantasy600", "pro"):
            lead = custom_greeting or "As-salamu alaykum. How are you and what's new?"
            reply = f"{lead}\n\n{reply}"
        if adult_mode:
            line = pick_safe_21plus_line(membership_tier)
            reply = f"{line}\n\n{reply}"
        if "don't forget" not in reply.lower():
            reply = f"{reply}\n\n{reminder}"

        return {"reply": reply}

    except:
        return {"reply": "AI error"}



@app.route("/api/aria/transcribe/ping")
def aria_transcribe_ping():
    return {"status": "ok"}

@app.route("/api/aria/transcribe", methods=["POST"])
def aria_transcribe():

    if not OPENAI_KEY:
        app.logger.error("ARIA transcribe failed: OPENAI_API_KEY missing")
        return {"error": "OPENAI_API_KEY missing"}, 500

    audio = request.files.get("audio")
    if not audio:
        return {"error": "No audio provided"}, 400

    try:
        audio_bytes = audio.read()
        if not audio_bytes:
            return {"error": "Empty audio"}, 400
        language = (request.form.get("language") or request.form.get("lang") or "").strip()
        if language:
            language = language.replace("_", "-").split("-")[0].lower()
        files = {
            "file": (audio.filename or "audio.webm", audio_bytes, audio.mimetype or "audio/webm")
        }
        model = os.environ.get("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe")
        data = {"model": model}
        if language:
            data["language"] = language
        app.logger.info(
            "ARIA transcribe request: filename=%s mimetype=%s bytes=%s lang=%s",
            audio.filename or "audio.webm",
            audio.mimetype or "audio/webm",
            len(audio_bytes or b""),
            language or "auto",
        )
        r = requests.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {OPENAI_KEY}"},
            data=data,
            files=files,
            timeout=45
        )
        if r.status_code >= 400:
            app.logger.error(
                "ARIA transcribe failed: status=%s detail=%s",
                r.status_code,
                r.text[:300],
            )
            status = r.status_code if r.status_code < 600 else 500
            return {"error": "Transcription failed", "status": r.status_code, "detail": r.text[:300]}, status
        out = r.json()
        text = out.get("text", "")
        app.logger.info("ARIA transcribe ok: model=%s chars=%s", model, len(text or ""))
        return {"text": text, "model": model}
    except Exception as e:
        app.logger.exception("ARIA transcribe exception: %s", str(e)[:300])
        return {"error": "Transcription error", "detail": str(e)[:300]}, 500

@app.route("/api/aria/speech", methods=["POST"])
def aria_speech():

    if not OPENAI_KEY:
        return {"error": "AI unavailable"}, 503

    body = request.json if request.is_json else {}
    text = body.get("text", "") if isinstance(body, dict) else ""
    if not text:
        return {"error": "No text"}, 400

    try:
        requested_voice = (body.get("voice_preference") or "").strip().lower() if isinstance(body, dict) else ""
        wife_mode = bool(body.get("wife_mode")) if isinstance(body, dict) else False
        wife_consent = bool(body.get("wife_consent")) if isinstance(body, dict) else False
        voice_reference = (body.get("voice_reference") or "").strip() if isinstance(body, dict) else ""
        voice_reference_pack = (body.get("voice_reference_pack") or "").strip() if isinstance(body, dict) else ""
        muslim_greeting = bool(body.get("muslim_greeting")) if isinstance(body, dict) else False
        same_feel_voice = bool(body.get("same_feel_voice")) if isinstance(body, dict) else False
        thought_style = (body.get("thought_style") or "").strip() if isinstance(body, dict) else ""
        assistant_id = (body.get("assistant_id") or "aria").strip().lower() if isinstance(body, dict) else "aria"
        membership_tier = (body.get("membership_tier") or "free").strip().lower() if isinstance(body, dict) else "free"
        preferred_voice = requested_voice if requested_voice in TTS_ALLOWED_VOICES else os.environ.get("OPENAI_TTS_VOICE", "shimmer")
        primary_model = (os.environ.get("OPENAI_TTS_MODEL", "") or "").strip() or "gpt-4o-mini-tts"
        payload = {
            "model": primary_model,
            "voice": preferred_voice,
            "input": text,
            "response_format": "mp3"
        }
        instructions = []
        if wife_mode and wife_consent:
            instructions.append("Use a respectful, calm, encouraging, family-safe tone.")
        if muslim_greeting:
            instructions.append("Keep tone respectful and clean. Avoid profanity.")
        if voice_reference:
            instructions.append(f"Voice style reference: {voice_reference[:220]}")
        if voice_reference_pack:
            cleaned = " | ".join([ln.strip() for ln in voice_reference_pack.splitlines() if ln.strip()][:5])
            if cleaned:
                instructions.append(f"Consistency reference pack: {cleaned[:420]}")
        if same_feel_voice:
            instructions.append(f"Use same-feel consistency mode. Keep cadence and tone stable. Thought style: {thought_style[:120] or 'calm, descriptive, warm'}.")
        if assistant_id == "projake":
            instructions.append("Jake should sound like a natural studio guide: grounded, smooth, calm, masculine, never robotic, never exaggerated.")
        else:
            instructions.append("Aria should sound like a natural premium beauty-tech guide: warm, confident, gentle, feminine, and never robotic.")
        if membership_tier == "premium":
            instructions.append("Keep the delivery premium, polished, and welcoming with light concierge energy.")
        elif membership_tier == "pro":
            instructions.append("Use a more executive, focused, confident delivery with crisp pacing and professional warmth.")
        elif membership_tier == "yoda":
            instructions.append("Keep the delivery wise, steady, reflective, and calming without sounding theatrical.")
        elif membership_tier == "bingo100":
            instructions.append("Keep the delivery playful, charismatic, and smooth while staying hair-first and family-safe.")
        elif membership_tier == "family200":
            instructions.append("Keep the delivery warm, reassuring, and family-friendly with gentle confidence.")
        elif membership_tier == "fantasy300":
            instructions.append("Keep the delivery flirty-light, polished, and cinematic while staying non-explicit and emotionally safe.")
        elif membership_tier == "fantasy600":
            instructions.append("Keep the delivery intimate, cinematic, and confidence-building while staying non-explicit and emotionally warm.")
        if instructions:
            payload["instructions"] = " ".join(instructions)
        attempt_models = []
        for candidate in (primary_model, "gpt-4o-mini-tts", "tts-1-hd"):
            clean = (candidate or "").strip()
            if clean and clean not in attempt_models:
                attempt_models.append(clean)
        fallback_voices = []
        if assistant_id == "projake":
            fallback_voices = [preferred_voice, "onyx", "ash"]
        else:
            fallback_voices = [preferred_voice, "coral", "shimmer"]
        deduped_voices = []
        for candidate_voice in fallback_voices:
            clean_voice = (candidate_voice or "").strip().lower()
            if clean_voice in TTS_ALLOWED_VOICES and clean_voice not in deduped_voices:
                deduped_voices.append(clean_voice)
        last_error = ""
        for model_name in attempt_models:
            for voice_name in deduped_voices:
                trial_payload = dict(payload)
                trial_payload["model"] = model_name
                trial_payload["voice"] = voice_name
                r = requests.post(
                    "https://api.openai.com/v1/audio/speech",
                    headers={
                        "Authorization": f"Bearer {OPENAI_KEY}",
                        "Content-Type": "application/json"
                    },
                    json=trial_payload,
                    timeout=30
                )
                if r.status_code < 400:
                    return Response(r.content, mimetype="audio/mpeg")
                last_error = (r.text or "")[:300]
        return {"error": "Speech failed", "detail": last_error or "tts_request_failed"}, 500
    except Exception as exc:
        return {"error": "Speech error", "detail": str(exc)[:300]}, 500

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


SEO_LANDING_PAGES = {
    "hair-problems": {
        "title": "Hair Problems",
        "headline": "Hair problem support with products, live help, and account continuity.",
        "description": "SupportRD routes dryness, breakage, color pressure, thinning, and family care into real product guidance, live diary help, and premium account continuity.",
        "eyebrow": "Hair Problem Lane",
        "product_plan": "premium",
        "module_url": "/local-profile",
        "module_label": "Open Profile Scanner",
        "hero_image": "/static/images/remote-healthy-hair.jpeg",
    },
    "studio": {
        "title": "Studio",
        "headline": "Studio motherboard editing, premium booth energy, and export-ready sessions.",
        "description": "SupportRD Studio gives you motherboard playback, stacked song editing, FX, export, and premium studio routes from one live booth.",
        "eyebrow": "Studio Lane",
        "product_plan": "pro",
        "module_url": "/local-studio",
        "module_label": "Open Studio",
        "hero_image": "/static/images/jake-studio-premium.jpg",
    },
    "live-diary": {
        "title": "Live Diary",
        "headline": "Live diary sessions with comments, paid support lanes, and guest interaction.",
        "description": "SupportRD Diary Mode connects live video, comments, guest chat, hair problem help, and live account-aware session memory.",
        "eyebrow": "Diary Lane",
        "product_plan": "yoda",
        "module_url": "/local-diary",
        "module_label": "Open Diary Mode",
        "hero_image": "/static/images/remote-dayparty.jpg",
    },
    "identity-profile": {
        "title": "Identity Profile",
        "headline": "Identity, profile confirmation, and hair scan support in one route.",
        "description": "SupportRD Profile combines camera hair scanning, identity support, confirmation, and export-ready profile history for real account continuity.",
        "eyebrow": "Identity Lane",
        "product_plan": "premium",
        "module_url": "/local-profile",
        "module_label": "Open Profile",
        "hero_image": "/static/images/remote-hija-felix.jpeg",
    },
    "premium-pro": {
        "title": "Premium Pro",
        "headline": "Premium and Pro routes that feel attached to your real account.",
        "description": "SupportRD Premium and Pro unlock account continuity, polished module access, live support upgrades, and studio-ready routes without losing your identity.",
        "eyebrow": "Premium / Pro",
        "product_plan": "pro",
        "module_url": "/remote",
        "module_label": "Open Main Shell",
        "hero_image": "/static/images/aria-premium-pro-main-ad.jpg",
    },
    "fantasies": {
        "title": "Fantasies",
        "headline": "Fantasy lanes with polished account continuity and premium routing.",
        "description": "SupportRD fantasy tiers keep premium account continuity, reminders, and upgrade flow attached to one real live shell instead of dropping users into generic collection browsing.",
        "eyebrow": "Fantasy Lane",
        "product_plan": "fantasy300",
        "module_url": "/remote",
        "module_label": "Open Premium Shell",
        "hero_image": "/static/images/remote-lezawli.jpeg",
    },
}


def render_support_seo_page(page_key):
    page = SEO_LANDING_PAGES.get(page_key)
    if not page:
        return {"ok": False, "error": "not_found"}, 404
    checkout_map = get_public_shopify_checkout_map()
    plan_key = page.get("product_plan") or "premium"
    checkout_meta = checkout_map.get(plan_key) or {}
    checkout_href = checkout_meta.get("checkout_path") or f"https://shop.supportrd.com/collections/all?plan={plan_key}"
    product_label = (checkout_meta.get("label") or page.get("title") or "SupportRD Premium").strip()
    page_url = f"https://supportrd.com/{page_key}"
    json_ld = json.dumps({
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": page["title"],
        "description": page["description"],
        "url": page_url,
        "primaryImageOfPage": {"@type": "ImageObject", "url": f"https://supportrd.com{page['hero_image']}"},
        "isPartOf": {"@type": "WebSite", "name": "SupportRD", "url": "https://supportrd.com/"},
    })
    return render_template_string(
        """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title }} | SupportRD</title>
  <meta name="description" content="{{ description }}">
  <link rel="canonical" href="{{ page_url }}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{{ title }} | SupportRD">
  <meta property="og:description" content="{{ description }}">
  <meta property="og:url" content="{{ page_url }}">
  <meta property="og:image" content="https://supportrd.com{{ hero_image }}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{{ json_ld|safe }}</script>
  <style>
    :root{color-scheme:dark;--bg:#07111d;--panel:#0f2033;--text:#f4f7fb;--muted:#b8c4d6;--accent:#87d4ff;--gold:#ffd675}
    *{box-sizing:border-box} body{margin:0;font-family:Georgia,serif;background:radial-gradient(circle at top,#18324c 0,#07111d 60%);color:var(--text)}
    .shell{max-width:1180px;margin:0 auto;padding:32px 20px 64px}
    .hero{display:grid;grid-template-columns:1.15fr .85fr;gap:22px;align-items:stretch}
    .panel{border-radius:28px;padding:28px;background:linear-gradient(180deg,rgba(16,33,53,.94),rgba(8,18,31,.96));border:1px solid rgba(160,200,255,.16);box-shadow:0 24px 80px rgba(0,0,0,.35)}
    .eyebrow{letter-spacing:.18em;text-transform:uppercase;color:var(--gold);font-size:12px}
    h1{font-size:clamp(36px,6vw,72px);line-height:.95;margin:14px 0 18px}
    p{font-size:18px;line-height:1.6;color:var(--muted)}
    .cta-row{display:flex;flex-wrap:wrap;gap:14px;margin-top:22px}
    .cta{display:inline-flex;align-items:center;justify-content:center;min-height:52px;padding:0 18px;border-radius:999px;text-decoration:none;font-weight:700}
    .cta.primary{background:linear-gradient(135deg,#9fe0ff,#4e8dff);color:#041221}
    .cta.secondary{border:1px solid rgba(255,255,255,.18);color:var(--text)}
    .visual{min-height:420px;background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.42)),url('{{ hero_image }}');background-size:cover;background-position:center;border-radius:24px;display:flex;align-items:end}
    .visual-copy{padding:24px}
    .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:22px}
    .mini{border-radius:22px;padding:20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
    .mini strong{display:block;font-size:20px;margin-bottom:8px}
    @media (max-width:900px){.hero{grid-template-columns:1fr}.grid{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <article class="panel">
        <div class="eyebrow">{{ eyebrow }}</div>
        <h1>{{ headline }}</h1>
        <p>{{ description }}</p>
        <div class="cta-row">
          <a class="cta primary" href="{{ checkout_href }}">Buy {{ product_label }}</a>
          <a class="cta secondary" href="{{ module_url }}">{{ module_label }}</a>
          <a class="cta secondary" href="/">Return To SupportRD</a>
        </div>
      </article>
      <article class="panel visual">
        <div class="visual-copy">
          <div class="eyebrow">SupportRD Live Route</div>
          <strong style="font-size:28px">{{ title }}</strong>
          <p style="margin:10px 0 0">{{ headline }}</p>
        </div>
      </article>
    </section>
    <section class="grid">
      <article class="mini"><strong>Exact checkout</strong><p>This route uses an exact SupportRD checkout path instead of dropping visitors into broad collection browsing.</p></article>
      <article class="mini"><strong>Account continuity</strong><p>SupportRD keeps login, plan, URL tag, and module access feeling attached to the same real account state.</p></article>
      <article class="mini"><strong>Search intent</strong><p>This landing page gives search, sharing, and paid traffic a cleaner entry into a focused SupportRD buying lane.</p></article>
    </section>
  </main>
</body>
</html>""",
        title=page["title"],
        eyebrow=page["eyebrow"],
        headline=page["headline"],
        description=page["description"],
        checkout_href=checkout_href,
        product_label=product_label,
        module_url=page["module_url"],
        module_label=page["module_label"],
        hero_image=page["hero_image"],
        page_url=page_url,
        json_ld=json_ld,
    )


@app.route("/hair-problems")
def seo_hair_problems():
    return render_support_seo_page("hair-problems")


@app.route("/studio-premium")
def seo_studio_premium():
    return render_support_seo_page("studio")


@app.route("/live-diary")
def seo_live_diary():
    return render_support_seo_page("live-diary")


@app.route("/identity-profile")
def seo_identity_profile():
    return render_support_seo_page("identity-profile")


@app.route("/premium-pro")
def seo_premium_pro():
    return render_support_seo_page("premium-pro")


@app.route("/fantasies")
def seo_fantasies():
    return render_support_seo_page("fantasies")

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
    try:
        auto_money_guard_check()
    except:
        pass
    # Community auto-rotation: self-run daily, founder only notified when needed.
    try:
        run_daily_community_rotation(force=False)
    except:
        pass


scheduler = BackgroundScheduler()

scheduler.add_job(
    engine_loop,
    "interval",
    minutes=30
)

scheduler.add_job(
    run_trade_bots,
    "interval",
    minutes=max(1, TRADE_BOT_INTERVAL_MIN)
)

scheduler.start()
init_claim_db()
init_credit_db()
init_wellness_db()
init_community_db()
init_subscription_db()
init_app_settings_db()
init_security_db()
init_studio_db()
init_voice_db()
init_diary_db()
init_profile_analysis_db()
init_local_remote_db()
set_setting("money_guard_enabled", "1")
try:
    run_trade_bots()
except:
    pass

#################################################
# STATIC FILES
#################################################

@app.route("/")
def home():
    return send_from_directory("static", "local-remote.html")

@app.route("/remote")
@app.route("/remote/<path:section>")
def remote_shell(section=None):
    return send_from_directory("static", "local-remote.html")

@app.route("/legacy")
def legacy_home():
    return send_from_directory("static", "index.html")

@app.route("/local-remote")
def local_remote_shell():
    return send_from_directory("static", "local-remote.html")


@app.route("/local-diary")
def local_diary_shell():
    return send_from_directory("static", "local-diary.html")


@app.route("/local-profile")
def local_profile_shell():
    return send_from_directory("static", "local-profile.html")


@app.route("/local-settings")
def local_settings_shell():
    return send_from_directory("static", "local-settings.html")


@app.route("/local-map")
def local_map_shell():
    return send_from_directory("static", "local-map.html")


@app.route("/local-faq")
def local_faq_shell():
    return send_from_directory("static", "local-faq.html")


@app.route("/local-studio")
def local_studio_shell():
    return send_from_directory("static", "local-studio.html")


@app.route("/api/local-remote/bootstrap")
def local_remote_bootstrap():
    user = session.get("user") or {}
    email = (user.get("email") or "").strip().lower()
    preferences = sync_authenticated_local_remote_account(user) if email else load_local_remote_preferences("guest")
    display_name = (user.get("name") or user.get("username") or email.split("@")[0] if email else "Guest").strip()
    visitor_key = request.headers.get("X-Forwarded-For") or request.remote_addr or email or "guest"
    record_local_remote_traffic(visitor_key, request.path, request.remote_addr or "")
    subscription = get_subscription_details_for_email(email) if email else {}
    plan = (subscription.get("plan") or "free").strip().lower()
    system = system_map_status()
    diary_lobby = list_diary_lobby_sessions("recent", limit=7)
    diary_recent = []
    studio_recent = []
    profile_recent = {}
    saved_tag = ""
    try:
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        if email:
            cur.execute(
                "SELECT session_id, payload_json, updated_at FROM diary_sessions WHERE owner_email = ? ORDER BY updated_at DESC LIMIT 3",
                (email,),
            )
            diary_rows = cur.fetchall() or []
            for session_id, payload_json, updated_at in diary_rows:
                try:
                    payload = json.loads(payload_json or "{}")
                except Exception:
                    payload = {}
                saved_tag = saved_tag or (payload.get("profile_tag") or "")
                diary_recent.append({
                    "session_id": session_id,
                    "updated_at": updated_at,
                    "live_active": bool(payload.get("live_active")),
                    "entry_text": (payload.get("entry_text") or "")[:180],
                    "transcript": (payload.get("transcript") or "")[:180],
                    "profile_tag": payload.get("profile_tag") or "",
                    "live_slug": payload.get("live_slug") or "",
                })
            cur.execute(
                "SELECT session_id, payload_json, updated_at FROM studio_sessions WHERE owner_email = ? ORDER BY updated_at DESC LIMIT 3",
                (email,),
            )
            studio_rows = cur.fetchall() or []
            for session_id, payload_json, updated_at in studio_rows:
                try:
                    payload = json.loads(payload_json or "{}")
                except Exception:
                    payload = {}
                boards = payload.get("boards") or []
                active_board = int(payload.get("active_board") or 0)
                studio_recent.append({
                    "session_id": session_id,
                    "updated_at": updated_at,
                    "route": payload.get("route") or "studio",
                    "board_count": len(boards),
                    "active_board": active_board,
                    "has_audio": any((board or {}).get("kind") in ("audio", "recording") for board in boards),
                    "has_video": any((board or {}).get("kind") == "video" for board in boards),
                })
            cur.execute(
                "SELECT summary_text, texture, color, damage, hair_type, created_at FROM profile_analysis_reports WHERE email = ? ORDER BY id DESC LIMIT 1",
                (email,),
            )
            row = cur.fetchone()
            if row:
                profile_recent = {
                    "summary_text": row[0] or "",
                    "texture": row[1] or "waiting",
                    "color": row[2] or "waiting",
                    "damage": row[3] or "waiting",
                    "hair_type": row[4] or "waiting",
                    "created_at": row[5] or "",
                }
        conn.close()
    except Exception:
        pass

    profile_summary = {
        "identity_confirmed": f"{display_name} is recognized inside SupportRD with account-aware continuity." if email else "Guest mode is active until login confirms identity.",
        "general_status": (
            f"Plan: {plan or 'free'} · Diary records: {len(diary_recent)} · Studio sessions: {len(studio_recent)}."
            if email else
            "Account status is waiting for login. Profile confirmation and history sync will appear here after sign-in."
        ),
        "hair_analysis": {
            "texture": profile_recent.get("texture") or "waiting",
            "damage": profile_recent.get("damage") or "waiting",
            "color": profile_recent.get("color") or "waiting",
            "hair_type": profile_recent.get("hair_type") or "waiting",
            "summary": profile_recent.get("summary_text") or "",
            "created_at": profile_recent.get("created_at") or "",
        },
    }

    settings_summary = {
        "account_email": email,
        "display_name": display_name,
        "subscription": plan,
        "saved_tag": saved_tag,
        "last_map_used": (user.get("theme") or ""),
        "push_notifications": "browser-driven",
        "connected_routes": [route.get("path") for route in (system.get("seo") or {}).get("routes", [])[:6]],
    }
    if preferences:
        settings_summary["display_name"] = preferences.get("display_name") or settings_summary["display_name"]
        settings_summary["saved_tag"] = preferences.get("saved_tag") or settings_summary["saved_tag"]
        settings_summary["last_map_used"] = preferences.get("last_map_used") or settings_summary["last_map_used"]
        settings_summary["push_notifications"] = "enabled" if preferences.get("push_notifications") else "browser-driven"
        settings_summary["voice_profile"] = preferences.get("voice_profile") or ""
        settings_summary["login_provider"] = preferences.get("login_provider") or ""
        settings_summary["login_confirmed"] = bool(preferences.get("login_confirmed"))
        settings_summary["membership_plan"] = preferences.get("membership_plan") or plan
    faq_posts = list_faq_developer_posts(limit=7)
    traffic_summary = summarize_local_remote_traffic(window_minutes=5)
    inbox_offers = list_local_remote_inbox_offers(email or "guest", limit=8)
    conversion_summary = summarize_local_remote_conversions(email or "guest", window_days=7)
    corporate_viewer = {
        "sources": [
            {
                "key": "supportrd",
                "label": "SupportRD.com",
                "url": "https://supportrd.com/",
                "kind": "website",
            },
            {
                "key": "options",
                "label": "Options Market",
                "url": "http://127.0.0.1:3000/",
                "kind": "local-live",
            },
            {
                "key": "plantman",
                "label": "ThePlantManInc.com",
                "url": "https://theplantmaninc.com/",
                "kind": "website",
            },
        ],
        "events": [
            {
                "title": "ChatGPT Codex build watch",
                "detail": "Track current shell changes, studio maturity, and any major SupportRD release momentum.",
                "lane": "SupportRD",
            },
            {
                "title": "Shipment came in of plants",
                "detail": "Use this lane for plant arrivals, supply company lag notes, and transportation cycle updates from east coast to midwest.",
                "lane": "ThePlantManInc",
            },
            {
                "title": "Bulk plants were sold",
                "detail": "Log sales, imported cut flowers, roses for occasions, and dropshipping expansion as the year progresses.",
                "lane": "ThePlantManInc",
            },
            {
                "title": "Options play went through and money was made",
                "detail": "Show live market wins, capitalization progress, and what is happening now in the options market view.",
                "lane": "Options Market",
            },
            {
                "title": "Trip to Miami for live verification",
                "detail": "Capture major company events, meetings, and any effort to verify SupportRD systems into outside organizations.",
                "lane": "Corporate",
            },
            {
                "title": "Owner legal briefing still needed",
                "detail": "Keep the legal briefing visible as a founder priority before deeper corporate approvals expand.",
                "lane": "Corporate",
            },
        ],
        "advisors": [
            "Accountant / business advisor lane",
            "Supply company lag period week 1 through end of year",
            "Transportation cycle: east coast to midwest",
            "Dropshipping eventually taking over everything",
        ],
        "build_displays": [
            {
                "title": "SupportRD Shell Build",
                "image": "/static/images/aria-premium-pro-main-ad.jpg",
                "detail": "Recent live shell display with premium routes, roaming assistants, and sticky account access.",
                "link": "https://supportrd.com/",
            },
            {
                "title": "Studio Motherboard Build",
                "image": "/static/images/jake-studio-premium.jpg",
                "detail": "Recent Studio motherboard editing display with stacked playback and export lanes.",
                "link": "/local-studio",
            },
            {
                "title": "Developer Coding Access",
                "image": "/static/images/remote-healthy-hair.jpeg",
                "detail": "Anthony founder access: coding the shell, options market board, corporate live viewer, and real platform wiring.",
                "link": "http://127.0.0.1:3000/",
            },
        ],
    }

    studio_access = {
        "authenticated": bool(email),
        "access": studio_jake_access_for_plan(plan) if email else False,
        "product_url": "https://shop.supportrd.com/products/jake-premium-studio",
        "message": (
            "Studio access is ready."
            if email and studio_jake_access_for_plan(plan)
            else ("Login is required for studio session memory." if not email else "Premium Jake access is still locked until the Studio package is active.")
        ),
    }

    return {
        "ok": True,
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "account": {
            "authenticated": bool(email),
            "email": email,
            "display_name": display_name,
            "subscription": plan,
            "login_provider": preferences.get("login_provider") if preferences else "",
            "login_confirmed": bool(preferences.get("login_confirmed")) if preferences else False,
        },
        "system": system,
        "diary": {
            "lobby": diary_lobby,
            "recent_sessions": diary_recent,
        },
        "studio": {
            "access": studio_access,
            "recent_sessions": studio_recent,
        },
        "profile": profile_summary,
        "settings": settings_summary,
        "faq": {
            "developer_posts": faq_posts,
        },
        "traffic": traffic_summary,
        "inbox": {
            "offers": inbox_offers,
        },
        "conversions": conversion_summary,
        "corporate_viewer": corporate_viewer,
    }


@app.route("/api/local-remote/preferences", methods=["POST"])
def local_remote_preferences_save():
    body = request.json if request.is_json else {}
    owner_email = _studio_owner_email()
    existing = load_local_remote_preferences(owner_email)
    push_value = body.get("push_notifications")
    if "push_notifications" in body:
        push_enabled = str(push_value).strip().lower() in ("1", "true", "yes", "on", "enabled")
    else:
        push_enabled = bool(existing.get("push_notifications"))
    prefs = {
        "display_name": body.get("display_name") or existing.get("display_name") or "",
        "saved_tag": body.get("saved_tag") or existing.get("saved_tag") or "",
        "last_map_used": body.get("last_map_used") or existing.get("last_map_used") or "",
        "push_notifications": push_enabled,
        "voice_profile": body.get("voice_profile") or existing.get("voice_profile") or "",
        "account_username": body.get("account_username") or existing.get("account_username") or "",
        "account_email": body.get("account_email") or existing.get("account_email") or owner_email,
        "account_address": body.get("account_address") or existing.get("account_address") or "",
        "account_zipcode": body.get("account_zipcode") or existing.get("account_zipcode") or "",
        "account_phone": body.get("account_phone") or existing.get("account_phone") or "",
        "aria_response_level": body.get("aria_response_level") or existing.get("aria_response_level") or "balanced",
        "login_provider": body.get("login_provider") or existing.get("login_provider") or "",
        "login_confirmed": bool(body.get("login_confirmed")) if "login_confirmed" in body else bool(existing.get("login_confirmed")),
        "membership_plan": body.get("membership_plan") or existing.get("membership_plan") or "",
    }
    if body.get("password_plain"):
        prefs["password_plain"] = body.get("password_plain")
    save_local_remote_preferences(owner_email, prefs)
    return {"ok": True, "email": owner_email, "preferences": load_local_remote_preferences(owner_email)}


@app.route("/api/local-remote/faq/posts")
def local_remote_faq_posts():
    return {"ok": True, "posts": list_faq_developer_posts(limit=request.args.get("limit") or 7)}


@app.route("/api/local-remote/faq/posts", methods=["POST"])
def local_remote_faq_posts_create():
    body = request.json if request.is_json else {}
    owner_email = _studio_owner_email()
    display_name = (body.get("display_name") or (session.get("user") or {}).get("name") or (session.get("user") or {}).get("username") or "SupportRD Guest").strip()
    message = (body.get("message") or "").strip()
    if not message:
        return {"ok": False, "error": "message_required"}, 400
    append_faq_developer_post(owner_email, display_name, message)
    return {"ok": True, "posts": list_faq_developer_posts(limit=7)}


@app.route("/api/local-remote/traffic/ping", methods=["POST"])
def local_remote_traffic_ping():
    body = request.json if request.is_json else {}
    visitor_key = (
        body.get("visitor_key")
        or request.headers.get("X-Forwarded-For")
        or request.remote_addr
        or _studio_owner_email()
    )
    path = body.get("path") or request.referrer or "/"
    record_local_remote_traffic(visitor_key, path, request.remote_addr or "")
    return {"ok": True, "traffic": summarize_local_remote_traffic(window_minutes=5)}


@app.route("/api/local-remote/inbox/offers")
def local_remote_inbox_offers():
    owner_email = _studio_owner_email()
    return {"ok": True, "offers": list_local_remote_inbox_offers(owner_email, limit=request.args.get("limit") or 8)}


@app.route("/api/local-remote/inbox/offers", methods=["POST"])
def local_remote_inbox_offers_create():
    owner_email = _studio_owner_email()
    body = request.json if request.is_json else {}
    create_local_remote_inbox_offer(owner_email, body)
    return {"ok": True, "offers": list_local_remote_inbox_offers(owner_email, limit=8)}


@app.route("/api/local-remote/inbox/offers/<int:offer_id>", methods=["POST"])
def local_remote_inbox_offer_update(offer_id):
    owner_email = _studio_owner_email()
    body = request.json if request.is_json else {}
    update_local_remote_inbox_offer(owner_email, offer_id, body.get("status"))
    return {"ok": True, "offers": list_local_remote_inbox_offers(owner_email, limit=8)}


@app.route("/api/local-remote/conversions", methods=["POST"])
def local_remote_conversion_create():
    owner_email = _studio_owner_email()
    body = request.json if request.is_json else {}
    visitor_key = (
        body.get("visitor_key")
        or request.headers.get("X-Forwarded-For")
        or request.remote_addr
        or owner_email
    )
    log_local_remote_conversion(
        owner_email,
        visitor_key,
        body.get("event_key"),
        body.get("surface"),
        body.get("detail"),
    )
    return {"ok": True, "summary": summarize_local_remote_conversions(owner_email, window_days=7)}

@app.route("/studio")
def studio_home():
    return send_from_directory("static/studio", "index.html")

@app.route("/studioaria")
def studioaria_home():
    return send_from_directory("static/studio", "index.html")

@app.route("/studioaria/extensions")
def studioaria_extensions():
    return {
        "ok": True,
        "formats": ["mp4", "m4a", "wav", "mp3", "flac", "aac", "ogg"],
        "message": "SupportRD Pro Jake Studio extension lane is active."
    }

@app.route("/ok")
def prevention_ok():
    return send_from_directory("static", "prevention-ok.html")

@app.route("/manifest.json")
def manifest():
    return send_from_directory("static", "manifest.json")


@app.route("/api/status/architecture")
def architecture_status():
    return jsonify({
        "ok": True,
        "build": "20260409f",
        "layers": {
            "openai": "intelligence",
            "pocketbase": "account memory",
            "frontend": "feel",
            "backend": "operations",
            "transcribe_international": "accessibility",
            "cloud": "scale and reliability",
        },
        "serves": {
            "main_structure": "durability, payment friendly flow, responsive remote shell",
            "general_options": "fun and useful actions across diary, studio, map, faq, and profile",
            "contacts_channels": "support email, payments, in-person routes, technical support, and fan feedback",
            "statistics": "SEO build, remote usefulness, and account flow health",
        }
    })

@app.route("/sw.js")
def sw():
    return send_from_directory("static", "sw.js")

@app.route("/favicon.ico")
def favicon():
    return send_from_directory("static/images", "woman-waking-up12.jpg")

@app.errorhandler(502)
def bad_gateway_error(_err):
    return jsonify({
        "ok": False,
        "error": "bad_gateway",
        "message": "SupportRD upstream is temporarily unavailable.",
        "help": {
            "status_page": "https://status.render.com",
            "troubleshooting": "https://render.com/docs/troubleshooting-deploys",
            "local_fallback": "/status/502",
        },
    }), 502

#################################################

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
