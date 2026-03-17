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
  blogIndex: 0,
  ariaHistory: []
}

function loadHistory(){
  try{
    state.scanHistory = JSON.parse(localStorage.getItem("scanHistory") || "[]")
    state.routineHistory = JSON.parse(localStorage.getItem("routineHistory") || "[]")
    state.ariaHistory = JSON.parse(localStorage.getItem("ariaHistory") || "[]")
  }catch{
    state.scanHistory = []
    state.routineHistory = []
    state.ariaHistory = []
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

  const ariaEl = qs("#ariaHistory")
  if(ariaEl){
    ariaEl.innerHTML = state.ariaHistory.length
      ? state.ariaHistory.map(x=>`<div>${x}</div>`).join("")
      : "No history yet."
  }
}

function toast(msg){
  const el = qs("#toast")
  el.textContent = msg
  el.style.display = "block"
  clearTimeout(el._t)
  el._t = setTimeout(()=>{el.style.display="none"}, 2200)
}

async function askAria(message){
  const msg = message.trim()
  if(!msg) return
  appendChat("You", msg)
  try{
    const r = await fetch("/api/aria", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message: msg})
    })
    const d = await r.json()
    appendChat("ARIA", d.reply || "No reply")
  }catch{
    appendChat("ARIA", "AI unavailable")
  }
}

function appendChat(who, text){
  state.ariaHistory.unshift(`${who}: ${text}`)
  if(state.ariaHistory.length > 6) state.ariaHistory.pop()
  localStorage.setItem("ariaHistory", JSON.stringify(state.ariaHistory))
  renderHistory()
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

async function startCamera(){
  try{
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}})
    const vid = qs("#camera")
    if(vid){
      vid.srcObject = stream
    }
  }catch{
    toast("Camera blocked")
  }
}

async function scanHair(){
  try{
    const r = await fetch("/api/hair-scan", {method:"POST"})
    const d = await r.json()
    const stamp = new Date().toLocaleString()
    saveHistory("scanHistory", `Scan ${stamp}: ${d.curl_type}, ${d.hydration}`)
    renderHistory()
  }catch{
    toast("Scan failed")
  }
}

async function loadProducts(){
  const mini = qs("#productsMini")
  try{
    const r = await fetch("/api/products")
    const products = await r.json()
    mini.textContent = products.length ? products.slice(0,3).map(p=>p.title).join(" · ") : "No products yet."
  }catch{
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
      toast("ARIA GPS ready")
    }catch{
      qs("#salonResults").textContent = "Salon lookup failed."
    }
  }, ()=>{
    qs("#salonResults").textContent = "Location blocked."
  })
}

function setupModals(){
  bindOpen("menuGift", "giftModal")
  bindOpen("menuOccasion", "occasionModal")
  bindOpen("menuSubscription", "subscriptionModal")
  bindClose("closeGift", "giftModal")
  bindClose("closeOccasion", "occasionModal")
  bindClose("closeSubscription", "subscriptionModal")
  bindOpen("openSeo", "seoModal")
  bindClose("closeSeo", "seoModal")
  bindClose("closeBlog", "blogModal")
  bindClose("closeApp", "appModal")

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

function setupAriaSphere(){
  const sphere = qs("#ariaSphere")
  sphere.addEventListener("click", ()=>{
    sphere.classList.add("spin")
    setTimeout(()=>sphere.classList.remove("spin"), 500)
  })
}

function setupThemes(){
  const prevSide = qs("#themePrevSide")
  const nextSide = qs("#themeNextSide")

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

  prevSide.addEventListener("click", goPrev)
  nextSide.addEventListener("click", goNext)

  function applyTheme(idx){
    const theme = THEMES[idx]
    document.body.className = `theme-${theme.id}`
    localStorage.setItem("theme", theme.id)
  }
}

window.addEventListener("DOMContentLoaded", ()=>{
  loadHistory()
  renderHistory()
  setupTabs()
  setupModals()
  setupPwa()
  setupAriaSphere()
  setupThemes()
  loadProducts()
  loadMarketing()

  qs("#findSalons").addEventListener("click", findSalons)
  qs("#gpsHandsFree").addEventListener("click", ()=>{
    qs("#tab-handsfree").classList.add("active")
    qsa(".tab-panel").forEach(p=>p.id !== "tab-handsfree" && p.classList.remove("active"))
    qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
    qsa(".tab-btn").find?.(b=>b.dataset.tab==="handsfree")
  })
})
