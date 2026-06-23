# Exam 1 — Câu 53

**Nguồn:** Đề #1, câu 53
**Service:** S3 / Glue DataBrew — Data Preparation

## Câu hỏi
A healthcare analytics company centralizes clinical and operational datasets in an Amazon S3–based data lake. Incoming data is ingested in Apache Parquet format from multiple hospitals and wearable health devices. To ensure quality and standardization, the company applies several transformation steps: anomaly filtering, datetime normalization, and aggregation by patient cohort. The company needs a solution to support a code-free interface that enables data engineers and business analysts to collaborate on data preparation workflows. The company also requires data lineage tracking, data profiling capabilities, and an easy way to share transformation logic across teams without writing or managing code.

Which AWS solution best meets these requirements?

> 🇻🇳 Công ty healthcare lưu dữ liệu trong S3 data lake (Parquet). Cần: (1) giao diện không code, (2) data lineage tracking, (3) data profiling, (4) chia sẻ transformation logic giữa các team.

## Các đáp án
- A. Use Amazon AppFlow to move and transform Parquet files in S3. Configure AppFlow transformations and mappings within the visual interface. Share flows with collaborators through AWS IAM policies and scheduled executions
- B. Create Amazon Athena SQL queries to perform transformation steps directly on S3. Store queries in AWS Glue Data Catalog and share saved queries with other users through Amazon Athena's query editor
- C. Use AWS Glue Studio's visual canvas to design data transformation workflows on top of the Parquet files in Amazon S3. Configure Glue Studio jobs to run these transformations without writing code. Share the job definitions with team members for reuse. Use the visual job editor to track transformation progress and inspect profiling statistics for each dataset column
- D. Use AWS Glue DataBrew to visually build transformation workflows on top of the raw Parquet files in S3. Use DataBrew recipes to track, audit, and share the transformation steps with others. Enable data profiling to inspect column statistics, null values, and data types across datasets

> 🇻🇳 Dịch:
> - A. Dùng AppFlow để di chuyển và transform Parquet files trong S3, chia sẻ qua IAM policies
> - B. Dùng Athena SQL queries để transform trực tiếp trên S3, lưu query vào Glue Data Catalog
> - C. Dùng Glue Studio visual canvas để thiết kế transformation workflows, không cần code
> - D. Dùng Glue DataBrew để build transformation workflows, dùng "recipes" để track/audit/chia sẻ, enable data profiling

## Đáp án đúng
**D. Use AWS Glue DataBrew to visually build transformation workflows on top of the raw Parquet files in S3**

## Giải thích

### ✅ Tại sao D đúng
DataBrew được thiết kế đặc biệt cho data preparation bởi cả data engineer lẫn business analyst:
- **Recipes** = tập hợp transformation steps có thể save, version, share → đây chính là lineage tracking
- **Data profiling built-in**: tự động generate column-level statistics (null count, distribution, cardinality, outliers) — không cần viết query
- Giao diện point-and-click thuần túy, không code

### ❌ Tại sao C sai — bẫy quan trọng
Glue Studio cũng có visual canvas nhưng:
- Không có built-in data profiling (column statistics)
- Không có "recipes" để share transformation logic
- Thiên về engineering hơn, không phải business analyst

### ❌ Tại sao A sai
AppFlow dùng để kết nối SaaS apps (Salesforce, Slack...) với AWS. Không phải data transformation tool cho Parquet files.

### ❌ Tại sao B sai
Athena dùng SQL — vi phạm thẳng yêu cầu "code-free".

## Người học trả lời
- Chọn: Không biết
- Kết quả: —

## Key takeaway
**Glue DataBrew vs Glue Studio** — cặp hay nhầm:
- **DataBrew** = data preparation cho analyst, có profiling + recipes → dùng khi đề nhắc "data profiling" + "code-free" + "business analyst"
- **Glue Studio** = visual ETL cho engineer, không có data profiling
