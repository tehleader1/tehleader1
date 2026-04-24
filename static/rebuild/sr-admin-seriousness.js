(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const ADMIN_KEY = 'sr_admin_seriousness_v1';

  const DEFAULTS = {
    ratings: {
      diary: [],
      studio: [],
      profile: [],
      faq: [],
      payments: [],
      mapChange: [],
      makingMoney: [],
      professional: []
    },
    optionHistory: [],
    shopifyLens: {
      LCP: { score: 0, status: 'watch', notes: [] },
      INP: { score: 0, status: 'watch', notes: [] },
      CLS: { score: 0, status: 'weak-area', notes: ['CLS/layout stability is the current pressure point.'] }
    },
    seriousness: {
      adminScore: 0,
      topConcern: 'CLS',
      lastReviewedAt: ''
    },
    ui: {
      panelMinHeight: 420,
      lastAction: ''
    }
  };

  const store = root.createStore ? root.createStore(ADMIN_KEY, DEFAULTS) : null;

  function getAdminSeriousnessState(){
    return store ? store.getState() : DEFAULTS;
  }

  function patchAdminSeriousnessState(patch){
    const next = store ? store.patch(patch || {}) : patch || {};
    try {
      root.patchAppStateSection?.('adminSeriousness', {
        ratings: next.ratings || {},
        optionHistory: next.optionHistory || [],
        shopifyLens: next.shopifyLens || {},
        seriousness: next.seriousness || {},
        ui: next.ui || {}
      });
    } catch (error) {}
    return next;
  }

  function calculateAdminScore(ratings){
    const all = Object.values(ratings || {}).flat();
    if (!all.length) return 0;
    const total = all.reduce((sum, item)=>sum + Number(item.rating || 0), 0);
    return Math.round((total / (all.length * 5)) * 100);
  }

  function rateSeriousness(surface, rating, note){
    const current = getAdminSeriousnessState();
    const key = surface || 'professional';
    const record = {
      surface: key,
      rating: Math.max(0, Math.min(5, Number(rating || 0))),
      note: note || '',
      at: new Date().toISOString()
    };
    const ratings = { ...(current.ratings || {}) };
    ratings[key] = [record, ...((ratings[key]) || [])].slice(0, 50);
    const adminScore = calculateAdminScore(ratings);
    const next = patchAdminSeriousnessState({
      ratings,
      seriousness: {
        ...(current.seriousness || {}),
        adminScore,
        lastReviewedAt: record.at
      },
      ui: { ...(current.ui || {}), lastAction:'rating-added' }
    });
    try { root.rateAccountOption?.(key, record.rating, record.note); } catch (error) {}
    try { root.updateRankBoard?.(); } catch (error) {}
    renderAdminSeriousnessPanel();
    return next;
  }

  function recordAccountOptionChange(option, value, source){
    const current = getAdminSeriousnessState();
    const record = {
      option,
      value,
      source: source || 'account-option',
      at: new Date().toISOString()
    };
    return patchAdminSeriousnessState({
      optionHistory: [record, ...((current.optionHistory) || [])].slice(0, 100),
      ui: { ...(current.ui || {}), lastAction:'option-change' }
    });
  }

  function updateShopifyLens(metric, payload = {}){
    const current = getAdminSeriousnessState();
    const lens = { ...(current.shopifyLens || {}) };
    const key = metric || 'CLS';
    const existing = lens[key] || { score:0, status:'watch', notes:[] };
    lens[key] = {
      ...existing,
      score: Number(payload.score ?? existing.score ?? 0),
      status: payload.status || existing.status || 'watch',
      notes: [payload.note || '', ...((existing.notes) || [])].filter(Boolean).slice(0, 12),
      updatedAt: new Date().toISOString()
    };
    return patchAdminSeriousnessState({
      shopifyLens: lens,
      seriousness: {
        ...(current.seriousness || {}),
        topConcern: lens.CLS?.status === 'weak-area' ? 'CLS' : current.seriousness?.topConcern || 'CLS'
      },
      ui: { ...(current.ui || {}), lastAction:'shopify-lens' }
    });
  }

  function deriveShopifyLensFromRebuild(){
    const map = root.getMapState?.() || {};
    const perks = root.getPerksState?.() || {};
    const rank = root.getRankState?.() || {};
    const clsScore = Math.min(100, 35 + ((perks.history || []).length * 3) + (map.activeMap ? 12 : 0));
    const inpScore = Math.min(100, 50 + ((rank.contacts || []).length * 5));
    const lcpScore = 65;
    updateShopifyLens('CLS', {
      score: clsScore,
      status: clsScore >= 75 ? 'improving' : 'weak-area',
      note: 'CLS improves when map/perk/rank panels reserve space and users avoid stacked late UI.'
    });
    updateShopifyLens('INP', {
      score: inpScore,
      status: inpScore >= 75 ? 'healthy' : 'watch',
      note: 'INP is affected by whether perk/rank actions stay lightweight.'
    });
    updateShopifyLens('LCP', {
      score: lcpScore,
      status: 'watch',
      note: 'LCP stays protected because map backgrounds are CSS/metadata until final assets are chosen.'
    });
    return getAdminSeriousnessState();
  }

  function renderAdminSeriousnessPanel(container){
    const target = container || document.querySelector('#srAdminSeriousnessPanel');
    if (!target) return false;
    const state = getAdminSeriousnessState();
    target.dataset.srAdminSeriousnessPanel = 'true';
    target.style.minHeight = target.style.minHeight || `${Number(state.ui?.panelMinHeight || 420)}px`;
    target.style.contain = target.style.contain || 'layout paint';
    const lens = state.shopifyLens || {};
    const ratings = state.ratings || {};
    const latestRatings = Object.values(ratings).flat().slice(0, 6);
    target.innerHTML = `
      <div class="sr-admin-panel__header">
        <span>Admin Seriousness</span>
        <strong>Who is taking the program serious?</strong>
        <p>Admin Score: ${Number(state.seriousness?.adminScore || 0)} · Top Shopify concern: ${state.seriousness?.topConcern || 'CLS'}</p>
      </div>
      <div class="sr-admin-rating-controls">
        <select data-sr-admin-rate-surface>
          <option value="diary">Diary</option>
          <option value="studio">Studio</option>
          <option value="profile">Profile</option>
          <option value="faq">FAQ Lounge</option>
          <option value="payments">Payments</option>
          <option value="mapChange">Map Change</option>
          <option value="makingMoney">Making Money</option>
          <option value="professional">Professional</option>
        </select>
        <select data-sr-admin-rate-value>
          <option value="5">5 - Serious</option>
          <option value="4">4 - Strong</option>
          <option value="3">3 - Watch</option>
          <option value="2">2 - Weak</option>
          <option value="1">1 - Not serious</option>
        </select>
        <input data-sr-admin-rate-note placeholder="Admin note">
        <button class="btn" type="button" data-sr-admin-rate-submit>Rate Seriousness</button>
      </div>
      <div class="sr-shopify-lens-grid">
        ${['LCP','INP','CLS'].map((key)=>`
          <article>
            <span>${key}</span>
            <strong>${Number(lens[key]?.score || 0)}</strong>
            <p>${lens[key]?.status || 'watch'}</p>
            <small>${(lens[key]?.notes || [])[0] || 'Waiting for signal.'}</small>
          </article>
        `).join('')}
      </div>
      <div class="sr-admin-history">
        <h4>Latest Admin Ratings</h4>
        ${latestRatings.length ? latestRatings.map((item)=>`<div><strong>${item.surface}: ${item.rating}/5</strong><span>${item.note || 'No note'} · ${item.at}</span></div>`).join('') : '<div><strong>No ratings yet</strong><span>Rate a surface to start tracking serious users.</span></div>'}
      </div>
      <div class="sr-admin-history">
        <h4>Account Option History</h4>
        ${(state.optionHistory || []).slice(0, 5).map((item)=>`<div><strong>${item.option}</strong><span>${item.value} · ${item.source} · ${item.at}</span></div>`).join('') || '<div><strong>No account option history yet</strong><span>Map/perk/account changes will appear here.</span></div>'}
      </div>
    `;
    if (!target.__srAdminPanelBound) {
      target.addEventListener('click', (event)=>{
        const btn = event.target.closest?.('[data-sr-admin-rate-submit]');
        if (!btn) return;
        const surface = target.querySelector('[data-sr-admin-rate-surface]')?.value || 'professional';
        const rating = target.querySelector('[data-sr-admin-rate-value]')?.value || '3';
        const note = target.querySelector('[data-sr-admin-rate-note]')?.value || '';
        rateSeriousness(surface, rating, note);
      });
      target.__srAdminPanelBound = true;
    }
    return true;
  }

  function initAdminSeriousness(){
    deriveShopifyLensFromRebuild();
    return renderAdminSeriousnessPanel();
  }

  root.getAdminSeriousnessState = getAdminSeriousnessState;
  root.patchAdminSeriousnessState = patchAdminSeriousnessState;
  root.rateSeriousness = rateSeriousness;
  root.recordAccountOptionChange = recordAccountOptionChange;
  root.updateShopifyLens = updateShopifyLens;
  root.deriveShopifyLensFromRebuild = deriveShopifyLensFromRebuild;
  root.renderAdminSeriousnessPanel = renderAdminSeriousnessPanel;
  root.initAdminSeriousness = initAdminSeriousness;
})();