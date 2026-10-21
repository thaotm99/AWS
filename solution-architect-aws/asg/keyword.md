# ASG — Khái niệm từ câu hỏi đề thi

## Scaling policies
- Target tracking (ví dụ CPU 50%) (exam1_q30)
- Target tracking theo metric SQS (backlog, ApproximateNumberOfMessages) (exam3_q54, exam6_q52)
- Scheduled action cho tải biết trước (exam1_q45)
- Predictive scaling + dynamic scaling (exam4_q21)
- Auto Scaling cho ECS service theo CPU (exam3_q15); Cluster Autoscaler cho EKS dựa trên ASG (exam4_q56)
- Aurora Auto Scaling cho replica; DynamoDB auto scaling (exam3_q50, exam5_q27)

## Capacity và high availability
- Min/max/desired; chia đều qua nhiều AZ để luôn đủ instance khi mất 1 AZ (exam2_q31, exam5_q61, exam6_q53)
- min=max=desired=1 trải 2 AZ để tự thay instance (exam6_q57)
- RI cho minimum capacity, Spot cho phần tăng thêm (exam4_q49, exam5_q60, exam5_q36, exam2_q33)

## Hành vi của ASG
- Default termination policy: chọn AZ nhiều instance nhất, rồi launch template/configuration cũ nhất (exam2_q65, exam4_q16)
- Rebalancing giữa các AZ, thay instance unhealthy (exam1_q54)
- Standby state và suspend ReplaceUnhealthy để bảo trì (exam1_q32)
- Health check type EC2 vs ELB (exam5_q1, exam2_q18)
