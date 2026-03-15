// Prevent Aria sphere from loading on login
console.log("Login page loaded - Aria sphere disabled");

// Example login handler (optional)
document.getElementById("loginForm").addEventListener("submit", (e)=>{
    e.preventDefault();
    alert("Login simulated, redirecting to dashboard...");
    window.location.href = "/dashboard";
});

