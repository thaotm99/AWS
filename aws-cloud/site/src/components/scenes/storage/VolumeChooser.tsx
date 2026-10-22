import { useId, useState } from "react";
import { useLang } from "../../../lib/lang";

// EBS volume type from the requirements the tests give: IOPS (exam3_q27, exam5_q22),
// boot volume (exam1_q44), Multi-Attach (exam6_q24), cost (exam4_q15).
// Limits from ebs-volume-types.html: gp2 16,000, gp3 80,000, io1 64,000, io2 Block Express 256,000 IOPS.
type Pattern = "random" | "sequential";

export default function VolumeChooser() {
  const L = useLang();
  // Both language copies of the lesson render this component, so ids must be unique per instance.
  const uid = useId().replace(/:/g, "");
  const num = (n: number) => n.toLocaleString(L({ vi: "vi-VN", en: "en-US" }));
  const [iops, setIops] = useState(25000);
  const [pattern, setPattern] = useState<Pattern>("random");
  const [boot, setBoot] = useState(false);
  const [multi, setMulti] = useState(false);
  const [cold, setCold] = useState(false);

  let pick: string, why: string;
  if (multi) {
    pick = "Provisioned IOPS SSD (io1/io2)";
    why = L({ vi: "Multi-Attach (một volume gắn vào nhiều instance trong cùng AZ) chỉ được hỗ trợ trên Provisioned IOPS SSD.", en: "Multi-Attach (one volume attached to multiple instances in the same AZ) is supported only on Provisioned IOPS SSD." });
  } else if (pattern === "sequential" && !boot) {
    pick = cold ? "Cold HDD (sc1)" : "Throughput Optimized HDD (st1)";
    why = cold
      ? L({ vi: "Dữ liệu đọc tuần tự, ít truy cập: sc1 có chi phí thấp nhất trong các loại EBS.", en: "Sequentially read, infrequently accessed data: sc1 has the lowest cost of all EBS volume types." })
      : L({ vi: "Đọc ghi tuần tự khối dữ liệu lớn (big data, log): st1 cung cấp throughput cao với chi phí của HDD.", en: "Large sequential reads and writes (big data, logs): st1 delivers high throughput at HDD cost." });
  } else if (iops > 80000) {
    pick = "Provisioned IOPS SSD (io2 Block Express)";
    why = L({ vi: `Yêu cầu ${iops.toLocaleString("vi-VN")} IOPS, vượt mức tối đa 80.000 IOPS của gp3 và 64.000 IOPS của io1. io2 Block Express cấp phát được tới 256.000 IOPS (trên instance Nitro).`, en: `${num(iops)} IOPS required, above the maximum of 80,000 IOPS for gp3 and 64,000 IOPS for io1. io2 Block Express can provision up to 256,000 IOPS (on Nitro instances).` });
  } else if (iops > 16000) {
    pick = L({ vi: "gp3, hoặc io1/io2 nếu cần IOPS ổn định", en: "gp3, or io1/io2 if you need consistent IOPS" });
    why = L({ vi: `Yêu cầu ${iops.toLocaleString("vi-VN")} IOPS, vượt mức tối đa 16.000 IOPS của gp2 nhưng vẫn trong giới hạn 80.000 IOPS của gp3. Với database I/O lớn cần IOPS ổn định: Provisioned IOPS SSD (io1 tối đa 64.000 IOPS; io2 Block Express tối đa 256.000 IOPS, độ trễ dưới mili giây).`, en: `${num(iops)} IOPS required, above the gp2 maximum of 16,000 IOPS but within the gp3 limit of 80,000 IOPS. For I/O-intensive databases that need consistent IOPS: Provisioned IOPS SSD (io1 up to 64,000 IOPS; io2 Block Express up to 256,000 IOPS, sub-millisecond latency).` });
  } else {
    pick = L({ vi: "General Purpose SSD (gp3, hoặc gp2)", en: "General Purpose SSD (gp3, or gp2)" });
    why = L({ vi: "Phần lớn workload và boot volume: gp3 cân bằng giữa chi phí và hiệu năng (tối đa 80.000 IOPS; gp2 tối đa 16.000 IOPS). Chuyển sang loại có chi phí thấp hơn khi volume đang dùng Provisioned IOPS nhưng không có nhu cầu tương ứng.", en: "Most workloads and boot volumes: gp3 balances cost and performance (up to 80,000 IOPS; gp2 up to 16,000 IOPS). Move to a lower-cost type when a volume uses Provisioned IOPS without a matching need." });
  }
  const hddForBoot = boot && pattern === "sequential";

  return (
    <div className="stage">
      <div className="stage-bar">
        <label className="label" htmlFor={`${uid}-volIops`}>{L({ vi: "IOPS yêu cầu: ", en: "Required IOPS: " })}{num(iops)}</label>
        <input id={`${uid}-volIops`} type="range" min={1000} max={256000} step={1000} value={iops} onChange={(e) => setIops(Number(e.target.value))} />
      </div>
      <div className="stage-bar">
        <span className="label">{L({ vi: "Mẫu truy cập", en: "Access pattern" })}</span>
        <button className="btn" aria-pressed={pattern === "random"} onClick={() => setPattern("random")}>{L({ vi: "Ngẫu nhiên, khối nhỏ (database)", en: "Random, small blocks (database)" })}</button>
        <button className="btn" aria-pressed={pattern === "sequential"} onClick={() => setPattern("sequential")}>{L({ vi: "Tuần tự, khối lớn (log, big data)", en: "Sequential, large blocks (logs, big data)" })}</button>
      </div>
      <div className="stage-bar checks">
        <button className="btn check" aria-pressed={boot} onClick={() => setBoot(!boot)}><span className="box" aria-hidden="true">{boot ? "✓" : ""}</span>{L({ vi: "Dùng làm boot volume", en: "Use as boot volume" })}</button>
        <button className="btn check" aria-pressed={multi} onClick={() => setMulti(!multi)}><span className="box" aria-hidden="true">{multi ? "✓" : ""}</span>{L({ vi: "Gắn vào nhiều instance (Multi-Attach)", en: "Attach to multiple instances (Multi-Attach)" })}</button>
        <button className="btn check" aria-pressed={cold} onClick={() => setCold(!cold)}><span className="box" aria-hidden="true">{cold ? "✓" : ""}</span>{L({ vi: "Dữ liệu ít truy cập", en: "Infrequently accessed data" })}</button>
      </div>
      <div className="readout" aria-live="polite">
        <span className="label">{L({ vi: "Loại volume phù hợp", en: "Suitable volume type" })}</span>
        <strong className="picker-service" style={{ display: "block", margin: "2px 0 6px" }}>{pick}</strong>
        <p style={{ margin: 0 }}>{why}</p>
        {hddForBoot && <p className="note-small" style={{ color: "var(--bad)" }}>{L({ vi: "st1 và sc1 không dùng được làm boot volume; với boot volume, chỉ lựa chọn loại SSD.", en: "st1 and sc1 cannot be used as boot volumes; for a boot volume, choose only an SSD type." })}</p>}
      </div>
    </div>
  );
}
