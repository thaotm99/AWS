# STORAGE — Khái niệm từ câu hỏi đề thi

## Amazon EBS
- Volume types: io1/io2 cho IOPS cao (database), gp2/gp3 tiết kiệm, st1/sc1 không làm boot volume (exam3_q27, exam5_q22, exam4_q15, exam1_q44)
- Multi-Attach chỉ với Provisioned IOPS SSD (exam6_q24)
- Encryption: at rest, snapshot, dữ liệu giữa volume và instance (exam5_q40)
- Fast snapshot restore tạo volume hiệu năng đầy đủ ngay (exam5_q64)
- Recycle Bin giữ snapshot bị xóa (exam5_q16)
- EBS gắn với một AZ, không chia sẻ giữa nhiều instance; dùng S3/EFS khi cần dữ liệu chung (exam2_q29, exam6_q15)
- So sánh giá: S3 Standard < EFS < EBS cho cùng dung lượng sử dụng (exam1_q46)

## Instance store
- Hiệu năng cao nhất, dữ liệu tạm, mất khi stop/terminate (exam1_q43, exam5_q43, exam5_q52, exam6_q42)

## Amazon EFS
- NFS dùng chung nhiều EC2, nhiều AZ; mount target mỗi AZ (exam4_q24, exam2_q29)
- Truy cập khác Region qua VPC peering; cross-account bằng resource policy (exam1_q42, exam1_q9)
- Kiểm soát truy cập: security group + IAM policy (exam1_q12)
- Performance mode: Max I/O cho big data; General Purpose + bursting throughput (exam2_q64, exam4_q55)
- Throughput mode: Provisioned cho đọc ghi tần suất cao (exam3_q11)
- Storage class Infrequent Access cho dữ liệu ít truy cập (exam2_q60, exam6_q39)
- EFS + AWS Backup cross-Region (exam5_q47); EFS + Fargate (exam3_q32)

## Amazon FSx
- FSx for Windows File Server: SMB, NTFS, Active Directory, thay thế DFSR (exam2_q12, exam2_q56, exam1_q65, exam3_q5, exam3_q43, exam3_q56)
- FSx for Lustre: HPC, độ trễ dưới mili giây, liên kết S3 (exam1_q24, exam3_q61)
- FSx for NetApp ONTAP (exam3_q26)
