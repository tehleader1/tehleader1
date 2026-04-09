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
      displayName: "SupportRD Guest",
      loggedIn: false,
      plan: "Free",
      historySync: "Pending account sync",
      collapsed: false
    },
    statistics: {
      payments: "Needs verification",
      developerLog: "Listening for founder praise and field feedback.",
      contacts: "Tracking serious buyers, fly-ins, and bulk orders."
    },
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

  let state = loadState();
  let mediaRecorder = null;
  let mediaStream = null;
  let recordChunks = [];
  const boardAudio = { voice: null, beat: null, adlib: null, instrument: null };
  const boardBlobs = { voice: null, beat: null, adlib: null, instrument: null };
  let currentBoard = "voice";
  let paymentModal = null;
  let routeHost = null;
  let routeGrid = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        ...DEFAULTS,
        ...saved,
        diarySocial: { ...DEFAULTS.diarySocial, ...(saved.diarySocial || {}) },
        profile: { ...DEFAULTS.profile, ...(saved.profile || {}) },
        account: { ...DEFAULTS.account, ...(saved.account || {}) },
        statistics: { ...DEFAULTS.statistics, ...(saved.statistics || {}) }
      };
    } catch {
      return structuredClone ? structuredClone(DEFAULTS) : JSON.parse(JSON.stringify(DEFAULTS));
    }
  }

  function saveState() {
    localStorage.setItem(KEY, JSON.stringify(state));
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
        padding:18px;
        display:grid;
        gap:14px;
        align-content:start;
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
        display:block !important;
        grid-template-columns:1fr !important;
        padding:34px 0 0 !important;
        margin:0 !important;
        clear:both;
      }
      .float-mode-shell.support-rebuild-mode .float-mode-top,
      .float-mode-shell.support-rebuild-mode .float-mode-launch{
        position:relative;
        z-index:3;
      }
      .float-mode-shell.support-rebuild-mode .float-mode-launch{
        position:relative;
        top:auto;
        z-index:3;
        margin:0 0 22px !important;
        padding:14px !important;
        background:rgba(5,10,20,.74);
        border:1px solid rgba(255,255,255,.12);
        border-radius:26px;
        box-shadow:0 18px 38px rgba(0,0,0,.22);
      }
      .support-rebuild-shell{display:grid;gap:14px}
      .support-rebuild-route-host{display:grid;gap:16px;align-content:start}
      .support-rebuild-account-panel{position:fixed;top:16px;right:16px;z-index:75;width:min(360px,calc(100vw - 24px));padding:14px;border-radius:22px;background:rgba(7,12,22,.86);border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 42px rgba(0,0,0,.28)}
      .support-rebuild-account-panel.compact .support-rebuild-account-body{display:none}
      .support-rebuild-account-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px}
      .support-rebuild-account-kicker{font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.64)}
      .support-rebuild-account-meta{display:grid;gap:8px}
      .support-rebuild-overview{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
      .support-rebuild-home-top{display:grid;gap:12px;grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr)}
      .support-rebuild-card{background:rgba(9,12,22,.78);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:16px;color:#fff;box-shadow:0 18px 50px rgba(0,0,0,.24)}
      .support-rebuild-title{font:700 1.05rem/1.2 Georgia,serif;letter-spacing:.02em;margin:0 0 10px}
      .support-rebuild-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
      .support-rebuild-grid{display:grid;gap:12px}
      .support-rebuild-grid.two{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
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
        margin:26px 0 0 !important;
        min-height:calc(100vh - 235px);
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

  function getCheckoutUrl(product) {
    const variantId = String(product?.variants?.[0]?.id || product?.variant || "").replace(/\D/g, "");
    const handle = String(product?.handle || "").trim();
    if (variantId) return `https://supportrd.com/cart/${variantId}:1?checkout`;
    if (handle) return `https://supportrd.com/products/${handle}`;
    return "https://supportrd.com/cart";
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
          </div>
        </div>
        <div class="support-rebuild-card" style="padding:12px">
          <div class="support-rebuild-title">Credit / Debit Capture</div>
          <div class="support-rebuild-note">Shopify Checkout should show the real card page, and Apple Pay / Google Pay appear there when supported.</div>
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
      window.location.href = getCheckoutUrl(product);
    });
    body.querySelectorAll("[data-details]").forEach((btn) => btn.onclick = () => {
      const product = products.find((item) => item.handle === btn.dataset.details);
      const title = product?.title || "SupportRD Product";
      const desc = product?.body_html || product?.description || "Product details are loading from the SupportRD catalog.";
      body.innerHTML = `<div class="support-rebuild-row" style="justify-content:space-between"><h3 class="support-rebuild-title">${title}</h3><button class="support-rebuild-btn ghost" id="srBackPaymentModal">Back</button></div><div class="support-rebuild-note">${desc}</div>`;
      $("srBackPaymentModal").onclick = openPaymentModal;
    });
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
      state.diaryFeed = [
        `${name}: listening activated.`,
        `You: ${heard}`,
        `${name}: ${reply}`
      ];
      saveState();
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
      recog.start();
      state.diaryFeed = [`${name}: mic open. Speak now.`, "Listening for your hair problem..."];
      saveState();
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
  }

  function updateAssistantDock(text) {
    if ($("srAssistantBubble")) $("srAssistantBubble").textContent = text;
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
          <div class="support-rebuild-account-kicker">Account Engine</div>
          <div class="support-rebuild-title" style="margin:0">${state.account.engine}</div>
        </div>
        <button class="support-rebuild-btn ghost" id="srAccountToggle">${state.account.collapsed ? "Open" : "Hide"}</button>
      </div>
      <div class="support-rebuild-note">${accountSummary()}</div>
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
          <div class="support-rebuild-note" id="srSettingsStatus">Premium status: ${state.premium}. Account engine: ${accountSummary()}. Full settings includes links, password, address, and payment review.</div>
          <div id="srSettingsFullLane" style="display:none;margin-top:12px" class="support-rebuild-grid two">
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Identity + Security</div>
              <input class="support-rebuild-input" id="srSettingsUsername" placeholder="Username" value="${state.profile.name || ""}">
              <input class="support-rebuild-input" id="srSettingsOldPassword" style="margin-top:10px" type="password" placeholder="Current password">
              <input class="support-rebuild-input" id="srSettingsPassword" style="margin-top:10px" type="password" placeholder="Change password flow">
              <input class="support-rebuild-input" id="srSettingsPasswordConfirm" style="margin-top:10px" type="password" placeholder="Confirm new password">
              <input class="support-rebuild-input" id="srSettingsAddress" style="margin-top:10px" placeholder="Address information">
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Payments + URLs</div>
              <input class="support-rebuild-input" id="srSettingsPayment" placeholder="Current payment / premium status" value="${state.premium}">
              <input class="support-rebuild-input" id="srSettingsUrl" style="margin-top:10px" placeholder="Primary URL link" value="${state.profile.contact || ""}">
              <select class="support-rebuild-select" id="srSettingsFantasy" style="margin-top:10px">
                <option>Fantasy Off</option>
                <option>Fantasy Basic</option>
                <option>Fantasy Advanced</option>
              </select>
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Contacts / Channels</div>
              <div class="support-rebuild-note">Email, payments, in-person location, team accessibility, technical support, and fan feedback stay visible here.</div>
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Save Changes</div>
              <div class="support-rebuild-note">Push notifications can request browser permission here so Aria can stay in touch about hair status.</div>
              <button class="support-rebuild-btn pulse" id="srSettingsSaveAll">Save Full Settings</button>
            </div>
          </div>
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
        state.profile.contact = $("srSettingsUrl").value.trim();
        state.premium = $("srSettingsPayment").value.trim() || state.premium;
        state.account.plan = state.premium;
        saveState();
        renderShellChrome();
        renderAccountPanel();
        $("srSettingsStatus").textContent = newPass
          ? "Full settings saved locally. Password flow accepted in the app shell and push stays connected through browser permission."
          : "Full settings saved locally. Push stays connected through browser notification permission.";
      };
    };
  }

  function renderDiary() {
    const box = $("floatSettingsBox");
    if (!box) return;
    const lines = formatDiaryLines(state.diaryText);
    const historyLines = state.diaryFeed.length ? state.diaryFeed : ["Chat history empty right before they start.", "Aria is ready for hair talk.", "Jake is waiting for studio help."];
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
              <div class="support-rebuild-title">Send Links</div>
              <div class="support-rebuild-note">Route best options for IG, FB, TikTok, X, Snapchat, and LinkedIn posting.</div>
              ${["instagram","facebook","tiktok","x","snapchat","linkedin"].map((p)=>`<label class="support-rebuild-row support-rebuild-note"><input type="checkbox" data-platform="${p}" ${state.diarySocial[p] ? "checked" : ""}/> ${p}</label>`).join("")}
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Aria / Jake</div>
              <div class="support-rebuild-note">Fixed above the history, hands-free ready, and listening for hair problems.</div>
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
              <textarea class="support-rebuild-textarea" id="srDiaryText">${state.diaryText}</textarea>
            </div>
            <div class="support-rebuild-diary-preview">
              ${lines.map((line)=>`<div>${line}</div>`).join("")}
            </div>
          </div>
          ${state.liveMode ? `<div class="support-rebuild-livefeed" style="margin-top:12px"><div class="support-rebuild-title">Live Session</div><div class="support-rebuild-note">Public display active. Hearts, likes, comments, guest username popup, and Fast Pay belong to this live lane.</div><div class="support-rebuild-row"><span class="support-rebuild-pill">Heart Support</span><span class="support-rebuild-pill">Two Thumbs Up</span><span class="support-rebuild-pill">Fast Pay Gifts</span><span class="support-rebuild-pill">Guest Username</span></div><div class="support-rebuild-note">Click Live Session again to exit and restore normal diary mode.</div></div>` : ""}
        </div>
      </div>`;
    $("srSendSocialBtn").onclick = openPlatforms;
    $("srDiaryLevel").onchange = (e) => { state.diaryLevel = e.target.value; saveState(); };
    $("srHandsFreeBtn").onclick = () => {
      state.diaryFeed = [
        "Hands-free Aria is now listening to hair problems.",
        "Jake is standing by for studio-toned support.",
        `Current level: ${state.diaryLevel}.`
      ];
      saveState();
      renderDiary();
    };
    $("srTalkAria").onclick = () => startAssistant("Aria");
    $("srTalkJake").onclick = () => startAssistant("Jake");
    $("srDiaryLiveBtn").onclick = () => { state.liveMode = !state.liveMode; saveState(); renderDiary(); };
    $("srDiarySaveBtn").onclick = () => {
      state.diaryDescription = $("srDiaryDesc").value;
      state.diaryText = $("srDiaryText").value;
      document.querySelectorAll("[data-platform]").forEach((cb) => { state.diarySocial[cb.dataset.platform] = cb.checked; });
      saveState();
      renderShellChrome();
      renderDiary();
    };
  }

  function renderProfile() {
    const box = $("floatAssistantBox");
    if (!box) return;
    const p = state.profile;
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
              <div class="support-rebuild-note" id="srHairScanStatus" style="margin-top:10px">Texture, hair color, sign of damage, and hair type will appear here.</div>
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">2-Step Verification</div>
              <div class="support-rebuild-note">Require password plus phone or 6-digit code after 4 hours away.</div>
              <input class="support-rebuild-input" id="srProfileContact" placeholder="Main contact / live invite URL" value="${p.contact}" style="margin-top:10px">
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
    };
    $("srProfileLive").onclick = () => {
      window.open(p.contact || "https://supportrd.com/live", "_blank", "noopener");
    };
    $("srHairScanBtn").onclick = () => {
      const bar = $("srHairScanBar");
      const status = $("srHairScanStatus");
      [10,40,50,60,80,100].forEach((n, idx) => setTimeout(() => {
        bar.style.width = `${n}%`;
        status.textContent = n < 100 ? `Hair scan loading ${n}%` : "Hair analysis: texture soft wave, color dark brown, light dryness, type straight-curly mix.";
      }, 350 * (idx + 1)));
    };
  }

  function renderMap() {
    const box = $("floatDeviceBox");
    if (!box) return;
    const view = MAPS[state.map] || MAPS.default;
    box.innerHTML = `
      <div class="support-rebuild-shell">
        <div class="support-rebuild-card">
          <h3 class="support-rebuild-title">Map Change</h3>
          <div class="support-rebuild-map-hero" style="background:${view.image}">
            <div class="support-rebuild-title">${view.title}</div>
            <div class="support-rebuild-note">Map perks should help diary, live, studio, and profile decisions.</div>
          </div>
          <div class="support-rebuild-row" style="margin-top:12px">
            ${Object.keys(MAPS).map((key)=>`<button class="support-rebuild-btn ${state.map===key?"pulse":""}" data-map="${key}">${MAPS[key].title}</button>`).join("")}
          </div>
          <div class="support-rebuild-perks" style="margin-top:12px">
            ${view.perks.map((perk)=>`<button class="support-rebuild-btn ghost" data-perk="${perk.name}">${perk.name}</button>`).join("")}
          </div>
          <div class="support-rebuild-grid two" style="margin-top:12px">
            ${view.perks.map((perk)=>`<div class="support-rebuild-card" style="padding:12px"><div class="support-rebuild-title">${perk.name}</div><div class="support-rebuild-note">Helps with: ${perk.help}</div><div class="support-rebuild-note" style="margin-top:8px">${perk.pro}</div></div>`).join("")}
          </div>
          <div class="support-rebuild-note" id="srMapStatus">Choosing a perk should route you to the next best help area.</div>
        </div>
      </div>`;
    box.querySelectorAll("[data-map]").forEach((btn) => btn.onclick = () => { state.map = btn.dataset.map; saveState(); syncLaunchVisuals(); renderMap(); });
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
    box.innerHTML = `
      <div class="support-rebuild-shell">
        <div class="support-rebuild-card">
          <h3 class="support-rebuild-title">Studio Quick Panel</h3>
          <div class="support-rebuild-row">
            <button class="support-rebuild-btn pulse" id="srStudioRecord">Record</button>
            <button class="support-rebuild-btn ghost" id="srStudioVideo">Live Record Video</button>
            <button class="support-rebuild-btn ghost" id="srStudioStop">Stop</button>
            <button class="support-rebuild-btn ghost" id="srStudioPlay">Play</button>
            <button class="support-rebuild-btn ghost" id="srStudioPause">Pause</button>
            <button class="support-rebuild-btn ghost" id="srStudioRewind">Rewind</button>
            <button class="support-rebuild-btn ghost" id="srStudioForward">Fast Forward</button>
            <button class="support-rebuild-btn ghost" id="srStudioExport">Export File</button>
          </div>
          <div class="support-rebuild-grid three" style="display:grid;gap:12px;grid-template-columns:1fr">
            ${["voice","beat","adlib","instrument"].map((board)=>`<div class="support-rebuild-board"><div class="support-rebuild-row"><strong>${board.toUpperCase()} BOARD</strong><button class="support-rebuild-btn ghost" data-board="${board}">Select</button><input type="file" accept="audio/*,video/*" data-upload="${board}"></div><div class="support-rebuild-note" id="srBoardName_${board}">${board}-track.wav</div><div class="support-rebuild-wave"></div></div>`).join("")}
          </div>
          <div class="support-rebuild-grid two" style="margin-top:12px">
            <div>
              <label class="support-rebuild-note">FX Settings</label>
              <select class="support-rebuild-select" id="srStudioFx"><option>Echo</option><option>Reverb</option><option>Fade In</option><option>Fade Out</option><option>Bass</option><option>Treble</option><option>Deep Voice</option><option>Opera Voice</option><option>Slow Motion</option><option>Camera Lighting</option><option>Panoramic</option><option>Zoom</option></select>
            </div>
            <div class="support-rebuild-note" id="srStudioStatus">Ready. Motherboards should play from beginning to end and export with visible progress.</div>
          </div>
          <div class="support-rebuild-card" style="margin-top:12px;padding:12px">
            <div class="support-rebuild-title">Export Types</div>
            <div class="support-rebuild-row"><span class="support-rebuild-pill">.mp3</span><span class="support-rebuild-pill">.mp4</span><span class="support-rebuild-pill">.m4a</span></div>
            <div class="support-rebuild-note" style="margin-top:10px">Live recording mode should expose camera settings, panoramic, zoom, wave sweep, lighting, and selfie capture.</div>
          </div>
          <div class="support-rebuild-progress" style="margin-top:12px"><span id="srStudioBar"></span></div>
        </div>
      </div>`;
    box.querySelectorAll("[data-board]").forEach((btn) => btn.onclick = () => { currentBoard = btn.dataset.board; $("srStudioStatus").textContent = `Editing ${currentBoard} board.`; });
    box.querySelectorAll("[data-upload]").forEach((input) => input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      boardAudio[input.dataset.upload] = new Audio(URL.createObjectURL(file));
      $(`srBoardName_${input.dataset.upload}`).textContent = file.name;
      $("srStudioStatus").textContent = `${file.name} loaded into ${input.dataset.upload} board.`;
    });
    $("srStudioRecord").onclick = startRecord;
    $("srStudioVideo").onclick = () => { $("srStudioStatus").textContent = "Live Record Video armed: panoramic, zoom, wave sweep, lighting, and selfie capture are the active camera modes."; };
    $("srStudioStop").onclick = stopRecord;
    $("srStudioPlay").onclick = playBoards;
    $("srStudioPause").onclick = () => Object.values(boardAudio).forEach((audio) => audio && audio.pause());
    $("srStudioRewind").onclick = () => Object.values(boardAudio).forEach((audio) => { if (audio) audio.currentTime = 0; });
    $("srStudioForward").onclick = () => Object.values(boardAudio).forEach((audio) => { if (audio) audio.currentTime += 3; });
    $("srStudioExport").onclick = exportStudio;
  }

  async function startRecord() {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordChunks = [];
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorder.ondataavailable = (e) => e.data.size && recordChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(recordChunks, { type: "audio/webm" });
        boardAudio[currentBoard] = new Audio(URL.createObjectURL(blob));
        $(`srBoardName_${currentBoard}`).textContent = `${currentBoard}-take.webm`;
        $("srStudioStatus").textContent = `${currentBoard} recording saved.`;
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
    }, 300 * (idx + 1)));
  }

  function renderFaqAddon() {
    const box = $("floatLiveBox");
    if (!box) return;
    const view = MAPS[state.map] || MAPS.default;
    box.innerHTML = `
      <div class="support-rebuild-shell">
        <div class="support-rebuild-card">
          <h3 class="support-rebuild-title">FAQ Lounge</h3>
          <iframe class="support-rebuild-reel-frame" src="/static/reel.html?v=20260322b&theme=tiktok" title="SupportRD TV Reel"></iframe>
          <div class="support-rebuild-note" style="margin-top:10px">${view.title} now drives the FAQ reel mood and route ideas.</div>
          <div class="support-rebuild-row">
            <button class="support-rebuild-btn pulse">Tiktok Style Hair</button>
            <button class="support-rebuild-btn ghost">Youtube Style Hair</button>
            <button class="support-rebuild-btn ghost">Movies Style Hair</button>
          </div>
          <select class="support-rebuild-select" style="margin-top:12px">
            <option>What helps dryness fastest?</option>
            <option>How do I detangle without damage?</option>
            <option>What premium level fits me?</option>
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
              </div>
            </div>
          </div>
        </div>
      </div>`;
    $("srFaqPayments")?.addEventListener("click", openPaymentModal);
    $("srFaqTech")?.addEventListener("click", ()=>window.open("mailto:xxfigueroa1993@yahoo.com?subject=SupportRD%20Technical%20Support","_blank","noopener"));
    $("srFaqFan")?.addEventListener("click", ()=>window.open("mailto:xxfigueroa1993@yahoo.com?subject=SupportRD%20Fan%20Feedback","_blank","noopener"));
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
    top.innerHTML = `
      <div class="support-rebuild-home-top">
        <div class="support-rebuild-card">
          <div class="support-rebuild-title">Main Structure</div>
          <div class="support-rebuild-note">Durable, payment-friendly, responsive, and ready for that on-the-go curve moment where someone first hears about SupportRD.</div>
          <div class="support-rebuild-overview" style="margin-top:12px">
            <div class="support-rebuild-card"><div class="support-rebuild-title">Diary Mode</div><div class="support-rebuild-note">Live mode, hands-free Aria, real diary, and hair-problem support.</div></div>
            <div class="support-rebuild-card"><div class="support-rebuild-title">Studio</div><div class="support-rebuild-note">Vocals, beat, instrument, FX, and export-minded creation on the move.</div></div>
            <div class="support-rebuild-card"><div class="support-rebuild-title">Profile</div><div class="support-rebuild-note">Hair analysis, serious image, live invite, and professional prep.</div></div>
            <div class="support-rebuild-card"><div class="support-rebuild-title">Map Change</div><div class="support-rebuild-note">Fun visuals, serious routing, and making-money map help.</div></div>
          </div>
        </div>
        <div class="support-rebuild-card">
          <div class="support-rebuild-title">General Options</div>
          <div class="support-rebuild-note">Perks and advantages that make the app feel good to use.</div>
          <div class="support-rebuild-line">Statistics: SEO build, remote usefulness, and account flow health.</div>
          <div class="support-rebuild-line">Contacts / Channels: Render, GitHub, support email, payments, in-person routes, technical support, and fan feedback.</div>
          <div class="support-rebuild-line">FAQ Lounge: relax, breathe, laugh at reels, and get real answers.</div>
          <div class="support-rebuild-line">Account Engine: ${accountSummary()} · ${state.account.historySync}</div>
        </div>
      </div>`;
    top.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest(".support-rebuild-card")) return;
    });
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
    activateRoute(state.route);
    fetchProducts();
      window.SupportRDRemoteRebuildVersion = "20260409d";
    }

  setTimeout(init, 700);
})();






