import { useEffect, useRef, useState, type ReactNode } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./kinesis-sims.css";

// Build a streaming pipeline for one ShopViet need: pick a service for every stage,
// press run and a record walks through. The first stage that does not fit stops it
// and says why. Covers Kinesis Data Streams, Data Firehose, Managed Service for Apache
// Flink (Kinesis Data Analytics), OpenSearch + QuickSight, DMS from S3, Lambda vs
// Fargate for long jobs, and Amazon MSK for teams already on Kafka.

interface Opt { l1: string; l2?: string; ok: boolean; why: string }
interface Slot { name: string; opts: Opt[] }
interface Need { name: string; about: string; source: [string, string]; slots: Slot[]; result: string }

const KDS = (why: string): Opt => ({ l1: "Kinesis Data Streams", ok: true, why });

const NEEDS: Need[] = [
  {
    name: "Gợi ý theo từng click",
    about: "Mỗi click trên web phải được phân tích ngay để gợi ý sản phẩm, không mất click nào khi tải tăng vọt, và lưu lại vào S3.",
    source: ["Web ShopViet", "click"],
    slots: [
      { name: "Thu dữ liệu", opts: [
        KDS("Nhận hàng nghìn click mỗi giây, giữ dữ liệu để đọc lại nếu bước sau lỗi."),
        { l1: "EC2 ghi vào Aurora", l2: "như hiện tại", ok: false, why: "Server và database là điểm nghẽn; tải tăng vọt là mất click." },
        { l1: "SQS + EC2", l2: "thư viện tự viết", ok: false, why: "Phải tự viết phần phân tích trên EC2; SQS không có công cụ phân tích stream." },
      ] },
      { name: "Phân tích", opts: [
        { l1: "Managed Service for", l2: "Apache Flink (SQL)", ok: true, why: "Tên cũ là Kinesis Data Analytics: chạy truy vấn liên tục trên dữ liệu đang chảy." },
        { l1: "Amazon QuickSight", ok: false, why: "QuickSight vẽ dashboard, không chạy truy vấn liên tục trên stream." },
        { l1: "Amazon Athena", ok: false, why: "Athena truy vấn file đã nằm trong S3, không phải dữ liệu đang chảy." },
      ] },
      { name: "Lưu lại", opts: [
        { l1: "Amazon Data Firehose", l2: "→ S3", ok: true, why: "Firehose gom kết quả theo lô rồi ghi vào S3, không cần code." },
        { l1: "Lambda tự ghi file", ok: false, why: "Chạy được nhưng phải tự gom, tự retry, tự đặt tên file." },
      ] },
    ],
    result: "Kinesis Data Streams nhận, Flink (Kinesis Data Analytics) phân tích bằng SQL, Firehose lưu vào S3. Không có server nào phải quản lý.",
  },
  {
    name: "Vị trí shipper qua REST API",
    about: "App của shipper gửi vị trí liên tục qua một REST API. Đội vận hành cần xem phân tích theo thời gian thực.",
    source: ["App shipper", "gửi vị trí"],
    slots: [
      { name: "Cổng vào", opts: [
        { l1: "Amazon API Gateway", l2: "→ Kinesis", ok: true, why: "REST API nhận vị trí rồi ghi thẳng vào stream." },
        { l1: "Amazon Athena", l2: "+ S3", ok: false, why: "Athena không nhận dữ liệu qua REST và không chạy thời gian thực." },
      ] },
      { name: "Phân tích", opts: [
        { l1: "Kinesis Data Analytics", l2: "(Apache Flink)", ok: true, why: "Tính quãng đường, tốc độ, xe đứng yên… ngay khi dữ liệu tới." },
        { l1: "Redshift", l2: "+ QuickSight", ok: false, why: "Hợp báo cáo, nhưng dữ liệu phải nạp vào kho trước, không theo thời gian thực." },
      ] },
    ],
    result: "API Gateway làm cổng REST, Kinesis Data Analytics phân tích vị trí ngay khi tới.",
  },
  {
    name: "Tìm giao dịch tức thì",
    about: "Bộ phận chăm sóc khách cần tìm kiếm full-text trên giao dịch vừa xảy ra và xem dashboard tương tác.",
    source: ["Cổng thanh toán", "giao dịch"],
    slots: [
      { name: "Thu dữ liệu", opts: [
        KDS("Nhận stream giao dịch với độ trễ thấp."),
        { l1: "EC2 tự viết", ok: false, why: "Phải tự lo scale và vận hành." },
      ] },
      { name: "Tìm kiếm", opts: [
        { l1: "Amazon OpenSearch", l2: "Service", ok: true, why: "Đánh chỉ mục, tìm full-text gần như ngay khi dữ liệu tới." },
        { l1: "Amazon DynamoDB", ok: false, why: "Không có tìm kiếm full-text." },
        { l1: "Amazon Redshift", ok: false, why: "Kho dữ liệu để phân tích, không làm tìm kiếm full-text tức thì." },
      ] },
      { name: "Dashboard", opts: [
        { l1: "Amazon QuickSight", ok: true, why: "Dashboard tương tác cho người dùng nghiệp vụ." },
        { l1: "CloudWatch dashboard", ok: false, why: "Dành cho metric vận hành, không phải dashboard nghiệp vụ." },
      ] },
    ],
    result: "Kinesis Data Streams → OpenSearch Service để tìm kiếm → QuickSight để vẽ dashboard.",
  },
  {
    name: "Đưa log cũ trong S3 vào stream",
    about: "Log nhiều năm nằm trong S3, và file mới vẫn được ghi thêm. Cần đẩy cả dữ liệu cũ lẫn phần mới vào Kinesis, nhanh nhất có thể.",
    source: ["S3", "log cũ + file mới"],
    slots: [
      { name: "Cầu nối", opts: [
        { l1: "AWS DMS", l2: "nguồn S3, đích Kinesis", ok: true, why: "DMS đọc S3 làm nguồn, ghi vào Kinesis Data Streams làm đích, cả dữ liệu có sẵn lẫn thay đổi mới. Không viết code." },
        { l1: "S3 event → Lambda", ok: false, why: "Chỉ bắt file mới tạo; dữ liệu cũ không được đẩy, và phải viết code." },
        { l1: "S3 → SNS", ok: false, why: "SNS không giao thẳng vào Kinesis Data Streams." },
      ] },
      { name: "Đích", opts: [KDS("Các app phân tích đọc từ đây như mọi stream khác.")] },
    ],
    result: "AWS DMS làm cầu nối S3 → Kinesis Data Streams, không phải viết và duy trì code mới.",
  },
  {
    name: "Che thông tin thẻ rồi lưu",
    about: "Hàng trăm nghìn giao dịch mỗi giờ. Nhiều app nội bộ cần đọc giao dịch gốc; bản đã xoá thông tin nhạy cảm thì lưu vào database dạng document để tra nhanh.",
    source: ["Web ShopViet", "giao dịch"],
    slots: [
      { name: "Thu dữ liệu", opts: [
        KDS("Nhiều app nội bộ cùng đọc stream giao dịch gốc."),
        { l1: "Amazon Data Firehose", ok: false, why: "App không đọc được dữ liệu từ Firehose; Firehose chỉ giao tới đích như S3, Redshift, OpenSearch." },
        { l1: "File S3 theo lô", ok: false, why: "Theo lô, không gần thời gian thực." },
      ] },
      { name: "Xử lý", opts: [
        { l1: "AWS Lambda", ok: true, why: "Lambda đọc stream theo batch, xoá số thẻ và số điện thoại trong từng giao dịch." },
        { l1: "Rule trong DynamoDB", ok: false, why: "DynamoDB không có rule nào tự sửa dữ liệu khi ghi." },
      ] },
      { name: "Lưu", opts: [
        { l1: "Amazon DynamoDB", ok: true, why: "Database dạng document, đọc với độ trễ thấp." },
        { l1: "File trong S3", ok: false, why: "Không tra nhanh được từng giao dịch." },
      ] },
    ],
    result: "Kinesis Data Streams cho nhiều app cùng đọc bản gốc; Lambda làm sạch rồi ghi DynamoDB.",
  },
  {
    name: "Mỗi lô cần xử lý 30 phút",
    about: "Dữ liệu cảm biến kho đổ về liên tục, mỗi lô cần một job chạy khoảng 30 phút. Cần serverless và scale theo lượng dữ liệu.",
    source: ["Cảm biến kho", "dữ liệu liên tục"],
    slots: [
      { name: "Thu dữ liệu", opts: [
        KDS("Nhận dữ liệu liên tục, giữ lại cho bước xử lý đọc."),
        { l1: "AWS DMS", ok: false, why: "DMS chuyển dữ liệu giữa các kho dữ liệu, không phải cổng nhận stream từ thiết bị." },
      ] },
      { name: "Xử lý", opts: [
        { l1: "ECS trên Fargate", ok: true, why: "Container serverless, chạy bao lâu cũng được, scale theo số task." },
        { l1: "Lambda + Step Functions", ok: false, why: "Mỗi lần chạy Lambda tối đa 15 phút; job 30 phút không vừa." },
        { l1: "EC2 Auto Scaling", ok: false, why: "Chạy được nhưng phải quản lý server, không phải serverless." },
      ] },
    ],
    result: "Kinesis Data Streams nhận dữ liệu, ECS task trên Fargate chạy job dài mà không có server để quản lý.",
  },
  {
    name: "Đội đã viết app cho Kafka",
    about: "Đội phân tích đã có producer và consumer viết cho Apache Kafka. Muốn lên AWS, giữ nguyên code, không tự vận hành cluster.",
    source: ["App ShopViet", "Kafka producer"],
    slots: [
      { name: "Nền tảng stream", opts: [
        { l1: "Amazon MSK", l2: "Kafka do AWS quản lý", ok: true, why: "App giữ nguyên Kafka API; AWS lo broker, vá lỗi và thay máy hỏng." },
        { l1: "Kafka tự dựng", l2: "trên EC2", ok: false, why: "Phải tự vá, tự theo dõi, tự scale cluster bằng script." },
        { l1: "Kinesis Data Streams", ok: false, why: "Dùng tốt, nhưng phải viết lại producer và consumer theo API của Kinesis." },
      ] },
    ],
    result: "Đã dùng Kafka thì Amazon MSK. Viết mới từ đầu và muốn ít vận hành nhất thì Kinesis Data Streams.",
  },
];

const NODE_W = 168;
const Y = 100;
const xs = (n: number) => {
  const gap = (800 - 120 - NODE_W / 2) / n;
  return Array.from({ length: n }, (_, i) => 120 + gap * (i + 1));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Option order on screen: rotated per stage so the fitting choice is not always first. */
const shown = (n: number, by: number) => Array.from({ length: n }, (_, i) => (i + by) % n);

type State = "pass" | "block";
type LogLine = { state?: State; slot?: string; ok?: boolean; msg: ReactNode };

export default function StreamPipelineSim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const [ni, setNi] = useState(0);
  const need = NEEDS[ni];
  const [choice, setChoice] = useState<number[]>(() => need.slots.map(() => -1));
  const [lit, setLit] = useState<Record<number, State>>({});
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const X = xs(need.slots.length);
  const ready = choice.every((c) => c >= 0);

  function reset() {
    setLit({});
    setLog([]);
  }

  function pickNeed(i: number) {
    if (busy) return;
    setNi(i);
    setChoice(NEEDS[i].slots.map(() => -1));
    reset();
  }

  function choose(slot: number, opt: number) {
    if (busy) return;
    setChoice((c) => c.map((v, i) => (i === slot ? opt : v)));
    reset();
  }

  async function run() {
    const layer = fx.current;
    if (!layer || busy || !ready) return;
    setBusy(true);
    reset();
    const fast = prefersReducedMotion();
    let at: Pt = [60, Y];
    for (let i = 0; i < need.slots.length; i++) {
      if (!alive.current) return;
      const opt = need.slots[i].opts[choice[i]];
      const next: Pt = [X[i] - NODE_W / 2, Y];
      if (!fast) await travel(layer, [at, next], 420, opt.ok ? "pkt" : "pkt-bad");
      at = [X[i] + NODE_W / 2, Y];
      setLit((s) => ({ ...s, [i]: opt.ok ? "pass" : "block" }));
      setLog((l) => [...l, { state: opt.ok ? "pass" : "block", slot: need.slots[i].name, msg: rich(`**${[opt.l1, opt.l2].filter(Boolean).join(" ")}**: ${opt.why}`) }]);
      if (!opt.ok) {
        flashText(layer, X[i], Y + 46, "không hợp", "flash-bad", 900);
        if (!fast) await travel(layer, [next, [60, Y]], 500, "pkt-bad");
        setLog((l) => [...l, { ok: false, msg: rich(`Dừng ở bước **${need.slots[i].name}**. Đổi lựa chọn rồi chạy lại.`) }]);
        setBusy(false);
        return;
      }
      await sleep(fast ? 0 : 120);
    }
    setLog((l) => [...l, { ok: true, msg: rich(need.result) }]);
    setBusy(false);
  }

  return (
    <div className="stage kpb">
      <div className="kpb-row" role="group" aria-label="Nhu cầu của ShopViet">
        {NEEDS.map((n, i) => (
          <button key={n.name} className="chip" aria-pressed={i === ni} onClick={() => pickNeed(i)} disabled={busy && i !== ni}>{n.name}</button>
        ))}
      </div>
      <p className="kpb-about">{need.about}</p>
      {need.slots.map((s, si) => (
        <div key={s.name} className="stage-bar kpb-slot" role="group" aria-label={s.name}>
          <span className="label">{si + 1} · {s.name}</span>
          {shown(s.opts.length, si + ni).map((oi) => {
            const o = s.opts[oi];
            return (
              <button key={o.l1} className="btn" aria-pressed={choice[si] === oi} disabled={busy} onClick={() => choose(si, oi)}>
                {[o.l1, o.l2].filter(Boolean).join(" ")}
              </button>
            );
          })}
        </div>
      ))}
      <div className="stage-bar">
        <span className="kpb-note">{ready ? "Đã chọn đủ các bước." : "Chọn một dịch vụ cho mỗi bước."}</span>
        <button className="btn primary" onClick={run} disabled={busy || !ready}>Chạy thử</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 40 820 120" role="img" aria-label={`Pipeline: ${need.source[0]} rồi ${need.slots.map((s) => s.name).join(", ")}`}>
          <path className="kss-link" d={`M60 ${Y} H${X[X.length - 1]}`} />
          <g className="kss-src">
            <rect x={10} y={Y - 26} width={110} height={52} rx={8} />
            <text className="kss-l1" x={65} y={Y - 3} textAnchor="middle">{need.source[0]}</text>
            <text className="kss-l2" x={65} y={Y + 13} textAnchor="middle">{need.source[1]}</text>
          </g>
          {need.slots.map((s, i) => {
            const o = choice[i] >= 0 ? s.opts[choice[i]] : undefined;
            return (
              <g key={s.name} className={`kpb-node ${lit[i] ?? ""}` + (o ? "" : " empty")}>
                <text className="kss-l2" x={X[i]} y={Y - 34} textAnchor="middle">{s.name}</text>
                <rect x={X[i] - NODE_W / 2} y={Y - 26} width={NODE_W} height={52} rx={8} />
                <text className="kss-l1" x={X[i]} y={o?.l2 ? Y - 3 : Y + 4} textAnchor="middle">{o ? o.l1 : "?"}</text>
                {o?.l2 && <text className="kss-l2" x={X[i]} y={Y + 13} textAnchor="middle">{o.l2}</text>}
              </g>
            );
          })}
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="kss-hint">Chọn dịch vụ cho từng bước rồi bấm <b>Chạy thử</b>.</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.state === undefined ? (
                <li key={i} className={`kss-result ${e.ok ? "ok" : "bad"}`}>{e.msg}</li>
              ) : (
                <li key={i}>
                  <span className={`tag kss-tag ${e.state === "pass" ? "hit" : "bad"}`}>{e.state === "pass" ? "HỢP" : "KHÔNG HỢP"}</span>
                  <span><b>{e.slot}:</b> {e.msg}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
