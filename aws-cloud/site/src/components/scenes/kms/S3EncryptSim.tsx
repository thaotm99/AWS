import HopSim, { type HopScenario, type HNode } from "../security/HopSim";

// ShopViet stores invoices in S3. Each situation turns on the encryption option that solves
// one real need: an audit trail of key use (SSE-KMS), a lower KMS bill (S3 Bucket Keys),
// yearly rotation, one key in two Regions (multi-Region keys), one key per object with no
// work (SSE-S3) and keys kept outside AWS (SSE-C).
// Practice-test sources (build-time only): exam1_q22, exam2_q50, exam4_q6, exam5_q46, exam5_q11, exam2_q46, exam3_q24.

const APP: HNode = { id: "app", x: 95, y: 130, label: "App ShopViet", sub: "lưu hoá đơn", kind: "app" };
const S3: HNode = { id: "s3", x: 340, y: 130, label: "S3 bucket", sub: "hoa-don/", kind: "store" };
const KMS: HNode = { id: "kms", x: 625, y: 70, label: "AWS KMS", sub: "customer managed key", kind: "key" };
const TRAIL: HNode = { id: "trail", x: 625, y: 195, label: "CloudTrail", sub: "nhật ký gọi API", kind: "log" };

const SCENARIOS: HopScenario[] = [
  {
    name: "Kiểm toán hỏi ai đã dùng key",
    story: "Kiểm toán viên hỏi ShopViet: **key nào** đã mã hoá hoá đơn, **ai** dùng nó và **lúc nào**? ShopViet không muốn tự giữ key.",
    request: "PUT hoa-don/0912.pdf",
    toggle: { label: "Mã hoá bằng SSE-KMS (tắt: SSE-S3)", initial: false },
    start: "app",
    nodes: [APP, S3, KMS, TRAIL],
    hidden: (on) => (on ? [] : ["kms"]),
    run: (on) => on
      ? { hops: [
          { to: "s3", state: "pass", tag: "NHẬN", msg: "Nhận file, bucket mặc định mã hoá **SSE-KMS**." },
          { to: "kms", state: "change", tag: "DATA KEY", msg: "S3 gọi `GenerateDataKey`. KMS kiểm tra key policy rồi trả data key." },
          { to: "s3", state: "change", tag: "MÃ HOÁ", msg: "Object được mã hoá bằng data key.", packet: "pkt-back" },
          { from: "kms", to: "trail", state: "pass", tag: "GHI LOG", msg: "Ghi lại role nào, lúc nào, dùng key nào." },
        ], ok: true, result: "Kiểm toán mở CloudTrail là có câu trả lời. Key nằm trong KMS, ShopViet không phải tự cung cấp key, và quyền dùng key nằm trong key policy." }
      : { hops: [
          { to: "s3", state: "change", tag: "MÃ HOÁ", msg: "**SSE-S3**: S3 tự mã hoá bằng key do S3 quản lý." },
          { to: "trail", state: "alert", tag: "THIẾU", msg: "Chỉ có dòng `PutObject`. Không có log riêng cho việc dùng key." },
        ], ok: false, result: "Dữ liệu vẫn được mã hoá, nhưng không trả lời được kiểm toán. SSE-S3 không có audit trail theo từng key và không cho ShopViet kiểm soát ai được dùng key. Bật SSE-KMS." },
  },
  {
    name: "Hoá đơn KMS tăng vọt",
    story: "Mùa sale, mỗi phút có hàng nghìn ảnh đơn hàng lưu vào S3 với SSE-KMS. Phí gọi KMS tăng mạnh. ShopViet muốn **giữ SSE-KMS** nhưng giảm chi phí.",
    request: "PUT 5 ảnh đơn hàng",
    toggle: { label: "Bật S3 Bucket Keys", initial: false },
    start: "app",
    nodes: [APP, S3, KMS, TRAIL],
    run: (on) => on
      ? { hops: [
          { to: "s3", state: "pass", times: 5, tag: "5 FILE", msg: "5 file tới bucket." },
          { to: "kms", state: "change", tag: "1 LẦN", flash: "×1", msg: "S3 xin **một bucket key** từ KMS rồi dùng lại nó cho nhiều object." },
          { to: "s3", state: "change", tag: "MÃ HOÁ", msg: "Cả 5 object được mã hoá bằng data key sinh từ bucket key.", packet: "pkt-back" },
          { from: "kms", to: "trail", state: "pass", tag: "GHI LOG", msg: "Vẫn có log mỗi khi KMS được gọi." },
        ], ok: true, result: "Số request tới KMS giảm mạnh (AWS cho biết tới 99%). Dữ liệu vẫn mã hoá SSE-KMS, vẫn dùng đúng key cũ." }
      : { hops: [
          { to: "s3", state: "pass", times: 5, tag: "5 FILE", msg: "5 file tới bucket." },
          { to: "kms", state: "alert", times: 5, tag: "5 LẦN", flash: "×5", msg: "Mỗi object một lần gọi KMS. Một triệu ảnh là một triệu request tính phí." },
          { to: "s3", state: "change", tag: "MÃ HOÁ", msg: "Mã hoá xong, nhưng tốn tiền.", packet: "pkt-back" },
        ], ok: false, result: "An toàn nhưng đắt. Đừng chuyển sang SSE-S3 (mất audit trail): bật **S3 Bucket Keys** là đủ." },
  },
  {
    name: "Quy định xoay key mỗi năm",
    story: "Chính sách bảo mật mới: key mã hoá phải được **xoay vòng mỗi năm**, có log, và đội vận hành không muốn thêm việc tay.",
    request: "Key đã dùng 365 ngày",
    toggle: { label: "Bật automatic key rotation", initial: false },
    start: "cal",
    nodes: [
      { id: "cal", x: 110, y: 70, label: "Lịch xoay key", sub: "mỗi năm", kind: "aws" },
      { id: "ops", x: 110, y: 195, label: "Kỹ sư ShopViet", kind: "user" },
      { ...KMS, x: 380, y: 130 },
      { ...S3, x: 650, y: 70, sub: "hoá đơn cũ và mới" },
      { ...TRAIL, x: 650, y: 195 },
    ],
    run: (on) => on
      ? { hops: [
          { to: "kms", state: "change", tag: "XOAY", flash: "v2", msg: "KMS tự tạo key material mới. **Key ID giữ nguyên**, app không phải sửa gì." },
          { to: "s3", state: "pass", tag: "ĐỌC ĐƯỢC", msg: "Hoá đơn cũ vẫn giải mã được vì KMS giữ lại key material cũ." },
          { from: "kms", to: "trail", state: "pass", tag: "GHI LOG", msg: "Việc dùng key có log để đối chiếu." },
        ], ok: true, result: "Đạt chính sách mà không thêm việc: **customer managed key** + **automatic rotation**." }
      : { hops: [
          { to: "kms", state: "skip", tag: "CHƯA", msg: "Không có gì tự xoay key." },
          { from: "ops", to: "kms", state: "alert", tag: "LÀM TAY", msg: "Phải tự tạo key mới, sửa app trỏ sang key mới, và nhớ làm lại mỗi năm." },
        ], ok: false, result: "Làm tay thì dễ quên và dễ sai. Bật automatic rotation cho customer managed key." },
  },
  {
    name: "Sao lưu sang Region khác",
    story: "Hoá đơn được replicate từ us-east-1 sang us-west-1 để dự phòng. Yêu cầu: **cùng một key** mã hoá và giải mã ở cả hai nơi.",
    request: "Replicate hoa-don/0912.pdf → us-west-1",
    toggle: { label: "Dùng multi-Region key", initial: false },
    start: "s3",
    boxes: [
      { x: 20, y: 28, w: 300, h: 210, label: "us-east-1", tone: "region" },
      { x: 400, y: 28, w: 400, h: 210, label: "us-west-1", tone: "region" },
    ],
    nodes: [
      { ...S3, x: 170, y: 90, sub: "bản chính" },
      { id: "kmsa", x: 170, y: 190, label: "Multi-Region key", sub: "mrk-1234…", kind: "key" },
      { id: "kmsa0", x: 170, y: 190, label: "KMS key", sub: "chỉ ở us-east-1", kind: "key" },
      { id: "s3b", x: 520, y: 90, label: "S3 bucket", sub: "bản sao", kind: "store" },
      { id: "kmsr", x: 520, y: 190, label: "Replica key", sub: "mrk-1234…, cùng key material", kind: "key" },
      { id: "kmsb", x: 520, y: 190, label: "KMS key khác", sub: "key material khác", kind: "key" },
      { id: "app2", x: 715, y: 90, w: 120, label: "App dự phòng", kind: "app" },
    ],
    hidden: (on) => (on ? ["kmsb", "kmsa0"] : ["kmsr", "kmsa"]),
    run: (on) => on
      ? { hops: [
          { to: "kmsa", state: "change", tag: "MÃ HOÁ", msg: "Hoá đơn được mã hoá bằng multi-Region key." },
          { from: "s3", to: "s3b", state: "pass", tag: "REPLICATE", msg: "Object được chép sang us-west-1." },
          { to: "kmsr", state: "pass", tag: "GIẢI MÃ", msg: "Replica key có **cùng key ID và key material** với key ở us-east-1." },
          { from: "s3b", to: "app2", state: "pass", tag: "ĐỌC ĐƯỢC", msg: "App ở us-west-1 đọc được hoá đơn ngay." },
        ], ok: true, result: "Một key, hai Region: dữ liệu mã hoá ở Region này giải mã được ở Region kia mà không phải gọi chéo Region." }
      : { hops: [
          { to: "kmsa0", state: "change", tag: "MÃ HOÁ", msg: "Hoá đơn được mã hoá bằng một key thường." },
          { from: "s3", to: "s3b", state: "pass", tag: "REPLICATE", msg: "Object được chép sang us-west-1." },
          { to: "kmsb", state: "alert", tag: "KHÁC KEY", msg: "Key KMS thường chỉ sống trong một Region. Ở us-west-1 phải dùng một key khác." },
        ], ok: false, result: "Bản sao phải mã hoá lại bằng key khác, không đạt yêu cầu cùng một key. Dùng **KMS multi-Region keys**." },
  },
  {
    name: "Mỗi file một key, ít việc nhất",
    story: "Đội pháp chế muốn mỗi file có key riêng, nhưng không muốn chia dữ liệu ra nhiều bucket hay tự quản lý key.",
    request: "PUT 3 file vào một bucket",
    start: "app",
    nodes: [APP, S3, { id: "root", x: 625, y: 130, label: "Root key của S3", sub: "S3 tự xoay định kỳ", kind: "aws" }],
    run: () => ({ hops: [
      { to: "s3", state: "change", times: 3, tag: "SSE-S3", msg: "S3 tạo **một key riêng cho mỗi object** và mã hoá object bằng key đó." },
      { to: "root", state: "change", tag: "BỌC KEY", msg: "Key của từng object lại được mã hoá bằng root key." },
    ], ok: true, result: "Một bucket, SSE-S3, không phải làm gì thêm. SSE-S3 cũng là mặc định cho bucket mới." }),
  },
  {
    name: "Tự giữ key ngoài AWS",
    story: "Một đối tác bắt buộc key phải nằm trong hệ thống của họ, AWS không được lưu key.",
    request: "GET hoa-don/doi-tac.pdf",
    toggle: { label: "Gửi kèm key khi đọc lại", initial: true },
    start: "app",
    nodes: [APP, S3, { id: "hsm", x: 95, y: 220, label: "Kho key của đối tác", kind: "user" }],
    run: (on) => ({ hops: [
      { from: "hsm", to: "app", state: "pass", tag: "LẤY KEY", msg: "App lấy key từ hệ thống của đối tác." },
      { to: "s3", state: on ? "change" : "block", tag: on ? "SSE-C" : "THIẾU KEY",
        msg: on ? "Request mang key trong header (bắt buộc HTTPS). S3 giải mã rồi **xoá key khỏi bộ nhớ**." : "Request không kèm key. S3 không lưu key nên không giải mã được." },
      { to: "app", state: on ? "pass" : "block", packet: on ? "pkt-back" : "pkt-bad", tag: on ? "200" : "400",
        msg: on ? "Trả file." : "Từ chối request." },
    ], ok: on, result: on
      ? "Đây là **SSE-C**: AWS không bao giờ lưu key. Đổi lại, mỗi request phải tự gửi key và ShopViet phải tự giữ key cẩn thận."
      : "Với SSE-C, mất key là mất dữ liệu. Mọi lần ghi và đọc đều phải gửi đúng key." }),
  },
];

export default function S3EncryptSim() {
  return <HopSim scenarios={SCENARIOS} action="Chạy" height={250}
    label="Một file của ShopViet đi vào S3, được mã hoá, có thể gọi KMS và ghi log vào CloudTrail" />;
}
