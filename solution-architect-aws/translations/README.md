# Bản dịch tiếng Việt của 6 đề luyện thi

`vi/practice-test-N.json` chứa bản dịch đề N, dạng:

```json
{ "<id câu hỏi>": { "prompt": "<html>", "answers": ["<html>", "..."], "explanation": "<html>" } }
```

Trang Luyện đề (`aws-cloud/site`) đọc file này lúc build. Câu nào chưa có bản dịch thì hiện bản tiếng Anh gốc.

## Công cụ

```bash
node tools/extract.mjs 3 1 10        # in câu 1–10 của đề 3 (HTML gốc) để dịch
node tools/merge.mjs 3 chunk.json    # gộp một đợt bản dịch vào vi/practice-test-3.json
node tools/validate.mjs 3            # kiểm tra: đủ câu, đủ phương án, giữ nguyên thẻ HTML, link, ảnh
```

## Quy ước dịch

Văn phong của tài liệu kỹ thuật: câu hoàn chỉnh, chính xác, trang trọng; không dùng khẩu ngữ.

**Giữ nguyên tiếng Anh**
- Tên dịch vụ và tính năng AWS, đúng cách AWS viết: Amazon S3, S3 Standard-IA, Amazon EC2, Auto Scaling group, Application Load Balancer, AWS Lambda, Amazon RDS, Multi-AZ, Read Replica, Amazon Aurora, Amazon DynamoDB, DynamoDB Accelerator (DAX), Amazon CloudFront, AWS Global Accelerator, AWS WAF, AWS Shield, AWS KMS, AWS Organizations, Service Control Policy (SCP), AWS Direct Connect, Site-to-Site VPN, Transit Gateway, NAT gateway, Internet Gateway, VPC endpoint, PrivateLink, Security Group, network ACL, Spot Instance, Reserved Instance, Savings Plans, Amazon SQS, Amazon SNS, Amazon EventBridge, AWS Step Functions, Amazon Kinesis Data Streams, Amazon Data Firehose…
- Khái niệm kỹ thuật đã quen dùng nguyên tiếng Anh: Region, Availability Zone (AZ), edge location, bucket, object, instance, snapshot, AMI, volume, cluster, endpoint, subnet, route table, policy, role, IAM user, principal, throughput, latency, IOPS, failover, RPO, RTO, cache, TTL, API, SDK, CLI, on-premises, workload, data lake, ETL, serverless, microservices.
- Tên API, tham số, giá trị cấu hình, đoạn code, đường dẫn, URL, mã lỗi (`ProvisionedThroughputExceededException`, `s3:GetObject`, `0.0.0.0/0`…).
- Chữ IN HOA nhấn mạnh trong đề giữ dạng in hoa sau khi dịch: "MOST cost-effective" → "tiết kiệm chi phí NHẤT", "LEAST operational overhead" → "ít chi phí vận hành NHẤT".

**Dịch sang tiếng Việt**

| Tiếng Anh | Tiếng Việt |
|---|---|
| company / organization / enterprise | công ty / tổ chức / doanh nghiệp |
| Solutions Architect | Solutions Architect (giữ nguyên chức danh) |
| As a Solutions Architect, which of the following… | Với vai trò Solutions Architect, giải pháp nào sau đây… |
| Which of the following options… | Phương án nào sau đây… |
| (Select two) / (Select three) | (Chọn hai) / (Chọn ba) |
| MOST cost-effective | tiết kiệm chi phí NHẤT |
| operational overhead | chi phí vận hành |
| highly available / high availability | có tính sẵn sàng cao / tính sẵn sàng cao |
| fault-tolerant / durable / scalable | chịu lỗi / bền vững / có khả năng mở rộng |
| requirement / constraint | yêu cầu / ràng buộc |
| Correct option: / Correct options: | Phương án đúng: |
| Incorrect options: | Phương án sai: |
| References: | Tài liệu tham khảo: |
| Exam Alert: | Lưu ý khi thi: |
| decouple | tách rời (decouple) |
| archive / archival | lưu trữ dài hạn (archive) |
| ingest | tiếp nhận |
| via - | via - (giữ nguyên, đứng trước link nguồn ảnh) |

**Trung thành với bản gốc**
- Dịch đúng những gì bản gốc viết, kể cả khi bản gốc có chỗ nhầm (ví dụ đề 4 câu 52 ghi "Auto Scaling group" ở chỗ có lẽ muốn nói Application Load Balancer): không tự sửa nội dung trong bản dịch.

**HTML**
- Giữ nguyên mọi thẻ và thứ tự thẻ (`<p>`, `<strong>`, `<a href>`, `<img src>`, `<code>`, `<pre>`, `<li>`…), chỉ dịch phần chữ bên trong.
- Không đổi `href`, `src`, nội dung `<code>`/`<pre>`.
- Phương án trả lời giữ đúng thứ tự gốc (đáp án đúng được xác định theo thứ tự này).
