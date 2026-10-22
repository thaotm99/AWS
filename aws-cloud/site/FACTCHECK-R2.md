# Fact-check notes, round 2 (wording pass)

The technical-register rewrite changed wording only. The sentences below were kept with their original meaning but look doubtful or imprecise; check them against AWS documentation.

## Lessons: cognito, ec2, elb, asg, containers, lambda

| Lesson | Location | Sentence (current wording) | Why it looks doubtful |
|---|---|---|---|
| cognito | Scene 1, ScenarioFlow "Ứng dụng mobile tải ảnh đánh giá lên S3", option "Identity pool + VPC endpoint" | "Thành phần ứng dụng trong VPC sử dụng **S3 VPC endpoint** để truy cập S3 qua kết nối riêng, không đi qua Internet. Hai cơ chế này được sử dụng kết hợp." | The client is a mobile app on the Internet, not inside a VPC; an S3 gateway endpoint does not apply to it. The diagram draws the app's path as identity pool → VPC endpoint → S3, which suggests the mobile upload goes through the endpoint. Probably two separate requirements from the source question merged into one flow. |
| cognito | StaffSignInSim, scenario "Đối tác truyền tệp qua SFTP" | Node "Cognito / IdP riêng" and result "danh tính được quản lý tại Cognito hoặc IdP riêng" | Transfer Family custom identity providers are integrated through a Lambda function (optionally behind API Gateway); Cognito is not a built-in option. Check that naming Cognito here is accurate. |
| ec2 | PurchaseMixSim, strategy "RI cho nền + Spot" | "Đây là cách phối hợp phổ biến nhất trong thực tế." | An unsourced claim about industry practice, not something AWS documentation states. |
| ec2 | Ec2CostSim, scenario "Yêu cầu phần cứng không dùng chung" | "Thanh toán theo instance đang chạy." (Dedicated Instances) | Dedicated Instances also carry a per-Region dedicated fee per hour while any Dedicated Instance runs, so "pay per running instance" is incomplete. |
| ec2 | Ec2OpsSim, scenario "Dừng instance ban đêm…" | "Khi instance dừng, chỉ phát sinh chi phí EBS." | Associated Elastic IPs (and public IPv4 addresses) are also charged while the instance is stopped. |
| asg | Quiz, termination question, `why` | "ASG chọn AZ có nhiều instance nhất (AZ-B), sau đó chọn instance cũ nhất." | The default policy picks the instance with the oldest launch template/configuration, not the oldest instance. The correct option text says "launch template/configuration cũ nhất", but the explanation says "instance cũ nhất". |
| asg | Quiz, SQS question, `why` | "CPU của worker hầu như không thay đổi." | Too absolute; it holds only for the simulated case (workers always busy). |
| asg | Takeaway Phần 3 and TerminationSim | "… gần giờ tính phí tiếp theo nhất" | AWS still documents this step ("closest to the next billing hour"), but EC2 Linux is billed per second; check the current wording of the default termination policy. |
| containers | Scene 2, bullet list | "**EKS Anywhere** trên **AWS Outposts** đặt trong data center của doanh nghiệp." | The usual answer for Kubernetes on Outposts is Amazon EKS on Outposts (local or extended clusters). EKS Anywhere runs on customer-managed infrastructure. Check which one the source scenario means. |
| lambda | Scene 3, bullet list | "… đẩy vào Kinesis để **Kinesis Data Analytics** phân tích stream." | Amazon Kinesis Data Analytics has been renamed Amazon Managed Service for Apache Flink. The name may be outdated. |
| lambda | Scene 1, "Tác vụ định kỳ", and Quiz | "Đây là phương án có chi phí thấp và độ tin cậy cao nhất." | A superlative ("cao nhất") with no basis in AWS documentation; the original said "Rẻ và đáng tin cậy nhất". |
| elb | AlbRuleSim, scenario "Wildcard trong host rule" | "`*.shopviet.vn` yêu cầu ít nhất một ký tự trước `.shopviet.vn` …" next to "ký tự `*` khớp 0 hoặc nhiều ký tự" | Both statements are in the sim. They are consistent only because the pattern contains the literal dot. Confirm the apex-domain behaviour against the ALB host-header condition documentation. |
