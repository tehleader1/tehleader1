import os
import sqlite3
import secrets
from datetime import datetime
from flask import Flask, request, jsonify, session, redirect, Response
from werkzeug.middleware.proxy_fix import ProxyFix

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)

DB = "supportrd.db"

# ---------------------------------------------------
# DATABASE
# ---------------------------------------------------

def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    c = db()
    c.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT,
        created_at TEXT
    )
    """)
    c.commit()
    c.close()

init_db()

# ---------------------------------------------------
# HEALTH
# ---------------------------------------------------

@app.route("/api/ping")
def ping():
    return {"status":"ok"}

@app.route("/health")
def health():
    return {"status":"running"}

# ---------------------------------------------------
# SERVICE WORKER
# ---------------------------------------------------

@app.route("/sw.js")
def sw():
    js = """
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => self.clients.claim());
"""
    return Response(js, mimetype="application/javascript")

# ---------------------------------------------------
# LOGIN PAGE
# ---------------------------------------------------

@app.route("/")
def index():

    html = """
<!DOCTYPE html>
<html>
<head>
<title>SupportRD Hair Advisor</title>

<style>

body{
background:linear-gradient(135deg,#efe9ff,#ffffff);
font-family:Arial;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
margin:0;
}

.card{
background:white;
padding:40px;
border-radius:18px;
box-shadow:0 20px 60px rgba(0,0,0,.15);
width:380px;
}

h1{
margin:0 0 20px;
}

input{
width:100%;
padding:10px;
margin:6px 0;
border-radius:6px;
border:1px solid #ccc;
}

button{
width:100%;
padding:12px;
margin-top:10px;
border:none;
border-radius:8px;
background:#6c4bff;
color:white;
font-size:16px;
cursor:pointer;
}

button:hover{
background:#593cff;
}

</style>
</head>

<body>

<div class="card">

<h1>SupportRD Hair Advisor</h1>

<input id="username" placeholder="username">
<input id="email" placeholder="email">
<input id="password" type="password" placeholder="password">

<button onclick="login()">Sign In</button>

<p id="msg"></p>

</div>

<script>

async function login(){

let r = await fetch("/api/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
username:document.getElementById("username").value,
email:document.getElementById("email").value,
password:document.getElementById("password").value
})
})

let d = await r.json()

if(d.success){
window.location="/dashboard"
}else{
document.getElementById("msg").innerText="Login failed"
}

}

</script>

</body>
</html>
"""
    return Response(html, mimetype="text/html")

# ---------------------------------------------------
# DASHBOARD PAGE
# ---------------------------------------------------

@app.route("/dashboard")
def dashboard():

    if "user" not in session:
        return redirect("/")

    html = f"""
<!DOCTYPE html>
<html>

<head>

<title>Dashboard</title>

<style>

body{{
font-family:Arial;
background:#111;
color:white;
margin:0;
padding:40px;
}}

.card{{
background:#222;
padding:30px;
border-radius:12px;
max-width:600px;
}}

button{{
padding:10px 20px;
margin-top:20px;
background:#6c4bff;
border:none;
color:white;
border-radius:6px;
}}

</style>

</head>

<body>

<div class="card">

<h1>Welcome {session['user']}</h1>

<p>SupportRD AI Hair Advisor Dashboard</p>

<button onclick="scan()">Run Hair Scan</button>

<button onclick="chat()">Ask Aria</button>

<button onclick="logout()">Logout</button>

<pre id="out"></pre>

</div>

<script>

async function scan(){{
let r = await fetch("/api/hair-scan",{{method:"POST",headers:{{"Content-Type":"application/json"}},body:JSON.stringify({{dryness:2,breakage:1,oil:2}})}})
let d = await r.json()
document.getElementById("out").innerText=JSON.stringify(d,null,2)
}}

async function chat(){{
let r = await fetch("/api/aria/chat",{{method:"POST",headers:{{"Content-Type":"application/json"}},body:JSON.stringify({{message:"How do I fix dry hair?"}})}})
let d = await r.json()
document.getElementById("out").innerText=d.reply
}}

function logout(){{
window.location="/api/logout"
}}

</script>

</body>
</html>
"""
    return Response(html, mimetype="text/html")

# ---------------------------------------------------
# LOGIN API
# ---------------------------------------------------

@app.route("/api/login",methods=["POST"])
def login():

    data = request.json
    username=data.get("username")
    email=data.get("email")
    password=data.get("password")

    if not username or not password:
        return {"error":"missing fields"}

    c=db()

    u=c.execute("SELECT * FROM users WHERE username=?",(username,)).fetchone()

    if not u:
        c.execute("INSERT INTO users(username,email,password,created_at) VALUES(?,?,?,?)",
        (username,email,password,datetime.utcnow().isoformat()))
        c.commit()

    c.close()

    session["user"]=username

    return {"success":True}

# ---------------------------------------------------
# LOGOUT
# ---------------------------------------------------

@app.route("/api/logout")
def logout():
    session.clear()
    return redirect("/")

# ---------------------------------------------------
# HAIR SCAN
# ---------------------------------------------------

@app.route("/api/hair-scan",methods=["POST"])
def scan():

    d=request.json

    score=int(d.get("dryness",0))+int(d.get("breakage",0))+int(d.get("oil",0))

    if score<4:
        result="Healthy Hair"
    elif score<8:
        result="Needs Moisture"
    else:
        result="Hair Damage"

    return {"score":score,"diagnosis":result}

# ---------------------------------------------------
# ARIA AI
# ---------------------------------------------------

@app.route("/api/aria/chat",methods=["POST"])
def aria():

    msg=request.json.get("message")

    return {"reply":"Aria AI says: keep your scalp hydrated and avoid heat damage."}

# ---------------------------------------------------
# RUN
# ---------------------------------------------------

if __name__=="__main__":
    port=int(os.environ.get("PORT",5000))
    app.run(host="0.0.0.0",port=port)
