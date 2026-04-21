(async function () {
  const shell = document.getElementById("supportrd-app-shell");
  const isProductPage = /\/products\/[^/?#]+/.test(window.location.pathname);
  const root = (shell && shell.dataset.root) || "/apps/supportrd";
  const modal = document.getElementById("supportrd-modal");
  const panelBody = document.getElementById("supportrd-panel-body");
  const closeBtn = document.getElementById("supportrd-close");
  const productHandleMap = {
    "aria-professional-making-money-tier-professional-account": {
      title: "ARIA Professional",
      plan: "Professional account lane with SupportRD login and full app access."
    },
    "aria-ai-voice-inner-circle-tier-premium-account": {
      title: "ARIA Premium",
      plan: "Premium account lane with SupportRD login and full app access."
    },
    "jake-in-the-studio-studio-tier-professional-studio-account": {
      title: "Jake In The Studio",
      plan: "Studio account lane with SupportRD login and full app access."
    }
  };

  async function fetchHtml(path) {
    const res = await fetch(`${root}${path}`, { credentials: "same-origin" });
    if (!res.ok) {
      throw new Error(`SupportRD proxy failed: ${res.status}`);
    }
    return res.text();
  }

  async function loadIntoShell(path) {
    if (!shell) return;
    shell.innerHTML = '<div class="supportrd-loading">Loading SupportRD...</div>';
    try {
      shell.innerHTML = await fetchHtml(path || "");
      wireInternalLinks(shell);
    } catch (error) {
      shell.innerHTML = `<div class="supportrd-loading">${error.message}</div>`;
    }
  }

  async function openPanel(path) {
    if (!modal || !panelBody) return;
    panelBody.innerHTML = '<div class="supportrd-loading">Loading panel...</div>';
    modal.hidden = false;
    try {
      panelBody.innerHTML = await fetchHtml(path);
      wireInternalLinks(panelBody);
    } catch (error) {
      panelBody.innerHTML = `<div class="supportrd-loading">${error.message}</div>`;
    }
  }

  function handleOpen(el, event) {
    event.preventDefault();
    const path = el.getAttribute("data-srd-open");
    if (path) openPanel(path);
  }

  function handleRoute(el, event) {
    event.preventDefault();
    const path = el.getAttribute("data-srd-route");
    if (path) loadIntoShell(path);
  }

  function wireInternalLinks(scope) {
    scope.querySelectorAll("[data-srd-open]").forEach((el) => {
      el.addEventListener("click", (event) => handleOpen(el, event));
    });

    scope.querySelectorAll("[data-srd-route]").forEach((el) => {
      el.addEventListener("click", (event) => handleRoute(el, event));
    });
  }

  async function mountProductBridge() {
    const match = window.location.pathname.match(/\/products\/([^/?#]+)/);
    if (!match) return;
    const productMeta = productHandleMap[match[1]];
    if (!productMeta) return;
    if (document.getElementById("supportrd-product-bridge")) return;

    const host = document.querySelector("product-info, .product, .product__info-wrapper, main");
    if (!host) return;

    const bridge = document.createElement("section");
    bridge.id = "supportrd-product-bridge";
    bridge.className = "supportrd-product-bridge";
    bridge.innerHTML = [
      '<div class="supportrd-product-bridge__header">',
      '<div class="supportrd-product-bridge__eyebrow">SupportRD Account Lane</div>',
      `<h2>${productMeta.title}</h2>`,
      `<p>${productMeta.plan}</p>`,
      "</div>",
      '<div class="supportrd-product-bridge__actions">',
      '<a class="supportrd-inline-btn primary" href="https://supportrd.com/login">Login / Confirm Account</a>',
      '<a class="supportrd-inline-btn" href="/apps/supportrd">Open Full SupportRD App</a>',
      "</div>",
      '<div class="supportrd-product-bridge__panel"><p>Already bought this package? Log in first, then open the full SupportRD app to see your confirmed lane.</p></div>'
    ].join("");

    host.prepend(bridge);
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.hidden = true;
      if (panelBody) panelBody.innerHTML = "";
    });
  }

  if (shell && isProductPage) {
    shell.innerHTML = "";
    shell.style.display = "none";
  }

  if (shell && !isProductPage) {
    loadIntoShell("");
  }
  mountProductBridge();
})();
