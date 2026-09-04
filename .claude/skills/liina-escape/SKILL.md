---
name: liina-escape
description: Rakenna ja laajenna "Liina juoksee Mascotiin" -peliä (Subway Surfers -tyyppinen 3D endless runner Lahden Rauhankadulla). Käytä aina kun teet tälle pelille grafiikkaa, ratamateriaalia, hahmoja, ajoneuvoja, UI:ta tai pelimekaniikkaa.
---

# Liina juoksee Mascotiin — muotokieli ja maailma

Kolmen kaistan endless runner. Liina (pitkä kuparinpunainen tukka, vaaleanpunainen
raidallinen setti) juoksee Museon edestä kohti Mascotin ovea. Lehtori Tervis
(hoikka, vaaleansininen neule, maitokahvilasi vasemmassa kädessä, salkku toisessa)
jahtaa takaa. Vastaan tulee autoja ja AGT-bussi.

## Pakolliset säännöt

0. **Tuo tyyli, älä kirjoita sitä uudelleen.** Kaikki materiaalit, värit,
   tekstuurifunktiot, geometriareseptit ja hahmorigi tulevat
   `assets/style-kit.js`-moduulista. Uusi `MeshStandardMaterial` tai uusi hex-väri
   on merkki poikkeamasta. Lukitut arvot L1–L10 ja reseptit: `STYLE_CONTRACT.md`.
1. **Kaikki on 3D:tä ja cartoonia.** three.js, `MeshToonMaterial` + 4-portainen
   `DataTexture` gradient map. Ei litteitä CSS-kulisseja, ei sprite-taustoja.
2. **Pyöristys.** Hahmojen raajat = CapsuleGeometry, nivelet = Sphere. Autojen korit =
   `ExtrudeGeometry` sivuprofiilista, `bevelEnabled: true`, bevelSize 0.05–0.22.
   Ei paljaita BoxGeometry-raajoja tai laatikkoautoja.
3. **Kaistat.** `LANE_W = 2.2`, ajorata `±3.3`. Pelaajan x = lane × LANE_W, lane ∈ {-1,0,1}.
   Portrait-ruudussa vaakasuuntainen näkökenttä on kapea: mikään pelin kannalta
   tärkeä asia ei mene |x| > 4 kohtaan lähellä kameraa.
4. **Kiintopisteet eivät rullaa.** Ristinkirkon torni (x −17, z −74, 38 m korkea),
   Lyseo (x 32, z −56, leveys 36 — pidä lähireuna x ≥ 8, muuten se peittää maalin),
   Mascotin sisäänkäynti (z −92, häilyy sivusuunnassa ±0.6 m). Museo on lähdössä (z +20).
   Kaikki muu (korttelit, puut, kaistaviivat) rullaa +z ja kierrätetään.
5. **Suunnat.** Hahmon selkä on **+z** (kamera näkee selän). Hiuskuori peittää +z-puolen:
   `SphereGeometry(r, 24, 16, Math.PI/2 - phiLen/2, phiLen, 0, thetaLen)` — theta alkaa
   päälaelta, jottei jää kaljua kohtaa. Autot ja bussi katsovat +z (kohti kameraa).
6. **Maali näkyy aina.** Ennen kuin lisäät mitään z < 0 -puolelle, tarkista raycastilla
   ruudun keskeltä että ensimmäinen osuma on `mascot.userData.door`.
7. **Liikenne on aina läpäistävissä.** Vähintään yksi kaista vapaana jokaisessa ~20 m
   ikkunassa. Käytä `respawnCar()`-logiikkaa: laske varatut kaistat 22 m säteellä ja
   jätä yksi vapaaksi. Älä koskaan spawnaa pelaajan ja kameran väliin (z > 0).
8. **Fontit.** Otsikot ja numerot `Baloo 2` 800, muu UI `Nunito` 600–900.
   Canvas-teksturoinnissa fonttiperhe **lainausmerkkeihin**: `"800 128px 'Baloo 2', Nunito, sans-serif"`
   ja piirrä tekstuurit uudelleen `document.fonts.ready` jälkeen.
9. **Kylttien tasot.** Canvas-tekstuuriplanet vähintään 0.15 m kylttilaatikon etupinnan
   eteen, muuten ne hautautuvat geometrian sisään.
10. **Minimipaletti.** Käytä `tokens.json`-värejä. Liinan kupari ja NOCCOn oranssi ovat
    varattuja korostuksia: mikään tausta-elementti ei käytä niitä.

## Numerot, joita ei muuteta ilman syytä

- Kamera: fov 72, chase `(laneX·0.3, 4.2 + y·0.25, 9.8)`, katse `(laneX·0.18, 1.4 + y·0.45, −12)`.
- Vauhti 16 → 31 m/s, ramppi 0.4/s. Hyppy vy 9.2, painovoima 26.
- Tervis: gap 12.5 → 10.6 m (kameran takana ajon aikana), game overissa z 3.4.
- Boosteri: NOCCO-tölkki, 4 s, ×1.5 vauhti, ×2 kolikot. Tölkki kallellaan 0.52 rad, pyörii 5.2 rad/s.
- Matka maaliin 900 m.

## Työjärjestys uudelle sisällölle

1. Lue `STYLE_CONTRACT.md` (reseptit, luku 3) ja `tokens.json`.
2. Rakenna malli funktiona, joka palauttaa `THREE.Group`in nimetyillä meshheillä,
   origoon, jalat y = 0 -tasolla. Käytä style-kitin apureita.
3. Testaa se pelikameralla, ei vapaalla kameralla — vain chase-kuva ratkaisee.
4. Aja `STYLE_CONTRACT.md` luvun 6 tarkistuslista: raycast maaliin, vapaa kaista,
   ei mitään z > 0, siluetti 100 px:ssä, palettitesti, fonttitesti.
5. Vertaa `assets/reference-run.png`-kuvaan. Jos yleisilme muuttui, muutos on liian iso.
6. Jos jokin vaatii lukitun arvon muuttamista, kysy ensin — älä päätä itse.
