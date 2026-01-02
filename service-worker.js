const CACHE = "startpage-cache-v1"
const CORE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./storage.js",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./icon.svg"
]

self.addEventListener("install",(e)=>{
  e.waitUntil(
    caches.open(CACHE).then(c=> c.addAll(CORE)).then(()=> self.skipWaiting())
  )
})

self.addEventListener("activate",(e)=>{
  e.waitUntil(
    caches.keys().then(keys=> Promise.all(keys.map(k=> k===CACHE ? null : caches.delete(k)))).then(()=> self.clients.claim())
  )
})

function isApi(req){
  const u = new URL(req.url)
  return u.hostname.endsWith("open-meteo.com") || u.hostname.endsWith("openstreetmap.org")
}

self.addEventListener("fetch",(e)=>{
  const req = e.request
  if(req.method !== "GET") return
  const url = new URL(req.url)

  if(url.origin === location.origin){
    e.respondWith(
      caches.match(req).then(hit=>{
        const fetchp = fetch(req).then(res=>{
          const copy = res.clone()
          caches.open(CACHE).then(c=> c.put(req, copy))
          return res
        }).catch(()=> hit)
        return hit || fetchp
      })
    )
    return
  }

  if(isApi(req)){
    e.respondWith(
      caches.match(req).then(hit=>{
        const fetchp = fetch(req).then(res=>{
          const copy = res.clone()
          caches.open(CACHE).then(c=> c.put(req, copy))
          return res
        }).catch(()=> hit)
        return hit || fetchp
      })
    )
  }
})
