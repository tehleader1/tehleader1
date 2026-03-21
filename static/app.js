const qs = (sel) => document.querySelector(sel)
const qsa = (sel) => Array.from(document.querySelectorAll(sel))

function showBannedOverlay(reason){
  let el = qs("#bannedOverlay")
  if(!el){
    el = document.createElement("div")
    el.id = "bannedOverlay"
    el.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);color:#fff;"
    el.innerHTML = `<div style="text-align:center;border:2px solid #ff4141;padding:24px;border-radius:16px;background:rgba(255,65,65,0.12);max-width:640px;">
      <div style="font-size:56px;font-weight:900;letter-spacing:.16em;color:#ff5454;">BANNED</div>
      <div style="margin-top:8px;color:#ffd6d6;">IP blocked. ${reason ? `Reason: ${reason}` : ""}</div>
    </div>`
    document.body.appendChild(el)
  } else {
    el.style.display = "flex"
  }
}

;(function patchFetchForBan(){
  if(!window.fetch || window.__banFetchPatched) return
  const orig = window.fetch.bind(window)
  window.fetch = async (...args)=>{
    const res = await orig(...args)
    if(res && res.status === 403){
      try{
        const clone = res.clone()
        const ct = (clone.headers.get("content-type") || "").toLowerCase()
        if(ct.includes("application/json")){
          const d = await clone.json()
          if(d && (d.error === "banned" || d.message === "BANNED")){
            showBannedOverlay(d.reason || "")
          }
        } else {
          const t = await clone.text()
          if((t || "").toUpperCase().includes("BANNED")){
            showBannedOverlay("")
          }
        }
      }catch{}
    }
    return res
  }
  window.__banFetchPatched = true
})()

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
  myOrders: "https://supportrd.com/account/orders",
  cart: "https://supportrd.com/cart",
  premium: "https://supportrd.com/products/hair-advisor-premium",
  bingo100: "https://supportrd.com/products/bingo-fantasy-100",
  family200: "https://supportrd.com/products/family-fantasy-200",
  yoda: "https://supportrd.com/products/yoda-pass",
  pro: "https://supportrd.com/products/professional-hair-advisor",
  fantasy300: "https://supportrd.com/products/basic-fantasy-21-plus-300",
  fantasy600: "https://supportrd.com/products/advanced-fantasy-21-plus-600",
  donate: "https://supportrd.com/products/auto-dissolve-soap-bar",
  custom: "https://supportrd.com/pages/custom-order"
}
const AI_LINKS = {
  dan_martell: "https://archive.org/search?query=Dan%20Martell%20AI%20business%20mediatype%3Amovies",
  ai_millionaire: "https://archive.org/search?query=AI%20millionaire%20mediatype%3Amovies",
  ai_saas: "https://archive.org/search?query=AI%20SaaS%20mediatype%3Amovies",
  best_ai_2026: "https://archive.org/search?query=best%20AI%20tools%202026%20mediatype%3Amovies",
  agent_workflows: "https://archive.org/search?query=AI%20agent%20workflows%20mediatype%3Amovies",
  automation_agency: "https://archive.org/search?query=AI%20automation%20agency%20mediatype%3Amovies",
  ai_2026: "https://archive.org/search?query=AI%202026%20technology%20advances%20mediatype%3Amovies",
  ai_research: "https://archive.org/search?query=AI%20research%20breakthroughs%202026%20mediatype%3Amovies",
  future_jobs: "https://archive.org/search?query=AI%20jobs%20income%20opportunities%20mediatype%3Amovies",
  ai_agency: "https://archive.org/search?query=AI%20agency%20blueprint%20mediatype%3Amovies",
  ai_saas_builder: "https://archive.org/search?query=AI%20SaaS%20builder%20mediatype%3Amovies",
  ai_consulting: "https://archive.org/search?query=AI%20consulting%20offers%20mediatype%3Amovies"
}
const LOGIN_URL = "https://supportrd.com/account/login"

const BLOG_POSTS = [
  {title:"SupportRD Is Moving: Cash Friendly Growth", body:"SupportRD is moving with a balanced, friendly system built on clean operations and community respect.\n\nWe now support Request Call intake with pending confirmation, cash-point workflows (store, bank meetup, envelope), and transparent receipt logging.\n\nPrimary rollout starts in Charlotte, North Carolina, then Virginia, then Florida. #SupportRD is moving."},
  {title:"Natural: Recuperacion de Pelo con Calor", body:"Semana 1: hidratacion profunda, recorte y proteccion.\n\nSemana 2: acondicionamiento 2 veces y desenredo suave.\n\nSemana 3: balance de proteina + poco calor.\n\nSemana 4: mas brillo, menos quiebre y mejor forma del pelo."},
  {title:"Natural: Balance de Proteina y Brillo", body:"Paso 1: hidrata con leave-in ligero.\n\nPaso 2: tratamiento de proteina cada 7-10 dias.\n\nPaso 3: sella con aceite.\n\nResultado: menos frizz, mas cuerpo y mejor movimiento."},
  {title:"Natural: Rutina Real para Shampoo Familiar", body:"Rutina simple con productos reales para crecimiento sano.\n\nManana: aplica en pelo humedo.\n\nMedio dia: refresh suave.\n\nNoche: proteccion y descanso del pelo."}
]
const INHOUSE_ADS = [
  {title:"Fresh Drop: Caribe Gloss Routine", body:"A premium brochure-style glow pass for dry hair days. In-house and colorful on purpose."},
  {title:"Sponsor Lane: Community Cash Point", body:"Friendly check-ins, receipt-first flow, and a smooth wait-screen so everyone knows what is next."},
  {title:"Movement Alert: #SupportRD is moving", body:"Charlotte first, then Virginia, then Florida. New energy every run."},
  {title:"ARIA Unlimited Perk", body:"$50 Unlimited ARIA unlocks Talk to us for a deal with professional handling."},
  {title:"Puzzle Tier Momentum", body:"$35 Puzzle tier keeps your routine active while you build toward Unlimited ARIA."},
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
    puzzleAnswer: null,
    livePopupActive: false,
    ariaLevel: 'greeting',
    resolverContext: null,
    adult21: false
}

const PROHIBITED_TERMS = ["drug","drugs","cocaine","meth","weed","marijuana","heroin","fentanyl","gang","gangs","cartel","crip","bloods","ms-13"]

function detectDeviceTier(){
  try{
    const dm = Number(navigator.deviceMemory || 0)
    const cpu = Number(navigator.hardwareConcurrency || 0)
    if((dm && dm <= 3) || (cpu && cpu <= 4)) return "low-cost"
    if((dm && dm <= 6) || (cpu && cpu <= 8)) return "mid-range"
    return "high-performance"
  }catch{
    return "unknown"
  }
}

function initResolverContext(){
  const saved = JSON.parse(localStorage.getItem("resolverContext") || "null")
  const base = saved || {}
  const ctx = {
    country: base.country || "US",
    city: base.city || "unknown",
    coords: base.coords || null,
    device_tier: detectDeviceTier(),
    user_agent: (navigator.userAgent || "").slice(0, 120),
    language: (navigator.language || "en-US"),
    low_cost_mode: true
  }
  state.resolverContext = ctx
  localStorage.setItem("resolverContext", JSON.stringify(ctx))
  const dash = qs("#dashboardEmitStatus")
  if(dash){ dash.textContent = `Device: ${ctx.device_tier} · Location: pending · Low-cost mode: ON` }
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition((pos)=>{
      const updated = {
        ...ctx,
        coords: {
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4))
        }
      }
      state.resolverContext = updated
      localStorage.setItem("resolverContext", JSON.stringify(updated))
      const v = qs("#resolverEmitView")
      if(v) v.textContent = `Resolver emit: ${updated.device_tier} · ${updated.coords.lat}, ${updated.coords.lon} · low-cost mode ON`
      if(dash){ dash.textContent = `Device: ${updated.device_tier} · Location: ${updated.coords.lat}, ${updated.coords.lon} · Low-cost mode: ON` }
    }, ()=>{
      const v = qs("#resolverEmitView")
      if(v) v.textContent = `Resolver emit: ${ctx.device_tier} · location pending · low-cost mode ON`
      if(dash){ dash.textContent = `Device: ${ctx.device_tier} · Location: not granted · Low-cost mode: ON` }
    }, {timeout: 3000})
  }
}
function setupAccessibilityMode(){
  const liteBtn = qs("#liteModeBtn")
  const params = new URLSearchParams(window.location.search || "")
  const lite = params.get("lite") === "1"
  if(lite){
    document.body.classList.add("lite-mode")
    const reel = qs("#reelPanel")
    if(reel){ reel.style.display = "none" }
  }
  if(liteBtn){
    liteBtn.addEventListener("click", ()=>{
      const url = new URL(window.location.href)
      url.searchParams.set("lite", "1")
      window.location.href = url.toString()
    })
  }
}
let transcribeFailures = 0
let handsFreeMode = false
const SUPPRESS_ERROR_TEXT = false
function suppressIfErrorText(text){
  if(!text) return false
  return text.startsWith("Mic:") || text.startsWith("Voice error") || text.startsWith("AI unavailable")
}


function openMiniWindow(title, body){
  const win = qs("#miniWindow")
  const t = qs("#miniWindowTitle")
  const b = qs("#miniWindowBody")
  if(!win || !t || !b) return
  t.textContent = title || "Action"
  b.textContent = body || ""
  win.classList.add("show")
  clearTimeout(win._t)
  win._t = setTimeout(()=>win.classList.remove("show"), 2400)
}

function triggerClassActLaugh(source){
  const label = source ? `from ${source}` : "incoming"
  openMiniWindow("Class Act Laugh", `Received ${label}.`)
  const burst = document.createElement("div")
  burst.className = "laugh-burst"
  burst.innerHTML = `CLASS ACT LAUGH <span>Ha‑ha‑ha!</span>`
  document.body.appendChild(burst)
  setTimeout(()=>{ try{ burst.remove() }catch{} }, 1600)
}

function hasProhibitedContent(text){
  const t = (text || "").toLowerCase()
  return PROHIBITED_TERMS.some(k => t.includes(k))
}


function wireAllButtons(){
  try{ var d=document.getElementById('debugClick'); if(d) d.textContent='App init done'; }catch{}

  document.body.addEventListener("click", (e)=>{
    const btn = e.target.closest("button")
    if(!btn) return

    const id = btn.id || ""
    const label = (btn.textContent || "").trim() || "Action"

    // If button has data-link, honor it
    if(btn.dataset && btn.dataset.link){
      openLinkModal(btn.dataset.link, label)
      openMiniWindow(label, "Opening link...")
      return
    }

    // Route common IDs to real actions
    const modalMap = {
      menuOccasion: "occasionModal",
      menuGift: "giftModal",
      menuSettings: "settingsModal",
      menuSubscription: "subscriptionModal",
      openLogin: "loginGate",
      openSeo: "seoModal",
      openReel: "reelModal",
      openSettings: "settingsModal",
      openCustomOrder: "customOrderModal"
    }
    if(modalMap[id]){
      const el = qs("#" + modalMap[id])
      if(el){ el.style.display = "flex" }
      openMiniWindow(label, "Opened panel.")
      return
    }

    if(id === "findSalons"){
      openMiniWindow(label, "Searching for salons...")
      return
    }

    if(id === "startCamera"){
      openMiniWindow(label, "Starting camera...")
      return
    }
    if(id === "stopCamera"){
      openMiniWindow(label, "Stopping camera...")
      return
    }

    if(id === "postSocials" || id === "sendSocials"){
      openMiniWindow(label, "Posting to feeds...")
      return
    }

    if(id === "voiceToggle" || id === "ariaSphere"){
      openMiniWindow(label, "Listening...")
      return
    }

    // Default fallback: show mini window so every button has behavior
    openMiniWindow(label, `Triggered: ${id || "button"}`)
  })
}

function syncLevelButtons(){
  const buttons = qsa('.level-btn')
  if(!buttons.length) return
  buttons.forEach(b=>b.classList.toggle('active', b.dataset.level === state.ariaLevel))
}

function setAdminVisibility(isAdmin){
  qsa(".admin-only").forEach((el)=>{
    if(isAdmin){
      const display = el.dataset.adminDisplay || ((el.tagName || "").toLowerCase() === "button" ? "inline-flex" : (el.classList.contains("chip") ? "inline-flex" : "block"))
      el.style.display = display
    }else{
      el.style.display = "none"
    }
  })
}

async function setSeoAuto(enabled, stream){
  try{
    const r = await fetch("/api/seo/auto", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({enabled})
    })
    const d = await r.json()
    if(d.ok){
      const div = document.createElement("div")
      div.textContent = `[SEO] Auto 4x/day ${enabled ? "enabled" : "disabled"}`
      if(stream){
        stream.appendChild(div)
        stream.scrollTop = stream.scrollHeight
      }
      return true
    }
  }catch{}
  return false
}

function setupInfoTray(){
  const tray = qs("#infoTray")
  if(!tray) return
  tray.addEventListener("click", (e)=>{
    const btn = e.target.closest("button")
    if(!btn) return
    const label = btn.dataset.info || btn.textContent || "Info"
    const linkMap = {
      "Privacy": "https://supportrd.com/policies/privacy-policy",
      "Politics": "https://supportrd.com/pages/politics",
      "Donate": LINKS.donate,
      "About Us": "https://supportrd.com/pages/about-us",
      "Terms": "https://supportrd.com/policies/terms-of-service",
      "FAQ": "https://supportrd.com/pages/faq",
      "Contact": "https://supportrd.com/pages/contact"
    }
    const infoMap = {
      "Privacy": "We respect your privacy. Personal data stays private and is never sold.",
      "Politics": "SupportRD is non-partisan and focused on hair care education and wellness.",
      "Donate": "Donations support hygiene kits and hair care outreach programs.",
      "About Us": "SupportRD delivers live hair guidance, routines, and product matching.",
      "Terms": "Use of this app is subject to standard terms and service policies.",
      "FAQ": "FAQ — Quick Tips:\n1) Dry hair: add a weekly deep conditioner + leave-in moisture.\n2) Frizz: seal with light oil and reduce heat.\n3) No bounce: add protein every 7–10 days.\n4) Oily scalp: clarify 1x weekly and avoid heavy oils at roots.\n5) Damage: trim split ends + heat protect.\n6) Tangly hair: detangle on damp hair with slip + wide-tooth comb.\n7) Color loss: use color-safe shampoo + cool rinses.\n\nWebsite Tips:\n• ARIA Sphere: hold to talk for voice guidance.\n• Hair Analysis: upload scan to get better feedback.\n• Occasion Editor: tap a day to set that routine.\n• Info Tray: tap buttons for policies and help.",
      "Contact": "Email: AgentAnthony@supportdr.com · Phone: 704‑345‑2867"
    }
    const link = linkMap[label]
    if(link){
      openLinkModal(link, label)
    }
    openMiniWindow(label, infoMap[label] || "More information coming soon.")
  })
}




function setupLevelSelect(){
  const sel = qs('#ariaLevelSelect')
  if(!sel) return
function isPremium(){ return state.subscription === 'premium' || state.subscription === 'bingo100' || state.subscription === 'pro' || state.subscription === 'yoda' || state.subscription === 'fantasy300' || state.subscription === 'fantasy600' || isProOverride() }
  function sync(){
    const val = isPremium() ? state.ariaLevel : 'greeting'
    sel.value = val
  }
  sel.addEventListener('change', ()=>{
    if(!isPremium() && sel.value !== 'greeting'){
      openModal('subscriptionModal')
      sel.value = 'greeting'
      state.ariaLevel = 'greeting'
      toast('Upgrade to unlock ARIA levels')
      return
    }
    state.ariaLevel = sel.value
  })
  sync()
}

function setupMiniWindow(){
  const close = qs("#closeMiniWindow")
  if(close){
    close.addEventListener("click", ()=>{
      const win = qs("#miniWindow")
      if(win) win.classList.remove("show")
    })
  }

  try{ var d=document.getElementById('debugClick'); if(d) d.textContent='App init done'; }catch{}

  document.body.addEventListener("click", (e)=>{
    const btn = e.target.closest("button")
    if(!btn) return
    const id = btn.id || "button"
    const label = (btn.textContent || "").trim() || "Action"
    if(id === "closeMiniWindow") return
    openMiniWindow(label, `Triggered: ${id}`)
  })
}

function toast(msg){
  const el = qs("#toast")
  if(!el) return
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

  function watchTranscriptErrors(){
    if(!SUPPRESS_ERROR_TEXT) return
    const t = qs("#ariaTranscript")
    if(!t) return
    const clearIfError = ()=>{
      const val = t.textContent || ""
      if(suppressIfErrorText(val)){ t.textContent = "" }
    }
    const obs = new MutationObserver(clearIfError)
    obs.observe(t, {childList:true, characterData:true, subtree:true})
    clearIfError()
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
      const x = bounds.width * (0.08 + Math.random() * 0.84)
      const y = bounds.height * (0.08 + Math.random() * 0.6)
      pop.style.left = `${x}px`
      pop.style.top = `${y}px`
      requestAnimationFrame(()=>{
        const r = pop.getBoundingClientRect()
        const maxX = bounds.width - r.width - 12
        const maxY = bounds.height - r.height - 12
        pop.style.left = `${Math.max(12, Math.min(x, maxX))}px`
        pop.style.top = `${Math.max(12, Math.min(y, maxY))}px`
      })
    }
    requestAnimationFrame(()=>pop.classList.add("show"))
    setTimeout(()=>{ pop.classList.remove("show"); setTimeout(()=>pop.remove(), 240) }, 1900)
  }


  let liveSpeechPopup = null
  function showLiveSpeechPopup(text){
    const anchor = qs("#speechPopupAnchor") || qs("#centerStage") || document.body
    const stage = qs("#centerStage")
    if(!liveSpeechPopup){
      const pop = document.createElement("div")
      pop.id = "speechLive"
      pop.className = "speech-popup live"
      const userAvatar = state.userAvatar || "/static/images/woman-waking-up12.jpg"
      const ariaAvatar = "/static/images/woman-waking-up12.jpg"
      pop.innerHTML = `
        <div class="speech-avatars">
          <div class="speech-avatar me" style="background-image:url('${userAvatar}')"></div>
          <div class="speech-avatar aria" style="background-image:url('${ariaAvatar}')"></div>
        </div>
        <div class="speech-body">
          <div class="who">YOU</div>
          <div class="speech-text"></div>
        </div>
      `
      anchor.appendChild(pop)
      if(stage && anchor === qs("#speechPopupAnchor")){
        const bounds = stage.getBoundingClientRect()
        const x = bounds.width * (0.08 + Math.random() * 0.84)
        const y = bounds.height * (0.08 + Math.random() * 0.6)
        pop.style.left = `${x}px`
        pop.style.top = `${y}px`
        requestAnimationFrame(()=>{
          const r = pop.getBoundingClientRect()
          const maxX = bounds.width - r.width - 12
          const maxY = bounds.height - r.height - 12
          pop.style.left = `${Math.max(12, Math.min(x, maxX))}px`
          pop.style.top = `${Math.max(12, Math.min(y, maxY))}px`
        })
      }
      liveSpeechPopup = pop
      requestAnimationFrame(()=>pop.classList.add("show"))
    }
    const textEl = liveSpeechPopup.querySelector(".speech-text")
    if(textEl){ textEl.textContent = text || "Listening…" }
    state.livePopupActive = true
  }

  function finalizeLiveSpeechPopup(){
    if(!liveSpeechPopup) return
    const pop = liveSpeechPopup
    setTimeout(()=>{ pop.classList.remove("show"); setTimeout(()=>pop.remove(), 240) }, 1200)
    liveSpeechPopup = null
  }


  async function askAria(msg){
    if(!msg) return
    if(state.ariaBlocked && !isProOverride()){
      openModal("puzzleModal")
      return
    }
    appendAria(`You: ${msg}`)
    appendConversation("user", msg)
    if(state.livePopupActive){
      state.livePopupActive = false
    } else {
      showSpeechPopup("YOU", msg)
    }
    try{
      setAriaFlow("processing")
      const levelMap = {
        greeting: 'Keep it brief and welcoming. 3-5 sentences.',
        thorough: 'Give a thorough, structured answer with steps and routines.',
        inner: 'Give insider tips, product usage details, and sequencing.',
        pro: 'Give professional guidance and ways to monetize or upsell services.'
      }
  const isPremium = state.subscription === 'premium' || state.subscription === 'bingo100' || state.subscription === 'pro' || state.subscription === 'yoda' || state.subscription === 'fantasy300' || state.subscription === 'fantasy600'
      const shortMode = 'Reply in 1-2 sentences maximum.'
      const ariaLevelPrompt = isPremium ? (levelMap[state.ariaLevel] || levelMap.thorough) : shortMode
      const r = await fetch("/api/aria",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          message: msg + '\n\nResponse level: ' + ariaLevelPrompt,
          membership_tier: state.subscription || "free",
          adult_mode: !!state.adult21,
          family_theme: (state.socialLinks && state.socialLinks.familyFantasyTheme) ? state.socialLinks.familyFantasyTheme : "",
          muslim_greeting: !!(state.socialLinks && state.socialLinks.muslimGreeting),
          custom_greeting: (state.socialLinks && state.socialLinks.customGreeting) ? state.socialLinks.customGreeting : "",
          same_feel_voice: !!(state.socialLinks && state.socialLinks.sameFeelVoice),
          thought_style: (state.socialLinks && state.socialLinks.thoughtStyle) ? state.socialLinks.thoughtStyle : "",
          resolver_context: state.resolverContext || {}
        })
      })
      const d = await r.json()
      const reply = d.reply || "AI unavailable"
      appendAria(`ARIA: ${reply}`)
      appendConversation("aria", reply)
      showSpeechPopup("ARIA", reply)
      bumpHairScore(1)
      speakReply(reply)
      state.ariaCount += 1
  const limit = (state.subscription === "pro" || state.subscription === "yoda" || state.subscription === "fantasy300" || state.subscription === "fantasy600" || isProOverride()) ? 1e9 : (state.subscription === "premium" ? 8 : 2)
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
  const gpsActive = qs("#tab-gps")?.classList.contains("active")
  document.body.classList.toggle("gps-active", !!gpsActive)
  document.body.classList.toggle("aria-speaking", state === "speaking")
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
    document.body.classList.remove("aria-speaking")
    document.body.classList.remove("gps-active")
  }
}

function getAriaLang(){
  const sel = qs("#ariaLanguage")
  return (sel && sel.value) ? sel.value : "en-US"
}

async function speakReply(text){
    const transcriptEl = qs("#ariaTranscript")
    try{
      setAriaFlow("speaking")
      const prefs = state.socialLinks || {}
      const r = await fetch("/api/aria/speech", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          text,
          voice_preference: prefs.voiceProfile || "shimmer",
          wife_mode: !!prefs.wifeVoiceMode,
          wife_consent: !!prefs.wifeVoiceConsent,
          voice_reference: prefs.voiceReference || "",
          muslim_greeting: !!prefs.muslimGreeting,
          same_feel_voice: !!prefs.sameFeelVoice,
          thought_style: prefs.thoughtStyle || "",
          voice_reference_pack: prefs.voiceReferencePack || ""
        })
      })
      if(!r.ok) throw new Error("tts failed")
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = ()=>{
        playDoneChime()
        setAriaFlow("idle")
        URL.revokeObjectURL(url)
      }
      await audio.play()
      return
    }catch(e){
      if(transcriptEl){ transcriptEl.textContent = "Using device voice…" }
    }

    try{
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 1
      utter.pitch = 1.1
      const lang = getAriaLang()
      utter.lang = lang
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
          nameOrder.map(n => voices.find(v => v.name === n && v.lang === lang)).find(Boolean) ||
          voices.find(v => v.lang === lang && /female|woman|girl/i.test(v.name)) ||
          voices.find(v => v.lang === lang) ||
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
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
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
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
  }
  function stopListenLoop(){
    try{
      if(listenGain){
        const t = listenCtx.currentTime
        listenGain.gain.setTargetAtTime(0.0001, t, 0.05)
      }
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
    setTimeout(()=>{
      try{ if(listenOsc) listenOsc.stop() }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
      try{ if(listenLfo) listenLfo.stop() }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
      try{ if(listenCtx) listenCtx.close() }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
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
  }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
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
    document.body.className = `theme-${THEMES[state.themeIndex]} plus500 system-theme`
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
      if(state.subscription === "free" && !isProOverride()){
        openModal("subscriptionModal")
        toast("Occasion Editor is Premium+")
        return
      }
      openModal("occasionModal")
    })
  }
  bindOpen("menuGift", "giftModal")
  bindOpen("menuSettings", "settingsModal")
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
  bindClose("closeBrochure", "brochureModal")
  bindClose("closeOccasion6Q", "occasion6qModal")
  bindClose("closeRequestCall", "requestCallModal")

  // Real-work quick close: tap random outside spots to dismiss current modal.
  document.addEventListener("click", (e)=>{
    const openModals = qsa(".modal").filter(m => getComputedStyle(m).display !== "none")
    if(!openModals.length) return
    const top = openModals[openModals.length - 1]
    const card = top.querySelector(".modal-card")
    if(card && card.contains(e.target)) return
    if(e.target.closest(".menu-btn, .btn, .chip, .tab-btn, .app-card")) return
    top.style.display = "none"
  })
  document.addEventListener("keydown", (e)=>{
    if(e.key !== "Escape") return
    const openModals = qsa(".modal").filter(m => getComputedStyle(m).display !== "none")
    if(!openModals.length) return
    openModals[openModals.length - 1].style.display = "none"
  })

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
        if(name === "SEO Engine Viewer"){
          openModal("seoModal")
          return
        }
        if(name === "Occasion Editor"){
          if(state.subscription === "free" && !isProOverride()){
            openModal("subscriptionModal")
            toast("Occasion Editor is Premium+")
            return
          }
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

}

function openModal(id){
  const el = qs("#" + id)
  if(el){ el.style.display = "flex" }
}

function closeModal(id){
  const el = qs("#" + id)
  if(el){ el.style.display = "none" }
}

function bindOpen(triggerId, modalId){
  const el = qs("#" + triggerId)
  if(el){ el.addEventListener("click", ()=>openModal(modalId)) }
}

function bindClose(triggerId, modalId){
  const el = qs("#" + triggerId)
  if(el){ el.addEventListener("click", ()=>closeModal(modalId)) }
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
  if(body){
    const policy = `<div style="padding:10px;border-radius:10px;border:1px solid rgba(124,243,209,0.35);background:rgba(124,243,209,0.08);font-size:12px;margin-bottom:10px;"><strong>Politica del Blog:</strong> Solo noticias y contenido nitido de pelo.</div>`
    body.innerHTML = policy + post.body.split("\n\n").map(p=>`<p>${p}</p>`).join("")
  }
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

  async function checkUpgrade(){
    const email = (state.socialLinks && state.socialLinks.email) ? state.socialLinks.email : ""
    try{
      const url = email ? `/api/subscription/status?email=${encodeURIComponent(email)}` : "/api/subscription/status"
      const r = await fetch(url)
      const d = await r.json()
      if(d && d.ok){
        state.subscription = d.subscription || "free"
        setDefaultLevelBySubscription()
        refreshDealUnlock()
        toast(`Plan: ${(state.subscription || "free").toUpperCase()}`)
      } else {
        toast("Could not verify plan yet")
      }
    }catch{
      toast("Could not verify plan yet")
    }
  }

  function render(){
    const val = select.value
    if(val === "evelyn"){
      view.innerHTML = `<p>Custom order with Evelyn.</p><div class="lock-pill">Premium: 2 ARIA levels + puzzles</div><div class="lock-pill">Pro: all 4 levels + unlimited</div><button class="btn" id="openCustomOrder">Open Custom Order</button>`
      qs("#openCustomOrder").addEventListener("click", ()=>openModal("customOrderModal"))
      return
    }
    if(val === "premium"){
      view.innerHTML = `<p>$35 PREMIUM subscription.</p><div class="lock-pill">Unlocks 2 ARIA levels + puzzles to continue</div><div class="lock-pill">Activation happens after paid Shopify confirmation</div><button class="btn" id="goPremium">Pay $35</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`
      qs("#goPremium").addEventListener("click", ()=>openLinkModal(LINKS.premium, "Premium Subscription"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "bingo100"){
      view.innerHTML = `<p>$100/MONTH BINGO FANTASY.</p><div class="lock-pill">“You worked hard — relax, I got your hair.” chill support lane.</div><div class="lock-pill">Funny flow + confidence style for 5-to-9 builders (non-21+ mode).</div><button class="btn" id="goBingo100">Pay $100/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`
      qs("#goBingo100").addEventListener("click", ()=>openLinkModal(LINKS.bingo100, "Bingo Fantasy"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "family200"){
      view.innerHTML = `<p>$200/MONTH FAMILY FANTASY.</p><div class="lock-pill">Choose your Family Fantasy scene pack and let ARIA prep your next movie moment.</div><div class="lock-pill">Family-safe, high-energy, hair-first coaching style.</div><button class="btn" id="goFamily200">Pay $200/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`
      qs("#goFamily200").addEventListener("click", ()=>openLinkModal(LINKS.family200 || LINKS.custom, "Family Fantasy"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "yoda"){
      view.innerHTML = `<p>$20 YODA PASS.</p><div class="lock-pill">A focused build version of unlimited ARIA for style-first creators.</div><div class="lock-pill">Talk-to-us deal lane stays in $50 Unlimited ARIA.</div><button class="btn" id="goYoda">Pay $20</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`
      qs("#goYoda").addEventListener("click", ()=>openLinkModal(LINKS.yoda, "Yoda Pass"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "fantasy300"){
      view.innerHTML = `<p>$300/MONTH BASIC FANTASY (21+).</p><div class="lock-pill">Flirty-light vibe: “I like your style” and dinner-ready hair energy.</div><div class="lock-pill">Playful 21+ tone, non-explicit, hair-first.</div><button class="btn" id="goFantasy300">Pay $300/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`
      qs("#goFantasy300").addEventListener("click", ()=>openLinkModal(LINKS.fantasy300, "Basic Fantasy 21+"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "fantasy600"){
      view.innerHTML = `<p>$600/MONTH ADVANCED FANTASY (21+).</p><div class="lock-pill">Meaningful romance storytelling with premium emotional tone.</div><div class="lock-pill">Cinematic, affectionate, non-explicit, hair-first guidance.</div><button class="btn" id="goFantasy600">Pay $600/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`
      qs("#goFantasy600").addEventListener("click", ()=>openLinkModal(LINKS.fantasy600, "Advanced Fantasy 21+"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "pro"){
      view.innerHTML = `<p>$50 PROFESSIONAL subscription.</p><div class="lock-pill">All 4 levels + unlimited ARIA</div><div class="lock-pill">Activation happens after paid Shopify confirmation</div><button class="btn" id="goPro">Pay $50</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`
      qs("#goPro").addEventListener("click", ()=>openLinkModal(LINKS.pro, "Professional Subscription"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
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
  const postInput = qs("#postInput")
  const paySelect = qs("#paySelect")
  const tipTeam = qs("#tipTeam")
  const contactEvelyn = qs("#contactEvelyn")
  const indicator = qs("#socialIndicator")
  const socialSelect = qs("#socialSelect")
  const adCta = qs("#adCta")
  const adMembershipCta = qs("#adMembershipCta")
  const tipFrontierBody = qs("#tipFrontierBody")
  const askProductsAgain = qs("#askAriaProductsAgain")

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
    const text = (postInput && postInput.value ? postInput.value.trim() : "")
    if(hasProhibitedContent(text)){
      openMiniWindow("Blocked Content", "Drugs and gang-related content is not allowed.")
      return
    }
    let opened = 0
    targets.forEach(t=>{ if(openFeed(t)) opened++ })
    if(!opened){ toast("Add social links in Settings") }
    if(opened){
      const source = targets.length === 1 ? targets[0] : "social feeds"
      setTimeout(()=>triggerClassActLaugh(source), 800)
    }
    try{
      const text = (postInput && postInput.value ? postInput.value.trim() : "")
      if(text){
        fetch("/api/community/post-intake", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            message: text,
            source: choice === "all" ? "all_feeds_post" : `feed_${choice}`,
            region: "global",
            language: "en"
          })
        }).then(r=>r.json()).then(d=>{
          if(d && d.ok && d.needs_developer){
            openMiniWindow("Family Support Assist", "Escalated to family support contact.")
          }
        }).catch(()=>{})
      }
    }catch{}
  }

  function updateTipFrontier(){
    if(!tipFrontierBody) return
    const tipped = Number(localStorage.getItem("srdTipTotal") || "0")
    const frontierReached = tipped >= 10000
    tipFrontierBody.textContent = frontierReached
      ? `$${tipped.toFixed(2)} tipped · Celebration frontier active`
      : `$${tipped.toFixed(2)} tipped · Frontier pending ($10,000+)`
    if(frontierReached){
      document.body.classList.add("celebration-mode")
      const hideBuy = Math.random() < 0.35
      document.body.classList.toggle("hide-buy-random", hideBuy)
      qsa(".buy-optional").forEach(el=>el.style.display = hideBuy ? "none" : "")
    } else {
      document.body.classList.remove("celebration-mode")
      qsa(".buy-optional").forEach(el=>el.style.display = "")
    }
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
  if(adCta){ adCta.addEventListener("click", ()=>openLinkModal(LINKS.cart, "Shopify Cart")) }
  if(adMembershipCta){ adMembershipCta.addEventListener("click", ()=>openModal("subscriptionModal")) }
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
    tipTeam.addEventListener("click", ()=>{
      const tipped = Number(localStorage.getItem("srdTipTotal") || "0")
      const bump = 25
      localStorage.setItem("srdTipTotal", String(tipped + bump))
      updateTipFrontier()
      openMiniWindow("Tips", `Thanks for tipping SupportRD. Profile value signal +${bump}. Account transfer/sale is disabled for safety.`)
      openLinkModal("https://supportrd.com/cart","Tip SupportRD Family Team")
    })
  }

  if(contactEvelyn){
    contactEvelyn.addEventListener("click", ()=>{
      const phone = (state.socialLinks.evelyn || "829-233-2670").replace(/\D/g,"")
      if(!phone){ toast("Add Evelyn WhatsApp in Settings"); return }
      openLinkModal(`https://wa.me/${phone}?text=Hi%20Evelyn%2C%20I%20need%20help%20with%20my%20order.`,"Contact Evelyn")
    })
  }
  if(askProductsAgain){
    askProductsAgain.addEventListener("click", ()=>{
      const prompt = "What products was I supposed to use again for my hair today? Please give me a simple routine and timing."
      const input = qs("#postInput")
      if(input) input.value = prompt
      if(typeof window.askAriaDirect === "function"){
        window.askAriaDirect(prompt)
      }else{
        openMiniWindow("ARIA", "Open ARIA and ask for product reminders.")
      }
    })
  }

  updateIndicator()
  updateTipFrontier()
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
    "Apply Product","Shampoo","Laciador","Mask","Leave In","Serum","Scalp Oil","Heat Protectant","Foam","Gel","Cream",
    "Butter","Conditioner","Deep Conditioner","Clarifying Wash","Co Wash","Edge Control","Mousse","Protein Treatment",
    "Hydration Mist","Styling Spray"
  ]
  const enjoys = [
    "Enjoy Product","Big Fight","Date Night","Photo Day","After Workout","All Day Shine","Smooth Finish","Soft Curls",
    "Volume Boost","Frizz‑Free","Long‑Lasting Style","Protective Glow","Salon‑Ready","Party Ready","Interview Ready"
  ]

  actionSel.innerHTML = actions.map(a=>`<option>${a}</option>`).join("")
  applySel.innerHTML = applies.map(a=>`<option>${a}</option>`).join("")
  enjoySel.innerHTML = enjoys.map(a=>`<option>${a}</option>`).join("")

  const dayPlans = Array.from({length:7}, () => ({action: actionSel.value, apply: applySel.value, enjoy: enjoySel.value}))
  let selectedDay = 0

  function buildDescription(i){
    const plan = dayPlans[i]
    return `Today you will ${plan.action.toLowerCase()}, ${plan.apply.toLowerCase()}, and enjoy ${plan.enjoy.toLowerCase()} for healthy hair.`
  }

  function renderWeek(){
    weekWrap.innerHTML = ""
    for(let i=0;i<7;i++){
      const row = document.createElement("div")
      row.className = "week"
      if(i === selectedDay) row.classList.add("active")
      const plan = dayPlans[i]
      row.innerHTML = `<div class="day-title">Day ${i+1}</div>
        <div class="day-line">${plan.action} · ${plan.apply} · ${plan.enjoy}</div>
        <div class="day-line">AI: ${buildDescription(i)}</div>`
      row.addEventListener("click", ()=>{
        selectedDay = i
        actionSel.value = dayPlans[i].action
        applySel.value = dayPlans[i].apply
        enjoySel.value = dayPlans[i].enjoy
        renderWeek()
      })
      weekWrap.appendChild(row)
    }
  }

  function updatePost(){
    const input = qs("#postInput")
    if(!input) return
    input.value = buildDescription(selectedDay)
  }

  const applyBtn = qs("#applyOccasion")
  const addBtn = qs("#addOccasionPost")
  const open6Q = qs("#openOccasion6Q")
  const apply6Q = qs("#applyOccasion6Q")
  if(applyBtn){ applyBtn.addEventListener("click", ()=>{ dayPlans[selectedDay] = {action: actionSel.value, apply: applySel.value, enjoy: enjoySel.value}; renderWeek() }) }
  if(addBtn){ addBtn.addEventListener("click", updatePost) }
  if(open6Q){
    open6Q.addEventListener("click", ()=>openModal("occasion6qModal"))
  }
  if(apply6Q){
    apply6Q.addEventListener("click", ()=>{
      const look = (qs("#qLookGoal")?.value || "").trim()
      const type = (qs("#qHairType")?.value || "").trim()
      const scalp = (qs("#qScalp")?.value || "").trim()
      const heat = (qs("#qHeat")?.value || "").trim()
      const mins = (qs("#qTime")?.value || "").trim()
      const event = (qs("#qEvent")?.value || "").trim()
      const summary = `Occasion questionnaire: Look=${look || "natural"}, Type=${type || "mixed"}, Scalp=${scalp || "normal"}, Heat=${heat || "no"}, Time=${mins || "15"} mins, Event=${event || "daily routine"}.`
      const input = qs("#postInput")
      if(input){ input.value = summary + " What products and order should I use?" }
      closeModal("occasion6qModal")
      openMiniWindow("6-Questionnaire", "Saved to your plan. ARIA can now refine product sequence.")
      if(typeof window.askAriaDirect === "function"){
        window.askAriaDirect(summary + " Give the exact products and marination timing.")
      }
    })
  }

  actionSel.addEventListener("change", ()=>{ dayPlans[selectedDay].action = actionSel.value; renderWeek() })
  applySel.addEventListener("change", ()=>{ dayPlans[selectedDay].apply = applySel.value; renderWeek() })
  enjoySel.addEventListener("change", ()=>{ dayPlans[selectedDay].enjoy = enjoySel.value; renderWeek() })
  renderWeek()
}

function setupMarinationTimer(){
  const startBtn = qs("#startMarinateTimer")
  const stopBtn = qs("#stopMarinateTimer")
  const minutesSel = qs("#marinateMinutes")
  const status = qs("#marinateTimerStatus")
  if(!startBtn || !stopBtn || !minutesSel || !status) return
  let timer = null
  let endTs = 0
  function draw(){
    if(!endTs){
      status.textContent = "Timer not running."
      return
    }
    const left = Math.max(0, endTs - Date.now())
    if(left <= 0){
      status.textContent = "Marination done. Rinse now."
      clearInterval(timer); timer = null; endTs = 0
      openMiniWindow("ARIA Timer", "Marination complete. Time to rinse.")
      if(typeof window.askAriaDirect === "function"){
        window.askAriaDirect("My marination timer just ended. What is my next product step?")
      }
      return
    }
    const mm = Math.floor(left / 60000)
    const ss = Math.floor((left % 60000) / 1000)
    status.textContent = `Time left: ${mm}:${String(ss).padStart(2,"0")}`
  }
  startBtn.addEventListener("click", ()=>{
    const mins = Number(minutesSel.value || 10)
    endTs = Date.now() + mins * 60000
    if(timer) clearInterval(timer)
    timer = setInterval(draw, 1000)
    draw()
    openMiniWindow("ARIA Timer", `Marination timer started for ${mins} minutes.`)
  })
  stopBtn.addEventListener("click", ()=>{
    if(timer) clearInterval(timer)
    timer = null
    endTs = 0
    draw()
  })
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
  const destInput = qs("#gpsDestination")
  const routeBtn = qs("#gpsRoute")
  if(map){
    map.src = "https://www.openstreetmap.org/export/embed.html?bbox=-74.1%2C40.6%2C-73.7%2C40.9&layer=mapnik"
  }
  async function routeToDestination(){
    if(!map || !destInput) return
    const dest = (destInput.value || "").trim()
    if(!dest){
      toast("Enter a destination")
      return
    }
    const coordMatch = dest.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/)
    const getOrigin = ()=>new Promise((resolve)=>{
      if(!navigator.geolocation){ resolve(null); return }
      navigator.geolocation.getCurrentPosition(
        pos=>resolve({lat:pos.coords.latitude, lng:pos.coords.longitude}),
        ()=>resolve(null),
        {enableHighAccuracy:true, timeout:6000}
      )
    })
    const origin = await getOrigin()
    if(coordMatch){
      const dLat = coordMatch[1]
      const dLng = coordMatch[3]
      if(origin){
        map.src = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.lat},${origin.lng};${dLat},${dLng}`
      } else {
        map.src = `https://www.openstreetmap.org/?mlat=${dLat}&mlon=${dLng}#map=13/${dLat}/${dLng}`
      }
      return
    }
    try{
      const q = encodeURIComponent(dest)
      const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}`)
      const data = await geo.json()
      if(!data.length){
        toast("Destination not found")
        return
      }
      const dLat = data[0].lat
      const dLng = data[0].lon
      if(origin){
        map.src = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.lat},${origin.lng};${dLat},${dLng}`
      } else {
        map.src = `https://www.openstreetmap.org/?mlat=${dLat}&mlon=${dLng}#map=13/${dLat}/${dLng}`
      }
    }catch{
      toast("Route failed")
    }
  }
  if(routeBtn){ routeBtn.addEventListener("click", routeToDestination) }
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
  const streams = [qs("#logStream"), qs("#logStreamStandalone")].filter(Boolean)
  let timer = null
  const close = qs("#closeSeo")
  const publish = qs("#seoPublish")
  const autoBtn = qs("#seoAuto")
  const autoStandalone = qs("#seoAutoStandalone")
  const testBtn = qs("#testEmailBtn")
  const wellnessBlast = qs("#wellnessBlast")
  if(!streams.length) return
  if(timer) clearInterval(timer)
  timer = setInterval(()=>{
    const line = `[${new Date().toLocaleTimeString()}] render: build ok · cache hit · seo feed synced`
    streams.forEach(stream=>{
      const div = document.createElement("div")
      div.textContent = line
      stream.appendChild(div)
      stream.scrollTop = stream.scrollHeight
    })
  }, 4800)
  if(close){ close.addEventListener("click", ()=>{ if(timer) clearInterval(timer) }) }
  if(publish){
    publish.addEventListener("click", async ()=>{
      const r = await fetch("/api/seo/publish", {method:"POST"})
      const d = await r.json()
      streams.forEach(stream=>{
        const div = document.createElement("div")
        div.textContent = `[SEO] ${d.ok ? "Published" : "Failed"} · ${d.message || d.error || ""}`
        stream.appendChild(div)
        stream.scrollTop = stream.scrollHeight
      })
    })
  }
  if(autoBtn){
    autoBtn.addEventListener("click", async ()=>{
      const enabled = !autoBtn.classList.contains("active")
      const ok = await setSeoAuto(enabled, streams[0])
      if(ok){
        autoBtn.classList.toggle("active", enabled)
        autoBtn.textContent = enabled ? "SEO 4x/Day Active" : "Activate SEO 4x/Day (Random)"
      }
    })
  }
  if(autoStandalone){
    autoStandalone.addEventListener("click", async ()=>{
      const enabled = !autoStandalone.classList.contains("active")
      const ok = await setSeoAuto(enabled, streams[0])
      if(ok){
        autoStandalone.classList.toggle("active", enabled)
        autoStandalone.textContent = enabled ? "SEO 4x/Day Active" : "Activate SEO 4x/Day (Random)"
      }
    })
  }
  if(testBtn){
    testBtn.addEventListener("click", async ()=>{
      const r = await fetch("/api/custom-order/test", {method:"POST"})
      const d = await r.json()
      streams.forEach(stream=>{
        const div = document.createElement("div")
        div.textContent = `[EMAIL] ${d.ok ? "Test sent" : "Test failed"}`
        stream.appendChild(div)
        stream.scrollTop = stream.scrollHeight
      })
    })
  }
  if(wellnessBlast){
    wellnessBlast.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/wellness/send-all", {method:"POST"})
        const d = await r.json()
        const line = d.ok
          ? `[CARE] Sent ${d.sent}/${d.total}. Failed: ${d.failed}`
          : `[CARE] Failed · ${d.error || "unknown"}`
        streams.forEach(stream=>{
          const div = document.createElement("div")
          div.textContent = line
          stream.appendChild(div)
          stream.scrollTop = stream.scrollHeight
        })
      }catch{
        streams.forEach(stream=>{
          const div = document.createElement("div")
          div.textContent = "[CARE] Failed · network_error"
          stream.appendChild(div)
          stream.scrollTop = stream.scrollHeight
        })
      }
    })
  }
}

function formatMoney(value, currency){
  const amount = Number(value || 0)
  try{
    return new Intl.NumberFormat(undefined, {style:"currency", currency: currency || "USD", maximumFractionDigits: 2}).format(amount)
  }catch{
    return `$${amount.toFixed(2)}`
  }
}

function setupCredit(){
  const email = qs("#creditEmail")
  const country = qs("#creditCountry")
  const income = qs("#creditIncome")
  const debt = qs("#creditDebt")
  const amount = qs("#creditAmount")
  const term = qs("#creditTerm")
  const risk = qs("#creditRiskFlag")
  const evaluate = qs("#creditEvaluate")
  const load = qs("#creditLoadStatus")
  const payMembership = qs("#creditPayMembership")
  const payProducts = qs("#creditPayProducts")
  const dealBtn = qs("#talkDealBtn")
  const dealLockNote = qs("#dealLockNote")
  const requestTransferBtn = qs("#requestTransferBtn")
  const reverifyTransferBtn = qs("#reverifyTransferBtn")
  const approveTransferBtn = qs("#approveTransferBtn")
  const toggleTransferReleaseBtn = qs("#toggleTransferReleaseBtn")
  const transferStatusNote = qs("#transferStatusNote")
  const transferReleaseState = qs("#transferReleaseState")
  const tradeBotOrbit = qs("#tradeBotOrbit")
  const tradeBotsStatus = qs("#tradeBotsStatus")
  const refreshTradeBotsBtn = qs("#refreshTradeBotsBtn")
  const runTradeBotsBtn = qs("#runTradeBotsBtn")
  const log = qs("#creditDecisionLog")
  let tradeBotRefs = {}
  let lastHeartbeatSentAt = 0

  if(!log) return

  async function refreshTransferReleaseState(){
    if(!transferReleaseState) return
    try{
      const r = await fetch("/api/account-transfer/status")
      const d = await r.json()
      if(d && d.ok){
        const pct = Math.round(Number(d.trade_service_tax_rate || 0.05) * 100)
        transferReleaseState.textContent = `Sell ARIA release: ${d.sell_aria_release_open ? "OPEN" : "HOLD"} · Cap: $${Number(d.trade_cap_usd || 50000).toLocaleString()} · Service tax: ${pct}% · Founder required: YES`
      } else {
        transferReleaseState.textContent = "Sell ARIA release status unavailable."
      }
    }catch{
      transferReleaseState.textContent = "Sell ARIA release status unavailable."
    }
  }
  refreshTransferReleaseState()

  async function refreshTradeBotsStatus(){
    if(!tradeBotsStatus) return
    function modeForBot(b){
      const now = Date.now()
      const ts = b.last_run_at ? new Date(b.last_run_at).getTime() : 0
      const ageSec = ts ? Math.max(0, (now - ts) / 1000) : 9999
      if((b.last_status || "").toLowerCase() === "error" || ageSec > 180) return "inout"
      const m = b.metrics || {}
      let load = 0
      if((b.bot_id || "") === "risk"){
        load = Number(m.open_requests || 0) + Number(m.flagged_cap || 0) * 3
      }else if((b.bot_id || "") === "ops"){
        const c = m.counts || {}
        load = Number(c.pending_review || 0) + Number(c.reverify_required || 0) + Number(m.expired_reverify || 0) * 2 + Number(m.expired_pending || 0) * 2
      }else{
        load = Number(m.reviewed_items || 0) + Number(m.policy_holds || 0) * 3
      }
      if(load >= 8) return "fast"
      if(load >= 2) return "normal"
      return "slow"
    }
    function modeLabel(mode){
      if(mode === "fast") return "busy"
      if(mode === "normal") return "pending"
      if(mode === "inout") return "in-out"
      return "slow"
    }
    try{
      const r = await fetch("/api/trade-bots/status")
      const d = await r.json()
      if(!(d && d.ok && Array.isArray(d.bots))){
        tradeBotsStatus.textContent = "Bot status unavailable."
        return
      }
      tradeBotsStatus.innerHTML = d.bots.map((b)=>{
        const fn = (b.functions || []).map(x=>`<li>${x}</li>`).join("")
        const when = b.last_run_at ? new Date(b.last_run_at).toLocaleString() : "Never"
        const mode = modeForBot(b)
        const ref = tradeBotRefs[String(b.bot_id || "").toLowerCase()]
        if(ref && ref.el){
          ref.el.classList.remove("hb-fast","hb-normal","hb-slow","hb-inout")
          ref.el.classList.add(`hb-${mode}`)
          ref.el.title = `${String(b.bot_id || "").toUpperCase()} bot · heartbeat ${modeLabel(mode)}`
        }
        return `<div style="margin:6px 0;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.04);">
          <div><strong>${String(b.bot_id || "").toUpperCase()} BOT</strong> · ${b.last_status || "idle"} · ${when} · heartbeat: ${modeLabel(mode)}</div>
          <div style="margin-top:4px;">${b.last_summary || ""}</div>
          <ul style="margin:6px 0 0 16px;">${fn}</ul>
        </div>`
      }).join("")
      const now = Date.now()
      if(now - lastHeartbeatSentAt > 60000){
        const entries = d.bots.map((b)=>({
          bot_id: String(b.bot_id || "").toLowerCase(),
          beat_mode: modeForBot(b),
          source: "ui",
          status: String(b.last_status || "idle").toLowerCase(),
          metrics: b.metrics || {}
        }))
        fetch("/api/trade-bots/heartbeat-log", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({entries})
        }).catch(()=>{})
        lastHeartbeatSentAt = now
      }
    }catch{
      tradeBotsStatus.textContent = "Bot status unavailable."
    }
  }
  refreshTradeBotsStatus()
  setInterval(refreshTradeBotsStatus, 15000)
  if(refreshTradeBotsBtn){
    refreshTradeBotsBtn.addEventListener("click", refreshTradeBotsStatus)
  }
  if(runTradeBotsBtn){
    runTradeBotsBtn.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/trade-bots/run", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({})
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Trade Bots", "3 bots executed now.")
          refreshTradeBotsStatus()
        } else {
          openMiniWindow("Trade Bots", `Run failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Trade Bots", "Run failed: network_error")
      }
    })
  }

  function setupTradeBots(){
    if(!tradeBotOrbit || tradeBotOrbit.dataset.ready === "1") return
    tradeBotOrbit.dataset.ready = "1"
    const roles = [
      {
        id:"risk",
        lines:[
          "Risk Bot: trade setup is clean. Cap 50k, founder release, and 5% service tax are enforced.",
          "Your hair can become an active style weapon, be careful.",
          "Whip-lock that flow, but keep the trade rules tighter."
        ]
      },
      {
        id:"ops",
        lines:[
          "Ops Bot: rules are live. Two re-verifies, anti-bot controls, and timed lockouts are active.",
          "Whip lock that thang, girl - now verify twice and keep it clean.",
          "Fast moves are fine, but no quick-close tricks in this lane."
        ]
      },
      {
        id:"comms",
        lines:[
          "Comms Bot: competition policy is active. No pornography. Win metrics are laughs, excitement, and votes.",
          "Encima de ti tu pelo esta - misterioso, la crema completa el look.",
          "Bring laughs, excitement, and votes. That's how champions are represented."
        ]
      },
    ]
    const bots = roles.map((role, idx)=>{
      const el = document.createElement("button")
      el.type = "button"
      el.className = "trade-bot"
      el.setAttribute("aria-label", role.id)
      el.style.left = `${16 + idx*36}px`
      el.style.top = `${16 + (idx%2)*16}px`
      tradeBotOrbit.appendChild(el)
      const vx = (Math.random() * 0.55 + 0.35) * (Math.random() > 0.5 ? 1 : -1)
      const vy = (Math.random() * 0.55 + 0.35) * (Math.random() > 0.5 ? 1 : -1)
      const bot = {el, role, x:16 + idx*36, y:16 + (idx%2)*16, vx, vy, caughtUntil:0}
      tradeBotRefs[role.id] = bot
      el.addEventListener("click", ()=>{
        bot.caughtUntil = Date.now() + 900
        el.classList.add("caught")
        const lines = role.lines || []
        const pick = lines[Math.floor(Math.random() * lines.length)] || "Trade bot active."
        openMiniWindow("Bot Caught", pick)
        setTimeout(()=>el.classList.remove("caught"), 950)
      })
      return bot
    })
    let raf = 0
    const tick = ()=>{
      const now = Date.now()
      const w = tradeBotOrbit.clientWidth || 260
      const h = tradeBotOrbit.clientHeight || 56
      bots.forEach((b)=>{
        if(now < b.caughtUntil) return
        b.x += b.vx
        b.y += b.vy
        if(b.x <= 2 || b.x >= w - 16){ b.vx *= -1 }
        if(b.y <= 2 || b.y >= h - 16){ b.vy *= -1 }
        b.el.style.left = `${Math.max(2, Math.min(w - 16, b.x))}px`
        b.el.style.top = `${Math.max(2, Math.min(h - 16, b.y))}px`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    tradeBotOrbit._raf = raf
  }
  setupTradeBots()

  const saved = JSON.parse(localStorage.getItem("supportrdSettings") || "{}")
  if(email && !email.value) email.value = saved.email || ""
  if(country && !country.value) country.value = "US"
  if(term && !term.value) term.value = "6"

  function setLog(html){
    log.innerHTML = html
  }

  function renderDecision(d){
    const status = (d.status || "none").toUpperCase()
    const color = status === "APPROVED" ? "#7cf3d1" : (status === "CONDITIONAL" ? "#ffd166" : "#ff7b7b")
    const approved = formatMoney(d.approved_amount || 0, d.currency || "USD")
    const estimate = formatMoney(d.estimated_payment || 0, d.currency || "USD")
    const allowed = formatMoney(d.allowed_payment || 0, d.currency || "USD")
    setLog(
      `<div style="display:grid;gap:8px;">
        <div><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.08);border:1px solid ${color};color:${color};font-weight:700;">${status}</span></div>
        <div>Approved Amount: <strong>${approved}</strong></div>
        <div>Estimated Monthly Payment: <strong>${estimate}</strong></div>
        <div>30% Limit (after debt): <strong>${allowed}</strong></div>
        <div>Reason: <strong>${d.reason || "none"}</strong></div>
        <div style="color:var(--muted);font-size:11px;">${d.legal_note || "Automated pre-screen only. Final compliance review may apply."}</div>
      </div>`
    )
  }

  if(evaluate){
    evaluate.addEventListener("click", async ()=>{
      const payload = {
        email: (email && email.value || "").trim(),
        country: (country && country.value || "").trim().toUpperCase(),
        monthly_income: Number(income && income.value || 0),
        monthly_debt: Number(debt && debt.value || 0),
        requested_amount: Number(amount && amount.value || 0),
        term_months: Number(term && term.value || 0),
        has_payment_issues: !!(risk && risk.checked),
        kyc_ack: true
      }
      try{
        const r = await fetch("/api/credit/evaluate", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const d = await r.json()
        if(!r.ok || !d.ok){
          setLog(`<div style="color:#ff9f9f;">Credit check failed: ${(d.error || "unknown_error")}</div>`)
          return
        }
        localStorage.setItem("lastCreditEmail", payload.email || "")
        renderDecision(d)
      }catch{
        setLog(`<div style="color:#ff9f9f;">Credit check failed: network_error</div>`)
      }
    })
  }

  if(load){
    load.addEventListener("click", async ()=>{
      const em = ((email && email.value) || localStorage.getItem("lastCreditEmail") || "").trim()
      if(!em){
        setLog(`<div style="color:var(--muted);">Enter an email to load status.</div>`)
        return
      }
      try{
        const r = await fetch(`/api/credit/status?email=${encodeURIComponent(em)}`)
        const d = await r.json()
        if(!r.ok || !d.ok){
          setLog(`<div style="color:#ff9f9f;">Status load failed: ${(d.error || "unknown_error")}</div>`)
          return
        }
        if(d.status === "none"){
          setLog(`<div style="color:var(--muted);">No previous decision found for this email.</div>`)
          return
        }
        renderDecision(d)
      }catch{
        setLog(`<div style="color:#ff9f9f;">Status load failed: network_error</div>`)
      }
    })
  }

  if(payMembership){
    payMembership.addEventListener("click", ()=>openLinkModal(LINKS.pro, "Membership Payment"))
  }
  if(payProducts){
    payProducts.addEventListener("click", ()=>openLinkModal(LINKS.custom, "Products Payment"))
  }
  if(dealBtn){
    const unlock = state.subscription === "pro" || isProOverride()
    dealBtn.disabled = !unlock
    dealBtn.addEventListener("click", ()=>{
      if(dealBtn.disabled){
        openMiniWindow("Unlimited ARIA", "Upgrade to $50 Unlimited ARIA to unlock deal support.")
        return
      }
      openMiniWindow("Talk to us for a deal", "Unlimited ARIA unlocked. Professional contact route is open.")
    })
  }
  if(dealLockNote){
    dealLockNote.textContent = (state.subscription === "pro" || isProOverride())
      ? "Unlocked: Unlimited ARIA tier active."
      : "Locked: upgrade to Unlimited ARIA ($50) to unlock deal channel."
  }
  if(requestTransferBtn){
    requestTransferBtn.addEventListener("click", async ()=>{
      if(!(state.subscription === "pro" || isProOverride())){
        openMiniWindow("Transfer Locked", "Unlimited ARIA ($50) is required.")
        return
      }
      const payload = {
        to_email: (qs("#transferToEmail")?.value || "").trim(),
        transfer_amount: Number(qs("#transferAmount")?.value || 0),
        id_last4: (qs("#transferIdLast4")?.value || "").trim(),
        visa_last4: (qs("#transferVisaLast4")?.value || "").trim(),
        from_email: (state.socialLinks && state.socialLinks.email) ? state.socialLinks.email : ""
      }
      try{
        const r = await fetch("/api/account-transfer/request", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const d = await r.json()
        if(d && d.ok){
          localStorage.setItem("lastTransferRequestId", d.request_id || "")
          if(transferStatusNote){ transferStatusNote.textContent = `Transfer ${d.request_id} created. Gross $${Number(d.transfer_amount || 0).toLocaleString()} · Tax $${Number(d.tax_amount || 0).toLocaleString()} · Net $${Number(d.seller_net || 0).toLocaleString()}. Re-verify 2 times to unlock admin review.` }
          openMiniWindow("Transfer Requested", `Request ${d.request_id} created. Re-verify now.`)
        } else {
          if(d && d.error === "founder_presence_required"){
            openMiniWindow("Transfer Hold", "Founder presence is required before Sell Your ARIA release opens.")
          } else if(d && d.error === "trade_cap_exceeded"){
            openMiniWindow("Transfer Cap", "Transfer exceeds $50,000 cap.")
          } else {
            openMiniWindow("Transfer", `Request failed: ${d.error || "unknown"}`)
          }
        }
      }catch{
        openMiniWindow("Transfer", "Request failed: network_error")
      }
    })
  }
  if(toggleTransferReleaseBtn){
    toggleTransferReleaseBtn.addEventListener("click", async ()=>{
      const currentlyOpen = (transferReleaseState && transferReleaseState.textContent || "").includes("OPEN")
      const active = !currentlyOpen
      try{
        const r = await fetch("/api/account-transfer/release-toggle", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({active, founder_present: true})
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Sell ARIA Release", active ? "Release opened with founder present." : "Release placed on hold.")
          refreshTransferReleaseState()
        } else {
          openMiniWindow("Sell ARIA Release", `Update failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Sell ARIA Release", "Update failed: network_error")
      }
    })
  }
  if(reverifyTransferBtn){
    reverifyTransferBtn.addEventListener("click", async ()=>{
      const request_id = localStorage.getItem("lastTransferRequestId") || ""
      const id_last4 = (qs("#transferIdLast4")?.value || "").trim()
      const visa_last4 = (qs("#transferVisaLast4")?.value || "").trim()
      if(!request_id){
        openMiniWindow("Re-Verify", "Create transfer request first.")
        return
      }
      try{
        const r = await fetch("/api/account-transfer/reverify", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({request_id, id_last4, visa_last4})
        })
        const d = await r.json()
        if(d && d.ok){
          const msg = `Re-verify ${d.reverify_passed}/${d.reverify_needed}. Status: ${d.status}`
          if(transferStatusNote){ transferStatusNote.textContent = msg }
          openMiniWindow("Re-Verify", msg)
        } else {
          if(transferStatusNote){ transferStatusNote.textContent = `Re-verify failed: ${d.error || "unknown"}` }
          openMiniWindow("Re-Verify", `Failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Re-Verify", "Failed: network_error")
      }
    })
  }
  if(approveTransferBtn){
    approveTransferBtn.addEventListener("click", async ()=>{
      const request_id = localStorage.getItem("lastTransferRequestId") || ""
      if(!request_id){
        openMiniWindow("Transfer", "No pending transfer request id found.")
        return
      }
      try{
        const r = await fetch("/api/account-transfer/approve", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({request_id})
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Transfer", `Approved for ${d.to_email}. Net after 5% tax: $${Number(d.seller_net || 0).toLocaleString()}.`)
        } else {
          openMiniWindow("Transfer", `Approve failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Transfer", "Approve failed: network_error")
      }
    })
  }
}

function refreshDealUnlock(){
  const dealBtn = qs("#talkDealBtn")
  const dealLockNote = qs("#dealLockNote")
  if(!dealBtn || !dealLockNote) return
  const unlock = state.subscription === "pro" || isProOverride()
  dealBtn.disabled = !unlock
  dealLockNote.textContent = unlock
    ? "Unlocked: Unlimited ARIA tier active."
    : "Locked: upgrade to Unlimited ARIA ($50) to unlock deal channel."
}

function setupCampaign(){
  const openRequest = qs("#openRequestCall")
  const closeRequest = qs("#closeRequestCall")
  const blogCta = qs("#campaignBlogCta")
  if(openRequest){ openRequest.addEventListener("click", ()=>openModal("requestCallModal")) }
  if(closeRequest){ closeRequest.addEventListener("click", ()=>closeModal("requestCallModal")) }
  if(blogCta){
    blogCta.addEventListener("click", ()=>{
      state.blogIndex = 0
      renderBlog()
      openModal("blogModal")
    })
  }
}

function setupAdult21Mode(){
  const confirm = qs("#adult21Confirm")
  const onBtn = qs("#adult21Enable")
  const offBtn = qs("#adult21Disable")
  const status = qs("#adult21Status")
  const feedBtn = qs("#openSocialCircuitFeed")
  const launchBtn = qs("#launchSensualAriaPost")
  const bingoBtn = qs("#startBingoFantasy")
  const familyTheme = qs("#familyFantasyTheme")
  const familyThemeStatus = qs("#familyFantasyThemeStatus")
  const saveFamilyTheme = qs("#saveFamilyFantasyTheme")
  const circuitStatus = qs("#socialCircuitStatus")
  if(!confirm || !onBtn || !offBtn || !status) return
  state.adult21 = localStorage.getItem("adult21Mode") === "true"
  function render(){
    status.textContent = state.adult21
      ? "21+ mode is active. ARIA will use mature sensual product tone for adults."
      : "21+ mode is currently off."
    document.body.classList.toggle("adult21-mode", state.adult21)
  }
  onBtn.addEventListener("click", ()=>{
    if(!confirm.checked){
      openMiniWindow("21+ Mode", "Please confirm 21+ first.")
      return
    }
    if(!(state.subscription === "fantasy300" || state.subscription === "fantasy600" || isProOverride())){
      openMiniWindow("21+ Mode", "21+ mode requires Basic Fantasy ($300) or Advanced Fantasy ($600). No exceptions.")
      return
    }
    state.adult21 = true
    localStorage.setItem("adult21Mode", "true")
    render()
    openMiniWindow("21+ Mode", "Activated. No drugs or gang content allowed.")
  })
  offBtn.addEventListener("click", ()=>{
    state.adult21 = false
    localStorage.setItem("adult21Mode", "false")
    render()
  })
  if(feedBtn){
    feedBtn.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/social-circuits")
        const d = await r.json()
        if(d && d.ok){
          const lines = (d.circuits || []).map(c=>`${c.name}: ${c.state}`).join(" · ")
          if(circuitStatus) circuitStatus.textContent = `Live circuits: ${lines}`
          openMiniWindow("Social Circuits", "SupportRD source feed is active.")
        } else {
          if(circuitStatus) circuitStatus.textContent = `Source mode error: ${d.error || "unknown"}`
        }
      }catch{
        if(circuitStatus) circuitStatus.textContent = "Source mode error: network_error"
      }
    })
  }
  if(launchBtn){
    launchBtn.addEventListener("click", ()=>{
      const post = qs("#postInput")
      const msg = "SupportRD Social Source: style pulse, hydration pulse, repair pulse, and attraction pulse are live. Clean, respectful, hair-focused guidance for everyone."
      if(post) post.value = msg
      if(circuitStatus) circuitStatus.textContent = "SupportRD circuit post staged to Social Source."
      openMiniWindow("SupportRD Circuits", "Post staged for everybody. Keep it clean and hair-focused.")
    })
  }
  const familyThemeLabels = {
    boat_conductor: "Boat Conductor",
    theme_park_conductor: "Theme Park Conductor",
    museum_greeter: "Museum Greeter / Information Guide",
    nascar_driver: "Nascar Driver",
    jungle_book: "Jungle Book",
    molopy_board: "Molopy Board (laid back strategy)"
  }
  function renderFamilyTheme(){
    const selected = (state.socialLinks && state.socialLinks.familyFantasyTheme) || "boat_conductor"
    if(familyTheme){ familyTheme.value = selected }
    if(familyThemeStatus){ familyThemeStatus.textContent = `Current family theme: ${familyThemeLabels[selected] || familyThemeLabels.boat_conductor}` }
  }
  if(saveFamilyTheme){
    saveFamilyTheme.addEventListener("click", ()=>{
      const selected = familyTheme ? familyTheme.value : "boat_conductor"
      state.socialLinks = state.socialLinks || {}
      state.socialLinks.familyFantasyTheme = selected
      localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
      renderFamilyTheme()
      openMiniWindow("Family Fantasy", "Theme saved for your $200 Family Fantasy pack.")
    })
  }
  renderFamilyTheme()
  if(bingoBtn){
    bingoBtn.addEventListener("click", ()=>{
      openLinkModal(LINKS.bingo100, "Bingo Fantasy")
      if(circuitStatus) circuitStatus.textContent = "Bingo Fantasy lane opened. Chill vibe + funny flow mode."
      openMiniWindow("Bingo Fantasy", "You worked long and hard. Relax — ARIA is ready to assist your hair flow.")
    })
  }
  render()
}

function setupInHouseAd(){
  const title = qs("#inhouseAdTitle")
  const body = qs("#inhouseAdBody")
  if(!title || !body) return
  function draw(){
    const pick = INHOUSE_ADS[Math.floor(Math.random() * INHOUSE_ADS.length)]
    title.textContent = pick.title
    body.textContent = pick.body
  }
  draw()
  setInterval(draw, 12000)
}

function setupRequestCall(){
  const submit = qs("#submitRequestCall")
  const form = qs("#requestCallFormWrap")
  const wait = qs("#requestWaitWrap")
  const waitMsg = qs("#requestWaitMessage")
  const waitId = qs("#requestWaitId")
  if(!submit || !form || !wait || !waitMsg || !waitId) return
  submit.addEventListener("click", async ()=>{
    const payload = {
      name: (qs("#reqName")?.value || "").trim(),
      phone: (qs("#reqPhone")?.value || "").trim(),
      email: (qs("#reqEmail")?.value || "").trim(),
      address: (qs("#reqAddress")?.value || "").trim(),
      notes: (qs("#reqNotes")?.value || "").trim(),
      consent: !!qs("#reqConsent")?.checked
    }
    if(!payload.name || !payload.phone || !payload.email || !payload.address || !payload.consent){
      toast("Add name, phone, email, address, and consent.")
      return
    }
    try{
      const r = await fetch("/api/leads/request-call", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      })
      const d = await r.json()
      if(!r.ok || !d.ok){
        toast(`Request failed: ${d.error || "unknown_error"}`)
        return
      }
      localStorage.setItem("lastRequestId", d.request_id || "")
      form.style.display = "none"
      wait.style.display = "block"
      waitMsg.textContent = d.wait_screen_message || "Request received and pending."
      waitId.textContent = `Request ID: ${d.request_id || ""}`
    }catch{
      toast("Request failed: network_error")
    }
  })
}

function setupCashOps(){
  const checkBtn = qs("#cashCheckinBtn")
  const confirmBtn = qs("#cashConfirmBtn")
  if(checkBtn){
    checkBtn.addEventListener("click", async ()=>{
      const payload = {
        request_id: (qs("#cashRequestId")?.value || "").trim(),
        flow_type: (qs("#cashFlowType")?.value || "").trim(),
        location: (qs("#cashLocation")?.value || "").trim(),
        amount: Number(qs("#cashAmount")?.value || 0),
        proof_ref: (qs("#cashProof")?.value || "").trim()
      }
      try{
        const r = await fetch("/api/cash-points/checkin", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Cash Point", `Check-in logged at ${d.logged_at || "now"}`)
        } else {
          openMiniWindow("Cash Point", `Check-in failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Cash Point", "Check-in failed: network_error")
      }
    })
  }
  if(confirmBtn){
    confirmBtn.addEventListener("click", async ()=>{
      const payload = {
        request_id: (qs("#cashRequestId")?.value || "").trim(),
        confirmed_by: (qs("#cashConfirmedBy")?.value || "").trim(),
        received_amount: Number(qs("#cashAmount")?.value || 0),
        memo: (qs("#cashMemo")?.value || "").trim()
      }
      try{
        const r = await fetch("/api/cash-points/confirm-received", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Cash Point", "Funds received confirmed.")
        } else {
          openMiniWindow("Cash Point", `Confirm failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Cash Point", "Confirm failed: network_error")
      }
    })
  }
}

function setupCommunications(){
  const btn = qs("#sendLaunchAlert")
  const checkBalanceBtn = qs("#checkBalanceBtn")
  const reserveMoveBtn = qs("#reserveMoveBtn")
  const newsGuardBtn = qs("#newsGuardBtn")
  const openPreventionOk = qs("#openPreventionOk")
  const balanceView = qs("#commsBalanceView")
  const shopifyGuardView = qs("#shopifyGuardView")
  const shopifyGuardCheck = qs("#shopifyGuardCheck")
  const shopifyGuardNotify = qs("#shopifyGuardNotify")
  const adsGuardBtn = qs("#adsGuardBtn")
  const emitResolverNow = qs("#emitResolverNow")
  const resolverEmitView = qs("#resolverEmitView")
  const startJackpotBuild = qs("#startJackpotBuild")
  const createCompetitionBtn = qs("#createCompetitionBtn")
  const createMovementChallengeBtn = qs("#createMovementChallengeBtn")
  const createCompetitionBtn1v1 = qs("#createCompetitionBtn1v1")

  const walletKey = "supportrdWallet"
  function loadWallet(){
    const w = JSON.parse(localStorage.getItem(walletKey) || "{}")
    return {
      balance: Number(w.balance || 0),
      reserve: Number(w.reserve || 0),
      newsGuard: !!w.newsGuard
    }
  }
  function saveWallet(w){
    localStorage.setItem(walletKey, JSON.stringify(w))
  }
  function drawWallet(){
    if(!balanceView) return
    const w = loadWallet()
    balanceView.textContent = `Balance: $${w.balance.toFixed(2)} · Reserva: $${w.reserve.toFixed(2)}`
    if(newsGuardBtn){
      newsGuardBtn.textContent = `Team Focus Guard: ${w.newsGuard ? "On" : "Off"}`
      newsGuardBtn.classList.toggle("active", w.newsGuard)
    }
  }

  drawWallet()

  async function refreshShopifyGuard(){
    if(!shopifyGuardView) return
    try{
      const r = await fetch("/api/finance/shopify-status")
      const d = await r.json()
      if(!r.ok || !d.ok){
        shopifyGuardView.textContent = `Shopify Guard: ${d.error || "unavailable"}`
        return
      }
      shopifyGuardView.textContent = `Shopify Guard: ${d.risk_level.toUpperCase()} · Today ${d.today_total} ${d.currency} · 7d avg ${d.avg_prev_7d} · Drop ${d.drop_pct}%`
      if(adsGuardBtn){
        adsGuardBtn.textContent = `Ads Safeguard: ${d.money_guard_enabled ? "On" : "Off"}`
        adsGuardBtn.classList.toggle("active", !!d.money_guard_enabled)
      }
    }catch{
      shopifyGuardView.textContent = "Shopify Guard: network_error"
    }
  }

  refreshShopifyGuard()

  if(shopifyGuardCheck){
    shopifyGuardCheck.addEventListener("click", refreshShopifyGuard)
  }
  if(shopifyGuardNotify){
    shopifyGuardNotify.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/finance/notify", {method:"POST"})
        const d = await r.json()
        if(d.ok){
          openMiniWindow("Money Guard", `Alert sent to ${d.sent}/${d.recipients} contacts.`)
        } else {
          openMiniWindow("Money Guard", `Alert failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Money Guard", "Alert failed: network_error")
      }
    })
  }
  if(adsGuardBtn){
    adsGuardBtn.addEventListener("click", async ()=>{
      const currentlyOn = (adsGuardBtn.textContent || "").toLowerCase().includes("on")
      const next = !currentlyOn
      try{
        const r = await fetch("/api/finance/guard-state", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({enabled: next})
        })
        const d = await r.json()
        if(d && d.ok){
          adsGuardBtn.textContent = `Ads Safeguard: ${d.enabled ? "On" : "Off"}`
          adsGuardBtn.classList.toggle("active", !!d.enabled)
          toast(d.enabled ? "Safeguards ON" : "Safeguards OFF")
          refreshShopifyGuard()
        } else {
          toast("Could not change safeguard")
        }
      }catch{
        toast("Could not change safeguard")
      }
    })
  }

  if(checkBalanceBtn){
    checkBalanceBtn.addEventListener("click", ()=>{
      const w = loadWallet()
      drawWallet()
      openMiniWindow("Balance", `Disponible $${w.balance.toFixed(2)} · Reserva $${w.reserve.toFixed(2)}`)
    })
  }
  if(reserveMoveBtn){
    reserveMoveBtn.addEventListener("click", ()=>{
      const w = loadWallet()
      const move = Math.max(0, Math.round((w.balance * 0.1) * 100) / 100)
      if(move <= 0){
        openMiniWindow("Reserva", "No hay balance para mover.")
        return
      }
      w.balance = Math.max(0, w.balance - move)
      w.reserve = w.reserve + move
      saveWallet(w)
      drawWallet()
      openMiniWindow("Reserva", `Movido $${move.toFixed(2)} a reserva.`)
    })
  }
  if(newsGuardBtn){
    newsGuardBtn.addEventListener("click", ()=>{
      const w = loadWallet()
      w.newsGuard = !w.newsGuard
      saveWallet(w)
      drawWallet()
      toast(w.newsGuard ? "Prevencion activa: 100% nosotros intentando" : "Prevencion en pausa")
    })
  }
  if(openPreventionOk){
    openPreventionOk.addEventListener("click", ()=>{
      window.location.href = "/ok"
    })
  }
  if(emitResolverNow){
    emitResolverNow.addEventListener("click", ()=>{
      if(!navigator.geolocation){
        if(resolverEmitView) resolverEmitView.textContent = "Resolver emit: geolocation not supported on this device."
        return
      }
      navigator.geolocation.getCurrentPosition((pos)=>{
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lon = Number(pos.coords.longitude.toFixed(6))
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`
        const geoUrl = `geo:${lat},${lon}`
        if(resolverEmitView){
          resolverEmitView.innerHTML = `Resolver emit live: <a href="${mapsUrl}" target="_blank" rel="noopener">${lat}, ${lon}</a> · <a href="${geoUrl}">Open in phone GPS</a>`
        }
        openMiniWindow("Resolver GPS", "Live location link emitted.")
      }, ()=>{
        if(resolverEmitView) resolverEmitView.textContent = "Resolver emit: location permission denied."
      }, {enableHighAccuracy:true, timeout:7000})
    })
  }

  if(!btn) return
  btn.addEventListener("click", async ()=>{
    const launch_day = (qs("#launchDay")?.value || "").trim()
    const launch_location = (qs("#launchLocation")?.value || "").trim()
    const mission = (qs("#launchMission")?.value || "SupportRD Radio Satellite Mission").trim()
    const notes = (qs("#launchNotes")?.value || "").trim()
    if(!launch_day || !launch_location){
      toast("Add launch day and location")
      return
    }
    try{
      const r = await fetch("/api/admin/alerts/dispatch", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          event_type: "launch_watch",
          priority: "urgent",
          request_id: localStorage.getItem("lastRequestId") || "",
          location: launch_location,
          summary: `${mission} on ${launch_day}. ${notes}`.trim()
        })
      })
      const d = await r.json()
      if(d.ok){
        openMiniWindow("Launch Alert", `Sent to ${d.sent}/${d.recipients} contacts.`)
      }else{
        openMiniWindow("Launch Alert", `Failed: ${d.error || "unknown"}`)
      }
    }catch{
      openMiniWindow("Launch Alert", "Failed: network_error")
    }
  })

  if(startJackpotBuild){
    startJackpotBuild.addEventListener("click", ()=>{
      const titles = [
        "Curly Hair Men Upgrade",
        "Short Nice Hairline Fade",
        "Wavy and Direct",
        "Long Hair Pony Tail",
        "Straight Down",
        "Just Chillen at Home Hair"
      ]
      const pick = titles[Math.floor(Math.random() * titles.length)]
      const post = qs("#postInput")
      if(post){
        post.value = `${pick} · SupportRD attention challenge build starts now. Winner takes the jackpot in 1 hour.`
      }
      const endTs = Date.now() + 60 * 60 * 1000
      localStorage.setItem("jackpotBuildEndTs", String(endTs))
      openMiniWindow("Build Challenge", `${pick} started. 1-hour attention race is live.`)
    })
  }
  if(createCompetitionBtn){
    createCompetitionBtn.addEventListener("click", async ()=>{
      const opponent_url = (qs("#compOpponentUrl")?.value || "").trim()
      const membership_tier = (qs("#compTier")?.value || "premium").trim()
      const out = qs("#competitionResult")
      if(!opponent_url){
        if(out) out.textContent = "Add the other person URL first."
        return
      }
      try{
        const r = await fetch("/api/competitions/create", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({opponent_url, membership_tier})
        })
        const d = await r.json()
        if(d && d.ok){
          if(out) out.textContent = `Competition ready: ${d.challenge_url}`
          openMiniWindow("Competition", "Competition option created and tracked.")
        } else {
          if(d && d.error === "pornography_blocked"){
            openMiniWindow("Competition Rules", "No pornography is allowed in competition links.")
          }
          if(out) out.textContent = `Create failed: ${d.error || "unknown"}`
        }
      }catch{
        if(out) out.textContent = "Create failed: network_error"
      }
    })
  }
  if(createCompetitionBtn1v1){
    createCompetitionBtn1v1.addEventListener("click", async ()=>{
      const raw = (qs("#movementUrls")?.value || "").trim()
      const out = qs("#movementChallengeResult")
      const participant_urls = raw.split(",").map(x=>x.trim()).filter(Boolean)
      if(participant_urls.length < 2){
        if(out) out.textContent = "Add 2 URLs for 1v1."
        return
      }
      try{
        const r = await fetch("/api/competitions/movement-challenge", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({participant_urls: participant_urls.slice(0, 2), mode: "1v1"})
        })
        const d = await r.json()
        if(d && d.ok){
          const metrics = (d.score_metrics || ["laughs","excitement","votes"]).join(", ")
          if(out) out.textContent = `1v1 ready (${d.participants} participants): ${d.challenge_url} · Metrics: ${metrics}`
          openMiniWindow("Movement 1v1", "1v1 challenge created. Scored by laughs, excitement, and votes.")
        } else {
          if(d && d.error === "pornography_blocked"){
            openMiniWindow("Competition Rules", "No pornography is allowed in challenge URLs.")
          }
          if(out) out.textContent = `Create failed: ${d.error || "unknown"}`
        }
      }catch{
        if(out) out.textContent = "Create failed: network_error"
      }
    })
  }
  if(createMovementChallengeBtn){
    createMovementChallengeBtn.addEventListener("click", async ()=>{
      const raw = (qs("#movementUrls")?.value || "").trim()
      const out = qs("#movementChallengeResult")
      if(!raw){
        if(out) out.textContent = "Add 10 participant URLs for 5v5."
        return
      }
      const participant_urls = raw.split(",").map(x=>x.trim()).filter(Boolean)
      try{
        const r = await fetch("/api/competitions/movement-challenge", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({participant_urls: participant_urls.slice(0, 10), mode: "5v5"})
        })
        const d = await r.json()
        if(d && d.ok){
          const metrics = (d.score_metrics || ["laughs","excitement","votes"]).join(", ")
          if(out) out.textContent = `5v5 ready (${d.participants} participants): ${d.challenge_url} · Metrics: ${metrics}`
          openMiniWindow("Movement 5v5", "5v5 challenge created. Scored by laughs, excitement, and votes.")
        } else {
          if(d && d.error === "pornography_blocked"){
            openMiniWindow("Competition Rules", "No pornography is allowed in challenge URLs.")
          }
          if(out) out.textContent = `Create failed: ${d.error || "unknown"}`
        }
      }catch{
        if(out) out.textContent = "Create failed: network_error"
      }
    })
  }
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

function setupAIMillionaireTab(){
  const briefBtn = qs("#aiStartBrief")
  if(briefBtn){
    briefBtn.addEventListener("click", ()=>{
      openMiniWindow("AI Money Paths", "Agency, SaaS, automation, content, and consulting.")
    })
  }
  qsa(".ai-link").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.dataset.aiLink
      const link = AI_LINKS[key]
      if(link){ openLinkModal(link, "AI Millionaire Source") }
    })
  })
}

function setupVRScan(){
  const openBtn = qs("#vrScanBtn")
  const modal = qs("#vrScanModal")
  const close = qs("#closeVrScan")
  const start = qs("#startVrScan")
  const status = qs("#vrScanStatus")

  function reset(){
    if(status) status.textContent = "Ready to scan brochure."
    if(start) start.disabled = false
  }

  if(openBtn){
    openBtn.addEventListener("click", ()=>{
      reset()
      const brochure = qs("#brochureModal")
      if(brochure) brochure.style.display = "none"
      openModal("vrScanModal")
    })
  }
  if(close){
    close.addEventListener("click", ()=>{
      if(modal) modal.style.display = "none"
    })
  }
  if(start){
    start.addEventListener("click", ()=>{
      if(status) status.textContent = "Scanning VR code…"
      start.disabled = true
      setTimeout(()=>{
        if(modal) modal.style.display = "none"
        if(status) status.textContent = "Scan complete. Opening brochure…"
        openModal("brochureModal")
        start.disabled = false
      }, 2200)
    })
  }
}

function setupAdminQuickActions(){
  const seoQuick = qs("#seoQuick")
  const testQuick = qs("#testEmailQuick")
  if(seoQuick){
    seoQuick.addEventListener("click", async ()=>{
      const ok = await setSeoAuto(true)
      if(ok){
        const autoBtn = qs("#seoAuto")
        if(autoBtn){
          autoBtn.classList.add("active")
          autoBtn.textContent = "SEO 4x/Day Active"
        }
        openMiniWindow("SEO Engine", "Random 4x/day schedule activated.")
      }else{
        openMiniWindow("SEO Engine", "Activation failed. Check admin config.")
      }
    })
  }
  if(testQuick){
    testQuick.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/custom-order/test", {method:"POST"})
        const d = await r.json()
        openMiniWindow("Test Email", d.ok ? "Sent to developer inbox." : "Failed to send.")
      }catch{
        openMiniWindow("Test Email", "Failed to send.")
      }
    })
  }
}

function setupCamera(){}

function updateOccasionVisibility(){
  const show = state.subscription !== "free" || isProOverride()
  const menu = qs("#menuOccasion")
  if(menu) menu.style.display = show ? "inline-flex" : "none"
  qsa('[data-app="Occasion Editor"]').forEach(el=>{
    el.style.display = show ? "" : "none"
  })
}

function setDefaultLevelBySubscription(){
  if(state.subscription === 'premium' || state.subscription === 'bingo100' || state.subscription === 'pro' || state.subscription === 'yoda' || state.subscription === 'fantasy300' || state.subscription === 'fantasy600'){
    if(state.ariaLevel === 'greeting'){ state.ariaLevel = 'thorough' }
  } else {
    state.ariaLevel = 'greeting'
  }
  updateOccasionVisibility()
}

function isProOverride(){
  const email = (state.socialLinks && state.socialLinks.email || '').toLowerCase()
  return email === 'agentanthony@supportrd.com'
}

function setupSettings(){
  const saved = JSON.parse(localStorage.getItem("socialLinks") || "{}")
  state.socialLinks = saved
  state.subscription = "free"
  if(isProOverride()) { state.subscription = 'pro'; state.ariaBlocked = false; state.ariaCount = 0; localStorage.setItem('loggedIn','true') }
  setDefaultLevelBySubscription()
  refreshDealUnlock()
  qs("#setName").value = saved.name || ""
  qs("#setEmail").value = saved.email || ""
  qs("#setPhone").value = saved.phone || ""
  qs("#setUsername").value = saved.username || ""
  qs("#setPassword").value = ""
  qs("#setAddress").value = saved.address || ""
  qs("#setSubscription").value = isProOverride() ? "Pro (Admin)" : (saved.subscription || "")
  qs("#setCustomOrder").value = saved.customOrder || ""
  qs("#setEvelyn").value = saved.evelyn || ""
  qs("#setIG").value = saved.ig || ""
  qs("#setTikTok").value = saved.tiktok || ""
  qs("#setFB").value = saved.fb || ""
  qs("#setYT").value = saved.yt || ""
  qs("#setX").value = saved.x || ""
  qs("#setThreads").value = saved.threads || ""
  qs("#setVoiceProfile").value = saved.voiceProfile || "shimmer"
  qs("#setWifeVoiceMode").checked = !!saved.wifeVoiceMode
  qs("#setWifeVoiceConsent").checked = !!saved.wifeVoiceConsent
  qs("#setMuslimGreeting").checked = !!saved.muslimGreeting
  qs("#setCustomGreeting").value = saved.customGreeting || ""
  qs("#setVoiceReference").value = saved.voiceReference || "I went to the park and birds were chirping. Keep this voice warm, calm, and clear when ARIA speaks."
  qs("#setSameFeelVoice").checked = !!saved.sameFeelVoice
  qs("#setVoiceReferencePack").value = saved.voiceReferencePack || ""
  qs("#setThoughtStyle").value = saved.thoughtStyle || "calm, descriptive, warm"
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
        voiceProfile: qs("#setVoiceProfile").value.trim(),
        wifeVoiceMode: qs("#setWifeVoiceMode").checked,
        wifeVoiceConsent: qs("#setWifeVoiceConsent").checked,
        muslimGreeting: qs("#setMuslimGreeting").checked,
        customGreeting: qs("#setCustomGreeting").value.trim(),
        voiceReference: qs("#setVoiceReference").value.trim(),
        sameFeelVoice: qs("#setSameFeelVoice").checked,
        voiceReferencePack: qs("#setVoiceReferencePack").value.trim(),
        thoughtStyle: qs("#setThoughtStyle").value.trim(),
        familyFantasyTheme: (state.socialLinks && state.socialLinks.familyFantasyTheme) ? state.socialLinks.familyFantasyTheme : "boat_conductor",
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
      if(isProOverride()){ state.subscription = 'pro'; state.ariaBlocked = false; state.ariaCount = 0 }
      setDefaultLevelBySubscription()
      refreshDealUnlock()
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
  try{
    const saved = JSON.parse(localStorage.getItem('socialLinks') || '{}')
    if(saved.email && saved.email.toLowerCase() === 'agentanthony@supportrd.com'){
      localStorage.setItem('loggedIn','true')
    }
  }catch{}
  const gate = qs("#loginGate")
  const loginBtn = qs("#loginBtn")
  const logoutBtn = qs("#logoutBtn")
  const signupTop = qs("#signupTop")
  const closeGate = qs("#closeLoginGate")
  const loggedIn = localStorage.getItem("loggedIn") === "true"
  const first = Number(localStorage.getItem("firstSeen") || Date.now())
  if(!localStorage.getItem("firstSeen")) localStorage.setItem("firstSeen", String(first))
  const trialBanner = qs("#trialCodeBanner")
  const trialOverlay = qs("#trialOverlay")
  const trialClose = qs("#trialClose")
  let overlayShowing = false
  function syncTrialOverlay(){
    if(!trialOverlay) return
    const now = Date.now()
    const minutes = (now - first) / 60000
    const dismissed = localStorage.getItem("trialDismissed") === "true"
    const shouldShow = minutes <= 30 && !dismissed && !loggedIn
    if(shouldShow !== overlayShowing){
      trialOverlay.classList.toggle("show", shouldShow)
      overlayShowing = shouldShow
    }
    trialOverlay.setAttribute("aria-hidden", shouldShow ? "false" : "true")
    if(trialBanner){ trialBanner.style.display = shouldShow ? "none" : "block" }
  }
  function syncTrialBanner(){
    if(!trialBanner) return
    const now = Date.now()
    const minutes = (now - first) / 60000
    trialBanner.style.display = minutes <= 30 ? "block" : "none"
  }
  if(trialClose){
    trialClose.addEventListener("click", ()=>{
      localStorage.setItem("trialDismissed", "true")
      syncTrialOverlay()
    })
  }
  function syncLoginUi(isLogged){
    if(gate){ gate.style.display = "none" }
    document.body.classList.toggle("login-active", false)
    if(loginBtn) loginBtn.style.display = isLogged ? "none" : "inline-flex"
    if(signupTop) signupTop.style.display = isLogged ? "none" : "inline-flex"
    if(logoutBtn) logoutBtn.style.display = isLogged ? "inline-flex" : "none"
    const badge = qs("#userBadge")
    if(badge){ badge.style.display = isLogged ? "inline-flex" : "none" }
  }
  syncTrialOverlay()
  syncTrialBanner()
  syncLoginUi(loggedIn)
  setAdminVisibility(false)
  fetch("/api/me").then(r=>r.json()).then(d=>{
    if(d && d.authenticated){
      localStorage.setItem("loggedIn","true")
      syncLoginUi(true)
      const badge = qs("#userBadge")
      const name = d.user && (d.user.name || d.user.nickname || d.user.email) ? (d.user.name || d.user.nickname || d.user.email) : "Logged In"
      if(badge){ badge.textContent = name }
      if(d.subscription){
        state.subscription = d.subscription
        setDefaultLevelBySubscription()
        refreshDealUnlock()
      }
      setAdminVisibility(!!d.admin)
    }
  }).catch(()=>{})
  function openLoginGate(){
    if(gate){ gate.style.display = "flex" }
    document.body.classList.add("login-active")
  }
  function closeLoginGate(){
    if(gate){ gate.style.display = "none" }
    document.body.classList.remove("login-active")
  }
  if(loginBtn){ loginBtn.addEventListener("click", openLoginGate) }
  if(signupTop){ signupTop.addEventListener("click", ()=>{ window.location = "/login?mode=signup" }) }
  if(closeGate){ closeGate.addEventListener("click", closeLoginGate) }
  if(logoutBtn){ logoutBtn.addEventListener("click", ()=>{ window.location = "/logout" }) }

  function completeLogin(){
    localStorage.setItem("loggedIn","true")
    syncLoginUi(true)
  }

  // Provider buttons are plain links to avoid popup blockers.
}

function setupBrochure(){
  const btn = qs("#vrScanBtn")
  const floatBtn = qs("#openBrochureFloat")
  if(btn){ btn.addEventListener("click", ()=>openModal("brochureModal")) }
  if(floatBtn){ floatBtn.addEventListener("click", ()=>openModal("brochureModal")) }
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
  try{
    const r = await fetch("/api/products")
    const items = await r.json()
    return Array.isArray(items) ? items : []
  }catch{
    return []
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
  const handsBtn = qs("#handsfreeToggle")
  let ariaActive = false
  let mediaRecorder = null
  let audioChunks = []
      let chunkCount = 0
  let recStream = null
  let maxRecordTimer = null
  let vadTimer = null
  let liveTranscript = ""
  let transcribeBusy = false
  let transcribeFailures = 0
  function ariaMasterGreeting(){
    const proUnlocked = state.subscription === "pro" || isProOverride()
    const line = proUnlocked ? "How can I serve you master." : "How can I support your hair goals today?"
    const transcriptEl = qs("#ariaTranscript")
    if(transcriptEl){ transcriptEl.textContent = line }
    showSpeechPopup("ARIA", line)
  }

  function syncHandsFree(){
    if(!handsBtn) return
    handsBtn.textContent = handsFreeMode ? "Hands-Free: ON" : "Hands-Free: OFF"
    handsBtn.classList.toggle("active", handsFreeMode)
  }
  if(handsBtn){
    syncHandsFree()
    handsBtn.addEventListener("click", ()=>{
      handsFreeMode = !handsFreeMode
      syncHandsFree()
      if(handsFreeMode && !ariaActive){
        startOpenAIListening()
      }
    })
  }

function uiError(msg){
  if(!msg) return
  if(msg.startsWith("Mic:") || msg.startsWith("Voice error")) return
  if(!SUPPRESS_ERROR_TEXT) toast(msg)
}

  function stopVAD(){
    if(vadTimer){ clearInterval(vadTimer); vadTimer = null }
  }

  function startVAD(stream){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      src.connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      let silenceMs = 0
      let heardSpeech = false
      vadTimer = setInterval(()=>{
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for(let i=0;i<data.length;i++){
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        if(rms > 0.012){
          heardSpeech = true
          silenceMs = 0
        } else if(heardSpeech){
          silenceMs += 150
        }
        if(heardSpeech && silenceMs >= 2000){
          stopOpenAIListening()
        }
      }, 150)
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
  }

  async function transcribeChunk(blob){
    if(transcribeBusy) return
    transcribeBusy = true
    try{
      const form = new FormData()
      form.append("audio", blob, "chunk.webm")
      if(typeof getAriaLang === "function"){ form.append("language", getAriaLang()) }
      const r = await fetch("/api/aria/transcribe", { method:"POST", body: form })
      if(!r.ok){
        let detail = ''
        try{ const d = await r.json(); detail = (d.detail || d.error || '') }catch{}
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failed ' + r.status + (detail ? ' · ' + detail : '')
        return
      }
      if(r.ok){
        transcribeFailures = 0
        const d = await r.json()
        const t = (d.text || "").trim()
        if(t){
          liveTranscript = (liveTranscript + " " + t).trim()
          const transcriptEl = qs("#ariaTranscript")
          if(transcriptEl){ transcriptEl.textContent = liveTranscript }
          showLiveSpeechPopup(liveTranscript)
        }
      }
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
    transcribeBusy = false
  }

  async function stopOpenAIListening(){
    if(maxRecordTimer){ clearTimeout(maxRecordTimer); maxRecordTimer = null }
    stopVAD()
    try{
      if(mediaRecorder && mediaRecorder.state !== "inactive"){
        mediaRecorder.stop()
      }
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
  }

  async function startOpenAIListening(){
    if(ariaActive){
      await stopOpenAIListening()
      return
    }
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      
      return
    }
    if(!window.MediaRecorder){
      
      return
    }
    try{
      startListenLoop()
      setAriaFlow("listening")
      
      liveTranscript = ""
      const reelVid = qs(".reel-embed video")
      if(reelVid){ try{ reelVid.pause() }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    } }

      recStream = await navigator.mediaDevices.getUserMedia({audio:true})
      audioChunks = []
      let chunkCount = 0
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm"
      mediaRecorder = new MediaRecorder(recStream, { mimeType: mime })
      mediaRecorder.ondataavailable = (e)=>{
        if(e.data && e.data.size){
          audioChunks.push(e.data)
          chunkCount++
          transcribeChunk(e.data)
        }
      }
      mediaRecorder.onerror = ()=>{  }
      mediaRecorder.onstop = async ()=>{
        ariaActive = false
        if(reelVid){ try{ reelVid.play() }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    } }
        if(!chunkCount){  setAriaFlow('idle'); stopListenLoop(); return }
        const blob = new Blob(audioChunks, {type: "audio/webm"})
        if(recStream){ recStream.getTracks().forEach(t=>t.stop()) }
        try{
          setAriaFlow("processing")
          const form = new FormData()
          form.append("audio", blob, "speech.webm")
          form.append("language", getAriaLang())
          const r = await fetch("/api/aria/transcribe", { method:"POST", body: form })
          if(!r.ok){
            let detail = ''
            try{ const dErr = await r.json(); detail = (dErr.detail || dErr.error || '') }catch{}
            throw new Error(detail || 'transcribe failed')
          }
          const d = await r.json()
          const transcript = (d.text || "").trim() || liveTranscript
          const transcriptEl = qs("#ariaTranscript")
          if(transcriptEl){ transcriptEl.textContent = transcript || "No speech detected." }
          finalizeLiveSpeechPopup()
          if(transcript){
            stopListenLoop()
            setTimeout(async ()=>{
              await askAria(transcript)
              if(handsFreeMode){ setTimeout(()=>{ startOpenAIListening() }, 900) }
            }, 2000)
          } else {
            setAriaFlow("idle")
            stopListenLoop()
            if(handsFreeMode){ setTimeout(()=>{ startOpenAIListening() }, 900) }
          }
        }catch(err){
          uiError("Voice error: " + (err && err.message ? err.message : "could not transcribe"))
          setAriaFlow("idle")
          stopListenLoop()
        }
      }
      try{ mediaRecorder.start(600) }catch{ mediaRecorder.start() }
      ariaActive = true
      startVAD(recStream)
      maxRecordTimer = setTimeout(()=>{ stopOpenAIListening() }, 12000)
    }catch{
      
      setAriaFlow("idle")
      stopListenLoop()
    }
  }

  if(btn){ btn.addEventListener("click", ()=>{ ariaMasterGreeting(); startOpenAIListening() }) }
  if(sphere){
    sphere.classList.add("aria-pulse")
    sphere.addEventListener("click", ()=>{ ariaMasterGreeting(); startOpenAIListening() })
  }
  window.startAriaListening = startOpenAIListening
  window.askAriaDirect = askAria
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
    const side = qs("#levelSide")
    if(ring){
      ring.addEventListener("click", ()=>{
        levels.style.display = levels.style.display === "none" ? "block" : "none"
        if(side){ side.classList.toggle('show') }
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
    body.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">SupportRD Products</div>
      <div style="color:var(--muted);margin-bottom:10px;">Browse the lineup, open My Orders, and checkout fast with Shopify cart.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <button class="btn" id="openMyOrders">Open My Orders</button>
        <button class="btn ghost" id="openShopifyCart">Open Shopify Cart</button>
      </div>
      <div class="gift-grid" style="margin-bottom:10px;">
        <div class="gift-card"><div style="font-weight:700;">Bingo Fantasy</div><div class="gift-price">$100 / month</div><button class="btn ghost" id="buyBingo100">Checkout</button></div>
        <div class="gift-card"><div style="font-weight:700;">Family Fantasy</div><div class="gift-price">$200 / month</div><button class="btn ghost" id="buyFamily200">Checkout</button></div>
        <div class="gift-card"><div style="font-weight:700;">Basic Fantasy 21+</div><div class="gift-price">$300 / month</div><button class="btn ghost" id="buyFantasy300">Checkout</button></div>
        <div class="gift-card"><div style="font-weight:700;">Advanced Fantasy 21+</div><div class="gift-price">$600 / month</div><button class="btn ghost" id="buyFantasy600">Checkout</button></div>
      </div>
      <div id="shopifyLineup" class="gift-grid"></div>
      <button class="btn" id="openCustomShop">Open Custom Order</button>`
    qs("#openMyOrders").addEventListener("click", ()=>openLinkModal(LINKS.myOrders, "My Orders"))
    qs("#openShopifyCart").addEventListener("click", ()=>openLinkModal(LINKS.cart, "Shopify Cart"))
    qs("#buyBingo100").addEventListener("click", ()=>openLinkModal(LINKS.bingo100, "Bingo Fantasy"))
    qs("#buyFamily200").addEventListener("click", ()=>openLinkModal(LINKS.family200, "Family Fantasy"))
    qs("#buyFantasy300").addEventListener("click", ()=>openLinkModal(LINKS.fantasy300, "Basic Fantasy 21+"))
    qs("#buyFantasy600").addEventListener("click", ()=>openLinkModal(LINKS.fantasy600, "Advanced Fantasy 21+"))
    qs("#openCustomShop").addEventListener("click", ()=>openLinkModal(LINKS.custom, "Custom Order"))
    loadProducts().then(items=>{
      const fallback = [
        {title:"Shampoo Aloe Vera", price:"20"},
        {title:"Formula Exclusiva", price:"55"},
        {title:"Laciador Crece", price:"40"},
        {title:"Mascarilla Capilar", price:"25"},
        {title:"Gotero Rapido", price:"55"},
        {title:"Gotitas Brillantes", price:"30"}
      ]
      const list = items.length ? items : fallback
      const wrap = qs("#shopifyLineup")
      if(!wrap) return
      wrap.innerHTML = list.map(p=>`<div class="gift-card"><div style="font-weight:700;">${p.title}</div><div class="gift-price">$${p.price}</div></div>`).join("")
    })
    return
  }
  if(name === "Subscription Banner"){
    body.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">Subscription Banner</div>
      <div style="color:var(--muted);margin-bottom:10px;">Current plan: <strong>${state.subscription.toUpperCase()}</strong></div>
      <div class="gift-grid">
        <div class="gift-card"><div style="font-weight:700;">Premium</div><div class="gift-price">$35 / month</div></div>
        <div class="gift-card"><div style="font-weight:700;">Professional</div><div class="gift-price">$50 / month</div></div>
        <div class="gift-card"><div style="font-weight:700;">Bingo Fantasy</div><div class="gift-price">$100 / month</div></div>
        <div class="gift-card"><div style="font-weight:700;">Family Fantasy</div><div class="gift-price">$200 / month</div></div>
        <div class="gift-card"><div style="font-weight:700;">Basic Fantasy 21+</div><div class="gift-price">$300 / month</div></div>
        <div class="gift-card"><div style="font-weight:700;">Advanced Fantasy 21+</div><div class="gift-price">$600 / month</div></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn" id="openSubscriptionBanner">Open Subscription</button>
        <button class="btn ghost" id="openOrdersBanner">My Orders</button>
        <button class="btn ghost" id="openCartBanner">Shopify Cart</button>
      </div>`
    qs("#openSubscriptionBanner").addEventListener("click", ()=>openModal("subscriptionModal"))
    qs("#openOrdersBanner").addEventListener("click", ()=>openLinkModal(LINKS.myOrders, "My Orders"))
    qs("#openCartBanner").addEventListener("click", ()=>openLinkModal(LINKS.cart, "Shopify Cart"))
    return
  }
  if(name === "AI Millionaire Hub"){
    body.innerHTML = `
      <div style="font-weight:700;margin-bottom:8px;">AI Millionaire Source Hub</div>
      <div style="color:var(--muted);margin-bottom:10px;">Use these links to curate daily AI wealth content.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        <button class="btn ghost" id="aiHubStack">Best AI Stack 2026</button>
        <button class="btn ghost" id="aiHubStories">AI Millionaire Stories</button>
      </div>
      <div class="mini-list">Daily cadence: story · tool stack · tutorial · CTA to premium.</div>
    `
    qs("#aiHubStack").addEventListener("click", ()=>openLinkModal(AI_LINKS.best_ai_2026, "Best AI Tools 2026"))
    qs("#aiHubStories").addEventListener("click", ()=>openLinkModal(AI_LINKS.ai_millionaire, "AI Millionaire Stories"))
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
    "Contact Anthony · Family Support",
    "Shopify Products",
    "SEO Engine Viewer",
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
    card.dataset.app = name.replace(" · Family Support","Contact Anthony")
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
      try{
        payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}")
      }catch{
        payload = {}
      }
      if(!payload.app) return
      if(payload.source === "row" && dragEl && dragEl !== card && card.parentElement === row){
        const draggedNext = dragEl.nextSibling
        const targetNext = card.nextSibling
        const dragBeforeTarget = draggedNext === card
        if(dragBeforeTarget){
          row.insertBefore(card, dragEl)
        } else {
          row.insertBefore(dragEl, targetNext)
          row.insertBefore(card, draggedNext)
        }
        toast("Apps swapped")
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
  try{ var d=document.getElementById('debugClick'); if(d) d.textContent='App init start'; }catch{}
  window.__appInit = true;
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
  safe(setupAccessibilityMode)
  safe(setupAdult21Mode)
  safe(setupCampaign)
  safe(setupInHouseAd)
  safe(setupRequestCall)
  safe(setupThemeArrows)
  safe(setupModals)
  safe(setupPaymentChooser)
  safe(setupSettings)
  safe(setupPostActions)
  safe(setupOccasion)
  safe(setupMarinationTimer)
  safe(setupScanUpload)
  safe(setupProfileUpload)
  safe(setupHairAnalysis)
  safe(setupGPS)
  safe(setupAria)
  safe(setupPuzzle)
  safe(setupSEOLogs)
  safe(setupCredit)
  safe(setupCashOps)
  safe(setupCommunications)
  safe(setupReel)
  safe(setupAIMillionaireTab)
  safe(setupAdminQuickActions)
  safe(setupVRScan)
  safe(setupBrochure)
  safe(setupPwa)
    safe(setupFamilyMode)
    safe(initHairScore)
    safe(setupAppsDock)
  safe(setupLoginGate)
  safe(loadProducts)
  safe(setupMiniWindow)
  safe(setupLevelSelect)
  safe(wireAllButtons)
  safe(setupInfoTray)
  safe(watchTranscriptErrors)

  // Fallback: open any data-link button
  try{ var d=document.getElementById('debugClick'); if(d) d.textContent='App init done'; }catch{}

  document.body.addEventListener("click", (e)=>{
    const el = e.target.closest("[data-link]")
    if(el && el.dataset.link){
      openLinkModal(el.dataset.link, "SupportRD Link")
    }
  })
})
