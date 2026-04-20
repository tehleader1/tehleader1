from flask import Flask, redirect, request, session
import os, requests, secrets
from urllib.parse import urlencode

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret")

AUTH0_DOMAIN = os.environ.get("AUTH0_DOMAIN")
AUTH0_CLIENT_ID = os.environ.get("AUTH0_CLIENT_ID")
AUTH0_CLIENT_SECRET = os.environ.get("AUTH0_CLIENT_SECRET")
AUTH0_CALLBACK_URL = os.environ.get(
    "AUTH0_CALLBACK_URL",
    "https://ai-hair-advisor.onrender.com/callback"
)

@app.route("/login")
def login():
    if not AUTH0_DOMAIN or not AUTH0_CLIENT_ID or not AUTH0_CLIENT_SECRET:
        print("LOGIN ERROR: Missing AUTH0 env vars")
        return redirect("https://supportrd.com/local-remote?login=failed")

    session["oauth_state"] = secrets.token_urlsafe(24)

    params = {
        "client_id": AUTH0_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": AUTH0_CALLBACK_URL,
        "scope": "openid profile email",
        "state": session["oauth_state"],
    }

    provider = request.args.get("provider")
    if provider:
        params["connection"] = provider

    url = f"https://{AUTH0_DOMAIN}/authorize?{urlencode(params)}"
    print("LOGIN REDIRECT:", url)

    return redirect(url)


@app.route("/callback")
def callback():
    print("----- CALLBACK HIT -----")

    code = request.args.get("code")
    state = request.args.get("state")

    print("CALLBACK DEBUG: code present =", bool(code))
    print("CALLBACK DEBUG: state =", state)
    print("CALLBACK DEBUG: session oauth_state =", session.get("oauth_state"))

    # ❌ State mismatch
    if not code or not state or state != session.get("oauth_state"):
        print("CALLBACK ERROR: STATE MISMATCH OR MISSING CODE")
        return redirect("https://supportrd.com/local-remote?login=failed&reason=state")

    try:
        token_url = f"https://{AUTH0_DOMAIN}/oauth/token"

        payload = {
            "grant_type": "authorization_code",
            "client_id": AUTH0_CLIENT_ID,
            "client_secret": AUTH0_CLIENT_SECRET,
            "code": code,
            "redirect_uri": AUTH0_CALLBACK_URL,
        }

        print("CALLBACK: requesting token")

        token_res = requests.post(token_url, json=payload, timeout=10)
        print("TOKEN STATUS:", token_res.status_code)
        print("TOKEN RESPONSE:", token_res.text)

        token_res.raise_for_status()
        tokens = token_res.json()

        userinfo_url = f"https://{AUTH0_DOMAIN}/userinfo"

        print("CALLBACK: requesting userinfo")

        userinfo_res = requests.get(
            userinfo_url,
            headers={"Authorization": f"Bearer {tokens.get('access_token')}"}
        )

        print("USERINFO STATUS:", userinfo_res.status_code)
        print("USERINFO RESPONSE:", userinfo_res.text)

        userinfo_res.raise_for_status()
        user = userinfo_res.json()

        email = (user.get("email") or "").strip()
        name = (user.get("name") or user.get("nickname") or "").strip()

        print("LOGIN SUCCESS:", email, name)

        return redirect(
            f"https://supportrd.com/local-remote?logged_in=true&login=confirmed&email={email}&name={name}"
        )

    except Exception as e:
        print("CALLBACK EXCEPTION:", repr(e))
        return redirect("https://supportrd.com/local-remote?login=failed&reason=exception")


@app.route("/")
def home():
    return "App running"
