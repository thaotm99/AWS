# GLOBAL-INFRA — Khái niệm từ câu hỏi đề thi

Bài nền tảng của web `aws-cloud/`. Chỉ gồm khái niệm có câu đề trong `list_qa.md` kiểm tra.
Nhiều câu cũng thuộc service khác (EC2, VPC, RDS, CloudFront...); bài này chỉ dạy phần liên quan
tới Region, Availability Zone và Edge.

## Region là ranh giới tài nguyên
- AMI là tài nguyên cấp Region; Copy AMI sang Region khác tạo kèm snapshot ở Region đích (exam1_q41)
- Copy AMI sang mọi Region để khôi phục nhanh (DR) (exam4_q5)
- Amazon EFS là regional, truy cập từ Region khác qua inter-region VPC peering (exam1_q42)

## Availability Zone và High Availability
- EC2 trải nhiều AZ sau Load Balancer + Auto Scaling group (exam1_q2, exam2_q8, exam2_q32)
- Tên AZ (us-east-1a) khác nhau giữa các account; dùng AZ ID để chỉ đúng cùng một AZ (exam3_q22)
- NAT gateway là tài nguyên cấp AZ: đặt mỗi AZ một NAT gateway trong public subnet (exam3_q62)

## Edge location
- Amazon CloudFront: cache nội dung gần người dùng, origin ở xa hoặc on-premises (exam1_q62, exam6_q5, exam6_q58)
- S3 Transfer Acceleration: tăng tốc upload vào S3 qua edge location (exam1_q18, exam3_q37, exam6_q58)
- AWS Global Accelerator: TCP/UDP, 2 static anycast IP, failover nhanh giữa Region, không phụ thuộc DNS cache
  (exam1_q59, exam2_q7, exam2_q22, exam3_q8, exam3_q45, exam4_q58, exam5_q4, exam5_q30, exam5_q55)
- AWS Outposts: chạy dịch vụ AWS trong data center của mình khi dữ liệu phải ở on-premises (exam1_q27)

## Data transfer cost
- RDS Read Replica: cùng Region không tính phí replication, khác Region có tính phí (exam2_q62)
- EC2 private subnet → S3 cùng Region: dùng S3 gateway endpoint thay vì NAT gateway (exam3_q47)
- Giữ lưu lượng lớn trong AWS cùng Region, chỉ đưa phần nhỏ ra on-premises qua Direct Connect (exam5_q2)
