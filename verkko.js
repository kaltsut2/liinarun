/* ---------------------------------------------------------------
   Verkko: laitteen tunnistus ja nimimerkki

   Laite saa nimimerkin rekisteröitymällä tai kirjautumalla PINillä.
   Palvelin antaa laitteelle satunnaisen istuntotunnuksen, joka
   tallennetaan selaimen muistiin. Seuraavilla avauksilla tunnus
   riittää, eikä PINiä kysytä.

   Ennen kuin laite on tunnistettu, <body> kantaa luokkaa
   "tunnistamaton", ja liina-scene.js kieltäytyy käynnistämästä peliä.

   Julkinen avain on tarkoitettu selaimeen. Sen oikeudet rajataan
   Supabasen päässä: peli pääsee vain supabase.sql:n funktioihin.
   Älä koskaan laita tähän service_role-avainta.
   --------------------------------------------------------------- */

const SUPABASE_URL = 'https://gqjuwjekplqmjtvgnxax.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RElfJX6QhvX6tThW8xWJdA_78QpD_q9';
const TUNNUS_AVAIN = 'liinarun.tunnus';
/* PIN tallennetaan laitteelle vain, jotta pelaaja näkee sen asetuksista.
   Palvelimella se on tiivisteenä, eikä sitä voi hakea sieltä takaisin. */
const PIN_AVAIN = 'liinarun.pin';

document.body.classList.add('tunnistamaton');

/* ---------- selaimen muisti ----------
   Yksityisessä selaustilassa tai estetyillä evästeillä localStorage voi
   heittää virheen. Silloin tunnus pysyy vain tämän välilehden ajan. */
function muistipaikka(avain) {
  let vara = null;
  return {
    hae() { try { return localStorage.getItem(avain); } catch { return vara; } },
    aseta(t) { vara = t; try { localStorage.setItem(avain, t); } catch {} },
    poista() { vara = null; try { localStorage.removeItem(avain); } catch {} }
  };
}
const muisti = muistipaikka(TUNNUS_AVAIN);
const pinMuisti = muistipaikka(PIN_AVAIN);

/* ---------- palvelinkutsut ---------- */
class VerkkoVirhe extends Error {
  constructor(koodi) { super(koodi); this.koodi = koodi; }
}

async function rpc(funktio, parametrit) {
  let vastaus;
  try {
    vastaus = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${funktio}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(parametrit)
    });
  } catch {
    throw new VerkkoVirhe('EI_YHTEYTTA');
  }
  const data = await vastaus.json().catch(() => null);
  if (!vastaus.ok) throw new VerkkoVirhe((data && data.message) || 'TUNTEMATON');
  if (data && data.virhe) throw new VerkkoVirhe(data.virhe);
  return data;
}

const VIESTIT = {
  NIMI_VARATTU: 'Nimimerkki on jo käytössä. Valitse toinen.',
  NIMI_MUOTO: 'Nimimerkissä pitää olla 3–16 merkkiä: kirjaimia, numeroita, välilyöntejä tai merkit _ . -',
  NIMI_KIELLETTY: 'Tätä nimimerkkiä ei voi käyttää. Valitse toinen.',
  PIN_MUOTO: 'PIN-koodissa pitää olla neljä numeroa.',
  PIN_ERI: 'PIN-koodit eivät täsmää. Kirjoita sama koodi kahdesti.',
  VIRHEELLINEN_TUNNUS: 'Nimimerkki tai PIN on väärin.',
  KIRJAUTUMINEN_LUKITTU: 'Liian monta väärää yritystä. Odota 15 minuuttia ja yritä uudelleen.',
  EI_YHTEYTTA: 'Ei yhteyttä palvelimeen. Tarkista verkko ja yritä uudelleen.'
};
const viesti = koodi => VIESTIT[koodi] || 'Jokin meni vikaan. Yritä uudelleen.';

/* ---------- tila ---------- */
export const pelaaja = { nimimerkki: null, paras: 0, sija: null };

function asetaPelaaja(tieto) {
  pelaaja.nimimerkki = tieto.nimimerkki;
  pelaaja.paras = tieto.paras || 0;
  pelaaja.sija = tieto.sija ?? null;
}

/* ---------- näkymä ---------- */
const el = id => document.getElementById(id);
const ruutu = el('nimi');
const intro = el('intro');
const lomake = el('nimiLomake');
const kentta = { nimi: el('nimiKentta'), pin: el('pinKentta'), pin2: el('pin2Kentta') };
const virhe = el('nimiVirhe');
const laheta = el('nimiLaheta');
const vaihda = el('nimiVaihda');
let tila = 'uusi';                          /* 'uusi' | 'vanha' */

function naytaVirhe(koodi) {
  virhe.textContent = koodi ? viesti(koodi) : '';
  virhe.hidden = !koodi;
}

function asetaTila(uusi) {
  tila = uusi;
  const onUusi = tila === 'uusi';
  el('nimiOtsikko').innerHTML = onUusi ? 'VALITSE<br>NIMIMERKKI' : 'TERVETULOA<br>TAKAISIN';
  el('nimiOhje').textContent = onUusi
    ? 'Nimimerkki näkyy tulostaulussa. Valitse lisäksi nelinumeroinen PIN ja pidä se muistissa.'
    : 'Kirjoita nimimerkkisi ja PIN, niin tuloksesi siirtyvät tälle laitteelle.';
  kentta.pin2.closest('label').hidden = !onUusi;
  kentta.pin2.required = onUusi;
  kentta.pin.autocomplete = onUusi ? 'new-password' : 'current-password';
  laheta.textContent = onUusi ? 'VARAA NIMIMERKKI' : 'KIRJAUDU';
  vaihda.textContent = onUusi ? 'Minulla on jo nimimerkki' : 'Olen uusi pelaaja';
  naytaVirhe(null);
}

function naytaLomake() {
  ruutu.classList.remove('pois', 'odottaa');
  ruutu.style.opacity = '1';
  intro.style.opacity = '0';
  intro.classList.add('pois');
  lomake.hidden = false;
  el('nimiOdota').hidden = true;
}

function naytaOdotus(teksti) {
  ruutu.classList.remove('pois');
  ruutu.classList.add('odottaa');
  ruutu.style.opacity = '1';
  intro.style.opacity = '0';
  intro.classList.add('pois');
  lomake.hidden = true;
  el('nimiOdota').hidden = false;
  el('nimiOdotaTeksti').textContent = teksti;
  el('nimiUudelleen').hidden = true;
}

function paastaPeliin() {
  ruutu.style.opacity = '0';
  ruutu.classList.add('pois');
  intro.style.opacity = '1';
  intro.classList.remove('pois');
  document.body.classList.remove('tunnistamaton');
  document.dispatchEvent(new CustomEvent('liina:tunnistettu', { detail: { ...pelaaja } }));
}

/* ---------- käynnistys ---------- */
async function tunnista() {
  const tunnus = muisti.hae();
  if (!tunnus) { asetaTila('uusi'); naytaLomake(); return; }

  naytaOdotus('Haetaan pelaajaa…');
  try {
    asetaPelaaja(await rpc('oma_tila', { p_tunnus: tunnus }));
    paastaPeliin();
  } catch (e) {
    if (e.koodi === 'ISTUNTO_VANHENTUNUT') {
      /* Tunnus on poistettu palvelimelta, esim. pelaajan poiston jälkeen. */
      muisti.poista();
      pinMuisti.poista();
      asetaTila('vanha');
      naytaLomake();
    } else {
      el('nimiOdotaTeksti').textContent = viesti(e.koodi);
      el('nimiUudelleen').hidden = false;
    }
  }
}

lomake.addEventListener('submit', async e => {
  e.preventDefault();
  const nimi = kentta.nimi.value.trim();
  const pin = kentta.pin.value;
  if (!/^[0-9]{4}$/.test(pin)) { naytaVirhe('PIN_MUOTO'); kentta.pin.focus(); return; }
  if (tila === 'uusi' && pin !== kentta.pin2.value) { naytaVirhe('PIN_ERI'); kentta.pin2.focus(); return; }

  laheta.disabled = true;
  naytaVirhe(null);
  try {
    const vastaus = await rpc(tila === 'uusi' ? 'rekisteroidy' : 'kirjaudu',
      { p_nimimerkki: nimi, p_pin: pin });
    muisti.aseta(vastaus.tunnus);
    pinMuisti.aseta(pin);
    asetaPelaaja(vastaus);
    kentta.pin.value = kentta.pin2.value = '';
    document.activeElement && document.activeElement.blur();
    paastaPeliin();
  } catch (err) {
    naytaVirhe(err.koodi);
    (err.koodi && err.koodi.startsWith('NIMI') ? kentta.nimi : kentta.pin).focus();
  } finally {
    laheta.disabled = false;
  }
});

vaihda.addEventListener('click', () => {
  asetaTila(tila === 'uusi' ? 'vanha' : 'uusi');
  kentta.nimi.focus();
});
el('nimiUudelleen').addEventListener('click', tunnista);

/* PIN-kenttiin vain numeroita. */
for (const k of [kentta.pin, kentta.pin2]) {
  k.addEventListener('input', () => { k.value = k.value.replace(/\D/g, '').slice(0, 4); });
}

export function tunnus() { return muisti.hae(); }
/* null, jos laite on tunnistettu ennen kuin PIN alettiin tallentaa. */
export function omaPin() { return pinMuisti.hae(); }

/* Uloskirjautuminen. Palvelimelta yritetään poistaa tämän laitteen istunto,
   mutta laite kirjataan ulos joka tapauksessa: jos funktiota ei vielä ole
   tietokannassa tai verkkoa ei ole, paikallinen tunnus poistetaan silti. */
export async function kirjauduUlos() {
  const t = muisti.hae();
  if (t) { try { await rpc('kirjaudu_ulos', { p_tunnus: t }); } catch {} }
  muisti.poista();
  pinMuisti.poista();
  pelaaja.nimimerkki = null; pelaaja.paras = 0; pelaaja.sija = null;
  kentta.nimi.value = ''; kentta.pin.value = ''; kentta.pin2.value = '';
  document.body.classList.add('tunnistamaton');
  asetaTila('vanha');
  naytaLomake();
}
export { rpc, viesti, SUPABASE_URL, SUPABASE_KEY };

tunnista();
