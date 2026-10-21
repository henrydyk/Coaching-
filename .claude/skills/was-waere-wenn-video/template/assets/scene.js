// Startgerüst einer Szene. Vollständiges Beispiel: videos/01-keine-regeln/assets/scene.js
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
const camera = new THREE.PerspectiveCamera(55, W / H, 0.3, 2000);
const sky = K.createSky();
scene.add(sky.mesh);
const lights = K.createLights(scene);
const rand = K.mulberry32(1234);

// Stimmungen (siehe Stil-Bibel) – Keyframes [Zeit, Zustand]
const DAY = {
  top: "#4f86d9", horizon: "#e8f2ff", bottom: "#6a8a55", fog: "#e6eef8", fogNear: 180, fogFar: 700,
  sun: "#fff4e0", sunI: 2.8, hemiSky: "#ffffff", hemiGround: "#4a6a3a", hemiI: 1.3, sunDir: [-0.4, 0.75, -0.5], sunGlow: 1,
};
const MOOD = [[0, DAY], [30, DAY]];

// Boden
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), K.lambert("#66ad44"));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Beispiel: eine Häuserzeile
const field = new K.HouseField();
for (let z = -20; z >= -120; z -= 12) {
  field.add(-13, z, { facing: "x+", roof: rand() < 0.5 ? "#c4553b" : "#8a909a" });
  field.add(13, z, { facing: "x-", roof: rand() < 0.5 ? "#c4553b" : "#8a909a" });
}
field.build(scene);

// Ein Shot pro Beat; Lücke < 0,2 s = harter Schnitt, sonst Bogenflug
const rig = new K.CameraRig([
  { t0: 0, t1: 6, from: { pos: [60, 70, 120], tgt: [0, 0, -60] }, to: { pos: [20, 30, 40], tgt: [0, 2, -60] } },
  { t0: 6.5, t1: 30, from: { pos: [0, 6, 0], tgt: [0, 2, -60] }, to: { pos: [0, 4, -40], tgt: [0, 2, -100] } },
]);

function updateWorld(t) {
  field.update(t, () => ({ light: 0.2, shutter: 0 }));
}

function updateHud(t) {
  const u = K.clamp((t - C.start) / (C.end - C.start));
  hudNum.textContent = K.formatDE(1000000 * u);
  hudSub.textContent = `NOCH ${K.formatClock(24 * 3600 * (1 - u))} STUNDEN`;
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
  await document.fonts.load("700 150px Inter"); // nötig, bevor K.textTexture() Schilder zeichnet
  renderAt(window.__hfThreeTime || 0);
})();
window.addEventListener("hf-seek", (event) => renderAt(event.detail.time));
