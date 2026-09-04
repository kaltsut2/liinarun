# Pelimekaniikka

## Tila

```js
S = { started, over, speed: 16, dist: 0, score: 0, coins: 0,
      lane: 0, laneX: 0, y: 0, vy: 0, jumping: false, t: 0, shake: 0,
      gap: 12.5, boost: 0 }
```

## Liike

| Asia | Arvo |
|---|---|
| Alkuvauhti | 16 m/s |
| Maksimivauhti | 31 m/s |
| Kiihtyvyys | +0.4 m/s per sekunti |
| Boost-kerroin | ×1.5 (4 s) |
| Kaistanvaihdon interpolointi | `laneX += (lane·2.2 − laneX) · min(1, dt·12)` |
| Hyppy | vy 9.2, painovoima 26 |
| Matka maaliin | 900 m |

Maailma liikkuu, pelaaja pysyy z = 0:ssa. Kaikki taustaobjektit `position.z += v · dt`.

## Liikenteen spawn (tärkeä)

```js
function respawnCar(c) {
  let z = Math.min(...cars.map(o => o.position.z)) - (26 + Math.random() * 14);
  let free = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    const taken = cars.filter(o => o !== c && Math.abs(o.position.z - z) < 22)
                      .map(o => o.userData.lane);
    free = [-1, 0, 1].filter(l => !taken.includes(l));
    if (free.length >= 2) break;
    z -= 28;                       // liian ahdas -> siirrä kauemmas
  }
  const pick = free.length >= 2
    ? free[Math.floor(Math.random() * (free.length - 1))]   // jättää yhden vapaaksi
    : (free[0] ?? 0);
  c.userData.lane = pick;
  c.position.set(pick * LANE_W, 0, z);
  c.userData.speed = c.userData.kind === 'bus' ? 2 + Math.random() * 2
                                               : 3 + Math.random() * 4;
}
```

6 ajoneuvoa: `['tesla','bmw','bus','wagon','tesla','bus']`, aloituskaistat
`[-1,1,0,1,-1,0]`, z = −80 − i·32. Aloituksessa kaikki työnnetään z ≤ −60.

## Törmäys

```js
if (Math.abs(c.position.z) < (c.userData.len || 4.6) / 2 + 0.5 &&
    Math.abs(c.position.x - S.laneX) < 1.2 && S.y < 1.5) gameOver();
```

Pituus luetaan `userData.len`istä, joten bussi (10.8 m) osuu koko mitaltaan.

## Tervis

- Ajon aikana z = gap 12.5 → 10.6 (kameran takana, ei tukkeuta näkymää).
- HUD näyttää etäisyyden sekunneissa.
- Game overissa hän kiilaa eteen: `z = max(3.4, z − dt·5)` — pienempi z = kauempana
  kamerasta, joten 3.4 pitää molemmat hahmot ruudussa.

## Kamera

| Tila | Sijainti | Katse |
|---|---|---|
| Aloitusruutu | (2.6, 5.2, −15) | (0, 5.2, 14) — Museo takana |
| Juoksu | (laneX·0.3, 4.2 + y·0.25, 9.8) | (laneX·0.18, 1.4 + y·0.45, −12) |

fov 72, lerp `dt · 2.4`. Törmäyksessä `shake 0.5` ravistaa katsepistettä.
`renderer.setSize(w, h)` — **ei** `false`-lippua, muuten canvas skaalautuu väärin.

## HUD

- Vasen ylä: pisteet (Baloo 2 800, 20 px) ja kolikot.
- Oikea ylä: TERVIS + sekunnit, boost-pilleri (`x1` → `BOOST 3.4 s`, oranssi `#f2600c`).
- Ala: MUSEO → `n m → MASCOT` + palkki (`#ff9433` → `#ffd60a`).
- Aloitus- ja game over -ruudut: samat pillerit ja painikkeet, tausta
  `linear-gradient(rgba(9,18,38,.12), rgba(9,18,38,.58))`.

## Ohjaus

Napautus tai väli = aloita / hyppy / uudestaan. Nuolet tai pyyhkäisy sivulle = kaista.
Pyyhkäisy ylös = hyppy. Kynnys: tap jos |dx| < 22 ja |dy| < 22.
