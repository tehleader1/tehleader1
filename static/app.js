////////////////////////////////////////
// NAVIGATION
////////////////////////////////////////

function showPanel(panel){

document.querySelectorAll(".panel").forEach(p=>{
p.style.display="none"
})

document.getElementById(panel).style.display="block"

document.querySelectorAll(".navItem").forEach(n=>{
n.classList.remove("active")
})

document.getElementById("nav-"+panel).classList.add("active")

}

////////////////////////////////////////
// PRODUCTS
////////////////////////////////////////

async function loadProducts(){

let r = await fetch("/api/products")
let data = await r.json()

let html=""

data.forEach(p=>{

html+=`
<div class="product">

<img src="${p.image}">

<h3>${p.title}</h3>

<p>$${p.price}</p>

<button onclick="buy('${p.variant}')">
Buy
</button>

</div>
`

})

document.getElementById("products").innerHTML=html

}

async function buy(v){

let r = await fetch("/api/checkout",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({variant:v})
})

let d = await r.json()

window.open(d.url)

}

////////////////////////////////////////
// CAMERA
////////////////////////////////////////

function startCamera(){

navigator.mediaDevices.getUserMedia({video:true})
.then(stream=>{
document.getElementById("camera").srcObject=stream
})

}

////////////////////////////////////////
// VOICE
////////////////////////////////////////

function startVoice(){

const rec = new webkitSpeechRecognition()

rec.onstart=()=>{
document.getElementById("voiceIndicator").style.display="block"
}

rec.onresult=e=>{
let t=e.results[0][0].transcript
alert("ARIA heard: "+t)
}

rec.onend=()=>{
document.getElementById("voiceIndicator").style.display="none"
}

rec.start()

}

////////////////////////////////////////
// ENGINE BLOG
////////////////////////////////////////

function openEngine(){

document.getElementById("enginePopup").style.display="flex"
loadBlog()

}

function closeEngine(){
document.getElementById("enginePopup").style.display="none"
}

async function loadBlog(){

let r = await fetch("/api/engine/blog")
let posts = await r.json()

let html=""

posts.forEach(p=>{
html+=`
<div class="blogPost">

<h3>${p.title}</h3>
<p>${p.date}</p>

<a href="${p.url}" target="_blank">
Read Story
</a>

</div>
`
})

document.getElementById("blogList").innerHTML=html

}

////////////////////////////////////////

loadProducts()

showPanel("feed")
