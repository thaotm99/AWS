import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./backup-plan-sim.css";

// The shared EFS file system of ShopViet (seller photos, invoices) protected by one
// AWS Backup plan. Set how often it runs, how long it keeps recovery points and where
// copies go, then throw an incident at it: a deleted folder, the whole Region down,
// stolen admin credentials deleting backups, an audit asking for old data. The plan
// either has a recovery point that survived, or it does not.

type FreqId = "1h" | "12h" | "24h";
type KeepId = "7" | "35" | "365";
type EventId = "oops" | "region" | "attack" | "audit";
type VaultId = "main" | "tokyo" | "acct";

const FREQ: Record<FreqId, { name: string; hours: number }> = {
  "1h": { name: "Mỗi giờ", hours: 1 },
  "12h": { name: "Mỗi 12 giờ", hours: 12 },
  "24h": { name: "Hằng ngày", hours: 24 },
};
const KEEP: Record<KeepId, { name: string; days: number }> = {
  "7": { name: "7 ngày", days: 7 },
  "35": { name: "35 ngày", days: 35 },
  "365": { name: "1 năm", days: 365 },
};
const EVENTS: Record<EventId, { name: string; about: string }> = {
  oops: { name: "Xoá nhầm thư mục", about: "Một nhân viên xoá nhầm thư mục ảnh của người bán trên EFS." },
  region: { name: "Region Singapore sập", about: "Cả Region Singapore ngừng hoạt động, kể cả EFS và vault ở đó." },
  attack: { name: "Lộ quyền admin", about: "Kẻ gian có quyền admin của tài khoản chính và xoá mọi recovery point nó thấy." },
  audit: { name: "Kiểm toán hỏi dữ liệu cũ", about: "Kiểm toán cần hoá đơn đúng như ngày này 3 tháng trước." },
};
const RPO_HOURS = 8;
const AUDIT_DAYS = 90;

const VAULTS: Record<VaultId, { x: number; y: number; l1: string; l2: string }> = {
  main: { x: 330, y: 200, l1: "Backup vault", l2: "Singapore · tài khoản chính" },
  tokyo: { x: 650, y: 150, l1: "Vault Tokyo", l2: "cross-Region copy" },
  acct: { x: 650, y: 252, l1: "Vault tài khoản backup", l2: "cross-account copy" },
};
const EFS: Pt = [110, 200];
const VW = 190;
const VH = 50;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Outcome { lost: VaultId[]; from?: VaultId; efsLost: boolean; ok: boolean; lines: string[] }

function evaluate(ev: EventId, freq: FreqId, keep: KeepId, region: boolean, acct: boolean, lock: boolean): Outcome {
  const has: VaultId[] = ["main", ...(region ? ["tokyo" as const] : []), ...(acct ? ["acct" as const] : [])];
  const loss = FREQ[freq].hours;
  const rpoOk = loss <= RPO_HOURS;
  const rpoLine = rpoOk
    ? `Tệ nhất mất **${loss} giờ** dữ liệu, trong mục tiêu RPO ${RPO_HOURS} giờ.`
    : `Tệ nhất mất **${loss} giờ** dữ liệu, **vượt** mục tiêu RPO ${RPO_HOURS} giờ. Cần chạy backup dày hơn.`;
  switch (ev) {
    case "oops":
      return { lost: [], from: "main", efsLost: false, ok: rpoOk,
        lines: ["Restore thư mục từ recovery point mới nhất trong vault chính, ngay tại Singapore.", rpoLine] };
    case "region": {
      const lost: VaultId[] = ["main", ...(acct ? ["acct" as const] : [])];
      const from = has.find((v) => !lost.includes(v));
      return { lost, from, efsLost: true, ok: !!from && rpoOk,
        lines: [
          "Vault chính nằm ở Singapore nên mất cùng Region." + (acct ? " Vault của tài khoản backup cũng ở Singapore: khác tài khoản nhưng **cùng Region**, nên cũng mất." : ""),
          from ? "Restore EFS mới ở Tokyo từ bản **cross-Region copy**." : "Không còn recovery point nào ở Region khác. Phải bật **cross-Region copy** trong backup plan.",
          ...(from ? [rpoLine] : []),
        ] };
    }
    case "attack": {
      if (lock) {
        return { lost: [], from: "main", efsLost: true, ok: true,
          lines: ["Kẻ gian xoá file trên EFS rồi xoá backup, nhưng vault có **Vault Lock** (compliance mode): không ai xoá được recovery point trước hạn, kể cả root.", "Restore từ vault chính."] };
      }
      const lost: VaultId[] = ["main", ...(region ? ["tokyo" as const] : [])];
      const from = has.find((v) => !lost.includes(v));
      return { lost, from, efsLost: true, ok: !!from,
        lines: [
          "Kẻ gian xoá recovery point trong vault chính" + (region ? " và cả vault Tokyo: khác Region nhưng **cùng tài khoản**, cùng bị xoá." : "."),
          from ? "Bản **cross-account copy** nằm ở tài khoản khác, quyền admin bị lộ không chạm tới được. Restore từ đó." : "Không còn bản nào. Cần copy sang tài khoản khác hoặc bật Vault Lock.",
        ] };
    }
    case "audit": {
      const ok = KEEP[keep].days >= AUDIT_DAYS;
      return { lost: [], from: ok ? "main" : undefined, efsLost: false, ok,
        lines: [ok
          ? `Recovery point được giữ **${KEEP[keep].name}**, vẫn còn bản của 3 tháng trước.`
          : `Recovery point chỉ giữ **${KEEP[keep].name}**, bản của 3 tháng trước đã tự hết hạn và bị xoá. Cần tăng thời gian giữ (retention).`] };
    }
  }
}

export default function BackupPlanSim() {
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const [freq, setFreq] = useState<FreqId>("24h");
  const [keep, setKeep] = useState<KeepId>("35");
  const [region, setRegion] = useState(false);
  const [acct, setAcct] = useState(false);
  const [lock, setLock] = useState(false);
  const [ev, setEv] = useState<EventId>("oops");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<Outcome | null>(null);
  const [lit, setLit] = useState<Partial<Record<VaultId | "efs", "ok" | "bad" | "use">>>({});

  const on: Record<VaultId, boolean> = { main: true, tokyo: region, acct };

  function edit(fn: () => void) {
    if (busy) return;
    fn();
    setOut(null);
    setLit({});
  }

  async function run() {
    const layer = fx.current;
    if (busy || !layer) return;
    setBusy(true);
    setOut(null);
    setLit({});
    const fast = prefersReducedMotion();
    const res = evaluate(ev, freq, keep, region, acct, lock);
    const M: Pt = [VAULTS.main.x, VAULTS.main.y];
    // A few backup jobs, then their copies.
    for (let i = 0; i < 2; i++) {
      await travel(layer, [EFS, M], fast ? 100 : 420, "pkt");
      const copies: Promise<void>[] = [];
      if (region) copies.push(travel(layer, [M, [490, M[1]], [490, VAULTS.tokyo.y], [VAULTS.tokyo.x, VAULTS.tokyo.y]], 520, "pkt-edge"));
      if (acct) copies.push(travel(layer, [M, [490, M[1]], [490, VAULTS.acct.y], [VAULTS.acct.x, VAULTS.acct.y]], 520, "pkt-edge"));
      await Promise.all(copies);
      if (!alive.current) return;
    }
    if (!fast) await sleep(250);
    // The incident.
    const hit: Partial<Record<VaultId | "efs", "bad">> = {};
    if (res.efsLost) hit.efs = "bad";
    for (const v of res.lost) hit[v] = "bad";
    setLit(hit);
    if (res.efsLost) flashText(layer, EFS[0], EFS[1] - 36, ev === "region" ? "Region sập" : "bị xoá", "bps-flash bad", 1200);
    for (const v of res.lost) flashText(layer, VAULTS[v].x - VW / 2 - 28, VAULTS[v].y + 5, "mất", "bps-flash bad", 1200);
    if (ev === "attack" && lock) flashText(layer, M[0], M[1] - 34, "không xoá được", "bps-flash", 1300);
    if (!fast) await sleep(900);
    if (!alive.current) return;
    // Restore.
    if (res.from) {
      setLit((l) => ({ ...l, [res.from!]: "use" }));
      const F = VAULTS[res.from];
      const path: Pt[] = res.from === "main" ? [[F.x, F.y], EFS] : [[F.x, F.y], [490, F.y], [490, M[1]], EFS];
      if (ev === "region") {
        flashText(layer, F.x - VW / 2 - 36, F.y + 5, "restore", "bps-flash", 1300);
        await sleep(fast ? 0 : 600);
      } else {
        await travel(layer, path, fast ? 120 : 800, res.ok ? "pkt-back" : "pkt-bad");
      }
      if (ev !== "region") setLit((l) => ({ ...l, efs: res.ok ? "ok" : "bad" }));
    }
    setOut(res);
    setBusy(false);
  }

  // Timeline of one day: a tick per backup job.
  const X0 = 60;
  const TW = 700;
  const hx = (h: number) => X0 + (h / 24) * TW;
  const gap = FREQ[freq].hours;
  const first = gap >= 12 ? 2 : 0;
  const jobs = Array.from({ length: Math.floor((24 - first) / gap) + 1 }, (_, i) => first + i * gap);
  const gapOk = gap <= RPO_HOURS;
  const points = (Math.round(24 / FREQ[freq].hours) * KEEP[keep].days).toLocaleString("en-US");

  return (
    <div className="stage bps">
      <div className="stage-bar">
        <span className="label">Tần suất</span>
        {(Object.keys(FREQ) as FreqId[]).map((id) => (
          <button key={id} className="btn" aria-pressed={id === freq} disabled={busy} onClick={() => edit(() => setFreq(id))}>{FREQ[id].name}</button>
        ))}
        <span className="sep" />
        <span className="label">Giữ</span>
        {(Object.keys(KEEP) as KeepId[]).map((id) => (
          <button key={id} className="btn" aria-pressed={id === keep} disabled={busy} onClick={() => edit(() => setKeep(id))}>{KEEP[id].name}</button>
        ))}
      </div>
      <div className="stage-bar">
        <label className="bps-toggle"><input type="checkbox" checked={region} disabled={busy} onChange={(e) => edit(() => setRegion(e.target.checked))} />Copy sang Tokyo</label>
        <label className="bps-toggle"><input type="checkbox" checked={acct} disabled={busy} onChange={(e) => edit(() => setAcct(e.target.checked))} />Copy sang tài khoản backup</label>
        <label className="bps-toggle"><input type="checkbox" checked={lock} disabled={busy} onChange={(e) => edit(() => setLock(e.target.checked))} />Vault Lock</label>
      </div>
      <div className="bps-events" role="group" aria-label="Sự cố">
        <span className="bps-label">Sự cố</span>
        {(Object.keys(EVENTS) as EventId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === ev} disabled={busy && id !== ev} onClick={() => edit(() => setEv(id))}>{EVENTS[id].name}</button>
        ))}
        <button className="btn primary bps-play" onClick={run} disabled={busy}>Chạy</button>
      </div>
      <p className="bps-about">{EVENTS[ev].about}</p>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 300" role="img" aria-label="Backup plan: EFS được backup vào vault chính, có thể copy sang Tokyo và sang tài khoản backup">
          <text className="bps-cap" x={X0} y={14}>Một ngày của backup plan · mục tiêu RPO {RPO_HOURS} giờ</text>
          <line className="bps-axis" x1={X0} x2={X0 + TW} y1={52} y2={52} />
          {[0, 6, 12, 18, 24].map((h) => (
            <text key={h} className="ts" x={hx(h)} y={70} textAnchor="middle">{h}h</text>
          ))}
          <rect className={"bps-gap " + (gapOk ? "ok" : "bad")} x={hx(first)} y={40} width={hx(first + Math.min(gap, 22)) - hx(first)} height={12} rx={3} />
          <text className={"bps-gap-t " + (gapOk ? "ok" : "bad")} x={hx(first)} y={32}>{gapOk ? `tối đa mất ${gap} giờ` : `tối đa mất ${gap} giờ > ${RPO_HOURS} giờ`}</text>
          {jobs.map((h) => <line key={h} className="bps-job" x1={hx(h)} x2={hx(h)} y1={38} y2={58} />)}

          <g className="bps-box"><rect x={20} y={98} width={420} height={196} rx={12} /><text x={34} y={116}>Singapore · tài khoản chính</text></g>
          <g className="bps-box edge"><rect x={510} y={98} width={290} height={88} rx={12} /><text x={524} y={116}>Tokyo · tài khoản chính</text></g>
          <g className="bps-box acct"><rect x={510} y={200} width={290} height={94} rx={12} /><text x={524} y={218}>Singapore · tài khoản backup</text></g>

          <path className="bps-link" d={`M${EFS[0] + 70} ${EFS[1]} H${VAULTS.main.x - VW / 2}`} />
          <path className={"bps-link" + (region ? "" : " off")} d={`M${VAULTS.main.x + VW / 2} ${VAULTS.main.y} H490 V${VAULTS.tokyo.y} H${VAULTS.tokyo.x - VW / 2}`} />
          <path className={"bps-link" + (acct ? "" : " off")} d={`M${VAULTS.main.x + VW / 2} ${VAULTS.main.y} H490 V${VAULTS.acct.y} H${VAULTS.acct.x - VW / 2}`} />

          <g className={"bps-node efs " + (lit.efs ?? "")}>
            <rect x={EFS[0] - 70} y={EFS[1] - VH / 2} width={140} height={VH} rx={8} />
            <text className="bps-t" x={EFS[0]} y={EFS[1] - 3} textAnchor="middle">Amazon EFS</text>
            <text className="bps-s" x={EFS[0]} y={EFS[1] + 13} textAnchor="middle">ảnh, hoá đơn dùng chung</text>
          </g>
          {(Object.keys(VAULTS) as VaultId[]).map((id) => {
            const v = VAULTS[id];
            return (
              <g key={id} className={"bps-node vault " + (on[id] ? "" : "off ") + (lit[id] ?? "")}>
                <rect x={v.x - VW / 2} y={v.y - VH / 2} width={VW} height={VH} rx={8} />
                <text className="bps-t" x={v.x} y={v.y - 5} textAnchor="middle">{v.l1}</text>
                {lock && on[id] && (
                  <g className="bps-lock" transform={`translate(${v.x + VW / 2 - 18} ${v.y - VH / 2 - 6})`}>
                    <path d="M3 7 V4 a4 4 0 0 1 8 0 V7" />
                    <rect x={0} y={7} width={14} height={10} rx={2} />
                  </g>
                )}
                <text className="bps-s" x={v.x} y={v.y + 12} textAnchor="middle">{on[id] ? `${points} recovery point · giữ ${KEEP[keep].name}` : "chưa bật"}</text>
              </g>
            );
          })}
          <text className="bps-s" x={EFS[0]} y={EFS[1] + 52} textAnchor="middle">Multi-AZ trong Region</text>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {out === null ? (
          <p className="bps-hint">Chỉnh backup plan, chọn một sự cố rồi bấm <b>Chạy</b>. Bạn sẽ thấy backup job chạy vào vault chính, rồi bản copy đi sang các vault khác.</p>
        ) : (
          <>
            <ul className="log bps-log">{out.lines.map((l, i) => <li key={i}>{rich(l)}</li>)}</ul>
            <p className={"bps-result " + (out.ok ? "ok" : "bad")}>
              <b>{out.ok ? "Khôi phục được." : "Chưa đủ."}</b> {out.ok ? "Backup plan này chịu được sự cố vừa rồi. Thử sự cố khác." : "Đổi cài đặt phía trên rồi chạy lại."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
