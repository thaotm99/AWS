# FACTCHECK-R4: nhật ký đối chiếu đã xử lý (messaging, kinesis, monitoring, iac, backup-dr, others)

Phạm vi: MDX của 6 bài (frontmatter, prose, Takeaway, props của RequirementPicker, ScenarioFlow, SortGame, Quiz) và mô phỏng trong `src/components/scenes/{messaging,kinesis,monitoring,iac,backup-dr,others}/`. Nguồn: docs.aws.amazon.com (trang aws.amazon.com không truy cập được từ môi trường kiểm tra nên không dùng). Mọi URL bên dưới đã được tải và đọc trong lượt này; URL nào được dùng để sửa nội dung đều đã được thêm vào danh sách `docs` của bài tương ứng.

Ký hiệu kết luận: **Đúng** / **Sai** / **Đã lỗi thời** / **Không có nguồn**.

## 1. Các mục nghi ngờ ban đầu (bản R4 cũ)

| # | Bài | Câu gốc (rút gọn) | Kết luận | Đã sửa | Nguồn |
| --- | --- | --- | --- | --- | --- |
| 1 | messaging, Phần 4 | "Báo cáo kiểm toán… đọc dữ liệu hai lần mỗi năm: do state machine có retry, lưu ở S3 Standard-IA là đủ" | Không có nguồn (lập luận "vì có retry") | Bỏ lập luận retry; nêu đúng theo docs: Standard-IA cho dữ liệu truy cập ~1 lần/tháng, Glacier Instant Retrieval ~1 lần/quý, cả hai truy xuất mili giây, availability 99,9%, phí truy xuất theo GB, thời gian lưu tối thiểu 30/90 ngày | https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html |
| 2 | messaging, MessageLifeSim | "Short polling chỉ truy vấn một tập con các server của SQS…" | Đúng | Giữ nguyên | https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html |
| 3 | messaging EventRouterSim; monitoring GuardrailSim | "`daysToExpiration` = 30" | Sai một phần (mặc định là 14) | Ghi rõ mặc định 14, ShopViet tự cấu hình 30 (nhãn toggle, bước mô phỏng, kết quả) | https://docs.aws.amazon.com/config/latest/developerguide/acm-certificate-expiration-check.html |
| 4 | kinesis (Phần 3, Takeaway, Quiz, StreamPipelineSim) | "Phân tích stream bằng SQL: Kinesis Data Analytics (Managed Service for Apache Flink)" | Đã lỗi thời | Đổi thành Amazon Managed Service for Apache Flink (tên cũ Kinesis Data Analytics for Apache Flink), hỗ trợ Java/Scala/Python/SQL và Flink Studio; nêu Kinesis Data Analytics for SQL Applications đã ngừng (không tạo mới từ 15/10/2025, ứng dụng bị xoá từ 27/01/2026). Quiz: đổi nhãn đáp án, `a` giữ 0 | https://docs.aws.amazon.com/managed-flink/latest/apiv2/Welcome.html ; https://docs.aws.amazon.com/managed-flink/latest/java/what-is.html ; https://docs.aws.amazon.com/kinesisanalytics/latest/dev/discontinuation.html |
| 5 | kinesis ShardThroughputSim, Phần 2 | "On-demand… tức thời tới gấp đôi mức đỉnh gần nhất" | Sai một phần | Sửa: stream mới mặc định 4 MB/s ghi; đáp ứng tới gấp đôi đỉnh ghi của 30 ngày trước; tăng quá gấp đôi trong 15 phút có thể bị throttle. Bổ sung On-demand Standard / Advantage | https://docs.aws.amazon.com/streams/latest/dev/how-do-i-size-a-stream.html ; https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html |
| 6 | kinesis Takeaway, StreamPipelineSim | "DMS chuyển cả dữ liệu hiện có lẫn thay đổi mới từ S3" | Sai một phần | Ghi rõ: full load các file đã có; thay đổi mới chỉ được chuyển khi tải lên dưới dạng file CDC theo định dạng DMS (CDC00001.csv…); đổi mô tả tình huống cho khớp | https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.S3.html ; https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Kinesis.html |
| 7 | monitoring Phần 2 Takeaway, AlarmActionSim | "ASG giảm instance tại AZ nhiều instance nhất, sau đó chọn launch template cũ nhất" | Sai một phần (rút gọn) | Mô tả đủ: AZ nhiều instance nhất (có instance không được bảo vệ) → cấu hình cũ (launch configuration → launch template khác → version cũ nhất) → gần giờ tính phí; mixed instances group xét purchase option và allocation strategy trước. Bỏ câu không nguồn về sticky session | https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-termination-policies.html |
| 8 | monitoring, backup-dr (recover) | "Recover giữ nguyên instance ID, private IP, Elastic IP, public IPv4, metadata"; "recover chỉ áp dụng cho instance dùng EBS" | Câu giữ nguyên thuộc tính: Đúng. Câu "chỉ EBS": Sai | Liệt kê đúng: instance ID, public/private/Elastic IP, metadata, placement group, AZ, EBS volume; mất RAM. Instance có instance store chỉ hỗ trợ M3, C3, R3, X1, X1e, X2idn, X2iedn và mất dữ liệu instance store; bổ sung simplified automatic recovery (bật mặc định) và giới hạn không áp dụng cho instance thuộc ASG. Sửa tình huống instance store trong AlarmActionSim và Ec2RecoverSim (dùng m5d.large) | https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-recover.html ; https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/cloudwatch-recovery.html |
| 9 | iac Quiz, StackSim, SortGame | "gp2 hỗ trợ burst… chi phí thấp hơn io1 đáng kể" | Đã lỗi thời (gp3 là SSD có chi phí thấp nhất) | Đổi phương án sang gp3 (giá/GiB thấp hơn gp2 20%, baseline 3.000 IOPS); `a` giữ 1. Câu "thấp hơn io1 đáng kể" không có số liệu trong docs nên bỏ | https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html ; https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-volume.html |
| 10 | iac StackSim, Takeaway, Quiz | "Bản thân CloudFormation không tính phí" | Sai một phần | Sửa: không phí bổ sung với resource provider namespace AWS::*, Alexa::*, Custom::* | https://docs.aws.amazon.com/prescriptive-guidance/latest/choose-iac-tool/cloudformation.html |
| 11 | backup-dr Phần 2, DataFailoverSim, Quiz | "Region phụ được promote… trong khoảng một phút" | Sai | Failover (sự cố ngoài kế hoạch): thường vài phút, RTO tính bằng phút, RPO tính bằng giây; switchover (có kế hoạch): không mất dữ liệu, thường dưới 30 giây trên engine version đủ điều kiện | https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html ; https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html |
| 12 | others CostWatchSim | "Budgets action gắn DenyAll… và stop EC2" trong một action | Sai một phần | Sửa thành hai budget action cùng ngưỡng 80% (IAM policy; EC2 instance). Docs cho phép nhiều action trên một ngưỡng | https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html ; https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-action-configure.html ; https://docs.aws.amazon.com/cost-management/latest/userguide/billing-example-policies.html |

## 2. Các câu khác đã sửa

### messaging
| Câu gốc (rút gọn) | Kết luận | Đã sửa | Nguồn |
| --- | --- | --- | --- |
| "không nên scale theo CPU, vì worker đọc queue luôn có CPU tương đương" | Không có nguồn | Thay bằng lý do trong docs: policy chỉ theo số message không tính số instance; backlog per instance = ApproximateNumberOfMessages / số instance InService | https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html |
| "FIFO hỗ trợ 300 lệnh gọi API mỗi giây; batch 10 → 3.000 msg/s" | Đúng nhưng thiếu điều kiện | Thêm "cho mỗi API action (SendMessage, ReceiveMessage, DeleteMessage)" | https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-messages.html |
| Quiz/Takeaway Amazon MQ "vận hành broker RabbitMQ (hoặc ActiveMQ)… giữ nguyên giao thức"; EventRouterSim "AMQP, MQTT, STOMP, JMS…" | Đúng, chuẩn hoá | Viết theo docs: broker được quản lý cho Apache ActiveMQ Classic và RabbitMQ; JMS, NMS, AMQP, STOMP, MQTT, WebSocket | https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/welcome.html ; https://docs.aws.amazon.com/whitepapers/latest/aws-overview/application-integration.html |
| EventRouterSim "Với ứng dụng phát triển mới, SQS và SNS vẫn là lựa chọn được khuyến nghị" | Không có nguồn (trang FAQ không truy cập được) | Thay bằng câu docs: Amazon MQ phù hợp nhất cho di chuyển từ broker truyền thống; MQ bảo trì, nâng cấp broker trong maintenance window | https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html ; https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/welcome.html |
| EventRouterSim "Thời gian thực thi tối đa của Lambda là 15 phút" | Đúng với function tiêu chuẩn (Lambda Managed Instances có ngoại lệ 90 phút) | Ghi "Lambda function tiêu chuẩn, 900 giây" | https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html |
| MessageLifeSim "Một queue không hỗ trợ độ ưu tiên" | Không có nguồn | Viết lại không dùng khẳng định tuyệt đối | — |

### kinesis
| Câu gốc | Kết luận | Đã sửa | Nguồn |
| --- | --- | --- | --- |
| "Stream hỗ trợ hai capacity mode… on-demand chi phí theo lượng dữ liệu" | Đã lỗi thời | Nêu On-demand Standard (có phí cố định theo stream) và On-demand Advantage; provisioned tính theo shard-giờ | https://docs.aws.amazon.com/streams/latest/dev/how-do-i-size-a-stream.html ; https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html |
| "Kết hợp on-demand với Lambda là phương án có chi phí vận hành thấp nhất" | Không có nguồn | Xoá | — |
| "Lambda… lưu vị trí đọc và retry khi gặp lỗi" | Diễn đạt lại theo docs | Event source mapping poll từng shard, đọc theo batch | https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html |
| Firehose "tên cũ Kinesis Data Firehose… ứng dụng không thể đọc trực tiếp" | Đúng | Ghi chính xác: API chỉ có PutRecord/PutRecordBatch; thêm Splunk, HTTP endpoint | https://docs.aws.amazon.com/firehose/latest/APIReference/Welcome.html ; https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html |
| QuickSight (Takeaway, StreamPipelineSim, Quiz) | Đã lỗi thời | Đổi thành Amazon Quick Sight (trước đây là Amazon QuickSight) | https://docs.aws.amazon.com/quicksight/latest/user/welcome.html |
| Enhanced fan-out (Takeaway) | Đúng | Thêm giới hạn 20 consumer/stream (50 với On-demand Advantage) | https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html |
| StreamPipelineSim: DynamoDB "không hỗ trợ full-text", Redshift "không đáp ứng thời gian thực", "Rule trong DynamoDB", MSK "thay node", "phát triển mới: Kinesis" | Không có nguồn | Viết lại theo docs (zero-ETL DynamoDB → OpenSearch; MSK là Kafka được quản lý hoàn toàn) hoặc bỏ khẳng định | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/OpenSearchIngestionForDynamoDB.html ; https://docs.aws.amazon.com/msk/latest/developerguide/what-is-msk.html |
| Fargate "không giới hạn thời gian thực thi" | Không có nguồn | "không bị giới hạn 15 phút như Lambda" | https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html |
| Phần 1 "Kinesis băm key", retention | Đúng | Thêm MD5; tính phí khi retention > 24 giờ | https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html ; https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html |

### monitoring
| Câu gốc | Kết luận | Đã sửa | Nguồn |
| --- | --- | --- | --- |
| MetricAlarmSim "function tự gọi lại chính nó" | Sai (Lambda recursive loop detection phát hiện vòng lặp chỉ gồm Lambda) | Đổi kịch bản thành vòng lặp qua DynamoDB stream (không được phát hiện); dẫn khuyến nghị alarm concurrency/invocations của docs | https://docs.aws.amazon.com/lambda/latest/dg/invocation-recursion.html |
| Detailed monitoring | Đúng | Thêm "có tính phí" | https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch-metrics-basic-detailed.html |
| AlarmActionSim "Recover chỉ áp dụng cho system status check" | Đúng | Diễn đạt theo docs: chỉ dùng với StatusCheckFailed_System | https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/UsingAlarmActions.html |
| "CloudTrail ghi lại mọi API call"; "bật để ghi mọi IAM action" | Sai một phần | Mặc định trail ghi management event; data event phải bật thêm | https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-management-events-with-cloudtrail.html |
| GuardrailSim "SCP áp dụng cho mọi user, role, root"; "IAM policy không thể gắn vào root" | Đúng | Bổ sung: không ảnh hưởng management account | https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html |
| DHMC "bật trong Quick Setup… không thay đổi role… mọi EC2 trở thành managed node" | Sai một phần | Bật trong Fleet Manager (Quick Setup cho organization); điều kiện IMDSv2, SSM Agent ≥ 3.2.582.0; instance profile hiện có không được cho phép ssm:UpdateInstanceInformation | https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-default-host-management-configuration.html ; https://docs.aws.amazon.com/systems-manager/latest/userguide/quick-setup-default-host-management-configuration.html |
| AWSEC2-PatchLoadBalancerInstance "vá, reboot, đăng ký lại và chờ healthy" | Sai một phần | Theo docs: kiểm tra healthy, gỡ khỏi LB/target group, chờ connection draining, gọi AWS-RunPatchBaseline, gắn lại (Quiz `why`, Takeaway, PatchWindowSim) | https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-awsec2-patch-load-balancer-instance.html |
| Outposts / Snowball Edge | Snowball Edge: Đã lỗi thời | Snowball Edge không còn cho khách hàng mới; mô tả Outposts theo docs | https://docs.aws.amazon.com/snowball/latest/developer-guide/whatisedge.html ; https://docs.aws.amazon.com/outposts/latest/userguide/what-is-outposts.html |
| `restricted-ssh` | Đúng | Thêm identifier INCOMING_SSH_DISABLED | https://docs.aws.amazon.com/config/latest/developerguide/restricted-ssh.html |

### iac
| Câu gốc | Kết luận | Đã sửa | Nguồn |
| --- | --- | --- | --- |
| "Khi tạo gặp lỗi, stack tự động rollback" | Đúng (mặc định) | Thêm "theo mặc định", có tuỳ chọn giữ tài nguyên | https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stack-failure-options.html |

### backup-dr
| Câu gốc | Kết luận | Đã sửa | Nguồn |
| --- | --- | --- | --- |
| DataFailoverSim "restore mất hàng giờ", "Vượt RTO 15 phút" | Không có nguồn (số liệu) | Viết lại: thời gian restore phụ thuộc kích thước DB; "không đảm bảo được RTO" | — |
| "Vault Lock để không ai xoá được recovery point" | Đúng với compliance mode | Thêm compliance/governance mode | https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html |

### others
| Câu gốc | Kết luận | Đã sửa | Nguồn |
| --- | --- | --- | --- |
| "Savings Plans có ba loại… SageMaker Savings Plans" | Đã lỗi thời | Bốn loại: Compute, Database, EC2 Instance, SageMaker AI; thêm mức giảm tối đa 66/35/72/64%; đổi tên trong SavingsPlanSim, Quiz | https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html |
| Quiz "Reserved Instance chỉ áp dụng cho EC2" | Sai (RI tồn tại cho dịch vụ khác) | "EC2 RI không áp dụng cho Fargate/Lambda; Convertible RI đổi family phải exchange thủ công" | https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-ris.html |
| "Budget action được thực thi ngay khi chạm ngưỡng"; CostWatchSim "Budgets gửi email ngay", "ngay trong ngày đầu tiên" | Sai một phần | Dữ liệu Budgets cập nhật tối đa 3 lần/ngày; action chạy tự động hoặc sau phê duyệt | https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html ; https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-action-configure.html |
| "Cost Explorer chỉ dùng để phân tích, không tự gửi cảnh báo"; "CloudWatch không có sẵn metric coverage" | Không có nguồn | Viết lại không khẳng định tuyệt đối | https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html |
| AiPipelineSim: phân tích đánh giá tiếng Việt bằng Comprehend; báo scan qua Textract | Sai (Comprehend không hỗ trợ tiếng Việt; Textract chỉ EN/FR/DE/IT/PT/ES) | Đổi dữ liệu mẫu sang tiếng Anh, nêu giới hạn ngôn ngữ trong bài; Transcribe vi-VN được giữ (có hỗ trợ batch) | https://docs.aws.amazon.com/comprehend/latest/dg/supported-languages.html ; https://docs.aws.amazon.com/textract/latest/dg/limits-document.html ; https://docs.aws.amazon.com/transcribe/latest/dg/supported-languages.html |
| Custom entity "huấn luyện từ danh sách tên thành phần" | Thiếu | Entity list kèm tập tài liệu chưa gán nhãn; entity có sẵn liệt kê đúng loại | https://docs.aws.amazon.com/comprehend/latest/dg/custom-entity-recognition.html ; https://docs.aws.amazon.com/comprehend/latest/dg/how-entities.html |
| "TTL 365 ngày tự động xoá bản ghi sau một năm"; "chi phí tính theo lượng văn bản" | Sai một phần / Không có nguồn | TTL xoá item hết hạn thường trong vài ngày; bỏ câu chi phí | https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html |
| Cost Optimization Hub, Compute Optimizer | Đúng | Liệt kê đúng loại khuyến nghị và tài nguyên | https://docs.aws.amazon.com/cost-management/latest/userguide/cost-optimization-hub.html ; https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html |

## 3. Câu đã xác nhận Đúng (giữ nguyên)

- SQS: visibility timeout mặc định 30 s; retention mặc định 4 ngày (1 phút–14 ngày); long polling tối đa 20 s; delay queue 0–15 phút; dedup 5 phút; không chuyển standard → FIFO, tên `.fifo`; interface VPC endpoint (PrivateLink); temporary queue/virtual queue; maxReceiveCount → DLQ. https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html ; …/quotas-messages.html ; …/quotas-fifo.html ; …/FIFO-queues-exactly-once-processing.html ; …/FIFO-queues-moving.html ; …/sqs-internetwork-traffic-privacy.html ; …/sqs-temporary-queues.html ; …/sqs-dead-letter-queues.html ; https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SetQueueAttributes.html
- API Gateway tích hợp trực tiếp SQS/Kinesis: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-aws-services-reference.html
- IAM Access Analyzer phân tích policy của SNS topic, SQS queue: https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-resources.html
- SNS không có KDS là đích A2A (có Firehose, Lambda, SQS, HTTP/S): https://docs.aws.amazon.com/sns/latest/dg/sns-event-destinations.html
- EventBridge partner event source; Scheduler templated target ECS RunTask: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-saas.html ; https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-targets-templated.html
- Step Functions Retry/BackoffRate, Batch `.sync`: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html ; https://docs.aws.amazon.com/step-functions/latest/dg/connect-batch.html
- ACM không tự gia hạn chứng chỉ import: https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html
- Kinesis shard 1 MB/s hoặc 1.000 record/s ghi, 2 MB/s đọc; retention 24 giờ–365 ngày; EFO 2 MB/s/shard/consumer, ~70 ms; KPL aggregation: https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html ; …/enhanced-consumers.html ; …/kinesis-kpl-concepts.html
- EC2 alarm action stop/terminate/reboot/recover; reboot cho instance status check: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/UsingAlarmActions.html
- ECS metric AWS/ECS theo ClusterName, ServiceName: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/available-metrics.html
- Config event "Config Rules Compliance Change" qua EventBridge; remediation bằng SSM document: https://docs.aws.amazon.com/config/latest/developerguide/monitor-config-with-cloudwatchevents.html ; https://docs.aws.amazon.com/config/latest/developerguide/remediation.html
- Security group chỉ có rule allow, stateful, egress mặc định cho phép tất cả: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- StackSets automatic deployment theo OU; RAM chia sẻ tài nguyên; Beanstalk custom AMI: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-manage-auto-deployment.html ; https://docs.aws.amazon.com/ram/latest/userguide/what-is.html ; https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.customenv.html
- AMI là tài nguyên theo Region, phải copy: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/CopyingAMIs.html
- RDS cross-Region read replica, promote; sao chép automated backup sang Region khác: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html ; https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReplicateBackups.html
- ElastiCache Multi-AZ promote replica, primary endpoint giữ nguyên: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/AutoFailover.html
- Bốn chiến lược DR: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- EFS NFSv4, Regional nhiều AZ; Fargate mount EFS (platform 1.4.0+); AWS Backup hỗ trợ EFS: https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html ; https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html ; https://docs.aws.amazon.com/aws-backup/latest/devguide/whatisbackup.html
- Trusted Advisor chỉ kiểm tra và khuyến nghị: https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html

## 4. Chưa giải quyết được

- Trang giá và FAQ trên aws.amazon.com (CloudFormation, SQS, Kinesis, Comprehend pricing, Amazon MQ FAQ) không truy cập được từ môi trường kiểm tra. Mọi câu chỉ dựa vào các trang này đã được viết lại theo docs.aws.amazon.com hoặc bị bỏ.
- Số liệu minh hoạ trong mô phỏng (chi phí DR "minh hoạ", thời gian restore, số đơn hàng) là giả định của tình huống ShopViet, không phải số liệu AWS.
