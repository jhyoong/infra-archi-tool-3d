// Preset 3D models, built from simple shapes so the site needs no model files.
// Each builder returns a list of parts ({ geo, color }). The parts are merged
// into one geometry with vertex colours, so each component is a single draw call.
import * as THREE from 'three';
import { mergeGeometries } from '../lib/BufferGeometryUtils.js';

const WHITE = new THREE.Color('#ffffff');
const INK = new THREE.Color('#141c26');
const INK_DEEP = new THREE.Color('#0b1118');
const LED = new THREE.Color('#5BE38B');
const WARN = new THREE.Color('#F5B83D');
const ALERT = new THREE.Color('#F07171');

function makePalette(hex) {
  const base = new THREE.Color(hex);
  return {
    base,
    dark: base.clone().lerp(INK, 0.55),
    deep: base.clone().lerp(INK_DEEP, 0.8),
    light: base.clone().lerp(WHITE, 0.45),
    pale: base.clone().lerp(WHITE, 0.8),
    led: LED,
    warn: WARN,
    alert: ALERT,
  };
}

// ---- Part helpers (y is the centre of the part) ----
function part(geo, color, o = {}) {
  if (o.rx) geo.rotateX(o.rx);
  if (o.ry) geo.rotateY(o.ry);
  if (o.rz) geo.rotateZ(o.rz);
  geo.translate(o.x || 0, o.y || 0, o.z || 0);
  return { geo, color };
}
const box = (w, h, d, c, o) => part(new THREE.BoxGeometry(w, h, d), c, o);
const cyl = (rt, rb, h, seg, c, o) => part(new THREE.CylinderGeometry(rt, rb, h, seg), c, o);
const sph = (r, c, o) => part(new THREE.SphereGeometry(r, 16, 12), c, o);
const cone = (r, h, seg, c, o) => part(new THREE.ConeGeometry(r, h, seg), c, o);
const torus = (r, t, arc, c, o) => part(new THREE.TorusGeometry(r, t, 8, 28, arc), c, o);
const capsule = (r, len, c, o) => part(new THREE.CapsuleGeometry(r, len, 4, 12), c, o);

// ---- Hardware ----
function serverRack(p) {
  const W = 1.6, H = 3.4, D = 1.4, out = [];
  out.push(box(W, H, D, p.deep, { y: H / 2 }));
  out.push(box(W + 0.06, 0.1, D + 0.06, p.dark, { y: 0.05 }));
  out.push(box(W + 0.06, 0.08, D + 0.06, p.dark, { y: H + 0.04 }));
  for (let i = 0; i < 8; i++) {
    const y = 0.38 + i * 0.36;
    out.push(box(1.36, 0.28, 0.06, i % 3 === 2 ? p.dark : p.base, { y, z: D / 2 + 0.01 }));
    out.push(box(0.5, 0.04, 0.04, p.light, { x: -0.3, y: y + 0.05, z: D / 2 + 0.05 }));
    out.push(box(0.08, 0.08, 0.04, i === 5 ? p.warn : p.led, { x: 0.55, y, z: D / 2 + 0.05 }));
  }
  for (let i = 0; i < 4; i++) out.push(box(1.2, 0.03, 0.04, p.dark, { y: 3.12 + i * 0.07, z: D / 2 + 0.01 }));
  return out;
}

function server(p) {
  const out = [];
  out.push(box(0.8, 1.7, 1.4, p.base, { y: 0.85 }));
  out.push(box(0.7, 1.5, 0.05, p.dark, { y: 0.85, z: 0.71 }));
  for (let i = 0; i < 3; i++) out.push(box(0.5, 0.12, 0.04, p.light, { y: 1.4 - i * 0.2, z: 0.75 }));
  for (let i = 0; i < 5; i++) out.push(box(0.5, 0.03, 0.04, p.deep, { y: 0.45 + i * 0.08, z: 0.75 }));
  out.push(box(0.07, 0.07, 0.04, p.led, { x: 0.22, y: 0.2, z: 0.75 }));
  return out;
}

function storageArray(p) {
  const out = [box(2.0, 1.3, 1.2, p.deep, { y: 0.65 })];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      const x = -0.75 + c * 0.3, y = 0.27 + r * 0.4;
      out.push(box(0.26, 0.32, 0.05, (r + c) % 4 === 0 ? p.light : p.base, { x, y, z: 0.61 }));
      out.push(box(0.05, 0.05, 0.03, (r * 6 + c) % 7 === 3 ? p.warn : p.led, { x: x + 0.08, y: y + 0.11, z: 0.65 }));
    }
  }
  return out;
}

function ups(p) {
  const out = [box(1.0, 1.5, 1.2, p.base, { y: 0.75 })];
  out.push(box(0.82, 1.3, 0.04, p.dark, { y: 0.75, z: 0.61 }));
  out.push(box(0.5, 0.26, 0.03, p.pale, { y: 1.15, z: 0.64 }));
  for (let i = 0; i < 4; i++) out.push(box(0.09, 0.14, 0.03, i < 3 ? p.led : p.dark, { x: -0.15 + i * 0.1, y: 1.15, z: 0.66 }));
  for (let i = 0; i < 6; i++) out.push(box(0.6, 0.03, 0.03, p.deep, { y: 0.3 + i * 0.09, z: 0.64 }));
  return out;
}

function workstation(p) {
  return [
    box(0.6, 0.05, 0.4, p.dark, { y: 0.025 }),
    box(0.1, 0.6, 0.1, p.dark, { y: 0.33, z: -0.05 }),
    box(1.6, 1.0, 0.08, p.deep, { y: 1.1 }),
    box(1.48, 0.88, 0.02, p.pale, { y: 1.1, z: 0.05 }),
    box(1.2, 0.3, 0.02, p.base, { y: 1.3, z: 0.065 }),
    box(0.55, 0.32, 0.02, p.light, { x: -0.33, y: 0.86, z: 0.065 }),
    box(0.55, 0.32, 0.02, p.light, { x: 0.33, y: 0.86, z: 0.065 }),
    box(1.2, 0.06, 0.4, p.dark, { y: 0.03, z: 0.6 }),
  ];
}

// ---- Network ----
function networkSwitch(p) {
  const out = [box(2.6, 0.36, 1.3, p.base, { y: 0.18 })];
  out.push(box(0.12, 0.36, 0.1, p.dark, { x: -1.36, y: 0.18, z: 0.6 }));
  out.push(box(0.12, 0.36, 0.1, p.dark, { x: 1.36, y: 0.18, z: 0.6 }));
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < 12; i++) {
      out.push(box(0.13, 0.1, 0.04, p.deep, { x: -1.08 + i * 0.16, y: 0.11 + r * 0.14, z: 0.66 }));
      if ((i + r) % 3 !== 0) out.push(box(0.04, 0.03, 0.02, p.led, { x: -1.08 + i * 0.16, y: 0.17 + r * 0.14, z: 0.68 }));
    }
  }
  out.push(box(0.16, 0.12, 0.04, p.light, { x: 0.98, y: 0.18, z: 0.66 }));
  out.push(box(0.16, 0.12, 0.04, p.light, { x: 1.17, y: 0.18, z: 0.66 }));
  return out;
}

function router(p) {
  const out = [box(1.8, 0.45, 1.2, p.base, { y: 0.225 })];
  for (let i = 0; i < 5; i++) out.push(box(0.07, 0.07, 0.03, i === 4 ? p.warn : p.led, { x: -0.6 + i * 0.18, y: 0.24, z: 0.61 }));
  out.push(box(1.7, 0.04, 0.04, p.light, { y: 0.4, z: 0.6 }));
  [[-0.6, 0.25], [0, 0], [0.6, -0.25]].forEach(([x, tilt]) => {
    out.push(cyl(0.045, 0.05, 1.0, 8, p.dark, { rz: tilt, x: x - Math.sin(tilt) * 0.5, y: 0.45 + Math.cos(tilt) * 0.5, z: -0.45 }));
  });
  return out;
}

function firewall(p) {
  const out = [box(2.3, 0.12, 0.8, p.deep, { y: 0.06 })];
  const bw = 0.5, bh = 0.28, step = 0.54;
  for (let r = 0; r < 4; r++) {
    const y = 0.28 + r * 0.32;
    const col = (i) => ((r + i) % 3 === 0 ? p.dark : p.base);
    if (r % 2 === 0) {
      for (let i = 0; i < 4; i++) out.push(box(bw, bh, 0.6, col(i), { x: -0.81 + i * step, y }));
    } else {
      out.push(box(0.23, bh, 0.6, col(0), { x: -0.945, y }));
      for (let i = 0; i < 3; i++) out.push(box(bw, bh, 0.6, col(i + 1), { x: -0.54 + i * step, y }));
      out.push(box(0.23, bh, 0.6, col(4), { x: 0.945, y }));
    }
  }
  out.push(box(0.16, 0.16, 0.04, p.alert, { x: 0.8, y: 1.24, z: 0.32 }));
  return out;
}

function loadBalancer(p) {
  const out = [box(1.6, 0.5, 1.2, p.base, { y: 0.25 })];
  for (let i = 0; i < 3; i++) out.push(box(0.07, 0.07, 0.03, p.led, { x: 0.5 + i * 0.12, y: 0.25, z: 0.61 }));
  const y = 0.56;
  out.push(box(0.14, 0.08, 0.5, p.light, { y, z: 0.32 }));
  [-0.65, 0, 0.65].forEach((a) => {
    const dx = Math.sin(a), dz = -Math.cos(a);
    out.push(box(0.12, 0.08, 0.5, p.light, { ry: -a, x: dx * 0.25, y, z: 0.07 + dz * 0.25 }));
    out.push(cone(0.13, 0.24, 10, p.pale, { rx: -Math.PI / 2, ry: -a, x: dx * 0.6, y, z: 0.07 + dz * 0.6 }));
  });
  return out;
}

function accessPoint(p) {
  const out = [
    cyl(0.06, 0.06, 0.5, 8, p.dark, { y: 0.25 }),
    cyl(0.7, 0.75, 0.16, 28, p.base, { y: 0.58 }),
    sph(0.08, p.led, { y: 0.68 }),
  ];
  const arc = Math.PI / 2;
  [[0.35, p.light], [0.6, p.base], [0.85, p.light]].forEach(([r, c]) => {
    out.push(torus(r, 0.05, arc, c, { rz: Math.PI / 2 - arc / 2, y: 0.78 }));
  });
  return out;
}

// ---- Platform ----
function virtualMachine(p) {
  const s = 1.8, t = 0.07, h = s / 2, out = [];
  for (const x of [-h, h]) for (const z of [-h, h]) out.push(box(t, s, t, p.light, { x, y: h, z }));
  for (const y of [0, s]) {
    for (const z of [-h, h]) out.push(box(s, t, t, p.light, { y, z }));
    for (const x of [-h, h]) out.push(box(t, t, s, p.light, { x, y }));
  }
  out.push(box(1.0, 1.0, 1.0, p.base, { y: h }));
  out.push(box(0.7, 0.4, 0.02, p.pale, { y: h + 0.15, z: 0.51 }));
  return out;
}

function container(p) {
  const out = [box(2.2, 1.0, 0.95, p.base, { y: 0.5 })];
  for (let i = 0; i < 10; i++) {
    const x = -0.9 + i * 0.2;
    out.push(box(0.05, 0.88, 0.04, p.dark, { x, y: 0.5, z: 0.49 }));
    out.push(box(0.05, 0.88, 0.04, p.dark, { x, y: 0.5, z: -0.49 }));
  }
  out.push(box(2.24, 0.06, 0.06, p.dark, { y: 1.0, z: 0.47 }));
  out.push(box(2.24, 0.06, 0.06, p.dark, { y: 1.0, z: -0.47 }));
  out.push(box(0.04, 0.96, 0.92, p.dark, { x: 1.11, y: 0.5 }));
  out.push(box(0.03, 0.8, 0.04, p.light, { x: 1.14, y: 0.5, z: 0.15 }));
  out.push(box(0.03, 0.8, 0.04, p.light, { x: 1.14, y: 0.5, z: -0.15 }));
  return out;
}

function kubernetesCluster(p) {
  const out = [
    cyl(2.0, 2.1, 0.3, 6, p.dark, { y: 0.15 }),
    cyl(2.05, 2.05, 0.06, 6, p.base, { y: 0.33 }),
  ];
  const spots = [[0, 0]];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    spots.push([Math.cos(a) * 1.05, Math.sin(a) * 1.05]);
  }
  spots.forEach(([x, z], i) => {
    out.push(cyl(0.42, 0.42, 0.55, 6, i === 0 ? p.light : p.base, { x, y: 0.635, z }));
    out.push(cyl(0.36, 0.36, 0.05, 6, p.pale, { x, y: 0.93, z }));
  });
  return out;
}

function pod(p) {
  return [
    cyl(0.65, 0.65, 0.7, 6, p.base, { y: 0.35 }),
    cyl(0.6, 0.6, 0.06, 6, p.light, { y: 0.73 }),
    box(0.32, 0.22, 0.26, p.pale, { x: -0.18, y: 0.87 }),
    box(0.32, 0.22, 0.26, p.light, { x: 0.18, y: 0.87, z: 0.05 }),
  ];
}

function database(p) {
  const out = [];
  [0.21, 0.69, 1.17].forEach((y) => out.push(cyl(0.85, 0.85, 0.42, 28, p.base, { y })));
  [0.45, 0.93].forEach((y) => out.push(cyl(0.87, 0.87, 0.06, 28, p.dark, { y })));
  out.push(cyl(0.82, 0.82, 0.04, 28, p.light, { y: 1.4 }));
  return out;
}

function messageQueue(p) {
  const out = [box(2.4, 0.12, 0.9, p.dark, { x: -0.15, y: 0.06 })];
  for (let i = 0; i < 4; i++) out.push(box(0.42, 0.42, 0.6, i % 2 ? p.light : p.base, { x: -1.0 + i * 0.52, y: 0.33 }));
  out.push(cone(0.22, 0.4, 12, p.pale, { rz: -Math.PI / 2, x: 1.2, y: 0.33 }));
  return out;
}

function objectStorage(p) {
  return [
    cyl(0.95, 0.7, 1.2, 28, p.base, { y: 0.6 }),
    torus(0.95, 0.06, Math.PI * 2, p.light, { rx: Math.PI / 2, y: 1.2 }),
    cyl(0.9, 0.9, 0.02, 28, p.deep, { y: 1.19 }),
    box(0.35, 0.35, 0.35, p.light, { rz: 0.3, x: -0.25, y: 1.25 }),
    sph(0.2, p.pale, { x: 0.3, y: 1.25, z: 0.1 }),
    box(0.25, 0.25, 0.25, p.pale, { ry: 0.5, x: 0.05, y: 1.2, z: -0.35 }),
  ];
}

function cache(p) {
  const out = [box(2.3, 0.12, 0.9, p.deep, { y: 0.06 })];
  [0.22, -0.22].forEach((z) => {
    out.push(box(2.0, 0.6, 0.06, p.base, { y: 0.5, z }));
    out.push(box(1.8, 0.08, 0.07, p.warn, { y: 0.24, z }));
    for (let i = 0; i < 4; i++) out.push(box(0.32, 0.3, 0.04, p.deep, { x: -0.66 + i * 0.44, y: 0.55, z: z + 0.05 }));
  });
  return out;
}

// ---- Application ----
function webApp(p) {
  return [
    box(1.0, 0.08, 0.5, p.dark, { y: 0.04 }),
    box(0.12, 0.2, 0.08, p.dark, { y: 0.14 }),
    box(2.4, 1.6, 0.12, p.pale, { y: 1.0 }),
    box(2.4, 0.22, 0.14, p.dark, { y: 1.69 }),
    sph(0.05, p.alert, { x: -1.05, y: 1.69, z: 0.08 }),
    sph(0.05, p.warn, { x: -0.92, y: 1.69, z: 0.08 }),
    sph(0.05, p.led, { x: -0.79, y: 1.69, z: 0.08 }),
    box(0.6, 0.13, 0.02, p.base, { x: -0.35, y: 1.69, z: 0.075 }),
    box(1.9, 0.12, 0.02, p.light, { x: 0.1, y: 1.47, z: 0.07 }),
    box(2.1, 0.42, 0.02, p.base, { y: 1.13, z: 0.07 }),
    box(1.0, 0.36, 0.02, p.light, { x: -0.55, y: 0.66, z: 0.07 }),
    box(1.0, 0.36, 0.02, p.light, { x: 0.55, y: 0.66, z: 0.07 }),
  ];
}

function apiService(p) {
  const out = [
    cyl(0.6, 0.7, 0.27, 20, p.dark, { y: 0.135 }),
    cyl(0.85, 0.85, 0.35, 28, p.base, { y: 0.45 }),
  ];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    out.push(box(0.3, 0.35, 0.3, p.base, { ry: -a, x: Math.cos(a) * 0.95, y: 0.45, z: Math.sin(a) * 0.95 }));
  }
  out.push(cyl(0.35, 0.35, 0.37, 20, p.deep, { y: 0.46 }));
  out.push(cyl(0.18, 0.18, 0.4, 16, p.light, { y: 0.47 }));
  return out;
}

function mobileApp(p) {
  const out = [
    box(0.6, 0.08, 0.45, p.dark, { y: 0.04 }),
    box(0.1, 0.16, 0.08, p.dark, { y: 0.14, z: -0.02 }),
    box(0.85, 1.6, 0.12, p.deep, { y: 1.0 }),
    box(0.75, 1.42, 0.02, p.pale, { y: 1.0, z: 0.065 }),
    box(0.25, 0.05, 0.02, p.deep, { y: 1.66, z: 0.077 }),
  ];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) out.push(box(0.16, 0.16, 0.02, (r + c) % 2 ? p.light : p.base, { x: -0.22 + c * 0.22, y: 1.45 - r * 0.24, z: 0.08 }));
  }
  return out;
}

function person(c, x, z, s) {
  return [
    capsule(0.28 * s, 0.5 * s, c, { x, y: 0.55 * s, z }),
    sph(0.24 * s, c, { x, y: 1.33 * s, z }),
  ];
}

function users(p) {
  return [
    cyl(1.0, 1.0, 0.06, 28, p.dark, { y: 0.03 }),
    ...person(p.light, -0.38, -0.25, 0.9),
    ...person(p.base, 0.32, 0.2, 1.0),
  ];
}

function externalService(p) {
  return [
    sph(0.6, p.pale, { y: 0.95 }),
    sph(0.45, p.pale, { x: -0.62, y: 0.72 }),
    sph(0.5, p.pale, { x: 0.6, y: 0.75 }),
    sph(0.4, p.light, { x: -0.25, y: 0.62, z: 0.25 }),
    sph(0.42, p.light, { x: 0.3, y: 0.62, z: -0.2 }),
    cyl(0.04, 0.04, 0.3, 8, p.dark, { y: 0.15 }),
    cyl(0.4, 0.4, 0.04, 20, p.dark, { y: 0.02 }),
  ];
}

function generic(p) {
  return [
    box(1.4, 1.4, 1.4, p.base, { y: 0.7 }),
    box(1.3, 0.06, 1.3, p.light, { y: 1.43 }),
    box(1.0, 0.6, 0.03, p.dark, { y: 0.8, z: 0.71 }),
  ];
}

// ---- Registry ----
// `layer` is the default layer a new component of this type is placed on.
export const MODEL_TYPES = [
  { id: 'server-rack', label: 'Server rack', layer: 'hardware', build: serverRack },
  { id: 'server', label: 'Server', layer: 'hardware', build: server },
  { id: 'storage-array', label: 'Storage array', layer: 'hardware', build: storageArray },
  { id: 'ups', label: 'UPS / power', layer: 'hardware', build: ups },
  { id: 'workstation', label: 'Workstation', layer: 'hardware', build: workstation },
  { id: 'switch', label: 'Network switch', layer: 'network', build: networkSwitch },
  { id: 'router', label: 'Router', layer: 'network', build: router },
  { id: 'firewall', label: 'Firewall', layer: 'network', build: firewall },
  { id: 'load-balancer', label: 'Load balancer', layer: 'network', build: loadBalancer },
  { id: 'access-point', label: 'Wireless access point', layer: 'network', build: accessPoint },
  { id: 'vm', label: 'Virtual machine', layer: 'platform', build: virtualMachine },
  { id: 'container', label: 'Container', layer: 'platform', build: container },
  { id: 'k8s-cluster', label: 'Kubernetes cluster', layer: 'platform', build: kubernetesCluster },
  { id: 'pod', label: 'Pod', layer: 'platform', build: pod },
  { id: 'database', label: 'Database', layer: 'platform', build: database },
  { id: 'queue', label: 'Message queue', layer: 'platform', build: messageQueue },
  { id: 'object-storage', label: 'Object storage', layer: 'platform', build: objectStorage },
  { id: 'cache', label: 'Cache', layer: 'platform', build: cache },
  { id: 'web-app', label: 'Web app', layer: 'application', build: webApp },
  { id: 'api-service', label: 'API / service', layer: 'application', build: apiService },
  { id: 'mobile-app', label: 'Mobile app', layer: 'application', build: mobileApp },
  { id: 'users', label: 'Users', layer: 'application', build: users },
  { id: 'external-service', label: 'External service', layer: 'application', build: externalService },
  { id: 'generic', label: 'Generic', layer: null, build: generic },
];

export const TYPE_MAP = Object.fromEntries(MODEL_TYPES.map((t) => [t.id, t]));

const geometryCache = new Map();

// Returns a merged, vertex-coloured geometry for a model type and colour.
// Results are cached and shared, so callers must not dispose them.
export function getModelGeometry(type, colorHex) {
  const key = `${type}|${colorHex}`;
  if (geometryCache.has(key)) return geometryCache.get(key);
  const def = TYPE_MAP[type] || TYPE_MAP.generic;
  const parts = def.build(makePalette(colorHex));
  const geos = parts.map(({ geo, color }) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
    }
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  geometryCache.set(key, merged);
  return merged;
}
