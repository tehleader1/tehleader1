"""
SupportRD Auto Content Engine
Generates SEO blog posts, Pinterest pins, and Reddit posts.
Called by app.py via: from content_engine import run_engine; run_engine()
Returns: {"topic": str, "shopify_url": str|None, "pinterest": bool, "reddit": bool}
"""

import os, json, sqlite3, datetime, re, random, time
import urllib.request as urlreq
import urllib.parse   as urlparse

# ── CONFIG ────────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY   = os.environ.get("ANTHROPIC_API_KEY", "")
SHOPIFY_STORE       = os.environ.get("SHOPIFY_STORE", "supportrd.myshopify.com")
SHOPIFY_ADMIN_TOKEN = os.environ.get("SHOPIFY_ADMIN_TOKEN", "")
PINTEREST_TOKEN     = os.environ.get("PINTEREST_ACCESS_TOKEN", "")
PINTEREST_BOARD_ID  = os.environ.get("PINTEREST_BOARD_ID", "")
REDDIT_CLIENT_ID    = os.environ.get("REDDIT_CLIENT_ID", "")
REDDIT_CLIENT_SECRET= os.environ.get("REDDIT_CLIENT_SECRET", "")
REDDIT_USERNAME     = os.environ.get("REDDIT_USERNAME", "")
REDDIT_PASSWORD     = os.environ.get("REDDIT_PASSWORD", "")
REDDIT_SUBREDDIT    = os.environ.get("REDDIT_SUBREDDIT", "Hair")
BLOG_DB             = "/data/srd_blog.db"
LOG_PATH            = "/data/content_engine_log.json"
BLOG_BASE_URL       = os.environ.get("APP_BASE_URL", "https://ai-hair-advisor.onrender.com")

# ── TOPIC POOL ────────────────────────────────────────────────────────────────
TOPICS = [
    "How to repair severely damaged hair in 30 days",
    "Why Dominican hair care products are taking over the beauty world",
    "The truth about hair loss: causes, fixes, and what actually works",
    "Curly hair routine for frizz-free results all day",
    "How to grow hair faster: science-backed tips that work",
    "Deep conditioning vs protein treatment: which does your hair need?",
    "How hard water is destroying your hair (and how to fix it)",
    "The best hair care routine for color-treated hair",
    "Scalp health 101: the foundation of healthy hair growth",
    "Why your hair is breaking off and how to stop it today",
    "Natural ingredients that actually work for hair growth",
    "The complete guide to caring for 4C natural hair",
    "How heat styling is secretly damaging your hair",
    "Postpartum hair loss: causes, timeline, and solutions",
    "Why your hair feels dry even after conditioning",
    "The science of hair porosity and why it matters for your routine",
    "How stress affects your hair and what to do about it",
    "Best practices for transitioning from relaxed to natural hair",
    "How to choose the right hair oil for your hair type",
    "Overnight hair treatments that transform your hair while you sleep",
    "Why salon treatments fail at home and how to fix that",
    "Oily scalp, dry ends: the complete guide to combination hair",
    "How to build a minimalist hair care routine that actually works",
    "The real reason your hair won't grow past a certain length",
    "Caribbean hair care secrets passed down for generations",
]

# ── BLOG DB HELPERS ───────────────────────────────────────────────────────────
def _init_blog_db():
    db = sqlite3.connect(BLOG_DB, timeout=15)
    db.execute("""CREATE TABLE IF NOT EXISTS posts (
        handle TEXT PRIMARY KEY,
        title  TEXT,
        html   TEXT,
        meta   TEXT,
        date   TEXT
    )""")
    db.commit()
    db.close()

def _save_post(handle, title, html, meta, date):
    db = sqlite3.connect(BLOG_DB, timeout=15)
    db.execute(
        "INSERT OR REPLACE INTO posts (handle,title,html,meta,date) VALUES (?,?,?,?,?)",
        (handle, title, html, meta, date)
    )
    db.commit()
    db.close()

# ── LOG HELPERS ───────────────────────────────────────────────────────────────
def _load_log():
    try:
        with open(LOG_PATH, "r") as f:
            return json.load(f)
    except Exception:
        return []

def _save_log(log):
    try:
        with open(LOG_PATH, "w") as f:
            json.dump(log, f, indent=2)
    except Exception as e:
        print(f"[engine] log save error: {e}")

def _append_log(entry):
    log = _load_log()
    log.insert(0, entry)
    if len(log) > 100:
        log = log[:100]
    _save_log(log)

# ── SLUGIFY ───────────────────────────────────────────────────────────────────
def _slugify(text):
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s[:80].strip("-")

# ── CLAUDE: GENERATE BLOG POST ────────────────────────────────────────────────
def _generate_post(topic):
    """Call Claude API to generate a full SEO blog post. Returns dict."""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    system = """You are a professional hair care content writer for SupportRD, a premium Dominican hair care brand.
Write expert, engaging, SEO-optimized hair care blog posts that naturally mention SupportRD products.

SupportRD products to weave in naturally:
- Formula Exclusiva ($55): all-in-one professional treatment for damaged/dry hair
- Laciador Crece ($40): restructurer for softness, growth, shine, elasticity
- Gotero Rapido ($55): scalp dropper for hair loss, growth stimulation, scalp health
- Gotitas Brillantes ($30): shine and finishing drops
- Mascarilla Avocado ($25): deep conditioning mask
- Shampoo Aloe Vera & Rosemary ($20): stimulating cleanse

Respond ONLY with valid JSON (no markdown backticks), this exact structure:
{
  "title": "Full SEO-optimized title",
  "meta": "One compelling 155-char meta description",
  "html": "Full blog post HTML (h1, h2, p tags only — no head/body/style). 600-900 words. Mention 2-3 SupportRD products naturally."
}"""

    messages = [{"role": "user", "content": f"Write a blog post about: {topic}"}]
    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1800,
        "system": system,
        "messages": messages
    }).encode("utf-8")

    req = urlreq.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01"
        },
        method="POST"
    )
    with urlreq.urlopen(req, timeout=45) as resp:
        raw    = json.loads(resp.read().decode("utf-8"))
        text   = raw["content"][0]["text"].strip()
        # Strip accidental markdown fences
        text   = re.sub(r"^```json\s*", "", text)
        text   = re.sub(r"\s*```$", "", text)
        result = json.loads(text)
    return result

# ── SHOPIFY: CREATE BLOG ARTICLE ──────────────────────────────────────────────
def _post_to_shopify(title, html, meta, handle):
    """Create a blog article on Shopify. Returns article URL or None."""
    if not SHOPIFY_ADMIN_TOKEN or not SHOPIFY_STORE:
        print("[engine] Shopify not configured — skipping")
        return None

    # Get or create the blog
    blog_id = _get_or_create_shopify_blog()
    if not blog_id:
        print("[engine] Could not get Shopify blog ID — skipping")
        return None

    article_payload = json.dumps({
        "article": {
            "title":        title,
            "body_html":    html,
            "summary_html": meta,
            "published":    True,
            "handle":       handle,
            "tags":         "hair care, hair growth, hair tips, SupportRD"
        }
    }).encode("utf-8")

    url = f"https://{SHOPIFY_STORE}/admin/api/2024-01/blogs/{blog_id}/articles.json"
    req = urlreq.Request(
        url,
        data=article_payload,
        headers={
            "Content-Type":             "application/json",
            "X-Shopify-Access-Token":   SHOPIFY_ADMIN_TOKEN
        },
        method="POST"
    )
    try:
        with urlreq.urlopen(req, timeout=20) as resp:
            data    = json.loads(resp.read().decode("utf-8"))
            art     = data.get("article", {})
            art_handle = art.get("handle", handle)
            blog_handle = _get_shopify_blog_handle(blog_id)
            if blog_handle:
                return f"https://{SHOPIFY_STORE}/blogs/{blog_handle}/{art_handle}"
            return f"https://{SHOPIFY_STORE}/blogs/news/{art_handle}"
    except Exception as e:
        print(f"[engine] Shopify article post error: {e}")
        return None

def _get_or_create_shopify_blog():
    """Return the first blog ID from Shopify, or create one."""
    url = f"https://{SHOPIFY_STORE}/admin/api/2024-01/blogs.json"
    req = urlreq.Request(url, headers={"X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN})
    try:
        with urlreq.urlopen(req, timeout=10) as resp:
            data  = json.loads(resp.read().decode("utf-8"))
            blogs = data.get("blogs", [])
            if blogs:
                return blogs[0]["id"]
        # Create one
        create_payload = json.dumps({"blog": {"title": "Hair Care Journal"}}).encode("utf-8")
        req2 = urlreq.Request(url, data=create_payload,
                              headers={"Content-Type": "application/json",
                                       "X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN},
                              method="POST")
        with urlreq.urlopen(req2, timeout=10) as resp2:
            data2 = json.loads(resp2.read().decode("utf-8"))
            return data2.get("blog", {}).get("id")
    except Exception as e:
        print(f"[engine] Shopify blog fetch error: {e}")
        return None

def _get_shopify_blog_handle(blog_id):
    url = f"https://{SHOPIFY_STORE}/admin/api/2024-01/blogs/{blog_id}.json"
    req = urlreq.Request(url, headers={"X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN})
    try:
        with urlreq.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("blog", {}).get("handle")
    except Exception:
        return None

# ── PINTEREST: CREATE PIN ─────────────────────────────────────────────────────
def _post_to_pinterest(title, meta, blog_url):
    """Create a Pinterest pin. Returns True on success."""
    if not PINTEREST_TOKEN or not PINTEREST_BOARD_ID:
        print("[engine] Pinterest not configured — skipping")
        return False

    pin_payload = json.dumps({
        "link":       blog_url,
        "title":      title[:100],
        "description": meta[:500],
        "board_id":   PINTEREST_BOARD_ID,
        "media_source": {
            "source_type": "image_url",
            "url": "https://cdn.shopify.com/s/files/1/0593/2715/2208/files/srd-hair-care.jpg"
        }
    }).encode("utf-8")

    req = urlreq.Request(
        "https://api.pinterest.com/v5/pins",
        data=pin_payload,
        headers={
            "Authorization":  f"Bearer {PINTEREST_TOKEN}",
            "Content-Type":   "application/json"
        },
        method="POST"
    )
    try:
        with urlreq.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            pin_id = data.get("id")
            print(f"[engine] Pinterest pin created: {pin_id}")
            return bool(pin_id)
    except Exception as e:
        print(f"[engine] Pinterest error: {e}")
        return False

# ── REDDIT: SUBMIT POST ───────────────────────────────────────────────────────
def _get_reddit_token():
    """Get a Reddit OAuth2 access token."""
    auth = (REDDIT_CLIENT_ID + ":" + REDDIT_CLIENT_SECRET).encode("utf-8")
    import base64
    auth_b64 = base64.b64encode(auth).decode("utf-8")

    payload = urlparse.urlencode({
        "grant_type": "password",
        "username":   REDDIT_USERNAME,
        "password":   REDDIT_PASSWORD
    }).encode("utf-8")

    req = urlreq.Request(
        "https://www.reddit.com/api/v1/access_token",
        data=payload,
        headers={
            "Authorization": f"Basic {auth_b64}",
            "User-Agent":    "SupportRD/1.0 (hair care content)",
            "Content-Type":  "application/x-www-form-urlencoded"
        },
        method="POST"
    )
    with urlreq.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data.get("access_token")

def _post_to_reddit(title, meta, blog_url):
    """Submit a link post to Reddit. Returns True on success."""
    if not all([REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD]):
        print("[engine] Reddit not configured — skipping")
        return False

    try:
        token = _get_reddit_token()
        if not token:
            return False

        payload = urlparse.urlencode({
            "sr":       REDDIT_SUBREDDIT,
            "kind":     "link",
            "title":    title[:300],
            "url":      blog_url,
            "resubmit": "true",
            "nsfw":     "false"
        }).encode("utf-8")

        req = urlreq.Request(
            "https://oauth.reddit.com/api/submit",
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent":    "SupportRD/1.0 (hair care content)",
                "Content-Type":  "application/x-www-form-urlencoded"
            },
            method="POST"
        )
        with urlreq.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            success = not data.get("json", {}).get("errors")
            print(f"[engine] Reddit post: {'✓' if success else '✗'} {data.get('json',{}).get('errors')}")
            return success
    except Exception as e:
        print(f"[engine] Reddit error: {e}")
        return False

# ── LOCAL BLOG FALLBACK ───────────────────────────────────────────────────────
def _save_to_local_blog(handle, title, html, meta, date):
    """Always save to local SQLite blog DB (used by /blog route in app.py)."""
    try:
        _init_blog_db()
        _save_post(handle, title, html, meta, date)
        print(f"[engine] Saved to local blog DB: {handle}")
        return f"{BLOG_BASE_URL}/blog/{handle}"
    except Exception as e:
        print(f"[engine] Local blog save error: {e}")
        return None

# ── MAIN ENGINE ───────────────────────────────────────────────────────────────
def run_engine():
    """
    Generate one piece of content and distribute it.
    Returns dict: {topic, shopify_url, pinterest, reddit, error}
    """
    date  = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    entry = {
        "date":        datetime.datetime.utcnow().isoformat(),
        "topic":       "unknown",
        "shopify_url": None,
        "pinterest":   False,
        "reddit":      False,
        "error":       None
    }

    try:
        # 1. Pick a topic — avoid recent ones
        log    = _load_log()
        recent = {r.get("topic", "") for r in log[:10]}
        pool   = [t for t in TOPICS if t not in recent] or TOPICS
        topic  = random.choice(pool)
        entry["topic"] = topic
        print(f"[engine] 🚀 Generating post for: {topic}")

        # 2. Generate content via Claude
        post   = _generate_post(topic)
        title  = post.get("title", topic)
        html   = post.get("html", f"<h1>{topic}</h1><p>Hair care advice from SupportRD.</p>")
        meta   = post.get("meta", topic[:155])
        handle = _slugify(title) + "-" + date

        print(f"[engine] ✍️ Generated: {title}")

        # 3. Save to local blog DB (always — this powers /blog on your site)
        local_url = _save_to_local_blog(handle, title, html, meta, date)

        # 4. Try Shopify (optional — needs SHOPIFY_ADMIN_TOKEN)
        shopify_url = _post_to_shopify(title, html, meta, handle)
        entry["shopify_url"] = shopify_url or local_url
        print(f"[engine] Shopify: {'✓ ' + shopify_url if shopify_url else '— using local blog'}")

        # 5. Try Pinterest (optional — needs PINTEREST_ACCESS_TOKEN + PINTEREST_BOARD_ID)
        blog_url = shopify_url or local_url or f"{BLOG_BASE_URL}/blog/{handle}"
        entry["pinterest"] = _post_to_pinterest(title, meta, blog_url)

        # 6. Try Reddit (optional — needs REDDIT_* credentials)
        entry["reddit"] = _post_to_reddit(title, meta, blog_url)

        print(f"[engine] ✅ Done — Pinterest: {entry['pinterest']}, Reddit: {entry['reddit']}")

    except Exception as e:
        import traceback
        entry["error"] = str(e)
        entry["topic"] = entry.get("topic", "error")
        print(f"[engine] ❌ Error: {e}")
        traceback.print_exc()

    # Always append to log
    _append_log(entry)
    return entry


# ── STANDALONE RUN ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    result = run_engine()
    print(json.dumps(result, indent=2))
