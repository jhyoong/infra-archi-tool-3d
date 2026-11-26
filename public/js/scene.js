import * as THREE from 'three';
import { OrbitControls } from '../lib/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from '../lib/CSS2DRenderer.js';
import { getModelGeometry } from './models.js';
import { CONN_KINDS, groupDepth, groupParent, descendantGroups, groupMembers } from './data.js';

export const VIEW_FOV = { '3d': 42, iso: 12 };
const HOME_DIR = new THREE.Vector3(0.85, 0.72, 1.3).normalize();
const ISO_DIR = new THREE.Vector3(1, 0.92, 1).normalize();
const LAYER_DIR = new THREE.Vector3(0.55, 1.35, 0.95).normalize();
const BG = new THREE.Color('#0E1724');
const AMBER = new THREE.Color('#F5B83D');

// Line look per connection kind. `dash` is [dashSize, gapSize] in world units; null draws a solid line.
// Kinds differ by pattern as well as colour. Task 5's legend reads this to draw matching swatches.
export const KIND_STYLES = {
  data: { color: '#93A4BA', dash: null },
  'runs-on': { color: '#6CB6FF', dash: [1.2, 0.4] },
  manages: { color: '#B992FF', dash: [0.5, 0.35] },
  overlay: { color: '#FF7EB6', dash: [0.18, 0.18] },
  storage: { color: '#4FD1A5', dash: [0.9, 0.9] },
  power: { color: '#F07167', dash: [0.1, 0.5] },
};
const KIND_COLOR = {}, KIND_DIM = {};
for (const [k, st] of Object.entries(KIND_STYLES)) {
  KIND_COLOR[k] = new THREE.Color(st.color);
  KIND_DIM[k] = KIND_COLOR[k].clone().lerp(BG, 0.75);
}
const DIRECTED = new Set(CONN_KINDS.filter((k) => k.directed).map((k) => k.id));
const ARROW_LEN = 0.75;
const LABEL_RANGE = 30; // labels show when the view is closer than this
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const round2 = (n) => Math.round(n * 100) / 100;

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.isCSS2DObject) o.element.remove();
    if (o.isSprite) { o.material.dispose(); return; }
    if (o.geometry && !o.userData.cachedGeo) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xe4ecf7, 0x1a2433, 2.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(30, 60, 40);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x9fb4d6, 0.6);
  fill.position.set(-40, 20, -30);
  scene.add(fill);
}

export class MapScene {
  constructor(container, handlers = {}) {
    this.el = container;
    this.h = handlers;
    this.data = null;
    this.view = '3d';
    this.editMode = false;
    this.connectMode = false;
    this.labelsOn = true;
    this.gap = 10;
    this.hiddenLayers = new Set();
    this.visibleKinds = new Set(CONN_KINDS.map((k) => k.id));
    this.selection = [];
    this.selKind = null;
    this.highlight = null;
    this.hoverId = null;
    this.layerObjs = new Map();
    this.compObjs = new Map();
    this.groupObjs = new Map();
    this.badgeCache = new Map();
    this.connRanges = [];
    this._wp = new THREE.Vector3();

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(BG);
    container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.domElement.className = 'label-layer';
    container.appendChild(this.labelRenderer.domElement);

    this.scene = new THREE.Scene();
    addLights(this.scene);

    this.camera = new THREE.PerspectiveCamera(VIEW_FOV['3d'], 1, 0.5, 8000);
    this.camera.position.set(40, 35, 55);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, {
      enableDamping: true,
      dampingFactor: 0.12,
      screenSpacePanning: true,
      maxPolarAngle: Math.PI * 0.49,
      minDistance: 2,
      maxDistance: 4000,
    });
    this.controls.addEventListener('start', () => { this.anim = null; });

    this.root = new THREE.Group();
    this.scene.add(this.root);

    // One LineSegments per connection kind; geometries are replaced on every rebuild, materials persist.
    this.connLines = new Map();
    for (const { id } of CONN_KINDS) {
      const st = KIND_STYLES[id];
      const opts = { vertexColors: true, transparent: true, opacity: 0.9 };
      const mat = st.dash
        ? new THREE.LineDashedMaterial({ ...opts, dashSize: st.dash[0], gapSize: st.dash[1] })
        : new THREE.LineBasicMaterial(opts);
      const line = new THREE.LineSegments(new THREE.BufferGeometry(), mat);
      this.connLines.set(id, line);
      this.scene.add(line);
    }
    // Arrowheads for directed kinds: shared cone geometry with its tip at the origin, pointing +Y.
    this.arrowGeo = new THREE.ConeGeometry(0.28, ARROW_LEN, 14);
    this.arrowGeo.translate(0, -ARROW_LEN / 2, 0);
    this.connArrows = new THREE.Group();
    this.scene.add(this.connArrows);
    this.connLabels = new THREE.Group();
    this.scene.add(this.connLabels);

    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();

    this._bindPointer();
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this.renderer.setAnimationLoop(() => this._tick());
  }

  // ---------- Build ----------
  update(data) {
    this.data = data;
    this.gap = data.meta.layerGap ?? 10;
    for (const child of [...this.root.children]) {
      this.root.remove(child);
      disposeTree(child);
    }
    this.layerObjs.clear();
    this.compObjs.clear();
    this.groupObjs.clear();
    this._computeBounds();
    data.layers.forEach((L, i) => this._buildLayer(L, i));
    data.groups.forEach((G) => this._buildGroup(G));
    data.components.forEach((C) => this._buildComp(C));
    this.root.updateMatrixWorld(true);
    this._buildConnections();
    this._applyEmphasis();
  }

  _computeBounds() {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const grow = (x0, x1, z0, z1) => {
      minX = Math.min(minX, x0); maxX = Math.max(maxX, x1);
      minZ = Math.min(minZ, z0); maxZ = Math.max(maxZ, z1);
    };
    for (const c of this.data.components) grow(c.x - 2, c.x + 2, c.z - 2, c.z + 2);
    for (const g of this.data.groups) grow(g.x - g.w / 2, g.x + g.w / 2, g.z - g.d / 2, g.z + g.d / 2);
    if (!isFinite(minX)) { minX = -15; maxX = 15; minZ = -10; maxZ = 10; }
    minX -= 3; maxX += 3; minZ -= 3; maxZ += 3;
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const w = Math.max(30, maxX - minX), d = Math.max(20, maxZ - minZ);
    this.bounds = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, cx, cz, w, d };
  }

  _buildLayer(L, index) {
    const { minX, maxZ, cx, cz, w, d } = this.bounds;
    const col = new THREE.Color(L.color);
    const group = new THREE.Group();
    group.position.y = index * this.gap;
    group.visible = !this.hiddenLayers.has(L.id);

    const slabGeo = new THREE.BoxGeometry(w, 0.12, d);
    const slab = new THREE.Mesh(slabGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.075, depthWrite: false }));
    slab.position.set(cx, -0.06, cz);
    group.add(slab);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(slabGeo), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.5 }));
    edges.position.copy(slab.position);
    group.add(edges);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: col }));
    strip.position.set(cx, -0.06, maxZ);
    group.add(strip);

    const grid = this._makeGrid(col);
    grid.visible = this.editMode;
    group.add(grid);

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'lbl-layer';
    el.style.setProperty('--c', L.color);
    el.textContent = L.name;
    el.title = `Zoom to ${L.name}`;
    el.addEventListener('click', () => this.h.onLayerClick?.(L.id));
    const label = new CSS2DObject(el);
    label.position.set(minX, 0, maxZ);
    label.center.set(0, 0);
    label.visible = group.visible;
    group.add(label);

    this.root.add(group);
    this.layerObjs.set(L.id, { group, label, grid, index, color: L.color });
  }

  _makeGrid(col) {
    const { minX, maxX, minZ, maxZ } = this.bounds;
    const pts = [];
    for (let x = Math.ceil(minX / 2) * 2; x <= maxX; x += 2) pts.push(x, 0.01, minZ, x, 0.01, maxZ);
    for (let z = Math.ceil(minZ / 2) * 2; z <= maxZ; z += 2) pts.push(minX, 0.01, z, maxX, 0.01, z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.14 }));
  }

  _buildGroup(G) {
    const lo = this.layerObjs.get(G.layer);
    if (!lo) return;
    const col = new THREE.Color(G.color || lo.color);
    const holder = new THREE.Group();
    const groups = this.data.groups;
    const depth = groupDepth(groups, G);
    holder.position.set(G.x, 0.01 + depth * 0.04, G.z);

    const fill = new THREE.Mesh(
      new THREE.PlaneGeometry(G.w, G.d),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide })
    );
    fill.rotation.x = -Math.PI / 2;
    fill.userData = { kind: 'group', id: G.id };
    holder.add(fill);

    const hw = G.w / 2, hd = G.d / 2;
    const pts = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd], [-hw, -hd]].map(([x, z]) => new THREE.Vector3(x, 0.02, z));
    // Deeper groups get a brighter, more opaque outline so nested rectangles stay distinguishable.
    const baseColor = col.clone().lerp(new THREE.Color('#ffffff'), Math.min(0.3 + depth * 0.2, 0.85));
    const outline = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineDashedMaterial({ color: baseColor, dashSize: 0.6, gapSize: 0.35, transparent: true, opacity: Math.min(0.6 + depth * 0.2, 1) })
    );
    outline.computeLineDistances();
    holder.add(outline);

    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'lbl-group';
    el.textContent = G.name || 'Untitled group';
    el.addEventListener('click', (e) => this.h.onPick?.({ kind: 'group', id: G.id }, e));
    const label = new CSS2DObject(el);
    // Nudge the label in z for each ancestor whose top-left corner coincides with ours.
    let nudge = 0;
    for (let c = G, p = groupParent(groups, c); p; c = p, p = groupParent(groups, c)) {
      if (p.x - p.w / 2 !== c.x - c.w / 2 || p.z - p.d / 2 !== c.z - c.d / 2) break;
      nudge += 0.4;
    }
    label.position.set(-hw, 0.05, -hd + nudge);
    label.center.set(0, 1);
    holder.add(label);

    lo.group.add(holder);
    this.groupObjs.set(G.id, { holder, fill, outline, label, baseColor, layerId: G.layer, data: G });
  }

  _buildComp(C) {
    const lo = this.layerObjs.get(C.layer);
    if (!lo) return;
    const geo = getModelGeometry(C.type, C.color || lo.color);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true }));
    mesh.userData = { kind: 'component', id: C.id, cachedGeo: true };
    const s = C.scale || 1;
    mesh.scale.setScalar(s);

    const holder = new THREE.Group();
    holder.position.set(C.x, 0.02, C.z);
    holder.add(mesh);

    const bb = geo.boundingBox;
    const height = bb.max.y * s;
    const radius = (Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) * s) / 2;
    let top = height + 0.35;

    let badge = null;
    const iconPath = C.icon || this.data.typeIcons?.[C.type];
    if (iconPath) {
      badge = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
      badge.visible = false;
      badge.scale.set(1.3, 1.3, 1);
      badge.position.y = height + 0.95;
      holder.add(badge);
      top = height + 1.75;
      this._loadBadge(iconPath).then((tex) => {
        if (!tex) return;
        badge.material.map = tex;
        badge.material.needsUpdate = true;
        badge.visible = true;
      });
    }

    const el = document.createElement('div');
    el.className = 'lbl';
    el.textContent = C.name || 'Untitled';
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.h.onPick?.({ kind: 'component', id: C.id }, e);
    });
    const label = new CSS2DObject(el);
    label.position.y = top;
    label.center.set(0.5, 1);
    holder.add(label);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius + 0.25, radius + 0.42, 48),
      new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    ring.visible = false;
    holder.add(ring);

    lo.group.add(holder);
    this.compObjs.set(C.id, { holder, mesh, label, badge, ring, height, radius, layerId: C.layer, data: C });
  }

  _loadBadge(path) {
    if (!this.badgeCache.has(path)) {
      this.badgeCache.set(path, new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const size = 128, pad = 24;
          const c = document.createElement('canvas');
          c.width = c.height = size;
          const g = c.getContext('2d');
          g.fillStyle = '#ffffff';
          g.beginPath();
          g.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2);
          g.fill();
          g.lineWidth = 4;
          g.strokeStyle = 'rgba(14, 23, 36, 0.25)';
          g.stroke();
          const iw = img.naturalWidth || size, ih = img.naturalHeight || size;
          const k = Math.min((size - pad * 2) / iw, (size - pad * 2) / ih);
          g.drawImage(img, size / 2 - (iw * k) / 2, size / 2 - (ih * k) / 2, iw * k, ih * k);
          const tex = new THREE.CanvasTexture(c);
          tex.colorSpace = THREE.SRGBColorSpace;
          resolve(tex);
        };
        img.onerror = () => {
          console.warn(`Icon not found or not an image: ${path}`);
          resolve(null);
        };
        img.src = path;
      }));
    }
    return this.badgeCache.get(path);
  }

  // A connection endpoint: a component, or a group anchored at its centre just above its layer (height 0).
  _endpoint(id) {
    const c = this.compObjs.get(id);
    if (c) return { pos: c.holder.getWorldPosition(new THREE.Vector3()), height: c.height, lift: 0.02, layerId: c.layerId };
    const g = this.groupObjs.get(id);
    const lo = g && this.layerObjs.get(g.layerId);
    if (!lo) return null;
    const pos = g.holder.getWorldPosition(new THREE.Vector3());
    pos.y = lo.group.getWorldPosition(this._wp).y + 0.05;
    return { pos, height: 0, lift: 0, layerId: g.layerId };
  }

  // Points run from A to B, so the last segment points at B.
  _connPoints(A, B) {
    if (A.layerId === B.layerId) {
      const s = A.pos.clone(); s.y += A.height * 0.55;
      const e = B.pos.clone(); e.y += B.height * 0.55;
      const c = s.clone().add(e).multiplyScalar(0.5);
      c.y += 1.2 + s.distanceTo(e) * 0.18;
      const curve = new THREE.QuadraticBezierCurve3(s, c, e);
      return { pts: curve.getPoints(16), mid: curve.getPoint(0.5) };
    }
    const aLow = A.pos.y < B.pos.y;
    const [lo, hi] = aLow ? [A, B] : [B, A];
    const s = lo.pos.clone(); s.y += lo.height;
    const e = hi.pos.clone(); e.y += hi.lift;
    return { pts: aLow ? [s, e] : [e, s], mid: s.clone().lerp(e, 0.5) };
  }

  _buildConnections() {
    if (!this.data) return;
    for (const l of [...this.connLabels.children]) {
      this.connLabels.remove(l);
      l.element.remove();
    }
    for (const a of [...this.connArrows.children]) {
      this.connArrows.remove(a);
      a.material.dispose();
    }
    const posByKind = new Map([...this.connLines.keys()].map((kind) => [kind, []]));
    this.connRanges = [];
    for (const k of this.data.connections) {
      const pos = posByKind.get(k.kind);
      if (!pos || !this.visibleKinds.has(k.kind)) continue;
      const A = this._endpoint(k.from), B = this._endpoint(k.to);
      if (!A || !B || this.hiddenLayers.has(A.layerId) || this.hiddenLayers.has(B.layerId)) continue;
      const { pts, mid } = this._connPoints(A, B);
      const start = pos.length / 3;
      for (let i = 0; i < pts.length - 1; i++) pos.push(...pts[i].toArray(), ...pts[i + 1].toArray());
      let arrow = null;
      if (DIRECTED.has(k.kind)) {
        const tip = pts[pts.length - 1];
        const dir = tip.clone().sub(pts[pts.length - 2]).normalize();
        arrow = new THREE.Mesh(this.arrowGeo, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 }));
        arrow.position.copy(tip);
        arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        this.connArrows.add(arrow);
      }
      let label = null;
      if (k.label) {
        const el = document.createElement('div');
        el.className = 'lbl-conn';
        el.textContent = k.label;
        label = new CSS2DObject(el);
        label.position.copy(mid);
        label.visible = false;
        this.connLabels.add(label);
      }
      this.connRanges.push({ conn: k, start, count: pos.length / 3 - start, label, arrow });
    }
    for (const [kind, line] of this.connLines) {
      const pos = posByKind.get(kind);
      line.geometry.dispose();
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(pos.length), 3));
      geo.computeBoundingSphere();
      line.geometry = geo;
      if (line.material.isLineDashedMaterial) line.computeLineDistances();
    }
    this._colorConnections();
  }

  setVisibleKinds(kinds) {
    this.visibleKinds = new Set(kinds);
    this._buildConnections();
    this._applyEmphasis();
  }

  // ---------- Emphasis (selection, storyline highlights) ----------
  _emphasis() {
    if (this.highlight) {
      // A highlighted group brings its nested groups and member components with it,
      // so the step doesn't dim the very things it is pointing at.
      const core = new Set(this.highlight);
      const ids = new Set(core);
      for (const g of this.data?.groups ?? []) {
        if (!core.has(g.id)) continue;
        for (const sub of [g, ...descendantGroups(this.data.groups, g)]) {
          ids.add(sub.id);
          for (const c of groupMembers(this.data.components, sub)) ids.add(c.id);
        }
      }
      return { mode: 'story', ids, core };
    }
    const selectable = this.selKind === 'component' || this.selKind === 'group';
    if (selectable && this.selection.length && !this.editMode) {
      const core = new Set(this.selection);
      const ids = new Set(core);
      let linked = false;
      for (const k of this.data.connections) {
        if (!this.visibleKinds.has(k.kind)) continue;
        if (core.has(k.from)) { ids.add(k.to); linked = true; }
        if (core.has(k.to)) { ids.add(k.from); linked = true; }
      }
      // A selected group only takes over emphasis when it has connections of its own.
      if (this.selKind === 'component' || linked) return { mode: 'select', ids, core };
    }
    return null;
  }

  _colorConnections() {
    if (!this.data) return;
    const emph = this._emphasis();
    for (const r of this.connRanges) {
      let hot = false, dim = false;
      if (emph) {
        hot = emph.mode === 'story'
          ? emph.ids.has(r.conn.from) && emph.ids.has(r.conn.to)
          : emph.core.has(r.conn.from) || emph.core.has(r.conn.to);
        dim = !hot;
      }
      const c = hot ? AMBER : dim ? KIND_DIM[r.conn.kind] : KIND_COLOR[r.conn.kind];
      const attr = this.connLines.get(r.conn.kind).geometry.getAttribute('color');
      for (let i = 0; i < r.count; i++) attr.setXYZ(r.start + i, c.r, c.g, c.b);
      if (r.arrow) r.arrow.material.color.copy(c);
      if (r.label) r.label.visible = hot;
    }
    for (const line of this.connLines.values()) line.geometry.getAttribute('color').needsUpdate = true;
  }

  _applyEmphasis() {
    const emph = this._emphasis();
    for (const [id, o] of this.compObjs) {
      const dim = !!emph && !emph.ids.has(id);
      const sel = this.selKind === 'component' && this.selection.includes(id);
      o.mesh.material.opacity = dim ? 0.16 : 1;
      o.mesh.material.depthWrite = !dim;
      o.mesh.material.emissive.set(sel ? 0x2a1e05 : 0x000000);
      if (o.badge) o.badge.material.opacity = dim ? 0.2 : 1;
      o.ring.visible = sel;
      o.label.element.classList.toggle('dim', dim);
      o.label.element.classList.toggle('sel', sel);
    }
    for (const [id, g] of this.groupObjs) {
      const sel = this.selKind === 'group' && this.selection.includes(id);
      const lit = sel || (emph?.mode === 'story' && emph.core.has(id));
      g.outline.material.color.copy(lit ? AMBER : g.baseColor);
      g.label.element.classList.toggle('sel', sel);
      g.label.element.classList.toggle('dim', !!emph && !sel && !emph.ids.has(id));
    }
    this._colorConnections();
  }

  setSelection(ids, kind) {
    this.selection = ids;
    this.selKind = ids.length ? kind : null;
    this._applyEmphasis();
  }

  setHighlight(ids) {
    this.highlight = ids && ids.length ? [...ids] : null;
    this._applyEmphasis();
  }

  setLabelText(id, text) {
    const o = this.compObjs.get(id);
    if (o) o.label.element.textContent = text;
  }

  // ---------- Display options ----------
  setEditMode(on) {
    this.editMode = on;
    for (const lo of this.layerObjs.values()) lo.grid.visible = on;
    this._updateCursor();
    this._applyEmphasis();
  }

  // Keeps framed content clear of an overlay along the bottom (the storyline card).
  setBottomInset(px) {
    this.insetBottom = Math.max(0, Math.round(px));
    this.resize();
  }

  setConnectMode(on) {
    this.connectMode = on;
    this._updateCursor();
  }

  setLayerVisible(id, visible) {
    if (visible) this.hiddenLayers.delete(id); else this.hiddenLayers.add(id);
    const lo = this.layerObjs.get(id);
    if (lo) {
      lo.group.visible = visible;
      lo.label.visible = visible;
    }
    this._buildConnections();
  }

  setLayerGap(gap) {
    this.gap = gap;
    for (const lo of this.layerObjs.values()) lo.group.position.y = lo.index * gap;
    this.root.updateMatrixWorld(true);
    this._buildConnections();
  }

  // ---------- Camera ----------
  _setViewMode(view) {
    if (view === this.view) return;
    this.view = view;
    this.controls.enableRotate = view === '3d';
    this.h.onViewChange?.(view);
  }

  _flyTo(pos, target, fov, ms = 850) {
    this.anim = {
      p0: this.camera.position.clone(), t0: this.controls.target.clone(), f0: this.camera.fov,
      p1: pos, t1: target, f1: fov,
      start: performance.now(), ms: reduceMotion ? 0 : ms,
    };
  }

  _currentDir() {
    if (this.view === 'iso') return HOME_DIR.clone();
    return this.camera.position.clone().sub(this.controls.target).normalize();
  }

  _frameSphere(center, radius, view, dir, ms) {
    const h = this.el.clientHeight || 1;
    const inset = Math.min(this.insetBottom || 0, h * 0.5);
    const free = (h - inset) / (h + inset); // share of the frustum not covered by an overlay
    const full = THREE.MathUtils.degToRad(VIEW_FOV[view]) / 2;
    const half = Math.atan(Math.tan(full) * free);
    const hHalf = Math.atan(Math.tan(full) * this.camera.aspect * (h / (h + inset)));
    const dist = radius / Math.sin(Math.min(half, hHalf));
    const d = (dir || (view === 'iso' ? ISO_DIR : this._currentDir())).clone();
    this._setViewMode(view);
    this._flyTo(center.clone().addScaledVector(d, dist), center.clone(), VIEW_FOV[view], ms);
  }

  setView(view) {
    if (view === this.view) return;
    const t = this.controls.target.clone();
    const size = this.camera.position.distanceTo(t) * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const fov = VIEW_FOV[view];
    const dist = size / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    this._setViewMode(view);
    this._flyTo(t.clone().addScaledVector(view === 'iso' ? ISO_DIR : HOME_DIR, dist), t, fov);
  }

  home({ instant = false } = {}) {
    const { cx, cz, w, d } = this.bounds;
    const topY = Math.max(0, this.data.layers.length - 1) * this.gap + 3;
    const box = new THREE.Box3(new THREE.Vector3(cx - w / 2, 0, cz - d / 2), new THREE.Vector3(cx + w / 2, topY, cz + d / 2));
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    this._frameSphere(sphere.center, sphere.radius * 0.95, this.view, this.view === 'iso' ? ISO_DIR : HOME_DIR, instant ? 0 : undefined);
  }

  focusComponent(id) {
    const o = this.compObjs.get(id);
    if (!o) return;
    const c = o.holder.getWorldPosition(new THREE.Vector3());
    c.y += o.height / 2;
    this._frameSphere(c, Math.max(8, o.radius * 4, o.height * 2.5), this.view);
  }

  focusGroup(id) {
    const g = this.groupObjs.get(id);
    if (!g) return;
    const c = g.holder.getWorldPosition(new THREE.Vector3());
    this._frameSphere(c, Math.hypot(g.data.w, g.data.d) / 2 + 2, this.view);
  }

  focusLayer(id) {
    const lo = this.layerObjs.get(id);
    if (!lo) return;
    const { cx, cz, w, d } = this.bounds;
    const c = new THREE.Vector3(cx, lo.group.position.y + 1, cz);
    this._frameSphere(c, (Math.hypot(w, d) / 2) * 0.72, this.view, this.view === 'iso' ? ISO_DIR : LAYER_DIR);
  }

  frameIds(ids, view = this.view) {
    // Components frame by their mesh, groups by their footprint.
    const objs = (ids || []).map((id) => this.compObjs.get(id)?.mesh || this.groupObjs.get(id)?.fill).filter(Boolean);
    if (!objs.length) {
      this._setViewMode(view);
      this.home();
      return;
    }
    const box = new THREE.Box3();
    for (const o of objs) box.expandByObject(o);
    const s = box.getBoundingSphere(new THREE.Sphere());
    this._frameSphere(s.center, Math.max(5, s.radius * 1.2), view, view === 'iso' ? ISO_DIR : undefined);
  }

  getCameraState() {
    return {
      view: this.view,
      position: this.camera.position.toArray().map(round2),
      target: this.controls.target.toArray().map(round2),
    };
  }

  applyCameraState(s) {
    this._setViewMode(s.view);
    this._flyTo(v3(s.position), v3(s.target), VIEW_FOV[s.view]);
  }

  getTarget() {
    return this.controls.target.clone();
  }

  resize() {
    const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
    this.camera.aspect = w / h;
    const inset = Math.min(this.insetBottom || 0, h * 0.5);
    if (inset) this.camera.setViewOffset(w, h + inset, 0, inset, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  // ---------- Pointer: picking, hover, dragging ----------
  _setNdc(e) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
  }

  _pick(e) {
    this._setNdc(e);
    const comps = [];
    for (const o of this.compObjs.values()) if (!this.hiddenLayers.has(o.layerId)) comps.push(o.mesh);
    let hit = this.raycaster.intersectObjects(comps, false)[0];
    if (hit) return { kind: 'component', id: hit.object.userData.id };
    const groups = [];
    for (const g of this.groupObjs.values()) if (!this.hiddenLayers.has(g.layerId)) groups.push(g.fill);
    hit = this.raycaster.intersectObjects(groups, false)[0];
    if (hit) return { kind: 'group', id: hit.object.userData.id };
    return null;
  }

  _planePoint(e, plane) {
    this._setNdc(e);
    return this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
  }

  _bindPointer() {
    const c = this.renderer.domElement;
    c.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.down = { x: e.clientX, y: e.clientY };
      if (this.editMode && !e.shiftKey && !this.connectMode) {
        const hit = this._pick(e);
        if (hit) this._startDrag(hit, e);
        if (this.drag) c.setPointerCapture(e.pointerId);
      }
    }, { capture: true });
    c.addEventListener('pointermove', (e) => {
      if (this.drag) this._moveDrag(e);
      else this._hoverEvt = e;
    });
    c.addEventListener('pointerleave', () => {
      this._hoverEvt = null;
      this._setHover(null);
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      const down = this.down;
      this.down = null;
      const moved = down ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : Infinity;
      if (this.drag) {
        const d = this.drag;
        this._endDrag(moved > 3);
        if (moved <= 3) this.h.onPick?.({ kind: d.kind, id: d.id }, e);
        return;
      }
      if (moved <= 3 && e.target === c) this.h.onPick?.(this._pick(e), e);
    });
  }

  _startDrag(hit, e) {
    const obj = hit.kind === 'component' ? this.compObjs.get(hit.id) : this.groupObjs.get(hit.id);
    const lo = obj && this.layerObjs.get(obj.layerId);
    if (!lo) return;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -lo.group.position.y);
    const start = this._planePoint(e, plane);
    if (!start) return;
    const members = [];
    if (hit.kind === 'group') {
      const G = obj.data;
      const add = (kind, id, o) => members.push({ kind, id, o, x0: o.holder.position.x, z0: o.holder.position.z });
      const nested = descendantGroups(this.data.groups, G);
      for (const g of nested) {
        const o = this.groupObjs.get(g.id);
        if (o) add('group', g.id, o);
      }
      const seen = new Set();
      for (const g of [G, ...nested]) {
        for (const c of groupMembers(this.data.components, g)) {
          const o = this.compObjs.get(c.id);
          if (o && !seen.has(c.id)) { seen.add(c.id); add('component', c.id, o); }
        }
      }
    }
    this.drag = { kind: hit.kind, id: hit.id, obj, plane, start, x0: obj.holder.position.x, z0: obj.holder.position.z, members, moved: false };
    this.controls.enabled = false;
  }

  _moveDrag(e) {
    const d = this.drag;
    const p = this._planePoint(e, d.plane);
    if (!p) return;
    const snap = (v) => Math.round(v * 2) / 2;
    const dx = snap(d.x0 + p.x - d.start.x) - d.x0;
    const dz = snap(d.z0 + p.z - d.start.z) - d.z0;
    d.obj.holder.position.x = d.x0 + dx;
    d.obj.holder.position.z = d.z0 + dz;
    for (const m of d.members) {
      m.o.holder.position.x = m.x0 + dx;
      m.o.holder.position.z = m.z0 + dz;
    }
    d.moved = dx !== 0 || dz !== 0;
    this.root.updateMatrixWorld(true);
    this._buildConnections();
    this.renderer.domElement.style.cursor = 'grabbing';
  }

  _endDrag(commit) {
    const d = this.drag;
    this.drag = null;
    this.controls.enabled = true;
    this._updateCursor();
    if (commit && d.moved) {
      this.h.onDragEnd?.({
        kind: d.kind, id: d.id,
        x: d.obj.holder.position.x, z: d.obj.holder.position.z,
        members: d.members.map((m) => ({ kind: m.kind, id: m.id, x: m.o.holder.position.x, z: m.o.holder.position.z })),
      });
    }
  }

  _setHover(hit) {
    const id = hit?.kind === 'component' ? hit.id : null;
    if (id !== this.hoverId) {
      this.compObjs.get(this.hoverId)?.label.element.classList.remove('hover');
      this.hoverId = id;
      this.compObjs.get(id)?.label.element.classList.add('hover');
    }
    this._hoverHit = !!hit;
    this._updateCursor();
  }

  _updateCursor() {
    if (this.drag) return;
    const c = this.renderer.domElement.style;
    if (this.connectMode) c.cursor = 'crosshair';
    else if (this._hoverHit) c.cursor = this.editMode ? 'grab' : 'pointer';
    else c.cursor = '';
  }

  // ---------- Frame loop ----------
  _tick() {
    const a = this.anim;
    if (a) {
      const k = a.ms ? Math.min(1, (performance.now() - a.start) / a.ms) : 1;
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.camera.position.lerpVectors(a.p0, a.p1, e);
      this.controls.target.lerpVectors(a.t0, a.t1, e);
      this.camera.fov = a.f0 + (a.f1 - a.f0) * e;
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(this.controls.target);
      if (k >= 1) {
        this.anim = null;
        this.controls.update();
      }
    } else {
      this.controls.update();
    }
    if (this._hoverEvt && !this.down) {
      this._setHover(this._pick(this._hoverEvt));
      this._hoverEvt = null;
    }
    this._updateLabels();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }

  _updateLabels() {
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const cam = this.camera.position;
    for (const [id, o] of this.compObjs) {
      let vis = false;
      if (!this.hiddenLayers.has(o.layerId)) {
        const important = id === this.hoverId
          || (this.selKind === 'component' && this.selection.includes(id))
          || (this.highlight && this.highlight.includes(id));
        if (important) vis = true;
        else if (this.labelsOn && !this.highlight) vis = o.holder.getWorldPosition(this._wp).distanceTo(cam) * tanHalf < LABEL_RANGE;
      }
      o.label.visible = vis;
    }
    for (const g of this.groupObjs.values()) g.label.visible = !this.hiddenLayers.has(g.layerId);
  }
}

// Renders small preview images of models for the model picker and details panel.
export class Thumbnailer {
  constructor(size = 112) {
    this.size = size;
    this.cache = new Map();
  }

  get(type, colorHex) {
    const key = `${type}|${colorHex}`;
    if (this.cache.has(key)) return this.cache.get(key);
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(this.size, this.size);
      this.scene = new THREE.Scene();
      addLights(this.scene);
      this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    }
    const geo = getModelGeometry(type, colorHex);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    this.scene.add(mesh);
    const s = geo.boundingSphere;
    const dist = (s.radius / Math.sin(THREE.MathUtils.degToRad(15))) * 1.02;
    this.camera.position.copy(s.center).addScaledVector(HOME_DIR, dist);
    this.camera.lookAt(s.center);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.scene.remove(mesh);
    mesh.material.dispose();
    this.cache.set(key, url);
    return url;
  }
}
