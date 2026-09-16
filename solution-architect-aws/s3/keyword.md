# S3 — Khái niệm từ câu hỏi đề thi

## Fundamentals
- Bucket
- Object
- Key / Prefix

## Storage Classes & Lifecycle
- S3 Standard
- S3 Standard-IA
- S3 One Zone-IA
- S3 Intelligent-Tiering
- S3 Glacier Instant Retrieval
- S3 Glacier Flexible Retrieval
- S3 Glacier Deep Archive
- Lifecycle transition rules (valid/invalid transitions)
- S3 Storage Class Analysis

## Versioning & Object Lock
- Versioning
- MFA Delete
- Object Lock — Governance mode
- Object Lock — Compliance mode
- Legal Hold (WORM)

## Encryption
- SSE-S3
- SSE-KMS
- Bucket Keys (giảm chi phí KMS)
- SSE-C
- Client-side encryption
- DSSE-KMS (dual-layer)

## Access Control
- Bucket Policy
- IAM Policy
- ACL (Access Control List)
- S3 Access Points
- Cross-account access (bucket owner vs object owner, bucket-owner-full-control)
- Least-privilege theo prefix

## Networking
- VPC Gateway Endpoint (cho S3)
- VPC Interface Endpoint
- NAT Gateway cost avoidance

## Performance & Upload
- S3 Transfer Acceleration
- Multipart Upload
- Request rate / partitioning

## Static Website Hosting + CloudFront
- S3 Static Website Hosting
- Origin Access Control (OAC) vs Origin Access Identity (OAI)
- Signed URL / Signed Cookie
- Restrict access chỉ qua CloudFront

## Event-driven Processing
- S3 Event Notifications
- Lambda trigger từ S3
- SQS/SNS trigger từ S3

## Data Lake Analytics
- Amazon Athena (query trực tiếp trên S3)
- AWS Glue Crawler / ETL / DataBrew
- Redshift Spectrum
- Redshift ML

## Data Migration vào S3
- AWS DataSync
- AWS Transfer Family (SFTP)
- Snow Family
- Direct Connect (Public VIF cho S3)

## Security Monitoring
- Amazon Macie (dò dữ liệu nhạy cảm)
- GuardDuty S3 Protection
- IAM Access Analyzer
- AWS Config (audit versioning/compliance)

## So sánh chi phí lưu trữ
- S3 vs EBS vs EFS theo access pattern
