import { useState, type ReactNode } from "react";

// Data transfer cost patterns exactly as the practice tests ask them.
type Node = { x: number; y: number; w: number; label: string; sub?: string; kind: "db" | "ec2" | "net" | "store" | "site" };
type Flow = { d: string; paid: boolean; heavy?: boolean; label: string; lx: number; ly: number };
type Option = { name: string; verdict: "cheap" | "costly"; flows: Flow[]; hide?: string[]; text: ReactNode };
type Pattern = {
  id: string; name: string; refs: string[];
  boxes: { x: number; y: number; w: number; h: number; label: string }[];
  nodes: Record<string, Node>;
  options: Option[];
};

const PATTERNS: Pattern[] = [
  {
    id: "replica", name: "RDS Read Replica", refs: ["exam2_q62"],
    boxes: [
      { x: 20, y: 30, w: 440, h: 200, label: "Region Singapore" },
      { x: 500, y: 30, w: 240, h: 200, label: "Region Tokyo" },
    ],
    nodes: {
      primary: { x: 50, y: 110, w: 130, label: "RDS primary", kind: "db" },
      local: { x: 300, y: 110, w: 130, label: "Read Replica", sub: "cùng Region", kind: "db" },
      remote: { x: 560, y: 110, w: 130, label: "Read Replica", sub: "khác Region", kind: "db" },
    },
    options: [
      { name: "Replica cùng Region", verdict: "cheap",
        flows: [{ d: "M180 132 H300", paid: false, label: "replication", lx: 240, ly: 122 }],
        text: <>Replication giữa primary và Read Replica <b>trong cùng Region không tính phí data transfer</b>. Bạn chỉ trả tiền instance của replica.</> },
      { name: "Replica khác Region", verdict: "costly",
        flows: [{ d: "M180 140 C 300 200, 450 200, 560 140", paid: true, label: "replication qua Region", lx: 370, ly: 205 }],
        text: <>Cross-Region Read Replica <b>có tính phí data transfer</b> cho dữ liệu replicate giữa hai Region.</> },
    ],
  },
  {
    id: "s3", name: "EC2 private → S3", refs: ["exam3_q47"],
    boxes: [
      { x: 20, y: 30, w: 470, h: 200, label: "VPC · cùng Region với S3" },
    ],
    nodes: {
      ec2: { x: 50, y: 110, w: 120, label: "EC2", sub: "private subnet", kind: "ec2" },
      nat: { x: 260, y: 60, w: 140, label: "NAT gateway", sub: "public subnet", kind: "net" },
      gwe: { x: 260, y: 160, w: 140, label: "Gateway endpoint", sub: "cho S3", kind: "net" },
      s3: { x: 590, y: 110, w: 120, label: "Amazon S3", sub: "cùng Region", kind: "store" },
    },
    options: [
      { name: "Đi qua NAT gateway", verdict: "costly", hide: ["gwe"],
        flows: [
          { d: "M170 125 C 210 110, 220 85, 260 82", paid: true, heavy: true, label: "", lx: 0, ly: 0 },
          { d: "M400 82 C 480 82, 520 125, 590 128", paid: true, heavy: true, label: "phí xử lý theo GB", lx: 500, ly: 92 },
        ],
        text: <>Mọi GB đọc ghi S3 đều đi qua NAT gateway và bị tính <b>phí xử lý dữ liệu của NAT gateway</b>. Với lưu lượng S3 lớn, khoản này rất đáng kể.</> },
      { name: "Dùng S3 gateway endpoint", verdict: "cheap", hide: ["nat"],
        flows: [
          { d: "M170 140 C 210 160, 220 182, 260 182", paid: false, heavy: true, label: "", lx: 0, ly: 0 },
          { d: "M400 182 C 480 182, 520 140, 590 136", paid: false, heavy: true, label: "không phí thêm", lx: 500, ly: 196 },
        ],
        text: <>Gateway endpoint cho S3 <b>không tính phí thêm</b>. Thêm route trong route table để traffic tới S3 đi qua endpoint thay vì NAT gateway, kèm endpoint policy nếu cần giới hạn quyền.</> },
    ],
  },
  {
    id: "dx", name: "Báo cáo về on-premises", refs: ["exam5_q2"],
    boxes: [
      { x: 20, y: 30, w: 440, h: 200, label: "Region AWS" },
      { x: 560, y: 30, w: 180, h: 200, label: "Văn phòng on-premises" },
    ],
    nodes: {
      dw: { x: 40, y: 110, w: 140, label: "Data warehouse", kind: "db" },
      tool: { x: 280, y: 110, w: 150, label: "Công cụ báo cáo", sub: "chạy trong AWS", kind: "ec2" },
      toolOnPrem: { x: 580, y: 70, w: 140, label: "Công cụ báo cáo", sub: "chạy on-prem", kind: "site" },
      user: { x: 580, y: 150, w: 140, label: "Nhân viên", sub: "xem trên trình duyệt", kind: "site" },
    },
    options: [
      { name: "Công cụ đặt on-prem", verdict: "costly", hide: ["tool", "user"],
        flows: [{ d: "M180 128 C 330 128, 450 92, 580 92", paid: true, heavy: true, label: "kết quả truy vấn lớn, qua Direct Connect", lx: 380, ly: 82 }],
        text: <>Mỗi truy vấn trả về khối dữ liệu lớn, tất cả đều là <b>data transfer out</b> từ AWS về on-premises.</> },
      { name: "Công cụ đặt cùng Region", verdict: "cheap", hide: ["toolOnPrem"],
        flows: [
          { d: "M180 132 H280", paid: false, heavy: true, label: "ở lại trong AWS", lx: 230, ly: 122 },
          { d: "M430 140 C 500 140, 520 172, 580 172", paid: true, label: "chỉ trang web nhỏ", lx: 505, ly: 196 },
        ],
        text: <>Truy vấn nặng nằm gọn trong Region. Chỉ các trang kết quả nhỏ đi về văn phòng qua Direct Connect, nên data transfer out giảm rất nhiều.</> },
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
  const [pi, setPi] = useState(0);
  const [oi, setOi] = useState(0);
  const p = PATTERNS[pi];
  const o = p.options[oi];

  return (
    <div className="stage">
      <div className="stage-bar" role="group" aria-label="Chọn dạng câu hỏi">
        <span className="label">Dạng đề</span>
        {PATTERNS.map((x, i) => (
          <button key={x.id} className="btn" aria-pressed={i === pi} onClick={() => { setPi(i); setOi(0); }}>{x.name}</button>
        ))}
      </div>
      <div className="stage-bar" role="group" aria-label="Chọn phương án">
        <span className="label">Phương án</span>
        {p.options.map((x, i) => (
          <button key={x.name} className="btn" aria-pressed={i === oi} onClick={() => setOi(i)}>{x.name}</button>
        ))}
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 250" role="img" aria-label={`${p.name}: ${o.name}`}>
          <defs>
            <marker id="cpFree" viewBox="0 0 10 10" refX={7} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path className="mk-free" d="M0 0 L10 5 L0 10 z" /></marker>
            <marker id="cpPaid" viewBox="0 0 10 10" refX={7} refY={5} markerWidth={5} markerHeight={5} orient="auto"><path className="mk-paid" d="M0 0 L10 5 L0 10 z" /></marker>
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
                  markerEnd={`url(#${f.paid ? "cpPaid" : "cpFree"})`} />
                {f.label && <text className={f.paid ? "flow-t paid" : "flow-t free"} x={f.lx} y={f.ly} textAnchor="middle">{f.label}</text>}
              </g>
            ))}
          </g>
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <strong>
          {o.name} · <span className={o.verdict === "cheap" ? "verdict ok" : "verdict bad"}>{o.verdict === "cheap" ? "Rẻ hơn, đề chọn" : "Tốn phí"}</span>
        </strong>
        {o.text}
        <p className="exam-refs" style={{ marginTop: 8 }}><span>Đề hỏi ở</span>{p.refs.map((r) => <code key={r}>{r}</code>)}</p>
      </div>
      <div className="key" style={{ padding: "0 16px 12px" }}>
        <span><i style={{ background: "var(--ok)" }} />Không tính phí data transfer</span>
        <span><i style={{ background: "var(--edge)" }} />Có tính phí theo GB</span>
      </div>
    </div>
  );
}
