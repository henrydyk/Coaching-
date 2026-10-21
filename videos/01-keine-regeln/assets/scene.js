// Szene: "Mal angenommen … es gibt keine Regeln mehr" (60 s, Purge-Nacht in einer Low-Poly-Kleinstadt)
import * as THREE from "three";
import * as K from "./lowpoly-kit.js";

const W = 1080, H = 1920;
const C = JSON.parse(document.getElementById("cues").textContent);
const canvas = document.getElementById("three-layer");
const hudNum = document.getElementById("hud-num");
const hudSub = document.getElementById("hud-sub");

const renderer = K.createRenderer(canvas, W, H);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#f4b88f", 150, 640);
const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 2000);
const sky = K.createSky();
scene.add(sky.mesh);
const lights = K.createLights(scene);
const rand = K.mulberry32(1907);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (t, a, b) => t >= a && t < b;

// ---------- Stimmungen ----------
const DUSK = {
  top: "#5b6fae", horizon: "#ffb27e", bottom: "#6a8a55", fog: "#f4b88f", fogNear: 150, fogFar: 640,
  sun: "#ffc596", sunI: 2.6, hemiSky: "#ffe2c4", hemiGround: "#4a6a3a", hemiI: 1.25, sunDir: [-0.5, 0.3, -0.81], sunGlow: 1,
};
const PURGE = {
  top: "#0d0610", horizon: "#8a1a2a", bottom: "#1c0b12", fog: "#3a1019", fogNear: 40, fogFar: 300,
  sun: "#ff8a78", sunI: 0.55, hemiSky: "#8a3e5c", hemiGround: "#1d0f16", hemiI: 0.8, sunDir: [0.35, 0.62, -0.7], sunGlow: 0,
};
const DEEP = { // 3 Uhr nachts: kälter, dunkler
  top: "#06040b", horizon: "#3c1534", bottom: "#0d0710", fog: "#1c0c1a", fogNear: 25, fogFar: 230,
  sun: "#9a8cff", sunI: 0.4, hemiSky: "#54406e", hemiGround: "#100b14", hemiI: 0.65, sunDir: [0.3, 0.7, -0.6], sunGlow: 0,
};
const DAWN = {
  top: "#6c88c6", horizon: "#ffc7a0", bottom: "#6a8a55", fog: "#f7c8a6", fogNear: 130, fogFar: 620,
  sun: "#ffd9b2", sunI: 2.3, hemiSky: "#ffe8d2", hemiGround: "#4c6c40", hemiI: 1.15, sunDir: [0.62, 0.16, -0.77], sunGlow: 1,
};
const MORNING = {
  top: "#7da5de", horizon: "#ffe4c4", bottom: "#6a8a55", fog: "#f3dcc8", fogNear: 140, fogFar: 700,
  sun: "#fff1dc", sunI: 2.7, hemiSky: "#fff6ea", hemiGround: "#4e6e42", hemiI: 1.3, sunDir: [0.55, 0.32, -0.77], sunGlow: 1,
};
const MOOD = [
  [0, DUSK], [C.sirenOn, DUSK], [C.sirenOn + 1.4, PURGE],
  [C.threeAm - 0.12, PURGE], [C.threeAm - 0.02, DEEP],
  [C.dawnStart - 0.03, DEEP], [C.dawnStart + 0.02, DAWN],
  [C.shuttersUp, DAWN], [C.shuttersUp + 1.4, MORNING], [60, MORNING],
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

for (let z = -28; z >= -112; z -= 12) {
  field.add(-13, z, { w: 8, d: 8, facing: "x+", wall: pick(WALLS), roof: pick(ROOFS), data: { row: "L" } });
  field.add(13, z, { w: 8, d: 8, facing: "x-", wall: pick(WALLS), roof: pick(ROOFS), data: { row: "R" } });
}
const NORTH_DOORS = [];
for (let z = 50; z <= 210; z += 13) {
  if (inCross(z)) continue;
  field.add(-13, z, { w: 8, d: 8, facing: "x+", wall: pick(WALLS), roof: pick(ROOFS) });
  field.add(13, z, { w: 8, d: 8, facing: "x-", wall: pick(WALLS), roof: pick(ROOFS) });
  if (z < 95) NORTH_DOORS.push(z);
}
for (let z = -160; z >= -290; z -= 13) {
  if (inCross(z)) continue;
  field.add(-13, z, { w: 8, d: 8, facing: "x+", wall: pick(WALLS), roof: pick(ROOFS) });
  field.add(13, z, { w: 8, d: 8, facing: "x-", wall: pick(WALLS), roof: pick(ROOFS) });
}
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

// Fenster-Zustände: Welle beim Runterlassen, Welle beim Hochziehen am Morgen
let neighborWin = null;
const peekWins = [];
field.windows.forEach((w) => {
  w.litDusk = rand() < 0.7;
  if (w.house.data.row) {
    const along = K.clamp((-28 - w.z) / 90);
    w.tOff = K.lerp(C.shutterStart, C.shutterEnd, along) + rand() * 0.25;
    w.tUp = C.shuttersUp + along * 1.1 + rand() * 0.3;
  } else {
    w.tOff = C.sirenOn + 1.4 + rand() * (C.shutterEnd - C.sirenOn - 1.4);
    w.tUp = C.shuttersUp + rand() * 2.5;
  }
  const L = w.house.data.row === "L";
  if (L && w.house.z === -40 && w.k === 0) neighborWin = w;
  if (L && ((w.house.z === -52 && w.k === 0) || (w.house.z === -64 && w.k === 1) || (w.house.z === -76 && w.k === 0))) peekWins.push(w);
});
neighborWin.neighbor = true;
peekWins.forEach((w) => { w.peek = true; });
field.build(scene);
const yourDoorIdx = field.doors.findIndex((d) => Math.abs(d.x - 8.97) < 0.1 && Math.abs(d.z + 40) < 0.1);

// Fenster mit Innenleben (Licht + Vorhang + optional Silhouette + Fensterkreuz)
const TW = 320, TH = 330;
const roomTex = K.canvasTexture(TW, TH, (g, w, h) => {
  const grd = g.createRadialGradient(w * 0.58, h * 0.25, 10, w * 0.5, h * 0.45, w * 0.8);
  grd.addColorStop(0, "#fff1c4");
  grd.addColorStop(0.5, "#ffc96e");
  grd.addColorStop(1, "#c9762f");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? "#b4582a" : "#9c4723";
    g.fillRect(i * 13, 0, 14, h);
  }
});
const bustTex = K.canvasTexture(TW, TH, (g, w, h) => {
  g.fillStyle = "#0c0a0c";
  g.beginPath();
  g.ellipse(w * 0.6, h * 0.36, 34, 41, 0.08, 0, Math.PI * 2);
  g.fill();
  g.fillRect(w * 0.6 - 14, h * 0.45, 28, 26);
  g.beginPath();
  g.moveTo(w * 0.27, h);
  g.bezierCurveTo(w * 0.29, h * 0.68, w * 0.4, h * 0.56, w * 0.6, h * 0.55);
  g.bezierCurveTo(w * 0.8, h * 0.56, w * 0.93, h * 0.68, w * 0.95, h);
  g.closePath();
  g.fill();
});
const peekTex = K.canvasTexture(TW, TH, (g, w, h) => { // nur der Kopf unter dem halb offenen Rollladen
  g.fillStyle = "#0c0a0c";
  g.beginPath();
  g.ellipse(w * 0.55, h * 0.86, 40, 46, 0, 0, Math.PI * 2);
  g.fill();
});
const frameTex = K.canvasTexture(TW, TH, (g, w, h) => {
  g.strokeStyle = "#f3efe6";
  g.lineWidth = 14;
  g.strokeRect(7, 7, w - 14, h - 14);
  g.lineWidth = 10;
  g.beginPath();
  g.moveTo(w / 2, 0); g.lineTo(w / 2, h);
  g.moveTo(0, h * 0.42); g.lineTo(w, h * 0.42);
  g.stroke();
});
function windowArt(win, silTex) {
  const NW = field.winW * 1.02, NH = field.winH * 1.02;
  const mk = (tex, off) => {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    plane(NW, NH, mat, win.x + win.n[0] * off, win.y, win.z, win.rotY);
    return mat;
  };
  return { room: mk(roomTex, 0.02), sil: mk(silTex, 0.03), frame: mk(frameTex, 0.04) };
}
const neighborArt = windowArt(neighborWin, bustTex);
const peekArts = peekWins.map((w) => windowArt(w, peekTex));

// ---------- Polizeiwache ----------
const policeSignMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
const policeLights = [];
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
const marketSign = plane(12, 2.2, new THREE.MeshBasicMaterial({ color: "#ffffff" }), 15.93, 5.75, -134, -Math.PI / 2);
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

// ---------- Ampel ----------
const trafficLights = [];
for (const x of [-6.6]) {
  box(0.24, 5, 0.24, "#5c6168", x, 2.5, -113.5);
  box(0.6, 1.6, 0.5, "#2a2d31", x, 5.6, -113.5);
  const tlamps = {};
  for (const [name, y, col] of [["r", 6.1, "#ff3b30"], ["y", 5.6, "#ffc21a"], ["g", 5.1, "#38e07b"]]) {
    const mat = new THREE.MeshBasicMaterial({ color: col });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.19, 16), mat);
    disc.position.set(x, y, -113.24);
    scene.add(disc);
    const glow = K.makeGlow(col, 2.6);
    glow.position.set(x, y, -113.1);
    scene.add(glow);
    tlamps[name] = { mat, glow, base: new THREE.Color(col) };
  }
  trafficLights.push(tlamps);
}

// ---------- Straßenlaternen (Hauptstraße + Straße des Läufers) ----------
const lamps = [];
function addLamp(x, z, armDir) {
  box(0.18, 6, 0.18, "#6b7078", x, 3, z);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshBasicMaterial({ color: "#fff0c8" }));
  bulb.position.set(x + armDir * 0.7, 6.05, z);
  scene.add(bulb);
  const glow = K.makeGlow("#ffd59a", 4.2);
  glow.position.copy(bulb.position);
  scene.add(glow);
  lamps.push({ bulb, glow, flick: rand() < 0.3, ph: rand() * 50 });
}
for (let z = -250; z <= 160; z += 24) {
  if (inCross(z, 16)) continue;
  for (const x of [-7.4, 7.4]) {
    if (x < 0 && z > 20 && z < 46) continue; // freie Sicht auf die Polizeiwache
    addLamp(x, z, -Math.sign(x));
  }
}
for (const z of [-92, -68, -44, -20]) addLamp(52.6, z, 1);
addLamp(67.4, -64, -1);
const runnerLight = new THREE.PointLight("#ffd59a", 0, 22, 1.3); // Lichtkegel über dem Versteck
runnerLight.position.set(66.6, 5.8, -64);
scene.add(runnerLight);

// ---------- Autos & Feuer ----------
const CAR_COLORS = ["#c0392b", "#2e86de", "#f1c40f", "#95a5a6", "#ecf0f1", "#16a085", "#e67e22"];
for (const [x, z, rot] of [[3.6, -58, 0], [-3.6, -98, Math.PI], [3.6, 140, 0], [-3.6, 82, Math.PI], [3.6, -170, 0], [63.6, -57, 0], [56.4, -80, Math.PI]]) {
  const car = makeCar(pick(CAR_COLORS));
  car.position.set(x, 0.05, z);
  car.rotation.y = rot;
  scene.add(car);
}
const fireCars = [[3.6, -70, 0, C.fire1], [-3.6, -86, Math.PI, C.fire2], [-1.2, -104, 0.5, C.fire3]].map(([x, z, rot, tIgn], i) => {
  const normal = makeCar(pick(CAR_COLORS));
  const burnt = makeCar("#333333", { burnt: true });
  for (const c of [normal, burnt]) { c.position.set(x, 0.05, z); c.rotation.y = rot; scene.add(c); }
  return { normal, burnt, tIgn, fire: K.makeFire(scene, [x, 0, z], { seed: 11 + i }), smoke: K.makeSmoke(scene, [x, 0, z], { seed: 21 + i }) };
});

// ---------- Menschen ----------
const SHIRTS = ["#c0392b", "#2e86de", "#16a085", "#8e44ad", "#d35400", "#f1c40f", "#ecf0f1", "#7f8c8d", "#e84393", "#27ae60"];
const PANTS = ["#2c3e50", "#3b5a8a", "#8a7a5a", "#1f1f24", "#5d4a3a"];
const HAIR = ["#2b1d14", "#4a3222", "#c9a45a", "#8a8a8a", "#1a1a1a", "#7a3b1e"];
const SKIN = ["#f0cfae", "#e5bd98", "#c99a72", "#8d5e3c", "#f3d6c1"];
const civilian = (extra = {}) => ({
  shirt: pick(SHIRTS), pants: pick(PANTS), hair: pick(HAIR), skin: pick(SKIN),
  hairStyle: pick(["short", "short", "long", "bald", "cap"]), sleeves: rand() < 0.4 ? "short" : "long",
  capColor: pick(["#b83a2e", "#2e5fb8", "#1f1f24"]), ...extra,
});
const PURGE_COLORS = ["#16161b", "#22202a", "#2b2630", "#1f2a22", "#3a1f22"];
const purger = (extra = {}) => {
  const c = pick(PURGE_COLORS);
  return { shirt: c, pants: "#141418", shoes: "#0e0e10", mask: true, hood: true, hoodColor: c, skin: pick(SKIN), ...extra };
};
function spawn(opts) {
  const ch = K.makeCharacter(opts);
  ch.root.visible = false;
  scene.add(ch.root);
  return ch;
}
function addFlare(ch, withLight = false) {
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 6), new THREE.MeshBasicMaterial({ color: "#5a1a14" }));
  stick.position.set(0, -0.06, 0.04);
  stick.rotation.x = 0.9;
  ch.arms[1].hand.add(stick);
  const glow = K.makeGlow("#ff3322", 0.95);
  glow.position.set(0, 0.06, 0.16);
  ch.arms[1].hand.add(glow);
  let light = null;
  if (withLight) {
    light = new THREE.PointLight("#ff2a1a", 0, 16, 1.5);
    light.position.set(0, 0.1, 0.2);
    ch.arms[1].hand.add(light);
  }
  return { stick, glow, light, ph: rand() * 10 };
}
function setFlare(f, t, lit) {
  const fl = 0.75 + 0.25 * Math.sin(t * 23 + f.ph) * Math.sin(t * 7.3 + f.ph * 2);
  f.glow.material.opacity = lit * fl;
  // kurzer Zündblitz: beim Aufflammen größer
  f.glow.scale.setScalar(0.95 + (lit > 0 && lit < 1 ? 1.2 * Math.sin(Math.PI * lit) : 0));
  f.stick.material.color.set(lit > 0 ? "#ff4a32" : "#5a1a14");
  if (f.light) f.light.intensity = 22 * fl * lit;
}
const place = (ch, x, z, yaw) => { ch.root.position.set(x, 0.05, z); ch.root.rotation.y = yaw; };

// Passanten in der Dämmerung
const bystanders = Array.from({ length: 16 }, () => {
  const ch = spawn(civilian());
  const x = (rand() < 0.5 ? -1 : 1) * (5.6 + rand() * 1.6);
  return { ch, x, z0: -10 + rand() * 75, dir: rand() < 0.5 ? -1 : 1, sp: 1.0 + rand() * 0.5, ph: rand() * 10 };
});
// Alle rennen nach Hause
const homeRunners = Array.from({ length: 11 }, (_, i) => {
  const ch = spawn(civilian());
  const side = i % 2 ? 1 : -1;
  const dz = NORTH_DOORS[i % NORTH_DOORS.length];
  const start = [side * (5.4 + rand() * 1.6), dz + (rand() < 0.5 ? -1 : 1) * (2 + rand() * 6)];
  return { ch, path: [start, [side * 7.0, dz], [side * 8.7, dz]], sp: 3.6 + rand() * 0.9, t0: 8.9 + rand() * 0.3 };
});
// Die Ersten kommen raus: Gruppe A
const PA = [[-30, -120.6], [-2.2, -120.6], [-2.2, -40]];
const groupA = [[0, 0], [-1.3, 1.6], [1.2, 1.9], [-0.4, 3.2], [1.8, 3.6], [-1.9, 4.4], [0.6, 5.2]].map(([lat, back], i) => {
  const ch = spawn(purger());
  return { ch, lat, back, flare: addFlare(ch, i % 2 === 0), ph: rand() * 10 };
});
const leaderS = (t) => (t - 16.3) * 1.9;
function memberPos(m, t) {
  const s = leaderS(t) - m.back;
  const p = K.pathAt(PA, s);
  return { x: p.x + Math.cos(p.yaw) * m.lat, z: p.z - Math.sin(p.yaw) * m.lat, yaw: p.yaw, s };
}
// Plünderer am Supermarkt (einer mit Schläger)
const looters = [[12, -128], [13.2, -137], [10.8, -141]].map(([x, z], i) => {
  const ch = spawn(purger());
  place(ch, x, z, Math.PI / 2);
  let flare = null;
  if (i === 1) flare = addFlare(ch);
  if (i === 0) {
    const bat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.75, 0.05), K.lambert("#8a6a44"));
    bat.position.set(0, -0.3, 0.02);
    ch.arms[1].hand.add(bat);
  }
  return { ch, flare, ph: rand() * 10 };
});
// Läufer und Gruppe B in der Seitenstraße
const runner = spawn(civilian({ shirt: "#ecf0f1", pants: "#3b5a8a", hairStyle: "short", hair: "#2b1d14" }));
const PR = [[61.0, -64], [61.4, -56], [61.6, -53.2], [63.4, -53.0]];
const PB = [[60.5, -112], [60.5, -60]];
const groupB = [[0, 0], [-1.4, 1.5], [1.3, 2.1]].map(([lat, back]) => {
  const ch = spawn(purger());
  return { ch, lat, back, flare: addFlare(ch), ph: rand() * 10 };
});
// Maske in Nahaufnahme
const hero = spawn(purger({ shirt: "#1d1b22", hoodColor: "#1d1b22" }));
place(hero, 9.0, -128, -Math.PI / 2);
const heroFlare = addFlare(hero, true);
// Der Klopfer und der Nachbar (gleiche olivgrüne Jacke)
const OLIVE = "#556b2f";
const knocker = spawn(purger({ shirt: OLIVE, hoodColor: OLIVE, pants: "#2c2a28" }));
place(knocker, 8.35, -40, Math.PI / 2);
const neighbor = spawn({ shirt: OLIVE, pants: "#2c2a28", hair: "#5a4632", hairStyle: "short", skin: "#e5bd98" });
place(neighbor, -8.3, -40, Math.PI / 2);
const heldMask = new THREE.Group();
K.makePurgeMask(heldMask);
heldMask.position.set(-0.2, 0.92, 0.34);
heldMask.rotation.set(0.35, 0.25, 0.15);
neighbor.root.add(heldMask);
// Morgens kommen alle raus
const morningFolks = [[-1, -52], [-1, -64], [-1, -76], [-1, -88], [-1, -52], [-1, -76]].map(([side, z], i) => {
  const ch = spawn(civilian());
  return { ch, side, path: [[side * 8.6, z], [side * 6.6, z + (rand() - 0.5) * 2]], t0: C.shuttersUp + 0.3 + i * 0.35, ph: rand() * 10 };
});
// Licht über deiner Haustür
const porchBulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: "#ffe2a8" }));
porchBulb.position.set(8.85, 2.55, -40);
scene.add(porchBulb);
const porchGlow = K.makeGlow("#ffc77a", 1.1);
porchGlow.position.copy(porchBulb.position);
scene.add(porchGlow);
const porchLight = new THREE.PointLight("#ffc77a", 0, 9, 1.6);
porchLight.position.set(8.4, 2.4, -40);
scene.add(porchLight);

// ---------- Kamera ----------
const runnerAt = (t) => K.pathAt(PR, (t - C.runner) * 5.2);
const rig = new K.CameraRig([
  { t0: 0, t1: 3.55, from: { pos: [60, 70, 130], tgt: [-20, 0, -40] }, to: { pos: [22, 30, 76], tgt: [-15, 3, 33] }, lift: 4 },
  { t0: 3.9, t1: 6.65, from: { pos: [10, 9.5, 54], tgt: [-15, 3.2, 33] }, to: { pos: [6, 8, 48], tgt: [-16, 3.6, 32.5] }, lift: 3 },
  { t0: 6.95, t1: 9.3, from: { pos: [21, 2.2, 24], tgt: [7, 12, 8] }, to: { pos: [19, 2.6, 21], tgt: [7, 13.5, 8] }, fov: 60 },
  { t0: 9.35, t1: 10.48, from: { pos: [0.5, 3.4, 42], tgt: [2, 1.3, 68] }, to: { pos: [0.8, 3.2, 45], tgt: [2, 1.3, 70] } },
  { t0: 10.5, t1: 12.65, from: { pos: [-2.5, 4.4, -30], tgt: [11, 2.4, -46] }, to: { pos: [-2.5, 4.0, -40], tgt: [11, 2.4, -56] } },
  { t0: 12.8, t1: 14.45, from: { pos: [-70, 120, 50], tgt: [0, 0, -60] }, to: { pos: [-62, 112, 38], tgt: [0, 0, -62] } },
  { t0: 14.5, t1: 17.25, from: { pos: [4, 3.0, -52], tgt: [-9, 2.6, -60] }, to: { pos: [4, 3.0, -70], tgt: [-9, 2.6, -78] } },
  { t0: 17.3, t1: 19.2, from: { pos: [-7, 1.8, -117.5], tgt: [-27, 1.5, -121.5] }, to: { pos: [-7.2, 1.75, -117.8], tgt: [-23, 1.5, -121.2] } },
  {
    t0: 19.25, t1: 21.15,
    fn: (t) => {
      const p = K.pathAt(PA, leaderS(t));
      return { pos: [p.x + 3.1, 1.55, p.z + 0.9], tgt: [p.x, 1.62, p.z], fov: 46 };
    },
  },
  {
    t0: 21.2, t1: 24.45,
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
  { t0: 24.5, t1: 26.85, from: { pos: [6, 18, -30], tgt: [0, 0, -85] }, to: { pos: [7, 24, -36], tgt: [0, 0, -88] } },
  {
    t0: 26.9, t1: 30.1,
    fn: (t, u) => {
      const r = runnerAt(t);
      const hide = K.ramp(t, C.hide - 0.2, C.hide + 0.4);
      return {
        pos: [K.lerp(58.5, 58.8, u), 1.5, K.lerp(-46, -47, u)],
        tgt: [K.lerp(r.x, 63.4, hide), K.lerp(1.15, 0.85, hide), K.lerp(r.z, -55.5, hide)],
        fov: 50,
      };
    },
  },
  { t0: 30.15, t1: 32.8, from: { pos: [7.0, 1.82, -127.5], tgt: [9.0, 1.82, -128] }, to: { pos: [7.3, 1.84, -127.85], tgt: [9.0, 1.84, -128] }, fov: 44 },
  { t0: 32.85, t1: 36.4, from: { pos: [7.5, 3.2, -37.9], tgt: [-9, 2.6, -37.84] }, to: { pos: [0.5, 2.95, -37.88], tgt: [-9, 2.75, -37.84] }, fov: 50 },
  { t0: 36.45, t1: 40.7, from: { pos: [2.0, 1.75, -34.5], tgt: [9, 1.5, -40] }, to: { pos: [3.3, 1.7, -36.0], tgt: [9, 1.5, -40] }, fov: 50 },
  { t0: 40.75, t1: 41.95, from: { pos: [7.0, 1.55, -42.4], tgt: [8.9, 1.65, -40.3] }, to: { pos: [7.1, 1.56, -42.2], tgt: [8.9, 1.65, -40.3] }, fov: 50 },
  { t0: 42.0, t1: 46.25, from: { pos: [9.15, 1.66, -40], tgt: [5, 1.75, -40] }, to: { pos: [9.15, 1.64, -40.04], tgt: [5, 1.75, -40.02] }, fov: 100 },
  { t0: 46.3, t1: 48.15, from: { pos: [21, 2.2, 24], tgt: [7, 12, 8] }, to: { pos: [20, 2.5, 22], tgt: [7, 13, 8] }, fov: 60 },
  { t0: 48.2, t1: 51.7, from: { pos: [4.5, 2.0, -44], tgt: [-9, 1.7, -68] }, to: { pos: [4.2, 2.1, -48], tgt: [-9, 1.7, -72] }, fov: 50 },
  {
    t0: 51.75, t1: 55.05,
    fn: (t, u) => ({ pos: [8.3, 1.68, -40], tgt: [-8.3, 1.45, -40], fov: K.lerp(40, 15, K.easeInOutSine(u)) }),
  },
  { t0: 55.1, t1: 60, from: { pos: [40, 80, 40], tgt: [-5, 0, -50] }, to: { pos: [52, 88, 58], tgt: [-8, 0, -46] } },
]);

// ---------- Pro-Frame-Update ----------
const sirenActive = (t) => between(t, C.sirenOn, C.sirenOn + 3.4) || between(t, C.sirenEndOn, C.sirenEndOff);
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
const night = (t) => K.ramp(t, C.sirenOn, C.sirenOn + 1.4) * (1 - K.ramp(t, C.dawnStart - 0.05, C.dawnStart));
const STRIDE = 2.6; // Schrittphase pro Meter beim Gehen; Rennen nutzt 1.6

function updateWorld(t) {
  const n = night(t);

  // Polizei
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
  const peeking = between(t, C.peekStart, C.peekEnd);
  field.update(t, (w, tt) => {
    const down = K.ramp(tt, w.tOff, w.tOff + 0.35);
    const up = K.ramp(tt, w.tUp, w.tUp + 0.45);
    if (w.neighbor) return { light: 0, shutter: 0 };
    if (w.peek && peeking) return { light: 0, shutter: 0.55 };
    return { light: tt < C.shuttersUp ? (w.litDusk ? 1 : 0.15) : 0.12, shutter: down * (1 - up) };
  });
  const nOn = t < C.threeAm - 0.3 ? 1 : 0;
  neighborArt.room.opacity = nOn;
  neighborArt.frame.opacity = nOn;
  neighborArt.sil.opacity = nOn * K.ramp(t, C.neighbor - 0.25, C.neighbor + 0.6);
  peekArts.forEach((a, i) => {
    const o = peeking ? 1 : 0;
    a.room.opacity = o;
    a.frame.opacity = o;
    a.sil.opacity = o * K.ramp(t, C.peekStart + 0.3 + i * 0.5, C.peekStart + 0.8 + i * 0.5);
  });
  if (yourDoorIdx >= 0) { // Türblatt ausblenden, solange wir durch den Spion schauen
    const d = field.doors[yourDoorIdx];
    const hidden = between(t, C.peep - 0.02, C.dawnStart);
    m4.compose(v3.set(d.x, 0, d.z), q.setFromEuler(e3.set(0, d.rotY, 0)), s3.setScalar(hidden ? 0.0001 : 1));
    field.doorMesh.setMatrixAt(yourDoorIdx, m4);
    field.doorMesh.instanceMatrix.needsUpdate = true;
  }

  // Ampel
  const chaos = t > C.sirenOn + 0.5;
  trafficLights.forEach((tl) => {
    const blink = chaos && Math.floor(t * 1.8) % 2 === 0 ? 1 : 0;
    const set = (lamp, on) => { lamp.mat.color.copy(lamp.base).multiplyScalar(0.12 + 0.88 * on); lamp.glow.material.opacity = on; };
    set(tl.r, 0);
    set(tl.y, chaos ? blink : 0);
    set(tl.g, chaos ? 0 : 1);
  });

  // Laternen
  const lampOn = K.ramp(t, 4.5, 6.0) * (1 - K.ramp(t, C.dawnStart, C.dawnStart + 0.1));
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
  interiorMat.color.setScalar(broken && t < C.dawnStart ? 0.55 + 0.45 * (Math.sin(t * 40) > -0.6 ? 1 : 0.3) : 1);

  // Brennende Autos
  fireCars.forEach((fc) => {
    const ign = t >= fc.tIgn;
    fc.normal.visible = !ign;
    fc.burnt.visible = ign;
    fc.fire.update(t, K.ramp(t, fc.tIgn, fc.tIgn + 0.6) * (t < C.dawnStart ? 1 : 0));
    fc.smoke.update(t, K.ramp(t, fc.tIgn + 0.3, fc.tIgn + 2));
  });

  // Passanten (Dämmerung)
  bystanders.forEach((b) => {
    b.ch.root.visible = t < C.runHome;
    if (!b.ch.root.visible) return;
    place(b.ch, b.x, b.z0 + b.dir * b.sp * t, b.dir > 0 ? 0 : Math.PI);
    K.animateCharacter(b.ch, { gait: "walk", phase: b.sp * t * STRIDE + b.ph, t, headYaw: Math.sin(t * 0.7 + b.ph) * 0.3 });
  });
  // Alle rennen nach Hause
  homeRunners.forEach((r) => {
    const s = Math.max(0, (t - r.t0) * r.sp);
    const p = K.pathAt(r.path, s);
    r.ch.root.visible = between(t, C.runHome - 0.05, C.shutterStart) && !p.done;
    if (!r.ch.root.visible) return;
    place(r.ch, p.x, p.z, p.yaw);
    K.animateCharacter(r.ch, { gait: "run", phase: s * 1.6, t });
  });
  // Gruppe A
  groupA.forEach((m, i) => {
    m.ch.root.visible = between(t, C.halfEight - 0.05, 30.1);
    if (!m.ch.root.visible) return;
    const p = memberPos(m, t);
    place(m.ch, p.x, p.z, p.yaw);
    const lit = K.ramp(t, C.flares + i * 0.07, C.flares + i * 0.07 + 0.15);
    setFlare(m.flare, t, lit);
    K.animateCharacter(m.ch, { gait: "walk", phase: Math.max(0, p.s) * STRIDE, t, arm: lit > 0 ? "flare" : "swing", headYaw: Math.sin(t * 0.9 + m.ph) * 0.35 });
  });
  // Plünderer
  looters.forEach((l, i) => {
    l.ch.root.visible = between(t, 21.1, 30.1);
    if (!l.ch.root.visible) return;
    const swing = i === 0 && between(t, C.glass - 0.75, C.glass + 0.1);
    K.animateCharacter(l.ch, { t, arm: swing ? "knock" : l.flare ? "flare" : undefined, armT: t - C.glass, headYaw: Math.sin(t * 1.1 + l.ph) * 0.3 });
    if (l.flare) setFlare(l.flare, t, 1);
  });
  // Läufer + Gruppe B
  runnerLight.intensity = between(t, C.runner - 0.05, 30.15) ? 38 : 0;
  runner.root.visible = between(t, C.runner - 0.05, 30.15);
  if (runner.root.visible) {
    const r = runnerAt(t);
    const crouch = K.ramp(t, C.hide - 0.25, C.hide + 0.15);
    place(runner, r.x, r.z, r.done ? Math.PI : r.yaw); // duckt sich, Blick zurück zu den Maskierten
    K.animateCharacter(runner, { gait: crouch > 0.5 ? "idle" : "run", phase: (t - C.runner) * 5.2 * 1.6, t, crouch, headYaw: crouch * -0.6 });
  }
  groupB.forEach((m) => {
    m.ch.root.visible = between(t, C.runner - 0.05, 30.15);
    if (!m.ch.root.visible) return;
    const s = (t - 25) * 1.6 - m.back;
    const p = K.pathAt(PB, s);
    place(m.ch, p.x + m.lat, p.z, p.yaw);
    setFlare(m.flare, t, 1);
    K.animateCharacter(m.ch, { gait: "walk", phase: s * STRIDE, t, arm: "flare" });
  });
  // Maske in Nahaufnahme: Kopf dreht sich zur Kamera
  hero.root.visible = between(t, 30.1, 32.85);
  if (hero.root.visible) {
    const turn = K.easeInOutCubic(K.clamp((t - C.maskTurn) / 0.8));
    setFlare(heroFlare, t, 1);
    K.animateCharacter(hero, { t, arm: "flare", headYaw: K.lerp(1.15, 0, turn), headPitch: K.lerp(0, -0.06, turn), headRoll: turn * 0.1 });
  }
  // Klopfer
  knocker.root.visible = between(t, C.threeAm - 0.1, C.dawnStart - 0.02);
  if (knocker.root.visible) {
    let arm;
    if (between(t, C.knock1 - 0.28, C.knock3 + 0.12)) arm = "knock";
    else if (between(t, C.knock1 - 0.6, C.knock1 - 0.28) || between(t, C.knock3 + 0.12, 41.95)) arm = "knockHold";
    const tilt = K.ramp(t, C.tilt, C.tilt + 0.7);
    K.animateCharacter(knocker, { t, arm, armT: t - C.knock1, headRoll: tilt * 0.38, headPitch: -0.05 });
  }
  const porch = between(t, C.threeAm - 0.1, C.dawnStart) ? (Math.sin(t * 17) * Math.sin(t * 5.3) > -0.55 ? 1 : 0.25) : 0;
  porchBulb.material.color.set("#ffe2a8").multiplyScalar(0.25 + 0.75 * porch);
  porchGlow.material.opacity = porch * 0.6;
  porchLight.intensity = 2.6 * porch;
  // Morgen
  morningFolks.forEach((f) => {
    f.ch.root.visible = t >= f.t0;
    if (!f.ch.root.visible) return;
    const s = (t - f.t0) * 1.25;
    const p = K.pathAt(f.path, s);
    const faceStreet = (f.side < 0 ? Math.PI / 2 : -Math.PI / 2) + Math.sin(t * 0.5 + f.ph) * 0.4;
    place(f.ch, p.x, p.z, p.done ? faceStreet : p.yaw);
    K.animateCharacter(f.ch, { gait: p.done ? "idle" : "walk", phase: s * STRIDE, t, headYaw: p.done ? Math.sin(t * 0.8 + f.ph) * 0.6 : 0 });
  });
  neighbor.root.visible = t >= 51.7;
  if (neighbor.root.visible) {
    K.animateCharacter(neighbor, { t, armL: "holdLow", arm: t >= C.reveal ? "wave" : undefined, armT: t - C.reveal, headRoll: 0.05 });
  }
}

const CLOCK = [[0, 0], [C.sirenOn, 0], [C.halfEight, 0.5], [C.midnight, 5], [C.threeAm, 8], [C.sevenAm, 12]];
function hoursAt(t) {
  if (t <= CLOCK[0][0]) return 0;
  for (let i = 0; i < CLOCK.length - 1; i++) {
    const [t0, h0] = CLOCK[i], [t1, h1] = CLOCK[i + 1];
    if (t <= t1) return K.lerp(h0, h1, (t - t0) / (t1 - t0));
  }
  return 12;
}
function updateHud(t) {
  const h = hoursAt(t);
  hudNum.textContent = K.formatDE(Math.pow(h / 12, 1.7) * 1284551);
  hudSub.textContent = `NOCH ${K.formatClock((12 - h) * 3600)} STUNDEN`;
}

function renderAt(t) {
  const focus = rig.apply(camera, t);
  sky.mesh.position.copy(camera.position);
  K.applyMood(K.moodAt(MOOD, t), { scene, sky, lights, focus, camera });
  updateWorld(t);
  renderer.render(scene, camera);
  updateHud(t);
}

window.__hf = window.__hf || {};
window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.world = (async () => {
  await document.fonts.load("700 150px Inter");
  policeSignMat.map = K.textTexture({ text: "POLIZEI", bg: "#1f4fbf", fg: "#ffffff" });
  policeSignMat.needsUpdate = true;
  marketSign.material.map = K.textTexture({ text: "SUPERMARKT", bg: "#1f4d3a", fg: "#ffffff", spacing: "10px", font: "700 130px Inter" });
  marketSign.material.needsUpdate = true;
  renderAt(window.__hfThreeTime || 0);
})();

window.addEventListener("hf-seek", (event) => renderAt(event.detail.time));
