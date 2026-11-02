import { pelaaja, asetaTili, tunnus, omaPin, rpc, viesti, kirjauduUlos, SUPABASE_URL, SUPABASE_KEY } from './verkko.js';

const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.0/+esm';

const el = id => document.getElementById(id);
const intro = el('intro');
const over = el('over');
const taulu = el('taulu');
const lista = el('tauluLista');
const tauluTila = el('tauluTila');
const fi = n => Number(n).toLocaleString('fi-FI');

export function paivitaKuka() {
  if (!pelaaja.nimimerkki) { el('kuka').hidden = true; return; }
  el('kuka').hidden = false;
  el('kukaNimi').textContent = pelaaja.nimimerkki;
  const onParas = pelaaja.paras > 0;
  el('kukaParasOtsikko').hidden = !onParas;
  el('kukaParas').hidden = !onParas;
  el('kukaParas').textContent = onParas ? `${fi(pelaaja.paras)} m` : '';
  el('kukaKolikot').textContent = fi(pelaaja.kolikot);
}
document.addEventListener('liina:tunnistettu', paivitaKuka);
paivitaKuka();

function rivi({ sija, nimimerkki, paras, oma }) {
  const li = document.createElement('li');
  if (oma) li.classList.add('oma');
  const mitali = sija <= 3;
  if (mitali) li.classList.add('mitali', `mitali-${sija}`);
  for (const [luokka, teksti] of [['sija', mitali ? `${sija}` : `${sija}.`], ['nimi', nimimerkki], ['pisteet', `${fi(paras)} m`]]) {
    const s = document.createElement('span');
    s.className = luokka;
    s.textContent = teksti;
    li.append(s);
  }
  return li;
}

let edelliset = new Map();

function piirra(rivit) {
  const vanhat = edelliset;
  edelliset = new Map(rivit.map(r => [r.nimimerkki, r.paras]));
  const korosta = vanhat.size > 0;
  lista.replaceChildren();
  if (!rivit.length) {
    tauluTila.textContent = 'Ei vielä tuloksia. Ensimmäinen juoksu nousee kärkeen.';
    return;
  }
  rivit.forEach((r, i) => {
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

let paluu = intro;

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
        if (tila === 'SUBSCRIBED') haeViiveella();
      });
  } catch {
  }
}

function lopetaTilaus() {
  clearTimeout(ajastin);
  if (kanava && kirjasto) kirjasto.removeChannel(kanava);
  kanava = null;
}

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

el('avaaTaulu').addEventListener('click', e => { e.currentTarget.blur(); avaaTaulu(intro); });
el('kotiin').addEventListener('click', e => {
  e.currentTarget.blur();
  document.dispatchEvent(new CustomEvent('liina:etusivulle'));
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

const JONO_AVAIN = 'liinarun.jonossa';
const JONO_MAX = 30;
const jono = {
  hae() {
    try {
      const j = JSON.parse(localStorage.getItem(JONO_AVAIN));
      return Array.isArray(j) ? j : j ? [j] : [];
    } catch { return []; }
  },
  aseta(t) { try { t.length ? localStorage.setItem(JONO_AVAIN, JSON.stringify(t)) : localStorage.removeItem(JONO_AVAIN); } catch {} },
  lisaa(tulos) { this.aseta([...this.hae(), tulos].slice(-JONO_MAX)); }
};

function naytaLoppu(tulos, ennatys) {
  over.classList.toggle('ennatys', ennatys);
  el('overKicker').textContent = ennatys ? 'UUSI ENNÄTYS' : 'JÄÄT JÄLKEEN';
  if (ennatys) {
    el('overOtsikko').textContent = `${fi(tulos.matka)}\u00a0m`;
    el('overText').textContent = `${tulos.jahtaaja || 'Tervis'} sai kiinni`;
    const o = el('overOtsikko'); o.style.animation = 'none'; void o.offsetWidth; o.style.animation = '';
  } else {
    el('overOtsikko').textContent = (tulos.jahtaaja || 'Tervis').toUpperCase();
    el('overOtsikko').insertAdjacentHTML('beforeend', '<br>SAI KIINNI');
    el('overText').textContent = '';
  }
  el('overLuku').textContent = fi(tulos.matka);
}

function etappiRivi(e) {
  if (!e || kisaPaattynyt()) return '';
  const osat = [];
  if (e.ohitettu > 0) osat.push(`Ohitit ${e.ohitettu} ${e.ohitettu === 1 ? 'etapin' : 'etappia'}`);
  if (e.seuraava) {
    const s = e.seuraava;
    const kohde = s.oma ? 'Omaan ennätykseen'
      : s.sija === 1 ? 'Kärkeen'
      : s.sija <= 10 ? `TOP ${s.sija}:een`
      : `Sijalle ${s.sija}`;
    const kuka = s.nimi ? ` (${s.nimi.replace(/[&<>"]/g, '')})` : '';
    osat.push(`${kohde} puuttui <b>${fi(s.puuttuu)}\u00a0m</b>${kuka}`);
  } else if (e.ohitettu > 0) {
    osat.push('Ohitit kaikki etapit!');
  }
  return osat.join(' · ');
}

function tilaRivi(v) {
  if (v.tulostaulu_suljettu || kisaPaattynyt()) {
    return v.sija ? `Tulostaulu on suljettu · lopullinen sijasi ${v.sija}` : 'Tulostaulu on suljettu';
  }
  if (v.uusi_ennatys) {
    return v.edellinen > 0 ? `Sija ${v.sija} · aiempi ennätys ${fi(v.edellinen)} m` : `Sija ${v.sija}`;
  }
  return `Ennätyksesi ${fi(v.paras)} m · sija ${v.sija}`;
}

let etapit = [];
function kerroTavoitteet() {
  const detail = kisaPaattynyt() ? { oma: 0, etapit: [] } : { oma: pelaaja.paras, etapit };
  document.dispatchEvent(new CustomEvent('liina:tavoitteet', { detail }));
}
async function haeTavoitteet() {
  try {
    const v = await rpc('tavoitteet', { p_tunnus: tunnus() });
    etapit = v.etapit || [];
  } catch {}
  kerroTavoitteet();
}
document.addEventListener('liina:tunnistettu', () => { etapit = []; haeTavoitteet(); });

async function tallenna(tulos) {
  const v = await rpc('tallenna_tulos', {
    p_tunnus: tunnus(), p_pisteet: tulos.pisteet, p_matka: tulos.matka, p_kesto: tulos.kesto,
    p_kolikot: tulos.kolikot || 0,
    p_laudat_keratyt: tulos.laudatKeratyt || 0,
    p_laudat_kaytetyt: tulos.laudatKaytetyt || 0
  });
  pelaaja.paras = v.paras;
  pelaaja.sija = v.sija;
  asetaTili(v);
  paivitaKuka();
  haeTavoitteet();
  return v;
}

function kirjaaPaikallisesti(tulos) {
  if (tulos.matka > pelaaja.paras && !kisaPaattynyt()) { pelaaja.paras = tulos.matka; kerroTavoitteet(); }
  asetaTili({
    kolikot: pelaaja.kolikot + (tulos.kolikot || 0),
    potkulaudat: Math.min(5, Math.max(0,
      pelaaja.potkulaudat + (tulos.laudatKeratyt || 0) - (tulos.laudatKaytetyt || 0)))
  });
  paivitaKuka();
}

let loppuNro = 0;
document.addEventListener('liina:alku', () => document.body.classList.remove('loppu', 'valikossa'));

document.addEventListener('liina:loppu', async e => {
  document.body.classList.add('loppu');
  const tulos = e.detail;
  const nro = ++loppuNro;
  const arvio = tulos.matka > pelaaja.paras && !kisaPaattynyt();
  naytaLoppu(tulos, arvio);
  el('overKolikot').textContent = tulos.kolikot > 0 ? `+${fi(tulos.kolikot)} kolikkoa tilille` : '';
  el('overEtappi').innerHTML = etappiRivi(tulos.etapit);
  el('overTila').textContent = 'Tallennetaan tulosta…';
  kirjaaPaikallisesti(tulos);

  try {
    if (jono.hae().length) {
      jono.lisaa(tulos);
      await puraJono();
      if (nro === loppuNro) el('overTila').textContent = jono.hae().length
        ? 'Ei yhteyttä. Tulos tallennetaan, kun yhteys palaa.'
        : tilaRivi({ uusi_ennatys: false, paras: pelaaja.paras, sija: pelaaja.sija });
      return;
    }
    const v = await tallenna(tulos);
    if (nro !== loppuNro) return;
    if (v.uusi_ennatys !== arvio) naytaLoppu(tulos, v.uusi_ennatys);
    el('overTila').textContent = tilaRivi(v);
  } catch (err) {
    if (err.koodi === 'EI_YHTEYTTA') {
      jono.lisaa(tulos);
      if (arvio) { pelaaja.paras = tulos.matka; paivitaKuka(); }
      if (nro === loppuNro) el('overTila').textContent = 'Ei yhteyttä. Tulos tallennetaan, kun yhteys palaa.';
    } else if (nro === loppuNro) {
      el('overTila').textContent = err.koodi === 'TULOS_HYLATTY'
        ? 'Tulosta ei voitu tallentaa.'
        : viesti(err.koodi);
    }
  }
});

let purkamassa = false;
async function puraJono() {
  if (purkamassa) return;
  purkamassa = true;
  try {
    let odottavat = jono.hae();
    while (odottavat.length) {
      const [seuraava, ...loput] = odottavat;
      try {
        await tallenna(seuraava);
      } catch (err) {
        if (err.koodi === 'EI_YHTEYTTA') break;
      }
      jono.aseta(loput);
      odottavat = loput;
      if (odottavat.length) await new Promise(r => setTimeout(r, 1700));
    }
  } finally {
    purkamassa = false;
  }
}
document.addEventListener('liina:tunnistettu', puraJono);

const asetukset = el('asetukset');
let ulosVahvistus = false;

function sovitaAsetusNimi() {
  const n = el('asetusNimi');
  const tila = n.closest('.kortti').clientWidth - 44 - 40;
  let koko = 24;
  n.style.fontSize = koko + 'px';
  while (n.scrollWidth > tila && koko > 14) { koko -= 1; n.style.fontSize = koko + 'px'; }
}

function piirraAsetukset() {
  el('asetusNimi').textContent = pelaaja.nimimerkki || '';
  requestAnimationFrame(sovitaAsetusNimi);
  el('asetusParas').textContent = pelaaja.paras > 0 ? `${fi(pelaaja.paras)} m` : '—';
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

const kauppa = el('kauppa');
let kauppaAjastin = null;
let katalogi = null;
let kohdalla = 'tervis';
let ostoVahvistus = false, kauppaKesken = false, kauppaVirhe = '';

const KOLIKKO = '<i class="kolikko-ikoni" aria-hidden="true"></i>';

function piirraKauppa() {
  el('kauppaKolikot').textContent = fi(pelaaja.kolikot);
  const nappi = el('kauppaToiminto');
  const huomio = el('kauppaHuomio');
  nappi.className = 'btn kauppa-toiminto';
  huomio.textContent = kauppaVirhe;
  const j = katalogi && katalogi.find(k => k.id === kohdalla);
  if (!j) {
    nappi.disabled = true;
    nappi.textContent = katalogi === false ? 'EI YHTEYTTÄ' : '…';
    return;
  }
  nappi.disabled = kauppaKesken;
  if (!j.saatavilla) {
    nappi.disabled = true; nappi.classList.add('harmaa');
    nappi.textContent = 'TULOSSA PIAN';
  } else if (j.omistettu && pelaaja.jahtaaja === j.id) {
    nappi.disabled = true; nappi.classList.add('harmaa');
    nappi.textContent = 'VALITTU';
  } else if (j.omistettu) {
    nappi.textContent = 'VALITSE';
  } else if (pelaaja.kolikot < j.hinta) {
    nappi.disabled = true; nappi.classList.add('himmea');
    nappi.innerHTML = `OSTA · ${KOLIKKO} ${fi(j.hinta)}`;
    if (!kauppaVirhe) huomio.textContent = `Puuttuu ${fi(j.hinta - pelaaja.kolikot)} kolikkoa`;
  } else if (ostoVahvistus) {
    nappi.classList.add('vahvista');
    nappi.textContent = 'VAHVISTA OSTO';
    if (!kauppaVirhe) huomio.textContent = `${j.nimi} maksaa ${fi(j.hinta)} kolikkoa`;
  } else {
    nappi.innerHTML = `OSTA · ${KOLIKKO} ${fi(j.hinta)}`;
  }
}

document.addEventListener('liina:tunnistettu', () => { katalogi = null; });

document.addEventListener('liina:rinki-kohdalla', e => {
  kohdalla = e.detail.id;
  ostoVahvistus = false; kauppaVirhe = '';
  piirraKauppa();
});

el('kauppaToiminto').addEventListener('click', async e => {
  e.currentTarget.blur();
  const j = katalogi && katalogi.find(k => k.id === kohdalla);
  if (!j || kauppaKesken) return;
  kauppaVirhe = '';
  if (!j.omistettu && !ostoVahvistus) { ostoVahvistus = true; piirraKauppa(); return; }
  kauppaKesken = true; piirraKauppa();
  try {
    const v = await rpc(j.omistettu ? 'valitse_jahtaaja' : 'osta_jahtaaja',
      { p_tunnus: tunnus(), p_jahtaaja: j.id });
    if (!j.omistettu) j.omistettu = true;
    asetaTili(v);
    paivitaKuka();
  } catch (err) {
    kauppaVirhe = viesti(err.koodi);
    haeKatalogi();
  } finally {
    kauppaKesken = false; ostoVahvistus = false;
    piirraKauppa();
  }
});

async function haeKatalogi() {
  try {
    const v = await rpc('kauppa', { p_tunnus: tunnus() });
    katalogi = v.jahtaajat || [];
    asetaTili(v);
    paivitaKuka();
  } catch {
    if (!katalogi) katalogi = false;
  }
  piirraKauppa();
}

async function avaaKauppa() {
  if (document.body.classList.contains('kauppa-auki')) return;
  clearTimeout(kauppaAjastin);
  document.body.classList.add('kauppa-auki');
  intro.style.opacity = '0';
  intro.classList.add('pois');
  document.dispatchEvent(new CustomEvent('liina:kauppa', { detail: { auki: true } }));
  ostoVahvistus = false; kauppaVirhe = '';
  if (katalogi === false) katalogi = null;
  piirraKauppa();
  kauppaAjastin = setTimeout(() => { kauppa.classList.remove('pois'); kauppa.style.opacity = '1'; }, 900);
  haeKatalogi();
}

function suljeKauppa() {
  if (!document.body.classList.contains('kauppa-auki')) return;
  clearTimeout(kauppaAjastin);
  kauppa.style.opacity = '0';
  kauppa.classList.add('pois');
  document.dispatchEvent(new CustomEvent('liina:kauppa', { detail: { auki: false } }));
  kauppaAjastin = setTimeout(() => {
    intro.style.opacity = '1';
    intro.classList.remove('pois');
    document.body.classList.remove('kauppa-auki');
  }, 1300);
}

const siirraRinkia = suunta => document.dispatchEvent(new CustomEvent('liina:rinki-siirto', { detail: { suunta } }));

el('avaaKauppa').addEventListener('click', e => { e.currentTarget.blur(); avaaKauppa(); });
el('suljeKauppa').addEventListener('click', e => { e.currentTarget.blur(); suljeKauppa(); });
el('kauppaEdellinen').addEventListener('click', e => { e.currentTarget.blur(); siirraRinkia(-1); });
el('kauppaSeuraava').addEventListener('click', e => { e.currentTarget.blur(); siirraRinkia(1); });
addEventListener('keydown', e => {
  if (!document.body.classList.contains('kauppa-auki')) return;
  if (e.key === 'Escape') suljeKauppa();
  else if (e.key === 'ArrowRight') { e.preventDefault(); siirraRinkia(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); siirraRinkia(-1); }
});
let kauppaVeto = null;
kauppa.addEventListener('pointerdown', e => {
  if (e.isPrimary && !e.target.closest('button')) kauppaVeto = { x: e.clientX, y: e.clientY };
});
kauppa.addEventListener('pointerup', e => {
  if (!kauppaVeto) return;
  const dx = e.clientX - kauppaVeto.x, dy = e.clientY - kauppaVeto.y;
  kauppaVeto = null;
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) siirraRinkia(dx < 0 ? 1 : -1);
});
kauppa.addEventListener('pointercancel', () => { kauppaVeto = null; });

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
  el('todisteParas').textContent = pelaaja.paras > 0 ? `${fi(pelaaja.paras)} m` : '—';
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

const VAALIVIIKKO_PAATTYY = Date.parse('2026-11-20T12:00:00+02:00');
const kisaPaattynyt = () => Date.now() >= VAALIVIIKKO_PAATTYY;

function vaaliviikko(nyt = Date.now()) {
  const jaljella = VAALIVIIKKO_PAATTYY - nyt;
  return { jaljella, paattynyt: jaljella <= 0 };
}

function muotoileJaljella(ms) {
  const s = Math.floor(ms / 1000);
  const pv = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), min = Math.floor(s % 3600 / 60), sek = s % 60;
  if (pv > 0) return `${pv} pv ${h} h ${min} min`;
  if (h > 0) return `${h} h ${min} min ${sek} s`;
  return `${min} min ${sek} s`;
}

function paivitaVaalilaskurit() {
  const v = vaaliviikko();
  if (v.paattynyt !== document.body.classList.contains('kisa-paattynyt')) {
    document.body.classList.toggle('kisa-paattynyt', v.paattynyt);
    if (v.paattynyt) kerroTavoitteet();
  }
  for (const el of document.querySelectorAll('.vaalilaskuri')) {
    el.classList.toggle('paattynyt', v.paattynyt);
    el.querySelector('[data-vaali-otsikko]').textContent = v.paattynyt
      ? 'VAALIVIIKKO PÄÄTTYI'
      : (el.classList.contains('ohjelaskuri') ? 'AIKAA JÄLJELLÄ' : 'VAALIVIIKKO PÄÄTTYY');
    el.querySelector('[data-vaali-aika]').textContent = v.paattynyt ? 'Palkinnot jaetaan' : muotoileJaljella(v.jaljella);
  }
}
paivitaVaalilaskurit();
setInterval(paivitaVaalilaskurit, 1000);

const ULKOPUOLELLE = [
  [asetukset, () => suljeAsetukset(), 300],
  [ohjeet, () => suljeOhjeet(), 300],
  [taulu, () => suljeTaulu(), 300],
  [over, () => el('kotiin').click(), 700],
  [el('tauko'), () => el('jatka').click(), 300]
];
for (const [ruutu, takaisin, suoja] of ULKOPUOLELLE) {
  let avattu = 0;
  new MutationObserver(() => { if (!ruutu.classList.contains('pois')) avattu = performance.now(); })
    .observe(ruutu, { attributes: true, attributeFilter: ['class'] });
  ruutu.addEventListener('click', e => {
    if (ruutu.classList.contains('pois') || performance.now() - avattu < suoja) return;
    if (!todiste.classList.contains('pois')) return;
    if (e.target.closest('.kortti, button, a, input, ol')) return;
    takaisin();
  });
}
