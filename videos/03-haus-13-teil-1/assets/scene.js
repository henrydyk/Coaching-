// Szene: Haus Nr. 13 – Teil 1 (Gruselserie, Fiktion). Lindenstraße bei Nacht, das leere Haus gegenüber.
import * as THREE from "three";
import * as K from "./lowpoly-kit.js";

const W = 1080, H = 1920;
const C = JSON.parse(document.getElementById("cues").textContent);
const canvas = document.getElementById("three-layer");
const hudNum = document.getElementById("hud-num");
const hudSub = document.getElementById("hud-sub");

const renderer = K.createRenderer(canvas, W, H);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog("#0b111d", 40, 260);
const camera = new THREE.PerspectiveCamera(55, W / H, 0.05, 3000);
const sky = K.createSky(1400);
scene.add(sky.mesh);
const lights = K.createLights(scene);
const rand = K.mulberry32(1313);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (t, a, b) => t >= a && t < b;

// ---------- Schauplätze ----------
const BR = new THREE.Vector3(0, 0, -600); // Schlafzimmer
const HW = new THREE.Vector3(600, 0, 0);  // Flur mit Treppe und Haustür

// ---------- Stimmungen ----------
const NIGHT = {
  top: "#03060d", horizon: "#121a2c", bottom: "#05070b", fog: "#0b111d", fogNear: 40, fogFar: 260,
  sun: "#8ea8ff", sunI: 0.42, hemiSky: "#41507a", hemiGround: "#0d0d12", hemiI: 0.62, sunDir: [0.5, 0.7, 0.3], sunGlow: 0,
};
const DAY = {
  top: "#8e99a6", horizon: "#d3d6d8", bottom: "#6e7768", fog: "#c9cdd0", fogNear: 60, fogFar: 420,
  sun: "#f4f1ea", sunI: 1.25, hemiSky: "#e6e9ec", hemiGround: "#59604f", hemiI: 1.2, sunDir: [-0.5, 0.6, 0.45], sunGlow: 0.2,
};
const ROOM = {
  top: "#000000", horizon: "#000000", bottom: "#000000", fog: "#04060a", fogNear: 12, fogFar: 40,
  sun: "#7f98ff", sunI: 0.35, hemiSky: "#2e3a58", hemiGround: "#0b0a0d", hemiI: 0.5, sunDir: [-0.7, 0.5, 0.2], sunGlow: 0,
};
const HALL = { ...ROOM, hemiSky: "#4a5a80", hemiI: 0.95, sunI: 0.25, fog: "#05070c" };
// [Startzeit, Stimmung, Himmel sichtbar?]
const MOODS = [
  [0, NIGHT, true], [C.s1, DAY, true], [C.s3, ROOM, false], [C.s4, NIGHT, true], [C.s7, DAY, true],
  [C.fireFlash, NIGHT, true], [C.s9, NIGHT, true], [C.s15, HALL, false],
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
function slab(x0, x1, z0, z1, color, y = 0.02, parent = scene) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.04, z1 - z0), K.lambert(color));
  m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function setGroup(pos) {
  const g = new THREE.Group();
  if (pos) g.position.copy(pos);
  scene.add(g);
  return g;
}

// =====================================================================
// LINDENSTRASSE
// =====================================================================
const street = setGroup();
const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), K.lambert("#4d6b3a"));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
street.add(ground);
slab(-5, 5, -200, 200, "#3f4247", 0.03, street);
slab(-7.5, -5, -200, 200, "#b9b7b0", 0.05, street);
slab(5, 7.5, -200, 200, "#b9b7b0", 0.05, street);
for (let z = -195; z < 200; z += 6) slab(-0.08, 0.08, z, z + 3, "#d8d6cf", 0.045, street);

const field = new K.HouseField();
const WALLS = ["#e6dfd1", "#d9cdb6", "#cfd2d2", "#e5d6bf", "#c9d1d4"];
const ROOFS = ["#9c4a36", "#7f858f", "#8d3f2e", "#6f747c"];
let myHouse, house13, oldHouse;
for (let z = -78; z <= 78; z += 13) {
  const L = z === 0 ? { wall: "#5d5853", roof: "#2c2d31", h: 6.4 } : { wall: pick(WALLS), roof: pick(ROOFS), h: 5.6 };
  const R = z === 0 ? { wall: "#e2d5bd", roof: "#6f747c", h: 6.4 } : { wall: pick(WALLS), roof: pick(ROOFS), h: 5.6 };
  const hl = field.add(-16, z, { w: 9, d: 8, facing: "x+", ...L });
  const hr = field.add(16, z, { w: 9, d: 8, facing: "x-", ...R });
  if (z === 0) { house13 = hl; myHouse = hr; }
  if (z === 13) oldHouse = hr;
}
field.build(street);
const myWin = field.windows.find((w) => w.house === myHouse && w.k === 0);      // dein Fenster (z = -2.43)
const litWin = field.windows.find((w) => w.house === house13 && w.k === 1);    // Fenster gegenüber (z = -2.43)
const boardWin = field.windows.find((w) => w.house === house13 && w.k === 0);  // vernageltes Fenster
const otherWin = field.windows.find((w) => w.house === myHouse && w.k === 1);

// Vorgärten: Zäune und Hecken, beim Haus Nr. 13 verwildert
const trees = [];
for (let z = -84; z <= 84; z += 13) {
  for (const s of [-1, 1]) {
    if (!(s < 0 && z === 0)) box(0.08, 0.8, 9.5, "#e9e6df", s * 7.7, 0.4, z, street);
    if (rand() < 0.5 && Math.abs(z) > 10) trees.push([s * (22 + rand() * 4), z + (rand() - 0.5) * 6, 0.9 + rand() * 0.4]);
  }
}
K.addTrees(street, trees, { crown: "#2f5a2e" });
// Haus Nr. 13: schiefer Zaun, Unkraut, Bretter vor dem zweiten Fenster, Hausnummer
for (let i = 0; i < 7; i++) {
  const p = box(0.08, 0.6 + rand() * 0.5, 1.1, "#4b4741", -7.7, 0.4, -4.2 + i * 1.3, street);
  p.rotation.x = (rand() - 0.5) * 0.35;
}
for (let i = 0; i < 14; i++) {
  const b = new THREE.Mesh(new THREE.ConeGeometry(0.35 + rand() * 0.3, 0.8 + rand() * 0.9, 5), K.lambert("#33452a"));
  b.position.set(-8.5 - rand() * 3.2, 0.4, -4.2 + rand() * 8.4);
  street.add(b);
}
const boardMat = new THREE.MeshLambertMaterial({ color: "#2e261f" });
for (let i = 0; i < 3; i++) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 1.6), boardMat);
  b.position.set(boardWin.x + 0.06, boardWin.y - 0.35 + i * 0.35, boardWin.z);
  b.rotation.x = (i - 1) * 0.28;
  street.add(b);
}
plane(0.5, 0.36, new THREE.MeshBasicMaterial({ map: K.textTexture({ text: "13", w: 256, h: 180, bg: "#2a2c33", fg: "#d6d2c6", font: "700 120px Inter" }) }),
  -11.93, 2.6, 1.2, Math.PI / 2, street);
// Straßenschild
box(0.08, 2.8, 0.08, "#8b8e93", 6.2, 1.4, -9.5, street);
const signMat = new THREE.MeshBasicMaterial({ map: K.textTexture({ text: "LINDENSTRASSE", w: 1024, h: 230, bg: "#1f3f8f", fg: "#ffffff", font: "700 118px Inter", spacing: "6px" }) });
plane(1.9, 0.42, signMat, 6.15, 2.75, -9.5, -Math.PI / 2, street); // zwei Seiten, sonst ist die Schrift von hinten gespiegelt
plane(1.9, 0.42, signMat, 6.25, 2.75, -9.5, Math.PI / 2, street);

// Straßenlaternen (nicht in der Sichtachse Fenster–Fenster)
const lamps = [];
for (const z of [-39, -13, 13, 39, 65, -65]) {
  for (const s of [-1, 1]) {
    box(0.12, 4.4, 0.12, "#2f3237", s * 6.4, 2.2, z, street);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.32), new THREE.MeshLambertMaterial({ color: "#2f3237" }));
    head.position.set(s * 6.1, 4.4, z);
    street.add(head);
    const glow = K.makeGlow("#ffbf6a", 2.2);
    glow.position.set(s * 6.0, 4.25, z);
    street.add(glow);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshBasicMaterial({ color: "#ffb35a", transparent: true, opacity: 0.12, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(s * 5.4, 0.07, z);
    street.add(pool);
    lamps.push({ head, glow, pool });
  }
}

// Lampe neben deiner Haustür: macht den Vorgarten nachts sichtbar (leer oder nicht)
const porch = new THREE.PointLight("#ffcf94", 0, 10, 1.3);
porch.position.set(myHouse.x - 4.4, 2.5, myHouse.z + 0.9);
street.add(porch);
const porchGlow = K.makeGlow("#ffcf94", 0.9);
porchGlow.position.set(myHouse.x - 4.05, 2.5, myHouse.z + 0.9);
street.add(porchGlow);

// Umzug (Tag 1): Transporter und Kartons
const van = new THREE.Group();
box(2.3, 2.5, 5.2, "#eeeeec", 0, 1.55, 0, van);
box(2.3, 1.7, 1.4, "#eeeeec", 0, 1.15, 3.3, van);
box(2.2, 0.7, 0.05, "#1d2a3a", 0, 1.6, 4.01, van);
for (const [x, z] of [[-1.05, -1.7], [1.05, -1.7], [-1.05, 3.0], [1.05, 3.0]]) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 14), K.lambert("#1b1b1e"));
  w.rotation.z = Math.PI / 2;
  w.position.set(x, 0.42, z);
  van.add(w);
}
plane(3.6, 0.9, new THREE.MeshBasicMaterial({ map: K.textTexture({ text: "UMZÜGE", w: 1024, h: 256, bg: null, fg: "#1f3f8f", font: "800 170px Inter" }), transparent: true }),
  1.17, 1.7, -0.3, Math.PI / 2, van);
van.position.set(3.2, 0, 1.5);
street.add(van);
const cartons = [[9.0, -4.6], [9.6, -5.4], [9.2, -5.2, 0.6], [10.3, -4.0]].map(([x, z, y = 0]) =>
  box(0.62, 0.55, 0.62, "#b98f5c", x, 0.28 + y, z, street));

// ---------- Figuren ----------
const you = K.makeCharacter({ shirt: "#3b4a63", pants: "#2a2f38", skin: "#e2b996", hair: "#3a2a1e" });
street.add(you.root);
const youBox = box(0.55, 0.45, 0.45, "#b98f5c", 0, 1.15, 0.45, you.root);
const neighbors = [
  K.makeCharacter({ shirt: "#6b7a52", pants: "#2c2f36", skin: "#e8c4a2", hair: "#5a4632", hairStyle: "cap", capColor: "#39424f" }),
  K.makeCharacter({ shirt: "#a0566a", pants: "#2d3240", skin: "#d9a986", hair: "#2a1d16", hairStyle: "long" }),
];
neighbors.forEach((n) => street.add(n.root));
const oldWoman = K.makeCharacter({ shirt: "#6d5a78", pants: "#3a3842", skin: "#e8c4a6", hair: "#d4d2cf", hairStyle: "long", scale: 0.93 });
oldWoman.root.position.set(11.35, 0, 13);
oldWoman.root.rotation.y = -Math.PI / 2;
street.add(oldWoman.root);
const SKIN = new THREE.Color("#e8c4a6"), PALE = new THREE.Color("#d8d9d6");
const womanSkin = [];
oldWoman.root.traverse((o) => { if (o.material && o.material.color && o.material.color.equals(SKIN)) womanSkin.push(o.material); });
// die Gestalt im Vorgarten (nur auf dem Foto)
const stranger = K.makeCharacter({ shirt: "#050506", pants: "#050506", skin: "#08080a", hair: "#050506", shoes: "#050506", hairStyle: "bald", scale: 1.04 });
const voidMat = new THREE.MeshBasicMaterial({ color: "#030304" });
stranger.root.traverse((o) => { if (o.isMesh) o.material = voidMat; }); // ganz schwarz, ohne Gesicht
stranger.root.position.set(9.6, 0, -2.25);
stranger.root.rotation.y = Math.PI / 2; // schaut zu deinem Haus
street.add(stranger.root);

// ---------- Fenster gegenüber: Licht, Gestalt, winkender Arm ----------
const WW = field.winW, WH = field.winH;
const T = (w, h, draw) => K.canvasTexture(w, h, draw);
const roomTex = T(320, 330, (g, w, h) => {
  const grd = g.createRadialGradient(w * 0.5, h * 0.3, 10, w * 0.5, h * 0.5, w * 0.85);
  grd.addColorStop(0, "#f2f0dc");
  grd.addColorStop(0.55, "#c9c79e");
  grd.addColorStop(1, "#6c6a4c");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(60,58,40,0.55)"; // Vorhangreste
  g.fillRect(0, 0, 34, h);
  g.fillRect(w - 26, 0, 26, h * 0.7);
});
const silTex = T(320, 330, (g, w, h) => { // Gestalt hinter dem Fenster, Oberkörper
  g.fillStyle = "#060507";
  g.beginPath(); g.ellipse(w * 0.55, h * 0.33, 30, 37, 0, 0, Math.PI * 2); g.fill();
  g.fillRect(w * 0.55 - 12, h * 0.42, 24, 24);
  g.beginPath();
  g.moveTo(w * 0.27, h);
  g.bezierCurveTo(w * 0.3, h * 0.66, w * 0.4, h * 0.53, w * 0.55, h * 0.52);
  g.bezierCurveTo(w * 0.72, h * 0.53, w * 0.8, h * 0.66, w * 0.83, h);
  g.closePath(); g.fill();
});
const closeTex = T(320, 330, (g, w, h) => { // Nacht 2: direkt an der Scheibe, Hände am Glas
  g.fillStyle = "#060507";
  g.beginPath(); g.ellipse(w * 0.5, h * 0.4, 62, 76, 0, 0, Math.PI * 2); g.fill();
  g.beginPath();
  g.moveTo(w * 0.02, h);
  g.bezierCurveTo(w * 0.06, h * 0.7, w * 0.3, h * 0.62, w * 0.5, h * 0.62);
  g.bezierCurveTo(w * 0.7, h * 0.62, w * 0.94, h * 0.7, w * 0.98, h);
  g.closePath(); g.fill();
  g.strokeStyle = "#060507"; g.lineCap = "round";
  for (const sx of [0.17, 0.83]) { // flache Hände an der Scheibe: Handfläche, vier Finger, Daumen
    const cx = w * sx, cy = h * 0.46, d = sx < 0.5 ? 1 : -1;
    g.beginPath(); g.ellipse(cx, cy, 24, 28, 0, 0, Math.PI * 2); g.fill();
    g.lineWidth = 11;
    for (let f = 0; f < 4; f++) {
      const fx = cx + (f - 1.5) * 12, a = (f - 1.5) * 0.12;
      g.beginPath(); g.moveTo(fx, cy - 16); g.lineTo(fx + Math.sin(a) * 34, cy - 16 - Math.cos(a) * 34 + Math.abs(f - 1.5) * 5); g.stroke();
    }
    g.beginPath(); g.moveTo(cx + d * 20, cy + 6); g.lineTo(cx + d * 40, cy - 12); g.stroke();
  }
});
const crossTex = T(320, 330, (g, w, h) => {
  g.strokeStyle = "#2b2622"; g.lineWidth = 16; g.strokeRect(8, 8, w - 16, h - 16);
  g.lineWidth = 11; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h * 0.42); g.lineTo(w, h * 0.42); g.stroke();
});
const winGroup = new THREE.Group();
winGroup.position.set(litWin.x + 0.01, litWin.y, litWin.z);
winGroup.rotation.y = litWin.rotY;
street.add(winGroup);
const layer = (tex, z) => {
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(WW * 1.02, WH * 1.02), mat);
  m.position.z = z;
  winGroup.add(m);
  return mat;
};
const dirtyMat = new THREE.MeshBasicMaterial({ color: "#23262b" });
const dirty = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), dirtyMat);
dirty.position.z = 0.005;
winGroup.add(dirty); // verschmutzte, dunkle Scheibe, solange kein Licht brennt
const roomMat = layer(roomTex, 0.01), silMat = layer(silTex, 0.02), closeMat = layer(closeTex, 0.022), crossMat = layer(crossTex, 0.04);
const armPivot = new THREE.Group();
armPivot.position.set(-0.17, -0.06, 0.025); // rechte Schulter der Gestalt (vom Betrachter aus links)
winGroup.add(armPivot);
const armMat = new THREE.MeshBasicMaterial({ color: "#060507", transparent: true, opacity: 0 });
const arm = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.36).translate(0, -0.18, 0), armMat);
const hand = new THREE.Mesh(new THREE.CircleGeometry(0.052, 12).translate(0, -0.37, 0), armMat);
armPivot.add(arm, hand);
const winGlow = K.makeGlow("#e9e6c2", 3.2);
winGlow.position.set(litWin.x + 0.4, litWin.y, litWin.z);
street.add(winGlow);
const winLight = new THREE.PointLight("#e6e2b8", 0, 12, 1.6);
winLight.position.set(litWin.x + 0.8, litWin.y - 0.4, litWin.z);
street.add(winLight);

// Feuer 1998 (Rückblende)
const fires = [
  K.makeFire(street, [litWin.x + 0.6, litWin.y - 1.6, litWin.z], { size: 0.9, seed: 3 }),
  K.makeFire(street, [boardWin.x + 0.6, boardWin.y - 1.6, boardWin.z], { size: 0.9, light: false, seed: 5 }),
  K.makeFire(street, [house13.x, house13.h + 0.6, house13.z], { size: 1.5, light: false, seed: 9 }),
];
const smoke = K.makeSmoke(street, [house13.x, house13.h + 2.2, house13.z], { count: 10, seed: 4, color: "#3d3a38" });

// =====================================================================
// SCHLAFZIMMER (Wecker 03:16 -> 03:17)
// =====================================================================
const bedroom = setGroup(BR);
slab(-2.4, 2.4, -2.4, 2.4, "#3a2f28", 0.02, bedroom);
box(4.8, 0.1, 4.8, "#15161b", 0, 2.75, 0, bedroom);
box(4.8, 2.8, 0.1, "#2b3140", 0, 1.4, -2.4, bedroom);
box(0.1, 2.8, 4.8, "#2b3140", -2.4, 1.4, 0, bedroom);
box(0.1, 2.8, 4.8, "#2b3140", 2.4, 1.4, 0, bedroom);
box(2.0, 0.4, 2.2, "#4a3a30", -0.9, 0.2, -1.2, bedroom);
box(1.9, 0.18, 2.1, "#cfd3da", -0.9, 0.49, -1.2, bedroom);
box(1.95, 0.12, 1.4, "#24324d", -0.9, 0.62, -0.75, bedroom);
box(0.7, 0.16, 0.45, "#e6e8ec", -0.9, 0.66, -2.0, bedroom);
box(0.55, 0.55, 0.45, "#3a2c24", 0.5, 0.28, -2.05, bedroom);
// Wecker als Gruppe, zur Kamera gedreht (sonst wirkt er schief und zerfällt in schwarze Flächen)
const clockG = new THREE.Group();
clockG.position.set(0.45, 0.62, -2.0);
clockG.rotation.y = -0.55;
bedroom.add(clockG);
box(0.3, 0.13, 0.09, "#16171b", 0, 0, 0, clockG);
const clockTex = ["03:16", "03:17"].map((text) => K.textTexture({ text, w: 512, h: 220, bg: "#050506", fg: "#ff2a1f", font: "700 170px Inter", spacing: "8px" }));
const clockFace = plane(0.27, 0.11, new THREE.MeshBasicMaterial({ map: clockTex[0] }), 0, 0, 0.047, 0, clockG);
const clockGlow = K.makeGlow("#ff2a1f", 0.55);
clockGlow.position.set(0, 0, 0.12);
clockG.add(clockGlow);
// Fenster mit Mondlicht und Vorhängen
plane(1.2, 1.3, new THREE.MeshBasicMaterial({ color: "#5d78b8" }), 2.34, 1.6, -0.6, -Math.PI / 2, bedroom);
for (const dz of [-1.05, -0.15]) box(0.05, 1.9, 0.5, "#2a2433", 2.3, 1.55, dz, bedroom);
const moonBeam = new THREE.SpotLight("#7e9cff", 18, 9, 0.5, 0.6, 1.2);
moonBeam.position.set(BR.x + 2.6, 2.2, BR.z - 0.6);
moonBeam.target.position.set(BR.x - 0.9, 0.4, BR.z - 1.2);
scene.add(moonBeam, moonBeam.target);

// =====================================================================
// FLUR: Blick die Treppe hinunter auf die Haustür
// =====================================================================
const hall = setGroup(HW);
const STEP_H = 0.19, STEP_D = 0.27, STEPS = 15;
for (let i = 0; i < STEPS; i++) box(1.1, STEP_H, STEP_D + 0.02, "#4a3a2e", 0, (STEPS - i) * STEP_H - STEP_H / 2, 0.6 + i * STEP_D, hall);
slab(-0.6, 0.6, -0.8, 0.6, "#3d3028", STEPS * STEP_H, hall);       // oberer Absatz
slab(-1.6, 1.6, 0.6 + STEPS * STEP_D, 9.2, "#2f3237", 0.02, hall); // Flurboden unten
box(0.1, 6, 10, "#3a3f4c", -0.6, 3, 4.2, hall);
box(0.1, 6, 10, "#3a3f4c", 0.6, 3, 4.2, hall);
box(3.4, 0.1, 10, "#1a1c22", 0, 6, 4.2, hall);
const DOOR_Z = 9.1;
box(3.4, 2.9, 0.1, "#3a3f4c", 0, 4.55, DOOR_Z, hall);
box(1.2, 2.3, 0.1, "#3a3f4c", -1.15, 1.15, DOOR_Z, hall);
box(1.2, 2.3, 0.1, "#3a3f4c", 1.15, 1.15, DOOR_Z, hall);
const outside = plane(1.1, 2.3, new THREE.MeshBasicMaterial({ color: "#2a3b63" }), 0, 1.15, DOOR_Z + 0.4, Math.PI, hall);
const doorPivot = new THREE.Group();
doorPivot.position.set(0.52, 0, DOOR_Z);
hall.add(doorPivot);
const doorLeaf = box(1.04, 2.22, 0.07, "#4b3527", -0.52, 1.11, 0, doorPivot);
plane(0.4, 0.5, new THREE.MeshBasicMaterial({ color: "#3d5a94" }), -0.52, 1.55, -0.04, Math.PI, doorPivot);
const knob = box(0.07, 0.07, 0.1, "#b39b62", -0.92, 1.05, -0.06, doorPivot);
const coldLight = new THREE.SpotLight("#9db6ff", 0, 16, 0.55, 0.7, 1.1);
coldLight.position.set(HW.x, 2.3, HW.z + DOOR_Z + 1.6);
coldLight.target.position.set(HW.x, 0, HW.z + DOOR_Z - 4);
scene.add(coldLight, coldLight.target);
const lightWedge = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.2).translate(0, -1.6, 0),
  new THREE.MeshBasicMaterial({ color: "#a9c0ff", transparent: true, opacity: 0, depthWrite: false }));
lightWedge.rotation.x = -Math.PI / 2;
lightWedge.position.set(0, 0.05, DOOR_Z);
hall.add(lightWedge);
const doorway = K.makeCharacter({ shirt: "#040405", pants: "#040405", skin: "#060607", hair: "#040405", shoes: "#040405", hairStyle: "bald", scale: 1.04, castShadow: false });
doorway.root.traverse((o) => { if (o.isMesh) o.material = voidMat; });
doorway.root.position.set(0.05, 0, DOOR_Z + 0.22); // vor der Außenfläche, sonst verdeckt
doorway.root.rotation.y = Math.PI; // schaut ins Haus
hall.add(doorway.root);

// =====================================================================
// KAMERA
// =====================================================================
const at = (base, x, y, z) => [base.x + x, base.y + y, base.z + z];
const EYE = [myWin.x + 1.3, myWin.y + 0.05, myWin.z];       // in deinem Zimmer, hinter dem Fenster
const EYE_NEAR = [myWin.x + 0.25, myWin.y + 0.05, myWin.z]; // direkt an der Scheibe
const LIT = [litWin.x, litWin.y, litWin.z];
const GARDEN = [stranger.root.position.x, 1.2, stranger.root.position.z];
const shots = [
  // Hook/Thumbnail: das erleuchtete Fenster groß und unter dem Hook-Text, die Gestalt winkt schon
  { t0: 0, t1: C.s1 - 0.02, from: { pos: EYE, tgt: [LIT[0], LIT[1] + 0.75, LIT[2]] }, to: { pos: EYE_NEAR, tgt: [LIT[0], LIT[1] + 0.7, LIT[2]] }, fov: 17 },
  { t0: C.s1, t1: C.s2 - 0.02, from: { pos: [-3.5, 2.0, -24], tgt: [12, 2.0, -3] }, to: { pos: [-2.5, 2.1, -21], tgt: [12, 2.3, -2] }, fov: 50 },
  { t0: C.s2, t1: C.s3 - 0.02, from: { pos: [3.8, 1.7, -5.5], tgt: [-14, 3.2, 0] }, to: { pos: [3.2, 1.7, -4.5], tgt: [-14, 3.4, 0] }, fov: 46 },
  { t0: C.s3, t1: C.s4 - 0.02, from: { pos: at(BR, -0.55, 1.15, -0.55), tgt: at(BR, 0.35, 0.62, -2.0) }, to: { pos: at(BR, -0.2, 0.95, -1.15), tgt: at(BR, 0.43, 0.62, -2.0) }, fov: 40 },
  { t0: C.s4, t1: C.s5 - 0.02, from: { pos: EYE, tgt: [LIT[0], LIT[1] - 0.6, LIT[2]] }, to: { pos: EYE_NEAR, tgt: [LIT[0], LIT[1] - 0.4, LIT[2]] }, fov: 30 },
  { t0: C.s5, t1: C.s6 - 0.02, from: { pos: EYE_NEAR, tgt: LIT }, to: { pos: EYE_NEAR, tgt: [LIT[0], LIT[1] + 0.03, LIT[2]] }, fov: 9 },
  { t0: C.s6, t1: C.s7 - 0.02, from: { pos: EYE_NEAR, tgt: LIT }, to: { pos: EYE_NEAR, tgt: LIT }, fov: 7.5 },
  { t0: C.s7, t1: C.s8 - 0.02, from: { pos: [7.6, 1.75, 14.8], tgt: [11.4, 1.55, 12.9] }, to: { pos: [8.0, 1.72, 14.4], tgt: [11.4, 1.58, 12.95] }, fov: 44 },
  { t0: C.s8, t1: C.fireFlash - 0.02, from: { pos: [9.6, 1.62, 13.25], tgt: [11.35, 1.58, 13.0] }, to: { pos: [10.0, 1.6, 13.15], tgt: [11.35, 1.6, 13.0] }, fov: 40 },
  { t0: C.fireFlash, t1: C.s9 - 0.02, from: { pos: [4.5, 1.6, 9], tgt: [-13, 4.0, -0.5] }, to: { pos: [3.8, 1.5, 7.5], tgt: [-13, 4.2, -0.5] }, fov: 48 },
  { t0: C.s9, t1: C.s10 - 0.02, from: { pos: EYE, tgt: [LIT[0], LIT[1] - 0.6, LIT[2]] }, to: { pos: EYE_NEAR, tgt: [LIT[0], LIT[1] - 0.45, LIT[2]] }, fov: 28 },
  { t0: C.s10, t1: C.s11 - 0.02, from: { pos: EYE_NEAR, tgt: LIT }, to: { pos: EYE_NEAR, tgt: LIT }, fov: 8.5, ease: (u) => u },
  { t0: C.s11, t1: C.s12 - 0.02, from: { pos: EYE_NEAR, tgt: [LIT[0], LIT[1] - 0.5, LIT[2]] }, to: { pos: EYE_NEAR, tgt: [LIT[0], LIT[1] - 0.5, LIT[2]] }, fov: 16 },
  { t0: C.s12, t1: C.s13 - 0.02, from: { pos: EYE_NEAR, tgt: [LIT[0], LIT[1] - 0.5, LIT[2]] }, to: { pos: EYE_NEAR, tgt: [LIT[0], LIT[1] - 0.2, LIT[2]] }, fov: 12 },
  // Foto: Schnitt nach unten in den Vorgarten, langsames Reinzoomen auf die Gestalt
  { t0: C.s13, t1: C.s14 - 0.02, from: { pos: EYE, tgt: [GARDEN[0] - 0.8, 0.7, GARDEN[2]] }, to: { pos: EYE_NEAR, tgt: [GARDEN[0] - 0.2, 1.1, GARDEN[2]] }, fov: 40 },
  { t0: C.s14, t1: C.s15 - 0.02, from: { pos: EYE_NEAR, tgt: [GARDEN[0] - 1.5, 0.6, GARDEN[2]] }, to: { pos: EYE_NEAR, tgt: [GARDEN[0] - 3.5, 1.1, GARDEN[2]] }, fov: 52 },
  { t0: C.s15, t1: C.end - 0.02, from: { pos: at(HW, 0, STEPS * STEP_H + 1.55, -0.55), tgt: at(HW, 0, 1.0, DOOR_Z) }, to: { pos: at(HW, 0, STEPS * STEP_H + 1.5, -0.2), tgt: at(HW, 0, 1.05, DOOR_Z) }, fov: 50 },
  { t0: C.end, t1: C.end + 8, from: { pos: at(HW, 0, STEPS * STEP_H + 1.5, -0.2), tgt: at(HW, 0, 1.05, DOOR_Z) }, to: { pos: at(HW, 0, STEPS * STEP_H + 1.45, 0.1), tgt: at(HW, 0, 1.05, DOOR_Z) }, fov: 50 },
];
const rig = new K.CameraRig(shots);

// =====================================================================
// PRO FRAME
// =====================================================================
function updateWorld(t) {
  const bedroomShot = between(t, C.s3, C.s4);
  const hallShot = t >= C.s15;
  street.visible = !bedroomShot && !hallShot;
  bedroom.visible = bedroomShot;
  hall.visible = hallShot;
  moonBeam.intensity = bedroomShot ? 18 : 0;
  const porchOn = street.visible && !between(t, C.s1, C.s3) && !between(t, C.s7, C.fireFlash) && !between(t, C.fireFlash, C.s9);
  porch.intensity = porchOn ? 7 : 0;
  porchGlow.material.opacity = porchOn ? 0.9 : 0;
  const day = between(t, C.s1, C.s3) || between(t, C.s7, C.fireFlash);
  const fire = between(t, C.fireFlash, C.s9);

  // Fenster der Straße: nachts fast alles dunkel, tagsüber Spiegelung
  field.update(t, (w) => ({ light: day ? 0.15 : w === litWin ? 0 : (w.house.z === 39 && w.k === 0 ? 0.35 : 0), shutter: 0 }),
    { on: "#ffd68a", off: day ? "#7f8a96" : "#141a26" });
  lamps.forEach((l) => {
    const on = day ? 0 : 1;
    l.glow.material.opacity = on * 0.85;
    l.pool.material.opacity = on * 0.12;
    l.head.material.color.set(on ? "#ffd08a" : "#2f3237");
  });

  // Fenster gegenüber: Nacht 1 (Licht, Gestalt, Winken), Nacht 2 (näher), Foto (leer), danach dunkel
  const hook = t < C.s1;
  const night1 = between(t, C.s4, C.s7);
  const night2 = between(t, C.s9, C.s14);
  let lit = 0;
  if (hook) lit = 1;
  if (night1) lit = K.ramp(t, C.lightOn1, C.lightOn1 + 0.25) * (0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7));
  if (night2) lit = K.ramp(t, C.lightOn2, C.lightOn2 + 0.25);
  roomMat.opacity = lit;
  dirty.visible = lit < 0.02;
  winGlow.material.opacity = lit * 0.55;
  winLight.intensity = lit * 9;
  const far = hook || (night1 && t >= C.s5);
  const near = night2 && t >= C.s10 && t < C.s12;
  silMat.opacity = far ? lit : 0;
  closeMat.opacity = near ? lit : 0;
  crossMat.opacity = lit > 0 ? 1 : 0;
  // Winken: im Hook schon oben (Thumbnail), in Nacht 1 auf "hebt" und "winkt"
  let raise = 0, wave = 0;
  if (hook) { raise = 1; wave = 1; }
  if (night1) { raise = K.ramp(t, C.handUp, C.handUp + 1.3); wave = K.ramp(t, C.wave - 0.1, C.wave + 0.3); }
  armMat.opacity = far && raise > 0.03 ? lit : 0; // hängend läge er außerhalb der Silhouette
  armPivot.rotation.z = -(0.08 + raise * (Math.PI - 0.55)) + wave * Math.sin(t * 7) * 0.32;
  fires.forEach((f, i) => f.update(t, fire ? K.ramp(t, C.fireFlash + i * 0.15, C.fireFlash + 0.6 + i * 0.15) : 0));
  smoke.update(t, fire ? 1 : 0);

  // Tag 1: Einzug, Nachbarn gehen vorbei und schauen weg
  van.visible = between(t, C.s1, C.s3);
  cartons.forEach((c) => { c.visible = between(t, C.s1, C.s8); });
  you.root.visible = between(t, C.s1, C.s2) || between(t, C.s7, C.s8); // in der Nahaufnahme (S8) steht dort die Kamera
  if (between(t, C.s1, C.s2)) {
    const u = K.clamp((t - C.s1) / (C.s2 - C.s1));
    you.root.position.set(K.lerp(6.6, 9.8, u), 0, K.lerp(-6.5, -3.4, u));
    you.root.rotation.y = Math.atan2(3.2, 3.1);
    youBox.visible = true;
    K.animateCharacter(you, { t, gait: "walk", phase: t * 6.5, armL: "holdLow", arm: "holdLow" });
  } else if (you.root.visible) {
    you.root.position.set(9.75, 0, 13.25);
    you.root.rotation.y = Math.PI / 2;
    youBox.visible = false;
    K.animateCharacter(you, { t, headPitch: -0.05 });
  }
  neighbors.forEach((n, i) => {
    n.root.visible = between(t, C.s2, C.s3);
    if (!n.root.visible) return;
    const u = (t - C.s2) * 1.15;
    n.root.position.set(-6.0 - i * 0.8, 0, -7.5 + u + i * 1.4);
    n.root.rotation.y = 0;
    K.animateCharacter(n, { t, gait: "walk", phase: t * 6 + i * 2, headYaw: 0.7 }); // Blick weg vom Haus
  });
  oldWoman.root.visible = between(t, C.s7, C.fireFlash);
  const pale = K.ramp(t, C.pale, C.pale + 1.1);
  womanSkin.forEach((m) => m.color.copy(SKIN).lerp(PALE, pale));
  K.animateCharacter(oldWoman, { t, headPitch: 0.05 - pale * 0.08, headYaw: pale * 0.35, lean: 0.06 });

  // die Gestalt im Vorgarten: nur auf dem Foto
  stranger.root.visible = between(t, C.s12, C.s14);
  K.animateCharacter(stranger, { t: C.photo, headPitch: -0.45 });

  // Flur: die Haustür geht auf, kaltes Licht, eine Gestalt im Türrahmen
  const open = K.ramp(t, C.doorOpen, C.doorOpen + 2.2);
  doorPivot.rotation.y = -open * 1.35;
  coldLight.intensity = hallShot ? open * 26 : 0;
  lightWedge.material.opacity = open * 0.22;
  outside.material.color.set("#2a3b63").multiplyScalar(0.4 + open * 0.8);
  doorway.root.visible = hallShot && open > 0.55;
  K.animateCharacter(doorway, { t, headPitch: 0.1 });
  clockFace.material.map = clockTex[t >= C.clockFlip ? 1 : 0];
  clockGlow.material.opacity = 0.55 + 0.1 * Math.sin(t * 3);
}

// HUD: die Uhr läuft (Nacht 03:17), tagsüber die Tageszeit, in der Rückblende 1998
const clock = (s) => K.formatClock(s);
function updateHud(t) {
  const T317 = 3 * 3600 + 17 * 60;
  let num, sub;
  if (t < C.s1) { num = clock(T317 + 31 + t); sub = "JEDE NACHT · LINDENSTRASSE"; }
  else if (t < C.s3) { num = clock(15 * 3600 + 42 * 60 + (t - C.s1)); sub = "TAG 1 · EINZUG"; }
  else if (t < C.s7) { num = clock(T317 + (t - C.clockFlip)); sub = "NACHT 1"; }
  else if (t < C.fireFlash) { num = clock(8 * 3600 + 5 * 60 + (t - C.s7)); sub = "TAG 2 · NEBENAN"; }
  else if (t < C.s9) { num = "1998"; sub = "HAUS NR. 13 · BRAND"; }
  else if (between(t, C.s12, C.s14)) { num = clock(T317 + 48); sub = "FOTO · 03:17:48"; }
  else { num = clock(T317 + 48 + (t - C.photo)); sub = t >= C.s15 ? "NACHT 2 · UNTEN IM FLUR" : "NACHT 2"; }
  hudNum.textContent = num;
  hudSub.textContent = sub;
}

function renderAt(t) {
  const focus = rig.apply(camera, t);
  const [, mood, skyOn] = moodAt(t);
  sky.mesh.visible = skyOn;
  sky.mesh.position.copy(camera.position);
  scene.background = skyOn ? null : new THREE.Color(mood.fog);
  K.applyMood(K.moodAt([[0, mood], [1, mood]], 0), { scene, sky, lights, focus, camera });
  // Foto: die Welt steht still (eingefroren auf den Beginn des Foto-Shots), nur die Kamera bewegt sich
  updateWorld(between(t, C.s12, C.s14) ? C.s12 : t);
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
