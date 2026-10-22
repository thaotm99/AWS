# Quy tắc cho `aws-cloud/` (site AWS Thực Chiến)

Các quy tắc này do chủ repo đặt ra, áp dụng cho mọi phiên làm việc trên site.

## Quy trình thay đổi
- Mọi thay đổi đi qua Pull Request vào `master`.
- **Chỉ merge khi chủ repo đồng ý rõ ràng trong cuộc trò chuyện.** CI xanh không phải là sự đồng ý.
- Trước khi tạo PR: `npm run build` (gồm `astro check`) sạch, và kiểm tra trên trình duyệt ở cả chế độ sáng/tối, desktop và điện thoại.

## Nội dung bài học
- Không hiển thị mã câu đề (`examN_qM`) ở bất kỳ trang lý thuyết nào, kể cả trong HTML/JS được gửi tới trình duyệt. Mã đề chỉ nằm trong prop `questions` của `<Scene>` (chỉ dùng lúc build) hoặc comment.
- Trình bày theo tình huống thực tế của hệ thống ShopViet, không theo giọng luyện đề ("đề hay hỏi", "đáp án", "Select two"…).
- Mục nào chỉ là danh sách liệt kê thì chuyển thành mô phỏng tương tác.

## Văn phong
- Văn phong tài liệu kỹ thuật: câu hoàn chỉnh, chính xác, khách quan; dùng thuật ngữ chuyên ngành (độ trễ, thông lượng, tính sẵn sàng, khả năng chịu lỗi, định tuyến, xác thực, mã hoá khi lưu trữ/khi truyền…); không dùng khẩu ngữ.
- Tên dịch vụ, tính năng và khái niệm AWS giữ nguyên tiếng Anh, đúng cách AWS viết.
- Giao diện tiếng Anh dùng đúng thuật ngữ của AWS exam guide.

## Luyện đề
- Câu hỏi hiển thị tiếng Việt khi chọn VI (bản dịch trong `solution-architect-aws/translations/vi/`), tiếng Anh gốc khi chọn EN; mỗi câu có nút xem bản gốc. Quy ước dịch: `solution-architect-aws/translations/README.md`.
