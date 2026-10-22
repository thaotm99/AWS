import { useEffect, useRef, useState, type ReactNode } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./kinesis-sims.css";

// Build a streaming pipeline for one ShopViet need: pick a service for every stage,
// press run and a record walks through. The first stage that does not fit stops it
// and says why. Covers Kinesis Data Streams, Data Firehose, Managed Service for Apache
// Flink, OpenSearch + Amazon Quick Sight, DMS from S3, Lambda vs
// Fargate for long jobs, and Amazon MSK for teams already on Kafka.

interface Opt { l1: string; l2?: string; ok: boolean; why: string }
interface Slot { name: string; opts: Opt[] }
interface Need { name: string; about: string; source: [string, string]; slots: Slot[]; result: string }

const KDS = (why: string): Opt => ({ l1: "Kinesis Data Streams", ok: true, why });

const NEEDS: Need[] = [
  {
    name: "Gợi ý sản phẩm theo từng click",
    about: "Mỗi click trên web phải được phân tích ngay để gợi ý sản phẩm, không được mất click khi tải tăng đột biến, và kết quả được lưu vào S3.",
    source: ["Web ShopViet", "click"],
    slots: [
      { name: "Thu thập", opts: [
        KDS("Tiếp nhận hàng nghìn click mỗi giây, lưu giữ dữ liệu để đọc lại khi bước tiếp theo gặp lỗi."),
        { l1: "EC2 ghi vào Aurora", l2: "kiến trúc hiện tại", ok: false, why: "Máy chủ và database là điểm nghẽn; khi tải tăng đột biến, click bị mất." },
        { l1: "SQS + EC2", l2: "thư viện tự phát triển", ok: false, why: "Phần phân tích trên EC2 phải tự phát triển; SQS không cung cấp công cụ phân tích stream." },
      ] },
      { name: "Phân tích", opts: [
        { l1: "Managed Service for", l2: "Apache Flink (SQL)", ok: true, why: "Tên cũ là Kinesis Data Analytics for Apache Flink: xử lý liên tục trên luồng dữ liệu, hỗ trợ SQL qua Flink Studio hoặc Table API." },
        { l1: "Amazon Quick Sight", ok: false, why: "Quick Sight (trước đây là QuickSight) dùng để trực quan hoá dữ liệu và xây dựng dashboard, không phải bộ máy xử lý liên tục trên stream." },
        { l1: "Amazon Athena", ok: false, why: "Athena truy vấn file đã lưu trong S3, không áp dụng cho luồng dữ liệu đang truyền." },
      ] },
      { name: "Lưu trữ", opts: [
        { l1: "Amazon Data Firehose", l2: "→ S3", ok: true, why: "Firehose gộp kết quả theo batch và ghi vào S3, không cần viết mã." },
        { l1: "Lambda tự ghi file", ok: false, why: "Phương án hoạt động được nhưng phải tự xử lý gộp dữ liệu, retry và đặt tên file." },
      ] },
    ],
    result: "Kinesis Data Streams tiếp nhận, Managed Service for Apache Flink phân tích (có thể bằng SQL), Firehose lưu vào S3. Không có máy chủ cần quản lý.",
  },
  {
    name: "Thu thập vị trí shipper qua REST API",
    about: "Ứng dụng của shipper gửi vị trí liên tục qua một REST API. Đội vận hành cần phân tích dữ liệu theo thời gian thực.",
    source: ["Ứng dụng shipper", "gửi vị trí"],
    slots: [
      { name: "Điểm tiếp nhận", opts: [
        { l1: "Amazon API Gateway", l2: "→ Kinesis", ok: true, why: "API Gateway tích hợp trực tiếp với dịch vụ AWS, tiếp nhận vị trí và ghi vào stream (ví dụ HTTP API với integration Kinesis-PutRecord)." },
        { l1: "Amazon Athena", l2: "+ S3", ok: false, why: "Athena không tiếp nhận dữ liệu qua REST và không xử lý theo thời gian thực." },
      ] },
      { name: "Phân tích", opts: [
        { l1: "Managed Service", l2: "for Apache Flink", ok: true, why: "Tính quãng đường, tốc độ, phương tiện đứng yên… ngay khi dữ liệu được tiếp nhận." },
        { l1: "Redshift", l2: "+ Quick Sight", ok: false, why: "Data warehouse và dashboard phục vụ truy vấn phân tích, báo cáo; tính toán liên tục trên từng sự kiện vị trí là chức năng của Managed Service for Apache Flink." },
      ] },
    ],
    result: "API Gateway đóng vai trò điểm tiếp nhận REST, Managed Service for Apache Flink phân tích vị trí ngay khi dữ liệu được tiếp nhận.",
  },
  {
    name: "Tìm kiếm giao dịch tức thời",
    about: "Bộ phận chăm sóc khách hàng cần tìm kiếm full-text trên các giao dịch vừa phát sinh và sử dụng dashboard tương tác.",
    source: ["Cổng thanh toán", "giao dịch"],
    slots: [
      { name: "Thu thập", opts: [
        KDS("Tiếp nhận luồng giao dịch với độ trễ thấp."),
        { l1: "Ứng dụng trên EC2", ok: false, why: "Phải tự xử lý việc scale và vận hành." },
      ] },
      { name: "Tìm kiếm", opts: [
        { l1: "Amazon OpenSearch", l2: "Service", ok: true, why: "Đánh chỉ mục và tìm kiếm full-text gần như ngay khi dữ liệu được tiếp nhận." },
        { l1: "Amazon DynamoDB", ok: false, why: "Để tìm kiếm full-text trên dữ liệu DynamoDB, AWS cung cấp zero-ETL integration đưa dữ liệu sang OpenSearch Service; tìm kiếm là chức năng của OpenSearch." },
        { l1: "Amazon Redshift", ok: false, why: "Data warehouse phục vụ truy vấn phân tích; tìm kiếm full-text là chức năng của OpenSearch Service." },
      ] },
      { name: "Dashboard", opts: [
        { l1: "Amazon Quick Sight", ok: true, why: "Trực quan hoá dữ liệu, dashboard tương tác cho người dùng nghiệp vụ (trước đây là Amazon QuickSight)." },
        { l1: "CloudWatch dashboard", ok: false, why: "Dành cho metric vận hành, không phải dashboard nghiệp vụ." },
      ] },
    ],
    result: "Kinesis Data Streams → OpenSearch Service cho tìm kiếm → Amazon Quick Sight cho dashboard.",
  },
  {
    name: "Chuyển log lịch sử trong S3 vào stream",
    about: "Log nhiều năm được lưu trong S3; thay đổi mới được ghi thành file CDC trong thư mục riêng. Cần chuyển cả dữ liệu lịch sử lẫn dữ liệu mới vào Kinesis trong thời gian ngắn nhất.",
    source: ["S3", "log cũ + file CDC"],
    slots: [
      { name: "Chuyển dữ liệu", opts: [
        { l1: "AWS DMS", l2: "nguồn S3, đích Kinesis", ok: true, why: "DMS hỗ trợ S3 làm nguồn và Kinesis Data Streams làm đích. Full load chuyển các file đã có trong bucket; thay đổi mới được chuyển khi được tải lên dưới dạng file CDC theo định dạng của DMS (CDC00001.csv, CDC00002.csv… theo thứ tự). Không cần viết mã." },
        { l1: "S3 event → Lambda", ok: false, why: "Chỉ xử lý file mới được tạo; dữ liệu lịch sử không được chuyển, đồng thời phải viết mã." },
        { l1: "S3 → SNS", ok: false, why: "SNS không phân phối trực tiếp vào Kinesis Data Streams." },
      ] },
      { name: "Đích", opts: [KDS("Các ứng dụng phân tích đọc dữ liệu từ stream này như mọi stream khác.")] },
    ],
    result: "AWS DMS chuyển dữ liệu S3 → Kinesis Data Streams (full load + file CDC), không cần phát triển và duy trì mã nguồn mới.",
  },
  {
    name: "Ẩn thông tin thẻ trước khi lưu trữ",
    about: "Hệ thống phát sinh hàng trăm nghìn giao dịch mỗi giờ. Nhiều ứng dụng nội bộ cần đọc giao dịch gốc; bản đã loại bỏ thông tin nhạy cảm được lưu vào document database để truy vấn với độ trễ thấp.",
    source: ["Web ShopViet", "giao dịch"],
    slots: [
      { name: "Thu thập", opts: [
        KDS("Nhiều ứng dụng nội bộ cùng đọc luồng giao dịch gốc."),
        { l1: "Amazon Data Firehose", ok: false, why: "Firehose phân phối dữ liệu tới các đích đã cấu hình (S3, Redshift, OpenSearch, HTTP endpoint…); API của Firehose không có thao tác để ứng dụng đọc dữ liệu." },
        { l1: "File S3 theo batch", ok: false, why: "Xử lý theo batch, không đáp ứng yêu cầu gần thời gian thực." },
      ] },
      { name: "Xử lý", opts: [
        { l1: "AWS Lambda", ok: true, why: "Lambda đọc stream theo batch, loại bỏ số thẻ và số điện thoại trong từng giao dịch." },
        { l1: "Rule trong DynamoDB", ok: false, why: "Dữ liệu nhạy cảm phải được loại bỏ trước khi ghi; cần một bước xử lý đọc stream, ví dụ Lambda." },
      ] },
      { name: "Lưu trữ", opts: [
        { l1: "Amazon DynamoDB", ok: true, why: "Hỗ trợ mô hình document, đọc với độ trễ thấp." },
        { l1: "File trong S3", ok: false, why: "Không hỗ trợ truy vấn từng giao dịch với độ trễ thấp." },
      ] },
    ],
    result: "Kinesis Data Streams cho phép nhiều ứng dụng cùng đọc bản gốc; Lambda loại bỏ dữ liệu nhạy cảm và ghi vào DynamoDB.",
  },
  {
    name: "Mỗi batch cần xử lý 30 phút",
    about: "Dữ liệu cảm biến tại kho được gửi về liên tục; mỗi batch cần một tác vụ chạy khoảng 30 phút. Yêu cầu kiến trúc serverless và scale theo lượng dữ liệu.",
    source: ["Cảm biến kho", "dữ liệu liên tục"],
    slots: [
      { name: "Thu thập", opts: [
        KDS("Tiếp nhận dữ liệu liên tục và lưu giữ cho bước xử lý đọc."),
        { l1: "AWS DMS", ok: false, why: "DMS chuyển dữ liệu giữa các kho dữ liệu, không phải điểm tiếp nhận stream từ thiết bị." },
      ] },
      { name: "Xử lý", opts: [
        { l1: "ECS trên Fargate", ok: true, why: "Container serverless, không bị giới hạn 15 phút như Lambda, scale theo số task." },
        { l1: "Lambda + Step Functions", ok: false, why: "Timeout tối đa của một Lambda function tiêu chuẩn là 900 giây (15 phút); tác vụ 30 phút vượt quá giới hạn." },
        { l1: "EC2 Auto Scaling", ok: false, why: "Phương án hoạt động được nhưng phải quản lý máy chủ, không đáp ứng yêu cầu serverless." },
      ] },
    ],
    result: "Kinesis Data Streams tiếp nhận dữ liệu, ECS task trên Fargate thực thi tác vụ dài mà không cần quản lý máy chủ.",
  },
  {
    name: "Ứng dụng đã phát triển cho Kafka",
    about: "Đội phân tích đã có producer và consumer phát triển cho Apache Kafka. Yêu cầu: chuyển lên AWS, giữ nguyên mã nguồn, không tự vận hành cluster.",
    source: ["Ứng dụng", "Kafka producer"],
    slots: [
      { name: "Nền tảng streaming", opts: [
        { l1: "Amazon MSK", l2: "Kafka do AWS quản lý", ok: true, why: "Amazon MSK là dịch vụ Kafka được quản lý hoàn toàn; ứng dụng tiếp tục dùng Kafka API." },
        { l1: "Kafka tự triển khai", l2: "trên EC2", ok: false, why: "Phải tự vá lỗi, tự giám sát và tự scale cluster bằng script." },
        { l1: "Kinesis Data Streams", ok: false, why: "Đáp ứng được về chức năng, nhưng phải viết lại producer và consumer theo API của Kinesis." },
      ] },
    ],
    result: "Hệ thống đã sử dụng Kafka: Amazon MSK, giữ nguyên producer và consumer.",
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
        flashText(layer, X[i], Y + 46, "không phù hợp", "flash-bad", 900);
        if (!fast) await travel(layer, [next, [60, Y]], 500, "pkt-bad");
        setLog((l) => [...l, { ok: false, msg: rich(`Pipeline dừng tại bước **${need.slots[i].name}**. Thay đổi lựa chọn và chạy lại.`) }]);
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
      <div className="kpb-row" role="group" aria-label="Yêu cầu của ShopViet">
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
        <span className="kpb-note">{ready ? "Đã chọn dịch vụ cho tất cả các bước." : "Chọn một dịch vụ cho mỗi bước."}</span>
        <button className="btn primary" onClick={run} disabled={busy || !ready}>Chạy mô phỏng</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 40 820 120" role="img" aria-label={`Pipeline: ${need.source[0]}, sau đó ${need.slots.map((s) => s.name).join(", ")}`}>
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
          <p className="kss-hint">Chọn dịch vụ cho từng bước, sau đó chọn <b>Chạy mô phỏng</b>.</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.state === undefined ? (
                <li key={i} className={`kss-result ${e.ok ? "ok" : "bad"}`}>{e.msg}</li>
              ) : (
                <li key={i}>
                  <span className={`tag kss-tag ${e.state === "pass" ? "hit" : "bad"}`}>{e.state === "pass" ? "PHÙ HỢP" : "KHÔNG PHÙ HỢP"}</span>
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
