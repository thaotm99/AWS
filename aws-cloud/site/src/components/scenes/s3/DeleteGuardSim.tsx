import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./s3-sims.css";

// MFTech keeps invoices in S3 for years. Pick how the bucket is protected and who
// tries to delete an invoice, then watch which layer stops the request:
// versioning (delete marker), MFA Delete, Object Lock governance/compliance, legal hold.
// Source questions: exam1_q20, exam5_q50, exam1_q56, exam4_q64, exam5_q39.

type Guard = "none" | "ver" | "mfa" | "gov" | "comp" | "hold";
type ActorId = "staff" | "script" | "admin" | "root";
type GateId = "ver" | "mfa" | "lock";
type State = "pass" | "block" | "skip" | "change";
type Effect = "gone" | "marker" | "kept";

const GUARDS: { id: Guard; name: Bi }[] = [
  { id: "none", name: { vi: "Không bảo vệ", en: "No protection" } },
  { id: "ver", name: { vi: "Versioning", en: "Versioning" } },
  { id: "mfa", name: { vi: "Versioning + MFA Delete", en: "Versioning + MFA Delete" } },
  { id: "gov", name: { vi: "Object Lock · Governance", en: "Object Lock · Governance" } },
  { id: "comp", name: { vi: "Object Lock · Compliance", en: "Object Lock · Compliance" } },
  { id: "hold", name: { vi: "Legal hold", en: "Legal hold" } },
];

interface Actor { id: ActorId; name: Bi; request: string; version: boolean; mfa: boolean; bypass: boolean }
const ACTORS: Actor[] = [
  { id: "staff", name: { vi: "Nhân viên thực hiện Delete", en: "Employee runs Delete" }, request: "DELETE hd-0815.pdf", version: false, mfa: false, bypass: false },
  { id: "script", name: { vi: "Script dọn dẹp xoá vĩnh viễn", en: "Cleanup script deletes permanently" }, request: "DELETE hd-0815.pdf?versionId=v1", version: true, mfa: false, bypass: false },
  { id: "admin", name: { vi: "Admin có quyền bypass", en: "Admin with bypass permission" }, request: "DELETE …?versionId=v1 + bypass-governance", version: true, mfa: false, bypass: true },
  { id: "root", name: { vi: "Root user có MFA", en: "Root user with MFA" }, request: "DELETE …?versionId=v1 + MFA + bypass", version: true, mfa: true, bypass: true },
];

const GATES: { id: GateId; l1: string; l2: Bi }[] = [
  { id: "ver", l1: "Versioning", l2: { vi: "lưu phiên bản", en: "keeps versions" } },
  { id: "mfa", l1: "MFA Delete", l2: { vi: "xác thực bổ sung", en: "extra authentication" } },
  { id: "lock", l1: "Object Lock", l2: { vi: "retention, hold", en: "retention, hold" } },
];
const GX = (i: number) => 220 + i * 110;
const LANE = 120;
const ACTOR: Pt = [60, LANE];
const OBJ: Pt = [560, 138];

interface Outcome {
  gates: Partial<Record<GateId, { state: State; msg: Bi }>>;
  effect: Effect;
  ok: boolean;
  result: Bi;
}

function evaluate(g: Guard, a: Actor): Outcome {
  if (g === "none") {
    return {
      gates: {
        ver: { state: "skip", msg: { vi: "Bucket chưa bật versioning; mỗi object chỉ có một phiên bản.", en: "Versioning is not enabled on the bucket; each object has only one version." } },
        mfa: { state: "skip", msg: { vi: "Chưa được bật.", en: "Not enabled." } },
        lock: { state: "skip", msg: { vi: "Chưa được bật.", en: "Not enabled." } },
      },
      effect: "gone", ok: false,
      result: { vi: "Hoá đơn bị xoá vĩnh viễn, không còn phiên bản nào để khôi phục. Bucket chứa dữ liệu quan trọng cần bật tối thiểu **versioning**.", en: "The invoice is permanently deleted; no version remains to restore. A bucket that holds important data needs at least **versioning** enabled." },
    };
  }
  const lockMsg: Bi = g === "gov" || g === "comp" ? { vi: "Delete marker không tác động tới phiên bản đang bị khoá.", en: "A delete marker does not affect the locked version." } : g === "hold" ? { vi: "Legal hold chỉ khoá phiên bản v1, không ngăn việc tạo delete marker.", en: "The legal hold locks only version v1; it does not prevent a delete marker from being created." } : { vi: "Bucket không dùng Object Lock.", en: "The bucket does not use Object Lock." };
  if (!a.version) {
    return {
      gates: {
        ver: { state: "change", msg: { vi: "Thao tác xoá thông thường chỉ tạo một **delete marker** làm phiên bản hiện hành. Phiên bản v1 vẫn được giữ.", en: "A simple delete only inserts a **delete marker** as the current version. Version v1 is kept." } },
        mfa: { state: "skip", msg: { vi: "Thao tác xoá thông thường không yêu cầu MFA.", en: "A simple delete does not require MFA." } },
        lock: { state: "skip", msg: lockMsg },
      },
      effect: "marker", ok: true,
      result: { vi: "Hoá đơn không còn xuất hiện trong danh sách object nhưng phiên bản v1 vẫn tồn tại. Xoá delete marker để khôi phục ngay.", en: "The invoice no longer appears in the object list, but version v1 still exists. Delete the delete marker to restore it immediately." },
    };
  }
  const gates: Outcome["gates"] = { ver: { state: "pass", msg: { vi: "Request xoá vĩnh viễn phiên bản **v1**, không tạo delete marker.", en: "The request permanently deletes version **v1**; no delete marker is created." } } };
  if (g === "mfa") {
    if (!a.mfa) {
      gates.mfa = { state: "block", msg: { vi: "**MFA Delete** đang được bật: xoá vĩnh viễn một phiên bản yêu cầu kèm mã từ thiết bị MFA.", en: "**MFA Delete** is enabled: permanently deleting a version requires a code from the MFA device." } };
      return { gates, effect: "kept", ok: true, result: { vi: "403: request không kèm mã MFA nên bị từ chối. Hoá đơn v1 được giữ nguyên.", en: "403: the request carries no MFA code, so it is denied. Invoice v1 is kept intact." } };
    }
    gates.mfa = { state: "pass", msg: { vi: "Request kèm mã MFA từ thiết bị của root.", en: "The request includes an MFA code from the root user’s device." } };
  } else {
    gates.mfa = { state: "skip", msg: { vi: "MFA Delete chưa được bật.", en: "MFA Delete is not enabled." } };
  }
  if (g === "gov") {
    if (!a.bypass) {
      gates.lock = { state: "block", msg: { vi: "Object còn trong thời hạn lưu giữ (**Retain Until Date** 2033). Governance mode từ chối request của người không có quyền bypass.", en: "The object is still within its retention period (**Retain Until Date** 2033). Governance mode denies requests from users without bypass permission." } };
      return { gates, effect: "kept", ok: true, result: { vi: "403: hoá đơn v1 được giữ nguyên.", en: "403: invoice v1 is kept intact." } };
    }
    gates.lock = { state: "pass", msg: { vi: "**Governance mode** cho phép người có quyền `s3:BypassGovernanceRetention` và gửi kèm header bypass thực hiện xoá.", en: "**Governance mode** lets a user who has the `s3:BypassGovernanceRetention` permission and sends the bypass header delete the object." } };
    return { gates, effect: "gone", ok: false, result: { vi: "Phiên bản v1 bị xoá dù còn trong thời hạn lưu giữ. Governance mode phù hợp để kiểm thử cấu hình. Khi yêu cầu đảm bảo **không ai** xoá được, sử dụng **Compliance mode**.", en: "Version v1 is deleted even though it is still within its retention period. Governance mode suits testing a configuration. When **no one** must be able to delete, use **Compliance mode**." } };
  }
  if (g === "comp") {
    gates.lock = { state: "block", msg: { vi: "**Compliance mode**: không ai có thể xoá object hoặc rút ngắn thời hạn lưu giữ trước Retain Until Date, kể cả root.", en: "**Compliance mode**: no one, including the root user, can delete the object or shorten its retention period before the Retain Until Date." } };
    return { gates, effect: "kept", ok: true, result: { vi: "403: hoá đơn v1 được giữ nguyên tới năm 2033, đáp ứng yêu cầu lưu trữ.", en: "403: invoice v1 is kept intact until 2033, meeting the retention requirement." } };
  }
  if (g === "hold") {
    gates.lock = { state: "block", msg: { vi: "**Legal hold** đang được bật. Hold không có ngày hết hạn và duy trì hiệu lực tới khi được gỡ.", en: "A **legal hold** is on. A hold has no expiration date and stays in effect until it is removed." } };
    return { gates, effect: "kept", ok: true, result: { vi: "403: object chỉ xoá được sau khi người có quyền `s3:PutObjectLegalHold` gỡ hold.", en: "403: the object can be deleted only after a user with the `s3:PutObjectLegalHold` permission removes the hold." } };
  }
  gates.lock = { state: "skip", msg: lockMsg };
  if (g === "mfa") {
    return { gates, effect: "gone", ok: false, result: { vi: "Root có MFA vẫn xoá vĩnh viễn được. MFA Delete bổ sung một lớp xác thực, không phải cơ chế khoá tuyệt đối.", en: "The root user with MFA can still delete permanently. MFA Delete adds a layer of authentication; it is not an absolute lock." } };
  }
  return { gates, effect: "gone", ok: false, result: { vi: "Phiên bản v1 bị xoá vĩnh viễn. Versioning chống xoá nhầm nhưng không ngăn người có quyền xoá phiên bản. Cần bổ sung **MFA Delete** hoặc **Object Lock**.", en: "Version v1 is permanently deleted. Versioning protects against accidental deletes but does not stop users who have permission to delete versions. Add **MFA Delete** or **Object Lock**." } };
}

const TAG: Record<State, { text: Bi; cls: string }> = {
  pass: { text: { vi: "QUA", en: "PASS" }, cls: "hit" },
  block: { text: { vi: "CHẶN", en: "BLOCK" }, cls: "bad" },
  skip: { text: { vi: "BỎ QUA", en: "SKIP" }, cls: "info" },
  change: { text: { vi: "MARKER", en: "MARKER" }, cls: "miss" },
};

type LogEntry = { tag: State | "result"; ok?: boolean; gate?: string; msg: Bi };

export default function DeleteGuardSim() {
  const L = useLang();
  const pk = useRef<SVGGElement>(null);
  const [guard, setGuard] = useState<Guard>("ver");
  const [actorId, setActorId] = useState<ActorId>("staff");
  const actor = ACTORS.find((a) => a.id === actorId)!;
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Partial<Record<GateId, State>>>({});
  const [effect, setEffect] = useState<Effect | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  function reset() {
    setLit({});
    setEffect(null);
    setLog([]);
  }

  async function send() {
    const layer = pk.current;
    if (!layer || busy) return;
    setBusy(true);
    reset();
    const out = evaluate(guard, actor);
    let at: Pt = ACTOR;
    let blocked = false;
    for (const [i, g] of GATES.entries()) {
      const step = out.gates[g.id];
      if (!step) break;
      const next: Pt = [GX(i), LANE];
      await travel(layer, [at, next], i === 0 ? 450 : 280, step.state === "block" ? "pkt-bad" : "pkt");
      at = next;
      setLit((s) => ({ ...s, [g.id]: step.state }));
      setLog((l) => [...l, { tag: step.state, gate: g.l1, msg: step.msg }]);
      if (step.state === "block") {
        flashText(layer, GX(i), LANE - 50, "403", "flash-bad", 900);
        await travel(layer, [at, ACTOR], 500, "pkt-bad");
        blocked = true;
        setEffect("kept");
        break;
      }
    }
    if (!blocked) {
      await travel(layer, [at, [530, LANE], [530, OBJ[1]], OBJ], 420, "pkt");
      setEffect(out.effect);
      if (out.effect === "gone") flashText(layer, 670, 196, L({ vi: "xoá vĩnh viễn", en: "permanently deleted" }), "flash-bad", 1200);
    }
    setLog((l) => [...l, { tag: "result", ok: out.ok, msg: out.result }]);
    setBusy(false);
  }

  const locked = guard === "gov" || guard === "comp";
  const versioned = guard !== "none";

  return (
    <div className="stage s3x">
      <div className="s3x-row" role="group" aria-label={L({ vi: "Cơ chế bảo vệ bucket", en: "Bucket protection" })}>
        <span className="s3x-lbl">Bucket</span>
        {GUARDS.map((g) => (
          <button key={g.id} className="chip" aria-pressed={g.id === guard} disabled={busy} onClick={() => { setGuard(g.id); reset(); }}>{L(g.name)}</button>
        ))}
      </div>
      <div className="s3x-row" role="group" aria-label={L({ vi: "Chủ thể xoá", en: "Who deletes" })}>
        <span className="s3x-lbl">{L({ vi: "Chủ thể", en: "Actor" })}</span>
        {ACTORS.map((a) => (
          <button key={a.id} className="chip" aria-pressed={a.id === actorId} disabled={busy} onClick={() => { setActorId(a.id); reset(); }}>{L(a.name)}</button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="s3x-req">{actor.request}</code>
        <button className="btn primary" onClick={send} disabled={busy}>{L({ vi: "Xoá hoá đơn", en: "Delete invoice" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 205" role="img" aria-label={L({ vi: "Request xoá hoá đơn đi qua versioning, MFA Delete và Object Lock trước khi tới object trong bucket S3", en: "The invoice delete request passes versioning, MFA Delete and Object Lock before it reaches the object in the S3 bucket" })}>
          <path className="s3x-wire" d={`M60 ${LANE} H530 V${OBJ[1]} H${OBJ[0]}`} />
          <g transform={`translate(60 ${LANE})`} aria-hidden="true">
            <circle className="user" cy={-9} r={7} />
            <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="s3x-t" x={60} y={LANE + 40} textAnchor="middle">{L({ vi: "Chủ thể xoá", en: "Requester" })}</text>
          {GATES.map((g, i) => (
            <g key={g.id} className={`s3x-node ${lit[g.id] ?? ""}`}>
              <rect x={GX(i) - 46} y={LANE - 35} width={92} height={70} rx={8} />
              <text className="s3x-t" x={GX(i)} y={LANE - 3} textAnchor="middle">{g.l1}</text>
              <text className="s3x-s" x={GX(i)} y={LANE + 13} textAnchor="middle">{L(g.l2)}</text>
            </g>
          ))}
          <rect className="s3x-box" x={510} y={30} width={300} height={186} rx={12} />
          <text className="s3x-m" x={524} y={48}>bucket mftech-hoadon</text>
          {effect === "marker" && (
            <g className="s3x-node warn s3x-pop">
              <rect x={OBJ[0]} y={66} width={220} height={34} rx={7} />
              <text className="s3x-t" x={OBJ[0] + 110} y={88} textAnchor="middle">{L({ vi: "delete marker (mới nhất)", en: "delete marker (latest)" })}</text>
            </g>
          )}
          <g className={`s3x-node ${effect === "gone" ? "bad" : effect === "kept" ? "ok" : effect === "marker" ? "ok" : "on"}`}>
            <rect x={OBJ[0]} y={OBJ[1] - 22} width={220} height={44} rx={7} />
            <text className="s3x-t" x={OBJ[0] + 110} y={OBJ[1] - 3} textAnchor="middle">hd-0815.pdf · v1</text>
            <text className="s3x-s" x={OBJ[0] + 110} y={OBJ[1] + 13} textAnchor="middle">
              {effect === "gone" ? L({ vi: "đã bị xoá", en: "deleted" }) : versioned ? L({ vi: "phiên bản được giữ lại", en: "version is kept" }) : L({ vi: "bản duy nhất", en: "only copy" })}
            </text>
            {effect === "gone" && <line className="s3x-strike" x1={OBJ[0] + 14} y1={OBJ[1]} x2={OBJ[0] + 206} y2={OBJ[1]} />}
          </g>
          <text className="s3x-m" x={OBJ[0] + 110} y={180} textAnchor="middle">
            {locked ? `${guard === "gov" ? "Governance" : "Compliance"} · ${L({ vi: "giữ tới 2033", en: "retain until 2033" })}` : guard === "hold" ? L({ vi: "legal hold: giữ tới khi được gỡ", en: "legal hold: kept until removed" }) : ""}
          </text>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="s3x-hint">{L({ vi: <>Chọn cơ chế bảo vệ và chủ thể xoá, sau đó nhấn <b>Xoá hoá đơn</b>. Thay đổi lựa chọn và thực hiện lại để so sánh kết quả.</>, en: <>Choose a protection and who deletes, then press <b>Delete invoice</b>. Change the choices and run again to compare the results.</> })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag === "result" ? (
                <li key={i} className={`s3x-result ${e.ok ? "ok" : "bad"}`}>{rich(L(e.msg))}</li>
              ) : (
                <li key={i}>
                  <span className={`tag ${TAG[e.tag].cls}`}>{L(TAG[e.tag].text)}</span>
                  <span><b>{e.gate}:</b> {rich(L(e.msg))}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
