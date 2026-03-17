const qs = (sel) => document.querySelector(sel)
const qsa = (sel) => Array.from(document.querySelectorAll(sel))

const state = {
  scanHistory: [],
  routineHistory: []
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
  el._t = setTimeout(()=>{el.style.display="none"}, 2000)
}

function setupLockedNav(){
  qsa(".locked-btn, .nav-btn.locked").forEach(btn=>{
    btn.addEventListener("click", e=>{
      e.preventDefault()
      toast("Locked navigation in demo")
    })
  })
}

function setupSubToggle(){
  const sw = qs("#subSwitch")
  sw.addEventListener("click", ()=>{
    sw.classList.toggle("active")
    toast(sw.classList.contains("active") ? "Pro enabled" : "Free enabled")
  })
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
    const trending = d.trending || []
    const reorders = d.reorders || []
    qs("#trendingList").innerHTML = trending.length ? trending.map(x=>`<div>${x}</div>`).join("") : "No trending content."
    qs("#reorderList").innerHTML = reorders.length ? reorders.map(x=>`<div>${x}</div>`).join("") : "No reorder suggestions."
    qs("#reorderMini").innerHTML = reorders.length ? reorders.map(x=>`<div>${x}</div>`).join("") : "No reorder suggestions."
  }catch{
    qs("#trendingList").textContent = "Engine unavailable"
    qs("#reorderList").textContent = "Engine unavailable"
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
  qs("#openSeo").addEventListener("click", ()=>qs("#seoModal").style.display = "flex")
  qs("#closeSeo").addEventListener("click", ()=>qs("#seoModal").style.display = "none")
  qs("#openBlog").addEventListener("click", ()=>qs("#blogModal").style.display = "flex")
  qs("#closeBlog").addEventListener("click", ()=>qs("#blogModal").style.display = "none")
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

window.addEventListener("DOMContentLoaded", ()=>{
  loadHistory()
  renderHistory()
  setupLockedNav()
  setupSubToggle()
  setupDragAndDrop()
  setupVoice()
  setupModals()
  setupPwa()
  setupRoutineGen()
  loadProducts()
  loadMarketing()

  qs("#ariaSend").addEventListener("click", ()=>askAria())
  qs("#cameraStart").addEventListener("click", startCamera)
  qs("#scanHairBtn").addEventListener("click", scanHair)
  qs("#findSalons").addEventListener("click", findSalons)
})
