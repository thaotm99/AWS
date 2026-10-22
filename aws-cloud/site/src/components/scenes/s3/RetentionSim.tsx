import { useId, useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./s3-sims.css";

// Object Lock retention: bucket default retention (a duration in days/years, S3 computes the
// Retain Until Date from the version's creation time) versus an explicit Retain Until Date on a
// PUT, which overrides the bucket default. Each version keeps its own retention.
// Facts: object-lock.html. Source question: exam1_q56.

type Def = "none" | "d30";
type Put = "plain" | "explicit";

interface Ver { id: string; day: number; put: Put; until: number | null; source: Bi }

const MAX = 90;
const pct = (d: number) => `${(d / MAX) * 100}%`;

export default function RetentionSim() {
  const L = useLang();
  const uid = useId().replace(/:/g, "");
  const [def, setDef] = useState<Def>("d30");
  const [put2, setPut2] = useState<Put>("explicit");
  const [today, setToday] = useState(20);
  const [msg, setMsg] = useState<{ ok: boolean; text: Bi } | null>(null);

  const lockFor = (put: Put, day: number): { until: number | null; source: Bi } => {
    if (put === "explicit") return { until: 75, source: { vi: "Compliance, Retain Until Date chỉ định trong request PUT", en: "Compliance, Retain Until Date set in the PUT request" } };
    if (def === "d30") return { until: day + 30, source: { vi: "mặc định của bucket: ngày tạo + 30 ngày", en: "bucket default: creation time + 30 days" } };
    return { until: null, source: { vi: "không có retention", en: "no retention" } };
  };

  const v1: Ver = { id: "v1", day: 0, put: "plain", ...lockFor("plain", 0) };
  const v2: Ver = { id: "v2", day: 15, put: put2, ...lockFor(put2, 15) };

  function del(v: Ver) {
    if (v.until !== null && today < v.until) {
      setMsg({ ok: true, text: {
        vi: `403: phiên bản **${v.id}** còn bị khoá tới ngày ${v.until} (Compliance mode), nên không ai xoá hoặc ghi đè được phiên bản này, kể cả root.`,
        en: `403: version **${v.id}** is locked until day ${v.until} (Compliance mode), so no one can delete or overwrite it, including the root user.`,
      } });
    } else {
      setMsg({ ok: false, text: v.until === null
        ? { vi: `Phiên bản **${v.id}** bị xoá: phiên bản này không có retention period.`, en: `Version **${v.id}** is deleted: it has no retention period.` }
        : { vi: `Phiên bản **${v.id}** bị xoá: retention period đã hết hạn từ ngày ${v.until}.`, en: `Version **${v.id}** is deleted: its retention period expired on day ${v.until}.` } });
    }
  }

  const reset = () => setMsg(null);

  return (
    <div className="stage s3x">
      <div className="s3x-row" role="group" aria-label={L({ vi: "Default retention của bucket", en: "Bucket default retention" })}>
        <span className="s3x-lbl">{L({ vi: "Default retention", en: "Default retention" })}</span>
        <button className="chip" aria-pressed={def === "none"} onClick={() => { setDef("none"); reset(); }}>{L({ vi: "Không đặt", en: "Not set" })}</button>
        <button className="chip" aria-pressed={def === "d30"} onClick={() => { setDef("d30"); reset(); }}>{L({ vi: "Compliance · 30 ngày", en: "Compliance · 30 days" })}</button>
      </div>
      <div className="s3x-row" role="group" aria-label={L({ vi: "Request PUT ngày 15", en: "PUT request on day 15" })}>
        <span className="s3x-lbl">{L({ vi: "PUT ngày 15 (cùng key)", en: "PUT on day 15 (same key)" })}</span>
        <button className="chip" aria-pressed={put2 === "plain"} onClick={() => { setPut2("plain"); reset(); }}>{L({ vi: "Không chỉ định retention", en: "No retention in request" })}</button>
        <button className="chip" aria-pressed={put2 === "explicit"} onClick={() => { setPut2("explicit"); reset(); }}>{L({ vi: "Retain Until Date = ngày 75", en: "Retain Until Date = day 75" })}</button>
      </div>
      <div className="stage-bar">
        <label className="label" htmlFor={`${uid}-today`}>{L({ vi: `Hôm nay: ngày ${today}`, en: `Today: day ${today}` })}</label>
        <input id={`${uid}-today`} type="range" min={0} max={MAX} value={today} onChange={(e) => { setToday(Number(e.target.value)); reset(); }} />
      </div>
      <div className="s3x-rt">
        <div className="s3x-rt-axis" aria-hidden="true">
          {[0, 15, 30, 45, 60, 75, 90].map((d) => <span key={d} style={{ left: pct(d) }}>{d}</span>)}
        </div>
        {[v1, v2].map((v) => {
          const exists = v.day <= today;
          const locked = v.until !== null && today < v.until;
          return (
            <div key={v.id} className={`s3x-rt-row${exists ? "" : " off"}`}>
              <div className="s3x-rt-head">
                <b>hd-0815.pdf · {v.id}</b>
                <span className="term-meta">{exists ? `${L({ vi: "tạo ngày", en: "created day" })} ${v.day} · ${L(v.source)}` : L({ vi: `chưa tạo (ngày ${v.day})`, en: `not created yet (day ${v.day})` })}</span>
              </div>
              <div className="s3x-rt-track">
                {v.until !== null && exists && <span className="s3x-rt-lock" style={{ left: pct(v.day), width: pct(Math.min(v.until, MAX) - v.day) }}>{L({ vi: `khoá tới ngày ${v.until}`, en: `locked until day ${v.until}` })}</span>}
                <span className="s3x-rt-now" style={{ left: pct(today) }} />
              </div>
              <button className="btn" disabled={!exists} onClick={() => del(v)}>
                {L({ vi: `Xoá ${v.id}`, en: `Delete ${v.id}` })} {exists && <span className={`pill ${locked ? "bad" : "ok"}`}><i />{locked ? L({ vi: "đang khoá", en: "locked" }) : L({ vi: "xoá được", en: "deletable" })}</span>}
              </button>
            </div>
          );
        })}
      </div>
      <div className="readout" aria-live="polite">
        {msg ? (
          <p className={`s3x-result ${msg.ok ? "ok" : "bad"}`}>{rich(L(msg.text))}</p>
        ) : (
          <p className="s3x-hint">{rich(L(put2 === "explicit" && def === "d30"
            ? { vi: "Phiên bản v2 có retention chỉ định trong request, nên **ghi đè** default retention của bucket: v2 khoá tới ngày 75, không phải ngày 45. Phiên bản v1 vẫn giữ thời hạn riêng (ngày 30). Kéo thanh thời gian và thử xoá từng phiên bản.", en: "Version v2 carries an explicit retention setting, so it **overrides** the bucket default: v2 is locked until day 75, not day 45. Version v1 keeps its own period (day 30). Drag the timeline and try deleting each version." }
            : { vi: "Default retention của bucket là một **khoảng thời gian** (ngày hoặc năm); S3 cộng khoảng này vào thời điểm tạo của từng phiên bản để tính Retain Until Date. Kéo thanh thời gian và thử xoá từng phiên bản.", en: "A bucket's default retention is a **duration** (days or years); S3 adds it to each version's creation time to compute the Retain Until Date. Drag the timeline and try deleting each version." }))}</p>
        )}
      </div>
    </div>
  );
}
