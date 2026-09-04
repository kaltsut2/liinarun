# UI ja HUD

Kaikki UI on DOM:ia 3D-canvasin päällä, ei three.js-objekteja. Puhelinkehys
`#phone` on demoa varten: pelissä `#stage` täyttää ruudun ja HUD asemoituu
`position:absolute` samalla tavalla.

## Typografia

| Rooli | Fontti | Koko | Muuta |
|---|---|---|---|
| Ruudun otsikko | Baloo 2 800 | 52 px (game over 38) | `line-height:.92`, varjo `0 5px 0 #c2410c, 0 9px 0 rgba(0,0,0,.45)` |
| Kicker | Nunito 800 | 11 px | `letter-spacing:.32em`, väri `#ffd60a` |
| Painike | Baloo 2 800 | 20 px | väri `#12305e` |
| HUD-luku | Baloo 2 800 | 20 px (kolikot 14, gap 13) | |
| HUD-label | Nunito 800 | 9 px | `letter-spacing:.08em`, `rgba(255,255,255,.72)` |
| Vihje | Nunito 600 | 11 px | `line-height:1.6`, `rgba(255,255,255,.78)` |
| Mittarin rivi | Nunito 800 | 10 px | `text-shadow:0 1px 3px rgba(0,0,0,.6)` |

Labelit ovat versaaleja ja välistettyjä; luvut eivät. Luvut muotoillaan
`toLocaleString('fi-FI')`, joten tuhaterotin on välilyönti.

## Komponentit

**Pilleri** (kaikki HUD-lukemat samassa muodossa):
```css
padding:5px 12px; border-radius:15px;
background:rgba(14,20,32,.55);
box-shadow:inset 0 0 0 2px rgba(255,255,255,.18);
backdrop-filter:blur(3px);
```

**Kolikkomerkki:** 16 px ympyrä, `radial-gradient(circle at 34% 30%,#ffe484,#f7b500)`,
kehys `0 0 0 2px #8a5a00`.

**Painike:** `linear-gradient(180deg,#ffd60a,#f7b500)`, alavarjo `0 5px 0 #b97f00`,
ylähohto `inset 0 2px 0 rgba(255,255,255,.5)`, `border-radius:22px`, `padding:13px 34px`.
Oranssi variantti `#ef6317 → #c74a0d`, alavarjo `#8a3208`.

**Matkamittari:** ura 11 px korkea, `rgba(14,20,32,.5)` + 2 px sisäkehys,
täyttö `linear-gradient(90deg,#ff9433,#ffd60a)`, `transition:width .2s linear`.

**Boost-merkki:** neutraalina tausta `#ffd60a` ja teksti `#12305e` (`x1`),
aktiivisena tausta `#f2600c` ja teksti valkoinen (`BOOST 3.4 s`).

**Ruudut** (`intro`, `over`): koko alan peittävä
`linear-gradient(180deg,rgba(9,18,38,.12),rgba(9,18,38,.58))`, pystykeskitys,
`gap:14px`, `transition:opacity .35s`. Piilotus = `opacity:0` +
`pointer-events:none`, ei `display:none` (peli jatkuu taustalla).

## Asemointi

- Vasen ylä: pisteet ja kolikot, pystypino `gap:6px`, marginaali 12 px.
- Oikea ylä: TERVIS-etäisyys ja boost-merkki, oikeaan reunaan tasattuna.
- Alareuna: `MUSEO` — `<matka> m → MASCOT` -rivi ja matkamittari, 14 px pohjasta.
- Kosketusalueet: HUD on `pointer-events:none`; koko `#stage` ottaa syötteen.
  Napautus = aloita / hyppy / uudestaan, pyyhkäisy sivulle = kaista, pyyhkäisy ylös = hyppy.
  Napautuksen raja 22 px.

## Sanamuodot

Suomeksi, lyhyesti, ei huutomerkkejä muualla kuin päänapissa (`JUOKSE!`).
Labelit ovat substantiiveja (`PISTETTÄ`, `TERVIS`), ei lauseita.
Game over -teksti: `Tervis sai kiinni · 412 m`. Erotin on `·` sitomattomin
välilyönnein, metrimerkinnässä `\u00a0m`.

## Ruutukoko

Portrait 9:19.5 on suunnitteluperusta. HUD ei skaalaudu canvasin mukana:
tekstikoot ovat kiinteitä pikseleitä, joten testaa myös 360 px levyisellä
ruudulla — pillerien pitää mahtua rinnakkain ilman rivinvaihtoa.
