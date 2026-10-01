# DYNAMODB — Thảo luận / Hỏi đáp

## Session 2026-09-23

### Khái niệm #1: Fundamentals & Data model

**Q: "GSI: partition key và sort key đều có thể khác table gốc" nghĩa là gì?**

DynamoDB chỉ tìm nhanh theo primary key. Ví dụ table `Orders` (PK = `CustomerId`,
SK = `OrderDate`): query "đơn của C1" rất nhanh, nhưng "tất cả đơn `PENDING`" phải
**Scan** toàn table (chậm, tốn RCU) vì `Status` không phải key.

GSI = một "bản sao" dữ liệu được DynamoDB tự duy trì, tổ chức theo key khác. Tạo GSI
với PK = `Status`, SK = `OrderDate` → query "đơn PENDING" đi thẳng vào nhóm PENDING.
"Khác table gốc" = được chọn **bất kỳ attribute nào** làm PK/SK của GSI.
"Global" = index trải trên toàn bộ table, không bị bó trong 1 partition key.

- GSI tự động cập nhật khi ghi vào base table, nhưng **bất đồng bộ** → đọc GSI là
  eventually consistent
- Key của GSI không cần unique (nhiều đơn cùng `PENDING`)

**Q: "Table gốc" là gì? Có phải key khai báo lúc tạo table thì mới được làm LSI?**

- "Table gốc" = **base table** = table thật chứa dữ liệu; index là bản phụ sinh từ nó
- Hiểu đúng 1 nửa: LSI **bắt buộc dùng lại partition key** của base table và **chỉ tạo
  được lúc tạo table** — nhưng **sort key của LSI có thể là bất kỳ attribute nào khác**
  (string/number/binary), không cần là key đã khai báo
- Quy tắc LSI: base table phải có composite key; LSI PK = base table PK; LSI SK là
  attribute khác SK gốc; không thêm/xóa sau khi tạo table
- Cách chọn: "Lúc query có biết partition key không?" → Có: LSI được. Không: phải GSI

| | GSI | LSI |
|---|---|---|
| Partition key | Tùy chọn, khác base table được | Phải giống base table |
| Sort key | Tùy chọn | Khác base table |
| Phạm vi query | Toàn table | Trong 1 partition key |
| Tạo khi nào | Bất kỳ lúc nào | Chỉ lúc tạo table |
| Số lượng | 20 (default quota) | 5 |

**Câu kiểm tra** (table `Orders`, PK = `CustomerId`, SK = `OrderDate`):
1. "Đơn của C1 trong tháng 9/2026" query hiệu quả không? → ✅ Có — PK xác định partition,
   range trên sort key đọc đúng item cần (item đã sắp theo SK)
2. "Tất cả đơn `PENDING`" dùng GSI hay LSI? → ✅ GSI — không biết `CustomerId`, LSI vẫn
   cần partition key

### Khái niệm #2: Capacity & Performance

Tóm tắt đã học:
- 1 RCU = 1 strongly consistent read/s (hoặc 2 eventually consistent) cho item ≤ 4 KB;
  1 WCU = 1 write/s cho item ≤ 1 KB; transactional tốn gấp đôi
- On-Demand: pay-per-request, không traffic = không tốn tiền throughput, scale tức thì tới
  2× peak trước đó, là mode **mặc định & AWS recommend** cho đa số workload
- Provisioned: trả theo giờ cho capacity đặt trước (dùng hay không), hợp tải ổn định/dự đoán được
- Auto Scaling (Provisioned): vượt target 2 phút liên tiếp → alarm → `UpdateTable` mất thêm
  vài phút → trong lúc đó bị throttle. Spike ngắn đột ngột chỉ trông vào burst capacity (300s)
- Hot partition: mỗi partition tối đa 3,000 RCU / 1,000 WCU. Adaptive capacity (tự bật,
  miễn phí) dồn capacity/tách item nóng ra partition riêng nhưng trần per-partition không đổi

**Câu kiểm tra:**
1. Table chỉ dùng giờ hành chính, đêm gần như không request, ban ngày thất thường → chọn gì?
   → ✅ On-Demand. Lý do cụ thể: (a) Auto Scaling phản ứng chậm (2 phút + vài phút UpdateTable)
   → spike nhanh bị throttle; (b) Provisioned ban đêm vẫn trả tiền minimum capacity, On-Demand
   không traffic thì không tốn tiền throughput
2. Provisioned 10,000 RCU vẫn throttle khi đọc profile user siêu nổi tiếng — tăng lên 20,000 RCU
   được không? → ✅ Không — trần 3,000 RCU là **per partition**, không phải per table; tăng
   tổng RCU không giúp item nóng. Phải làm cho request không chạm tới partition đó (→ caching)

### Khái niệm #3: Caching (DAX vs ElastiCache)

Tóm tắt đã học:
- DynamoDB lưu trên SSD, single-digit ms — **KHÔNG phải in-memory database**
- DAX: in-memory cache chuyên cho DynamoDB, ms → **microsecond** (chỉ eventually consistent
  read), **API-compatible** (chỉ đổi client, gần như không sửa logic), **write-through**,
  chạy trong VPC, 1 primary + tối đa 10 replica, khuyến nghị ≥ 3 node multi-AZ,
  item cache (GetItem) + query cache (Query/Scan) tách biệt
- DAX hợp: cần microsecond, **hot key** (ít item bị đọc rất nhiều), read-heavy muốn giảm RCU
- DAX KHÔNG hợp: strongly consistent read, write-intensive, ít đọc lặp (hit rate < 90%),
  database không phải DynamoDB
- ElastiCache: cache đa năng cho mọi nguồn (RDS/Aurora/DynamoDB/session), app tự viết logic cache
  - Memcached: **multi-threaded**, data type đơn giản, không replication/HA/backup
  - Redis/Valkey: sorted sets (leaderboard), **geospatial**, replication + auto failover,
    backup/restore, pub/sub; không multi-threaded

**Câu kiểm tra:**
1. App tài chính dùng DynamoDB, bắt buộc strongly consistent read, muốn giảm latency đọc
   — thêm DAX giúp được không?
   → Người học trả lời "Có" ❌. Đúng: **Không** — DAX chuyển thẳng strongly consistent read
   xuống DynamoDB và **không cache** kết quả. Lý do: DAX tách rời DynamoDB (ai ghi thẳng
   vào DynamoDB thì DAX không biết) và replicate giữa các node là eventually consistent →
   không cam kết được bản mới nhất. Latency không giảm, còn thêm 1 network hop.
   **Mẹo: DAX = microsecond nhưng chỉ cho eventually consistent read.**
2. App dùng Aurora MySQL, cần cache hỗ trợ multi-threading → ✅ ElastiCache Memcached
   (Aurora không phải DynamoDB → loại DAX; multi-threaded là đặc điểm của Memcached)
3. "DynamoDB nhanh single-digit ms nên là in-memory database" → ✅ Sai — lưu trên SSD

### Khái niệm #4: Multi-Region (Global Tables vs Aurora Global Database)

Tóm tắt đã học:
- Global Tables: fully managed, multi-Region, **multi-active** — replica ở mọi Region đều
  **đọc + ghi** được, tự replicate, dùng API DynamoDB bình thường (không sửa code),
  SLA 99.999% (single-Region 99.99%), RPO thấp/gần 0 khi chuyển Region
  - MREC (mặc định): bất đồng bộ qua Streams, **last writer wins**, transaction chỉ atomic
    trong Region ghi. MRSC: strongly consistent cross-Region, không TTL/transaction
  - Replication tốn WCU ở replica; Provisioned auto scaling đồng bộ giữa replica
- Aurora Global Database: **1 primary Region ghi**, tối đa 10 secondary **read-only**,
  replication tầng storage thường < 1 giây, write forwarding (vẫn chuyển về primary),
  failover promote secondary; vẫn relational (giữ schema/JOIN/SQL)

**Câu kiểm tra:**
1. RDS MySQL + JOIN, mở rộng Âu/Á, cần local **read**, không đổi schema →
   ✅ Aurora Global Database (relational + giữ schema + chỉ cần local read)
2. App đã dùng DynamoDB, user Mỹ/Âu/Á cần **ghi** latency thấp tại Region mình →
   ✅ Global Tables. Người học lý do "Aurora là SQL" ⚠️ — mới là lý do phụ.
   **Lý do chính:** Aurora Global DB chỉ có 1 primary nhận ghi → user Á ghi vẫn phải về
   primary (write forwarding cũng vậy) → latency ghi cao. Global Tables multi-active → ghi local.
   **Mẹo: "local write nhiều Region" → Global Tables; "local read" → cả hai được, xét
   relational hay NoSQL.**
3. Tự làm table mỗi Region + Streams + Lambda replicate → ✅ Tốn công vận hành (retry,
   conflict, vòng lặp replicate A→B→A) và không bằng Global Tables (vốn cũng dùng Streams
   bên dưới nhưng AWS quản lý, last writer wins, SLA 99.999%)

### Khái niệm #5: Backup & Data Protection

Tóm tắt đã học:
- PITR: backup liên tục tự động, restore về **bất kỳ giây nào** trong 1–35 ngày (mặc định 35,
  mốc gần nhất ~5 phút trước), **luôn restore ra table mới**, tính tiền theo dung lượng table
  (rút ngắn period không giảm giá), mặc định tắt. Table có PITR bị xóa → system backup
  `{table}$DeletedTableBackup` giữ miễn phí 35 ngày
- On-demand backup: tự tạo full backup, **giữ đến khi tự xóa** (long-term/compliance),
  không ảnh hưởng performance, chỉ restore về đúng thời điểm tạo backup
- Deletion protection: bật thì **không ai xóa được** table (kể cả có quyền DeleteTable) cho đến
  khi tắt; mặc định tắt (cả global replica & table restore); miễn phí, không cần vận hành
- Bẫy: Streams chỉ giữ 24h, là luồng sự kiện chứ không phải backup; Global Tables replicate
  luôn cả dữ liệu sai → chống sự cố Region, không chống corrupt

**Câu kiểm tra:**
1. Thỉnh thoảng ghi corrupt, cần quay về đúng trạng thái ngay trước khi corrupt →
   ✅ PITR (người học: "vì data tức thì"). Chính xác hơn: PITR restore về **bất kỳ giây nào**;
   on-demand backup chỉ về lúc tạo backup → mất dữ liệu đúng ghi giữa 2 mốc
2. Kỹ sư xóa nhầm table prod, cần ngăn tái diễn, ít vận hành nhất → ✅ Deletion protection.
   Vì sao không phải PITR: PITR là **khôi phục sau sự cố** (vẫn downtime, restore ra table mới,
   phải trỏ app sang) — deletion protection **ngăn chặn từ đầu**, $0, không vận hành.
   **Keyword: "prevent" → deletion protection; "restore/recover to point in time" → PITR**
3. "Dùng Streams để restore table" → ✅ Sai — Streams không có restore, chỉ giữ 24h, là luồng
   sự kiện (trigger Lambda/replicate) chứ không phải backup

### Khái niệm #6: TTL & DynamoDB Streams

Tóm tắt đã học:
- TTL: attribute kiểu **Number, Unix epoch giây**; hết hạn → DynamoDB tự xóa, **không tốn WCU**
  (cost-effective); xóa **trong vòng vài ngày** (chưa xóa vẫn đọc được → dùng filter expression);
  item bị TTL xóa vào Streams dạng "service deletion" → Lambda archive sang S3 được
  - Use case: session, log/feedback giữ N ngày, OTP, cart. Giữ 1 năm: `expireAt = now + 365×86400`
- Streams: CDC mọi thay đổi item-level, đúng thứ tự (trong cùng 1 item), exactly once,
  near-real time, giữ **24h**, bất đồng bộ (không ảnh hưởng performance)
  - StreamViewType: KEYS_ONLY / NEW_IMAGE / OLD_IMAGE / NEW_AND_OLD_IMAGES (không sửa sau khi bật)
  - Streams + Lambda = trigger; dùng cho event-driven, share thay đổi, replication
  - KHÔNG phải backup; DynamoDB **không có "rule"** tự biến đổi item trong table
- Kinesis Data Streams for DynamoDB: khi cần giữ > 24h hoặc nhiều consumer hơn

**Câu kiểm tra:**
1. Feedback giữ đúng 1 năm rồi tự xóa, rẻ nhất → ✅ TTL. (Bổ sung: KHÔNG cần Lambda quét
   hàng ngày — TTL miễn phí WCU; Lambda Scan+Delete tốn RCU+WCU và công vận hành)
2. "Ghi transaction thô vào DynamoDB rồi cấu hình rule tự xóa phần nhạy cảm" → ✅ Sai vì
   DynamoDB không có rule/trigger tự biến đổi dữ liệu. Thiết kế đúng: làm sạch **trước khi ghi**
   (Kinesis Data Streams → Lambda → DynamoDB); ghi thô trước là đã lưu dữ liệu nhạy cảm (cả
   vào Streams/backup)
3. User mới đăng ký → tự gửi email chào mừng → người học trả lời "Streams" ⚠️ mới 1 nửa.
   Đầy đủ: **DynamoDB Streams (NEW_IMAGE) → Lambda → SES**. Streams chỉ ghi lại sự kiện,
   Lambda mới xử lý. **Nhớ: Streams + Lambda = trigger (luôn đi cặp)**
