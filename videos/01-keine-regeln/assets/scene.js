// Szene: "Mal angenommen … es gibt keine Regeln mehr" (Purge-Nacht in einer Low-Poly-Kleinstadt)
import * as THREE from "three";
import * as K from "./lowpoly-kit.js";

const W = 1080, H = 1920;
const C = JSON.parse(document.getElementById("cues").textContent);
const canvas = document.getElementById("three-layer");
const hudNum = document.getElementById("hud-num");
const hudSub = document.getElementById("hud-sub");

const renderer = K.createRenderer(canvas, W, H);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#eab08f", 140, 620);
const camera = new THREE.PerspectiveCamera(55, W / H, 0.3, 2000);
const sky = K.createSky();
scene.add(sky.mesh);
const lights = K.createLights(scene);
const rand = K.mulberry32(1907);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- Stimmungen ----------
const DUSK = {
  top: "#5b6fae", horizon: "#ffb27e", bottom: "#6a8a55", fog: "#f4b88f", fogNear: 150, fogFar: 640,
  sun: "#ffc596", sunI: 2.6, hemiSky: "#ffe2c4", hemiGround: "#4a6a3a", hemiI: 1.25, sunDir: [-0.5, 0.3, -0.81], sunGlow: 1,
};
const PURGE = {
  top: "#0d0610", horizon: "#8a1a2a", bottom: "#1c0b12", fog: "#3a1019", fogNear: 40, fogFar: 300,
  sun: "#ff8a78", sunI: 0.55, hemiSky: "#8a3e5c", hemiGround: "#1d0f16", hemiI: 0.75, sunDir: [0.35, 0.62, -0.7], sunGlow: 0,
};
const DAWN = {
  top: "#6c88c6", horizon: "#ffc7a0", bottom: "#6a8a55", fog: "#f7c8a6", fogNear: 130, fogFar: 620,
  sun: "#ffd9b2", sunI: 2.3, hemiSky: "#ffe8d2", hemiGround: "#4c6c40", hemiI: 1.15, sunDir: [0.62, 0.16, -0.77], sunGlow: 1,
};
const MOOD = [
  [0, DUSK], [C.sirenOn, DUSK], [C.sirenOn + 1.4, PURGE],
  [C.dawnStart, PURGE], [C.dawnStart + 1.6, DAWN], [30, DAWN],
];

// ---------- Boden & Straßen ----------
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), K.lambert("#66ad44"));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function slab(x, z, sx, sz, color, y = 0.02, h = 0.04) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), K.lambert(color));
  m.position.set(x, y, z);
  m.receiveShadow = true;
  scene.add(m);
  return m;
}
const ROAD = "#53565c", WALK = "#d3d1c8";
const NS = [-180, -120, -60, 0, 60, 120, 180];
const EW = [-200, -120, 20, 100];
const SEGMENTS = [[-300, -205], [-195, -125], [-115, 15], [25, 95], [105, 230]];
NS.forEach((x) => {
  slab(x, -35, 10, 530, ROAD);
  SEGMENTS.forEach(([a, b]) => {
    slab(x - 6.5, (a + b) / 2, 3, b - a, WALK, 0.04, 0.08);
    slab(x + 6.5, (a + b) / 2, 3, b - a, WALK, 0.04, 0.08);
  });
});
EW.forEach((z) => slab(0, z, 540, 10, ROAD, 0.025));
SEGMENTS.forEach(([a, b]) => {
  for (let z = a + 3; z < b - 3; z += 7) slab(0, z, 0.25, 2.8, "#efeee6", 0.05, 0.02);
});

// ---------- Häuser ----------
const field = new K.HouseField();
const WALLS = ["#ece6d8", "#e2d5bd", "#d3d1cc", "#efe0c6", "#cfd8db", "#e8d9cf"];
const ROOFS = ["#c4553b", "#c4553b", "#8a909a", "#b5492f", "#7f858f"];
const inCross = (z, pad = 10) => EW.some((e) => Math.abs(z - e) < pad);

// Wohnstraße an der Hauptstraße
for (let z = -28; z >= -112; z -= 12) {
  field.add(-13, z, { w: 8, d: 8, facing: "x+", wall: pick(WALLS), roof: pick(ROOFS), data: { row: "L" } });
  field.add(13, z, { w: 8, d: 8, facing: "x-", wall: pick(WALLS), roof: pick(ROOFS), data: { row: "R" } });
}
// Hauptstraße Nord
for (let z = 50; z <= 210; z += 13) {
  if (inCross(z)) continue;
  field.add(-13, z, { w: 8, d: 8, facing: "x+", wall: pick(WALLS), roof: pick(ROOFS) });
  field.add(13, z, { w: 8, d: 8, facing: "x-", wall: pick(WALLS), roof: pick(ROOFS) });
}
// Hauptstraße Süd (hinter dem Supermarkt)
for (let z = -160; z >= -290; z -= 13) {
  if (inCross(z)) continue;
  field.add(-13, z, { w: 8, d: 8, facing: "x+", wall: pick(WALLS), roof: pick(ROOFS) });
  field.add(13, z, { w: 8, d: 8, facing: "x-", wall: pick(WALLS), roof: pick(ROOFS) });
}
// Raster der übrigen Straßen
const treeSpots = [];
NS.filter((x) => x !== 0).forEach((sx) => {
  for (let z = -290; z <= 220; z += 13) {
    if (inCross(z)) continue;
    for (const side of [-1, 1]) {
      if (rand() < 0.12) continue;
      const hx = sx + side * 13;
      field.add(hx, z, { w: 8, d: 8, facing: side < 0 ? "x+" : "x-", wall: pick(WALLS), roof: pick(ROOFS) });
      if (rand() < 0.55) treeSpots.push([hx + side * (8 + rand() * 6), z + (rand() - 0.5) * 6, 0.8 + rand() * 0.5]);
    }
  }
});
for (let z = -112; z <= -28; z += 6) {
  for (const side of [-1, 1]) if (rand() < 0.6) treeSpots.push([side * (22 + rand() * 7), z, 0.8 + rand() * 0.5]);
}
K.addTrees(scene, treeSpots);

// Nachbarhaus (links, z = -40): Fenster k = 0 bleibt an
let neighborWin = null;
field.windows.forEach((w) => {
  w.litDusk = rand() < 0.7;
  if (w.house.data.row) {
    const along = K.clamp((-28 - w.z) / 90);
    w.tOff = K.lerp(C.shutterStart, C.shutterEnd, along) + rand() * 0.25;
  } else {
    w.tOff = C.sirenOn + 1.4 + rand() * (C.shutterEnd - C.sirenOn - 1.4);
  }
  if (w.house.data.row === "L" && w.house.z === -40 && w.k === 0) neighborWin = w;
});
neighborWin.neighbor = true;
neighborWin.litDusk = true;
field.build(scene);

// ---------- Polizeiwache ----------
const policeSignMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
const policeLights = [];
function box(sx, sy, sz, color, x, y, z, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), K.lambert(color));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function plane(w, h, mat, x, y, z, rotY) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  scene.add(m);
  return m;
}
function makeCar(color, { police = false, burnt = false } = {}) {
  const g = new THREE.Group();
  box(2.0, 0.8, 4.4, burnt ? "#2a2626" : color, 0, 0.62, 0, g);
  box(1.8, 0.72, 2.3, burnt ? "#1c1a1a" : "#2d3642", 0, 1.38, -0.2, g);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const wh = new THREE.Mesh(wheelGeo, K.lambert("#1d1d1f"));
    wh.position.set(x, 0.36, z);
    g.add(wh);
  }
  if (police) {
    box(2.04, 0.2, 4.0, "#2a5bd7", 0, 0.72, 0, g);
    for (const [x, col] of [[-0.35, "#2d6bff"], [0.35, "#ff2a2a"]]) {
      const mat = new THREE.MeshBasicMaterial({ color: col });
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.38), mat);
      lamp.position.set(x, 1.84, -0.2);
      g.add(lamp);
      const glow = K.makeGlow(col, 3.4);
      glow.position.set(x, 1.9, -0.2);
      g.add(glow);
      policeLights.push({ mat, glow, base: new THREE.Color(col), side: x < 0 ? 0 : 1 });
    }
  }
  return g;
}
box(12, 7, 14, "#e9edf2", -19, 3.5, 33);
box(12.2, 0.9, 14.2, "#2a5bd7", -19, 6.4, 33);
box(12.5, 0.4, 14.5, "#b9c0c9", -19, 7.2, 33);
slab(-10.5, 33, 5, 16, "#c9c7bf", 0.05, 0.1);
plane(7, 1.6, policeSignMat, -12.94, 5.0, 33, Math.PI / 2);
plane(3, 2.6, K.basic("#2b3440"), -12.94, 1.3, 33, Math.PI / 2);
const stationWinMat = new THREE.MeshBasicMaterial({ color: "#ffe2a8" });
for (const z of [28, 30.5, 35.5, 38]) plane(1.6, 1.3, stationWinMat, -12.94, 2.8, z, Math.PI / 2);
for (const z of [29.2, 35.8]) {
  const car = makeCar("#f2f2f2", { police: true });
  car.position.set(-10.3, 0.1, z);
  scene.add(car);
}

// ---------- Sirene ----------
const siren = new THREE.Group();
siren.position.set(7, 0, 8);
scene.add(siren);
box(0.5, 14, 0.5, "#8d939b", 0, 7, 0, siren);
box(1.5, 1.3, 1.5, "#c9ced6", 0, 14.4, 0, siren);
const hornGeo = new THREE.ConeGeometry(0.85, 2.0, 12, 1, true);
for (const s of [-1, 1]) {
  const horn = new THREE.Mesh(hornGeo, K.lambert("#d8dde3", { side: THREE.DoubleSide }));
  horn.rotation.z = (s * Math.PI) / 2;
  horn.position.set(s * 1.65, 14.4, 0);
  siren.add(horn);
}
const sirenLampMat = new THREE.MeshBasicMaterial({ color: "#5a1414" });
const sirenLamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), sirenLampMat);
sirenLamp.position.set(0, 15.4, 0);
siren.add(sirenLamp);
const sirenGlow = K.makeGlow("#ff2a2a", 7);
sirenGlow.position.set(0, 15.4, 0);
siren.add(sirenGlow);
const rings = Array.from({ length: 4 }, () => {
  const r = new THREE.Mesh(new THREE.RingGeometry(0.92, 1.0, 72),
    new THREE.MeshBasicMaterial({ color: "#ff3030", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  r.position.set(7, 14.4, 8);
  scene.add(r);
  return r;
});

// ---------- Supermarkt ----------
box(16, 7, 22, "#e4e1d8", 24, 3.5, -134);
box(16.3, 0.5, 22.3, "#2d6a4f", 24, 7.1, -134);
slab(12, -134, 8, 24, "#c9c7bf", 0.05, 0.1);
plane(12, 2.2, new THREE.MeshBasicMaterial({ color: "#ffffff" }), 15.93, 5.75, -134, -Math.PI / 2).userData.sign = true;
const shelvesTex = K.canvasTexture(1024, 256, (g, w, h) => {
  const r = K.mulberry32(77);
  g.fillStyle = "#fff1d6";
  g.fillRect(0, 0, w, h);
  for (let row = 0; row < 3; row++) {
    const y = 40 + row * 70;
    g.fillStyle = "#8b8f96";
    g.fillRect(0, y + 52, w, 8);
    for (let x = 6; x < w - 20; x += 14 + Math.floor(r() * 10)) {
      g.fillStyle = ["#e74c3c", "#f1c40f", "#3498db", "#2ecc71", "#e67e22", "#9b59b6"][Math.floor(r() * 6)];
      const hh = 28 + r() * 22;
      g.fillRect(x, y + 52 - hh, 10 + r() * 8, hh);
    }
  }
});
const interiorMat = new THREE.MeshBasicMaterial({ map: shelvesTex, color: "#ffffff" });
plane(16, 3.6, interiorMat, 15.97, 2.1, -134, -Math.PI / 2);
const glassMat = new THREE.MeshBasicMaterial({ color: "#bfe8ff", transparent: true, opacity: 0.38, depthWrite: false });
const glass = plane(16, 3.6, glassMat, 15.9, 2.1, -134, -Math.PI / 2);
for (const z of [-142, -138, -134, -130, -126]) box(0.12, 3.7, 0.18, "#3b3f45", 15.86, 2.1, z);
box(0.14, 0.18, 16.2, "#3b3f45", 15.86, 3.95, -134);
const glassFlash = K.makeGlow("#dff6ff", 16);
glassFlash.position.set(15.5, 2.2, -134);
scene.add(glassFlash);

const SHARDS = 190;
const shardGeo = new THREE.BufferGeometry();
shardGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.28, -0.2, 0, 0.3, -0.12, 0, 0.02, 0.34, 0], 3));
const shards = new THREE.InstancedMesh(shardGeo, new THREE.MeshBasicMaterial({ color: "#dcf4ff", transparent: true, opacity: 0.9, side: THREE.DoubleSide }), SHARDS);
shards.frustumCulled = false;
scene.add(shards);
const shardData = Array.from({ length: SHARDS }, () => ({
  p: [15.85, 0.35 + rand() * 3.5, -141.5 + rand() * 15],
  v: [-(3 + rand() * 10), 0.5 + rand() * 5.5, (rand() - 0.5) * 7],
  spin: [rand() * 14 - 7, rand() * 14 - 7, rand() * 14 - 7],
  rot: [rand() * 6, rand() * 6, rand() * 6],
  s: 0.35 + rand() * 0.95,
}));

// ---------- Ampeln ----------
const trafficLights = [];
for (const x of [-6.6]) {
  box(0.24, 5, 0.24, "#5c6168", x, 2.5, -113.5);
  box(0.6, 1.6, 0.5, "#2a2d31", x, 5.6, -113.5);
  const lamps = {};
  for (const [name, y, col] of [["r", 6.1, "#ff3b30"], ["y", 5.6, "#ffc21a"], ["g", 5.1, "#38e07b"]]) {
    const mat = new THREE.MeshBasicMaterial({ color: col });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.19, 16), mat);
    disc.position.set(x, y, -113.24);
    scene.add(disc);
    const glow = K.makeGlow(col, 2.6);
    glow.position.set(x, y, -113.1);
    scene.add(glow);
    lamps[name] = { mat, glow, base: new THREE.Color(col) };
  }
  trafficLights.push(lamps);
}

// ---------- Straßenlaternen ----------
const lamps = [];
for (let z = -250; z <= 160; z += 24) {
  if (inCross(z, 16)) continue;
  for (const x of [-7.4, 7.4]) {
    if (x < 0 && z > 20 && z < 46) continue; // freie Sicht auf die Polizeiwache
    box(0.18, 6, 0.18, "#6b7078", x, 3, z);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshBasicMaterial({ color: "#fff0c8" }));
    bulb.position.set(x * 0.9, 6.05, z);
    scene.add(bulb);
    const glow = K.makeGlow("#ffd59a", 4.2);
    glow.position.copy(bulb.position);
    scene.add(glow);
    lamps.push({ bulb, glow, flick: rand() < 0.3, ph: rand() * 50 });
  }
}

// ---------- Autos ----------
const CAR_COLORS = ["#c0392b", "#2e86de", "#f1c40f", "#95a5a6", "#ecf0f1", "#16a085", "#e67e22"];
for (const [x, z, rot] of [[3.6, -46, 0], [-3.6, -61, Math.PI], [3.6, -58, 0], [-3.6, -96, Math.PI], [3.6, 58, 0], [-3.6, 82, Math.PI], [3.6, -170, 0]]) {
  const car = makeCar(pick(CAR_COLORS));
  car.position.set(x, 0.05, z);
  car.rotation.y = rot;
  scene.add(car);
}
const burnt = makeCar("#333333", { burnt: true });
burnt.position.set(-1.2, 0.05, -104);
burnt.rotation.y = 0.5;
scene.add(burnt);
const fire = Array.from({ length: 9 }, (_, i) => {
  const s = K.makeGlow(i % 3 === 0 ? "#ffd04a" : "#ff6a1a", 2.4);
  scene.add(s);
  return { s, ox: (rand() - 0.5) * 1.8, oz: (rand() - 0.5) * 3, ph: rand() * 20 };
});
const fireLight = new THREE.PointLight("#ff7a2a", 0, 30, 1.4);
fireLight.position.set(-1.2, 2.5, -104);
scene.add(fireLight);

// ---------- Figuren ----------
const bystanders = Array.from({ length: 26 }, () => {
  const p = K.makePerson({ body: pick(["#c0392b", "#2e86de", "#16a085", "#8e44ad", "#d35400", "#2c3e50", "#f39c12"]) });
  const x = (rand() < 0.5 ? -1 : 1) * (5.6 + rand() * 1.6);
  scene.add(p);
  return { p, x, z0: -10 + rand() * 75, dir: rand() < 0.5 ? -1 : 1, sp: 0.6 + rand() * 0.8, ph: rand() * 10 };
});

const purgers = [[-2.6, 0], [-0.8, 1.8], [1.1, -0.6], [2.8, 2.4], [-1.9, 4.2], [0.4, 5.6], [2.4, 6.9]].map(([ox, oz], i) => {
  const p = K.makePerson({ body: pick(["#16161b", "#22202a", "#2b2630"]), mask: true });
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.38, 6), K.basic("#ff3b2f"));
  flare.position.set(0.4, 1.05, 0.18);
  p.add(flare);
  const glow = K.makeGlow("#ff3322", 2.6);
  glow.position.set(0.4, 1.25, 0.18);
  p.add(glow);
  let light = null;
  if (i % 2 === 0) {
    light = new THREE.PointLight("#ff2a1a", 0, 18, 1.5);
    light.position.set(0.4, 1.3, 0.3);
    p.add(light);
  }
  scene.add(p);
  return { p, ox, oz, glow, light, ph: rand() * 10 };
});
const looters = [[12, -128], [13.2, -137], [10.8, -141]].map(([x, z], i) => {
  const p = K.makePerson({ body: "#1c1b22", mask: true });
  p.position.set(x, 0.1, z);
  p.rotation.y = Math.PI / 2;
  if (i === 1) {
    const glow = K.makeGlow("#ff3322", 2.6);
    glow.position.set(0.4, 1.25, 0.18);
    p.add(glow);
  }
  scene.add(p);
  return { p, ph: rand() * 10 };
});

// Nachbarfenster: warmes Licht + Vorhang, dahinter taucht eine Gestalt auf, davor das Fensterkreuz
const NW = field.winW * 1.25, NH = field.winH * 1.3;
const layer = (tex, off, opacity = 1) => {
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false });
  plane(NW, NH, mat, neighborWin.x + off, neighborWin.y, neighborWin.z, Math.PI / 2);
  return mat;
};
const TW = 320, TH = 330;
layer(K.canvasTexture(TW, TH, (g, w, h) => {
  const grd = g.createRadialGradient(w * 0.58, h * 0.25, 10, w * 0.5, h * 0.45, w * 0.8);
  grd.addColorStop(0, "#fff1c4");
  grd.addColorStop(0.5, "#ffc96e");
  grd.addColorStop(1, "#c9762f");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  // Vorhang links mit Falten
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? "#b4582a" : "#9c4723";
    g.fillRect(i * 13, 0, 14, h);
  }
  g.fillStyle = "rgba(90,30,10,0.35)";
  g.fillRect(78, 0, 8, h);
}), 0.05);
const silMat = layer(K.canvasTexture(TW, TH, (g, w, h) => {
  g.fillStyle = "#0c0a0c";
  g.beginPath(); // Kopf leicht oval, etwas nach rechts versetzt
  g.ellipse(w * 0.6, h * 0.36, 34, 41, 0.08, 0, Math.PI * 2);
  g.fill();
  g.fillRect(w * 0.6 - 14, h * 0.45, 28, 26); // Hals
  g.beginPath(); // Schultern, unten vom Fensterrahmen abgeschnitten
  g.moveTo(w * 0.27, h);
  g.bezierCurveTo(w * 0.29, h * 0.68, w * 0.4, h * 0.56, w * 0.6, h * 0.55);
  g.bezierCurveTo(w * 0.8, h * 0.56, w * 0.93, h * 0.68, w * 0.95, h);
  g.closePath();
  g.fill();
}), 0.06, 0);
layer(K.canvasTexture(TW, TH, (g, w, h) => {
  g.strokeStyle = "#f3efe6";
  g.lineWidth = 14;
  g.strokeRect(7, 7, w - 14, h - 14);
  g.lineWidth = 10;
  g.beginPath();
  g.moveTo(w / 2, 0); g.lineTo(w / 2, h);
  g.moveTo(0, h * 0.42); g.lineTo(w, h * 0.42);
  g.stroke();
}), 0.07);

// ---------- Kamera ----------
const rig = new K.CameraRig([
  { t0: 0, t1: 3.3, from: { pos: [60, 70, 130], tgt: [-20, 0, -40] }, to: { pos: [22, 30, 76], tgt: [-15, 3, 33] }, lift: 4 },
  { t0: 3.7, t1: 6.25, from: { pos: [10, 9.5, 54], tgt: [-15, 3.2, 33] }, to: { pos: [6, 8, 48], tgt: [-16, 3.6, 32.5] }, lift: 3 },
  { t0: 6.6, t1: 8.65, from: { pos: [21, 2.2, 24], tgt: [7, 12, 8] }, to: { pos: [19, 2.6, 21], tgt: [7, 13.5, 8] }, fov: 60 },
  { t0: 8.75, t1: 11.95, from: { pos: [0, 26, 2], tgt: [0, 2, -70] }, to: { pos: [-2.5, 4.2, -33], tgt: [11, 2.4, -50] } },
  { t0: 12.05, t1: 14.62, from: { pos: [2.6, 1.9, -76], tgt: [0, 1.7, -108] }, to: { pos: [2.2, 1.85, -79], tgt: [0, 1.7, -110] } },
  {
    t0: 14.7, t1: 17.3,
    fn: (t, u) => {
      const e = K.easeInOutSine(u);
      const pan = K.ramp(t, C.panToMarket, C.panToMarket + 0.55);
      const a = [-6.6, 5.4, -113.5], b = [16, 2.6, -134];
      const shake = t > C.glass ? 0.22 * Math.exp(-(t - C.glass) * 5) : 0;
      return {
        pos: [K.lerp(1.0, 2.5, e) + Math.sin(t * 61) * shake, K.lerp(5.0, 4.4, e) + Math.sin(t * 47) * shake, K.lerp(-106, -111, e)],
        tgt: a.map((v, i) => K.lerp(v, b[i], pan)),
      };
    },
  },
  { t0: 17.38, t1: 19.33, from: { pos: [3, 2.4, -72], tgt: [0, 1.6, -95] }, to: { pos: [5, 15, -60], tgt: [0, 0.5, -98] } },
  { t0: 19.4, t1: 22.45, from: { pos: [7.5, 3.2, -37.9], tgt: [-9, 2.6, -37.84] }, to: { pos: [0.5, 2.95, -37.88], tgt: [-9, 2.75, -37.84] }, fov: 50 },
  { t0: 22.5, t1: 24.55, from: { pos: [4, 24, -48], tgt: [0, 0, -75] }, to: { pos: [40, 80, 40], tgt: [-5, 0, -50] } },
  { t0: 24.55, t1: 30, from: { pos: [40, 80, 40], tgt: [-5, 0, -50] }, to: { pos: [52, 88, 58], tgt: [-8, 0, -46] } },
]);

// ---------- Pro-Frame-Update ----------
const sirenActive = (t) => (t >= C.sirenOn && t < C.sirenOn + 3.4) || (t >= C.sirenEndOn && t < C.sirenEndOff);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
const night = (t) => K.ramp(t, C.sirenOn, C.sirenOn + 1.4) * (1 - K.ramp(t, C.dawnStart, C.dawnStart + 1.6));

function updateWorld(t) {
  const n = night(t);

  // Polizei: Blaulicht blinkt, bis die Wache "außer Dienst" geht
  const policeOn = t < C.policeOff;
  policeLights.forEach((l) => {
    const flash = policeOn && Math.floor(t * 7 + l.side) % 2 === 0 ? 1 : 0;
    l.mat.color.copy(l.base).multiplyScalar(0.25 + 0.75 * flash);
    l.glow.material.opacity = flash;
  });
  const signOn = 1 - K.ramp(t, C.policeOff, C.policeOff + 0.35);
  policeSignMat.color.setScalar(0.22 + 0.78 * signOn);
  stationWinMat.color.set("#ffe2a8").multiplyScalar(0.12 + 0.88 * signOn);

  // Sirene
  const act = sirenActive(t);
  const pulse = act ? 0.5 + 0.5 * Math.sin(t * 9) : 0;
  sirenLampMat.color.set("#ff2a2a").multiplyScalar(0.25 + 0.75 * pulse);
  sirenGlow.material.opacity = pulse;
  rings.forEach((r, i) => {
    const start = t >= C.sirenEndOn ? C.sirenEndOn : C.sirenOn;
    const ph = (((t - start) / 1.1 + i / rings.length) % 1 + 1) % 1;
    r.material.opacity = act ? (1 - ph) * 0.75 : 0;
    r.scale.setScalar(1 + ph * 18);
    r.quaternion.copy(camera.quaternion);
  });

  // Fenster & Rollläden
  field.update(t, (w, tt) => {
    if (w.neighbor) return { light: 0, shutter: 0 };
    const sh = K.ramp(tt, w.tOff, w.tOff + 0.35);
    return { light: w.litDusk ? 1 : 0.15, shutter: sh };
  });

  // Ampeln: erst grün, nach der Sirene nur noch gelbes Blinken
  const chaos = t > C.sirenOn + 0.5;
  trafficLights.forEach((tl) => {
    const blink = chaos && Math.floor(t * 1.8) % 2 === 0 ? 1 : 0;
    const set = (lamp, on) => { lamp.mat.color.copy(lamp.base).multiplyScalar(0.12 + 0.88 * on); lamp.glow.material.opacity = on; };
    set(tl.r, 0);
    set(tl.y, chaos ? blink : 0);
    set(tl.g, chaos ? 0 : 1);
  });

  // Laternen: an ab Dämmerung, flackern in der Nacht, aus im Morgengrauen
  const lampOn = K.ramp(t, 4.5, 6.0) * (1 - K.ramp(t, C.dawnStart + 0.6, C.dawnStart + 1.8));
  lamps.forEach((l) => {
    let f = lampOn;
    if (l.flick && n > 0.5) f *= Math.sin(t * 31 + l.ph) * Math.sin(t * 13 + l.ph) > 0.15 ? 1 : 0.1;
    l.glow.material.opacity = f * 0.9;
    l.bulb.material.color.set("#fff0c8").multiplyScalar(0.3 + 0.7 * f);
  });

  // Glas zerspringt
  const broken = t >= C.glass;
  glass.visible = !broken;
  shards.visible = broken;
  glassFlash.material.opacity = broken ? Math.max(0, 1 - (t - C.glass) / 0.35) * 0.9 : 0;
  if (broken) {
    const dt = t - C.glass, g = 22;
    shardData.forEach((d, i) => {
      const [x0, y0, z0] = d.p, [vx, vy, vz] = d.v;
      const tl = (vy + Math.sqrt(vy * vy + 2 * g * (y0 - 0.05))) / g;
      const tt = Math.min(dt, tl);
      const y = dt < tl ? y0 + vy * dt - 0.5 * g * dt * dt : 0.05;
      v3.set(x0 + vx * tt, y, z0 + vz * tt);
      e3.set(d.rot[0] + d.spin[0] * tt, d.rot[1] + d.spin[1] * tt, d.rot[2] + d.spin[2] * tt);
      if (dt >= tl) e3.x = -Math.PI / 2;
      m4.compose(v3, q.setFromEuler(e3), s3.setScalar(d.s));
      shards.setMatrixAt(i, m4);
    });
    shards.instanceMatrix.needsUpdate = true;
  }
  interiorMat.color.setScalar(broken ? 0.55 + 0.45 * (Math.sin(t * 40) > -0.6 ? 1 : 0.3) : 1);

  // Passanten in der Dämmerung
  bystanders.forEach((b) => {
    b.p.visible = t < 8.65;
    b.p.position.set(b.x, 0.1 + Math.abs(Math.sin(t * 6 + b.ph)) * 0.05, b.z0 + b.dir * b.sp * t);
    b.p.rotation.y = b.dir > 0 ? 0 : Math.PI;
  });

  // Maskierte
  const zBase = -106 + (t - C.purgersIn) * 2.1;
  purgers.forEach((pg) => {
    pg.p.visible = t >= C.purgersIn && t < C.dawnStart;
    pg.p.position.set(pg.ox + Math.sin(t * 1.3 + pg.ph) * 0.25, 0.1 + Math.abs(Math.sin(t * 5.5 + pg.ph)) * 0.07, zBase + pg.oz);
    const fl = 0.75 + 0.25 * Math.sin(t * 23 + pg.ph) * Math.sin(t * 7.3 + pg.ph * 2);
    pg.glow.material.opacity = fl;
    if (pg.light) pg.light.intensity = 26 * fl;
  });
  looters.forEach((l) => {
    l.p.visible = t >= 14.3 && t < C.dawnStart;
    l.p.position.y = 0.1 + Math.abs(Math.sin(t * 3 + l.ph)) * 0.04;
  });

  // Brennendes Auto
  const fireOn = t >= C.purgersIn && t < C.dawnStart + 0.8 ? 1 : 0;
  fire.forEach((f, i) => {
    const fl = 0.6 + 0.4 * Math.sin(t * (17 + i) + f.ph);
    f.s.position.set(-1.2 + f.ox, 1.8 + ((t * 1.7 + f.ph) % 1.6), -104 + f.oz);
    f.s.scale.setScalar((1.6 + fl * 1.6) * fireOn);
    f.s.material.opacity = fl * fireOn;
  });
  fireLight.intensity = fireOn * (55 + 20 * Math.sin(t * 19));

  // Nachbar
  silMat.opacity = K.ramp(t, C.neighbor - 0.25, C.neighbor + 0.6);
}

function updateHud(t) {
  const u = K.clamp((t - C.purgeStart) / (C.purgeEnd - C.purgeStart));
  hudNum.textContent = K.formatDE(Math.pow(u, 2.1) * 1284551);
  hudSub.textContent = `NOCH ${K.formatClock(12 * 3600 * (1 - u))} STUNDEN`;
}

function renderAt(t) {
  const focus = rig.apply(camera, t);
  sky.mesh.position.copy(camera.position);
  K.applyMood(K.moodAt(MOOD, t), { scene, sky, lights, focus });
  updateWorld(t);
  renderer.render(scene, camera);
  updateHud(t);
}

window.__hf = window.__hf || {};
window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.world = (async () => {
  await document.fonts.load("700 150px Inter");
  const signTex = K.textTexture({ text: "POLIZEI", bg: "#1f4fbf", fg: "#ffffff" });
  policeSignMat.map = signTex;
  policeSignMat.needsUpdate = true;
  scene.traverse((o) => {
    if (o.userData.sign) {
      o.material.map = K.textTexture({ text: "SUPERMARKT", bg: "#1f4d3a", fg: "#ffffff", spacing: "10px", font: "700 130px Inter" });
      o.material.needsUpdate = true;
    }
  });
  renderAt(window.__hfThreeTime || 0);
})();

window.addEventListener("hf-seek", (event) => renderAt(event.detail.time));
