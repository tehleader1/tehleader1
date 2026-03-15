import os
import sqlite3
import secrets
from flask import Flask, request, jsonify, redirect, Response

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


# HEALTH
@app.route("/api/ping")
def ping():
    return {"status":"ok"}


# AUTH LOGIN
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
        return {"error":"Account exists"}

    return {
        "token":token,
        "name":name,
        "email":email
    }


# AUTH ME
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


# GOOGLE (dummy for now)
@app.route("/api/auth/google",methods=["POST"])
def google():

    data=request.json
    cred=data.get("credential")

    if not cred:
        return {"error":"Invalid Google login"}

    token=create_token()

    return {
        "token":token,
        "name":"Google User",
        "email":"google@user.com"
    }


# IMPORTANT
# We DO NOT touch your UI routes
# They remain inside your original file

if __name__=="__main__":

    port=int(os.environ.get("PORT",5000))

    app.run(host="0.0.0.0",port=port)
