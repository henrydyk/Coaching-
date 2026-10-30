// Szene: „Zwiebel, 1.000 Schnitte“ – Satisfying-Format ohne Stimme. Pro Runde schneidet ein Messer die
// Zwiebel von links nach rechts in N Schnitten; was es passiert hat, zerfällt in Würfel bzw. einen Haufen.
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
scene.add(new THREE.HemisphereLight("#fff3e2", "#2b2620", 1.1));
const key = new THREE.DirectionalLight("#ffe7c8", 2.6);
key.position.set(-3.2, 6.5, 3.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 3.5, bottom: -3.5, near: 1, far: 20 });
key.shadow.bias = -0.0006;
scene.add(key);
const fill = new THREE.DirectionalLight("#bcd0ff", 0.45);
fill.position.set(3, 2.5, 4);
scene.add(fill);

// ---------- Texturen ----------
const tex = (w, h, draw, repeat) => {
  const t = K.canvasTexture(w, h, draw);
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};
const tileTex = tex(512, 512, (g, w, h) => { // dunkelgrüne Fliesen mit hellen Fugen
  g.fillStyle = "#4a5a52"; g.fillRect(0, 0, w, h);
  const n = 4, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const v = 0.85 + rand() * 0.25;
    g.fillStyle = `rgb(${Math.round(40 * v)},${Math.round(56 * v)},${Math.round(50 * v)})`;
    g.fillRect(i * s + 5, j * s + 5, s - 10, s - 10);
    g.fillStyle = "rgba(255,255,255,0.05)"; g.fillRect(i * s + 9, j * s + 9, s - 40, 10);
  }
}, [7, 5]);
const woodTex = tex(1024, 512, (g, w, h) => { // helles Holz mit Maserung
  g.fillStyle = "#d9a865"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 160; i++) {
    const y = rand() * h, a = 0.04 + rand() * 0.08;
    g.strokeStyle = rand() < 0.5 ? `rgba(120,70,30,${a})` : `rgba(255,230,180,${a})`;
    g.lineWidth = 1 + rand() * 3;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 64) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 6);
    g.stroke();
  }
});
const skinTex = tex(512, 256, (g, w, h) => { // Zwiebelschale: goldbraun mit Längsstreifen
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, "#9a5b26"); grd.addColorStop(0.18, "#c98a45"); grd.addColorStop(0.5, "#d9a35e");
  grd.addColorStop(0.82, "#c58440"); grd.addColorStop(1, "#8a4f22");
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) {
    const x = rand() * w;
    g.strokeStyle = `rgba(${rand() < 0.5 ? "110,60,20" : "240,200,140"},${0.12 + rand() * 0.18})`;
    g.lineWidth = 1 + rand() * 2.5;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, h * 0.3, x - 8, h * 0.7, x + rand() * 6, h); g.stroke();
  }
});
const ringCache = new Map();
function ringTex(kz, ky) { // Schnittfläche: Zwiebelringe + Gitter der Schnitte
  const keyT = `${kz}x${ky}`;
  if (ringCache.has(keyT)) return ringCache.get(keyT);
  const t = tex(256, 256, (g, w, h) => {
    g.fillStyle = "#f3ecd4"; g.fillRect(0, 0, w, h);
    for (let r = 0.12; r < 1; r += 0.11) {
      g.strokeStyle = "rgba(190,170,110,0.55)"; g.lineWidth = 2;
      g.beginPath(); g.ellipse(w / 2, h / 2, (r * w) / 2, (r * h) / 2, 0, 0, Math.PI * 2); g.stroke();
    }
    g.strokeStyle = "rgba(150,130,80,0.45)"; g.lineWidth = Math.max(0.6, 2.2 - kz / 30);
    if (kz <= 60) {
      for (let i = 1; i < kz; i++) { g.beginPath(); g.moveTo((i * w) / kz, 0); g.lineTo((i * w) / kz, h); g.stroke(); }
      for (let j = 1; j < ky; j++) { g.beginPath(); g.moveTo(0, (j * h) / ky); g.lineTo(w, (j * h) / ky); g.stroke(); }
    } else { // sehr fein: körnig statt Linien
      for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(150,130,80,${0.15 + rand() * 0.3})`; g.fillRect(rand() * w, rand() * h, 1.5, 1.5); }
    }
    g.globalCompositeOperation = "destination-in"; // runde Scheibe
    g.beginPath(); g.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
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
work.rotation.y = 0.4; // so zeigt die Schnittfläche zur Kamera (weiße Ringe sichtbar)
work.position.set(0, 0, 0.25);
scene.add(work);
const BOARD_TOP = 0.2;
const board = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 3.2), new THREE.MeshLambertMaterial({ map: woodTex }));
board.position.y = 0.1;
board.castShadow = board.receiveShadow = true;
work.add(board);

// ---------- Zwiebel ----------
const R = 0.62, SQ = 0.9; // Radius und Abplattung (Höhe = 0.9 · Breite)
const CY = BOARD_TOP + R * SQ;
const clip = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
const onionMat = new THREE.MeshPhongMaterial({ map: skinTex, specular: "#5a4a30", shininess: 28, clippingPlanes: [clip], clipShadows: true });
const onion = new THREE.Group();
onion.position.set(0, CY, 0);
work.add(onion);
const bulb = new THREE.Mesh(new THREE.SphereGeometry(R, 56, 36), onionMat);
bulb.scale.set(SQ, 1, 1); // nach der Drehung um z wirkt das als Abplattung in der Höhe
bulb.castShadow = bulb.receiveShadow = true;
onion.add(bulb);
const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 10), new THREE.MeshLambertMaterial({ color: "#8f5a2a", clippingPlanes: [clip] }));
tip.rotation.z = -Math.PI / 2; // Spitze zeigt nach rechts (liegt wie im Vorbild)
tip.position.set(R + 0.1, 0.02, 0);
onion.add(tip);
bulb.rotation.z = -Math.PI / 2; // Längsstreifen laufen zur Spitze
const capMat = new THREE.MeshLambertMaterial({ map: ringTex(4, 4), transparent: true });
const cap = new THREE.Mesh(new THREE.CircleGeometry(1, 48), capMat); // Schnittfläche
cap.rotation.y = -Math.PI / 2;
work.add(cap);

// ---------- Würfel (wenige Schnitte) ----------
const MAXCUBES = 3200;
const cubeMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: "#ffffff" }), MAXCUBES);
cubeMesh.castShadow = cubeMesh.receiveShadow = true;
cubeMesh.frustumCulled = false;
work.add(cubeMesh);
const SKIN_C = new THREE.Color("#c98a45"), FLESH_C = new THREE.Color("#f4eedb");
for (let i = 0; i < MAXCUBES; i++) cubeMesh.setColorAt(i, FLESH_C);

// ---------- Haufen (viele Schnitte) ----------
const heapProfile = [];
for (let i = 0; i <= 24; i++) { // glockenförmiger Haufen
  const u = i / 24;
  heapProfile.push(new THREE.Vector2(Math.max(0.001, 1 - u) * 1.0, 0.98 * (1 - Math.pow(1 - u, 2.2)) * 0.55 + 0.45 * u * u * 0));
}
const heapGeo = new THREE.LatheGeometry(heapProfile.map((p, i) => new THREE.Vector2(p.x, Math.sin((i / 24) * Math.PI / 2) * 0.62)), 56);
const heap = new THREE.Mesh(heapGeo, new THREE.MeshLambertMaterial({ map: heapTex }));
heap.castShadow = heap.receiveShadow = true;
work.add(heap);
const CRUMBS = 900;
const crumbMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({ color: "#ffffff" }), CRUMBS);
crumbMesh.frustumCulled = false;
crumbMesh.castShadow = true;
work.add(crumbMesh);
const crumbData = Array.from({ length: CRUMBS }, () => ({ a: rand() * Math.PI * 2, u: Math.sqrt(rand()), s: 0.6 + rand() * 0.8, fall: rand(), dz: (rand() - 0.5) * 2, ph: rand() }));
crumbData.forEach((d, i) => crumbMesh.setColorAt(i, rand() < 0.06 ? SKIN_C : FLESH_C));

// ---------- Messer ----------
const knife = new THREE.Group();
work.add(knife);
const bladeShape = new THREE.Shape();
bladeShape.moveTo(0, 0); bladeShape.lineTo(1.75, 0); bladeShape.quadraticCurveTo(2.05, 0.05, 2.2, 0.36);
bladeShape.lineTo(0, 0.46); bladeShape.lineTo(0, 0);
const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.014, bevelEnabled: false });
bladeGeo.translate(-1.1, 0, -0.007);
const bladeMat = new THREE.MeshPhongMaterial({ color: "#c9ced3", specular: "#ffffff", shininess: 90, transparent: true });
const handleMat = new THREE.MeshLambertMaterial({ color: "#1c1a1a", transparent: true });
function makeKnife(opacity) {
  const g = new THREE.Group();
  const bm = bladeMat.clone(); bm.opacity = opacity;
  const hm = handleMat.clone(); hm.opacity = opacity;
  const blade = new THREE.Mesh(bladeGeo, bm);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.2, 0.08), hm);
  handle.position.set(-1.55, 0.34, 0);
  g.add(blade, handle);
  blade.castShadow = false; // Messerschatten lag als dunkler Streifen auf der Zwiebel
  g.rotation.y = -Math.PI / 2; // Klinge liegt in der Schnittebene (quer zum Brett), Griff nach hinten
  return { g, mats: [bm, hm], base: opacity };
}
const knives = [makeKnife(1), makeKnife(0.16), makeKnife(0.07)]; // Original + 2 zarte Bewegungsunschärfe-Kopien
knives.slice(1).forEach((k) => { k.g.children[1].visible = false; }); // Kopien nur als Klinge
knives.forEach((k) => knife.add(k.g));

// ---------- Hilfen ----------
const v3 = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), m4 = new THREE.Matrix4();
const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const approx = (n) => {
  if (n < 100000) return fmt(n);
  const p = Math.pow(10, Math.floor(Math.log10(n)) - 2);
  return "≈ " + fmt(Math.round(n / p) * p);
};
function axes(n) { // Schnitte auf die drei Achsen verteilt -> Stücke pro Achse
  const cx = Math.ceil(n / 3), cy = Math.round(n / 3), cz = n - cx - cy;
  return [cx + 1, cy + 1, cz + 1];
}
const capFrac = (xk) => { const h = K.clamp(xk + R, 0, 2 * R); return (h * h * (3 * R - h)) / (4 * R * R * R); };

// Zellen pro Runde (nur Würfel-Modus), gecacht
const cellCache = new Map();
function cellsFor(n) {
  if (cellCache.has(n)) return cellCache.get(n);
  const [kx, ky, kz] = axes(n);
  const sx = (2 * R) / kx, sy = (2 * R * SQ) / ky, sz = (2 * R) / kz;
  const cells = [];
  for (let i = 0; i < kx; i++) for (let j = 0; j < ky; j++) for (let k = 0; k < kz; k++) {
    const x = -R + (i + 0.5) * sx, y = -R * SQ + (j + 0.5) * sy, z = -R + (k + 0.5) * sz;
    const d = (x * x) / (R * R) + (y * y) / (R * R * SQ * SQ) + (z * z) / (R * R);
    if (d > 1) continue;
    const r1 = K.mulberry32(i * 7919 + j * 104729 + k * 1299709 + n);
    cells.push({ x, y, z, xr: x + sx / 2, skin: d > Math.pow(1 - 1.1 * Math.max(sx, sz) / R, 2) && r1() < 0.3, // meist weiß, wenige Schalenstücke
      tx: x * 1.28 + (r1() - 0.5) * sx * 0.6, ty: (y + R * SQ) * 0.58, tz: z * 1.28 + (r1() - 0.5) * sz * 0.6,
      rx: (r1() - 0.5) * 1.2, ry: (r1() - 0.5) * 1.6, rz: (r1() - 0.5) * 1.2, dl: r1() * 0.08 });
  }
  const res = { cells, sx, sy, sz, kx, ky, kz };
  cellCache.set(n, res);
  return res;
}
const totalCubes = (n) => { const [kx, ky, kz] = axes(n); return kx <= 18 ? cellsFor(n).cells.length : 0.5236 * kx * ky * kz; };

function roundAt(t) {
  let i = 0;
  while (i < ROUNDS.length - 1 && t >= ROUNDS[i + 1].t0) i++;
  return ROUNDS[i];
}

// =====================================================================
// PRO FRAME
// =====================================================================
function renderAt(t) {
  const rd = roundAt(t);
  const n = rd.n;
  const [kx, ky, kz] = axes(n);
  const cubesMode = kx <= 18;
  const cutDur = rd.cut1 - rd.cut0;
  const p = K.clamp((t - rd.cut0) / cutDur); // Fortschritt des Messers
  const xk = -R - 0.02 + p * (2 * R + 0.04);
  const done = t >= rd.cut1;

  // Erscheinen: kurzer Plopp
  const pop = K.clamp((t - rd.t0) / 0.16);
  onion.scale.setScalar(0.86 + 0.14 * K.easeOutCubic(pop));
  onion.visible = !done;

  // Schnittebene in Weltkoordinaten (Brett ist gedreht)
  work.updateMatrixWorld();
  v3.set(1, 0, 0).applyQuaternion(work.quaternion);
  clip.setFromNormalAndCoplanarPoint(v3, work.localToWorld(new THREE.Vector3(xk, 0, 0)));

  // Schnittfläche
  const rz = Math.sqrt(Math.max(0, R * R - xk * xk));
  cap.visible = !done && p > 0 && rz > 0.01;
  cap.position.set(xk + 0.002, CY, 0);
  cap.scale.set(rz, rz * SQ, 1);
  capMat.map = ringTex(Math.max(2, kz), Math.max(2, ky));

  // Würfel-Modus: Zellen links vom Messer fallen und sacken zusammen
  let shown = 0;
  if (cubesMode) {
    const { cells, sx, sy, sz } = cellsFor(n);
    const tCut = (x) => rd.cut0 + ((x + R + 0.02) / (2 * R + 0.04)) * cutDur;
    cells.forEach((c, i) => {
      if (i >= MAXCUBES) return;
      const tc = tCut(c.xr) + c.dl;
      if (t < tc) { m4.makeScale(0, 0, 0); cubeMesh.setMatrixAt(i, m4); return; }
      const u = K.easeOutCubic(K.clamp((t - tc) / 0.32));
      const fallY = K.lerp(CY + c.y, BOARD_TOP + c.ty + sy * 0.46, u * u);
      v3.set(K.lerp(c.x, c.tx, u), fallY, K.lerp(c.z, c.tz, u));
      q.setFromEuler(e.set(c.rx * u, c.ry * u, c.rz * u));
      s3.set(sx * 0.93, sy * 0.93, sz * 0.93);
      m4.compose(v3, q, s3);
      cubeMesh.setMatrixAt(i, m4);
      cubeMesh.setColorAt(i, c.skin ? SKIN_C : FLESH_C);
    });
    for (let i = cells.length; i < MAXCUBES; i++) { m4.makeScale(0, 0, 0); cubeMesh.setMatrixAt(i, m4); }
    shown = cells.length;
  }
  cubeMesh.visible = cubesMode;
  cubeMesh.instanceMatrix.needsUpdate = true;
  if (cubeMesh.instanceColor) cubeMesh.instanceColor.needsUpdate = true;

  // Haufen-Modus: Volumen wächst mit dem geschnittenen Anteil, Krümel rieseln an der Schnittkante
  const frac = done ? 1 : capFrac(xk);
  heap.visible = !cubesMode && frac > 0.002;
  crumbMesh.visible = !cubesMode && frac > 0.002;
  if (!cubesMode) {
    const vol = (4 / 3) * Math.PI * R * R * R * SQ * 1.12 * frac; // lose geschüttet: etwas mehr Volumen
    const sc = Math.cbrt(vol / 0.814); // Grundform: Volumen 0.90 bei Skala 1, mal 0.85² · 1.25 durch die Streckung
    heap.scale.set(sc * 0.85, sc * 1.25, sc * 0.85); // höher und spitzer, wie ein geschütteter Haufen
    heap.position.set(-R * 0.35 * (1 - frac), BOARD_TOP, 0);
    const cs = Math.max(0.006, (2 * R) / kx * 0.95);
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

  // Messer: hackt schnell auf und ab, wandert mit der Schnittkante; ab ~8 Hz Bewegungsunschärfe
  const cutting = t >= rd.cut0 && t < rd.cut1;
  const rate = n / cutDur; // Schnitte pro Sekunde
  const vis = Math.min(rate, 9);
  knife.visible = cutting || (t >= rd.cut1 && t < rd.cut1 + 0.25);
  knives.forEach((kn, i) => {
    const lag = i * 0.009 * Math.min(1, rate / 10); // dicht hinter dem Messer: wirkt wie Bewegungsunschärfe
    const tt = t - lag;
    const ph = (tt * vis) % 1;
    const down = ph < 0.45 ? K.easeInOutSine(ph / 0.45) : 1 - K.easeInOutSine((ph - 0.45) / 0.55);
    const lift = cutting ? 0 : K.ramp(t, rd.cut1, rd.cut1 + 0.25);
    const xkk = -R - 0.02 + K.clamp((tt - rd.cut0) / cutDur) * (2 * R + 0.04);
    kn.g.position.set(xkk, BOARD_TOP + 0.002 + (1 - down) * (2 * R * SQ + 0.35) + lift * 1.5, 0.05);
    kn.g.rotation.z = (1 - down) * 0.08;
    const blur = i === 0 ? 1 : (rate > 8 ? 1 : 0);
    kn.mats.forEach((m) => { m.opacity = kn.base * blur; });
    kn.g.visible = blur > 0;
  });

  // Kamera: fest, pro Runde ein leichtes Heranfahren
  const cu = K.clamp((t - rd.t0) / (rd.t1 - rd.t0));
  const push = rd.final ? K.easeInOutSine(K.clamp((t - rd.cut1) / (rd.t1 - rd.cut1))) * 0.5 : cu * 0.12;
  camera.position.set(-0.95, 2.9 - push * 0.4, 5.45 - push * 1.0);
  camera.lookAt(-0.05, 0.5, 0.2);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);

  // Zähler
  const cutsNow = t < rd.cut0 ? 0 : done ? n : Math.floor(n * p);
  const total = totalCubes(n);
  const cubesNow = t < rd.cut0 ? 0 : done ? total : total * frac * (cubesMode ? 1 : 1);
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
