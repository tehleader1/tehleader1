(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const INTEGRATION_KEY = 'sr_deploy_integration_v1';

  const DEFAULTS = {
    ready: false,
    lastAuditAt: '',
    systems: {
      appState: 'watch',
      mapSystem: 'watch',
      perks: 'watch',
      shell: 'watch',
      marketReader: 'watch',
      admin: 'watch',
      rank: 'watch'
    },
    issues: [],
    deployment: {
      staticReady: true,
      heavyAssetsDeferred: true,
      needsLiveApiVerification: true,
      recommendedEntry: '/static/index.html'
    },
    ui: {
      panelMinHeight: 320,
      lastAction: ''
    }
  };

  const store = root.createStore ? root.createStore(INTEGRATION_KEY, DEFAULTS) : null;

  function getDeployIntegrationState(){
    return store ? store.getState() : DEFAULTS;
  }

  function patchDeployIntegrationState(patch){
    const next = store ? store.patch(patch || {}) : patch || {};
    try {
      root.patchAppStateSection?.('deployIntegration', {
        ready: next.ready,
        lastAuditAt: next.lastAuditAt,
        systems: next.systems || {},
        issues: next.issues || [],
        deployment: next.deployment || {},
        ui: next.ui || {}
      });
    } catch (error) {}
    return next;
  }

  function auditDeploySystems(){
    const checks = {
      appState: !!root.getAppState || !!root.patchAppStateSection,
      mapSystem: !!root.getMapState && !!root.setActiveMap,
      perks: !!root.getPerksState && !!root.activatePerk,
      shell: !!root.getShellState && !!root.setShellSurface,
      marketReader: !!root.getMarketReaderState && !!root.startMarketLaser,
      admin: !!root.getAdminSeriousnessState && !!root.renderAdminSeriousnessPanel,
      rank: !!root.getRankState && !!root.renderRankBoard
    };
    const systems = Object.fromEntries(Object.entries(checks).map(([key, ok])=>[key, ok ? 'ready' : 'missing']));
    const issues = Object.entries(systems)
      .filter(([, status])=>status !== 'ready')
      .map(([key])=>`${key} is not available on window.SupportRDRebuild`);
    const ready = issues.length === 0;
    return patchDeployIntegrationState({
      ready,
      lastAuditAt: new Date().toISOString(),
      systems,
      issues,
      deployment: {
        ...getDeployIntegrationState().deployment,
        staticReady: true,
        heavyAssetsDeferred: true,
        needsLiveApiVerification: true,
        recommendedEntry: '/static/index.html'
      },
      ui: { ...getDeployIntegrationState().ui, lastAction:'audit' }
    });
  }

  function syncDeployVisuals(){
    try { root.initMapSystem?.(); } catch (error) {}
    try { root.initPerksEngine?.(); } catch (error) {}
    try { root.initRankSystem?.(); } catch (error) {}
    try { root.initAdminSeriousness?.(); } catch (error) {}
    try { root.initShellRouter?.(); } catch (error) {}
    try { root.initMarketReader?.(); } catch (error) {}
    try { root.renderMapSelector?.(document.querySelector('#srMapSelector')); } catch (error) {}
    try { root.renderActiveMapHero?.(document.querySelector('#srActiveMapHero')); } catch (error) {}
    try { root.renderPerkPanel?.(document.querySelector('#srPerkPanel')); } catch (error) {}
    try { root.renderAccountSeriousnessPanel?.(document.querySelector('#srAccountSeriousnessPanel')); } catch (error) {}
    try { root.renderRankBoard?.(document.querySelector('#srRankBoard')); } catch (error) {}
    try { root.renderAdminSeriousnessPanel?.(document.querySelector('#srAdminSeriousnessPanel')); } catch (error) {}
    try { root.renderShellStatusPanel?.(document.querySelector('#srShellStatusPanel')); } catch (error) {}
    try { root.renderMarketReaderPanel?.(document.querySelector('#srMarketReaderPanel')); } catch (error) {}
    try { root.applyMapSurfaceEffects?.(); } catch (error) {}
  }

  function renderDeployReadinessPanel(container){
    const target = container || document.querySelector('#srDeployReadinessPanel');
    if (!target) return false;
    const state = getDeployIntegrationState();
    target.dataset.srDeployReadinessPanel = 'true';
    target.style.minHeight = target.style.minHeight || `${Number(state.ui?.panelMinHeight || 320)}px`;
    target.style.contain = target.style.contain || 'layout paint';
    target.innerHTML = `
      <div class="sr-deploy-ready__header">
        <span>Deploy Readiness</span>
        <strong>${state.ready ? 'Ready for static deploy test' : 'Ready with checks'}</strong>
        <p>Last audit: ${state.lastAuditAt || 'not yet audited'}</p>
      </div>
      <div class="sr-deploy-ready__grid">
        ${Object.entries(state.systems || {}).map(([key, value])=>`
          <article><span>${key}</span><strong>${value}</strong></article>
        `).join('')}
      </div>
      <div class="sr-deploy-ready__notes">
        ${(state.issues || []).length ? (state.issues || []).map((issue)=>`<div>${issue}</div>`).join('') : '<div>Core rebuild systems are present. Live API endpoints still need deployment verification.</div>'}
      </div>
    `;
    return true;
  }

  function initDeployIntegration(){
    const state = auditDeploySystems();
    syncDeployVisuals();
    renderDeployReadinessPanel();
    return state;
  }

  root.getDeployIntegrationState = getDeployIntegrationState;
  root.patchDeployIntegrationState = patchDeployIntegrationState;
  root.auditDeploySystems = auditDeploySystems;
  root.syncDeployVisuals = syncDeployVisuals;
  root.renderDeployReadinessPanel = renderDeployReadinessPanel;
  root.initDeployIntegration = initDeployIntegration;
})();