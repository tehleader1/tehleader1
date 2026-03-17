var auth0 = new auth0.WebAuth({
domain: "YOUR_AUTH0_DOMAIN",
clientID: "YOUR_AUTH0_CLIENT",
redirectUri: window.location.origin,
responseType: "token id_token",
scope: "openid profile email"
})

function login(){
auth0.authorize()
}
