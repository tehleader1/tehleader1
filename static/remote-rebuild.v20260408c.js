(() => {
  const KEY = "sr_rebuild_state_v1";
  const DEFAULTS = {
    route: "floatBoardsBox",
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
    statistics: {
      payments: "Needs verification",
      developerLog: "Listening for founder praise and field feedback.",
      contacts: "Tracking serious buyers, fly-ins, and bulk orders."
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

  let state = loadState();
  let mediaRecorder = null;
  let mediaStream = null;
  let recordChunks = [];
  const boardAudio = { voice: null, beat: null, adlib: null, instrument: null };
  let currentBoard = "voice";

  function loadState() {
    try {
      return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
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
      .support-rebuild-shell{display:grid;gap:14px}
      .support-rebuild-overview{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
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
    `;
    document.head.appendChild(style);
  }

  function activateRoute(routeId) {
    state.route = routeId;
    saveState();
    document.querySelectorAll(".float-box").forEach((box) => {
      box.classList.toggle("support-rebuild-active", box.id === routeId);
    });
    document.querySelectorAll(".float-launch-btn").forEach((btn) => {
      btn.classList.toggle("pulse-ring", btn.dataset.floatTarget === routeId);
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
          <div class="support-rebuild-note" id="srSettingsStatus">Premium status: ${state.premium}. Full settings includes links, password, address, and payment review.</div>
          <div id="srSettingsFullLane" style="display:none;margin-top:12px" class="support-rebuild-grid two">
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Identity + Security</div>
              <div class="support-rebuild-note">Username, password, phone verification, 6-digit code, and address controls live here.</div>
            </div>
            <div class="support-rebuild-card" style="padding:12px">
              <div class="support-rebuild-title">Payments + URLs</div>
              <div class="support-rebuild-note">Current payments verify premium, social URL links save, and fantasy choice routing sits here too.</div>
            </div>
          </div>
        </div>
      </div>`;
    $("srPushBtn").onclick = () => { state.push = !state.push; saveState(); renderSettings(); };
    $("srOpenFullSettings").onclick = () => {
      $("srSettingsStatus").textContent = "Full Settings opened: username/password, payments, URL links, push notifications, and fantasy routing are active.";
      $("srSettingsFullLane").style.display = "grid";
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
    $("srDiaryLiveBtn").onclick = () => { state.liveMode = !state.liveMode; saveState(); renderDiary(); };
    $("srDiarySaveBtn").onclick = () => {
      state.diaryDescription = $("srDiaryDesc").value;
      state.diaryText = $("srDiaryText").value;
      document.querySelectorAll("[data-platform]").forEach((cb) => { state.diarySocial[cb.dataset.platform] = cb.checked; });
      saveState();
      renderDiary();
    };
  }

  function renderProfile() {
    const box = $("floatAssistantBox");
    if (!box) return;
    const p = state.profile;
    box.innerHTML = `
      <div class="support-rebuild-shell">
        <div class="support-rebuild-card">
          <h3 class="support-rebuild-title">Profile</h3>
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
      saveState();
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
          <div class="support-rebuild-tv">
            <div>
              <div class="support-rebuild-title">TV Reel Open By Default</div>
              <div class="support-rebuild-note">${view.title} now drives the FAQ reel mood and route ideas.</div>
            </div>
          </div>
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
        </div>
      </div>`;
  }

  function syncLaunchVisuals() {
    const view = MAPS[state.map] || MAPS.default;
    document.querySelectorAll(".float-launch-btn").forEach((btn) => {
      btn.style.background = view.image;
      btn.style.borderRadius = "22px";
      btn.style.color = "#fff";
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

  function init() {
    injectStyle();
    bindLaunchButtons();
    renderSettings();
    renderDiary();
    renderProfile();
    renderMap();
    renderStudio();
    renderFaqAddon();
    syncLaunchVisuals();
    activateRoute(state.route);
    window.SupportRDRemoteRebuildVersion = "20260408c";
  }

  setTimeout(init, 700);
})();
