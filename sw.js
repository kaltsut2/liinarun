/* ---------------------------------------------------------------
   Liinarun – välimuisti (service worker)

   Raskaat ja muuttumattomat tiedostot haetaan välimuistista, jolloin
   peli aukeaa toisella kerralla heti ja säästää puhelimen dataa:
     - 3D-mallit (.glb): osoitteessa on versio (?v=…), joten uusi malli
       saa uuden osoitteen ja haetaan verkosta
     - musiikki ja kuvat: uusi versio tarvitsee uuden tiedostonimen
     - three.js ja supabase-js CDN:stä: osoitteessa on kiinteä versio
     - fontit
   Sivu itse ja pelin oma koodi haetaan aina ensin verkosta, jotta
   päivitykset näkyvät heti; välimuistia käytetään vain ilman yhteyttä.
   Supabasen pyyntöjä (tulokset, kirjautuminen) ei tallenneta koskaan.

   Kun tämän tiedoston toimintaa muutetaan, nosta VERSIO: vanha
   välimuisti poistetaan uuden asentuessa.
   --------------------------------------------------------------- */

const VERSIO = 'liinarun-v2';

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

/* Pelin oma koodi ja sivu: palvelimelta aina tarkistaen (no-cache), ei
   selaimen HTTP-välimuistista. Muuten julkaisun jälkeen uusi sivu voi saada
   vanhan skriptin, jolloin esim. uudet napit eivät toimi. Muuttumaton
   tiedosto ei siirry uudelleen, vaan palvelin vastaa 304. */
async function verkostaEnsin(pyynto) {
  const muisti = await caches.open(VERSIO);
  try {
    /* sivunavigoinnin pyyntöä ei voi kopioida uusilla asetuksilla, joten
       sivu haetaan osoitteella */
    const vastaus = await fetch(pyynto.mode === 'navigate' ? pyynto.url : pyynto, { cache: 'no-cache' });
    if (vastaus.ok) muisti.put(pyynto, vastaus.clone());
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
  if (/\.supabase\.co\//.test(url)) return;                    /* tulokset ja tili aina verkosta */
  if (PYSYVA.some(r => r.test(url))) { e.respondWith(valimuistista(pyynto)); return; }
  if (new URL(url).origin === self.location.origin || /^https:\/\/fonts\.googleapis\.com\//.test(url)) {
    e.respondWith(verkostaEnsin(pyynto));
  }
});
