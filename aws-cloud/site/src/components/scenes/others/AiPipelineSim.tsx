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
    name: "Đánh giá của khách đổ về",
    action: "Gửi 3.000 đánh giá",
    request: "Sau đợt sale: hàng nghìn đánh giá mỗi giờ",
    toggle: { label: "Đặt SQS giữa API Gateway và Lambda", initial: false },
    layout: (sqs) => chain("App gửi đánh giá qua API Gateway, SQS, Lambda, Comprehend rồi lưu DynamoDB", [
      { id: "app", x: 60, y: 135, w: 96, l1: "App", l2: "form đánh giá" },
      { id: "api", x: 190, y: 135, w: 112, l1: "API Gateway", l2: "REST API" },
      { id: "sqs", x: 320, y: 135, w: 104, l1: sqs ? "SQS" : "(không có)", l2: sqs ? "hàng đợi" : "gọi thẳng" },
      { id: "fn", x: 450, y: 135, w: 104, l1: "Lambda", l2: "đọc theo lô" },
      { id: "cmp", x: 590, y: 135, w: 124, l1: "Comprehend", l2: "DetectSentiment" },
      { id: "ddb", x: 740, y: 135, w: 116, l1: "DynamoDB", l2: "TTL 365 ngày" },
    ]),
    run: (sqs) => sqs
      ? {
          steps: [
            { at: "api", state: "pass", msg: "Nhận đánh giá, trả lời app ngay." },
            { at: "sqs", state: "wait", tag: "ĐỆM", flash: "3.000", msg: "Đánh giá xếp hàng trong SQS, không cái nào bị mất dù tới dồn dập." },
            { at: "fn", state: "pass", msg: "Lambda đọc hàng đợi theo lô và tự tăng số bản chạy song song." },
            { at: "cmp", state: "change", tag: "PHÂN TÍCH", flash: "NEGATIVE", msg: "\"Giao chậm 5 ngày, hộp móp\" → **NEGATIVE**. Không cần train model." },
            { at: "ddb", state: "pass", msg: "Lưu kết quả. **TTL** 365 ngày tự xoá bản ghi sau một năm." },
          ],
          ok: true,
          back: false,
          result: "Đủ 3.000 đánh giá được phân tích. Đội CSKH xem xu hướng theo ngày, dữ liệu giữ đúng một năm.",
        }
      : {
          steps: [
            { at: "api", state: "pass", msg: "Nhận đánh giá." },
            { at: "sqs", state: "skip", msg: "API Gateway gọi thẳng Lambda, không có chỗ đệm." },
            { at: "fn", state: "block", tag: "429", flash: "throttle", msg: "Quá nhiều lời gọi cùng lúc, Lambda và Comprehend bị giới hạn tốc độ. Một phần đánh giá bị từ chối." },
          ],
          ok: false,
          result: "Đánh giá tới đúng lúc đông nhất lại bị rơi. Thêm SQS ở giữa để hấp thụ đợt tăng đột biến.",
        },
  },
  {
    name: "Tìm thành phần trong mô tả",
    action: "Upload mô tả",
    request: "banh-quy.txt: \"Bột mì, đường, dầu cọ, bơ…\"",
    toggle: { label: "Dùng custom entity recognition", initial: false },
    layout: (custom) => chain("Mô tả sản phẩm vào S3, Lambda gọi Comprehend rồi tra DynamoDB", [
      { id: "s3", x: 70, y: 135, w: 120, l1: "S3", l2: "mô tả của người bán" },
      { id: "fn", x: 250, y: 135, w: 120, l1: "Lambda", l2: "S3 event" },
      { id: "cmp", x: 470, y: 135, w: 200, l1: "Amazon Comprehend", l2: custom ? "custom entity: THÀNH_PHẦN" : "entity có sẵn" },
      { id: "ddb", x: 700, y: 135, w: 170, l1: "DynamoDB", l2: "điểm an toàn từng chất" },
    ]),
    run: (custom) => ({
      steps: [
        { at: "fn", state: "pass", msg: "**S3 Event Notification** gọi Lambda ngay khi người bán upload." },
        custom
          ? { at: "cmp", state: "change", tag: "TRÍCH", flash: "4 chất", msg: "Custom entity recognizer được train từ **danh sách tên thành phần** ShopViet có sẵn. Trả về: bột mì, đường, dầu cọ, bơ." }
          : { at: "cmp", state: "block", tag: "KHÔNG THẤY", msg: "Entity có sẵn chỉ biết loại chung như tổ chức, số lượng, ngày tháng. Không có loại \"thành phần\"." },
        ...(custom ? [{ at: "ddb", state: "pass" as const, msg: "Tra điểm an toàn của từng thành phần, gắn lên trang sản phẩm." }] : []),
      ],
      ok: custom,
      back: false,
      result: custom
        ? "Tự động hoàn toàn, không cần chuyên gia ML, trả tiền theo lượng văn bản. Hàng không phải thực phẩm thì không trích ra gì và được bỏ qua."
        : "Cần một loại entity riêng. Custom entity recognition của Comprehend làm được mà không cần tự xây model trên SageMaker.",
    }),
  },
  {
    name: "Ghi âm tổng đài",
    action: "Phân tích cuộc gọi",
    request: "goi-2024-05-12.mp3 · 2 người nói",
    toggle: { label: "Chuyển giọng nói thành văn bản trước", initial: false },
    layout: (tr) => chain("Ghi âm trong S3, Transcribe chuyển thành văn bản, Athena truy vấn bằng SQL", [
      { id: "rec", x: 70, y: 135, w: 120, l1: "S3", l2: "file ghi âm" },
      { id: "tr", x: 260, y: 135, w: 150, l1: tr ? "Amazon Transcribe" : "(bỏ qua)", l2: tr ? "giọng nói → văn bản" : "" },
      { id: "txt", x: 470, y: 135, w: 130, l1: "S3", l2: "transcript JSON" },
      { id: "ath", x: 680, y: 135, w: 150, l1: "Amazon Athena", l2: "SQL trên S3" },
    ]),
    run: (tr) => tr
      ? {
          steps: [
            { at: "tr", state: "change", tag: "CHUYỂN", flash: "text", msg: "Chuyển âm thanh thành văn bản và **tách từng người nói** (nhân viên, khách)." },
            { at: "txt", state: "pass", msg: "Transcript lưu vào S3." },
            { at: "ath", state: "pass", flash: "SQL", msg: "`SELECT … WHERE transcript LIKE '%hoàn tiền%'`: đếm cuộc gọi khách đòi hoàn tiền theo tuần." },
          ],
          ok: true,
          back: false,
          result: "Không server nào phải quản lý. Đội CSKH tự viết SQL để hiểu khách đang không hài lòng chuyện gì.",
        }
      : {
          steps: [
            { at: "tr", state: "skip", msg: "Không có bước chuyển giọng nói." },
            { at: "ath", state: "block", tag: "KHÔNG ĐỌC ĐƯỢC", msg: "Athena truy vấn dữ liệu dạng bảng hoặc văn bản. File âm thanh không có gì để SQL đọc." },
          ],
          ok: false,
          result: "Phải có văn bản trước. Amazon Transcribe là service chuyển giọng nói thành văn bản.",
        },
  },
  {
    name: "Bài báo bản scan",
    action: "Phân tích bài báo",
    request: "500 bài báo PDF scan nói về ShopViet",
    toggle: { label: "Đưa qua Textract trước", initial: false },
    layout: (tx) => chain("PDF scan qua Textract, Comprehend phân tích cảm xúc và thực thể, kết quả về S3", [
      { id: "pdf", x: 70, y: 135, w: 120, l1: "S3", l2: "PDF scan" },
      { id: "tx", x: 260, y: 135, w: 150, l1: tx ? "Amazon Textract" : "(bỏ qua)", l2: tx ? "ảnh scan → văn bản" : "" },
      { id: "cmp", x: 470, y: 135, w: 170, l1: "Amazon Comprehend", l2: "sentiment + entity" },
      { id: "out", x: 690, y: 135, w: 140, l1: "S3", l2: "kết quả phân tích" },
    ]),
    run: (tx) => tx
      ? {
          steps: [
            { at: "tx", state: "change", tag: "ĐỌC", flash: "text", msg: "Đọc chữ in và chữ scan, kể cả trang nhiều cột, nhiều kiểu chữ." },
            { at: "cmp", state: "change", tag: "PHÂN TÍCH", flash: "POSITIVE", msg: "Bài 2023: **POSITIVE**; entity: ShopViet, Hà Nội, \"giao hàng nhanh\"." },
            { at: "out", state: "pass", msg: "Lưu kết quả vào S3 để vẽ biểu đồ giọng điệu báo chí theo năm." },
          ],
          ok: true,
          back: false,
          result: "Chỉ dùng service có sẵn model, không phải train gì. Textract đọc chữ, Comprehend hiểu nội dung.",
        }
      : {
          steps: [
            { at: "tx", state: "skip", msg: "Không có bước đọc chữ." },
            { at: "cmp", state: "block", tag: "CHƯA CÓ CHỮ", msg: "Comprehend phân tích **văn bản**. Một ảnh scan với nó chưa có chữ nào." },
          ],
          ok: false,
          result: "Ảnh scan phải qua Textract để lấy chữ ra trước.",
        },
  },
];

export default function AiPipelineSim() {
  return <PacketSim scenarios={SCENARIOS} hint="Chọn một tình huống rồi bấm nút. Đổi công tắc và chạy lại để so sánh." />;
}
