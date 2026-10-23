// Source questions: exam2_q62, exam3_q47, exam5_q2.
import { useId, useState, type ReactNode } from "react";
import { useLang } from "../../lib/lang";

type Lang = ReturnType<typeof useLang>;

// Three places where MFTech pays for data transfer, each with a cheaper layout.
type Node = { x: number; y: number; w: number; label: string; sub?: string; kind: "db" | "ec2" | "net" | "store" | "site" };
type Flow = { d: string; paid: boolean; heavy?: boolean; label: string; lx: number; ly: number };
type Option = { name: string; verdict: "cheap" | "costly"; flows: Flow[]; hide?: string[]; text: ReactNode };
type Pattern = {
  id: string; name: string;
  boxes: { x: number; y: number; w: number; h: number; label: string }[];
  nodes: Record<string, Node>;
  options: Option[];
};

const patterns = (L: Lang): Pattern[] => [
  {
    id: "replica", name: "RDS Read Replica",
    boxes: [
      { x: 20, y: 30, w: 440, h: 200, label: L({ vi: "Region Singapore", en: "Singapore Region" }) },
      { x: 500, y: 30, w: 240, h: 200, label: L({ vi: "Region Tokyo", en: "Tokyo Region" }) },
    ],
    nodes: {
      primary: { x: 50, y: 110, w: 130, label: "RDS primary", kind: "db" },
      local: { x: 300, y: 110, w: 130, label: "Read Replica", sub: L({ vi: "cùng Region", en: "same Region" }), kind: "db" },
      remote: { x: 560, y: 110, w: 130, label: "Read Replica", sub: L({ vi: "khác Region", en: "other Region" }), kind: "db" },
    },
    options: [
      { name: L({ vi: "Replica cùng Region", en: "Replica in same Region" }), verdict: "cheap",
        flows: [{ d: "M180 132 H300", paid: false, label: "replication", lx: 240, ly: 122 }],
        text: L({ vi: <>Replication giữa primary và Read Replica <b>trong cùng Region không tính phí data transfer</b>. Replica được tính phí như một DB instance tiêu chuẩn.</>,
          en: <>Replication between the primary and a Read Replica <b>in the same Region has no data transfer charge</b>. The replica is billed as a standard DB instance.</> }) },
      { name: L({ vi: "Replica khác Region", en: "Replica in other Region" }), verdict: "costly",
        flows: [{ d: "M180 140 C 300 200, 450 200, 560 140", paid: true, label: L({ vi: "replication qua Region", en: "cross-Region replication" }), lx: 370, ly: 205 }],
        text: L({ vi: <>Cross-Region Read Replica <b>có tính phí data transfer</b> cho dữ liệu replicate giữa hai Region.</>,
          en: <>A cross-Region Read Replica <b>incurs data transfer charges</b> for the data replicated between the two Regions.</> }) },
    ],
  },
  {
    id: "s3", name: "EC2 private → S3",
    boxes: [
      { x: 20, y: 30, w: 470, h: 200, label: L({ vi: "VPC · cùng Region với S3", en: "VPC · same Region as S3" }) },
    ],
    nodes: {
      ec2: { x: 50, y: 110, w: 120, label: "EC2", sub: "private subnet", kind: "ec2" },
      nat: { x: 260, y: 60, w: 140, label: "NAT gateway", sub: "public subnet", kind: "net" },
      gwe: { x: 260, y: 160, w: 140, label: "Gateway endpoint", sub: L({ vi: "cho S3", en: "for S3" }), kind: "net" },
      s3: { x: 590, y: 110, w: 120, label: "Amazon S3", sub: L({ vi: "cùng Region", en: "same Region" }), kind: "store" },
    },
    options: [
      { name: L({ vi: "Thông qua NAT gateway", en: "Through NAT gateway" }), verdict: "costly", hide: ["gwe"],
        flows: [
          { d: "M170 125 C 210 110, 220 85, 260 82", paid: true, heavy: true, label: "", lx: 0, ly: 0 },
          { d: "M400 82 C 480 82, 520 125, 590 128", paid: true, heavy: true, label: L({ vi: "phí xử lý theo GB", en: "per-GB processing charge" }), lx: 500, ly: 92 },
        ],
        text: L({ vi: <>Mọi GB dữ liệu đọc ghi S3 đều đi qua NAT gateway và bị tính <b>phí xử lý dữ liệu của NAT gateway</b>. Với lưu lượng S3 lớn, khoản phí này đáng kể.</>,
          en: <>Every GB read from or written to S3 goes through the NAT gateway and incurs the <b>NAT gateway data processing charge</b>. With high S3 traffic, this charge is significant.</> }) },
      { name: L({ vi: "Sử dụng S3 gateway endpoint", en: "Use S3 gateway endpoint" }), verdict: "cheap", hide: ["nat"],
        flows: [
          { d: "M170 140 C 210 160, 220 182, 260 182", paid: false, heavy: true, label: "", lx: 0, ly: 0 },
          { d: "M400 182 C 480 182, 520 140, 590 136", paid: false, heavy: true, label: L({ vi: "không tính phí thêm", en: "no additional charge" }), lx: 500, ly: 196 },
        ],
        text: L({ vi: <>Gateway endpoint cho S3 <b>không tính phí bổ sung</b>. Bổ sung route trong route table để traffic tới S3 đi qua endpoint thay cho NAT gateway, kèm endpoint policy khi cần giới hạn quyền truy cập.</>,
          en: <>A gateway endpoint for S3 <b>has no additional charge</b>. Add a route in the route table so that traffic to S3 goes through the endpoint instead of the NAT gateway, with an endpoint policy when access must be restricted.</> }) },
    ],
  },
  {
    id: "dx", name: L({ vi: "Báo cáo tại on-premises", en: "Reporting on premises" }),
    boxes: [
      { x: 20, y: 30, w: 440, h: 200, label: L({ vi: "Region AWS", en: "AWS Region" }) },
      { x: 560, y: 30, w: 180, h: 200, label: L({ vi: "Văn phòng on-premises", en: "On-premises office" }) },
    ],
    nodes: {
      dw: { x: 40, y: 110, w: 140, label: "Data warehouse", kind: "db" },
      tool: { x: 280, y: 110, w: 150, label: L({ vi: "Công cụ báo cáo", en: "Reporting tool" }), sub: L({ vi: "triển khai trong AWS", en: "deployed in AWS" }), kind: "ec2" },
      toolOnPrem: { x: 580, y: 70, w: 140, label: L({ vi: "Công cụ báo cáo", en: "Reporting tool" }), sub: L({ vi: "triển khai on-premises", en: "deployed on premises" }), kind: "site" },
      user: { x: 580, y: 150, w: 140, label: L({ vi: "Nhân viên", en: "Staff" }), sub: L({ vi: "truy cập qua trình duyệt", en: "access via browser" }), kind: "site" },
    },
    options: [
      { name: L({ vi: "Công cụ tại on-premises", en: "Tool on premises" }), verdict: "costly", hide: ["tool", "user"],
        flows: [{ d: "M180 128 C 330 128, 450 92, 580 92", paid: true, heavy: true, label: L({ vi: "kết quả truy vấn lớn qua Direct Connect", en: "large query results over Direct Connect" }), lx: 380, ly: 82 }],
        text: L({ vi: <>Mỗi truy vấn trả về khối dữ liệu lớn, toàn bộ được tính là <b>data transfer out</b> từ AWS về on-premises.</>,
          en: <>Each query returns a large block of data, all of which is billed as <b>data transfer out</b> from AWS to on premises.</> }) },
      { name: L({ vi: "Công cụ trong cùng Region", en: "Tool in same Region" }), verdict: "cheap", hide: ["toolOnPrem"],
        flows: [
          { d: "M180 132 H280", paid: false, heavy: true, label: L({ vi: "lưu lượng nằm trong AWS", en: "stays in AWS" }), lx: 230, ly: 122 },
          { d: "M430 140 C 500 140, 520 172, 580 172", paid: true, label: L({ vi: "chỉ trang kết quả nhỏ", en: "small results only" }), lx: 505, ly: 196 },
        ],
        text: L({ vi: <>Các truy vấn có khối lượng lớn được xử lý trong Region. Chỉ các trang kết quả dung lượng nhỏ được truyền về văn phòng qua Direct Connect, nhờ đó data transfer out giảm đáng kể. Dữ liệu đi qua kết nối Direct Connect được tính theo <b>đơn giá Direct Connect data transfer</b>, thấp hơn đơn giá data transfer qua internet (đơn giá cụ thể phụ thuộc Region nguồn và Direct Connect location).</>,
          en: <>Large queries are processed within the Region. Only small result pages are sent to the office over Direct Connect, which greatly reduces data transfer out. Data sent over the Direct Connect connection is charged at the <b>reduced AWS Direct Connect data transfer rate</b> rather than internet data transfer rates (the exact rate depends on the source Region and the Direct Connect location).</> }) },
      { name: L({ vi: "Công cụ trong Region, truy cập qua internet", en: "Tool in same Region, over the internet" }), verdict: "costly", hide: ["toolOnPrem"],
        flows: [
          { d: "M180 132 H280", paid: false, heavy: true, label: L({ vi: "lưu lượng nằm trong AWS", en: "stays in AWS" }), lx: 230, ly: 122 },
          { d: "M430 150 C 480 212, 540 212, 580 182", paid: true, label: L({ vi: "trang kết quả qua internet", en: "result pages over the internet" }), lx: 505, ly: 222 },
        ],
        text: L({ vi: <>Lượng dữ liệu truyền ra vẫn chỉ là các trang kết quả nhỏ, nhưng đi qua internet nên được tính theo <b>đơn giá data transfer out ra internet</b> của EC2, cao hơn đơn giá Direct Connect data transfer. Khi MFTech đã có Direct Connect, truy cập công cụ qua Direct Connect cho chi phí data transfer out thấp nhất.</>,
          en: <>The outbound volume is still only small result pages, but it crosses the internet, so it is billed at the EC2 <b>data transfer out to the internet</b> rate, which is higher than the Direct Connect data transfer rate. When MFTech already has Direct Connect, reaching the tool over Direct Connect gives the lowest data transfer out cost.</> }) },
    ],
  },
];

function NodeBox({ n }: { n: Node }) {
  return (
    <g className={`res res-${n.kind}`}>
      <rect x={n.x} y={n.y} width={n.w} height={n.sub ? 46 : 40} rx={7} />
      <text className="res-t" x={n.x + n.w / 2} y={n.y + (n.sub ? 20 : 25)} textAnchor="middle">{n.label}</text>
      {n.sub && <text className="res-s" x={n.x + n.w / 2} y={n.y + 36} textAnchor="middle">{n.sub}</text>}
    </g>
  );
}

export default function CostPatterns() {
  const L = useLang();
  // Both language copies of the lesson render this component, so ids must be unique per instance.
  const uid = useId().replace(/:/g, "");
  const PATTERNS = patterns(L);
  const [pi, setPi] = useState(0);
  const [oi, setOi] = useState(0);
  const p = PATTERNS[pi];
  const o = p.options[oi];

  return (
    <div className="stage">
      <div className="stage-bar" role="group" aria-label={L({ vi: "Chọn tình huống", en: "Choose a scenario" })}>
        <span className="label">{L({ vi: "Tình huống", en: "Scenario" })}</span>
        {PATTERNS.map((x, i) => (
          <button key={x.id} className="btn" aria-pressed={i === pi} onClick={() => { setPi(i); setOi(0); }}>{x.name}</button>
        ))}
      </div>
      <div className="stage-bar" role="group" aria-label={L({ vi: "Chọn phương án", en: "Choose an option" })}>
        <span className="label">{L({ vi: "Phương án", en: "Option" })}</span>
        {p.options.map((x, i) => (
          <button key={x.name} className="btn" aria-pressed={i === oi} onClick={() => setOi(i)}>{x.name}</button>
        ))}
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 250" role="img" aria-label={`${p.name}: ${o.name}`}>
          <defs>
            <marker id={`${uid}-cpFree`} viewBox="0 0 10 10" refX={7} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path className="mk-free" d="M0 0 L10 5 L0 10 z" /></marker>
            <marker id={`${uid}-cpPaid`} viewBox="0 0 10 10" refX={7} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path className="mk-paid" d="M0 0 L10 5 L0 10 z" /></marker>
          </defs>
          {p.boxes.map((b) => (
            <g key={b.label}>
              <rect className="region" x={b.x} y={b.y} width={b.w} height={b.h} rx={12} />
              <text className="t" x={b.x + 16} y={b.y + 24}>{b.label}</text>
            </g>
          ))}
          {Object.entries(p.nodes).filter(([k]) => !o.hide?.includes(k)).map(([k, n]) => <NodeBox key={k} n={n} />)}
          <g key={`${pi}-${oi}`}>
            {o.flows.map((f, i) => (
              <g key={i}>
                <path className={"flow " + (f.paid ? "paid" : "free") + (f.heavy ? " heavy" : "")} d={f.d}
                  markerEnd={`url(#${uid}-${f.paid ? "cpPaid" : "cpFree"})`} />
                {f.label && <text className={f.paid ? "flow-t paid" : "flow-t free"} x={f.lx} y={f.ly} textAnchor="middle">{f.label}</text>}
              </g>
            ))}
          </g>
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <strong>
          {o.name} · <span className={o.verdict === "cheap" ? "verdict ok" : "verdict bad"}>{o.verdict === "cheap" ? L({ vi: "Phương án tối ưu chi phí", en: "Cost-optimized option" }) : L({ vi: "Phát sinh chi phí", en: "Incurs charges" })}</span>
        </strong>
        {o.text}
      </div>
      <div className="key px-4 pb-3">
        <span><i className="bg-ok" />{L({ vi: "Không tính phí data transfer", en: "No data transfer charge" })}</span>
        <span><i className="bg-edge" />{L({ vi: "Có tính phí theo GB", en: "Charged per GB" })}</span>
      </div>
    </div>
  );
}
