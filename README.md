# Infrastructure map

An interactive 3D reference map of a VMware Cloud Foundation (VCF) 5.2 environment with NSX and a vSphere Supervisor running VKS clusters. It is for the platform team and for new members learning how the layers fit together. It is a static site with no build step and no internet access needed at runtime, so it runs on an airgapped GitLab Pages instance.

This map models VCF 5.x. VCF 9 brings major changes, including NSX VPCs replacing the per-namespace Tier-1 model, and will need its own map.

## Layers

Bottom to top:

| Layer id | Name | What it shows |
| --- | --- | --- |
| `physical` | Physical | Racks, ESXi hosts, power |
| `phys-network` | Physical network | Top-of-rack switches, routers, firewalls |
| `virtual-infra` | Virtual infrastructure | SDDC Manager, vCenter, NSX Manager and Edge, vSAN, the distributed switch |
| `nsx-overlay` | NSX overlay | Tier-0 and Tier-1 gateways, segments, distributed firewall, NSX load balancer |
| `workload` | Workload platform | Supervisor control plane, VKS clusters, vSphere Pods, registry |
| `application` | Application | The services and users that run on the platform |

## What's in the repository

```
.gitlab-ci.yml               Publishes public/ to GitLab Pages
public/
  index.html                 The page
  styles.css                 Styles
  js/app.js                  Editing, storylines, import/export, panels
  js/data.js                 Loading, fixing and checking map data (no browser code)
  js/types.js                Model type metadata (no browser code)
  js/package.json            Marks the JS as ES modules for Node (tests only; no dependencies)
  js/scene.js                3D scene, camera, picking, dragging
  js/models.js               Preset 3D models
  lib/                       Three.js r160 (MIT licence) and its helpers
  data/infrastructure.json   The published map
  icons/                     Your logo files (see icons/README.md)
tests/                       Node tests for the data logic
docs/vmware-facts.md         Every VMware claim in the map, with its source
```

## Running it locally

Browsers won't load the map file when the page is opened straight from a folder, so use a small web server:

```
cd public
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publishing changes

Edits made in the browser are kept in that browser until they're published.

1. Choose **Edit** and make your changes.
2. Choose **Export** to download `infrastructure.json`.
3. Replace `public/data/infrastructure.json` with it and commit to the default branch.
4. The pipeline publishes the new map to GitLab Pages.

The **Unsaved changes** marker in the top bar shows when your browser has changes that aren't in the published map. **Discard** goes back to the published version.

If your runners can't pull images from the internet, change `image` in `.gitlab-ci.yml` to any small image from your internal registry that has a shell.

## Using the map

- **Navigate:** drag to rotate (3D view), right-drag to pan, scroll to zoom. Click a layer name to zoom to that layer.
- **Focus:** click a component or group to see its details, links, and connections. Unrelated components fade out.
- **Views:** 3D is the default. 2.5D is a fixed, near-isometric angle that keeps the layers easy to read.
- **Storylines:** step-by-step tours with captions. Each step can use the 3D or 2.5D view.
- **Links:** open in a new tab. Every component and group also has its own address, for example `.../#vc-wld01`, which you can share with **Copy link**. A storyline's id in the address plays it.

### Connection kinds

Lines differ by pattern as well as colour. The **Connections** legend in the side panel lists the kinds and works as a filter: click a kind to show or hide those lines. The filter is not saved with the map.

| Kind | Meaning | Direction |
| --- | --- | --- |
| `data` | Traffic or data flow (the default) | none |
| `runs-on` | Something runs on something else | from the thing that runs to its host |
| `manages` | Something manages something else | from the manager to the managed |
| `overlay` | NSX overlay networking | none |
| `storage` | Storage connectivity | none |
| `power` | Power feed | none |

`runs-on` and `manages` are drawn with an arrow. A storyline step can set its own kinds (see below), which overrides the filter while that step is shown and shows a "Set by storyline" note in the legend.

### Groups

Groups are outlined areas within a layer. Nesting is inferred from the outlines: a group fully inside another group's outline on the same layer is its child, so on the virtual infrastructure layer a domain contains its cluster, which contains the Edge cluster. Nesting never crosses layers: the ESXi hosts sit in racks on the physical layer, and a `runs-on` line links a cluster to its rack. There is no parent field to maintain. Groups can be connected like components, for example a UPS feeding a whole rack.

### Properties and explanations

Components can carry **properties**, short key/value facts such as a management IP, shown in the side panel. Each model type can also have an **explanation** (`typeInfo`): a plain-language summary of what the product is, shown when you select a component of that type. Some also name what the product was called before ("formerly").

Press `?` in the app for the full list of shortcuts.

## Editing

In edit mode you can:

- add components from the model picker, and add groups (outlined areas within a layer)
- drag components and groups to move them (a group carries its components and its nested groups with it)
- shift-click to select several components
- connect components and groups (**Connect to…**), label the connections, and change a connection's kind
- edit names, descriptions, links, colour, size, and icon badges in the side panel
- add, edit, and remove a component's properties (key/value facts)
- write the explanation (and former name) shared by every component of a model type
- create storylines: set up the view, select the components to highlight, then **Add step from current view**
- undo with Ctrl+Z

## Data format

`infrastructure.json` can also be edited by hand. Unknown or broken entries are fixed on load, and the browser console lists what was changed.

```jsonc
{
  "version": 1,
  "meta": { "title": "VCF 5.x reference architecture", "layerGap": 8, "updated": "2026-11-26T00:00:00.000Z" },

  // Listed bottom to top. Add, rename, or recolour layers here.
  "layers": [
    { "id": "physical", "name": "Physical", "color": "#A0A8B5" },
    { "id": "phys-network", "name": "Physical network", "color": "#2FBF9F" },
    { "id": "virtual-infra", "name": "Virtual infrastructure", "color": "#E8A04C" },
    { "id": "nsx-overlay", "name": "NSX overlay", "color": "#E0679E" },
    { "id": "workload", "name": "Workload platform", "color": "#9B87F5" },
    { "id": "application", "name": "Application", "color": "#5AA7F0" }
  ],

  // Icon badge for every component of a model type
  "typeIcons": { "vcenter": "icons/vcenter.svg" },

  // Explanation shown for every component of a type; "formerly" is optional
  "typeInfo": {
    "vcenter": { "summary": "vCenter Server manages the ESXi hosts and clusters of a domain.", "formerly": null }
  },

  // x and z are the centre; w and d are width and depth.
  // A group drawn fully inside another group's outline becomes its child.
  "groups": [
    { "id": "g-rack-mgmt", "name": "Management rack", "layer": "physical", "x": -17, "z": 2, "w": 16, "d": 14, "description": "", "color": null }
  ],

  "components": [
    {
      "id": "esxi-mgmt-01",
      "name": "esxi-mgmt-01",
      "type": "esxi-host",
      "layer": "physical",
      "x": -20, "z": 0.5,
      "description": "ESXi host 1 of the management domain.",
      "links": [{ "label": "Host runbook", "url": "https://wiki.example.internal/esxi" }],
      "color": null,   // null uses the layer colour
      "scale": 1,
      "icon": null,    // overrides the type icon for this component
      "properties": [{ "key": "Management IP", "value": "10.10.10.11" }]
    }
  ],

  // kind is one of data, runs-on, manages, overlay, storage, power (default data).
  // from and to can be component ids or group ids.
  "connections": [
    { "id": "k-01", "from": "ups-01", "to": "g-rack-mgmt", "kind": "power", "label": "" }
  ],

  "storylines": [
    {
      "id": "s-physical",
      "name": "Physical to workload",
      "steps": [
        {
          "title": "Physical",
          "caption": "The bottom layer is the hardware: racks of ESXi hosts and their power.",
          "view": "3d",                          // or "iso" for 2.5D
          "highlight": ["g-rack-mgmt", "ups-01"],  // component or group ids
          "camera": null,                       // null frames the highlighted items automatically
          "kinds": ["power"]                    // lines shown during this step; null uses the legend filter
        }
      ]
    }
  ]
}
```

Hand-written storyline steps can leave `camera` as `null`. The app then frames the highlighted components and groups, which keeps working when components move.

Step `kinds` limits which connection kinds are drawn while the step is shown, so a step about power shows only power lines. Use `null` to follow the legend filter. Unknown kinds are removed.

Link addresses must start with `http://`, `https://`, or `mailto:`. Anything else is removed when the map loads.

## Model types

| Layer | Types |
| --- | --- |
| Physical (`physical`) | `server-rack`, `server`, `storage-array`, `ups`, `workstation`, `esxi-host` |
| Physical network (`phys-network`) | `switch`, `router`, `firewall`, `load-balancer`, `access-point` |
| Virtual infrastructure (`virtual-infra`) | `sddc-manager`, `vcenter`, `nsx-manager`, `nsx-edge`, `vsan-datastore`, `vds` |
| NSX overlay (`nsx-overlay`) | `t0-gateway`, `t1-gateway`, `segment`, `dfw`, `nsx-lb` |
| Workload platform (`workload`) | `vm`, `container`, `k8s-cluster`, `pod`, `database`, `queue`, `object-storage`, `cache`, `supervisor-cp`, `vks-cluster`, `vsphere-pod`, `registry` |
| Application (`application`) | `web-app`, `api-service`, `mobile-app`, `users`, `external-service` |
| Any | `generic` |

That is 40 types. The layer is only the default for new components; any type can be placed on any layer. Type metadata lives in `public/js/types.js`. To add a model, add an entry there and write a builder function in `public/js/models.js`.

## Running the tests

The tests cover the data logic (`public/js/data.js` and `public/js/types.js`). They need Node 18 or newer and nothing else:

```
node --test tests/
```

`public/js/package.json` exists only to mark the JS as ES modules for Node. It has no dependencies and there is nothing to install.

## Reviewing the VMware content

Every VMware claim in the type explanations and storyline captions is listed in `docs/vmware-facts.md` with its official Broadcom or VMware source. Platform-team reviewers should check the captions and explanations against that file, and look at the `## Unverified` items in particular.

## Browser support

Current versions of Chrome, Edge, Firefox, and Safari. The page needs WebGL and import maps.

## Updating Three.js

The files in `public/lib` come from the `three` npm package, version 0.160.0: `build/three.module.min.js` (saved as `three.module.js`), and `OrbitControls.js`, `CSS2DRenderer.js`, and `BufferGeometryUtils.js` from `examples/jsm`. Replace them together with files from the same version.
