# Maailma ja mitat (metrit, y-up)

## Katu

| Osa | Arvo |
|---|---|
| Kaistan leveys | 2.2 |
| Ajoradan puolikas | 3.3 |
| Kaistat | x = −2.2 / 0 / +2.2 |
| Jalkakäytävä | x = ±5.0, leveys 3.4, korkeus 0.34 |
| Kaistaviivat | 0.18 × 2.6, 46 kpl per viiva, väli 6, kierrätys z > 12 → −276 |
| Ajorata | Box(6.6, 0.4, 400), keskipiste z −160 |

## Kiintopisteet (eivät rullaa)

| Kohde | Sijainti | Mitat | Huom |
|---|---|---|---|
| Ristinkirkon torni | x −17, z −74 | 5 × 38 × 5 + risti | Näkyy kattojen yli |
| Lahden Lyseo | x 32, z −56, scale y 1.5 | 36 × 17 × 15 | Lähireuna x = 14, ei ajoradan päällä |
| Mascot (maali) | z −92 | 26 × 15 × 12 | `position.x = sin(t·0.5)·0.6` |
| Museo (lähtö) | z +20, rotation.y π | 22 × 11 × 13 + torni ja kulmatorni | Näkyy aloitusruudussa |
| Museon naapurit | x ±16.5, z 12 | 9 × 12 × 12 | Täyttää lähtökuvan reunat |

## Mascotin sisäänkäynti

- Laattajulkisivu `#cfcbc2`, canvas-laattatekstuuri (16 px ruudukko, repeat 8×5).
- Otsalauta: Box(27, 3.9, 0.8) navy, z 7.2. Nimikilpi plane 16 × 4 kohdassa z **7.66**.
- ÄSSÄ-kilpi 5.2 × 3.5, x −9.9, z 7.66, keltainen pohja `#ffdc23`.
- Keltaiset ikkunat: Box(7.4, 4.4, 0.3) x ±8.2, navy kehys 8 × 5.
- Pylväät: Cylinder r 0.7, h 6.4, x ±12.3.
- Portaali Box(9, 5.6, 0.7) navy + hohtava ovi Box(6.6, 4.4, 0.35) `#fff3b0`,
  4 pystyjakoa, kynnys, PointLight(0xffd60a, 120, 44).
- Kilvet: TERVETULOA (5.4 × 0.9) ja 8–24 (1.9 × 1.5).
- Oven väri hengittää: `setHSL(0.13, 1, 0.62 + sin(t·3)·0.08)`.

## Rullaavat korttelit

7 rakennusta per puoli, väli 22, x = ±12.3, kierrätys z > 26 → −154.
Reseptit (leveys × korkeus × syvyys, julkisivutekstuuri):

1. 12 × 12 × 10, okra `#e3c67e`, ikkunat 4 × 4, katto `#b9603f`
2. 10 × 14 × 10, tiili `#b0523a`, ikkunat 3 × 5, katto liuske
3. 14 × 10 × 9, vaalea `#d8d2c2`, ikkunat 5 × 3, katto `#7d8794`
4. 11 × 15 × 10, keltainen `#e8cf8b`, ikkunat 3 × 6, katto `#8d4028`

Julkisivutekstuuri: canvas 256², pohjaväri + 8 px vaakasaumat + ikkunaruudukko
(kehys, lasi, ylälasin heijastus `rgba(255,255,255,.35)`).

## Puut

6 per puoli, x = ±5.5, väli 26, kierrätys z > 26 → −156.
Runko Cylinder(0.22, 0.3, 2.2), 3 kroonaa Sphere r 1.25 → 0.89, värit `#4e9a4a` / `#2f6b3c`.

## Taivas

Sphere r 300, BackSide, canvas-gradientti 4 × 256.
