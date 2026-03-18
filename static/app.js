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
  {title:"Repair story: Heat damage recovery", body:"A real repair journey: moisture stacking, trimming, and a 4-week recovery arc."},
  {title:"Protein balance for bounce", body:"How to layer protein and hydration so curls keep their spring."},
  {title:"All‑in‑one product success stories", body:"Fast routines using the all‑in‑one product for shine, softness, and reduced breakage."}
]

  const state = {
    themeIndex: 0,
    blogIndex: 0,
    ariaHistory: [],
    socialLinks: {},
    hairScore: 0
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
    bumpHairScore(1)
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
          window.open(link, "_blank")
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
        renderApp(name)
        openModal("appModal")
      })
    })

  qsa(".gift-card .btn").forEach(btn=>{
    btn.addEventListener("click", ()=>window.open(LINKS.custom, "_blank"))
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

function renderBlog(){
  const post = BLOG_POSTS[state.blogIndex]
  const title = qs("#blogTitle")
  const body = qs("#blogBody")
  if(title) title.textContent = post.title
  if(body) body.textContent = post.body
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
    view.innerHTML = `<p>Tip the team.</p><button class="btn" id="tipOrder">Open Tip</button>`
    qs("#tipOrder").addEventListener("click", ()=>window.open(LINKS.custom, "_blank"))
  }

  select.addEventListener("change", render)
  render()
}

function setupPostActions(){
  const live = qs("#liveStatus")
  const send = qs("#sendSocials")
  const post = qs("#postSocials")
  const paySelect = qs("#paySelect")
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
    if(link){ window.open(link, "_blank"); return true }
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
  if(adCta){ adCta.addEventListener("click", ()=>window.open(LINKS.custom, "_blank")) }
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
      const mapping = {
        "Payment with Evelyn": "evelyn",
        "Tip to Developer": "tip5",
        "Payment to Crystal": "tip10",
        "Tip to Ramlin (Labor)": "tip20"
      }
      const target = mapping[paySelect.value] || "evelyn"
      const select = qs("#paymentSelect")
      if(select){ select.value = target; select.dispatchEvent(new Event("change")) }
      openModal("subscriptionModal")
    })
  }

  if(contactEvelyn){
    contactEvelyn.addEventListener("click", ()=>{
      const phone = (state.socialLinks.evelyn || "829-233-2670").replace(/\D/g,"")
      if(!phone){ toast("Add Evelyn WhatsApp in Settings"); return }
      window.open(`https://wa.me/${phone}?text=Hi%20Evelyn%2C%20I%20need%20help%20with%20my%20order.`,"_blank")
    })
  }

  updateIndicator()
}

function setupOccasion(){
  const actionSel = qs("#occasionAction")
  const applySel = qs("#occasionApply")
  const enjoySel = qs("#occasionEnjoy")
  const weekBoxes = qsa("#weekBoxes .week")
  if(!actionSel || !applySel || !enjoySel || !weekBoxes.length) return

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

  function updateWeek(){
    const text = `${actionSel.value} · ${applySel.value} · ${enjoySel.value}`
    weekBoxes.forEach((box, i)=>{ box.textContent = `Day ${i+1} — ${text}` })
  }
  actionSel.addEventListener("change", updateWeek)
  applySel.addEventListener("change", updateWeek)
  enjoySel.addEventListener("change", updateWeek)
  updateWeek()
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

function setupAria(){
  const btn = qs("#voiceToggle")
  const sphere = qs("#ariaSphere")
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  const greetings = [
    "Hello, how may I help you today with your hair issues?",
    "Hi there! How can I help you with your hair today?",
    "Hey! Tell me what’s going on with your hair and I’ll help.",
    "Welcome back. What hair concern can I solve right now?",
    "Hi! I’m ARIA — how can I support your hair routine today?"
  ]

  function greet(){
    const greetText = greetings[Math.floor(Math.random() * greetings.length)]
    appendAria(`ARIA: ${greetText}`)
    try{
      const utter = new SpeechSynthesisUtterance(greetText)
      utter.rate = 1
      utter.pitch = 1
      utter.lang = qs("#ariaLanguage")?.value || "en-US"
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
    }catch{}
  }

  function startListening(){
    greet()
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
  }

  if(btn){ btn.addEventListener("click", startListening) }
  if(sphere){ sphere.addEventListener("click", startListening) }
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
    qs("#donateLinkBtn").addEventListener("click", ()=>window.open(LINKS.donate, "_blank"))
    return
  }
  if(name === "Contact Anthony"){
    body.innerHTML = `Email: AgentAnthony@supportdr.com<br>Phone: 7043452867`
    return
  }
  if(name === "Snapshot Coder Idea"){
    body.innerHTML = `<div style="margin-bottom:10px;">Paste your recent work and let ARIA score progress, blockers, and next steps.</div><textarea id="coderInput" style="width:100%;min-height:140px;"></textarea><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn" id="coderAnalyze">Analyze with ARIA (GPT 5.2 Codex)</button><button class="btn ghost" id="coderSend">Send Snapshot to Anthony</button></div>`
    qs("#coderAnalyze").addEventListener("click", ()=>toast("ARIA analysis queued"))
    qs("#coderSend").addEventListener("click", ()=>{
      const text = encodeURIComponent(qs("#coderInput").value || "")
      window.open(`mailto:AgentAnthony@supportdr.com?subject=Snapshot%20Coder%20Idea&body=${text}`,"_blank")
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
      window.open(`mailto:AgentAnthony@supportdr.com?subject=Live%20Coder%20Suggestion&body=${text}`,"_blank")
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
    qsa(".level-card").forEach(card=>{
      if(card.dataset.level === level){
        card.style.background = "linear-gradient(135deg, rgba(0,226,255,0.25), rgba(124,124,255,0.25))"
        card.style.border = "1px solid rgba(0,226,255,0.6)"
        card.style.color = "#fff"
      } else {
        card.style.background = "rgba(255,255,255,0.06)"
        card.style.border = "1px solid rgba(255,255,255,0.12)"
      }
    })
    const pro = qs("#proDetails")
    if(pro && level === "pro"){ pro.style.display = "block" }
    return
  }
  if(name === "Shopify Products"){
    body.innerHTML = `Open the full catalog and custom order flow from SupportRD.<br><button class="btn" id="openCustomShop">Open Custom Order</button>`
    qs("#openCustomShop").addEventListener("click", ()=>window.open(LINKS.custom, "_blank"))
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
  safe(setupTabs)
  safe(setupThemeArrows)
  safe(setupModals)
  safe(setupPaymentChooser)
  safe(setupSettings)
  safe(setupPostActions)
  safe(setupOccasion)
  safe(setupScanUpload)
  safe(setupGPS)
  safe(setupAria)
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
      window.open(el.dataset.link, "_blank")
    }
  })
})
