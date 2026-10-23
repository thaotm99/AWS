import { useId, useState } from "react";
import { useLang, type Bi } from "../../../lib/lang";

// Monthly storage charge for the same data on S3, EFS and EBS, us-east-1 list prices from the
// AWS Price List API (AmazonS3, AmazonEFS, AmazonEC2 offer files, October 2026):
// S3 Standard $0.023/GB-month (first 50 TB), EFS Standard (Regional) $0.30, EFS One Zone $0.16,
// EBS gp3 $0.08 and gp2 $0.10 per GB-month of provisioned storage.
// S3 and EFS bill the data stored; EBS bills the provisioned volume size. Source question: exam1_q46.

const ROWS: { id: string; name: Bi; price: number; ebs?: boolean }[] = [
  { id: "s3", name: { vi: "S3 Standard", en: "S3 Standard" }, price: 0.023 },
  { id: "efs1z", name: { vi: "EFS One Zone", en: "EFS One Zone" }, price: 0.16 },
  { id: "efs", name: { vi: "EFS Standard (Regional)", en: "EFS Standard (Regional)" }, price: 0.3 },
  { id: "gp3", name: { vi: "EBS gp3 (cấp phát)", en: "EBS gp3 (provisioned)" }, price: 0.08, ebs: true },
  { id: "gp2", name: { vi: "EBS gp2 (cấp phát)", en: "EBS gp2 (provisioned)" }, price: 0.1, ebs: true },
];

export default function StorageBillSim() {
  const tr = useLang();
  const uid = useId().replace(/:/g, "");
  const [data, setData] = useState(1);
  const [vol, setVol] = useState(100);
  const money = (n: number) => "$" + n.toLocaleString(tr({ vi: "vi-VN", en: "en-US" }), { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 3 : 2 });
  const size = Math.max(vol, data);
  const cost = ROWS.map((r) => ({ ...r, usd: r.price * (r.ebs ? size : data) }));
  const max = Math.max(...cost.map((c) => c.usd));
  const sorted = [...cost].sort((a, b) => a.usd - b.usd);
  const order = sorted.map((c, i) => (i ? (Math.abs(c.usd - sorted[i - 1].usd) < 1e-9 ? " = " : " < ") : "") + tr(c.name)).join("");

  return (
    <div className="stage">
      <div className="stage-bar mt-3 border-t border-line">
        <label className="label" htmlFor={`${uid}-data`}>{tr({ vi: "Dữ liệu thực tế lưu trữ: ", en: "Data actually stored: " })}{data} GB</label>
        <input id={`${uid}-data`} type="range" min={1} max={500} step={1} value={data} onChange={(e) => setData(Number(e.target.value))} />
      </div>
      <div className="stage-bar mt-3 border-t border-line">
        <label className="label" htmlFor={`${uid}-vol`}>{tr({ vi: "Dung lượng EBS volume cấp phát: ", en: "Provisioned EBS volume size: " })}{size} GB</label>
        <input id={`${uid}-vol`} type="range" min={10} max={1000} step={10} value={vol} onChange={(e) => setVol(Number(e.target.value))} />
      </div>
      <div className="grid gap-2 px-3.5 py-3" aria-live="polite">
        {cost.map((c) => (
          <div key={c.id} className="grid grid-cols-[minmax(0,12rem)_minmax(0,1fr)_6rem] items-center gap-2 text-step--1 max-sm:grid-cols-[minmax(0,1fr)_5.5rem]">
            <span className="wrap-anywhere">{tr(c.name)}</span>
            <span className="h-3.5 overflow-hidden rounded-[4px] border border-line bg-bg max-sm:col-span-full max-sm:row-start-2"><span className={`h-full transition-[width] duration-300 ease-[ease] ${c.ebs ? "bg-edge" : "bg-accent"}`} style={{ display: "block", width: `${Math.max(1, (c.usd / max) * 100)}%` }} /></span>
            <b className="text-right font-mono text-[0.8rem]">{money(c.usd)}</b>
          </div>
        ))}
      </div>
      <div className="readout">
        <p className="m-0"><b>{tr({ vi: "Thứ tự chi phí lưu trữ mỗi tháng: ", en: "Monthly storage charge, lowest first: " })}</b>{order}.</p>
        <p className="note-small mx-0 mt-1.5 mb-0">{tr({
          vi: "Giá niêm yết us-east-1 (AWS Price List API, 10/2026), chỉ gồm phí lưu trữ: S3 và EFS tính theo dung lượng dữ liệu thực tế, EBS tính theo dung lượng volume cấp phát dù chưa ghi đầy. Chưa gồm phí request S3, phí đọc ghi của EFS Elastic throughput, IOPS/throughput cấp phát thêm của EBS. Giá thay đổi theo Region và thời điểm.",
          en: "us-east-1 list prices (AWS Price List API, 10/2026), storage only: S3 and EFS charge for the data actually stored, EBS charges for the provisioned volume size even when it is not full. Not included: S3 request charges, EFS Elastic throughput read/write charges, extra provisioned EBS IOPS or throughput. Prices vary by Region and over time.",
        })}</p>
      </div>
    </div>
  );
}
