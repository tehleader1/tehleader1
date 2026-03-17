//////////////////////////////////////////////////////
// DRAG DASHBOARD
//////////////////////////////////////////////////////

new Sortable(document.getElementById("dashboard"),{
animation:150
})

//////////////////////////////////////////////////////
// LOAD PRODUCTS
//////////////////////////////////////////////////////

async function loadProducts(){

let r = await fetch("/api/products")
let data = await r.json()

let html = ""

data.forEach(p=>{

html += `
<div>

<img src="${p.image}" width="100%">

<h3>${p.title}</h3>

<p>$${p.price}</p>

<button onclick="buy('${p.variant}')">Buy</button>

</div>
`

})

document.getElementById("products").innerHTML = html

}

//////////////////////////////////////////////////////

async function buy(id){

let r = await fetch("/api/checkout",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({variant:id})
})

let data = await r.json()

window.open(data.url)

}

//////////////////////////////////////////////////////
// CAMERA SCAN
//////////////////////////////////////////////////////

function startCamera(){

navigator.mediaDevices.getUserMedia({video:true})
.then(stream=>{
document.getElementById("camera").srcObject = stream
})

}

//////////////////////////////////////////////////////
// VOICE AI
//////////////////////////////////////////////////////

function startVoice(){

const rec = new webkitSpeechRecognition()

rec.onstart = ()=>{
document.getElementById("voiceIndicator").style.display="block"
}

rec.onresult = e=>{

let text = e.results[0][0].transcript

alert("ARIA heard: " + text)

}

rec.onend = ()=>{
document.getElementById("voiceIndicator").style.display="none"
}

rec.start()

}

//////////////////////////////////////////////////////
// ENGINE STATUS (DASHBOARD)
//////////////////////////////////////////////////////

async function loadEngine(){

let r = await fetch("/api/engine/status")
let data = await r.json()

document.getElementById("engineData").innerHTML = `

SEO Posts Today: ${data.seo_posts_today}<br>
Shopify Products: ${data.shopify_products}<br>
Pinterest Pins: ${data.pinterest_pins}<br>
Reddit Posts: ${data.reddit_posts}<br>
Traffic Today: ${data.traffic_today}<br>
AI Tasks Running: ${data.ai_tasks_running}

<button onclick="openEngine()">View Engine</button>

`

}

//////////////////////////////////////////////////////
// ENGINE POPUP
//////////////////////////////////////////////////////

function openEngine(){

document.getElementById("enginePopup").style.display="flex"

loadBlog()

}

function closeEngine(){

document.getElementById("enginePopup").style.display="none"

}

//////////////////////////////////////////////////////
// LOAD BLOG POSTS
//////////////////////////////////////////////////////

async function loadBlog(){

let r = await fetch("/api/engine/blog")
let posts = await r.json()

let html=""

posts.forEach(p=>{

html += `
<div class="blogPost">

<h3>${p.title}</h3>

<p>${p.date}</p>

<a href="${p.url}" target="_blank">Open</a>

</div>
`

})

document.getElementById("blogList").innerHTML = html

}

//////////////////////////////////////////////////////

loadProducts()
loadEngine()
