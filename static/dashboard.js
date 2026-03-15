// ----------------------
// Tab switcher
// ----------------------
function switchPTab(tab){
    document.querySelectorAll(".p-tab").forEach(el => el.style.display = "none");
    const active = document.getElementById(tab);
    if(active) active.style.display = "block";
}

// ----------------------
// Load live system metrics
// ----------------------
async function loadMetrics(){
    const res = await fetch('/system/metrics');
    const data = await res.json();
    document.getElementById('metrics').innerText = JSON.stringify(data, null, 2);
}

async function loadAnalytics(){
    const res = await fetch('/analytics');
    const data = await res.json();
    document.getElementById('analyticsData').innerText = JSON.stringify(data, null, 2);
}

// ----------------------
// Initial load
// ----------------------
loadMetrics();
loadAnalytics();
setInterval(loadMetrics, 5000); // refresh metrics every 5 sec

