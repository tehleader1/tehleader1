(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const SHELL_KEY = 'sr_shell_router_v1';

  const DEFAULTS = {
    activeSurface: '',
    previousSurface: '',
    routeHistory: [],
    overlays: {
      remote: false,
      studio: false,
      diary: false,
      fastPay: false,
      mapDock: true,
      rankBoard: true,
      adminPanel: true,
      surfaceDock: true
    },
    ui: {
      shellMinHeight: 640,
      handoffMinHeight: 320,
      lastAction: ''
    }
  };

  const SURFACE_OVERLAY_RULES = {
    studio: {
      remote: false,
      studio: true,
      diary: false,
      fastPay: false,
      mapDock: true,
      rankBoard: true,
      adminPanel: false,
      surfaceDock: true
    },
    diary: {
      remote: true,
      studio: false,
      diary: true,
      fastPay: false,
      mapDock: true,
      rankBoard: true,
      adminPanel: true,
      surfaceDock: true
    },
    payments: {
      remote: true,
      studio: false,
      diary: false,
      fastPay: true,
      mapDock: false,
      rankBoard: true,
      adminPanel: false,
      surfaceDock: false
    },
    profile: {
      remote: true,
      studio: false,
      diary: false,
      fastPay: false,
      mapDock: true,
      rankBoard: true,
      adminPanel: true,
      surfaceDock: true
    },
    faq: {
      remote: true,
      studio: false,
      diary: false,
      fastPay: false,
      mapDock: true,
      rankBoard: true,
      adminPanel: true,
      surfaceDock: true
    },
    map: {
      remote: false,
      studio: false,
      diary: false,
      fastPay: false,
      mapDock: true,
      rankBoard: true,
      adminPanel: true,
      surfaceDock: true
    },
    idle: DEFAULTS.overlays
  };

  const store = root.createStore ? root.createStore(SHELL_KEY, DEFAULTS) : null;

  function getShellState(){
    return store ? store.getState() : DEFAULTS;
  }

  function patchShellState(patch){
    const next = store ? store.patch(patch || {}) : patch || {};
    try {
      root.patchAppStateSection?.('shell', {
        activeSurface: next.activeSurface || '',
        previousSurface: next.previousSurface || '',
        routeHistory: next.routeHistory || [],
        overlays: next.overlays || {},
        ui: next.ui || {}
      });
    } catch (error) {}
    return next;
  }

  function reserveShellLayout(){
    const nodes = [
      document.querySelector('#launchMenu'),
      document.querySelector('#floatModeShell'),
      document.querySelector('#remoteSheet'),
      document.querySelector('#studioModeShell'),
      document.querySelector('#remoteFastPayModal')
    ].filter(Boolean);
    nodes.forEach((node)=>{
      node.dataset.srShellReserved = 'true';
      node.style.minHeight = node.style.minHeight || (node.id === 'studioModeShell' ? '640px' : '320px');
      node.style.contain = node.style.contain || 'layout paint';
    });
  }

  function applyOverlayRules(surface){
    const key = surface || 'idle';
    const rules = SURFACE_OVERLAY_RULES[key] || SURFACE_OVERLAY_RULES.idle;
    document.documentElement.dataset.srRouteSurface = key;
    const dockMap = [
      ['#srMapControlDock', 'mapDock'],
      ['#srRankBoard', 'rankBoard'],
      ['#srAdminSeriousnessPanel', 'adminPanel'],
      ['#srSurfaceEffectDock', 'surfaceDock'],
      ['#remoteFastPayModal', 'fastPay'],
      ['#studioModeShell', 'studio'],
      ['#remoteSheet', 'remote']
    ];
    dockMap.forEach(([selector, ruleKey])=>{
      const el = document.querySelector(selector);
      if (!el) return;
      el.dataset.srShellOverlay = ruleKey;
      el.dataset.srShellAllowed = rules[ruleKey] ? 'true' : 'false';
    });
    return rules;
  }

  function setShellSurface(surface, detail = {}){
    const current = getShellState();
    const nextSurface = surface || 'idle';
    const overlays = applyOverlayRules(nextSurface);
    reserveShellLayout();
    const entry = {
      surface: nextSurface,
      previous: current.activeSurface || '',
      at: new Date().toISOString(),
      source: detail.source || 'shell-router'
    };
    const next = patchShellState({
      activeSurface: nextSurface,
      previousSurface: current.activeSurface || '',
      routeHistory: [entry, ...((current.routeHistory) || [])].slice(0, 80),
      overlays,
      ui: { ...(current.ui || {}), lastAction:'surface-change' }
    });
    try { window.dispatchEvent(new CustomEvent('supportrd-shell-surface-change', { detail:{ state:next, entry } })); } catch (error) {}
    return next;
  }

  function inferSurfaceFromDocument(){
    if (document.body.classList.contains('studio-mode-open')) return 'studio';
    if (document.body.classList.contains('diary-viewer-open')) return 'diary';
    if (document.body.classList.contains('remote-fastpay-active')) return 'payments';
    const activeRoute = document.documentElement.dataset.srActiveSurface || '';
    return activeRoute || 'idle';
  }

  function syncShellFromRuntime(source){
    const surface = inferSurfaceFromDocument();
    return setShellSurface(surface, { source: source || 'runtime-sync' });
  }

  function renderShellStatusPanel(container){
    if (!container) return false;
    const state = getShellState();
    container.dataset.srShellStatusPanel = 'true';
    container.style.minHeight = container.style.minHeight || '14rem';
    container.style.contain = container.style.contain || 'layout paint';
    const overlays = state.overlays || {};
    container.innerHTML = `
      <div class="sr-shell-status__header">
        <span>Shell Router</span>
        <strong>${state.activeSurface || 'idle'}</strong>
        <p>Previous: ${state.previousSurface || 'none'}</p>
      </div>
      <div class="sr-shell-status__grid">
        ${Object.entries(overlays).map(([key, value])=>`<article><span>${key}</span><strong>${value ? 'allowed' : 'quiet'}</strong></article>`).join('')}
      </div>
    `;
    return true;
  }

  function initShellRouter(){
    reserveShellLayout();
    const state = syncShellFromRuntime('init');
    renderShellStatusPanel(document.querySelector('#srShellStatusPanel'));
    return state;
  }

  root.shellOverlayRules = SURFACE_OVERLAY_RULES;
  root.getShellState = getShellState;
  root.patchShellState = patchShellState;
  root.reserveShellLayout = reserveShellLayout;
  root.applyOverlayRules = applyOverlayRules;
  root.setShellSurface = setShellSurface;
  root.syncShellFromRuntime = syncShellFromRuntime;
  root.renderShellStatusPanel = renderShellStatusPanel;
  root.initShellRouter = initShellRouter;
})();