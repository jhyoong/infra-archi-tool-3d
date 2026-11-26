import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, DEFAULT_LAYERS, safeUrl, isDuplicateConnection, groupParent, groupDepth, descendantGroups, childGroups, rectContains, groupMembers, endpointLayer, CONN_KINDS, KIND_IDS, connKey } from '../public/js/data.js';

const T = new Set(['generic', 'vm']);

test('default layers', () => assert.deepEqual(DEFAULT_LAYERS.map((l) => l.id),
  ['physical', 'phys-network', 'virtual-infra', 'nsx-overlay', 'workload', 'application']));
test('default layer colours distinct', () => assert.equal(new Set(DEFAULT_LAYERS.map((l) => l.color)).size, 6));
test('empty map gets default layers', () => assert.equal(normalize({}, T).data.layers.length, 6));
test('unknown type becomes generic with a warning', () => {
  const { data, warnings } = normalize({ components: [{ id: 'a', type: 'nope', layer: 'physical' }] }, T);
  assert.equal(data.components[0].type, 'generic');
  assert.equal(warnings.length, 1);
});
test('safeUrl', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('https://x.test/a'), 'https://x.test/a');
});

const comp = (id) => ({ id, type: 'vm', layer: 'physical' });
const grp = (id, x, z, w, d, layer = 'physical') => ({ id, layer, x, z, w, d });
const withConns = (connections) => normalize({ components: [comp('a'), comp('b')], groups: [grp('g1', 0, 0, 10, 10)], connections: connections.map((k, i) => ({ id: `k${i}`, ...k })) }, T);

test('kind defaults to data', () => {
  const { data, warnings } = withConns([{ from: 'a', to: 'b' }]);
  assert.equal(data.connections[0].kind, 'data');
  assert.equal(warnings.length, 0);
});
test('unknown kind warns', () => {
  const { data, warnings } = withConns([{ from: 'a', to: 'b', kind: 'telepathy' }]);
  assert.equal(data.connections[0].kind, 'data');
  assert.equal(warnings.length, 1);
});
test('same pair different kinds both kept', () => {
  assert.equal(withConns([{ from: 'a', to: 'b', kind: 'data' }, { from: 'b', to: 'a', kind: 'manages' }]).data.connections.length, 2);
});
test('same pair same kind dropped', () => {
  const { data, warnings } = withConns([{ from: 'a', to: 'b', kind: 'runs-on' }, { from: 'b', to: 'a', kind: 'runs-on' }]);
  assert.equal(data.connections.length, 1);
  assert.equal(warnings.length, 1);
});
test('group endpoints accepted', () => assert.equal(withConns([{ from: 'g1', to: 'a' }]).data.connections.length, 1));
test('normalize drops connections to missing groups', () => {
  const { data, warnings } = withConns([{ from: 'g-gone', to: 'a' }]);
  assert.equal(data.connections.length, 0);
  assert.equal(warnings.length, 1);
});
test('conn kinds', () => {
  assert.deepEqual(CONN_KINDS.map((k) => k.id), ['data', 'runs-on', 'manages', 'overlay', 'storage', 'power']);
  assert.deepEqual(CONN_KINDS.filter((k) => k.directed).map((k) => k.id), ['runs-on', 'manages']);
  assert.ok(KIND_IDS.has('power'));
  assert.equal(connKey('a', 'b', 'data'), connKey('b', 'a', 'data'));
  assert.notEqual(connKey('a', 'b', 'data'), connKey('a', 'b', 'power'));
});
test('isDuplicateConnection exceptId', () => {
  const conns = [{ id: 'k1', from: 'a', to: 'b', kind: 'data' }, { id: 'k2', from: 'a', to: 'b', kind: 'manages' }];
  assert.equal(isDuplicateConnection(conns, 'a', 'b', 'manages', 'k1'), true);
  assert.equal(isDuplicateConnection(conns, 'a', 'b', 'manages', 'k2'), false);
});
test('properties kept in order, empty keys dropped', () => {
  const { data } = normalize({ components: [{ ...comp('a'), properties: [{ key: 'A', value: '1' }, { key: '', value: 'x' }, { key: 'B', value: 2 }] }] }, T);
  assert.deepEqual(data.components[0].properties, [{ key: 'A', value: '1' }, { key: 'B', value: '2' }]);
});
test('typeInfo filtered', () => {
  const { data, warnings } = normalize({ typeInfo: { vm: { summary: 'S', formerly: 'F' }, nope: { summary: 'x' }, generic: { summary: '' } } }, T);
  assert.deepEqual(data.typeInfo, { vm: { summary: 'S', formerly: 'F' } });
  assert.equal(warnings.length, 2);
});
test('step kinds empty becomes null', () => {
  const steps = (kinds) => normalize({ storylines: [{ id: 's', steps: [{ kinds }] }] }, T).data.storylines[0].steps[0].kinds;
  assert.equal(steps([]), null);
  assert.equal(steps(['nope']), null);
  assert.deepEqual(steps(['manages', 'nope']), ['manages']);
});
test('step highlight keeps group ids', () => {
  const { data } = normalize({ components: [comp('a')], groups: [grp('g1', 0, 0, 5, 5)], storylines: [{ id: 's', steps: [{ highlight: ['g1', 'a', 'zz'] }] }] }, T);
  assert.deepEqual(data.storylines[0].steps[0].highlight, ['g1', 'a']);
});
test('groupParent nests', () => {
  const groups = [grp('outer', 0, 0, 20, 20), grp('mid', 0, 0, 10, 10), grp('inner', 1, 1, 4, 4)];
  assert.equal(groupParent(groups, groups[2]).id, 'mid');
  assert.equal(groupParent(groups, groups[1]).id, 'outer');
  assert.equal(groupParent(groups, groups[0]), null);
  assert.equal(groupDepth(groups, groups[2]), 2);
  assert.equal(childGroups(groups, groups[0]).length, 1);
});
test('groupParent ignores other layers', () => {
  const groups = [grp('outer', 0, 0, 20, 20, 'physical'), grp('inner', 1, 1, 4, 4, 'workload')];
  assert.equal(groupParent(groups, groups[1]), null);
});
test('groupParent ties', () => {
  const groups = [grp('A', 0, 0, 10, 10), grp('B', 0, 0, 10, 10)];
  assert.equal(groupParent(groups, groups[1]).id, 'A');
  assert.equal(groupParent(groups, groups[0]), null);
  assert.deepEqual(descendantGroups(groups, groups[0]).map((g) => g.id), ['B']);
});
test('rectContains, groupMembers, endpointLayer', () => {
  assert.equal(rectContains({ x: 0, z: 0, w: 10, d: 10 }, { x: 0, z: 0, w: 10, d: 10 }), true);
  assert.equal(rectContains({ x: 0, z: 0, w: 10, d: 10 }, { x: 6, z: 0, w: 10, d: 10 }), false);
  const data = { components: [{ id: 'a', layer: 'physical', x: 1, z: 1 }, { id: 'b', layer: 'workload', x: 1, z: 1 }], groups: [grp('g1', 0, 0, 10, 10)] };
  assert.deepEqual(groupMembers(data.components, data.groups[0]).map((c) => c.id), ['a']);
  assert.equal(endpointLayer(data, 'b'), 'workload');
  assert.equal(endpointLayer(data, 'g1'), 'physical');
  assert.equal(endpointLayer(data, 'zz'), null);
});
test('null and non-object entries are skipped with a warning', () => {
  const { data, warnings } = normalize({
    layers: [null, { id: 'physical', name: 'Physical' }, 7],
    components: [null, comp('a'), 'x', comp('b')],
    groups: [null, grp('g1', 0, 0, 10, 10), []],
    connections: [null, { id: 'k1', from: 'a', to: 'b' }, 3],
    storylines: [null, { id: 's', name: 'S', steps: [null, { highlight: ['a'] }, 'oops'] }],
  }, T);
  assert.deepEqual(data.layers.map((l) => l.id), ['physical']);
  assert.deepEqual(data.components.map((c) => c.id), ['a', 'b']);
  assert.deepEqual(data.groups.map((g) => g.id), ['g1']);
  assert.deepEqual(data.connections.map((k) => k.id), ['k1']);
  assert.deepEqual(data.storylines.map((s) => s.id), ['s']);
  assert.equal(data.storylines[0].steps.length, 1);
  assert.deepEqual(data.storylines[0].steps[0].highlight, ['a']);
  assert.equal(warnings.length, 11);
  assert.ok(warnings.every((w) => /^Skipped .+: not an object$/.test(w)), warnings.join('\n'));
});
test('all-null layers fall back to the defaults', () => {
  const { data, warnings } = normalize({ layers: [null] }, T);
  assert.equal(data.layers.length, 6);
  assert.equal(warnings.length, 1);
});
test('unresolved step highlight id warns', () => {
  const { data, warnings } = normalize({ components: [comp('a')], storylines: [{ id: 's', name: 'S', steps: [{ highlight: ['a', 'zz'] }] }] }, T);
  assert.deepEqual(data.storylines[0].steps[0].highlight, ['a']);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /"zz"/);
});
