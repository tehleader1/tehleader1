(async function () {
  const shell = document.getElementById("supportrd-app-shell");
  if (!shell) return;

  const root = shell.dataset.root || "/apps/supportrd";
  const modal = document.getElementById("supportrd-modal");
  const panelBody = document.getElementById("supportrd-panel-body");
  const closeBtn = document.getElementById("supportrd-close");

  async function fetchHtml(path) {
    const res = await fetch(`${root}${path}`, { credentials: "same-origin" });
    if (!res.ok) {
      throw new Error(`SupportRD proxy failed: ${res.status}`);
    }
    return res.text();
  }

  async function loadIntoShell(path) {
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

  if (closeBtn && modal) {
    closeBtn.addEventListener("click", () => {
      modal.hidden = true;
      if (panelBody) panelBody.innerHTML = "";
    });
  }

  loadIntoShell("");
})();
