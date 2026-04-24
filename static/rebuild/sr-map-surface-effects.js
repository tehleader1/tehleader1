(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const SURFACE_KEY = 'sr_map_surface_effects_v1';

  const SURFACE_EFFECTS = {
    swimmingHole: {
      diary: {
        label: 'Wet-care tip lane',
        body: 'Post wet-care tips, conditioner/slip reminders, and guest support prompts while the Swimming Hole map is active.',
        action: 'Keep posting conditioner tips to keep live money movement active.'
      },
      studio: {
        label: 'Water-flow edit check',
        body: 'Keep adlibs smooth, avoid harsh cuts, and export the correct file after FX is checked.',
        action: 'Confirm flow, softness, and export before leaving Studio.'
      },
      profile: {
        label: 'Hair history route',
        body: 'Profile should send the user to Diary to review wet-care and hair-analysis history.',
        action: 'Open Diary hair history.'
      },
      faq: {
        label: 'Swimming Hole story',
        body: 'Tell the origin of the map and show wet-conditioner intelligence for wet hair.',
        action: 'Open the wet-care graph.'
      },
      payments: {
        label: 'Wet-care product intent',
        body: 'Surface conditioner-type product logic without fake medical claims.',
        action: 'Track real product interest.'
      }
    },
    snowMountainPass: {
      diary: {
        label: 'Cold discipline log',
        body: 'Diary rewards consistent posting and protective routine tracking in cold/dry conditions.',
        action: 'Log disciplined protection.'
      },
      studio: {
        label: 'Precision export pass',
        body: 'Studio should slow down and confirm clean exports instead of rushed output.',
        action: 'Check precision before export.'
      },
      profile: {
        label: 'Protected identity',
        body: 'Profile reads as serious, protected, consistent, and prepared.',
        action: 'Review protection status.'
      },
      faq: {
        label: 'Cold protection story',
        body: 'FAQ explains dry/cold stress, scalp tension, and protective routine logic.',
        action: 'Open cold-care explanation.'
      },
      payments: {
        label: 'Protection purchase intent',
        body: 'Payments should watch protective product interest and seriousness.',
        action: 'Track protective intent.'
      }
    },
    autumnTrail: {
      diary: {
        label: 'Transition diary',
        body: 'Diary becomes the record of seasonal changes, shedding awareness, and routine adjustment.',
        action: 'Post a transition check-in.'
      },
      studio: {
        label: 'Seasonal tone pass',
        body: 'Studio output should feel warm, balanced, and carefully adjusted.',
        action: 'Confirm seasonal tone.'
      },
      profile: {
        label: 'History intelligence',
        body: 'Profile connects older hair analysis to current transition signals.',
        action: 'Review transition history.'
      },
      faq: {
        label: 'Autumn map story',
        body: 'FAQ explains how the map handles shedding, balance, and change.',
        action: 'Open transition story.'
      },
      payments: {
        label: 'Adjustment product intent',
        body: 'Payments track whether routine-change products are being considered seriously.',
        action: 'Track adjustment intent.'
      }
    },
    desertCliff: {
      diary: {
        label: 'Dry survival log',
        body: 'Diary tracks dryness, exposure, minimal product strategy, and efficient money actions.',
        action: 'Post a dry-survival tip.'
      },
      studio: {
        label: 'Minimal export mode',
        body: 'Studio should remove waste and export only what is ready.',
        action: 'Confirm minimal export.'
      },
      profile: {
        label: 'Pressure discipline',
        body: 'Profile reads whether the user stays serious under dry/exposed conditions.',
        action: 'Review discipline score.'
      },
      faq: {
        label: 'Dry survival FAQ',
        body: 'FAQ explains moisture retention and avoiding product overuse.',
        action: 'Open dry-care guide.'
      },
      payments: {
        label: 'Efficient money lane',
        body: 'Payments reward focused checkout intent and avoid scattered product behavior.',
        action: 'Track efficient intent.'
      }
    },
    blissfulGeysers: {
      diary: {
        label: 'Reset cycle diary',
        body: 'Diary tracks pressure, release, reset, and emotional support flow.',
        action: 'Post a reset cycle.'
      },
      studio: {
        label: 'Build-release Studio flow',
        body: 'Studio checks buildup, release, and final export energy.',
        action: 'Confirm release timing.'
      },
      profile: {
        label: 'Recovery status',
        body: 'Profile reflects reset history and whether the user recovered consistency.',
        action: 'Review recovery status.'
      },
      faq: {
        label: 'Geyser story',
        body: 'FAQ explains pressure-release cycles and deep-conditioning/reset logic.',
        action: 'Open pressure-release story.'
      },
      payments: {
        label: 'Recovery product intent',
        body: 'Payments watches reset-care product interest and support behavior.',
        action: 'Track reset intent.'
      }
    },
    chocolateFactory: {
      diary: {
        label: 'Final-form diary',
        body: 'Diary logs polished updates and sellable movement.',
        action: 'Post a final-form update.'
      },
      studio: {
        label: 'Final export factory',
        body: 'Studio confirms adlib, beat alignment, correct export, and FX memory.',
        action: 'Run final export checklist.'
      },
      profile: {
        label: 'Premium presentation',
        body: 'Profile presents the user as polished, credible, and ready.',
        action: 'Review presentation score.'
      },
      faq: {
        label: 'Factory story',
        body: 'FAQ turns map origin into an interactive story about craft and polish.',
        action: 'Open factory story.'
      },
      payments: {
        label: 'Sellable output lane',
        body: 'Payments tracks whether the polished result is ready to convert.',
        action: 'Track sellable intent.'
      }
    }
  };

  const DEFAULTS = {
    activeMap: 'swimmingHole',
    surfaces: {},
    history: [],
    ui: {
      dockMinHeight: 320,
      lastAction: ''
    }
  };

  const store = root.createStore ? root.createStore(SURFACE_KEY, DEFAULTS) : null;

  function getMapSurfaceState(){
    return store ? store.getState() : DEFAULTS;
  }

  function patchMapSurfaceState(patch){
    const next = store ? store.patch(patch || {}) : patch || {};
    try {
      root.patchAppStateSection?.('mapSurfaceEffects', {
        activeMap: next.activeMap,
        surfaces: next.surfaces || {},
        history: next.history || [],
        ui: next.ui || {}
      });
    } catch (error) {}
    return next;
  }

  function getActiveSurfaceEffects(){
    const mapId = root.getMapState?.().activeMap || getMapSurfaceState().activeMap || 'swimmingHole';
    return SURFACE_EFFECTS[mapId] || SURFACE_EFFECTS.swimmingHole;
  }

  function applyMapSurfaceEffects(mapId){
    const activeMap = mapId || root.getMapState?.().activeMap || 'swimmingHole';
    const surfaces = SURFACE_EFFECTS[activeMap] || SURFACE_EFFECTS.swimmingHole;
    document.documentElement.dataset.srSurfaceMap = activeMap;
    document.querySelectorAll('[data-sr-surface]').forEach((el)=>{
      const key = el.dataset.srSurface;
      const effect = surfaces[key];
      if (!effect) return;
      el.dataset.srMapEffect = activeMap;
      const label = el.querySelector('[data-sr-map-effect-label]');
      const body = el.querySelector('[data-sr-map-effect-body]');
      const action = el.querySelector('[data-sr-map-effect-action]');
      if (label) label.textContent = effect.label;
      if (body) body.textContent = effect.body;
      if (action) action.textContent = effect.action;
    });
    const current = getMapSurfaceState();
    return patchMapSurfaceState({
      activeMap,
      surfaces,
      history: [{ mapId:activeMap, at:new Date().toISOString(), action:'surface-effects' }, ...((current.history) || [])].slice(0, 50),
      ui: { ...(current.ui || {}), lastAction:'surface-effects' }
    });
  }

  function renderSurfaceEffectDock(container){
    if (!container) return false;
    const map = root.getActiveMapDetails?.() || {};
    const effects = getActiveSurfaceEffects();
    container.dataset.srSurfaceEffectDock = 'true';
    container.style.minHeight = container.style.minHeight || `${Number(getMapSurfaceState().ui?.dockMinHeight || 320)}px`;
    container.style.contain = container.style.contain || 'layout paint';
    container.innerHTML = `
      <div class="sr-surface-effect-dock__header">
        <span>Map Surface Effects</span>
        <strong>${map.title || 'SupportRD Map'}</strong>
        <p>${map.tagline || 'Surface behavior is ready.'}</p>
      </div>
      <div class="sr-surface-effect-grid">
        ${Object.entries(effects).map(([surface, effect])=>`
          <article data-sr-surface="${surface}">
            <span>${surface}</span>
            <strong data-sr-map-effect-label>${effect.label}</strong>
            <p data-sr-map-effect-body>${effect.body}</p>
            <button class="btn ghost" type="button" data-sr-surface-perk="${surface}" data-sr-map-effect-action>${effect.action}</button>
          </article>
        `).join('')}
      </div>
    `;
    if (!container.__srSurfaceEffectBound) {
      container.addEventListener('click', (event)=>{
        const btn = event.target.closest?.('[data-sr-surface-perk]');
        if (!btn) return;
        const activeMap = root.getMapState?.().activeMap || 'swimmingHole';
        const primaryPerk = root.getActiveMapDetails?.().primaryPerk;
        if (primaryPerk) root.activatePerk?.(primaryPerk, { source:'surface-effect-dock', surface:btn.dataset.srSurfacePerk, aria:true });
        root.recordAccountOptionChange?.(`surface:${btn.dataset.srSurfacePerk}`, activeMap, 'map-surface-effect');
        root.renderAccountSeriousnessPanel?.(document.querySelector('#srAccountSeriousnessPanel'));
        root.renderAdminSeriousnessPanel?.(document.querySelector('#srAdminSeriousnessPanel'));
      });
      container.__srSurfaceEffectBound = true;
    }
    return true;
  }

  function initMapSurfaceEffects(){
    const state = applyMapSurfaceEffects();
    renderSurfaceEffectDock(document.querySelector('#srSurfaceEffectDock'));
    return state;
  }

  root.surfaceEffectDefinitions = SURFACE_EFFECTS;
  root.getMapSurfaceState = getMapSurfaceState;
  root.patchMapSurfaceState = patchMapSurfaceState;
  root.getActiveSurfaceEffects = getActiveSurfaceEffects;
  root.applyMapSurfaceEffects = applyMapSurfaceEffects;
  root.renderSurfaceEffectDock = renderSurfaceEffectDock;
  root.initMapSurfaceEffects = initMapSurfaceEffects;
})();