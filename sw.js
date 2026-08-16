/* Service Worker：离线可用 + 每日数据兜底 */
var CACHE = 'zmt-workbench-v4';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/store.js',
  './assets/engine.js',
  './assets/views.js',
  './assets/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(SHELL.map(function (u) {
      return c.add(u).catch(function () { });
    }));
  }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // 每日数据：网络优先，失败回落到缓存（保证断网时显示上一次内容，不空白）
  if (url.pathname.indexOf('daily.json') >= 0) {
    e.respondWith(
      fetch(req).then(function (res) {
        var clone = res.clone();
        caches.open(CACHE).then(function (c) { c.put('./data/daily.json', clone); });
        return res;
      }).catch(function () {
        return caches.match('./data/daily.json').then(function (r) {
          return r || new Response('{"date":"离线","topics":[],"money":[],"insight":""}', { headers: { 'Content-Type': 'application/json' } });
        });
      })
    );
    return;
  }

  // 其余：缓存优先，后台更新
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var clone = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, clone); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
