# Hahmot

Yhteinen rakennusfunktio `makeRunner(opts)` palauttaa `{ group, legs, arms, head }`.
Selkä on **+z** (kamera näkee selän), kärjet ja kengät −z.

## Mitat (kokonaispituus ~2.45 m, iso pää = luettava siluetti)

| Osa | Geometria | Sijainti |
|---|---|---|
| Torso | Capsule(0.33, 0.52), scale (1.12, 1, 0.82) | y 1.52 |
| Lantio | Sphere(0.32), scale (1.12, 0.82, 0.92) | y 1.08 |
| Reisi/sääri | Capsule(0.155, 0.85) | lonkka y 1.06, x ±0.185 |
| Polvi | Sphere(0.16) | y −0.52 lonkasta |
| Kenkä | Sphere(0.2), scale (1.05, 0.72, 1.6) | y −1.0, z −0.12 |
| Olkapää | Sphere(0.16) | y 1.78, x ±0.42 |
| Yläraaja | Capsule(0.125, 0.5) | y −0.3 olkapäästä |
| Käsi | Sphere(0.135) | y −0.62 |
| Kaula | Capsule(0.11, 0.12) | y 1.94 |
| Pää | Sphere(0.4), scale (1, 1.08, 0.96) | y 2.3 |
| Korvat | Sphere(0.09) | y 2.3, x ±0.38 |

## Hiukset

```js
new THREE.SphereGeometry(r, 24, 16, Math.PI / 2 - phiLen / 2, phiLen, 0, thetaLen)
// theta alkaa päälaelta -> ei kaljua kohtaa; aukko kasvojen puolella (-z)
// mesh: position.y 2.3, scale (1.03, 1.1, 1.0), material.side = DoubleSide
```

- **Liina**: `r 0.42, thetaLen 0.74π, phiLen 1.62π`. Takatukka Capsule(0.26, 0.62)
  kohdassa y 1.98, z **+0.34**, scale (1.3, 1, 0.62), rotation.x +0.16, kärki
  Sphere(0.22) y 1.6 z 0.42. Sivusuortuvat Capsule(0.1, 0.34) x ±0.4, y 2.06, z −0.02
  — lähtevät korvien edestä, eivät jää olkapäiden taakse.
- **Tervis**: `r 0.42, thetaLen 0.56π, phiLen 1.5π`. Ei muuta tukkaa.

## Liina

Kupari `#c2551d`. Yläosa ja hihat raidallinen canvas-tekstuuri (96², pohja
`#fdf1f3`, 11 px raita `#f0a3ba` 24 px välein, repeat 3×3). Housut `#f6cdd8`,
lenkkarit `#e98aa2`. Ei reppua.

## Tervis

Neule `#a9c6dd`, farkut `#2f3a4a`, tukka `#6f6357`, kengät `#3d2a1c`.
Scale 1.06 (hoikka ja pitempi).

- **Salkku** oikeassa kädessä (`arms[0]`): Box(0.58, 0.42, 0.14), y −0.88, z −0.02.
- **Maitokahvilasi** vasemmassa kädessä (`arms[1]`), Group scale 1.4, y −0.82, z −0.07,
  rotation.x −0.12 — liikkuu käden mukana, koska se on käden lapsi:
  - kuori Cylinder(0.085, 0.072, 0.24, openEnded) MeshPhysicalMaterial opacity 0.34
  - pohja Cylinder(0.072, 0.072, 0.03) opacity 0.5
  - kahvi Cylinder(0.076, 0.066, 0.15) `#c2996b`
  - maitokerros Cylinder(0.078, 0.076, 0.05) `#e8d6bd`
  - vaahto Cylinder(0.082, 0.08, 0.05) `#fbf3e6`

## Juoksuanimaatio

```js
const phase = t * 13;                    // 5 kun pysähtynyt
const swing = Math.sin(phase);
legs[0].rotation.x =  swing * 1.05;      legs[1].rotation.x = -swing * 1.05;
arms[0].rotation.x = -swing * 0.95;      arms[1].rotation.x =  swing * 0.95;
group.position.y += Math.abs(Math.cos(phase)) * 0.07;   // pomppu
group.rotation.z = (lane * LANE_W - laneX) * -0.06;     // kallistus kaistanvaihdossa
```

Tervis: sama, kertoimet 0.92 × vaihe, jalat 1.0, kädet 0.8 / 0.5 (salkkukäsi jäykempi).
