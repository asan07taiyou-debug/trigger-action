/* TRIGGER ACTION のサービスワーカー（アプリとして動かすための裏方）
   v0.84d：ゲーム本体・アプリの設定（manifest）・アイコンは「まずネットから新しい物」を取り、つながらないときだけ保存してある物を使う
           （前は保存してある物を先に使っていたので、ファイルを入れかえてもしばらく古いままだった）
   three.js などインターネットから読み込む部品（cdn.jsdelivr.net）は、版が決まっていて変わらないので、保存してある物を先に使う
   → 一度開いたことがあれば、ネットにつながっていなくても起動できる（オンライン対戦はネットが必要）
   ゲームを新しくしたら、下の VERSION を変えると古い保存が消える */
const VERSION = 'ta-v0.87';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-512-maskable.png'];

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
  if (url.origin === location.origin) {   // 自分のファイル：ネットを先に（新しい版がすぐ届く）
    e.respondWith(caches.open(VERSION).then(c => fetch(req, { cache: 'no-cache' }).then(res => {
      if (res && res.ok)
        c.put(req, res.clone());
      return res;
    }).catch(() => c.match(req).then(hit => hit || c.match('./index.html')))));
    return;
  }
  if (url.hostname === 'cdn.jsdelivr.net') {   // 版の決まった部品：保存を先に
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(req);
      if (hit)
        return hit;
      const res = await fetch(req);
      if (res && res.ok)
        c.put(req, res.clone());
      return res;
    }));
  }
  // それ以外（オンライン対戦の通信など）はそのまま
});
