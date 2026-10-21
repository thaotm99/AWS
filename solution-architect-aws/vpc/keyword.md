# VPC — Khái niệm từ câu hỏi đề thi

Rút ra từ các câu trong `list_qa.md`. Mã câu ghi kèm để tra lại. Câu chỉ nhắc VPC làm bối cảnh
(khái niệm chính thuộc service khác) không liệt kê ở đây.

## Subnet, Route Table, Internet Gateway
- Điều kiện để instance ra internet: route tới Internet Gateway + NACL cho phép cả inbound/outbound (exam5_q63, exam4_q38)
- Internet Gateway thực hiện NAT cho instance có public IP (exam3_q9)
- VPC DNS: enableDnsHostnames + enableDnsSupport (cần cho Route 53 private hosted zone) (exam2_q20, exam6_q63)
- Instance tenancy: VPC dedicated thì instance luôn dedicated, bất kể launch template (exam3_q21)

## NAT gateway vs NAT instance
- NAT gateway đặt ở public subnet, managed, chỉ IPv4 (exam3_q44)
- High availability: mỗi AZ một NAT gateway + route table riêng mỗi AZ (exam3_q62, exam6_q13)
- NAT instance: dùng được làm bastion, gắn security group, hỗ trợ port forwarding (exam3_q12)

## Security Group vs Network ACL
- Security Group stateful, NACL stateless (phải mở cả chiều về) (exam3_q25, exam6_q8)
- Tham chiếu security group làm source: ALB → EC2 → RDS theo chuỗi (exam2_q28, exam2_q55, exam4_q52, exam4_q26)
- Source hợp lệ của inbound rule (không thể dùng Internet Gateway ID) (exam3_q65)
- Đọc rule security group trong CloudFormation (exam4_q17)
- Lỗi "connection timed out" tới database = thiếu rule security group (exam5_q29)
- Security group kiểm soát truy cập EFS (exam1_q12)

## VPC Endpoint và PrivateLink
- Gateway endpoint cho S3 và DynamoDB: miễn phí, thêm route trong route table (exam3_q47, exam5_q24, exam6_q64, exam6_q65, exam6_q50)
- Interface endpoint cho dịch vụ khác, ví dụ SQS (exam3_q7)
- PrivateLink: chia sẻ dịch vụ giữa VPC/account, NLB phía provider (exam1_q39, exam5_q9)

## Kết nối nhiều VPC
- VPC peering: rẻ nhất cho ít VPC, không transitive; dùng được inter-Region (exam4_q45, exam1_q42)
- Transit Gateway: hub cho nhiều VPC và on-premises, ECMP tăng throughput VPN (exam3_q16, exam4_q18, exam4_q28, exam5_q14, exam6_q12)
- VPC sharing qua AWS RAM (share subnet trong cùng Organization) (exam2_q36, exam3_q17, exam6_q41)
- Shared services VPC (exam2_q21)

## Kết nối on-premises
- Site-to-Site VPN: nhanh, rẻ, mã hóa; Virtual Private Gateway + Customer Gateway (exam3_q18, exam5_q10, exam5_q41, exam6_q25)
- Direct Connect: kết nối riêng; DX + VPN để mã hóa; VPN làm backup cho DX (exam1_q37, exam4_q48)
- Direct Connect gateway nối nhiều Region/VPC (exam4_q7); transit VIF với Transit Gateway (exam3_q16)
- Public VIF để truy cập S3 từ on-premises qua DX (exam6_q45)
- VPN CloudHub cho nhiều chi nhánh (exam6_q34)

## Chi phí mạng
- Dùng private IP thay public IP để giảm phí replication (exam6_q59)
- Tool đặt cùng Region với data warehouse, truy cập qua DX (exam5_q2)
