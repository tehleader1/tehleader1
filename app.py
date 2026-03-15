import os
import sqlite3
import secrets
from flask import Flask, request, session, redirect, jsonify

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))

DB = "users.db"

# -----------------------------
# DATABASE
# -----------------------------

def db():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init():
    c = db()
    c.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT,
        password TEXT
    )
    """)
    c.commit()
    c.close()

init()

# -----------------------------
# SERVICE WORKER
# -----------------------------

@app.route("/sw.js")
def sw():
    return """
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('fetch',e=>{});
""",200,{"Content-Type":"application/javascript"}

# -----------------------------
# HEALTH CHECK
# -----------------------------

@app.route("/api/ping")
def ping():
    return {"status":"ok"}

# -----------------------------
# LOGIN PAGE
# -----------------------------

@app.route("/")
def login_page():

    return """
<!DOCTYPE html>
<html>
<head>
<title>SupportRD Hair Advisor</title>

<style>

body{
background:#e6e6ef;
font-family:Arial;
display:flex;
justify-content:center;
align-items:center;
height:100vh;
}

.card{
background:white;
padding:40px;
border-radius:20px;
width:420px;
box-shadow:0 15px 50px rgba(0,0,0,.15);
}

h1{
text-align:center;
background:#4f6edb;
color:white;
padding:10px;
border-radius:6px;
}

input{
width:100%;
padding:14px;
margin-top:15px;
border-radius:8px;
border:1px solid #ccc;
}

button{
width:100%;
margin-top:20px;
padding:14px;
border:none;
border-radius:10px;
background:linear-gradient(90deg,#6a5cff,#7b5cff);
color:white;
font-size:16px;
cursor:pointer;
}

button:hover{
opacity:.9;
}

</style>
</head>

<body>

<div class="card">

<h1>SupportRD Hair Advisor</h1>

<input id="user" placeholder="username">
<input id="email" placeholder="email">
<input id="pass" type="password" placeholder="password">

<button onclick="login()">Sign In</button>

</div>

<script>

async function login(){

let r = await fetch('/api/login',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({
username:document.getElementById('user').value,
email:document.getElementById('email').value,
password:document.getElementById('pass').value
})
})

let j = await r.json()

if(j.redirect){
window.location=j.redirect
}

}

</script>

</body>
</html>
"""

# -----------------------------
# DASHBOARD
# -----------------------------

@app.route("/dashboard")
def dashboard():

    if "user" not in session:
        return redirect("/")

    return f"""
<!DOCTYPE html>
<html>
<head>
<title>Dashboard</title>

<style>

body{{
background:#05070a;
font-family:Arial;
color:white;
padding:40px;
}}

.card{{
background:#1b1c1f;
border-radius:20px;
padding:40px;
max-width:900px;
}}

h1{{
font-size:40px;
}}

button{{
padding:14px 25px;
border:none;
border-radius:8px;
background:#6c4cff;
color:white;
margin-right:10px;
font-size:15px;
cursor:pointer;
}}

button:hover{{
background:#7c5cff;
}}

</style>
</head>

<body>

<div class="card">

<h1>Welcome {session['user']}</h1>

<p>SupportRD AI Hair Advisor Dashboard</p>

<button onclick="scan()">Run Hair Scan</button>
<button onclick="aria()">Ask Aria</button>
<button onclick="logout()">Logout</button>

<pre id="result"></pre>

</div>

<script>

async function scan(){

let r = await fetch('/api/hair-scan',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({dryness:2,breakage:1,oil:1})
})

let j = await r.json()

document.getElementById('result').innerText=JSON.stringify(j,null,2)

}

async function aria(){

let msg = prompt("Ask Aria something")

let r = await fetch('/api/aria/chat',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({message:msg})
})

let j = await r.json()

document.getElementById('result').innerText=j.reply

}

function logout(){

window.location='/logout'

}

</script>

</body>
</html>
"""

# -----------------------------
# LOGIN API
# -----------------------------

@app.route("/api/login",methods=["POST"])
def login():

    d=request.json

    username=d.get("username")
    email=d.get("email")
    password=d.get("password")

    c=db()

    u=c.execute("SELECT * FROM users WHERE username=?",(username,)).fetchone()

    if not u:
        c.execute(
        "INSERT INTO users(username,email,password) VALUES(?,?,?)",
        (username,email,password)
        )
        c.commit()

    c.close()

    session["user"]=username

    return {"redirect":"/dashboard"}

# -----------------------------
# LOGOUT
# -----------------------------

@app.route("/logout")
def logout():

    session.clear()
    return redirect("/")

# -----------------------------
# HAIR SCAN
# -----------------------------

@app.route("/api/hair-scan",methods=["POST"])
def scan():

    d=request.json

    score=d.get("dryness",0)+d.get("breakage",0)+d.get("oil",0)

    if score<4:
        result="Healthy hair"
    elif score<8:
        result="Needs hydration"
    else:
        result="Hair damage detected"

    return {"score":score,"diagnosis":result}

# -----------------------------
# ARIA AI
# -----------------------------

@app.route("/api/aria/chat",methods=["POST"])
def aria():

    msg=request.json.get("message","")

    return {"reply":"Aria AI received: "+msg}

# -----------------------------
# START
# -----------------------------

if __name__=="__main__":

    port=int(os.environ.get("PORT",5000))

    app.run(host="0.0.0.0",port=port)
