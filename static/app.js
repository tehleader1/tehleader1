async function scanHair(){

let r=await fetch("/api/hair-scan",{method:"POST"})
let d=await r.json()

let html=""

html+="Curl type:"+d.curl_type+"<br>"
html+="Damage:"+d.damage+"<br>"
html+="Hydration:"+d.hydration+"<br><br>"

html+="Routine:<br>"

d.routine.forEach(x=>{
html+=x+"<br>"
})

document.getElementById("scanResults").innerHTML=html

}

async function findSalons(){

navigator.geolocation.getCurrentPosition(async pos=>{

let lat=pos.coords.latitude
let lon=pos.coords.longitude

let r=await fetch("/api/salons",{

method:"POST",

headers:{"Content-Type":"application/json"},

body:JSON.stringify({lat:lat,lon:lon})

})

let salons=await r.json()

console.log(salons)

})

}
