# VMware VCF 5.x reference map: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the static 3D infrastructure map with connection kinds, nested groups, group endpoints, properties and type explanations, then ship a sourced VCF 5.x + NSX + vSphere Supervisor reference map with 8 teaching storylines.

**Architecture:** Pure data logic (validation, nesting, duplicate rules) moves out of `app.js` into a new DOM-free, Three-free module `public/js/data.js`, and model metadata moves into `public/js/types.js`. Both are unit-tested with Node's built-in test runner, which is a dev-only tool that never ships to the site. `scene.js` renders the new concepts and `app.js` edits them. The sample map is plain JSON, checked by a Node test.

**Tech Stack:** Vanilla ES modules, Three.js r160 (vendored in `public/lib`), Node 18 `node:test` for tests only.

**Spec:** `docs/superpowers/specs/2026-11-26-vmware-vcf-design.md`

## Global Constraints

- Static site, no build step, no new runtime dependencies; nothing under `public/` may fetch from the network at runtime. Three.js stays r160 as vendored.
- No `package.json` and no npm installs. Tests run with `node --test tests/` (Node 18.19 is installed).
- `public/js/data.js` and `public/js/types.js` must not import Three.js, `scene.js`, `models.js` or touch `window`/`document`, so Node can import them.
- **Do not run `git commit`.** The user's global rules forbid committing on their behalf. Each task ends by running the tests and listing changed files with `git status --short`; the user commits.
- Fresh project: no backward compatibility with the old map format or the old layer ids.
- Naming (copy rules): "vSphere Supervisor", "vSphere Kubernetes Service (VKS)", "VKS cluster", Cluster API `Cluster` with ClusterClass `builtin-generic-v3.x`, "vSphere Kubernetes release (VKr)", "VMware Avi Load Balancer", "NSX". Old names (vSphere with Tanzu, vSphere IaaS control plane, TKGS / TKG Service, Tanzu Kubernetes Grid, TanzuKubernetesCluster / TKC, TKr, NSX Advanced Load Balancer, NSX-T) appear only in `typeInfo.*.formerly`, plus one mention of TKC deprecation in storyline 4.
- Versions shown: "VCF 5.2", "vCenter 8.0 U3", "NSX 4.2", "VKS 3.3.3". No build numbers or patch letters.
- Connection kinds, in this order: `data`, `runs-on`, `manages`, `overlay`, `storage`, `power`. `runs-on` and `manages` are directional. The default kind is `data`.
- Layers, bottom to top: `physical` "Physical", `phys-network` "Physical network", `virtual-infra` "Virtual infrastructure", `nsx-overlay` "NSX overlay", `workload` "Workload platform", `application` "Application".
- Kinds must differ by line pattern, not only by colour.
- Every VMware fact in `typeInfo` and storyline captions must have an official Broadcom/VMware source recorded in `docs/vmware-facts.md`. Leave out anything unsourced.

## Review Focus

1. **Two groups on one layer with identical rectangles.** The expected behaviour is a stable, acyclic parent: the one earlier in `groups` is the parent. There must be no infinite loop when walking up or down. Test: Task 2, `groupParent ties`.
2. **Deleting a group that is a connection endpoint or storyline highlight.** Its connections and highlight references must go too, with no crash and no dangling ids after reload. Tests: Task 2, `normalize drops connections to missing groups`; Task 5, delete check.
3. **Changing a connection's kind in the panel so it duplicates an existing connection** (same pair, same kind). The change is refused with a toast. Test: Task 2, `isDuplicateConnection exceptId`; Task 5 browser check.
4. **A storyline step with `kinds: []` or only unknown kinds.** Treat it as "not set" so the user's filter applies, never as "hide all lines". Test: Task 2, `step kinds empty becomes null`.
5. **Hiding a layer that holds a group endpoint, or dragging a parent group.** Connections to hidden groups disappear without errors. Dragging moves nested groups and components, and the move survives undo and reload. Tests: Task 3 and Task 4 browser checks.

---

## File structure

| File | Responsibility |
|---|---|
| `public/js/data.js` (create) | Helpers (`str`, `num`, `isHex`, `safeUrl`, `makeId`, `usedIds`), `DEFAULT_LAYERS`, `CONN_KINDS`, `normalize`, nesting and duplicate helpers |
| `public/js/types.js` (create) | `TYPES` metadata: `{ id, label, layer }` for every model type |
| `public/js/models.js` (modify) | Geometry builders; `MODEL_TYPES` = `TYPES` + `build` |
| `public/js/scene.js` (modify) | Connection kinds rendering and filter, group endpoints, nested groups, group highlight and framing |
| `public/js/app.js` (modify) | Uses `data.js`; legend/filter UI, group connect, kind editing, properties, type explanations, step kinds |
| `public/index.html`, `public/styles.css` (modify) | Legend section, properties table, About section |
| `public/data/infrastructure.json` (replace) | VCF 5.x reference map |
| `tests/data.test.mjs` (create) | Unit tests for `data.js` |
| `tests/types.test.mjs` (create) | Type list tests |
| `tests/sample-map.test.mjs` (create) | Checks on the shipped map and facts file |
| `docs/vmware-facts.md` (create) | Every claim, where it's used, and its source URL |
| `README.md` (modify) | Rewritten for the reference map |

---

### Task 1: Extract pure data logic and type metadata, add the test harness

Behaviour stays the same except `DEFAULT_LAYERS`, which becomes the six spec layers.

**Files:**
- Create: `public/js/data.js`, `public/js/types.js`, `tests/data.test.mjs`, `tests/types.test.mjs`
- Modify: `public/js/app.js` (remove `DEFAULT_LAYERS`, `isHex`, `num`, `str`, `safeUrl`, `makeId`, `usedIds`, `normalize`, and import them instead), `public/js/models.js:346-373`

**Interfaces:**
- Produces (`data.js`):
  - `str(v): string`, `num(v, fallback=0): number`, `isHex(v): boolean`
  - `safeUrl(u): string|null`. Resolve against `globalThis.location?.href ?? 'http://localhost/'`.
  - `makeId(prefix, used: Set): string`, `usedIds(d): Set<string>`
  - `DEFAULT_LAYERS: {id,name,color}[]`: six entries with the spec ids and names, and six distinct colours
  - `normalize(raw, typeIds: Set<string>): { data, warnings: string[] }`. It is the same as today's, except unknown types are checked against `typeIds`, and the layer colour fallback is `DEFAULT_LAYERS[i % DEFAULT_LAYERS.length]`.
- Produces (`types.js`): `TYPES: { id: string, label: string, layer: string|null }[]`. Today's 24 types, with their layers remapped: `hardware`→`physical`, `network`→`phys-network`, `platform`→`workload`, `application`→`application`, and `generic`→`null`.
- Produces (`models.js`): `MODEL_TYPES` and `TYPE_MAP` keep their current shape (`{id,label,layer,build}`), built as `TYPES.map((t) => ({ ...t, build: BUILDERS[t.id] }))`. `BUILDERS` is a map from id to builder function.

- [ ] **Step 1: Write the failing tests.** In `tests/data.test.mjs`:
  ```js
  import { test } from 'node:test';
  import assert from 'node:assert/strict';
  import { normalize, DEFAULT_LAYERS, safeUrl } from '../public/js/data.js';
  const T = new Set(['generic', 'vm']);
  test('default layers', () => assert.deepEqual(DEFAULT_LAYERS.map((l) => l.id),
    ['physical', 'phys-network', 'virtual-infra', 'nsx-overlay', 'workload', 'application']));
  test('default layer colours distinct', () => assert.equal(new Set(DEFAULT_LAYERS.map((l) => l.color)).size, 6));
  test('empty map gets default layers', () => assert.equal(normalize({}, T).data.layers.length, 6));
  test('unknown type becomes generic with a warning', () => {
    const { data, warnings } = normalize({ components: [{ id: 'a', type: 'nope', layer: 'physical' }] }, T);
    assert.equal(data.components[0].type, 'generic'); assert.equal(warnings.length, 1);
  });
  test('safeUrl', () => { assert.equal(safeUrl('javascript:alert(1)'), null); assert.equal(safeUrl('https://x.test/a'), 'https://x.test/a'); });
  ```
  In `tests/types.test.mjs`: `TYPES` ids are unique, every `layer` is one of the six layer ids or `null`, and `TYPES.find((t) => t.id === 'server-rack').layer === 'physical'`.
- [ ] **Step 2: Run the tests and check they fail.** Run `cd /home/userjh/projects/infra-archi-tool-3d && node --test tests/`. Expected: FAIL with "Cannot find module …/data.js".
- [ ] **Step 3: Create `data.js` and `types.js`, and rewire `app.js` and `models.js`.** `app.js` calls `normalize(raw, new Set(Object.keys(TYPE_MAP)))` at its three call sites (`importFile`, `boot` published, `boot` draft).
- [ ] **Step 4: Run the tests and check they pass.** Run `node --test tests/`. Expected: all pass.
- [ ] **Step 5: Smoke-test the app.** Run `cd public && python3 -m http.server 8000`, and fetch `http://localhost:8000/js/app.js` and `/js/data.js` with `curl -sf`; both should return 200. Ask the user to do the browser check if no browser is available. With the old `infrastructure.json` (old layer ids), the map still loads and draws.
- [ ] **Step 6: List the changes.** Run `git status --short`. Don't commit.

---

### Task 2: Extend the data model in `normalize`, and add nesting and duplicate helpers

**Files:**
- Modify: `public/js/data.js`
- Test: `tests/data.test.mjs`

**Interfaces:**
- Consumes: Task 1 `normalize`, `DEFAULT_LAYERS`.
- Produces (`data.js`):
  - `CONN_KINDS: { id, label, directed: boolean }[]`, in the spec order. Labels: Data, Runs on, Manages, Overlay, Storage, Power. `directed` is true only for `runs-on` and `manages`.
  - `KIND_IDS: Set<string>`
  - `connKey(from, to, kind): string`. Unordered pair plus kind.
  - `isDuplicateConnection(connections, from, to, kind, exceptId = null): boolean`
  - `rectContains(outer, inner): boolean`. Both are `{x,z,w,d}`. Edges may touch.
  - `groupParent(groups, g): group|null`. Candidates: other groups on the same layer that contain `g`. A candidate qualifies if it has a strictly larger area, or the same area and a lower array index. Return the qualifying candidate with the smallest area; break ties by the lowest index.
  - `childGroups(groups, g): group[]`. Groups whose `groupParent` is `g`.
  - `descendantGroups(groups, g): group[]`. All depths. Must terminate.
  - `groupDepth(groups, g): number`. 0 for a top-level group.
  - `groupMembers(components, g): component[]`. Same rule as today's `app.js` `groupMembers`.
  - `endpointLayer(data, id): string|null`. The layer of a component or group id.
- Normalized shape changes:
  - connection: `{ id, from, to, kind, label }`. `from` and `to` are component **or group** ids. A missing endpoint drops the connection with a warning. An unknown or missing kind becomes `'data'`, with a warning only when a value was given. A duplicate is the same `connKey`.
  - component: adds `properties: { key: string, value: string }[]`. Rows with an empty key are dropped.
  - top-level `typeInfo: { [typeId]: { summary: string, formerly: string|null } }`. Entries with an unknown type or an empty summary are dropped with a warning.
  - step: `highlight` keeps component **and group** ids. Adds `kinds: string[]|null`; unknown kinds are filtered out, and an empty result becomes `null`.

- [ ] **Step 1: Write the failing tests** (in `tests/data.test.mjs`):
  - `kind defaults to data`: a connection with no kind gives `kind === 'data'` and no warnings.
  - `unknown kind warns`: `kind: 'telepathy'` gives `'data'` and one warning.
  - `same pair different kinds both kept`: `a→b data` and `b→a manages` give 2 connections.
  - `same pair same kind dropped`: `a→b runs-on` and `b→a runs-on` give 1 connection and 1 warning.
  - `group endpoints accepted`: a connection from group `g1` to component `a` is kept.
  - `normalize drops connections to missing groups`: `from: 'g-gone'` is dropped with a warning.
  - `isDuplicateConnection exceptId`: with `[{id:'k1',from:'a',to:'b',kind:'data'}, {id:'k2',from:'a',to:'b',kind:'manages'}]`, `isDuplicateConnection(conns,'a','b','manages','k1') === true` and `isDuplicateConnection(conns,'a','b','manages','k2') === false`.
  - `properties kept in order, empty keys dropped`: `[{key:'A',value:'1'},{key:'',value:'x'},{key:'B',value:2}]` gives `[{key:'A',value:'1'},{key:'B',value:'2'}]`.
  - `typeInfo filtered`: `{ vm: { summary: 'S', formerly: 'F' }, nope: { summary: 'x' }, generic: { summary: '' } }` gives only `vm`, and 2 warnings.
  - `step kinds empty becomes null`: `kinds: []` gives `null`, `kinds: ['nope']` gives `null`, and `kinds: ['manages','nope']` gives `['manages']`.
  - `step highlight keeps group ids`: `highlight: ['g1','a','zz']` gives `['g1','a']`.
  - `groupParent nests`: given outer `{x:0,z:0,w:20,d:20}`, mid `{x:0,z:0,w:10,d:10}` and inner `{x:1,z:1,w:4,d:4}`, all on one layer, the parent of inner is mid, the parent of mid is outer, and the parent of outer is null. `groupDepth(inner) === 2`.
  - `groupParent ignores other layers`: the same rectangles on different layers give null.
  - `groupParent ties`: for two identical rectangles A (index 0) and B (index 1), the parent of B is A and the parent of A is null. `descendantGroups(groups, A)` returns `[B]`.
- [ ] **Step 2: Run the tests and check they fail.** Run `node --test tests/`. Expected: the new tests fail, because the exports are missing.
- [ ] **Step 3: Implement it in `data.js`.**
- [ ] **Step 4: Run the tests and check they pass.** Run `node --test tests/`. Expected: all pass.
- [ ] **Step 5: List the changes.** Run `git status --short`.

---

### Task 3: Scene — connection kinds, filter, group endpoints, group highlight and framing

**Files:**
- Modify: `public/js/scene.js` (`_connPoints`, `_buildConnections`, `_emphasis`, `_colorConnections`, `_applyEmphasis`, `frameIds`, `setHighlight`, constructor)

**Interfaces:**
- Consumes: `CONN_KINDS` from `data.js`.
- Produces (`MapScene`):
  - `visibleKinds: Set<string>`. Defaults to all kinds.
  - `setVisibleKinds(kinds: Iterable<string>): void`. Rebuilds connections.
  - `static KIND_STYLES: { [kind]: { color: string, dash: [dashSize, gapSize] | null } }`. Exported as `KIND_STYLES` so the legend in Task 5 can draw matching swatches. `data` is solid. Every other kind gets a distinct dash pattern, and colours are distinct too.
  - `setHighlight(ids)` and `frameIds(ids, view)` accept group ids as well as component ids.
- Rendering rules:
  - Draw one `LineSegments` per kind. Use `LineDashedMaterial` (call `computeLineDistances`) for dashed kinds and `LineBasicMaterial` for `data`; keep `vertexColors` so emphasis can recolour (amber when hot, dim when dimmed, the kind's colour otherwise).
  - Directed kinds get a small cone at the `to` end, pointing along the last segment, in the same colour as the line.
  - A group endpoint anchors at the group's world centre, at its layer height plus `0.05`, and counts as height 0 in the existing cross-layer routing.
  - A connection is skipped if either endpoint is on a hidden layer or its kind is not visible.
  - In story mode, a highlighted group draws its outline in amber and is not dimmed. In select mode, selecting a group with connections makes its connections hot.

- [ ] **Step 1: Implement the interfaces above.** No unit tests here, because `scene.js` needs WebGL. The checks are in steps 2 and 3.
- [ ] **Step 2: Run the regression tests.** Run `node --test tests/`. Expected: pass.
- [ ] **Step 3: Check in the browser.** Use a temporary scratch file `public/data/scratch.json`, loaded with the **Import** button: two layers, a group on each, two components, and one connection of each kind, including a group-to-group `runs-on`. Check:
  - all six kinds are visibly different in pattern
  - arrows appear only on `runs-on` and `manages`
  - after `scene.setVisibleKinds(['manages'])` in the console, only manages lines show
  - hiding the layer holding a group endpoint removes that line, with no console error
  - a step that highlights a group frames it

  Delete the scratch file afterwards. If no browser is available, give the user this checklist.
- [ ] **Step 4: List the changes.** Run `git status --short`.

---

### Task 4: Scene and app — draw nested groups and drag them together

**Files:**
- Modify: `public/js/scene.js` (`_buildGroup`, `_startDrag`, `_moveDrag`, `_endDrag`), `public/js/app.js` (`onDragEnd`)

**Interfaces:**
- Consumes: `groupDepth`, `descendantGroups`, `groupMembers` from `data.js`.
- Produces:
  - Group holders are drawn at `y = 0.01 + depth * 0.04`. The outline gets thicker or more opaque with depth (the builder picks how). Labels of nested groups must not sit exactly on top of their parent's label: anchor them at the child's own top-left corner, which is already different unless the corners coincide; in that case nudge the label by `0.4` in z.
  - The drag payload changes to `onDragEnd({ kind, id, x, z, members: { kind: 'component'|'group', id, x, z }[] })`. A group drag carries its descendant groups and every component inside it, including those in nested groups.
  - `app.js` `onDragEnd` applies member positions by `kind`.

- [ ] **Step 1: Implement it.**
- [ ] **Step 2: Run the tests.** Run `node --test tests/`. Expected: pass.
- [ ] **Step 3: Check in the browser.** Use a scratch map with outer, mid and inner groups and a component in inner. Check:
  - all three outlines are distinguishable
  - dragging outer moves mid, inner and the component
  - Ctrl+Z restores all of them
  - reload keeps the positions, because they are stored in the draft

  If no browser is available, give the user this checklist.
- [ ] **Step 4: List the changes.** Run `git status --short`.

---

### Task 5: App — legend and filter, group connections, kind editing, group panel, storyline kinds

**Files:**
- Modify: `public/js/app.js`, `public/index.html` (a sidebar section `<section id="kindLegend">` with heading "Connections", placed after the layers section), `public/styles.css`

**Interfaces:**
- Consumes: `CONN_KINDS`, `isDuplicateConnection`, `groupParent`, `childGroups`, `groupMembers`, `endpointLayer` from `data.js`; `KIND_STYLES` and `setVisibleKinds` from `scene.js`.
- Produces:
  - `state.kindFilter: Set<string>`. Starts as all kinds and isn't saved with the map.
  - `renderLegend()`. Each row has a line swatch drawn with the kind's colour and dash pattern (CSS or inline SVG), the label, and a toggle button with `aria-pressed`. Toggling calls `scene.setVisibleKinds(state.kindFilter)` unless a story step is overriding it.
  - `entityById(id)` returns `{ kind: 'component'|'group', item }` or null.
  - `connectionsOf(id)` works for both components and groups. Each entry is `{ k, out, other, otherKind }`.
  - Connect mode starts from a component or a group and finishes on a component or a group (`onPick` handles `hit.kind === 'group'` when `state.connectFrom` is set). The banner text says "component or group". New connections get `kind: 'data'`. The duplicate check uses `isDuplicateConnection(..., 'data')`.
  - Each connection row in the edit panel gets a kind `<select>`. A change that `isDuplicateConnection(conns, from, to, newKind, k.id)` would flag is refused with the toast "These are already connected with that kind." and the select is reset.
  - Each connection row in the view panel shows the kind label.
  - `groupView` shows "Inside" (a parent link, if any), "Groups inside" (`childGroups`), "Contains" (components), and "Connections". `groupEdit` adds a connections editor and a "Connect to…" button.
  - `deleteSelection` for groups also removes connections that touch the deleted groups and removes their ids from step highlights.
  - Story steps: `showStep(st)` calls `scene.setVisibleKinds(st.kinds ?? state.kindFilter)` and also unhides layers for highlighted groups. `exitStory()` restores `state.kindFilter`. The legend shows "Set by storyline" while a step overrides it.
  - Story editor: each step shows "Shows: all lines" or "Shows: Manages, …". It has a "Use current line filter" button, which sets `kinds` to `[...state.kindFilter]`, or `null` if all kinds are on, and a "Show all lines" button, which sets `null`.
  - `addStep` and "Use selection" accept a group selection, highlighting the selected group ids.

- [ ] **Step 1: Implement it.**
- [ ] **Step 2: Run the tests.** Run `node --test tests/`. Expected: pass.
- [ ] **Step 3: Check in the browser.** Check:
  - legend toggles hide and show each kind
  - connect a component to a group, then a group to a group
  - change a kind, then try changing it into a duplicate: the toast appears and nothing changes
  - delete a group that is a connection endpoint and in a step's highlight; the line goes, and Export → Import gives no warnings in the console
  - a step with `kinds: ['manages']` shows only manages lines, and exiting restores the previous filter

  If no browser is available, give the user this checklist.
- [ ] **Step 4: List the changes.** Run `git status --short`.

---

### Task 6: App — properties and type explanations

**Files:**
- Modify: `public/js/app.js` (`compView`, `compEdit`, `addComponent`), `public/styles.css`

**Interfaces:**
- Consumes: normalized `properties` and `typeInfo` (Task 2).
- Produces:
  - `compView`: after the description, a "Properties" section with a `<table class="props">` that has a key column and a value column, shown only when there are rows. Then an "About this type" section showing `typeInfo[c.type].summary` and, if present, a "Formerly: …" line in muted text. It's shown only when there's an entry.
  - `compEdit`: a properties editor with key and value inputs, Move up/Move down, remove, and "Add property", following the `linksEditor` pattern. Then a field labelled `Explanation for all “<type label>” models` with a summary textarea and a "Formerly" input; an empty summary deletes the entry.
  - `addComponent` pushes `properties: []`.

- [ ] **Step 1: Implement it.**
- [ ] **Step 2: Run the tests.** Run `node --test tests/`. Expected: pass.
- [ ] **Step 3: Check in the browser.** Add, reorder and remove properties. Set a type explanation and check that it appears on a second component of the same type. Export → Import keeps both. If no browser is available, give the user this checklist.
- [ ] **Step 4: List the changes.** Run `git status --short`.

---

### Task 7: The 16 VMware model types

**Files:**
- Modify: `public/js/types.js`, `public/js/models.js`
- Test: `tests/types.test.mjs`

**Interfaces:**
- Produces: these `TYPES` entries (`id`: label, layer). Builders live in `models.js`, in the existing low-poly `box`/`cyl`/`sph`/… style, are recognisable, and are distinct from each other and from the existing models.
  - `esxi-host`: "ESXi host", physical
  - `sddc-manager`: "SDDC Manager", virtual-infra
  - `vcenter`: "vCenter Server", virtual-infra
  - `nsx-manager`: "NSX Manager cluster", virtual-infra
  - `nsx-edge`: "NSX Edge node", virtual-infra
  - `vsan-datastore`: "vSAN datastore", virtual-infra
  - `vds`: "vSphere Distributed Switch", virtual-infra
  - `t0-gateway`: "Tier-0 gateway", nsx-overlay
  - `t1-gateway`: "Tier-1 gateway", nsx-overlay
  - `segment`: "NSX segment", nsx-overlay
  - `dfw`: "Distributed Firewall", nsx-overlay
  - `nsx-lb`: "NSX load balancer", nsx-overlay
  - `supervisor-cp`: "Supervisor control plane VM", workload
  - `vks-cluster`: "VKS cluster", workload
  - `vsphere-pod`: "vSphere Pod", workload
  - `registry`: "Container registry (Harbor)", workload

- [ ] **Step 1: Write the failing test.** In `tests/types.test.mjs`, `vmware types present`: each of the 16 ids above exists with exactly that label and layer, and the total count is 40.
- [ ] **Step 2: Run it and check it fails.** Run `node --test tests/`. Expected: FAIL.
- [ ] **Step 3: Add the entries and builders.** Each builder returns parts whose combined height is at most 3.5 and whose footprint is at most 3×3, so they fit the existing spacing.
- [ ] **Step 4: Run the tests and check they pass.** Run `node --test tests/`. Expected: pass.
- [ ] **Step 5: Check in the browser.** The model picker shows all 16 under their layers, each thumbnail renders, and none throws in the console. If no browser is available, give the user this checklist.
- [ ] **Step 6: List the changes.** Run `git status --short`.

---

### Task 8: Research and record the VMware facts

**Files:**
- Create: `docs/vmware-facts.md`

**Interfaces:**
- Produces a facts file that Task 9 writes from and the platform team reviews. Format: one `##` section per type id used in the map (all 16 VMware types, plus `vm`, `users`, `web-app`, `api-service`, `switch`, `router`, `firewall`, `ups`, `server-rack` if they are used), then one `##` section per storyline id. Use these ids: `s-tour`, `s-who-manages`, `s-supervisor`, `s-vks-provisioning`, `s-north-south`, `s-east-west`, `s-storage`, `s-host-failure`. Each section is a table with the columns **Claim | Used in | Source URL**. A final `## Unverified` section lists claims that were researched but have no official source; these must not appear in the map.

- [ ] **Step 1: Research the facts.** Start from the spec's "VMware facts and naming" and "Storylines" sections and its source list. Use Broadcom TechDocs (vSphere 8.0 Supervisor, VKS 3.3, NSX 4.2, VCF 5.2), Broadcom KBs, and VMware Cloud Foundation blog posts. Check specifically:
  - TKC deprecation version: "3.2" or just "deprecated"
  - SDDC Manager's lifecycle role
  - workload domain vCenter and NSX Manager placement in VCF 5.2
  - Spherelet
  - Supervisor control plane VM count and anti-affinity
  - namespace T1 and load balancer creation with NSX networking
  - T0/T1 service router on Edges vs distributed router in hosts
  - DFW enforcement point
  - Antrea in VKS
  - the pvCSI → CNS → First Class Disk chain
  - HA/DRS behaviour
- [ ] **Step 2: Write `docs/vmware-facts.md`.** Write it in the format above, with a header line "Checked on <date> by <agent>; to be reviewed by the platform team."
- [ ] **Step 3: Self-check.** Every claim row has an `https://` URL on a `broadcom.com` or `vmware.com` host, or is listed under `## Unverified`.

---

### Task 9: The VCF 5.x reference map

**Files:**
- Replace: `public/data/infrastructure.json`
- Create: `tests/sample-map.test.mjs`

**Interfaces:**
- Consumes: everything above. Layout, names and claims come from spec §7 and §8 and from `docs/vmware-facts.md`.
- Required ids that the test checks (other ids are free):
  - groups: `g-mgmt-domain`, `g-mgmt-cluster`, `g-wld01-domain`, `g-wld01-cluster`, `g-edge-cluster`, `g-rack-mgmt`, `g-rack-wld01`, `g-sup-net`, `g-ns-a-net`, `g-ns-b-net`, `g-supervisor`, `g-ns-team-a`, `g-ns-team-b`
  - components: `sddc-manager`, `vc-mgmt`, `vc-wld01`, `nsxm-mgmt`, `nsxm-wld01`, `edge-01`, `edge-02`, `t0`, `t1-sup`, `t1-ns-a`, `t1-ns-b`, `lb-ns-a`, `dfw`, `vsan-wld01`, `edge-router`, `vks-team-a-prod`, `vsphere-pod-b`, `harbor`

- [ ] **Step 1: Write the failing test** (`tests/sample-map.test.mjs`). It loads the JSON and the facts file with `fs` and runs `normalize(raw, new Set(TYPES.map((t) => t.id)))`. Then assert:
  - `warnings` is empty.
  - The layer ids match the six spec ids, in order.
  - `meta.title` contains "VCF 5.x".
  - Every required id exists. Groups are nested as `groupParent(g-mgmt-cluster) = g-mgmt-domain`, `groupParent(g-wld01-cluster) = g-wld01-domain`, `groupParent(g-edge-cluster) = g-wld01-cluster`, and `g-ns-team-a` and `g-ns-team-b` have `groupParent = g-supervisor`.
  - `vc-wld01` and `nsxm-wld01` are geometrically inside `g-mgmt-cluster`.
  - These connections exist (any direction where it isn't `runs-on`/`manages`; for those two kinds, `from` is the first item):
    - `g-mgmt-cluster` runs-on `g-rack-mgmt`
    - `g-wld01-cluster` runs-on `g-rack-wld01`
    - `g-edge-cluster` runs-on `g-wld01-cluster`
    - `t0` runs-on `g-edge-cluster`
    - `t1-ns-a` runs-on `g-edge-cluster`
    - `g-supervisor` runs-on `g-wld01-cluster`
    - `g-ns-a-net` runs-on `g-wld01-cluster`
    - `t0` data `edge-router` with label `BGP`
    - `g-ns-team-a` overlay `g-ns-a-net`
    - `vks-team-a-prod` storage `vsan-wld01`
    - `vc-wld01` manages `g-wld01-cluster`
    - `nsxm-wld01` manages `g-edge-cluster`
    - `sddc-manager` manages `vc-wld01`
  - No `runs-on` connection has an `esxi-host` component as an endpoint (no per-VM or per-host placement links).
  - Storyline ids, in order: `s-tour`, `s-who-manages`, `s-supervisor`, `s-vks-provisioning`, `s-north-south`, `s-east-west`, `s-storage`, `s-host-failure`. Every step of `s-who-manages` has `kinds` deep-equal to `['manages']`. Every step has a non-empty caption and at least one highlight.
  - Every used component type has a `typeInfo` entry with a non-empty summary. Every component has a non-empty description.
  - The old names `vSphere with Tanzu`, `IaaS control plane`, `TKGS`, `TKG Service`, `Tanzu Kubernetes Grid`, `TKr`, `NSX Advanced Load Balancer` and `NSX-T` appear only in `typeInfo.*.formerly`. `TanzuKubernetesCluster` and `TKC` appear only in `formerly` fields and in `s-vks-provisioning` captions.
  - The strings "VCF 5.2", "vCenter 8.0 U3", "NSX 4.2" and "VKS 3.3.3" each appear in some component's `properties` values.
  - `docs/vmware-facts.md` contains a `## <id>` heading for every key of `typeInfo` and every storyline id.
- [ ] **Step 2: Run the tests and check they fail.** Run `node --test tests/`. Expected: FAIL against the old map.
- [ ] **Step 3: Write `infrastructure.json`.**
  - Use the spec §7 content and §8 storylines, with captions limited to claims in `docs/vmware-facts.md`.
  - Address ranges are made up and private.
  - Steps use `camera: null` so they auto-frame.
  - Pick `layerGap` and positions so the home view of all six layers is readable.
- [ ] **Step 4: Run the tests and check they pass.** Run `node --test tests/`. Expected: all pass.
- [ ] **Step 5: Check in the browser.**
  - Play every storyline end to end. Each step frames its highlights, and the legend shows "Set by storyline" on `s-who-manages`.
  - Click each VMware component and check that "About this type" shows.
  - There are no console warnings on load.

  If no browser is available, give the user this checklist.
- [ ] **Step 6: List the changes.** Run `git status --short`.

---

### Task 10: README and handoff

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite the README** following spec "README":
  - intro as a VCF 5.x reference map, for the platform team and new members
  - a layers table
  - connection kinds with the legend and filter
  - nested groups (inferred from outlines)
  - group connections
  - properties and type explanations
  - the step `kinds` field
  - the model types table with all 40 types under the new layer ids
  - the data format example updated with `kind`, a group endpoint, `properties`, `typeInfo`, step `kinds` and a group id in `highlight`
  - a "Running the tests" section: `node --test tests/`
  - a "Reviewing the VMware content" section pointing to `docs/vmware-facts.md`
  - the VCF 9 note, verbatim from the spec: "This map models VCF 5.x. VCF 9 brings major changes, including NSX VPCs replacing the per-namespace Tier-1 model, and will need its own map."

  Keep the existing sections on airgapped publishing, the Three.js update and browser support.
- [ ] **Step 2: Check the README.** Every type id in `types.js` appears in the README; check with `node -e` or `grep`. The data format example parses once its `//` comments are stripped.
- [ ] **Step 3: Run the tests.** Run `node --test tests/`. Expected: all pass.
- [ ] **Step 4: Hand off.** Give the user:
  - `git status --short`
  - the browser checklists that couldn't be run here
  - a request for platform-team review of the captions and explanations against `docs/vmware-facts.md`, including any `## Unverified` items

  Don't publish and don't commit.
