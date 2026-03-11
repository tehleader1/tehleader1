"""
SupportRD Unified Content Engine v2
====================================
Merges the keyword intelligence engine with the original content engine.

What it does:
- Pulls the highest-scoring uncovered keyword from keywords.db
- Falls back to curated topic pool if keyword DB is empty
- Writes a full SEO post in the keyword's language (24 languages)
- Saves to local blog DB (/blog on aria.supportrd.com)
- Posts to Shopify blog
- Posts to Pinterest
- Posts to Reddit
- Pings Google, Bing, Yahoo with updated sitemap
- Marks keyword as covered so it never repeats

Called by app.py via: from content_engine import run_engine; run_engine()
Returns: {"topic": str, "shopify_url": str|None, "pinterest": bool, "reddit": bool}
"""

import os, json, sqlite3, datetime, re, random, time, hashlib
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
KEYWORDS_DB         = "/data/keywords.db"
LOG_PATH            = "/data/content_engine_log.json"
APP_BASE_URL        = os.environ.get("APP_BASE_URL", "https://aria.supportrd.com")

# ── LANGUAGE INSTRUCTIONS (24 languages) ─────────────────────────────────────
LANG_INSTRUCTIONS = {
    "en":    "Write in English.",
    "en-ca": "Write in Canadian English.",
    "es":    "Escribe en español.",
    "fr":    "Écris en français.",
    "ar":    "اكتب باللغة العربية.",
    "de":    "Schreibe auf Deutsch.",
    "sw":    "Andika kwa Kiswahili.",
    "ru":    "Пиши на русском языке.",
    "pt":    "Escreva em português.",
    "zh-CN": "用中文写。",
    "ja":    "日本語で書いてください。",
    "it":    "Scrivi in italiano.",
    "nl":    "Schrijf in het Nederlands.",
    "pl":    "Pisz po polsku.",
    "tr":    "Türkçe yaz.",
    "ko":    "한국어로 쓰세요.",
    "sv":    "Skriv på svenska.",
    "no":    "Skriv på norsk.",
    "da":    "Skriv på dansk.",
    "ro":    "Scrie în română.",
    "uk":    "Пиши українською.",
    "cs":    "Piš česky.",
    "hu":    "Írj magyarul.",
}

# ── FALLBACK TOPIC POOL (used when keyword DB is empty) ──────────────────────
FALLBACK_TOPICS = [
    ("How to repair severely damaged hair in 30 days", "en"),
    ("Why Dominican hair care products are taking over the beauty world", "en"),
    ("The truth about hair loss: causes, fixes, and what actually works", "en"),
    ("Curly hair routine for frizz-free results all day", "en"),
    ("How to grow hair faster: science-backed tips that work", "en"),
    ("Deep conditioning vs protein treatment: which does your hair need?", "en"),
    ("How hard water is destroying your hair and how to fix it", "en"),
    ("The best hair care routine for color-treated hair", "en"),
    ("Scalp health 101: the foundation of healthy hair growth", "en"),
    ("Why your hair is breaking off and how to stop it today", "en"),
    ("Natural ingredients that actually work for hair growth", "en"),
    ("The complete guide to caring for 4C natural hair", "en"),
    ("How heat styling is secretly damaging your hair", "en"),
    ("Postpartum hair loss: causes, timeline, and solutions", "en"),
    ("Why your hair feels dry even after conditioning", "en"),
    ("The science of hair porosity and why it matters for your routine", "en"),
    ("How stress affects your hair and what to do about it", "en"),
    ("Caribbean hair care secrets passed down for generations", "en"),
    # Spanish fallbacks
    ("Por qué se cae el cabello y cómo detenerlo", "es"),
    ("Cómo hidratar el cabello rizado naturalmente", "es"),
    ("Rutina de cabello para cabello seco y dañado", "es"),
    # French fallbacks
    ("Pourquoi vos cheveux tombent et comment y remédier", "fr"),
    ("Routine capillaire pour cheveux bouclés et secs", "fr"),
    # Portuguese fallbacks
    ("Como cuidar do cabelo cacheado naturalmente", "pt"),
    ("Por que o cabelo cai e como parar a queda", "pt"),
]

# ── SLUGIFY ───────────────────────────────────────────────────────────────────
def _slugify(text):
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_]+", "-", s)
    s = re.sub(r"-+", "-", s)
    return s[:80].strip("-")

def _kw_slug(phrase):
    slug = phrase.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug).strip("-")
    slug = slug[:60]
    h = hashlib.md5(phrase.encode()).hexdigest()[:6]
    return f"{slug}-{h}"

# ── KEYWORD DB — pick best uncovered phrase ───────────────────────────────────
def _get_top_keyword():
    """Return (phrase, lang) of highest-scoring keyword with no blog post yet.
    Returns None if keyword DB is empty or all covered."""
    try:
        kdb = sqlite3.connect(KEYWORDS_DB, timeout=10, check_same_thread=False)

        # Get all keywords ordered by score
        rows = kdb.execute(
            "SELECT phrase, lang FROM keywords ORDER BY score DESC LIMIT 500"
        ).fetchall()
        kdb.close()

        if not rows:
            return None

        # Get existing blog handles
        try:
            bdb = sqlite3.connect(BLOG_DB, timeout=10, check_same_thread=False)
            existing = set(r[0] for r in bdb.execute("SELECT handle FROM posts").fetchall())
            bdb.close()
        except:
            existing = set()

        # Find first uncovered
        for phrase, lang in rows:
            handle = _kw_slug(phrase)
            if handle not in existing:
                return (phrase, lang)

        return None  # all covered — fallback will handle it

    except Exception as e:
        print(f"[engine] Keyword DB error: {e}")
        return None

def _mark_keyword_covered(phrase, lang):
    """Boost score so covered keywords sink to bottom of next sweep."""
    try:
        kdb = sqlite3.connect(KEYWORDS_DB, timeout=10, check_same_thread=False)
        kdb.execute(
            "UPDATE keywords SET score=score+100 WHERE phrase=? AND lang=?",
            (phrase, lang)
        )
        kdb.commit()
        kdb.close()
    except Exception as e:
        print(f"[engine] Mark covered error: {e}")

# ── LOG HELPERS ───────────────────────────────────────────────────────────────
def _load_log():
    try:
        with open(LOG_PATH, "r") as f:
            return json.load(f)
    except:
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

# ── BLOG DB ───────────────────────────────────────────────────────────────────
def _init_blog_db():
    db = sqlite3.connect(BLOG_DB, timeout=15)
    db.execute("""CREATE TABLE IF NOT EXISTS posts (
        handle          TEXT PRIMARY KEY,
        title           TEXT,
        html            TEXT,
        meta            TEXT,
        date            TEXT,
        chinese_title   TEXT DEFAULT '',
        chinese_summary TEXT DEFAULT ''
    )""")
    db.commit()
    db.close()

def _save_to_local_blog(handle, title, html, meta, date, chinese_title="", chinese_summary=""):
    try:
        _init_blog_db()
        db = sqlite3.connect(BLOG_DB, timeout=15)
        db.execute(
            "INSERT OR REPLACE INTO posts (handle,title,html,meta,date,chinese_title,chinese_summary) VALUES (?,?,?,?,?,?,?)",
            (handle, title, html, meta, date, chinese_title, chinese_summary)
        )
        db.commit()
        db.close()
        print(f"[engine] Saved to local blog: /blog/{handle}")
        return f"{APP_BASE_URL}/blog/{handle}"
    except Exception as e:
        print(f"[engine] Local blog save error: {e}")
        return None

# ── CLAUDE: GENERATE POST ─────────────────────────────────────────────────────
def _generate_post(phrase, lang="en", is_keyword=True):
    """Generate a full SEO blog post. Returns {title, html, meta, chinese_title, chinese_summary}"""
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY not set")

    lang_instr = LANG_INSTRUCTIONS.get(lang, "Write in English.")
    is_chinese = lang in ("zh-CN", "zh-TW", "ja", "ko")

    if is_keyword:
        # Keyword-driven post — title must contain exact phrase
        system = f"""You are a hair care expert writing for SupportRD, a premium Dominican hair care brand.
Write a helpful, SEO-optimized blog post targeting the exact search phrase: "{phrase}"

{lang_instr}

Rules:
- Title must contain the exact phrase "{phrase}" naturally
- Write like a real person — everyday language, no jargon
- 600-800 words
- Naturally mention 2-3 SupportRD products where relevant:
  Formula Exclusiva ($55) — damaged/weak/breaking/thinning hair
  Laciador Crece ($40) — dry hair, frizz, shine, growth
  Gotero Rapido ($55) — hair loss, scalp issues, slow growth
  Gotitas Brillantes ($30) — finishing, shine, frizz control
  Mascarilla Natural ($25) — deep conditioning, dry/damaged
  Shampoo Aloe & Romero ($20) — scalp stimulation, daily cleanse
- End with a soft call to action: supportrd.com/pages/custom-order
- Return ONLY valid JSON, no markdown backticks, this exact structure:
{{
  "title": "SEO title containing the exact phrase",
  "meta": "155-char meta description",
  "html": "Full post HTML using h1, h2, p tags. 600-800 words.",
  "chinese_title": "Mandarin translation of title (or empty string if not Chinese)",
  "chinese_summary": "2-sentence Mandarin summary (or empty string if not Chinese)"
}}"""
    else:
        # Brand topic post — broader hair care content
        system = f"""You are a professional hair care content writer for SupportRD, a premium Dominican hair care brand.
Write an expert, engaging, SEO-optimized hair care blog post about: "{phrase}"

{lang_instr}

Rules:
- Write 600-900 words
- Naturally mention 2-3 SupportRD products:
  Formula Exclusiva ($55) — damaged/weak/breaking/thinning hair
  Laciador Crece ($40) — dry hair, frizz, shine, growth
  Gotero Rapido ($55) — hair loss, scalp issues, slow growth
  Gotitas Brillantes ($30) — finishing, shine, frizz control
  Mascarilla Natural ($25) — deep conditioning, dry/damaged
  Shampoo Aloe & Romero ($20) — scalp stimulation, daily cleanse
- End with CTA linking to supportrd.com/pages/custom-order
- Return ONLY valid JSON, no markdown backticks:
{{
  "title": "Full SEO-optimized title",
  "meta": "155-char meta description",
  "html": "Full post HTML using h1, h2, p tags.",
  "chinese_title": "",
  "chinese_summary": ""
}}"""

    messages = [{"role": "user", "content": f"Write the blog post now."}]
    payload = json.dumps({
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 2000,
        "system": system,
        "messages": messages
    }).encode("utf-8")

    req = urlreq.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "Content-Type":      "application/json",
            "x-api-key":         ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01"
        },
        method="POST"
    )
    with urlreq.urlopen(req, timeout=60) as resp:
        raw  = json.loads(resp.read().decode("utf-8"))
        text = raw["content"][0]["text"].strip()
        text = re.sub(r"^```json\s*", "", text)
        text = re.sub(r"\s*```$",     "", text)
        result = json.loads(text)
    return result

# ── SEO PING ──────────────────────────────────────────────────────────────────
def _ping_search_engines():
    from urllib.parse import quote as _q
    sitemap = f"{APP_BASE_URL}/sitemap.xml"
    for url in [
        f"https://www.google.com/ping?sitemap={_q(sitemap)}",
        f"https://www.bing.com/ping?sitemap={_q(sitemap)}",
        f"https://search.yahoo.com/mrss/ping?sitemap={_q(sitemap)}",
    ]:
        try:
            req = urlreq.Request(url, headers={"User-Agent": "SupportRD-Bot/1.0"})
            with urlreq.urlopen(req, timeout=8) as r:
                print(f"[engine] SEO ping {r.status}: {url[:60]}", flush=True)
        except Exception as e:
            print(f"[engine] SEO ping failed: {e}", flush=True)

# ── SHOPIFY ───────────────────────────────────────────────────────────────────
def _get_or_create_shopify_blog():
    if not SHOPIFY_ADMIN_TOKEN: return None
    url = f"https://{SHOPIFY_STORE}/admin/api/2019-04/blogs.json"
    req = urlreq.Request(url, headers={"X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN})
    try:
        with urlreq.urlopen(req, timeout=10) as resp:
            data  = json.loads(resp.read().decode("utf-8"))
            blogs = data.get("blogs", [])
            if blogs: return blogs[0]["id"]
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
    url = f"https://{SHOPIFY_STORE}/admin/api/2019-04/blogs/{blog_id}.json"
    req = urlreq.Request(url, headers={"X-Shopify-Access-Token": SHOPIFY_ADMIN_TOKEN})
    try:
        with urlreq.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("blog", {}).get("handle")
    except:
        return None

def _post_to_shopify(title, html, meta, handle):
    if not SHOPIFY_ADMIN_TOKEN or not SHOPIFY_STORE:
        print("[engine] Shopify not configured — skipping")
        return None
    blog_id = _get_or_create_shopify_blog()
    if not blog_id: return None

    cta_html = """
<hr>
<div style="background:#f9f5f3;border-radius:12px;padding:24px;text-align:center;margin-top:32px;">
  <p style="font-size:18px;font-style:italic;margin-bottom:8px;">Get your personalized hair routine</p>
  <p style="font-size:14px;color:#666;margin-bottom:16px;">Chat with Aria, our AI hair advisor, for expert advice tailored to your hair type.</p>
  <a href="https://aria.supportrd.com" style="background:#c1a3a2;color:#fff;padding:12px 28px;border-radius:30px;text-decoration:none;font-size:13px;">Chat with Aria Free →</a>
</div>"""

    keywords = ["hair care", "hair tips", "SupportRD", "Dominican hair care", "hair growth", "healthy hair"]
    tl = title.lower()
    if "damage" in tl or "repair" in tl: keywords.append("damaged hair repair")
    if "growth" in tl or "grow"   in tl: keywords.append("hair growth tips")
    if "curl"  in tl or "natural" in tl: keywords.append("natural hair care")
    if "scalp" in tl:                    keywords.append("scalp health")
    if "dry"   in tl or "moisture" in tl:keywords.append("dry hair treatment")
    if "loss"  in tl or "thin"    in tl: keywords.append("hair loss solutions")

    article_payload = json.dumps({
        "article": {
            "title":        title,
            "body_html":    html + cta_html,
            "summary_html": meta,
            "published":    True,
            "handle":       handle,
            "tags":         ", ".join(keywords[:8]),
            "metafields": [
                {"key":"title_tag",       "value":title + " | SupportRD", "type":"single_line_text_field","namespace":"global"},
                {"key":"description_tag", "value":meta,                   "type":"single_line_text_field","namespace":"global"}
            ]
        }
    }).encode("utf-8")

    url = f"https://{SHOPIFY_STORE}/admin/api/2019-04/blogs/{blog_id}/articles.json"
    req = urlreq.Request(url, data=article_payload,
                         headers={"Content-Type":"application/json",
                                  "X-Shopify-Access-Token":SHOPIFY_ADMIN_TOKEN},
                         method="POST")
    try:
        with urlreq.urlopen(req, timeout=20) as resp:
            data        = json.loads(resp.read().decode("utf-8"))
            art         = data.get("article", {})
            art_handle  = art.get("handle", handle)
            blog_handle = _get_shopify_blog_handle(blog_id)
            shopify_url = f"https://supportrd.com/blogs/{blog_handle}/{art_handle}" if blog_handle else f"https://supportrd.com/blogs/news/{art_handle}"
            print(f"[engine] Shopify article created: {shopify_url}")
            return shopify_url
    except Exception as e:
        print(f"[engine] Shopify error: {e}")
        return None

# ── PINTEREST ─────────────────────────────────────────────────────────────────
def _post_to_pinterest(title, meta, blog_url):
    if not PINTEREST_TOKEN or not PINTEREST_BOARD_ID:
        print("[engine] Pinterest not configured — skipping")
        return False
    pin_payload = json.dumps({
        "link":        blog_url,
        "title":       title[:100],
        "description": meta[:500],
        "board_id":    PINTEREST_BOARD_ID,
        "media_source": {
            "source_type": "image_url",
            "url": "https://cdn.shopify.com/s/files/1/0593/2715/2208/files/srd-hair-care.jpg"
        }
    }).encode("utf-8")
    req = urlreq.Request("https://api.pinterest.com/v5/pins", data=pin_payload,
                         headers={"Authorization":f"Bearer {PINTEREST_TOKEN}",
                                  "Content-Type":"application/json"},
                         method="POST")
    try:
        with urlreq.urlopen(req, timeout=15) as resp:
            data   = json.loads(resp.read().decode("utf-8"))
            pin_id = data.get("id")
            print(f"[engine] Pinterest pin created: {pin_id}")
            return bool(pin_id)
    except Exception as e:
        print(f"[engine] Pinterest error: {e}")
        return False

# ── REDDIT ────────────────────────────────────────────────────────────────────
def _get_reddit_token():
    import base64
    auth_b64 = base64.b64encode(f"{REDDIT_CLIENT_ID}:{REDDIT_CLIENT_SECRET}".encode()).decode()
    payload  = urlparse.urlencode({"grant_type":"password","username":REDDIT_USERNAME,"password":REDDIT_PASSWORD}).encode()
    req = urlreq.Request("https://www.reddit.com/api/v1/access_token", data=payload,
                         headers={"Authorization":f"Basic {auth_b64}",
                                  "User-Agent":"SupportRD/1.0",
                                  "Content-Type":"application/x-www-form-urlencoded"},
                         method="POST")
    with urlreq.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode()).get("access_token")

def _post_to_reddit(title, meta, blog_url):
    if not all([REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD]):
        print("[engine] Reddit not configured — skipping")
        return False
    try:
        token   = _get_reddit_token()
        if not token: return False
        payload = urlparse.urlencode({"sr":REDDIT_SUBREDDIT,"kind":"link","title":title[:300],
                                      "url":blog_url,"resubmit":"true","nsfw":"false"}).encode()
        req = urlreq.Request("https://oauth.reddit.com/api/submit", data=payload,
                             headers={"Authorization":f"Bearer {token}",
                                      "User-Agent":"SupportRD/1.0",
                                      "Content-Type":"application/x-www-form-urlencoded"},
                             method="POST")
        with urlreq.urlopen(req, timeout=15) as resp:
            data    = json.loads(resp.read().decode())
            success = not data.get("json", {}).get("errors")
            print(f"[engine] Reddit: {'✓' if success else '✗'}")
            return success
    except Exception as e:
        print(f"[engine] Reddit error: {e}")
        return False

# ── MAIN ENGINE ───────────────────────────────────────────────────────────────
def run_engine():
    """
    1. Try keyword DB — pick highest uncovered phrase
    2. Fall back to curated topic pool if DB empty
    3. Generate post in correct language (24 supported)
    4. Save to local blog DB
    5. Post to Shopify
    6. Post to Pinterest
    7. Post to Reddit
    8. Ping Google, Bing, Yahoo
    9. Mark keyword as covered
    """
    date  = datetime.datetime.utcnow().strftime("%Y-%m-%d")
    entry = {
        "date":        datetime.datetime.utcnow().isoformat(),
        "topic":       "unknown",
        "lang":        "en",
        "source":      "unknown",
        "shopify_url": None,
        "pinterest":   False,
        "reddit":      False,
        "error":       None
    }

    try:
        # 1. Pick topic — keyword list first, fallback second
        kw = _get_top_keyword()
        if kw:
            phrase, lang = kw
            is_keyword   = True
            entry["source"] = "keyword_db"
            print(f"[engine] 🎯 Keyword target: '{phrase}' ({lang})", flush=True)
        else:
            # Fall back to curated topics — avoid recent ones
            log    = _load_log()
            recent = {r.get("topic","") for r in log[:10]}
            pool   = [t for t in FALLBACK_TOPICS if t[0] not in recent] or FALLBACK_TOPICS
            phrase, lang = random.choice(pool)
            is_keyword   = False
            entry["source"] = "fallback_pool"
            print(f"[engine] 📝 Fallback topic: '{phrase}' ({lang})", flush=True)

        entry["topic"] = phrase
        entry["lang"]  = lang

        # 2. Generate content
        post   = _generate_post(phrase, lang, is_keyword)
        title  = post.get("title", phrase)
        html   = post.get("html",  f"<h1>{phrase}</h1>")
        meta   = post.get("meta",  phrase[:155])
        chinese_title   = post.get("chinese_title",   "")
        chinese_summary = post.get("chinese_summary", "")

        # Use keyword slug for keyword posts, date slug for fallback
        handle = _kw_slug(phrase) if is_keyword else (_slugify(title) + "-" + date)

        print(f"[engine] ✍️  Generated: {title}", flush=True)

        # 3. Save to local blog — always, this powers /blog on aria.supportrd.com
        local_url = _save_to_local_blog(handle, title, html, meta, date, chinese_title, chinese_summary)

        # 4. Post to Shopify
        shopify_url        = _post_to_shopify(title, html, meta, handle)
        entry["shopify_url"] = shopify_url or local_url
        print(f"[engine] Shopify: {'✓' if shopify_url else '— local only'}", flush=True)

        # 5. Post to Pinterest
        blog_url          = shopify_url or local_url or f"{APP_BASE_URL}/blog/{handle}"
        entry["pinterest"] = _post_to_pinterest(title, meta, blog_url)

        # 6. Post to Reddit
        entry["reddit"]    = _post_to_reddit(title, meta, blog_url)

        # 7. Ping search engines
        _ping_search_engines()

        # 8. Mark keyword as covered so it never runs again
        if is_keyword:
            _mark_keyword_covered(phrase, lang)

        print(f"[engine] ✅ Done — Pinterest:{entry['pinterest']} Reddit:{entry['reddit']} Source:{entry['source']}", flush=True)

    except Exception as e:
        import traceback
        entry["error"] = str(e)
        print(f"[engine] ❌ Error: {e}", flush=True)
        traceback.print_exc()

    _append_log(entry)
    return entry


# ── STANDALONE RUN ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    result = run_engine()
    print(json.dumps(result, indent=2))
