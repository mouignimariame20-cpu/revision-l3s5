const V="medij-20261029201000";
const CORE=["./","index.html","data.js","static-db.js","manifest.webmanifest","icon-192.png","icon-512.png","apple-touch-icon.png"];
const IMGS=[];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE).then(()=>c.addAll(IMGS).catch(()=>{}))).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("medij-")&&k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);if(e.request.method!=="GET")return;
  if(u.hostname.includes("generativelanguage.googleapis.com"))return;
  const same=u.origin===location.origin;
  const fresh=same&&(e.request.mode==="navigate"||/\/(index\.html|data\.js|static-db\.js)?$/.test(u.pathname)||u.pathname.endsWith("data.js")||u.pathname.endsWith("static-db.js"));
  if(fresh){e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))));return}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok||res.type==="opaque"){const cp=res.clone();caches.open(V).then(c=>c.put(e.request,cp))}return res})));
});
