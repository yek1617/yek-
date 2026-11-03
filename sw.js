/* 备考站 Service Worker：应用外壳缓存，断网也能开 */
const VER = 'yek-v1';
const SHELL = [
  './', './index.html', './manifest.json', './manifest.js', './js/core.js',
  './data/kp.js', './data/00-plan.js', './data/quotes.js', './data/detail.js',
  './data/qdetail.js', './data/01-社医.js', './data/02-流病.js',
  './data/03-卫统.js', './data/04-预医.js',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).catch(() => { }));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // 导航请求：先网络，失败回退缓存（保证能更新，又断网可开）
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const c = await caches.open(VER);
        c.put('./index.html', fresh.clone());
        return fresh;
      } catch (err) {
        const c = await caches.open(VER);
        return (await c.match('./index.html')) || (await c.match('./')) || Response.error();
      }
    })());
    return;
  }

  // 静态资源：缓存优先，后台更新
  e.respondWith((async () => {
    const c = await caches.open(VER);
    const hit = await c.match(req);
    if (hit) {
      fetch(req).then(r => { if (r && r.ok) c.put(req, r.clone()); }).catch(() => { });
      return hit;
    }
    try {
      const r = await fetch(req);
      if (r && r.ok && (r.type === 'basic' || r.type === 'default')) c.put(req, r.clone());
      return r;
    } catch (err) {
      return Response.error();
    }
  })());
});
