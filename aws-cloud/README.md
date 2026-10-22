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
│   ├── src/practice/             trang Ôn tập (luyện đề), xem mục "Ôn tập" bên dưới
│   ├── src/data/practice/        đọc file đề lúc build, khai báo các chứng chỉ
│   └── src/pages/                trang chủ, trang bài học, /on-tap/, /api/*.json, 404
└── infra/                        AWS CDK (TypeScript)
    └── lib/static-site-stack.ts  S3, CloudFront, IAM role cho GitHub, Budget
```

## Ôn tập (`/on-tap/`)

Luyện đề từng câu: chọn chứng chỉ → chọn đề → chọn đáp án, bấm Kiểm tra để xem đúng sai và lời giải →
câu tiếp theo → kết quả theo từng domain. Trang này hiển thị **nguyên văn** câu hỏi từ các file đề
trong repo, nên site chỉ dùng riêng, không chia sẻ công khai.

Các tầng trong `site/src/practice/`, mỗi tầng chỉ gọi tầng ngay dưới:

```
ui/          React: đọc store, phát event (không gọi service)
  │ dispatch(event)                     ▲ useStore(store)
app/         EventBus → Controller (CatalogController, ExamController) → Store
  │ gọi service
services/    CatalogService, AttemptService: gọi API như REST thường (get/post/put)
  │ ApiClient (abstract)
api/         CompositeApiClient
               ├─ /attempts/**  → LocalApiClient → AttemptResource → StorageDriver
               │                                     (IndexedDB → localStorage → memory)
               └─ còn lại       → StaticApiClient → /api/**.json (Astro build từ file đề)
domain/      kiểu dữ liệu dùng chung + Scoring (chấm điểm)
```

API (cùng đường dẫn cho bản tĩnh và server sau này):

| Method | Path | Trả về |
|---|---|---|
| GET | `/certifications` | danh sách chứng chỉ |
| GET | `/certifications/:cert` | chứng chỉ + danh sách đề |
| GET | `/certifications/:cert/exams/:exam` | đề kèm câu hỏi, đáp án, lời giải |
| GET | `/attempts?certId=&examId=` | các lượt làm, mới nhất trước |
| GET | `/attempts/latest?certId=&examId=` | lượt làm mới nhất (404 nếu chưa có) |
| POST | `/attempts` | bắt đầu lượt mới `{certId, examId, questionCount}` |
| PUT | `/attempts/:id/answers/:questionId` | lưu một câu trả lời `{chosen, correct}` |

- **Chuyển lưu trữ lên server:** viết server theo bảng trên, rồi trong `api/createApiClient.ts` trả về
  `new HttpApiClient({ baseUrl })` (có `headers` để gắn token khi có đăng nhập). Service và UI không đổi.
- **Thêm chứng chỉ:** thêm một mục vào `CERTIFICATIONS` trong `src/data/practice/PracticeCatalog.ts`, trỏ tới
  thư mục đề. File đề dạng khác thì viết một lớp con của `ExamSource`.
- HTML trong đề được lọc lúc build (`HtmlSanitizer`), chỉ giữ thẻ định dạng, link và ảnh.

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
4. **Không chép nguyên văn câu hỏi vào bài học** (đề có bản quyền). Chỉ ghi mã câu; câu hỏi
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
