(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const MAP_KEY = 'sr_map_system_v1';

  const MAPS = {
    swimmingHole: {
      id: 'swimmingHole',
      title: 'Swimming Hole',
      tagline: 'Wet hair care, rinse timing, conditioner movement, and soft recovery after water.',
      quality: 'wet-to-softness',
      mood: 'cool, clean, reflective, water-safe',
      stockImageQueries: [
        'clear tropical swimming hole Dominican Republic water',
        'wet curly hair conditioner rinse shower natural light',
        'blue green lagoon rocks tropical water'
      ],
      visualTokens: {
        primary: '#0ea5b7',
        secondary: '#7dd3fc',
        accent: '#14b8a6',
        deep: '#0f3d4a',
        surface: 'rgba(8, 47, 73, 0.78)',
        panel: 'rgba(224, 242, 254, 0.12)',
        glow: '0 0 28px rgba(125, 211, 252, 0.38)',
        background: 'radial-gradient(circle at 20% 18%, rgba(125,211,252,.28), transparent 32%), radial-gradient(circle at 78% 12%, rgba(20,184,166,.22), transparent 30%), linear-gradient(145deg, #083344, #0f766e 48%, #075985)'
      },
      details: [
        'Wet-to-wetness route: water level, conditioner slip, rinse timing, scalp calm, and softness recovery.',
        'Diary pushes tip/support prompts around wet-care routines.',
        'FAQ can show an intelligent wet-care graph for conditioner-type products.',
        'Profile connects hair-analysis history to Diary wet-care history.'
      ],
      qualities: {
        waterLevel: 'How wet the hair is before conditioner logic starts.',
        slipLevel: 'How much conditioner/slip support is needed before combing or styling.',
        rinseTiming: 'How long conditioner should keep moving before rinse.',
        scalpCalm: 'How gentle the map should make the instruction language.',
        moneyMovement: 'Whether wet-care route creates tips, product intent, or Shopify movement.'
      },
      primaryPerk: 'swimmingHoleWetCare'
    },
    snowMountainPass: {
      id: 'snowMountainPass',
      title: 'Snow Mountain Pass',
      tagline: 'Cold discipline, protection, dryness control, and serious consistency.',
      quality: 'cold-protection-discipline',
      mood: 'icy, focused, protective, premium',
      stockImageQueries: [
        'snow mountain pass blue white landscape',
        'winter hair protection cold dry air',
        'icy mountain trail premium clean interface'
      ],
      visualTokens: {
        primary: '#2563eb',
        secondary: '#bfdbfe',
        accent: '#f8fafc',
        deep: '#172554',
        surface: 'rgba(15, 23, 42, 0.84)',
        panel: 'rgba(219, 234, 254, 0.13)',
        glow: '0 0 30px rgba(191, 219, 254, 0.36)',
        background: 'radial-gradient(circle at 18% 12%, rgba(219,234,254,.34), transparent 34%), linear-gradient(145deg, #172554, #1d4ed8 52%, #e0f2fe)'
      },
      details: [
        'Cold air map: dryness protection, scalp tension awareness, and slow disciplined routines.',
        'Diary rewards consistency instead of random posting.',
        'Studio rewards clean, careful passes over rushed exports.',
        'Profile reads as prepared, serious, and protected.'
      ],
      qualities: {
        coldShield: 'How protected the user is from dry/cold stress.',
        tensionControl: 'How calm and precise the routine is.',
        consistency: 'How often the user follows the same serious routine.',
        protectionLayer: 'Whether the account has a tracked protection history.',
        seriousness: 'Whether use is disciplined enough to rank.'
      },
      primaryPerk: 'snowDisciplineProtocol'
    },
    autumnTrail: {
      id: 'autumnTrail',
      title: 'Autumn Trail',
      tagline: 'Transition, shedding awareness, balanced routine changes, and history intelligence.',
      quality: 'transition-balance-history',
      mood: 'warm, grounded, seasonal, reflective',
      stockImageQueries: [
        'autumn forest trail warm leaves',
        'seasonal hair shedding routine autumn',
        'gold orange nature trail lifestyle'
      ],
      visualTokens: {
        primary: '#d97706',
        secondary: '#fed7aa',
        accent: '#f97316',
        deep: '#451a03',
        surface: 'rgba(69, 26, 3, 0.82)',
        panel: 'rgba(254, 215, 170, 0.13)',
        glow: '0 0 30px rgba(251, 146, 60, 0.34)',
        background: 'radial-gradient(circle at 22% 18%, rgba(251,146,60,.32), transparent 32%), linear-gradient(145deg, #451a03, #b45309 52%, #fbbf24)'
      },
      details: [
        'Transition map: watches shedding, seasonal changes, product adjustment, and profile history.',
        'Diary becomes a change log.',
        'FAQ explains the story behind the transition.',
        'Profile gets stronger because history is connected and readable.'
      ],
      qualities: {
        transitionStage: 'Which change phase the account is in.',
        sheddingAwareness: 'Whether the user is tracking fall/change signals.',
        balanceScore: 'How balanced the routine is between dry, wet, and styling days.',
        historyDepth: 'How much useful account history exists.',
        ariaGuidance: 'How much Aria helped interpret the transition.'
      },
      primaryPerk: 'autumnTransitionEngine'
    },
    desertCliff: {
      id: 'desertCliff',
      title: 'Desert Cliff',
      tagline: 'Dry survival, exposure control, product discipline, and efficient money movement.',
      quality: 'dry-survival-efficiency',
      mood: 'hot, sharp, resilient, minimal',
      stockImageQueries: [
        'desert cliff sunset warm landscape',
        'dry hair moisture retention desert heat',
        'minimal ecommerce dashboard warm desert'
      ],
      visualTokens: {
        primary: '#c2410c',
        secondary: '#fed7aa',
        accent: '#facc15',
        deep: '#431407',
        surface: 'rgba(67, 20, 7, 0.84)',
        panel: 'rgba(254, 215, 170, 0.12)',
        glow: '0 0 30px rgba(250, 204, 21, 0.33)',
        background: 'radial-gradient(circle at 78% 15%, rgba(250,204,21,.28), transparent 30%), linear-gradient(145deg, #431407, #c2410c 50%, #fdba74)'
      },
      details: [
        'Dry survival map: moisture retention, product minimalism, and no wasted actions.',
        'Diary and payments reward efficient money movement.',
        'FAQ explains dry exposure and product restraint.',
        'Admin can see who behaves seriously under pressure.'
      ],
      qualities: {
        drynessRisk: 'How exposed the hair/account is.',
        moistureRetention: 'How well the routine protects moisture.',
        productDiscipline: 'Whether the user avoids overusing products.',
        efficiency: 'Whether actions are focused and money-aware.',
        pressureRank: 'Whether the user stays serious under dry/stressful conditions.'
      },
      primaryPerk: 'desertDrySurvival'
    },
    blissfulGeysers: {
      id: 'blissfulGeysers',
      title: 'Blissful Geysers',
      tagline: 'Heat, pressure, deep-conditioning cycles, release, and reset flow.',
      quality: 'pressure-release-reset',
      mood: 'steamy, glowing, restorative, emotional',
      stockImageQueries: [
        'geothermal geyser steam blue water',
        'steam hair deep conditioning spa',
        'hot spring wellness water mist'
      ],
      visualTokens: {
        primary: '#0891b2',
        secondary: '#a5f3fc',
        accent: '#f0abfc',
        deep: '#164e63',
        surface: 'rgba(22, 78, 99, 0.84)',
        panel: 'rgba(165, 243, 252, 0.13)',
        glow: '0 0 32px rgba(240, 171, 252, 0.34)',
        background: 'radial-gradient(circle at 22% 20%, rgba(165,243,252,.3), transparent 32%), radial-gradient(circle at 75% 30%, rgba(240,171,252,.26), transparent 28%), linear-gradient(145deg, #164e63, #0891b2 50%, #a21caf)'
      },
      details: [
        'Geyser map: pressure builds, releases, and resets the routine.',
        'Diary tracks reset cycles and emotional release.',
        'Studio gets build/release flow checks.',
        'FAQ can tell the story interactively.'
      ],
      qualities: {
        pressureLevel: 'How much buildup the account/routine has.',
        releaseTiming: 'When to reset instead of pushing more.',
        deepConditioning: 'Whether a treatment/reset moment belongs in the flow.',
        emotionalFlow: 'How Aria helps interpret pressure and reset.',
        recoveryValue: 'Whether the reset improves consistency and rank.'
      },
      primaryPerk: 'geyserPressureRelease'
    },
    chocolateFactory: {
      id: 'chocolateFactory',
      title: 'Chocolate Factory',
      tagline: 'Rich layers, craft, polish, final-form refinement, and premium output.',
      quality: 'crafted-polish-final-form',
      mood: 'rich, playful, premium, crafted',
      stockImageQueries: [
        'chocolate factory warm golden interior',
        'premium product packaging chocolate tones',
        'creative factory conveyor glossy brown gold'
      ],
      visualTokens: {
        primary: '#7c2d12',
        secondary: '#fcd34d',
        accent: '#f97316',
        deep: '#2f1608',
        surface: 'rgba(47, 22, 8, 0.86)',
        panel: 'rgba(252, 211, 77, 0.13)',
        glow: '0 0 30px rgba(252, 211, 77, 0.34)',
        background: 'radial-gradient(circle at 20% 18%, rgba(252,211,77,.28), transparent 30%), linear-gradient(145deg, #2f1608, #7c2d12 50%, #b45309)'
      },
      details: [
        'Chocolate Factory map: layers, polish, finishing quality, and premium output.',
        'Studio exports and Profile presentation matter most.',
        'FAQ tells a playful but serious map story.',
        'Making Money score rises when the output becomes polished enough to sell.'
      ],
      qualities: {
        layerQuality: 'How many useful layers the account/output has.',
        polishLevel: 'How refined the final presentation is.',
        exportConfidence: 'Whether Studio output is correct and ready.',
        presentationValue: 'Whether Profile/FAQ make the result credible.',
        moneyReady: 'Whether the final product feels sellable.'
      },
      primaryPerk: 'chocolateFinalForm'
    }
  };

  const DEFAULTS = {
    activeMap: 'swimmingHole',
    maps: MAPS,
    history: [],
    accountReflection: {
      professional: 0,
      makingMoney: 0,
      ariaInteraction: 0,
      seriousness: 0,
      protectionLevel: 'basic',
      protectionReason: 'Protection begins when account activity becomes consistent and trackable.'
    },
    ui: {
      rankBoardMinHeight: 260,
      mapPanelMinHeight: 320,
      lastAction: ''
    }
  };

  const store = root.createStore ? root.createStore(MAP_KEY, DEFAULTS) : null;

  function getMapState(){
    return store ? store.getState() : DEFAULTS;
  }

  function patchMapState(patch){
    const next = store ? store.patch(patch || {}) : patch || {};
    try {
      root.patchAppStateSection?.('mapChange', {
        activeMap: next.activeMap,
        history: next.history || [],
        accountReflection: next.accountReflection || {},
        ui: next.ui || {}
      });
    } catch (error) {}
    applyMapTheme(next.activeMap || 'swimmingHole');
    return next;
  }

  function applyMapTheme(mapId){
    const state = getMapState();
    const map = state.maps?.[mapId] || MAPS[mapId] || MAPS.swimmingHole;
    if (!map) return null;
    const rootEl = document.documentElement;
    rootEl.dataset.srActiveMap = map.id;
    const tokens = map.visualTokens || {};
    Object.entries(tokens).forEach(([key, value])=>{
      rootEl.style.setProperty(`--sr-map-${key}`, value);
    });
    rootEl.style.setProperty('--sr-map-background', tokens.background || '');
    return map;
  }

  function setActiveMap(mapId, detail = {}){
    const current = getMapState();
    const map = current.maps?.[mapId] || MAPS[mapId];
    if (!map) return current;
    const history = [{
      mapId,
      title: map.title,
      at: new Date().toISOString(),
      reason: detail.reason || 'map-change'
    }, ...(current.history || [])].slice(0, 50);
    return patchMapState({
      activeMap: mapId,
      history,
      ui: { ...(current.ui || {}), lastAction: 'map-change' }
    });
  }

  function getActiveMapDetails(){
    const state = getMapState();
    return state.maps?.[state.activeMap] || MAPS.swimmingHole;
  }

  function renderMapStatusPanel(container){
    if (!container) return false;
    const state = getMapState();
    const map = getActiveMapDetails();
    container.dataset.srMapStatusPanel = 'true';
    container.style.minHeight = container.style.minHeight || `${Number(state.ui?.mapPanelMinHeight || 320)}px`;
    container.style.contain = container.style.contain || 'layout paint';
    container.innerHTML = `
      <div class="sr-map-status-card">
        <span>Active Map</span>
        <strong>${map.title}</strong>
        <p>${map.tagline}</p>
        <div class="sr-map-quality-grid">
          ${(map.details || []).map((item)=>`<div>${item}</div>`).join('')}
        </div>
      </div>
    `;
    return true;
  }


  function renderMapSelector(container){
    if (!container) return false;
    const state = getMapState();
    const maps = Object.values(state.maps || MAPS);
    container.dataset.srMapSelector = 'true';
    container.style.minHeight = container.style.minHeight || '7rem';
    container.style.contain = container.style.contain || 'layout paint';
    container.innerHTML = maps.map((map)=>`
      <button class="btn ${state.activeMap === map.id ? '' : 'ghost'}" type="button" data-sr-map-choice="${map.id}">
        <strong>${map.title}</strong>
        <span>${map.quality}</span>
      </button>
    `).join('');
    if (!container.__srMapSelectorBound) {
      container.addEventListener('click', (event)=>{
        const btn = event.target.closest?.('[data-sr-map-choice]');
        if (!btn) return;
        setActiveMap(btn.dataset.srMapChoice, { reason:'map-selector' });
        renderMapSelector(container);
        root.renderPerkPanel?.(document.querySelector('#srPerkPanel'));
        root.updateRankBoard?.();
      });
      container.__srMapSelectorBound = true;
    }
    return true;
  }

  function renderActiveMapHero(container){
    if (!container) return false;
    const map = getActiveMapDetails();
    container.dataset.srMapHero = 'true';
    container.style.minHeight = container.style.minHeight || '18rem';
    container.style.contain = container.style.contain || 'layout paint';
    container.innerHTML = `
      <div class="sr-map-hero__copy">
        <span>Map Change Active</span>
        <strong>${map.title}</strong>
        <p>${map.tagline}</p>
        <small>${(map.stockImageQueries || []).join(' · ')}</small>
      </div>
      <div class="sr-map-hero__qualities">
        ${Object.entries(map.qualities || {}).map(([key, value])=>`<article><b>${key}</b><span>${value}</span></article>`).join('')}
      </div>
    `;
    return true;
  }

  function initMapSystem(){
    const state = getMapState();
    applyMapTheme(state.activeMap || 'swimmingHole');
    return state;
  }

  root.mapDefinitions = MAPS;
  root.getMapState = getMapState;
  root.patchMapState = patchMapState;
  root.applyMapTheme = applyMapTheme;
  root.setActiveMap = setActiveMap;
  root.getActiveMapDetails = getActiveMapDetails;
  root.renderMapStatusPanel = renderMapStatusPanel;
  root.renderMapSelector = renderMapSelector;
  root.renderActiveMapHero = renderActiveMapHero;
  root.initMapSystem = initMapSystem;
})();