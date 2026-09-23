# Liina juoksee Mascotiin — tuotantopaketti

Kaikki mitä Claude Code tarvitsee pelin ulkoasun ja maailman rakentamiseen.
Peli on Subway Surfers -tyyppinen kolmen kaistan endless runner, joka sijoittuu
Lahden Kirkkokadulle: Liina juoksee Museon edestä kohti Mascotin (S-market) ovea,
ja yhteiskuntaopin ja historian lehtori Tervis jahtaa häntä.

## Paketin sisältö

| Tiedosto | Mitä sisältää |
|---|---|
| `SKILL.md` | Claude Code -skill. Pudota `.claude/skills/liina-escape/SKILL.md`. Sisältää kaikki pakolliset säännöt tiiviisti. |
| `STYLE_CONTRACT.md` | **Lue tämä ennen muutoksia.** Lukitut arvot, reseptit uudelle sisällölle, raja-arvot, kiellot, tarkistuslista, vikakirjasto. |
| `ART_DIRECTION.md` | Värikoodit, fontit, valaistus, muotokieli, kiellot. |
| `UI.md` | HUD, painikkeet, ruudut, typografian koot, sanamuodot. |
| `WORLD.md` | Kadun geometria, kiintopisteet, rakennusten kierrätys, mitat metreinä. |
| `CHARACTERS.md` | Liinan ja Terviksen rakenne osa osalta, mitat ja animaatio. |
| `VEHICLES.md` | Autot, bussi, NOCCO-tölkki ja kolikot. |
| `GAMEPLAY.md` | Nopeudet, spawn-säännöt, törmäys, boosteri, HUD, kamera. |
| `tokens.json` | Sama data koneluettavana (värit, fontit, mitat, pelinumerot). |
| `assets/style-kit.js` | Jaettu tyylikirjasto: materiaalit, paletti, tekstuurifunktiot, geometriareseptit, hahmorigi, valaistus. Uusi sisältö tuodaan tästä. |
| `assets/liina-scene.js` | Toimiva three.js-scene: kaikki 3D-mallit koodina (rakennukset, hahmot, ajoneuvot, tölkki). |
| `assets/liina-3d-pelinakyma.html` | Ajettava sivu: import map, HUD, aloitus- ja game over -ruudut. |
| `assets/reference-intro.png`, `assets/reference-run.png` | Referenssikuvat. Vertaa omaa tulostasi näihin ennen kuin muutos jää. |

## Miten 3D-mallit on tehty

Kaikki mallit ovat **proseduraalisia**: ne rakennetaan koodissa three.js-primitiiveistä
(Capsule, Sphere, Cylinder, Box, ExtrudeGeometry pyöristetyllä bevelillä). Erillisiä
.obj/.glb-tiedostoja ei tarvita — `assets/liina-scene.js` on malli. Jos haluat
tiedostomuodot, mallit voi ajaa läpi GLTFExporterilla / OBJExporterilla ryhmä kerrallaan.

## Käynnistys

```bash
# mikä tahansa staattinen palvelin, moduulit tarvitsevat http:n
npx serve .
# avaa assets/liina-3d-pelinakyma.html
```

Ohjaus: napautus / väli = aloita ja hyppy, nuolet vasen–oikea = kaista, pyyhkäisy toimii mobiilissa.

## Lukemisjärjestys

1. `SKILL.md` — pakolliset säännöt tiiviisti.
2. `STYLE_CONTRACT.md` — mitä on lukittu ja miten uusi sisältö tehdään.
3. Aihekohtainen dokumentti: `WORLD.md`, `CHARACTERS.md`, `VEHICLES.md`, `GAMEPLAY.md`, `UI.md`.
4. `assets/style-kit.js` — käytännön toteutus, importoi tästä.

`liina-scene.js` sisältää tällä hetkellä omat kopiot style-kitin funktioista,
jotta se toimii yksitiedostoisena. Kun jatkat kehitystä, korvaa kopiot
importeilla `style-kit.js`-moduulista ja poista duplikaatit — sen jälkeen
tyyli on rakenteellisesti pakotettu, ei muistin varassa.
