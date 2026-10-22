# COGNITO — Khái niệm từ câu hỏi đề thi

## Amazon Cognito
- User Pool tích hợp ALB để xác thực người dùng, không phải viết code đăng nhập (exam2_q17)
- Identity Pool cấp temporary AWS credentials cho người dùng federated (exam6_q50)
- Cognito làm identity provider cho Transfer Family (exam2_q4)

## IAM Identity Center (SSO)
- Đăng nhập một lần vào nhiều AWS account, permission sets theo least privilege (exam6_q10, exam4_q4)
- Kết hợp AD Connector hoặc AWS Managed Microsoft AD (exam1_q10, exam4_q4)

## AWS Directory Service
- AWS Managed Microsoft AD: chạy workload cần AD, trust relationship với AD on-premises (exam3_q28, exam6_q44)
- AD Connector: proxy tới AD on-premises, không lưu dữ liệu thư mục trên AWS (exam1_q10)
- FSx for Windows File Server tích hợp Active Directory (exam3_q5, exam3_q43)
