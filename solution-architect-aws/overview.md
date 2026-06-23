# AWS SAA-C03 — Tổng quan services cần học

**Ngày thi dự kiến:** 30/07/2026
**Bắt đầu:** 23/06/2026
**Thời gian học:** 1-2 tiếng/tối

## Trạng thái từng service

| Service | Folder | Status | Tuần | Số câu đề thi |
|---------|--------|--------|------|--------------|
| VPC | vpc/ | [ ] | 1 | ? |
| Route 53 | route53/ | [ ] | 1 | ? |
| CloudFront + Global Accelerator | cloudfront/ | [ ] | 1 | ? |
| IAM | iam/ | [ ] | 2 | ? |
| KMS + ACM | kms/ | [ ] | 2 | ? |
| WAF + Shield + GuardDuty | security/ | [ ] | 2 | ? |
| Cognito + IAM Identity Center | cognito/ | [ ] | 2 | ? |
| EC2 | ec2/ | [ ] | 3 | ? |
| EBS + EFS + FSx | storage/ | [ ] | 3 | ? |
| ELB | elb/ | [ ] | 3 | ? |
| Auto Scaling (ASG) | asg/ | [ ] | 3 | ? |
| ECS + EKS + Fargate | containers/ | [ ] | 3 | ? |
| Lambda + API Gateway | lambda/ | [ ] | 3 | ? |
| S3 | s3/ | [ ] | 4 | ? |
| Storage Gateway + Snow Family | storage-migration/ | [ ] | 4 | ? |
| RDS + Aurora | rds/ | [ ] | 4 | ? |
| DynamoDB | dynamodb/ | [ ] | 4 | ? |
| ElastiCache + Redshift + Athena | analytics/ | [ ] | 4 | ? |
| SQS + SNS + EventBridge | messaging/ | [ ] | 5 | ? |
| Kinesis | kinesis/ | [ ] | 5 | ? |
| CloudWatch + CloudTrail + Config | monitoring/ | [ ] | 5 | ? |
| CloudFormation + Elastic Beanstalk | iac/ | [ ] | 5 | ? |

## Ghi chú status

- `[ ]` — chưa học
- `[T]` — đã học lý thuyết (có `{service}.md` và `list_qa.md`)
- `[x]` — hoàn thành cả lý thuyết lẫn luyện đề

## Cấu trúc folder mỗi service

```
{service}/
├── {service}.md       ← lý thuyết từ cơ bản đến advanced (cheatsheet)
├── qa.md              ← tất cả thảo luận/hỏi đáp các session
├── list_qa.md         ← danh sách câu hỏi từ 6 đề thi
├── exam1_q{M}.md      ← note chi tiết từng câu sau khi luyện
└── ...
```
