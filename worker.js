addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const target = 'https://ai-hair-advisor.onrender.com' + url.pathname + url.search

  const response = await fetch(target, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  })

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
}
