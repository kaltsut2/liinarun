# Liina juoksee Mascotiin

Kolmen kaistan endless runner Lahden Rauhankadulla. Liina juoksee Museon edestä
kohti Mascotin ovea, ja yhteiskuntaopin ja historian lehtori Tervis jahtaa takaa.
three.js, proseduraalinen cartoon-geometria, ei buildia.

Matkaa maaliin 900 m. Vastaan tulee autoja ja AGT-bussi, kaistoilta kerätään
kolikoita ja NOCCO-tölkki antaa 4 sekunnin boostin.

## Pelaaminen

| Näppäin | Kosketus | Tekee |
|---|---|---|
| väli / ↑ | napautus tai pyyhkäisy ylös | aloita, hyppy, uudestaan |
| ← → | pyyhkäisy sivulle | vaihda kaistaa |

## Rakenne

| Tiedosto | Mitä |
|---|---|
| `index.html` | Pelisivu: import map, HUD, aloitus- ja game over -ruudut |
| `liina-scene.js` | Koko 3D-scene ja pelilogiikka |
| `style-kit.js` | Jaettu tyylikirjasto: materiaalit, paletti, tekstuurit, geometriareseptit, hahmorigi |
| `tokens.json` | Värit, fontit, mitat ja pelinumerot koneluettavana |
| `handoff/` | Suunnittelupaketin dokumentit ja referenssikuvat |
| `.claude/skills/liina-escape/` | Skill, joka pakottaa tyylisäännöt jatkokehityksessä |

`index.html` on tuotantoversio suunnittelupaketin demosivusta
`handoff/assets/liina-3d-pelinakyma.html`. Erot: puhelinkehys ja
selitepaneeli poistettu, `#stage` täyttää ruudun, HUD:n marginaaleihin lisätty
`env(safe-area-inset-*)` puhelimen lovea varten. HUD:n rakenne, typografia ja
komponentit ovat `handoff/UI.md`:n mukaiset sellaisenaan.

## Kosketusohjaus

Aloitus- ja game over -ruutu peittävät koko alan, ja demossa ne ottivat
`pointer-events`illa kaikki osoitintapahtumat itselleen. Kosketus ei siis
koskaan tavoittanut `#stage`:a, eikä peliä voinut käynnistää puhelimella
lainkaan — näppäimistöllä kyllä. Korjaus:

- `.screen` on `pointer-events:none`, joten napautus menee pelille asti
- `.screen .btn` on `pointer-events:auto` ja painikkeilla on oma
  click-käsittelijä, joten myös itse nappia voi painaa
- piilotettu ruutu saa luokan `pois`, joka tekee sen painikkeesta
  läpinäkymättömän syötteelle — muuten näkymätön nappi söisi napautuksia
  kesken pelin
- `pointercancel` nollaa kesken jääneen pyyhkäisyn

Ohjaus on tarkoituksella pelkkä pyyhkäisy ja näppäimistö: ruudulla ei ole
painettavia nuolia.

## Sähköpotkulauta

Toinen power-up NOCCO-tölkin rinnalla, mutta eri mekaniikalla: tölkki vaikuttaa heti
poimittaessa, potkulauta menee varastoon ja pelaaja päättää milloin sen käyttää.

- **Keräys.** Kaistalta samalla koneistolla kuin tölkki: kallellaan `0.52 rad`, pyörii
  `5.2 rad/s`, ympärillä limenvihreä kehä ja pehmeä hehku. 3 kpl kierrossa, väli 150 m.
- **Varasto.** Poiminta kasvattaa `S.scoots`-lukua. Oikean alakulman nappi näyttää määrän.
- **Aktivointi.** Nappi kuluttaa yhden ja asettaa `S.ride = 10`.
- **Kyyti.** Liina seisoo kannella, kädet tangon kahvoilla, lauta mutkittelee kaistan
  sisällä `sin`-aallolla. Mutkittelu on **vain visuaalista**: `S.laneX` ei muutu, joten
  kaista- ja törmäyslogiikka pysyy ennallaan.
- **Lisäelämä.** Kyydin aikana törmäys ei päätä peliä vaan katkaisee kyydin.
- **Päättyminen.** 10 s täyteen tai törmäys → takaisin juoksuun.
- **Nappi aktiivisena.** Reunat pyöristyvät ympyräksi ja limenvihreä viiva kuluu kellon
  lailla: `stroke-dashoffset = 2πr × (1 − jäljellä / 10)`.

Törmäyksen jälkeen on **1,2 sekunnin suoja-aika** (`S.rideGrace`) ja ajastimen
umpeutumisen jälkeen 0,6 s. Ilman sitä sama auto osuisi heti seuraavalla framella ja
peli päättyisi siihen törmäykseen, jonka potkulaudan piti estää. Suoja-aika on oma
lisäykseni, ei osa alkuperäistä pyyntöä.

Malli on proseduraalinen kuten kaikki muukin: kansi `extrudeBody`llä bevelillä, kaulaputki
ja tanko sylintereinä, pyörät ja lokasuojat sylintereinä ja torus-kaarina, kypärä
puolipallona. Ohjaustanko on tarkoituksella Liinan hartioita leveämpi — muuten se jää
takaa katsottaessa vartalon taakse eikä ajoasento lue lainkaan.

Uusi roolisävy `#76c043` on kirjattu `tokens.json`iin ja `handoff/ART_DIRECTION.md`iin
tyylisopimuksen luvun 9 mukaisesti. Se on varattu korostus Liinan kuparin ja NOCCOn
oranssin tapaan: tausta-elementit eivät käytä sitä.

## Ennen kuin muutat mitään

Lue `.claude/skills/liina-escape/SKILL.md` ja `handoff/STYLE_CONTRACT.md`.
Tyyli ei ole makuasia vaan funktiokirjasto: uusi `MeshStandardMaterial` tai uusi
hex-väri on merkki poikkeamasta. Lukitut arvot L1–L10 ovat tyylisopimuksessa.

`liina-scene.js` sisältää tällä hetkellä omat kopiot style-kitin funktioista,
jotta se toimii yksitiedostoisena. Kun jatkat kehitystä, korvaa kopiot
importeilla `style-kit.js`-moduulista.

## Kehitys

Moduulit vaativat http:n, tiedosto ei aukea suoraan selaimeen:

    python3 -m http.server 8140

## Testit

`handoff/STYLE_CONTRACT.md` luku 6 listaa kuusi tarkistusta. Kolme niistä ajetaan
selaimen konsolista; scene julkaisee tarvittavat viitteet `window.__liina`-objektissa
(`camera`, `scene`, `S`, `mascot`, `liina`, `tervis`, `cars`, `cans`, `coins`).

Huomiot nykyisestä koodista:

- **Maalitesti.** Luvun 6 raycast ruudun keskeltä `(0, 0.1)` ei osu Mascotin oveen
  vaan kaistan kolikkoon ja sitten katuun — säde laskeutuu maahan noin 76 metrissä,
  kun ovi on 95 metrin päässä. Testi ei siis mene läpi sellaisenaan edes
  koskemattomalla scenellä. Toimiva muoto on projisoida oven maailmasijainti
  ruudulle ja tarkistaa että se on näkyvissä:

      const dp = new THREE.Vector3(); mascot.userData.door.getWorldPosition(dp);
      const ndc = dp.clone().project(camera);
      Math.abs(ndc.x) < 1 && Math.abs(ndc.y) < 1 && ndc.z < 1;

- **Palettitesti.** `liina-scene.js` käyttää 88:aa väriä, joista 33 puuttuu
  `tokens.json`-tiedostosta. Puuttuvat ovat tukisävyjä: ikkunankehykset ja
  lasisävyt julkisivutekstuureissa, lehvästö, farkkukangas, puunrunko, hohtavat
  valot ja kylttien pohjavärit. Osa niistä on `ART_DIRECTION.md`:ssä leipätekstinä
  mutta ei tokeneissa. Nämä eivät ole uusia värejä vaan dokumentoimattomia
  olemassa olevia — kirjaamatta testi ei voi mennä läpi.
