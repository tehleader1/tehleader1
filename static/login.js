// Prevent Aria sphere from running on login
console.log("Login page loaded - Aria sphere disabled");

// Simple login handler (simulated)
document.getElementById("loginForm").addEventListener("submit", function(e){
    e.preventDefault();
    // You can replace this with real authentication later
    const username = document.getElementById("username").value;
    alert(`Welcome ${username}! Redirecting to dashboard...`);
    window.location.href = "/dashboard";
});
