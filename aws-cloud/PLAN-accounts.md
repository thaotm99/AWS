# Kế hoạch: tài khoản Google, dữ liệu theo tài khoản và đề thi trong database

Trạng thái: **chưa triển khai** (chủ repo sẽ triển khai sau). Mỗi giai đoạn là một PR riêng, mỗi tính năng một commit;
chỉ merge khi chủ repo đồng ý (xem `CLAUDE.md`).

## 1. Mục tiêu

1. Đăng nhập bằng Google; mọi tài khoản Google đã xác minh email đều đăng nhập được (không có danh sách email cho phép).
2. Mọi dữ liệu học tập đang lưu trong trình duyệt được lưu theo tài khoản trên server, dùng chung giữa các thiết bị.
3. Câu hỏi, lời giải và bản dịch của 6 đề luyện thi chỉ nằm trong database, không còn trong repo, trong bản build
   hay trong file JSON công khai. Lý do: nội dung có bản quyền; lộ ra ngoài là sự cố nghiêm trọng.

**Giữ nguyên, không đưa vào database:** nội dung lý thuyết và câu hỏi trong lý thuyết, tức là toàn bộ bài học
(`src/content/concepts*/*.mdx`), mô phỏng, câu hỏi tự viết trong bài (`<Quiz>`, phần bài tập, SortGame,
RequirementPicker…), thuật ngữ, thẻ ghi nhớ, lab và sự cố giả lập. Các phần này do CloudLab tự viết nên vẫn build tĩnh
như hiện tại. Riêng trang `/concepts/<bài>/quiz/` đang hiển thị câu của 6 đề luyện thi (qua `ExamPage`), nên phần câu
hỏi của trang này tải từ `/api/practice/*` như trang luyện đề.

## 2. Hiện trạng

### 2.1. Dữ liệu người học đang ở trình duyệt

| Khoá / nơi lưu | File | Nội dung |
|---|---|---|
| `parts-read`, `done`, `last-part` | `src/lib/progress.ts` | Phần học đã đọc, bài đã xong, phần đọc gần nhất |
| `flashcards` | `src/lib/flashcards.ts` | Lịch ôn từng thẻ (lặp lại ngắt quãng) |
| `known-terms` | `src/lib/known-terms.ts` | Thuật ngữ đánh dấu đã biết |
| `notes` | `src/lib/notes.ts`, `src/modules/notes/Highlighter.ts` | Đoạn tô đánh dấu và ghi chú |
| `goals`, `activity` | `src/lib/goals.ts` | Mục tiêu ngày, nhật ký hoạt động (400 ngày) |
| `pomodoro`, `pomodoro-settings`, `pomodoro-log` | `src/lib/pomodoro.ts` | Phiên đang chạy, cài đặt, nhật ký |
| `labs`, `drills`, `city` | `src/lib/labs.ts`, `drills.ts`, `city.ts` | Thiết kế lab, kết quả sự cố giả lập, Cloud City |
| `exam-date` | `src/lib/exam-date.ts` | Ngày thi |
| `theme`, `locale` | `BaseLayout.astro`, `core/preferences` | Giao diện, ngôn ngữ |
| IndexedDB: `attempts`, `preferences` | `modules/practice/api`, `modules/shell/api` | Lượt làm đề; đã đi qua `ApiClient` nên đổi sang server chỉ cần đổi `src/app/api.ts` |
| `localStorage` của đề thi thử đang làm | `modules/practice/ui/MockExamPage.tsx` | Bài thi thử dở dang |

### 2.2. Nội dung đề thi đang nằm ở đâu

| Nơi | Nội dung | Mức nhạy cảm |
|---|---|---|
| `solution-architect-aws/00N Quiz Practice Test #N….html` | Nguyên văn 6 đề (390 câu, đáp án, lời giải) | **Cao** |
| `solution-architect-aws/translations/vi/*.json` | Bản dịch tiếng Việt câu hỏi và lời giải | **Cao** |
| `solution-architect-aws/<service>/practice-test-N.json` | Câu hỏi tách theo dịch vụ | **Cao** (cần rà lại nội dung) |
| `aws-cloud/site/dist/api/certifications/**` (build) và Vercel | 22 MB JSON: đề, câu hỏi, chủ đề, mỗi thứ VI + EN | **Cao**: hiện chỉ được Basic auth che |
| `src/modules/practice/illustrations/specs/*.ts` | Kịch bản minh hoạ viết lại theo ý câu hỏi, kèm `questionId` | Trung bình (diễn giải, không chép nguyên văn) |
| `<service>/list_qa.md`, `coverage/test-N.json`, prop `questions` của `<Scene>` | Mã câu (`examN_qM`) và từ khoá | Thấp (không có nội dung câu) |
| Lịch sử git (repo đang **public**) | Toàn bộ các file trên ở mọi commit cũ | **Cao** |

Build hiện đọc file HTML lúc build (`PracticeCatalog` → `QuizHtmlSource`) để sinh JSON tĩnh, số câu, danh sách chủ đề
và bản đồ câu → phần học (`src/data/question-lessons.ts`). Service worker (`src/pages/sw.js.ts`) cache cả JSON `/api`.

## 3. Kiến trúc đích

```
Trình duyệt ──► Vercel (một domain)
                 ├─ Trang tĩnh (Astro, prerender như hiện tại)
                 ├─ Routing Middleware: không có phiên hợp lệ → /login (thay Basic auth)
                 ├─ /auth/login · /auth/callback · /auth/logout     ── Google OAuth 2.0 / OpenID Connect
                 ├─ /api/me · /api/data/*  (dữ liệu người học)       ── Vercel Function ──┐
                 └─ /api/practice/*        (đề, câu hỏi, chấm điểm)  ── Vercel Function ──┤
                                                                                         ▼
                                                     Neon Postgres (Vercel Marketplace)
```

- **Database: Neon Postgres** thêm qua Vercel Marketplace (Vercel Postgres và Vercel KV đã ngừng; database của Vercel
  giờ là nhà cung cấp đối tác, tạo trong dashboard, tự gắn `DATABASE_URL`, tính tiền chung với Vercel). Dữ liệu dạng
  JSON theo người dùng + bảng câu hỏi có quan hệ → Postgres (`jsonb`) phù hợp hơn key-value. Driver:
  `@neondatabase/serverless`, khởi tạo lười (không gọi lúc build).
- **Đăng nhập: Google OAuth trực tiếp** (Authorization Code + PKCE, kiểm tra `state` và `nonce`, xác minh ID token
  bằng JWKS của Google qua `jose`). Không thêm dịch vụ quản lý người dùng bên ngoài.
- **Phiên**: cookie `HttpOnly; Secure; SameSite=Lax`, chứa JWT ký bằng `SESSION_SECRET` (hạn 30 ngày, có `sid`
  để thu hồi). Không lưu token trong `localStorage`.
- **Astro**: thêm adapter `@astrojs/vercel`; trang giữ `prerender`, chỉ route `/auth/*` và `/api/*` chạy theo request.
- **Hosting**: chỉ Vercel. Đường deploy S3 + CloudFront trong `infra/` không có backend → ngừng dùng hoặc giữ cho bản
  không có đề (quyết định ở mục 10).
- Đã cân nhắc và không chọn: DynamoDB + IAM qua OIDC (thêm hạ tầng AWS phải vận hành), Cognito + API Gateway + Lambda
  (khác domain → CORS, token ở trình duyệt, khó khoá trang tĩnh).

## 4. Bảo mật

### 4.1. Các mối đe doạ và biện pháp

| Mối đe doạ | Biện pháp |
|---|---|
| Repo public, lịch sử git chứa đề | Chuyển repo sang **private** (việc của chủ repo, làm ngay). Xoá file đề khỏi repo (giai đoạn 6). Cân nhắc xoá khỏi lịch sử bằng `git filter-repo` + force push: **không đảo ngược được**, chỉ làm khi chủ repo đồng ý riêng |
| JSON đề công khai trên Vercel | Bỏ hẳn `src/pages/api/certifications/**` khỏi build; đề chỉ trả qua `/api/practice/*` sau khi kiểm tra phiên |
| Bất kỳ ai có tài khoản Google đều đăng nhập được (chủ repo đã chọn bỏ danh sách email cho phép) | Chỉ nhận ID token có `email_verified`; đề vẫn chỉ trả sau khi đăng nhập, theo từng đề, có giới hạn tần suất và nhật ký truy cập. Nếu sau này cần đóng lại, thêm bảng `allowed_emails` và một bước kiểm tra trong `/auth/callback` |
| Lộ `DATABASE_URL` | Chỉ nằm trong biến môi trường Vercel (không có tiền tố public, không vào bundle client). Hai role Postgres: `app_rw` cho API (không có quyền DDL, chỉ đọc bảng câu hỏi) và `importer` cho script nhập đề, chỉ dùng trên máy chủ repo |
| Người dùng hợp lệ tải hàng loạt đề | API trả từng câu hoặc từng đề, không có endpoint dump; giới hạn tần suất theo người dùng (bảng `rate_limits` trong Postgres hoặc Vercel Firewall rate limiting); ghi `audit_log` mỗi lần đọc đề |
| Đáp án lộ trước khi làm | `GET` câu hỏi không kèm đáp án đúng và lời giải; trả sau khi người dùng nộp (`POST /check`) hoặc kết thúc bài thi thử |
| Cache đề ở CDN hoặc trình duyệt | `Cache-Control: private, no-store` cho mọi `/api/practice/*`; service worker không cache `/api/practice/*` và `/api/data/*`; đăng xuất xoá cache dữ liệu của SW |
| Đánh cắp phiên | Cookie `HttpOnly`/`Secure`/`SameSite=Lax`; mọi request ghi (`PUT/POST/DELETE`) yêu cầu header `X-Requested-With` hoặc kiểm tra `Origin` (chống CSRF); bảng `sessions` để thu hồi khi đăng xuất hoặc khi đăng xuất khỏi các thiết bị khác |
| Mất dữ liệu | Neon có point-in-time restore (thời gian giữ tuỳ gói); script xuất dữ liệu người dùng ra JSON; bản gốc HTML đề giữ ngoại tuyến ở máy chủ repo |

### 4.2. Giới hạn cần nói rõ

Database chặn việc tải đề hàng loạt từ file công khai và buộc phải đăng nhập. Vì không có danh sách email cho phép, bất kỳ ai
có tài khoản Google đều đăng nhập và đọc được câu hỏi trên màn hình; giới hạn tần suất và nhật ký truy cập chỉ làm việc sao chép hàng loạt khó hơn và để lại dấu vết, không ngăn
được hoàn toàn.

## 5. Mô hình dữ liệu (Postgres)

```sql
-- Người dùng và phiên
create table users (
  id text primary key,                 -- Google "sub"
  email text not null unique,
  name text, picture text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create table sessions (
  id uuid primary key,                 -- "sid" trong cookie
  user_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

-- Dữ liệu người học: một dòng cho mỗi tài liệu nhỏ (thay cho mỗi khoá localStorage)
create table user_docs (
  user_id text not null references users(id) on delete cascade,
  name text not null,                  -- progress | flashcards | known-terms | goals | activity | labs | drills | city
                                       -- | exam-date | pomodoro-settings | pomodoro-timer | preferences | mock:<cert>:<exam>
  value jsonb not null,
  version integer not null default 1,  -- tăng mỗi lần ghi; ghi kèm version cũ để chặn ghi đè
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);
create table notes (                   -- đoạn tô đánh dấu và ghi chú, số lượng tăng dần
  id uuid primary key,
  user_id text not null references users(id) on delete cascade,
  part text not null, quote text not null, color text not null, note text, lang text not null,
  created_at timestamptz not null, updated_at timestamptz not null, deleted_at timestamptz
);
create table pomodoro_sessions (
  id uuid primary key, user_id text not null references users(id) on delete cascade,
  started_at timestamptz not null, minutes integer not null, mode text not null
);

-- Đề thi (chỉ script nhập đề ghi; API chỉ đọc)
create table certifications (id text primary key, code text, name text, minutes int, question_count int, passing_score int, domains jsonb);
create table exams (cert_id text references certifications(id), number int, title text, primary key (cert_id, number));
create table questions (
  id bigint primary key,               -- id gốc trong đề, giữ nguyên để minh hoạ và lượt làm cũ còn khớp
  cert_id text not null, exam_number int not null, position int not null,
  domain text, multi boolean not null, answer_count int not null,
  prompt_en text not null, prompt_vi text,
  options jsonb not null,              -- [{key, en, vi}]
  correct jsonb not null,              -- không bao giờ trả cùng câu hỏi
  explanation_en text, explanation_vi text,
  unique (cert_id, exam_number, position)
);
create table question_topics (question_id bigint references questions(id), topic text, primary key (question_id, topic));
create table question_parts (question_id bigint references questions(id), lesson text, part text, primary key (question_id, lesson, part));

-- Lượt làm đề và giám sát
create table attempts (
  id uuid primary key, user_id text not null references users(id) on delete cascade,
  question_id bigint not null references questions(id), chosen jsonb not null, correct boolean not null,
  mode text not null,                  -- practice | mock | review | topic
  answered_at timestamptz not null
);
create index on attempts (user_id, answered_at);
create table audit_log (id bigserial primary key, user_id text, action text, target text, at timestamptz default now());
create table rate_limits (user_id text, bucket text, window_start timestamptz, count int, primary key (user_id, bucket, window_start));
```

Migration viết bằng SQL thuần trong `aws-cloud/site/db/migrations/NNN_*.sql`, chạy bằng một script nhỏ
(`npm run db:migrate`); không thêm ORM.

## 6. API

| Method | Đường dẫn | Việc |
|---|---|---|
| GET | `/auth/login` | Tạo `state`, `nonce`, PKCE; chuyển sang Google |
| GET | `/auth/callback` | Đổi code lấy token, xác minh ID token (`email_verified`), upsert `users`, tạo `sessions`, đặt cookie |
| POST | `/auth/logout` | Thu hồi phiên, xoá cookie |
| GET | `/api/me` | Hồ sơ người dùng |
| GET | `/api/data` | Toàn bộ `user_docs` + notes của người dùng (một request khi mở site) |
| PUT | `/api/data/:name` | Ghi một tài liệu, body `{ value, baseVersion }`; trả `409` kèm bản mới nhất khi lệch version |
| PUT / DELETE | `/api/notes/:id` | Ghi hoặc xoá mềm một ghi chú |
| GET | `/api/practice/certifications`, `/:cert` | Danh sách chứng chỉ, đề, số câu, domain (không có nội dung câu) |
| GET | `/api/practice/:cert/exams/:n` | Câu hỏi của một đề, **không có** đáp án và lời giải |
| POST | `/api/practice/questions/:id/check` | Chấm một câu, ghi `attempts`, trả đáp án + lời giải |
| POST | `/api/practice/:cert/exams/:n/mock/submit` | Nộp bài thi thử, chấm cả bài, trả kết quả theo domain |
| GET | `/api/practice/:cert/topics/:topic`, `/review`, `/skills` | Câu theo chủ đề, câu cần ôn, bản đồ kỹ năng (tính từ `attempts`) |
| GET | `/api/account/export` · DELETE `/api/account` | Xuất dữ liệu JSON · xoá tài khoản và mọi dữ liệu |

## 7. Dữ liệu ở client: đọc và ghi thẳng lên server

Chủ repo đã chọn **không đồng bộ dữ liệu trình duyệt**: server là nơi lưu duy nhất, trình duyệt không giữ bản sao
để chạy offline và không có hàng đợi gửi lại.

- Gom mọi truy cập `localStorage` ở `src/lib/*` về một store chung `src/core/userdata/` với API
  `get(name)`, `set(name, value)`, `subscribe(name, fn)`; sự kiện `*-change` hiện có giữ nguyên để giao diện không đổi.
  Store đọc và ghi qua API thay vì `localStorage`.
- Mở trang: `GET /api/data` một lần, giữ kết quả trong bộ nhớ của trang (không ghi xuống trình duyệt).
- Ghi: cập nhật giao diện ngay, gửi `PUT /api/data/:name` (gộp các lần ghi liền nhau trong ~1 giây). Lỗi mạng hoặc
  server: hoàn tác thay đổi trên giao diện và báo "Chưa lưu được, thử lại". `409` (thiết bị khác vừa ghi): tải bản
  mới nhất rồi áp lại thay đổi.
- Không gộp, không chuyển dữ liệu cũ: tiến độ đang nằm trong trình duyệt hiện tại **không** được đưa vào tài khoản.
  Tài khoản bắt đầu trống; dữ liệu cũ trong `localStorage` và IndexedDB được xoá ở lần đăng nhập đầu.
- Chỉ còn hai giá trị nằm ở trình duyệt: `theme` và `locale`, để trang hiện đúng màu và ngôn ngữ ngay khi tải
  (trước khi gọi API). Chúng cũng được lưu lên tài khoản như cài đặt.
- Mất mạng: bài học đã lưu offline vẫn đọc được (service worker giữ trang tĩnh như hiện tại), nhưng tiến độ, ghi chú
  và làm đề không lưu được; giao diện báo rõ.
- Đăng xuất: xoá cache dữ liệu của service worker; không còn dữ liệu người học nào trên trình duyệt.
- Luyện đề: `src/app/api.ts` đổi sang `HttpApiClient` cho `attempts`; các trang luyện đề tải đề qua `/api/practice/*`.

## 8. Đưa đề thi vào database

1. Viết `scripts/import-questions.mjs`: đọc 6 file HTML gốc và `translations/vi/*.json` từ một thư mục **ngoài repo**
   (đường dẫn qua biến `QUESTIONS_SRC`), dùng lại parser `QuizHtmlSource` và `HtmlSanitizer` hiện có, ghi vào
   `certifications`, `exams`, `questions`, `question_topics`, `question_parts` bằng role `importer`. Chạy lại được
   nhiều lần (upsert theo `id`). In báo cáo số câu từng đề để đối chiếu (phải đủ 390).
2. Dữ liệu build còn cần, không chứa nội dung câu: số câu mỗi đề, domain, mã câu theo chủ đề (`list_qa.md`), bản đồ
   câu → phần học. Tách thành `src/data/practice-manifest.json` (chỉ mã và số), sinh bằng script nhập đề.
3. Bỏ `src/pages/api/certifications/**`; các trang `/practice/**` chỉ render khung, tải nội dung qua `/api/practice/*`.
4. Minh hoạ (`illustrations/specs`): giữ trong code (diễn giải, không chép nguyên văn); rà lại để chắc không có câu
   chữ nguyên văn của đề.
5. Công cụ dịch (`translations/tools/*.mjs`): chuyển sang đọc và ghi bảng `questions` (`prompt_vi`, `explanation_vi`)
   hoặc giữ ngoài repo cùng file nguồn.
6. Xoá khỏi repo: 6 file HTML đề, `translations/vi/*.json`, `<service>/practice-test-N.json` (sau khi rà nội dung).
   Cập nhật `README.md`, `CLAUDE.md` (mục Luyện đề) và quy trình dịch.
7. Kiểm tra: grep bản build không còn chuỗi đặc trưng của đề (lấy mẫu 20 câu ngẫu nhiên); `dist/api` không còn tồn tại;
   gọi `/api/practice/*` khi chưa đăng nhập trả `401`.

## 8a. Giao diện

Bản vẽ đã review: https://claude.ai/artifact/JVZe1388mcNjpSmx1GiHmf (7 màn, cùng màu và font CloudLab).

| # | Màn | Nội dung |
|---|---|---|
| 1–2 | Đăng nhập (desktop, điện thoại) | Logo CloudLab và một thẻ đăng nhập ở giữa (không có cột giới thiệu bên trái); nút "Đăng nhập bằng Google" theo mẫu nút của Google; dòng "CloudLab chỉ đọc tên, email và ảnh đại diện"; chọn VI/EN. Lỗi đăng nhập (huỷ, email chưa xác minh, phiên hết hạn) hiện thành một dòng ngay dưới nút, không có trang riêng |
| 3 | Menu tài khoản | Ảnh đại diện trên thanh trên cùng mở menu: tên, email, Tài khoản và dữ liệu, Tiến độ, Đăng xuất |
| 4 | Trang tài khoản `/account/` | Hồ sơ; bảng dữ liệu đã lưu (9 loại, số lượng, thời điểm cập nhật); tải dữ liệu JSON; danh sách phiên, đăng xuất các thiết bị khác; vùng xoá tài khoản |
| 5 | Xác nhận xoá tài khoản | Gõ đúng email mới bật nút xoá; nhắc tải dữ liệu về trước |
| 6 | Luyện đề | Câu hỏi tải từ API; bấm Kiểm tra mới nhận đáp án và lời giải từ server |
| 7 | Trạng thái khi tải đề | Đang tải (lần đầu có thể chậm do database khởi động), mất mạng, mở quá nhiều câu (tạm dừng `[n]` giây), phiên hết hạn |

## 9. Các giai đoạn

| # | Giai đoạn | Việc chính | Điều kiện xong | Trạng thái |
|---|---|---|---|---|
| 0 | Chuẩn bị (chủ repo) | Chuyển repo private; thêm Neon qua Vercel Marketplace; tạo OAuth Client trên Google Cloud; đặt biến môi trường (mục 11) | `DATABASE_URL`, `GOOGLE_CLIENT_ID/SECRET`, `SESSION_SECRET` có trên Vercel | ⬜ xem `DEPLOY-accounts.md` |
| 1 | Store dữ liệu chung | `src/core/userdata/`; đổi `src/lib/*`, `Highlighter`, `MockExamPage` sang store; unit test cho store và luật gộp | Không đổi hành vi; pixel diff + click QA như cũ | ✅ `src/core/userdata/` |
| 2 | Hạ tầng server | Adapter `@astrojs/vercel` (trang vẫn prerender); `db/migrations` + `npm run db:migrate`; hai role Postgres | Build và deploy preview OK; migration chạy được trên Neon | ✅ một Vercel Function `api/index.ts` thay cho adapter |
| 3 | Đăng nhập Google | `/login`, `/auth/*`, bảng `users`/`sessions`; middleware thay Basic auth trên production; menu tài khoản | Đăng nhập được bằng mọi tài khoản Google đã xác minh email; đăng xuất thu hồi phiên; preview vẫn Basic auth | ✅ |
| 4 | Dữ liệu người học trên server | `/api/me`, `/api/data*`, `/api/notes/*`; store đọc và ghi qua API; báo lỗi và hoàn tác khi không lưu được; xoá dữ liệu cũ trong trình duyệt ở lần đăng nhập đầu; SW không cache API | Dữ liệu khớp giữa 2 trình duyệt; không còn dữ liệu người học trong `localStorage`/IndexedDB | ✅ |
| 5 | Đề thi trong database | Script nhập đề; manifest; `/api/practice/*` (chấm ở server, giới hạn tần suất, audit log); trang luyện đề tải qua API; bỏ JSON tĩnh | Đủ 390 câu; mọi luồng luyện đề, thi thử, ôn câu sai, bản đồ kỹ năng chạy như cũ; `dist` không còn nội dung đề | ✅ manifest để lại cho giai đoạn 6 |
| 6 | Dọn repo | Xoá file đề và bản dịch khỏi repo; cập nhật tài liệu; (tuỳ chọn, cần đồng ý riêng) xoá khỏi lịch sử git | `git grep` không còn nội dung đề | ⬜ |
| 7 | Trang tài khoản | Hồ sơ, bảng dữ liệu đã lưu, xuất dữ liệu JSON, phiên đăng nhập (đăng xuất các thiết bị khác), xoá tài khoản (gõ email để xác nhận) | Xuất ra đủ dữ liệu; xoá tài khoản xoá sạch các bảng | ✅ |
| 8 | QA và vận hành | Kiểm tra bảo mật (mục 4), sáng/tối, desktop/điện thoại, VI/EN; tài liệu khôi phục dữ liệu | Checklist mục 4 đạt hết | ⬜ |

Thứ tự bắt buộc: 0 → 1 → 2 → 3, sau đó 4 và 5 làm song song được; 6 chỉ làm sau khi 5 chạy ổn trên production.

## 10. Quyết định cần chốt trước khi làm

| Câu hỏi | Đề xuất |
|---|---|
| Ai được đăng nhập? | **Đã chốt:** mọi tài khoản Google đã xác minh email, không có danh sách cho phép |
| Đồng bộ dữ liệu trình duyệt? | **Đã chốt:** không. Server là nơi lưu duy nhất; tiến độ cũ trong trình duyệt không chuyển vào tài khoản |
| Bản preview của Vercel đăng nhập thế nào? | Giữ Basic auth (Google không nhận redirect URI thay đổi theo từng preview); preview dùng một nhánh database riêng của Neon, không có đề thật hoặc chỉ một đề mẫu |
| Giữ đường deploy S3 + CloudFront? | Ngừng; `infra/` giữ lại làm tài liệu tham khảo hoặc xoá |
| Xoá đề khỏi lịch sử git? | Có, nhưng chỉ sau khi repo đã private và giai đoạn 5 chạy ổn; cần sao lưu repo trước |
| Có cần chấm đề ở server (ẩn đáp án tới khi nộp)? | Có (mục 4.1); thêm một request mỗi câu, chấp nhận được |

## 11. Việc chủ repo làm

Các bước chi tiết (Neon, Google OAuth, biến môi trường, kiểm tra): **`DEPLOY-accounts.md`**.

1. GitHub: Settings → Danger Zone → Change repository visibility → **Make private**.
2. Vercel: project `aws` → Storage → Create Database → **Neon** → nối vào project (tự có `DATABASE_URL`).
3. Google Cloud Console: APIs & Services → Credentials → Create OAuth client ID (Web application);
   Authorized redirect URI: `https://aws-thao-tm.vercel.app/auth/callback` và `http://localhost:4321/auth/callback`.
4. Vercel → Environment Variables (Production): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `SESSION_SECRET` (chuỗi ngẫu nhiên ≥ 32 byte).
5. Giữ một bản sao 6 file đề và bản dịch ở nơi riêng tư ngoài repo, để chạy script nhập đề.

## 12. Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Thay đổi lớn, chạm gần như mọi tính năng | Giai đoạn 1 không đổi hành vi, có pixel diff và click QA; mỗi giai đoạn một PR |
| Neon gói miễn phí tự tắt khi không dùng → request đầu chậm | Hiện trạng thái đang tải; trang tĩnh (bài học) vẫn hiện ngay, chỉ phần dữ liệu cá nhân và đề bị trễ |
| Mất mạng thì không lưu được tiến độ | Báo rõ trên giao diện và cho thử lại; chấp nhận được vì chủ repo đã chọn không đồng bộ offline |
| Mất tiến độ đang có trong trình duyệt | Đã chốt không chuyển; nếu cần giữ, chủ repo xuất dữ liệu cũ trước khi lên bản mới |
| Luyện đề phụ thuộc mạng | Đề đang làm giữ trong bộ nhớ trang; mất mạng thì báo và cho làm lại khi có mạng (không cache đề lâu dài) |
| Xoá lịch sử git làm hỏng các clone cũ và PR mở | Làm cuối cùng, khi không còn PR mở; báo trước |
| Hết hạn gói miễn phí hoặc đổi giá | Dữ liệu nhỏ; có script xuất toàn bộ dữ liệu ra JSON để chuyển nơi khác |
