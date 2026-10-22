import PacketSim, { type PLayout, type PNode, type PScenario } from "../elb/PacketSim";

// ShopViet has no machine learning team, but it has text, recordings and scanned paper
// to understand. Each scenario is one pipeline built from managed AI services: the packet
// is one document going through it, and each node says what it turns the document into.

const chain = (aria: string, nodes: PNode[]): PLayout => ({
  viewBox: "0 60 820 150",
  aria,
  nodes,
  links: nodes.slice(1).map((n, i) => [nodes[i].id, n.id] as [string, string]),
});

const SCENARIOS: PScenario[] = [
  {
    name: "Lượng đánh giá của người dùng tăng đột biến",
    action: "Gửi 3.000 đánh giá",
    request: "Sau đợt khuyến mãi: hàng nghìn đánh giá tiếng Anh mỗi giờ",
    toggle: { label: "Đặt SQS giữa API Gateway và Lambda", initial: false },
    layout: (sqs) => chain("Ứng dụng gửi đánh giá qua API Gateway, SQS, Lambda, Comprehend rồi lưu vào DynamoDB", [
      { id: "app", x: 60, y: 135, w: 96, l1: "Ứng dụng", l2: "form đánh giá" },
      { id: "api", x: 190, y: 135, w: 112, l1: "API Gateway", l2: "REST API" },
      { id: "sqs", x: 320, y: 135, w: 104, l1: sqs ? "SQS" : "(không có)", l2: sqs ? "hàng đợi" : "gọi trực tiếp" },
      { id: "fn", x: 450, y: 135, w: 104, l1: "Lambda", l2: "đọc theo batch" },
      { id: "cmp", x: 590, y: 135, w: 124, l1: "Comprehend", l2: "DetectSentiment" },
      { id: "ddb", x: 740, y: 135, w: 116, l1: "DynamoDB", l2: "TTL 365 ngày" },
    ]),
    run: (sqs) => sqs
      ? {
          steps: [
            { at: "api", state: "pass", msg: "Tiếp nhận đánh giá và phản hồi ứng dụng ngay lập tức." },
            { at: "sqs", state: "wait", tag: "ĐỆM", flash: "3.000", msg: "Đánh giá được lưu trong hàng đợi SQS; không có đánh giá nào bị mất dù lưu lượng tăng đột biến." },
            { at: "fn", state: "pass", msg: "Lambda đọc hàng đợi theo batch và tự động tăng số lần thực thi song song." },
            { at: "cmp", state: "change", tag: "PHÂN TÍCH", flash: "NEGATIVE", msg: "\"Delivered 5 days late, box was dented\" → **NEGATIVE**. Không cần huấn luyện model." },
            { at: "ddb", state: "pass", msg: "Lưu kết quả kèm thuộc tính **TTL** bằng thời điểm ghi cộng 365 ngày. Sau thời điểm đó, DynamoDB tự động xoá item hết hạn, thường trong vòng vài ngày, không tiêu tốn write throughput." },
          ],
          ok: true,
          back: false,
          result: "Toàn bộ 3.000 đánh giá được phân tích. Đội chăm sóc khách hàng theo dõi xu hướng theo ngày; dữ liệu được tự động xoá sau khi hết hạn một năm.",
        }
      : {
          steps: [
            { at: "api", state: "pass", msg: "Tiếp nhận đánh giá." },
            { at: "sqs", state: "skip", msg: "API Gateway gọi trực tiếp Lambda, không có lớp đệm." },
            { at: "fn", state: "block", tag: "429", flash: "throttle", msg: "Số lệnh gọi đồng thời vượt quota; Lambda và Comprehend trả về lỗi throttling. Một phần đánh giá bị từ chối." },
          ],
          ok: false,
          result: "Đánh giá gửi tới vào thời điểm cao điểm bị mất. Cần đặt SQS ở giữa để hấp thụ lưu lượng tăng đột biến.",
        },
  },
  {
    name: "Trích xuất thành phần từ mô tả",
    action: "Tải lên mô tả",
    request: "cookies.txt: \"Wheat flour, sugar, palm oil, butter…\"",
    toggle: { label: "Sử dụng custom entity recognition", initial: false },
    layout: (custom) => chain("Mô tả sản phẩm được lưu vào S3, Lambda gọi Comprehend rồi truy vấn DynamoDB", [
      { id: "s3", x: 70, y: 135, w: 120, l1: "S3", l2: "mô tả của người bán" },
      { id: "fn", x: 250, y: 135, w: 120, l1: "Lambda", l2: "S3 event" },
      { id: "cmp", x: 470, y: 135, w: 200, l1: "Amazon Comprehend", l2: custom ? "custom entity: INGREDIENT" : "entity có sẵn" },
      { id: "ddb", x: 700, y: 135, w: 170, l1: "DynamoDB", l2: "điểm an toàn từng thành phần" },
    ]),
    run: (custom) => ({
      steps: [
        { at: "fn", state: "pass", msg: "**S3 Event Notification** kích hoạt Lambda ngay khi người bán tải lên." },
        custom
          ? { at: "cmp", state: "change", tag: "TRÍCH", flash: "4 thành phần", msg: "Custom entity recognizer được huấn luyện từ **entity list** (danh sách tên thành phần sẵn có của ShopViet, nhãn INGREDIENT) kèm một tập tài liệu chưa gán nhãn. Kết quả trả về: wheat flour, sugar, palm oil, butter." }
          : { at: "cmp", state: "block", tag: "KHÔNG NHẬN DIỆN", msg: "Entity có sẵn gồm các loại chung như COMMERCIAL_ITEM, DATE, LOCATION, ORGANIZATION, PERSON, QUANTITY; không có loại \"thành phần\"." },
        ...(custom ? [{ at: "ddb", state: "pass" as const, msg: "Truy vấn điểm an toàn của từng thành phần và hiển thị trên trang sản phẩm." }] : []),
      ],
      ok: custom,
      back: false,
      result: custom
        ? "Quy trình tự động hoàn toàn, không cần chuyên gia ML. Sản phẩm không phải thực phẩm không trích xuất được thành phần nào và được bỏ qua."
        : "Cần một loại entity riêng. Custom entity recognition của Comprehend đáp ứng được yêu cầu mà không cần tự xây dựng model trên SageMaker.",
    }),
  },
  {
    name: "Ghi âm tổng đài",
    action: "Phân tích cuộc gọi",
    request: "goi-2024-05-12.mp3 · tiếng Việt (vi-VN) · 2 người nói",
    toggle: { label: "Chuyển giọng nói thành văn bản trước khi truy vấn", initial: false },
    layout: (tr) => chain("Ghi âm lưu trong S3, Transcribe chuyển thành văn bản, Athena truy vấn bằng SQL", [
      { id: "rec", x: 70, y: 135, w: 120, l1: "S3", l2: "file ghi âm" },
      { id: "tr", x: 260, y: 135, w: 150, l1: tr ? "Amazon Transcribe" : "(bỏ qua)", l2: tr ? "giọng nói → văn bản" : "" },
      { id: "txt", x: 470, y: 135, w: 130, l1: "S3", l2: "transcript JSON" },
      { id: "ath", x: 680, y: 135, w: 150, l1: "Amazon Athena", l2: "SQL trên S3" },
    ]),
    run: (tr) => tr
      ? {
          steps: [
            { at: "tr", state: "change", tag: "CHUYỂN", flash: "text", msg: "Chuyển âm thanh thành văn bản và **phân tách từng người nói** (nhân viên, khách hàng)." },
            { at: "txt", state: "pass", msg: "Transcript được lưu vào S3." },
            { at: "ath", state: "pass", flash: "SQL", msg: "`SELECT … WHERE transcript LIKE '%hoàn tiền%'`: đếm số cuộc gọi yêu cầu hoàn tiền theo tuần." },
          ],
          ok: true,
          back: false,
          result: "Không cần quản lý máy chủ. Đội chăm sóc khách hàng tự viết SQL để xác định nguyên nhân khách hàng không hài lòng.",
        }
      : {
          steps: [
            { at: "tr", state: "skip", msg: "Không có bước chuyển giọng nói thành văn bản." },
            { at: "ath", state: "block", tag: "KHÔNG ĐỌC ĐƯỢC", msg: "Athena truy vấn dữ liệu dạng bảng hoặc văn bản; file âm thanh không chứa dữ liệu mà SQL có thể đọc." },
          ],
          ok: false,
          result: "Cần có văn bản trước. Amazon Transcribe là service chuyển giọng nói thành văn bản.",
        },
  },
  {
    name: "Bài báo dạng scan",
    action: "Phân tích bài báo",
    request: "500 bài báo tiếng Anh dạng PDF scan đề cập tới ShopViet",
    toggle: { label: "Xử lý qua Textract trước", initial: false },
    layout: (tx) => chain("PDF scan được xử lý qua Textract, Comprehend phân tích cảm xúc và thực thể, kết quả lưu vào S3", [
      { id: "pdf", x: 70, y: 135, w: 120, l1: "S3", l2: "PDF scan" },
      { id: "tx", x: 260, y: 135, w: 150, l1: tx ? "Amazon Textract" : "(bỏ qua)", l2: tx ? "ảnh scan → văn bản" : "" },
      { id: "cmp", x: 470, y: 135, w: 170, l1: "Amazon Comprehend", l2: "sentiment + entity" },
      { id: "out", x: 690, y: 135, w: 140, l1: "S3", l2: "kết quả phân tích" },
    ]),
    run: (tx) => tx
      ? {
          steps: [
            { at: "tx", state: "change", tag: "ĐỌC", flash: "text", msg: "Trích xuất văn bản từ trang scan (Textract nhận dạng tiếng Anh, Pháp, Đức, Ý, Bồ Đào Nha, Tây Ban Nha)." },
            { at: "cmp", state: "change", tag: "PHÂN TÍCH", flash: "POSITIVE", msg: "Bài 2023: **POSITIVE**; entity: ShopViet (ORGANIZATION), Hanoi (LOCATION)." },
            { at: "out", state: "pass", msg: "Lưu kết quả vào S3 để xây dựng biểu đồ xu hướng sắc thái báo chí theo năm." },
          ],
          ok: true,
          back: false,
          result: "Chỉ sử dụng service có sẵn model, không cần huấn luyện. Textract trích xuất văn bản, Comprehend phân tích nội dung.",
        }
      : {
          steps: [
            { at: "tx", state: "skip", msg: "Không có bước trích xuất văn bản." },
            { at: "cmp", state: "block", tag: "CHƯA CÓ CHỮ", msg: "Comprehend chỉ phân tích **văn bản**; ảnh scan chưa chứa văn bản mà Comprehend có thể xử lý." },
          ],
          ok: false,
          result: "Ảnh scan phải được xử lý qua Textract để trích xuất văn bản trước.",
        },
  },
];

export default function AiPipelineSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tình huống, sau đó chọn nút chạy. Thay đổi cấu hình và chạy lại để so sánh." />;
}
