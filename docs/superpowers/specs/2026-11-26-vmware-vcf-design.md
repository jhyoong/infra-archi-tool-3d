# VMware VCF 5.x reference map: design

Date: 2026-11-26

## Intent and why

The infrastructure map is a static 3D site. Today it shows a generic Example Corp stack with no virtualisation layer. We're turning it into a **reference model of a VMware Cloud Foundation 5.x environment with NSX networking and vSphere Supervisor**.

The map has two audiences:

- **The platform team** uses it as a working model to compare the real environment against. It must answer questions like "where does the Tier-1 for this namespace live?" and "what manages the Edge VMs?" correctly.
- **New team members** use it as a teaching guide. Storylines walk from the physical hardware up to pods, and every VMware component explains itself when clicked.

The map shows a **generic reference architecture**. Names, counts and address ranges are invented, not copied from the real environment, so it is safe to publish.

## Goals

1. Show the nesting VMware relies on: host → vSphere cluster → Supervisor → vSphere Namespace → VKS cluster → node VM → pod.
2. Show the difference between the physical network underneath (underlay) and the NSX overlay running on top of it.
3. Distinguish relationship types: data flow, runs-on (placement), manages, overlay, storage and power. Make it possible to view one kind at a time.
4. Ship a complete VCF 5.x sample map with storylines that teach the concepts in order.
5. Explain every VMware component type in the side panel, in plain language, including its former name where it changed.

## Non-goals

- VCF 9 (NSX VPCs, transit gateways, VCF Operations/Automation changes). The README notes that VCF 9 brings major changes.
- Modelling the team's real environment (real names, address ranges, console links).
- Loading maps made with the previous format. This is a fresh project; the current `infrastructure.json` will be replaced.
- `count` (×N badges), drill-down into components, and a containment-tree data model. These may come later. Nothing in this design should rule them out.
- Multiple map files or a map switcher.

## Anti-goals (failure even if it works technically)

- **Teaching something wrong.** An inaccurate VMware fact in a caption or explanation is worse than leaving it out. Use the naming and facts in the "VMware facts" section, and don't invent beyond them.
- **Needing the network at runtime.** It must run on airgapped GitLab Pages: no CDN, fonts, external images or remote docs links that the page fetches. Links in the content may point to external docs (the user clicks them); nothing is loaded automatically.
- **An unreadable map.** Six layers and many components can become noise. A newcomer must be able to follow a storyline without getting lost; use the kind filter and storyline framing to keep each view focused.

## Constraints

- Static site, no build step, no new runtime dependencies. Three.js r160 stays as vendored in `public/lib`.
- Same browser support as today (current Chrome, Edge, Firefox, Safari; WebGL and import maps).
- The GitLab CI job (`.example-gitlab-ci.yml`) stays as is.
- The data stays hand-editable JSON, and every new field is editable in the browser's edit mode, so the team can maintain the map without touching code.

## Target versions

The map models:

- **VCF 5.2.x**
- **vCenter 8.0 U3** (no patch letter; the team can update it internally)
- **NSX 4.x**
- **vSphere Kubernetes Service (VKS) 3.3.3**
- NSX networking for the Supervisor, using the NSX built-in load balancer (Avi is mentioned as the alternative in explanation text)

## Approaches considered

1. **Extend the current app (chosen).** Keep layers and groups. Add connection kinds, nested groups, group endpoints, properties and type explanations, plus the VMware models and a new sample map. Lowest risk, keeps the JSON simple, and leaves drill-down possible later.
2. **Rebuild around a containment tree.** Every item has a parent, and layers and outlines are worked out from the tree. It's closest to how VMware models things and gives drill-down for free, but it means rewriting most of `scene.js` and the editor, and the JSON gets harder to edit by hand.
3. **Content only.** Add new models and data with today's features. Fastest, but it can't show "manages" vs "runs on" or nesting, and those are the main teaching points.

The user picked approach 1.

## Design

### 1. Connection kinds

Each connection gets a `kind`:

| kind | Meaning | Example |
|---|---|---|
| `data` | Traffic or API calls between workloads (default) | portal → orders API |
| `runs-on` | Placement: the `from` item runs on or is hosted by `to` | VKS node VM → WLD-01 cluster |
| `manages` | Management or control plane | vCenter → ESXi host; SDDC Manager → vCenter |
| `overlay` | NSX logical network path (Geneve overlay, T0/T1 routing) | T1 → T0; segment → T1 |
| `storage` | Storage path | PVC/VKS cluster → vSAN datastore |
| `power` | Power feed | UPS → rack |

- Each kind has its own line style. Kinds must be told apart by **pattern as well as colour** (solid, dashed, dotted and so on), so the map works for colour-blind readers. `runs-on` and `manages` are directional and show which end is which (for example an arrowhead or a moving dash). The builder chooses the exact styles.
- **Legend and filter:** a legend lists the six kinds with their style, and each entry toggles that kind on and off. All kinds are on by default.
- **Duplicates:** two connections between the same pair are allowed if their kinds differ. The same pair with the same kind is still a duplicate.
- **Editing:** connect mode creates a `data` connection. The connection list in the side panel lets you change each connection's kind and label.
- **Storylines:** a step may set `kinds` (an array). While that step is shown, only those kinds are visible. If the step doesn't set it, the user's current filter applies. Leaving the storyline restores the user's filter.

### 2. Groups: nesting, connections and highlights

- **Nesting is worked out from geometry**, the same way component membership already works (`groupMembers` in `app.js`). Group A is inside group B when both are on the same layer and A's rectangle lies entirely within B's. A group's parent is the smallest group that contains it. There is no `parent` field, so the JSON can't disagree with the picture.
- **Drawing:** nested groups must read as nested, for example with a slight inset or lift and a distinct outline weight. Each group's label stays readable.
- **Dragging** a group carries the groups and components inside it.
- **Group panel:** shows "Inside: <parent group>" (clickable), the groups it contains, and the components it contains.
- **Group endpoints:** a connection's `from` or `to` can be a group id. A group endpoint attaches at the group's centre at its layer's height. This is how "Supervisor runs on WLD-01 cluster" is drawn across layers. In edit mode, connect mode accepts a group as the target, and a group's side panel offers "Connect".
- **Storyline highlights** can include group ids. A highlighted group is emphasised and framed like a component.

### 3. Component properties

- Components get `properties: [{ "key": "...", "value": "..." }]`. Order is kept.
- The panel shows them as a two-column table under the description.
- In edit mode you can add, edit, reorder (or at least delete and re-add) and remove rows.
- These hold things like CIDRs, versions, sizes and counts ("Hosts: 4", "Ingress CIDR: 10.220.0.0/24").

### 4. Type explanations (`typeInfo`)

- New top-level `typeInfo`: `{ "<type id>": { "summary": "...", "formerly": "..." } }`. `formerly` is optional.
- The component panel shows an **About this type** section with the summary and, if present, "Formerly: …".
- In edit mode, a component's panel lets you edit the explanation for its type, which changes it for every component of that type. This works like the existing "Icon for all … models" field.
- The sample map ships a `typeInfo` entry for every type it uses.

### 5. Layers

The sample uses six layers, bottom to top:

| id | name | Contents |
|---|---|---|
| `physical` | Physical | ESXi hosts, racks, UPS |
| `phys-network` | Physical network | ToR/leaf switches, spine/core, edge router, perimeter firewall |
| `virtual-infra` | Virtual infrastructure | SDDC Manager, vCenters, NSX Managers, NSX Edges, vSAN datastores, VDS, organised into management domain and workload domain groups |
| `nsx-overlay` | NSX overlay | Tier-0, Tier-1s, segments, Distributed Firewall, NSX load balancers |
| `workload` | Workload platform | Supervisor, vSphere Namespaces, VKS clusters, vSphere Pods, VM Service VMs, Harbor |
| `application` | Application | Users and apps |

- The default layer list in `app.js` (used when a file has none) becomes these six. The colour fallback must give six distinct colours.
- With six layers the scene is taller; the builder should check the default `layerGap` and camera framing still give a readable first view.

### 6. New model types

These are added to `MODEL_TYPES` in `models.js`, built in the same low-poly style as the existing models. Each is recognisable at a glance and distinct from the others; the shapes are left to the builder.

| id | Label | Default layer |
|---|---|---|
| `esxi-host` | ESXi host | physical |
| `sddc-manager` | SDDC Manager | virtual-infra |
| `vcenter` | vCenter Server | virtual-infra |
| `nsx-manager` | NSX Manager cluster | virtual-infra |
| `nsx-edge` | NSX Edge node | virtual-infra |
| `vsan-datastore` | vSAN datastore | virtual-infra |
| `vds` | vSphere Distributed Switch | virtual-infra |
| `t0-gateway` | Tier-0 gateway | nsx-overlay |
| `t1-gateway` | Tier-1 gateway | nsx-overlay |
| `segment` | NSX segment | nsx-overlay |
| `dfw` | Distributed Firewall | nsx-overlay |
| `nsx-lb` | NSX load balancer | nsx-overlay |
| `supervisor-cp` | Supervisor control plane VM | workload |
| `vks-cluster` | VKS cluster | workload |
| `vsphere-pod` | vSphere Pod | workload |
| `registry` | Container registry (Harbor) | workload |

Existing types stay. The vSphere cluster, Supervisor, management and workload domains, and vSphere Namespaces are **groups**, not component types. VM Service VMs and VKS node VMs use the existing `vm` type.

Layer ids change, so every existing type's default layer is remapped to the new ids (for example `hardware` → `physical`, `network` → `phys-network`, `platform` → `workload`).

### 7. Sample map content

Replace `public/data/infrastructure.json` with a VCF 5.x reference map. Its title is something like "VCF 5.x reference architecture". Names and address ranges are invented and use private ranges.

**Physical**
- Management domain: a rack group with 4 ESXi hosts.
- Workload domain WLD-01: a rack group with 4 ESXi hosts.
- A UPS.

**Physical network**
- A ToR/leaf pair per rack, a spine/core, an edge router (the BGP peer for T0), and a perimeter firewall.

**Virtual infrastructure**
- Group "Management domain", containing group "Management cluster", which holds:
  - SDDC Manager
  - management vCenter
  - **WLD-01 vCenter** (in VCF 5.x, workload domain vCenters run in the management domain)
  - management NSX Manager cluster
  - **WLD-01 NSX Manager cluster** (it also runs in the management domain)
  - the management vSAN datastore and VDS
- Group "Workload domain WLD-01", containing group "WLD-01 cluster", which holds:
  - the WLD-01 vSAN datastore and VDS
  - Group "Edge cluster" holding 2 NSX Edge nodes (the Edge cluster runs on the workload domain cluster)

**NSX overlay**
- One Tier-0 (active/standby or active/active on the Edge cluster, BGP to the edge router).
- A group "Supervisor system networking" with the Supervisor's Tier-1, segment and NSX load balancer.
- A group per vSphere Namespace (for example "ns-team-a network", "ns-team-b network"), each with its own Tier-1, segment(s) and NSX load balancer.
- One Distributed Firewall component, explained as enforced in each ESXi host's kernel.

**Workload platform**
- Group "Supervisor (WLD-01 cluster)" containing:
  - 3 Supervisor control plane VMs
  - Harbor as a Supervisor Service
  - Group "Namespace: team-a", containing a VKS cluster ("team-a-prod") and its node VMs, or a summary of them
  - Group "Namespace: team-b", containing a VM Service VM and a vSphere Pod
- The Supervisor group connects to the "WLD-01 cluster" group with `runs-on`.
- Supervisor properties include made-up management, namespace (workload), ingress, egress and service CIDRs.
- **Versions in properties** (my call): major versions only, not build numbers: "VCF 5.2", "vCenter 8.0 U3", "NSX 4.2", "VKS 3.3.3". A reference map doesn't need build numbers, and they go stale. Put them on SDDC Manager (VCF), the vCenters, the NSX Managers and the Supervisor (VKS).

**Application**
- Users, a web app and an API running in team-a-prod.

Every component has a description. Every relationship has the right `kind`.

**Required connections across layers** (my call, to keep the map readable while answering "where does X live?"):

| From | kind | To | Why |
|---|---|---|---|
| Rack groups' ESXi hosts | `runs-on` (cluster group → rack group, one link per cluster) | — | "Management cluster" runs on the management rack and "WLD-01 cluster" runs on the WLD-01 rack. Use one group-to-group link per cluster, not one per host. |
| "Edge cluster" group | `runs-on` | "WLD-01 cluster" group | Edge nodes are VMs on the workload cluster |
| Management components (vCenters, NSX Managers, SDDC Manager) | `runs-on` | "Management cluster" group | Shows that the WLD-01 vCenter and NSX Manager live in the management domain |
| Tier-0 | `runs-on` | "Edge cluster" group | The T0 service router runs on the Edges |
| Each Tier-1 that has an NSX load balancer | `runs-on` | "Edge cluster" group | The T1's service router and load balancer run on the Edges. The distributed routing part runs in every host's kernel; the `typeInfo` says so. |
| Each namespace network group | `runs-on` | "WLD-01 cluster" group | Segments are realised on the hosts' VDS |
| Tier-0 | `data` (label "BGP") | Edge router | North-south peering |
| "Supervisor (WLD-01 cluster)" group | `runs-on` | "WLD-01 cluster" group | The Supervisor is the cluster with Supervisor enabled |
| Each namespace group | `overlay` | Its namespace network group | Ties the tenant to its T1 and segment |
| VKS cluster | `storage` | WLD-01 vSAN datastore | Storage path |
| WLD-01 vCenter, WLD-01 NSX Manager | `manages` | WLD-01 cluster and Edge cluster groups | Management plane |

Don't add `runs-on` links for individual VMs to individual hosts. VM placement moves (DRS), and per-VM links would clutter the map.

### 8. Storylines

Order these from basic to advanced. Each caption is short (1–3 sentences) and accurate. The steps listed are the minimum.

1. **Tour of the layers:** one step per layer, bottom to top, saying what each is for.
2. **Who manages what** (`kinds: ["manages"]`):
   - SDDC Manager deploys and lifecycle-manages the vCenters, NSX Managers and hosts.
   - Each domain has its own vCenter. In this map each domain also has its own NSX Manager cluster; several workload domains could share one, but this map doesn't. The workload domain's vCenter and NSX Manager run in the management domain.
   - vCenter manages hosts and clusters. NSX Manager programs the hosts (overlay networking and DFW) and the Edges.
3. **What the Supervisor is:**
   - The WLD-01 cluster with Supervisor enabled becomes a Kubernetes control plane: 3 control plane VMs, and Spherelet on each ESXi host.
   - vSphere Namespaces divide it into tenancy boundaries with resource limits, storage policies, permissions and VM classes.
   - It is not a separate cluster on top.
4. **Provisioning a VKS cluster:**
   - A user applies a Cluster API `Cluster` (ClusterClass `builtin-generic-v3.x`) to a namespace through the Supervisor.
   - VKS creates the control plane and worker node VMs on WLD-01.
   - NSX provides the namespace's T1 and segment.
   - Persistent volumes come from the storage policy via Cloud Native Storage (CNS).
   - Mention once that the old TanzuKubernetesCluster (TKC) API is deprecated.
5. **North-south: customer to pod:** users → perimeter firewall → edge router → (BGP) T0 on the Edge nodes → the namespace's T1 / NSX load balancer → segment → VKS node VM → pod.
6. **East-west and the Distributed Firewall:**
   - VM-to-VM traffic between hosts goes over the Geneve overlay. The DFW is enforced in each host's kernel at each VM's virtual NIC, not at a central box.
   - **vSphere Pods** (team-b) are enforced per pod by the DFW.
   - **VKS clusters** (team-a) use Antrea as their network plugin. Antrea handles pod-to-pod traffic inside the node VMs, so the DFW sees node-VM traffic, not individual pods. Inside a VKS cluster, Kubernetes NetworkPolicy (enforced by Antrea) is what controls pod traffic.
7. **Storage path:**
   - **VKS cluster:** a PVC in the guest cluster → paravirtual CSI (pvCSI) in the VKS cluster → a matching PVC in the Supervisor namespace → CNS → a First Class Disk on the WLD-01 vSAN datastore, placed according to the storage policy behind the StorageClass.
   - **vSphere Pod:** the PVC is in the Supervisor namespace directly → CNS → First Class Disk.
8. **A host fails:** vSphere HA restarts VMs on the other hosts, DRS rebalances, and Kubernetes reschedules pods. Supervisor control plane VMs are spread across hosts by anti-affinity rules.

## VMware facts and naming

Use these names. New members will meet the old ones in older docs, so each `typeInfo` gives the former name once, in "formerly".

| Use | Formerly | Notes |
|---|---|---|
| vSphere Supervisor | vSphere with Tanzu; vSphere IaaS control plane | "Tanzu Supervisor" is not an official name |
| vSphere Kubernetes Service (VKS) | Tanzu Kubernetes Grid Service (TKGS / TKG Service) | Same product, renamed |
| VKS cluster: a Cluster API `Cluster` using ClusterClass `builtin-generic-v3.x` | TKG cluster, `TanzuKubernetesCluster` (TKC) | TKC was deprecated in TKG Service 3.2 (Oct 2024) and is being retired |
| vSphere Kubernetes release (VKr) | Tanzu Kubernetes release (TKr) | Renamed in VKS 3.3 |
| VMware Avi Load Balancer | NSX Advanced Load Balancer | Mentioned only as the alternative to the NSX load balancer |
| NSX | NSX-T | |

Standalone TKG (TKGm) ended with 2.5.4 (June 2025) and is out of scope for this map.

Sources (checked 2026-11-26):
- VKS 3.3 GA: https://blogs.vmware.com/cloud-foundation/2025/03/04/vmware-vsphere-kubernetes-service-3-3-is-now-ga/
- VKS 3.4 and VCF 5.2.x support: https://blogs.vmware.com/cloud-foundation/2025/06/17/vks-3-4-is-here-kubernetes-extended-support-support-for-istio-and-more/
- TKC retirement and move to Cluster API: https://blogs.vmware.com/cloud-foundation/2025/02/24/vsphere-kubernetes-service-retiring-tanzukubernetescluster-tkc-resources-and-transitioning-to-cluster-api/ (the "deprecated in 3.2" version should be confirmed during the build; if it can't be, the caption says "deprecated" without a version)
- vSphere Supervisor 8.0 docs: https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0.html
- Avi rename: https://knowledge.broadcom.com/external/article/312808/vmware-nsx-advanced-load-balancer-avi-re.html
- TKG 2.5 release notes: https://techdocs.broadcom.com/us/en/vmware-tanzu/standalone-components/tanzu-kubernetes-grid/2-5/tkg/mgmt-release-notes.html

## Checking the teaching content

The user chose cited research plus team review:

- While building, research each VMware fact used in a `typeInfo` summary or storyline caption against official Broadcom/VMware sources (TechDocs, KB, release notes, VMware Cloud Foundation blog).
- Record every claim in `docs/vmware-facts.md`: the claim, where it is used (type id or storyline/step), and its source URL. A claim without an official source is either removed or marked "unverified" in that file and kept out of the map.
- The facts table in this design is the starting point; anything beyond it goes through the same process.
- Before the map is published, someone on the platform team reviews the captions and explanations against `docs/vmware-facts.md`. The plan should end with a hand-off for that review, not with publishing.

## README

- Rewrite the README around the VCF 5.x reference map: what each layer is, the connection kinds and filter, nested groups, properties and type explanations, and the new model types table.
- Add a note: "This map models VCF 5.x. VCF 9 brings major changes, including NSX VPCs replacing the per-namespace Tier-1 model, and will need its own map."
- Update the data format example to the new fields: `kind`, group endpoints, `properties`, `typeInfo`, step `kinds`, and group ids in `highlight`.

## Left to the builder

- 3D geometry of the new models, line styles for each kind, exact colours, and component positions.
- How nested groups are drawn (inset, lift or outline weight) and how directional connections are drawn, within the rules above.
- Edit-mode UI details for properties, kinds and type explanations, following the existing panel patterns in `app.js`.
- Whether to keep `version: 1` in the data.
- How to verify. There is no test setup. At minimum: the JSON loads with no warnings in the console, every storyline plays, every type renders, and edit → export → reload round-trips the new fields.
