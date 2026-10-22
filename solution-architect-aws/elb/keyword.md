# ELB — Khái niệm từ câu hỏi đề thi

## Chọn loại load balancer
- Application Load Balancer: HTTP/HTTPS, content-based routing, path-based routing (exam1_q2, exam1_q48)
- Network Load Balancer: TCP/UDP, IP tĩnh, đứng trước PrivateLink, bastion host HA (exam4_q9, exam1_q39, exam6_q56, exam6_q43)
- NLB route tới target theo primary private IP của instance (exam3_q13)
- ALB không trải qua nhiều Region (cấu hình ELB không hợp lệ) (exam6_q7)

## High availability
- ALB + Auto Scaling group trải nhiều AZ (exam1_q2, exam2_q8, exam2_q32, exam5_q7, exam6_q53)
- Cross-zone load balancing: chia đều theo instance hay theo AZ (exam3_q14)
- Route 53 phân phối tới các target sau load balancer (exam4_q59)

## Health check
- Instance unhealthy do security group không cho ALB vào, hoặc health check route sai (exam4_q26)
- ASG dùng EC2 health check trong khi ALB dùng ELB health check → ASG không thay instance (exam5_q1)
- Grace period, impaired status, ELB health check fail (exam2_q18)

## HTTPS và bảo mật
- Nhiều domain trên một listener: SSL certificate với SNI (exam4_q40)
- Wildcard *.example.com khớp test.example.com (exam4_q57)
- Security group EC2 chỉ cho phép từ security group của ALB (exam4_q52, exam2_q55)
- Cognito User Pool xác thực ở ALB (exam2_q17); AWS WAF gắn vào ALB (exam1_q6, exam2_q32)
