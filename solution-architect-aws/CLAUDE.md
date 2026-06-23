# AWS SAA-C03 Study Project

## Mục tiêu
Ôn thi AWS Solutions Architect Associate (SAA-C03) trong 2 tuần.

## Files trong project
- `AWS Certified Solutions Architect Slides v47.pdf` — 900 trang slide lý thuyết
- `001 Quiz Practice Test #1 - AWS Certified Solutions Architect Associate.html`
- `001 Quiz Practice Test #2 - AWS Certified Solutions Architect Associate.html`
- `001 Quiz Practice Test #3 - AWS Certified Solutions Architect Associate.html`
- `001 Quiz Practice Test #4- AWS Certified Solutions Architect Associate.html`
- `001 Quiz Practice Test #5- AWS Certified Solutions Architect Associate.html`
- `001 Quiz Practice Test #6- AWS Certified Solutions Architect Associate.html`

## Người học
- Đã có nền tảng AWS — bỏ qua giải thích cơ bản
- Điểm yếu: Networking, IAM/Security, HA, Storage & DB
- Mục tiêu: nắm sâu để thi, không chỉ học thuộc

---

## Workflow chuẩn mỗi buổi học

### Giai đoạn 1: Thảo luận lý thuyết

1. Đọc section của service trong PDF (dùng pdftotext + rasterize diagram)
2. Thảo luận sâu dựa trên nội dung PDF — hỏi qua lại để đào sâu
3. Sau khi thảo luận xong → **tạo folder và ghi notes**

### Giai đoạn 2: Luyện đề

1. Lọc câu hỏi liên quan service từ 6 file HTML
2. Ra từng câu — KHÔNG reveal đáp án ngay
3. Hỏi reasoning của người học trước
4. Reveal + giải thích từng option đúng/sai
5. Sau mỗi câu → **tạo file note câu hỏi**
- Đừng bao giờ quên bước 5: tạo file note

---

## Quy tắc tạo file sau mỗi buổi học

### Cấu trúc folder

```
~/aws-saa-study/
├── CLAUDE.md
├── slides.pdf
├── exam_*.html
├── s3/
│   ├── s3.md           ← lý thuyết đã thảo luận (update mỗi session)
│   ├── list_qa.md      ← mục lục câu hỏi từ 6 đề (tạo sau lý thuyết)
│   ├── exam1_q3.md     ← chi tiết từng câu sau khi luyện
│   ├── exam2_q17.md
│   └── exam3_q45.md
├── vpc/
│   ├── vpc.md
│   ├── list_qa.md
│   └── exam1_q10.md
└── iam/
    ├── iam.md
    ├── list_qa.md
    └── ...
```

### Quy tắc tạo folder service

- Tên folder: lowercase, không dấu, không space (s3, vpc, iam, rds, lambda...)
- Tạo folder nếu chưa tồn tại trước khi ghi file

### File `list_qa.md`

Tạo ngay sau khi kết thúc thảo luận lý thuyết, **trước khi bắt đầu luyện đề**.

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
- Câu hỏi và các options: **giữ nguyên tiếng Anh**
- Có thể thêm bản dịch tiếng Việt bên dưới mỗi phần
- Phần giải thích: viết tiếng Việt

```markdown
# Exam {N} — Câu {M}

**Nguồn:** Đề #{N}, câu {M}
**Service:** {tên service}

## Câu hỏi
{nội dung câu hỏi giữ nguyên tiếng Anh}

> 🇻🇳 {bản dịch tiếng Việt}

## Các đáp án
- A. {option A — tiếng Anh}
- B. {option B — tiếng Anh}
- C. {option C — tiếng Anh}
- D. {option D — tiếng Anh}

> 🇻🇳 Dịch:
> - A. {dịch A}
> - B. {dịch B}
> - C. {dịch C}
> - D. {dịch D}

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

## Nguyên tắc đọc PDF 900 trang

- KHÔNG đọc toàn bộ PDF một lúc — đọc từng section theo service
- Batch tối đa 30 trang mỗi lần
- Rasterize slide có diagram để thấy hình ảnh:
  ```bash
  pdftoppm -jpeg -r 150 -f {start} -l {end} slides.pdf /tmp/slides
  ls /tmp/slides-*.jpg
  ```
- Extract text section:
  ```bash
  pdftotext -f {start} -l {end} -layout slides.pdf /tmp/section.txt
  ```

## Nguyên tắc luyện đề

- Parse HTML bằng beautifulsoup4 để lọc câu hỏi theo service
- Không reveal đáp án ngay — hỏi reasoning trước
- Giải thích tất cả options, không chỉ đáp án đúng
- Tạo file note ngay sau mỗi câu, không để dồn

## Quy tắc ngôn ngữ — bắt buộc áp dụng nhất quán

Áp dụng cả khi **phản hồi trong terminal** lẫn khi **tạo file**.

### Khi hiển thị câu hỏi (terminal)
```
[Câu hỏi giữ nguyên tiếng Anh]

🇻🇳 [Bản dịch tiếng Việt]

A. [Option A — tiếng Anh]
B. [Option B — tiếng Anh]
C. [Option C — tiếng Anh]
D. [Option D — tiếng Anh]

🇻🇳 Dịch:
A. [Dịch A tiếng Việt]
B. [Dịch B tiếng Việt]
C. [Dịch C tiếng Việt]
D. [Dịch D tiếng Việt]
```

### Khi giải thích sau khi reveal
- Viết hoàn toàn bằng tiếng Việt
- Nếu cần trích dẫn keyword kỹ thuật thì giữ nguyên tiếng Anh
  (ví dụ: "SSE-KMS cho phép audit qua CloudTrail")

### Tóm tắt quy tắc
| Phần | Ngôn ngữ |
|------|----------|
| Câu hỏi | Tiếng Anh (+ dịch Việt bên dưới) |
| Options A/B/C/D | Tiếng Anh (+ dịch Việt bên dưới) |
| Đáp án đúng | Tiếng Anh |
| Giải thích | Tiếng Việt |
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