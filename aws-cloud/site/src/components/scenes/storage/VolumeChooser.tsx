import { useState } from "react";

// EBS volume type from the requirements the tests give: IOPS (exam3_q27, exam5_q22),
// boot volume (exam1_q44), Multi-Attach (exam6_q24), cost (exam4_q15).
type Pattern = "random" | "sequential";

export default function VolumeChooser() {
  const [iops, setIops] = useState(25000);
  const [pattern, setPattern] = useState<Pattern>("random");
  const [boot, setBoot] = useState(false);
  const [multi, setMulti] = useState(false);
  const [cold, setCold] = useState(false);

  let pick: string, why: string;
  if (multi) {
    pick = "Provisioned IOPS SSD (io1/io2)";
    why = "Multi-Attach (một volume gắn vào nhiều instance cùng AZ) chỉ hỗ trợ Provisioned IOPS SSD.";
  } else if (pattern === "sequential" && !boot) {
    pick = cold ? "Cold HDD (sc1)" : "Throughput Optimized HDD (st1)";
    why = cold
      ? "Dữ liệu đọc tuần tự, ít truy cập: sc1 rẻ nhất trong các loại EBS."
      : "Đọc ghi tuần tự khối lớn (big data, log): st1 cho throughput cao với giá HDD.";
  } else if (iops > 16000) {
    pick = "Provisioned IOPS SSD (io1/io2)";
    why = `Cần ${iops.toLocaleString("vi-VN")} IOPS, vượt mức tối đa 16.000 IOPS của gp2/gp3. Database cần IOPS cao, ổn định: io1/io2.`;
  } else {
    pick = "General Purpose SSD (gp3, hoặc gp2)";
    why = "Phần lớn workload và boot volume: gp3 cân bằng giá và hiệu năng (tới 16.000 IOPS). Đổi sang loại rẻ hơn khi volume đang dùng Provisioned IOPS mà không cần.";
  }
  const hddForBoot = boot && pattern === "sequential";

  return (
    <div className="stage">
      <div className="stage-bar">
        <label className="label" htmlFor="volIops">IOPS cần: {iops.toLocaleString("vi-VN")}</label>
        <input id="volIops" type="range" min={1000} max={64000} step={1000} value={iops} onChange={(e) => setIops(Number(e.target.value))} />
      </div>
      <div className="stage-bar">
        <span className="label">Kiểu truy cập</span>
        <button className="btn" aria-pressed={pattern === "random"} onClick={() => setPattern("random")}>Ngẫu nhiên, khối nhỏ (database)</button>
        <button className="btn" aria-pressed={pattern === "sequential"} onClick={() => setPattern("sequential")}>Tuần tự, khối lớn (log, big data)</button>
      </div>
      <div className="stage-bar checks">
        <button className="btn check" aria-pressed={boot} onClick={() => setBoot(!boot)}><span className="box" aria-hidden="true">{boot ? "✓" : ""}</span>Làm boot volume</button>
        <button className="btn check" aria-pressed={multi} onClick={() => setMulti(!multi)}><span className="box" aria-hidden="true">{multi ? "✓" : ""}</span>Gắn vào nhiều instance (Multi-Attach)</button>
        <button className="btn check" aria-pressed={cold} onClick={() => setCold(!cold)}><span className="box" aria-hidden="true">{cold ? "✓" : ""}</span>Ít truy cập</button>
      </div>
      <div className="readout" aria-live="polite">
        <span className="label">Chọn</span>
        <strong className="picker-service" style={{ display: "block", margin: "2px 0 6px" }}>{pick}</strong>
        <p style={{ margin: 0 }}>{why}</p>
        {hddForBoot && <p className="note-small" style={{ color: "var(--bad)" }}>st1 và sc1 không dùng làm boot volume được, nên với boot volume chỉ chọn SSD.</p>}
      </div>
    </div>
  );
}
