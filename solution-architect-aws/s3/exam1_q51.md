# Exam 1 — Câu 51

**Nguồn:** Đề #1, câu 51
**Service:** S3 — Performance / Prefix

## Câu hỏi
A file-hosting service uses Amazon S3 to power its storage offerings. Currently all customer files are uploaded directly under a single S3 bucket. The engineering team has started seeing scalability issues where customer file uploads have started failing during peak access hours with more than 5000 requests per second. Which of the following is the MOST resource efficient and cost-optimal way of addressing this issue?

## Các đáp án
- A. Create a new S3 bucket for each customer and upload each customer's files directly under the respective buckets
- B. Create a new S3 bucket for each day's data and upload the daily files directly under that day's bucket
- C. Use Amazon EFS instead of S3 for storing the customers' uploaded files
- D. Create customer-specific custom prefixes within the single S3 bucket and upload the daily files into those prefixed locations

## Đáp án đúng
**D. Create customer-specific custom prefixes within the single S3 bucket**

## Giải thích

### ✅ Tại sao D đúng
S3 giới hạn throughput **per prefix**: 3,500 PUT/s và 5,500 GET/s mỗi prefix. Không có giới hạn số prefix. Tạo prefix riêng mỗi customer (`/customer-A/`, `/customer-B/`...) → mỗi prefix có quota độc lập → throughput tổng nhân lên tuyến tính. Không tốn thêm chi phí, không cần thêm resource.

### ❌ Tại sao A sai
Tạo bucket riêng mỗi customer không cần thiết. Limit của S3 là per prefix, không phải per bucket. Overhead quản lý lớn, không cost-optimal.

### ❌ Tại sao B sai
Cùng lý do như A. Tạo bucket theo ngày không giải quyết throughput bottleneck và tạo overhead quản lý không cần thiết.

### ❌ Tại sao C sai
EFS là NFS file system, dùng cho use case shared POSIX filesystem (EC2, container). Không phù hợp cho object storage / file hosting public. Đắt hơn S3 nhiều.

## Người học trả lời
- Chọn: **D**
- Kết quả: ✅ Đúng

## Key takeaway
S3 performance limit là **per prefix**, không phải per bucket. Khi gặp throughput issue → spread prefix, không cần tạo bucket mới. 5,500 GET/s × N prefix = throughput thực tế.
