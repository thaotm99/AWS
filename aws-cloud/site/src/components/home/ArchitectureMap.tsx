import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../lib/animate";
import { useI18n } from "../../app/i18n";
import "./architecture-map.css";

// Home-page hero: MFTech's whole architecture on one map. Seven flows play in
// turn (or on demand); a packet walks the services involved, each one lights up
// and the caption links to the lesson about it. Clicking a service opens its lesson.

type Cat = "net" | "cmp" | "dat" | "int" | "sec";
/** Text in both site languages. */
type Tx = { vi: string; en: string };
const tx = (vi: string, en: string = vi): Tx => ({ vi, en });
interface MapNode { x: number; y: number; w?: number; l: string; s: Tx; c: Cat; lesson: string }

const N: Record<string, MapNode> = {
  route53: { x: 210, y: 130, l: "Route 53", s: tx("DNS, failover"), c: "net", lesson: "route53" },
  cf: { x: 210, y: 300, l: "CloudFront", s: tx("+ WAF, ACM"), c: "net", lesson: "cloudfront" },
  apigw: { x: 210, y: 470, l: "API Gateway", s: tx("+ Cognito"), c: "net", lesson: "lambda" },
  alb: { x: 470, y: 150, l: "ALB", s: tx("2 AZ"), c: "net", lesson: "elb" },
  ec2: { x: 470, y: 270, l: "EC2", s: tx("Auto Scaling"), c: "cmp", lesson: "asg" },
  cache: { x: 400, y: 390, l: "ElastiCache", s: tx("Redis"), c: "dat", lesson: "analytics" },
  aurora: { x: 540, y: 390, l: "Aurora", s: tx("Multi-AZ"), c: "dat", lesson: "rds" },
  s3: { x: 700, y: 110, l: "S3", s: tx("ảnh, web tĩnh", "images, static site"), c: "dat", lesson: "s3" },
  lImg: { x: 835, y: 110, l: "Lambda", s: tx("resize ảnh", "image resize"), c: "cmp", lesson: "lambda" },
  rekog: { x: 970, y: 110, l: "Rekognition", s: tx("gắn nhãn ảnh", "image labels"), c: "int", lesson: "others" },
  sqs: { x: 700, y: 250, l: "SQS", s: tx("hàng đợi đơn", "order queue"), c: "int", lesson: "messaging" },
  lOrder: { x: 835, y: 250, l: "Lambda", s: tx("xử lý đơn", "order processing"), c: "cmp", lesson: "lambda" },
  sns: { x: 970, y: 250, l: "SNS", s: tx("báo nhiều nơi", "fan-out"), c: "int", lesson: "messaging" },
  lApi: { x: 700, y: 400, l: "Lambda", s: tx("API giỏ hàng", "cart API"), c: "cmp", lesson: "lambda" },
  ddb: { x: 835, y: 400, l: "DynamoDB", s: tx("giỏ hàng", "shopping cart"), c: "dat", lesson: "dynamodb" },
  kinesis: { x: 700, y: 590, l: "Kinesis", s: tx("clickstream"), c: "int", lesson: "kinesis" },
  firehose: { x: 835, y: 590, l: "Firehose", s: tx("→ S3 data lake"), c: "int", lesson: "kinesis" },
  athena: { x: 970, y: 590, l: "Athena", s: tx("SQL trên S3", "SQL on S3"), c: "int", lesson: "analytics" },
  tAurora: { x: 1117, y: 382, w: 100, l: "Aurora", s: tx("Global DB"), c: "dat", lesson: "backup-dr" },
  tS3: { x: 1117, y: 440, w: 100, l: "S3", s: tx("bản sao CRR", "CRR replica"), c: "dat", lesson: "backup-dr" },
};
const BAND: [string, string, Tx, string][] = [
  ["iam", "IAM", tx("kiểm soát truy cập", "access control"), "iam"],
  ["kms", "KMS", tx("quản lý khoá mã hoá", "encryption keys"), "kms"],
  ["cw", "CloudWatch", tx("metric, log và alarm", "metrics, logs, alarms"), "monitoring"],
  ["ct", "CloudTrail", tx("nhật ký lời gọi API", "API call history"), "monitoring"],
  ["cfg", "Config", tx("tuân thủ cấu hình", "configuration compliance"), "monitoring"],
  ["bak", "AWS Backup", tx("sao lưu tập trung", "centralized backup"), "backup-dr"],
];
BAND.forEach(([id, l, s, lesson], i) => (N[id] = { x: 115 + i * 190, y: 672, w: 168, l, s, c: "sec", lesson }));

/** Services inside the Singapore Region; dimmed while the Region is down. */
const REGION = ["alb", "ec2", "cache", "aurora", "s3", "lImg", "rekog", "sqs", "lOrder", "sns", "lApi", "ddb", "kinesis", "firehose", "athena"];

const WIRES: Pt[][] = [
  [[95, 300], [151, 300]], [[210, 150], [210, 280]], [[269, 300], [285, 300], [285, 62], [700, 62], [700, 90]],
  [[285, 150], [411, 150]], [[470, 170], [470, 250]], [[430, 290], [400, 290], [400, 370]], [[510, 290], [540, 290], [540, 370]],
  [[530, 270], [630, 270], [630, 250], [641, 250]], [[759, 250], [776, 250]], [[894, 250], [911, 250]],
  [[759, 110], [776, 110]], [[894, 110], [911, 110]],
  [[95, 300], [120, 300], [120, 470], [151, 470]], [[269, 470], [300, 470], [300, 545], [630, 545], [630, 400], [641, 400]], [[759, 400], [776, 400]],
  [[630, 545], [630, 590], [641, 590]], [[759, 590], [776, 590]], [[894, 590], [911, 590]],
];
const DR_WIRE: Pt[] = [[210, 110], [210, 22], [1117, 22], [1117, 330]];

interface Step { path?: Pt[]; on: string[]; text: Tx; back?: boolean; alert?: boolean }
interface Flow { name: Tx; dr?: boolean; steps: Step[] }

const FLOWS: Flow[] = [
  { name: tx("Phân phối nội dung tĩnh", "Static content delivery"), steps: [
    { path: [[95, 300], [120, 300], [120, 130], [151, 130]], on: ["route53"], text: tx("Trình duyệt phân giải mftech.vn; Route 53 trả về bản ghi Alias trỏ tới CloudFront distribution.", "The browser resolves mftech.vn; Route 53 answers with an alias record that points to the CloudFront distribution.") },
    { path: [[210, 150], [210, 280]], on: ["cf"], text: tx("Request được định tuyến tới edge location có độ trễ thấp nhất; AWS WAF đánh giá request trước khi xử lý.", "The request is routed to the edge location with the lowest latency; AWS WAF inspects it before it is processed.") },
    { path: [[269, 300], [285, 300], [285, 62], [700, 62], [700, 90]], on: ["s3", "kms"], text: tx("Cache miss: CloudFront truy xuất object từ origin S3 thông qua OAC. Bucket ở chế độ private, dữ liệu được mã hoá bằng KMS key.", "Cache miss: CloudFront fetches the object from the S3 origin through OAC. The bucket is private and the data is encrypted with a KMS key.") },
    { path: [[700, 90], [700, 62], [285, 62], [285, 300], [95, 300]], on: ["cf"], back: true, text: tx("Object được lưu tại edge cache theo TTL; các request tiếp theo trong khu vực được phục vụ trực tiếp từ cache.", "The object is cached at the edge for its TTL; later requests in the area are served straight from the cache.") },
  ] },
  { name: tx("Xử lý đơn hàng", "Order processing"), steps: [
    { path: [[95, 300], [151, 300]], on: ["cf"], text: tx("Request đặt hàng (nội dung động) được CloudFront chuyển tiếp tới origin mà không cache.", "The order request (dynamic content) is forwarded by CloudFront to the origin without caching.") },
    { path: [[269, 300], [285, 300], [285, 150], [411, 150]], on: ["alb"], text: tx("Application Load Balancer phân phối request tới một target healthy thuộc một trong hai Availability Zone.", "The Application Load Balancer sends the request to a healthy target in one of the two Availability Zones.") },
    { path: [[470, 170], [470, 250]], on: ["ec2"], text: tx("Instance trong Auto Scaling group xử lý request; scaling policy điều chỉnh số instance theo tải.", "An instance in the Auto Scaling group handles the request; a scaling policy adjusts the number of instances to the load.") },
    { path: [[430, 290], [400, 290], [400, 370]], on: ["cache"], text: tx("Giá và tồn kho được đọc từ ElastiCache theo mô hình cache-aside, giảm tải truy vấn cho database.", "Prices and stock are read from ElastiCache with the cache-aside pattern, which takes read load off the database.") },
    { path: [[400, 370], [400, 290], [510, 290], [540, 290], [540, 370]], on: ["aurora", "kms"], text: tx("Đơn hàng được ghi vào Aurora; dữ liệu được sao chép đồng bộ sang AZ thứ hai và mã hoá khi lưu trữ bằng KMS.", "The order is written to Aurora; the data is replicated synchronously to a second AZ and encrypted at rest with KMS.") },
    { path: [[540, 370], [540, 290], [630, 290], [630, 250], [641, 250]], on: ["sqs"], text: tx("Các tác vụ hậu xử lý (gửi email, cập nhật tồn kho) được đưa vào hàng đợi SQS, tách khỏi luồng request đồng bộ.", "Follow-up tasks (sending email, updating stock) go to an SQS queue, decoupled from the synchronous request.") },
    { path: [[759, 250], [776, 250], [894, 250], [911, 250]], on: ["lOrder", "sns"], text: tx("Lambda tiêu thụ message từ hàng đợi; SNS phát sự kiện tới các hệ thống kho, kế toán và thông báo khách hàng (fan-out).", "Lambda consumes messages from the queue; SNS fans the event out to the warehouse, accounting and customer-notification systems.") },
    { path: [[411, 150], [285, 150], [285, 300], [95, 300]], on: ["cw"], back: true, text: tx("Response được trả về cho người dùng; CloudWatch ghi nhận metric độ trễ và số lỗi của request.", "The response returns to the user; CloudWatch records latency and error metrics for the request.") },
  ] },
  { name: tx("Xử lý ảnh theo sự kiện", "Event-driven image processing"), steps: [
    { path: [[95, 300], [120, 300], [120, 62], [700, 62], [700, 90]], on: ["s3", "iam"], text: tx("Ảnh sản phẩm được tải trực tiếp lên S3 qua presigned URL; quyền ghi được giới hạn bởi IAM policy.", "Product images are uploaded straight to S3 with a presigned URL; write access is limited by an IAM policy.") },
    { path: [[759, 110], [776, 110]], on: ["lImg"], text: tx("S3 Event Notification kích hoạt Lambda để tạo các phiên bản ảnh theo nhiều kích thước.", "An S3 Event Notification invokes Lambda to create resized versions of the image.") },
    { path: [[894, 110], [911, 110]], on: ["rekog"], text: tx("Amazon Rekognition phân tích ảnh và sinh nhãn (label) phục vụ tìm kiếm sản phẩm.", "Amazon Rekognition analyses the image and returns labels used for product search.") },
    { path: [[970, 130], [970, 160], [700, 160], [700, 130]], on: ["s3"], back: true, text: tx("Ảnh đã xử lý được lưu lại S3 và phân phối qua CloudFront.", "The processed images are stored back in S3 and delivered through CloudFront.") },
  ] },
  { name: tx("API serverless", "Serverless API"), steps: [
    { path: [[95, 300], [120, 300], [120, 470], [151, 470]], on: ["apigw"], text: tx("Ứng dụng di động gọi API Gateway; Cognito user pool authorizer xác thực JWT trong request.", "The mobile app calls API Gateway; a Cognito user pool authorizer validates the JWT in the request.") },
    { path: [[269, 470], [300, 470], [300, 545], [630, 545], [630, 400], [641, 400]], on: ["lApi", "iam"], text: tx("Lambda xử lý request theo mô hình serverless; execution role cấp quyền ghi vào bảng DynamoDB.", "Lambda handles the request without servers to manage; its execution role grants write access to the DynamoDB table.") },
    { path: [[759, 400], [776, 400]], on: ["ddb"], text: tx("Giỏ hàng được lưu trong DynamoDB với độ trễ đọc ghi ở mức mili giây theo partition key.", "The cart is stored in DynamoDB, with single-digit-millisecond reads and writes by partition key.") },
    { path: [[776, 400], [759, 400], [641, 400], [630, 400], [630, 545], [300, 545], [300, 470], [269, 470]], on: ["apigw"], back: true, text: tx("Response được trả về ứng dụng và trạng thái giỏ hàng được cập nhật.", "The response returns to the app and the cart state is updated.") },
  ] },
  { name: tx("Phân tích clickstream", "Clickstream analytics"), steps: [
    { path: [[530, 270], [630, 270], [630, 590], [641, 590]], on: ["ec2", "kinesis"], text: tx("Sự kiện clickstream được ghi vào Kinesis Data Streams theo thời gian thực.", "Clickstream events are written to Kinesis Data Streams in real time.") },
    { path: [[759, 590], [776, 590]], on: ["firehose"], text: tx("Amazon Data Firehose gom lô dữ liệu, chuyển đổi sang Parquet và ghi vào S3 data lake.", "Amazon Data Firehose batches the data, converts it to Parquet and writes it to the S3 data lake.") },
    { path: [[894, 590], [911, 590]], on: ["athena"], text: tx("Athena thực thi truy vấn SQL trực tiếp trên dữ liệu S3 để lập báo cáo kinh doanh.", "Athena runs SQL queries directly on the data in S3 for business reports.") },
  ] },
  { name: tx("Khôi phục sau thảm hoạ", "Disaster recovery"), dr: true, steps: [
    { path: [[210, 110], [210, 22], [1117, 22], [1117, 360]], on: ["route53", "tAurora", "tS3"], alert: true, text: tx("Region Singapore gặp sự cố; Route 53 health check phát hiện lỗi và failover routing chuyển traffic sang Region Tokyo.", "The Singapore Region fails; a Route 53 health check detects it and failover routing sends traffic to the Tokyo Region.") },
    { path: [[1117, 360], [1117, 22], [210, 22], [210, 110]], on: ["tAurora", "tS3", "bak"], back: true, text: tx("Aurora Global Database và S3 Cross-Region Replication đã duy trì bản sao dữ liệu; hệ thống phục hồi với RPO tính bằng giây và RTO tính bằng phút.", "Aurora Global Database and S3 Cross-Region Replication have kept copies of the data; the system recovers with an RPO measured in seconds and an RTO measured in minutes.") },
  ] },
  { name: tx("Bảo mật và vận hành", "Security and operations"), steps: BAND.map(([id, l, s]) => ({ on: [id], text: tx(`${l}: ${s.vi}. Áp dụng xuyên suốt cho mọi dịch vụ trong kiến trúc.`, `${l}: ${s.en}. Applies to every service in the architecture.`) })) },
];

const d = (pts: Pt[]) => "M" + pts.map((p) => p.join(",")).join(" L");
const lessonUrl = (id: string) => `/concepts/${N[id].lesson}/`;

/** Legend swatch in the category hue (--cat from the cat-* class around it). */
const SWATCH = "mr-1.5 inline-block size-2.5 rounded-[3px] bg-(--cat) align-[-1px]";

export default function ArchitectureMap({ titles, titlesEn }: { titles: Record<string, string>; titlesEn: Record<string, string> }) {
  const { t, locale } = useI18n();
  const L = (x: Tx) => x[locale];
  const titleOf = (lesson: string) => (locale === "en" ? titlesEn : titles)[lesson] ?? lesson;
  const layer = useRef<SVGGElement>(null);
  const token = useRef(0);
  const [flow, setFlow] = useState(0);
  const [auto, setAuto] = useState(true);
  const autoRef = useRef(auto);
  autoRef.current = auto;
  const started = useRef(false);
  /** Bumped to replay the same flow when it is picked again. */
  const [replay, setReplay] = useState(0);
  const [lit, setLit] = useState<string[]>([]);
  const [dr, setDr] = useState(false);
  const [caption, setCaption] = useState<{ step: string; text: Tx | null; node: string }>({ step: "", text: null, node: "s3" });
  const root = useRef<HTMLDivElement>(null);
  // The tour only moves while the map is on screen and the tab is visible; waiting steps resume together.
  const shown = useRef(true);
  const waiting = useRef(new Set<() => void>());
  useEffect(() => {
    let inView = true;
    const update = () => {
      shown.current = inView && !document.hidden;
      if (!shown.current) return;
      for (const resume of waiting.current) resume();
      waiting.current.clear();
    };
    const io = new IntersectionObserver(([e]) => { inView = e.isIntersecting; update(); });
    if (root.current) io.observe(root.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const whenShown = () => (shown.current ? Promise.resolve() : new Promise<void>((r) => waiting.current.add(r)));

  // One run per flow (or replay); a newer run cancels the older one through `token`.
  useEffect(() => {
    const my = ++token.current;
    const alive = () => my === token.current;
    const pause = (ms: number) => new Promise<boolean>((r) => setTimeout(() => r(alive()), prefersReducedMotion() ? Math.min(ms, 1600) : ms));
    const f = FLOWS[flow];
    layer.current?.replaceChildren();
    // Reduced motion: start paused on the first step of the first flow; nothing moves until a flow is picked or Play is pressed.
    if (!started.current) {
      started.current = true;
      if (prefersReducedMotion()) {
        autoRef.current = false;
        setAuto(false);
        setDr(Boolean(f.dr));
        setCaption({ step: `1/${f.steps.length}`, text: f.steps[0].text, node: f.steps[0].on[0] });
        setLit(f.steps[0].on);
        return () => { token.current++; };
      }
    }
    (async () => {
      setDr(Boolean(f.dr));
      setLit([]);
      for (const [i, st] of f.steps.entries()) {
        await whenShown();
        if (!alive()) return;
        setCaption({ step: `${i + 1}/${f.steps.length}`, text: st.text, node: st.on[0] });
        setLit(st.on);
        if (st.alert && layer.current) flashText(layer.current, 670, 340, t("shell.home.map.outage"), "amap-flash", 2400);
        if (st.path && layer.current) await travel(layer.current, st.path, 380 + st.path.length * 140, st.back ? "amap-pkt back" : st.alert ? "amap-pkt alert" : "amap-pkt", 7);
        if (!(await pause(st.path ? 900 : 1500))) return;
      }
      if ((await pause(1200)) && autoRef.current) setFlow((x) => (x + 1) % FLOWS.length);
    })();
    return () => { token.current++; };
  }, [flow, replay]);

  function pick(i: number) {
    setAuto(false);
    setFlow(i);
    setReplay((r) => r + 1);
  }

  function toggleAuto() {
    if (auto) {
      setAuto(false);
      token.current++; // stop after the current hop
    } else {
      setAuto(true);
      setFlow((x) => (x + 1) % FLOWS.length);
    }
  }

  return (
    <div className="mt-[18px] mb-2 overflow-hidden rounded-[20px] border border-line bg-surface shadow-soft" ref={root}>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-line px-3.5 py-3">
        <span className="mr-1 text-[0.75rem] font-bold tracking-[0.08em] text-muted uppercase">{t("shell.home.map.flows")}</span>
        <div className="col-span-full row-2 flex flex-wrap gap-1.5" role="group" aria-label={t("shell.home.map.pickFlow")}>
          {FLOWS.map((f, i) => (
            <button key={f.name.vi} type="button" className="chip" aria-pressed={i === flow} onClick={() => pick(i)}>{L(f.name)}</button>
          ))}
        </div>
        <button type="button" className="btn col-2 row-1" aria-pressed={auto} onClick={toggleAuto}>
          {auto ? t("shell.home.map.pause") : t("shell.home.map.play")}
        </button>
      </div>
      <div className="svg-wrap">
        <svg className="min-w-[860px]" viewBox="0 0 1180 712" role="group" aria-label={t("shell.home.map.label")}>
          <rect className="amap-frame region" x={300} y={40} width={745} height={588} rx={14} />
          <text className="amap-ft" x={316} y={60}>{t("shell.home.map.region")}</text>
          <a href="/concepts/vpc/">
            <rect className="amap-frame" x={322} y={95} width={296} height={345} rx={12} />
            <text className="amap-ft" x={336} y={113}>VPC · 2 AZ</text>
          </a>
          <rect className="amap-frame region" x={1062} y={330} width={110} height={150} rx={12} />
          <text className="amap-ft" x={1117} y={349} textAnchor="middle">Tokyo · DR</text>
          <text className="amap-ft" x={20} y={640}>{t("shell.home.map.shared")}</text>
          {WIRES.map((w, i) => <path key={i} className="amap-wire" d={d(w)} />)}
          <path className="amap-wire" d={d(DR_WIRE)} strokeDasharray="5 5" />
          <g transform="translate(70 300)" aria-hidden="true">
            <circle className="amap-user" cy={-10} r={8} />
            <path className="amap-user" d="M-15 15 a15 15 0 0 1 30 0 z" />
            <text className="amap-ft" y={38} textAnchor="middle">{t("shell.home.map.users")}</text>
          </g>
          {Object.entries(N).map(([id, n]) => {
            const w = n.w ?? 118, h = 40;
            const cls = ["amap-node", `cat-${n.c}`, lit.includes(id) ? "lit" : "", dr && REGION.includes(id) ? "dim" : ""].join(" ");
            return (
              <a key={id} href={lessonUrl(id)} className={cls} aria-label={t("shell.home.map.open", { node: `${n.l}: ${L(n.s)}`, lesson: titleOf(n.lesson) })}>
                <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={8} />
                <circle className="amap-dot" cx={n.x - w / 2 + 10} cy={n.y - h / 2 + 10} r={3} />
                <text className="amap-t" x={n.x} y={n.y - 2} textAnchor="middle">{n.l}</text>
                <text className="amap-s" x={n.x} y={n.y + 12} textAnchor="middle">{L(n.s)}</text>
              </a>
            );
          })}
          <g ref={layer} />
        </svg>
      </div>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 px-4 pt-1 pb-3 text-[0.75rem] text-muted">
        <span className="cat-net"><i className={SWATCH} />{t("shell.home.map.net")}</span>
        <span className="cat-cmp"><i className={SWATCH} />{t("shell.home.map.cmp")}</span>
        <span className="cat-dat"><i className={SWATCH} />{t("shell.home.map.dat")}</span>
        <span className="cat-int"><i className={SWATCH} />{t("shell.home.map.int")}</span>
        <span className="cat-sec"><i className={SWATCH} />{t("shell.home.map.sec")}</span>
      </div>
      {/* Announce only a flow the reader picked; the auto tour changes the caption every second or two. */}
      <div className="grid min-h-[58px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-line px-4 py-3 text-[0.9375rem] max-sm:grid-cols-[minmax(0,1fr)] max-sm:gap-1" aria-live={auto ? "off" : "polite"}>
        <span className="font-mono text-[0.75rem] text-muted">{caption.step}</span>
        <span>{caption.text ? L(caption.text) : ""}</span>
        <a className="inline-flex min-h-7 items-center text-[0.8125rem] whitespace-nowrap" href={lessonUrl(caption.node)}>{t("shell.home.map.lesson", { title: titleOf(N[caption.node].lesson) })}</a>
      </div>
    </div>
  );
}
