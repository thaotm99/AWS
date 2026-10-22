import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import "./monitoring-sims.css";

// One week of the security group sg-web as AWS Config records it. Each dot is a
// configuration item: what the resource looked like after a change, whether the
// rule restricted-ssh says it is compliant, and the CloudTrail event that caused it.
// Config answers "what did it look like"; CloudTrail answers "who changed it".

type Mark = "same" | "add" | "risk" | "gone";

interface Item {
  day: string;
  time: string;
  rules: { text: string; mark: Mark }[];
  usedBy: string;
  compliant: boolean;
  event: string;
  note: string;
}

const ITEMS: Item[] = [
  {
    day: "Thứ Hai", time: "09:00",
    rules: [{ text: "443/tcp ← 0.0.0.0/0", mark: "add" }],
    usedBy: "i-web1, i-web2",
    compliant: true,
    event: "CreateSecurityGroup\nAuthorizeSecurityGroupIngress\nuser: role/cloudformation",
    note: "Security group được tạo, chỉ mở HTTPS. Config ghi configuration item đầu tiên.",
  },
  {
    day: "Thứ Ba", time: "14:20",
    rules: [{ text: "443/tcp ← 0.0.0.0/0", mark: "same" }, { text: "22/tcp ← 203.0.113.25/32", mark: "add" }],
    usedBy: "i-web1, i-web2",
    compliant: true,
    event: "AuthorizeSecurityGroupIngress\nuser: minh (console)\nIP: 203.0.113.25",
    note: "Mở SSH cho đúng một IP của văn phòng. Rule `restricted-ssh` vẫn COMPLIANT.",
  },
  {
    day: "Thứ Năm", time: "02:10",
    rules: [{ text: "443/tcp ← 0.0.0.0/0", mark: "same" }, { text: "22/tcp ← 203.0.113.25/32", mark: "same" }, { text: "22/tcp ← 0.0.0.0/0", mark: "risk" }],
    usedBy: "i-web1, i-web2",
    compliant: false,
    event: "AuthorizeSecurityGroupIngress\nuser: dev-tam (CLI)\nIP: 113.161.x.x",
    note: "Ai đó mở SSH cho cả Internet lúc nửa đêm. Config đánh dấu **NON_COMPLIANT**; CloudTrail cho biết đó là `dev-tam` dùng CLI.",
  },
  {
    day: "Thứ Năm", time: "09:05",
    rules: [{ text: "443/tcp ← 0.0.0.0/0", mark: "same" }, { text: "22/tcp ← 203.0.113.25/32", mark: "same" }, { text: "22/tcp ← 0.0.0.0/0", mark: "gone" }],
    usedBy: "i-web1, i-web2",
    compliant: true,
    event: "RevokeSecurityGroupIngress\nuser: an (console)",
    note: "Sáng ra An gỡ rule. Trở lại COMPLIANT. Lịch sử vẫn giữ cả 7 tiếng cổng 22 bị mở.",
  },
  {
    day: "Thứ Sáu", time: "16:40",
    rules: [{ text: "443/tcp ← 0.0.0.0/0", mark: "same" }, { text: "22/tcp ← 203.0.113.25/32", mark: "same" }],
    usedBy: "i-web1, i-web2, i-web4",
    compliant: true,
    event: "RunInstances (i-web4)\nuser: autoscaling",
    note: "Instance mới dùng sg-web. Config ghi cả **quan hệ** giữa tài nguyên: security group nào gắn vào instance nào.",
  },
];

const X0 = 90;
const X1 = 730;
const px = (i: number) => X0 + (i * (X1 - X0)) / (ITEMS.length - 1);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ConfigTimelineSim() {
  const alive = useRef(true);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);
  const it = ITEMS[at];

  async function play() {
    if (busy) return;
    setBusy(true);
    const fast = prefersReducedMotion();
    for (let i = 0; i < ITEMS.length; i++) {
      if (!alive.current) return;
      setAt(i);
      if (!fast) await sleep(1300);
    }
    setBusy(false);
  }

  return (
    <div className="stage cts">
      <div className="stage-bar">
        <span className="label">Resource</span>
        <code>sg-web</code>
        <span className="label">Rule</span>
        <code>restricted-ssh</code>
        <button className="btn primary cts-play" onClick={play} disabled={busy}>Xem cả tuần</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 120" role="img" aria-label="Dòng thời gian cấu hình của sg-web trong một tuần">
          <line className="cts-axis" x1={X0 - 30} x2={X1 + 30} y1={60} y2={60} />
          {ITEMS.map((x, i) => (
            <g
              key={i}
              className={`cts-dot${x.compliant ? "" : " bad"}${i === at ? " on" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${x.day} ${x.time}`}
              aria-pressed={i === at}
              onClick={() => !busy && setAt(i)}
              onKeyDown={(e) => { if (!busy && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setAt(i); } }}
            >
              <circle cx={px(i)} cy={60} r={i === at ? 13 : 9} />
              <text className="cts-day" x={px(i)} y={32} textAnchor="middle">{x.day}</text>
              <text className="cts-time" x={px(i)} y={96} textAnchor="middle">{x.time}{x.compliant ? "" : " ⚠"}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <div className="cts-row">
          <span className="count">Configuration item {at + 1}/{ITEMS.length} · {it.day} {it.time}</span>
          <span className={"pill " + (it.compliant ? "ok" : "bad")}><i />{it.compliant ? "COMPLIANT" : "NON_COMPLIANT"}</span>
        </div>
        <div className="cts-panels">
          <div className="cts-panel">
            <h4>AWS Config: trông thế nào</h4>
            <ul className="cts-rules">
              {it.rules.map((r) => <li key={r.text} className={r.mark}>{r.mark === "add" ? "+ " : r.mark === "gone" ? "− " : r.mark === "risk" ? "! " : "  "}{r.text}</li>)}
            </ul>
            <p className="cts-note">Đang gắn vào: <code>{it.usedBy}</code></p>
          </div>
          <div className="cts-panel">
            <h4>CloudTrail: ai đã đổi</h4>
            <p className="cts-event">{it.event}</p>
          </div>
        </div>
        <p className="cts-note">{rich(it.note)}</p>
      </div>
    </div>
  );
}
