# Exam 1 — Câu 8

**Nguồn:** Đề #1, câu 8
**Service:** S3 — Storage Classes / Lifecycle

## Câu hỏi
A media agency stores its re-creatable assets on Amazon S3 buckets. The assets are accessed by a large number of users for the first few days and the frequency of access falls down drastically after a week. Although the assets would be accessed occasionally after the first week, but they must continue to be immediately accessible when required. The cost of maintaining all the assets on S3 storage is turning out to be very expensive and the agency is looking at reducing costs as much as possible. Suggest a way to lower storage costs while fulfilling the business requirements.

## Các đáp án
- A. Configure a lifecycle policy to transition the objects to S3 Standard-IA after 30 days
- B. Configure a lifecycle policy to transition the objects to S3 Standard-IA after 7 days
- C. Configure a lifecycle policy to transition the objects to S3 One Zone-IA after 30 days
- D. Configure a lifecycle policy to transition the objects to S3 One Zone-IA after 7 days

## Đáp án đúng
**C. One Zone-IA sau 30 ngày**

## Giải thích

### ✅ Tại sao C đúng
Hai biến cần phân tích độc lập:

**Storage class:** "re-creatable assets" → One Zone-IA là phù hợp. One Zone-IA lưu 1 AZ duy nhất, rẻ hơn Standard-IA 20%. Rủi ro mất data nếu AZ destroy là chấp nhận được vì data có thể recreate. Yêu cầu "immediately accessible" được đáp ứng vì One Zone-IA có retrieval tức thì (không phải Glacier).

**Số ngày:** AWS lifecycle rules có constraint bắt buộc — minimum **30 ngày** trước khi transition từ Standard sang Standard-IA hoặc One Zone-IA. Không thể transition sau 7 ngày dù business pattern thay đổi sớm hơn.

### ❌ Tại sao A sai
Đúng số ngày (30) nhưng sai storage class. Standard-IA đắt hơn One Zone-IA 20% trong khi data là re-creatable → không tối ưu cost.

### ❌ Tại sao B sai
Standard-IA sau 7 ngày — vi phạm minimum 30-day transition duration. Ngoài ra cũng sai storage class.

### ❌ Tại sao D sai
One Zone-IA đúng nhưng 7 ngày vi phạm minimum 30-day transition duration của AWS lifecycle rules.

## Người học trả lời
- Chọn: **A**
- Kết quả: ❌ Sai
- Nhầm điểm: Chọn đúng 30 ngày nhưng nhầm Standard-IA thay vì One Zone-IA — bỏ qua keyword "re-creatable"

## Key takeaway
- Keyword **"re-creatable"** → tín hiệu dùng **One Zone-IA** (rẻ hơn 20%, chấp nhận mất data khi AZ down)
- Minimum transition lifecycle Standard → IA class = **30 ngày** (constraint cứng của AWS)
- "Immediately accessible" → loại Glacier (retrieval mất giờ)
