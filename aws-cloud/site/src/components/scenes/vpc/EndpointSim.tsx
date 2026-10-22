import { useRef, useState, type ReactNode } from "react";
import { travel, type Pt } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";

// How a private instance reaches S3 / SQS: through NAT, a gateway endpoint, or an
// interface endpoint (exam3_q47, exam5_q24, exam6_q64, exam6_q65, exam3_q7).
type Mode = "nat" | "gateway" | "interface";

const EC2: Pt = [120, 210];
const NAT: Pt = [250, 80];
const IGW: Pt = [380, 40];
const GW: Pt = [470, 210];
const ENI: Pt = [330, 250];
const S3: Pt = [660, 150];
const SQS: Pt = [660, 250];

const MODES: Record<Mode, { label: Bi; target: string; path: Pt[]; cls: string; routes: [string, string][]; text: Bi<ReactNode> }> = {
  nat: {
    label: { vi: "Không có endpoint (qua NAT)", en: "No endpoint (through NAT)" }, target: "S3", cls: "pkt-edge",
    path: [EC2, [160, 80], NAT, IGW, [600, 40], S3],
    routes: [["10.0.0.0/16", "local"], ["0.0.0.0/0", "nat-0a1b (NAT gateway)"]],
    text: { vi: <>Traffic tới S3 đi qua NAT gateway tới public endpoint của S3. Mỗi GB dữ liệu đều bị tính <b>phí xử lý của NAT gateway</b>, và dữ liệu rời khỏi mạng riêng của VPC.</>,
      en: <>Traffic to S3 goes through the NAT gateway to the S3 public endpoint. Every GB of data incurs the <b>NAT gateway processing charge</b>, and the data leaves the VPC&apos;s private network.</> },
  },
  gateway: {
    label: { vi: "Gateway endpoint cho S3", en: "Gateway endpoint for S3" }, target: "S3", cls: "pkt",
    path: [EC2, GW, S3],
    routes: [["10.0.0.0/16", "local"], ["0.0.0.0/0", "nat-0a1b (NAT gateway)"], ["pl-6fa54006 (S3)", "vpce-0c9d (gateway endpoint)"]],
    text: { vi: <>Gateway endpoint <b>chỉ dành cho S3 và DynamoDB</b>, không tính phí. Endpoint bổ sung một route trỏ prefix list của S3 tới endpoint, nên traffic tới S3 không còn đi qua NAT gateway. Có thể gắn endpoint policy để giới hạn các bucket được phép truy cập.</>,
      en: <>Gateway endpoints are <b>only for S3 and DynamoDB</b> and have no charge. The endpoint adds a route that points the S3 prefix list to the endpoint, so traffic to S3 no longer goes through the NAT gateway. You can attach an endpoint policy to limit which buckets can be accessed.</> },
  },
  interface: {
    label: { vi: "Interface endpoint cho SQS", en: "Interface endpoint for SQS" }, target: "SQS", cls: "pkt",
    path: [EC2, ENI, SQS],
    routes: [["10.0.0.0/16", "local"], ["0.0.0.0/0", "nat-0a1b (NAT gateway)"]],
    text: { vi: <>Interface endpoint (PrivateLink) tạo một <b>ENI có private IP</b> trong subnet. Không bổ sung route: bản ghi DNS của <code>sqs.ap-southeast-1.amazonaws.com</code> phân giải tới private IP của ENI. Loại endpoint này dùng cho các dịch vụ không hỗ trợ gateway endpoint, như SQS. Tính phí theo giờ và theo GB.</>,
      en: <>An interface endpoint (PrivateLink) creates an <b>ENI with a private IP</b> in the subnet. No route is added: the DNS record for <code>sqs.ap-southeast-1.amazonaws.com</code> resolves to the ENI&apos;s private IP. This endpoint type is used for services that do not support gateway endpoints, such as SQS. Charged per hour and per GB.</> },
  },
};

export default function EndpointSim() {
  const [mode, setMode] = useState<Mode>("nat");
  const [busy, setBusy] = useState(false);
  const pk = useRef<SVGGElement>(null);
  const m = MODES[mode];
  const L = useLang();

  async function send() {
    if (!pk.current) return;
    setBusy(true);
    await travel(pk.current, m.path, mode === "nat" ? 1800 : 1000, m.cls, 6);
    setBusy(false);
  }

  return (
    <div className="stage">
      <div className="stage-bar">
        {(Object.keys(MODES) as Mode[]).map((k) => (
          <button key={k} className="btn" aria-pressed={k === mode} onClick={() => setMode(k)} disabled={busy}>{L(MODES[k].label)}</button>
        ))}
        <span className="sep" />
        <button className="btn primary" onClick={send} disabled={busy}>{L({ vi: "EC2 gửi request tới ", en: "EC2 sends request to " })}{m.target}</button>
      </div>
      <div className="endpoint-grid">
        <div className="svg-wrap">
          <svg viewBox="0 0 760 300" role="img" aria-label={L({ vi: `EC2 trong private subnet gửi request tới ${m.target}: ${L(m.label)}`, en: `EC2 in a private subnet sends a request to ${m.target}: ${L(m.label)}` })}>
            <path className="cloud" d="M340 60 a18 18 0 0 1 10 -32 a24 24 0 0 1 44 -6 a18 18 0 0 1 26 22 a14 14 0 0 1 -6 16 z" />
            <rect className="region" x={30} y={60} width={470} height={230} rx={12} />
            <text className="t" x={46} y={84}>VPC</text>
            <rect className="subnet pub" x={190} y={66} width={140} height={40} rx={6} />
            <rect className="subnet" x={50} y={150} width={330} height={130} rx={6} />
            <text className="ts" x={60} y={168}>private subnet</text>
            <g className="res res-ec2"><rect x={80} y={194} width={80} height={32} rx={6} /><text className="res-t" x={120} y={215} textAnchor="middle">EC2</text></g>
            <g className={"res res-net" + (mode === "nat" ? "" : " faded")}><rect x={200} y={70} width={100} height={30} rx={6} /><text className="res-t" x={250} y={90} textAnchor="middle">NAT gateway</text></g>
            <rect className="gate-igw" x={358} y={28} width={44} height={24} rx={5} /><text className="tw" x={380} y={45} textAnchor="middle">IGW</text>
            {mode === "gateway" && (
              <g className="res res-net pop"><rect x={430} y={194} width={84} height={32} rx={6} /><text className="res-t" x={472} y={208} textAnchor="middle">vpce</text><text className="res-s" x={472} y={221} textAnchor="middle">gateway</text></g>
            )}
            {mode === "interface" && (
              <g className="res res-net pop"><rect x={280} y={234} width={96} height={32} rx={6} /><text className="res-t" x={328} y={248} textAnchor="middle">ENI</text><text className="res-s" x={328} y={261} textAnchor="middle">10.0.2.15</text></g>
            )}
            <g className="res res-store"><rect x={610} y={130} width={100} height={40} rx={7} /><text className="res-t" x={660} y={155} textAnchor="middle">Amazon S3</text></g>
            <g className="res res-store"><rect x={610} y={230} width={100} height={40} rx={7} /><text className="res-t" x={660} y={255} textAnchor="middle">Amazon SQS</text></g>
            <g ref={pk} />
          </svg>
        </div>
        <div className="rt">
          <div className="rt-title">{L({ vi: "Route table của private subnet", en: "Route table of the private subnet" })}</div>
          <table>
            <thead><tr><th>Destination</th><th>Target</th></tr></thead>
            <tbody>
              {m.routes.map(([d, t], i) => (
                <tr key={d} className={i === 2 ? "rt-new" : undefined}><td><code>{d}</code></td><td><code>{t}</code></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="readout" aria-live="polite">{L(m.text)}</div>
    </div>
  );
}
