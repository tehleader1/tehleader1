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
    diaryHistoryCollapsed: false,
    diaryLikes: 28,
    diaryHearts: 14,
    diaryComments: [
      "Visitor lane: watching for the next hair update.",
      "SupportRD live room is open for steady guidance."
    ],
    diaryPostTargets: {
      instagram: "https://www.instagram.com/",
      facebook: "https://www.facebook.com/",
      tiktok: "https://www.tiktok.com/upload",
      x: "https://twitter.com/intent/tweet",
      snapchat: "https://www.snapchat.com/",
      linkedin: "https://www.linkedin.com/feed/"
    },
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
      lastHairStatus: "No verified hair status yet.",
      contact: "https://supportrd.com/live",
      tone: "Professional",
      currentHairState: "",
      socialMood: "",
      aiSummary: "SupportRD profile summary will appear here after the profile reader runs.",
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
      loginProvider: "Guest",
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
    catalogPage: 0,
    catalogSelected: "",
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
    assistantPreset: "Greetings",
    products: [],
    shopify: {
      connected: false,
      storefrontBase: "",
      cartUrl: "/cart",
      ordersUrl: "/account/orders",
      checkoutMap: {},
      checkoutMapLoaded: false
    }
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
  let productModal = null;
  let routeHost = null;
  let routeGrid = null;
  let professionalReminderTimer = null;
  let shellChromeObserver = null;

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

  async function syncShopifyPublicConfig() {
    try {
      const res = await fetch("/api/shopify/public-config", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      state.shopify = {
        connected: !!data?.ok,
        storefrontBase: data?.storefront_base || "",
        cartUrl: data?.cart_url || "/cart",
        ordersUrl: data?.orders_url || "/account/orders",
        checkoutMap: data?.checkout_map || {},
        checkoutMapLoaded: !!data?.checkout_map_loaded
      };
      saveState();
    } catch {}
  }

  function $(id) {
    return document.getElementById(id);
  }

  const LAUNCH_VISUALS = {
    floatSettingsBox: "/static/images/dr-flow-1.jpg",
    floatBoardsBox: "/static/images/dr-flow-2.jpg",
    floatAssistantBox: "/static/images/dr-flow-3.jpg",
    floatDeviceBox: "/static/images/dr-flow-4.jpg",
    floatLiveBox: "/static/images/dr-flow-5.jpg",
    floatProfileBox: "/static/images/dr-flow-6.jpg"
  };

  const DEFAULT_PROFILE_IMAGE = "/static/images/hija-de-felix.jpeg";

  function syncLaunchVisuals() {
    const wakeUpImage = "/static/images/woman-waking-up12.jpg";
    document.querySelectorAll(".float-launch-btn").forEach((btn) => {
      const target = btn.dataset.floatTarget || "";
      const label = ROUTES[target] || btn.textContent.trim();
      const flowImage = LAUNCH_VISUALS[target] || wakeUpImage;
      btn.style.backgroundImage = [
        "linear-gradient(180deg, rgba(3,10,18,.2), rgba(3,10,18,.78))",
        `linear-gradient(130deg, rgba(255,255,255,.04), rgba(255,186,120,.08))`,
        `url('${wakeUpImage}')`,
        `url('${flowImage}')`
      ].join(", ");
      btn.style.backgroundSize = "cover";
      btn.style.backgroundPosition = "center, center, center, center";
      btn.style.backgroundRepeat = "no-repeat, no-repeat, no-repeat, no-repeat";
      btn.style.backgroundBlendMode = "normal, screen, lighten, normal";
      btn.style.boxShadow = "0 18px 36px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.12)";
      btn.setAttribute("aria-label", `${label} - SupportRD Remote`);
      btn.dataset.launchVisual = "support-flow-mix";
    });
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
        padding:18px 18px 120px;
        display:grid;
        gap:18px;
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
      .float-mode-shell.support-rebuild-mode .float-mode-top,
      .float-mode-shell.support-rebuild-mode .float-mode-launch{
        position:relative;
        z-index:3;
      }
      .float-mode-shell.support-rebuild-mode .float-mode-top{
        margin-bottom:0 !important;
      }
      .float-mode-shell.support-rebuild-mode .float-mode-launch{
        position:relative;
        top:auto;
        z-index:5;
        margin:0 !important;
        padding:16px !important;
        width:100%;
        overflow:visible !important;
        background:linear-gradient(180deg,rgba(5,10,20,.92),rgba(11,17,30,.86));
        border:1px solid rgba(255,255,255,.12);
        border-radius:28px;
        box-shadow:0 22px 48px rgba(0,0,0,.28);
      }
      .float-mode-shell.support-rebuild-mode .float-mode-launch{grid-template-columns:repeat(3,minmax(0,1fr)) !important;gap:12px !important}
      .float-mode-shell.support-rebuild-mode .float-launch-btn{position:relative;min-height:134px !important;padding:18px 14px 18px 56px !important;font-size:15px !important;border-radius:22px !important;box-shadow:0 16px 36px rgba(0,0,0,.28);overflow:hidden;isolation:isolate}
      .float-mode-shell.support-rebuild-mode .float-launch-btn::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg, rgba(255,255,255,.06), transparent 44%, rgba(0,0,0,.22));pointer-events:none}
      .support-rebuild-shell{display:grid;gap:14px}
      .support-rebuild-route-host{display:none;gap:16px;align-content:start;position:relative;z-index:4;min-width:0;padding:0;border-radius:0;background:transparent;border:0;box-shadow:none;overflow:visible}
      .support-rebuild-route-host.is-open{display:grid}
      .support-rebuild-route-actions{display:flex;justify-content:flex-end;gap:10px;margin-bottom:0;position:absolute;top:16px;right:16px;z-index:2}
      .support-rebuild-account-panel{position:fixed;top:16px;right:16px;z-index:75;width:min(320px,calc(100vw - 24px));padding:14px;border-radius:22px;background:rgba(7,12,22,.86);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 42px rgba(0,0,0,.28)}
      .support-rebuild-catalog-corner{position:absolute;top:14px;right:340px;z-index:6;width:min(470px,calc(100vw - 720px));display:grid;gap:8px;padding:10px 12px;border-radius:22px;background:rgba(7,12,22,.82);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 42px rgba(0,0,0,.24);backdrop-filter:blur(10px)}
      .support-rebuild-catalog-corner-head{display:flex;justify-content:space-between;gap:10px;align-items:center}
      .support-rebuild-catalog-corner-grid{display:grid;gap:8px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .support-rebuild-catalog-corner-btn{min-height:96px;border-radius:16px;padding:8px;display:flex;align-items:flex-end;justify-content:flex-start;background-size:cover;background-position:center;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.12);cursor:pointer;color:#fff;box-shadow:0 14px 26px rgba(0,0,0,.2)}
      .support-rebuild-catalog-corner-btn::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,8,16,.08),rgba(4,8,16,.82))}
      .support-rebuild-catalog-corner-btn > *{position:relative;z-index:1}
      .support-rebuild-sticky-rail{position:fixed;left:16px;top:50%;transform:translateY(-50%);z-index:74;width:min(200px,calc(100vw - 24px));display:grid;gap:12px}
      .support-rebuild-sticky-card{padding:14px;border-radius:22px;background:rgba(7,12,22,.90);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 42px rgba(0,0,0,.26);color:#fff}
      .support-rebuild-mini-title{font:700 .92rem/1.2 Georgia,serif;margin:0 0 8px}
      .support-rebuild-mini-list{display:grid;gap:8px}
      .support-rebuild-brand-mark{position:fixed;right:22px;bottom:16px;z-index:73;color:rgba(255,255,255,.9);font:700 1rem/1 Georgia,serif;letter-spacing:.06em;text-shadow:0 6px 18px rgba(0,0,0,.36)}
      .support-rebuild-account-panel.compact .support-rebuild-account-body{display:none}
      .support-rebuild-account-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}
      .support-rebuild-account-kicker{font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.64)}
      .support-rebuild-account-meta{display:grid;gap:8px}
      .support-rebuild-overview{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
      .support-rebuild-home-top{display:grid;gap:14px;grid-template-columns:minmax(0,1.25fr) minmax(260px,.75fr);align-items:start}
      .support-rebuild-card{background:rgba(9,12,22,.78);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:16px;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.24)}
      .support-rebuild-title{font:700 1.05rem/1.2 Georgia,serif;letter-spacing:.02em;margin:0 0 10px}
      .support-rebuild-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
      .support-rebuild-grid{display:grid;gap:12px}
      .support-rebuild-grid.two{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
      .support-rebuild-catalog-main{display:grid;gap:12px}
      .support-rebuild-catalog-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .support-rebuild-catalog-copy{display:grid;gap:8px}
      .support-rebuild-catalog-summary{font-size:.94rem;line-height:1.45;color:rgba(255,255,255,.84)}
      .support-rebuild-catalog-callout{min-height:100%;display:grid;gap:10px;align-content:start;padding:14px;border-radius:20px;background:linear-gradient(180deg,rgba(10,18,30,.86),rgba(12,22,38,.72));border:1px solid rgba(255,255,255,.10)}
      .support-rebuild-store-banner{display:grid;gap:10px}
      .support-rebuild-kicker{font-size:.82rem;letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.7)}
      .support-rebuild-hero-title{font:700 clamp(1.25rem,2.8vw,2rem)/1.06 Georgia,serif;margin:0}
      .support-rebuild-hero-sub{font-size:1rem;line-height:1.5;color:rgba(255,255,255,.88)}
      .support-rebuild-top-tools{display:grid;gap:10px}
      .support-rebuild-settings-tab{display:inline-flex;align-items:center;justify-content:center;min-height:64px;padding:14px 18px;border-radius:22px;background:rgba(9,12,22,.86);border:1px solid rgba(255,255,255,.12);box-shadow:0 18px 42px rgba(0,0,0,.24)}
      .support-rebuild-top-meta{display:grid;gap:12px}
      .support-rebuild-hero-layout{display:grid;gap:14px;grid-template-columns:minmax(0,1fr) minmax(220px,.72fr);align-items:stretch}
      .support-rebuild-hero-visual{min-height:220px;border-radius:22px;background:linear-gradient(180deg,rgba(4,8,18,.16),rgba(4,8,18,.48)),url('/static/images/lezawli.jpeg') center/cover no-repeat;border:1px solid rgba(255,255,255,.12)}
      .support-rebuild-remote-stage{display:grid;gap:16px;grid-template-columns:minmax(240px,.68fr) minmax(0,1.45fr) minmax(240px,.68fr);align-items:start}
      .support-rebuild-remote-column{display:grid;gap:14px}
      .support-rebuild-remote-copy{display:grid;gap:10px}
      .support-rebuild-remote-core{display:grid;gap:14px;padding:18px;border-radius:26px;background:linear-gradient(180deg,rgba(6,11,20,.96),rgba(10,16,28,.90));border:1px solid rgba(255,255,255,.12);box-shadow:0 24px 58px rgba(0,0,0,.3)}
      .support-rebuild-remote-core .support-rebuild-title{font-size:1.15rem}
      .support-rebuild-content-shell{display:grid;gap:16px}
      .support-rebuild-content-head{display:flex;justify-content:space-between;gap:12px;align-items:center}
      .support-rebuild-content-head .support-rebuild-title{margin:0}
      .support-rebuild-remote-note{font-size:.92rem;color:rgba(255,255,255,.78)}
      .support-rebuild-aria-menu{display:grid;gap:12px;grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr)}
      .support-rebuild-reader{display:grid;gap:12px;padding:14px;border-radius:18px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
      .support-rebuild-audacity{display:grid;gap:12px;padding:14px;border-radius:22px;background:linear-gradient(180deg,rgba(17,26,42,.96),rgba(8,13,25,.92));border:1px solid rgba(255,255,255,.1)}
      .support-rebuild-audacity-toolbar{display:flex;flex-wrap:wrap;gap:10px}
      .support-rebuild-audacity-track{display:grid;gap:8px;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);cursor:pointer;transition:transform .18s ease, box-shadow .18s ease}
      .support-rebuild-audacity-track.active{transform:translateY(-2px);box-shadow:0 16px 28px rgba(0,0,0,.24);border-color:rgba(255,213,74,.45)}
      .support-rebuild-faq-tv{display:grid;gap:12px}
      .support-rebuild-product-strip{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
      .support-rebuild-product-mini{padding:12px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1)}
      .support-rebuild-product-mini .support-rebuild-title{font-size:.96rem;margin-bottom:6px}
      .support-rebuild-mini-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
      .support-rebuild-product-menu{display:grid;gap:12px;padding:14px;border-radius:22px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(8,12,20,.26),rgba(8,12,20,.64)),url('/static/images/brochure-scroll-store.jpg') center/cover no-repeat}
      .support-rebuild-product-menu[hidden]{display:none!important}
      .support-rebuild-product-featured{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .support-rebuild-product-digital{min-height:230px;border-radius:20px;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;background-size:cover;background-position:center;box-shadow:0 16px 38px rgba(0,0,0,.24);position:relative;overflow:hidden}
      .support-rebuild-product-digital::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,7,14,.08),rgba(3,7,14,.72))}
      .support-rebuild-product-digital > *{position:relative;z-index:1}
      .support-rebuild-catalog-grid{display:grid;gap:12px;grid-template-columns:repeat(3,minmax(0,1fr))}
      .support-rebuild-catalog-card{min-height:170px;border-radius:22px;padding:14px;display:flex;flex-direction:column;justify-content:flex-end;background-size:cover;background-position:center;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.14);box-shadow:0 20px 40px rgba(0,0,0,.22);cursor:pointer;transition:transform .18s ease, box-shadow .18s ease}
      .support-rebuild-catalog-card::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,8,16,.04),rgba(4,8,16,.78))}
      .support-rebuild-catalog-card > *{position:relative;z-index:1}
      .support-rebuild-catalog-card:hover{transform:translateY(-3px);box-shadow:0 26px 44px rgba(0,0,0,.28)}
      .support-rebuild-catalog-detail{display:grid;gap:14px;grid-template-columns:minmax(260px,.9fr) minmax(0,1.1fr);align-items:stretch}
      .support-rebuild-catalog-hero{min-height:340px;border-radius:24px;background-size:cover;background-position:center;position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.12)}
      .support-rebuild-catalog-hero::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,10,18,.12),rgba(5,10,18,.68))}
      .support-rebuild-catalog-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px}
      .support-rebuild-catalog-dots{display:flex;gap:8px;justify-content:center}
      .support-rebuild-catalog-dot{width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,.22)}
      .support-rebuild-catalog-dot.active{background:#ffd54a;box-shadow:0 0 0 4px rgba(255,213,74,.18)}
      .support-rebuild-ad-banner{min-height:240px;border-radius:20px;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;background-size:cover;background-position:center;box-shadow:0 16px 38px rgba(0,0,0,.22);position:relative;overflow:hidden}
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
      .support-rebuild-btn{box-shadow:0 10px 24px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.55);transform:translateY(0);transition:transform .18s ease, box-shadow .18s ease, filter .18s ease}
      .support-rebuild-btn:hover{transform:translateY(-2px);box-shadow:0 16px 28px rgba(0,0,0,.26), inset 0 1px 0 rgba(255,255,255,.6);filter:saturate(1.06)}
      .support-rebuild-btn:active{transform:translateY(1px);box-shadow:0 6px 14px rgba(0,0,0,.22), inset 0 2px 4px rgba(0,0,0,.18)}
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
      .support-rebuild-products-panel{display:none!important}
      .support-rebuild-info-footer{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:73;width:min(620px,calc(100vw - 36px))}
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
        min-height:auto;
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
      body.support-route-open .float-mode-shell.support-rebuild-mode .float-mode-top{
        display:block !important;
      }
      body.support-route-open .float-mode-shell.support-rebuild-mode .float-mode-launch{
        margin-bottom:22px !important;
      }
      .float-mode-shell.support-rebuild-mode .float-mode-actions,
      .float-mode-shell.support-rebuild-mode .remote-go-toggle{
        display:none !important;
      }
      .float-mode-shell.support-rebuild-mode .float-box-head{
        margin-bottom:18px;
      }
      @media (max-width: 980px){
        .support-rebuild-home-top{grid-template-columns:1fr}
        .support-rebuild-hero-layout{grid-template-columns:1fr}
        .float-mode-shell.support-rebuild-mode .float-mode-launch{width:100%;margin-left:0 !important;grid-template-columns:repeat(2,minmax(0,1fr)) !important}
        .support-rebuild-remote-stage,.support-rebuild-aria-menu{grid-template-columns:1fr}
        .support-rebuild-catalog-corner{position:static;width:auto;margin:10px 16px 0}
        .support-rebuild-catalog-corner-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
        .support-rebuild-sticky-rail{left:10px;top:auto;bottom:110px;transform:none;width:min(180px,calc(100vw - 20px))}
        .support-rebuild-route-actions{position:static;justify-content:flex-end}
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
          const actions = document.createElement("div");
          actions.className = "support-rebuild-route-actions";
          actions.innerHTML = `<button class="support-rebuild-btn ghost" id="srCloseRouteView">X</button>`;
          routeHost.appendChild(actions);
          routeHost.appendChild(activeBox);
          activeBox.classList.add("support-rebuild-active");
          routeHost.classList.add("is-open");
          $("srCloseRouteView")?.addEventListener("click", () => closeContentView());
        }
      } else {
        routeHost.innerHTML = `<div class="support-rebuild-card"><div class="support-rebuild-title">SupportRD Content</div><div class="support-rebuild-note">Choose a Remote button and SupportRD will load the live content right here under the Remote.</div></div>`;
        routeHost.classList.add("is-open");
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
  }

  function closeContentView() {
    activateRoute("");
  }

  function enableLegacyRemoteMode() {
    document.body.classList.remove("support-rebuild-page");
    document.documentElement.removeAttribute("data-support-rebuild");
    document.querySelector(".float-mode-shell")?.classList.add("support-rebuild-mode");
    $("srMiniCatalogWidget")?.remove();
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

  function diaryPostUrl(platform) {
    const custom = state.diaryPostTargets?.[platform];
    if (custom) return custom;
    const message = encodeURIComponent(state.diaryDescription || state.diaryUseCase);
    const liveUrl = encodeURIComponent(state.profile.contact || "https://supportrd.com/live");
    const defaults = {
      instagram: "https://www.instagram.com/",
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${liveUrl}&quote=${message}`,
      tiktok: "https://www.tiktok.com/upload",
      x: `https://twitter.com/intent/tweet?text=${message}`,
      snapchat: "https://www.snapchat.com/",
      linkedin: `https://www.linkedin.com/feed/?shareActive=true&text=${message}`
    };
    return defaults[platform] || "https://supportrd.com";
  }

  function openPlatforms() {
    const liveCodeUrl = `${state.profile.contact || "https://supportrd.com/live"}?ref=diary-live`;
    Object.entries(state.diarySocial).forEach(([platform, enabled]) => {
      if (enabled) window.open(diaryPostUrl(platform), "_blank", "noopener");
    });
    pushDiaryFeed(`SupportRD share pack ready. Live code link: ${liveCodeUrl}`);
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
  }

  function toggleProductMenu(forceValue) {
    state.productMenuOpen = typeof forceValue === "boolean" ? forceValue : !state.productMenuOpen;
    saveState();
    renderShellChrome();
  }

  function getCatalogProducts() {
    const live = (state.products || []).map((product, index) => ({
      id: product.handle || `live-${index}`,
      title: product.title || "SupportRD Product",
      price: product.price ? `$${product.price}` : "Live store pricing",
      description: product.body_html || product.description || "SupportRD product support for scalp confidence, hair routine care, and premium results.",
      image: product.image || [
        "/static/images/brochure-scroll-store.jpg",
        "/static/images/hija-de-felix.jpeg",
        "/static/images/have-healthy-hair.jpeg",
        "/static/images/lezawli.jpeg"
      ][index % 4],
      handle: product.handle || ""
    }));
    if (live.length) return live;
    return [
      { id: "catalog-1", title: "Formula Exclusiva", price: "$35", description: "Physical scalp comfort and hair cycle support for a stronger daily routine.", image: "/static/images/hija-de-felix.jpeg", handle: "", physical: true },
      { id: "catalog-2", title: "Aria Premium/Pro", price: "$35 premium · $50 pro", description: "AI beauty guidance, stronger product support, and premium help when the hair day needs real attention.", image: "/static/images/aria-premium-pro-main-ad.jpg", handle: "", physical: false, checkoutPlans: ["premium", "pro"] },
      { id: "catalog-3", title: "Jake Studio Premium", price: "$50+ Pro", description: "Creator-ready studio lane with polished premium booth support and a richer SupportRD sound feel.", image: "/static/images/jake-studio-premium.jpg", handle: "", physical: false, checkoutPlans: ["pro"] },
      { id: "catalog-4", title: "21+ Fantasies", price: "$300 basic · $600 advanced", description: "Exclusive 21+ fantasy lane tied to premium presence, chemistry, and a stronger SupportRD private experience.", image: "/static/images/fantasy-21-plus-main-ad.jpg", handle: "", physical: false, checkoutPlans: ["fantasy300", "fantasy600"] },
      { id: "catalog-5", title: "Shampoo SupportRD", price: "$40", description: "Physical shampoo lane for moisture, bounce, product trust, and visible progress in the hair cycle.", image: "/static/images/have-healthy-hair.jpeg", handle: "", physical: true },
      { id: "catalog-6", title: "Custom Orders", price: "Custom quote", description: "Founder-led custom order support for specialized shampoo lanes, retail confidence, and product expansion.", image: "/static/images/brochure-scroll-store.jpg", handle: "", physical: true },
      { id: "catalog-7", title: "Gotero", price: "$28", description: "Physical scalp-first product guidance for a lighter, cleaner, and better prepared wash-day cycle.", image: "/static/images/lezawli.jpeg", handle: "", physical: true },
      { id: "catalog-8", title: "Profile Hair Scan", price: "Included with profile", description: "Hair analysis, texture guidance, and stronger SupportRD identity with scan-first profile support.", image: "/static/images/hija-de-felix.jpeg", handle: "", physical: false },
      { id: "catalog-9", title: "Diary Private Lane", price: "$20 add-on", description: "Private diary support, live link sharing, and AI comfort when hair problems need a personal place.", image: "/static/images/have-healthy-hair.jpeg", handle: "", physical: false, checkoutPlans: ["yoda"] },
      { id: "catalog-10", title: "Mascarilla", price: "$25", description: "Physical mask support with premium routing and stronger hair presentation help.", image: "/static/images/brochure-scroll-store.jpg", handle: "", physical: true },
      { id: "catalog-11", title: "Studio Share Pack", price: "$15 add-on", description: "Quick studio social share support with polished product and creator-facing presentation.", image: "/static/images/jake-studio-premium.jpg", handle: "", physical: false },
      { id: "catalog-12", title: "Support Bundle", price: "$75", description: "A stronger bundled SupportRD lane for product trust, AI guidance, and scalp-focused results.", image: "/static/images/aria-premium-pro-main-ad.jpg", handle: "", physical: false, checkoutPlans: ["family200"] }
    ];
  }

  function renderCatalogSection() {
    const products = getCatalogProducts();
    const pageSize = 6;
    const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
    const page = Math.max(0, Math.min(state.catalogPage || 0, totalPages - 1));
    state.catalogPage = page;
    state.catalogSelected = "";
    const items = products.slice(page * pageSize, page * pageSize + pageSize);
    return `
      <div class="support-rebuild-catalog-main">
        <div class="support-rebuild-catalog-header">
          <div class="support-rebuild-catalog-copy">
            <div class="support-rebuild-kicker">SupportRD Products Catalog</div>
            <div class="support-rebuild-title">Real product visuals first</div>
            <div class="support-rebuild-catalog-summary">Keep the catalog smaller and cleaner so the Remote stays the main giver of the page, but the real-life product images still grab the eyeballs right away.</div>
          </div>
          <div class="support-rebuild-catalog-callout">
            <div class="support-rebuild-kicker">How It Opens</div>
            <div class="support-rebuild-note">Tap a product and SupportRD opens the full-view product screen with the clean X close. The Remote stays the main controller underneath.</div>
          </div>
        </div>
        <div class="support-rebuild-product-menu">
          <div class="support-rebuild-catalog-grid">
          ${items.map((product) => `
            <button class="support-rebuild-catalog-card" data-catalog-open="${product.id}" style="background-image:url('${product.image}')">
              <div class="support-rebuild-kicker">SupportRD Product</div>
              <div class="support-rebuild-title">${product.title}</div>
              <div class="support-rebuild-price-badge">${product.price}</div>
            </button>`).join("")}
          </div>
        </div>
        <div class="support-rebuild-catalog-pager">
          <button class="support-rebuild-btn ghost" id="srCatalogPrev" ${page === 0 ? "disabled" : ""}>Previous 6</button>
          <div class="support-rebuild-catalog-dots">${Array.from({ length: totalPages }, (_, idx) => `<span class="support-rebuild-catalog-dot ${idx === page ? "active" : ""}"></span>`).join("")}</div>
          <button class="support-rebuild-btn ghost" id="srCatalogNext" ${page >= totalPages - 1 ? "disabled" : ""}>Next 6</button>
        </div>
      </div>`;
  }

  function getCheckoutUrl(product) {
    const variantId = String(product?.variantId || product?.variants?.[0]?.id || product?.variant || "").replace(/\D/g, "");
    if (variantId && state.shopify?.storefrontBase) {
      return `${state.shopify.storefrontBase}/cart/${variantId}:1?ref=supportrd-remote`;
    }
    if (variantId) return `/checkout/${variantId}?src=remote`;
    return state.shopify?.cartUrl || "/cart";
  }

  function getCheckoutEntries(product) {
    const liveVariantId = String(product?.variants?.[0]?.id || product?.variant || "").replace(/\D/g, "");
    if (liveVariantId) {
      return [{
        id: liveVariantId,
        label: product?.price ? `Go To Credit Card Page · ${product.price}` : "Go To Credit Card Page",
        variantId: liveVariantId,
        title: product?.title || "SupportRD Product"
      }];
    }
    const checkoutMap = state.shopify?.checkoutMap || {};
    const planKeys = Array.isArray(product?.checkoutPlans) ? product.checkoutPlans : [];
    return planKeys.map((planKey) => {
      const entry = checkoutMap[planKey];
      const variantId = String(entry?.variant_id || "").replace(/\D/g, "");
      if (!variantId) return null;
      return {
        id: planKey,
        label: `${entry?.label || product?.title || "SupportRD"} · ${entry?.price_label || product?.price || "Checkout"}`,
        variantId,
        title: entry?.label || product?.title || "SupportRD Product"
      };
    }).filter(Boolean);
  }

  function openCheckoutForProduct(product, titleOverride) {
    const title = titleOverride || product?.title || "SupportRD product";
    const url = getCheckoutUrl(product);
    state.statistics.payments = `Checkout launched for ${title} using ${state.shopify?.connected ? "Shopify storefront direct" : "SupportRD checkout redirect"}.`;
    state.account.historySync = "Pending payment verification";
    saveState();
    renderShellChrome();
    window.location.assign(url);
  }

  function ensureProductModal() {
    if (productModal) return productModal;
    productModal = document.createElement("div");
    productModal.className = "support-rebuild-modal";
    productModal.id = "srProductModal";
    productModal.innerHTML = `<div class="support-rebuild-modal-card"><div id="srProductModalBody"></div></div>`;
    productModal.addEventListener("click", (event) => {
      if (event.target === productModal) productModal.classList.remove("is-open");
    });
    document.body.appendChild(productModal);
    return productModal;
  }

  function openCatalogProductModal(product) {
    if (!product) return;
    const modal = ensureProductModal();
    const body = $("srProductModalBody");
    const checkoutEntries = getCheckoutEntries(product);
    body.innerHTML = `
      <div class="support-rebuild-row" style="justify-content:space-between">
        <h3 class="support-rebuild-title">${product.title}</h3>
        <button class="support-rebuild-btn ghost" id="srCloseProductModal">X</button>
      </div>
      <div class="support-rebuild-catalog-detail" style="margin-top:12px">
        <div class="support-rebuild-catalog-hero" style="background-image:url('${product.image}')"></div>
        <div class="support-rebuild-card">
          <div class="support-rebuild-price-badge">${product.price}</div>
          <div class="support-rebuild-note" style="margin-top:14px">${product.description}</div>
          <div class="support-rebuild-note" style="margin-top:12px">${checkoutEntries.length ? "This SupportRD product view should feel real: image first, price clear, description direct, and checkout close by." : "This SupportRD product is visible, but live Shopify variant routing is not mapped yet. The product view stays clean while we finish that payment wiring."}</div>
          <div class="support-rebuild-row" style="margin-top:14px;flex-wrap:wrap">
            ${checkoutEntries.length ? checkoutEntries.map((entry) => `<button class="support-rebuild-btn pulse" data-product-checkout="${entry.id}">${entry.label}</button>`).join("") : `<button class="support-rebuild-btn pulse" id="srProductCheckoutFallback">Open Shopify Cart</button>`}
            <button class="support-rebuild-btn ghost" id="srProductBackCatalog">Back To Main Catalog</button>
          </div>
        </div>
      </div>`;
    $("srCloseProductModal").onclick = () => modal.classList.remove("is-open");
    $("srProductBackCatalog").onclick = () => modal.classList.remove("is-open");
    body.querySelectorAll("[data-product-checkout]").forEach((btn) => {
      const entry = checkoutEntries.find((item) => item.id === btn.dataset.productCheckout);
      if (!entry) return;
      btn.onclick = () => openCheckoutForProduct(entry, entry.title);
    });
    $("srProductCheckoutFallback")?.addEventListener("click", () => openCheckoutForProduct(product, product.title));
    modal.classList.add("is-open");
  }

  function buildCustomOrderSummary(productName) {
    const orderProduct = productName || "SupportRD Product";
    const details = state.customOrderDraft || {};
    const customer = details.customer || state.account.email || "guest@supportrd.com";
    const brief = details.brief || "Need a custom SupportRD product lane.";
    const quantity = details.quantity || "1";
    return [
      `SupportRD Custom Order Pending`,
      `Product: ${orderProduct}`,
      `Customer: ${customer}`,
      `Quantity: ${quantity}`,
      `Notes: ${brief}`
    ].join(" · ");
  }

  function openCustomOrderProductModal(product) {
    const activeProduct = product || {
      title: "SupportRD Product",
      price: "Custom quote",
      description: "Founder-led custom product support with SupportRD retail confidence.",
      image: "/static/images/brochure-scroll-store.jpg"
    };
    const modal = ensureProductModal();
    const body = $("srProductModalBody");
    const draft = state.customOrderDraft || {};
    body.innerHTML = `
      <div class="support-rebuild-row" style="justify-content:space-between">
        <h3 class="support-rebuild-title">${activeProduct.title} Custom Order</h3>
        <button class="support-rebuild-btn ghost" id="srCloseProductModal">X</button>
      </div>
      <div class="support-rebuild-catalog-detail" style="margin-top:12px">
        <div class="support-rebuild-catalog-hero" style="background-image:url('${activeProduct.image}')"></div>
        <div class="support-rebuild-card">
          <div class="support-rebuild-price-badge">${activeProduct.price}</div>
          <div class="support-rebuild-note" style="margin-top:14px">${activeProduct.description}</div>
          <div class="support-rebuild-note" style="margin-top:12px">This is a physical SupportRD product, so the clean full view goes straight into the custom-order lane.</div>
          <div style="margin-top:14px">
            <label class="support-rebuild-note">Choose your custom order product</label>
            <select class="support-rebuild-select" id="srCustomOrderProduct">
              <option ${activeProduct.title === "Formula Exclusiva" ? "selected" : ""}>Formula Exclusiva</option>
              <option ${activeProduct.title === "Gotero" ? "selected" : ""}>Gotero</option>
              <option ${activeProduct.title === "Gotika" ? "selected" : ""}>Gotika</option>
              <option ${activeProduct.title === "Laciador" ? "selected" : ""}>Laciador</option>
              <option ${activeProduct.title === "Mascarilla" ? "selected" : ""}>Mascarilla</option>
              <option ${activeProduct.title === "Shampoo SupportRD" ? "selected" : ""}>Shampoo</option>
            </select>
          </div>
          <div class="support-rebuild-grid two" style="margin-top:14px">
            <input class="support-rebuild-input" id="srCustomOrderCustomer" placeholder="Customer email" value="${draft.customer || state.account.email || ""}">
            <input class="support-rebuild-input" id="srCustomOrderQuantity" placeholder="Quantity" value="${draft.quantity || "1"}">
          </div>
          <textarea class="support-rebuild-textarea" id="srCustomOrderBrief" placeholder="What should SupportRD prepare for this order?" style="margin-top:12px">${draft.brief || ""}</textarea>
          <div class="support-rebuild-note" id="srCustomOrderSummary" style="margin-top:12px">${buildCustomOrderSummary(activeProduct.title)}</div>
          <div class="support-rebuild-row" style="margin-top:14px">
            <button class="support-rebuild-btn pulse" id="srSaveCustomOrder">Save Custom Order</button>
            <button class="support-rebuild-btn ghost" id="srRouteCustomOrderPayment">Route To Payments</button>
          </div>
        </div>
      </div>`;
    $("srCloseProductModal").onclick = () => modal.classList.remove("is-open");
    const syncCustomOrderSummary = () => {
      const selectedTitle = $("srCustomOrderProduct").value;
      state.customOrderDraft = {
        customer: $("srCustomOrderCustomer").value.trim(),
        quantity: $("srCustomOrderQuantity").value.trim() || "1",
        brief: $("srCustomOrderBrief").value.trim()
      };
      $("srCustomOrderSummary").textContent = buildCustomOrderSummary(selectedTitle);
      saveState();
    };
    $("srCustomOrderProduct").onchange = syncCustomOrderSummary;
    $("srCustomOrderCustomer").oninput = syncCustomOrderSummary;
    $("srCustomOrderQuantity").oninput = syncCustomOrderSummary;
    $("srCustomOrderBrief").oninput = syncCustomOrderSummary;
    $("srSaveCustomOrder").onclick = () => {
      syncCustomOrderSummary();
      pushDiaryFeed(`Custom order saved for ${$("srCustomOrderProduct").value}. SupportRD can route this order without leaving the app.`);
    };
    $("srRouteCustomOrderPayment").onclick = () => {
      syncCustomOrderSummary();
      modal.classList.remove("is-open");
      openPaymentModal();
    };
    modal.classList.add("is-open");
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

  function closePaymentModal() {
    ensurePaymentModal().classList.remove("is-open");
  }

  function openPaymentModal() {
    const modal = ensurePaymentModal();
    const body = $("srPaymentModalBody");
    const products = (state.products.length ? state.products : getCatalogProducts()).slice(0, 12);
    const physicalProducts = products.filter((item) => item.physical);
    const digitalProducts = products.filter((item) => !item.physical);
    const renderPaymentCard = (product) => {
      const title = product.title || "SupportRD Product";
      const price = product.price ? `${String(product.price).startsWith("$") ? "" : "$"}${product.price}` : "Live price on checkout";
      const key = product.handle || product.id || "";
      const checkoutEntries = getCheckoutEntries(product);
      return `<div class="support-rebuild-card" style="padding:12px">
        <div class="support-rebuild-catalog-hero" style="height:120px;background-image:url('${product.image || "/static/images/brochure-scroll-store.jpg"}')"></div>
        <div class="support-rebuild-title" style="margin-top:12px">${title}</div>
        <div class="support-rebuild-note">${price}</div>
        <div class="support-rebuild-note" style="margin-top:10px">${product.description || "SupportRD payment lane."}</div>
        <div class="support-rebuild-row" style="margin-top:12px;flex-wrap:wrap">
          <button class="support-rebuild-btn ghost" data-details="${key}">Open Purchase Menu</button>
          <button class="support-rebuild-btn pulse" data-checkout="${key}">${product.physical ? "Custom Order" : (checkoutEntries.length ? "Shopify Checkout" : "Open Shopify Cart")}</button>
        </div>
      </div>`;
    };
    body.innerHTML = `
      <div class="support-rebuild-row" style="justify-content:space-between">
        <h3 class="support-rebuild-title">Fast Pay</h3>
        <button class="support-rebuild-btn ghost" id="srClosePaymentModal">X</button>
      </div>
      <div class="support-rebuild-note">Open Purchase Menu stays descriptive. Shopify Checkout should move straight into the card lane. ${state.shopify?.checkoutMapLoaded ? "Plan variant map is loaded." : "Plan variant map still needs Shopify help."}</div>
      <div class="support-rebuild-grid two" style="margin-top:14px">
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Custom Order</div>
          <div class="support-rebuild-note">Email the founder before Fast Pay if the order is manual or specialized.</div>
          <div class="support-rebuild-row" style="margin-top:12px">
            <button class="support-rebuild-btn ghost" id="srPaymentCustomOrder">Open Custom Order</button>
          </div>
        </div>
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Credit / Debit Capture</div>
          <div class="support-rebuild-note">Shopify Checkout should show the real card page, and Apple Pay / Google Pay appear there when supported.</div>
          <div class="support-rebuild-note" style="margin-top:10px">Account plan right now: ${state.account.plan}. Payments must push premium back into the account memory.</div>
        </div>
      </div>
      <div class="support-rebuild-title" style="margin-top:16px">Real Products</div>
      <div class="support-rebuild-note">Physical products stay in the SupportRD custom-order lane and keep the product image right in front of the buyer.</div>
      <div class="support-rebuild-grid two" style="margin-top:14px">
        ${physicalProducts.length ? physicalProducts.map(renderPaymentCard).join("") : `<div class="support-rebuild-card"><div class="support-rebuild-note">No physical products are loaded yet.</div></div>`}
      </div>
      <div class="support-rebuild-title" style="margin-top:18px">Digital Products</div>
      <div class="support-rebuild-note">Digital products should go straight from this dark payment lane into Shopify checkout without the lighter screen in between.</div>
      <div class="support-rebuild-grid two" style="margin-top:14px">
        ${digitalProducts.length ? digitalProducts.map(renderPaymentCard).join("") : `<div class="support-rebuild-card"><div class="support-rebuild-note">Live digital products are not loading from Shopify yet, so SupportRD is using the mapped catalog fallback.</div><div class="support-rebuild-row" style="margin-top:12px"><button class="support-rebuild-btn pulse" id="srOpenFallbackCart">Open Shopify Cart</button></div></div>`}
      </div>
      <div class="support-rebuild-note" style="margin-top:12px">Apple Pay and Google Pay appear on the Shopify side when supported by the device and store settings.</div>`;
    $("srClosePaymentModal").onclick = closePaymentModal;
    $("srPaymentCustomOrder")?.addEventListener("click", () => {
      modal.classList.remove("is-open");
      openCustomOrderProductModal({
        title: "SupportRD Product",
        price: "Custom quote",
        description: "Open a clean in-app custom order flow without leaving the SupportRD experience.",
        image: "/static/images/brochure-scroll-store.jpg"
      });
    });
    $("srOpenFallbackCart")?.addEventListener("click", () => openCheckoutForProduct({ title: "SupportRD Cart" }, "SupportRD Cart"));
    body.querySelectorAll("[data-checkout]").forEach((btn) => btn.onclick = () => {
      const product = products.find((item) => (item.handle || item.id) === btn.dataset.checkout);
      if (!product) return;
      if (product.physical) {
        modal.classList.remove("is-open");
        openCustomOrderProductModal(product);
        return;
      }
      const checkoutEntries = getCheckoutEntries(product);
      if (checkoutEntries.length === 1) {
        openCheckoutForProduct(checkoutEntries[0], checkoutEntries[0].title);
        return;
      }
      if (checkoutEntries.length > 1) {
        openCatalogProductModal(product);
        return;
      }
      openCheckoutForProduct(product, product.title);
    });
    body.querySelectorAll("[data-details]").forEach((btn) => btn.onclick = () => {
      const product = products.find((item) => (item.handle || item.id) === btn.dataset.details);
      const title = product?.title || "SupportRD Product";
      const desc = product?.body_html || product?.description || "Product details are loading from the SupportRD catalog.";
      const checkoutEntries = getCheckoutEntries(product);
      body.innerHTML = `<div class="support-rebuild-row" style="justify-content:space-between"><h3 class="support-rebuild-title">${title}</h3><button class="support-rebuild-btn ghost" id="srBackPaymentModal">Back</button></div><div class="support-rebuild-note">${desc}</div><div class="support-rebuild-row" style="margin-top:12px;flex-wrap:wrap">${product?.physical ? `<button class="support-rebuild-btn pulse" id="srOpenCustomOrderFromPayment">Open Custom Order</button>` : (checkoutEntries.length ? checkoutEntries.map((entry) => `<button class="support-rebuild-btn pulse" data-checkout-entry="${entry.id}">${entry.label}</button>`).join("") : `<button class="support-rebuild-btn pulse" id="srCheckoutThis">Go To Credit Card Page</button>`)}</div>`;
      $("srBackPaymentModal").onclick = openPaymentModal;
      $("srOpenCustomOrderFromPayment")?.addEventListener("click", () => {
        modal.classList.remove("is-open");
        openCustomOrderProductModal(product);
      });
      body.querySelectorAll("[data-checkout-entry]").forEach((checkoutBtn) => {
        const entry = checkoutEntries.find((item) => item.id === checkoutBtn.dataset.checkoutEntry);
        if (!entry) return;
        checkoutBtn.onclick = () => openCheckoutForProduct(entry, entry.title);
      });
      $("srCheckoutThis")?.addEventListener("click", () => openCheckoutForProduct(product, title));
    });
    modal.classList.add("is-open");
  }

  function openStatisticsBoard() {
    const modal = ensurePaymentModal();
    const body = $("srPaymentModalBody");
    body.innerHTML = `
      <div class="support-rebuild-row" style="justify-content:space-between">
        <h3 class="support-rebuild-title">${SUPPORTRD_COPY.statisticsBoard.title}</h3>
        <button class="support-rebuild-btn ghost" id="srCloseStatsBoard">X</button>
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
        <button class="support-rebuild-btn ghost" id="srCloseDeveloperFeed">X</button>
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
        <button class="support-rebuild-btn ghost" id="srCloseTechnicalLane">X</button>
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

  function pickAssistantVoice(name) {
    try {
      const voices = window.speechSynthesis?.getVoices?.() || [];
      const preferred = name === "Aria"
        ? ["Microsoft Aria", "Microsoft Jenny", "Zira", "Samantha", "Google UK English Female"]
        : ["Microsoft Guy", "Microsoft Davis", "Google UK English Male", "Daniel", "Alex"];
      return voices.find((voice) => preferred.some((token) => voice.name.includes(token))) || voices[0] || null;
    } catch {
      return null;
    }
  }

  function speakText(text, name = "Aria") {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = name === "Aria" ? 0.9 : 0.92;
      utter.pitch = name === "Aria" ? 0.9 : 0.82;
      const voice = pickAssistantVoice(name);
      if (voice) utter.voice = voice;
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
      setTimeout(() => speakText(reply, name), 2200);
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
    $("srProductsPanel")?.remove();
    let infoFooter = $("srInfoFooter");
    if (!infoFooter) {
      infoFooter = document.createElement("aside");
      infoFooter.id = "srInfoFooter";
      infoFooter.className = "support-rebuild-info-footer";
      document.body.appendChild(infoFooter);
    }
    rail.innerHTML = `
      <section class="support-rebuild-sticky-card">
        <div class="support-rebuild-mini-title">Edits Menu</div>
        <div class="support-rebuild-mini-list">
          <button class="support-rebuild-btn ghost" data-sticky-route="floatBoardsBox">Open Studio</button>
          <button class="support-rebuild-btn ghost" data-sticky-route="floatSettingsBox">Open Diary</button>
          <button class="support-rebuild-btn ghost" data-sticky-route="floatAssistantBox">Open Profile</button>
          <button class="support-rebuild-btn pulse" id="srStickyPay">Open Fast Pay</button>
          <button class="support-rebuild-btn ghost" id="srOpenTechnicalLane">Technical Lane</button>
        </div>
      </section>`;
    infoFooter.innerHTML = `
      <section class="support-rebuild-sticky-card">
        <div class="support-rebuild-row" style="justify-content:space-between">
          <div>
            <div class="support-rebuild-mini-title">Important Info</div>
            <div class="support-rebuild-note">${state.statistics.adAttribution}</div>
          </div>
          <div class="support-rebuild-row">
            <button class="support-rebuild-btn ghost" id="srOpenStatsBoard">Statistics</button>
            <button class="support-rebuild-btn ghost" id="srOpenDeveloperFeed">Developer Feed</button>
          </div>
        </div>
      </section>`;
    $("srStickyPay")?.addEventListener("click", openPaymentModal);
    $("srOpenTechnicalLane")?.addEventListener("click", openTechnicalLane);
    $("srOpenStatsBoard")?.addEventListener("click", openStatisticsBoard);
    $("srOpenDeveloperFeed")?.addEventListener("click", openDeveloperFeed);
    rail.querySelectorAll("[data-sticky-route]").forEach((btn) => {
      btn.addEventListener("click", () => activateRoute(btn.dataset.stickyRoute));
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

  function saveAccountStateFromFields(prefix = "srAccount") {
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
    return state.account.loggedIn
      ? `Account saved for ${state.account.displayName || state.account.email}. PocketBase URL is set and every Remote panel now reads from the account state.`
      : "Account was saved in guest mode.";
  }

  function logoutAccountState() {
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
  }

  function openAccountModal() {
    const modal = ensurePaymentModal();
    const body = $("srPaymentModalBody");
    body.innerHTML = `
      <div class="support-rebuild-row" style="justify-content:space-between">
        <h3 class="support-rebuild-title">SupportRD Account</h3>
        <button class="support-rebuild-btn ghost" id="srCloseAccountModal">X</button>
      </div>
      <div class="support-rebuild-note">${accountSummary()} · ${state.account.engine}</div>
      <div class="support-rebuild-account-meta" style="margin-top:14px">
        <input class="support-rebuild-input" id="srAccountPbUrl" placeholder="PocketBase URL" value="${state.account.pocketbaseUrl || ""}">
        <input class="support-rebuild-input" id="srAccountEmail" placeholder="Email / Username" value="${state.account.email || ""}">
        <input class="support-rebuild-input" id="srAccountPassword" type="password" placeholder="Password">
        <input class="support-rebuild-input" id="srAccountName" placeholder="Display Name" value="${state.account.displayName || ""}">
      </div>
      <div class="support-rebuild-row" style="margin-top:14px">
        <button class="support-rebuild-btn pulse" id="srAccountSave">${state.account.loggedIn ? "Update Account" : "Save + Sign In"}</button>
        <button class="support-rebuild-btn ghost" id="srAccountLogout">${state.account.loggedIn ? "Log Out" : "Clear"}</button>
      </div>
      <div class="support-rebuild-note" id="srAccountStatus" style="margin-top:10px">PocketBase-ready account state powers diary, profile, settings, studio memory, and premium history.</div>`;
    $("srCloseAccountModal").onclick = () => modal.classList.remove("is-open");
    $("srAccountSave").onclick = () => {
      $("srAccountStatus").textContent = saveAccountStateFromFields();
    };
    $("srAccountLogout").onclick = () => {
      logoutAccountState();
      $("srAccountStatus").textContent = "Account cleared back to guest mode.";
    };
    modal.classList.add("is-open");
  }

  function openPasswordChangeModal() {
    const modal = ensurePaymentModal();
    const body = $("srPaymentModalBody");
    body.innerHTML = `
      <div class="support-rebuild-row" style="justify-content:space-between">
        <h3 class="support-rebuild-title">Change Password</h3>
        <button class="support-rebuild-btn ghost" id="srClosePasswordModal">X</button>
      </div>
      <div class="support-rebuild-note">Start with verification by email. Once confirmed, SupportRD opens the password change window here.</div>
      <div class="support-rebuild-card" style="margin-top:14px;padding:12px">
        <div class="support-rebuild-title">Verification Email</div>
        <div class="support-rebuild-note">Verification will route to: ${state.account.email || "No email saved yet."}</div>
        <div class="support-rebuild-row" style="margin-top:12px">
          <button class="support-rebuild-btn pulse" id="srSendPasswordVerification">Send Verification To Email</button>
        </div>
      </div>
      <div class="support-rebuild-grid two" id="srPasswordChangeFields" style="margin-top:14px;display:none">
        <div class="support-rebuild-card" style="padding:12px">
          <input class="support-rebuild-input" id="srPasswordOld" type="password" placeholder="Old password">
          <input class="support-rebuild-input" id="srPasswordNew" type="password" placeholder="New password" style="margin-top:10px">
          <input class="support-rebuild-input" id="srPasswordConfirm" type="password" placeholder="Confirm password" style="margin-top:10px">
        </div>
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">SupportRD Password Window</div>
          <div class="support-rebuild-note" id="srPasswordStatus">Waiting on email verification.</div>
          <button class="support-rebuild-btn pulse" id="srSavePasswordChange" style="margin-top:12px">Save New Password</button>
        </div>
      </div>`;
    $("srClosePasswordModal").onclick = () => modal.classList.remove("is-open");
    $("srSendPasswordVerification").onclick = () => {
      $("srPasswordChangeFields").style.display = "grid";
      $("srPasswordStatus").textContent = `Verification email sent to ${state.account.email || "your saved email"}. Continue with old and new password.`;
    };
    $("srSavePasswordChange").onclick = () => {
      const oldPassword = $("srPasswordOld").value.trim();
      const newPassword = $("srPasswordNew").value.trim();
      const confirmPassword = $("srPasswordConfirm").value.trim();
      if (state.account.password && oldPassword && oldPassword !== state.account.password) {
        $("srPasswordStatus").textContent = "Old password does not match the saved SupportRD account password.";
        return;
      }
      if (!newPassword || newPassword !== confirmPassword) {
        $("srPasswordStatus").textContent = "New password and confirm password must match.";
        return;
      }
      state.account.password = newPassword;
      saveState();
      $("srPasswordStatus").textContent = "Password updated. SupportRD account security is refreshed.";
      renderSettings();
    };
    modal.classList.add("is-open");
  }

  function renderSettings() {
    const box = $("floatProfileBox");
    if (!box) return;
    const provider = state.account.loginProvider || "Guest";
    const preset = state.assistantPreset || "Greetings";
    box.innerHTML = `
      <div class="support-rebuild-content-shell">
        <div class="support-rebuild-card">
          <div class="support-rebuild-content-head">
            <h3 class="support-rebuild-title">General Settings</h3>
          </div>
          <div class="support-rebuild-note">Settings now read like a real account center: login provider, password flow by email verification, phone push prompts, due-date reading, theme reading, premium/pro reading, live profile URL, and Aria/Jake presets.</div>
        </div>
      <div class="support-rebuild-grid two">
        <div class="support-rebuild-card">
          <div class="support-rebuild-title">Login Access</div>
            <input class="support-rebuild-input" id="srSettingsUsername" placeholder="Username" value="${state.profile.name || state.account.displayName || ""}">
            <input class="support-rebuild-input" id="srSettingsEmail" style="margin-top:10px" placeholder="Email" value="${state.account.email || ""}">
            <div class="support-rebuild-row" style="margin-top:12px">
              <button class="support-rebuild-btn ${provider === "Google" ? "pulse" : "ghost"}" data-login-provider="Google">Google Login</button>
              <button class="support-rebuild-btn ${provider === "Yahoo" ? "pulse" : "ghost"}" data-login-provider="Yahoo">Yahoo Login</button>
              <button class="support-rebuild-btn ${provider === "Microsoft" ? "pulse" : "ghost"}" data-login-provider="Microsoft">Microsoft Login</button>
              <button class="support-rebuild-btn ${provider === "Apple" ? "pulse" : "ghost"}" data-login-provider="Apple">Apple Login</button>
              <button class="support-rebuild-btn ghost" id="srOpenPasswordWindow">Change Password</button>
            </div>
          </div>
        <div class="support-rebuild-card">
          <div class="support-rebuild-title">Push + Reading Layer</div>
            <div class="support-rebuild-row">
              <button class="support-rebuild-btn ${state.push ? "pulse" : "ghost"}" id="srSettingsPush">Push Notifications</button>
              <button class="support-rebuild-btn ghost" id="srOpenFullSettings">Open Full Settings</button>
            </div>
            <div class="support-rebuild-note" style="margin-top:12px">If you are on a cell phone, Push Notifications should route the browser asking to send SupportRD notifications to your phone.</div>
            <div class="support-rebuild-note" style="margin-top:12px">New Payment Due Next: ${state.account.subscriptionPayDate || "Not set"}</div>
            <div class="support-rebuild-note">Current Theme Reader: ${MAPS[state.map]?.title || "Wake-Up Route"}</div>
            <div class="support-rebuild-note">Premium / Pro Reader: ${state.account.plan || "Free"}</div>
            <div class="support-rebuild-note">Profile URL Tag: ${state.profile.contact || "https://supportrd.com/live"}</div>
        </div>
      </div>
      <div class="support-rebuild-grid two">
        <div class="support-rebuild-card">
          <div class="support-rebuild-title">Aria / Jake Preset Functionality</div>
          <select class="support-rebuild-select" id="srAssistantPreset">
            ${["Greetings","Advanced","Inner Circle","Professional Making Money"].map((item) => `<option ${preset === item ? "selected" : ""}>${item}</option>`).join("")}
          </select>
          <div class="support-rebuild-note" style="margin-top:12px">Aria Mode by text can answer hair problem questions from the phone and diary lane using this preset as the tone.</div>
        </div>
        <div class="support-rebuild-card">
          <div class="support-rebuild-title">PocketBase + Account Layer</div>
          <input class="support-rebuild-input" id="srSettingsPhone" placeholder="Phone number" value="${state.account.phone || ""}">
          <input class="support-rebuild-input" id="srSettingsPayDate" style="margin-top:10px" placeholder="New payment due next" value="${state.account.subscriptionPayDate || ""}">
          <input class="support-rebuild-input" id="srSettingsUrl" style="margin-top:10px" placeholder="Profile URL tag / live URL" value="${state.profile.contact || ""}">
          <div class="support-rebuild-note" style="margin-top:12px">PocketBase URL: ${state.account.pocketbaseUrl || "Not set yet"}</div>
          <div class="support-rebuild-note">History Sync: ${state.account.historySync || "Pending account sync"}</div>
        </div>
      </div>
      <div class="support-rebuild-card">
          <div class="support-rebuild-title">Important Pages</div>
          <div class="support-rebuild-row">
            <button class="support-rebuild-btn ghost" id="srSettingsFaq">FAQ Lounge</button>
            <button class="support-rebuild-btn ghost" id="srSettingsProfile">Profile</button>
            <button class="support-rebuild-btn ghost" id="srSettingsDiary">Diary</button>
            <button class="support-rebuild-btn ghost" id="srSettingsMiniCatalog">Mini Catalog</button>
          </div>
      </div>
      <div class="support-rebuild-card">
        <div class="support-rebuild-title">Product Account Controls</div>
          <div class="support-rebuild-row">
            <button class="support-rebuild-btn ghost" id="srSettingsPayments">Open Payments</button>
            <button class="support-rebuild-btn ghost" id="srSettingsAccount">Account Menu</button>
            <button class="support-rebuild-btn pulse" id="srSettingsSaveAll">Save Settings</button>
          </div>
          <div class="support-rebuild-note" id="srSettingsStatus" style="margin-top:12px">Current plan: ${state.account.plan}. Contacts / Channels: ${state.statistics.contacts}</div>
        </div>
        <div class="support-rebuild-grid two" id="srSettingsFullLane" style="display:none">
          <div class="support-rebuild-card">
            <div class="support-rebuild-title">Identity + Security</div>
            <input class="support-rebuild-input" id="srSettingsFullUsername" placeholder="Username" value="${state.profile.name || state.account.displayName || ""}">
            <input class="support-rebuild-input" id="srSettingsOldPassword" style="margin-top:10px" type="password" placeholder="Current password">
            <input class="support-rebuild-input" id="srSettingsNewPassword" style="margin-top:10px" type="password" placeholder="New password">
            <input class="support-rebuild-input" id="srSettingsConfirmPassword" style="margin-top:10px" type="password" placeholder="Confirm new password">
            <input class="support-rebuild-input" id="srSettingsAddress" style="margin-top:10px" placeholder="Address info" value="${state.account.address || ""}">
          </div>
          <div class="support-rebuild-card">
            <div class="support-rebuild-title">Payments + Links</div>
            <input class="support-rebuild-input" id="srSettingsPremium" placeholder="Premium / plan status" value="${state.account.plan || ""}">
            <input class="support-rebuild-input" id="srSettingsFantasy" style="margin-top:10px" placeholder="Fantasy setting" value="${state.account.fantasyMode || ""}">
            <input class="support-rebuild-input" id="srSettingsPrimaryUrl" style="margin-top:10px" placeholder="Primary URL link" value="${state.profile.contact || ""}">
            <input class="support-rebuild-input" id="srSettingsDiaryInvite" style="margin-top:10px" placeholder="Invitable Diary link" value="${state.diaryInviteUrl || ""}">
            <textarea class="support-rebuild-textarea" id="srSettingsSocialUpdate" style="margin-top:10px" placeholder="Comma-separated social update routes">${Object.entries(state.diarySocial || {}).filter(([, enabled]) => enabled).map(([platform]) => platform).join(", ")}</textarea>
          </div>
        </div>
      </div>`;
    box.querySelectorAll("[data-login-provider]").forEach((btn) => {
      btn.onclick = () => {
        state.account.loginProvider = btn.dataset.loginProvider;
        state.account.loggedIn = true;
        state.account.displayName = state.profile.name || state.account.displayName;
        saveState();
        renderSettings();
      };
    });
    $("srOpenPasswordWindow").onclick = openPasswordChangeModal;
    $("srSettingsPush").onclick = async () => {
      if ("Notification" in window && Notification.permission === "default") {
        try { await Notification.requestPermission(); } catch {}
      }
      state.push = !state.push;
      saveState();
      renderSettings();
    };
    $("srSettingsPayments").onclick = openPaymentModal;
    $("srSettingsAccount").onclick = openAccountModal;
    $("srSettingsFaq").onclick = () => activateRoute("floatLiveBox");
    $("srSettingsProfile").onclick = () => activateRoute("floatAssistantBox");
    $("srSettingsDiary").onclick = () => activateRoute("floatSettingsBox");
    $("srSettingsMiniCatalog").onclick = () => {
      state.catalogMinimized = false;
      saveState();
      renderShellChrome();
      $("srSettingsStatus").textContent = "Mini catalog opened from settings.";
    };
    $("srOpenFullSettings").onclick = () => {
      const lane = $("srSettingsFullLane");
      if (!lane) return;
      lane.style.display = lane.style.display === "none" ? "grid" : "none";
      $("srSettingsStatus").textContent = lane.style.display === "none"
        ? "Full settings hidden. Core account controls stay active."
        : "Full settings opened. Identity, password, links, and payment details are ready to edit.";
    };
    $("srSettingsSaveAll").onclick = () => {
      state.profile.name = $("srSettingsUsername").value.trim();
      state.account.displayName = state.profile.name || state.account.displayName;
      state.account.email = $("srSettingsEmail").value.trim();
      state.account.phone = $("srSettingsPhone").value.trim();
      state.account.subscriptionPayDate = $("srSettingsPayDate").value.trim() || state.account.subscriptionPayDate;
      state.profile.contact = $("srSettingsUrl").value.trim() || state.profile.contact;
      state.assistantPreset = $("srAssistantPreset").value;
      if ($("srSettingsFullLane")?.style.display !== "none") {
        const newPassword = $("srSettingsNewPassword")?.value.trim();
        const confirmPassword = $("srSettingsConfirmPassword")?.value.trim();
        if (newPassword && newPassword === confirmPassword) state.account.password = newPassword;
        state.account.address = $("srSettingsAddress")?.value.trim() || state.account.address;
        state.account.plan = $("srSettingsPremium")?.value.trim() || state.account.plan;
        state.account.fantasyMode = $("srSettingsFantasy")?.value.trim() || state.account.fantasyMode;
        state.profile.contact = $("srSettingsPrimaryUrl")?.value.trim() || state.profile.contact;
        state.diaryInviteUrl = $("srSettingsDiaryInvite")?.value.trim() || state.diaryInviteUrl;
        const socialUpdate = (($("srSettingsSocialUpdate")?.value) || "").toLowerCase();
        Object.keys(state.diarySocial).forEach((platform) => {
          state.diarySocial[platform] = socialUpdate.includes(platform);
        });
      }
      saveState();
      renderShellChrome();
      $("srSettingsStatus").textContent = `Settings saved. ${state.account.loginProvider || "Guest"} login is active, preset is ${state.assistantPreset}, and the next payment due reads ${state.account.subscriptionPayDate || "not set"}.`;
    };
  }
  function renderDiary() {
    const box = $("floatSettingsBox");
    if (!box) return;
    const historyLines = state.diaryFeed.length ? state.diaryFeed : ["Chat history empty right before they start.", "Aria is ready for hair talk.", "Jake is waiting for studio help."];
    const lines = formatDiaryLines(state.diaryText);
    const socialRows = Object.keys(state.diarySocial).map((platform) => `
      <div class="support-rebuild-row" style="justify-content:space-between;align-items:center">
        <label class="support-rebuild-pill"><input type="checkbox" data-platform="${platform}" ${state.diarySocial[platform] ? "checked" : ""}> ${platform}</label>
        <input class="support-rebuild-input" data-post-url="${platform}" style="max-width:240px;padding:8px 10px" value="${state.diaryPostTargets?.[platform] || diaryPostUrl(platform)}">
      </div>`).join("");
    box.innerHTML = `
      <div class="support-rebuild-content-shell">
        <div class="support-rebuild-card">
          <div class="support-rebuild-content-head">
            <h3 class="support-rebuild-title">Diary Mode</h3>
          </div>
          <div class="support-rebuild-note">Aria and Jake stay above the history reader. Ask Aria any hair question regarding SupportRD and she answers only in that lane, with the stronger first-rebuild Diary controls back in place.</div>
        </div>
        <div class="support-rebuild-aria-menu">
          <div class="support-rebuild-reader">
            <div class="support-rebuild-title">Aria / Jake Menu</div>
            <div class="support-rebuild-row">
              <button class="support-rebuild-btn pulse" id="srDiaryPostNow">Post Now</button>
              <button class="support-rebuild-btn pulse" id="srTalkAria">Talk To Aria</button>
              <button class="support-rebuild-btn ghost" id="srTalkJake">Talk To Jake</button>
              <button class="support-rebuild-btn ghost" id="srDiaryCollapseBtn">${state.diaryHistoryCollapsed ? "Open History View" : "Collapse History View"}</button>
              <button class="support-rebuild-btn ghost" id="srHandsFreeBtn">Hands-Free Mode</button>
              <button class="support-rebuild-btn ghost" id="srDiaryLiveBtn">${state.liveMode ? "Stop Live Session" : "Live Session"}</button>
              <button class="support-rebuild-btn ghost" id="srDiarySaveBtn">Save Diary</button>
            </div>
            <textarea class="support-rebuild-textarea" id="srDiaryQuestion" placeholder="What hair problem is SupportRD helping with today?">${state.diaryDescription || ""}</textarea>
            <div class="support-rebuild-grid two" style="margin-top:12px">
              <div class="support-rebuild-card" style="padding:12px">
                <div class="support-rebuild-title">Live Comments</div>
                <div class="support-rebuild-mini-list">${(state.diaryComments || []).slice(-4).map((line) => `<div class="support-rebuild-comment">${line}</div>`).join("")}</div>
              </div>
              <div class="support-rebuild-card" style="padding:12px">
                <div class="support-rebuild-title">Visitor View</div>
                <div class="support-rebuild-row">
                  <button class="support-rebuild-btn ghost" id="srDiaryLikesBtn">Likes ${state.diaryLikes || 0}</button>
                  <button class="support-rebuild-btn ghost" id="srDiaryHeartsBtn">Hearts ${state.diaryHearts || 0}</button>
                  <button class="support-rebuild-btn ghost" id="srDiaryMoneyBtn">Receive Money</button>
                  <button class="support-rebuild-btn pulse" id="srDiaryPaymentsBtn">Enter Payments</button>
                  <button class="support-rebuild-btn ghost" id="srDiaryGuestBtn">${state.account.loggedIn ? "Account Ready" : "Guest Login"}</button>
                </div>
              </div>
            </div>
            <div class="support-rebuild-grid two" style="margin-top:12px">
              <div class="support-rebuild-card" style="padding:12px">
                <div class="support-rebuild-title">Send Links</div>
                <div class="support-rebuild-note">Posting URLs stay under Post Now so SupportRD can open the sharing page automatically.</div>
                <div class="support-rebuild-grid" style="margin-top:10px">${socialRows}</div>
              </div>
              <div class="support-rebuild-card" style="padding:12px">
                <div class="support-rebuild-title">Private Diary</div>
                <div class="support-rebuild-note">Fixed above the history, hands-free ready, and listening for hair problems.</div>
                <textarea class="support-rebuild-textarea" id="srDiaryText" placeholder="Private diary notes stay here." style="margin-top:10px">${state.diaryText || ""}</textarea>
              </div>
            </div>
          </div>
          <div class="support-rebuild-reader">
            <div class="support-rebuild-title">SupportRD History Reader</div>
            <div class="support-rebuild-history" style="${state.diaryHistoryCollapsed ? "display:none" : ""}">${historyLines.map((line)=>`<div class="support-rebuild-line">${line}</div>`).join("")}</div>
            <div class="support-rebuild-note" style="${state.diaryHistoryCollapsed ? "" : "display:none"}">History is collapsed for on-the-go privacy. Tap the button to open it again.</div>
            <div class="support-rebuild-note">Live invite: ${state.diaryInviteUrl || state.profile.contact || "https://supportrd.com/live"}</div>
            <div class="support-rebuild-diary-preview" style="margin-top:12px">
              ${lines.map((line) => `<div>${line || "&nbsp;"}</div>`).join("")}
            </div>
          </div>
        </div>
      </div>`;
    $("srDiaryPostNow").onclick = () => {
      state.diaryDescription = $("srDiaryQuestion").value.trim();
      state.diaryText = $("srDiaryText").value;
      document.querySelectorAll("[data-platform]").forEach((cb) => {
        state.diarySocial[cb.dataset.platform] = cb.checked;
      });
      document.querySelectorAll("[data-post-url]").forEach((input) => {
        state.diaryPostTargets[input.dataset.postUrl] = input.value.trim() || diaryPostUrl(input.dataset.postUrl);
      });
      state.diaryComments = [...(state.diaryComments || []), `Live post ready for ${(state.profile.name || state.account.displayName || "SupportRD Guest")}.`].slice(-6);
      pushDiaryFeed(`Post Now armed: ${state.diaryDescription || "SupportRD hair update ready."}`);
      saveState();
      openPlatforms();
      renderDiary();
    };
    $("srTalkAria").onclick = () => {
      state.diaryDescription = $("srDiaryQuestion").value.trim();
      pushDiaryFeed(`Aria pending: ${state.diaryDescription || "SupportRD hair question ready."}`);
      startAssistant("Aria");
      renderDiary();
    };
    $("srTalkJake").onclick = () => {
      pushDiaryFeed("Jake joined the diary lane to keep the SupportRD booth energy steady.");
      startAssistant("Jake");
      renderDiary();
    };
    $("srHandsFreeBtn").onclick = () => {
      state.diaryFeed = [
        "Hands-free Aria is now listening to hair problems.",
        "Jake is standing by for studio-toned support.",
        `Current level: ${state.diaryLevel}.`
      ];
      state.diaryComments = [...(state.diaryComments || []), "Hands-free live guidance activated."].slice(-6);
      saveState();
      renderDiary();
    };
    $("srDiaryCollapseBtn").onclick = () => {
      state.diaryHistoryCollapsed = !state.diaryHistoryCollapsed;
      saveState();
      renderDiary();
    };
    $("srDiaryLiveBtn").onclick = () => {
      state.liveMode = !state.liveMode;
      state.diaryComments = [...(state.diaryComments || []), state.liveMode ? "Live comments opened under Post Now." : "Live comments paused."].slice(-6);
      saveState();
      renderDiary();
    };
    $("srDiaryLikesBtn").onclick = () => {
      state.diaryLikes = (state.diaryLikes || 0) + 1;
      saveState();
      renderDiary();
    };
    $("srDiaryHeartsBtn").onclick = () => {
      state.diaryHearts = (state.diaryHearts || 0) + 1;
      saveState();
      renderDiary();
    };
    $("srDiaryMoneyBtn").onclick = () => {
      state.statistics.payments = "Live receive money lane opened from Diary visitor view.";
      saveState();
      openPaymentModal();
    };
    $("srDiaryPaymentsBtn").onclick = openPaymentModal;
    $("srDiaryGuestBtn").onclick = openAccountModal;
    $("srDiarySaveBtn").onclick = () => {
      state.diaryDescription = $("srDiaryQuestion").value.trim();
      state.diaryText = $("srDiaryText").value;
      document.querySelectorAll("[data-platform]").forEach((cb) => {
        state.diarySocial[cb.dataset.platform] = cb.checked;
      });
      document.querySelectorAll("[data-post-url]").forEach((input) => {
        state.diaryPostTargets[input.dataset.postUrl] = input.value.trim() || diaryPostUrl(input.dataset.postUrl);
      });
      pushDiaryFeed(`Diary saved for ${(state.profile.name || "SupportRD Guest")}.`);
      saveState();
      renderShellChrome();
      renderDiary();
    };
  }
  function renderProfile() {
    const box = $("floatAssistantBox");
    if (!box) return;
    const p = state.profile;
    const profileImage = (p.picture || DEFAULT_PROFILE_IMAGE).replace(/'/g, "%27");
    const profileImageStyle = `style="background-image:linear-gradient(180deg, rgba(8,12,20,.10), rgba(8,12,20,.62)), url('${profileImage}')"`;
    box.innerHTML = `
      <div class="support-rebuild-content-shell">
        <div class="support-rebuild-card">
          <div class="support-rebuild-content-head">
            <h3 class="support-rebuild-title">Profile Reader</h3>
          </div>
          <div class="support-rebuild-note">Photo, current hair state, and social mood combine into one SupportRD AI profile summary.</div>
        </div>
        <div class="support-rebuild-grid two">
          <div class="support-rebuild-card">
            <div class="support-rebuild-profile-quick">
              <div class="support-rebuild-profile-image" ${profileImageStyle}><span class="support-rebuild-profile-tag">${p.name || "SupportRD Profile"}</span></div>
              <div class="support-rebuild-reader">
                <input class="support-rebuild-input" id="srProfilePicture" placeholder="Photo URL" value="${p.picture || ""}">
                <input class="support-rebuild-input" id="srProfileName" style="margin-top:10px" placeholder="Profile name" value="${p.name || ""}">
                <input class="support-rebuild-input" id="srProfileHairState" style="margin-top:10px" placeholder="Current hair state" value="${p.currentHairState || ""}">
                <input class="support-rebuild-input" id="srProfileMood" style="margin-top:10px" placeholder="Social mood" value="${p.socialMood || ""}">
                <div class="support-rebuild-row" style="margin-top:12px">
                  <button class="support-rebuild-btn pulse" id="srProfileGenerate">Generate AI Summary</button>
                  <button class="support-rebuild-btn ghost" id="srProfilePictureBtn">Change Profile Picture</button>
                </div>
              </div>
            </div>
          </div>
          <div class="support-rebuild-card">
            <div class="support-rebuild-title">AI Summary</div>
            <div class="support-rebuild-history">
              <div class="support-rebuild-line">${p.aiSummary || "SupportRD profile summary will appear here after the profile reader runs."}</div>
              <div class="support-rebuild-line">Verified read: ${p.verified}</div>
              <div class="support-rebuild-line">Last hair status: ${p.lastHairStatus || "No verified hair status yet."}</div>
              <div class="support-rebuild-line">Current contact: ${p.contact || "https://supportrd.com/live"}</div>
            </div>
            <div class="support-rebuild-row" style="margin-top:12px">
              <button class="support-rebuild-btn ghost" id="srProfileHairScan">Hair Analyser</button>
              <button class="support-rebuild-btn ghost" id="srProfileVerified">Verified</button>
              <button class="support-rebuild-btn ghost" id="srProfileLinkedIn">LinkedIn Post URL</button>
              <button class="support-rebuild-btn ghost" id="srProfileLive">Open Live Invite</button>
            </div>
            <div class="support-rebuild-note" id="srProfileStatus" style="margin-top:12px">SupportRD profile reader is ready.</div>
          </div>
        </div>
      </div>`;
    $("srProfileGenerate").onclick = () => {
      p.picture = $("srProfilePicture").value.trim();
      p.name = $("srProfileName").value.trim();
      p.currentHairState = $("srProfileHairState").value.trim();
      p.socialMood = $("srProfileMood").value.trim();
      p.aiSummary = `${p.name || "This profile"} reads as ${p.currentHairState || "hair-aware"}, feels ${p.socialMood || "steady socially"}, and carries SupportRD polish through the day.`;
      p.lastHairStatus = p.currentHairState || p.lastHairStatus;
      state.account.displayName = p.name || state.account.displayName;
      saveState();
      renderShellChrome();
      renderProfile();
    };
    $("srProfilePictureBtn").onclick = () => {
      p.picture = $("srProfilePicture").value.trim() || DEFAULT_PROFILE_IMAGE;
      saveState();
      renderProfile();
      $("srProfileStatus").textContent = "Profile image locked in and now sits as the main profile picture.";
    };
    $("srProfileHairScan").onclick = () => {
      p.verified = `Hair analysis ready: ${p.currentHairState || "normal presentation"}.`;
      p.lastHairStatus = p.currentHairState || "normal presentation";
      p.aiSummary = `${p.name || "SupportRD profile"} shows ${p.currentHairState || "balanced hair"}, a ${p.socialMood || "steady"} social mood, and a presentation that is ready for SupportRD guidance.`;
      $("srProfileStatus").textContent = "Hair analysis locked into the profile reader.";
      saveState();
      renderProfile();
    };
    $("srProfileVerified").onclick = () => {
      p.verified = `Verified at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}: ${p.currentHairState || "normal presentation"}.`;
      p.lastHairStatus = p.currentHairState || p.lastHairStatus;
      saveState();
      renderProfile();
      $("srProfileStatus").textContent = "Last hair status is now verified.";
    };
    $("srProfileLinkedIn").onclick = () => {
      const shareText = encodeURIComponent(`${p.name || "SupportRD profile"} · ${p.aiSummary || "Hair summary ready."}`);
      window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${shareText}`, "_blank", "noopener");
      $("srProfileStatus").textContent = "LinkedIn share window opened with the current profile summary.";
    };
    $("srProfileLive").onclick = () => openCatalogProductModal({
      title: "SupportRD Live Invite",
      price: "Included",
      description: `Share this profile with confidence. Live contact: ${p.contact || "https://supportrd.com/live"}`,
      image: p.picture || DEFAULT_PROFILE_IMAGE
    });
  }
  function renderMap() {
    const box = $("floatDeviceBox");
    if (!box) return;
    const view = MAPS[state.map] || MAPS.default;
    box.innerHTML = `
      <div class="support-rebuild-content-shell">
        <div class="support-rebuild-card">
          <div class="support-rebuild-content-head">
            <h3 class="support-rebuild-title">Map Change</h3>
          </div>
          <div class="support-rebuild-note">Map Change only updates the button layout and map mood for the Remote.</div>
        </div>
        <div class="support-rebuild-card">
          <div class="support-rebuild-map-hero" style="background:${view.image}">
            <div class="support-rebuild-title">${view.title}</div>
            <div class="support-rebuild-note">Current map layout applied to the Remote buttons.</div>
          </div>
          <div class="support-rebuild-map-carousel" style="margin-top:12px">
            ${Object.keys(MAPS).map((key)=>`<button class="support-rebuild-map-disc ${state.map===key?"pulse":""}" data-map="${key}" style="background:${MAPS[key].image}"><div class="support-rebuild-title">${MAPS[key].title}</div><div class="support-rebuild-note">Set this map style on the Remote.</div></button>`).join("")}
          </div>
        </div>
      </div>`;
    box.querySelectorAll("[data-map]").forEach((btn) => btn.onclick = () => {
      state.map = btn.dataset.map;
      saveState();
      renderMap();
      syncLaunchVisuals();
    });
  }
  function renderStudio() {
    const box = $("floatBoardsBox");
    if (!box) return;
    const isRecording = !!(mediaRecorder && mediaRecorder.state === "recording");
    const recentItems = (state.studioRecent || []).map((item, index) => `
      <button class="support-rebuild-btn ghost" data-recent-index="${index}">
        ${item.label} · ${item.savedAt}
      </button>`).join("");
    box.innerHTML = `
      <div class="support-rebuild-content-shell">
        <div class="support-rebuild-card">
          <div class="support-rebuild-content-head">
            <h3 class="support-rebuild-title">Studio Quick Panel</h3>
          </div>
          <div class="support-rebuild-note">SupportRD Studio uses the stronger first-rebuild booth behavior again: clickable motherboards, quick/full modes, live record, undo, export, and recent builds.</div>
        </div>
        <div class="support-rebuild-audacity">
          <div class="support-rebuild-audacity-toolbar">
            <button class="support-rebuild-btn ${state.studioMode === "quick" ? "pulse" : "ghost"}" id="srStudioQuickMode">Quick Mode</button>
            <button class="support-rebuild-btn ${state.studioMode === "full" ? "pulse" : "ghost"}" id="srStudioFullMode">Full Studio Mode</button>
            <button class="support-rebuild-btn pulse" id="srStudioRecord">${isRecording ? "Recording..." : "Record"}</button>
            <button class="support-rebuild-btn ghost" id="srStudioVideo">Live Record Video</button>
            <button class="support-rebuild-btn ghost" id="srStudioStop">Stop</button>
            <button class="support-rebuild-btn ghost" id="srStudioPlay">Play</button>
            <button class="support-rebuild-btn ghost" id="srStudioPause">Pause</button>
            <button class="support-rebuild-btn ghost" id="srStudioRewind">Rewind</button>
            <button class="support-rebuild-btn ghost" id="srStudioForward">Fast Forward</button>
            <button class="support-rebuild-btn ghost" id="srStudioUndo">Undo</button>
            <button class="support-rebuild-btn ghost" id="srStudioExport">Export File</button>
          </div>
          <div class="support-rebuild-note">${state.studioMode === "full" ? "Full studio mode opens the whole motherboard lane for vocals, beat, instrument, adlib, FX, video, and recent saved builds." : "Quick mode keeps record, upload, play, and export one tap away."}</div>
          ${["voice", "beat", "adlib", "instrument"].map((board) => `
            <div class="support-rebuild-audacity-track ${board === currentBoard ? "active" : ""}" data-board="${board}">
              <div class="support-rebuild-row"><strong>${board.toUpperCase()} MOTHERBOARD</strong><span class="support-rebuild-pill" id="srBoardName_${board}">${state.studioBoards[board] || `${board}-track.wav`}</span></div>
              <div class="support-rebuild-wave">${Array.from({ length: 24 }, (_, idx) => `<span style="height:${board === currentBoard && isRecording ? (16 + ((idx * 11) % 52)) : (10 + ((idx * 7) % 24))}px"></span>`).join("")}</div>
              <div class="support-rebuild-note">${board === currentBoard ? (isRecording ? "Recording live into this motherboard right now." : "Active motherboard. Record and FX land here.") : "Select this motherboard to record or apply edits."}</div>
              <input type="file" accept="audio/*,video/*" data-upload="${board}">
            </div>`).join("")}
          <div class="support-rebuild-grid two">
            <div class="support-rebuild-card">
              <div class="support-rebuild-title">Studio Status</div>
              <div class="support-rebuild-note" id="srStudioStatus">${isRecording ? `Recording live into ${currentBoard}. Waveform and take name update in real time.` : "Ready to bring the booth to life."}</div>
              <label class="support-rebuild-note" style="margin-top:10px;display:block">FX Settings</label>
              <select class="support-rebuild-select" id="srStudioFx" style="margin-top:8px">
                <option>Echo</option><option>Reverb</option><option>Fade In</option><option>Fade Out</option>
                <option>Bass</option><option>Treble</option><option>Deep Voice</option><option>Opera Voice</option>
                <option>Slow Motion</option><option>Camera Lighting</option><option>Panoramic</option><option>Zoom</option>
              </select>
            </div>
            <div class="support-rebuild-card">
              <div class="support-rebuild-title">Recent Builds</div>
              <div class="support-rebuild-mini-list">${recentItems || `<div class="support-rebuild-note">The latest 3 builds will stay here after recording, upload, or export.</div>`}</div>
            </div>
          </div>
          <div class="support-rebuild-progress"><span id="srStudioBar"></span></div>
        </div>
      </div>`;
    $("srStudioQuickMode").onclick = () => { state.studioMode = "quick"; saveState(); renderStudio(); };
    $("srStudioFullMode").onclick = () => { state.studioMode = "full"; saveState(); renderStudio(); };
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
      saveState();
      renderStudio();
      $("srStudioStatus").textContent = `${file.name} loaded into ${input.dataset.upload}.`;
    });
    $("srStudioRecord").onclick = startRecord;
    $("srStudioStop").onclick = stopRecord;
    $("srStudioPlay").onclick = playBoards;
    $("srStudioPause").onclick = () => Object.values(boardAudio).forEach((audio) => audio && audio.pause());
    $("srStudioVideo").onclick = () => $("srStudioStatus").textContent = "Live record video lane is staged from this booth controller.";
    $("srStudioRewind").onclick = () => $("srStudioStatus").textContent = "Rewind armed for the active motherboard.";
    $("srStudioForward").onclick = () => $("srStudioStatus").textContent = "Fast forward armed for the active motherboard.";
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
        if ($(`srBoardName_${currentBoard}`)) $(`srBoardName_${currentBoard}`).textContent = takeName;
        if ($("srStudioStatus")) $("srStudioStatus").textContent = `${currentBoard} recording saved.`;
        saveState();
        mediaStream.getTracks().forEach((track) => track.stop());
        renderStudio();
      };
      mediaRecorder.start();
      if ($("srStudioStatus")) $("srStudioStatus").textContent = `Recording into ${currentBoard} board now.`;
      renderStudio();
    } catch {
      $("srStudioStatus").textContent = "Mic permission is needed to record here.";
    }
  }

  function stopRecord() {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    renderStudio();
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
    box.innerHTML = `
      <div class="support-rebuild-content-shell">
        <div class="support-rebuild-card support-rebuild-faq-tv">
          <div class="support-rebuild-content-head">
            <h3 class="support-rebuild-title">FAQ Lounge</h3>
          </div>
          <div class="support-rebuild-note">FAQ Lounge keeps the TV Reel front and center. This is the relaxed lane beside Diary and Profile.</div>
          <iframe class="support-rebuild-reel-frame" src="/static/reel.html?v=20260322b&theme=tiktok" title="SupportRD TV Reel"></iframe>
          <div class="support-rebuild-note">Need more SupportRD answers? Open Diary for Aria or Profile for the hair reader.</div>
        </div>
      </div>`;
  }
  function renderShellChrome() {
    $("srMiniCatalogWidget")?.remove();
    const products = getCatalogProducts().slice(0, 3);
    if (!products.length) return;
    const top = document.querySelector(".float-mode-top");
    if (!top) return;
    let widget = $("srCatalogCorner");
    if (!widget) {
      widget = document.createElement("aside");
      widget.id = "srCatalogCorner";
      widget.className = "support-rebuild-catalog-corner";
      top.appendChild(widget);
    } else if (widget.parentElement !== top) {
      top.appendChild(widget);
    }
    widget.innerHTML = `
      <div class="support-rebuild-catalog-corner-head">
        <div>
          <div class="support-rebuild-kicker">Featured Catalog</div>
          <div class="support-rebuild-title" style="margin-bottom:0;font-size:.96rem">3 Quick Products</div>
        </div>
      </div>
      <div class="support-rebuild-catalog-corner-grid">
        ${products.map((product) => `
          <button class="support-rebuild-catalog-corner-btn" data-corner-product="${product.id}" style="background-image:url('${product.image}')">
            <div>
              <div class="support-rebuild-title" style="font-size:.78rem;line-height:1.02;margin-bottom:4px">${product.title}</div>
              <div class="support-rebuild-price-badge" style="padding:5px 8px;font-size:.7rem">${product.price}</div>
            </div>
          </button>
        `).join("")}
      </div>`;
    widget.querySelectorAll("[data-corner-product]").forEach((btn) => btn.addEventListener("click", () => {
      const product = getCatalogProducts().find((item) => item.id === btn.dataset.cornerProduct);
      if (!product) return;
      if (product.physical) openCustomOrderProductModal(product);
      else openCatalogProductModal(product);
    }));
  }

  function ensureShellChrome() {
    if (!$("srCatalogCorner")) renderShellChrome();
  }

  function watchShellChrome() {}

  function bindLaunchButtons() {
    document.querySelectorAll(".float-launch-btn").forEach((btn) => {
      const clone = btn.cloneNode(true);
      btn.replaceWith(clone);
      clone.addEventListener("click", (event) => {
        event.preventDefault();
        const target = clone.dataset.floatTarget;
        activateRoute(state.route === target ? "" : target);
      });
    });
    syncLaunchVisuals();
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
      enableLegacyRemoteMode();
      ensureRouteHost();
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
      syncShopifyPublicConfig().then(renderShellChrome);
      ensureShellChrome();
      window.openSupportRDPaymentModal = openPaymentModal;
      window.closeSupportRDPaymentModal = closePaymentModal;
      window.SupportRDRemoteRebuildVersion = "20260413a";
    }

  setTimeout(init, 700);
})();





















