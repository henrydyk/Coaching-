// Szene: Echte Raubzüge #1 – Der Juwelenraub im Grünen Gewölbe (Dresden, 25.11.2019). Nachgestellte Rekonstruktion.
import * as THREE from "three";
import * as K from "./lowpoly-kit.js";

const W = 1080, H = 1920;
const C = JSON.parse(document.getElementById("cues").textContent);
const canvas = document.getElementById("three-layer");
const hudNum = document.getElementById("hud-num");
const hudSub = document.getElementById("hud-sub");

const renderer = K.createRenderer(canvas, W, H);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#141c2c", 120, 900);
const camera = new THREE.PerspectiveCamera(55, W / H, 0.05, 3000);
const sky = K.createSky(1400);
scene.add(sky.mesh);
const lights = K.createLights(scene);
const rand = K.mulberry32(2019);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (t, a, b) => t >= a && t < b;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- Schauplätze (weit auseinander, je nur in ihren Shots sichtbar) ----------
const J = V3(0, 0, -800);   // Juwelenzimmer
const G = V3(800, 0, 0);    // Tiefgarage
const B = V3(-800, 0, 0);   // Berlin
const E = V3(0, 0, 800);    // Asservaten
const CT = V3(400, 0, 800); // Gericht
const VD = V3(-400, 0, 800); // Diamant im Dunkeln

// ---------- Stimmungen ----------
const NIGHT = {
  top: "#081028", horizon: "#2c3e66", bottom: "#0b0f18", fog: "#18233a", fogNear: 160, fogFar: 1000,
  sun: "#9fb4ff", sunI: 0.7, hemiSky: "#6a7cae", hemiGround: "#1c1822", hemiI: 0.95, sunDir: [0.3, 0.65, 0.5], sunGlow: 0,
};
const DAY = {
  top: "#8fa7c2", horizon: "#e4e8ea", bottom: "#7a8a70", fog: "#d6dbde", fogNear: 150, fogFar: 1100,
  sun: "#fff6ea", sunI: 1.7, hemiSky: "#f2f5f8", hemiGround: "#5d6658", hemiI: 1.35, sunDir: [-0.4, 0.55, 0.6], sunGlow: 0.4,
};
const ROOM = {
  top: "#000000", horizon: "#000000", bottom: "#000000", fog: "#06080c", fogNear: 20, fogFar: 90,
  sun: "#8ea6ff", sunI: 0.15, hemiSky: "#3a4c66", hemiGround: "#120e0c", hemiI: 0.42, sunDir: [-0.6, 0.6, 0.3], sunGlow: 0,
};
const GARAGE = { ...ROOM, hemiSky: "#5a6a7a", hemiI: 0.55, fog: "#0d1014" };
const BERLIN = {
  top: "#14213f", horizon: "#5a6f9a", bottom: "#141a24", fog: "#28344f", fogNear: 120, fogFar: 900,
  sun: "#9fb4ff", sunI: 0.5, hemiSky: "#7488b8", hemiGround: "#1a1a22", hemiI: 0.85, sunDir: [0.4, 0.5, 0.6], sunGlow: 0,
};
const LIT = { ...ROOM, hemiSky: "#fff2dc", hemiGround: "#3a2c20", hemiI: 1.05, sunI: 0.6, sun: "#fff1dc", fog: "#1a140e", fogFar: 120 };
const VOID = { ...ROOM, hemiI: 0.15, fog: "#000000" };
// [Startzeit, Stimmung, Himmel sichtbar?]
const MOODS = [
  [0, ROOM, false], [C.s1, VOID, false], [C.s2, DAY, true], [C.s3, NIGHT, true], [C.s4, DAY, true], [C.s5, NIGHT, true],
  [C.s8, ROOM, false], [C.s11, NIGHT, true], [C.s13, GARAGE, false], [C.s14, ROOM, false],
  [C.s15, BERLIN, true], [C.s16, LIT, false], [C.s18b, VOID, false],
];
function moodAt(t) {
  let i = 0;
  while (i < MOODS.length - 1 && t >= MOODS[i + 1][0]) i++;
  return MOODS[i];
}

// ---------- Hilfen ----------
function box(sx, sy, sz, color, x, y, z, parent = scene, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), K.lambert(color, opts));
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
function plane(w, h, mat, x, y, z, rotY = 0, parent = scene) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  parent.add(m);
  return m;
}
// Satteldach entlang x (Länge lx, Tiefe dz, Höhe h)
function roofPrism(lx, dz, h, color, x, y, z, rotY = 0, parent = scene) {
  const shape = new THREE.Shape();
  shape.moveTo(-dz / 2, 0); shape.lineTo(dz / 2, 0); shape.lineTo(0, h); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: lx, bevelEnabled: false });
  g.translate(0, 0, -lx / 2);
  g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, K.lambert(color));
  m.position.set(x, y, z);
  m.rotation.y = rotY;
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}
const setGroup = () => { const g = new THREE.Group(); scene.add(g); return g; };

// =====================================================================
// DRESDEN
// =====================================================================
const city = setGroup();
const SAND = "#a99d82", SAND_D = "#8a7f68", SLATE = "#3b4048", COPPER = "#4f8a76";
// Boden mit Elbe
box(1400, 0.4, 700, "#3d4a36", 0, -0.2, -305, city); // Süden (Altstadt)
box(1400, 0.4, 600, "#3d4a36", 0, -0.2, 415, city);  // Norden (Neustadt)
const river = new THREE.Mesh(new THREE.PlaneGeometry(1400, 70), new THREE.MeshLambertMaterial({ color: "#1a2738", emissive: "#060c16" }));
river.rotation.x = -Math.PI / 2;
river.position.set(0, -1.1, 80);
city.add(river);
box(1400, 2.2, 1, "#6e6656", 0, -0.6, 45, city);
box(1400, 2.2, 1, "#6e6656", 0, -0.6, 115, city);
// Plätze und Straßen
box(200, 0.06, 40, "#8b8d8f", -10, 0.03, 25, city); // Schlossplatz / Terrassenufer
box(14, 0.06, 400, "#4b4e53", 0, 0.035, -150, city);
box(10, 0.06, 300, "#4b4e53", -100, 0.035, -60, city); // Sophienstraße (Westseite Schloss)
box(400, 0.06, 10, "#4b4e53", 0, 0.035, -75, city);
// Augustusbrücke
box(14, 1.2, 82, SAND, 0, 1.0, 80, city);
for (const z of [52, 68, 84, 100]) box(4, 3.4, 14, SAND_D, 0, -0.6, z, city);
for (const sx of [-6.6, 6.6]) box(0.8, 1.1, 82, SAND, sx, 2.1, 80, city);

// Residenzschloss: vier Flügel um einen Hof
const PAL = { x0: -90, x1: -30, z0: -60, z1: 10, d: 14, h: 20 };
const palaceMat = new THREE.MeshLambertMaterial({ color: SAND, flatShading: true, emissive: "#000000" });
function wing(x0, x1, z0, z1) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, PAL.h, z1 - z0), palaceMat);
  m.position.set((x0 + x1) / 2, PAL.h / 2, (z0 + z1) / 2);
  m.castShadow = m.receiveShadow = true;
  city.add(m);
}
wing(PAL.x0, PAL.x1, PAL.z1 - PAL.d, PAL.z1);
wing(PAL.x0, PAL.x1, PAL.z0, PAL.z0 + PAL.d);
wing(PAL.x0, PAL.x0 + PAL.d, PAL.z0 + PAL.d, PAL.z1 - PAL.d);
wing(PAL.x1 - PAL.d, PAL.x1, PAL.z0 + PAL.d, PAL.z1 - PAL.d);
roofPrism(60, 14, 8, SLATE, -60, 20, 3, 0, city);
roofPrism(60, 14, 8, SLATE, -60, 20, -53, 0, city);
roofPrism(42, 14, 8, SLATE, -83, 20, -25, Math.PI / 2, city);
roofPrism(42, 14, 8, SLATE, -37, 20, -25, Math.PI / 2, city);
// Hausmannsturm
box(12, 52, 12, SAND, -32, 26, 4, city);
box(9, 10, 9, SAND_D, -32, 57, 4, city);
const hm = K.lathe([[6.4, 0], [6.8, 2], [5.2, 6], [3.2, 9], [2.6, 11], [3.4, 12.5], [2.0, 15], [1.0, 19], [0.25, 26], [0, 30]], COPPER, { segments: 8 });
hm.position.set(-32, 62, 4);
city.add(hm);

// Fenster der Schlossfassaden (instanziert) + Zielfenster mit Gitter
const facadeWins = [];
function facadeRow(x0, x1, z, nz, floors = [3, 7.5, 12, 16.5]) {
  for (let x = x0 + 3; x <= x1 - 3; x += 4) for (const y of floors) facadeWins.push({ x, y, z: z + nz * 0.05, rotY: nz > 0 ? 0 : Math.PI });
}
function facadeCol(z0, z1, x, nx, floors = [3, 7.5, 12, 16.5]) {
  for (let z = z0 + 3; z <= z1 - 3; z += 4) for (const y of floors) facadeWins.push({ x: x + nx * 0.05, y, z, rotY: nx > 0 ? Math.PI / 2 : -Math.PI / 2 });
}
facadeRow(PAL.x0, PAL.x1, PAL.z1, 1);
facadeRow(PAL.x0, PAL.x1, PAL.z0, -1);
facadeCol(PAL.z0, PAL.z1, PAL.x0, -1);
facadeCol(PAL.z0, PAL.z1, PAL.x1, 1);
const TARGET = { x: PAL.x0 - 0.06, y: 2.4, z: -25 }; // Fenster im Erdgeschoss, Westseite
const palWin = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.5, 2.3), new THREE.MeshBasicMaterial({ color: "#ffffff" }), facadeWins.length);
{
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  facadeWins.forEach((w, i) => {
    m.compose(V3(w.x, w.y, w.z), q.setFromEuler(new THREE.Euler(0, w.rotY, 0)), V3(1, 1, 1));
    palWin.setMatrixAt(i, m);
    palWin.setColorAt(i, c.set(rand() < 0.18 ? "#e8b860" : "#1d2430"));
  });
}
city.add(palWin);
// Zielfenster: dunkel, Gitter aus Stäben, ein Stück wird herausgesägt
const targetGlass = plane(1.6, 2.4, new THREE.MeshBasicMaterial({ color: "#0a0e14" }), TARGET.x - 0.01, TARGET.y, TARGET.z, -Math.PI / 2, city);
const bars = [];
for (let i = 0; i < 6; i++) {
  const zb = TARGET.z - 0.7 + i * 0.28;
  bars.push(box(0.05, 2.5, 0.05, "#26282c", TARGET.x - 0.12, TARGET.y, zb, city));
}
for (const yb of [TARGET.y - 0.8, TARGET.y + 0.8]) box(0.05, 0.05, 1.7, "#26282c", TARGET.x - 0.12, yb, TARGET.z, city);
const cutPiece = new THREE.Group(); // zwei Stabstücke im unteren Bereich
city.add(cutPiece);
for (const i of [2, 3]) {
  const zb = TARGET.z - 0.7 + i * 0.28;
  box(0.05, 0.75, 0.05, "#3a3d42", TARGET.x - 0.12, TARGET.y - 0.38, zb, cutPiece);
  bars[i].scale.y = 0.62;
  bars[i].position.y = TARGET.y + 0.47;
}
const sparks = Array.from({ length: 26 }, () => {
  const s = K.makeGlow(rand() < 0.5 ? "#ffd27a" : "#ff9a3a", 0.18);
  city.add(s);
  return { s, a: rand() * Math.PI * 2, v: 1.5 + rand() * 3, ph: rand() };
});

// Hofkirche
box(40, 22, 26, SAND, 25, 11, -12, city);
roofPrism(40, 26, 7, SLATE, 25, 22, -12, 0, city);
box(10, 30, 10, SAND, 25, 15, 8, city);
box(8, 12, 8, SAND_D, 25, 36, 8, city);
box(6, 12, 6, SAND, 25, 48, 8, city);
const hk = K.lathe([[3.6, 0], [3.0, 4], [1.6, 8], [1.9, 10], [0.6, 15], [0.15, 22], [0, 26]], COPPER, { segments: 8 });
hk.position.set(25, 54, 8);
city.add(hk);
// Frauenkirche
const FK = V3(80, 0, -75);
box(30, 24, 30, "#cbbc98", FK.x, 12, FK.z, city);
for (const [dx, dz] of [[-15, -15], [15, -15], [-15, 15], [15, 15]]) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 32, 8), K.lambert("#cbbc98"));
  t.position.set(FK.x + dx, 16, FK.z + dz);
  city.add(t);
  const cap = K.lathe([[2.6, 0], [2.2, 2], [1.0, 4], [0, 6]], "#9fb6a6", { segments: 8 });
  cap.position.set(FK.x + dx, 32, FK.z + dz);
  city.add(cap);
}
const fkDome = K.lathe([[14, 0], [14.5, 3], [13.5, 10], [11.5, 18], [8, 26], [4.5, 32], [3.6, 34], [3.8, 37], [2.6, 44], [1.2, 50], [0, 54]], "#d6c7a3", { segments: 16 });
fkDome.position.set(FK.x, 24, FK.z);
city.add(fkDome);

// Altstadt- und Neustadt-Häuser (instanziert) mit Fensterlichtern
const blocks = [];
for (let x = -260; x <= 260; x += 26) {
  for (let z = -260; z <= 340; z += 24) {
    if (z > 30 && z < 135) continue; // Fluss + Ufer
    if (z > 135 && Math.abs(x - 20) < 75) continue; // freie Sicht vom Neustädter Ufer
    if (x > -110 && x < -15 && z > -75 && z < 25) continue; // Schloss
    if (x > 0 && x < 50 && z > -30 && z < 20) continue; // Hofkirche
    if (Math.abs(x - FK.x) < 30 && Math.abs(z - FK.z) < 30) continue;
    if (Math.abs(x) < 14 || (z > -10 && z < 40 && x > -120 && x < 60)) continue; // Straßen/Platz
    if (rand() < 0.15) continue;
    blocks.push({ x: x + (rand() - 0.5) * 3, z: z + (rand() - 0.5) * 3, sx: 18 + rand() * 4, sz: 16 + rand() * 4, h: 14 + rand() * 9 });
  }
}
const blockBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), K.lambert("#ffffff"), blocks.length);
const blockRoof = new THREE.InstancedMesh(new THREE.ConeGeometry(0.72, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), K.lambert("#ffffff"), blocks.length);
const blockWinList = [];
{
  const m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion();
  blocks.forEach((b, i) => {
    m.compose(V3(b.x, 0, b.z), q, V3(b.sx, b.h, b.sz));
    blockBody.setMatrixAt(i, m);
    blockBody.setColorAt(i, c.set(pick(["#b8ab8c", "#a39880", "#c4b99c", "#9a917c", "#b2a184"])));
    m.compose(V3(b.x, b.h, b.z), q, V3(b.sx * 1.02, 5, b.sz * 1.02));
    blockRoof.setMatrixAt(i, m);
    blockRoof.setColorAt(i, c.set(pick(["#3b4048", "#4a4036", "#5a3a30"])));
    for (let y = 3; y < b.h - 2; y += 3.6) {
      for (let k = -b.sx / 2 + 2.5; k < b.sx / 2 - 1.5; k += 3.4) {
        if (rand() < 0.35) blockWinList.push({ x: b.x + k, y, z: b.z + b.sz / 2 + 0.05, rot: 0 });
        if (rand() < 0.35) blockWinList.push({ x: b.x + k, y, z: b.z - b.sz / 2 - 0.05, rot: Math.PI });
      }
    }
  });
}
for (const mesh of [blockBody, blockRoof]) { mesh.castShadow = mesh.receiveShadow = true; city.add(mesh); }
const blockWins = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.3, 1.8), new THREE.MeshBasicMaterial({ color: "#ffffff" }), blockWinList.length);
{
  const m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion();
  blockWinList.forEach((w, i) => {
    m.compose(V3(w.x, w.y, w.z), q.setFromEuler(new THREE.Euler(0, w.rot, 0)), V3(1, 1, 1));
    blockWins.setMatrixAt(i, m);
    blockWins.setColorAt(i, c.set(rand() < 0.55 ? "#f2c46e" : "#ffe2a8"));
  });
}
city.add(blockWins);

// Laternen rund ums Schloss (gehen in einer Welle aus)
const POWERBOX = V3(-10, 0, 36);
const lanterns = [];
function lantern(x, z) {
  box(0.16, 4.2, 0.16, "#22252a", x, 2.1, z, city);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.5), new THREE.MeshBasicMaterial({ color: "#ffd89a" }));
  head.position.set(x, 4.5, z);
  city.add(head);
  const glow = K.makeGlow("#ffcf8a", 3.4);
  glow.position.set(x, 4.5, z);
  city.add(glow);
  // Spiegelung im Wasser (nur Ufer und Brücke)
  let refl = null;
  if (z >= 40 && z <= 115) {
    refl = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.glowTexture(), color: "#ffcf8a", transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    refl.position.set(x + (Math.abs(x) < 10 ? Math.sign(x) * 2.5 : 0), -0.9, z === 40 ? 47 : z);
    refl.scale.set(1.2, 5, 1);
    city.add(refl);
  }
  lanterns.push({ head, glow, refl, tOff: C.lightsOut + Math.hypot(x - POWERBOX.x, z - POWERBOX.z) / 70 });
}
for (let x = -110; x <= 50; x += 10) lantern(x, 40);
for (let z = -70; z <= 30; z += 10) lantern(-96.5, z);
for (let z = 48; z <= 112; z += 16) { lantern(-6.6, z); lantern(6.6, z); }
for (let x = -90; x <= -30; x += 12) lantern(x, 16);
// Strahler am Schloss
const floods = [[-96, -45], [-96, -5], [-60, 18], [-36, 18]].map(([x, z]) => {
  const g = K.makeGlow("#ffd9a0", 9);
  g.position.set(x, 0.8, z);
  city.add(g);
  return g;
});

// Stromkasten an der Augustusbrücke
const pbox = box(1.2, 1.6, 0.6, "#7d8288", POWERBOX.x, 0.8, POWERBOX.z, city);
box(1.25, 0.08, 0.65, "#5d6268", POWERBOX.x, 1.64, POWERBOX.z, city);
const boxFire = K.makeFire(city, [POWERBOX.x, -0.2, POWERBOX.z], { size: 0.45, seed: 5 });
const boxSmoke = K.makeSmoke(city, [POWERBOX.x, 1.4, POWERBOX.z], { seed: 6, count: 7 });
const boxSparks = Array.from({ length: 14 }, () => {
  const s = K.makeGlow("#cfe6ff", 0.25);
  city.add(s);
  return { s, a: rand() * Math.PI * 2, v: 1 + rand() * 2.5, ph: rand() };
});

// Polizeiautos (04:59 Uhr)
const policeCars = [];
function makePoliceCar() {
  const g = new THREE.Group();
  box(2.0, 0.8, 4.5, "#e9edf2", 0, 0.62, 0, g);
  box(1.8, 0.72, 2.3, "#2d3642", 0, 1.38, -0.2, g);
  box(2.04, 0.22, 4.1, "#1f4fbf", 0, 0.72, 0, g);
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10).rotateZ(Math.PI / 2);
  for (const [x, z] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const wh = new THREE.Mesh(wheelGeo, K.lambert("#1d1d1f"));
    wh.position.set(x, 0.36, z);
    g.add(wh);
  }
  const lamps = [-0.35, 0.35].map((x) => {
    const glow = K.makeGlow("#3d7bff", 4);
    glow.position.set(x, 1.95, -0.2);
    g.add(glow);
    return glow;
  });
  const head = K.makeGlow("#f2f6ff", 3);
  head.position.set(0, 0.7, 2.4);
  g.add(head);
  return { g, lamps };
}
for (let i = 0; i < 2; i++) {
  const pc = makePoliceCar();
  scene.add(pc.g);
  policeCars.push(pc);
}

// =====================================================================
// MENSCHEN
// =====================================================================
const SKIN = ["#f0cfae", "#e5bd98", "#c99a72", "#8d5e3c"];
const civilian = (extra = {}) => ({
  shirt: pick(["#c0392b", "#2e86de", "#16a085", "#8e44ad", "#d35400", "#7f8c8d", "#ecf0f1", "#34495e"]),
  pants: pick(["#2c3e50", "#3b5a8a", "#8a7a5a", "#1f1f24"]), hair: pick(["#2b1d14", "#4a3222", "#c9a45a", "#8a8a8a"]),
  skin: pick(SKIN), hairStyle: pick(["short", "short", "long", "bald", "cap"]), sleeves: "long", ...extra,
});
const thiefOpts = (c) => ({ shirt: c, pants: "#141418", shoes: "#0e0e10", hood: true, hoodColor: c, skin: "#25262a" }); // Sturmhaube
function spawn(opts, parent = scene) {
  const ch = K.makeCharacter(opts);
  ch.root.visible = false;
  parent.add(ch.root);
  return ch;
}
const place = (ch, p, yaw) => { ch.root.position.set(p.x, p.y ?? 0.05, p.z); ch.root.rotation.y = yaw; };

// Taschenlampe: Lichtkegel + sichtbarer Strahl in der rechten Hand
function addFlashlight(ch) {
  const hand = ch.arms[1].hand;
  const torch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), K.lambert("#1a1a1a"));
  torch.position.set(0, -0.06, 0.02);
  hand.add(torch);
  const spot = new THREE.SpotLight("#eaf2ff", 0, 18, 0.33, 0.55, 1.2);
  spot.position.set(0, -0.1, 0);
  const tgt = new THREE.Object3D();
  tgt.position.set(0, -5, 0.6);
  hand.add(spot, tgt);
  spot.target = tgt;
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.75, 5, 16, 1, true).translate(0, -2.6, 0),
    new THREE.MeshBasicMaterial({ color: "#cfe0ff", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.rotation.x = 0.12;
  hand.add(beam);
  const lens = K.makeGlow("#f2f7ff", 0.35);
  lens.position.set(0, -0.16, 0.02);
  hand.add(lens);
  return { spot, beam, lens };
}
function setFlashlight(f, on) {
  f.spot.intensity = 26 * on;
  f.beam.material.opacity = 0.09 * on;
  f.lens.material.opacity = on;
}
function addAxe(ch) {
  const g = new THREE.Group();
  box(0.035, 0.75, 0.035, "#6b4a2e", 0, -0.32, 0.04, g);
  box(0.03, 0.14, 0.2, "#9aa1a8", 0, -0.66, 0.12, g);
  ch.arms[1].hand.add(g);
  return g;
}
function addGrinder(ch) {
  const g = new THREE.Group();
  box(0.08, 0.28, 0.08, "#2b6fd6", 0, -0.12, 0.04, g);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.01, 14), K.lambert("#9aa1a8"));
  disc.rotation.z = Math.PI / 2;
  disc.position.set(0, -0.28, 0.1);
  g.add(disc);
  ch.arms[1].hand.add(g);
  return g;
}

// Täter
const sawer = spawn(thiefOpts("#1c1d22"));
addGrinder(sawer);
const thieves = [spawn(thiefOpts("#1c1d22")), spawn(thiefOpts("#24222a"))];
const torches = thieves.map(addFlashlight);
const axes = thieves.map(addAxe);
// Passanten am Tag
const tourists = Array.from({ length: 9 }, (_, i) => ({ ch: spawn(civilian()), z0: -70 + i * 9 + rand() * 4, sp: 0.9 + rand() * 0.5, dir: i % 2 ? 1 : -1, x: -95.5 - rand() * 1.4, ph: rand() * 10 }));

// =====================================================================
// JUWELENZIMMER
// =====================================================================
const room = setGroup();
room.position.copy(J);
const marble = K.canvasTexture(512, 512, (g) => {
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    g.fillStyle = (i + j) % 2 ? "#d8d2c4" : "#5a5248";
    g.fillRect(i * 64, j * 64, 64, 64);
  }
});
marble.wrapS = marble.wrapT = THREE.RepeatWrapping;
marble.repeat.set(2, 2);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), new THREE.MeshLambertMaterial({ map: marble }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
room.add(floor);
box(14, 0.3, 12, "#141210", 0, 6.2, 0, room);
const wallMat = { emissive: "#06100c" };
box(14, 6.4, 0.3, "#1f4a3a", 0, 3.1, -6, room, wallMat);
box(14, 6.4, 0.3, "#1f4a3a", 0, 3.1, 6, room, wallMat);
box(0.3, 6.4, 12, "#1f4a3a", -7, 3.1, 0, room, wallMat);
box(0.3, 6.4, 12, "#1f4a3a", 7, 3.1, 0, room, wallMat);
for (const x of [-5, -2.5, 0, 2.5, 5]) { // goldene Leisten und Spiegelflächen
  box(0.12, 5.6, 0.08, "#c9a64a", x, 3, -5.82, room, { emissive: "#2a1e06" });
  box(2.1, 4.2, 0.04, "#26323a", x + 1.25, 3, -5.84, room, { emissive: "#0a0f12" });
}
box(13.6, 0.18, 0.1, "#c9a64a", 0, 5.4, -5.8, room, { emissive: "#2a1e06" });
box(13.6, 0.18, 0.1, "#c9a64a", 0, 0.6, -5.8, room, { emissive: "#2a1e06" });
// das Fenster, durch das sie kamen (linke Wand)
plane(1.6, 2.4, new THREE.MeshBasicMaterial({ color: "#2a3f6a" }), -6.83, 2.4, 1.5, Math.PI / 2, room);
const moon = new THREE.PointLight("#7f9cff", 6, 14, 1.4);
moon.position.set(-5.8, 2.6, 1.5);
room.add(moon);
// Vitrine
box(3.4, 0.95, 1.3, "#3a2414", 0, 0.475, 0, room);
box(3.2, 0.06, 1.1, "#5a0f1a", 0, 0.98, 0, room);
const glassMat = new THREE.MeshBasicMaterial({ color: "#cfe6ff", transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide });
const vitrineGlass = new THREE.Mesh(new THREE.BoxGeometry(3.25, 1.0, 1.15), glassMat);
vitrineGlass.position.set(0, 1.5, 0);
room.add(vitrineGlass);
const vitrineEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(3.25, 1.0, 1.15)), new THREE.LineBasicMaterial({ color: "#b9a46a" }));
vitrineEdges.position.copy(vitrineGlass.position);
room.add(vitrineEdges);
// Löcher im Glas (Sternbruch) an den Treffpunkten
const crackTex = K.canvasTexture(256, 256, (g) => {
  g.strokeStyle = "rgba(255,255,255,0.95)";
  g.lineWidth = 3;
  const r = K.mulberry32(9);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r() * 0.2;
    g.beginPath(); g.moveTo(128, 128);
    let x = 128, y = 128;
    for (let k = 0; k < 4; k++) { x += Math.cos(a + (r() - 0.5) * 0.5) * 28; y += Math.sin(a + (r() - 0.5) * 0.5) * 28; g.lineTo(x, y); }
    g.stroke();
  }
  g.fillStyle = "rgba(10,12,16,0.9)";
  g.beginPath(); g.arc(128, 128, 30, 0, Math.PI * 2); g.fill();
});
const HIT_POINTS = [[-0.7, 1.55], [0.5, 1.4], [-0.15, 1.7], [0.95, 1.6]];
const cracks = HIT_POINTS.map(([x, y]) => {
  const m = plane(0.75, 0.75, new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, opacity: 0, depthWrite: false }), x, y, 0.585, 0, room);
  return m;
});
const glassShards = new THREE.InstancedMesh(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([-0.05, -0.04, 0, 0.06, -0.03, 0, 0, 0.07, 0], 3)),
  new THREE.MeshBasicMaterial({ color: "#e4f2ff", transparent: true, opacity: 0.9, side: THREE.DoubleSide }), 120);
glassShards.frustumCulled = false;
room.add(glassShards);
const shardInfo = Array.from({ length: 120 }, (_, i) => ({ hit: i % 4, v: [(rand() - 0.5) * 2.4, 0.4 + rand() * 1.8, 0.6 + rand() * 1.8], rot: rand() * 6, spin: (rand() - 0.5) * 20, s: 0.6 + rand() * 1.4 }));
// 21 Schmuckstücke (das 8. ist die Epaulette mit dem „Sächsischen Weißen“)
const jewels = [];
for (let i = 0; i < 21; i++) {
  const row = Math.floor(i / 7), col = i % 7;
  const isWhite = i === 8;
  const j = K.makeJewel(100 + i, { width: isWhite ? 0.3 : 0.18 + rand() * 0.08, gems: 6 + Math.floor(rand() * 6), big: isWhite ? 0.035 : 0 });
  j.position.set(-1.35 + col * 0.45, 1.02, -0.35 + row * 0.35);
  room.add(j);
  jewels.push(j);
}
const MISSING = [8, 15, 19]; // fehlen nach der Rückgabe
const alarmLight = new THREE.PointLight("#ff2a2a", 0, 16, 1.2);
alarmLight.position.set(0, 5.6, -4);
room.add(alarmLight);
const alarmLamp = K.makeGlow("#ff3a3a", 1.4);
alarmLamp.position.set(0, 5.7, -5.7);
room.add(alarmLamp);
const museumLights = [-4, 0, 4].map((x) => {
  const l = new THREE.PointLight("#ffe8c8", 0, 14, 1.2);
  l.position.set(x, 5.5, 0);
  room.add(l);
  return l;
});
const emptySpot = new THREE.SpotLight("#fff4dc", 0, 9, 0.24, 0.35, 1);
emptySpot.position.set(jewels[8].position.x, 5.5, jewels[8].position.z);
const emptyTgt = new THREE.Object3D();
emptyTgt.position.copy(jewels[8].position);
room.add(emptySpot, emptyTgt);
const emptyPad = box(0.34, 0.04, 0.26, "#3a0a12", jewels[8].position.x, 1.03, jewels[8].position.z, room); // leere Halterung
emptySpot.target = emptyTgt;
// Löschpulver-Wolke
const powder = Array.from({ length: 16 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.glowTexture(), color: "#f0f0f0", transparent: true, opacity: 0, depthWrite: false }));
  room.add(s);
  return { s, d: [(rand() - 0.5) * 4, rand() * 2, (rand() - 0.5) * 3], ph: rand() };
});
const powderOut = Array.from({ length: 10 }, () => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: K.glowTexture(), color: "#f4f4f4", transparent: true, opacity: 0, depthWrite: false }));
  city.add(s);
  return { s, d: [-(1 + rand() * 3), rand() * 1.5, (rand() - 0.5) * 2.5], ph: rand() };
});

// =====================================================================
// TIEFGARAGE
// =====================================================================
const garage = setGroup();
garage.position.copy(G);
box(40, 0.2, 30, "#5a5c60", 0, -0.1, 0, garage);
box(40, 0.3, 30, "#45474b", 0, 3.2, 0, garage);
box(40, 3.3, 0.4, "#4e5054", 0, 1.6, -15, garage);
for (let x = -16; x <= 16; x += 8) for (const z of [-6, 6]) box(0.6, 3.1, 0.6, "#6a6c70", x, 1.55, z, garage);
for (let x = -14; x <= 14; x += 7) box(2.2, 0.06, 0.25, "#e8f2ff", x, 3.02, 0, garage, { emissive: "#c8daff" });
const garageLamps = [-8, 8].map((x) => { const l = new THREE.PointLight("#d8e8ff", 10, 18, 1.4); l.position.set(x, 2.8, 0); garage.add(l); return l; });
function sedan(color) {
  const g = new THREE.Group();
  box(1.9, 0.62, 4.6, color, 0, 0.55, 0, g);
  box(1.7, 0.55, 2.4, "#1e2228", 0, 1.12, -0.1, g);
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.28, 10).rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.95, 1.5], [0.95, 1.5], [-0.95, -1.5], [0.95, -1.5]]) {
    const wh = new THREE.Mesh(wheelGeo, K.lambert("#141414"));
    wh.position.set(x, 0.34, z);
    g.add(wh);
  }
  return g;
}
const audi = sedan("#2b2f36");
audi.position.set(0, 0, -9);
garage.add(audi);
const audiBurnt = sedan("#121212");
audiBurnt.position.copy(audi.position);
audiBurnt.visible = false;
garage.add(audiBurnt);
for (const [x, c] of [[-3, "#8a9099"], [3, "#a83a2e"], [-6, "#e7e7e7"], [6, "#2e5fb8"], [9, "#4b6b3a"]]) {
  const s = sedan(c);
  s.position.set(x, 0, -9);
  garage.add(s);
}
const garageFire = K.makeFire(garage, [0, 0, -9], { size: 0.85, seed: 31 });
const garageFire2 = K.makeFire(garage, [-3, 0, -9], { size: 0.55, seed: 32, light: false });
const garageFire3 = K.makeFire(garage, [3, 0, -9], { size: 0.55, seed: 33, light: false });
const garageSmoke = K.makeSmoke(garage, [0, 1.2, -9], { seed: 34, count: 10, color: "#3a3a3a" });

// =====================================================================
// BERLIN (Razzia)
// =====================================================================
const berlin = setGroup();
berlin.position.copy(B);
box(900, 0.4, 900, "#2e3a2c", 0, -0.2, 0, berlin);
box(200, 0.06, 14, "#3c3f44", 0, 0.035, 20, berlin);
box(70, 33, 13, "#b9b3a6", 0, 16.5, -2, berlin);
const plWins = [];
for (let y = 3; y < 32; y += 3) for (let x = -32; x <= 32; x += 3.2) plWins.push([x, y]);
const plWin = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshBasicMaterial({ color: "#ffffff" }), plWins.length);
{
  const m = new THREE.Matrix4(), c = new THREE.Color(), q = new THREE.Quaternion();
  plWins.forEach(([x, y], i) => {
    m.compose(V3(x, y, 4.56), q, V3(1, 1, 1));
    plWin.setMatrixAt(i, m);
    plWin.setColorAt(i, c.set(rand() < 0.22 ? "#f2c46e" : "#2a3140"));
  });
}
berlin.add(plWin);
box(4, 3, 1, "#3a3f46", 0, 1.5, 5, berlin);
const entranceGlow = K.makeGlow("#ffe2a8", 3);
entranceGlow.position.set(0, 3.2, 5.6);
berlin.add(entranceGlow);
// Fernsehturm
const tv = new THREE.Group();
tv.position.set(-20, 0, -250);
berlin.add(tv);
const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.5, 200, 10), K.lambert("#c9ccd1"));
shaft.position.y = 100;
tv.add(shaft);
const ball = new THREE.Mesh(new THREE.SphereGeometry(16, 16, 12), K.lambert("#aeb5bd"));
ball.position.y = 206;
tv.add(ball);
const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 120, 6), K.lambert("#d64a3a"));
ant.position.y = 280;
tv.add(ant);
const tvTip = K.makeGlow("#ff3030", 8);
tvTip.position.y = 342;
tv.add(tvTip);
// Einsatzwagen + Spezialkräfte
const vans = [-14, -4, 10].map((x, i) => {
  const g = new THREE.Group();
  box(2.3, 2.3, 5.4, "#e9edf2", 0, 1.35, 0, g);
  box(2.32, 0.4, 5.42, "#1f4fbf", 0, 1.0, 0, g);
  const lamps = [-0.5, 0.5].map((x2) => { const gl = K.makeGlow("#3d7bff", 5); gl.position.set(x2, 2.7, 1.8); g.add(gl); return gl; });
  g.position.set(x, 0.05, 19);
  g.rotation.y = Math.PI / 2 + (i - 1) * 0.15;
  berlin.add(g);
  return { g, lamps };
});
const swat = Array.from({ length: 6 }, (_, i) => {
  const ch = spawn({ shirt: "#1a2130", pants: "#151a24", shoes: "#0d0d0f", hairStyle: "cap", capColor: "#151b26", skin: "#1c1f26" }, berlin);
  return { ch, start: [-12 + i * 4.2, 22 - (i % 2) * 1.5], ph: rand() };
});
const blueLight = new THREE.PointLight("#3d6bff", 0, 60, 1.2);
blueLight.position.set(0, 5, 22);
berlin.add(blueLight);

// =====================================================================
// ASSERVATEN + GERICHT
// =====================================================================
const evidence = setGroup();
evidence.position.copy(E);
box(4, 0.9, 2.2, "#141414", 0, 0.45, 0, evidence);
box(30, 0.2, 30, "#2a2622", 0, -0.1, 0, evidence);
const evJewels = [];
for (let i = 0; i < 18; i++) {
  const j = K.makeJewel(300 + i, { width: 0.2 + rand() * 0.1, gems: 6 + Math.floor(rand() * 6) });
  j.position.set(-1.5 + (i % 6) * 0.6, 0.92, -0.65 + Math.floor(i / 6) * 0.65);
  evidence.add(j);
  evJewels.push(j);
  if (i % 2 === 0) {
    const tag = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.12, 3), K.lambert("#f2c21a"));
    tag.position.set(j.position.x + 0.18, 0.96, j.position.z + 0.12);
    evidence.add(tag);
  }
}
const evLamp = new THREE.SpotLight("#fff1d6", 60, 10, 0.6, 0.6, 1.1);
evLamp.position.set(0, 4.5, 0.5);
const evTgt = new THREE.Object3D();
evidence.add(evLamp, evTgt);
evLamp.target = evTgt;

const court = setGroup();
court.position.copy(CT);
box(18, 0.2, 18, "#6b5238", 0, -0.1, 0, court);
box(18, 7, 0.3, "#5a3e24", 0, 3.5, -7, court);
box(0.3, 7, 18, "#5a3e24", -9, 3.5, 0, court);
box(0.3, 7, 18, "#5a3e24", 9, 3.5, 0, court);
box(10, 1.5, 1.6, "#4a321c", 0, 0.75, -4.6, court);
box(10, 0.9, 1.6, "#3a2614", 0, 1.95, -5.2, court);
const courtLights = [-4, 4].map((x) => { const l = new THREE.PointLight("#ffe6c4", 18, 20, 1.2); l.position.set(x, 6, -1); court.add(l); return l; });
const judges = [-2.4, 0, 2.4].map((x) => { const ch = spawn({ shirt: "#121212", pants: "#121212", hair: "#8a8a8a", skin: pick(SKIN) }, court); place(ch, { x, z: -5.6, y: 0.75 }, 0); return ch; });
const defendants = [-3.2, -1.6, 0, 1.6, 3.2].map((x) => { const ch = spawn(civilian(), court); place(ch, { x, z: -1.2 }, Math.PI); return ch; });

// =====================================================================
// DER „SÄCHSISCHE WEISSE“
// =====================================================================
const voidSet = setGroup();
voidSet.position.copy(VD);
const bigDiamond = K.makeBrilliant(1.1);
bigDiamond.material.transparent = true;
bigDiamond.position.set(0, 2.2, 0);
voidSet.add(bigDiamond);
const sparkleLights = ["#ffffff", "#bfe0ff", "#ffe8c8"].map((c) => { const l = new THREE.PointLight(c, 30, 12, 1.2); voidSet.add(l); return l; });
const glints = Array.from({ length: 6 }, () => { const s = K.makeGlow("#ffffff", 0.5); voidSet.add(s); return { s, ph: rand() * 10, a: rand() * Math.PI * 2, y: rand() }; });
const dust = Array.from({ length: 30 }, () => { const s = K.makeGlow("#8fb4ff", 0.06); voidSet.add(s); return { s, p: [(rand() - 0.5) * 6, rand() * 5, (rand() - 0.5) * 4], ph: rand() * 10 }; });

// =====================================================================
// KAMERA
// =====================================================================
const jw = (x, y, z) => [J.x + x, J.y + y, J.z + z];
const at = (base, x, y, z) => [base.x + x, base.y + y, base.z + z];
const rig = new K.CameraRig([
  // Hook: von hinter der Vitrine durchs Glas auf die beiden Täter, Juwelen im Vordergrund
  { t0: 0, t1: C.s1 - 0.02, from: { pos: jw(0.05, 1.1, -3.0), tgt: jw(-0.15, 1.85, 1.2) }, to: { pos: jw(-0.05, 1.12, -2.5), tgt: jw(-0.2, 1.82, 1.2) }, fov: 50 },
  { t0: C.s1, t1: C.s2 - 0.02, from: { pos: at(VD, 0, 2.0, 7.8), tgt: at(VD, 0, 1.5, 0) }, to: { pos: at(VD, 0, 1.95, 6.6), tgt: at(VD, 0, 1.5, 0) }, fov: 45 },
  { t0: C.s2, t1: C.s3 - 0.02, from: { pos: [30, 38, 235], tgt: [-5, 14, -10] }, to: { pos: [18, 30, 195], tgt: [-12, 14, -14] }, fov: 52 },
  { t0: C.s3, t1: C.s4 - 0.02, from: { pos: [-92.9, 1.7, -21.4], tgt: [-90.2, 1.9, -24.8] }, to: { pos: [-92.5, 1.75, -21.9], tgt: [-90.2, 1.9, -24.8] }, fov: 52 },
  { t0: C.s4, t1: C.s5 - 0.02, from: { pos: [-120, 5, 6], tgt: [-90, 2.8, -25] }, to: { pos: [-118, 5, 2], tgt: [-90, 2.8, -26] }, fov: 50 },
  { t0: C.s5, t1: C.s6 - 0.02, from: { pos: [-4.5, 1.4, 30.5], tgt: [-10, 1.1, 36] }, to: { pos: [-5.2, 1.5, 31.2], tgt: [-10, 1.2, 36] }, fov: 52 },
  { t0: C.s6, t1: C.s7 - 0.02, from: { pos: [16, 26, 74], tgt: [-48, 2, 18] }, to: { pos: [12, 24, 70], tgt: [-50, 2, 16] }, fov: 55 },
  { t0: C.s7, t1: C.s8 - 0.02, from: { pos: [-99, 2.2, -21], tgt: [-90, 2.2, -25] }, to: { pos: [-98, 2.1, -22], tgt: [-90, 2.2, -25] }, fov: 50 },
  { t0: C.s8, t1: C.s9 - 0.02, from: { pos: jw(-3.6, 1.5, 4.0), tgt: jw(0, 1.3, 0) }, to: { pos: jw(-3.0, 1.4, 3.4), tgt: jw(0, 1.3, 0) }, fov: 52 },
  { t0: C.s9, t1: C.s10 - 0.02, from: { pos: jw(0.15, 3.1, 0.55), tgt: jw(0, 1.0, 0) }, to: { pos: jw(-0.1, 2.75, 0.45), tgt: jw(-0.1, 1.0, 0) }, fov: 50 },
  { t0: C.s10, t1: C.s11 - 0.02, from: { pos: jw(6.4, 5.7, 5.4), tgt: jw(0, 0.9, 0.3) }, to: { pos: jw(6.4, 5.7, 5.4), tgt: jw(0, 0.9, 0.3) }, fov: 62 },
  { t0: C.s11, t1: C.s12 - 0.02, from: { pos: [3, 1.1, -14], tgt: [6, 1.4, -70] }, to: { pos: [3, 1.1, -14], tgt: [6, 1.4, -66] }, fov: 50 },
  { t0: C.s12, t1: C.s13 - 0.02, from: { pos: [-103, 2.6, -25], tgt: [-90, 2.1, -25] }, to: { pos: [-104, 2.8, -24.5], tgt: [-90, 2.1, -25] }, fov: 55 },
  { t0: C.s13, t1: C.s14 - 0.02, from: { pos: at(G, -5.5, 1.5, 0.5), tgt: at(G, 0, 1, -9) }, to: { pos: at(G, -4.6, 1.4, -0.5), tgt: at(G, 0, 1, -9) }, fov: 52 },
  { t0: C.s14, t1: C.s15 - 0.02, from: { pos: jw(0, 1.75, 5.2), tgt: jw(0, 1.2, 0) }, to: { pos: jw(0, 1.55, 3.2), tgt: jw(0, 1.15, 0) }, fov: 50 },
  { t0: C.s15, t1: C.s16 - 0.02, from: { pos: at(B, 12, 3.4, 76), tgt: at(B, -4, 26, 0) }, to: { pos: at(B, 10, 3.2, 70), tgt: at(B, -4, 27, 0) }, fov: 55 },
  { t0: C.s16, t1: C.s17 - 0.02, from: { pos: at(E, 0, 3.0, 2.2), tgt: at(E, 0, 0.9, 0) }, to: { pos: at(E, 0.2, 2.2, 1.4), tgt: at(E, 0, 0.9, -0.1) }, fov: 50 },
  { t0: C.s17, t1: C.s18 - 0.02, from: { pos: at(CT, 0.5, 2.0, 7.5), tgt: at(CT, 0, 2.2, -5) }, to: { pos: at(CT, 0.3, 2.0, 6.0), tgt: at(CT, 0, 2.2, -5) }, fov: 50 },
  { t0: C.s18, t1: C.s18b - 0.02, from: { pos: jw(-1.0, 1.85, 1.45), tgt: jw(-0.9, 1.02, 0) }, to: { pos: jw(-0.95, 1.6, 0.95), tgt: jw(-0.9, 1.02, 0) }, fov: 46 },
  { t0: C.s18b, t1: C.end - 0.02, from: { pos: at(VD, 0, 2.2, 8.0), tgt: at(VD, 0, 1.5, 0) }, to: { pos: at(VD, 0, 2.1, 6.6), tgt: at(VD, 0, 1.5, 0) }, fov: 45 },
  { t0: C.end, t1: 60, from: { pos: at(VD, 0, 2.6, 4.6), tgt: at(VD, 0, 2.2, 0) }, to: { pos: at(VD, 0, 2.6, 5.4), tgt: at(VD, 0, 2.2, 0) }, fov: 45 },
]);

// =====================================================================
// PRO FRAME
// =====================================================================
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
const HITS = C.hits;
const lastHit = (t) => { let h = null; for (const x of HITS) if (t >= x - 0.3) h = x; return h; };
const robbed = (i, t) => t >= C.grabStart + (i / 21) * (C.grabEnd - C.grabStart);

function updateWorld(t) {
  const ff = t < C.s1; // Flash-Forward im Hook: der Axthieb in Zeitlupe
  city.visible = between(t, C.s2, C.s8) || between(t, C.s11, C.s13);
  room.visible = ff || between(t, C.s8, C.s11) || between(t, C.s14, C.s15) || between(t, C.s18, C.s18b);
  garage.visible = between(t, C.s13, C.s14);
  berlin.visible = between(t, C.s15, C.s16);
  evidence.visible = between(t, C.s16, C.s17);
  court.visible = between(t, C.s17, C.s18);
  voidSet.visible = between(t, C.s1, C.s2) || t >= C.s18b;

  // --- Gitter: sägen, herausnehmen, wieder einsetzen
  const sawing = between(t, C.gridCut, C.gridOut);
  sparks.forEach((sp) => {
    const u = ((t * 2.2 + sp.ph) % 1);
    sp.s.visible = sawing && city.visible;
    sp.s.position.set(TARGET.x - 0.2 - u * sp.v * 0.25, TARGET.y - 0.05 + Math.sin(sp.a) * u * 0.6 - u * u * 0.8, TARGET.z - 0.05 + Math.cos(sp.a) * u * sp.v * 0.3);
    sp.s.material.opacity = 1 - u;
  });
  const pieceOut = K.ramp(t, C.gridOut, C.gridOut + 0.4) * (1 - K.ramp(t, C.gridBack, C.gridBack + 0.5));
  const entered = t >= C.entry + 0.6 && t < C.s18; // in der Tatnacht ist das Stück draußen
  cutPiece.position.set(-0.55 * (entered ? 1 : pieceOut), entered ? -0.35 : 0, 0);
  cutPiece.rotation.z = entered ? 1.2 : 0;

  // --- Stromkasten und Laternen
  const fireOn = t >= C.fireBox && t < C.s8 ? 1 : 0;
  boxFire.update(t, K.ramp(t, C.fireBox, C.fireBox + 0.5) * fireOn);
  boxSmoke.update(t, fireOn * K.ramp(t, C.fireBox + 0.2, C.fireBox + 1.2));
  boxSparks.forEach((sp) => {
    const u = ((t * 3 + sp.ph) % 1);
    sp.s.visible = between(t, C.fireBox - 0.1, C.fireBox + 1.6);
    sp.s.position.set(POWERBOX.x + Math.cos(sp.a) * u * sp.v, 1.6 + u * 1.2 - u * u * 2, POWERBOX.z + Math.sin(sp.a) * u * sp.v);
    sp.s.material.opacity = 1 - u;
  });
  pbox.material.color.set(t >= C.fireBox + 0.8 ? "#3b3e42" : "#7d8288");
  const night = !between(t, C.s2, C.s3) && !between(t, C.s4, C.s5);
  const tatnacht = t >= C.s5;
  lanterns.forEach((l) => {
    const on = night && !(tatnacht && t >= l.tOff) ? 1 : 0;
    l.glow.material.opacity = on * 0.9;
    l.head.material.color.set("#ffd89a").multiplyScalar(0.18 + 0.82 * on);
    if (l.refl) l.refl.material.opacity = on * (0.35 + 0.15 * Math.sin(t * 2 + l.tOff * 9));
  });
  const floodOn = night && !(tatnacht && t >= C.lightsOut + 0.4) ? 1 : 0;
  floods.forEach((f) => { f.material.opacity = floodOn * 0.55; });
  palaceMat.emissive.set("#3a2814").multiplyScalar(floodOn);
  palWin.material.color.setScalar(night ? 1 : 0.35);
  blockWins.material.color.setScalar(night ? 1 : 0.25);

  // --- Polizeiautos
  policeCars.forEach((pc, i) => {
    pc.g.visible = between(t, C.s11, C.s12);
    const z = -64 + (t - C.s11) * 14 - i * 9;
    pc.g.position.set(5.5 - i * 0.2, 0.05, z);
    pc.g.rotation.y = 0;
    pc.lamps.forEach((l, k) => { l.material.opacity = Math.floor(t * 7 + k + i) % 2 ? 1 : 0.1; });
  });

  // --- Täter am Gitter
  sawer.root.visible = between(t, C.s3, C.s4);
  if (sawer.root.visible) {
    place(sawer, { x: TARGET.x - 0.62, z: TARGET.z - 0.55 }, Math.PI / 2);
    K.animateCharacter(sawer, { t, crouch: 0.55, arm: "reach", headPitch: 0.2 });
  }
  // --- Einstieg (S7), Tat im Zimmer (S8–S10), Flucht (S12)
  const inRoom = between(t, C.s8, C.s11);
  thieves.forEach((th, i) => {
    if (ff) { // Zeitlupe: Täter 0 holt aus und trifft auf "Axt", Täter 1 leuchtet
      th.root.visible = true;
      const p = i === 0 ? { x: J.x - 0.7, z: J.z + 1.15 } : { x: J.x + 0.62, z: J.z + 1.3 };
      place(th, p, Math.PI);
      K.animateCharacter(th, { t, arm: i === 0 ? "chop" : "flare", armT: (t - C.hookHit) * 0.3, lean: 0.08, headPitch: 0.15 });
      axes[i].visible = i === 0;
      setFlashlight(torches[i], i === 0 ? 0.6 : 1);
      torches[i].beam.material.opacity = 0; // Strahlkegel zeigt sonst direkt in die Kamera
      return;
    }
    let vis = false;
    if (between(t, C.s7, C.s8)) { // steigen durchs Fenster
      vis = true;
      const go = K.clamp((t - C.entry - i * 0.9) / 1.0);
      const x = K.lerp(TARGET.x - 1.2 - i * 0.8, TARGET.x + 0.4, go);
      place(th, { x, z: TARGET.z + (i ? 0.5 : -0.3), y: 0.05 + Math.sin(Math.PI * go) * 0.5 }, Math.PI / 2);
      K.animateCharacter(th, { t, gait: go > 0 && go < 1 ? "walk" : "idle", phase: t * 6, crouch: Math.sin(Math.PI * go) * 0.7, arm: "flare" });
      th.root.visible = go < 0.98;
      setFlashlight(torches[i], 1);
      axes[i].visible = false;
      return;
    }
    if (inRoom) {
      vis = true;
      const p = i === 0 ? { x: J.x - 0.7, z: J.z + 1.15 } : { x: J.x + 0.75, z: J.z + 1.2 };
      place(th, p, Math.PI);
      const h = lastHit(t);
      const chopping = t < C.grabStart && h !== null;
      const arm = chopping && (HITS.indexOf(h) % 2 === i) ? "chop" : t >= C.grabStart ? "reach" : "flare";
      K.animateCharacter(th, { t, arm, armT: h !== null ? t - h : 0, lean: arm === "reach" ? 0.25 : 0.05, headPitch: 0.15 });
      axes[i].visible = arm === "chop";
      setFlashlight(torches[i], arm === "chop" ? 0.6 : 1);
    }
    if (between(t, C.s12, C.s13)) { // raus durchs Fenster und weg
      vis = true;
      const go = K.clamp((t - C.tooLate - 0.1 - i * 0.55) / 2.4);
      const x = TARGET.x - 0.2 - go * 3.8;
      place(th, { x, z: TARGET.z + go * 2.6 + i * 0.7, y: 0.05 }, Math.atan2(-3.8, 2.6));
      K.animateCharacter(th, { t, gait: "run", phase: go * 14, arm: "swing" });
      th.root.visible = go > 0.02;
      setFlashlight(torches[i], 0);
      axes[i].visible = false;
      return;
    }
    th.root.visible = vis;
  });

  // --- Vitrine: Treffer, Löcher, Splitter
  const restored = t >= C.s18;
  HITS.forEach((h, k) => { cracks[k].material.opacity = ff ? (k === 0 && t >= C.hookHit ? 1 : 0) : !restored && t >= h && !ff ? 1 : 0; });
  glassShards.visible = ff ? t >= C.hookHit : !restored && t >= HITS[0];
  if (glassShards.visible) {
    shardInfo.forEach((d, i) => {
      const h = ff ? (d.hit === 0 ? C.hookHit : 1e9) : HITS[d.hit];
      const dt = Math.max(0, t - h) * (ff ? 0.3 : 1);
      const [hx, hy] = HIT_POINTS[d.hit];
      const tl = (d.v[1] + Math.sqrt(d.v[1] * d.v[1] + 2 * 9.8 * hy)) / 9.8;
      const tt = Math.min(dt, tl);
      const y = dt < tl ? hy + d.v[1] * tt - 4.9 * tt * tt : 0.01;
      v3.set(J.x + hx + d.v[0] * tt * 0.6, J.y + y, J.z + 0.6 + d.v[2] * tt * 0.6);
      m4.compose(v3.sub(J), q.setFromEuler(e3.set(dt >= tl ? -Math.PI / 2 : d.rot + d.spin * tt, d.rot, 0)), s3.setScalar(t >= h ? d.s * (ff ? 1.6 : 1) : 0.0001));
      glassShards.setMatrixAt(i, m4);
    });
    glassShards.instanceMatrix.needsUpdate = true;
  }
  jewels.forEach((j, i) => {
    let vis = !robbed(i, t);
    if (between(t, C.s14, C.s15)) vis = false;
    if (restored) vis = !MISSING.includes(i);
    j.visible = vis;
    j.userData.glint.material.opacity = 0.5 + 0.5 * Math.sin(t * 6 + j.userData.ph);
  });
  // im Hook leuchtet das Mondlicht aus der Vitrine von unten in die Gesichter
  if (ff) { moon.position.set(0.2, 1.35, -0.2); moon.intensity = 9; } else { moon.position.set(-5.8, 2.6, 1.5); moon.intensity = 6; }
  const alarm = ((ff && t >= C.hookHit) || (t >= HITS[0] && t < C.s15)) ? (Math.sin(t * 8) > 0 ? 1 : 0) : 0;
  alarmLight.intensity = 14 * alarm;
  alarmLamp.material.opacity = alarm;
  museumLights.forEach((l) => { l.intensity = restored ? 14 : 0; });
  emptySpot.intensity = restored ? 140 : 0;
  emptyPad.visible = restored;
  powder.forEach((p) => {
    const a = t >= C.powder ? K.ramp(t, C.powder, C.powder + 0.8) : 0;
    const settle = between(t, C.s14, C.s15) ? 0.5 : a;
    const u = (t * 0.15 + p.ph) % 1;
    p.s.position.set(p.d[0] * (0.4 + settle), 0.6 + p.d[1] + u * 0.6, p.d[2] * (0.4 + settle));
    p.s.scale.setScalar(1.5 + settle * 2.5);
    p.s.material.opacity = (t < C.s15 ? settle : 0) * 0.35;
  });
  powderOut.forEach((p) => {
    const a = between(t, C.s12, C.s13) ? K.ramp(t, C.powder, C.powder + 1.2) : 0;
    const u = (t * 0.25 + p.ph) % 1;
    p.s.position.set(TARGET.x + p.d[0] * a, TARGET.y + p.d[1] * a + u * 0.8, TARGET.z + p.d[2] * a);
    p.s.scale.setScalar(0.8 + a * 1.5);
    p.s.material.opacity = a * 0.28 * (1 - u * 0.5);
  });

  // --- Tiefgarage
  const ign = t >= C.garageFire;
  audi.visible = !ign;
  audiBurnt.visible = ign;
  garageFire.update(t, K.ramp(t, C.garageFire, C.garageFire + 0.35));
  garageFire2.update(t, K.ramp(t, C.spread, C.spread + 0.6));
  garageFire3.update(t, K.ramp(t, C.spread + 0.3, C.spread + 0.9));
  garageSmoke.update(t, K.ramp(t, C.garageFire + 0.3, C.garageFire + 1.5));
  garageLamps.forEach((l, i) => { l.intensity = Math.sin(t * 23 + i * 2) > -0.8 ? 10 : 2; });

  // --- Berlin
  if (berlin.visible) {
    const flash = Math.floor(t * 6) % 2;
    vans.forEach((v, i) => v.lamps.forEach((l, k) => { l.material.opacity = (flash + k + i) % 2 ? 1 : 0.08; }));
    blueLight.intensity = flash ? 40 : 6;
    swat.forEach((s, i) => {
      s.ch.root.visible = true;
      const go = K.clamp((t - C.raid - 0.2 - i * 0.12) / 2.2);
      const x = K.lerp(s.start[0], (i - 2.5) * 0.6, go), z = K.lerp(s.start[1], 6.5, go);
      place(s.ch, { x, z }, Math.PI);
      K.animateCharacter(s.ch, { t, gait: go < 1 ? "run" : "idle", phase: go * 18 + s.ph, lean: 0.3 });
    });
  }
  // --- Gericht
  judges.forEach((j) => { j.root.visible = court.visible; if (court.visible) K.animateCharacter(j, { t }); });
  defendants.forEach((d, i) => { d.root.visible = court.visible; if (court.visible) K.animateCharacter(d, { t: t + i, headPitch: 0.15 }); });
  // --- Diamant
  if (voidSet.visible) {
    bigDiamond.rotation.y = t * 0.6;
    bigDiamond.rotation.x = 0.35 + Math.sin(t * 0.7) * 0.1;
    const fade = t < C.s2 ? 1 : 1 - 0.7 * K.ramp(t, C.fade, C.fade + 0.8);
    bigDiamond.material.opacity = fade;
    sparkleLights.forEach((l, i) => {
      const a = t * (0.8 + i * 0.3) + i * 2;
      l.position.set(Math.cos(a) * 3, 2.2 + Math.sin(a * 1.3) * 1.5, Math.sin(a) * 3);
      l.intensity = 30 * fade;
    });
    glints.forEach((g) => {
      const tw = Math.max(0, Math.sin(t * 3 + g.ph)) ** 6;
      g.s.position.set(Math.cos(g.a + t * 0.6) * 0.9, 2.2 + (g.y - 0.3) * 0.8, Math.sin(g.a + t * 0.6) * 0.9 + 0.6);
      g.s.scale.setScalar(0.2 + tw * 1.4);
      g.s.material.opacity = tw * fade;
    });
    dust.forEach((d) => {
      d.s.position.set(d.p[0] + Math.sin(t * 0.3 + d.ph) * 0.3, (d.p[1] + t * 0.08) % 5, d.p[2]);
      d.s.material.opacity = 0.5;
    });
  }
  // --- Passanten am Tag (S4)
  tourists.forEach((p) => {
    p.ch.root.visible = between(t, C.s4, C.s5);
    if (!p.ch.root.visible) return;
    place(p.ch, { x: p.x, z: p.z0 + p.dir * p.sp * (t - C.s4) }, p.dir > 0 ? 0 : Math.PI);
    K.animateCharacter(p.ch, { gait: "walk", phase: p.sp * t * 2.6 + p.ph, t, headYaw: Math.sin(t + p.ph) * 0.3 });
  });
}

// HUD: Beute steigt mit jedem Schmuckstück
function updateHud(t) {
  const n = jewels.reduce((a, _, i) => a + (robbed(i, t) ? 1 : 0), 0);
  const value = t >= C.grabEnd ? 113800000 : Math.round((113800000 / 21) * n * (0.85 + 0.15 * Math.sin(n * 7.3) ** 2) / 1000) * 1000;
  hudNum.textContent = `${K.formatDE(Math.min(value, 113800000))} €`;
  if (t < C.s2) {
    const v = t < C.s1 ? 113800000 * K.easeOutCubic(K.clamp((t - C.hookHit) / 1.4)) : 113800000;
    hudNum.textContent = `${K.formatDE(Math.round(v / 1000) * 1000)} €`;
    hudSub.textContent = t < C.s1 ? "DRESDEN · 25. NOVEMBER 2019" : "„SÄCHSISCHER WEISSER“ · VERSCHOLLEN";
  } else if (t < C.s5) hudSub.textContent = "DRESDEN · RESIDENZSCHLOSS";
  else if (t < C.grabStart) hudSub.textContent = "25. NOVEMBER 2019 · KURZ VOR 5 UHR";
  else if (t < C.grabEnd) hudSub.textContent = `SCHMUCKSTÜCKE ${n} / 21`;
  else hudSub.textContent = "21 SCHMUCKSTÜCKE · 4.300 DIAMANTEN";
}

function renderAt(t) {
  const focus = rig.apply(camera, t);
  const [, mood, skyOn] = moodAt(t);
  sky.mesh.visible = skyOn;
  sky.mesh.position.copy(camera.position);
  scene.background = skyOn ? null : new THREE.Color(mood.fog);
  K.applyMood(K.moodAt([[0, mood], [1, mood]], 0), { scene, sky, lights, focus, camera });
  updateWorld(t);
  renderer.render(scene, camera);
  updateHud(t);
}

window.__hf = window.__hf || {};
window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.world = (async () => {
  await document.fonts.load("700 150px Inter");
  renderAt(window.__hfThreeTime || 0);
})();
window.addEventListener("hf-seek", (event) => renderAt(event.detail.time));
