# Lịch ôn thi AWS SAA-C03 — theo ngày (16/09 – đầu 11/2026)

## Context

Người học có nền tảng AWS cơ bản. S3 học lại từ đầu (chưa học lý thuyết, chưa luyện câu nào).
Điểm yếu: Networking (VPC), IAM/Security, High Availability, Storage & DB.
Mục tiêu: Thi AWS SAA-C03 **đầu tháng 11/2026** (dự kiến 02–06/11, xác nhận ngày chính xác khi đăng ký).
Thời gian học: **3 tiếng/ngày, 6 ngày/tuần** (nghỉ Chủ nhật).
Có 6 bộ đề thực hành (HTML). Lý thuyết tra cứu trực tiếp từ AWS official documentation
(không dùng slide PDF 900 trang có sẵn trong repo — có thể chứa lỗi/lỗi thời).

Tổng cộng: **45 ngày học** (16/09 → 06/11), chia thành các chủ đề nối tiếp nhau
(không tính theo tuần): Networking → Security & IAM → Compute & HA → Storage & DB
→ Analytics/Messaging/Monitoring/IaC → Full Mock Test & Review.

---

## Ngày 1 – Thứ 4 16/09: VPC Cơ bản
- Subnets (public/private), Route Tables, IGW, NAT Gateway vs NAT Instance
- Tạo: `vpc/vpc.md` + `vpc/list_qa.md`

## Ngày 2 – Thứ 5 17/09: VPC Security
- Security Groups vs NACLs (stateful vs stateless), VPC Peering, VPC Endpoints (Gateway vs Interface)
- Luyện đề VPC (phần 1)

## Ngày 3 – Thứ 6 18/09: VPC Hybrid & Advanced
- Site-to-Site VPN, Client VPN, Direct Connect, Transit Gateway, PrivateLink, Reachability Analyzer
- Luyện đề VPC (phần 2)

## Ngày 4 – Thứ 7 19/09: S3 — List khái niệm + đào sâu lý thuyết cơ bản (học từ đầu)
- Bước 1: List khái niệm từ 78 câu trong `s3/list_qa.md` (đã có sẵn)
- Bước 2: Đào sâu khái niệm cơ bản — Buckets/Objects, Storage classes, Versioning,
  Bucket Policy vs ACL, Encryption (SSE-S3/SSE-KMS/SSE-C)
- Tạo mới `s3/s3.md`

**Nghỉ – Chủ nhật 20/09**

## Ngày 5 – Thứ 2 21/09: S3 luyện đề (bắt đầu từ câu đầu tiên)
- Luyện câu S3 từ đầu theo `s3/list_qa.md`, thứ tự exam1 → hết exam1
- Chưa có câu nào được làm trước đó — làm tuần tự, không bỏ sót

## Ngày 6 – Thứ 3 22/09: Route 53
- Routing policies (Simple, Weighted, Latency, Failover, Geolocation, Geoproximity, Multi-Value)
- Health checks, Private Hosted Zones
- Tạo: `route53/route53.md` + `route53/list_qa.md` + luyện đề

## Ngày 7 – Thứ 4 23/09: CloudFront + Global Accelerator
- Origin types, Cache behaviors, OAC vs OAI, Signed URLs vs Cookies
- CloudFront vs Global Accelerator — khi nào dùng cái nào
- Tạo: `cloudfront/cloudfront.md` + `cloudfront/list_qa.md` + luyện đề

## Ngày 8 – Thứ 5 24/09: Luyện đề tổng hợp Networking
- Làm hết câu VPC + Route53 + CloudFront còn sót trong 6 đề

## Ngày 9 – Thứ 6 25/09: Review Networking + Mini mock
- Review key insights, so sánh services (NAT GW vs Instance, CloudFront vs Global Accelerator…)
- Mini mock 15 câu Networking (không xem đáp án trước)

## Ngày 10 – Thứ 7 26/09: IAM Core
- Users/Groups/Roles/Policies, Policy evaluation logic, Permission boundaries
- Tạo: `iam/iam.md` + `iam/list_qa.md`

**Nghỉ – Chủ nhật 27/09**

## Ngày 11 – Thứ 2 28/09: IAM Advanced
- STS AssumeRole, Cross-account access, AWS Organizations, SCPs, Resource-based policies
- Inline vs Managed policies, AWS Managed vs Customer Managed
- Luyện đề IAM

## Ngày 12 – Thứ 3 29/09: KMS + ACM
- CMK types, key policies, SSE-S3 vs SSE-KMS vs SSE-C, CloudHSM
- ACM: certificates, Auto-renewal, với ALB/CloudFront
- Tạo: `kms/kms.md` + `kms/list_qa.md` + luyện đề

## Ngày 13 – Thứ 4 30/09: WAF + Shield + GuardDuty + Inspector
- WAF: Web ACL, rules, rule groups, với CloudFront/ALB/API GW
- Shield Standard vs Advanced
- GuardDuty + Macie + Inspector — phân biệt vai trò
- Tạo: `security/security.md` + luyện đề

## Ngày 14 – Thứ 5 01/10: Cognito + IAM Identity Center
- Cognito User Pools vs Identity Pools
- IAM Identity Center (SSO) — với Organizations
- Directory Service: AD Connector vs Simple AD vs AWS Managed Microsoft AD
- Tạo: `cognito/cognito.md`

## Ngày 15 – Thứ 6 02/10: Luyện đề tổng hợp Security
- Làm hết câu IAM + KMS + WAF/Security + Cognito còn sót

## Ngày 16 – Thứ 7 03/10: Review Security + Mini mock
- Review key insights + Mini mock 15 câu Security

**Nghỉ – Chủ nhật 04/10**

## Ngày 17 – Thứ 2 05/10: EC2 Deep
- Instance types (Compute/Memory/Storage/Accelerated), Placement Groups
- Pricing: On-Demand, Reserved, Spot, Dedicated
- Tạo: `ec2/ec2.md` + `ec2/list_qa.md`

## Ngày 18 – Thứ 3 06/10: EC2 luyện đề + ELB
- Luyện đề EC2
- ALB vs NLB vs GWLB — khi nào dùng cái nào; Target groups, Listener rules, Sticky sessions, Connection draining
- Tạo: `elb/elb.md` + `elb/list_qa.md`

## Ngày 19 – Thứ 4 07/10: Auto Scaling + luyện đề HA
- ASG: scaling policies (Target Tracking, Step, Scheduled, Predictive)
- Lifecycle hooks, Warm pools, Instance refresh
- Multi-AZ pattern với ASG + ELB — luyện đề ELB+ASG

## Ngày 20 – Thứ 5 08/10: ECS + EKS + Fargate
- ECS Launch types (EC2 vs Fargate), Task definitions, Services
- ECR, EKS Node types, Fargate Profiles
- Tạo: `containers/containers.md`

## Ngày 21 – Thứ 6 09/10: Lambda + API Gateway
- Lambda: concurrency, cold start, layers, destinations, event sources
- API Gateway: REST vs HTTP vs WebSocket, throttling, caching, integration types
- Tạo: `lambda/lambda.md`

## Ngày 22 – Thứ 7 10/10: Luyện đề tổng hợp Compute & HA + Mini mock
- Làm hết câu EC2+ELB+ASG+containers+Lambda còn sót
- Mini mock 15 câu Compute & HA

**Nghỉ – Chủ nhật 11/10**

## Ngày 23 – Thứ 2 12/10: S3 Advanced (hoàn tất)
- Storage classes + Intelligent-Tiering + Lifecycle policies
- S3 Transfer Acceleration, Presigned URLs, Object Lock (WORM), S3 Select
- Event notifications, Access Logs — update `s3/s3.md`
- Luyện nốt toàn bộ câu S3 còn lại trong `list_qa.md`

## Ngày 24 – Thứ 3 13/10: EBS + EFS + FSx
- EBS types (gp2/gp3/io1/io2/st1/sc1), Multi-Attach, Snapshots
- EFS: Performance modes, throughput modes, storage classes
- FSx: Windows (SMB) vs Lustre vs NetApp ONTAP vs OpenZFS
- Tạo: `storage/storage.md` + luyện đề

## Ngày 25 – Thứ 4 14/10: Storage Migration
- Storage Gateway: File/Volume/Tape Gateway
- DataSync, Snow Family (Snowcone/Snowball/Snowmobile)
- Tạo: `storage-migration/storage-migration.md`

## Ngày 26 – Thứ 5 15/10: RDS + Aurora
- RDS: Multi-AZ vs Read Replicas, backup vs snapshot
- Aurora: cluster architecture, Global Database, Aurora Serverless v2
- RDS Proxy, IAM auth for RDS
- Tạo: `rds/rds.md` + `rds/list_qa.md`

## Ngày 27 – Thứ 6 16/10: RDS luyện đề + DynamoDB
- Luyện đề đầy đủ RDS + Aurora
- Partition keys, GSI vs LSI, Capacity modes (Provisioned vs On-Demand)
- Tạo: `dynamodb/dynamodb.md` + `dynamodb/list_qa.md`

## Ngày 28 – Thứ 7 17/10: DynamoDB luyện đề + tổng hợp Storage&DB
- DAX, DynamoDB Streams, Global Tables + luyện đề DynamoDB
- Làm hết câu Storage & DB còn sót

**Nghỉ – Chủ nhật 18/10**

## Ngày 29 – Thứ 2 19/10: ElastiCache + Redshift + Athena
- ElastiCache Redis vs Memcached — khi nào dùng cái nào
- Redshift: cluster, Spectrum, RA3
- Athena: serverless query S3, với Glue Data Catalog
- Tạo: `analytics/analytics.md`

## Ngày 30 – Thứ 3 20/10: SQS + SNS + EventBridge
- SQS: Standard vs FIFO, visibility timeout, DLQ, long polling
- SNS: fan-out pattern, FIFO, message filtering
- EventBridge: event buses, rules, targets
- Tạo: `messaging/messaging.md`

## Ngày 31 – Thứ 4 21/10: Kinesis + luyện đề Messaging
- Kinesis: Data Streams vs Firehose vs Analytics
- Luyện đề SQS/SNS/EventBridge/Kinesis

## Ngày 32 – Thứ 5 22/10: Monitoring & Operations
- CloudWatch: Metrics, Logs, Alarms, Dashboards, Log Insights
- CloudTrail: management vs data events, Lake
- AWS Config: rules, remediation; X-Ray: tracing, sampling
- Tạo: `monitoring/monitoring.md`

## Ngày 33 – Thứ 6 23/10: IaC & Deployment
- CloudFormation: stacks, StackSets, Change Sets, Drift detection
- Elastic Beanstalk: deployment policies (Rolling, Blue/Green)
- CodePipeline + CodeBuild + CodeDeploy — overview
- Tạo: `iac/iac.md`

## Ngày 34 – Thứ 7 24/10: Luyện đề tổng hợp toàn bộ
- Rà lại **toàn bộ 6 đề**, làm hết mọi câu chưa có note ở bất kỳ service nào

**Nghỉ – Chủ nhật 25/10**

## Ngày 35 – Thứ 2 26/10: Full Practice Test 1 (đề #1, timed ~130 phút)
- Chấm điểm, không xem đáp án khi làm

## Ngày 36 – Thứ 3 27/10: Review Test 1
- Ghi note chi tiết từng câu sai, ôn lại service liên quan

## Ngày 37 – Thứ 4 28/10: Full Practice Test 2 (đề #2)

## Ngày 38 – Thứ 5 29/10: Review Test 2
- Ôn sâu lại VPC/IAM/RDS/DynamoDB (service phức tạp nhất)

## Ngày 39 – Thứ 6 30/10: Full Practice Test 3 (đề #3)

## Ngày 40 – Thứ 7 31/10: Review Test 3
- Tổng hợp danh sách "top lỗi hay sai" toàn bộ 3 test

**Nghỉ – Chủ nhật 01/11**

## Ngày 41 – Thứ 2 02/11: Full Practice Test 4 (đề #4)
- Mục tiêu ≥80%

## Ngày 42 – Thứ 3 03/11: Full Practice Test 5 (đề #5) + review nhanh

## Ngày 43 – Thứ 4 04/11: Full Practice Test 6 (đề #6) + review nhanh
- Tổng hợp cheat sheet cuối cùng (1 trang/service điểm yếu)

## Ngày 44 – Thứ 5 05/11: Final Crunch
- Đọc lại toàn bộ `{service}.md` của 4 mảng yếu: VPC, IAM/Security, HA (ELB/ASG), Storage & DB
- Đọc lại danh sách "top lỗi hay sai"

## Ngày 45 – Thứ 6 06/11: Trước thi
- Đọc lướt exam tips, không học kiến thức mới
- Nghỉ ngơi, ngủ sớm

**THI: theo lịch đăng ký thực tế (xác nhận ngày cụ thể)**

---

## Phân bổ thời gian mỗi buổi (3 tiếng)

| Phần | Thời gian | Hoạt động |
|------|-----------|-----------|
| Lý thuyết | 60-70 phút | Đọc AWS official docs + thảo luận sâu |
| Luyện đề | 75-90 phút | Làm câu hỏi theo service, hỏi reasoning trước khi reveal |
| Ghi notes | 20-30 phút | Tạo/update file notes theo chuẩn |

---

## Thứ tự ưu tiên khi thiếu thời gian

Nếu 1 ngày không đủ 3 tiếng, cắt theo thứ tự này:
1. Giữ nguyên: Luyện đề + ghi notes (thực hành quan trọng hơn)
2. Cắt bớt: Lý thuyết (đọc tóm tắt thay vì đọc kỹ)
3. Không cắt: Ngày 35-45 (full mock tests) — không bỏ bài thi thử

---

## Cấu trúc folder mỗi service

```
{service}/
├── list_qa.md         ← danh sách câu hỏi từ 6 đề thi (đầu Bước 1)
├── keyword.md         ← danh sách khái niệm từ câu hỏi (cuối Bước 1)
├── {service}.md       ← lý thuyết đã đào sâu, viết như cheatsheet (Bước 2)
├── qa.md              ← tất cả thảo luận/hỏi đáp trong mọi session (append)
├── exam1_q{M}.md      ← note chi tiết từng câu sau khi luyện (Bước 4)
└── ...
```

### Mục đích từng file

**`list_qa.md`** — Chỉ list câu hỏi từ 6 đề, format `exam{N}_q{M}`, một câu/dòng.

**`keyword.md`** — Danh sách khái niệm mà các câu hỏi kiểm tra, nhóm theo chủ đề.
Ghi đè mỗi lần ôn lại service (không append).

**`{service}.md`** — Tài liệu đầy đủ từ cơ bản → advanced, viết như cheatsheet.
Nếu file đã tồn tại → KHÔNG ghi đè, append thêm với timestamp.

**`qa.md`** — Lưu tất cả thảo luận đã trao đổi qua các buổi học. Append, không ghi đè.

**`exam{N}_q{M}.md`** — Note chi tiết từng câu. Tạo ngay sau mỗi câu, không để dồn.

### Thứ tự tạo file mỗi session (question-driven)

1. Tạo folder `{service}/` nếu chưa tồn tại
2. Parse 6 HTML → tạo `list_qa.md`
3. List khái niệm mà các câu hỏi đó kiểm tra → tạo `keyword.md`
4. Đào sâu từng khái niệm (sau mỗi khái niệm, hỏi có muốn thực hành hands-on kèm chi phí
   ước tính $ không — xem chi tiết trong `CLAUDE.md`) → tạo/update `{service}.md`
5. Ghi lại thảo luận → append vào `qa.md`
6. Luyện từng câu theo `list_qa.md` → tạo `exam{N}_q{M}.md` ngay sau mỗi câu

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
