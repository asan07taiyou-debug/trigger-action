/* TRIGGER ACTION のサービスワーカー（アプリとして動かすための裏方）
   ・ゲーム本体（index.html など）は、まず保存してある物を使い、裏で新しい物を取ってくる
   ・three.js などインターネットから読み込む部品（cdn.jsdelivr.net）も、一度読み込んだら保存しておく
   → 一度開いたことがあれば、ネットにつながっていなくても起動できる（オンライン対戦はネットが必要）
   ゲームを新しくしたら、下の VERSION を変えると古い保存が消える */
const VERSION = 'ta-v0.84';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET')
    return;
  const url = new URL(req.url);
  const cacheable = url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net';
  if (!cacheable)
    return;   // オンライン対戦の通信などはそのまま
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(res => {
      if (res && res.ok)
        c.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;   // 保存してあればすぐ使い、裏で新しい物に入れかえる
  }));
});
