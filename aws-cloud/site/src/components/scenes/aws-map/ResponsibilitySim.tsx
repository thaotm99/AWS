import { useState } from "react";
import { useLang, type Bi } from "../../../lib/lang";
import "./aws-map.css";

// Bottom-up: each deployment model hands the lowest `aws` layers to AWS.
const TASKS: Bi[] = [
  { vi: "Toà nhà, nguồn điện, làm mát", en: "Building, power, cooling" },
  { vi: "Phần cứng máy chủ", en: "Server hardware" },
  { vi: "Mạng vật lý", en: "Physical network" },
  { vi: "Hệ điều hành, bản vá", en: "Operating system, patches" },
  { vi: "Cài đặt database", en: "Database installation" },
  { vi: "Backup, failover", en: "Backups, failover" },
  { vi: "Scaling theo tải", en: "Scaling with load" },
  { vi: "Code và dữ liệu", en: "Code and data" },
];

const LEVELS: { name: Bi; sub: Bi; aws: number; tag: string; text: Bi }[] = [
  {
    name: { vi: "Tự mua máy chủ", en: "Own servers" }, sub: { vi: "on-premises", en: "on premises" }, aws: 0, tag: "ON-PREMISES",
    text: { vi: "MFTech tự đảm nhận mọi phần việc, từ nguồn điện của data center tới bản vá hệ điều hành.", en: "MFTech handles every task itself, from data center power to operating system patches." },
  },
  {
    name: { vi: "Amazon EC2", en: "Amazon EC2" }, sub: { vi: "máy chủ ảo", en: "virtual server" }, aws: 3, tag: "INFRASTRUCTURE",
    text: { vi: "AWS vận hành data center và phần cứng. MFTech vẫn tự cài đặt, vá lỗi và sao lưu database trên EC2 instance.", en: "AWS runs the data center and hardware. MFTech still installs, patches and backs up the database on the EC2 instance." },
  },
  {
    name: { vi: "Amazon RDS", en: "Amazon RDS" }, sub: { vi: "managed service", en: "managed service" }, aws: 6, tag: "MANAGED SERVICE",
    text: { vi: "AWS vận hành cả database: cài đặt, vá lỗi, automated backup và failover. MFTech chọn cấu hình và quản lý dữ liệu.", en: "AWS also runs the database: installation, patching, automated backups and failover. MFTech picks the configuration and manages the data." },
  },
  {
    name: { vi: "Amazon DynamoDB", en: "Amazon DynamoDB" }, sub: { vi: "serverless", en: "serverless" }, aws: 7, tag: "SERVERLESS",
    text: { vi: "Không có máy chủ nào để quản lý: AWS tự mở rộng theo tải và tính tiền theo lượng sử dụng. MFTech chỉ lo code và dữ liệu.", en: "There is no server to manage: AWS scales with load and bills for actual use. MFTech looks after only code and data." },
  },
];

/** Lesson 0, part 1: who runs which layer as MFTech's order database moves from its own servers to serverless. */
export default function ResponsibilitySim() {
  const L = useLang();
  const [i, setI] = useState(2);
  const lv = LEVELS[i];
  const own = TASKS.length - lv.aws;
  return (
    <div className="am-stage">
      <p className="mb-3.5 mt-0 mx-0 text-[0.9rem] text-map-muted">{L({ vi: "Database đơn hàng của MFTech, bốn cách triển khai. Chọn một cách để xem phần việc nào chuyển sang AWS.", en: "MFTech's order database, four ways to run it. Pick one to see which tasks move to AWS." })}</p>
      <div className="relative mb-[18px] grid grid-cols-4 rounded-[24px] border border-map-line bg-map-panel p-[5px]" role="group" aria-label={L({ vi: "Cách triển khai", en: "Deployment model" })} style={{ ["--i" as string]: i }}>
        <span className="am-seg-thumb" aria-hidden="true" />
        {LEVELS.map((l, k) => (
          <button key={l.tag} type="button" className="am-seg-btn" aria-pressed={k === i} onClick={() => setI(k)}>
            <b className="text-[0.88rem] max-md:text-[0.74rem]">{L(l.name)}</b>
            <span className="text-[0.7rem] opacity-80 max-md:hidden">{L(l.sub)}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(220px,280px)] items-center gap-6 max-md:grid-cols-1">
        <ol className="am-tower m-0 flex list-none flex-col-reverse gap-1.5 p-0" aria-label={L({ vi: "Phần việc vận hành, từ hạ tầng lên ứng dụng", en: "Operating tasks, from infrastructure up to the application" })}>
          {TASKS.map((t, k) => (
            <li key={t.en} className={k < lv.aws ? "aws" : undefined} style={{ ["--d" as string]: `${k * 0.05}s` }}>
              {L(t)}
              <b>{k < lv.aws ? "AWS" : "MFTECH"}</b>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 text-[0.85rem] text-map-soft">
            <div className="am-gauge" style={{ ["--deg" as string]: `${(lv.aws / TASKS.length) * 360}deg` }}>
              <div className="grid size-[102px] place-items-center content-center rounded-[50%] bg-map-bg">
                <b key={i} className="animate-[am-pop_.45s_ease_both] font-mono text-[2.3rem] leading-none text-map-amber">{own}</b>
                <span className="text-[0.7rem] text-map-muted">/ {TASKS.length}</span>
              </div>
            </div>
            <span>{L({ vi: "phần việc MFTech tự thực hiện", en: "tasks MFTech does itself" })}</span>
          </div>
          <div className="flex animate-[am-pop_.45s_ease_both] flex-col gap-1.5 rounded-[24px] border border-map-line bg-map-panel px-4 py-3.5 text-[0.9rem] leading-[1.55]" key={i} aria-live="polite">
            <small className="font-mono text-[0.68rem] tracking-[0.1em] text-map-cyan">{lv.tag}</small>
            <span>{L(lv.text)}</span>
          </div>
          <div className="flex gap-4 text-[0.75rem] text-map-muted">
            <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-[4px] bg-map-cyan" />AWS</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-[4px] border-[1.5px] border-map-amber" />MFTech</span>
          </div>
        </div>
      </div>
    </div>
  );
}
