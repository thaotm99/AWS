import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./s3-sims.css";

// ShopViet uploads three invoices with each S3 encryption option and watches where the
// data is encrypted, where the key lives, and how many times KMS is called (and logged).
// Source questions: exam2_q10, exam6_q51, exam3_q24, exam1_q22, exam5_q46.

type Method = "sse-s3" | "sse-kms" | "bucket-key" | "sse-c" | "client";
type NodeId = "app" | "keys" | "s3" | "kms" | "trail" | "disk";

interface Scenario {
  id: Method;
  name: string;
  method: string;
  toggle?: { label: string; initial: boolean };
  result(on: boolean, kmsCalls: number): string;
}

const SCENARIOS: Scenario[] = [
  { id: "sse-s3", name: "Đơn giản nhất, không quản lý key", method: "SSE-S3",
    result: () => "Mỗi object được mã hoá bằng một key riêng do S3 tạo và quản lý. Không phải làm gì thêm, nhưng không có log ghi lại từng lần dùng key." },
  { id: "sse-kms", name: "Kiểm toán muốn biết ai dùng key", method: "SSE-KMS",
    result: (_on, n) => `S3 xin data key từ KMS cho mỗi object: ${n} lần gọi, ${n} dòng log trong **CloudTrail**. Kiểm soát được ai dùng key bằng key policy.` },
  { id: "bucket-key", name: "Phí gọi KMS tăng vọt", method: "SSE-KMS + S3 Bucket Key",
    toggle: { label: "Bật S3 Bucket Key", initial: false },
    result: (on, n) => on
      ? `Chỉ ${n} lần gọi KMS: S3 tạo một **bucket key** ngắn hạn rồi tự sinh data key cho các object sau. Vẫn là SSE-KMS, nhưng số request tới KMS và phí giảm mạnh.`
      : `${n} lần gọi KMS cho ${n} file. Hàng triệu file mỗi ngày thì phí KMS rất lớn. Bật **S3 Bucket Key** rồi gửi lại để so sánh.` },
  { id: "sse-c", name: "Key phải ở lại server công ty", method: "SSE-C",
    result: () => "Key đi kèm từng request (bắt buộc HTTPS). S3 mã hoá xong thì **bỏ key**, không lưu. Lúc đọc phải gửi lại đúng key đó; mất key là mất dữ liệu." },
  { id: "client", name: "Dùng thuật toán mã hoá riêng", method: "Client-side encryption",
    result: () => "Ứng dụng tự mã hoá bằng thuật toán và key của mình trước khi gửi. S3 chỉ nhận và lưu dữ liệu đã mã hoá, không bao giờ thấy bản gốc." },
];

const POS: Record<NodeId, Pt> = {
  app: [100, 120], keys: [100, 212], s3: [410, 120], kms: [410, 38], trail: [700, 38], disk: [700, 120],
};
const LABEL: Record<NodeId, { l1: string; l2: string; w: number }> = {
  app: { l1: "App ShopViet", l2: "upload hoá đơn", w: 140 },
  keys: { l1: "Kho key công ty", l2: "on-premises", w: 140 },
  s3: { l1: "Amazon S3", l2: "nhận object", w: 150 },
  kms: { l1: "AWS KMS", l2: "KMS key", w: 150 },
  trail: { l1: "CloudTrail", l2: "log dùng key", w: 170 },
  disk: { l1: "Ổ lưu của S3", l2: "object đã mã hoá", w: 170 },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
type LogEntry = { tag: string; cls: string; msg: ReactNode } | { tag: "result"; msg: ReactNode };

export default function EncryptionSim() {
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
  const add = (tag: string, cls: string, msg: string) => setLog((l) => [...l, { tag, cls, msg: rich(msg) }]);

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
      add("KEY", "lock", m === "sse-c" ? "App lấy key từ kho key của công ty. Key không bao giờ lưu trên AWS." : "App lấy key từ kho key của công ty và tự chọn thuật toán.");
    }
    for (let i = 0; i < 3; i++) {
      const fast = i > 0 ? 0.6 : 1;
      const lane = (dy: number): Pt[] => [[POS.app[0] + 70, POS.app[1] + dy], [POS.s3[0] - 75, POS.s3[1] + dy]];
      if (m === "client") {
        flashText(L, POS.app[0], POS.app[1] - 34, "mã hoá tại app", "s3x-flash-edge", 700);
        await wait(250 * fast);
        await travel(L, lane(0), 550 * fast, "pkt-edge");
        light("s3", "on");
        if (i === 0) add("APP", "miss", "Dữ liệu được mã hoá **ngay trên app**, đi lên S3 đã là bản mã.");
      } else if (m === "sse-c") {
        await Promise.all([travel(L, lane(-7), 550 * fast, "pkt"), travel(L, lane(8), 550 * fast, "pkt-edge", 4)]);
        light("s3", "change");
        flashText(L, POS.s3[0], POS.s3[1] - 34, "mã hoá, rồi bỏ key", "s3x-flash-edge", 800);
        if (i === 0) add("S3", "miss", "Request gửi kèm key qua HTTPS. S3 dùng key đó để mã hoá rồi xoá key khỏi bộ nhớ.");
        await wait(300 * fast);
      } else {
        await travel(L, lane(0), 550 * fast, "pkt");
        light("s3", "change");
        const useKms = m === "sse-kms" || (m === "bucket-key" && (!on || i === 0));
        if (m === "sse-s3") {
          flashText(L, POS.s3[0], POS.s3[1] - 34, "key do S3 quản lý", "s3x-flash-edge", 700);
          if (i === 0) add("S3", "miss", "S3 mã hoá object bằng một key riêng cho object đó. Bạn không thấy và không phải quản lý key.");
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
            add("KMS", "lock", m === "bucket-key" && on ? "Lần đầu: S3 gọi KMS để tạo **bucket key** cho bucket." : "S3 gọi **KMS** xin data key cho object này.");
            add("LOG", "hit", "Lần dùng key được ghi vào **CloudTrail**.");
          }
        } else {
          flashText(L, POS.s3[0], POS.s3[1] - 34, "dùng bucket key", "s3x-flash-edge", 700);
          if (i === 1) add("S3", "miss", "File sau: S3 tự sinh data key từ **bucket key**, không gọi KMS.");
          await wait(300 * fast);
        }
      }
      await travel(L, [[POS.s3[0] + 75, POS.s3[1]], [POS.disk[0] - 85, POS.disk[1]]], 450 * fast, "pkt-edge");
      light("disk", "pass");
      setStored(i + 1);
    }
    setLog((l) => [...l, { tag: "result", msg: rich(sc.result(on, kms)) }]);
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
        <text className="s3x-t" x={x} y={y - 3} textAnchor="middle">{l1}</text>
        <text className="s3x-s" x={x} y={y + 13} textAnchor="middle">
          {id === "disk" && stored > 0 ? `${stored}/3 object đã mã hoá` : id === "kms" && calls > 0 ? `đã gọi ${calls} lần` : l2}
        </text>
      </g>
    );
  };

  return (
    <div className="stage s3x">
      <div className="s3x-row" role="group" aria-label="Tình huống">
        {SCENARIOS.map((s, i) => (
          <button key={s.id} className="chip" aria-pressed={i === index} disabled={busy && i !== index} onClick={() => pick(i)}>{s.name}</button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="s3x-req">{sc.method}</code>
        {sc.toggle && (
          <label className="s3x-toggle">
            <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(); }} />
            {sc.toggle.label}
          </label>
        )}
        <button className="btn primary" onClick={upload} disabled={busy}>Upload 3 hoá đơn</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 8 820 236" role="img" aria-label="Hoá đơn đi từ app lên S3 rồi xuống ổ lưu; KMS, CloudTrail và kho key công ty tham gia tuỳ kiểu mã hoá">
          <path className="s3x-wire" d={`M170 120 H335 M485 120 H615`} />
          <path className="s3x-wire dash" d={`M410 95 V60 M485 38 H615 M100 190 V145`} />
          {(Object.keys(POS) as NodeId[]).map(node)}
          <circle className="pkt" cx={500} cy={205} r={5} />
          <text className="s3x-s" x={512} y={209}>dữ liệu gốc (đi trong HTTPS)</text>
          <circle className="pkt-edge" cx={500} cy={226} r={5} />
          <text className="s3x-s" x={512} y={230}>đã mã hoá / key</text>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="s3x-hint">Chọn một nhu cầu rồi bấm <b>Upload 3 hoá đơn</b> để xem dữ liệu được mã hoá ở đâu và key nằm ở đâu.</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag === "result" ? (
                <li key={i} className="s3x-result ok">{e.msg}</li>
              ) : (
                <li key={i}>
                  <span className={`tag ${"cls" in e ? e.cls : ""}`}>{e.tag}</span>
                  <span>{e.msg}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
