import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize, groupParent, groupMembers } from '../public/js/data.js';
import { TYPES } from '../public/js/types.js';

const root = new URL('..', import.meta.url);
const raw = JSON.parse(readFileSync(new URL('public/data/infrastructure.json', root), 'utf8'));
const facts = readFileSync(new URL('docs/vmware-facts.md', root), 'utf8');
const { data, warnings } = normalize(raw, new Set(TYPES.map((t) => t.id)));

const comp = (id) => data.components.find((c) => c.id === id);
const grp = (id) => data.groups.find((g) => g.id === id);
const parentId = (id) => groupParent(data.groups, grp(id))?.id ?? null;

const REQ_GROUPS = ['g-mgmt-domain', 'g-mgmt-cluster', 'g-wld01-domain', 'g-wld01-cluster', 'g-edge-cluster', 'g-rack-mgmt', 'g-rack-wld01',
  'g-sup-net', 'g-ns-a-net', 'g-ns-b-net', 'g-supervisor', 'g-ns-team-a', 'g-ns-team-b'];
const REQ_COMPS = ['sddc-manager', 'vc-mgmt', 'vc-wld01', 'nsxm-mgmt', 'nsxm-wld01', 'edge-01', 'edge-02', 't0', 't1-sup', 't1-ns-a', 't1-ns-b',
  'lb-ns-a', 'dfw', 'vsan-wld01', 'edge-router', 'vks-team-a-prod', 'vsphere-pod-b', 'harbor'];

test('sample map loads without warnings', () => assert.deepEqual(warnings, []));

test('six spec layers in order', () => assert.deepEqual(data.layers.map((l) => l.id),
  ['physical', 'phys-network', 'virtual-infra', 'nsx-overlay', 'workload', 'application']));

test('title names VCF 5.x', () => assert.match(data.meta.title, /VCF 5\.x/));

test('required ids exist', () => {
  for (const id of REQ_GROUPS) assert.ok(grp(id), `group ${id}`);
  for (const id of REQ_COMPS) assert.ok(comp(id), `component ${id}`);
});

test('group nesting', () => {
  assert.equal(parentId('g-mgmt-cluster'), 'g-mgmt-domain');
  assert.equal(parentId('g-wld01-cluster'), 'g-wld01-domain');
  assert.equal(parentId('g-edge-cluster'), 'g-wld01-cluster');
  assert.equal(parentId('g-ns-team-a'), 'g-supervisor');
  assert.equal(parentId('g-ns-team-b'), 'g-supervisor');
});

test('WLD-01 vCenter and NSX Manager live in the management cluster', () => {
  const members = groupMembers(data.components, grp('g-mgmt-cluster')).map((c) => c.id);
  assert.ok(members.includes('vc-wld01'));
  assert.ok(members.includes('nsxm-wld01'));
});

test('required connections', () => {
  const directed = new Set(['runs-on', 'manages']);
  const has = (a, kind, b, label) => data.connections.some((k) => k.kind === kind
    && ((k.from === a && k.to === b) || (!directed.has(kind) && k.from === b && k.to === a))
    && (label === undefined || k.label === label));
  const req = [
    ['g-mgmt-cluster', 'runs-on', 'g-rack-mgmt'],
    ['g-wld01-cluster', 'runs-on', 'g-rack-wld01'],
    ['g-edge-cluster', 'runs-on', 'g-wld01-cluster'],
    ['t0', 'runs-on', 'g-edge-cluster'],
    ['t1-ns-a', 'runs-on', 'g-edge-cluster'],
    ['g-supervisor', 'runs-on', 'g-wld01-cluster'],
    ['g-ns-a-net', 'runs-on', 'g-wld01-cluster'],
    ['t0', 'data', 'edge-router', 'BGP'],
    ['g-ns-team-a', 'overlay', 'g-ns-a-net'],
    ['vks-team-a-prod', 'storage', 'vsan-wld01'],
    ['vc-wld01', 'manages', 'g-wld01-cluster'],
    ['nsxm-wld01', 'manages', 'g-edge-cluster'],
    ['sddc-manager', 'manages', 'vc-wld01'],
  ];
  for (const [a, kind, b, label] of req) assert.ok(has(a, kind, b, label), `${a} ${kind} ${b}${label ? ` (${label})` : ''}`);
});

test('no runs-on link touches an ESXi host', () => {
  const hosts = new Set(data.components.filter((c) => c.type === 'esxi-host').map((c) => c.id));
  for (const k of data.connections.filter((x) => x.kind === 'runs-on')) {
    assert.ok(!hosts.has(k.from) && !hosts.has(k.to), `${k.from} -> ${k.to}`);
  }
});

test('storylines', () => {
  assert.deepEqual(data.storylines.map((s) => s.id),
    ['s-tour', 's-who-manages', 's-supervisor', 's-vks-provisioning', 's-north-south', 's-east-west', 's-storage', 's-host-failure']);
  for (const st of data.storylines.find((s) => s.id === 's-who-manages').steps) assert.deepEqual(st.kinds, ['manages']);
  for (const s of data.storylines) {
    for (const st of s.steps) {
      assert.ok(st.caption.trim(), `${s.id} "${st.title}" caption`);
      assert.ok(st.highlight.length >= 1, `${s.id} "${st.title}" highlight`);
    }
  }
});

test('typeInfo for every used type; every component has a description', () => {
  for (const t of new Set(data.components.map((c) => c.type))) assert.ok(data.typeInfo[t]?.summary, `typeInfo.${t}`);
  for (const c of data.components) assert.ok(c.description.trim(), `${c.id} description`);
});

// Walk every string in the raw JSON, remembering its path.
function strings(v, path = [], out = []) {
  if (typeof v === 'string') out.push({ path, s: v });
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, [...path, i], out));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, [...path, k], out);
  return out;
}
const all = strings(raw);
const isFormerly = (p) => p[0] === 'typeInfo' && p[2] === 'formerly';
const isVksCaption = (p) => p[0] === 'storylines' && raw.storylines[p[1]]?.id === 's-vks-provisioning' && p[2] === 'steps' && p[4] === 'caption';

test('old names appear only in typeInfo formerly', () => {
  const old = ['vSphere with Tanzu', 'IaaS control plane', 'TKGS', 'TKG Service', 'Tanzu Kubernetes Grid', 'TKr', 'NSX Advanced Load Balancer', 'NSX-T'];
  for (const { path, s } of all) {
    if (isFormerly(path)) continue;
    for (const o of old) assert.ok(!s.includes(o), `"${o}" at ${path.join('.')}`);
  }
  for (const { path, s } of all) {
    if (isFormerly(path) || isVksCaption(path)) continue;
    for (const o of ['TanzuKubernetesCluster', 'TKC']) assert.ok(!s.includes(o), `"${o}" at ${path.join('.')}`);
  }
});

test('versions appear in properties', () => {
  const values = data.components.flatMap((c) => c.properties.map((p) => p.value));
  for (const v of ['VCF 5.2', 'vCenter 8.0 U3', 'NSX 4.2', 'VKS 3.3.3']) assert.ok(values.some((x) => x.includes(v)), v);
});

test('facts file has a section for every typeInfo key and storyline', () => {
  const headings = new Set([...facts.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim()));
  for (const t of Object.keys(data.typeInfo)) assert.ok(headings.has(t), `## ${t}`);
  for (const s of data.storylines) assert.ok(headings.has(s.id), `## ${s.id}`);
});

test('stacked means hosted on: WLD-01 upper layers sit over the WLD-01 cluster and rack', () => {
  const xr = (g) => [g.x - g.w / 2, g.x + g.w / 2];
  const within = (x, [a, b]) => x >= a && x <= b;
  const ranges = [xr(grp('g-wld01-cluster')), xr(grp('g-rack-wld01'))];
  const up = new Set(['nsx-overlay', 'workload', 'application']);
  for (const c of data.components.filter((x) => up.has(x.layer))) {
    for (const r of ranges) assert.ok(within(c.x, r), `${c.id} x=${c.x} outside [${r}]`);
  }
  for (const g of data.groups.filter((x) => up.has(x.layer))) {
    for (const r of ranges) assert.ok(within(g.x - g.w / 2, r) && within(g.x + g.w / 2, r), `${g.id} outside [${r}]`);
  }
  const mgmt = xr(grp('g-mgmt-cluster'));
  for (const c of groupMembers(data.components, grp('g-mgmt-cluster'))) assert.ok(within(c.x, xr(grp('g-rack-mgmt'))), `${c.id} outside the management rack`);
  for (const c of data.components.filter((x) => up.has(x.layer))) assert.ok(!within(c.x, mgmt), `${c.id} sits over the management cluster`);
});

test('NSX gateway and segment topology uses overlay lines', () => {
  const nsx = new Set(['t0', 't1-sup', 't1-ns-a', 't1-ns-b', 'lb-sup', 'lb-ns-a', 'lb-ns-b', 'seg-sup', 'seg-ns-a', 'seg-ns-b']);
  const topo = data.connections.filter((k) => nsx.has(k.from) && nsx.has(k.to));
  assert.ok(topo.length >= 9);
  for (const k of topo) assert.equal(k.kind, 'overlay', `${k.from} - ${k.to}`);
  for (const [a, b] of [['vks-a-workers', 'seg-ns-a'], ['vsphere-pod-b', 'seg-ns-b'], ['vm-b-01', 'seg-ns-b']]) {
    assert.ok(data.connections.some((k) => k.kind === 'overlay' && [k.from, k.to].sort().join() === [a, b].sort().join()), `${a} - ${b}`);
  }
});
