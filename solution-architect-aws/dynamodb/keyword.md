# DYNAMODB — Khái niệm từ câu hỏi đề thi

## Fundamentals & Data model
- Table / Item / Attribute
- Primary key: Partition key, Sort key (composite key)
- Item size limit (400 KB) — object lớn thì để ở S3
- NoSQL key-value/document vs relational (không JOIN, không relational schema)
- Serverless, single-digit millisecond latency, horizontal scaling
- High availability: data replicate tự động qua 3 AZ
- Global Secondary Index (GSI) vs Local Secondary Index (LSI) — chỉ xuất hiện trong option

## Capacity & Performance
- Read Capacity Unit (RCU) / Write Capacity Unit (WCU)
- Provisioned capacity mode + Auto Scaling
- On-Demand capacity mode
- Hot partition

## Caching
- DynamoDB Accelerator (DAX) — microsecond latency, write-through cache
- DAX vs ElastiCache (Redis / Memcached) — khi nào dùng cái nào
- DynamoDB KHÔNG phải in-memory database

## Multi-Region
- Global Tables (multi-Region, multi-active replication)
- Global Tables vs Aurora Global Database

## Backup & Data Protection
- Point-in-Time Recovery (PITR)
- On-demand backup
- Deletion protection

## Item lifecycle & Change capture
- Time to Live (TTL)
- DynamoDB Streams

## Integration & Serverless patterns
- SQS → Lambda → DynamoDB (serverless pipeline)
- Kinesis Data Firehose destinations (không ghi trực tiếp vào DynamoDB)

## Networking
- VPC Gateway Endpoint cho DynamoDB (vs Interface Endpoint)
