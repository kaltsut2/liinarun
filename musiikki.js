/* ---------------------------------------------------------------
   Taustamusiikki ja äänitehosteet

   Selaimet eivät anna äänen alkaa itsestään, joten musiikki käynnistyy
   ensimmäisestä kosketuksesta tai näppäimen painalluksesta. Se soi
   silmukkana etusivulla ja juoksussa, hiljenee loppukortin ajaksi ja
   pysähtyy, kun sovellus menee taustalle. Valinta (päällä/pois) säilyy
   laitteella. AAC on noin puolet MP3:n koosta; MP3 on varalla selaimille,
   jotka eivät toista AAC:tä.

   Voimakkuutta säädetään Web Audion vahvistimella, koska iPhonen Safari
   ei anna muuttaa audio-elementin omaa voimakkuutta.

   Äänitehosteet (kolikon kilahdus, NOCCOn swoosh, renkaan vinkuna)
   syntetisoidaan Web Audiolla. Ainoa tiedosto on NOCCO-tölkin avausääni
   (aanet/tolkki.m4a, 13 kt), joka puretaan muistiin valmiiksi, jotta se
   soi heti poimittaessa. liina-scene.js pyytää ääniä tapahtumalla
   'liina:aani'. Tehosteilla on oma valinta.
   --------------------------------------------------------------- */

const AVAIN = 'liinarun.musiikki';
const VOIMAKKUUS = 0.3, HILJAINEN = 0.12;      /* musiikki jää tehosteiden alle */

const aani = new Audio();
aani.src = aani.canPlayType('audio/mp4; codecs="mp4a.40.2"') ? 'aanet/musiikki.m4a' : 'aanet/musiikki.mp3';
aani.loop = true;
aani.preload = 'auto';

let paalla = (() => { try { return localStorage.getItem(AVAIN) !== 'pois'; } catch { return true; } })();
let kayttajaAloitti = false;
let tavoite = VOIMAKKUUS;
let ctx = null, vahvistin = null, tehosteVahvistin = null;

/* Web Audio luodaan vasta käyttäjän eleestä, kuten selaimet vaativat.
   Sama konteksti palvelee musiikkia ja tehosteita. */
function luoKonteksti() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  tehosteVahvistin = ctx.createGain();
  tehosteVahvistin.gain.value = 1;
  tehosteVahvistin.connect(ctx.destination);
  lataaTolkki();
}

/* tölkin avausääni puretaan valmiiksi; AAC, ja varalla WAV */
let tolkkiPuskuri = null;
async function lataaTolkki() {
  for (const tiedosto of ['aanet/tolkki.m4a', 'aanet/tolkki.wav']) {
    try {
      const data = await (await fetch(tiedosto)).arrayBuffer();
      tolkkiPuskuri = await ctx.decodeAudioData(data);
      return;
    } catch {}
  }
}
function audioKaytossa() {
  luoKonteksti();
  if (!ctx) { aani.volume = tavoite; return; }
  if (vahvistin) return;
  vahvistin = ctx.createGain();
  vahvistin.gain.value = tavoite;
  ctx.createMediaElementSource(aani).connect(vahvistin).connect(ctx.destination);
}

/* pehmeä voimakkuuden muutos, ettei ääni naksahda */
function liu_uta(kohde) {
  tavoite = kohde;
  if (vahvistin) vahvistin.gain.setTargetAtTime(kohde, ctx.currentTime, 0.25);
  else aani.volume = kohde;
}

function soita() {
  if (!paalla || !kayttajaAloitti || document.hidden) return;
  audioKaytossa();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  aani.play().catch(() => {});
}

function aloitaEnsimmainen() {
  if (kayttajaAloitti) return;
  kayttajaAloitti = true;
  luoKonteksti();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  soita();
}
addEventListener('pointerdown', aloitaEnsimmainen, { capture: true });
addEventListener('keydown', aloitaEnsimmainen, { capture: true });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) aani.pause(); else soita();
});

/* loppukortin ajan hiljempaa, juoksun alkaessa taas täysillä */
document.addEventListener('liina:loppu', () => liu_uta(HILJAINEN));
document.addEventListener('liina:alku', () => liu_uta(VOIMAKKUUS));
/* loppukortista etusivulle koti-napilla */
document.getElementById('kotiin')?.addEventListener('click', () => liu_uta(VOIMAKKUUS));

const nappi = document.getElementById('musiikkiNappi');
function piirra() {
  if (!nappi) return;
  nappi.textContent = paalla ? 'PÄÄLLÄ' : 'POIS';
  nappi.setAttribute('aria-pressed', String(paalla));
  nappi.classList.toggle('pois', !paalla);
}
nappi?.addEventListener('click', e => {
  e.currentTarget.blur();
  paalla = !paalla;
  try { localStorage.setItem(AVAIN, paalla ? 'paalla' : 'pois'); } catch {}
  kayttajaAloitti = true;
  if (paalla) soita(); else aani.pause();
  piirra();
});
piirra();

/* ---------- äänitehosteet ---------- */

const TEHOSTE_AVAIN = 'liinarun.tehosteet';
let tehosteet = (() => { try { return localStorage.getItem(TEHOSTE_AVAIN) !== 'pois'; } catch { return true; } })();
let kohina = null;

function kohinaPuskuri() {
  if (kohina) return kohina;
  kohina = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = kohina.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return kohina;
}

/* verhokäyrä: nopea nousu, eksponentiaalinen vaimeneminen */
function verho(g, t, huippu, nousu, kesto) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(huippu, t + nousu);
  g.gain.exponentialRampToValueAtTime(0.0001, t + kesto);
}

/* kolikko: kaksi kirkasta nousevaa säveltä, sävelkorkeus vaihtelee hieman */
function kilahdus() {
  const t = ctx.currentTime, k = 1 + (Math.random() - 0.5) * 0.04;
  [[1318.5, 0], [1975.5, 0.055]].forEach(([f, viive]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = f * k;
    verho(g, t + viive, 0.22, 0.005, 0.22);
    o.connect(g).connect(tehosteVahvistin);
    o.start(t + viive); o.stop(t + viive + 0.25);
  });
}

/* NOCCO: kohinan läpi nouseva ja laskeva kaistanpäästösuodin */
function swoosh() {
  const t = ctx.currentTime;
  const lahde = ctx.createBufferSource();
  lahde.buffer = kohinaPuskuri();
  const suodin = ctx.createBiquadFilter();
  suodin.type = 'bandpass'; suodin.Q.value = 1.1;
  suodin.frequency.setValueAtTime(350, t);
  suodin.frequency.exponentialRampToValueAtTime(3800, t + 0.28);
  suodin.frequency.exponentialRampToValueAtTime(900, t + 0.55);
  const g = ctx.createGain();
  verho(g, t, 0.55, 0.12, 0.55);
  lahde.connect(suodin).connect(g).connect(tehosteVahvistin);
  lahde.start(t); lahde.stop(t + 0.6);
}

/* Ryde: kaksi vinoa sahalaitaa kapean suotimen läpi, sävel liukuu alas ja
   värisee kuin renkaan kirskunta; mukana hieman kumista kohinaa */
function rengas() {
  const t = ctx.currentTime, kesto = 0.6;
  const suodin = ctx.createBiquadFilter();
  suodin.type = 'bandpass'; suodin.frequency.value = 1700; suodin.Q.value = 5;
  const g = ctx.createGain();
  verho(g, t, 0.34, 0.025, kesto);
  suodin.connect(g).connect(tehosteVahvistin);
  const varina = ctx.createOscillator(), varinaMaara = ctx.createGain();
  varina.frequency.value = 27; varinaMaara.gain.value = 45;
  varina.connect(varinaMaara);
  for (const f of [1180, 1245]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.78, t + kesto);
    varinaMaara.connect(o.frequency);
    o.connect(suodin);
    o.start(t); o.stop(t + kesto + 0.05);
  }
  const hiss = ctx.createBufferSource(), ylip = ctx.createBiquadFilter(), hg = ctx.createGain();
  hiss.buffer = kohinaPuskuri();
  ylip.type = 'highpass'; ylip.frequency.value = 2500;
  verho(hg, t, 0.05, 0.02, kesto * 0.8);
  hiss.connect(ylip).connect(hg).connect(tehosteVahvistin);
  varina.start(t); varina.stop(t + kesto + 0.05);
  hiss.start(t); hiss.stop(t + kesto);
}

/* NOCCO: tölkki aukeaa ja perään suhahtaa boosti */
function tolkki() {
  if (!tolkkiPuskuri) return;
  const lahde = ctx.createBufferSource(), g = ctx.createGain();
  lahde.buffer = tolkkiPuskuri;
  g.gain.value = 0.9;
  lahde.connect(g).connect(tehosteVahvistin);
  lahde.start();
}
function nocco() {
  tolkki();
  setTimeout(() => { try { swoosh(); } catch {} }, tolkkiPuskuri ? 140 : 0);
}

const TEHOSTEET = { kolikko: kilahdus, swoosh, nocco, rengas };
document.addEventListener('liina:aani', e => {
  if (!tehosteet || !ctx || document.hidden) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try { TEHOSTEET[e.detail]?.(); } catch {}
});

const tehosteNappi = document.getElementById('tehosteNappi');
function piirraTehosteet() {
  if (!tehosteNappi) return;
  tehosteNappi.textContent = tehosteet ? 'PÄÄLLÄ' : 'POIS';
  tehosteNappi.setAttribute('aria-pressed', String(tehosteet));
  tehosteNappi.classList.toggle('pois', !tehosteet);
}
tehosteNappi?.addEventListener('click', e => {
  e.currentTarget.blur();
  tehosteet = !tehosteet;
  try { localStorage.setItem(TEHOSTE_AVAIN, tehosteet ? 'paalla' : 'pois'); } catch {}
  luoKonteksti();
  if (tehosteet) { ctx?.resume().catch(() => {}); kilahdus(); }     /* esimakuna kilahdus */
  piirraTehosteet();
});
piirraTehosteet();

/* testausta varten, kuten window.__liina */
window.__musiikki = { aani, get gain() { return vahvistin ? vahvistin.gain.value : aani.volume; },
  get paalla() { return paalla; }, get tehosteet() { return tehosteet; }, get ctx() { return ctx; },
  get tehosteVahvistin() { return tehosteVahvistin; } };
