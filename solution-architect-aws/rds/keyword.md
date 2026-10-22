# RDS — Khái niệm từ câu hỏi đề thi

## Multi-AZ
- Đồng bộ (synchronous) sang standby ở AZ khác, chỉ để HA, không đọc được (exam1_q52, exam3_q63)
- Failover tự động: CNAME trỏ sang standby (exam5_q25, exam6_q49)
- Bảo trì OS: làm trên standby trước rồi promote (exam6_q49); nâng cấp engine thì cả hai cùng lúc, có downtime (exam2_q25)
- Multi-AZ cho SQL Server, Oracle (RDS Custom) (exam4_q19, exam1_q3, exam2_q40)
- Web tier 2 AZ + RDS Multi-AZ (exam2_q8)

## Read Replica
- Bất đồng bộ (asynchronous), tách tải đọc/báo cáo (exam1_q52, exam2_q13, exam3_q41, exam4_q13, exam6_q19, exam6_q46)
- Cross-Region Read Replica cho DR và đọc gần người dùng; có phí data transfer khác Region (exam5_q42, exam2_q62)

## Vận hành RDS
- Mã hóa DB chưa mã hóa: snapshot → copy có encryption → restore (exam2_q45)
- Chia sẻ encrypted snapshot + quyền KMS key (exam2_q57)
- Storage auto scaling (exam2_q63)
- RDS Proxy gom connection (exam1_q55)
- SSL cho data in transit; IAM database authentication (exam4_q31, exam4_q39)
- Automated backups, CloudFormation chuẩn hóa cấu hình (exam5_q42, exam4_q47)

## Amazon Aurora
- Aurora Replicas + reader endpoint, replica làm failover target (exam5_q3, exam6_q5, exam2_q52)
- Aurora Auto Scaling, giảm replication lag so với RDS MySQL (exam3_q50)
- Aurora Global Database: đọc độ trễ thấp ở nhiều Region, RPO giây, RTO phút, managed failover (exam2_q5, exam1_q7, exam2_q61, exam6_q23, exam2_q6)
- Aurora Serverless (v2) cho tải không đoán trước (exam6_q17, exam2_q53)
- Aurora I/O-Optimized (exam4_q2)
- Aurora Replica khác AZ cho HA (exam5_q7)
