import { useState, type ReactNode } from "react";
import { useLang, type Bi } from "../../lib/lang";

type Scope = "global" | "region" | "az" | "edge";

const AZS = [
  { n: "a", x: 50 },
  { n: "b", x: 212 },
  { n: "c", x: 374 },
];
const EDGE_Y = [128, 220, 312];


function Token({ x, y, w, label, ghost }: { x: number; y: number; w: number; label: string | Bi; ghost?: boolean }) {
  const L = useLang();
  return (
    <g className={"tok pop" + (ghost ? " ghost" : "")}>
      <rect x={x} y={y} width={w} height={24} rx={5} />
      <text x={x + w / 2} y={y + 16} textAnchor="middle">{typeof label === "string" ? label : L(label)}</text>
    </g>
  );
}

const replicas = AZS.map((az) => <Token key={az.n} x={az.x + 20} y={200} w={100} label={{ vi: "bản sao dữ liệu", en: "data copy" }} ghost />);

const SERVICES: { name: string; scope: Scope; label: string; text: Bi<ReactNode>; draw: ReactNode }[] = [
  { name: "IAM", scope: "global", label: "Global",
    text: { vi: <>Role <code>mftech-app</code> được tạo một lần và sử dụng được tại mọi Region. IAM không có phiên bản riêng cho từng Region như Singapore hay Tokyo.</>,
      en: <>The role <code>mftech-app</code> is created once and can be used in every Region. IAM has no separate copy per Region such as Singapore or Tokyo.</> },
    draw: <Token x={250} y={18} w={190} label="IAM role: mftech-app" /> },
  { name: "Route 53", scope: "global", label: "Global",
    text: { vi: <>Tên miền <code>mftech.vn</code> được phân giải bởi Route 53 Public DNS, có data plane phân bố tại các point of presence (edge location) trên toàn cầu; control plane đặt tại us-east-1.</>,
      en: <>The domain <code>mftech.vn</code> is resolved by Route 53 Public DNS, whose data plane is distributed across points of presence (edge locations) worldwide; the control plane is in us-east-1.</> },
    draw: <Token x={560} y={46} w={180} label="Route 53: mftech.vn" /> },
  { name: "S3", scope: "region", label: "Region",
    text: { vi: <>Bucket <code>mftech-images</code> thuộc Region Singapore. AWS tự động lưu dữ liệu trên nhiều AZ (với các storage class thông thường), không yêu cầu cấu hình bổ sung.</>,
      en: <>The bucket <code>mftech-images</code> belongs to the Singapore Region. AWS automatically stores data across multiple AZs (for the standard storage classes), with no additional configuration required.</> },
    draw: <><Token x={296} y={70} w={220} label="S3: mftech-images" />{replicas}</> },
  { name: "VPC", scope: "region", label: "Region",
    text: { vi: <>VPC <code>10.0.0.0/16</code> trải trên mọi AZ của Region. Bên trong VPC, dải địa chỉ được chia thành các subnet, và mỗi subnet chỉ nằm trong một AZ.</>,
      en: <>The VPC <code>10.0.0.0/16</code> spans every AZ of the Region. Inside the VPC, the address range is divided into subnets, and each subnet resides in only one AZ.</> },
    draw: <>
      <rect className="zone pop" x={40} y={112} width={490} height={236} rx={12} />
      <text className="zone-t" x={516} y={128} textAnchor="end">VPC 10.0.0.0/16</text>
    </> },
  { name: "EFS", scope: "region", label: "Region",
    text: { vi: <>EFS file system là tài nguyên cấp Region, có mount target tại từng AZ nên EC2 instance ở bất kỳ AZ nào cũng mount được. EC2 instance tại Region khác vẫn truy cập được thông qua inter-region VPC peering, không cần copy dữ liệu.</>,
      en: <>An EFS file system is a Regional resource with a mount target in each AZ, so EC2 instances in any AZ can mount it. Instances in another Region can still access it through inter-Region VPC peering, without copying data.</> },
    draw: <><Token x={296} y={70} w={220} label="EFS: mftech-shared" />{AZS.map((az) => <Token key={az.n} x={az.x + 20} y={200} w={100} label="mount target" ghost />)}</> },
  { name: "AMI", scope: "region", label: "Region",
    text: { vi: <>AMI <code>mftech-web</code> chỉ sử dụng được trong Region nơi AMI được tạo, nhưng sử dụng được tại mọi AZ của Region đó. Để launch tại Region khác, AMI phải được copy sang Region đích (Phần 1).</>,
      en: <>The AMI <code>mftech-web</code> can be used only in the Region where it was created, but in every AZ of that Region. To launch in another Region, the AMI must be copied to the destination Region (Part 1).</> },
    draw: <Token x={296} y={70} w={220} label="AMI: mftech-web" /> },
  { name: "Subnet", scope: "az", label: "AZ",
    text: { vi: <>Subnet <code>10.0.1.0/24</code> chỉ nằm trong AZ a. Để chịu được sự cố của một AZ, subnet phải được tạo tại ít nhất hai AZ.</>,
      en: <>The subnet <code>10.0.1.0/24</code> resides only in AZ a. To tolerate the failure of one AZ, subnets must be created in at least two AZs.</> },
    draw: <>
      <rect className="zone pop" x={58} y={170} width={124} height={108} rx={8} />
      <text className="zone-t" x={120} y={188} textAnchor="middle">subnet 10.0.1.0/24</text>
    </> },
  { name: "NAT Gateway", scope: "az", label: "AZ",
    text: { vi: <>Public NAT gateway ở chế độ zonal được tạo trong public subnet của một AZ cụ thể. Nếu cả 3 AZ dùng chung một NAT gateway, sự cố tại AZ chứa NAT gateway sẽ làm các AZ còn lại mất kết nối internet. Cấu hình đúng: mỗi AZ một NAT gateway và một route table riêng, hoặc sử dụng NAT gateway ở chế độ regional (tự động mở rộng sang các AZ có workload).</>,
      en: <>A public NAT gateway in zonal mode is created in the public subnet of a specific AZ. If all 3 AZs share one NAT gateway, a failure in the AZ that contains the NAT gateway cuts internet access for the other AZs. Correct configuration: one NAT gateway and a separate route table per AZ, or a NAT gateway in regional mode (automatically expands to the AZs that have workloads).</> },
    draw: <>{AZS.map((az) => <Token key={az.n} x={az.x + 20} y={200} w={100} label="NAT gateway" ghost={az.n !== "a"} />)}</> },
  { name: "EC2", scope: "az", label: "AZ",
    text: { vi: <>EC2 instance <code>web-1</code> chạy trong một subnet nên nằm trong đúng một AZ. Khi AZ đó gặp sự cố, instance cũng ngừng hoạt động. Phần 3 minh hoạ trường hợp này.</>,
      en: <>The EC2 instance <code>web-1</code> runs in a subnet, so it resides in exactly one AZ. When that AZ fails, the instance also stops working. Part 3 illustrates this case.</> },
    draw: <Token x={70} y={200} w={100} label="EC2: web-1" /> },
  { name: "EBS", scope: "az", label: "AZ",
    text: { vi: <>EBS volume chỉ attach được vào EC2 instance trong cùng AZ. Để chuyển sang AZ khác: tạo snapshot, sau đó tạo volume mới từ snapshot.</>,
      en: <>An EBS volume can be attached only to an EC2 instance in the same AZ. To move it to another AZ: create a snapshot, then create a new volume from the snapshot.</> },
    draw: <>
      <Token x={70} y={196} w={100} label="EC2: web-1" />
      <line className="stroke-accent stroke-2" x1={120} y1={220} x2={120} y2={238} />
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
  const L = useLang();
  const svc = SERVICES.find((s) => s.name === active)!;
  const hl = (scope: Scope) => (svc.scope === scope ? "hl" : undefined);

  return (
    <div className="stage">
      <div className="stage-bar" role="group" aria-label={L({ vi: "Chọn tài nguyên", en: "Choose a resource" })}>
        {SERVICES.map((s) => (
          <button key={s.name} className="btn" aria-pressed={s.name === active} onClick={() => setActive(s.name)}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 400" role="img" aria-label={L({ vi: "Một Region với 3 AZ và các Edge location; tài nguyên được chọn hiển thị ở đúng phạm vi", en: "A Region with 3 AZs and edge locations; the selected resource is shown at its scope" })}>
          <g className={hl("global")}>
            <rect className="frame" x={8} y={8} width={744} height={384} rx={14} />
            <text className="t" x={24} y={32}>{L({ vi: "Mạng toàn cầu của AWS", en: "AWS global network" })}</text>
            <text className="ts" x={24} y={48}>Global</text>
          </g>
          <g className={hl("region")}>
            <rect className="region" x={30} y={62} width={510} height={312} rx={12} />
            <text className="t" x={48} y={88}>Region · Singapore</text>
            <text className="ts" x={48} y={104}>ap-southeast-1</text>
            <text className="ts" x={285} y={360} textAnchor="middle">{L({ vi: "Các AZ kết nối với nhau bằng mạng riêng có độ trễ thấp", en: "AZs are connected by a private low-latency network" })}</text>
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
            <path d="M540 200 C 580 200, 590 130, 628 128" className="fill-none stroke-edge stroke-[1.5]" strokeDasharray="4 4" />
            <path d="M540 240 C 590 240, 600 220, 628 220" className="fill-none stroke-edge stroke-[1.5]" strokeDasharray="4 4" />
            <path d="M540 280 C 580 280, 590 312, 628 312" className="fill-none stroke-edge stroke-[1.5]" strokeDasharray="4 4" />
            {EDGE_Y.map((y) => <circle key={y} className="edge-dot" cx={640} cy={y} r={11} />)}
            <text className="edge-t" x={606} y={104}>Edge location</text>
          </g>
          <g aria-hidden="true">
            {EDGE_Y.map(userIcon)}
            <text className="ts" x={704} y={344} textAnchor="middle">{L({ vi: "Người dùng", en: "Users" })}</text>
          </g>
          {/* key re-mounts the overlay so the pop animation replays */}
          <g key={active}>{svc.draw}</g>
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <strong>{svc.name} · {svc.label}</strong>
        {L(svc.text)}
      </div>
    </div>
  );
}
