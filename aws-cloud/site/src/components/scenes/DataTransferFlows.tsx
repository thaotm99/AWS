import { useState, type ReactNode } from "react";

const FLOWS: { id: string; name: string; paid: boolean; d: string; text: ReactNode }[] = [
  { id: "in", name: "Internet → AWS", paid: false, d: "M120 96 C 160 150, 200 190, 244 196",
    text: <>Khách tải ảnh lên, gửi đơn hàng: dữ liệu <b>đi vào</b> AWS từ internet được miễn phí.</> },
  { id: "out", name: "AWS → Internet", paid: true, d: "M250 214 C 160 240, 80 180, 74 100",
    text: <>Trang web, ảnh trả về cho khách: dữ liệu <b>đi ra</b> internet bị tính phí theo GB. Với web nhiều người xem, đây thường là khoản data transfer lớn nhất. CloudFront có thể giúp giảm khoản này.</> },
  { id: "az", name: "AZ a ↔ AZ b", paid: true, d: "M332 200 H422",
    text: <>web-1 gọi sang web-2 hoặc database ở AZ khác: lưu lượng <b>qua ranh giới AZ</b> bị tính phí theo GB, cả chiều đi và chiều về. Giá thấp nhưng cộng dồn nhanh với hệ thống trao đổi nhiều.</> },
  { id: "region", name: "Singapore → Tokyo", paid: true, d: "M510 200 C 560 200, 590 202, 630 202",
    text: <>Sao lưu dữ liệu sang Region Tokyo: dữ liệu <b>giữa hai Region</b> bị tính phí, thường đắt hơn giữa hai AZ.</> },
];

function Server({ x, y, w, label }: { x: number; y: number; w: number; label: string }) {
  return (
    <g className="inst">
      <rect x={x} y={y} width={w} height={36} rx={6} />
      <text x={x + w / 2} y={y + 23} textAnchor="middle">{label}</text>
    </g>
  );
}

export default function DataTransferFlows() {
  const [active, setActive] = useState("out");
  const flow = FLOWS.find((f) => f.id === active)!;

  return (
    <>
      <div className="stage">
        <div className="stage-bar" role="group" aria-label="Chọn luồng dữ liệu">
          {FLOWS.map((f) => (
            <button key={f.id} className="btn" aria-pressed={f.id === active} onClick={() => setActive(f.id)}>
              {f.name}
            </button>
          ))}
        </div>
        <div className="svg-wrap">
          <svg viewBox="0 0 760 300" role="img" aria-label="Các luồng dữ liệu: từ internet vào, ra internet, giữa hai AZ, giữa hai Region">
            <defs>
              <marker id="mFree" viewBox="0 0 10 10" refX={7} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
                <path className="mk-free" d="M0 0 L10 5 L0 10 z" />
              </marker>
              <marker id="mPaid" viewBox="0 0 10 10" refX={7} refY={5} markerWidth={5} markerHeight={5} orient="auto-start-reverse">
                <path className="mk-paid" d="M0 0 L10 5 L0 10 z" />
              </marker>
            </defs>
            <path className="cloud" d="M48 92 a22 22 0 0 1 14 -40 a28 28 0 0 1 52 -6 a22 22 0 0 1 30 26 a18 18 0 0 1 -6 20 z" />
            <text className="t" x={94} y={80} textAnchor="middle">Internet</text>
            <rect className="region" x={196} y={96} width={364} height={190} rx={12} />
            <text className="t" x={212} y={118}>Region Singapore</text>
            <rect className="az" x={214} y={132} width={150} height={138} rx={8} />
            <text className="ts" x={226} y={150}>AZ a</text>
            <rect className="az" x={392} y={132} width={150} height={138} rx={8} />
            <text className="ts" x={404} y={150}>AZ b</text>
            <Server x={248} y={182} w={82} label="web-1" />
            <Server x={426} y={182} w={82} label="web-2" />
            <rect className="region" x={606} y={140} width={140} height={110} rx={12} />
            <text className="t" x={618} y={162}>Region Tokyo</text>
            <Server x={634} y={184} w={86} label="backup" />
            {FLOWS.map((f) => (
              <g key={f.id} className={"flow-g " + (f.id === active ? "active" : "dim")}>
                <path className={"flow " + (f.paid ? "paid" : "free")} d={f.d} markerEnd={`url(#${f.paid ? "mPaid" : "mFree"})`} />
                <path className="flow-hit" d={f.d} onClick={() => setActive(f.id)} />
              </g>
            ))}
          </svg>
        </div>
        <div className="readout" aria-live="polite">
          <strong>{flow.name} · {flow.paid ? "Tính phí" : "Miễn phí"}</strong>
          {flow.text}
        </div>
      </div>
      <div className="key" style={{ paddingTop: 8 }}>
        <span><i style={{ background: "var(--ok)" }} />Miễn phí</span>
        <span><i style={{ background: "var(--edge)" }} />Tính phí theo GB</span>
      </div>
    </>
  );
}
