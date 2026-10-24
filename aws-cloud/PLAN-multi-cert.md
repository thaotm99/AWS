# Kế hoạch: nhiều chứng chỉ (nhiều loại đề)

Trạng thái: **chưa triển khai**. Kế hoạch này chạy sau, hoặc cùng lúc với, `PLAN-accounts.md`: phần database và
tài khoản dùng chung schema với kế hoạch đó. Mỗi giai đoạn là một PR riêng, mỗi tính năng một commit; chỉ merge khi chủ
repo đồng ý (xem `CLAUDE.md`).

Bản vẽ đã review: https://claude.ai/artifact/VmYoPC7dEYM1XrahTzNvNS (7 màn).

## 1. Mục tiêu

1. Thêm được chứng chỉ mới (CLF-C02, DVA-C02, SAP-C02…) mà không sao chép hay viết lại bài học đã có.
2. Người học chọn chứng chỉ đang ôn; lộ trình, đề luyện tập, trang Ôn thi và tiến độ đi theo chứng chỉ đó.
3. Một người ôn nhiều chứng chỉ: mỗi chứng chỉ có ngày thi, điểm thi thử và điểm theo domain riêng; phần đã đọc,
   ghi chú, thẻ ghi nhớ dùng chung.

## 2. Hiện trạng: phần nào đang gắn cứng với SAA-C03

| Nơi | Đang gắn với SAA-C03 thế nào |
|---|---|
| `src/data/curriculum.ts` | `LAYERS` là thứ tự học của SAA-C03; `importanceOf()` tính mức quan trọng từ số câu trong 6 đề SAA |
| `src/data/exam.ts`, `question-lessons.ts` | Đọc `list_qa.md` / `overview.md` của `solution-architect-aws/` |
| `src/pages/exam-guide.astro`, `progress.astro`, `concepts/[id]/quiz.astro` | Lấy `practiceCatalog.listCertifications()[0]` (chứng chỉ đầu tiên) |
| `src/pages/index.astro`, `glossary.astro`, `flashcards.astro`, `search-index`, `BaseLayout` (thanh bên) | Duyệt theo `LAYERS` của SAA-C03 |
| `src/modules/practice/**` | **Đã hỗ trợ nhiều chứng chỉ** (`CERTIFICATIONS`, đường dẫn `/practice/<cert>/`, domain theo chứng chỉ) |
| Nội dung bài học (`src/content/concepts*/*.mdx`) | Viết theo tình huống MFTECH, gần như không phụ thuộc chứng chỉ; giữ nguyên |

## 3. Thiết kế

### 3.1. Nguyên tắc

- **Bài học dùng chung.** Một bài, một địa chỉ (`/concepts/vpc/`), một nội dung cho mọi chứng chỉ. Bài học không ghi
  tên chứng chỉ trong frontmatter hay nội dung.
- **Mỗi chứng chỉ khai báo lộ trình của mình** trong một file: bài nào, thứ tự, mức quan trọng, phần nào bắt buộc.
- **Tiến độ đọc thuộc về bài**, không thuộc về chứng chỉ: đọc phần 1 của VPC thì mọi lộ trình có phần đó đều thấy
  đã đọc.
- **Đề luyện tập thuộc về một chứng chỉ** (bản quyền, nằm trong database theo `PLAN-accounts.md`).

### 3.2. File khai báo chứng chỉ (trong repo)

`src/data/certs/<cert>.ts`, một file mỗi chứng chỉ, và `src/data/certs/index.ts` liệt kê tất cả:

```ts
export const saaC03: CertDefinition = {
  id: "saa-c03",
  code: "SAA-C03",
  provider: "aws",
  name: { vi: "Solutions Architect – Associate", en: "Solutions Architect – Associate" },
  level: "associate",                       // foundational | associate | professional | specialty
  status: "ready",                          // ready | soon | retired
  exam: { minutes: 130, questionCount: 65, passingScore: 720, scoreMin: 100, scoreMax: 1000 },
  domains: [                                // theo exam guide chính thức; đối chiếu khi thêm hoặc cập nhật
    { id: "secure", name: "Design Secure Architectures", weight: 0.3 },
    { id: "resilient", name: "Design Resilient Architectures", weight: 0.26 },
    { id: "performance", name: "Design High-Performing Architectures", weight: 0.24 },
    { id: "cost", name: "Design Cost-Optimized Architectures", weight: 0.2 },
  ],
  path: [                                   // lộ trình: lớp → bài; thứ tự = thứ tự học
    { layer: { vi: "Networking", en: "Networking" }, lessons: [
      { id: "vpc", importance: 3, parts: "all" },
      { id: "route53", importance: 2, parts: "all" },
    ] },
    // …
  ],
};
```

- `parts`: `"all"` hoặc danh sách slug phần học bắt buộc (`["internet-access", "security-group-chain"]`). Phần
  không có trong danh sách hiện nhãn "Nâng cao · không bắt buộc" với chứng chỉ đó.
- `importance` khai báo tay theo exam guide của từng chứng chỉ; với SAA-C03 lấy đúng giá trị `importanceOf()` đang
  tính hiện nay để không đổi giao diện.
- Kiểm tra lúc build (`astro check` + một test): mọi `id` bài và slug phần tồn tại; tổng trọng số domain = 1;
  mọi bài có `importance` 1–3.
- `src/data/curriculum.ts` đổi thành hàm `getPath(certId)`; `LAYERS` hiện tại chuyển vào `saa-c03.ts`.
- Bài viết riêng cho một chứng chỉ (ví dụ "Shared responsibility model" cho CLF-C02) vẫn là một bài MDX bình thường,
  chỉ xuất hiện trong lộ trình của chứng chỉ khai báo nó.

### 3.3. Chứng chỉ đang chọn

- Lưu ở `users.current_cert_id` (server). Trang tĩnh đọc qua `/api/me`; để trang hiện đúng ngay khi tải, giá trị này
  được giữ thêm trong `localStorage` như `theme` và `locale` (là cài đặt giao diện, không phải dữ liệu học tập).
- Chưa đăng nhập hoặc chưa chọn: dùng chứng chỉ mặc định trong `src/data/certs/index.ts` (SAA-C03).
- Lần đầu đăng nhập mà chưa có chứng chỉ: chuyển tới `/certs/` để chọn.

### 3.4. Đường dẫn

| Đường dẫn | Theo chứng chỉ? | Ghi chú |
|---|---|---|
| `/certs/` | — | Trang chọn chứng chỉ (mới) |
| `/` | Có (client) | Lộ trình của chứng chỉ đang chọn; thanh bên cũng vậy |
| `/concepts/<id>/`, `/concepts/<id>/<part>/` | Không | Một bài cho mọi chứng chỉ; khối "Bài này có trong lộ trình" và nhãn "Nâng cao" tính theo chứng chỉ đang chọn ở client |
| `/concepts/<id>/quiz/` | Có | Câu hỏi về bài, của chứng chỉ đang chọn (`?cert=` để xem chứng chỉ khác) |
| `/practice/<cert>/…` | Có | Như hiện tại |
| `/exam-guide/<cert>/` | Có | `/exam-guide/` chuyển tới chứng chỉ đang chọn |
| `/progress/` | Tất cả | Mỗi chứng chỉ một thẻ |
| `/glossary/`, `/flashcards/` | Có (lọc) | Mặc định lọc theo bài trong lộ trình; có nút "Tất cả" |

### 3.5. Giao diện (theo bản vẽ)

| # | Màn | Nội dung |
|---|---|---|
| 1 | Chọn chứng chỉ `/certs/` | Nhóm theo cấp; mỗi thẻ: mã, tên, số câu, thời gian, điểm đạt, trạng thái (Đang ôn · Có lộ trình · Sắp có), nội dung hiện có |
| 2 | Nút chuyển chứng chỉ | Ô mã chứng chỉ cạnh logo trên thanh trên cùng; danh sách chứng chỉ đang ôn (ngày thi, số bài đã đọc) và "Thêm chứng chỉ khác" |
| 3 | Lộ trình | Tiêu đề "Lộ trình <mã>", số bài đã đọc, ngày thi, domain và trọng số, các lớp và bài với mức quan trọng theo chứng chỉ, ghi chú "dùng chung với…"; mục gập "Bài ngoài lộ trình" |
| 4 | Bài học | Khối "Bài này có trong lộ trình" (mỗi chứng chỉ: mức quan trọng, phần bắt buộc); danh sách phần với nhãn "Nâng cao · không bắt buộc"; kiểm tra sau bài theo từng chứng chỉ |
| 5 | Luyện đề | Như hiện tại, thêm số câu cần ôn, domain yếu nhất, số ngày tới ngày thi; liên kết sang chứng chỉ khác |
| 6 | Tiến độ | Mỗi chứng chỉ một thẻ: bài trong lộ trình đã đọc, điểm thi thử gần nhất, ngày thi, điểm theo domain; nút đánh dấu đã thi đỗ hoặc đặt ngày thi |
| 7 | Mô hình dữ liệu | Sơ đồ ở mục 4 |

## 4. Database (bổ sung cho `PLAN-accounts.md`)

Thay bảng `certifications` và `exams` trong `PLAN-accounts.md` bằng các bảng dưới; bỏ tài liệu `exam-date` khỏi
`user_docs` (chuyển sang `user_certs`).

```sql
-- Chứng chỉ: script nhập đề đồng bộ từ src/data/certs/*.ts (repo là nguồn gốc)
create table certifications (
  id text primary key,                       -- "saa-c03"
  code text not null, provider text not null, name text not null, level text not null,
  minutes int not null, question_count int not null,
  passing_score int not null, score_min int not null, score_max int not null,
  status text not null default 'ready',      -- ready | soon | retired
  retires_on date
);
create table cert_domains (
  cert_id text not null references certifications(id),
  id text not null,                          -- "secure"
  position int not null, name text not null, weight numeric(4,3) not null,
  primary key (cert_id, id)
);

-- Đề luyện tập (bản quyền)
create table practice_sets (
  id text primary key,                       -- "saa-c03-1"
  cert_id text not null references certifications(id),
  number int not null, title text not null, question_count int not null, has_mock boolean not null default true,
  unique (cert_id, number)
);
create table questions (
  id bigint primary key,
  cert_id text not null references certifications(id),
  set_id text not null references practice_sets(id),
  domain_id text not null,
  position int not null, multi boolean not null, answer_count int not null,
  prompt_en text not null, prompt_vi text,
  options jsonb not null, correct jsonb not null,
  explanation_en text, explanation_vi text,
  foreign key (cert_id, domain_id) references cert_domains(cert_id, id),
  unique (set_id, position)
);
create table question_lessons (             -- câu → bài / phần học, để gợi ý phần cần đọc lại
  question_id bigint not null references questions(id) on delete cascade,
  lesson_id text not null, part text not null,
  primary key (question_id, lesson_id, part)
);

-- Người học theo chứng chỉ
alter table users add column current_cert_id text references certifications(id);
create table user_certs (
  user_id text not null references users(id) on delete cascade,
  cert_id text not null references certifications(id),
  status text not null default 'studying',  -- studying | paused | passed
  exam_date date, target_score int,
  started_at timestamptz not null default now(), passed_at timestamptz,
  primary key (user_id, cert_id)
);
alter table attempts add column cert_id text not null references certifications(id);  -- lọc nhanh theo chứng chỉ
create index on attempts (user_id, cert_id, answered_at);
create table mock_sessions (
  id uuid primary key,
  user_id text not null references users(id) on delete cascade,
  cert_id text not null references certifications(id),
  set_id text not null references practice_sets(id),
  started_at timestamptz not null, submitted_at timestamptz,
  score numeric(5,2), scaled_score int,
  domain_scores jsonb                        -- { "secure": 0.82, … }
);
create index on mock_sessions (user_id, cert_id, submitted_at);
```

Những gì **không** lưu sẵn, mà tính khi đọc:

- Bài đã đọc theo chứng chỉ = `user_docs.progress` (phần đã đọc) giao với `path` của chứng chỉ (file trong repo).
- Điểm theo domain = `attempts` nối `questions` nối `cert_domains`, lọc theo `user_id`, `cert_id`.
- Domain yếu nhất, câu cần ôn lại: như logic hiện có trong `modules/practice/domain`, thêm điều kiện `cert_id`.

## 5. API (bổ sung)

| Method | Đường dẫn | Việc |
|---|---|---|
| GET | `/api/certs` | Danh sách chứng chỉ (từ file trong repo) kèm số đề, số câu trong database |
| GET | `/api/me/certs` | Các chứng chỉ của người dùng (`user_certs`) và chứng chỉ đang chọn |
| PUT | `/api/me/certs/:cert` | Thêm hoặc cập nhật: trạng thái, ngày thi, điểm mục tiêu |
| PUT | `/api/me/current-cert` | Đổi chứng chỉ đang chọn |
| GET | `/api/practice/:cert/progress` | Bài trong lộ trình đã đọc, điểm thi thử gần nhất, điểm theo domain |
| POST | `/api/practice/:cert/sets/:set/mock/submit` | Như `PLAN-accounts.md`, ghi thêm `mock_sessions` |

## 6. Các giai đoạn

| # | Giai đoạn | Việc chính | Điều kiện xong | Trạng thái |
|---|---|---|---|---|
| 1 | Khai báo chứng chỉ trong repo | `src/data/certs/` (`CertDefinition`, `saa-c03.ts` từ `LAYERS` hiện tại), `getPath(certId)`; mọi chỗ ở mục 2 đọc qua chứng chỉ thay vì `LAYERS` / `listCertifications()[0]`; test kiểm tra khai báo | Không đổi giao diện: so ảnh pixel toàn site như các đợt trước | ⬜ |
| 2 | Chứng chỉ đang chọn | `/certs/`; nút chuyển chứng chỉ; lộ trình, thanh bên, trang chủ, `/exam-guide/<cert>/` theo chứng chỉ đang chọn (trước khi có tài khoản: lưu ở trình duyệt) | Đổi chứng chỉ thì lộ trình, Ôn thi, luyện đề đổi theo | ⬜ |
| 3 | Bài học dùng chung | Khối "Bài này có trong lộ trình", nhãn "Nâng cao" theo `parts`; kiểm tra sau bài theo chứng chỉ; thuật ngữ và thẻ ghi nhớ lọc theo lộ trình | Đúng với một chứng chỉ thử có `parts` khác SAA-C03 | ⬜ |
| 4 | Database theo chứng chỉ | Bảng mục 4; script nhập đề nhận tham số chứng chỉ; `user_certs`, `mock_sessions`; API mục 5 (sau giai đoạn 4–5 của `PLAN-accounts.md`) | Hai chứng chỉ trong database, điểm và tiến độ tách riêng | ⬜ |
| 5 | Tiến độ nhiều chứng chỉ | Trang `/progress/` mỗi chứng chỉ một thẻ; ngày thi theo chứng chỉ trên trang Ôn thi | Khớp số liệu với trang luyện đề của từng chứng chỉ | ⬜ |
| 6 | Chứng chỉ thứ hai | Khai báo file, viết bài còn thiếu (song ngữ, đối chiếu AWS docs), nhập đề | Lộ trình đầy đủ; QA như mọi PR nội dung | ⬜ |

Giai đoạn 1–3 không cần database, làm được trước `PLAN-accounts.md`.

## 7. Quyết định cần chốt

| Câu hỏi | Đề xuất |
|---|---|
| Chứng chỉ thứ hai là gì? | Chọn theo nhu cầu; CLF-C02 dùng lại nhiều bài nhất, DVA-C02 cần nhiều bài mới nhất |
| Bài chỉ của một chứng chỉ có hiện trong lộ trình chứng chỉ khác? | Không; vẫn tìm thấy qua tìm kiếm và mục "Bài ngoài lộ trình" |
| Đề luyện tập của chứng chỉ khác lấy từ đâu? | Phải có nguồn hợp lệ; cùng quy tắc bản quyền với đề SAA-C03 (chỉ trong database, không vào repo) |
| Chứng chỉ bị AWS thay phiên bản (ví dụ SAA-C03 → bản mới)? | Thêm chứng chỉ mới, chứng chỉ cũ chuyển `retired`; lượt làm và điểm cũ giữ nguyên |
| Mức quan trọng của bài cho chứng chỉ mới tính thế nào? | Khai báo tay theo exam guide; khi đã có đề trong database thì đối chiếu với số câu theo bài |

## 8. Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Bài học viết sâu theo SAA-C03, quá khó với CLF-C02 | Dùng `parts` để chỉ yêu cầu các phần đầu; viết bài nhập môn riêng khi cần |
| Thông tin đề thi (số câu, thời gian, điểm đạt, domain) sai hoặc lỗi thời | Lấy từ exam guide chính thức, ghi nguồn trong file khai báo; test kiểm tra tổng trọng số |
| Giao diện phân nhánh theo chứng chỉ ở client gây nháy khi tải | Chứng chỉ đang chọn giữ trong `localStorage` như `theme`/`locale`, đọc trước lần vẽ đầu |
| Đổi `LAYERS` làm vỡ trang hiện tại | Giai đoạn 1 không đổi hành vi, có so ảnh pixel toàn site |
