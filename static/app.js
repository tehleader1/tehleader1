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
  ariaHistory: [],
  socialLinks: {}
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

  qsa(".app-card").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const link = btn.dataset.link
      if(link){
        window.open(link, "_blank")
        return
      }
      const name = btn.dataset.app
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
      renderApp(name)
      openModal("appModal")
    })
  })

  qsa(".gift-card .btn").forEach(btn=>{
    btn.addEventListener("click", ()=>window.open(LINKS.custom, "_blank"))
  })
}

function setupAppsDock(){
  const row = qs("#appsRow")
  const select = qs("#appSwapSelect")
  if(!row || !select) return

  const allApps = [
    "Blog",
    "Snapshot Coder Idea",
    "Live Coder Suggestions",
    "Donate to the Poor · Auto Dissolve Bar",
    "Settings",
    "Contact Anthony · Developer"
  ]

  select.innerHTML = '<option value=\"\">Replace Selected App…</option>' + allApps.map(a=>`<option value=\"${a}\">${a}</option>`).join("")

  let activeCard = null
  row.querySelectorAll(".app-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      row.querySelectorAll(".app-card").forEach(c=>c.classList.remove("active"))
      card.classList.add("active")
      activeCard = card
    })
  })

  select.addEventListener("change", ()=>{
    if(!activeCard || !select.value) return
    activeCard.textContent = select.value
    activeCard.dataset.app = select.value.replace(" · Developer","Contact Anthony")
    if(select.value.includes("Donate")){\n      activeCard.dataset.link = LINKS.donate\n    } else {\n      activeCard.dataset.link = \"\"\n    }\n    select.value = \"\"\n    toast(\"App replaced\")\n  })\n\n+  // drag to reorder\n+  let dragEl = null\n+  row.addEventListener(\"pointerdown\", e=>{\n+    const card = e.target.closest(\".app-card\")\n+    if(!card) return\n+    dragEl = card\n+    card.classList.add(\"dragging\")\n+    card.setPointerCapture(e.pointerId)\n+  })\n+  row.addEventListener(\"pointermove\", e=>{\n+    if(!dragEl) return\n+    const el = document.elementFromPoint(e.clientX, e.clientY)\n+    const target = el && el.closest(\".app-card\")\n+    if(target && target !== dragEl && target.parentElement === row){\n+      const rect = target.getBoundingClientRect()\n+      const insertBefore = e.clientX < rect.left + rect.width / 2\n+      row.insertBefore(dragEl, insertBefore ? target : target.nextSibling)\n+    }\n+  })\n+  row.addEventListener(\"pointerup\", ()=>{\n+    if(!dragEl) return\n+    dragEl.classList.remove(\"dragging\")\n+    dragEl = null\n+  })\n+}\n+\n window.addEventListener("DOMContentLoaded", ()=>{
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
  qs("#postSocials").addEventListener("click", ()=>{
    const links = Object.values(state.socialLinks).filter(Boolean)
    if(!links.length){
      toast("No social links saved yet")
      return
    }
    links.forEach((l)=>window.open(l, "_blank"))
    toast("Post sent to all socials")
  })
  qs("#sendSocials").addEventListener("click", ()=>toast("Live status prepared for socials"))
  qs("#liveStatus").addEventListener("click", ()=>toast("Live status set"))
  qs("#contactEvelyn").addEventListener("click", ()=>openModal("customOrderModal"))
  qs("#adCta").addEventListener("click", ()=>window.open(LINKS.custom, "_blank"))

  const paySelect = qs("#paySelect")
  paySelect.addEventListener("change", ()=>{
    openModal("subscriptionModal")
    const mapping = {
      "Payment with Evelyn": "evelyn",
      "Tip to Developer": "tip5",
      "Payment to Crystal": "tip10",
      "Tip to Ramlin (Labor)": "tip20"
    }
    const target = mapping[paySelect.value] || "evelyn"
    qs("#paymentSelect").value = target
    qs("#paymentSelect").dispatchEvent(new Event("change"))
  })

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
  const map = qs("#gpsMap")
  if(map){
    map.src = "https://www.openstreetmap.org/export/embed.html?bbox=-74.1%2C40.6%2C-73.7%2C40.9&layer=mapnik"
  }

  qs("#findSalons").addEventListener("click", ()=>{
    qs("#salonResults").textContent = "Finding nearby salons..."
    navigator.geolocation.getCurrentPosition((pos)=>{
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      if(map){
        const bbox = `${lon-0.1}%2C${lat-0.08}%2C${lon+0.1}%2C${lat+0.08}`
        map.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`
      }
      findSalons(lat, lon)
    }, ()=>{
      qs("#salonResults").textContent = "Location blocked."
    })
  })

  qs("#gpsHandsFree").addEventListener("click", ()=>{
    qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
    qsa(".tab-panel").forEach(p=>p.classList.remove("active"))
    qs(".tab-btn[data-tab='handsfree']").classList.add("active")
    qs("#tab-handsfree").classList.add("active")
  })
}

async function findSalons(lat, lon){
  try{
    const r = await fetch("/api/salons",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({lat, lon})
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
  qs("#openReel").addEventListener("click", ()=>openModal("reelModal"))
}

function setupCamera(){
  let stream = null
  qs("#cameraChip").addEventListener("click", ()=>openModal("cameraModal"))
  qs("#startCamera").addEventListener("click", async ()=>{
    try{
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}})
      qs("#cameraView").srcObject = stream
    }catch{
      toast("Camera blocked")
    }
  })
  qs("#stopCamera").addEventListener("click", ()=>{
    if(stream){
      stream.getTracks().forEach(t=>t.stop())
      stream = null
    }
  })
}

function setupSettings(){
  const saved = JSON.parse(localStorage.getItem("socialLinks") || "{}")
  state.socialLinks = saved
  qs("#setName").value = saved.name || ""
  qs("#setEmail").value = saved.email || ""
  qs("#setPhone").value = saved.phone || ""
  qs("#setIG").value = saved.ig || ""
  qs("#setTikTok").value = saved.tiktok || ""
  qs("#setFB").value = saved.fb || ""
  qs("#setYT").value = saved.yt || ""
  qs("#setX").value = saved.x || ""

  qs("#saveSettings").addEventListener("click", ()=>{
    const data = {
      name: qs("#setName").value.trim(),
      email: qs("#setEmail").value.trim(),
      phone: qs("#setPhone").value.trim(),
      ig: qs("#setIG").value.trim(),
      tiktok: qs("#setTikTok").value.trim(),
      fb: qs("#setFB").value.trim(),
      yt: qs("#setYT").value.trim(),
      x: qs("#setX").value.trim()
    }
    state.socialLinks = data
    localStorage.setItem("socialLinks", JSON.stringify(data))
    toast("Settings saved")
  })
}

function renderApp(name){
  const body = qs("#appBody")
  if(name === "Contact Anthony"){
    body.innerHTML = `Email: AgentAnthony@supportdr.com<br>Phone: 7043452867`
    return
  }
  if(name === "Snapshot Coder Idea"){
    body.innerHTML = `<div style="margin-bottom:10px;">Paste your recent work and let ARIA score progress, blockers, and next steps.</div><textarea id="coderInput" style="width:100%;min-height:140px;"></textarea><button class="btn" id="coderAnalyze">Analyze with ARIA (GPT‑5.2 Codex)</button>`
    qs("#coderAnalyze").addEventListener("click", ()=>toast("ARIA analysis queued"))
    return
  }
  if(name === "Live Coder Suggestions"){
    body.innerHTML = `Add your recent history here to get guidance and roadmap ideas.`
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

async function loadProducts(){
  const mini = qs("#productsMini")
  if(!mini) return
  try{
    const r = await fetch("/api/products")
    const products = await r.json()
    if(!products.length){
      mini.textContent = "Set SHOPIFY_STORE + STOREFRONT token to load products."
      return
    }
    mini.innerHTML = products.slice(0,3).map(p=>`<div>${p.title} · $${p.price}</div>`).join("")
  }catch{
    mini.textContent = "Shopify products unavailable."
  }
}

function setupFamilyMode(){
  const toggle = qs("#familyToggle")
  if(!toggle) return
  const saved = localStorage.getItem("familyMode") === "on"
  toggle.checked = saved
  document.body.classList.toggle("family-mode", saved)
  toggle.addEventListener("change", ()=>{
    const on = toggle.checked
    document.body.classList.toggle("family-mode", on)
    localStorage.setItem("familyMode", on ? "on" : "off")
    toast(on ? "Family Friendly Mode On" : "Family Friendly Mode Off")
    if(on){
      // Route to primary family-friendly page
      window.location.href = "https://supportrd.com"
    }
  })
}

window.addEventListener("DOMContentLoaded", ()=>{
  const savedHistory = JSON.parse(localStorage.getItem("ariaHistory") || "[]")
  state.ariaHistory = savedHistory
  const ariaEl = qs("#ariaHistory")
  if(ariaEl){
    ariaEl.innerHTML = state.ariaHistory.length ? state.ariaHistory.map(x=>`<div>${x}</div>`).join("") : "No history yet."
  }

  const safe = (fn)=>{ try{ fn() }catch(e){ console.error(e) } }
  safe(setupTabs)
  safe(setupThemeArrows)
  safe(setupModals)
  safe(setupPaymentChooser)
  safe(setupPostActions)
  safe(setupScanUpload)
  safe(setupGPS)
  safe(setupAria)
  safe(setupSEOLogs)
  safe(setupReel)
  safe(setupCamera)
  safe(setupSettings)
  safe(setupPwa)
  safe(setupFamilyMode)
  safe(setupAppsDock)
  safe(loadProducts)

  // Fallback: open any data-link button
  document.body.addEventListener("click", (e)=>{
    const el = e.target.closest("[data-link]")
    if(el && el.dataset.link){
      window.open(el.dataset.link, "_blank")
    }
  })
})
