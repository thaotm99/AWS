import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./s3-sims.css";

// ShopViet uploads three invoices with each S3 encryption option and watches where the
// data is encrypted, where the key lives, and how many times KMS is called (and logged).
// Source questions: exam2_q10, exam6_q51, exam3_q24, exam1_q22, exam5_q46.

type Method = "sse-s3" | "sse-kms" | "bucket-key" | "sse-c" | "client";
type NodeId = "app" | "keys" | "s3" | "kms" | "trail" | "disk";

interface Scenario {
  id: Method;
  name: Bi;
  method: string;
  toggle?: { label: Bi; initial: boolean };
  result(on: boolean, kmsCalls: number): Bi;
}

const SCENARIOS: Scenario[] = [
  { id: "sse-s3", name: { vi: "Cấu hình đơn giản, không quản lý key", en: "Simple setup, no key management" }, method: "SSE-S3",
    result: () => ({ vi: "Mỗi object được mã hoá bằng một key riêng do S3 tạo và quản lý. Không yêu cầu cấu hình bổ sung, nhưng không có log ghi lại từng lần sử dụng key.", en: "Each object is encrypted with its own key that S3 creates and manages. No extra configuration is needed, but there is no log of each key use." }) },
  { id: "sse-kms", name: { vi: "Audit việc sử dụng key", en: "Audit key usage" }, method: "SSE-KMS",
    result: (_on, n) => ({ vi: `S3 yêu cầu data key từ KMS cho mỗi object: ${n} lần gọi, ${n} bản ghi log trong **CloudTrail**. Quyền sử dụng key được kiểm soát bằng key policy.`, en: `S3 requests a data key from KMS for every object: ${n} calls, ${n} log entries in **CloudTrail**. Permission to use the key is controlled by the key policy.` }) },
  { id: "bucket-key", name: { vi: "Chi phí gọi KMS tăng đột biến", en: "KMS request costs spike" }, method: "SSE-KMS + S3 Bucket Key",
    toggle: { label: { vi: "Bật S3 Bucket Key", en: "Enable S3 Bucket Key" }, initial: false },
    result: (on, n) => on
      ? { vi: `Chỉ ${n} lần gọi KMS: S3 tạo một **S3 Bucket Key** ngắn hạn, sau đó tự sinh data key cho các object tiếp theo. Phương thức vẫn là SSE-KMS, nhưng số request tới KMS và chi phí giảm đáng kể.`, en: `Only ${n} KMS call: S3 creates a short-lived **S3 Bucket Key** and then generates data keys for the following objects itself. The method is still SSE-KMS, but requests to KMS and their cost drop significantly.` }
      : { vi: `${n} lần gọi KMS cho ${n} object. Với hàng triệu object mỗi ngày, chi phí KMS rất lớn. Bật **S3 Bucket Key** và tải lên lại để so sánh.`, en: `${n} KMS calls for ${n} objects. With millions of objects a day, the KMS cost is very high. Enable **S3 Bucket Key** and upload again to compare.` } },
  { id: "sse-c", name: { vi: "Key lưu giữ tại máy chủ công ty", en: "Keys kept on company servers" }, method: "SSE-C",
    result: () => ({ vi: "Key được gửi kèm từng request (bắt buộc HTTPS). S3 **không lưu key**. Khi đọc, request phải kèm đúng key đó; mất key đồng nghĩa với mất object. Từ tháng 4/2026, SSE-C bị **chặn mặc định** trên bucket general purpose mới; phải đặt `BlockedEncryptionTypes` = `NONE` bằng PutBucketEncryption trước khi tải lên, nếu không request trả về 403 AccessDenied.", en: "The key is sent with every request (HTTPS is required). S3 **does not store the key**. To read, the request must include that same key; losing the key means losing the object. Since April 2026, SSE-C is **blocked by default** on new general purpose buckets; you must set `BlockedEncryptionTypes` = `NONE` with PutBucketEncryption before uploading, otherwise the request returns 403 AccessDenied." }) },
  { id: "client", name: { vi: "Thuật toán mã hoá riêng", en: "Own encryption algorithm" }, method: "Client-side encryption",
    result: () => ({ vi: "Ứng dụng tự mã hoá bằng thuật toán và key riêng trước khi gửi. S3 chỉ tiếp nhận và lưu dữ liệu đã mã hoá, không bao giờ tiếp cận dữ liệu gốc.", en: "The application encrypts the data itself with its own algorithm and key before sending it. S3 only receives and stores encrypted data and never has access to the plaintext." }) },
];

const POS: Record<NodeId, Pt> = {
  app: [100, 120], keys: [100, 212], s3: [410, 120], kms: [410, 38], trail: [700, 38], disk: [700, 120],
};
const LABEL: Record<NodeId, { l1: Bi; l2: Bi; w: number }> = {
  app: { l1: { vi: "App ShopViet", en: "ShopViet app" }, l2: { vi: "tải lên hoá đơn", en: "uploads invoices" }, w: 140 },
  keys: { l1: { vi: "Kho key nội bộ", en: "Internal key store" }, l2: { vi: "on-premises", en: "on-premises" }, w: 140 },
  s3: { l1: { vi: "Amazon S3", en: "Amazon S3" }, l2: { vi: "tiếp nhận object", en: "receives objects" }, w: 150 },
  kms: { l1: { vi: "AWS KMS", en: "AWS KMS" }, l2: { vi: "KMS key", en: "KMS key" }, w: 150 },
  trail: { l1: { vi: "CloudTrail", en: "CloudTrail" }, l2: { vi: "log sử dụng key", en: "key usage log" }, w: 170 },
  disk: { l1: { vi: "Lưu trữ S3", en: "S3 storage" }, l2: { vi: "object đã mã hoá", en: "encrypted objects" }, w: 170 },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
type LogEntry = { tag: string; cls: string; msg: Bi } | { tag: "result"; msg: Bi };

export default function EncryptionSim() {
  const tr = useLang();
  const pk = useRef<SVGGElement>(null);
  const [index, setIndex] = useState(0);
  const sc = SCENARIOS[index];
  const [on, setOn] = useState(sc.toggle?.initial ?? false);
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Partial<Record<NodeId, string>>>({});
  const [calls, setCalls] = useState(0);
  const [stored, setStored] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);

  function reset() {
    setLit({});
    setCalls(0);
    setStored(0);
    setLog([]);
  }

  function pick(i: number) {
    if (busy) return;
    setIndex(i);
    setOn(SCENARIOS[i].toggle?.initial ?? false);
    reset();
  }

  const light = (id: NodeId, cls: string) => setLit((s) => ({ ...s, [id]: cls }));
  const add = (tag: string, cls: string, msg: Bi) => setLog((l) => [...l, { tag, cls, msg }]);

  async function upload() {
    const L = pk.current;
    if (!L || busy) return;
    setBusy(true);
    reset();
    let kms = 0;
    light("app", "on");
    const m = sc.id;
    if (m === "sse-c" || m === "client") {
      light("keys", "on");
      await travel(L, [POS.keys, POS.app], 450, "pkt-edge", 5);
      add("KEY", "lock", m === "sse-c" ? { vi: "Ứng dụng lấy key từ kho key nội bộ của công ty. Key không bao giờ được lưu trên AWS.", en: "The application fetches the key from the company’s internal key store. The key is never stored on AWS." } : { vi: "Ứng dụng lấy key từ kho key nội bộ của công ty và tự lựa chọn thuật toán.", en: "The application fetches the key from the company’s internal key store and chooses the algorithm itself." });
    }
    for (let i = 0; i < 3; i++) {
      const fast = i > 0 ? 0.6 : 1;
      const lane = (dy: number): Pt[] => [[POS.app[0] + 70, POS.app[1] + dy], [POS.s3[0] - 75, POS.s3[1] + dy]];
      if (m === "client") {
        flashText(L, POS.app[0], POS.app[1] - 34, tr({ vi: "mã hoá tại ứng dụng", en: "encrypted in the app" }), "s3x-flash-edge", 700);
        await wait(250 * fast);
        await travel(L, lane(0), 550 * fast, "pkt-edge");
        light("s3", "on");
        if (i === 0) add("APP", "miss", { vi: "Dữ liệu được mã hoá **ngay tại ứng dụng**; dữ liệu gửi tới S3 đã ở dạng mã hoá.", en: "Data is encrypted **in the application itself**; what is sent to S3 is already encrypted." });
      } else if (m === "sse-c") {
        await Promise.all([travel(L, lane(-7), 550 * fast, "pkt"), travel(L, lane(8), 550 * fast, "pkt-edge", 4)]);
        light("s3", "change");
        flashText(L, POS.s3[0], POS.s3[1] - 34, tr({ vi: "mã hoá, loại bỏ key", en: "encrypt, discard key" }), "s3x-flash-edge", 800);
        if (i === 0) add("S3", "miss", { vi: "Request gửi kèm key qua HTTPS. S3 sử dụng key đó để mã hoá và không lưu key lại.", en: "The request carries the key over HTTPS. S3 uses that key to encrypt and does not store it." });
        await wait(300 * fast);
      } else {
        await travel(L, lane(0), 550 * fast, "pkt");
        light("s3", "change");
        const useKms = m === "sse-kms" || (m === "bucket-key" && (!on || i === 0));
        if (m === "sse-s3") {
          flashText(L, POS.s3[0], POS.s3[1] - 34, tr({ vi: "key do S3 quản lý", en: "S3-managed key" }), "s3x-flash-edge", 700);
          if (i === 0) add("S3", "miss", { vi: "S3 mã hoá object bằng một key riêng cho object đó. Người dùng không truy cập và không phải quản lý key.", en: "S3 encrypts the object with a key unique to that object. Users neither access nor manage the key." });
          await wait(300 * fast);
        } else if (useKms) {
          light("kms", "on");
          await travel(L, [[POS.s3[0], POS.s3[1] - 25], [POS.kms[0], POS.kms[1] + 22]], 300 * fast, "pkt", 5);
          kms += 1;
          setCalls(kms);
          light("trail", "pass");
          await Promise.all([
            travel(L, [[POS.kms[0], POS.kms[1] + 22], [POS.s3[0], POS.s3[1] - 25]], 300 * fast, "pkt-back", 5),
            travel(L, [[POS.kms[0] + 75, POS.kms[1]], [POS.trail[0] - 85, POS.trail[1]]], 300 * fast, "pkt-edge", 4),
          ]);
          if (i === 0) {
            add("KMS", "lock", m === "bucket-key" && on ? { vi: "Lần đầu tiên: S3 gọi KMS để tạo **S3 Bucket Key** cho bucket.", en: "First time: S3 calls KMS to create an **S3 Bucket Key** for the bucket." } : { vi: "S3 gọi **KMS** để yêu cầu data key cho object này.", en: "S3 calls **KMS** to request a data key for this object." });
            add("LOG", "hit", { vi: "Lần sử dụng key được ghi vào **CloudTrail**.", en: "The key use is recorded in **CloudTrail**." });
          }
        } else {
          flashText(L, POS.s3[0], POS.s3[1] - 34, tr({ vi: "sử dụng bucket key", en: "uses bucket key" }), "s3x-flash-edge", 700);
          if (i === 1) add("S3", "miss", { vi: "Các object tiếp theo: S3 tự sinh data key từ **S3 Bucket Key**, không gọi KMS.", en: "Following objects: S3 generates data keys from the **S3 Bucket Key** without calling KMS." });
          await wait(300 * fast);
        }
      }
      await travel(L, [[POS.s3[0] + 75, POS.s3[1]], [POS.disk[0] - 85, POS.disk[1]]], 450 * fast, "pkt-edge");
      light("disk", "pass");
      setStored(i + 1);
    }
    setLog((l) => [...l, { tag: "result", msg: sc.result(on, kms) }]);
    setBusy(false);
  }

  const node = (id: NodeId) => {
    const [x, y] = POS[id];
    const { l1, l2, w } = LABEL[id];
    const h = id === "kms" || id === "trail" || id === "keys" ? 44 : 50;
    const used = (id === "keys" && (sc.id === "sse-c" || sc.id === "client")) || (id === "kms" && sc.id !== "sse-s3" && sc.id !== "sse-c" && sc.id !== "client") || (id === "trail" && (sc.id === "sse-kms" || sc.id === "bucket-key")) || id === "app" || id === "s3" || id === "disk";
    return (
      <g key={id} className={`s3x-node ${lit[id] ?? (used ? "" : "off")}`}>
        <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={8} />
        <text className="s3x-t" x={x} y={y - 3} textAnchor="middle">{tr(l1)}</text>
        <text className="s3x-s" x={x} y={y + 13} textAnchor="middle">
          {id === "disk" && stored > 0 ? tr({ vi: `${stored}/3 object đã mã hoá`, en: `${stored}/3 objects encrypted` }) : id === "kms" && calls > 0 ? tr({ vi: `${calls} lần gọi`, en: `${calls} ${calls === 1 ? "call" : "calls"}` }) : tr(l2)}
        </text>
      </g>
    );
  };

  return (
    <div className="stage s3x">
      <div className="s3x-row" role="group" aria-label={tr({ vi: "Tình huống", en: "Scenario" })}>
        {SCENARIOS.map((s, i) => (
          <button key={s.id} className="chip" aria-pressed={i === index} disabled={busy && i !== index} onClick={() => pick(i)}>{tr(s.name)}</button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="s3x-req">{sc.method}</code>
        {sc.toggle && (
          <label className="s3x-toggle">
            <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(); }} />
            {tr(sc.toggle.label)}
          </label>
        )}
        <button className="btn primary" onClick={upload} disabled={busy}>{tr({ vi: "Tải lên 3 hoá đơn", en: "Upload 3 invoices" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 8 820 236" role="img" aria-label={tr({ vi: "Hoá đơn được gửi từ ứng dụng tới S3 rồi tới tầng lưu trữ; KMS, CloudTrail và kho key nội bộ tham gia tuỳ theo phương thức mã hoá", en: "Invoices travel from the application to S3 and then to storage; KMS, CloudTrail and the internal key store take part depending on the encryption method" })}>
          <path className="s3x-wire" d={`M170 120 H335 M485 120 H615`} />
          <path className="s3x-wire dash" d={`M410 95 V60 M485 38 H615 M100 190 V145`} />
          {(Object.keys(POS) as NodeId[]).map(node)}
          <circle className="pkt" cx={500} cy={205} r={5} />
          <text className="s3x-s" x={512} y={209}>{tr({ vi: "dữ liệu gốc (truyền qua HTTPS)", en: "plaintext data (sent over HTTPS)" })}</text>
          <circle className="pkt-edge" cx={500} cy={226} r={5} />
          <text className="s3x-s" x={512} y={230}>{tr({ vi: "đã mã hoá / key", en: "encrypted / key" })}</text>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="s3x-hint">{tr({ vi: <>Chọn một yêu cầu, sau đó nhấn <b>Tải lên 3 hoá đơn</b> để quan sát vị trí mã hoá dữ liệu và nơi lưu trữ key.</>, en: <>Choose a requirement, then press <b>Upload 3 invoices</b> to see where the data is encrypted and where the key is kept.</> })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag === "result" ? (
                <li key={i} className="s3x-result ok">{rich(tr(e.msg))}</li>
              ) : (
                <li key={i}>
                  <span className={`tag ${"cls" in e ? e.cls : ""}`}>{e.tag}</span>
                  <span>{rich(tr(e.msg))}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
