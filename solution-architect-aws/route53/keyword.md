# ROUTE53 — Khái niệm từ câu hỏi đề thi

## Bản ghi
- Alias record: trỏ apex domain tới tài nguyên AWS (CloudFront, ALB, S3) hoặc record khác, miễn phí truy vấn (exam2_q2, exam3_q19)
- CNAME record cho subdomain (www) (exam3_q64)
- TTL: client vẫn dùng kết quả cũ tới khi hết TTL (exam4_q3)

## Routing policies
- Latency routing: đưa khách tới Region có độ trễ thấp nhất (exam2_q6)
- Geolocation routing: giới hạn nội dung theo vị trí người dùng (exam1_q38)
- Geoproximity routing: thay đổi kích thước vùng địa lý bằng bias (exam4_q61)
- Failover (active-passive) + health check, trang lỗi tĩnh làm backup (exam5_q56, exam2_q59)
- Phân phối traffic tới các target sau load balancer theo AZ (exam4_q59)

## DNS lai (hybrid)
- Route 53 Resolver inbound endpoint (on-prem hỏi DNS của VPC) và outbound endpoint + forwarding rule (VPC hỏi DNS on-prem) (exam1_q63, exam3_q35)
- Private hosted zone cần enableDnsHostnames + enableDnsSupport (exam2_q20, exam6_q63)
