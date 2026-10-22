import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./monitoring-sims.css";

// One week of the security group sg-web as AWS Config records it. Each dot is a
// configuration item: what the resource looked like after a change, whether the
// rule restricted-ssh says it is compliant, and the CloudTrail event that caused it.
// Config answers "what did it look like"; CloudTrail answers "who changed it".

type Mark = "same" | "add" | "risk" | "gone";

interface Item {
  day: Bi;
  time: string;
  rules: { text: string; mark: Mark }[];
  usedBy: string;
  compliant: boolean;
  event: string;
  note: Bi;
}

const ITEMS: Item[] = [
  {
    day: { vi: "Thứ Hai", en: "Monday" }, time: "09:00",
    rules: [{ text: "443/tcp ← 0.0.0.0/0", mark: "add" }],
    usedBy: "i-web1, i-web2",
    compliant: true,
    event: "CreateSecurityGroup\nAuthorizeSecurityGroupIngress\nuser: role/cloudformation",
    note: { vi: "Security group được tạo, chỉ cho phép HTTPS. Config ghi configuration item đầu tiên.", en: "The security group is created, allowing only HTTPS. Config records the first configuration item." },
  },
  {
    day: { vi: "Thứ Ba", en: "Tuesday" }, time: "14:20",
    rules: [{ text: "443/tcp ← 0.0.0.0/0", mark: "same" }, { text: "22/tcp ← 203.0.113.25/32", mark: "add" }],
    usedBy: "i-web1, i-web2",
    compliant: true,
    event: "AuthorizeSecurityGroupIngress\nuser: minh (console)\nIP: 203.0.113.25",
    note: { vi: "Mở SSH cho duy nhất một địa chỉ IP của văn phòng. Rule `restricted-ssh` vẫn ở trạng thái COMPLIANT.", en: "SSH is opened to a single office IP address only. The `restricted-ssh` rule stays COMPLIANT." },
  },
  {
    day: { vi: "Thứ Năm", en: "Thursday" }, time: "02:10",
    rules: [{ text: "443/tcp ← 0.0.0.0/0", mark: "same" }, { text: "22/tcp ← 203.0.113.25/32", mark: "same" }, { text: "22/tcp ← 0.0.0.0/0", mark: "risk" }],
    usedBy: "i-web1, i-web2",
    compliant: false,
    event: "AuthorizeSecurityGroupIngress\nuser: dev-tam (CLI)\nIP: 113.161.x.x",
    note: { vi: "SSH bị mở cho toàn bộ Internet vào ban đêm. Config đánh dấu **NON_COMPLIANT**; CloudTrail xác định người thực hiện là `dev-tam` thông qua CLI.", en: "SSH is opened to the entire internet at night. Config marks it **NON_COMPLIANT**; CloudTrail identifies the actor as `dev-tam` through the CLI." },
  },
  {
    day: { vi: "Thứ Năm", en: "Thursday" }, time: "09:05",
    rules: [{ text: "443/tcp ← 0.0.0.0/0", mark: "same" }, { text: "22/tcp ← 203.0.113.25/32", mark: "same" }, { text: "22/tcp ← 0.0.0.0/0", mark: "gone" }],
    usedBy: "i-web1, i-web2",
    compliant: true,
    event: "RevokeSecurityGroupIngress\nuser: an (console)",
    note: { vi: "Buổi sáng, An gỡ rule; tài nguyên trở lại trạng thái COMPLIANT. Lịch sử vẫn lưu lại toàn bộ 7 giờ cổng 22 bị mở.", en: "In the morning, An removes the rule; the resource is COMPLIANT again. The history still keeps all 7 hours during which port 22 was open." },
  },
  {
    day: { vi: "Thứ Sáu", en: "Friday" }, time: "16:40",
    rules: [{ text: "443/tcp ← 0.0.0.0/0", mark: "same" }, { text: "22/tcp ← 203.0.113.25/32", mark: "same" }],
    usedBy: "i-web1, i-web2, i-web4",
    compliant: true,
    event: "RunInstances (i-web4)\nuser: autoscaling",
    note: { vi: "Instance mới sử dụng sg-web. Config ghi lại cả **quan hệ** giữa các tài nguyên: security group nào được gắn vào instance nào.", en: "A new instance uses sg-web. Config also records the **relationships** between resources: which security group is attached to which instance." },
  },
];

const X0 = 90;
const X1 = 730;
const px = (i: number) => X0 + (i * (X1 - X0)) / (ITEMS.length - 1);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ConfigTimelineSim() {
  const L = useLang();
  const alive = useRef(true);
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
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
        <button className="btn primary cts-play" onClick={play} disabled={busy}>{L({ vi: "Xem toàn bộ tuần", en: "Play the whole week" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 120" role="img" aria-label={L({ vi: "Dòng thời gian cấu hình của sg-web trong một tuần", en: "Configuration timeline of sg-web over one week" })}>
          <line className="cts-axis" x1={X0 - 30} x2={X1 + 30} y1={60} y2={60} />
          {ITEMS.map((x, i) => (
            <g
              key={i}
              className={`cts-dot${x.compliant ? "" : " bad"}${i === at ? " on" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${L(x.day)} ${x.time}`}
              aria-pressed={i === at}
              onClick={() => !busy && setAt(i)}
              onKeyDown={(e) => { if (!busy && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setAt(i); } }}
            >
              <circle cx={px(i)} cy={60} r={i === at ? 13 : 9} />
              <text className="cts-day" x={px(i)} y={32} textAnchor="middle">{L(x.day)}</text>
              <text className="cts-time" x={px(i)} y={96} textAnchor="middle">{x.time}{x.compliant ? "" : " ⚠"}</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        <div className="cts-row">
          <span className="count">Configuration item {at + 1}/{ITEMS.length} · {L(it.day)} {it.time}</span>
          <span className={"pill " + (it.compliant ? "ok" : "bad")}><i />{it.compliant ? "COMPLIANT" : "NON_COMPLIANT"}</span>
        </div>
        <div className="cts-panels">
          <div className="cts-panel">
            <h4>{L({ vi: "AWS Config: trạng thái cấu hình", en: "AWS Config: configuration state" })}</h4>
            <ul className="cts-rules">
              {it.rules.map((r) => <li key={r.text} className={r.mark}>{r.mark === "add" ? "+ " : r.mark === "gone" ? "− " : r.mark === "risk" ? "! " : "  "}{r.text}</li>)}
            </ul>
            <p className="cts-note">{L({ vi: "Đang được gắn vào", en: "Attached to" })}: <code>{it.usedBy}</code></p>
          </div>
          <div className="cts-panel">
            <h4>{L({ vi: "CloudTrail: người thực hiện thay đổi", en: "CloudTrail: who made the change" })}</h4>
            <p className="cts-event">{it.event}</p>
          </div>
        </div>
        <p className="cts-note">{rich(L(it.note))}</p>
      </div>
    </div>
  );
}
