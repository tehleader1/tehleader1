// ===== AUTH CONFIG =====
const AUTH_BASE = "https://supportrd.com";

const LOGIN_URL = `${AUTH_BASE}/account/login`;
const REGISTER_URL = `${AUTH_BASE}/account/register`;
const LOGOUT_URL = `${AUTH_BASE}/account/logout`;

// ===== FORCE ALL LOGIN LINKS =====
function forceAuthLinks() {
  document.querySelectorAll("a, button").forEach(el => {
    const text = (el.innerText || "").toLowerCase();

    if (text.includes("login") || text.includes("sign in")) {
      el.onclick = () => window.location.href = LOGIN_URL;
    }

    if (text.includes("signup") || text.includes("register")) {
      el.onclick = () => window.location.href = REGISTER_URL;
    }

    if (text.includes("logout")) {
      el.onclick = () => window.location.href = LOGOUT_URL;
    }
  });
}

// ===== REWRITE BAD RELATIVE LINKS =====
function fixBrokenRoutes() {
  document.querySelectorAll("a").forEach(a => {
    if (!a.href) return;

    if (a.href.includes("/account/login")) {
      a.href = LOGIN_URL;
    }

    if (a.href.includes("/account/register")) {
      a.href = REGISTER_URL;
    }

    if (a.href.includes("/account/logout")) {
      a.href = LOGOUT_URL;
    }
  });
}

// ===== RUN ON LOAD =====
window.addEventListener("DOMContentLoaded", () => {
  forceAuthLinks();
  fixBrokenRoutes();
});
