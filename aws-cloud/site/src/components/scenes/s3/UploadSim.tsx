import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./s3-sims.css";

// Four real upload/download problems at ShopViet and the S3 feature that fixes each:
// multipart upload, S3 Transfer Acceleration, spreading keys over prefixes, byte-range fetch.
// Source questions: exam4_q14, exam1_q64, exam1_q18, exam1_q40, exam1_q51, exam6_q20, exam5_q21.

type Row = "r1" | "r2";
type Tone = "ok" | "bad" | "warn";

interface Ctx {
  L: SVGGElement;
  on: boolean;
  log(tag: string, cls: string, msg: string): void;
  row(id: Row, state: string): void;
  edge(state: string): void;
}

interface Scenario {
  name: string;
  src: string;
  toggle: string;
  prefixes(on: boolean): [string, string | null];
  request(on: boolean): string;
  run(c: Ctx): Promise<{ tone: Tone; msg: string }>;
}

const SRC: Pt = [95, 125];
const OUT: Pt = [170, 125];
const ROW: Record<Row, Pt> = { r1: [600, 95], r2: [600, 167] };
const EDGE: Pt = [300, 52];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const toRow = (r: Row, dy = 0): Pt[] => [[OUT[0], OUT[1] + dy], [540, OUT[1] + dy], [540, ROW[r][1] + dy], [ROW[r][0], ROW[r][1] + dy]];
const back = (r: Row): Pt[] => toRow(r).reverse();

const SCENARIOS: Scenario[] = [
  {
    name: "Video quảng cáo 8 GB",
    src: "Văn phòng HCM",
    toggle: "Sử dụng multipart upload",
    prefixes: () => ["videos/", null],
    request: (on) => (on ? "CreateMultipartUpload → UploadPart × 4 → Complete" : "PUT videos/tet-2027.mp4 (8 GB)"),
    async run({ L, on, log, row }) {
      if (!on) {
        await travel(L, toRow("r1"), 1300, "pkt-bad", 11);
        row("r1", "bad");
        flashText(L, 700, 62, "EntityTooLarge", "flash-bad", 1100);
        log("PUT", "bad", "Một request PUT chỉ chấp nhận object tối đa **5 GB**. Tệp 8 GB bị từ chối.");
        await travel(L, back("r1"), 600, "pkt-bad", 6);
        return { tone: "bad", msg: "Tải lên thất bại. Tệp lớn hơn 5 GB bắt buộc sử dụng **multipart upload**; AWS khuyến nghị sử dụng từ khoảng 100 MB." };
      }
      log("CHIA", "info", "Tệp được chia thành 4 phần và tải lên **song song**.");
      await Promise.all([0, 1, 2, 3].map(async (i) => {
        await wait(i * 140);
        const dy = (i - 1.5) * 9;
        if (i === 2) {
          const path = toRow("r1", dy);
          await travel(L, [path[0], [330, path[0][1]]], 450, "pkt");
          flashText(L, 330, 98, "phần 3 lỗi", "flash-bad", 800);
          await travel(L, [[330, path[0][1]], path[0]], 250, "pkt-bad");
          await travel(L, path, 800, "pkt");
        } else {
          await travel(L, toRow("r1", dy), 800, "pkt");
        }
      }));
      log("LỖI", "bad", "Phần 3 bị gián đoạn kết nối: **chỉ gửi lại phần 3**, không cần tải lên lại toàn bộ 8 GB.");
      row("r1", "ok");
      flashText(L, 700, 62, "Complete", "s3x-flash-ok", 1000);
      log("GHÉP", "hit", "Sau request Complete, S3 ghép 4 phần thành một object.");
      return { tone: "ok", msg: "Thời gian tải lên giảm nhờ xử lý song song; lỗi mạng chỉ yêu cầu gửi lại một phần nhỏ." };
    },
  },
  {
    name: "Nhà cung cấp tại Đức gửi video",
    src: "Đối tác tại Đức",
    toggle: "Bật S3 Transfer Acceleration",
    prefixes: () => ["supplier-videos/", null],
    request: (on) => (on ? "PUT shopviet-media.s3-accelerate.amazonaws.com/…" : "PUT shopviet-media.s3.ap-southeast-1.amazonaws.com/…"),
    async run({ L, on, log, row, edge }) {
      if (!on) {
        await travel(L, [OUT, [220, 170], [270, 110], [320, 190], [380, 105], [430, 185], [480, 120], [540, 95], ROW.r1], 2300, "pkt");
        row("r1", "ok");
        log("INTERNET", "info", "Gói tin đi qua nhiều chặng trên **Internet công cộng**, từ Đức tới Region Singapore. Thông lượng không ổn định.");
        return { tone: "warn", msg: "Tải lên thành công nhưng chậm. Bật **S3 Transfer Acceleration** và chạy lại để so sánh." };
      }
      edge("pass");
      await travel(L, [OUT, [EDGE[0] - 75, EDGE[1]]], 350, "pkt");
      log("EDGE", "hit", "Dữ liệu đi vào **edge location** gần Frankfurt.");
      await travel(L, [[EDGE[0] + 75, EDGE[1]], [540, EDGE[1]], [540, ROW.r1[1]], ROW.r1], 650, "pkt-edge");
      row("r1", "ok");
      log("AWS", "hit", "Dữ liệu tiếp tục truyền qua **mạng backbone của AWS** tới bucket tại Singapore.");
      return { tone: "ok", msg: "Tốc độ cao và ổn định hơn. Lần tải lên nào không nhanh hơn đường truyền thông thường thì **không tính phí** tăng tốc. Với tệp lớn, kết hợp thêm multipart upload." };
    },
  },
  {
    name: "Flash sale: 6.000 ảnh đơn hàng mỗi giây",
    src: "Web bán hàng",
    toggle: "Phân bổ key theo prefix của từng shop",
    prefixes: (on) => (on ? ["shop-a/orders/", "shop-b/orders/"] : ["orders/", null]),
    request: (on) => (on ? "PUT shop-a/orders/… · PUT shop-b/orders/…" : "PUT orders/… × 6.000/giây"),
    async run({ L, on, log, row }) {
      const dots = [0, 1, 2, 3, 4, 5];
      if (!on) {
        await Promise.all(dots.map(async (i) => {
          await wait(i * 160);
          if (i < 3) await travel(L, toRow("r1", (i - 1) * 7), 700, "pkt");
          else {
            await travel(L, toRow("r1", (i - 4) * 7), 700, "pkt-bad");
            row("r1", "bad");
            if (i === 3) flashText(L, 700, 62, "503 Slow Down", "flash-bad", 1200);
            await travel(L, back("r1"), 500, "pkt-bad", 5);
          }
        }));
        log("PREFIX", "bad", "Mọi key thuộc chung prefix `orders/`. Mỗi prefix hỗ trợ khoảng **3.500 PUT** và **5.500 GET** mỗi giây.");
        return { tone: "bad", msg: "Các request vượt giới hạn nhận lỗi 503 Slow Down; tác vụ tải lên đơn hàng thất bại đúng thời điểm lưu lượng cao nhất." };
      }
      await Promise.all(dots.map(async (i) => {
        await wait(i * 160);
        const r: Row = i % 2 ? "r2" : "r1";
        await travel(L, toRow(r, (Math.floor(i / 2) - 1) * 7), 700, "pkt");
        row(r, "ok");
      }));
      log("PREFIX", "hit", "Hai prefix, mỗi prefix khoảng 3.000 PUT/giây, đều dưới giới hạn. Bổ sung prefix đồng nghĩa với tăng khả năng xử lý.");
      return { tone: "ok", msg: "Không còn lỗi 503. Giới hạn được tính theo từng prefix, do đó phân bổ key theo shop, theo ngày… là cách tăng tổng throughput." };
    },
  },
  {
    name: "Đọc 200 byte đầu của 100.000 tệp",
    src: "Job phân tích",
    toggle: "Sử dụng byte-range fetch",
    prefixes: () => ["logs/", null],
    request: (on) => (on ? "GET logs/…  Range: bytes=0-199" : "GET logs/… (toàn bộ tệp 50 MB)"),
    async run({ L, on, log, row }) {
      await travel(L, toRow("r1"), 600, "pkt", 4);
      row("r1", "pass");
      if (!on) {
        flashText(L, 700, 62, "50 MB", "s3x-flash-edge", 1000);
        await travel(L, back("r1"), 1500, "pkt-edge", 11);
        log("GET", "miss", "Tải toàn bộ tệp 50 MB chỉ để đọc phần header 200 byte.");
        return { tone: "warn", msg: "Tác vụ hoàn thành nhưng tiêu tốn băng thông và thời gian. Gửi header **Range** để chỉ truy xuất đúng đoạn dữ liệu cần đọc." };
      }
      flashText(L, 700, 62, "200 byte", "s3x-flash-ok", 1000);
      await travel(L, back("r1"), 450, "pkt-back", 3);
      log("RANGE", "hit", "S3 chỉ trả về **200 byte** được yêu cầu.");
      return { tone: "ok", msg: "Thời gian và chi phí giảm đáng kể. Byte-range fetch cũng được dùng để tải song song nhiều đoạn của một tệp lớn." };
    },
  },
];

type LogEntry = { tag: string; cls: string; msg: ReactNode };

export default function UploadSim() {
  const pk = useRef<SVGGElement>(null);
  const [index, setIndex] = useState(0);
  const sc = SCENARIOS[index];
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Partial<Record<Row, string>>>({});
  const [edgeState, setEdgeState] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ tone: Tone; msg: ReactNode } | null>(null);

  function reset() {
    setRows({});
    setEdgeState("");
    setLog([]);
    setResult(null);
  }

  function pick(i: number) {
    if (busy) return;
    setIndex(i);
    setOn(false);
    reset();
  }

  async function go() {
    const L = pk.current;
    if (!L || busy) return;
    setBusy(true);
    reset();
    const out = await sc.run({
      L, on,
      log: (tag, cls, msg) => setLog((l) => [...l, { tag, cls, msg: rich(msg) }]),
      row: (id, state) => setRows((r) => ({ ...r, [id]: state })),
      edge: setEdgeState,
    });
    setResult({ tone: out.tone, msg: rich(out.msg) });
    setBusy(false);
  }

  const [p1, p2] = sc.prefixes(on);
  const accel = index === 1;

  return (
    <div className="stage s3x">
      <div className="s3x-row" role="group" aria-label="Tình huống">
        {SCENARIOS.map((s, i) => (
          <button key={s.name} className="chip" aria-pressed={i === index} disabled={busy && i !== index} onClick={() => pick(i)}>{s.name}</button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="s3x-req">{sc.request(on)}</code>
        <label className="s3x-toggle">
          <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(); }} />
          {sc.toggle}
        </label>
        <button className="btn primary" onClick={go} disabled={busy}>Chạy</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 225" role="img" aria-label="Dữ liệu được truyền từ nguồn qua Internet hoặc edge location tới các prefix trong bucket S3">
          <path className={`s3x-wire${accel && on ? " dash" : ""}`} d={`M170 125 H540 V95 H600 M540 125 V167 H600`} />
          <text className="s3x-m" x={355} y={145} textAnchor="middle">Internet</text>
          {accel && (
            <>
              <path className={`s3x-wire${on ? "" : " dash"}`} d={`M170 125 L225 ${EDGE[1]} M375 ${EDGE[1]} H540`} />
              <text className="s3x-m edge" x={458} y={EDGE[1] - 8} textAnchor="middle">mạng AWS</text>
              <g className={`s3x-node ${on ? edgeState || "on" : "off"}`}>
                <rect x={EDGE[0] - 75} y={EDGE[1] - 22} width={150} height={44} rx={8} />
                <text className="s3x-t" x={EDGE[0]} y={EDGE[1] - 3} textAnchor="middle">Edge location</text>
                <text className="s3x-s" x={EDGE[0]} y={EDGE[1] + 13} textAnchor="middle">gần Frankfurt</text>
              </g>
            </>
          )}
          <g className="s3x-node on">
            <rect x={SRC[0] - 75} y={SRC[1] - 26} width={150} height={52} rx={8} />
            <text className="s3x-t" x={SRC[0]} y={SRC[1] - 3} textAnchor="middle">{sc.src}</text>
            <text className="s3x-s" x={SRC[0]} y={SRC[1] + 14} textAnchor="middle">{index === 3 ? "đọc dữ liệu" : "gửi dữ liệu"}</text>
          </g>
          <rect className="s3x-box" x={555} y={30} width={255} height={205} rx={12} />
          <text className="s3x-m" x={568} y={226}>bucket shopviet-media · Singapore</text>
          {(["r1", "r2"] as Row[]).map((r) => {
            const p = r === "r1" ? p1 : p2;
            return (
              <g key={r} className={`s3x-node ${p ? rows[r] ?? "" : "off"}`}>
                <rect x={ROW[r][0]} y={ROW[r][1] - 24} width={195} height={48} rx={7} />
                <text className="s3x-t" x={ROW[r][0] + 97} y={ROW[r][1] - 4} textAnchor="middle">{p ?? "(chưa sử dụng)"}</text>
                <text className="s3x-s" x={ROW[r][0] + 97} y={ROW[r][1] + 13} textAnchor="middle">prefix · ~3.500 PUT/giây</text>
              </g>
            );
          })}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 && !result ? (
          <p className="s3x-hint">Chọn tình huống và nhấn <b>Chạy</b>. Sau đó bật tính năng tương ứng và chạy lại để so sánh kết quả.</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) => (
              <li key={i}>
                <span className={`tag ${e.cls}`}>{e.tag}</span>
                <span>{e.msg}</span>
              </li>
            ))}
            {result && <li className={`s3x-result ${result.tone}`}>{result.msg}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
