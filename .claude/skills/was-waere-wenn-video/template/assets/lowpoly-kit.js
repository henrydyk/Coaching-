// Low-Poly-Baukasten für "Mal angenommen"-Videos (Stil A).
// Alles hier ist deterministisch: Zustand wird nur aus der Zeit t berechnet.
import * as THREE from "three";

// ---------- Mathe ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, u) => a + (b - a) * u;
export const smooth = (u) => u * u * (3 - 2 * u);
export const ramp = (t, a, b) => smooth(clamp((t - a) / (b - a)));
export const easeInOutCubic = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const easeInOutSine = (u) => -(Math.cos(Math.PI * u) - 1) / 2;
export const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deutsche Zahlformatierung ohne Locale-Abhängigkeit: 1284551 -> "1.284.551"
export function formatDE(n) {
  const s = Math.round(n).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const p = (v) => String(v).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

// ---------- Renderer ----------
export function createRenderer(canvas, w, h) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

// ---------- Materialien (gecacht) ----------
const matCache = new Map();
export function lambert(color, opts = {}) {
  const key = `l|${color}|${JSON.stringify(opts)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }));
  return matCache.get(key);
}
export function basic(color, opts = {}) {
  const key = `b|${color}|${JSON.stringify(opts)}`;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshBasicMaterial({ color, ...opts }));
  return matCache.get(key);
}

// ---------- Himmel ----------
export function createSky(radius = 900) {
  const uniforms = {
    top: { value: new THREE.Color("#5b6fae") },
    horizon: { value: new THREE.Color("#ffb07a") },
    bottom: { value: new THREE.Color("#6a8a55") },
    sunColor: { value: new THREE.Color("#ffc08c") },
    sunDir: { value: new THREE.Vector3(-0.5, 0.3, -0.8).normalize() },
    sunGlow: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom;
      uniform vec3 sunColor; uniform vec3 sunDir; uniform float sunGlow;
      varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = mix(horizon, top, smoothstep(0.0, 0.6, h));
        col = mix(col, bottom, smoothstep(0.0, -0.15, h));
        float s = clamp(dot(d, normalize(sunDir)), 0.0, 1.0);
        col += sunColor * sunGlow * (pow(s, 900.0) * 2.0 + pow(s, 14.0) * 0.35);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, uniforms };
}

// ---------- Licht / Stimmungs-Keyframes ----------
export function createLights(scene) {
  const hemi = new THREE.HemisphereLight("#ffffff", "#444444", 1);
  const sun = new THREE.DirectionalLight("#ffffff", 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 260;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0008;
  scene.add(hemi, sun, sun.target);
  return { hemi, sun };
}

// Interpoliert Stimmungs-Objekte {top, horizon, ..., sunI, sunDir:[x,y,z]} zwischen Keyframes [[t, state], ...]
export function moodAt(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const [t0, a] = keys[i];
  const [t1, b] = keys[Math.min(i + 1, keys.length - 1)];
  const u = t1 > t0 ? smooth(clamp((t - t0) / (t1 - t0))) : 0;
  const out = {};
  for (const k of Object.keys(a)) {
    const va = a[k], vb = b[k];
    if (typeof va === "number") out[k] = lerp(va, vb, u);
    else if (Array.isArray(va)) out[k] = va.map((v, j) => lerp(v, vb[j], u));
    else out[k] = new THREE.Color(va).lerp(new THREE.Color(vb), u);
  }
  return out;
}

export function applyMood(m, { scene, sky, lights, focus }) {
  sky.uniforms.top.value.copy(m.top);
  sky.uniforms.horizon.value.copy(m.horizon);
  sky.uniforms.bottom.value.copy(m.bottom);
  sky.uniforms.sunColor.value.copy(m.sun);
  sky.uniforms.sunDir.value.set(...m.sunDir).normalize();
  sky.uniforms.sunGlow.value = m.sunGlow;
  scene.fog.color.copy(m.fog);
  scene.fog.near = m.fogNear;
  scene.fog.far = m.fogFar;
  lights.hemi.color.copy(m.hemiSky);
  lights.hemi.groundColor.copy(m.hemiGround);
  lights.hemi.intensity = m.hemiI;
  lights.sun.color.copy(m.sun);
  lights.sun.intensity = m.sunI;
  const dir = new THREE.Vector3(...m.sunDir).normalize();
  lights.sun.position.copy(focus).addScaledVector(dir, 120);
  lights.sun.target.position.copy(focus);
}

// ---------- Texturen ----------
let glowTex = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

export function makeGlow(color, size = 2) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  s.scale.set(size, size, 1);
  return s;
}

// Schild/Beschriftung als Textur (Fonts vorher mit document.fonts.load laden)
export function textTexture({ text, w = 1024, h = 256, bg = "#1f4d3a", fg = "#ffffff", font = "700 150px Inter", spacing = "12px" }) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.fillStyle = fg;
  g.font = font;
  g.letterSpacing = spacing;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, w / 2, h / 2 + h * 0.04);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- Häuser (instanziert) ----------
// Fassaden zeigen entlang ±x ("x+"/"x-") oder ±z ("z+"/"z-").
const FACING = {
  "x+": { rotY: Math.PI / 2, n: [1, 0, 0], t: [0, 0, -1] },
  "x-": { rotY: -Math.PI / 2, n: [-1, 0, 0], t: [0, 0, 1] },
  "z+": { rotY: 0, n: [0, 0, 1], t: [1, 0, 0] },
  "z-": { rotY: Math.PI, n: [0, 0, -1], t: [-1, 0, 0] },
};

export class HouseField {
  constructor() {
    this.houses = [];
    this.windows = [];
    this.doors = [];
    this.winW = 1.35;
    this.winH = 1.15;
  }

  // x,z = Mittelpunkt; w = Breite entlang der Fassade, d = Tiefe, h = Wandhöhe
  add(x, z, { w = 7, d = 7, h = 4.4, wall = "#e8e2d4", roof = "#c4553b", facing = "x+", windows = 2, data = {} } = {}) {
    const f = FACING[facing];
    const alongX = facing[0] === "z"; // Fassade verläuft entlang x
    const sx = alongX ? w : d, sz = alongX ? d : w;
    const house = { x, z, sx, sz, h, wall, roof, facing, data };
    this.houses.push(house);
    // d ist immer die Tiefe entlang der Blickrichtung der Fassade
    const fx = x + f.n[0] * (d / 2 + 0.03), fz = z + f.n[2] * (d / 2 + 0.03);
    // Bei 2 Fenstern sitzt die Tür in der Mitte
    const offsets = windows === 1 ? [0] : windows === 2 ? [-w * 0.27, w * 0.27] : [-w * 0.32, 0, w * 0.32];
    offsets.forEach((o, k) => {
      this.windows.push({
        house, k, x: fx + f.t[0] * o, y: h * 0.58, z: fz + f.t[2] * o, rotY: f.rotY, n: f.n, data: { ...data },
      });
    });
    if (windows === 2) this.doors.push({ x: fx, z: fz, rotY: f.rotY, n: f.n });
    return house;
  }

  build(scene) {
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const roofGeo = new THREE.ConeGeometry(0.7071, 1, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 0.5, 0);
    const n = this.houses.length;
    this.bodies = new THREE.InstancedMesh(box, lambert("#ffffff"), n);
    this.roofs = new THREE.InstancedMesh(roofGeo, lambert("#ffffff"), n);
    const m = new THREE.Matrix4(), c = new THREE.Color();
    this.houses.forEach((hs, i) => {
      m.compose(new THREE.Vector3(hs.x, 0, hs.z), new THREE.Quaternion(), new THREE.Vector3(hs.sx, hs.h, hs.sz));
      this.bodies.setMatrixAt(i, m);
      this.bodies.setColorAt(i, c.set(hs.wall));
      const rh = Math.min(hs.sx, hs.sz) * 0.42;
      m.compose(new THREE.Vector3(hs.x, hs.h, hs.z), new THREE.Quaternion(), new THREE.Vector3(hs.sx * 1.12, rh, hs.sz * 1.12));
      this.roofs.setMatrixAt(i, m);
      this.roofs.setColorAt(i, c.set(hs.roof));
    });
    for (const mesh of [this.bodies, this.roofs]) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }

    const plane = new THREE.PlaneGeometry(1, 1);
    const wn = this.windows.length;
    this.winMesh = new THREE.InstancedMesh(plane, basic("#ffffff"), wn);
    this.shutterMesh = new THREE.InstancedMesh(plane, lambert("#5d626b", { side: THREE.DoubleSide }), wn);
    this.winMesh.frustumCulled = false;
    this.shutterMesh.frustumCulled = false;
    scene.add(this.winMesh, this.shutterMesh);

    const doorGeo = new THREE.PlaneGeometry(1.1, 2.1);
    doorGeo.translate(0, 1.05, 0);
    this.doorMesh = new THREE.InstancedMesh(doorGeo, lambert("#5b3b2a", { side: THREE.DoubleSide }), Math.max(1, this.doors.length));
    this.doors.forEach((d, i) => {
      m.compose(new THREE.Vector3(d.x, 0, d.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, d.rotY, 0)), new THREE.Vector3(1, 1, 1));
      this.doorMesh.setMatrixAt(i, m);
    });
    scene.add(this.doorMesh);
  }

  // state(win, t) -> { light: 0..1, shutter: 0..1 }
  update(t, state, { on = "#ffd68a", off = "#262d3b" } = {}) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    const cOn = new THREE.Color(on), cOff = new THREE.Color(off);
    const W = this.winW, H = this.winH;
    this.windows.forEach((w, i) => {
      const s = state(w, t);
      q.setFromEuler(new THREE.Euler(0, w.rotY, 0));
      m.compose(new THREE.Vector3(w.x, w.y, w.z), q, new THREE.Vector3(W, H, 1));
      this.winMesh.setMatrixAt(i, m);
      this.winMesh.setColorAt(i, c.copy(cOff).lerp(cOn, s.light));
      const sh = Math.max(0.001, s.shutter);
      const y = w.y + H / 2 - (H * sh) / 2;
      m.compose(new THREE.Vector3(w.x + w.n[0] * 0.05, y, w.z + w.n[2] * 0.05), q, new THREE.Vector3(W * 1.08, H * sh * 1.04, 1));
      this.shutterMesh.setMatrixAt(i, m);
    });
    this.winMesh.instanceMatrix.needsUpdate = true;
    this.winMesh.instanceColor.needsUpdate = true;
    this.shutterMesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------- Bäume ----------
export function addTrees(scene, spots, { crown = "#3f8a3a", trunk = "#7a5236" } = {}) {
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 1.6, 6);
  trunkGeo.translate(0, 0.8, 0);
  const crownGeo = new THREE.ConeGeometry(1.4, 3.4, 7);
  crownGeo.translate(0, 3.2, 0);
  const tm = new THREE.InstancedMesh(trunkGeo, lambert(trunk), spots.length);
  const cm = new THREE.InstancedMesh(crownGeo, lambert(crown), spots.length);
  const m = new THREE.Matrix4();
  spots.forEach(([x, z, s = 1], i) => {
    m.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(s, s, s));
    tm.setMatrixAt(i, m);
    cm.setMatrixAt(i, m);
  });
  for (const mesh of [tm, cm]) { mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh); }
}

// ---------- Figuren ----------
const geoCache = {};
function geo(key, make) { return (geoCache[key] ||= make()); }

export function makePerson({ body = "#3a3f4b", skin = "#e9c3a0", mask = false, scale = 1 } = {}) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(geo("body", () => new THREE.CapsuleGeometry(0.3, 0.9, 3, 8)), lambert(body));
  b.position.y = 0.78;
  const h = new THREE.Mesh(geo("head", () => new THREE.SphereGeometry(0.26, 12, 10)), mask ? basic("#f2eee4") : lambert(skin));
  h.position.y = 1.6;
  b.castShadow = h.castShadow = true;
  g.add(b, h);
  if (mask) {
    const eyeGeo = geo("eye", () => new THREE.SphereGeometry(0.045, 6, 6));
    for (const sx of [-0.09, 0.09]) {
      const e = new THREE.Mesh(eyeGeo, basic("#111111"));
      e.position.set(sx, 1.64, 0.235);
      g.add(e);
    }
    const mouth = new THREE.Mesh(geo("mouth", () => new THREE.BoxGeometry(0.12, 0.018, 0.02)), basic("#111111"));
    mouth.position.set(0, 1.5, 0.245);
    g.add(mouth);
  }
  g.scale.setScalar(scale);
  return g;
}

// ---------- Kamera-Fahrten ----------
// shots: [{ t0, t1, from: {pos:[..], tgt:[..]}, to: {...}, ease?, fn?(t,u) -> {pos,tgt} }]
// Lücken zwischen Shots: < 0.2 s = harter Schnitt, sonst Flug im Bogen (lift).
export class CameraRig {
  constructor(shots, { lift = 10, fov = 55 } = {}) {
    this.shots = shots;
    this.lift = lift;
    this.fov = fov;
  }

  shotPose(s, t) {
    const u = clamp((t - s.t0) / (s.t1 - s.t0));
    if (s.fn) return s.fn(t, u);
    const e = (s.ease || easeInOutSine)(u);
    return {
      pos: s.from.pos.map((v, i) => lerp(v, s.to.pos[i], e)),
      tgt: s.from.tgt.map((v, i) => lerp(v, s.to.tgt[i], e)),
      fov: s.fov,
    };
  }

  pose(t) {
    const S = this.shots;
    if (t <= S[0].t0) return this.shotPose(S[0], S[0].t0);
    for (let i = 0; i < S.length; i++) {
      const s = S[i];
      if (t >= s.t0 && t <= s.t1) return this.shotPose(s, t);
      const n = S[i + 1];
      if (n && t > s.t1 && t < n.t0) {
        const gap = n.t0 - s.t1;
        if (gap < 0.2) return t < s.t1 + gap / 2 ? this.shotPose(s, s.t1) : this.shotPose(n, n.t0);
        const a = this.shotPose(s, s.t1), b = this.shotPose(n, n.t0);
        const u = easeInOutCubic((t - s.t1) / gap);
        const lift = Math.sin(Math.PI * u) * (s.lift ?? this.lift);
        return {
          pos: a.pos.map((v, k) => lerp(v, b.pos[k], u) + (k === 1 ? lift : 0)),
          tgt: a.tgt.map((v, k) => lerp(v, b.tgt[k], u)),
          fov: lerp(a.fov ?? this.fov, b.fov ?? this.fov, u),
        };
      }
    }
    const last = S[S.length - 1];
    return this.shotPose(last, last.t1);
  }

  apply(camera, t) {
    const p = this.pose(t);
    camera.position.set(...p.pos);
    camera.lookAt(...p.tgt);
    const fov = p.fov ?? this.fov;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    return new THREE.Vector3(...p.tgt);
  }
}
