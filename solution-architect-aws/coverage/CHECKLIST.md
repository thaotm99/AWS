# Đối chiếu keyword đề thi với nội dung bài học

Rà toàn bộ 390 câu của 6 đề luyện SAA-C03: mỗi câu được tách thành các keyword (dịch vụ, tính năng,
giới hạn, khái niệm) mà câu hỏi, đáp án đúng và lời giải cho các phương án sai dựa vào; mỗi keyword được
đối chiếu với bài học tương ứng (file MDX và các mô phỏng của bài).

- ✅ **Đã có**: bài học giải thích đủ để trả lời câu hỏi.
- 🟡 **Một phần**: có nhắc tới nhưng chưa đủ để trả lời.
- ❌ **Thiếu**: bài học chưa có.
- Một keyword xuất hiện ở nhiều câu được gộp thành một dòng; trạng thái lấy mức **thấp nhất** mà các câu ghi nhận
  (đánh dấu ⚠ khi các câu đánh giá khác nhau).

Dữ liệu gốc: `coverage/test-1.json` … `test-6.json`. Tạo lại file này: `node solution-architect-aws/coverage/build-checklist.mjs`.

## Tổng quan

Có **960 keyword** khác nhau: ✅ 902 (94%) · 🟡 27 (3%) · ❌ 31 (3%).

### Theo bài học

| Bài học | Keyword | ✅ Đã có | 🟡 Một phần | ❌ Thiếu | Tỷ lệ đã có |
|---|---:|---:|---:|---:|---:|
| [global-infra](#global-infra) | 22 | 20 | 2 | 0 | 91% |
| [vpc](#vpc) | 107 | 107 | 0 | 0 | 100% |
| [route53](#route53) | 28 | 24 | 2 | 2 | 86% |
| [cloudfront](#cloudfront) | 31 | 22 | 5 | 4 | 71% |
| [iam](#iam) | 49 | 49 | 0 | 0 | 100% |
| [kms](#kms) | 21 | 21 | 0 | 0 | 100% |
| [security](#security) | 27 | 25 | 1 | 1 | 93% |
| [cognito](#cognito) | 15 | 13 | 1 | 1 | 87% |
| [ec2](#ec2) | 57 | 57 | 0 | 0 | 100% |
| [elb](#elb) | 42 | 42 | 0 | 0 | 100% |
| [asg](#asg) | 44 | 44 | 0 | 0 | 100% |
| [containers](#containers) | 22 | 22 | 0 | 0 | 100% |
| [lambda](#lambda) | 37 | 37 | 0 | 0 | 100% |
| [s3](#s3) | 70 | 70 | 0 | 0 | 100% |
| [storage](#storage) | 70 | 70 | 0 | 0 | 100% |
| [storage-migration](#storage-migration) | 34 | 31 | 1 | 2 | 91% |
| [rds](#rds) | 58 | 58 | 0 | 0 | 100% |
| [dynamodb](#dynamodb) | 23 | 22 | 0 | 1 | 96% |
| [analytics](#analytics) | 47 | 37 | 5 | 5 | 79% |
| [messaging](#messaging) | 50 | 47 | 3 | 0 | 94% |
| [kinesis](#kinesis) | 26 | 25 | 1 | 0 | 96% |
| [monitoring](#monitoring) | 33 | 24 | 2 | 7 | 73% |
| [iac](#iac) | 9 | 7 | 0 | 2 | 78% |
| [backup-dr](#backup-dr) | 12 | 10 | 1 | 1 | 83% |
| [others](#others) | 26 | 18 | 3 | 5 | 69% |

### Theo đề (số lượt keyword, chưa gộp)

| Đề | ✅ Đã có | 🟡 Một phần | ❌ Thiếu |
|---|---:|---:|---:|
| Đề 1 | 215 | 4 | 5 |
| Đề 2 | 189 | 2 | 7 |
| Đề 3 | 212 | 5 | 5 |
| Đề 4 | 226 | 5 | 5 |
| Đề 5 | 205 | 10 | 6 |
| Đề 6 | 205 | 1 | 4 |

## global-infra

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | AWS Local Zones | 🟡 Một phần | 1 | exam1_q27 | monitoring.mdx#s3 |
| [ ] | Global Accelerator endpoint weights (blue/green traffic shift) | 🟡 Một phần | 1 | exam2_q22 | cloudfront.mdx#challenge / SortGame (card only) |
| [ ] | AWS Global Accelerator | ✅ Đã có | 7 | exam1_q18, exam2_q32, exam3_q8, exam4_q18, exam5_q4, exam6_q5, exam6_q47 | global-infra.mdx#s5<br>global-infra.mdx#s5 / GlobalAcceleratorSim |
| [ ] | AMI copy across Regions (creates snapshot) | ✅ Đã có | 1 | exam1_q41 | global-infra.mdx#s1 / AmiCopySim / challenge |
| [ ] | AMI Region scope | ✅ Đã có | 1 | exam4_q5 | global-infra.mdx#s1; backup-dr.mdx#s1 |
| [ ] | Availability Zone ID | ✅ Đã có | 1 | exam3_q22 | global-infra.mdx#confuse / GlobalMythsSim |
| [ ] | AWS Global Accelerator (HTTPS listener, endpoint groups) | ✅ Đã có | 1 | exam5_q30 | global-infra.mdx#s5 / GlobalAcceleratorSim |
| [ ] | AWS Global Accelerator (multi-Region failover) | ✅ Đã có | 1 | exam5_q55 | global-infra.mdx#s5 / GlobalAcceleratorSim |
| [ ] | AWS Global Accelerator (no S3 endpoint) | ✅ Đã có | 1 | exam6_q58 | global-infra.mdx#s5 / EdgeChoiceSim |
| [ ] | AWS Global Accelerator (standard accelerator) | ✅ Đã có | 1 | exam2_q7 | global-infra.mdx#s5 / GlobalAcceleratorSim, EdgeChoiceSim |
| [ ] | AWS Global Accelerator (UDP, fast regional failover) | ✅ Đã có | 1 | exam1_q59 | global-infra.mdx#s5 / EdgeChoiceSim |
| [ ] | AWS Global Accelerator static anycast IP | ✅ Đã có | 1 | exam4_q58 | global-infra.mdx#s5 / GlobalAcceleratorSim |
| [ ] | AWS Global Accelerator static anycast IP addresses | ✅ Đã có | 1 | exam3_q45 | global-infra.mdx#s5 / GlobalAcceleratorSim |
| [ ] | Data transfer in from internet is free | ✅ Đã có | 1 | exam1_q40 | s3.mdx#s5 / UploadSim |
| [ ] | Data transfer out (DTO) pricing | ✅ Đã có | 1 | exam5_q2 | global-infra.mdx#s6 / CostPatterns |
| [ ] | EBS snapshot (Regional resource) | ✅ Đã có | 1 | exam1_q41 | global-infra.mdx#s1 / AmiCopySim |
| [ ] | EFS access via inter-Region VPC peering | ✅ Đã có | 1 | exam1_q42 | global-infra.mdx#confuse / ScopeExplorer / GlobalMythsSim |
| [ ] | Global Accelerator (no caching, not for S3 uploads) | ✅ Đã có | 1 | exam3_q37 | global-infra.mdx#s5 / EdgeChoiceSim |
| [ ] | Global Accelerator endpoint groups with ALB endpoints | ✅ Đã có | 1 | exam3_q45 | global-infra.mdx#s5 |
| [ ] | Global Accelerator for UDP and non-HTTP traffic | ✅ Đã có | 1 | exam3_q8 | global-infra.mdx#s5 / EdgeChoiceSim |
| [ ] | Global Accelerator NLB endpoint | ✅ Đã có | 1 | exam2_q7 | global-infra.mdx#s5; cloudfront.mdx#s4 |
| [ ] | Global Accelerator vs CloudFront | ✅ Đã có | 1 | exam1_q59 | global-infra.mdx#s5 / cloudfront.mdx#s4 |

## vpc

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | AWS Direct Connect | ✅ Đã có | 9 | exam1_q18, exam1_q27, exam2_q59, exam3_q31, exam4_q14, exam4_q45, exam4_q48, exam5_q2, exam5_q4 | vpc.mdx#s6<br>vpc.mdx#s6 / HybridLinkSim |
| [ ] | AWS Site-to-Site VPN | ✅ Đã có | 8 | exam1_q18, exam1_q37, exam3_q7, exam3_q16, exam4_q36, exam5_q9, exam5_q41, exam6_q25 | vpc.mdx#s6<br>vpc.mdx#s6 / HybridLinkSim |
| [ ] | AWS Transit Gateway | ✅ Đã có | 8 | exam1_q37, exam1_q39, exam2_q21, exam2_q36, exam3_q16, exam4_q28, exam5_q14, exam6_q12 | vpc.mdx#s5<br>vpc.mdx#s5 / VpcConnectSim |
| [ ] | VPC peering | ✅ Đã có | 6 | exam1_q9, exam2_q36, exam3_q17, exam4_q45, exam5_q9, exam6_q34 | vpc.mdx#s5<br>vpc.mdx#s5 / VpcConnectSim |
| [ ] | NAT gateway | ✅ Đã có | 5 | exam1_q39, exam3_q44, exam4_q45, exam5_q24, exam6_q64 | vpc.mdx#s3<br>vpc.mdx#s3 / NatHaSim |
| [ ] | AWS PrivateLink | ✅ Đã có | 3 | exam2_q36, exam6_q12, exam6_q59 | vpc.mdx#s4 / RequirementPicker<br>vpc.mdx#s4 / EndpointSim |
| [ ] | Direct Connect gateway | ✅ Đã có | 3 | exam3_q16, exam4_q7, exam6_q12 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Direct Connect private VIF | ✅ Đã có | 3 | exam2_q11, exam3_q16, exam4_q7 | vpc.mdx#s6 / HybridLinkSim<br>vpc.mdx#hub / HubSim; vpc.mdx#s6 / HybridLinkSim |
| [ ] | Egress-only internet gateway (IPv6 only) | ✅ Đã có | 3 | exam3_q44, exam3_q47, exam3_q62 | vpc.mdx#confuse / VpcMythsSim<br>vpc.mdx#confuse / VpcMythsSim; global-infra.mdx#confuse |
| [ ] | Internet gateway | ✅ Đã có | 3 | exam3_q7, exam4_q45, exam5_q14 | vpc.mdx#s1 / PacketPath<br>vpc.mdx#s1 |
| [ ] | VPC gateway endpoint for S3 | ✅ Đã có | 3 | exam3_q47, exam5_q24, exam6_q50 | vpc.mdx#s4 / EndpointSim |
| [ ] | AWS VPN CloudHub | ✅ Đã có | 2 | exam4_q7, exam6_q34 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Direct Connect not encrypted by default | ✅ Đã có | 2 | exam5_q10, exam5_q41 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Network ACL | ✅ Đã có | 2 | exam4_q17, exam4_q31 | vpc.mdx#s1 / PacketPath |
| [ ] | Network ACL (stateless) | ✅ Đã có | 2 | exam3_q25, exam6_q8 | vpc.mdx#s1 / PacketPath<br>vpc.mdx#s1 / PacketPath; vpc.mdx#challenge |
| [ ] | Route table route to internet gateway | ✅ Đã có | 2 | exam4_q38, exam5_q63 | vpc.mdx#s1 / PacketPath |
| [ ] | Security group | ✅ Đã có | 2 | exam4_q31, exam6_q4 | vpc.mdx#s2 / SgChain<br>vpc.mdx#s1 / PacketPath; vpc.mdx#s2 / SgChain |
| [ ] | Security group (stateful) | ✅ Đã có | 2 | exam3_q25, exam6_q8 | vpc.mdx#s1 / PacketPath<br>vpc.mdx#s1 / PacketPath; vpc.mdx#challenge |
| [ ] | Transit VPC | ✅ Đã có | 2 | exam2_q21, exam4_q28 | vpc.mdx#s5 / VpcConnectSim; vpc.mdx#compare / QuickCompare |
| [ ] | Virtual private gateway (VGW) | ✅ Đã có | 2 | exam4_q7, exam6_q12 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | VPC endpoint | ✅ Đã có | 2 | exam5_q14, exam6_q34 | vpc.mdx#s4 / EndpointSim |
| [ ] | VPC peering (non-transitive) | ✅ Đã có | 2 | exam5_q14, exam6_q12 | vpc.mdx#s5 / VpcConnectSim |
| [ ] | AWS Client VPN | ✅ Đã có | 1 | exam5_q10 | vpc.mdx#compare / QuickCompare |
| [ ] | AWS Direct Connect (lead time) | ✅ Đã có | 1 | exam5_q5 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | AWS Direct Connect (not for end users) | ✅ Đã có | 1 | exam5_q55 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | AWS Direct Connect (setup lead time) | ✅ Đã có | 1 | exam6_q25 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | AWS Direct Connect plus VPN (IPsec over DX) | ✅ Đã có | 1 | exam1_q37 | vpc.mdx#s6 |
| [ ] | AWS PrivateLink (endpoint service behind NLB) | ✅ Đã có | 1 | exam1_q39 | vpc.mdx#s4 |
| [ ] | AWS PrivateLink (interface endpoint to a provider service) | ✅ Đã có | 1 | exam5_q9 | vpc.mdx#s4 / EndpointSim |
| [ ] | AWS PrivateLink (TCP only) | ✅ Đã có | 1 | exam5_q4 | vpc.mdx#compare / QuickCompare (current docs: TCP or UDP; ruled out because it serves VPC-endpoint consumers, not internet users) |
| [ ] | AWS PrivateLink (VPC endpoint service) | ✅ Đã có | 1 | exam3_q16 | vpc.mdx#s4 / RequirementPicker |
| [ ] | AWS Site-to-Site VPN (bandwidth) | ✅ Đã có | 1 | exam5_q5 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | AWS Site-to-Site VPN (IPsec) | ✅ Đã có | 1 | exam5_q10 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Bastion host | ✅ Đã có | 1 | exam5_q10 | vpc.mdx#compare / QuickCompare |
| [ ] | Centralized VPC endpoints | ✅ Đã có | 1 | exam2_q21 | vpc.mdx#hub / HubSim; vpc.mdx#s5 / RequirementPicker |
| [ ] | CIDR notation | ✅ Đã có | 1 | exam4_q8 | vpc.mdx#addr / CidrSim |
| [ ] | Connection timeout vs authentication error | ✅ Đã có | 1 | exam5_q29 | vpc.mdx#s2 / SgChain |
| [ ] | Direct Connect gateway with Transit Gateway | ✅ Đã có | 1 | exam6_q45 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Direct Connect private virtual interface (private VIF) | ✅ Đã có | 1 | exam6_q45 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Direct Connect public VIF | ✅ Đã có | 1 | exam2_q11 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Direct Connect public virtual interface (public VIF) | ✅ Đã có | 1 | exam6_q45 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Direct Connect transit VIF | ✅ Đã có | 1 | exam3_q16 | vpc.mdx#hub / HubSim |
| [ ] | EC2 instance tenancy (VPC tenancy vs launch template) | ✅ Đã có | 1 | exam3_q21 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | EC2 source/destination check | ✅ Đã có | 1 | exam4_q38 | vpc.mdx#confuse / VpcMythsSim; vpc.mdx#compare / QuickCompare |
| [ ] | Egress-only internet gateway | ✅ Đã có | 1 | exam4_q48 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | Elastic IP for NAT gateway | ✅ Đã có | 1 | exam6_q13 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | Elastic network interface (ENI) | ✅ Đã có | 1 | exam6_q36 | vpc.mdx#compare / QuickCompare |
| [ ] | Ephemeral ports (1024-65535) in NACL outbound | ✅ Đã có | 1 | exam6_q8 | vpc.mdx#s1 / PacketPath; vpc.mdx#challenge |
| [ ] | Inter-Region VPC peering (non-transitive) | ✅ Đã có | 1 | exam4_q7 | vpc.mdx#s5 / VpcConnectSim |
| [ ] | Interface VPC endpoint for Amazon EFS over Direct Connect | ✅ Đã có | 1 | exam2_q11 | vpc.mdx#s4 / RequirementPicker |
| [ ] | Internet gateway NAT for public IPv4 address | ✅ Đã có | 1 | exam3_q9 | vpc.mdx#s1 |
| [ ] | NAT gateway (one per AZ, in public subnet) | ✅ Đã có | 1 | exam6_q13 | vpc.mdx#s3 / NatHaSim |
| [ ] | NAT gateway data processing charge | ✅ Đã có | 1 | exam3_q47 | vpc.mdx#s4 / EndpointSim |
| [ ] | NAT gateway per AZ in public subnet | ✅ Đã có | 1 | exam3_q62 | vpc.mdx#s3 / NatHaSim |
| [ ] | NAT gateway vs NAT instance | ✅ Đã có | 1 | exam3_q12 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | NAT instance | ✅ Đã có | 1 | exam3_q9 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | NAT instance (self-managed) | ✅ Đã có | 1 | exam3_q44 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | NAT instance as bastion host | ✅ Đã có | 1 | exam3_q12 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | NAT instance port forwarding | ✅ Đã có | 1 | exam3_q12 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | Network ACL (no geo blocking) | ✅ Đã có | 1 | exam5_q45 | vpc.mdx#compare / QuickCompare |
| [ ] | Network ACL (subnet level) | ✅ Đã có | 1 | exam1_q12 | vpc.mdx#s1 / challenge |
| [ ] | Network ACL (subnet-level, deny rules) | ✅ Đã có | 1 | exam2_q30 | vpc.mdx#s1 / PacketPath; vpc.mdx#challenge |
| [ ] | Network ACL (subnet-level, not on ALB) | ✅ Đã có | 1 | exam6_q60 | vpc.mdx#s1; vpc.mdx#challenge |
| [ ] | Network ACL ephemeral ports (1024-65535) | ✅ Đã có | 1 | exam3_q25 | vpc.mdx#s1 / PacketPath |
| [ ] | Network ACL inbound and outbound rules (stateless) | ✅ Đã có | 1 | exam5_q63 | vpc.mdx#s1 / PacketPath |
| [ ] | Public subnet (route to internet gateway) | ✅ Đã có | 1 | exam3_q9 | vpc.mdx#s1 / PacketPath |
| [ ] | Route 53 private hosted zone (enableDnsHostnames, enableDnsSupport) | ✅ Đã có | 1 | exam2_q20 | vpc.mdx#confuse / VpcMythsSim; route53.mdx#s4 |
| [ ] | Route table prefix-list route to gateway endpoint | ✅ Đã có | 1 | exam5_q24 | vpc.mdx#s4 / EndpointSim |
| [ ] | Security group (no deny rules) | ✅ Đã có | 1 | exam2_q30 | vpc.mdx#challenge / SortGame |
| [ ] | Security group (no geo filtering) | ✅ Đã có | 1 | exam1_q6 | vpc.mdx#s1 |
| [ ] | Security group (stateful, allow only) | ✅ Đã có | 1 | exam4_q17 | vpc.mdx#s1; vpc.mdx#challenge |
| [ ] | Security group (stateful, allow-only) | ✅ Đã có | 1 | exam2_q28 | vpc.mdx#s1 / PacketPath; vpc.mdx#challenge |
| [ ] | Security group and network ACL | ✅ Đã có | 1 | exam5_q10 | vpc.mdx#s1 / PacketPath |
| [ ] | Security group chain ALB to EC2 to RDS (ports 443/80/5432) | ✅ Đã có | 1 | exam2_q55 | vpc.mdx#s2 / SgChain |
| [ ] | Security group ICMP rule (ping) | ✅ Đã có | 1 | exam4_q38 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | Security group inbound rule | ✅ Đã có | 1 | exam4_q17 | vpc.mdx#s2 / SgChain |
| [ ] | Security group on NAT instance (not NAT gateway) | ✅ Đã có | 1 | exam3_q12 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | Security group referencing | ✅ Đã có | 1 | exam4_q39 | vpc.mdx#s2 / SgChain |
| [ ] | Security group referencing (ALB to EC2) | ✅ Đã có | 1 | exam4_q52 | vpc.mdx#s2 / SgChain |
| [ ] | Security group referencing another security group (DB inbound rule) | ✅ Đã có | 1 | exam5_q29 | vpc.mdx#s2 / SgChain |
| [ ] | Security group referencing security group | ✅ Đã có | 1 | exam2_q28 | vpc.mdx#s2 / SgChain |
| [ ] | Security group rule source (CIDR, IP, security group; not internet gateway) | ✅ Đã có | 1 | exam3_q65 | vpc.mdx#confuse / VpcMythsSim |
| [ ] | Shared services VPC | ✅ Đã có | 1 | exam2_q21 | vpc.mdx#s5 / RequirementPicker |
| [ ] | Site-to-Site VPN as Direct Connect backup | ✅ Đã có | 1 | exam4_q48 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Site-to-Site VPN customer gateway | ✅ Đã có | 1 | exam3_q18 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Site-to-Site VPN tunnel throughput (1.25 Gbps) | ✅ Đã có | 1 | exam4_q18 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Site-to-Site VPN virtual private gateway (VGW) | ✅ Đã có | 1 | exam3_q18 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Subnet route table association (main route table, one table per subnet) | ✅ Đã có | 1 | exam5_q63 | vpc.mdx#addr / RouteAssocSim |
| [ ] | Transit Gateway ECMP (VPN) | ✅ Đã có | 1 | exam4_q18 | vpc.mdx#s6 / HybridLinkSim |
| [ ] | Transit Gateway route propagation | ✅ Đã có | 1 | exam3_q16 | vpc.mdx#hub / HubSim; vpc.mdx#s5 / VpcConnectSim |
| [ ] | VPC enableDnsHostnames and enableDnsSupport | ✅ Đã có | 1 | exam6_q63 | vpc.mdx#confuse; route53.mdx#s4 |
| [ ] | VPC endpoint policy | ✅ Đã có | 1 | exam3_q47 | vpc.mdx#s4 / EndpointSim |
| [ ] | VPC gateway endpoint | ✅ Đã có | 1 | exam4_q23 | vpc.mdx#s4 / EndpointSim |
| [ ] | VPC gateway endpoint for S3 (free, route table) | ✅ Đã có | 1 | exam6_q64 | vpc.mdx#s4 / EndpointSim |
| [ ] | VPC gateway endpoint for S3 and DynamoDB | ✅ Đã có | 1 | exam6_q65 | vpc.mdx#s4; dynamodb.mdx#s1 / KeyAccessSim |
| [ ] | VPC interface endpoint | ✅ Đã có | 1 | exam1_q39 | vpc.mdx#s4 |
| [ ] | VPC interface endpoint (AWS PrivateLink) | ✅ Đã có | 1 | exam3_q7 | vpc.mdx#s4 / EndpointSim |
| [ ] | VPC interface endpoint (DynamoDB via PrivateLink) | ✅ Đã có | 1 | exam6_q65 | vpc.mdx#s4 / EndpointSim |
| [ ] | VPC interface endpoint (PrivateLink) | ✅ Đã có | 1 | exam4_q23 | vpc.mdx#s4 |
| [ ] | VPC interface endpoint for S3 (hourly + per-GB cost) | ✅ Đã có | 1 | exam6_q64 | vpc.mdx#s4 |
| [ ] | VPC peering (full mesh, non-transitive) | ✅ Đã có | 1 | exam2_q21 | vpc.mdx#s5 / VpcConnectSim |
| [ ] | VPC peering (full mesh) | ✅ Đã có | 1 | exam4_q28 | vpc.mdx#s5 / VpcConnectSim |
| [ ] | VPC peering (no transitive routing) | ✅ Đã có | 1 | exam1_q39 | vpc.mdx#s5 |
| [ ] | VPC route table | ✅ Đã có | 1 | exam6_q4 | vpc.mdx#s1 / PacketPath; vpc.mdx#s4 / EndpointSim |
| [ ] | VPC sharing (AWS RAM, shares subnets) | ✅ Đã có | 1 | exam3_q17 | vpc.mdx#s5 / RequirementPicker |
| [ ] | VPC sharing (AWS RAM) | ✅ Đã có | 1 | exam2_q36 | vpc.mdx#s5 / RequirementPicker |
| [ ] | VPC sharing via AWS RAM | ✅ Đã có | 1 | exam6_q41 | vpc.mdx#s5 |

## route53

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | DNS MX record / NS record | ❌ Thiếu | 1 | exam3_q19 |  |
| [ ] | DNS PTR record | ❌ Thiếu | 1 | exam3_q64 |  |
| [ ] | DNS A record | 🟡 Một phần | 1 | exam3_q64 | route53.mdx#s1 / AliasCnameSim |
| [ ] | Route 53 multivalue answer routing | 🟡 Một phần | 1 | exam4_q53 | route53.mdx#challenge |
| [ ] | Route 53 failover routing | ✅ Đã có | 4 | exam1_q38, exam2_q6, exam2_q59, exam5_q7 | route53.mdx#s3<br>route53.mdx#s3, #confuse / Route53MythsSim |
| [ ] | Route 53 alias record | ✅ Đã có | 3 | exam2_q2, exam3_q19, exam4_q3 | route53.mdx#s1 / AliasCnameSim |
| [ ] | Route 53 geolocation routing | ✅ Đã có | 3 | exam1_q38, exam2_q6, exam4_q61 | route53.mdx#s3<br>route53.mdx#s3 / RoutingPolicySim; route53.mdx#confuse / Route53MythsSim |
| [ ] | Route 53 health check | ✅ Đã có | 3 | exam2_q7, exam4_q3, exam5_q56 | route53.mdx#s3, #confuse<br>route53.mdx#s3 / RoutingPolicySim |
| [ ] | Route 53 latency-based routing | ✅ Đã có | 3 | exam1_q38, exam4_q61, exam5_q30 | route53.mdx#s3<br>route53.mdx#s3 / RoutingPolicySim |
| [ ] | Route 53 private hosted zone | ✅ Đã có | 3 | exam1_q63, exam2_q4, exam6_q63 | route53.mdx#s4<br>route53.mdx#s4 / HybridDnsSim |
| [ ] | Route 53 Resolver forwarding rule | ✅ Đã có | 3 | exam1_q63, exam2_q20, exam3_q35 | route53.mdx#s4 / HybridDnsSim |
| [ ] | Route 53 weighted routing | ✅ Đã có | 3 | exam1_q38, exam2_q22, exam4_q61 | route53.mdx#s3<br>route53.mdx#confuse / Route53MythsSim |
| [ ] | Route 53 CNAME record | ✅ Đã có | 2 | exam3_q64, exam4_q3 | route53.mdx#s1 / AliasCnameSim |
| [ ] | Route 53 geoproximity routing | ✅ Đã có | 2 | exam1_q62, exam5_q55 | route53.mdx#s3<br>route53.mdx#s3 / RoutingPolicySim |
| [ ] | Route 53 Resolver inbound endpoint | ✅ Đã có | 2 | exam1_q63, exam3_q35 | route53.mdx#s4 / HybridDnsSim |
| [ ] | Route 53 Resolver outbound endpoint | ✅ Đã có | 2 | exam1_q63, exam3_q35 | route53.mdx#s4 / HybridDnsSim |
| [ ] | DNS caching and TTL | ✅ Đã có | 1 | exam2_q22 | route53.mdx#s2 / TtlSim; global-infra.mdx#s5 / GlobalAcceleratorSim |
| [ ] | Route 53 (DNS-based failover) | ✅ Đã có | 1 | exam1_q59 | route53.mdx#s3 |
| [ ] | Route 53 active-active vs active-passive | ✅ Đã có | 1 | exam5_q56 | route53.mdx#confuse / Route53MythsSim |
| [ ] | Route 53 alias queries to AWS resources are free | ✅ Đã có | 1 | exam3_q19 | route53.mdx#s1 / AliasCnameSim |
| [ ] | Route 53 alias record (AWS targets only) | ✅ Đã có | 1 | exam3_q64 | route53.mdx#s1 / AliasCnameSim |
| [ ] | Route 53 failover routing (active-passive) | ✅ Đã có | 1 | exam5_q56 | route53.mdx#s3 / RoutingPolicySim |
| [ ] | Route 53 geoproximity routing (bias) | ✅ Đã có | 1 | exam4_q61 | route53.mdx#s3 / RoutingPolicySim |
| [ ] | Route 53 latency routing | ✅ Đã có | 1 | exam2_q6 | route53.mdx#s3 / RoutingPolicySim |
| [ ] | Route 53 traffic to load balancer nodes | ✅ Đã có | 1 | exam4_q59 | route53.mdx#confuse |
| [ ] | Route 53 TTL | ✅ Đã có | 1 | exam4_q3 | route53.mdx#s2 / TtlSim |
| [ ] | Route 53 weighted and latency routing | ✅ Đã có | 1 | exam5_q56 | route53.mdx#s3 / RoutingPolicySim |
| [ ] | Route 53 zone apex (no CNAME at apex) | ✅ Đã có | 1 | exam3_q19 | route53.mdx#s1 / AliasCnameSim |

## cloudfront

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | CloudFront origin request policy | ❌ Thiếu | 1 | exam5_q15 |  |
| [ ] | CloudFront price class | ❌ Thiếu | 1 | exam4_q63 |  |
| [ ] | CloudFront regional edge cache | ❌ Thiếu | 1 | exam3_q8 |  |
| [ ] | Lambda@Edge | ❌ Thiếu | 1 | exam5_q7 |  |
| [ ] | CloudFront (dynamic content) | 🟡 Một phần | 1 | exam4_q53 | cloudfront.mdx#s2 |
| [ ] | CloudFront for uncacheable dynamic API responses | 🟡 Một phần | 1 | exam5_q30 | global-infra.mdx#s5 / EdgeChoiceSim; cloudfront.mdx#s2 |
| [ ] | CloudFront for uploads (PUT/POST to S3 origin) | 🟡 Một phần | 1 | exam5_q21 | global-infra.mdx#confuse; s3.mdx#s5 |
| [ ] | CloudFront origin access control (OAC) for uploads (write) | 🟡 Một phần | 1 | exam5_q15 | cloudfront.mdx#s1 |
| [ ] | CloudFront origin protocol policy (HTTPS to origin) | 🟡 Một phần | 1 | exam6_q62 | cloudfront.mdx#s3 (TLS at edge only) |
| [ ] | CloudFront geo restriction | ✅ Đã có | 3 | exam1_q6, exam1_q38, exam4_q63 | cloudfront.mdx#s3 |
| [ ] | CloudFront origin access identity (OAI) / OAC | ✅ Đã có | 2 | exam6_q54, exam6_q65 | cloudfront.mdx#s1 |
| [ ] | CloudFront signed URL | ✅ Đã có | 2 | exam5_q15, exam6_q62 | cloudfront.mdx#s3 / EdgePipelineSim |
| [ ] | ACM certificate in us-east-1 for CloudFront | ✅ Đã có | 1 | exam5_q15 | cloudfront.mdx#s3 / EdgePipelineSim |
| [ ] | CloudFront (HTTP only, no TCP/UDP) | ✅ Đã có | 1 | exam2_q7 | cloudfront.mdx#s4 / RequirementPicker |
| [ ] | CloudFront (HTTP/HTTPS only) | ✅ Đã có | 1 | exam3_q8 | global-infra.mdx#s5 / EdgeChoiceSim |
| [ ] | CloudFront cache behavior (multiple origins) | ✅ Đã có | 1 | exam4_q63 | cloudfront.mdx#s3; cloudfront.mdx#s2 |
| [ ] | CloudFront caching for S3 origin | ✅ Đã có | 1 | exam1_q1 | cloudfront.mdx#s1 / global-infra.mdx#s4 |
| [ ] | CloudFront custom origin (EC2, on-premises) | ✅ Đã có | 1 | exam2_q2 | cloudfront.mdx#s2 / RequirementPicker |
| [ ] | CloudFront custom origin (on-premises server) | ✅ Đã có | 1 | exam1_q62 | cloudfront.mdx#s2 / global-infra.mdx#s4 |
| [ ] | CloudFront field-level encryption | ✅ Đã có | 1 | exam4_q63 | cloudfront.mdx#s3 / EdgePipelineSim |
| [ ] | CloudFront in front of ALB (dynamic origin) | ✅ Đã có | 1 | exam6_q5 | cloudfront.mdx#s2 |
| [ ] | CloudFront origin access identity / origin access control (OAI/OAC) | ✅ Đã có | 1 | exam3_q60 | cloudfront.mdx#s1 / ScenarioFlow |
| [ ] | CloudFront origin group (origin failover) | ✅ Đã có | 1 | exam4_q63 | cloudfront.mdx#s3 / EdgePipelineSim |
| [ ] | CloudFront reduces S3 data transfer out cost | ✅ Đã có | 1 | exam3_q48 | cloudfront.mdx#s2 / RequirementPicker |
| [ ] | CloudFront S3 origin | ✅ Đã có | 1 | exam2_q2 | cloudfront.mdx#s2 / RequirementPicker |
| [ ] | CloudFront signed cookie | ✅ Đã có | 1 | exam6_q62 | cloudfront.mdx#s3 / EdgePipelineSim; cloudfront.mdx#challenge |
| [ ] | CloudFront with S3 origin | ✅ Đã có | 1 | exam6_q58 | cloudfront.mdx#s1; global-infra.mdx#s4 |
| [ ] | CloudFront with S3 origin for static assets | ✅ Đã có | 1 | exam3_q42 | cloudfront.mdx#s2 / EdgeCacheDemo |
| [ ] | S3 not for dynamic content | ✅ Đã có | 1 | exam3_q40 | cloudfront.mdx#s2 |
| [ ] | Security groups and NACLs cannot attach to CloudFront | ✅ Đã có | 1 | exam3_q60 | cloudfront.mdx#s1 / ScenarioFlow |
| [ ] | Serverless web app (S3 static + Lambda + DynamoDB + CloudFront) | ✅ Đã có | 1 | exam3_q40 | cloudfront.mdx#s2 / RequirementPicker |

## iam

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | IAM permissions boundary | ✅ Đã có | 4 | exam1_q25, exam4_q34, exam4_q65, exam5_q18 | iam.mdx#s2 / PolicyEvaluator<br>iam.mdx#s2 |
| [ ] | IAM Access Analyzer | ✅ Đã có | 3 | exam5_q17, exam6_q10, exam6_q30 | iam.mdx#s4 / OrgGuardSim |
| [ ] | IAM role for EC2 (instance profile) | ✅ Đã có | 3 | exam2_q3, exam3_q23, exam6_q57 | iam.mdx#s3 / StepSim<br>iam.mdx#s3 |
| [ ] | Service control policy (SCP) | ✅ Đã có | 3 | exam2_q39, exam3_q59, exam4_q34 | iam.mdx#s2, #s4 / OrgGuardSim<br>iam.mdx#s2 / PolicyEvaluator |
| [ ] | AWS Control Tower | ✅ Đã có | 2 | exam1_q10, exam6_q22 | iam.mdx#s4 / OrgGuardSim |
| [ ] | IAM condition key aws:SourceIp | ✅ Đã có | 2 | exam2_q37, exam2_q48 | iam.mdx#s1 / PolicyReader |
| [ ] | IAM least privilege | ✅ Đã có | 2 | exam1_q16, exam1_q58 | iam.mdx#s1 / LeastPrivilegeSim; iam.mdx#confuse / IamMythsSim<br>iam.mdx#s1 / LeastPrivilegeSim |
| [ ] | IAM role trust policy | ✅ Đã có | 2 | exam3_q23, exam4_q34 | iam.mdx#s3 / RequirementPicker |
| [ ] | AWS account alternate contacts | ✅ Đã có | 1 | exam6_q40 | iam.mdx#confuse / IamMythsSim |
| [ ] | AWS Control Tower (landing zone, controls) | ✅ Đã có | 1 | exam6_q41 | iam.mdx#s4 / OrgGuardSim; vpc.mdx#s5 |
| [ ] | AWS IAM Identity Center permission set | ✅ Đã có | 1 | exam1_q10 | cognito.mdx#s2 |
| [ ] | AWS Organizations | ✅ Đã có | 1 | exam3_q17 | iam.mdx#s4 / OrgGuardSim |
| [ ] | AWS Organizations tag policy | ✅ Đã có | 1 | exam5_q18 | iam.mdx#s4 / OrgGuardSim |
| [ ] | AWS Resource Access Manager (RAM) | ✅ Đã có | 1 | exam3_q36 | iac.mdx#s2 |
| [ ] | Cross-account access (identity policy + bucket policy) | ✅ Đã có | 1 | exam2_q16 | iam.mdx#s2 / PolicyEvaluator |
| [ ] | EC2 instance profile | ✅ Đã có | 1 | exam1_q5 | iam.mdx#s3 |
| [ ] | EC2 instance profile (one IAM role per instance) | ✅ Đã có | 1 | exam3_q6 | iam.mdx#s3 / StepSim + RequirementPicker |
| [ ] | IAM Access Advisor (last accessed information) | ✅ Đã có | 1 | exam5_q17 | iam.mdx#s6 / QuickCompare |
| [ ] | IAM Access Analyzer for S3 (not an event source) | ✅ Đã có | 1 | exam5_q23 | iam.mdx#s6 / QuickCompare |
| [ ] | IAM access key (long-term credentials) | ✅ Đã có | 1 | exam2_q3 | iam.mdx#s3 / StepSim |
| [ ] | IAM condition key aws:RequestedRegion | ✅ Đã có | 1 | exam2_q38 | iam.mdx#s1 / PolicyReader |
| [ ] | IAM cross-account role | ✅ Đã có | 1 | exam2_q15 | iam.mdx#s3 / RequirementPicker |
| [ ] | IAM cross-account role (AssumeRole) | ✅ Đã có | 1 | exam1_q17 | iam.mdx#s3 |
| [ ] | IAM explicit deny with condition | ✅ Đã có | 1 | exam2_q48 | iam.mdx#s2 / PolicyEvaluator |
| [ ] | IAM group | ✅ Đã có | 1 | exam6_q29 | iam.mdx#confuse / IamMythsSim |
| [ ] | IAM inline policy per user | ✅ Đã có | 1 | exam2_q24 | iam.mdx#s6 / QuickCompare |
| [ ] | IAM MFA for privileged users | ✅ Đã có | 1 | exam1_q16 | iam.mdx#confuse / IamMythsSim |
| [ ] | IAM permissions boundary (users/roles, not groups) | ✅ Đã có | 1 | exam2_q39 | iam.mdx#s2 / PolicyEvaluator; iam.mdx#challenge / SortGame |
| [ ] | IAM policy condition aws:SourceIp (IpAddress/NotIpAddress) | ✅ Đã có | 1 | exam4_q8 | iam.mdx#s1 / PolicyReader; s3.mdx#s3 / RequirementPicker |
| [ ] | IAM policy Resource ARN (bucket vs bucket/*) | ✅ Đã có | 1 | exam1_q58 | iam.mdx#s1 / PolicyReader |
| [ ] | IAM role for EC2 instead of access keys | ✅ Đã có | 1 | exam1_q16 | iam.mdx#s3 |
| [ ] | IAM root user access keys (do not create) | ✅ Đã có | 1 | exam1_q31 | iam.mdx#confuse / IamMythsSim |
| [ ] | IAM root user best practice | ✅ Đã có | 1 | exam1_q25 | iam.mdx#confuse / IamMythsSim |
| [ ] | IAM root user MFA | ✅ Đã có | 1 | exam1_q31 | iam.mdx#confuse / IamMythsSim |
| [ ] | IAM SAML 2.0 federation | ✅ Đã có | 1 | exam4_q4 | iam.mdx#s5 / FederationSim |
| [ ] | IAM SAML 2.0 federation (IAM identity provider) | ✅ Đã có | 1 | exam6_q10 | iam.mdx#s5 / FederationSim |
| [ ] | IAM service-linked role | ✅ Đã có | 1 | exam2_q43 | iam.mdx#s6 / QuickCompare; iam.mdx#s3 / RequirementPicker |
| [ ] | IAM user access keys stored on instance (anti-pattern) | ✅ Đã có | 1 | exam3_q23 | iam.mdx#s3 / StepSim |
| [ ] | IAM user policy (same account only) | ✅ Đã có | 1 | exam4_q65 | iam.mdx#s2 |
| [ ] | Root user email as alias to monitored mailbox | ✅ Đã có | 1 | exam6_q40 | iam.mdx#confuse / IamMythsSim |
| [ ] | S3 ListBucket (bucket ARN) vs GetObject (bucket/*) | ✅ Đã có | 1 | exam2_q54 | iam.mdx#s1 / PolicyReader |
| [ ] | SAML 2.0 federation | ✅ Đã có | 1 | exam1_q10 | iam.mdx#s5 / FederationSim |
| [ ] | SCP applies to member-account root user | ✅ Đã có | 1 | exam3_q59 | iam.mdx#s2 / PolicyEvaluator |
| [ ] | SCP deny ec2:DeleteTags | ✅ Đã có | 1 | exam5_q18 | iam.mdx#s4 / OrgGuardSim |
| [ ] | SCP does not affect service-linked roles | ✅ Đã có | 1 | exam3_q59 | iam.mdx#s2 / PolicyEvaluator |
| [ ] | Service control policy (SCP) as guardrail, not grant | ✅ Đã có | 1 | exam6_q10 | iam.mdx#s2 / PolicyEvaluator; iam.mdx#s4 / OrgGuardSim |
| [ ] | Service control policy (SCP) protecting CloudTrail | ✅ Đã có | 1 | exam2_q43 | iam.mdx#s4 / OrgGuardSim; monitoring.mdx Takeaway |
| [ ] | Service control policy (SCP) with aws:RequestTag condition | ✅ Đã có | 1 | exam5_q18 | iam.mdx#s4 / OrgGuardSim |
| [ ] | STS temporary credentials | ✅ Đã có | 1 | exam1_q17 | iam.mdx#s3 |

## kms

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | KMS multi-Region key | ✅ Đã có | 3 | exam2_q46, exam3_q24, exam5_q11 | kms.mdx#s1 / S3EncryptSim<br>kms.mdx#s1 / S3EncryptSim; analytics.mdx#s4 |
| [ ] | ACM imported certificate (no automatic renewal) | ✅ Đã có | 1 | exam2_q9 | kms.mdx#s3 / DataGuardSim |
| [ ] | AWS CloudHSM | ✅ Đã có | 1 | exam4_q6 | kms.mdx#s4 / QuickCompare; kms.mdx#challenge / Quiz |
| [ ] | Client-side encryption | ✅ Đã có | 1 | exam5_q46 | kms.mdx#s4 / QuickCompare |
| [ ] | CloudTrail logging of KMS key usage | ✅ Đã có | 1 | exam2_q50 | kms.mdx#s1, #challenge |
| [ ] | KMS automatic key rotation | ✅ Đã có | 1 | exam4_q6 | kms.mdx#s1 / S3EncryptSim |
| [ ] | KMS customer managed key | ✅ Đã có | 1 | exam4_q6 | kms.mdx#s1 |
| [ ] | KMS encryption context | ✅ Đã có | 1 | exam3_q24 | kms.mdx#s4 / QuickCompare; kms.mdx#s1 / S3EncryptSim |
| [ ] | KMS imported key material | ✅ Đã có | 1 | exam4_q6 | kms.mdx#s4 / QuickCompare; kms.mdx#challenge / Quiz |
| [ ] | KMS single-Region key cannot be converted to multi-Region | ✅ Đã có | 1 | exam2_q46 | kms.mdx#s1 / S3EncryptSim; kms.mdx#s4 / QuickCompare |
| [ ] | RDS encrypted snapshot sharing with KMS key policy | ✅ Đã có | 1 | exam2_q57 | kms.mdx#s2 / StepSim; rds.mdx#s4 |
| [ ] | RDS encryption at rest (KMS) | ✅ Đã có | 1 | exam2_q40 | kms.mdx#s3 / DataGuardSim; rds.mdx#s4 |
| [ ] | S3 Bucket Key | ✅ Đã có | 1 | exam5_q46 | kms.mdx#s1 / S3EncryptSim; s3.mdx#s4 / EncryptionSim |
| [ ] | S3 client-side encryption | ✅ Đã có | 1 | exam1_q22 | s3.mdx#s4 / EncryptionSim |
| [ ] | S3 default encryption (SSE-KMS) | ✅ Đã có | 1 | exam4_q6 | kms.mdx#s1 / S3EncryptSim |
| [ ] | SSE-C | ✅ Đã có | 1 | exam1_q22 | kms.mdx#s1 / challenge |
| [ ] | SSE-KMS | ✅ Đã có | 1 | exam5_q11 | kms.mdx#s1 / S3EncryptSim |
| [ ] | SSE-KMS (audit trail via CloudTrail) | ✅ Đã có | 1 | exam1_q22 | kms.mdx#s1 / challenge |
| [ ] | SSE-KMS with automatic key rotation | ✅ Đã có | 1 | exam2_q50 | kms.mdx#s1 / S3EncryptSim |
| [ ] | SSE-S3 | ✅ Đã có | 1 | exam1_q22 | kms.mdx#s1 / challenge |
| [ ] | SSE-S3 vs SSE-KMS | ✅ Đã có | 1 | exam5_q46 | kms.mdx#s1 / S3EncryptSim; s3.mdx#s4 / EncryptionSim |

## security

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | AWS Security Hub | ❌ Thiếu | 1 | exam5_q13 |  |
| [ ] | AWS WAF is HTTP(S) only (not SFTP) | 🟡 Một phần | 1 | exam5_q62 | security.mdx#s1 / WafSim |
| [ ] | AWS Shield Advanced | ✅ Đã có | 4 | exam3_q58, exam6_q4, exam6_q14, exam6_q60 | security.mdx#s2 / IncidentSim |
| [ ] | Amazon GuardDuty | ✅ Đã có | 3 | exam1_q12, exam3_q1, exam6_q4 | security.mdx#s2<br>security.mdx#s2 / IncidentSim |
| [ ] | Amazon Inspector | ✅ Đã có | 3 | exam3_q58, exam5_q17, exam6_q4 | security.mdx#s2 / IncidentSim |
| [ ] | AWS Firewall Manager | ✅ Đã có | 3 | exam5_q13, exam6_q4, exam6_q14 | security.mdx#s2 / IncidentSim |
| [ ] | Amazon Macie | ✅ Đã có | 2 | exam2_q24, exam3_q1 | security.mdx#s2 / IncidentSim |
| [ ] | AWS WAF | ✅ Đã có | 2 | exam6_q4, exam6_q14 | security.mdx#s1 / WafSim |
| [ ] | AWS WAF on ALB | ✅ Đã có | 2 | exam2_q32, exam5_q45 | security.mdx#s1 / WafSim |
| [ ] | AWS WAF on CloudFront | ✅ Đã có | 2 | exam3_q58, exam5_q13 | security.mdx#s1 / WafSim<br>security.mdx#s1 / WafSim; cloudfront.mdx#s3 / EdgePipelineSim |
| [ ] | Amazon GuardDuty (cryptocurrency finding) | ✅ Đã có | 1 | exam6_q14 | security.mdx#s2 / IncidentSim |
| [ ] | Amazon GuardDuty (not DDoS mitigation) | ✅ Đã có | 1 | exam3_q58 | security.mdx#s2 / IncidentSim |
| [ ] | Amazon GuardDuty (S3 malicious activity detection) | ✅ Đã có | 1 | exam1_q36 | security.mdx#s2 |
| [ ] | Amazon Inspector (EC2 vulnerability scanning) | ✅ Đã có | 1 | exam1_q36 | security.mdx#s2 |
| [ ] | Amazon Security Lake | ✅ Đã có | 1 | exam2_q44 | security.mdx#s2 / IncidentSim |
| [ ] | AWS Shield Response Team (SRT/DRT) | ✅ Đã có | 1 | exam3_q58 | security.mdx#s2 / IncidentSim |
| [ ] | AWS Shield Standard | ✅ Đã có | 1 | exam6_q5 | security.mdx#s2 / IncidentSim |
| [ ] | AWS WAF (SQL injection / XSS managed rules) | ✅ Đã có | 1 | exam5_q13 | security.mdx#s1 / WafSim |
| [ ] | AWS WAF geo match condition | ✅ Đã có | 1 | exam1_q6 | security.mdx#s1 / WafSim |
| [ ] | AWS WAF geo match statement | ✅ Đã có | 1 | exam5_q45 | security.mdx#s1 / WafSim |
| [ ] | AWS WAF IP set (IP match) | ✅ Đã có | 1 | exam2_q30 | security.mdx#s1 / WafSim; cloudfront.mdx#s1 |
| [ ] | AWS WAF IP set on CloudFront | ✅ Đã có | 1 | exam3_q60 | cloudfront.mdx#s1 / ScenarioFlow; security.mdx#s1 / WafSim |
| [ ] | AWS WAF IP set statement | ✅ Đã có | 1 | exam5_q45 | security.mdx#s1 / WafSim |
| [ ] | AWS WAF on Application Load Balancer | ✅ Đã có | 1 | exam1_q6 | security.mdx#s1 / WafSim |
| [ ] | AWS WAF rate-based rule | ✅ Đã có | 1 | exam6_q60 | security.mdx#s1 / WafSim |
| [ ] | AWS WAF supported resources (CloudFront, ALB, API Gateway; not EC2) | ✅ Đã có | 1 | exam5_q57 | security.mdx#s1 / WafSim |
| [ ] | AWS WAF supported resources (not NLB, not ASG) | ✅ Đã có | 1 | exam2_q32 | security.mdx#s1 Takeaway |

## cognito

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | Amazon Cloud Directory | ❌ Thiếu | 1 | exam3_q28 |  |
| [ ] | Simple AD | 🟡 Một phần ⚠ | 2 | exam3_q28, exam6_q44 | cognito.mdx#challenge / Quiz<br>cognito.mdx#challenge |
| [ ] | AD Connector | ✅ Đã có | 2 | exam3_q28, exam6_q44 | cognito.mdx#s2 / StaffSignInSim |
| [ ] | AWS Managed Microsoft AD | ✅ Đã có | 2 | exam1_q65, exam3_q28 | cognito.mdx#s2 / challenge<br>cognito.mdx#s2 / StaffSignInSim |
| [ ] | Cognito identity pool | ✅ Đã có | 2 | exam2_q17, exam4_q4 | cognito.mdx#s1 / ScenarioFlow<br>cognito.mdx#s1 |
| [ ] | IAM Identity Center permission set | ✅ Đã có | 2 | exam4_q4, exam6_q10 | cognito.mdx#s2 / StaffSignInSim |
| [ ] | Active Directory trust relationship | ✅ Đã có | 1 | exam3_q28 | cognito.mdx#s2 / StaffSignInSim |
| [ ] | AWS Directory Service AD Connector | ✅ Đã có | 1 | exam1_q10 | cognito.mdx#s2 |
| [ ] | AWS Managed Microsoft AD (trust relationship) | ✅ Đã có | 1 | exam1_q10 | cognito.mdx#s2 / challenge |
| [ ] | AWS Managed Microsoft AD (trust with on-premises AD) | ✅ Đã có | 1 | exam6_q44 | cognito.mdx#s2 / StaffSignInSim |
| [ ] | AWS Managed Microsoft AD (two-way trust) | ✅ Đã có | 1 | exam4_q4 | cognito.mdx#s2 / StaffSignInSim |
| [ ] | Cognito identity pool (temporary AWS credentials) | ✅ Đã có | 1 | exam6_q50 | cognito.mdx#s1 |
| [ ] | Cognito user pool | ✅ Đã có | 1 | exam6_q50 | cognito.mdx#s1 |
| [ ] | Cognito user pool with ALB authentication | ✅ Đã có | 1 | exam2_q17 | cognito.mdx#s1 / ScenarioFlow; elb.mdx#s3 / AlbRuleSim |
| [ ] | Transfer Family custom identity provider | ✅ Đã có | 1 | exam2_q4 | cognito.mdx#s2 / StaffSignInSim |

## ec2

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | EC2 Spot Instance | ✅ Đã có | 8 | exam1_q21, exam2_q23, exam2_q33, exam2_q49, exam3_q51, exam4_q20, exam4_q46, exam5_q36 | ec2.mdx#s1 / Ec2CostSim<br>ec2.mdx#s1 / PurchaseMixSim |
| [ ] | EC2 Reserved Instance | ✅ Đã có | 6 | exam1_q21, exam2_q14, exam2_q35, exam4_q46, exam6_q33, exam6_q38 | ec2.mdx#s1 / PurchaseMixSim<br>ec2.mdx#s1 / PurchaseMixSim; ec2.mdx#challenge / Quiz |
| [ ] | EC2 Dedicated Instance | ✅ Đã có | 5 | exam2_q23, exam3_q21, exam4_q60, exam6_q21, exam6_q33 | ec2.mdx#s1 / Ec2CostSim<br>ec2.mdx#s1; ec2.mdx#challenge |
| [ ] | EC2 Dedicated Host | ✅ Đã có | 4 | exam2_q23, exam3_q21, exam4_q49, exam6_q21 | ec2.mdx#s1 / Ec2CostSim<br>ec2.mdx#s1 |
| [ ] | EC2 cluster placement group | ✅ Đã có | 3 | exam1_q23, exam4_q20, exam4_q60 | ec2.mdx#s3 / Ec2NetSim |
| [ ] | EC2 instance store | ✅ Đã có | 3 | exam1_q43, exam5_q43, exam6_q15 | ec2.mdx#s4 / Ec2OpsSim / challenge<br>ec2.mdx#s4 / Ec2OpsSim |
| [ ] | EC2 user data | ✅ Đã có | 3 | exam2_q51, exam4_q1, exam4_q5 | ec2.mdx#s2 |
| [ ] | Elastic IP address | ✅ Đã có | 3 | exam1_q2, exam4_q26, exam4_q38 | ec2.mdx#s6 / Ec2LifecycleSim<br>ec2.mdx#s6 |
| [ ] | Amazon Machine Image (AMI) | ✅ Đã có | 2 | exam5_q36, exam6_q27 | ec2.mdx#s2<br>ec2.mdx#s2 / StepSim |
| [ ] | Bastion host | ✅ Đã có | 2 | exam6_q25, exam6_q56 | ec2.mdx#s3 / Ec2NetSim |
| [ ] | EC2 instance metadata | ✅ Đã có | 2 | exam2_q51, exam6_q11 | ec2.mdx#s2 / RequirementPicker |
| [ ] | EC2 partition placement group | ✅ Đã có | 2 | exam1_q23, exam4_q20 | ec2.mdx#s5 / PlacementSim |
| [ ] | EC2 spread placement group | ✅ Đã có | 2 | exam1_q23, exam4_q20 | ec2.mdx#s5 / PlacementSim |
| [ ] | Elastic Fabric Adapter (EFA) | ✅ Đã có | 2 | exam6_q36, exam6_q59 | ec2.mdx#s3 / Ec2NetSim |
| [ ] | Golden AMI | ✅ Đã có | 2 | exam2_q51, exam4_q1 | ec2.mdx#s2 / StepSim<br>ec2.mdx#s2 |
| [ ] | AMI copy across Regions | ✅ Đã có | 1 | exam3_q55 | ec2.mdx#s2; global-infra.mdx#s1 / AmiCopySim |
| [ ] | AMI sharing with another AWS account | ✅ Đã có | 1 | exam3_q55 | ec2.mdx#s2 |
| [ ] | Cancelling a Spot request does not terminate instances | ✅ Đã có | 1 | exam3_q51 | ec2.mdx#challenge / SortGame |
| [ ] | EC2 Dedicated Host (BYOL server-bound licenses) | ✅ Đã có | 1 | exam6_q33 | ec2.mdx#s1 / Ec2CostSim |
| [ ] | EC2 Hibernate | ✅ Đã có | 1 | exam2_q51 | ec2.mdx#s4 / Ec2OpsSim |
| [ ] | EC2 Instance Connect | ✅ Đã có | 1 | exam5_q31 | ec2.mdx#s3 / Ec2NetSim |
| [ ] | EC2 Instance Connect Endpoint | ✅ Đã có | 1 | exam5_q31 | ec2.mdx#s3 / Ec2NetSim |
| [ ] | EC2 instance recovery keeps instance ID, private/Elastic/public IP and metadata | ✅ Đã có | 1 | exam3_q57 | ec2.mdx#s4 / Ec2OpsSim |
| [ ] | EC2 instance recovery loses in-memory data | ✅ Đã có | 1 | exam3_q57 | ec2.mdx#challenge / Quiz |
| [ ] | EC2 instance store (boot volume) | ✅ Đã có | 1 | exam1_q44 | ec2.mdx#s6 |
| [ ] | EC2 instance store (ephemeral, lost on stop/hibernate/terminate) | ✅ Đã có | 1 | exam6_q42 | ec2.mdx#s4 / Ec2OpsSim |
| [ ] | EC2 instance store (highest I/O performance) | ✅ Đã có | 1 | exam5_q52 | ec2.mdx#s6; ec2.mdx#challenge / Quiz |
| [ ] | EC2 On-Demand Capacity Reservation | ✅ Đã có | 1 | exam4_q60 | ec2.mdx#s1; ec2.mdx#s5 / RequirementPicker |
| [ ] | EC2 recovery requires EBS-backed instance (no instance store) | ✅ Đã có | 1 | exam3_q38 | ec2.mdx#challenge / Quiz |
| [ ] | EC2 Reserved Instance (steady baseline) | ✅ Đã có | 1 | exam2_q33 | ec2.mdx#s1 / PurchaseMixSim |
| [ ] | EC2 Reserved Instance for baseline | ✅ Đã có | 1 | exam5_q60 | ec2.mdx#s1 / PurchaseMixSim |
| [ ] | EC2 Scheduled Reserved Instance | ✅ Đã có | 1 | exam3_q30 | ec2.mdx#s1 |
| [ ] | EC2 Spot block (defined duration) | ✅ Đã có | 1 | exam6_q2 | ec2.mdx#s1; ec2.mdx#challenge / SortGame |
| [ ] | EC2 Spot Fleet | ✅ Đã có | 1 | exam2_q49 | ec2.mdx#s1 / Ec2CostSim |
| [ ] | EC2 Spot Fleet (Spot + optional On-Demand) | ✅ Đã có | 1 | exam6_q2 | ec2.mdx#s1 / Ec2CostSim; ec2.mdx#challenge |
| [ ] | EC2 Spot Instance (2-minute interruption notice) | ✅ Đã có | 1 | exam6_q2 | ec2.mdx#s1 / Ec2CostSim; ec2.mdx#challenge |
| [ ] | EC2 Spot Instance (interruptible batch) | ✅ Đã có | 1 | exam2_q35 | ec2.mdx#s1 / PurchaseMixSim |
| [ ] | EC2 Spot Instance (no guaranteed run time) | ✅ Đã có | 1 | exam3_q30 | ec2.mdx#s1 / Ec2CostSim |
| [ ] | EC2 Spot Instance in Auto Scaling group for spikes | ✅ Đã có | 1 | exam5_q60 | ec2.mdx#s1 / PurchaseMixSim; messaging.mdx#s1 |
| [ ] | EC2 Spot Instance persistent request | ✅ Đã có | 1 | exam6_q18 | ec2.mdx#s1 / Ec2CostSim |
| [ ] | EC2 Spot interruption (two-minute notice) | ✅ Đã có | 1 | exam5_q60 | ec2.mdx#s1 / PurchaseMixSim |
| [ ] | EC2 system status check vs instance status check | ✅ Đã có | 1 | exam3_q38 | ec2.mdx#s4 / Ec2OpsSim |
| [ ] | EC2 user data (root privileges, first boot only) | ✅ Đã có | 1 | exam2_q19 | ec2.mdx#s2 / StepSim |
| [ ] | EC2 user data (runs once at first boot) | ✅ Đã có | 1 | exam6_q11 | ec2.mdx#s2 / StepSim |
| [ ] | Elastic Inference accelerator | ✅ Đã có | 1 | exam4_q60 | ec2.mdx#s5 / RequirementPicker |
| [ ] | Elastic IP (one instance at a time) | ✅ Đã có | 1 | exam6_q56 | ec2.mdx#s4 / Ec2OpsSim |
| [ ] | Elastic IP attached via user data | ✅ Đã có | 1 | exam6_q57 | ec2.mdx#s4 / Ec2OpsSim |
| [ ] | Elastic IP vs public IP vs private IP | ✅ Đã có | 1 | exam2_q37 | ec2.mdx#s6 / Ec2LifecycleSim |
| [ ] | Elastic Network Adapter (ENA) / enhanced networking | ✅ Đã có | 1 | exam6_q36 | ec2.mdx#s5 / RequirementPicker |
| [ ] | Encrypted AMI snapshot cannot be copied as unencrypted | ✅ Đã có | 1 | exam3_q55 | ec2.mdx#s2 |
| [ ] | Instance store cannot be detached/reattached | ✅ Đã có | 1 | exam6_q42 | ec2.mdx#s4 / Ec2OpsSim; ec2.mdx#challenge |
| [ ] | Instance store data not preserved in AMI | ✅ Đã có | 1 | exam6_q42 | ec2.mdx#s6 / Ec2LifecycleSim |
| [ ] | Instance store specified only at launch | ✅ Đã có | 1 | exam6_q42 | ec2.mdx#s6 / Ec2LifecycleSim |
| [ ] | Private IP for intra-VPC traffic (data transfer cost) | ✅ Đã có | 1 | exam6_q59 | ec2.mdx#s3 / Ec2NetSim |
| [ ] | Spot Fleet (maintains target capacity) | ✅ Đã có | 1 | exam3_q51 | ec2.mdx#s1 / Ec2CostSim |
| [ ] | Spot request persistent vs one-time | ✅ Đã có | 1 | exam3_q51 | ec2.mdx#s1 / Ec2CostSim |
| [ ] | Terminated instances cannot be recovered | ✅ Đã có | 1 | exam3_q57 | ec2.mdx#s6 / Ec2LifecycleSim; ec2.mdx#challenge / SortGame |

## elb

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | ALB health check | ✅ Đã có | 2 | exam4_q26, exam5_q1 | elb.mdx#s4 / HealthCheckSim |
| [ ] | ALB sticky sessions | ✅ Đã có | 2 | exam5_q37, exam6_q60 | analytics.mdx#s1 / CacheSim<br>elb.mdx#s7 / QuickCompare |
| [ ] | Network Load Balancer | ✅ Đã có | 2 | exam1_q2, exam3_q13 | elb.mdx#s1<br>elb.mdx#s1 / LbTypeSim |
| [ ] | ALB (no static IP) | ✅ Đã có | 1 | exam4_q9 | elb.mdx#challenge |
| [ ] | ALB authenticate-cognito listener rule action | ✅ Đã có | 1 | exam2_q17 | elb.mdx#s3 / AlbRuleSim |
| [ ] | ALB cannot be assigned an Elastic IP | ✅ Đã có | 1 | exam3_q45 | elb.mdx#s1 / LbTypeSim |
| [ ] | ALB cross-zone load balancing | ✅ Đã có | 1 | exam2_q7 | elb.mdx#s2 / CrossZoneCalc |
| [ ] | ALB has no built-in rate limiting | ✅ Đã có | 1 | exam3_q53 | elb.mdx#s3 / AlbRuleSim, elb.mdx#s7 / QuickCompare |
| [ ] | ALB host-based routing | ✅ Đã có | 1 | exam1_q48 | elb.mdx#s3 / AlbRuleSim |
| [ ] | ALB host-based routing (wildcard host condition) | ✅ Đã có | 1 | exam4_q57 | elb.mdx#s3 / AlbRuleSim |
| [ ] | ALB HTTP header-based routing | ✅ Đã có | 1 | exam1_q48 | elb.mdx#s1 / LbTypeSim |
| [ ] | ALB HTTP to HTTPS redirect | ✅ Đã có | 1 | exam4_q40 | elb.mdx#s3 / RuleMatchSim, elb.mdx#s5 / HttpsListenerSim |
| [ ] | ALB HTTPS termination | ✅ Đã có | 1 | exam2_q55 | elb.mdx#s3 / AlbRuleSim |
| [ ] | ALB path-based routing | ✅ Đã có | 1 | exam1_q48 | elb.mdx#s3 / AlbRuleSim |
| [ ] | ALB query string parameter-based routing | ✅ Đã có | 1 | exam1_q48 | elb.mdx#s3 / RuleMatchSim |
| [ ] | ALB SNI (multiple certificates) | ✅ Đã có | 1 | exam4_q40 | elb.mdx#s3 / AlbRuleSim |
| [ ] | ALB target group deregistration during patching | ✅ Đã có | 1 | exam5_q34 | monitoring.mdx#s5 / PatchWindowSim |
| [ ] | Application Load Balancer (HTTP/HTTPS only) | ✅ Đã có | 1 | exam5_q4 | elb.mdx#s1 / LbTypeSim |
| [ ] | Application Load Balancer content-based routing | ✅ Đã có | 1 | exam1_q2 | elb.mdx#s3 |
| [ ] | Application Load Balancer target group | ✅ Đã có | 1 | exam6_q53 | elb.mdx#s1 / LbTypeSim |
| [ ] | ELB across multiple AZs | ✅ Đã có | 1 | exam2_q8 | global-infra.mdx#s3 / AzFailureSim; elb.mdx#s1 |
| [ ] | ELB cross-zone load balancing | ✅ Đã có | 1 | exam3_q14 | elb.mdx#s2 / CrossZoneCalc |
| [ ] | ELB scope: single Region, multiple AZs | ✅ Đã có | 1 | exam6_q7 | elb.mdx#s1 |
| [ ] | ELB SSL security policy | ✅ Đã có | 1 | exam4_q40 | elb.mdx#s5 / HttpsListenerSim |
| [ ] | ELB target type ip | ✅ Đã có | 1 | exam3_q13 | elb.mdx#s4 / HealthCheckSim |
| [ ] | Gateway Load Balancer | ✅ Đã có | 1 | exam6_q41 | elb.mdx#s6 / GwlbSim, elb.mdx#s7 / QuickCompare |
| [ ] | Gateway Load Balancer (third-party appliances) | ✅ Đã có | 1 | exam3_q53 | elb.mdx#s6 / GwlbSim |
| [ ] | Gateway Load Balancer endpoint | ✅ Đã có | 1 | exam3_q47 | elb.mdx#s6 / GwlbSim, elb.mdx#s7 / QuickCompare |
| [ ] | Load balancer in public subnet, instances in private subnet | ✅ Đã có | 1 | exam6_q43 | elb.mdx#s1 / LbTypeSim |
| [ ] | Load balancer is single-Region | ✅ Đã có | 1 | exam5_q7 | elb.mdx#s1 |
| [ ] | Network Load Balancer (TCP) for bastion host | ✅ Đã có | 1 | exam6_q56 | elb.mdx#s1 / LbTypeSim; ec2.mdx#s3 / Ec2NetSim |
| [ ] | Network Load Balancer (TCP/UDP) | ✅ Đã có | 1 | exam5_q4 | elb.mdx#s1 / LbTypeSim |
| [ ] | Network Load Balancer health checks across AZs | ✅ Đã có | 1 | exam6_q27 | elb.mdx#s1 / LbTypeSim; elb.mdx#s4 / HealthCheckSim |
| [ ] | Network Load Balancer TLS termination | ✅ Đã có | 1 | exam6_q43 | elb.mdx#s1 / LbTypeSim |
| [ ] | NLB cross-zone load balancing (disabled) | ✅ Đã có | 1 | exam4_q59 | elb.mdx#s2; route53.mdx#confuse |
| [ ] | NLB Elastic IP | ✅ Đã có | 1 | exam4_q58 | elb.mdx#s1 |
| [ ] | NLB instance ID target routes to primary private IP | ✅ Đã có | 1 | exam3_q13 | elb.mdx#s4 / HealthCheckSim |
| [ ] | NLB IP target type (on-premises targets) | ✅ Đã có | 1 | exam5_q4 | elb.mdx#s1 / LbTypeSim |
| [ ] | NLB static IP (Elastic IP per AZ) | ✅ Đã có | 1 | exam4_q9 | elb.mdx#s1 / LbTypeSim; elb.mdx#challenge |
| [ ] | NLB with Elastic IP per AZ | ✅ Đã có | 1 | exam3_q45 | elb.mdx#s1 / LbTypeSim |
| [ ] | Security group referencing (ALB to EC2) | ✅ Đã có | 1 | exam4_q26 | elb.mdx#s4 / HealthCheckSim; vpc.mdx#s2 / SgChain |
| [ ] | Wildcard SSL certificate | ✅ Đã có | 1 | exam4_q40 | elb.mdx#s5 / HttpsListenerSim |

## asg

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | ASG scheduled action | ✅ Đã có | 3 | exam3_q54, exam4_q21, exam6_q52 | asg.mdx#s1 / ScalingPolicySim<br>asg.mdx#s1 |
| [ ] | Auto Scaling group | ✅ Đã có | 3 | exam4_q9, exam4_q53, exam6_q43 | asg.mdx#s1<br>asg.mdx#s1 / ScalingPolicySim |
| [ ] | ASG default termination policy | ✅ Đã có | 2 | exam2_q65, exam4_q16 | asg.mdx#s3 / TerminationSim |
| [ ] | Auto Scaling group across multiple AZs behind ALB | ✅ Đã có | 2 | exam2_q32, exam5_q7 | global-infra.mdx#s3 / AzFailureSim<br>asg.mdx#s2 / AzCapacityCalc |
| [ ] | Auto Scaling target tracking scaling policy | ✅ Đã có | 2 | exam1_q30, exam1_q45 | asg.mdx#s1 / ScalingPolicySim<br>asg.mdx#s1 |
| [ ] | ASG custom health check (SetInstanceHealth) | ✅ Đã có | 1 | exam2_q18 | asg.mdx#health / HealthReplaceSim |
| [ ] | ASG ELB health check type | ✅ Đã có | 1 | exam2_q18 | asg.mdx#s4; elb.mdx#s4 / HealthCheckSim |
| [ ] | ASG health check grace period | ✅ Đã có | 1 | exam2_q18 | asg.mdx#s4 / MaintenanceSim |
| [ ] | ASG minimum capacity across AZs | ✅ Đã có | 1 | exam4_q49 | asg.mdx#s2; asg.mdx#s4 |
| [ ] | ASG mixed instances policy (On-Demand + Spot) | ✅ Đã có | 1 | exam2_q33 | asg.mdx#setup / GroupSetupSim |
| [ ] | ASG predictive scaling | ✅ Đã có | 1 | exam4_q21 | asg.mdx#s1 |
| [ ] | ASG scale-in | ✅ Đã có | 1 | exam4_q16 | asg.mdx#s3 |
| [ ] | ASG simple scaling policy (cooldown) | ✅ Đã có | 1 | exam4_q21 | asg.mdx#dynamic / DynamicPolicySim |
| [ ] | ASG step scaling / simple scaling policy | ✅ Đã có | 1 | exam3_q54 | asg.mdx#dynamic / DynamicPolicySim |
| [ ] | ASG step scaling policy | ✅ Đã có | 1 | exam4_q21 | asg.mdx#dynamic / DynamicPolicySim |
| [ ] | ASG target tracking on SQS backlog (ApproximateNumberOfMessages) | ✅ Đã có | 1 | exam6_q52 | asg.mdx#s1; messaging.mdx#s1 / QueueBufferSim |
| [ ] | ASG target tracking on SQS backlog per instance | ✅ Đã có | 1 | exam3_q54 | asg.mdx#s1 / ScalingPolicySim |
| [ ] | ASG target tracking scaling policy | ✅ Đã có | 1 | exam4_q21 | asg.mdx#s1 |
| [ ] | Auto Scaling AZ rebalancing (launch before terminate) | ✅ Đã có | 1 | exam1_q54 | asg.mdx#health / HealthReplaceSim |
| [ ] | Auto Scaling based on SQS queue depth (backlog per instance) | ✅ Đã có | 1 | exam5_q26 | asg.mdx#s1 / ScalingPolicySim |
| [ ] | Auto Scaling desired capacity vs min/max | ✅ Đã có | 1 | exam1_q45 | asg.mdx#setup / CapacityRangeSim |
| [ ] | Auto Scaling group (replace unhealthy instance) | ✅ Đã có | 1 | exam1_q2 | asg.mdx#s4 |
| [ ] | Auto Scaling group across multiple AZs | ✅ Đã có | 1 | exam6_q53 | asg.mdx#s2 / AzCapacityCalc |
| [ ] | Auto Scaling group AZ distribution and balancing | ✅ Đã có | 1 | exam5_q61 | asg.mdx#s2 / AzCapacityCalc; asg.mdx#s3 |
| [ ] | Auto Scaling group behind ALB | ✅ Đã có | 1 | exam2_q53 | global-infra.mdx#s3; asg.mdx#s1 |
| [ ] | Auto Scaling group cannot span Regions | ✅ Đã có | 1 | exam5_q61 | asg.mdx#setup / GroupSetupSim |
| [ ] | Auto Scaling group health check type (EC2 vs ELB) | ✅ Đã có | 1 | exam5_q1 | asg.mdx#s4 / elb.mdx#s4 HealthCheckSim |
| [ ] | Auto Scaling group min=max=1 (single-AZ instance) | ✅ Đã có | 1 | exam6_q27 | ec2.mdx#s4 / Ec2OpsSim |
| [ ] | Auto Scaling group min=max=desired=1 across 2 AZs | ✅ Đã có | 1 | exam6_q57 | ec2.mdx#s4 / Ec2OpsSim |
| [ ] | Auto Scaling group minimum/maximum/desired capacity | ✅ Đã có | 1 | exam5_q61 | asg.mdx#s2 / AzCapacityCalc |
| [ ] | Auto Scaling group with launch template | ✅ Đã có | 1 | exam5_q36 | asg.mdx#setup / GroupSetupSim |
| [ ] | Auto Scaling instance scale-in protection | ✅ Đã có | 1 | exam5_q33 | asg.mdx#s3 / TerminationSim |
| [ ] | Auto Scaling scheduled action | ✅ Đã có | 1 | exam1_q45 | asg.mdx#s1 / ScalingPolicySim |
| [ ] | Auto Scaling simple scaling policy | ✅ Đã có | 1 | exam1_q30 | asg.mdx#dynamic / DynamicPolicySim |
| [ ] | Auto Scaling Standby state | ✅ Đã có | 1 | exam1_q32 | asg.mdx#s4 / MaintenanceSim |
| [ ] | Auto Scaling step scaling policy | ✅ Đã có | 1 | exam1_q30 | asg.mdx#dynamic / DynamicPolicySim |
| [ ] | Auto Scaling suspend ReplaceUnhealthy process | ✅ Đã có | 1 | exam1_q32 | asg.mdx#s4 / MaintenanceSim |
| [ ] | Auto Scaling unhealthy instance replacement (terminate then launch) | ✅ Đã có | 1 | exam1_q54 | asg.mdx#health / HealthReplaceSim |
| [ ] | EC2 instance Impaired status (ASG delays termination) | ✅ Đã có | 1 | exam2_q18 | asg.mdx#health / HealthReplaceSim |
| [ ] | EC2 launch template | ✅ Đã có | 1 | exam3_q21 | ec2.mdx#s2 |
| [ ] | ELB health check with Auto Scaling | ✅ Đã có | 1 | exam1_q54 | asg.mdx#s4 / elb.mdx#s4 |
| [ ] | Multi-AZ capacity planning (survive one AZ failure) | ✅ Đã có | 1 | exam2_q31 | asg.mdx#s2 / AzCapacityCalc |
| [ ] | Reserved Instance for ASG baseline | ✅ Đã có | 1 | exam4_q49 | asg.mdx#s4 |
| [ ] | Target tracking scaling policy | ✅ Đã có | 1 | exam3_q15 | asg.mdx#s1 / ScalingPolicySim |

## containers

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | Amazon ECS EC2 launch type | ✅ Đã có | 2 | exam2_q1, exam4_q33 | containers.mdx#s1 / ScenarioFlow<br>containers.mdx#s1 |
| [ ] | Amazon EKS Anywhere | ✅ Đã có | 2 | exam1_q11, exam1_q27 | containers.mdx#s4 / EksPlacementSim; containers.mdx#s5 / QuickCompare |
| [ ] | AWS App Runner | ✅ Đã có | 2 | exam2_q14, exam3_q20 | containers.mdx#s5 / QuickCompare |
| [ ] | EKS on Fargate | ✅ Đã có | 2 | exam4_q33, exam4_q56 | containers.mdx#s1 |
| [ ] | Amazon ECS Fargate task (scheduled) | ✅ Đã có | 1 | exam2_q27 | containers.mdx#s2 / ContainerJobSim |
| [ ] | Amazon ECS on AWS Fargate | ✅ Đã có | 1 | exam1_q11 | containers.mdx#s1 |
| [ ] | Amazon EKS | ✅ Đã có | 1 | exam3_q32 | containers.mdx#s1 |
| [ ] | Amazon EKS on AWS Fargate | ✅ Đã có | 1 | exam2_q1 | containers.mdx#s1 / ScenarioFlow; containers.mdx#s2 |
| [ ] | Amazon EKS self-managed EC2 nodes (vs Fargate) | ✅ Đã có | 1 | exam6_q55 | containers.mdx#s1 |
| [ ] | AWS Fargate | ✅ Đã có | 1 | exam3_q20 | containers.mdx#s1 |
| [ ] | AWS Fargate with Amazon ECS (long-running jobs) | ✅ Đã có | 1 | exam6_q35 | containers.mdx#s2 / ContainerJobSim; kinesis.mdx#s3 / StreamPipelineSim |
| [ ] | ECS EC2 launch type pricing (EC2 + EBS) | ✅ Đã có | 1 | exam1_q14 | containers.mdx#s1 |
| [ ] | ECS on Fargate | ✅ Đã có | 1 | exam4_q33 | containers.mdx#s1 |
| [ ] | ECS on Fargate (single task does not scale) | ✅ Đã có | 1 | exam5_q36 | containers.mdx#s3 / ScaleLayersSim |
| [ ] | ECS on Fargate with EFS volume | ✅ Đã có | 1 | exam3_q32 | containers.mdx#s2 / ContainerJobSim |
| [ ] | ECS Service Auto Scaling (service CPU metric) | ✅ Đã có | 1 | exam3_q15 | containers.mdx#s2 |
| [ ] | EKS IAM Roles for Service Accounts (IRSA) | ✅ Đã có | 1 | exam1_q5 | containers.mdx#s2 / ContainerJobSim |
| [ ] | EKS self-managed node group | ✅ Đã có | 1 | exam1_q11 | containers.mdx#s1 |
| [ ] | Fargate pricing (vCPU and memory) | ✅ Đã có | 1 | exam1_q14 | containers.mdx#s1 |
| [ ] | Kubernetes Cluster Autoscaler | ✅ Đã có | 1 | exam4_q56 | containers.mdx#s2 / ContainerJobSim; asg.mdx#s1 |
| [ ] | Kubernetes Horizontal Pod Autoscaler | ✅ Đã có | 1 | exam4_q56 | containers.mdx#s3 / ScaleLayersSim |
| [ ] | Kubernetes RBAC | ✅ Đã có | 1 | exam1_q5 | containers.mdx#s2 (IRSA vs RBAC); containers.mdx#s5 / QuickCompare |

## lambda

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | Lambda 15-minute timeout limit | ✅ Đã có | 2 | exam1_q11, exam1_q21 | lambda.mdx#s2 |
| [ ] | Lambda execution role | ✅ Đã có | 2 | exam2_q16, exam4_q39 | iam.mdx#s3 / RequirementPicker; lambda.mdx#s2<br>lambda.mdx#challenge; iam.mdx#s3 |
| [ ] | Lambda maximum timeout (15 minutes) | ✅ Đã có | 2 | exam6_q18, exam6_q35 | lambda.mdx#s2<br>lambda.mdx#s2; kinesis.mdx#s3 / StreamPipelineSim |
| [ ] | Lambda timeout limit (15 minutes) | ✅ Đã có | 2 | exam2_q14, exam2_q27 | lambda.mdx#s2; containers.mdx#s2 |
| [ ] | S3 Event Notification to Lambda | ✅ Đã có | 2 | exam2_q11, exam5_q23 | lambda.mdx#s1 / ScenarioFlow<br>lambda.mdx#s1 |
| [ ] | Amazon API Gateway | ✅ Đã có | 1 | exam3_q20 | lambda.mdx#s3 / ApiGatewaySim |
| [ ] | Amazon API Gateway REST API with Lambda | ✅ Đã có | 1 | exam1_q11 | lambda.mdx#s3 |
| [ ] | API Gateway (no security group or subnet) | ✅ Đã có | 1 | exam2_q58 | lambda.mdx#s3 / ApiGatewaySim |
| [ ] | API Gateway caching | ✅ Đã có | 1 | exam4_q44 | lambda.mdx#s3 / ApiGatewaySim |
| [ ] | API Gateway HTTP API JWT authorizer | ✅ Đã có | 1 | exam3_q52 | lambda.mdx#s3 |
| [ ] | API Gateway HTTP API vs REST API | ✅ Đã có | 1 | exam3_q52 | lambda.mdx#s3 |
| [ ] | API Gateway Lambda authorizer | ✅ Đã có | 1 | exam3_q52 | lambda.mdx#s3 / QuickCompare |
| [ ] | API Gateway resource policy (IP allow list) | ✅ Đã có | 1 | exam2_q58 | lambda.mdx#s3 / ApiGatewaySim |
| [ ] | API Gateway REST API (stateless) | ✅ Đã có | 1 | exam1_q49 | lambda.mdx#s3 |
| [ ] | API Gateway REST API direct integration with AWS service (Kinesis) | ✅ Đã có | 1 | exam1_q57 | lambda.mdx#s3 / ApiGatewaySim |
| [ ] | API Gateway throttling and quota | ✅ Đã có | 1 | exam3_q53 | lambda.mdx#s3 / ApiGatewaySim |
| [ ] | API Gateway throttling and usage plans | ✅ Đã có | 1 | exam1_q55 | lambda.mdx#s3 / ApiGatewaySim |
| [ ] | API Gateway usage plan and API key | ✅ Đã có | 1 | exam3_q53 | lambda.mdx#s3 / ApiGatewaySim |
| [ ] | API Gateway WebSocket API | ✅ Đã có | 1 | exam3_q52 | lambda.mdx#s3 |
| [ ] | API Gateway WebSocket API (stateful, full-duplex) | ✅ Đã có | 1 | exam1_q49 | lambda.mdx#s3 |
| [ ] | AWS Lambda | ✅ Đã có | 1 | exam3_q20 | lambda.mdx#s1 |
| [ ] | EventBridge scheduled rule (cron) invoking Lambda | ✅ Đã có | 1 | exam3_q30 | lambda.mdx#s1 / ScenarioFlow |
| [ ] | Lambda account concurrency quota (1000 per Region) | ✅ Đã có | 1 | exam1_q50 | lambda.mdx#s2 / LambdaRunSim |
| [ ] | Lambda concurrency | ✅ Đã có | 1 | exam5_q3 | lambda.mdx#s2 / LambdaRunSim |
| [ ] | Lambda ConcurrentExecutions alarm | ✅ Đã có | 1 | exam4_q25 | lambda.mdx#s2 |
| [ ] | Lambda container image | ✅ Đã có | 1 | exam4_q25 | lambda.mdx#sizing / FunctionConfigSim |
| [ ] | Lambda deployment package size (cold start) | ✅ Đã có | 1 | exam4_q25 | lambda.mdx#sizing / FunctionConfigSim |
| [ ] | Lambda ephemeral storage (/tmp) | ✅ Đã có | 1 | exam3_q32 | lambda.mdx#sizing / FunctionConfigSim |
| [ ] | Lambda layer | ✅ Đã có | 1 | exam1_q9 | lambda.mdx#sizing / FunctionConfigSim |
| [ ] | Lambda Layers | ✅ Đã có | 1 | exam4_q25 | lambda.mdx#s2 |
| [ ] | Lambda memory and CPU allocation | ✅ Đã có | 1 | exam4_q25 | lambda.mdx#sizing / FunctionConfigSim |
| [ ] | Lambda mounting EFS | ✅ Đã có | 1 | exam1_q9 | storage.mdx#s3 / StepSim (links to lambda.mdx#s2) |
| [ ] | Lambda provisioned concurrency | ✅ Đã có | 1 | exam3_q20 | lambda.mdx#s2 / LambdaRunSim |
| [ ] | Lambda SQS event source | ✅ Đã có | 1 | exam2_q14 | lambda.mdx#s1 / ScenarioFlow |
| [ ] | Lambda VPC access (NAT gateway) | ✅ Đã có | 1 | exam4_q25 | lambda.mdx#s2 / LambdaRunSim |
| [ ] | S3 Event Notification | ✅ Đã có | 1 | exam1_q4 | lambda.mdx#s1 |
| [ ] | SQS with Lambda event source mapping (batch) | ✅ Đã có | 1 | exam1_q33 | lambda.mdx#s1 / messaging.mdx#s1 |

## s3

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | S3 Transfer Acceleration | ✅ Đã có | 9 | exam1_q18, exam1_q64, exam2_q12, exam3_q37, exam4_q18, exam4_q29, exam5_q21, exam5_q48, exam6_q58 | s3.mdx#s5 / UploadSim<br>s3.mdx#s5 |
| [ ] | S3 One Zone-IA | ✅ Đã có | 5 | exam1_q8, exam4_q43, exam5_q49, exam5_q51, exam6_q28 | s3.mdx#s1<br>s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 Standard-IA | ✅ Đã có | 5 | exam1_q15, exam4_q43, exam5_q51, exam6_q26, exam6_q28 | s3.mdx#s1 / messaging.mdx#s4<br>s3.mdx#s1 |
| [ ] | S3 client-side encryption | ✅ Đã có | 4 | exam2_q10, exam3_q24, exam4_q6, exam6_q51 | s3.mdx#s4 Takeaway<br>s3.mdx#s4 / EncryptionSim |
| [ ] | S3 Glacier Deep Archive | ✅ Đã có | 4 | exam1_q15, exam2_q29, exam2_q41, exam4_q36 | s3.mdx#s1 / LifecycleValidator<br>s3.mdx#s1 / RequirementPicker |
| [ ] | S3 Intelligent-Tiering | ✅ Đã có | 4 | exam1_q15, exam5_q49, exam5_q54, exam6_q9 | s3.mdx#s1<br>s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 Lifecycle rule | ✅ Đã có | 4 | exam1_q8, exam1_q35, exam4_q43, exam6_q3 | s3.mdx#s1 / LifecycleValidator<br>s3.mdx#s1 |
| [ ] | S3 bucket policy | ✅ Đã có | 3 | exam2_q4, exam4_q8, exam6_q54 | s3.mdx#s3 / RequirementPicker<br>s3.mdx#s3 |
| [ ] | S3 multipart upload | ✅ Đã có | 3 | exam1_q18, exam1_q64, exam4_q14 | s3.mdx#s5 / UploadSim |
| [ ] | Amazon S3 static website hosting | ✅ Đã có | 2 | exam2_q2, exam4_q53 | cloudfront.mdx#s2 / RequirementPicker<br>s3.mdx#s6 / WebsiteEndpointSim |
| [ ] | S3 Access Points | ✅ Đã có | 2 | exam1_q9, exam5_q24 | s3.mdx#s3 |
| [ ] | S3 Cross-Region Replication | ✅ Đã có | 2 | exam1_q62, exam2_q46 | analytics.mdx#s4<br>analytics.mdx (CRR paragraph); kms.mdx#s1 / S3EncryptSim |
| [ ] | S3 Glacier Flexible Retrieval | ✅ Đã có | 2 | exam4_q64, exam6_q28 | s3.mdx#s1<br>s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 Object Lock (compliance mode) | ✅ Đã có | 2 | exam4_q64, exam5_q50 | s3.mdx#s2<br>s3.mdx#s2 / DeleteGuardSim |
| [ ] | S3 Object Lock (governance mode) | ✅ Đã có | 2 | exam4_q64, exam5_q50 | s3.mdx#s2<br>s3.mdx#s2 / DeleteGuardSim |
| [ ] | S3 SSE-KMS | ✅ Đã có | 2 | exam2_q10, exam3_q24 | s3.mdx#s4 / EncryptionSim; kms.mdx#s1<br>s3.mdx#s4 / EncryptionSim |
| [ ] | S3 SSE-S3 | ✅ Đã có | 2 | exam2_q10, exam4_q6 | s3.mdx#s4 / EncryptionSim<br>s3.mdx#s4 / EncryptionSim; kms.mdx#challenge |
| [ ] | S3 Standard | ✅ Đã có | 2 | exam2_q29, exam5_q52 | s3.mdx#s1; storage.mdx#s1<br>s3.mdx#s1 |
| [ ] | S3 Storage Class Analysis | ✅ Đã có | 2 | exam4_q30, exam6_q3 | s3.mdx#s3 / RequirementPicker |
| [ ] | Access control list (ACL) | ✅ Đã có | 1 | exam4_q34 | s3.mdx#s3 |
| [ ] | CloudFront vs S3 Transfer Acceleration for large uploads | ✅ Đã có | 1 | exam3_q37 | s3.mdx#s5; global-infra.mdx#s5 / EdgeChoiceSim |
| [ ] | Glacier Vault Lock | ✅ Đã có | 1 | exam4_q64 | s3.mdx#s2 |
| [ ] | S3 access control list (ACL) | ✅ Đã có | 1 | exam5_q39 | s3.mdx#s2 / s3.mdx#s7 / QuickCompare |
| [ ] | S3 Access Point | ✅ Đã có | 1 | exam2_q24 | s3.mdx#s3 / RequirementPicker |
| [ ] | S3 Batch Operations | ✅ Đã có | 1 | exam3_q48 | s3.mdx#s7 / QuickCompare |
| [ ] | S3 bucket policy (20 KB size limit) | ✅ Đã có | 1 | exam6_q29 | s3.mdx#s3 / RequirementPicker |
| [ ] | S3 bucket policy (cross-account) | ✅ Đã có | 1 | exam4_q65 | s3.mdx#s3 / RequirementPicker |
| [ ] | S3 byte-range fetch | ✅ Đã có | 1 | exam6_q20 | s3.mdx#s5 / UploadSim |
| [ ] | S3 Cross-Region Replication (CRR) | ✅ Đã có | 1 | exam5_q11 | analytics.mdx#s4 |
| [ ] | S3 Glacier Flexible Retrieval (restore latency) | ✅ Đã có | 1 | exam6_q15 | s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 Glacier Flexible Retrieval (retrieval time) | ✅ Đã có | 1 | exam5_q51 | s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 Glacier Instant Retrieval (90-day minimum) | ✅ Đã có | 1 | exam1_q28 | s3.mdx#s1 |
| [ ] | S3 Glacier Instant Retrieval (retrieval cost trade-off) | ✅ Đã có | 1 | exam6_q28 | s3.mdx#s1; messaging.mdx#s4 |
| [ ] | S3 Glacier storage class | ✅ Đã có | 1 | exam4_q43 | s3.mdx#s1 |
| [ ] | S3 Glacier storage classes | ✅ Đã có | 1 | exam5_q52 | s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 Glacier Vault Lock policy | ✅ Đã có | 1 | exam5_q39 | s3.mdx#s2 |
| [ ] | S3 Lifecycle (not a compliance control) | ✅ Đã có | 1 | exam5_q39 | s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 Lifecycle minimum 30 days before transition to IA | ✅ Đã có | 1 | exam1_q8 | s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 Lifecycle rule (transition + expiration) | ✅ Đã có | 1 | exam6_q28 | s3.mdx#s1 / RequirementPicker |
| [ ] | S3 Lifecycle rule prefix filter | ✅ Đã có | 1 | exam4_q43 | s3.mdx#s1 / LifecycleFilterSim |
| [ ] | S3 Lifecycle rule to Glacier Deep Archive | ✅ Đã có | 1 | exam2_q34 | s3.mdx#s1; analytics.mdx / LakeCostSim |
| [ ] | S3 Lifecycle supported transitions (waterfall) | ✅ Đã có | 1 | exam1_q19 | s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 Lifecycle transition and expiration | ✅ Đã có | 1 | exam5_q51 | s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 MFA Delete | ✅ Đã có | 1 | exam1_q20 | s3.mdx#s2 / DeleteGuardSim |
| [ ] | S3 Multi-Region Access Point | ✅ Đã có | 1 | exam6_q30 | s3.mdx#s7 / QuickCompare |
| [ ] | S3 Object Lock bucket default retention (duration, overridden by explicit setting) | ✅ Đã có | 1 | exam1_q56 | s3.mdx#s2 / RetentionSim |
| [ ] | S3 Object Lock retention modes (governance, compliance) | ✅ Đã có | 1 | exam1_q56 | s3.mdx#s2 / DeleteGuardSim / challenge |
| [ ] | S3 Object Lock retention period (Retain Until Date per object version) | ✅ Đã có | 1 | exam1_q56 | s3.mdx#s2 / DeleteGuardSim |
| [ ] | S3 Object Ownership (object writer vs bucket owner enforced) | ✅ Đã có | 1 | exam2_q15 | s3.mdx#s3 / RequirementPicker; analytics.mdx / DataJobSim |
| [ ] | S3 on Outposts | ✅ Đã có | 1 | exam5_q49 | s3.mdx#s7 / QuickCompare |
| [ ] | S3 request rate per prefix (3,500 PUT / 5,500 GET) | ✅ Đã có | 1 | exam1_q51 | s3.mdx#s5 / challenge |
| [ ] | S3 Select | ✅ Đã có | 1 | exam6_q20 | s3.mdx#s7 / QuickCompare |
| [ ] | S3 SSE-C | ✅ Đã có | 1 | exam2_q10 | s3.mdx#s4 / EncryptionSim; kms.mdx#s1 / S3EncryptSim |
| [ ] | S3 SSE-S3 (unique key per object) | ✅ Đã có | 1 | exam3_q24 | s3.mdx#s4 / EncryptionSim; kms.mdx#s1 / S3EncryptSim |
| [ ] | S3 Standard (no minimum storage duration, no retrieval fee) | ✅ Đã có | 1 | exam1_q28 | s3.mdx#s1 |
| [ ] | S3 Standard-IA (object, not file storage) | ✅ Đã có | 1 | exam2_q60 | s3.mdx#s1 |
| [ ] | S3 Standard-IA (retrieval fee, 30-day minimum) | ✅ Đã có | 1 | exam6_q9 | s3.mdx#s1 |
| [ ] | S3 Standard-IA 30-day minimum storage charge | ✅ Đã có | 1 | exam1_q28 | s3.mdx#s1 / LifecycleValidator |
| [ ] | S3 Standard-IA retrieval fee | ✅ Đã có | 1 | exam4_q37 | s3.mdx#s1 |
| [ ] | S3 static website endpoint (GET/HEAD only) | ✅ Đã có | 1 | exam5_q15 | s3.mdx#s6 / WebsiteEndpointSim |
| [ ] | S3 static website hosting (error page) | ✅ Đã có | 1 | exam5_q56 | s3.mdx#s6 / StepSim |
| [ ] | S3 static website hosting (static content only) | ✅ Đã có | 1 | exam1_q62 | s3.mdx#s6 / WebsiteEndpointSim |
| [ ] | S3 Storage Lens | ✅ Đã có | 1 | exam6_q30 | s3.mdx#s3 / RequirementPicker |
| [ ] | S3 Transfer Acceleration pricing (pay only when accelerated) | ✅ Đã có | 1 | exam1_q40 | s3.mdx#s5 / UploadSim |
| [ ] | S3 Versioning | ✅ Đã có | 1 | exam4_q14 | s3.mdx#s2 |
| [ ] | S3 Versioning (delete marker) | ✅ Đã có | 1 | exam1_q20 | s3.mdx#s2 / DeleteGuardSim |
| [ ] | S3 Versioning and bucket policy deny | ✅ Đã có | 1 | exam5_q50 | s3.mdx#s2 / DeleteGuardSim |
| [ ] | SSE-C | ✅ Đã có | 1 | exam6_q51 | s3.mdx#s4; kms.mdx#s1 |
| [ ] | SSE-KMS | ✅ Đã có | 1 | exam6_q51 | s3.mdx#s4 / EncryptionSim; kms.mdx#s1 |
| [ ] | SSE-S3 | ✅ Đã có | 1 | exam6_q51 | s3.mdx#s4 / EncryptionSim; kms.mdx#s1 |

## storage

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | Amazon FSx for Lustre | ✅ Đã có | 6 | exam1_q65, exam2_q56, exam3_q5, exam3_q43, exam5_q28, exam5_q47 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon EFS | ✅ Đã có | 3 | exam1_q43, exam1_q51, exam2_q56 | storage.mdx#s1<br>storage.mdx#s1, #s3 |
| [ ] | Amazon FSx for Windows File Server | ✅ Đã có | 3 | exam1_q24, exam3_q5, exam4_q37 | storage.mdx#s4 / FsxSim<br>storage.mdx#s4 |
| [ ] | EBS Provisioned IOPS SSD (io1/io2) | ✅ Đã có | 3 | exam1_q43, exam3_q27, exam5_q22 | storage.mdx#s2 / VolumeChooser |
| [ ] | EBS snapshot | ✅ Đã có | 3 | exam5_q16, exam5_q64, exam6_q15 | storage.mdx#s2 |
| [ ] | EFS Infrequent Access storage class | ✅ Đã có | 3 | exam2_q60, exam4_q55, exam5_q54 | storage.mdx#s3 / RequirementPicker<br>storage.mdx#s3 |
| [ ] | Mountpoint for Amazon S3 | ✅ Đã có | 3 | exam3_q5, exam4_q24, exam5_q28 | storage.mdx#s5 / MountpointSim, RequirementPicker |
| [ ] | EBS General Purpose SSD (gp2/gp3) | ✅ Đã có | 2 | exam3_q27, exam5_q22 | storage.mdx#s2 / VolumeChooser |
| [ ] | EFS Bursting Throughput mode | ✅ Đã có | 2 | exam3_q11, exam4_q55 | storage.mdx#s3 / RequirementPicker<br>storage.mdx#s3 / BurstCreditSim |
| [ ] | EFS General Purpose performance mode | ✅ Đã có | 2 | exam2_q64, exam4_q55 | storage.mdx#s3 |
| [ ] | EFS Provisioned Throughput mode | ✅ Đã có | 2 | exam3_q11, exam4_q55 | storage.mdx#s3 / RequirementPicker<br>storage.mdx#s3 |
| [ ] | FSx for Windows File Server (SMB) | ✅ Đã có | 2 | exam2_q12, exam3_q56 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon EBS | ✅ Đã có | 1 | exam2_q60 | storage.mdx#s1 |
| [ ] | Amazon EBS (AZ-scoped block storage) | ✅ Đã có | 1 | exam6_q15 | storage.mdx#s1 / SharedStorageSim |
| [ ] | Amazon EBS (single-instance block storage) | ✅ Đã có | 1 | exam2_q29 | storage.mdx#s1 / SharedStorageSim |
| [ ] | Amazon EFS (Linux only) | ✅ Đã có | 1 | exam3_q43 | storage.mdx#s4 |
| [ ] | Amazon EFS (multi-AZ, POSIX, with ECS Fargate) | ✅ Đã có | 1 | exam5_q47 | containers.mdx#s2 / ContainerJobSim; storage.mdx#s3 |
| [ ] | Amazon EFS (NFS, no Windows support) | ✅ Đã có | 1 | exam3_q5 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon EFS (no Windows support) | ✅ Đã có | 1 | exam3_q26 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon EFS (not serverless storage for remote offices) | ✅ Đã có | 1 | exam5_q21 | storage.mdx#s1 / SharedStorageSim |
| [ ] | Amazon EFS (POSIX/NFS file system) | ✅ Đã có | 1 | exam6_q39 | storage.mdx#s1 / SharedStorageSim |
| [ ] | Amazon EFS (Regional, multi-AZ) | ✅ Đã có | 1 | exam1_q42 | storage.mdx#s1 / SharedStorageSim |
| [ ] | Amazon EFS Infrequent Access (lifecycle management) | ✅ Đã có | 1 | exam6_q39 | storage.mdx#s3 |
| [ ] | Amazon EFS shared across ECS tasks | ✅ Đã có | 1 | exam3_q11 | storage.mdx#s1 / SharedStorageSim |
| [ ] | Amazon EFS shared file system | ✅ Đã có | 1 | exam2_q29 | storage.mdx#s1 / SharedStorageSim |
| [ ] | Amazon FSx for Lustre (HPC, sub-millisecond latency) | ✅ Đã có | 1 | exam3_q61 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon FSx for Lustre (HPC) | ✅ Đã có | 1 | exam5_q54 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon FSx for Lustre (S3 integration) | ✅ Đã có | 1 | exam1_q24 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon FSx for NetApp ONTAP | ✅ Đã có | 1 | exam3_q61 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon FSx for NetApp ONTAP (NFS + SMB) | ✅ Đã có | 1 | exam3_q26 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon FSx for NetApp ONTAP (SnapMirror cross-Region) | ✅ Đã có | 1 | exam5_q47 | storage.mdx#s4 / FsxSim, RequirementPicker |
| [ ] | Amazon FSx for NetApp ONTAP volume tiering | ✅ Đã có | 1 | exam5_q54 | storage.mdx#s4 / RequirementPicker |
| [ ] | Amazon FSx for OpenZFS | ✅ Đã có | 1 | exam3_q26 | storage.mdx#s4 / FsxSim, RequirementPicker |
| [ ] | Amazon FSx for Windows File Server (Active Directory integration) | ✅ Đã có | 1 | exam3_q43 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon FSx for Windows File Server (DFS support) | ✅ Đã có | 1 | exam1_q65 | storage.mdx#s4 / FsxSim |
| [ ] | Amazon S3 as highly available document store | ✅ Đã có | 1 | exam6_q15 | storage.mdx#s1 / SharedStorageSim |
| [ ] | Amazon S3 cannot be mounted as a file system | ✅ Đã có | 1 | exam3_q32 | storage.mdx#s1 |
| [ ] | EBS Cold HDD (sc1) | ✅ Đã có | 1 | exam3_q27 | storage.mdx#s2 / VolumeChooser |
| [ ] | EBS encryption (at rest, in transit, snapshots) | ✅ Đã có | 1 | exam5_q40 | storage.mdx#s2 |
| [ ] | EBS fast snapshot restore | ✅ Đã có | 1 | exam5_q64 | storage.mdx#s2 |
| [ ] | EBS General Purpose SSD (gp2) burst credits | ✅ Đã có | 1 | exam4_q15 | storage.mdx#s2 / BurstCreditSim, RequirementPicker |
| [ ] | EBS gp2/gp3 volume | ✅ Đã có | 1 | exam1_q44 | storage.mdx#s2 / VolumeChooser |
| [ ] | EBS Multi-Attach | ✅ Đã có | 1 | exam5_q64 | storage.mdx#s2 / VolumeChooser |
| [ ] | EBS Multi-Attach (io1/io2 only) | ✅ Đã có | 1 | exam6_q24 | storage.mdx#s2 / VolumeChooser |
| [ ] | EBS pricing (provisioned capacity) | ✅ Đã có | 1 | exam1_q46 | storage.mdx#s1 / SharedStorageSim |
| [ ] | EBS Provisioned IOPS SSD (io1) | ✅ Đã có | 1 | exam4_q15 | storage.mdx#s2; iac.mdx#s1 / StackSim |
| [ ] | EBS Recycle Bin (snapshot retention rule) | ✅ Đã có | 1 | exam5_q16 | storage.mdx#s2 |
| [ ] | EBS st1/sc1 cannot be boot volume | ✅ Đã có | 1 | exam1_q44 | storage.mdx#s2 / VolumeChooser / challenge |
| [ ] | EBS Throughput Optimized HDD (st1) | ✅ Đã có | 1 | exam3_q27 | storage.mdx#s2 / VolumeChooser |
| [ ] | EBS Throughput Optimized HDD (st1) and Cold HDD (sc1) | ✅ Đã có | 1 | exam5_q22 | storage.mdx#s2 / VolumeChooser |
| [ ] | EBS volume single-instance attachment | ✅ Đã có | 1 | exam3_q11 | storage.mdx#s1 / SharedStorageSim |
| [ ] | EBS volume types (gp2, io1, st1) | ✅ Đã có | 1 | exam5_q43 | storage.mdx#s2 / VolumeChooser |
| [ ] | EBS volume types (gp3, st1, sc1) | ✅ Đã có | 1 | exam6_q24 | storage.mdx#s2 / VolumeChooser |
| [ ] | EFS access point | ✅ Đã có | 1 | exam1_q9 | storage.mdx#s3 / RequirementPicker, StepSim |
| [ ] | EFS cross-account access (file system policy) | ✅ Đã có | 1 | exam1_q9 | storage.mdx#s1 |
| [ ] | EFS IAM authorization policy | ✅ Đã có | 1 | exam1_q12 | storage.mdx#s3 |
| [ ] | EFS Infrequent Access / Intelligent-Tiering | ✅ Đã có | 1 | exam3_q26 | storage.mdx#s3 / RequirementPicker |
| [ ] | EFS lifecycle management (Infrequent Access) | ✅ Đã có | 1 | exam1_q35 | storage.mdx#s3 |
| [ ] | EFS Max I/O performance mode | ✅ Đã có | 1 | exam2_q64 | storage.mdx#s3 / RequirementPicker (current guidance + older-material note) |
| [ ] | EFS mount target | ✅ Đã có | 1 | exam4_q24 | storage.mdx#s3 / RequirementPicker |
| [ ] | EFS One Zone storage class | ✅ Đã có | 1 | exam4_q55 | storage.mdx#s3 / RequirementPicker |
| [ ] | EFS security group (mount target) | ✅ Đã có | 1 | exam1_q12 | storage.mdx#s3 |
| [ ] | EFS Standard pricing (per GB used) | ✅ Đã có | 1 | exam1_q46 | storage.mdx#s1 / SharedStorageSim |
| [ ] | EFS throughput mode (Bursting, Provisioned) | ✅ Đã có | 1 | exam2_q64 | storage.mdx#s3 / RequirementPicker |
| [ ] | EFS, EBS and S3 do not support SMB | ✅ Đã có | 1 | exam3_q56 | storage.mdx#s1; storage.mdx#s4 |
| [ ] | FSx for Lustre linked to S3 | ✅ Đã có | 1 | exam3_q61 | storage.mdx#s4 / FsxSim |
| [ ] | FSx for Windows File Server (DFS/DFSR replacement) | ✅ Đã có | 1 | exam2_q56 | storage.mdx#s4 / FsxSim; storage.mdx#challenge |
| [ ] | FSx for Windows File Server SMB access from Linux | ✅ Đã có | 1 | exam3_q5 | storage.mdx#s4 / FsxSim |
| [ ] | Mountpoint for Amazon S3 (not POSIX) | ✅ Đã có | 1 | exam5_q47 | storage.mdx#s5 / MountpointSim |
| [ ] | Relative per-GB price S3 Standard vs EFS vs EBS | ✅ Đã có | 1 | exam1_q46 | storage.mdx#s1 / StorageBillSim |

## storage-migration

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | Transfer Family POSIX identity mapping | ❌ Thiếu | 1 | exam5_q62 |  |
| [ ] | Transfer Family VPC endpoint with Elastic IP and security group | ❌ Thiếu | 1 | exam5_q62 |  |
| [ ] | AWS DMS ongoing replication (CDC) | 🟡 Một phần | 1 | exam5_q8 | storage-migration.mdx#s3 |
| [ ] | AWS DataSync | ✅ Đã có | 6 | exam1_q9, exam1_q35, exam3_q3, exam4_q36, exam5_q41, exam5_q48 | storage-migration.mdx#s2<br>storage-migration.mdx#s2 / TransferPlannerSim |
| [ ] | Storage Gateway S3 File Gateway | ✅ Đã có | 3 | exam1_q35, exam3_q3, exam3_q43 | storage-migration.mdx#s1<br>storage-migration.mdx#s1 / ScenarioFlow |
| [ ] | Amazon S3 File Gateway | ✅ Đã có | 2 | exam5_q28, exam5_q48 | storage-migration.mdx#s1<br>storage-migration.mdx#s1; storage-migration.mdx#s2 |
| [ ] | AWS Database Migration Service (DMS) | ✅ Đã có | 2 | exam1_q47, exam3_q4 | storage-migration.mdx#s3<br>storage-migration.mdx#s3 / RequirementPicker |
| [ ] | AWS Schema Conversion Tool (SCT) | ✅ Đã có | 2 | exam1_q47, exam3_q4 | storage-migration.mdx#s3<br>storage-migration.mdx#s3 / RequirementPicker |
| [ ] | AWS Snowball Edge Storage Optimized | ✅ Đã có | 2 | exam3_q3, exam5_q5 | storage-migration.mdx#s2 / TransferPlannerSim |
| [ ] | AWS Transfer Family (SFTP) | ✅ Đã có | 2 | exam2_q4, exam5_q62 | storage-migration.mdx#s2 / RequirementPicker<br>storage-migration.mdx#s2 |
| [ ] | S3 Batch Replication | ✅ Đã có | 2 | exam2_q46, exam4_q29 | storage-migration.mdx#s2 / RequirementPicker |
| [ ] | Storage Gateway Volume Gateway stored volumes | ✅ Đã có | 2 | exam2_q59, exam4_q37 | storage-migration.mdx#s1 / ScenarioFlow<br>storage-migration.mdx#s1 |
| [ ] | AWS Application Migration Service (MGN) replication agent | ✅ Đã có | 1 | exam6_q48 | storage-migration.mdx#s3 / StepSim |
| [ ] | AWS DataSync (scheduled task to EFS) | ✅ Đã có | 1 | exam2_q11 | storage-migration.mdx#s2 / TransferPlannerSim |
| [ ] | AWS DMS (not for stream ingestion) | ✅ Đã có | 1 | exam6_q35 | kinesis.mdx#s3 |
| [ ] | AWS DMS Serverless | ✅ Đã có | 1 | exam5_q8 | storage-migration.mdx#s3 |
| [ ] | aws s3 sync | ✅ Đã có | 1 | exam4_q29 | s3.mdx#s7 / QuickCompare |
| [ ] | AWS Snowball | ✅ Đã có | 1 | exam4_q14 | storage-migration.mdx#s2 / TransferPlannerSim |
| [ ] | AWS Snowball Edge Compute Optimized | ✅ Đã có | 1 | exam1_q27 | others.mdx#s4 / storage-migration.mdx#s2 |
| [ ] | AWS Snowball Edge import | ✅ Đã có | 1 | exam3_q61 | storage-migration.mdx#s2 |
| [ ] | AWS Storage Gateway Volume Gateway (cached mode) | ✅ Đã có | 1 | exam1_q35 | storage-migration.mdx#s1 |
| [ ] | AWS Transfer Family | ✅ Đã có | 1 | exam3_q3 | storage-migration.mdx#s2 / RequirementPicker |
| [ ] | Heterogeneous database migration (SCT + DMS) | ✅ Đã có | 1 | exam3_q4 | storage-migration.mdx#s3 |
| [ ] | MGN test instance and cutover | ✅ Đã có | 1 | exam6_q48 | storage-migration.mdx#s3 / StepSim |
| [ ] | Snowball Edge | ✅ Đã có | 1 | exam4_q29 | storage-migration.mdx#s2 / TransferPlannerSim |
| [ ] | Snowball import to S3 then Lifecycle to Glacier Deep Archive | ✅ Đã có | 1 | exam2_q41 | storage-migration.mdx#s2 / TransferPlannerSim |
| [ ] | Snowball import to S3 then S3 Lifecycle to Glacier | ✅ Đã có | 1 | exam5_q5 | storage-migration.mdx#s2 / TransferPlannerSim |
| [ ] | Storage Gateway S3 File Gateway (NFS/SMB) | ✅ Đã có | 1 | exam3_q56 | storage-migration.mdx#s1 |
| [ ] | Storage Gateway Tape Gateway | ✅ Đã có | 1 | exam4_q36 | storage-migration.mdx#s1 |
| [ ] | Storage Gateway Volume Gateway cached volume | ✅ Đã có | 1 | exam3_q31 | storage-migration.mdx#s1 / ScenarioFlow |
| [ ] | Storage Gateway Volume Gateway cached volumes | ✅ Đã có | 1 | exam4_q37 | storage-migration.mdx#s1 |
| [ ] | Storage Gateway Volume Gateway cached volumes (iSCSI) | ✅ Đã có | 1 | exam2_q12 | storage-migration.mdx#s1 / ScenarioFlow |
| [ ] | Storage Gateway Volume Gateway stored volume | ✅ Đã có | 1 | exam3_q31 | storage-migration.mdx#s1 / ScenarioFlow |
| [ ] | Transfer Family supported storage (S3 and EFS only) | ✅ Đã có | 1 | exam5_q62 | storage-migration.mdx#s2 |

## rds

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | RDS Multi-AZ standby (not readable) | ✅ Đã có | 6 | exam2_q13, exam3_q41, exam4_q13, exam4_q50, exam6_q19, exam6_q46 | rds.mdx#s1 / MultiAzSim<br>rds.mdx#s1 |
| [ ] | Aurora Global Database | ✅ Đã có | 4 | exam1_q7, exam1_q47, exam2_q5, exam4_q12 | rds.mdx#s3<br>rds.mdx#s3 / AuroraSim |
| [ ] | Aurora Serverless v2 | ✅ Đã có | 4 | exam2_q53, exam4_q2, exam4_q12, exam6_q17 | rds.mdx#s3 / RequirementPicker<br>rds.mdx#s3 |
| [ ] | RDS read replica | ✅ Đã có | 4 | exam1_q3, exam2_q5, exam2_q63, exam4_q13 | rds.mdx#s1<br>rds.mdx#s1 / MultiAzSim |
| [ ] | Aurora Replica | ✅ Đã có | 3 | exam4_q12, exam4_q44, exam5_q3 | rds.mdx#s3 / AuroraSim<br>rds.mdx#s3 |
| [ ] | RDS cross-Region read replica | ✅ Đã có | 3 | exam4_q19, exam5_q42, exam6_q19 | rds.mdx#s2 / RdsOpsSim<br>rds.mdx#s2 / RdsOpsSim; backup-dr.mdx#s2 / DataFailoverSim |
| [ ] | RDS IAM database authentication | ✅ Đã có | 3 | exam2_q57, exam4_q31, exam4_q39 | rds.mdx#s4 / RequirementPicker<br>rds.mdx#s4 |
| [ ] | RDS Multi-AZ synchronous replication | ✅ Đã có | 3 | exam1_q52, exam3_q63, exam6_q49 | rds.mdx#s1 / challenge<br>rds.mdx#s1 / MultiAzSim |
| [ ] | Aurora Replica (reader endpoint) | ✅ Đã có | 2 | exam2_q13, exam6_q5 | rds.mdx#s3 / AuroraSim |
| [ ] | RDS for SQL Server Multi-AZ | ✅ Đã có | 2 | exam2_q40, exam4_q19 | rds.mdx#s2 |
| [ ] | RDS Multi-AZ | ✅ Đã có | 2 | exam2_q8, exam4_q19 | rds.mdx#s1 / MultiAzSim<br>rds.mdx#s1 |
| [ ] | RDS Multi-AZ deployment | ✅ Đã có | 2 | exam1_q3, exam6_q53 | rds.mdx#s1<br>rds.mdx#s1 / MultiAzSim |
| [ ] | RDS Proxy | ✅ Đã có | 2 | exam1_q39, exam4_q50 | rds.mdx#s2 / RdsOpsSim<br>rds.mdx#s2 |
| [ ] | RDS read replica for reporting | ✅ Đã có | 2 | exam3_q41, exam6_q46 | rds.mdx#s1 / MultiAzSim; rds.mdx#s2 |
| [ ] | Amazon Aurora machine learning | ✅ Đã có | 1 | exam1_q26 | rds.mdx#s6 / QuickCompare |
| [ ] | Amazon RDS Custom for Oracle | ✅ Đã có | 1 | exam1_q3 | rds.mdx#s2 / RdsOpsSim |
| [ ] | Aurora Auto Scaling | ✅ Đã có | 1 | exam3_q50 | rds.mdx#s3 / AuroraSim |
| [ ] | Aurora cluster storage (no gp2/io1/magnetic volume choice) | ✅ Đã có | 1 | exam4_q2 | rds.mdx#s6 / QuickCompare |
| [ ] | Aurora cross-Region read replica | ✅ Đã có | 1 | exam2_q6 | rds.mdx#s3 / AuroraSim + RequirementPicker |
| [ ] | Aurora cross-Region read replica (manual promotion) | ✅ Đã có | 1 | exam6_q23 | backup-dr.mdx#s2 |
| [ ] | Aurora cross-Region read replica (read-only) | ✅ Đã có | 1 | exam1_q55 | rds.mdx#s3 |
| [ ] | Aurora database cloning (Aurora only) | ✅ Đã có | 1 | exam5_q42 | rds.mdx#s6 / QuickCompare |
| [ ] | Aurora failover (replica promotion, no standby instance) | ✅ Đã có | 1 | exam5_q3 | rds.mdx#s3 / AuroraSim |
| [ ] | Aurora Global Database (managed failover) | ✅ Đã có | 1 | exam6_q23 | backup-dr.mdx#s2 / DataFailoverSim; rds.mdx#s3 |
| [ ] | Aurora Global Database (RPO seconds, RTO minute) | ✅ Đã có | 1 | exam2_q61 | rds.mdx#s3 / AuroraSim; backup-dr.mdx |
| [ ] | Aurora Global Database (single writer Region) | ✅ Đã có | 1 | exam5_q59 | rds.mdx#s3 / AuroraSim; dynamodb.mdx#s5 / MultiRegionSim |
| [ ] | Aurora I/O-Optimized | ✅ Đã có | 1 | exam4_q2 | rds.mdx#s3 / RequirementPicker |
| [ ] | Aurora read replica (Aurora Replica) | ✅ Đã có | 1 | exam5_q7 | rds.mdx#s3 / AuroraSim |
| [ ] | Aurora reader endpoint | ✅ Đã có | 1 | exam5_q3 | rds.mdx#s3 / AuroraSim |
| [ ] | Aurora Replica (Multi-AZ) | ✅ Đã có | 1 | exam2_q52 | rds.mdx#s3 / AuroraSim |
| [ ] | Aurora Replica (shared cluster volume, low replica lag) | ✅ Đã có | 1 | exam3_q50 | rds.mdx#s3 / AuroraSim |
| [ ] | Aurora restore from automated backup | ✅ Đã có | 1 | exam2_q52 | rds.mdx#s3 / RequirementPicker |
| [ ] | Aurora Serverless (single Region) | ✅ Đã có | 1 | exam2_q61 | rds.mdx#s3 |
| [ ] | Aurora storage (6 copies across 3 AZs) | ✅ Đã có | 1 | exam3_q50 | rds.mdx#s3 / AuroraSim |
| [ ] | Babelfish for Aurora PostgreSQL | ✅ Đã có | 1 | exam1_q47 | storage-migration.mdx#s3 |
| [ ] | RDS cross-Region automated backups | ✅ Đã có | 1 | exam5_q42 | backup-dr.mdx#s2 / DataFailoverSim; rds.mdx#s2 / RdsOpsSim |
| [ ] | RDS cross-Region read replica (single writer) | ✅ Đã có | 1 | exam5_q59 | rds.mdx#s2 / RdsOpsSim |
| [ ] | RDS encryption via encrypted snapshot copy and restore | ✅ Đã có | 1 | exam2_q45 | rds.mdx#s4 / StepSim |
| [ ] | RDS Multi-AZ (same Region only) | ✅ Đã có | 1 | exam2_q6 | rds.mdx#s1 / MultiAzSim |
| [ ] | RDS Multi-AZ automatic failover | ✅ Đã có | 1 | exam6_q49 | rds.mdx#s1 / MultiAzSim |
| [ ] | RDS Multi-AZ backups taken from standby | ✅ Đã có | 1 | exam6_q49 | rds.mdx#s1 / MultiAzSim |
| [ ] | RDS Multi-AZ engine upgrade (both instances, downtime) | ✅ Đã có | 1 | exam2_q25 | rds.mdx#s1 / MultiAzSim |
| [ ] | RDS Multi-AZ failover (CNAME flip to standby) | ✅ Đã có | 1 | exam5_q25 | rds.mdx#s1 / MultiAzSim |
| [ ] | RDS Multi-AZ OS maintenance on standby first | ✅ Đã có | 1 | exam6_q49 | rds.mdx#s1 / MultiAzSim |
| [ ] | RDS MySQL read replica replication lag | ✅ Đã có | 1 | exam3_q50 | rds.mdx#s3 |
| [ ] | RDS Provisioned IOPS storage | ✅ Đã có | 1 | exam5_q42 | rds.mdx#s6 / QuickCompare |
| [ ] | RDS Proxy (connection pooling) | ✅ Đã có | 1 | exam1_q55 | rds.mdx#s2 / RdsOpsSim |
| [ ] | RDS read replica (not for HA) | ✅ Đã có | 1 | exam6_q53 | rds.mdx#s1 / MultiAzSim |
| [ ] | RDS read replica (same Region, no replication transfer charge) | ✅ Đã có | 1 | exam6_q19 | rds.mdx#s2 / RdsOpsSim; global-infra.mdx#s6 |
| [ ] | RDS read replica (scaling, not HA) | ✅ Đã có | 1 | exam2_q8 | rds.mdx#s1 / MultiAzSim |
| [ ] | RDS read replica asynchronous replication | ✅ Đã có | 1 | exam3_q63 | rds.mdx#s1 / MultiAzSim |
| [ ] | RDS read replica asynchronous replication (cross-Region) | ✅ Đã có | 1 | exam1_q52 | rds.mdx#s1 / challenge |
| [ ] | RDS read replica data transfer charges (cross-Region only) | ✅ Đã có | 1 | exam2_q62 | rds.mdx#s2 Takeaway; global-infra.mdx#s6 / CostPatterns |
| [ ] | RDS read replica encryption follows source | ✅ Đã có | 1 | exam2_q45 | rds.mdx#s5 / ReplicaLab |
| [ ] | RDS read replica for SQL Server | ✅ Đã có | 1 | exam2_q52 | rds.mdx#s1 |
| [ ] | RDS read replica sized same as source | ✅ Đã có | 1 | exam6_q46 | rds.mdx#s5 / ReplicaLab |
| [ ] | RDS SSL/TLS in transit | ✅ Đã có | 1 | exam4_q31 | rds.mdx#s4; kms.mdx#s3 |
| [ ] | RDS storage auto scaling | ✅ Đã có | 1 | exam2_q63 | rds.mdx#s2 / RdsOpsSim |

## dynamodb

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | DynamoDB export to S3 | ❌ Thiếu | 1 | exam4_q42 |  |
| [ ] | DynamoDB Accelerator (DAX) | ✅ Đã có | 5 | exam1_q1, exam1_q29, exam4_q54, exam5_q27, exam6_q6 | dynamodb.mdx#s2<br>dynamodb.mdx#s2 / CapacitySim |
| [ ] | DynamoDB global table | ✅ Đã có | 3 | exam1_q7, exam4_q54, exam4_q62 | dynamodb.mdx#s5 |
| [ ] | DynamoDB Accelerator (DAX) (DynamoDB only) | ✅ Đã có | 2 | exam5_q65, exam6_q47 | dynamodb.mdx#s2 / CapacitySim<br>dynamodb.mdx#s2 |
| [ ] | DynamoDB global tables | ✅ Đã có | 2 | exam2_q5, exam5_q27 | dynamodb.mdx (global tables section)<br>dynamodb.mdx#s5 / MultiRegionSim |
| [ ] | DynamoDB on-demand capacity mode | ✅ Đã có | 2 | exam4_q62, exam6_q17 | dynamodb.mdx#s2 / CapacitySim |
| [ ] | DynamoDB point-in-time recovery (PITR) | ✅ Đã có | 2 | exam3_q49, exam4_q42 | dynamodb.mdx#s4 / RecoverySim<br>dynamodb.mdx#s4 |
| [ ] | DynamoDB provisioned capacity with auto scaling | ✅ Đã có | 2 | exam4_q62, exam5_q27 | dynamodb.mdx#s2<br>dynamodb.mdx#s2 / CapacitySim |
| [ ] | DynamoDB Streams | ✅ Đã có | 2 | exam4_q54, exam5_q35 | dynamodb.mdx#s3<br>dynamodb.mdx#s3 / DataFlowSim |
| [ ] | Amazon DynamoDB | ✅ Đã có | 1 | exam1_q60 | dynamodb.mdx#s1 |
| [ ] | DynamoDB (not in-memory cache) | ✅ Đã có | 1 | exam5_q37 | dynamodb.mdx#s1 |
| [ ] | DynamoDB (serverless key-value, single-digit ms) | ✅ Đã có | 1 | exam4_q10 | dynamodb.mdx#s1 |
| [ ] | DynamoDB auto scaling / on-demand capacity | ✅ Đã có | 1 | exam1_q33 | dynamodb.mdx#s2 |
| [ ] | DynamoDB deletion protection | ✅ Đã có | 1 | exam4_q42 | dynamodb.mdx#s4 |
| [ ] | DynamoDB global secondary index (GSI) | ✅ Đã có | 1 | exam4_q62 | dynamodb.mdx#s1 |
| [ ] | DynamoDB global table (not a backup) | ✅ Đã có | 1 | exam3_q49 | dynamodb.mdx#s4 |
| [ ] | DynamoDB global tables (multi-active, sub-second replication) | ✅ Đã có | 1 | exam5_q59 | dynamodb.mdx#s5 / MultiRegionSim |
| [ ] | DynamoDB hot partition | ✅ Đã có | 1 | exam4_q54 | dynamodb.mdx#s2 |
| [ ] | DynamoDB is not in-memory | ✅ Đã có | 1 | exam1_q29 | dynamodb.mdx#s2 |
| [ ] | DynamoDB on-demand backup | ✅ Đã có | 1 | exam3_q49 | dynamodb.mdx#s4 / RecoverySim |
| [ ] | DynamoDB Streams (custom replication) | ✅ Đã có | 1 | exam5_q27 | dynamodb.mdx#s5 / MultiRegionSim |
| [ ] | DynamoDB Streams (not a backup) | ✅ Đã có | 1 | exam3_q49 | dynamodb.mdx#s3; dynamodb.mdx#s4 |
| [ ] | DynamoDB Time to Live (TTL) | ✅ Đã có | 1 | exam5_q32 | dynamodb.mdx#s3 / DataFlowSim |

## analytics

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | Amazon AppFlow | ❌ Thiếu | 1 | exam1_q53 |  |
| [ ] | AWS Glue Studio | ❌ Thiếu | 1 | exam1_q53 |  |
| [ ] | AWS Lake Formation | ❌ Thiếu | 1 | exam2_q44 |  |
| [ ] | OpenSearch geospatial | ❌ Thiếu | 1 | exam4_q50 |  |
| [ ] | Redis append-only file (AOF) | ❌ Thiếu | 1 | exam4_q32 |  |
| [ ] | Amazon Neptune | 🟡 Một phần ⚠ | 5 | exam1_q29, exam2_q53, exam4_q10, exam4_q11, exam5_q59 | analytics.mdx#s3 / DataJobSim<br>analytics.mdx#s1 Takeaway |
| [ ] | AWS Glue ETL (not CDC) | 🟡 Một phần | 1 | exam5_q8 | analytics.mdx#s3 / DataJobSim |
| [ ] | ElastiCache (cache-aside, not a durable write store) | 🟡 Một phần | 1 | exam1_q55 | analytics.mdx#s1 / CacheSim |
| [ ] | ElastiCache backup | 🟡 Một phần | 1 | exam4_q32 | analytics.mdx#s1 / CacheSim |
| [ ] | ElastiCache read replica | 🟡 Một phần | 1 | exam4_q32 | analytics.mdx#s2 |
| [ ] | Amazon Athena | ✅ Đã có | 10 | exam1_q26, exam1_q53, exam1_q57, exam2_q34, exam4_q22, exam5_q6, exam5_q11, exam5_q12, exam5_q58, exam6_q26 | analytics.mdx#s3 / DataJobSim<br>analytics.mdx#s3 |
| [ ] | Amazon EMR | ✅ Đã có | 5 | exam1_q24, exam1_q26, exam4_q33, exam5_q12, exam6_q18 | analytics.mdx#s3<br>analytics.mdx#s3 / DataJobSim |
| [ ] | Amazon Redshift | ✅ Đã có | 4 | exam2_q5, exam4_q11, exam5_q12, exam6_q6 | analytics.mdx#s1<br>analytics.mdx#s3 |
| [ ] | Amazon Athena and QuickSight | ✅ Đã có | 2 | exam2_q26, exam2_q44 | analytics.mdx#s1 |
| [ ] | Amazon ElastiCache | ✅ Đã có | 2 | exam3_q33, exam6_q17 | analytics.mdx#s1 / CacheSim |
| [ ] | Amazon ElastiCache (cache, not primary database) | ✅ Đã có | 2 | exam2_q53, exam4_q10 | analytics.mdx#s1 |
| [ ] | Amazon OpenSearch Service | ✅ Đã có | 2 | exam4_q11, exam6_q6 | analytics.mdx#s3 / DataJobSim |
| [ ] | Amazon QuickSight | ✅ Đã có | 2 | exam1_q57, exam5_q6 | analytics.mdx#s3 / DataJobSim<br>analytics.mdx#s3 / DataJobSim; kinesis.mdx#s3 / StreamPipelineSim |
| [ ] | AWS Glue | ✅ Đã có | 2 | exam1_q24, exam3_q30 | analytics.mdx#s3 |
| [ ] | ElastiCache for Memcached | ✅ Đã có | 2 | exam1_q1, exam5_q65 | analytics.mdx#s2<br>analytics.mdx#s2 / CacheEngineSim |
| [ ] | ElastiCache for Redis OSS | ✅ Đã có | 2 | exam1_q1, exam6_q47 | analytics.mdx#s2<br>analytics.mdx#s2 / CacheEngineSim |
| [ ] | ElastiCache for Redis OSS geospatial | ✅ Đã có | 2 | exam4_q50, exam5_q65 | analytics.mdx#s1 / CacheSim |
| [ ] | Amazon Athena on CloudTrail logs | ✅ Đã có | 1 | exam1_q61 | analytics.mdx#s3 |
| [ ] | Amazon OpenSearch Service (full-text search) | ✅ Đã có | 1 | exam5_q6 | analytics.mdx#s3 / DataJobSim; kinesis.mdx#s3 / StreamPipelineSim |
| [ ] | Amazon QuickSight (visualization, not SQL analysis) | ✅ Đã có | 1 | exam5_q58 | analytics.mdx#s3 / DataJobSim |
| [ ] | Amazon Redshift (MPP data warehouse) | ✅ Đã có | 1 | exam1_q26 | analytics.mdx#s3 |
| [ ] | Amazon Redshift (not full-text search) | ✅ Đã có | 1 | exam5_q6 | analytics.mdx#s3 |
| [ ] | Amazon Redshift ML | ✅ Đã có | 1 | exam1_q26 | analytics.mdx#s3 / DataJobSim |
| [ ] | Amazon Redshift Serverless | ✅ Đã có | 1 | exam1_q26 | analytics.mdx#s3 / DataJobSim |
| [ ] | Amazon Redshift Spectrum | ✅ Đã có | 1 | exam5_q11 | analytics.mdx#s3 |
| [ ] | AWS Glue (batch ETL) | ✅ Đã có | 1 | exam5_q23 | analytics.mdx#s3 / DataJobSim |
| [ ] | AWS Glue (ETL, not query translation) | ✅ Đã có | 1 | exam1_q47 | analytics.mdx#s3 |
| [ ] | AWS Glue Data Catalog | ✅ Đã có | 1 | exam1_q26 | analytics.mdx#s3 / DataJobSim |
| [ ] | AWS Glue DataBrew (recipes, data profiling) | ✅ Đã có | 1 | exam1_q53 | analytics.mdx#s3 |
| [ ] | AWS Glue ETL compressed columnar format (Parquet) | ✅ Đã có | 1 | exam2_q34 | analytics.mdx / LakeCostSim |
| [ ] | AWS Glue ETL job | ✅ Đã có | 1 | exam1_q26 | analytics.mdx#s3 / DataJobSim |
| [ ] | ElastiCache (requires application change) | ✅ Đã có | 1 | exam4_q13 | analytics.mdx#s1 |
| [ ] | ElastiCache as cache in front of DynamoDB/RDS | ✅ Đã có | 1 | exam6_q6 | analytics.mdx#s1 / CacheSim |
| [ ] | ElastiCache as distributed session store | ✅ Đã có | 1 | exam5_q37 | analytics.mdx#s1 / CacheSim |
| [ ] | ElastiCache for Memcached (multi-threaded) | ✅ Đã có | 1 | exam6_q47 | analytics.mdx#s2 / CacheEngineSim |
| [ ] | ElastiCache for Redis OSS (cache-aside) | ✅ Đã có | 1 | exam4_q12 | analytics.mdx#s1 / CacheSim |
| [ ] | ElastiCache for Redis OSS (leaderboard) | ✅ Đã có | 1 | exam1_q29 | analytics.mdx#s1 / analytics.mdx#s2 |
| [ ] | ElastiCache Multi-AZ automatic failover | ✅ Đã có | 1 | exam4_q32 | analytics.mdx#s1 / CacheSim |
| [ ] | ElastiCache TTL | ✅ Đã có | 1 | exam4_q50 | analytics.mdx#s1 |
| [ ] | ElastiCache use cases (read-heavy, compute-intensive) | ✅ Đã có | 1 | exam3_q33 | analytics.mdx#s1 / CacheSim |
| [ ] | Redshift UNLOAD to cross-account bucket | ✅ Đã có | 1 | exam2_q15 | analytics.mdx#challenge / DataJobSim |
| [ ] | S3 Glacier Deep Archive (not queryable without restore) | ✅ Đã có | 1 | exam6_q26 | analytics.mdx#s4 / LakeCostSim |

## messaging

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | Amazon SNS (no retry for streaming ingestion) | 🟡 Một phần | 1 | exam3_q46 | messaging.mdx#s4 |
| [ ] | EventBridge at-least-once delivery | 🟡 Một phần | 1 | exam1_q13 | messaging.mdx#s4 |
| [ ] | SQS delay queue / message timer | 🟡 Một phần | 1 | exam3_q34 | messaging.mdx#s2 / MessageLifeSim |
| [ ] | Amazon SNS | ✅ Đã có | 4 | exam3_q10, exam4_q35, exam4_q46, exam6_q61 | messaging.mdx#s4 / EventRouterSim<br>messaging.mdx#s4 |
| [ ] | AWS Step Functions | ✅ Đã có | 3 | exam1_q15, exam2_q27, exam6_q55 | messaging.mdx#s4<br>messaging.mdx#s4 / EventRouterSim |
| [ ] | SQS dead-letter queue | ✅ Đã có | 3 | exam5_q44, exam6_q16, exam6_q37 | messaging.mdx#s2 / MessageLifeSim<br>messaging.mdx#s2 |
| [ ] | SQS FIFO queue | ✅ Đã có | 3 | exam3_q2, exam6_q16, exam6_q37 | messaging.mdx#s3 / FifoSim |
| [ ] | SQS visibility timeout | ✅ Đã có | 3 | exam3_q34, exam6_q32, exam6_q37 | messaging.mdx#s2 / MessageLifeSim |
| [ ] | SQS | ✅ Đã có | 2 | exam4_q35, exam4_q51 | messaging.mdx#s1 |
| [ ] | SQS delay queue | ✅ Đã có | 2 | exam6_q16, exam6_q37 | messaging.mdx#s2 |
| [ ] | SQS long polling | ✅ Đã có | 2 | exam3_q34, exam6_q32 | messaging.mdx#s2 / MessageLifeSim<br>messaging.mdx#s2 |
| [ ] | Amazon EventBridge | ✅ Đã có | 1 | exam3_q39 | messaging.mdx#s4 / EventRouterSim |
| [ ] | Amazon EventBridge Scheduler | ✅ Đã có | 1 | exam2_q27 | containers.mdx#s2 / ContainerJobSim; messaging.mdx#s4 |
| [ ] | Amazon MQ (AMQP broker) | ✅ Đã có | 1 | exam2_q1 | messaging.mdx#s4 / EventRouterSim; containers.mdx#s2 |
| [ ] | Amazon MQ (MQTT) | ✅ Đã có | 1 | exam4_q51 | messaging.mdx#s4 / EventRouterSim |
| [ ] | Amazon MQ (RabbitMQ/ActiveMQ migration) | ✅ Đã có | 1 | exam6_q61 | messaging.mdx#s4 / EventRouterSim |
| [ ] | Amazon SNS (push, no polling) | ✅ Đã có | 1 | exam2_q47 | messaging.mdx#s4 |
| [ ] | Amazon SNS (push, pub/sub) | ✅ Đã có | 1 | exam3_q39 | messaging.mdx#s4 / EventRouterSim |
| [ ] | Amazon SNS invoking Lambda | ✅ Đã có | 1 | exam1_q50 | messaging.mdx#s4 |
| [ ] | Amazon SNS notification | ✅ Đã có | 1 | exam2_q9 | messaging.mdx#s4 |
| [ ] | Amazon SNS pub/sub | ✅ Đã có | 1 | exam2_q1 | messaging.mdx#s4 / EventRouterSim |
| [ ] | Amazon SQS (no AMQP support) | ✅ Đã có | 1 | exam2_q1 | messaging.mdx#s1, #s4 Takeaway |
| [ ] | API Gateway to SQS integration | ✅ Đã có | 1 | exam5_q32 | messaging.mdx#s1; lambda.mdx#s3 / ApiGatewaySim |
| [ ] | AWS Step Functions with ECS Fargate task | ✅ Đã có | 1 | exam2_q14 | messaging.mdx#s4 / EventRouterSim |
| [ ] | EventBridge (S3 events) | ✅ Đã có | 1 | exam4_q27 | messaging.mdx#s4 |
| [ ] | EventBridge partner event source (SaaS) | ✅ Đã có | 1 | exam4_q35 | messaging.mdx#s4 / EventRouterSim |
| [ ] | EventBridge scheduled rule | ✅ Đã có | 1 | exam6_q52 | messaging.mdx#s4 / EventRouterSim |
| [ ] | S3 Event Notification | ✅ Đã có | 1 | exam4_q27 | messaging.mdx#s1 |
| [ ] | S3 Event Notification to SQS | ✅ Đã có | 1 | exam2_q14 | messaging.mdx#s1 / RequirementPicker; lambda.mdx#s1 |
| [ ] | SQS (retry via visibility timeout) | ✅ Đã có | 1 | exam4_q46 | messaging.mdx#s2 |
| [ ] | SQS decoupling between tiers | ✅ Đã có | 1 | exam5_q26 | messaging.mdx#s1 / QueueBufferSim |
| [ ] | SQS FIFO ordering | ✅ Đã có | 1 | exam1_q34 | messaging.mdx#s3 / FifoSim |
| [ ] | SQS FIFO queue (exactly-once) | ✅ Đã có | 1 | exam1_q13 | messaging.mdx#s3 / FifoSim |
| [ ] | SQS FIFO queue message group ID | ✅ Đã có | 1 | exam2_q42 | messaging.mdx#s3 / FifoSim |
| [ ] | SQS FIFO queue name suffix (.fifo) | ✅ Đã có | 1 | exam3_q2 | messaging.mdx#s3 |
| [ ] | SQS FIFO throughput (300 API calls/s, 3,000 msg/s with batching) | ✅ Đã có | 1 | exam3_q2 | messaging.mdx#s3 / FifoBatchCalc |
| [ ] | SQS FIFO throughput (300 msg/s, 3000 with batching) | ✅ Đã có | 1 | exam1_q34 | messaging.mdx#s3 / FifoBatchCalc |
| [ ] | SQS queue as buffer (decoupling) | ✅ Đã có | 1 | exam2_q47 | messaging.mdx#s1 / QueueBufferSim |
| [ ] | SQS queue decoupling with Auto Scaling workers | ✅ Đã có | 1 | exam1_q55 | messaging.mdx#s1 |
| [ ] | SQS queue for decoupling producers and consumers | ✅ Đã có | 1 | exam3_q39 | messaging.mdx#s1 / QueueBufferSim |
| [ ] | SQS separate queues for priority | ✅ Đã có | 1 | exam6_q32 | messaging.mdx#s2 / MessageLifeSim |
| [ ] | SQS short polling | ✅ Đã có | 1 | exam3_q34 | messaging.mdx#s2 / MessageLifeSim |
| [ ] | SQS short polling vs long polling | ✅ Đã có | 1 | exam5_q44 | messaging.mdx#s2 / MessageLifeSim |
| [ ] | SQS standard queue (at-least-once) | ✅ Đã có | 1 | exam1_q13 | messaging.mdx#s3 / FifoSim |
| [ ] | SQS standard queue (ordering) | ✅ Đã có | 1 | exam2_q42 | messaging.mdx#s3 |
| [ ] | SQS standard queue cannot be converted to FIFO (recreate) | ✅ Đã có | 1 | exam3_q2 | messaging.mdx#s3 |
| [ ] | SQS standard vs FIFO queue | ✅ Đã có | 1 | exam6_q61 | messaging.mdx#s3 / FifoSim |
| [ ] | SQS temporary queue | ✅ Đã có | 1 | exam5_q44 | messaging.mdx#s2 |
| [ ] | SQS temporary queue (virtual queue) | ✅ Đã có | 1 | exam6_q16 | messaging.mdx#s2 |
| [ ] | SQS with Lambda consumer | ✅ Đã có | 1 | exam5_q32 | messaging.mdx#s1; others.mdx#s3 / AiPipelineSim |

## kinesis

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | Amazon Managed Service for Apache Flink (Kinesis Data Analytics) | 🟡 Một phần ⚠ | 3 | exam3_q46, exam4_q22, exam5_q58 | kinesis.mdx#s3<br>kinesis.mdx#s3 / StreamPipelineSim |
| [ ] | Kinesis Data Streams | ✅ Đã có | 7 | exam3_q10, exam3_q39, exam3_q46, exam4_q22, exam4_q51, exam5_q6, exam6_q35 | kinesis.mdx#s1 / ShardStreamSim<br>kinesis.mdx#s1 |
| [ ] | Amazon Data Firehose | ✅ Đã có | 3 | exam2_q47, exam3_q10, exam4_q22 | kinesis.mdx / StreamPipelineSim<br>kinesis.mdx#s3 |
| [ ] | Amazon Data Firehose (buffered delivery) | ✅ Đã có | 1 | exam6_q31 | kinesis.mdx#s3 / StreamPipelineSim |
| [ ] | Amazon Data Firehose (no consumers) | ✅ Đã có | 1 | exam5_q38 | kinesis.mdx#s3 |
| [ ] | Amazon Data Firehose (single destination, no consumers) | ✅ Đã có | 1 | exam5_q35 | kinesis.mdx#s3 |
| [ ] | Amazon Kinesis Data Analytics (Managed Service for Apache Flink) | ✅ Đã có | 1 | exam1_q57 | kinesis.mdx#s3 |
| [ ] | Amazon QuickSight | ✅ Đã có | 1 | exam4_q22 | kinesis.mdx#s3 / StreamPipelineSim |
| [ ] | AWS DMS (S3 source, Kinesis target) | ✅ Đã có | 1 | exam4_q27 | kinesis.mdx#s3 / StreamPipelineSim; storage-migration.mdx#s3 |
| [ ] | Kinesis Data Firehose destinations (no DynamoDB) | ✅ Đã có | 1 | exam1_q33 | kinesis.mdx#s3 |
| [ ] | Kinesis Data Streams (consumer, shard provisioning) | ✅ Đã có | 1 | exam1_q33 | kinesis.mdx#s1 / ShardStreamSim |
| [ ] | Kinesis Data Streams enhanced fan-out | ✅ Đã có | 1 | exam5_q38 | kinesis.mdx#s2 / ShardThroughputSim |
| [ ] | Kinesis Data Streams multiple consumers | ✅ Đã có | 1 | exam5_q35 | kinesis.mdx#s3 / StreamPipelineSim |
| [ ] | Kinesis Data Streams on-demand capacity mode | ✅ Đã có | 1 | exam6_q31 | kinesis.mdx#s2 / ShardThroughputSim |
| [ ] | Kinesis Data Streams ordering per shard | ✅ Đã có | 1 | exam1_q60 | kinesis.mdx#s1 / ShardStreamSim |
| [ ] | Kinesis Data Streams partition key | ✅ Đã có | 1 | exam2_q42 | kinesis.mdx / ShardStreamSim |
| [ ] | Kinesis enhanced fan-out | ✅ Đã có | 1 | exam6_q52 | kinesis.mdx#s2 |
| [ ] | Kinesis ProvisionedThroughputExceededException | ✅ Đã có | 1 | exam5_q53 | kinesis.mdx#s2 / ShardThroughputSim |
| [ ] | Kinesis record batching/aggregation (PutRecords, KPL) | ✅ Đã có | 1 | exam5_q53 | kinesis.mdx#s2 / ShardThroughputSim |
| [ ] | Kinesis shard capacity | ✅ Đã có | 1 | exam5_q53 | kinesis.mdx#s2 / ShardThroughputSim |
| [ ] | Lambda as Kinesis Data Streams consumer | ✅ Đã có | 1 | exam6_q31 | kinesis.mdx#s1; lambda.mdx#s1 |
| [ ] | Lambda as Kinesis Data Streams consumer (event source mapping) | ✅ Đã có | 1 | exam5_q35 | kinesis.mdx#s1 |
| [ ] | Lambda event source mapping for Kinesis | ✅ Đã có | 1 | exam3_q46 | kinesis.mdx#s1 |
| [ ] | Lambda with Kinesis Data Streams event source mapping | ✅ Đã có | 1 | exam1_q60 | kinesis.mdx#s1 |
| [ ] | SQS vs Kinesis Data Streams for multiple consumers | ✅ Đã có | 1 | exam5_q38 | kinesis.mdx#s1 / ShardStreamSim |
| [ ] | SQS vs Kinesis Data Streams for stream processing | ✅ Đã có | 1 | exam3_q10 | kinesis.mdx#s1 |

## monitoring

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | ACM DaysToExpiry CloudWatch metric | ❌ Thiếu | 1 | exam2_q9 |  |
| [ ] | AWS Config conformance pack | ❌ Thiếu | 1 | exam6_q41 |  |
| [ ] | CloudTrail Insights | ❌ Thiếu | 1 | exam1_q61 |  |
| [ ] | CloudTrail organization trail | ❌ Thiếu | 1 | exam2_q43 |  |
| [ ] | SSM Parameter Store | ❌ Thiếu | 1 | exam4_q39 |  |
| [ ] | Systems Manager hybrid activation | ❌ Thiếu | 1 | exam3_q6 |  |
| [ ] | Systems Manager Session Manager | ❌ Thiếu | 1 | exam5_q31 |  |
| [ ] | AWS Trusted Advisor (service limits checks) | 🟡 Một phần | 1 | exam1_q61 | others.mdx#challenge / CostWatchSim |
| [ ] | SSM Agent and AmazonSSMManagedInstanceCore policy | 🟡 Một phần | 1 | exam3_q6 | monitoring.mdx#s5 |
| [ ] | AWS Config | ✅ Đã có | 2 | exam3_q29, exam5_q17 | monitoring.mdx#s4 / ConfigTimelineSim<br>monitoring.mdx#s4 / WhoAnswersSim, ConfigTimelineSim |
| [ ] | CloudWatch alarm EC2 recover action | ✅ Đã có | 2 | exam3_q38, exam5_q19 | monitoring.mdx#s2 / AlarmActionSim; backup-dr.mdx#s4 / Ec2RecoverSim<br>monitoring.mdx#s2 / AlarmActionSim |
| [ ] | Amazon CloudWatch | ✅ Đã có | 1 | exam3_q29 | monitoring.mdx#s1 |
| [ ] | AWS CloudTrail | ✅ Đã có | 1 | exam3_q29 | monitoring.mdx#s4 / WhoAnswersSim |
| [ ] | AWS Config managed rule acm-certificate-expiration-check | ✅ Đã có | 1 | exam2_q9 | monitoring.mdx (Config scene Takeaway) / ConfigTimelineSim; kms.mdx#s3 |
| [ ] | AWS Config rule with Systems Manager Automation remediation | ✅ Đã có | 1 | exam5_q18 | monitoring.mdx#s4 / GuardrailSim |
| [ ] | AWS Trusted Advisor | ✅ Đã có | 1 | exam3_q38 | backup-dr.mdx#challenge / Quiz |
| [ ] | CloudTrail + EventBridge rule on API calls | ✅ Đã có | 1 | exam6_q30 | monitoring.mdx#s4 / WhoAnswersSim |
| [ ] | CloudTrail logging IAM actions | ✅ Đã có | 1 | exam1_q16 | monitoring.mdx#s4 |
| [ ] | CloudTrail to CloudWatch Logs integration | ✅ Đã có | 1 | exam1_q61 | monitoring.mdx#s3 / messaging.mdx#s4 |
| [ ] | CloudWatch agent (custom high-resolution metrics) | ✅ Đã có | 1 | exam5_q20 | monitoring.mdx#challenge, monitoring.mdx#s3 / LogPipelineSim |
| [ ] | CloudWatch agent sending logs to CloudWatch Logs | ✅ Đã có | 1 | exam5_q33 | monitoring.mdx#s3 / LogPipelineSim |
| [ ] | CloudWatch alarm | ✅ Đã có | 1 | exam3_q15 | monitoring.mdx#s1 / MetricAlarmSim |
| [ ] | CloudWatch alarm (scaling trigger) | ✅ Đã có | 1 | exam4_q16 | monitoring.mdx#s1 |
| [ ] | CloudWatch alarm EC2 reboot action | ✅ Đã có | 1 | exam5_q19 | monitoring.mdx#s2 / AlarmActionSim |
| [ ] | CloudWatch alarm with SNS notification | ✅ Đã có | 1 | exam1_q61 | monitoring.mdx#s1 |
| [ ] | CloudWatch Logs metric filter | ✅ Đã có | 1 | exam1_q61 | monitoring.mdx#s3 / LogPipelineSim / messaging.mdx#s4 |
| [ ] | CloudWatch metrics (utilization) | ✅ Đã có | 1 | exam4_q15 | monitoring.mdx#s1 |
| [ ] | EC2 detailed monitoring (1-minute metrics) | ✅ Đã có | 1 | exam5_q20 | monitoring.mdx#s1 / MetricAlarmSim |
| [ ] | EC2 instance status check vs system status check | ✅ Đã có | 1 | exam5_q19 | monitoring.mdx#s2 / AlarmActionSim |
| [ ] | Systems Manager Automation runbook AWSEC2-PatchLoadBalancerInstance | ✅ Đã có | 1 | exam5_q34 | monitoring.mdx#s5 / PatchWindowSim |
| [ ] | Systems Manager Default Host Management Configuration | ✅ Đã có | 1 | exam3_q6 | monitoring.mdx#s5 / ScenarioFlow |
| [ ] | Systems Manager Maintenance Windows | ✅ Đã có | 1 | exam5_q34 | monitoring.mdx#s5 / PatchWindowSim |
| [ ] | Systems Manager Patch Manager | ✅ Đã có | 1 | exam3_q6 | monitoring.mdx#s5 / PatchWindowSim |

## iac

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | AWS Service Catalog | ❌ Thiếu | 2 | exam6_q22, exam6_q41 |  |
| [ ] | AWS CodeDeploy | ❌ Thiếu | 1 | exam2_q22 |  |
| [ ] | AWS CloudFormation | ✅ Đã có | 1 | exam2_q59 | iac.mdx / StackSim |
| [ ] | CloudFormation (no extra charge) | ✅ Đã có | 1 | exam4_q15 | iac.mdx#challenge |
| [ ] | CloudFormation stack and template | ✅ Đã có | 1 | exam3_q36 | iac.mdx#s1 / StackSim |
| [ ] | CloudFormation StackSets | ✅ Đã có | 1 | exam3_q36 | iac.mdx#s2 / StackSetSim |
| [ ] | CloudFormation template | ✅ Đã có | 1 | exam4_q17 | iac.mdx#s1 |
| [ ] | CloudFormation template (standardized RDS) | ✅ Đã có | 1 | exam4_q47 | iac.mdx#s1; rds.mdx#s2 |
| [ ] | Elastic Beanstalk custom AMI | ✅ Đã có | 1 | exam4_q1 | iac.mdx#s3 / BootTimeSim |

## backup-dr

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | AWS Elastic Disaster Recovery (CloudEndure DR) | ❌ Thiếu | 1 | exam6_q48 |  |
| [ ] | AWS Backup (not for fast cloning) | 🟡 Một phần | 1 | exam5_q64 | backup-dr.mdx#s3 / BackupPlanSim |
| [ ] | ALB with Auto Scaling group (pre-provisioned standby) | ✅ Đã có | 1 | exam2_q59 | backup-dr.mdx / DrStrategySim |
| [ ] | AMI copy across Regions | ✅ Đã có | 1 | exam4_q5 | backup-dr.mdx#s1; ec2.mdx#s2 |
| [ ] | AWS Backup cross-Region copy (RPO) | ✅ Đã có | 1 | exam5_q47 | backup-dr.mdx#s3 / BackupPlanSim |
| [ ] | AWS Backup Vault Lock | ✅ Đã có | 1 | exam5_q16 | backup-dr.mdx#s3 / BackupPlanSim |
| [ ] | AWS DMS continuous replication (not for DR) | ✅ Đã có | 1 | exam6_q23 | backup-dr.mdx#s2 / DataFailoverSim |
| [ ] | DR backup and restore | ✅ Đã có | 1 | exam4_q41 | backup-dr.mdx#s1 |
| [ ] | DR multi-site active/active | ✅ Đã có | 1 | exam4_q41 | backup-dr.mdx#s1 |
| [ ] | DR pilot light | ✅ Đã có | 1 | exam4_q41 | backup-dr.mdx#s1 |
| [ ] | DR warm standby | ✅ Đã có | 1 | exam4_q41 | backup-dr.mdx#s1 / DrStrategySim |
| [ ] | RTO | ✅ Đã có | 1 | exam4_q5 | backup-dr.mdx#s1 / DrStrategySim |

## others

| | Keyword | Trạng thái | Số câu | Câu hỏi | Vị trí trong bài |
|---|---|---|---:|---|---|
| [ ] | Amazon AppFlow | ❌ Thiếu | 1 | exam2_q4 |  |
| [ ] | Amazon Lightsail | ❌ Thiếu | 1 | exam1_q11 |  |
| [ ] | Amazon Lookout for Vision | ❌ Thiếu | 1 | exam1_q4 |  |
| [ ] | Amazon Rekognition | ❌ Thiếu | 1 | exam2_q26 |  |
| [ ] | AWS IoT Core rule | ❌ Thiếu | 1 | exam2_q47 |  |
| [ ] | Amazon SageMaker | 🟡 Một phần ⚠ | 2 | exam1_q4, exam4_q33 | others.mdx#s3 |
| [ ] | Amazon Timestream | 🟡 Một phần | 1 | exam2_q40 | others.mdx (Database Savings Plans list, name only) |
| [ ] | Amazon Transcribe / Amazon Translate (wrong tool) | 🟡 Một phần | 1 | exam5_q32 | others.mdx#s3 / AiPipelineSim |
| [ ] | Amazon Transcribe | ✅ Đã có | 2 | exam1_q4, exam5_q58 | others.mdx#s3<br>others.mdx#s3 / AiPipelineSim; analytics.mdx#s3 / DataJobSim |
| [ ] | AWS Batch | ✅ Đã có | 2 | exam2_q27, exam6_q55 | others.mdx#s4 |
| [ ] | AWS Compute Optimizer | ✅ Đã có | 2 | exam4_q30, exam6_q1 | others.mdx#s1<br>others.mdx#s1 / CostWatchSim |
| [ ] | AWS Outposts | ✅ Đã có | 2 | exam1_q27, exam2_q58 | others.mdx#s4 / global-infra.mdx#deep / monitoring.mdx#s3<br>others.mdx#s4; global-infra.mdx#deep |
| [ ] | AWS Trusted Advisor | ✅ Đã có | 2 | exam4_q30, exam4_q47 | others.mdx#s1 / CostWatchSim |
| [ ] | Amazon Comprehend (custom entity recognition) | ✅ Đã có | 1 | exam1_q4 | others.mdx#s3 |
| [ ] | Amazon Comprehend (sentiment analysis) | ✅ Đã có | 1 | exam5_q32 | others.mdx#s3 / AiPipelineSim |
| [ ] | Amazon Comprehend (sentiment, entities) | ✅ Đã có | 1 | exam2_q26 | others.mdx (AI services section) / AiPipelineSim |
| [ ] | Amazon SageMaker (custom model) | ✅ Đã có | 1 | exam2_q26 | others.mdx (AI services section) |
| [ ] | Amazon Textract | ✅ Đã có | 1 | exam2_q26 | others.mdx (AI services section) / AiPipelineSim |
| [ ] | AWS Budgets budget action (apply IAM policy) | ✅ Đã có | 1 | exam6_q22 | others.mdx#s1 / CostWatchSim; iam.mdx#s4 / OrgGuardSim |
| [ ] | AWS Budgets Savings Plans coverage budget | ✅ Đã có | 1 | exam6_q1 | others.mdx#s1 / CostWatchSim |
| [ ] | AWS Cost Explorer | ✅ Đã có | 1 | exam6_q22 | others.mdx#s1 / CostWatchSim |
| [ ] | Compute Savings Plan | ✅ Đã có | 1 | exam6_q1 | others.mdx#s2 / SavingsPlanSim |
| [ ] | Compute Savings Plan (EC2, Fargate, Lambda) | ✅ Đã có | 1 | exam6_q38 | others.mdx#s2 / SavingsPlanSim |
| [ ] | Cost Optimization Hub | ✅ Đã có | 1 | exam4_q30 | others.mdx#s1 / CostWatchSim |
| [ ] | EC2 Instance Savings Plan | ✅ Đã có | 1 | exam6_q38 | others.mdx#s2; ec2.mdx#s1 / Ec2CostSim |
| [ ] | SageMaker AI Savings Plan | ✅ Đã có | 1 | exam6_q38 | others.mdx#s2 |
