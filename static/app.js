function showPanel(panel){

document.querySelectorAll(".panel").forEach(p=>{
p.style.display="none"
})

document.getElementById(panel).style.display="block"

}

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

function startCamera(){

navigator.mediaDevices.getUserMedia({video:true})
.then(stream=>{
document.getElementById("camera").srcObject=stream
})

}

async function askAria(){

let input = document.getElementById("ariaInput").value

let r = await fetch("/api/aria",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({message:input})
})

let data = await r.json()

document.getElementById("ariaReply").innerText = data.reply

}

loadProducts()
