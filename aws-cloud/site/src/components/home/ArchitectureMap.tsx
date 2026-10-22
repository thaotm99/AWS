import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../lib/animate";
import "./architecture-map.css";

// Home-page hero: ShopViet's whole architecture on one map. Seven flows play in
// turn (or on demand); a packet walks the services involved, each one lights up
// and the caption links to the lesson about it. Clicking a service opens its lesson.

type Cat = "net" | "cmp" | "dat" | "int" | "sec";
interface MapNode { x: number; y: number; w?: number; l: string; s: string; c: Cat; lesson: string }

const N: Record<string, MapNode> = {
  route53: { x: 210, y: 130, l: "Route 53", s: "DNS, failover", c: "net", lesson: "route53" },
  cf: { x: 210, y: 300, l: "CloudFront", s: "+ WAF, ACM", c: "net", lesson: "cloudfront" },
  apigw: { x: 210, y: 470, l: "API Gateway", s: "+ Cognito", c: "net", lesson: "lambda" },
  alb: { x: 470, y: 150, l: "ALB", s: "2 AZ", c: "net", lesson: "elb" },
  ec2: { x: 470, y: 270, l: "EC2", s: "Auto Scaling", c: "cmp", lesson: "asg" },
  cache: { x: 400, y: 390, l: "ElastiCache", s: "Redis", c: "dat", lesson: "analytics" },
  aurora: { x: 540, y: 390, l: "Aurora", s: "Multi-AZ", c: "dat", lesson: "rds" },
  s3: { x: 700, y: 110, l: "S3", s: "ảnh, web tĩnh", c: "dat", lesson: "s3" },
  lImg: { x: 835, y: 110, l: "Lambda", s: "resize ảnh", c: "cmp", lesson: "lambda" },
  rekog: { x: 970, y: 110, l: "Rekognition", s: "gắn nhãn ảnh", c: "int", lesson: "others" },
  sqs: { x: 700, y: 250, l: "SQS", s: "hàng đợi đơn", c: "int", lesson: "messaging" },
  lOrder: { x: 835, y: 250, l: "Lambda", s: "xử lý đơn", c: "cmp", lesson: "lambda" },
  sns: { x: 970, y: 250, l: "SNS", s: "báo nhiều nơi", c: "int", lesson: "messaging" },
  lApi: { x: 700, y: 400, l: "Lambda", s: "API giỏ hàng", c: "cmp", lesson: "lambda" },
  ddb: { x: 835, y: 400, l: "DynamoDB", s: "giỏ hàng", c: "dat", lesson: "dynamodb" },
  kinesis: { x: 700, y: 590, l: "Kinesis", s: "clickstream", c: "int", lesson: "kinesis" },
  firehose: { x: 835, y: 590, l: "Firehose", s: "→ S3 data lake", c: "int", lesson: "kinesis" },
  athena: { x: 970, y: 590, l: "Athena", s: "SQL trên S3", c: "int", lesson: "analytics" },
  tAurora: { x: 1117, y: 382, w: 100, l: "Aurora", s: "Global DB", c: "dat", lesson: "backup-dr" },
  tS3: { x: 1117, y: 440, w: 100, l: "S3", s: "bản sao CRR", c: "dat", lesson: "backup-dr" },
};
const BAND: [string, string, string, string][] = [
  ["iam", "IAM", "ai được làm gì", "iam"],
  ["kms", "KMS", "mã hoá dữ liệu", "kms"],
  ["cw", "CloudWatch", "số liệu, cảnh báo", "monitoring"],
  ["ct", "CloudTrail", "ai đã gọi API nào", "monitoring"],
  ["cfg", "Config", "cấu hình đúng chuẩn", "monitoring"],
  ["bak", "AWS Backup", "sao lưu tự động", "backup-dr"],
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

interface Step { path?: Pt[]; on: string[]; text: string; back?: boolean; alert?: boolean }
interface Flow { name: string; dr?: boolean; steps: Step[] }

const FLOWS: Flow[] = [
  { name: "Xem ảnh sản phẩm", steps: [
    { path: [[95, 300], [120, 300], [120, 130], [151, 130]], on: ["route53"], text: "Khách mở shopviet.vn. Route 53 trả về địa chỉ CloudFront." },
    { path: [[210, 150], [210, 280]], on: ["cf"], text: "Request tới edge location gần khách. AWS WAF lọc request xấu ngay tại đây." },
    { path: [[269, 300], [285, 300], [285, 62], [700, 62], [700, 90]], on: ["s3", "kms"], text: "Lần đầu chưa có trong cache: CloudFront lấy ảnh từ S3. Bucket private, dữ liệu mã hoá bằng KMS." },
    { path: [[700, 90], [700, 62], [285, 62], [285, 300], [95, 300]], on: ["cf"], back: true, text: "Ảnh được lưu ở edge. Lần sau khách gần đó nhận ngay từ cache." },
  ] },
  { name: "Đặt hàng", steps: [
    { path: [[95, 300], [151, 300]], on: ["cf"], text: "Khách bấm Đặt hàng. Request động đi qua CloudFront." },
    { path: [[269, 300], [285, 300], [285, 150], [411, 150]], on: ["alb"], text: "Application Load Balancer chọn một EC2 khỏe ở một trong 2 AZ." },
    { path: [[470, 170], [470, 250]], on: ["ec2"], text: "EC2 trong Auto Scaling group xử lý đơn. Đông khách thì tự thêm máy." },
    { path: [[430, 290], [400, 290], [400, 370]], on: ["cache"], text: "Đọc giá và tồn kho từ ElastiCache, không phải hỏi database." },
    { path: [[400, 370], [400, 290], [510, 290], [540, 290], [540, 370]], on: ["aurora", "kms"], text: "Ghi đơn vào Aurora: bản chính ở AZ a, bản sao ở AZ b. Dữ liệu mã hoá bằng KMS." },
    { path: [[540, 370], [540, 290], [630, 290], [630, 250], [641, 250]], on: ["sqs"], text: "Việc gửi email, trừ kho được đẩy vào SQS để trang trả lời ngay." },
    { path: [[759, 250], [776, 250], [894, 250], [911, 250]], on: ["lOrder", "sns"], text: "Lambda xử lý từng message. SNS báo cho khách, kho và kế toán cùng lúc." },
    { path: [[411, 150], [285, 150], [285, 300], [95, 300]], on: ["cw"], back: true, text: "Khách thấy \"Đặt hàng thành công\". CloudWatch ghi lại thời gian xử lý." },
  ] },
  { name: "Đăng ảnh mới", steps: [
    { path: [[95, 300], [120, 300], [120, 62], [700, 62], [700, 90]], on: ["s3", "iam"], text: "Nhân viên tải ảnh sản phẩm mới lên S3 bằng presigned URL, quyền do IAM cấp." },
    { path: [[759, 110], [776, 110]], on: ["lImg"], text: "S3 Event Notification gọi Lambda tạo 3 cỡ ảnh." },
    { path: [[894, 110], [911, 110]], on: ["rekog"], text: "Rekognition gắn nhãn \"áo thun\", \"màu xanh\" để khách tìm được." },
    { path: [[970, 130], [970, 160], [700, 160], [700, 130]], on: ["s3"], back: true, text: "Ảnh đã xử lý lưu lại S3. CloudFront phục vụ ngay từ lần mở sau." },
  ] },
  { name: "App thêm vào giỏ", steps: [
    { path: [[95, 300], [120, 300], [120, 470], [151, 470]], on: ["apigw"], text: "App di động gọi API Gateway. Cognito kiểm tra token đăng nhập." },
    { path: [[269, 470], [300, 470], [300, 545], [630, 545], [630, 400], [641, 400]], on: ["lApi", "iam"], text: "Lambda chạy cho từng request, không có server phải quản lý. IAM role cho phép ghi DynamoDB." },
    { path: [[759, 400], [776, 400]], on: ["ddb"], text: "Giỏ hàng lưu trong DynamoDB, đọc ghi vài mili giây theo key." },
    { path: [[776, 400], [759, 400], [641, 400], [630, 400], [630, 545], [300, 545], [300, 470], [269, 470]], on: ["apigw"], back: true, text: "App cập nhật giỏ hàng ngay." },
  ] },
  { name: "Phân tích hành vi", steps: [
    { path: [[530, 270], [630, 270], [630, 590], [641, 590]], on: ["ec2", "kinesis"], text: "Mỗi lượt xem và bấm của khách được đẩy vào Kinesis Data Streams." },
    { path: [[759, 590], [776, 590]], on: ["firehose"], text: "Firehose gom dữ liệu, ghi file Parquet vào S3 data lake." },
    { path: [[894, 590], [911, 590]], on: ["athena"], text: "Sáng ra, Athena chạy SQL thẳng trên S3 cho báo cáo bán hàng." },
  ] },
  { name: "Mất cả Region", dr: true, steps: [
    { path: [[210, 110], [210, 22], [1117, 22], [1117, 360]], on: ["route53", "tAurora", "tS3"], alert: true, text: "Region Singapore gặp sự cố. Route 53 health check phát hiện và chuyển khách sang Tokyo." },
    { path: [[1117, 360], [1117, 22], [210, 22], [210, 110]], on: ["tAurora", "tS3", "bak"], back: true, text: "Aurora Global Database và S3 Cross-Region Replication đã có sẵn dữ liệu: ShopViet chạy lại sau vài phút." },
  ] },
  { name: "Nền tảng an toàn", steps: BAND.map(([id, l, s]) => ({ on: [id], text: `${l}: ${s}. Áp dụng cho mọi dịch vụ phía trên.` })) },
];

const d = (pts: Pt[]) => "M" + pts.map((p) => p.join(",")).join(" L");
const lessonUrl = (id: string) => `/concepts/${N[id].lesson}/`;

export default function ArchitectureMap({ titles }: { titles: Record<string, string> }) {
  const layer = useRef<SVGGElement>(null);
  const token = useRef(0);
  const [flow, setFlow] = useState(0);
  const [auto, setAuto] = useState(true);
  const autoRef = useRef(auto);
  autoRef.current = auto;
  /** Bumped to replay the same flow when it is picked again. */
  const [replay, setReplay] = useState(0);
  const [lit, setLit] = useState<string[]>([]);
  const [dr, setDr] = useState(false);
  const [caption, setCaption] = useState<{ step: string; text: string; node: string }>({ step: "", text: "", node: "s3" });

  // One run per flow (or replay); a newer run cancels the older one through `token`.
  useEffect(() => {
    const my = ++token.current;
    const alive = () => my === token.current;
    const pause = (ms: number) => new Promise<boolean>((r) => setTimeout(() => r(alive()), prefersReducedMotion() ? Math.min(ms, 1600) : ms));
    const f = FLOWS[flow];
    layer.current?.replaceChildren();
    (async () => {
      setDr(Boolean(f.dr));
      setLit([]);
      for (const [i, st] of f.steps.entries()) {
        if (!alive()) return;
        setCaption({ step: `${i + 1}/${f.steps.length}`, text: st.text, node: st.on[0] });
        setLit(st.on);
        if (st.alert && layer.current) flashText(layer.current, 670, 340, "Singapore sự cố", "amap-flash", 2400);
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
    <div className="amap">
      <div className="amap-bar">
        <span className="amap-label">Luồng</span>
        <div className="amap-chips" role="group" aria-label="Chọn luồng">
          {FLOWS.map((f, i) => (
            <button key={f.name} type="button" className="chip" aria-pressed={i === flow} onClick={() => pick(i)}>{f.name}</button>
          ))}
        </div>
        <button type="button" className="btn amap-play" aria-pressed={auto} onClick={toggleAuto}>
          {auto ? "Tạm dừng" : "Tự chạy"}
        </button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 1180 712" role="img" aria-label="Sơ đồ kiến trúc ShopViet trên AWS, request chạy qua từng dịch vụ">
          <rect className="amap-frame region" x={300} y={40} width={745} height={588} rx={14} />
          <text className="amap-ft" x={316} y={60}>Region Singapore</text>
          <a href="/concepts/vpc/">
            <rect className="amap-frame" x={322} y={95} width={296} height={345} rx={12} />
            <text className="amap-ft" x={336} y={113}>VPC · 2 AZ</text>
          </a>
          <rect className="amap-frame region" x={1062} y={330} width={110} height={150} rx={12} />
          <text className="amap-ft" x={1117} y={349} textAnchor="middle">Tokyo · DR</text>
          <text className="amap-ft" x={20} y={640}>Nền tảng chung cho mọi dịch vụ</text>
          {WIRES.map((w, i) => <path key={i} className="amap-wire" d={d(w)} />)}
          <path className="amap-wire" d={d(DR_WIRE)} strokeDasharray="5 5" />
          <g transform="translate(70 300)" aria-hidden="true">
            <circle className="amap-user" cy={-10} r={8} />
            <path className="amap-user" d="M-15 15 a15 15 0 0 1 30 0 z" />
            <text className="amap-ft" y={38} textAnchor="middle">Khách</text>
          </g>
          {Object.entries(N).map(([id, n]) => {
            const w = n.w ?? 118, h = 40;
            const cls = ["amap-node", `cat-${n.c}`, lit.includes(id) ? "lit" : "", dr && REGION.includes(id) ? "dim" : ""].join(" ");
            return (
              <a key={id} href={lessonUrl(id)} className={cls} aria-label={`${n.l}: ${n.s}. Mở bài ${titles[n.lesson] ?? n.lesson}`}>
                <rect x={n.x - w / 2} y={n.y - h / 2} width={w} height={h} rx={8} />
                <circle className="amap-dot" cx={n.x - w / 2 + 10} cy={n.y - h / 2 + 10} r={3} />
                <text className="amap-t" x={n.x} y={n.y - 2} textAnchor="middle">{n.l}</text>
                <text className="amap-s" x={n.x} y={n.y + 12} textAnchor="middle">{n.s}</text>
              </a>
            );
          })}
          <g ref={layer} />
        </svg>
      </div>
      <div className="amap-legend">
        <span className="cat-net"><i />Mạng & phân phối</span>
        <span className="cat-cmp"><i />Tính toán</span>
        <span className="cat-dat"><i />Lưu trữ & dữ liệu</span>
        <span className="cat-int"><i />Tích hợp & phân tích</span>
        <span className="cat-sec"><i />Bảo mật & vận hành</span>
      </div>
      <div className="amap-caption" aria-live="polite">
        <span className="amap-step">{caption.step}</span>
        <span>{caption.text}</span>
        <a href={lessonUrl(caption.node)}>Bài {titles[N[caption.node].lesson] ?? N[caption.node].l} →</a>
      </div>
    </div>
  );
}
