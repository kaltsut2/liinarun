import * as THREE from 'three';

/* ---------- helpers ---------- */
const toonGradient = (() => {
  const d = new Uint8Array([90, 160, 220, 255]);
  const t = new THREE.DataTexture(d, d.length, 1, THREE.RedFormat);
  t.needsUpdate = true;
  return t;
})();

function toon(color, opts = {}) {
  const m = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient, ...opts });
  return m;
}

const texRegistry = [];
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  texRegistry.push(() => { draw(c.getContext('2d'), w, h); t.needsUpdate = true; });
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function facadeTex(base, frame, glass, cols, rows) {
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

function signTex(text, bg, fg, sub) {
  return canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = "800 82px 'Baloo 2', Nunito, sans-serif";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, sub ? h / 2 - 14 : h / 2);
    if (sub) { g.font = "800 34px Nunito, sans-serif"; g.fillText(sub, w / 2, h / 2 + 46); }
  });
}

/* ---------- palette ---------- */
const MAT = {
  asphalt: toon(0x6f747b),
  kerb: toon(0xb4aea2),
  paint: toon(0xf4efdf),
  brick: toon(0xb0523a),
  brickDark: toon(0x8d4028),
  ochre: toon(0xe3c67e),
  cream: toon(0xf0ece0),
  slate: toon(0x2f333a),
  granite: toon(0x9a958c),
  glassDark: toon(0x33414f),
  white: toon(0xf7f8f8),
  red: toon(0xd7402c),
  navy: toon(0x12305e),
  gold: toon(0xf7b500, { emissive: 0x6b4a00 }),
  yellowGlow: new THREE.MeshBasicMaterial({ color: 0xffe066 }),
  leafDark: toon(0x2f6b3c),
  leaf: toon(0x4e9a4a),
  trunk: toon(0x6b4a2f),
  skin: toon(0xf2c9a0),
  hairOrange: toon(0xef6317),
  denim: toon(0x4a7fbe),
  denimDark: toon(0x33608f),
  darkTrouser: toon(0x2f3a4a),
  blazer: toon(0x6b4a2f),
  greyHair: toon(0xcfcac2),
  tie: toon(0xa8322a),
  case: toon(0x3d2a1c),
  chrome: toon(0xd7dbe0),
  tyre: toon(0x1c2028)
};

const LANE_W = 2.2, ROAD_HALF = 3.3;

/* ---------- scene ---------- */
const host = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);
renderer.domElement.style.display = 'block';

const scene = new THREE.Scene();
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

const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 400);
camera.position.set(2.6, 5.2, -15);
scene.add(new THREE.HemisphereLight(0xd8ecf5, 0x9c7d59, 0.85));
const sun = new THREE.DirectionalLight(0xfff2d0, 1.25);
sun.position.set(9, 16, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
const sc = sun.shadow.camera;
sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 60;
scene.add(sun);

/* road */
const world = new THREE.Group();
scene.add(world);

const road = new THREE.Mesh(new THREE.BoxGeometry(ROAD_HALF * 2, 0.4, 400), MAT.asphalt);
road.position.set(0, -0.2, -160);
road.receiveShadow = true;
scene.add(road);

for (const s of [-1, 1]) {
  const walk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.34, 400), MAT.kerb);
  walk.position.set(s * (ROAD_HALF + 1.7), -0.03, -160);
  walk.receiveShadow = true;
  scene.add(walk);
}

/* dashed lane paint (scrolls) */
const dashGeo = new THREE.BoxGeometry(0.18, 0.02, 2.6);
const dashes = [];
for (const x of [-LANE_W / 2, LANE_W / 2]) {
  for (let i = 0; i < 46; i++) {
    const d = new THREE.Mesh(dashGeo, MAT.paint);
    d.position.set(x, 0.011, -i * 6);
    scene.add(d);
    dashes.push(d);
  }
}

/* ---------- buildings ---------- */
function blockBuilding({ w, h, d, body, tex, roof, roofH = 0.5 }) {
  const g = new THREE.Group();
  const mat = tex
    ? toon(0xffffff, { map: tex })
    : body;
  if (tex) { tex.repeat.set(Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 3.4))); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
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

const buildingRecipes = [
  () => blockBuilding({ w: 12, h: 12, d: 10, tex: facadeTex('#e3c67e', '#f2ede1', '#5a6b7a', 4, 4), roof: toon(0xb9603f) }),
  () => blockBuilding({ w: 10, h: 14, d: 10, tex: facadeTex('#b0523a', '#e8e2d2', '#617586', 3, 5), roof: MAT.slate }),
  () => blockBuilding({ w: 14, h: 10, d: 9, tex: facadeTex('#d8d2c2', '#ffffff', '#4f6272', 5, 3), roof: toon(0x7d8794) }),
  () => blockBuilding({ w: 11, h: 15, d: 10, tex: facadeTex('#e8cf8b', '#fbf7ea', '#54687b', 3, 6), roof: toon(0x8d4028) })
];

const POOL = 7, SPACING = 22;
const sides = [];
for (const s of [-1, 1]) {
  const arr = [];
  for (let i = 0; i < POOL; i++) {
    const b = buildingRecipes[(i + (s > 0 ? 2 : 0)) % buildingRecipes.length]();
    b.position.set(s * (ROAD_HALF + 9), 0, -i * SPACING - 12);
    world.add(b);
    arr.push(b);
  }
  sides.push(arr);
}

/* trees between buildings */
function tree() {
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
const trees = [];
for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
  const t = tree();
  t.position.set(s * (ROAD_HALF + 2.2), 0.15, -i * 26 - 6);
  world.add(t); trees.push(t);
}

/* ---------- fixed landmarks ---------- */
/* Ristinkirkko tower, far left, stays put */
const tower = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 38, 5), MAT.cream);
  body.position.y = 19; body.castShadow = true; tower.add(body);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.9, 16, 0.3), MAT.granite);
  slit.position.set(-0.9, 20, 2.25); tower.add(slit);
  const slit2 = slit.clone(); slit2.position.x = 0.9; tower.add(slit2);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 5.2), MAT.slate);
  cap.position.y = 34.4; tower.add(cap);
  const mastV = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5.2, 0.22), MAT.slate);
  mastV.position.y = 37.6; tower.add(mastV);
  const mastH = new THREE.Mesh(new THREE.BoxGeometry(2, 0.22, 0.22), MAT.slate);
  mastH.position.y = 38.4; tower.add(mastH);
  tower.position.set(-17, 0, -74);
  scene.add(tower);
}

/* Lyseo, long brick block, right, stays put */
const lyseo = new THREE.Group();
{
  const tex = facadeTex('#a8543a', '#eae3d2', '#6a7f90', 10, 4);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(6, 2);
  const b = new THREE.Mesh(new THREE.BoxGeometry(36, 17, 15), toon(0xffffff, { map: tex }));
  b.position.y = 8.5; b.castShadow = true; lyseo.add(b);
  const base = new THREE.Mesh(new THREE.BoxGeometry(36.6, 1.8, 15.6), MAT.granite);
  base.position.y = 0.9; lyseo.add(base);
  const cor = new THREE.Mesh(new THREE.BoxGeometry(37.4, 1.2, 16.4), MAT.brickDark);
  cor.position.y = 17.4; lyseo.add(cor);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.6), new THREE.MeshBasicMaterial({ map: signTex('LYSEO', '#8d4028', '#e8dcbe'), transparent: false }));
  sign.position.set(0, 4.4, 7.62); lyseo.add(sign);
  lyseo.scale.set(1, 1.5, 1);
  lyseo.position.set(32, 0, -56);
  lyseo.rotation.y = -0.22;
  scene.add(lyseo);
}

/* Mascot facade — the goal, always hovering ahead */
const mascot = new THREE.Group();
{
  const tile = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#cfcbc2'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2;
    for (let x = 0; x <= w; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y <= h; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  }, [8, 5]);
  const facade = new THREE.Mesh(new THREE.BoxGeometry(26, 15, 12), toon(0xffffff, { map: tile }));
  facade.position.y = 7.5; mascot.add(facade);

  /* upper floor windows */
  for (const x of [-8, -3.5, 3.5, 8]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.6, 0.4), MAT.glassDark);
    w.position.set(x, 11.4, 6.05); mascot.add(w);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3, 0.3), MAT.cream);
    fr.position.set(x, 11.4, 5.95); mascot.add(fr);
  }

  /* canopy + fascia with the shop name */
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(27, 0.7, 15), MAT.granite);
  canopy.position.set(0, 6.4, 0); canopy.castShadow = true; mascot.add(canopy);
  const fascia = new THREE.Mesh(new THREE.BoxGeometry(27, 3.9, 0.8), MAT.navy);
  fascia.position.set(0, 8.6, 7.2); mascot.add(fascia);
  const nameTex = canvasTex(760, 190, (g, w, h) => {
    g.fillStyle = '#12305e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    g.font = "800 128px 'Baloo 2', Nunito, sans-serif";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MASCOT', w / 2, h / 2 + 4);
  });
  const nameSign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4),
    new THREE.MeshBasicMaterial({ map: nameTex }));
  nameSign.position.set(0, 8.6, 7.66); mascot.add(nameSign);
  const assaTex = canvasTex(280, 190, (g, w, h) => {
    g.fillStyle = '#ffdc23'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#12305e';
    g.font = "800 108px 'Baloo 2', Nunito, sans-serif";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ÄSSÄ', w / 2, h / 2 + 4);
  });
  const assa = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.5),
    new THREE.MeshBasicMaterial({ map: assaTex }));
  assa.position.set(-9.9, 8.6, 7.66); mascot.add(assa);

  /* ground floor: yellow shop windows in navy frames */
  for (const sx of [-1, 1]) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(7.4, 4.4, 0.3), new THREE.MeshBasicMaterial({ color: 0xffdc23 }));
    pane.position.set(sx * 8.2, 3.1, 7.05); mascot.add(pane);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 0.5), MAT.navy);
    frame.position.set(sx * 8.2, 3.1, 6.9); mascot.add(frame);
    const blob = new THREE.Mesh(new THREE.CircleGeometry(1.1, 18), new THREE.MeshBasicMaterial({ color: 0xfff59a }));
    blob.position.set(sx * 8.2, 2.2, 7.22); mascot.add(blob);
  }

  /* pillar between window and entrance */
  for (const sx of [-1, 1]) {
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 6.4, 16), MAT.granite);
    pil.position.set(sx * 12.3, 3.2, 6.6); pil.castShadow = true; mascot.add(pil);
  }

  /* the entrance: navy portal, twin glass doors, welcome strip */
  const portal = new THREE.Mesh(new THREE.BoxGeometry(9, 5.6, 0.7), MAT.navy);
  portal.position.set(0, 2.8, 6.8); mascot.add(portal);
  const welcome = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 0.9),
    new THREE.MeshBasicMaterial({ map: signTex('TERVETULOA', '#12305e', '#ffffff') }));
  welcome.position.set(0, 5.2, 7.18); mascot.add(welcome);
  const hours = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.5),
    new THREE.MeshBasicMaterial({ map: signTex('8', '#ffdc23', '#12305e', '24') }));
  hours.position.set(3.5, 2.9, 7.2); mascot.add(hours);

  const door = new THREE.Mesh(new THREE.BoxGeometry(6.6, 4.4, 0.35), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
  door.position.set(0, 2.4, 7.1); mascot.add(door);
  for (const x of [-3.3, -0.15, 0.15, 3.3]) {
    const mull = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.6, 0.5), MAT.navy);
    mull.position.set(x, 2.4, 7.25); mascot.add(mull);
  }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.3, 0.5), MAT.navy);
  sill.position.set(0, 0.2, 7.25); mascot.add(sill);
  const glow = new THREE.PointLight(0xffd60a, 120, 44);
  glow.position.set(0, 3, 11); mascot.add(glow);
  mascot.userData.door = door;

  mascot.position.set(0, 0, -92);
  scene.add(mascot);
}

/* Museo — start building, behind the runner */
const museo = new THREE.Group();
{
  const tex = facadeTex('#b0523a', '#e9dfc6', '#5e7383', 5, 2);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 1.4);
  const b = new THREE.Mesh(new THREE.BoxGeometry(22, 11, 13), toon(0xffffff, { map: tex }));
  b.position.y = 6.4; museo.add(b);
  const base = new THREE.Mesh(new THREE.BoxGeometry(22.6, 2.4, 13.6), MAT.granite);
  base.position.y = 1.2; museo.add(base);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(23.4, 3.4, 14.4), MAT.slate);
  roof.position.y = 13.4; museo.add(roof);
  const roof2 = new THREE.Mesh(new THREE.BoxGeometry(20, 2.2, 11.6), MAT.slate);
  roof2.position.y = 15.6; museo.add(roof2);
  for (const x of [-7, -2.4, 2.4, 7]) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3, 1.5), MAT.brickDark);
    ch.position.set(x, 16.4, 0); museo.add(ch);
  }
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 15, 10), toon(0xffffff, { map: tex }));
  turret.position.set(11.6, 7.5, 5); museo.add(turret);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(2.9, 5, 10), MAT.slate);
  cone.position.set(11.6, 17.4, 5); museo.add(cone);
  const rose = new THREE.Mesh(new THREE.CircleGeometry(1.9, 20), MAT.cream);
  rose.position.set(-5.5, 9.2, 6.55); museo.add(rose);
  const portal = new THREE.Mesh(new THREE.BoxGeometry(4.6, 6.4, 1.2), MAT.granite);
  portal.position.set(0, 3.2, 6.4); museo.add(portal);
  const doors = new THREE.Mesh(new THREE.BoxGeometry(3.4, 5.2, 0.4), toon(0x8a5c2c));
  doors.position.set(0, 2.6, 7.1); museo.add(doors);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 1.5),
    new THREE.MeshBasicMaterial({ map: signTex('MUSEO', '#8d4028', '#f0e6cc') }));
  sign.position.set(0, 7.4, 6.56); museo.add(sign);
  for (const sx of [-1, 1]) {
    const flank = blockBuilding({ w: 9, h: 12, d: 12, tex: facadeTex('#d8d2c2', '#ffffff', '#4f6272', 3, 4), roof: toon(0x7d8794) });
    flank.position.set(sx * 16.5, 0, 12);
    scene.add(flank);
  }
  museo.position.set(0, 0, 20);
  museo.rotation.y = Math.PI;
  scene.add(museo);
}

/* ---------- runners ---------- */
const stripeTex = canvasTex(96, 96, (g, w, h) => {
  g.fillStyle = '#fdf1f3'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f0a3ba';
  for (let x = 0; x < w; x += 24) g.fillRect(x, 0, 11, h);
}, [3, 3]);
MAT.pyjama = toon(0xffffff, { map: stripeTex });
MAT.pyjamaPants = toon(0xf6cdd8);
MAT.pinkShoe = toon(0xe98aa2);
MAT.copper = toon(0xc2551d);
MAT.sweater = toon(0xa9c6dd);
MAT.hairShort = toon(0x6f6357);

function makeRunner(o) {
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
    const shoulder = ball(0.16, o.sleeve); sh.add(shoulder);
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

  /* hiuskuori: theta alkaa päälaelta -> ei kalju kohtaa; aukko kasvojen (-z) puolella */
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
    /* takatukka roikkuu selässä, olkapäiden yläpuolelta taaksepäin */
    const back = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.62, 6, 16), o.hair);
    back.position.set(0, 1.98, 0.34);
    back.scale.set(1.3, 1, 0.62);
    back.rotation.x = 0.16;
    back.castShadow = true; g.add(back);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), o.hair);
    tip.position.set(0, 1.6, 0.42); tip.scale.set(1.3, 0.9, 0.6); g.add(tip);
    /* sivusuortuvat lähtevät korvien edestä, eivät olkapäiden takaa */
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
  if (o.coffeeGlass) {
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
    arms[1].add(glass);
  }
  return { group: g, legs, arms, head };
}

const liina = makeRunner({
  top: MAT.pyjama, pants: MAT.pyjamaPants, sleeve: MAT.pyjama, shoe: MAT.pinkShoe,
  hair: MAT.copper, longHair: true
});
liina.group.position.set(0, 0, 0);
world.add(liina.group);

const tervis = makeRunner({
  top: MAT.sweater, pants: MAT.darkTrouser, sleeve: MAT.sweater, shoe: MAT.case,
  hair: MAT.hairShort, briefcase: true, coffeeGlass: true
});
tervis.group.scale.setScalar(1.06);
tervis.group.position.set(0, 0, 12.5);
world.add(tervis.group);

/* ---------- cars ---------- */
function carShape(pts) {
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

function extrudeBody(pts, width, mat, bevel = 0.16) {
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

MAT.busLight = toon(0xcfe2f2);
MAT.busBlue = toon(0x1f7ec8);
MAT.busDeep = toon(0x0e5fa8);

function makeBus() {
  const g = new THREE.Group();
  const L = 5.4, H = 3.35, W = 2.36;
  const body = extrudeBody([
    [L, 0.62], [L + 0.06, 2.7, 0.02, 0.06], [L - 0.35, H, 0.16, 0],
    [-L + 0.35, H], [-L - 0.04, 2.7, 0.04, 0.06], [-L - 0.04, 0.66],
    [-L + 0.3, 0.34], [L - 0.3, 0.34]
  ], W - 0.16, MAT.busLight, 0.22);
  g.add(body);

  /* lower two-tone skirt + wave band */
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(W, 1.05, L * 2 - 0.5), MAT.busBlue);
  skirt.position.set(0, 0.86, 0); g.add(skirt);
  const wave = new THREE.Mesh(new THREE.BoxGeometry(W + 0.03, 0.26, L * 2 - 1.2), MAT.busDeep);
  wave.position.set(0, 1.3, -0.2); g.add(wave);

  /* window band down both sides */
  const band = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 1.15, L * 2 - 2.2), MAT.glassDark);
  band.position.set(0, 2.42, -0.5); g.add(band);

  /* windscreen + destination sign */
  const screen = new THREE.Mesh(new THREE.BoxGeometry(W - 0.34, 1.6, 0.4), MAT.glassDark);
  screen.position.set(0, 2.32, L + 0.14); g.add(screen);
  const apron = new THREE.Mesh(new THREE.BoxGeometry(W - 0.16, 1.0, 0.34), MAT.busBlue);
  apron.position.set(0, 0.86, L + 0.12); g.add(apron);
  const dest = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.44),
    new THREE.MeshBasicMaterial({ map: signTex('AGT', '#14171c', '#ffd60a') }));
  dest.position.set(0, 3.12, L + 0.2); g.add(dest);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 1.1), MAT.busDeep);
  door.position.set(W / 2 + 0.02, 1.5, L - 2.2); g.add(door);

  for (const sx of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 4, 12), new THREE.MeshBasicMaterial({ color: 0xfff8d8 }));
    lamp.rotation.z = Math.PI / 2;
    lamp.position.set(sx * (W / 2 - 0.42), 1.42, L + 0.2); g.add(lamp);
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.2), MAT.slate);
    mirror.position.set(sx * (W / 2 + 0.14), 2.6, L - 0.2); g.add(mirror);
    for (const z of [L - 1.5, -L + 2.4, -L + 3.6]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.34, 20), MAT.tyre);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * (W / 2 - 0.1), 0.55, z);
      wheel.castShadow = true; g.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 14), MAT.chrome);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position); hub.position.x += sx * 0.02; g.add(hub);
    }
  }
  const ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 2.2), MAT.busLight);
  ac.position.set(0, H + 0.1, -1.2); g.add(ac);
  g.userData.len = L * 2;
  return g;
}

function makeCar(kind) {
  const g = new THREE.Group();
  const spec = {
    tesla:  { body: MAT.white,        w: 1.88, nose: 2.35, tail: -2.32, waist: 0.98, roof: 1.68, gf: 0.55, gr: -1.85 },
    bmw:    { body: MAT.red,          w: 1.84, nose: 2.3,  tail: -2.28, waist: 0.9,  roof: 1.46, gf: 0.35, gr: -1.95 },
    wagon:  { body: toon(0x6f8090),   w: 1.82, nose: 2.26, tail: -2.24, waist: 1.0,  roof: 1.7,  gf: 0.6,  gr: -2.0 }
  }[kind];
  const { nose, tail, waist, roof, gf, gr, w } = spec;

  const lower = extrudeBody([
    [nose, 0.44], [nose - 0.04, 0.82, 0.04, 0.04], [nose - 1.0, waist, 0, 0.08],
    [gr - 0.1, waist], [tail + 0.1, waist - 0.14, 0.04, 0], [tail, 0.5],
    [tail + 0.22, 0.26], [nose - 0.28, 0.26]
  ], w, spec.body);
  g.add(lower);

  const greenhouse = extrudeBody([
    [nose - 1.02, waist + 0.02], [gf, roof, 0.14, 0.02], [gr + 0.8, roof],
    [gr + 0.05, waist + 0.02, 0.05, 0.06]
  ], w - 0.12, MAT.glassDark, 0.05);
  g.add(greenhouse);

  const roofCap = extrudeBody([
    [gf - 0.04, roof + 0.01], [gr + 0.78, roof + 0.01], [gr + 0.78, roof - 0.16], [gf - 0.04, roof - 0.16]
  ], w - 0.2, spec.body, 0.05);
  g.add(roofCap);

  const grille = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 0.24, 0.16), MAT.slate);
  grille.position.set(0, 0.44, nose - 0.02); g.add(grille);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(w - 0.14, 0.2, 0.14), MAT.slate);
  bumper.position.set(0, 0.28, nose - 0.12); g.add(bumper);

  for (const sx of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.34, 4, 12), new THREE.MeshBasicMaterial({ color: 0xfff8d8 }));
    lamp.rotation.z = Math.PI / 2;
    lamp.position.set(sx * (w / 2 - 0.34), 0.78, nose - 0.16);
    g.add(lamp);
    const tailLamp = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 4, 10), new THREE.MeshBasicMaterial({ color: 0xd93b26 }));
    tailLamp.rotation.z = Math.PI / 2;
    tailLamp.position.set(sx * (w / 2 - 0.32), 0.88, tail + 0.08);
    g.add(tailLamp);
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), spec.body);
    mirror.scale.set(1, 0.7, 1.4);
    mirror.position.set(sx * (w / 2 + 0.04), waist + 0.16, gf + 0.35);
    g.add(mirror);
    for (const sz of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.3, 20), MAT.tyre);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sx * (w / 2 - 0.08), 0.44, sz * (nose - 1.2));
      wheel.castShadow = true;
      g.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.33, 16), MAT.chrome);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      hub.position.x += sx * 0.02;
      g.add(hub);
    }
  }
  g.userData.len = nose - tail;
  return g;
}

const carKinds = ['tesla', 'bmw', 'bus', 'wagon', 'tesla', 'bus'];
const startLanes = [-1, 1, 0, 1, -1, 0];
const cars = [];
for (let i = 0; i < 6; i++) {
  const kind = carKinds[i % carKinds.length];
  const c = kind === 'bus' ? makeBus() : makeCar(kind);
  c.userData.kind = kind;
  const lane = startLanes[i];
  c.position.set(lane * LANE_W, 0, -80 - i * 32);
  c.userData.lane = lane;
  c.userData.speed = kind === 'bus' ? 2 + Math.random() * 2 : 3 + Math.random() * 4;
  scene.add(c);
  cars.push(c);
}

/* place a recycled car so that at least one lane stays open in its window */
function respawnCar(c) {
  let z = Math.min(...cars.map(o => o.position.z)) - (26 + Math.random() * 14);
  let free = [];
  for (let attempt = 0; attempt < 4; attempt++) {
    const taken = cars.filter(o => o !== c && Math.abs(o.position.z - z) < 22).map(o => o.userData.lane);
    free = [-1, 0, 1].filter(l => !taken.includes(l));
    if (free.length >= 2) break;
    z -= 28;
  }
  const pick = free.length >= 2 ? free[Math.floor(Math.random() * (free.length - 1))] : (free[0] ?? 0);
  c.userData.lane = pick;
  c.position.set(pick * LANE_W, 0, z);
  c.userData.speed = c.userData.kind === 'bus' ? 2 + Math.random() * 2 : 3 + Math.random() * 4;
}

/* ---------- booster can ---------- */
const canTex = canvasTex(1024, 512, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#4c525a'); grd.addColorStop(0.5, '#33383e'); grd.addColorStop(1, '#22262b');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2; i++) {
    const ox = i * (w / 2);
    g.fillStyle = '#f2600c';
    g.beginPath();
    g.moveTo(ox + 40, 300); g.lineTo(ox + 470, 236); g.lineTo(ox + 470, 300); g.lineTo(ox + 40, 364);
    g.closePath(); g.fill();
    g.beginPath();
    g.moveTo(ox + 40, 392); g.lineTo(ox + 470, 328); g.lineTo(ox + 470, 384); g.lineTo(ox + 40, 448);
    g.closePath(); g.fill();
    g.fillStyle = '#ffffff';
    g.font = "800 132px 'Baloo 2', Nunito, sans-serif";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('NOCCO', ox + w / 4, 140);
    g.fillStyle = '#12151a';
    g.font = '900 62px Nunito, sans-serif';
    g.fillText('FOCUS', ox + w / 4, 218);
    g.fillStyle = '#ffffff';
    g.font = '800 40px Nunito, sans-serif';
    g.fillText('KOFFEIINI 180 mg', ox + w / 4, 478);
  }
});
function makeCan() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.52, 28, 1, true), toon(0xffffff, { map: canTex }));
  body.position.y = 0; body.castShadow = true; g.add(body);
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.07, 28), toon(0x2b2f35));
  shoulder.position.y = 0.295; g.add(shoulder);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.035, 28), MAT.chrome);
  lid.position.y = 0.345; g.add(lid);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.05, 28), toon(0x23272c));
  foot.position.y = -0.28; g.add(foot);
  return g;
}
const cans = [];
for (let i = 0; i < 3; i++) {
  const tilt = new THREE.Group();
  tilt.rotation.z = 0.52;                       /* ~30 asteen kallistus */
  const can = makeCan();
  can.scale.setScalar(1.45);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 24), new THREE.MeshBasicMaterial({ color: 0xf2600c }));
  halo.rotation.x = Math.PI / 2;
  tilt.add(can, halo);
  tilt.position.set(((i * 2) % 3 - 1) * LANE_W, 1.15, -60 - i * 120);
  tilt.userData.spin = can;
  scene.add(tilt);
  cans.push(tilt);
}

/* ---------- coins ---------- */
const coinGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 18);
const coins = [];
for (let i = 0; i < 26; i++) {
  const c = new THREE.Mesh(coinGeo, MAT.gold);
  c.rotation.x = Math.PI / 2;
  c.position.set(((i % 3) - 1) * LANE_W, 1.1, -8 - i * 5);
  c.castShadow = true;
  scene.add(c);
  coins.push(c);
}

/* ---------- state ---------- */
const S = {
  started: false, over: false, speed: 16, dist: 0, score: 0, coins: 0,
  lane: 0, laneX: 0, y: 0, vy: 0, jumping: false, t: 0, shake: 0, gap: 12.5, boost: 0
};

const ui = {
  score: document.getElementById('score'),
  coins: document.getElementById('coins'),
  meters: document.getElementById('meters'),
  bar: document.getElementById('bar'),
  gap: document.getElementById('gap'),
  boost: document.getElementById('boost'),
  intro: document.getElementById('intro'),
  over: document.getElementById('over'),
  overText: document.getElementById('overText')
};

function start() {
  cars.forEach((c, i) => { if (c.position.z > -60) { c.userData.lane = startLanes[i]; c.position.set(startLanes[i] * LANE_W, 0, -80 - i * 32); } });
  ui.intro.style.opacity = '0';
  ui.intro.style.pointerEvents = 'none';
  S.started = true;
}
function reset() {
  S.over = false; S.speed = 16; S.dist = 0; S.score = 0; S.coins = 0;
  S.lane = 0; S.laneX = 0; S.gap = 12.5; S.boost = 0;
  cans.forEach((c, i) => { c.position.z = -60 - i * 120; c.visible = true; }); S.y = 0; S.vy = 0;
  cars.forEach((c, i) => { c.userData.lane = startLanes[i]; c.position.set(startLanes[i] * LANE_W, 0, -80 - i * 32); });
  coins.forEach((c, i) => { c.position.z = -8 - i * 5; c.visible = true; });
  ui.over.style.opacity = '0'; ui.over.style.pointerEvents = 'none';
  S.started = true;
}

function move(dir) {
  if (!S.started || S.over) return;
  S.lane = Math.max(-1, Math.min(1, S.lane + dir));
}
function jump() {
  if (!S.started || S.over || S.jumping) return;
  S.jumping = true; S.vy = 9.2;
}

addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') move(-1);
  else if (e.key === 'ArrowRight' || e.key === 'd') move(1);
  else if (e.key === 'ArrowUp' || e.key === ' ' || e.key === 'w') { e.preventDefault(); if (!S.started) start(); else if (S.over) reset(); else jump(); }
  else if (e.key === 'Enter') { if (!S.started) start(); else if (S.over) reset(); }
});

let touch = null;
host.addEventListener('pointerdown', e => { touch = { x: e.clientX, y: e.clientY, t: performance.now() }; });
host.addEventListener('pointerup', e => {
  if (!touch) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  const tap = Math.abs(dx) < 22 && Math.abs(dy) < 22;
  if (tap) { if (!S.started) start(); else if (S.over) reset(); else jump(); }
  else if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else if (dy < 0) jump();
  touch = null;
});

/* ---------- loop ---------- */
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);
resize();

function recycle(arr, len, s) {
  for (const b of arr) {
    if (b.position.z > 26) b.position.z -= len;
  }
}

const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  S.t += dt;

  if (S.started && !S.over) {
    S.speed = Math.min(31, S.speed + dt * 0.4);
    if (S.boost > 0) S.boost = Math.max(0, S.boost - dt);
    S.dist += S.speed * dt;
    S.score += S.speed * dt * 3;
    S.gap = Math.max(10.6, S.gap - dt * 0.06);
  }
  const v = S.started && !S.over ? S.speed * (S.boost > 0 ? 1.5 : 1) : 0;

  /* scroll world */
  for (const b of sides[0]) b.position.z += v * dt;
  for (const b of sides[1]) b.position.z += v * dt;
  recycle(sides[0], POOL * SPACING);
  recycle(sides[1], POOL * SPACING);
  for (const t of trees) { t.position.z += v * dt; if (t.position.z > 26) t.position.z -= 6 * 26; }
  for (const d of dashes) { d.position.z += v * dt; if (d.position.z > 12) d.position.z -= 46 * 6; }

  /* cars come toward the camera */
  for (const c of cars) {
    c.position.z += (v + c.userData.speed) * dt;
    if (c.position.z > 22) respawnCar(c);
  }

  /* booster cans: spin like a tilted coin */
  for (const t of cans) {
    t.position.z += v * dt;
    t.userData.spin.rotation.y += dt * 5.2;
    if (t.position.z > 16) { t.position.z -= 360; t.visible = true; t.position.x = (Math.floor(Math.random() * 3) - 1) * LANE_W; }
    if (t.visible && Math.abs(t.position.z) < 1.4 && Math.abs(t.position.x - S.laneX) < 1.1 && S.y < 1.8) {
      t.visible = false; S.boost = 4; S.score += 150;
    }
  }

  /* coins */
  for (const c of coins) {
    c.position.z += v * dt;
    c.rotation.z += dt * 4;
    if (c.position.z > 14) { c.position.z -= 26 * 5; c.visible = true; c.position.x = (Math.floor(Math.random() * 3) - 1) * LANE_W; }
    if (c.visible && Math.abs(c.position.z) < 1.2 && Math.abs(c.position.x - S.laneX) < 1.0 && S.y < 1.6) {
      c.visible = false; S.coins += S.boost > 0 ? 2 : 1; S.score += S.boost > 0 ? 50 : 25;
    }
  }

  /* player */
  S.laneX += (S.lane * LANE_W - S.laneX) * Math.min(1, dt * 12);
  if (S.jumping) {
    S.vy -= 26 * dt; S.y += S.vy * dt;
    if (S.y <= 0) { S.y = 0; S.vy = 0; S.jumping = false; }
  }
  const runPhase = S.t * (S.started && !S.over ? 13 : 5);
  const swing = Math.sin(runPhase);
  liina.group.position.set(S.laneX, S.y, 0);
  liina.group.rotation.z = (S.lane * LANE_W - S.laneX) * -0.06;
  liina.legs[0].rotation.x = swing * 1.05;
  liina.legs[1].rotation.x = -swing * 1.05;
  liina.arms[0].rotation.x = -swing * 0.95;
  liina.arms[1].rotation.x = swing * 0.95;
  liina.group.position.y += Math.abs(Math.cos(runPhase)) * 0.07;

  const tSwing = Math.sin(runPhase * 0.92 + 1.2);
  tervis.group.position.z = S.over ? Math.max(3.4, tervis.group.position.z - dt * 5) : S.gap;
  tervis.group.position.x += ((S.laneX * 0.7) - tervis.group.position.x) * Math.min(1, dt * 3);
  tervis.legs[0].rotation.x = tSwing * 1.0;
  tervis.legs[1].rotation.x = -tSwing * 1.0;
  tervis.arms[0].rotation.x = -tSwing * 0.8;
  tervis.arms[1].rotation.x = tSwing * 0.5;
  tervis.group.position.y = Math.abs(Math.cos(runPhase * 0.92)) * 0.06;

  /* collisions */
  if (S.started && !S.over) {
    for (const c of cars) {
      if (Math.abs(c.position.z) < (c.userData.len || 4.6) / 2 + 0.5 && Math.abs(c.position.x - S.laneX) < 1.2 && S.y < 1.5) {
        S.over = true; S.shake = 0.5;
        ui.over.style.opacity = '1'; ui.over.style.pointerEvents = 'auto';
        ui.overText.textContent = 'Tervis sai kiinni · ' + Math.round(S.dist) + '\u00a0m';
        break;
      }
    }
  }

  /* goal shimmer */
  mascot.userData.door.material.color.setHSL(0.13, 1, 0.62 + Math.sin(S.t * 3) * 0.08);
  mascot.position.x = Math.sin(S.t * 0.5) * 0.6;

  /* camera */
  const camTarget = S.started
    ? new THREE.Vector3(S.laneX * 0.3, 4.2 + S.y * 0.25, 9.8)
    : new THREE.Vector3(2.6, 5.2, -15);
  camera.position.lerp(camTarget, Math.min(1, dt * 2.4));
  const look = S.started
    ? new THREE.Vector3(S.laneX * 0.18, 1.4 + S.y * 0.45, -12)
    : new THREE.Vector3(0, 5.2, 14);
  if (S.shake > 0) {
    S.shake -= dt;
    look.x += (Math.random() - 0.5) * 0.6;
    look.y += (Math.random() - 0.5) * 0.4;
  }
  camera.lookAt(look);
  sun.position.set(S.laneX + 9, 16, 8);
  sun.target.position.set(S.laneX, 0, -4);
  sun.target.updateMatrixWorld();

  /* hud */
  if (ui.score) {
    ui.score.textContent = Math.round(S.score).toLocaleString('fi-FI');
    ui.coins.textContent = S.coins;
    const left = Math.max(0, 900 - Math.round(S.dist));
    ui.meters.textContent = left + ' m → MASCOT';
    ui.bar.style.width = Math.min(100, (S.dist / 900) * 100) + '%';
    if (ui.boost) {
      ui.boost.textContent = S.boost > 0 ? 'BOOST ' + S.boost.toFixed(1) + ' s' : 'x1';
      ui.boost.style.background = S.boost > 0 ? '#f2600c' : '#ffd60a';
      ui.boost.style.color = S.boost > 0 ? '#fff' : '#12305e';
    }
    if (ui.gap) ui.gap.textContent = (S.over ? 0 : Math.round((S.gap - 10.5) * 10) / 10 + 2) + ' s';
  }

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
scene.add(sun.target);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => texRegistry.forEach(f => f()));
window.__liina = { camera, scene, S, museo, mascot, liina, tervis, cars, cans, coins };
tick();
