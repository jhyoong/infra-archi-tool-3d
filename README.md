# Infrastructure map

An interactive 3D map of hardware, network, platform, and application infrastructure. It is a static site with no build step and no internet access needed at runtime, so it runs on an airgapped GitLab Pages instance.

## What's in the repository

```
.gitlab-ci.yml               Publishes public/ to GitLab Pages
public/
  index.html                 The page
  styles.css                 Styles
  js/app.js                  Editing, storylines, import/export, panels
  js/scene.js                3D scene, camera, picking, dragging
  js/models.js               Preset 3D models
  lib/                       Three.js r160 (MIT licence) and its helpers
  data/infrastructure.json   The published map
  icons/                     Your logo files (see icons/README.md)
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
- **Links:** open in a new tab. Every component and group also has its own address, for example `.../#k8s-prod`, which you can share with **Copy link**. A storyline's id in the address plays it.

Press `?` in the app for the full list of shortcuts.

## Editing

In edit mode you can:

- add components from the model picker, and add groups (outlined areas within a layer)
- drag components and groups to move them (a group carries its components with it)
- shift-click to select several components
- connect components, and label the connections
- edit names, descriptions, links, colour, size, and icon badges in the side panel
- create storylines: set up the view, select the components to highlight, then **Add step from current view**
- undo with Ctrl+Z

## Data format

`infrastructure.json` can also be edited by hand. Unknown or broken entries are fixed on load, and the browser console lists what was changed.

```jsonc
{
  "version": 1,
  "meta": { "title": "Example Corp infrastructure", "layerGap": 10, "updated": "2026-11-26T00:00:00.000Z" },

  // Listed bottom to top. Add, rename, or recolour layers here.
  "layers": [
    { "id": "hardware", "name": "Hardware", "color": "#A0A8B5" },
    { "id": "network", "name": "Network", "color": "#2FBF9F" },
    { "id": "platform", "name": "Platform", "color": "#9B87F5" },
    { "id": "application", "name": "Application", "color": "#5AA7F0" }
  ],

  // Icon badge for every component of a model type
  "typeIcons": { "k8s-cluster": "icons/kubernetes.svg" },

  // x and z are the centre; w and d are width and depth
  "groups": [
    { "id": "g-dc1", "name": "Data centre 1", "layer": "hardware", "x": -11.5, "z": -0.5, "w": 13, "d": 12, "description": "", "color": null }
  ],

  "components": [
    {
      "id": "k8s-prod",
      "name": "Production cluster",
      "type": "k8s-cluster",
      "layer": "platform",
      "x": -8, "z": -3,
      "description": "Runs the customer-facing services.",
      "links": [{ "label": "Cluster dashboard", "url": "https://gitlab.example.internal/k8s/prod" }],
      "color": null,   // null uses the layer colour
      "scale": 1,
      "icon": null     // overrides the type icon for this component
    }
  ],

  "connections": [
    { "id": "k-1", "from": "lb-01", "to": "k8s-prod", "label": "ingress" }
  ],

  "storylines": [
    {
      "id": "s-order-journey",
      "name": "How a customer order flows",
      "steps": [
        {
          "title": "Customers arrive",
          "caption": "Customers reach us through the portal or the mobile app.",
          "view": "3d",                          // or "iso" for 2.5D
          "highlight": ["users", "portal"],
          "camera": null                        // null frames the highlighted components automatically
        }
      ]
    }
  ]
}
```

Hand-written storyline steps can leave `camera` as `null`. The app then frames the highlighted components, which keeps working when components move.

Link addresses must start with `http://`, `https://`, or `mailto:`. Anything else is removed when the map loads.

## Model types

| Layer | Types |
| --- | --- |
| Hardware | `server-rack`, `server`, `storage-array`, `ups`, `workstation` |
| Network | `switch`, `router`, `firewall`, `load-balancer`, `access-point` |
| Platform | `vm`, `container`, `k8s-cluster`, `pod`, `database`, `queue`, `object-storage`, `cache` |
| Application | `web-app`, `api-service`, `mobile-app`, `users`, `external-service` |
| Other | `generic` |

Any type can be placed on any layer. To add a model, write a builder function in `public/js/models.js` and add it to `MODEL_TYPES`.

## Browser support

Current versions of Chrome, Edge, Firefox, and Safari. The page needs WebGL and import maps.

## Updating Three.js

The files in `public/lib` come from the `three` npm package, version 0.160.0: `build/three.module.min.js` (saved as `three.module.js`), and `OrbitControls.js`, `CSS2DRenderer.js`, and `BufferGeometryUtils.js` from `examples/jsm`. Replace them together with files from the same version.
