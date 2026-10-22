# Fact-check notes (round 3: s3, storage, storage-migration, rds, dynamodb, analytics)

The wording pass kept every fact as written. The sentences below looked doubtful or possibly out of date. They were not changed and should be checked against the AWS documentation.

| Lesson | Location | Sentence (current text) | Why it looks doubtful |
|---|---|---|---|
| s3 | Challenge quiz, question 5 | "Trong đợt flash sale, tác vụ tải lên ảnh đơn hàng gặp lỗi 503 khi vượt 5.000 request/giây vào cùng một prefix." | AWS documents 3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second per prefix. 5,000 matches neither figure. UploadSim in the same lesson uses 3,500 PUT/s. |
| s3 | Scene 4 Takeaway and EncryptionSim (SSE-C) | "Key phải được lưu giữ tại công ty nhưng S3 thực hiện mã hoá: SSE-C." | Check whether SSE-C is still accepted by default on new buckets. AWS may have announced that SSE-C will be blocked by default for new general purpose buckets. |
| storage | Scene 1 Takeaway | "Với cùng một lượng dữ liệu: S3 Standard có chi phí thấp nhất, tiếp theo là EFS, cao nhất là EBS." | Per GB-month, EFS Standard (about $0.30) costs more than EBS gp3 (about $0.08). The order may only hold when EBS is over-provisioned (EBS charges for provisioned capacity, EFS for used capacity). |
| storage | Scene 2 Takeaway, VolumeChooser, quiz | "gp2/gp3 … tối đa 16.000 IOPS"; "Yêu cầu trên 16.000 IOPS hoặc Multi-Attach: io1/io2." | The gp3 maximum may have been raised above 16,000 IOPS (to 80,000 IOPS). The gp2 limit of 16,000 IOPS is still correct. |
| storage | Scene 3 RequirementPicker, Takeaway, SortGame, quiz | "Performance mode: Max I/O … cho số lượng rất lớn client đồng thời"; "General Purpose + bursting throughput". | AWS now recommends General Purpose mode with Elastic throughput for most workloads, and Max I/O is not supported with Elastic throughput or One Zone file systems. The guidance may be out of date, though it still matches older exam questions. |
| storage-migration | TransferPlannerSim | "Snowball Edge: … khoảng 80 TB mỗi thiết bị". The lesson also assumes Snowball Edge can still be ordered. | 80 TB is the older Storage Optimized device; newer devices hold about 210 TB. Also check whether Snowball Edge is still open to new customers. |
| dynamodb | Scene 5 prose | "Aurora Global Database: một Region tiếp nhận ghi, tối đa 10 Region phụ chỉ đọc." | The limit was 5 secondary Regions for a long time. Check whether the current limit is 10. |
| rds | AuroraSim (writer failover) | "Aurora promote một reader thành writer, thường trong khoảng 30 giây" | AWS wording varies ("typically under 30 seconds", "within 60 seconds" in older docs). Check which figure is current. |
