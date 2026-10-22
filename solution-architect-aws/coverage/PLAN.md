# Kế hoạch bổ sung kiến thức theo checklist

Nguồn: `CHECKLIST.md` (rà 390 câu của 6 đề). Mục tiêu: mọi keyword ❌ Thiếu và 🟡 Một phần trở thành ✅ Đã có.
Làm tuần tự từng đợt; hết đợt 4 thì rà lại toàn bộ 6 đề và lặp lại cho tới khi không còn mục thiếu.

## Mức ưu tiên
- **P1**: keyword quyết định đáp án đúng, hoặc xuất hiện ở từ 2 đề trở lên → phần mới trong bài, có mô phỏng.
- **P2**: keyword để loại phương án sai, thuộc dịch vụ đã có trong bài → đoạn giải thích, Takeaway, thẻ SortGame, dòng RequirementPicker.
- **P3**: dịch vụ chỉ là phương án gây nhiễu, ngoài trọng tâm bài → mục "Phân biệt nhanh" cuối bài (dịch vụ · dùng khi nào · vì sao không chọn).

## Quy tắc
1. Mọi nội dung mới đối chiếu AWS docs; URL ghi vào `docs` của bài và nhật ký `aws-cloud/site/FACTCHECK-*.md`.
2. Viết song ngữ ngay: `concepts/<bài>.mdx` và `concepts-en/<bài>.mdx`; chữ trong mô phỏng qua `L({vi, en})`.
3. Văn phong kỹ thuật, tình huống ShopViet; nội dung dạng liệt kê thì làm thành mô phỏng; không đưa mã đề lên trang (chỉ trong prop `questions`).
4. Hết mỗi đợt: chạy lại audit cho các bài trong đợt, cập nhật `test-N.json` và dựng lại `CHECKLIST.md`.
5. Tính năng đã ngừng (Spot block, Kinesis Data Analytics for SQL…): một dòng "đã ngừng hỗ trợ", không viết phần riêng.
6. Đề 2 câu 64 (EFS Max I/O) và đề 4 câu 15 (gp2): bài học giữ khuyến nghị hiện tại theo docs; lời giải 2 câu này trên trang Luyện đề có ghi chú "đề dùng đáp án theo khuyến nghị cũ".

## Các đợt
| Đợt | Bài | Trạng thái |
|---|---|---|
| 1 | asg, ec2, s3, storage | ✅ xong |
| 2 | vpc, iam, kms, elb | ✅ xong |
| 3 | lambda, containers, rds, monitoring, cloudfront | đang làm |
| 4 | route53, analytics, dynamodb, iac, backup-dr, storage-migration, security, cognito, global-infra, messaging, kinesis, others | đang làm |
| 5 | Rà lại 6 đề, bổ sung phần còn sót; lặp tới khi đủ | |
| — | Ghi chú đáp án theo khuyến nghị cũ cho đề 2 câu 64, đề 4 câu 15 | ✅ xong |
