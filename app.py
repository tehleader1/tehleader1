import os
import sqlite3
import secrets
from flask import Flask, request, jsonify, Response, redirect

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", secrets.token_hex(32))

DB="users.db"


def db():
    conn=sqlite3.connect(DB)
    conn.row_factory=sqlite3.Row
    return conn


def init():
    c=db()
    c.execute("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE,
        password TEXT,
        token TEXT
    )
    """)
    c.commit()
    c.close()

init()


def create_token():
    return secrets.token_hex(32)


def get_user_from_token(token):
    c=db()
    u=c.execute("SELECT * FROM users WHERE token=?",(token,)).fetchone()
    c.close()
    return u


# HEALTH CHECK
@app.route("/api/ping")
def ping():
    return {"status":"ok"}


# LOGIN
@app.route("/api/auth/login",methods=["POST"])
def login():

    data=request.json
    email=data.get("email")
    password=data.get("password")

    c=db()

    user=c.execute(
        "SELECT * FROM users WHERE email=? AND password=?",
        (email,password)
    ).fetchone()

    if not user:
        return {"error":"Invalid login"}

    token=create_token()

    c.execute(
        "UPDATE users SET token=? WHERE id=?",
        (token,user["id"])
    )

    c.commit()
    c.close()

    return {
        "token":token,
        "name":user["name"],
        "email":user["email"]
    }


# REGISTER
@app.route("/api/auth/register",methods=["POST"])
def register():

    data=request.json

    name=data.get("name")
    email=data.get("email")
    password=data.get("password")

    token=create_token()

    try:

        c=db()

        c.execute(
            "INSERT INTO users(name,email,password,token) VALUES(?,?,?,?)",
            (name,email,password,token)
        )

        c.commit()
        c.close()

    except:
        return {"error":"Account already exists"}

    return {
        "token":token,
        "name":name,
        "email":email
    }


# GOOGLE LOGIN
@app.route("/api/auth/google",methods=["POST"])
def google():

    token=create_token()

    return {
        "token":token,
        "name":"Google User",
        "email":"google@user.com"
    }


# GET CURRENT USER
@app.route("/api/auth/me")
def me():

    token=request.headers.get("X-Auth-Token")

    if not token:
        return {"error":"Unauthorized"},401

    user=get_user_from_token(token)

    if not user:
        return {"error":"Unauthorized"},401

    return {
        "name":user["name"],
        "email":user["email"]
    }


# LOGIN PAGE
@app.route("/")
@app.route("/login")
def login_page():

    html = """
<!DOCTYPE html>
<html>
<head>
<title>SupportRD Hair Advisor</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{
font-family:sans-serif;
background:#ececf3;
display:flex;
align-items:center;
justify-content:center;
height:100vh;
margin:0;
}
.card{
background:white;
padding:40px;
border-radius:12px;
width:420px;
}
input{
width:100%;
padding:12px;
margin-bottom:12px;
}
button{
width:100%;
padding:14px;
background:#6a4df4;
color:white;
border:none;
border-radius:6px;
}
</style>
</head>

<body>

<div class="card">

<h2>SupportRD Hair Advisor</h2>

<input id="email" placeholder="email">
<input id="pass" type="password" placeholder="password">

<button onclick="login()">Sign In</button>

</div>

<script>

async function login(){

let email=document.getElementById('email').value
let pass=document.getElementById('pass').value

let r=await fetch('/api/auth/login',{
method:'POST',
headers:{'Content-Type':'application/json'},
body:JSON.stringify({email:email,password:pass})
})

let d=await r.json()

if(d.error){
alert(d.error)
return
}

localStorage.setItem('srd_token',d.token)

window.location='/dashboard'

}

</script>

</body>
</html>
"""

    return Response(html,mimetype="text/html")


# DASHBOARD
@app.route("/dashboard")
def dashboard():

    html = """
<!DOCTYPE html>
<html>
<head>
<title>SupportRD Dashboard</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{
background:#0b0d12;
color:white;
font-family:sans-serif;
padding:60px;
}
button{
background:#6a4df4;
border:none;
padding:12px 20px;
color:white;
margin-right:10px;
border-radius:6px;
}
</style>
</head>

<body>

<h1>SupportRD AI Hair Advisor Dashboard</h1>

<button onclick="scan()">Run Hair Scan</button>
<button onclick="aria()">Ask Aria</button>
<button onclick="logout()">Logout</button>

<script>

function logout(){
localStorage.removeItem('srd_token')
window.location='/login'
}

function scan(){
alert('Hair scan starting...')
}

function aria(){
alert('Opening Aria AI...')
}

</script>

</body>
</html>
"""

    return Response(html,mimetype="text/html")


if __name__=="__main__":

    port=int(os.environ.get("PORT",5000))

    app.run(host="0.0.0.0",port=port)
