/* ---------------------------------------------------------------
   Päävalikko ja tulostaulu

   Päävalikko näyttää pelaajan nimimerkin ja ennätyksen, ja siitä
   pääsee peliin tai tulostauluun. Tulostaulu näyttää kärki 10:n
   sinisellä ja pelaajan oman rivin oranssilla. Jos oma sija on
   kärjen ulkopuolella, se tulee yhdenneksitoista riviksi.

   Tulostaulun ollessa auki <body> kantaa luokkaa "taulu-auki", jolloin
   liina-scene.js ei käynnistä peliä välilyönnistä.
   --------------------------------------------------------------- */

import { pelaaja, tunnus, omaPin, rpc, viesti, kirjauduUlos, SUPABASE_URL, SUPABASE_KEY } from './verkko.js';

/* Realtime-yhteyteen tarvitaan Supabasen kirjasto. Se ladataan vasta kun
   tulostaulu avataan, joten peli käynnistyy yhtä nopeasti kuin ennenkin
   eikä kaadu, vaikka CDN ei vastaisi. Versio on kiinnitetty. */
const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.0/+esm';

const el = id => document.getElementById(id);
const intro = el('intro');
const over = el('over');
const taulu = el('taulu');
const lista = el('tauluLista');
const tauluTila = el('tauluTila');
const fi = n => Number(n).toLocaleString('fi-FI');

/* ---------- päävalikon pelaajarivi ---------- */
export function paivitaKuka() {
  if (!pelaaja.nimimerkki) { el('kuka').hidden = true; return; }
  el('kuka').hidden = false;
  el('kukaNimi').textContent = pelaaja.nimimerkki;
  const onParas = pelaaja.paras > 0;
  el('kukaParasOtsikko').hidden = !onParas;
  el('kukaParas').hidden = !onParas;
  el('kukaParas').textContent = onParas ? fi(pelaaja.paras) : '';
}
document.addEventListener('liina:tunnistettu', paivitaKuka);
paivitaKuka();

/* ---------- tulostaulu ---------- */
function rivi({ sija, nimimerkki, paras, oma }) {
  const li = document.createElement('li');
  if (oma) li.classList.add('oma');
  const mitali = sija <= 3;
  if (mitali) li.classList.add('mitali', `mitali-${sija}`);
  /* mitalin sisällä pelkkä numero, muilla rivin tapaan piste perässä */
  for (const [luokka, teksti] of [['sija', mitali ? `${sija}` : `${sija}.`], ['nimi', nimimerkki], ['pisteet', fi(paras)]]) {
    const s = document.createElement('span');
    s.className = luokka;
    s.textContent = teksti;
    li.append(s);
  }
  return li;
}

let edelliset = new Map();       /* nimimerkki → pisteet edellisessä piirrossa */

function piirra(rivit) {
  const vanhat = edelliset;
  edelliset = new Map(rivit.map(r => [r.nimimerkki, r.paras]));
  const korosta = vanhat.size > 0;  /* ensimmäinen piirto ei välähdä */
  lista.replaceChildren();
  if (!rivit.length) {
    tauluTila.textContent = 'Ei vielä tuloksia. Ensimmäinen juoksu nousee kärkeen.';
    return;
  }
  rivit.forEach((r, i) => {
    /* Palvelin palauttaa kärki 10:n ja oman rivin perään, jos se jää
       kärjen ulkopuolelle. Väliin tulee erotin. */
    if (i === 10) {
      const vali = document.createElement('li');
      vali.className = 'vali';
      vali.setAttribute('aria-hidden', 'true');
      vali.textContent = '···';
      lista.append(vali);
    }
    const li = rivi(r);
    if (korosta && vanhat.get(r.nimimerkki) !== r.paras) li.classList.add('muuttui');
    lista.append(li);
  });
  tauluTila.textContent = rivit.some(r => r.oma)
    ? ''
    : 'Oma sijoituksesi näkyy täällä ensimmäisen juoksun jälkeen.';
}

let haku = 0;
export async function haeTaulu() {
  const tama = ++haku;
  if (!lista.children.length) tauluTila.textContent = 'Haetaan tuloksia…';
  try {
    const rivit = await rpc('tulostaulu', { p_tunnus: tunnus() });
    if (tama === haku) piirra(rivit || []);
  } catch (e) {
    if (tama === haku) tauluTila.textContent = viesti(e.koodi);
  }
}

/* Tulostaulu avataan joko päävalikosta tai juoksun lopusta, ja
   TAKAISIN palaa siihen ruutuun, josta tultiin. */
let paluu = intro;

/* ---------- reaaliaikaisuus ----------
   Peli tilaa tulostaulu_versio-rivin muutokset. Rivi päivittyy
   tietokannassa aina kun jonkun ennätys muuttuu, ja silloin tulostaulu
   haetaan uudelleen. Useat peräkkäiset muutokset niputetaan yhdeksi
   hauksi. */
let kanava = null;
let kirjasto = null;
let ajastin = null;

function haeViiveella() {
  clearTimeout(ajastin);
  ajastin = setTimeout(haeTaulu, 250);
}

async function tilaa() {
  try {
    if (!kirjasto) {
      const { createClient } = await import(SUPABASE_JS);
      kirjasto = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    if (kanava || !document.body.classList.contains('taulu-auki')) return;
    kanava = kirjasto
      .channel('tulostaulu')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tulostaulu_versio' }, haeViiveella)
      .subscribe(tila => {
        /* yhteyden palatessa haetaan varmuuden vuoksi, jottei välissä tullut muutos jää näkymättä */
        if (tila === 'SUBSCRIBED') haeViiveella();
      });
  } catch {
    /* Ilman Realtimea tulostaulu toimii silti: se päivittyy avattaessa. */
  }
}

function lopetaTilaus() {
  clearTimeout(ajastin);
  if (kanava && kirjasto) kirjasto.removeChannel(kanava);
  kanava = null;
}

/* Puhelin voi katkaista yhteyden taustalla; palatessa haetaan tuore tilanne. */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && document.body.classList.contains('taulu-auki')) haeViiveella();
});

export function avaaTaulu(mista = intro) {
  paluu = mista;
  document.body.classList.add('taulu-auki');
  mista.style.opacity = '0';
  mista.classList.add('pois');
  taulu.classList.remove('pois');
  taulu.style.opacity = '1';
  haeTaulu();
  tilaa();
}

export function suljeTaulu() {
  lopetaTilaus();
  taulu.style.opacity = '0';
  taulu.classList.add('pois');
  paluu.style.opacity = '1';
  paluu.classList.remove('pois');
  document.body.classList.remove('taulu-auki');
}

/* Fokus poistetaan napista klikkauksen jälkeen. Muuten välilyönti, jolla
   peli aloitetaan, painaisi samalla fokusoitua nappia ja avaisi
   tulostaulun käynnissä olevan pelin päälle. */
el('avaaTaulu').addEventListener('click', e => { e.currentTarget.blur(); avaaTaulu(intro); });
/* Palautteesta suoraan päävalikkoon. Peli jää odottamaan: PELAA tai
   välilyönti aloittaa uuden juoksun tavalliseen tapaan. */
el('kotiin').addEventListener('click', e => {
  e.currentTarget.blur();
  if (window.__liina) window.__liina.palaaEtusivulle();
  document.body.classList.remove('loppu');
  document.body.classList.add('valikossa');
  over.style.opacity = '0';
  over.classList.add('pois');
  intro.style.opacity = '1';
  intro.classList.remove('pois');
});
document.querySelectorAll('[data-taulu]').forEach(b =>
  b.addEventListener('click', e => { e.currentTarget.blur(); avaaTaulu(over); }));
el('suljeTaulu').addEventListener('click', e => { e.currentTarget.blur(); suljeTaulu(); });
addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.body.classList.contains('taulu-auki')) suljeTaulu();
});

/* ---------------------------------------------------------------
   Juoksun loppu: tallennus ja ennätysilmoitus
   --------------------------------------------------------------- */

const JONO_AVAIN = 'liinarun.jonossa';
const jono = {
  hae() { try { return JSON.parse(localStorage.getItem(JONO_AVAIN)); } catch { return null; } },
  aseta(t) { try { localStorage.setItem(JONO_AVAIN, JSON.stringify(t)); } catch {} },
  poista() { try { localStorage.removeItem(JONO_AVAIN); } catch {} }
};

function naytaLoppu(tulos, ennatys) {
  over.classList.toggle('ennatys', ennatys);
  el('overKicker').textContent = ennatys ? 'UUSI ENNÄTYS' : 'JÄÄT JÄLKEEN';
  if (ennatys) {
    el('overOtsikko').textContent = fi(tulos.pisteet);
    el('overText').textContent = `Tervis sai kiinni · ${fi(tulos.matka)}\u00a0m`;
    /* animaatio alkaa alusta jokaisella ennätyksellä */
    const o = el('overOtsikko'); o.style.animation = 'none'; void o.offsetWidth; o.style.animation = '';
  } else {
    el('overOtsikko').innerHTML = 'TERVIS<br>SAI KIINNI';
    el('overText').textContent = `${fi(tulos.matka)}\u00a0m`;
  }
  el('overLuku').textContent = fi(tulos.pisteet);
}

function tilaRivi(v) {
  if (v.uusi_ennatys) {
    return v.edellinen > 0 ? `Sija ${v.sija} · aiempi ennätys ${fi(v.edellinen)}` : `Sija ${v.sija}`;
  }
  return `Ennätyksesi ${fi(v.paras)} · sija ${v.sija}`;
}

async function tallenna(tulos) {
  return rpc('tallenna_tulos', {
    p_tunnus: tunnus(), p_pisteet: tulos.pisteet, p_matka: tulos.matka, p_kesto: tulos.kesto
  });
}

let loppuNro = 0;
document.addEventListener('liina:alku', () => document.body.classList.remove('loppu', 'valikossa'));

document.addEventListener('liina:loppu', async e => {
  document.body.classList.add('loppu');
  const tulos = e.detail;
  const nro = ++loppuNro;
  /* Ennätys päätetään heti tunnetun ennätyksen perusteella, jotta ruutu
     ei vaihdu kesken lukemisen. Palvelimen vastaus voittaa, jos toinen
     laite on ehtinyt parantaa ennätystä sillä välin. */
  const arvio = tulos.pisteet > pelaaja.paras;
  naytaLoppu(tulos, arvio);
  el('overTila').textContent = 'Tallennetaan tulosta…';

  try {
    const v = await tallenna(tulos);
    pelaaja.paras = v.paras;
    pelaaja.sija = v.sija;
    paivitaKuka();
    if (nro !== loppuNro) return;
    if (v.uusi_ennatys !== arvio) naytaLoppu(tulos, v.uusi_ennatys);
    el('overTila').textContent = tilaRivi(v);
  } catch (err) {
    if (err.koodi === 'EI_YHTEYTTA') {
      /* Tulos jää laitteelle ja lähetetään, kun peli seuraavan kerran
         saa yhteyden. Jonossa pidetään vain paras lähettämätön tulos. */
      const vanha = jono.hae();
      if (!vanha || tulos.pisteet > vanha.pisteet) jono.aseta(tulos);
      if (arvio) { pelaaja.paras = tulos.pisteet; paivitaKuka(); }
      if (nro === loppuNro) el('overTila').textContent = 'Ei yhteyttä. Tulos tallennetaan, kun yhteys palaa.';
    } else if (nro === loppuNro) {
      el('overTila').textContent = err.koodi === 'TULOS_HYLATTY'
        ? 'Tulosta ei voitu tallentaa.'
        : viesti(err.koodi);
    }
  }
});

/* Lähettämätön tulos yritetään uudelleen, kun laite on tunnistettu. */
document.addEventListener('liina:tunnistettu', async () => {
  const odottava = jono.hae();
  if (!odottava) return;
  try {
    const v = await tallenna(odottava);
    jono.poista();
    pelaaja.paras = v.paras;
    pelaaja.sija = v.sija;
    paivitaKuka();
  } catch (err) {
    /* Hylätty tulos ei parane uudella yrityksellä, joten se poistetaan.
       Verkkovirheessä se jää odottamaan seuraavaa kertaa. */
    if (err.koodi !== 'EI_YHTEYTTA') jono.poista();
  }
});

/* ---------------------------------------------------------------
   Asetukset: nimimerkki, ennätys ja uloskirjautuminen
   --------------------------------------------------------------- */

const asetukset = el('asetukset');
let ulosVahvistus = false;

function piirraAsetukset() {
  el('asetusNimi').textContent = pelaaja.nimimerkki || '';
  el('asetusParas').textContent = pelaaja.paras > 0 ? fi(pelaaja.paras) : '—';
  el('asetusSija').textContent = pelaaja.paras > 0 && pelaaja.sija ? `sija ${pelaaja.sija}` : 'Ei vielä ennätystä';
  const pin = omaPin();
  el('asetusPin').textContent = pin || '—';
  el('asetusPin').classList.toggle('pin-puuttuu', !pin);
  el('asetusPinOhje').textContent = pin
    ? 'Tarvitset tämän, jos kirjaudut toisella laitteella.'
    : 'PIN näkyy tässä, kun olet kirjautunut sillä tällä laitteella.';
}

function nollaaUlosVahvistus() {
  ulosVahvistus = false;
  el('ulosVaroitus').hidden = true;
  el('kirjauduUlos').textContent = 'KIRJAUDU ULOS';
}

async function avaaAsetukset() {
  nollaaUlosVahvistus();
  piirraAsetukset();
  document.body.classList.add('asetukset-auki');
  asetukset.classList.remove('pois');
  asetukset.style.opacity = '1';
  /* tuore sija palvelimelta; näkyy heti kun vastaus tulee */
  try {
    const t = await rpc('oma_tila', { p_tunnus: tunnus() });
    pelaaja.paras = t.paras; pelaaja.sija = t.sija;
    piirraAsetukset(); paivitaKuka();
  } catch {}
}

function suljeAsetukset() {
  asetukset.style.opacity = '0';
  asetukset.classList.add('pois');
  document.body.classList.remove('asetukset-auki');
  nollaaUlosVahvistus();
}

el('avaaAsetukset').addEventListener('click', e => { e.currentTarget.blur(); avaaAsetukset(); });
el('suljeAsetukset').addEventListener('click', e => { e.currentTarget.blur(); suljeAsetukset(); });
el('kirjauduUlos').addEventListener('click', async e => {
  e.currentTarget.blur();
  /* ensimmäinen painallus varoittaa, toinen kirjaa ulos */
  if (!ulosVahvistus) {
    ulosVahvistus = true;
    el('ulosVaroitus').hidden = false;
    el('kirjauduUlos').textContent = 'VAHVISTA';
    return;
  }
  el('kirjauduUlos').disabled = true;
  await kirjauduUlos();
  el('kirjauduUlos').disabled = false;
  suljeAsetukset();
  paivitaKuka();
});
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!todiste.classList.contains('pois')) suljeTodiste();
  else if (document.body.classList.contains('asetukset-auki')) suljeAsetukset();
  else if (document.body.classList.contains('ohjeet-auki')) suljeOhjeet();
});

/* ---------------------------------------------------------------
   Ohjeet: etusivun leimasta aukeava korttipakka. Viisi ohjetta on
   rivissä, ja niiden välillä liikutaan nuolinapeilla, pisteillä,
   pyyhkäisemällä tai näppäimistön nuolilla.
   --------------------------------------------------------------- */

const ohjeet = el('ohjeet');
const rata = ohjeet.querySelector('.ohjerata');
const raita = ohjeet.querySelector('.ohjeraita');
const sivut = [...raita.children];
const pisteet = el('ohjePisteet');
let sivu = 0;

sivut.forEach((s, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.setAttribute('aria-label', `Ohje ${i + 1}`);
  b.addEventListener('click', () => naytaSivu(i));
  pisteet.append(b);
});

function naytaSivu(i, liuku = true) {
  sivu = Math.max(0, Math.min(sivut.length - 1, i));
  raita.style.transition = liuku ? '' : 'none';
  raita.style.transform = `translateX(${-sivu * 100}%)`;
  sivut.forEach((s, k) => { s.inert = k !== sivu; });
  [...pisteet.children].forEach((b, k) => b.setAttribute('aria-current', String(k === sivu)));
  el('ohjeEdellinen').disabled = sivu === 0;
  el('ohjeSeuraava').disabled = sivu === sivut.length - 1;
}

/* Pyyhkäisy: kortti seuraa sormea, ja riittävän pitkä tai nopea veto
   vaihtaa korttia. Pystysuuntainen veto jätetään kortin vieritykselle. */
let veto = null;
rata.addEventListener('pointerdown', e => {
  if (!e.isPrimary) return;
  veto = { x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, vaaka: false };
});
rata.addEventListener('pointermove', e => {
  if (!veto) return;
  const dx = e.clientX - veto.x, dy = e.clientY - veto.y;
  if (!veto.vaaka) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { veto = null; return; }
    if (Math.abs(dx) < 8) return;
    veto.vaaka = true;
    rata.setPointerCapture(e.pointerId);
  }
  const reunalla = (sivu === 0 && dx > 0) || (sivu === sivut.length - 1 && dx < 0);
  veto.dx = reunalla ? dx * 0.3 : dx;
  raita.style.transition = 'none';
  raita.style.transform = `translateX(calc(${-sivu * 100}% + ${veto.dx}px))`;
});
function lopetaVeto() {
  if (!veto) return;
  const { dx, vaaka, t } = veto;
  veto = null;
  if (!vaaka) return;
  const nopea = Math.abs(dx) / (performance.now() - t) > 0.5;
  const vaihda = Math.abs(dx) > rata.clientWidth * 0.2 || (nopea && Math.abs(dx) > 24);
  naytaSivu(vaihda ? sivu - Math.sign(dx) : sivu);
}
rata.addEventListener('pointerup', lopetaVeto);
rata.addEventListener('pointercancel', lopetaVeto);

function avaaOhjeet() {
  naytaSivu(0, false);
  document.body.classList.add('ohjeet-auki');
  ohjeet.classList.remove('pois');
  ohjeet.style.opacity = '1';
}

function suljeOhjeet() {
  ohjeet.style.opacity = '0';
  ohjeet.classList.add('pois');
  document.body.classList.remove('ohjeet-auki');
}

el('ohjeEdellinen').addEventListener('click', () => naytaSivu(sivu - 1));
el('ohjeSeuraava').addEventListener('click', () => naytaSivu(sivu + 1));
addEventListener('keydown', e => {
  if (!document.body.classList.contains('ohjeet-auki')) return;
  if (e.key === 'ArrowLeft') { e.preventDefault(); naytaSivu(sivu - 1); }
  else if (e.key === 'ArrowRight') { e.preventDefault(); naytaSivu(sivu + 1); }
});
el('avaaOhjeet').addEventListener('click', e => { e.currentTarget.blur(); avaaOhjeet(); });
el('suljeOhjeet').addEventListener('click', e => { e.currentTarget.blur(); suljeOhjeet(); });

/* ---------- todistenäkymä ----------
   Näytetään vaalitiimille palkintoa lunastettaessa. Tiedot haetaan
   palvelimelta avattaessa, ja kello juoksee sekunnin tarkkuudella, jotta
   näkymä on elävä eikä vanha kuvakaappaus kelpaa sen sijaan. */
const todiste = el('todiste');
let kelloAjastin = null;
const aika = (d, s = true) => d.toLocaleString('fi-FI', {
  weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric',
  hour: '2-digit', minute: '2-digit', ...(s ? { second: '2-digit' } : {})
});

function sovitaNimi() {
  const n = el('todisteNimi');
  let koko = 64;
  n.style.fontSize = koko + 'px';
  while (n.scrollWidth > todiste.clientWidth - 40 && koko > 24) { koko -= 2; n.style.fontSize = koko + 'px'; }
}

function piirraTodiste(vahvistettu) {
  el('todisteNimi').textContent = pelaaja.nimimerkki || '';
  el('todisteParas').textContent = pelaaja.paras > 0 ? fi(pelaaja.paras) : '—';
  el('todisteSija').textContent = pelaaja.paras > 0 && pelaaja.sija ? `sija ${pelaaja.sija}` : 'ei vielä ennätystä';
  el('todisteVahvistus').textContent = vahvistettu
    ? `Vahvistettu palvelimelta ${aika(vahvistettu, false)}`
    : 'Tarkistetaan palvelimelta…';
  sovitaNimi();
}

async function avaaTodiste() {
  piirraTodiste(null);
  const kello = () => { el('todisteKello').textContent = aika(new Date()); };
  kello();
  clearInterval(kelloAjastin);
  kelloAjastin = setInterval(kello, 1000);
  todiste.classList.remove('pois');
  try {
    const t = await rpc('oma_tila', { p_tunnus: tunnus() });
    pelaaja.nimimerkki = t.nimimerkki; pelaaja.paras = t.paras; pelaaja.sija = t.sija;
    piirraTodiste(new Date());
    piirraAsetukset(); paivitaKuka();
  } catch {
    el('todisteVahvistus').textContent = 'Ei yhteyttä palvelimeen — tiedot ovat laitteen muistista';
  }
}

function suljeTodiste() {
  todiste.classList.add('pois');
  clearInterval(kelloAjastin);
}

el('avaaTodiste').addEventListener('click', e => { e.currentTarget.blur(); avaaTodiste(); });
el('suljeTodiste').addEventListener('click', e => { e.currentTarget.blur(); suljeTodiste(); });
addEventListener('resize', () => { if (!todiste.classList.contains('pois')) sovitaNimi(); });
