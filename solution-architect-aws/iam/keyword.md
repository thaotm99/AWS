# IAM — Khái niệm từ câu hỏi đề thi

Rút ra từ các câu trong `list_qa.md`. Mã câu ghi kèm để tra lại. Câu chỉ nhắc IAM làm bối cảnh
không liệt kê ở đây.

## Root user và best practices
- Root user: mật khẩu mạnh + bật MFA (exam1_q31); email root dùng alias tới hộp thư tập trung (exam6_q40)
- MFA cho người dùng đặc quyền, CloudTrail ghi lại hành động IAM (exam1_q16)
- IAM group: gán policy cho nhóm người dùng (exam6_q29)

## IAM Role
- EC2 truy cập AWS service: IAM role qua instance profile, không lưu access key (exam2_q3, exam3_q23)
- Lambda dùng execution role; IAM authentication từ Lambda tới RDS (exam4_q39)
- Cross-account: tạo role ở account đích, user assume role (exam1_q17); Lambda account A đọc S3 account B cần role + bucket policy (exam2_q16)
- IAM Roles for Service Accounts (IRSA) trên EKS cho least privilege từng Pod (exam1_q5)
- Trust policy là resource-based policy duy nhất của IAM (exam4_q34)

## Đọc và viết policy
- Condition aws:SourceIp, aws:RequestedRegion (exam2_q37, exam2_q38, exam2_q48)
- s3:ListBucket trên bucket ARN, s3:GetObject/DeleteObject trên bucket/* (exam2_q54, exam1_q58)
- Permissions boundary: giới hạn quyền tối đa, chống leo thang đặc quyền (exam1_q25, exam2_q39)
- IAM Access Analyzer: tìm tài nguyên bị chia sẻ ra ngoài account/organization (exam5_q17)

## AWS Organizations
- Service control policy (SCP): giới hạn mọi user/role kể cả root của member account, không ảnh hưởng service-linked role (exam3_q59)
- SCP chặn sửa CloudTrail ở account developer (exam2_q43)
- Tag policy + SCP bắt buộc tag (exam5_q18)
- Control Tower quản trị nhiều account; AWS RAM chia sẻ subnet (exam6_q41, exam2_q36, exam3_q17)
- CloudFormation StackSets triển khai nhiều account/Region (exam3_q36)
- AWS Budgets actions giới hạn chi tiêu account (exam6_q22)
