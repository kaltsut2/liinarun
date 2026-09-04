/**
 * style-kit.js — Liina juoksee Mascotiin
 * Kaikki tyylin kantavat rakenteet yhdessä paikassa. Uusi sisältö EI määrittele
 * omia materiaaleja, tekstuurifunktioita tai mittoja: se tuo ne täältä.
 *
 *   import { MAT, toon, signTex, extrudeBody, makeRunner, LANE_W } from './style-kit.js';
 *
 * Jos jotain puuttuu, lisää se TÄHÄN tiedostoon ja käytä sitä nimellä.
 * Älä kopioi materiaalimäärittelyä scenen sisään.
 */
import * as THREE from 'three';

/* ---------- 1. materiaalimalli (lukittu) ---------- */

/** 4-porrasinen toon-rampi. Ei lisää portaita, ei sileää varjostusta. */
export const toonGradient = (() => {
  const d = new Uint8Array([90, 160, 220, 255]);
  const t = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat);
  t.needsUpdate = true;
  return t;
})();

/** Ainoa sallittu tapa luoda pintamateriaali. */
export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient, ...opts });
}

/** Hohtavat pinnat (ikkunavalot, lamput, oven hehku): basic, ei valon vaikutusta. */
export function glow(color) {
  return new THREE.MeshBasicMaterial({ color });
}

/* ---------- 2. canvas-tekstuurit ---------- */

const texRegistry = [];

/**
 * Luo CanvasTexture ja rekisteröi sen uudelleenpiirtoon.
 * Fontit latautuvat myöhemmin kuin ensimmäinen piirto, joten jokainen
 * tekstitekstuuri on piirrettävä uudelleen document.fonts.ready jälkeen.
 */
export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  texRegistry.push(() => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; });
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

/** Kutsu kertaalleen käynnistyksessä. Ilman tätä kyltit jäävät fallback-fontille. */
export function refreshCanvasTextures() {
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => texRegistry.forEach(f => f()));
  }
}

/** Julkisivu: pohjaväri + vaakasaumat + ikkunaruudukko kehyksin ja heijastuksin. */
export function facadeTex(base, frame, glass, cols, rows) {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,.07)';
    for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 2);
    const cw = w / cols, rh = h / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x = i * cw + cw * 0.28, y = j * rh + rh * 0.22;
      const ww = cw * 0.44, wh = rh * 0.5;
      g.fillStyle = frame; g.fillRect(x - 3, y - 3, ww + 6, wh + 6);
      g.fillStyle = glass; g.fillRect(x, y, ww, wh);
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect(x, y, ww, wh * 0.35);
    }
  });
}

/** Kyltti: Baloo 2 800, keskitetty, valinnainen alarivi Nunito 800. */
export function signTex(text, bg, fg, sub) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = "800 82px 'Baloo 2', Nunito, sans-serif";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, sub ? h / 2 - 14 : h / 2);
    if (sub) { g.font = "800 34px Nunito, sans-serif"; g.fillText(sub, w / 2, h / 2 + 46); }
  });
}

/**
 * Kylttiplane. Käytä TÄTÄ, älä omaa PlaneGeometryä:
 * offset varmistaa ettei teksti hautaudu kylttilaatikon sisään.
 */
export function signPlane(tex, w, h, x, y, z, offset = 0.16) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
  m.position.set(x, y, z + offset);
  return m;
}

/* ---------- 3. paletti (vain nämä värit) ---------- */

export const MAT = {
  asphalt: toon(0x6f747b),
  kerb: toon(0xb4aea2),
  paint: toon(0xf4efdf),
  brick: toon(0xb0523a),
  brickDark: toon(0x8d4028),
  ochre: toon(0xe3c67e),
  cream: toon(0xf0ece0),
  plaster: toon(0xd8d2c2),
  slate: toon(0x2f333a),
  granite: toon(0x9a958c),
  glassDark: toon(0x33414f),
  white: toon(0xf7f8f8),
  red: toon(0xd7402c),
  greyCar: toon(0x6f8090),
  navy: toon(0x12305e),
  gold: toon(0xf7b500, { emissive: 0x6b4a00 }),
  yellowGlow: glow(0xffe066),
  windowYellow: glow(0xffdc23),
  doorGlow: glow(0xfff3b0),
  leafDark: toon(0x2f6b3c),
  leaf: toon(0x4e9a4a),
  trunk: toon(0x6b4a2f),
  skin: toon(0xf2c9a0),
  copper: toon(0xc2551d),
  pyjamaPants: toon(0xf6cdd8),
  pinkShoe: toon(0xe98aa2),
  sweater: toon(0xa9c6dd),
  hairShort: toon(0x6f6357),
  darkTrouser: toon(0x2f3a4a),
  case: toon(0x3d2a1c),
  busLight: toon(0xcfe2f2),
  busBlue: toon(0x1f7ec8),
  busDeep: toon(0x0e5fa8),
  chrome: toon(0xd7dbe0),
  tyre: toon(0x1c2028),
  noccoOrange: glow(0xf2600c)
};

/** Liinan raidallinen setti. Kutsu kerran ja jaa materiaali. */
export const stripeMat = (() => {
  const tex = canvasTex(96, 96, (g, w, h) => {
    g.fillStyle = '#fdf1f3'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f0a3ba';
    for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 11, h);
  }, [3, 3]);
  return toon(0xffffff, { map: tex });
})();

/* ---------- 4. mittakaava (lukittu) ---------- */

export const LANE_W = 2.2;        // kaistan leveys
export const ROAD_HALF = 3.3;     // ajoradan puolikas
export const LANES = [-LANE_W, 0, LANE_W];
export const SIDEWALK_X = 5;      // jalkakäytävän keskilinja
export const BUILDING_X = 12.3;   // korttelirivin keskilinja
export const BUILDING_SPACING = 22;
export const BUILDING_POOL = 7;

/* ---------- 5. geometriareseptit ---------- */

/** Korttelitalo: runko + hieman yliulottuva katto. Kaikki taustatalot tästä. */
export function blockBuilding({ w, h, d, body, tex, roof, roofH = 0.5 }) {
  const g = new THREE.Group();
  const mat = tex ? toon(0xffffff, { map: tex }) : body;
  if (tex) {
    tex.repeat.set(Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 3.4)));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  }
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.y = h / 2;
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  const r = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, roofH, d + 0.5), roof || MAT.slate);
  r.position.y = h + roofH / 2;
  r.castShadow = true;
  g.add(r);
  return g;
}

/** Katupuu: runko + kolme limittäistä palloa, kaksi lehtisävyä. */
export function tree() {
  const g = new THREE.Group();
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.2, 8), MAT.trunk);
  t.position.y = 1.1; g.add(t);
  const crownMats = [MAT.leaf, MAT.leafDark];
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.25 - i * 0.18, 12, 9), crownMats[i % 2]);
    c.position.set((i - 1) * 0.5, 2.7 + i * 0.75, (i % 2) * 0.4 - 0.2);
    c.castShadow = true;
    g.add(c);
  }
  return g;
}

/** Sivuprofiili -> pehmeäkulmainen Shape. Pisteet [x, y, ctrlDx?, ctrlDy?]. */
export function carShape(pts) {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i];
    const [px, py] = pts[i - 1];
    sh.quadraticCurveTo((px + x) / 2 + (pts[i][2] || 0), (py + y) / 2 + (pts[i][3] || 0), x, y);
  }
  sh.closePath();
  return sh;
}

/**
 * Ainoa sallittu tapa tehdä ajoneuvon kori: pursotettu sivuprofiili,
 * bevel päällä, keskitetty x-akselille. bevelSize 0.05–0.22.
 */
export function extrudeBody(pts, width, mat, bevel = 0.16) {
  const geo = new THREE.ExtrudeGeometry(carShape(pts), {
    depth: width - bevel * 2, bevelEnabled: true,
    bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 14
  });
  geo.rotateY(-Math.PI / 2);
  geo.computeBoundingBox();
  const c = geo.boundingBox.getCenter(new THREE.Vector3());
  geo.translate(-c.x, 0, 0);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

/** Pyörä + kromikeskiö. sx = ±1 (kumpi puoli), jotta keskiö työntyy ulos. */
export function wheel(r, width, x, y, z, sx = 1) {
  const g = new THREE.Group();
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 20), MAT.tyre);
  w.rotation.z = Math.PI / 2; w.position.set(x, y, z); w.castShadow = true;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.53, r * 0.53, width + 0.03, 16), MAT.chrome);
  hub.rotation.z = Math.PI / 2; hub.position.set(x + sx * 0.02, y, z);
  g.add(w, hub);
  return g;
}

/* ---------- 6. hahmorigi (lukittu mitoitus) ---------- */

/**
 * Palauttaa { group, legs, arms, head }. Selkä on +z, kasvot -z.
 * Kaikki uudet hahmot tehdään TÄLLÄ funktiolla: vain materiaalit,
 * tukan parametrit ja kannettavat esineet vaihtuvat.
 */
export function makeRunner(o) {
  const g = new THREE.Group();
  const cap = (r, len, mat, seg = 14) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, seg), mat);
  const ball = (r, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat);

  const torso = cap(0.33, 0.52, o.top);
  torso.position.y = 1.52; torso.scale.set(1.12, 1, 0.82);
  torso.castShadow = true; g.add(torso);

  const hips = ball(0.32, o.pants);
  hips.position.y = 1.08; hips.scale.set(1.12, 0.82, 0.92); g.add(hips);

  const legs = [];
  for (const sgn of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(sgn * 0.185, 1.06, 0);
    const thigh = cap(0.155, 0.85, o.pants);
    thigh.position.y = -0.5; thigh.castShadow = true; hip.add(thigh);
    const knee = ball(0.16, o.pants); knee.position.y = -0.52; hip.add(knee);
    const shoe = ball(0.2, o.shoe);
    shoe.position.set(0, -1.0, -0.12); shoe.scale.set(1.05, 0.72, 1.6);
    shoe.castShadow = true; hip.add(shoe);
    g.add(hip); legs.push(hip);
  }

  const arms = [];
  for (const sgn of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(sgn * 0.42, 1.78, 0);
    sh.add(ball(0.16, o.sleeve));
    const upper = cap(0.125, 0.5, o.sleeve);
    upper.position.y = -0.3; upper.castShadow = true; sh.add(upper);
    const hand = ball(0.135, MAT.skin); hand.position.y = -0.62; sh.add(hand);
    g.add(sh); arms.push(sh);
  }

  const neck = cap(0.11, 0.12, MAT.skin); neck.position.y = 1.94; g.add(neck);
  const head = ball(0.4, MAT.skin);
  head.position.y = 2.3; head.scale.set(1, 1.08, 0.96);
  head.castShadow = true; g.add(head);
  const ear1 = ball(0.09, MAT.skin); ear1.position.set(-0.38, 2.3, 0); g.add(ear1);
  const ear2 = ear1.clone(); ear2.position.x = 0.38; g.add(ear2);

  /* hiuskuori: theta alkaa päälaelta -> ei kaljua kohtaa; aukko kasvojen (-z) puolella */
  const hairCap = (r, thetaLen, phiLen) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(r, 24, 16, Math.PI * 0.5 - phiLen / 2, phiLen, 0, thetaLen),
      o.hair
    );
    m.material.side = THREE.DoubleSide;
    m.position.y = 2.3;
    m.scale.set(1.03, 1.1, 1.0);
    m.castShadow = true;
    return m;
  };

  if (o.longHair) {
    g.add(hairCap(0.42, Math.PI * 0.74, Math.PI * 1.62));
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.62, 6, 16), o.hair);
    back.position.set(0, 1.98, 0.34);
    back.scale.set(1.3, 1, 0.62);
    back.rotation.x = 0.16;
    back.castShadow = true; g.add(back);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), o.hair);
    tip.position.set(0, 1.6, 0.42); tip.scale.set(1.3, 0.9, 0.6); g.add(tip);
    for (const sgn of [-1, 1]) {
      const strand = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.34, 6, 12), o.hair);
      strand.position.set(sgn * 0.4, 2.06, -0.02);
      strand.rotation.z = sgn * 0.12;
      g.add(strand);
    }
  } else {
    g.add(hairCap(0.42, Math.PI * 0.56, Math.PI * 1.5));
  }

  if (o.briefcase) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.14), MAT.case);
    c.position.set(0, -0.88, -0.02); arms[0].add(c);
  }
  if (o.coffeeGlass) arms[1].add(coffeeGlass());
  return { group: g, legs, arms, head };
}

/** Maitokahvilasi. Lapsi kädestä, joten se liikkuu animaation mukana. */
export function coffeeGlass() {
  const glass = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.072, 0.24, 18, 1, true),
    new THREE.MeshPhysicalMaterial({ color: 0xeaf4f8, transparent: true, opacity: 0.34, roughness: 0.08, metalness: 0, side: THREE.DoubleSide }));
  shell.position.y = 0.12; glass.add(shell);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.03, 18),
    new THREE.MeshPhysicalMaterial({ color: 0xdff0f5, transparent: true, opacity: 0.5, roughness: 0.1 }));
  base.position.y = 0.015; glass.add(base);
  const coffee = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.066, 0.15, 18), toon(0xc2996b));
  coffee.position.y = 0.09; glass.add(coffee);
  const milk = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.076, 0.05, 18), toon(0xe8d6bd));
  milk.position.y = 0.175; glass.add(milk);
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.08, 0.05, 18), toon(0xfbf3e6));
  foam.position.y = 0.215; glass.add(foam);
  glass.position.set(0.03, -0.82, -0.07);
  glass.rotation.x = -0.12;
  glass.scale.setScalar(1.4);
  return glass;
}

/** Juoksuanimaatio. Kaikki hahmot ajetaan tästä, jotta rytmi on sama. */
export function animateRunner(r, phase, k = {}) {
  const { legAmp = 1.05, armAmp = 0.95, armAmp2 = armAmp, bounce = 0.07 } = k;
  const swing = Math.sin(phase);
  r.legs[0].rotation.x = swing * legAmp;
  r.legs[1].rotation.x = -swing * legAmp;
  r.arms[0].rotation.x = -swing * armAmp;
  r.arms[1].rotation.x = swing * armAmp2;
  r.group.position.y += Math.abs(Math.cos(phase)) * bounce;
}

/* ---------- 7. valaistus ja ilmakehä (lukittu) ---------- */

/** Lisää taivas, sumu, hemisphere ja aurinko. Palauttaa auringon seurantaa varten. */
export function installLighting(scene) {
  scene.fog = new THREE.Fog(0xcfe6f0, 95, 280);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 24, 16),
    new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      map: canvasTex(4, 256, (g, w, h) => {
        const grd = g.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, '#e9f4f7'); grd.addColorStop(0.46, '#bfe2ef');
        grd.addColorStop(0.62, '#7cc4e4'); grd.addColorStop(1, '#3f9ccf');
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
      })
    })
  );
  sky.rotation.x = Math.PI;
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xd8ecf5, 0x9c7d59, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.25);
  sun.position.set(9, 16, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 60;
  scene.add(sun, sun.target);
  return { sun, sky };
}

/** Pelikamera. Vain tätä käytetään arviointiin — ei OrbitControlsia. */
export function makeCamera() {
  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 400);
  camera.position.set(2.6, 5.2, -15);
  return camera;
}
