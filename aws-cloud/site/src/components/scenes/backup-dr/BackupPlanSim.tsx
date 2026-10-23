import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./backup-plan-sim.css";

// The shared EFS file system of MFTECH (seller photos, invoices) protected by one
// AWS Backup plan. Set how often it runs, how long it keeps recovery points and where
// copies go, then throw an incident at it: a deleted folder, the whole Region down,
// stolen admin credentials deleting backups, an audit asking for old data. The plan
// either has a recovery point that survived, or it does not.

type FreqId = "1h" | "12h" | "24h";
type KeepId = "7" | "35" | "365";
type EventId = "oops" | "region" | "attack" | "audit";
type VaultId = "main" | "tokyo" | "acct";

const FREQ: Record<FreqId, { name: Bi; hours: number }> = {
  "1h": { name: { vi: "Mỗi giờ", en: "Hourly" }, hours: 1 },
  "12h": { name: { vi: "Mỗi 12 giờ", en: "Every 12 hours" }, hours: 12 },
  "24h": { name: { vi: "Hằng ngày", en: "Daily" }, hours: 24 },
};
const KEEP: Record<KeepId, { name: Bi; days: number }> = {
  "7": { name: { vi: "7 ngày", en: "7 days" }, days: 7 },
  "35": { name: { vi: "35 ngày", en: "35 days" }, days: 35 },
  "365": { name: { vi: "1 năm", en: "1 year" }, days: 365 },
};
const EVENTS: Record<EventId, { name: Bi; about: Bi }> = {
  oops: { name: { vi: "Xoá nhầm thư mục", en: "Folder deleted by mistake" },
    about: { vi: "Một nhân viên xoá nhầm thư mục ảnh của người bán trên EFS.", en: "An employee deletes a seller's image folder on EFS by mistake." } },
  region: { name: { vi: "Sự cố Region Singapore", en: "Singapore Region failure" },
    about: { vi: "Toàn bộ Region Singapore ngừng hoạt động, bao gồm EFS và vault tại Region này.", en: "The entire Singapore Region goes down, including EFS and the vaults in this Region." } },
  attack: { name: { vi: "Lộ thông tin xác thực admin", en: "Leaked admin credentials" },
    about: { vi: "Bên tấn công chiếm được quyền admin của account chính và xoá mọi recovery point có thể truy cập.", en: "An attacker gains admin access to the main account and deletes every recovery point it can reach." } },
  audit: { name: { vi: "Kiểm toán yêu cầu dữ liệu cũ", en: "Audit requests old data" },
    about: { vi: "Kiểm toán yêu cầu hoá đơn đúng như trạng thái tại thời điểm 3 tháng trước.", en: "An audit requests the invoices exactly as they were 3 months ago." } },
};
const RPO_HOURS = 8;
const AUDIT_DAYS = 90;

const VAULTS: Record<VaultId, { x: number; y: number; l1: Bi; l2: Bi }> = {
  main: { x: 330, y: 200, l1: { vi: "Backup vault", en: "Backup vault" }, l2: { vi: "Singapore · account chính", en: "Singapore · main account" } },
  tokyo: { x: 650, y: 150, l1: { vi: "Vault Tokyo", en: "Tokyo vault" }, l2: { vi: "cross-Region copy", en: "cross-Region copy" } },
  acct: { x: 650, y: 252, l1: { vi: "Vault account backup", en: "Backup account vault" }, l2: { vi: "cross-account copy", en: "cross-account copy" } },
};
const EFS: Pt = [110, 200];
const VW = 190;
const VH = 50;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface Outcome { lost: VaultId[]; from?: VaultId; efsLost: boolean; ok: boolean; lines: Bi[] }

function evaluate(ev: EventId, freq: FreqId, keep: KeepId, region: boolean, acct: boolean, lock: boolean): Outcome {
  const has: VaultId[] = ["main", ...(region ? ["tokyo" as const] : []), ...(acct ? ["acct" as const] : [])];
  const loss = FREQ[freq].hours;
  const rpoOk = loss <= RPO_HOURS;
  const rpoLine: Bi = rpoOk
    ? { vi: `Trong trường hợp xấu nhất, mất **${loss} giờ** dữ liệu, nằm trong mục tiêu RPO ${RPO_HOURS} giờ.`,
      en: `In the worst case, **${loss} hour${loss === 1 ? "" : "s"}** of data is lost, within the RPO objective of ${RPO_HOURS} hours.` }
    : { vi: `Trong trường hợp xấu nhất, mất **${loss} giờ** dữ liệu, **vượt** mục tiêu RPO ${RPO_HOURS} giờ. Cần tăng tần suất backup.`,
      en: `In the worst case, **${loss} hours** of data is lost, **exceeding** the RPO objective of ${RPO_HOURS} hours. Increase the backup frequency.` };
  switch (ev) {
    case "oops":
      return { lost: [], from: "main", efsLost: false, ok: rpoOk,
        lines: [{ vi: "Restore thư mục từ recovery point mới nhất trong vault chính, ngay tại Singapore.", en: "Restore the folder from the latest recovery point in the main vault, right in Singapore." }, rpoLine] };
    case "region": {
      const lost: VaultId[] = ["main", ...(acct ? ["acct" as const] : [])];
      const from = has.find((v) => !lost.includes(v));
      return { lost, from, efsLost: true, ok: !!from && rpoOk,
        lines: [
          { vi: "Vault chính nằm tại Singapore nên bị mất cùng Region." + (acct ? " Vault của account backup cũng nằm tại Singapore: khác account nhưng **cùng Region**, do đó cũng bị mất." : ""),
            en: "The main vault is in Singapore, so it is lost with the Region." + (acct ? " The backup account's vault is also in Singapore: a different account but **the same Region**, so it is lost too." : "") },
          from ? { vi: "Restore EFS mới tại Tokyo từ bản **cross-Region copy**.", en: "Restore a new EFS file system in Tokyo from the **cross-Region copy**." }
            : { vi: "Không còn recovery point nào tại Region khác. Cần bật **cross-Region copy** trong backup plan.", en: "No recovery point remains in another Region. Turn on **cross-Region copy** in the backup plan." },
          ...(from ? [rpoLine] : []),
        ] };
    }
    case "attack": {
      if (lock) {
        return { lost: [], from: "main", efsLost: true, ok: true,
          lines: [{ vi: "Bên tấn công xoá file trên EFS rồi xoá backup, nhưng vault có **Vault Lock** (compliance mode): không ai xoá được recovery point trước thời hạn, kể cả root.", en: "The attacker deletes files on EFS, then deletes the backups, but the vault has **Vault Lock** (compliance mode): no one can delete recovery points before they expire, not even root." },
            { vi: "Restore từ vault chính.", en: "Restore from the main vault." }] };
      }
      const lost: VaultId[] = ["main", ...(region ? ["tokyo" as const] : [])];
      const from = has.find((v) => !lost.includes(v));
      return { lost, from, efsLost: true, ok: !!from,
        lines: [
          { vi: "Bên tấn công xoá recovery point trong vault chính" + (region ? " và cả vault Tokyo: khác Region nhưng **cùng account**, nên cũng bị xoá." : "."),
            en: "The attacker deletes the recovery points in the main vault" + (region ? " and in the Tokyo vault too: a different Region but **the same account**, so they are deleted as well." : ".") },
          from ? { vi: "Bản **cross-account copy** nằm tại account khác, thông tin xác thực admin bị lộ không truy cập được. Restore từ bản này.", en: "The **cross-account copy** is in another account that the leaked admin credentials cannot reach. Restore from this copy." }
            : { vi: "Không còn bản backup nào. Cần copy sang account khác hoặc bật Vault Lock.", en: "No backups remain. Copy to another account or turn on Vault Lock." },
        ] };
    }
    case "audit": {
      const ok = KEEP[keep].days >= AUDIT_DAYS;
      return { lost: [], from: ok ? "main" : undefined, efsLost: false, ok,
        lines: [ok
          ? { vi: `Recovery point được lưu giữ **${KEEP[keep].name.vi}**, bản của 3 tháng trước vẫn còn.`, en: `Recovery points are retained for **${KEEP[keep].name.en}**, so the one from 3 months ago still exists.` }
          : { vi: `Recovery point chỉ được lưu giữ **${KEEP[keep].name.vi}**; bản của 3 tháng trước đã hết hạn và bị xoá tự động. Cần tăng thời gian lưu giữ (retention).`, en: `Recovery points are retained for only **${KEEP[keep].name.en}**; the one from 3 months ago has expired and was deleted automatically. Increase the retention period.` }] };
    }
  }
}

export default function BackupPlanSim() {
  const L = useLang();
  const fx = useRef<SVGGElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
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
    if (res.efsLost) flashText(layer, EFS[0], EFS[1] - 36, ev === "region" ? L({ vi: "sự cố Region", en: "Region failure" }) : L({ vi: "bị xoá", en: "deleted" }), "bps-flash bad", 1200);
    for (const v of res.lost) flashText(layer, VAULTS[v].x - VW / 2 - 28, VAULTS[v].y + 5, L({ vi: "mất", en: "lost" }), "bps-flash bad", 1200);
    if (ev === "attack" && lock) flashText(layer, M[0], M[1] - 34, L({ vi: "không xoá được", en: "cannot delete" }), "bps-flash", 1300);
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
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Tần suất", en: "Frequency" })}</span>
        {(Object.keys(FREQ) as FreqId[]).map((id) => (
          <button key={id} className="btn" aria-pressed={id === freq} disabled={busy} onClick={() => edit(() => setFreq(id))}>{L(FREQ[id].name)}</button>
        ))}
        <span className="sep" />
        <span className="label">{L({ vi: "Lưu giữ", en: "Retention" })}</span>
        {(Object.keys(KEEP) as KeepId[]).map((id) => (
          <button key={id} className="btn" aria-pressed={id === keep} disabled={busy} onClick={() => edit(() => setKeep(id))}>{L(KEEP[id].name)}</button>
        ))}
      </div>
      <div className="stage-bar pt-0">
        <label className="mr-2 inline-flex cursor-pointer items-center gap-1.5 text-step--1"><input type="checkbox" checked={region} disabled={busy} onChange={(e) => edit(() => setRegion(e.target.checked))} />{L({ vi: "Copy sang Tokyo", en: "Copy to Tokyo" })}</label>
        <label className="mr-2 inline-flex cursor-pointer items-center gap-1.5 text-step--1"><input type="checkbox" checked={acct} disabled={busy} onChange={(e) => edit(() => setAcct(e.target.checked))} />{L({ vi: "Copy sang account backup", en: "Copy to backup account" })}</label>
        <label className="mr-2 inline-flex cursor-pointer items-center gap-1.5 text-step--1"><input type="checkbox" checked={lock} disabled={busy} onChange={(e) => edit(() => setLock(e.target.checked))} />Vault Lock</label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3 pb-0" role="group" aria-label={L({ vi: "Sự cố", en: "Incidents" })}>
        <span className="mr-1 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">{L({ vi: "Sự cố", en: "Incident" })}</span>
        {(Object.keys(EVENTS) as EventId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === ev} disabled={busy && id !== ev} onClick={() => edit(() => setEv(id))}>{L(EVENTS[id].name)}</button>
        ))}
        <button className="btn primary ml-auto" onClick={run} disabled={busy}>{L({ vi: "Chạy mô phỏng", en: "Run simulation" })}</button>
      </div>
      <p className="mx-4 mt-2 mb-0 text-step--1 text-muted">{L(EVENTS[ev].about)}</p>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 300" role="img" aria-label={L({ vi: "Backup plan: EFS được backup vào vault chính, có thể copy sang Tokyo và sang account backup", en: "Backup plan: EFS is backed up to the main vault and can be copied to Tokyo and to a backup account" })}>
          <text className="bps-cap" x={X0} y={14}>{L({ vi: `Một ngày của backup plan · mục tiêu RPO ${RPO_HOURS} giờ`, en: `One day of the backup plan · RPO objective ${RPO_HOURS} hours` })}</text>
          <line className="bps-axis" x1={X0} x2={X0 + TW} y1={52} y2={52} />
          {[0, 6, 12, 18, 24].map((h) => (
            <text key={h} className="ts" x={hx(h)} y={70} textAnchor="middle">{h}h</text>
          ))}
          <rect className={"bps-gap " + (gapOk ? "ok" : "bad")} x={hx(first)} y={40} width={hx(first + Math.min(gap, 22)) - hx(first)} height={12} rx={3} />
          <text className={"bps-gap-t " + (gapOk ? "ok" : "bad")} x={hx(first)} y={32}>{gapOk ? L({ vi: `tối đa mất ${gap} giờ`, en: `up to ${gap} h lost` }) : L({ vi: `tối đa mất ${gap} giờ > ${RPO_HOURS} giờ`, en: `up to ${gap} h lost > ${RPO_HOURS} h` })}</text>
          {jobs.map((h) => <line key={h} className="bps-job" x1={hx(h)} x2={hx(h)} y1={38} y2={58} />)}

          <g className="bps-box"><rect x={20} y={98} width={420} height={196} rx={12} /><text x={34} y={116}>{L({ vi: "Singapore · account chính", en: "Singapore · main account" })}</text></g>
          <g className="bps-box edge"><rect x={510} y={98} width={290} height={88} rx={12} /><text x={524} y={116}>{L({ vi: "Tokyo · account chính", en: "Tokyo · main account" })}</text></g>
          <g className="bps-box acct"><rect x={510} y={200} width={290} height={94} rx={12} /><text x={524} y={218}>{L({ vi: "Singapore · account backup", en: "Singapore · backup account" })}</text></g>

          <path className="bps-link" d={`M${EFS[0] + 70} ${EFS[1]} H${VAULTS.main.x - VW / 2}`} />
          <path className={"bps-link" + (region ? "" : " off")} d={`M${VAULTS.main.x + VW / 2} ${VAULTS.main.y} H490 V${VAULTS.tokyo.y} H${VAULTS.tokyo.x - VW / 2}`} />
          <path className={"bps-link" + (acct ? "" : " off")} d={`M${VAULTS.main.x + VW / 2} ${VAULTS.main.y} H490 V${VAULTS.acct.y} H${VAULTS.acct.x - VW / 2}`} />

          <g className={"bps-node efs " + (lit.efs ?? "")}>
            <rect x={EFS[0] - 70} y={EFS[1] - VH / 2} width={140} height={VH} rx={8} />
            <text className="bps-t" x={EFS[0]} y={EFS[1] - 3} textAnchor="middle">Amazon EFS</text>
            <text className="bps-s" x={EFS[0]} y={EFS[1] + 13} textAnchor="middle">{L({ vi: "ảnh, hoá đơn dùng chung", en: "shared images, invoices" })}</text>
          </g>
          {(Object.keys(VAULTS) as VaultId[]).map((id) => {
            const v = VAULTS[id];
            return (
              <g key={id} className={"bps-node vault " + (on[id] ? "" : "off ") + (lit[id] ?? "")}>
                <rect x={v.x - VW / 2} y={v.y - VH / 2} width={VW} height={VH} rx={8} />
                <text className="bps-t" x={v.x} y={v.y - 5} textAnchor="middle">{L(v.l1)}</text>
                {lock && on[id] && (
                  <g className="bps-lock" transform={`translate(${v.x + VW / 2 - 18} ${v.y - VH / 2 - 6})`}>
                    <path d="M3 7 V4 a4 4 0 0 1 8 0 V7" />
                    <rect x={0} y={7} width={14} height={10} rx={2} />
                  </g>
                )}
                <text className="bps-s" x={v.x} y={v.y + 12} textAnchor="middle">{on[id] ? L({ vi: `${points} recovery point · lưu ${KEEP[keep].name.vi}`, en: `${points} recovery points · kept ${KEEP[keep].name.en}` }) : L({ vi: "chưa bật", en: "off" })}</text>
              </g>
            );
          })}
          <text className="bps-s" x={EFS[0]} y={EFS[1] + 52} textAnchor="middle">{L({ vi: "Multi-AZ trong Region", en: "Multi-AZ within the Region" })}</text>
          <g ref={fx} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {out === null ? (
          <p className="m-0 text-step--1 text-muted [&_b]:text-ink">{L({ vi: <>Điều chỉnh backup plan, chọn một sự cố, sau đó chọn <b>Chạy mô phỏng</b>. Mô phỏng thể hiện backup job ghi vào vault chính và các bản copy được chuyển sang vault khác.</>, en: <>Adjust the backup plan, choose an incident, then choose <b>Run simulation</b>. The simulation shows backup jobs writing to the main vault and copies moving to other vaults.</> })}</p>
        ) : (
          <>
            <ul className="log [&>li]:block">{out.lines.map((l, i) => <li key={i}>{rich(L(l))}</li>)}</ul>
            <p className={"mx-0 mt-2.5 mb-0 rounded-[12px] px-2.5 py-2 text-step--1 " + (out.ok ? "bg-ok-soft" : "bg-bad-soft")}>
              <b>{out.ok ? L({ vi: "Khôi phục thành công.", en: "Recovery succeeded." }) : L({ vi: "Chưa đáp ứng.", en: "Not met yet." })}</b> {out.ok ? L({ vi: "Backup plan này chịu được sự cố vừa mô phỏng. Tiếp tục với sự cố khác.", en: "This backup plan survives the simulated incident. Try another incident." }) : L({ vi: "Thay đổi cấu hình phía trên và chạy lại.", en: "Change the settings above and run again." })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
