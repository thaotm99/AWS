import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./migration-sims.css";

// ShopViet moves the old warehouse NAS to AWS. Pick how much data, which link and which
// destination, then race the two ways in: online with AWS DataSync, or shipping Snowball
// Edge devices. Days are rough estimates (80% link utilisation, ~10 days per Snowball round).
// Source questions: exam3_q3, exam2_q11, exam5_q48, exam5_q5, exam2_q41, exam3_q61, exam2_q4, exam5_q62, exam4_q29.

const SIZES = [10, 50, 100, 200, 500, 1000, 2000, 5000]; // TB
const LINKS = [
  { id: "net100", name: "Internet 100 Mbps", bps: 100e6, dx: false },
  { id: "net1g", name: "Internet 1 Gbps", bps: 1e9, dx: false },
  { id: "dx10", name: "Direct Connect 10 Gbps", bps: 10e9, dx: true },
] as const;
type Target = "s3" | "efs" | "lustre" | "gda";
const TARGETS: { id: Target; name: string; label: string }[] = [
  { id: "s3", name: "S3", label: "Amazon S3" },
  { id: "efs", name: "Amazon EFS", label: "Amazon EFS" },
  { id: "lustre", name: "FSx for Lustre", label: "FSx for Lustre" },
  { id: "gda", name: "Glacier Deep Archive", label: "S3 Glacier Deep Archive" },
];
const DEVICE_TB = 80;

const fmtSize = (tb: number) => (tb >= 1000 ? `${tb / 1000} PB` : `${tb} TB`);
const fmtDays = (d: number) => (d < 1 ? `${Math.max(1, Math.round(d * 24))} giờ` : d < 730 ? `${Math.round(d)} ngày` : `${(d / 365).toFixed(1)} năm`);

const SRC_X = 160;
const AWS_X = 640;
const L1 = 92;
const L2 = 190;
const AGENT: Pt = [250, L1];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

type LogEntry = { tag: string; cls: string; msg: ReactNode };

export default function TransferPlannerSim() {
  const pk = useRef<SVGGElement>(null);
  const [sizeIx, setSizeIx] = useState(1);
  const [linkIx, setLinkIx] = useState(1);
  const [target, setTarget] = useState<Target>("s3");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [lit, setLit] = useState<{ net?: string; snow?: string; aws?: string }>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<ReactNode>(null);

  const tb = SIZES[sizeIx];
  const link = LINKS[linkIx];
  const onlineDays = (tb * 8e12) / (link.bps * 0.8) / 86400;
  const devices = Math.ceil(tb / DEVICE_TB);
  const snowDays = 10 + 2 * Math.floor((devices - 1) / 10);
  const onlineWins = onlineDays <= snowDays;
  const tgt = TARGETS.find((t) => t.id === target)!;

  function reset() {
    setDone(false);
    setLit({});
    setLog([]);
    setResult(null);
  }

  const add = (tag: string, cls: string, msg: string) => setLog((l) => [...l, { tag, cls, msg: rich(msg) }]);

  async function start() {
    const L = pk.current;
    if (!L || busy) return;
    setBusy(true);
    reset();
    const max = Math.max(onlineDays, snowDays);
    const dur = (d: number) => 900 + 2600 * Math.min(1, d / max);
    const onlineMs = dur(onlineDays);
    const snowMs = dur(snowDays);
    const online = (async () => {
      const n = 5;
      const each = 650;
      const gap = Math.max(60, (onlineMs - each) / (n - 1));
      await travel(L, [[SRC_X, L1], [AGENT[0] - 60, L1]], 300, "pkt");
      await Promise.all(Array.from({ length: n }, async (_, i) => {
        await wait(i * gap);
        await travel(L, [[AGENT[0] + 60, L1], [AWS_X, L1]], each, "pkt");
      }));
      setLit((s) => ({ ...s, net: onlineWins ? "ok" : "warn" }));
    })();
    const snow = (async () => {
      flashText(L, 250, L2 - 22, devices > 1 ? `${devices} thiết bị Snowball` : "1 thiết bị Snowball", "mgx-flash-edge", 900);
      await travel(L, [[SRC_X, L2], [AWS_X, L2]], snowMs, "pkt-edge", 9);
      setLit((s) => ({ ...s, snow: onlineWins ? "warn" : "ok" }));
    })();
    await Promise.all([online, snow]);
    setLit((s) => ({ ...s, aws: "ok" }));
    flashText(L, 720, 42, "đã tới AWS", "mgx-flash-ok", 1000);

    add("MẠNG", onlineWins ? "hit" : "info", `**DataSync** qua ${link.name}: khoảng **${fmtDays(onlineDays)}** cho ${fmtSize(tb)}.${link.dx ? " Agent gửi qua Direct Connect tới **interface VPC endpoint** (PrivateLink), không đi ra Internet." : ""}`);
    add("SNOW", onlineWins ? "info" : "hit", `**Snowball Edge**: ${devices} thiết bị (khoảng ${DEVICE_TB} TB mỗi máy), khoảng **${snowDays} ngày** cả nạp dữ liệu và vận chuyển.`);
    const notes: Record<Target, string> = {
      s3: onlineWins ? "DataSync ghi thẳng vào bucket S3, có kiểm tra toàn vẹn và lên lịch chạy được." : "Snowball nhập dữ liệu vào bucket S3 khi thiết bị về tới AWS.",
      efs: onlineWins ? "DataSync ghi thẳng vào **EFS**." : "Snowball chỉ nhập vào **S3**. Muốn vào EFS phải chép tiếp từ S3 sang bằng DataSync.",
      lustre: onlineWins ? "DataSync ghi được vào FSx for Lustre." : "Snowball nhập vào **S3**, rồi tạo **FSx for Lustre** liên kết với bucket đó để HPC đọc với độ trễ dưới mili giây.",
      gda: onlineWins ? "DataSync chọn được storage class **Glacier Deep Archive** khi ghi vào S3." : "Snowball không ghi thẳng vào Glacier Deep Archive. Nhập vào S3, rồi đặt **lifecycle rule 0 ngày** để chuyển sang Deep Archive ngay.",
    };
    add("ĐÍCH", "miss", notes[target]);
    setResult(rich(onlineWins
      ? `Đường mạng đủ nhanh: dùng **AWS DataSync**. Chuyển xong mà ứng dụng ở kho vẫn cần đọc ghi tiếp thì đặt thêm **S3 File Gateway**.`
      : `Đường mạng quá chậm cho ${fmtSize(tb)}: gửi **Snowball Edge** nhanh và rẻ hơn. Phần thay đổi phát sinh sau đó có thể đồng bộ bằng DataSync.`));
    setDone(true);
    setBusy(false);
  }

  return (
    <div className="stage mgx">
      <div className="mgx-row">
        <span className="mgx-lbl">Dữ liệu</span>
        <label className="mgx-size">
          <input type="range" min={0} max={SIZES.length - 1} value={sizeIx} disabled={busy} aria-label="Dung lượng cần chuyển"
            onChange={(e) => { setSizeIx(Number(e.target.value)); reset(); }} />
          <b>{fmtSize(tb)}</b>
        </label>
      </div>
      <div className="mgx-row" role="group" aria-label="Đường truyền">
        <span className="mgx-lbl">Đường truyền</span>
        {LINKS.map((l, i) => (
          <button key={l.id} className="chip" aria-pressed={i === linkIx} disabled={busy} onClick={() => { setLinkIx(i); reset(); }}>{l.name}</button>
        ))}
      </div>
      <div className="mgx-row" role="group" aria-label="Đích">
        <span className="mgx-lbl">Đích</span>
        {TARGETS.map((t) => (
          <button key={t.id} className="chip" aria-pressed={t.id === target} disabled={busy} onClick={() => { setTarget(t.id); reset(); }}>{t.name}</button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="mgx-hint">Hai cách chạy đua: qua mạng và gửi thiết bị.</span>
        <button className="btn primary" onClick={start} disabled={busy}>Bắt đầu chuyển</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 220" role="img" aria-label="Dữ liệu từ kho đi lên AWS theo hai đường: qua mạng bằng DataSync và gửi thiết bị Snowball">
          <path className="mgx-wire" d={`M${SRC_X} ${L1} H${AGENT[0] - 60} M${AGENT[0] + 60} ${L1} H${AWS_X}`} />
          <path className="mgx-road" d={`M${SRC_X} ${L2} H${AWS_X}`} />
          <g className="mgx-node on">
            <rect x={20} y={50} width={140} height={170} rx={10} />
            <text className="mgx-t" x={90} y={128} textAnchor="middle">Kho ShopViet</text>
            <text className="mgx-s" x={90} y={146} textAnchor="middle">NAS cũ · {fmtSize(tb)}</text>
          </g>
          <g className={`mgx-node ${lit.net ?? ""}`}>
            <rect x={AGENT[0] - 60} y={L1 - 22} width={120} height={44} rx={8} />
            <text className="mgx-t" x={AGENT[0]} y={L1 - 3} textAnchor="middle">DataSync agent</text>
            <text className="mgx-s" x={AGENT[0]} y={L1 + 13} textAnchor="middle">tại kho</text>
          </g>
          <text className="mgx-m" x={470} y={L1 - 10} textAnchor="middle">{link.name}{link.dx ? " → VPC endpoint" : ""}</text>
          <text className="mgx-m" x={400} y={L2 - 12} textAnchor="middle">Snowball Edge · vận chuyển</text>
          {done && (
            <>
              <text className={`mgx-days ${onlineWins ? "win" : "lose"}`} x={470} y={L1 + 24} textAnchor="middle">≈ {fmtDays(onlineDays)}</text>
              <text className={`mgx-days ${onlineWins ? "lose" : "win"}`} x={400} y={L2 + 28} textAnchor="middle">≈ {snowDays} ngày · {devices} máy</text>
            </>
          )}
          <g className={`mgx-node ${lit.aws ?? ""}`}>
            <rect x={AWS_X} y={50} width={170} height={170} rx={10} />
            <text className="mgx-t" x={AWS_X + 85} y={78} textAnchor="middle">AWS</text>
            <text className="mgx-t" x={AWS_X + 85} y={135} textAnchor="middle">{tgt.label.length > 18 ? "S3 Glacier" : tgt.label}</text>
            <text className="mgx-s" x={AWS_X + 85} y={151} textAnchor="middle">{tgt.label.length > 18 ? "Deep Archive" : "đích"}</text>
          </g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="mgx-hint">Kéo dung lượng, chọn đường truyền và nơi nhận, rồi bấm <b>Bắt đầu chuyển</b>. Thử 10 TB với 1 Gbps, rồi 2 PB với 100 Mbps.</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) => (
              <li key={i}><span className={`tag ${e.cls}`}>{e.tag}</span><span>{e.msg}</span></li>
            ))}
            {result && <li className="mgx-result ok">{result}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
