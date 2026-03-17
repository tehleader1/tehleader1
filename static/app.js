const qs = (sel) => document.querySelector(sel)
const qsa = (sel) => Array.from(document.querySelectorAll(sel))

const THEMES = [
  {id:"aurora", label:"Aurora"},
  {id:"ice", label:"Ice"},
  {id:"ember", label:"Ember"},
  {id:"carbon", label:"Carbon"},
  {id:"nebula", label:"Nebula"}
]

const DEFAULT_THEME = "aurora"

const BLOG_POSTS = [
  {title:"Repair story: Heat damage recovery", body:"A real repair journey: moisture stacking, trimming, and a 4-week recovery arc."},
  {title:"Protein balance for bounce", body:"How to layer protein and hydration so curls keep their spring."},
  {title:"All‑in‑one product success stories", body:"Fast routines using the all‑in‑one product for shine, softness, and reduced breakage."}
]

const state = {
  scanHistory: [],
  routineHistory: [],
  drivingMode: false,
  themeIndex: 0,
  blogIndex: 0
}

function loadHistory(){
  try{
    state.scanHistory = JSON.parse(localStorage.getItem("scanHistory") || "[]")
    state.routineHistory = JSON.parse(localStorage.getItem("routineHistory") || "[]")
  }catch{
    state.scanHistory = []
    state.routineHistory = []
  }
}

function saveHistory(key, item){
  state[key].unshift(item)
  if(state[key].length > 6) state[key].pop()
  localStorage.setItem(key, JSON.stringify(state[key]))
}

function renderHistory(){
  const scanEl = qs("#scanHistory")
  scanEl.innerHTML = state.scanHistory.length
    ? state.scanHistory.map(x=>`<div>${x}</div>`).join("")
    : "No scans yet."

  const routineEl = qs("#routineMini")
  routineEl.innerHTML = state.routineHistory.length
    ? state.routineHistory.map(x=>`<div>${x}</div>`).join("")
    : "No routines yet."
}

function toast(msg){
  const el = qs("#toast")
  el.textContent = msg
  el.style.display = "block"
  clearTimeout(el._t)
  el._t = setTimeout(()=>{el.style.display="none"}, 2200)
}

function setupDragAndDrop(){
  const grid = qs("#widgetGrid")
  let dragEl = null

  grid.addEventListener("pointerdown", e=>{
    const card = e.target.closest(".widget")
    if(!card) return
    dragEl = card
    card.classList.add("dragging")
    card.setPointerCapture(e.pointerId)
  })

  grid.addEventListener("pointermove", e=>{
    if(!dragEl) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const target = el && el.closest(".widget")
    if(target && target !== dragEl && target.parentElement === grid){
      const rect = target.getBoundingClientRect()
      const insertBefore = e.clientY < rect.top + rect.height / 2
      grid.insertBefore(dragEl, insertBefore ? target : target.nextSibling)
    }
  })

  grid.addEventListener("pointerup", ()=>{
    if(!dragEl) return
    dragEl.classList.remove("dragging")
    dragEl = null
  })
}

async function askAria(message){
  const input = qs("#ariaInput")
  const msg = message || input.value.trim()
  if(!msg) return
  input.value = ""
  appendChat("You", msg)
  try{
    const r = await fetch("/api/aria", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message: msg})
    })
    const d = await r.json()
    appendChat("ARIA", d.reply || "No reply")
    showTipIfAllowed()
  }catch{
    appendChat("ARIA", "AI unavailable")
  }
}

function appendChat(who, text){
  const log = qs("#ariaLog")
  const div = document.createElement("div")
  div.className = "chat-bubble"
  div.innerHTML = `<strong>${who}</strong>${text}`
  log.appendChild(div)
  log.scrollTop = log.scrollHeight
}

function showTipIfAllowed(){
  const tip = qs("#tipBox")
  if(state.drivingMode){
    tip.style.display = "none"
    return
  }
  tip.style.display = "block"
}

function setupVoice(){
  const toggle = qs("#voiceToggle")
  let recognition = null
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if(SpeechRecognition){
    recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = "en-US"
    recognition.onresult = (e)=>{
      const text = e.results[0][0].transcript
      askAria(text)
    }
    recognition.onstart = ()=>toast("Listening...")
    recognition.onend = ()=>toast("Voice off")
  }

  toggle.addEventListener("click", ()=>{
    if(!recognition){
      toast("Voice not supported")
      return
    }
    recognition.start()
  })
}

async function startCamera(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}})
    qs("#camera").srcObject = stream
  }catch{
    toast("Camera blocked")
  }
}

async function scanHair(){
  try{
    const r = await fetch("/api/hair-scan", {method:"POST"})
    const d = await r.json()
    const html = `Curl type: ${d.curl_type}<br>Damage: ${d.damage}<br>Hydration: ${d.hydration}<br><br>Routine:<br>${d.routine.join("<br>")}`
    qs("#scanResults").innerHTML = html
    const stamp = new Date().toLocaleString()
    saveHistory("scanHistory", `Scan ${stamp}: ${d.curl_type}, ${d.hydration}`)
    renderHistory()
  }catch{
    qs("#scanResults").textContent = "Scan failed"
  }
}

async function loadProducts(){
  const list = qs("#products")
  const mini = qs("#productsMini")
  try{
    const r = await fetch("/api/products")
    const products = await r.json()
    if(!products.length){
      list.innerHTML = "<p class=\"mini-list\">No products available.</p>"
      mini.textContent = "No products yet."
      return
    }
    list.innerHTML = products.map(p=>`
      <div class="product">
        <img src="${p.image}" alt="${p.title}">
        <h4>${p.title}</h4>
        <p>$${p.price}</p>
        <button class="btn">Buy</button>
      </div>
    `).join("")
    mini.innerHTML = products.slice(0,3).map(p=>`<div>${p.title}</div>`).join("")
  }catch{
    list.innerHTML = "<p class=\"mini-list\">Unable to load products.</p>"
    mini.textContent = "Unable to load products."
  }
}

async function loadMarketing(){
  try{
    const r = await fetch("/api/engine/marketing")
    const d = await r.json()
    const reorders = d.reorders || []
    qs("#reorderMini").innerHTML = reorders.length ? reorders.map(x=>`<div>${x}</div>`).join("") : "No reorder suggestions."
  }catch{
    qs("#reorderMini").textContent = "Engine unavailable"
  }
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
      openModal("gpsModal")
      toast("ARIA GPS ready")
    }catch{
      qs("#salonResults").textContent = "Salon lookup failed."
    }
  }, ()=>{
    qs("#salonResults").textContent = "Location blocked."
  })
}

function setupModals(){
  bindOpen("openSeo", "seoModal")
  bindClose("closeSeo", "seoModal")
  bindOpen("giftShopOpen", "giftModal")
  bindClose("closeGift", "giftModal")
  bindOpen("menuGift", "giftModal")
  bindOpen("menuOccasion", "occasionModal")
  bindOpen("occasionOpen", "occasionModal")
  bindOpen("occasionOpen2", "occasionModal")
  bindOpen("occasionOpen3", "occasionModal")
  bindClose("closeOccasion", "occasionModal")
  bindOpen("subscriptionBanner", "subscriptionModal")
  bindClose("closeSubscription", "subscriptionModal")
  bindClose("closeBlog", "blogModal")
  bindClose("closeApp", "appModal")
  bindClose("closeGps", "gpsModal")
  bindClose("closeHands", "handsFreeModal")

  qsa(".blog-post").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.blogIndex = Number(btn.dataset.post)
      renderBlog()
      openModal("blogModal")
    })
  })

  qs("#blogPrev").addEventListener("click", ()=>{
    state.blogIndex = (state.blogIndex - 1 + BLOG_POSTS.length) % BLOG_POSTS.length
    renderBlog()
  })

  qs("#blogNext").addEventListener("click", ()=>{
    state.blogIndex = (state.blogIndex + 1) % BLOG_POSTS.length
    renderBlog()
  })

  qsa(".app-card").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      qs("#appTitle").textContent = btn.dataset.app
      qs("#appBody").textContent = "Open module: " + btn.dataset.app
      openModal("appModal")
    })
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

function setupRoutineGen(){
  qs("#routineGen").addEventListener("click", async ()=>{
    await askAria("Generate a simple hair routine based on hydration and damage signals.")
    const stamp = new Date().toLocaleString()
    saveHistory("routineHistory", `Routine ${stamp}: Generated by ARIA`)
    renderHistory()
  })
}

function setupAriaSphere(){
  const sphere = qs("#ariaSphere")
  sphere.addEventListener("click", ()=>{
    sphere.classList.add("spin")
    setTimeout(()=>sphere.classList.remove("spin"), 500)
    qs("#aria").scrollIntoView({behavior:"smooth", block:"start"})
  })
}

function setupDriveMode(){
  const btn = qs("#driveMode")
  const hands = qs("#handsFree")
  btn.addEventListener("click", ()=>{
    state.drivingMode = !state.drivingMode
    btn.classList.toggle("active", state.drivingMode)
    toast(state.drivingMode ? "Driving hands-free mode" : "Hands-free mode")
    if(state.drivingMode){
      qs("#tipBox").style.display = "none"
    }
  })
  hands.addEventListener("click", ()=>openModal("handsFreeModal"))
}

function setupLoginGate(){
  const overlay = qs("#loginOverlay")
  const now = Date.now()
  let firstSeen = localStorage.getItem("firstSeen")
  if(!firstSeen){
    localStorage.setItem("firstSeen", String(now))
    firstSeen = String(now)
  }
  const days = (now - Number(firstSeen)) / (1000*60*60*24)
  if(days > 2){
    overlay.style.display = "flex"
  }else{
    overlay.style.display = "none"
  }
}

function setupThemes(){
  const prev = qs("#themePrev")
  const next = qs("#themeNext")
  const prevSide = qs("#themePrevSide")
  const nextSide = qs("#themeNextSide")
  const label = qs("#themeLabel")

  const saved = localStorage.getItem("theme")
  const startTheme = saved || DEFAULT_THEME
  const index = THEMES.findIndex(t=>t.id === startTheme)
  state.themeIndex = index >= 0 ? index : 0
  applyTheme(state.themeIndex)

  function goPrev(){
    state.themeIndex = (state.themeIndex - 1 + THEMES.length) % THEMES.length
    applyTheme(state.themeIndex)
  }

  function goNext(){
    state.themeIndex = (state.themeIndex + 1) % THEMES.length
    applyTheme(state.themeIndex)
  }

  prev.addEventListener("click", goPrev)
  next.addEventListener("click", goNext)
  prevSide.addEventListener("click", goPrev)
  nextSide.addEventListener("click", goNext)

  function applyTheme(idx){
    const theme = THEMES[idx]
    document.body.className = `theme-${theme.id}`
    label.textContent = theme.label
    localStorage.setItem("theme", theme.id)
  }
}

window.addEventListener("DOMContentLoaded", ()=>{
  loadHistory()
  renderHistory()
  setupDragAndDrop()
  setupVoice()
  setupModals()
  setupPwa()
  setupRoutineGen()
  setupAriaSphere()
  setupDriveMode()
  setupLoginGate()
  setupThemes()
  loadProducts()
  loadMarketing()

  qs("#ariaSend").addEventListener("click", ()=>askAria())
  qs("#cameraStart").addEventListener("click", startCamera)
  qs("#scanHairBtn").addEventListener("click", scanHair)
  qs("#findSalons").addEventListener("click", findSalons)
  qs("#menuPost").addEventListener("click", ()=>qs("#centerStage").scrollIntoView({behavior:"smooth"}))
  qs("#menuAria").addEventListener("click", ()=>qs("#aria").scrollIntoView({behavior:"smooth"}))
})
