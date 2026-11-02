const VERSIO = 'liinarun-v3';

const PYSYVA = [
  /\.glb(\?|$)/,
  /\.(png|jpg|webp|woff2?|m4a|mp3|wav)(\?|$)/,
  /^https:\/\/unpkg\.com\/three@/,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\//,
  /^https:\/\/fonts\.gstatic\.com\//
];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const nimi of await caches.keys()) if (nimi !== VERSIO) await caches.delete(nimi);
    await self.clients.claim();
  })());
});

async function valimuistista(pyynto) {
  const muisti = await caches.open(VERSIO);
  const loytyi = await muisti.match(pyynto);
  if (loytyi) return loytyi;
  const vastaus = await fetch(pyynto);
  if (vastaus.ok) muisti.put(pyynto, vastaus.clone());
  return vastaus;
}

async function verkostaEnsin(pyynto) {
  const muisti = await caches.open(VERSIO);
  try {
    const vastaus = await fetch(pyynto.mode === 'navigate' ? pyynto.url : pyynto, { cache: 'no-cache' });
    if (pyynto.mode === 'navigate' && vastaus.redirected) {
      if (new URL(vastaus.url).origin !== self.location.origin) self.registration.unregister();
      return Response.redirect(vastaus.url, 301);
    }
    if (vastaus.ok && !vastaus.redirected) muisti.put(pyynto, vastaus.clone());
    return vastaus;
  } catch (virhe) {
    const loytyi = await muisti.match(pyynto);
    if (loytyi) return loytyi;
    throw virhe;
  }
}

self.addEventListener('fetch', e => {
  const pyynto = e.request;
  if (pyynto.method !== 'GET') return;
  const url = pyynto.url;
  if (/\.supabase\.co\//.test(url)) return;
  if (PYSYVA.some(r => r.test(url))) { e.respondWith(valimuistista(pyynto)); return; }
  if (new URL(url).origin === self.location.origin || /^https:\/\/fonts\.googleapis\.com\//.test(url)) {
    e.respondWith(verkostaEnsin(pyynto));
  }
});
