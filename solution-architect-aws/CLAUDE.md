# AWS SAA-C03 Study Project

## Lưu ý quan trọng — nơi lưu rule & tiến độ

Repo này là public và có thể được mở từ nhiều máy khác nhau. **Mọi rule, workflow,
tiến độ học đều phải lưu trong chính repo** (`CLAUDE.md`, `STUDY_PLAN.md`,
`overview.md`, `{service}/*.md`) — **KHÔNG lưu vào Claude memory cá nhân** của máy
đang chạy, vì memory đó không đi theo repo sang máy khác. Nếu có rule/tiến độ mới
cần nhớ, cập nhật trực tiếp vào các file trong repo.

## Mục tiêu
Ôn thi AWS Solutions Architect Associate (SAA-C03) trong 1 tháng.

## Files trong project
- `AWS Certified Solutions Architect Slides v47.pdf` — 900 trang slide, chỉ để tham khảo
  lịch sử, KHÔNG dùng làm nguồn lý thuyết chính (có thể chứa lỗi/lỗi thời) — nguồn chính
  là AWS official documentation (docs.aws.amazon.com)
- `001 Quiz Practice Test #1 - AWS Certified Solutions Architect Associate.html`
- `001 Quiz Practice Test #2 - AWS Certified Solutions Architect Associate.html`
- `001 Quiz Practice Test #3 - AWS Certified Solutions Architect Associate.html`
- `001 Quiz Practice Test #4- AWS Certified Solutions Architect Associate.html`
- `001 Quiz Practice Test #5- AWS Certified Solutions Architect Associate.html`
- `001 Quiz Practice Test #6- AWS Certified Solutions Architect Associate.html`

## Người học
- Đã có nền tảng AWS
- Điểm yếu: Networking, IAM/Security, HA, Storage & DB
- Mục tiêu: nắm sâu để thi, không chỉ học thuộc

---

## Workflow chuẩn mỗi buổi học (question-driven)

Không đọc PDF theo section trước rồi mới luyện đề — thay vào đó bám sát câu hỏi
thực tế để xác định phạm vi khái niệm cần học, tránh học lan man những gì đề
không hỏi.

### Bước 1: List khái niệm từ câu hỏi

1. Tạo folder `{service}/` nếu chưa tồn tại
2. Lọc câu hỏi liên quan service từ 6 file HTML → tạo/update `{service}/list_qa.md`
3. Đọc lướt các câu hỏi đó, liệt kê ra các khái niệm/concepts mà chúng kiểm tra
4. **Ghi danh sách khái niệm ra `{service}/keyword.md`** (xem format bên dưới)
- KHÔNG đọc toàn bộ PDF section trước — chỉ xác định phạm vi cần đào sâu

### Bước 2: Đào sâu khái niệm

1. Với từng khái niệm đã list, tra **AWS official documentation** (docs.aws.amazon.com)
   qua WebFetch/WebSearch — đây là nguồn chính, **KHÔNG dùng PDF slide** (slide có thể
   chứa lỗi/lỗi thời)
2. Thảo luận sâu, hỏi qua lại để hiểu bản chất — không chỉ học thuộc
3. **Sau khi đào sâu xong MỘT khái niệm** → hỏi người học có muốn **thực hành hands-on**
   (tạo resource thật trên AWS Console/CLI) không, kèm **ước tính chi phí bằng $**
   - Nếu người học chọn OK → đưa ra step thực hành cụ thể (console hoặc CLI), và nhắc
     dọn dẹp resource sau khi thực hành xong để tránh phát sinh phí
   - Nếu từ chối → chuyển sang khái niệm tiếp theo
4. Sau khi đào sâu xong toàn bộ khái niệm trong `keyword.md` → **tạo/update `{service}/{service}.md`**

### Bước 3: Làm từng câu hỏi

1. Ra từng câu theo `list_qa.md`, thứ tự exam1 → exam6
2. KHÔNG reveal đáp án ngay — hỏi reasoning của người học trước
3. Reveal + giải thích từng option đúng/sai

### Bước 4: Tạo file note câu hỏi (giữ nguyên như cũ)

1. Sau mỗi câu → **tạo file `exam{N}_q{M}.md` ngay lập tức**, không để dồn
- Đừng bao giờ quên bước này

---

## Quy tắc tạo file sau mỗi buổi học

### Cấu trúc folder

```
~/aws-saa-study/
├── CLAUDE.md
├── slides.pdf
├── exam_*.html
├── s3/
│   ├── list_qa.md      ← mục lục câu hỏi từ 6 đề (tạo đầu Bước 1)
│   ├── keyword.md      ← danh sách khái niệm từ câu hỏi (cuối Bước 1)
│   ├── s3.md           ← lý thuyết đã đào sâu (Bước 2, update mỗi session)
│   ├── exam1_q3.md     ← chi tiết từng câu sau khi luyện (Bước 4)
│   ├── exam2_q17.md
│   └── exam3_q45.md
├── vpc/
│   ├── list_qa.md
│   ├── keyword.md
│   ├── vpc.md
│   └── exam1_q10.md
└── iam/
    ├── list_qa.md
    ├── keyword.md
    ├── iam.md
    └── ...
```

### Quy tắc tạo folder service

- Tên folder: lowercase, không dấu, không space (s3, vpc, iam, rds, lambda...)
- Tạo folder nếu chưa tồn tại trước khi ghi file

### File `list_qa.md`

Tạo **ngay đầu buổi học** (Bước 1), trước cả khi thảo luận lý thuyết — vì khái niệm
cần đào sâu được xác định dựa trên chính các câu hỏi này.

Quy trình:
1. Parse 6 file HTML để tìm tất cả câu hỏi liên quan đến service
2. Ghi vào `{service}/list_qa.md`
3. Nếu file đã tồn tại → ghi đè (vì danh sách không thay đổi)

Format:
```markdown
# {SERVICE} — Danh sách câu hỏi từ 6 đề thi

exam1_q41
exam1_q44
exam2_q3
exam2_q19
exam3_q7
...

Tổng: {N} câu
```

Quy tắc:
- Mỗi câu trên một dòng, không thêm gì khác
- Format: `exam{N}_q{M}` — N là số đề (1–6), M là số câu trong đề gốc
- Sắp xếp theo thứ tự: exam1 trước, exam6 sau
- Dòng cuối ghi tổng số câu

Sau khi tạo `list_qa.md` chính xác cho service → **cập nhật lại cột "Số câu đề thi"
trong `overview.md`** bằng số thật (số ước lượng trước đó trong overview.md chỉ là
keyword-matching sơ bộ, không chính xác 100%).

### File `keyword.md`

Tạo ở cuối Bước 1, ngay sau `list_qa.md` — là output chính thức của bước "list khái
niệm", trước khi đào sâu ở Bước 2. Nếu file đã tồn tại → ghi đè (danh sách khái niệm
xác định lại từ đầu mỗi khi ôn lại service, không append).

Format:
```markdown
# {SERVICE} — Khái niệm từ câu hỏi đề thi

## {Tên nhóm khái niệm 1}
- {khái niệm A}
- {khái niệm B}

## {Tên nhóm khái niệm 2}
- {khái niệm C}
...
```

Quy tắc:
- Tên khái niệm giữ nguyên tiếng Anh (xem mục "Quy tắc ngôn ngữ" bên dưới)
- Nhóm theo chủ đề, không liệt kê phẳng — dễ tra cứu khi đào sâu ở Bước 2
- Đây là checklist để Bước 2 bám theo — đào sâu xong khái niệm nào có thể tick vào đây

### Nội dung `{service}.md`

Ghi sau khi kết thúc thảo luận lý thuyết. Chỉ capture những gì đã
**thảo luận và đào sâu** trong session — không copy từ PDF.

**Quy tắc quan trọng:**
- Nếu file chưa tồn tại → tạo mới với cấu trúc bên dưới
- Nếu file đã tồn tại → **KHÔNG ghi đè** — đọc nội dung hiện tại,
  append thêm session mới vào cuối file với timestamp

```markdown
# {SERVICE} — Study Notes

## Concepts đã thảo luận
[Những khái niệm đã đào sâu, theo thứ tự thảo luận]

## Key insights
[Những điểm quan trọng, dễ nhầm, đã phát hiện qua thảo luận]

## So sánh với services liên quan
[Chỉ ghi những so sánh đã thảo luận]

## Exam tips đúc kết
[Tips rút ra từ buổi thảo luận]

---
## Session {date} — Update
[Những điểm mới học được hoặc hiểu sâu hơn so với session trước]
[Corrections nếu có hiểu nhầm từ session trước]
```

### Nội dung `exam{N}_q{M}.md`

Tạo ngay sau khi hoàn thành từng câu hỏi.

**Quy tắc ngôn ngữ bắt buộc:**
- Câu hỏi, options, và tên khái niệm/concepts: **giữ nguyên tiếng Anh, KHÔNG dịch**
- Phần giải thích/trả lời: viết tiếng Việt

```markdown
# Exam {N} — Câu {M}

**Nguồn:** Đề #{N}, câu {M}
**Service:** {tên service}

## Câu hỏi
{nội dung câu hỏi giữ nguyên tiếng Anh}

## Các đáp án
- A. {option A — tiếng Anh}
- B. {option B — tiếng Anh}
- C. {option C — tiếng Anh}
- D. {option D — tiếng Anh}

## Đáp án đúng
**{chữ cái}. {nội dung — tiếng Anh}**

## Giải thích

### ✅ Tại sao {đáp án đúng} đúng
{giải thích tiếng Việt}

### ❌ Tại sao A sai (nếu A không phải đáp án)
{giải thích tiếng Việt}

### ❌ Tại sao B sai
{giải thích tiếng Việt}

### ❌ Tại sao C sai
{giải thích tiếng Việt}

## Người học trả lời
- Chọn: {đáp án người học chọn}
- Kết quả: ✅ Đúng / ❌ Sai
- Reasoning: {reasoning người học đưa ra}

## Key takeaway
{điểm cốt lõi cần nhớ từ câu này}
```

---

## Nguyên tắc đào sâu lý thuyết (Bước 2)

- **Nguồn chính: AWS official documentation** (docs.aws.amazon.com) — dùng WebFetch/WebSearch
- **KHÔNG dùng PDF slide** (`AWS Certified Solutions Architect Slides v47.pdf`) làm nguồn
  lý thuyết — slide có thể chứa lỗi hoặc thông tin lỗi thời (đã phát hiện: slide ghi sai
  Max S3 Object Size là 50TB, AWS docs ghi đúng là 5TB)
- File PDF trong repo chỉ giữ lại để tham khảo lịch sử, không dùng trong workflow học nữa

## Nguyên tắc luyện đề

- Parse HTML bằng beautifulsoup4 để lọc câu hỏi theo service
- Không reveal đáp án ngay — hỏi reasoning trước
- Giải thích tất cả options, không chỉ đáp án đúng
- Tạo file note ngay sau mỗi câu, không để dồn

## Quy tắc ngôn ngữ — bắt buộc áp dụng nhất quán

Áp dụng cả khi **phản hồi trong terminal** lẫn khi **tạo file**.
Nguyên tắc chung: **câu hỏi, options, tên khái niệm/concepts giữ nguyên tiếng Anh,
không dịch** — chỉ phần trả lời/giải thích/thảo luận dùng tiếng Việt.
Chỉ dịch sang tiếng Việt khi người học **chủ động yêu cầu dịch** — không tự động
thêm bản dịch.

### Khi hiển thị câu hỏi (terminal)
```
[Câu hỏi giữ nguyên tiếng Anh]

A. [Option A — tiếng Anh]
B. [Option B — tiếng Anh]
C. [Option C — tiếng Anh]
D. [Option D — tiếng Anh]
```

### Khi list/đào sâu khái niệm (Bước 1, 2)
- Tên khái niệm/concept: giữ nguyên tiếng Anh (vd: "NAT Gateway", "Cross-account access", "Sticky sessions")
- Nội dung thảo luận, giải thích: viết tiếng Việt

### Khi giải thích sau khi reveal
- Viết hoàn toàn bằng tiếng Việt
- Nếu cần trích dẫn keyword kỹ thuật thì giữ nguyên tiếng Anh
  (ví dụ: "SSE-KMS cho phép audit qua CloudTrail")

### Tóm tắt quy tắc
| Phần | Ngôn ngữ |
|------|----------|
| Câu hỏi | Tiếng Anh (không dịch) |
| Options A/B/C/D | Tiếng Anh (không dịch) |
| Tên khái niệm/concepts | Tiếng Anh (không dịch) |
| Đáp án đúng | Tiếng Anh |
| Giải thích/trả lời | Tiếng Việt |
| Key takeaway | Tiếng Việt |
| Theory notes | Tiếng Việt |

## Quản lý context

- Mỗi session chỉ làm 1 service
- Dùng /compact khi context > 60%
- Cuối session: tóm tắt những gì đã học + file nào đã tạo

## Dependencies

```bash
pip install pdfplumber beautifulsoup4
```