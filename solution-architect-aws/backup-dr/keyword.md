# BACKUP-DR — Khái niệm từ câu hỏi đề thi

## Chiến lược Disaster Recovery
- Backup & Restore → Pilot Light → Warm Standby → Multi-site: RTO/RPO giảm dần, chi phí tăng dần (các phương án của exam4_q41)
- Warm Standby: bản thu nhỏ nhưng chạy đầy đủ chức năng luôn chạy trên AWS (exam4_q41)
- Copy AMI sang các Region để khôi phục nhanh (exam4_q5)

## Theo service
- Aurora Global Database: RPO giây, RTO phút, failover giữa Region (exam2_q61, exam6_q23)
- RDS: cross-Region Read Replica, automated backups (exam5_q42)
- EFS + AWS Backup cross-Region backup (exam5_q47)
- ElastiCache Multi-AZ automatic failover (exam4_q32)
- CloudWatch alarm tự recover EC2 (exam3_q38)
