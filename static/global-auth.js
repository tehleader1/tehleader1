(function () {
  function getProfile() {
    try {
      return JSON.parse(localStorage.getItem("accountProfile") || "{}");
    } catch {
      return {};
    }
  }

  function getTag() {
    let tag = localStorage.getItem("supportrdRouteTag");
    if (!tag) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      tag = "^^ " + Array.from({ length: 8 }, () =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join("");
      localStorage.setItem("supportrdRouteTag", tag);
    }
    return tag;
  }

  function injectHeaderBadge() {
    const profile = getProfile();
    if (!profile.loggedIn) return;

    let badge = document.getElementById("accountBadge");
    if (!badge) {
      badge = document.createElement("div");
      badge.id = "accountBadge";
      badge.style.position = "fixed";
      badge.style.top = "16px";
      badge.style.right = "16px";
      badge.style.zIndex = "9999";
      badge.style.background = "rgba(0,0,0,.7)";
      badge.style.border = "1px solid rgba(255,255,255,.2)";
      badge.style.borderRadius = "14px";
      badge.style.padding = "10px 14px";
      badge.style.fontSize = "12px";
      badge.style.color = "#fff";
      badge.style.backdropFilter = "blur(10px)";
      document.body.appendChild(badge);
    }

    badge.innerHTML = `
      <div><strong>${getTag()}</strong></div>
      <div>${profile.email || profile.name || "account"}</div>
      <div style="opacity:.7">Premium / Pro</div>
    `;
  }

  function makeRouteClickable() {
    document.querySelectorAll("#signedInRouteText").forEach(el => {
      el.style.cursor = "pointer";
      el.title = "Click to copy session link";

      el.onclick = () => {
        navigator.clipboard.writeText(window.location.href);
        el.innerText = "Copied session link ✓";
      };
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    injectHeaderBadge();
    makeRouteClickable();
  });
})();
