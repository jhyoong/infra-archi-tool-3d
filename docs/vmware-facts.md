# VMware facts for the VCF 5.2 reference map

Checked on 2026-11-26 by Claude (Task 8 implementer agent); to be reviewed by the platform team.

Scope: VMware Cloud Foundation 5.2 with NSX networking and vSphere Supervisor (vCenter 8.0 U3, NSX 4.2, VKS 3.3.3).

How to use this file:
- Each `##` section below is a type id or a storyline id. Each row is one claim, where it is used, and the official Broadcom/VMware page that supports it.
- The "Claim" column paraphrases the source. Captions in the map may reword a claim, but must not go beyond it.
- Anything under `## Unverified` has no official source and must not appear in the map.
- A few sources are the vSphere 8.0 docs that still say "TKG" or "TKG Service". In VKS 3.3 the product is called vSphere Kubernetes Service; the rename is sourced under `vks-cluster`.
- `## Corrections to the design` lists places where the design spec disagrees with the sources.

## esxi-host

| Claim | Used in | Source URL |
|---|---|---|
| ESXi is the virtualization platform on which you create and run virtual machines and virtual appliances. | typeInfo.esxi-host | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vcenter-installation-and-setup/introduction-to-vsphere-installation-and-setup.html |
| VCF 5.2 ships ESXi 8.0 Update 3 (bill of materials). | typeInfo.esxi-host, properties | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-release-notes/vmware-cloud-foundation-52-release-notes.html |
| In VCF 5.2, ESXi is installed on hosts first. The hosts are then added to the SDDC Manager inventory ("commissioning") before they can be used in a domain. | typeInfo.esxi-host, s-who-manages | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/host-management-admin/commission-hosts-admin.html |
| The VCF management domain needs at least four ESXi hosts. | sample map (mgmt rack) | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/getting-started-with-vcf-5-2/cloud-foundation-architecture.html |
| A Supervisor with NSX networking on vSAN needs at least 4 ESXi hosts (3 without vSAN). | sample map (WLD-01 rack) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/requirements-for-enabling-a-single-cluster-supervisor/requirements-for-cluster-supervisor-deployment-with-nsx.html |
| NSX kernel modules run inside the ESXi hypervisor kernel and provide distributed routing, the distributed firewall and bridging. | typeInfo.esxi-host | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/host-transport-nodes/manual-installation-of-nsx-kernel-modules/manaully-install-nsx-kernel-modules-on-esxi-hypervisors.html |
| All ESXi hosts in a Supervisor cluster with NSX networking must be prepared as NSX transport nodes. | typeInfo.esxi-host | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/requirements-for-enabling-a-single-cluster-supervisor/requirements-for-cluster-supervisor-deployment-with-nsx.html |
| On a Supervisor, each ESXi host runs Spherelet, a kubelet ported natively to ESXi that lets the host become part of the Kubernetes cluster. | typeInfo.esxi-host, s-supervisor | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-architecture.html |

## sddc-manager

| Claim | Used in | Source URL |
|---|---|---|
| SDDC Manager runs as an appliance in the management domain. | typeInfo.sddc-manager, sample map | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-design-5-2/vcf-sddc-manager-design.html |
| SDDC Manager performs full lifecycle management tasks: deployment, configuration, patching and upgrades. | typeInfo.sddc-manager, s-who-manages | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-design-5-2/vcf-sddc-manager-design.html |
| SDDC Manager deploys VI workload domains and NSX Edge clusters in workload domains. It also handles certificate management, password management and rotation, and backup configuration. | typeInfo.sddc-manager, s-who-manages | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-design-5-2/vcf-sddc-manager-design.html |
| SDDC Manager automates the creation of a VI workload domain and its vSphere clusters. | typeInfo.sddc-manager | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/getting-started-with-vcf-5-2/cloud-foundation-architecture.html |
| In VCF 5.2, NSX is upgraded to 4.2 using SDDC Manager. | typeInfo.sddc-manager | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vmware-cloud-foundation-lifecycle-management/upgrade-plan-for-vmware-cloud-foundation-5-2-lifecycle.html |
| The management domain is created at bring-up by VMware Cloud Builder (not by SDDC Manager). | typeInfo.sddc-manager (optional) | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/getting-started-with-vcf-5-2/cloud-foundation-architecture.html |
| SDDC Manager version in VCF 5.2 is 5.2. | properties ("VCF 5.2") | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-release-notes/vmware-cloud-foundation-52-release-notes.html |

## vcenter

| Claim | Used in | Source URL |
|---|---|---|
| vCenter Server is a service that acts as a central administrator for ESXi hosts connected in a network. | typeInfo.vcenter, s-who-manages | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vcenter-installation-and-setup/introduction-to-vsphere-installation-and-setup.html |
| In VCF, each workload domain has a dedicated vCenter Server. | typeInfo.vcenter, s-who-manages | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-design-5-2/vsphere-design-for-vmware-cloud-foundation/vcf-vcenter-server-design.html |
| All vCenter Server instances run in the management domain. | typeInfo.vcenter, s-who-manages, sample map (WLD-01 vCenter in mgmt cluster) | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-design-5-2/vsphere-design-for-vmware-cloud-foundation/vcf-vcenter-server-design.html |
| When a new VI workload domain is deployed, VCF deploys a vCenter Server Appliance for it within the management domain. | typeInfo.vcenter, s-who-manages | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/working-with-workload-domains-admin/about-virtual-infrastructure-workload-domains-admin.html |
| VCF 5.2 ships vCenter Server 8.0 Update 3 (8.0 Update 3a in the 5.2 GA bill of materials). | properties ("vCenter 8.0 U3") | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-release-notes/vmware-cloud-foundation-52-release-notes.html |
| The management functions of a vSphere Distributed Switch live on vCenter Server. | typeInfo.vcenter, typeInfo.vds | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-networking/basic-networking-with-vnetwork-distributed-switches.html |
| The CNS (Cloud Native Storage) control plane resides in vCenter Server. | typeInfo.vcenter, s-storage | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-storage/getting-started-with-cloud-native-storage-in-vsphere/cloud-native-storage-concepts-and-terminology-in-vsphere/vsphere-cloud-native-storage-components.html |

## nsx-manager

| Claim | Used in | Source URL |
|---|---|---|
| NSX Manager hosts the API services, the management plane, the control plane and the agent services. | typeInfo.nsx-manager | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| An NSX Manager cluster is a cluster of NSX Manager appliances that gives high availability of the UI and API. | typeInfo.nsx-manager | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| The central control plane runs on the NSX Manager cluster and computes runtime state; the local control plane runs on every transport node (hosts and Edges). | typeInfo.nsx-manager, s-who-manages | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| The VCF management domain contains a three-node NSX Manager cluster. | sample map | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/getting-started-with-vcf-5-2/cloud-foundation-architecture.html |
| For the first VI workload domain, SDDC Manager deploys a cluster of three NSX Managers in the management domain. | typeInfo.nsx-manager, s-who-manages, sample map | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/working-with-workload-domains-admin/about-virtual-infrastructure-workload-domains-admin.html |
| Later VI workload domains can share an existing NSX Manager cluster or deploy a new one. | s-who-manages | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/working-with-workload-domains-admin/about-virtual-infrastructure-workload-domains-admin.html |
| VI workload domains cannot use the management domain's NSX Manager cluster. | s-who-manages | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/getting-started-with-vcf-5-2/cloud-foundation-architecture.html |
| VCF 5.2 ships NSX 4.2. | properties ("NSX 4.2") | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-release-notes/vmware-cloud-foundation-52-release-notes.html |
| Formerly: "VMware NSX-T Data Center". The product was renamed "VMware NSX" with release 4.0.0.1. | typeInfo.nsx-manager.formerly (and other NSX types) | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-0/release-notes/vmware-nsx-4001-release-notes.html |
| With Supervisor, the NSX Container Plugin (NCP) integrates NSX and Kubernetes; its main component talks to NSX Manager and to the Kubernetes control plane. | typeInfo.nsx-manager, s-supervisor | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |

## nsx-edge

| Claim | Used in | Source URL |
|---|---|---|
| NSX Edge nodes are service appliances (bare metal or VM) that run network services that cannot be distributed to the hypervisors. | typeInfo.nsx-edge | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| An NSX Edge cluster is a group of Edge nodes with the same settings that provide high availability. | typeInfo.nsx-edge, sample map (Edge cluster group) | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| A VCF workload domain includes one NSX Edge cluster, added after the workload domain is created. | sample map | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/getting-started-with-vcf-5-2/cloud-foundation-architecture.html |
| SDDC Manager creates the NSX Edge cluster from Edge node virtual appliances; for each node you select the vSphere cluster that hosts it. | typeInfo.nsx-edge, sample map (Edge cluster runs-on WLD-01 cluster) | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/deploying-nsx-edge-clusters-admin/create-an-nsx-edge-cluster-admin.html |
| An Edge cluster has at least two Edge nodes. | sample map (2 Edge nodes) | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/deploying-nsx-edge-clusters-admin/create-an-nsx-edge-cluster-admin.html |
| A Supervisor with NSX needs an Edge cluster of two NSX Edge nodes of Large size. | typeInfo.nsx-edge | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/requirements-for-enabling-a-single-cluster-supervisor/requirements-for-cluster-supervisor-deployment-with-nsx.html |
| The service router (SR) of a gateway runs on the Edge cluster nodes. | typeInfo.nsx-edge, typeInfo.t0-gateway, typeInfo.t1-gateway | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| NSX Edge provides connectivity from external networks to Supervisor objects. | typeInfo.nsx-edge, s-north-south | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |

## vsan-datastore

| Claim | Used in | Source URL |
|---|---|---|
| vSAN is a distributed layer of software that runs natively as part of the ESXi hypervisor. | typeInfo.vsan-datastore | https://techdocs.broadcom.com/us/en/vmware-cis/vsan/vsan/8-0/planning-and-deployment/what-is-vsan/vsan-concepts.html |
| vSAN aggregates the hosts' local capacity devices into a single datastore shared by all hosts in the vSAN cluster. | typeInfo.vsan-datastore | https://techdocs.broadcom.com/us/en/vmware-cis/vsan/vsan/8-0/planning-and-deployment/what-is-vsan/vsan-concepts.html |
| The VCF management domain includes a vSAN datastore. | sample map (mgmt vSAN) | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/getting-started-with-vcf-5-2/cloud-foundation-architecture.html |
| Supervisor storage policies can use any shared datastore type, including vSAN. | typeInfo.vsan-datastore, s-storage | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-storage.html |
| Container volumes (ReadWriteOnce) are backed by First Class Disks, which can live on vSAN, VMFS, NFS or vVols datastores. | typeInfo.vsan-datastore, s-storage | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-storage/getting-started-with-cloud-native-storage-in-vsphere/cloud-native-storage-concepts-and-terminology-in-vsphere/vsphere-cloud-native-storage-components.html |

## vds

| Claim | Used in | Source URL |
|---|---|---|
| A vSphere Distributed Switch handles the networking configuration of many hosts at a time from a central place (vCenter Server). | typeInfo.vds | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-networking/basic-networking-with-vnetwork-distributed-switches.html |
| The VDS management plane is on vCenter Server; the data plane on each host is called the host proxy switch. | typeInfo.vds | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-networking/basic-networking-with-vnetwork-distributed-switches.html |
| Since NSX 3.0, NSX can run directly on a vSphere Distributed Switch (version 7 or later); this is the recommended way on ESXi hosts. | typeInfo.vds | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| With Supervisor on NSX, the segments for each namespace live on the VDS. | typeInfo.vds, typeInfo.segment, sample map (namespace network runs-on WLD-01 cluster) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |

## t0-gateway

| Claim | Used in | Source URL |
|---|---|---|
| A Tier-0 gateway provides north-south connectivity and connects to the physical routers; it can run BGP with them. | typeInfo.t0-gateway, s-north-south | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| Every gateway has a distributed router (DR) that runs on all transport nodes (hypervisors and Edges) and a service router (SR) that runs on Edge cluster nodes. The SR is created only when the gateway is tied to an Edge cluster. | typeInfo.t0-gateway, typeInfo.t1-gateway, sample map (T0 runs-on Edge cluster) | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| For Supervisor with NSX, a Tier-0 gateway on the NSX Edge cluster routes to the external network; its uplink uses BGP or static routing. | typeInfo.t0-gateway, s-north-south | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| When SDDC Manager deploys an Edge cluster for Workload Management (Supervisor), Tier-0 high availability must be Active-Active. Active-Active load-balances traffic across all Edge members (up to 8). Active-Standby sends all traffic through one elected member (2 Edges). | typeInfo.t0-gateway, sample map | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/deploying-nsx-edge-clusters-admin/create-an-nsx-edge-cluster-admin.html |
| With eBGP selected, VCF configures eBGP on the Tier-0 uplinks for dynamic route exchange with the physical peers. | typeInfo.t0-gateway, s-north-south (BGP link) | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/deploying-nsx-edge-clusters-admin/create-an-nsx-edge-cluster-admin.html |

## t1-gateway

| Claim | Used in | Source URL |
|---|---|---|
| A Tier-1 gateway connects to one Tier-0 gateway for northbound connectivity of the subnets attached to it. | typeInfo.t1-gateway | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| A Tier-1 gateway hosts stateful services such as NAT, load balancer or firewall only if an NSX Edge cluster is selected. Selecting one always creates a service router on the Edges. | typeInfo.t1-gateway, sample map (T1 runs-on Edge cluster) | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/administration-guide/tier-1-gateways/add-an-nsx-tier-1-gateway.html |
| The Tier-1's distributed router runs on every transport node, including the hypervisors. | typeInfo.t1-gateway | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| With Supervisor on NSX, NCP creates one shared Tier-1 gateway for the system namespaces and, by default, a Tier-1 gateway and load balancer for each vSphere Namespace. | typeInfo.t1-gateway, s-vks-provisioning, sample map (Supervisor system networking, per-namespace T1) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| The namespace Tier-1 gateway is connected to the Tier-0 gateway and a default segment. | typeInfo.t1-gateway, s-north-south | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| Workloads in the same namespace share a SNAT IP for north-south (egress) traffic; east-west traffic between namespaces is not SNATed. | typeInfo.t1-gateway (optional) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |

## segment

| Claim | Used in | Source URL |
|---|---|---|
| A segment (formerly "logical switch") provides virtual Layer 2 switching for VM interfaces and gateway interfaces, and spans many hypervisors. | typeInfo.segment | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| Overlay segments are built with Geneve encapsulation, so the VM network topology is separate from the physical network. | typeInfo.segment, s-east-west | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| Each vSphere Namespace has a separate network and set of networking resources. | typeInfo.segment, s-supervisor | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| For each VKS (TKG) cluster, segments are defined within the Tier-1 gateway of its namespace. | typeInfo.segment, s-vks-provisioning | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| Namespace networks are carved from configured namespace CIDRs; the default namespace subnet prefix is /28. | properties (namespace CIDR) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/requirements-for-enabling-a-single-cluster-supervisor/requirements-for-cluster-supervisor-deployment-with-nsx.html |

## dfw

| Claim | Used in | Source URL |
|---|---|---|
| The distributed firewall is deployed on each ESXi host and segments east-west traffic. | typeInfo.dfw, s-east-west | https://techdocs.broadcom.com/us/en/vmware-security-load-balancing/vdefend/vdefend-firewall/4-2/vdefend-distributed-firewall.html |
| A firewall is instantiated on each virtual NIC, so enforcement is as close to the source as possible. | typeInfo.dfw, s-east-west | https://techdocs.broadcom.com/us/en/vmware-security-load-balancing/vdefend/vdefend-firewall/4-2/vdefend-distributed-firewall.html |
| The DFW is provided by NSX kernel modules running in the ESXi hypervisor kernel. | typeInfo.dfw, s-east-west | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/host-transport-nodes/manual-installation-of-nsx-kernel-modules/manaully-install-nsx-kernel-modules-on-esxi-hypervisors.html |
| In vSphere 8.0 U3 with Supervisor, the NSX DFW license is a separate add-on. Without it, NCP can't add rules on NSX Manager, so new Supervisor security and network policies do not work. | typeInfo.dfw (optional caution) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/release-notes/vmware-vsphere-supervisor-80-release-notes.html |
| Kubernetes NetworkPolicy support on the Supervisor needs NSX networking. | typeInfo.dfw, s-east-west | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/release-notes/vmware-vsphere-supervisor-80-release-notes.html |
| An NSX-based Supervisor supports security policies on a namespace (security policy CRD) that protect traffic for vSphere Pods and VMs. "VMs" includes VKS (TKG) cluster node VMs. | typeInfo.dfw, s-east-west | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/configuring-and-managing-vsphere-namespaces/add-security-policies-to-an-nsx-vsphere-namespace.html |

## nsx-lb

| Claim | Used in | Source URL |
|---|---|---|
| The NSX load balancer distributes incoming requests across multiple servers to give applications high availability. | typeInfo.nsx-lb | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/administration-guide/load-balancer.html |
| The NSX load balancer is supported only on a Tier-1 gateway. | typeInfo.nsx-lb | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/administration-guide/load-balancer.html |
| A Tier-1 needs an Edge cluster to host a load balancer (stateful service), so the load balancer runs in the Tier-1 service router on the Edges. | typeInfo.nsx-lb, sample map | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/administration-guide/tier-1-gateways/add-an-nsx-tier-1-gateway.html |
| With Supervisor on NSX, NCP creates a load balancer for each namespace by default. The Edge cluster's load balancer also gives redundancy for the Supervisor Kubernetes API servers. | typeInfo.nsx-lb, s-supervisor | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| With the NSX load balancer, a VKS cluster's Kubernetes Service of type LoadBalancer maps to an NSX virtual server (source wording: "one virtual server per service type definition"). | typeInfo.nsx-lb, s-north-south | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-cluster-networking.html |
| A Supervisor with NSX can use either the NSX Edge load balancer or the Avi Load Balancer. | typeInfo.nsx-lb (Avi as alternative) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| For VKS (TKG) clusters, the documented LoadBalancer Service providers are the NSX-T load balancer, NSX Advanced Load Balancer (now VMware Avi Load Balancer) and HAProxy. This map uses the NSX load balancer; captions must not imply it is the only option. The page's name "NSX-T load balancer" (with the NSX-T to NSX rename sourced under `nsx-manager`) is the former name used in typeInfo.nsx-lb.formerly. | typeInfo.nsx-lb, typeInfo.nsx-lb.formerly, s-north-south (context) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-cluster-networking.html |
| "VMware Avi Load Balancer" was formerly called "VMware NSX Advanced Load Balancer". | typeInfo.nsx-lb.formerly (Avi naming; the old name may only appear in a formerly field) | https://knowledge.broadcom.com/external/article/312808/vmware-nsx-advanced-load-balancer-avi-re.html |
| Broadcom intends to change the entitlement of the built-in NSX load balancer in a future major NSX release; existing NSX 4.x entitlement remains. Broadcom recommends Avi for general-purpose and advanced load balancing. | typeInfo.nsx-lb (optional caution) | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/release-notes/vmware-nsx-420-release-notes.html |

## supervisor-cp

| Claim | Used in | Source URL |
|---|---|---|
| A Supervisor has three control plane VMs. | typeInfo.supervisor-cp, s-supervisor, sample map | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-architecture.html |
| vSphere DRS decides where the control plane VMs run on the Supervisor's ESXi hosts and migrates them when needed. | typeInfo.supervisor-cp, s-host-failure | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-architecture.html |
| The control plane VMs are system-managed; you cannot migrate them manually. On non-vSAN storage, the documented way to spread them over different datastores uses a Storage DRS VM anti-affinity rule. | typeInfo.supervisor-cp (optional) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/installing-and-configuring-vsphere-supervisor/troubleshooting-vsphere-with-kubernetes/storage-best-practicies-and-troubleshooting-in-vsphere-with-kubernetes/use-anti-affinity-rules.html |
| The Supervisor control plane needs a block of 5 consecutive static IPs on the management network. | properties (management CIDR) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/requirements-for-enabling-a-single-cluster-supervisor/requirements-for-cluster-supervisor-deployment-with-nsx.html |
| The Supervisor cluster must have vSphere HA and DRS enabled, with DRS in Fully Automated mode. | typeInfo.supervisor-cp, s-host-failure | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/requirements-for-enabling-a-single-cluster-supervisor/requirements-for-cluster-supervisor-deployment-with-nsx.html |
| Supervisor network inputs: ingress CIDR and egress CIDR (each /27 or larger, must not overlap), namespace network CIDRs, and a Kubernetes services CIDR (/16, unique per Supervisor). | properties (Supervisor CIDRs) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/requirements-for-enabling-a-single-cluster-supervisor/requirements-for-cluster-supervisor-deployment-with-nsx.html |
| The Supervisor's NCP runs in the Supervisor and talks to NSX Manager and the Kubernetes control plane. | typeInfo.supervisor-cp | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| Formerly: vSphere Supervisor was called "vSphere with Tanzu". | typeInfo.supervisor-cp.formerly | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0.html |
| Formerly: vCenter 8.0 U3 release notes call it "vSphere IaaS control plane, formerly known as vSphere with Tanzu". | typeInfo.supervisor-cp.formerly | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/release-notes/vcenter-server-update-and-patch-release-notes/vsphere-vcenter-server-803-release-notes.html |

## vks-cluster

| Claim | Used in | Source URL |
|---|---|---|
| vSphere Kubernetes Service (VKS) was formerly known as VMware Tanzu Kubernetes Grid (TKG) Service. | typeInfo.vks-cluster.formerly | https://blogs.vmware.com/cloud-foundation/2025/03/04/vmware-vsphere-kubernetes-service-3-3-is-now-ga/ |
| "vSphere Kubernetes release (VKr)" was previously referred to as "Tanzu Kubernetes release" (TKr). | typeInfo.vks-cluster.formerly | https://blogs.vmware.com/cloud-foundation/2025/03/04/vmware-vsphere-kubernetes-service-3-3-is-now-ga/ |
| The vSphere 8.0 Supervisor docs call the clusters that TKG Service provisions "TKG clusters" ("You use the TKG API to provision and manage TKG clusters"). | typeInfo.vks-cluster.formerly | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-architecture.html |
| VKS 3.3.3 was released 06 JUN 2025 and is generally available for use with vSphere 8 Update 3. | properties ("VKS 3.3.3") | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/release-notes/vmware-tanzu-kubernetes-grid-service-release-notes.html |
| From vCenter 8.0 Update 3 on, VKS can be upgraded on its own, without upgrading the Supervisor or vCenter. | typeInfo.vks-cluster (optional) | https://blogs.vmware.com/cloud-foundation/2025/04/08/using-vsphere-supervisor-heres-a-comprehensive-guide-to-upgrading-to-vcf-5-2-1/ |
| A VKS cluster is defined as a Cluster API `Cluster` (`cluster.x-k8s.io/v1beta1`) whose topology class is a versioned ClusterClass, for example `builtin-generic-v3.3.0` for VKS 3.3.0 and later. (Source: VCF 9.0 VKS docs tree; the page applies to "VKS 3.3.0 and later"; behaviour assumed unchanged in 8.0 U3.) | typeInfo.vks-cluster, s-vks-provisioning | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-service-administration-and-development/9-0/managing-vsphere-kuberenetes-service-clusters-and-workloads/provisioning-tkg-service-clusters/using-the-cluster-v1beta1-api/using-the-versioned-clusterclass/usingbuiltingenericv330.html |
| Cluster API gives declarative, Kubernetes-style APIs for creating, configuring and managing clusters. | typeInfo.vks-cluster, s-vks-provisioning | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-architecture.html |
| The VM Service manages the lifecycle of the control plane and worker node VMs that host a VKS (TKG) cluster. | typeInfo.vks-cluster, s-vks-provisioning | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-architecture.html |
| The TanzuKubernetesCluster (TKC) API was deprecated in TKG Service 3.2 (released 04 OCT 2024), together with TanzuKubernetesRelease. It "will be removed no sooner than June 2025". | typeInfo.vks-cluster.formerly, s-vks-provisioning (one mention) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/release-notes/vmware-tanzu-kubernetes-grid-service-release-notes.html |
| Broadcom's TKC retirement post confirms deprecation in TKG Service 3.2.0 (October 2024), says support for the TKC API will be fully removed in an upcoming release, and recommends moving to Cluster API. | s-vks-provisioning | https://blogs.vmware.com/cloud-foundation/2025/02/24/vsphere-kubernetes-service-retiring-tanzukubernetescluster-tkc-resources-and-transitioning-to-cluster-api/ |
| Antrea is the default CNI for new clusters; Calico is the other supported option. Antrea uses Open vSwitch. | typeInfo.vks-cluster, s-east-west | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-cluster-networking.html |
| Inside a VKS cluster, pod connectivity and Kubernetes network policy are provided by the CNI (Antrea or Calico). | typeInfo.vks-cluster, s-east-west | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-cluster-networking.html |
| A VKS cluster sends persistent volume requests to the Supervisor, which is integrated with VMware Cloud Native Storage (CNS), through a paravirtual CSI (pvCSI) plug-in. | typeInfo.vks-cluster, s-storage | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-architecture.html |
| The system creates default MachineHealthCheck objects for a VKS cluster (one for the control plane, one per machine deployment). MachineHealthCheck is a Cluster API resource that defines when unhealthy machines are remediated. | s-host-failure | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/using-tkg-service-with-vsphere-supervisor/operating-tkg-service-clusters/configure-machinehealthcheck-for-v1beta1-clusters.html |

## vsphere-pod

| Claim | Used in | Source URL |
|---|---|---|
| A vSphere Pod is a VM with a small footprint that runs one or more Linux containers. | typeInfo.vsphere-pod | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/deploying-workloads-to-vsphere-pods.html |
| Each vSphere Pod has its own Linux kernel, based on the Photon OS kernel. | typeInfo.vsphere-pod | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/deploying-workloads-to-vsphere-pods.html |
| vSphere Pods can be deployed only on Supervisors configured with the NSX networking stack. | typeInfo.vsphere-pod | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/deploying-workloads-to-vsphere-pods.html |
| Spherelet (a kubelet ported to ESXi) is what lets ESXi hosts run pods as part of the Supervisor's Kubernetes cluster. | typeInfo.vsphere-pod, s-supervisor | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-architecture.html |
| Namespace security policies (NSX-based Supervisor) protect traffic for vSphere Pods. | typeInfo.vsphere-pod, s-east-west | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/configuring-and-managing-vsphere-namespaces/add-security-policies-to-an-nsx-vsphere-namespace.html |
| vSphere Pods use ephemeral, persistent volume and container image virtual disks; storage policies set on the namespace decide where persistent volumes are placed. | typeInfo.vsphere-pod, s-storage | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/deploying-workloads-to-vsphere-pods.html |

## registry

| Claim | Used in | Source URL |
|---|---|---|
| Harbor can be installed and configured as a Supervisor Service. Harbor is an open source cloud-native registry for your workloads. | typeInfo.registry, sample map | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/installing-and-configuring-harbor-and-contour/installing-and-configureing-harbor-on-a-supervisor.html |
| Harbor needs Contour as its ingress controller, so Contour is installed as a Supervisor Service first. | typeInfo.registry | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/installing-and-configuring-harbor-and-contour/installing-and-configureing-harbor-on-a-supervisor.html |
| VKS (TKG) clusters on the same Supervisor as Harbor trust Harbor automatically. | typeInfo.registry | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/installing-and-configuring-harbor-and-contour/installing-and-configureing-harbor-on-a-supervisor.html |

## vm

| Claim | Used in | Source URL |
|---|---|---|
| The VM Service is the Supervisor module that deploys and runs stand-alone VMs. | typeInfo.vm (VM Service VM) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-architecture.html |
| A VM class is a template that defines CPU, memory and reservations for VMs. DevOps engineers can use only the VM classes associated with their namespace. | typeInfo.vm, s-supervisor | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/deploying-and-managing-virtual-machines-in-vsphere-iaas-control-plane/working-with-vm-classes-in-vsphere-with-tanzu.html |
| VKS cluster nodes are VMs (control plane and worker node VMs managed by the VM Service). | typeInfo.vm | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-architecture.html |
| A generic virtual machine runs a guest OS on a hypervisor host (non-VMware-specific wording). | typeInfo.vm (generic part) | n/a — generic, non-VMware |

## server-rack

| Claim | Used in | Source URL |
|---|---|---|
| A server rack holds physical servers, switches and power distribution in one enclosure. | typeInfo.server-rack | n/a — generic, non-VMware |

## switch

| Claim | Used in | Source URL |
|---|---|---|
| Top-of-rack (leaf) switches connect the servers in a rack; spine/core switches connect the racks to each other. | typeInfo.switch | n/a — generic, non-VMware |

## router

| Claim | Used in | Source URL |
|---|---|---|
| An edge router connects the data centre network to outside networks and exchanges routes with them (here it is the BGP peer of the NSX Tier-0). | typeInfo.router | n/a — generic, non-VMware (BGP peering with Tier-0 is sourced under t0-gateway) |

## firewall

| Claim | Used in | Source URL |
|---|---|---|
| A perimeter firewall filters traffic between the outside world and the data centre. | typeInfo.firewall | n/a — generic, non-VMware |

## ups

| Claim | Used in | Source URL |
|---|---|---|
| An uninterruptible power supply keeps equipment powered for a short time during a mains power failure. | typeInfo.ups | n/a — generic, non-VMware |

## users

| Claim | Used in | Source URL |
|---|---|---|
| Users are the people or client systems that reach the applications from outside the data centre. | typeInfo.users | n/a — generic, non-VMware |

## web-app

| Claim | Used in | Source URL |
|---|---|---|
| A web app serves the user-facing front end; here it runs as Kubernetes workloads in the VKS cluster team-a-prod. | typeInfo.web-app | n/a — generic, non-VMware |

## api-service

| Claim | Used in | Source URL |
|---|---|---|
| An API service provides back-end functions to the web app over HTTP; here it runs as Kubernetes workloads in the VKS cluster team-a-prod. | typeInfo.api-service | n/a — generic, non-VMware |

## s-tour

| Claim | Used in | Source URL |
|---|---|---|
| Physical: ESXi hosts are the servers that run all VMs (ESXi is the virtualization platform). | s-tour step "Physical" | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vcenter-installation-and-setup/introduction-to-vsphere-installation-and-setup.html |
| Physical network: the NSX Tier-0 connects to the physical routers (north-south). The overlay is Geneve-encapsulated, so VM networks are separate from the physical topology. | s-tour step "Physical network" | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| Virtual infrastructure: VCF groups ESXi hosts managed by a vCenter Server into workload domains. The management domain holds the management appliances (vCenter, NSX Manager, SDDC Manager) for all domains. | s-tour step "Virtual infrastructure" | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-design-5-2/vmware-cloud-foundation-concepts/vmware-cloud-foundation-architecture-models.html |
| NSX overlay: Tier-0 and Tier-1 gateways, segments and the distributed firewall give virtual networking and security. | s-tour step "NSX overlay" | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| Workload platform: vSphere Supervisor turns vSphere into a platform for running Kubernetes workloads natively on the hypervisor layer. | s-tour step "Workload platform" | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/vsphere-iaas-control-plane-concepts/what-is-vsphere-with-tanzu.html |
| Application: the apps run as Kubernetes workloads in VKS clusters, as vSphere Pods, or as VMs. | s-tour step "Application" | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/vsphere-iaas-control-plane-concepts/what-is-vsphere-with-tanzu.html |

## s-who-manages

| Claim | Used in | Source URL |
|---|---|---|
| SDDC Manager performs full lifecycle management (deployment, configuration, patching, upgrades) and deploys VI workload domains and NSX Edge clusters. | s-who-manages step 1 | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-design-5-2/vcf-sddc-manager-design.html |
| For a new VI workload domain, VCF deploys its vCenter Server in the management domain, and for the first VI workload domain, a three-node NSX Manager cluster in the management domain. | s-who-manages step 1/2 | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/working-with-workload-domains-admin/about-virtual-infrastructure-workload-domains-admin.html |
| ESXi hosts are not deployed by SDDC Manager: ESXi is installed first, then hosts are commissioned into the SDDC Manager inventory. | s-who-manages step 1 | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/host-management-admin/commission-hosts-admin.html |
| Each workload domain has a dedicated vCenter Server; all vCenter Server instances run in the management domain. | s-who-manages step 2 | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-design-5-2/vsphere-design-for-vmware-cloud-foundation/vcf-vcenter-server-design.html |
| Later VI workload domains can share an NSX Manager cluster or get a new one; they cannot use the management domain's. | s-who-manages step 2 | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/getting-started-with-vcf-5-2/cloud-foundation-architecture.html |
| vCenter Server is the central administrator for ESXi hosts. | s-who-manages step 3 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vcenter-installation-and-setup/introduction-to-vsphere-installation-and-setup.html |
| NSX Manager holds the management and central control plane; the local control plane runs on every transport node (hosts and Edges), so NSX Manager programs routing, segments and firewall on the hosts and Edges. | s-who-manages step 3 | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |

## s-supervisor

| Claim | Used in | Source URL |
|---|---|---|
| Activating Supervisor on a vSphere cluster creates a Kubernetes control plane inside the hypervisor layer. | s-supervisor step 1, step 3 ("not a separate cluster on top") | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-architecture.html |
| The Supervisor has three control plane VMs. | s-supervisor step 1 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-architecture.html |
| Spherelet, a kubelet ported natively to ESXi, runs on each host and makes the host part of the Kubernetes cluster. | s-supervisor step 1 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-architecture.html |
| A vSphere Namespace is a network-scoped tenancy on the Supervisor. It provides networking, role permissions, persistent storage, resource quota, and content library and VM class integration. | s-supervisor step 2 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/using-tkg-service-with-vsphere-supervisor/configuring-vsphere-namespaces-for-hosting-tkg-service-clusters/using-vsphere-namespaces-with-tkg-service-clusters.html |
| Assigning a storage policy to a vSphere Namespace creates matching Kubernetes storage classes in it. | s-supervisor step 2, s-storage | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/storage-for-tanzu-kubernetes-grid-clusters.html |
| DevOps engineers can use only the VM classes associated with their namespace. | s-supervisor step 2 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/deploying-and-managing-virtual-machines-in-vsphere-iaas-control-plane/working-with-vm-classes-in-vsphere-with-tanzu.html |

## s-vks-provisioning

| Claim | Used in | Source URL |
|---|---|---|
| A user applies a Cluster API `Cluster` (`cluster.x-k8s.io/v1beta1`) that references a versioned ClusterClass such as `builtin-generic-v3.3.0`. (Source: VCF 9.0 VKS docs tree; behaviour assumed unchanged in 8.0 U3.) | s-vks-provisioning step 1 | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-service-administration-and-development/9-0/managing-vsphere-kuberenetes-service-clusters-and-workloads/provisioning-tkg-service-clusters/using-the-cluster-v1beta1-api/using-the-versioned-clusterclass/usingbuiltingenericv330.html |
| The VM Service manages the lifecycle of the control plane and worker node VMs for the cluster. | s-vks-provisioning step 2 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-architecture.html |
| NCP creates a Tier-1 gateway and load balancer for each namespace by default; the cluster's segments are defined within the namespace's Tier-1. | s-vks-provisioning step 3 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| Storage policies assigned to the namespace become Kubernetes storage classes; the cluster's pvCSI passes volume requests to CNS through the Supervisor. | s-vks-provisioning step 4 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/storage-for-tanzu-kubernetes-grid-clusters.html |
| The TanzuKubernetesCluster (TKC) API was deprecated in TKG Service 3.2 (04 OCT 2024). | s-vks-provisioning step 5 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/release-notes/vmware-tanzu-kubernetes-grid-service-release-notes.html |

## s-north-south

| Claim | Used in | Source URL |
|---|---|---|
| The Tier-0 gateway gives north-south connectivity and peers with physical routers using BGP. | s-north-south (edge router → T0) | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| The Tier-0's service router runs on the Edge nodes. | s-north-south (T0 on the Edges) | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| NSX Edge connects external networks to Supervisor objects; the Tier-0 on the Edge cluster routes to the external network. | s-north-south | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| The namespace Tier-1 connects to the Tier-0 and to the namespace segments; NCP creates a load balancer per namespace. | s-north-south (T0 → T1/LB → segment) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-networking.html |
| With the NSX load balancer, a LoadBalancer Service in the VKS cluster maps to an NSX virtual server (source: "one virtual server per service type definition"). The NSX load balancer is one of several LB providers, not the only path. | s-north-south (LB → node VM → pod) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-cluster-networking.html |
| Inside the VKS cluster, the CNI (Antrea by default) provides pod connectivity, so traffic reaches the pod via the node VM. | s-north-south (node VM → pod) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-cluster-networking.html |

## s-east-west

| Claim | Used in | Source URL |
|---|---|---|
| Overlay traffic between hosts is carried with Geneve encapsulation. | s-east-west step 1 | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/overview-of-nsx/key-concepts-nsxt.html |
| The DFW is deployed on each ESXi host and a firewall is instantiated on each virtual NIC; it is not a central appliance. | s-east-west step 1 | https://techdocs.broadcom.com/us/en/vmware-security-load-balancing/vdefend/vdefend-firewall/4-2/vdefend-distributed-firewall.html |
| The DFW runs in the NSX kernel modules inside the ESXi hypervisor kernel. | s-east-west step 1 | https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/installation-guide/host-transport-nodes/manual-installation-of-nsx-kernel-modules/manaully-install-nsx-kernel-modules-on-esxi-hypervisors.html |
| With an NSX-based Supervisor, namespace security policies protect traffic for vSphere Pods and for VMs, including VKS node VMs. | s-east-west step 2 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/configuring-and-managing-vsphere-namespaces/add-security-policies-to-an-nsx-vsphere-namespace.html |
| Supervisor network and security policies are realised by NCP adding rules on NSX Manager. In vSphere 8.0 U3 the NSX DFW license is a separate add-on; without it NCP can't add these rules, so new policies do not work. | s-east-west step 2 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/release-notes/vmware-vsphere-supervisor-80-release-notes.html |
| VKS clusters use Antrea as the default CNI; Kubernetes network policy inside the cluster is enforced by the CNI (Antrea). | s-east-west step 3 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/tanzu-kubernetes-grid-cluster-networking.html |

## s-storage

| Claim | Used in | Source URL |
|---|---|---|
| A PVC created in a VKS cluster is handled by pvCSI, which resides in the VKS cluster. | s-storage (VKS step 1-2) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/storage-for-tanzu-kubernetes-grid-clusters.html |
| This creates a matching PVC on the Supervisor and triggers CNS-CSI, which propagates the requests to CNS in vCenter Server. | s-storage (VKS step 3-4) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/storage-for-tanzu-kubernetes-grid-clusters.html |
| The CNS control plane resides in vCenter Server. ReadWriteOnce container volumes are backed by First Class Disks (named virtual disks not tied to a VM) on vSAN, VMFS, NFS or vVols. | s-storage (VKS step 5, vSphere Pod) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-storage/getting-started-with-cloud-native-storage-in-vsphere/cloud-native-storage-concepts-and-terminology-in-vsphere/vsphere-cloud-native-storage-components.html |
| Storage Policy Based Management (a vCenter service) provisions persistent volumes that meet the storage requirements. | s-storage (placement by policy) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-storage/getting-started-with-cloud-native-storage-in-vsphere/cloud-native-storage-concepts-and-terminology-in-vsphere/vsphere-cloud-native-storage-components.html |
| A PVC in a Supervisor namespace references a storage class. The Supervisor creates a persistent volume and a matching virtual disk on a datastore that meets the storage policy behind that class. This applies to vSphere Pods, VKS clusters and VMs. | s-storage (vSphere Pod path; placement) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/using-persistent-storage-with-workloads-in-vsphere-iaas-control-plane.html |

## s-host-failure

| Claim | Used in | Source URL |
|---|---|---|
| vSphere HA restarts the virtual machines from a failed host on other hosts in the cluster. | s-host-failure step 1 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/how-vsphere-ha-works.html |
| After HA restarts VMs, some hosts may be heavily loaded; vSphere HA can use DRS to rebalance the cluster. | s-host-failure step 2 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/vsphere-ha-interoperability/using-vmware-ha-and-drs-together.html |
| The Supervisor cluster has HA and DRS enabled (DRS Fully Automated). | s-host-failure | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/requirements-for-enabling-a-single-cluster-supervisor/requirements-for-cluster-supervisor-deployment-with-nsx.html |
| vSphere DRS decides where the Supervisor control plane VMs run and migrates them when needed. | s-host-failure step 3 | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-architecture.html |
| VKS clusters get default MachineHealthCheck objects, which define when unhealthy machines (node VMs) are remediated. | s-host-failure (Kubernetes side) | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/using-tkg-service-with-vsphere-supervisor/operating-tkg-service-clusters/configure-machinehealthcheck-for-v1beta1-clusters.html |
| Upstream Kubernetes (not VMware-specific): when a node is not ready or unreachable it gets a NoExecute taint; Kubernetes automatically adds tolerations with tolerationSeconds=300, so pods stay bound to the node for 5 minutes and are then evicted (DaemonSet pods excepted). Added by Task 9. | s-host-failure step 4 | https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/ |
| Upstream Kubernetes (not VMware-specific): a ReplicaSet maintains a stable set of replica Pods, creating Pods as needed to reach the desired number; usually a Deployment manages ReplicaSets. Added by Task 9. | s-host-failure step 4 | https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/ |

Resolved: "Kubernetes reschedules pods after a host failure" used to be listed under Unverified because no Broadcom/VMware page states it. It is upstream Kubernetes behaviour, now sourced by the two kubernetes.io rows above, and step 4 words it as eviction plus ReplicaSets creating new pods, not as a VMware feature.

## Unverified

These claims were researched but have no official Broadcom/VMware source. Keep them out of the map, or reword the caption to the sourced claims above.

| Claim | Status / note |
|---|---|
| "Supervisor control plane VMs are spread across hosts by anti-affinity rules" (design storyline 8). | No current (vSphere 8.0 / VCF 5.2) Broadcom page found saying the Supervisor creates host anti-affinity rules for its control plane VMs. The 8.0 docs only say DRS decides placement, and describe a Storage DRS anti-affinity procedure for non-vSAN datastores. An archived VMware Validated Design 6.0 page (now redirects) said such rules were added by hand. Use "DRS places and moves them" instead. |
| "vSphere Pods are enforced per pod by the DFW." | Sourced parts: a vSphere Pod is a small VM, the DFW is instantiated per vNIC, and namespace security policies protect vSphere Pod traffic. No page says outright "DFW enforces per pod". Safe wording: "Namespace network and security policies, applied by NSX, protect each vSphere Pod's traffic." |
| "The DFW sees node-VM traffic, not individual pods" in a VKS cluster. | Not stated in an official source. Also NSX 4.2 can push DFW-style security policies into registered Antrea clusters, enforced by the Antrea Controller (https://techdocs.broadcom.com/us/en/vmware-cis/nsx/vmware-nsx/4-2/administration-guide/integration-of-kubernetes-clusters-with-antrea-cni/distributed-firewall-policies-for-securing-traffic-within-an-antrea-kubernetes-cluster.html), so the blanket statement is risky. Safe wording: "Inside a VKS cluster, pod-to-pod traffic and NetworkPolicy are handled by Antrea; namespace security policies apply to the node VMs." |
| VKS 3.3.3 is supported on every VCF 5.2.x / vCenter 8.0 U3 patch level. | Release notes say VKS 3.3.3 is "generally available for use with vSphere 8 Update 3". A VCF blog shows VKS 3.3.2 being used on vCenter 8.0 U3e/U3g, and VKS 3.4 needing 8.0 U3b or later. Exact minimum vCenter patch and Supervisor version for 3.3.3 were not confirmed (the Broadcom Interoperability Matrix is interactive and could not be read). Treat "VKS 3.3.3 on VCF 5.2 / vCenter 8.0 U3" as supported in general; the platform team should confirm their exact patch level. |
| "VKr was renamed in VKS 3.3." | The VKS 3.3 GA blog says "VKr 1.32, previously referred to as Tanzu Kubernetes release", but the TKG Service 3.2 release notes already say "Support for VKr 1.31". Saying "renamed" without a version is safe. |

## Corrections to the design

| Design claim | What the source says | Source URL |
|---|---|---|
| Storyline 2: "SDDC Manager deploys and lifecycle-manages the vCenters, NSX Managers **and hosts**." | SDDC Manager does not deploy ESXi hosts. ESXi is installed first, then hosts are commissioned into SDDC Manager. SDDC Manager deploys vCenters, NSX Managers and Edge clusters, and does lifecycle (patching, upgrades) for the stack. Suggested wording: "SDDC Manager deploys the vCenters and NSX Managers, and patches and upgrades them and the hosts." | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/host-management-admin/commission-hosts-admin.html ; https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/vcf-design-5-2/vcf-sddc-manager-design.html |
| Storyline 8: "Supervisor control plane VMs are spread across hosts by anti-affinity rules." | Not supported by current docs. vSphere 8.0 Supervisor docs say vSphere DRS decides placement and migrates them. Suggested: "DRS places the three control plane VMs and moves them when needed." | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/supervisor-architecture-and-components/supervisor-architecture.html |
| Sample map: "One Tier-0 (active/standby **or** active/active on the Edge cluster)". | When SDDC Manager deploys an Edge cluster for Workload Management, "Workload Management requires Active-Active". The map should show an active-active Tier-0. | https://techdocs.broadcom.com/us/en/vmware-cis/vcf/vcf-5-2-and-earlier/5-2/map-for-administering-vcf-5-2/deploying-nsx-edge-clusters-admin/create-an-nsx-edge-cluster-admin.html |
| Storyline 6: "vSphere Pods (team-b) are enforced per pod by the DFW" and "the DFW sees node-VM traffic, not individual pods". | Not stated outright in official docs (see Unverified). The sourced version: namespace security policies (realised by NCP as NSX rules) protect vSphere Pods and VMs, including VKS node VMs; Antrea enforces NetworkPolicy inside VKS clusters. | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-services-and-workloads-8-0/configuring-and-managing-vsphere-namespaces/add-security-policies-to-an-nsx-vsphere-namespace.html |
| Naming table: "VKr ... Renamed in VKS 3.3". | VKr already appears in the TKG Service 3.2 release notes ("Support for VKr 1.31"). Drop the version from the rename note. | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/release-notes/vmware-tanzu-kubernetes-grid-service-release-notes.html |
| Storyline 7: "a matching PVC **in the Supervisor namespace**". | The VKS storage page says the matching PVC is created "on Supervisor" (it doesn't name the namespace). Safer: "a matching PVC on the Supervisor". | https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere-supervisor/8-0/vsphere-supervisor-concepts-and-planning/tanzu-kubernetes-grid-architecture-and-components/storage-for-tanzu-kubernetes-grid-clusters.html |
| Confirmed (no change): TKC deprecated in TKG Service 3.2 (Oct 2024); WLD vCenter and NSX Manager run in the management domain; 3 Supervisor control plane VMs; Spherelet on each host; NCP creates a T1 and LB per namespace; SR on Edges and DR on all transport nodes; Antrea default CNI; pvCSI → CNS-CSI → CNS → FCD chain; HA restart plus DRS rebalance. | — | see sections above |
