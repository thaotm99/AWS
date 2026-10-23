import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./s3-sims.css";

// Four real upload/download problems at MFTech and the S3 feature that fixes each:
// multipart upload, S3 Transfer Acceleration, spreading keys over prefixes, byte-range fetch,
// and what an S3TA upload costs (data in is free; S3TA is charged only when it accelerates).
// Source questions: exam4_q14, exam1_q64, exam1_q18, exam1_q40, exam1_q51, exam6_q20, exam5_q21.

type Row = "r1" | "r2";
type Tone = "ok" | "bad" | "warn";

interface Ctx {
  L: SVGGElement;
  on: boolean;
  tr<T>(value: Bi<T>): T;
  log(tag: string | Bi, cls: string, msg: Bi): void;
  row(id: Row, state: string): void;
  edge(state: string): void;
}

interface Scenario {
  name: Bi;
  src: Bi;
  toggle: Bi;
  prefixes(on: boolean): [string, string | null];
  request(on: boolean): Bi;
  run(c: Ctx): Promise<{ tone: Tone; msg: Bi }>;
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
    name: { vi: "Video quảng cáo 8 GB", en: "8 GB promo video" },
    src: { vi: "Văn phòng HCM", en: "HCMC office" },
    toggle: { vi: "Sử dụng multipart upload", en: "Use multipart upload" },
    prefixes: () => ["videos/", null],
    request: (on) => { const r = on ? "CreateMultipartUpload → UploadPart × 4 → Complete" : "PUT videos/tet-2027.mp4 (8 GB)"; return { vi: r, en: r }; },
    async run({ L, on, tr, log, row }) {
      if (!on) {
        await travel(L, toRow("r1"), 1300, "pkt-bad", 11);
        row("r1", "bad");
        flashText(L, 700, 62, "EntityTooLarge", "flash-bad", 1100);
        log("PUT", "bad", { vi: "Một request PUT chỉ chấp nhận object tối đa **5 GB**. Tệp 8 GB bị từ chối.", en: "A single PUT request accepts objects up to **5 GB**. The 8 GB file is rejected." });
        await travel(L, back("r1"), 600, "pkt-bad", 6);
        return { tone: "bad", msg: { vi: "Tải lên thất bại. Tệp lớn hơn 5 GB bắt buộc sử dụng **multipart upload**; AWS khuyến nghị sử dụng từ khoảng 100 MB.", en: "The upload fails. Files larger than 5 GB must use **multipart upload**; AWS recommends it from about 100 MB." } };
      }
      log({ vi: "CHIA", en: "SPLIT" }, "info", { vi: "Tệp được chia thành 4 phần và tải lên **song song**.", en: "The file is split into 4 parts that upload **in parallel**." });
      await Promise.all([0, 1, 2, 3].map(async (i) => {
        await wait(i * 140);
        const dy = (i - 1.5) * 9;
        if (i === 2) {
          const path = toRow("r1", dy);
          await travel(L, [path[0], [330, path[0][1]]], 450, "pkt");
          flashText(L, 330, 98, tr({ vi: "phần 3 lỗi", en: "part 3 failed" }), "flash-bad", 800);
          await travel(L, [[330, path[0][1]], path[0]], 250, "pkt-bad");
          await travel(L, path, 800, "pkt");
        } else {
          await travel(L, toRow("r1", dy), 800, "pkt");
        }
      }));
      log({ vi: "LỖI", en: "ERROR" }, "bad", { vi: "Phần 3 bị gián đoạn kết nối: **chỉ gửi lại phần 3**, không cần tải lên lại toàn bộ 8 GB.", en: "Part 3 loses its connection: **only part 3 is resent**; there is no need to upload all 8 GB again." });
      row("r1", "ok");
      flashText(L, 700, 62, "Complete", "s3x-flash-ok", 1000);
      log({ vi: "GHÉP", en: "MERGE" }, "hit", { vi: "Sau request Complete, S3 ghép 4 phần thành một object.", en: "After the Complete request, S3 assembles the 4 parts into one object." });
      return { tone: "ok", msg: { vi: "Thời gian tải lên giảm nhờ xử lý song song; lỗi mạng chỉ yêu cầu gửi lại một phần nhỏ.", en: "Upload time drops thanks to parallel processing; a network error only requires resending one small part." } };
    },
  },
  {
    name: { vi: "Nhà cung cấp tại Đức gửi video", en: "Supplier in Germany sends videos" },
    src: { vi: "Đối tác tại Đức", en: "Partner in Germany" },
    toggle: { vi: "Bật S3 Transfer Acceleration", en: "Enable S3 Transfer Acceleration" },
    prefixes: () => ["supplier-videos/", null],
    request: (on) => { const r = on ? "PUT mftech-media.s3-accelerate.amazonaws.com/…" : "PUT mftech-media.s3.ap-southeast-1.amazonaws.com/…"; return { vi: r, en: r }; },
    async run({ L, on, log, row, edge }) {
      if (!on) {
        await travel(L, [OUT, [220, 170], [270, 110], [320, 190], [380, 105], [430, 185], [480, 120], [540, 95], ROW.r1], 2300, "pkt");
        row("r1", "ok");
        log("INTERNET", "info", { vi: "Gói tin đi qua nhiều chặng trên **Internet công cộng**, từ Đức tới Region Singapore. Thông lượng không ổn định.", en: "Packets cross many hops on the **public internet**, from Germany to the Singapore Region. Throughput is unstable." });
        return { tone: "warn", msg: { vi: "Tải lên thành công nhưng chậm. Bật **S3 Transfer Acceleration** và chạy lại để so sánh.", en: "The upload succeeds but is slow. Enable **S3 Transfer Acceleration** and run again to compare." } };
      }
      edge("pass");
      await travel(L, [OUT, [EDGE[0] - 75, EDGE[1]]], 350, "pkt");
      log("EDGE", "hit", { vi: "Dữ liệu đi vào **edge location** gần Frankfurt.", en: "Data enters an **edge location** near Frankfurt." });
      await travel(L, [[EDGE[0] + 75, EDGE[1]], [540, EDGE[1]], [540, ROW.r1[1]], ROW.r1], 650, "pkt-edge");
      row("r1", "ok");
      log("AWS", "hit", { vi: "Từ edge location, dữ liệu được định tuyến tới bucket tại Singapore qua **đường mạng đã được tối ưu**.", en: "From the edge location, data is routed to the bucket in Singapore over an **optimized network path**." });
      return { tone: "ok", msg: { vi: "Tốc độ cao và ổn định hơn: dữ liệu vào edge location rồi đi theo đường mạng đã tối ưu tới S3. Transfer Acceleration có thể phát sinh phí truyền dữ liệu bổ sung (xem S3 pricing). Với tệp lớn, kết hợp thêm multipart upload.", en: "Faster and more stable: data enters an edge location and then follows an optimized network path to S3. Transfer Acceleration can incur additional data transfer charges (see S3 pricing). For large files, combine it with multipart upload." } };
    },
  },
  {
    name: { vi: "Flash sale: 6.000 ảnh đơn hàng mỗi giây", en: "Flash sale: 6,000 order images per second" },
    src: { vi: "Web bán hàng", en: "Store website" },
    toggle: { vi: "Phân bổ key theo prefix của từng shop", en: "Spread keys across per-shop prefixes" },
    prefixes: (on) => (on ? ["shop-a/orders/", "shop-b/orders/"] : ["orders/", null]),
    request: (on) => (on ? { vi: "PUT shop-a/orders/… · PUT shop-b/orders/…", en: "PUT shop-a/orders/… · PUT shop-b/orders/…" } : { vi: "PUT orders/… × 6.000/giây", en: "PUT orders/… × 6,000/second" }),
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
        log("PREFIX", "bad", { vi: "Mọi key thuộc chung prefix `orders/`. Mỗi prefix hỗ trợ khoảng **3.500 PUT** và **5.500 GET** mỗi giây.", en: "Every key shares the prefix `orders/`. Each prefix supports about **3,500 PUT** and **5,500 GET** requests per second." });
        return { tone: "bad", msg: { vi: "Các request vượt giới hạn nhận lỗi 503 Slow Down; tác vụ tải lên đơn hàng thất bại đúng thời điểm lưu lượng cao nhất.", en: "Requests over the limit get 503 Slow Down errors; order uploads fail right at peak traffic." } };
      }
      await Promise.all(dots.map(async (i) => {
        await wait(i * 160);
        const r: Row = i % 2 ? "r2" : "r1";
        await travel(L, toRow(r, (Math.floor(i / 2) - 1) * 7), 700, "pkt");
        row(r, "ok");
      }));
      log("PREFIX", "hit", { vi: "Hai prefix, mỗi prefix khoảng 3.000 PUT/giây, đều dưới giới hạn. Bổ sung prefix đồng nghĩa với tăng khả năng xử lý.", en: "Two prefixes at about 3,000 PUT/second each, both under the limit. Adding prefixes means adding request capacity." });
      return { tone: "ok", msg: { vi: "Không còn lỗi 503. Giới hạn được tính theo từng prefix, do đó phân bổ key theo shop, theo ngày… là cách tăng tổng throughput.", en: "No more 503 errors. The limit applies per prefix, so spreading keys by shop, by date and so on is how you raise total throughput." } };
    },
  },
  {
    name: { vi: "Đọc 200 byte đầu của 100.000 tệp", en: "Read the first 200 bytes of 100,000 files" },
    src: { vi: "Job phân tích", en: "Analytics job" },
    toggle: { vi: "Sử dụng byte-range fetch", en: "Use byte-range fetch" },
    prefixes: () => ["logs/", null],
    request: (on) => (on ? { vi: "GET logs/…  Range: bytes=0-199", en: "GET logs/…  Range: bytes=0-199" } : { vi: "GET logs/… (toàn bộ tệp 50 MB)", en: "GET logs/… (whole 50 MB file)" }),
    async run({ L, on, tr, log, row }) {
      await travel(L, toRow("r1"), 600, "pkt", 4);
      row("r1", "pass");
      if (!on) {
        flashText(L, 700, 62, "50 MB", "s3x-flash-edge", 1000);
        await travel(L, back("r1"), 1500, "pkt-edge", 11);
        log("GET", "miss", { vi: "Tải toàn bộ tệp 50 MB chỉ để đọc phần header 200 byte.", en: "Downloads the whole 50 MB file just to read the 200-byte header." });
        return { tone: "warn", msg: { vi: "Tác vụ hoàn thành nhưng tiêu tốn băng thông và thời gian. Gửi header **Range** để chỉ truy xuất đúng đoạn dữ liệu cần đọc.", en: "The job finishes but wastes bandwidth and time. Send a **Range** header to retrieve only the bytes you need." } };
      }
      flashText(L, 700, 62, tr({ vi: "200 byte", en: "200 bytes" }), "s3x-flash-ok", 1000);
      await travel(L, back("r1"), 450, "pkt-back", 3);
      log("RANGE", "hit", { vi: "S3 chỉ trả về **200 byte** được yêu cầu.", en: "S3 returns only the **200 bytes** requested." });
      return { tone: "ok", msg: { vi: "Thời gian và chi phí giảm đáng kể. Byte-range fetch cũng được dùng để tải song song nhiều đoạn của một tệp lớn.", en: "Time and cost drop significantly. Byte-range fetches are also used to download several ranges of a large file in parallel." } };
    },
  },
  {
    name: { vi: "Chi phí tải 3 GB qua Transfer Acceleration", en: "Cost of a 3 GB upload with Transfer Acceleration" },
    src: { vi: "Đối tác tại Đức", en: "Partner in Germany" },
    toggle: { vi: "Đường qua edge location nhanh hơn", en: "Edge path is faster" },
    prefixes: () => ["supplier-videos/", null],
    request: () => ({ vi: "PUT mftech-media.s3-accelerate.amazonaws.com/… (3 GB)", en: "PUT mftech-media.s3-accelerate.amazonaws.com/… (3 GB)" }),
    async run({ L, on, log, row, edge }) {
      if (!on) {
        edge("warn");
        await travel(L, [OUT, [EDGE[0] - 75, EDGE[1]]], 350, "pkt");
        log({ vi: "KIỂM TRA", en: "CHECK" }, "miss", { vi: "S3 xác định Transfer Acceleration **không có khả năng nhanh hơn** một lần truyền thông thường tới cùng Region, nên có thể bỏ qua hệ thống tăng tốc.", en: "S3 determines that Transfer Acceleration is **not likely to be faster** than a regular transfer to the same Region, so it may bypass the acceleration system." });
        await travel(L, [[EDGE[0] - 75, EDGE[1]], OUT, [540, OUT[1]], [540, ROW.r1[1]], ROW.r1], 1100, "pkt");
        row("r1", "ok");
        log({ vi: "PHÍ", en: "BILL" }, "hit", { vi: "Data transfer **in** từ Internet vào S3: **miễn phí**. Phí Transfer Acceleration: **không tính** vì lần truyền này không được tăng tốc.", en: "Data transfer **in** from the internet to S3: **free**. Transfer Acceleration charge: **none**, because this transfer was not accelerated." });
        return { tone: "ok", msg: { vi: "Tổng phí truyền dữ liệu cho lần tải lên này bằng 0. Với S3 Transfer Acceleration, chỉ các lần truyền được tăng tốc mới bị tính phí.", en: "The total data transfer charge for this upload is zero. With S3 Transfer Acceleration, you pay only for transfers that are accelerated." } };
      }
      edge("pass");
      await travel(L, [OUT, [EDGE[0] - 75, EDGE[1]]], 350, "pkt");
      await travel(L, [[EDGE[0] + 75, EDGE[1]], [540, EDGE[1]], [540, ROW.r1[1]], ROW.r1], 650, "pkt-edge");
      row("r1", "ok");
      log("EDGE", "hit", { vi: "Lần truyền đi qua edge location và mạng AWS: **được tăng tốc**.", en: "The transfer goes through the edge location and the AWS network: it **is accelerated**." });
      log({ vi: "PHÍ", en: "BILL" }, "miss", { vi: "Data transfer **in** từ Internet: **miễn phí**. Phí Transfer Acceleration tính theo GB, theo edge location đã dùng, và **cộng thêm** vào giá data transfer.", en: "Data transfer **in** from the internet: **free**. The Transfer Acceleration charge is per GB, based on the edge location used, and is **in addition to** data transfer pricing." });
      return { tone: "warn", msg: { vi: "Chỉ phát sinh phí Transfer Acceleration cho 3 GB đã được tăng tốc. Kiểm tra mức cải thiện tại vị trí của mình bằng speed comparison tool của S3 trước khi bật.", en: "Only the Transfer Acceleration charge for the 3 GB that was accelerated applies. Check the improvement from your location with the S3 speed comparison tool before turning it on." } };
    },
  },
];

type LogEntry = { tag: string | Bi; cls: string; msg: Bi };

export default function UploadSim() {
  const tr = useLang();
  const pk = useRef<SVGGElement>(null);
  const [index, setIndex] = useState(0);
  const sc = SCENARIOS[index];
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Partial<Record<Row, string>>>({});
  const [edgeState, setEdgeState] = useState("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ tone: Tone; msg: Bi } | null>(null);

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
    try {
      const out = await sc.run({
        L, on, tr,
        log: (tag, cls, msg) => setLog((l) => [...l, { tag, cls, msg }]),
        row: (id, state) => setRows((r) => ({ ...r, [id]: state })),
        edge: setEdgeState,
      });
      setResult({ tone: out.tone, msg: out.msg });
    } finally {
      setBusy(false);
    }
  }

  const [p1, p2] = sc.prefixes(on);
  const accel = index === 1 || index === 4;

  return (
    <div className="stage s3x">
      <div className="s3x-row" role="group" aria-label={tr({ vi: "Tình huống", en: "Scenario" })}>
        {SCENARIOS.map((s, i) => (
          <button key={s.name.vi} className="chip" aria-pressed={i === index} disabled={busy && i !== index} onClick={() => pick(i)}>{tr(s.name)}</button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="s3x-req">{tr(sc.request(on))}</code>
        <label className="s3x-toggle">
          <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(); }} />
          {tr(sc.toggle)}
        </label>
        <button className="btn primary" onClick={go} disabled={busy}>{tr({ vi: "Chạy", en: "Run" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 225" role="img" aria-label={tr({ vi: "Dữ liệu được truyền từ nguồn qua Internet hoặc edge location tới các prefix trong bucket S3", en: "Data travels from the source over the internet or through an edge location to prefixes in the S3 bucket" })}>
          <path className={`s3x-wire${accel && on ? " dash" : ""}`} d={`M170 125 H540 V95 H600 M540 125 V167 H600`} />
          <text className="s3x-m" x={355} y={145} textAnchor="middle">Internet</text>
          {accel && (
            <>
              <path className={`s3x-wire${on ? "" : " dash"}`} d={`M170 125 L225 ${EDGE[1]} M375 ${EDGE[1]} H540`} />
              <text className="s3x-m edge" x={458} y={EDGE[1] - 8} textAnchor="middle">{tr({ vi: "mạng AWS", en: "AWS network" })}</text>
              <g className={`s3x-node ${on || index === 4 ? edgeState || "on" : "off"}`}>
                <rect x={EDGE[0] - 75} y={EDGE[1] - 22} width={150} height={44} rx={8} />
                <text className="s3x-t" x={EDGE[0]} y={EDGE[1] - 3} textAnchor="middle">Edge location</text>
                <text className="s3x-s" x={EDGE[0]} y={EDGE[1] + 13} textAnchor="middle">{tr({ vi: "gần Frankfurt", en: "near Frankfurt" })}</text>
              </g>
            </>
          )}
          <g className="s3x-node on">
            <rect x={SRC[0] - 75} y={SRC[1] - 26} width={150} height={52} rx={8} />
            <text className="s3x-t" x={SRC[0]} y={SRC[1] - 3} textAnchor="middle">{tr(sc.src)}</text>
            <text className="s3x-s" x={SRC[0]} y={SRC[1] + 14} textAnchor="middle">{index === 3 ? tr({ vi: "đọc dữ liệu", en: "reads data" }) : tr({ vi: "gửi dữ liệu", en: "sends data" })}</text>
          </g>
          <rect className="s3x-box" x={555} y={30} width={255} height={205} rx={12} />
          <text className="s3x-m" x={568} y={226}>bucket mftech-media · Singapore</text>
          {(["r1", "r2"] as Row[]).map((r) => {
            const p = r === "r1" ? p1 : p2;
            return (
              <g key={r} className={`s3x-node ${p ? rows[r] ?? "" : "off"}`}>
                <rect x={ROW[r][0]} y={ROW[r][1] - 24} width={195} height={48} rx={7} />
                <text className="s3x-t" x={ROW[r][0] + 97} y={ROW[r][1] - 4} textAnchor="middle">{p ?? tr({ vi: "(chưa sử dụng)", en: "(unused)" })}</text>
                <text className="s3x-s" x={ROW[r][0] + 97} y={ROW[r][1] + 13} textAnchor="middle">{tr({ vi: "prefix · ~3.500 PUT/giây", en: "prefix · ~3,500 PUT/s" })}</text>
              </g>
            );
          })}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 && !result ? (
          <p className="s3x-hint">{tr({ vi: <>Chọn tình huống và nhấn <b>Chạy</b>. Sau đó bật tính năng tương ứng và chạy lại để so sánh kết quả.</>, en: <>Choose a scenario and press <b>Run</b>. Then turn on the matching feature and run again to compare the results.</> })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) => (
              <li key={i}>
                <span className={`tag ${e.cls}`}>{typeof e.tag === "string" ? e.tag : tr(e.tag)}</span>
                <span>{rich(tr(e.msg))}</span>
              </li>
            ))}
            {result && <li className={`s3x-result ${result.tone}`}>{rich(tr(result.msg))}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
