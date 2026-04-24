(function(){
  const root = window.SupportRDRebuild = window.SupportRDRebuild || {};
  const RANK_KEY = 'sr_rank_system_v1';

  const DEFAULTS = {
    contacts: [],
    topProfessional: null,
    topMakingMoney: null,
    adminSignals: [],
    ui: {
      boardMinHeight: 280,
      lastAction: ''
    }
  };

  const store = root.createStore ? root.createStore(RANK_KEY, DEFAULTS) : null;

  function readJson(key, fallback){
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (error) { return fallback; }
  }

  function getRankState(){
    return store ? store.getState() : DEFAULTS;
  }

  function patchRankState(patch){
    const next = store ? store.patch(patch || {}) : patch || {};
    try {
      root.patchAppStateSection?.('rankSystem', {
        contacts: next.contacts || [],
        topProfessional: next.topProfessional || null,
        topMakingMoney: next.topMakingMoney || null,
        adminSignals: next.adminSignals || [],
        ui: next.ui || {}
      });
    } catch (error) {}
    return next;
  }

  function buildCurrentContact(){
    const profile = root.getProfileState ? root.getProfileState() : {};
    const perks = root.getPerksState ? root.getPerksState() : {};
    const social = readJson('socialLinks', {});
    const name = profile.identity?.name || profile.identity?.username || social.name || social.email || 'SupportRD Contact';
    const scores = perks.scores || {};
    const moneyMovement = Number(scores.makingMoney || 0);
    const professional = Number(scores.professional || 0);
    const ariaInteraction = Number(scores.ariaInteraction || 0);
    const seriousness = Number(scores.seriousness || 0);
    return {
      id: social.email || name,
      name,
      professional,
      makingMoney: moneyMovement,
      ariaInteraction,
      seriousness,
      protection: perks.protection?.level || 'basic',
      updatedAt: new Date().toISOString()
    };
  }

  function updateRankBoard(){
    const current = getRankState();
    const contact = buildCurrentContact();
    const contactsById = new Map((current.contacts || []).map((item)=>[item.id, item]));
    contactsById.set(contact.id, { ...(contactsById.get(contact.id) || {}), ...contact });
    const contacts = Array.from(contactsById.values());
    const topProfessional = [...contacts].sort((a,b)=>Number(b.professional || 0) - Number(a.professional || 0))[0] || null;
    const topMakingMoney = [...contacts].sort((a,b)=>Number(b.makingMoney || 0) - Number(a.makingMoney || 0))[0] || null;
    const adminSignals = contacts
      .filter((item)=>Number(item.seriousness || 0) >= 25 || Number(item.makingMoney || 0) >= 25)
      .sort((a,b)=>Number(b.seriousness || 0) - Number(a.seriousness || 0))
      .slice(0, 12);
    const next = patchRankState({
      contacts,
      topProfessional,
      topMakingMoney,
      adminSignals,
      ui: { ...(current.ui || {}), lastAction:'rank-update' }
    });
    renderRankBoard();
    return next;
  }

  function renderRankBoard(container){
    const target = container || document.querySelector('#srRankBoard');
    if (!target) return false;
    const state = getRankState();
    const pro = state.topProfessional || buildCurrentContact();
    const money = state.topMakingMoney || buildCurrentContact();
    target.dataset.srRankBoard = 'true';
    target.style.minHeight = target.style.minHeight || `${Number(state.ui?.boardMinHeight || 280)}px`;
    target.style.contain = target.style.contain || 'layout paint';
    target.innerHTML = `
      <div class="sr-rank-board__header">
        <span>Aria Contact Rank</span>
        <strong>Professional / Making Money</strong>
      </div>
      <div class="sr-rank-board__grid">
        <article>
          <span>#1 Professional</span>
          <strong>${pro.name || 'SupportRD Contact'}</strong>
          <p>Professional Score: ${Number(pro.professional || 0)}</p>
          <small>Seriousness: ${Number(pro.seriousness || 0)} · Protection: ${pro.protection || 'basic'}</small>
        </article>
        <article>
          <span>#1 Making Money</span>
          <strong>${money.name || 'SupportRD Contact'}</strong>
          <p>Money Movement: ${Number(money.makingMoney || 0)}</p>
          <small>Aria Interaction: ${Number(money.ariaInteraction || 0)} · Protection: ${money.protection || 'basic'}</small>
        </article>
      </div>
    `;
    return true;
  }

  function initRankSystem(){
    const state = updateRankBoard();
    return state;
  }

  root.getRankState = getRankState;
  root.patchRankState = patchRankState;
  root.updateRankBoard = updateRankBoard;
  root.renderRankBoard = renderRankBoard;
  root.initRankSystem = initRankSystem;
})();