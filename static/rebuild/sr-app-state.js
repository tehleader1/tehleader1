(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const STORE_KEY = 'sr_app_state_v1';
  const DEFAULTS = {
    session: {
      loggedIn: false,
      authSource: 'guest',
      email: '',
      userName: '',
      plan: 'Free',
      loginProvider: 'Guest',
      trustedOwner: false
    },
    boot: {
      phase: 'launch',
      view: 'launch',
      lastRoute: ''
    },
    diary: {
      comments: [],
      visits: 0,
      supportTotal: 0,
      payoutEmail: '',
      payoutHandle: ''
    },
    payments: {
      selectedPlan: '',
      checkoutIntent: '',
      lastUpgradeCheckAt: '',
      storefrontReady: false
    },
    faq: {
      feed: {},
      media: {},
      visibility: {},
      seo: {},
      ui: {}
    },
    profile: {
      identity: {},
      appearance: {},
      credibility: {},
      activity: {},
      social: {},
      ui: {}
    },
    studio: {
      session: {},
      activity: {},
      deployIntegration: {
      ready: false,
      lastAuditAt: '',
      systems: {},
      issues: [],
      deployment: {},
      ui: {}
    },
    marketReader: {
      mode: '',
      timing: {},
      reader: {},
      laser: {},
      signals: {},
      ui: {}
    },
    shell: {},
      profileBridge: {}
    },
    mapChange: {
      activeMap: '',
      history: [],
      accountReflection: {},
      ui: {}
    },
    perks: {
      activePerks: {},
      history: [],
      scores: {},
      ratings: {},
      protection: {}
    },
    mapSurfaceEffects: {
      activeMap: '',
      surfaces: {},
      history: [],
      ui: {}
    },
    adminSeriousness: {
      ratings: {},
      optionHistory: [],
      shopifyLens: {},
      seriousness: {},
      ui: {}
    },
    rankSystem: {
      contacts: [],
      topProfessional: null,
      topMakingMoney: null,
      adminSignals: [],
      ui: {}
    },
    market: {
      readerPhase: 'idle',
      recommendation: '',
      latestSales: 0,
      latestOrders: 0,
      riskLevel: 'watch'
    }
  };

  const store = root.createStore ? root.createStore(STORE_KEY, DEFAULTS) : null;

  function readJson(key, fallback){
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch (error) {
      return fallback;
    }
  }

  function deriveLegacyState(){
    const socialLinks = readJson('socialLinks', {});
    const authProfile = readJson('accountProfile', {});
    const rebuildState = readJson('sr_rebuild_state_v1', {});
    const marketState = readJson('sr_market_reader_v1', {});
    const diaryStats = readJson('srdTipTotal', 0);
    const loggedIn = localStorage.getItem('loggedIn') === 'true' || !!authProfile.loggedIn || !!(rebuildState.account && rebuildState.account.loggedIn);
    const trustedOwner = typeof window.shouldAutoOwnerEntry === 'function' ? !!window.shouldAutoOwnerEntry() : false;
    const plan = authProfile.plan || (rebuildState.account && rebuildState.account.plan) || 'Free';
    const loginProvider = authProfile.loginProvider || (rebuildState.account && rebuildState.account.loginProvider) || 'Guest';
    return {
      session: {
        loggedIn,
        authSource: loggedIn ? 'member' : 'guest',
        email: socialLinks.email || authProfile.email || '',
        userName: authProfile.name || authProfile.nickname || socialLinks.username || '',
        plan,
        loginProvider,
        trustedOwner
      },
      boot: {
        phase: loggedIn ? 'shell' : 'launch',
        view: loggedIn ? 'shell' : 'launch',
        lastRoute: (rebuildState && rebuildState.route) || ''
      },
      diary: {
        comments: Array.isArray(rebuildState.diaryComments) ? rebuildState.diaryComments : [],
        visits: Number(rebuildState.diaryLikes || 0),
        supportTotal: Number(diaryStats || 0),
        payoutEmail: socialLinks.email || '',
        payoutHandle: socialLinks.cashapp || ''
      },
      payments: {
        selectedPlan: plan,
        checkoutIntent: '',
        lastUpgradeCheckAt: '',
        storefrontReady: !!((rebuildState.shopify && rebuildState.shopify.storefrontBase) || window.__SUPPORTRD_SHOPIFY_PUBLIC_CONFIG__)
      },
      market: {
        readerPhase: marketState.phase || 'idle',
        recommendation: marketState.recommendation && marketState.recommendation.action || '',
        latestSales: Number(marketState.finance && marketState.finance.totalSales || 0),
        latestOrders: Number(marketState.finance && marketState.finance.orders || 0),
        riskLevel: marketState.finance && marketState.finance.riskLevel || 'watch'
      }
    };
  }

  function syncFromLegacy(){
    const next = deriveLegacyState();
    if (!store) return next;
    return store.replace(next);
  }

  function patchSection(section, value){
    if (!store) return merge({}, {});
    return store.patch({ [section]: value });
  }

  function getState(){
    return store ? store.getState() : deriveLegacyState();
  }

  function emitStateReady(detail){
    try {
      window.dispatchEvent(new CustomEvent('supportrd-app-state-ready', { detail }));
    } catch (error) {}
  }

  function initAppState(){
    const state = syncFromLegacy();
    emitStateReady(state);
    return state;
  }

  root.appStateDefaults = DEFAULTS;
  root.appStateStore = store;
  root.deriveLegacyAppState = deriveLegacyState;
  root.syncLegacyAppState = syncFromLegacy;
  root.patchAppStateSection = patchSection;
  root.getAppState = getState;
  root.initAppState = initAppState;
})();
