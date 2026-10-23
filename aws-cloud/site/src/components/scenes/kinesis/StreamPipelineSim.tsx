import { useEffect, useRef, useState, type ReactNode } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./kinesis-sims.css";

// Build a streaming pipeline for one MFTECH need: pick a service for every stage,
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
    source: ["Web MFTECH", "click"],
    slots: [
      { name: "Thu thập", opts: [
        KDS("Tiếp nhận hàng nghìn click mỗi giây, lưu giữ dữ liệu để đọc lại khi bước tiếp theo gặp lỗi."),
        { l1: "EC2 ghi vào Aurora", l2: "kiến trúc hiện tại", ok: false, why: "Các EC2 instance và database là điểm nghẽn; khi tải tăng đột biến, click bị mất." },
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
    result: "Kinesis Data Streams tiếp nhận, Managed Service for Apache Flink phân tích (có thể bằng SQL), Firehose lưu vào S3. Kiến trúc serverless, không có EC2 instance cần quản lý.",
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
    source: ["Web MFTECH", "giao dịch"],
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
        { l1: "EC2 Auto Scaling", ok: false, why: "Phương án hoạt động được nhưng phải quản lý EC2 instance, không đáp ứng yêu cầu serverless." },
      ] },
    ],
    result: "Kinesis Data Streams tiếp nhận dữ liệu, ECS task trên Fargate thực thi tác vụ dài mà không cần quản lý EC2 instance.",
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

const NEEDS_EN: Need[] = [
  {
    name: "Product recommendations on every click",
    about: "Every click on the website must be analyzed immediately to recommend products, no click may be lost during traffic spikes, and the results are stored in S3.",
    source: ["MFTECH web", "clicks"],
    slots: [
      { name: "Ingest", opts: [
        KDS("Takes in thousands of clicks per second and retains the data so it can be reread if the next step fails."),
        { l1: "EC2 writing to Aurora", l2: "current architecture", ok: false, why: "The EC2 instances and the database are the bottleneck; during traffic spikes, clicks are lost." },
        { l1: "SQS + EC2", l2: "in-house library", ok: false, why: "The analysis on EC2 must be developed in-house; SQS provides no stream analytics tools." },
      ] },
      { name: "Analyze", opts: [
        { l1: "Managed Service for", l2: "Apache Flink (SQL)", ok: true, why: "Formerly Kinesis Data Analytics for Apache Flink: continuous processing on the data stream, with SQL support through Flink Studio or the Table API." },
        { l1: "Amazon Quick Sight", ok: false, why: "Quick Sight (formerly QuickSight) is for data visualization and building dashboards, not an engine for continuous processing on a stream." },
        { l1: "Amazon Athena", ok: false, why: "Athena queries files stored in S3; it does not apply to data in transit on a stream." },
      ] },
      { name: "Store", opts: [
        { l1: "Amazon Data Firehose", l2: "→ S3", ok: true, why: "Firehose batches the results and writes them to S3, with no code to write." },
        { l1: "Lambda writes files", ok: false, why: "This works, but batching, retries and file naming must be handled yourself." },
      ] },
    ],
    result: "Kinesis Data Streams ingests, Managed Service for Apache Flink analyzes (SQL is possible), Firehose stores to S3. A serverless architecture with no EC2 instances to manage.",
  },
  {
    name: "Collect courier locations through a REST API",
    about: "The courier app sends its location continuously through a REST API. The operations team needs to analyze the data in real time.",
    source: ["Courier app", "sends location"],
    slots: [
      { name: "Entry point", opts: [
        { l1: "Amazon API Gateway", l2: "→ Kinesis", ok: true, why: "API Gateway integrates directly with AWS services, receives the locations and writes them to the stream (for example, an HTTP API with the Kinesis-PutRecord integration)." },
        { l1: "Amazon Athena", l2: "+ S3", ok: false, why: "Athena does not receive data over REST and does not process in real time." },
      ] },
      { name: "Analyze", opts: [
        { l1: "Managed Service", l2: "for Apache Flink", ok: true, why: "Computes distance, speed, stationary vehicles… as soon as the data is received." },
        { l1: "Redshift", l2: "+ Quick Sight", ok: false, why: "A data warehouse and dashboards serve analytical queries and reports; continuous computation on every location event is the job of Managed Service for Apache Flink." },
      ] },
    ],
    result: "API Gateway acts as the REST entry point, and Managed Service for Apache Flink analyzes locations as soon as the data is received.",
  },
  {
    name: "Instant transaction search",
    about: "The customer care team needs full-text search on transactions that have just occurred and interactive dashboards.",
    source: ["Payment gateway", "transactions"],
    slots: [
      { name: "Ingest", opts: [
        KDS("Takes in the transaction stream with low latency."),
        { l1: "App on EC2", ok: false, why: "Scaling and operations must be handled yourself." },
      ] },
      { name: "Search", opts: [
        { l1: "Amazon OpenSearch", l2: "Service", ok: true, why: "Indexes the data and provides full-text search almost as soon as the data is received." },
        { l1: "Amazon DynamoDB", ok: false, why: "For full-text search on DynamoDB data, AWS provides a zero-ETL integration that moves the data to OpenSearch Service; search is the job of OpenSearch." },
        { l1: "Amazon Redshift", ok: false, why: "A data warehouse serves analytical queries; full-text search is the job of OpenSearch Service." },
      ] },
      { name: "Dashboard", opts: [
        { l1: "Amazon Quick Sight", ok: true, why: "Data visualization and interactive dashboards for business users (formerly Amazon QuickSight)." },
        { l1: "CloudWatch dashboard", ok: false, why: "Intended for operational metrics, not business dashboards." },
      ] },
    ],
    result: "Kinesis Data Streams → OpenSearch Service for search → Amazon Quick Sight for dashboards.",
  },
  {
    name: "Move historical logs in S3 into a stream",
    about: "Years of logs are stored in S3; new changes are written as CDC files in a separate folder. Both the historical data and the new data must be moved into Kinesis as quickly as possible.",
    source: ["S3", "old logs + CDC files"],
    slots: [
      { name: "Move data", opts: [
        { l1: "AWS DMS", l2: "S3 source, Kinesis target", ok: true, why: "DMS supports S3 as a source and Kinesis Data Streams as a target. A full load moves the files already in the bucket; new changes are moved when they are uploaded as CDC files in the DMS format (CDC00001.csv, CDC00002.csv… in order). No code to write." },
        { l1: "S3 event → Lambda", ok: false, why: "Handles only newly created files; historical data is not moved, and code must be written." },
        { l1: "S3 → SNS", ok: false, why: "SNS does not deliver directly to Kinesis Data Streams." },
      ] },
      { name: "Target", opts: [KDS("Analytics apps read data from this stream like any other stream.")] },
    ],
    result: "AWS DMS moves the S3 data → Kinesis Data Streams (full load + CDC files), with no new code to develop and maintain.",
  },
  {
    name: "Mask card data before storage",
    about: "The system produces hundreds of thousands of transactions per hour. Several internal apps need to read the original transactions; a copy with sensitive data removed is stored in a document database for low-latency queries.",
    source: ["MFTECH web", "transactions"],
    slots: [
      { name: "Ingest", opts: [
        KDS("Several internal apps read the original transaction stream."),
        { l1: "Amazon Data Firehose", ok: false, why: "Firehose delivers data to configured destinations (S3, Redshift, OpenSearch, HTTP endpoint…); the Firehose API has no operation for apps to read data." },
        { l1: "S3 files in batches", ok: false, why: "Batch processing does not meet the near-real-time requirement." },
      ] },
      { name: "Process", opts: [
        { l1: "AWS Lambda", ok: true, why: "Lambda reads the stream in batches and removes card numbers and phone numbers from each transaction." },
        { l1: "Rule in DynamoDB", ok: false, why: "Sensitive data must be removed before writing; a processing step that reads the stream is needed, for example Lambda." },
      ] },
      { name: "Store", opts: [
        { l1: "Amazon DynamoDB", ok: true, why: "Supports the document model with low-latency reads." },
        { l1: "Files in S3", ok: false, why: "Does not support querying individual transactions with low latency." },
      ] },
    ],
    result: "Kinesis Data Streams lets several apps read the original; Lambda removes sensitive data and writes to DynamoDB.",
  },
  {
    name: "Each batch takes 30 minutes to process",
    about: "Warehouse sensor data arrives continuously; each batch needs a job that runs about 30 minutes. The architecture must be serverless and scale with the data volume.",
    source: ["Warehouse sensors", "continuous data"],
    slots: [
      { name: "Ingest", opts: [
        KDS("Takes in continuous data and retains it for the processing step to read."),
        { l1: "AWS DMS", ok: false, why: "DMS moves data between data stores; it is not an entry point for streams from devices." },
      ] },
      { name: "Process", opts: [
        { l1: "ECS on Fargate", ok: true, why: "Serverless containers, not limited to 15 minutes like Lambda, scaling with the number of tasks." },
        { l1: "Lambda + Step Functions", ok: false, why: "The maximum timeout of a standard Lambda function is 900 seconds (15 minutes); a 30-minute job exceeds the limit." },
        { l1: "EC2 Auto Scaling", ok: false, why: "This works, but EC2 instances must be managed, which does not meet the serverless requirement." },
      ] },
    ],
    result: "Kinesis Data Streams ingests the data, and an ECS task on Fargate runs the long job with no EC2 instances to manage.",
  },
  {
    name: "Apps already built for Kafka",
    about: "The analytics team already has producers and consumers built for Apache Kafka. Requirement: move to AWS, keep the code, and not operate the cluster themselves.",
    source: ["App", "Kafka producer"],
    slots: [
      { name: "Streaming platform", opts: [
        { l1: "Amazon MSK", l2: "AWS-managed Kafka", ok: true, why: "Amazon MSK is a fully managed Kafka service; apps keep using the Kafka API." },
        { l1: "Self-managed Kafka", l2: "on EC2", ok: false, why: "Patching, monitoring and scaling the cluster must be done yourself with scripts." },
        { l1: "Kinesis Data Streams", ok: false, why: "Functionally suitable, but the producers and consumers would have to be rewritten for the Kinesis API." },
      ] },
    ],
    result: "Systems already using Kafka: Amazon MSK, keeping the producers and consumers unchanged.",
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
type LogLine = { state?: State; slot?: Bi; ok?: boolean; msg: Bi<ReactNode> };

export default function StreamPipelineSim() {
  const L = useLang();
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [ni, setNi] = useState(0);
  const need = L({ vi: NEEDS[ni], en: NEEDS_EN[ni] });
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
      const ov = NEEDS[ni].slots[i].opts[choice[i]];
      const oe = NEEDS_EN[ni].slots[i].opts[choice[i]];
      const slot: Bi = { vi: NEEDS[ni].slots[i].name, en: NEEDS_EN[ni].slots[i].name };
      const next: Pt = [X[i] - NODE_W / 2, Y];
      if (!fast) await travel(layer, [at, next], 420, opt.ok ? "pkt" : "pkt-bad");
      at = [X[i] + NODE_W / 2, Y];
      setLit((s) => ({ ...s, [i]: opt.ok ? "pass" : "block" }));
      setLog((l) => [...l, { state: opt.ok ? "pass" : "block", slot, msg: {
        vi: rich(`**${[ov.l1, ov.l2].filter(Boolean).join(" ")}**: ${ov.why}`),
        en: rich(`**${[oe.l1, oe.l2].filter(Boolean).join(" ")}**: ${oe.why}`) } }]);
      if (!opt.ok) {
        flashText(layer, X[i], Y + 46, L({ vi: "không phù hợp", en: "not a fit" }), "flash-bad", 900);
        if (!fast) await travel(layer, [next, [60, Y]], 500, "pkt-bad");
        setLog((l) => [...l, { ok: false, msg: {
          vi: rich(`Pipeline dừng tại bước **${slot.vi}**. Thay đổi lựa chọn và chạy lại.`),
          en: rich(`The pipeline stops at the **${slot.en}** step. Change your choice and run again.`) } }]);
        setBusy(false);
        return;
      }
      await sleep(fast ? 0 : 120);
    }
    setLog((l) => [...l, { ok: true, msg: { vi: rich(NEEDS[ni].result), en: rich(NEEDS_EN[ni].result) } }]);
    setBusy(false);
  }

  return (
    <div className="stage">
      <div className="flex flex-wrap gap-1.5 px-3.5 pt-3 pb-0" role="group" aria-label={L({ vi: "Yêu cầu của MFTECH", en: "MFTECH requirements" })}>
        {L({ vi: NEEDS, en: NEEDS_EN }).map((n, i) => (
          <button key={i} className="chip" aria-pressed={i === ni} onClick={() => pickNeed(i)} disabled={busy && i !== ni}>{n.name}</button>
        ))}
      </div>
      <p className="mx-4 mt-2.5 mb-1.5 text-step--1">{need.about}</p>
      {need.slots.map((s, si) => (
        <div key={si} className="stage-bar border-b-0 pb-1" role="group" aria-label={s.name}>
          <span className="label min-w-[120px]">{si + 1} · {s.name}</span>
          {shown(s.opts.length, si + ni).map((oi) => {
            const o = s.opts[oi];
            return (
              <button key={oi} className="btn" aria-pressed={choice[si] === oi} disabled={busy} onClick={() => choose(si, oi)}>
                {[o.l1, o.l2].filter(Boolean).join(" ")}
              </button>
            );
          })}
        </div>
      ))}
      <div className="stage-bar">
        <span className="text-step--1 text-muted">{ready ? L({ vi: "Đã chọn dịch vụ cho tất cả các bước.", en: "A service is chosen for every step." }) : L({ vi: "Chọn một dịch vụ cho mỗi bước.", en: "Choose one service for each step." })}</span>
        <button className="btn primary ml-auto" onClick={run} disabled={busy || !ready}>{L({ vi: "Chạy mô phỏng", en: "Run simulation" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 40 820 120" role="img" aria-label={L({ vi: `Pipeline: ${need.source[0]}, sau đó ${need.slots.map((s) => s.name).join(", ")}`, en: `Pipeline: ${need.source[0]}, then ${need.slots.map((s) => s.name).join(", ")}` })}>
          <path className="kss-link" d={`M60 ${Y} H${X[X.length - 1]}`} />
          <g className="kss-src">
            <rect x={10} y={Y - 26} width={110} height={52} rx={8} />
            <text className="kss-l1" x={65} y={Y - 3} textAnchor="middle">{need.source[0]}</text>
            <text className="kss-l2" x={65} y={Y + 13} textAnchor="middle">{need.source[1]}</text>
          </g>
          {need.slots.map((s, i) => {
            const o = choice[i] >= 0 ? s.opts[choice[i]] : undefined;
            return (
              <g key={i} className={`kpb-node ${lit[i] ?? ""}` + (o ? "" : " empty")}>
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
          <p className="m-0 text-step--1 text-muted">{L({ vi: <>Chọn dịch vụ cho từng bước, sau đó chọn <b>Chạy mô phỏng</b>.</>, en: <>Choose a service for each step, then choose <b>Run simulation</b>.</> })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.state === undefined ? (
                <li key={i} className={`mt-1.5 block rounded-[12px] px-2.5 py-2 ${e.ok ? "bg-ok-soft" : "bg-bad-soft"}`}>{L(e.msg)}</li>
              ) : (
                <li key={i}>
                  <span className={`tag kss-tag ${e.state === "pass" ? "hit" : "bad"}`}>{e.state === "pass" ? L({ vi: "PHÙ HỢP", en: "FIT" }) : L({ vi: "KHÔNG PHÙ HỢP", en: "NOT A FIT" })}</span>
                  <span><b>{e.slot && L(e.slot)}:</b> {L(e.msg)}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
