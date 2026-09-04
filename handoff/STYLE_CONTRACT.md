# Tyylisopimus — miten tyyli pysyy identtisenä, vaikka peliä muutetaan

Tämä on paketin tärkein tiedosto. Muut dokumentit kuvaavat mitä pelissä *on*;
tämä kuvaa mitä pitää *pysyä samana*, kun sisältöä lisätään tai muutetaan.

Perusperiaate: **tyyli ei ole makuasia vaan funktiokirjasto.** Jokainen uusi
malli, kyltti tai hahmo rakennetaan `assets/style-kit.js`-moduulin funktioilla.
Jos kirjoitat uuden `new THREE.MeshStandardMaterial(...)`-rivin tai uuden
hex-värin, olet jo poikennut tyylistä.

```js
import { MAT, toon, signTex, signPlane, extrudeBody, blockBuilding,
         makeRunner, animateRunner, LANE_W } from './style-kit.js';
```

Jos tarvittava apuri puuttuu: lisää se **style-kitiin**, anna sille nimi ja
käytä sitä sieltä. Älä koskaan kopioi materiaalimäärittelyä scene-tiedostoon.

---

## 1. Lukitut asiat (ei muuteta ilman erillistä lupaa)

| # | Lukittu | Arvo |
|---|---|---|
| L1 | Materiaalimalli | `MeshToonMaterial` + `DataTexture([90,160,220,255])` gradient map. Poikkeukset: `MeshBasicMaterial` hohtaville pinnoille ja kylttiplaneille, `MeshPhysicalMaterial` vain kahvilasille. |
| L2 | Paletti | Vain `tokens.json`-värit. Uusi objekti käyttää olemassa olevaa roolisävyä. |
| L3 | Fontit | `Baloo 2` 800 (otsikot, numerot, kyltit) ja `Nunito` 600/800/900 (labelit). Ei kolmatta fonttia. |
| L4 | Valaistus | `installLighting()`: hemisphere 0.85, aurinko `#fff2d0` 1.25 kohdasta (9,16,8), varjokartta 1024, orto ±22. Yksi suuntavalo, ei ambientia, ei AO:ta. |
| L5 | Ilmakehä | Taivas 4 pysäytintä `#e9f4f7 → #3f9ccf`, sumu `#cfe6f0` 95/280. |
| L6 | Kamera | fov 72, chase `(laneX·0.3, 4.2 + y·0.25, 9.8)`, katse `(laneX·0.18, 1.4 + y·0.45, −12)`, lerp 2.4. |
| L7 | Mittakaava | 1 yksikkö = 1 metri. Hahmo 2.45 m, pää r 0.4. Kaista 2.2, ajorata ±3.3. |
| L8 | Suunnat | Suurempi z = lähempänä kameraa. Maailma rullaa +z. Hahmon selkä +z, kasvot −z. Autot katsovat +z. |
| L9 | Pyöristys | Raajat Capsule, nivelet Sphere, korit `extrudeBody` bevelillä. Ei paljasta BoxGeometryä orgaanisessa muodossa. |
| L10 | Kiintopisteet | Ristinkirkon torni, Lyseo, Museo ja Mascotin ovi pysyvät paikoillaan (ks. `WORLD.md`). |

## 2. Vapaasti muutettavissa

- Pelinumerot: nopeudet, spawn-välit, boostin kesto, matka maaliin, pisteet.
- Sisällön määrä: lisää kortteleita, puita, autoja, kolikkoja, hahmoja.
- Uudet objektityypit, kun ne noudatetaan luvun 3 reseptejä.
- HUD-tekstit ja ruutujen sanamuodot (tyyli `UI.md`:n mukaan).
- Kentän dramaturgia: mihin kohtaan matkaa mikä tapahtuu.

---

## 3. Reseptit uudelle sisällölle

Jokainen resepti tuottaa funktion, joka palauttaa `THREE.Group`in.
Ryhmä asemoidaan vasta kutsupaikassa — malli itse rakennetaan origoon,
jalat y = 0 -tasolla.

### Uusi rakennus taustariviin
```js
blockBuilding({
  w: 10–14, h: 10–15, d: 9–10,
  tex: facadeTex(pohja, kehys, lasi, cols, rows),   // pohja tokens.json:sta
  roof: MAT.slate | toon(0xb9603f) | toon(0x7d8794)
});
```
- Ikkunaruudukko: leveyttä kohti 1 sarake / ~3.5 m, korkeutta 1 rivi / ~3 m.
- Katto aina 0.5 m ja 0.5 m runkoa leveämpi — se on tyylin tunnusmerkki.
- Sijoita `x = ±BUILDING_X`, väli `BUILDING_SPACING`, kierrätä `POOL × SPACING`.

### Uusi kiinteä maamerkki
1. Massa yhdellä `facadeTex`illä tai `MAT.cream`illa, graniittisokkeli `MAT.granite` (h 1.8–2.4).
2. Räystäslista `MAT.brickDark` tai `MAT.slate`, 1–1.2 m.
3. Nimikyltti `signPlane(signTex('NIMI', '#8d4028', '#f0e6cc'), 5.4, 1.5, …)`.
4. Tarkista ettei se peitä maalia: ks. luku 6 raycast-testi.

### Uusi ajoneuvo
```js
const lower = extrudeBody([...profiili...], w, MAT.<väri>);        // bevel 0.16
const greenhouse = extrudeBody([...ikkunalinja...], w - 0.12, MAT.glassDark, 0.05);
const roofCap   = extrudeBody([...katto...], w - 0.2, MAT.<väri>, 0.05);
```
- Leveys 1.82–1.88 (henkilöauto), 2.36 (bussi). Pituus 4.5–5.2 / 10.8.
- Pyörät `wheel(0.44, 0.3, ±(w/2 − 0.08), 0.44, ±(nose − 1.2), sx)`, bussissa r 0.55.
- Aina: säleikkö + puskuri `MAT.slate`, ajovalot `glow(0xfff8d8)` kapselina,
  takavalot `glow(0xd93b26)`, peili korin värissä.
- `g.userData.len` = korin pituus (törmäystarkistus lukee sen).

### Uusi hahmo
```js
const x = makeRunner({ top, pants, sleeve, shoe, hair, longHair?, briefcase?, coffeeGlass? });
```
- Mitoitusta ei muuteta. Erot tehdään **materiaaleilla, tukkaparametreilla ja
  kannettavilla esineillä**, ei uudella rigillä.
- Koko-ero enintään `scale.setScalar(0.94–1.10)`.
- Kannettava esine on aina käden (`arms[i]`) lapsi, jotta se liikkuu mukana.
- Animaatio `animateRunner(x, t * 13, { legAmp, armAmp, armAmp2, bounce })`.
  Sivuhahmoilla vaihe-ero: kerro vaihetta 0.88–0.95 ja lisää offset.

### Uusi pickup
- Muoto pyörii oman akselinsa ympäri, ei billboardia, ei sprite-kuvaa.
- Kolikko: `CylinderGeometry(0.42, 0.42, 0.1, 18)`, `MAT.gold`, `rotation.x = π/2`, `rotation.z += dt·4`.
- Tölkkityyppinen: kallistus 0.52 rad, sisäryhmä pyörii `dt·5.2`, halo `TorusGeometry(0.42, 0.05)` korostusvärissä.
- Poimintakorkeus y 1.1–1.15, osumaikkuna |z| < 1.2–1.4, |Δx| < 1.0–1.1, vain kun `y < 1.6`.

### Uusi kyltti tai teksti maailmassa
```js
signPlane(signTex('TEKSTI', bg, fg, alarivi?), leveys, korkeus, x, y, zPinta);
```
- Fonttiperhe **lainausmerkkeihin**: `"800 128px 'Baloo 2', Nunito, sans-serif"`.
- Plane vähintään **0.15 m** kylttilaatikon etupinnan eteen (`signPlane` tekee tämän).
- Kutsu `refreshCanvasTextures()` kertaalleen — muuten teksti jää fallback-fontille.
- Vain versaalit maailman kylteissä.

---

## 4. Numeeriset raja-arvot

| Asia | Sallittu |
|---|---|
| Pallon segmentit | 12–24 × 9–16 (hahmot 18×14, päät 18×14) |
| Kapselin segmentit | `CapsuleGeometry(r, len, 6, 12–16)` |
| Sylinterin segmentit | 8 (rungot) / 16–28 (näkyvät pyöreät) |
| Bevel korissa | 0.05 (lasit ja katot) – 0.22 (bussin kori) |
| `curveSegments` | 14 |
| Kylttiplanen offset | ≥ 0.15 m |
| Värejä per objekti | enintään 4 + lasi |
| Pikselisuhde | `Math.min(devicePixelRatio, 2)` |
| Varjot | liikkuvat `castShadow`, katu ja jalkakäytävä `receiveShadow` |
| Tärkeä objekti lähellä kameraa | \|x\| ≤ 4 |

## 5. Kiellot

1. Ei `MeshStandardMaterial`/`MeshPhongMaterial`-pintoja maailmassa.
2. Ei normal-, roughness- eikä AO-tekstuureja.
3. Ei uusia hex-värejä. Tarvitset sävyn? Käytä lähintä roolisävyä.
4. Ei kolmatta fonttia, ei kursiivia, ei ohuita painoja.
5. Ei litteitä kuvatasoja maailmaan (paitsi kyltit), ei spriteja, ei billboardeja.
6. Ei emojia, ei gradienttitaustoja UI:ssa muualla kuin painikkeissa ja mittarissa.
7. Ei Liinan kuparia (`#c2551d`) eikä NOCCO-oranssia (`#f2600c`) tausta-elementeissä — ne ovat varattuja korostuksia.
8. Ei spawnia pelaajan ja kameran väliin (z > 0).
9. Ei objektia, joka peittää Mascotin oven.
10. Ei mallin arviointia vapaalla kameralla — vain chase-kuva ratkaisee.
11. Ei Subway Surfers -hahmojen, -logojen tai -UI:n kopiointia. Kaikki on omaa muotoilua.

---

## 6. Tarkistuslista ennen kuin muutos jää

Aja nämä kuusi tarkistusta joka kerta:

```js
// 1. Maali näkyy: ensimmäinen osuma ruudun keskeltä on Mascotin ovi
const rc = new THREE.Raycaster();
rc.setFromCamera(new THREE.Vector2(0, 0.1), camera);
rc.intersectObjects(scene.children, true)[0].object === mascot.userData.door;

// 2. Liikenne on läpäistävissä: jokaisessa 22 m ikkunassa vähintään yksi vapaa kaista
for (let z = -20; z > -240; z -= 22) {
  const taken = cars.filter(c => Math.abs(c.position.z - z) < 22).map(c => c.userData.lane);
  console.assert([-1, 0, 1].some(l => !taken.includes(l)), 'umpikuja z=' + z);
}

// 3. Ei mitään pelaajan ja kameran välissä
console.assert(!cars.some(c => c.position.z > 2), 'auto kameran puolella');
```

4. **Siluettitesti.** Kuvakaappaus chase-kuvasta 100 px korkuiseksi: tunnistuvatko
   Liina, Tervis ja ovi? Jos ei, yksinkertaista muotoa, älä lisää detailia.
5. **Palettitesti.** `grep -o '0x[0-9a-f]\{6\}' liina-scene.js` — jokainen osuma
   löytyy `tokens.json`-tiedostosta.
6. **Fonttitesti.** Lataa sivu uudelleen kovalla latauksella: kylttien teksti on
   Baloo 2, ei Arial. Jos on Arial, `refreshCanvasTextures()` jäi kutsumatta.

## 7. Vikakirjasto

| Oire | Syy | Korjaus |
|---|---|---|
| Kyltin teksti puuttuu tai vilkkuu | plane on laatikon sisällä | siirrä ≥ 0.15 m eteen, käytä `signPlane` |
| Kyltti fallback-fontilla | tekstuuri piirretty ennen fonttien latausta | `refreshCanvasTextures()` |
| Päälaella kalju laikku | `SphereGeometry` phiStart väärin | `Math.PI/2 − phiLen/2, phiLen, 0, thetaLen` |
| Tukka näkyy vain toiselta puolelta | avoin pinta | `material.side = THREE.DoubleSide` |
| Kaksi pintaa välkkyy | z-fighting | erota ≥ 0.02 m, älä käytä `polygonOffset` |
| Hahmo liukuu paikallaan | vaihe kellosta eikä matkasta | vaihe = `t × 13`, kun `speed` ~16–31; nosta kerrointa jos vauhti kasvaa |
| Auto ilmestyy pelaajan päälle | respawn liian lähellä | spawn `min(z) − (26…40)` |
| Varjot katoavat kaukana | orto-frustum liian pieni | pidä ±22 ja seuraa `sun.position.x = laneX + 9` |
| Kuva samentuu | sumu liian lähellä | fog near 95, far 280 |
| Maali katoaa reunalta | uusi massa liian lähellä keskilinjaa | pidä Lyseon tyyppisten lähireuna x ≥ 8 |

## 8. Prompt-pohja Claude Codelle

> Lue `.claude/skills/liina-escape/SKILL.md` ja `handoff/STYLE_CONTRACT.md`.
> Tee [muutos]. Käytä vain `assets/style-kit.js`-funktioita ja `tokens.json`-värejä.
> Älä muuta lukittuja arvoja L1–L10. Aja luvun 6 tarkistuslista ja kerro tulokset.
> Jos jokin vaatii lukitun arvon muuttamista, kysy ensin.

## 9. Kun tyyliä on pakko laajentaa

Jos uusi sisältö ei mahdu paletiin tai reseptiin:

1. Kysy ennen kuin lisäät.
2. Lisää **yksi** uusi roolisävy kerrallaan, johda se olemassa olevasta
   `oklch`-avaruudessa (sama kirkkaus- ja kylläisyystaso kuin naapurisävyillä).
3. Kirjaa se `tokens.json`iin ja `ART_DIRECTION.md`iin samalla committilla.
4. Lisää apurifunktio `style-kit.js`iin, älä scene-tiedostoon.
