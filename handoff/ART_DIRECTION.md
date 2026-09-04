# Muotokieli

## Väripaletti (hex)

### Katu ja maa
| Rooli | Hex |
|---|---|
| Asfaltti | `#6f747b` |
| Jalkakäytävä / reunakivi | `#b4aea2` |
| Kaistamaalaus | `#f4efdf` |
| Graniittisokkeli | `#9a958c` |

### Rakennukset
| Rooli | Hex |
|---|---|
| Tiili (Museo, Lyseo) | `#b0523a` |
| Tiili, tumma sauma | `#8d4028` |
| Rauhankadun okra | `#e3c67e` |
| Vaalea rappaus | `#f0ece0` / `#d8d2c2` |
| Peltikatto / liuske | `#2f333a` |
| Ikkunalasi | `#33414f` |
| Ristinkirkon torni | `#f0ece0` |

### Mascot (maali)
| Rooli | Hex |
|---|---|
| Laattajulkisivu | `#cfcbc2` |
| Tummansininen portaali ja otsalauta | `#12305e` |
| Ikkunoiden keltainen | `#ffdc23` |
| Hohtava ovi | `#fff3b0` |

### Hahmot
| Rooli | Hex |
|---|---|
| Liinan tukka (kupari) | `#c2551d` |
| Liinan raidallinen setti | pohja `#fdf1f3`, raita `#f0a3ba` |
| Liinan housut | `#f6cdd8` |
| Liinan lenkkarit | `#e98aa2` |
| Iho | `#f2c9a0` |
| Terviksen neule | `#a9c6dd` |
| Terviksen farkut | `#2f3a4a` |
| Terviksen tukka | `#6f6357` |
| Salkku | `#3d2a1c` |
| Maitokahvi / vaahto | `#c2996b` / `#e8d6bd` / `#fbf3e6` |

### Ajoneuvot ja pickupit
| Rooli | Hex |
|---|---|
| Valkoinen crossover | `#f7f8f8` |
| Punainen coupé | `#d7402c` |
| Harmaa farmari | `#6f8090` |
| Bussi vaalea | `#cfe2f2` |
| Bussi sininen | `#1f7ec8` |
| Bussi syvä sininen | `#0e5fa8` |
| Rengas | `#1c2028` |
| Kromi / puskuri | `#d7dbe0` |
| Kolikko | `#f7b500`, emissive `#6b4a00` |
| NOCCO-tölkki | `#4c525a` → `#33383e` → `#22262b` |
| NOCCO-oranssi | `#f2600c` |

### UI
| Rooli | Hex |
|---|---|
| HUD-pilleri | `rgba(14,20,32,.55)` + 2px `rgba(255,255,255,.18)` |
| Keltainen painike | `#ffd60a` → `#f7b500`, alavarjo `#b97f00` |
| Oranssi painike | `#ef6317` → `#c74a0d`, alavarjo `#8a3208` |
| Otsikon varjo | `#c2410c` |
| Taivas | `#e9f4f7` → `#bfe2ef` → `#7cc4e4` → `#3f9ccf` |
| Sumu | `#cfe6f0`, near 95, far 280 |

## Fontit

- **Baloo 2**, paino 800 — otsikot, pisteet, kylttien tekstit, painikkeet.
- **Nunito**, paino 600/800/900 — HUD-labelit, pikkuteksti, listat.
- Google Fonts: `family=Baloo+2:wght@600;700;800&family=Nunito:wght@600;700;800;900`
- Minimikoko ruudulla 9 px vain versaali-labeleissa; luettava teksti ≥ 11 px.

## Valaistus ja varjostus

```js
new THREE.HemisphereLight(0xd8ecf5, 0x9c7d59, 0.85)
const sun = new THREE.DirectionalLight(0xfff2d0, 1.25); sun.position.set(9, 16, 8);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
// ortokamera ±22, near 1, far 60 — seuraa pelaajaa: sun.position.x = laneX + 9
```

Toon gradient map: `new Uint8Array([90, 160, 220, 255])` → `DataTexture(RedFormat)`.
Neljä porrasta riittää; älä lisää normal- tai roughness-tekstuureja.

## Muotokielen säännöt

- Yksi valo ylhäältä vasemmalta, pehmeät maavarjot, ei ambient occlusionia.
- Siluetti kantaa: hahmon pää on iso (r 0.4 / 2.4 m pituus), kengät isot, raajat paksuja kapseleita.
- Ei tekstuuridetailia mihin ei osu katse: julkisivut ovat canvas-generoituja ikkunaruudukkoja.
- Ei gradienttitaustoja, ei emojia, ei graffiti-imitaatiota.
- Placeholder on parempi kuin huono yritys: jos malli ei lue chase-kuvassa, yksinkertaista.
