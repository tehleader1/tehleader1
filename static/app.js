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
  custom: "https://shop.supportrd.com/collections/all",
  diaryLive: "https://shop.supportrd.com/products/supportrd-diary-live",
  marketSignals: "https://shop.supportrd.com/products/supportrd-market-signals",
  studioJake: "https://shop.supportrd.com/products/jake-in-the-studio-studio-tier-professional-studio-account"
}
const PLAN_MEDIA = {
  premium: {title:"ARIA Puzzle Tier", price:"$35/mo", image:"/static/images/brochure-shampoo.jpg", desc:"Puzzle unlocks + guided routine depth.", link:LINKS.premium},
  pro: {title:"Unlimited ARIA Professional", price:"$50/mo", image:"/static/images/brochure-hero.jpg", desc:"Unlimited responses + pro-level support lane.", link:LINKS.pro},
  bingo100: {title:"Bingo Fantasy", price:"$100/mo", image:"/static/images/brochure-social.jpg", desc:"Chill narrative mode with humor and confidence.", link:LINKS.bingo100},
  family200: {title:"Family Fantasy Pack", price:"$200/mo", image:"/static/images/brochure-contacts.jpg", desc:"Family-safe themed coaching and style prep.", link:LINKS.family200},
  fantasy300: {title:"21+ Basic Fantasy", price:"$300/mo", image:"/static/images/brochure-bright-droplets.jpg", desc:"Playful 21+ tone in a hair-first experience.", link:LINKS.fantasy300},
  fantasy600: {title:"21+ Advanced Fantasy", price:"$600/mo", image:"/static/images/brochure-fast-dropper.jpg", desc:"Premium emotional narrative with advanced tone.", link:LINKS.fantasy600},
  yoda: {title:"Yoda Pass", price:"$20/mo", image:"/static/images/brochure-lacceador.jpg", desc:"Focused builder mode for consistent progress.", link:LINKS.yoda}
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
    adult21: false,
    simpleView: true
}

const PROHIBITED_TERMS = ["drug","drugs","cocaine","meth","weed","marijuana","heroin","fentanyl","gang","gangs","cartel","crip","bloods","ms-13"]
const PROFILE_SCAN_KEY = "supportRdProfileScanState"
const DIARY_SESSION_KEY = "supportRdDiaryApiSession"
const LIVE_SIGNALS_DISCORD = "antonioxz1234"

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
    const label = String(btn.dataset.info || btn.textContent || "Info").trim()
    if(label === "ARIA"){
      const tab = qs('.tab-btn[data-tab="aria"]')
      if(tab){ tab.click() }
      openMiniWindow("ARIA", "ARIA is ready. Tap ARIA • Tap to Talk, then ask your hair question.")
      return
    }
    if(label === "Brochure"){
      openModal("brochureModal")
      openMiniWindow("Brochure", "Full brochure opened.")
      return
    }
    if(label === "Click the 3 buttons to download the app"){
      const installBtn = qs("#installBtn")
      if(installBtn && getComputedStyle(installBtn).display !== "none"){
        installBtn.click()
      }
      openMiniWindow("Download App", "Click: 1) ARIA, 2) Brochure, 3) Install + Subscribe or browser menu > Add to Home screen.")
      return
    }
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

function activateTab(id){
  const panel = qs(`#tab-${id}`)
  if(!panel) return
  const targetBtn = qs(`.tab-btn[data-tab="${id}"]`)
  qsa(".tab-btn").forEach(btn=>btn.classList.toggle("active", btn === targetBtn))
  qsa(".tab-panel").forEach(p=>p.classList.toggle("active", p === panel))
}

function openBlogLane(index = 0){
  state.blogIndex = Math.max(0, Math.min(BLOG_POSTS.length - 1, Number(index) || 0))
  renderBlog()
  openModal("blogModal")
}

function openWebcamLane(){
  activateTab("analysis")
  const transcript = qs("#ariaTranscript")
  const result = qs("#analysisResult")
  const title = qs("#assistantLargeTitle")
  if(title){ title.textContent = "ARIA Webcam Chat" }
  if(transcript){ transcript.textContent = "ARIA webcam lane ready. Tap to talk or run a scan when you catch the curve." }
  if(result){ result.textContent = "Webcam scan lane armed. Hold steady, then start when you want the clean read." }
  const center = qs("#centerStage")
  if(center){ center.scrollIntoView({behavior:"smooth", block:"start"}) }
}

function openSimpleLane(lane){
  if(lane === "support"){
    renderApp("Shopify Products")
    openModal("appModal")
    return
  }
  const body = qs("#appBody")
  if(!body) return
  if(lane === "plant"){
    body.innerHTML = `
      <div class="system-card glass">
        <div class="system-head">
          <div>
            <div class="system-title">ThePlantManInc. Lane</div>
            <div class="system-sub">Simple plant dropship lane prepared inside the same trusted Shopify system.</div>
          </div>
          <span class="system-badge">Pending Link</span>
        </div>
        <div class="mini-list">Status: waiting for the dedicated Shopify collection or product link for ThePlantManInc.</div>
        <div class="mini-list">Current fallback: SupportRD Shopify store stays available so the lane never feels dead.</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <button class="btn" id="openPlantFallback">Open Shopify Store</button>
          <button class="btn ghost" id="openPlantBlog">Open Blog Page</button>
        </div>
      </div>
    `
    const openPlantFallback = qs("#openPlantFallback")
    const openPlantBlog = qs("#openPlantBlog")
    if(openPlantFallback){ openPlantFallback.addEventListener("click", ()=>openLinkModal(LINKS.custom, "ThePlantManInc. Shopify Fallback")) }
    if(openPlantBlog){ openPlantBlog.addEventListener("click", ()=>openBlogLane(0)) }
    openModal("appModal")
    return
  }
  if(lane === "signals"){
    body.innerHTML = `
      <div class="system-card glass">
        <div class="system-head">
          <div>
            <div class="system-title">Laser Charts Premium Lane</div>
            <div class="system-sub">Premium signals lane prepared for Shopify checkout with clean routing into the market system.</div>
          </div>
          <span class="system-badge">Premium</span>
        </div>
        <div class="mini-list">Current live bridge: SupportRD premium and pro products can already represent the premium digital checkout lane.</div>
        <div class="mini-list">Pending inputs still remembered: custom email, Cash App, Venmo, Telegram, and dedicated Shopify checkout naming.</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
          <button class="btn" id="openSignalsPremium">Open Premium Product</button>
          <button class="btn ghost" id="openSignalsPro">Open Pro Product</button>
        </div>
      </div>
    `
    const openSignalsPremium = qs("#openSignalsPremium")
    const openSignalsPro = qs("#openSignalsPro")
    if(openSignalsPremium){ openSignalsPremium.addEventListener("click", ()=>openLinkModal(LINKS.premium, "Laser Charts Premium Lane")) }
    if(openSignalsPro){ openSignalsPro.addEventListener("click", ()=>openLinkModal(LINKS.pro, "Laser Charts Pro Lane")) }
    openModal("appModal")
  }
}

function setupSimpleView(){
  const btn = qs("#simpleUiToggle")
  if(!btn) return
  const saved = localStorage.getItem("supportRdSimpleView")
  state.simpleView = saved === null ? true : saved === "true"
  const apply = ()=>{
    document.body.classList.toggle("simple-view", state.simpleView)
    btn.textContent = `Simple View: ${state.simpleView ? "On" : "Off"}`
  }
  apply()
  btn.addEventListener("click", ()=>{
    state.simpleView = !state.simpleView
    localStorage.setItem("supportRdSimpleView", String(state.simpleView))
    apply()
  })
}

function setupSimpleFlow(){
  const bindClick = (id, handler)=>{
    const el = qs(`#${id}`)
    if(el){ el.addEventListener("click", handler) }
  }
  const scrollShopifyFlow = ()=>{
    const section = qs("#simpleShopifyLanes")
    if(section){ section.scrollIntoView({behavior:"smooth", block:"start"}) }
  }
  bindClick("menuBlogTop", ()=>openBlogLane(0))
  bindClick("simpleBlogBtn", ()=>openBlogLane(0))
  bindClick("remoteBlogBtn", ()=>openBlogLane(0))
  bindClick("menuWebcamTop", openWebcamLane)
  bindClick("simpleWebcamBtn", openWebcamLane)
  bindClick("remoteWebcamBtn", openWebcamLane)
  bindClick("menuShopifyFlow", scrollShopifyFlow)
  bindClick("remoteShopifyBtn", scrollShopifyFlow)
  bindClick("supportLaneBtn", ()=>openSimpleLane("support"))
  bindClick("supportLaneRoute", ()=>openLinkModal(LINKS.custom, "SupportRD Shopify Store"))
  bindClick("plantLaneBtn", ()=>openSimpleLane("plant"))
  bindClick("plantLaneRoute", ()=>openSimpleLane("plant"))
  bindClick("signalsLaneBtn", ()=>openSimpleLane("signals"))
  bindClick("signalsLaneRoute", ()=>openSimpleLane("signals"))
  const voice = qs("#voiceToggle")
  const scan = qs("#startHairScan")
  if(voice){ voice.textContent = "ARIA Webcam Chat" }
  if(scan){ scan.textContent = "Open Webcam Scan" }
}

function setupDiaryOwnerPayments(){
  const fields = {
    type: qs("#floatOwnerPayoutType"),
    bank: qs("#floatOwnerBankName"),
    accountName: qs("#floatOwnerAccountName"),
    routing: qs("#floatOwnerRouting"),
    accountNumber: qs("#floatOwnerAccountNumber"),
    email: qs("#floatOwnerPayoutEmail")
  }
  const saveBtn = qs("#floatOwnerPaySaveBtn")
  const useProfileBtn = qs("#floatOwnerPayUseProfileBtn")
  const status = qs("#floatOwnerPayStatus")
  const visitsCount = qs("#floatDiaryGroupVisitsCount")
  const visitsMeta = qs("#floatDiaryGroupVisitsMeta")
  const supportTotal = qs("#floatDiarySupportTotal")
  const supportMeta = qs("#floatDiarySupportMeta")
  const remoteVisits = qs("#remoteDiaryViewerGroupVisits")
  const liveComments = qs("#floatDiaryLiveComments")
  const remoteComments = qs("#remoteDiaryViewerComments")
  const commentBtn = qs("#floatDiaryLiveCommentBtn")
  const supportBtn = qs("#remoteDiaryViewerSupportNow")
  const payBtn = qs("#remoteDiaryViewerGuestPay")
  const fastPayBtn = qs("#floatDiaryLiveFastPay")
  const heartBtn = qs("#floatDiaryLiveHeart")
  const thumbBtn = qs("#floatDiaryLiveThumb")
  const guestName = qs("#floatDiaryLiveGuest")
  const guestComment = qs("#floatDiaryLiveComment")
  const remoteGuestName = qs("#remoteDiaryViewerGuestName")
  const remoteGuestComment = qs("#remoteDiaryViewerGuestComment")
  const remotePostComment = qs("#remoteDiaryViewerPostComment")
  if(!saveBtn || !status) return

  const payoutKey = "supportRdOwnerPayout"
  const statsKey = "supportRdDiaryFeedStats"

  function readPayout(){
    try{ return JSON.parse(localStorage.getItem(payoutKey) || "{}") }catch{ return {} }
  }
  function readStats(){
    try{
      return {
        visits: 0,
        support: 0,
        groups: [],
        comments: [],
        ...JSON.parse(localStorage.getItem(statsKey) || "{}")
      }
    }catch{
      return {visits:0, support:0, groups:[], comments:[]}
    }
  }
  function saveStats(data){
    localStorage.setItem(statsKey, JSON.stringify(data))
  }
  function renderPayout(){
    const payout = readPayout()
    if(fields.type && payout.type){ fields.type.value = payout.type }
    if(fields.bank){ fields.bank.value = payout.bank || "" }
    if(fields.accountName){ fields.accountName.value = payout.accountName || "" }
    if(fields.routing){ fields.routing.value = payout.routing || "" }
    if(fields.accountNumber){ fields.accountNumber.value = payout.accountNumber || "" }
    if(fields.email){ fields.email.value = payout.email || ((state.socialLinks && state.socialLinks.email) || "") }
    const hasSaved = payout.accountNumber || payout.routing || payout.email
    status.textContent = hasSaved
      ? `Saved ${payout.type || "payout"} lane for ${payout.accountName || "owner"} · ${payout.bank || "bank pending"}`
      : "Owner payment details are not saved yet."
  }
  function renderStats(){
    const stats = readStats()
    const groups = Array.isArray(stats.groups) ? stats.groups.slice(-3) : []
    if(visitsCount){ visitsCount.textContent = `${Math.max(0, Number(stats.visits) || 0)} active` }
    if(visitsMeta){
      visitsMeta.textContent = groups.length
        ? `Latest group visits: ${groups.join(" · ")}`
        : "No live groups yet. When traffic stacks up, the counter locks here."
    }
    if(supportTotal){ supportTotal.textContent = `$${Number(stats.support || 0).toFixed(2)}` }
    if(supportMeta){
      supportMeta.textContent = (stats.support || 0) > 0
        ? `Support is building from hearts, comments, and paid feed taps.`
        : "Support and paid comments build in real time during the live session."
    }
    if(remoteVisits){
      remoteVisits.textContent = `Group visits: ${Math.max(0, Number(stats.visits) || 0)} active · Support: $${Number(stats.support || 0).toFixed(2)} · ${groups.length ? `Latest groups: ${groups.join(" · ")}` : "Waiting for the next stack of live visitors."}`
    }
    const recentComments = (Array.isArray(stats.comments) ? stats.comments : []).slice(-6).reverse()
    const commentMarkup = recentComments.length
      ? recentComments.map(item => `<div><strong>${item.name}</strong> · ${item.comment}</div>`).join("")
      : "Live comments will appear here when the session starts."
    if(liveComments){ liveComments.innerHTML = commentMarkup }
    if(remoteComments){ remoteComments.innerHTML = commentMarkup }
  }
  function pushVisit(label, amount = 0){
    const stats = readStats()
    stats.visits = Math.max(0, Number(stats.visits) || 0) + 1
    stats.support = Math.max(0, Number(stats.support) || 0) + amount
    if(label){
      stats.groups = Array.isArray(stats.groups) ? stats.groups : []
      stats.groups.push(label)
      stats.groups = stats.groups.slice(-8)
    }
    saveStats(stats)
    renderStats()
  }
  function pushComment(name, comment){
    const trimmedName = String(name || "Guest").trim() || "Guest"
    const trimmedComment = String(comment || "").trim()
    if(!trimmedComment) return
    const stats = readStats()
    stats.visits = Math.max(0, Number(stats.visits) || 0) + 1
    stats.comments = Array.isArray(stats.comments) ? stats.comments : []
    stats.comments.push({name: trimmedName, comment: trimmedComment})
    stats.comments = stats.comments.slice(-24)
    stats.groups = Array.isArray(stats.groups) ? stats.groups : []
    stats.groups.push(`${trimmedName} joined`)
    stats.groups = stats.groups.slice(-8)
    saveStats(stats)
    renderStats()
  }

  saveBtn.addEventListener("click", ()=>{
    const payout = {
      type: fields.type ? fields.type.value : "debit_card",
      bank: fields.bank ? fields.bank.value.trim() : "",
      accountName: fields.accountName ? fields.accountName.value.trim() : "",
      routing: fields.routing ? fields.routing.value.trim() : "",
      accountNumber: fields.accountNumber ? fields.accountNumber.value.trim() : "",
      email: fields.email ? fields.email.value.trim() : ""
    }
    localStorage.setItem(payoutKey, JSON.stringify(payout))
    state.socialLinks = state.socialLinks || {}
    state.socialLinks.ownerPayout = payout
    localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
    renderPayout()
    toast("Owner payment lane saved")
  })
  if(useProfileBtn){
    useProfileBtn.addEventListener("click", ()=>{
      if(fields.email){ fields.email.value = ((state.socialLinks && state.socialLinks.email) || "").trim() }
      renderPayout()
    })
  }
  if(commentBtn){
    commentBtn.addEventListener("click", ()=>{
      pushComment(guestName && guestName.value, guestComment && guestComment.value)
      if(guestComment){ guestComment.value = "" }
    })
  }
  if(remotePostComment){
    remotePostComment.addEventListener("click", ()=>{
      pushComment(remoteGuestName && remoteGuestName.value, remoteGuestComment && remoteGuestComment.value)
      if(remoteGuestComment){ remoteGuestComment.value = "" }
    })
  }
  if(heartBtn){ heartBtn.addEventListener("click", ()=>pushVisit("heart reaction", 10)) }
  if(thumbBtn){ thumbBtn.addEventListener("click", ()=>pushVisit("thumbs up", 5)) }
  if(fastPayBtn){ fastPayBtn.addEventListener("click", ()=>pushVisit("fast pay tap", 25)) }
  if(payBtn){ payBtn.addEventListener("click", ()=>pushVisit("guest pay", 35)) }
  if(supportBtn){ supportBtn.addEventListener("click", ()=>pushVisit("support feed", 20)) }
  renderPayout()
  renderStats()
}

function setupMobileZoom(){
  const dock = qs("#mobileZoomDock")
  const fitBtn = qs("#mobileZoomOutBtn")
  const resetBtn = qs("#mobileZoomResetBtn")
  const readBtn = qs("#mobileZoomInBtn")
  const status = qs("#mobileZoomStatus")
  if(!dock || !fitBtn || !resetBtn || !readBtn || !status) return
  const key = "supportRdMobileScale"

  function applyScale(scale, label){
    const numeric = Math.max(0.72, Math.min(1, Number(scale) || 1))
    document.documentElement.style.setProperty("--mobile-scale", String(numeric))
    document.body.classList.toggle("mobile-overview", numeric < 0.99 && window.innerWidth <= 700)
    localStorage.setItem(key, String(numeric))
    status.textContent = label || (numeric < 0.99 ? `Mobile fit ${Math.round(numeric * 100)}%` : "Mobile reading view")
  }
  function bootScale(){
    if(window.innerWidth > 700){
      document.body.classList.remove("mobile-overview")
      document.documentElement.style.setProperty("--mobile-scale", "1")
      status.textContent = "Desktop view ready"
      return
    }
    const saved = Number(localStorage.getItem(key) || 0)
    if(saved){
      applyScale(saved, saved < 0.99 ? `Mobile fit ${Math.round(saved * 100)}%` : "Mobile reading view")
      return
    }
    applyScale(0.82, "Mobile fit 82%")
  }

  fitBtn.addEventListener("click", ()=>applyScale(0.78, "Mobile fit 78%"))
  resetBtn.addEventListener("click", ()=>applyScale(0.88, "Mobile fit 88%"))
  readBtn.addEventListener("click", ()=>applyScale(1, "Mobile reading view"))
  window.addEventListener("resize", bootScale)
  bootScale()
}

function setupStudioFlow(){
  const stage = qs("#remoteStudioStage")
  const iframe = qs("#remoteStudioStageIframe")
  const overlay = qs("#remoteStudioStageOverlay")
  const status = qs("#remoteStudioStageStatus")
  if(!stage || !iframe || !overlay || !status) return

  let studioRequested = false

  function ensureStudioLoaded(){
    if(!iframe.getAttribute("src")){
      const src = iframe.dataset.src || "/static/studio/index.html?v=20260414t"
      iframe.setAttribute("src", src)
    }
  }

  function setStudioActive(active){
    stage.classList.toggle("is-live", !!active)
    document.body.classList.toggle("remote-studio-live", !!active)
  }

  function openStudio(reason){
    studioRequested = true
    ensureStudioLoaded()
    overlay.style.display = "none"
    setStudioActive(true)
    status.textContent = reason || "Studio is live in the main Remote flow now."
    stage.scrollIntoView({behavior:"smooth", block:"start"})
  }

  function resetStudio(reason){
    setStudioActive(false)
    status.textContent = reason || "Studio is standing by inside the main Remote flow."
    overlay.style.display = ""
  }

  const bindStudioOpen = (id, reason)=>{
    const el = qs(`#${id}`)
    if(el){
      el.addEventListener("click", ()=>{
        openStudio(reason)
      })
    }
  }

  bindStudioOpen("remotePurchaseStudio", "Remote promoted Studio into the full-width main view.")
  bindStudioOpen("remoteStudioStageOpen", "Studio opened in full view from the main Remote stage.")
  bindStudioOpen("remoteStudioStageFocus", "Studio is now the focus of the main Remote presentation.")
  bindStudioOpen("openProJakeStudio", "Jake handoff sent you into the full Studio booth view.")
  bindStudioOpen("floatStudioLiveBtn", "Quick Studio panel promoted the full booth into the main Remote flow.")
  bindStudioOpen("shellV2GoStudio", "SupportRD shell moved you into the full Studio panel.")
  bindStudioOpen("shellV2StudioLaunch", "SupportRD shell launched the full Studio panel.")
  bindStudioOpen("supportrdOSOpenStudio", "Operating system view promoted the Studio workspace into the main Remote flow.")
  bindStudioOpen("openStudioTop", "Top Studio route promoted the full booth into the main Remote flow.")

  const focusStudio = qs("#supportrdOSFocusStudio")
  if(focusStudio){
    focusStudio.addEventListener("click", ()=>{
      ensureStudioLoaded()
      stage.scrollIntoView({behavior:"smooth", block:"start"})
      status.textContent = "Studio is centered in the Remote view and ready to be opened full-size."
    })
  }

  const exitBtn = qs("#studioExitBtn")
  if(exitBtn){
    exitBtn.addEventListener("click", ()=>{
      stage.scrollIntoView({behavior:"smooth", block:"start"})
      resetStudio("Studio exited. You are back in the main Remote presentation lane.")
    })
  }

  const observer = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        ensureStudioLoaded()
        if(studioRequested){
          overlay.style.display = "none"
          setStudioActive(true)
        }
      }
    })
  }, {
    rootMargin: "220px 0px 220px 0px",
    threshold: 0.2
  })

  observer.observe(stage)
}

function setupFinishedShellPreview(){
  const status = qs("#finishedShellPreviewStatus")
  const targets = {
    launch: { selector: "#launchMenu", before: el=>el.classList.remove("hide"), label: "Boot menu" },
    shopify: { selector: "#simpleShopifyLanes", label: "Shopify flow" },
    diary: { selector: "#remoteDiaryLobby", label: "Diary live" },
    studio: { selector: "#remoteStudioStage", label: "Studio full view" },
    profile: { selector: '[data-shell-v2-panel="profile"]', label: "Profile module" },
    faq: { selector: '[data-shell-v2-panel="faq"]', label: "FAQ lounge" },
    payments: { selector: '[data-shell-v2-panel="payments"]', label: "Payments lane" }
  }
  qsa("[data-shell-preview-target]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.dataset.shellPreviewTarget
      const route = targets[key]
      if(!route) return
      const el = qs(route.selector)
      if(!el){
        if(status) status.textContent = `${route.label} is not available in this build yet.`
        return
      }
      if(typeof route.before === "function") route.before(el)
      el.scrollIntoView({behavior:"smooth", block:"start"})
      if(status) status.textContent = `${route.label} is in view. This is part of the finished shell preview.`
    })
  })
}

function setupCoreCommandDeck(){
  const bootBadge = qs("#coreBootBadge")
  const bootStatus = qs("#coreBootStatus")
  const viewStatus = qs("#coreViewStatus")
  const loginStatus = qs("#coreLoginStatus")
  const shopifyStatus = qs("#coreShopifyStatus")
  const launchMenu = qs("#launchMenu")
  const launchPanel = qs("#launchPanel")
  const installBtn = qs("#installBtn")
  const shopifyBadge = qs("#shopifyConnectorBadge")

  const update = ()=>{
    const launchVisible = !!(launchMenu && getComputedStyle(launchMenu).display !== "none")
    const launchOpen = !!(launchPanel && launchPanel.classList.contains("show"))
    const isLogged = localStorage.getItem("loggedIn") === "true"
    const simpleView = document.body.classList.contains("simple-view")
    if(bootBadge) bootBadge.textContent = launchOpen ? "Boot Open" : (launchVisible ? "Ready" : "Live")
    if(bootStatus) bootStatus.textContent = launchOpen ? "Launch panel is open." : "Launch menu is standing by."
    if(viewStatus) viewStatus.textContent = simpleView ? "Simple View active." : "Full View active."
    if(loginStatus) loginStatus.textContent = isLogged ? "Logged in and recognized." : "Guest mode until login."
    if(shopifyStatus){
      const badgeText = shopifyBadge ? (shopifyBadge.textContent || "Connector waiting...") : "Connector waiting..."
      const installReady = !!(installBtn && getComputedStyle(installBtn).display !== "none")
      shopifyStatus.textContent = installReady ? `${badgeText} Install ready.` : badgeText
    }
  }

  const clickForward = (sourceId, targetId)=>{
    const source = qs(`#${sourceId}`)
    const target = qs(`#${targetId}`)
    if(source && target){
      source.addEventListener("click", ()=>target.click())
    }
  }

  clickForward("coreOpenLaunch", "launchMenuBtn")
  clickForward("coreOpenSettings", "menuSettings")
  clickForward("coreOpenLogin", "loginBtn")
  clickForward("coreOpenShopify", "menuShopifyFlow")

  update()
  window.addEventListener("storage", update)
  setInterval(update, 1600)
}

function setupTabs(){
  qsa(".tab-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      activateTab(btn.dataset.tab)
    })
  })
}

function setupThemeArrows(){
  const prev = qs("#themePrevSide")
  const next = qs("#themeNextSide")
  if(!prev || !next) return
  const saved = localStorage.getItem("theme") || DEFAULT_THEME
  state.themeIndex = Math.max(0, THEMES.indexOf(saved))
  applyTheme()

  prev.addEventListener("click", ()=>{state.themeIndex = (state.themeIndex - 1 + THEMES.length) % THEMES.length; applyTheme()})
  next.addEventListener("click", ()=>{state.themeIndex = (state.themeIndex + 1) % THEMES.length; applyTheme()})

  function applyTheme(){
    const keep = []
    if(document.body.classList.contains("resort-brochure")) keep.push("resort-brochure")
    if(document.body.classList.contains("natural-pro")) keep.push("natural-pro")
    if(document.body.classList.contains("plus500")) keep.push("plus500")
    if(document.body.classList.contains("system-theme")) keep.push("system-theme")
    document.body.className = `theme-${THEMES[state.themeIndex]} ${keep.join(" ")}`.trim()
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
  bindOpen("menuCustomOrderTop", "customOrderModal")
  bindOpen("menuSellAria", "sellAriaModal")
  bindOpen("menuSettings", "settingsModal")
  bindOpen("menuSubscription", "subscriptionModal")
  const creditTop = qs("#menuCreditTop")
  if(creditTop){
    creditTop.addEventListener("click", ()=>{
      qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
      qsa(".tab-panel").forEach(p=>p.classList.remove("active"))
      const panel = qs("#tab-credit")
      if(panel){ panel.classList.add("active") }
    })
  }
  bindClose("closeOccasion", "occasionModal")
  bindClose("closeGift", "giftModal")
  bindClose("closeSubscription", "subscriptionModal")
  bindClose("closeSellAria", "sellAriaModal")
  bindOpen("openSeo", "seoModal")
  bindClose("closeSeo", "seoModal")
  bindClose("closeBlog", "blogModal")
  bindClose("closeBlogX", "blogModal")
  bindClose("closeApp", "appModal")
  bindClose("closeLink", "linkModal")
  bindClose("closePuzzle", "puzzleModal")
  bindClose("closeCustomOrder", "customOrderModal")
  bindClose("closeReel", "reelModal")
  bindClose("closeSettings", "settingsModal")
  bindClose("closeBrochure", "brochureModal")
  bindClose("closeOccasion6Q", "occasion6qModal")
  bindClose("closeRequestCall", "requestCallModal")
  bindClose("closeEmergencyAssist", "emergencyAssistModal")

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
        if(name === "Brochure"){
          openModal("brochureModal")
          return
        }
        if(name === "TV Reel"){
          openModal("reelModal")
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
  function planCard(key, extra){
    const p = PLAN_MEDIA[key]
    if(!p) return ""
    return `<div class="digital-product-card" style="margin-bottom:10px;">
      <img src="${p.image}" alt="${p.title}" loading="lazy">
      <div class="digital-product-body">
        <div class="digital-product-title">${p.title}</div>
        <div class="gift-price">${p.price}</div>
        <div class="digital-product-desc">${p.desc}</div>
        ${extra || ""}
      </div>
    </div>`
  }

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
      view.innerHTML = `<p>Physical product shop with Evelyn.</p><div class="lock-pill">Custom orders are retired.</div><div class="lock-pill">Use the Shopify product pages for direct checkout.</div><button class="btn" id="openCustomOrder">Open Product Shop</button>`
      qs("#openCustomOrder").addEventListener("click", ()=>openLinkModal(LINKS.custom, "Product Shop"))
      return
    }
    if(val === "premium"){
      view.innerHTML = `${planCard("premium", `<button class="btn" id="goPremium">Pay $35</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">Unlocks 2 ARIA levels + puzzles to continue</div><div class="lock-pill">Activation happens after paid Shopify confirmation</div>`
      qs("#goPremium").addEventListener("click", ()=>openLinkModal(LINKS.premium, "Premium Subscription"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "bingo100"){
      view.innerHTML = `${planCard("bingo100", `<button class="btn" id="goBingo100">Pay $100/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">“You worked hard — relax, I got your hair.” chill support lane.</div><div class="lock-pill">Funny flow + confidence style for 5-to-9 builders (non-21+ mode).</div>`
      qs("#goBingo100").addEventListener("click", ()=>openLinkModal(LINKS.bingo100, "Bingo Fantasy"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "family200"){
      view.innerHTML = `${planCard("family200", `<button class="btn" id="goFamily200">Pay $200/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">Choose your Family Fantasy scene pack and let ARIA prep your next movie moment.</div><div class="lock-pill">Family-safe, high-energy, hair-first coaching style.</div>`
      qs("#goFamily200").addEventListener("click", ()=>openLinkModal(LINKS.family200 || LINKS.custom, "Family Fantasy"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "yoda"){
      view.innerHTML = `${planCard("yoda", `<button class="btn" id="goYoda">Pay $20</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">A focused build version of unlimited ARIA for style-first creators.</div><div class="lock-pill">Talk-to-us deal lane stays in $50 Unlimited ARIA.</div>`
      qs("#goYoda").addEventListener("click", ()=>openLinkModal(LINKS.yoda, "Yoda Pass"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "fantasy300"){
      view.innerHTML = `${planCard("fantasy300", `<button class="btn" id="goFantasy300">Pay $300/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">Flirty-light vibe: “I like your style” and dinner-ready hair energy.</div><div class="lock-pill">Playful 21+ tone, non-explicit, hair-first.</div>`
      qs("#goFantasy300").addEventListener("click", ()=>openLinkModal(LINKS.fantasy300, "Basic Fantasy 21+"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "fantasy600"){
      view.innerHTML = `${planCard("fantasy600", `<button class="btn" id="goFantasy600">Pay $600/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">Meaningful romance storytelling with premium emotional tone.</div><div class="lock-pill">Cinematic, affectionate, non-explicit, hair-first guidance.</div>`
      qs("#goFantasy600").addEventListener("click", ()=>openLinkModal(LINKS.fantasy600, "Advanced Fantasy 21+"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "pro"){
      view.innerHTML = `${planCard("pro", `<button class="btn" id="goPro">Pay $50</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">All 4 levels + unlimited ARIA</div><div class="lock-pill">Activation happens after paid Shopify confirmation</div>`
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
  const levelSel = qs("#offRoadLevel")
  const optSel = qs("#offRoadOption")
  const offGo = qs("#offRoadGo")
  const offPing = qs("#offRoadDRPing")
  const offToHelp = qs("#offRoadToHelp")
  const offStatus = qs("#offRoadStatus")
  function setOffStatus(text){ if(offStatus) offStatus.textContent = text }
  if(offGo){
    offGo.addEventListener("click", ()=>{
      const level = (levelSel && levelSel.value) || "organic"
      const opt = (optSel && optSel.value) || "eat"
      const optLabel = {
        eat:"Get a bite to eat",
        meet:"Meet someone personally",
        trails:"Trails",
        haircuts:"Haircuts",
        music:"Music Scene"
      }[opt] || "Option"
      if(level === "organic"){
        setOffStatus(`Organic route: ${optLabel}. Culture mode ON — Formula Exclusiva + ARIA Digital Product support, respondent in keeping the peace with a politically democratic community tone.`)
        if(opt === "eat"){ openLinkModal("https://www.google.com/maps/search/restaurant+near+Santiago+Dominican+Republic", "Restaurant Route") }
        if(opt === "haircuts"){ openLinkModal("https://www.google.com/maps/search/barber+near+Santiago+Dominican+Republic", "Haircut Route") }
        if(opt === "music"){ openLinkModal("https://www.google.com/maps/search/music+venue+Santiago+Dominican+Republic", "Music Scene") }
        if(opt === "trails"){ openLinkModal("https://www.google.com/maps/search/trails+Santiago+Dominican+Republic", "Trails Santiago") }
        if(opt === "meet"){ openLinkModal(LINKS.family200 || LINKS.custom, "Premium Personal Meet Route") }
        return
      }
      if(level === "caution"){
        setOffStatus(`Caution route active for ${optLabel}. Caution ARIA scans extreme scenarios and directs to emergency sequence + doctor route.`)
        const helpTab = qs('.tab-btn[data-tab="ariahelp"]')
        if(helpTab) helpTab.click()
        return
      }
      if(level === "airport"){
        setOffStatus(`Airport route active: terminal path + low-key boat routing references (island hop planning like Puerto Rico).`)
        openLinkModal("https://www.google.com/maps/search/Santiago+airport+Dominican+Republic", "Airport Route")
      }
    })
  }
  if(offPing){
    offPing.addEventListener("click", ()=>{
      const msg = encodeURIComponent("SupportRD request: help connect contacts in Santiago Dominican Republic. Reference: Figueroa / Ramlin / Crystal / Kito.")
      openLinkModal(`mailto:agentanthony@supportrd.com?subject=DR%20Contact%20Ping&body=${msg}`, "DR Contact Ping")
      setOffStatus("DR contact ping sent. Awaiting response for known contacts in Santiago.")
    })
  }
  if(offToHelp){
    offToHelp.addEventListener("click", ()=>{
      const t = qs('.tab-btn[data-tab="ariahelp"]')
      if(t) t.click()
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
    openLinkModal(LINKS.fantasy300, "21+ Basic Fantasy Checkout")
    openMiniWindow("21+ Mode", "Activated. No drugs or gang content allowed.")
  })
  offBtn.addEventListener("click", ()=>{
    state.adult21 = false
    localStorage.setItem("adult21Mode", "false")
    render()
    openLinkModal(LINKS.premium, "Premium Checkout")
  })
  if(feedBtn){
    feedBtn.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/social-circuits")
        const d = await r.json()
        if(d && d.ok){
          const lines = (d.circuits || []).map(c=>`${c.name}: ${c.state}`).join(" · ")
          if(circuitStatus) circuitStatus.textContent = `Live circuits: ${lines}`
          openLinkModal(LINKS.pro, "Unlimited ARIA Checkout")
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
      openLinkModal(LINKS.pro, "Unlimited ARIA Checkout")
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
      openLinkModal(LINKS.family200 || LINKS.custom, "Family Fantasy Checkout")
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

function setupEmergencyAssist(){
  const openBtn = qs("#openEmergencyAssist")
  const runScan = qs("#emergencyRunScan")
  const ariaTest = qs("#emergencyAriaTest")
  const doctorRoute = qs("#emergencyDoctorRoute")
  const directBill = qs("#emergencyDirectBill")
  const typeSel = qs("#emergencyType")
  const log = qs("#emergencyLog")
  if(openBtn){
    openBtn.addEventListener("click", ()=>openModal("emergencyAssistModal"))
  }
  if(runScan){
    runScan.addEventListener("click", ()=>{
      const startScan = qs("#startHairScan")
      if(startScan){ startScan.click() }
      if(log) log.textContent = "Status: scan started. Follow left-right guide and keep camera steady."
    })
  }
  if(ariaTest){
    ariaTest.addEventListener("click", ()=>{
      const t = (typeSel && typeSel.value) || "unknown"
      const prompt = `Emergency hair incident (${t}). Give fast, fair general sequence: immediate safety, stop damage, clean care steps, when to seek ER/urgent care, and how to find scalp/hair medicine doctor. Keep it direct and short.`
      const input = qs("#ariaInput")
      const send = qs("#sendAria")
      if(input) input.value = prompt
      if(send) send.click()
      if(log) log.textContent = "Status: ARIA emergency test triggered."
    })
  }
  if(doctorRoute){
    doctorRoute.addEventListener("click", ()=>{
      openLinkModal("https://www.aad.org/public/find-a-derm", "Find Dermatologist")
      if(log) log.textContent = "Status: doctor route opened."
    })
  }
  if(directBill){
    directBill.addEventListener("click", async ()=>{
      try{
        const email = ((state.socialLinks && state.socialLinks.email) || "").trim().toLowerCase()
        const type = (typeSel && typeSel.value) || "unknown"
        const payload = {
          name: (state.socialLinks && state.socialLinks.name) || "SupportRD Emergency User",
          phone: (state.socialLinks && state.socialLinks.phone) || "",
          email: email || "unknown@supportrd.com",
          address: "Emergency Assist Request",
          notes: `Direct bill medical assist requested. Incident type: ${type}. 3 months pro + all themes requested.`,
          consent: true
        }
        const r = await fetch("/api/leads/request-call", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const d = await r.json()
        if(d && d.status === "pending"){
          if(log) log.textContent = `Status: direct bill request submitted (${d.request_id || "pending"}).`
          openMiniWindow("Emergency Billing", "Request submitted. Team will follow up for fair medical-assist routing.")
        } else {
          if(log) log.textContent = `Status: request failed (${d.error || "unknown"}).`
        }
      }catch{
        if(log) log.textContent = "Status: request failed (network_error)."
      }
    })
  }
}

function setupAriaHelp(){
  const out = qs("#ariaHelpLines")
  const gen = qs("#ariaHelpGenerate")
  const scan = qs("#ariaHelpScan")
  const vr = qs("#ariaHelpVR")
  const premium = qs("#ariaHelpPremium")
  const stores = qs("#ariaHelpStores")
  const rc = qs("#ariaHelpRedCross")
  const n911 = qs("#ariaHelp911")
  const n988 = qs("#ariaHelp988")
  const toOffRoad = qs("#ariaHelpToOffRoad")
  if(!out) return
  if(gen){
    gen.addEventListener("click", ()=>{
      const lines = [
        "1) In an extreme case (burn, blood, severe tangles, breakage, parasites, or color reaction), call 911 first, protect breathing/eyes, and stop all chemical or heat exposure immediately.",
        "2) Start the hair scan right now and let Caution ARIA give a fast, fair sequence to urgent care, dermatologist routing, and next-step stabilization.",
        "3) For follow-up recovery and supply, use the fastest Premium/Pro route and verified healthy-hair stores, including SupportRD international routing in Santiago (Villa Gonzalez), while keeping Red Cross/988 contacts available."
      ]
      out.innerHTML = lines.map(l=>`<div>${l}</div>`).join("")
    })
  }
  if(scan){
    scan.addEventListener("click", ()=>{
      const btn = qs("#startHairScan")
      if(btn) btn.click()
      const tab = qs('.tab-btn[data-tab="analysis"]')
      if(tab) tab.click()
    })
  }
  if(vr){ vr.addEventListener("click", ()=>{ const btn = qs("#vrScanBtn"); if(btn) btn.click() }) }
  if(premium){ premium.addEventListener("click", ()=>openModal("subscriptionModal")) }
  if(stores){
    stores.addEventListener("click", ()=>{
      openMiniWindow("Stores Route", "Fast route: SupportRD Gift Shop + Shopify lineup + DR founder reference route for stock checks.")
      openLinkModal(LINKS.custom, "SupportRD Store Route")
    })
  }
  if(rc){ rc.addEventListener("click", ()=>openLinkModal("https://www.redcross.org/get-help.html", "Red Cross Assistance")) }
  if(n911){ n911.addEventListener("click", ()=>{ window.location.href = "tel:911" }) }
  if(n988){ n988.addEventListener("click", ()=>{ window.location.href = "tel:988" }) }
  if(toOffRoad){
    toOffRoad.addEventListener("click", ()=>{
      const t = qs('.tab-btn[data-tab="gps"]')
      if(t) t.click()
    })
  }
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

function setupAppDeepLinks(){
  const params = new URLSearchParams(window.location.search || "")
  const app = String(params.get("app") || "").toLowerCase()
  if(app === "tvreel"){
    openModal("reelModal")
  } else if(app === "hairscore"){
    renderApp("Live Hair Score")
    openModal("appModal")
  }
}

function setupStartupSplash(){
  const splash = qs("#launchSplash")
  if(!splash) return
  const params = new URLSearchParams(window.location.search || "")
  const fromPwa = params.get("source") === "pwa"
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true
  if(!(fromPwa || isStandalone)) return
  splash.classList.add("show")
  setTimeout(()=>{ splash.classList.remove("show") }, 1700)
}

  function setupLaunchMenu(){
    const launch = qs("#launchMenu")
    const menuBtn = qs("#launchMenuBtn")
    const panel = qs("#launchPanel")
  const panelToggle = qs("#launchPanelToggle")
  const payBtn = qs("#launchPaymentBtn")
  const payPanel = qs("#launchPaymentPanel")
  const payClose = qs("#closeLaunchPayment")
  const lang = qs("#launchLang")
  const statusBoot = qs("#launchStatusBoot")
    const statusAccess = qs("#launchStatusAccess")
    const statusShopify = qs("#launchStatusShopify")
    const shopifyBadge = qs("#shopifyConnectorBadge")
    const intro = qs("#launchIntro")
    const pathAccess = qs("#launchPathAccess")
    const pathShopify = qs("#launchPathShopify")
    const pathEnter = qs("#launchPathEnter")
    if(!launch || !menuBtn) return
  const labels = {
    en: {title:"SupportRD Check-In", menu:"SupportRD Boot Menu", menuBtn:"Open Boot Menu", payment:"Payment Options", intro:"Boot cleanly, choose your lane, and enter the site without confusion."},
    es: {title:"SupportRD Check-In", menu:"Menu de Inicio SupportRD", menuBtn:"Abrir Menu", payment:"Opciones de Pago", intro:"Entra limpio, elige tu ruta, y sigue sin confusion."},
    fr: {title:"SupportRD Check-In", menu:"Menu de Demarrage SupportRD", menuBtn:"Ouvrir Menu", payment:"Options de Paiement", intro:"Entrez proprement, choisissez votre voie, puis continuez sans confusion."},
    de: {title:"SupportRD Check-In", menu:"SupportRD Startmenu", menuBtn:"Startmenu Offnen", payment:"Zahlungsoptionen", intro:"Sauber starten, Spur wahlen, und ohne Verwirrung eintreten."},
    ar: {title:"SupportRD Check-In", menu:"قائمة تشغيل SupportRD", menuBtn:"افتح قائمة التشغيل", payment:"خيارات الدفع", intro:"ادخل بشكل واضح واختر مسارك بدون تشويش."},
    sw: {title:"SupportRD Check-In", menu:"Menyu ya Mwanzo ya SupportRD", menuBtn:"Fungua Menyu", payment:"Chaguo la Malipo", intro:"Ingia kwa utulivu, chagua njia yako, kisha endelea bila mkanganyiko."}
  }
  function applyLang(code){
    const t = labels[code] || labels.en
    const title = qs("#launchTitle")
    const menuTitle = qs("#menuTitle")
    if(title) title.textContent = t.title
    if(menuTitle) menuTitle.textContent = t.menu
    menuBtn.textContent = t.menuBtn
    if(payBtn) payBtn.textContent = t.payment
    if(intro) intro.textContent = t.intro
  }
  if(lang){
    applyLang(lang.value)
    lang.addEventListener("change", ()=>applyLang(lang.value))
  }
    function syncLaunchStatus(){
      const panelOpen = !!(panel && panel.classList.contains("show"))
      const payOpen = !!(payPanel && payPanel.classList.contains("show"))
      const isLogged = localStorage.getItem("loggedIn") === "true"
      if(statusBoot) statusBoot.textContent = panelOpen ? "Check-in panel open." : "Ready for check-in."
      if(statusAccess) statusAccess.textContent = isLogged ? "Logged in path detected." : "Guest mode until login."
      if(pathAccess) pathAccess.textContent = isLogged ? "Account lane is clear and recognized." : "Guest mode is still active."
      if(statusShopify){
        const badgeText = shopifyBadge ? (shopifyBadge.textContent || "Trusted store lane connected.") : "Trusted store lane connected."
        statusShopify.textContent = payOpen ? "Payment lane open." : badgeText
        if(pathShopify) pathShopify.textContent = payOpen ? "Payment lane is open right now." : badgeText
      }
      if(pathEnter) pathEnter.textContent = panelOpen ? "Boot menu is open. Finish here, then enter." : "Main site is ready for entry."
      if(panelToggle){
        panelToggle.textContent = panelOpen ? "Close" : "Open"
        panelToggle.setAttribute("aria-expanded", panelOpen ? "true" : "false")
      }
      menuBtn.classList.toggle("blink", !panelOpen)
    }
    function runLaunchAction(action){
      if(action === "login") window.location.href = "/login"
      if(action === "signup") window.location.href = "/login?mode=signup"
      if(action === "forgot") window.location.href = "/login"
      if(action === "payment" && payPanel) payPanel.classList.add("show")
      if(action === "satellite") openMiniWindow("Satellite Watch", "We can stage alerts and contact routing. For emergency launch updates, keep your admin contact active.")
      if(action === "enter") launch.classList.add("hide")
      if(action === "default"){
        panel.classList.remove("show")
        if(payPanel) payPanel.classList.remove("show")
        launch.classList.remove("open")
      }
      syncLaunchStatus()
    }
    setInterval(()=>{ menuBtn.classList.toggle("blink") }, 1500)
    menuBtn.addEventListener("click", ()=>{
      panel.classList.toggle("show")
      launch.classList.toggle("open")
      syncLaunchStatus()
    try{ beep(980, 90) }catch{}
  })
  if(panelToggle){
    panelToggle.addEventListener("click", ()=>{
      panel.classList.toggle("show")
      launch.classList.toggle("open", panel.classList.contains("show"))
      syncLaunchStatus()
    })
  }
  if(payBtn){
    payBtn.addEventListener("click", ()=>{
      if(payPanel) payPanel.classList.toggle("show")
      syncLaunchStatus()
      try{ beep(760, 90) }catch{}
    })
  }
  if(payClose){ payClose.addEventListener("click", ()=>{ if(payPanel) payPanel.classList.remove("show"); syncLaunchStatus() }) }
  qsa("[data-pay]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.dataset.pay
      const map = {
        family200: LINKS.family200 || LINKS.custom,
        premium: LINKS.premium,
        pro: LINKS.pro,
        bingo100: LINKS.bingo100,
        yoda: LINKS.yoda,
        tip: LINKS.donate
      }
      const labelMap = {
        family200:"Family Pack",
        premium:"ARIA Original",
        pro:"ARIA Professional",
        bingo100:"Bingo",
        yoda:"Slow / Yoda",
        tip:"Tip Owners & Workers"
      }
      openLinkModal(map[k] || LINKS.custom, labelMap[k] || "Payment")
    })
  })
    qsa("[data-launch]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        runLaunchAction(btn.dataset.launch)
      })
    })
    qsa("[data-launch-shortcut]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        runLaunchAction(btn.dataset.launchShortcut)
      })
    })
    syncLaunchStatus()
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
    if(status) status.textContent = "Webcam scan live... hold steady and move left to right."
    if(result) result.textContent = "Webcam scan running..."
    setTimeout(()=>{
      const summary = "Webcam scan complete. I see dryness at the ends with light frizz and low bounce at the crown. I recommend a moisture mask, light protein, and a satin wrap.";
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
            <circle id="scoreProgressCircle" cx="80" cy="80" r="70" stroke="url(#scoreGrad)" stroke-width="12" fill="none" stroke-linecap="round"
              stroke-dasharray="0 ${Math.round(circumference)}"/>
          </svg>
          <div class="score-value"><div id="scoreValueNum">0%</div><span>Live Hair Score</span></div>
        </div>
        <div class="score-legend">
          <div class="tag">SupportRD Live · Plus500‑style momentum</div>
          <div style="color:var(--muted);margin-bottom:10px;">Tap the score to reveal your ARIA level and unlocks.</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
            <input id="scoreFastCode" maxlength="7" placeholder="Fast code" style="padding:10px 12px;border-radius:10px;border:1px solid rgba(255,255,255,0.22);background:rgba(0,0,0,0.35);color:#fff;min-width:120px;">
            <button class="btn" id="scoreFastLoad">Fast Load Visual</button>
          </div>
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
    const fastCode = qs("#scoreFastCode")
    const fastLoad = qs("#scoreFastLoad")
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
    const progressCircle = qs("#scoreProgressCircle")
    const valueNum = qs("#scoreValueNum")
    const totalLen = Math.round(circumference)
    const targetLen = dash
    if(progressCircle || valueNum){
      const startTs = performance.now()
      const duration = 900
      function anim(ts){
        const t = Math.min(1, (ts - startTs) / duration)
        const eased = 1 - Math.pow(1 - t, 3)
        const currentScore = Math.round(score * eased)
        const currentLen = Math.round(targetLen * eased)
        if(valueNum) valueNum.textContent = `${currentScore}%`
        if(progressCircle) progressCircle.setAttribute("stroke-dasharray", `${currentLen} ${Math.max(0, totalLen - currentLen)}`)
        if(t < 1) requestAnimationFrame(anim)
      }
      requestAnimationFrame(anim)
    }
    if(fastLoad){
      const runFastLoad = ()=>{
        const code = String((fastCode && fastCode.value) || "").trim()
        if(code !== "1234567"){
          toast("Use fast code 1234567")
          return
        }
        state.hairScore = 97
        renderApp("Live Hair Score")
        const ringEl = qs("#scoreRing")
        if(ringEl){
          ringEl.animate(
            [
              {transform:"scale(0.93)", filter:"brightness(1)"},
              {transform:"scale(1.05)", filter:"brightness(1.25)"},
              {transform:"scale(1)", filter:"brightness(1)"}
            ],
            {duration:450, easing:"ease-out"}
          )
        }
        toast("Hair score fast-loaded")
      }
      fastLoad.addEventListener("click", runFastLoad)
      if(fastCode){
        fastCode.addEventListener("keydown", (e)=>{
          if(e.key === "Enter"){ runFastLoad() }
        })
      }
    }
    return
  }
  if(name === "TV Reel"){
    body.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">SupportRD TV Reel</div>
      <div style="color:var(--muted);margin-bottom:10px;">Open the reel in full mode with hair clips rotating every 10 seconds.</div>
      <button class="btn" id="openTvReelFromApp">Open TV Reel</button>`
    const open = qs("#openTvReelFromApp")
    if(open){ open.addEventListener("click", ()=>openModal("reelModal")) }
    return
  }
  if(name === "Brochure"){
    body.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">SupportRD Brochure</div>
      <div style="color:var(--muted);margin-bottom:10px;">Open the full brochure with all product pages.</div>
      <button class="btn" id="openBrochureFromApp">Open Brochure</button>`
    const open = qs("#openBrochureFromApp")
    if(open){ open.addEventListener("click", ()=>openModal("brochureModal")) }
    return
  }
  if(name === "Competition Arena"){
    body.innerHTML = `
      <div style="font-weight:700;margin-bottom:8px;">Competition Arena (Bottom Panel)</div>
      <div style="color:var(--muted);margin-bottom:10px;">Start 30-minute or 1-hour live attention challenge. Winner is measured by laughs, excitement, and votes.</div>
      <div class="request-grid" style="margin-bottom:10px;">
        <select id="arenaDuration">
          <option value="30">30 Minutes</option>
          <option value="60">1 Hour</option>
        </select>
        <input id="arenaBetAmount" type="number" min="1" max="50000" step="0.01" placeholder="Bet amount (USD)">
        <select id="arenaPaymentSource">
          <option value="debit_card">Debit Card</option>
          <option value="bank_account">Bank Account</option>
        </select>
        <label class="system-check"><input id="arenaPaymentLinked" type="checkbox"> My debit card/bank is linked for immediate in-house transfer.</label>
        <button class="btn" id="arenaStartLive">Go Live Competition</button>
      </div>
      <div class="system-sub" id="arenaStatus">Ready.</div>
    `
    const start = qs("#arenaStartLive")
    if(start){
      start.addEventListener("click", async ()=>{
        const duration_minutes = Number(qs("#arenaDuration")?.value || 0)
        const bet_amount = Number(qs("#arenaBetAmount")?.value || 0)
        const payment_source = (qs("#arenaPaymentSource")?.value || "").trim()
        const payment_linked = !!qs("#arenaPaymentLinked")?.checked
        const email = ((state.socialLinks && state.socialLinks.email) || "").trim().toLowerCase()
        const out = qs("#arenaStatus")
        try{
          const r = await fetch("/api/competitions/start-live", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({duration_minutes, bet_amount, payment_source, payment_linked, email})
          })
          const d = await r.json()
          if(d && d.ok){
            const post = qs("#postInput")
            if(post){
              post.value = `LIVE COMPETITION ${d.session_id} · ${d.duration_minutes} min · Bet $${d.bet_amount} · Metrics: laughs/excitement/votes.`
            }
            if(out) out.textContent = `Live ${d.session_id} started. ${d.recording_hint} Transfer: ${d.transfer_state}.`
            openMiniWindow("Competition Live", "Live started. Post panel is ready to record session activity.")
          } else {
            if(out) out.textContent = `Start failed: ${d.error || "unknown"}`
            openMiniWindow("Competition", `Start failed: ${d.error || "unknown"}`)
          }
        }catch{
          if(out) out.textContent = "Start failed: network_error"
        }
      })
    }
    return
  }
  if(name === "Shopify Products"){
    const digitalProducts = [
      {id:"premium35", title:"ARIA Puzzle Tier", desc:"$35 monthly digital guidance tier with puzzle unlock flow and routine support.", price:"$35/mo", image:"/static/images/brochure-shampoo.jpg", link:LINKS.premium},
      {id:"pro50", title:"Unlimited ARIA Professional", desc:"$50 monthly unlimited ARIA support with direct deal channel.", price:"$50/mo", image:"/static/images/brochure-hero.jpg", link:LINKS.pro},
      {id:"bingo100", title:"Bingo Fantasy", desc:"Calm, humorous daily support voice pack for high-stress routines.", price:"$100/mo", image:"/static/images/brochure-social.jpg", link:LINKS.bingo100},
      {id:"family200", title:"Family Fantasy Pack", desc:"Family-safe narrative themes to coach hair routines with personality.", price:"$200/mo", image:"/static/images/brochure-contacts.jpg", link:LINKS.family200},
      {id:"basic300", title:"21+ Basic Fantasy", desc:"Flirty but non-explicit hair narrative mode with confident tone.", price:"$300/mo", image:"/static/images/brochure-bright-droplets.jpg", link:LINKS.fantasy300},
      {id:"adv600", title:"21+ Advanced Fantasy", desc:"Premium storytelling mode with personalized romantic tone and pacing.", price:"$600/mo", image:"/static/images/brochure-fast-dropper.jpg", link:LINKS.fantasy600}
    ]
    body.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">SupportRD Products</div>
      <div style="color:var(--muted);margin-bottom:10px;">Professional digital lineup with visual previews and fast checkout.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <button class="btn" id="openMyOrders">Open My Orders</button>
        <button class="btn ghost" id="openShopifyCart">Open Shopify Cart</button>
      </div>
      <div class="digital-product-grid" style="margin-bottom:10px;">
        ${digitalProducts.map(p=>`<article class="digital-product-card">
          <img src="${p.image}" alt="${p.title}" loading="lazy">
          <div class="digital-product-body">
            <div class="digital-product-title">${p.title}</div>
            <div class="gift-price">${p.price}</div>
            <div class="digital-product-desc">${p.desc}</div>
            <div class="digital-product-actions">
              <button class="btn ghost product-preview-btn" data-product="${p.id}">Preview</button>
              <button class="btn product-buy-btn" data-product="${p.id}">Buy Now</button>
            </div>
          </div>
        </article>`).join("")}
      </div>
      <div id="productPreviewPop" class="product-preview-pop" style="display:none;">
        <div class="product-preview-card glass">
          <button class="btn ghost" id="closeProductPreview">Close</button>
          <img id="previewImage" src="" alt="Product Preview">
          <div id="previewTitle" class="digital-product-title"></div>
          <div id="previewPrice" class="gift-price"></div>
          <div id="previewDesc" class="digital-product-desc"></div>
          <button class="btn" id="previewBuyNow">Buy This Product</button>
        </div>
      </div>
      <div id="shopifyLineup" class="gift-grid"></div>
      <button class="btn" id="openCustomShop">Shop Products</button>`
    qs("#openMyOrders").addEventListener("click", ()=>openLinkModal(LINKS.myOrders, "My Orders"))
    qs("#openShopifyCart").addEventListener("click", ()=>openLinkModal(LINKS.cart, "Shopify Cart"))
    let activeProduct = null
    const showPreview = (id)=>{
      const product = digitalProducts.find(p=>p.id === id)
      if(!product) return
      activeProduct = product
      const pop = qs("#productPreviewPop")
      if(!pop) return
      const previewImage = qs("#previewImage")
      const previewTitle = qs("#previewTitle")
      const previewPrice = qs("#previewPrice")
      const previewDesc = qs("#previewDesc")
      if(previewImage) previewImage.src = product.image
      if(previewTitle) previewTitle.textContent = product.title
      if(previewPrice) previewPrice.textContent = product.price
      if(previewDesc) previewDesc.textContent = product.desc
      pop.style.display = "flex"
    }
    qsa(".product-preview-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>showPreview(btn.dataset.product || ""))
    })
    qsa(".product-buy-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const product = digitalProducts.find(p=>p.id === (btn.dataset.product || ""))
        if(product){ openLinkModal(product.link, product.title) }
      })
    })
    const closePreview = qs("#closeProductPreview")
    if(closePreview){
      closePreview.addEventListener("click", ()=>{
        const pop = qs("#productPreviewPop")
        if(pop) pop.style.display = "none"
      })
    }
    const previewBuy = qs("#previewBuyNow")
    if(previewBuy){
      previewBuy.addEventListener("click", ()=>{
        if(activeProduct){ openLinkModal(activeProduct.link, activeProduct.title) }
      })
    }
    qs("#openCustomShop").addEventListener("click", ()=>openLinkModal(LINKS.custom, "Product Shop"))
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
    "Competition Arena",
    "TV Reel",
    "Brochure",
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

function setupEngineGlassViewer(){
  const wrap = qs("#tab-seo")
  if(!wrap) return
  const switches = qsa("[data-engine-view]")
  const panes = {
    action: qs("#engineViewAction"),
    render: qs("#engineViewRender"),
    ecosystem: qs("#engineViewEcosystem")
  }
  const actionFeed = qs("#engineActionFeed")
  const renderFeed = qs("#engineRenderFeed")
  const ecoFeed = qs("#engineEcoFeed")
  const ecoVideoWrap = qs("#engineEcoVideoWrap")
  const snapInput = qs("#engineSnapInput")
  const snapBtn = qs("#engineSnapBtn")
  const myFreqBtn = qs("#engineMyFreqBtn")
  const myFreqFeed = qs("#engineMyFreqFeed")
  const btnAction = qs("#engineRefreshAction")
  const btnRender = qs("#engineRefreshRender")
  const btnResort = qs("#engineApplyResortLook")

  function setView(view){
    switches.forEach(b=>b.classList.toggle("active", b.dataset.engineView === view))
    Object.keys(panes).forEach(k=>{
      if(panes[k]) panes[k].classList.toggle("active", k === view)
    })
  }
  switches.forEach(b=>b.addEventListener("click", ()=>setView(b.dataset.engineView || "action")))

  function linesToText(lines){
    if(!Array.isArray(lines) || !lines.length) return "No live rows yet."
    return lines.map(x=>`- ${x}`).join("\n")
  }
  async function refreshFeed(){
    try{
      const r = await fetch("/api/engine-glass/stream")
      const d = await r.json()
      if(!(d && d.ok)) throw new Error("feed_error")
      if(actionFeed) actionFeed.textContent = linesToText(d.action_bot_lines)
      if(renderFeed) renderFeed.textContent = linesToText(d.render_logging_lines)
      if(ecoFeed) ecoFeed.textContent = linesToText(d.ecosystem_lines)
      if(ecoVideoWrap) ecoVideoWrap.style.display = d.ecosystem_live_video ? "block" : "none"
      if(d.resort_mode){ document.body.classList.add("resort-brochure") }
    }catch{
      if(actionFeed) actionFeed.textContent = "Action Bot feed unavailable."
      if(renderFeed) renderFeed.textContent = "Render Logging feed unavailable."
      if(ecoFeed) ecoFeed.textContent = "Ecosystem feed unavailable."
    }
  }
  if(btnAction) btnAction.addEventListener("click", refreshFeed)
  if(btnRender) btnRender.addEventListener("click", refreshFeed)
  if(btnResort){
    btnResort.addEventListener("click", ()=>{
      document.body.classList.add("resort-brochure")
      openMiniWindow("Resort Look", "Ecosystem resort brochure look applied.")
    })
  }
  if(snapBtn){
    snapBtn.addEventListener("click", async ()=>{
      const content = (snapInput && snapInput.value || "").trim()
      if(!content){
        openMiniWindow("Snapshot", "Type words first, then snap.")
        return
      }
      try{
        const sourceEmail = ((state.socialLinks && state.socialLinks.email) || "ui").trim().toLowerCase()
        const r = await fetch("/api/engine-glass/snapshot", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({content, source: sourceEmail || "ui"})
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Snapshot", "Saved to ecosystem feed.")
          if(snapInput) snapInput.value = ""
          refreshFeed()
        } else {
          openMiniWindow("Snapshot", `Failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Snapshot", "Failed: network_error")
      }
    })
  }
  if(myFreqBtn){
    myFreqBtn.addEventListener("click", async ()=>{
      const email = ((state.socialLinks && state.socialLinks.email) || "").trim().toLowerCase()
      if(!(state.subscription === "pro" || email === "agentanthony@supportrd.com")){
        openMiniWindow("Pro Required", "Watch My Frequency is a Pro option.")
        return
      }
      if(!email){
        openMiniWindow("Frequency", "Add your email in Settings first.")
        return
      }
      try{
        const r = await fetch(`/api/engine-glass/my-frequency?email=${encodeURIComponent(email)}`)
        const d = await r.json()
        if(d && d.ok){
          if(myFreqFeed){
            myFreqFeed.style.display = "block"
            const lines = d.lines || []
            myFreqFeed.textContent = lines.length ? lines.map(x=>`- ${x}`).join("\n") : "No personal frequency snapshots yet."
          }
          openMiniWindow("My Frequency", "Pro frequency stream loaded.")
        } else {
          openMiniWindow("My Frequency", `Failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("My Frequency", "Failed: network_error")
      }
    })
  }
  setView("action")
  refreshFeed()
  setInterval(refreshFeed, 12000)
}

function escapeHtml(value){
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function readProfileScanState(){
  try{
    return JSON.parse(localStorage.getItem(PROFILE_SCAN_KEY) || "{}")
  }catch{
    return {}
  }
}

function saveProfileScanState(next){
  localStorage.setItem(PROFILE_SCAN_KEY, JSON.stringify(next || {}))
}

function inferHairProfileFromSummary(summary){
  const text = String(summary || "").toLowerCase()
  const texture = text.includes("coily") ? "coily" : text.includes("curly") ? "curly" : text.includes("wavy") ? "wavy" : text.includes("straight") ? "straight" : "waiting"
  const hairType = text.includes("4c") ? "4c" : text.includes("4b") ? "4b" : text.includes("4a") ? "4a" : text.includes("3c") ? "3c" : text.includes("3b") ? "3b" : text.includes("3a") ? "3a" : text.includes("2c") ? "2c" : text.includes("2b") ? "2b" : text.includes("2a") ? "2a" : text.includes("1") ? "1" : "waiting"
  const damage = text.includes("break") || text.includes("damage") ? "breakage watch" : text.includes("dry") ? "dryness watch" : text.includes("frizz") ? "frizz watch" : "waiting"
  return { texture, hairType, damage }
}

function getProfileApiDraft(){
  const saved = state.socialLinks || {}
  const scan = readProfileScanState()
  const displayName = (qs("#floatProfileDisplayName")?.value || saved.name || saved.username || "SupportRD Host").trim()
  const latestSummary = (scan.summary || qs("#floatProfileScanSummary")?.textContent || "").trim()
  const inferred = inferHairProfileFromSummary(latestSummary)
  return {
    email: (saved.email || "").trim().toLowerCase(),
    display_name: displayName,
    summary_text: latestSummary || "SupportRD profile summary is ready for export.",
    texture: (scan.texture || inferred.texture || "waiting").trim(),
    color: (scan.color || "waiting").trim(),
    damage: (scan.damage || inferred.damage || "waiting").trim(),
    hair_type: (scan.hair_type || inferred.hairType || "waiting").trim(),
    avatar_set: Boolean(scan.avatar_set || saved.profileImage || state.userAvatar),
    credential_theme: (qs("#floatProfileCredentialTheme")?.value || "laidback").trim()
  }
}

function renderProfileFactList(facts){
  const containers = [qs("#shellV2ProfileFactList")]
  containers.forEach((container)=>{
    if(!container) return
    container.innerHTML = facts.map((item)=>`<div>${escapeHtml(item)}</div>`).join("")
  })
}

function renderLiveProfilePanel(data, draft){
  if(!(data && data.ok)) return
  const access = data.api_access || {}
  const hair = data.hair_analysis || {}
  const accessEnabled = Object.entries(access).filter(([, enabled])=>enabled).map(([key])=>key)
  const latestSummary = hair.latest_summary || draft.summary_text || "SupportRD profile lane is ready for the next verified scan."
  const title = `${data.display_name || draft.display_name || "SupportRD Host"} profile is verified and live.`
  const summary = latestSummary
  const metricPrimary = `${accessEnabled.length} access lanes ready`
  const metricSecondary = hair.latest_export_at ? `Last export ${hair.latest_export_at}` : "PDF / DOCX exports ready"
  const shellTitle = qs("#shellV2ProfileTitle")
  const shellSummary = qs("#shellV2ProfileSummary")
  const shellPrimary = qs("#shellV2ProfileMetricPrimary")
  const shellSecondary = qs("#shellV2ProfileMetricSecondary")
  if(shellTitle) shellTitle.textContent = title
  if(shellSummary) shellSummary.textContent = summary
  if(shellPrimary) shellPrimary.textContent = metricPrimary
  if(shellSecondary) shellSecondary.textContent = metricSecondary
  const apiDeck = qs("#floatProfileApiDeck")
  const identity = qs("#floatProfileIdentityReading")
  const general = qs("#floatProfileGeneralStatusReading")
  const qualityTitle = qs("#floatProfileQualityTitle")
  const qualityBody = qs("#floatProfileQualityBody")
  const latest = qs("#floatProfileLatestResult")
  const creds = qs("#floatProfileCredentialsSummary")
  const exportStatus = qs("#floatProfileExportStatus")
  const status = qs("#floatAssistantStatus")
  if(apiDeck) apiDeck.textContent = accessEnabled.join(", ") || "Account access is still loading."
  if(identity) identity.textContent = data.identity_confirmed || "Identity confirmation is still loading."
  if(general) general.textContent = data.general_status || "General status reading is still loading."
  if(qualityTitle) qualityTitle.textContent = `${data.display_name || draft.display_name || "SupportRD Host"} · Profile AI Summary`
  if(qualityBody) qualityBody.textContent = latestSummary
  if(latest) latest.textContent = `${hair.texture || "waiting"} texture · ${hair.hair_type || "waiting"} type · ${hair.damage || "waiting"}`
  if(creds) creds.textContent = `${draft.credential_theme} credentials active. Email lane: ${data.email || draft.email || "guest"}`
  if(exportStatus) exportStatus.textContent = hair.latest_export_at ? `Latest export saved at ${hair.latest_export_at}.` : "No profile export has been saved yet."
  if(status) status.textContent = "Profile is pulling live account access, identity, and hair-analysis memory from SupportRD now."
  renderProfileFactList([
    `Identity: ${data.identity_confirmed || "waiting"}`,
    `Status: ${data.general_status || "waiting"}`,
    `Texture: ${hair.texture || "waiting"} · Hair type: ${hair.hair_type || "waiting"} · Damage: ${hair.damage || "waiting"}`,
    `Access deck: ${accessEnabled.join(", ") || "waiting"}`,
  ])
}

async function refreshLiveProfilePanel(){
  const draft = getProfileApiDraft()
  const query = new URLSearchParams()
  if(draft.email) query.set("email", draft.email)
  if(draft.display_name) query.set("display_name", draft.display_name)
  if(draft.texture && draft.texture !== "waiting") query.set("hair_texture", draft.texture)
  if(draft.damage && draft.damage !== "waiting") query.set("hair_damage", draft.damage)
  if(draft.hair_type && draft.hair_type !== "waiting") query.set("hair_type", draft.hair_type)
  if(draft.avatar_set) query.set("avatar_set", "1")
  const url = `/api/profile/access-scanner${query.toString() ? `?${query.toString()}` : ""}`
  try{
    const response = await fetch(url, {credentials:"same-origin"})
    const data = await response.json()
    if(!(data && data.ok)) throw new Error(data && data.error || "profile_access_failed")
    renderLiveProfilePanel(data, draft)
    return data
  }catch(err){
    renderProfileFactList([`Profile access scanner is temporarily unavailable: ${err && err.message ? err.message : "network error"}`])
    throw err
  }
}

async function exportLiveProfileAnalysis(format){
  const draft = getProfileApiDraft()
  const response = await fetch("/api/profile/analysis/export", {
    method: "POST",
    credentials: "same-origin",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({...draft, format})
  })
  if(!response.ok){
    throw new Error(`export_failed_${response.status}`)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const safeName = (draft.display_name || "supportrd-profile").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "supportrd-profile"
  link.href = url
  link.download = `${safeName}-hair-analysis.${format}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(()=>URL.revokeObjectURL(url), 1000)
  const exportStatus = qs("#floatProfileExportStatus")
  if(exportStatus) exportStatus.textContent = `Hair analysis ${format.toUpperCase()} export generated for ${draft.display_name || "SupportRD Host"}.`
}

function setupLiveProfilePanels(){
  const refreshIds = ["shellV2ProfileRefresh", "floatProfileAccessRefreshBtn"]
  refreshIds.forEach((id)=>{
    const btn = qs(`#${id}`)
    if(!btn) return
    btn.addEventListener("click", async ()=>{
      btn.disabled = true
      try{
        await refreshLiveProfilePanel()
        toast("Profile scanner refreshed")
      }catch{
        toast("Profile scanner unavailable")
      }finally{
        btn.disabled = false
      }
    })
  })
  const exportButtons = [
    ["shellV2ProfileExportPdf", "pdf"],
    ["shellV2ProfileExportDocx", "docx"],
    ["floatProfileExportPdfBtn", "pdf"],
    ["floatProfileExportDocxBtn", "docx"],
  ]
  exportButtons.forEach(([id, format])=>{
    const btn = qs(`#${id}`)
    if(!btn) return
    btn.addEventListener("click", async ()=>{
      btn.disabled = true
      try{
        await exportLiveProfileAnalysis(format)
        await refreshLiveProfilePanel()
      }catch{
        toast(`Profile ${format.toUpperCase()} export failed`)
      }finally{
        btn.disabled = false
      }
    })
  })
  qs("#floatProfileSaveBtn")?.addEventListener("click", ()=>{
    const draft = getProfileApiDraft()
    state.socialLinks = {...(state.socialLinks || {}), name: draft.display_name, email: draft.email}
    localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
    toast("Profile basics saved")
    refreshLiveProfilePanel().catch(()=>{})
  })
  qs("#floatProfileCredentialTheme")?.addEventListener("change", ()=>refreshLiveProfilePanel().catch(()=>{}))
  qs("#floatProfileDisplayName")?.addEventListener("change", ()=>refreshLiveProfilePanel().catch(()=>{}))
  refreshLiveProfilePanel().catch(()=>{})
}

const FAQ_MEDIA_LIBRARY = {
  tiktok: [
    { title:"Hair mission first", body:"SupportRD reads the hair issue first, then pushes the viewer into the right product or support lane.", kind:"video", src:"/static/videos/reel-1.mp4" },
    { title:"Diary Live donations", body:"Use the SupportRD Diary Live product for visible support while the entertainment feed stays moving.", kind:"image", src:"/static/images/conversation-codex-live-1.png" },
    { title:"Glow route", body:"Hair glow clips, live answers, and direct links belong together in FAQ Lounge now.", kind:"video", src:"/static/videos/sample-10s.mp4" }
  ],
  youtube: [
    { title:"Routine explainer", body:"Longer explainers can sit beside the quick reel so people can learn and still stay on the page.", kind:"video", src:"/static/videos/reel-3.mp4" },
    { title:"Healthy hair tutorial", body:"Images now rotate in as visual support instead of leaving the FAQ surface empty.", kind:"image", src:"/static/images/brochure-shampoo.jpg" },
    { title:"Studio crossover", body:"The same lounge can push viewers into studio, profile, or diary without losing the relaxed tone.", kind:"video", src:"/static/videos/reel-2.mp4" }
  ],
  movies: [
    { title:"Cinema bounce", body:"Movie-style clips can show dramatic before-and-after texture, shine, and repair moods.", kind:"video", src:"/static/videos/reel-4.mp4" },
    { title:"Visual polish stills", body:"Image slides keep playing even when the reel video is not the right format for the moment.", kind:"image", src:"/static/images/jake-studio-premium.jpg" },
    { title:"Scalp reset scene", body:"Hair concern scenes can still feed right into product and premium routes.", kind:"video", src:"/static/videos/reel-6.mp4" }
  ]
}

const FAQ_TOPIC_LIBRARY = [
  { key:"dryness", label:"Dryness reset", answer:"Start with moisture first: deep conditioner, leave-in, and lower heat. SupportRD usually points dry ends toward Mascarilla Capilar plus a lighter finish product.", search:"dry hair moisture mask support" },
  { key:"damage", label:"Damage control", answer:"Breakage, rough ends, and heat stress should move into a repair lane: reduce heat, trim weak ends, and stage a protein + moisture balance routine.", search:"hair breakage repair support" },
  { key:"family_shampoo", label:"Family shampoo help", answer:"If your girlfriend or family member wants a good shampoo, start with scalp condition, texture, and styling routine. A simple safe SupportRD answer is a gentle cleansing shampoo plus a matching conditioner and leave-in.", search:"best family shampoo for healthy hair" },
  { key:"wedding", label:"Wedding prep", answer:"For a wedding hair plan, SupportRD should route into shine, hold, heat protection, and timeline prep: wash day, styling day, and touch-up products.", search:"wedding hair prep products routine" },
  { key:"premium", label:"Premium unlocks", answer:"Premium and Pro should unlock the deeper diary prompts, better account routing, and the Studio / Inner Circle / Professional Making Money surfaces.", search:"supportrd premium pro unlocks" },
  { key:"scan", label:"Hair scan flow", answer:"The profile scanner should now save texture, damage watch, and export memory so the person can come back to the same account lane later.", search:"support hair scan workflow" },
  { key:"options", label:"Options market lane", answer:"Professional Making Money should ask for budget, style, direction, expiration, and current price range, then return a light general market read instead of a giant wall of detail.", search:"options momentum breakout bullish bearish budget" },
]

function setupFaqLounge(){
  const host = qs("#floatFaqReelHost")
  const answer = qs("#floatFaqPromptAnswer")
  const select = qs("#floatFaqPromptSelect")
  const status = qs("#floatLiveStatus")
  const paymentBtn = qs("#floatFaqPaymentBtn")
  const refreshBtn = qs("#floatFaqReelBtn")
  const panel = qs('[data-shell-v2-panel="faq"]')
  let faqTheme = "tiktok"
  let faqIndex = 0

  function getFaqThemeItems(){
    return FAQ_MEDIA_LIBRARY[faqTheme] || FAQ_MEDIA_LIBRARY.tiktok
  }
  function renderFaqMedia(){
    if(!host) return
    const items = getFaqThemeItems()
    const item = items[faqIndex % items.length]
    if(!item) return
    const media = item.kind === "image"
      ? `<img src="${item.src}" alt="${escapeHtml(item.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:18px;">`
      : `<video src="${item.src}" autoplay muted loop playsinline controls style="width:100%;height:100%;object-fit:cover;border-radius:18px;background:#04070f;"></video>`
    host.innerHTML = `
      <div class="glass" style="padding:12px;border-radius:22px;display:grid;gap:10px;background:rgba(4,10,18,.82);">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="float-box-badge">${escapeHtml(faqTheme)} visual</span>
        </div>
        <div style="min-height:240px;">${media}</div>
        <div class="float-board-preview">${escapeHtml(item.body)}</div>
      </div>
    `
    if(status){
      status.innerHTML = `FAQ Lounge is now reading real reel media, hair topics, and live links. Diary live support: <a href="${LINKS.diaryLive}" target="_blank" rel="noopener">SupportRD Diary Live</a>`
    }
  }
  function renderFaqTopics(){
    if(!select) return
    const currentKey = select.value || FAQ_TOPIC_LIBRARY[0].key
    select.innerHTML = FAQ_TOPIC_LIBRARY.map((topic)=>`<option value="${topic.key}" ${topic.key === currentKey ? "selected" : ""}>${escapeHtml(topic.label)}</option>`).join("")
    const selected = FAQ_TOPIC_LIBRARY.find((topic)=>topic.key === (select.value || currentKey)) || FAQ_TOPIC_LIBRARY[0]
    if(answer && selected){
      answer.innerHTML = `${escapeHtml(selected.answer)}<br><br><a href="https://www.google.com/search?q=${encodeURIComponent(selected.search)}" target="_blank" rel="noopener">Open search feed</a>`
    }
  }
  function injectSignalsForm(){
    if(!panel || panel.querySelector("[data-signals-form]")) return
    const block = document.createElement("div")
    block.setAttribute("data-signals-form", "1")
    block.className = "supportrd-shell-v2__app-grid"
    block.innerHTML = `
      <article class="supportrd-shell-v2__app-card supportrd-shell-v2__app-card--spotlight">
        <div class="supportrd-shell-v2__eyebrow">Live Signals Contact</div>
        <h4>Buy signals, then land back in one clear SupportRD lane.</h4>
        <p>SupportRD Market Signals now has a direct contact form for the purchasing account, plus a visible Discord and return link structure for future entertainment URLs.</p>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0;">
          <a href="${LINKS.diaryLive}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;">
            <div class="digital-product-card" style="margin:0;">
              <img src="/static/images/conversation-codex-live-2.png" alt="SupportRD Diary Live" style="width:100%;height:160px;object-fit:cover;border-radius:16px;">
              <div class="digital-product-body">
                <div class="digital-product-title">SupportRD Diary Live</div>
                <div class="digital-product-desc">Live support / donations lane with the entertainment return URL.</div>
              </div>
            </div>
          </a>
          <a href="${LINKS.marketSignals}" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;">
            <div class="digital-product-card" style="margin:0;">
              <img src="/static/images/aria-premium-pro-main-ad.jpg" alt="SupportRD Market Signals" style="width:100%;height:160px;object-fit:cover;border-radius:16px;">
              <div class="digital-product-body">
                <div class="digital-product-title">SupportRD Market Signals</div>
                <div class="digital-product-desc">Signal buyers can now leave their name, email, phone, and Discord directly in the site.</div>
              </div>
            </div>
          </a>
        </div>
        <div class="supportrd-shell-v2__metric-row">
          <span><a href="${LINKS.marketSignals}" target="_blank" rel="noopener">Market Signals Product</a></span>
          <span>Discord: ${LIVE_SIGNALS_DISCORD}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px;">
          <input class="input" id="signalsContactName" placeholder="Name">
          <input class="input" id="signalsContactEmail" placeholder="Email">
          <input class="input" id="signalsContactPhone" placeholder="Phone Number">
          <input class="input" id="signalsContactDiscord" placeholder="Discord" value="${LIVE_SIGNALS_DISCORD}">
        </div>
        <textarea class="input" id="signalsContactNotes" placeholder="What should SupportRD know about this signals account?" style="margin-top:10px;"></textarea>
        <div class="supportrd-shell-v2__button-row" style="margin-top:10px;">
          <button class="btn" id="signalsContactSubmit">Send Contact Form</button>
          <button class="btn ghost" id="signalsContactOpenProduct">Open Product</button>
        </div>
        <div id="signalsContactStatus" class="supportrd-shell-v2__mini-list" style="margin-top:10px;">SupportRD is ready to collect the purchasing account contact details.</div>
      </article>
    `
    panel.appendChild(block)
    qs("#signalsContactOpenProduct")?.addEventListener("click", ()=>openLinkModal(LINKS.marketSignals, "SupportRD Market Signals"))
    qs("#signalsContactSubmit")?.addEventListener("click", async ()=>{
      const statusEl = qs("#signalsContactStatus")
      const payload = {
        name: (qs("#signalsContactName")?.value || "").trim(),
        email: (qs("#signalsContactEmail")?.value || "").trim(),
        phone: (qs("#signalsContactPhone")?.value || "").trim(),
        discord: (qs("#signalsContactDiscord")?.value || LIVE_SIGNALS_DISCORD).trim(),
        plan: "market-signals",
        notes: (qs("#signalsContactNotes")?.value || "").trim()
      }
      if(!payload.name || !payload.email){
        if(statusEl) statusEl.textContent = "Name and email are required before SupportRD can save the contact form."
        return
      }
      try{
        const response = await fetch("/api/contact/live-signals", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const data = await response.json()
        if(!(data && data.ok)) throw new Error(data && data.error || "submit_failed")
        if(statusEl) statusEl.textContent = `Saved ${payload.name} for market signals. Discord: ${data.discord || LIVE_SIGNALS_DISCORD}.`
        toast("Live signals form saved")
      }catch(err){
        if(statusEl) statusEl.textContent = `Contact form failed: ${err && err.message ? err.message : "network_error"}`
      }
    })
    const floatLiveBox = qs("#floatLiveBox")
    if(floatLiveBox && !floatLiveBox.querySelector("[data-float-signal-cards]")){
      const visualCards = document.createElement("div")
      visualCards.setAttribute("data-float-signal-cards", "1")
      visualCards.className = "float-profile-results"
      visualCards.innerHTML = `
        <div class="float-profile-result-card">
          <strong>Diary Live Product</strong>
          <img src="/static/images/conversation-codex-live-2.png" alt="SupportRD Diary Live" style="width:100%;height:120px;object-fit:cover;border-radius:14px;margin:8px 0;">
          <span><a href="${LINKS.diaryLive}" target="_blank" rel="noopener">Open SupportRD Diary Live</a></span>
        </div>
        <div class="float-profile-result-card">
          <strong>Market Signals Product</strong>
          <img src="/static/images/aria-premium-pro-main-ad.jpg" alt="SupportRD Market Signals" style="width:100%;height:120px;object-fit:cover;border-radius:14px;margin:8px 0;">
          <span><a href="${LINKS.marketSignals}" target="_blank" rel="noopener">Open SupportRD Market Signals</a></span>
        </div>
      `
      floatLiveBox.appendChild(visualCards)
    }
  }

  renderFaqTopics()
  renderFaqMedia()
  injectSignalsForm()
  qsa("[data-faq-theme]").forEach((btn)=>{
    btn.addEventListener("click", ()=>{
      faqTheme = btn.dataset.faqTheme || "tiktok"
      faqIndex = 0
      qsa("[data-faq-theme]").forEach((chip)=>chip.classList.toggle("active", chip === btn))
      renderFaqMedia()
    })
  })
  if(select){
    select.addEventListener("change", renderFaqTopics)
  }
  if(refreshBtn){
    refreshBtn.addEventListener("click", ()=>{
      faqIndex = (faqIndex + 1) % getFaqThemeItems().length
      renderFaqMedia()
      toast("FAQ reel refreshed")
    })
  }
  if(paymentBtn){
    paymentBtn.addEventListener("click", ()=>openLinkModal(LINKS.diaryLive, "SupportRD Diary Live"))
  }
}

function setupDiaryLiveApi(){
  const liveStatus = qs("#floatDiaryLiveStatus")
  const tagInput = qs("#floatDiaryTagInput")
  const diaryInput = qs("#floatDiaryInput")
  const socialPost = qs("#floatDiarySocialPost")
  const viewer = qs("#remoteDiaryViewer")
  const viewerOverlay = qs("#remoteDiaryViewerOverlay")
  const viewerName = qs("#remoteDiaryViewerName")
  const viewerTag = qs("#remoteDiaryViewerTag")
  const viewerUrl = qs("#remoteDiaryViewerUrl")
  const viewerTranscript = qs("#remoteDiaryViewerTranscript")
  const lobbyList = qs("#remoteDiaryLobbyList")
  const lobbyCount = qs("#remoteDiaryLobbyCount")
  const lobbySignalHeader = qs("#remoteDiaryLobbySignalHeader")
  const lobbySignalPreview = qs("#remoteDiaryLobbySignalPreview")
  const lobbyShopifySummary = qs("#remoteDiaryLobbyShopifySummary")
  const lobbyShopifyMeta = qs("#remoteDiaryLobbyShopifyMeta")
  const history = qs("#floatDiaryHistory")
  const useCase = qs("#floatDiaryUseCase")
  let diarySession = {}

  function readDiarySession(){
    try{
      return JSON.parse(localStorage.getItem(DIARY_SESSION_KEY) || "{}")
    }catch{
      return {}
    }
  }
  function saveDiarySession(session){
    diarySession = session || {}
    localStorage.setItem(DIARY_SESSION_KEY, JSON.stringify(diarySession))
  }
  function getDiaryIdentity(){
    const profileTag = (tagInput?.value || "").trim()
    return {
      session_id: diarySession.session_id || "",
      display_name: (state.socialLinks && (state.socialLinks.name || state.socialLinks.username)) || "SupportRD Diary",
      username: (state.socialLinks && state.socialLinks.username) || "",
      profile_tag: profileTag,
      avatar_url: state.socialLinks && state.socialLinks.profileImage || "",
      entry_text: (diaryInput?.value || "").trim(),
      social_post: (socialPost?.value || "").trim(),
      live_active: true
    }
  }
  function renderDiaryPremiumPrompts(){
    if(!useCase || useCase.querySelector("[data-diary-premium]")) return
    const wrap = document.createElement("div")
    wrap.setAttribute("data-diary-premium", "1")
    wrap.className = "glass"
    wrap.style.cssText = "margin-top:12px;padding:12px;border-radius:18px;display:grid;gap:10px;"
    wrap.innerHTML = `
      <div><strong>Diary premium prompts</strong><div class="float-box-copy">Inner Circle handles family hair buying moments. Professional Making Money handles the options-market lane with lighter analysis.</div></div>
      <div class="float-mini-actions">
        <button class="btn ghost" id="floatDiaryFamilyPromptBtn">Inner Circle · Family Hair Help</button>
        <button class="btn ghost" id="floatDiaryMarketPromptBtn">Professional · Making Money</button>
      </div>
      <div class="float-board-preview" id="floatDiaryPremiumPromptStatus">Free accounts can see this lane, but the deeper prompt actions only turn on for Premium / Pro account memory.</div>
    `
    useCase.appendChild(wrap)
    const premiumStatus = qs("#floatDiaryPremiumPromptStatus")
    const allowFamily = ["premium","bingo100","pro","yoda","fantasy300","fantasy600"].includes(state.subscription) || isProOverride()
    const allowMarket = state.subscription === "pro" || isProOverride()
    const familyBtn = qs("#floatDiaryFamilyPromptBtn")
    const marketBtn = qs("#floatDiaryMarketPromptBtn")
    if(familyBtn){
      familyBtn.disabled = !allowFamily
      familyBtn.addEventListener("click", ()=>{
        if(!allowFamily){
          if(premiumStatus) premiumStatus.textContent = "Inner Circle family prompts turn on after Premium+ is active."
          return
        }
        const prompt = "Family issue: my girlfriend wants her hair done and needs a good shampoo. Or a family member is getting married and needs her hair done. Give me the best products to buy and a simple routine."
        if(diaryInput) diaryInput.value = prompt
        if(premiumStatus) premiumStatus.textContent = "Inner Circle family hair prompt is active in Diary mode now."
      })
    }
    if(marketBtn){
      marketBtn.disabled = !allowMarket
      marketBtn.addEventListener("click", ()=>{
        if(!allowMarket){
          if(premiumStatus) premiumStatus.textContent = "Professional Making Money turns on after Pro / professional access is active."
          return
        }
        const prompt = "Professional making money: my dad and I play options. Give the best options play right now using Stock Budget, Style Momentum Breakout, Direction Bullish/Bearish, Expiration Date, and Stock Price around the current range. If I only say I have $100, give a light general analysis."
        if(diaryInput) diaryInput.value = prompt
        if(premiumStatus) premiumStatus.textContent = "Professional Making Money prompt is active in Diary mode now."
      })
    }
  }
  function renderDiaryViewer(feed){
    if(!feed) return
    const summary = feed.summary || {}
    const payload = feed.payload || {}
    if(viewer) viewer.hidden = false
    if(viewerOverlay) viewerOverlay.textContent = payload.entry_text || payload.social_post || "Diary live session is active."
    if(viewerName) viewerName.textContent = summary.display_name || payload.display_name || "Diary Live Feed"
    if(viewerTag) viewerTag.textContent = summary.profile_tag || payload.profile_tag || "^^support"
    if(viewerUrl){
      const liveUrl = summary.live_url || diarySession.live_url || "supportrd.com"
      viewerUrl.innerHTML = `<a href="${liveUrl}" target="_blank" rel="noopener">${escapeHtml(liveUrl)}</a>`
    }
    if(viewerTranscript) viewerTranscript.textContent = (feed.voice_history || []).map((item)=>`${item.speaker || "voice"}: ${item.text || ""}`).join("\n\n") || payload.entry_text || "The latest diary voice and feed turns will show here."
    const commentMarkup = (feed.comments || []).length
      ? feed.comments.map((item)=>`<div><strong>${escapeHtml(item.author_name || "Guest")}</strong> · ${escapeHtml(item.comment_text || "")}</div>`).join("")
      : "Live comments will show here."
    if(qs("#remoteDiaryViewerComments")) qs("#remoteDiaryViewerComments").innerHTML = commentMarkup
  }
  async function bootstrapDiarySession(forceSave = false){
    const identity = getDiaryIdentity()
    const response = await fetch("/api/diary/session/bootstrap", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(identity)
    })
    const data = await response.json()
    if(!(data && data.ok)) throw new Error(data && data.error || "diary_bootstrap_failed")
    saveDiarySession({session_id:data.session_id, live_slug:data.live_slug, live_url:data.live_url})
    if(liveStatus){
      liveStatus.innerHTML = `Diary live is active. Visible URL: <a href="${data.live_url}" target="_blank" rel="noopener">${escapeHtml(data.live_url)}</a>`
    }
    if(history){
      history.textContent = identity.entry_text || "Diary session is live and ready for the next page."
    }
    if(forceSave){
      await saveDiaryEntry()
    }
    return data
  }
  async function saveDiaryEntry(){
    const sessionId = diarySession.session_id || readDiarySession().session_id
    if(!sessionId){
      await bootstrapDiarySession()
      return
    }
    const payload = {...getDiaryIdentity(), session_id: sessionId}
    const response = await fetch("/api/diary/session/save", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    })
    const data = await response.json()
    if(!(data && data.ok)) throw new Error(data && data.error || "diary_save_failed")
    saveDiarySession({session_id:data.session_id, live_slug:data.live_slug, live_url:data.live_url || diarySession.live_url})
    if(history) history.textContent = payload.entry_text || "Diary saved."
    if(liveStatus && (data.live_url || diarySession.live_url)){
      liveStatus.innerHTML = `Diary live is active. Visible URL: <a href="${data.live_url || diarySession.live_url}" target="_blank" rel="noopener">${escapeHtml(data.live_url || diarySession.live_url)}</a>`
    }
    return data
  }
  async function loadDiaryLobby(){
    try{
      const searchBy = qs("#remoteDiaryLobbySearchBy")?.value || "name"
      const search = qs("#remoteDiaryLobbySearch")?.value || ""
      const sort = qs("#remoteDiaryLobbySort")?.value || "recent"
      const response = await fetch(`/api/diary/lobby?sort=${encodeURIComponent(sort)}&search_by=${encodeURIComponent(searchBy)}&search=${encodeURIComponent(search)}`)
      const data = await response.json()
      if(!(data && data.ok)) throw new Error("lobby_failed")
      const feeds = data.feeds || []
      if(lobbyCount) lobbyCount.textContent = `Latest ${feeds.length} diary feeds`
      if(lobbyList){
        lobbyList.innerHTML = feeds.map((feed)=>`
          <button class="glass" type="button" data-diary-open="${escapeHtml(feed.live_slug || "")}" style="padding:12px;border-radius:18px;text-align:left;display:grid;gap:6px;">
            <strong>${escapeHtml(feed.display_name || "SupportRD Diary")}</strong>
            <span>${escapeHtml(feed.profile_tag || "^^support")}</span>
            <span>${escapeHtml(feed.preview_text || "Waiting for the next entry.")}</span>
            <span>${escapeHtml(feed.live_url || `supportrd.com/entertainment/${feed.live_slug || ""}`)}</span>
          </button>
        `).join("")
        qsa("[data-diary-open]").forEach((btn)=>{
          btn.addEventListener("click", ()=>loadPublicDiaryFeed(btn.getAttribute("data-diary-open") || ""))
        })
      }
    }catch{
      if(lobbyList) lobbyList.textContent = "Diary lobby could not be loaded yet."
    }
    try{
      const response = await fetch("/api/diary/lobby/movement")
      const data = await response.json()
      if(data && data.ok){
        if(lobbySignalHeader) lobbySignalHeader.textContent = data.latest_activity && data.latest_activity.session_name || "No live session yet"
        if(lobbySignalPreview) lobbySignalPreview.textContent = data.latest_activity && data.latest_activity.preview || "Waiting for the next live diary session."
        if(lobbyShopifySummary) lobbyShopifySummary.textContent = `Shopify Reader · ${data.shopify_reader.sessions} sessions · ${data.shopify_reader.orders} orders`
        if(lobbyShopifyMeta) lobbyShopifyMeta.textContent = `Sales: ${data.shopify_reader.currency} ${data.shopify_reader.total_sales} · Risk: ${data.shopify_reader.risk_level}`
      }
    }catch{}
  }
  async function loadPublicDiaryFeed(slug){
    if(!slug) return
    const response = await fetch(`/api/diary/session/public?slug=${encodeURIComponent(slug)}`)
    const data = await response.json()
    if(!(data && data.ok)) throw new Error(data && data.error || "public_diary_failed")
    renderDiaryViewer(data)
    return data
  }
  qs("#floatDiaryLiveBtn")?.addEventListener("click", async ()=>{
    try{
      const data = await bootstrapDiarySession(true)
      toast("Diary live URL created")
      renderDiaryViewer({summary:{live_url:data.live_url, live_slug:data.live_slug, display_name:data.payload.display_name, profile_tag:data.payload.profile_tag}, payload:data.payload, comments:data.comments, voice_history:data.voice_history})
    }catch{
      toast("Diary live could not start")
    }
  })
  qs("#floatDiarySaveBtn")?.addEventListener("click", async ()=>{
    try{
      await saveDiaryEntry()
      toast("Diary saved")
    }catch{
      toast("Diary save failed")
    }
  })
  qs("#floatDiaryTagSaveBtn")?.addEventListener("click", async ()=>{
    try{
      const data = await bootstrapDiarySession()
      if(liveStatus) liveStatus.innerHTML = `Diary tag saved. Visible URL: <a href="${data.live_url}" target="_blank" rel="noopener">${escapeHtml(data.live_url)}</a>`
    }catch{
      toast("Diary tag save failed")
    }
  })
  qs("#remoteDiaryLobbyRefresh")?.addEventListener("click", ()=>loadDiaryLobby())
  qs("#remoteDiaryLobbyApply")?.addEventListener("click", ()=>loadDiaryLobby())
  qs("#shellV2DiaryOpenViewer")?.addEventListener("click", ()=>{
    const session = readDiarySession()
    if(session.live_slug){
      loadPublicDiaryFeed(session.live_slug).catch(()=>toast("Diary viewer is not ready yet"))
    }else{
      toast("Start Diary Live first")
    }
  })
  qs("#remoteDiaryViewerClose")?.addEventListener("click", ()=>{ if(viewer) viewer.hidden = true })
  qs("#remoteDiaryViewerOpenRemote")?.addEventListener("click", ()=>{ if(viewer) viewer.hidden = true; window.scrollTo({top:0, behavior:"smooth"}) })
  renderDiaryPremiumPrompts()
  loadDiaryLobby()
  const params = new URLSearchParams(window.location.search || "")
  const liveSlug = (params.get("diary-live") || "").trim()
  if(liveSlug){
    loadPublicDiaryFeed(liveSlug).catch(()=>{})
  }
}


window.addEventListener("DOMContentLoaded", ()=>{
  try{ var d=document.getElementById('debugClick'); if(d) d.textContent='App init start'; }catch{}
  window.__appInit = true;
  document.body.classList.add("resort-brochure")
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
  safe(setupSimpleView)
  safe(setupSimpleFlow)
  safe(setupDiaryOwnerPayments)
  safe(setupMobileZoom)
  safe(setupStudioFlow)
  safe(setupFinishedShellPreview)
  safe(setupCoreCommandDeck)
  safe(setupAccessibilityMode)
  safe(setupAdult21Mode)
  safe(setupCampaign)
  safe(setupInHouseAd)
  safe(setupRequestCall)
  safe(setupEmergencyAssist)
  safe(setupAriaHelp)
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
  safe(setupLiveProfilePanels)
  safe(setupFaqLounge)
  safe(setupDiaryLiveApi)
  safe(setupGPS)
  safe(setupAria)
  safe(setupPuzzle)
  safe(setupSEOLogs)
  safe(setupEngineGlassViewer)
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
  safe(setupAppDeepLinks)
  safe(setupStartupSplash)
  safe(setupLaunchMenu)
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
