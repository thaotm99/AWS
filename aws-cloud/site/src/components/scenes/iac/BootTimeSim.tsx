import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import "./iac-sims.css";

// The ShopViet web app on Elastic Beanstalk takes 45 minutes to install, so a new
// instance joins far too late when the environment scales out. Four ways to launch an
// instance race on the same clock. Only a golden AMI with the static part already
// installed, plus user data for the dynamic part, gets a correct instance in under
// 2 minutes.

type Seg = { kind: "boot" | "static" | "dynamic" | "fetch"; min: number };

interface Lane {
  id: string;
  name: string;
  segs: Seg[];
  /** The instance works at the end (all files are right). */
  works: boolean;
  note: string;
}

const LANES: Lane[] = [
  {
    id: "userdata",
    name: "User data cài toàn bộ",
    segs: [{ kind: "boot", min: 1 }, { kind: "static", min: 40 }, { kind: "dynamic", min: 0.7 }],
    works: true,
    note: "Đúng nhưng chậm: mỗi instance mới lại cài lại 40 phút phần tĩnh. Lúc cần scale out gấp thì máy mới tới quá muộn.",
  },
  {
    id: "s3",
    name: "Để sẵn file cài trên S3",
    segs: [{ kind: "boot", min: 1 }, { kind: "fetch", min: 1 }, { kind: "static", min: 38 }, { kind: "dynamic", min: 0.7 }],
    works: true,
    note: "Tải nhanh hơn một chút, nhưng phần lớn thời gian là **cài**, không phải tải. Vẫn hơn 40 phút.",
  },
  {
    id: "ami",
    name: "Golden AMI chứa mọi thứ",
    segs: [{ kind: "boot", min: 1 }],
    works: false,
    note: "Lên rất nhanh, nhưng file động (cấu hình theo môi trường, theo từng instance) đã bị đóng cứng lúc tạo AMI. Instance chạy với cấu hình sai.",
  },
  {
    id: "golden",
    name: "Golden AMI + user data",
    segs: [{ kind: "boot", min: 1 }, { kind: "dynamic", min: 0.7 }],
    works: true,
    note: "**Golden AMI** đã cài sẵn phần tĩnh; **user data** chỉ sinh phần động lúc khởi động. Dưới 2 phút và đúng cấu hình. Elastic Beanstalk cho chỉ định custom AMI trong cấu hình environment.",
  },
];

const KIND_TEXT: Record<Seg["kind"], string> = { boot: "khởi động", static: "cài phần tĩnh", dynamic: "sinh file động", fetch: "tải từ S3" };
const total = (l: Lane) => l.segs.reduce((s, x) => s + x.min, 0);
const END = 45;
const TARGET = 2;
const X0 = 200;
const W = 520;
// Square-root scale so both a 2-minute and a 45-minute start are readable.
const px = (m: number) => X0 + Math.sqrt(Math.min(m, END) / END) * W;

export default function BootTimeSim() {
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
        <span className="count">Cần: instance mới phục vụ được trong {TARGET} phút</span>
        <button className="btn primary bts-play" onClick={play} disabled={busy}>Khởi động 4 instance</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox={`0 0 820 ${Y0 + LANES.length * LH + 34}`} role="img" aria-label="Bốn cách khởi động instance chạy đua trên cùng một đồng hồ">
          {[0, 2, 10, 20, 30, 45].map((m) => (
            <g key={m}>
              <line className="bts-grid" x1={px(m)} x2={px(m)} y1={Y0 - 6} y2={Y0 + LANES.length * LH} />
              <text className="ts" x={px(m)} y={Y0 + LANES.length * LH + 16} textAnchor="middle">{m} phút</text>
            </g>
          ))}
          <line className="bts-target" x1={px(TARGET)} x2={px(TARGET)} y1={Y0 - 14} y2={Y0 + LANES.length * LH} />
          <text className="bts-target-label" x={px(TARGET) + 6} y={Y0 - 16}>mục tiêu 2 phút</text>
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
                <text className="bts-name" x={X0 - 12} y={y + LH / 2 + 4} textAnchor="end">{l.name}</text>
                {l.segs.map((s, k) => {
                  const a = start;
                  start += s.min;
                  if (now <= a) return null;
                  const b = Math.min(now, start);
                  return <rect key={k} className={"bts-seg " + s.kind} x={px(a)} y={y + 10} width={Math.max(1, px(b) - px(a))} height={LH - 20} rx={4} />;
                })}
                {finished && (
                  <text className={"bts-end " + (l.works && total(l) <= TARGET ? "ok" : "bad")} x={px(total(l)) + 8} y={y + LH / 2 + 4}>
                    {l.works ? `${total(l).toFixed(1).replace(".", ",")} phút` : "lên nhanh, cấu hình sai"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="bts-legend">
        {(Object.keys(KIND_TEXT) as Seg["kind"][]).map((k) => (
          <span key={k}><i className={"bts-sw " + k} />{KIND_TEXT[k]}</span>
        ))}
      </div>
      <div className="readout" aria-live="polite">
        <p className="bts-pick">Bấm vào một làn để xem nhận xét. Đang xem: <b>{lane.name}</b></p>
        {laneDone && now > 0 ? (
          <p className={"bts-result " + (lane.works && total(lane) <= TARGET ? "ok" : "bad")}>{rich(lane.note)}</p>
        ) : (
          <p className="bts-hint">Bấm <b>Khởi động 4 instance</b> và chờ làn này chạy xong.</p>
        )}
      </div>
    </div>
  );
}
