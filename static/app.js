////////////////////////////////////////////////
// DRAG DASHBOARD
////////////////////////////////////////////////

new Sortable(document.getElementById("dashboard"),{
animation:150,
ghostClass:"dragging",

onEnd:function(){

let order=[...document.querySelectorAll(".widget")]
.map(el=>el.id || el.innerText)

localStorage.setItem("layout",JSON.stringify(order))

}
})

////////////////////////////////////////////////
// RESTORE LAYOUT
////////////////////////////////////////////////

const saved = localStorage.getItem("layout")

if(saved){

let order = JSON.parse(saved)
let container = document.getElementById("dashboard")

order.forEach(name=>{
let el = document.getElementById(name)
if(el) container.appendChild(el)
})

}

////////////////////////////////////////////////
// LOAD PRODUCTS
////////////////////////////////////////////////

async function loadProducts(){

let r = await fetch("/api/products")
let data = await r.json()

let html = ""

data.forEach(p=>{

html += `
<div>

<img src="${p.image}">

<h3>${p.title}</h3>

<p>$${p.price}</p>

<button onclick="buy('${p.variant}')">
Buy
</button>

</div>
`

})

document.getElementById("products").innerHTML = html

}

////////////////////////////////////////////////

async function buy(variant){

let r = await fetch("/api/checkout",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({variant:variant})
})

let data = await r.json()

window.open(data.url)

}

////////////////////////////////////////////////

loadProducts()

////////////////////////////////////////////////
// SERVICE WORKER
////////////////////////////////////////////////

if("serviceWorker" in navigator){

navigator.serviceWorker.register("/sw.js")

}
