const qs = (sel) => document.querySelector(sel)
const qsa = (sel) => Array.from(document.querySelectorAll(sel))

const THEMES = ["aurora","ice","ember","carbon","nebula"]
const DEFAULT_THEME = "aurora"

const LINKS = {
  premium: "https://supportrd.com/products/hair-advisor-premium",
  pro: "https://supportrd.com/products/professional-hair-advisor",
  donate: "https://supportrd.com/products/auto-dissolve-soap-bar",
  custom: "https://supportrd.com/pages/custom-order"
}

const BLOG_POSTS = [
  {title:"Repair story: Heat damage recovery", body:"A real repair journey: moisture stacking, trimming, and a 4-week recovery arc."},
  {title:"Protein balance for bounce", body:"How to layer protein and hydration so curls keep their spring."},
  {title:"All‑in‑one product success stories", body:"Fast routines using the all‑in‑one product for shine, softness, and reduced breakage."}
]

const state = {
  themeIndex: 0,
  blogIndex: 0,
  ariaHistory: []
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

async function askAria(msg){
  if(!msg) return
  appendAria(`You: ${msg}`)
  try{
    const r = await fetch("/api/aria",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message: msg})
    })
    const d = await r.json()
    appendAria(`ARIA: ${d.reply || "AI unavailable"}`)
  }catch{
    appendAria("ARIA: AI unavailable")
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
    document.body.className = `theme-${THEMES[state.themeIndex]}`
    localStorage.setItem("theme", THEMES[state.themeIndex])
  }
}

function setupModals(){
  bindOpen("menuOccasion", "occasionModal")
  bindOpen("menuGift", "giftModal")
  bindOpen("menuSubscription", "subscriptionModal")
  bindClose("closeOccasion", "occasionModal")
  bindClose("closeGift", "giftModal")
  bindClose("closeSubscription", "subscriptionModal")
  bindOpen("openSeo", "seoModal")
  bindClose("closeSeo", "seoModal")
  bindClose("closeBlog", "blogModal")
  bindClose("closeApp", "appModal")
  bindClose("closeCustomOrder", "customOrderModal")
  bindClose("closeReel", "reelModal")

  qsa(".blog-post").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.blogIndex = Number(btn.dataset.post)
      renderBlog()
      openModal("blogModal")
    })
  })

  qs("#blogPrev").addEventListener("click", ()=>{state.blogIndex = (state.blogIndex - 1 + BLOG_POSTS.length) % BLOG_POSTS.length; renderBlog()})
  qs("#blogNext").addEventListener("click", ()=>{state.blogIndex = (state.blogIndex + 1) % BLOG_POSTS.length; renderBlog()})

  qsa(".app-card").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const link = btn.dataset.link
      if(link){
        window.open(link, "_blank")
        return
      }
      renderApp(btn.dataset.app)
      openModal("appModal")
    })
  })

  qsa(".gift-card .btn").forEach(btn=>{
    btn.addEventListener("click", ()=>window.open(LINKS.custom, "_blank"))
  })
}

function openModal(id){
  qs("#" + id).style.display = "flex"
}

function bindOpen(triggerId, modalId){
  const el = qs("#" + triggerId)
  if(el){
    el.addEventListener("click", ()=>openModal(modalId))
  }
}

function bindClose(triggerId, modalId){
  const el = qs("#" + triggerId)
  if(el){
    el.addEventListener("click", ()=>qs("#" + modalId).style.display = "none")
  }
}

function renderBlog(){
  const post = BLOG_POSTS[state.blogIndex]
  qs("#blogTitle").textContent = post.title
  qs("#blogBody").textContent = post.body
}

function setupPaymentChooser(){
  const select = qs("#paymentSelect")
  const view = qs("#paymentView")

  function render(){
    const val = select.value
    if(val === "evelyn"){
      view.innerHTML = `<p>Custom order with Evelyn.</p><button class="btn" id="openCustomOrder">Open Custom Order</button>`
      qs("#openCustomOrder").addEventListener("click", ()=>openModal("customOrderModal"))
      return
    }
    if(val === "premium"){
      view.innerHTML = `<p>$35 PREMIUM subscription.</p><button class="btn" id="goPremium">Pay $35</button>`
      qs("#goPremium").addEventListener("click", ()=>window.open(LINKS.premium, "_blank"))
      return
    }
    if(val === "pro"){
      view.innerHTML = `<p>$50 PROFESSIONAL subscription.</p><button class="btn" id="goPro">Pay $50</button>`
      qs("#goPro").addEventListener("click", ()=>window.open(LINKS.pro, "_blank"))
      return
    }
    view.innerHTML = `<p>Thanks for supporting. Tips go through custom order.</p><button class="btn" id="goTip">Send Tip</button>`
    qs("#goTip").addEventListener("click", ()=>window.open(LINKS.custom, "_blank"))
  }

  select.addEventListener("change", render)
  render()
}

function setupPostActions(){
  qs("#postSocials").addEventListener("click", ()=>toast("Post sent to all socials"))
  qs("#sendSocials").addEventListener("click", ()=>toast("Live status prepared for socials"))
  qs("#liveStatus").addEventListener("click", ()=>toast("Live status set"))
  qs("#payEvelyn").addEventListener("click", ()=>openModal("subscriptionModal"))
  qs("#contactEvelyn").addEventListener("click", ()=>window.open(LINKS.custom, "_blank"))
  qs("#adCta").addEventListener("click", ()=>window.open(LINKS.custom, "_blank"))

  qsa(".scan-pill").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const tag = btn.dataset.aria
      const textarea = qs("#postInput")
      textarea.value = `Hair check: ${tag}. Please recommend routine and product match.`
      beep(960, 140)
      askAria(`My issue is ${tag}. Suggest a routine and product.`)
    })
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

function setupGPS(){
  qs("#findSalons").addEventListener("click", findSalons)
  qs("#gpsHandsFree").addEventListener("click", ()=>{
    qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
    qsa(".tab-panel").forEach(p=>p.classList.remove("active"))
    qs(".tab-btn[data-tab='handsfree']").classList.add("active")
    qs("#tab-handsfree").classList.add("active")
  })
}

async function findSalons(){
  qs("#salonResults").textContent = "Finding nearby salons..."
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      const r = await fetch("/api/salons",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({lat:pos.coords.latitude,lon:pos.coords.longitude})
      })
      const salons = await r.json()
      if(!salons.length){
        qs("#salonResults").textContent = "No salons found."
        return
      }
      qs("#salonResults").innerHTML = salons.map(s=>`<div>${s.name} - ${s.distance} mi</div>`).join("")
    }catch{
      qs("#salonResults").textContent = "Salon lookup failed."
    }
  }, ()=>{
    qs("#salonResults").textContent = "Location blocked."
  })
}

function setupAria(){
  const btn = qs("#voiceToggle")
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

  btn.addEventListener("click", ()=>{
    beep(720, 120)
    if(!SpeechRecognition){
      toast("Voice not supported")
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = qs("#ariaLanguage")?.value || "en-US"
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onstart = ()=>toast("ARIA listening...")
    rec.onresult = (e)=>{
      const text = e.results[0][0].transcript
      askAria(text)
    }
    rec.onerror = ()=>toast("Voice error")
    rec.start()
  })
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

function setupSEOLogs(){
  const stream = qs("#logStream")
  let timer = null

  qs("#openSeo").addEventListener("click", ()=>{
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

  qs("#closeSeo").addEventListener("click", ()=>{
    if(timer) clearInterval(timer)
  })
}

function setupReel(){
  qs("#openReel").addEventListener("click", async ()=>{
    openModal("reelModal")
    try{
      const r = await fetch("/static/reel.html")
      if(!r.ok) throw new Error("missing")
      const html = await r.text()
      qs("#reelEmbed").innerHTML = html
    }catch{
      qs("#reelEmbed").textContent = "Reel file not loaded yet."
    }
  })
}

function renderApp(name){
  const body = qs("#appBody")
  if(name === "Contact Anthony"){
    body.innerHTML = `Email: AgentAnthony@supportdr.com<br>Phone: 7043452867`
    return
  }
  if(name === "Settings"){
    body.innerHTML = `Name, email, reset password controls coming soon.`
    return
  }
  if(name === "Snapshot Coder Idea"){
    body.innerHTML = `<textarea id="coderInput" style="width:100%;min-height:120px;"></textarea><button class="btn" id="coderAnalyze">Analyze with ARIA (GPT‑5.2 Codex)</button>`
    qs("#coderAnalyze").addEventListener("click", ()=>toast("ARIA analysis queued"))
    return
  }
  if(name === "Live Coder Suggestions"){
    body.innerHTML = `Add your recent history here to get guidance.`
    return
  }
  body.textContent = name
}

function setupPwa(){
  let deferredPrompt = null
  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault()
    deferredPrompt = e
    qs("#installBtn").style.display = "inline-flex"
  })

  qs("#installBtn").addEventListener("click", async ()=>{
    if(!deferredPrompt) return
    deferredPrompt.prompt()
    deferredPrompt = null
    qs("#installBtn").style.display = "none"
  })

  if("serviceWorker" in navigator){
    navigator.serviceWorker.register("/sw.js")
  }
}

window.addEventListener("DOMContentLoaded", ()=>{
  const saved = JSON.parse(localStorage.getItem("ariaHistory") || "[]")
  state.ariaHistory = saved
  const ariaEl = qs("#ariaHistory")
  if(ariaEl){
    ariaEl.innerHTML = state.ariaHistory.length ? state.ariaHistory.map(x=>`<div>${x}</div>`).join("") : "No history yet."
  }

  setupTabs()
  setupThemeArrows()
  setupModals()
  setupPaymentChooser()
  setupPostActions()
  setupScanUpload()
  setupGPS()
  setupAria()
  setupSEOLogs()
  setupReel()
  setupPwa()
})
