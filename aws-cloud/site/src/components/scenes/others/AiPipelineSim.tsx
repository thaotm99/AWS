import PacketSim, { type PLayout, type PNode, type PScenario } from "../elb/PacketSim";
import { useLang } from "../../../lib/lang";

// MFTECH has no machine learning team, but it has text, recordings and scanned paper
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
      { id: "sqs", x: 320, y: 135, w: 104, l1: sqs ? "SQS" : "(không có)", l2: sqs ? "queue" : "gọi trực tiếp" },
      { id: "fn", x: 450, y: 135, w: 104, l1: "Lambda", l2: "đọc theo batch" },
      { id: "cmp", x: 590, y: 135, w: 124, l1: "Comprehend", l2: "DetectSentiment" },
      { id: "ddb", x: 740, y: 135, w: 116, l1: "DynamoDB", l2: "TTL 365 ngày" },
    ]),
    run: (sqs) => sqs
      ? {
          steps: [
            { at: "api", state: "pass", msg: "Tiếp nhận đánh giá và phản hồi ứng dụng ngay lập tức." },
            { at: "sqs", state: "wait", tag: "ĐỆM", flash: "3.000", msg: "Đánh giá được lưu trong SQS queue; không có đánh giá nào bị mất dù lưu lượng tăng đột biến." },
            { at: "fn", state: "pass", msg: "Lambda đọc queue theo batch và tự động tăng số lần thực thi đồng thời (concurrency)." },
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
          ? { at: "cmp", state: "change", tag: "TRÍCH", flash: "4 thành phần", msg: "Custom entity recognizer được huấn luyện từ **entity list** (danh sách tên thành phần sẵn có của MFTECH, nhãn INGREDIENT) kèm một tập tài liệu chưa gán nhãn. Kết quả trả về: wheat flour, sugar, palm oil, butter." }
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
          result: "Kiến trúc serverless, không cần quản lý EC2 instance. Đội chăm sóc khách hàng tự viết SQL để xác định nguyên nhân khách hàng không hài lòng.",
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
    request: "500 bài báo tiếng Anh dạng PDF scan đề cập tới MFTECH",
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
            { at: "cmp", state: "change", tag: "PHÂN TÍCH", flash: "POSITIVE", msg: "Bài 2023: **POSITIVE**; entity: MFTECH (ORGANIZATION), Hanoi (LOCATION)." },
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

const SCENARIOS_EN: PScenario[] = [
  {
    name: "User reviews spike",
    action: "Send 3,000 reviews",
    request: "After a promotion: thousands of English reviews per hour",
    toggle: { label: "Put SQS between API Gateway and Lambda", initial: false },
    layout: (sqs) => chain("The app sends reviews through API Gateway, SQS, Lambda and Comprehend, then stores them in DynamoDB", [
      { id: "app", x: 60, y: 135, w: 96, l1: "App", l2: "review form" },
      { id: "api", x: 190, y: 135, w: 112, l1: "API Gateway", l2: "REST API" },
      { id: "sqs", x: 320, y: 135, w: 104, l1: sqs ? "SQS" : "(none)", l2: sqs ? "queue" : "direct call" },
      { id: "fn", x: 450, y: 135, w: 104, l1: "Lambda", l2: "reads in batches" },
      { id: "cmp", x: 590, y: 135, w: 124, l1: "Comprehend", l2: "DetectSentiment" },
      { id: "ddb", x: 740, y: 135, w: 116, l1: "DynamoDB", l2: "TTL 365 days" },
    ]),
    run: (sqs) => sqs
      ? {
          steps: [
            { at: "api", state: "pass", msg: "Accepts the review and responds to the app immediately." },
            { at: "sqs", state: "wait", tag: "BUFFER", flash: "3,000", msg: "Reviews are held in the SQS queue; no review is lost despite the traffic spike." },
            { at: "fn", state: "pass", msg: "Lambda reads the queue in batches and automatically scales up concurrent executions." },
            { at: "cmp", state: "change", tag: "ANALYZE", flash: "NEGATIVE", msg: "\"Delivered 5 days late, box was dented\" → **NEGATIVE**. No model training needed." },
            { at: "ddb", state: "pass", msg: "Stores the result with a **TTL** attribute set to the write time plus 365 days. After that time, DynamoDB automatically deletes the expired item, typically within a few days, without consuming write throughput." },
          ],
          ok: true,
          back: false,
          result: "All 3,000 reviews are analyzed. The customer care team tracks daily trends; the data is deleted automatically after it expires at one year.",
        }
      : {
          steps: [
            { at: "api", state: "pass", msg: "Accepts the review." },
            { at: "sqs", state: "skip", msg: "API Gateway invokes Lambda directly, with no buffer." },
            { at: "fn", state: "block", tag: "429", flash: "throttle", msg: "Concurrent calls exceed the quota; Lambda and Comprehend return throttling errors. Some reviews are rejected." },
          ],
          ok: false,
          result: "Reviews sent at the peak are lost. Put SQS in between to absorb the traffic spike.",
        },
  },
  {
    name: "Extract ingredients from descriptions",
    action: "Upload description",
    request: "cookies.txt: \"Wheat flour, sugar, palm oil, butter…\"",
    toggle: { label: "Use custom entity recognition", initial: false },
    layout: (custom) => chain("A product description is stored in S3, Lambda calls Comprehend, then queries DynamoDB", [
      { id: "s3", x: 70, y: 135, w: 120, l1: "S3", l2: "seller description" },
      { id: "fn", x: 250, y: 135, w: 120, l1: "Lambda", l2: "S3 event" },
      { id: "cmp", x: 470, y: 135, w: 200, l1: "Amazon Comprehend", l2: custom ? "custom entity: INGREDIENT" : "built-in entities" },
      { id: "ddb", x: 700, y: 135, w: 170, l1: "DynamoDB", l2: "safety score per ingredient" },
    ]),
    run: (custom) => ({
      steps: [
        { at: "fn", state: "pass", msg: "An **S3 Event Notification** invokes Lambda as soon as the seller uploads." },
        custom
          ? { at: "cmp", state: "change", tag: "EXTRACT", flash: "4 ingredients", msg: "The custom entity recognizer is trained from an **entity list** (MFTECH's existing list of ingredient names, labeled INGREDIENT) plus a set of unlabeled documents. Result: wheat flour, sugar, palm oil, butter." }
          : { at: "cmp", state: "block", tag: "NOT RECOGNIZED", msg: "The built-in entities are general types such as COMMERCIAL_ITEM, DATE, LOCATION, ORGANIZATION, PERSON, QUANTITY; there is no \"ingredient\" type." },
        ...(custom ? [{ at: "ddb", state: "pass" as const, msg: "Looks up the safety score of each ingredient and shows it on the product page." }] : []),
      ],
      ok: custom,
      back: false,
      result: custom
        ? "A fully automated process, with no ML experts needed. Non-food products yield no ingredients and are skipped."
        : "A custom entity type is needed. Comprehend custom entity recognition meets the requirement without building your own model on SageMaker.",
    }),
  },
  {
    name: "Call-center recordings",
    action: "Analyze calls",
    request: "goi-2024-05-12.mp3 · Vietnamese (vi-VN) · 2 speakers",
    toggle: { label: "Convert speech to text before querying", initial: false },
    layout: (tr) => chain("Recordings are stored in S3, Transcribe converts them to text, Athena queries with SQL", [
      { id: "rec", x: 70, y: 135, w: 120, l1: "S3", l2: "recordings" },
      { id: "tr", x: 260, y: 135, w: 150, l1: tr ? "Amazon Transcribe" : "(skipped)", l2: tr ? "speech → text" : "" },
      { id: "txt", x: 470, y: 135, w: 130, l1: "S3", l2: "transcript JSON" },
      { id: "ath", x: 680, y: 135, w: 150, l1: "Amazon Athena", l2: "SQL on S3" },
    ]),
    run: (tr) => tr
      ? {
          steps: [
            { at: "tr", state: "change", tag: "CONVERT", flash: "text", msg: "Converts audio to text and **separates the speakers** (agent, customer)." },
            { at: "txt", state: "pass", msg: "The transcript is stored in S3." },
            { at: "ath", state: "pass", flash: "SQL", msg: "`SELECT … WHERE transcript LIKE '%…%'` with the Vietnamese phrase for \"refund\": counts the calls requesting a refund each week." },
          ],
          ok: true,
          back: false,
          result: "A serverless architecture with no EC2 instances to manage. The customer care team writes its own SQL to find out why customers are unhappy.",
        }
      : {
          steps: [
            { at: "tr", state: "skip", msg: "There is no speech-to-text step." },
            { at: "ath", state: "block", tag: "UNREADABLE", msg: "Athena queries tabular or text data; audio files contain no data that SQL can read." },
          ],
          ok: false,
          result: "Text is needed first. Amazon Transcribe is the service that converts speech to text.",
        },
  },
  {
    name: "Scanned news articles",
    action: "Analyze articles",
    request: "500 scanned PDF articles in English that mention MFTECH",
    toggle: { label: "Process with Textract first", initial: false },
    layout: (tx) => chain("Scanned PDFs are processed by Textract, Comprehend analyzes sentiment and entities, and the results are stored in S3", [
      { id: "pdf", x: 70, y: 135, w: 120, l1: "S3", l2: "scanned PDFs" },
      { id: "tx", x: 260, y: 135, w: 150, l1: tx ? "Amazon Textract" : "(skipped)", l2: tx ? "scanned image → text" : "" },
      { id: "cmp", x: 470, y: 135, w: 170, l1: "Amazon Comprehend", l2: "sentiment + entity" },
      { id: "out", x: 690, y: 135, w: 140, l1: "S3", l2: "analysis results" },
    ]),
    run: (tx) => tx
      ? {
          steps: [
            { at: "tx", state: "change", tag: "READ", flash: "text", msg: "Extracts text from the scanned pages (Textract recognizes English, French, German, Italian, Portuguese and Spanish)." },
            { at: "cmp", state: "change", tag: "ANALYZE", flash: "POSITIVE", msg: "2023 article: **POSITIVE**; entities: MFTECH (ORGANIZATION), Hanoi (LOCATION)." },
            { at: "out", state: "pass", msg: "Stores the results in S3 to build a chart of press sentiment trends by year." },
          ],
          ok: true,
          back: false,
          result: "Only services with pre-trained models are used; no training needed. Textract extracts the text, Comprehend analyzes the content.",
        }
      : {
          steps: [
            { at: "tx", state: "skip", msg: "There is no text extraction step." },
            { at: "cmp", state: "block", tag: "NO TEXT YET", msg: "Comprehend analyzes only **text**; scanned images do not yet contain text that Comprehend can process." },
          ],
          ok: false,
          result: "Scanned images must first be processed by Textract to extract the text.",
        },
  },
];

export default function AiPipelineSim() {
  const L = useLang();
  return <PacketSim scenarios={L({ vi: SCENARIOS, en: SCENARIOS_EN })} hint={L({ vi: "Chọn một tình huống, sau đó chọn nút chạy. Thay đổi cấu hình và chạy lại để so sánh.", en: "Choose a scenario, then choose the run button. Change the setting and run again to compare." })} />;
}
