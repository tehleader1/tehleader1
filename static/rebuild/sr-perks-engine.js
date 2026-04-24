(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const PERKS_KEY = 'sr_perks_engine_v1';

  const PERKS = {
    swimmingHoleWetCare: {
      id: 'swimmingHoleWetCare',
      map: 'swimmingHole',
      surface: 'swimmingHole',
      title: 'Wet-to-Wetness Conditioner Route',
      purpose: 'Guide wet hair through conditioner/slip/rinse timing while the Swimming Hole map is active.',
      does: ['Shows wet-care prompts in FAQ/Diary.', 'Adds conditioner and slip logic to account history.', 'Builds wet-care product intelligence.'],
      seriousness: 7,
      moneyWeight: 2,
      professionalWeight: 4
    },
    snowDisciplineProtocol: {
      id: 'snowDisciplineProtocol',
      map: 'snowMountainPass',
      surface: 'diary',
      title: 'Cold Discipline Protocol',
      purpose: 'Protect the routine from dry/cold chaos with serious repeat behavior.',
      does: ['Slows down random posting.', 'Rewards routine consistency.', 'Raises protection discipline.'],
      seriousness: 9,
      moneyWeight: 2,
      professionalWeight: 8
    },
    autumnTransitionEngine: {
      id: 'autumnTransitionEngine',
      map: 'autumnTrail',
      surface: 'profile',
      title: 'Transition Awareness Engine',
      purpose: 'Track seasonal changes, shedding, adjustment, and history intelligence.',
      does: ['Adds change phases to Profile history.', 'Connects Diary notes to hair-cycle changes.', 'Raises Aria interaction through check-ins.'],
      seriousness: 7,
      moneyWeight: 3,
      professionalWeight: 7
    },
    desertDrySurvival: {
      id: 'desertDrySurvival',
      map: 'desertCliff',
      surface: 'payments',
      title: 'Dry Survival Mode',
      purpose: 'Keep product choices minimal, serious, and money-efficient under dry/exposure pressure.',
      does: ['Flags overuse behavior.', 'Rewards efficient product intent.', 'Raises Making Money score when actions are focused.'],
      seriousness: 8,
      moneyWeight: 8,
      professionalWeight: 4
    },
    geyserPressureRelease: {
      id: 'geyserPressureRelease',
      map: 'blissfulGeysers',
      surface: 'faq',
      title: 'Pressure Release Cycle',
      purpose: 'Build, release, reset: turn pressure into consistent care and emotional flow.',
      does: ['Adds reset prompts to Diary/FAQ.', 'Connects Aria support to pressure-release history.', 'Rewards deep-conditioning/reset moments.'],
      seriousness: 7,
      moneyWeight: 4,
      professionalWeight: 6
    },
    chocolateFinalForm: {
      id: 'chocolateFinalForm',
      map: 'chocolateFactory',
      surface: 'studio',
      title: 'Final Form Refinement',
      purpose: 'Make final output polished enough to present, export, and sell.',
      does: ['Checks adlib, alignment, export, and FX.', 'Raises Studio credibility.', 'Raises Making Money when output is sellable.'],
      checklist: ['adlib confirmed', 'beat-to-vocal lined up', 'correct file exported', 'FX remembered'],
      seriousness: 9,
      moneyWeight: 9,
      professionalWeight: 9
    },
    diaryTipsMoney: {
      id: 'diaryTipsMoney',
      map: 'makingMoney',
      surface: 'diary',
      title: 'Diary Tip Streak',
      purpose: 'Keep posting tips in that map to keep the live post making money.',
      does: ['Tracks repeated Diary tip/support activity.', 'Raises Making Money score when live posts receive support movement.', 'Marks Diary as a serious money-movement lane.'],
      seriousness: 9,
      moneyWeight: 9,
      professionalWeight: 3
    },
    studioExportCheck: {
      id: 'studioExportCheck',
      map: 'studioNight',
      surface: 'studio',
      title: 'Studio Export Confirmation',
      purpose: 'Confirm adlib, beat-to-vocal alignment, correct file export, and remembered FX.',
      does: ['Adds Studio checklist history.', 'Raises Professional score for correct export behavior.', 'Raises Making Money score when export is ready for commercial/promo use.'],
      checklist: ['adlib confirmed', 'beat-to-vocal lined up', 'correct file exported', 'FX effect remembered'],
      seriousness: 8,
      moneyWeight: 5,
      professionalWeight: 8
    },
    profileToDiaryHairHistory: {
      id: 'profileToDiaryHairHistory',
      map: 'professional',
      surface: 'profile',
      title: 'Profile → Diary Hair History Button',
      purpose: 'A Profile perk that sends the user to Diary to see the history of hair analysis.',
      does: ['Creates a Profile action route to Diary.', 'Makes hair-analysis history feel connected instead of isolated.', 'Raises Professional score when the user checks history seriously.'],
      seriousness: 7,
      moneyWeight: 2,
      professionalWeight: 8
    },
    faqMapStoryInteractive: {
      id: 'faqMapStoryInteractive',
      map: 'swimmingHole',
      surface: 'faq',
      title: 'Map Story + Interactive FAQ',
      purpose: 'Tell how the map came to be and make FAQ interactive.',
      does: ['Adds story prompts to FAQ Lounge.', 'Connects social proof and map identity.', 'Raises SEO/social visibility score.'],
      seriousness: 6,
      moneyWeight: 3,
      professionalWeight: 5
    }
  };

  const DEFAULTS = {
    activePerks: {},
    history: [],
    scores: {
      professional: 0,
      makingMoney: 0,
      ariaInteraction: 0,
      seriousness: 0
    },
    ratings: {},
    protection: {
      level: 'basic',
      guaranteeConcept: 'Protection Guarantee tracks serious money-account usage, history, and admin ratings. It is not a financial promise.',
      history: []
    }
  };

  const store = root.createStore ? root.createStore(PERKS_KEY, DEFAULTS) : null;

  function getPerksState(){
    return store ? store.getState() : DEFAULTS;
  }

  function patchPerksState(patch){
    const next = store ? store.patch(patch || {}) : patch || {};
    try {
      root.patchAppStateSection?.('perks', {
        activePerks: next.activePerks || {},
        history: next.history || [],
        scores: next.scores || {},
        ratings: next.ratings || {},
        protection: next.protection || {}
      });
    } catch (error) {}
    return next;
  }

  function calculateProtection(scores){
    const money = Number(scores.makingMoney || 0);
    const serious = Number(scores.seriousness || 0);
    if (money >= 80 && serious >= 80) return { level:'verified', reason:'Consistent money movement and serious account usage are verified in history.' };
    if (money >= 35 || serious >= 40) return { level:'active', reason:'Account shows active serious usage and should be watched by admin.' };
    return { level:'basic', reason:'Protection begins with trackable use, Aria interaction, and real movement.' };
  }

  function activatePerk(perkId, detail = {}){
    const perk = PERKS[perkId];
    if (!perk) return getPerksState();
    const current = getPerksState();
    const scores = {
      professional: Number(current.scores?.professional || 0) + Number(perk.professionalWeight || 0),
      makingMoney: Number(current.scores?.makingMoney || 0) + Number(perk.moneyWeight || 0),
      ariaInteraction: Number(current.scores?.ariaInteraction || 0) + Number(detail.aria ? 3 : 0),
      seriousness: Number(current.scores?.seriousness || 0) + Number(perk.seriousness || 0)
    };
    const protectionNext = calculateProtection(scores);
    const event = {
      perkId,
      title: perk.title,
      surface: perk.surface,
      map: perk.map,
      at: new Date().toISOString(),
      detail
    };
    const protection = {
      ...(current.protection || {}),
      ...protectionNext,
      history: [{ at:event.at, level:protectionNext.level, reason:protectionNext.reason, perkId }, ...((current.protection || {}).history || [])].slice(0, 50)
    };
    const next = patchPerksState({
      activePerks: { ...(current.activePerks || {}), [perkId]: true },
      history: [event, ...((current.history) || [])].slice(0, 100),
      scores,
      protection
    });
    try { root.updateRankBoard?.(); } catch (error) {}
    try { window.dispatchEvent(new CustomEvent('supportrd-perk-activated', { detail:{ perk, state:next } })); } catch (error) {}
    return next;
  }

  function rateAccountOption(option, rating, note){
    const current = getPerksState();
    const record = {
      option,
      rating: Number(rating || 0),
      note: note || '',
      at: new Date().toISOString()
    };
    const ratings = { ...(current.ratings || {}) };
    ratings[option] = [record, ...((ratings[option]) || [])].slice(0, 25);
    return patchPerksState({ ratings });
  }

  function getSurfacePerks(surface){
    return Object.values(PERKS).filter((perk)=>perk.surface === surface);
  }


  function renderPerkPanel(container){
    if (!container) return false;
    const activeMap = root.getMapState?.().activeMap || 'swimmingHole';
    const perks = Object.values(PERKS).filter((perk)=>perk.map === activeMap || perk.id === 'diaryTipsMoney' || perk.id === 'studioExportCheck' || perk.id === 'profileToDiaryHairHistory' || perk.id === 'faqMapStoryInteractive');
    const state = getPerksState();
    container.dataset.srPerkPanel = 'true';
    container.style.minHeight = container.style.minHeight || '22rem';
    container.style.contain = container.style.contain || 'layout paint';
    container.innerHTML = `
      <div class="sr-perk-panel__header">
        <span>Active Map Perks</span>
        <strong>${root.getActiveMapDetails?.().title || 'SupportRD Map'}</strong>
      </div>
      <div class="sr-perk-panel__grid">
        ${perks.map((perk)=>`
          <article class="sr-perk-card" data-sr-perk-card="${perk.id}">
            <span>${perk.surface}</span>
            <strong>${perk.title}</strong>
            <p>${perk.purpose}</p>
            <ul>${(perk.does || []).map((item)=>`<li>${item}</li>`).join('')}</ul>
            ${perk.checklist ? `<div class="sr-perk-checklist">${perk.checklist.map((item)=>`<label><input type="checkbox" data-sr-perk-check="${perk.id}"> ${item}</label>`).join('')}</div>` : ''}
            <button class="btn" type="button" data-sr-activate-perk="${perk.id}">${state.activePerks?.[perk.id] ? 'Perk Active' : 'Activate Perk'}</button>
          </article>
        `).join('')}
      </div>
    `;
    if (!container.__srPerkPanelBound) {
      container.addEventListener('click', (event)=>{
        const btn = event.target.closest?.('[data-sr-activate-perk]');
        if (!btn) return;
        activatePerk(btn.dataset.srActivatePerk, { source:'visible-perk-panel', aria:true });
        renderPerkPanel(container);
      });
      container.__srPerkPanelBound = true;
    }
    return true;
  }

  function renderAccountSeriousnessPanel(container){
    if (!container) return false;
    const state = getPerksState();
    const scores = state.scores || {};
    const protection = state.protection || {};
    container.dataset.srSeriousnessPanel = 'true';
    container.style.minHeight = container.style.minHeight || '18rem';
    container.style.contain = container.style.contain || 'layout paint';
    container.innerHTML = `
      <div class="sr-seriousness-panel__header">
        <span>Account Seriousness</span>
        <strong>${protection.level || 'basic'} protection</strong>
        <p>${protection.reason || protection.guaranteeConcept || 'Protection begins with serious tracked usage.'}</p>
      </div>
      <div class="sr-score-grid">
        <article><span>Professional</span><strong>${Number(scores.professional || 0)}</strong></article>
        <article><span>Making Money</span><strong>${Number(scores.makingMoney || 0)}</strong></article>
        <article><span>Aria</span><strong>${Number(scores.ariaInteraction || 0)}</strong></article>
        <article><span>Seriousness</span><strong>${Number(scores.seriousness || 0)}</strong></article>
      </div>
      <div class="sr-history-list">
        ${(state.history || []).slice(0, 5).map((item)=>`<div><strong>${item.title}</strong><span>${item.surface} · ${item.at}</span></div>`).join('') || '<div><strong>No perk history yet</strong><span>Use a map perk to start building seriousness.</span></div>'}
      </div>
    `;
    return true;
  }

  function initPerksEngine(){
    return getPerksState();
  }

  root.perkDefinitions = PERKS;
  root.getPerksState = getPerksState;
  root.patchPerksState = patchPerksState;
  root.activatePerk = activatePerk;
  root.rateAccountOption = rateAccountOption;
  root.getSurfacePerks = getSurfacePerks;
  root.renderPerkPanel = renderPerkPanel;
  root.renderAccountSeriousnessPanel = renderAccountSeriousnessPanel;
  root.initPerksEngine = initPerksEngine;
})();