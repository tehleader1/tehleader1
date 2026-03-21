from flask import Flask, jsonify, request, send_from_directory, Response, session, redirect
import json
import random
import smtplib
import ssl
import threading
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
import requests
import time
import sqlite3
from datetime import datetime, timedelta
import hmac
import hashlib
import base64
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
SHOPIFY_WEBHOOK_SECRET = os.environ.get("SHOPIFY_WEBHOOK_SECRET", "")

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
            "id_last4_hash TEXT,"
            "visa_last4_hash TEXT,"
            "status TEXT,"
            "created_at TEXT,"
            "updated_at TEXT"
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
    recipients = []
    for em in [COMMUNITY_ALERT_PRIMARY_EMAIL, COMMUNITY_ALERT_SECONDARY_EMAIL, DEVELOPER_EMAIL, ADMIN_EMAIL]:
        v = (em or "").strip().lower()
        if v and "@" in v and v not in recipients:
            recipients.append(v)
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

def hash_sensitive(label, value):
    raw = f"{label}|{(value or '').strip()}|{app.secret_key}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

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
        if plan not in ("free", "premium", "pro"):
            return "free"
        return plan
    except:
        return "free"

def set_subscription_for_email(email, plan, source="manual", order_id=""):
    if not email:
        return False
    normalized = (plan or "free").lower().strip()
    if normalized not in ("free", "premium", "pro"):
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
    if not SHOPIFY_STORE or not SHOPIFY_ADMIN_TOKEN:
        return {"ok": False, "error": "shopify_admin_not_configured"}
    try:
        now = datetime.utcnow()
        created_min = (now - timedelta(days=8)).isoformat() + "Z"
        r = requests.get(
            f"https://{SHOPIFY_STORE}/admin/api/2024-01/orders.json",
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
    }

@app.route("/api/leads/request-call", methods=["POST"])
def leads_request_call():
    data = request.json or {}
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
    wait_message = "Request received. Your SupportRD check-in is pending review and follow-up."
    row = {
        "request_id": request_id,
        "name": name,
        "phone": phone,
        "email": email,
        "address": address,
        "notes": notes,
        "consent": True,
        "status": "pending",
        "wait_message": wait_message,
    }
    if not upsert_lead_request(row):
        return {"ok": False, "error": "save_failed"}, 500
    log_security_event(client_ip(), "/api/leads/request-call", "lead_request_created", f"{email} {request_id}")
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
    if not is_admin() and from_email != session_email:
        return {"ok": False, "error": "identity_mismatch"}, 403
    if not from_email or not to_email or "@" not in from_email or "@" not in to_email:
        return {"ok": False, "error": "invalid_email"}, 400
    if len(id_last4) != 4 or len(visa_last4) != 4:
        return {"ok": False, "error": "last4_required"}, 400
    plan = get_subscription_for_email(from_email)
    if plan != "pro":
        return {"ok": False, "error": "unlimited_required"}, 403
    request_id = f"TR-{uuid.uuid4().hex[:10].upper()}"
    try:
        now = datetime.utcnow().isoformat() + "Z"
        conn = sqlite3.connect(CREDIT_DB_PATH)
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO account_transfer_requests (request_id, from_email, to_email, aria_plan, id_last4_hash, visa_last4_hash, status, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                request_id,
                from_email,
                to_email,
                plan,
                hash_sensitive("id_last4", id_last4),
                hash_sensitive("visa_last4", visa_last4),
                "pending_review",
                now,
                now,
            ),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500
    send_admin_alert("account_transfer_request", "urgent", request_id, "SupportRD transfer lane", f"{from_email} -> {to_email} ({plan})")
    return {"ok": True, "request_id": request_id, "status": "pending_review", "note": "Raw ID data is never stored; only secure hashes are kept."}

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
            "SELECT from_email, to_email, aria_plan, status FROM account_transfer_requests WHERE request_id = ? LIMIT 1",
            (request_id,),
        )
        row = cur.fetchone()
        if not row:
            conn.close()
            return {"ok": False, "error": "request_not_found"}, 404
        from_email, to_email, aria_plan, status = row
        if status != "pending_review":
            conn.close()
            return {"ok": False, "error": "request_not_pending"}, 409
        set_subscription_for_email(to_email, aria_plan or "pro", source="transfer_approved", order_id=request_id)
        set_subscription_for_email(from_email, "free", source="transfer_approved", order_id=request_id)
        now = datetime.utcnow().isoformat() + "Z"
        cur.execute(
            "UPDATE account_transfer_requests SET status = ?, updated_at = ? WHERE request_id = ?",
            ("approved", now, request_id),
        )
        conn.commit()
        conn.close()
        append_credit_audit(request_id, from_email, "account_transfer_approved", {"to_email": to_email, "plan": aria_plan})
        return {"ok": True, "status": "approved", "to_email": to_email, "plan": aria_plan}
    except Exception as e:
        return {"ok": False, "error": str(e)[:120]}, 500

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
    return {"ok": True, "subscription": get_subscription_for_email(email)}

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
        plan = None
        for item in items:
            title = (item.get("title") or "").lower()
            sku = (item.get("sku") or "").lower()
            check = f"{title} {sku}"
            if "professional hair advisor" in check or "$50" in check or "pro" in check:
                plan = "pro"
                break
            if "hair advisor premium" in check or "$35" in check or "premium" in check:
                plan = "premium"
        if not plan:
            return {"ok": True, "ignored": "not_subscription_order"}
        ok = set_subscription_for_email(email, plan, source="shopify_webhook_paid", order_id=order_id)
        return {"ok": bool(ok), "email": email, "plan": plan}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}, 500

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
    "You are ARIA, a hair and scalp care expert for SupportRD. You only discuss hair, scalp, hair products, routines, styling, and hair-related wellness. If the user asks about anything outside hair or scalp care, refuse and redirect to hair help. Always give thorough, structured answers and include a routine (wash day + midweek + styling + protection). When users list multiple issues (dryness, lack of bounce, frizz, oiliness, damage, tangles, color loss), address each one explicitly. When asked for prices or when the user lists products, always repeat the price for each named item and give a total if quantity is 1 each. Prices: Shampoo Aloe Vera $20, Formula Exclusiva $55, Laciador Crece $40, Mascarilla Capilar $25, Gotero Rapido $55, Gotitas Brillantes $30. If user names differ (Gotika, Gotero, Mascrilla, Laciador), map them to Gotitas Brillantes, Gotero Rapido, Mascarilla Capilar, Laciador Crece. Offer a simple total estimate when quantities are 1 each. End every answer with one short 'Don't forget' reminder line about the member plan relevant to the user."
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
    if not is_hair_topic(msg):
        return {"reply": "I can only help with hair and scalp care. Tell me your hair concern and I’ll help."}

    try:

        tier_note = "free plan user"
        if membership_tier == "premium":
            tier_note = "premium member"
        elif membership_tier == "pro":
            tier_note = "pro member"
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": HAIR_SYSTEM + f" Membership context: {tier_note}."},
                {"role": "user", "content": msg}
            ],
            temperature=0.4,
            max_tokens=400
        )

        reply = response.choices[0].message.content or ""
        reminder = "Don't forget: upgrade to Premium ($35) or Pro ($50) for deeper ARIA guidance."
        if membership_tier == "premium":
            reminder = "Don't forget: Premium is active. Use your deeper ARIA guidance and routines."
        elif membership_tier == "pro":
            reminder = "Don't forget: Pro is active. You have full ARIA power and advanced coaching."
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
        model = "whisper-1"
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

scheduler.start()
init_claim_db()
init_credit_db()
init_wellness_db()
init_community_db()
init_subscription_db()
init_app_settings_db()
init_security_db()
set_setting("money_guard_enabled", "1")

#################################################
# STATIC FILES
#################################################

@app.route("/")
def home():
    return send_from_directory("static", "index.html")

@app.route("/ok")
def prevention_ok():
    return send_from_directory("static", "prevention-ok.html")

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
