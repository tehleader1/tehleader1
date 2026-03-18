const qs = (sel) => document.querySelector(sel)
const qsa = (sel) => Array.from(document.querySelectorAll(sel))

const THEMES = ["aurora","ice","ember","carbon","nebula"]
const DEFAULT_THEME = "aurora"
const THEME_CONTENT = [
  {title:"SupportRD Live", desc:"Hair care, routines, product matching, and live guidance — all focused on healthy hair, growth, and repair."},
  {title:"SupportRD Live Studio", desc:"Moisture, bounce, and growth tracking with ARIA‑guided routines and real product wins."},
  {title:"SupportRD Live Lab", desc:"Deep repair, scalp care, and shine — your weekly routine mapped in 7‑day views."},
  {title:"SupportRD Live Motion", desc:"Social‑ready hair moments, instant scans, and custom orders with Evelyn."},
  {title:"SupportRD Live Pro", desc:"Professional routines, growth analytics, and premium subscription guidance."}
]
const HERO_FILTERS = [
  "saturate(1.1) contrast(1.05)",
  "hue-rotate(15deg) saturate(1.2)",
  "hue-rotate(-10deg) saturate(1.15)",
  "grayscale(0.1) contrast(1.1)",
  "hue-rotate(25deg) saturate(1.25)"
]

const LINKS = {
  premium: "https://supportrd.com/products/hair-advisor-premium",
  pro: "https://supportrd.com/products/professional-hair-advisor",
  donate: "https://supportrd.com/products/auto-dissolve-soap-bar",
  custom: "https://supportrd.com/pages/custom-order"
}

const BLOG_POSTS = [
  {title:"Repair story: Heat damage recovery", body:"Week 1: moisture stacking, trim, and protective styling.\n\nWeek 2: deep conditioning twice a week, gentle detangle, scalp oil.\n\nWeek 3: protein balance and low‑heat styling.\n\nWeek 4: shine restore, reduced breakage, and curl definition back."},
  {title:"Protein balance for bounce", body:"Step 1: hydrate with a light leave‑in.\n\nStep 2: add protein treatment every 7–10 days.\n\nStep 3: seal with oil or butter.\n\nResult: curls hold shape with less frizz."},
  {title:"All‑in‑one product success stories", body:"Fast routines using the all‑in‑one product for shine, softness, and reduced breakage.\n\nMorning: apply to damp hair.\n\nMid‑day: refresh with a light mist.\n\nNight: protect with satin wrap."}
]

  const state = {
    themeIndex: 0,
    blogIndex: 0,
    ariaHistory: [],
    socialLinks: {},
    hairScore: 0,
    subscription: "free",
    ariaCount: 0,
    ariaBlocked: false,
    puzzleAnswer: null
  }

function toast(msg){
  const el = qs("#toast")
  el.textContent = msg
  el.style.display = "block"
  clearTimeout(el._t)
  el._t = setTimeout(()=>{el.style.display="none"}, 2200)
}

function beep(freq = 880, duration = 120){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = freq
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    setTimeout(()=>{osc.stop(); ctx.close()}, duration)
  }catch{}
}

function initHairScore(){
  state.hairScore = 100
  localStorage.setItem("hairScore", "100")
}

function bumpHairScore(delta){
  const next = Math.min(100, Math.max(0, state.hairScore + delta))
  if(next !== state.hairScore){
    state.hairScore = next
    localStorage.setItem("hairScore", String(state.hairScore))
  }
}

  function appendConversation(role, text){
    const log = qs("#conversationLog")
    if(!log) return
    if(log.textContent === "No conversation yet.") log.textContent = ""
    const div = document.createElement("div")
    div.className = `conversation-item ${role}`
    div.textContent = `${role === "user" ? "You" : "ARIA"}: ${text}`
    log.appendChild(div)
    log.scrollTop = log.scrollHeight
  }

  function showSpeechPopup(who, text){
    const existing = qs("#speechPopup")
    if(existing) existing.remove()
    const anchor = qs("#speechPopupAnchor") || qs("#centerStage") || document.body
    const stage = qs("#centerStage")
    const pop = document.createElement("div")
    pop.id = "speechPopup"
    pop.className = "speech-popup"
    const userAvatar = state.userAvatar || "/static/images/woman-waking-up12.jpg"
    const ariaAvatar = "/static/images/woman-waking-up12.jpg"
    pop.innerHTML = `
      <div class="speech-avatars">
        <div class="speech-avatar me" style="background-image:url('${userAvatar}')"></div>
        <div class="speech-avatar aria" style="background-image:url('${ariaAvatar}')"></div>
      </div>
      <div class="speech-body">
        <div class="who">${who}</div>
        <div class="speech-text">${text}</div>
      </div>
    `
    anchor.appendChild(pop)
    if(stage && anchor === qs("#speechPopupAnchor")){
      const bounds = stage.getBoundingClientRect()
      const x = bounds.width * (0.35 + Math.random() * 0.3)
      const y = bounds.height * (0.2 + Math.random() * 0.4)
      pop.style.left = `${x}px`
      pop.style.top = `${y}px`
    }
    requestAnimationFrame(()=>pop.classList.add("show"))
    setTimeout(()=>{ pop.classList.remove("show"); setTimeout(()=>pop.remove(), 240) }, 1900)
  }

  async function askAria(msg){
    if(!msg) return
    if(state.ariaBlocked){
      openModal("puzzleModal")
      return
    }
    appendAria(`You: ${msg}`)
    appendConversation("user", msg)
    showSpeechPopup("YOU", msg)
    try{
      setAriaFlow("processing")
      const r = await fetch("/api/aria",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message: msg})
      })
      const d = await r.json()
      const reply = d.reply || "AI unavailable"
      appendAria(`ARIA: ${reply}`)
      appendConversation("aria", reply)
      showSpeechPopup("ARIA", reply)
      bumpHairScore(1)
      speakReply(reply)
      state.ariaCount += 1
    const limit = state.subscription === "pro" ? 1e9 : (state.subscription === "premium" ? 8 : 2)
    if(state.ariaCount >= limit){
      state.ariaBlocked = true
      openModal("puzzleModal")
    }
    }catch{
      appendAria("ARIA: AI unavailable")
      appendConversation("aria", "AI unavailable")
      showSpeechPopup("ARIA", "AI unavailable")
      setAriaFlow("idle")
    }
  }

  let cachedAriaVoice = null
    function setAriaFlow(state){
      const overlay = qs("#listeningOverlay")
      const textEl = qs("#ariaFlowText")
      const transcriptEl = qs("#ariaTranscript")
      if(!overlay || !textEl) return
      if(state === "listening"){
        document.body.classList.add("listening")
        textEl.textContent = "Listening…"
        if(transcriptEl){ transcriptEl.textContent = "Say something about your hair…" }
      }else if(state === "processing"){
        document.body.classList.add("listening")
        textEl.textContent = "Processing…"
        if(transcriptEl){ transcriptEl.textContent = "Analyzing your words…" }
      }else if(state === "speaking"){
        document.body.classList.add("listening")
        textEl.textContent = "ARIA Speaking…"
        if(transcriptEl){ transcriptEl.textContent = "Replying with hair guidance…" }
      }else{
        document.body.classList.remove("listening")
      }
    }
  function speakReply(text){
    try{
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 1
      utter.pitch = 1.1
      utter.lang = "en-US"
      const voices = window.speechSynthesis.getVoices() || []
      const nameOrder = [
        "Google US English",
        "Microsoft Aria Online (Natural) - English (United States)",
        "Microsoft Jenny Online (Natural) - English (United States)",
        "Samantha",
        "Zira",
        "Ava",
        "Allison",
        "Victoria",
        "Karen"
      ]
      if(!cachedAriaVoice){
        cachedAriaVoice =
          nameOrder.map(n => voices.find(v => v.name === n && v.lang === "en-US")).find(Boolean) ||
          voices.find(v => v.lang === "en-US" && /female|woman|girl/i.test(v.name)) ||
          voices.find(v => v.lang === "en-US")
      }
      if(cachedAriaVoice){ utter.voice = cachedAriaVoice }
      utter.onstart = ()=>setAriaFlow("speaking")
      utter.onend = ()=>{
        playDoneChime()
        setAriaFlow("idle")
      }
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
    }catch{}
  }
  if(window.speechSynthesis && typeof window.speechSynthesis.onvoiceschanged !== "undefined"){
    window.speechSynthesis.onvoiceschanged = ()=>{ cachedAriaVoice = null }
  }
  
  let listenCtx = null
  let listenOsc = null
  let listenGain = null
  let listenLfo = null
  let listenLfoGain = null
  function startListenLoop(){
    stopListenLoop()
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext
      listenCtx = new Ctx()
      listenOsc = listenCtx.createOscillator()
      listenGain = listenCtx.createGain()
      listenLfo = listenCtx.createOscillator()
      listenLfoGain = listenCtx.createGain()
      listenOsc.type = "sine"
      listenOsc.frequency.value = 430
      listenGain.gain.value = 0.02
      listenLfo.type = "sine"
      listenLfo.frequency.value = 0.8
      listenLfoGain.gain.value = 0.03
      listenLfo.connect(listenLfoGain)
      listenLfoGain.connect(listenGain.gain)
      listenOsc.connect(listenGain)
      listenGain.connect(listenCtx.destination)
      listenOsc.start()
      listenLfo.start()
    }catch{}
  }
  function stopListenLoop(){
    try{
      if(listenGain){
        const t = listenCtx.currentTime
        listenGain.gain.setTargetAtTime(0.0001, t, 0.05)
      }
    }catch{}
    setTimeout(()=>{
      try{ if(listenOsc) listenOsc.stop() }catch{}
      try{ if(listenLfo) listenLfo.stop() }catch{}
      try{ if(listenCtx) listenCtx.close() }catch{}
      listenCtx = listenOsc = listenGain = listenLfo = listenLfoGain = null
    }, 160)
  }

  function playDoneChime(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
    osc.frequency.value = 660
    gain.gain.value = 0.06
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    setTimeout(()=>{osc.frequency.value = 880}, 120)
    setTimeout(()=>{osc.stop(); ctx.close()}, 280)
  }catch{}
}

  function setupTabs(){
  qsa(".tab-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
      btn.classList.add("active")
      const id = btn.dataset.tab
      qsa(".tab-panel").forEach(p=>p.classList.remove("active"))
      qs(`#tab-${id}`).classList.add("active")
    })
  })
}

function setupThemeArrows(){
  const prev = qs("#themePrevSide")
  const next = qs("#themeNextSide")
  const saved = localStorage.getItem("theme") || DEFAULT_THEME
  state.themeIndex = Math.max(0, THEMES.indexOf(saved))
  applyTheme()

  prev.addEventListener("click", ()=>{state.themeIndex = (state.themeIndex - 1 + THEMES.length) % THEMES.length; applyTheme()})
  next.addEventListener("click", ()=>{state.themeIndex = (state.themeIndex + 1) % THEMES.length; applyTheme()})

  function applyTheme(){
    document.body.className = `theme-${THEMES[state.themeIndex]}`
    localStorage.setItem("theme", THEMES[state.themeIndex])
    const content = THEME_CONTENT[state.themeIndex % THEME_CONTENT.length]
    const hero = qs(".center-hero")
    if(hero && content){
      const h2 = hero.querySelector("h2")
      const p = hero.querySelector("p")
      if(h2) h2.textContent = content.title
      if(p) p.textContent = content.desc
    }
    const icon = qs("#heroIcon")
    if(icon){
      icon.style.filter = HERO_FILTERS[state.themeIndex % HERO_FILTERS.length]
    }
  }

  function setupScanPills(){
    qsa(".scan-pill").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const issue = btn.dataset.aria || btn.textContent.trim()
        const post = qs("#postInput")
        if(post){
          const line = `Hair scan update: ${issue}. Looking for a fix, routine, and product match.`
          post.value = line
          post.focus()
        }
        btn.classList.remove("bounce")
        void btn.offsetWidth
        btn.classList.add("bounce")
      })
    })
  }
  setupScanPills()
}


function setupModals(){
  const occBtn = qs("#menuOccasion")
  if(occBtn){
    occBtn.addEventListener("click", ()=>{
      if(state.subscription === "free"){
        openModal("subscriptionModal")
        toast("Occasion Editor is Premium+")
        return
      }
      openModal("occasionModal")
    })
  }
  bindOpen("menuGift", "giftModal")
  bindOpen("menuSubscription", "subscriptionModal")
  bindClose("closeOccasion", "occasionModal")
  bindClose("closeGift", "giftModal")
  bindClose("closeSubscription", "subscriptionModal")
  bindOpen("openSeo", "seoModal")
  bindClose("closeSeo", "seoModal")
  bindClose("closeBlog", "blogModal")
  bindClose("closeApp", "appModal")
  bindClose("closeLink", "linkModal")
  bindClose("closePuzzle", "puzzleModal")
  bindClose("closeCustomOrder", "customOrderModal")
  bindClose("closeReel", "reelModal")
  bindClose("closeSettings", "settingsModal")
  bindClose("closeCamera", "cameraModal")

  qsa(".blog-post").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.blogIndex = Number(btn.dataset.post)
      renderBlog()
      openModal("blogModal")
    })
  })

  qs("#blogPrev").addEventListener("click", ()=>{state.blogIndex = (state.blogIndex - 1 + BLOG_POSTS.length) % BLOG_POSTS.length; renderBlog()})
  qs("#blogNext").addEventListener("click", ()=>{state.blogIndex = (state.blogIndex + 1) % BLOG_POSTS.length; renderBlog()})

  qsa("#appsRow .app-card").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const name = btn.dataset.app
        if(name && name.includes("Donate")){
          renderApp(name)
          openModal("appModal")
          return
        }
    const link = btn.dataset.link
    if(link){
      openLinkModal(link, "SupportRD Link")
      return
    }
        if(name === "Settings"){
          openModal("settingsModal")
          return
        }
        if(name === "Blog"){
          state.blogIndex = 0
          renderBlog()
          openModal("blogModal")
          return
        }
        if(name === "Gift Shop"){
          openModal("giftModal")
          return
        }
        if(name === "TV Reel"){
          openModal("reelModal")
          return
        }
        if(name === "SEO Engine Viewer"){
          openModal("seoModal")
          return
        }
        if(name === "Camera"){
          openModal("cameraModal")
          return
        }
        if(name === "Occasion Editor"){
          openModal("occasionModal")
          return
        }
        if(name === "Subscription Banner"){
          openModal("subscriptionModal")
          return
        }
        bumpHairScore(1)
        if(name === "Snapshot Coder Idea" && state.subscription === "free"){
          openModal("subscriptionModal")
          toast("Snapshot Coder is Premium+")
          return
        }
        renderApp(name)
        openModal("appModal")
      })
    })

  qsa(".gift-card .btn").forEach(btn=>{
    btn.addEventListener("click", ()=>openLinkModal(LINKS.custom, "Custom Order"))
  })
}

function openModal(id){
  const el = qs("#" + id)
  if(el){ el.style.display = "flex" }
}

function bindOpen(triggerId, modalId){
  const el = qs("#" + triggerId)
  if(el){ el.addEventListener("click", ()=>openModal(modalId)) }
}

function bindClose(triggerId, modalId){
  const el = qs("#" + triggerId)
  if(el){ el.addEventListener("click", ()=>{ const m = qs("#" + modalId); if(m) m.style.display = "none" }) }
}

function openLinkModal(url, title){
  const modal = qs("#linkModal")
  const frame = qs("#linkFrame")
  const header = qs("#linkTitle")
  const notice = qs("#linkNotice")
  const external = qs("#linkExternal")
  if(!modal || !frame || !header) return
  header.textContent = title || "Open Link"
  if(url && url.startsWith("mailto:")){
    notice.style.display = "block"
    external.style.display = "inline-flex"
    external.onclick = ()=>{ window.location.href = url }
    frame.src = "about:blank"
  } else {
    notice.style.display = "none"
    external.style.display = "none"
    frame.src = url || "about:blank"
  }
  modal.style.display = "flex"
}

function renderBlog(){
  const post = BLOG_POSTS[state.blogIndex]
  const title = qs("#blogTitle")
  const body = qs("#blogBody")
  if(title) title.textContent = post.title
  if(body) body.innerHTML = post.body.split("\n\n").map(p=>`<p>${p}</p>`).join("")
}

function appendAria(text){
  state.ariaHistory.unshift(text)
  if(state.ariaHistory.length > 6) state.ariaHistory.pop()
  localStorage.setItem("ariaHistory", JSON.stringify(state.ariaHistory))
  const ariaEl = qs("#ariaHistory")
  if(ariaEl){
    ariaEl.innerHTML = state.ariaHistory.map(x=>`<div>${x}</div>`).join("")
  }
}

function setupPaymentChooser(){
  const select = qs("#paymentSelect")
  const view = qs("#paymentView")
  if(!select || !view) return

  function render(){
    const val = select.value
    if(val === "evelyn"){
      view.innerHTML = `<p>Custom order with Evelyn.</p><div class="lock-pill">Premium: 2 ARIA levels + puzzles</div><div class="lock-pill">Pro: all 4 levels + unlimited</div><button class="btn" id="openCustomOrder">Open Custom Order</button>`
      qs("#openCustomOrder").addEventListener("click", ()=>openModal("customOrderModal"))
      return
    }
    if(val === "premium"){
      view.innerHTML = `<p>$35 PREMIUM subscription.</p><div class="lock-pill">Unlocks 2 ARIA levels + puzzles to continue</div><button class="btn" id="goPremium">Pay $35</button>`
      state.subscription = "premium"
      qs("#goPremium").addEventListener("click", ()=>openLinkModal(LINKS.premium, "Premium Subscription"))
      return
    }
    if(val === "pro"){
      view.innerHTML = `<p>$50 PROFESSIONAL subscription.</p><div class="lock-pill">All 4 levels + unlimited ARIA</div><button class="btn" id="goPro">Pay $50</button>`
      state.subscription = "pro"
      qs("#goPro").addEventListener("click", ()=>openLinkModal(LINKS.pro, "Professional Subscription"))
      return
    }
    view.innerHTML = `<p>Tip the team.</p><button class="btn" id="tipOrder">Open Tip</button>`
    qs("#tipOrder").addEventListener("click", ()=>openLinkModal(LINKS.custom, "Custom Order"))
  }

  select.addEventListener("change", render)
  render()
}

function setupPostActions(){
  const live = qs("#liveStatus")
  const send = qs("#sendSocials")
  const post = qs("#postSocials")
  const paySelect = qs("#paySelect")
  const tipTeam = qs("#tipTeam")
  const contactEvelyn = qs("#contactEvelyn")
  const indicator = qs("#socialIndicator")
  const socialSelect = qs("#socialSelect")
  const adCta = qs("#adCta")

  const feedMap = {
    instagram: "ig",
    tiktok: "tiktok",
    facebook: "fb",
    youtube: "yt",
    x: "x",
    threads: "threads"
  }

  function enabledFeeds(){
    const feeds = state.socialLinks.feeds || {ig:true,tiktok:true,fb:true}
    return Object.keys(feedMap).filter(k => feeds[feedMap[k]])
  }

  function updateIndicator(){
    if(!indicator) return
    const list = enabledFeeds()
    indicator.textContent = list.length ? `Feeds: ${list.map(x=>x[0].toUpperCase()+x.slice(1)).join(", ")}` : "Feeds: none selected"
  }

  function openFeed(key){
    const link = state.socialLinks[feedMap[key]]
    if(link){ openLinkModal(link, "Social Feed"); return true }
    return false
  }

  function postToFeeds(){
    const choice = socialSelect ? socialSelect.value : "all"
    const targets = choice === "all" ? enabledFeeds() : [choice]
    let opened = 0
    targets.forEach(t=>{ if(openFeed(t)) opened++ })
    if(!opened){ toast("Add social links in Settings") }
  }

  if(live){
    live.addEventListener("click", ()=>{
      live.classList.toggle("active")
      live.textContent = live.classList.contains("active") ? "Live Status · ON" : "Live Status"
      bumpHairScore(1)
    })
  }

  if(send){ send.addEventListener("click", postToFeeds) }
  if(post){ post.addEventListener("click", postToFeeds) }
  if(adCta){ adCta.addEventListener("click", ()=>openLinkModal(LINKS.custom, "Custom Order")) }
  if(socialSelect){
    socialSelect.addEventListener("change", ()=>{
      if(socialSelect.value !== "all"){
        indicator.textContent = `Selected: ${socialSelect.value}`
      } else {
        updateIndicator()
      }
    })
  }

  if(paySelect){
    paySelect.addEventListener("change", ()=>{
      const value = paySelect.value
      if(value.includes("Custom Order")){
        openModal("customOrderModal")
      }
    })
  }
  if(tipTeam){
    tipTeam.addEventListener("click", ()=>openLinkModal("https://supportrd.com/cart","Tip Developer & Team"))
  }

  if(contactEvelyn){
    contactEvelyn.addEventListener("click", ()=>{
      const phone = (state.socialLinks.evelyn || "829-233-2670").replace(/\D/g,"")
      if(!phone){ toast("Add Evelyn WhatsApp in Settings"); return }
      openLinkModal(`https://wa.me/${phone}?text=Hi%20Evelyn%2C%20I%20need%20help%20with%20my%20order.`,"Contact Evelyn")
    })
  }

  updateIndicator()
}

function setupOccasion(){
  const actionSel = qs("#occasionAction")
  const applySel = qs("#occasionApply")
  const enjoySel = qs("#occasionEnjoy")
  const weekWrap = qs("#weekBoxes")
  if(!actionSel || !applySel || !enjoySel || !weekWrap) return

  const actions = [
    "Normal Action","Getting Up","Wash Day","Training","Travel","Work","School","After Gym","Beach Day","Pool Day",
    "Rainy Day","Sweat Reset","Curl Refresh","Detox Day","Protective Style","Braids Day","Twist Day","Silk Press",
    "Blowout Prep","Color Day","Trim Day","Night Routine","Morning Routine","Self Care","Date Night","Photo Day",
    "Big Fight","Party","Wedding","Brunch","Office Presentation","Interview","Vacation","Salon Visit","Product Test",
    "Scalp Care","Moisture Boost","Protein Boost","Hydration Day","Heat Protect","Overnight Mask","Co‑Wash",
    "Deep Clean","Anti‑Frizz","Volume Day","Edge Control","Sleek Bun","Natural Day","Maintenance Day","Post Swim",
    "Pre Workout","Post Workout","Travel Pack","Festival","Family Event","New Product Day","Weekly Reset"
  ]
  const applies = [
    "Apply Product","Shampoo","Laciador","Mask","Leave‑In","Serum","Scalp Oil","Heat Protectant","Foam","Gel","Cream",
    "Butter","Conditioner","Deep Conditioner","Clarifying Wash","Co‑Wash","Edge Control","Mousse","Protein Treatment",
    "Hydration Mist","Styling Spray"
  ]
  const enjoys = [
    "Enjoy Product","Big Fight","Date Night","Photo Day","After Workout","All‑Day Shine","Smooth Finish","Soft Curls",
    "Volume Boost","Frizz‑Free","Long‑Lasting Style","Protective Glow","Salon‑Ready","Party Ready","Interview Ready"
  ]

  actionSel.innerHTML = actions.map(a=>`<option>${a}</option>`).join("")
  applySel.innerHTML = applies.map(a=>`<option>${a}</option>`).join("")
  enjoySel.innerHTML = enjoys.map(a=>`<option>${a}</option>`).join("")

  function renderWeek(){
    weekWrap.innerHTML = ""
    for(let i=0;i<7;i++){
      const row = document.createElement("div")
      row.className = "week"
      row.innerHTML = `<div class="day-title">Day ${i+1}</div>
        <div class="day-line">${actionSel.value} · ${applySel.value} · ${enjoySel.value}</div>
        <div class="day-line">AI: ${buildDescription(i)}</div>`
      weekWrap.appendChild(row)
    }
  }

  function buildDescription(i){
    return `Today you will ${actionSel.value.toLowerCase()}, ${applySel.value.toLowerCase()}, and enjoy ${enjoySel.value.toLowerCase()} for healthy hair.`
  }

  function updatePost(){
    const input = qs("#postInput")
    if(!input) return
    input.value = buildDescription(0)
  }

  const applyBtn = qs("#applyOccasion")
  const addBtn = qs("#addOccasionPost")
  if(applyBtn){ applyBtn.addEventListener("click", renderWeek) }
  if(addBtn){ addBtn.addEventListener("click", updatePost) }

  actionSel.addEventListener("change", renderWeek)
  applySel.addEventListener("change", renderWeek)
  enjoySel.addEventListener("change", renderWeek)
  renderWeek()
}

function setupScanUpload(){
  const input = qs("#scanUpload")
  const preview = qs("#scanPreview")
  if(!input || !preview) return
  input.addEventListener("change", ()=>{
    const file = input.files[0]
    if(!file) return
    const url = URL.createObjectURL(file)
    preview.innerHTML = `<img src="${url}" alt="Scan">`
    preview.style.display = "block"
    toast("3D scan photo attached")
  })
}

  function setupProfileUpload(){
    const input = qs("#profileUpload")
    const preview = qs("#profilePreview")
    if(!input || !preview) return
    input.addEventListener("change", ()=>{
      const file = input.files[0]
      if(!file) return
      const url = URL.createObjectURL(file)
      state.userAvatar = url
      if(file.type.startsWith("video")){
      preview.innerHTML = `<video src="${url}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
    } else {
      preview.innerHTML = `<img src="${url}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`
    }
  })
}

function setupGPS(){
  const map = qs("#gpsMap")
  if(map){
    map.src = "https://www.openstreetmap.org/export/embed.html?bbox=-74.1%2C40.6%2C-73.7%2C40.9&layer=mapnik"
  }
  const btn = qs("#findSalons")
  const list = qs("#salonResults")
  if(btn && list){
    btn.addEventListener("click", ()=>{
      list.textContent = "Finding nearby salons..."
      if(!navigator.geolocation){
        list.textContent = "Geolocation not supported."
        return
      }
      navigator.geolocation.getCurrentPosition(async (pos)=>{
        try{
          const r = await fetch("/api/salons",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({lat: pos.coords.latitude, lon: pos.coords.longitude})
          })
          const salons = await r.json()
          if(!salons.length){ list.textContent = "No salons found."; return }
          list.innerHTML = salons.map(s=>`<div>${s.name} - ${s.distance} mi</div>`).join("")
        }catch{
          list.textContent = "Salon lookup failed."
        }
      }, ()=>{ list.textContent = "Location denied."; })
    })
  }
  const hf = qs("#gpsHandsFree")
  if(hf){
    hf.addEventListener("click", ()=>{
      qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
      qsa(".tab-panel").forEach(p=>p.classList.remove("active"))
      qs('[data-tab="handsfree"]').classList.add("active")
      qs("#tab-handsfree").classList.add("active")
      if(window.startAriaListening){ window.startAriaListening() }
    })
  }
}

function setupSEOLogs(){
  const stream = qs("#logStream")
  let timer = null
  const open = qs("#openSeo")
  const close = qs("#closeSeo")
  if(!stream || !open || !close) return
  open.addEventListener("click", ()=>{
    if(timer) clearInterval(timer)
    stream.innerHTML = ""
    timer = setInterval(()=>{
      const line = `[${new Date().toLocaleTimeString()}] render: build ok · cache hit · seo feed synced`
      const div = document.createElement("div")
      div.textContent = line
      stream.appendChild(div)
      stream.scrollTop = stream.scrollHeight
    }, 800)
  })
  close.addEventListener("click", ()=>{ if(timer) clearInterval(timer) })
}

function setupReel(){
  const btn = qs("#openReel")
  if(btn){ btn.addEventListener("click", ()=>openModal("reelModal")) }
  const panel = qs("#reelPanel")
  const toggle = qs("#toggleReel")
  const tab = qs("#reelTab")
  if(panel && toggle){
    toggle.addEventListener("click", ()=>{
      panel.classList.toggle("hidden")
      toggle.textContent = panel.classList.contains("hidden") ? "Show" : "Hide"
    })
  }
  if(panel && tab){
    tab.addEventListener("click", ()=>{
      panel.classList.remove("hidden")
      if(toggle) toggle.textContent = "Hide"
    })
  }
}

function setupCamera(){
  const chip = qs("#cameraChip")
  let stream = null
  if(chip){ chip.addEventListener("click", ()=>openModal("cameraModal")) }
  const start = qs("#startCamera")
  const stop = qs("#stopCamera")
  if(start){
    start.addEventListener("click", async ()=>{
      try{
        stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}})
        qs("#cameraView").srcObject = stream
      }catch{ toast("Camera blocked") }
    })
  }
  if(stop){
    stop.addEventListener("click", ()=>{
      if(stream){ stream.getTracks().forEach(t=>t.stop()); stream = null }
    })
  }
}

function setupSettings(){
  const saved = JSON.parse(localStorage.getItem("socialLinks") || "{}")
  state.socialLinks = saved
  state.subscription = (saved.subscription || "free").toLowerCase().includes("pro") ? "pro" :
    ((saved.subscription || "").toLowerCase().includes("premium") ? "premium" : "free")
  qs("#setName").value = saved.name || ""
  qs("#setEmail").value = saved.email || ""
  qs("#setPhone").value = saved.phone || ""
  qs("#setUsername").value = saved.username || ""
  qs("#setPassword").value = ""
  qs("#setAddress").value = saved.address || ""
  qs("#setSubscription").value = saved.subscription || ""
  qs("#setCustomOrder").value = saved.customOrder || ""
  qs("#setEvelyn").value = saved.evelyn || ""
  qs("#setIG").value = saved.ig || ""
  qs("#setTikTok").value = saved.tiktok || ""
  qs("#setFB").value = saved.fb || ""
  qs("#setYT").value = saved.yt || ""
  qs("#setX").value = saved.x || ""
  qs("#setThreads").value = saved.threads || ""
  const feeds = saved.feeds || {ig:true,tiktok:true,fb:true}
  qs("#feedIG").checked = !!feeds.ig
  qs("#feedTikTok").checked = !!feeds.tiktok
  qs("#feedFB").checked = !!feeds.fb
  qs("#feedYT").checked = !!feeds.yt
  qs("#feedX").checked = !!feeds.x
  qs("#feedThreads").checked = !!feeds.threads
  qs("#pushAria").checked = !!saved.pushAria

  const save = qs("#saveSettings")
  if(save){
    save.addEventListener("click", ()=>{
      state.socialLinks = {
        name: qs("#setName").value.trim(),
        email: qs("#setEmail").value.trim(),
        phone: qs("#setPhone").value.trim(),
        username: qs("#setUsername").value.trim(),
        address: qs("#setAddress").value.trim(),
        subscription: qs("#setSubscription").value.trim(),
        customOrder: qs("#setCustomOrder").value.trim(),
        evelyn: qs("#setEvelyn").value.trim(),
        ig: qs("#setIG").value.trim(),
        tiktok: qs("#setTikTok").value.trim(),
        fb: qs("#setFB").value.trim(),
        yt: qs("#setYT").value.trim(),
        x: qs("#setX").value.trim(),
        threads: qs("#setThreads").value.trim(),
        feeds: {
          ig: qs("#feedIG").checked,
          tiktok: qs("#feedTikTok").checked,
          fb: qs("#feedFB").checked,
          yt: qs("#feedYT").checked,
          x: qs("#feedX").checked,
          threads: qs("#feedThreads").checked
        },
        pushAria: qs("#pushAria").checked
      }
      localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
      const sub = state.socialLinks.subscription.toLowerCase()
      state.subscription = sub.includes("pro") ? "pro" : (sub.includes("premium") ? "premium" : "free")
      toast("Settings saved")
      const indicator = qs("#socialIndicator")
      if(indicator){
        const list = Object.keys(state.socialLinks.feeds || {}).filter(k=>state.socialLinks.feeds[k])
        indicator.textContent = list.length ? `Feeds: ${list.map(x=>x[0].toUpperCase()+x.slice(1)).join(", ")}` : "Feeds: none selected"
      }
    })
  }
}

function setupPwa(){
  let deferredPrompt = null
  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault()
    deferredPrompt = e
    const btn = qs("#installBtn")
    if(btn) btn.style.display = "inline-flex"
  })
  const btn = qs("#installBtn")
  if(btn){
    btn.addEventListener("click", async ()=>{
      if(!deferredPrompt) return
      deferredPrompt.prompt()
      deferredPrompt = null
      btn.style.display = "none"
    })
  }
  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("/sw.js")
  }
}

function setupFamilyMode(){
  const toggle = qs("#familyToggle")
  if(!toggle) return
  toggle.addEventListener("change", ()=>{
    if(toggle.checked){
      window.location.href = "https://supportrd.com"
    }
  })
}

function setupLoginGate(){
  const gate = qs("#loginGate")
  const loggedIn = localStorage.getItem("loggedIn") === "true"
  const first = Number(localStorage.getItem("firstSeen") || Date.now())
  if(!localStorage.getItem("firstSeen")) localStorage.setItem("firstSeen", String(first))
  const minutes = (Date.now() - first) / (1000*60)
  if(!loggedIn && gate && minutes >= 30){ gate.style.display = "flex" }
  const openLogin = qs("#openLogin")
  if(openLogin){ openLogin.addEventListener("click", ()=>{ gate.style.display = "flex" }) }
  const btnPremium = qs("#loginPremium")
  const btnPro = qs("#loginPro")
  const btnFree = qs("#loginFree")
  if(btnPremium){ btnPremium.addEventListener("click", ()=>{ localStorage.setItem("loggedIn","true"); gate.style.display="none"; openLinkModal(LINKS.premium, "Premium Subscription") }) }
  if(btnPro){ btnPro.addEventListener("click", ()=>{ localStorage.setItem("loggedIn","true"); gate.style.display="none"; openLinkModal(LINKS.pro, "Professional Subscription") }) }
  if(btnFree){ btnFree.addEventListener("click", ()=>{ localStorage.setItem("loggedIn","true"); gate.style.display="none" }) }
}

function setupPuzzle(){
  const q = qs("#puzzleQuestion")
  const a = qs("#puzzleAnswer")
  const btn = qs("#puzzleSubmit")
  if(!q || !a || !btn) return
  function newPuzzle(){
    const x = 3 + Math.floor(Math.random() * 9)
    const y = 4 + Math.floor(Math.random() * 9)
    state.puzzleAnswer = x + y
    q.textContent = `What is ${x} + ${y}?`
    a.value = ""
  }
  btn.addEventListener("click", ()=>{
    if(Number(a.value) === state.puzzleAnswer){
      state.ariaBlocked = false
      state.ariaCount = 0
      qs("#puzzleModal").style.display = "none"
      appendAria("ARIA: Thanks! You’re unlocked — continue your hair routine questions.")
    } else {
      toast("Try again")
      newPuzzle()
    }
  })
  newPuzzle()
}

async function loadProducts(){
  const mini = qs("#productsMini")
  if(!mini) return
  try{
    const r = await fetch("/api/products")
    const items = await r.json()
    if(!items.length){
      mini.textContent = "No products found."
      return
    }
    mini.innerHTML = items.slice(0,3).map(p=>`<div>${p.title}</div>`).join("")
  }catch{
    mini.textContent = "Loading shopify products failed."
  }
}


function setupHairAnalysis(){
  const start = qs("#startHairScan")
  const overlay = qs("#hairScanOverlay")
  const status = qs("#hairScanStatus")
  const result = qs("#analysisResult")
  const close = qs("#closeHairScan")
  if(close){ close.addEventListener("click", ()=>{ if(overlay) overlay.style.display = "none" }) }
  if(!start || !overlay) return
  start.addEventListener("click", ()=>{
    overlay.style.display = "flex"
    if(status) status.textContent = "Scanning... hold steady and move left to right."
    if(result) result.textContent = "Scan running..."
    setTimeout(()=>{
      const summary = "Scan complete. I see dryness at the ends with light frizz and low bounce at the crown. I recommend a moisture mask, light protein, and a satin wrap.";
      if(status) status.textContent = summary
      if(result) result.textContent = summary
      showSpeechPopup("ARIA", summary)
      speakReply(summary)
      setTimeout(()=>{ overlay.style.display = "none" }, 2400)
    }, 1800)
  })
}

  function setupAria(){
    const btn = qs("#voiceToggle")
    const sphere = qs("#ariaSphere")
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    let ariaRec = null
    let ariaActive = false
  
      function startListening(){
        if(!SpeechRecognition){
          toast("Voice not supported")
          return
        }
        startListenLoop()
        setAriaFlow("listening")
        const reelVid = qs(".reel-embed video")
        if(reelVid){ try{ reelVid.pause() }catch{} }
        if(!ariaRec){
          ariaRec = new SpeechRecognition()
          ariaRec.lang = qs("#ariaLanguage")?.value || "en-US"
          ariaRec.interimResults = true
          ariaRec.maxAlternatives = 1
          try{ ariaRec.continuous = true }catch{}
          ariaRec.onstart = ()=>{
            ariaActive = true
          }
          ariaRec.onspeechstart = ()=>{ setAriaFlow("listening") }
          ariaRec.onsoundstart = ()=>{ setAriaFlow("listening") }
          ariaRec.onspeechend = ()=>{ setAriaFlow("processing") }
            ariaRec.onresult = (e)=>{
              const res = e.results[e.results.length - 1]
              if(!res) return
              const transcript = res[0]?.transcript || ""
              const transcriptEl = qs("#ariaTranscript")
              if(transcriptEl){ transcriptEl.textContent = transcript || "Listening…" }
              if(!res.isFinal) return
              stopListenLoop()
              if(transcript.trim()){ 
                setAriaFlow("processing")
                askAria(transcript) 
              }
            }
          ariaRec.onerror = (e)=>{
            if(e && (e.error === "no-speech" || e.error === "aborted")) return
            toast("Voice error")
          }
          ariaRec.onend = ()=>{
            ariaActive = false
            setAriaFlow("idle")
            stopListenLoop()
            if(reelVid){ try{ reelVid.play() }catch{} }
            if(document.visibilityState === "visible"){
              try{ ariaRec.start() }catch{}
            }
          }
        }
        if(ariaActive){ return }
        try{ ariaRec.start() }catch{}
    }

  if(btn){ btn.addEventListener("click", startListening) }
  if(sphere){
    sphere.classList.add("aria-pulse")
    sphere.addEventListener("click", startListening)
  }
  window.startAriaListening = startListening
}

function renderApp(name){
  const body = qs("#appBody")
  if(!body) return
  if(name && name.includes("Donate")){
    body.innerHTML = `
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
        <div style="width:140px;height:120px;border-radius:18px;background:linear-gradient(135deg,#f7e7c9,#e4b97e);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.25);">
          <svg width="110" height="80" viewBox="0 0 110 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="18" width="94" height="44" rx="14" fill="#f2d8a6" stroke="#d3aa6c" stroke-width="3"/>
            <rect x="16" y="26" width="78" height="28" rx="12" fill="#f7e6c9"/>
            <circle cx="40" cy="40" r="6" fill="#d0b184"/>
            <circle cx="66" cy="40" r="6" fill="#d0b184"/>
          </svg>
        </div>
        <div style="flex:1;min-width:220px;">
          <div style="font-weight:700;margin-bottom:6px;">Donate to the Poor · Auto Dissolve Bar</div>
          <div style="color:var(--muted);margin-bottom:10px;">
            Movement: every bar supports local care packages and hygiene support. Your purchase helps fund soap, shampoo, and essentials.
          </div>
          <button class="btn" id="donateLinkBtn">Open Donation</button>
        </div>
      </div>
    `
    qs("#donateLinkBtn").addEventListener("click", ()=>openLinkModal(LINKS.donate, "Donate to the Poor"))
    return
  }
  if(name === "Contact Anthony"){
    body.innerHTML = `Email: AgentAnthony@supportdr.com<br>Phone: 7043452867`
    return
  }
  if(name === "Snapshot Coder Idea"){
    if(state.subscription === "free"){
      body.innerHTML = `<div class="lock-pill">Premium feature</div><div style="margin-top:8px;color:var(--muted);">Upgrade to unlock Snapshot Coder insights and GPT‑5.2 Codex tracking.</div><button class="btn" id="openSubFromSnap">Upgrade</button>`
      qs("#openSubFromSnap").addEventListener("click", ()=>openModal("subscriptionModal"))
      return
    }
    body.innerHTML = `<div style="margin-bottom:10px;">Paste your recent work and let ARIA score progress, blockers, and next steps.</div><textarea id="coderInput" style="width:100%;min-height:140px;"></textarea><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn" id="coderAnalyze">Analyze with ARIA (GPT 5.2 Codex)</button><button class="btn ghost" id="coderSend">Send Snapshot to Anthony</button></div>`
    qs("#coderAnalyze").addEventListener("click", ()=>toast("ARIA analysis queued"))
    qs("#coderSend").addEventListener("click", ()=>{
      const text = encodeURIComponent(qs("#coderInput").value || "")
      openLinkModal(`mailto:AgentAnthony@supportdr.com?subject=Snapshot%20Coder%20Idea&body=${text}`,"Send Snapshot")
    })
    return
  }
  if(name === "Live Coder Suggestions"){
    body.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;">30‑Day Subscription Build Plan</div>
      <ul style="margin:0 0 10px 16px;color:var(--muted);">
        <li>Week 1: onboarding flow, account linking, analytics baseline.</li>
        <li>Week 2: routine generator improvements + scan history.</li>
        <li>Week 3: social posting automation + SEO blog cadence.</li>
        <li>Week 4: growth experiments + retention and push/PWA upgrades.</li>
      </ul>
      <div style="color:var(--muted);margin-bottom:10px;">Send a suggestion and we’ll credit 1 month premium for accepted ideas.</div>
      <textarea id="suggestionInput" style="width:100%;min-height:120px;"></textarea>
      <button class="btn" id="sendSuggestion">Send Suggestion</button>
    `
    qs("#sendSuggestion").addEventListener("click", ()=>{
      const text = encodeURIComponent(qs("#suggestionInput").value || "")
      openLinkModal(`mailto:AgentAnthony@supportdr.com?subject=Live%20Coder%20Suggestion&body=${text}`,"Send Suggestion")
    })
    return
  }
  if(name === "Live Hair Score"){
    const score = Math.round(state.hairScore || 0)
    const circumference = 2 * Math.PI * 70
    const dash = Math.round(circumference * (score / 100))
    body.innerHTML = `
      <div class="score-card">
        <div class="score-ring" id="scoreRing">
          <svg viewBox="0 0 160 160">
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#00e2ff"/>
                <stop offset="0.5" stop-color="#7c7cff"/>
                <stop offset="1" stop-color="#ffb657"/>
              </linearGradient>
            </defs>
            <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.15)" stroke-width="12" fill="none"/>
            <circle cx="80" cy="80" r="70" stroke="url(#scoreGrad)" stroke-width="12" fill="none" stroke-linecap="round"
              stroke-dasharray="${dash} ${Math.round(circumference - dash)}"/>
          </svg>
          <div class="score-value"><div>${score}%</div><span>Live Hair Score</span></div>
        </div>
        <div class="score-legend">
          <div class="tag">SupportRD Live · Plus500‑style momentum</div>
          <div style="color:var(--muted);margin-bottom:10px;">Tap the score to reveal your ARIA level and unlocks.</div>
          <div class="score-bars">
            <div>Consistency</div>
            <div class="score-bar"><span style="width:${Math.min(100, score + 10)}%"></span></div>
            <div>Care Routine</div>
            <div class="score-bar"><span style="width:${Math.max(20, score - 8)}%"></span></div>
            <div>Progress</div>
            <div class="score-bar"><span style="width:${Math.min(100, score + 4)}%"></span></div>
          </div>
        </div>
      </div>
      <div id="scoreLevels" style="display:none;margin-top:14px;">
        <div style="font-weight:700;margin-bottom:8px;">ARIA Levels</div>
        <div class="levels-grid" style="display:grid;gap:8px;">
          <div class="level-card" data-level="intro">Introduction</div>
          <div class="level-card" data-level="breakdown">Breaking Down Topics</div>
          <div class="level-card" data-level="inner">Inner Circle</div>
          <div class="level-card" data-level="pro">Professional · Making Money</div>
        </div>
        <div id="proDetails" style="margin-top:10px;color:var(--muted);display:none;">
          Professional access unlocked. Direct contact: AgentAnthony@supportdr.com · 7043452867.
          Sally Ruberry has reached professional level due to her outstanding hair managing skills and wants to discuss business.
        </div>
      </div>
    `
    const ring = qs("#scoreRing")
    const levels = qs("#scoreLevels")
    if(ring){
      ring.addEventListener("click", ()=>{
        levels.style.display = levels.style.display === "none" ? "block" : "none"
      })
    }
    const level = score >= 90 ? "pro" : score >= 75 ? "inner" : score >= 45 ? "breakdown" : "intro"
    const sub = state.subscription
    qsa(".level-card").forEach(card=>{
      const isLocked = (sub === "free" && card.dataset.level !== "intro") ||
        (sub === "premium" && (card.dataset.level === "inner" || card.dataset.level === "pro"))
      if(card.dataset.level === level){
        card.style.background = "linear-gradient(135deg, rgba(0,226,255,0.25), rgba(124,124,255,0.25))"
        card.style.border = "1px solid rgba(0,226,255,0.6)"
        card.style.color = "#fff"
      } else {
        card.style.background = "rgba(255,255,255,0.06)"
        card.style.border = "1px solid rgba(255,255,255,0.12)"
      }
      card.classList.toggle("locked", isLocked)
      card.textContent = card.textContent.replace(" 🔒","")
      if(isLocked){ card.textContent += " 🔒" }
    })
    const pro = qs("#proDetails")
    if(pro && level === "pro" && sub === "pro"){ pro.style.display = "block" }
    return
  }
  if(name === "Shopify Products"){
    body.innerHTML = `Open the full catalog and custom order flow from SupportRD.<br><button class="btn" id="openCustomShop">Open Custom Order</button>`
    qs("#openCustomShop").addEventListener("click", ()=>openLinkModal(LINKS.custom, "Custom Order"))
    return
  }
  body.textContent = name
}

function setupAppsDock(){
  const row = qs("#appsRow")
  const library = qs("#appsLibrary")
  const select = qs("#appSwapSelect")
  if(!row || !select) return

  const allApps = [
    "Blog",
    "Snapshot Coder Idea",
    "Live Coder Suggestions",
    "Donate to the Poor · Auto Dissolve Bar",
    "Settings",
    "Contact Anthony · Developer",
    "Gift Shop",
    "TV Reel",
    "Shopify Products",
    "SEO Engine Viewer",
    "Camera",
    "Occasion Editor",
    "Subscription Banner",
    "Live Hair Score"
  ]

  select.innerHTML = '<option value="">Replace Selected App…</option>' + allApps.map(a=>`<option value="${a}">${a}</option>`).join("")

  let activeCard = null
  row.querySelectorAll(".app-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      row.querySelectorAll(".app-card").forEach(c=>c.classList.remove("active"))
      card.classList.add("active")
      activeCard = card
    })
  })

  function applyAppToCard(card, name, linkOverride){
    card.textContent = name
    card.dataset.app = name.replace(" · Developer","Contact Anthony")
    if(linkOverride !== undefined){
      card.dataset.link = linkOverride
    } else if(name.includes("Donate")){
      card.dataset.link = LINKS.donate
    } else {
      card.dataset.link = ""
    }
  }

  select.addEventListener("change", ()=>{
    if(!activeCard || !select.value) return
    applyAppToCard(activeCard, select.value)
    select.value = ""
    toast("App replaced")
  })

  let dragEl = null
  function wireCard(card, source){
    card.setAttribute("draggable","true")
    card.addEventListener("dragstart", e=>{
      dragEl = source === "row" ? card : null
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", JSON.stringify({
        app: card.dataset.app,
        link: card.dataset.link || "",
        source
      }))
      card.classList.add("dragging")
    })
    card.addEventListener("dragend", ()=>{
      card.classList.remove("dragging")
      dragEl = null
    })
    card.addEventListener("dragover", e=>{
      e.preventDefault()
      card.classList.add("drag-over")
    })
    card.addEventListener("dragleave", ()=>card.classList.remove("drag-over"))
    card.addEventListener("drop", e=>{
      e.preventDefault()
      card.classList.remove("drag-over")
      let payload = {}
      try{ payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}") }catch{}
      if(!payload.app) return
      if(payload.source === "row" && dragEl && dragEl !== card && card.parentElement === row){
        row.insertBefore(dragEl, card)
        toast("Apps reordered")
        return
      }
      if(payload.source === "library"){
        applyAppToCard(card, payload.app, payload.link || "")
        toast("App replaced")
      }
    })
  }

  row.querySelectorAll(".app-card").forEach(card=>wireCard(card, "row"))
  if(library){
    library.querySelectorAll(".app-card").forEach(card=>wireCard(card, "library"))
  }
}


window.addEventListener("DOMContentLoaded", ()=>{
  const savedHistory = JSON.parse(localStorage.getItem("ariaHistory") || "[]")
  state.ariaHistory = savedHistory
  const ariaEl = qs("#ariaHistory")
  if(ariaEl){
    ariaEl.innerHTML = state.ariaHistory.length ? state.ariaHistory.map(x=>`<div>${x}</div>`).join("") : "No history yet."
  }

  const safe = (fn)=>{ try{ fn() }catch(e){ console.error(e) } }
  initHairScore()
  renderApp("Live Hair Score")
  openModal("appModal")
  safe(setupTabs)
  safe(setupThemeArrows)
  safe(setupModals)
  safe(setupPaymentChooser)
  safe(setupSettings)
  safe(setupPostActions)
  safe(setupOccasion)
  safe(setupScanUpload)
  safe(setupProfileUpload)
  safe(setupHairAnalysis)
  safe(setupGPS)
  safe(setupAria)
  safe(setupPuzzle)
  safe(setupSEOLogs)
  safe(setupReel)
  safe(setupCamera)
  safe(setupPwa)
    safe(setupFamilyMode)
    safe(initHairScore)
    safe(setupAppsDock)
  safe(loadProducts)

  // Fallback: open any data-link button
  document.body.addEventListener("click", (e)=>{
    const el = e.target.closest("[data-link]")
    if(el && el.dataset.link){
      openLinkModal(el.dataset.link, "SupportRD Link")
    }
  })
})
