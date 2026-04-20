(() => {
  const AUTH_BASE = "https://supportrd.com";
  const LOGIN_URL = `${AUTH_BASE}/account/login`;
  const REGISTER_URL = `${AUTH_BASE}/account/register`;
  const LOGOUT_URL = `${AUTH_BASE}/account/logout`;
  const PREMIUM_URL = "https://supportrd.com/products/hair-advisor-premium";
  const PRO_URL = "https://supportrd.com/products/professional-hair-advisor";

  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function parseJson(value, fallback = {}) {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  function routeTag() {
    let tag = localStorage.getItem("supportrdRouteTag");
    if (!tag) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      tag = "^^ " + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      localStorage.setItem("supportrdRouteTag", tag);
    }
    return tag;
  }

  function queryProfile() {
    const url = new URL(window.location.href);
    const email = (
      url.searchParams.get("email") ||
      url.searchParams.get("account") ||
      url.searchParams.get("login_hint") ||
      ""
    ).trim();
    const name = (
      url.searchParams.get("name") ||
      url.searchParams.get("nickname") ||
      ""
    ).trim();
    const loggedIn =
      url.searchParams.get("logged_in") === "true" ||
      url.searchParams.get("login") === "success";

    return { email, name, loggedIn };
  }

  function getProfile() {
    const saved = parseJson(localStorage.getItem("accountProfile") || "{}", {});
    const social = parseJson(localStorage.getItem("socialLinks") || "{}", {});
    const account = parseJson(localStorage.getItem("sr_rebuild_state_v1") || "{}", {});
    const qp = queryProfile();

    const email =
      qp.email ||
      saved.email ||
      social.email ||
      (account.account && account.account.email) ||
      "";

    const name =
      qp.name ||
      saved.name ||
      social.name ||
      (account.account && account.account.displayName) ||
      email ||
      "Logged In";

    const loggedIn =
      qp.loggedIn ||
      localStorage.getItem("loggedIn") === "true" ||
      !!saved.loggedIn ||
      !!(account.account && account.account.loggedIn) ||
      !!email;

    const profile = {
      loggedIn,
      email: email.trim(),
      name: name.trim(),
      tag: routeTag()
    };

    if (profile.loggedIn) {
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("accountProfile", JSON.stringify(profile));
    }

    return profile;
  }

  function supportAuthUrl(kind, provider, hint) {
    const url = new URL(kind === "signup" ? REGISTER_URL : LOGIN_URL);
    if (provider) url.searchParams.set("provider", provider);
    if (hint) url.searchParams.set("login_hint", hint);
    if (kind === "forgot") url.searchParams.set("mode", "forgot");
    return url.toString();
  }

  function looksLikeLoginTarget(href) {
    return /^\/login(\?|$)/.test(href) || href.includes("/account/login");
  }

  function looksLikeSignupTarget(href) {
    return /^\/login\?mode=signup/.test(href) || href.includes("/account/register");
  }

  function looksLikeForgotTarget(href) {
    return /^\/login\?mode=forgot/.test(href);
  }

  function looksLikeLogoutTarget(href) {
    return href === "/logout" || href.includes("/account/logout");
  }

  function rewriteHref(el) {
    if (!el || !el.getAttribute) return;
    const href = el.getAttribute("href");
    if (!href) return;

    if (looksLikeSignupTarget(href)) {
      const provider = new URL(href, window.location.origin).searchParams.get("provider") || "";
      el.setAttribute("href", supportAuthUrl("signup", provider));
      return;
    }

    if (looksLikeForgotTarget(href)) {
      el.setAttribute("href", supportAuthUrl("forgot"));
      return;
    }

    if (looksLikeLoginTarget(href)) {
      const provider = new URL(href, window.location.origin).searchParams.get("provider") || "";
      el.setAttribute("href", supportAuthUrl("login", provider));
      return;
    }

    if (looksLikeLogoutTarget(href)) {
      el.setAttribute("href", LOGOUT_URL);
    }
  }

  function rewriteAllHrefs() {
    qsa("a[href]").forEach(rewriteHref);
  }

  function redirectAuth(kind, provider) {
    const profile = getProfile();
    const hint = profile.email || "";
    let target = LOGIN_URL;

    if (kind === "signup") target = supportAuthUrl("signup", provider, hint);
    else if (kind === "forgot") target = supportAuthUrl("forgot", provider, hint);
    else if (kind === "logout") target = LOGOUT_URL;
    else target = supportAuthUrl("login", provider, hint);

    window.location.href = target;
  }

  function classifyAction(el) {
    if (!el) return null;

    const id = (el.id || "").toLowerCase();
    const href = (el.getAttribute && (el.getAttribute("href") || "")) || "";
    const text = (el.textContent || "").trim().toLowerCase();
    const action = (el.dataset && (el.dataset.launch || el.dataset.action || "")) || "";

    const provider =
      href.includes("google-oauth2") || id.includes("google") ? "google-oauth2" :
      href.includes("windowslive") || id.includes("microsoft") ? "windowslive" :
      href.includes("yahoo") || id.includes("yahoo") ? "yahoo" :
      href.includes("provider=sms") || id.includes("phone") ? "sms" :
      "";

    if (
      id === "logoutbtn" ||
      text === "log out" ||
      looksLikeLogoutTarget(href)
    ) return { kind: "logout", provider };

    if (
      id === "signuptop" ||
      id === "signupbtn" ||
      action === "signup" ||
      text.includes("create account") ||
      text.includes("sign up") ||
      text.includes("signup") ||
      looksLikeSignupTarget(href)
    ) return { kind: "signup", provider };

    if (
      text.includes("forgot") ||
      looksLikeForgotTarget(href)
    ) return { kind: "forgot", provider };

    if (
      id === "loginbtn" ||
      id === "logingoogle" ||
      id === "loginmicrosoft" ||
      id === "loginphone" ||
      id === "loginyahoo" ||
      id === "loginother" ||
      action === "login" ||
      text.includes("log in") ||
      text.includes("login") ||
      text.includes("sign in") ||
      looksLikeLoginTarget(href)
    ) return { kind: "login", provider };

    return null;
  }

  function captureClicks() {
    document.addEventListener(
      "click",
      (event) => {
        const el = event.target && event.target.closest
          ? event.target.closest("a,button,[role='button']")
          : null;
        const action = classifyAction(el);
        if (!action) return;

        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();

        if (action.kind === "logout") {
          localStorage.removeItem("loggedIn");
          localStorage.removeItem("accountProfile");
        }

        redirectAuth(action.kind, action.provider);
      },
      true
    );
  }

  function captureForms() {
    document.addEventListener(
      "submit",
      (event) => {
        const form = event.target;
        if (!form || !form.getAttribute) return;
        const action = form.getAttribute("action") || "";
        if (!looksLikeLoginTarget(action) && !looksLikeSignupTarget(action)) return;

        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();

        const provider = new URL(action, window.location.origin).searchParams.get("provider") || "";
        redirectAuth(looksLikeSignupTarget(action) ? "signup" : "login", provider);
      },
      true
    );
  }

  function ensurePlansAfter(anchorEl) {
    if (!anchorEl) return null;

    let wrap = qs("#accountPlans");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "accountPlans";
      wrap.style.display = "inline-flex";
      wrap.style.flexWrap = "wrap";
      wrap.style.gap = "8px";
      wrap.style.marginLeft = "10px";
      wrap.innerHTML = `
        <a href="${PREMIUM_URL}" target="_blank" rel="noopener"
           style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.2);text-decoration:none;color:inherit;">
           Premium
        </a>
        <a href="${PRO_URL}" target="_blank" rel="noopener"
           style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.2);text-decoration:none;color:inherit;">
           Pro
        </a>
      `;
      anchorEl.insertAdjacentElement("afterend", wrap);
    }
    return wrap;
  }

  function paintLoggedInUi() {
    const profile = getProfile();
    if (!profile.loggedIn) return;

    const routeText = profile.email || profile.name || "Logged In";
    const tag = profile.tag;

    const loginBtn = qs("#loginBtn");
    const signupTop = qs("#signupTop");
    const logoutBtn = qs("#logoutBtn");
    const badge = qs("#userBadge");
    const systemSubs = qsa(".system-sub");

    if (loginBtn) loginBtn.style.display = "none";
    if (signupTop) signupTop.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";

    if (badge) {
      badge.style.display = "inline-flex";
      badge.textContent = `Logged In ${tag}`;
      badge.title = routeText;
      ensurePlansAfter(badge);
    }

    if (systemSubs.length) {
      const topSub = systemSubs.find((el) =>
        (el.textContent || "").includes("Optional account access while Remote keeps running in the background.")
      ) || systemSubs[0];

      if (topSub) {
        topSub.textContent = `${routeText} ${tag} · Premium / Pro available`;
      }
    }

    qsa("strong,div,p,span,h1,h2,h3").forEach((el) => {
      const text = (el.textContent || "").trim();
      if (text === "Guest" || text === "Guest Route" || text === "guest route") {
        el.textContent = routeText;
      }
    });

    const routeLane = qsa("div,p,span").find((el) => {
      const text = (el.textContent || "").toLowerCase();
      return text.includes("guest support") || text.includes("guest route");
    });
    if (routeLane) {
      routeLane.textContent = `${routeText} ${tag} · Premium / Pro links ready`;
    }

    document.body.classList.add("account-authenticated");
  }

  function bootRedirects() {
    const path = window.location.pathname;
    if (path === "/login" || path === "/logout") {
      const target =
        path === "/logout"
          ? `${LOGOUT_URL}${window.location.search || ""}`
          : `${LOGIN_URL}${window.location.search || ""}`;
      window.location.replace(target);
    }
  }

  function sync() {
    rewriteAllHrefs();
    paintLoggedInUi();
  }

  bootRedirects();
  captureClicks();
  captureForms();

  document.addEventListener("DOMContentLoaded", sync);
  window.addEventListener("load", sync);

  const observer = new MutationObserver(sync);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });

  setInterval(sync, 1200);

  window.login = function () {
    redirectAuth("login");
  };
})();
