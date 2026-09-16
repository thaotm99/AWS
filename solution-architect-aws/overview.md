# AWS SAA-C03 — Tổng quan services cần học

**Ngày thi dự kiến:** đầu tháng 11/2026 (dự kiến 02–06/11, xác nhận ngày chính xác khi đăng ký)
**Bắt đầu:** 16/09/2026
**Thời gian học:** 3 tiếng/ngày, 6 ngày/tuần (nghỉ Chủ nhật)
**Lịch chi tiết theo ngày:** xem `STUDY_PLAN.md`

## Trạng thái từng service

| Service | Folder | Status | Ngày học | Số câu đề thi |
|---------|--------|--------|----------|--------------|
| S3 | s3/ | [ ] | 1-2, 23 | 78 |
| VPC | vpc/ | [ ] | 3-5, 8 | 48 |
| Route 53 | route53/ | [ ] | 6 | 12 |
| CloudFront + Global Accelerator | cloudfront/ | [ ] | 7 | 8 |
| IAM | iam/ | [ ] | 10-11 | 22 |
| KMS + ACM | kms/ | [ ] | 12 | 6 |
| WAF + Shield + GuardDuty | security/ | [ ] | 13 | 4 |
| Cognito + IAM Identity Center | cognito/ | [ ] | 14 | 4 |
| EC2 | ec2/ | [ ] | 17-18 | 130 |
| ELB | elb/ | [ ] | 18-19 | 38 |
| Auto Scaling (ASG) | asg/ | [ ] | 19 | 22 |
| ECS + EKS + Fargate | containers/ | [ ] | 20 | 8 |
| Lambda + API Gateway | lambda/ | [ ] | 21 | 15 |
| EBS + EFS + FSx | storage/ | [ ] | 24 | 20 |
| Storage Gateway + Snow Family | storage-migration/ | [ ] | 25 | 3 |
| RDS + Aurora | rds/ | [ ] | 26-27 | 46 |
| DynamoDB | dynamodb/ | [ ] | 27-28 | 14 |
| ElastiCache + Redshift + Athena | analytics/ | [ ] | 29 | 5 |
| SQS + SNS + EventBridge | messaging/ | [ ] | 30 | 13 |
| Kinesis | kinesis/ | [ ] | 31 | 3 |
| CloudWatch + CloudTrail + Config | monitoring/ | [ ] | 32 | 7 |
| CloudFormation + Elastic Beanstalk | iac/ | [ ] | 33 | 3 |

> **Về số câu đề thi:** đếm bằng keyword-matching trên nội dung câu hỏi (không tính
> phần giải thích/đáp án sai) từ 390 câu trong 6 đề — dùng để ước lượng khối lượng,
> số chính xác sẽ chốt khi tạo `list_qa.md` thủ công cho từng service (Bước 1 mỗi
> session). Một câu có thể thuộc nhiều service cùng lúc (vd: câu hỏi vừa có EC2 vừa
> có RDS) nên tổng các dòng > 390. Có 90/390 câu không khớp keyword của 22 service
> trên (thuộc service khác ngoài phạm vi ôn, ví dụ Systems Manager, Step Functions...).

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
