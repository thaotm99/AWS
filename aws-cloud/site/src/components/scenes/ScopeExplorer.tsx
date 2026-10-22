import { useState, type ReactNode } from "react";

type Scope = "global" | "region" | "az" | "edge";

const AZS = [
  { n: "a", x: 50 },
  { n: "b", x: 212 },
  { n: "c", x: 374 },
];
const EDGE_Y = [128, 220, 312];


function Token({ x, y, w, label, ghost }: { x: number; y: number; w: number; label: string; ghost?: boolean }) {
  return (
    <g className={"tok pop" + (ghost ? " ghost" : "")}>
      <rect x={x} y={y} width={w} height={24} rx={5} />
      <text x={x + w / 2} y={y + 16} textAnchor="middle">{label}</text>
    </g>
  );
}

const replicas = AZS.map((az) => <Token key={az.n} x={az.x + 20} y={200} w={100} label="bản sao" ghost />);

const SERVICES: { name: string; scope: Scope; label: string; text: ReactNode; draw: ReactNode }[] = [
  { name: "IAM", scope: "global", label: "Global",
    text: <>Role <code>shopviet-app</code> tạo một lần, dùng được ở mọi Region. Không có IAM riêng của Singapore hay của Tokyo.</>,
    draw: <Token x={250} y={18} w={190} label="IAM role: shopviet-app" /> },
  { name: "Route 53", scope: "global", label: "Global",
    text: <>Tên miền <code>shopviet.vn</code> được phân giải bởi DNS server đặt ở các Edge location trên toàn cầu, gần khách nhất.</>,
    draw: <Token x={560} y={46} w={180} label="Route 53: shopviet.vn" /> },
  { name: "S3", scope: "region", label: "Region",
    text: <>Bucket <code>shopviet-images</code> thuộc Region Singapore. AWS tự lưu dữ liệu trên nhiều AZ (với các storage class thông thường), bạn không phải làm gì thêm.</>,
    draw: <><Token x={296} y={70} w={220} label="S3: shopviet-images" />{replicas}</> },
  { name: "VPC", scope: "region", label: "Region",
    text: <>VPC <code>10.0.0.0/16</code> trải trên mọi AZ của Region. Nhưng bên trong, bạn chia subnet, và mỗi subnet chỉ nằm ở một AZ.</>,
    draw: <>
      <rect className="zone pop" x={40} y={112} width={490} height={236} rx={12} />
      <text className="zone-t" x={516} y={128} textAnchor="end">VPC 10.0.0.0/16</text>
    </> },
  { name: "EFS", scope: "region", label: "Region",
    text: <>File system EFS là tài nguyên cấp Region, có mount target ở từng AZ nên server ở AZ nào cũng mount được. Server ở Region khác vẫn truy cập được qua inter-region VPC peering, không cần copy dữ liệu.</>,
    draw: <><Token x={296} y={70} w={220} label="EFS: shopviet-shared" />{AZS.map((az) => <Token key={az.n} x={az.x + 20} y={200} w={100} label="mount target" ghost />)}</> },
  { name: "AMI", scope: "region", label: "Region",
    text: <>AMI <code>shopviet-web</code> chỉ dùng được trong Region đã tạo ra nó, nhưng dùng được ở mọi AZ của Region đó. Muốn launch ở Region khác phải copy AMI sang (Cảnh 1).</>,
    draw: <Token x={296} y={70} w={220} label="AMI: shopviet-web" /> },
  { name: "Subnet", scope: "az", label: "AZ",
    text: <>Subnet <code>10.0.1.0/24</code> chỉ nằm trong AZ a. Muốn chịu được sự cố một AZ, bạn phải tạo subnet ở ít nhất hai AZ.</>,
    draw: <>
      <rect className="zone pop" x={58} y={170} width={124} height={108} rx={8} />
      <text className="zone-t" x={120} y={188} textAnchor="middle">subnet 10.0.1.0/24</text>
    </> },
  { name: "NAT Gateway", scope: "az", label: "AZ",
    text: <>NAT gateway được tạo trong public subnet của một AZ cụ thể. Nếu cả 3 AZ dùng chung một NAT gateway thì AZ đó sập kéo theo các AZ kia mất internet. Cách đúng: mỗi AZ một NAT gateway, mỗi AZ một route table riêng.</>,
    draw: <>{AZS.map((az) => <Token key={az.n} x={az.x + 20} y={200} w={100} label="NAT gateway" ghost={az.n !== "a"} />)}</> },
  { name: "EC2", scope: "az", label: "AZ",
    text: <>Server <code>web-1</code> chạy trong một subnet, nên nằm trong đúng một AZ. AZ đó sập thì server sập theo. Cảnh 3 sẽ cho bạn thấy điều này.</>,
    draw: <Token x={70} y={200} w={100} label="EC2: web-1" /> },
  { name: "EBS", scope: "az", label: "AZ",
    text: <>Ổ đĩa EBS chỉ gắn được vào server trong cùng AZ. Muốn mang sang AZ khác: tạo snapshot rồi tạo volume mới từ snapshot.</>,
    draw: <>
      <Token x={70} y={196} w={100} label="EC2: web-1" />
      <line x1={120} y1={220} x2={120} y2={238} stroke="var(--accent)" strokeWidth={2} />
      <Token x={70} y={238} w={100} label="EBS: 20 GiB" ghost />
    </> },
];

const userIcon = (y: number) => (
  <g key={y} transform={`translate(704 ${y})`}>
    <circle className="user" cy={-7} r={5} />
    <path className="user" d="M-9 9 a9 9 0 0 1 18 0 z" />
  </g>
);

export default function ScopeExplorer() {
  const [active, setActive] = useState("EC2");
  const svc = SERVICES.find((s) => s.name === active)!;
  const hl = (scope: Scope) => (svc.scope === scope ? "hl" : undefined);

  return (
    <div className="stage">
      <div className="stage-bar" role="group" aria-label="Chọn tài nguyên">
        {SERVICES.map((s) => (
          <button key={s.name} className="btn" aria-pressed={s.name === active} onClick={() => setActive(s.name)}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 400" role="img" aria-label="Một Region với 3 AZ và các Edge location; tài nguyên được chọn hiển thị ở đúng phạm vi">
          <g className={hl("global")}>
            <rect className="frame" x={8} y={8} width={744} height={384} rx={14} />
            <text className="t" x={24} y={32}>Mạng toàn cầu của AWS</text>
            <text className="ts" x={24} y={48}>Global</text>
          </g>
          <g className={hl("region")}>
            <rect className="region" x={30} y={62} width={510} height={312} rx={12} />
            <text className="t" x={48} y={88}>Region · Singapore</text>
            <text className="ts" x={48} y={104}>ap-southeast-1</text>
            <text className="ts" x={285} y={360} textAnchor="middle">Các AZ nối với nhau bằng mạng riêng, độ trễ thấp</text>
          </g>
          <g className={hl("az")}>
            {AZS.map(({ n, x }) => (
              <g key={n}>
                <rect className="az" x={x} y={120} width={140} height={220} rx={10} />
                <text className="t" x={x + 14} y={144}>AZ {n}</text>
                <text className="ts" x={x + 14} y={160}>ap-southeast-1{n}</text>
                <text className="ts" x={x + 70} y={286} textAnchor="middle">data center</text>
                <g transform={`translate(${x + 26} 290)`}>
                  <rect className="dc" width={88} height={40} rx={4} />
                  {[12, 22, 32].map((y) => <line key={y} className="dc-line" x1={10} y1={y} x2={78} y2={y} />)}
                </g>
              </g>
            ))}
          </g>
          <g className={hl("edge")}>
            <path d="M540 200 C 580 200, 590 130, 628 128" fill="none" stroke="var(--edge)" strokeWidth={1.5} strokeDasharray="4 4" />
            <path d="M540 240 C 590 240, 600 220, 628 220" fill="none" stroke="var(--edge)" strokeWidth={1.5} strokeDasharray="4 4" />
            <path d="M540 280 C 580 280, 590 312, 628 312" fill="none" stroke="var(--edge)" strokeWidth={1.5} strokeDasharray="4 4" />
            {EDGE_Y.map((y) => <circle key={y} className="edge-dot" cx={640} cy={y} r={11} />)}
            <text className="edge-t" x={606} y={104}>Edge location</text>
          </g>
          <g aria-hidden="true">
            {EDGE_Y.map(userIcon)}
            <text className="ts" x={704} y={344} textAnchor="middle">Khách</text>
          </g>
          {/* key re-mounts the overlay so the pop animation replays */}
          <g key={active}>{svc.draw}</g>
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <strong>{svc.name} · {svc.label}</strong>
        {svc.text}
      </div>
    </div>
  );
}
