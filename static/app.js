async function askAria(){

let msg=document.getElementById("ariaInput").value

let r=await fetch("/api/aria",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({message:msg})
})

let d=await r.json()

document.getElementById("ariaReply").innerText=d.reply

}

function startCamera(){

navigator.mediaDevices.getUserMedia({video:true})
.then(stream=>{
document.getElementById("camera").srcObject=stream
})

}

async function scanHair(){

let r=await fetch("/api/hair-scan",{method:"POST"})
let d=await r.json()

document.getElementById("scanResults").innerText=
"Damage:"+d.damage+" Hydration:"+d.hydration

}

async function loadProducts(){

let r=await fetch("/api/products")
let p=await r.json()

let html=""

p.forEach(x=>{

html+=`
<div>
<img src="${x.image}" width="120">
<p>${x.title}</p>
<p>$${x.price}</p>
</div>
`

})

document.getElementById("products").innerHTML=html

}

loadProducts()
