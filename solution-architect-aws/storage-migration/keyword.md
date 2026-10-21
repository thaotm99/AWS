# STORAGE-MIGRATION — Khái niệm từ câu hỏi đề thi

## AWS Storage Gateway
- S3 File Gateway: NFS/SMB on-premises, dữ liệu lưu trên S3 (exam1_q35, exam5_q28, exam3_q56)
- Volume Gateway cached volumes: dữ liệu hay dùng ở local, toàn bộ trên S3 (exam3_q31, exam4_q37)
- Volume Gateway stored volumes (exam2_q59)
- Tape Gateway thay thư viện băng từ (exam4_q36)

## AWS Snow Family
- Snowball Edge chuyển hàng trăm TB tới PB; lifecycle sang Glacier Deep Archive (exam2_q41, exam5_q5, exam3_q61)

## AWS DataSync và Transfer Family
- DataSync tự động hóa và tăng tốc chuyển dữ liệu online vào S3, EFS, FSx (exam3_q3, exam2_q11)
- DataSync migrate xong rồi File Gateway để tiếp tục truy cập (exam5_q48)
- Transfer Family: SFTP managed vào S3/EFS (exam2_q4, exam5_q62)

## Migrate database và server
- AWS SCT + AWS DMS cho migrate khác engine (exam3_q4, exam1_q47)
- Babelfish for Aurora PostgreSQL chạy T-SQL (exam1_q47)
- DMS Serverless tự co giãn cho replication liên tục (exam5_q8)
- DMS làm cầu nối S3 → Kinesis Data Streams (exam4_q27)
- AWS Application Migration Service (MGN): replication agent, test, cutover (exam6_q48)
- S3 Batch Replication / aws s3 sync để copy dữ liệu có sẵn (exam4_q29)
