# AWS Từ Nền

Web ôn thi AWS Solutions Architect Associate (SAA-C03): mỗi bài có ví dụ xuyên suốt, các cảnh mô
phỏng tương tác và thử thách cuối bài, và chỉ dạy những gì 6 đề luyện thi thực sự hỏi. Đây là giai đoạn 1: web tĩnh trên S3 + CloudFront.

```
Người dùng ──► CloudFront (HTTPS, cache ở Edge) ──OAC──► S3 bucket (private)
                    ▲
GitHub Actions ─────┘  build → s3 sync → invalidate (đăng nhập AWS bằng OIDC, không lưu access key)
```

## Cấu trúc

```
aws-cloud/
├── site/                         Astro + React + MDX
│   ├── src/data/curriculum.ts    thứ tự 7 lớp, id = folder trong solution-architect-aws/
│   ├── src/data/exam.ts          đọc overview.md + list_qa.md lúc build
│   ├── src/content/concepts/     mỗi bài 1 file .mdx, tên file = id trong curriculum.ts
│   ├── src/components/scenes/    các cảnh tương tác dùng lại được (React)
│   ├── src/components/lessons/   phần minh họa riêng của từng bài
│   └── src/pages/                trang chủ, trang bài học, 404
└── infra/                        AWS CDK (TypeScript)
    └── lib/static-site-stack.ts  S3, CloudFront, IAM role cho GitHub, Budget
```

## Chạy ở máy

```bash
cd aws-cloud/site
npm install
npm run dev          # http://localhost:4321
npm run build        # kiểm tra kiểu + build ra dist/
```

## Thêm một bài học (bám đề SAA-C03)

Nội dung chỉ được dạy những gì 6 đề luyện thi thực sự hỏi. Quy trình:

1. Theo `solution-architect-aws/CLAUDE.md`, tạo `solution-architect-aws/<id>/list_qa.md` (câu đề của
   service) và `keyword.md` (khái niệm các câu đó kiểm tra). `<id>` là tên folder trong `overview.md`.
2. Tạo `site/src/content/concepts/<id>.mdx`. Mỗi `<Scene>` khai báo `questions={["exam1_q41", ...]}`;
   khái niệm nào không có câu đề nào hỏi thì không đưa vào bài.
3. Đối chiếu lý thuyết với AWS docs và ghi link trong frontmatter `docs`.
4. **Không chép nguyên văn câu hỏi lên web** (đề có bản quyền, web public). Chỉ ghi mã câu; câu hỏi
   luyện tập trong bài phải viết lại bằng lời của mình.

Build tự kiểm tra:
- Mã câu trong `<Scene questions>` phải có trong một `list_qa.md` nào đó, nếu không build báo lỗi.
- Lộ trình và số câu đề lấy trực tiếp từ `overview.md` và các `list_qa.md` (`site/src/data/exam.ts`),
  số có dấu ~ là ước lượng keyword từ `overview.md`, chưa có `list_qa.md`.

## Deploy lần đầu

Cần: tài khoản AWS, AWS CLI đã đăng nhập (`aws sts get-caller-identity` chạy được).

```bash
cd aws-cloud/infra
npm install
npx cdk bootstrap                                   # chỉ làm một lần cho mỗi account/Region
npx cdk deploy -c budgetEmail=<email-nhận-cảnh-báo>
```

- Stack mặc định tạo ở **ap-southeast-1 (Singapore)**.
- Nếu account đã có GitHub OIDC provider, thêm `-c createGithubOidcProvider=false`.
- Bỏ `budgetEmail` thì không tạo cảnh báo chi phí. Nên có: mặc định báo khi chi phí thực tế vượt 80%
  hoặc dự báo vượt 100% của $5/tháng (đổi bằng `-c monthlyBudgetUsd=10`).

Sau khi deploy, CDK in ra 4 output. Vào GitHub repo → **Settings → Secrets and variables → Actions →
Variables** và tạo:

| Variable | Lấy từ output |
|---|---|
| `AWS_DEPLOY_ROLE_ARN` | `DeployRoleArn` |
| `SITE_BUCKET` | `SiteBucketName` |
| `DISTRIBUTION_ID` | `DistributionId` |
| `AWS_REGION` | `ap-southeast-1` (tùy chọn) |

Từ đó, mỗi lần merge thay đổi trong `aws-cloud/` vào `master`, workflow `.github/workflows/aws-cloud.yml`
sẽ build và deploy. Web chạy ở địa chỉ trong output `SiteUrl` (`https://xxxx.cloudfront.net`).

IAM role chỉ cho phép workflow chạy trên nhánh `master` của `thaotm99/AWS` assume, và chỉ có quyền
ghi vào đúng bucket này cùng quyền invalidate đúng distribution này.

## Chi phí ước tính

Với lưu lượng nhỏ, gần như toàn bộ nằm trong free tier: S3 vài cent, CloudFront miễn phí trong hạn mức
free tier hằng tháng, CloudFront Function và ACM miễn phí ở mức này. Khi gắn tên miền riêng sẽ có thêm
Route 53 hosted zone (khoảng $0.50/tháng) và tiền mua tên miền. Đây là ước lượng, hãy kiểm tra
AWS Pricing và để Budget cảnh báo.

## Giai đoạn tiếp theo

- **Tên miền riêng:** Route 53 + ACM (cert phải ở us-east-1 cho CloudFront).
- **Giai đoạn 2:** Cognito (đăng nhập), API Gateway + Lambda, DynamoDB lưu tiến độ và lịch ôn tập.
  Tiến độ hiện lưu trong `localStorage` qua `site/src/lib/progress.ts`, sẽ giữ làm chế độ khách.
