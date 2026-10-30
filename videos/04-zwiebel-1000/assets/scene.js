// Szene: „Zwiebel, 1.000 Schnitte“ – Satisfying-Format ohne Stimme. Pro Runde zwei Durchgänge wie im
// Vorbild: erst Scheiben (feine Linien auf der Schale, noch 0 Würfel), dann quer – dabei zerfällt die
// Zwiebel von links nach rechts in Würfel bzw. einen Haufen.
import * as THREE from "three";
import * as K from "./lowpoly-kit.js";

const W = 1080, H = 1920;
const PLAN = JSON.parse(document.getElementById("rounds").textContent);
const ROUNDS = PLAN.rounds;
const canvas = document.getElementById("three-layer");
const elCuts = document.getElementById("cuts");
const elCubes = document.getElementById("cubes");

const renderer = K.createRenderer(canvas, W, H);
renderer.localClippingEnabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color("#141715");
const camera = new THREE.PerspectiveCamera(34, W / H, 0.05, 100);
const rand = K.mulberry32(1000);

// ---------- Licht: warmes Hauptlicht von links oben, kühles Fülllicht ----------
scene.add(new THREE.HemisphereLight("#fff3e2", "#2b2620", 0.9));
const key = new THREE.DirectionalLight("#ffe7c8", 2.5);
key.position.set(-3.2, 6.5, 3.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 20 });
key.shadow.bias = -0.0006;
key.shadow.radius = 4;
scene.add(key);
const fill = new THREE.DirectionalLight("#bcd0ff", 0.4);
fill.position.set(3, 2.5, 4);
scene.add(fill);

// ---------- Texturen ----------
const tex = (w, h, draw, repeat) => {
  const t = K.canvasTexture(w, h, draw);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  t.anisotropy = 4;
  return t;
};
// Umgebung für Glanz (Zwiebelschale, Messerstahl): heller warmer Himmel, zwei Softboxen, dunkler Boden
const envEq = tex(512, 256, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#fff1dc"); grd.addColorStop(0.45, "#8a7660"); grd.addColorStop(0.55, "#3a322a"); grd.addColorStop(1, "#16130f");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.filter = "blur(6px)";
  g.fillStyle = "#ffffff"; g.fillRect(w * 0.12, h * 0.12, w * 0.16, h * 0.2);
  g.fillStyle = "#e8eeff"; g.fillRect(w * 0.62, h * 0.2, w * 0.1, h * 0.14);
});
envEq.mapping = THREE.EquirectangularReflectionMapping;
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromEquirectangular(envEq).texture;

const tileTex = tex(512, 512, (g, w, h) => { // dunkelgrüne Fliesen mit Fugen
  g.fillStyle = "#3d4a44"; g.fillRect(0, 0, w, h);
  const nx = 2, ny = 4, sx = w / nx, sy = h / ny;
  for (let j = 0; j < ny; j++) for (let i = -1; i < nx; i++) {
    const v = 0.85 + rand() * 0.22, ox = (j % 2) * sx / 2;
    g.fillStyle = `rgb(${Math.round(36 * v)},${Math.round(50 * v)},${Math.round(44 * v)})`;
    g.fillRect(i * sx + ox + 5, j * sy + 5, sx - 10, sy - 10);
    g.fillStyle = "rgba(255,255,255,0.045)"; g.fillRect(i * sx + ox + 12, j * sy + 10, sx - 40, 9);
  }
}, [8, 4]);
const woodTex = tex(1024, 512, (g, w, h) => { // helles Buchenholz mit feiner Maserung
  g.fillStyle = "#ddb682"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 220; i++) {
    const y = rand() * h, a = 0.03 + rand() * 0.07;
    g.strokeStyle = rand() < 0.55 ? `rgba(140,85,40,${a})` : `rgba(255,236,200,${a})`;
    g.lineWidth = 0.8 + rand() * 2.5;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 48) g.lineTo(x, y + Math.sin(x * 0.008 + i) * 5 + Math.sin(x * 0.03 + i * 2) * 1.5);
    g.stroke();
  }
});
const skinTex = tex(1024, 512, (g, w, h) => { // Zwiebelschale: goldbraun, Längsadern laufen zu Wurzel und Hals
  const grd = g.createLinearGradient(0, 0, 0, h); // y = 0 Wurzel, y = h Hals
  grd.addColorStop(0, "#8a5a2c"); grd.addColorStop(0.07, "#bf9154"); grd.addColorStop(0.22, "#d6ad6c");
  grd.addColorStop(0.5, "#ddb676"); grd.addColorStop(0.78, "#d3a765"); grd.addColorStop(0.93, "#b88648"); grd.addColorStop(1, "#8f5f2e");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { // leichte Flecken (papierige Schale)
    const x = 60 + rand() * (w - 120), y = 60 + rand() * (h - 120);
    g.fillStyle = rand() < 0.5 ? "rgba(245,215,160,0.08)" : "rgba(150,95,40,0.05)";
    g.beginPath(); g.ellipse(x, y, 20 + rand() * 50, 40 + rand() * 90, 0, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 110; i++) { // feine Längsadern, dezent
    const x = rand() * w, dark = rand() < 0.5;
    g.strokeStyle = dark ? `rgba(130,80,35,${0.04 + rand() * 0.08})` : `rgba(250,225,180,${0.05 + rand() * 0.08})`;
    g.lineWidth = 0.8 + rand() * 1.6;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 10, h * 0.33, x - 10, h * 0.66, x + (rand() - 0.5) * 8, h); g.stroke();
  }
});
const neckTex = tex(128, 256, (g, w, h) => { // trockener, gedrehter Hals
  g.fillStyle = "#8a5a2c"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = rand() < 0.5 ? "rgba(60,32,12,0.35)" : "rgba(220,180,120,0.3)"; g.lineWidth = 1 + rand() * 2;
    const x = rand() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, h); g.stroke();
  }
});
const ringCache = new Map();
function ringTex(kz, ky) { // Schnittfläche: Zwiebelringe (Schichten) + Gitter der Querschnitte
  const keyT = `${kz}x${ky}`;
  if (ringCache.has(keyT)) return ringCache.get(keyT);
  const t = tex(512, 512, (g, w, h) => {
    const c = w / 2;
    g.fillStyle = "#f4efdc"; g.fillRect(0, 0, w, h);
    const radii = [0.97, 0.86, 0.75, 0.64, 0.53, 0.43, 0.33, 0.24, 0.15];
    radii.forEach((r, i) => { // Schichten: abwechselnd heller/dunkler, feine gelbgrüne Grenzlinie
      g.fillStyle = i % 2 ? "#f6f2e2" : "#eee6c8";
      g.beginPath(); g.ellipse(c, c, r * c, r * c, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "rgba(196,186,120,0.85)"; g.lineWidth = 2.2; g.stroke();
    });
    g.fillStyle = "#e3e6c0"; g.beginPath(); g.ellipse(c, c, 0.07 * c, 0.07 * c, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(150,135,85,0.55)"; g.lineWidth = Math.max(0.8, 3 - kz / 25);
    if (kz <= 70) {
      for (let i = 1; i < kz; i++) { g.beginPath(); g.moveTo((i * w) / kz, 0); g.lineTo((i * w) / kz, h); g.stroke(); }
      for (let j = 1; j < ky; j++) { g.beginPath(); g.moveTo(0, (j * h) / ky); g.lineTo(w, (j * h) / ky); g.stroke(); }
    } else { // sehr fein: körnig statt Linien
      for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(150,135,85,${0.12 + rand() * 0.25})`; g.fillRect(rand() * w, rand() * h, 2, 2); }
    }
    g.strokeStyle = "#b9803f"; g.lineWidth = 9; // goldene Schale außen
    g.beginPath(); g.ellipse(c, c, c - 5, c - 5, 0, 0, Math.PI * 2); g.stroke();
    g.globalCompositeOperation = "destination-in"; // runde Scheibe
    g.beginPath(); g.ellipse(c, c, c, c, 0, 0, Math.PI * 2); g.fill();
  });
  ringCache.set(keyT, t);
  return t;
}
const heapTex = tex(512, 512, (g, w, h) => { // Haufen aus winzigen Würfeln: cremeweiß, körnig, ein paar Schalenstücke
  g.fillStyle = "#efe7cf"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26000; i++) {
    const v = rand();
    g.fillStyle = v < 0.03 ? "rgba(190,130,60,0.8)" : v < 0.55 ? `rgba(255,252,240,${0.5 + rand() * 0.5})` : `rgba(170,155,115,${0.25 + rand() * 0.35})`;
    const s = 1 + rand() * 2.5;
    g.fillRect(rand() * w, rand() * h, s, s);
  }
}, [3, 2]);

// ---------- Küche: Wand, Arbeitsplatte, Brett ----------
const wall = new THREE.Mesh(new THREE.PlaneGeometry(22, 12), new THREE.MeshLambertMaterial({ map: tileTex }));
wall.position.set(0, 3, -3.2);
scene.add(wall);
const counter = new THREE.Mesh(new THREE.BoxGeometry(22, 0.5, 9), new THREE.MeshLambertMaterial({ color: "#2b2926" }));
counter.position.set(0, -0.25, 1.2);
counter.receiveShadow = true;
scene.add(counter);
const work = new THREE.Group(); // Brett, Zwiebel, Messer, Haufen – leicht schräg wie im Vorbild
work.rotation.y = 0.14; // Zwiebel liegt quer im Bild wie im Vorbild, Schnittlinien laufen senkrecht
work.position.set(0, 0, 0.25);
scene.add(work);
const BOARD_TOP = 0.2;
const board = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 3.2), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.62, envMap, envMapIntensity: 0.35 }));
board.position.y = 0.1;
board.castShadow = board.receiveShadow = true;
work.add(board);

// ---------- Zwiebel: echte Zwiebelform (rund an der Wurzel, spitz zum Hals), liegt quer ----------
const L = 0.62, A = 0.63; // halbe Länge (Wurzel links, Hals rechts) und größter Radius
const CY = BOARD_TOP + A;
const smooth = (u) => u * u * (3 - 2 * u);
const rOf = (x) => { // Radius des Querschnitts an der Stelle x
  const u = K.clamp(x / L, -1, 1);
  const p = 0.5 + 0.4 * smooth(K.clamp(u)); // Wurzelseite rund, Halsseite spitz
  return A * Math.pow(Math.max(0, 1 - u * u), p) * (1 + 0.05 * Math.sin(Math.PI * (u + 1) / 2) * (u < 0 ? 1 : 0.4));
};
const VOLTAB = (() => { // kumuliertes Volumen entlang x (für Haufen und Würfelzahl)
  const n = 600, tab = [0];
  for (let i = 1; i <= n; i++) { const x = -L + ((i - 0.5) / n) * 2 * L, r = rOf(x); tab.push(tab[i - 1] + Math.PI * r * r * (2 * L / n)); }
  return tab;
})();
const VTOT = VOLTAB[VOLTAB.length - 1];
const FILL = VTOT / (2 * L * 4 * A * A); // Anteil der Zwiebel an ihrem Quader
const capFrac = (x) => { const f = K.clamp((x + L) / (2 * L)) * (VOLTAB.length - 1), i = Math.floor(f); return (VOLTAB[i] + (VOLTAB[Math.min(i + 1, VOLTAB.length - 1)] - VOLTAB[i]) * (f - i)) / VTOT; };

const clip = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
const slice = { uK: { value: 0 }, uUpTo: { value: -10 }, uLen: { value: L } };
const onionMat = new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.34, metalness: 0, envMap, envMapIntensity: 0.7, clippingPlanes: [clip], clipShadows: true });
onionMat.onBeforeCompile = (sh) => { // Scheibenschnitte als feine helle Linien mit Schattenkante (dicht = dunkler Ton)
  Object.assign(sh.uniforms, slice);
  sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vAx;")
    .replace("#include <begin_vertex>", "#include <begin_vertex>\nvAx = position.y;");
  sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vAx; uniform float uK, uUpTo, uLen;")
    .replace("#include <map_fragment>", `#include <map_fragment>
      if (uK > 1.5) {
        float sp = 2.0 * uLen / uK;
        float s = (vAx + uLen) / sp;
        float d = abs(s - floor(s + 0.5)) * sp;
        float fw = max(fwidth(vAx), 1e-5);
        float w = min(0.0026, sp * 0.11);
        float dense = smoothstep(0.25, 0.9, fw / sp);
        float on = step(vAx, uUpTo) * step(-uLen + sp * 0.5, vAx);
        float line = (1.0 - smoothstep(w, w + fw * 1.2, d)) * (1.0 - dense);
        float groove = clamp((1.0 - smoothstep(w, w * 3.0 + fw * 1.5, d)) - line, 0.0, 1.0) * (1.0 - dense);
        diffuseColor.rgb *= 1.0 - on * (0.22 * groove + 0.2 * dense);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.84, 0.68), on * (line * 0.75 + dense * 0.08));
      }`);
};
const onion = new THREE.Group();
onion.position.set(0, CY, 0);
work.add(onion);
const prof = [];
for (let i = 0; i <= 80; i++) { const u = -Math.cos((i / 80) * Math.PI); prof.push(new THREE.Vector2(Math.max(1e-4, rOf(u * L)), u * L)); }
const bulb = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), onionMat);
bulb.rotation.z = -Math.PI / 2; // Lathe-Achse (y) -> x: Wurzel links, Hals rechts
bulb.castShadow = bulb.receiveShadow = true;
onion.add(bulb);
const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.07, 0.26, 14, 1), new THREE.MeshStandardMaterial({ map: neckTex, roughness: 0.8, clippingPlanes: [clip] }));
neck.rotation.z = -Math.PI / 2;
neck.position.set(L + 0.08, 0, 0);
neck.castShadow = true;
onion.add(neck);
const rootMat = new THREE.MeshStandardMaterial({ color: "#5c3a1e", roughness: 0.9, clippingPlanes: [clip] });
const rootPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 18), rootMat);
rootPlate.rotation.z = Math.PI / 2;
rootPlate.position.set(-L - 0.005, 0, 0);
onion.add(rootPlate);
const hairMat = new THREE.MeshStandardMaterial({ color: "#cdb48c", roughness: 0.9, clippingPlanes: [clip] });
for (let i = 0; i < 22; i++) { // Wurzelhaare
  const a = rand() * Math.PI * 2, rr = rand() * 0.08, len = 0.05 + rand() * 0.09;
  const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, len, 4), hairMat);
  hair.position.set(-L - 0.02 - len * 0.45, Math.sin(a) * rr, Math.cos(a) * rr);
  hair.rotation.set((rand() - 0.5) * 0.9, 0, Math.PI / 2 + (rand() - 0.5) * 0.9);
  onion.add(hair);
}
const capMat = new THREE.MeshStandardMaterial({ map: ringTex(4, 4), transparent: true, roughness: 0.3, envMap, envMapIntensity: 0.4 });
const cap = new THREE.Mesh(new THREE.CircleGeometry(1, 64), capMat); // Schnittfläche
cap.rotation.y = -Math.PI / 2;
work.add(cap);

// ---------- Würfel (wenige Schnitte) ----------
const MAXCUBES = 6000;
const cubeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.35, envMap, envMapIntensity: 0.4 }), MAXCUBES);
cubeMesh.castShadow = cubeMesh.receiveShadow = true;
cubeMesh.frustumCulled = false;
work.add(cubeMesh);
const SKIN_C = new THREE.Color("#d2a463");
const FLESH = ["#f4efdc", "#efe7c6", "#f7f3e6", "#ebe3c0"].map((c) => new THREE.Color(c));
for (let i = 0; i < MAXCUBES; i++) cubeMesh.setColorAt(i, FLESH[0]);

// ---------- Haufen (viele Schnitte) ----------
const heapProfile = [];
for (let i = 0; i <= 24; i++) heapProfile.push(new THREE.Vector2(Math.max(0.001, 1 - i / 24), Math.sin((i / 24) * Math.PI / 2) * 0.62));
const heap = new THREE.Mesh(new THREE.LatheGeometry(heapProfile, 56), new THREE.MeshLambertMaterial({ map: heapTex }));
heap.castShadow = heap.receiveShadow = true;
work.add(heap);
const CRUMBS = 900;
const crumbMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: "#ffffff" }), CRUMBS);
crumbMesh.frustumCulled = false;
crumbMesh.castShadow = true;
work.add(crumbMesh);
const crumbData = Array.from({ length: CRUMBS }, () => ({ a: rand() * Math.PI * 2, u: Math.sqrt(rand()), s: 0.6 + rand() * 0.8, fall: rand(), dz: (rand() - 0.5) * 2, ph: rand() }));
crumbData.forEach((d, i) => crumbMesh.setColorAt(i, rand() < 0.06 ? SKIN_C : FLESH[i % 4]));

// ---------- Messer: Kochmesser mit Holzgriff, Bewegungsunschärfe aus durchsichtigen Kopien ----------
const knife = new THREE.Group();
work.add(knife);
const bladeShape = new THREE.Shape(); // Schneide unten (y = 0), Rücken oben, Spitze rechts
bladeShape.moveTo(0, 0); bladeShape.lineTo(1.5, 0); bladeShape.quadraticCurveTo(2.0, 0.04, 2.25, 0.42);
bladeShape.quadraticCurveTo(1.4, 0.5, 0, 0.52); bladeShape.lineTo(0, 0);
const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.016, bevelEnabled: false });
bladeGeo.translate(-1.1, 0, -0.008);
const bladeMat = new THREE.MeshStandardMaterial({ color: "#dfe3e6", metalness: 0.9, roughness: 0.22, envMap, envMapIntensity: 1.2, transparent: true });
const handleMat = new THREE.MeshStandardMaterial({ color: "#6e3f22", roughness: 0.55, envMap, envMapIntensity: 0.3, transparent: true });
const rivetMat = new THREE.MeshStandardMaterial({ color: "#c9ccd0", metalness: 0.9, roughness: 0.3, envMap, transparent: true });
const handleGeo = new THREE.BoxGeometry(0.9, 0.17, 0.09);
const rivetGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.1, 10);
function makeKnife(opacity, full) {
  const g = new THREE.Group();
  const bm = bladeMat.clone(); bm.opacity = opacity; bm.depthWrite = opacity >= 1;
  const blade = new THREE.Mesh(bladeGeo, bm);
  g.add(blade);
  const mats = [bm];
  if (full) {
    const hm = handleMat.clone(), rm = rivetMat.clone();
    const handle = new THREE.Mesh(handleGeo, hm);
    handle.position.set(-1.52, 0.4, 0);
    g.add(handle);
    [-1.75, -1.3].forEach((x) => { const r = new THREE.Mesh(rivetGeo, rm); r.rotation.x = Math.PI / 2; r.position.set(x, 0.4, 0); g.add(r); });
    mats.push(hm, rm);
  }
  g.rotation.y = -Math.PI / 2; // Klinge liegt in der Schnittebene (quer zum Brett), Griff nach hinten
  return { g, mats, base: opacity };
}
const GHOSTS = 7;
const knives = [makeKnife(1, true), ...Array.from({ length: GHOSTS }, () => makeKnife(0.11, false))];
knives.forEach((k) => knife.add(k.g));

// ---------- Hilfen ----------
const v3 = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), m4 = new THREE.Matrix4();
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const approx = (n) => {
  if (n < 100000) return fmt(n);
  const p = Math.pow(10, Math.floor(Math.log10(n)) - 2);
  return "≈ " + fmt(Math.round(n / p) * p);
};
function grid(rd) { // Stücke pro Achse: x aus den Scheiben, y/z aus den Querschnitten
  const n2 = rd.n - rd.n1, cy = Math.ceil(n2 / 2);
  return [rd.n1 + 1, cy + 1, n2 - cy + 1];
}
const cellCache = new Map();
function cellsFor(rd) {
  if (cellCache.has(rd.n)) return cellCache.get(rd.n);
  const [kx, ky, kz] = grid(rd);
  const sx = (2 * L) / kx, sy = (2 * A) / ky, sz = (2 * A) / kz;
  let res = null;
  if (kx * ky * kz * FILL < MAXCUBES * 0.95) {
    const cells = [];
    for (let i = 0; i < kx; i++) for (let j = 0; j < ky; j++) for (let k = 0; k < kz; k++) {
      const x = -L + (i + 0.5) * sx, y = -A + (j + 0.5) * sy, z = -A + (k + 0.5) * sz;
      const r = rOf(x), d = Math.hypot(y, z);
      if (d > r) continue;
      const r1 = K.mulberry32(i * 7919 + j * 104729 + k * 1299709 + rd.n);
      cells.push({ x, y, z, xr: x + sx / 2, skin: d > r - Math.max(sy, sz) * 1.05 && r1() < 0.16, col: FLESH[Math.floor(r1() * 4)],
        tx: x * 1.25 - 0.1 + (r1() - 0.5) * sx * 0.7, ty: (y + A) * 0.56, tz: z * 1.3 + (r1() - 0.5) * sz * 0.7,
        rx: (r1() - 0.5) * 1.3, ry: (r1() - 0.5) * 1.7, rz: (r1() - 0.5) * 1.3, dl: r1() * 0.07 });
    }
    if (cells.length <= MAXCUBES) res = { cells, sx, sy, sz };
  }
  cellCache.set(rd.n, res);
  return res;
}
const totalCubes = (rd) => { const c = cellsFor(rd); const [kx, ky, kz] = grid(rd); return c ? c.cells.length : FILL * kx * ky * kz; };

function roundAt(t) {
  let i = 0;
  while (i < ROUNDS.length - 1 && t >= ROUNDS[i + 1].t0) i++;
  return ROUNDS[i];
}
const XS = -L - 0.03, XE = L + 0.03; // Messerweg

// =====================================================================
// PRO FRAME
// =====================================================================
function renderAt(t) {
  const rd = roundAt(t);
  const { n, n1 } = rd;
  const n2 = n - n1;
  const [kx, ky, kz] = grid(rd);
  const cdata = cellsFor(rd);
  const cubesMode = !!cdata;
  const phase2 = t >= rd.cutM;
  const pa = phase2 ? rd.cutM : rd.cut0, pb = phase2 ? rd.cut1 : rd.cutM; // aktueller Durchgang
  const p = K.clamp((t - pa) / (pb - pa));
  const xk = K.lerp(XS, XE, p);
  const done = t >= rd.cut1;

  // Erscheinen: kurzer Plopp
  const pop = K.clamp((t - rd.t0) / 0.16);
  onion.scale.setScalar(0.86 + 0.14 * K.easeOutCubic(pop));
  onion.visible = !done;

  // Scheiben-Linien: im 1. Durchgang bis zum Messer, im 2. alle
  slice.uK.value = t < rd.cut0 ? 0 : kx;
  slice.uUpTo.value = phase2 ? L + 1 : (t < rd.cut0 ? -10 : xk);

  // Schnittebene (nur im 2. Durchgang) in Weltkoordinaten (Brett ist gedreht)
  const xc = phase2 ? xk : -5;
  work.updateMatrixWorld();
  v3.set(1, 0, 0).applyQuaternion(work.quaternion);
  clip.setFromNormalAndCoplanarPoint(v3, work.localToWorld(new THREE.Vector3(xc, 0, 0)));

  // Schnittfläche
  const rz = rOf(xk);
  cap.visible = phase2 && !done && p > 0 && xk > -L && xk < L && rz > 0.01;
  cap.position.set(xk + 0.002, CY, 0);
  cap.scale.set(rz, rz, 1);
  capMat.map = ringTex(Math.max(2, kz), Math.max(2, ky));

  // Würfel-Modus: im 2. Durchgang fallen die Stücke links vom Messer und sacken zusammen
  if (cubesMode) {
    const { cells, sx, sy, sz } = cdata;
    const tCut = (x) => rd.cutM + ((x - XS) / (XE - XS)) * (rd.cut1 - rd.cutM);
    cells.forEach((c, i) => {
      const tc = tCut(c.xr) + c.dl;
      if (t < tc) { m4.makeScale(0, 0, 0); cubeMesh.setMatrixAt(i, m4); return; }
      const u = K.easeOutCubic(K.clamp((t - tc) / 0.32));
      const fallY = K.lerp(CY + c.y, BOARD_TOP + c.ty + sy * 0.46, u * u);
      v3.set(K.lerp(c.x, c.tx, u), fallY, K.lerp(c.z, c.tz, u));
      q.setFromEuler(e.set(c.rx * u, c.ry * u, c.rz * u));
      s3.set(sx * 0.93, sy * 0.93, sz * 0.93);
      m4.compose(v3, q, s3);
      cubeMesh.setMatrixAt(i, m4);
      cubeMesh.setColorAt(i, c.skin ? SKIN_C : c.col);
    });
    for (let i = cells.length; i < MAXCUBES; i++) { m4.makeScale(0, 0, 0); cubeMesh.setMatrixAt(i, m4); }
  }
  cubeMesh.visible = cubesMode && phase2;
  cubeMesh.instanceMatrix.needsUpdate = true;
  if (cubeMesh.instanceColor) cubeMesh.instanceColor.needsUpdate = true;

  // Haufen-Modus: Volumen wächst mit dem geschnittenen Anteil, Krümel rieseln an der Schnittkante
  const frac = !phase2 ? 0 : done ? 1 : capFrac(xk);
  heap.visible = !cubesMode && frac > 0.002;
  crumbMesh.visible = !cubesMode && frac > 0.002;
  if (!cubesMode && frac > 0.002) {
    const vol = VTOT * 1.12 * frac; // lose geschüttet: etwas mehr Volumen
    const sc = Math.cbrt(vol / 0.814);
    heap.scale.set(sc * 0.85, sc * 1.25, sc * 0.85); // höher und spitzer, wie ein geschütteter Haufen
    heap.position.set(-L * 0.4 * (1 - frac), BOARD_TOP, 0);
    const cs = Math.max(0.006, (2 * L) / kx * 0.95);
    crumbData.forEach((d, i) => {
      let x, y, z;
      if (!done && d.fall < 0.35) { // rieselnde Krümel an der Messerkante
        const u = (t * 1.6 + d.ph) % 1;
        x = xk - 0.03 - d.u * 0.08; z = d.dz * rz * 0.8;
        y = K.lerp(CY + (d.u - 0.5) * rz * 1.4, BOARD_TOP + 0.02, u * u);
      } else { // auf der Oberfläche des Haufens
        const rr = d.u * 0.85 * sc, hh = 0.62 * sc * 1.25 * Math.sin((1 - d.u) * Math.PI / 2);
        x = heap.position.x + Math.cos(d.a) * rr; z = Math.sin(d.a) * rr; y = BOARD_TOP + hh + cs * 0.3;
      }
      q.setFromEuler(e.set(d.a, d.a * 1.7, d.ph * 3));
      m4.compose(v3.set(x, y, z), q, s3.setScalar(cs * d.s * Math.min(1, frac * 6)));
      crumbMesh.setMatrixAt(i, m4);
    });
    crumbMesh.instanceMatrix.needsUpdate = true;
  }

  // Messer: hackt schnell auf und ab und wandert mit; schnelle Hiebe als Unschärfe-Fahne
  const cutting = t >= rd.cut0 && t < rd.cut1;
  const rate = (phase2 ? n2 : n1) / (pb - pa); // Schnitte pro Sekunde im aktuellen Durchgang
  const vis = Math.min(rate, 9);
  const blurAmt = K.clamp((rate - 5) / 6); // 0 = scharf, 1 = volle Fahne
  knife.visible = cutting || (t >= rd.cut1 && t < rd.cut1 + 0.25);
  knives.forEach((kn, i) => {
    const tt = t - i * (1 / 45) / GHOSTS; // Kopien entlang der Bewegung der letzten 1/45 s
    const ph = ((((tt - pa) * vis + 0.2) % 1) + 1) % 1; // erster Hieb landet gleich am Anfang (Treffer bei ph = 0.45)
    const down = ph < 0.45 ? K.easeInOutSine(ph / 0.45) : 1 - K.easeInOutSine((ph - 0.45) / 0.55);
    const lift = cutting ? 0 : K.ramp(t, rd.cut1, rd.cut1 + 0.25);
    const xkk = K.lerp(XS, XE, K.clamp((tt - pa) / (pb - pa)));
    kn.g.position.set(xkk, BOARD_TOP + 0.002 + (1 - down) * (2 * A + 0.3) + lift * 1.5, 0.05);
    kn.g.rotation.z = (1 - down) * 0.08;
    const op = i === 0 ? 1 - 0.45 * blurAmt : kn.base * blurAmt;
    kn.mats.forEach((m) => { m.opacity = op; m.depthWrite = op >= 0.99; });
    kn.g.visible = op > 0.01;
  });

  // Kamera: fest, pro Runde ein leichtes Heranfahren
  const cu = K.clamp((t - rd.t0) / (rd.t1 - rd.t0));
  const push = rd.final ? K.easeInOutSine(K.clamp((t - rd.cut1) / (rd.t1 - rd.cut1))) * 0.5 : cu * 0.12;
  camera.position.set(-0.95, 2.9 - push * 0.4, 5.45 - push * 1.0);
  camera.lookAt(-0.05, 0.5, 0.2);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);

  // Zähler
  const cutsNow = t < rd.cut0 ? 0 : done ? n : phase2 ? n1 + Math.floor(n2 * p) : Math.floor(n1 * p);
  const cubesNow = done ? totalCubes(rd) : totalCubes(rd) * frac;
  elCuts.textContent = fmt(cutsNow);
  elCubes.textContent = approx(cubesNow);
}

window.__hf = window.__hf || {};
window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.world = (async () => {
  await document.fonts.load("700 150px Inter");
  renderAt(window.__hfThreeTime || 0);
})();
window.addEventListener("hf-seek", (event) => renderAt(event.detail.time));
