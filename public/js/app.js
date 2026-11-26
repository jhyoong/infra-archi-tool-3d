import { MapScene, Thumbnailer } from './scene.js';
import { MODEL_TYPES, TYPE_MAP } from './models.js';

const DATA_URL = 'data/infrastructure.json';
const DRAFT_KEY = 'infra-map:draft';
const UNDO_LIMIT = 60;
const DEFAULT_LAYERS = [
  { id: 'hardware', name: 'Hardware', color: '#A0A8B5' },
  { id: 'network', name: 'Network', color: '#2FBF9F' },
  { id: 'platform', name: 'Platform', color: '#9B87F5' },
  { id: 'application', name: 'Application', color: '#5AA7F0' },
];

const $ = (sel) => document.querySelector(sel);
const clone = (o) => JSON.parse(JSON.stringify(o));
const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const str = (v) => (typeof v === 'string' ? v : '');

const state = {
  published: null,
  data: null,
  selection: [],
  selKind: null,
  editMode: false,
  connectFrom: null,
  undo: [],
  story: null,
  preStoryCam: null,
  editingStory: null,
  exported: false,
  draftStale: false,
};

let scene;
const thumbs = new Thumbnailer();

// ---------- Small DOM helper (text is always set as text, never as HTML) ----------
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k === 'value' || k === 'checked' || k === 'selected') el[k] = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

const btn = (label, onclick, cls = '') => h('button', { type: 'button', class: cls || null, onclick }, label);

function field(label, control, hint) {
  return h('label', { class: 'field' }, h('span', { class: 'field-label' }, label), control, hint && h('span', { class: 'hint' }, hint));
}

let toastTimer;
function toast(msg, ms = 3200) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}

// ---------- Data validation ----------
function safeUrl(u) {
  if (typeof u !== 'string' || !u.trim()) return null;
  try {
    const url = new URL(u.trim(), window.location.href);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? u.trim() : null;
  } catch {
    return null;
  }
}

function makeId(prefix, used) {
  let id;
  do id = `${prefix}-${Math.random().toString(36).slice(2, 8)}`; while (used.has(id));
  used.add(id);
  return id;
}

function usedIds(d) {
  return new Set([...d.components, ...d.groups, ...d.connections, ...d.storylines].map((x) => x.id));
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('the file is not a map (expected a JSON object)');
  const warn = [];
  const used = new Set();
  const takeId = (id, prefix, what) => {
    if (typeof id === 'string' && id && !used.has(id)) { used.add(id); return id; }
    const fresh = makeId(prefix, used);
    warn.push(`${what} had a missing or duplicate id; assigned ${fresh}`);
    return fresh;
  };
  const meta = { title: 'Infrastructure map', layerGap: 10, ...(raw.meta && typeof raw.meta === 'object' ? raw.meta : {}) };
  meta.title = str(meta.title) || 'Infrastructure map';
  meta.layerGap = Math.min(24, Math.max(4, num(meta.layerGap, 10)));

  const srcLayers = Array.isArray(raw.layers) && raw.layers.length ? raw.layers : DEFAULT_LAYERS;
  const layerIds = new Set();
  const layers = srcLayers.map((L, i) => {
    let id = str(L.id) || `layer-${i + 1}`;
    while (layerIds.has(id)) id += '-x';
    layerIds.add(id);
    return { id, name: str(L.name) || id, color: isHex(L.color) ? L.color : DEFAULT_LAYERS[i % 4].color };
  });
  const firstLayer = layers[0].id;
  const layerOf = (l, what) => {
    if (layerIds.has(l)) return l;
    warn.push(`${what} had an unknown layer "${l}"; moved to ${firstLayer}`);
    return firstLayer;
  };
  const links = (arr) => (Array.isArray(arr) ? arr : [])
    .map((l) => ({ label: str(l?.label), url: safeUrl(l?.url) }))
    .filter((l) => l.url);

  const typeIcons = {};
  for (const [k, v] of Object.entries(raw.typeIcons || {})) if (str(v)) typeIcons[k] = v;

  const components = (Array.isArray(raw.components) ? raw.components : []).map((c) => {
    const name = str(c.name) || 'Untitled';
    let type = str(c.type);
    if (!TYPE_MAP[type]) { warn.push(`Component "${name}" had an unknown type "${type}"; using generic`); type = 'generic'; }
    return {
      id: takeId(c.id, 'c', `Component "${name}"`),
      name, type,
      layer: layerOf(c.layer, `Component "${name}"`),
      x: num(c.x), z: num(c.z),
      description: str(c.description),
      links: links(c.links),
      color: isHex(c.color) ? c.color : null,
      scale: Math.min(4, Math.max(0.3, num(c.scale, 1))),
      icon: str(c.icon) || null,
    };
  });
  const compIds = new Set(components.map((c) => c.id));

  const groups = (Array.isArray(raw.groups) ? raw.groups : []).map((g) => {
    const name = str(g.name) || 'Untitled group';
    return {
      id: takeId(g.id, 'g', `Group "${name}"`),
      name,
      layer: layerOf(g.layer, `Group "${name}"`),
      x: num(g.x), z: num(g.z),
      w: Math.max(2, num(g.w, 10)), d: Math.max(2, num(g.d, 8)),
      description: str(g.description),
      color: isHex(g.color) ? g.color : null,
    };
  });

  const seenPairs = new Set();
  const connections = [];
  for (const k of Array.isArray(raw.connections) ? raw.connections : []) {
    const pair = [k.from, k.to].sort().join('|');
    if (!compIds.has(k.from) || !compIds.has(k.to) || k.from === k.to) { warn.push(`Dropped a connection from "${k.from}" to "${k.to}" (missing component)`); continue; }
    if (seenPairs.has(pair)) { warn.push(`Dropped a duplicate connection between "${k.from}" and "${k.to}"`); continue; }
    seenPairs.add(pair);
    connections.push({ id: takeId(k.id, 'k', 'A connection'), from: k.from, to: k.to, label: str(k.label) });
  }

  const vec = (a) => (Array.isArray(a) && a.length === 3 && a.every((n) => Number.isFinite(n)) ? a : null);
  const storylines = (Array.isArray(raw.storylines) ? raw.storylines : []).map((s) => {
    const name = str(s.name) || 'Untitled storyline';
    return {
      id: takeId(s.id, 's', `Storyline "${name}"`),
      name,
      steps: (Array.isArray(s.steps) ? s.steps : []).map((st, i) => {
        const pos = vec(st.camera?.position), tgt = vec(st.camera?.target);
        return {
          title: str(st.title) || `Step ${i + 1}`,
          caption: str(st.caption),
          view: st.view === 'iso' ? 'iso' : '3d',
          highlight: (Array.isArray(st.highlight) ? st.highlight : []).filter((id) => compIds.has(id)),
          camera: pos && tgt ? { position: pos, target: tgt } : null,
        };
      }),
    };
  });

  return { data: { version: 1, meta, layers, typeIcons, groups, components, connections, storylines }, warnings: warn };
}

function sameMap(a, b) {
  if (!a || !b) return false;
  const strip = (d) => JSON.stringify({ ...d, meta: { ...d.meta, updated: undefined } });
  return strip(a) === strip(b);
}

// ---------- Local draft ----------
function readDraft() {
  try {
    const s = localStorage.getItem(DRAFT_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
}
let draftTimer;
function persist() {
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    if (!isDirty()) { clearDraft(); return; }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        basedOn: state.published?.meta?.updated || null,
        savedAt: new Date().toISOString(),
        exported: state.exported,
        data: state.data,
      }));
    } catch {
      toast('This browser couldn’t keep a local copy of your changes. Export to avoid losing them.', 6000);
    }
  }, 250);
}
const isDirty = () => !sameMap(state.data, state.published);

function updateDraftPill() {
  const dirty = isDirty();
  $('#draftPill').hidden = !dirty;
  $('#draftText').textContent = state.exported
    ? 'Exported, waiting to be published'
    : state.draftStale ? 'Unsaved changes, published map has changed since' : 'Unsaved changes';
}

// ---------- Changes and undo ----------
function pushUndo() {
  state.undo.push(JSON.stringify(state.data));
  if (state.undo.length > UNDO_LIMIT) state.undo.shift();
}

function commit(fn, opts = {}) {
  pushUndo();
  fn(state.data);
  state.exported = false;
  afterChange(opts);
}

function afterChange({ rebuild = true, panel = true, sidebar = true } = {}) {
  const d = state.data;
  const exists = state.selKind === 'group'
    ? new Set(d.groups.map((g) => g.id))
    : new Set(d.components.map((c) => c.id));
  state.selection = state.selection.filter((id) => exists.has(id));
  if (!state.selection.length) state.selKind = null;
  if (state.editingStory && !d.storylines.some((s) => s.id === state.editingStory)) state.editingStory = null;
  if (rebuild) scene.update(d);
  scene.setSelection(state.selection, state.selKind);
  if (sidebar) renderSidebar();
  if (panel) renderPanel();
  renderTitle();
  updateDraftPill();
  persist();
}

function undo() {
  if (!state.undo.length) { toast('Nothing to undo.'); return; }
  state.data = JSON.parse(state.undo.pop());
  state.exported = false;
  afterChange();
  toast('Undone.');
}

// ---------- Lookups ----------
const compById = (id, d = state.data) => d.components.find((c) => c.id === id);
const groupById = (id, d = state.data) => d.groups.find((g) => g.id === id);
const layerById = (id, d = state.data) => d.layers.find((L) => L.id === id) || d.layers[0];
const storyById = (id, d = state.data) => d.storylines.find((s) => s.id === id);
const typeLabel = (t) => TYPE_MAP[t]?.label || 'Generic';
const compColor = (c) => c.color || layerById(c.layer).color;

// ---------- Selection ----------
function select(ids, kind) {
  state.selection = ids;
  state.selKind = ids.length ? kind : null;
  scene.setSelection(state.selection, state.selKind);
  renderPanel();
  const single = ids.length === 1 ? ids[0] : null;
  history.replaceState(null, '', single ? `#${encodeURIComponent(single)}` : window.location.pathname + window.location.search);
}

function onPick(hit, e) {
  if (state.connectFrom) {
    if (hit?.kind === 'component') finishConnect(hit.id);
    return;
  }
  if (!hit) {
    if (!e?.shiftKey) {
      select([], null);
      if (!state.story) scene.setHighlight(null);
    }
    return;
  }
  if (hit.kind === 'component') {
    if (e?.shiftKey && state.selKind === 'component') {
      const s = new Set(state.selection);
      if (s.has(hit.id)) s.delete(hit.id); else s.add(hit.id);
      select([...s], 'component');
    } else {
      select([hit.id], 'component');
      if (!state.editMode && !state.story) scene.focusComponent(hit.id);
    }
  } else {
    select([hit.id], 'group');
    if (!state.editMode && !state.story) scene.focusGroup(hit.id);
  }
}

function onDragEnd({ kind, id, x, z, members }) {
  commit((d) => {
    const t = kind === 'component' ? compById(id, d) : groupById(id, d);
    if (t) { t.x = x; t.z = z; }
    for (const m of members) {
      const c = compById(m.id, d);
      if (c) { c.x = m.x; c.z = m.z; }
    }
  }, { sidebar: false });
  if (!(state.selKind === kind && state.selection.includes(id))) select([id], kind);
}

// ---------- Connecting ----------
function startConnect(id) {
  state.connectFrom = id;
  scene.setConnectMode(true);
  const b = $('#banner');
  b.textContent = `Click the component to connect “${compById(id)?.name}” to. Press Esc to cancel.`;
  b.hidden = false;
}

function endConnect() {
  state.connectFrom = null;
  scene.setConnectMode(false);
  $('#banner').hidden = true;
}

function finishConnect(toId) {
  const from = state.connectFrom;
  if (toId === from) { toast('Pick a different component to connect to.'); return; }
  const exists = state.data.connections.some((k) => (k.from === from && k.to === toId) || (k.from === toId && k.to === from));
  endConnect();
  if (exists) { toast('These components are already connected.'); return; }
  commit((d) => d.connections.push({ id: makeId('k', usedIds(d)), from, to: toId, label: '' }));
  toast('Connected.');
}

// ---------- Adding and deleting ----------
function freeSpot(layer, x, z) {
  const taken = (px, pz) => state.data.components.some((c) => c.layer === layer && Math.hypot(c.x - px, c.z - pz) < 4);
  for (let i = 0; i < 24 && taken(x, z); i++) x += 3;
  return [x, z];
}

function addComponent(type) {
  const def = TYPE_MAP[type];
  const d = state.data;
  const sel = state.selKind === 'component' ? compById(state.selection[0]) : null;
  const layer = d.layers.some((L) => L.id === def.layer) ? def.layer : sel?.layer || d.layers[0].id;
  const t = scene.getTarget();
  const [x, z] = freeSpot(layer, Math.round(t.x), Math.round(t.z));
  const count = d.components.filter((c) => c.type === type).length;
  let id;
  commit((dd) => {
    id = makeId('c', usedIds(dd));
    dd.components.push({ id, name: `${def.label} ${count + 1}`, type, layer, x, z, description: '', links: [], color: null, scale: 1, icon: null });
  });
  if (scene.hiddenLayers.has(layer)) { scene.setLayerVisible(layer, true); renderSidebar(); }
  select([id], 'component');
  toast('Added. Drag it into place.');
}

function addGroup(layer) {
  const t = scene.getTarget();
  let id;
  commit((d) => {
    id = makeId('g', usedIds(d));
    d.groups.push({ id, name: 'New group', layer, x: Math.round(t.x), z: Math.round(t.z), w: 10, d: 8, description: '', color: null });
  });
  if (scene.hiddenLayers.has(layer)) { scene.setLayerVisible(layer, true); renderSidebar(); }
  select([id], 'group');
  toast('Group added. Drag it, or set its size in the panel.');
}

function deleteSelection() {
  if (!state.selection.length) return;
  const ids = new Set(state.selection);
  const kind = state.selKind;
  commit((d) => {
    if (kind === 'group') {
      d.groups = d.groups.filter((g) => !ids.has(g.id));
    } else {
      d.components = d.components.filter((c) => !ids.has(c.id));
      d.connections = d.connections.filter((k) => !ids.has(k.from) && !ids.has(k.to));
      for (const s of d.storylines) for (const st of s.steps) st.highlight = st.highlight.filter((x) => !ids.has(x));
    }
  });
  select([], null);
  const n = ids.size;
  toast(`Deleted ${n} ${kind === 'group' ? 'group' : 'component'}${n === 1 ? '' : 's'}. Press Ctrl+Z to undo.`);
}

// ---------- Storylines ----------
function playStory(id) {
  const s = storyById(id);
  if (!s) return;
  if (!s.steps.length) { toast('Add a step to this storyline first.'); return; }
  if (!state.story) state.preStoryCam = scene.getCameraState();
  state.story = { id, index: 0 };
  select([], null);
  $('#story').hidden = false;
  document.body.classList.add('story-on');
  goStep(0);
}

function goStep(i) {
  const s = state.story && storyById(state.story.id);
  if (!s || !s.steps.length) { exitStory(); return; }
  i = Math.max(0, Math.min(s.steps.length - 1, i));
  state.story.index = i;
  const st = s.steps[i];
  $('#storyName').textContent = s.name;
  $('#storyCount').textContent = `Step ${i + 1} of ${s.steps.length}`;
  $('#storyTitle').textContent = st.title;
  $('#storyCaption').textContent = st.caption;
  $('#storyCaption').hidden = !st.caption;
  $('#storyPrev').hidden = i === 0;
  $('#storyNext').textContent = i === s.steps.length - 1 ? 'Finish' : 'Next';
  syncStoryInset();
  showStep(st);
}

function syncStoryInset() {
  const card = $('#story');
  scene.setBottomInset(card.hidden ? 0 : card.offsetHeight + 28);
}

function showStep(st) {
  for (const id of st.highlight) {
    const c = compById(id);
    if (c && scene.hiddenLayers.has(c.layer)) scene.setLayerVisible(c.layer, true);
  }
  scene.setHighlight(st.highlight);
  if (st.camera) scene.applyCameraState({ view: st.view, ...st.camera });
  else scene.frameIds(st.highlight, st.view);
}

function exitStory() {
  if (!state.story) return;
  state.story = null;
  $('#story').hidden = true;
  document.body.classList.remove('story-on');
  syncStoryInset();
  scene.setHighlight(null);
  if (state.preStoryCam) scene.applyCameraState(state.preStoryCam);
  state.preStoryCam = null;
  renderSidebar();
}

function newStory() {
  let id;
  commit((d) => {
    id = makeId('s', usedIds(d));
    d.storylines.push({ id, name: 'New storyline', steps: [] });
  }, { panel: false });
  state.editingStory = id;
  renderSidebar();
}

function addStep(sid) {
  const cam = scene.getCameraState();
  const highlight = state.selKind === 'component' ? [...state.selection] : [];
  commit((d) => {
    const s = storyById(sid, d);
    s.steps.push({ title: `Step ${s.steps.length + 1}`, caption: '', view: cam.view, highlight, camera: { position: cam.position, target: cam.target } });
  }, { panel: false });
  toast(highlight.length ? `Step added with ${highlight.length} highlighted.` : 'Step added. Select components first to highlight them in a step.');
}

// ---------- Rendering: title, sidebar ----------
function renderTitle() {
  $('#mapTitle').textContent = state.data.meta.title;
  document.title = state.data.meta.title;
  const ti = $('#titleInput');
  if (document.activeElement !== ti) ti.value = state.data.meta.title;
  $('#gapRange').value = String(state.data.meta.layerGap);
}

function renderSidebar() {
  const d = state.data;
  $('#layerList').replaceChildren(...[...d.layers].reverse().map((L) => {
    const count = d.components.filter((c) => c.layer === L.id).length;
    const hidden = scene.hiddenLayers.has(L.id);
    return h('li', { class: `layer-row${hidden ? ' off' : ''}` },
      h('span', { class: 'swatch', style: `--c:${L.color}` }),
      h('button', { type: 'button', class: 'layer-name', title: `Zoom to ${L.name}`, onclick: () => scene.focusLayer(L.id) }, L.name),
      h('span', { class: 'count', title: `${count} components` }, String(count)),
      h('button', {
        type: 'button', class: 'small ghost', 'aria-pressed': String(!hidden),
        'aria-label': `${hidden ? 'Show' : 'Hide'} ${L.name} layer`,
        onclick: () => { scene.setLayerVisible(L.id, hidden); renderSidebar(); },
      }, hidden ? 'Show' : 'Hide'));
  }));

  const area = $('#storyArea');
  const s = state.editMode && state.editingStory ? storyById(state.editingStory) : null;
  if (s) { area.replaceChildren(storyEditor(s)); return; }
  const rows = d.storylines.map((st) => h('div', { class: 'story-row' },
    h('div', { class: 'story-info' },
      h('span', { class: 'story-name' }, st.name),
      h('span', { class: 'muted' }, `${st.steps.length} step${st.steps.length === 1 ? '' : 's'}`)),
    h('div', { class: 'row-actions' },
      btn('Play', () => playStory(st.id), 'small'),
      state.editMode && btn('Edit', () => { state.editingStory = st.id; renderSidebar(); }, 'small ghost'))));
  if (!rows.length) {
    rows.push(h('p', { class: 'empty' }, state.editMode
      ? 'Create a storyline to walk people through the map one step at a time.'
      : 'No storylines yet. Switch to edit mode to create one.'));
  }
  area.replaceChildren(...rows);
}

function storyEditor(s) {
  const sid = s.id;
  const stepUpd = (i, fn, opts = { rebuild: false, panel: false, sidebar: false }) =>
    commit((d) => fn(storyById(sid, d).steps[i]), opts);
  const move = (i, dir) => commit((d) => {
    const steps = storyById(sid, d).steps;
    const [st] = steps.splice(i, 1);
    steps.splice(i + dir, 0, st);
  }, { rebuild: false, panel: false });

  return h('div', { class: 'story-editor' },
    field('Storyline name', h('input', {
      value: s.name,
      onchange: (e) => commit((d) => { storyById(sid, d).name = e.target.value.trim() || 'Untitled storyline'; }, { rebuild: false, panel: false, sidebar: false }),
    })),
    s.steps.length
      ? h('ol', { class: 'steps' }, s.steps.map((st, i) => h('li', { class: 'step' },
        h('div', { class: 'step-head' },
          h('span', { class: 'step-num' }, String(i + 1)),
          h('input', { class: 'step-title', value: st.title, 'aria-label': `Step ${i + 1} title`, onchange: (e) => stepUpd(i, (x) => { x.title = e.target.value.trim() || `Step ${i + 1}`; }) })),
        h('textarea', { rows: 3, value: st.caption, placeholder: 'What should people notice here?', 'aria-label': `Step ${i + 1} caption`, onchange: (e) => stepUpd(i, (x) => { x.caption = e.target.value; }) }),
        h('div', { class: 'step-meta' },
          h('select', { 'aria-label': `Step ${i + 1} view`, onchange: (e) => stepUpd(i, (x) => { x.view = e.target.value; }) },
            h('option', { value: '3d', selected: st.view === '3d' }, '3D view'),
            h('option', { value: 'iso', selected: st.view === 'iso' }, '2.5D view')),
          h('span', { class: 'muted' }, `${st.highlight.length} highlighted, ${st.camera ? 'saved camera' : 'auto-framed'}`)),
        h('div', { class: 'step-actions' },
          btn('Preview', () => showStep(st), 'small'),
          btn('Use selection', () => stepUpd(i, (x) => { x.highlight = state.selKind === 'component' ? [...state.selection] : []; }, { rebuild: false, panel: false }), 'small ghost'),
          btn('Save camera', () => {
            const c = scene.getCameraState();
            stepUpd(i, (x) => { x.camera = { position: c.position, target: c.target }; x.view = c.view; }, { rebuild: false, panel: false });
          }, 'small ghost'),
          st.camera && btn('Auto-frame', () => stepUpd(i, (x) => { x.camera = null; }, { rebuild: false, panel: false }), 'small ghost'),
          i > 0 && btn('Move up', () => move(i, -1), 'small ghost'),
          i < s.steps.length - 1 && btn('Move down', () => move(i, 1), 'small ghost'),
          btn('Remove', () => commit((d) => storyById(sid, d).steps.splice(i, 1), { rebuild: false, panel: false }), 'small danger')))))
      : h('p', { class: 'empty' }, 'No steps yet. Set up the view, select the components to highlight, then add a step.'),
    btn('Add step from current view', () => addStep(sid), 'block'),
    h('p', { class: 'hint' }, 'A step saves the camera, the view, and the selected components as highlights.'),
    h('div', { class: 'row-actions' },
      btn('Play', () => playStory(sid), 'small'),
      btn('Delete storyline', () => {
        if (!confirm(`Delete the storyline “${s.name}”?`)) return;
        commit((d) => { d.storylines = d.storylines.filter((x) => x.id !== sid); }, { rebuild: false, panel: false });
      }, 'small danger'),
      btn('Done', () => { state.editingStory = null; scene.setHighlight(null); renderSidebar(); }, 'small primary')));
}

// ---------- Rendering: details panel ----------
function panelHead(title, meta, thumb) {
  return h('div', { class: 'panel-head' },
    thumb && h('img', { class: 'thumb', src: thumb, alt: '', width: 56, height: 56 }),
    h('div', { class: 'panel-title' }, h('h2', {}, title), meta && h('p', { class: 'muted' }, meta)),
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close details', onclick: () => select([], null) }, '×'));
}

function renderPanel() {
  const p = $('#panel');
  if (!state.selection.length) {
    p.hidden = true;
    p.replaceChildren();
    document.body.classList.remove('panel-open');
    return;
  }
  p.hidden = false;
  document.body.classList.add('panel-open');
  let content;
  if (state.selKind === 'group') {
    const g = groupById(state.selection[0]);
    content = state.editMode ? groupEdit(g) : groupView(g);
  } else if (state.selection.length > 1) {
    content = multiView();
  } else {
    const c = compById(state.selection[0]);
    content = state.editMode ? compEdit(c) : compView(c);
  }
  p.replaceChildren(...content.filter(Boolean));
}

function connectionsOf(id) {
  return state.data.connections
    .filter((k) => k.from === id || k.to === id)
    .map((k) => ({ k, out: k.from === id, other: compById(k.from === id ? k.to : k.from) }))
    .filter((x) => x.other);
}

function goTo(id) {
  select([id], 'component');
  scene.focusComponent(id);
}

function copyLink(id) {
  const url = `${window.location.href.split('#')[0]}#${encodeURIComponent(id)}`;
  navigator.clipboard?.writeText(url).then(() => toast('Link copied.'), () => toast(url, 8000));
}

function compView(c) {
  const L = layerById(c.layer);
  const conns = connectionsOf(c.id);
  return [
    panelHead(c.name, `${typeLabel(c.type)} in ${L.name}`, thumbs.get(c.type, compColor(c))),
    c.description && h('p', { class: 'desc' }, c.description),
    c.links.length > 0 && h('section', {}, h('h3', {}, 'Links'),
      h('ul', { class: 'links' }, c.links.map((l) => h('li', {},
        h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label || l.url))))),
    h('section', {}, h('h3', {}, 'Connections'),
      conns.length
        ? h('ul', { class: 'conns' }, conns.map(({ k, out, other }) => h('li', {},
          h('button', { type: 'button', class: 'conn', onclick: () => goTo(other.id) },
            h('span', { class: 'dir', 'aria-label': out ? 'to' : 'from' }, out ? '→' : '←'),
            h('span', {}, other.name),
            k.label && h('span', { class: 'muted' }, k.label)))))
        : h('p', { class: 'empty' }, 'Not connected to anything.')),
    h('div', { class: 'panel-actions' }, btn('Focus', () => scene.focusComponent(c.id)), btn('Copy link', () => copyLink(c.id), 'ghost')),
  ];
}

function selectEl(options, value, onchange, label) {
  return h('select', { 'aria-label': label, onchange: (e) => onchange(e.target.value) },
    options.map(([v, text]) => h('option', { value: v, selected: v === value }, text)));
}

function typeSelect(value, onchange) {
  const byLayer = new Map();
  for (const t of MODEL_TYPES) {
    const key = t.layer || 'other';
    if (!byLayer.has(key)) byLayer.set(key, []);
    byLayer.get(key).push(t);
  }
  return h('select', { onchange: (e) => onchange(e.target.value) },
    [...byLayer].map(([layer, types]) => h('optgroup', { label: state.data.layers.find((L) => L.id === layer)?.name || 'Other' },
      types.map((t) => h('option', { value: t.id, selected: t.id === value }, t.label)))));
}

function numberInput(value, onchange, attrs = {}) {
  return h('input', {
    type: 'number', step: attrs.step || 0.5, min: attrs.min, max: attrs.max, value: String(value),
    onchange: (e) => { if (e.target.value !== '' && Number.isFinite(Number(e.target.value))) onchange(Number(e.target.value)); },
  });
}

function setFieldError(input, msg) {
  const row = input.closest('.link-row');
  let err = row.nextElementSibling;
  if (!err?.classList.contains('field-error')) {
    if (!msg) return;
    err = h('p', { class: 'field-error' });
    row.after(err);
  }
  if (msg) err.textContent = msg; else err.remove();
}

function linksEditor(links, onMut) {
  return h('section', { class: 'links-edit' }, h('h3', {}, 'Links'),
    links.map((l, i) => h('div', { class: 'link-row' },
      h('input', { value: l.label, placeholder: 'Label', 'aria-label': `Link ${i + 1} label`, onchange: (e) => onMut((ls) => { ls[i].label = e.target.value.trim(); }, false) }),
      h('input', {
        value: l.url, placeholder: 'https://', type: 'url', 'aria-label': `Link ${i + 1} address`,
        oninput: (e) => setFieldError(e.target, ''),
        onchange: (e) => {
          const v = e.target.value.trim();
          if (v && !safeUrl(v)) { setFieldError(e.target, 'Use an address that starts with http:// or https://'); return; }
          onMut((ls) => { ls[i].url = v; }, false);
        },
      }),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': `Remove link ${i + 1}`, onclick: () => onMut((ls) => ls.splice(i, 1), true) }, '×'))),
    btn('Add link', () => onMut((ls) => ls.push({ label: '', url: '' }), true), 'small ghost'));
}

function compEdit(c) {
  const id = c.id;
  const d = state.data;
  const upd = (fn, opts) => commit((dd) => fn(compById(id, dd), dd), opts);
  const quiet = { rebuild: false, panel: false, sidebar: false };
  const conns = connectionsOf(id);
  return [
    panelHead('Edit component', `${typeLabel(c.type)} in ${layerById(c.layer).name}`, thumbs.get(c.type, compColor(c))),
    field('Name', h('input', {
      value: c.name,
      onchange: (e) => {
        const v = e.target.value.trim() || 'Untitled';
        upd((x) => { x.name = v; }, quiet);
        scene.setLabelText(id, v);
      },
    })),
    field('Model', typeSelect(c.type, (v) => upd((x) => { x.type = v; }))),
    field('Layer', selectEl(d.layers.map((L) => [L.id, L.name]), c.layer, (v) => upd((x) => { x.layer = v; }))),
    field('Description', h('textarea', { rows: 3, value: c.description, onchange: (e) => upd((x) => { x.description = e.target.value; }, quiet) })),
    linksEditor(c.links, (mut, structural) => upd((x) => mut(x.links), { rebuild: false, panel: structural, sidebar: false })),
    h('div', { class: 'grid2' },
      field('Position X', numberInput(c.x, (v) => upd((x) => { x.x = v; }, { panel: false, sidebar: false }))),
      field('Position Z', numberInput(c.z, (v) => upd((x) => { x.z = v; }, { panel: false, sidebar: false })))),
    h('div', { class: 'grid2' },
      field('Colour', h('input', { type: 'color', value: compColor(c), onchange: (e) => upd((x) => { x.color = e.target.value; }) })),
      field('Size', numberInput(c.scale, (v) => upd((x) => { x.scale = Math.min(4, Math.max(0.3, v)); }, { panel: false }), { step: 0.1, min: 0.3, max: 4 }))),
    c.color && btn('Use layer colour', () => upd((x) => { x.color = null; }), 'link'),
    field('Icon badge', h('input', {
      value: c.icon || '', placeholder: d.typeIcons[c.type] || 'icons/your-logo.svg',
      onchange: (e) => upd((x) => { x.icon = e.target.value.trim() || null; }, { panel: false, sidebar: false }),
    }), 'An image in the icons folder, shown above this component. Leave empty to use the model’s icon.'),
    field(`Icon for all “${typeLabel(c.type)}” models`, h('input', {
      value: d.typeIcons[c.type] || '', placeholder: 'icons/your-logo.svg',
      onchange: (e) => commit((dd) => {
        const v = e.target.value.trim();
        if (v) dd.typeIcons[c.type] = v; else delete dd.typeIcons[c.type];
      }, { panel: false, sidebar: false }),
    })),
    h('section', {}, h('h3', {}, 'Connections'),
      conns.length
        ? h('ul', { class: 'conn-edit' }, conns.map(({ k, out, other }) => h('li', {},
          h('span', { class: 'conn-name' }, `${out ? '→' : '←'} ${other.name}`),
          h('input', {
            value: k.label, placeholder: 'Label', 'aria-label': `Label for connection with ${other.name}`,
            onchange: (e) => commit((dd) => { dd.connections.find((x) => x.id === k.id).label = e.target.value.trim(); }, { panel: false, sidebar: false }),
          }),
          h('button', {
            type: 'button', class: 'icon-btn', 'aria-label': `Remove connection with ${other.name}`,
            onclick: () => commit((dd) => { dd.connections = dd.connections.filter((x) => x.id !== k.id); }),
          }, '×'))))
        : h('p', { class: 'empty' }, 'Not connected to anything yet.'),
      btn('Connect to another component', () => startConnect(id), 'small')),
    h('div', { class: 'panel-actions' },
      btn('Focus', () => scene.focusComponent(id), 'ghost'),
      btn('Delete component', deleteSelection, 'danger')),
  ];
}

function groupMembers(g) {
  return state.data.components.filter((c) => c.layer === g.layer && Math.abs(c.x - g.x) <= g.w / 2 && Math.abs(c.z - g.z) <= g.d / 2);
}

function groupView(g) {
  const members = groupMembers(g);
  return [
    panelHead(g.name, `Group in ${layerById(g.layer).name}`),
    g.description && h('p', { class: 'desc' }, g.description),
    h('section', {}, h('h3', {}, `Contains ${members.length}`),
      members.length
        ? h('ul', { class: 'conns' }, members.map((c) => h('li', {}, h('button', { type: 'button', class: 'conn', onclick: () => goTo(c.id) }, h('span', {}, c.name), h('span', { class: 'muted' }, typeLabel(c.type))))))
        : h('p', { class: 'empty' }, 'No components inside this group.')),
    h('div', { class: 'panel-actions' }, btn('Focus', () => scene.focusGroup(g.id)), btn('Copy link', () => copyLink(g.id), 'ghost')),
  ];
}

function groupEdit(g) {
  const id = g.id;
  const upd = (fn, opts) => commit((d) => fn(groupById(id, d)), opts);
  const layer = layerById(g.layer);
  return [
    panelHead('Edit group', `Group in ${layer.name}`),
    field('Name', h('input', { value: g.name, onchange: (e) => upd((x) => { x.name = e.target.value.trim() || 'Untitled group'; }, { panel: false, sidebar: false }) })),
    field('Layer', selectEl(state.data.layers.map((L) => [L.id, L.name]), g.layer, (v) => upd((x) => { x.layer = v; }))),
    field('Description', h('textarea', { rows: 3, value: g.description, onchange: (e) => upd((x) => { x.description = e.target.value; }, { rebuild: false, panel: false, sidebar: false }) })),
    h('div', { class: 'grid2' },
      field('Position X', numberInput(g.x, (v) => upd((x) => { x.x = v; }, { panel: false, sidebar: false }))),
      field('Position Z', numberInput(g.z, (v) => upd((x) => { x.z = v; }, { panel: false, sidebar: false })))),
    h('div', { class: 'grid2' },
      field('Width', numberInput(g.w, (v) => upd((x) => { x.w = Math.max(2, v); }, { panel: false, sidebar: false }), { min: 2, step: 1 })),
      field('Depth', numberInput(g.d, (v) => upd((x) => { x.d = Math.max(2, v); }, { panel: false, sidebar: false }), { min: 2, step: 1 }))),
    field('Colour', h('input', { type: 'color', value: g.color || layer.color, onchange: (e) => upd((x) => { x.color = e.target.value; }) })),
    g.color && btn('Use layer colour', () => upd((x) => { x.color = null; }), 'link'),
    h('p', { class: 'hint' }, 'Dragging a group moves the components inside it.'),
    h('div', { class: 'panel-actions' },
      btn('Focus', () => scene.focusGroup(id), 'ghost'),
      btn('Delete group', deleteSelection, 'danger')),
    h('p', { class: 'hint' }, 'Deleting a group keeps its components.'),
  ];
}

function multiView() {
  const comps = state.selection.map((id) => compById(id)).filter(Boolean);
  return [
    panelHead(`${comps.length} components selected`, 'Shift-click to add or remove'),
    h('ul', { class: 'conns' }, comps.map((c) => h('li', {}, h('button', { type: 'button', class: 'conn', onclick: () => goTo(c.id) }, h('span', {}, c.name), h('span', { class: 'muted' }, typeLabel(c.type)))))),
    state.editMode && h('p', { class: 'hint' }, 'New storyline steps highlight the selected components.'),
    h('div', { class: 'panel-actions' },
      btn('Frame selection', () => scene.frameIds(state.selection)),
      state.editMode && btn('Delete selected', deleteSelection, 'danger')),
  ];
}

// ---------- Dialogs ----------
function openPalette() {
  const d = state.data;
  const groups = new Map();
  for (const t of MODEL_TYPES) {
    const key = t.layer && d.layers.some((L) => L.id === t.layer) ? t.layer : '__other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const order = [...d.layers].reverse().map((L) => L.id).filter((id) => groups.has(id)).concat(groups.has('__other') ? ['__other'] : []);
  $('#paletteBody').replaceChildren(...order.map((key) => {
    const L = key === '__other' ? null : layerById(key);
    return h('section', {},
      h('h3', {}, L ? L.name : 'Other'),
      h('div', { class: 'palette-grid' }, groups.get(key).map((t) => h('button', {
        type: 'button', class: 'model-card',
        onclick: () => { $('#paletteDlg').close(); addComponent(t.id); },
      }, h('img', { src: thumbs.get(t.id, L ? L.color : d.layers[0].color), alt: '', width: 88, height: 88 }), h('span', {}, t.label)))));
  }));
  $('#paletteDlg').showModal();
}

function openLayerPicker() {
  $('#layerPickBody').replaceChildren(...[...state.data.layers].reverse().map((L) => h('button', {
    type: 'button', class: 'layer-pick',
    onclick: () => { $('#layerDlg').close(); addGroup(L.id); },
  }, h('span', { class: 'swatch', style: `--c:${L.color}` }), L.name)));
  $('#layerDlg').showModal();
}

// ---------- Import / export ----------
function exportMap() {
  state.data.meta.updated = new Date().toISOString();
  const blob = new Blob([`${JSON.stringify(state.data, null, 2)}\n`], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: 'infrastructure.json' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  state.exported = true;
  persist();
  updateDraftPill();
  toast('Exported infrastructure.json. Replace public/data/infrastructure.json in the repo and commit it to publish.', 7000);
}

async function importFile(file) {
  try {
    const { data, warnings } = normalize(JSON.parse(await file.text()));
    exitStory();
    endConnect();
    pushUndo();
    state.data = data;
    state.editingStory = null;
    state.exported = false;
    state.selection = [];
    state.selKind = null;
    afterChange();
    scene.home();
    if (warnings.length) {
      console.warn('Import fixes:', warnings);
      toast(`Imported with ${warnings.length} fix${warnings.length === 1 ? '' : 'es'}. See the browser console for details.`, 6000);
    } else {
      toast('Imported. Export when you’re ready to publish it.');
    }
  } catch (err) {
    toast(`Couldn’t import that file: ${err.message}`, 6000);
  }
}

function discardDraft() {
  if (!confirm('Discard your unsaved changes and go back to the published map?')) return;
  exitStory();
  pushUndo();
  state.data = clone(state.published);
  state.exported = false;
  state.draftStale = false;
  clearDraft();
  afterChange();
  toast('Back to the published map. Press Ctrl+Z to undo.');
}

// ---------- Modes ----------
function setEditMode(on) {
  state.editMode = on;
  document.body.classList.toggle('editing', on);
  const b = $('#btnEdit');
  b.setAttribute('aria-pressed', String(on));
  b.textContent = on ? 'Done editing' : 'Edit';
  $('#editTools').hidden = !on;
  $('#editHint').hidden = !on;
  $('#btnNewStory').hidden = !on;
  $('#mapSettings').hidden = !on;
  scene.setEditMode(on);
  if (!on) {
    endConnect();
    state.editingStory = null;
  }
  renderSidebar();
  renderPanel();
}

function onViewChange(view) {
  for (const b of document.querySelectorAll('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === view));
}

// ---------- Search ----------
function runSearch() {
  const q = $('#search').value.trim().toLowerCase();
  const box = $('#searchResults');
  if (!q) { box.hidden = true; box.replaceChildren(); return; }
  const res = state.data.components.filter((c) => c.name.toLowerCase().includes(q)
    || typeLabel(c.type).toLowerCase().includes(q)
    || c.description.toLowerCase().includes(q)).slice(0, 8);
  box.hidden = false;
  box.replaceChildren(...(res.length
    ? res.map((c) => h('button', { type: 'button', class: 'result', onclick: () => pickResult(c.id) },
      h('span', {}, c.name), h('span', { class: 'muted' }, `${typeLabel(c.type)}, ${layerById(c.layer).name}`)))
    : [h('p', { class: 'empty' }, 'No components match.')]));
}

function pickResult(id) {
  $('#search').value = '';
  runSearch();
  const c = compById(id);
  if (c && scene.hiddenLayers.has(c.layer)) { scene.setLayerVisible(c.layer, true); renderSidebar(); }
  closeSidebarOnNarrow();
  goTo(id);
}

function closeSidebarOnNarrow() {
  document.body.classList.remove('sidebar-open');
  $('#btnSidebar').setAttribute('aria-expanded', 'false');
}

// ---------- Wiring ----------
function wireUI() {
  for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => scene.setView(b.dataset.view));
  $('#btnHome').addEventListener('click', () => scene.home());
  $('#btnEdit').addEventListener('click', () => setEditMode(!state.editMode));
  $('#btnAdd').addEventListener('click', openPalette);
  $('#btnAddGroup').addEventListener('click', openLayerPicker);
  $('#btnUndo').addEventListener('click', undo);
  $('#btnExport').addEventListener('click', exportMap);
  $('#btnImport').addEventListener('click', () => $('#fileInput').click());
  $('#fileInput').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) importFile(f);
    e.target.value = '';
  });
  $('#btnDiscard').addEventListener('click', discardDraft);
  $('#btnHelp').addEventListener('click', () => $('#helpDlg').showModal());
  $('#btnNewStory').addEventListener('click', newStory);
  $('#btnSidebar').addEventListener('click', () => {
    const open = document.body.classList.toggle('sidebar-open');
    $('#btnSidebar').setAttribute('aria-expanded', String(open));
  });

  $('#storyPrev').addEventListener('click', () => goStep(state.story.index - 1));
  $('#storyNext').addEventListener('click', () => {
    const s = storyById(state.story.id);
    if (state.story.index >= s.steps.length - 1) exitStory(); else goStep(state.story.index + 1);
  });
  $('#storyExit').addEventListener('click', exitStory);

  $('#search').addEventListener('input', runSearch);
  $('#search').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $('#searchResults .result')?.click(); }
    if (e.key === 'Escape') { $('#search').value = ''; runSearch(); $('#search').blur(); }
  });

  $('#labelsToggle').addEventListener('change', (e) => { scene.labelsOn = e.target.checked; });
  const gap = $('#gapRange');
  gap.addEventListener('input', () => scene.setLayerGap(Number(gap.value)));
  gap.addEventListener('change', () => {
    state.data.meta.layerGap = Number(gap.value);
    persist();
    updateDraftPill();
  });
  $('#titleInput').addEventListener('change', (e) => commit((d) => { d.meta.title = e.target.value.trim() || 'Infrastructure map'; }, { rebuild: false, panel: false, sidebar: false }));
  $('#loadErrorClose').addEventListener('click', () => { $('#loadError').hidden = true; });

  window.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', handleHash);
}

function onKey(e) {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if (document.querySelector('dialog[open]')) return;
  if (e.key === 'Escape') {
    if (typing) { e.target.blur(); return; }
    if (state.connectFrom) endConnect();
    else if (state.story) exitStory();
    else { select([], null); scene.setHighlight(null); }
    return;
  }
  if (typing) return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') {
    if (state.editMode) { e.preventDefault(); undo(); }
    return;
  }
  if (mod || e.altKey) return;
  if (state.story && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    e.preventDefault();
    if (e.key === 'ArrowRight') $('#storyNext').click(); else if (state.story.index > 0) goStep(state.story.index - 1);
    return;
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && state.editMode && state.selection.length) {
    e.preventDefault();
    deleteSelection();
    return;
  }
  const k = e.key.toLowerCase();
  if (k === 'f' && state.selection.length) {
    if (state.selKind === 'group') scene.focusGroup(state.selection[0]); else scene.frameIds(state.selection);
  } else if (k === 'h') scene.home();
  else if (k === 'e') setEditMode(!state.editMode);
  else if (e.key === '/') { e.preventDefault(); $('#search').focus(); }
  else if (e.key === '?') $('#helpDlg').showModal();
}

function handleHash() {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  if (compById(id)) goTo(id);
  else if (groupById(id)) { select([id], 'group'); scene.focusGroup(id); }
  else if (storyById(id)) playStory(id);
}

function showLoadError(err) {
  const local = window.location.protocol === 'file:';
  $('#loadErrorText').textContent = local
    ? 'Browsers block loading the map file when the page is opened straight from a folder. Run a local web server in the public folder (for example: python3 -m http.server) and open http://localhost:8000.'
    : `Couldn’t load ${DATA_URL} (${err.message}). Check the file exists and is valid JSON. You can still import a map or start a new one in edit mode.`;
  $('#loadError').hidden = false;
}

// ---------- Start ----------
async function boot() {
  scene = new MapScene($('#stage'), { onPick, onDragEnd, onLayerClick: (id) => scene.focusLayer(id), onViewChange });
  wireUI();

  let published = null;
  try {
    const res = await fetch(DATA_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`the server returned ${res.status}`);
    const n = normalize(await res.json());
    if (n.warnings.length) console.warn('Fixes applied to the published map:', n.warnings);
    published = n.data;
  } catch (err) {
    showLoadError(err);
  }
  state.published = published || normalize({}).data;

  const draft = readDraft();
  if (draft?.data) {
    try {
      const n = normalize(draft.data);
      if (sameMap(n.data, state.published)) {
        clearDraft();
      } else {
        state.data = n.data;
        state.exported = !!draft.exported;
        state.draftStale = !!published && draft.basedOn !== (published.meta.updated || null);
      }
    } catch {
      clearDraft();
    }
  }
  if (!state.data) state.data = clone(state.published);

  $('#gapRange').value = String(state.data.meta.layerGap);
  scene.update(state.data);
  scene.home({ instant: true });
  renderTitle();
  renderSidebar();
  renderPanel();
  updateDraftPill();
  if (!$('#draftPill').hidden) toast('Your unsaved changes from last time are loaded. Export to keep them.', 5000);
  handleHash();
}

boot();
