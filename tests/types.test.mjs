import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TYPES } from '../public/js/types.js';

const LAYERS = ['physical', 'phys-network', 'virtual-infra', 'nsx-overlay', 'workload', 'application'];

test('type ids are unique', () => assert.equal(new Set(TYPES.map((t) => t.id)).size, TYPES.length));
test('every layer is a known layer id or null', () => {
  for (const t of TYPES) assert.ok(t.layer === null || LAYERS.includes(t.layer), t.id);
});
test('server-rack is on physical', () => assert.equal(TYPES.find((t) => t.id === 'server-rack').layer, 'physical'));

test('vmware types present', () => {
  const expected = [
    ['esxi-host', 'ESXi host', 'physical'],
    ['sddc-manager', 'SDDC Manager', 'virtual-infra'],
    ['vcenter', 'vCenter Server', 'virtual-infra'],
    ['nsx-manager', 'NSX Manager cluster', 'virtual-infra'],
    ['nsx-edge', 'NSX Edge node', 'virtual-infra'],
    ['vsan-datastore', 'vSAN datastore', 'virtual-infra'],
    ['vds', 'vSphere Distributed Switch', 'virtual-infra'],
    ['t0-gateway', 'Tier-0 gateway', 'nsx-overlay'],
    ['t1-gateway', 'Tier-1 gateway', 'nsx-overlay'],
    ['segment', 'NSX segment', 'nsx-overlay'],
    ['dfw', 'Distributed Firewall', 'nsx-overlay'],
    ['nsx-lb', 'NSX load balancer', 'nsx-overlay'],
    ['supervisor-cp', 'Supervisor control plane VM', 'workload'],
    ['vks-cluster', 'VKS cluster', 'workload'],
    ['vsphere-pod', 'vSphere Pod', 'workload'],
    ['registry', 'Container registry (Harbor)', 'workload'],
  ];
  for (const [id, label, layer] of expected) {
    const t = TYPES.find((x) => x.id === id);
    assert.ok(t, id);
    assert.equal(t.label, label);
    assert.equal(t.layer, layer);
  }
  assert.equal(TYPES.length, 40);
});
