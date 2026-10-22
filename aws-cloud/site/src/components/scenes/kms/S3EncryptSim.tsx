import HopSim, { type HopScenario, type HNode } from "../security/HopSim";

// ShopViet stores invoices in S3. Each situation turns on the encryption option that solves
// one real need: an audit trail of key use (SSE-KMS), a lower KMS bill (S3 Bucket Keys),
// yearly rotation, one key in two Regions (multi-Region keys), one key per object with no
// work (SSE-S3) and keys kept outside AWS (SSE-C).
// Practice-test sources (build-time only): exam1_q22, exam2_q50, exam4_q6, exam5_q46, exam5_q11, exam2_q46, exam3_q24.

const APP: HNode = { id: "app", x: 95, y: 130, label: "App ShopViet", sub: "lưu trữ hoá đơn", kind: "app" };
const S3: HNode = { id: "s3", x: 340, y: 130, label: "S3 bucket", sub: "hoa-don/", kind: "store" };
const KMS: HNode = { id: "kms", x: 625, y: 70, label: "AWS KMS", sub: "customer managed key", kind: "key" };
const TRAIL: HNode = { id: "trail", x: 625, y: 195, label: "CloudTrail", sub: "nhật ký gọi API", kind: "log" };

const SCENARIOS: HopScenario[] = [
  {
    name: "Kiểm toán việc sử dụng key",
    story: "Kiểm toán viên yêu cầu ShopViet cung cấp thông tin: **key nào** đã mã hoá hoá đơn, **principal nào** sử dụng key và **vào thời điểm nào**. ShopViet không muốn tự lưu giữ key.",
    request: "PUT hoa-don/0912.pdf",
    toggle: { label: "Mã hoá bằng SSE-KMS (tắt: SSE-S3)", initial: false },
    start: "app",
    nodes: [APP, S3, KMS, TRAIL],
    hidden: (on) => (on ? [] : ["kms"]),
    run: (on) => on
      ? { hops: [
          { to: "s3", state: "pass", tag: "NHẬN", msg: "Bucket tiếp nhận object và mã hoá mặc định bằng **SSE-KMS**." },
          { to: "kms", state: "change", tag: "DATA KEY", msg: "S3 gọi `GenerateDataKey`. KMS kiểm tra key policy rồi trả về data key." },
          { to: "s3", state: "change", tag: "MÃ HOÁ", msg: "Object được mã hoá bằng data key.", packet: "pkt-back" },
          { from: "kms", to: "trail", state: "pass", tag: "GHI LOG", msg: "Ghi lại role, thời điểm và key được sử dụng." },
        ], ok: true, result: "Kiểm toán viên tra cứu được thông tin trực tiếp trong CloudTrail. Key được lưu trong KMS, ShopViet không phải tự cung cấp key, và quyền sử dụng key được quy định trong key policy." }
      : { hops: [
          { to: "s3", state: "change", tag: "MÃ HOÁ", msg: "**SSE-S3**: S3 tự động mã hoá bằng key do S3 quản lý." },
          { to: "trail", state: "alert", tag: "THIẾU", msg: "Chỉ có bản ghi `PutObject`; không có log riêng cho việc sử dụng key." },
        ], ok: false, result: "Dữ liệu vẫn được mã hoá, nhưng không đáp ứng yêu cầu kiểm toán. SSE-S3 không có audit trail theo từng key và không cho phép ShopViet kiểm soát principal nào được sử dụng key. Cần bật SSE-KMS." },
  },
  {
    name: "Chi phí KMS tăng đột biến",
    story: "Trong mùa khuyến mãi, mỗi phút có hàng nghìn ảnh đơn hàng được lưu vào S3 với SSE-KMS. Chi phí request tới KMS tăng mạnh. ShopViet cần **giữ SSE-KMS** nhưng giảm chi phí.",
    request: "PUT 5 ảnh đơn hàng",
    toggle: { label: "Bật S3 Bucket Keys", initial: false },
    start: "app",
    nodes: [APP, S3, KMS, TRAIL],
    run: (on) => on
      ? { hops: [
          { to: "s3", state: "pass", times: 5, tag: "5 FILE", msg: "5 object được gửi tới bucket." },
          { to: "kms", state: "change", tag: "1 LẦN", flash: "×1", msg: "S3 yêu cầu **một bucket key** từ KMS và tái sử dụng key này cho nhiều object." },
          { to: "s3", state: "change", tag: "MÃ HOÁ", msg: "Cả 5 object được mã hoá bằng data key sinh từ bucket key.", packet: "pkt-back" },
          { from: "kms", to: "trail", state: "pass", tag: "GHI LOG", msg: "Mỗi lần KMS được gọi vẫn được ghi log." },
        ], ok: true, result: "Số request tới KMS giảm mạnh (theo AWS, tới 99%). Dữ liệu vẫn được mã hoá bằng SSE-KMS với cùng key ban đầu." }
      : { hops: [
          { to: "s3", state: "pass", times: 5, tag: "5 FILE", msg: "5 object được gửi tới bucket." },
          { to: "kms", state: "alert", times: 5, tag: "5 LẦN", flash: "×5", msg: "Mỗi object phát sinh một lần gọi KMS. Một triệu ảnh tương ứng một triệu request bị tính phí." },
          { to: "s3", state: "change", tag: "MÃ HOÁ", msg: "Mã hoá hoàn tất, nhưng chi phí cao.", packet: "pkt-back" },
        ], ok: false, result: "An toàn nhưng chi phí cao. Không nên chuyển sang SSE-S3 (mất audit trail): bật **S3 Bucket Keys** là đủ." },
  },
  {
    name: "Yêu cầu xoay key hằng năm",
    story: "Chính sách bảo mật mới: key mã hoá phải được **xoay vòng hằng năm**, có log, và không phát sinh thêm thao tác thủ công cho đội vận hành.",
    request: "Key đã sử dụng 365 ngày",
    toggle: { label: "Bật automatic key rotation", initial: false },
    start: "cal",
    nodes: [
      { id: "cal", x: 110, y: 70, label: "Lịch xoay key", sub: "mặc định 365 ngày", kind: "aws" },
      { id: "ops", x: 110, y: 195, label: "Kỹ sư ShopViet", kind: "user" },
      { ...KMS, x: 380, y: 130 },
      { ...S3, x: 650, y: 70, sub: "hoá đơn cũ và mới" },
      { ...TRAIL, x: 650, y: 195 },
    ],
    run: (on) => on
      ? { hops: [
          { to: "kms", state: "change", tag: "XOAY", flash: "v2", msg: "KMS tự động tạo key material mới theo rotation period (mặc định 365 ngày, cấu hình được từ 90 đến 2560 ngày). **Key ID giữ nguyên**, ứng dụng không cần thay đổi." },
          { to: "s3", state: "pass", tag: "ĐỌC ĐƯỢC", msg: "Hoá đơn cũ vẫn giải mã được vì KMS lưu giữ key material cũ." },
          { from: "kms", to: "trail", state: "pass", tag: "GHI LOG", msg: "Việc sử dụng key được ghi log để đối chiếu." },
        ], ok: true, result: "Đáp ứng chính sách mà không phát sinh thêm tác vụ: **customer managed key** + **automatic rotation**." }
      : { hops: [
          { to: "kms", state: "skip", tag: "CHƯA", msg: "Không có cơ chế tự động xoay key." },
          { from: "ops", to: "kms", state: "alert", tag: "THỦ CÔNG", msg: "Phải tự tạo key mới, cập nhật ứng dụng trỏ sang key mới, và lặp lại hằng năm." },
        ], ok: false, result: "Thao tác thủ công dễ bị bỏ sót và dễ sai. Cần bật automatic rotation cho customer managed key." },
  },
  {
    name: "Sao lưu sang Region khác",
    story: "Hoá đơn được replicate từ us-east-1 sang us-west-1 để dự phòng. Yêu cầu: **cùng một key** mã hoá và giải mã tại cả hai Region.",
    request: "Replicate hoa-don/0912.pdf → us-west-1",
    toggle: { label: "Sử dụng multi-Region key", initial: false },
    start: "s3",
    boxes: [
      { x: 20, y: 28, w: 300, h: 210, label: "us-east-1", tone: "region" },
      { x: 400, y: 28, w: 400, h: 210, label: "us-west-1", tone: "region" },
    ],
    nodes: [
      { ...S3, x: 170, y: 90, sub: "bản chính" },
      { id: "kmsa", x: 170, y: 190, label: "Multi-Region key", sub: "mrk-1234…", kind: "key" },
      { id: "kmsa0", x: 170, y: 190, label: "KMS key", sub: "chỉ tại us-east-1", kind: "key" },
      { id: "s3b", x: 520, y: 90, label: "S3 bucket", sub: "bản sao", kind: "store" },
      { id: "kmsr", x: 520, y: 190, label: "Replica key", sub: "mrk-1234…, cùng key material", kind: "key" },
      { id: "kmsb", x: 520, y: 190, label: "KMS key khác", sub: "key material khác", kind: "key" },
      { id: "app2", x: 715, y: 90, w: 120, label: "App dự phòng", kind: "app" },
    ],
    hidden: (on) => (on ? ["kmsb", "kmsa0"] : ["kmsr", "kmsa"]),
    run: (on) => on
      ? { hops: [
          { to: "kmsa", state: "change", tag: "MÃ HOÁ", msg: "Hoá đơn được mã hoá bằng multi-Region key." },
          { from: "s3", to: "s3b", state: "pass", tag: "REPLICATE", msg: "Object được sao chép sang us-west-1." },
          { to: "kmsr", state: "pass", tag: "GIẢI MÃ", msg: "Replica key có **cùng key ID và key material** với key tại us-east-1." },
          { from: "s3b", to: "app2", state: "pass", tag: "ĐỌC ĐƯỢC", msg: "Ứng dụng tại us-west-1 đọc được hoá đơn ngay." },
        ], ok: true, result: "Một key, hai Region: dữ liệu mã hoá tại Region này giải mã được tại Region kia mà không cần gọi API liên Region." }
      : { hops: [
          { to: "kmsa0", state: "change", tag: "MÃ HOÁ", msg: "Hoá đơn được mã hoá bằng một single-Region key." },
          { from: "s3", to: "s3b", state: "pass", tag: "REPLICATE", msg: "Object được sao chép sang us-west-1." },
          { to: "kmsb", state: "alert", tag: "KHÁC KEY", msg: "KMS key thông thường chỉ tồn tại trong một Region. Tại us-west-1 phải sử dụng một key khác." },
        ], ok: false, result: "Bản sao phải được mã hoá lại bằng key khác, không đáp ứng yêu cầu dùng cùng một key. Sử dụng **KMS multi-Region keys**." },
  },
  {
    name: "Mỗi object một key, tối thiểu vận hành",
    story: "Bộ phận pháp chế yêu cầu mỗi object có key riêng, nhưng không muốn chia dữ liệu ra nhiều bucket hoặc tự quản lý key.",
    request: "PUT 3 object vào một bucket",
    start: "app",
    nodes: [APP, S3, { id: "root", x: 625, y: 130, label: "Root key của S3", sub: "S3 tự động xoay định kỳ", kind: "aws" }],
    run: () => ({ hops: [
      { to: "s3", state: "change", times: 3, tag: "SSE-S3", msg: "S3 tạo **một key riêng cho mỗi object** và mã hoá object bằng key đó." },
      { to: "root", state: "change", tag: "BỌC KEY", msg: "Key của từng object được mã hoá tiếp bằng root key." },
    ], ok: true, result: "Một bucket, SSE-S3, không cần cấu hình bổ sung. SSE-S3 cũng là cấu hình mặc định cho bucket mới." }),
  },
  {
    name: "Lưu giữ key ngoài AWS",
    story: "Một đối tác yêu cầu key phải được lưu trong hệ thống của đối tác; AWS không được lưu key.",
    request: "GET hoa-don/doi-tac.pdf",
    toggle: { label: "Gửi kèm key khi đọc object", initial: true },
    start: "app",
    nodes: [APP, S3, { id: "hsm", x: 95, y: 220, label: "Kho key của đối tác", kind: "user" }],
    run: (on) => ({ hops: [
      { from: "hsm", to: "app", state: "pass", tag: "LẤY KEY", msg: "Ứng dụng lấy key từ hệ thống của đối tác." },
      { to: "s3", state: on ? "change" : "block", tag: on ? "SSE-C" : "THIẾU KEY",
        msg: on ? "Request mang key trong header (bắt buộc HTTPS). S3 dùng key để giải mã và **không lưu key**." : "Request không kèm key. S3 không lưu key nên không giải mã được." },
      { to: "app", state: on ? "pass" : "block", packet: on ? "pkt-back" : "pkt-bad", tag: on ? "200" : "400",
        msg: on ? "Trả về object." : "Từ chối request." },
    ], ok: on, result: on
      ? "Đây là **SSE-C**: S3 không bao giờ lưu key. Đổi lại, mỗi request phải gửi kèm key và ShopViet chịu trách nhiệm bảo quản key. Từ tháng 4/2026, SSE-C bị chặn mặc định trên bucket mới; phải bật lại bằng `PutBucketEncryption`."
      : "Với SSE-C, mất key đồng nghĩa với mất dữ liệu. Mọi thao tác ghi và đọc đều phải gửi kèm đúng key." }),
  },
];

export default function S3EncryptSim() {
  return <HopSim scenarios={SCENARIOS} action="Chạy" height={250}
    label="Một object của ShopViet được ghi vào S3 và mã hoá; S3 có thể gọi KMS và ghi log vào CloudTrail" />;
}
