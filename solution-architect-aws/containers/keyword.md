# CONTAINERS — Khái niệm từ câu hỏi đề thi

## Amazon ECS
- EC2 launch type tính tiền theo EC2 + EBS; Fargate tính theo vCPU và memory của task (exam1_q14)
- Fargate: serverless, không quản lý server (exam3_q32, exam4_q33, exam6_q35)
- Fargate + EFS cho storage bền vững (exam3_q32)
- EventBridge Scheduler chạy Fargate task theo lịch (exam2_q27)
- Auto Scaling cho ECS service (exam3_q15)

## Amazon EKS
- EKS + Fargate: không quản lý node (exam2_q1, exam4_q33)
- IAM Roles for Service Accounts (IRSA) cho least privilege từng Pod (exam1_q5)
- Cluster Autoscaler tích hợp EC2 Auto Scaling group (exam4_q56)
- EKS Anywhere trên Outposts khi dữ liệu phải ở on-premises (exam1_q27)
