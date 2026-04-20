const AUTH_BASE = "https://supportrd.com";
const LOGIN_URL = `${AUTH_BASE}/account/login`;
const REGISTER_URL = `${AUTH_BASE}/account/register`;
const LOGOUT_URL = `${AUTH_BASE}/account/logout`;

function qs(sel) {
  return document.querySelector(sel);
}

function qsa(sel) {
  return Array.from(document.querySelectorAll(sel));
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getSavedSocialLinks() {
  return safeJsonParse(localStorage.getItem("socialLinks") || "{}", {});
}

function getSavedProfile() {
  return safeJsonParse(localStorage.getItem("accountProfile") || "{}", {});
}

function saveProfile(profile) {
  localStorage.setItem("accountProfile", JSON.stringify(profile || {}));
  if (profile && (profile.email || profile.name)) {
    localStorage.setItem("loggedIn", "true");
  }
}

function getRouteTag() {
  let tag = localStorage.getItem("supportrdRouteTag");
  if (!tag) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    tag = "^^ " + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    localStorage.setItem("supportrdRouteTag", tag);
  }
  return tag;
}

function extractProfileFromQuery() {
  const url = new URL(window.location.href);
  const email =
    url.searchParams.get("email") ||
    url.searchParams.get("account") ||
    "";
  const name =
    url.searchParams.get("name") ||
    url.searchParams.get("nickname") ||
    "";
  const loggedIn =
    url.searchParams.get("logged_in") === "true" ||
    url.searchParams.get("login") === "success";

  if (!loggedIn && !email && !name) return null;

  return {
    authenticated: true,
    email: email.trim(),
    name: name.trim()
  };
}

function buildProfile(apiData) {
  const social = getSavedSocialLinks();
  const saved = getSavedProfile();
  const queryProfile = extractProfileFromQuery();

  const apiUser = apiData && apiData.user ? apiData.user : {};
  const apiAuthenticated = !!(apiData && apiData.authenticated);

  const email =
    (apiUser.email || "") ||
    queryProfile?.email ||
    social.email ||
    saved.email ||
    "";

  const name =
    (apiUser.name || apiUser.nickname || "") ||
    queryProfile?.name ||
    social.name ||
    saved.name ||
    email ||
    "Logged in";

  const authenticated =
    apiAuthenticated ||
    !!queryProfile?.authenticated ||
    localStorage.getItem("loggedIn") === "true" ||
    !!email;

  return {
    authenticated,
    email: email.trim(),
    name: name.trim(),
    tag: getRouteTag()
  };
}

function ensurePlans() {
  let plans = qs("#accountPlans");
  const badge = qs("#userBadge");

  if (!badge) return;

  if (!plans) {
    plans = document.createElement("div");
    plans.id = "accountPlans";
    plans.style.display = "inline-flex";
    plans.style.gap = "8px";
    plans.style.flexWrap = "wrap";
    plans.style.marginLeft = "10px";

    plans.innerHTML = `
      <a href="https://supportrd.com/products/hair-advisor-premium"
         target="_blank" rel="noopener"
         style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);text-decoration:none;color:inherit;">
         Premium
      </a>
      <a href="https://supportrd.com/products/professional-hair-advisor"
         target="_blank" rel="noopener"
         style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,0.2);text-decoration:none;color:inherit;">
         Pro
      </a>
    `;
    badge.insertAdjacentElement("afterend", plans);
  }

  return plans;
}

function rewriteAuthClicks() {
  const loginBtn = qs("#loginBtn");
  const signupTop = qs("#signupTop");
  const logoutBtn = qs("#logoutBtn");

  if (loginBtn) {
    loginBtn.onclick = (e) => {
      e.preventDefault();
      window.location.href = LOGIN_URL;
    };
  }

  if (signupTop) {
    signupTop.onclick = (e) => {
      e.preventDefault();
      window.location.href = REGISTER_URL;
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = (e) => {
      e.preventDefault();
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("accountProfile");
      window.location.href = LOGOUT_URL;
    };
  }

  qsa("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href === "/login" || href === "/account/login") a.setAttribute("href", LOGIN_URL);
    if (href === "/signup" || href === "/account/register") a.setAttribute("href", REGISTER_URL);
    if (href === "/logout" || href === "/account/logout") a.setAttribute("href", LOGOUT_URL);
  });
}

function applyLoggedOutUi() {
  const loginBtn = qs("#loginBtn");
  const signupTop = qs("#signupTop");
  const logoutBtn = qs("#logoutBtn");
  const badge = qs("#userBadge");
  const plans = qs("#accountPlans");

  if (loginBtn) loginBtn.style.display = "inline-flex";
  if (signupTop) signupTop.style.display = "inline-flex";
  if (logoutBtn) logoutBtn.style.display = "none";
  if (badge) badge.style.display = "none";
  if (plans) plans.style.display = "none";
}

function applyLoggedInUi(profile) {
  const loginBtn = qs("#loginBtn");
  const signupTop = qs("#signupTop");
  const logoutBtn = qs("#logoutBtn");
  const badge = qs("#userBadge");
  const plans = ensurePlans();

  const displayName = profile.name || profile.email || "Logged in";
  const routeText = profile.email || displayName;
  const tag = profile.tag || getRouteTag();

  if (loginBtn) loginBtn.style.display = "none";
  if (signupTop) signupTop.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "inline-flex";

  if (badge) {
    badge.style.display = "inline-flex";
    badge.textContent = `Logged in ${tag}`;
    badge.title = routeText;
  }

  if (plans) {
    plans.style.display = "inline-flex";
  }

  const systemSub = qs(".system-sub");
  if (systemSub) {
    systemSub.textContent = `Logged in as ${routeText}`;
  }

  const authBadgeTitle = qs("#authBadgeTitle");
  const authBadgeText = qs("#authBadgeText");
  const publicRouteTitle = qs("#publicRouteTitle");
  const publicRouteText = qs("#publicRouteText");
  const memberCardTitle = qs("#memberCardTitle");
  const memberCardText = qs("#memberCardText");

  if (authBadgeTitle) authBadgeTitle.textContent = "Logged in";
  if (authBadgeText) authBadgeText.textContent = `${routeText} ${tag} · Premium and Pro lanes ready.`;
  if (publicRouteTitle) publicRouteTitle.textContent = `Account Route · ${displayName}`;
  if (publicRouteText) publicRouteText.textContent = `${routeText} ${tag}`;
  if (memberCardTitle) memberCardTitle.textContent = `Logged in · ${displayName}`;
  if (memberCardText) memberCardText.textContent = `Account active on ${routeText}. Premium and Pro packages are available now.`;

  document.body.classList.add("account-authenticated");
}

async function syncAccountUi() {
  rewriteAuthClicks();

  const savedProfile = buildProfile(null);
  if (savedProfile.authenticated) {
    applyLoggedInUi(savedProfile);
    saveProfile(savedProfile);
  } else {
    applyLoggedOutUi();
  }

  try {
    const res = await fetch("/api/me", { credentials: "include" });
    const data = await res.json();
    const profile = buildProfile(data);

    if (profile.authenticated) {
      saveProfile(profile);
      applyLoggedInUi(profile);
    }
  } catch {
    // keep saved/local UI state
  }
}

document.addEventListener("DOMContentLoaded", () => {
  syncAccountUi();
  setTimeout(syncAccountUi, 1200);
  setInterval(syncAccountUi, 5000);
});

function login() {
  window.location.href = LOGIN_URL;
}
