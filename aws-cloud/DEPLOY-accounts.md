# Triển khai tài khoản Google và đề thi trong database

Hướng dẫn cho chủ repo: các bước cấu hình một lần trên Neon, Google Cloud và Vercel, rồi cách kiểm tra.
Kiến trúc và lý do thiết kế xem `PLAN-accounts.md`.

Không có lệnh nào phải chạy bằng tay: mỗi lần Vercel build, `scripts/db-deploy.mjs` tự tạo bảng
(migration) và nhập 390 câu đề vào database của bản deploy đó.

## Tóm tắt biến môi trường

| Biến | Production | Preview | Lấy ở đâu |
|---|---|---|---|
| `DATABASE_URL` (và `DATABASE_URL_UNPOOLED`) | tự có | tự có (nhánh Neon riêng) | Bước 1, Vercel tự thêm |
| `GOOGLE_CLIENT_ID` | ✅ | ❌ không đặt | Bước 2 |
| `GOOGLE_CLIENT_SECRET` | ✅ | ❌ không đặt | Bước 2 |
| `SESSION_SECRET` | ✅ giá trị A | ✅ giá trị B (khác A) | Bước 3 |
| `AUTH_DEV_LOGIN` | ❌ không đặt | `1` | Bước 4 |
| `SITE_USER`, `SITE_PASSWORD` | giữ nguyên tới khi chạy ổn, sau đó xoá | giữ nguyên | đang có |

Khi production có đủ `DATABASE_URL`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`,
middleware chuyển sang yêu cầu đăng nhập Google và không còn dùng Basic auth nữa.

## Bước 1. Database Neon (qua Vercel Marketplace)

1. Mở https://vercel.com → chọn project của site (project đang deploy `aws-thao-tm.vercel.app`).
2. Tab **Storage** → **Create Database** → chọn **Neon** (Serverless Postgres) → **Continue**.
3. Điền:
   - Region: **Singapore (aws-ap-southeast-1)**. Các Vercel Function của site đã được đặt ở `sin1`
     (Singapore) trong `vercel.json`, nên database ở cùng vùng thì độ trễ thấp nhất.
   - Plan: **Free**.
   - Database name: `cloudlab`.
4. **Create**. Ở màn hình **Connect Project**:
   - Environments: tích **Production**, **Preview** và **Development**.
   - Mở **Advanced Options** (hoặc **Deployments Configuration**): bật **Create a database branch for
     deployment** cho **Preview**. Mỗi bản preview sẽ có một nhánh database riêng, nên dữ liệu thử
     không lẫn vào production.
   - **Environment variables prefix**: để trống, để các biến có đúng tên `DATABASE_URL` và
     `DATABASE_URL_UNPOOLED`.
5. **Connect**. Kiểm tra lại: **Settings → Environment Variables** phải có `DATABASE_URL` cho Production
   và Preview.

## Bước 2. Google OAuth client

1. Mở https://console.cloud.google.com → chọn project đang có, hoặc tạo project mới tên `CloudLab`.
2. Menu → **Google Auth Platform** (trước đây tên là **OAuth consent screen**) → **Get started**:
   - App name: `CloudLab`; User support email: email của bạn → **Next**.
   - Audience: **External** → **Next**.
   - Contact information: email của bạn → **Next** → đồng ý chính sách → **Create**.
3. **Audience** → **Publish app** → xác nhận để trạng thái thành **In production**. Nếu để ở **Testing**,
   chỉ các email trong danh sách test users mới đăng nhập được. Site chỉ xin `openid`, `email` và
   `profile`, nên Google không yêu cầu xét duyệt ứng dụng.
4. **Clients** → **Create client**:
   - Application type: **Web application**; Name: `CloudLab web`.
   - **Authorized JavaScript origins**: `https://aws-thao-tm.vercel.app`
   - **Authorized redirect URIs** (chép đúng, không có dấu `/` ở cuối):
     - `https://aws-thao-tm.vercel.app/auth/callback`
     - `http://localhost:4322/auth/callback` (để chạy thử trên máy với `npm run serve`)
   - Nếu site có thêm tên miền riêng, thêm cả origin và redirect URI của tên miền đó.
   - **Create**.
5. Chép **Client ID** và **Client secret** ngay. Giao diện mới của Google chỉ hiện secret một lần, nên
   bấm **Download JSON** để lưu lại.

## Bước 3. Tạo `SESSION_SECRET`

Đây là khoá ký cookie phiên đăng nhập; cần ít nhất 32 ký tự ngẫu nhiên. Tạo **hai** giá trị khác nhau,
một cho Production và một cho Preview. Chạy trên máy của bạn:

```sh
openssl rand -base64 48
```

Nếu máy không có `openssl`:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Không gửi các giá trị này vào chat hay commit vào repo.

## Bước 4. Biến môi trường trên Vercel

Vercel → project → **Settings → Environment Variables**. Với mỗi biến: nhập Key, Value, chọn đúng
Environment, bật **Sensitive** nếu là khoá bí mật, rồi **Save**.

| Key | Value | Environment |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Client ID ở bước 2 | Production |
| `GOOGLE_CLIENT_SECRET` | Client secret ở bước 2 (Sensitive) | Production |
| `SESSION_SECRET` | giá trị A ở bước 3 (Sensitive) | Production |
| `SESSION_SECRET` | giá trị B ở bước 3 (Sensitive) | Preview |
| `AUTH_DEV_LOGIN` | `1` | Preview |

`AUTH_DEV_LOGIN=1` bật form "Đăng nhập thử" (đăng nhập bằng một email bất kỳ, không qua Google) để
kiểm tra tự động trên preview. Code luôn bỏ qua biến này ở production. Vì ai mở được preview cũng
đăng nhập thử được, preview phải giữ Deployment Protection (bước 5).

## Bước 5. Bảo vệ bản preview và tạo khoá cho kiểm tra tự động

1. Vercel → project → **Settings → Deployment Protection**.
2. **Vercel Authentication**: bật, chọn **Standard Protection**. Bản preview chỉ người đã đăng nhập
   Vercel của team mới xem được.
3. **Protection Bypass for Automation** → **Add Secret** → **Save**. Chép giá trị secret; Claude dùng nó
   để gọi bản preview qua header `x-vercel-protection-bypass`.

## Bước 6. Cho phiên Claude truy cập bản preview

Phiên Claude Code chạy trong một container có mạng giới hạn: hiện tại `*.vercel.app` bị chặn. Trên
claude.ai/code, mở menu môi trường ở thanh tiêu đề của phiên → **Edit**:

1. **Network access**: thêm `*.vercel.app` vào **Allowed domains**, giữ nguyên ô cho phép package managers.
   Chi tiết: https://code.claude.com/docs/en/cloud-environments#network-access
2. **Environment variables** (hoặc **Network secrets** nếu có mục này): thêm
   `VERCEL_AUTOMATION_BYPASS_SECRET` với giá trị secret ở bước 5.
3. **Save**. Thay đổi chỉ có hiệu lực ở **phiên mới**.

## Bước 7. Deploy bản preview của nhánh

Nhánh `claude/peaceful-albattani-azsaxz` đã bật lại deploy preview, nên mỗi lần push sẽ có một bản
preview. Vì biến môi trường được đặt sau lần build gần nhất, cần build lại:

- Vercel → **Deployments** → bản mới nhất của nhánh `claude/peaceful-albattani-azsaxz` → **⋯ → Redeploy**.
- Khi build xong, mở log build và tìm hai dòng `database is up to date` và
  `390 questions imported`. Nếu có hai dòng này, database đã sẵn sàng.
- Chép **Branch URL** ở trang deployment, dạng `https://aws-git-claude-peaceful-…vercel.app`.

## Bước 8. Kiểm tra

Mở một phiên Claude mới trên repo này, nhánh `claude/peaceful-albattani-azsaxz`, và gửi:

> Chạy kiểm tra deploy tài khoản theo `aws-cloud/DEPLOY-accounts.md` bước 8 với preview `<Branch URL>`.

Claude sẽ chạy:

```sh
cd aws-cloud/site
node scripts/smoke-deploy.mjs <Branch URL> --dev
```

Script kiểm tra cổng đăng nhập, việc không còn JSON đề công khai, đăng nhập thử, chấm điểm ở server,
lưu dữ liệu người học, đăng xuất, và xoá tài khoản thử. Sau đó Claude mở các trang trong trình duyệt
(sáng/tối, desktop/điện thoại).

## Bước 9. Production (sau khi bạn đồng ý merge PR)

1. Trước khi merge, Claude khôi phục quy tắc tắt preview cho các nhánh `claude/*` trong `vercel.json`.
2. Merge PR → Vercel deploy production; log build phải có `390 questions imported`.
3. Claude chạy `node scripts/smoke-deploy.mjs https://aws-thao-tm.vercel.app --expect-google`. Không
   cần bypass, vì production không bật Vercel Authentication.
4. Việc chỉ bạn làm được, vì Claude không đăng nhập Google được:
   - Mở `https://aws-thao-tm.vercel.app` → bị chuyển tới `/login/` → **Đăng nhập bằng Google** → quay
     lại trang chủ.
   - Làm một câu ở **Đề luyện tập**; đánh dấu một phần bài học là đã đọc.
   - Mở site trên điện thoại, đăng nhập cùng tài khoản: câu đã làm và tiến độ phải giống trên máy tính.
   - Menu tài khoản (ảnh đại diện góc phải) → **Đăng xuất** → bị chuyển về `/login/`.
5. Khi mọi thứ ổn: xoá `SITE_USER` và `SITE_PASSWORD` khỏi Production.

## Quay lại bản cũ nếu có sự cố

Vercel → **Deployments** → chọn bản production trước khi merge → **⋯ → Instant Rollback**. Việc này
đưa site về Basic auth và JSON đề tĩnh như trước. Database không bị ảnh hưởng.

## Chạy trên máy (tuỳ chọn)

```sh
cd aws-cloud/site
npm ci && npm run build
export DATABASE_URL=postgres://…            # Postgres local, hoặc nhánh dev của Neon
export SESSION_SECRET=$(openssl rand -base64 48)
export AUTH_DEV_LOGIN=1                     # hoặc GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET
npm run db:deploy                           # migration + nhập đề
npm run serve                               # http://localhost:4322
npm run test:server                         # test API với database
```
