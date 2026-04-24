(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const MARKET_KEY = 'sr_market_reader_v1';

  const DEFAULTS = {
    mode: 'idle',
    timing: {
      scanMs: 900,
      pulseMs: 4200,
      settleMs: 260
    },
    reader: {
      status: 'standing-by',
      clarity: 'waiting',
      lastPlan: '',
      lastPulseAt: '',
      confidence: 0,
      financeStatus: 'unknown',
      lines: []
    },
    laser: {
      active: false,
      phase: 'off',
      shell: 'clear',
      beamCount: 0,
      lastSweepAt: ''
    },
    signals: {
      shopify: {},
      seo: {},
      market: {},
      risk: 'watch'
    },
    ui: {
      panelMinHeight: 300,
      lastAction: ''
    }
  };

  const store = root.createStore ? root.createStore(MARKET_KEY, DEFAULTS) : null;

  function getMarketReaderState(){
    return store ? store.getState() : DEFAULTS;
  }

  function patchMarketReaderState(patch){
    const next = store ? store.patch(patch || {}) : patch || {};
    try {
      root.patchAppStateSection?.('marketReader', {
        mode: next.mode,
        timing: next.timing || {},
        reader: next.reader || {},
        laser: next.laser || {},
        signals: next.signals || {},
        ui: next.ui || {}
      });
    } catch (error) {}
    return next;
  }

  function normalizeLines(lines){
    return Array.isArray(lines) ? lines.filter(Boolean).slice(0, 12) : [];
  }

  function startMarketLaser(detail = {}){
    const current = getMarketReaderState();
    const next = patchMarketReaderState({
      mode: 'scanning',
      laser: {
        ...(current.laser || {}),
        active: true,
        phase: 'sweep',
        shell: 'reading',
        beamCount: Number(current.laser?.beamCount || 0) + 1,
        lastSweepAt: new Date().toISOString()
      },
      reader: {
        ...(current.reader || {}),
        status: 'scanning',
        clarity: detail.clarity || 'market reader is sweeping the workday pulse',
        lastPlan: detail.planLabel || current.reader?.lastPlan || ''
      },
      ui: { ...(current.ui || {}), lastAction:'laser-start' }
    });
    renderMarketReaderPanel();
    return next;
  }

  function settleMarketLaser(payload = {}){
    const current = getMarketReaderState();
    const lines = normalizeLines(payload.lines || current.reader?.lines || []);
    const confidence = Math.min(100, Math.max(0, Number(payload.confidence ?? (lines.length * 12))));
    const risk = confidence >= 70 ? 'clear' : confidence >= 40 ? 'watch' : 'low-signal';
    const next = patchMarketReaderState({
      mode: 'settled',
      reader: {
        ...(current.reader || {}),
        status: 'settled',
        clarity: payload.clarity || 'reader settled with visible market context',
        lastPulseAt: new Date().toISOString(),
        financeStatus: payload.financeStatus || current.reader?.financeStatus || 'unknown',
        confidence,
        lines
      },
      laser: {
        ...(current.laser || {}),
        active: false,
        phase: 'settled',
        shell: risk === 'clear' ? 'clear' : 'watch'
      },
      signals: {
        ...(current.signals || {}),
        shopify: payload.shopify || current.signals?.shopify || {},
        seo: payload.seo || current.signals?.seo || {},
        market: payload.market || current.signals?.market || {},
        risk
      },
      ui: { ...(current.ui || {}), lastAction:'laser-settled' }
    });
    try {
      root.updateShopifyLens?.('INP', {
        score: confidence >= 70 ? 78 : 62,
        status: confidence >= 70 ? 'healthy' : 'watch',
        note: 'Market reader settled without blocking the page interaction path.'
      });
    } catch (error) {}
    renderMarketReaderPanel();
    return next;
  }

  function failMarketLaser(message){
    const current = getMarketReaderState();
    const next = patchMarketReaderState({
      mode: 'fallback',
      reader: {
        ...(current.reader || {}),
        status: 'fallback',
        clarity: message || 'market reader is using fallback public pulse',
        lastPulseAt: new Date().toISOString(),
        confidence: 36
      },
      laser: {
        ...(current.laser || {}),
        active: false,
        phase: 'fallback',
        shell: 'watch'
      },
      signals: {
        ...(current.signals || {}),
        risk: 'watch'
      },
      ui: { ...(current.ui || {}), lastAction:'laser-fallback' }
    });
    renderMarketReaderPanel();
    return next;
  }

  function parsePulseText(text){
    const lines = String(text || '').split('\n').map((line)=>line.trim()).filter(Boolean);
    const finance = lines.find((line)=>/finance|balance|payout/i.test(line)) || '';
    const seo = lines.find((line)=>/seo|workday|rush|build/i.test(line)) || '';
    return {
      lines,
      financeStatus: finance ? 'visible' : 'public',
      shopify: { summary: finance },
      seo: { summary: seo },
      market: { lineCount: lines.length }
    };
  }

  function renderMarketReaderPanel(container){
    const target = container || document.querySelector('#srMarketReaderPanel');
    if (!target) return false;
    const state = getMarketReaderState();
    target.dataset.srMarketReaderPanel = 'true';
    target.dataset.srMarketReaderMode = state.mode || 'idle';
    target.style.minHeight = target.style.minHeight || `${Number(state.ui?.panelMinHeight || 300)}px`;
    target.style.contain = target.style.contain || 'layout paint';
    const lines = normalizeLines(state.reader?.lines);
    target.innerHTML = `
      <div class="sr-market-reader__header">
        <span>Market Reader / Laser</span>
        <strong>${state.reader?.status || 'standing-by'}</strong>
        <p>${state.reader?.clarity || 'Market reader is standing by.'}</p>
      </div>
      <div class="sr-market-reader__grid">
        <article><span>Laser</span><strong>${state.laser?.phase || 'off'}</strong><small>${state.laser?.shell || 'clear'} shell</small></article>
        <article><span>Confidence</span><strong>${Number(state.reader?.confidence || 0)}</strong><small>${state.signals?.risk || 'watch'}</small></article>
        <article><span>Finance</span><strong>${state.reader?.financeStatus || 'unknown'}</strong><small>${state.reader?.lastPulseAt || 'not scanned yet'}</small></article>
      </div>
      <div class="sr-market-reader__lines">
        ${lines.length ? lines.map((line)=>`<div>${line}</div>`).join('') : '<div>Refresh market pulse to scan SEO, Shopify, and public support context.</div>'}
      </div>
    `;
    return true;
  }

  function initMarketReader(){
    renderMarketReaderPanel();
    return getMarketReaderState();
  }

  root.getMarketReaderState = getMarketReaderState;
  root.patchMarketReaderState = patchMarketReaderState;
  root.startMarketLaser = startMarketLaser;
  root.settleMarketLaser = settleMarketLaser;
  root.failMarketLaser = failMarketLaser;
  root.parsePulseText = parsePulseText;
  root.renderMarketReaderPanel = renderMarketReaderPanel;
  root.initMarketReader = initMarketReader;
})();