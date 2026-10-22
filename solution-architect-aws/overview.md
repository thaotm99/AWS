# AWS SAA-C03 — Tổng quan services cần học

**Ngày thi dự kiến:** đầu tháng 11/2026 (dự kiến 02–06/11, xác nhận ngày chính xác khi đăng ký)
**Bắt đầu:** 16/09/2026
**Thời gian học:** 3 tiếng/ngày, 6 ngày/tuần (nghỉ Chủ nhật)
**Lịch chi tiết theo ngày:** xem `STUDY_PLAN.md`

## Trạng thái từng service

| Service | Folder | Status | Ngày học | Số câu đề thi |
|---------|--------|--------|----------|--------------|
| S3 | s3/ | [ ] | 4-5, 23 | 79 |
| VPC + VPN + Direct Connect + Transit Gateway | vpc/ | [ ] | 1-3, 8 | 67 |
| Route 53 | route53/ | [ ] | 6 | 14 |
| CloudFront + Global Accelerator | cloudfront/ | [ ] | 7 | 28 |
| IAM + Organizations | iam/ | [ ] | 10-11 | 39 |
| KMS + ACM + Secrets Manager | kms/ | [ ] | 12 | 14 |
| WAF + Shield + GuardDuty + Macie | security/ | [ ] | 13 | 14 |
| Cognito + IAM Identity Center + Directory Service | cognito/ | [ ] | 14 | 10 |
| EC2 | ec2/ | [ ] | 17-18 | 148 |
| ELB | elb/ | [ ] | 18-19 | 54 |
| Auto Scaling (ASG) | asg/ | [ ] | 19 | 39 |
| ECS + EKS + Fargate | containers/ | [ ] | 20 | 15 |
| Lambda + API Gateway | lambda/ | [ ] | 21 | 31 |
| EBS + EFS + FSx | storage/ | [ ] | 24 | 41 |
| Storage Gateway + Snow Family + DataSync + DMS | storage-migration/ | [ ] | 25 | 21 |
| RDS + Aurora | rds/ | [ ] | 26-27 | 54 |
| DynamoDB | dynamodb/ | [ ] | 27-28 | 23 |
| ElastiCache + Redshift + Athena + Glue/EMR | analytics/ | [ ] | 29 | 19 |
| SQS + SNS + EventBridge + Step Functions | messaging/ | [ ] | 30 | 33 |
| Kinesis + MSK | kinesis/ | [ ] | 31 | 12 |
| CloudWatch + CloudTrail + Config + Systems Manager | monitoring/ | [ ] | 32 | 17 |
| CloudFormation + Elastic Beanstalk | iac/ | [ ] | 33 | 5 |
| AWS Backup + Disaster Recovery strategies | backup-dr/ | [ ] | - | 8 |
| Cost tools + AI/ML + dịch vụ khác | others/ | [ ] | - | 10 |

> **Về số câu đề thi:** số chính xác, đếm từ `{service}/list_qa.md`. Mỗi `list_qa.md` được tạo bằng
> cách quét toàn bộ 390 câu trong 6 đề: một câu thuộc service khi service đó xuất hiện trong đề bài
> hoặc trong đáp án đúng (không tính đáp án sai). Một câu có thể thuộc nhiều service nên tổng các
> dòng > 390; cả 390 câu đều nằm trong ít nhất một `list_qa.md`. `s3/` và `dynamodb/` giữ nguyên
> danh sách đã soạn tay trong các buổi học. Khái niệm mỗi service nằm trong `{service}/keyword.md`.

## Full Mock Tests (từ Ngày 35)

| Test | Ngày học | Ngày/tháng | Status | Điểm |
|------|---------|-----------|--------|------|
| Đề #1 | 35 | 26/10 | [ ] | - |
| Đề #2 | 37 | 28/10 | [ ] | - |
| Đề #3 | 39 | 30/10 | [ ] | - |
| Đề #4 | 41 | 02/11 | [ ] | - |
| Đề #5 | 42 | 03/11 | [ ] | - |
| Đề #6 | 43 | 04/11 | [ ] | - |

## Ghi chú status

- `[ ]` — chưa học
- `[T]` — đã học lý thuyết (có `{service}.md` và `list_qa.md`)
- `[x]` — hoàn thành cả lý thuyết lẫn luyện đề

## Cấu trúc folder mỗi service

```
{service}/
├── {service}.md       ← lý thuyết từ cơ bản đến chi tiết (cheatsheet)
├── qa.md              ← tất cả thảo luận/hỏi đáp các session
├── list_qa.md         ← danh sách câu hỏi từ 6 đề thi
├── exam1_q{M}.md      ← note chi tiết từng câu sau khi luyện
└── ...
```
