# EC2 — Khái niệm từ câu hỏi đề thi

Rút ra từ các câu trong `list_qa.md`. Mã câu ghi kèm để tra lại. EC2 xuất hiện làm bối cảnh trong
rất nhiều câu; chỉ liệt kê khái niệm mà câu hỏi thực sự kiểm tra về EC2.

## Purchasing options
- Spot Instance: rẻ tới 90%, bị thu hồi với thông báo 2 phút; hợp workload chịu gián đoạn (exam1_q21, exam4_q46, exam6_q2)
- Spot request persistent/one-time, hủy request không terminate instance; Spot Fleet giữ target capacity (exam3_q51, exam6_q2, exam6_q18)
- Spot Fleet cho batch chịu lỗi (exam2_q49)
- Kết hợp Reserved Instances cho baseline + On-Demand/Spot cho phần biến động (exam2_q33, exam2_q35, exam4_q49, exam5_q60)
- Savings Plans: Compute Savings Plan áp dụng EC2, Fargate, Lambda (exam6_q38); Budgets theo dõi coverage (exam6_q1)
- Dedicated Instances: single-tenant rẻ nhất (exam2_q23, exam6_q21)
- Dedicated Hosts: dùng license gắn với server (BYOL) (exam6_q33)
- Tenancy của VPC dedicated ghi đè launch template (exam3_q21)

## AMI, User data, khởi động
- Golden AMI cho phần tĩnh + user data cho phần động (exam4_q1)
- User data chạy với quyền root, mặc định chỉ chạy lần boot đầu (exam2_q19, exam6_q11)
- AMI: copy giữa Region, share cho account khác, AMI từ snapshot mã hóa không tạo bản không mã hóa (exam3_q55, exam1_q41, exam4_q5)
- EC2 Hibernate giảm thời gian khởi động lại (exam2_q51)

## Placement group và mạng
- Cluster placement group: độ trễ mạng thấp, throughput cao cho HPC (exam1_q23, exam4_q20, exam4_q60)
- Elastic Fabric Adapter (EFA) cho HPC (exam6_q36)
- Elastic IP gắn lại bằng user data khi instance được thay (exam6_q57)
- Dùng private IP để giảm phí truyền dữ liệu (exam6_q59)

## Storage gắn với EC2
- Instance store: hiệu năng cao nhất, tạm thời, không detach/attach sang instance khác, không giữ trong AMI (exam1_q43, exam5_q43, exam5_q52, exam6_q42)
- EBS io1 cho IOPS cao; st1/sc1 không làm boot volume; Multi-Attach chỉ với Provisioned IOPS (exam3_q27, exam5_q22, exam1_q44, exam6_q24)
- EBS mã hóa: dữ liệu at rest, snapshot và dữ liệu giữa volume-instance đều mã hóa (exam5_q40)

## Khôi phục và vận hành
- CloudWatch alarm action: recover (giữ instance ID, IP, metadata; chỉ với EBS) và reboot (exam3_q38, exam3_q57, exam5_q19)
- Detailed monitoring: metric mỗi 1 phút (exam5_q20)
- EC2 Instance Connect: SSH qua console bằng key tạm (exam5_q31)
- Bastion host high availability: NLB + Auto Scaling group (exam6_q56)
- Cost Optimization Hub + Compute Optimizer tìm instance dư thừa (exam4_q30)
