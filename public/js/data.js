// Pure data logic: no DOM, no Three.js, so Node can import it for tests.
export const isHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
export const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
export const str = (v) => (typeof v === 'string' ? v : '');

export const DEFAULT_LAYERS = [
  { id: 'physical', name: 'Physical', color: '#A0A8B5' },
  { id: 'phys-network', name: 'Physical network', color: '#2FBF9F' },
  { id: 'virtual-infra', name: 'Virtual infrastructure', color: '#E8A04C' },
  { id: 'nsx-overlay', name: 'NSX overlay', color: '#E0679E' },
  { id: 'workload', name: 'Workload platform', color: '#9B87F5' },
  { id: 'application', name: 'Application', color: '#5AA7F0' },
];

export const CONN_KINDS = [
  { id: 'data', label: 'Data', directed: false },
  { id: 'runs-on', label: 'Runs on', directed: true },
  { id: 'manages', label: 'Manages', directed: true },
  { id: 'overlay', label: 'Overlay', directed: false },
  { id: 'storage', label: 'Storage', directed: false },
  { id: 'power', label: 'Power', directed: false },
];
export const KIND_IDS = new Set(CONN_KINDS.map((k) => k.id));

export const connKey = (from, to, kind) => `${[from, to].sort().join('|')}|${kind}`;
export function isDuplicateConnection(connections, from, to, kind, exceptId = null) {
  const key = connKey(from, to, kind);
  return connections.some((k) => k.id !== exceptId && connKey(k.from, k.to, k.kind) === key);
}

export const rectContains = (o, i) => i.x - i.w / 2 >= o.x - o.w / 2 && i.x + i.w / 2 <= o.x + o.w / 2
  && i.z - i.d / 2 >= o.z - o.d / 2 && i.z + i.d / 2 <= o.z + o.d / 2;

export function groupParent(groups, g) {
  const gi = groups.indexOf(g);
  const area = (r) => r.w * r.d;
  let best = null, bestIdx = -1;
  groups.forEach((c, i) => {
    if (c === g || c.layer !== g.layer || !rectContains(c, g)) return;
    if (!(area(c) > area(g) || (area(c) === area(g) && i < gi))) return;
    if (!best || area(c) < area(best)) { best = c; bestIdx = i; }
  });
  return bestIdx < 0 ? null : best;
}
export const childGroups = (groups, g) => groups.filter((c) => groupParent(groups, c) === g);
export function descendantGroups(groups, g) {
  const out = [], seen = new Set([g]);
  const queue = [g];
  while (queue.length) {
    for (const c of childGroups(groups, queue.shift())) if (!seen.has(c)) { seen.add(c); out.push(c); queue.push(c); }
  }
  return out;
}
export function groupDepth(groups, g) {
  let n = 0;
  for (let p = groupParent(groups, g); p && n <= groups.length; p = groupParent(groups, p)) n++;
  return n;
}
export const groupMembers = (components, g) => components.filter((c) => c.layer === g.layer && Math.abs(c.x - g.x) <= g.w / 2 && Math.abs(c.z - g.z) <= g.d / 2);
export function endpointLayer(data, id) {
  return (data.components.find((c) => c.id === id) || data.groups.find((g) => g.id === id))?.layer ?? null;
}

export function safeUrl(u) {
  if (typeof u !== 'string' || !u.trim()) return null;
  try {
    const url = new URL(u.trim(), (globalThis.location?.href ?? 'http://localhost/'));
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? u.trim() : null;
  } catch {
    return null;
  }
}

export function makeId(prefix, used) {
  let id;
  do id = `${prefix}-${Math.random().toString(36).slice(2, 8)}`; while (used.has(id));
  used.add(id);
  return id;
}

export function usedIds(d) {
  return new Set([...d.components, ...d.groups, ...d.connections, ...d.storylines].map((x) => x.id));
}

export function normalize(raw, typeIds) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('the file is not a map (expected a JSON object)');
  const warn = [];
  const used = new Set();
  // Keep only object entries of an array; warn about anything else (null, numbers, strings, arrays).
  const objs = (arr, what) => (Array.isArray(arr) ? arr : []).filter((x, i) => {
    if (x && typeof x === 'object' && !Array.isArray(x)) return true;
    warn.push(`Skipped ${what} ${i + 1}: not an object`);
    return false;
  });
  const takeId = (id, prefix, what) => {
    if (typeof id === 'string' && id && !used.has(id)) { used.add(id); return id; }
    const fresh = makeId(prefix, used);
    warn.push(`${what} had a missing or duplicate id; assigned ${fresh}`);
    return fresh;
  };
  const meta = { title: 'Infrastructure map', layerGap: 10, ...(raw.meta && typeof raw.meta === 'object' ? raw.meta : {}) };
  meta.title = str(meta.title) || 'Infrastructure map';
  meta.layerGap = Math.min(24, Math.max(4, num(meta.layerGap, 10)));

  const givenLayers = objs(raw.layers, 'layer');
  const srcLayers = givenLayers.length ? givenLayers : DEFAULT_LAYERS;
  const layerIds = new Set();
  const layers = srcLayers.map((L, i) => {
    let id = str(L.id) || `layer-${i + 1}`;
    while (layerIds.has(id)) id += '-x';
    layerIds.add(id);
    return { id, name: str(L.name) || id, color: isHex(L.color) ? L.color : DEFAULT_LAYERS[i % DEFAULT_LAYERS.length].color };
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

  const components = objs(raw.components, 'component').map((c) => {
    const name = str(c.name) || 'Untitled';
    let type = str(c.type);
    if (!typeIds.has(type)) { warn.push(`Component "${name}" had an unknown type "${type}"; using generic`); type = 'generic'; }
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
      properties: (Array.isArray(c.properties) ? c.properties : [])
        .map((p) => ({ key: str(p?.key).trim(), value: p?.value == null ? '' : String(p.value) }))
        .filter((p) => p.key),
    };
  });
  const compIds = new Set(components.map((c) => c.id));

  const groups = objs(raw.groups, 'group').map((g) => {
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

  const endpointIds = new Set([...compIds, ...groups.map((g) => g.id)]);
  const seenKeys = new Set();
  const connections = [];
  for (const k of objs(raw.connections, 'connection')) {
    if (!endpointIds.has(k.from) || !endpointIds.has(k.to) || k.from === k.to) { warn.push(`Dropped a connection from "${k.from}" to "${k.to}" (missing component or group)`); continue; }
    let kind = 'data';
    if (KIND_IDS.has(k.kind)) kind = k.kind;
    else if (k.kind != null && k.kind !== '') warn.push(`A connection had an unknown kind "${k.kind}"; using data`);
    const key = connKey(k.from, k.to, kind);
    if (seenKeys.has(key)) { warn.push(`Dropped a duplicate ${kind} connection between "${k.from}" and "${k.to}"`); continue; }
    seenKeys.add(key);
    connections.push({ id: takeId(k.id, 'k', 'A connection'), from: k.from, to: k.to, kind, label: str(k.label) });
  }

  const typeInfo = {};
  for (const [t, v] of Object.entries(raw.typeInfo && typeof raw.typeInfo === 'object' ? raw.typeInfo : {})) {
    if (!typeIds.has(t)) { warn.push(`typeInfo for unknown type "${t}" dropped`); continue; }
    const summary = str(v?.summary).trim();
    if (!summary) { warn.push(`typeInfo for "${t}" has no summary; dropped`); continue; }
    typeInfo[t] = { summary, formerly: str(v.formerly).trim() || null };
  }

  const vec = (a) => (Array.isArray(a) && a.length === 3 && a.every((n) => Number.isFinite(n)) ? a : null);
  const storylines = objs(raw.storylines, 'storyline').map((s) => {
    const name = str(s.name) || 'Untitled storyline';
    return {
      id: takeId(s.id, 's', `Storyline "${name}"`),
      name,
      steps: objs(s.steps, `step in storyline "${name}"`).map((st, i) => {
        const pos = vec(st.camera?.position), tgt = vec(st.camera?.target);
        return {
          title: str(st.title) || `Step ${i + 1}`,
          caption: str(st.caption),
          view: st.view === 'iso' ? 'iso' : '3d',
          highlight: (Array.isArray(st.highlight) ? st.highlight : []).filter((id) => {
            if (endpointIds.has(id)) return true;
            warn.push(`Storyline "${name}" step ${i + 1}: highlight "${id}" is not a component or group; dropped`);
            return false;
          }),
          kinds: (() => { const ks = (Array.isArray(st.kinds) ? st.kinds : []).filter((x) => KIND_IDS.has(x)); return ks.length ? ks : null; })(),
          camera: pos && tgt ? { position: pos, target: tgt } : null,
        };
      }),
    };
  });

  return { data: { version: 1, meta, layers, typeIcons, typeInfo, groups, components, connections, storylines }, warnings: warn };
}

