import { useLang } from "../../../lib/lang";
import HopSim, { type HopScenario, type HNode } from "../security/HopSim";

type Lang = ReturnType<typeof useLang>;

// MFTech stores invoices in S3. Each situation turns on the encryption option that solves
// one real need: an audit trail of key use (SSE-KMS), a lower KMS bill (S3 Bucket Keys),
// yearly rotation, one key in two Regions (multi-Region keys), one key per object with no
// work (SSE-S3) and keys kept outside AWS (SSE-C).
// Practice-test sources (build-time only): exam1_q22, exam2_q50, exam4_q6, exam5_q46, exam5_q11, exam2_q46, exam3_q24.

function scenarios(L: Lang): HopScenario[] {
const APP: HNode = { id: "app", x: 95, y: 130, label: "App MFTech", sub: L({ vi: "lưu trữ hoá đơn", en: "stores invoices" }), kind: "app" };
const S3: HNode = { id: "s3", x: 340, y: 130, label: "S3 bucket", sub: "hoa-don/", kind: "store" };
const KMS: HNode = { id: "kms", x: 625, y: 70, label: "AWS KMS", sub: "customer managed key", kind: "key" };
const TRAIL: HNode = { id: "trail", x: 625, y: 195, label: "CloudTrail", sub: L({ vi: "ghi lại API call", en: "records API calls" }), kind: "log" };

return [
  {
    name: L({ vi: "Kiểm toán việc sử dụng key", en: "Auditing key usage" }),
    story: L({ vi: "Kiểm toán viên yêu cầu MFTech cung cấp thông tin: **key nào** đã mã hoá hoá đơn, **principal nào** sử dụng key và **vào thời điểm nào**. MFTech không muốn tự lưu giữ key.", en: "The auditors ask MFTech for information: **which key** encrypted the invoices, **which principal** used the key and **when**. MFTech does not want to keep the keys itself." }),
    request: "PUT hoa-don/0912.pdf",
    toggle: { label: L({ vi: "Mã hoá bằng SSE-KMS (tắt: SSE-S3)", en: "Encrypt with SSE-KMS (off: SSE-S3)" }), initial: false },
    start: "app",
    nodes: [APP, S3, KMS, TRAIL],
    hidden: (on) => (on ? [] : ["kms"]),
    run: (on) => on
      ? { hops: [
          { to: "s3", state: "pass", tag: L({ vi: "NHẬN", en: "RECEIVED" }), msg: L({ vi: "Bucket tiếp nhận object và mã hoá mặc định bằng **SSE-KMS**.", en: "The bucket receives the object and encrypts it by default with **SSE-KMS**." }) },
          { to: "kms", state: "change", tag: "DATA KEY", msg: L({ vi: "S3 gọi `GenerateDataKey`, kèm **encryption context** mặc định là ARN của object. KMS kiểm tra key policy rồi trả về data key.", en: "S3 calls `GenerateDataKey` with the object ARN as the default **encryption context**. KMS checks the key policy, then returns a data key." }) },
          { to: "s3", state: "change", tag: L({ vi: "MÃ HOÁ", en: "ENCRYPTED" }), msg: L({ vi: "Object được mã hoá bằng data key.", en: "The object is encrypted with the data key." }), packet: "pkt-back" },
          { from: "kms", to: "trail", state: "pass", tag: L({ vi: "GHI LOG", en: "LOGGED" }), msg: L({ vi: "Ghi lại role, thời điểm, key được sử dụng và encryption context (không được mã hoá, nên không chứa thông tin nhạy cảm). Khi giải mã phải gửi đúng encryption context đó.", en: "Records the role, the time, the key used and the encryption context (which is not encrypted, so it must hold no sensitive data). Decryption must supply the same encryption context." }) },
        ], ok: true, result: L({ vi: "Kiểm toán viên tra cứu được thông tin trực tiếp trong CloudTrail. Key được lưu trong KMS, MFTech không phải tự cung cấp key, và quyền sử dụng key được quy định trong key policy.", en: "The auditors can look up the information directly in CloudTrail. The key is stored in KMS, MFTech does not have to supply the key itself, and permission to use the key is defined in the key policy." }) }
      : { hops: [
          { to: "s3", state: "change", tag: L({ vi: "MÃ HOÁ", en: "ENCRYPTED" }), msg: L({ vi: "**SSE-S3**: S3 tự động mã hoá bằng key do S3 quản lý.", en: "**SSE-S3**: S3 automatically encrypts with a key that S3 manages." }) },
          { to: "trail", state: "alert", tag: L({ vi: "THIẾU", en: "MISSING" }), msg: L({ vi: "Chỉ có bản ghi `PutObject`; không có log riêng cho việc sử dụng key.", en: "There is only the `PutObject` record; there is no separate log of key usage." }) },
        ], ok: false, result: L({ vi: "Dữ liệu vẫn được mã hoá, nhưng không đáp ứng yêu cầu kiểm toán. SSE-S3 không có audit trail theo từng key và không cho phép MFTech kiểm soát principal nào được sử dụng key. Cần bật SSE-KMS.", en: "The data is still encrypted, but the audit requirement is not met. SSE-S3 has no per-key audit trail and does not let MFTech control which principals can use the key. SSE-KMS must be turned on." }) },
  },
  {
    name: L({ vi: "Chi phí KMS tăng đột biến", en: "KMS costs spike" }),
    story: L({ vi: "Trong mùa khuyến mãi, mỗi phút có hàng nghìn ảnh đơn hàng được lưu vào S3 với SSE-KMS. Chi phí request tới KMS tăng mạnh. MFTech cần **giữ SSE-KMS** nhưng giảm chi phí.", en: "During the sales season, thousands of order images are stored in S3 with SSE-KMS every minute. The cost of requests to KMS rises sharply. MFTech needs to **keep SSE-KMS** but reduce the cost." }),
    request: L({ vi: "PUT 5 ảnh đơn hàng", en: "PUT 5 order images" }),
    toggle: { label: L({ vi: "Bật S3 Bucket Keys", en: "Turn on S3 Bucket Keys" }), initial: false },
    start: "app",
    nodes: [APP, S3, KMS, TRAIL],
    run: (on) => on
      ? { hops: [
          { to: "s3", state: "pass", times: 5, tag: "5 FILE", msg: L({ vi: "5 object được gửi tới bucket.", en: "5 objects are sent to the bucket." }) },
          { to: "kms", state: "change", tag: L({ vi: "1 LẦN", en: "1 CALL" }), flash: "×1", msg: L({ vi: "S3 yêu cầu **một bucket key** từ KMS và tái sử dụng key này cho nhiều object.", en: "S3 requests **one bucket key** from KMS and reuses it for many objects." }) },
          { to: "s3", state: "change", tag: L({ vi: "MÃ HOÁ", en: "ENCRYPTED" }), msg: L({ vi: "Cả 5 object được mã hoá bằng data key sinh từ bucket key.", en: "All 5 objects are encrypted with data keys derived from the bucket key." }), packet: "pkt-back" },
          { from: "kms", to: "trail", state: "pass", tag: L({ vi: "GHI LOG", en: "LOGGED" }), msg: L({ vi: "Mỗi lần KMS được gọi vẫn được ghi log.", en: "Every KMS call is still logged." }) },
        ], ok: true, result: L({ vi: "Số request tới KMS giảm mạnh (theo AWS, tới 99%). Dữ liệu vẫn được mã hoá bằng SSE-KMS với cùng key ban đầu.", en: "The number of requests to KMS drops sharply (up to 99%, according to AWS). The data is still encrypted with SSE-KMS under the same original key." }) }
      : { hops: [
          { to: "s3", state: "pass", times: 5, tag: "5 FILE", msg: L({ vi: "5 object được gửi tới bucket.", en: "5 objects are sent to the bucket." }) },
          { to: "kms", state: "alert", times: 5, tag: L({ vi: "5 LẦN", en: "5 CALLS" }), flash: "×5", msg: L({ vi: "Mỗi object phát sinh một lần gọi KMS. Một triệu ảnh tương ứng một triệu request bị tính phí.", en: "Each object causes one KMS call. One million images means one million billed requests." }) },
          { to: "s3", state: "change", tag: L({ vi: "MÃ HOÁ", en: "ENCRYPTED" }), msg: L({ vi: "Mã hoá hoàn tất, nhưng chi phí cao.", en: "Encryption completes, but at a high cost." }), packet: "pkt-back" },
        ], ok: false, result: L({ vi: "An toàn nhưng chi phí cao. Không nên chuyển sang SSE-S3 (mất audit trail): bật **S3 Bucket Keys** là đủ.", en: "Secure but expensive. Do not switch to SSE-S3 (the audit trail would be lost): turning on **S3 Bucket Keys** is enough." }) },
  },
  {
    name: L({ vi: "Yêu cầu xoay key hằng năm", en: "Yearly key rotation required" }),
    story: L({ vi: "Chính sách bảo mật mới: key mã hoá phải được **xoay vòng hằng năm**, có log, và không phát sinh thêm thao tác thủ công cho đội vận hành.", en: "New security policy: encryption keys must be **rotated yearly**, with logs, and without extra manual work for the operations team." }),
    request: L({ vi: "Key đã sử dụng 365 ngày", en: "Key in use for 365 days" }),
    toggle: { label: L({ vi: "Bật automatic key rotation", en: "Turn on automatic key rotation" }), initial: false },
    start: "cal",
    nodes: [
      { id: "cal", x: 110, y: 70, label: L({ vi: "Lịch xoay key", en: "Rotation schedule" }), sub: L({ vi: "mặc định 365 ngày", en: "365 days by default" }), kind: "aws" },
      { id: "ops", x: 110, y: 195, label: L({ vi: "Kỹ sư MFTech", en: "MFTech engineer" }), kind: "user" },
      { ...KMS, x: 380, y: 130 },
      { ...S3, x: 650, y: 70, sub: L({ vi: "hoá đơn cũ và mới", en: "old and new invoices" }) },
      { ...TRAIL, x: 650, y: 195 },
    ],
    run: (on) => on
      ? { hops: [
          { to: "kms", state: "change", tag: L({ vi: "XOAY", en: "ROTATED" }), flash: "v2", msg: L({ vi: "KMS tự động tạo key material mới theo rotation period (mặc định 365 ngày, cấu hình được từ 90 đến 2560 ngày). **Key ID giữ nguyên**, ứng dụng không cần thay đổi.", en: "KMS automatically creates new key material according to the rotation period (365 days by default, configurable from 90 to 2560 days). **The key ID stays the same**, so the application needs no change." }) },
          { to: "s3", state: "pass", tag: L({ vi: "ĐỌC ĐƯỢC", en: "READABLE" }), msg: L({ vi: "Hoá đơn cũ vẫn giải mã được vì KMS lưu giữ key material cũ.", en: "Old invoices can still be decrypted because KMS keeps the old key material." }) },
          { from: "kms", to: "trail", state: "pass", tag: L({ vi: "GHI LOG", en: "LOGGED" }), msg: L({ vi: "Việc sử dụng key được ghi log để đối chiếu.", en: "Key usage is logged for reconciliation." }) },
        ], ok: true, result: L({ vi: "Đáp ứng chính sách mà không phát sinh thêm tác vụ: **customer managed key** + **automatic rotation**.", en: "Meets the policy without extra tasks: **customer managed key** + **automatic rotation**." }) }
      : { hops: [
          { to: "kms", state: "skip", tag: L({ vi: "CHƯA", en: "NOT SET" }), msg: L({ vi: "Không có cơ chế tự động xoay key.", en: "There is no automatic key rotation." }) },
          { from: "ops", to: "kms", state: "alert", tag: L({ vi: "THỦ CÔNG", en: "MANUAL" }), msg: L({ vi: "Phải tự tạo key mới, cập nhật ứng dụng trỏ sang key mới, và lặp lại hằng năm.", en: "You must create a new key yourself, point the application to the new key, and repeat this every year." }) },
        ], ok: false, result: L({ vi: "Thao tác thủ công dễ bị bỏ sót và dễ sai. Cần bật automatic rotation cho customer managed key.", en: "Manual work is easy to forget and error-prone. Turn on automatic rotation for the customer managed key." }) },
  },
  {
    name: L({ vi: "Replicate sang Region khác", en: "Replicating to another Region" }),
    story: L({ vi: "Hoá đơn tại us-east-1 đang được mã hoá bằng một **single-Region key**. MFTech cần replicate sang us-west-1 để dự phòng, với yêu cầu **cùng một key** mã hoá và giải mã tại cả hai Region.", en: "Invoices in us-east-1 are encrypted with a **single-Region key**. MFTech needs to replicate them to us-west-1 for redundancy, and **the same key** must encrypt and decrypt in both Regions." }),
    request: "Replicate hoa-don/ → us-west-1",
    toggle: { label: L({ vi: "Tạo multi-Region key mới (tắt: giữ key hiện tại)", en: "Create a new multi-Region key (off: keep the current key)" }), initial: false },
    start: "s3",
    boxes: [
      { x: 20, y: 28, w: 300, h: 210, label: "us-east-1", tone: "region" },
      { x: 400, y: 28, w: 400, h: 210, label: "us-west-1", tone: "region" },
    ],
    nodes: [
      { ...S3, x: 170, y: 90, sub: L({ vi: "source bucket", en: "source bucket" }) },
      { id: "kmsa", x: 170, y: 190, label: "Multi-Region key", sub: L({ vi: "mrk-1234…, key mới", en: "mrk-1234…, new key" }), kind: "key" },
      { id: "kmsa0", x: 170, y: 190, label: "KMS key", sub: L({ vi: "single-Region, us-east-1", en: "single-Region, us-east-1" }), kind: "key" },
      { id: "s3b", x: 520, y: 90, label: "S3 bucket", sub: L({ vi: "destination bucket", en: "destination bucket" }), kind: "store" },
      { id: "kmsr", x: 520, y: 190, label: "Replica key", sub: L({ vi: "mrk-1234…, cùng key material", en: "mrk-1234…, same key material" }), kind: "key" },
      { id: "kmsb", x: 520, y: 190, label: L({ vi: "KMS key khác", en: "Another KMS key" }), sub: L({ vi: "key material khác", en: "different key material" }), kind: "key" },
      { id: "app2", x: 715, y: 90, w: 120, label: L({ vi: "Ứng dụng dự phòng", en: "Standby application" }), kind: "app" },
    ],
    hidden: (on) => (on ? ["kmsb", "kmsa0"] : ["kmsr", "kmsa"]),
    run: (on) => on
      ? { hops: [
          { to: "kmsa", state: "change", tag: L({ vi: "KEY MỚI", en: "NEW KEY" }), flash: "mrk-", msg: L({ vi: "Key hiện tại không chuyển thành multi-Region được, nên MFTech tạo một **multi-Region key mới** và một replica key tại us-west-1.", en: "The current key cannot become multi-Region, so MFTech creates a **new multi-Region key** and a replica key in us-west-1." }) },
          { from: "kmsa", to: "s3", state: "change", tag: "COPY", msg: L({ vi: "Bucket đặt multi-Region key làm default encryption và bật replication. Hoá đơn hiện có được **copy** (CopyObject hoặc Batch Operations Copy) để mã hoá lại bằng key mới; mỗi bản copy là object mới nên được replicate. Object cũ không copy thì cần S3 Batch Replication.", en: "The bucket uses the multi-Region key as default encryption and has replication turned on. Existing invoices are **copied** (CopyObject or Batch Operations Copy) to re-encrypt them under the new key; each copy is a new object, so it is replicated. Objects left uncopied would need S3 Batch Replication." }) },
          { from: "s3", to: "s3b", state: "pass", tag: "REPLICATE", msg: L({ vi: "Object được replicate sang us-west-1; replication rule chỉ định replica key tại Region đích.", en: "The object is replicated to us-west-1; the replication rule names the replica key in the destination Region." }) },
          { to: "kmsr", state: "pass", tag: L({ vi: "GIẢI MÃ", en: "DECRYPTED" }), msg: L({ vi: "Replica key có **cùng key ID và key material** với key tại us-east-1.", en: "The replica key has **the same key ID and key material** as the key in us-east-1." }) },
          { from: "s3b", to: "app2", state: "pass", tag: L({ vi: "ĐỌC ĐƯỢC", en: "READABLE" }), msg: L({ vi: "Ứng dụng tại us-west-1 đọc được hoá đơn ngay.", en: "The application in us-west-1 can read the invoice right away." }) },
        ], ok: true, result: L({ vi: "Một key, hai Region: dữ liệu mã hoá tại Region này giải mã được tại Region kia mà không cần gọi API liên Region. Multi-Region phải được chọn **khi tạo key**; dữ liệu đang dùng single-Region key phải được mã hoá lại bằng key mới.", en: "One key, two Regions: data encrypted in one Region can be decrypted in the other without a cross-Region API call. Multi-Region must be chosen **when the key is created**; data under a single-Region key must be re-encrypted under the new key." }) }
      : { hops: [
          { to: "kmsa0", state: "block", tag: L({ vi: "KHÔNG ĐỔI ĐƯỢC", en: "CANNOT CONVERT" }), msg: L({ vi: "Thử chuyển key hiện tại thành multi-Region: KMS **không cho phép** chuyển single-Region key thành multi-Region key (hoặc ngược lại), để dữ liệu đã mã hoá giữ nguyên tính data residency.", en: "Trying to turn the current key into a multi-Region key: KMS **does not allow** converting a single-Region key to a multi-Region key (or the reverse), so data already encrypted keeps its data residency." }) },
          { from: "s3", to: "s3b", state: "pass", tag: "REPLICATE", msg: L({ vi: "Object được replicate sang us-west-1.", en: "The object is replicated to us-west-1." }) },
          { to: "kmsb", state: "alert", tag: L({ vi: "KHÁC KEY", en: "OTHER KEY" }), msg: L({ vi: "Single-Region key chỉ tồn tại trong một Region và không chia sẻ sang Region khác được. Tại us-west-1 phải sử dụng một key khác.", en: "A single-Region key exists in only one Region and cannot be shared with another Region. A different key must be used in us-west-1." }) },
        ], ok: false, result: L({ vi: "Replica bị mã hoá bằng key khác, không đáp ứng yêu cầu dùng cùng một key. Tạo **multi-Region key mới** và mã hoá lại dữ liệu bằng key đó.", en: "The replica is encrypted with another key, which does not meet the same-key requirement. Create a **new multi-Region key** and re-encrypt the data under it." }) },
  },
  {
    name: L({ vi: "Mỗi object một key, tối thiểu vận hành", en: "A key per object, minimal operations" }),
    story: L({ vi: "Bộ phận pháp chế yêu cầu mỗi object có key riêng, nhưng không muốn chia dữ liệu ra nhiều bucket hoặc tự quản lý key.", en: "The legal team requires a separate key for each object, but does not want to split the data across buckets or manage keys itself." }),
    request: L({ vi: "PUT 3 object vào một bucket", en: "PUT 3 objects into one bucket" }),
    start: "app",
    nodes: [APP, S3, { id: "root", x: 625, y: 130, label: L({ vi: "Root key của S3", en: "S3 root key" }), sub: L({ vi: "S3 tự động xoay định kỳ", en: "rotated by S3 periodically" }), kind: "aws" }],
    run: () => ({ hops: [
      { to: "s3", state: "change", times: 3, tag: "SSE-S3", msg: L({ vi: "S3 tạo **một key riêng cho mỗi object** và mã hoá object bằng key đó.", en: "S3 creates **a unique key for each object** and encrypts the object with that key." }) },
      { to: "root", state: "change", tag: L({ vi: "BỌC KEY", en: "KEY WRAPPED" }), msg: L({ vi: "Key của từng object được mã hoá tiếp bằng root key.", en: "Each object's key is in turn encrypted with the root key." }) },
    ], ok: true, result: L({ vi: "Một bucket, SSE-S3, không cần cấu hình bổ sung. SSE-S3 cũng là cấu hình mặc định cho bucket mới.", en: "One bucket, SSE-S3, no additional configuration. SSE-S3 is also the default for new buckets." }) }),
  },
  {
    name: L({ vi: "Lưu giữ key ngoài AWS", en: "Keeping keys outside AWS" }),
    story: L({ vi: "Một đối tác yêu cầu key phải được lưu trong hệ thống của đối tác; AWS không được lưu key.", en: "A partner requires the key to be stored in the partner's own system; AWS must not store the key." }),
    request: "GET hoa-don/doi-tac.pdf",
    toggle: { label: L({ vi: "Gửi kèm key khi đọc object", en: "Send the key when reading the object" }), initial: true },
    start: "app",
    nodes: [APP, S3, { id: "hsm", x: 95, y: 220, label: L({ vi: "Kho key của đối tác", en: "Partner key store" }), kind: "user" }],
    run: (on) => ({ hops: [
      { from: "hsm", to: "app", state: "pass", tag: L({ vi: "LẤY KEY", en: "GET KEY" }), msg: L({ vi: "Ứng dụng lấy key từ hệ thống của đối tác.", en: "The application gets the key from the partner's system." }) },
      { to: "s3", state: on ? "change" : "block", tag: on ? "SSE-C" : L({ vi: "THIẾU KEY", en: "NO KEY" }),
        msg: on ? L({ vi: "Request mang key trong header (bắt buộc HTTPS). S3 dùng key để giải mã và **không lưu key**.", en: "The request carries the key in a header (HTTPS required). S3 uses the key to decrypt and **does not store the key**." }) : L({ vi: "Request không kèm key. S3 không lưu key nên không giải mã được.", en: "The request carries no key. S3 does not store the key, so it cannot decrypt." }) },
      { to: "app", state: on ? "pass" : "block", packet: on ? "pkt-back" : "pkt-bad", tag: on ? "200" : "400",
        msg: on ? L({ vi: "Trả về object.", en: "Returns the object." }) : L({ vi: "Từ chối request.", en: "Rejects the request." }) },
    ], ok: on, result: on
      ? L({ vi: "Đây là **SSE-C**: S3 không bao giờ lưu key. Đổi lại, mỗi request phải gửi kèm key và MFTech chịu trách nhiệm bảo quản key. Từ tháng 4/2026, SSE-C bị chặn mặc định trên bucket mới; phải bật lại bằng `PutBucketEncryption`.", en: "This is **SSE-C**: S3 never stores the key. In return, every request must carry the key, and MFTech is responsible for safeguarding it. Since April 2026, SSE-C is blocked by default on new buckets; it must be re-enabled with `PutBucketEncryption`." })
      : L({ vi: "Với SSE-C, mất key đồng nghĩa với mất dữ liệu. Mọi thao tác ghi và đọc đều phải gửi kèm đúng key.", en: "With SSE-C, losing the key means losing the data. Every write and read must carry the right key." }) }),
  },
];
}

export default function S3EncryptSim() {
  const L = useLang();
  return <HopSim scenarios={scenarios(L)} action={L({ vi: "Chạy", en: "Run" })} height={250}
    label={L({ vi: "Một object của MFTech được ghi vào S3 và mã hoá; S3 có thể gọi KMS và ghi log vào CloudTrail", en: "A MFTech object is written to S3 and encrypted; S3 can call KMS and log to CloudTrail" })} />;
}
