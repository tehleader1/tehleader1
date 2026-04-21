(async function () {
  const shell = document.getElementById("supportrd-app-shell");
  const root = (shell && shell.dataset.root) || "/apps/supportrd";
  const modal = document.getElementById("supportrd-modal");
  const panelBody = document.getElementById("supportrd-panel-body");
  const closeBtn = document.getElementById("supportrd-close");
  const productHandleMap = {
    "aria-professional-making-money-tier-professional-account": "/product/pro",
    "aria-ai-voice-inner-circle-tier-premium-account": "/product/premium",
    "jake-in-the-studio-studio-tier-professional-studio-account": "/product/studio-jake"
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
    const proxyPath = productHandleMap[match[1]];
    if (!proxyPath) return;
    if (document.getElementById("supportrd-product-bridge")) return;

    const host = document.querySelector("product-info, .product, .product__info-wrapper, main");
    if (!host) return;

    const bridge = document.createElement("section");
    bridge.id = "supportrd-product-bridge";
    bridge.className = "supportrd-product-bridge";
    bridge.innerHTML = [
      '<div class="supportrd-product-bridge__header">',
      '<div class="supportrd-product-bridge__eyebrow">SupportRD Account Lane</div>',
      "<h2>SupportRD internal product access</h2>",
      "<p>Keep the Shopify product public while giving people a clear login and SupportRD app lane.</p>",
      "</div>",
      '<div class="supportrd-product-bridge__actions">',
      '<a class="supportrd-inline-btn primary" href="https://supportrd.com/login">Login / Confirm Account</a>',
      `<button class="supportrd-inline-btn" type="button" data-srd-open="${proxyPath}">Open SupportRD Product Panel</button>`,
      '<a class="supportrd-inline-btn" href="/apps/supportrd">Open Full SupportRD App</a>',
      "</div>",
      '<div class="supportrd-product-bridge__panel"><div class="supportrd-loading">Loading SupportRD product lane...</div></div>'
    ].join("");

    host.prepend(bridge);
    wireInternalLinks(bridge);

    try {
      const html = await fetchHtml(proxyPath);
      const panel = bridge.querySelector(".supportrd-product-bridge__panel");
      if (panel) {
        panel.innerHTML = html;
        wireInternalLinks(panel);
      }
    } catch (error) {
      const panel = bridge.querySelector(".supportrd-product-bridge__panel");
      if (panel) {
        panel.innerHTML = `<div class="supportrd-loading">${error.message}</div>`;
      }
    }
  }

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.hidden = true;
      if (panelBody) panelBody.innerHTML = "";
    });
  }

  if (shell) {
    loadIntoShell("");
  }
  mountProductBridge();
})();
