import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./iac-sims.css";

// The ShopViet web app on Elastic Beanstalk takes 45 minutes to install, so a new
// instance joins far too late when the environment scales out. Four ways to launch an
// instance race on the same clock. Only a golden AMI with the static part already
// installed, plus user data for the dynamic part, gets a correct instance in under
// 2 minutes.

type Seg = { kind: "boot" | "static" | "dynamic" | "fetch"; min: number };

interface Lane {
  id: string;
  name: Bi;
  segs: Seg[];
  /** The instance works at the end (all files are right). */
  works: boolean;
  note: Bi;
}

const LANES: Lane[] = [
  {
    id: "userdata",
    name: { vi: "User data cài đặt toàn bộ", en: "User data installs everything" },
    segs: [{ kind: "boot", min: 1 }, { kind: "static", min: 40 }, { kind: "dynamic", min: 0.7 }],
    works: true,
    note: { vi: "Cấu hình đúng nhưng chậm: mỗi instance mới phải cài đặt lại phần tĩnh trong 40 phút. Khi cần scale out khẩn cấp, instance mới sẵn sàng quá muộn.", en: "Correct configuration but slow: every new instance must reinstall the static part for 40 minutes. When an urgent scale-out is needed, new instances are ready far too late." },
  },
  {
    id: "s3",
    name: { vi: "Bộ cài đặt lưu sẵn trên S3", en: "Installer stored on S3" },
    segs: [{ kind: "boot", min: 1 }, { kind: "fetch", min: 1 }, { kind: "static", min: 38 }, { kind: "dynamic", min: 0.7 }],
    works: true,
    note: { vi: "Thời gian tải giảm không đáng kể, vì phần lớn thời gian dành cho **cài đặt**, không phải tải xuống. Tổng thời gian vẫn trên 40 phút.", en: "The time saved is negligible, because most of the time goes to **installing**, not downloading. The total is still over 40 minutes." },
  },
  {
    id: "ami",
    name: { vi: "Golden AMI chứa toàn bộ", en: "Golden AMI with everything" },
    segs: [{ kind: "boot", min: 1 }],
    works: false,
    note: { vi: "Khởi động rất nhanh, nhưng các file động (cấu hình theo môi trường, theo từng instance) đã bị cố định tại thời điểm tạo AMI. Instance chạy với cấu hình sai.", en: "Starts very fast, but the dynamic files (per-environment, per-instance configuration) were frozen when the AMI was created. The instance runs with the wrong configuration." },
  },
  {
    id: "golden",
    name: { vi: "Golden AMI + user data", en: "Golden AMI + user data" },
    segs: [{ kind: "boot", min: 1 }, { kind: "dynamic", min: 0.7 }],
    works: true,
    note: { vi: "**Golden AMI** đã cài sẵn phần tĩnh; **user data** chỉ tạo phần động khi khởi động. Thời gian dưới 2 phút và cấu hình chính xác. Elastic Beanstalk cho phép chỉ định custom AMI trong cấu hình environment.", en: "The **golden AMI** has the static part preinstalled; **user data** only creates the dynamic part at startup. Under 2 minutes, with the correct configuration. Elastic Beanstalk lets you specify a custom AMI in the environment configuration." },
  },
];

const KIND_TEXT: Record<Seg["kind"], Bi> = {
  boot: { vi: "khởi động", en: "boot" },
  static: { vi: "cài đặt phần tĩnh", en: "install static part" },
  dynamic: { vi: "tạo file động", en: "create dynamic files" },
  fetch: { vi: "tải từ S3", en: "download from S3" },
};
const total = (l: Lane) => l.segs.reduce((s, x) => s + x.min, 0);
const END = 45;
const TARGET = 2;
const X0 = 200;
const W = 520;
// Square-root scale so both a 2-minute and a 45-minute start are readable.
const px = (m: number) => X0 + Math.sqrt(Math.min(m, END) / END) * W;

export default function BootTimeSim() {
  const L = useLang();
  const alive = useRef(true);
  const [now, setNow] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState("golden");
  useEffect(() => () => { alive.current = false; }, []);

  function play() {
    if (busy) return;
    setBusy(true);
    setNow(0);
    if (prefersReducedMotion()) {
      setNow(END);
      setBusy(false);
      return;
    }
    const t0 = performance.now();
    const dur = 6000;
    const tick = (t: number) => {
      if (!alive.current) return;
      const p = Math.min(1, (t - t0) / dur);
      // Same square-root clock as the axis, so the bars grow at a steady speed on screen.
      setNow(p * p * END);
      if (p < 1) requestAnimationFrame(tick);
      else setBusy(false);
    };
    requestAnimationFrame(tick);
  }

  const lane = LANES.find((l) => l.id === sel)!;
  const laneDone = now >= total(lane);
  const LH = 44;
  const Y0 = 40;

  return (
    <div className="stage bts">
      <div className="stage-bar">
        <span className="label">Elastic Beanstalk scale out</span>
        <span className="count">{L({ vi: `Yêu cầu: instance mới phục vụ được request trong ${TARGET} phút`, en: `Requirement: new instances serve requests within ${TARGET} minutes` })}</span>
        <button className="btn primary bts-play" onClick={play} disabled={busy}>{L({ vi: "Khởi động 4 instance", en: "Launch 4 instances" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox={`0 0 820 ${Y0 + LANES.length * LH + 34}`} role="img" aria-label={L({ vi: "So sánh thời gian của bốn phương án khởi động instance trên cùng một trục thời gian", en: "Timing of four instance startup approaches compared on one time axis" })}>
          {[0, 2, 10, 20, 30, 45].map((m) => (
            <g key={m}>
              <line className="bts-grid" x1={px(m)} x2={px(m)} y1={Y0 - 6} y2={Y0 + LANES.length * LH} />
              <text className="ts" x={px(m)} y={Y0 + LANES.length * LH + 16} textAnchor="middle">{m} {L({ vi: "phút", en: "min" })}</text>
            </g>
          ))}
          <line className="bts-target" x1={px(TARGET)} x2={px(TARGET)} y1={Y0 - 14} y2={Y0 + LANES.length * LH} />
          <text className="bts-target-label" x={px(TARGET) + 6} y={Y0 - 16}>{L({ vi: "mục tiêu 2 phút", en: "target 2 min" })}</text>
          {LANES.map((l, i) => {
            const y = Y0 + i * LH;
            let start = 0;
            const finished = now >= total(l);
            return (
              <g
                key={l.id}
                className={"bts-lane" + (l.id === sel ? " on" : "")}
                role="button"
                tabIndex={0}
                aria-pressed={l.id === sel}
                onClick={() => setSel(l.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(l.id); } }}
              >
                <rect className="bts-hit" x={0} y={y} width={820} height={LH} />
                <text className="bts-name" x={X0 - 12} y={y + LH / 2 + 4} textAnchor="end">{L(l.name)}</text>
                {l.segs.map((s, k) => {
                  const a = start;
                  start += s.min;
                  if (now <= a) return null;
                  const b = Math.min(now, start);
                  return <rect key={k} className={"bts-seg " + s.kind} x={px(a)} y={y + 10} width={Math.max(1, px(b) - px(a))} height={LH - 20} rx={4} />;
                })}
                {finished && (
                  <text className={"bts-end " + (l.works && total(l) <= TARGET ? "ok" : "bad")} x={px(total(l)) + 8} y={y + LH / 2 + 4}>
                    {l.works ? L({ vi: `${total(l).toFixed(1).replace(".", ",")} phút`, en: `${total(l).toFixed(1)} min` }) : L({ vi: "khởi động nhanh, cấu hình sai", en: "fast start, wrong configuration" })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="bts-legend">
        {(Object.keys(KIND_TEXT) as Seg["kind"][]).map((k) => (
          <span key={k}><i className={"bts-sw " + k} />{L(KIND_TEXT[k])}</span>
        ))}
      </div>
      <div className="readout" aria-live="polite">
        <p className="bts-pick">{L({ vi: "Chọn một phương án để xem phân tích. Đang xem:", en: "Choose an approach to see the analysis. Viewing:" })} <b>{L(lane.name)}</b></p>
        {laneDone && now > 0 ? (
          <p className={"bts-result " + (lane.works && total(lane) <= TARGET ? "ok" : "bad")}>{rich(L(lane.note))}</p>
        ) : (
          <p className="bts-hint">{L({ vi: <>Chọn <b>Khởi động 4 instance</b> và chờ phương án này hoàn tất.</>, en: <>Choose <b>Launch 4 instances</b> and wait for this approach to finish.</> })}</p>
        )}
      </div>
    </div>
  );
}
