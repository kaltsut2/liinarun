# Ajoneuvot ja pickupit

Kaikki katsovat **+z** eli kohti kameraa. Rakennetaan sivuprofiilista:

```js
extrudeBody(pts, width, mat, bevel)   // ExtrudeGeometry + bevel, rotateY(-Math.PI/2),
                                      // keskitys boundingBoxin mukaan
```

Profiili on `[x, y]`-pisteitä, joissa x = pituus (keula +), y = korkeus.
Kaksi lisäarvoa pisteessä = quadratic-kontrollipisteen siirto (pyöristys).

## Henkilöautot

| Malli | Leveys | Keula/perä | Vyötärö | Kattolinja | Väri |
|---|---|---|---|---|---|
| Crossover | 1.88 | 2.35 / −2.32 | 0.98 | 1.68 | `#f7f8f8` |
| Coupé | 1.84 | 2.3 / −2.28 | 0.90 | 1.46 | `#d7402c` |
| Farmari | 1.82 | 2.26 / −2.24 | 1.00 | 1.70 | `#6f8090` |

Osat: alakori (extrude, bevel 0.16), lasikuori `#33414f` (bevel 0.05, leveys −0.12),
kattopanta korin värissä, säleikkö ja puskuri `#2f333a`, ajovalot
Capsule(0.1, 0.34) `#fff8d8` **keulan etupinnan ulkopuolelle** (z = nose − 0.16),
takavalot `#d93b26`, peilit Sphere(0.1) scale (1, 0.7, 1.4),
renkaat Cylinder(0.44, 0.44, 0.3) + kromikeskiö r 0.23.

## Bussi (AGT)

Pituus 10.8, korkeus 3.35, leveys 2.36 (kori extrudataan leveydellä W − 0.16
niin että alahelma ja ikkunapanta työntyvät esiin).

- Kori `#cfe2f2`, bevel 0.22.
- Alahelma Box(W, 1.05, L·2 − 0.5) `#1f7ec8`, aaltoraita Box(W + 0.03, 0.26, …) `#0e5fa8`.
- Ikkunapanta Box(W + 0.02, 1.15, L·2 − 2.2) `#33414f`.
- Tuulilasi Box(W − 0.34, 1.6, 0.4) z = L + 0.14; etuhelma `#1f7ec8` z = L + 0.12.
- **Määränpääkilpi**: plane 1.9 × 0.44, teksti **AGT** (`#ffd60a` pohjalla `#14171c`), z = L + 0.2.
- Ajovalot y 1.42, peilit y 2.6, ovi `#0e5fa8` oikealla kyljellä.
- 6 pyörää r 0.55 (etu L − 1.5, taka −L + 2.4 ja −L + 3.6), ilmastointikotelo katolla.
- Nopeus 2–4 m/s (hitaampi kuin autot, tukkii kaistan pitkään).

## NOCCO-tölkki (boosteri)

- Runko Cylinder(0.17, 0.17, 0.52, 28, openEnded), canvas-tekstuuri 1024 × 512:
  pystygradientti `#4c525a` → `#33383e` → `#22262b`, kaksi oranssia `#f2600c`
  vinoraitaa, teksti **NOCCO** (Baloo 2 800, valkoinen), **FOCUS** (`#12151a`),
  **KOFEIINI 180 mg**. Kuvio piirretään kahteen kertaan (ox = 0 ja w/2) jotta
  logo lukee mistä tahansa kulmasta.
- Olkapää Cylinder(0.13, 0.17, 0.07) `#2b2f35`, kansi Cylinder(0.125) kromi, jalka `#23272c`.
- Scale 1.45, oranssi halo Torus(0.42, 0.05) `#f2600c` vaakatasossa.
- Emo-Group `rotation.z = 0.52` (≈30°), tölkki pyörii `rotation.y += dt · 5.2` kuin kolikko.
- 3 kpl kerrallaan, väli 120 m, kierrätys z > 16 → −360, satunnainen kaista.
- Poiminta: `|z| < 1.4 && |x − laneX| < 1.1 && y < 1.8` → boost 4 s, +150 pistettä.

## Kolikot

Cylinder(0.42, 0.42, 0.1, 18), `rotation.x = π/2`, pyörii `rotation.z += dt · 4`,
y 1.1, 26 kpl, väli 5 m, kierrätys z > 14 → −130.
Poiminta `|z| < 1.2 && |x − laneX| < 1.0 && y < 1.6`.
