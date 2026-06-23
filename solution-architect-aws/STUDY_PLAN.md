# Lịch ôn thi AWS SAA-C03 trong 5 tuần

## Context

Người học có nền tảng AWS cơ bản, đã biết S3 cơ bản. Điểm yếu: Networking, IAM/Security, HA, Storage & DB.
Mục tiêu: Thi AWS SAA-C03 vào ~30/07/2026. Thời gian học: 1-2 tiếng/ngày buổi tối.
Có 6 bộ đề thực hành (HTML) + slide PDF 900 trang.

---

## Tổng quan 5 tuần

| Tuần | Chủ đề | Ưu tiên |
|------|--------|---------|
| 1 (23/06–29/06) | Networking — VPC, Route 53, CloudFront | WEAK → ưu tiên cao |
| 2 (30/06–06/07) | Security & IAM | WEAK → ưu tiên cao |
| 3 (07/07–13/07) | Compute & High Availability | WEAK → ưu tiên cao |
| 4 (14/07–20/07) | Storage & Database | WEAK + S3 deep |
| 5 (21/07–30/07) | Serverless + Analytics + Full Review | Thi 30/07 |

---

## Tuần 1: Networking (23/06 – 29/06)

### Day 1 – Thứ 2 23/06: VPC Cơ bản
- Concepts: Subnets (public/private), Route Tables, IGW, NAT Gateway vs NAT Instance
- Tạo: `vpc/vpc.md` + `vpc/list_qa.md`

### Day 2 – Thứ 3 24/06: VPC Security
- Concepts: Security Groups vs NACLs (stateful vs stateless), VPC Peering, VPC Endpoints (Gateway vs Interface)
- Luyện đề: VPC questions từ list_qa

### Day 3 – Thứ 4 25/06: VPC Hybrid & Advanced
- Concepts: Site-to-Site VPN, Client VPN, Direct Connect, Transit Gateway, PrivateLink, Reachability Analyzer

### Day 4 – Thứ 5 26/06: Route 53
- Concepts: Routing policies (Simple, Weighted, Latency, Failover, Geolocation, Geoproximity, Multi-Value)
- Health checks, Private Hosted Zones
- Tạo: `route53/route53.md` + `route53/list_qa.md`

### Day 5 – Thứ 6 27/06: CloudFront + Global Accelerator
- Concepts: Origin types, Cache behaviors, OAC vs OAI, Signed URLs vs Cookies
- CloudFront vs Global Accelerator — khi nào dùng cái nào
- Tạo: `cloudfront/cloudfront.md` + `cloudfront/list_qa.md`

### Day 6 – Thứ 7 28/06: Luyện đề Networking
- Làm tất cả câu VPC + Route53 + CloudFront từ 6 đề
- Tạo file note từng câu theo chuẩn `exam{N}_q{M}.md`

### Day 7 – CN 29/06: Review & nhẹ
- Xem lại key insights của tuần
- Nghỉ hoặc làm thêm câu bỏ sót

---

## Tuần 2: Security & IAM (30/06 – 06/07)

### Day 1 – Thứ 2 30/06: IAM Core
- Concepts: Users/Groups/Roles/Policies, Policy evaluation logic, Permission boundaries
- Tạo: `iam/iam.md` + `iam/list_qa.md`

### Day 2 – Thứ 3 01/07: IAM Advanced
- Concepts: STS AssumeRole, Cross-account access, AWS Organizations, SCPs, Resource-based policies
- Inline vs Managed policies, AWS Managed vs Customer Managed

### Day 3 – Thứ 4 02/07: KMS + ACM
- Concepts: CMK types, key policies, SSE-S3 vs SSE-KMS vs SSE-C, CloudHSM
- ACM: certificates, Auto-renewal, với ALB/CloudFront
- Tạo: `kms/kms.md` + `kms/list_qa.md`

### Day 4 – Thứ 5 03/07: WAF + Shield + GuardDuty + Inspector
- WAF: Web ACL, rules, rule groups, với CloudFront/ALB/API GW
- Shield Standard vs Advanced
- GuardDuty + Macie + Inspector — phân biệt vai trò
- Tạo: `security/security.md`

### Day 5 – Thứ 6 04/07: Cognito + IAM Identity Center
- Cognito User Pools vs Identity Pools
- IAM Identity Center (SSO) — với Organizations
- Directory Service: AD Connector vs Simple AD vs AWS Managed Microsoft AD

### Day 6 – Thứ 7 05/07: Luyện đề Security
- Làm tất cả câu IAM + KMS + Security từ 6 đề

### Day 7 – CN 06/07: Review tuần 2

---

## Tuần 3: Compute & High Availability (07/07 – 13/07)

### Day 1 – Thứ 2 07/07: EC2 Deep
- Instance types (Compute/Memory/Storage/Accelerated), Placement Groups
- Pricing: On-Demand, Reserved, Spot, Dedicated
- Tạo: `ec2/ec2.md` + `ec2/list_qa.md`

### Day 2 – Thứ 3 08/07: EBS + EFS + FSx
- EBS types (gp2/gp3/io1/io2/st1/sc1), Multi-Attach, Snapshots
- EFS: Performance modes, throughput modes, storage classes
- FSx: Windows (SMB) vs Lustre vs NetApp ONTAP vs OpenZFS
- Tạo: `storage/storage.md`

### Day 3 – Thứ 4 09/07: ELB
- ALB vs NLB vs GWLB — khi nào dùng cái nào
- Target groups, Listener rules, Sticky sessions, Connection draining
- Tạo: `elb/elb.md` + `elb/list_qa.md`

### Day 4 – Thứ 5 10/07: Auto Scaling
- ASG: scaling policies (Target Tracking, Step, Scheduled, Predictive)
- Lifecycle hooks, Warm pools, Instance refresh
- Multi-AZ pattern với ASG + ELB

### Day 5 – Thứ 6 11/07: ECS + EKS + Fargate
- ECS Launch types (EC2 vs Fargate), Task definitions, Services
- ECR, EKS Node types, Fargate Profiles
- Tạo: `containers/containers.md`

### Day 6 – Thứ 7 12/07: Lambda + API Gateway
- Lambda: concurrency, cold start, layers, destinations, event sources
- API Gateway: REST vs HTTP vs WebSocket, throttling, caching, integration types
- Tạo: `lambda/lambda.md`

### Day 7 – CN 13/07: Luyện đề Compute & HA

---

## Tuần 4: Storage & Database (14/07 – 20/07)

### Day 1 – Thứ 2 14/07: S3 Deep
- Versioning, MFA Delete, Replication (CRR/SRR)
- Encryption: SSE-S3/SSE-KMS/SSE-C/Client-side
- Bucket policies vs ACL vs Access Points
- Cập nhật: `s3/s3.md`

### Day 2 – Thứ 3 15/07: S3 Advanced
- Storage classes + Intelligent-Tiering + Lifecycle policies
- S3 Transfer Acceleration, Presigned URLs, Object Lock (WORM), S3 Select
- Event notifications, S3 Access Logs

### Day 3 – Thứ 4 16/07: Storage Migration
- Storage Gateway: File Gateway, Volume Gateway, Tape Gateway
- DataSync, Snow Family (Snowcone/Snowball/Snowmobile)
- Tạo: `storage-migration/storage-migration.md`

### Day 4 – Thứ 5 17/07: RDS + Aurora
- RDS: Multi-AZ vs Read Replicas, backup vs snapshot
- Aurora: cluster architecture, Global Database, Aurora Serverless v2
- RDS Proxy, IAM auth for RDS
- Tạo: `rds/rds.md` + `rds/list_qa.md`

### Day 5 – Thứ 6 18/07: DynamoDB
- Partition keys, GSI vs LSI, Capacity modes (Provisioned vs On-Demand)
- DAX, DynamoDB Streams, Global Tables
- Tạo: `dynamodb/dynamodb.md` + `dynamodb/list_qa.md`

### Day 6 – Thứ 7 19/07: ElastiCache + Redshift + Athena
- ElastiCache Redis vs Memcached — khi nào dùng cái nào
- Redshift: cluster, Spectrum, RA3
- Athena: serverless query S3, với Glue Data Catalog
- Tạo: `analytics/analytics.md`

### Day 7 – CN 20/07: Luyện đề Storage & DB

---

## Tuần 5: Serverless + Review + Thi (21/07 – 30/07)

### Day 1 – Thứ 2 21/07: Messaging & Event
- SQS: Standard vs FIFO, visibility timeout, DLQ, long polling
- SNS: fan-out pattern, FIFO, message filtering
- EventBridge: event buses, rules, targets
- Kinesis: Data Streams vs Firehose vs Analytics
- Tạo: `messaging/messaging.md`

### Day 2 – Thứ 3 22/07: Monitoring & Operations
- CloudWatch: Metrics, Logs, Alarms, Dashboards, Log Insights
- CloudTrail: management events vs data events, Lake
- AWS Config: rules, remediation
- X-Ray: tracing, sampling
- Tạo: `monitoring/monitoring.md`

### Day 3 – Thứ 4 23/07: IaC & Deployment
- CloudFormation: stacks, StackSets, Change Sets, Drift detection
- Elastic Beanstalk: deployment policies (Rolling, Blue/Green)
- CodePipeline + CodeBuild + CodeDeploy — overview
- Tạo: `iac/iac.md`

### Day 4 – Thứ 5 24/07: Full Practice Test 1 + 2
- Làm đề #1 và #2 đầy đủ
- Ghi chú lại tất cả câu sai

### Day 5 – Thứ 6 25/07: Full Practice Test 3 + 4
- Làm đề #3 và #4
- Focus vào weak areas từ Test 1+2

### Day 6 – Thứ 7 26/07: Full Practice Test 5 + 6
- Làm đề #5 và #6
- Tổng hợp pattern câu hỏi hay sai

### Day 7 – CN 27/07: Review Weak Areas
- Liệt kê top 5 service bị sai nhiều nhất
- Đọc lại notes, không làm đề mới

### Day 8 – Thứ 2 28/07: Final Crunch
- Ôn IAM/VPC/RDS — những service phức tạp nhất
- Review tất cả key takeaway files

### Day 9 – Thứ 3 29/07: Ngày trước thi
- Đọc nhanh exam tips
- Nghỉ ngơi, ngủ sớm

### Day 10 – Thứ 4 30/07: THI AWS SAA-C03

---

## Phân bổ thời gian mỗi buổi (1-2 tiếng)

| Phần | Thời gian | Hoạt động |
|------|-----------|-----------|
| Lý thuyết | 30-40 phút | Đọc PDF + thảo luận |
| Luyện đề | 30-40 phút | Làm câu hỏi theo service |
| Ghi notes | 10-15 phút | Tạo file notes theo chuẩn |

---

## Thứ tự ưu tiên khi thiếu thời gian

Nếu 1 ngày chỉ có 1 tiếng, cắt theo thứ tự này:
1. Giữ nguyên: Luyện đề + ghi notes (thực hành quan trọng hơn)
2. Cắt bớt: Lý thuyết (đọc tóm tắt thay vì đọc kỹ)
3. Không cắt: Tuần 5 (full tests) — không bỏ bài thi thử

---

## Cấu trúc folder mỗi service

```
{service}/
├── {service}.md       ← lý thuyết từ cơ bản đến chi tiết (cheatsheet)
├── qa.md              ← tất cả thảo luận/hỏi đáp trong mọi session (append)
├── list_qa.md         ← danh sách câu hỏi từ 6 đề thi
├── exam1_q{M}.md      ← note chi tiết từng câu sau khi luyện
└── ...
```

### Mục đích từng file

**`{service}.md`** — Tài liệu đầy đủ từ cơ bản → advanced, viết như cheatsheet.
Nếu file đã tồn tại → KHÔNG ghi đè, append thêm với timestamp.

**`qa.md`** — Lưu tất cả thảo luận đã trao đổi qua các buổi học. Append, không ghi đè.

**`list_qa.md`** — Chỉ list câu hỏi từ 6 đề, format `exam{N}_q{M}`, một câu/dòng.

**`exam{N}_q{M}.md`** — Note chi tiết từng câu. Tạo ngay sau mỗi câu, không để dồn.

### Thứ tự tạo file mỗi session

1. Tạo folder `{service}/` nếu chưa tồn tại
2. Thảo luận lý thuyết → tạo/update `{service}.md`
3. Ghi lại thảo luận → append vào `qa.md`
4. Parse 6 HTML → tạo `list_qa.md`
5. Luyện từng câu → tạo `exam{N}_q{M}.md` ngay sau mỗi câu

---

## Quy tắc luyện đề

Làm **TẤT CẢ câu** trong `list_qa.md` — không bỏ sót, không chọn lọc.
Thứ tự: exam1 → exam6, từng câu một.
Mỗi câu: hỏi reasoning trước → reveal → giải thích → tạo file note.

---

## Verification cuối mỗi tuần

- Folder structure đúng chuẩn
- Số câu đã note == số câu trong `list_qa.md`
- `overview.md` đã cập nhật status
