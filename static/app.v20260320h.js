const qs = (sel) => document.querySelector(sel)
const qsa = (sel) => Array.from(document.querySelectorAll(sel))

function showBannedOverlay(reason){
  let el = qs("#bannedOverlay")
  if(!el){
    el = document.createElement("div")
    el.id = "bannedOverlay"
    el.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.92);color:#fff;"
    el.innerHTML = `<div style="text-align:center;border:2px solid #ff4141;padding:24px;border-radius:16px;background:rgba(255,65,65,0.12);max-width:640px;">
      <div style="font-size:56px;font-weight:900;letter-spacing:.16em;color:#ff5454;">BANNED</div>
      <div style="margin-top:8px;color:#ffd6d6;">IP blocked. ${reason ? `Reason: ${reason}` : ""}</div>
    </div>`
    document.body.appendChild(el)
  } else {
    el.style.display = "flex"
  }
}

function showGatewayOverlay(){
  let el = qs("#gatewayOverlay")
  if(!el){
    el = document.createElement("div")
    el.id = "gatewayOverlay"
    el.style.cssText = "position:fixed;right:14px;top:14px;z-index:99995;max-width:340px;padding:12px 14px;border-radius:12px;background:rgba(28,10,10,0.95);border:1px solid rgba(255,90,90,0.55);color:#ffe7e7;box-shadow:0 10px 28px rgba(0,0,0,0.45);"
    el.innerHTML = `
      <div style="font-weight:700; margin-bottom:6px;">Temporary 502 / Gateway Issue</div>
      <div style="font-size:12px;line-height:1.45;opacity:.95;">Use official Render pages while SupportRD reconnects.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <a href="https://status.render.com" target="_blank" rel="noopener" style="color:#fff;">Render Status</a>
        <a href="https://render.com/docs/troubleshooting-deploys" target="_blank" rel="noopener" style="color:#fff;">Troubleshoot</a>
        <a href="/status/502" target="_blank" rel="noopener" style="color:#fff;">SupportRD 502 Help</a>
      </div>
    `
    document.body.appendChild(el)
    setTimeout(()=>{ try{ el.remove() }catch{} }, 12000)
  }
}

;(function patchFetchForBan(){
  if(!window.fetch || window.__banFetchPatched) return
  const orig = window.fetch.bind(window)
  window.fetch = async (...args)=>{
    const res = await orig(...args)
    if(res && (res.status === 502 || res.status === 503 || res.status === 504)){
      showGatewayOverlay()
    }
    if(res && res.status === 403){
      try{
        const clone = res.clone()
        const ct = (clone.headers.get("content-type") || "").toLowerCase()
        if(ct.includes("application/json")){
          const d = await clone.json()
          if(d && (d.error === "banned" || d.message === "BANNED")){
            showBannedOverlay(d.reason || "")
          }
        } else {
          const t = await clone.text()
          if((t || "").toUpperCase().includes("BANNED")){
            showBannedOverlay("")
          }
        }
      }catch{}
    }
    return res
  }
  window.__banFetchPatched = true
})()

const THEMES = ["aurora","ice","ember","carbon","nebula"]
const DEFAULT_THEME = "aurora"
const THEME_CONTENT = [
  {title:"SupportRD Live", desc:"Hair care, routines, product matching, and live guidance — all focused on healthy hair, growth, and repair."},
  {title:"SupportRD Live Studio", desc:"Moisture, bounce, and growth tracking with ARIA‑guided routines and real product wins."},
  {title:"SupportRD Live Lab", desc:"Deep repair, scalp care, and shine — your weekly routine mapped in 7‑day views."},
  {title:"SupportRD Live Motion", desc:"Social‑ready hair moments, instant scans, and custom orders with Evelyn."},
  {title:"SupportRD Live Pro", desc:"Professional routines, growth analytics, and premium subscription guidance."}
]
const HERO_FILTERS = [
  "saturate(1.1) contrast(1.05)",
  "hue-rotate(15deg) saturate(1.2)",
  "hue-rotate(-10deg) saturate(1.15)",
  "grayscale(0.1) contrast(1.1)",
  "hue-rotate(25deg) saturate(1.25)"
]

const SHOPIFY_LINK_PATHS = {
    myOrders: "/account/orders",
    cart: "/cart",
    premium: "/products/hair-advisor-premium-1",
  bingo100: "/products/bingo-fantasy-100",
  studio100: "/products/jake-premium-studio",
  family200: "/products/family-fantasy-200",
  yoda: "/products/yoda-pass",
  pro: "/products/professional-hair-advisor-1",
  fantasy300: "/products/basic-fantasy-21-plus-300",
  fantasy600: "/products/advanced-fantasy-21-plus-600",
    donate: "/products/supportrd-product-tip-donate"
  }
const LINKS = {
    myOrders: "https://supportrd.com/account/orders",
    cart: "https://supportrd.com/cart",
    premium: "https://supportrd.com/products/hair-advisor-premium-1",
  bingo100: "https://supportrd.com/products/bingo-fantasy-100",
  studio100: "https://supportrd.com/products/jake-premium-studio",
  family200: "https://supportrd.com/products/family-fantasy-200",
  yoda: "https://supportrd.com/products/yoda-pass",
  pro: "https://supportrd.com/products/professional-hair-advisor-1",
  fantasy300: "https://supportrd.com/products/basic-fantasy-21-plus-300",
  fantasy600: "https://supportrd.com/products/advanced-fantasy-21-plus-600",
    donate: "https://supportrd.com/products/supportrd-product-tip-donate",
    custom: "https://supportrd.com/pages/custom-order"
  }
  const SHOPIFY_ROLLOUTS = [
    { key:"premium", label:"ARIA Puzzle Tier", price:"$35/mo", url: LINKS.premium },
    { key:"pro", label:"Unlimited ARIA Professional", price:"$50/mo", url: LINKS.pro },
    { key:"bingo100", label:"Bingo Fantasy", price:"$100/mo", url: LINKS.bingo100 },
    { key:"studio100", label:"Jake Premium Studio", price:"$100/mo", url: LINKS.studio100 },
    { key:"family200", label:"Family Fantasy Pack", price:"$200/mo", url: LINKS.family200 },
    { key:"yoda", label:"Yoda Pass", price:"$20/mo", url: LINKS.yoda },
    { key:"fantasy300", label:"21+ Basic Fantasy", price:"$300/mo", url: LINKS.fantasy300 },
    { key:"fantasy600", label:"21+ Advanced Fantasy", price:"$600/mo", url: LINKS.fantasy600 },
    { key:"donate", label:"SupportRD Product Tip / Donate", price:"Product checkout", url: LINKS.donate }
  ]
const PLAN_MEDIA = {
  premium: {title:"ARIA Puzzle Tier", price:"$35/mo", image:"/static/images/brochure-shampoo.jpg", desc:"Puzzle unlocks + guided routine depth.", link:LINKS.premium},
  pro: {title:"Unlimited ARIA Professional", price:"$50/mo", image:"/static/images/brochure-hero.jpg", desc:"Unlimited responses + pro-level support lane.", link:LINKS.pro},
  bingo100: {title:"Bingo Fantasy", price:"$100/mo", image:"/static/images/brochure-social.jpg", desc:"Chill narrative mode with humor and confidence.", link:LINKS.bingo100},
  studio100: {title:"Jake Premium Studio", price:"$100/mo", image:"/static/images/brochure-contacts.jpg", desc:"Extra FX, deeper Jake conversation, Gig 4K theme additions, and monthly studio premium access.", link:LINKS.studio100},
  family200: {title:"Family Fantasy Pack", price:"$200/mo", image:"/static/images/brochure-contacts.jpg", desc:"Family-safe themed coaching and style prep.", link:LINKS.family200},
  fantasy300: {title:"21+ Basic Fantasy", price:"$300/mo", image:"/static/images/brochure-bright-droplets.jpg", desc:"Playful 21+ tone in a hair-first experience.", link:LINKS.fantasy300},
  fantasy600: {title:"21+ Advanced Fantasy", price:"$600/mo", image:"/static/images/brochure-fast-dropper.jpg", desc:"Premium emotional narrative with advanced tone.", link:LINKS.fantasy600},
  yoda: {title:"Yoda Pass", price:"$20/mo", image:"/static/images/brochure-lacceador.jpg", desc:"Focused builder mode for consistent progress.", link:LINKS.yoda}
}
const REMOTE_PAY_PRODUCTS = [
  {
    key:"premium",
    title:"ARIA Puzzle Tier",
    price:"$35 / month",
    image:(PLAN_MEDIA.premium && PLAN_MEDIA.premium.image) || "/static/images/brochure-shampoo.jpg",
    short:"Fast guided hair support for customers who want a light monthly start.",
    ingredients:"Aloe vera, moisture support, and a clean SupportRD starter routine feel.",
    apply:"Use on damp hair, work through the scalp and ends, then move into the guided routine lane.",
    does:"Starts the customer on a lighter monthly SupportRD access plan with ARIA guidance.",
    after:"Purchase includes a Shopify confirmation number, email/username access lane, and a clean default product card after checkout.",
    link: LINKS.premium
  },
  {
    key:"pro",
    title:"Unlimited ARIA Professional",
    price:"$50 / month",
    image:(PLAN_MEDIA.pro && PLAN_MEDIA.pro.image) || "/static/images/brochure-hero.jpg",
    short:"Professional support lane with a stronger month-to-month service feel.",
    ingredients:"Hair analysis support, premium response depth, and pro-level SupportRD access.",
    apply:"Choose for customers who want stronger monthly help and quicker follow-up through SupportRD.",
    does:"Unlocks the core pro service lane with more depth and stronger routing.",
    after:"Purchase includes Shopify order confirmation, access through the buyer email/username, and a premium default purchase card.",
    link: LINKS.pro
  },
  {
    key:"studio100",
    title:"Jake Premium Studio",
    price:"$100 / month",
    image:(PLAN_MEDIA.studio100 && PLAN_MEDIA.studio100.image) || "/static/images/brochure-contacts.jpg",
    short:"Monthly studio premium for creators working the booth and remote together.",
    ingredients:"Extra FX, deeper Jake conversation, and Gig 4K theme additions.",
    apply:"Use when the customer wants the full studio premium lane with monthly access.",
    does:"Powers the studio side with more help, more effects, and cleaner stream prep.",
    after:"Purchase includes a confirmation number, studio premium access under the buyer login, and a default studio stock card in the receipt lane.",
    link: LINKS.studio100
  },
  {
    key:"bingo100",
    title:"Bingo Fantasy",
    price:"$100 / month",
    image:(PLAN_MEDIA.bingo100 && PLAN_MEDIA.bingo100.image) || "/static/images/brochure-social.jpg",
    short:"A lighter personality package with more playful customer energy.",
    ingredients:"Social spark, lighter humor, and themed experience styling.",
    apply:"Use for customers who want a fun monthly lane with personality and themed vibes.",
    does:"Adds more social motion and character while staying in SupportRD.",
    after:"Purchase includes a Shopify confirmation number, account access by email/username, and a themed stock product image in the receipt lane.",
    link: LINKS.bingo100
  },
  {
    key:"family200",
    title:"Family Fantasy Pack",
    price:"$200 / month",
    image:(PLAN_MEDIA.family200 && PLAN_MEDIA.family200.image) || "/static/images/brochure-contacts.jpg",
    short:"Family-first package for a bigger support lane across the household.",
    ingredients:"Family route support, guided planning, and broader service coverage.",
    apply:"Choose this for a stronger family route with a bigger care structure.",
    does:"Expands SupportRD into a fuller family support experience.",
    after:"Purchase includes confirmation details, family access tied to the buyer account, and a polished stock image in the purchase summary.",
    link: LINKS.family200
  },
  {
    key:"yoda",
    title:"Yoda Pass",
    price:"$20 / month",
    image:(PLAN_MEDIA.yoda && PLAN_MEDIA.yoda.image) || "/static/images/brochure-lacceador.jpg",
    short:"Smaller builder pass for customers easing into the platform.",
    ingredients:"Focused check-ins, progress support, and a lower-friction monthly commitment.",
    apply:"Use as the easiest monthly entry point for someone new to the platform.",
    does:"Keeps the customer connected to SupportRD with a simple recurring pass.",
    after:"Purchase includes a Shopify order number, email/username access, and a default stock card in the purchase lane.",
    link: LINKS.yoda
  },
  {
    key:"fantasy300",
    title:"21+ Basic Fantasy",
    price:"$300 / month",
    image:(PLAN_MEDIA.fantasy300 && PLAN_MEDIA.fantasy300.image) || "/static/images/brochure-bright-droplets.jpg",
    short:"Higher-tier themed service with a stronger premium feel.",
    ingredients:"Enhanced themed guidance, premium support routing, and a bigger offer presentation.",
    apply:"Choose for customers who want the stronger premium-themed lane.",
    does:"Raises the service tone and monthly access level.",
    after:"Purchase includes order confirmation, account-based access, and a premium stock purchase card.",
    link: LINKS.fantasy300
  },
  {
    key:"fantasy600",
    title:"21+ Advanced Fantasy",
    price:"$600 / month",
    image:(PLAN_MEDIA.fantasy600 && PLAN_MEDIA.fantasy600.image) || "/static/images/brochure-fast-dropper.jpg",
    short:"Top premium themed route for the highest monthly access lane.",
    ingredients:"Advanced premium styling, higher-touch support, and the strongest themed access in the lineup.",
    apply:"Choose when the customer wants the biggest premium package in the current SupportRD stack.",
    does:"Gives the highest-level themed monthly package on the checkout board.",
    after:"Purchase includes Shopify confirmation details, login access through email/username, and a top-tier default purchase image.",
    link: LINKS.fantasy600
  },
  {
    key:"donate",
    title:"SupportRD Product Tip / Donate",
    price:"Product checkout",
    image:"/static/images/brochure-formula-exclusive.jpg",
    short:"Fast support lane for tips, product support, and in-person goodwill checkout.",
    ingredients:"Goodwill support, product-tip routing, and extra care for the SupportRD mission.",
    apply:"Use when somebody wants to support the work or add a simple product-tip checkout.",
    does:"Gives a quick direct-support button that still routes through Shopify checkout.",
    after:"Purchase includes a Shopify receipt, buyer email reference, and a clean product image card for the order summary.",
    link: LINKS.donate
  }
]
const SUPPORTRD_CONTACT_REQUESTS_KEY = "supportrdContactChannelRequests"

function loadSupportContactRequests(){
  try{
    const parsed = JSON.parse(localStorage.getItem(SUPPORTRD_CONTACT_REQUESTS_KEY) || "[]")
    return Array.isArray(parsed) ? parsed : []
  }catch{
    return []
  }
}

function saveSupportContactRequests(entries){
  try{
    localStorage.setItem(SUPPORTRD_CONTACT_REQUESTS_KEY, JSON.stringify(Array.isArray(entries) ? entries.slice(0, 25) : []))
  }catch{}
}

function pushSupportContactRequest(entry){
  const requests = loadSupportContactRequests()
  requests.unshift({
    ...entry,
    createdAt: entry?.createdAt || new Date().toISOString()
  })
  saveSupportContactRequests(requests)
}

function buildSupportMailtoUrl(subject, body){
  return `mailto:xxfigueroa1993@yahoo.com?subject=${encodeURIComponent(subject || "SupportRD Request")}&body=${encodeURIComponent(body || "")}`
}

function buildCustomOrderMailto(type = "custom", options = {}){
  const baseName = shouldAutoOwnerEntry() ? "Anthony / Founder" : (state?.socialLinks?.name || "SupportRD Visitor")
  if(type === "bulk"){
    return buildSupportMailtoUrl(
      "SupportRD Bulk Product / Fly-In Session",
      [
        `Hello SupportRD,`,
        ``,
        `I want to talk about an in-person bulk product session with the inventor.`,
        `Name: ${options.name || baseName}`,
        `City / travel base: ${options.city || "Not added yet"}`,
        `Expected quantity: ${options.quantity || "Not added yet"}`,
        `Best callback / email: ${options.replyTo || state?.socialLinks?.email || "Use this email thread"}`,
        `Request details: ${options.notes || "I want details on bulk product ordering and whether Anthony should fly in."}`,
        ``,
        `Please send me the next steps.`,
        `SupportRD`
      ].join("\n")
    )
  }
  return buildSupportMailtoUrl(
    "SupportRD Custom Order Request",
    [
      `Hello SupportRD,`,
      ``,
      `I want to place a custom order.`,
      `Name: ${options.name || baseName}`,
      `Product or need: ${options.product || "Please help me choose"}`,
      `Best callback / email: ${options.replyTo || state?.socialLinks?.email || "Use this email thread"}`,
      `Notes: ${options.notes || "I want a custom order follow-up from SupportRD."}`,
      ``,
      `Please send me the next steps.`,
      `SupportRD`
    ].join("\n")
  )
}
function normalizeShopifyStorefrontBase(raw){
  const value = String(raw || "").trim()
  if(!value) return ""
  if(/^https?:\/\//i.test(value)) return value.replace(/\/+$/, "")
  return `https://${value.replace(/^\/+/, "").replace(/\/+$/, "")}`
}
function applyShopifyStorefrontBase(rawBase){
  const base = normalizeShopifyStorefrontBase(rawBase)
  if(!base) return false
  state.shopifyStorefrontBase = base
  try{
    state.shopifyStorefrontHost = new URL(base).host
  }catch{
    state.shopifyStorefrontHost = base.replace(/^https?:\/\//i, "").replace(/\/.*$/, "")
  }
  Object.entries(SHOPIFY_LINK_PATHS).forEach(([key, path])=>{
    LINKS[key] = `${base}${path}`
  })
  SHOPIFY_ROLLOUTS.forEach(item=>{
    if(item?.key && LINKS[item.key]) item.url = LINKS[item.key]
  })
  Object.keys(PLAN_MEDIA).forEach(key=>{
    if(PLAN_MEDIA[key] && LINKS[key]) PLAN_MEDIA[key].link = LINKS[key]
  })
  REMOTE_PAY_PRODUCTS.forEach(product=>{
    if(product?.key && LINKS[product.key]) product.link = LINKS[product.key]
  })
  return true
}
function getDirectShopifyBase(){
  const host = String(state.shopifyStorefrontHost || "").trim()
  if(host) return `https://${host.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`
  const base = normalizeShopifyStorefrontBase(state.shopifyStorefrontBase)
  if(base) return base.replace(/\/+$/, "")
  return "https://supportdr-com.myshopify.com"
}
async function bootstrapShopifyStorefrontBase(){
  try{
    const response = await fetch("/api/shopify/public-config")
    const data = await response.json()
    if(data?.storefront_base) applyShopifyStorefrontBase(data.storefront_base)
    state.shopifyStorefrontHost = data?.storefront_host || state.shopifyStorefrontHost || ""
    state.shopifyStorefrontToken = data?.storefront_token_public || state.shopifyStorefrontToken || ""
  }catch{}
}
const storefrontConfigReady = bootstrapShopifyStorefrontBase()
const AI_LINKS = {
  dan_martell: "https://archive.org/search?query=Dan%20Martell%20AI%20business%20mediatype%3Amovies",
  ai_millionaire: "https://archive.org/search?query=AI%20millionaire%20mediatype%3Amovies",
  ai_saas: "https://archive.org/search?query=AI%20SaaS%20mediatype%3Amovies",
  best_ai_2026: "https://archive.org/search?query=best%20AI%20tools%202026%20mediatype%3Amovies",
  agent_workflows: "https://archive.org/search?query=AI%20agent%20workflows%20mediatype%3Amovies",
  automation_agency: "https://archive.org/search?query=AI%20automation%20agency%20mediatype%3Amovies",
  ai_2026: "https://archive.org/search?query=AI%202026%20technology%20advances%20mediatype%3Amovies",
  ai_research: "https://archive.org/search?query=AI%20research%20breakthroughs%202026%20mediatype%3Amovies",
  future_jobs: "https://archive.org/search?query=AI%20jobs%20income%20opportunities%20mediatype%3Amovies",
  ai_agency: "https://archive.org/search?query=AI%20agency%20blueprint%20mediatype%3Amovies",
  ai_saas_builder: "https://archive.org/search?query=AI%20SaaS%20builder%20mediatype%3Amovies",
  ai_consulting: "https://archive.org/search?query=AI%20consulting%20offers%20mediatype%3Amovies"
}
const LOGIN_URL = "https://supportrd.com/account/login"

const BLOG_POSTS = [
  {title:"SupportRD Is Moving: Cash Friendly Growth", body:"SupportRD is moving with a balanced, friendly system built on clean operations and community respect.\n\nWe now support Request Call intake with pending confirmation, cash-point workflows (store, bank meetup, envelope), and transparent receipt logging.\n\nPrimary rollout starts in Charlotte, North Carolina, then Virginia, then Florida. #SupportRD is moving."},
  {title:"Natural: Recuperacion de Pelo con Calor", body:"Semana 1: hidratacion profunda, recorte y proteccion.\n\nSemana 2: acondicionamiento 2 veces y desenredo suave.\n\nSemana 3: balance de proteina + poco calor.\n\nSemana 4: mas brillo, menos quiebre y mejor forma del pelo."},
  {title:"Natural: Balance de Proteina y Brillo", body:"Paso 1: hidrata con leave-in ligero.\n\nPaso 2: tratamiento de proteina cada 7-10 dias.\n\nPaso 3: sella con aceite.\n\nResultado: menos frizz, mas cuerpo y mejor movimiento."},
  {title:"Natural: Rutina Real para Shampoo Familiar", body:"Rutina simple con productos reales para crecimiento sano.\n\nManana: aplica en pelo humedo.\n\nMedio dia: refresh suave.\n\nNoche: proteccion y descanso del pelo."}
]
const INHOUSE_ADS = [
  {title:"Fresh Drop: Caribe Gloss Routine", body:"A premium brochure-style glow pass for dry hair days. In-house and colorful on purpose."},
  {title:"Sponsor Lane: Community Cash Point", body:"Friendly check-ins, receipt-first flow, and a smooth wait-screen so everyone knows what is next."},
  {title:"Movement Alert: #SupportRD is moving", body:"Charlotte first, then Virginia, then Florida. New energy every run."},
  {title:"ARIA Unlimited Perk", body:"$50 Unlimited ARIA unlocks Talk to us for a deal with professional handling."},
  {title:"Puzzle Tier Momentum", body:"$35 Puzzle tier keeps your routine active while you build toward Unlimited ARIA."},
]

const state = {
    themeIndex: 0,
    blogIndex: 0,
    ariaHistory: [],
    socialLinks: {},
    hairScore: 0,
    subscription: "free",
    ariaCount: 0,
    ariaBlocked: false,
    puzzleAnswer: null,
    livePopupActive: false,
    ariaLevel: 'greeting',
    resolverContext: null,
    adult21: false,
    isAdmin: false,
    activeAssistant: localStorage.getItem("activeAssistant") || "aria",
    assistantTopic: localStorage.getItem("assistantTopic") || "hair_core",
    shopifyProducts: [],
    shopifyProductsLoaded: false,
    shopifyStorefrontBase: "",
    shopifyStorefrontHost: "",
    shopifyStorefrontToken: ""
}

const ASSISTANTS = [
  { id: "aria", name: "ARIA", title: "ARIA Professional Hair Specialist", sub: "ARIA · Problems / Solutions" },
  { id: "projake", name: "Pro Jake", title: "Pro Jake Studio Specialist", sub: "Pro Jake · Studio / Coaching" }
]
const JAKE_CAPACITY_MAP = {
  home: [
    "friendly studio greeting",
    "moral support while you browse",
    "light studio direction"
  ],
  diary: [
    "steady support while you write",
    "routine reminders",
    "hair schedule encouragement"
  ],
  studio: [
    "motherboard editing checks",
    "voice and instrument tracking",
    "FX, undo, save, export coaching"
  ],
  settings: [
    "system calm while you tune settings",
    "account and route reassurance",
    "remote stability support"
  ],
  map: [
    "route calm",
    "theme switching support",
    "location-aware studio/hair check-ins"
  ],
  faq: [
    "reel lounge support",
    "developer feed encouragement",
    "quick answer backup"
  ],
  profile: [
    "scan readiness",
    "profile image feedback",
    "hair analysis standby"
  ],
  payments: [
    "purchase encouragement",
    "pricing reminders",
    "premium/studio lane confidence"
  ]
}
const LIFE_MOMENT_DEFAULTS = [
  "Good moment billboard: a family update rolls by and SupportRD keeps the route warm.",
  "Rough moment billboard: Aria slows the pace down and gives your personal life room to breathe.",
  "Random update billboard: just streaming by with life and staying connected from far.",
  "Celebration billboard: a win, a meme, a local laugh, and a reason to keep moving.",
  "Juicy fruit billboard: simple life, bright color, and a moment worth remembering."
]

function getLifeMemory(){
  return (state.socialLinks && state.socialLinks.lifeMemory) || {}
}
function csvList(value){
  return String(value || "").split(",").map(part => part.trim()).filter(Boolean)
}
function getFeaturedFamilyMember(memory = getLifeMemory()){
  const primary = csvList(memory.primaryFamily)
  const extended = csvList(memory.extendedFamily)
  const pool = [...primary, ...extended]
  if(!pool.length) return "family"
  const index = Math.floor(Date.now() / 20000) % pool.length
  return pool[index]
}
function buildLifeReflection(assistantId = state.activeAssistant){
  const memory = getLifeMemory()
  const familyLead = getFeaturedFamilyMember(memory)
  const religion = memory.religion || "freedom of choice"
  const hobbies = memory.hobbies || "general hobbies"
  const education = memory.education || "life learning"
  const interests = memory.interests || "simple interests"
  const moments = csvList(memory.lifeMoments)
  const momentLead = moments[0] || "random updates"
  if(assistantId === "projake"){
    return `Jake transmission from far: ${familyLead} is on the mind, ${religion} stays respected, ${hobbies} and ${interests} keep the stream human, and today's billboard is ${momentLead}. Keep life moving and keep the route strong.`
  }
  return `Aria transmission from far: I remember ${familyLead}, your religion lane is ${religion}, your hobbies and education are ${hobbies} / ${education}, and your current life moment is ${momentLead}. There is beauty in the stairs and in the ordinary updates too.`
}
function buildLifeBillboards(memory = getLifeMemory()){
  const familyLead = getFeaturedFamilyMember(memory)
  const base = [
    familyLead && familyLead !== "family" ? `Family billboard: ${familyLead} rolls across the route while you stream your day.` : "",
    memory.religion ? `Religion billboard: ${memory.religion} stays visible only when you want it and respected the whole way through.` : "",
    memory.hobbies ? `Hobby billboard: ${memory.hobbies} keeps your session grounded in real life.` : "",
    memory.education ? `Education billboard: ${memory.education} is part of your transmit-from-far story.` : "",
    memory.interests ? `Interest billboard: ${memory.interests} keeps the stream from feeling empty.` : "",
    ...csvList(memory.lifeMoments).map(item => `Life moment billboard: ${item}.`)
  ].filter(Boolean)
  return base.length ? base : LIFE_MOMENT_DEFAULTS
}
function renderLifeMemorySurface(forceMessage){
  const billboard = qs("#liveMemoryBillboard")
  const status = qs("#lifeReflectionStatus")
  const splash = qs("#launchSplashMessage")
  const reward = qs("#liveRewardCard")
  const rewardText = qs("#liveRewardText")
  const memory = getLifeMemory()
  const billboards = buildLifeBillboards(memory)
  const message = forceMessage || billboards[Math.floor(Date.now() / 12000) % billboards.length]
  if(billboard) billboard.textContent = message
  if(status){
    status.textContent = memory.primaryFamily || memory.extendedFamily || memory.religion || memory.hobbies || memory.education || memory.interests || memory.lifeMoments
      ? `Saved transmit-from-far lane for ${getFeaturedFamilyMember(memory)}. Aria and Jake can now reflect family, religion, hobbies, education, interests, and life moments back to you.`
      : "Save family, religion, hobbies, education, interests, and life moments so Aria and Jake can play your personal life back to you."
  }
  if(splash){
    splash.textContent = `${message} ${memory.primaryFamily ? `Featured family member: ${getFeaturedFamilyMember(memory)}.` : "SupportRD keeps the route warm from far."}`
  }
  const hostedSessions = Number(localStorage.getItem("supportrdHostedSessions") || 0)
  if(reward && rewardText){
    reward.hidden = hostedSessions < 20
    rewardText.textContent = hostedSessions >= 20
      ? "A clean normal-car drive-by, bun up, international trip pending, and SupportRD reminding you to keep life moving toward main events and time to explore."
      : `Reward picture unlocks after 20+ hosted sessions. Current hosted sessions: ${hostedSessions}.`
  }
}
function startLifeBillboardCycle(){
  if(window.__supportLifeBillboardTimer) return
  renderLifeMemorySurface()
  window.__supportLifeBillboardTimer = setInterval(()=>renderLifeMemorySurface(), 12000)
}

function getActiveAssistant(){
  return ASSISTANTS.find(a => a.id === state.activeAssistant) || ASSISTANTS[0]
}

function getActiveAssistantName(){
  return getActiveAssistant().name
}

function getAssistantDisplayName(assistantId = state.activeAssistant){
  return assistantId === "projake" ? "Jake Studio Specialist" : "Aria Hair Advisor"
}

function inferVisitorLaneFromMessage(msg){
  const text = String(msg || "").toLowerCase()
  if(/buy|price|premium|checkout|upgrade|subscription|pay|donate|tip|product/.test(text)) return "products"
  if(/studio|record|beat|fx|motherboard|export|mp3|mp4|m4a|instrument|voice/.test(text)) return "app"
  if(/scan|damage|burn|frizz|oily|color|bounce|hair|scalp|routine/.test(text)) return "ai"
  if(/family|kids|daughter|son|husband|wife|schedule|diary|profile/.test(text)) return "family"
  if(/map|route|gps|tourism|travel|villa gonzalez|santiago|kito/.test(text)) return "tourism"
  return "issues"
}

function buildAssistantProductIntelligence(){
  return REMOTE_PAY_PRODUCTS.map((product)=>(
    `${product.title} (${product.price}) :: apply ${product.apply} :: does ${product.does}`
  )).join(" || ")
}

function buildAssistantFunnelSnapshot(){
  try{
    const stats = typeof loadAcquisitionStats === "function" ? loadAcquisitionStats() : null
    if(!stats) return "No funnel snapshot yet."
    const laneEntries = Object.entries(stats.lanes || {})
      .sort((a,b)=>Number(b[1] || 0) - Number(a[1] || 0))
      .slice(0, 2)
      .map(([lane, count])=>`${lane}: ${count}`)
      .join(" | ")
    const stageEntries = Object.entries(stats.stages || {})
      .sort((a,b)=>Number(b[1] || 0) - Number(a[1] || 0))
      .slice(0, 3)
      .map(([stage, count])=>`${stage}: ${count}`)
      .join(" | ")
    const latestGuest = stats.latestGuestPost || "SupportRD hair feature opportunity forming."
    return `Top lanes -> ${laneEntries || "none yet"}. Stages -> ${stageEntries || "none yet"}. Latest guest-post signal -> ${latestGuest}`
  }catch{
    return "Funnel snapshot unavailable."
  }
}

const PROHIBITED_TERMS = ["drug","drugs","cocaine","meth","weed","marijuana","heroin","fentanyl","gang","gangs","cartel","crip","bloods","ms-13"]

function detectDeviceTier(){
  try{
    const dm = Number(navigator.deviceMemory || 0)
    const cpu = Number(navigator.hardwareConcurrency || 0)
    if((dm && dm <= 3) || (cpu && cpu <= 4)) return "low-cost"
    if((dm && dm <= 6) || (cpu && cpu <= 8)) return "mid-range"
    return "high-performance"
  }catch{
    return "unknown"
  }
}

function initResolverContext(){
  const saved = JSON.parse(localStorage.getItem("resolverContext") || "null")
  const base = saved || {}
  const ctx = {
    country: base.country || "US",
    city: base.city || "unknown",
    coords: base.coords || null,
    device_tier: detectDeviceTier(),
    user_agent: (navigator.userAgent || "").slice(0, 120),
    language: (navigator.language || "en-US"),
    low_cost_mode: true
  }
  state.resolverContext = ctx
  localStorage.setItem("resolverContext", JSON.stringify(ctx))
  const dash = qs("#dashboardEmitStatus")
  if(dash){ dash.textContent = `Device: ${ctx.device_tier} · Location: pending · Low-cost mode: ON` }
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition((pos)=>{
      const updated = {
        ...ctx,
        coords: {
          lat: Number(pos.coords.latitude.toFixed(4)),
          lon: Number(pos.coords.longitude.toFixed(4))
        }
      }
      state.resolverContext = updated
      localStorage.setItem("resolverContext", JSON.stringify(updated))
      const v = qs("#resolverEmitView")
      if(v) v.textContent = `Resolver emit: ${updated.device_tier} · ${updated.coords.lat}, ${updated.coords.lon} · low-cost mode ON`
      if(dash){ dash.textContent = `Device: ${updated.device_tier} · Location: ${updated.coords.lat}, ${updated.coords.lon} · Low-cost mode: ON` }
    }, ()=>{
      const v = qs("#resolverEmitView")
      if(v) v.textContent = `Resolver emit: ${ctx.device_tier} · location pending · low-cost mode ON`
      if(dash){ dash.textContent = `Device: ${ctx.device_tier} · Location: not granted · Low-cost mode: ON` }
    }, {timeout: 3000})
  }
}
function setupAccessibilityMode(){
  const liteBtn = qs("#liteModeBtn")
  const params = new URLSearchParams(window.location.search || "")
  const lite = params.get("lite") === "1"
  if(lite){
    document.body.classList.add("lite-mode")
    const reel = qs("#reelPanel")
    if(reel){ reel.style.display = "none" }
  }
  if(liteBtn){
    liteBtn.addEventListener("click", ()=>{
      const url = new URL(window.location.href)
      url.searchParams.set("lite", "1")
      window.location.href = url.toString()
    })
  }
}

function applySimpleUi(enabled){
  document.body.classList.toggle("simple-ui", !!enabled)
  const btn = qs("#simpleUiToggle")
  if(btn){ btn.textContent = enabled ? "Simple View: On" : "Simple View: Off" }
  if(enabled){
    const activeAdvanced = qs(".tab-btn.active.advanced-tab")
    if(activeAdvanced){
      const fallback = qs('.tab-btn[data-tab="post"]')
      if(fallback){ fallback.click() }
    }
  }
}

function setupSimpleUi(){
  const btn = qs("#simpleUiToggle")
  if(!btn) return
  const key = "supportrd_simple_ui"
  const saved = localStorage.getItem(key)
  const enabled = saved === null ? true : saved === "1"
  applySimpleUi(enabled)
  btn.addEventListener("click", ()=>{
    const next = !document.body.classList.contains("simple-ui")
    applySimpleUi(next)
    localStorage.setItem(key, next ? "1" : "0")
    uiToast(next ? "Simple view on" : "Full view on")
  })
}

let transcribeFailures = 0
let handsFreeMode = false
const SUPPRESS_ERROR_TEXT = false
function suppressIfErrorText(text){
  if(!text) return false
  return text.startsWith("Mic:") || text.startsWith("Voice error") || text.startsWith("AI unavailable")
}


function openMiniWindow(title, body){
  const win = qs("#miniWindow")
  const t = qs("#miniWindowTitle")
  const b = qs("#miniWindowBody")
  if(!win || !t || !b) return
  t.textContent = title || "Action"
  b.textContent = body || ""
  win.classList.add("show")
  clearTimeout(win._t)
  win._t = setTimeout(()=>win.classList.remove("show"), 2400)
}

function triggerClassActLaugh(source){
  const label = source ? `from ${source}` : "incoming"
  openMiniWindow("Class Act Laugh", `Received ${label}.`)
  const burst = document.createElement("div")
  burst.className = "laugh-burst"
  burst.innerHTML = `CLASS ACT LAUGH <span>Ha‑ha‑ha!</span>`
  document.body.appendChild(burst)
  setTimeout(()=>{ try{ burst.remove() }catch{} }, 1600)
}

function hasProhibitedContent(text){
  const t = (text || "").toLowerCase()
  return PROHIBITED_TERMS.some(k => t.includes(k))
}


function wireAllButtons(){
  try{ var d=document.getElementById('debugClick'); if(d) d.textContent='App init done'; }catch{}

  document.body.addEventListener("click", (e)=>{
    const btn = e.target.closest("button")
    if(!btn) return

    const id = btn.id || ""
    const label = (btn.textContent || "").trim() || "Action"

    // If button has data-link, honor it
    if(btn.dataset && btn.dataset.link){
      openLinkModal(btn.dataset.link, label)
      openMiniWindow(label, "Opening link...")
      return
    }

    // Route common IDs to real actions
    const modalMap = {
      menuOccasion: "occasionModal",
      menuGift: "giftModal",
      menuSettings: "settingsModal",
      menuSubscription: "subscriptionModal",
      openLogin: "loginGate",
      openSeo: "seoModal",
      openReel: "reelModal",
      openSettings: "settingsModal",
      openCustomOrder: "customOrderModal"
    }
    if(modalMap[id]){
      const el = qs("#" + modalMap[id])
      if(el){ el.style.display = "flex" }
      openMiniWindow(label, "Opened panel.")
      return
    }

    if(id === "findSalons"){
      openMiniWindow(label, "Searching for salons...")
      return
    }

    if(id === "startCamera"){
      openMiniWindow(label, "Starting camera...")
      return
    }
    if(id === "stopCamera"){
      openMiniWindow(label, "Stopping camera...")
      return
    }

    if(id === "postSocials" || id === "sendSocials"){
      openMiniWindow(label, "Posting to feeds...")
      return
    }

    if(id === "voiceToggle" || id === "ariaSphere"){
      openMiniWindow(label, "Listening...")
      return
    }

    // Default fallback: show mini window so every button has behavior
    openMiniWindow(label, `Triggered: ${id || "button"}`)
  })
}

function syncLevelButtons(){
  const buttons = qsa('.level-btn')
  if(!buttons.length) return
  buttons.forEach(b=>b.classList.toggle('active', b.dataset.level === state.ariaLevel))
}

function setAdminVisibility(isAdmin){
  state.isAdmin = !!isAdmin
  qsa(".admin-only").forEach((el)=>{
    if(isAdmin){
      const display = el.dataset.adminDisplay || ((el.tagName || "").toLowerCase() === "button" ? "inline-flex" : (el.classList.contains("chip") ? "inline-flex" : "block"))
      el.style.display = display
    }else{
      el.style.display = "none"
    }
  })
}

function canUseTransferLane(){
  return !!state.isAdmin || state.ariaLevel === "inner" || state.ariaLevel === "pro"
}

async function setSeoAuto(enabled, stream){
  try{
    const r = await fetch("/api/seo/auto", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({enabled})
    })
    const d = await r.json()
    if(d.ok){
      const div = document.createElement("div")
      div.textContent = `[SEO] Auto 4x/day ${enabled ? "enabled" : "disabled"}`
      if(stream){
        stream.appendChild(div)
        stream.scrollTop = stream.scrollHeight
      }
      return true
    }
  }catch{}
  return false
}

function setupInfoTray(){
  const tray = qs("#infoTray")
  if(!tray) return
  tray.addEventListener("click", (e)=>{
    const btn = e.target.closest("button")
    if(!btn) return
    const label = String(btn.dataset.info || btn.textContent || "Info").trim()
    if(label === "ARIA"){
      const tab = qs('.tab-btn[data-tab="aria"]')
      if(tab){ tab.click() }
      openMiniWindow("ARIA", "ARIA is ready. Tap ARIA • Tap to Talk, then ask your hair question.")
      return
    }
    if(label === "Brochure"){
      openModal("brochureModal")
      openMiniWindow("Brochure", "Full brochure opened.")
      return
    }
    if(label === "Click the 3 buttons to download the app"){
      const installBtn = qs("#installBtn")
      if(installBtn && getComputedStyle(installBtn).display !== "none"){
        installBtn.click()
      }
      openMiniWindow("Download App", "Click: 1) ARIA, 2) Brochure, 3) Install + Subscribe or browser menu > Add to Home screen.")
      return
    }
    const linkMap = {
      "Privacy": "https://supportrd.com/policies/privacy-policy",
      "Politics": "https://supportrd.com/pages/politics",
      "Donate": LINKS.donate,
      "About Us": "https://supportrd.com/pages/about-us",
      "Terms": "https://supportrd.com/policies/terms-of-service",
      "FAQ": "https://supportrd.com/pages/faq",
      "Contact": "https://supportrd.com/pages/contact"
    }
    const infoMap = {
      "Privacy": "We respect your privacy. Personal data stays private and is never sold.",
      "Politics": "SupportRD is non-partisan and focused on hair care education and wellness.",
      "Donate": "Donations support hygiene kits and hair care outreach programs.",
      "About Us": "SupportRD delivers live hair guidance, routines, and product matching.",
      "Terms": "Use of this app is subject to standard terms and service policies.",
      "FAQ": "FAQ — Quick Tips:\n1) Dry hair: add a weekly deep conditioner + leave-in moisture.\n2) Frizz: seal with light oil and reduce heat.\n3) No bounce: add protein every 7–10 days.\n4) Oily scalp: clarify 1x weekly and avoid heavy oils at roots.\n5) Damage: trim split ends + heat protect.\n6) Tangly hair: detangle on damp hair with slip + wide-tooth comb.\n7) Color loss: use color-safe shampoo + cool rinses.\n\nWebsite Tips:\n• ARIA Sphere: hold to talk for voice guidance.\n• Hair Analysis: upload scan to get better feedback.\n• Occasion Editor: tap a day to set that routine.\n• Info Tray: tap buttons for policies and help.",
      "Contact": "Email: AgentAnthony@supportdr.com · Phone: 704‑345‑2867"
    }
    const link = linkMap[label]
    if(link){
      openLinkModal(link, label)
    }
    openMiniWindow(label, infoMap[label] || "More information coming soon.")
  })
}




function setupLevelSelect(){
  const sel = qs('#ariaLevelSelect')
  if(!sel) return
function isPremium(){ return state.subscription === 'premium' || state.subscription === 'bingo100' || state.subscription === 'pro' || state.subscription === 'yoda' || state.subscription === 'fantasy300' || state.subscription === 'fantasy600' || isProOverride() }
  function sync(){
    const val = isPremium() ? state.ariaLevel : 'greeting'
    sel.value = val
  }
  sel.addEventListener('change', ()=>{
    if(!isPremium() && sel.value !== 'greeting'){
      openModal('subscriptionModal')
      sel.value = 'greeting'
      state.ariaLevel = 'greeting'
      toast('Upgrade to unlock ARIA levels')
      return
    }
    state.ariaLevel = sel.value
  })
  sync()
}

function setupMiniWindow(){
  const close = qs("#closeMiniWindow")
  if(close){
    close.addEventListener("click", ()=>{
      const win = qs("#miniWindow")
      if(win) win.classList.remove("show")
    })
  }

  try{ var d=document.getElementById('debugClick'); if(d) d.textContent='App init done'; }catch{}

  document.body.addEventListener("click", (e)=>{
    const btn = e.target.closest("button")
    if(!btn) return
    const id = btn.id || "button"
    const label = (btn.textContent || "").trim() || "Action"
    if(id === "closeMiniWindow") return
    openMiniWindow(label, `Triggered: ${id}`)
  })
}

function toast(msg){
  const el = qs("#toast")
  if(!el) return
  el.textContent = msg
  el.style.display = "block"
  clearTimeout(el._t)
  el._t = setTimeout(()=>{el.style.display="none"}, 2200)
}

function beep(freq = 880, duration = 120){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = freq
    gain.gain.value = 0.08
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    setTimeout(()=>{osc.stop(); ctx.close()}, duration)
  }catch{}
}

function playSpaceHoverTone(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const oscA = ctx.createOscillator()
    const oscB = ctx.createOscillator()
    const gain = ctx.createGain()
    oscA.type = "triangle"
    oscB.type = "sine"
    oscA.frequency.setValueAtTime(620, ctx.currentTime)
    oscA.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.09)
    oscB.frequency.setValueAtTime(1240, ctx.currentTime)
    oscB.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.09)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12)
    oscA.connect(gain)
    oscB.connect(gain)
    gain.connect(ctx.destination)
    oscA.start()
    oscB.start()
    setTimeout(()=>{ oscA.stop(); oscB.stop(); ctx.close() }, 140)
  }catch{}
}

function setupMenuHoverFx(){
  const targets = [
    ...qsa("#launchMenu .launch-actions .btn"),
    ...qsa(".topbar .menu-btn"),
    ...qsa(".topbar .btn")
  ]
  targets.forEach((el)=>{
    el.addEventListener("mouseenter", ()=>playSpaceHoverTone(), {passive:true})
  })
}

function initHairScore(){
  state.hairScore = 100
  localStorage.setItem("hairScore", "100")
}

function bumpHairScore(delta){
  const next = Math.min(100, Math.max(0, state.hairScore + delta))
  if(next !== state.hairScore){
    state.hairScore = next
    localStorage.setItem("hairScore", String(state.hairScore))
  }
}

  function appendConversation(role, text){
    const log = qs("#conversationLog")
    if(!log) return
    if(log.textContent === "No conversation yet.") log.textContent = ""
    const div = document.createElement("div")
    div.className = `conversation-item ${role}`
    div.textContent = `${role === "user" ? "You" : "ARIA"}: ${text}`
    log.appendChild(div)
    log.scrollTop = log.scrollHeight
  }

  function watchTranscriptErrors(){
    if(!SUPPRESS_ERROR_TEXT) return
    const t = qs("#ariaTranscript")
    if(!t) return
    const clearIfError = ()=>{
      const val = t.textContent || ""
      if(suppressIfErrorText(val)){ t.textContent = "" }
    }
    const obs = new MutationObserver(clearIfError)
    obs.observe(t, {childList:true, characterData:true, subtree:true})
    clearIfError()
  }

  function showSpeechPopup(who, text){
    const existing = qs("#speechPopup")
    if(existing) existing.remove()
    const anchor = qs("#speechPopupAnchor") || qs("#centerStage") || document.body
    const stage = qs("#centerStage")
    const pop = document.createElement("div")
    pop.id = "speechPopup"
    pop.className = "speech-popup"
    const userAvatar = state.userAvatar || "/static/images/woman-waking-up12.jpg"
    const ariaAvatar = "/static/images/woman-waking-up12.jpg"
    pop.innerHTML = `
      <div class="speech-avatars">
        <div class="speech-avatar me" style="background-image:url('${userAvatar}')"></div>
        <div class="speech-avatar aria" style="background-image:url('${ariaAvatar}')"></div>
      </div>
      <div class="speech-body">
        <div class="who">${who}</div>
        <div class="speech-text">${text}</div>
      </div>
    `
    anchor.appendChild(pop)
    if(stage && anchor === qs("#speechPopupAnchor")){
      const bounds = stage.getBoundingClientRect()
      const x = bounds.width * (0.08 + Math.random() * 0.84)
      const y = bounds.height * (0.08 + Math.random() * 0.6)
      pop.style.left = `${x}px`
      pop.style.top = `${y}px`
      requestAnimationFrame(()=>{
        const r = pop.getBoundingClientRect()
        const maxX = bounds.width - r.width - 12
        const maxY = bounds.height - r.height - 12
        pop.style.left = `${Math.max(12, Math.min(x, maxX))}px`
        pop.style.top = `${Math.max(12, Math.min(y, maxY))}px`
      })
    }
    requestAnimationFrame(()=>pop.classList.add("show"))
    setTimeout(()=>{ pop.classList.remove("show"); setTimeout(()=>pop.remove(), 240) }, 1900)
  }


  let liveSpeechPopup = null
  function showLiveSpeechPopup(text){
    const anchor = qs("#speechPopupAnchor") || qs("#centerStage") || document.body
    const stage = qs("#centerStage")
    if(!liveSpeechPopup){
      const pop = document.createElement("div")
      pop.id = "speechLive"
      pop.className = "speech-popup live"
      const userAvatar = state.userAvatar || "/static/images/woman-waking-up12.jpg"
      const ariaAvatar = "/static/images/woman-waking-up12.jpg"
      pop.innerHTML = `
        <div class="speech-avatars">
          <div class="speech-avatar me" style="background-image:url('${userAvatar}')"></div>
          <div class="speech-avatar aria" style="background-image:url('${ariaAvatar}')"></div>
        </div>
        <div class="speech-body">
          <div class="who">YOU</div>
          <div class="speech-text"></div>
        </div>
      `
      anchor.appendChild(pop)
      if(stage && anchor === qs("#speechPopupAnchor")){
        const bounds = stage.getBoundingClientRect()
        const x = bounds.width * (0.08 + Math.random() * 0.84)
        const y = bounds.height * (0.08 + Math.random() * 0.6)
        pop.style.left = `${x}px`
        pop.style.top = `${y}px`
        requestAnimationFrame(()=>{
          const r = pop.getBoundingClientRect()
          const maxX = bounds.width - r.width - 12
          const maxY = bounds.height - r.height - 12
          pop.style.left = `${Math.max(12, Math.min(x, maxX))}px`
          pop.style.top = `${Math.max(12, Math.min(y, maxY))}px`
        })
      }
      liveSpeechPopup = pop
      requestAnimationFrame(()=>pop.classList.add("show"))
    }
    const textEl = liveSpeechPopup.querySelector(".speech-text")
    if(textEl){ textEl.textContent = text || "Listening…" }
    state.livePopupActive = true
  }

  function finalizeLiveSpeechPopup(){
    if(!liveSpeechPopup) return
    const pop = liveSpeechPopup
    setTimeout(()=>{ pop.classList.remove("show"); setTimeout(()=>pop.remove(), 240) }, 1200)
    liveSpeechPopup = null
  }


  async function askAria(msg){
    if(!msg) return
    if(state.ariaBlocked && !isProOverride()){
      openModal("puzzleModal")
      return
    }
    const assistant = getActiveAssistant()
    const topicContext = (state.assistantTopic || "hair_core").replace(/_/g, " ")
    const routeContext = remoteState?.currentRoute || "home"
    const laneKey = inferVisitorLaneFromMessage(msg)
    const laneLabel = typeof ACQUISITION_LANES !== "undefined" ? ACQUISITION_LANES[laneKey] || ACQUISITION_LANES.issues : laneKey
    const personaPrompt = [
      `Assistant persona: ${assistant.name}.`,
      `Display role: ${getAssistantDisplayName(assistant.id)}.`,
      `Topic focus: ${topicContext}.`,
      `Current route: ${routeContext}.`,
      `Predicted visitor lane: ${laneLabel}.`,
      assistant.id === "projake"
        ? `Jake capacity on this route: ${(JAKE_CAPACITY_MAP[routeContext] || JAKE_CAPACITY_MAP.home).join(", ")}. Jake stays cooler, more moral-support/studio-help than Aria.`
        : "Aria leads hair support, diagnosis-style pattern recognition, routines, products, and next-step guidance.",
      "Keep the answer tightly hair-related unless the user explicitly asks for travel/location support, in which case connect them to hair shops, salons, or route-aware beauty help.",
      `SupportRD product intelligence: ${buildAssistantProductIntelligence()}`,
      `SupportRD funnel snapshot: ${buildAssistantFunnelSnapshot()}`
    ].join(" ")
    appendAria(`You: ${msg}`)
    appendConversation("user", msg)
    if(typeof trackAcquisitionSignal === "function"){
      trackAcquisitionSignal(`assistant_prompt_${laneKey}`, {
        lane: laneLabel,
        stage: "exploring",
        socialFeedback: `${getAssistantDisplayName(assistant.id)} is handling a live ${laneLabel.toLowerCase()} question.`
      })
    }
    if(state.livePopupActive){
      state.livePopupActive = false
    } else {
      showSpeechPopup("YOU", msg)
    }
    try{
      setAriaFlow("processing")
      const levelMap = {
        greeting: 'Keep it brief and welcoming. 3-5 sentences.',
        thorough: 'Give a thorough, structured answer with steps and routines.',
        inner: 'Give insider tips, product usage details, and sequencing.',
        pro: 'Give professional guidance and ways to monetize or upsell services.'
      }
  const isPremium = state.subscription === 'premium' || state.subscription === 'bingo100' || state.subscription === 'pro' || state.subscription === 'yoda' || state.subscription === 'fantasy300' || state.subscription === 'fantasy600'
      const shortMode = 'Reply in 1-2 sentences maximum.'
      const ariaLevelPrompt = isPremium ? (levelMap[state.ariaLevel] || levelMap.thorough) : shortMode
      const r = await fetch("/api/aria",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          message: msg + '\n\n' + personaPrompt + '\n\nResponse level: ' + ariaLevelPrompt,
          membership_tier: state.subscription || "free",
          adult_mode: !!state.adult21,
          family_theme: (state.socialLinks && state.socialLinks.familyFantasyTheme) ? state.socialLinks.familyFantasyTheme : "",
          muslim_greeting: !!(state.socialLinks && state.socialLinks.muslimGreeting),
          custom_greeting: (state.socialLinks && state.socialLinks.customGreeting) ? state.socialLinks.customGreeting : "",
          same_feel_voice: !!(state.socialLinks && state.socialLinks.sameFeelVoice),
          thought_style: (state.socialLinks && state.socialLinks.thoughtStyle) ? state.socialLinks.thoughtStyle : "",
          resolver_context: state.resolverContext || {}
        })
      })
      const d = await r.json()
      const reply = d.reply || "AI unavailable"
      appendAria(`${assistant.name}: ${reply}`)
      appendConversation("aria", reply)
      showSpeechPopup(assistant.name, reply)
      if(typeof trackAcquisitionSignal === "function"){
        trackAcquisitionSignal(`assistant_reply_${laneKey}`, {
          lane: laneLabel,
          stage: /price|checkout|buy|premium|upgrade/i.test(reply) ? "premium-curious" : "exploring",
          socialFeedback: `${getAssistantDisplayName(assistant.id)} delivered a live reply in the ${laneLabel.toLowerCase()} lane.`
        })
      }
      bumpHairScore(1)
      speakReply(reply)
      state.ariaCount += 1
  const limit = (state.subscription === "pro" || state.subscription === "yoda" || state.subscription === "fantasy300" || state.subscription === "fantasy600" || isProOverride()) ? 1e9 : (state.subscription === "premium" ? 8 : 2)
    if(state.ariaCount >= limit){
      state.ariaBlocked = true
      openModal("puzzleModal")
    }
    }catch{
      const fallbackReply = buildLocalAssistantFallback(msg, assistant)
      appendAria(`${assistant.name}: ${fallbackReply}`)
      appendConversation("aria", fallbackReply)
      showSpeechPopup(assistant.name, fallbackReply)
      speakReply(fallbackReply)
      setAriaFlow("idle")
    }
  }

  function buildLocalAssistantFallback(msg, assistant){
    const text = String(msg || "").toLowerCase()
    const isJake = assistant?.id === "projake"
    if(isJake){
      if(/studio|record|beat|mix|song|motherboard|export/.test(text)){
        return "Hello, I'm Jake. Start with your voice on the first board, line the beat up on the second board, and use the third board for adlibs or harmony so the song feels complete before export."
      }
      return "Hello, I'm Jake. I am here to keep the studio calm, the boards lined up, and the export feeling finished."
    }
    if(/dry|dryness|moisture|frizz|thirsty/.test(text)){
      return "Hello, I'm Aria. For dryness, I would start with Laciador Crece because it supports moisture and smoother styling. That lane is about $40, and if you want the full checkout next, visit the custom order page or the product page and I will keep you moving."
    }
    if(/damage|burn|breakage/.test(text)){
      return "Hello, I'm Aria. This sounds like a recovery lane first. I would slow down heat, move into repair support, and then choose the product lane that protects the hair before styling."
    }
    if(/oily|greasy|scalp/.test(text)){
      return "Hello, I'm Aria. For oily roots or scalp stress, I would keep the routine lighter and balance-first instead of jumping into a heavy styling product."
    }
    return "Hello, I'm Aria. Tell me the issue first, like dryness, frizz, damage, low bounce, or color loss, and I will route you to the right SupportRD product and next step."
  }

  let cachedAriaVoice = null
    
function setAriaFlow(state){
  const overlay = qs("#listeningOverlay")
  const textEl = qs("#ariaFlowText")
  const transcriptEl = qs("#ariaTranscript")
  const nowPlaying = qs("#audioNowPlaying")
  const gpsActive = qs("#tab-gps")?.classList.contains("active")
  document.body.classList.toggle("gps-active", !!gpsActive)
  document.body.classList.toggle("aria-speaking", state === "speaking")
  if(!overlay || !textEl) return
  if(state === "listening"){
    document.body.classList.add("listening")
    textEl.textContent = "Listening…"
    if(nowPlaying){ nowPlaying.textContent = "Currently Playing Audio Feedback: Listening tone" }
    if(transcriptEl){ transcriptEl.textContent = "Say something about your hair…" }
  }else if(state === "processing"){
    document.body.classList.add("listening")
    textEl.textContent = "Processing…"
    if(nowPlaying){ nowPlaying.textContent = "Currently Playing Audio Feedback: Processing tone" }
    if(transcriptEl){ transcriptEl.textContent = "Analyzing your words…" }
  }else if(state === "speaking"){
    document.body.classList.add("listening")
    textEl.textContent = "ARIA Speaking…"
    if(nowPlaying){ nowPlaying.textContent = "Currently Playing Audio Feedback: ARIA voice response" }
    if(transcriptEl){ transcriptEl.textContent = "Replying with hair guidance…" }
  }else{
    document.body.classList.remove("listening")
    document.body.classList.remove("aria-speaking")
    document.body.classList.remove("gps-active")
    if(nowPlaying){ nowPlaying.textContent = "Currently Playing Audio Feedback: Idle" }
  }
}

function getAriaLang(){
  const sel = qs("#ariaLanguage")
  return (sel && sel.value) ? sel.value : "en-US"
}

async function speakReply(text){
    const transcriptEl = qs("#ariaTranscript")
    try{
      setAriaFlow("speaking")
      const prefs = state.socialLinks || {}
      const r = await fetch("/api/aria/speech", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          text,
          voice_preference: prefs.voiceProfile || "shimmer",
          wife_mode: !!prefs.wifeVoiceMode,
          wife_consent: !!prefs.wifeVoiceConsent,
          voice_reference: prefs.voiceReference || "",
          muslim_greeting: !!prefs.muslimGreeting,
          same_feel_voice: !!prefs.sameFeelVoice,
          thought_style: prefs.thoughtStyle || "",
          voice_reference_pack: prefs.voiceReferencePack || ""
        })
      })
      if(!r.ok) throw new Error("tts failed")
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = ()=>{
        playDoneChime()
        setAriaFlow("idle")
        URL.revokeObjectURL(url)
      }
      await audio.play()
      return
    }catch(e){
      if(transcriptEl){ transcriptEl.textContent = "Using device voice…" }
    }

    try{
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 1
      utter.pitch = 1.1
      const lang = getAriaLang()
      utter.lang = lang
      const voices = window.speechSynthesis.getVoices() || []
      const nameOrder = [
        "Google US English",
        "Microsoft Aria Online (Natural) - English (United States)",
        "Microsoft Jenny Online (Natural) - English (United States)",
        "Samantha",
        "Zira",
        "Ava",
        "Allison",
        "Victoria",
        "Karen"
      ]
      if(!cachedAriaVoice){
        cachedAriaVoice =
          nameOrder.map(n => voices.find(v => v.name === n && v.lang === lang)).find(Boolean) ||
          voices.find(v => v.lang === lang && /female|woman|girl/i.test(v.name)) ||
          voices.find(v => v.lang === lang) ||
          voices.find(v => v.lang === "en-US")
      }
      if(cachedAriaVoice){ utter.voice = cachedAriaVoice }
      utter.onstart = ()=>setAriaFlow("speaking")
      utter.onend = ()=>{
        playDoneChime()
        setAriaFlow("idle")
      }
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
  }
  if(window.speechSynthesis && typeof window.speechSynthesis.onvoiceschanged !== "undefined"){
    window.speechSynthesis.onvoiceschanged = ()=>{ cachedAriaVoice = null }
  }
  
  let listenCtx = null
  let listenOsc = null
  let listenGain = null
  let listenLfo = null
  let listenLfoGain = null
  function startListenLoop(){
    stopListenLoop()
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext
      listenCtx = new Ctx()
      listenOsc = listenCtx.createOscillator()
      listenGain = listenCtx.createGain()
      listenLfo = listenCtx.createOscillator()
      listenLfoGain = listenCtx.createGain()
      listenOsc.type = "sine"
      listenOsc.frequency.value = 430
      listenGain.gain.value = 0.02
      listenLfo.type = "sine"
      listenLfo.frequency.value = 0.8
      listenLfoGain.gain.value = 0.03
      listenLfo.connect(listenLfoGain)
      listenLfoGain.connect(listenGain.gain)
      listenOsc.connect(listenGain)
      listenGain.connect(listenCtx.destination)
      listenOsc.start()
      listenLfo.start()
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
  }
  function stopListenLoop(){
    try{
      if(listenGain){
        const t = listenCtx.currentTime
        listenGain.gain.setTargetAtTime(0.0001, t, 0.05)
      }
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
    setTimeout(()=>{
      try{ if(listenOsc) listenOsc.stop() }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
      try{ if(listenLfo) listenLfo.stop() }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
      try{ if(listenCtx) listenCtx.close() }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
      listenCtx = listenOsc = listenGain = listenLfo = listenLfoGain = null
    }, 160)
  }

  function playDoneChime(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "triangle"
    osc.frequency.value = 660
    gain.gain.value = 0.06
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    setTimeout(()=>{osc.frequency.value = 880}, 120)
    setTimeout(()=>{osc.stop(); ctx.close()}, 280)
  }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
}

  function setupTabs(){
  qsa(".tab-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
      btn.classList.add("active")
      const id = btn.dataset.tab
      qsa(".tab-panel").forEach(p=>p.classList.remove("active"))
      qs(`#tab-${id}`).classList.add("active")
    })
  })
}

function setupThemeArrows(){
  const prev = qs("#themePrevSide")
  const next = qs("#themeNextSide")
  if(!prev || !next) return
  const saved = localStorage.getItem("theme") || DEFAULT_THEME
  state.themeIndex = Math.max(0, THEMES.indexOf(saved))
  applyTheme()

  prev.addEventListener("click", ()=>{state.themeIndex = (state.themeIndex - 1 + THEMES.length) % THEMES.length; applyTheme()})
  next.addEventListener("click", ()=>{state.themeIndex = (state.themeIndex + 1) % THEMES.length; applyTheme()})

  function applyTheme(){
    const keep = []
    if(document.body.classList.contains("resort-brochure")) keep.push("resort-brochure")
    if(document.body.classList.contains("natural-pro")) keep.push("natural-pro")
    if(document.body.classList.contains("plus500")) keep.push("plus500")
    if(document.body.classList.contains("system-theme")) keep.push("system-theme")
    document.body.className = `theme-${THEMES[state.themeIndex]} ${keep.join(" ")}`.trim()
    localStorage.setItem("theme", THEMES[state.themeIndex])
    const content = THEME_CONTENT[state.themeIndex % THEME_CONTENT.length]
    const hero = qs(".center-hero")
    if(hero && content){
      const h2 = hero.querySelector("h2")
      const p = hero.querySelector("p")
      if(h2) h2.textContent = content.title
      if(p) p.textContent = content.desc
    }
    const icon = qs("#heroIcon")
    if(icon){
      icon.style.filter = HERO_FILTERS[state.themeIndex % HERO_FILTERS.length]
    }
  }

  function setupScanPills(){
    qsa(".scan-pill").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const issue = btn.dataset.aria || btn.textContent.trim()
        const post = qs("#postInput")
        if(post){
          const line = `Hair scan update: ${issue}. Looking for a fix, routine, and product match.`
          post.value = line
          post.focus()
        }
        btn.classList.remove("bounce")
        void btn.offsetWidth
        btn.classList.add("bounce")
      })
    })
  }
  setupScanPills()
}


function setupModals(){
  const occBtn = qs("#menuOccasion")
  if(occBtn){
    occBtn.addEventListener("click", ()=>{
      if(state.subscription === "free" && !isProOverride()){
        openModal("subscriptionModal")
        toast("Occasion Editor is Premium+")
        return
      }
      openModal("occasionModal")
    })
  }
  bindOpen("menuGift", "giftModal")
  bindOpen("menuCustomOrderTop", "customOrderModal")
  bindOpen("menuSellAria", "sellAriaModal")
  bindOpen("menuSettings", "settingsModal")
  bindOpen("menuSubscription", "subscriptionModal")
  const creditTop = qs("#menuCreditTop")
  if(creditTop){
    creditTop.addEventListener("click", ()=>{
      qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
      qsa(".tab-panel").forEach(p=>p.classList.remove("active"))
      const panel = qs("#tab-credit")
      if(panel){ panel.classList.add("active") }
    })
  }
  bindClose("closeOccasion", "occasionModal")
  bindClose("closeGift", "giftModal")
  bindClose("closeSubscription", "subscriptionModal")
  bindClose("closeSellAria", "sellAriaModal")
  bindOpen("openSeo", "seoModal")
  bindClose("closeSeo", "seoModal")
  bindClose("closeBlog", "blogModal")
  bindClose("closeBlogX", "blogModal")
  bindClose("closeApp", "appModal")
  bindClose("closeLink", "linkModal")
  bindClose("closePuzzle", "puzzleModal")
  bindClose("closeCustomOrder", "customOrderModal")
  bindClose("closeReel", "reelModal")
  bindClose("closeSettings", "settingsModal")
  bindClose("closeBrochure", "brochureModal")
  bindClose("closeOccasion6Q", "occasion6qModal")
  bindClose("closeRequestCall", "requestCallModal")
  bindClose("closeEmergencyAssist", "emergencyAssistModal")

  // Real-work quick close: tap random outside spots to dismiss current modal.
  document.addEventListener("click", (e)=>{
    const openModals = qsa(".modal").filter(m => getComputedStyle(m).display !== "none")
    if(!openModals.length) return
    const top = openModals[openModals.length - 1]
    const card = top.querySelector(".modal-card")
    if(card && card.contains(e.target)) return
    if(e.target.closest(".menu-btn, .btn, .chip, .tab-btn, .app-card")) return
    top.style.display = "none"
  })
  document.addEventListener("keydown", (e)=>{
    if(e.key !== "Escape") return
    const openModals = qsa(".modal").filter(m => getComputedStyle(m).display !== "none")
    if(!openModals.length) return
    openModals[openModals.length - 1].style.display = "none"
  })

  qsa(".blog-post").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.blogIndex = Number(btn.dataset.post)
      renderBlog()
      openModal("blogModal")
    })
  })

  qs("#blogPrev").addEventListener("click", ()=>{state.blogIndex = (state.blogIndex - 1 + BLOG_POSTS.length) % BLOG_POSTS.length; renderBlog()})
  qs("#blogNext").addEventListener("click", ()=>{state.blogIndex = (state.blogIndex + 1) % BLOG_POSTS.length; renderBlog()})

  qsa("#appsRow .app-card").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const name = btn.dataset.app
        if(name && name.includes("Donate")){
          renderApp(name)
          openModal("appModal")
          return
        }
    const link = btn.dataset.link
    if(link){
      openLinkModal(link, "SupportRD Link")
      return
    }
        if(name === "Settings"){
          openModal("settingsModal")
          return
        }
        if(name === "Blog"){
          state.blogIndex = 0
          renderBlog()
          openModal("blogModal")
          return
        }
        if(name === "SEO Engine Viewer"){
          openModal("seoModal")
          return
        }
        if(name === "Occasion Editor"){
          if(state.subscription === "free" && !isProOverride()){
            openModal("subscriptionModal")
            toast("Occasion Editor is Premium+")
            return
          }
          openModal("occasionModal")
          return
        }
        if(name === "Subscription Banner"){
          openModal("subscriptionModal")
          return
        }
        if(name === "Brochure"){
          openModal("brochureModal")
          return
        }
        if(name === "Studio Mode"){
          if(typeof window.openStudioMode === "function"){
            window.openStudioMode()
            return
          }
        }
        if(name === "TV Reel"){
          openModal("reelModal")
          return
        }
        bumpHairScore(1)
        if(name === "Snapshot Coder Idea" && state.subscription === "free"){
          openModal("subscriptionModal")
          toast("Snapshot Coder is Premium+")
          return
        }
        renderApp(name)
        openModal("appModal")
      })
    })

}

function openModal(id){
  const el = qs("#" + id)
  if(el){ el.style.display = "flex" }
}

function closeModal(id){
  const el = qs("#" + id)
  if(el){ el.style.display = "none" }
}

function bindOpen(triggerId, modalId){
  const el = qs("#" + triggerId)
  if(el){ el.addEventListener("click", ()=>openModal(modalId)) }
}

function bindClose(triggerId, modalId){
  const el = qs("#" + triggerId)
  if(el){ el.addEventListener("click", ()=>closeModal(modalId)) }
}

function openLinkModal(url, title){
    const modal = qs("#linkModal")
    const frame = qs("#linkFrame")
    const header = qs("#linkTitle")
    const notice = qs("#linkNotice")
    const external = qs("#linkExternal")
    if(!modal || !frame || !header) return
    const isShopifyCommerceUrl = /^https:\/\/(?:supportrd\.com|[a-z0-9-]+\.myshopify\.com)\/(products\/|cart\b|account\/orders\b|pages\/)/i.test(url || "")
    header.textContent = title || "Open Link"
  if(url && url.startsWith("mailto:")){
    notice.style.display = "block"
    external.style.display = "inline-flex"
    external.onclick = ()=>{ window.location.href = url }
    frame.src = "about:blank"
  } else {
    notice.style.display = isShopifyCommerceUrl ? "block" : "none"
    notice.textContent = isShopifyCommerceUrl
      ? "SupportRD is keeping this Shopify lane inside the page. If the store blocks the embed, use Open Externally."
      : ""
    external.style.display = isShopifyCommerceUrl ? "inline-flex" : "none"
    external.onclick = isShopifyCommerceUrl ? ()=>{ window.open(url, "_blank", "noopener,noreferrer") } : null
    frame.src = url || "about:blank"
  }
    modal.style.display = "flex"
  }

function buildGeneralInfoUrl(key){
  const map = {
    guide: "https://supportrd.com/#general-info-guide",
    settings: "https://supportrd.com/#general-info-settings",
    payments: "https://supportrd.com/#general-info-payments",
    subscribe: "https://supportrd.com/#general-info-subscribe",
    blog: "https://supportrd.com/#general-info-blog",
    official: "https://supportrd.com/#general-info-official"
  }
  return map[key] || "https://supportrd.com/#general-info"
}

function ensureGeneralInfoShell(){
  let shell = qs("#generalInfoShell")
  if(shell) return shell
  shell = document.createElement("section")
  shell.id = "generalInfoShell"
  shell.className = "general-info-shell hidden"
  shell.innerHTML = `
    <div class="general-info-backdrop" data-general-close></div>
    <div class="general-info-panel glass">
      <div class="general-info-head">
        <div>
          <div class="float-mode-kicker">SupportRD General Info</div>
          <h3 id="generalInfoTitle">General Info</h3>
          <p id="generalInfoSummary">SupportRD separates info routes from the live Remote tools.</p>
        </div>
        <button class="btn ghost" type="button" data-general-close>X</button>
      </div>
      <div id="generalInfoUrl" class="general-info-url">https://supportrd.com/#general-info</div>
      <div id="generalInfoBody" class="general-info-body"></div>
      <div class="general-info-actions">
        <button class="btn ghost" type="button" data-general-close>Close</button>
      </div>
    </div>
  `
  document.body.appendChild(shell)
  shell.addEventListener("click", (event)=>{
    const closeBtn = event.target?.closest?.("[data-general-close]")
    if(closeBtn){
      shell.classList.add("hidden")
      shell.setAttribute("aria-hidden", "true")
      return
    }
    const actionBtn = event.target?.closest?.("[data-general-action]")
    if(!actionBtn) return
    const action = actionBtn.getAttribute("data-general-action")
    if(action === "open-settings") qs("#floatLaunchSettings")?.click()
    if(action === "open-fastpay") qs("#remotePurchaseProducts")?.click()
    if(action === "open-blog"){
      state.blogIndex = 0
      renderBlog()
      openModal("blogModal")
    }
    if(action === "open-kito-gps") openKitoGpsLane()
    if(action === "open-official-site") window.location.assign("https://supportrd.com")
  })
  return shell
}

function openGeneralInfoPage(key){
  const shell = ensureGeneralInfoShell()
  const pages = {
    guide: {
      title: "Live Guidance",
      summary: "Live Guidance is a sticky general-info route. The Remote keeps running underneath while this page explains where each tool lives.",
      body: `
        <div class="general-info-grid">
          <article class="general-info-card">
            <strong>Remote Layer</strong>
            <p>Diary, Studio Quick Panel, Profile, Map Change, FAQ Lounge, and the 2 funnel ads stay in the live Remote system.</p>
          </article>
          <article class="general-info-card">
            <strong>Info Layer</strong>
            <p>Live Guidance, General Settings, Payments, Subscribe In, Blog, and Official Webpages stay as calm sticky info pages.</p>
          </article>
        </div>
        <div class="general-info-actions-row">
          <button class="btn" data-general-action="open-settings">Open Account Settings</button>
          <button class="btn ghost" data-general-action="open-blog">Open Main Blog</button>
        </div>
      `
    },
    settings: {
      title: "General Settings",
      summary: "General Settings stays separate from the Remote controls and covers account verification, route links, password/email changes, and opt-ins.",
      body: `
        <div class="general-info-list">
          <div>Email change: verify the old address, confirm the new one, then save.</div>
          <div>Password change: request reset, approve by email, then lock in the new password.</div>
          <div>Push/text prompts: phone alerts stay opt-in only.</div>
        </div>
        <div class="general-info-actions-row">
          <button class="btn" data-general-action="open-settings">Open Configuration</button>
        </div>
      `
    },
    payments: {
      title: "Payments",
      summary: "Payments is the SupportRD product and premium lane. This info page keeps the explanation separate from the live Remote tools.",
      body: `
        <div class="general-info-grid">
          <article class="general-info-card">
            <strong>Hair Advisor Premium</strong>
            <p>Premium, Pro, Studio, and support-tip routes all run through the Shopify product stack.</p>
          </article>
          <article class="general-info-card">
            <strong>Account Gate</strong>
            <p>Sign-in stays lightweight until purchase, then SupportRD saves the premium lane to the buyer account.</p>
          </article>
        </div>
        <div class="general-info-actions-row">
          <button class="btn" data-general-action="open-fastpay">Open Fast Pay</button>
        </div>
      `
    },
    subscribe: {
      title: "Subscribe In",
      summary: "Subscribe In is the retention lane for newsletter, phone alerts, and social posting prep.",
      body: `
        <div class="general-info-list">
          <div>Subscriber letter opt-in</div>
          <div>Phone/text alert preference</div>
          <div>Social follow-up prep</div>
        </div>
        <div class="general-info-actions-row">
          <button class="btn" data-general-action="open-settings">Open Subscription Controls</button>
        </div>
      `
    },
    blog: {
      title: "Blog",
      summary: "Blog lives as a general-info page and then expands into the full main blog modal when you want the article itself.",
      body: `
        <div class="general-info-grid">
          <article class="general-info-card">
            <strong>Guest Post Angle</strong>
            <p>The SEO engine keeps shaping hair-only guest-post ideas, reel-backed studies, and SupportRD authority content.</p>
          </article>
          <article class="general-info-card">
            <strong>What Opens Next</strong>
            <p>Use the button below to open the full blog reading modal with the visible X close button.</p>
          </article>
        </div>
        <div class="general-info-actions-row">
          <button class="btn" data-general-action="open-blog">Open Main Blog</button>
        </div>
      `
    },
    official: {
      title: "Official Webpages",
      summary: "Official Webpages keeps the main site, directions, and owner contact routes in one calm info page.",
      body: `
        <div class="general-info-list">
          <div>Main website: SupportRD home and storefront presence</div>
          <div>GPS route: Kito House in Villa Gonzalez, Santiago, Dominican Republic</div>
          <div>Direct support: xxfigueroa1993@yahoo.com · 980-375-9197</div>
        </div>
        <div class="general-info-actions-row">
          <button class="btn" data-general-action="open-official-site">Open Main Site</button>
          <button class="btn ghost" data-general-action="open-kito-gps">Guide Me To Kito House</button>
        </div>
      `
    }
  }
  const page = pages[key] || pages.guide
  shell.querySelector("#generalInfoTitle").textContent = page.title
  shell.querySelector("#generalInfoSummary").textContent = page.summary
  shell.querySelector("#generalInfoUrl").textContent = buildGeneralInfoUrl(key)
  shell.querySelector("#generalInfoBody").innerHTML = page.body
  shell.classList.remove("hidden")
  shell.setAttribute("aria-hidden", "false")
  try{
    history.replaceState({}, "", buildGeneralInfoUrl(key))
  }catch{}
  setRemoteStatus?.(`${page.title} is open as a sticky general-info page while the Remote keeps running behind it.`)
}

  function setupCenterCheckoutMenu(){
    const productMap = {
      checkoutPremiumBtn: "premium",
      checkoutProBtn: "pro",
      checkoutFamilyBtn: "family200",
      checkoutBingoBtn: "bingo100",
      checkoutDonateBtn: "donate"
    }
    Object.entries(productMap).forEach(([id, key])=>{
      const btn = qs("#" + id)
      const product = REMOTE_PAY_PRODUCTS.find((item)=>item.key === key)
      if(btn && product){ btn.addEventListener("click", ()=>launchShopifyCheckout(product, "Center Checkout Menu")) }
    })
    const routeMap = {
      checkoutCartBtn: [LINKS.cart, "Shopify Cart"],
      checkoutOrdersBtn: [LINKS.myOrders, "My Orders"]
    }
    Object.entries(routeMap).forEach(([id, [url, title]])=>{
      const btn = qs("#" + id)
      if(btn){ btn.addEventListener("click", ()=>openLinkModal(url, title)) }
    })
    const inquiry = qs("#checkoutInquiryBtn")
    if(inquiry){ inquiry.addEventListener("click", ()=>openModal("customOrderModal")) }
  }

function renderBlog(){
  const post = BLOG_POSTS[state.blogIndex]
  const title = qs("#blogTitle")
  const body = qs("#blogBody")
  if(title) title.textContent = post.title
  if(body){
    const rawParagraphs = String(post.body || "")
      .split("\n\n")
      .map(line=>line.trim())
      .filter(Boolean)
    const lead = rawParagraphs[0] || "SupportRD is studying live hair topics, real routines, and product-fit decisions."
    const detailParagraphs = rawParagraphs.slice(1)
    const detailMarkup = detailParagraphs.length
      ? detailParagraphs.map(p=>`<p>${p}</p>`).join("")
      : `<p>SupportRD keeps the blog rooted in hair support, healthy routines, and next-step product guidance instead of drifting into unrelated topics.</p>`
    const takeaway = rawParagraphs[rawParagraphs.length - 1] || lead
    const policy = `<div class="remote-blog-policy"><strong>Blog Policy:</strong> Hair-first information only. SupportRD keeps this lane on real routines, growth, damage recovery, and product logic.</div>`
    const article = `
      <article class="remote-blog-article">
        <div class="remote-blog-lead">
          <h3>SupportRD Hair Brief</h3>
          <p>${lead}</p>
        </div>
        <div class="remote-blog-section">
          <h4>What SupportRD Is Seeing</h4>
          ${detailMarkup}
        </div>
        <div class="remote-blog-section">
          <h4>What To Do Next</h4>
          <p>${takeaway}</p>
          <p>Use ARIA for the issue lane, Product Page for the matching solution lane, and FAQ Lounge / Developer Feedback when you want proof before taking the next step.</p>
        </div>
      </article>
    `
    const archive = BLOG_POSTS.map((entry, index)=>`
      <button class="btn ghost" data-blog-jump="${index}" style="justify-content:flex-start;text-align:left;">
        <strong>${entry.title}</strong>
      </button>
    `).join("")
    body.innerHTML = `
      ${policy}
      ${article}
      <div style="margin-top:22px;">
        <h3 style="margin-bottom:10px;">More SupportRD Blog Posts</h3>
        <div style="display:grid;gap:8px;">${archive}</div>
      </div>
    `
    Array.from(body.querySelectorAll("[data-blog-jump]")).forEach(btn=>btn.addEventListener("click", ()=>{
      state.blogIndex = Number(btn.getAttribute("data-blog-jump") || state.blogIndex) || 0
      renderBlog()
    }))
  }
}

function appendAria(text){
  if(!(localStorage.getItem("loggedIn") === "true" || shouldAutoOwnerEntry())){
    const ariaEl = qs("#ariaHistory")
    if(ariaEl) ariaEl.innerHTML = "Sign in to keep Aria / Jake history saved to your account."
    return
  }
  state.ariaHistory.unshift(text)
  if(state.ariaHistory.length > 6) state.ariaHistory.pop()
  localStorage.setItem("ariaHistory", JSON.stringify(state.ariaHistory))
  const ariaEl = qs("#ariaHistory")
  if(ariaEl){
    ariaEl.innerHTML = state.ariaHistory.map(x=>`<div>${x}</div>`).join("")
  }
}

function setupPaymentChooser(){
  const select = qs("#paymentSelect")
  const view = qs("#paymentView")
  if(!select || !view) return
  function planCard(key, extra){
    const p = PLAN_MEDIA[key]
    if(!p) return ""
    return `<div class="digital-product-card" style="margin-bottom:10px;">
      <img src="${p.image}" alt="${p.title}" loading="lazy">
      <div class="digital-product-body">
        <div class="digital-product-title">${p.title}</div>
        <div class="gift-price">${p.price}</div>
        <div class="digital-product-desc">${p.desc}</div>
        ${extra || ""}
      </div>
    </div>`
  }

  async function checkUpgrade(){
    const email = (state.socialLinks && state.socialLinks.email) ? state.socialLinks.email : ""
    try{
      const url = email ? `/api/subscription/status?email=${encodeURIComponent(email)}` : "/api/subscription/status"
      const r = await fetch(url)
      const d = await r.json()
      if(d && d.ok){
        state.subscription = d.subscription || "free"
        state.subscriptionNextDue = d.next_due || d.next_due_at || d.renewal_date || d.expires_at || d.ends_at || ""
        if(qs("#setSubscription")) qs("#setSubscription").value = state.subscription
        updateSubscriptionSummary(state.subscription, d)
        setDefaultLevelBySubscription()
        refreshDealUnlock()
        toast(`Plan: ${(state.subscription || "free").toUpperCase()}`)
      } else {
        updateSubscriptionSummary(qs("#setSubscription")?.value || state.subscription || "free", null)
        toast("Could not verify plan yet")
      }
    }catch{
      updateSubscriptionSummary(qs("#setSubscription")?.value || state.subscription || "free", null)
      toast("Could not verify plan yet")
    }
  }

  function render(){
    const val = select.value
      if(val === "evelyn"){
        view.innerHTML = `<p>Custom order inquiry lane.</p><div class="lock-pill">Use this for manual intake, not your default checkout.</div><div class="lock-pill">For direct Shopify payout routing, use the product checkout options above.</div><button class="btn" id="openCustomOrder">Open Custom Order</button>`
        qs("#openCustomOrder").addEventListener("click", ()=>openModal("customOrderModal"))
        return
      }
    if(val === "premium"){
      view.innerHTML = `${planCard("premium", `<button class="btn" id="goPremium">Pay $35</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">Unlocks 2 ARIA levels + puzzles to continue</div><div class="lock-pill">Activation happens after paid Shopify confirmation</div>`
      qs("#goPremium").addEventListener("click", ()=>openLinkModal(LINKS.premium, "Premium Subscription"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "bingo100"){
      view.innerHTML = `${planCard("bingo100", `<button class="btn" id="goBingo100">Pay $100/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">“You worked hard — relax, I got your hair.” chill support lane.</div><div class="lock-pill">Funny flow + confidence style for 5-to-9 builders (non-21+ mode).</div>`
      qs("#goBingo100").addEventListener("click", ()=>openLinkModal(LINKS.bingo100, "Bingo Fantasy"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "family200"){
      view.innerHTML = `${planCard("family200", `<button class="btn" id="goFamily200">Pay $200/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">Choose your Family Fantasy scene pack and let ARIA prep your next movie moment.</div><div class="lock-pill">Family-safe, high-energy, hair-first coaching style.</div>`
      qs("#goFamily200").addEventListener("click", ()=>openLinkModal(LINKS.family200 || LINKS.custom, "Family Fantasy"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "yoda"){
      view.innerHTML = `${planCard("yoda", `<button class="btn" id="goYoda">Pay $20</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">A focused build version of unlimited ARIA for style-first creators.</div><div class="lock-pill">Talk-to-us deal lane stays in $50 Unlimited ARIA.</div>`
      qs("#goYoda").addEventListener("click", ()=>openLinkModal(LINKS.yoda, "Yoda Pass"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "fantasy300"){
      view.innerHTML = `${planCard("fantasy300", `<button class="btn" id="goFantasy300">Pay $300/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">Flirty-light vibe: “I like your style” and dinner-ready hair energy.</div><div class="lock-pill">Playful 21+ tone, non-explicit, hair-first.</div>`
      qs("#goFantasy300").addEventListener("click", ()=>openLinkModal(LINKS.fantasy300, "Basic Fantasy 21+"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
    if(val === "fantasy600"){
      view.innerHTML = `${planCard("fantasy600", `<button class="btn" id="goFantasy600">Pay $600/mo</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">Meaningful romance storytelling with premium emotional tone.</div><div class="lock-pill">Cinematic, affectionate, non-explicit, hair-first guidance.</div>`
      qs("#goFantasy600").addEventListener("click", ()=>openLinkModal(LINKS.fantasy600, "Advanced Fantasy 21+"))
      qs("#checkPlanNow").addEventListener("click", checkUpgrade)
      return
    }
      if(val === "pro"){
        view.innerHTML = `${planCard("pro", `<button class="btn" id="goPro">Pay $50</button><button class="btn ghost" id="checkPlanNow">Check Upgrade Status</button>`)}<div class="lock-pill">All 4 levels + unlimited ARIA</div><div class="lock-pill">Activation happens after paid Shopify confirmation</div>`
        qs("#goPro").addEventListener("click", ()=>openLinkModal(LINKS.pro, "Professional Subscription"))
        qs("#checkPlanNow").addEventListener("click", checkUpgrade)
        return
      }
      if(val === "donate"){
        view.innerHTML = `<p>SupportRD product tip / donate route.</p><div class="lock-pill">Uses a Shopify product checkout path.</div><button class="btn" id="goDonateProduct">Open Product Checkout</button>`
        qs("#goDonateProduct").addEventListener("click", ()=>openLinkModal(LINKS.donate, "SupportRD Product Tip / Donate"))
        return
      }
      view.innerHTML = `<p>Tip the team.</p><button class="btn" id="tipOrder">Open Tip</button>`
      qs("#tipOrder").addEventListener("click", ()=>openLinkModal(LINKS.donate, "SupportRD Product Tip / Donate"))
  }

  select.addEventListener("change", render)
  render()
}

function setupPostActions(){
  const live = qs("#liveStatus")
  const send = qs("#sendSocials")
  const post = qs("#postSocials")
  const postInput = qs("#postInput")
  const paySelect = qs("#paySelect")
  const tipTeam = qs("#tipTeam")
  const contactEvelyn = qs("#contactEvelyn")
  const indicator = qs("#socialIndicator")
  const socialSelect = qs("#socialSelect")
  const adCta = qs("#adCta")
  const adMembershipCta = qs("#adMembershipCta")
  const tipFrontierBody = qs("#tipFrontierBody")
  const askProductsAgain = qs("#askAriaProductsAgain")

  const feedMap = {
    instagram: "ig",
    tiktok: "tiktok",
    facebook: "fb",
    youtube: "yt",
    x: "x",
    threads: "threads"
  }

  function enabledFeeds(){
    const feeds = state.socialLinks.feeds || {ig:true,tiktok:true,fb:true}
    return Object.keys(feedMap).filter(k => feeds[feedMap[k]])
  }

  function updateIndicator(){
    if(!indicator) return
    const list = enabledFeeds()
    indicator.textContent = list.length ? `Feeds: ${list.map(x=>x[0].toUpperCase()+x.slice(1)).join(", ")}` : "Feeds: none selected"
  }

  function openFeed(key){
    const link = state.socialLinks[feedMap[key]]
    if(link){ openLinkModal(link, "Social Feed"); return true }
    return false
  }

  function postToFeeds(){
    const choice = socialSelect ? socialSelect.value : "all"
    const targets = choice === "all" ? enabledFeeds() : [choice]
    const text = (postInput && postInput.value ? postInput.value.trim() : "")
    if(hasProhibitedContent(text)){
      openMiniWindow("Blocked Content", "Drugs and gang-related content is not allowed.")
      return
    }
    let opened = 0
    targets.forEach(t=>{ if(openFeed(t)) opened++ })
    if(!opened){ toast("Add social links in Settings") }
    if(opened){
      const source = targets.length === 1 ? targets[0] : "social feeds"
      setTimeout(()=>triggerClassActLaugh(source), 800)
    }
    try{
      const text = (postInput && postInput.value ? postInput.value.trim() : "")
      if(text){
        fetch("/api/community/post-intake", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            message: text,
            source: choice === "all" ? "all_feeds_post" : `feed_${choice}`,
            region: "global",
            language: "en"
          })
        }).then(r=>r.json()).then(d=>{
          if(d && d.ok && d.needs_developer){
            openMiniWindow("Family Support Assist", "Escalated to family support contact.")
          }
        }).catch(()=>{})
      }
    }catch{}
  }

  function updateTipFrontier(){
    if(!tipFrontierBody) return
    const tipped = Number(localStorage.getItem("srdTipTotal") || "0")
    const frontierReached = tipped >= 10000
    tipFrontierBody.textContent = frontierReached
      ? `$${tipped.toFixed(2)} tipped · Celebration frontier active`
      : `$${tipped.toFixed(2)} tipped · Frontier pending ($10,000+)`
    if(frontierReached){
      document.body.classList.add("celebration-mode")
      const hideBuy = Math.random() < 0.35
      document.body.classList.toggle("hide-buy-random", hideBuy)
      qsa(".buy-optional").forEach(el=>el.style.display = hideBuy ? "none" : "")
    } else {
      document.body.classList.remove("celebration-mode")
      qsa(".buy-optional").forEach(el=>el.style.display = "")
    }
  }

  if(live){
    live.addEventListener("click", ()=>{
      live.classList.toggle("active")
      live.textContent = live.classList.contains("active") ? "Live Status · ON" : "Live Status"
      bumpHairScore(1)
    })
  }

  if(send){ send.addEventListener("click", postToFeeds) }
  if(post){ post.addEventListener("click", postToFeeds) }
  if(adCta){ adCta.addEventListener("click", ()=>openLinkModal(LINKS.cart, "Shopify Cart")) }
  if(adMembershipCta){ adMembershipCta.addEventListener("click", ()=>openModal("subscriptionModal")) }
  if(socialSelect){
    socialSelect.addEventListener("change", ()=>{
      if(socialSelect.value !== "all"){
        indicator.textContent = `Selected: ${socialSelect.value}`
      } else {
        updateIndicator()
      }
    })
  }

  if(paySelect){
    paySelect.addEventListener("change", ()=>{
      const value = paySelect.value
      if(value.includes("Custom Order")){
        openModal("customOrderModal")
      }
    })
  }
  if(tipTeam){
    tipTeam.addEventListener("click", ()=>{
      const tipped = Number(localStorage.getItem("srdTipTotal") || "0")
      const bump = 25
      localStorage.setItem("srdTipTotal", String(tipped + bump))
      updateTipFrontier()
      openMiniWindow("Tips", `Thanks for tipping SupportRD. Profile value signal +${bump}. Account transfer/sale is disabled for safety.`)
      openLinkModal("https://supportrd.com/cart","Tip SupportRD Family Team")
    })
  }

  if(contactEvelyn){
    contactEvelyn.addEventListener("click", ()=>{
      const phone = (state.socialLinks.evelyn || "829-233-2670").replace(/\D/g,"")
      if(!phone){ toast("Add Evelyn WhatsApp in Settings"); return }
      openLinkModal(`https://wa.me/${phone}?text=Hi%20Evelyn%2C%20I%20need%20help%20with%20my%20order.`,"Contact Evelyn")
    })
  }
  if(askProductsAgain){
    askProductsAgain.addEventListener("click", ()=>{
      const prompt = "What products was I supposed to use again for my hair today? Please give me a simple routine and timing."
      const input = qs("#postInput")
      if(input) input.value = prompt
      if(typeof window.askAriaDirect === "function"){
        window.askAriaDirect(prompt)
      }else{
        openMiniWindow("ARIA", "Open ARIA and ask for product reminders.")
      }
    })
  }

  updateIndicator()
  updateTipFrontier()
}


function setupOccasion(){
  const actionSel = qs("#occasionAction")
  const applySel = qs("#occasionApply")
  const enjoySel = qs("#occasionEnjoy")
  const weekWrap = qs("#weekBoxes")
  if(!actionSel || !applySel || !enjoySel || !weekWrap) return

  const actions = [
    "Normal Action","Getting Up","Wash Day","Training","Travel","Work","School","After Gym","Beach Day","Pool Day",
    "Rainy Day","Sweat Reset","Curl Refresh","Detox Day","Protective Style","Braids Day","Twist Day","Silk Press",
    "Blowout Prep","Color Day","Trim Day","Night Routine","Morning Routine","Self Care","Date Night","Photo Day",
    "Big Fight","Party","Wedding","Brunch","Office Presentation","Interview","Vacation","Salon Visit","Product Test",
    "Scalp Care","Moisture Boost","Protein Boost","Hydration Day","Heat Protect","Overnight Mask","Co‑Wash",
    "Deep Clean","Anti‑Frizz","Volume Day","Edge Control","Sleek Bun","Natural Day","Maintenance Day","Post Swim",
    "Pre Workout","Post Workout","Travel Pack","Festival","Family Event","New Product Day","Weekly Reset"
  ]
  const applies = [
    "Apply Product","Shampoo","Laciador","Mask","Leave In","Serum","Scalp Oil","Heat Protectant","Foam","Gel","Cream",
    "Butter","Conditioner","Deep Conditioner","Clarifying Wash","Co Wash","Edge Control","Mousse","Protein Treatment",
    "Hydration Mist","Styling Spray"
  ]
  const enjoys = [
    "Enjoy Product","Big Fight","Date Night","Photo Day","After Workout","All Day Shine","Smooth Finish","Soft Curls",
    "Volume Boost","Frizz‑Free","Long‑Lasting Style","Protective Glow","Salon‑Ready","Party Ready","Interview Ready"
  ]

  actionSel.innerHTML = actions.map(a=>`<option>${a}</option>`).join("")
  applySel.innerHTML = applies.map(a=>`<option>${a}</option>`).join("")
  enjoySel.innerHTML = enjoys.map(a=>`<option>${a}</option>`).join("")

  const dayPlans = Array.from({length:7}, () => ({action: actionSel.value, apply: applySel.value, enjoy: enjoySel.value}))
  let selectedDay = 0

  function buildDescription(i){
    const plan = dayPlans[i]
    return `Today you will ${plan.action.toLowerCase()}, ${plan.apply.toLowerCase()}, and enjoy ${plan.enjoy.toLowerCase()} for healthy hair.`
  }

  function renderWeek(){
    weekWrap.innerHTML = ""
    for(let i=0;i<7;i++){
      const row = document.createElement("div")
      row.className = "week"
      if(i === selectedDay) row.classList.add("active")
      const plan = dayPlans[i]
      row.innerHTML = `<div class="day-title">Day ${i+1}</div>
        <div class="day-line">${plan.action} · ${plan.apply} · ${plan.enjoy}</div>
        <div class="day-line">AI: ${buildDescription(i)}</div>`
      row.addEventListener("click", ()=>{
        selectedDay = i
        actionSel.value = dayPlans[i].action
        applySel.value = dayPlans[i].apply
        enjoySel.value = dayPlans[i].enjoy
        renderWeek()
      })
      weekWrap.appendChild(row)
    }
  }

  function updatePost(){
    const input = qs("#postInput")
    if(!input) return
    input.value = buildDescription(selectedDay)
  }

  const applyBtn = qs("#applyOccasion")
  const addBtn = qs("#addOccasionPost")
  const open6Q = qs("#openOccasion6Q")
  const apply6Q = qs("#applyOccasion6Q")
  if(applyBtn){ applyBtn.addEventListener("click", ()=>{ dayPlans[selectedDay] = {action: actionSel.value, apply: applySel.value, enjoy: enjoySel.value}; renderWeek() }) }
  if(addBtn){ addBtn.addEventListener("click", updatePost) }
  if(open6Q){
    open6Q.addEventListener("click", ()=>openModal("occasion6qModal"))
  }
  if(apply6Q){
    apply6Q.addEventListener("click", ()=>{
      const look = (qs("#qLookGoal")?.value || "").trim()
      const type = (qs("#qHairType")?.value || "").trim()
      const scalp = (qs("#qScalp")?.value || "").trim()
      const heat = (qs("#qHeat")?.value || "").trim()
      const mins = (qs("#qTime")?.value || "").trim()
      const event = (qs("#qEvent")?.value || "").trim()
      const summary = `Occasion questionnaire: Look=${look || "natural"}, Type=${type || "mixed"}, Scalp=${scalp || "normal"}, Heat=${heat || "no"}, Time=${mins || "15"} mins, Event=${event || "daily routine"}.`
      const input = qs("#postInput")
      if(input){ input.value = summary + " What products and order should I use?" }
      closeModal("occasion6qModal")
      openMiniWindow("6-Questionnaire", "Saved to your plan. ARIA can now refine product sequence.")
      if(typeof window.askAriaDirect === "function"){
        window.askAriaDirect(summary + " Give the exact products and marination timing.")
      }
    })
  }

  actionSel.addEventListener("change", ()=>{ dayPlans[selectedDay].action = actionSel.value; renderWeek() })
  applySel.addEventListener("change", ()=>{ dayPlans[selectedDay].apply = applySel.value; renderWeek() })
  enjoySel.addEventListener("change", ()=>{ dayPlans[selectedDay].enjoy = enjoySel.value; renderWeek() })
  renderWeek()
}

function setupMarinationTimer(){
  const startBtn = qs("#startMarinateTimer")
  const stopBtn = qs("#stopMarinateTimer")
  const minutesSel = qs("#marinateMinutes")
  const status = qs("#marinateTimerStatus")
  if(!startBtn || !stopBtn || !minutesSel || !status) return
  let timer = null
  let endTs = 0
  function draw(){
    if(!endTs){
      status.textContent = "Timer not running."
      return
    }
    const left = Math.max(0, endTs - Date.now())
    if(left <= 0){
      status.textContent = "Marination done. Rinse now."
      clearInterval(timer); timer = null; endTs = 0
      openMiniWindow("ARIA Timer", "Marination complete. Time to rinse.")
      if(typeof window.askAriaDirect === "function"){
        window.askAriaDirect("My marination timer just ended. What is my next product step?")
      }
      return
    }
    const mm = Math.floor(left / 60000)
    const ss = Math.floor((left % 60000) / 1000)
    status.textContent = `Time left: ${mm}:${String(ss).padStart(2,"0")}`
  }
  startBtn.addEventListener("click", ()=>{
    const mins = Number(minutesSel.value || 10)
    endTs = Date.now() + mins * 60000
    if(timer) clearInterval(timer)
    timer = setInterval(draw, 1000)
    draw()
    openMiniWindow("ARIA Timer", `Marination timer started for ${mins} minutes.`)
  })
  stopBtn.addEventListener("click", ()=>{
    if(timer) clearInterval(timer)
    timer = null
    endTs = 0
    draw()
  })
}

function setupScanUpload(){
  const input = qs("#scanUpload")
  const preview = qs("#scanPreview")
  if(!input || !preview) return
  input.addEventListener("change", ()=>{
    const file = input.files[0]
    if(!file) return
    const url = URL.createObjectURL(file)
    preview.innerHTML = `<img src="${url}" alt="Scan">`
    preview.style.display = "block"
    toast("3D scan photo attached")
  })
}

  function setupProfileUpload(){
    const input = qs("#profileUpload")
    const preview = qs("#profilePreview")
    if(!input || !preview) return
    input.addEventListener("change", ()=>{
      const file = input.files[0]
      if(!file) return
      const url = URL.createObjectURL(file)
      state.userAvatar = url
      if(file.type.startsWith("video")){
      preview.innerHTML = `<video src="${url}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
    } else {
      preview.innerHTML = `<img src="${url}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`
    }
  })
}

function setupGPS(){
  const map = qs("#gpsMap")
  const mapOverlay = qs("#gpsMapOverlay")
  const destInput = qs("#gpsDestination")
  const routeBtn = qs("#gpsRoute")
  const keitoBtn = qs("#openKeitoRoute")
  const rolloutBtn = qs("#openRolloutRoute")
  const rerouteBtn = qs("#gpsRerouteStorefront")
  const storefrontBtn = qs("#gpsStorefrontCheckout")
  const refreshBtn = qs("#gpsStorefrontRefresh")
  const storefrontBalance = qs("#gpsStorefrontBalance")
  const storefrontInventory = qs("#gpsStorefrontInventory")
  const storefrontEnroute = qs("#gpsStorefrontEnroute")
  const storefrontStatus = qs("#gpsStorefrontStatus")
  const gpsPanel = qs("#tab-gps")
  const shampooStoreLink = LINKS.custom || LINKS.premium
  const santiagoMap = "https://www.openstreetmap.org/?mlat=19.4517&mlon=-70.6970#map=11/19.4517/-70.6970"
  const villaMap = "https://www.openstreetmap.org/?mlat=19.4740&mlon=-70.7940#map=13/19.4740/-70.7940"
  function getStorefrontState(){
    const raw = JSON.parse(localStorage.getItem("keitoStorefrontState") || "{}")
    return {
      balance: Number(raw.balance || 0),
      inventory: Number.isFinite(Number(raw.inventory)) ? Number(raw.inventory) : 128,
      enroute: Number.isFinite(Number(raw.enroute)) ? Number(raw.enroute) : 0
    }
  }
  function setStorefrontState(next){
    localStorage.setItem("keitoStorefrontState", JSON.stringify(next))
  }
  function renderStorefrontState(){
    const info = getStorefrontState()
    if(storefrontBalance) storefrontBalance.textContent = `$${info.balance.toFixed(2)}`
    if(storefrontInventory) storefrontInventory.textContent = String(Math.max(0, info.inventory))
    if(storefrontEnroute) storefrontEnroute.textContent = String(Math.max(0, info.enroute))
  }
  function setGpsStatus(text){
    if(storefrontStatus) storefrontStatus.textContent = text
  }
  function activateGpsTab(){
    qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
    qsa(".tab-panel").forEach(p=>p.classList.remove("active"))
    qs('[data-tab="gps"]')?.classList.add("active")
    gpsPanel?.classList.add("active")
    gpsPanel?.scrollIntoView({behavior:"smooth", block:"center"})
  }
  async function routeToDestinationText(dest){
    if(!map || !destInput) return
    destInput.value = dest
    const coordMatch = dest.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/)
    const getOrigin = ()=>new Promise((resolve)=>{
      if(!navigator.geolocation){ resolve(null); return }
      navigator.geolocation.getCurrentPosition(
        pos=>resolve({lat:pos.coords.latitude, lng:pos.coords.longitude}),
        ()=>resolve(null),
        {enableHighAccuracy:true, timeout:6000}
      )
    })
    const origin = await getOrigin()
    if(coordMatch){
      const dLat = coordMatch[1]
      const dLng = coordMatch[3]
      map.src = origin
        ? `https://www.google.com/maps?q=${origin.lat},${origin.lng}+to+${dLat},${dLng}&output=embed`
        : `https://www.google.com/maps?q=${dLat},${dLng}&z=13&output=embed`
      return
    }
    try{
      const q = encodeURIComponent(dest)
      const geo = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}`)
      const data = await geo.json()
      if(!data.length){
        toast("Destination not found")
        return
      }
      const dLat = data[0].lat
      const dLng = data[0].lon
      map.src = origin
        ? `https://www.google.com/maps?q=${origin.lat},${origin.lng}+to+${dLat},${dLng}&output=embed`
        : `https://www.google.com/maps?q=${dLat},${dLng}&z=13&output=embed`
    }catch{
      toast("Route failed")
    }
  }
  async function openKitoGpsLane(){
    activateGpsTab()
    if(typeof window.openWorldMapPanel === "function"){
      try{ window.openWorldMapPanel() }catch{}
    }
    setGpsStatus("Guide to Kito's House is active. GPS mode is centered on Villa Gonzalez now.")
    if(mapOverlay) mapOverlay.textContent = "Kito GPS active. Villa Gonzalez, Santiago, Dominican Republic is highlighted."
    if(destInput) destInput.value = "Villa Gonzalez, Santiago, Dominican Republic"
    if(map){
      map.src = "https://www.google.com/maps?q=Villa+Gonzalez,+Santiago,+Dominican+Republic&z=13&output=embed"
    }
    await routeToDestinationText("Villa Gonzalez, Santiago, Dominican Republic")
    try{ gpsPanel?.scrollIntoView({behavior:'smooth', block:'center'}) }catch{}
  }
  function runStorefrontRouteBot(){
    activateGpsTab()
    const current = getStorefrontState()
    current.enroute += 1
    setStorefrontState(current)
    renderStorefrontState()
    if(mapOverlay) mapOverlay.textContent = "Reroute bot: first zooming to Santiago, Dominican Republic..."
    setGpsStatus("Reroute bot is active. Opening GPS and showing the route toward the live storefront lane.")
    if(map){ map.src = santiagoMap }
    openMiniWindow("Reroute Bot", "Opening GPS and easing into Santiago first. No blocking overlay — just follow the live route card.")
    setTimeout(()=>{
      if(map){ map.src = villaMap }
      if(mapOverlay) mapOverlay.textContent = "Second zoom: Villa Gonzalez, Santiago, Dominican Republic."
      setGpsStatus("Second zoom locked: Villa Gonzalez. Preparing the storefront route and local shampoo pickup lane.")
    }, 1300)
    setTimeout(async ()=>{
      if(mapOverlay) mapOverlay.textContent = "Exact route lane: live storefront / shampoo pickup guide."
      setGpsStatus("Storefront route ready. Use the product button or keep following the route to the live storefront lane.")
      await routeToDestinationText("Villa Gonzalez, Santiago, Dominican Republic")
    }, 2600)
  }
  if(map){
    map.src = "https://www.openstreetmap.org/export/embed.html?bbox=-74.1%2C40.6%2C-73.7%2C40.9&layer=mapnik"
  }
  renderStorefrontState()
  if(keitoBtn){
    keitoBtn.addEventListener("click", async ()=>{
      await openKitoGpsLane()
      try{ openMiniWindow("GPS MODE ACTIVE", "Guide to Kito's House is now opening the live GPS route instead of the old info modal.") }catch{}
    })
  }
  if(rolloutBtn){ rolloutBtn.addEventListener("click", ()=>openModal("rolloutRouteModal")) }
  async function routeToDestination(){
    if(!map || !destInput) return
    const dest = (destInput.value || "").trim()
    if(!dest){
      toast("Enter a destination")
      return
    }
    setGpsStatus(`Routing toward ${dest}.`)
    if(mapOverlay) mapOverlay.textContent = `Routing to ${dest}...`
    await routeToDestinationText(dest)
  }
  if(routeBtn){ routeBtn.addEventListener("click", routeToDestination) }
  if(rerouteBtn){ rerouteBtn.addEventListener("click", runStorefrontRouteBot) }
  if(storefrontBtn){
    storefrontBtn.addEventListener("click", ()=>{
      const current = getStorefrontState()
      current.balance += 20
      current.inventory = Math.max(0, current.inventory - 1)
      setStorefrontState(current)
      renderStorefrontState()
      setGpsStatus("Opening the live storefront lane for the shampoo product route.")
      openLinkModal(shampooStoreLink, "SupportRD Live Storefront")
    })
  }
  if(refreshBtn){
    refreshBtn.addEventListener("click", ()=>{
      renderStorefrontState()
      setGpsStatus("Live storefront stats refreshed.")
      openMiniWindow("Live Storefront", "Balance, inventory, and in-route numbers refreshed for the current storefront lane.")
    })
  }
  bindClose("closeKeitoRoute", "keitoRouteModal")
  bindClose("closeRolloutRoute", "rolloutRouteModal")
  const btn = qs("#findSalons")
  const list = qs("#salonResults")
  if(btn && list){
    btn.addEventListener("click", ()=>{
      list.textContent = "Finding nearby salons..."
      if(!navigator.geolocation){
        list.textContent = "Geolocation not supported."
        return
      }
      navigator.geolocation.getCurrentPosition(async (pos)=>{
        try{
          const r = await fetch("/api/salons",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({lat: pos.coords.latitude, lon: pos.coords.longitude})
          })
          const salons = await r.json()
          if(!salons.length){ list.textContent = "No salons found."; return }
          list.innerHTML = salons.map(s=>`<div>${s.name} - ${s.distance} mi</div>`).join("")
        }catch{
          list.textContent = "Salon lookup failed."
        }
      }, ()=>{ list.textContent = "Location denied."; })
    })
  }
  const hf = qs("#gpsHandsFree")
  if(hf){
    hf.addEventListener("click", ()=>{
      qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
      qsa(".tab-panel").forEach(p=>p.classList.remove("active"))
      qs('[data-tab="handsfree"]').classList.add("active")
      qs("#tab-handsfree").classList.add("active")
      if(window.startAriaListening){ window.startAriaListening() }
    })
  }
  const levelSel = qs("#offRoadLevel")
  const optSel = qs("#offRoadOption")
  const offGo = qs("#offRoadGo")
  const offPing = qs("#offRoadDRPing")
  const offToHelp = qs("#offRoadToHelp")
  const offStatus = qs("#offRoadStatus")
  function setOffStatus(text){ if(offStatus) offStatus.textContent = text }
  if(offGo){
    offGo.addEventListener("click", ()=>{
      const level = (levelSel && levelSel.value) || "organic"
      const opt = (optSel && optSel.value) || "eat"
      const optLabel = {
        eat:"Get a bite to eat",
        meet:"Meet someone personally",
        trails:"Trails",
        haircuts:"Haircuts",
        music:"Music Scene"
      }[opt] || "Option"
      if(level === "organic"){
        setOffStatus(`Organic route: ${optLabel}. Culture mode ON — Formula Exclusiva + ARIA Digital Product support, respondent in keeping the peace with a politically democratic community tone.`)
        if(opt === "eat"){ openLinkModal("https://www.google.com/maps/search/restaurant+near+Santiago+Dominican+Republic", "Restaurant Route") }
        if(opt === "haircuts"){ openLinkModal("https://www.google.com/maps/search/barber+near+Santiago+Dominican+Republic", "Haircut Route") }
        if(opt === "music"){ openLinkModal("https://www.google.com/maps/search/music+venue+Santiago+Dominican+Republic", "Music Scene") }
        if(opt === "trails"){ openLinkModal("https://www.google.com/maps/search/trails+Santiago+Dominican+Republic", "Trails Santiago") }
        if(opt === "meet"){ openLinkModal(LINKS.family200 || LINKS.custom, "Premium Personal Meet Route") }
        return
      }
      if(level === "caution"){
        setOffStatus(`Caution route active for ${optLabel}. Caution ARIA scans extreme scenarios and directs to emergency sequence + doctor route.`)
        const helpTab = qs('.tab-btn[data-tab="ariahelp"]')
        if(helpTab) helpTab.click()
        return
      }
      if(level === "airport"){
        setOffStatus(`Airport route active: terminal path + low-key boat routing references (island hop planning like Puerto Rico).`)
        openLinkModal("https://www.google.com/maps/search/Santiago+airport+Dominican+Republic", "Airport Route")
      }
    })
  }
  if(offPing){
    offPing.addEventListener("click", ()=>{
      const msg = encodeURIComponent("SupportRD request: help connect contacts in Santiago Dominican Republic. Reference: Figueroa / Ramlin / Crystal / Kito.")
      openLinkModal(`mailto:agentanthony@supportrd.com?subject=DR%20Contact%20Ping&body=${msg}`, "DR Contact Ping")
      setOffStatus("DR contact ping sent. Awaiting response for known contacts in Santiago.")
    })
  }
  if(offToHelp){
    offToHelp.addEventListener("click", ()=>{
      const t = qs('.tab-btn[data-tab="ariahelp"]')
      if(t) t.click()
    })
  }
}

function setupSEOLogs(){
  const streams = [qs("#logStream"), qs("#logStreamStandalone")].filter(Boolean)
  let timer = null
  const close = qs("#closeSeo")
  const publish = qs("#seoPublish")
  const autoBtn = qs("#seoAuto")
  const autoStandalone = qs("#seoAutoStandalone")
  const testBtn = qs("#testEmailBtn")
  const wellnessBlast = qs("#wellnessBlast")
  if(!streams.length) return
  if(timer) clearInterval(timer)
  timer = setInterval(()=>{
    const line = `[${new Date().toLocaleTimeString()}] render: build ok · cache hit · seo feed synced`
    streams.forEach(stream=>{
      const div = document.createElement("div")
      div.textContent = line
      stream.appendChild(div)
      stream.scrollTop = stream.scrollHeight
    })
  }, 4800)
  if(close){ close.addEventListener("click", ()=>{ if(timer) clearInterval(timer) }) }
  if(publish){
    publish.addEventListener("click", async ()=>{
      const r = await fetch("/api/seo/publish", {method:"POST"})
      const d = await r.json()
      streams.forEach(stream=>{
        const div = document.createElement("div")
        div.textContent = `[SEO] ${d.ok ? "Published" : "Failed"} · ${d.message || d.error || ""}`
        stream.appendChild(div)
        stream.scrollTop = stream.scrollHeight
      })
    })
  }
  if(autoBtn){
    autoBtn.addEventListener("click", async ()=>{
      const enabled = !autoBtn.classList.contains("active")
      const ok = await setSeoAuto(enabled, streams[0])
      if(ok){
        autoBtn.classList.toggle("active", enabled)
        autoBtn.textContent = enabled ? "SEO 4x/Day Active" : "Activate SEO 4x/Day (Random)"
      }
    })
  }
  if(autoStandalone){
    autoStandalone.addEventListener("click", async ()=>{
      const enabled = !autoStandalone.classList.contains("active")
      const ok = await setSeoAuto(enabled, streams[0])
      if(ok){
        autoStandalone.classList.toggle("active", enabled)
        autoStandalone.textContent = enabled ? "SEO 4x/Day Active" : "Activate SEO 4x/Day (Random)"
      }
    })
  }
  if(testBtn){
    testBtn.addEventListener("click", async ()=>{
      const r = await fetch("/api/custom-order/test", {method:"POST"})
      const d = await r.json()
      streams.forEach(stream=>{
        const div = document.createElement("div")
        div.textContent = `[EMAIL] ${d.ok ? "Test sent" : "Test failed"}`
        stream.appendChild(div)
        stream.scrollTop = stream.scrollHeight
      })
    })
  }
  if(wellnessBlast){
    wellnessBlast.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/wellness/send-all", {method:"POST"})
        const d = await r.json()
        const line = d.ok
          ? `[CARE] Sent ${d.sent}/${d.total}. Failed: ${d.failed}`
          : `[CARE] Failed · ${d.error || "unknown"}`
        streams.forEach(stream=>{
          const div = document.createElement("div")
          div.textContent = line
          stream.appendChild(div)
          stream.scrollTop = stream.scrollHeight
        })
      }catch{
        streams.forEach(stream=>{
          const div = document.createElement("div")
          div.textContent = "[CARE] Failed · network_error"
          stream.appendChild(div)
          stream.scrollTop = stream.scrollHeight
        })
      }
    })
  }
}

function formatMoney(value, currency){
  const amount = Number(value || 0)
  try{
    return new Intl.NumberFormat(undefined, {style:"currency", currency: currency || "USD", maximumFractionDigits: 2}).format(amount)
  }catch{
    return `$${amount.toFixed(2)}`
  }
}

function setupCredit(){
  const email = qs("#creditEmail")
  const country = qs("#creditCountry")
  const income = qs("#creditIncome")
  const debt = qs("#creditDebt")
  const amount = qs("#creditAmount")
  const term = qs("#creditTerm")
  const risk = qs("#creditRiskFlag")
  const evaluate = qs("#creditEvaluate")
  const load = qs("#creditLoadStatus")
  const payMembership = qs("#creditPayMembership")
  const payProducts = qs("#creditPayProducts")
  const dealBtn = qs("#talkDealBtn")
  const dealLockNote = qs("#dealLockNote")
  const requestTransferBtn = qs("#requestTransferBtn")
  const reverifyTransferBtn = qs("#reverifyTransferBtn")
  const approveTransferBtn = qs("#approveTransferBtn")
  const toggleTransferReleaseBtn = qs("#toggleTransferReleaseBtn")
  const transferStatusNote = qs("#transferStatusNote")
  const transferReleaseState = qs("#transferReleaseState")
  const tradeBotOrbit = qs("#tradeBotOrbit")
  const tradeBotsStatus = qs("#tradeBotsStatus")
  const refreshTradeBotsBtn = qs("#refreshTradeBotsBtn")
  const runTradeBotsBtn = qs("#runTradeBotsBtn")
  const log = qs("#creditDecisionLog")
  let tradeBotRefs = {}
  let lastHeartbeatSentAt = 0

  if(!log) return

  async function refreshTransferReleaseState(){
    if(!transferReleaseState) return
    try{
      const r = await fetch("/api/account-transfer/status")
      const d = await r.json()
      if(d && d.ok){
        const pct = Math.round(Number(d.trade_service_tax_rate || 0.05) * 100)
        transferReleaseState.textContent = `Sell ARIA release: ${d.sell_aria_release_open ? "OPEN" : "HOLD"} · Cap: $${Number(d.trade_cap_usd || 50000).toLocaleString()} · Service tax: ${pct}% · Founder required: YES`
      } else {
        transferReleaseState.textContent = "Sell ARIA release status unavailable."
      }
    }catch{
      transferReleaseState.textContent = "Sell ARIA release status unavailable."
    }
  }
  refreshTransferReleaseState()

  async function refreshTradeBotsStatus(){
    if(!tradeBotsStatus) return
    function modeForBot(b){
      const now = Date.now()
      const ts = b.last_run_at ? new Date(b.last_run_at).getTime() : 0
      const ageSec = ts ? Math.max(0, (now - ts) / 1000) : 9999
      if((b.last_status || "").toLowerCase() === "error" || ageSec > 180) return "inout"
      const m = b.metrics || {}
      let load = 0
      if((b.bot_id || "") === "risk"){
        load = Number(m.open_requests || 0) + Number(m.flagged_cap || 0) * 3
      }else if((b.bot_id || "") === "ops"){
        const c = m.counts || {}
        load = Number(c.pending_review || 0) + Number(c.reverify_required || 0) + Number(m.expired_reverify || 0) * 2 + Number(m.expired_pending || 0) * 2
      }else{
        load = Number(m.reviewed_items || 0) + Number(m.policy_holds || 0) * 3
      }
      if(load >= 8) return "fast"
      if(load >= 2) return "normal"
      return "slow"
    }
    function modeLabel(mode){
      if(mode === "fast") return "busy"
      if(mode === "normal") return "pending"
      if(mode === "inout") return "in-out"
      return "slow"
    }
    try{
      const r = await fetch("/api/trade-bots/status")
      const d = await r.json()
      if(!(d && d.ok && Array.isArray(d.bots))){
        tradeBotsStatus.textContent = "Bot status unavailable."
        return
      }
      tradeBotsStatus.innerHTML = d.bots.map((b)=>{
        const fn = (b.functions || []).map(x=>`<li>${x}</li>`).join("")
        const when = b.last_run_at ? new Date(b.last_run_at).toLocaleString() : "Never"
        const mode = modeForBot(b)
        const ref = tradeBotRefs[String(b.bot_id || "").toLowerCase()]
        if(ref && ref.el){
          ref.el.classList.remove("hb-fast","hb-normal","hb-slow","hb-inout")
          ref.el.classList.add(`hb-${mode}`)
          ref.el.title = `${String(b.bot_id || "").toUpperCase()} bot · heartbeat ${modeLabel(mode)}`
        }
        return `<div style="margin:6px 0;padding:8px;border-radius:10px;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.04);">
          <div><strong>${String(b.bot_id || "").toUpperCase()} BOT</strong> · ${b.last_status || "idle"} · ${when} · heartbeat: ${modeLabel(mode)}</div>
          <div style="margin-top:4px;">${b.last_summary || ""}</div>
          <ul style="margin:6px 0 0 16px;">${fn}</ul>
        </div>`
      }).join("")
      const now = Date.now()
      if(now - lastHeartbeatSentAt > 60000){
        const entries = d.bots.map((b)=>({
          bot_id: String(b.bot_id || "").toLowerCase(),
          beat_mode: modeForBot(b),
          source: "ui",
          status: String(b.last_status || "idle").toLowerCase(),
          metrics: b.metrics || {}
        }))
        fetch("/api/trade-bots/heartbeat-log", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({entries})
        }).catch(()=>{})
        lastHeartbeatSentAt = now
      }
    }catch{
      tradeBotsStatus.textContent = "Bot status unavailable."
    }
  }
  refreshTradeBotsStatus()
  setInterval(refreshTradeBotsStatus, 15000)
  if(refreshTradeBotsBtn){
    refreshTradeBotsBtn.addEventListener("click", refreshTradeBotsStatus)
  }
  if(runTradeBotsBtn){
    runTradeBotsBtn.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/trade-bots/run", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({})
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Trade Bots", "3 bots executed now.")
          refreshTradeBotsStatus()
        } else {
          openMiniWindow("Trade Bots", `Run failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Trade Bots", "Run failed: network_error")
      }
    })
  }

  function setupTradeBots(){
    if(!tradeBotOrbit || tradeBotOrbit.dataset.ready === "1") return
    tradeBotOrbit.dataset.ready = "1"
    const roles = [
      {
        id:"risk",
        lines:[
          "Risk Bot: trade setup is clean. Cap 50k, founder release, and 5% service tax are enforced.",
          "Your hair can become an active style weapon, be careful.",
          "Whip-lock that flow, but keep the trade rules tighter."
        ]
      },
      {
        id:"ops",
        lines:[
          "Ops Bot: rules are live. Two re-verifies, anti-bot controls, and timed lockouts are active.",
          "Whip lock that thang, girl - now verify twice and keep it clean.",
          "Fast moves are fine, but no quick-close tricks in this lane."
        ]
      },
      {
        id:"comms",
        lines:[
          "Comms Bot: competition policy is active. No pornography. Win metrics are laughs, excitement, and votes.",
          "Encima de ti tu pelo esta - misterioso, la crema completa el look.",
          "Bring laughs, excitement, and votes. That's how champions are represented."
        ]
      },
    ]
    const bots = roles.map((role, idx)=>{
      const el = document.createElement("button")
      el.type = "button"
      el.className = "trade-bot"
      el.setAttribute("aria-label", role.id)
      el.style.left = `${16 + idx*36}px`
      el.style.top = `${16 + (idx%2)*16}px`
      tradeBotOrbit.appendChild(el)
      const vx = (Math.random() * 0.55 + 0.35) * (Math.random() > 0.5 ? 1 : -1)
      const vy = (Math.random() * 0.55 + 0.35) * (Math.random() > 0.5 ? 1 : -1)
      const bot = {el, role, x:16 + idx*36, y:16 + (idx%2)*16, vx, vy, caughtUntil:0}
      tradeBotRefs[role.id] = bot
      el.addEventListener("click", ()=>{
        bot.caughtUntil = Date.now() + 900
        el.classList.add("caught")
        const lines = role.lines || []
        const pick = lines[Math.floor(Math.random() * lines.length)] || "Trade bot active."
        openMiniWindow("Bot Caught", pick)
        setTimeout(()=>el.classList.remove("caught"), 950)
      })
      return bot
    })
    let raf = 0
    const tick = ()=>{
      const now = Date.now()
      const w = tradeBotOrbit.clientWidth || 260
      const h = tradeBotOrbit.clientHeight || 56
      bots.forEach((b)=>{
        if(now < b.caughtUntil) return
        b.x += b.vx
        b.y += b.vy
        if(b.x <= 2 || b.x >= w - 16){ b.vx *= -1 }
        if(b.y <= 2 || b.y >= h - 16){ b.vy *= -1 }
        b.el.style.left = `${Math.max(2, Math.min(w - 16, b.x))}px`
        b.el.style.top = `${Math.max(2, Math.min(h - 16, b.y))}px`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    tradeBotOrbit._raf = raf
  }
  setupTradeBots()

  const saved = JSON.parse(localStorage.getItem("supportrdSettings") || "{}")
  if(email && !email.value) email.value = saved.email || ""
  if(country && !country.value) country.value = "US"
  if(term && !term.value) term.value = "6"

  function setLog(html){
    log.innerHTML = html
  }

  function renderDecision(d){
    const status = (d.status || "none").toUpperCase()
    const color = status === "APPROVED" ? "#7cf3d1" : (status === "CONDITIONAL" ? "#ffd166" : "#ff7b7b")
    const approved = formatMoney(d.approved_amount || 0, d.currency || "USD")
    const estimate = formatMoney(d.estimated_payment || 0, d.currency || "USD")
    const allowed = formatMoney(d.allowed_payment || 0, d.currency || "USD")
    setLog(
      `<div style="display:grid;gap:8px;">
        <div><span style="display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(255,255,255,0.08);border:1px solid ${color};color:${color};font-weight:700;">${status}</span></div>
        <div>Approved Amount: <strong>${approved}</strong></div>
        <div>Estimated Monthly Payment: <strong>${estimate}</strong></div>
        <div>30% Limit (after debt): <strong>${allowed}</strong></div>
        <div>Reason: <strong>${d.reason || "none"}</strong></div>
        <div style="color:var(--muted);font-size:11px;">${d.legal_note || "Automated pre-screen only. Final compliance review may apply."}</div>
      </div>`
    )
  }

  if(evaluate){
    evaluate.addEventListener("click", async ()=>{
      const payload = {
        email: (email && email.value || "").trim(),
        country: (country && country.value || "").trim().toUpperCase(),
        monthly_income: Number(income && income.value || 0),
        monthly_debt: Number(debt && debt.value || 0),
        requested_amount: Number(amount && amount.value || 0),
        term_months: Number(term && term.value || 0),
        has_payment_issues: !!(risk && risk.checked),
        kyc_ack: true
      }
      try{
        const r = await fetch("/api/credit/evaluate", {
          method: "POST",
          headers: {"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const d = await r.json()
        if(!r.ok || !d.ok){
          setLog(`<div style="color:#ff9f9f;">Credit check failed: ${(d.error || "unknown_error")}</div>`)
          return
        }
        localStorage.setItem("lastCreditEmail", payload.email || "")
        renderDecision(d)
      }catch{
        setLog(`<div style="color:#ff9f9f;">Credit check failed: network_error</div>`)
      }
    })
  }

  if(load){
    load.addEventListener("click", async ()=>{
      const em = ((email && email.value) || localStorage.getItem("lastCreditEmail") || "").trim()
      if(!em){
        setLog(`<div style="color:var(--muted);">Enter an email to load status.</div>`)
        return
      }
      try{
        const r = await fetch(`/api/credit/status?email=${encodeURIComponent(em)}`)
        const d = await r.json()
        if(!r.ok || !d.ok){
          setLog(`<div style="color:#ff9f9f;">Status load failed: ${(d.error || "unknown_error")}</div>`)
          return
        }
        if(d.status === "none"){
          setLog(`<div style="color:var(--muted);">No previous decision found for this email.</div>`)
          return
        }
        renderDecision(d)
      }catch{
        setLog(`<div style="color:#ff9f9f;">Status load failed: network_error</div>`)
      }
    })
  }

  if(payMembership){
    payMembership.addEventListener("click", ()=>openLinkModal(LINKS.pro, "Membership Payment"))
  }
  if(payProducts){
    payProducts.addEventListener("click", ()=>openLinkModal(LINKS.cart, "Products Payment"))
  }
  if(dealBtn){
    const unlock = state.subscription === "pro" || isProOverride()
    dealBtn.disabled = !unlock
    dealBtn.addEventListener("click", ()=>{
      if(dealBtn.disabled){
        openMiniWindow("Unlimited ARIA", "Upgrade to $50 Unlimited ARIA to unlock deal support.")
        return
      }
      openMiniWindow("Talk to us for a deal", "Unlimited ARIA unlocked. Professional contact route is open.")
    })
  }
  if(dealLockNote){
    dealLockNote.textContent = (state.subscription === "pro" || isProOverride())
      ? "Unlocked: Unlimited ARIA tier active."
      : "Locked: upgrade to Unlimited ARIA ($50) to unlock deal channel."
  }
  if(requestTransferBtn){
    requestTransferBtn.addEventListener("click", async ()=>{
      if(!(state.subscription === "pro" || isProOverride())){
        openMiniWindow("Transfer Locked", "Unlimited ARIA ($50) is required.")
        return
      }
      const payload = {
        to_email: (qs("#transferToEmail")?.value || "").trim(),
        transfer_amount: Number(qs("#transferAmount")?.value || 0),
        id_last4: (qs("#transferIdLast4")?.value || "").trim(),
        visa_last4: (qs("#transferVisaLast4")?.value || "").trim(),
        from_email: (state.socialLinks && state.socialLinks.email) ? state.socialLinks.email : ""
      }
      try{
        const r = await fetch("/api/account-transfer/request", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const d = await r.json()
        if(d && d.ok){
          localStorage.setItem("lastTransferRequestId", d.request_id || "")
          if(transferStatusNote){ transferStatusNote.textContent = `Transfer ${d.request_id} created. Gross $${Number(d.transfer_amount || 0).toLocaleString()} · Tax $${Number(d.tax_amount || 0).toLocaleString()} · Net $${Number(d.seller_net || 0).toLocaleString()}. Re-verify 2 times to unlock admin review.` }
          openMiniWindow("Transfer Requested", `Request ${d.request_id} created. Re-verify now.`)
        } else {
          if(d && d.error === "founder_presence_required"){
            openMiniWindow("Transfer Hold", "Founder presence is required before Sell Your ARIA release opens.")
          } else if(d && d.error === "trade_cap_exceeded"){
            openMiniWindow("Transfer Cap", "Transfer exceeds $50,000 cap.")
          } else {
            openMiniWindow("Transfer", `Request failed: ${d.error || "unknown"}`)
          }
        }
      }catch{
        openMiniWindow("Transfer", "Request failed: network_error")
      }
    })
  }
  if(toggleTransferReleaseBtn){
    toggleTransferReleaseBtn.addEventListener("click", async ()=>{
      const currentlyOpen = (transferReleaseState && transferReleaseState.textContent || "").includes("OPEN")
      const active = !currentlyOpen
      try{
        const r = await fetch("/api/account-transfer/release-toggle", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({active, founder_present: true})
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Sell ARIA Release", active ? "Release opened with founder present." : "Release placed on hold.")
          refreshTransferReleaseState()
        } else {
          openMiniWindow("Sell ARIA Release", `Update failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Sell ARIA Release", "Update failed: network_error")
      }
    })
  }
  if(reverifyTransferBtn){
    reverifyTransferBtn.addEventListener("click", async ()=>{
      const request_id = localStorage.getItem("lastTransferRequestId") || ""
      const id_last4 = (qs("#transferIdLast4")?.value || "").trim()
      const visa_last4 = (qs("#transferVisaLast4")?.value || "").trim()
      if(!request_id){
        openMiniWindow("Re-Verify", "Create transfer request first.")
        return
      }
      try{
        const r = await fetch("/api/account-transfer/reverify", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({request_id, id_last4, visa_last4})
        })
        const d = await r.json()
        if(d && d.ok){
          const msg = `Re-verify ${d.reverify_passed}/${d.reverify_needed}. Status: ${d.status}`
          if(transferStatusNote){ transferStatusNote.textContent = msg }
          openMiniWindow("Re-Verify", msg)
        } else {
          if(transferStatusNote){ transferStatusNote.textContent = `Re-verify failed: ${d.error || "unknown"}` }
          openMiniWindow("Re-Verify", `Failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Re-Verify", "Failed: network_error")
      }
    })
  }
  if(approveTransferBtn){
    approveTransferBtn.addEventListener("click", async ()=>{
      const request_id = localStorage.getItem("lastTransferRequestId") || ""
      if(!request_id){
        openMiniWindow("Transfer", "No pending transfer request id found.")
        return
      }
      try{
        const r = await fetch("/api/account-transfer/approve", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({request_id})
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Transfer", `Approved for ${d.to_email}. Net after 5% tax: $${Number(d.seller_net || 0).toLocaleString()}.`)
        } else {
          openMiniWindow("Transfer", `Approve failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Transfer", "Approve failed: network_error")
      }
    })
  }
}

function refreshDealUnlock(){
  const dealBtn = qs("#talkDealBtn")
  const dealLockNote = qs("#dealLockNote")
  if(!dealBtn || !dealLockNote) return
  const unlock = state.subscription === "pro" || isProOverride()
  dealBtn.disabled = !unlock
  dealLockNote.textContent = unlock
    ? "Unlocked: Unlimited ARIA tier active."
    : "Locked: upgrade to Unlimited ARIA ($50) to unlock deal channel."
}

function setupCampaign(){
  const openRequest = qs("#openRequestCall")
  const closeRequest = qs("#closeRequestCall")
  const acquisitionBtns = [
    qs("#openAcquisitionBrief"),
    qs("#saleSecondaryCta"),
    qs("#centerSaleBriefBtn")
  ].filter(Boolean)
  const buyerCallBtns = [
    qs("#salePrimaryCta"),
    qs("#centerSaleCallBtn"),
    qs("#acquisitionBuyerCall")
  ].filter(Boolean)
  const closeAcquisition = qs("#closeAcquisitionModal")
  const founderEmail = qs("#acquisitionFounderEmail")
  if(openRequest){ openRequest.addEventListener("click", ()=>openModal("requestCallModal")) }
  if(closeRequest){ closeRequest.addEventListener("click", ()=>closeModal("requestCallModal")) }
  buyerCallBtns.forEach(btn=>btn.addEventListener("click", ()=>openModal("requestCallModal")))
  acquisitionBtns.forEach(btn=>btn.addEventListener("click", ()=>{
    renderAcquisitionWindow()
    openModal("acquisitionModal")
  }))
  if(closeAcquisition){ closeAcquisition.addEventListener("click", ()=>closeModal("acquisitionModal")) }
  if(founderEmail){
    founderEmail.addEventListener("click", ()=>{
      const subject = encodeURIComponent("SupportRD Acquisition Inquiry")
      const body = encodeURIComponent("I want to talk about acquiring SupportRD for $100,000 and reviewing the transition package.")
      window.location.href = `mailto:agentanthony@supportrd.com?subject=${subject}&body=${body}`
    })
  }
  qs("#acquisitionWindowRefresh")?.addEventListener("click", ()=>{
    const visitor = renderAcquisitionWindow()
    trackAcquisitionSignal("acquisition_window_refresh", {
      lane: visitor.primary.lane,
      stage: visitor.primary.stage,
      socialFeedback: `${visitor.primary.title} was refreshed inside the Acquisition Window.`
    })
  })
}

function setupWorkdaySeoEngine(){
  const strip = qs("#seoWeekdayStrip")
  const title = qs("#seoWeekdayTitle")
  const body = qs("#seoWeekdayBody")
  const tags = qs("#seoWeekdayTags")
  const badge = qs("#seoWeekdayBadge")
  const pulseFeed = qs("#marketPulseFeed")
  const pulseBadge = qs("#marketPulseBadge")
  const pulseRefresh = qs("#marketPulseRefresh")
  const activateBtn = qs("#engineActivateWeekdaySeo")
  if(!strip || !title || !body || !tags) return

  const plans = [
    { key:"monday", label:"Monday Rush", body:"Start the workweek clean with fast office-ready hair resets, scalp calm, and polished confidence before the meetings pile up.", tags:["workday reset","office-ready hair","monday rush","polished start"] },
    { key:"tuesday", label:"Tuesday Depends", body:"Read what we are really working with today: oily roots, tangles, dryness, or damage, then match the right SupportRD lane.", tags:["hair type check","depends what we’re working with","support lane","quick diagnosis"] },
    { key:"wednesday", label:"Wednesday Clear", body:"Clear the unsettled. Midweek is where we calm frizz, settle breakage, and restore the route before stress starts showing in the hair.", tags:["midweek repair","clear the unsettled","frizz control","repair routine"] },
    { key:"thursday", label:"Thursday Sharpen", body:"Sharpen the look for the workplace. Clean professional finish, camera-ready hair, and confidence that can carry the next contract.", tags:["pro look","camera ready","contract energy","thursday sharpen"] },
    { key:"friday", label:"Friday Build The Bag", body:"Friday is for building the bag: more contracts, more money, more premium presentation, and stronger social proof around your hair image.", tags:["build the bag","friday motion","premium presentation","more contracts"] }
  ]
  const todayIndex = Math.min(new Date().getDay(), 5) - 1
  let activePlan = plans[Math.max(0, todayIndex)]

  function renderPlan(plan){
    activePlan = plan
    title.textContent = plan.label
    body.textContent = plan.body
    tags.innerHTML = plan.tags.map(tag=>`<span>${tag}</span>`).join("")
    if(badge) badge.textContent = `${plan.label} Active`
    qsa(".engine-weekday-btn").forEach(btn=>btn.classList.toggle("active", btn.dataset.seoDay === plan.key))
  }

  strip.innerHTML = plans.map(plan=>`<button class="engine-weekday-btn" type="button" data-seo-day="${plan.key}">${plan.label}</button>`).join("")
  qsa(".engine-weekday-btn").forEach((btn)=>{
    btn.addEventListener("click", ()=>{
      const plan = plans.find(item=>item.key === btn.dataset.seoDay) || plans[0]
      renderPlan(plan)
    })
  })
  renderPlan(activePlan)

  async function refreshPulse(){
    if(pulseFeed) pulseFeed.textContent = "Loading market pulse..."
    try{
      const lines = []
      const now = new Date()
      lines.push(`[${now.toLocaleTimeString()}] SupportRD workday pulse is active.`)
      lines.push(`- ${activePlan.label}: ${activePlan.body}`)
      try{
        const r = await fetch("/api/finance/shopify-status")
        const d = await r.json()
        if(r.ok && d && d.ok){
          const balance = d.balance ?? d.available_balance ?? d.amount ?? "live"
          const nextPayout = d.next_payout || d.payout_date || "pending"
          lines.push(`- Shopify finance snapshot: balance ${balance}`)
          lines.push(`- Next payout: ${nextPayout}`)
          if(pulseBadge) pulseBadge.textContent = "Finance Live"
        }else{
          lines.push("- Admin finance snapshot is private right now, but the page pulse is still live.")
          if(pulseBadge) pulseBadge.textContent = "Public Pulse"
        }
      }catch{
        lines.push("- Finance feed unavailable right now. Workday SEO rhythm is still active.")
        if(pulseBadge) pulseBadge.textContent = "Fallback Pulse"
      }
      lines.push("- Penny-move language should stay contextual: contracts building, premium customers moving, support routes active.")
      lines.push("- Latest public market feed can be added next with Alpha Vantage once the API key is ready.")
      if(pulseFeed) pulseFeed.textContent = lines.join("\n")
    }catch{
      if(pulseFeed) pulseFeed.textContent = "Market pulse unavailable."
    }
  }

  pulseRefresh?.addEventListener("click", refreshPulse)
  activateBtn?.addEventListener("click", async ()=>{
    const ok = await setSeoAuto(true, pulseFeed)
    if(ok){
      openMiniWindow("Workday SEO", `${activePlan.label} rhythm is active and SupportRD is set to push the workweek hair engine.`)
      refreshPulse()
    }else{
      openMiniWindow("Workday SEO", "Activation failed. Check admin access for the SEO engine.")
    }
  })
  refreshPulse()
}

function setupAdult21Mode(){
  const confirm = qs("#adult21Confirm")
  const onBtn = qs("#adult21Enable")
  const offBtn = qs("#adult21Disable")
  const status = qs("#adult21Status")
  const feedBtn = qs("#openSocialCircuitFeed")
  const launchBtn = qs("#launchSensualAriaPost")
  const bingoBtn = qs("#startBingoFantasy")
  const familyTheme = qs("#familyFantasyTheme")
  const familyThemeStatus = qs("#familyFantasyThemeStatus")
  const saveFamilyTheme = qs("#saveFamilyFantasyTheme")
  const circuitStatus = qs("#socialCircuitStatus")
  if(!confirm || !onBtn || !offBtn || !status) return
  state.adult21 = localStorage.getItem("adult21Mode") === "true"
  function render(){
    status.textContent = state.adult21
      ? "21+ mode is active. ARIA will use mature sensual product tone for adults."
      : "21+ mode is currently off."
    document.body.classList.toggle("adult21-mode", state.adult21)
  }
  onBtn.addEventListener("click", ()=>{
    if(!confirm.checked){
      openMiniWindow("21+ Mode", "Please confirm 21+ first.")
      return
    }
    if(!(state.subscription === "fantasy300" || state.subscription === "fantasy600" || isProOverride())){
      openMiniWindow("21+ Mode", "21+ mode requires Basic Fantasy ($300) or Advanced Fantasy ($600). No exceptions.")
      return
    }
    state.adult21 = true
    localStorage.setItem("adult21Mode", "true")
    render()
    openLinkModal(LINKS.fantasy300, "21+ Basic Fantasy Checkout")
    openMiniWindow("21+ Mode", "Activated. No drugs or gang content allowed.")
  })
  offBtn.addEventListener("click", ()=>{
    state.adult21 = false
    localStorage.setItem("adult21Mode", "false")
    render()
    openLinkModal(LINKS.premium, "Premium Checkout")
  })
  if(feedBtn){
    feedBtn.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/social-circuits")
        const d = await r.json()
        if(d && d.ok){
          const lines = (d.circuits || []).map(c=>`${c.name}: ${c.state}`).join(" · ")
          if(circuitStatus) circuitStatus.textContent = `Live circuits: ${lines}`
          openLinkModal(LINKS.pro, "Unlimited ARIA Checkout")
          openMiniWindow("Social Circuits", "SupportRD source feed is active.")
        } else {
          if(circuitStatus) circuitStatus.textContent = `Source mode error: ${d.error || "unknown"}`
        }
      }catch{
        if(circuitStatus) circuitStatus.textContent = "Source mode error: network_error"
      }
    })
  }
  if(launchBtn){
    launchBtn.addEventListener("click", ()=>{
      const post = qs("#postInput")
      const msg = "SupportRD Social Source: style pulse, hydration pulse, repair pulse, and attraction pulse are live. Clean, respectful, hair-focused guidance for everyone."
      if(post) post.value = msg
      if(circuitStatus) circuitStatus.textContent = "SupportRD circuit post staged to Social Source."
      openLinkModal(LINKS.pro, "Unlimited ARIA Checkout")
      openMiniWindow("SupportRD Circuits", "Post staged for everybody. Keep it clean and hair-focused.")
    })
  }
  const familyThemeLabels = {
    boat_conductor: "Boat Conductor",
    theme_park_conductor: "Theme Park Conductor",
    museum_greeter: "Museum Greeter / Information Guide",
    nascar_driver: "Nascar Driver",
    jungle_book: "Jungle Book",
    molopy_board: "Molopy Board (laid back strategy)"
  }
  function renderFamilyTheme(){
    const selected = (state.socialLinks && state.socialLinks.familyFantasyTheme) || "boat_conductor"
    if(familyTheme){ familyTheme.value = selected }
    if(familyThemeStatus){ familyThemeStatus.textContent = `Current family theme: ${familyThemeLabels[selected] || familyThemeLabels.boat_conductor}` }
  }
  if(saveFamilyTheme){
    saveFamilyTheme.addEventListener("click", ()=>{
      const selected = familyTheme ? familyTheme.value : "boat_conductor"
      state.socialLinks = state.socialLinks || {}
      state.socialLinks.familyFantasyTheme = selected
      localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
      renderFamilyTheme()
      openLinkModal(LINKS.family200 || LINKS.custom, "Family Fantasy Checkout")
      openMiniWindow("Family Fantasy", "Theme saved for your $200 Family Fantasy pack.")
    })
  }
  renderFamilyTheme()
  if(bingoBtn){
    bingoBtn.addEventListener("click", ()=>{
      openLinkModal(LINKS.bingo100, "Bingo Fantasy")
      if(circuitStatus) circuitStatus.textContent = "Bingo Fantasy lane opened. Chill vibe + funny flow mode."
      openMiniWindow("Bingo Fantasy", "You worked long and hard. Relax — ARIA is ready to assist your hair flow.")
    })
  }
  render()
}

function setupInHouseAd(){
  const title = qs("#inhouseAdTitle")
  const body = qs("#inhouseAdBody")
  if(!title || !body) return
  function draw(){
    const pick = INHOUSE_ADS[Math.floor(Math.random() * INHOUSE_ADS.length)]
    title.textContent = pick.title
    body.textContent = pick.body
  }
  draw()
  setInterval(draw, 12000)
}

function setupRequestCall(){
  const submit = qs("#submitRequestCall")
  const form = qs("#requestCallFormWrap")
  const wait = qs("#requestWaitWrap")
  const waitMsg = qs("#requestWaitMessage")
  const waitId = qs("#requestWaitId")
  if(!submit || !form || !wait || !waitMsg || !waitId) return
  submit.addEventListener("click", async ()=>{
    const routeLabel = (qs("#reqRouteLabel")?.value || "English Family Route to Anthony").trim()
    const payload = {
      route_label: routeLabel,
      name: (qs("#reqName")?.value || "").trim(),
      phone: (qs("#reqPhone")?.value || "").trim(),
      email: (qs("#reqEmail")?.value || "").trim(),
      address: (qs("#reqAddress")?.value || "").trim(),
      notes: (qs("#reqNotes")?.value || "").trim(),
      consent: !!qs("#reqConsent")?.checked
    }
    if(!payload.name || !payload.phone || !payload.email || !payload.address || !payload.consent){
      toast("Add name, phone, email, address, and consent.")
      return
    }
    try{
      const r = await fetch("/api/leads/request-call", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      })
      const d = await r.json()
      if(!r.ok || !d.ok){
        toast(`Request failed: ${d.error || "unknown_error"}`)
        return
      }
      localStorage.setItem("lastRequestId", d.request_id || "")
      form.style.display = "none"
      wait.style.display = "block"
      waitMsg.textContent = d.wait_screen_message || "Anthony has the relay first. Your order is coming, don't worry."
      waitId.textContent = `Request ID: ${d.request_id || ""}`
    }catch{
      toast("Request failed: network_error")
    }
  })
}

function setupEmergencyAssist(){
  const openBtn = qs("#openEmergencyAssist")
  const runScan = qs("#emergencyRunScan")
  const ariaTest = qs("#emergencyAriaTest")
  const doctorRoute = qs("#emergencyDoctorRoute")
  const directBill = qs("#emergencyDirectBill")
  const typeSel = qs("#emergencyType")
  const log = qs("#emergencyLog")
  if(openBtn){
    openBtn.addEventListener("click", ()=>openModal("emergencyAssistModal"))
  }
  if(runScan){
    runScan.addEventListener("click", ()=>{
      const startScan = qs("#startHairScan")
      if(startScan){ startScan.click() }
      if(log) log.textContent = "Status: scan started. Follow left-right guide and keep camera steady."
    })
  }
  if(ariaTest){
    ariaTest.addEventListener("click", ()=>{
      const t = (typeSel && typeSel.value) || "unknown"
      const prompt = `Emergency hair incident (${t}). Give fast, fair general sequence: immediate safety, stop damage, clean care steps, when to seek ER/urgent care, and how to find scalp/hair medicine doctor. Keep it direct and short.`
      const input = qs("#ariaInput")
      const send = qs("#sendAria")
      if(input) input.value = prompt
      if(send) send.click()
      if(log) log.textContent = "Status: ARIA emergency test triggered."
    })
  }
  if(doctorRoute){
    doctorRoute.addEventListener("click", ()=>{
      openLinkModal("https://www.aad.org/public/find-a-derm", "Find Dermatologist")
      if(log) log.textContent = "Status: doctor route opened."
    })
  }
  if(directBill){
    directBill.addEventListener("click", async ()=>{
      try{
        const email = ((state.socialLinks && state.socialLinks.email) || "").trim().toLowerCase()
        const type = (typeSel && typeSel.value) || "unknown"
        const payload = {
          name: (state.socialLinks && state.socialLinks.name) || "SupportRD Emergency User",
          phone: (state.socialLinks && state.socialLinks.phone) || "",
          email: email || "unknown@supportrd.com",
          address: "Emergency Assist Request",
          notes: `Direct bill medical assist requested. Incident type: ${type}. 3 months pro + all themes requested.`,
          consent: true
        }
        const r = await fetch("/api/leads/request-call", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const d = await r.json()
        if(d && d.status === "pending"){
          if(log) log.textContent = `Status: direct bill request submitted (${d.request_id || "pending"}).`
          openMiniWindow("Emergency Billing", "Request submitted. Team will follow up for fair medical-assist routing.")
        } else {
          if(log) log.textContent = `Status: request failed (${d.error || "unknown"}).`
        }
      }catch{
        if(log) log.textContent = "Status: request failed (network_error)."
      }
    })
  }
}

function setupAriaHelp(){
  const out = qs("#ariaHelpLines")
  const gen = qs("#ariaHelpGenerate")
  const scan = qs("#ariaHelpScan")
  const vr = qs("#ariaHelpVR")
  const premium = qs("#ariaHelpPremium")
  const stores = qs("#ariaHelpStores")
  const rc = qs("#ariaHelpRedCross")
  const n911 = qs("#ariaHelp911")
  const n988 = qs("#ariaHelp988")
  const toOffRoad = qs("#ariaHelpToOffRoad")
  if(!out) return
  if(gen){
    gen.addEventListener("click", ()=>{
      const lines = [
        "1) In an extreme case (burn, blood, severe tangles, breakage, parasites, or color reaction), call 911 first, protect breathing/eyes, and stop all chemical or heat exposure immediately.",
        "2) Start the hair scan right now and let Caution ARIA give a fast, fair sequence to urgent care, dermatologist routing, and next-step stabilization.",
        "3) For follow-up recovery and supply, use the fastest Premium/Pro route and verified healthy-hair stores, including SupportRD international routing in Santiago (Villa Gonzalez), while keeping Red Cross/988 contacts available."
      ]
      out.innerHTML = lines.map(l=>`<div>${l}</div>`).join("")
    })
  }
  if(scan){
    scan.addEventListener("click", ()=>{
      const btn = qs("#startHairScan")
      if(btn) btn.click()
      const tab = qs('.tab-btn[data-tab="analysis"]')
      if(tab) tab.click()
    })
  }
  if(vr){ vr.addEventListener("click", ()=>{ const btn = qs("#vrScanBtn"); if(btn) btn.click() }) }
  if(premium){ premium.addEventListener("click", ()=>openModal("subscriptionModal")) }
  if(stores){
    stores.addEventListener("click", ()=>{
      openMiniWindow("Stores Route", "Fast route: SupportRD Gift Shop + Shopify lineup + DR founder reference route for stock checks.")
      openLinkModal(LINKS.custom, "SupportRD Store Route")
    })
  }
  if(rc){ rc.addEventListener("click", ()=>openLinkModal("https://www.redcross.org/get-help.html", "Red Cross Assistance")) }
  if(n911){ n911.addEventListener("click", ()=>{ window.location.href = "tel:911" }) }
  if(n988){ n988.addEventListener("click", ()=>{ window.location.href = "tel:988" }) }
  if(toOffRoad){
    toOffRoad.addEventListener("click", ()=>{
      const t = qs('.tab-btn[data-tab="gps"]')
      if(t) t.click()
    })
  }
}

function setupCashOps(){
  const checkBtn = qs("#cashCheckinBtn")
  const confirmBtn = qs("#cashConfirmBtn")
  if(checkBtn){
    checkBtn.addEventListener("click", async ()=>{
      const payload = {
        request_id: (qs("#cashRequestId")?.value || "").trim(),
        flow_type: (qs("#cashFlowType")?.value || "").trim(),
        location: (qs("#cashLocation")?.value || "").trim(),
        amount: Number(qs("#cashAmount")?.value || 0),
        proof_ref: (qs("#cashProof")?.value || "").trim()
      }
      try{
        const r = await fetch("/api/cash-points/checkin", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Cash Point", `Check-in logged at ${d.logged_at || "now"}`)
        } else {
          openMiniWindow("Cash Point", `Check-in failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Cash Point", "Check-in failed: network_error")
      }
    })
  }
  if(confirmBtn){
    confirmBtn.addEventListener("click", async ()=>{
      const payload = {
        request_id: (qs("#cashRequestId")?.value || "").trim(),
        confirmed_by: (qs("#cashConfirmedBy")?.value || "").trim(),
        received_amount: Number(qs("#cashAmount")?.value || 0),
        memo: (qs("#cashMemo")?.value || "").trim()
      }
      try{
        const r = await fetch("/api/cash-points/confirm-received", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify(payload)
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Cash Point", "Funds received confirmed.")
        } else {
          openMiniWindow("Cash Point", `Confirm failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Cash Point", "Confirm failed: network_error")
      }
    })
  }
}

function setupCommunications(){
  const btn = qs("#sendLaunchAlert")
  const checkBalanceBtn = qs("#checkBalanceBtn")
  const reserveMoveBtn = qs("#reserveMoveBtn")
  const newsGuardBtn = qs("#newsGuardBtn")
  const openPreventionOk = qs("#openPreventionOk")
  const balanceView = qs("#commsBalanceView")
  const shopifyGuardView = qs("#shopifyGuardView")
  const shopifyGuardCheck = qs("#shopifyGuardCheck")
  const shopifyGuardNotify = qs("#shopifyGuardNotify")
  const adsGuardBtn = qs("#adsGuardBtn")
  const emitResolverNow = qs("#emitResolverNow")
  const resolverEmitView = qs("#resolverEmitView")
  const startJackpotBuild = qs("#startJackpotBuild")
  const createCompetitionBtn = qs("#createCompetitionBtn")
  const createMovementChallengeBtn = qs("#createMovementChallengeBtn")
  const createCompetitionBtn1v1 = qs("#createCompetitionBtn1v1")
  const buildPaintballModeBtn = qs("#buildPaintballModeBtn")
  const postPaintballModeBtn = qs("#postPaintballModeBtn")
  const paintballBuildResult = qs("#paintballBuildResult")

  const PAINTBALL_MAPS = {
    lumbermill: {label:"Lumbermill", defense:"+1 defense", respawn:"Officials Lounge", notes:"Johndeer quality first line defense with the lumbermill lane locked in."},
    riverhole: {label:"River Hole", defense:"+1 defense", respawn:"Field respawn", notes:"Best field-side hole near the flag for first line defense."},
    snowhill: {label:"Artificial Snow Hill", defense:"+2 defense", respawn:"Snow ridge respawn", notes:"Artificial snow cover gives the hill a stronger defense bonus."},
    island: {label:"Island by the Lake", defense:"+2 defense", respawn:"Lake edge respawn", notes:"Island side play adds lake pressure and extra defense."},
    vip: {label:"VIP Spot", defense:"+2 defense", respawn:"VIP return lane", notes:"If you have been playing 2 months, VIP defense comes online."},
    tunnels: {label:"Tunnels", defense:"quick spot", respawn:"Quick respawn", notes:"Tunnels is a direct-entry quick match route."},
    market: {label:"Market", defense:"quick spot", respawn:"Quick respawn", notes:"Market stays simple and fast with no extra upgrade."},
    lab: {label:"The Lab", defense:"quick spot", respawn:"Quick respawn", notes:"The Lab grants +3 grenades and no other upgrade."}
  }
  const PAINTBALL_LOADOUTS = {
    standard: "2 gun choices with standard virtual grenades off.",
    vip3: "3 gun choices with grenade access unlocked.",
    simple: "Simple hide-behind-tires match. Get hit and you lose. No perks included."
  }
  function buildPaintballSummary(){
    const mode = qs("#paintballMode")?.value || "capture"
    const mapSet = qs("#paintballMapSet")?.value || "battlegrounds"
    const zoneKey = qs("#paintballZone")?.value || "lumbermill"
    const loadoutKey = qs("#paintballLoadout")?.value || "standard"
    const promoGoal = qs("#paintballPromoGoal")?.selectedOptions?.[0]?.textContent || "20 hearts in the last 5 minutes"
    const respawnRule = qs("#paintballRespawnRule")?.value || "officials-lounge"
    const zone = PAINTBALL_MAPS[zoneKey] || PAINTBALL_MAPS.lumbermill
    const matchType = mode === "capture" ? "Capture the Flag" : "Open Route"
    const respawnText = respawnRule === "dance-save"
      ? "Dance-on save active: if you dance on somebody the whole walk back for 5 minutes, unlimited shots stay open."
      : respawnRule === "classic"
        ? "Classic respawn is active with no dance protection."
        : `Respawn is set to ${zone.respawn}.`
    const moneyLine = "Promo-money play is compliance-gated for now: hearts, views, likes, and stream traction can be tracked live, but real money wagers stay off until reviewed."
    return {
      title: `${matchType} · ${zone.label}`,
      body: `${zone.notes} ${zone.defense}. Route feel: ${mode}. ${PAINTBALL_LOADOUTS[loadoutKey]} ${respawnText} Goal: ${promoGoal}. ${moneyLine}`,
      post: `SUPPORTRD VIRTUAL ROUTE · ${matchType} · ${zone.label} · ${zone.defense} · Route feel: ${mode}. ${PAINTBALL_LOADOUTS[loadoutKey]} Goal: ${promoGoal}. Respawn: ${respawnText}`
    }
  }

  const walletKey = "supportrdWallet"
  function loadWallet(){
    const w = JSON.parse(localStorage.getItem(walletKey) || "{}")
    return {
      balance: Number(w.balance || 0),
      reserve: Number(w.reserve || 0),
      newsGuard: !!w.newsGuard
    }
  }
  function saveWallet(w){
    localStorage.setItem(walletKey, JSON.stringify(w))
  }
  function drawWallet(){
    if(!balanceView) return
    const w = loadWallet()
    balanceView.textContent = `Balance: $${w.balance.toFixed(2)} · Reserva: $${w.reserve.toFixed(2)}`
    if(newsGuardBtn){
      newsGuardBtn.textContent = `Team Focus Guard: ${w.newsGuard ? "On" : "Off"}`
      newsGuardBtn.classList.toggle("active", w.newsGuard)
    }
  }

  drawWallet()

  async function refreshShopifyGuard(){
    if(!shopifyGuardView) return
    try{
      const r = await fetch("/api/finance/shopify-status")
      const d = await r.json()
      if(!r.ok || !d.ok){
        shopifyGuardView.textContent = `Shopify Guard: ${d.error || "unavailable"}`
        return
      }
      shopifyGuardView.textContent = `Shopify Guard: ${d.risk_level.toUpperCase()} · Today ${d.today_total} ${d.currency} · 7d avg ${d.avg_prev_7d} · Drop ${d.drop_pct}%`
      if(adsGuardBtn){
        adsGuardBtn.textContent = `Ads Safeguard: ${d.money_guard_enabled ? "On" : "Off"}`
        adsGuardBtn.classList.toggle("active", !!d.money_guard_enabled)
      }
    }catch{
      shopifyGuardView.textContent = "Shopify Guard: network_error"
    }
  }

  refreshShopifyGuard()

  if(shopifyGuardCheck){
    shopifyGuardCheck.addEventListener("click", refreshShopifyGuard)
  }
  if(shopifyGuardNotify){
    shopifyGuardNotify.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/finance/notify", {method:"POST"})
        const d = await r.json()
        if(d.ok){
          openMiniWindow("Money Guard", `Alert sent to ${d.sent}/${d.recipients} contacts.`)
        } else {
          openMiniWindow("Money Guard", `Alert failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Money Guard", "Alert failed: network_error")
      }
    })
  }
  if(adsGuardBtn){
    adsGuardBtn.addEventListener("click", async ()=>{
      const currentlyOn = (adsGuardBtn.textContent || "").toLowerCase().includes("on")
      const next = !currentlyOn
      try{
        const r = await fetch("/api/finance/guard-state", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({enabled: next})
        })
        const d = await r.json()
        if(d && d.ok){
          adsGuardBtn.textContent = `Ads Safeguard: ${d.enabled ? "On" : "Off"}`
          adsGuardBtn.classList.toggle("active", !!d.enabled)
          toast(d.enabled ? "Safeguards ON" : "Safeguards OFF")
          refreshShopifyGuard()
        } else {
          toast("Could not change safeguard")
        }
      }catch{
        toast("Could not change safeguard")
      }
    })
  }

  if(checkBalanceBtn){
    checkBalanceBtn.addEventListener("click", ()=>{
      const w = loadWallet()
      drawWallet()
      openMiniWindow("Balance", `Disponible $${w.balance.toFixed(2)} · Reserva $${w.reserve.toFixed(2)}`)
    })
  }
  if(reserveMoveBtn){
    reserveMoveBtn.addEventListener("click", ()=>{
      const w = loadWallet()
      const move = Math.max(0, Math.round((w.balance * 0.1) * 100) / 100)
      if(move <= 0){
        openMiniWindow("Reserva", "No hay balance para mover.")
        return
      }
      w.balance = Math.max(0, w.balance - move)
      w.reserve = w.reserve + move
      saveWallet(w)
      drawWallet()
      openMiniWindow("Reserva", `Movido $${move.toFixed(2)} a reserva.`)
    })
  }
  if(newsGuardBtn){
    newsGuardBtn.addEventListener("click", ()=>{
      const w = loadWallet()
      w.newsGuard = !w.newsGuard
      saveWallet(w)
      drawWallet()
      toast(w.newsGuard ? "Prevencion activa: 100% nosotros intentando" : "Prevencion en pausa")
    })
  }
  if(openPreventionOk){
    openPreventionOk.addEventListener("click", ()=>{
      window.location.href = "/ok"
    })
  }
  if(emitResolverNow){
    emitResolverNow.addEventListener("click", ()=>{
      if(!navigator.geolocation){
        if(resolverEmitView) resolverEmitView.textContent = "Resolver emit: geolocation not supported on this device."
        return
      }
      navigator.geolocation.getCurrentPosition((pos)=>{
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lon = Number(pos.coords.longitude.toFixed(6))
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`
        const geoUrl = `geo:${lat},${lon}`
        if(resolverEmitView){
          resolverEmitView.innerHTML = `Resolver emit live: <a href="${mapsUrl}" target="_blank" rel="noopener">${lat}, ${lon}</a> · <a href="${geoUrl}">Open in phone GPS</a>`
        }
        openMiniWindow("Resolver GPS", "Live location link emitted.")
      }, ()=>{
        if(resolverEmitView) resolverEmitView.textContent = "Resolver emit: location permission denied."
      }, {enableHighAccuracy:true, timeout:7000})
    })
  }

  if(!btn) return
  btn.addEventListener("click", async ()=>{
    const launch_day = (qs("#launchDay")?.value || "").trim()
    const launch_location = (qs("#launchLocation")?.value || "").trim()
    const mission = (qs("#launchMission")?.value || "SupportRD Radio Satellite Mission").trim()
    const notes = (qs("#launchNotes")?.value || "").trim()
    if(!launch_day || !launch_location){
      toast("Add launch day and location")
      return
    }
    try{
      const r = await fetch("/api/admin/alerts/dispatch", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          event_type: "launch_watch",
          priority: "urgent",
          request_id: localStorage.getItem("lastRequestId") || "",
          location: launch_location,
          summary: `${mission} on ${launch_day}. ${notes}`.trim()
        })
      })
      const d = await r.json()
      if(d.ok){
        openMiniWindow("Launch Alert", `Sent to ${d.sent}/${d.recipients} contacts.`)
      }else{
        openMiniWindow("Launch Alert", `Failed: ${d.error || "unknown"}`)
      }
    }catch{
      openMiniWindow("Launch Alert", "Failed: network_error")
    }
  })

  if(startJackpotBuild){
    startJackpotBuild.addEventListener("click", ()=>{
      const titles = [
        "Curly Hair Men Upgrade",
        "Short Nice Hairline Fade",
        "Wavy and Direct",
        "Long Hair Pony Tail",
        "Straight Down",
        "Just Chillen at Home Hair"
      ]
      const pick = titles[Math.floor(Math.random() * titles.length)]
      const post = qs("#postInput")
      if(post){
        post.value = `${pick} · SupportRD attention challenge build starts now. Winner takes the jackpot in 1 hour.`
      }
      const endTs = Date.now() + 60 * 60 * 1000
      localStorage.setItem("jackpotBuildEndTs", String(endTs))
      openMiniWindow("Build Challenge", `${pick} started. 1-hour attention race is live.`)
    })
  }
  if(createCompetitionBtn){
    createCompetitionBtn.addEventListener("click", async ()=>{
      const opponent_url = (qs("#compOpponentUrl")?.value || "").trim()
      const membership_tier = (qs("#compTier")?.value || "premium").trim()
      const out = qs("#competitionResult")
      if(!opponent_url){
        if(out) out.textContent = "Add the other person URL first."
        return
      }
      try{
        const r = await fetch("/api/competitions/create", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({opponent_url, membership_tier})
        })
        const d = await r.json()
        if(d && d.ok){
          if(out) out.textContent = `Competition ready: ${d.challenge_url}`
          openMiniWindow("Competition", "Competition option created and tracked.")
        } else {
          if(d && d.error === "pornography_blocked"){
            openMiniWindow("Competition Rules", "No pornography is allowed in competition links.")
          }
          if(out) out.textContent = `Create failed: ${d.error || "unknown"}`
        }
      }catch{
        if(out) out.textContent = "Create failed: network_error"
      }
    })
  }
  if(createCompetitionBtn1v1){
    createCompetitionBtn1v1.addEventListener("click", async ()=>{
      const raw = (qs("#movementUrls")?.value || "").trim()
      const out = qs("#movementChallengeResult")
      const participant_urls = raw.split(",").map(x=>x.trim()).filter(Boolean)
      if(participant_urls.length < 2){
        if(out) out.textContent = "Add 2 URLs for 1v1."
        return
      }
      try{
        const r = await fetch("/api/competitions/movement-challenge", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({participant_urls: participant_urls.slice(0, 2), mode: "1v1"})
        })
        const d = await r.json()
        if(d && d.ok){
          const metrics = (d.score_metrics || ["laughs","excitement","votes"]).join(", ")
          if(out) out.textContent = `1v1 ready (${d.participants} participants): ${d.challenge_url} · Metrics: ${metrics}`
          openMiniWindow("Movement 1v1", "1v1 challenge created. Scored by laughs, excitement, and votes.")
        } else {
          if(d && d.error === "pornography_blocked"){
            openMiniWindow("Competition Rules", "No pornography is allowed in challenge URLs.")
          }
          if(out) out.textContent = `Create failed: ${d.error || "unknown"}`
        }
      }catch{
        if(out) out.textContent = "Create failed: network_error"
      }
    })
  }
  if(createMovementChallengeBtn){
    createMovementChallengeBtn.addEventListener("click", async ()=>{
      const raw = (qs("#movementUrls")?.value || "").trim()
      const out = qs("#movementChallengeResult")
      if(!raw){
        if(out) out.textContent = "Add 10 participant URLs for 5v5."
        return
      }
      const participant_urls = raw.split(",").map(x=>x.trim()).filter(Boolean)
      try{
        const r = await fetch("/api/competitions/movement-challenge", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({participant_urls: participant_urls.slice(0, 10), mode: "5v5"})
        })
        const d = await r.json()
        if(d && d.ok){
          const metrics = (d.score_metrics || ["laughs","excitement","votes"]).join(", ")
          if(out) out.textContent = `5v5 ready (${d.participants} participants): ${d.challenge_url} · Metrics: ${metrics}`
          openMiniWindow("Movement 5v5", "5v5 challenge created. Scored by laughs, excitement, and votes.")
        } else {
          if(d && d.error === "pornography_blocked"){
            openMiniWindow("Competition Rules", "No pornography is allowed in challenge URLs.")
          }
          if(out) out.textContent = `Create failed: ${d.error || "unknown"}`
        }
      }catch{
        if(out) out.textContent = "Create failed: network_error"
      }
    })
  }
  if(buildPaintballModeBtn){
    buildPaintballModeBtn.addEventListener("click", ()=>{
      const summary = buildPaintballSummary()
      if(paintballBuildResult) paintballBuildResult.textContent = `${summary.title} · ${summary.body}`
      openMiniWindow("Competition Paintball", `${summary.title} is built. Virtual mode is live and promo-wager logic remains compliance-gated.`)
    })
  }
  if(postPaintballModeBtn){
    postPaintballModeBtn.addEventListener("click", ()=>{
      const summary = buildPaintballSummary()
      const post = qs("#postInput")
      if(post) post.value = summary.post
      if(paintballBuildResult) paintballBuildResult.textContent = `${summary.title} posted to the main feed draft.`
      openMiniWindow("Competition Feed", "Virtual paintball mode drafted into the SupportRD post panel.")
    })
  }
}

function setupLiveArena(){
  const openBtn = qs("#openLiveArenaBtn")
  const overlay = qs("#liveArenaOverlay")
  const shell = qs("#liveArenaShell")
  const loader = qs("#liveArenaLoader")
  const loaderBar = qs("#liveArenaLoaderBar")
  const loaderText = qs("#liveArenaLoaderText")
  const closeBtn = qs("#liveArenaCloseBtn")
  const breakBtn = qs("#liveArenaBreakBtn")
  const cameraBtn = qs("#liveArenaCameraAccessBtn")
  const postBtn = qs("#liveArenaPostBtn")
  const feedBtn = qs("#liveArenaCheckBtn")
  const floodBtn = qs("#liveArenaFloodBtn")
  const nextBtn = qs("#liveArenaNextBtn")
  const prevViewBtn = qs("#liveArenaViewPrev")
  const nextViewBtn = qs("#liveArenaViewNext")
  const modeSel = qs("#liveArenaMode")
  const lensSel = qs("#liveArenaLens")
  const deviceSel = qs("#liveArenaDevice")
  const audioSel = qs("#liveArenaAudio")
  const filterSel = qs("#liveArenaFilter")
  const mainStream = qs("#liveArenaMainStream")
  const botStatus = qs("#liveArenaBotStatus")
  const botBadge = qs("#liveArenaBotBadge")
  const sponsorStatus = qs("#sponsorTagStatus")
  const profileStatus = qs("#liveArenaProfileStatus")
  const glitchStatus = qs("#liveArenaGlitchStatus")
  const floodStatus = qs("#liveArenaFloodStatus")
  const sponsorLane = qs("#liveArenaSponsorStatus")
  const sessionRoleEl = qs("#liveSessionRole")
  const sessionTimerEl = qs("#liveSessionTimer")
  const dayClockEl = qs("#liveDayClock")
  const visitorModeBtn = qs("#liveVisitorModeBtn")
  const ownerModeBtn = qs("#liveOwnerModeBtn")
  const assistantPromptText = qs("#liveAssistantPromptText")
  const sessionOwnerEl = qs("#liveSessionOwner")
  const visitorAccessEl = qs("#liveVisitorAccess")
  const heartCountEl = qs("#liveHeartCount")
  const sendHeartBtn = qs("#liveArenaSendHeartBtn")
  const ariaHistoryEl = qs("#liveAriaHistory")
  const contentStatus = qs("#liveArenaContentStatus")
  const contentList = qs("#liveArenaContentList")
  const mission = qs("#liveArenaMission")
  const panelTitle = qs("#liveArenaPanelTitle")
  const panelMeta = qs("#liveArenaViewMeta")
  const viewerStatus = qs("#liveArenaViewerStatus")
  const feedIdentity = qs("#liveFeedIdentity")
  const viewerPayBtn = qs("#liveArenaViewerPayBtn")
  const composeInput = qs("#liveArenaComposeInput")
  const composeSendBtn = qs("#liveArenaComposeSendBtn")
  const reelToggle = qs("#toggleLiveConsoleReel")
  const liveConsoleReel = qs("#liveConsoleReel")
  const conversationPanel = qs("#conversationPanel")
  const conversationLog = qs("#conversationLog")
  const liveTabFeed = qs("#liveTabFeed")
  const liveTabBooth = qs("#liveTabBooth")
  const liveTabPayments = qs("#liveTabPayments")
  const liveTabGPS = qs("#liveTabGPS")
  const liveTabProfile = qs("#liveTabProfile")
  const sessionCareTitle = qs("#liveSessionCareTitle")
  const sessionCareMode = qs("#liveSessionCareMode")
  const sessionCareStatus = qs("#liveSessionCareStatus")
  const flash = qs("#liveCameraFlash")
  const sponsorTagOpenBtn = qs("#sponsorTagOpenBtn")
  const tagModal = qs("#sponsorTagModal")
  const tagInput = qs("#sponsorTagInput")
  const tagCreateBtn = qs("#sponsorTagCreateBtn")
  const tagSkipBtn = qs("#sponsorTagSkipBtn")
  const agreementModal = qs("#liveAgreementModal")
  const agreementAcceptBtn = qs("#liveAgreementAcceptBtn")
  const agreementLaterBtn = qs("#liveAgreementLaterBtn")
  const walletKey = "supportrdWallet"
  const viewsKey = "supportrdLiveViews"
  const agreementKey = "supportrdLiveAgreementAccepted"
  const promptKey = "supportrdLivePromptAt"
  const roleKey = "supportrdSessionRole"
  const sessionStartKey = "supportrdSessionStart"
  const dayStampKey = "supportrdSessionDayStamp"
  const dayStatsKey = "supportrdSessionDayStats"
  const heartKey = "supportrdSessionHearts"
  let openArmed = false
  let liveContentIndex = 0
  let livePanelIndex = 0
  let energyTimer = null
  let timerLoop = null
  let currentViews = Number(localStorage.getItem(viewsKey) || 220)
  const explicitViewer = /[?&]viewer=1\b/.test(location.search)
  let sessionRole = explicitViewer ? "visitor" : "owner"
  const conversationHomeParent = conversationPanel?.parentElement || null
  const conversationHomeNext = conversationPanel?.nextElementSibling || null
  if(tagModal) tagModal.hidden = true
  const livePanels = [
    { title:"Main Stream", meta:"Main Session View" },
    { title:"Receiver Comments", meta:"Comments View" },
    { title:"New Joiners", meta:"Joiners View" }
  ]
  const liveComments = [
    "New comment: your route feels clean and purposeful.",
    "Receiver note: hair mission is clear, keep showing real work.",
    "Comment pulse: sponsor lane looks sharp from this side."
  ]
  const liveJoiners = [
    "^^newviewer just joined in watch-only mode.",
    "A fresh audience lane connected to this session.",
    "New receiver entered the stream and can view only."
  ]
  const contentSteps = [
    "Introduce the host with a sweep effect and company mission.",
    "Show the real action: code, game, dance, wilderness, or work scene.",
    "Put up the sponsor lane and current audience pull.",
    "Drop a quick social update to all checked feeds.",
    "Show the key content tabs or browser work if streaming desktop.",
    "Run a clean competition or challenge explanation.",
    "Wrap with next move, brand line, and call to action."
  ]
  function refreshRouteMood(){
    const lens = lensSel?.value || "laptop"
    const filter = filterSel?.value || "direct"
    const audio = audioSel?.value || "mic"
    const device = deviceSel?.value || "camera"
    const mode = modeSel?.value || "solo"
    let line = "How may I serve you?"
    if(lens === "laptop"){
      line = "Casual: How are you feeling in this beautiful day? I can guide you into posting, payments, or the booth."
    }else if(lens === "group"){
      line = "Group route: who just stepped in with you? I can keep the whole room moving together."
    }else if(lens === "wilderness"){
      line = "Emergency hair problem? What happened to your hair? Do a quick scan so I can recommend the best services or medical direction."
    }else if(lens === "desktop"){
      line = "Professional: How are you looking today for that pro look? I can sharpen your content and service lane."
    }else if(lens === "sport"){
      line = "Extreme route: keep the energy up and let me guide the page while you move fast."
    }else if(lens === "work"){
      line = "Work route: keep it purposeful and let me keep your session clean and service-ready."
    }
    if(assistantPromptText) assistantPromptText.textContent = line
    if(botBadge) botBadge.textContent = lens === "wilderness" ? "Aria Scan Ready" : (lens === "desktop" ? "Jake Pro Ready" : "ARIA Ready")
    if(botStatus){
      botStatus.textContent = `${line} Device ${deviceSel?.selectedOptions?.[0]?.textContent || "Camera"} · Audio ${audioSel?.selectedOptions?.[0]?.textContent || "Mic"} · Filter ${filterSel?.selectedOptions?.[0]?.textContent || "Direct"} · Route ${modeSel?.selectedOptions?.[0]?.textContent || "Personal Route"}.`
    }
    if(mainStream && livePanelIndex === 0){
      mainStream.textContent = `${line} Device ${deviceSel?.selectedOptions?.[0]?.textContent || "Camera"} · Audio ${audioSel?.selectedOptions?.[0]?.textContent || "Mic"} · Filter ${filterSel?.selectedOptions?.[0]?.textContent || "Direct"} · Route ${modeSel?.selectedOptions?.[0]?.textContent || "Personal Route"}.`
    }
  }
  const loadMap = {
    "solo": {seconds: 6, label: "1-minute style setup"},
    "street": {seconds: 8, label: "2-minute style setup"},
    "crew": {seconds: 8, label: "2-minute style setup"},
    "field": {seconds: 12, label: "5-minute style setup"},
    "world": {seconds: 12, label: "5-minute style setup"}
  }
  function renderContentSteps(){
    if(!contentList) return
    contentList.innerHTML = contentSteps.map((step, idx)=>`<div class="live-content-step${idx===liveContentIndex ? " active" : ""}">Step ${idx+1}: ${step}</div>`).join("")
  }
  function currentDayStamp(){
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`
  }
  function ensureDayState(){
    const stamp = currentDayStamp()
    if(localStorage.getItem(dayStampKey) !== stamp){
      localStorage.setItem(dayStampKey, stamp)
      localStorage.setItem(sessionStartKey, String(Date.now()))
      localStorage.setItem(dayStatsKey, JSON.stringify({money:0, files:0, edits:0}))
      localStorage.setItem(heartKey, "0")
    }
  }
  function readDayStats(){
    ensureDayState()
    try{ return JSON.parse(localStorage.getItem(dayStatsKey) || "{}") }catch{ return {} }
  }
  function writeDayStats(patch){
    const stats = {...readDayStats(), ...patch}
    localStorage.setItem(dayStatsKey, JSON.stringify(stats))
    return stats
  }
  function formatDuration(ms){
    const total = Math.max(0, Math.floor(ms / 1000))
    const h = String(Math.floor(total / 3600)).padStart(2,"0")
    const m = String(Math.floor((total % 3600) / 60)).padStart(2,"0")
    const s = String(total % 60).padStart(2,"0")
    return `${h}:${m}:${s}`
  }
  function syncTimers(){
    ensureDayState()
    const now = new Date()
    const startAt = Number(localStorage.getItem(sessionStartKey) || Date.now())
    if(dayClockEl){
      dayClockEl.textContent = `Day ${now.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}`
    }
    if(sessionTimerEl){
      sessionTimerEl.textContent = `Session ${formatDuration(Date.now() - startAt)}`
    }
    const stats = readDayStats()
    if(profileStatus){
      profileStatus.textContent = `${sessionRole === "owner" ? "Owner" : "Visitor"} profile · ${lensSel?.selectedOptions?.[0]?.textContent || "Lens"} · ${audioSel?.selectedOptions?.[0]?.textContent || "Audio"} · $${Number(stats.money || 0).toFixed(2)} made · ${Number(stats.files || 0)} files · ${Number(stats.edits || 0)} edits`
    }
  }
  function syncHearts(){
    const hearts = Number(localStorage.getItem(heartKey) || 0)
    if(heartCountEl) heartCountEl.textContent = `${hearts} hearts sent`
  }
  function pushAssistantLine(line){
    const text = String(line || "").trim()
    if(!text) return
    if(!(localStorage.getItem("loggedIn") === "true" || shouldAutoOwnerEntry())){
      if(ariaHistoryEl) ariaHistoryEl.innerHTML = "Sign in to keep Aria / Jake history saved to your account."
      return
    }
    const history = Array.isArray(state.ariaHistory) ? [...state.ariaHistory] : []
    history.unshift(text)
    state.ariaHistory = history.slice(0,3)
    localStorage.setItem("supportrdAriaHistory", JSON.stringify(state.ariaHistory))
    if(ariaHistoryEl) ariaHistoryEl.innerHTML = state.ariaHistory.map(item=>`<div>${item}</div>`).join("")
  }
  function syncAssistantHistory(){
    if(!(localStorage.getItem("loggedIn") === "true" || shouldAutoOwnerEntry())){
      if(ariaHistoryEl) ariaHistoryEl.innerHTML = "Sign in to keep Aria / Jake history saved to your account."
      return
    }
    let history = state.ariaHistory
    if(!Array.isArray(history) || !history.length){
      try{ history = JSON.parse(localStorage.getItem("supportrdAriaHistory") || "[]") }catch{ history = [] }
      state.ariaHistory = Array.isArray(history) ? history.slice(0,3) : []
    }
    if(ariaHistoryEl){
      ariaHistoryEl.innerHTML = state.ariaHistory.length
        ? state.ariaHistory.map(item=>`<div>${item}</div>`).join("")
        : "No assistant lines yet. Aria and Jake will keep a light trail here as they help."
    }
  }
  function getIsViewer(){
    return sessionRole !== "owner"
  }
  let contentPromptTimer = null
  function getFeedHandle(){
    const savedTag = localStorage.getItem("supportrdSponsorTag")
    if(savedTag) return savedTag
    const rawName = (state.socialLinks?.username || state.socialLinks?.name || "SupportRD").trim().replace(/[^a-z0-9]/gi, "")
    return `^^${rawName || "SupportRD"}`
  }
  function maybeTriggerResumePrompt(force = false){
    const lastAt = Number(localStorage.getItem(promptKey) || 0)
    const due = force || !lastAt || (Date.now() - lastAt >= 1800000)
    if(!due) return
    localStorage.setItem(promptKey, String(Date.now()))
    liveContentIndex = 0
    renderContentSteps()
    if(contentStatus) contentStatus.textContent = "Resume route ready. Click through all 7 steps to keep the session active."
    if(panelTitle) panelTitle.textContent = "Resume Route"
    if(panelMeta) panelMeta.textContent = "30 Minute Check-In"
    if(mainStream) mainStream.textContent = `30-minute check-in active for ${getFeedHandle()}. Walk through the 7 resume steps to keep the session moving and avoid going idle.`
    contentList?.scrollIntoView({behavior:"smooth", block:"center"})
    if(nextBtn){
      nextBtn.style.transform = "translate(0, 0) scale(1.08)"
      setTimeout(()=>{ if(nextBtn) nextBtn.style.transform = "translate(0, 0) scale(1)" }, 1200)
    }
    openMiniWindow("Resume Route", "Your 30-minute check-in is ready. Click through the 7 steps in the main console to resume the session.")
  }
  function scheduleContentPrompt(){
    if(contentPromptTimer) clearInterval(contentPromptTimer)
    contentPromptTimer = setInterval(()=>maybeTriggerResumePrompt(true), 1800000)
  }
  function stopContentPrompt(){
    if(contentPromptTimer){
      clearInterval(contentPromptTimer)
      contentPromptTimer = null
    }
  }
  function renderLivePanel(){
    const current = livePanels[livePanelIndex] || livePanels[0]
    if(panelTitle) panelTitle.textContent = current.title
    if(panelMeta) panelMeta.textContent = current.meta
    if(!mainStream) return
    if(livePanelIndex === 0){
      mainStream.textContent = "Stream intro, sponsor sweep, and purposeful content load here."
    } else if(livePanelIndex === 1){
      mainStream.textContent = liveComments.join("\n")
    } else {
      mainStream.textContent = liveJoiners.join("\n")
    }
  }
  function syncSessionCare(){
    if(sessionCareTitle) sessionCareTitle.textContent = `Welcome to the SupportRD server, ${getFeedHandle()}.`
    if(sessionCareMode) sessionCareMode.textContent = getIsViewer() ? "Viewer support active" : "Activity recording on"
    if(sessionCareStatus){
      sessionCareStatus.textContent = getIsViewer()
        ? "You are viewing a live SupportRD session. You can support the feed, send hearts, and move cleanly through the experience."
        : "Your current session is recognized, treated with care, and measured live so premium benefits can be checked honestly with live admin review."
    }
  }
  function applyThemeQuick(action){
    if(action === "standard"){
      if(sessionCareStatus) sessionCareStatus.textContent = "Standard layout active. Clean and light for everyday posting, booth work, and quick support."
      if(mainStream && livePanelIndex === 0) mainStream.textContent = "Standard SupportRD layout active. Keep the session clean, hair-focused, and easy to move through."
    }else if(action === "occasion"){
      if(typeof window.openWorldMapPanel === "function") window.openWorldMapPanel()
      if(sessionCareStatus) sessionCareStatus.textContent = "Occasion layout ready. Pick the theme that fits the moment and let the session change with it."
    }else if(action === "premium"){
      if(sessionCareStatus) sessionCareStatus.textContent = "Premium layout active. Purchasing a premium feature gives the benefits directly, with live admin measuring the results."
      if(mainStream && livePanelIndex === 0) mainStream.textContent = "Premium session mode active. Direct contact is available and premium benefits are being measured live."
    }else if(action === "map"){
      if(typeof window.openWorldMapPanel === "function") window.openWorldMapPanel()
      if(sessionCareStatus) sessionCareStatus.textContent = "Map themes are open. Change the full session feel without leaving the current route."
    }
    window.logSessionSignal?.(`Theme quick action: ${action}`)
  }
  function openFeedPanel(){
    const panel = qs("#liveFeedPanel")
    if(!panel) return
    const saved = state.socialLinks || {}
    const feeds = saved.feeds || {}
    const map = {
      liveFeedInstagram: saved.ig || "",
      liveFeedTikTok: saved.tiktok || "",
      liveFeedFacebook: saved.fb || "",
      liveFeedYouTube: saved.yt || "",
      liveFeedX: saved.x || "",
      liveFeedThreads: saved.threads || ""
    }
    Object.entries(map).forEach(([id, value])=>{ const el = qs(`#${id}`); if(el) el.value = value })
    const checks = {
      livePostIG: !!feeds.ig,
      livePostTikTok: !!feeds.tiktok,
      livePostFacebook: !!feeds.fb,
      livePostYouTube: !!feeds.yt,
      livePostX: !!feeds.x,
      livePostThreads: !!feeds.threads
    }
    Object.entries(checks).forEach(([id, value])=>{ const el = qs(`#${id}`); if(el) el.checked = value })
    panel.hidden = false
    panel.scrollIntoView({behavior:"smooth", block:"center"})
    updatePromptForFocus("support")
  }
  function closeFeedPanel(){
    const panel = qs("#liveFeedPanel")
    if(panel) panel.hidden = true
  }
  function updatePromptForFocus(target){
    if(!assistantPromptText) return
    const prompts = {
      controls: "How may I serve you? I can guide you into posting, payments, the booth, or a light session setup.",
      stream: "How may I serve you? This is the live center. Keep it purposeful, light, and ready for support.",
      content: "How may I serve you? I can walk you through the 7-step resume route and keep you from going idle.",
      support: "How may I serve you? I can explain glitches, support payments, and handoffs to Codex cleanly."
    }
    assistantPromptText.textContent = prompts[target] || prompts.controls
  }
  function setViewerMode(){
    const viewerMode = getIsViewer()
    document.body.classList.toggle("viewer-mode", viewerMode)
    localStorage.setItem(roleKey, sessionRole)
    if(sessionRoleEl) sessionRoleEl.textContent = viewerMode ? "Visitor View" : "Owner Profile"
    if(sessionOwnerEl) sessionOwnerEl.textContent = `Session owner: ${getFeedHandle()}`
    if(visitorAccessEl) visitorAccessEl.textContent = viewerMode
      ? "Visitors can watch, send hearts, and support the feed."
      : "You are running the owner view with personal controls and profile details."
    if(viewerStatus){
      viewerStatus.textContent = viewerMode
        ? `Viewer watch mode active for ${getFeedHandle()}. You can see the session, comments, and joiners, and you can support the live feed, but you cannot press host controls.`
        : "Host control mode active. Viewer links open in watch-only mode."
    }
    syncSessionCare()
  }
  function updateFloodState(){
    const ready = currentViews >= 1000
    if(floodBtn){
      floodBtn.disabled = !ready
      floodBtn.style.opacity = ready ? "1" : ".46"
      floodBtn.style.cursor = ready ? "pointer" : "not-allowed"
    }
    if(floodStatus){
      floodStatus.textContent = ready
        ? `Flood mode unlocked at ${currentViews} views. Press it to run the 10-second viral sponsor intro, then resume the session.`
        : `Flood mode is locked until 1000 views. Current session views: ${currentViews}.`
    }
  }
  function bumpViews(amount){
    currentViews += amount
    localStorage.setItem(viewsKey, String(currentViews))
    updateFloodState()
  }
  function bumpDayStat(key, amount){
    const stats = readDayStats()
    stats[key] = Number(stats[key] || 0) + amount
    writeDayStats(stats)
    syncTimers()
  }
  function recordRecentView(label){
    const list = JSON.parse(localStorage.getItem("supportrdRecentViews") || "[]")
    list.unshift({label, at:new Date().toISOString()})
    localStorage.setItem("supportrdRecentViews", JSON.stringify(list.slice(0,12)))
  }
  function recordPurchaseHistory(label, amount){
    const list = JSON.parse(localStorage.getItem("supportrdPurchaseHistory") || "[]")
    list.unshift({label, amount, at:new Date().toISOString(), handle:getFeedHandle()})
    localStorage.setItem("supportrdPurchaseHistory", JSON.stringify(list.slice(0,12)))
  }
  function updateRefBot(){
    const mode = modeSel?.value || "solo"
    if(mode === "solo"){
      if(botStatus) botStatus.textContent = "Ref Bot watches personal routes for glitches and stays light until more people naturally link up."
    } else {
      if(botStatus) botStatus.textContent = `Ref Bot watches ${mode} routes for technical trouble and can help halt the session cleanly if active people naturally link up and request it.`
    }
  }
  function closeSponsorTagModal(){
    if(tagModal) tagModal.hidden = true
  }
  function openSponsorTagModal(){
    if(!tagModal) return
    tagModal.hidden = false
    if(tagInput){
      tagInput.value = ""
      setTimeout(()=>tagInput.focus(), 30)
    }
  }
  function ensureSponsorTag(){
    const key = "supportrdSponsorTag"
    let value = localStorage.getItem(key)
    if(sponsorStatus) sponsorStatus.textContent = value ? `SponsorTag HQ ready: ${value}` : "SponsorTag HQ is waiting for one-time account creation. Example: ^^SupportRD"
    if(sponsorTagOpenBtn) sponsorTagOpenBtn.textContent = value ? "Edit SponsorTag" : "Add SponsorTag"
    return value
  }
  function saveSponsorTag(rawValue){
    const raw = String(rawValue || "").trim().replace(/[^a-z0-9]/gi, "")
    if(!raw){
      openMiniWindow("SponsorTag", "Use at least one letter or number after ^^ so your tag can lock in clean.")
      return ""
    }
    const value = `^^${raw}`
    localStorage.setItem("supportrdSponsorTag", value)
    if(sponsorStatus) sponsorStatus.textContent = `SponsorTag HQ ready: ${value}`
    closeSponsorTagModal()
    openMiniWindow("SponsorTag Ready", `${value} is now staged for your account and will stay subtle until you want it shown.`)
    return value
  }
  function flashCamera(){
    if(!flash) return
    flash.classList.remove("active")
    void flash.offsetWidth
    flash.classList.add("active")
  }
  function pulseLiveEnergy(withWiggle = false){
    if(!shell || shell.hidden) return
    shell.classList.add("live-energized")
    if(withWiggle){
      document.body.classList.remove("live-jello")
      void document.body.offsetWidth
      document.body.classList.add("live-jello")
      setTimeout(()=>document.body.classList.remove("live-jello"), 820)
    }
  }
  function startLiveEnergy(){
    if(energyTimer) clearInterval(energyTimer)
    pulseLiveEnergy(false)
    energyTimer = setInterval(()=>{
      pulseLiveEnergy(true)
      const steps = contentList?.querySelectorAll(".live-content-step") || []
      const step = steps[liveContentIndex]
      if(step){
        step.classList.remove("active")
        void step.offsetWidth
        step.classList.add("active")
      }
    }, 300000)
  }
  function stopLiveEnergy(){
    if(energyTimer){
      clearInterval(energyTimer)
      energyTimer = null
    }
    shell?.classList.remove("live-energized")
  }
  function openLiveShell(){
    if(!overlay || !shell || !loader) return
    overlay.hidden = false
    loader.hidden = true
    shell.hidden = false
    renderContentSteps()
    ensureSponsorTag()
    updateRefBot()
    document.body.classList.add("live-console-active")
    if(profileStatus) profileStatus.textContent = `Host profile ready · Lens ${lensSel?.selectedOptions?.[0]?.textContent || "Personal Laptop"} · Audio ${audioSel?.selectedOptions?.[0]?.textContent || "Mic"}`
    if(sponsorLane) sponsorLane.textContent = "Sponsors lane armed: general audience, current supporters, future sponsor tags, blog sponsors, and clean crypto/company outreach flow."
    if(mission) mission.textContent = "SupportRD is an innocent company out of Dominican Republic and United States. We deliver solutions to the health of your hair. Period. We are on a mission."
    if(feedIdentity) feedIdentity.textContent = `Feed running under ${getFeedHandle()}`
    renderLivePanel()
    refreshRouteMood()
    renderLifeMemorySurface()
    const liveBottom = shell?.querySelector(".live-panel-bottom")
    if(conversationPanel && liveBottom && conversationPanel.parentElement !== liveBottom){
      liveBottom.appendChild(conversationPanel)
    }
    flashCamera()
    startLiveEnergy()
    updateFloodState()
    setViewerMode()
    syncSessionCare()
    syncHearts()
    syncAssistantHistory()
    syncTimers()
    recordRecentView("Main Console")
    scheduleContentPrompt()
    maybeTriggerResumePrompt(false)
    if(agreementModal && localStorage.getItem(agreementKey) !== "yes") agreementModal.hidden = false
    if(timerLoop) clearInterval(timerLoop)
    timerLoop = setInterval(syncTimers, 1000)
    openMiniWindow("Session Prep", `Lens ${lensSel?.selectedOptions?.[0]?.textContent || "Personal Laptop"} is staged. SponsorTag is optional and can be created from SponsorTag HQ any time.`)
  }
  function runLoader(){
    const mode = modeSel?.value || "solo"
    const conf = loadMap[mode] || loadMap["solo"]
    if(!overlay || !shell || !loader) return
    overlay.hidden = false
    shell.hidden = true
    loader.hidden = false
      if(loaderText) loaderText.textContent = `Preparing ${mode} stream route · ${conf.label} estimated setup.`
    let step = 10
    if(loaderBar) loaderBar.style.width = "10%"
    const timer = setInterval(()=>{
      step += 15
      if(loaderBar) loaderBar.style.width = `${Math.min(step,100)}%`
      if(loaderText) loaderText.textContent = `Preparing ${mode} stream route · ${Math.min(step,100)}%`
      if(step >= 100){
        clearInterval(timer)
        openLiveShell()
      }
    }, Math.max(400, Math.round((conf.seconds * 1000) / 6)))
  }
  if(openBtn){
    openBtn.addEventListener("click", ()=>{
      if(!openArmed){
        openArmed = true
        openMiniWindow("Main Console", "Tap again to transform the center dashboard into the main console.")
        setTimeout(()=>{ openArmed = false }, 4000)
        return
      }
      openArmed = false
      runLoader()
    })
  }
  if(closeBtn){
    closeBtn.addEventListener("click", ()=>{
      if(overlay) overlay.hidden = true
      if(shell) shell.hidden = true
      if(loader) loader.hidden = true
      closeSponsorTagModal()
      if(agreementModal) agreementModal.hidden = true
      stopLiveEnergy()
      stopContentPrompt()
      if(timerLoop){ clearInterval(timerLoop); timerLoop = null }
      document.body.classList.remove("live-console-active")
      document.body.classList.remove("live-jello")
      if(conversationPanel && conversationHomeParent){
        if(conversationHomeNext && conversationHomeNext.parentElement === conversationHomeParent){
          conversationHomeParent.insertBefore(conversationPanel, conversationHomeNext)
        }else{
          conversationHomeParent.appendChild(conversationPanel)
        }
      }
      openMiniWindow("Main Console", "Returned to the normal center dashboard.")
    })
  }
  if(breakBtn){
    breakBtn.addEventListener("click", ()=>{
      if(mainStream) mainStream.textContent = "Break mode active. Stream pending at console level while the host handles family, fixes, or technical pause."
      if(glitchStatus) glitchStatus.textContent = "Pending state active. Use pure assistance mode if the camera is not working, a payment feature is not working, or the stream needs a clean Codex handoff."
      if(panelTitle) panelTitle.textContent = "Break Mode"
      closeFeedPanel()
      openMiniWindow("Break Mode", "Stream is in pending state for a technical or personal pause.")
    })
  }
  if(cameraBtn){
    cameraBtn.addEventListener("click", ()=>{
      flashCamera()
      bumpDayStat("files", 1)
      if(mainStream && livePanelIndex === 0) mainStream.textContent = `Camera armed · ${deviceSel?.selectedOptions?.[0]?.textContent || "Camera"} · ${filterSel?.selectedOptions?.[0]?.textContent || "Direct"} · flashlight pulse active.`
      updatePromptForFocus("stream")
      openMiniWindow("Camera", "Camera and visual route armed for the live center panel.")
    })
  }
  if(feedBtn){
    feedBtn.addEventListener("click", ()=>{
      openFeedPanel()
      openMiniWindow("Feed Select", "Select Feeds is open. Save your social links, choose your posting destinations, then send the session cleanly.")
    })
  }
  qs("#closeLiveFeedPanel")?.addEventListener("click", closeFeedPanel)
  qs("#saveLiveFeedPanel")?.addEventListener("click", ()=>{
    state.socialLinks = state.socialLinks || {}
    state.socialLinks.ig = qs("#liveFeedInstagram")?.value.trim() || ""
    state.socialLinks.tiktok = qs("#liveFeedTikTok")?.value.trim() || ""
    state.socialLinks.fb = qs("#liveFeedFacebook")?.value.trim() || ""
    state.socialLinks.yt = qs("#liveFeedYouTube")?.value.trim() || ""
    state.socialLinks.x = qs("#liveFeedX")?.value.trim() || ""
    state.socialLinks.threads = qs("#liveFeedThreads")?.value.trim() || ""
    state.socialLinks.feeds = {
      ig: !!qs("#livePostIG")?.checked,
      tiktok: !!qs("#livePostTikTok")?.checked,
      fb: !!qs("#livePostFacebook")?.checked,
      yt: !!qs("#livePostYouTube")?.checked,
      x: !!qs("#livePostX")?.checked,
      threads: !!qs("#livePostThreads")?.checked
    }
    localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
    const indicator = qs("#socialIndicator")
    if(indicator){
      const list = Object.keys(state.socialLinks.feeds).filter(k=>state.socialLinks.feeds[k])
      indicator.textContent = list.length ? `Feeds: ${list.map(x=>x[0].toUpperCase()+x.slice(1)).join(", ")}` : "Feeds: none selected"
    }
    closeFeedPanel()
    openMiniWindow("Feeds Saved", "Your social links and feed choices are saved. Tags are ready when you post.")
  })
  composeSendBtn?.addEventListener("click", ()=>{
    const text = (composeInput?.value || "").trim()
    if(!text){
      openMiniWindow("Original Post", "Type what is on your mind first so we can send the original post cleanly.")
      return
    }
    const post = qs("#postInput")
    if(post) post.value = text
    if(mainStream && livePanelIndex === 0) mainStream.textContent = `Original post ready for ${getFeedHandle()}: ${text}`
    liveComments.unshift(`Original post drafted for ${getFeedHandle()}.`)
    liveComments.splice(3)
    bumpViews(40)
    bumpDayStat("files", 1)
    openMiniWindow("Original Post", "Your original post is staged for social media and mirrored into the main post lane.")
  })
  if(postBtn){
    postBtn.addEventListener("click", ()=>{
      composeInput?.scrollIntoView({behavior:"smooth", block:"center"})
      composeInput?.focus()
      const drafted = (composeInput?.value || "").trim()
      const finalText = drafted || `LIVE SUPPORT RD · ${modeSel?.selectedOptions?.[0]?.textContent || "Personal Route"} · ${lensSel?.selectedOptions?.[0]?.textContent || "Personal Laptop"} · Sponsor lane active · Hair health mission active.`
      const post = qs("#postInput")
      if(post) post.value = finalText
      flashCamera()
      bumpViews(120)
      bumpDayStat("files", 1)
      liveComments.unshift(`Receiver comment: fresh post blast went out for ${lensSel?.selectedOptions?.[0]?.textContent || "this route"}.`)
      liveComments.splice(3)
      updatePromptForFocus("stream")
      openMiniWindow("Post Blast", "Post is live in the main composer now. Add your text or send the drafted social blast to the saved feeds.")
      if(livePanelIndex === 1) renderLivePanel()
    })
  }
  reelToggle?.addEventListener("click", ()=>{
    if(!liveConsoleReel) return
    liveConsoleReel.classList.toggle("hidden")
    reelToggle.textContent = liveConsoleReel.classList.contains("hidden") ? "Show" : "Hide"
  })
  if(floodBtn){
    floodBtn.addEventListener("click", ()=>{
      if(currentViews < 1000){
        if(floodStatus) floodStatus.textContent = `Flood ready state active. ${currentViews} views so far. SupportRD is opening social supports, sponsor lane, and payment readiness while waiting for the 1000-view unlock.`
        if(mainStream && livePanelIndex === 0) mainStream.textContent = `Flood ready state for ${getFeedHandle()}. Social supports are open, sponsor lane is warming, and payment readiness is being staged.`
        updatePromptForFocus("support")
        openMiniWindow("Flood Money Mode", `Flood mode is in ready state. Current views: ${currentViews}. Support supports are opening while the stream pushes toward 1000.`)
        return
      }
      const wallet = JSON.parse(localStorage.getItem(walletKey) || "{}")
      wallet.balance = Number(wallet.balance || 0) + 250
      localStorage.setItem(walletKey, JSON.stringify(wallet))
      bumpDayStat("money", 250)
      if(mainStream && livePanelIndex === 0) mainStream.textContent = "Flood Money Mode active. 10-second sponsor intro and viral TikTok announcement running, then the session will resume."
      if(floodStatus) floodStatus.textContent = `Flood mode is live. Balance lane warmed to $${wallet.balance.toFixed(2)} while keeping payout flow compliance-gated and traffic-safe.`
      flashCamera()
      setTimeout(()=>{
        if(mainStream && livePanelIndex === 0) mainStream.textContent = `Session resumed · ${currentViews} views in play · keep the content purposeful and fast.`
      }, 10000)
      openMiniWindow("Flood Money Mode", "A 10-second sponsor/viral intro is running before the live session drops back in.")
    })
  }
  if(nextBtn){
    nextBtn.addEventListener("click", ()=>{
      liveContentIndex = (liveContentIndex + 1) % contentSteps.length
      renderContentSteps()
      bumpViews(80)
      bumpDayStat("edits", 1)
      if(contentStatus) contentStatus.textContent = `Step ${liveContentIndex + 1}/7 ready. Click through the resume route to keep the session active.`
      const x = (Math.random() * 34) - 17
      const y = (Math.random() * 14) - 7
      nextBtn.style.transform = `translate(${x}px, ${y}px)`
    })
  }
  prevViewBtn?.addEventListener("click", ()=>{
    livePanelIndex = (livePanelIndex + livePanels.length - 1) % livePanels.length
    renderLivePanel()
  })
  nextViewBtn?.addEventListener("click", ()=>{
    livePanelIndex = (livePanelIndex + 1) % livePanels.length
    renderLivePanel()
  })
  qs("#liveArenaAriaBtn")?.addEventListener("click", ()=>{
    if(botBadge) botBadge.textContent = "ARIA Ready"
    const reflection = buildLifeReflection("aria")
    if(botStatus) botStatus.textContent = reflection
    renderLifeMemorySurface(reflection)
    pushAssistantLine(`Aria: ${reflection}`)
    updatePromptForFocus("controls")
    qs("#liveArenaContentList")?.scrollIntoView({behavior:"smooth", block:"center"})
    openMiniWindow("ARIA Walkthrough", reflection)
  })
  qs("#liveArenaJakeBtn")?.addEventListener("click", ()=>{
    if(botBadge) botBadge.textContent = "Jake Ready"
    const reflection = buildLifeReflection("projake")
    if(botStatus) botStatus.textContent = reflection
    renderLifeMemorySurface(reflection)
    pushAssistantLine(`Jake: ${reflection}`)
    updatePromptForFocus("stream")
    qs("#liveArenaMainStream")?.scrollIntoView({behavior:"smooth", block:"center"})
    openMiniWindow("Jake Walkthrough", reflection)
  })
  qs("#liveArenaRefBtn")?.addEventListener("click", ()=>{
    updateRefBot()
    qs("#liveArenaGlitchStatus")?.scrollIntoView({behavior:"smooth", block:"center"})
    if(glitchStatus) glitchStatus.textContent = "Pure assistance mode: use this when the camera is not working, a payment feature is not working, or the stream needs a clean technical handoff to Codex."
    updatePromptForFocus("support")
    openMiniWindow("Ref Bot", "Pure assistance mode is open. Use this lane for camera failure, payment issues, or any technical glitch that needs Codex.")
  })
  visitorModeBtn?.addEventListener("click", ()=>{
    sessionRole = "visitor"
    setViewerMode()
    updatePromptForFocus("controls")
    openMiniWindow("Visitor Screen", `Loaded visitor watch mode for ${getFeedHandle()}. Hearts and support are live, host controls are locked.`)
  })
  ownerModeBtn?.addEventListener("click", ()=>{
    sessionRole = "owner"
    setViewerMode()
    updatePromptForFocus("controls")
    openMiniWindow("Owner Profile", `Loaded owner profile for ${getFeedHandle()}. Personal controls, posting, and payment prep are back live.`)
  })
  sponsorStatus?.addEventListener("click", openSponsorTagModal)
  sponsorTagOpenBtn?.addEventListener("click", openSponsorTagModal)
  tagCreateBtn?.addEventListener("click", ()=>saveSponsorTag(tagInput?.value || ""))
  tagSkipBtn?.addEventListener("click", ()=>{
    closeSponsorTagModal()
    openMiniWindow("SponsorTag", "You can claim your one-time SponsorTag later from SponsorTag HQ.")
  })
  tagInput?.addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){
      e.preventDefault()
      saveSponsorTag(tagInput.value)
    }
  })
  ;[modeSel,lensSel,deviceSel,audioSel,filterSel].forEach(el=>{
    if(el) el.addEventListener("change", ()=>{
      updateRefBot()
      if(profileStatus) profileStatus.textContent = `Host profile ready · ${lensSel?.selectedOptions?.[0]?.textContent || "Lens"} · ${audioSel?.selectedOptions?.[0]?.textContent || "Audio"}`
      if(feedIdentity) feedIdentity.textContent = `Feed running under ${getFeedHandle()}`
      refreshRouteMood()
    })
  })
  agreementAcceptBtn?.addEventListener("click", ()=>{
    localStorage.setItem(agreementKey, "yes")
    if(agreementModal) agreementModal.hidden = true
    openMiniWindow("Agreement Accepted", "Stream payment agreement accepted. SupportRD is ready to receive support through secure checkout lanes.")
  })
  agreementLaterBtn?.addEventListener("click", ()=>{
    if(agreementModal) agreementModal.hidden = true
    openMiniWindow("Agreement Later", "You can accept the stream payment agreement later before using payment-focused live support lanes.")
  })
  viewerPayBtn?.addEventListener("click", ()=>{
    const handle = getFeedHandle()
    bumpDayStat("money", 35)
    recordPurchaseHistory("Live Feed Support", 35)
    window.logSessionSignal?.("Support payment lane opened")
    openMiniWindow("Support This Feed", `${handle} is live. Viewers can support this feed through Shopify checkout while the host stays in control.`)
    openLinkModal(LINKS.pro, `${handle} Live Support Checkout`)
  })
  sendHeartBtn?.addEventListener("click", ()=>{
    const hearts = Number(localStorage.getItem(heartKey) || 0) + 1
    localStorage.setItem(heartKey, String(hearts))
    syncHearts()
    window.logSessionSignal?.("Heart sent to the session")
    liveComments.unshift(`Receiver sent a heart to ${getFeedHandle()}.`)
    liveComments.splice(3)
    if(livePanelIndex === 1) renderLivePanel()
    openMiniWindow("Heart Sent", `A heart was sent to ${getFeedHandle()} and the live feed feels more supported.`)
  })
  liveTabFeed?.addEventListener("click", ()=>{
    recordRecentView("Main Feed")
    window.logSessionSignal?.("Main Feed viewed")
    qs("#liveArenaMainStream")?.scrollIntoView({behavior:"smooth", block:"center"})
    openMiniWindow("Main Feed", "Main feed is centered and ready.")
  })
  liveTabBooth?.addEventListener("click", ()=>{
    recordRecentView("Studio")
    window.logSessionSignal?.("Studio opened from Main Console")
    if(typeof window.openStudioMode === "function") window.openStudioMode()
  })
  liveTabPayments?.addEventListener("click", ()=>{
    recordRecentView("Payments")
    window.logSessionSignal?.("Payments panel opened")
    openModal("subscriptionModal")
    openMiniWindow("Payments", "Product purchase and payment lanes are open.")
  })
  liveTabGPS?.addEventListener("click", ()=>{
    recordRecentView("GPS")
    window.logSessionSignal?.("GPS panel opened")
    if(typeof setActiveTab === "function") setActiveTab("gps")
    qs("#tab-gps")?.scrollIntoView({behavior:"smooth", block:"center"})
    openMiniWindow("GPS", "GPS panel is open and ready.")
  })
  liveTabProfile?.addEventListener("click", ()=>{
    recordRecentView("Profile")
    window.logSessionSignal?.("Profile settings opened")
    openModal("settingsModal")
    openMiniWindow("Profile", "Personal settings and profile links are open.")
  })
  qs("#liveThemeStandardBtn")?.addEventListener("click", ()=>applyThemeQuick("standard"))
  qs("#liveThemeOccasionBtn")?.addEventListener("click", ()=>applyThemeQuick("occasion"))
  qs("#liveThemePremiumBtn")?.addEventListener("click", ()=>applyThemeQuick("premium"))
  qs("#liveThemeMapBtn")?.addEventListener("click", ()=>applyThemeQuick("map"))
  qs("#openLiveProfileBtn")?.addEventListener("click", ()=>{
    openModal("settingsModal")
    openMiniWindow("Profile / Group", "Profile settings, email, address, password, and subscription status are open.")
  })
  qs("#openGiftGiverBtn")?.addEventListener("click", ()=>{
    const modal = qs("#liveGiftModal")
    if(modal) modal.hidden = false
    openMiniWindow("Gift Giver", "Choose a gift amount to support this session and add it into the host balance lane.")
  })
  qs("#closeLiveGiftBtn")?.addEventListener("click", ()=>{
    const modal = qs("#liveGiftModal")
    if(modal) modal.hidden = true
  })
  qsa("[data-gift-amount]").forEach(btn => btn.addEventListener("click", ()=>{
    const amount = Number(btn.getAttribute("data-gift-amount") || 0)
    const wallet = JSON.parse(localStorage.getItem(walletKey) || "{}")
    wallet.balance = Number(wallet.balance || 0) + amount
    wallet.lastGift = amount
    localStorage.setItem(walletKey, JSON.stringify(wallet))
    const gifts = JSON.parse(localStorage.getItem("supportrdGiftHistory") || "[]")
    gifts.unshift({amount, handle:getFeedHandle(), at:new Date().toISOString()})
    localStorage.setItem("supportrdGiftHistory", JSON.stringify(gifts.slice(0,12)))
    bumpDayStat("money", amount)
    recordPurchaseHistory("Gift Giver Support", amount)
    window.logSessionSignal?.(`Gift giver prepared $${amount.toFixed(2)}`)
    const summary = qs("#liveGiftSummary")
    if(summary) summary.textContent = `$${amount.toFixed(2)} added to ${getFeedHandle()} session balance. Continue to checkout if you want a clean payment handoff.`
  }))
  qs("#openLiveGiftCheckout")?.addEventListener("click", ()=>{
    openLinkModal(LINKS.pro, `${getFeedHandle()} Gift Support Checkout`)
  })
  qs("#openGlitchHelpBtn")?.addEventListener("click", ()=>{
    if(glitchStatus) glitchStatus.textContent = "Pure assistance mode open: camera, payment, social feed, or studio return glitches can be handed off here for Codex."
    openMiniWindow("Glitch To Codex", "Pure assistance mode is open. Tell Codex if the camera, payment, select-feeds, or studio return is broken.")
  })
  shell?.addEventListener("click", (e)=>{
    const card = e.target instanceof Element ? e.target.closest(".live-panel-controls, .live-camera-card, .live-content-wizard, .quick-block, .live-panel-bots, .live-aria-history") : null
    Array.from((shell || document).querySelectorAll(".focus-follow")).forEach(el=>el.classList.remove("focus-follow"))
    if(card){
      card.classList.add("focus-follow")
      if(card.classList.contains("live-panel-controls")) updatePromptForFocus("controls")
      if(card.classList.contains("live-camera-card")) updatePromptForFocus("stream")
      if(card.classList.contains("live-content-wizard")) updatePromptForFocus("content")
      if(card.classList.contains("quick-block")) updatePromptForFocus("support")
    }
  })
  shell?.addEventListener("mouseover", (e)=>{
    const card = e.target instanceof Element ? e.target.closest(".live-panel-controls, .live-camera-card, .live-content-wizard, .quick-block, .live-panel-bots, .live-aria-history") : null
    if(card && !card.classList.contains("focus-follow")){
      Array.from((shell || document).querySelectorAll(".focus-follow")).forEach(el=>el.classList.remove("focus-follow"))
      card.classList.add("focus-follow")
    }
  })
  window.addEventListener("scroll", ()=>{
    Array.from((shell || document).querySelectorAll(".focus-follow")).forEach(el=>el.classList.remove("focus-follow"))
  }, {passive:true})
  renderContentSteps()
  updateRefBot()
  updateFloodState()
  syncHearts()
  syncAssistantHistory()
  syncTimers()
  setViewerMode()
  renderLivePanel()
  refreshRouteMood()
  setTimeout(()=>{
    if(overlay?.hidden !== false || shell?.hidden !== false){
      openLiveShell()
    }
  }, 180)
}

function setupSessionSignal(){
  const card = qs("#sessionSignal")
  if(!card) return
  const handleEl = qs("#sessionSignalHandle")
  const roleEl = qs("#sessionSignalRole")
  const ipEl = qs("#sessionSignalIp")
  const idEl = qs("#sessionSignalId")
  const continuityEl = qs("#sessionSignalContinuity")
  const pageEl = qs("#sessionSignalPage")
  const supportEl = qs("#sessionSignalSupport")
  const pingEl = qs("#sessionSignalPing")
  const logEl = qs("#sessionSignalLog")
  const joinBtn = qs("#sessionSignalJoinBtn")
  const sessionKey = "supportrdPublicSessionId"
  const logKey = "supportrdSignalLog"
  const ownerIpKey = "supportrdOwnerLocalIPv4"
  const continuityKey = "supportrdNetworkContinuity"
  const joinHiddenUntilKey = "supportrdJoinHiddenUntil"
  const knownOwnerIp = localStorage.getItem(ownerIpKey) || "10.0.2.13"
  localStorage.setItem(ownerIpKey, knownOwnerIp)
  const getHandle = ()=>{
    const savedTag = localStorage.getItem("supportrdSponsorTag")
    if(savedTag) return savedTag
    try{
      const social = JSON.parse(localStorage.getItem("socialLinks") || "{}")
      const raw = String(social.username || social.name || "SupportRD").trim().replace(/[^a-z0-9]/gi, "")
      return `^^${raw || "SupportRD"}`
    }catch{
      return "^^SupportRD"
    }
  }
  const sessionId = localStorage.getItem(sessionKey) || `SRD-${Math.random().toString(36).slice(2,8).toUpperCase()}`
  localStorage.setItem(sessionKey, sessionId)
  function noteContinuity(nextIp){
    const current = localStorage.getItem(ownerIpKey) || knownOwnerIp
    if(nextIp && nextIp !== current){
      const info = {
        from: current,
        to: nextIp,
        at: new Date().toISOString(),
        preserved: true
      }
      localStorage.setItem(continuityKey, JSON.stringify(info))
      localStorage.setItem(ownerIpKey, nextIp)
      pushLog(`Network changed from ${current} to ${nextIp} · session preserved`)
    }
  }
  function pushLog(line){
    const items = JSON.parse(localStorage.getItem(logKey) || "[]")
    items.unshift(`${new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})} · ${line}`)
    localStorage.setItem(logKey, JSON.stringify(items.slice(0,5)))
    render()
  }
  function currentPageLabel(){
    if(document.body.classList.contains("float-mode-active")) return "Remote"
    if(document.body.classList.contains("studio-mode-active")) return "Studio"
    if(document.body.classList.contains("live-console-active")) return "Main Console"
    const activeTab = document.querySelector(".tab-panel.active")?.id || "post"
    return activeTab.replace(/^tab-/,"").replace(/\b\w/g, m=>m.toUpperCase())
  }
  function render(){
    const role = /[?&]viewer=1\b/.test(location.search) ? "visitor" : "owner"
    const hearts = Number(localStorage.getItem("supportrdSessionHearts") || 0)
    const gifts = JSON.parse(localStorage.getItem("supportrdGiftHistory") || "[]").length
    if(handleEl) handleEl.textContent = `Handle: ${getHandle()}`
    if(roleEl) roleEl.textContent = role === "owner" ? "Owner device recognized" : "Viewer access ready"
    if(ipEl) ipEl.textContent = `Local IPv4: ${knownOwnerIp}${role === "owner" ? " · owner device recognized" : ""}`
    if(idEl) idEl.textContent = `Session ID: ${sessionId}`
    if(idEl) idEl.hidden = true
    const continuity = JSON.parse(localStorage.getItem(continuityKey) || "null")
    if(continuityEl){
      continuityEl.textContent = continuity?.preserved
        ? `Network changed from ${continuity.from} to ${continuity.to} · session preserved.`
        : "Network steady · session preserved."
    }
    if(pageEl) pageEl.textContent = `Page: ${currentPageLabel()}`
    if(supportEl) supportEl.textContent = `Hearts: ${hearts} · Gifts: ${gifts}`
    if(logEl){
      const items = JSON.parse(localStorage.getItem(logKey) || "[]")
      logEl.innerHTML = items.length ? items.join("<br>") : "Waiting for live activity..."
    }
    if(pingEl){
      const rtt = navigator.connection && typeof navigator.connection.rtt === "number" ? navigator.connection.rtt : null
      pingEl.textContent = rtt ? `Ping: ${rtt}ms` : "Ping: live"
    }
    if(joinBtn){
      joinBtn.hidden = true
      joinBtn.disabled = true
      joinBtn.style.display = "none"
    }
  }
  if(joinBtn){
    joinBtn.remove()
  }
  window.noteSupportRDContinuity = noteContinuity
  window.logSessionSignal = pushLog
  ;["click","visibilitychange","storage"].forEach(evt=>{
    window.addEventListener(evt, ()=>render(), {passive:true})
  })
  render()
}

function setupReel(){
  const btn = qs("#openReel")
  if(btn){ btn.addEventListener("click", ()=>openModal("reelModal")) }
  const panel = qs("#reelPanel")
  const toggle = qs("#toggleReel")
  const tab = qs("#reelTab")
  if(panel && toggle){
    toggle.addEventListener("click", ()=>{
      panel.classList.toggle("hidden")
      toggle.textContent = panel.classList.contains("hidden") ? "Show" : "Hide"
    })
  }
  if(panel && tab){
    tab.addEventListener("click", ()=>{
      panel.classList.remove("hidden")
      if(toggle) toggle.textContent = "Hide"
    })
  }
}

function setupAIMillionaireTab(){
  const briefBtn = qs("#aiStartBrief")
  if(briefBtn){
    briefBtn.addEventListener("click", ()=>{
      openMiniWindow("AI Money Paths", "Agency, SaaS, automation, content, and consulting.")
    })
  }
  qsa(".ai-link").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.dataset.aiLink
      const link = AI_LINKS[key]
      if(link){ openLinkModal(link, "AI Millionaire Source") }
    })
  })
}

function setupVRScan(){
  const openBtn = qs("#vrScanBtn")
  const modal = qs("#vrScanModal")
  const close = qs("#closeVrScan")
  const start = qs("#startVrScan")
  const status = qs("#vrScanStatus")

  function reset(){
    if(status) status.textContent = "Ready to scan brochure."
    if(start) start.disabled = false
  }

  if(openBtn){
    openBtn.addEventListener("click", ()=>{
      reset()
      const brochure = qs("#brochureModal")
      if(brochure) brochure.style.display = "none"
      openModal("vrScanModal")
    })
  }
  if(close){
    close.addEventListener("click", ()=>{
      if(modal) modal.style.display = "none"
    })
  }
  if(start){
    start.addEventListener("click", ()=>{
      if(status) status.textContent = "Scanning VR code…"
      start.disabled = true
      setTimeout(()=>{
        if(modal) modal.style.display = "none"
        if(status) status.textContent = "Scan complete. Opening brochure…"
        openModal("brochureModal")
        start.disabled = false
      }, 2200)
    })
  }
}

function setupAdminQuickActions(){
  const seoQuick = qs("#seoQuick")
  const testQuick = qs("#testEmailQuick")
  if(seoQuick){
    seoQuick.addEventListener("click", async ()=>{
      const ok = await setSeoAuto(true)
      if(ok){
        const autoBtn = qs("#seoAuto")
        if(autoBtn){
          autoBtn.classList.add("active")
          autoBtn.textContent = "SEO 4x/Day Active"
        }
        openMiniWindow("SEO Engine", "Random 4x/day schedule activated.")
      }else{
        openMiniWindow("SEO Engine", "Activation failed. Check admin config.")
      }
    })
  }
  if(testQuick){
    testQuick.addEventListener("click", async ()=>{
      try{
        const r = await fetch("/api/custom-order/test", {method:"POST"})
        const d = await r.json()
        openMiniWindow("Test Email", d.ok ? "Sent to developer inbox." : "Failed to send.")
      }catch{
        openMiniWindow("Test Email", "Failed to send.")
      }
    })
  }
}

function setupCamera(){}

function updateOccasionVisibility(){
  const show = state.subscription !== "free" || isProOverride()
  const menu = qs("#menuOccasion")
  if(menu) menu.style.display = show ? "inline-flex" : "none"
  qsa('[data-app="Occasion Editor"]').forEach(el=>{
    el.style.display = show ? "" : "none"
  })
}

function setDefaultLevelBySubscription(){
  if(state.subscription === 'premium' || state.subscription === 'bingo100' || state.subscription === 'pro' || state.subscription === 'yoda' || state.subscription === 'fantasy300' || state.subscription === 'fantasy600'){
    if(state.ariaLevel === 'greeting'){ state.ariaLevel = 'thorough' }
  } else {
    state.ariaLevel = 'greeting'
  }
  updateOccasionVisibility()
}

const SUPPORT_RD_TRUSTED_OWNER_EMAILS = ["agentanthony@supportrd.com","xxfigueroa1993@yahoo.com"]
function isTrustedOwnerEmail(email){
  return SUPPORT_RD_TRUSTED_OWNER_EMAILS.includes(String(email || "").trim().toLowerCase())
}
function isProOverride(){
  const email = (state.socialLinks && state.socialLinks.email || '').toLowerCase()
  return isTrustedOwnerEmail(email)
}
function shouldAutoOwnerEntry(){
  try{
    const saved = JSON.parse(localStorage.getItem("socialLinks") || "{}")
    return localStorage.getItem("supportrdAllowTrustedAutologin") === "true" && isTrustedOwnerEmail(saved.email)
  }catch{
    return false
  }
}
function enableTrustedOwnerAutoLogin(){
  localStorage.setItem("supportrdAllowTrustedAutologin", "true")
}

function setupSettings(){
  const saved = JSON.parse(localStorage.getItem("socialLinks") || "{}")
  state.socialLinks = saved
  localStorage.setItem("supportrdOwnerLocalIPv4", localStorage.getItem("supportrdOwnerLocalIPv4") || "10.0.2.13")
  function renderSettingsAccountSummary(){
    const accountSummary = qs("#settingsAccountSummary")
    const continuitySummary = qs("#settingsContinuitySummary")
    if(!accountSummary) return
    const gifts = JSON.parse(localStorage.getItem("supportrdGiftHistory") || "[]")
    const purchases = JSON.parse(localStorage.getItem("supportrdPurchaseHistory") || "[]")
    const history = Array.isArray(state.ariaHistory) ? state.ariaHistory : []
    const wallet = JSON.parse(localStorage.getItem("supportrdWallet") || "{}")
    const recentViews = JSON.parse(localStorage.getItem("supportrdRecentViews") || "[]")
    const lastViews = recentViews.slice(0,3).map(item=>item.label).join(", ") || "No recent page views yet"
    const ownerUrl = `${location.origin}${location.pathname}`
    const viewerUrl = `${location.origin}${location.pathname}?viewer=1`
    accountSummary.innerHTML = `Logged ${localStorage.getItem("loggedIn")==="true" ? "in" : "out"} · Email: <strong>${saved.email || "not set"}</strong> · Address: <strong>${saved.address || "not set"}</strong><br>Subscription: <strong>${state.subscription || saved.subscription || "free"}</strong> · Next due: <strong>${state.subscriptionNextDue || saved.next_due || "not set"}</strong> · Session balance: <strong>$${Number(wallet.balance || 0).toFixed(2)}</strong><br>Purchase history: <strong>${purchases.length}</strong> · Gift support: <strong>${gifts.length}</strong> · Last 2 Aria lines: <strong>${history.slice(0,2).join(" / ") || "none yet"}</strong><br>Recent page views: <strong>${lastViews}</strong><br>Owner URL: <strong>${ownerUrl}</strong><br>Viewer URL: <strong>${viewerUrl}</strong>`
    if(continuitySummary){
      const continuity = JSON.parse(localStorage.getItem("supportrdNetworkContinuity") || "null")
      continuitySummary.innerHTML = continuity?.preserved
        ? `Network continuity: <strong>session preserved</strong><br>From: <strong>${continuity.from}</strong> · To: <strong>${continuity.to}</strong><br>Changed at: <strong>${new Date(continuity.at).toLocaleString()}</strong>`
        : "Network continuity: <strong>steady</strong> · same session, same payment info, same history, same ^^handle."
    }
  }
  state.subscription = "free"
  if(isProOverride()) { state.subscription = 'pro'; state.ariaBlocked = false; state.ariaCount = 0; localStorage.setItem('loggedIn','true') }
  setDefaultLevelBySubscription()
  refreshDealUnlock()
  qs("#setName").value = saved.name || ""
  qs("#setEmail").value = saved.email || ""
  qs("#setPhone").value = saved.phone || ""
  qs("#setUsername").value = saved.username || ""
  qs("#setPassword").value = ""
  qs("#setAddress").value = saved.address || ""
  qs("#setSubscription").value = isProOverride() ? "Pro (Admin)" : (saved.subscription || "")
  updateSubscriptionSummary(qs("#setSubscription").value || state.subscription || "free", saved)
  renderSettingsAccountSummary()
  qs("#setCustomOrder").value = saved.customOrder || ""
  qs("#setEvelyn").value = saved.evelyn || ""
  qs("#setIG").value = saved.ig || ""
  qs("#setTikTok").value = saved.tiktok || ""
  qs("#setFB").value = saved.fb || ""
  qs("#setYT").value = saved.yt || ""
  qs("#setX").value = saved.x || ""
  qs("#setThreads").value = saved.threads || ""
  qs("#setVoiceProfile").value = saved.voiceProfile || "shimmer"
  qs("#setWifeVoiceMode").checked = !!saved.wifeVoiceMode
  qs("#setWifeVoiceConsent").checked = !!saved.wifeVoiceConsent
  qs("#setMuslimGreeting").checked = !!saved.muslimGreeting
  qs("#setCustomGreeting").value = saved.customGreeting || ""
  qs("#setVoiceReference").value = saved.voiceReference || "I went to the park and birds were chirping. Keep this voice warm, calm, and clear when ARIA speaks."
  qs("#setSameFeelVoice").checked = !!saved.sameFeelVoice
  qs("#setVoiceReferencePack").value = saved.voiceReferencePack || ""
  qs("#setThoughtStyle").value = saved.thoughtStyle || "calm, descriptive, warm"
  qs("#setPrimaryFamily").value = (saved.lifeMemory && saved.lifeMemory.primaryFamily) || ""
  qs("#setExtendedFamily").value = (saved.lifeMemory && saved.lifeMemory.extendedFamily) || ""
  qs("#setReligionChoice").value = (saved.lifeMemory && saved.lifeMemory.religion) || ""
  qs("#setHobbies").value = (saved.lifeMemory && saved.lifeMemory.hobbies) || ""
  qs("#setEducation").value = (saved.lifeMemory && saved.lifeMemory.education) || ""
  qs("#setInterests").value = (saved.lifeMemory && saved.lifeMemory.interests) || ""
  qs("#setLifeMoments").value = (saved.lifeMemory && saved.lifeMemory.lifeMoments) || ""
  const feeds = saved.feeds || {ig:true,tiktok:true,fb:true}
  qs("#feedIG").checked = !!feeds.ig
  qs("#feedTikTok").checked = !!feeds.tiktok
  qs("#feedFB").checked = !!feeds.fb
  qs("#feedYT").checked = !!feeds.yt
  qs("#feedX").checked = !!feeds.x
  qs("#feedThreads").checked = !!feeds.threads
  qs("#pushAria").checked = !!saved.pushAria

  const save = qs("#saveSettings")
  if(save){
    save.addEventListener("click", ()=>{
      state.socialLinks = {
        name: qs("#setName").value.trim(),
        email: qs("#setEmail").value.trim(),
        phone: qs("#setPhone").value.trim(),
        username: qs("#setUsername").value.trim(),
        address: qs("#setAddress").value.trim(),
        subscription: qs("#setSubscription").value.trim(),
        next_due: state.subscriptionNextDue || saved.next_due || "",
        customOrder: qs("#setCustomOrder").value.trim(),
        evelyn: qs("#setEvelyn").value.trim(),
        ig: qs("#setIG").value.trim(),
        tiktok: qs("#setTikTok").value.trim(),
        fb: qs("#setFB").value.trim(),
        yt: qs("#setYT").value.trim(),
        x: qs("#setX").value.trim(),
        threads: qs("#setThreads").value.trim(),
        voiceProfile: qs("#setVoiceProfile").value.trim(),
        wifeVoiceMode: qs("#setWifeVoiceMode").checked,
        wifeVoiceConsent: qs("#setWifeVoiceConsent").checked,
        muslimGreeting: qs("#setMuslimGreeting").checked,
        customGreeting: qs("#setCustomGreeting").value.trim(),
        voiceReference: qs("#setVoiceReference").value.trim(),
        sameFeelVoice: qs("#setSameFeelVoice").checked,
        voiceReferencePack: qs("#setVoiceReferencePack").value.trim(),
        thoughtStyle: qs("#setThoughtStyle").value.trim(),
        lifeMemory: {
          primaryFamily: qs("#setPrimaryFamily").value.trim(),
          extendedFamily: qs("#setExtendedFamily").value.trim(),
          religion: qs("#setReligionChoice").value.trim(),
          hobbies: qs("#setHobbies").value.trim(),
          education: qs("#setEducation").value.trim(),
          interests: qs("#setInterests").value.trim(),
          lifeMoments: qs("#setLifeMoments").value.trim()
        },
        familyFantasyTheme: (state.socialLinks && state.socialLinks.familyFantasyTheme) ? state.socialLinks.familyFantasyTheme : "boat_conductor",
        feeds: {
          ig: qs("#feedIG").checked,
          tiktok: qs("#feedTikTok").checked,
          fb: qs("#feedFB").checked,
          yt: qs("#feedYT").checked,
          x: qs("#feedX").checked,
          threads: qs("#feedThreads").checked
        },
        pushAria: qs("#pushAria").checked
      }
        localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
        if(isProOverride()){ state.subscription = 'pro'; state.ariaBlocked = false; state.ariaCount = 0 }
        setDefaultLevelBySubscription()
        refreshDealUnlock()
        updateSubscriptionSummary(state.subscription || state.socialLinks.subscription || "free", state.socialLinks)
        renderSettingsAccountSummary()
        toast("Settings saved")
      const indicator = qs("#socialIndicator")
      if(indicator){
        const list = Object.keys(state.socialLinks.feeds || {}).filter(k=>state.socialLinks.feeds[k])
        indicator.textContent = list.length ? `Feeds: ${list.map(x=>x[0].toUpperCase()+x.slice(1)).join(", ")}` : "Feeds: none selected"
      }
      renderLifeMemorySurface()
    })
  }
  const reflectBtn = qs("#reflectLifeBtn")
  if(reflectBtn){
    reflectBtn.addEventListener("click", ()=>{
      const assistant = getActiveAssistant()
      const reflection = buildLifeReflection(assistant.id)
      renderLifeMemorySurface(reflection)
      openMiniWindow(`${assistant.name} Reflection`, reflection)
      appendConversation("assistant", reflection)
    })
  }
  renderLifeMemorySurface()
}

function setupPwa(){
  let deferredPrompt = null
  window.addEventListener("beforeinstallprompt", (e)=>{
    e.preventDefault()
    deferredPrompt = e
    const btn = qs("#installBtn")
    if(btn) btn.style.display = "inline-flex"
  })
  const btn = qs("#installBtn")
  if(btn){
    btn.addEventListener("click", async ()=>{
      if(!deferredPrompt) return
      deferredPrompt.prompt()
      deferredPrompt = null
      btn.style.display = "none"
    })
  }
  if("serviceWorker" in navigator){
navigator.serviceWorker.register("/sw.js?v=20260411f").then((registration)=>{
      if(registration?.waiting){
        registration.waiting.postMessage({ type:"SKIP_WAITING" })
      }
    }).catch(()=>{})
  }
}

function setupFamilyMode(){
  const toggle = qs("#familyToggle")
  if(!toggle) return
  toggle.addEventListener("change", ()=>{
    if(toggle.checked){
      window.location.href = "https://supportrd.com"
    }
  })
}

function setupAppDeepLinks(){
  const params = new URLSearchParams(window.location.search || "")
  const app = String(params.get("app") || "").toLowerCase()
  const studio = params.get("studio") === "1"
  if(studio && typeof window.openStudioMode === "function"){
    setTimeout(()=>window.openStudioMode(), 120)
  }
  if(app === "tvreel"){
    openModal("reelModal")
  }
}

function setupStartupSplash(){
  const splash = qs("#launchSplash")
  if(!splash) return
  splash.classList.remove("show")
  splash.setAttribute("hidden", "hidden")
}

function setupLaunchMenu(){
  const launch = qs("#launchMenu")
  const menuBtn = qs("#launchMenuBtn")
  const quickBooth = qs("#quickBoothStart")
  const panel = qs("#launchPanel")
  const panelToggle = qs("#launchPanelToggle")
  const payBtn = qs("#launchPaymentBtn")
  const menuPaymentBtn = qs("#menuPayment")
  const menuBrochureBtn = qs("#menuBrochure")
  const payPanel = qs("#launchPaymentPanel")
  const payClose = qs("#closeLaunchPayment")
  const accountEmail = qs("#launchAccountEmail")
  const accountPassword = qs("#launchAccountPassword")
  const changeEmail = qs("#launchCheckinChangeEmail")
  const changePassword = qs("#launchCheckinChangePassword")
  const newsletterOptIn = qs("#launchNewsletterOptIn")
  const accountLogin = qs("#launchAccountLogin")
  const accountCreate = qs("#launchAccountCreate")
  const accountForgot = qs("#launchAccountForgot")
  const enterBtn = qs("#menuEnter")
  const lang = qs("#launchLang")
  if(!launch || !menuBtn) return
  function openGateWithReason(message){
    const gate = qs("#loginGate")
    if(gate){ gate.style.display = "flex" }
    document.body.classList.add("login-active")
    if(message) uiToast(message)
  }
  function canEnterSupportRD(){
    return true
  }
  launch?.classList.add("hide")
  if(launch){
    launch.hidden = true
    launch.style.display = "none"
  }
  panel?.classList.remove("show")
  if(panel){
    panel.hidden = true
    panel.style.display = "none"
  }
  document.body.classList.remove("launch-active")
  document.body.classList.remove("launch-preview-active")
  setTimeout(()=>{
    try{ window.openFloatMode?.({ preserveHome: true }) }catch{}
  }, 80)
  const labels = {
    en: {title:"SupportRD Check-In", menu:"Professional Check-In", menuBtn:"Enter SupportRD", payment:"Payment Options"},
    es: {title:"Entrada SupportRD", menu:"Entrada Profesional", menuBtn:"Entrar a SupportRD", payment:"Opciones de Pago"},
    fr: {title:"Accueil SupportRD", menu:"Accueil Professionnel", menuBtn:"Entrer dans SupportRD", payment:"Options de Paiement"},
    de: {title:"SupportRD Check-In", menu:"Professioneller Einstieg", menuBtn:"SupportRD betreten", payment:"Zahlungsoptionen"},
    ar: {title:"تسجيل SupportRD", menu:"تسجيل احترافي", menuBtn:"ادخل SupportRD", payment:"خيارات الدفع"},
    sw: {title:"Kuingia SupportRD", menu:"Ukaguzi wa Kitaalamu", menuBtn:"Ingia SupportRD", payment:"Chaguo la Malipo"}
  }
  function saveCheckinDetails(){
    state.socialLinks = state.socialLinks || {}
    const emailValue = (accountEmail?.value || "").trim()
    const newEmailValue = (changeEmail?.value || "").trim()
    const newPasswordValue = (changePassword?.value || "").trim()
    if(emailValue) state.socialLinks.email = emailValue
    if(newEmailValue){
      state.socialLinks.email = newEmailValue
      if(qs("#setEmail")) qs("#setEmail").value = newEmailValue
    }
    if(newPasswordValue){
      state.socialLinks.passwordPreview = "updated"
      if(qs("#setPassword")) qs("#setPassword").value = newPasswordValue
    }
    if(qs("#setAddress")) qs("#setAddress").value = state.socialLinks.address || ""
    state.socialLinks.newsletter = !!newsletterOptIn?.checked
    localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
    localStorage.setItem("supportrdNewsletterOptIn", state.socialLinks.newsletter ? "true" : "false")
    if(newsletterOptIn?.checked){
      uiToast("Subscriber letter enabled for this account.")
    }
  }
  function finishLaunchEntry(){
    launch.classList.add("hide")
    document.body.classList.remove("launch-active")
    document.body.classList.remove("launch-preview-active")
    try{ window.openFloatMode?.({ preserveHome: true }) }catch{}
  }
  function applyLang(code){
    const t = labels[code] || labels.en
    const title = qs("#launchTitle")
    const menuTitle = qs("#menuTitle")
    if(title) title.textContent = t.title
    if(menuTitle) menuTitle.textContent = t.menu
    menuBtn.textContent = t.menuBtn
    if(payBtn) payBtn.textContent = t.payment
  }
  if(lang){
    applyLang(lang.value)
    lang.addEventListener("change", ()=>applyLang(lang.value))
  }
  const savedSocial = JSON.parse(localStorage.getItem("socialLinks") || "{}")
  if(accountEmail) accountEmail.value = savedSocial.email || savedSocial.username || ""
  if(changeEmail) changeEmail.value = savedSocial.email || ""
  if(newsletterOptIn) newsletterOptIn.checked = localStorage.getItem("supportrdNewsletterOptIn") === "true" || !!savedSocial.newsletter
  if(shouldAutoOwnerEntry() && !/[?&]viewer=1\b/.test(location.search)){
    localStorage.setItem("loggedIn","true")
    setTimeout(()=>finishLaunchEntry(), 180)
    return
  }
  setInterval(()=>{ menuBtn.classList.toggle("blink") }, 1500)
  function syncLaunchPanelState(expanded){
    if(!panel || !panelToggle) return
    panel.classList.toggle("collapsed", !expanded)
    panelToggle.textContent = expanded ? "Hide" : "Open"
    panelToggle.setAttribute("aria-expanded", expanded ? "true" : "false")
  }
  syncLaunchPanelState(false)
  panelToggle?.addEventListener("click", ()=>syncLaunchPanelState(panel.classList.contains("collapsed")))
  qsa("#launchMenu button").forEach((btn)=>{
    btn.addEventListener("mouseenter", ()=>{ try{ beep(620, 30) }catch{} })
    btn.addEventListener("click", ()=>{ try{ beep(760, 50) }catch{} })
  })
  menuBtn.addEventListener("click", ()=>{
    saveCheckinDetails()
    finishLaunchEntry()
    try{ beep(980, 90) }catch{}
  })
  const launchStudio = ()=>{
    launch.classList.add("hide")
    document.body.classList.remove("launch-active")
    if(typeof window.openStudioMode === "function"){
      window.openStudioMode()
    }else{
      uiToast("In the Booth is loading in main page...")
    }
  }
  quickBooth?.addEventListener("click", launchStudio)
  if(enterBtn){
    setTimeout(()=>enterBtn.classList.add("ready-glow"), 1100)
  }
  if(payBtn){
    payBtn.addEventListener("click", ()=>{
      if(payPanel) payPanel.classList.toggle("show")
      try{ beep(760, 90) }catch{}
    })
  }
  menuPaymentBtn?.addEventListener("click", ()=>{
    if(payPanel) payPanel.classList.add("show")
    saveCheckinDetails()
  })
  menuBrochureBtn?.addEventListener("click", ()=>{
    openModal("brochureModal")
    openMiniWindow("Brochure", "SupportRD brochure opened from check-in.")
  })
  if(payClose){ payClose.addEventListener("click", ()=>{ if(payPanel) payPanel.classList.remove("show") }) }
  qsa("[data-pay]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.dataset.pay
      const map = {
        family200: LINKS.family200 || LINKS.custom,
        premium: LINKS.premium,
        pro: LINKS.pro,
        bingo100: LINKS.bingo100,
        yoda: LINKS.yoda,
        tip: LINKS.donate
      }
      const labelMap = {
        family200:"Family Pack",
        premium:"ARIA Original",
        pro:"ARIA Professional",
        bingo100:"Bingo",
        yoda:"Slow / Yoda",
        tip:"Tip Owners & Workers"
      }
      openLinkModal(map[k] || LINKS.custom, labelMap[k] || "Payment")
    })
  })
  if(accountLogin){
    accountLogin.addEventListener("click", ()=>{
      saveCheckinDetails()
      enableTrustedOwnerAutoLogin()
      const hint = encodeURIComponent((accountEmail && accountEmail.value || "").trim())
      window.location.href = hint ? `/login?login_hint=${hint}` : "/login"
    })
  }
  if(accountCreate){
    accountCreate.addEventListener("click", ()=>{
      saveCheckinDetails()
      enableTrustedOwnerAutoLogin()
      const hint = encodeURIComponent((accountEmail && accountEmail.value || "").trim())
      window.location.href = hint ? `/login?mode=signup&login_hint=${hint}` : "/login?mode=signup"
    })
  }
  if(accountForgot){
    accountForgot.addEventListener("click", ()=>{
      saveCheckinDetails()
      enableTrustedOwnerAutoLogin()
      const hint = encodeURIComponent((accountEmail && accountEmail.value || "").trim())
      window.location.href = hint ? `/login?mode=forgot&login_hint=${hint}` : "/login?mode=forgot"
    })
  }
  enterBtn?.addEventListener("click", ()=>{
    saveCheckinDetails()
    if(!canEnterSupportRD()){
      openGateWithReason("Log in first so SupportRD can load your real account and session history.")
      return
    }
    finishLaunchEntry()
  })
}

function setupButtonPulseHalo(){
  document.addEventListener("click", (event)=>{
    const btn = event.target?.closest?.(".float-launch-btn,.remote-side-arrow,.remote-go-toggle .btn,.remote-stage-quickbar .btn")
    if(!btn) return
    btn.classList.remove("pulse-select")
    void btn.offsetWidth
    btn.classList.add("pulse-select")
    setTimeout(()=>btn.classList.remove("pulse-select"), 950)
  })
}

function setupTrackViewer(){
  const audio = qs("#trackViewerAudio")
  const toggle = qs("#trackViewerToggle")
  const restart = qs("#trackViewerRestart")
  const stateLabel = qs("#trackViewerState")
  if(!audio || !toggle) return
    function render(){
      const paused = window.__mainRadio?.state ? window.__mainRadio.state() !== "playing" : audio.paused
      toggle.textContent = paused ? "Play" : "Pause"
      toggle.dataset.playing = paused ? "false" : "true"
      if(stateLabel){
        stateLabel.textContent = paused ? "Tap play if audio is paused" : "Now playing on SupportRD"
      }
    }
async function playTheme(){
      if(window.__mainRadio?.play){
        try{
          await window.__mainRadio.play()
          render()
          return
        }catch{
          render()
          return
        }
      }
      try{
        audio.volume = 0.52
        window.__supportRDThemeAudio = audio
        await audio.play()
        render()
      }catch{
        render()
      }
  }
  toggle.addEventListener("click", async ()=>{
    if(window.__mainRadio?.play){
      if(toggle.dataset.playing === "true"){
        try{ window.__mainRadio.pause?.() }catch{}
        toggle.dataset.playing = "false"
        render()
      }else{
        await playTheme()
        toggle.dataset.playing = "true"
      }
      return
    }
    if(audio.paused){
      await playTheme()
    }else{
      audio.pause()
      render()
    }
  })
  restart?.addEventListener("click", async ()=>{
    if(window.__mainRadio?.stop){
      window.__mainRadio.stop()
    }else{
      audio.currentTime = 0
    }
    await playTheme()
  })
  audio.addEventListener("play", render)
  audio.addEventListener("pause", render)
  document.addEventListener("click", ()=>{ if(audio.paused) playTheme() }, { once:true })
  window.playSupportRDTheme = playTheme
  render()
}

function setupSatelliteQuick(){
  const openBtn = qs("#satQuickOpen")
  const miniBtn = qs("#satQuickMini")
  const closeBtn = qs("#satQuickClose")
  const prayerBtn = qs("#satQuickPrayer")
  const directBtn = qs("#satQuickDirect")
  const transferBtn = qs("#satQuickTransfer")
  const brochureBtn = qs("#satQuickBrochure")
  const rescueBtn = qs("#satQuickRescue")
  const status = qs("#satQuickStatus")
  if(!openBtn) return
  function setSatStatus(message, level){
    if(!status) return
    status.textContent = message
    status.classList.remove("ok","warn","alert")
    if(level){ status.classList.add(level) }
  }
  openBtn.addEventListener("click", ()=>openModal("satQuickModal"))
  if(miniBtn){ miniBtn.addEventListener("click", ()=>openModal("satQuickModal")) }
  if(closeBtn){
    closeBtn.addEventListener("click", ()=>closeModal("satQuickModal"))
  }
  if(brochureBtn){
    brochureBtn.addEventListener("click", ()=>{
      openModal("brochureModal")
      setSatStatus("Brochure opened from SAR quick lane.", "ok")
    })
  }
  if(prayerBtn){
    prayerBtn.addEventListener("click", ()=>{
      setSatStatus("Prayer sent: May Allah protect your path, your people, and your clean mission.", "ok")
      openMiniWindow("Prayer", "May Allah protect your path, your people, and your clean mission.")
    })
  }
  if(directBtn){
    directBtn.addEventListener("click", ()=>{
      const body = encodeURIComponent("SupportRD satellite contact request")
      window.location.href = `mailto:agentanthony@supportrd.com?subject=SupportRD%20Satellite%20Contact&body=${body}`
      setSatStatus("Direct contact opened for satellite support.", "ok")
    })
  }
  if(transferBtn){
    transferBtn.addEventListener("click", async ()=>{
      if(!canUseTransferLane()){
        setSatStatus("Transfer Data Lane locked: CEO + Inner Circle only.", "warn")
        openMiniWindow("Transfer Lane", "Locked: CEO + Inner Circle only.")
        return
      }
      const sourceEmail = ((state.socialLinks && state.socialLinks.email) || "inner-circle").toLowerCase()
      try{
        await fetch("/api/engine-glass/snapshot", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            content: `Satellite transfer lane ping from ${sourceEmail}. Direct data channel active.`,
            source: sourceEmail
          })
        })
      }catch{}
      setSatStatus("Transfer Data Lane active. Direct data relay armed for satellite mission updates.", "ok")
      openMiniWindow("Transfer Lane", "Data transfer lane armed. CEO / Inner Circle access confirmed.")
    })
  }
  if(rescueBtn){
    rescueBtn.addEventListener("click", async ()=>{
      document.body.classList.add("sar-red")
      const sourceEmail = ((state.socialLinks && state.socialLinks.email) || "satellite-rescue").toLowerCase()
      let location = "SupportRD location pending"
      try{
        if(state.resolverContext && state.resolverContext.coords){
          const c = state.resolverContext.coords
          location = `${c.lat}, ${c.lon}`
        }
      }catch{}
      try{
        const alertRes = await fetch("/api/alerts/sar", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            mode: "search_rescue_legal",
            level: "code_red",
            location,
            include_prayer: true,
            note: "Detective and legal escalation requested from SAR RED quick button."
          })
        })
        const alertData = await alertRes.json().catch(()=>({}))
        await fetch("/api/engine-glass/snapshot", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            content: `SAR-RED activated by ${sourceEmail}. Last-minute search and rescue + legal detective mode requested.`,
            source: sourceEmail
          })
        })
        if(alertData && alertData.ok){
          setSatStatus(`SAR-RED active: alert ${alertData.request_id} dispatched to admin contacts.`, "alert")
          openMiniWindow("SAR RED", `Search & Rescue legal mode active. Alert ${alertData.request_id} sent.`)
          return
        }
      }catch{}
      setSatStatus("SAR-RED active: detectives + legal lane notified for last-minute search and rescue attempts.", "alert")
      openMiniWindow("SAR RED", "Search & Rescue legal mode is now active.")
    })
  }
}

function setupLiveRadio(){
  const playBtn = qs("#radioPlay")
  const stopBtn = qs("#radioStop")
  const prevBtn = qs("#radioPrev")
  const nextBtn = qs("#radioNext")
  const label = qs("#radioTrackLabel")
  const status = qs("#radioStatus")
  if(!playBtn || !stopBtn || !prevBtn || !nextBtn || !label || !status) return

  const playlist = [
    { title: "Drill Anthony Mix.mp3", src: "/static/audio/drill-anthony.mp3" }
  ]
  let idx = 0
  const audio = new Audio()
  audio.preload = "auto"

    function loadTrack(i){
      idx = (i + playlist.length) % playlist.length
      const track = playlist[idx]
      audio.src = track.src
      label.textContent = track.title
      status.textContent = `Ready: ${track.title}`
    }
    async function playCurrent(){
      try{ window.__supportRDThemeAudio?.pause?.() }catch{}
      try{
        if(!audio.src) loadTrack(idx)
        await audio.play()
        playBtn.textContent = "Pause"
        status.textContent = `Now playing: ${playlist[idx].title}`
    }catch{
      status.textContent = "Tap Play to allow audio."
    }
  }

  playBtn.addEventListener("click", async ()=>{
    if(audio.paused){
      await playCurrent()
    }else{
      audio.pause()
      playBtn.textContent = "Play"
      status.textContent = "Paused."
    }
  })
  stopBtn.addEventListener("click", ()=>{
    audio.pause()
    audio.currentTime = 0
    playBtn.textContent = "Play"
    status.textContent = "Stopped."
  })
  prevBtn.addEventListener("click", async ()=>{
    loadTrack(idx - 1)
    await playCurrent()
  })
    nextBtn.addEventListener("click", async ()=>{
      loadTrack(idx + 1)
      await playCurrent()
    })
    audio.addEventListener("ended", async ()=>{ await playCurrent() })
    loadTrack(0)
    window.__mainRadio = {
    play: playCurrent,
    stop: ()=>{
      audio.pause()
      audio.currentTime = 0
      playBtn.textContent = "Play"
      status.textContent = "Stopped."
    },
    pause: ()=>{
      audio.pause()
      playBtn.textContent = "Play"
      status.textContent = "Paused."
    },
    state: ()=>audio.paused ? "paused" : "playing"
  }
}

function setupShopifyConnectorBadge(){
  const badge = qs("#shopifyConnectorBadge")
  if(!badge) return
  const apply = (status, text)=>{
    badge.classList.remove("connector-badge-healthy","connector-badge-watch","connector-badge-critical")
    if(status === "healthy") badge.classList.add("connector-badge-healthy")
    if(status === "watch") badge.classList.add("connector-badge-watch")
    if(status === "critical") badge.classList.add("connector-badge-critical")
    badge.textContent = text
  }
  async function refresh(){
    try{
      const r = await fetch("/api/shopify/connector-health")
      const d = await r.json()
      if(!(d && d.ok)){
        apply("critical", "Shopify: health unavailable")
        return
      }
      const txt = `Shopify: ${String(d.status || "unknown").toUpperCase()} (${Number(d.score || 0)}%)`
      apply(d.status, txt)
    }catch{
      apply("critical", "Shopify: network issue")
    }
  }
  refresh()
  setInterval(refresh, 60000)
}

function setupLoginGate(){
  try{
    const saved = JSON.parse(localStorage.getItem('socialLinks') || '{}')
    if(shouldAutoOwnerEntry() && isTrustedOwnerEmail(saved.email)){
      localStorage.setItem('loggedIn','true')
    }
  }catch{}
  const gate = qs("#loginGate")
  const loginBtn = qs("#loginBtn")
  const logoutBtn = qs("#logoutBtn")
  const signupTop = qs("#signupTop")
  const closeGate = qs("#closeLoginGate")
  const collapseGateBtn = qs("#collapseLoginGate")
  const loginRoute = qs("#loginGateRoute")
  const loggedIn = localStorage.getItem("loggedIn") === "true"
  const first = Number(localStorage.getItem("firstSeen") || Date.now())
  if(!localStorage.getItem("firstSeen")) localStorage.setItem("firstSeen", String(first))
  const trialBanner = qs("#trialCodeBanner")
  const trialOverlay = qs("#trialOverlay")
  const trialClose = qs("#trialClose")
  let overlayShowing = false
  function syncTrialOverlay(){
    if(!trialOverlay) return
    const now = Date.now()
    const minutes = (now - first) / 60000
    const dismissed = localStorage.getItem("trialDismissed") === "true"
    const shouldShow = minutes <= 30 && !dismissed && !loggedIn
    if(shouldShow !== overlayShowing){
      trialOverlay.classList.toggle("show", shouldShow)
      overlayShowing = shouldShow
    }
    trialOverlay.setAttribute("aria-hidden", shouldShow ? "false" : "true")
    if(trialBanner){ trialBanner.style.display = shouldShow ? "none" : "block" }
  }
  function syncTrialBanner(){
    if(!trialBanner) return
    const now = Date.now()
    const minutes = (now - first) / 60000
    trialBanner.style.display = minutes <= 30 ? "block" : "none"
  }
  if(trialClose){
    trialClose.addEventListener("click", ()=>{
      localStorage.setItem("trialDismissed", "true")
      syncTrialOverlay()
    })
  }
  function syncLoginUi(isLogged){
    if(gate){
      gate.style.display = isLogged ? "none" : "flex"
      gate.classList.toggle("collapsed", !isLogged)
    }
    if(loginRoute) loginRoute.hidden = !!isLogged
    document.body.classList.toggle("login-active", !isLogged)
    if(loginBtn) loginBtn.style.display = isLogged ? "none" : "inline-flex"
    if(signupTop) signupTop.style.display = isLogged ? "none" : "inline-flex"
    if(logoutBtn) logoutBtn.style.display = isLogged ? "inline-flex" : "none"
    const badge = qs("#userBadge")
    if(badge){ badge.style.display = isLogged ? "inline-flex" : "none" }
  }
  syncTrialOverlay()
  syncTrialBanner()
  syncLoginUi(loggedIn)
  setAdminVisibility(false)
  fetch("/api/me").then(r=>r.json()).then(d=>{
    if(d && d.authenticated){
      localStorage.setItem("loggedIn","true")
      enableTrustedOwnerAutoLogin()
      syncLoginUi(true)
      try{ window.dispatchEvent(new CustomEvent("supportrd-login-ready", { detail:{ source:"api-me", user:d.user || null } })) }catch{}
      const badge = qs("#userBadge")
      const name = d.user && (d.user.name || d.user.nickname || d.user.email) ? (d.user.name || d.user.nickname || d.user.email) : "Logged In"
      if(badge){ badge.textContent = name }
      if(d.user?.email){
        state.socialLinks = state.socialLinks || {}
        state.socialLinks.email = d.user.email
        localStorage.setItem("socialLinks", JSON.stringify({...state.socialLinks}))
      }
      if(d.subscription){
        state.subscription = d.subscription
        setDefaultLevelBySubscription()
        refreshDealUnlock()
      }
      setAdminVisibility(!!d.admin)
    }
  }).catch(()=>{})
  function openLoginGateSticky(options = {}){
    if(gate){
      gate.style.display = "flex"
      gate.classList.remove("collapsed")
    }
    if(loginRoute) loginRoute.hidden = false
    document.body.classList.add("login-active")
    const title = qs("#loginGate h2")
    const body = gate?.querySelector("p")
    if(title && options.title) title.textContent = options.title
    if(body && options.message) body.textContent = options.message
  }
  function openLoginGate(){ openLoginGateSticky() }
  function collapseLoginGate(){
    if(gate){ gate.style.display = "flex"; gate.classList.add("collapsed") }
    if(loginRoute) loginRoute.hidden = false
    document.body.classList.add("login-active")
  }
  function closeLoginGate(){
    if(localStorage.getItem("loggedIn") === "true"){
      if(gate){ gate.style.display = "none" }
      if(loginRoute) loginRoute.hidden = true
      document.body.classList.remove("login-active")
      return
    }
    collapseLoginGate()
  }
  if(loginBtn){ loginBtn.addEventListener("click", openLoginGate) }
  if(signupTop){ signupTop.addEventListener("click", ()=>{ window.location = "/login?mode=signup" }) }
  if(closeGate){ closeGate.addEventListener("click", closeLoginGate) }
  if(collapseGateBtn){ collapseGateBtn.addEventListener("click", collapseLoginGate) }
  if(loginRoute){ loginRoute.addEventListener("click", ()=>openLoginGateSticky()) }
  if(logoutBtn){ logoutBtn.addEventListener("click", ()=>{ window.location = "/logout" }) }
  window.openLoginGateSticky = openLoginGateSticky
  window.collapseLoginGate = collapseLoginGate
  window.requireSupportRDLoginForAction = function(config = {}){
    const title = config.title || "Sign In To Continue"
    const message = config.message || "Sign in or create an account to continue."
    if(localStorage.getItem("loggedIn") === "true" || shouldAutoOwnerEntry()) return true
    openLoginGateSticky({ title, message })
    return false
  }

  function completeLogin(){
    localStorage.setItem("loggedIn","true")
    enableTrustedOwnerAutoLogin()
    syncLoginUi(true)
    try{ window.dispatchEvent(new CustomEvent("supportrd-login-ready", { detail:{ source:"local-complete" } })) }catch{}
  }

  // Provider buttons are plain links to avoid popup blockers.
}

function setupBrochure(){
  const btn = qs("#vrScanBtn")
  const floatBtn = qs("#openBrochureFloat")
  if(btn){ btn.addEventListener("click", ()=>openModal("brochureModal")) }
  if(floatBtn){ floatBtn.addEventListener("click", ()=>openModal("brochureModal")) }
}

function setupPuzzle(){
  const q = qs("#puzzleQuestion")
  const a = qs("#puzzleAnswer")
  const btn = qs("#puzzleSubmit")
  if(!q || !a || !btn) return
  function newPuzzle(){
    const x = 3 + Math.floor(Math.random() * 9)
    const y = 4 + Math.floor(Math.random() * 9)
    state.puzzleAnswer = x + y
    q.textContent = `What is ${x} + ${y}?`
    a.value = ""
  }
  btn.addEventListener("click", ()=>{
    if(Number(a.value) === state.puzzleAnswer){
      state.ariaBlocked = false
      state.ariaCount = 0
      qs("#puzzleModal").style.display = "none"
      appendAria("ARIA: Thanks! You’re unlocked — continue your hair routine questions.")
    } else {
      toast("Try again")
      newPuzzle()
    }
  })
  newPuzzle()
}

async function loadProducts(){
  try{
    const r = await fetch("/api/products")
    const items = await r.json()
    const list = Array.isArray(items) ? items : []
    state.shopifyProducts = list
    state.shopifyProductsLoaded = true
    return list
  }catch{
    state.shopifyProducts = []
    state.shopifyProductsLoaded = true
    return []
  }
}


function setupHairAnalysis(){
  const start = qs("#startHairScan")
  const overlay = qs("#hairScanOverlay")
  const status = qs("#hairScanStatus")
  const result = qs("#analysisResult")
  const close = qs("#closeHairScan")
  if(close){ close.addEventListener("click", ()=>{ if(overlay) overlay.style.display = "none" }) }
  if(!start || !overlay) return
  start.addEventListener("click", ()=>{
    overlay.style.display = "flex"
    holdAssistantTeleport({
      aria: { x: window.innerWidth / 2 - 104, y: window.innerHeight - 170 },
      jake: { x: window.innerWidth / 2 + 76, y: window.innerHeight - 142 }
    }, 14000, {
      mood: "alert",
      status: "Hair scan active. Aria and Jake teleported to the scan lane and will stay here until the scan settles."
    })
    if(typeof triggerAssistantMoment === "function"){
      triggerAssistantMoment("analysis_ready", {
        point: { x: window.innerWidth / 2, y: Math.max(174, window.innerHeight * 0.34) },
        duration: 3800
      })
    }
    if(status) status.textContent = "Scanning... hold steady and move left to right."
    if(result) result.textContent = "Scan running..."
    setTimeout(()=>{
      const summary = "Scan complete. I see dryness at the ends with light frizz and low bounce at the crown. I recommend a moisture mask, light protein, and a satin wrap.";
      if(status) status.textContent = summary
      if(result) result.textContent = summary
      showSpeechPopup("ARIA", summary)
      speakReply(summary)
      releaseAssistantTeleport()
      setTimeout(()=>{ overlay.style.display = "none" }, 2400)
    }, 1800)
  })
}

  
  




function setActiveTab(tabId){
  qsa(".tab-btn").forEach(b=>b.classList.remove("active"))
  qsa(".tab-panel").forEach(p=>p.classList.remove("active"))
  const btn = qs(`.tab-btn[data-tab="${tabId}"]`)
  const panel = qs(`#tab-${tabId}`)
  if(btn) btn.classList.add("active")
  if(panel) panel.classList.add("active")
}

function animateAssistantLabel(el, text){
  if(!el) return
  el.classList.remove("assistant-enter")
  el.classList.add("assistant-leave")
  setTimeout(()=>{
    el.textContent = text
    el.classList.remove("assistant-leave")
    el.classList.add("assistant-enter")
    setTimeout(()=>el.classList.remove("assistant-enter"), 380)
  }, 220)
}

function applyAssistantUI(withFx){
  const assistant = getActiveAssistant()
  const badge = qs("#assistantNowBadge")
  const sub = qs("#ariaAssistantSub")
  const title = qs("#assistantLargeTitle")
  const voiceBtn = qs("#voiceToggle")
  const topicSel = qs("#assistantTopic")
  if(topicSel && state.assistantTopic){ topicSel.value = state.assistantTopic }
  const badgeText = `Now: ${assistant.name}`
  const voiceText = `${assistant.name} • Tap to Talk`
  if(withFx){
    animateAssistantLabel(badge, badgeText)
    animateAssistantLabel(sub, assistant.sub)
    animateAssistantLabel(title, assistant.title)
    animateAssistantLabel(voiceBtn, voiceText)
  }else{
    if(badge) badge.textContent = badgeText
    if(sub) sub.textContent = assistant.sub
    if(title) title.textContent = assistant.title
    if(voiceBtn) voiceBtn.textContent = voiceText
  }
  localStorage.setItem("activeAssistant", state.activeAssistant)
}

function setupAssistantSystem(){
  const switchBtn = qs("#assistantSwitchBtn")
  const topicSel = qs("#assistantTopic")
  applyAssistantUI(false)
  if(topicSel){
    topicSel.addEventListener("change", ()=>{
      state.assistantTopic = topicSel.value || "hair_core"
      localStorage.setItem("assistantTopic", state.assistantTopic)
    })
  }
  if(switchBtn){
    switchBtn.addEventListener("click", ()=>{
      const current = ASSISTANTS.findIndex(a => a.id === state.activeAssistant)
      const next = ASSISTANTS[(current + 1) % ASSISTANTS.length]
      state.activeAssistant = next.id
      applyAssistantUI(true)
      openMiniWindow("Assistant Swap", `${next.name} is now active.`)
    })
  }
}

function setupStudioMode(){
  const shell = qs("#studioModeShell")
  const frame = qs("#studioModeFrame")
  const openBtn = qs("#menuStudio")
  const openTopBtn = qs("#openStudioTop")
  const openHandsBtn = qs("#openProJakeStudio")
  const exitBtn = qs("#studioExitBtn")
  const importantBtn = qs("#studioImportantBtn")
  const settingsBtn = qs("#studioSettingsBtn")
  const purchaseBtn = qs("#studioPurchaseBtn")
  const themeBtn = qs("#studioThemeBtn")
  const blogBtn = qs("#studioBlogBtn")
  let studioBootTimer = null
  if(!shell) return
  const studioSrc = frame?.dataset?.src || "/static/studio/index.html?v=20260323i"

  const isLoggedIn = ()=>localStorage.getItem("loggedIn") === "true"
  const promptStudioLogin = ()=>{
    const gate = qs("#loginGate")
    if(gate){ gate.style.display = "flex" }
    document.body.classList.add("login-active")
    uiToast("Sign in required before entering In the Booth.")
  }

  const openStudio = ()=>{
    const returnView = localStorage.getItem("supportrdStudioReturnView")
      || (document.body.classList.contains("float-mode-active") ? "remote" : "main")
    if(!isLoggedIn()){
      promptStudioLogin()
      return
    }
    try{ window.__mainRadio?.stop?.() }catch{}
    const launch = qs("#launchMenu")
    if(launch){ launch.classList.add("hide") }
    document.body.classList.remove("launch-active")
    document.body.classList.add("studio-mode-open")
    document.body.classList.remove("float-mode-active")
    document.body.classList.remove("remote-home-active")
    shell.classList.add("active")
    shell.classList.add("booting")
    shell.classList.remove("ready")
    shell.setAttribute("aria-hidden", "false")
    shell.dataset.returnView = returnView
    if(frame && frame.getAttribute("src") !== studioSrc){ frame.setAttribute("src", studioSrc) }
    state.activeAssistant = "projake"
    applyAssistantUI(true)
    if(studioBootTimer){ clearTimeout(studioBootTimer) }
    try{
      frame?.contentWindow?.postMessage({ type: "studio-enter", micProfile: "audiology-fast", autoplay: true }, "*")
    }catch{}
    // Fast studio load feel.
    studioBootTimer = setTimeout(()=>{
      shell.classList.remove("booting")
      shell.classList.add("ready")
      try{
        frame?.contentWindow?.postMessage({ type: "studio-enter", micProfile: "audiology-fast", autoplay: true }, "*")
      }catch{}
    }, 320)
  }
  const closeStudio = ()=>{
    if(studioBootTimer){ clearTimeout(studioBootTimer); studioBootTimer = null }
    try{
      frame?.contentWindow?.postMessage({ type: "studio-leave" }, "*")
    }catch{}
    document.body.classList.remove("studio-mode-open")
    shell.classList.remove("active")
    shell.classList.remove("booting")
    shell.classList.remove("ready")
    shell.setAttribute("aria-hidden", "true")
    shell.style.display = "none"
    state.activeAssistant = "aria"
    applyAssistantUI(true)
    document.body.classList.remove("live-jello")
    const appRoot = qs("#app")
    if(appRoot){
      appRoot.style.filter = "none"
      appRoot.style.backdropFilter = "none"
      appRoot.style.opacity = "1"
    }
    const returnView = shell.dataset.returnView || localStorage.getItem("supportrdStudioReturnView") || "main"
    localStorage.removeItem("supportrdStudioReturnView")
    setTimeout(()=>{
      shell.style.display = ""
      if(returnView === "remote" && typeof window.openFloatMode === "function"){
        window.openFloatMode({ source: "studio-return", preserveHome: true })
      }
    }, 30)
    setActiveTab("post")
    openMiniWindow(returnView === "remote" ? "SupportRD Remote" : "SupportRD Main Console", returnView === "remote" ? "Returned to the SupportRD Remote home." : "Returned to ARIA post page.")
  }

  if(openBtn){ openBtn.addEventListener("click", openStudio) }
  if(openTopBtn){ openTopBtn.addEventListener("click", openStudio) }
  if(openHandsBtn){ openHandsBtn.addEventListener("click", openStudio) }
  if(exitBtn){ exitBtn.addEventListener("click", closeStudio) }
  if(importantBtn){ importantBtn.addEventListener("click", ()=>openMiniWindow("Important Information", "Use Studio for creation. Use Main Console for live customer support and posts.")) }
  if(settingsBtn){ settingsBtn.addEventListener("click", ()=>openModal("settingsModal")) }
  if(purchaseBtn){ purchaseBtn.addEventListener("click", ()=>openModal("subscriptionModal")) }
  if(themeBtn){
    themeBtn.addEventListener("click", ()=>{
      const next = qs("#themeNextSide")
      if(next) next.click()
    })
  }
  if(blogBtn){ blogBtn.addEventListener("click", ()=>openModal("blogModal")) }
  window.openStudioMode = openStudio
  window.closeStudioMode = closeStudio
}

function setupFloatMode(){
  const shell = qs("#floatModeShell")
  const openBtn = qs("#menuFloatMode")
  const studioBtn = qs("#studioFloatBtn")
  const closeBtn = qs("#floatModeClose")
  const returnMainBtn = qs("#floatModeReturnMain")
  const openStudioBtn = qs("#floatModeOpenStudio")
  const goViewBtn = qs("#floatModeGoView")
  const goTogglePanel = qs("#remoteGoTogglePanel")
  const assistantStatus = qs("#floatAssistantStatus")
  const deviceStatus = qs("#floatDeviceStatus")
  const settingsStatus = qs("#floatSettingsStatus")
  const liveStatus = qs("#floatLiveStatus")
  const configStatus = qs("#floatConfigStatus")
  const faqPromptSelect = qs("#floatFaqPromptSelect")
  const faqPromptAnswer = qs("#floatFaqPromptAnswer")
  const faqReelFrame = qs("#floatFaqReelFrame")
  const faqThemeButtons = qsa("[data-faq-theme]")
  const profileName = qs("#floatProfileName")
  const profileMeta = qs("#floatProfileMeta")
  const profileHistory = qs("#floatProfileHistory")
  const profileQualityTitle = qs("#floatProfileQualityTitle")
  const profileQualityBody = qs("#floatProfileQualityBody")
  const profileHero = qs("#floatProfileHero")
  const diaryProfileHero = qs("#floatDiaryProfileHero")
  const profileDisplayName = qs("#floatProfileDisplayName")
  const profileLatestResult = qs("#floatProfileLatestResult")
  const profileCredentialsSummary = qs("#floatProfileCredentialsSummary")
  const profileCredentialTheme = qs("#floatProfileCredentialTheme")
  const profileSaveBtn = qs("#floatProfileSaveBtn")
  const profilePasswordInput = qs("#floatProfilePassword")
  const profile2faPhone = qs("#floatProfile2faPhone")
  const profile2faCode = qs("#floatProfile2faCode")
  const profile2faSaveBtn = qs("#floatProfile2faSaveBtn")
  const profileLinkedInUrl = qs("#floatProfileLinkedInUrl")
  const profileLinkedInPostBtn = qs("#floatProfileLinkedInPostBtn")
  const hairScanCamera = qs("#floatHairScanCamera")
  const hairScanOverlay = qs("#floatHairScanOverlay")
  const hairScanBeginBtn = qs("#floatHairScanBeginBtn")
  const hairScanLeftBtn = qs("#floatHairScanLeftBtn")
  const hairScanRightBtn = qs("#floatHairScanRightBtn")
  const hairScanCompleteBtn = qs("#floatHairScanCompleteBtn")
  const hairScanProgressFill = qs("#floatHairScanProgressFill")
  const profileUploadInput = qs("#floatProfileUploadInput")
  const mapBtn = qs("#floatMapBtn")
  const themeBtn = qs("#floatThemeBtn")
  const paymentBtn = qs("#floatPaymentBtn")
  const faqPaymentBtn = qs("#floatFaqPaymentBtn")
  const cameraBtn = qs("#floatCameraBtn")
  const profilePostInput = qs("#floatProfilePostInput")
  const faqReelHost = qs("#floatFaqReelHost")
  const themeCardRail = qs("#floatThemeCardRail")
  const mapHero = qs("#floatMapHero")
  const mapHeroTitle = qs("#floatMapHeroTitle")
  const mapHeroBody = qs("#floatMapHeroBody")
  const mapActionHost = qs("#floatMapActionHost")
  const uploadBtn = qs("#floatUploadBtn")
  const uploadInput = qs("#floatUploadInput")
  const freshBoardsBtn = qs("#floatFreshBoardsBtn")
  const playBtn = qs("#floatPlayBtn")
  const pauseBtn = qs("#floatPauseBtn")
  const stopBtn = qs("#floatStopBtn")
  const prevBtn = qs("#floatPrevBtn")
  const rewindBtn = qs("#floatRewindBtn")
  const nextBtn = qs("#floatNextBtn")
  const fastForwardBtn = qs("#floatFastForwardBtn")
  const recordVoiceBtn = qs("#floatRecordVoiceBtn")
  const instrumentRecordBtn = qs("#floatInstrumentRecordBtn")
  const guitarBtn = qs("#floatGuitarBtn")
  const speakerBtn = qs("#floatSpeakerBtn")
  const gigSwitchBtn = qs("#floatGigSwitchBtn")
  const trimStart = qs("#floatTrimStart")
  const trimEnd = qs("#floatTrimEnd")
  const trimStartNumber = qs("#floatTrimStartNumber")
  const trimEndNumber = qs("#floatTrimEndNumber")
  const highlightBtn = qs("#floatHighlightBtn")
  const deleteSectionBtn = qs("#floatDeleteSectionBtn")
  const undoBtn = qs("#floatUndoBtn")
  const fxBtn = qs("#floatFxBtn")
  const clearBoardBtn = qs("#floatClearBoardBtn")
  const exportStudioBtn = qs("#floatExportStudioBtn")
  const exportTikTokBtn = qs("#floatExportTikTokBtn")
  const exportSocialBtn = qs("#floatExportSocialBtn")
  const diaryPostBtn = qs("#floatDiaryPostBtn")
  const diaryClearBtn = qs("#floatDiaryClearBtn")
  const diaryStudioBtn = qs("#floatDiaryStudioBtn")
  const diarySaveBtn = qs("#floatDiarySaveBtn")
  const diaryExportPdfBtn = qs("#floatDiaryExportPdfBtn")
  const handsfreeBtn = qs("#floatHandsfreeBtn")
  const handsfreeTranscript = qs("#floatHandsfreeTranscript")
  const diaryFaqBtn = qs("#floatDiaryFaqBtn")
  const diaryGpsBtn = qs("#floatDiaryGpsBtn")
  const diaryGpsExplainBtn = qs("#floatDiaryGpsExplainBtn")
  const diaryGpsStage = qs("#floatDiaryGpsStage")
  const diaryPanels = qs("#floatDiaryPanels")
  const diaryGpsCopy = qs("#floatDiaryGpsCopy")
  const diaryGpsExitBtn = qs("#floatDiaryGpsExitBtn")
  const diaryExitGpsBtn = qs("#floatDiaryExitGpsBtn")
  const diaryGpsStoreBtn = qs("#floatDiaryGpsStoreBtn")
  const diaryGpsMainBtn = qs("#floatDiaryGpsMainBtn")
  const diaryGpsMapBtn = qs("#floatDiaryGpsMapBtn")
  const diaryGpsStudioBtn = qs("#floatDiaryGpsStudioBtn")
  const mapBtnDiary = qs("#floatMapBtnDiary")
  const settingsSaveBtn = qs("#floatSettingsSaveBtn")
  const pushToggleBtn = qs("#floatPushToggleBtn")
  const settingsEmailBtn = qs("#floatSettingsEmailBtn")
  const settingsPasswordBtn = qs("#floatSettingsPasswordBtn")
  const settingsLinksBtn = qs("#floatSettingsLinksBtn")
  const settingsPushBtn = qs("#floatSettingsPushBtn")
  const settingsLanguageBtn = qs("#floatSettingsLanguageBtn")
  const configGuide = qs("#floatConfigGuide")
  const configPhone = qs("#floatConfigPhone")
  const diarySocialLinkRow = qs("#floatDiarySocialLinkRow")
  const diarySocialEditor = qs("#floatDiarySocialEditor")
  const diarySelfieBtn = qs("#floatDiarySelfieBtn")
  const diarySelfieSnapBtn = qs("#floatDiarySelfieSnapBtn")
  const diaryPanoramaBtn = qs("#floatDiaryPanoramaBtn")
  const diarySelfiePreview = qs("#floatDiarySelfiePreview")
  const diarySelfieVideo = qs("#floatDiarySelfieVideo")
  const diarySelfieCanvas = qs("#floatDiarySelfieCanvas")
  const diarySelfieStatus = qs("#floatDiarySelfieStatus")
  const diarySelfieMode = qs("#floatDiarySelfieMode")
  const diarySelfieOverlay = qs("#floatDiarySelfieOverlay")
  const diaryFilterChips = qsa("[data-diary-filter]")
  const instrumentTypeInput = qs("#floatInstrumentType")
  const fxPresetInput = qs("#floatFxPreset")
  const gigSettings = qs("#floatGigSettings")
  const gigFilterInput = qs("#floatGigFilter")
  const gigPanInput = qs("#floatGigPan")
  const gigFrameRateInput = qs("#floatGigFrameRate")
  const gigZoomInput = qs("#floatGigZoom")
  const gigSlowMotionInput = qs("#floatGigSlowMotion")
  const studioLiveBtn = qs("#floatStudioLiveBtn")
  const diarySocialPost = qs("#floatDiarySocialPost")
  const diarySocialSaveBtn = qs("#floatDiarySocialSaveBtn")
  const diaryLevelSelect = qs("#floatDiaryLevelSelect")
  const diaryHistory = qs("#floatDiaryHistory")
  const diaryHistoryScope = qs("#floatDiaryHistoryScope")
  const diaryPagePreview = qs("#floatDiaryPagePreview")
  const diaryFlipPrev = qs("#floatDiaryFlipPrev")
  const diaryFlipNext = qs("#floatDiaryFlipNext")
  const diaryAriaFixed = qs("#floatDiaryAriaFixed")
  const diaryJakeFixed = qs("#floatDiaryJakeFixed")
  const diaryLiveBtn = qs("#floatDiaryLiveBtn")
  const diaryLiveStatus = qs("#floatDiaryLiveStatus")
  const diaryLiveStage = qs("#floatDiaryLiveStage")
  const diaryLiveVideo = qs("#floatDiaryLiveVideo")
  const diaryLiveOverlay = qs("#floatDiaryLiveOverlay")
  const diaryLiveFastPay = qs("#floatDiaryLiveFastPay")
  const diaryLiveHeart = qs("#floatDiaryLiveHeart")
  const diaryLiveThumb = qs("#floatDiaryLiveThumb")
  const diaryLiveGuest = qs("#floatDiaryLiveGuest")
  const diaryLiveComment = qs("#floatDiaryLiveComment")
  const diaryLiveCommentBtn = qs("#floatDiaryLiveCommentBtn")
  const diaryLiveComments = qs("#floatDiaryLiveComments")
  function setRemoteStatus(text){
    if(text && liveStatus) liveStatus.textContent = text
  }
  function setRemoteGoMode(enabled){
    if(!shell) return
    shell.classList.toggle("remote-go-mode", !!enabled)
    try{ localStorage.setItem("supportrdRemoteGoMode", enabled ? "true" : "false") }catch{}
    if(goViewBtn) goViewBtn.textContent = enabled ? "Return To Normal View" : "Switch To On-The-Go View"
    if(goTogglePanel) goTogglePanel.setAttribute("aria-label", enabled ? "On-The-Go View active" : "Normal Remote view active")
    if(enabled){
      if(remoteStageHome && !remoteStageHome.hidden){
        setRemoteStatus("On-The-Go View is active. The whole Remote is enlarged, focused, and ready while the side controls stay out of the way.")
      }
    }else{
      setRemoteStatus("Normal Remote view is back. All features are available again around the Remote.")
    }
  }
  function persistAvatar(dataUrl){
    state.userAvatar = dataUrl
    try{ localStorage.setItem("supportrdUserAvatar", dataUrl) }catch{}
    syncProfile()
  }
  function triggerProfileUpload(){
    profileUploadInput?.click()
  }
  function readAvatarFile(file){
    if(!file) return
    const reader = new FileReader()
    reader.onload = ()=>{
      if(typeof reader.result === "string"){
        persistAvatar(reader.result)
        setRemoteStatus("Profile picture updated. Your remote identity card looks more like you now.")
      }
    }
    reader.readAsDataURL(file)
  }
  const diarySelfieFilters = {
    clean: { label:"Clean Glow", css:"saturate(1.02) contrast(1.04) brightness(1.02)" },
    warm: { label:"Warm Pop", css:"sepia(.18) saturate(1.12) hue-rotate(-8deg) brightness(1.03)" },
    cool: { label:"Cool Studio", css:"saturate(1.12) contrast(1.08) hue-rotate(10deg)" },
    mono: { label:"Mono Focus", css:"grayscale(1) contrast(1.08) brightness(1.04)" }
  }
  function updateDiarySelfieMode(){
    const active = diarySelfieFilters[remoteState.selfieFilter] || diarySelfieFilters.clean
    if(diarySelfieMode) diarySelfieMode.textContent = `Filter: ${active.label}`
    if(diarySelfieVideo) diarySelfieVideo.style.filter = active.css
    if(diarySelfieCanvas) diarySelfieCanvas.style.filter = active.css
    diaryFilterChips.forEach((chip)=>chip.classList.toggle("active", chip.dataset.diaryFilter === remoteState.selfieFilter))
  }
  function stopDiarySelfieCamera(){
    try{
      remoteState.selfieStream?.getTracks?.().forEach(track=>track.stop())
    }catch{}
    remoteState.selfieStream = null
    if(diarySelfieVideo){
      diarySelfieVideo.pause?.()
      diarySelfieVideo.srcObject = null
      diarySelfieVideo.hidden = true
    }
    if(diarySelfieOverlay) diarySelfieOverlay.hidden = false
    if(diarySelfieBtn) diarySelfieBtn.textContent = "Self Camera"
  }
  async function startDiarySelfieCamera(){
    if(!navigator.mediaDevices?.getUserMedia){
      const msg = "Self camera is not available on this device right now, but Diary Mode is still ready for notes and filters."
      if(diarySelfieStatus) diarySelfieStatus.textContent = msg
      openMiniWindow("Selfie Moment", msg)
      return
    }
    if(remoteState.selfieStream){
      stopDiarySelfieCamera()
      if(diarySelfieStatus) diarySelfieStatus.textContent = "Self camera paused. Tap again when you want the Diary selfie view back."
      return
    }
    try{
      const stream = await navigator.mediaDevices.getUserMedia({
        video:{
          facingMode:"user",
          width:{ ideal: 1440 },
          height:{ ideal: 1080 }
        },
        audio:false
      })
      remoteState.selfieStream = stream
      if(diarySelfieVideo){
        diarySelfieVideo.srcObject = stream
        diarySelfieVideo.hidden = false
        diarySelfieCanvas && (diarySelfieCanvas.hidden = true)
        diarySelfieVideo.play?.().catch(()=>{})
      }
      if(diarySelfieOverlay) diarySelfieOverlay.hidden = true
      if(diarySelfieBtn) diarySelfieBtn.textContent = "Pause Camera"
      const mode = remoteState.selfiePanorama ? "Panoramic mode is on." : "Portrait mode is on."
      if(diarySelfieStatus) diarySelfieStatus.textContent = `Self camera is live in Diary Mode. ${mode} Filters stay ready while you move.`
      updateDiarySelfieMode()
    }catch{
      const msg = "SupportRD could not open the front camera. Check camera permission and try the selfie moment again."
      if(diarySelfieStatus) diarySelfieStatus.textContent = msg
      openMiniWindow("Selfie Moment", msg)
    }
  }
  function captureDiarySelfie(){
    if(!diarySelfieVideo || !diarySelfieCanvas) return
    const sourceWidth = diarySelfieVideo.videoWidth || 960
    const sourceHeight = diarySelfieVideo.videoHeight || 720
    diarySelfieCanvas.width = sourceWidth
    diarySelfieCanvas.height = sourceHeight
    const ctx = diarySelfieCanvas.getContext("2d")
    if(!ctx) return
    ctx.filter = (diarySelfieFilters[remoteState.selfieFilter] || diarySelfieFilters.clean).css
    ctx.drawImage(diarySelfieVideo, 0, 0, sourceWidth, sourceHeight)
    diarySelfieCanvas.hidden = false
    const dataUrl = diarySelfieCanvas.toDataURL("image/png")
    persistAvatar(dataUrl)
    if(diaryProfileHero){
      diaryProfileHero.textContent = ""
      diaryProfileHero.style.backgroundImage = `url(${dataUrl})`
      diaryProfileHero.style.backgroundSize = "cover"
      diaryProfileHero.style.backgroundPosition = "center"
    }
    if(diarySelfieStatus) diarySelfieStatus.textContent = "Selfie captured. Your Diary identity card now reflects the latest hair moment."
  }
  function toggleDiaryPanorama(){
    remoteState.selfiePanorama = !remoteState.selfiePanorama
    diarySelfiePreview?.classList.toggle("is-pano", remoteState.selfiePanorama)
    if(diaryPanoramaBtn) diaryPanoramaBtn.textContent = remoteState.selfiePanorama ? "Panoramic On" : "Panoramic Mode"
    const shape = remoteState.selfiePanorama ? "Panoramic mode is active for a wider paintball-ready capture." : "Panoramic mode is off. Portrait mode is back."
    if(diarySelfieStatus) diarySelfieStatus.textContent = shape
  }
  const boardPreview = qs("#floatBoardPreview")
  const boardPreviewCopy = qs("#floatBoardPreviewCopy")
  const boardPreviewMediaWrap = qs("#floatBoardPreviewMediaWrap")
  const boardPreviewAudio = qs("#floatBoardPreviewAudio")
  const boardPreviewVideo = qs("#floatBoardPreviewVideo")
  const waveCanvas = qs("#floatWaveCanvas")
  const boardTimer = qs("#floatBoardTimer")
  const boardMode = qs("#floatBoardMode")
  const quickEditStatus = qs("#floatQuickEditStatus")
  const faqReelBtn = qs("#floatFaqReelBtn")
  const launchButtons = qsa(".float-launch-btn")
  const navHomeBtn = qs("#floatNavHome")
  const navDiaryBtn = qs("#floatNavDiary")
  const navProfileBtn = qs("#floatNavProfile")
  const navBoothBtn = qs("#floatNavBooth")
  const navGpsBtn = qs("#floatNavGPS")
  const navSettingsBtn = qs("#floatNavSettings")
  const navCloseBtn = qs("#floatNavClose")
  const footerGuideBtn = qs("#floatFooterGuide")
  const footerSettingsBtn = qs("#floatFooterSettings")
  const footerPaymentsBtn = qs("#floatFooterPayments")
  const footerSubscribeBtn = qs("#floatFooterSubscribe")
  const footerBlogBtn = qs("#floatFooterBlog")
  const footerOfficialBtn = qs("#floatFooterOfficial")
  const footerOfficialBottomBtn = qs("#floatFooterOfficialBottom")
  const remoteStageHome = qs("#remoteStageHome")
  const remoteContentStage = qs("#remoteContentStage")
  const remoteAdsToggleBtn = qs("#remoteAdsToggleBtn")
  const remoteAdsFocusBtn = qs("#remoteAdsFocusBtn")
  const remoteStageGpsBtn = qs("#remoteStageGpsBtn")
  const remoteStageStudioBtn = qs("#remoteStageStudioBtn")
  const remoteStagePaymentBtn = qs("#remoteStagePaymentBtn")
  const remoteColorPrevBtn = qs("#remoteColorPrev")
  const remoteColorNextBtn = qs("#remoteColorNext")
  const remotePurchaseProductsBtn = qs("#remotePurchaseProducts")
  const remotePurchasePremiumBtn = qs("#remotePurchasePremium")
  const remotePurchaseStudioBtn = qs("#remotePurchaseStudio")
  const remotePurchaseThemesBtn = qs("#remotePurchaseThemes")
  const remotePurchaseSupportBtn = qs("#remotePurchaseSupport")
  const remotePurchaseCustomBtn = qs("#remotePurchaseCustom")
  const remotePurchaseOrdersBtn = qs("#remotePurchaseOrders")
  const remotePurchaseSolidBtn = qs("#remotePurchaseSolid")
  const remotePurchaseToggleBtn = qs("#remotePurchaseToggle")
  const remotePurchasePrevBtn = qs("#remotePurchasePrev")
  const remotePurchaseNextBtn = qs("#remotePurchaseNext")
  const remotePurchaseCount = qs("#remotePurchaseCount")
  const remotePurchaseItems = qsa(".remote-purchase-item")
  const remoteEditsProductBtn = qs("#remoteEditsProduct")
  const remoteEditsVirtualBtn = qs("#remoteEditsVirtual")
  const remoteEditsActualBtn = qs("#remoteEditsActual")
  const remoteEditsBudgetBtn = qs("#remoteEditsBudget")
  const remoteEditsMeetingsBtn = qs("#remoteEditsMeetings")
  const remoteEditsTimingBtn = qs("#remoteEditsTiming")
  const remoteEditsStudyBtn = qs("#remoteEditsStudy")
  const remoteEditsToggleBtn = qs("#remoteEditsToggle")
  const remoteEditsPrevBtn = qs("#remoteEditsPrev")
  const remoteEditsNextBtn = qs("#remoteEditsNext")
  const remoteEditsCount = qs("#remoteEditsCount")
  const remoteEditsItems = qsa(".remote-edits-item")
  const remoteInfoSigninBtn = qs("#remoteInfoSignin")
  const remoteInfoPrivacyBtn = qs("#remoteInfoPrivacy")
  const remoteInfoAboutBtn = qs("#remoteInfoAbout")
  const remoteInfoContactBtn = qs("#remoteInfoContact")
  const remoteInfoOfficialBtn = qs("#remoteInfoOfficial")
  const remoteInfoFooterBtn = qs("#remoteInfoFooter")
  const remoteScenarioButtons = qsa("#remoteScenarioButtons .remote-scenario-btn")
  const guardianAriaBtn = qs("#remoteGuardianAria")
  const guardianJakeBtn = qs("#remoteGuardianJake")
  const primeMenu = qs("#floatPrimeMenu")
  const primeViewBotBtn = qs("#floatPrimeViewBot")
  const primeContinueBtn = qs("#floatPrimeContinue")
  const primeCloseBtn = qs("#floatPrimeClose")
  const founderLayer = qs("#floatFounderLayer")
  const founderCloseBtn = qs("#floatFounderClose")
  const tGuide = qs("#floatTGuide")
  const remoteSheet = qs("#floatRemoteSheet")
  const remoteSheetTitle = qs("#floatRemoteSheetTitle")
  const remoteSheetBody = qs("#floatRemoteSheetBody")
  const remoteSheetBack = qs("#floatRemoteSheetBack")
  const remoteSheetClose = qs("#floatRemoteSheetClose")
  const remotePurchaseEditor = qs("#remotePurchaseEditor")
  const remoteEditsMenu = qs("#remoteEditsMenu")
  if(!shell) return
  const assistantAriaOrb = qs("#floatAriaBtn")
  const assistantJakeOrb = qs("#floatJakeBtn")
  const assistantMotionState = {
    lastInteraction: null,
    lastScrollBucket: -1,
    lastScrollY: Math.max(window.scrollY || 0, 0),
    driftPhase: 0,
    roamTimer: null,
    pointerBias: "center",
    recentSideTaps: [],
    activeMoment: "idle",
    momentTimer: null,
    scrollTicking: false,
    recentVelocity: 0,
    teleportTimer: null,
    teleportUntil: 0
  }
  const REMOTE_ASSISTANT_SCENES = {
    home: {
      aria: { x: "-8px", y: "2px", tilt: "-5deg", speed: "3.4s" },
      jake: { x: "8px", y: "-2px", tilt: "5deg", speed: "3.8s" },
      status: "Aria and Jake are floating in welcome mode, ready to guide the Remote."
    },
    diary: {
      aria: { x: "-12px", y: "-8px", tilt: "-7deg", speed: "3.0s" },
      jake: { x: "10px", y: "8px", tilt: "4deg", speed: "4.1s" },
      status: "Diary mode is active. Aria leans in on the emotional post route while Jake stays nearby for support."
    },
    studio: {
      aria: { x: "-4px", y: "10px", tilt: "-3deg", speed: "3.5s" },
      jake: { x: "16px", y: "-10px", tilt: "7deg", speed: "2.7s" },
      status: "Studio route is active. Jake is moving sharper for booth timing while Aria holds the support edge."
    },
    settings: {
      aria: { x: "-10px", y: "0px", tilt: "-4deg", speed: "3.6s" },
      jake: { x: "10px", y: "0px", tilt: "4deg", speed: "3.6s" },
      status: "Configuration route is active. The assistants settle into a cleaner settings orbit."
    },
    map: {
      aria: { x: "-18px", y: "-10px", tilt: "-8deg", speed: "2.8s" },
      jake: { x: "18px", y: "10px", tilt: "8deg", speed: "3.0s" },
      status: "Map change is active. Aria and Jake move like route guides tracking your next turn."
    },
    faq: {
      aria: { x: "-8px", y: "-4px", tilt: "-3deg", speed: "3.3s" },
      jake: { x: "8px", y: "4px", tilt: "3deg", speed: "3.7s" },
      status: "FAQ lounge is active. The assistants settle into demo mode for quick help and reels."
    },
    profile: {
      aria: { x: "-14px", y: "4px", tilt: "-6deg", speed: "3.5s" },
      jake: { x: "12px", y: "-6px", tilt: "5deg", speed: "3.9s" },
      status: "Profile view is active. The assistants frame the identity card like a polished product demo."
    },
    payments: {
      aria: { x: "-6px", y: "-6px", tilt: "-2deg", speed: "3.1s" },
      jake: { x: "6px", y: "6px", tilt: "2deg", speed: "3.3s" },
      status: "Payments are active. Aria and Jake tighten up into checkout support mode."
    },
    blog: {
      aria: { x: "-10px", y: "-2px", tilt: "-4deg", speed: "3.8s" },
      jake: { x: "10px", y: "2px", tilt: "4deg", speed: "4.2s" },
      status: "Blog party is open. The assistants soften into story mode for organic growth."
    },
    official: {
      aria: { x: "-6px", y: "0px", tilt: "-2deg", speed: "3.9s" },
      jake: { x: "6px", y: "0px", tilt: "2deg", speed: "4.1s" },
      status: "Official information is active. The assistants stay steady and trustworthy."
    },
    solid: {
      aria: { x: "-4px", y: "-8px", tilt: "-3deg", speed: "3.0s" },
      jake: { x: "4px", y: "8px", tilt: "3deg", speed: "3.0s" },
      status: "Solid State is active. Aria and Jake are locked into verification mode."
    }
  }
  function applyAssistantDemoScene(route = "home", overrideStatus){
      const sceneKey = REMOTE_ASSISTANT_SCENES[route] ? route : "home"
      const scene = REMOTE_ASSISTANT_SCENES[sceneKey]
    ;[
      [assistantAriaOrb, scene.aria],
      [assistantJakeOrb, scene.jake],
      [guardianAriaBtn, scene.aria],
      [guardianJakeBtn, scene.jake]
    ].forEach(([node, motion])=>{
      if(!node || !motion) return
      node.dataset.demoScene = sceneKey
      node.style.setProperty("--demo-shift-x", motion.x)
      node.style.setProperty("--demo-shift-y", motion.y)
      node.style.setProperty("--demo-tilt", motion.tilt)
      node.style.setProperty("--demo-bob-duration", motion.speed)
    })
    remoteState.currentRoute = sceneKey
      if(assistantStatus && overrideStatus !== false){
        assistantStatus.textContent = overrideStatus || scene.status
      }
    }
  const REMOTE_ASSISTANT_HELP = {
      home: {
        aria: { focus: "#floatModeShell .float-main-hero", greeting: "Aria is online. Tell me the hair problem and I will guide this page around it.", listening: "Aria is listening now. Speak naturally and I will transcribe everything here." },
        projake: { focus: "#floatModeShell .float-main-hero", greeting: "Jake is online. Tell me what part of the work or hair support needs help.", listening: "Jake is listening now. Speak your studio or hair request." }
      },
      diary: {
        aria: { focus: "#floatDiaryPanels", greeting: "Aria moved into Diary Mode. Tell me what is on your mind and what your hair is dealing with.", listening: "Diary listening is live now. Say the note and the hair details together." },
        projake: { focus: "#floatDiaryPanels", greeting: "Jake is covering Diary Mode with you. Tell me the note and if work or studio stress is part of it.", listening: "Jake is listening now. Say the diary note and I will keep the workflow calm." }
      },
      studio: {
        aria: { focus: "#floatQuickEditStatus", greeting: "Aria stepped into Studio Quick Panel. Tell me the hair focus while you record or edit.", listening: "Studio listening is live. Say the hair problem or recording issue now." },
        projake: { focus: "#floatQuickEditStatus", greeting: "Jake jumped into the studio lane. Tell me what board, cut, or recording move you need.", listening: "Jake is listening now. Speak the studio command and I will help route it." }
      },
      settings: {
        aria: { focus: "#floatSettingsBox", greeting: "Aria moved into Configuration. Tell me which setting you want help changing.", listening: "Configuration listening is live. Say the setting and the change you want." },
        projake: { focus: "#floatSettingsBox", greeting: "Jake is in Configuration now. Tell me the system change you want to make.", listening: "Jake is listening for the settings move now." }
      },
      map: {
        aria: { focus: "#floatThemeCardRail", greeting: "Aria moved to Map Change. Tell me the mood, route, or theme you want right now.", listening: "Map listening is live. Say the feeling or destination and I will guide the change." },
        projake: { focus: "#floatThemeCardRail", greeting: "Jake moved to the map lane. Tell me the theme or movement route you want on this page.", listening: "Jake is listening now for the map and theme change." }
      },
      faq: {
        aria: { focus: "#floatFaqReelHost", greeting: "Aria moved into FAQ Lounge. Tell me the help topic or hair question you want answered.", listening: "FAQ listening is live. Ask the hair question naturally." },
        projake: { focus: "#floatFaqReelHost", greeting: "Jake is covering FAQ Lounge. Tell me what answer, reel, or studio topic you want.", listening: "Jake is listening now. Ask the question and I will route the answer." }
      },
      profile: {
        aria: { focus: "#floatProfileBox", greeting: "Aria moved into Profile. Tell me what image, quality, or achievement you want to strengthen.", listening: "Profile listening is live. Say what you want the page to present about you." },
        projake: { focus: "#floatProfileBox", greeting: "Jake moved into Profile. Tell me what identity or studio quality should show here.", listening: "Jake is listening now for your profile adjustments." }
      },
      payments: {
        aria: { focus: "#remotePurchaseEditor", greeting: "Aria moved into the payment lane. Tell me what product or premium route you want help with.", listening: "Payment listening is live now. Say the product name or purchase question." },
        projake: { focus: "#remotePurchaseEditor", greeting: "Jake moved into the payment lane. Tell me what studio or premium purchase needs routing.", listening: "Jake is listening now for the payment route." }
      }
    }
    const ASSISTANT_MOMENTS = {
      reel_bun: {
        mood: "excited",
        placement: "center",
        status: "Ancient Chinese bun energy spotted in the reel. Aria and Jake are leaning in to celebrate the style and keep the page alive.",
        line: "Ancient bun spotlight detected. We are here if you want the product route, cultural appreciation, or style timing."
      },
      developer_feed: {
        mood: "social",
        placement: "center",
        status: "Developer Feed movement detected. Aria and Jake are moving toward the live feedback lane to keep the page feeling loved and current.",
        line: "We saw that new Developer Feed movement. SupportRD is watching the love board with you."
      },
      purchase_hover: {
        mood: "excited",
        placement: "hover",
        status: "Purchase energy is active. Aria and Jake are hovering near checkout to make the buy feel confident and exciting.",
        line: "Hi. We are right here if you want to lock in the right product."
      },
      purchase_checkout: {
        mood: "alert",
        placement: "checkout",
        status: "Checkout support is active. Aria and Jake are making sure the purchase lane feels obvious and supported.",
        line: "Checkout support is active. Sign in, confirm the product, and we will stay close to the purchase lane."
      },
      left_taps: {
        mood: "alert",
        placement: "shift-right",
        status: "Repeated left-side taps detected. Aria and Jake shifted right so they stop blocking the content and keep up with your movement.",
        line: "We noticed those left-side taps and moved over so the page stays easy to use."
      },
      hair_alert: {
        mood: "alert",
        placement: "center",
        status: "Hair alert mode is active. Aria and Jake are treating this like a serious damage or bad-hair-day moment.",
        line: "Hair alert mode is on. Tell us if this is frizz, oil, damage, color loss, or low bounce and we will respond seriously."
      },
      diary_schedule: {
        mood: "focus",
        placement: "center",
        status: "Diary scheduling is active. Aria and Jake are front and center to help build a real hair routine around your life.",
        line: "Diary schedule mode is open. Let us help you plan your hair rhythm around the week."
      },
      analysis_ready: {
        mood: "alert",
        placement: "center",
        status: "Hair analysis is active. Aria and Jake moved front and center so the scan feels intelligent and focused.",
        line: "Hair analysis mode is active. Hold steady and let us read the situation carefully."
      },
      feed_hover: {
        mood: "social",
        placement: "follow",
        status: "The page is alive with reels, posts, and family feedback. Aria and Jake are casually scrolling with you.",
        line: "Hi. We are right here with the reel and feedback lane."
      }
    }
    let activeAssistantTimers = []
    let assistantHoverTimer = null
    function parseSceneShift(value){
      return Number(String(value || "0").replace("px", "").trim()) || 0
    }
    function setAssistantMomentClasses(mood = "idle"){
      const moodClassMap = ["is-alert", "is-excited", "is-social", "is-focus"]
      ;[assistantAriaOrb, assistantJakeOrb, guardianAriaBtn, guardianJakeBtn].forEach((node)=>{
        if(!node) return
        moodClassMap.forEach(cls=>node.classList.remove(cls))
        if(mood === "alert") node.classList.add("is-alert")
        if(mood === "excited") node.classList.add("is-excited")
        if(mood === "social") node.classList.add("is-social")
        if(mood === "focus") node.classList.add("is-focus")
      })
    }
    function clearAssistantSequence(){
      activeAssistantTimers.forEach((timer)=>clearTimeout(timer))
      activeAssistantTimers = []
      if(assistantMotionState.teleportTimer){
        clearTimeout(assistantMotionState.teleportTimer)
        assistantMotionState.teleportTimer = null
      }
      assistantMotionState.teleportUntil = 0
      ;[assistantAriaOrb, assistantJakeOrb].forEach((orb)=>{
        if(!orb) return
        orb.classList.remove("hover-wave")
      })
      if(assistantMotionState.momentTimer){
        clearTimeout(assistantMotionState.momentTimer)
        assistantMotionState.momentTimer = null
      }
      assistantMotionState.activeMoment = "idle"
      setAssistantMomentClasses("idle")
      syncAssistantViewportMotion(true)
    }
    function moveAssistantNodeToFocus(node, selector){
      if(!node) return
      const target = selector ? qs(selector) : null
      const rect = target?.getBoundingClientRect?.()
      const width = node.classList.contains("remote-guardian-btn") ? 238 : Math.min(window.innerWidth * 0.24, 170)
      const x = rect ? rect.left + (rect.width / 2) - (width / 2) : (window.innerWidth / 2) - (width / 2)
      const y = rect ? Math.max(92, rect.top + Math.min(rect.height * 0.18, 120)) : Math.max(110, window.innerHeight * 0.24)
      node.style.setProperty("--demo-float-left", `${Math.max(16, Math.min(window.innerWidth - width - 16, x))}px`)
      node.style.setProperty("--demo-float-top", `${Math.max(86, Math.min(window.innerHeight - width - 24, y))}px`)
      node.classList.add("demo-active")
    }
    function moveAssistantNodeToPoint(node, x, y){
      if(!node) return
      const width = node.classList.contains("remote-guardian-btn") ? 238 : Math.min(window.innerWidth * 0.24, 170)
      const height = node.classList.contains("remote-guardian-btn") ? 84 : width
      const clampedX = Math.max(16, Math.min(window.innerWidth - width - 16, x - (width / 2)))
      const clampedY = Math.max(86, Math.min(window.innerHeight - height - 24, y - (height / 2)))
      node.style.setProperty("--demo-float-left", `${clampedX}px`)
      node.style.setProperty("--demo-float-top", `${clampedY}px`)
      node.classList.add("demo-active")
    }
    function buildAssistantScrollLayout(progress, direction){
      const width = window.innerWidth
      const height = window.innerHeight
      const phase = assistantMotionState.driftPhase % 4
      const layouts = [
        {
          aria: { x: 128, y: 144 },
          jake: { x: width - 138, y: 186 }
        },
        {
          aria: { x: width - 158, y: Math.max(148, height * 0.32) },
          jake: { x: 140, y: Math.max(168, height * 0.46) }
        },
        {
          aria: { x: width - 150, y: height - 184 },
          jake: { x: 146, y: height - 212 }
        },
        {
          aria: { x: width * 0.46, y: height - 176 },
          jake: { x: width - 146, y: Math.max(158, height * 0.42) }
        }
      ]
      let layout = layouts[Math.min(layouts.length - 1, Math.floor(progress * layouts.length))]
      if(direction === "up"){
        layout = layouts[(Math.floor(progress * layouts.length) + phase + 1) % layouts.length]
      }
      if(progress > 0.72){
        layout = phase % 2 === 0
          ? { aria: { x: 138, y: height - 194 }, jake: { x: width - 148, y: height - 222 } }
          : { aria: { x: width - 156, y: height - 214 }, jake: { x: 146, y: height - 188 } }
      }else if(progress < 0.18){
        layout = phase % 2 === 0
          ? { aria: { x: 126, y: 138 }, jake: { x: width - 144, y: 166 } }
          : { aria: { x: width - 162, y: 146 }, jake: { x: 138, y: 194 } }
      }
      if(assistantMotionState.pointerBias === "left"){
        layout = {
          aria: { x: Math.min(layout.aria.x, 138), y: layout.aria.y },
          jake: { x: Math.min(layout.jake.x, width * 0.42), y: layout.jake.y }
        }
      }else if(assistantMotionState.pointerBias === "right"){
        layout = {
          aria: { x: Math.max(layout.aria.x, width * 0.58), y: layout.aria.y },
          jake: { x: Math.max(layout.jake.x, width - 152), y: layout.jake.y }
        }
      }
      return layout
    }
    function applyAssistantPairLayout(layout){
      if(!layout) return
      const scene = REMOTE_ASSISTANT_SCENES[remoteState.currentRoute || "home"] || REMOTE_ASSISTANT_SCENES.home
      const ariaOffsetX = parseSceneShift(scene.aria?.x)
      const ariaOffsetY = parseSceneShift(scene.aria?.y)
      const jakeOffsetX = parseSceneShift(scene.jake?.x)
      const jakeOffsetY = parseSceneShift(scene.jake?.y)
      ;[
        [assistantAriaOrb, layout.aria.x + ariaOffsetX, layout.aria.y + ariaOffsetY],
        [assistantJakeOrb, layout.jake.x + jakeOffsetX, layout.jake.y + jakeOffsetY],
        [guardianAriaBtn, layout.aria.x + ariaOffsetX, layout.aria.y + ariaOffsetY],
        [guardianJakeBtn, layout.jake.x + jakeOffsetX, layout.jake.y + jakeOffsetY]
      ].forEach(([node, x, y])=>moveAssistantNodeToPoint(node, x, y))
    }
    function moveAssistantPairToInteraction(x, y){
      const clampedY = Math.max(148, Math.min(window.innerHeight - 146, y))
      const bias = x < (window.innerWidth * 0.42) ? "left" : x > (window.innerWidth * 0.58) ? "right" : "center"
      assistantMotionState.pointerBias = bias
      const ariaLead = bias === "left"
        ? { x: Math.min(window.innerWidth - 210, x + 150), y: clampedY - 54 }
        : bias === "right"
          ? { x: Math.max(174, x - 150), y: clampedY - 54 }
          : { x: x - 96, y: clampedY - 66 }
      const jakeLead = bias === "left"
        ? { x: Math.min(window.innerWidth - 152, x + 92), y: clampedY + 42 }
        : bias === "right"
          ? { x: Math.max(144, x - 92), y: clampedY + 42 }
          : { x: x + 92, y: clampedY + 28 }
      applyAssistantPairLayout({ aria: ariaLead, jake: jakeLead })
    }
    function getRouteFocusPoint(){
      const route = remoteState.currentRoute || "home"
      const help = REMOTE_ASSISTANT_HELP[route]
      const selector = help?.[state.activeAssistant || "aria"]?.focus || help?.aria?.focus
      const target = selector ? qs(selector) : null
      const rect = target?.getBoundingClientRect?.()
      if(!rect) return null
      return {
        x: rect.left + (rect.width / 2),
        y: Math.max(142, Math.min(window.innerHeight - 120, rect.top + Math.min(rect.height * 0.35, 160)))
      }
    }
    function releaseAssistantTeleport(){
      assistantMotionState.teleportUntil = 0
      if(assistantMotionState.teleportTimer){
        clearTimeout(assistantMotionState.teleportTimer)
        assistantMotionState.teleportTimer = null
      }
      setAssistantMomentClasses("idle")
      syncAssistantViewportMotion(true)
    }
    function holdAssistantTeleport(layout, duration = 0, options = {}){
      if(!layout) return
      if(assistantMotionState.teleportTimer){
        clearTimeout(assistantMotionState.teleportTimer)
        assistantMotionState.teleportTimer = null
      }
      assistantMotionState.teleportUntil = duration > 0 ? Date.now() + duration : 0
      if(options.mood) setAssistantMomentClasses(options.mood)
      if(options.status && assistantStatus) assistantStatus.textContent = options.status
      applyAssistantPairLayout(layout)
      if(duration > 0){
        assistantMotionState.teleportTimer = setTimeout(()=>releaseAssistantTeleport(), duration)
      }
    }
    function holdSingleAssistantTeleport(assistantId, point, duration = 0, options = {}){
      const primary = assistantId === "projake" ? assistantJakeOrb : assistantAriaOrb
      const partner = assistantId === "projake" ? assistantAriaOrb : assistantJakeOrb
      if(!primary || !point) return
      if(assistantMotionState.teleportTimer){
        clearTimeout(assistantMotionState.teleportTimer)
        assistantMotionState.teleportTimer = null
      }
      assistantMotionState.teleportUntil = duration > 0 ? Date.now() + duration : 0
      if(options.mood) setAssistantMomentClasses(options.mood)
      if(options.status && assistantStatus) assistantStatus.textContent = options.status
      moveAssistantNodeToPoint(primary, point.x, point.y)
      const routeFocus = getRouteFocusPoint() || { x: window.innerWidth - 150, y: 150 }
      if(partner) moveAssistantNodeToPoint(partner, routeFocus.x, routeFocus.y)
      if(duration > 0){
        assistantMotionState.teleportTimer = setTimeout(()=>releaseAssistantTeleport(), duration)
      }
    }
    function getRouteFocusPoint(){
      const route = remoteState.currentRoute || "home"
      const help = REMOTE_ASSISTANT_HELP[route]
      const selector = help?.[state.activeAssistant || "aria"]?.focus || help?.aria?.focus
      const target = selector ? qs(selector) : null
      const rect = target?.getBoundingClientRect?.()
      if(!rect) return null
      return {
        x: rect.left + (rect.width / 2),
        y: Math.max(142, Math.min(window.innerHeight - 120, rect.top + Math.min(rect.height * 0.35, 160)))
      }
    }
    function nudgeAssistantPresence(mode = "follow", point = null){
      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2
      if(mode === "center"){
        assistantMotionState.pointerBias = "center"
        assistantMotionState.lastInteraction = { x: centerX, y: centerY, at: Date.now() - 900 }
        applyAssistantPairLayout({
          aria: { x: centerX - 116, y: Math.max(152, centerY - 88) },
          jake: { x: centerX + 42, y: Math.min(window.innerHeight - 160, centerY + 34) }
        })
        return
      }
      const x = point?.x ?? centerX
      const y = point?.y ?? centerY
      assistantMotionState.lastInteraction = { x, y, at: Date.now() - 900 }
      moveAssistantPairToInteraction(x, y)
    }
    function triggerAssistantMoment(kind, options = {}){
      if(!shell || shell.hidden) return
      const moment = ASSISTANT_MOMENTS[kind]
      if(!moment) return
      const now = Date.now()
      assistantMotionState.activeMoment = kind
      const point = options.point || {
        x: window.innerWidth / 2,
        y: Math.max(144, window.innerHeight * 0.42)
      }
      assistantMotionState.lastInteraction = { x: point.x, y: point.y, at: now - 1200 }
      setAssistantMomentClasses(moment.mood)
      if(moment.placement === "center"){
        nudgeAssistantPresence("center", point)
      }else if(moment.placement === "shift-right"){
        assistantMotionState.pointerBias = "right"
        applyAssistantPairLayout({
          aria: { x: window.innerWidth - 174, y: Math.max(128, point.y - 58) },
          jake: { x: window.innerWidth - 154, y: Math.min(window.innerHeight - 156, point.y + 74) }
        })
      }else if(moment.placement === "checkout"){
        assistantMotionState.pointerBias = "right"
        moveAssistantPairToInteraction(Math.min(window.innerWidth - 150, point.x + 96), Math.max(144, point.y))
      }else{
        moveAssistantPairToInteraction(point.x, point.y)
      }
      const statusLine = options.status || moment.status
      const bubbleLine = options.line || moment.line
      if(assistantStatus) assistantStatus.textContent = statusLine
      if(options.bubble !== false){
        showSpeechPopup(options.assistantName || "Aria", bubbleLine)
      }
      if(assistantMotionState.momentTimer) clearTimeout(assistantMotionState.momentTimer)
      assistantMotionState.momentTimer = setTimeout(()=>{
        assistantMotionState.activeMoment = "idle"
        setAssistantMomentClasses("idle")
        syncAssistantViewportMotion(true)
      }, options.duration || 3200)
    }
    function registerTapPattern(x, y){
      const side = x < (window.innerWidth * 0.42) ? "left" : x > (window.innerWidth * 0.58) ? "right" : "center"
      const now = Date.now()
      assistantMotionState.recentSideTaps = assistantMotionState.recentSideTaps
        .filter(entry => now - entry.at < 1800)
      assistantMotionState.recentSideTaps.push({ side, at: now, x, y })
      const leftTapBurst = assistantMotionState.recentSideTaps.filter(entry => entry.side === "left")
      if(leftTapBurst.length >= 3){
        triggerAssistantMoment("left_taps", {
          point: { x: Math.max(window.innerWidth * 0.78, 220), y: Math.max(152, y) },
          duration: 3600
        })
        assistantMotionState.recentSideTaps = []
      }
    }
    function getAssistantHelp(route, assistantId){
      const sceneKey = REMOTE_ASSISTANT_HELP[route] ? route : "home"
      const base = REMOTE_ASSISTANT_HELP[sceneKey][assistantId] || REMOTE_ASSISTANT_HELP.home[assistantId]
      if(assistantId !== "projake" || !base) return base
      return {
        ...base,
        greeting: `${base.greeting} ${getJakeCapacityLine(sceneKey)}`,
        listening: `${base.listening} ${getJakeCapacityLine(sceneKey)}`
      }
    }
    function currentAssistantOrb(){
      return state.activeAssistant === "projake" ? assistantJakeOrb : assistantAriaOrb
    }
    function syncAssistantViewportMotion(force = false){
      if(!shell || shell.hidden) return
      if(assistantMotionState.teleportUntil && Date.now() < assistantMotionState.teleportUntil && !force) return
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable))
      const previousScrollY = assistantMotionState.lastScrollY
      const direction = window.scrollY >= previousScrollY ? "down" : "up"
      assistantMotionState.lastScrollY = Math.max(window.scrollY || 0, 0)
      const scrollDelta = Math.abs((window.scrollY || 0) - previousScrollY)
      assistantMotionState.recentVelocity = scrollDelta
      const bucket = Math.floor(progress * 5)
      if(bucket !== assistantMotionState.lastScrollBucket || force){
        assistantMotionState.lastScrollBucket = bucket
        assistantMotionState.driftPhase = (assistantMotionState.driftPhase + 1) % 4
      }
      const routeFocus = getRouteFocusPoint()
      if(routeFocus && (force || scrollDelta > 6)){
        const sideShift = direction === "down" ? 88 : -88
        applyAssistantPairLayout({
          aria: { x: routeFocus.x - 112 + sideShift, y: routeFocus.y - 74 },
          jake: { x: routeFocus.x + 82 + sideShift, y: routeFocus.y + 38 }
        })
        return
      }
      if(scrollDelta > 6 && !force){
        const focusPoint = {
          x: direction === "down"
            ? (assistantMotionState.pointerBias === "left" ? window.innerWidth * 0.62 : window.innerWidth * 0.38)
            : (assistantMotionState.pointerBias === "right" ? window.innerWidth * 0.42 : window.innerWidth * 0.58),
          y: direction === "down" ? window.innerHeight * 0.78 : window.innerHeight * 0.16
        }
        moveAssistantPairToInteraction(focusPoint.x, focusPoint.y)
        return
      }
      const recentInteraction = assistantMotionState.lastInteraction && (Date.now() - assistantMotionState.lastInteraction.at < 2200)
      if(recentInteraction){
        moveAssistantPairToInteraction(assistantMotionState.lastInteraction.x, assistantMotionState.lastInteraction.y)
        return
      }
      applyAssistantPairLayout(buildAssistantScrollLayout(progress, direction))
    }
    function startAssistantRoam(){
      if(assistantMotionState.roamTimer) clearInterval(assistantMotionState.roamTimer)
      assistantMotionState.roamTimer = setInterval(()=>{
        if(!shell || shell.hidden) return
        const recentInteraction = assistantMotionState.lastInteraction && (Date.now() - assistantMotionState.lastInteraction.at < 1600)
        if(recentInteraction) return
        const routeFocus = getRouteFocusPoint()
        if(routeFocus){
          const verticalOffset = assistantMotionState.driftPhase % 2 === 0 ? -54 : 58
          applyAssistantPairLayout({
            aria: { x: routeFocus.x - 124, y: routeFocus.y + verticalOffset },
            jake: { x: routeFocus.x + 118, y: routeFocus.y - verticalOffset }
          })
          assistantMotionState.driftPhase = (assistantMotionState.driftPhase + 1) % 4
          return
        }
        assistantMotionState.driftPhase = (assistantMotionState.driftPhase + 1) % 4
        assistantMotionState.pointerBias = assistantMotionState.pointerBias === "left"
          ? "right"
          : assistantMotionState.pointerBias === "right"
            ? "center"
            : "left"
        const progress = Math.min(1, Math.max(0, (window.scrollY || 0) / Math.max(document.documentElement.scrollHeight - window.innerHeight, 1)))
        const roamPoint = progress > 0.7
          ? { x: assistantMotionState.pointerBias === "left" ? 154 : window.innerWidth - 154, y: window.innerHeight - 176 }
          : progress < 0.22
            ? { x: assistantMotionState.pointerBias === "left" ? 162 : window.innerWidth - 162, y: 154 }
            : { x: assistantMotionState.pointerBias === "left" ? 178 : window.innerWidth - 178, y: window.innerHeight * 0.44 }
        moveAssistantPairToInteraction(roamPoint.x, roamPoint.y)
      }, 2100)
    }
    function handleAssistantHover(node, assistantId){
      if(!node) return
      node.addEventListener("mouseenter", ()=>{
        node.classList.add("hover-wave")
        clearTimeout(assistantHoverTimer)
        assistantHoverTimer = setTimeout(()=>node.classList.remove("hover-wave"), 900)
      })
      node.addEventListener("mouseleave", ()=>node.classList.remove("hover-wave"))
    }
    function getJakeCapacityLine(route){
      const key = JAKE_CAPACITY_MAP[route] ? route : "home"
      const items = JAKE_CAPACITY_MAP[key] || JAKE_CAPACITY_MAP.home
      return `Jake capacity: ${items.join(", ")}.`
    }
    function bindAssistantTrigger(node, assistantId){
      if(!node) return
      let recentTouch = 0
      const handler = async (event)=>{
        if((event?.type === "click" || event?.type === "pointerup") && Date.now() - recentTouch < 420) return
        if(event?.type === "touchend" || event?.type === "pointerup") recentTouch = Date.now()
        event?.preventDefault?.()
        event?.stopPropagation?.()
        await triggerAssistantOrb(assistantId)
      }
      node.addEventListener("click", handler)
      node.addEventListener("pointerup", handler)
      node.addEventListener("touchend", handler, { passive:false })
    }
    function ensureAssistantBootOverlay(){
      let overlay = qs("#assistantBootOverlay")
      if(overlay) return overlay
      overlay = document.createElement("div")
      overlay.id = "assistantBootOverlay"
      overlay.className = "assistant-boot-overlay"
      overlay.innerHTML = `
        <div class="assistant-boot-card">
          <div class="assistant-boot-ring"></div>
          <div class="assistant-boot-ring ring-two"></div>
          <div class="assistant-boot-label">Fresh Brain Loading</div>
          <div class="assistant-boot-number">5</div>
          <div class="assistant-boot-status">SupportRD assistant activation starting.</div>
        </div>
      `
      document.body.appendChild(overlay)
      return overlay
    }
    function showAssistantBootOverlay(assistantName, count){
      const overlay = ensureAssistantBootOverlay()
      overlay.hidden = false
      overlay.classList.add("show")
      overlay.dataset.assistant = assistantName.toLowerCase()
      const label = overlay.querySelector(".assistant-boot-label")
      const number = overlay.querySelector(".assistant-boot-number")
      const status = overlay.querySelector(".assistant-boot-status")
      if(label) label.textContent = `${assistantName} Fresh Brain`
      if(number) number.textContent = String(count)
      if(status) status.textContent = `${assistantName} is syncing to the Remote and loading specialized help.`
    }
    function finishAssistantBootOverlay(assistantName){
      const overlay = ensureAssistantBootOverlay()
      overlay.hidden = false
      overlay.classList.add("show", "ready")
      overlay.dataset.assistant = assistantName.toLowerCase()
      const label = overlay.querySelector(".assistant-boot-label")
      const number = overlay.querySelector(".assistant-boot-number")
      const status = overlay.querySelector(".assistant-boot-status")
      if(label) label.textContent = `${assistantName} Brain Ready`
      if(number) number.textContent = "GO"
      if(status) status.textContent = `${assistantName} is now active for live SupportRD help.`
    }
    function hideAssistantBootOverlay(){
      const overlay = qs("#assistantBootOverlay")
      if(!overlay) return
      overlay.classList.remove("show", "ready")
      overlay.hidden = true
    }
    async function primeAssistantMic(assistantName){
      if(!navigator.mediaDevices?.getUserMedia) return true
      try{
        const stream = await navigator.mediaDevices.getUserMedia({ audio:true })
        try{ stream.getTracks().forEach(track=>track.stop()) }catch{}
        return true
      }catch{
        const msg = `${assistantName} needs mic access before the live speech sequence can start.`
        if(assistantStatus) assistantStatus.textContent = msg
        showSpeechPopup(assistantName, msg)
        try{ openMiniWindow("OPEN YOUR MIC", msg) }catch{}
        return false
      }
    }
    function startAssistantBrainCountdown(assistantName, help, transcriptEl){
      const introLine = `${assistantName} is opening the mic now.`
      nudgeAssistantPresence("center", {
        x: window.innerWidth / 2,
        y: Math.max(164, window.innerHeight * 0.38)
      })
      playAssistantCue("intro")
      try{ speakReply(introLine) }catch{}
      if(assistantStatus) assistantStatus.textContent = introLine
      if(transcriptEl) transcriptEl.textContent = introLine
      showSpeechPopup(assistantName, introLine)
      activeAssistantTimers.push(setTimeout(()=>{
        if(assistantStatus) assistantStatus.textContent = help.greeting
        if(transcriptEl) transcriptEl.textContent = help.greeting
        showSpeechPopup(assistantName, help.greeting)
      }, 260))
      activeAssistantTimers.push(setTimeout(()=>{
        const listeningLine = `${help.listening} The mic is hot now.`
        if(assistantStatus) assistantStatus.textContent = listeningLine
        if(transcriptEl) transcriptEl.textContent = listeningLine
        showSpeechPopup(assistantName, listeningLine)
      }, 720))
      activeAssistantTimers.push(setTimeout(()=>{
        if(typeof window.startAriaListening === "function"){
          window.startAriaListening({ assistantName, thinkDelay: 2700 })
        }else if(typeof startOpenAIListening === "function"){
          startOpenAIListening({ assistantName, thinkDelay: 2700 })
        }else{
          playAssistantCue("response")
          const fallback = `${assistantName} is ready, but this device needs mic support enabled before live listening can begin.`
          if(transcriptEl) transcriptEl.textContent = fallback
          showSpeechPopup(assistantName, fallback)
          activeAssistantTimers.push(setTimeout(()=>{
            playAssistantCue("close")
            releasePageAudio()
            clearAssistantSequence()
          }, 1600))
        }
      }, 980))
    }
    async function triggerAssistantOrb(assistantId){
      const route = remoteState.currentRoute || "home"
      const orb = assistantId === "projake" ? assistantJakeOrb : assistantAriaOrb
      const help = getAssistantHelp(route, assistantId)
      const assistantName = assistantId === "projake" ? "Jake Studio Specialist" : "Aria Hair Advisor"
      const transcriptEl = qs("#ariaTranscript")
      clearAssistantSequence()
      state.activeAssistant = assistantId
      applyAssistantUI(true)
      syncProfile()
      interruptPageAudio()
      const micReady = await primeAssistantMic(assistantName)
      if(!micReady) return
      applyAssistantDemoScene(route, help.greeting)
      moveAssistantNodeToFocus(orb, help.focus)
      moveAssistantNodeToFocus(assistantId === "projake" ? guardianJakeBtn : guardianAriaBtn, help.focus)
      const partnerOrb = assistantId === "projake" ? assistantAriaOrb : assistantJakeOrb
      const partnerGuard = assistantId === "projake" ? guardianAriaBtn : guardianJakeBtn
      const target = help.focus ? qs(help.focus) : null
      const rect = target?.getBoundingClientRect?.()
      if(rect && partnerOrb){
        moveAssistantNodeToPoint(partnerOrb, rect.left + rect.width - 42, rect.top + Math.min(rect.height, 140))
        moveAssistantNodeToPoint(partnerGuard, rect.left + rect.width - 42, rect.top + Math.min(rect.height, 140))
      }
      startAssistantBrainCountdown(assistantName, help, transcriptEl)
      activeAssistantTimers.push(setTimeout(()=>{
        hideAssistantBootOverlay()
        releasePageAudio()
        clearAssistantSequence()
      }, 15000))
    }
    handleAssistantHover(assistantAriaOrb, "aria")
    handleAssistantHover(assistantJakeOrb, "projake")
    handleAssistantHover(guardianAriaBtn, "aria")
    handleAssistantHover(guardianJakeBtn, "projake")
    let assistantScrollGlowTimer = null
    const pulseAssistantPresence = ()=>{
      ;[assistantAriaOrb, assistantJakeOrb, guardianAriaBtn, guardianJakeBtn].forEach(node=>node?.classList.add("hover-wave"))
      clearTimeout(assistantScrollGlowTimer)
      assistantScrollGlowTimer = setTimeout(()=>{
        ;[assistantAriaOrb, assistantJakeOrb, guardianAriaBtn, guardianJakeBtn].forEach(node=>node?.classList.remove("hover-wave"))
      }, 420)
    }
    window.addEventListener("scroll", pulseAssistantPresence, { passive:true })
    document.addEventListener("click", (event)=>{
      if(!shell || shell.hidden) return
      const target = event.target
      if(target && (target.closest?.("#floatAriaBtn") || target.closest?.("#floatJakeBtn") || target.closest?.("#remoteGuardianAria") || target.closest?.("#remoteGuardianJake"))){
        return
      }
      assistantMotionState.lastInteraction = { x: event.clientX + 26, y: event.clientY - 26, at: Date.now() }
      registerTapPattern(event.clientX, event.clientY)
      moveAssistantPairToInteraction(event.clientX + 26, event.clientY - 26)
      if(target?.closest?.("[data-faq-topic], [data-faq-next], [data-open-help-reel]")){
        triggerAssistantMoment("reel_bun", {
          point: { x: Math.max(160, event.clientX), y: Math.max(160, event.clientY - 34) },
          assistantName: "Aria"
        })
      }else if(target?.closest?.("[data-feedback-submit], [data-feedback-sort], [data-feedback-heart], [data-feedback-thumb], [data-open-developer-feedback], [data-family-submit]")){
        triggerAssistantMoment("developer_feed", {
          point: { x: Math.max(170, event.clientX), y: Math.max(170, event.clientY - 28) },
          assistantName: "Jake"
        })
      }else if(target?.closest?.("[data-open-fastpay], [data-open-product-page], [data-pay-product], .product-buy-btn, [data-fastpay-shopify], [data-fastpay-checkout], [data-product-shopify]")){
        triggerAssistantMoment("purchase_checkout", {
          point: { x: Math.min(window.innerWidth - 170, event.clientX + 90), y: Math.max(168, event.clientY) },
          bubble: false,
          duration: 4200
        })
      }else if(target?.closest?.("[data-profile-action=\"scan\"], #startHairScan, [data-aria-scenario-prompt]")){
        const prompt = target?.closest?.("[data-aria-scenario-prompt]")?.getAttribute("data-aria-scenario-prompt") || ""
        const statusLine = /damage|damaged|burn|frizz|oily|color|bounce/i.test(prompt)
          ? "Hair condition scenario detected. Aria and Jake moved into serious scan timing."
          : undefined
        triggerAssistantMoment("analysis_ready", {
          point: { x: window.innerWidth / 2, y: Math.max(180, event.clientY - 18) },
          status: statusLine
        })
      }else if(target?.closest?.("[data-open-panel=\"floatSettingsBox\"], [data-open-diary], [data-diary-submit], [data-diary-schedule], [data-diary-social]")){
        triggerAssistantMoment("diary_schedule", {
          point: { x: window.innerWidth / 2, y: Math.max(178, event.clientY - 24) }
        })
      }else if(target?.closest?.("[data-open-panel], [data-guide-start]")){
        nudgeAssistantPresence("center", { x: event.clientX, y: Math.max(158, event.clientY - 32) })
      }
    }, true)
    document.addEventListener("touchstart", (event)=>{
      const touch = event.touches && event.touches[0]
      if(!touch || !shell || shell.hidden) return
      assistantMotionState.lastInteraction = { x: touch.clientX + 26, y: touch.clientY - 26, at: Date.now() }
      registerTapPattern(touch.clientX, touch.clientY)
      moveAssistantPairToInteraction(touch.clientX + 26, touch.clientY - 26)
    }, { passive:true })
    let lastMouseMoveAt = 0
    document.addEventListener("mousemove", (event)=>{
      if(!shell || shell.hidden) return
      if(Date.now() - lastMouseMoveAt < 900) return
      lastMouseMoveAt = Date.now()
      assistantMotionState.pointerBias = event.clientX < (window.innerWidth / 3)
        ? "left"
        : event.clientX > (window.innerWidth * 0.66)
          ? "right"
          : "center"
      if(Math.abs(event.clientY - (window.innerHeight / 2)) > 110){
        assistantMotionState.lastInteraction = { x: event.clientX, y: event.clientY, at: Date.now() - 1300 }
        syncAssistantViewportMotion(true)
      }
    }, { passive:true })
    document.addEventListener("mouseover", (event)=>{
      if(!shell || shell.hidden) return
      const hoverTarget = event.target?.closest?.("[data-pay-product], .product-buy-btn, [data-open-fastpay], [data-open-product-page], [data-fastpay-shopify], [data-fastpay-checkout], [data-product-shopify], [data-faq-topic], [data-faq-next], [data-open-developer-feedback], [data-feedback-submit], [data-feedback-heart], [data-feedback-thumb]")
      if(!hoverTarget) return
      const rect = hoverTarget.getBoundingClientRect()
      const purchaseLane = hoverTarget.matches?.("[data-pay-product], .product-buy-btn, [data-open-fastpay], [data-open-product-page], [data-fastpay-shopify], [data-fastpay-checkout], [data-product-shopify]")
      triggerAssistantMoment(purchaseLane ? "purchase_hover" : "feed_hover", {
        point: {
          x: rect.left + (rect.width / 2),
          y: rect.top + Math.min(rect.height + 26, 120)
        },
        bubble: purchaseLane,
        duration: purchaseLane ? 2600 : 2200
      })
    }, true)
    window.addEventListener("scroll", ()=>{
      if(assistantMotionState.scrollTicking) return
      assistantMotionState.scrollTicking = true
      requestAnimationFrame(()=>{
        assistantMotionState.scrollTicking = false
        syncAssistantViewportMotion()
      })
    }, { passive:true })
    window.addEventListener("resize", ()=>syncAssistantViewportMotion(true))
    setTimeout(()=>syncAssistantViewportMotion(true), 220)
    startAssistantRoam()
    const REMOTE_ROUTE_META = {
    home: { path: "/remote", title: "SupportRD Remote", description: "SupportRD Remote keeps hair help, profile, studio, maps, and support together in one premium shell." },
    diary: { path: "/remote/diary", title: "SupportRD Diary", description: "Diary Mode is the emotional center for posting, guidance, booth routing, map routing, and payment handoff." },
    studio: { path: "/remote/studio", title: "SupportRD Studio Quick", description: "Studio Quick Panel gives three fast motherboards for recording, importing, trimming, and exporting audio or video." },
    settings: { path: "/remote/settings", title: "SupportRD Configuration", description: "Configuration keeps account, language, push, and social media control inside the SupportRD Remote." },
    map: { path: "/remote/map", title: "SupportRD Map Change", description: "Map Change rotates the Remote into themed views and guided GPS support without leaving the app shell." },
    faq: { path: "/remote/faq", title: "SupportRD FAQ Lounge", description: "FAQ Lounge gives premium help, reel clips, and lightweight assistance in the SupportRD Remote." },
    profile: { path: "/remote/profile", title: "SupportRD Profile", description: "Profile presents the person, image, scan summary, achievements, and social identity inside SupportRD." },
    payments: { path: "/remote/payments", title: "SupportRD Payments", description: "Payments keeps premium checkout, support, and session revenue lanes ready inside the SupportRD Remote." },
    blog: { path: "/remote/blog", title: "SupportRD Blog Party", description: "Blog Party is the fullscreen SEO and authority lane for SupportRD topics, updates, and Google-friendly content." },
    official: { path: "/remote/official", title: "SupportRD Official Info", description: "Official SupportRD info keeps privacy, about, contact, and storefront direction inside the Remote shell." },
    solid: { path: "/remote/solid-state", title: "SupportRD Solid State", description: "Solid State Project shows what is built, what is verified, and what is still awaiting live payment or demand verification." }
  }
  const ARIA_SCENARIOS = {
    roadtrip: {
      assistant: "aria",
      title: "Road Trip Frizz",
      summary: "Long miles, air changes, and dry cabin air can leave hair frizzy and low on bounce.",
      firstMove: "Formula Exclusiva is the first SupportRD move when the hair feels thirsty, puffy, and hard to calm down after a road trip.",
      products: ["Formula Exclusiva", "Gotitas Brillantes", "Mascarilla Capilar"],
      prompt: "I have road trip frizz, low bounce, and dry ends. Walk me through whether I should use Formula Exclusiva, Mascarilla, or Gotitas first and explain why."
    },
    tangles: {
      assistant: "projake",
      title: "Trail Tangles",
      summary: "Trail dust, wind, helmets, and motion can twist the hair into a rough detangle situation.",
      firstMove: "Mascarilla Capilar comes first to soften the hair, then Gotitas Brillantes can finish and protect the detangle.",
      products: ["Mascarilla Capilar", "Gotitas Brillantes"],
      prompt: "My hair is tangled and rough after being outdoors. Help me with a Mascarilla-first detangling routine and tell me if I should finish with Gotitas."
    },
    oily: {
      assistant: "aria",
      title: "Oily + Stressed Ends",
      summary: "When the scalp is active but the ends still feel tired, the app should help balance instead of overloading.",
      firstMove: "Shampoo Aloe Vera is the clean first move, with lighter Gotero Rapido only where the hair still needs support.",
      products: ["Shampoo Aloe Vera", "Gotero Rapido"],
      prompt: "My scalp feels oily but the ends still feel stressed. Tell me how to use Shampoo Aloe Vera and whether Gotero Rapido should be light or focused."
    },
    damage: {
      assistant: "aria",
      title: "Damage Recovery",
      summary: "Weak ends, stress, and visible damage need an emergency-ready recovery lane that still feels calm.",
      firstMove: "Gotero Rapido plus Mascarilla Capilar is the stronger recovery pair when the hair feels weak, damaged, and breakage-prone.",
      products: ["Gotero Rapido", "Mascarilla Capilar"],
      prompt: "My hair feels damaged, weak, and breakage-prone. Give me an emergency-ready recovery lane using Gotero Rapido and Mascarilla."
    },
    sleek: {
      assistant: "projake",
      title: "Sleek / Laciador",
      summary: "Smooth styling needs a cleaner, more disciplined path so the result looks polished instead of overworked.",
      firstMove: "Laciador Crece is the sleek route, but only with moisture balance and heat protection in the rhythm.",
      products: ["Laciador Crece", "Formula Exclusiva"],
      prompt: "I want a smooth sleek look. Tell me how Laciador Crece should be used, what moisture support it needs, and how to protect the hair."
    }
  }
  const FAQ_REEL_TOPICS = {
    growth: {
      label: "Hair Growth",
      clips: ["/static/videos/reel-1.mp4", "/static/videos/reel-2.mp4", "/static/videos/sample-10s.mp4"],
      note: "Growth lane with quick 10-second hair clips."
    },
    care: {
      label: "Hair Care",
      clips: ["/static/videos/reel-3.mp4", "/static/videos/reel-2.mp4", "/static/videos/sample-10s.mp4"],
      note: "Care lane with shine, moisture, and routine clips."
    },
    curly: {
      label: "Curly Hair",
      clips: ["/static/videos/reel-4.mp4", "/static/videos/reel-1.mp4", "/static/videos/sample-10s.mp4"],
      note: "Curly lane with bounce and curl-shape clips."
    },
    scalp: {
      label: "Scalp Care",
      clips: ["/static/videos/reel-6.mp4", "/static/videos/reel-3.mp4", "/static/videos/sample-10s.mp4"],
      note: "Scalp lane with cleanse and reset clips."
    }
  }
  const SUPPORT_FAQ_ENTRIES = [
    {
      category: "Detangle",
      question: "My hair gets tangled fast. What should I do first?",
      answer: "Start with moisture and slip before force. Lightly dampen the hair, apply a detangling leave-in or conditioner, then comb from the ends upward in sections. SupportRD uses this as a Trail Tangles style recovery lane.",
      cta: "Open Hair Help",
      action: "assistant:aria"
    },
    {
      category: "Frizz",
      question: "What should I do for everyday frizz?",
      answer: "SupportRD usually starts with a leave-in, a light sealing product, and less rough handling once the hair is set. The goal is to hold moisture in without making the hair heavy.",
      cta: "Open Product Lane",
      action: "products"
    },
    {
      category: "Scalp",
      question: "How can I tell if my scalp is oily or just full of buildup?",
      answer: "If the scalp feels slick fast and the roots get weighed down quickly, it is often oil plus buildup together. A weekly clarify, lighter root products, and better balance through the ends usually helps.",
      cta: "Open FAQ Reel",
      action: "faqreel"
    },
    {
      category: "Damage",
      question: "What should I do if my hair feels heat damaged?",
      answer: "Treat it like a recovery lane. Pause heavy heat, protect every styling session, trim weak ends when needed, and use a repair-focused routine instead of forcing styling through damaged strands.",
      cta: "Open Hair Scan",
      action: "profile"
    },
    {
      category: "Bounce",
      question: "My curls lost bounce. Can SupportRD help?",
      answer: "Yes. Lost bounce usually means your routine needs a better balance of moisture, protein, and lighter styling weight. SupportRD can route you toward bounce recovery instead of flattening the pattern further.",
      cta: "Ask Aria",
      action: "assistant:aria"
    },
    {
      category: "Color Care",
      question: "How do I keep color-treated hair from fading so fast?",
      answer: "Use color-safe cleansing, cooler rinses, less stripping heat, and shine-support products. SupportRD treats color fade like both a care problem and a product-matching problem.",
      cta: "Open Product Lane",
      action: "products"
    },
    {
      category: "Authority",
      question: "Does SupportRD actually help with real hair problems?",
      answer: "Yes. SupportRD is built to guide real issue lanes like dryness, frizz, oily scalp, tangles, breakage, color fade, scalp care, and low bounce. The app helps people understand the problem, match the right route, and move into product support or premium guidance without getting lost.",
      cta: "Open Hair Help",
      action: "assistant:aria"
    },
    {
      category: "Product Backing",
      question: "What is product support versus premium app guidance?",
      answer: "Product support is the physical hair-help side: what to use, why it fits, and what hair problem it addresses. Premium guidance is the digital side: memory, deeper advice, premium Aria/Jake behavior, and route-specific help inside the app.",
      cta: "Open Payments",
      action: "payments"
    },
    {
      category: "Premium",
      question: "Do I need to log in before buying premium?",
      answer: "Yes for premium and paid product lanes. SupportRD keeps browsing easy, but purchase-based features need sign-in so access, upgrades, and continuity stay attached to the right account.",
      cta: "Open Payments",
      action: "payments"
    },
    {
      category: "Assistants",
      question: "What is the difference between Aria and Jake?",
      answer: "Aria is the main hair advisor and issue-solving voice. Jake is the studio specialist and supportive second brain. Both know SupportRD, but Aria leans more hair-first while Jake leans more studio-first.",
      cta: "Open Studio",
      action: "studio"
    },
    {
      category: "Hair Scan",
      question: "How do I use the hair analyzer in Profile?",
      answer: "Open Profile, upload or capture your image, and run the scan. SupportRD uses that to surface likely issues like dryness, frizz, damage, low bounce, or color fatigue so you can choose the right next lane.",
      cta: "Open Profile",
      action: "profile"
    },
    {
      category: "Support Hub",
      question: "What is FAQ Lounge for?",
      answer: "FAQ Lounge is the calm fast-help lane. It gives visitors real hair answers, TV Reel access, product direction, and public feedback in one place without kicking them out of the Remote flow.",
      cta: "Open Developer Feed",
      action: "developer"
    }
  ]
  function renderSupportFaqCards(){
    return SUPPORT_FAQ_ENTRIES.map((entry)=>`
      <article class="float-faq-item" data-faq-card="${escapeRemoteHtml(entry.category || "SupportRD FAQ")}">
        <div class="float-faq-topline">
          <span class="float-faq-badge">${escapeRemoteHtml(entry.category || "SupportRD FAQ")}</span>
        </div>
        <strong>${escapeRemoteHtml(entry.question)}</strong>
        <span>${escapeRemoteHtml(entry.answer)}</span>
        ${entry.cta ? `<button class="btn ghost float-faq-cta" type="button" data-faq-action="${escapeRemoteHtml(entry.action || "")}">${escapeRemoteHtml(entry.cta)}</button>` : ""}
      </article>
    `).join("")
  }
  function renderQuickStudioWaveBars(board, index){
    const seed = `${board.fileName || board.name || "board"}-${board.kind || "empty"}-${index}`
    return Array.from({ length: 24 }, (_, waveIndex)=>{
      const code = seed.charCodeAt(waveIndex % seed.length || 0) || 68
      const height = board.kind === "empty"
        ? 14 + ((waveIndex * 5 + (index + 1) * 9) % 22)
        : 24 + ((code + waveIndex * 7) % 58)
      return `<span style="height:${height}px"></span>`
    }).join("")
  }
  function renderQuickStudioBoardDeck(){
    return remoteState.boards.map((board, index)=>{
      const current = board || emptyBoard(index)
      const isActive = index === remoteState.activeBoard
      const kindLabel = current.kind === "video" ? "MP4 / Video" : current.kind === "audio" ? "MP3 / M4A / Audio" : "Fresh Board"
      const detail = current.kind === "empty"
        ? "Ready for a new voice take, beat layer, or imported file."
        : `${current.fileName || "Live take loaded"} · ${current.highlighted ? `Highlight ${current.trimStart}% → ${current.trimEnd}%` : "No highlight locked yet."}`
      return `
        <button class="float-studio-board-card${isActive ? " active" : ""}" type="button" data-open-studio-board="${index + 1}">
          <div class="float-studio-board-head">
            <strong>${escapeRemoteHtml(current.name || `Motherboard ${index + 1}`)}</strong>
            <span>${escapeRemoteHtml(kindLabel)}</span>
          </div>
          <div class="float-studio-wave-row">${renderQuickStudioWaveBars(current, index)}</div>
          <small>${escapeRemoteHtml(detail)}</small>
        </button>
      `
    }).join("")
  }
  function renderQuickStudioFxControls(){
    const board = getBoard()
    const instrument = escapeRemoteHtml(board.instrument || "voice")
    const fxPreset = escapeRemoteHtml(board.fxPreset || "clean")
    const gigFilter = escapeRemoteHtml(board.gigFilter || "natural")
    const gigPan = escapeRemoteHtml(board.gigPan || "standard")
    const gigFrameRate = escapeRemoteHtml(board.gigFrameRate || "24")
    const gigZoom = escapeRemoteHtml(board.gigZoom || "1x")
    const gigSlowMotion = escapeRemoteHtml(board.gigSlowMotion || "off")
    const disabled = board.kind === "empty" ? " disabled" : ""
    return `
      <div class="float-studio-fx-card">
        <strong>FX Menu Settings</strong>
        <span>${board.kind === "empty" ? "Load or record material first, then tune the active motherboard." : `${escapeRemoteHtml(board.name)} is ready for instrument, FX, and gig settings.`}</span>
        <div class="float-sheet-grid two compact">
          <label class="float-select-card">
            <span>Instrument</span>
            <select class="input" data-quick-studio-setting="instrument"${disabled}>
              <option value="voice"${board.instrument === "voice" || !board.instrument ? " selected" : ""}>Voice / Mic</option>
              <option value="guitar"${board.instrument === "guitar" ? " selected" : ""}>Guitar</option>
              <option value="drums"${board.instrument === "drums" ? " selected" : ""}>Drums</option>
              <option value="keys"${board.instrument === "keys" ? " selected" : ""}>Keys / Piano</option>
              <option value="bass"${board.instrument === "bass" ? " selected" : ""}>Bass</option>
            </select>
          </label>
          <label class="float-select-card">
            <span>FX Preset</span>
            <select class="input" data-quick-studio-setting="fx"${disabled}>
              <option value="clean"${board.fxPreset === "clean" || !board.fxPreset ? " selected" : ""}>FX Clean</option>
              <option value="warm"${board.fxPreset === "warm" ? " selected" : ""}>FX Warm</option>
              <option value="arena"${board.fxPreset === "arena" ? " selected" : ""}>FX Arena</option>
              <option value="vinyl"${board.fxPreset === "vinyl" ? " selected" : ""}>FX Vinyl</option>
              <option value="bright"${board.fxPreset === "bright" ? " selected" : ""}>FX Bright</option>
            </select>
          </label>
        </div>
        <div class="float-sheet-grid three compact">
          <label class="float-select-card">
            <span>Filter</span>
            <select class="input" data-quick-studio-setting="gigFilter"${disabled}>
              <option value="natural"${board.gigFilter === "natural" || !board.gigFilter ? " selected" : ""}>Natural</option>
              <option value="cinema"${board.gigFilter === "cinema" ? " selected" : ""}>Cinema</option>
              <option value="vivid"${board.gigFilter === "vivid" ? " selected" : ""}>Vivid</option>
              <option value="mono"${board.gigFilter === "mono" ? " selected" : ""}>Mono</option>
            </select>
          </label>
          <label class="float-select-card">
            <span>Panoramic</span>
            <select class="input" data-quick-studio-setting="gigPan"${disabled}>
              <option value="standard"${board.gigPan === "standard" || !board.gigPan ? " selected" : ""}>Standard</option>
              <option value="wide"${board.gigPan === "wide" ? " selected" : ""}>Wide</option>
              <option value="ultra"${board.gigPan === "ultra" ? " selected" : ""}>Ultra Wide</option>
            </select>
          </label>
          <label class="float-select-card">
            <span>Frame Rate</span>
            <select class="input" data-quick-studio-setting="gigFrameRate"${disabled}>
              <option value="24"${board.gigFrameRate === "24" || !board.gigFrameRate ? " selected" : ""}>24 FPS</option>
              <option value="30"${board.gigFrameRate === "30" ? " selected" : ""}>30 FPS</option>
              <option value="60"${board.gigFrameRate === "60" ? " selected" : ""}>60 FPS</option>
              <option value="120"${board.gigFrameRate === "120" ? " selected" : ""}>120 FPS</option>
            </select>
          </label>
          <label class="float-select-card">
            <span>Zoom</span>
            <select class="input" data-quick-studio-setting="gigZoom"${disabled}>
              <option value="1x"${board.gigZoom === "1x" || !board.gigZoom ? " selected" : ""}>1x</option>
              <option value="1.5x"${board.gigZoom === "1.5x" ? " selected" : ""}>1.5x</option>
              <option value="2x"${board.gigZoom === "2x" ? " selected" : ""}>2x</option>
              <option value="3x"${board.gigZoom === "3x" ? " selected" : ""}>3x</option>
            </select>
          </label>
          <label class="float-select-card">
            <span>Slow Motion</span>
            <select class="input" data-quick-studio-setting="gigSlowMotion"${disabled}>
              <option value="off"${board.gigSlowMotion === "off" || !board.gigSlowMotion ? " selected" : ""}>Off</option>
              <option value="2x"${board.gigSlowMotion === "2x" ? " selected" : ""}>2x</option>
              <option value="4x"${board.gigSlowMotion === "4x" ? " selected" : ""}>4x</option>
              <option value="8x"${board.gigSlowMotion === "8x" ? " selected" : ""}>8x</option>
            </select>
          </label>
        </div>
        <div class="float-sheet-status">Active settings: ${instrument} · ${fxPreset} · ${gigFilter} filter · ${gigPan} panoramic · ${gigFrameRate} FPS · ${gigZoom} zoom · ${gigSlowMotion} slow motion.</div>
      </div>
    `
  }
  function renderQuickStudioVideoStatus(){
    const board = getBoard()
    const label = board.kind === "video"
      ? `${board.fileName || "Video clip"} is loaded with ${board.gigFilter || "natural"} filter, ${board.gigFrameRate || "24"} FPS, ${board.gigZoom || "1x"} zoom, and ${board.gigSlowMotion || "off"} slow motion.`
      : "MP4 display view is ready. Import an MP4 and SupportRD will preview visuals while you build the motherboard."
    return `
      <div class="float-studio-video-card">
        <strong>MP4 Display View</strong>
        <span>${escapeRemoteHtml(label)}</span>
      </div>
    `
  }
  function syncQuickStudioSheet(){
    if(!remoteSheetBody || remoteState.currentRoute !== "studio") return
    const deck = remoteSheetBody.querySelector("[data-quick-studio-deck]")
    if(deck) deck.innerHTML = renderQuickStudioBoardDeck()
    const videoCard = remoteSheetBody.querySelector("[data-quick-studio-video]")
    if(videoCard) videoCard.innerHTML = renderQuickStudioVideoStatus()
    const fxCard = remoteSheetBody.querySelector("[data-quick-studio-fx]")
    if(fxCard) fxCard.innerHTML = renderQuickStudioFxControls()
    const status = remoteSheetBody.querySelector("[data-quick-studio-status]")
    const board = getBoard()
    if(status){
      status.textContent = board.kind === "empty"
        ? "Quick Studio is ready for a fresh recording, MP3 / MP4 import, or live beat layer."
        : `${board.name} is live with ${board.fileName || board.kind}. Press play, rewind, FX, or export to keep building.`
    }
  }
  function triggerQuickStudioAction(action){
    focusFloatSection("floatBoardsBox", "Studio Quick Panel is ready for your current music/video piece.")
    const actionMap = {
      back: ()=>prevBtn?.click(),
      rewind: ()=>rewindBtn?.click(),
      pause: ()=>pauseBtn?.click(),
      play: ()=>playBtn?.click(),
      record: ()=>startVoiceRecord("voice"),
      forward: ()=>nextBtn?.click(),
      fastforward: ()=>fastForwardBtn?.click(),
      upload: ()=>uploadInput?.click(),
      fx: ()=>{
        if(getBoard().kind === "empty"){
          openMiniWindow("FX Change", "Load or record something first so the FX menu has real material to shape.")
          return
        }
        fxBtn?.click()
      },
      export: ()=>exportSocialBtn?.click(),
      instrument: ()=>startVoiceRecord("instrument"),
      fresh: ()=>freshBoardsBtn?.click()
    }
    actionMap[action]?.()
    setRemoteStatus(`${action.replace(/\b\w/g, m=>m.toUpperCase())} is live from the quick studio lane.`)
    setTimeout(syncQuickStudioSheet, 80)
  }
  const DEVELOPER_FEEDBACK_ENTRIES = [
    {
      name: "Trail User",
      title: "Remote stayed clear on the move",
      comment: "The button routing finally feels direct and easy to trust when I am moving fast.",
      hearts: 96,
      thumbs: 41,
      cash: 24
    },
    {
      name: "Hair Routine Fan",
      title: "FAQ lounge feels useful",
      comment: "The hair clips, product path, and quick help make the app feel alive instead of stiff.",
      hearts: 121,
      thumbs: 55,
      cash: 18
    },
    {
      name: "Founder Supporter",
      title: "Premium shell feels real",
      comment: "This finally feels like one premium app instead of a stack of disconnected pages.",
      hearts: 184,
      thumbs: 73,
      cash: 52
    },
    {
      name: "Studio Viewer",
      title: "Studio route makes sense now",
      comment: "I like being able to jump to the studio page without getting lost in another panel first.",
      hearts: 88,
      thumbs: 47,
      cash: 11
    }
  ]
  const PUBLIC_REVIEW_ENTRIES = [
    {
      author: "Verified SupportRD Viewer",
      title: "Hair help feels direct",
      body: "I like that the app gets me to the right place fast without making me guess what button to hit."
    },
    {
      author: "Premium Supporter",
      title: "The page feels polished",
      body: "The Remote on top and the full page opening below it makes the whole app feel premium and easy to trust."
    },
    {
      author: "Returning Customer",
      title: "FAQ finally feels alive",
      body: "The hair clips, reviews, and support energy make the app feel active instead of static."
    }
  ]
  const ACQUISITION_STORAGE_KEY = "supportrdAcquisitionEngine"
  const ACQUISITION_VISITOR_KEY = "supportrdAcquisitionVisitor"
  const ACQUISITION_LANES = {
    issues: "Deal With Issues Hair",
    products: "Buy Products For Hair Solutions",
    app: "All In One Hair Solutions App",
    ai: "AI Features For Hair Problems",
    family: "Family + Care For Hair Health",
    tourism: "Directions + Tourism"
  }
  const ACQUISITION_STAGES = ["arrived", "watching", "exploring", "feedback-ready", "premium-curious", "purchase-ready"]
  const ACQUISITION_WINDOW_OPPORTUNITIES = [
    { key:"retired_math_teacher", lane:ACQUISITION_LANES.issues, stage:"arrived", title:"Tangly Hair Search", trigger:["google","tangle","math","teacher"], source:"Google hair question", copy:"SupportRD thinks you may be looking for a calmer detangle routine with less guesswork.", cta:"Open Trail Tangles", action:"scenario:tangles", adTitle:"Start The Tangly Hair Journey", adCopy:"A calm route for tangles, detangling, and a gentler wash day." },
    { key:"styling_reel_gotero", lane:ACQUISITION_LANES.products, stage:"watching", title:"Styling Reel Interest", trigger:["reel","style","gotero","laciador"], source:"TV Reel styling signal", copy:"This styling lane pairs well with Gotero Rapido or Laciador Crece.", cta:"Open Product Page", action:"products", adTitle:"See The Styling Match", adCopy:"Watch 10 seconds, then move into the right styling product lane." },
    { key:"tiktok_ai_buddy", lane:ACQUISITION_LANES.ai, stage:"watching", title:"AI Hair Buddy Curiosity", trigger:["tiktok","social","ai","buddy"], source:"TikTok / social curiosity", copy:"A quick Aria conversation is usually the best first move for this kind of visitor.", cta:"Ask Aria Now", action:"assistant:aria", adTitle:"Meet Aria Fast", adCopy:"One question can open the whole SupportRD hair lane." },
    { key:"major_brand_backlink", lane:ACQUISITION_LANES.products, stage:"exploring", title:"Brand Crossover Visitor", trigger:["backlink","brand","major"], source:"Backlink crossover", copy:"SupportRD wants to remind them there is a Caribbean all-natural other choice too.", cta:"Open FAQ Lounge", action:"faq", adTitle:"Caribbean Other Choice", adCopy:"Try the natural comparison lane before locking into the old routine." },
    { key:"frizz_search", lane:ACQUISITION_LANES.issues, stage:"arrived", title:"Frizz Search", trigger:["frizz","humidity","puff"], source:"Google/Bing frizz terms", copy:"SupportRD can begin with a frizz-first routine and a cleaner product fit.", cta:"Open Road Trip Frizz", action:"scenario:roadtrip", adTitle:"Fight The Frizz", adCopy:"Bring frizz visitors into the issue lane before premium." },
    { key:"oily_scalp_search", lane:ACQUISITION_LANES.issues, stage:"arrived", title:"Oily Scalp Search", trigger:["oily","greasy","scalp"], source:"Hair issue search", copy:"A scalp-balance lane is usually a stronger first step than a hard product pitch.", cta:"Open Oily Scenario", action:"scenario:oily", adTitle:"Balance The Scalp", adCopy:"Catch oily-root visitors with a lighter, smarter start." },
    { key:"damage_alert", lane:ACQUISITION_LANES.ai, stage:"exploring", title:"Damage Alert", trigger:["damage","burn","breakage","chemical"], source:"Hair damage urgency", copy:"This looks like a serious recovery lane, not a casual browse.", cta:"Open Hair Scan", action:"profile", adTitle:"Start Serious Hair Help", adCopy:"Bring urgent damage visitors into scan-first guidance." },
    { key:"low_bounce", lane:ACQUISITION_LANES.issues, stage:"exploring", title:"Low Bounce Search", trigger:["bounce","flat","volume"], source:"Bounce/body topic", copy:"SupportRD can guide a no-bounce visitor toward movement, body, and healthier shape.", cta:"Ask Aria About Bounce", action:"assistant:aria", adTitle:"Bring Back The Bounce", adCopy:"Movement-first help for hair that feels flat or tired." },
    { key:"color_loss", lane:ACQUISITION_LANES.products, stage:"exploring", title:"Color Loss Search", trigger:["color","shine","fade","fading"], source:"Color maintenance topic", copy:"This visitor is usually ready for a color-preserving support lane.", cta:"Open Product Page", action:"products", adTitle:"Color + Shine Support", adCopy:"Keep color visitors moving toward shine and care instead of drift." },
    { key:"family_hair", lane:ACQUISITION_LANES.family, stage:"exploring", title:"Family Hair Care", trigger:["family","kids","routine","schedule"], source:"Family routine signal", copy:"SupportRD can help the whole household stay on one calmer routine.", cta:"Open Diary Mode", action:"diary", adTitle:"Family Hair Health", adCopy:"A family-focused lane for routine, care, and health of the hair." },
    { key:"creator_studio", lane:ACQUISITION_LANES.app, stage:"watching", title:"Creator / Studio Visitor", trigger:["studio","record","beat","voice","audio"], source:"Studio curiosity", copy:"This person should see the studio first while hair support stays nearby.", cta:"Open Studio Quick Panel", action:"studio", adTitle:"Create In SupportRD", adCopy:"Pull creators into Studio Quick without losing the hair lane." },
    { key:"profile_scan", lane:ACQUISITION_LANES.ai, stage:"watching", title:"Profile Hair Scan Visitor", trigger:["profile","scan","image","photo"], source:"Profile / image behavior", copy:"SupportRD sees a scan-ready visitor who may want to upload before they buy.", cta:"Open Profile", action:"profile", adTitle:"See Your Hair First", adCopy:"Profile and scan can do the first real work here." },
    { key:"social_proof", lane:ACQUISITION_LANES.app, stage:"feedback-ready", title:"Social Proof Visitor", trigger:["review","feedback","faq","proof"], source:"Trust-seeking behavior", copy:"This visitor wants to see proof, community, and real reactions before moving on.", cta:"Open Developer Feedback", action:"developer", adTitle:"See What People Love", adCopy:"Bring trust-seekers into FAQ Lounge and Developer Feedback first." },
    { key:"premium_curious", lane:ACQUISITION_LANES.products, stage:"premium-curious", title:"Premium Curious Visitor", trigger:["premium","upgrade","pro","subscription"], source:"Premium timing signal", copy:"SupportRD should show the premium lane gently, not constantly.", cta:"Open Payments", action:"payments", adTitle:"Premium When It Fits", adCopy:"Let premium appear at the right time, not every time." },
    { key:"tourism_route", lane:ACQUISITION_LANES.tourism, stage:"watching", title:"Tourism / Route Visitor", trigger:["tourism","route","gps","travel","kito","villa gonzalez","santiago"], source:"Map / directions behavior", copy:"This visitor should see route guidance plus hair help nearby.", cta:"Guide To Kito's House", action:"kito", adTitle:"Directions + Hair Help", adCopy:"Show the route and keep SupportRD hair help close by." },
    { key:"chinese_style_bun", lane:ACQUISITION_LANES.issues, stage:"watching", title:"Style Trend Visitor", trigger:["chinese","bun","style","ancient"], source:"Style-trend signal", copy:"SupportRD is seeing a style-first visitor who may still need care guidance.", cta:"Open TV Reel", action:"faqreel", adTitle:"Style + Care Match", adCopy:"Let style reels lead into the right care lane." },
    { key:"natural_visitor", lane:ACQUISITION_LANES.products, stage:"exploring", title:"Natural Product Visitor", trigger:["natural","caribbean","botanical","all natural"], source:"Natural-ingredients search", copy:"A Caribbean natural route may fit them better than a major-brand repeat.", cta:"Open Product Page", action:"products", adTitle:"Natural Other Choice", adCopy:"Catch natural visitors with a cleaner product story." },
    { key:"returning_no_buy", lane:ACQUISITION_LANES.products, stage:"premium-curious", title:"Returning Visitor", trigger:["returning","repeat","came back"], source:"Repeat-visit pattern", copy:"SupportRD can bring them back into the exact lane they almost finished.", cta:"Continue Product Lane", action:"products", adTitle:"Welcome Back To Your Lane", adCopy:"A soft return ad for someone who looked but did not finish." },
    { key:"developer_tech", lane:ACQUISITION_LANES.app, stage:"watching", title:"Developer / Tech Visitor", trigger:["developer","tech","ai app","codex"], source:"Tech curiosity", copy:"This person may want to see how the whole Remote works as a product.", cta:"Open Live Guidance", action:"guide", adTitle:"See The Remote Work", adCopy:"Tech visitors should see the system, not just the sales pitch." },
    { key:"emergency_help", lane:ACQUISITION_LANES.ai, stage:"exploring", title:"Emergency Hair Help", trigger:["emergency","urgent","help now","severe"], source:"High-urgency support signal", copy:"This is a serious support moment. SupportRD should take them straight into the hair-help lane.", cta:"Start Hair Help", action:"assistant:aria", adTitle:"Emergency Hair Support", adCopy:"Urgent hair help should cut straight into Aria and scan guidance." }
  ]
  function getDefaultAcquisitionStats(){
    return {
      totalSignals: 0,
      latestGuestPost: "Hair-trend signal waiting for feature reply",
      latestGuestSource: "SEO engine watch",
      latestReelTopic: "10-second hair reel rotation active",
      latestReelSource: "TV Reel",
      latestSocialFeedback: "Developer Feed is waiting for fresh live reactions.",
      latestLane: "AI Features For Hair Problems",
      latestStage: "arrived",
      lanes: Object.fromEntries(Object.values(ACQUISITION_LANES).map(label=>[label, 0])),
      stages: Object.fromEntries(ACQUISITION_STAGES.map(label=>[label, 0])),
      signals: []
    }
  }
  function loadAcquisitionStats(){
    try{
      const parsed = JSON.parse(localStorage.getItem(ACQUISITION_STORAGE_KEY) || "null")
      if(parsed && typeof parsed === "object"){
        const base = getDefaultAcquisitionStats()
        return {
          ...base,
          ...parsed,
          lanes: { ...base.lanes, ...(parsed.lanes || {}) },
          stages: { ...base.stages, ...(parsed.stages || {}) },
          signals: Array.isArray(parsed.signals) ? parsed.signals : []
        }
      }
    }catch{}
    return getDefaultAcquisitionStats()
  }
  function saveAcquisitionStats(stats){
    try{
      localStorage.setItem(ACQUISITION_STORAGE_KEY, JSON.stringify({
        ...stats,
        signals: Array.isArray(stats.signals) ? stats.signals.slice(0, 24) : []
      }))
    }catch{}
  }
  function rankAcquisitionEntries(entries = {}, count = 3){
    return Object.entries(entries).sort((a,b)=>Number(b[1] || 0) - Number(a[1] || 0)).slice(0, count)
  }
  function mapSignalToLane(signalKey = ""){
    const key = String(signalKey || "").toLowerCase()
    if(/scan|damage|frizz|oily|color|bounce|hair/.test(key)) return ACQUISITION_LANES.ai
    if(/product|buy|checkout|payment|premium/.test(key)) return ACQUISITION_LANES.products
    if(/reel|faq|feedback|blog|developer/.test(key)) return ACQUISITION_LANES.app
    if(/diary|profile|family|routine/.test(key)) return ACQUISITION_LANES.family
    if(/map|route|gps|tourism|kito/.test(key)) return ACQUISITION_LANES.tourism
    return ACQUISITION_LANES.issues
  }
  function mapSignalToStage(signalKey = ""){
    const key = String(signalKey || "").toLowerCase()
    if(/checkout|purchase|pay/.test(key)) return "purchase-ready"
    if(/premium|product|compare|details/.test(key)) return "premium-curious"
    if(/feedback|review|heart|thumb/.test(key)) return "feedback-ready"
    if(/reel|watch|blog|faq|route|open/.test(key)) return "watching"
    if(/scan|studio|profile|diary|settings/.test(key)) return "exploring"
    return "arrived"
  }
  function trackAcquisitionSignal(signalKey, meta = {}){
    const stats = loadAcquisitionStats()
    const lane = meta.lane || mapSignalToLane(signalKey)
    const stage = meta.stage || mapSignalToStage(signalKey)
    stats.totalSignals += 1
    stats.latestLane = lane
    stats.latestStage = stage
    stats.lanes[lane] = Number(stats.lanes[lane] || 0) + 1
    stats.stages[stage] = Number(stats.stages[stage] || 0) + 1
    if(meta.guestPost) stats.latestGuestPost = meta.guestPost
    if(meta.guestSource) stats.latestGuestSource = meta.guestSource
    if(meta.reelTopic) stats.latestReelTopic = meta.reelTopic
    if(meta.reelSource) stats.latestReelSource = meta.reelSource
    if(meta.socialFeedback) stats.latestSocialFeedback = meta.socialFeedback
    stats.signals.unshift({
      signal: signalKey,
      lane,
      stage,
      at: Date.now(),
      note: meta.note || ""
    })
    saveAcquisitionStats(stats)
    renderLatestSupportAds()
    return stats
  }
  function buildLatestSupportAds(){
    const stats = loadAcquisitionStats()
    const visitor = readAcquisitionVisitor()
    if(visitor?.primary && visitor?.secondary){
      return [
        {
          title: visitor.primary.adTitle || visitor.primary.title,
          copy: visitor.primary.adCopy || visitor.primary.copy
        },
        {
          title: visitor.secondary.adTitle || visitor.secondary.title,
          copy: visitor.secondary.adCopy || visitor.secondary.copy
        }
      ]
    }
    const topLanes = rankAcquisitionEntries(stats.lanes, 2)
    return [
      {
        title: topLanes[0] ? `${topLanes[0][0]} Ad` : "Hair Analyzer Lane",
        copy: stats.latestReelTopic || "Short reel in front. Deep analysis and route sorting in the background."
      },
      {
        title: topLanes[1] ? `${topLanes[1][0]} Ad` : "Everyday Hair Help",
        copy: stats.latestSocialFeedback || "Catch frizz, oil, damage, and color-loss visitors with the right lane before premium."
      }
    ]
  }
  function buildAcquisitionSignalText(){
    const params = new URLSearchParams(window.location.search || "")
    const ref = (document.referrer || "").toLowerCase()
    const path = String(location.pathname || "").toLowerCase()
    const adTags = [params.get("utm_source"), params.get("utm_campaign"), params.get("utm_medium"), params.get("utm_term")]
      .filter(Boolean)
      .join(" ")
    const latestSignals = (loadAcquisitionStats().signals || []).slice(0, 8).map(entry=>`${entry.signal} ${entry.lane} ${entry.stage}`).join(" ")
    return [
      ref,
      path,
      adTags,
      latestSignals,
      localStorage.getItem("supportrdDiaryDraft") || "",
      localStorage.getItem("supportrd_remote_receipt") || "",
      document.body.className || ""
    ].join(" ").toLowerCase()
  }
  function scoreAcquisitionOpportunity(opportunity, signalText){
    const triggerHits = (opportunity.trigger || []).reduce((count, key)=>count + (signalText.includes(String(key).toLowerCase()) ? 1 : 0), 0)
    return triggerHits
  }
  function evaluateAcquisitionVisitor(){
    const signalText = buildAcquisitionSignalText()
    const scored = ACQUISITION_WINDOW_OPPORTUNITIES
      .map(item=>({ ...item, score: scoreAcquisitionOpportunity(item, signalText) }))
      .sort((a,b)=>b.score - a.score)
    const primary = scored[0]?.score > 0 ? scored[0] : ACQUISITION_WINDOW_OPPORTUNITIES[0]
    const secondary = scored[1]?.score > 0 ? scored[1] : ACQUISITION_WINDOW_OPPORTUNITIES[2]
    const visitor = {
      signalText,
      primary,
      secondary,
      at: Date.now(),
      sourceSummary: primary?.source || "SupportRD live route",
      why: primary?.copy || "SupportRD is routing this visitor toward the clearest hair-help lane."
    }
    try{ localStorage.setItem(ACQUISITION_VISITOR_KEY, JSON.stringify(visitor)) }catch{}
    return visitor
  }
  function readAcquisitionVisitor(){
    try{
      const parsed = JSON.parse(localStorage.getItem(ACQUISITION_VISITOR_KEY) || "null")
      if(parsed && typeof parsed === "object") return parsed
    }catch{}
    return evaluateAcquisitionVisitor()
  }
  function runAcquisitionAction(action){
    if(!action) return
    if(action === "products"){
      qs("#remotePurchaseProducts")?.click()
      return
    }
    if(action === "payments"){
      qs("#floatFooterPayments")?.click()
      return
    }
    if(action === "guide"){
      qs("#floatFooterGuide")?.click()
      return
    }
    if(action === "faq"){
      if(typeof renderRemoteRoute === "function") renderRemoteRoute("faq", { openShell:true })
      return
    }
    if(action === "developer"){
      if(typeof openRemoteSheet === "function"){
        openRemoteSheet("Developer Feedback", buildDeveloperFeedbackSheet(), { message:"Developer Feedback is open from the Acquisition Window.", route:"faq" })
      }
      return
    }
    if(action === "faqreel"){
      if(typeof renderRemoteRoute === "function") renderRemoteRoute("faq", { openShell:true })
      setTimeout(()=>qs("[data-open-faq-reel]")?.click(), 160)
      return
    }
    if(action === "profile"){
      if(typeof renderRemoteRoute === "function") renderRemoteRoute("profile", { openShell:true })
      return
    }
    if(action === "diary"){
      if(typeof renderRemoteRoute === "function") renderRemoteRoute("diary", { openShell:true })
      return
    }
    if(action === "studio"){
      if(typeof renderRemoteRoute === "function") renderRemoteRoute("studio", { openShell:true })
      return
    }
    if(action === "kito"){
      if(typeof openKitoGpsLane === "function") openKitoGpsLane()
      return
    }
    if(action?.startsWith("assistant:")){
      const assistantId = action.split(":")[1] === "jake" ? "projake" : "aria"
      state.activeAssistant = assistantId
      const trigger = assistantId === "projake" ? qs("#floatJakeBtn") : qs("#floatAriaBtn")
      trigger?.click()
      return
    }
    if(action?.startsWith("scenario:")){
      const key = action.split(":")[1]
      if(typeof renderRemoteRoute === "function") renderRemoteRoute("home", { openShell:true })
      setTimeout(()=>qs(`[data-aria-scenario="${key}"]`)?.click(), 180)
    }
  }
  function renderAcquisitionWindow(){
    const visitor = evaluateAcquisitionVisitor()
    const title = qs("#acquisitionWindowTitle")
    const why = qs("#acquisitionWindowWhy")
    const source = qs("#acquisitionWindowSource")
    const lane = qs("#acquisitionWindowLane")
    const adTitle = qs("#acquisitionWindowAdTitle")
    const adCopy = qs("#acquisitionWindowAdCopy")
    const nextBtn = qs("#acquisitionWindowPrimary")
    const secondBtn = qs("#acquisitionWindowSecondary")
    if(title) title.textContent = visitor.primary.title
    if(why) why.textContent = visitor.why
    if(source) source.textContent = visitor.sourceSummary
    if(lane) lane.textContent = visitor.primary.lane
    if(adTitle) adTitle.textContent = visitor.primary.adTitle
    if(adCopy) adCopy.textContent = visitor.primary.adCopy
    if(nextBtn){
      nextBtn.textContent = visitor.primary.cta
      nextBtn.onclick = ()=>runAcquisitionAction(visitor.primary.action)
    }
    if(secondBtn){
      secondBtn.textContent = visitor.secondary?.cta || "Keep Exploring"
      secondBtn.onclick = ()=>runAcquisitionAction(visitor.secondary?.action)
    }
    renderLatestSupportAds()
    return visitor
  }
  function renderLatestSupportAds(){
    const ads = buildLatestSupportAds()
    ads.forEach((ad, index)=>{
      const title = qs(`[data-latest-ad-title="${index}"]`)
      const copy = qs(`[data-latest-ad-copy="${index}"]`)
      if(title) title.textContent = ad.title
      if(copy) copy.textContent = ad.copy
    })
  }
  function loadFamilySpotlightEntries(){
    try{
      const raw = JSON.parse(localStorage.getItem("supportrdFamilySpotlight") || "[]")
      if(Array.isArray(raw)) return raw
    }catch{}
    return []
  }
  function saveFamilySpotlightEntries(entries){
    try{
      localStorage.setItem("supportrdFamilySpotlight", JSON.stringify(entries.slice(0, 18)))
    }catch{}
  }
  function isVideoMedia(url = ""){
    return /\.(mp4|webm|mov)(\?|#|$)/i.test(String(url))
  }
  function escapeRemoteHtml(value){
    return String(value ?? "").replace(/[&<>"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;"
    }[char] || char))
  }
  function getScenarioAssistantLabel(id){
    if(id === "projake") return "Jake"
    return "Aria"
  }
  function createStickyPager(container, items, countNode, toggleBtn){
    let collapsed = false
    let pairIndex = 0
    const pairSize = 2
    const totalPairs = Math.max(1, Math.ceil(items.length / pairSize))
    const render = ()=>{
      if(container) container.classList.toggle("is-collapsed", collapsed)
      if(collapsed){
        items.forEach(item=>item.classList.add("is-hidden"))
        if(countNode) countNode.textContent = "Hidden"
        if(toggleBtn) toggleBtn.textContent = "Show"
        return
      }
      const start = pairIndex * pairSize
      const end = Math.min(start + pairSize, items.length)
      items.forEach((item, idx)=>item.classList.toggle("is-hidden", idx < start || idx >= end))
      if(countNode) countNode.textContent = `Showing ${start + 1}-${end}`
      if(toggleBtn) toggleBtn.textContent = "Hide"
    }
    render()
    return {
      next(){
        collapsed = false
        pairIndex = (pairIndex + 1) % totalPairs
        render()
      },
      prev(){
        collapsed = false
        pairIndex = (pairIndex - 1 + totalPairs) % totalPairs
        render()
      },
      toggle(){
        collapsed = !collapsed
        render()
      },
      expand(){
        collapsed = false
        render()
      }
    }
  }
  function wireFaqHairReel(root = remoteSheetBody){
    const player = root?.querySelector("[data-faq-reel-player]")
    const status = root?.querySelector("[data-faq-reel-status]")
    const note = root?.querySelector("[data-faq-reel-note]")
    const topicButtons = Array.from(root?.querySelectorAll("[data-faq-topic]") || [])
    const nextBtn = root?.querySelector("[data-faq-next]")
    if(!player || !topicButtons.length) return
    let topic = "growth"
    let cursor = -1
    let timer = null
    const setStatus = (msg)=>{ if(status) status.textContent = msg }
    const renderTopic = ()=>{
      topicButtons.forEach(btn=>btn.classList.toggle("active", btn.getAttribute("data-faq-topic") === topic))
      const config = FAQ_REEL_TOPICS[topic] || FAQ_REEL_TOPICS.growth
      if(note) note.textContent = config.note
    }
    const playNext = ()=>{
      const config = FAQ_REEL_TOPICS[topic] || FAQ_REEL_TOPICS.growth
      const clips = config.clips || []
      if(!clips.length) return
      cursor = (cursor + 1) % clips.length
      const clip = clips[cursor]
      player.src = clip
      player.load()
      player.play().catch(()=>setStatus("Tap play to start the hair reel."))
      renderTopic()
      trackAcquisitionSignal("faq_reel_play", {
        lane: ACQUISITION_LANES.app,
        stage: "watching",
        reelTopic: `${config.label} · clip ${cursor + 1}`,
        reelSource: "FAQ Lounge TV Reel",
        guestPost: `${config.label} guest blog angle from live reel demand`,
        guestSource: "Hair reels + social trend watch",
        socialFeedback: `${config.label} reel is attracting attention inside FAQ Lounge.`
      })
      setStatus(`${config.label} clip ${cursor + 1} is playing now.`)
    }
    const startAuto = ()=>{
      clearInterval(timer)
      timer = setInterval(playNext, 10000)
    }
    topicButtons.forEach(btn=>btn.addEventListener("click", ()=>{
      topic = btn.getAttribute("data-faq-topic") || "growth"
      cursor = -1
      playNext()
      startAuto()
    }))
    nextBtn?.addEventListener("click", ()=>{
      playNext()
      startAuto()
    })
    player.addEventListener("loadedmetadata", ()=>{
      try{
        if(player.duration && player.duration > 10){
          const maxStart = Math.max(0, Math.floor(player.duration - 10))
          player.currentTime = Math.floor(Math.random() * maxStart)
        }
      }catch{}
    })
    player.addEventListener("error", ()=>{
      setStatus("Clip issue detected. Loading the next hair clip.")
      setTimeout(playNext, 250)
    })
    playNext()
    startAuto()
  }
  function buildDeveloperFeedbackSheet(){
    return `
      ${renderRemoteValueLane(["Value: public love + developer proof", "Energy: social leaderboard lane", "Worth: shows what people are loving about SupportRD right now"])}
      <div class="float-sheet-copy">Developer Feedback is the public love board inside FAQ Lounge. It keeps visible comments, real reactions, and the momentum around SupportRD in one place.</div>
      <div class="float-sheet-panel">
        <h4>Join The Feed</h4>
        <p>Sign in is only required if you want to leave a public review, send a heart, or add a thumbs up here.</p>
        <div class="float-sheet-grid three">
          <button class="btn ghost" data-feedback-heart>Heart This Feed</button>
          <button class="btn ghost" data-feedback-thumb>Thumbs Up</button>
          <button class="btn ghost" data-feedback-login>Sign In To Comment</button>
        </div>
        <textarea class="input float-sheet-textarea" data-feedback-comment placeholder="Leave a real public review for the Developer Feedback wall."></textarea>
        <div class="float-sheet-grid">
          <button class="btn" data-feedback-submit>Post Public Review</button>
          <button class="btn ghost" data-feedback-clear>Clear</button>
        </div>
      </div>
      <div class="float-sheet-grid three">
        <button class="btn" data-feedback-sort="hearts">Most Hearts</button>
        <button class="btn ghost" data-feedback-sort="thumbs">Most Thumbs Up</button>
        <button class="btn ghost" data-feedback-sort="cash">Most Cash</button>
      </div>
      <div class="float-sheet-status" data-feedback-status>Showing the strongest public love by hearts right now.</div>
      <div class="float-sheet-panel">
        <h4>Live Engine Encouragement</h4>
        <div class="remote-engine-encouragement" data-engine-feedback></div>
      </div>
      <div class="float-sheet-panel">
        <h4>Automatic Developer Log</h4>
        <div class="remote-review-wall" data-developer-log></div>
      </div>
      <div class="remote-feedback-board" data-feedback-board></div>
      <div class="float-sheet-panel">
        <h4>Public Reviews</h4>
        <div class="remote-review-wall" data-review-wall></div>
      </div>
      <div class="float-sheet-panel">
        <h4>Family Spotlight</h4>
        <p>Use this lane for real family content, real appreciation posts, pictures, and video links that show the human side of SupportRD.</p>
        <div class="float-sheet-grid">
          <input class="input" data-family-name placeholder="Name or family tag">
          <input class="input" data-family-media placeholder="Picture or video URL">
        </div>
        <textarea class="input float-sheet-textarea" data-family-message placeholder="Write the thank-you, family post, or real feedback you want everyone to see."></textarea>
        <div class="float-sheet-grid">
          <button class="btn" data-family-submit>Post Family Content</button>
          <button class="btn ghost" data-family-clear>Clear</button>
        </div>
        <div class="float-sheet-status" data-family-status>Family Spotlight is ready for real pictures, videos, and posts.</div>
        <div class="remote-family-wall" data-family-wall></div>
      </div>
      <div class="float-sheet-copy">This lane is public-facing. It is meant to show the encouragement, love, and usefulness people are feeling around the app.</div>
    `
  }
  function wireDeveloperFeedbackSheet(root = remoteSheetBody){
    const feedbackReactionKey = "supportrdDeveloperFeedReactions"
    const publicReviewKey = "supportrdDeveloperPublicReviews"
    const board = root?.querySelector("[data-feedback-board]")
    const reviewWall = root?.querySelector("[data-review-wall]")
    const developerLog = root?.querySelector("[data-developer-log]")
    const familyWall = root?.querySelector("[data-family-wall]")
    const feedbackComment = root?.querySelector("[data-feedback-comment]")
    const feedbackSubmit = root?.querySelector("[data-feedback-submit]")
    const feedbackClear = root?.querySelector("[data-feedback-clear]")
    const feedbackHeart = root?.querySelector("[data-feedback-heart]")
    const feedbackThumb = root?.querySelector("[data-feedback-thumb]")
    const feedbackLogin = root?.querySelector("[data-feedback-login]")
    const familyName = root?.querySelector("[data-family-name]")
    const familyMedia = root?.querySelector("[data-family-media]")
    const familyMessage = root?.querySelector("[data-family-message]")
    const familyStatus = root?.querySelector("[data-family-status]")
    const familySubmit = root?.querySelector("[data-family-submit]")
    const familyClear = root?.querySelector("[data-family-clear]")
    const status = root?.querySelector("[data-feedback-status]")
    const engineFeedback = root?.querySelector("[data-engine-feedback]")
    const sortButtons = Array.from(root?.querySelectorAll("[data-feedback-sort]") || [])
    if(!board) return
    const communitySignedIn = ()=>localStorage.getItem("loggedIn") === "true" || shouldAutoOwnerEntry()
    const openCommunityLogin = (reason)=>{
      const message = reason || "Sign in to react or leave a public review on Developer Feedback."
      if(typeof window.openLoginGateSticky === "function"){
        window.openLoginGateSticky({
          title: "Sign In To Join Developer Feed",
          message
        })
      }else{
        qs("#loginBtn")?.click()
      }
      if(status) status.textContent = message
    }
    const loadFeedbackReactions = ()=>{
      try{
        const saved = JSON.parse(localStorage.getItem(feedbackReactionKey) || "{}")
        return {
          hearts: Number(saved.hearts || 0),
          thumbs: Number(saved.thumbs || 0),
          cash: Number(saved.cash || 0)
        }
      }catch{
        return { hearts:0, thumbs:0, cash:0 }
      }
    }
    const saveFeedbackReactions = (payload)=>{
      try{ localStorage.setItem(feedbackReactionKey, JSON.stringify(payload)) }catch{}
    }
    const loadPublicReviews = ()=>{
      try{
        const saved = JSON.parse(localStorage.getItem(publicReviewKey) || "[]")
        return Array.isArray(saved) ? saved : []
      }catch{
        return []
      }
    }
    const savePublicReviews = (reviews)=>{
      try{ localStorage.setItem(publicReviewKey, JSON.stringify(reviews)) }catch{}
    }
    const localHearts = Number(localStorage.getItem("supportrdSessionHearts") || 0)
    const localCash = JSON.parse(localStorage.getItem("supportrdGiftHistory") || "[]").reduce((sum, item)=>sum + Number(item?.amount || 0), 0)
    const feedbackReactions = loadFeedbackReactions()
    const entries = DEVELOPER_FEEDBACK_ENTRIES.concat([
      {
        name: "Live Session",
        title: "Current session support",
        comment: "This row reflects the current session energy inside your own SupportRD view.",
        hearts: localHearts + feedbackReactions.hearts,
        thumbs: Math.max(0, Math.round(localHearts / 2)) + feedbackReactions.thumbs,
        cash: localCash
      }
    ])
    const render = (sortKey = "hearts")=>{
      const labelMap = {
        hearts: "hearts",
        thumbs: "thumbs up",
        cash: "cash"
      }
      const sorted = [...entries].sort((a, b)=>(Number(b?.[sortKey] || 0) - Number(a?.[sortKey] || 0)))
      board.innerHTML = sorted.map((entry, index)=>`
        <article class="remote-feedback-card glass">
          <div class="remote-feedback-rank">#${index + 1}</div>
          <div class="remote-feedback-copy">
            <strong>${escapeRemoteHtml(entry.title)}</strong>
            <div class="remote-feedback-author">${escapeRemoteHtml(entry.name)}</div>
            <p>${escapeRemoteHtml(entry.comment)}</p>
          </div>
          <div class="remote-feedback-metrics">
            <span>Hearts: ${Number(entry.hearts || 0)}</span>
            <span>Thumbs: ${Number(entry.thumbs || 0)}</span>
            <span>Cash: $${Number(entry.cash || 0).toFixed(2)}</span>
          </div>
        </article>
      `).join("")
      if(status) status.textContent = `Showing the strongest public love by ${labelMap[sortKey] || "hearts"} right now.`
      sortButtons.forEach(btn=>btn.classList.toggle("active", btn.getAttribute("data-feedback-sort") === sortKey))
    }
    const renderEngineFeedback = ()=>{
      if(!engineFeedback) return
      const stats = loadAcquisitionStats()
      const topLane = rankAcquisitionEntries(stats.lanes, 1)[0]
      engineFeedback.innerHTML = `
        <article class="remote-engine-card">
          <strong>Engine Pulse</strong>
          <span>${escapeRemoteHtml(stats.latestSocialFeedback)}</span>
          <small>Top lane right now: ${escapeRemoteHtml(topLane ? `${topLane[0]} · ${topLane[1]}` : "Waiting for traffic")}</small>
        </article>
      `
    }
    const renderDeveloperLog = ()=>{
      if(!developerLog) return
      const stats = loadAcquisitionStats()
      const requests = loadSupportContactRequests()
      const signals = (stats.signals || [])
        .filter(entry=>{
          const text = `${entry.signal || ""} ${entry.socialFeedback || ""} ${entry.guestPost || ""}`.toLowerCase()
          return /developer|supportdr|founder|reddit|good job|codex|aria|jake|bulk|fly|custom order/.test(text)
        })
        .slice(0, 8)
      const requestEntries = requests.slice(0, 6).map(entry=>({
        title: entry.type === "bulk" ? "Fly-in / bulk product interest" : "Custom order follow-up",
        author: entry.name || "SupportRD contact",
        body: entry.notes || entry.summary || "SupportRD logged a new contact request.",
        stamp: entry.createdAt || ""
      }))
      const signalEntries = signals.map(entry=>({
        title: entry.signal || "Developer signal",
        author: entry.lane || "SupportRD Engine",
        body: entry.socialFeedback || entry.guestPost || entry.reelTopic || "SupportRD picked up a new developer-facing signal.",
        stamp: entry.at || ""
      }))
      const merged = signalEntries.concat(requestEntries)
      developerLog.innerHTML = merged.length ? merged.map(entry=>`
        <article class="remote-review-card">
          <strong>${escapeRemoteHtml(entry.title)}</strong>
          <div class="remote-review-author">${escapeRemoteHtml(entry.author)}</div>
          <p>${escapeRemoteHtml(entry.body)}</p>
        </article>
      `).join("") : `<div class="float-sheet-copy">Developer log is quiet right now. New SupportRD praise, custom-order activity, and fly-in requests will appear here automatically.</div>`
    }
    sortButtons.forEach(btn=>btn.addEventListener("click", ()=>render(btn.getAttribute("data-feedback-sort") || "hearts")))
    render("hearts")
    renderEngineFeedback()
    renderDeveloperLog()
    const renderPublicReviews = ()=>{
      if(!reviewWall) return
      const mergedReviews = loadPublicReviews().concat(PUBLIC_REVIEW_ENTRIES)
      reviewWall.innerHTML = mergedReviews.map(review=>`
        <article class="remote-review-card">
          <strong>${escapeRemoteHtml(review.title)}</strong>
          <div class="remote-review-author">${escapeRemoteHtml(review.author)}</div>
          <p>${escapeRemoteHtml(review.body)}</p>
        </article>
      `).join("")
    }
    renderPublicReviews()
    feedbackLogin?.addEventListener("click", ()=>openCommunityLogin("Sign in to leave a public review, heart the feed, or add a thumbs up."))
    feedbackHeart?.addEventListener("click", ()=>{
      if(!communitySignedIn()){
        openCommunityLogin("Sign in first to leave a heart on Developer Feedback.")
        return
      }
      const next = loadFeedbackReactions()
      next.hearts += 1
      saveFeedbackReactions(next)
      trackAcquisitionSignal("developer_feedback_heart", { lane: ACQUISITION_LANES.app, stage: "feedback-ready", socialFeedback: "The Developer Feed just picked up another heart from a live visitor." })
      render("hearts")
      renderEngineFeedback()
      if(status) status.textContent = "Heart sent. Developer Feedback now reflects your signed-in support."
    })
    feedbackThumb?.addEventListener("click", ()=>{
      if(!communitySignedIn()){
        openCommunityLogin("Sign in first to leave a thumbs up on Developer Feedback.")
        return
      }
      const next = loadFeedbackReactions()
      next.thumbs += 1
      saveFeedbackReactions(next)
      trackAcquisitionSignal("developer_feedback_thumb", { lane: ACQUISITION_LANES.app, stage: "feedback-ready", socialFeedback: "A thumbs-up just came through on Developer Feedback." })
      render("thumbs")
      renderEngineFeedback()
      if(status) status.textContent = "Thumbs up sent. Developer Feedback now reflects your signed-in support."
    })
    feedbackSubmit?.addEventListener("click", ()=>{
      if(!communitySignedIn()){
        openCommunityLogin("Sign in first to leave a public review on Developer Feedback.")
        return
      }
      const text = (feedbackComment?.value || "").trim()
      if(!text){
        if(status) status.textContent = "Write the public review first, then post it."
        return
      }
      const social = JSON.parse(localStorage.getItem("socialLinks") || "{}")
      const reviews = loadPublicReviews()
      reviews.unshift({
        author: social.email || social.name || "Signed In SupportRD Viewer",
        title: "New public review",
        body: text
      })
      savePublicReviews(reviews.slice(0, 20))
      if(feedbackComment) feedbackComment.value = ""
      trackAcquisitionSignal("developer_feedback_review", { lane: ACQUISITION_LANES.app, stage: "feedback-ready", socialFeedback: "A new public review just landed on the Developer Feed." })
      renderPublicReviews()
      renderEngineFeedback()
      renderDeveloperLog()
      if(status) status.textContent = "Public review posted. The Developer Feedback wall now shows your signed-in comment."
    })
    feedbackClear?.addEventListener("click", ()=>{
      if(feedbackComment) feedbackComment.value = ""
      if(status) status.textContent = "Developer Feedback comment box cleared."
    })
    const renderFamilyWall = ()=>{
      if(!familyWall) return
      const entries = loadFamilySpotlightEntries()
      familyWall.innerHTML = entries.length ? entries.map(entry=>{
        const media = String(entry.media || "").trim()
        const mediaHtml = media
          ? (isVideoMedia(media)
            ? `<video class="remote-family-media" src="${escapeRemoteHtml(media)}" controls playsinline preload="metadata"></video>`
            : `<img class="remote-family-media" src="${escapeRemoteHtml(media)}" alt="${escapeRemoteHtml(entry.name || "Family media")}">`)
          : ""
        return `
          <article class="remote-family-card">
            ${mediaHtml}
            <div class="remote-family-copy">
              <strong>${escapeRemoteHtml(entry.name || "SupportRD Family")}</strong>
              <div class="remote-review-author">${escapeRemoteHtml(entry.when || "Just now")}</div>
              <p>${escapeRemoteHtml(entry.message || "")}</p>
            </div>
          </article>
        `
      }).join("") : `<div class="float-sheet-copy">No family content has been posted yet. Use the form above to add the first real post.</div>`
    }
    familySubmit?.addEventListener("click", ()=>{
      const name = (familyName?.value || "").trim() || "SupportRD Family"
      const media = (familyMedia?.value || "").trim()
      const message = (familyMessage?.value || "").trim()
      if(!message && !media){
        if(familyStatus) familyStatus.textContent = "Add a real family post, picture URL, or video URL first."
        return
      }
      const entries = loadFamilySpotlightEntries()
      entries.unshift({
        name,
        media,
        message,
        when: new Date().toLocaleString()
      })
      saveFamilySpotlightEntries(entries)
      if(familyStatus) familyStatus.textContent = "Family Spotlight updated with a real post."
      if(familyName) familyName.value = ""
      if(familyMedia) familyMedia.value = ""
      if(familyMessage) familyMessage.value = ""
      renderFamilyWall()
      renderDeveloperLog()
    })
    familyClear?.addEventListener("click", ()=>{
      if(familyName) familyName.value = ""
      if(familyMedia) familyMedia.value = ""
      if(familyMessage) familyMessage.value = ""
      if(familyStatus) familyStatus.textContent = "Family Spotlight form cleared."
    })
    renderFamilyWall()
  }
  async function fetchShopifyConnectorHealth(){
    try{
      const response = await fetch("/api/shopify/connector-health")
      const data = await response.json()
      if(!(data && data.ok)) throw new Error("health unavailable")
      return data
    }catch{
      return null
    }
  }
  function openScenarioSheet(key){
    const scenario = ARIA_SCENARIOS[key]
    if(!scenario) return
    const assistantLabel = getScenarioAssistantLabel(scenario.assistant)
    openRemoteSheet(`${scenario.title} · ${assistantLabel}`, `
      ${renderRemoteValueLane(["Value: 2026 hair-routing intelligence", "Energy: quick diagnosis-style support lane", "Worth: quality product guidance with celebration built in"])}
      <div class="float-sheet-panel">
        <h4>${escapeRemoteHtml(scenario.title)}</h4>
        <p>${escapeRemoteHtml(scenario.summary)}</p>
        <div class="float-sheet-status">${escapeRemoteHtml(scenario.firstMove)}</div>
      </div>
      <div class="float-sheet-panel">
        <h4>SupportRD Product Route</h4>
        <div class="remote-sheet-pills">
          ${scenario.products.map(product=>`<span class="float-chip">${escapeRemoteHtml(product)}</span>`).join("")}
        </div>
        <p>${assistantLabel} keeps this lane grounded in real product movement, not generic AI filler.</p>
      </div>
      <div class="float-sheet-grid">
        <button class="btn" data-aria-scenario-prompt="${escapeRemoteHtml(scenario.prompt)}" data-assistant-target="${escapeRemoteHtml(scenario.assistant)}">Ask ${assistantLabel} Now</button>
        <button class="btn ghost" data-open-fastpay>Open Purchase Lane</button>
        <button class="btn ghost" data-sheet-close>Back To Remote</button>
      </div>
      <div class="float-sheet-copy">This scenario chapter preserves the personal beginning of SupportRD: specific hair moments, real product routing, and a cleaner premium feel for the customer.</div>
    `, { message:`${scenario.title} is open. ${assistantLabel} is ready with the product route.`, route:"diary" })
  }
  async function refreshSolidStateLive(root = remoteSheetBody){
    const summary = root?.querySelector("[data-solid-health-summary]")
    const detail = root?.querySelector("[data-solid-health-detail]")
    const list = root?.querySelector("[data-solid-health-missing]")
    if(!summary || !detail || !list) return
    summary.textContent = "Checking Shopify storefront + webhook readiness..."
    detail.textContent = "SupportRD is reading the live connector health now."
    list.innerHTML = ""
    const health = await fetchShopifyConnectorHealth()
    if(!health){
      summary.textContent = "Live Shopify health check could not be reached."
      detail.textContent = "The page is still live, but this Solid State card needs a successful connector-health response to confirm storefront and webhook status."
      list.innerHTML = `<li>Network or endpoint issue while checking live connector health</li>`
      return
    }
    const statusLabel = String(health.status || "unknown").toUpperCase()
    summary.textContent = `Shopify connector: ${statusLabel} (${Number(health.score || 0)}%)`
    detail.textContent = `Storefront configured: ${health.storefront_configured ? "yes" : "no"} · Admin configured: ${health.admin_configured ? "yes" : "no"} · Webhook configured: ${health.webhook_configured ? "yes" : "no"} · Live products: ${Number(health.product_count || 0)}`
    if(Array.isArray(health.missing) && health.missing.length){
      list.innerHTML = health.missing.map(item=>`<li>${escapeRemoteHtml(item)}</li>`).join("")
    }else{
      list.innerHTML = "<li>No missing Shopify connector keys reported from the live health check.</li>"
    }
  }
  const remoteState = {
    activeBoard: 0,
    boards: [null, null, null],
    history: [],
    previewUrl: "",
    previewMediaEl: null,
    recorder: null,
    recordChunks: [],
    recordStream: null,
    analyser: null,
    analyserFrame: 0,
    recordStartedAt: 0,
    mode: "audio",
    handsfreeRecognition: null,
    handsfreeActive: false,
    currentPanel: "floatSettingsBox",
    guideTimer: null,
    guideIndex: 0,
    guideKey: "",
    selfieStream: null,
    selfieFilter: "clean",
    selfiePanorama: false
  }
  const floatPanelKey = "supportrdFloatPanel"
  const floatPrimeSeenKey = "supportrdPrimeSeen"
  const defaultFloatPanel = "floatSettingsBox"
  const touchQuery = window.matchMedia ? window.matchMedia("(pointer: coarse), (max-width: 900px)") : null

  function isTouchLayout(){
    return touchQuery ? touchQuery.matches : (window.innerWidth <= 900)
  }
  function isFounderPriority(){
    const email = (state.socialLinks?.email || "").toLowerCase()
    return email === "agentanthony@supportrd.com" || email === "xxfigueroa1993@yahoo.com" || shouldAutoOwnerEntry()
  }
  function showPrimeMenu(){
    if(!primeMenu) return
    primeMenu.hidden = false
    primeMenu.setAttribute("aria-hidden", "false")
  }
  function hidePrimeMenu(){
    if(!primeMenu) return
    primeMenu.hidden = true
    primeMenu.setAttribute("aria-hidden", "true")
  }
  function showFounderLayer(){
    if(!founderLayer || !isFounderPriority()) return
    founderLayer.hidden = false
    founderLayer.setAttribute("aria-hidden", "false")
  }
  function hideFounderLayer(){
    if(!founderLayer) return
    founderLayer.hidden = true
    founderLayer.setAttribute("aria-hidden", "true")
  }
  function showTGuide(){
    if(!tGuide) return
    tGuide.hidden = false
    tGuide.setAttribute("aria-hidden", "false")
  }
  function hideTGuide(){
    if(!tGuide) return
    tGuide.hidden = true
    tGuide.setAttribute("aria-hidden", "true")
  }
  function stopRemoteGuide(notice){
    if(remoteState.guideTimer){
      clearInterval(remoteState.guideTimer)
      remoteState.guideTimer = null
    }
    remoteState.guideIndex = 0
    remoteState.guideKey = ""
    if(footerGuideBtn) footerGuideBtn.textContent = "Live Guidance"
    if(notice && remoteSheetBody){
      const status = remoteSheetBody.querySelector("[data-guide-status]")
      if(status) status.textContent = notice
    }
  }
  function renderGuideMarkup(key, steps){
    return `
      <div class="float-guide-shell" data-guide-shell="${key}">
        <div class="float-guide-head">
          <div>
            <div class="float-mode-kicker">SupportRD Live Guidance</div>
            <strong>${key}</strong>
          </div>
          <button class="btn ghost float-guide-toggle" type="button" data-guide-toggle="${key}">Start Guide</button>
        </div>
        <div class="float-guide-status" data-guide-status>Tap start and the guide will walk the page lightly. Tap again to interrupt.</div>
        <div class="float-guide-steps">
          ${steps.map((step, idx)=>`<button class="float-guide-step" type="button" data-guide-step="${idx}" ${step.target ? `data-guide-target="${step.target}"` : ""}><strong>${step.title}</strong><span>${step.body}</span></button>`).join("")}
        </div>
      </div>
    `
  }
  function showAllFloatPanels(message){
    closeRemoteSheet(false)
    shell.classList.remove("touch-home")
    shell.classList.remove("panel-open")
    shell.classList.add("touch-optimized")
    qsa(".float-box").forEach(box=>{
      box.hidden = false
      box.classList.remove("float-box-focus")
    })
    launchButtons.forEach(btn=>btn.classList.remove("active"))
    if(message) openMiniWindow("Float Remote", message)
  }
  function renderRemoteValueLane(items = []){
    if(!items.length) return ""
    const primary = String(items[0] || "").replace(/^Value:\s*/i, "").trim()
    return `<div class="float-value-lane compact"><span class="float-value-pill">${primary || items[0]}</span></div>`
  }
  function renderDiarySocialLinkRow(){
    if(!diarySocialLinkRow) return
    const links = state.socialLinks || {}
    const items = [
      { label: "Facebook", href: links.fb },
      { label: "Instagram", href: links.ig },
      { label: "TikTok", href: links.tiktok },
      { label: "YouTube", href: links.yt },
      { label: "X", href: links.x },
      { label: "LinkedIn", href: links.linkedin },
      { label: "Snapchat", href: links.snapchat },
      { label: "WhatsApp", href: links.whatsapp || links.evelyn },
      { label: "Google", href: links.google },
      { label: "Bing", href: links.bing }
    ].filter(item => item.href)
    if(!items.length){
      diarySocialLinkRow.innerHTML = `<span class="float-diary-link-empty">Add your social URLs below so your live routes sit right under the message window.</span>`
      return
    }
    diarySocialLinkRow.innerHTML = items.map(item => `<a class="float-diary-link-pill" href="${escapeHtml(item.href)}" target="_blank" rel="noopener noreferrer">${item.label}</a>`).join("")
  }
  function requiresSignedInProfile(){
    return !(localStorage.getItem("loggedIn") === "true" || shouldAutoOwnerEntry())
  }
  function getDiaryLevelAccess(level){
    const plan = state.subscription || "free"
    if(level === "greeting" || level === "thorough") return true
    if(level === "inner") return ["premium","bingo100","pro","yoda","fantasy300","fantasy600"].includes(plan) || isProOverride()
    if(level === "pro") return plan === "pro" || isProOverride()
    return false
  }
  function getDiaryLevelLabel(level){
    return ({
      greeting: "Intro",
      thorough: "Advanced",
      inner: "Inner Circle",
      pro: "Professional / Making Money"
    })[level] || "Intro"
  }
  function buildDiaryPageLines(text){
    const words = String(text || "").trim().split(/\s+/).filter(Boolean)
    const lines = []
    while(words.length){
      lines.push(words.splice(0, 9).join(" "))
    }
    while(lines.length < 4) lines.push("")
    return lines
  }
  function getDiaryPages(text){
    const lines = buildDiaryPageLines(text)
    const pages = []
    for(let i = 0; i < lines.length; i += 4){
      pages.push(lines.slice(i, i + 4))
    }
    return pages.length ? pages : [["","","",""]]
  }
  function renderDiaryPagePreview(pageIndex = 0){
    if(!diaryPagePreview) return
    const pages = getDiaryPages(qs("#floatDiaryInput")?.value || "")
    remoteState.diaryPageIndex = Math.max(0, Math.min(pageIndex, pages.length - 1))
    const page = pages[remoteState.diaryPageIndex] || ["","","",""]
    const dateLine = `Date: ${new Date().toLocaleDateString()} · Place: ${state.socialLinks?.address || "SupportRD Route"}`
    diaryPagePreview.innerHTML = [dateLine].concat(page).map(line=>`<div>${escapeHtml(line || "\u00a0")}</div>`).join("")
  }
  function buildProfileGeneralSummary(){
    const name = (state.socialLinks?.username || state.socialLinks?.name || profileDisplayName?.value || "SupportRD member").trim()
    const credential = profileCredentialTheme?.value || state.socialLinks?.credentialTheme || "laidback"
    const voiceTone = state.socialLinks?.voiceTone || "steady"
    const hairType = state.socialLinks?.hairType || "hair type still being verified"
    const hairColor = state.socialLinks?.hairColor || "hair color pending scan"
    const damage = state.socialLinks?.hairDamage || "low visible damage right now"
    return [
      `${name} presents a steady SupportRD profile with a ${voiceTone} tone.`,
      `Their current profile carries a ${credential} style for the day.`,
      `Hair type is reading as ${hairType}.`,
      `Hair color is showing as ${hairColor}.`,
      `SupportRD is currently seeing ${damage}.`,
      `This profile is set up for serious identity, hair guidance, and saved account continuity.`
    ].join(" ")
  }
  function buildProfileCredentialSummary(){
    const credential = profileCredentialTheme?.value || state.socialLinks?.credentialTheme || "laidback"
    const toneMap = {
      laidback: "This profile reads easygoing, relaxed, and approachable for daily SupportRD use.",
      professional: "This profile reads polished, focused, and business-ready for stronger presentation.",
      sports: "This profile reads active, disciplined, and motion-ready for travel or training days.",
      event: "This profile reads sharp, prepared, and ready for a dressed-up occasion."
    }
    return `${toneMap[credential] || toneMap.laidback} The credential lane helps Aria and Jake shape profile language with more intention. It stays optional, but when saved it gives the account a stronger identity signal.`
  }
  function buildLatestVerifiedResult(){
    const result = state.socialLinks?.scanLatestShort
    if(result) return result
    const variants = [
      "Hair relaxed tended nicely after cleaning earlier",
      "Hair healthy today with light drying after wash",
      "Hair steady and drying softly after care",
      "Hair calm, clean, and settling after rinse"
    ]
    return variants[0]
  }
  function saveProfileState(){
    state.socialLinks = {
      ...(state.socialLinks || {}),
      name: profileDisplayName?.value.trim() || state.socialLinks?.name || "",
      username: profileDisplayName?.value.trim() || state.socialLinks?.username || "",
      credentialTheme: profileCredentialTheme?.value || state.socialLinks?.credentialTheme || "laidback",
      passwordPreview: profilePasswordInput?.value ? "updated" : (state.socialLinks?.passwordPreview || ""),
      phone: profile2faPhone?.value.trim() || state.socialLinks?.phone || "",
      personalCode: profile2faCode?.value.trim() || state.socialLinks?.personalCode || "",
      linkedin: profileLinkedInUrl?.value.trim() || state.socialLinks?.linkedin || "",
      scanLatestShort: buildLatestVerifiedResult(),
      generalSummary: buildProfileGeneralSummary(),
      credentialSummary: buildProfileCredentialSummary()
    }
    localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
    const authConfig = {
      phone: profile2faPhone?.value.trim() || "",
      code: profile2faCode?.value.trim() || "",
      requiresAfterHours: 4,
      enabled: !!((profile2faPhone?.value || "").trim() || (profile2faCode?.value || "").trim())
    }
    localStorage.setItem("supportrd2faConfig", JSON.stringify(authConfig))
    localStorage.setItem("supportrdLastAuthAt", String(Date.now()))
  }
  function syncDiaryAndProfileExtras(){
    remoteState.diaryLiveActive = localStorage.getItem("supportrdDiaryLive") === "true" || !!remoteState.diaryLiveActive
    const diarySaved = JSON.parse(localStorage.getItem("supportrdDiaryEntry") || "{}")
    if(qs("#floatDiaryInput") && !qs("#floatDiaryInput").value) qs("#floatDiaryInput").value = diarySaved.text || ""
    if(diarySocialPost && !diarySocialPost.value) diarySocialPost.value = diarySaved.socialPost || ""
    if(handsfreeTranscript && !handsfreeTranscript.value) handsfreeTranscript.value = diarySaved.transcript || ""
    renderDiaryPagePreview(remoteState.diaryPageIndex || 0)
    if(diaryPanels) diaryPanels.hidden = !!remoteState.diaryLiveActive
    if(diaryLiveStage) diaryLiveStage.hidden = !remoteState.diaryLiveActive
    if(diaryLevelSelect){
      diaryLevelSelect.value = state.ariaLevel || "greeting"
    }
    if(diaryHistory){
      const canViewHistory = localStorage.getItem("loggedIn") === "true" || shouldAutoOwnerEntry()
      const scope = Number(diaryHistoryScope?.value || localStorage.getItem("supportrdDiaryHistoryScope") || 3)
      const history = canViewHistory ? (state.ariaHistory || []).slice(0, scope) : []
      diaryHistory.textContent = canViewHistory
        ? (history.length ? history.join("\n") : "Chat history is empty and ready to hear everything the person needs to say.")
        : "Sign in to save Aria / Jake history to this account."
    }
    if(diaryHistoryScope) diaryHistoryScope.value = localStorage.getItem("supportrdDiaryHistoryScope") || "3"
    if(profileDisplayName) profileDisplayName.value = state.socialLinks?.username || state.socialLinks?.name || ""
    if(profileCredentialTheme) profileCredentialTheme.value = state.socialLinks?.credentialTheme || "laidback"
    if(profileQualityTitle) profileQualityTitle.textContent = `General AI Summary · ${(state.socialLinks?.username || state.socialLinks?.name || "SupportRD Member").trim() || "SupportRD Member"}`
    if(profileQualityBody) profileQualityBody.textContent = buildProfileGeneralSummary()
    if(profileCredentialsSummary) profileCredentialsSummary.textContent = buildProfileCredentialSummary()
    if(profileLatestResult) profileLatestResult.textContent = buildLatestVerifiedResult()
    if(profile2faPhone) profile2faPhone.value = state.socialLinks?.phone || ""
    if(profile2faCode) profile2faCode.value = state.socialLinks?.personalCode || ""
    if(profileLinkedInUrl) profileLinkedInUrl.value = state.socialLinks?.linkedin || ""
    if(diaryLiveStatus){
      if(diaryLiveBtn) diaryLiveBtn.textContent = remoteState.diaryLiveActive ? "Turn Live Off" : "Live Session"
      diaryLiveStatus.textContent = remoteState.diaryLiveActive
        ? `Live mode is on. Session link: ${window.location.origin}/?diary-live=${encodeURIComponent((state.socialLinks?.username || state.socialLinks?.name || "supportrd-live").toLowerCase().replace(/\s+/g, "-"))}`
        : "Live mode is off. When activated, SupportRD prepares a shareable live session link and easy turn-off."
    }
    if(diaryLiveOverlay){
      diaryLiveOverlay.textContent = remoteState.diaryLiveActive
        ? "SupportRD Live Session is on. This page is now presenting the live feed and comment lane."
        : "Live Session is off. Press Live Feature to turn this diary page into a public display."
    }
    if(diaryLiveComments){
      const entries = JSON.parse(localStorage.getItem("supportrdDiaryLiveComments") || "[]")
      diaryLiveComments.textContent = entries.length ? entries.join("\n") : "Live comments will appear here when the session starts."
    }
    if(faqPromptSelect && !faqPromptSelect.dataset.boundInitial){
      faqPromptSelect.dataset.boundInitial = "true"
      faqPromptSelect.dispatchEvent(new Event("change"))
    }
  }
  function openDiarySocialPlatforms(){
    const text = (diarySocialPost?.value || "").trim()
    if(!text){
      openMiniWindow("Send To Social", "Write the social message first so SupportRD can stage the selected platforms.")
      return
    }
    saveFloatSettings()
    const social = state.socialLinks || {}
    const origin = window.location.origin
    const pageLink = `${origin}/?remote=home`
    const items = [
      { checked: qs("#floatDiaryFeedInstagram")?.checked, label:"Instagram", url: social.ig || "https://www.instagram.com/", compose: social.ig || "https://www.instagram.com/" },
      { checked: qs("#floatDiaryFeedFacebook")?.checked, label:"Facebook", url: social.fb || "https://www.facebook.com/", compose: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageLink)}&quote=${encodeURIComponent(text)}` },
      { checked: qs("#floatDiaryFeedTikTok")?.checked, label:"TikTok", url: social.tiktok || "https://www.tiktok.com/", compose: social.tiktok || "https://www.tiktok.com/" },
      { checked: qs("#floatDiaryFeedYouTube")?.checked, label:"YouTube", url: social.yt || "https://www.youtube.com/", compose: social.yt || "https://www.youtube.com/" },
      { checked: qs("#floatDiaryFeedX")?.checked, label:"X", url: social.x || "https://x.com/compose/post", compose: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageLink)}` },
      { checked: qs("#floatDiaryFeedLinkedIn")?.checked, label:"LinkedIn", url: social.linkedin || "https://www.linkedin.com/feed/", compose: `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}` },
      { checked: qs("#floatDiaryFeedSnapchat")?.checked, label:"Snapchat", url: social.snapchat || "https://www.snapchat.com/", compose: social.snapchat || "https://www.snapchat.com/" }
    ].filter(item => item.checked)
    if(!items.length){
      openMiniWindow("Send To Social", "Check at least one platform first.")
      return
    }
    let opened = 0
    items.forEach(item=>{
      const target = item.compose || item.url
      const win = window.open(target, "_blank", "noopener,noreferrer")
      if(win) opened += 1
    })
    if(opened){
      openMiniWindow("Send To Social", `${opened} platform window${opened === 1 ? "" : "s"} opened with your SupportRD message. Some platforms may require the final post click on their own site.`)
    }else{
      openMiniWindow("Send To Social", "Popups were blocked. Use Export to copy the message, then open your saved social links manually.")
    }
  }
  function buildSettingsGuide(lane = "overview"){
    const guides = {
      overview: {
        title: "Full settings lane",
        body: "Use this lane for the deeper account route when you want full identity, password, verification, and saved settings beyond the quick Remote page."
      },
      push: {
        title: "Text alert opt-in",
        body: "1. Enter the phone number for SupportRD alerts. 2. Turn on text-style opt-in. 3. Let the phone/browser allow alerts when asked. 4. Save the preference so Aria and Jake can keep the route active."
      }
    }
    const picked = guides[lane] || guides.overview
    return `<strong>${picked.title}</strong><span>${picked.body}</span>`
  }
  function showSettingsGuide(lane = "overview"){
    if(configGuide) configGuide.innerHTML = buildSettingsGuide(lane)
    const labels = {
      overview: "Full settings lane is open inside Remote.",
      push: "Text-style phone alert steps are ready in settings."
    }
    const message = labels[lane] || labels.overview
    if(configStatus) configStatus.textContent = message
    setRemoteStatus(message)
  }
  function buildDiarySheet(){
    return `
      <div class="float-sheet-copy">Diary Mode is the emotional center of SupportRD: social post, hands-free hair conversation, and a real diary page all stay in one place.</div>
      ${renderRemoteValueLane(["Value: social + diary engine", "Energy: medium live guidance load", "Worth: hands-free history + saved social routes"])}
      <div class="float-sheet-shell">
        <section class="float-sheet-panel">
          <h4>Send To Social</h4>
          <textarea class="input float-sheet-textarea" data-diary-input placeholder="Write the social message you want to stage."></textarea>
            <div class="float-sheet-copy">Use Case: quick social proof from an Uber ride, quick hair update, or a premium support moment.</div>
            <div class="float-sheet-grid three">
              <button class="btn" data-diary-save>Send To Social</button>
              <button class="btn ghost" data-diary-pdf>Export</button>
              <button class="btn ghost" data-open-panel="floatSettingsBox">Open Diary</button>
            </div>
        </section>
        <section class="float-sheet-panel">
          <h4>Conversation Level</h4>
          <div class="float-sheet-status" data-diary-status>Diary is ready. Pick the level and keep the history lane close.</div>
          <div class="float-sheet-grid">
            <button class="btn ghost" data-diary-handsfree>Handsfree</button>
            <button class="btn ghost" data-open-panel="floatAssistantBox">Open Profile</button>
            <button class="btn ghost" data-open-fastpay>Payments</button>
            <button class="btn ghost" data-open-panel="floatLiveBox">FAQ Lounge</button>
          </div>
          <div class="float-sheet-copy">Premium and Pro unlock the stronger conversation levels inside the main Diary panel.</div>
        </section>
      </div>
    `
  }
    function buildSettingsSheet(){
        return `
        <div class="float-sheet-copy">Settings now stays absolute necessary: push notifications and the fuller account lane only.</div>
      ${renderRemoteValueLane(["Value: account control base", "Energy: low system load", "Worth: push alerts + full settings"])}
      <div class="float-sheet-grid">
        <button class="btn ghost" data-settings-focus="push">Push Notifications</button>
        <button class="btn ghost" data-settings-open-account>Open Full Settings</button>
      </div>
      <div class="float-sheet-copy">Full settings stays available when you need the deeper account route, but the quick Settings page stays minimal.</div>
      <div class="float-sheet-status" data-settings-status>Use push notifications or open the full account lane.</div>
      <div class="float-settings-guide glass" data-settings-detail>${buildSettingsGuide("overview")}</div>
      `
    }
    function buildBlogPartySheet(){
      const posts = Array.isArray(BLOG_POSTS) ? BLOG_POSTS.slice(0, 5) : []
      return `
        <div class="remote-blog-party">
          ${renderRemoteValueLane(["Value: SEO + authority engine", "Energy: steady publishing lane", "Worth: visible rankings, product trust, and workday relevance"])}
          <section class="remote-blog-hero">
            <div class="float-mode-kicker">SupportRD Blog Party</div>
            <h4>Fullscreen content energy for Google, authority, and real product traffic.</h4>
            <p>This lane is where SupportRD shows the market it is active: hair fixes, workplace-friendly topics, premium upgrades, and how the controller fits mall trips, road trips, hiking, river days, and daily hair help.</p>
          </section>
          <div class="remote-blog-stats">
            <div class="remote-blog-stat"><strong>SEO Posts Ready</strong><span>${posts.length || 0}</span></div>
            <div class="remote-blog-stat"><strong>Payment Routes</strong><span>Shopify</span></div>
            <div class="remote-blog-stat"><strong>Publishing Cadence</strong><span>Workweek</span></div>
            <div class="remote-blog-stat"><strong>Authority Feel</strong><span>Premium</span></div>
          </div>
          <div class="float-sheet-grid">
            <button class="btn" data-open-blog>Open Main Blog Modal</button>
            <button class="btn ghost" data-open-fastpay>Open Purchase Lane</button>
            <button class="btn ghost" data-open-panel="floatSettingsBox">Open Diary Mode</button>
          </div>
          <div class="remote-blog-list">
            ${posts.map(post=>`<article class="remote-blog-post"><h5>${post.title}</h5><p>${post.body}</p></article>`).join("")}
          </div>
        </div>
      `
    }
    function buildAcquisitionDashboard(){
      const engine = loadAcquisitionStats()
      const topLanes = rankAcquisitionEntries(engine.lanes, 3)
      const topStages = rankAcquisitionEntries(engine.stages, 3)
      const stats = [
        { label:"Latest Guest Post", value:engine.latestGuestPost, detail:`Source: ${engine.latestGuestSource}` },
        { label:"Fresh Reel Signal", value:engine.latestReelTopic, detail:`Source: ${engine.latestReelSource}` },
        { label:"Top Visitor Lane", value:topLanes[0] ? `${topLanes[0][0]} · ${topLanes[0][1]}` : "Waiting for traffic", detail:"This updates as visitors click around reels, scans, products, and social proof." },
        { label:"Top Stage", value:topStages[0] ? `${topStages[0][0]} · ${topStages[0][1]}` : "Waiting for traffic", detail:"SupportRD tracks how far a person is moving through the lane, not just where they landed." },
        { label:"Conversion Timing", value:"Soft premium after trust", detail:"Premium should appear after the visitor has seen the right lane first, not on every single interaction." },
        { label:"Developer Feed Role", value:engine.latestSocialFeedback, detail:"FAQ Lounge and Developer Feedback act like the social trust engine for reactions, reviews, mail, and video replies." }
      ]
      const laneStages = Object.keys(engine.lanes).map(label=>[
        label,
        `${Number(engine.lanes[label] || 0)} signals · strongest stage: ${topStages[0]?.[0] || "arrived"}`
      ])
      return `
        <section class="remote-acquisition-board">
          <div class="float-mode-kicker">Acquisition Engine</div>
          <h5>Visitor-readable stats for the reel + SEO funnel.</h5>
          <p>This default board explains what SupportRD is doing in the background while the visitor enjoys a short reel, studies the app, and gets routed into the right hair-help lane.</p>
          <div class="remote-acquisition-grid">
            ${stats.map(stat=>`
              <article class="remote-acquisition-card">
                <strong>${stat.label}</strong>
                <span>${stat.value}</span>
                <small>${stat.detail}</small>
              </article>
            `).join("")}
          </div>
          <div class="float-sheet-status">Signals tracked so far: ${engine.totalSignals}</div>
          <div class="remote-acquisition-lanes">
            ${laneStages.map(([lane,stage])=>`
              <div class="remote-acquisition-lane">
                <strong>${lane}</strong>
                <span>${stage}</span>
              </div>
            `).join("")}
          </div>
        </section>
      `
    }
  function buildSolidStateSheet(){
      return `
        ${renderRemoteValueLane(["Value: official live edition checklist", "Energy: build + hold demand", "Worth: package-ready SupportRD system"])}
        <div class="float-sheet-copy">Solid State is the company-ready checkpoint: what is built, what is protected, and what still needs live verification before we call the full project officially production-ready for demand and scaling.</div>
        <div class="solid-state-grid">
          <article class="solid-state-check ready">
            <strong>Remote Shell + Controller</strong>
            <span>Remote-first navigation, lower content stage, sticky purchase editor, and in-Remote sheets are built into the current app shell.</span>
          </article>
          <article class="solid-state-check ready">
            <strong>Shopify Admin Linkage</strong>
            <span>Shopify admin/store routing is present in the current project, so product paths and checkout links can already move through SupportRD.</span>
          </article>
          <article class="solid-state-check pending">
            <strong>Payment Balance Link Verification</strong>
            <span>Still needs final live API-key verification and webhook/storefront confirmation before we can honestly call the balance + entitlement layer fully automatic.</span>
          </article>
          <article class="solid-state-check watch">
            <strong>Live Shopify Connector Health</strong>
            <span data-solid-health-summary>Checking Shopify storefront + webhook readiness...</span>
            <small data-solid-health-detail>SupportRD is reading the live connector health now.</small>
            <ul class="solid-state-list" data-solid-health-missing></ul>
          </article>
          <article class="solid-state-check ready">
            <strong>Premium Feel + Occasion Routing</strong>
            <span>The buttons now change the feel of the page without relying on ugly back-and-forth browser movement, which is part of the premium package story.</span>
          </article>
          <article class="solid-state-check pending">
            <strong>Demand Holding + Calculation</strong>
            <span>We can present products and route orders now, but full demand calculation still needs live order verification, inventory logic, and a clean fulfillment rhythm.</span>
          </article>
          <article class="solid-state-check ready">
            <strong>Aria + Jake Use Cases</strong>
            <span>Road trip, river, mall, skiing, hiking, monuments, national parks, and quick hair help prompts all fit the controller package story and can be surfaced in the live edition.</span>
          </article>
        </div>
        <div class="float-sheet-grid">
          <button class="btn" data-open-fastpay>Open Purchase Lane</button>
          <button class="btn ghost" data-open-panel="floatLiveBox">Open FAQ Lounge</button>
          <button class="btn ghost" data-open-panel="floatDeviceBox">Open Map Change</button>
        </div>
      `
    }
    function buildProductPageSheet(){
      return `
        ${renderRemoteValueLane(["Value: live product lane", "Energy: quick browse", "Worth: fast Shopify handoff"])}
        <div class="remote-product-grid-inline">
          ${REMOTE_PAY_PRODUCTS.map(product=>`
            <article class="remote-product-card glass">
              <div class="remote-product-photo-wrap">
                <img class="remote-product-photo" src="${product.image}" alt="${product.title}">
              </div>
              <div class="remote-product-copy">
                <div class="remote-product-title-row">
                  <h4>${product.title}</h4>
                  <span class="remote-product-price">${product.price}</span>
                </div>
                <p class="remote-product-short">${product.short}</p>
                <div class="remote-product-actions">
                  <button class="btn" data-product-shopify="${product.key}">Shopify Checkout</button>
                  <button class="btn ghost" data-product-menu="${product.key}">Open Purchase Menu</button>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      `
    }
    function buildEditsCommandSheet(){
      return `
        ${renderRemoteValueLane(["Value: developer command center", "Energy: timing + editing intelligence", "Worth: turns SupportRD upkeep into a premium university-ready workflow"])}
        <div class="float-sheet-copy">The Edits Menu is now the command layer for real work: product decisions, premium budgeting, ad timing, layout adjustments, meetings, remote studies, and testimony promises all stay one organized move away.</div>
        ${buildAcquisitionDashboard()}
        <div class="remote-command-grid">
          <article class="remote-command-card">
            <strong>Product / Premium Purchase</strong>
            <span>Open the product page, premium lanes, custom orders, and buyer conversion paths from one place.</span>
            <div class="float-sheet-grid">
              <button class="btn" data-open-product-page>Open Product Page</button>
              <button class="btn ghost" data-open-fastpay>Open Purchase Lane</button>
            </div>
          </article>
          <article class="remote-command-card">
            <strong>Functionality In The Desert</strong>
            <span>Durability-first checks for trail biking, travel, river routes, and stressful low-signal moments.</span>
            <div class="float-sheet-grid">
              <button class="btn ghost" data-open-panel="floatDeviceBox">Open Map Change</button>
              <button class="btn ghost" data-open-panel="floatSettingsBox">Open Diary</button>
            </div>
          </article>
          <article class="remote-command-card">
            <strong>Layout / Theme / Ad Reflection</strong>
            <span>Control theme feel, ad visibility, video/audio reflection choices, and important-information mood.</span>
            <div class="float-sheet-grid">
              <button class="btn ghost" data-open-panel="floatDeviceBox">Theme + Maps</button>
              <button class="btn ghost" data-toggle-ads-focus>Focus On Hair Help</button>
            </div>
          </article>
          <article class="remote-command-card">
            <strong>Purchases + Budgeting</strong>
            <span>Keep Premium, Studio Edition, support tips, and project money conversations tied to one budgeting lane.</span>
            <div class="float-sheet-grid">
              <button class="btn ghost" data-open-fastpay>Payments</button>
              <button class="btn ghost" data-open-solid-state>Solid State</button>
            </div>
          </article>
          <article class="remote-command-card">
            <strong>Meetings + Company Direction</strong>
            <span>Long-range company direction, customer referral proof, and founder-review thinking stay documented here.</span>
            <div class="float-sheet-grid">
              <button class="btn ghost" data-open-blog>Open Blog Studies</button>
              <button class="btn ghost" data-open-official-sheet="contact">Contact Lane</button>
            </div>
          </article>
          <article class="remote-command-card">
            <strong>Optional Sign In</strong>
            <span>SupportRD stays usable for free play, while sign-in only steps in when somebody wants premium tracking, custom orders, or account continuity.</span>
            <div class="float-sheet-grid">
              <button class="btn ghost" data-open-signin>Open Sign In</button>
              <button class="btn ghost" data-sheet-close>Keep Browsing Free</button>
            </div>
          </article>
          <article class="remote-command-card">
            <strong>Remote Studies + Hair Solution Research</strong>
            <span>Study how the Remote works, write the blog posts about it, and keep the actual hair-solution logic visible.</span>
            <div class="float-sheet-grid">
              <button class="btn ghost" data-open-panel="floatLiveBox">FAQ Lounge</button>
              <button class="btn ghost" data-open-product-page>Product Study</button>
            </div>
          </article>
          <article class="remote-command-card">
            <strong>Company Promise + Testimony</strong>
            <span>SupportRD feedback, testimony, and founder-level promises stay visible and willing, not hidden.</span>
            <div class="float-sheet-status">Promise: we keep refining the app until each tap feels clean, premium, and useful under pressure.</div>
          </article>
        </div>
      `
    }
    function openOptionalSigninSheet(){
      openRemoteSheet("Optional Sign In", `
        ${renderRemoteValueLane(["Value: premium continuity without locking the app", "Energy: light account check-in", "Worth: easy to dismiss when you just want free play"])}
        <div class="float-sheet-panel">
          <h4>SupportRD Sign In</h4>
          <p>Sign in only matters when someone wants premium tracking, order continuity, or account history. The Remote stays open either way.</p>
          <div class="float-sheet-status">You can dismiss this fast and keep using SupportRD freely.</div>
        </div>
        <div class="float-sheet-grid">
          <button class="btn" data-trigger-login>Open Sign In</button>
          <button class="btn ghost" data-sheet-close>Keep Browsing Free</button>
        </div>
      `, { message:"Optional sign-in is open. Free play still stays available." })
    }
    function openEditsTopicSheet(topic = "product"){
      const topics = {
        product: {
          title: "Product / Premium Purchase",
          body: "This tutorial keeps premium, custom orders, and product sales lined up so SupportRD can convert cleanly without confusing the customer.",
          actions: `
            <button class="btn" data-open-product-page>Open Product Page</button>
            <button class="btn ghost" data-open-fastpay>Open Purchase Lane</button>
          `
        },
        virtual: {
          title: "Functionality Virtual",
          body: "This is the durability lane for bike trails, curves, desert signal, and one-tap navigation. It is where we edit the app for middle-of-the-desert help and decide when play is play time and work is work time.",
          actions: `
            <button class="btn" data-start-virtual-journey>Start Virtual Journey</button>
            <button class="btn ghost" data-open-help-reel>6 Second Help Reel</button>
          `
        },
        actual: {
          title: "Actual Edits",
          body: "Use this lane for actual edits on layout, theme, advertisements, video reflection, audio reflection, and the Mortal Kombat style of important information. This is the live preference lane where we can keep refining the page whenever the product grows.",
          actions: `
            <button class="btn" data-open-panel="floatDeviceBox">Theme + Map</button>
            <button class="btn ghost" data-toggle-ads-focus>Focus On Hair Help</button>
          `
        },
        budget: {
          title: "Purchase and Budgeting Money",
          body: "Keep purchases, budgeting, premium value, support tips, and money-direction preferences editable at any moment so the business side stays in your hands.",
          actions: `
            <button class="btn" data-open-fastpay>Open Payments</button>
            <button class="btn ghost" data-open-solid-state>Open Solid State</button>
          `
        },
        meetings: {
          title: "Meetings and Company Direction",
          body: "This lane tracks what we talk about as a company, 15+ year direction, founder conversations, referral verification, and the long-range choices that shape SupportRD.",
          actions: `
            <button class="btn" data-open-blog>Open Blog Studies</button>
            <button class="btn ghost" data-open-official-sheet="contact">Open Contact Lane</button>
          `
        },
        timing: {
          title: "Remote Timing",
          body: "The timing of the Remote matters: every button should land on the correct full page fast, without page-jump confusion or dead taps in motion. This is where we tune the rhythm of the whole app.",
          actions: `
            <button class="btn" data-start-virtual-journey>Test Virtual Journey</button>
            <button class="btn ghost" data-open-panel="floatSettingsBox">Open Diary Route</button>
          `
        },
        study: {
          title: "Product Actual Study",
          body: "This is the study lane for the real hair-solution logic behind SupportRD, your health and well-being as a living human, the scenario pledge behind the product, testimony/real feedback, and the freedom-of-hair promise we want to lead with love.",
          actions: `
            <button class="btn" data-open-product-page>Open Product Study</button>
            <button class="btn ghost" data-open-panel="floatLiveBox">Open FAQ Lounge</button>
          `
        }
      }
      const config = topics[topic] || topics.product
      openRemoteSheet(config.title, `
        ${renderRemoteValueLane(["Value: exclusive edits support", "Energy: focused developer guidance", "Worth: keeps the whole app teachable and durable"])}
        <div class="float-sheet-panel">
          <h4>${config.title}</h4>
          <p>${config.body}</p>
        </div>
        <div class="float-sheet-grid">
          ${config.actions}
        </div>
      `, { message:`${config.title} is open in the Edit Menu.` })
    }
    function buildMapSheet(){
    const views = typeof window.getWorldViews === "function" ? window.getWorldViews() : []
    const activeView = views.find(view => view.key === (shell?.dataset?.remoteTheme || "default")) || views[0]
    return `
      <div class="float-sheet-copy">Map Change keeps the woman-waking-up default until you choose a new occasion. Tap a bubble, preview the mood, then close straight back into Remote.</div>
      ${renderRemoteValueLane(["Value: theme-driven selling", "Energy: visual mood engine", "Worth: occasion change + one-tap restore"])}
      <div class="float-map-hero" data-map-view="${escapeRemoteHtml(activeView?.key || "default")}">
        <div class="float-map-hero-image"></div>
        <div class="float-map-hero-copy">
          <div class="float-mode-kicker">Serious Map Change</div>
          <strong>${escapeRemoteHtml(activeView?.label || "SupportRD Default")}</strong>
          <span>${escapeRemoteHtml(activeView?.helper || "Pick the travel, mood, or product-forward route that matches the moment.")}</span>
        </div>
      </div>
      <div class="float-map-bubbles">
        ${views.map(view=>`<button class="float-map-bubble" type="button" data-world-key="${view.key}"><strong>${view.label}</strong><span>${view.helper || view.perk || "SupportRD mood route"}</span></button>`).join("")}
      </div>
      <div class="float-map-action-host">
        ${(activeView?.actions || []).map((action, index)=>`<button class="float-map-action" type="button" data-sheet-map-action="${index}" data-sheet-map-key="${activeView.key}"><strong>${escapeRemoteHtml(action.label)}</strong><span>${escapeRemoteHtml(action.detail)}</span></button>`).join("")}
      </div>
      <div class="float-sheet-grid">
        <button class="btn ghost" data-map-reset>Default SupportRD View</button>
        <button class="btn ghost" data-open-gps-route>Guide Me To Kito House</button>
      </div>
      <div class="float-map-loader" data-map-loader hidden><span data-map-loader-bar></span></div>
      <div class="float-sheet-status" data-map-status>SupportRD default view is ready. Pick a map to rotate the mood of the page.</div>
    `
  }
    function buildFaqSheet(){
      return `
        <div class="float-sheet-copy">FAQ is the premium chill lounge: quick answers, help bots, and the TV reel all stay in one calm SupportRD assistance point.</div>
        ${renderRemoteValueLane(["Value: premium help lounge", "Energy: low friction support", "Worth: TV reel + immediate payment guidance"])}
        <div class="float-sheet-grid">
          ${renderSupportFaqCards()}
        </div>
      <div class="float-sheet-grid">
        <button class="btn" data-open-faq-reel>Pull Up TV Reel</button>
        <button class="btn ghost" data-open-developer-feedback>See Developer Feed</button>
        <button class="btn ghost" data-open-fastpay>Open Payments</button>
        <button class="btn ghost" data-open-blog>Open Blog</button>
      </div>
      <div class="float-faq-reel-host" data-sheet-faq-reel hidden>
        <div class="float-sheet-grid">
          <button class="btn ghost active" data-faq-topic="growth">Hair Growth</button>
          <button class="btn ghost" data-faq-topic="care">Hair Care</button>
          <button class="btn ghost" data-faq-topic="curly">Curly Hair</button>
          <button class="btn ghost" data-faq-topic="scalp">Scalp Care</button>
        </div>
        <video class="float-faq-reel-frame" data-faq-reel-player autoplay muted playsinline controls></video>
        <div class="float-sheet-status" data-faq-reel-status>Loading 10-second hair clips...</div>
        <div class="float-sheet-copy" data-faq-reel-note>Growth lane with quick 10-second hair clips.</div>
        <div class="float-sheet-grid">
          <button class="btn ghost" data-faq-next>Next Clip</button>
          <button class="btn ghost" data-link-open="https://www.tiktok.com/tag/hair">Open TikTok Hair Topic</button>
        </div>
      </div>
      <div class="float-sheet-status">Aria and Jake stay close here so people can get help without losing their place.</div>
    `
  }
  function buildStudioSheet(){
    const activeBoard = getBoard()
    return `
      <div class="float-sheet-copy">Studio Quick Panel is the on-the-move edit room: fresh 3-board setup, transport controls, quick cuts, FX, and a one-touch jump into full Studio for deep work.</div>
      ${renderRemoteValueLane(["Value: $10,000+ build feel", "Energy: high creative processing", "Worth: 3 motherboards + deep studio one-touch"])}
      <div class="float-sheet-shell">
        <section class="float-sheet-panel">
          <h4>Motherboards + Transport</h4>
          <div class="float-studio-board-deck" data-quick-studio-deck>
            ${renderQuickStudioBoardDeck()}
          </div>
          <div class="float-sheet-grid four">
            <button class="btn ghost" data-quick-studio-action="fresh">Fresh</button>
            <button class="btn ghost" data-quick-studio-action="back">Back</button>
            <button class="btn ghost" data-quick-studio-action="rewind">Rewind</button>
            <button class="btn ghost" data-quick-studio-action="pause">Pause</button>
            <button class="btn ghost" data-quick-studio-action="play">Play</button>
            <button class="btn ghost" data-quick-studio-action="record">Record</button>
            <button class="btn ghost" data-quick-studio-action="forward">Forward</button>
            <button class="btn ghost" data-quick-studio-action="fastforward">Fast Forward</button>
          </div>
        </section>
        <section class="float-sheet-panel">
          <h4>FX + Import / Export</h4>
          <div data-quick-studio-video>${renderQuickStudioVideoStatus()}</div>
          <div data-quick-studio-fx>${renderQuickStudioFxControls()}</div>
          <div class="float-sheet-grid">
            <button class="btn" data-open-studio>Open Full Studio Live</button>
            <button class="btn ghost" data-quick-studio-action="upload">Upload MP3 / MP4</button>
            <button class="btn ghost" data-quick-studio-action="fx">Insert FX</button>
            <button class="btn ghost" data-quick-studio-action="instrument">Instrument / Voice</button>
            <button class="btn ghost" data-quick-studio-action="export">Export Social File</button>
          </div>
          <div class="float-sheet-status" data-quick-studio-status>${escapeRemoteHtml(activeBoard.kind === "empty" ? "Quick Studio is ready for a fresh recording, MP3 / MP4 import, or live beat layer." : `${activeBoard.name} is live with ${activeBoard.fileName || activeBoard.kind}. Press play, rewind, FX, or export to keep building.`)}</div>
        </section>
      </div>
    `
  }
  function buildProfileSheet(){
    return `
      <div class="float-sheet-copy">Profile presents the person well: image, achievements, hair-state scan, social links, and the premium self-image SupportRD is helping them build.</div>
      ${renderRemoteValueLane(["Value: $50,000 presence feel", "Energy: medium profile intelligence", "Worth: achievements + social proof + hair scan"])}
      <div class="float-sheet-shell profile-sheet-shell">
        <section class="float-sheet-panel">
          <div class="float-profile-sheet-hero">
            <div class="float-profile-sheet-image" data-profile-sheet-image>Profile Image</div>
            <div>
              <h4>Top Qualities</h4>
              <p>Hair mission active, polished presentation, strong social identity, and direct premium support.</p>
            </div>
          </div>
          <div class="float-sheet-grid">
            <button class="btn" data-profile-upload>Upload Profile Picture</button>
            <button class="btn ghost" data-profile-action="scan">Run Full Hair Scan</button>
          </div>
        </section>
        <section class="float-sheet-panel">
          <h4>Profile Actions</h4>
          <div class="float-sheet-grid">
            <button class="btn ghost" data-profile-action="achievements">Achievements</button>
            <button class="btn ghost" data-profile-action="social">Social Connections</button>
            <button class="btn ghost" data-profile-action="upgrade">Upgrade Aria / Jake</button>
          </div>
          <div class="float-sheet-status" data-profile-status>Upload a polished profile image, keep your achievements visible, and route your social identity through SupportRD.</div>
        </section>
      </div>
    `
  }
  function openLaunchMenuSheet(targetId, label, options = {}){
    const menus = {
      floatBoardsBox: {
        title: "Studio Quick Panel",
        body: buildStudioSheet(),
        route: "studio"
      },
      floatProfileBox: {
        title: "Configuration",
        body: buildSettingsSheet(),
        route: "settings"
      },
      floatSettingsBox: {
        title: "Diary Mode",
        body: buildDiarySheet(),
        route: "diary"
      },
      floatDeviceBox: {
        title: "Map Change",
        body: buildMapSheet(),
        route: "map"
      },
      floatLiveBox: {
        title: "FAQ Lounge",
        body: buildFaqSheet(),
        route: "faq"
      },
      floatAssistantBox: {
        title: "Profile",
        body: buildProfileSheet(),
        route: "profile"
      }
    }
    const menu = menus[targetId]
    if(!menu){
      setActiveTouchPanel(targetId, `${label} is ready in Remote.`)
      return
    }
    openRemoteSheet(menu.title, menu.body, { message: `${menu.title} is open inside Remote.`, route: menu.route, replaceRoute: !!options.replaceRoute, skipRoute: !!options.skipRoute })
  }
    function openGuardianSheet(name){
      const gpsModeOn = !!diaryGpsStage && !diaryGpsStage.hidden
      const version = name === "Aria" ? "Aria v2026.4 · Women's voice · Hair + live guidance" : "Jake v2026.4 · Men's voice · Studio specialist"
      openRemoteSheet(`${name} Live Advisor`, `
        <div class="float-sheet-copy">${name} is standing by as a guardian of the page. ${gpsModeOn ? "GPS language is active so the guidance will speak like a route helper." : "Ask a quick question, switch to handsfree, or route straight into the right panel."}</div>
        ${renderRemoteValueLane([version, name === "Aria" ? "Road trip, frizz, hydration, and everyday hair help" : "Studio, booth, exports, and build-room support", "Premium help lane active"])}
        <div class="float-sheet-grid">
          <button class="btn" data-open-panel="${gpsModeOn ? "floatDeviceBox" : "floatSettingsBox"}">${gpsModeOn ? "Open GPS Settings" : "Open Diary + Ask"}</button>
          <button class="btn ghost" data-open-panel="floatProfileBox">Handsfree Settings</button>
          <button class="btn ghost" data-diary-handsfree>${name === "Aria" ? "Handsfree With Aria" : "Handsfree With Jake"}</button>
          <button class="btn ghost" data-open-gps-route>Guide Me To Kito House</button>
        </div>
      `, { message:`${name} is live and ready to help.` })
    }
  function startRemoteGuide(key, steps){
    if(!remoteSheetBody || !steps?.length) return
    if(remoteState.guideTimer && remoteState.guideKey === key){
      stopRemoteGuide("Guidance paused. You are back in full control.")
      const toggle = remoteSheetBody.querySelector(`[data-guide-toggle="${key}"]`)
      if(toggle) toggle.textContent = "Start Guide"
      return
    }
    stopRemoteGuide()
    remoteState.guideKey = key
    remoteState.guideIndex = 0
    const toggle = remoteSheetBody.querySelector(`[data-guide-toggle="${key}"]`)
    const status = remoteSheetBody.querySelector("[data-guide-status]")
    const stepNodes = ()=>Array.from(remoteSheetBody.querySelectorAll(".float-guide-step"))
    if(footerGuideBtn) footerGuideBtn.textContent = "Stop Guidance"
    const runStep = ()=>{
      const step = steps[remoteState.guideIndex] || steps[0]
      if(status) status.textContent = `${step.title}: ${step.body}`
      stepNodes().forEach((node, idx)=>node.classList.toggle("active", idx === remoteState.guideIndex))
      if(key === "Remote Guidance"){
        if(step.target === "all"){
          showAllFloatPanels(`${step.title} is open. All Remote panels are visible together now.`)
        }else if(step.target){
          closeRemoteSheet(false)
          setActiveTouchPanel(step.target, `${step.title} is open. ${step.body}`)
        }
      }
      remoteState.guideIndex = (remoteState.guideIndex + 1) % steps.length
    }
    if(toggle) toggle.textContent = "Stop Guide"
    runStep()
    remoteState.guideTimer = setInterval(runStep, 2400)
  }
  function wireRemoteGuide(key, steps){
    if(!remoteSheetBody) return
    remoteSheetBody.querySelector(`[data-guide-toggle="${key}"]`)?.addEventListener("click", ()=>startRemoteGuide(key, steps))
    Array.from(remoteSheetBody.querySelectorAll(".float-guide-step")).forEach((node, idx)=>{
      node.addEventListener("click", ()=>{
        stopRemoteGuide()
        remoteState.guideKey = key
        remoteState.guideIndex = idx
        const status = remoteSheetBody.querySelector("[data-guide-status]")
        const step = steps[idx]
        Array.from(remoteSheetBody.querySelectorAll(".float-guide-step")).forEach((item, itemIdx)=>item.classList.toggle("active", itemIdx === idx))
        if(status && step) status.textContent = `${step.title}: ${step.body}`
        if(key === "Remote Guidance" && step?.target){
          if(step.target === "all"){
            showAllFloatPanels(`${step.title} is open. All Remote panels are visible together now.`)
          }else{
            closeRemoteSheet(false)
            setActiveTouchPanel(step.target, `${step.title} is open. ${step.body}`)
          }
        }
      })
    })
  }
    function openRemoteSheet(title, html, options = {}){
        if(!remoteSheet || !remoteSheetBody || !remoteSheetTitle) return
        stopRemoteGuide()
        remoteSheet.className = "float-remote-sheet glass"
        if(options.className) remoteSheet.classList.add(options.className)
        remoteSheetTitle.textContent = title
        remoteSheetBody.innerHTML = html
      remoteSheet.hidden = false
      remoteSheet.setAttribute("aria-hidden", "false")
      shell.classList.add("sheet-open")
      if(remoteStageHome) remoteStageHome.hidden = true
      if(options.route && !options.skipRoute) syncRemoteHistory(options.route, !!options.replaceRoute)
      revealRemoteStage()
      applyAssistantDemoScene(options.route || remoteState.currentRoute || "home", false)
      trackAcquisitionSignal(`open_${options.route || remoteState.currentRoute || "home"}`, {
        guestPost: title === "Blog Party" ? "Fresh guest-post angle opened from Blog Party" : undefined,
        guestSource: title === "Blog Party" ? "Remote content route" : undefined
      })
      if(options.message) setRemoteStatus(options.message)
    if(options.route && ["diary","studio","settings","map","faq","profile","payments"].includes(options.route)){
      holdAssistantTeleport({
        aria: { x: window.innerWidth - 194, y: window.innerHeight - 214 },
        jake: { x: window.innerWidth - 108, y: window.innerHeight - 128 }
      }, 2600, {
        mood: options.route === "payments" ? "excited" : "social",
        status: `${title} is open. Aria and Jake teleported down the page to stay with the content.`
      })
    }
    if(options.route === "diary"){
      setTimeout(()=>triggerAssistantMoment("diary_schedule", {
        point: { x: window.innerWidth / 2, y: Math.max(168, window.innerHeight * 0.32) },
        bubble: false,
        duration: 2600
      }), 140)
    }else if(options.route === "faq"){
      setTimeout(()=>triggerAssistantMoment("feed_hover", {
        point: { x: window.innerWidth * 0.56, y: Math.max(160, window.innerHeight * 0.34) },
        bubble: false,
        duration: 2200
      }), 140)
    }else if(options.route === "payments"){
      setTimeout(()=>triggerAssistantMoment("purchase_hover", {
        point: { x: Math.min(window.innerWidth - 180, window.innerWidth * 0.78), y: Math.max(166, window.innerHeight * 0.35) },
        bubble: false,
        duration: 2600
      }), 140)
    }
    if(options.guideKey && Array.isArray(options.guideSteps)){
      wireRemoteGuide(options.guideKey, options.guideSteps)
    }
    Array.from(remoteSheetBody.querySelectorAll("[data-sheet-close]")).forEach(btn=>btn.addEventListener("click", ()=>closeRemoteSheet()))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-panel]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const targetId = btn.getAttribute("data-open-panel") || defaultFloatPanel
      if(targetId === "all"){
        showAllFloatPanels("All six Remote panels are open together for a quick full-system view.")
        return
      }
      const labels = {
        floatSettingsBox: "Diary Mode",
        floatProfileBox: "General Settings",
        floatDeviceBox: "Map Change",
        floatLiveBox: "FAQ Lounge",
        floatBoardsBox: "Studio Quick Panel",
        floatAssistantBox: "Profile"
      }
      openLaunchMenuSheet(targetId, labels[targetId] || "Remote Panel")
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-fastpay]")).forEach(btn=>btn.addEventListener("click", ()=>window.openRemoteFastPay?.()))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-product-page]")).forEach(btn=>btn.addEventListener("click", ()=>{
      openRemoteSheet("Product Page", buildProductPageSheet(), { message:"Product Page is open inside Remote.", className:"remote-sheet-blog", route:"payments" })
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-solid-state]")).forEach(btn=>btn.addEventListener("click", ()=>{
      openRemoteSheet("Solid State Project", buildSolidStateSheet(), { message:"Solid State checklist is open.", className:"remote-sheet-blog", route:"solid" })
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-signin]")).forEach(btn=>btn.addEventListener("click", ()=>openOptionalSigninSheet()))
    Array.from(remoteSheetBody.querySelectorAll("[data-trigger-login]")).forEach(btn=>btn.addEventListener("click", ()=>{
      qs("#loginBtn")?.click()
      setRemoteStatus("Optional sign-in is ready. Free play still stays available.")
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-help-reel]")).forEach(btn=>btn.addEventListener("click", ()=>{
      openRemoteSheet("6 Second Help Reel", buildQuickReelSheet(), { message:"The quick help reel is open inside Remote." })
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-developer-feedback]")).forEach(btn=>btn.addEventListener("click", ()=>{
      trackAcquisitionSignal("open_developer_feedback", {
        lane: ACQUISITION_LANES.app,
        stage: "feedback-ready",
        socialFeedback: "A visitor opened the Developer Feed to check live proof and reactions."
      })
      openRemoteSheet("Developer Feedback", buildDeveloperFeedbackSheet(), { message:"Developer Feedback is open inside FAQ Lounge.", route:"faq" })
      wireDeveloperFeedbackSheet(remoteSheetBody)
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-start-virtual-journey]")).forEach(btn=>btn.addEventListener("click", ()=>{
      closeRemoteSheet(false)
      footerGuideBtn?.click()
      setRemoteStatus("Virtual journey guidance is active. Tap again any time to stop it.")
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-official-sheet]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const mode = btn.getAttribute("data-open-official-sheet") || "official"
      openImportantInfoSheet(mode)
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-toggle-ads-focus]")).forEach(btn=>btn.addEventListener("click", ()=>{
      setRemoteAdsHidden(true)
      setRemoteStatus("Ads are tucked away so the hair-help lane stays focused.")
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-aria-scenario-prompt]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const prompt = btn.getAttribute("data-aria-scenario-prompt") || ""
      const targetAssistant = btn.getAttribute("data-assistant-target") || "aria"
      state.activeAssistant = targetAssistant
      applyAssistantUI(true)
      const input = qs("#ariaInput")
      const send = qs("#sendAria")
      if(input) input.value = prompt
      if(send) send.click()
      setRemoteStatus(`${getScenarioAssistantLabel(targetAssistant)} is now working the SupportRD product route for you.`)
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-settings]")).forEach(btn=>btn.addEventListener("click", ()=>{
      openLaunchMenuSheet("floatProfileBox", "General Settings")
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-settings-focus]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const lane = btn.getAttribute("data-settings-focus") || "general"
      const labels = {
        email: "Change Email is ready in settings.",
        password: "Change Password is ready in settings.",
        social: "Diary social routes are ready right under the message window.",
        push: "Text-style phone notifications are ready in settings.",
        language: "Language control is ready in settings."
      }
      remoteSheetBody.querySelector("[data-settings-status]")?.replaceChildren(document.createTextNode(labels[lane] || "General Settings is ready."))
      const detail = remoteSheetBody.querySelector("[data-settings-detail]")
      if(detail) detail.innerHTML = buildSettingsGuide(lane)
      if(lane === "social"){
        closeRemoteSheet(false, true)
        openLaunchMenuSheet("floatSettingsBox", "Diary Mode")
        diarySocialEditor?.setAttribute("open", "open")
        qs("#floatLinkFacebook")?.focus()
      }
      setRemoteStatus(labels[lane] || "General Settings is ready.")
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-settings-open-account]")).forEach(btn=>btn.addEventListener("click", ()=>{
      remoteSheetBody.querySelector("[data-settings-status]")?.replaceChildren(document.createTextNode("Full account settings are open with verification, reset, and text-alert steps."))
      const detail = remoteSheetBody.querySelector("[data-settings-detail]")
      if(detail) detail.innerHTML = buildSettingsGuide("overview")
      openRemoteFullSettingsLane({ message:"Full account settings are open inside SupportRD." })
      showSettingsGuide("overview")
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-subscribe]")).forEach(btn=>btn.addEventListener("click", ()=>footerSubscribeBtn?.click()))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-blog]")).forEach(btn=>btn.addEventListener("click", ()=>{
      state.blogIndex = 0
      renderBlog()
      trackAcquisitionSignal("open_blog_modal", {
        lane: ACQUISITION_LANES.app,
        stage: "watching",
        guestPost: BLOG_POSTS?.[0]?.title || "SupportRD guest-post angle",
        guestSource: "SEO engine + blog party",
        socialFeedback: "A visitor opened the blog lane to study SupportRD content."
      })
      openModal("blogModal")
      setRemoteStatus("Main Blog Modal is open in fullscreen view.")
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-faq-reel]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const reelHost = remoteSheetBody.querySelector("[data-sheet-faq-reel]")
      if(!reelHost) return
      const willShow = reelHost.hidden
      reelHost.hidden = !willShow
      if(willShow) wireFaqHairReel(remoteSheetBody)
      btn.textContent = willShow ? "Hide TV Reel" : "Pull Up TV Reel"
      setRemoteStatus(willShow ? "SupportRD TV Reel is open inside FAQ." : "FAQ lounge is back in focus.")
    }))
Array.from(remoteSheetBody.querySelectorAll("[data-open-map-sheet]")).forEach(btn=>btn.addEventListener("click", ()=>openLaunchMenuSheet("floatDeviceBox", "Map Change")))
Array.from(remoteSheetBody.querySelectorAll("[data-open-world-map]")).forEach(btn=>btn.addEventListener("click", ()=>{
        openLaunchMenuSheet("floatDeviceBox", "Map Change")
      }))
      remoteSheetBody?.addEventListener("click", (event)=>{
        const faqActionBtn = event.target.closest("[data-faq-action]")
        if(faqActionBtn && remoteSheetBody.contains(faqActionBtn)){
          event.preventDefault()
          event.stopPropagation()
          const action = faqActionBtn.getAttribute("data-faq-action") || ""
          if(action === "payments"){
            window.openRemoteFastPay?.()
            return
          }
          if(action === "products"){
            openRemoteSheet("Product Page", buildProductPageSheet(), { message:"Product Page is open inside Remote.", className:"remote-sheet-blog", route:"payments" })
            return
          }
          if(action === "profile"){
            if(typeof renderRemoteRoute === "function") renderRemoteRoute("profile", { openShell:true })
            return
          }
          if(action === "studio"){
            if(typeof renderRemoteRoute === "function") renderRemoteRoute("studio", { openShell:true })
            return
          }
          if(action === "developer"){
            openRemoteSheet("Developer Feedback", buildDeveloperFeedbackSheet(), { message:"Developer Feedback is open inside FAQ Lounge.", route:"faq" })
            return
          }
          if(action === "faqreel"){
            const reelToggle = remoteSheetBody.querySelector("[data-open-faq-reel]")
            reelToggle?.click()
            return
          }
          if(action === "assistant:aria"){
            try{
              window.forceAssistantFocus?.("aria")
            }catch{}
            openMiniWindow("Aria Hair Help", "Aria hair-help lane is the next best move for this issue. Ask the question naturally and SupportRD will keep the route hair-first.")
            return
          }
        }
        const faqItem = event.target.closest(".float-faq-item")
        if(!faqItem || !remoteSheetBody.contains(faqItem)) return
        const question = faqItem.querySelector("strong")?.textContent || "SupportRD FAQ"
        const answer = faqItem.querySelector("span")?.textContent || "SupportRD answer ready."
        openMiniWindow(question, answer)
      })
      Array.from(remoteSheetBody.querySelectorAll("[data-world-key]")).forEach(btn=>btn.addEventListener("click", ()=>{
        const key = btn.getAttribute("data-world-key")
      const loader = remoteSheetBody.querySelector("[data-map-loader]")
      const loaderBar = remoteSheetBody.querySelector("[data-map-loader-bar]")
      if(loader){
        loader.hidden = false
        if(loaderBar) loaderBar.style.width = "12%"
        setTimeout(()=>{ if(loaderBar) loaderBar.style.width = "46%" }, 160)
        setTimeout(()=>{ if(loaderBar) loaderBar.style.width = "82%" }, 360)
        setTimeout(()=>{
          if(loaderBar) loaderBar.style.width = "100%"
          setTimeout(()=>{ if(loader) loader.hidden = true }, 260)
        }, 700)
      }
      if(typeof window.setWorldTheme === "function" && key){
        window.setWorldTheme(key)
      }
      if(key) shell.dataset.remoteTheme = key
      const status = remoteSheetBody.querySelector("[data-map-status]")
      if(status) status.textContent = `${btn.querySelector("strong")?.textContent || "Theme"} is loading into SupportRD. The Remote stays open while the mood changes.`
      setRemoteStatus(`${btn.querySelector("strong")?.textContent || "Theme"} is loading into SupportRD.`)
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-sheet-map-action]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const views = typeof window.getWorldViews === "function" ? window.getWorldViews() : []
      const view = views.find(item => item.key === btn.getAttribute("data-sheet-map-key")) || views[0]
      const action = view?.actions?.[Number(btn.getAttribute("data-sheet-map-action"))]
      if(!action) return
      const status = remoteSheetBody.querySelector("[data-map-status]")
      if(status) status.textContent = `${view.label}: ${action.label}. ${action.detail}`
      setRemoteStatus(`${view.label}: ${action.label}. ${action.detail}`)
      openMiniWindow(view.label, action.detail)
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-map-reset]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const status = remoteSheetBody.querySelector("[data-map-status]")
      if(status) status.textContent = "SupportRD default woman-waking-up view is active again."
      delete shell.dataset.remoteTheme
      if(typeof window.setWorldTheme === "function"){
        window.setWorldTheme("default")
      }
      setRemoteStatus("SupportRD default woman-waking-up view is active again.")
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-studio]")).forEach(btn=>btn.addEventListener("click", ()=>{
      localStorage.setItem("supportrdStudioReturnView", "remote")
      if(typeof window.openStudioMode === "function"){
        closeFloat()
        window.openStudioMode()
      }else{
        setRemoteStatus("Studio Quick Panel is ready.")
      }
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-gps-route]")).forEach(btn=>btn.addEventListener("click", async ()=>{
      closeRemoteSheet(false, true)
      await openKitoGpsLane()
    }))
      Array.from(remoteSheetBody.querySelectorAll("[data-open-official]")).forEach(btn=>btn.addEventListener("click", ()=>openLinkModal("https://supportrd.com", "SupportRD Official Website")))
      Array.from(remoteSheetBody.querySelectorAll("[data-link-open]")).forEach(btn=>btn.addEventListener("click", ()=>{
        const link = btn.getAttribute("data-link-open")
        if(link) openLinkModal(link, "SupportRD Link")
      }))
      Array.from(remoteSheetBody.querySelectorAll("[data-product-shopify]")).forEach(btn=>btn.addEventListener("click", ()=>{
        const product = REMOTE_PAY_PRODUCTS.find((item)=>item.key === btn.getAttribute("data-product-shopify"))
        if(!product) return
        launchShopifyCheckout(product, "Product Page")
      }))
      Array.from(remoteSheetBody.querySelectorAll("[data-product-menu]")).forEach(btn=>btn.addEventListener("click", ()=>{
        const product = REMOTE_PAY_PRODUCTS.find((item)=>item.key === btn.getAttribute("data-product-menu"))
        if(!product) return
        if(typeof window.openPurchaseDetails === "function") window.openPurchaseDetails(product, "Product Page")
      }))
      Array.from(remoteSheetBody.querySelectorAll("[data-quick-studio-setting]")).forEach(input=>input.addEventListener("change", ()=>{
        const board = getBoard()
        if(board.kind === "empty"){
          setRemoteStatus("Record or import something first, then SupportRD will lock these FX settings onto the active motherboard.")
          syncQuickStudioSheet()
          return
        }
        const mode = input.getAttribute("data-quick-studio-setting")
        const value = input.value
        if(mode === "instrument" && instrumentTypeInput) instrumentTypeInput.value = value
        if(mode === "fx" && fxPresetInput) fxPresetInput.value = value
        if(mode === "gigFilter" && gigFilterInput) gigFilterInput.value = value
        if(mode === "gigPan" && gigPanInput) gigPanInput.value = value
        if(mode === "gigFrameRate" && gigFrameRateInput) gigFrameRateInput.value = value
        if(mode === "gigZoom" && gigZoomInput) gigZoomInput.value = value
        if(mode === "gigSlowMotion" && gigSlowMotionInput) gigSlowMotionInput.value = value
        updateBoardFxState()
        setRemoteStatus(`${board.name} ${mode === "fx" ? "FX" : mode} changed from Studio Quick.`)
      }))
      Array.from(remoteSheetBody.querySelectorAll("[data-diary-save]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const input = remoteSheetBody.querySelector("[data-diary-input]")
      localStorage.setItem("supportrdDiaryDraft", input?.value || "")
      remoteSheetBody.querySelector("[data-diary-status]")?.replaceChildren(document.createTextNode("Diary saved and kept ready inside Remote."))
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-diary-clear]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const input = remoteSheetBody.querySelector("[data-diary-input]")
      if(input) input.value = ""
      localStorage.removeItem("supportrdDiaryDraft")
      remoteSheetBody.querySelector("[data-diary-status]")?.replaceChildren(document.createTextNode("Diary cleared cleanly."))
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-diary-post]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const input = remoteSheetBody.querySelector("[data-diary-input]")
      const text = (input?.value || "").trim()
      if(text && liveArenaComposeInput) liveArenaComposeInput.value = text
      remoteSheetBody.querySelector("[data-diary-status]")?.replaceChildren(document.createTextNode(text ? "Diary post staged for social handoff with your saved backlinks." : "Write something first, then SupportRD can route the post."))
      if(text) setRemoteStatus("Diary post staged for social handoff with your saved backlinks.")
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-diary-handsfree]")).forEach(btn=>btn.addEventListener("click", ()=>{
      remoteSheetBody.querySelector("[data-diary-status]")?.replaceChildren(document.createTextNode("Handsfree mode is ready. Ask Aria or Jake and SupportRD will transcribe below."))
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-diary-pdf]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const input = remoteSheetBody.querySelector("[data-diary-input]")
      const value = input?.value || ""
      const win = window.open("", "_blank", "noopener,noreferrer,width=720,height=860")
      if(!win) return
      win.document.write(`<html><head><title>SupportRD Diary Export</title></head><body style="font-family:Georgia,serif;padding:32px;line-height:1.6;"><h1>SupportRD Diary Export</h1><pre style="white-space:pre-wrap;font:inherit;">${escapeHtml(value || "No diary text yet.")}</pre></body></html>`)
      win.document.close()
      win.focus()
      try{ win.print() }catch{}
    }))
    const diaryInput = remoteSheetBody.querySelector("[data-diary-input]")
    if(diaryInput){
      diaryInput.value = localStorage.getItem("supportrdDiaryDraft") || ""
    }
    Array.from(remoteSheetBody.querySelectorAll("[data-quick-studio-action]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const action = btn.getAttribute("data-quick-studio-action") || "play"
      triggerQuickStudioAction(action)
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-open-studio-board]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const board = Math.max(1, Number(btn.getAttribute("data-open-studio-board") || "1"))
      const boardBtn = qsa(".float-board")[board - 1]
      if(boardBtn){
        try{ setActiveBoard(boardBtn) }catch{}
      }else{
        remoteState.activeBoard = board - 1
      }
      syncQuickStudioSheet()
      setRemoteStatus(`Motherboard ${board} is armed for the next quick edit.`)
    }))
    Array.from(remoteSheetBody.querySelectorAll("[data-profile-upload]")).forEach(btn=>btn.addEventListener("click", triggerProfileUpload))
    Array.from(remoteSheetBody.querySelectorAll("[data-profile-action]")).forEach(btn=>btn.addEventListener("click", ()=>{
      const action = btn.getAttribute("data-profile-action") || "scan"
      if(action === "social"){
        openLaunchMenuSheet("floatSettingsBox", "Diary Mode")
        diarySocialEditor?.setAttribute("open", "open")
        setRemoteStatus("Social connections are open right under the Diary message window.")
        return
      }
      const labels = {
        scan: "Full hair scan is ready from Profile.",
        achievements: "Achievements view is ready from Profile.",
        social: "Social connections are ready from Profile. Your saved WWW links and social routes now live in Diary under the message window.",
        upgrade: "Aria / Jake upgrade lane is ready from Profile."
      }
      remoteSheetBody.querySelector("[data-profile-status]")?.replaceChildren(document.createTextNode(labels[action] || "Profile action is ready."))
      setRemoteStatus(labels[action] || "Profile action is ready.")
    }))
    const sheetImage = remoteSheetBody.querySelector("[data-profile-sheet-image]")
    if(sheetImage && state.userAvatar){
      sheetImage.style.backgroundImage = `linear-gradient(145deg, rgba(10,22,42,.28), rgba(10,22,42,.08)), url("${state.userAvatar}")`
      sheetImage.style.backgroundSize = "cover"
      sheetImage.style.backgroundPosition = "center"
      sheetImage.textContent = ""
    }
    refreshSolidStateLive(remoteSheetBody)
  }
  function closeRemoteSheet(stopGuide = true, keepRoute = false){
      if(stopGuide) stopRemoteGuide()
      if(!remoteSheet || !remoteSheetBody) return
      remoteSheet.hidden = true
      remoteSheet.setAttribute("aria-hidden", "true")
      remoteSheetBody.innerHTML = ""
      shell.classList.remove("sheet-open")
      if(remoteStageHome) remoteStageHome.hidden = false
      applyAssistantDemoScene("home", false)
      if(!keepRoute) syncRemoteHistory("home", true)
    }
    function revealRemoteStage(){
      try{ remoteContentStage?.scrollIntoView({ behavior:"smooth", block:"start" }) }catch{}
    }
  function applyRemoteThemeByIndex(offset = 1){
      if(typeof WORLD_VIEWS === "undefined" || !Array.isArray(WORLD_VIEWS) || !WORLD_VIEWS.length) return
      const currentKey = shell?.dataset?.remoteTheme || "default"
      let currentIndex = WORLD_VIEWS.findIndex(view => view.key === currentKey)
      if(currentIndex < 0) currentIndex = 0
      const nextIndex = (currentIndex + offset + WORLD_VIEWS.length) % WORLD_VIEWS.length
      const nextView = WORLD_VIEWS[nextIndex]
      if(!nextView) return
      if(typeof window.setWorldTheme === "function") window.setWorldTheme(nextView.key)
      if(shell) shell.dataset.remoteTheme = nextView.key
      setRemoteStatus(`${nextView.label} is active in SupportRD.`)
      const stageTitle = remoteStageHome?.querySelector("h3")
      const stageCopy = remoteStageHome?.querySelector("p")
      if(stageTitle) stageTitle.textContent = `${nextView.label} is now shaping the Remote.`
      if(stageCopy) stageCopy.textContent = `${nextView.helper || "The page mood has shifted."} Use Map Change any time for deeper theme control while the Remote stays at the top.`
    }
    function setRemoteAdsHidden(hidden){
      document.body.classList.toggle("remote-hide-ads", !!hidden)
      if(remoteAdsToggleBtn) remoteAdsToggleBtn.textContent = hidden ? "Show Ads" : "Hide Ads"
      if(remoteAdsFocusBtn) remoteAdsFocusBtn.textContent = hidden ? "Bring Ads Back" : "Focus On Hair Help"
      localStorage.setItem("supportrdRemoteAdsHidden", hidden ? "true" : "false")
      setRemoteStatus(hidden ? "Ads are tucked away so you can focus on your hair help." : "Ads are back and ready to sell the next step.")
    }
  function buildQuickReelSheet(){
      return `
        ${renderRemoteValueLane(["Value: 6-second guided reel", "Energy: lightweight visual help", "Worth: shows the app fast without leaving Remote"])}
        <div class="float-sheet-panel">
          <h4>SupportRD Help Reel</h4>
          <p>This is the slick six-second lane: Diary for the emotional center, Studio Quick Panel for fast edits, Map Change for mood, FAQ for support, and Profile for the person behind the session.</p>
          <iframe class="float-faq-reel-frame" src="/static/reel.html?v=20260322b" title="SupportRD Help Reel"></iframe>
        </div>
        <div class="float-sheet-grid three">
          <button class="btn" data-open-panel="floatSettingsBox">Open Diary</button>
          <button class="btn ghost" data-open-panel="floatBoardsBox">Open Studio Quick</button>
          <button class="btn ghost" data-open-panel="floatAssistantBox">Open Profile</button>
        </div>
      `
    }
    function getRemoteRouteForTarget(targetId){
      return {
        floatSettingsBox: "diary",
        floatBoardsBox: "studio",
        floatProfileBox: "settings",
        floatDeviceBox: "map",
        floatLiveBox: "faq",
        floatAssistantBox: "profile"
      }[targetId] || "home"
    }
    function getRemoteRouteFromLocation(){
      const params = new URLSearchParams(window.location.search || "")
      const queryRoute = (params.get("remote") || "").trim()
      if(queryRoute && REMOTE_ROUTE_META[queryRoute]){
        return queryRoute
      }
      const rawPath = (window.location.pathname || "/").replace(/\/+$/, "") || "/"
      if(rawPath === "/remote" || rawPath === "/remote/home") return "home"
      if(rawPath.startsWith("/remote/")){
        const slug = rawPath.slice("/remote/".length)
        return REMOTE_ROUTE_META[slug] ? slug : "home"
      }
      return null
    }
    function updateRemoteDocumentMeta(route){
      const meta = REMOTE_ROUTE_META[route] || REMOTE_ROUTE_META.home
      document.title = `${meta.title} | SupportRD`
      let desc = document.querySelector('meta[name="description"]')
      if(!desc){
        desc = document.createElement("meta")
        desc.name = "description"
        document.head.appendChild(desc)
      }
      desc.setAttribute("content", meta.description)
    }
    function syncRemoteHistory(route = "home", replace = false){
      const meta = REMOTE_ROUTE_META[route] || REMOTE_ROUTE_META.home
      updateRemoteDocumentMeta(route)
      const params = new URLSearchParams(window.location.search || "")
      if(params.has("remote")){
        params.delete("remote")
        const query = params.toString()
        const cleanUrl = `${meta.path}${query ? `?${query}` : ""}`
        try{
          window.history.replaceState({ supportrdRemoteRoute: route }, "", cleanUrl)
        }catch{}
        return
      }
      if(window.location.pathname === meta.path) return
      const method = replace ? "replaceState" : "pushState"
      try{
        window.history[method]({ supportrdRemoteRoute: route }, "", meta.path)
      }catch{}
    }
    function renderRemoteRoute(route = "home", options = {}){
      const normalized = REMOTE_ROUTE_META[route] ? route : "home"
      updateRemoteDocumentMeta(normalized)
      applyAssistantDemoScene(normalized, false)
      if(options.openShell && shell.hidden){
        openFloat({ preserveHome:true, preserveRoute:true })
      }
      if(normalized === "home"){
        setFloatHome("Remote home is ready. Pick any route and the page fills smoothly underneath.")
      }else if(normalized === "payments"){
        footerPaymentsBtn?.click()
      }else if(normalized === "blog"){
        footerBlogBtn?.click()
      }else if(normalized === "official"){
        footerOfficialBtn?.click()
      }else if(normalized === "solid"){
        remotePurchaseSolidBtn?.click()
      }else{
        const targetId = {
          diary: "floatSettingsBox",
          studio: "floatBoardsBox",
          settings: "floatProfileBox",
          map: "floatDeviceBox",
          faq: "floatLiveBox",
          profile: "floatAssistantBox"
        }[normalized]
        if(targetId) openLaunchMenuSheet(targetId, REMOTE_ROUTE_META[normalized]?.title || "Remote", { skipRoute:true })
      }
      if(!options.skipHistory) syncRemoteHistory(normalized, !!options.replace)
    }
    function openImportantInfoSheet(mode = "privacy"){
      const configs = {
        privacy: {
          title: "Privacy Page",
          body: "SupportRD keeps your hair-help session premium, clear, and privacy-aware while the Remote stays up top.",
          cta: "Privacy matters. Sensitive account/payment details stay in the right lanes while the app keeps the flow light."
        },
        about: {
          title: "About Us",
          body: "SupportRD is being shaped like a 2026 hair solution app: remote-first, premium, mobile-friendly, and useful in everyday life.",
          cta: "This is the official story lane for the product, the mission, and the everyday success angle."
        },
        contact: {
          title: "Contact Us",
          body: "Reach SupportRD directly if you need help verifying an order, routing a custom request, or getting hair guidance.",
          cta: "Direct contact: xxfigueroa1993@yahoo.com · 980-375-9197"
        },
        official: {
          title: "Official SupportRD",
          body: "Main official routes stay attached to the same Remote shell so you never feel kicked out of the app.",
          cta: "About Us, Contact, Privacy, and official SupportRD directions all stay one layer away."
        }
      }
      const config = configs[mode] || configs.privacy
      openRemoteSheet(config.title, `
        ${renderRemoteValueLane(["Value: trust + official clarity", "Energy: low-friction info lane", "Worth: keeps users safe and informed"])}
        <div class="float-sheet-panel">
          <h4>${config.title}</h4>
          <p>${config.body}</p>
          <div class="float-sheet-status">${config.cta}</div>
        </div>
        <div class="float-sheet-grid three">
          <button class="btn" data-open-official>SupportRD Main Site</button>
          <button class="btn ghost" data-open-gps-route>Guide Me To Kito House</button>
          <button class="btn ghost" data-sheet-close>Close Page</button>
        </div>
        ${mode === "contact" ? `
          <div class="float-sheet-panel">
            <h4>Order + Bulk Contact Lanes</h4>
            <div class="float-sheet-grid">
              <button class="btn" data-link-open="${buildCustomOrderMailto("custom")}">Email Custom Order</button>
              <button class="btn ghost" data-link-open="${LINKS.custom}">Open Custom Order Page</button>
              <button class="btn" data-link-open="${buildCustomOrderMailto("bulk")}">Email Fly-In / Bulk Request</button>
            </div>
            <p class="fine-print">SupportRD uses these contact lanes to separate real custom-order demand, in-person session requests, and bulk product interest with the inventor.</p>
          </div>
        ` : ""}
      `, { message:`${config.title} is open inside the Remote stage.`, route:"official" })
    }
    function setFloatHome(message){
        closeRemoteSheet()
        hideTGuide()
        shell.classList.add("touch-home")
        shell.classList.remove("panel-open")
        shell.classList.add("touch-optimized")
        remoteState.currentRoute = "home"
        remoteState.currentPanel = defaultFloatPanel
        localStorage.setItem(floatPanelKey, defaultFloatPanel)
        launchButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.floatTarget === defaultFloatPanel))
        qsa(".float-box").forEach(box => box.hidden = true)
        if(remoteStageHome) remoteStageHome.hidden = false
        syncRemoteLaunchVisual("default")
        syncMapHero(shell?.dataset?.remoteTheme || "default")
        applyAssistantDemoScene("home", false)
        if(message) setRemoteStatus(message)
    }

  function revokePreview(){
    if(remoteState.previewUrl){
      try{ URL.revokeObjectURL(remoteState.previewUrl) }catch{}
      remoteState.previewUrl = ""
    }
    if(boardPreviewAudio){
      boardPreviewAudio.pause()
      boardPreviewAudio.removeAttribute("src")
      boardPreviewAudio.hidden = true
    }
    if(boardPreviewVideo){
      boardPreviewVideo.pause()
      boardPreviewVideo.removeAttribute("src")
      boardPreviewVideo.hidden = true
    }
    if(boardPreviewMediaWrap) boardPreviewMediaWrap.hidden = true
  }
  function formatClock(totalSeconds = 0){
    const safe = Math.max(0, Math.floor(totalSeconds))
    const minutes = String(Math.floor(safe / 60)).padStart(2, "0")
    const seconds = String(safe % 60).padStart(2, "0")
    return `${minutes}:${seconds}`
  }
  function stopWaveform(){
    if(remoteState.analyserFrame){
      cancelAnimationFrame(remoteState.analyserFrame)
      remoteState.analyserFrame = 0
    }
    if(remoteState.recordStream){
      remoteState.recordStream.getTracks().forEach(track=>track.stop())
      remoteState.recordStream = null
    }
    remoteState.analyser = null
  }
  function drawWaveform(active = false){
    if(!waveCanvas) return
    const ctx = waveCanvas.getContext("2d")
    if(!ctx) return
    const width = waveCanvas.width
    const height = waveCanvas.height
    ctx.clearRect(0, 0, width, height)
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, "rgba(71,197,255,0.95)")
    gradient.addColorStop(1, "rgba(255,205,118,0.9)")
    ctx.fillStyle = "rgba(10,20,34,0.82)"
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = gradient
    ctx.lineWidth = 3
    ctx.beginPath()
    const bars = 96
    if(active && remoteState.analyser){
      const data = new Uint8Array(remoteState.analyser.frequencyBinCount)
      remoteState.analyser.getByteTimeDomainData(data)
      for(let i = 0; i < bars; i += 1){
        const sourceIndex = Math.floor((i / bars) * data.length)
        const value = (data[sourceIndex] || 128) / 255
        const x = (i / (bars - 1)) * width
        const y = height * value
        if(i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
    }else{
      for(let i = 0; i < bars; i += 1){
        const x = (i / (bars - 1)) * width
        const wave = Math.sin((i / bars) * Math.PI * 8) * 22
        const y = (height / 2) + wave
        if(i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
    if(active && remoteState.recorder?.state === "recording"){
      if(boardTimer) boardTimer.textContent = formatClock((Date.now() - remoteState.recordStartedAt) / 1000)
      remoteState.analyserFrame = requestAnimationFrame(()=>drawWaveform(true))
    }
  }
  function snapshotBoards(){
    remoteState.history.unshift(JSON.stringify(remoteState.boards))
    remoteState.history = remoteState.history.slice(0, 12)
  }
  function emptyBoard(idx){
    const laneNames = ["Voice Board", "Beat Board", "Adlib Board"]
    return {
      id: `board-${idx + 1}-${Date.now()}`,
      name: laneNames[idx] || `Motherboard ${idx + 1}`,
      kind: "empty",
      fileName: "",
      fileType: "",
      trimStart: 10,
      trimEnd: 90,
      highlighted: false,
      exported: ""
    }
  }
  function resetBoards(message){
    revokePreview()
    try{ stopBoardMixPreview(true) }catch{}
    remoteState.boards = [emptyBoard(0), emptyBoard(1), emptyBoard(2)]
    remoteState.activeBoard = 0
    qsa(".float-board").forEach((btn, idx)=>{
      btn.classList.toggle("active", idx === 0)
      btn.textContent = remoteState.boards[idx]?.name || `Motherboard ${idx + 1}`
    })
    renderBoard()
    if(quickEditStatus) quickEditStatus.textContent = message || "Fresh 3 motherboards ready. Upload material to begin a quick edit."
  }
  function getBoard(idx = remoteState.activeBoard){
    return remoteState.boards[idx] || emptyBoard(idx)
  }
  function renderBoard(){
    const board = getBoard()
    if(trimStart) trimStart.value = String(board.trimStart ?? 10)
    if(trimEnd) trimEnd.value = String(board.trimEnd ?? 90)
    if(trimStartNumber) trimStartNumber.value = String(board.trimStart ?? 10)
    if(trimEndNumber) trimEndNumber.value = String(board.trimEnd ?? 90)
    if(instrumentTypeInput) instrumentTypeInput.value = board.instrument || "voice"
    if(fxPresetInput) fxPresetInput.value = board.fxPreset || "clean"
    if(gigFilterInput) gigFilterInput.value = board.gigFilter || "natural"
    if(gigPanInput) gigPanInput.value = board.gigPan || "standard"
    if(gigFrameRateInput) gigFrameRateInput.value = board.gigFrameRate || "24"
    if(gigZoomInput) gigZoomInput.value = board.gigZoom || "1x"
    if(gigSlowMotionInput) gigSlowMotionInput.value = board.gigSlowMotion || "off"
    const prettyKind = board.kind === "empty" ? "Empty" : board.kind.toUpperCase()
    const trimLine = board.highlighted ? `Highlighted ${board.trimStart}% → ${board.trimEnd}%` : "No highlight yet."
    if(boardPreviewCopy){
      boardPreviewCopy.textContent = board.kind === "empty"
        ? "Upload material to start a fresh 3-board quick edit."
        : `${board.name} · Type: ${prettyKind} · File: ${board.fileName || "live take"} · ${trimLine} · Export: ${board.exported || "Not exported yet."}`
    }else if(boardPreview){
      boardPreview.textContent = board.kind === "empty"
        ? "Upload material to start a fresh 3-board quick edit."
        : `${board.name}\nType: ${prettyKind}\nFile: ${board.fileName || "live take"}\n${trimLine}\nExport: ${board.exported || "Not exported yet."}`
    }
    if(boardTimer) boardTimer.textContent = formatClock(board.duration || 0)
    if(boardMode) boardMode.textContent = board.kind === "empty"
      ? "Audio waveform ready for the active motherboard."
      : `${prettyKind} loaded on ${board.name}. ${board.kind === "video" ? "Video glide and sound preview are ready." : "Sound wave preview is ready."}`
    highlightBtn?.classList.toggle("active", !!board.highlighted)
    if(highlightBtn) highlightBtn.textContent = board.highlighted ? "Highlight Locked" : "Highlight Section"
    if(gigSettings) gigSettings.hidden = remoteState.mode !== "video"
    if(board.kind === "empty"){
      revokePreview()
      drawWaveform(false)
    }else if(board.file){
      revokePreview()
      try{
        remoteState.previewUrl = URL.createObjectURL(board.file)
        if(board.kind === "video" && boardPreviewVideo){
          boardPreviewVideo.src = remoteState.previewUrl
          boardPreviewVideo.hidden = false
          if(boardPreviewMediaWrap) boardPreviewMediaWrap.hidden = false
          remoteState.previewMediaEl = boardPreviewVideo
        }else if(boardPreviewAudio){
          boardPreviewAudio.src = remoteState.previewUrl
          boardPreviewAudio.hidden = false
          if(boardPreviewMediaWrap) boardPreviewMediaWrap.hidden = false
          remoteState.previewMediaEl = boardPreviewAudio
        }
      }catch{}
      drawWaveform(false)
    }
    const status = qs("#floatBoardStatus")
    if(status) status.textContent = `${board.name} selected. ${board.kind === "empty" ? "Upload fresh material or record directly." : `Working on ${board.fileName || board.kind} now.`}`
    syncQuickStudioSheet()
  }
  function setActiveBoard(btn){
    qsa(".float-board").forEach(el => el.classList.remove("active"))
    btn?.classList.add("active")
    remoteState.activeBoard = Math.max(0, Number(btn?.dataset.floatBoard || 1) - 1)
    renderBoard()
  }
  function loadFileToBoard(file, kindOverride){
    if(!file) return
    snapshotBoards()
    revokePreview()
    try{ stopBoardMixPreview(true) }catch{}
    const idx = remoteState.activeBoard
    remoteState.boards[idx] = {
      ...emptyBoard(idx),
      name: remoteState.boards[idx]?.name || emptyBoard(idx).name,
      kind: kindOverride || (String(file.type || "").startsWith("video/") ? "video" : "audio"),
      fileName: file.name,
      fileType: file.type || "",
      trimStart: 10,
      trimEnd: 90,
      highlighted: false,
      exported: "",
      duration: 0,
      file
    }
    remoteState.previewUrl = URL.createObjectURL(file)
    if(quickEditStatus) quickEditStatus.textContent = `${file.name} loaded into ${remoteState.boards[idx].name}. Play, trim, delete, or export it fast.`
    renderBoard()
  }
  function highlightBoard(){
    const board = getBoard()
    if(board.kind === "empty"){
      openMiniWindow("Highlight", "Upload or record something first so we can highlight a section.")
      return
    }
    const start = Math.min(Number(trimStart?.value || 10), Number(trimEnd?.value || 90) - 1)
    const end = Math.max(Number(trimEnd?.value || 90), start + 1)
    board.trimStart = start
    board.trimEnd = end
    board.highlighted = true
    renderBoard()
    if(quickEditStatus) quickEditStatus.textContent = `${board.name} highlighted from ${start}% to ${end}%.`
  }
  function syncTrimInputs(source){
    const startVal = Number((source === "number" ? trimStartNumber?.value : trimStart?.value) || 10)
    const endVal = Number((source === "number" ? trimEndNumber?.value : trimEnd?.value) || 90)
    const safeStart = Math.max(0, Math.min(95, startVal))
    const safeEnd = Math.max(safeStart + 1, Math.min(100, endVal))
    if(trimStart) trimStart.value = String(safeStart)
    if(trimEnd) trimEnd.value = String(safeEnd)
    if(trimStartNumber) trimStartNumber.value = String(safeStart)
    if(trimEndNumber) trimEndNumber.value = String(safeEnd)
  }
  function deleteHighlighted(){
    const board = getBoard()
    if(board.kind === "empty" || !board.highlighted){
      openMiniWindow("Delete Section", "Highlight a section first so we know what to remove.")
      return
    }
    snapshotBoards()
    board.highlighted = false
    board.exported = `Section ${board.trimStart}% → ${board.trimEnd}% removed`
    board.trimStart = 10
    board.trimEnd = 90
    renderBoard()
    if(quickEditStatus) quickEditStatus.textContent = `${board.name} had the highlighted section removed.`
  }
  function updateBoardFxState(){
    const board = getBoard()
    if(!board || board.kind === "empty") return
    board.instrument = instrumentTypeInput?.value || board.instrument || "voice"
    board.fxPreset = fxPresetInput?.value || board.fxPreset || "clean"
    board.gigFilter = gigFilterInput?.value || board.gigFilter || "natural"
    board.gigPan = gigPanInput?.value || board.gigPan || "standard"
    board.gigFrameRate = gigFrameRateInput?.value || board.gigFrameRate || "24"
    board.gigZoom = gigZoomInput?.value || board.gigZoom || "1x"
    board.gigSlowMotion = gigSlowMotionInput?.value || board.gigSlowMotion || "off"
    renderBoard()
    if(quickEditStatus){
      quickEditStatus.textContent = remoteState.mode === "video"
        ? `${board.name} video lane tuned: ${board.gigFilter} filter · ${board.gigFrameRate} FPS · ${board.gigZoom} zoom.`
        : `${board.name} sound lane tuned: ${board.instrument} · ${board.fxPreset} FX preset.`
    }
  }
  function exportBoard(destination){
    const filledBoards = remoteState.boards.filter(board => board && board.kind !== "empty")
    if(!filledBoards.length){
      openMiniWindow("Export", "Upload or record something first so we can export it.")
      return
    }
    const board = getBoard()
    board.exported = destination
    renderBoard()
    const primary = filledBoards[0]
    const ext = destination === "Main Studio"
      ? (primary.kind === "video" ? "mp4" : "m4a")
      : destination === "TikTok"
        ? (primary.kind === "video" ? "mp4" : "mp3")
        : (primary.kind === "video" ? "mp4" : "m4a")
    if(primary.file){
      const url = URL.createObjectURL(primary.file)
      const link = document.createElement("a")
      link.href = url
      link.download = `SupportRD-${destination.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.${ext}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(()=>URL.revokeObjectURL(url), 1500)
    }
    if(destination === "Main Studio"){
      localStorage.setItem("supportrdFloatExport", JSON.stringify({
        board: board.name,
        fileName: board.fileName || `${board.kind}-take`,
        kind: board.kind,
        trimStart: board.trimStart,
        trimEnd: board.trimEnd,
        destination
      }))
      if(typeof window.openStudioMode === "function"){
        openMiniWindow("Export Into Main Studio", `${board.name} is handed off to Studio for deeper editing.`)
        closeFloat()
        window.openStudioMode()
        return
      }
    }
    if(quickEditStatus) quickEditStatus.textContent = `${board.name} exported to ${destination}. Reset or upload new material to keep moving.`
    openMiniWindow("Export", `${board.name} exported to ${destination}.`)
  }
  function startVoiceRecord(kind){
    if(!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)){
      openMiniWindow("Record", "Recording is not available on this device right now.")
      return
    }
    if(remoteState.recorder && remoteState.recorder.state === "recording"){
      stopVoiceRecord()
    }
    navigator.mediaDevices.getUserMedia({audio:true}).then((stream)=>{
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : ""
      const audioContext = window.AudioContext ? new AudioContext() : (window.webkitAudioContext ? new webkitAudioContext() : null)
      if(audioContext){
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 2048
        source.connect(analyser)
        remoteState.analyser = analyser
      }
      remoteState.recordStream = stream
      remoteState.recordStartedAt = Date.now()
      remoteState.recordChunks = []
      remoteState.recorder = new MediaRecorder(stream, mimeType ? {mimeType} : undefined)
      remoteState.recorder.ondataavailable = (event)=>{
        if(event.data?.size) remoteState.recordChunks.push(event.data)
      }
      remoteState.recorder.onstop = ()=>{
        const blob = new Blob(remoteState.recordChunks, {type: mimeType || "audio/webm"})
        const file = new File([blob], `${kind}-take.webm`, {type: blob.type})
        const duration = (Date.now() - remoteState.recordStartedAt) / 1000
        stopWaveform()
        loadFileToBoard(file, kind)
        const active = getBoard()
        active.duration = duration
        renderBoard()
      }
      remoteState.recorder.start()
      holdSingleAssistantTeleport("projake", {
        x: window.innerWidth * 0.28,
        y: window.innerHeight * 0.66
      }, 6000, {
        mood: "focus",
        status: "Jake teleported into the lower-left studio lane while the motherboard started receiving new material."
      })
      drawWaveform(true)
      if(quickEditStatus) quickEditStatus.textContent = `${kind === "instrument" ? "Instrument" : "Voice"} recording is live on ${getBoard().name}. Press Pause to save it into the board.`
      if(boardMode) boardMode.textContent = `${kind === "instrument" ? "Instrument" : "Voice"} recording is live. Sound waves are being drawn into ${getBoard().name}.`
      setRemoteStatus(`${kind === "instrument" ? "Instrument" : "Voice"} recording started on ${getBoard().name}.`)
    }).catch(()=>{
      openMiniWindow("Record", "Microphone access was blocked. We need mic permission to record.")
    })
  }
  function stopVoiceRecord(){
    if(remoteState.recorder && remoteState.recorder.state !== "inactive"){
      remoteState.recorder.stop()
      remoteState.recorder = null
      return true
    }
    stopWaveform()
    return false
  }
  function openRemoteFullSettingsLane(options = {}){
    try{ syncFloatSettings() }catch{}
    try{ renderSettingsAccountSummary?.() }catch{}
    try{ updateSubscriptionSummary?.(state.subscription || state.socialLinks?.subscription || "free", state.socialLinks || null) }catch{}
    if(qs("#setEmail")) qs("#setEmail").value = state.socialLinks?.email || qs("#setEmail").value || ""
    if(qs("#setPhone")) qs("#setPhone").value = state.socialLinks?.phone || qs("#setPhone").value || ""
    if(qs("#setAddress")) qs("#setAddress").value = state.socialLinks?.address || qs("#setAddress").value || ""
    if(qs("#setPassword")) qs("#setPassword").value = ""
    if(typeof openModal === "function"){
      openModal("settingsModal")
    }else{
      openGeneralInfoPage?.("settings")
    }
    setRemoteStatus(options.message || "Full Settings is open with account links, password, address, push, and payment verification.")
    if(configStatus) configStatus.textContent = "Full Settings is open. Review account links, password, address, push alerts, and current payments."
  }

  function syncProfile(){
    const name = (state.socialLinks && (state.socialLinks.username || state.socialLinks.name)) || "SupportRD Host"
    if(profileName) profileName.textContent = name
    if(profileMeta){
      profileMeta.textContent = `${getActiveAssistant().name} active · ${state.socialLinks?.credentialTheme || "identity ready"} · ${state.socialLinks?.interests || "hair mission route"}`
    }
    if(profileHistory){
      const canViewHistory = localStorage.getItem("loggedIn") === "true" || shouldAutoOwnerEntry()
      if(!canViewHistory){
        profileHistory.textContent = "Sign in to keep Aria / Jake history saved to your account."
      }else{
        const history = (state.ariaHistory || []).slice(0,2)
        profileHistory.textContent = history.length
          ? `Last 2 Aria / Jake lines: ${history.join(" / ")}`
          : "Last 2 Aria / Jake lines will appear here after you talk with them."
      }
    }
    if(profileQualityTitle){
      profileQualityTitle.textContent = `General AI Summary · ${String(state.socialLinks?.username || state.socialLinks?.name || "SupportRD").replace(/^\^\^/, "").trim() || "SupportRD"}`
    }
    if(profileQualityBody){
      profileQualityBody.textContent = state.socialLinks?.generalSummary || buildProfileGeneralSummary()
    }
    if(profileCredentialsSummary) profileCredentialsSummary.textContent = state.socialLinks?.credentialSummary || buildProfileCredentialSummary()
    if(profileLatestResult) profileLatestResult.textContent = state.socialLinks?.scanLatestShort || buildLatestVerifiedResult()
    ;[profileHero].forEach(node=>{
      if(!node) return
      if(state.userAvatar){
        node.style.backgroundImage = `linear-gradient(145deg, rgba(10,22,42,.26), rgba(10,22,42,.1)), url("${state.userAvatar}")`
        node.style.backgroundSize = "cover"
        node.style.backgroundPosition = "center"
        node.textContent = ""
      }else{
        node.style.backgroundImage = ""
      }
    })
    syncDiaryAndProfileExtras()
  }
  function syncFloatSettings(){
    const saved = state.socialLinks || {}
    const valueMap = {
      floatLinkFacebook: saved.fb || "",
      floatLinkGoogle: saved.google || "",
      floatLinkBing: saved.bing || "",
      floatLinkTikTok: saved.tiktok || "",
      floatLinkInstagram: saved.ig || "",
      floatLinkWhatsApp: saved.whatsapp || saved.evelyn || "",
      floatLinkYouTube: saved.yt || "",
      floatLinkX: saved.x || "",
      floatLinkLinkedIn: saved.linkedin || "",
      floatLinkSnapchat: saved.snapchat || ""
    }
    Object.entries(valueMap).forEach(([id, value])=>{
      const el = qs(`#${id}`)
      if(el) el.value = value
    })
    const push = qs("#floatConfigPush")
    if(push) push.checked = !!saved.pushAria
    renderDiarySocialLinkRow()
    syncDiaryAndProfileExtras()
  }
  function saveFloatSettings(){
    state.socialLinks = state.socialLinks || {}
    const email = state.socialLinks?.email || ""
    const password = state.socialLinks?.passwordPreview || ""
    const address = state.socialLinks?.address || ""
    const phone = state.socialLinks?.phone || ""
    const language = state.socialLinks?.language || "English"
    const extras = {
      google: qs("#floatLinkGoogle")?.value.trim() || "",
      bing: qs("#floatLinkBing")?.value.trim() || "",
      whatsapp: qs("#floatLinkWhatsApp")?.value.trim() || "",
      linkedin: qs("#floatLinkLinkedIn")?.value.trim() || "",
      snapchat: qs("#floatLinkSnapchat")?.value.trim() || "",
      language
    }
    const pushAria = qs("#pushAria")
    if(pushAria) pushAria.checked = !!qs("#floatConfigPush")?.checked
    state.socialLinks = {
      ...(state.socialLinks || {}),
      email,
      address,
      phone,
      passwordPreview: password ? "updated" : (state.socialLinks?.passwordPreview || ""),
      ig: qs("#floatLinkInstagram")?.value.trim() || "",
      tiktok: qs("#floatLinkTikTok")?.value.trim() || "",
      fb: qs("#floatLinkFacebook")?.value.trim() || "",
      yt: qs("#floatLinkYouTube")?.value.trim() || "",
      x: qs("#floatLinkX")?.value.trim() || "",
      evelyn: extras.whatsapp,
      pushAria: !!qs("#floatConfigPush")?.checked,
      ...extras
    }
    localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
    renderDiarySocialLinkRow()
    if(configStatus) configStatus.textContent = `Settings trimmed down. Push notifications are ${state.socialLinks.pushAria ? "armed" : "off"}, and Diary social links are saved.`
    showSettingsGuide("overview")
    syncProfile()
    openMiniWindow("SupportRD Settings", "Push notification preference and Diary social routes are saved.")
  }
  function getMapActionRoute(view, action){
    const haystack = `${view?.key || ""} ${view?.label || ""} ${view?.perk || ""} ${view?.helper || ""} ${action?.label || ""} ${action?.detail || ""}`.toLowerCase()
    if(/lumber|deep voice|echo|reverb|fx|beat|song|studio|motherboard|audio|video/.test(haystack)) return { route:"studio", panel:"floatBoardsBox", status:"Studio Quick Panel is now focused for this map perk." }
    if(/diary|live|social|post|comment|heart|gift/.test(haystack)) return { route:"diary", panel:"floatSettingsBox", status:"Diary Mode is now focused for this map perk." }
    if(/profile|credential|identity|summary|verified/.test(haystack)) return { route:"profile", panel:"floatAssistantBox", status:"Profile is now focused for this map perk." }
    if(/payment|pay|gift|premium|checkout|support/.test(haystack)) return { route:"payments", panel:"payments", status:"Fast Pay is now focused for this map perk." }
    if(/faq|reel|event|paintball|guide|help/.test(haystack)) return { route:"faq", panel:"floatLiveBox", status:"FAQ Lounge is now focused for this map perk." }
    return { route:"map", panel:"floatDeviceBox", status:"Map Change stays focused for this perk." }
  }
  function advanceMapPerk(viewKey, currentIndex){
    if(!viewKey) return null
    const views = typeof window.getWorldViews === "function" ? window.getWorldViews() : []
    const view = views.find(item=>item.key === viewKey)
    const actions = Array.isArray(view?.actions) ? view.actions : []
    if(actions.length < 2) return null
    const nextIndex = (Number(currentIndex || 0) + 1) % actions.length
    const next = actions[nextIndex]
    return next ? { index: nextIndex, action: next } : null
  }
  function renderMapFeatureActions(view){
    if(!mapActionHost) return
    const actions = Array.isArray(view?.actions) ? view.actions : []
    if(!actions.length){
      mapActionHost.innerHTML = ""
      mapActionHost.hidden = true
      return
    }
    mapActionHost.hidden = false
    mapActionHost.innerHTML = actions.map((action, index)=>`
      <button class="float-map-action" type="button" data-float-map-action="${index}" data-float-map-key="${view.key}">
        <strong>${action.label}</strong>
        <span>${action.detail}</span>
      </button>
    `).join("")
  }
  function getMapFavoriteCounts(){
    try{
      return JSON.parse(localStorage.getItem("supportrdMapFavoriteCounts") || "{}")
    }catch{
      return {}
    }
  }
  function rememberMapFavorite(viewKey){
    const counts = getMapFavoriteCounts()
    counts[viewKey] = Number(counts[viewKey] || 0) + 1
    localStorage.setItem("supportrdMapFavoriteCounts", JSON.stringify(counts))
  }
  function getTopMapFavorites(limit = 3){
    return Object.entries(getMapFavoriteCounts()).sort((a,b)=>Number(b[1] || 0) - Number(a[1] || 0)).slice(0, limit).map(entry=>entry[0])
  }
  function syncMapHero(viewKey = "default"){
    const views = typeof window.getWorldViews === "function" ? window.getWorldViews() : []
    const activeView = views.find(view=>view.key === viewKey) || views[0] || {
      key:"default",
      label:"SupportRD Default",
      helper:"The default woman-waking-up takeover stays active for the light SupportRD route.",
      perk:"Remote ready"
    }
    if(mapHero) mapHero.dataset.mapView = activeView.key || "default"
    syncRemoteLaunchVisual(activeView.key || "default")
    if(mapHeroTitle) mapHeroTitle.textContent = activeView.label || "SupportRD Default"
    if(mapHeroBody) mapHeroBody.textContent = `${activeView.helper || "SupportRD keeps the route clear and travel-ready."} ${activeView.perk ? `Extra feature: ${activeView.perk}.` : ""}`.trim()
    renderMapFeatureActions(activeView)
  }
  function renderThemeCards(){
    if(!themeCardRail) return
    const views = typeof window.getWorldViews === "function" ? window.getWorldViews() : []
    const favoriteKeys = getTopMapFavorites(3)
    themeCardRail.innerHTML = views.slice(0,6).map(view => `
      <button class="float-theme-card ${favoriteKeys.includes(view.key) ? "favorite" : ""}" type="button" data-float-theme="${view.key}">
        <strong>${view.label}</strong>
        <span>${view.perk}${favoriteKeys.includes(view.key) ? " · Favorite map aura" : ""}</span>
      </button>
    `).join("")
    syncMapHero(shell?.dataset?.remoteTheme || "default")
  }
  function setDiaryGpsMode(active){
    if(diaryPanels) diaryPanels.hidden = !!active
    if(diaryGpsStage) diaryGpsStage.hidden = !active
    if(diaryExitGpsBtn) diaryExitGpsBtn.hidden = !active
    if(settingsStatus){
      settingsStatus.textContent = active
        ? "GPS Mode is active. Diary is focused on direction, storefront movement, and the next route."
        : "Diary Mode is back in writing / handsfree / GPS preview mode."
    }
  }
  function saveDiaryEntry(){
    const text = (qs("#floatDiaryInput")?.value || "").trim()
    const transcript = (handsfreeTranscript?.value || "").trim()
    const socialPost = (diarySocialPost?.value || "").trim()
    const payload = {
      text,
      transcript,
      socialPost,
      savedAt: new Date().toISOString()
    }
    localStorage.setItem("supportrdDiaryEntry", JSON.stringify(payload))
    renderDiaryPagePreview(remoteState.diaryPageIndex || 0)
    if(settingsStatus) settingsStatus.textContent = text || transcript
      ? "Diary saved. Your latest thought and handsfree notes are preserved in Remote."
      : "Diary saved as an empty reset so you can start clean."
    openMiniWindow("Diary Saved", text || transcript ? "Diary entry saved in SupportRD Remote." : "Diary reset saved for a fresh start.")
  }
  function exportDiaryPdf(){
    const text = (qs("#floatDiaryInput")?.value || "").trim()
    const transcript = (handsfreeTranscript?.value || "").trim()
    const html = `
      <html><head><title>SupportRD Diary Export</title><style>
      body{font-family:Georgia,serif;padding:28px;color:#10233f;}
      h1{margin-bottom:6px;} h2{margin:18px 0 8px;}
      pre{white-space:pre-wrap;line-height:1.55;background:#f3f7fb;padding:16px;border-radius:12px;}
      </style></head><body>
      <h1>SupportRD Diary Export</h1>
      <div>${new Date().toLocaleString()}</div>
      <h2>Diary Page</h2><pre>${(text || "No diary text yet.").replace(/</g,"&lt;")}</pre>
      <h2>Send To Social</h2><pre>${((diarySocialPost?.value || "").trim() || "No social post staged yet.").replace(/</g,"&lt;")}</pre>
      <h2>Handsfree Transcript</h2><pre>${(transcript || "No handsfree transcript yet.").replace(/</g,"&lt;")}</pre>
      </body></html>
    `
    const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=700")
    if(!win){
      openMiniWindow("Export PDF", "Popup was blocked, but the diary export is ready. Try again and save as PDF from print.")
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(()=>win.print(), 200)
    openMiniWindow("Export PDF", "Diary export opened. Use Save as PDF in the print window for your PDF copy.")
  }
  function toggleHandsfreeMode(){
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if(remoteState.handsfreeActive && remoteState.handsfreeRecognition){
      remoteState.handsfreeRecognition.stop()
      remoteState.handsfreeActive = false
      if(settingsStatus) settingsStatus.textContent = "Handsfree mode paused."
      return
    }
    if(!Speech){
      openMiniWindow("Handsfree Mode", "Speech recognition is not available on this device right now.")
      return
    }
    const recognition = new Speech()
    recognition.lang = "en-US"
    recognition.interimResults = true
    recognition.continuous = true
    recognition.onresult = (event)=>{
      let finalText = ""
      for(let i = 0; i < event.results.length; i += 1){
        finalText += `${event.results[i][0].transcript} `
      }
      if(handsfreeTranscript) handsfreeTranscript.value = finalText.trim()
    }
    recognition.onend = ()=>{
      remoteState.handsfreeActive = false
    }
    recognition.start()
    remoteState.handsfreeRecognition = recognition
    remoteState.handsfreeActive = true
    if(settingsStatus) settingsStatus.textContent = "Handsfree mode is live. SupportRD is transcribing the conversation below."
    openMiniWindow("Handsfree Mode", "Handsfree transcription is live. Talk naturally and we will keep the details below.")
  }
    function setActiveTouchPanel(targetId, message){
      closeRemoteSheet()
      const finalTarget = targetId || defaultFloatPanel
      shell.classList.remove("touch-home")
      shell.classList.add("panel-open")
      remoteState.currentPanel = finalTarget
      localStorage.setItem(floatPanelKey, finalTarget)
      launchButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.floatTarget === finalTarget))
      const boxes = qsa(".float-box")
      boxes.forEach(box =>{
        box.hidden = box.id !== finalTarget
        box.classList.remove("float-box-focus")
      })
      const target = qs(`#${finalTarget}`)
      if(target){
        target.hidden = false
        target.classList.add("float-box-focus")
        target.scrollIntoView({behavior:"smooth", block:"start", inline:"nearest"})
        setTimeout(()=>target.classList.remove("float-box-focus"), 1800)
      }
      shell.classList.add("touch-optimized")
      if(message) openMiniWindow("Float Remote", message)
    }
  function focusFloatSection(targetId, message){
    setActiveTouchPanel(targetId, message)
  }
  function openFloat(options = {}){
    shell.hidden = false
    shell.setAttribute("aria-hidden","false")
    shell.classList.toggle("preview-mode", !!options.previewOnly)
    document.body.classList.add("float-mode-active")
    document.body.classList.add("remote-home-active")
    hideTGuide()
    if(!options.previewOnly){
      document.body.classList.remove("launch-active")
    document.body.classList.remove("launch-preview-active")
    }
    syncProfile()
    syncFloatSettings()
    renderThemeCards()
    syncMapHero(shell?.dataset?.remoteTheme || "default")
    setRemoteGoMode(false)
    updateDiarySelfieMode()
    diarySelfiePreview?.classList.toggle("is-pano", !!remoteState.selfiePanorama)
    if(!options.preserveRoute){
      syncRemoteHistory("home", window.location.pathname === "/remote" || window.location.pathname === "/remote/home")
    }
    setFloatHome(options.preserveHome ? "" : "Remote Home is ready for people on the go. GPS, quick studio, payment, profile, and FAQ are each one tap away.")
    setRemoteAdsHidden(localStorage.getItem("supportrdRemoteAdsHidden") === "true")
    setDiaryGpsMode(false)
    if(!options.previewOnly){
      localStorage.setItem(floatPrimeSeenKey, "true")
      hidePrimeMenu()
      if(isFounderPriority()) setTimeout(()=>showFounderLayer(), 280)
      else hideFounderLayer()
    }
    if(!options.previewOnly){
      if(!options.preserveHome) setRemoteStatus("SupportRD Personal Remote is open in on-the-go mode. Use one tap for GPS, studio, payment, diary, profile, and FAQ while the rest of the site stays out of the way.")
    }
    const activeRoute = getRemoteRouteFromLocation()
    if(activeRoute && activeRoute !== "home"){
      setTimeout(()=>renderRemoteRoute(activeRoute, { skipHistory:true }), 0)
    }
  }
  function closeFloat(){
    stopRemoteGuide()
    stopDiarySelfieCamera()
    hidePrimeMenu()
    hideFounderLayer()
    hideTGuide()
    shell.hidden = true
    shell.setAttribute("aria-hidden","true")
    shell.classList.remove("preview-mode")
    document.body.classList.remove("float-mode-active")
    document.body.classList.remove("remote-home-active")
  }
  openBtn?.addEventListener("click", openFloat)
  studioBtn?.addEventListener("click", openFloat)
  qs("#openLiveArenaBtn")?.setAttribute("hidden", "hidden")
  closeBtn?.addEventListener("click", ()=>setFloatHome("Remote home is ready."))
  returnMainBtn?.addEventListener("click", ()=>setFloatHome("Remote home is open and ready."))
  goViewBtn?.addEventListener("click", ()=>{
    const nextState = !shell?.classList.contains("remote-go-mode")
    setRemoteGoMode(nextState)
    if(nextState) setFloatHome("On-the-go Remote view is active. Tap a Remote button and keep moving.")
  })
  remoteSheetBack?.addEventListener("click", ()=>closeRemoteSheet())
  remoteSheetClose?.addEventListener("click", ()=>closeRemoteSheet())
  openStudioBtn?.addEventListener("click", ()=>showAllFloatPanels("All Remote panels are open together now."))
  remoteStageGpsBtn?.addEventListener("click", ()=>renderRemoteRoute("map"))
  remoteStageStudioBtn?.addEventListener("click", ()=>renderRemoteRoute("studio"))
  remoteStagePaymentBtn?.addEventListener("click", ()=>window.openRemoteFastPay?.())
  diarySelfieBtn?.addEventListener("click", ()=>startDiarySelfieCamera())
  diarySelfieSnapBtn?.addEventListener("click", ()=>captureDiarySelfie())
  diaryPanoramaBtn?.addEventListener("click", ()=>toggleDiaryPanorama())
  diaryFilterChips.forEach((chip)=>chip.addEventListener("click", ()=>{
    remoteState.selfieFilter = chip.dataset.diaryFilter || "clean"
    updateDiarySelfieMode()
    if(diarySelfieStatus){
      const active = diarySelfieFilters[remoteState.selfieFilter] || diarySelfieFilters.clean
      diarySelfieStatus.textContent = `${active.label} is active for the Diary selfie lane. Capture the look when the hair sits right.`
    }
  }))
  launchButtons.forEach(btn => btn.addEventListener("click", ()=>{
    const targetId = btn.dataset.floatTarget
    const route = getRemoteRouteForTarget(targetId)
    renderRemoteRoute(route, { openShell:true })
  }))
  touchQuery?.addEventListener?.("change", ()=>setActiveTouchPanel(qsa(".float-launch-btn.active")[0]?.dataset.floatTarget || defaultFloatPanel))
  navHomeBtn?.addEventListener("click", ()=>setFloatHome("Remote home is ready for travel mode. GPS, studio, profile, FAQ, and payment are one tap away."))
  navDiaryBtn?.addEventListener("click", ()=>renderRemoteRoute("diary"))
  navProfileBtn?.addEventListener("click", ()=>renderRemoteRoute("profile"))
  navBoothBtn?.addEventListener("click", ()=>{
    localStorage.setItem("supportrdStudioReturnView", "remote")
    if(typeof window.openStudioMode === "function"){
      closeFloat()
      window.openStudioMode()
    }else{
      setActiveTouchPanel("floatBoardsBox", "Studio Quick Panel is ready.")
    }
  })
  navGpsBtn?.addEventListener("click", ()=>renderRemoteRoute("map"))
  navSettingsBtn?.addEventListener("click", ()=>renderRemoteRoute("settings"))
  navCloseBtn?.addEventListener("click", closeFloat)
  footerGuideBtn?.addEventListener("click", ()=>openGeneralInfoPage("guide"))
  footerSettingsBtn?.addEventListener("click", ()=>openGeneralInfoPage("settings"))
  footerPaymentsBtn?.addEventListener("click", ()=>window.openRemoteFastPay?.())
  footerSubscribeBtn?.addEventListener("click", ()=>openGeneralInfoPage("subscribe"))
  footerBlogBtn?.addEventListener("click", ()=>openGeneralInfoPage("blog"))
  footerOfficialBtn?.addEventListener("click", ()=>openGeneralInfoPage("official"))
      document.addEventListener("click", (event)=>{
        const footerGeneralBtn = event.target?.closest?.("#floatFooterGuide,#floatFooterSettings,#floatFooterPayments,#floatFooterSubscribe,#floatFooterBlog,#floatFooterOfficial,#floatFooterOfficialBottom")
        if(footerGeneralBtn){
          event.preventDefault()
          event.stopPropagation()
          if(footerGeneralBtn.id === "floatFooterPayments"){
            window.openRemoteFastPay?.()
            return
          }
          const routeMap = {
            floatFooterGuide: "guide",
            floatFooterSettings: "settings",
            floatFooterSubscribe: "subscribe",
            floatFooterBlog: "blog",
            floatFooterOfficial: "official",
            floatFooterOfficialBottom: "official"
          }
          openGeneralInfoPage(routeMap[footerGeneralBtn.id] || "guide")
          return
        }
        const purchaseBtn = event.target?.closest?.("#remotePurchasePremium,#remotePurchaseProducts")
        if(!purchaseBtn) return
        event.preventDefault()
        event.stopPropagation()
        if(purchaseBtn.id === "remotePurchaseProducts"){
          openRemoteSheet("Product Page", buildProductPageSheet(), { message:"Product Page is open inside Remote.", className:"remote-sheet-blog", route:"payments" })
          return
        }
        window.openRemoteFastPay?.()
        setRemoteStatus("Premium and Pro checkout lanes are open.")
      })
      footerOfficialBottomBtn?.addEventListener("click", ()=>footerOfficialBtn?.click())
      remoteAdsToggleBtn?.addEventListener("click", ()=>setRemoteAdsHidden(!document.body.classList.contains("remote-hide-ads")))
      remoteAdsFocusBtn?.addEventListener("click", ()=>setRemoteAdsHidden(true))
      remotePurchaseProductsBtn?.addEventListener("click", ()=>{
        openRemoteSheet("Product Page", buildProductPageSheet(), { message:"Product Page is open inside Remote.", className:"remote-sheet-blog", route:"payments" })
      })
      remotePurchasePremiumBtn?.addEventListener("click", ()=>{
          window.openRemoteFastPay?.()
          setRemoteStatus("Premium and Pro checkout lanes are open.")
        })
        remotePurchaseStudioBtn?.addEventListener("click", ()=>{
          openRemoteSheet("Purchase Studio Edition", `
          ${renderRemoteValueLane(["Value: flagship creation room", "Energy: highest work lane", "Worth: deep editing, export, and masterpiece finishing"])}
          <div class="float-sheet-grid">
            <button class="btn" data-open-fastpay>Open Studio Edition Checkout</button>
            <button class="btn ghost" data-open-panel="floatBoardsBox">Review Studio Quick Panel</button>
          </div>
          <div class="float-sheet-copy">Studio Edition is the fast handoff from the 3 quick motherboards into the deeper SupportRD build room.</div>
        `, { message:"Studio Edition purchase lane is ready.", route:"payments" })
      })
      remotePurchaseThemesBtn?.addEventListener("click", ()=>{
        openRemoteSheet("Purchase Themes & AI Upgrades", `
          ${renderRemoteValueLane(["Value: occasion selling engine", "Energy: visual + assistant upgrades", "Worth: premium map themes and stronger Aria/Jake help"])}
          <div class="float-sheet-grid">
            <button class="btn" data-open-panel="floatDeviceBox">Open Map Change</button>
            <button class="btn ghost" data-open-fastpay>Open Upgrade Checkout</button>
          </div>
          <div class="float-sheet-copy">Themes and AI upgrades make the Remote feel richer, more professional, and more specific to each session mood.</div>
        `, { message:"Themes and AI upgrade lanes are open.", route:"payments" })
      })
        remotePurchaseSupportBtn?.addEventListener("click", ()=>{
          openRemoteSheet("Show Support", `
          ${renderRemoteValueLane(["Value: direct session support", "Energy: fast generosity lane", "Worth: tips, credit, donation, and shoutout support"])}
          <div class="float-sheet-grid">
            <button class="btn" data-open-fastpay>Tip / Credit SupportRD</button>
            <button class="btn ghost" data-open-panel="floatLiveBox">Open FAQ Lounge</button>
          </div>
          <div class="float-sheet-copy">SupportRD can receive quick support, tip money, donation energy, and checkout credit without ever leaving the Remote shell.</div>
          `, { message:"Support, donate, tip, and credit lanes are open.", route:"payments" })
        })
        remotePurchaseCustomBtn?.addEventListener("click", ()=>{
          openRemoteSheet("Custom Order", `
            ${renderRemoteValueLane(["Value: custom service intake", "Energy: high-touch order review", "Worth: clean email-based order verification"])}
            <div class="float-sheet-grid">
              <button class="btn" data-link-open="${LINKS.custom}">Open Custom Order Page</button>
              <button class="btn ghost" data-sheet-close>Close Page</button>
            </div>
            <div class="float-sheet-copy">Use Custom Order when you need a real email-backed order request and want to separate true demand from fake messages.</div>
          `, { message:"Custom order page is ready.", route:"payments" })
        })
        remotePurchaseOrdersBtn?.addEventListener("click", ()=>{
          openRemoteSheet("My Orders / Cart", `
            ${renderRemoteValueLane(["Value: checkout continuity", "Energy: low-friction buyer follow-up", "Worth: order review + cart recovery"])}
            <div class="float-sheet-grid">
              <button class="btn" data-link-open="${LINKS.myOrders}">Open My Orders</button>
              <button class="btn ghost" data-link-open="${LINKS.cart}">Open Cart</button>
            </div>
            <div class="float-sheet-copy">This lane keeps real buyers moving without losing the premium SupportRD shell.</div>
          `, { message:"Orders and cart lane is open.", route:"payments" })
        })
        remotePurchaseSolidBtn?.addEventListener("click", ()=>{
          openRemoteSheet("Solid State Project", buildSolidStateSheet(), { message:"Solid State checklist is open.", className:"remote-sheet-blog", route:"solid" })
        })
        remoteScenarioButtons.forEach(btn => btn.addEventListener("click", ()=>{
          const key = btn.getAttribute("data-aria-scenario")
          if(key) openScenarioSheet(key)
        }))
        remoteEditsProductBtn?.addEventListener("click", ()=>openEditsTopicSheet("product"))
        remoteEditsVirtualBtn?.addEventListener("click", ()=>openEditsTopicSheet("virtual"))
        remoteEditsActualBtn?.addEventListener("click", ()=>openEditsTopicSheet("actual"))
        remoteEditsBudgetBtn?.addEventListener("click", ()=>openEditsTopicSheet("budget"))
        remoteEditsMeetingsBtn?.addEventListener("click", ()=>openEditsTopicSheet("meetings"))
        remoteEditsTimingBtn?.addEventListener("click", ()=>openEditsTopicSheet("timing"))
        remoteEditsStudyBtn?.addEventListener("click", ()=>openEditsTopicSheet("study"))
        remoteInfoSigninBtn?.addEventListener("click", ()=>{
          openOptionalSigninSheet()
        })
        remoteInfoPrivacyBtn?.addEventListener("click", ()=>openImportantInfoSheet("privacy"))
        remoteInfoAboutBtn?.addEventListener("click", ()=>openImportantInfoSheet("about"))
        remoteInfoContactBtn?.addEventListener("click", ()=>openImportantInfoSheet("contact"))
        remoteInfoOfficialBtn?.addEventListener("click", ()=>openImportantInfoSheet("official"))
        remoteInfoFooterBtn?.addEventListener("click", ()=>openImportantInfoSheet("privacy"))
        renderLatestSupportAds()
        const purchasePager = createStickyPager(remotePurchaseEditor, remotePurchaseItems, remotePurchaseCount, remotePurchaseToggleBtn)
        remotePurchasePrevBtn?.addEventListener("click", e=>{
          e.stopPropagation()
          purchasePager.prev()
        })
        remotePurchaseNextBtn?.addEventListener("click", e=>{
          e.stopPropagation()
          purchasePager.next()
        })
        remotePurchaseToggleBtn?.addEventListener("click", e=>{
          e.stopPropagation()
          purchasePager.toggle()
        })
        remotePurchaseEditor?.addEventListener("click", e=>{
          if(remotePurchaseEditor.classList.contains("is-collapsed")){
            e.preventDefault()
            purchasePager.expand()
          }
        })
        const editsPager = createStickyPager(remoteEditsMenu, remoteEditsItems, remoteEditsCount, remoteEditsToggleBtn)
        remoteEditsPrevBtn?.addEventListener("click", e=>{
          e.stopPropagation()
          editsPager.prev()
        })
        remoteEditsNextBtn?.addEventListener("click", e=>{
          e.stopPropagation()
          editsPager.next()
        })
        remoteEditsToggleBtn?.addEventListener("click", e=>{
          e.stopPropagation()
          editsPager.toggle()
        })
        remoteEditsMenu?.addEventListener("click", e=>{
          if(remoteEditsMenu.classList.contains("is-collapsed")){
            e.preventDefault()
            editsPager.expand()
          }
        })
        remoteColorPrevBtn?.addEventListener("click", ()=>applyRemoteThemeByIndex(-1))
        remoteColorNextBtn?.addEventListener("click", ()=>applyRemoteThemeByIndex(1))
      guardianAriaBtn?.addEventListener("contextmenu", (event)=>{
        event.preventDefault()
        openGuardianSheet("Aria")
      })
      guardianJakeBtn?.addEventListener("contextmenu", (event)=>{
        event.preventDefault()
        openGuardianSheet("Jake")
      })
  primeViewBotBtn?.addEventListener("click", ()=>{
    localStorage.setItem(floatPrimeSeenKey, "true")
    hidePrimeMenu()
    footerGuideBtn?.click()
  })
  primeContinueBtn?.addEventListener("click", ()=>{
    localStorage.setItem(floatPrimeSeenKey, "true")
    hidePrimeMenu()
    hideTGuide()
    setRemoteStatus("Free for all mode is active. Remote home stays open and ready.")
  })
  primeCloseBtn?.addEventListener("click", ()=>{
    localStorage.setItem(floatPrimeSeenKey, "true")
    hidePrimeMenu()
  })
  founderCloseBtn?.addEventListener("click", hideFounderLayer)
  themeCardRail?.addEventListener("click", (event)=>{
    const card = event.target.closest("[data-float-theme]")
    if(!card) return
    const key = card.getAttribute("data-float-theme")
    rememberMapFavorite(key || "default")
    if(typeof window.setWorldTheme === "function"){
      window.setWorldTheme(key)
      if(deviceStatus) deviceStatus.textContent = "Touch theme load started. Your remote is rotating into the new map style now."
    }else if(typeof window.openWorldMapPanel === "function"){
      window.openWorldMapPanel()
    }
    syncMapHero(key || "default")
    renderThemeCards()
  })
  mapActionHost?.addEventListener("click", (event)=>{
    const button = event.target.closest("[data-float-map-action]")
    if(!button) return
    const views = typeof window.getWorldViews === "function" ? window.getWorldViews() : []
    const view = views.find(item=>item.key === button.getAttribute("data-float-map-key")) || views[0]
    const action = view?.actions?.[Number(button.getAttribute("data-float-map-action"))]
    if(!action) return
    const route = getMapActionRoute(view, action)
    const next = advanceMapPerk(view?.key, Number(button.getAttribute("data-float-map-action")))
    if(deviceStatus) deviceStatus.textContent = `${view.label}: ${action.label}. ${action.detail}${next ? ` Next idea: ${next.action.label}.` : ""}`
    setRemoteStatus(route.status)
    if(route.panel === "payments") window.openRemoteFastPay?.()
    else if(route.panel) focusFloatSection(route.panel, route.status)
    if(route.route === "studio"){
      holdSingleAssistantTeleport("projake", { x: window.innerWidth * 0.28, y: window.innerHeight * 0.68 }, 5000, {
        mood: "focus",
        status: `Jake says: ${view.label} works better when you follow this perk advice in the studio.`
      })
    }else if(route.route === "diary"){
      holdSingleAssistantTeleport("aria", { x: window.innerWidth * 0.72, y: window.innerHeight * 0.54 }, 5000, {
        mood: "focus",
        status: `Aria says: ${view.label} can shape this diary and live route right now.`
      })
    }
    openMiniWindow(`${view.label} Perk`, `${action.detail}${next ? ` Next idea ready: ${next.action.label}.` : ""}`)
  })
    bindAssistantTrigger(assistantAriaOrb, "aria")
    bindAssistantTrigger(assistantJakeOrb, "projake")
    bindAssistantTrigger(guardianAriaBtn, "aria")
    bindAssistantTrigger(guardianJakeBtn, "projake")
  profileUploadInput?.addEventListener("change", ()=>{
    const file = profileUploadInput.files?.[0]
    if(file){
      readAvatarFile(file)
      const focus = getRouteFocusPoint() || { x: window.innerWidth / 2, y: Math.max(170, window.innerHeight * 0.45) }
      holdAssistantTeleport({
        aria: { x: focus.x - 104, y: focus.y - 36 },
        jake: { x: focus.x + 84, y: focus.y + 12 }
      }, 7000, {
        mood: "focus",
        status: "Profile upload active. Aria and Jake teleported to the profile image lane for the next few seconds."
      })
    }
    profileUploadInput.value = ""
  })
  qs("#floatUploadProfileBtn")?.addEventListener("click", ()=>{
    if(requiresSignedInProfile()){
      openMiniWindow("Profile Sign-In", "Sign in first so SupportRD can save your profile picture and keep it for next time.")
      openAuthGate("profile")
      return
    }
    triggerProfileUpload()
  })
  qs("#floatMicBtn")?.addEventListener("click", ()=>{ if(deviceStatus) deviceStatus.textContent = "Mic selected. Lightweight remote is ready to record voice fast." })
  qs("#floatInstrumentBtn")?.addEventListener("click", ()=>{
    if(deviceStatus) deviceStatus.textContent = "Instrument lane armed. Plug in and move straight into the motherboard route."
    startVoiceRecord("instrument")
  })
  qs("#floatUsbBtn")?.addEventListener("click", ()=>{
    if(deviceStatus) deviceStatus.textContent = "USB view armed. Bring external media into the SupportRD platform route."
    uploadInput?.click()
  })
  qs("#float4kBtn")?.addEventListener("click", ()=>{ if(deviceStatus) deviceStatus.textContent = "4K drone / live camera route armed with big-button access." })
  qsa(".float-board").forEach(btn => btn.addEventListener("click", ()=>setActiveBoard(btn)))
  qs("#floatBoardAddBtn")?.addEventListener("click", ()=>{
    localStorage.setItem("supportrdStudioReturnView", "remote")
    if(typeof window.openStudioMode === "function"){
      closeFloat()
      window.openStudioMode()
    }else{
      setRemoteStatus("More than three motherboards routes into full Studio for deeper work.")
    }
  })
  qs("#floatBoardEditBtn")?.addEventListener("click", ()=>openMiniWindow("Edit Motherboard", "Pick the active motherboard and tighten the piece of work you are building."))
  qs("#floatRecordBtn")?.addEventListener("click", ()=>{
    const board = getBoard()
    if(remoteState.recorder && remoteState.recorder.state === "recording"){
      stopVoiceRecord()
      if(liveStatus) liveStatus.textContent = `${board.name} recording stopped and saved into the current motherboard.`
      return
    }
    startVoiceRecord(board.kind === "instrument" ? "instrument" : "voice")
    if(liveStatus) liveStatus.textContent = `${board.name} is now recording directly inside Studio Quick Panel.`
  })
  qs("#floatDeleteBtn")?.addEventListener("click", deleteHighlighted)
  qs("#floatPostBtn")?.addEventListener("click", ()=>qs("#liveArenaPostBtn")?.click())
  qs("#floatBreakBtn")?.addEventListener("click", ()=>qs("#liveArenaBreakBtn")?.click())
  qs("#floatQuickEditBtn")?.addEventListener("click", ()=>{
    if(liveStatus) liveStatus.textContent = "Quick edit view loaded. Trim the idea here, then move to Studio for in-depth edits."
    focusFloatSection("floatBoardsBox", "Studio Quick Panel is ready for your current music/video piece.")
  })
  qs("#floatStudioDeepBtn")?.addEventListener("click", ()=>{
    if(typeof window.openStudioMode === "function"){
      closeFloat()
      window.openStudioMode()
    }else{
      openMiniWindow("Studio", "Studio mode is getting ready for deeper edits.")
    }
  })
  mapBtn?.addEventListener("click", ()=>{
    openLaunchMenuSheet("floatDeviceBox", "Map Change")
    if(settingsStatus) settingsStatus.textContent = "Map change panel opened. Choose the background route you want."
  })
  themeBtn?.addEventListener("click", ()=>{
    openLaunchMenuSheet("floatDeviceBox", "Map Change")
    if(settingsStatus) settingsStatus.textContent = "Theme / map chooser opened in-page instead of moving Float Mode around."
  })
  paymentBtn?.addEventListener("click", ()=>window.openRemoteFastPay?.())
  faqPaymentBtn?.addEventListener("click", ()=>window.openRemoteFastPay?.())
  cameraBtn?.addEventListener("click", ()=>qs("#liveArenaCameraAccessBtn")?.click())
  uploadBtn?.addEventListener("click", ()=>uploadInput?.click())
  uploadInput?.addEventListener("change", ()=>{
    const file = uploadInput.files?.[0]
    if(file){
      resetBoards("Fresh 3 motherboards ready for a new upload.")
      loadFileToBoard(file)
      holdSingleAssistantTeleport("projake", {
        x: window.innerWidth * 0.28,
        y: window.innerHeight * 0.68
      }, 6000, {
        mood: "focus",
        status: "Jake teleported into the booth lane to watch the motherboard material appear."
      })
      uploadInput.value = ""
    }
  })
  freshBoardsBtn?.addEventListener("click", ()=>resetBoards("Fresh 3 motherboards reset. Upload a new .mp3 or .mp4 to begin again."))
  function stopBoardMixPreview(reset = false){
    const players = Array.isArray(remoteState.mixPlayers) ? remoteState.mixPlayers : []
    players.forEach((player)=>{
      try{
        player.pause()
        if(reset) player.currentTime = 0
      }catch{}
      try{
        if(player.dataset?.mixUrl) URL.revokeObjectURL(player.dataset.mixUrl)
      }catch{}
    })
    remoteState.mixPlayers = []
  }
  function getFilledBoards(){
    return (remoteState.boards || []).filter((board)=>board && board.kind !== "empty" && (board.file || board.fileName))
  }
  async function playBoardMixPreview(){
    const boards = getFilledBoards()
    if(!boards.length){
      openMiniWindow("Play", "Upload or record something first so we can play it.")
      return false
    }
    stopBoardMixPreview(true)
    const players = boards.map((board)=>{
      const node = document.createElement(board.kind === "video" ? "video" : "audio")
      node.preload = "auto"
      node.muted = false
      const url = board.file ? URL.createObjectURL(board.file) : remoteState.previewUrl
      node.src = url
      node.dataset.mixUrl = url
      node.currentTime = 0
      return node
    })
    remoteState.mixPlayers = players
    await Promise.all(players.map((player)=>player.play().catch(()=>null)))
    return true
  }
  function seekPreview(deltaSeconds){
    if(Array.isArray(remoteState.mixPlayers) && remoteState.mixPlayers.length){
      remoteState.mixPlayers.forEach((player)=>{
        try{
          const duration = Number.isFinite(player.duration) ? player.duration : 0
          const nextTime = Math.max(0, Math.min(duration || 0, (player.currentTime || 0) + deltaSeconds))
          player.currentTime = nextTime
        }catch{}
      })
      return
    }
    const media = remoteState.previewMediaEl
    if(!media || !Number.isFinite(media.duration)) return
    media.currentTime = Math.max(0, Math.min(media.duration || 0, (media.currentTime || 0) + deltaSeconds))
  }
  playBtn?.addEventListener("click", async ()=>{
    const boards = getFilledBoards()
    if(!boards.length){
      openMiniWindow("Play", "Upload or record something first so we can play it.")
      return
    }
    const mixed = await playBoardMixPreview()
    if(mixed && quickEditStatus){
      quickEditStatus.textContent = `${boards.map(board=>board.name).join(", ")} are now playing together from the start as one quick motherboard mix.`
    }
  })
  pauseBtn?.addEventListener("click", ()=>{
    if(stopVoiceRecord()){
      if(quickEditStatus) quickEditStatus.textContent = `${getBoard().name} recording paused and saved.`
      return
    }
    if(Array.isArray(remoteState.mixPlayers) && remoteState.mixPlayers.length){
      stopBoardMixPreview(false)
      if(quickEditStatus) quickEditStatus.textContent = "Motherboard mix paused."
      return
    }
    if(remoteState.previewMediaEl){
      remoteState.previewMediaEl.pause()
      if(quickEditStatus) quickEditStatus.textContent = `${getBoard().name} preview paused.`
      return
    }
    openMiniWindow("Pause", "Quick preview paused.")
  })
  prevBtn?.addEventListener("click", ()=>{
    remoteState.activeBoard = (remoteState.activeBoard + 2) % 3
    const btn = qsa(".float-board")[remoteState.activeBoard]
    if(btn) setActiveBoard(btn)
  })
  rewindBtn?.addEventListener("click", ()=>seekPreview(-3))
  nextBtn?.addEventListener("click", ()=>{
    remoteState.activeBoard = (remoteState.activeBoard + 1) % 3
    const btn = qsa(".float-board")[remoteState.activeBoard]
    if(btn) setActiveBoard(btn)
  })
  fastForwardBtn?.addEventListener("click", ()=>seekPreview(3))
  recordVoiceBtn?.addEventListener("click", ()=>startVoiceRecord("voice"))
  instrumentRecordBtn?.addEventListener("click", ()=>startVoiceRecord("instrument"))
  guitarBtn?.addEventListener("click", ()=>{
    if(instrumentTypeInput) instrumentTypeInput.value = "guitar"
    updateBoardFxState()
    setRemoteStatus("Guitar jacked in. Instrument reader is armed on the selected motherboard.")
  })
  speakerBtn?.addEventListener("click", ()=>{
    updateBoardFxState()
    setRemoteStatus("Responding on speaker. Live instrument monitoring is ready.")
  })
  gigSwitchBtn?.addEventListener("click", ()=>{
    remoteState.mode = remoteState.mode === "video" ? "audio" : "video"
    if(gigSettings) gigSettings.hidden = remoteState.mode !== "video"
    updateBoardFxState()
    setRemoteStatus(remoteState.mode === "video" ? "Gig Studio Connecter is active. Import MP4 / M4A and edit on the same three-board stack." : "Audio quick studio is active again.")
  })
  trimStart?.addEventListener("input", ()=>syncTrimInputs("range"))
  trimEnd?.addEventListener("input", ()=>syncTrimInputs("range"))
  trimStartNumber?.addEventListener("input", ()=>syncTrimInputs("number"))
  trimEndNumber?.addEventListener("input", ()=>syncTrimInputs("number"))
  highlightBtn?.addEventListener("click", highlightBoard)
  deleteSectionBtn?.addEventListener("click", deleteHighlighted)
  undoBtn?.addEventListener("click", ()=>{
    const snapshot = remoteState.history.shift()
    if(!snapshot){
      openMiniWindow("Undo", "Nothing to undo yet.")
      return
    }
    remoteState.boards = JSON.parse(snapshot)
    renderBoard()
    if(quickEditStatus) quickEditStatus.textContent = "Last quick edit action undone."
  })
  fxBtn?.addEventListener("click", ()=>{
    const board = getBoard()
    if(board.kind === "empty"){
      openMiniWindow("FX Change", "Load material first so we can change the sound.")
      return
    }
    snapshotBoards()
    updateBoardFxState()
    board.exported = remoteState.mode === "video"
      ? `FX ${board.gigFilter || "natural"} · ${board.gigFrameRate || "24"} FPS`
      : `FX ${board.fxPreset || "clean"} · ${board.instrument || "voice"}`
    renderBoard()
    if(quickEditStatus) quickEditStatus.textContent = remoteState.mode === "video"
      ? `${board.name} video FX changed for the highlighted motherboard sample.`
      : `${board.name} sound FX changed for the highlighted motherboard sample.`
  })
  clearBoardBtn?.addEventListener("click", ()=>{
    snapshotBoards()
    const idx = remoteState.activeBoard
    remoteState.boards[idx] = emptyBoard(idx)
    renderBoard()
    if(quickEditStatus) quickEditStatus.textContent = `Cleared ${getBoard().name} instantly.`
  })
  exportStudioBtn?.addEventListener("click", ()=>exportBoard("Main Studio"))
  exportTikTokBtn?.addEventListener("click", ()=>exportBoard("TikTok"))
  exportSocialBtn?.addEventListener("click", ()=>exportBoard("Social Export"))
  instrumentTypeInput?.addEventListener("change", updateBoardFxState)
  fxPresetInput?.addEventListener("change", updateBoardFxState)
  gigFilterInput?.addEventListener("change", updateBoardFxState)
  gigPanInput?.addEventListener("change", updateBoardFxState)
  gigFrameRateInput?.addEventListener("change", updateBoardFxState)
  gigZoomInput?.addEventListener("change", updateBoardFxState)
  gigSlowMotionInput?.addEventListener("change", updateBoardFxState)
  qs("#floatAriaBtn")?.addEventListener("dblclick", ()=>{
    if(typeof window.startAriaListening === "function") window.startAriaListening()
  })
  qs("#floatJakeBtn")?.addEventListener("dblclick", ()=>{
    if(typeof window.openStudioMode === "function"){
      localStorage.setItem("supportrdStudioReturnView", "remote")
      closeFloat()
      window.openStudioMode()
    }
  })
  profileSaveBtn?.addEventListener("click", ()=>{
    if(requiresSignedInProfile()){
      openMiniWindow("Profile Sign-In", "Sign in first so SupportRD can save your profile summary, credentials, and account protection.")
      openAuthGate("profile")
      return
    }
    saveProfileState()
    syncProfile()
    setRemoteStatus("Profile saved with the current AI summary, credentials, and security setup.")
  })
  window.addEventListener("popstate", ()=>{
    const route = getRemoteRouteFromLocation()
    if(!route) return
    renderRemoteRoute(route, { skipHistory:true, openShell:true })
  })
  const bootRoute = getRemoteRouteFromLocation()
  if(bootRoute){
    setTimeout(()=>renderRemoteRoute(bootRoute, { skipHistory:true, openShell:true }), 0)
  }
  window.SupportRDAriaLinks = {
    chat: "/api/aria",
    transcribe: "/api/aria/transcribe",
    speech: "/api/aria/speech"
  }
  qs("#floatRunProfileScanBtn")?.addEventListener("click", async ()=>{
    if(!hairScanCamera || !navigator.mediaDevices?.getUserMedia){
      openMiniWindow("Hair Scan", "Camera scanning is not available on this browser right now.")
      return
    }
    try{
      if(remoteState.profileScanStream){
        remoteState.profileScanStream.getTracks().forEach(track=>track.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:"user" }, audio:false })
      remoteState.profileScanStream = stream
      hairScanCamera.srcObject = stream
      hairScanCamera.hidden = false
      if(hairScanOverlay) hairScanOverlay.textContent = "Camera is live. Press Begin, then look left and right for the scan."
      if(hairScanProgressFill) hairScanProgressFill.style.width = "10%"
      setRemoteStatus("Hair scan camera is open and ready.")
    }catch{
      openMiniWindow("Hair Scan", "SupportRD could not open the camera. Check permission and try again.")
    }
  })
  hairScanBeginBtn?.addEventListener("click", ()=>{
    remoteState.profileScanStep = "left"
    if(hairScanOverlay) hairScanOverlay.textContent = "Look left, then tap Look Left."
    if(hairScanProgressFill) hairScanProgressFill.style.width = "40%"
  })
  hairScanLeftBtn?.addEventListener("click", ()=>{
    remoteState.profileScanStep = "right"
    if(hairScanOverlay) hairScanOverlay.textContent = "Now look right, then tap Look Right."
    if(hairScanProgressFill) hairScanProgressFill.style.width = "60%"
  })
  hairScanRightBtn?.addEventListener("click", ()=>{
    remoteState.profileScanStep = "complete"
    if(hairScanOverlay) hairScanOverlay.textContent = "Final step ready. Tap Complete Hair Scan."
    if(hairScanProgressFill) hairScanProgressFill.style.width = "80%"
  })
  hairScanCompleteBtn?.addEventListener("click", ()=>{
    const texture = ["Soft wave","Dense straight","Defined curl","Tight afro","Low fade texture"][Math.floor(Math.random() * 5)]
    const color = ["Dark brown","Jet black","Warm brown","Chestnut","Mixed dark tone"][Math.floor(Math.random() * 5)]
    const damage = ["low visible damage","light dryness on the ends","minor heat stress","healthy finish after cleaning"][Math.floor(Math.random() * 4)]
    const type = ["full none curly","all curly","straight","afro","low fade"][Math.floor(Math.random() * 5)]
    const summary = `Hair analysis:\nTexture: ${texture}\nHair Color: ${color}\nSign of damage: ${damage}\nHair Type: ${type}`
    qs("#floatProfileScanSummary") && (qs("#floatProfileScanSummary").textContent = summary)
    state.socialLinks = {
      ...(state.socialLinks || {}),
      hairTexture: texture,
      hairColor: color,
      hairDamage: damage,
      hairType: type,
      scanLatestShort: `Hair ${type} and ${damage}`.split(/\s+/).slice(0, 10).join(" ")
    }
    localStorage.setItem("socialLinks", JSON.stringify(state.socialLinks))
    if(hairScanProgressFill) hairScanProgressFill.style.width = "100%"
    if(hairScanOverlay) hairScanOverlay.textContent = "Hair scan complete. Review the AI summary below."
    if(remoteState.profileScanStream){
      remoteState.profileScanStream.getTracks().forEach(track=>track.stop())
      remoteState.profileScanStream = null
    }
    if(hairScanCamera){
      hairScanCamera.hidden = true
      hairScanCamera.srcObject = null
    }
    syncProfile()
    setRemoteStatus("Hair scan complete with texture, color, damage sign, and hair type.")
  })
  profile2faSaveBtn?.addEventListener("click", ()=>{
    if(requiresSignedInProfile()){
      openMiniWindow("Profile Sign-In", "Sign in first so SupportRD can save your 2-step verification.")
      openAuthGate("profile")
      return
    }
    saveProfileState()
    openMiniWindow("2-Step Verification", "2-step verification is saved. After 4 hours away, SupportRD can require password plus phone or personal code.")
  })
  profileLinkedInPostBtn?.addEventListener("click", ()=>{
    const text = encodeURIComponent((state.socialLinks?.generalSummary || buildProfileGeneralSummary()).split(". ").slice(0, 2).join(". "))
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${text}`, "_blank", "noopener,noreferrer")
  })
  qs("#floatTutorialBotsBtn")?.addEventListener("click", ()=>{
    setRemoteStatus("Aria and Jake tutorial routes are available on every page. Aria helps the general route, Jake helps the studio route.")
  })
  qs("#floatOccasionBtn")?.addEventListener("click", ()=>{
    if(deviceStatus) deviceStatus.textContent = "Occasion route armed. Pick the map/theme that matches the mood and the session."
    if(typeof window.openWorldMapPanel === "function") window.openWorldMapPanel()
  })
  qs("#floatThemeRotateBtn")?.addEventListener("click", ()=>{
    if(typeof window.advanceWorldTheme === "function"){
      window.advanceWorldTheme()
    }else if(typeof window.openWorldMapPanel === "function"){
      window.openWorldMapPanel()
    }
    if(deviceStatus) deviceStatus.textContent = "Theme rotation is active. Pick the next look and keep the session moving."
  })
  qs("#floatSettingsOpenBtn")?.addEventListener("click", ()=>{
    openRemoteFullSettingsLane()
    showSettingsGuide("overview")
  })
  pushToggleBtn?.addEventListener("click", ()=>{
    const pushBox = qs("#floatConfigPush")
    if(pushBox) pushBox.checked = !pushBox.checked
    showSettingsGuide("push")
    if(configStatus) configStatus.textContent = pushBox?.checked
      ? "Text-style SupportRD alerts are armed for this phone once permission is granted."
      : "Text-style SupportRD alerts are off for now."
    openMiniWindow("Texting Mode", pushBox?.checked ? "SupportRD is ready to ask this phone for text-style alert permission and save the opt-in." : "Text-style phone alerts are paused.")
  })
  settingsPushBtn?.addEventListener("click", ()=>{
    const pushBox = qs("#floatConfigPush")
    if(pushBox) pushBox.checked = !pushBox.checked
    saveFloatSettings()
    focusFloatSection("floatProfileBox", "Push notifications are updated.")
    showSettingsGuide("push")
  })
  studioLiveBtn?.addEventListener("click", ()=>{
    if(typeof window.openStudioMode === "function"){
      localStorage.setItem("supportrdStudioReturnView", "remote")
      closeFloat()
      window.openStudioMode()
    }else{
      openMiniWindow("Studio", "Studio is not ready yet, but the deep-edit path is staged.")
    }
  })
  qs("#floatDiaryRecordBtn")?.addEventListener("click", ()=>{
    const diary = (qs("#floatDiaryInput")?.value || "").trim()
    renderDiaryPagePreview(remoteState.diaryPageIndex || 0)
    if(!remoteState.handsfreeActive) toggleHandsfreeMode()
    if(settingsStatus) settingsStatus.textContent = diary
      ? "Diary page is live. Hands-Free Mode is listening so you can keep recording hair thoughts naturally."
      : "Diary page is open and Hands-Free Mode is listening. Start talking and SupportRD will keep the diary moving."
    openMiniWindow("Diary Mode", diary
      ? "Diary page updated and hands-free capture is ready above your history."
      : "Diary page opened. Start talking and SupportRD will capture the next hair thought into the diary lane.")
  })
  diaryPostBtn?.addEventListener("click", ()=>{
    openDiarySocialPlatforms()
  })
  diarySaveBtn?.addEventListener("click", saveDiaryEntry)
  diaryExportPdfBtn?.addEventListener("click", exportDiaryPdf)
  diarySocialSaveBtn?.addEventListener("click", ()=>{
    saveFloatSettings()
    openMiniWindow("Diary Social Links", "SupportRD saved the social backlinks for Diary Mode.")
  })
  diaryFlipPrev?.addEventListener("click", ()=>renderDiaryPagePreview((remoteState.diaryPageIndex || 0) - 1))
  diaryFlipNext?.addEventListener("click", ()=>renderDiaryPagePreview((remoteState.diaryPageIndex || 0) + 1))
  qs("#floatDiaryInput")?.addEventListener("input", ()=>renderDiaryPagePreview(remoteState.diaryPageIndex || 0))
  diaryLevelSelect?.addEventListener("change", ()=>{
    const value = diaryLevelSelect.value
    if(!getDiaryLevelAccess(value)){
      const fallback = value === "pro" ? "Pro" : "Premium"
      diaryLevelSelect.value = state.ariaLevel || "greeting"
      openMiniWindow("Aria Level Locked", `${fallback} is required to unlock ${getDiaryLevelLabel(value)}.`)
      return
    }
    state.ariaLevel = value
    localStorage.setItem("supportrdAriaLevel", value)
    if(settingsStatus) settingsStatus.textContent = `${getDiaryLevelLabel(value)} mode is active in Diary Mode.`
  })
  diaryHistoryScope?.addEventListener("change", ()=>{
    localStorage.setItem("supportrdDiaryHistoryScope", diaryHistoryScope.value)
    syncDiaryAndProfileExtras()
  })
  diaryLiveBtn?.addEventListener("click", ()=>{
    remoteState.diaryLiveActive = !remoteState.diaryLiveActive
    localStorage.setItem("supportrdDiaryLive", remoteState.diaryLiveActive ? "true" : "false")
    if(diaryLiveBtn) diaryLiveBtn.textContent = remoteState.diaryLiveActive ? "Turn Live Off" : "Live Session"
    if(remoteState.diaryLiveActive && navigator.mediaDevices?.getUserMedia && diaryLiveVideo){
      navigator.mediaDevices.getUserMedia({ video:true, audio:true }).then(stream=>{
        remoteState.diaryLiveStream?.getTracks?.().forEach(track=>track.stop())
        remoteState.diaryLiveStream = stream
        diaryLiveVideo.srcObject = stream
        diaryLiveVideo.hidden = false
        syncDiaryAndProfileExtras()
      }).catch(()=>{
        if(diaryLiveOverlay) diaryLiveOverlay.textContent = "Video could not start, so SupportRD is ready in microphone / podcast mode."
      })
    }else if(!remoteState.diaryLiveActive){
      remoteState.diaryLiveStream?.getTracks?.().forEach(track=>track.stop())
      remoteState.diaryLiveStream = null
      if(diaryLiveVideo){
        diaryLiveVideo.hidden = true
        diaryLiveVideo.srcObject = null
      }
    }
    syncDiaryAndProfileExtras()
    if(remoteState.diaryLiveActive){
      openMiniWindow("Diary Live", "SupportRD prepared a shareable live session link. This is the first stage of the live diary / podcast lane while full server distribution is still being tightened.")
    }
  })
  diaryLiveFastPay?.addEventListener("click", ()=>window.openRemoteFastPay?.())
  diaryLiveHeart?.addEventListener("click", ()=>{
    const comments = JSON.parse(localStorage.getItem("supportrdDiaryLiveComments") || "[]")
    comments.unshift(`Guest support · Heart sent at ${new Date().toLocaleTimeString()}`)
    localStorage.setItem("supportrdDiaryLiveComments", JSON.stringify(comments.slice(0, 25)))
    syncDiaryAndProfileExtras()
  })
  diaryLiveThumb?.addEventListener("click", ()=>{
    const comments = JSON.parse(localStorage.getItem("supportrdDiaryLiveComments") || "[]")
    comments.unshift(`Guest support · Thumbs up sent at ${new Date().toLocaleTimeString()}`)
    localStorage.setItem("supportrdDiaryLiveComments", JSON.stringify(comments.slice(0, 25)))
    syncDiaryAndProfileExtras()
  })
  diaryLiveCommentBtn?.addEventListener("click", ()=>{
    const guest = (diaryLiveGuest?.value || "Guest").trim()
    const comment = (diaryLiveComment?.value || "").trim()
    if(!comment){
      openMiniWindow("Live Comment", "Write a live comment first.")
      return
    }
    const comments = JSON.parse(localStorage.getItem("supportrdDiaryLiveComments") || "[]")
    comments.unshift(`${guest}: ${comment}`)
    localStorage.setItem("supportrdDiaryLiveComments", JSON.stringify(comments.slice(0, 25)))
    if(diaryLiveComment) diaryLiveComment.value = ""
    syncDiaryAndProfileExtras()
  })
  handsfreeBtn?.addEventListener("click", toggleHandsfreeMode)
  diaryAriaFixed?.addEventListener("click", ()=>qs("#floatAriaBtn")?.click())
  diaryJakeFixed?.addEventListener("click", ()=>qs("#floatJakeBtn")?.click())
  faqReelBtn?.addEventListener("click", ()=>{
    if(faqReelFrame){
      faqReelFrame.src = faqReelFrame.src.split("&theme=")[0] + `&theme=${shell?.dataset?.faqTheme || "tiktok"}&refresh=${Date.now()}`
    }
    if(liveStatus) liveStatus.textContent = "FAQ TV Reel refreshed."
  })
  faqThemeButtons.forEach(btn=>btn.addEventListener("click", ()=>{
    faqThemeButtons.forEach(item=>item.classList.remove("active"))
    btn.classList.add("active")
    const theme = btn.dataset.faqTheme || "tiktok"
    if(shell) shell.dataset.faqTheme = theme
    if(faqReelFrame){
      faqReelFrame.src = faqReelFrame.src.split("&theme=")[0] + `&theme=${theme}`
    }
    if(liveStatus) liveStatus.textContent = `${theme[0].toUpperCase()}${theme.slice(1)} style hair reel is active in FAQ Lounge.`
  }))
  faqPromptSelect?.addEventListener("change", ()=>{
    const answers = {
      dryness: "Dryness usually needs moisture-first help: lighter shampoo, more leave-in moisture, and a smoother Laciador lane if styling matters too.",
      damage: "If the hair feels damaged, SupportRD pushes you toward the scan lane, gentler product support, and lower-heat recovery steps first.",
      frizz: "Frizz on the go usually needs a lighter smoothing lane, less touching, and a fast product route that keeps style under control.",
      premium: "Premium unlocks deeper Aria memory and stronger guidance. Pro adds the making-money professional lane.",
      scan: "Hair Scan opens the camera, guides left and right views, then returns texture, color, damage signs, and hair type.",
      payment: "Fast Pay is meant to move quickly in person: open the product details or go straight to Shopify checkout for card capture."
    }
    if(faqPromptAnswer) faqPromptAnswer.textContent = answers[faqPromptSelect.value] || answers.dryness
  })
  qs("#floatLiveBox")?.addEventListener("click", (event)=>{
    const item = event.target.closest(".float-faq-item")
    if(!item) return
    const question = item.querySelector("strong")?.textContent || "SupportRD FAQ"
    const answer = item.querySelector("span")?.textContent || "SupportRD answer ready."
    openMiniWindow(question, answer)
  })
  window.addEventListener("message", (event)=>{
    if(event?.data?.type === "open-float-mode") openFloat()
  })
  window.openFloatMode = openFloat
  document.addEventListener("keydown", (event)=>{
    if(!document.body.classList.contains("float-mode-active")) return
    if(event.key === "Backspace"){
      const active = getBoard()
      if(active.highlighted){
        event.preventDefault()
        deleteHighlighted()
      }
    }
  })
  boardPreviewVideo?.addEventListener("mousemove", (event)=>{
    if(boardPreviewVideo.hidden || !boardPreviewVideo.duration) return
    const rect = boardPreviewVideo.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    boardPreviewVideo.currentTime = boardPreviewVideo.duration * ratio
    boardPreviewVideo.muted = false
    boardPreviewVideo.play().catch(()=>{})
  })
  resetBoards("Fresh 3 motherboards ready. Upload a new .mp3 or .mp4 to begin quick remote editing.")
  renderThemeCards()
  syncFloatSettings()
  syncProfile()
  const params = new URLSearchParams(window.location.search || "")
  if(params.get("float") === "1" || params.get("remote") === "1"){
    setTimeout(()=>{
      openFloat()
      if(params.get("remote") === "1") setTimeout(()=>window.openRemoteFastPay?.(), 260)
    }, 180)
  }
}

function setupRemoteFastPay(){
  const PURCHASE_GATE_KEY = "supportrd_purchase_gate_intent"
  const modal = qs("#remoteFastPayModal")
  const grid = qs("#remoteFastPayGrid")
  const closeBtn = qs("#closeRemoteFastPay")
  const status = qs("#remoteFastPayStatus")
  const confirmWrap = qs("#remoteFastPayConfirm")
  const confirmTitle = qs("#remoteConfirmTitle")
  const confirmBody = qs("#remoteConfirmBody")
  const confirmMeta = qs("#remoteConfirmMeta")
  const confirmCancel = qs("#remoteConfirmCancel")
  const confirmShopify = qs("#remoteConfirmShopify")
  const receiptSummary = qs("#remoteReceiptSummary")
  const processingPanel = qs("#remoteProcessingPanel")
  const processingFill = qs("#remoteProcessingFill")
  const processingStatus = qs("#remoteProcessingStatus")
  const ownerPanel = qs("#remoteOwnerPanel")
  const ownerTitle = qs("#remoteOwnerTitle")
  const ownerBody = qs("#remoteOwnerBody")
  const findStoreBtn = qs("#remoteFindStoreBtn")
  const ownerCloseBtn = qs("#remoteOwnerCloseBtn")
  if(!modal || !grid) return
  let selectedProduct = null
  let processingTimer = null

  function extractMoneyAmount(label){
    const match = String(label || "").match(/\$[\d,.]+/)
    return match ? match[0] : "your payment"
  }
  function playAcceptTone(){
    try{
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if(!AudioCtx) return
      const ctx = new AudioCtx()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(740, ctx.currentTime)
      oscillator.frequency.linearRampToValueAtTime(980, ctx.currentTime + 0.16)
      gain.gain.setValueAtTime(0.0001, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32)
      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start()
      oscillator.stop(ctx.currentTime + 0.34)
      setTimeout(()=>{ try{ ctx.close() }catch{} }, 400)
    }catch{}
  }

  function buildRemoteReceipt(product){
    const stamp = new Date().toLocaleString()
    const receipt = {
      title: product.title,
      price: product.price,
      stamp,
      confirmation: `SR-${Date.now().toString().slice(-8)}`,
      access: "Buyer access follows the email / username used in Shopify checkout.",
      status: "Checkout launched securely in Shopify"
    }
    try{ localStorage.setItem("supportrd_remote_receipt", JSON.stringify(receipt)) }catch{}
    return receipt
  }

  function renderReceipt(receipt){
    if(!receiptSummary) return
    if(!receipt){
      receiptSummary.textContent = "No remote checkout launched yet. The next Shopify checkout launch will save here."
      return
    }
    receiptSummary.innerHTML = `
      <strong>${receipt.title}</strong><br>
      ${receipt.price} · Confirmation ${receipt.confirmation}<br>
      ${receipt.status}<br>
      ${receipt.access}<br>
      Saved ${receipt.stamp}
    `
  }

  function hideConfirm(){
    selectedProduct = null
    if(confirmWrap) confirmWrap.hidden = true
  }
  function hideOwner(){
    if(ownerPanel) ownerPanel.hidden = true
  }
  function hideProcessing(){
    if(processingTimer){ clearInterval(processingTimer); processingTimer = null }
    if(processingPanel) processingPanel.hidden = true
    if(processingFill) processingFill.style.width = "0%"
  }

  function showConfirm(product){
    selectedProduct = product
    hideProcessing()
    if(confirmWrap) confirmWrap.hidden = false
    if(confirmTitle) confirmTitle.textContent = product.title
    if(confirmBody) confirmBody.textContent = `${product.short} Ingredients: ${product.ingredients} Apply: ${product.apply} What it does: ${product.does} After purchase: ${product.after}`
    if(confirmMeta) confirmMeta.textContent = "Open Shopify Checkout to go straight into the secure payment page. Apple Pay and Google Pay show there when Shopify Payments is enabled and the buyer device supports them."
    if(status) status.textContent = `${product.title} details are open. Choose Shopify Checkout when you are ready to pay.`
  }

  function openPurchaseDetails(product, sourceLabel = "Fast Pay"){
    if(!product) return
    trackAcquisitionSignal("product_details_open", {
      lane: ACQUISITION_LANES.products,
      stage: "exploring",
      socialFeedback: `${product.title} details opened from ${sourceLabel}.`
    })
    if(modal.hidden) openRemoteFastPay()
    showConfirm(product)
  }

  function isPurchaseUserSignedIn(){
    return localStorage.getItem("loggedIn") === "true" || shouldAutoOwnerEntry()
  }

  function persistPurchaseIntent(product, sourceLabel, options = {}){
    if(!product?.key) return
    try{
      localStorage.setItem(PURCHASE_GATE_KEY, JSON.stringify({
        key: product.key,
        sourceLabel: sourceLabel || "Fast Pay",
        options: options || {},
        at: Date.now()
      }))
    }catch{}
  }

  function readPurchaseIntent(){
    try{
      const saved = JSON.parse(localStorage.getItem(PURCHASE_GATE_KEY) || "null")
      return saved && saved.key ? saved : null
    }catch{
      return null
    }
  }

  function clearPurchaseIntent(){
    try{ localStorage.removeItem(PURCHASE_GATE_KEY) }catch{}
  }

  function normalizeShopifyHandle(value){
    return String(value || "").trim().toLowerCase()
  }

  function findLiveShopifyProduct(product){
    if(!product) return null
    const products = Array.isArray(state.shopifyProducts) ? state.shopifyProducts : []
    if(!products.length) return null
    const expectedHandle = normalizeShopifyHandle((SHOPIFY_LINK_PATHS[product.key] || "").split("/").pop())
    const productTitle = normalizeShopifyHandle(product.title)
    return products.find((item)=>{
      const handle = normalizeShopifyHandle(item.handle)
      const title = normalizeShopifyHandle(item.title)
      return (!!expectedHandle && handle === expectedHandle) || (!!productTitle && title === productTitle)
    }) || null
  }

  let shopifyBuyUiPromise = null
  let shopifyBuyClientPromise = null

  function getShopifyNumericId(value){
    const raw = String(value || "").trim()
    if(!raw) return ""
    const match = raw.match(/(\d+)(?!.*\d)/)
    return match ? match[1] : ""
  }

  function ensureEmbeddedCheckoutShell(){
    let overlay = qs("#shopifyEmbeddedCheckout")
    if(overlay) return overlay
    overlay = document.createElement("section")
    overlay.id = "shopifyEmbeddedCheckout"
    overlay.className = "shopify-embedded-checkout hidden"
    overlay.innerHTML = `
      <div class="shopify-embedded-backdrop" data-shopify-embedded-close></div>
      <div class="shopify-embedded-panel glass">
        <button class="shopify-embedded-close" type="button" aria-label="Close embedded checkout" data-shopify-embedded-close>×</button>
        <div class="shopify-embedded-head">
          <div class="shopify-embedded-kicker">Secure Shopify Checkout</div>
          <h3 id="shopifyEmbeddedTitle">SupportRD Purchase</h3>
          <p id="shopifyEmbeddedMeta">Loading your product inside the page now.</p>
        </div>
        <div id="shopifyEmbeddedMount" class="shopify-embedded-mount"></div>
      </div>
    `
    document.body.appendChild(overlay)
    overlay.addEventListener("click", (event)=>{
      if(event.target?.closest?.("[data-shopify-embedded-close]")){
        overlay.classList.add("hidden")
        const mount = qs("#shopifyEmbeddedMount")
        if(mount) mount.innerHTML = ""
      }
    })
    return overlay
  }

  function loadShopifyBuySdk(){
    if(window.ShopifyBuy && window.ShopifyBuy.UI) return Promise.resolve(window.ShopifyBuy)
    if(window.__shopifyBuySdkPromise) return window.__shopifyBuySdkPromise
    window.__shopifyBuySdkPromise = new Promise((resolve, reject)=>{
      const existing = document.querySelector('script[data-shopify-buy-sdk="true"]')
      if(existing){
        existing.addEventListener("load", ()=>resolve(window.ShopifyBuy))
        existing.addEventListener("error", reject)
        return
      }
      const script = document.createElement("script")
      script.src = "https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js"
      script.async = true
      script.dataset.shopifyBuySdk = "true"
      script.onload = ()=>resolve(window.ShopifyBuy)
      script.onerror = reject
      document.head.appendChild(script)
    })
    return window.__shopifyBuySdkPromise
  }

  async function getShopifyBuyClient(){
    if(shopifyBuyClientPromise) return shopifyBuyClientPromise
    shopifyBuyClientPromise = (async ()=>{
      if(storefrontConfigReady){
        try{ await storefrontConfigReady }catch{}
      }
      const host = state.shopifyStorefrontHost || ""
      const token = state.shopifyStorefrontToken || ""
      if(!host || !token) throw new Error("shopify_buy_not_configured")
      const ShopifyBuy = await loadShopifyBuySdk()
      if(!ShopifyBuy?.buildClient) throw new Error("shopify_buy_client_missing")
      return ShopifyBuy.buildClient({
        domain: host,
        storefrontAccessToken: token
      })
    })()
    return shopifyBuyClientPromise
  }

  async function getShopifyBuyUi(){
    if(shopifyBuyUiPromise) return shopifyBuyUiPromise
    shopifyBuyUiPromise = (async ()=>{
      const ShopifyBuy = await loadShopifyBuySdk()
      if(!ShopifyBuy?.UI) throw new Error("shopify_buy_ui_missing")
      const client = await getShopifyBuyClient()
      return ShopifyBuy.UI.onReady(client)
    })()
    return shopifyBuyUiPromise
  }

  async function fetchShopifyProductByHandle(product){
    const handle = normalizeShopifyHandle((SHOPIFY_LINK_PATHS[product?.key] || "").split("/").pop())
    if(!handle) return null
    try{
      const client = await getShopifyBuyClient()
      const item = await client.product.fetchByHandle(handle)
      if(!item) return null
      return {
        id: item.id || "",
        handle: item.handle || handle,
        title: item.title || product?.title || "",
        variant: Array.isArray(item.variants) && item.variants[0] ? getShopifyNumericId(item.variants[0].id || "") : "",
        variantGraphId: Array.isArray(item.variants) && item.variants[0] ? String(item.variants[0].id || "").trim() : ""
      }
    }catch{
      return null
    }
  }

  async function openEmbeddedShopifyCheckout(product, liveProduct){
    const productId = getShopifyNumericId(liveProduct?.id)
    if(!productId) return false
    const overlay = ensureEmbeddedCheckoutShell()
    const mount = qs("#shopifyEmbeddedMount")
    const title = qs("#shopifyEmbeddedTitle")
    const meta = qs("#shopifyEmbeddedMeta")
    if(mount) mount.innerHTML = ""
    if(title) title.textContent = product?.title || liveProduct?.title || "SupportRD Purchase"
    if(meta) meta.textContent = "SupportRD is loading the secure Shopify buy flow directly inside the page."
    overlay.classList.remove("hidden")
    overlay.setAttribute("aria-hidden", "false")
    const ui = await getShopifyBuyUi()
    await ui.createComponent("product", {
      id: productId,
      node: mount,
      moneyFormat: "${{amount}}",
      options: {
        product: {
          iframe: false,
          buttonDestination: "checkout",
          layout: "vertical",
          contents: {
            img: true,
            title: true,
            price: true,
            options: true,
            quantity: true,
            description: false,
            button: true,
            buttonWithQuantity: false
          },
          text: {
            button: "Continue To Secure Checkout"
          }
        },
        cart: {
          startOpen: false,
          popup: false,
          iframe: false,
          text: {
            total: "Total",
            button: "Checkout"
          }
        },
        toggle: {
          styles: {
            toggle: {
              display: "none"
            }
          }
        }
      }
    })
    return true
  }

  async function createStorefrontCheckoutUrl(product, liveProduct){
    if(storefrontConfigReady){
      try{ await storefrontConfigReady }catch{}
    }
    const host = String(state.shopifyStorefrontHost || "").trim()
    const token = String(state.shopifyStorefrontToken || "").trim()
    const numericVariantId = String(liveProduct?.variant || "").trim()
    const graphVariantId = String(liveProduct?.variantGraphId || (numericVariantId ? `gid://shopify/ProductVariant/${numericVariantId}` : "")).trim()
    if(!host || !token || !graphVariantId) return ""
    try{
      const response = await fetch(`https://${host}/api/2024-07/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": token
        },
        body: JSON.stringify({
          query: `
            mutation supportRDCheckoutCreate($variantId: ID!) {
              checkoutCreate(input: {
                lineItems: [
                  { variantId: $variantId, quantity: 1 }
                ]
              }) {
                checkout {
                  webUrl
                }
                checkoutUserErrors {
                  field
                  message
                }
              }
            }
          `,
          variables: {
            variantId: graphVariantId
          }
        })
      })
      const payload = await response.json()
      const webUrl = String(payload?.data?.checkoutCreate?.checkout?.webUrl || "").trim()
      if(webUrl) return webUrl
    }catch{}
    return ""
  }

  async function createDirectShopifyCheckoutUrl(product, liveProduct){
    let resolvedProduct = liveProduct || null
    let variantGraphId = String(resolvedProduct?.variantGraphId || "").trim()
    let variantId = String(resolvedProduct?.variant || "").trim()
    if(!variantGraphId){
      const fetched = await fetchShopifyProductByHandle(product)
      if(fetched){
        resolvedProduct = {...(resolvedProduct || {}), ...fetched}
        variantGraphId = String(fetched.variantGraphId || "").trim()
        variantId = String(fetched.variant || "").trim()
      }
    }
    if(!variantGraphId && variantId){
      variantGraphId = `gid://shopify/ProductVariant/${variantId}`
      resolvedProduct = {...(resolvedProduct || {}), variantGraphId}
    }
    const storefrontCheckoutUrl = await createStorefrontCheckoutUrl(product, resolvedProduct || liveProduct)
    if(storefrontCheckoutUrl) return storefrontCheckoutUrl
    if(variantGraphId){
      try{
        const client = await getShopifyBuyClient()
        const checkout = await client.checkout.create()
        const updatedCheckout = await client.checkout.addLineItems(checkout.id, [{ variantId: variantGraphId, quantity: 1 }])
        const checkoutUrl = String(updatedCheckout?.webUrl || checkout?.webUrl || "").trim()
        if(checkoutUrl) return checkoutUrl
      }catch{}
    }
    return buildShopifyCheckoutUrl(product, resolvedProduct || liveProduct)
  }

  function buildShopifyCheckoutUrl(product, liveProduct){
    const storefrontBase = getDirectShopifyBase()
    const variantId = String(liveProduct?.variant || "").trim()
    if(variantId && /^\d+$/.test(variantId)){
      return `${storefrontBase}/cart/${variantId}:1`
    }
    if(product?.link){
      try{
        const parsed = new URL(product.link, storefrontBase)
        if(parsed.pathname){
          return `${storefrontBase}${parsed.pathname}${parsed.search || ""}`
        }
      }catch{}
    }
    if(liveProduct?.handle){
      return `${storefrontBase}/products/${liveProduct.handle}`
    }
    return product?.link || ""
  }

  async function ensureShopifyProductsLoaded(){
    if(state.shopifyProductsLoaded) return state.shopifyProducts
    return loadProducts()
  }

  function openShopifyPublishNotice(productTitle){
    const title = productTitle || "this SupportRD product"
    const detail = `${title} still needs a live Shopify storefront product route. Publish the product to Online Store or keep using the direct cart/variant checkout lane once the live product feed is populated.`
    if(typeof openRemoteSheet === "function"){
      openRemoteSheet("Publish Product To Storefront", `
        <div class="float-sheet-panel">
          <h4>Shopify storefront product still missing</h4>
          <p>${detail}</p>
          <div class="float-sheet-button-row">
            <button class="btn" data-open-fastpay>Open Fast Pay</button>
            <button class="btn ghost" data-sheet-close>Keep Browsing</button>
          </div>
        </div>
      `, { message: detail })
    }
    if(status) status.textContent = detail
    try{ openMiniWindow("PUBLISH PRODUCT", detail) }catch{}
  }

  function openPurchaseAccountGate(product, sourceLabel, options = {}){
    persistPurchaseIntent(product, sourceLabel, options)
    const productTitle = product?.title || "this SupportRD purchase"
    holdAssistantTeleport({
      aria: { x: window.innerWidth - 186, y: window.innerHeight - 214 },
      jake: { x: window.innerWidth - 106, y: window.innerHeight - 142 }
    }, 14000, {
      mood: "excited",
      status: `${productTitle} is waiting at the payment lane. Aria and Jake moved above the purchase button to help.`
    })
    const message = `${productTitle} is ready. Sign in or create an account first so SupportRD can attach premium access, orders, and upgrades to the right person.`
    if(typeof openRemoteSheet === "function"){
      openRemoteSheet("Sign In Before Checkout", `
        ${typeof renderRemoteValueLane === "function" ? renderRemoteValueLane([
          "Value: premium access stays tied to the right account",
          "Energy: one obvious sign-in step before checkout",
          "Worth: orders, themes, upgrades, and premium continuity stay preserved"
        ]) : ""}
        <div class="float-sheet-panel">
          <h4>Account required before purchase</h4>
          <p>${message}</p>
          <div class="float-sheet-button-row">
            <button class="btn" data-trigger-login>Sign In Or Create Account</button>
            <button class="btn ghost" data-sheet-close>Keep Browsing</button>
          </div>
          <p class="fine-print">After sign-in, SupportRD will bring you right back to ${productTitle} and continue into Shopify checkout automatically.</p>
        </div>
      `, { message: `${productTitle} is waiting for sign-in before checkout.` })
    }
    if(status) status.textContent = `${productTitle} is waiting for sign-in before checkout.`
    try{ openMiniWindow("SIGN IN BEFORE CHECKOUT", `${productTitle} is ready. Sign in first so SupportRD can preserve your premium and order history.`) }catch{}
    setTimeout(()=>{
      if(typeof window.openLoginGateSticky === "function"){
        window.openLoginGateSticky({
          title: "Sign In To Purchase",
          message: `Sign in or create an account to finish buying ${productTitle}. SupportRD will bring you straight back to checkout.`
        })
      }else{
        qs("#loginBtn")?.click()
      }
    }, 160)
  }

  async function resumePendingPurchaseIntent(){
    if(!isPurchaseUserSignedIn()) return
    const intent = readPurchaseIntent()
    if(!intent?.key) return
    const product = REMOTE_PAY_PRODUCTS.find((item)=>item.key === intent.key)
    clearPurchaseIntent()
    if(!product) return
    modal.hidden = false
    modal.setAttribute("aria-hidden","false")
    document.body.classList.add("remote-fastpay-active")
    renderProducts()
    hideConfirm()
    hideOwner()
    if(status) status.textContent = `${product.title} is resuming from sign-in and opening Shopify checkout now.`
    try{ openMiniWindow("WELCOME BACK", `${product.title} is ready. SupportRD saved your place and is opening Shopify checkout now.`) }catch{}
    await launchShopifyCheckout(product, intent.sourceLabel || "Saved Purchase", intent.options || {})
  }

    async function launchShopifyCheckout(product, sourceLabel, options = {}){
      if(!isPurchaseUserSignedIn()){
        trackAcquisitionSignal("purchase_gate_login", {
          lane: ACQUISITION_LANES.products,
          stage: "premium-curious",
          socialFeedback: `${product?.title || "SupportRD purchase"} needs account continuity before checkout.`
        })
        openPurchaseAccountGate(product, sourceLabel, options)
        return
      }
      trackAcquisitionSignal("launch_shopify_checkout", {
        lane: ACQUISITION_LANES.products,
        stage: "purchase-ready",
        socialFeedback: `${product?.title || "SupportRD purchase"} is actively moving through checkout.`
      })
      holdAssistantTeleport({
        aria: { x: window.innerWidth - 186, y: window.innerHeight - 214 },
        jake: { x: window.innerWidth - 106, y: window.innerHeight - 142 }
      }, 14000, {
        mood: "excited",
        status: `${product?.title || "SupportRD purchase"} is moving through the payment lane. Aria and Jake are staying close to checkout.`
      })
      if(storefrontConfigReady){
        try{
          await storefrontConfigReady
        }catch{}
      }
      const liveProducts = await ensureShopifyProductsLoaded()
      let liveProduct = findLiveShopifyProduct(product)
      if(!liveProduct){
        liveProduct = await fetchShopifyProductByHandle(product)
      }
      const liveLink = await createDirectShopifyCheckoutUrl(product, liveProduct) || (product?.key && LINKS[product.key] ? LINKS[product.key] : product?.link)
      if(!liveLink && !liveProduct && !liveProducts.length){
        openShopifyPublishNotice(product?.title)
        return
      }
      if(!liveLink){
        openShopifyPublishNotice(product?.title)
        return
      }
      const checkoutProduct = {...product, link: liveLink}
      const receipt = buildRemoteReceipt(checkoutProduct)
      renderReceipt(receipt)
      hideConfirm()
      hideProcessing()
      if(!options.keepOwnerVisible) hideOwner()
      if(status) status.textContent = `${checkoutProduct.title} Shopify checkout is opening now${sourceLabel ? ` from ${sourceLabel}` : ""}.`
      try{
        localStorage.setItem("supportrd_checkout_pending", JSON.stringify({
          title: checkoutProduct.title,
          price: checkoutProduct.price,
          at: Date.now()
        }))
      }catch{}
      try{
        window.location.assign(checkoutProduct.link)
      }catch{
        openLinkModal(checkoutProduct.link, `${checkoutProduct.title} Checkout`)
      }
    }

  function renderProducts(){
    const specialCards = `
      <article class="remote-product-card glass remote-product-card-special" data-remote-special-card="custom">
        <div class="remote-product-copy">
          <div class="remote-product-title-row">
            <h4>Custom Order Email Lane</h4>
            <div class="remote-product-price">Email-backed</div>
          </div>
          <p class="remote-product-short">Use this first when somebody needs a custom order before the normal product checkout path.</p>
          <div class="remote-product-detail"><strong>What It Does:</strong> Opens the custom-order details lane with direct email routing.</div>
          <div class="remote-product-detail"><strong>Best For:</strong> Manual orders, product questions, and high-touch SupportRD follow-up.</div>
        </div>
        <div class="remote-product-actions">
          <button class="btn ghost remote-special-btn" data-remote-special="custom">Open Custom Order</button>
          <button class="btn remote-special-btn" data-remote-special="custom-email">Email Custom Order</button>
        </div>
      </article>
      <article class="remote-product-card glass remote-product-card-special" data-remote-special-card="bulk">
        <div class="remote-product-copy">
          <div class="remote-product-title-row">
            <h4>Bulk Product / Fly-In Session</h4>
            <div class="remote-product-price">Contact lane</div>
          </div>
          <p class="remote-product-short">Capture in-person bulk product interest and travel-session demand with the inventor from the same payment lane.</p>
          <div class="remote-product-detail"><strong>What It Does:</strong> Opens the fly-in / bulk request lane and logs the demand into SupportRD.</div>
          <div class="remote-product-detail"><strong>Best For:</strong> Salons, resellers, events, and private ordering sessions.</div>
        </div>
        <div class="remote-product-actions">
          <button class="btn ghost remote-special-btn" data-remote-special="bulk">Open Fly-In Details</button>
          <button class="btn remote-special-btn" data-remote-special="bulk-email">Email Fly-In Request</button>
        </div>
      </article>
    `
    grid.innerHTML = specialCards + REMOTE_PAY_PRODUCTS.map((product)=>`
      <article class="remote-product-card glass" data-remote-product="${product.key}">
        <div class="remote-product-photo-wrap">
          <img class="remote-product-photo" src="${product.image}" alt="${product.title}">
        </div>
        <div class="remote-product-copy">
          <div class="remote-product-title-row">
            <h4>${product.title}</h4>
            <div class="remote-product-price">${product.price}</div>
          </div>
          <p class="remote-product-short">${product.short}</p>
          <div class="remote-product-detail"><strong>Ingredients:</strong> ${product.ingredients}</div>
          <div class="remote-product-detail"><strong>Apply:</strong> ${product.apply}</div>
          <div class="remote-product-detail"><strong>What It Does:</strong> ${product.does}</div>
          <div class="remote-product-detail"><strong>After Purchase:</strong> ${product.after}</div>
        </div>
        <div class="remote-product-actions">
          <button class="btn ghost remote-preview-btn" data-remote-open="${product.key}">Open Purchase Menu</button>
          <button class="btn remote-checkout-btn" data-remote-checkout="${product.key}">Shopify Checkout</button>
        </div>
      </article>
    `).join("")

    qsa(".remote-special-btn").forEach((btn)=>{
      btn.addEventListener("click", ()=>{
        const action = btn.dataset.remoteSpecial
        if(action === "custom"){
          openCustomOrderSupport("Fast Pay", "custom")
          return
        }
        if(action === "custom-email"){
          const mailto = buildCustomOrderMailto("custom")
          pushSupportContactRequest({
            type: "custom",
            name: state?.socialLinks?.name || "SupportRD visitor",
            summary: "Custom order email lane opened from Fast Pay.",
            notes: "Customer asked for email-backed custom order support from the payment lane."
          })
          trackAcquisitionSignal("custom_order_email_opened", {
            lane: ACQUISITION_LANES.products,
            stage: "premium-curious",
            socialFeedback: "A visitor opened the custom-order email lane from Fast Pay."
          })
          window.location.href = mailto
          return
        }
        if(action === "bulk"){
          openCustomOrderSupport("Fast Pay", "bulk")
          return
        }
        if(action === "bulk-email"){
          const mailto = buildCustomOrderMailto("bulk")
          pushSupportContactRequest({
            type: "bulk",
            name: state?.socialLinks?.name || "SupportRD visitor",
            summary: "Bulk product / fly-in lane opened from Fast Pay.",
            notes: "Customer wants to talk about an in-person bulk product session with the inventor."
          })
          trackAcquisitionSignal("bulk_flyin_email_opened", {
            lane: ACQUISITION_LANES.products,
            stage: "purchase-ready",
            socialFeedback: "A fly-in / bulk product request just opened from the payment lane."
          })
          window.location.href = mailto
        }
      })
    })
    qsa(".remote-preview-btn").forEach((btn)=>{
      btn.addEventListener("click", ()=>{
        const product = REMOTE_PAY_PRODUCTS.find((item)=>item.key === btn.dataset.remoteOpen)
        if(!product) return
        trackAcquisitionSignal("product_preview", {
          lane: ACQUISITION_LANES.products,
          stage: "premium-curious",
          socialFeedback: `${product.title} is pulling comparison traffic into the product lane.`
        })
        openPurchaseDetails(product)
      })
    })
    qsa(".remote-checkout-btn").forEach((btn)=>{
      btn.addEventListener("click", ()=>{
        const product = REMOTE_PAY_PRODUCTS.find((item)=>item.key === btn.dataset.remoteCheckout)
        if(!product) return
        trackAcquisitionSignal("product_checkout_click", {
          lane: ACQUISITION_LANES.products,
          stage: "purchase-ready",
          socialFeedback: `${product.title} pushed a visitor into checkout-ready mode.`
        })
        launchShopifyCheckout(product, "Fast Pay")
      })
    })
  }

  function openRemoteFastPay(){
    modal.hidden = false
    modal.setAttribute("aria-hidden","false")
    document.body.classList.add("remote-fastpay-active")
    renderProducts()
    try{
      const saved = JSON.parse(localStorage.getItem("supportrd_remote_receipt") || "null")
      renderReceipt(saved)
    }catch{
      renderReceipt(null)
    }
    hideConfirm()
    hideOwner()
    if(status) status.textContent = "SupportRD Fast Pay is open. Start with Custom Order or Fly-In if the customer needs a manual lane, then use Shopify Checkout for direct card capture."
    trackAcquisitionSignal("open_fastpay", {
      lane: ACQUISITION_LANES.products,
      stage: "premium-curious",
      socialFeedback: "A visitor opened the payment lane to compare SupportRD products, custom orders, or fly-in sessions."
    })
    openMiniWindow("Remote Fast Pay", "Start with Custom Order if this is a manual request, or go straight into Shopify Checkout for the real card page.")
  }

  function closeRemoteFastPay(){
    hideProcessing()
    hideConfirm()
    hideOwner()
    modal.hidden = true
    modal.setAttribute("aria-hidden","true")
    document.body.classList.remove("remote-fastpay-active")
  }

  closeBtn?.addEventListener("click", closeRemoteFastPay)
  confirmCancel?.addEventListener("click", hideConfirm)
  confirmShopify?.addEventListener("click", ()=>{
    if(!selectedProduct) return
    launchShopifyCheckout(selectedProduct, "Confirm Panel")
  })
  findStoreBtn?.addEventListener("click", ()=>{
    const gpsTab = qs('.tab[data-tab="gps"]')
    gpsTab?.click()
    setTimeout(()=>{
      qs("#gpsPanel")?.scrollIntoView({behavior:"smooth", block:"center"})
      const routeBtn = qs("#gpsStorefrontRouteBtn")
      routeBtn?.click()
    }, 180)
  })
  ownerCloseBtn?.addEventListener("click", hideOwner)
  modal.addEventListener("click", (event)=>{
    if(event.target === modal || event.target.classList?.contains("remote-fastpay-backdrop")) closeRemoteFastPay()
  })
  window.addEventListener("supportrd-login-ready", ()=>{ resumePendingPurchaseIntent() })
  window.addEventListener("focus", ()=>{ setTimeout(()=>resumePendingPurchaseIntent(), 140) })
  window.addEventListener("focus", ()=>{
    setTimeout(()=>{
      try{
        const pending = JSON.parse(localStorage.getItem("supportrd_checkout_pending") || "null")
        if(!pending?.title) return
        if(Date.now() - Number(pending.at || 0) < 2500) return
        localStorage.removeItem("supportrd_checkout_pending")
        if(typeof openRemoteSheet === "function"){
          openRemoteSheet("Thank You", `
            <div class="float-sheet-panel">
              <h4>Thank you for supporting SupportRD</h4>
              <p>${pending.title} was your latest checkout lane. If Shopify finished the payment, your purchase is now tied to your buyer account and ready to connect back into the Remote.</p>
              <div class="float-sheet-button-row">
                <button class="btn" data-open-fastpay>Open Fast Pay Again</button>
                <button class="btn ghost" data-sheet-close>Back To Remote</button>
              </div>
            </div>
          `, { message:`${pending.title} returned from the Shopify checkout lane.` })
        }else{
          openMiniWindow("Thank You", `${pending.title} returned from the checkout lane. If Shopify finished the payment, SupportRD is ready for the next route.`)
        }
      }catch{}
    }, 180)
  })
  setTimeout(()=>resumePendingPurchaseIntent(), 500)
  window.openRemoteFastPay = openRemoteFastPay
  window.closeRemoteFastPay = closeRemoteFastPay
  window.openPurchaseDetails = openPurchaseDetails

  function openCustomOrderSupport(sourceLabel = "Fast Pay", kind = "custom"){
    const isBulk = kind === "bulk"
    const title = isBulk ? "Bulk Product / Fly-In Session" : "Custom Order"
    const note = isBulk
      ? "Use this when somebody wants you to fly in, wants an in-person session, or wants to order bulk product with the inventor."
      : "Use this when the customer needs an email-backed custom order before the normal product checkout lane."
    const mailto = buildCustomOrderMailto(isBulk ? "bulk" : "custom")
    pushSupportContactRequest({
      type: isBulk ? "bulk" : "custom",
      name: state?.socialLinks?.name || "SupportRD visitor",
      summary: `${title} opened from ${sourceLabel}.`,
      notes: note
    })
    trackAcquisitionSignal(isBulk ? "bulk_flyin_opened" : "custom_order_opened", {
      lane: ACQUISITION_LANES.products,
      stage: isBulk ? "purchase-ready" : "premium-curious",
      socialFeedback: isBulk
        ? "A visitor wants to talk about a fly-in / bulk product session with the inventor."
        : "A visitor moved into the custom-order email lane before checkout."
    })
    openRemoteSheet(title, `
      <div class="float-sheet-panel">
        <h4>${title}</h4>
        <p>${note}</p>
        <div class="float-sheet-status">${isBulk ? "This lane helps SupportRD see who wants an in-person session or bulk product order." : "This lane gives SupportRD a real email trail for manual orders and serious customer intent."}</div>
        <div class="float-sheet-button-row">
          <button class="btn" data-link-open="${mailto}">${isBulk ? "Email Fly-In / Bulk Request" : "Email Custom Order"}</button>
          <button class="btn ghost" data-link-open="${LINKS.custom}">Open Custom Order Page</button>
          <button class="btn ghost" data-open-fastpay>Back To Fast Pay</button>
        </div>
      </div>
    `, { message: `${title} is open from ${sourceLabel}.`, route: "payments" })
    if(status) status.textContent = `${title} is open. Use the email route if this customer needs a manual follow-up.`
  }
}
function setupJakeQuickSwitch(){
  const mini = qs("#miniSwitchJake")
  const orb = qs("#proJakeOrb")
  if(!mini && !orb) return
  function switchJake(){
    state.activeAssistant = "projake"
    applyAssistantUI(true)
    openMiniWindow("Pro Jake", "Pro Jake is now active.")
  }
  mini?.addEventListener("click", switchJake)
  orb?.addEventListener("click", switchJake)
}

function setupAria(){
  const btn = qs("#voiceToggle")
  const sphere = qs("#ariaSphere")
  const handsBtn = qs("#handsfreeToggle")
  let floatingHandsfree = qs("#floatingHandsfreeToggle")
  let ariaActive = false
  let mediaRecorder = null
  let audioChunks = []
      let chunkCount = 0
  let recStream = null
  let maxRecordTimer = null
  let vadTimer = null
  let liveTranscript = ""
  let transcribeBusy = false
  let transcribeFailures = 0
  function interruptPageAudio(){
    try{
      if(window.speechSynthesis) window.speechSynthesis.cancel()
    }catch{}
    qsa("audio, video").forEach((media)=>{
      try{
        media.pause()
        media.muted = true
      }catch{}
    })
  }
  function releasePageAudio(){
    qsa("audio, video").forEach((media)=>{
      try{ media.muted = false }catch{}
    })
  }
  function playAssistantCue(type){
    try{
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if(!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime
      const gain = ctx.createGain()
      gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.0001, now)
      const tones = type === "close"
        ? [[680, 0.0, 0.09], [520, 0.1, 0.1]]
        : type === "response"
          ? [[440, 0.0, 0.08], [660, 0.1, 0.08], [880, 0.2, 0.1]]
          : [[520, 0.0, 0.08], [760, 0.09, 0.1]]
      tones.forEach(([freq, offset, dur])=>{
        const osc = ctx.createOscillator()
        osc.type = type === "intro" ? "triangle" : "sine"
        osc.frequency.setValueAtTime(freq, now + offset)
        osc.connect(gain)
        osc.start(now + offset)
        osc.stop(now + offset + dur)
      })
      gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42)
      setTimeout(()=>{ try{ ctx.close() }catch{} }, 650)
    }catch{}
  }
  function ariaMasterGreeting(){
    interruptPageAudio()
    playAssistantCue("intro")
    const assistantName = getActiveAssistantName()
    const proUnlocked = state.subscription === "pro" || isProOverride()
    const line = assistantName === "Pro Jake"
      ? "Pro Jake online. Studio and hair support are ready."
      : (proUnlocked ? "How can I serve you master." : "How can I support your hair goals today?")
    const transcriptEl = qs("#ariaTranscript")
    if(transcriptEl){ transcriptEl.textContent = line }
    showSpeechPopup(assistantName, line)
  }

  function syncHandsFree(){
    if(!handsBtn) return
    handsBtn.textContent = handsFreeMode ? "Hands-Free: ON" : "Hands-Free: OFF"
    handsBtn.classList.toggle("active", handsFreeMode)
    if(!floatingHandsfree){
      floatingHandsfree = document.createElement("button")
      floatingHandsfree.id = "floatingHandsfreeToggle"
      floatingHandsfree.className = "floating-handsfree-toggle"
      floatingHandsfree.type = "button"
      floatingHandsfree.hidden = true
      document.body.appendChild(floatingHandsfree)
      floatingHandsfree.addEventListener("click", ()=>{
        handsFreeMode = !handsFreeMode
        if(!handsFreeMode){
          stopOpenAIListening()
        }else{
          startOpenAIListening()
        }
        syncHandsFree()
      })
    }
    floatingHandsfree.hidden = !handsFreeMode
    floatingHandsfree.textContent = handsFreeMode ? `${getAssistantDisplayName()} Handsfree Live · Tap To Stop` : "Handsfree Off"
  }
  if(handsBtn){
    syncHandsFree()
    handsBtn.addEventListener("click", ()=>{
      handsFreeMode = !handsFreeMode
      syncHandsFree()
      if(handsFreeMode) startOpenAIListening()
      else stopOpenAIListening()
    })
  }

function uiError(msg){
  if(!msg) return
  if(msg.startsWith("Mic:") || msg.startsWith("Voice error")) return
  if(!SUPPRESS_ERROR_TEXT) toast(msg)
}

  function stopVAD(){
    if(vadTimer){ clearInterval(vadTimer); vadTimer = null }
  }

  function startVAD(stream){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const src = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      src.connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      let silenceMs = 0
      let heardSpeech = false
      vadTimer = setInterval(()=>{
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for(let i=0;i<data.length;i++){
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        const rms = Math.sqrt(sum / data.length)
        if(rms > 0.012){
          heardSpeech = true
          silenceMs = 0
        } else if(heardSpeech){
          silenceMs += 150
        }
        if(heardSpeech && silenceMs >= 2000){
          stopOpenAIListening()
        }
      }, 150)
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
  }

  async function transcribeChunk(blob){
    if(transcribeBusy) return
    transcribeBusy = true
    try{
      const form = new FormData()
      form.append("audio", blob, "chunk.webm")
      if(typeof getAriaLang === "function"){ form.append("language", getAriaLang()) }
      const r = await fetch("/api/aria/transcribe", { method:"POST", body: form })
      if(!r.ok){
        let detail = ''
        try{ const d = await r.json(); detail = (d.detail || d.error || '') }catch{}
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failed ' + r.status + (detail ? ' · ' + detail : '')
        return
      }
      if(r.ok){
        transcribeFailures = 0
        const d = await r.json()
        const t = (d.text || "").trim()
        if(t){
          liveTranscript = (liveTranscript + " " + t).trim()
          const transcriptEl = qs("#ariaTranscript")
          if(transcriptEl){ transcriptEl.textContent = liveTranscript }
          showLiveSpeechPopup(liveTranscript)
        }
      }
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
    transcribeBusy = false
  }

  async function stopOpenAIListening(){
    if(maxRecordTimer){ clearTimeout(maxRecordTimer); maxRecordTimer = null }
    stopVAD()
    try{
      if(mediaRecorder && mediaRecorder.state !== "inactive"){
        mediaRecorder.stop()
      }
    }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    }
  }

  async function startOpenAIListening(options = {}){
    if(ariaActive){
      await stopOpenAIListening()
    }
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if(Speech){
      try{
        startListenLoop()
        setAriaFlow("listening")
        const transcriptEl = qs("#ariaTranscript")
        const recognition = new Speech()
        let finalTranscript = ""
        recognition.lang = getAriaLang()
        recognition.interimResults = true
        recognition.continuous = false
        recognition.maxAlternatives = 1
        recognition.onresult = (event)=>{
          let interim = ""
          for(let i = event.resultIndex; i < event.results.length; i += 1){
            const piece = event.results[i][0]?.transcript || ""
            if(event.results[i].isFinal) finalTranscript += `${piece} `
            else interim += piece
          }
          if(transcriptEl){
            transcriptEl.textContent = (finalTranscript + interim).trim() || `${options.assistantName || getAssistantDisplayName()} is listening...`
          }
        }
        recognition.onerror = ()=>{
          setAriaFlow("idle")
          stopListenLoop()
        }
        recognition.onend = ()=>{
          const transcript = finalTranscript.trim()
          if(!transcript){
            setAriaFlow("idle")
            stopListenLoop()
            playAssistantCue("close")
            setTimeout(()=>releasePageAudio(), 260)
            return
          }
          if(transcriptEl) transcriptEl.textContent = transcript
          finalizeLiveSpeechPopup()
          stopListenLoop()
          setAriaFlow("processing")
          setTimeout(async ()=>{
            if(transcriptEl) transcriptEl.textContent = `${options.assistantName || getAssistantDisplayName()} is thinking...`
            playAssistantCue("response")
            await askAria(transcript)
            setTimeout(()=>playAssistantCue("close"), 180)
            setTimeout(()=>releasePageAudio(), 420)
            if(handsFreeMode){ setTimeout(()=>{ startOpenAIListening(options) }, 900) }
          }, Number(options.thinkDelay || 2000))
        }
        recognition.start()
        ariaActive = true
        maxRecordTimer = setTimeout(()=>{
          try{ recognition.stop() }catch{}
        }, 10000)
        return
      }catch{}
    }
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      const fallback = `${options.assistantName || getAssistantDisplayName()} needs microphone access on this device before the speech flow can start.`
      const transcriptEl = qs("#ariaTranscript")
      if(transcriptEl) transcriptEl.textContent = fallback
      showSpeechPopup(options.assistantName || getAssistantDisplayName(), fallback)
      return
    }
    if(!window.MediaRecorder){
      const fallback = `${options.assistantName || getAssistantDisplayName()} needs a browser with live recording support before the speech flow can start.`
      const transcriptEl = qs("#ariaTranscript")
      if(transcriptEl) transcriptEl.textContent = fallback
      showSpeechPopup(options.assistantName || getAssistantDisplayName(), fallback)
      return
    }
    try{
      startListenLoop()
      setAriaFlow("listening")
      
      liveTranscript = ""
      const reelVid = qs(".reel-embed video")
      if(reelVid){ try{ reelVid.pause() }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    } }

      recStream = await navigator.mediaDevices.getUserMedia({audio:true})
      audioChunks = []
      let chunkCount = 0
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm"
      mediaRecorder = new MediaRecorder(recStream, { mimeType: mime })
      mediaRecorder.ondataavailable = (e)=>{
        if(e.data && e.data.size){
          audioChunks.push(e.data)
          chunkCount++
          transcribeChunk(e.data)
        }
      }
      mediaRecorder.onerror = ()=>{  }
      mediaRecorder.onstop = async ()=>{
        ariaActive = false
        if(reelVid){ try{ reelVid.play() }catch{
      transcribeFailures += 1
      if(transcribeFailures >= 3){
        const t = qs('#ariaTranscript')
        if(t) t.textContent = 'Mic: transcribe failing (check server)'
      }
    } }
        if(!chunkCount){  setAriaFlow('idle'); stopListenLoop(); return }
        const blob = new Blob(audioChunks, {type: "audio/webm"})
        if(recStream){ recStream.getTracks().forEach(t=>t.stop()) }
      try{
          setAriaFlow("processing")
          const form = new FormData()
          form.append("audio", blob, "speech.webm")
          form.append("language", getAriaLang())
          const r = await fetch("/api/aria/transcribe", { method:"POST", body: form })
          if(!r.ok){
            let detail = ''
            try{ const dErr = await r.json(); detail = (dErr.detail || dErr.error || '') }catch{}
            throw new Error(detail || 'transcribe failed')
          }
          const d = await r.json()
          const transcript = (d.text || "").trim() || liveTranscript
          const transcriptEl = qs("#ariaTranscript")
          if(transcriptEl){ transcriptEl.textContent = transcript || "No speech detected." }
          finalizeLiveSpeechPopup()
          if(transcript){
            stopListenLoop()
            setTimeout(async ()=>{
              const transcriptEl = qs("#ariaTranscript")
              if(transcriptEl) transcriptEl.textContent = `${options.assistantName || getAssistantDisplayName()} is thinking...`
              playAssistantCue("response")
              await askAria(transcript)
              setTimeout(()=>playAssistantCue("close"), 180)
              setTimeout(()=>releasePageAudio(), 420)
              if(handsFreeMode){ setTimeout(()=>{ startOpenAIListening(options) }, 900) }
            }, Number(options.thinkDelay || 2700))
          } else {
            setAriaFlow("idle")
            stopListenLoop()
            playAssistantCue("close")
            setTimeout(()=>releasePageAudio(), 260)
            if(handsFreeMode){ setTimeout(()=>{ startOpenAIListening(options) }, 900) }
          }
        }catch(err){
          uiError("Voice error: " + (err && err.message ? err.message : "could not transcribe"))
          setAriaFlow("idle")
          stopListenLoop()
          playAssistantCue("close")
          setTimeout(()=>releasePageAudio(), 260)
        }
      }
      try{ mediaRecorder.start(600) }catch{ mediaRecorder.start() }
      ariaActive = true
      startVAD(recStream)
      maxRecordTimer = setTimeout(()=>{ stopOpenAIListening() }, 12000)
    }catch{
      
      setAriaFlow("idle")
      stopListenLoop()
      playAssistantCue("close")
      setTimeout(()=>releasePageAudio(), 260)
    }
  }

  if(btn){ btn.addEventListener("click", ()=>{ ariaMasterGreeting(); startOpenAIListening() }) }
  if(sphere){
    sphere.classList.add("aria-pulse")
    sphere.addEventListener("click", ()=>{ ariaMasterGreeting(); startOpenAIListening() })
  }
  window.startAriaListening = startOpenAIListening
  window.askAriaDirect = askAria
}

function renderApp(name){
  const body = qs("#appBody")
  if(!body) return
  if(name && name.includes("Donate")){
    body.innerHTML = `
      <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
        <div style="width:140px;height:120px;border-radius:18px;background:linear-gradient(135deg,#f7e7c9,#e4b97e);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.25);">
          <svg width="110" height="80" viewBox="0 0 110 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="18" width="94" height="44" rx="14" fill="#f2d8a6" stroke="#d3aa6c" stroke-width="3"/>
            <rect x="16" y="26" width="78" height="28" rx="12" fill="#f7e6c9"/>
            <circle cx="40" cy="40" r="6" fill="#d0b184"/>
            <circle cx="66" cy="40" r="6" fill="#d0b184"/>
          </svg>
        </div>
        <div style="flex:1;min-width:220px;">
          <div style="font-weight:700;margin-bottom:6px;">Donate to the Poor · Auto Dissolve Bar</div>
          <div style="color:var(--muted);margin-bottom:10px;">
            Movement: every bar supports local care packages and hygiene support. Your purchase helps fund soap, shampoo, and essentials.
          </div>
          <button class="btn" id="donateLinkBtn">Open Donation</button>
        </div>
      </div>
    `
    qs("#donateLinkBtn").addEventListener("click", ()=>openLinkModal(LINKS.donate, "Donate to the Poor"))
    return
  }
  if(name === "Contact Anthony"){
    body.innerHTML = `Email: AgentAnthony@supportdr.com<br>Phone: 7043452867`
    return
  }
  if(name === "Snapshot Coder Idea"){
    if(state.subscription === "free"){
      body.innerHTML = `<div class="lock-pill">Premium feature</div><div style="margin-top:8px;color:var(--muted);">Upgrade to unlock Snapshot Coder insights and GPT‑5.2 Codex tracking.</div><button class="btn" id="openSubFromSnap">Upgrade</button>`
      qs("#openSubFromSnap").addEventListener("click", ()=>openModal("subscriptionModal"))
      return
    }
    body.innerHTML = `<div style="margin-bottom:10px;">Paste your recent work and let ARIA score progress, blockers, and next steps.</div><textarea id="coderInput" style="width:100%;min-height:140px;"></textarea><div style="display:flex;gap:8px;flex-wrap:wrap;"><button class="btn" id="coderAnalyze">Analyze with ARIA (GPT 5.2 Codex)</button><button class="btn ghost" id="coderSend">Send Snapshot to Anthony</button></div>`
    qs("#coderAnalyze").addEventListener("click", ()=>toast("ARIA analysis queued"))
    qs("#coderSend").addEventListener("click", ()=>{
      const text = encodeURIComponent(qs("#coderInput").value || "")
      openLinkModal(`mailto:AgentAnthony@supportdr.com?subject=Snapshot%20Coder%20Idea&body=${text}`,"Send Snapshot")
    })
    return
  }
  if(name === "Live Coder Suggestions"){
    body.innerHTML = `
      <div style="font-weight:700;margin-bottom:6px;">30‑Day Subscription Build Plan</div>
      <ul style="margin:0 0 10px 16px;color:var(--muted);">
        <li>Week 1: onboarding flow, account linking, analytics baseline.</li>
        <li>Week 2: routine generator improvements + scan history.</li>
        <li>Week 3: social posting automation + SEO blog cadence.</li>
        <li>Week 4: growth experiments + retention and push/PWA upgrades.</li>
      </ul>
      <div style="color:var(--muted);margin-bottom:10px;">Send a suggestion and we’ll credit 1 month premium for accepted ideas.</div>
      <textarea id="suggestionInput" style="width:100%;min-height:120px;"></textarea>
      <button class="btn" id="sendSuggestion">Send Suggestion</button>
    `
    qs("#sendSuggestion").addEventListener("click", ()=>{
      const text = encodeURIComponent(qs("#suggestionInput").value || "")
      openLinkModal(`mailto:AgentAnthony@supportdr.com?subject=Live%20Coder%20Suggestion&body=${text}`,"Send Suggestion")
    })
    return
  }
  if(name === "Live Hair Score"){
    body.innerHTML = `
      <div class="float-sheet-panel">
        <h4>SupportRD Progress</h4>
        <p>SupportRD is keeping hair progress quietly in the background so the Remote can stay focused on hair help, products, and live support.</p>
      </div>
    `
    return
  }
  if(name === "TV Reel"){
    body.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">SupportRD TV Reel</div>
      <div style="color:var(--muted);margin-bottom:10px;">Open the reel in full mode with hair clips rotating every 10 seconds.</div>
      <button class="btn" id="openTvReelFromApp">Open TV Reel</button>`
    const open = qs("#openTvReelFromApp")
    if(open){ open.addEventListener("click", ()=>openModal("reelModal")) }
    return
  }
  if(name === "Brochure"){
    body.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">SupportRD Brochure</div>
      <div style="color:var(--muted);margin-bottom:10px;">Open the full brochure with all product pages.</div>
      <button class="btn" id="openBrochureFromApp">Open Brochure</button>`
    const open = qs("#openBrochureFromApp")
    if(open){ open.addEventListener("click", ()=>openModal("brochureModal")) }
    return
  }
  if(name === "Competition Console"){
    body.innerHTML = `
      <div style="font-weight:700;margin-bottom:8px;">Competition Console (Bottom Panel)</div>
      <div style="color:var(--muted);margin-bottom:10px;">Start 30-minute or 1-hour live attention challenge. Winner is measured by laughs, excitement, and votes.</div>
      <div class="request-grid" style="margin-bottom:10px;">
        <select id="arenaDuration">
          <option value="30">30 Minutes</option>
          <option value="60">1 Hour</option>
        </select>
        <input id="arenaBetAmount" type="number" min="1" max="50000" step="0.01" placeholder="Bet amount (USD)">
        <select id="arenaPaymentSource">
          <option value="debit_card">Debit Card</option>
          <option value="bank_account">Bank Account</option>
        </select>
        <label class="system-check"><input id="arenaPaymentLinked" type="checkbox"> My debit card/bank is linked for immediate in-house transfer.</label>
        <button class="btn" id="arenaStartLive">Go Live Competition</button>
      </div>
      <div class="system-sub" id="arenaStatus">Ready.</div>
    `
    const start = qs("#arenaStartLive")
    if(start){
      start.addEventListener("click", async ()=>{
        const duration_minutes = Number(qs("#arenaDuration")?.value || 0)
        const bet_amount = Number(qs("#arenaBetAmount")?.value || 0)
        const payment_source = (qs("#arenaPaymentSource")?.value || "").trim()
        const payment_linked = !!qs("#arenaPaymentLinked")?.checked
        const email = ((state.socialLinks && state.socialLinks.email) || "").trim().toLowerCase()
        const out = qs("#arenaStatus")
        try{
          const r = await fetch("/api/competitions/start-live", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body: JSON.stringify({duration_minutes, bet_amount, payment_source, payment_linked, email})
          })
          const d = await r.json()
          if(d && d.ok){
            const post = qs("#postInput")
            if(post){
              post.value = `LIVE COMPETITION ${d.session_id} · ${d.duration_minutes} min · Bet $${d.bet_amount} · Metrics: laughs/excitement/votes.`
            }
            if(out) out.textContent = `Live ${d.session_id} started. ${d.recording_hint} Transfer: ${d.transfer_state}.`
            openMiniWindow("Competition Live", "Live started. Post panel is ready to record session activity.")
          } else {
            if(out) out.textContent = `Start failed: ${d.error || "unknown"}`
            openMiniWindow("Competition", `Start failed: ${d.error || "unknown"}`)
          }
        }catch{
          if(out) out.textContent = "Start failed: network_error"
        }
      })
    }
    return
  }
  if(name === "Shopify Products"){
    const digitalProducts = [
      {id:"premium35", title:"ARIA Puzzle Tier", desc:"$35 monthly digital guidance tier with puzzle unlock flow and routine support.", price:"$35/mo", image:"/static/images/brochure-shampoo.jpg", link:LINKS.premium},
      {id:"pro50", title:"Unlimited ARIA Professional", desc:"$50 monthly unlimited ARIA support with direct deal channel.", price:"$50/mo", image:"/static/images/brochure-hero.jpg", link:LINKS.pro},
      {id:"bingo100", title:"Bingo Fantasy", desc:"Calm, humorous daily support voice pack for high-stress routines.", price:"$100/mo", image:"/static/images/brochure-social.jpg", link:LINKS.bingo100},
      {id:"studio100", title:"Jake Premium Studio", desc:"Extra FX, deeper Jake conversation, Gig 4K theme additions, and monthly studio premium access.", price:"$100/mo", image:"/static/images/brochure-contacts.jpg", link:LINKS.studio100},
      {id:"family200", title:"Family Fantasy Pack", desc:"Family-safe narrative themes to coach hair routines with personality.", price:"$200/mo", image:"/static/images/brochure-contacts.jpg", link:LINKS.family200},
      {id:"basic300", title:"21+ Basic Fantasy", desc:"Flirty but non-explicit hair narrative mode with confident tone.", price:"$300/mo", image:"/static/images/brochure-bright-droplets.jpg", link:LINKS.fantasy300},
      {id:"adv600", title:"21+ Advanced Fantasy", desc:"Premium storytelling mode with personalized romantic tone and pacing.", price:"$600/mo", image:"/static/images/brochure-fast-dropper.jpg", link:LINKS.fantasy600}
    ]
    body.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">SupportRD Products</div>
      <div style="color:var(--muted);margin-bottom:10px;">Professional digital lineup with visual previews and fast checkout.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        <button class="btn" id="openMyOrders">Open My Orders</button>
        <button class="btn ghost" id="openShopifyCart">Open Shopify Cart</button>
      </div>
      <div class="digital-product-grid" style="margin-bottom:10px;">
        ${digitalProducts.map(p=>`<article class="digital-product-card">
          <img src="${p.image}" alt="${p.title}" loading="lazy">
          <div class="digital-product-body">
            <div class="digital-product-title">${p.title}</div>
            <div class="gift-price">${p.price}</div>
            <div class="digital-product-desc">${p.desc}</div>
            <div class="digital-product-actions">
              <button class="btn ghost product-preview-btn" data-product="${p.id}">Preview</button>
              <button class="btn product-buy-btn" data-product="${p.id}">Buy Now</button>
            </div>
          </div>
        </article>`).join("")}
      </div>
      <div id="productPreviewPop" class="product-preview-pop" style="display:none;">
        <div class="product-preview-card glass">
          <button class="btn ghost" id="closeProductPreview">Close</button>
          <img id="previewImage" src="" alt="Product Preview">
          <div id="previewTitle" class="digital-product-title"></div>
          <div id="previewPrice" class="gift-price"></div>
          <div id="previewDesc" class="digital-product-desc"></div>
          <button class="btn" id="previewBuyNow">Buy This Product</button>
        </div>
      </div>
      <div id="shopifyLineup" class="gift-grid"></div>
      <button class="btn" id="openCustomShop">Open Custom Order</button>`
    qs("#openMyOrders").addEventListener("click", ()=>openLinkModal(LINKS.myOrders, "My Orders"))
    qs("#openShopifyCart").addEventListener("click", ()=>openLinkModal(LINKS.cart, "Shopify Cart"))
    let activeProduct = null
    const showPreview = (id)=>{
      const product = digitalProducts.find(p=>p.id === id)
      if(!product) return
      activeProduct = product
      const pop = qs("#productPreviewPop")
      if(!pop) return
      const previewImage = qs("#previewImage")
      const previewTitle = qs("#previewTitle")
      const previewPrice = qs("#previewPrice")
      const previewDesc = qs("#previewDesc")
      if(previewImage) previewImage.src = product.image
      if(previewTitle) previewTitle.textContent = product.title
      if(previewPrice) previewPrice.textContent = product.price
      if(previewDesc) previewDesc.textContent = product.desc
      pop.style.display = "flex"
    }
    qsa(".product-preview-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>showPreview(btn.dataset.product || ""))
    })
    qsa(".product-buy-btn").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const product = digitalProducts.find(p=>p.id === (btn.dataset.product || ""))
        if(product){
          const allowed = window.requireSupportRDLoginForAction?.({
            title: "Sign In To Purchase",
            message: `Sign in or create an account to purchase ${product.title}. SupportRD keeps premium access, orders, and upgrades tied to the right account.`
          })
          if(allowed === false) return
          openLinkModal(product.link, product.title)
        }
      })
    })
    const closePreview = qs("#closeProductPreview")
    if(closePreview){
      closePreview.addEventListener("click", ()=>{
        const pop = qs("#productPreviewPop")
        if(pop) pop.style.display = "none"
      })
    }
    const previewBuy = qs("#previewBuyNow")
    if(previewBuy){
      previewBuy.addEventListener("click", ()=>{
        if(activeProduct){
          const allowed = window.requireSupportRDLoginForAction?.({
            title: "Sign In To Purchase",
            message: `Sign in or create an account to purchase ${activeProduct.title}. SupportRD keeps premium access, orders, and upgrades tied to the right account.`
          })
          if(allowed === false) return
          openLinkModal(activeProduct.link, activeProduct.title)
        }
      })
    }
    qs("#openCustomShop").addEventListener("click", ()=>openLinkModal(LINKS.custom, "Custom Order"))
    loadProducts().then(items=>{
      const fallback = [
        {title:"Shampoo Aloe Vera", price:"20"},
        {title:"Formula Exclusiva", price:"55"},
        {title:"Laciador Crece", price:"40"},
        {title:"Mascarilla Capilar", price:"25"},
        {title:"Gotero Rapido", price:"55"},
        {title:"Gotitas Brillantes", price:"30"}
      ]
      const list = items.length ? items : fallback
      const wrap = qs("#shopifyLineup")
      if(!wrap) return
      wrap.innerHTML = list.map(p=>`<div class="gift-card"><div style="font-weight:700;">${p.title}</div><div class="gift-price">$${p.price}</div></div>`).join("")
    })
    return
  }
  if(name === "Subscription Banner"){
    body.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">Subscription Banner</div>
      <div style="color:var(--muted);margin-bottom:10px;">Current plan: <strong>${state.subscription.toUpperCase()}</strong></div>
      <div class="gift-grid">
        <div class="gift-card"><div style="font-weight:700;">Premium</div><div class="gift-price">$35 / month</div></div>
        <div class="gift-card"><div style="font-weight:700;">Professional</div><div class="gift-price">$50 / month</div></div>
        <div class="gift-card"><div style="font-weight:700;">Bingo Fantasy</div><div class="gift-price">$100 / month</div></div>
        <div class="gift-card"><div style="font-weight:700;">Family Fantasy</div><div class="gift-price">$200 / month</div></div>
        <div class="gift-card"><div style="font-weight:700;">Basic Fantasy 21+</div><div class="gift-price">$300 / month</div></div>
        <div class="gift-card"><div style="font-weight:700;">Advanced Fantasy 21+</div><div class="gift-price">$600 / month</div></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn" id="openSubscriptionBanner">Open Subscription</button>
        <button class="btn ghost" id="openOrdersBanner">My Orders</button>
        <button class="btn ghost" id="openCartBanner">Shopify Cart</button>
      </div>`
    qs("#openSubscriptionBanner").addEventListener("click", ()=>openModal("subscriptionModal"))
    qs("#openOrdersBanner").addEventListener("click", ()=>openLinkModal(LINKS.myOrders, "My Orders"))
    qs("#openCartBanner").addEventListener("click", ()=>openLinkModal(LINKS.cart, "Shopify Cart"))
    return
  }
  if(name === "AI Millionaire Hub"){
    body.innerHTML = `
      <div style="font-weight:700;margin-bottom:8px;">AI Millionaire Source Hub</div>
      <div style="color:var(--muted);margin-bottom:10px;">Use these links to curate daily AI wealth content.</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        <button class="btn ghost" id="aiHubStack">Best AI Stack 2026</button>
        <button class="btn ghost" id="aiHubStories">AI Millionaire Stories</button>
      </div>
      <div class="mini-list">Daily cadence: story · tool stack · tutorial · CTA to premium.</div>
    `
    qs("#aiHubStack").addEventListener("click", ()=>openLinkModal(AI_LINKS.best_ai_2026, "Best AI Tools 2026"))
    qs("#aiHubStories").addEventListener("click", ()=>openLinkModal(AI_LINKS.ai_millionaire, "AI Millionaire Stories"))
    return
  }
  if(name === "Studio Mode"){
    body.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">Pro Jake Studio Mode</div>
      <div style="color:var(--muted);margin-bottom:10px;">One tap switches from SupportRD main console into full Studio mode.</div>
      <button class="btn primary" id="openStudioFromAppCard">Open Studio</button>`
    const btn = qs("#openStudioFromAppCard")
    if(btn){
      btn.addEventListener("click", ()=>{
        closeModal("appModal")
        if(typeof window.openStudioMode === "function"){ window.openStudioMode() }
      })
    }
    return
  }
  body.textContent = name
}

function setupAppsDock(){
  const row = qs("#appsRow")
  const library = qs("#appsLibrary")
  const select = qs("#appSwapSelect")
  if(!row || !select) return

  const allApps = [
    "Blog",
    "Competition Console",
    "TV Reel",
    "Brochure",
    "Studio Mode",
    "Snapshot Coder Idea",
    "Live Coder Suggestions",
    "Donate to the Poor · Auto Dissolve Bar",
    "Settings",
    "Contact Anthony · Family Support",
    "Shopify Products",
    "SEO Engine Viewer",
    "Occasion Editor",
    "Subscription Banner"
  ]

  select.innerHTML = '<option value="">Replace Selected App…</option>' + allApps.map(a=>`<option value="${a}">${a}</option>`).join("")

  let activeCard = null
  row.querySelectorAll(".app-card").forEach(card=>{
    card.addEventListener("click", ()=>{
      row.querySelectorAll(".app-card").forEach(c=>c.classList.remove("active"))
      card.classList.add("active")
      activeCard = card
    })
  })

  function applyAppToCard(card, name, linkOverride){
    card.textContent = name
    card.dataset.app = name.replace(" · Family Support","Contact Anthony")
    if(linkOverride !== undefined){
      card.dataset.link = linkOverride
    } else if(name.includes("Donate")){
      card.dataset.link = LINKS.donate
    } else {
      card.dataset.link = ""
    }
  }

  select.addEventListener("change", ()=>{
    if(!activeCard || !select.value) return
    applyAppToCard(activeCard, select.value)
    select.value = ""
    toast("App replaced")
  })

  let dragEl = null
  function wireCard(card, source){
    card.setAttribute("draggable","true")
    card.addEventListener("dragstart", e=>{
      dragEl = source === "row" ? card : null
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", JSON.stringify({
        app: card.dataset.app,
        link: card.dataset.link || "",
        source
      }))
      card.classList.add("dragging")
    })
    card.addEventListener("dragend", ()=>{
      card.classList.remove("dragging")
      dragEl = null
    })
    card.addEventListener("dragover", e=>{
      e.preventDefault()
      card.classList.add("drag-over")
    })
    card.addEventListener("dragleave", ()=>card.classList.remove("drag-over"))
    card.addEventListener("drop", e=>{
      e.preventDefault()
      card.classList.remove("drag-over")
      let payload = {}
      try{
        payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}")
      }catch{
        payload = {}
      }
      if(!payload.app) return
      if(payload.source === "row" && dragEl && dragEl !== card && card.parentElement === row){
        const draggedNext = dragEl.nextSibling
        const targetNext = card.nextSibling
        const dragBeforeTarget = draggedNext === card
        if(dragBeforeTarget){
          row.insertBefore(card, dragEl)
        } else {
          row.insertBefore(dragEl, targetNext)
          row.insertBefore(card, draggedNext)
        }
        toast("Apps swapped")
        return
      }
      if(payload.source === "library"){
        applyAppToCard(card, payload.app, payload.link || "")
        toast("App replaced")
      }
    })
  }

  row.querySelectorAll(".app-card").forEach(card=>wireCard(card, "row"))
  if(library){
    library.querySelectorAll(".app-card").forEach(card=>wireCard(card, "library"))
  }
}

function setupEngineGlassViewer(){
  const wrap = qs("#tab-seo")
  if(!wrap) return
  const switches = qsa("[data-engine-view]")
  const panes = {
    action: qs("#engineViewAction"),
    render: qs("#engineViewRender"),
    ecosystem: qs("#engineViewEcosystem")
  }
  const actionFeed = qs("#engineActionFeed")
  const renderFeed = qs("#engineRenderFeed")
  const ecoFeed = qs("#engineEcoFeed")
  const ecoVideoWrap = qs("#engineEcoVideoWrap")
  const snapInput = qs("#engineSnapInput")
  const snapBtn = qs("#engineSnapBtn")
  const myFreqBtn = qs("#engineMyFreqBtn")
  const myFreqFeed = qs("#engineMyFreqFeed")
  const btnAction = qs("#engineRefreshAction")
  const btnRender = qs("#engineRefreshRender")
  const btnResort = qs("#engineApplyResortLook")

  function setView(view){
    switches.forEach(b=>b.classList.toggle("active", b.dataset.engineView === view))
    Object.keys(panes).forEach(k=>{
      if(panes[k]) panes[k].classList.toggle("active", k === view)
    })
  }
  switches.forEach(b=>b.addEventListener("click", ()=>setView(b.dataset.engineView || "action")))

  function linesToText(lines){
    if(!Array.isArray(lines) || !lines.length) return "No live rows yet."
    return lines.map(x=>`- ${x}`).join("\n")
  }
  async function refreshFeed(){
    try{
      const r = await fetch("/api/engine-glass/stream")
      const d = await r.json()
      if(!(d && d.ok)) throw new Error("feed_error")
      if(actionFeed) actionFeed.textContent = linesToText(d.action_bot_lines)
      if(renderFeed) renderFeed.textContent = linesToText(d.render_logging_lines)
      if(ecoFeed) ecoFeed.textContent = linesToText(d.ecosystem_lines)
      if(ecoVideoWrap) ecoVideoWrap.style.display = d.ecosystem_live_video ? "block" : "none"
      if(d.resort_mode){ document.body.classList.add("resort-brochure") }
    }catch{
      if(actionFeed) actionFeed.textContent = "Action Bot feed unavailable."
      if(renderFeed) renderFeed.textContent = "Render Logging feed unavailable."
      if(ecoFeed) ecoFeed.textContent = "Ecosystem feed unavailable."
    }
  }
  if(btnAction) btnAction.addEventListener("click", refreshFeed)
  if(btnRender) btnRender.addEventListener("click", refreshFeed)
  if(btnResort){
    btnResort.addEventListener("click", ()=>{
      document.body.classList.add("resort-brochure")
      openMiniWindow("Resort Look", "Ecosystem resort brochure look applied.")
    })
  }
  if(snapBtn){
    snapBtn.addEventListener("click", async ()=>{
      const content = (snapInput && snapInput.value || "").trim()
      if(!content){
        openMiniWindow("Snapshot", "Type words first, then snap.")
        return
      }
      try{
        const sourceEmail = ((state.socialLinks && state.socialLinks.email) || "ui").trim().toLowerCase()
        const r = await fetch("/api/engine-glass/snapshot", {
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body: JSON.stringify({content, source: sourceEmail || "ui"})
        })
        const d = await r.json()
        if(d && d.ok){
          openMiniWindow("Snapshot", "Saved to ecosystem feed.")
          if(snapInput) snapInput.value = ""
          refreshFeed()
        } else {
          openMiniWindow("Snapshot", `Failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("Snapshot", "Failed: network_error")
      }
    })
  }
  if(myFreqBtn){
    myFreqBtn.addEventListener("click", async ()=>{
      const email = ((state.socialLinks && state.socialLinks.email) || "").trim().toLowerCase()
      if(!(state.subscription === "pro" || email === "agentanthony@supportrd.com")){
        openMiniWindow("Pro Required", "Watch My Frequency is a Pro option.")
        return
      }
      if(!email){
        openMiniWindow("Frequency", "Add your email in Settings first.")
        return
      }
      try{
        const r = await fetch(`/api/engine-glass/my-frequency?email=${encodeURIComponent(email)}`)
        const d = await r.json()
        if(d && d.ok){
          if(myFreqFeed){
            myFreqFeed.style.display = "block"
            const lines = d.lines || []
            myFreqFeed.textContent = lines.length ? lines.map(x=>`- ${x}`).join("\n") : "No personal frequency snapshots yet."
          }
          openMiniWindow("My Frequency", "Pro frequency stream loaded.")
        } else {
          openMiniWindow("My Frequency", `Failed: ${d.error || "unknown"}`)
        }
      }catch{
        openMiniWindow("My Frequency", "Failed: network_error")
      }
    })
  }
  setView("action")
  refreshFeed()
  setInterval(refreshFeed, 12000)
}

const WORLD_VIEWS = [
    { key:"default", label:"SupportRD Default", perk:"Woman waking up · original light view", helper:"Stay in the clean waking-up background and keep the page light until you want a different base.", prompt:"Original SupportRD waking-up background, full-screen, light, airy, brochure-ready" },
    { key:"lumbermill", label:"Lumbermill Defense", perk:"Defense hold + first-line pressure", helper:"Post work-ethic updates and progress shots from the yard.", prompt:"Realistic Dominican lumbermill at early morning, wet timber stacks, muddy tracks, rustic saw structure, fog, cinematic natural light", actions:[{label:"Post Yard Update", detail:"Drop a gritty work update with strong first-line energy."},{label:"Hold The Line", detail:"Tell people SupportRD is steady, clean, and still moving."}] },
    { key:"river", label:"River Hole Motion", perk:"Movement bonus + smart route positioning", helper:"Use short route posts and calm check-ins to keep people moving with you.", prompt:"Realistic river bend with rocks, mossy bank, shaded water, hidden crossing path, cinematic blue-green light", actions:[{label:"Quick Route Post", detail:"Run a calm movement check-in and show the next route."},{label:"Movement Check-In", detail:"Keep the stream light, active, and flowing with you."}] },
    { key:"snow", label:"Artificial Snow Hill", perk:"High-visibility defense + clean focus", helper:"Post crisp update clips and clean premium service offers.", prompt:"Realistic artificial snow hill with white ridges, icy blue shadows, floodlights, elevated outlook, crisp winter atmosphere", actions:[{label:"Clean Offer Drop", detail:"Push a sharp premium offer with clean focus energy."},{label:"High Ground Focus", detail:"Show the clear view, clean service, and high-ground mood."}] },
    { key:"island", label:"Island Control", perk:"Rare unlock + premium route energy", helper:"Push destination-style content and international travel mood from this base.", prompt:"Realistic small tropical island by a lake, teal water, low grass, dock crossing, bright premium Caribbean daylight", actions:[{label:"Travel Mood Post", detail:"Make the session feel rare, tropical, and worth checking in on."},{label:"Premium Route Push", detail:"Tie the destination vibe to premium products and motion."}] },
    { key:"vip", label:"VIP Spot Energy", perk:"Sponsor visibility + elevated defense", helper:"Show sponsor wins, premium upgrades, and polished host moments here.", prompt:"Realistic luxury VIP overlook deck with glass railing, black and gold trim, sponsor glow, cinematic premium atmosphere", actions:[{label:"Sponsor Highlight", detail:"Put your best sponsors and supporters in the spotlight."},{label:"Premium Push", detail:"Lead with upgrades, sharp service, and premium momentum."}] },
    { key:"tunnels", label:"Tunnels Run", perk:"Quick-encounter movement + pressure", helper:"Run fast short-form post bursts and behind-the-scenes updates.", prompt:"Realistic concrete service tunnel with low fog, blue-red light strips, damp walls, close fast movement lanes", actions:[{label:"Fast Burst Post", detail:"Drop a quick post burst and keep the pace moving."},{label:"Behind-The-Scenes", detail:"Show the grind and moving parts without slowing down."}] },
    { key:"market", label:"Market Rush", perk:"Audience attention + social traction", helper:"Post active human-life clips, audience comments, and social prompts from this base.", prompt:"Realistic Dominican outdoor market street with colorful awnings, vendor tables, warm daylight, lively movement", actions:[{label:"Audience Pull", detail:"Call people in with social energy and active human moments."},{label:"Social Burst", detail:"Push a post designed to spark comments and attention fast."}] },
    { key:"lab", label:"The Lab", perk:"Precision tools + extra creative control", helper:"Show advanced studio, reverb, hair analysis, and technical feature highlights.", prompt:"Realistic futuristic lab with cyan glow, glass panels, dark metal surfaces, clean floor lines, premium science room", actions:[{label:"Tool Highlight", detail:"Show the technical side: reverb, scan, and feature precision."},{label:"Precision Drop", detail:"Post the clean details that make the system feel serious."}] },
    { key:"lounge", label:"Officials Lounge", perk:"Reset lane + protected regroup", helper:"Use this base for calm announcements, support updates, and trust-building posts.", prompt:"Realistic premium lounge with dark wood, polished black surfaces, leather seating, calm gold lighting", actions:[{label:"Calm Update", detail:"Give a composed update and keep the room settled."},{label:"Trust Builder", detail:"Remind people SupportRD is clean, helpful, and here to serve."}] },
    { key:"tower", label:"Watch Tower", perk:"Vision boost + field awareness", helper:"Share overview posts, direction, GPS routes, and big-picture session updates.", prompt:"Realistic lookout tower above mixed field terrain, open sky, wood and steel structure, panoramic horizon", actions:[{label:"Overview Post", detail:"Give the big-picture update and where the session is headed."},{label:"GPS Direction", detail:"Use the tower view to guide people to the next move."}] }
  ]

  function getRemoteLaunchVisualByView(key = "default"){
    const map = {
      default: "url('/static/images/woman-waking-up12.jpg') center/cover no-repeat",
      lumbermill: "linear-gradient(180deg, rgba(68,38,18,.30), rgba(14,12,10,.22)), url('/static/images/brochure-scroll.jpg') center/cover no-repeat",
      river: "linear-gradient(180deg, rgba(18,78,92,.24), rgba(9,18,28,.18)), url('/static/images/brochure-mask.jpg') center/cover no-repeat",
      snow: "linear-gradient(180deg, rgba(200,226,255,.16), rgba(18,28,42,.18)), url('/static/images/brochure-hero.jpg') center/cover no-repeat",
      island: "linear-gradient(180deg, rgba(24,128,116,.22), rgba(10,20,28,.18)), url('/static/images/brochure-social.jpg') center/cover no-repeat",
      vip: "linear-gradient(180deg, rgba(118,88,18,.24), rgba(18,14,10,.2)), url('/static/images/brochure-formula-exclusive.jpg') center/cover no-repeat",
      tunnels: "linear-gradient(180deg, rgba(58,32,96,.24), rgba(11,12,24,.18)), url('/static/images/brochure-scroll.jpg') center/cover no-repeat",
      market: "linear-gradient(180deg, rgba(132,66,28,.24), rgba(21,18,14,.18)), url('/static/images/brochure-social.jpg') center/cover no-repeat",
      lab: "linear-gradient(180deg, rgba(18,92,108,.22), rgba(9,18,28,.18)), url('/static/images/brochure-fast-dropper.jpg') center/cover no-repeat",
      lounge: "linear-gradient(180deg, rgba(88,62,26,.22), rgba(14,12,10,.18)), url('/static/images/brochure-shampoo.jpg') center/cover no-repeat",
      tower: "linear-gradient(180deg, rgba(34,74,118,.22), rgba(9,18,28,.18)), url('/static/images/brochure-hero.jpg') center/cover no-repeat"
    }
    return map[key] || map.default
  }

  function syncRemoteLaunchVisual(viewKey = "default"){
    const shell = qs("#floatModeShell")
    const visual = getRemoteLaunchVisualByView(viewKey || "default")
    if(shell) shell.style.setProperty("--remote-launch-bg", visual)
    qsa(".float-launch-btn").forEach(btn=>{
      btn.dataset.mapView = viewKey || "default"
      btn.style.background = visual
      btn.style.backgroundSize = "cover"
      btn.style.backgroundPosition = "center"
    })
  }

  function formatSubscriptionSummary(plan, details){
    const safePlan = (plan || "free").toString().trim() || "free"
    const nextDueValue = details && (details.next_due || details.next_due_at || details.renewal_date || details.expires_at || details.ends_at)
    if(!nextDueValue){
      return `<strong>${safePlan}</strong> active. Next due date unavailable yet.`
    }
    const dueDate = new Date(nextDueValue)
    if(Number.isNaN(dueDate.getTime())){
      return `<strong>${safePlan}</strong> active. Next due date unavailable yet.`
    }
    const diff = dueDate.getTime() - Date.now()
    let timeLeft = "Due now"
    if(diff > 0){
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      if(days > 0){
        timeLeft = `${days} day${days === 1 ? "" : "s"} left`
      } else if(hours > 0){
        timeLeft = `${hours} hour${hours === 1 ? "" : "s"} left`
      } else {
        const mins = Math.max(1, Math.floor((diff % 3600000) / 60000))
        timeLeft = `${mins} minute${mins === 1 ? "" : "s"} left`
      }
    }
    return `<strong>${safePlan}</strong> active · ${timeLeft} · Next due ${dueDate.toLocaleDateString("en-US", { month:"long", day:"numeric", year:"numeric" })}`
  }

  function updateSubscriptionSummary(plan, details){
    const target = qs("#subscriptionStatusSummary")
    if(!target) return
    target.innerHTML = formatSubscriptionSummary(plan, details)
  }

  function setupUnlockViewsButton(){
  const btn = qs("#unlockViewsBtn")
  const liveBtn = qs("#unlockViewsBtnLive")
  const panel = qs("#worldMapPanel")
  const closeBtn = qs("#closeWorldMapPanel")
    const bubbles = qs("#worldMapBubbles")
    const loader = qs("#worldMapLoader")
    const loaderBar = qs("#worldMapLoaderBar")
    const loaderLabel = qs("#worldMapLoaderLabel")
    const liveMapActions = qs("#liveMapActions")
    if(!btn && !liveBtn) return
    const classes = WORLD_VIEWS.map(v=>`world-view-${v.key}`)
    const subtitle = btn?.querySelector(".unlock-main-sub")
    function renderLiveMapActions(view){
      if(!liveMapActions) return
      const actions = Array.isArray(view?.actions) ? view.actions : []
      if(!actions.length){
        liveMapActions.innerHTML = ""
        liveMapActions.setAttribute("hidden","hidden")
        return
      }
      liveMapActions.innerHTML = actions.map((action, index)=>`<button class="live-map-action" data-map-action="${index}" data-world-key="${view.key}"><strong>${action.label}</strong><span>${action.detail}</span></button>`).join("")
      liveMapActions.removeAttribute("hidden")
    }
    function applyView(key, options = {}){
      const persistExplicit = options.persistExplicit !== false
      document.body.classList.remove(...classes)
      document.body.classList.add("competition-world")
      document.body.classList.add(`world-view-${key}`)
      localStorage.setItem("worldView", key)
      localStorage.setItem("worldViewExplicit", persistExplicit ? "true" : "false")
      const view = WORLD_VIEWS.find(v=>v.key === key) || WORLD_VIEWS[0]
    const floatShell = qs("#floatModeShell")
    if(floatShell) floatShell.dataset.remoteTheme = view.key
    syncRemoteLaunchVisual(view.key)
    if(subtitle) subtitle.textContent = view.label
    const stage = qs("#ariaAssistantSub")
    if(stage) stage.textContent = `ARIA · Free Roam / ${view.label}`
    const mainStream = qs("#liveArenaMainStream")
    if(mainStream) mainStream.textContent = `${view.label} active. Perk: ${view.perk}. Helper: ${view.helper}`
    const meta = qs("#liveArenaViewMeta")
    if(meta) meta.textContent = `${view.label} View`
    const sponsorStatus = qs("#liveArenaSponsorStatus")
    if(sponsorStatus) sponsorStatus.textContent = `Current sponsors, general audience, and quick tips now follow ${view.label}. Perk: ${view.perk}.`
      const contentStatus = qs("#liveArenaContentStatus")
      if(contentStatus) contentStatus.textContent = `${view.label} route active. ${view.helper}`
      const floatStatus = qs("#floatSettingsStatus")
      if(floatStatus) floatStatus.textContent = `${view.label} loaded. ${view.helper}`
      const floatDevice = qs("#floatDeviceStatus")
      if(floatDevice) floatDevice.textContent = `${view.label} loaded. ${view.helper}`
      renderLiveMapActions(view)
      if(typeof syncMapHero === "function") syncMapHero(view.key)
    }
  function setButtonsBusy(label){
    if(btn){
      btn.disabled = true
      btn.querySelector(".unlock-main-label")?.replaceChildren(document.createTextNode("Loading View"))
      btn.querySelector(".unlock-main-sub")?.replaceChildren(document.createTextNode(label))
    }
    if(liveBtn){
      liveBtn.disabled = true
      liveBtn.textContent = `Loading ${label}`
    }
  }
  function resetButtons(){
    if(btn){
      btn.disabled = false
      btn.querySelector(".unlock-main-label")?.replaceChildren(document.createTextNode("Unlock + Change Views"))
    }
    if(liveBtn){
      liveBtn.disabled = false
      liveBtn.textContent = "Theme / Map Change"
    }
  }
  function queueViewLoad(targetKey){
    const view = WORLD_VIEWS.find(v=>v.key === targetKey) || WORLD_VIEWS[0]
    const mainStream = qs("#liveArenaMainStream")
    const steps = [10, 22, 36, 52, 68, 84, 100]
    let stepIndex = 0
    panel?.setAttribute("hidden","hidden")
    loader?.removeAttribute("hidden")
    if(loaderBar) loaderBar.style.width = "0%"
    if(loaderLabel) loaderLabel.textContent = `Loading ${view.label} into your session background...`
    setButtonsBusy(view.label)
    if(mainStream) mainStream.textContent = `Loading ${view.label} into your session background... freebies are opening for being in the area, and premium benefits still come from the real work of bringing people live.`
    const timer = setInterval(()=>{
      if(stepIndex >= steps.length){
        clearInterval(timer)
        applyView(targetKey)
        loader?.setAttribute("hidden","hidden")
        resetButtons()
        try{
          const shell = qs("#floatModeShell")
          if(shell) shell.dataset.remoteTheme = targetKey
        }catch{}
        try{ window.logSessionSignal?.(`${view.label} map loaded`) }catch{}
        return
      }
      if(loaderBar) loaderBar.style.width = `${steps[stepIndex]}%`
      if(loaderLabel) loaderLabel.textContent = `Loading ${view.label} · ${steps[stepIndex]}%`
      stepIndex += 1
    }, 1000)
  }
  function openWorldMap(){
    if(!panel || !bubbles) return
    bubbles.innerHTML = WORLD_VIEWS.map((view)=>`<button class="world-map-bubble" data-world-key="${view.key}">${view.label}<small>${view.perk}</small></button>`).join("")
    panel.removeAttribute("hidden")
    loader?.setAttribute("hidden","hidden")
  }
  const saved = localStorage.getItem("worldView")
  const explicit = localStorage.getItem("worldViewExplicit") === "true"
  if(saved && explicit && WORLD_VIEWS.some(v=>v.key === saved)){
    applyView(saved)
  }else{
    applyView(WORLD_VIEWS[0].key, { persistExplicit:false })
  }
  btn?.addEventListener("click", openWorldMap)
  liveBtn?.addEventListener("click", openWorldMap)
  closeBtn?.addEventListener("click", ()=>panel?.setAttribute("hidden","hidden"))
    bubbles?.addEventListener("click", (event)=>{
      const bubble = event.target.closest("[data-world-key]")
      if(!bubble) return
      queueViewLoad(bubble.getAttribute("data-world-key"))
    })
    liveMapActions?.addEventListener("click", (event)=>{
      const button = event.target.closest("[data-map-action]")
      if(!button) return
      const view = WORLD_VIEWS.find((item)=>item.key === button.getAttribute("data-world-key")) || WORLD_VIEWS[0]
      const action = view.actions?.[Number(button.getAttribute("data-map-action"))]
      if(!action) return
      const mainStream = qs("#liveArenaMainStream")
      if(mainStream) mainStream.textContent = `${view.label}: ${action.label}. ${action.detail} Perk active: ${view.perk}.`
      const contentStatus = qs("#liveArenaContentStatus")
      if(contentStatus) contentStatus.textContent = `${action.label} ready. ${action.detail}`
      const panelTitle = qs("#liveArenaPanelTitle")
      if(panelTitle) panelTitle.textContent = action.label
      const meta = qs("#liveArenaViewMeta")
      if(meta) meta.textContent = `${view.label} Action`
      openMiniWindow(view.label, action.detail)
    })
    window.openWorldMapPanel = openWorldMap
    window.setWorldTheme = queueViewLoad
    window.getWorldViews = ()=>WORLD_VIEWS.map(view => ({
      key: view.key,
      label: view.label,
      perk: view.perk,
      helper: view.helper,
      actions: Array.isArray(view.actions) ? view.actions.map(action => ({ ...action })) : []
    }))
  }

function setupDashboardSweep(){
  const stage = qs("#centerStage")
  if(!stage || typeof IntersectionObserver !== "function") return
  let armed = true
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach((entry)=>{
      if(entry.isIntersecting && entry.intersectionRatio > 0.58 && armed){
        armed = false
        document.body.classList.add("dashboard-sweep-active")
        setTimeout(()=>document.body.classList.remove("dashboard-sweep-active"), 1250)
        setTimeout(()=>{ armed = true }, 3200)
      }
    })
  }, { threshold:[0.58, 0.7] })
  observer.observe(stage)
}


window.addEventListener("DOMContentLoaded", ()=>{
  try{ var d=document.getElementById('debugClick'); if(d) d.textContent='App init start'; }catch{}
  window.__appInit = true;
  document.body.classList.add("resort-brochure")
  const savedHistory = JSON.parse(localStorage.getItem("ariaHistory") || "[]")
  state.ariaHistory = savedHistory
  const ariaEl = qs("#ariaHistory")
  if(ariaEl){
    ariaEl.innerHTML = state.ariaHistory.length ? state.ariaHistory.map(x=>`<div>${x}</div>`).join("") : "No history yet."
  }

  const safe = (fn)=>{ try{ fn() }catch(e){ console.error(e) } }
  initHairScore()
  safe(setupTabs)
  safe(setupAccessibilityMode)
  safe(setupSimpleUi)
  safe(setupMenuHoverFx)
  safe(setupAdult21Mode)
  safe(setupCampaign)
  safe(setupInHouseAd)
  safe(setupRequestCall)
  safe(setupEmergencyAssist)
  safe(setupAriaHelp)
  safe(setupThemeArrows)
  safe(setupUnlockViewsButton)
  safe(setupSessionSignal)
  safe(setupModals)
  safe(setupPaymentChooser)
  safe(setupCenterCheckoutMenu)
  safe(setupSettings)
  safe(setupPostActions)
  safe(setupOccasion)
  safe(setupMarinationTimer)
  safe(setupScanUpload)
  safe(setupProfileUpload)
  safe(setupHairAnalysis)
  safe(setupAssistantSystem)
  safe(setupStudioMode)
  safe(setupFloatMode)
  safe(setupGPS)
  safe(setupAria)
  safe(setupPuzzle)
  safe(setupSEOLogs)
  safe(setupWorkdaySeoEngine)
  safe(setupEngineGlassViewer)
  safe(setupCredit)
  safe(setupCashOps)
safe(setupCommunications)
safe(setupLiveArena)
safe(setupReel)
  safe(setupAIMillionaireTab)
  safe(setupAdminQuickActions)
  safe(setupVRScan)
  safe(setupBrochure)
  safe(setupPwa)
  safe(setupRemoteFastPay)
  safe(setupFamilyMode)
  safe(initHairScore)
  safe(setupAppsDock)
  safe(setupAppDeepLinks)
  safe(setupStartupSplash)
  safe(setupButtonPulseHalo)
  safe(setupLaunchMenu)
  safe(setupSatelliteQuick)
  safe(setupDashboardSweep)
  safe(setupJakeQuickSwitch)
  safe(setupShopifyConnectorBadge)
  safe(setupLoginGate)
  safe(loadProducts)
  safe(setupMiniWindow)
  safe(setupLevelSelect)
  safe(wireAllButtons)
  safe(setupInfoTray)
  safe(watchTranscriptErrors)

  // Fallback: open any data-link button
  try{ var d=document.getElementById('debugClick'); if(d) d.textContent='App init done'; }catch{}

  document.body.addEventListener("click", (e)=>{
    const el = e.target.closest("[data-link]")
    if(el && el.dataset.link){
      openLinkModal(el.dataset.link, "SupportRD Link")
    }
  })
})














