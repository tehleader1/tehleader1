(() => {
  const KEY = "sr_rebuild_state_v1";
  const DEFAULTS = {
    route: "",
    diaryLevel: "Intro",
    diaryHistorySize: "small",
    diaryText: "",
    diaryUseCase: "Use case: talk through your hair issue and save it cleanly.",
    diaryDescription: "",
    diaryFeed: [],
    diaryHidden: false,
    diarySocial: {
      instagram: true,
      facebook: true,
      tiktok: true,
      x: true,
      snapchat: false,
      linkedin: true
    },
    liveMode: false,
    profile: {
      name: "",
      picture: "",
      contact: "https://supportrd.com/live",
      tone: "Professional",
      professionalMode: false,
      professionalTask: "",
      professionalSlide: 0,
      aiAssists: [
        "Hair-aware under pressure.",
        "Carries a polished routine.",
        "Reads as presentable today."
      ],
      summary: [
        "Calm about hair and routine.",
        "Presenting a neat, modern profile.",
        "Open to guided product support.",
        "Keeps a polished personal image.",
        "Ready for on-the-go help.",
        "Builds trust through consistency."
      ],
      verified: "Hair relaxed, drying after cleaning.",
      credentials: "Today this profile reads polished, prepared, and socially aware."
    },
    map: "default",
    push: true,
    premium: "None",
    account: {
      engine: "PocketBase Ready",
      pocketbaseUrl: "http://127.0.0.1:8090",
      email: "",
      password: "",
      phone: "",
      address: "",
      subscriptionPayDate: "2026-05-01",
      displayName: "SupportRD Guest",
      loggedIn: false,
      plan: "Free",
      historySync: "Pending account sync",
      collapsed: false
    },
    statistics: {
      payments: "Needs verification",
      developerLog: "Developer feed health: public mention found on Merchant Genius; Reddit, GitHub, support, and fan routes ready.",
      contacts: "Tracking serious buyers, fly-ins, and bulk orders.",
      architecture: "Loading architecture stack...",
      adAttribution: "No ad route selected yet."
    },
    adQuestionnaire: "",
    productMenuOpen: true,
    technicalLane: {
      accountLookup: "",
      issueType: "Button stuck",
      graceDays: "3",
      resetButton: false,
      notes: "",
      lastScreenshot: "/static/images/Screenshot_2-3-2026_211121_ccrsupport.my.canva.site.jpeg"
    },
    studioMode: "quick",
    studioPublic: false,
    studioShareUrl: "https://supportrd.com/studio/public",
    publicTracks: [],
    studioBoards: {
      voice: "voice-track.wav",
      beat: "beat-track.wav",
      adlib: "adlib-track.wav",
      instrument: "instrument-track.wav"
    },
    studioRecent: [],
    products: []
  };

  const MAPS = {
    default: {
      title: "Wake-Up Route",
      image: "linear-gradient(135deg, rgba(38,46,64,.96), rgba(255,181,84,.62))",
      perks: [
        { name: "Open GPS", route: "floatDeviceBox", help: "Map / On-The-Go", pro: "Travel routing helps serious field sessions." },
        { name: "Diary Theme", route: "floatSettingsBox", help: "Diary Mode", pro: "Theme posting grows your making-money identity." },
        { name: "Live Gifts", route: "floatSettingsBox", help: "Live Session", pro: "Live gifts show who is commercially engaged." }
      ]
    },
    lumbermill: {
      title: "Lumber Mill",
      image: "linear-gradient(135deg, rgba(76,48,28,.96), rgba(161,111,52,.74))",
      perks: [
        { name: "Deep Voice", route: "floatBoardsBox", help: "Studio FX", pro: "Deep voice pushes the session into confident authority." },
        { name: "Hard Work Intro", route: "floatBoardsBox", help: "Studio Intro", pro: "Intro themes can turn a worker track into a sellable identity." },
        { name: "Studio Tone", route: "floatLiveBox", help: "FAQ / Reel", pro: "Helpful for public-facing sound direction and TV reel tone." }
      ]
    },
    shoreline: {
      title: "Shoreline",
      image: "linear-gradient(135deg, rgba(21,67,88,.94), rgba(41,172,180,.68))",
      perks: [
        { name: "Beach Post Theme", route: "floatSettingsBox", help: "Social URLs", pro: "Beach styling posts can convert to aspirational traffic." },
        { name: "Travel Live Gift", route: "floatSettingsBox", help: "Live Session", pro: "Live gifts boost warm-contact ranking." },
        { name: "Profile Outfit", route: "floatAssistantBox", help: "Profile Credentials", pro: "Credential themes sharpen how buyers see the owner." }
      ]
    },
    citylights: {
      title: "City Lights",
      image: "linear-gradient(135deg, rgba(38,16,82,.95), rgba(255,65,108,.68))",
      perks: [
        { name: "Event Ready", route: "floatAssistantBox", help: "Profile Credentials", pro: "Event-ready credentials help with premium trust." },
        { name: "Night Reel", route: "floatLiveBox", help: "FAQ TV Reel", pro: "A cleaner reel direction supports premium attention." },
        { name: "Pro Contact Boost", route: "floatProfileBox", help: "Statistics / Contacts", pro: "Repeated map use can push this visitor toward professional status." }
      ]
    }
  };

  const ROUTES = {
    floatBoardsBox: "Studio Quick Panel",
    floatProfileBox: "Settings",
    floatSettingsBox: "Diary Mode",
    floatDeviceBox: "Map Change",
    floatLiveBox: "FAQ Lounge",
    floatAssistantBox: "Profile"
  };

  const SUPPORTRD_COPY = {
    title: "SupportRD - Premium Hair Industry Brand",
    brandMark: "SupportRD",
    mission: "SupportRD - We are a revolutionary company in the hair industry and believe true love and passion. This app belongs on phone, tablet, TV, radio, and in your hand the moment hair help is needed.",
    generalOptions: "Perks, fun lanes, and revolutionary reasons to keep using the app.",
    sticky: {
      paymentsTitle: "Payments",
      paymentsBody: "Fast Pay, custom orders, and premium checkout stay one tap away.",
      editsTitle: "Edits Menu",
      infoTitle: "Important Information",
      infoBody: "Main Structure, Statistics, Contacts / Channels, and account memory stay visible while you move.",
      adsTitle: "Ad System",
      adsPrompt: "Which advertisement led you here?"
    },
    statisticsBoard: {
      title: "SupportRD Statistics Drawing Board",
      intro: "Exclusive page handling for the founder view: see what is working, what feels premium, and what SupportRD should push next.",
      pillars: [
        "Main Structure: durable, payment-friendly, responsive, and clearly branded.",
        "General Options: the app must feel fun, useful, and worth opening.",
        "Contacts / Channels: support, payments, routes, fans, and founder contact movement.",
        "Statistics: SEO build, remote usefulness, account flow clarity, and live readiness."
      ]
    },
    ads: [
      {
        title: "21+ Fantasies",
        route: "floatSettingsBox",
        note: "Fantasy pricing, diary privacy, and AI buddy support pushed this visitor toward Diary Mode.",
        price: "$300 basic · $600 advanced",
        meta: "Adult fantasy lane",
        cta: "Open 21+ Fantasies"
      },
      {
        title: "Jake Studio Premium",
        route: "floatProfileBox",
        note: "Pro features, custom shampoo orders, and making-money mode pushed this visitor toward Settings and Payments.",
        price: "$50 Pro entry · custom studio quote",
        meta: "Studio premium lane",
        cta: "Open Jake Studio Premium"
      }
    ]
  };

  const AD_QUESTIONS = [
    { label: "Have tangle issues?", route: "floatLiveBox", note: "FAQ Lounge opened for detangle help." },
    { label: "Have color loss issues?", route: "floatAssistantBox", note: "Profile + hair analysis opened for color support." },
    { label: "Need a hair AI buddy?", route: "floatSettingsBox", note: "Diary Mode opened for hands-free Aria support." },
    { label: "Premium all natural hair products", action: "payments", note: "Fast Pay opened for premium product checkout." },
    { label: "Revolutionary hair app on the go studio", route: "floatBoardsBox", note: "Studio opened for on-the-go creation." }
  ];

  const PROFESSIONAL_SLIDES = [
    "Owner / CEO approve: think about family, legacy, wins, and viral impact before the signature.",
    "Project: always begin with structure, file, document, and engine or the idea turns vacant.",
    "Economics: watch demand, discount timing, repeat buyers, and margin before celebration.",
    "Payment: confirm the card lane, premium state, and proof of transaction before moving on.",
    "Health: if the hair or energy is off, the meeting tone will feel off too.",
    "Inventory: know what is in stock, what is low, and what can ship today.",
    "Legal findings: document claims, approvals, and boundaries before any major public move."
  ];

  const PROFESSIONAL_DIARY_TOPICS = [
    "Economics: margin, demand, and discount timing before any move.",
    "Payment: confirm card lane, premium state, and proof of transaction.",
    "Health: appearance and energy both influence the room.",
    "Project: start with file, document, structure, and engine.",
    "Revenue: know the upside, the repeat rate, and the long tail.",
    "Stock: confirm market tone before bold language or risk.",
    "Inventory: know what is available, delayed, or sold out.",
    "Legal findings: stay exact with claims, contracts, and approvals.",
    "Next big move: what is the strongest action after this meeting?",
    "Owner / CEO approve: think family, legacy, wins, and viral hit."
  ];

  const DEV_FEED_LINKS = [
    {
      title: "Merchant Genius Listing",
      note: "Public SupportRD store mention found last month.",
      url: "https://www.merchantgenius.io/shop/url/supportrd.com"
    },
    {
      title: "Reddit Search",
      note: "Check new public chatter and fan references.",
      url: "https://www.reddit.com/search/?q=SupportRD"
    },
    {
      title: "GitHub Main Repo",
      note: "Track build health, commits, and issue movement.",
      url: "https://github.com/tehleader1/tehleader1"
    },
    {
      title: "Support Mail",
      note: "Open the direct support inbox route.",
      url: "mailto:xxfigueroa1993@yahoo.com?subject=SupportRD%20Developer%20Feed"
    },
    {
      title: "Fan Feedback",
      note: "Open the fan feedback route fast.",
      url: "mailto:xxfigueroa1993@yahoo.com?subject=SupportRD%20Fan%20Feedback"
    }
  ];

  const DEV_FEED_MOMENTS = [
    {
      title: "Early SupportRD Screen",
      note: "One of the early visual leaps where the app started feeling like a living relationship between founder and AI.",
      image: "/static/images/Screenshot_2-3-2026_195020_ccrsupport.my.canva.site.jpeg"
    },
    {
      title: "AI + Human Build Momentum",
      note: "A snapshot from the period where SupportRD started carrying real personality, remote energy, and hair care purpose.",
      image: "/static/images/Screenshot_2-3-2026_211121_ccrsupport.my.canva.site.jpeg"
    },
    {
      title: "SupportRD Identity Era",
      note: "The founder/AI relationship grew into a real product system instead of a loose concept.",
      image: "/static/images/brochure-hero.jpg"
    }
  ];

  let state = loadState();
  let mediaRecorder = null;
  let mediaStream = null;
  let recordChunks = [];
  let studioUndoStack = [];
  const boardAudio = { voice: null, beat: null, adlib: null, instrument: null };
  const boardBlobs = { voice: null, beat: null, adlib: null, instrument: null };
  let currentBoard = "voice";
  let paymentModal = null;
  let routeHost = null;
  let routeGrid = null;
  let professionalReminderTimer = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        ...DEFAULTS,
        ...saved,
        diarySocial: { ...DEFAULTS.diarySocial, ...(saved.diarySocial || {}) },
        profile: { ...DEFAULTS.profile, ...(saved.profile || {}) },
        account: { ...DEFAULTS.account, ...(saved.account || {}) },
        statistics: { ...DEFAULTS.statistics, ...(saved.statistics || {}) },
        technicalLane: { ...DEFAULTS.technicalLane, ...(saved.technicalLane || {}) },
        studioBoards: { ...DEFAULTS.studioBoards, ...(saved.studioBoards || {}) },
        publicTracks: Array.isArray(saved.publicTracks) ? saved.publicTracks : DEFAULTS.publicTracks
      };
    } catch {
      return structuredClone ? structuredClone(DEFAULTS) : JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  function saveState() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function pushDiaryFeed(...lines) {
    state.diaryFeed = [...(state.diaryFeed || []), ...lines].slice(-15);
    saveState();
  }

  function playUiTone(kind = "intro") {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = kind === "outro" ? "triangle" : "sine";
      oscillator.frequency.value = kind === "outro" ? 520 : 680;
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.045, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "outro" ? 0.26 : 0.18));
      oscillator.start(now);
      oscillator.stop(now + (kind === "outro" ? 0.28 : 0.2));
    } catch {}
  }

  function studioSnapshot(label) {
    return {
      label,
      currentBoard,
      boards: { ...state.studioBoards }
    };
  }

  function pushStudioUndo(label) {
    studioUndoStack.push(studioSnapshot(label));
    if (studioUndoStack.length > 20) studioUndoStack = studioUndoStack.slice(-20);
  }

  function saveRecentStudioBuild(label, type = "session") {
    const item = {
      label,
      type,
      savedAt: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      boards: { ...state.studioBoards }
    };
    state.studioRecent = [item, ...(state.studioRecent || [])]
      .slice(0, 3);
    saveState();
  }

  function publishStudioTrack(label) {
    const track = {
      label,
      artist: state.profile.name || state.account.displayName || "SupportRD Artist",
      url: state.studioShareUrl,
      boards: { ...state.studioBoards }
    };
    state.publicTracks = [track, ...(state.publicTracks || [])].slice(0, 6);
    saveState();
  }

  function restoreStudioSnapshot(snapshot) {
    if (!snapshot) return;
    state.studioBoards = { ...DEFAULTS.studioBoards, ...(snapshot.boards || {}) };
    currentBoard = snapshot.currentBoard || "voice";
    saveState();
    renderStudio();
    if ($("srStudioStatus")) {
      $("srStudioStatus").textContent = `${snapshot.label} restored across the motherboards.`;
    }
  }

  async function syncArchitectureStatus() {
    try {
      const res = await fetch("/api/status/architecture", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const layers = data?.layers || {};
      state.statistics.architecture = `OpenAI=${layers.openai || "intelligence"} · PocketBase=${layers.pocketbase || "account memory"} · Frontend=${layers.frontend || "feel"} · Backend=${layers.backend || "operations"} · Transcribe=${layers.transcribe_international || "accessibility"} · Cloud=${layers.cloud || "scale"}`;
      saveState();
      if (document.querySelector(".float-mode-top")) renderShellChrome();
    } catch {}
  }

  function $(id) {
    return document.getElementById(id);
  }

  function injectStyle() {
    if ($("supportRebuildStyle")) return;
    const style = document.createElement("style");
    style.id = "supportRebuildStyle";
    style.textContent = `
      .float-box{display:none !important}
      .float-box.support-rebuild-active{display:block !important}
      .float-mode-shell.support-rebuild-mode{
        min-height:100vh;
        padding:18px 332px 18px 18px;
        display:grid;
        gap:14px;
        align-content:start;
      }
      @media (max-width: 1180px){
        .float-mode-shell.support-rebuild-mode{
          padding:18px !important;
        }
        .support-rebuild-sticky-rail{
          position:static !important;
          width:auto !important;
          margin:10px 0 0 !important;
        }
        .support-rebuild-account-panel{
          position:static !important;
          width:auto !important;
          margin-bottom:12px !important;
        }
        .support-rebuild-hero-layout,
        .support-rebuild-product-featured{
          grid-template-columns:1fr !important;
        }
        .support-rebuild-assistants{right:12px !important;bottom:12px !important}
      }
      .float-mode-shell.support-rebuild-mode .float-mode-footer,
        body.support-rebuild-page #launchMenu,
        body.support-rebuild-page #launchSplash,
        body.support-rebuild-page .topbar,
        body.support-rebuild-page .main-content-row,
        body.support-rebuild-page .brochure-float,
        body.support-rebuild-page #sessionSignal,
        body.support-rebuild-page #satQuickModal,
        body.support-rebuild-page #satQuickOpen,
        body.support-rebuild-page #loginGate,
        body.support-rebuild-page #remotePurchaseEditor,
        body.support-rebuild-page #remoteEditsMenu,
        body.support-rebuild-page #remoteLatestAds,
      .float-mode-shell.support-rebuild-mode .remote-display-strip,
      .float-mode-shell.support-rebuild-mode .remote-stage-shell,
      .float-mode-shell.support-rebuild-mode .float-mode-nav,
      .float-mode-shell.support-rebuild-mode #reelPanel,
      .float-mode-shell.support-rebuild-mode .float-mode-sticky-bottom,
      .float-mode-shell.support-rebuild-mode #floatTGuide,
      .float-mode-shell.support-rebuild-mode .remote-guardian-rail,
      .float-mode-shell.support-rebuild-mode #floatPrimeMenu,
      .float-mode-shell.support-rebuild-mode #floatFounderLayer,
      .float-mode-shell.support-rebuild-mode #sessionSignal,
      .float-mode-shell.support-rebuild-mode #remotePurchaseEditor,
      .float-mode-shell.support-rebuild-mode #remoteEditsMenu{
        display:none !important;
      }
      .float-mode-shell.support-rebuild-mode .float-mode-grid{
        display:none !important;
        margin:0 !important;
        padding:0 !important;
      }
      .float-mode-shell.support-rebuild-mode .float-mode-top,
      .float-mode-shell.support-rebuild-mode .float-mode-launch{
        position:relative;
        z-index:3;
      }
      .float-mode-shell.support-rebuild-mode .float-mode-launch{
        position:relative;
        top:auto;
        z-index:5;
        margin:0 0 34px !important;
        padding:14px !important;
        background:rgba(5,10,20,.74);
        border:1px solid rgba(255,255,255,.12);
        border-radius:26px;
        box-shadow:0 18px 38px rgba(0,0,0,.22);
      }
      .support-rebuild-shell{display:grid;gap:14px}
      .support-rebuild-route-host{display:grid;gap:16px;align-content:start;margin-top:14px;position:relative;z-index:1;min-width:0;scroll-margin-top:18px}
      .support-rebuild-account-panel{position:fixed;top:16px;right:16px;z-index:75;width:min(320px,calc(100vw - 24px));padding:14px;border-radius:22px;background:rgba(7,12,22,.86);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 42px rgba(0,0,0,.28)}
      .support-rebuild-sticky-rail{position:fixed;top:214px;right:16px;z-index:74;width:min(300px,calc(100vw - 24px));display:grid;gap:12px}
      .support-rebuild-sticky-card{padding:14px;border-radius:22px;background:rgba(7,12,22,.90);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 42px rgba(0,0,0,.26);color:#fff}
      .support-rebuild-mini-title{font:700 .92rem/1.2 Georgia,serif;margin:0 0 8px}
      .support-rebuild-mini-list{display:grid;gap:8px}
      .support-rebuild-brand-mark{position:fixed;right:22px;bottom:16px;z-index:73;color:rgba(255,255,255,.9);font:700 1rem/1 Georgia,serif;letter-spacing:.06em;text-shadow:0 6px 18px rgba(0,0,0,.36)}
      .support-rebuild-account-panel.compact .support-rebuild-account-body{display:none}
      .support-rebuild-account-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}
      .support-rebuild-account-kicker{font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.64)}
      .support-rebuild-account-meta{display:grid;gap:8px}
      .support-rebuild-overview{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
      .support-rebuild-home-top{display:grid;gap:12px;grid-template-columns:minmax(0,1.45fr) minmax(280px,.7fr)}
      .support-rebuild-card{background:rgba(9,12,22,.78);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:16px;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.24)}
      .support-rebuild-title{font:700 1.05rem/1.2 Georgia,serif;letter-spacing:.02em;margin:0 0 10px}
      .support-rebuild-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
      .support-rebuild-grid{display:grid;gap:12px}
      .support-rebuild-grid.two{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
      .support-rebuild-store-banner{display:grid;gap:10px}
      .support-rebuild-kicker{font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.7)}
      .support-rebuild-hero-title{font:700 clamp(1.25rem,2.8vw,2rem)/1.06 Georgia,serif;margin:0}
      .support-rebuild-hero-sub{font-size:1rem;line-height:1.5;color:rgba(255,255,255,.88)}
      .support-rebuild-top-tools{display:grid;gap:12px}
      .support-rebuild-hero-layout{display:grid;gap:14px;grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr);align-items:stretch}
      .support-rebuild-hero-visual{min-height:260px;border-radius:22px;background:linear-gradient(180deg,rgba(4,8,18,.16),rgba(4,8,18,.48)),url('/static/images/lezawli.jpeg') center/cover no-repeat;border:1px solid rgba(255,255,255,.12)}
      .support-rebuild-product-strip{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
      .support-rebuild-product-mini{padding:12px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1)}
      .support-rebuild-product-mini .support-rebuild-title{font-size:.96rem;margin-bottom:6px}
      .support-rebuild-mini-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .support-rebuild-product-menu{display:grid;gap:12px;padding:14px;border-radius:22px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(8,12,20,.38),rgba(8,12,20,.72)),url('/static/images/brochure-scroll-store.jpg') center/cover no-repeat}
      .support-rebuild-product-menu[hidden]{display:none!important}
      .support-rebuild-product-featured{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .support-rebuild-product-digital{min-height:230px;border-radius:20px;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;background-size:cover;background-position:center;box-shadow:0 16px 38px rgba(0,0,0,.24);position:relative;overflow:hidden}
      .support-rebuild-product-digital::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,7,14,.08),rgba(3,7,14,.72))}
      .support-rebuild-product-digital > *{position:relative;z-index:1}
      .support-rebuild-ad-banner{min-height:180px;border-radius:20px;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;background-size:cover;background-position:center;box-shadow:0 16px 38px rgba(0,0,0,.22);position:relative;overflow:hidden}
      .support-rebuild-ad-banner::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,16,.1),rgba(5,9,16,.72))}
      .support-rebuild-ad-banner > *{position:relative;z-index:1}
      .support-rebuild-ad-topline{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:auto}
      .support-rebuild-price-badge{display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.92);color:#09111f;font-weight:800;font-size:.84rem;box-shadow:0 10px 24px rgba(0,0,0,.18)}
      .support-rebuild-ad-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:12px}
      .support-rebuild-ad-stat{padding:8px 10px;border-radius:14px;background:rgba(255,255,255,.12);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.14)}
      .support-rebuild-ad-stat strong{display:block;font-size:.74rem;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.72);margin-bottom:4px}
      .support-rebuild-ad-stat span{display:block;font-weight:700;color:#fff;font-size:.9rem}
      .support-rebuild-input,.support-rebuild-select,.support-rebuild-textarea{width:100%;background:#fff;color:#12151f;border:0;border-radius:14px;padding:12px}
      .support-rebuild-textarea{min-height:110px;resize:vertical}
      .support-rebuild-btn{border:0;border-radius:999px;padding:11px 16px;font-weight:700;color:#08101f;background:linear-gradient(135deg,#ffd54a,#55d7ff);cursor:pointer}
      .support-rebuild-btn.ghost{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.14)}
      .support-rebuild-btn.pulse{box-shadow:0 0 0 0 rgba(255,213,74,.6);animation:supportHalo 1.7s infinite}
      @keyframes supportHalo{0%{box-shadow:0 0 0 0 rgba(255,84,84,.65)}25%{box-shadow:0 0 0 10px rgba(255,206,84,.12)}50%{box-shadow:0 0 0 16px rgba(90,233,110,.10)}75%{box-shadow:0 0 0 22px rgba(85,130,255,.08)}100%{box-shadow:0 0 0 0 rgba(85,130,255,0)}}
      .support-rebuild-note{font-size:.92rem;color:rgba(255,255,255,.76)}
      .support-rebuild-history{max-height:240px;overflow:auto;background:rgba(255,255,255,.06);padding:12px;border-radius:16px}
      .support-rebuild-line{padding:6px 0;border-bottom:1px solid rgba(255,255,255,.08)}
      .support-rebuild-line:last-child{border-bottom:0}
      .support-rebuild-diary-preview{font-family:"Segoe Script","Brush Script MT",cursive;background:#fffaf0;color:#21190b;min-height:180px;padding:18px;border-radius:18px}
      .support-rebuild-diary-preview div{min-height:28px}
      .support-rebuild-diary-preview.private{filter:blur(7px);opacity:.45;transition:all .25s ease}
      .support-rebuild-diary-preview.private.revealed{filter:none;opacity:1}
      .support-rebuild-private-note{font-size:12px;color:rgba(255,255,255,.72);margin-top:8px}
      .support-rebuild-gear-pending{display:flex;align-items:center;gap:10px;min-height:24px}
      .support-rebuild-gear-icon{width:18px;height:18px;border:2px dotted rgba(255,255,255,.72);border-radius:50%;animation:srSpin 1.1s linear infinite}
      .support-rebuild-gear-dots::after{content:"";display:inline-block;width:18px;text-align:left;animation:srDots 1s steps(4,end) infinite}
      .support-rebuild-reading-pending{opacity:.45;animation:srPulse 1.1s ease-in-out infinite}
      .support-rebuild-map-carousel{display:flex;gap:12px;overflow:auto;padding-bottom:8px;scroll-snap-type:x mandatory}
      .support-rebuild-map-disc{min-width:220px;scroll-snap-align:start;border-radius:22px;padding:18px;color:#fff;box-shadow:0 18px 40px rgba(0,0,0,.18)}
      .support-rebuild-map-disc:disabled,.support-rebuild-btn:disabled{opacity:.45;cursor:not-allowed;filter:grayscale(.15)}
      .support-rebuild-toggle-on{background:linear-gradient(135deg,#2f9f62,#8bf0b6)!important;color:#06150d!important;border-color:rgba(139,240,182,.72)!important}
      .support-rebuild-toggle-off{background:linear-gradient(135deg,#8f2438,#ff7a7a)!important;color:#fff!important;border-color:rgba(255,122,122,.72)!important}
      .support-rebuild-public-track{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.05)}
      .support-rebuild-moment-card{border-radius:18px;overflow:hidden;background:rgba(255,255,255,.05)}
      .support-rebuild-moment-image{height:160px;background-size:cover;background-position:center}
      .support-rebuild-comment{padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.05);margin-top:8px}
      @keyframes srSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      @keyframes srDots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}100%{content:""}}
      @keyframes srPulse{0%{opacity:.35}50%{opacity:1}100%{opacity:.35}}
      .support-rebuild-map-hero{min-height:140px;border-radius:22px;padding:18px;display:flex;flex-direction:column;justify-content:flex-end;background-size:cover;background-position:center}
      .support-rebuild-perks button{margin:0 8px 8px 0}
      .support-rebuild-board{padding:12px;border-radius:18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}
      .support-rebuild-wave{height:48px;border-radius:14px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.7) 0 2px,transparent 2px 6px),linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,.05));opacity:.85}
      .support-rebuild-progress{height:12px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
      .support-rebuild-progress span{display:block;height:100%;background:linear-gradient(90deg,#ff5f6d,#ffc371,#50e3c2,#4a90e2);width:0%}
      .support-rebuild-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font-size:.88rem}
      .support-rebuild-tv{min-height:180px;border-radius:18px;padding:18px;background:linear-gradient(135deg,rgba(42,16,88,.95),rgba(255,78,80,.65));display:flex;align-items:flex-end}
      .support-rebuild-livefeed{min-height:220px;border-radius:18px;padding:16px;background:linear-gradient(160deg,rgba(10,18,44,.96),rgba(79,117,255,.44));display:grid;gap:12px}
      .support-rebuild-profile-quick{display:grid;gap:10px;grid-template-columns:160px 1fr}
      .support-rebuild-profile-image{min-height:160px;border-radius:20px;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.02));display:flex;align-items:flex-end;justify-content:flex-start;padding:14px;background-size:cover;background-position:center;overflow:hidden}
      .support-rebuild-profile-tag{display:inline-flex;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,.08);font-size:.86rem}
      .support-rebuild-reel-frame{width:100%;min-height:280px;border:0;border-radius:18px;background:#09101f}
      .support-rebuild-assistants{position:fixed;right:18px;bottom:18px;display:grid;gap:10px;z-index:60}
      .support-rebuild-assistant-btn{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(7,12,22,.78);color:#fff;box-shadow:0 18px 40px rgba(0,0,0,.26);animation:supportFloatBob 3.4s ease-in-out infinite}
      .support-rebuild-assistant-btn.jake{animation-delay:1.2s}
      .support-rebuild-assistant-orb{width:18px;height:18px;border-radius:50%}
      .support-rebuild-assistant-orb.aria{background:linear-gradient(135deg,#ffd54a,#55d7ff)}
      .support-rebuild-assistant-orb.jake{background:linear-gradient(135deg,#7cffb2,#4a7dff)}
      .support-rebuild-assistant-bubble{max-width:260px;padding:12px 14px;border-radius:18px;background:rgba(10,18,32,.88);border:1px solid rgba(255,255,255,.12);color:#fff;font-size:.9rem}
      @keyframes supportFloatBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      .support-rebuild-modal{position:fixed;inset:0;background:rgba(2,8,18,.72);display:none;align-items:center;justify-content:center;padding:24px;z-index:9999}
      .support-rebuild-modal.is-open{display:flex}
      .support-rebuild-modal-card{width:min(980px,100%);max-height:88vh;overflow:auto;background:#07101f;color:#fff;border-radius:26px;padding:20px;border:1px solid rgba(255,255,255,.14);box-shadow:0 24px 60px rgba(0,0,0,.35)}
      .float-mode-shell.support-rebuild-mode .float-box{
        position:relative;
        z-index:1;
        margin:0 !important;
        min-height:calc(100vh - 190px);
        border-radius:28px;
        padding:22px;
        background:linear-gradient(180deg, rgba(8,14,25,.82), rgba(13,19,35,.72));
      }
      .float-mode-shell.support-rebuild-mode .float-box.support-rebuild-active{
        position:relative;
        z-index:1;
      }
      .float-mode-shell.support-rebuild-mode .float-mode-top{
        margin:0 !important;
        padding:18px !important;
        display:block !important;
      }
      .float-mode-shell.support-rebuild-mode .float-mode-actions,
      .float-mode-shell.support-rebuild-mode .remote-go-toggle{
        display:none !important;
      }
      .float-mode-shell.support-rebuild-mode .float-box-head{
        margin-bottom:18px;
      }
    `;
    document.head.appendChild(style);
  }

  function activateRoute(routeId) {
    if (!routeHost) ensureRouteHost();
    state.route = routeId || "";
    saveState();
    const shell = document.querySelector(".float-mode-shell");
    if (shell) shell.dataset.remoteTheme = state.map === "default" ? "default" : state.map;
    if (routeGrid && routeHost) {
      document.querySelectorAll(".float-box").forEach((box) => {
        if (box.parentElement === routeHost) routeGrid.appendChild(box);
        box.classList.remove("support-rebuild-active");
      });
      if (routeId) {
        const activeBox = document.getElementById(routeId);
        if (activeBox) {
          routeHost.innerHTML = "";
          routeHost.appendChild(activeBox);
          activeBox.classList.add("support-rebuild-active");
        }
      } else {
        routeHost.innerHTML = "";
      }
    } else {
      document.querySelectorAll(".float-box").forEach((box) => {
        box.classList.toggle("support-rebuild-active", !!routeId && box.id === routeId);
      });
    }
    document.querySelectorAll(".float-launch-btn").forEach((btn) => {
      btn.classList.toggle("pulse-ring", !!routeId && btn.dataset.floatTarget === routeId);
    });
    document.body.classList.toggle("support-route-open", !!routeId);
    updateAssistantDock(routeId ? `Aria and Jake moved into ${ROUTES[routeId] || "SupportRD"}.` : "Aria and Jake are moving with the page. Tap them when you need them.");
    bindAssistantMotion();
    if (routeId && routeHost) {
      requestAnimationFrame(() => {
        routeHost.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  function openQuestionnaireRoute(item) {
    if (!item) return;
    state.adQuestionnaire = item.label;
    state.statistics.adAttribution = item.note;
    saveState();
    renderStickyPanels();
    if (item.action === "payments") {
      openPaymentModal();
      return;
    }
    if (item.route) activateRoute(item.route);
  }

  function formatDiaryLines(text) {
    const words = (text || "").trim().split(/\s+/).filter(Boolean);
    const lines = [];
    while (words.length && lines.length < 4) lines.push(words.splice(0, 9).join(" "));
    while (lines.length < 4) lines.push("");
    return lines;
  }

  function openPlatforms() {
    const message = encodeURIComponent(state.diaryDescription || state.diaryUseCase);
    const liveCodeUrl = encodeURIComponent(`${state.profile.contact || "https://supportrd.com/live"}?ref=diary-live`);
    const urls = {
      instagram: "https://www.instagram.com/",
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://supportrd.com")}&quote=${message}`,
      tiktok: "https://www.tiktok.com/upload",
      x: `https://twitter.com/intent/tweet?text=${message}`,
      snapchat: "https://www.snapchat.com/",
      linkedin: `https://www.linkedin.com/feed/?shareActive=true&text=${message}`
    };
    Object.entries(state.diarySocial).forEach(([platform, enabled]) => {
      if (enabled) window.open(urls[platform], "_blank", "noopener");
    });
    pushDiaryFeed(`SupportRD share pack ready. Live code link: ${decodeURIComponent(liveCodeUrl)}`);
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      state.products = Array.isArray(data) ? data : [];
      saveState();
    } catch {
      state.products = [];
    }
    if (document.querySelector(".float-mode-top")) renderShellChrome();
  }

  function toggleProductMenu(forceValue) {
    state.productMenuOpen = typeof forceValue === "boolean" ? forceValue : !state.productMenuOpen;
    saveState();
    renderShellChrome();
  }

  function getCheckoutUrl(product) {
    const variantId = String(product?.variants?.[0]?.id || product?.variant || "").replace(/\D/g, "");
    const handle = String(product?.handle || "").trim();
    if (variantId) return `/checkout/${variantId}?src=remote`;
    if (handle) return `/products/${handle}`;
    return "/cart";
  }

  function openCheckoutForProduct(product, titleOverride) {
    const title = titleOverride || product?.title || "SupportRD product";
    const url = getCheckoutUrl(product);
    state.statistics.payments = `Checkout launched for ${title}`;
    state.account.historySync = "Pending payment verification";
    saveState();
    renderShellChrome();
    window.location.assign(url);
  }

  function ensurePaymentModal() {
    if (paymentModal) return paymentModal;
    paymentModal = document.createElement("div");
    paymentModal.className = "support-rebuild-modal";
    paymentModal.id = "srPaymentModal";
    paymentModal.innerHTML = `<div class="support-rebuild-modal-card"><div id="srPaymentModalBody"></div></div>`;
    paymentModal.addEventListener("click", (event) => {
      if (event.target === paymentModal) paymentModal.classList.remove("is-open");
    });
    document.body.appendChild(paymentModal);
    return paymentModal;
  }

  function openPaymentModal() {
    const modal = ensurePaymentModal();
    const body = $("srPaymentModalBody");
    const products = state.products.slice(0, 8);
    body.innerHTML = `
      <div class="support-rebuild-row" style="justify-content:space-between">
        <h3 class="support-rebuild-title">Fast Pay</h3>
        <button class="support-rebuild-btn ghost" id="srClosePaymentModal">Close</button>
      </div>
      <div class="support-rebuild-note">Open Purchase Menu stays descriptive. Shopify Checkout should move straight into the card lane.</div>
      <div class="support-rebuild-grid two" style="margin-top:14px">
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Custom Order</div>
          <div class="support-rebuild-note">Email the founder before Fast Pay if the order is manual or specialized.</div>
          <div class="support-rebuild-row" style="margin-top:12px">
            <a class="support-rebuild-btn ghost" href="mailto:xxfigueroa1993@yahoo.com?subject=SupportRD%20Custom%20Order" target="_blank" rel="noopener">Email Custom Order</a>
            <a class="support-rebuild-btn ghost" href="https://supportrd.com/custom-orders" target="_blank" rel="noopener">Open Custom Orders</a>
          </div>
        </div>
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Credit / Debit Capture</div>
          <div class="support-rebuild-note">Shopify Checkout should show the real card page, and Apple Pay / Google Pay appear there when supported.</div>
          <div class="support-rebuild-note" style="margin-top:10px">Account plan right now: ${state.account.plan}. Payments must push premium back into the account memory.</div>
        </div>
      </div>
      <div class="support-rebuild-grid two" style="margin-top:14px">
        ${products.length ? products.map((product) => {
          const title = product.title || "SupportRD Product";
          const price = product.price ? `$${product.price}` : "Live price on checkout";
          const handle = product.handle || "";
          return `<div class="support-rebuild-card" style="padding:12px">
            <div class="support-rebuild-title">${title}</div>
            <div class="support-rebuild-note">${price}</div>
            <div class="support-rebuild-row" style="margin-top:12px">
              <button class="support-rebuild-btn ghost" data-details="${handle}">Open Purchase Menu</button>
              <button class="support-rebuild-btn pulse" data-checkout="${handle}">Shopify Checkout</button>
            </div>
          </div>`;
        }).join("") : `<div class="support-rebuild-card"><div class="support-rebuild-note">Live product feed is empty right now. Using SupportRD storefront fallback.</div><div class="support-rebuild-row" style="margin-top:12px"><a class="support-rebuild-btn pulse" href="https://supportrd.com/cart" target="_blank" rel="noopener">Open Shopify Cart</a></div></div>`}
      </div>
      <div class="support-rebuild-note" style="margin-top:12px">Apple Pay and Google Pay appear on the Shopify side when supported by the device and store settings.</div>`;
    $("srClosePaymentModal").onclick = () => modal.classList.remove("is-open");
    body.querySelectorAll("[data-checkout]").forEach((btn) => btn.onclick = () => {
      const product = products.find((item) => item.handle === btn.dataset.checkout);
      openCheckoutForProduct(product);
    });
    body.querySelectorAll("[data-details]").forEach((btn) => btn.onclick = () => {
      const product = products.find((item) => item.handle === btn.dataset.details);
      const title = product?.title || "SupportRD Product";
      const desc = product?.body_html || product?.description || "Product details are loading from the SupportRD catalog.";
      body.innerHTML = `<div class="support-rebuild-row" style="justify-content:space-between"><h3 class="support-rebuild-title">${title}</h3><button class="support-rebuild-btn ghost" id="srBackPaymentModal">Back</button></div><div class="support-rebuild-note">${desc}</div><div class="support-rebuild-row" style="margin-top:12px"><button class="support-rebuild-btn pulse" id="srCheckoutThis">Go To Credit Card Page</button></div>`;
      $("srBackPaymentModal").onclick = openPaymentModal;
      $("srCheckoutThis").onclick = () => {
        openCheckoutForProduct(product, title);
      };
    });
    modal.classList.add("is-open");
  }

  function openStatisticsBoard() {
    const modal = ensurePaymentModal();
    const body = $("srPaymentModalBody");
    body.innerHTML = `
      <div class="support-rebuild-row" style="justify-content:space-between">
        <h3 class="support-rebuild-title">${SUPPORTRD_COPY.statisticsBoard.title}</h3>
        <button class="support-rebuild-btn ghost" id="srCloseStatsBoard">Close</button>
      </div>
      <div class="support-rebuild-note">${SUPPORTRD_COPY.statisticsBoard.intro}</div>
      <div class="support-rebuild-grid two" style="margin-top:14px">
        ${SUPPORTRD_COPY.statisticsBoard.pillars.map((item) => `<div class="support-rebuild-card" style="padding:12px"><div class="support-rebuild-note">${item}</div></div>`).join("")}
      </div>
      <div class="support-rebuild-grid two" style="margin-top:14px">
          <div class="support-rebuild-card" style="padding:12px">
            <div class="support-rebuild-title">Live Operational Read</div>
            <div class="support-rebuild-note">Payments: ${state.statistics.payments}</div>
            <div class="support-rebuild-note" style="margin-top:8px">Contacts: ${state.statistics.contacts}</div>
            <div class="support-rebuild-note" style="margin-top:8px">Developer Log: ${state.statistics.developerLog}</div>
            <div class="support-rebuild-row" style="margin-top:10px"><button class="support-rebuild-btn ghost" id="srStatsDeveloperFeed">Open Developer Feed</button></div>
          </div>
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Architecture</div>
          <div class="support-rebuild-note">${state.statistics.architecture}</div>
          <div class="support-rebuild-note" style="margin-top:8px">Ad Attribution: ${state.statistics.adAttribution}</div>
        </div>
      </div>`;
    $("srCloseStatsBoard").onclick = () => modal.classList.remove("is-open");
    $("srStatsDeveloperFeed").onclick = openDeveloperFeed;
    modal.classList.add("is-open");
  }

  function openDeveloperFeed() {
    const modal = ensurePaymentModal();
    const body = $("srPaymentModalBody");
    body.innerHTML = `
      <div class="support-rebuild-row" style="justify-content:space-between">
        <h3 class="support-rebuild-title">SupportRD Developer Feed</h3>
        <button class="support-rebuild-btn ghost" id="srCloseDeveloperFeed">Close</button>
      </div>
      <div class="support-rebuild-note">Developer feed health checks public SupportRD mentions, fan chatter, support routes, and builder activity. Email inbox contents still need real inbox integration to appear automatically.</div>
      <div class="support-rebuild-card" style="padding:12px;margin-top:12px">
        <div class="support-rebuild-title">Developer Summary</div>
        <div class="support-rebuild-note">Im chillen right now. Im praying everyday I love what I do it gives me a cycle to get into and I can branch off my hobbies from there. Including Lacross, Paintball, Waking Surfing, River Rafting. I love the point that God put it as a blessing for us to conduct business. Its all or none.</div>
      </div>
      <div class="support-rebuild-grid two" style="margin-top:14px">
        ${DEV_FEED_LINKS.map((item) => `
          <div class="support-rebuild-card" style="padding:12px">
            <div class="support-rebuild-title">${item.title}</div>
            <div class="support-rebuild-note">${item.note}</div>
            <div class="support-rebuild-row" style="margin-top:10px">
              <a class="support-rebuild-btn pulse" href="${item.url}" target="_blank" rel="noopener">Open Feed</a>
            </div>
          </div>`).join("")}
      </div>
      <div class="support-rebuild-card" style="padding:12px;margin-top:12px">
        <div class="support-rebuild-title">Current Activity Read</div>
        <div class="support-rebuild-line">Public article found: Merchant Genius listing for SupportRD.</div>
        <div class="support-rebuild-line">Fan/support routes: open by mail link right now.</div>
        <div class="support-rebuild-line">Repo health: GitHub route is live for builder activity.</div>
        <div class="support-rebuild-line">Next backend step: connect inbox + crawler if you want automatic article/news ingestion.</div>
      </div>
      <div class="support-rebuild-grid two" style="margin-top:12px">
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Live Comments</div>
          <div class="support-rebuild-comment">Merchant Genius found SupportRD publicly as a Shopify store listing.</div>
          <div class="support-rebuild-comment">Support mail and fan mail routes are wired into Developer Feed.</div>
          <div class="support-rebuild-comment">GitHub remains the strongest live builder activity lane right now.</div>
        </div>
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Live Feedback Information</div>
          <div class="support-rebuild-comment">Merchant Genius listing date: March 2026 public presence confirmed.</div>
          <div class="support-rebuild-comment">Reddit search route is ready for public chatter checks.</div>
          <div class="support-rebuild-comment">Inbox automation still needs backend mail integration for true automatic feed updates.</div>
        </div>
      </div>
      <div class="support-rebuild-card" style="padding:12px;margin-top:12px">
        <div class="support-rebuild-title">Best Moments In AI + Human Relationship</div>
        <div class="support-rebuild-note">These are SupportRD founder-history visuals showing the relationship between creative direction and AI system building.</div>
        <div class="support-rebuild-grid three" style="margin-top:12px">
          ${DEV_FEED_MOMENTS.map((item) => `
            <div class="support-rebuild-moment-card">
              <div class="support-rebuild-moment-image" style="background-image:url('${item.image}')"></div>
              <div style="padding:12px">
                <div class="support-rebuild-title">${item.title}</div>
                <div class="support-rebuild-note">${item.note}</div>
              </div>
            </div>`).join("")}
        </div>
      </div>`;
    $("srCloseDeveloperFeed").onclick = () => modal.classList.remove("is-open");
    modal.classList.add("is-open");
  }

  function openTechnicalLane() {
    const modal = ensurePaymentModal();
    const body = $("srPaymentModalBody");
    const lane = state.technicalLane;
    body.innerHTML = `
      <div class="support-rebuild-row" style="justify-content:space-between">
        <h3 class="support-rebuild-title">SupportRD Technical Lane</h3>
        <button class="support-rebuild-btn ghost" id="srCloseTechnicalLane">Close</button>
      </div>
      <div class="support-rebuild-note">This lane is for a future technical person to handle account-related support only. Main core product logic stays locked.</div>
      <div class="support-rebuild-grid two" style="margin-top:14px">
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Main Working State Screenshot</div>
          <div class="support-rebuild-moment-image" style="background-image:url('${lane.lastScreenshot}')"></div>
          <div class="support-rebuild-note" style="margin-top:10px">Use this as the current reference state while helping a customer account.</div>
        </div>
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Allowed Technical Actions</div>
          <div class="support-rebuild-line">Edit stuck account button states</div>
          <div class="support-rebuild-line">Give a few more days for payment</div>
          <div class="support-rebuild-line">Refresh deploy awareness / support notes</div>
          <div class="support-rebuild-line">Account-only assistance, no core system edits</div>
        </div>
      </div>
      <div class="support-rebuild-grid two" style="margin-top:14px">
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Account Issue Controls</div>
          <input class="support-rebuild-input" id="srTechAccountLookup" placeholder="Account email / username" value="${lane.accountLookup || ""}">
          <select class="support-rebuild-select" id="srTechIssueType" style="margin-top:10px">
            ${["Button stuck","Payment grace period","Premium not showing","Account refresh","Profile save help"].map((item)=>`<option ${lane.issueType===item?"selected":""}>${item}</option>`).join("")}
          </select>
          <input class="support-rebuild-input" id="srTechGraceDays" style="margin-top:10px" placeholder="Grace days" value="${lane.graceDays || "3"}">
          <label class="support-rebuild-row support-rebuild-note" style="margin-top:10px"><input type="checkbox" id="srTechResetButton" ${lane.resetButton ? "checked" : ""}> Reset stuck button / account UI state</label>
        </div>
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Technical Notes</div>
          <textarea class="support-rebuild-textarea" id="srTechNotes" placeholder="Support notes for the technical person">${lane.notes || ""}</textarea>
          <div class="support-rebuild-row" style="margin-top:10px">
            <button class="support-rebuild-btn pulse" id="srTechSave">Save Technical Case</button>
            <button class="support-rebuild-btn ghost" id="srTechMail">Open Support Mail</button>
          </div>
          <div class="support-rebuild-note" id="srTechStatus" style="margin-top:10px">Core system locked. Account-only tools active.</div>
        </div>
      </div>`;
    $("srCloseTechnicalLane").onclick = () => modal.classList.remove("is-open");
    $("srTechMail").onclick = () => window.open("mailto:xxfigueroa1993@yahoo.com?subject=SupportRD%20Technical%20Lane", "_blank", "noopener");
    $("srTechSave").onclick = () => {
      lane.accountLookup = $("srTechAccountLookup").value.trim();
      lane.issueType = $("srTechIssueType").value;
      lane.graceDays = $("srTechGraceDays").value.trim();
      lane.resetButton = $("srTechResetButton").checked;
      lane.notes = $("srTechNotes").value;
      state.statistics.contacts = `Technical lane active for ${lane.accountLookup || "account support"} · ${lane.issueType}`;
      saveState();
      renderShellChrome();
      $("srTechStatus").textContent = `Saved account-only technical case for ${lane.accountLookup || "SupportRD visitor"}. Core remains locked.`;
    };
    modal.classList.add("is-open");
  }

  function buildAssistantReply(name, prompt) {
    const text = String(prompt || "").toLowerCase();
    if (/dry|dryness|moist/.test(text)) return `${name === "Jake" ? "Jake" : "Aria"} here. For dryness, I would guide you toward a moisture-building laciador or smoothing support that restores style and softness. The best next move is the purchase menu so we can match the right product and check you out cleanly.`;
    if (/frizz|puff/.test(text)) return `${name === "Jake" ? "Jake" : "Aria"} here. Frizz usually wants control plus hydration, so I would steer you toward a smoother routine and a product lane that supports shine.`;
    if (/studio|song|beat/.test(text)) return `${name} here. I would start with the beat board, place the vocal on top, and then add a focused FX pass before export.`;
    return `${name} here. Tell me the exact hair issue and I will keep it focused, helpful, and ready for the next step.`;
  }

  function speakText(text) {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.93;
      utter.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {}
  }

  function startAssistant(name) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const finish = (heard) => {
      const reply = buildAssistantReply(name, heard);
      playUiTone("outro");
      pushDiaryFeed(
        `${name}: listening activated.`,
        `You: ${heard}`,
        `${name}: responding in 2 seconds...`,
        `${name}: ${reply}`
      );
      renderDiary();
      updateAssistantDock(`${name} is responding now.`);
      setTimeout(() => speakText(reply), 2200);
    };
    if (Recognition) {
      const recog = new Recognition();
      recog.lang = "en-US";
      recog.interimResults = false;
      recog.maxAlternatives = 1;
      recog.onresult = (event) => finish(event.results?.[0]?.[0]?.transcript || "I need help with my hair.");
      recog.onerror = () => finish(prompt(`${name} is ready. Tell ${name} your hair problem.`) || "I need help with my hair.");
      playUiTone("intro");
      recog.start();
      pushDiaryFeed(`${name}: mic open. Speak now.`, "Listening for your hair problem...");
      renderDiary();
      updateAssistantDock(`${name} is listening... take your time.`);
      return;
    }
    finish(prompt(`${name} is ready. Tell ${name} your hair problem.`) || "I need help with my hair.");
  }

  function ensureRouteHost() {
    const shell = document.querySelector(".float-mode-shell");
    routeGrid = document.querySelector(".float-mode-grid");
    const launch = document.querySelector(".float-mode-launch");
    if (!shell || !routeGrid || !launch) return;
    routeHost = document.getElementById("supportRebuildRouteHost");
    if (!routeHost) {
      routeHost = document.createElement("div");
      routeHost.id = "supportRebuildRouteHost";
      routeHost.className = "support-rebuild-route-host";
      launch.insertAdjacentElement("afterend", routeHost);
    }
  }

  function renderAssistantDock() {
    if ($("srAssistantDock")) return;
    const dock = document.createElement("div");
    dock.id = "srAssistantDock";
    dock.className = "support-rebuild-assistants";
    dock.innerHTML = `
      <div class="support-rebuild-assistant-bubble" id="srAssistantBubble">Aria and Jake move with the page and jump in when it matters.</div>
      <button class="support-rebuild-assistant-btn" id="srDockAria"><span class="support-rebuild-assistant-orb aria"></span><span>Aria</span></button>
      <button class="support-rebuild-assistant-btn jake" id="srDockJake"><span class="support-rebuild-assistant-orb jake"></span><span>Jake</span></button>`;
    document.body.appendChild(dock);
    $("srDockAria").onclick = () => startAssistant("Aria");
    $("srDockJake").onclick = () => startAssistant("Jake");
    bindAssistantMotion();
  }

  function renderStickyPanels() {
    let rail = $("srStickyRail");
    if (!rail) {
      rail = document.createElement("aside");
      rail.id = "srStickyRail";
      rail.className = "support-rebuild-sticky-rail";
      document.body.appendChild(rail);
    }
    rail.innerHTML = `
      <section class="support-rebuild-sticky-card">
        <div class="support-rebuild-mini-title">${SUPPORTRD_COPY.sticky.paymentsTitle}</div>
        <div class="support-rebuild-note">${SUPPORTRD_COPY.sticky.paymentsBody}</div>
        <div class="support-rebuild-row" style="margin-top:10px">
          <button class="support-rebuild-btn pulse" id="srStickyPay">Open Fast Pay</button>
        </div>
      </section>
        <section class="support-rebuild-sticky-card">
          <div class="support-rebuild-mini-title">${SUPPORTRD_COPY.sticky.editsTitle}</div>
          <div class="support-rebuild-mini-list">
            <button class="support-rebuild-btn ghost" data-sticky-route="floatBoardsBox">Open Studio</button>
            <button class="support-rebuild-btn ghost" data-sticky-route="floatSettingsBox">Open Diary</button>
            <button class="support-rebuild-btn ghost" data-sticky-route="floatAssistantBox">Open Profile</button>
            <button class="support-rebuild-btn ghost" id="srOpenTechnicalLane">Technical Lane</button>
          </div>
        </section>
        <section class="support-rebuild-sticky-card">
          <div class="support-rebuild-mini-title">${SUPPORTRD_COPY.sticky.infoTitle}</div>
          <div class="support-rebuild-note">${SUPPORTRD_COPY.sticky.infoBody}</div>
          <div class="support-rebuild-note" style="margin-top:10px">${state.statistics.adAttribution}</div>
          <div class="support-rebuild-row" style="margin-top:10px">
            <button class="support-rebuild-btn ghost" id="srOpenStatsBoard">Open Statistics Drawing Board</button>
            <button class="support-rebuild-btn ghost" id="srOpenDeveloperFeed">Developer Feed</button>
          </div>
        </section>
      <section class="support-rebuild-sticky-card">
        <div class="support-rebuild-mini-title">${SUPPORTRD_COPY.sticky.adsTitle}</div>
        <div class="support-rebuild-grid" style="gap:8px">
          ${SUPPORTRD_COPY.ads.map((ad, index) => `<button class="support-rebuild-btn ghost" data-ad-index="${index}">${ad.title}</button>`).join("")}
        </div>
        <div class="support-rebuild-note" style="margin-top:10px">${SUPPORTRD_COPY.sticky.adsPrompt}</div>
        <div class="support-rebuild-mini-list" style="margin-top:10px">
          ${AD_QUESTIONS.map((item, index) => `<button class="support-rebuild-btn ghost" data-ad-question="${index}">${item.label}</button>`).join("")}
        </div>
      </section>`;
    $("srStickyPay")?.addEventListener("click", openPaymentModal);
    $("srOpenStatsBoard")?.addEventListener("click", openStatisticsBoard);
    $("srOpenDeveloperFeed")?.addEventListener("click", openDeveloperFeed);
    $("srOpenTechnicalLane")?.addEventListener("click", openTechnicalLane);
    rail.querySelectorAll("[data-sticky-route]").forEach((btn) => {
      btn.addEventListener("click", () => activateRoute(btn.dataset.stickyRoute));
    });
    rail.querySelectorAll("[data-ad-index]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const ad = SUPPORTRD_COPY.ads[Number(btn.dataset.adIndex)];
        if (!ad) return;
        state.statistics.adAttribution = ad.note;
        saveState();
        renderStickyPanels();
        activateRoute(ad.route);
      });
    });
    rail.querySelectorAll("[data-ad-question]").forEach((btn) => {
      btn.addEventListener("click", () => openQuestionnaireRoute(AD_QUESTIONS[Number(btn.dataset.adQuestion)]));
    });
  }

  function updateAssistantDock(text) {
    if ($("srAssistantBubble")) $("srAssistantBubble").textContent = text;
  }

  function bindAssistantMotion() {
    const dock = $("srAssistantDock");
    if (!dock) return;
    const move = () => {
      const y = Math.min(window.scrollY * 0.08, 42);
      const routeName = ROUTES[state.route] || "SupportRD";
      dock.style.transform = `translateY(${y}px)`;
      updateAssistantDock(`Aria and Jake are moving with ${routeName}.`);
    };
    window.removeEventListener("scroll", move);
    window.addEventListener("scroll", move, { passive: true });
    move();
  }

  function setProfessionalReminder() {
    if (professionalReminderTimer) {
      clearInterval(professionalReminderTimer);
      professionalReminderTimer = null;
    }
    if (!state.profile.professionalMode || !state.profile.professionalTask) return;
    professionalReminderTimer = setInterval(() => {
      const reminder = `Professional Map reminder: ${state.profile.professionalTask}`;
      pushDiaryFeed(`Aria/Jake reminder: ${reminder}`);
      updateAssistantDock(reminder);
      if ("Notification" in window && Notification.permission === "granted") {
        try { new Notification("SupportRD Professional Reminder", { body: reminder }); } catch {}
      }
    }, 300000);
  }

  function accountSummary() {
    const account = state.account || DEFAULTS.account;
    return account.loggedIn
      ? `${account.displayName || account.email || "SupportRD Member"} · ${account.plan}`
      : "Guest mode · account system ready";
  }

  function renderAccountPanel() {
    let panel = $("srAccountPanel");
    if (!panel) {
      panel = document.createElement("aside");
      panel.id = "srAccountPanel";
      document.body.appendChild(panel);
    }
    panel.className = `support-rebuild-account-panel${state.account.collapsed ? " compact" : ""}`;
    panel.innerHTML = `
      <div class="support-rebuild-account-head">
        <div>
          <div class="support-rebuild-account-kicker">Login</div>
          <div class="support-rebuild-title" style="margin:0">SupportRD Account</div>
        </div>
        <button class="support-rebuild-btn ghost" id="srAccountToggle">${state.account.collapsed ? "Open Login" : "Hide Login"}</button>
      </div>
      <div class="support-rebuild-note">${accountSummary()} · ${state.account.engine}</div>
      <div class="support-rebuild-account-body" style="margin-top:10px">
        <div class="support-rebuild-account-meta">
          <input class="support-rebuild-input" id="srAccountPbUrl" placeholder="PocketBase URL" value="${state.account.pocketbaseUrl || ""}">
          <input class="support-rebuild-input" id="srAccountEmail" placeholder="Email / Username" value="${state.account.email || ""}">
          <input class="support-rebuild-input" id="srAccountPassword" type="password" placeholder="Password">
          <input class="support-rebuild-input" id="srAccountName" placeholder="Display Name" value="${state.account.displayName || ""}">
        </div>
        <div class="support-rebuild-row" style="margin-top:10px">
          <button class="support-rebuild-btn pulse" id="srAccountSave">${state.account.loggedIn ? "Update Account" : "Save + Sign In"}</button>
          <button class="support-rebuild-btn ghost" id="srAccountLogout">${state.account.loggedIn ? "Log Out" : "Clear"}</button>
        </div>
        <div class="support-rebuild-note" id="srAccountStatus" style="margin-top:10px">PocketBase-ready account state powers diary, profile, settings, studio memory, and premium history.</div>
      </div>`;
    $("srAccountToggle").onclick = () => {
      state.account.collapsed = !state.account.collapsed;
      saveState();
      renderAccountPanel();
    };
    $("srAccountSave").onclick = () => {
      state.account.pocketbaseUrl = $("srAccountPbUrl").value.trim() || state.account.pocketbaseUrl;
      state.account.email = $("srAccountEmail").value.trim();
      state.account.password = $("srAccountPassword").value;
      state.account.displayName = $("srAccountName").value.trim() || state.account.displayName;
      state.account.loggedIn = !!state.account.email;
      state.account.historySync = state.account.loggedIn ? "Diary/Profile/Studio history ready to sync" : "Pending account sync";
      if (state.account.loggedIn) state.profile.name = state.account.displayName || state.profile.name;
      saveState();
      renderShellChrome();
      renderSettings();
      renderDiary();
      renderProfile();
      renderAccountPanel();
      $("srAccountStatus").textContent = state.account.loggedIn
        ? `Account saved for ${state.account.displayName || state.account.email}. PocketBase URL is set and every Remote panel now reads from the account state.`
        : "Account was saved in guest mode.";
    };
    $("srAccountLogout").onclick = () => {
      state.account.email = "";
      state.account.password = "";
      state.account.loggedIn = false;
      state.account.displayName = "SupportRD Guest";
      state.account.plan = "Free";
      state.account.historySync = "Pending account sync";
      saveState();
      renderShellChrome();
      renderSettings();
      renderDiary();
      renderProfile();
      renderAccountPanel();
    };
  }

  function renderSettings() {
    const box = $("floatProfileBox");
    if (!box) return;
    const professionalMode = !!state.profile.professionalMode;
    const slideIndex = state.profile.professionalSlide || 0;
    box.innerHTML = `
      <div class="support-rebuild-shell">
        <div class="support-rebuild-overview">
          <div class="support-rebuild-card"><div class="support-rebuild-title">Main Structure</div><div class="support-rebuild-note">On-the-go premium operating system for hair support.</div></div>
          <div class="support-rebuild-card"><div class="support-rebuild-title">Statistics</div><div class="support-rebuild-note">${state.statistics.payments}</div></div>
          <div class="support-rebuild-card"><div class="support-rebuild-title">General Options</div><div class="support-rebuild-note">Fun, revolutionary settings stay tucked inside the full lane.</div></div>
          <div class="support-rebuild-card"><div class="support-rebuild-title">Contacts / Channels</div><div class="support-rebuild-note">${state.statistics.contacts}</div></div>
        </div>
        <div class="support-rebuild-card">
          <h3 class="support-rebuild-title">Settings</h3>
          <div class="support-rebuild-row">
            <button class="support-rebuild-btn pulse" id="srPushBtn">${state.push ? "Push Notifications: On" : "Push Notifications: Off"}</button>
            <button class="support-rebuild-btn" id="srOpenFullSettings">Open Full Settings</button>
          </div>
          <div class="support-rebuild-note" id="srSettingsStatus">${professionalMode ? "Professional Mode contained: document reminders, meeting posture, and serious account controls only." : `Premium status: ${state.premium}. Account engine: ${accountSummary()}. Full settings includes links, password, address, and payment review.`}</div>
          <div id="srSettingsFullLane" style="display:none;margin-top:12px" class="support-rebuild-grid two">
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Identity + Security</div>
              <input class="support-rebuild-input" id="srSettingsUsername" placeholder="Username" value="${state.profile.name || ""}">
              <input class="support-rebuild-input" id="srSettingsPhone" style="margin-top:10px" placeholder="Phone number" value="${state.account.phone || ""}">
              <input class="support-rebuild-input" id="srSettingsOldPassword" style="margin-top:10px" type="password" placeholder="Current password">
              <input class="support-rebuild-input" id="srSettingsPassword" style="margin-top:10px" type="password" placeholder="Change password flow">
              <input class="support-rebuild-input" id="srSettingsPasswordConfirm" style="margin-top:10px" type="password" placeholder="Confirm new password">
              <input class="support-rebuild-input" id="srSettingsAddress" style="margin-top:10px" placeholder="Address information" value="${state.account.address || ""}">
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Payments + URLs</div>
              <input class="support-rebuild-input" id="srSettingsPayment" placeholder="Current payment / premium status" value="${state.premium}">
              <input class="support-rebuild-input" id="srSettingsPayDate" style="margin-top:10px" placeholder="Subscription pay date" value="${state.account.subscriptionPayDate || ""}">
              <input class="support-rebuild-input" id="srSettingsUrl" style="margin-top:10px" placeholder="Primary URL link" value="${state.profile.contact || ""}">
              <input class="support-rebuild-input" id="srSettingsDiaryInvite" style="margin-top:10px" placeholder="Invitable Diary Mode link" value="${state.profile.contact || "https://supportrd.com/live"}">
              <input class="support-rebuild-input" id="srSettingsSocialLinks" style="margin-top:10px" placeholder="Diary social links update" value="${Object.values(state.diarySocial || {}).filter(Boolean).join(", ")}">
              <select class="support-rebuild-select" id="srSettingsFantasy" style="margin-top:10px">
                <option>Fantasy Off</option>
                <option>Fantasy Basic</option>
                <option>Fantasy Advanced</option>
              </select>
              <div class="support-rebuild-row" style="margin-top:10px">
                <button class="support-rebuild-btn ghost" id="srSettingsOpenProducts">Open Product Page</button>
                <button class="support-rebuild-btn ghost" id="srSettingsOpenDiaryInvite">Open Diary Invite</button>
              </div>
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Contacts / Channels</div>
              <div class="support-rebuild-note">Email, payments, in-person location, team accessibility, technical support, and fan feedback stay visible here.</div>
              <div class="support-rebuild-note" style="margin-top:10px">Saved main link: ${state.profile.contact || "https://supportrd.com/live"}</div>
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Save Changes</div>
              <div class="support-rebuild-note">Push notifications can request browser permission here so Aria can stay in touch about hair status.</div>
              <button class="support-rebuild-btn pulse" id="srSettingsSaveAll">Save Full Settings</button>
            </div>
          </div>
          ${professionalMode ? `
            <div class="support-rebuild-card" style="margin-top:12px;padding:12px">
              <div class="support-rebuild-title">Professional Workspace Slides</div>
              <div class="support-rebuild-note">PowerPoint feel: quick case scenarios for when hair is not correct for the occasion.</div>
              <div class="support-rebuild-line" id="srProfessionalSlide">${PROFESSIONAL_SLIDES[slideIndex]}</div>
              <div class="support-rebuild-row" style="margin-top:10px">
                <button class="support-rebuild-btn ghost" id="srProfessionalPrev">Previous</button>
                <button class="support-rebuild-btn ghost" id="srProfessionalNext">Next</button>
              </div>
              <div class="support-rebuild-note" style="margin-top:10px">Document reminders: keep `.docx`, `.doc`, `.exe`, and `.txt` files ready for serious business settings.</div>
            </div>` : ""}
        </div>
      </div>`;
    $("srPushBtn").onclick = async () => {
      if ("Notification" in window && Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch {}
      }
      state.push = !state.push;
      saveState();
      renderSettings();
    };
    $("srOpenFullSettings").onclick = () => {
      $("srSettingsStatus").textContent = "Full Settings opened: username/password, payments, URL links, push notifications, and fantasy routing are active.";
      $("srSettingsFullLane").style.display = "grid";
      $("srSettingsSaveAll").onclick = () => {
        const newPass = $("srSettingsPassword").value;
        const confirmPass = $("srSettingsPasswordConfirm").value;
        if (newPass && newPass !== confirmPass) {
          $("srSettingsStatus").textContent = "Password change did not save. New password and confirm password must match.";
          return;
        }
        state.profile.name = $("srSettingsUsername").value.trim();
        state.account.displayName = state.profile.name || state.account.displayName;
        state.account.phone = $("srSettingsPhone").value.trim();
        state.account.address = $("srSettingsAddress").value.trim();
        state.account.subscriptionPayDate = $("srSettingsPayDate").value.trim() || state.account.subscriptionPayDate;
        state.profile.contact = $("srSettingsUrl").value.trim();
        state.premium = $("srSettingsPayment").value.trim() || state.premium;
        state.account.plan = state.premium;
        saveState();
        renderShellChrome();
        renderAccountPanel();
        renderProfile();
        updateAssistantDock("Aria and Jake moved into Settings to confirm your save.");
        $("srSettingsStatus").textContent = newPass
          ? "Full settings saved locally. Password flow accepted, push stays connected, and account controls are obvious now."
          : "Full settings saved locally. Push stays connected through browser notification permission.";
      };
      $("srSettingsOpenProducts").onclick = () => window.open("https://supportrd.com/products", "_blank", "noopener");
      $("srSettingsOpenDiaryInvite").onclick = () => window.open($("srSettingsDiaryInvite").value.trim() || "https://supportrd.com/live", "_blank", "noopener");
    };
    if (professionalMode) {
      $("srProfessionalPrev")?.addEventListener("click", () => {
        state.profile.professionalSlide = (slideIndex - 1 + PROFESSIONAL_SLIDES.length) % PROFESSIONAL_SLIDES.length;
        saveState();
        renderSettings();
      });
      $("srProfessionalNext")?.addEventListener("click", () => {
        state.profile.professionalSlide = (slideIndex + 1) % PROFESSIONAL_SLIDES.length;
        saveState();
        renderSettings();
      });
    }
  }

  function renderDiary() {
    const box = $("floatSettingsBox");
    if (!box) return;
    const lines = formatDiaryLines(state.diaryText);
    const historyLines = state.diaryFeed.length ? state.diaryFeed : ["Chat history empty right before they start.", "Aria is ready for hair talk.", "Jake is waiting for studio help."];
    const liveSessionUrl = `${state.profile.contact || "https://supportrd.com/live"}?room=${encodeURIComponent((state.profile.name || "supportrd-live").toLowerCase().replace(/\s+/g, "-"))}`;
    const professionalMode = !!state.profile.professionalMode;
    box.innerHTML = `
      <div class="support-rebuild-shell">
        <div class="support-rebuild-card">
          <h3 class="support-rebuild-title">Diary Mode</h3>
          <div class="support-rebuild-grid two">
            <div>
              <button class="support-rebuild-btn pulse" id="srSendSocialBtn">Send To Social</button>
              <div class="support-rebuild-note" style="margin-top:8px">${state.diaryUseCase}</div>
              <div class="support-rebuild-note" style="margin-top:8px">Account lane: ${accountSummary()}</div>
            </div>
            <div>
              <label class="support-rebuild-note">Description Box</label>
              <textarea class="support-rebuild-textarea" id="srDiaryDesc">${state.diaryDescription}</textarea>
            </div>
          </div>
          <div class="support-rebuild-grid two" style="margin-top:12px">
            <div>
              <label class="support-rebuild-note">Aria / Jake Level</label>
              <select class="support-rebuild-select" id="srDiaryLevel">
                <option ${state.diaryLevel==="Intro"?"selected":""}>Intro</option>
                <option ${state.diaryLevel==="Advanced"?"selected":""}>Advanced</option>
                <option ${state.diaryLevel==="Inner Circle"?"selected":""}>Inner Circle</option>
                <option ${state.diaryLevel==="Professional / Making Money"?"selected":""}>Professional / Making Money</option>
              </select>
            </div>
            <div class="support-rebuild-row">
              <button class="support-rebuild-btn ghost" id="srHandsFreeBtn">Hands-Free Mode</button>
              <button class="support-rebuild-btn ghost" id="srDiaryLiveBtn">${state.liveMode ? "Stop Live Session" : "Live Session"}</button>
              <button class="support-rebuild-btn ghost" id="srDiarySaveBtn">Save</button>
            </div>
          </div>
          <div class="support-rebuild-grid two" style="margin-top:12px">
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">${professionalMode ? "Professional Share Links" : "Send Links"}</div>
              <div class="support-rebuild-note">${professionalMode ? "Business-only sharing lane for the people that matter." : "Route best options for IG, FB, TikTok, X, Snapchat, and LinkedIn posting."}</div>
              <div class="support-rebuild-note" style="margin-top:8px">Live URL / VR code link: ${liveSessionUrl}</div>
              ${["instagram","facebook","tiktok","x","snapchat","linkedin"].map((p)=>`<label class="support-rebuild-row support-rebuild-note"><input type="checkbox" data-platform="${p}" ${state.diarySocial[p] ? "checked" : ""}/> ${p}</label>`).join("")}
              ${professionalMode ? `<select class="support-rebuild-select" id="srProfessionalDiaryTopic" style="margin-top:10px">${PROFESSIONAL_DIARY_TOPICS.map((topic)=>`<option>${topic}</option>`).join("")}</select>` : ""}
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Aria / Jake</div>
              <div class="support-rebuild-note">${professionalMode ? "Contained business-only assistant lane: economics, payment, health, project, revenue, inventory, legal, and next move." : "Fixed above the history, hands-free ready, and listening for hair problems."}</div>
              <div class="support-rebuild-row" style="margin:10px 0 12px">
                <button class="support-rebuild-btn pulse" id="srTalkAria">Talk To Aria</button>
                <button class="support-rebuild-btn ghost" id="srTalkJake">Talk To Jake</button>
              </div>
              <div class="support-rebuild-history">
                ${historyLines.map((line)=>`<div class="support-rebuild-line">${line}</div>`).join("")}
              </div>
            </div>
          </div>
          <div class="support-rebuild-grid two" style="margin-top:12px">
            <div>
              <label class="support-rebuild-note">Diary Record</label>
              <div class="support-rebuild-row" style="margin-bottom:8px">
                <button class="support-rebuild-btn ghost" id="srDiaryHideBtn">${state.diaryHidden ? "Reveal Private Diary" : "Quick Hide Diary"}</button>
              </div>
              <textarea class="support-rebuild-textarea" id="srDiaryText">${state.diaryText}</textarea>
              <div class="support-rebuild-private-note">Private diary mode is sensitive by design. Only the owner should reveal this page.</div>
            </div>
            <div class="support-rebuild-diary-preview ${state.diaryHidden ? "private" : ""}" id="srDiaryPreview">
              ${lines.map((line)=>`<div>${line}</div>`).join("")}
            </div>
          </div>
          ${state.liveMode ? `<div class="support-rebuild-livefeed" style="margin-top:12px"><div class="support-rebuild-title">Live Session</div><div class="support-rebuild-note">Public display active. Hearts, likes, comments, guest username popup, Fast Pay, and live URL all belong to this lane.</div><div class="support-rebuild-row"><span class="support-rebuild-pill">Heart Support</span><span class="support-rebuild-pill">Two Thumbs Up</span><span class="support-rebuild-pill">Fast Pay Gifts</span><span class="support-rebuild-pill">Guest Username</span></div><div class="support-rebuild-note" style="margin-top:8px">Live room URL: ${liveSessionUrl}</div><div class="support-rebuild-note">Click Live Session again to exit and restore normal diary mode.</div></div>` : ""}
        </div>
      </div>`;
    $("srSendSocialBtn").onclick = openPlatforms;
    $("srDiaryLevel").onchange = (e) => { state.diaryLevel = e.target.value; saveState(); };
    $("srHandsFreeBtn").onclick = () => {
      pushDiaryFeed(
        "Hands-free Aria is now listening to hair problems.",
        "Jake is standing by for studio-toned support.",
        `Current level: ${state.diaryLevel}.`
      );
      renderDiary();
    };
    $("srTalkAria").onclick = () => startAssistant("Aria");
    $("srTalkJake").onclick = () => startAssistant("Jake");
    $("srDiaryLiveBtn").onclick = () => { state.liveMode = !state.liveMode; saveState(); renderDiary(); };
    $("srDiaryHideBtn").onclick = () => {
      state.diaryHidden = !state.diaryHidden;
      saveState();
      renderDiary();
      if (state.diaryHidden) return;
      $("srDiaryPreview")?.classList.add("revealed");
    };
    $("srDiaryText").oninput = () => {
      state.diaryText = $("srDiaryText").value;
      state.diaryHidden = true;
      saveState();
      renderDiary();
    };
    $("srDiarySaveBtn").onclick = () => {
      state.diaryDescription = $("srDiaryDesc").value;
      state.diaryText = $("srDiaryText").value;
      if (professionalMode && $("srProfessionalDiaryTopic")) {
        pushDiaryFeed(`Professional tip saved: ${$("srProfessionalDiaryTopic").value}`);
      }
      document.querySelectorAll("[data-platform]").forEach((cb) => { state.diarySocial[cb.dataset.platform] = cb.checked; });
      pushDiaryFeed(`Diary saved privately for ${(state.profile.name || "SupportRD owner")}.`);
      saveState();
      renderShellChrome();
      renderDiary();
    };
  }

  function renderProfile() {
    const box = $("floatAssistantBox");
    if (!box) return;
    const p = state.profile;
    const professionalMode = !!p.professionalMode;
    const profileImageStyle = p.picture
      ? `style="background-image:linear-gradient(180deg, rgba(8,12,20,.10), rgba(8,12,20,.62)), url('${p.picture.replace(/'/g, "%27")}')"`
      : "";
    box.innerHTML = `
      <div class="support-rebuild-shell">
        <div class="support-rebuild-card">
          <h3 class="support-rebuild-title">Profile</h3>
          <div class="support-rebuild-profile-quick">
            <div class="support-rebuild-profile-image" ${profileImageStyle}>
              <span class="support-rebuild-profile-tag">${p.name || "SupportRD Profile"}</span>
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Registered Profile</div>
              <div class="support-rebuild-row">
                <span class="support-rebuild-pill">${p.aiAssists[0] || "Hair-aware"}</span>
                <span class="support-rebuild-pill">${p.aiAssists[1] || "Polished routine"}</span>
              </div>
              <div class="support-rebuild-note" style="margin-top:10px">Live location URL: ${p.contact || "https://supportrd.com/live"}</div>
              <div class="support-rebuild-note" style="margin-top:10px">Account status: ${accountSummary()}</div>
              <button class="support-rebuild-btn ${p.professionalMode ? "support-rebuild-toggle-on" : "support-rebuild-toggle-off"}" id="srProfessionalModeBtn" style="margin-top:10px">${p.professionalMode ? "Professional Mode: ON" : "Professional Mode: OFF"}</button>
              ${professionalMode ? `<div class="support-rebuild-note" style="margin-top:10px">Professional task: ${p.professionalTask || "Pending task assignment"}</div>` : ""}
            </div>
          </div>
          <div class="support-rebuild-grid two">
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Set Profile Picture</div>
              <div class="support-rebuild-note">Intelligent profile picture should route back to live mode and identity.</div>
              <input class="support-rebuild-input" id="srProfilePicture" placeholder="Image URL or saved picture note" value="${p.picture}">
              <input class="support-rebuild-input" id="srProfileName" placeholder="Profile name" value="${p.name}" style="margin-top:10px">
              <button class="support-rebuild-btn" id="srProfileSave" style="margin-top:10px">Save Profile</button>
              <button class="support-rebuild-btn ghost" id="srProfileLive" style="margin-top:10px">Open Live Invite</button>
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Latest Results Verified</div>
              <div class="support-rebuild-note">${p.verified}</div>
              <div style="margin-top:12px">${p.aiAssists.map((s)=>`<div class="support-rebuild-line">${s}</div>`).join("")}</div>
            </div>
          </div>
          <div class="support-rebuild-grid two" style="margin-top:12px">
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">General AI Summary</div>
              ${p.summary.map((line)=>`<div class="support-rebuild-line">${line}</div>`).join("")}
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Credentials</div>
              <select class="support-rebuild-select" id="srProfileTone">
                <option ${p.tone==="Laid Back"?"selected":""}>Laid Back</option>
                <option ${p.tone==="Professional"?"selected":""}>Professional</option>
                <option ${p.tone==="Sports"?"selected":""}>Sports</option>
                <option ${p.tone==="Event-Ready"?"selected":""}>Event-Ready</option>
              </select>
              <div class="support-rebuild-note" style="margin-top:12px">${p.credentials}</div>
            </div>
          </div>
          <div class="support-rebuild-grid two" style="margin-top:12px">
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Hair Analysis</div>
              <button class="support-rebuild-btn" id="srHairScanBtn">Begin Hair Scan</button>
              <div class="support-rebuild-progress" style="margin-top:12px"><span id="srHairScanBar"></span></div>
              <div class="support-rebuild-note support-rebuild-reading-pending" id="srHairScanStatus" style="margin-top:10px">Texture, hair color, sign of damage, and hair type will appear here.</div>
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">2-Step Verification</div>
              <div class="support-rebuild-note">Require password plus phone or 6-digit code after 4 hours away.</div>
              <input class="support-rebuild-input" id="srProfileContact" placeholder="Main contact / live invite URL" value="${p.contact}" style="margin-top:10px">
              ${professionalMode ? `<button class="support-rebuild-btn ghost" id="srProfileExportDoc" style="margin-top:10px">Export Professional PDF</button>` : ""}
            </div>
          </div>
        </div>
      </div>`;
    $("srProfileSave").onclick = () => {
      p.picture = $("srProfilePicture").value;
      p.name = $("srProfileName").value;
      p.tone = $("srProfileTone").value;
      p.contact = $("srProfileContact").value;
      state.account.displayName = p.name || state.account.displayName;
      saveState();
      renderShellChrome();
      renderAccountPanel();
      renderProfile();
      updateAssistantDock("Aria and Jake moved into Profile to confirm your update.");
    };
    $("srProfileLive").onclick = () => {
      window.open(p.contact || "https://supportrd.com/live", "_blank", "noopener");
    };
    $("srProfessionalModeBtn").onclick = () => {
      p.professionalMode = !p.professionalMode;
      if (p.professionalMode && !p.professionalTask) {
        p.professionalTask = prompt("Professional Mode task: what are you trying to accomplish?") || "Prepare the next serious move.";
      }
      saveState();
      setProfessionalReminder();
      updateAssistantDock(p.professionalMode ? `Professional Mode active. Task: ${p.professionalTask}` : "Professional Mode turned off. Maps are open again.");
      renderProfile();
      renderMap();
    };
    $("srProfileExportDoc")?.addEventListener("click", () => {
      alert(`Professional export ready for ${p.name || "SupportRD Profile"}. PDF / resume / official document lane is active.`);
    });
    $("srHairScanBtn").onclick = () => {
      const bar = $("srHairScanBar");
      const status = $("srHairScanStatus");
      status.classList.add("support-rebuild-reading-pending");
      status.innerHTML = `<span class="support-rebuild-gear-pending"><span class="support-rebuild-gear-icon"></span><span class="support-rebuild-gear-dots">Pending serious profile reading</span></span>`;
      [10,40,50,60,80,100].forEach((n, idx) => setTimeout(() => {
        bar.style.width = `${n}%`;
        if (n < 100) return;
        p.verified = "Verified: hair ready for professional presentation.";
        status.classList.remove("support-rebuild-reading-pending");
        status.innerHTML = `
          <div class="support-rebuild-line">Aria scan: look left complete. Look right complete.</div>
          <div class="support-rebuild-line">Texture: soft wave</div>
          <div class="support-rebuild-line">Hair problem: light dryness</div>
          <div class="support-rebuild-line">Color: dark brown</div>
          <div class="support-rebuild-line">Category: elegant / straight-curly mix</div>
          <div class="support-rebuild-line">Condition: Healthy / Normal</div>`;
        saveState();
        renderProfile();
      }, 900 * (idx + 1)));
    };
  }

  function renderMap() {
    const box = $("floatDeviceBox");
    if (!box) return;
    const view = MAPS[state.map] || MAPS.default;
    const professionalLock = state.profile.professionalMode && state.map === "default";
    box.innerHTML = `
      <div class="support-rebuild-shell">
        <div class="support-rebuild-card">
          <h3 class="support-rebuild-title">Map Change</h3>
          <div class="support-rebuild-map-hero" style="background:${view.image}">
            <div class="support-rebuild-title">${view.title}</div>
            <div class="support-rebuild-note">Tourist spot / resort brochure feel. Map perks should help diary, live, studio, profile, and matching premium themes.</div>
          </div>
          <div class="support-rebuild-map-carousel" style="margin-top:12px">
            ${Object.keys(MAPS).map((key)=>`<button class="support-rebuild-map-disc ${state.map===key?"pulse":""}" data-map="${key}" ${(professionalLock && key !== "default") ? "disabled" : ""} style="background:${MAPS[key].image}"><div class="support-rebuild-title">${MAPS[key].title}</div><div class="support-rebuild-note">${(professionalLock && key !== "default") ? "Cannot proceed in Professional Mode." : "Swipe or sort this disc to choose the route."}</div></button>`).join("")}
          </div>
          <div class="support-rebuild-perks" style="margin-top:12px">
            ${view.perks.map((perk)=>`<button class="support-rebuild-btn ghost" data-perk="${perk.name}">${perk.name}</button>`).join("")}
          </div>
          <div class="support-rebuild-grid two" style="margin-top:12px">
            ${view.perks.map((perk)=>`<div class="support-rebuild-card" style="padding:12px"><div class="support-rebuild-title">${perk.name}</div><div class="support-rebuild-note">Helps with: ${perk.help}</div><div class="support-rebuild-note" style="margin-top:8px">${perk.pro}</div></div>`).join("")}
          </div>
          <div class="support-rebuild-note" id="srMapStatus">${professionalLock ? "Professional Mode is active. Turn it off in Profile before changing maps from default." : "Choosing a perk should route you to the next best help area. Premium / Pro / 21+ Adult Fantasy Ready should feel matched to the selected theme."}</div>
        </div>
      </div>`;
    box.querySelectorAll("[data-map]").forEach((btn) => btn.onclick = () => {
      if (professionalLock && btn.dataset.map !== "default") {
        $("srMapStatus").textContent = "Cannot proceed in Professional Mode.";
        updateAssistantDock("Cannot proceed in Professional Mode.");
        return;
      }
      state.map = btn.dataset.map;
      saveState();
      syncLaunchVisuals();
      renderMap();
    });
    box.querySelectorAll("[data-perk]").forEach((btn) => btn.onclick = () => {
      const perk = view.perks.find((item) => item.name === btn.dataset.perk) || view.perks[0];
      const next = perk.route;
      state.premium = "Professional / Making Money";
      saveState();
      $("srMapStatus").textContent = `${perk.name} helps with ${perk.help} and now tags this route toward Professional / Making Money.`;
      activateRoute(next);
    });
  }

  function renderStudio() {
    const box = $("floatBoardsBox");
    if (!box) return;
    const recentItems = (state.studioRecent || []).map((item, index) => `
      <button class="support-rebuild-btn ghost" data-recent-index="${index}">
        ${item.label} · ${item.savedAt}
      </button>`).join("");
    box.innerHTML = `
      <div class="support-rebuild-shell">
        <div class="support-rebuild-card">
          <h3 class="support-rebuild-title">Studio Quick Panel</h3>
          <div class="support-rebuild-row">
            <button class="support-rebuild-btn ${state.studioMode === "quick" ? "pulse" : "ghost"}" id="srStudioQuickMode">Quick Mode</button>
            <button class="support-rebuild-btn ${state.studioMode === "full" ? "pulse" : "ghost"}" id="srStudioFullMode">Full Studio Mode</button>
            <button class="support-rebuild-btn ghost" id="srStudioVisibility">${state.studioPublic ? "Make Private" : "Make Public"}</button>
            <button class="support-rebuild-btn ghost" id="srStudioShareSocial">Share To Social</button>
            <button class="support-rebuild-btn pulse" id="srStudioRecord">Record</button>
            <button class="support-rebuild-btn ghost" id="srStudioVideo">Live Record Video</button>
            <button class="support-rebuild-btn ghost" id="srStudioStop">Stop</button>
            <button class="support-rebuild-btn ghost" id="srStudioPlay">Play</button>
            <button class="support-rebuild-btn ghost" id="srStudioPause">Pause</button>
            <button class="support-rebuild-btn ghost" id="srStudioRewind">Rewind</button>
            <button class="support-rebuild-btn ghost" id="srStudioForward">Fast Forward</button>
            <button class="support-rebuild-btn ghost" id="srStudioUndo">Undo</button>
            <button class="support-rebuild-btn ghost" id="srStudioExport">Export File</button>
          </div>
          <div class="support-rebuild-note" style="margin-top:10px">${state.studioMode === "full" ? "Full studio mode opens the whole motherboard lane for vocals, beat, instrument, adlib, FX, video, and recent saved builds." : "Quick mode keeps record, upload, play, and export one tap away."}</div>
          <div class="support-rebuild-grid ${state.studioMode === "full" ? "two" : "three"}" style="display:grid;gap:12px;grid-template-columns:1fr">
            ${["voice","beat","adlib","instrument"].map((board)=>`<div class="support-rebuild-board"><div class="support-rebuild-row"><strong>${board.toUpperCase()} BOARD</strong><button class="support-rebuild-btn ghost" data-board="${board}">Select</button><input type="file" accept="audio/*,video/*" data-upload="${board}"></div><div class="support-rebuild-note" id="srBoardName_${board}">${state.studioBoards[board] || `${board}-track.wav`}</div><div class="support-rebuild-wave"></div><div class="support-rebuild-note" style="margin-top:8px">${board === currentBoard ? "Active motherboard. Record and FX land here." : "Select this motherboard to record or apply edits."}</div></div>`).join("")}
          </div>
          <div class="support-rebuild-grid two" style="margin-top:12px">
            <div>
              <label class="support-rebuild-note">FX Settings</label>
              <select class="support-rebuild-select" id="srStudioFx"><option>Echo</option><option>Reverb</option><option>Fade In</option><option>Fade Out</option><option>Bass</option><option>Treble</option><option>Deep Voice</option><option>Opera Voice</option><option>Slow Motion</option><option>Camera Lighting</option><option>Panoramic</option><option>Zoom</option></select>
            </div>
            <div class="support-rebuild-note" id="srStudioStatus">Ready. Motherboards should play from beginning to end and export with visible progress.</div>
          </div>
          <div class="support-rebuild-grid two" style="margin-top:12px">
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Recent Builds</div>
              <div class="support-rebuild-mini-list">
                ${recentItems || `<div class="support-rebuild-note">The latest 3 builds will stay here after recording, upload, or export.</div>`}
              </div>
              <div class="support-rebuild-note" style="margin-top:10px">Visibility: ${state.studioPublic ? "Public in FAQ Lounge" : "Private to this account"}</div>
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Full Studio Lane</div>
              <div class="support-rebuild-note">Beat, vocal, instrument, and adlib motherboards should line up, play together, undo together, and export into one SupportRD-ready file.</div>
              <div class="support-rebuild-note" style="margin-top:10px">Current board: ${currentBoard.toUpperCase()} · Account lane: ${accountSummary()}</div>
            </div>
          </div>
          <div class="support-rebuild-card" style="margin-top:12px;padding:12px">
            <div class="support-rebuild-title">Export Types</div>
            <div class="support-rebuild-row"><span class="support-rebuild-pill">.mp3</span><span class="support-rebuild-pill">.mp4</span><span class="support-rebuild-pill">.m4a</span></div>
            <div class="support-rebuild-note" style="margin-top:10px">Live recording mode should expose camera settings, panoramic, zoom, wave sweep, lighting, and selfie capture.</div>
          </div>
          <div class="support-rebuild-progress" style="margin-top:12px"><span id="srStudioBar"></span></div>
        </div>
      </div>`;
    $("srStudioQuickMode").onclick = () => { state.studioMode = "quick"; saveState(); renderStudio(); };
    $("srStudioFullMode").onclick = () => { state.studioMode = "full"; saveState(); renderStudio(); };
    $("srStudioVisibility").onclick = () => {
      state.studioPublic = !state.studioPublic;
      if (state.studioPublic) publishStudioTrack(`SupportRD Studio Mix ${new Date().toLocaleDateString()}`);
      saveState();
      renderStudio();
      renderFaqAddon();
    };
    $("srStudioShareSocial").onclick = () => {
      state.diaryDescription = `Listen to my latest SupportRD studio build: ${state.studioShareUrl}`;
      saveState();
      openPlatforms();
    };
    box.querySelectorAll("[data-board]").forEach((btn) => btn.onclick = () => {
      currentBoard = btn.dataset.board;
      $("srStudioStatus").textContent = `Editing ${currentBoard} board. Highlight here before using FX or record.`;
      renderStudio();
    });
    box.querySelectorAll("[data-upload]").forEach((input) => input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      pushStudioUndo(`Before loading ${file.name}`);
      boardAudio[input.dataset.upload] = new Audio(URL.createObjectURL(file));
      state.studioBoards[input.dataset.upload] = file.name;
      saveRecentStudioBuild(`${file.name} into ${input.dataset.upload}`, "upload");
      $(`srBoardName_${input.dataset.upload}`).textContent = file.name;
      $("srStudioStatus").textContent = `${file.name} loaded into ${input.dataset.upload} board.`;
      saveState();
    });
    $("srStudioRecord").onclick = startRecord;
    $("srStudioVideo").onclick = () => { $("srStudioStatus").textContent = "Live Record Video armed: panoramic, zoom, wave sweep, lighting, and selfie capture are the active camera modes."; };
    $("srStudioStop").onclick = stopRecord;
    $("srStudioPlay").onclick = playBoards;
    $("srStudioPause").onclick = () => Object.values(boardAudio).forEach((audio) => audio && audio.pause());
    $("srStudioRewind").onclick = () => Object.values(boardAudio).forEach((audio) => { if (audio) audio.currentTime = 0; });
    $("srStudioForward").onclick = () => Object.values(boardAudio).forEach((audio) => { if (audio) audio.currentTime += 3; });
    $("srStudioUndo").onclick = () => restoreStudioSnapshot(studioUndoStack.pop());
    $("srStudioExport").onclick = exportStudio;
    box.querySelectorAll("[data-recent-index]").forEach((btn) => btn.onclick = () => {
      const item = state.studioRecent?.[Number(btn.dataset.recentIndex)];
      if (!item) return;
      restoreStudioSnapshot(item);
    });
  }

  async function startRecord() {
    try {
      pushStudioUndo(`Before recording ${currentBoard}`);
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordChunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (e) => e.data.size && recordChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordChunks, { type: "audio/webm" });
        boardAudio[currentBoard] = new Audio(URL.createObjectURL(blob));
        const takeName = `${currentBoard}-take.webm`;
        state.studioBoards[currentBoard] = takeName;
        saveRecentStudioBuild(`${takeName} saved`, "recording");
        $(`srBoardName_${currentBoard}`).textContent = takeName;
        $("srStudioStatus").textContent = `${currentBoard} recording saved.`;
        saveState();
        mediaStream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      $("srStudioStatus").textContent = `Recording into ${currentBoard} board now.`;
    } catch {
      $("srStudioStatus").textContent = "Mic permission is needed to record here.";
    }
  }

  function stopRecord() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  }

  function playBoards() {
    Object.values(boardAudio).forEach((audio) => {
      if (!audio) return;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    });
    $("srStudioStatus").textContent = "Playing motherboards from the beginning.";
  }

  function exportStudio() {
    const bar = $("srStudioBar");
    [20,40,60,100].forEach((n, idx) => setTimeout(() => {
      bar.style.width = `${n}%`;
      $("srStudioStatus").textContent = n < 100 ? `Export building ${n}%` : "Export complete. Main studio file is ready.";
      if (n === 100) {
        saveRecentStudioBuild(`SupportRD studio export ${new Date().toLocaleDateString()}`, "export");
        state.statistics.developerLog = "Studio export lane is now producing recent saved builds for founder review.";
        saveState();
        renderShellChrome();
      }
    }, 300 * (idx + 1)));
  }

  function renderFaqAddon() {
    const box = $("floatLiveBox");
    if (!box) return;
    const view = MAPS[state.map] || MAPS.default;
    const professionalMode = !!state.profile.professionalMode;
    const publicTracks = (state.publicTracks || []).map((track, index) => `
      <div class="support-rebuild-public-track">
        <div>
          <div class="support-rebuild-title">${track.label}</div>
          <div class="support-rebuild-note">Artist featured by Studio SupportRD: ${track.artist}</div>
        </div>
        <div class="support-rebuild-row">
          <button class="support-rebuild-btn ghost" data-public-play="${index}">Play</button>
          <button class="support-rebuild-btn ghost" data-public-pause="${index}">Pause</button>
        </div>
      </div>`).join("");
    box.innerHTML = `
      <div class="support-rebuild-shell">
        <div class="support-rebuild-card">
          <h3 class="support-rebuild-title">FAQ Lounge</h3>
          <iframe class="support-rebuild-reel-frame" src="/static/reel.html?v=20260322b&theme=tiktok" title="SupportRD TV Reel"></iframe>
          <div class="support-rebuild-note" style="margin-top:10px">${professionalMode ? "Professional Mode contained: FAQ now leans interviews, world news, and serious answers." : `${view.title} now drives the FAQ reel mood and route ideas.`}</div>
          <div class="support-rebuild-row">
            <button class="support-rebuild-btn pulse">Tiktok Style Hair</button>
            <button class="support-rebuild-btn ghost">Youtube Style Hair</button>
            <button class="support-rebuild-btn ghost">Movies Style Hair</button>
          </div>
          <select class="support-rebuild-select" style="margin-top:12px">
            ${professionalMode ? `
              <option>How should I prepare hair for a professional interview?</option>
              <option>What is the latest world news event affecting image and presentation?</option>
              <option>How do I keep hair serious for business travel?</option>` : `
              <option>What helps dryness fastest?</option>
              <option>How do I detangle without damage?</option>
              <option>What premium level fits me?</option>`}
          </select>
          <div class="support-rebuild-note" style="margin-top:12px">Map-specific links and cool event-style references belong here so the FAQ feels alive instead of static.</div>
            <div class="support-rebuild-grid two" style="margin-top:12px">
              <div class="support-rebuild-card" style="padding:12px">
                <div class="support-rebuild-title">Contacts / Channels</div>
              <div class="support-rebuild-row">
                <a class="support-rebuild-btn ghost" href="mailto:xxfigueroa1993@yahoo.com" target="_blank" rel="noopener">Email</a>
                <button class="support-rebuild-btn ghost" id="srFaqPayments">Payments</button>
                <a class="support-rebuild-btn ghost" href="https://www.google.com/maps/search/Charlotte,+NC" target="_blank" rel="noopener">In-Person</a>
              </div>
              <div class="support-rebuild-note" style="margin-top:10px">Render and GitHub remain the core engine image behind SupportRD operations.</div>
            </div>
              <div class="support-rebuild-card" style="padding:12px">
                <div class="support-rebuild-title">Feedback</div>
                <div class="support-rebuild-row">
                  <button class="support-rebuild-btn ghost" id="srFaqTech">Technical Support</button>
                  <button class="support-rebuild-btn ghost" id="srFaqFan">Fan Feedback</button>
                  <button class="support-rebuild-btn ghost" id="srFaqDeveloperFeed">Developer Feed</button>
                  <button class="support-rebuild-btn ghost" id="srFaqTechnicalLane">Technical Lane</button>
                </div>
              </div>
            </div>
            <div class="support-rebuild-card" style="padding:12px;margin-top:12px">
              <div class="support-rebuild-title">Studio Share Lounge</div>
              <div class="support-rebuild-note">Public tracks from quick studio and full studio show up here fast.</div>
              <div class="support-rebuild-mini-list" style="margin-top:10px">
                ${publicTracks || `<div class="support-rebuild-note">No public SupportRD studio tracks yet. Use Make Public in Studio.</div>`}
              </div>
            </div>
          </div>
        </div>`;
    $("srFaqPayments")?.addEventListener("click", openPaymentModal);
    $("srFaqTech")?.addEventListener("click", ()=>window.open("mailto:xxfigueroa1993@yahoo.com?subject=SupportRD%20Technical%20Support","_blank","noopener"));
    $("srFaqFan")?.addEventListener("click", ()=>window.open("mailto:xxfigueroa1993@yahoo.com?subject=SupportRD%20Fan%20Feedback","_blank","noopener"));
    $("srFaqDeveloperFeed")?.addEventListener("click", openDeveloperFeed);
    $("srFaqTechnicalLane")?.addEventListener("click", openTechnicalLane);
    box.querySelectorAll("[data-public-play]").forEach((btn) => btn.addEventListener("click", () => {
      const track = state.publicTracks?.[Number(btn.dataset.publicPlay)];
      if (!track) return;
      alert(`Playing ${track.label} by ${track.artist} from SupportRD Studio.`);
    }));
    box.querySelectorAll("[data-public-pause]").forEach((btn) => btn.addEventListener("click", () => {
      const track = state.publicTracks?.[Number(btn.dataset.publicPause)];
      if (!track) return;
      alert(`Paused ${track.label}.`);
    }));
  }

  function syncLaunchVisuals() {
    const view = MAPS[state.map] || MAPS.default;
    document.querySelectorAll(".float-launch-btn").forEach((btn) => {
      btn.style.background = state.map === "default"
        ? "linear-gradient(180deg, rgba(4,8,18,.28), rgba(4,8,18,.62)), url('/static/images/woman-waking-up12.jpg') center/cover no-repeat"
        : view.image;
      btn.style.borderRadius = "22px";
      btn.style.color = "#fff";
    });
  }

  function activatePresentationMode() {
    const shell = document.querySelector(".float-mode-shell");
    if (!shell) return;
    document.body.classList.add("support-rebuild-page");
    const app = document.getElementById("app");
    if (app) app.classList.add("support-rebuild-app");
    const launchMenu = document.getElementById("launchMenu");
    if (launchMenu) launchMenu.setAttribute("hidden", "hidden");
    const launchSplash = document.getElementById("launchSplash");
    if (launchSplash) launchSplash.setAttribute("hidden", "hidden");
    const topbar = document.querySelector(".topbar");
    if (topbar) topbar.setAttribute("hidden", "hidden");
    const mainRow = document.querySelector(".main-content-row");
    if (mainRow) mainRow.setAttribute("hidden", "hidden");
    const satBtn = document.getElementById("satQuickOpen");
    if (satBtn) satBtn.setAttribute("hidden", "hidden");
    const satModal = document.getElementById("satQuickModal");
    if (satModal) satModal.setAttribute("hidden", "hidden");
    const brochure = document.querySelector(".brochure-float");
    if (brochure) brochure.setAttribute("hidden", "hidden");
    const loginGate = document.getElementById("loginGate");
    if (loginGate) loginGate.setAttribute("hidden", "hidden");
    shell.hidden = false;
    shell.setAttribute("aria-hidden", "false");
    shell.classList.add("support-rebuild-mode");
    shell.dataset.remoteTheme = state.map === "default" ? "default" : state.map;
    document.body.classList.add("float-mode-active");
  }

  function renderShellChrome() {
    const top = document.querySelector(".float-mode-top");
    if (!top) return;
    const featuredProducts = (state.products || []).slice(0, 3).map((product, index) => {
      const title = product.title || "SupportRD Product";
      const price = product.price ? `$${product.price}` : "Live store pricing";
      const handle = product.handle || "";
      const image = [
        "/static/images/hija-de-felix.jpeg",
        "/static/images/have-healthy-hair.jpeg",
        "/static/images/lezawli.jpeg"
      ][index % 3];
      return `<div class="support-rebuild-product-digital" style="background-image:url('${image}')">
        <div class="support-rebuild-kicker">Digital Product ${index + 1}</div>
        <div class="support-rebuild-title">${title}</div>
        <div class="support-rebuild-note">${price}</div>
        <div class="support-rebuild-mini-actions">
          <button class="support-rebuild-btn ghost" data-top-details="${handle}">Open Product</button>
          <button class="support-rebuild-btn pulse" data-top-checkout="${handle}">Buy Now</button>
        </div>
      </div>`;
    }).join("");
    top.innerHTML = `
        <div class="support-rebuild-home-top">
          <div class="support-rebuild-card">
            <div class="support-rebuild-hero-layout">
              <div class="support-rebuild-store-banner">
                <div class="support-rebuild-kicker">SupportRD Storefront Remote</div>
                <h1 class="support-rebuild-hero-title">Custom order now to feel the hair solution in your scalp.</h1>
                <div class="support-rebuild-hero-sub">Join the SupportRD system and introduce a new cycle for your hair. The Remote should feel like a traditional premium store with enticing descriptions, product confidence, and the exact lane you need right when hair help matters.</div>
                <div class="support-rebuild-row">
                  <button class="support-rebuild-btn pulse" id="srHeroCustomOrder">Custom Order Now</button>
                  <button class="support-rebuild-btn ghost" id="srHeroProducts">${state.productMenuOpen ? "Close Products" : "Products"}</button>
                  <button class="support-rebuild-btn ghost" id="srHeroDiaryInvite">Invitable Diary Mode</button>
                </div>
                <div class="support-rebuild-note">Products should feel open by default like a real store, but never take over the Remote.</div>
              </div>
              <div class="support-rebuild-hero-visual"></div>
            </div>
            <div class="support-rebuild-product-menu" id="srTopProductMenu" ${state.productMenuOpen ? "" : "hidden"}>
              <div class="support-rebuild-title">Products Open By Default</div>
              <div class="support-rebuild-note">The product menu stays visible like a traditional store lane. Custom orders use the full product backdrop and 3 digital product cards so the Remote keeps its retail shampoo feel.</div>
              <div class="support-rebuild-product-featured">
                ${featuredProducts || `
                  <div class="support-rebuild-product-digital" style="background-image:url('/static/images/hija-de-felix.jpeg')">
                    <div class="support-rebuild-kicker">Digital Product 1</div>
                    <div class="support-rebuild-title">Hair Strength Formula</div>
                    <div class="support-rebuild-note">Scalp comfort, cycle support, and daily confidence.</div>
                    <div class="support-rebuild-mini-actions"><a class="support-rebuild-btn pulse" href="https://supportrd.com/products" target="_blank" rel="noopener">Open Product Page</a></div>
                  </div>
                  <div class="support-rebuild-product-digital" style="background-image:url('/static/images/have-healthy-hair.jpeg')">
                    <div class="support-rebuild-kicker">Digital Product 2</div>
                    <div class="support-rebuild-title">Healthy Hair Support</div>
                    <div class="support-rebuild-note">A testimonial-driven lane that makes the store feel alive.</div>
                    <div class="support-rebuild-mini-actions"><a class="support-rebuild-btn ghost" href="https://supportrd.com/products" target="_blank" rel="noopener">Open Product</a></div>
                  </div>
                  <div class="support-rebuild-product-digital" style="background-image:url('/static/images/lezawli.jpeg')">
                    <div class="support-rebuild-kicker">Digital Product 3</div>
                    <div class="support-rebuild-title">SupportRD Signature Bundle</div>
                    <div class="support-rebuild-note">Traditional store confidence with a branded model visual.</div>
                    <div class="support-rebuild-mini-actions"><button class="support-rebuild-btn pulse" id="srFallbackCheckout">Buy Now</button></div>
                  </div>
                `}
              </div>
            </div>
            <div class="support-rebuild-overview" style="margin-top:14px">
              <div class="support-rebuild-card"><div class="support-rebuild-title">Diary Mode</div><div class="support-rebuild-note">Live mode, hands-free Aria, real diary, and hair-problem support.</div></div>
              <div class="support-rebuild-card"><div class="support-rebuild-title">Studio</div><div class="support-rebuild-note">Vocals, beat, instrument, FX, and export-minded creation on the move.</div></div>
              <div class="support-rebuild-card"><div class="support-rebuild-title">Profile</div><div class="support-rebuild-note">Hair analysis, serious image, live invite, and professional prep.</div></div>
              <div class="support-rebuild-card"><div class="support-rebuild-title">Map Change</div><div class="support-rebuild-note">Fun visuals, serious routing, and making-money map help.</div></div>
            </div>
          </div>
          <div class="support-rebuild-card">
            <div class="support-rebuild-top-tools">
              <div class="support-rebuild-grid">
                <div class="support-rebuild-ad-banner" style="background-image:url('/static/images/fantasy-21-plus-main-ad.jpg')">
                  <div class="support-rebuild-ad-topline">
                    <div class="support-rebuild-kicker">Advertisement 1</div>
                    <div class="support-rebuild-price-badge">$300 · $600</div>
                  </div>
                  <div class="support-rebuild-title">21+ Fantasies</div>
                  <div class="support-rebuild-note">Fantasy-ready chemistry, elevated couple energy, and a premium 21+ lane that feels exclusive the moment SupportRD opens.</div>
                  <div class="support-rebuild-ad-stats">
                    <div class="support-rebuild-ad-stat"><strong>Mode</strong><span>21+ Adult Fantasy</span></div>
                    <div class="support-rebuild-ad-stat"><strong>Pricing</strong><span>Basic or Advanced</span></div>
                  </div>
                  <div class="support-rebuild-mini-actions"><button class="support-rebuild-btn pulse" data-ad-open="0">Open 21+ Fantasies</button></div>
                </div>
                <div class="support-rebuild-ad-banner" style="background-image:url('/static/images/jake-studio-premium.jpg')">
                  <div class="support-rebuild-ad-topline">
                    <div class="support-rebuild-kicker">Advertisement 2</div>
                    <div class="support-rebuild-price-badge">$50+ Pro</div>
                  </div>
                  <div class="support-rebuild-title">Jake Studio Premium</div>
                  <div class="support-rebuild-note">Premium studio presence, polished creator energy, and Jake-led booth support for serious sessions that need a richer sound and a higher-end feel.</div>
                  <div class="support-rebuild-ad-stats">
                    <div class="support-rebuild-ad-stat"><strong>Lane</strong><span>Pro / Studio Premium</span></div>
                    <div class="support-rebuild-ad-stat"><strong>Order</strong><span>Custom Quote Ready</span></div>
                  </div>
                  <div class="support-rebuild-mini-actions"><button class="support-rebuild-btn pulse" data-ad-open="1">Open Jake Studio Premium</button></div>
                </div>
              </div>
              <div>
                <div class="support-rebuild-title">General Settings</div>
                <div class="support-rebuild-note">Change password, subscription pay date, change email / username, invite Diary Mode link, social URLs, and product/store access all live here.</div>
              </div>
              <div class="support-rebuild-row">
                <button class="support-rebuild-btn pulse" id="srTopOpenSettings">Open Settings</button>
                <button class="support-rebuild-btn ghost" id="srTopOpenProducts">Products</button>
                <button class="support-rebuild-btn ghost" id="srTopLoginToggle">${state.account.collapsed ? "Open Login" : "Hide Login"}</button>
              </div>
              <div class="support-rebuild-line">Main Structure: durable, payment-friendly, responsive, and store-ready.</div>
              <div class="support-rebuild-line">Statistics: SEO build, remote usefulness, account flow health, live payment readiness, and founder-exclusive drawing board handling.</div>
              <div class="support-rebuild-line">General Options: ${SUPPORTRD_COPY.generalOptions}</div>
              <div class="support-rebuild-line">Contacts / Channels: Render, GitHub, support email, payments, in-person routes, technical support, and fan feedback.</div>
              <div class="support-rebuild-line">Account Engine: ${accountSummary()} · ${state.account.historySync}</div>
              <div class="support-rebuild-line">Architecture: ${state.statistics.architecture}</div>
            </div>
          </div>
        </div>
        <div class="support-rebuild-brand-mark">${SUPPORTRD_COPY.brandMark}</div>`;
    $("srHeroCustomOrder")?.addEventListener("click", () => window.open("mailto:xxfigueroa1993@yahoo.com?subject=SupportRD%20Custom%20Order", "_blank", "noopener"));
    $("srHeroProducts")?.addEventListener("click", () => toggleProductMenu());
    $("srHeroDiaryInvite")?.addEventListener("click", () => activateRoute("floatSettingsBox"));
    $("srTopOpenSettings")?.addEventListener("click", () => activateRoute("floatProfileBox"));
    $("srTopOpenProducts")?.addEventListener("click", () => toggleProductMenu());
    $("srTopLoginToggle")?.addEventListener("click", () => {
      state.account.collapsed = !state.account.collapsed;
      saveState();
      renderAccountPanel();
      renderShellChrome();
    });
    $("srFallbackCheckout")?.addEventListener("click", () => openCheckoutForProduct(null, "SupportRD cart"));
    top.querySelectorAll("[data-ad-open]").forEach((btn) => btn.addEventListener("click", () => {
      const ad = SUPPORTRD_COPY.ads[Number(btn.dataset.adOpen)];
      if (!ad) return;
      state.statistics.adAttribution = ad.note;
      saveState();
      renderStickyPanels();
      activateRoute(ad.route);
    }));
    top.querySelectorAll("[data-top-details]").forEach((btn) => btn.addEventListener("click", () => {
      const handle = btn.dataset.topDetails;
      window.open(handle ? `https://supportrd.com/products/${handle}` : "https://supportrd.com/products", "_blank", "noopener");
    }));
    top.querySelectorAll("[data-top-checkout]").forEach((btn) => btn.addEventListener("click", () => {
      const handle = btn.dataset.topCheckout;
      const product = (state.products || []).find((item) => (item.handle || "") === handle);
      openCheckoutForProduct(product);
    }));
  }

  function bindLaunchButtons() {
    document.querySelectorAll(".float-launch-btn").forEach((btn) => {
      const clone = btn.cloneNode(true);
      btn.replaceWith(clone);
      clone.addEventListener("click", (event) => {
        event.preventDefault();
        activateRoute(clone.dataset.floatTarget);
      });
    });
  }

  function bindQuickGlobalButtons() {
    [
      "floatFooterPayments",
      "remotePurchasePremium",
      "remotePurchaseStudio",
      "remotePurchaseThemes",
      "checkoutPremiumBtn",
      "checkoutProBtn"
    ].forEach((id) => {
      $(id)?.addEventListener("click", (event) => {
        event.preventDefault();
        openPaymentModal();
      });
    });
    $("voiceToggle")?.addEventListener("click", (event) => {
      event.preventDefault();
      startAssistant("Aria");
    });
    $("ariaSphere")?.addEventListener("click", (event) => {
      event.preventDefault();
      startAssistant("Aria");
    });
    $("openProJakeStudio")?.addEventListener("click", (event) => {
      event.preventDefault();
      startAssistant("Jake");
    });
    $("gpsHandsFree")?.addEventListener("click", (event) => {
      event.preventDefault();
      activateRoute("floatSettingsBox");
      startAssistant("Aria");
    });
  }

  function init() {
    state.route = "";
    saveState();
    injectStyle();
      activatePresentationMode();
      ensureRouteHost();
      renderShellChrome();
      renderAccountPanel();
      renderAssistantDock();
    updateAssistantDock("Aria and Jake are moving with the page. Tap them when you need them.");
    bindLaunchButtons();
    bindQuickGlobalButtons();
    renderSettings();
    renderDiary();
    renderProfile();
    renderMap();
    renderStudio();
      renderFaqAddon();
      syncLaunchVisuals();
      setProfessionalReminder();
      activateRoute(state.route);
      fetchProducts();
      syncArchitectureStatus();
      window.SupportRDRemoteRebuildVersion = "20260410g";
    }

  setTimeout(init, 700);
})();






