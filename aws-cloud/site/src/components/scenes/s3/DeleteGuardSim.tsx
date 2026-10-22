import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./s3-sims.css";

// ShopViet keeps invoices in S3 for years. Pick how the bucket is protected and who
// tries to delete an invoice, then watch which layer stops the request:
// versioning (delete marker), MFA Delete, Object Lock governance/compliance, legal hold.
// Source questions: exam1_q20, exam5_q50, exam1_q56, exam4_q64, exam5_q39.

type Guard = "none" | "ver" | "mfa" | "gov" | "comp" | "hold";
type ActorId = "staff" | "script" | "admin" | "root";
type GateId = "ver" | "mfa" | "lock";
type State = "pass" | "block" | "skip" | "change";
type Effect = "gone" | "marker" | "kept";

const GUARDS: { id: Guard; name: string }[] = [
  { id: "none", name: "Không bảo vệ" },
  { id: "ver", name: "Versioning" },
  { id: "mfa", name: "Versioning + MFA Delete" },
  { id: "gov", name: "Object Lock · Governance" },
  { id: "comp", name: "Object Lock · Compliance" },
  { id: "hold", name: "Legal hold" },
];

interface Actor { id: ActorId; name: string; request: string; version: boolean; mfa: boolean; bypass: boolean }
const ACTORS: Actor[] = [
  { id: "staff", name: "Nhân viên thực hiện Delete", request: "DELETE hd-0815.pdf", version: false, mfa: false, bypass: false },
  { id: "script", name: "Script dọn dẹp xoá vĩnh viễn", request: "DELETE hd-0815.pdf?versionId=v1", version: true, mfa: false, bypass: false },
  { id: "admin", name: "Admin có quyền bypass", request: "DELETE …?versionId=v1 + bypass-governance", version: true, mfa: false, bypass: true },
  { id: "root", name: "Root user có MFA", request: "DELETE …?versionId=v1 + MFA + bypass", version: true, mfa: true, bypass: true },
];

const GATES: { id: GateId; l1: string; l2: string }[] = [
  { id: "ver", l1: "Versioning", l2: "lưu phiên bản" },
  { id: "mfa", l1: "MFA Delete", l2: "xác thực bổ sung" },
  { id: "lock", l1: "Object Lock", l2: "retention, hold" },
];
const GX = (i: number) => 220 + i * 110;
const LANE = 120;
const ACTOR: Pt = [60, LANE];
const OBJ: Pt = [560, 138];

interface Outcome {
  gates: Partial<Record<GateId, { state: State; msg: string }>>;
  effect: Effect;
  ok: boolean;
  result: string;
}

function evaluate(g: Guard, a: Actor): Outcome {
  if (g === "none") {
    return {
      gates: {
        ver: { state: "skip", msg: "Bucket chưa bật versioning; mỗi object chỉ có một phiên bản." },
        mfa: { state: "skip", msg: "Chưa được bật." },
        lock: { state: "skip", msg: "Chưa được bật." },
      },
      effect: "gone", ok: false,
      result: "Hoá đơn bị xoá vĩnh viễn, không còn phiên bản nào để khôi phục. Bucket chứa dữ liệu quan trọng cần bật tối thiểu **versioning**.",
    };
  }
  const lockMsg = g === "gov" || g === "comp" ? "Delete marker không tác động tới phiên bản đang bị khoá." : g === "hold" ? "Legal hold chỉ khoá phiên bản v1, không ngăn việc tạo delete marker." : "Bucket không dùng Object Lock.";
  if (!a.version) {
    return {
      gates: {
        ver: { state: "change", msg: "Thao tác xoá thông thường chỉ tạo một **delete marker** làm phiên bản hiện hành. Phiên bản v1 vẫn được giữ." },
        mfa: { state: "skip", msg: "Thao tác xoá thông thường không yêu cầu MFA." },
        lock: { state: "skip", msg: lockMsg },
      },
      effect: "marker", ok: true,
      result: "Hoá đơn không còn xuất hiện trong danh sách object nhưng phiên bản v1 vẫn tồn tại. Xoá delete marker để khôi phục ngay.",
    };
  }
  const gates: Outcome["gates"] = { ver: { state: "pass", msg: "Request xoá vĩnh viễn phiên bản **v1**, không tạo delete marker." } };
  if (g === "mfa") {
    if (!a.mfa) {
      gates.mfa = { state: "block", msg: "**MFA Delete** đang được bật: xoá vĩnh viễn một phiên bản yêu cầu mã MFA của root." };
      return { gates, effect: "kept", ok: true, result: "403: request không kèm mã MFA nên bị từ chối. Hoá đơn v1 được giữ nguyên." };
    }
    gates.mfa = { state: "pass", msg: "Request kèm mã MFA từ thiết bị của root." };
  } else {
    gates.mfa = { state: "skip", msg: "MFA Delete chưa được bật." };
  }
  if (g === "gov") {
    if (!a.bypass) {
      gates.lock = { state: "block", msg: "Object còn trong thời hạn lưu giữ (**Retain Until Date** 2033). Governance mode từ chối request của người không có quyền bypass." };
      return { gates, effect: "kept", ok: true, result: "403: hoá đơn v1 được giữ nguyên." };
    }
    gates.lock = { state: "pass", msg: "**Governance mode** cho phép người có quyền `s3:BypassGovernanceRetention` và gửi kèm header bypass thực hiện xoá." };
    return { gates, effect: "gone", ok: false, result: "Phiên bản v1 bị xoá dù còn trong thời hạn lưu giữ. Governance mode phù hợp để kiểm thử cấu hình. Khi yêu cầu đảm bảo **không ai** xoá được, sử dụng **Compliance mode**." };
  }
  if (g === "comp") {
    gates.lock = { state: "block", msg: "**Compliance mode**: không ai có thể xoá object hoặc rút ngắn thời hạn lưu giữ trước Retain Until Date, kể cả root." };
    return { gates, effect: "kept", ok: true, result: "403: hoá đơn v1 được giữ nguyên tới năm 2033, đáp ứng yêu cầu lưu trữ." };
  }
  if (g === "hold") {
    gates.lock = { state: "block", msg: "**Legal hold** đang được bật. Hold không có ngày hết hạn và duy trì hiệu lực tới khi được gỡ." };
    return { gates, effect: "kept", ok: true, result: "403: object chỉ xoá được sau khi người có quyền `s3:PutObjectLegalHold` gỡ hold." };
  }
  gates.lock = { state: "skip", msg: lockMsg };
  if (g === "mfa") {
    return { gates, effect: "gone", ok: false, result: "Root có MFA vẫn xoá vĩnh viễn được. MFA Delete bổ sung một lớp xác thực, không phải cơ chế khoá tuyệt đối." };
  }
  return { gates, effect: "gone", ok: false, result: "Phiên bản v1 bị xoá vĩnh viễn. Versioning chống xoá nhầm nhưng không ngăn người có quyền xoá phiên bản. Cần bổ sung **MFA Delete** hoặc **Object Lock**." };
}

const TAG: Record<State, { text: string; cls: string }> = {
  pass: { text: "QUA", cls: "hit" },
  block: { text: "CHẶN", cls: "bad" },
  skip: { text: "BỎ QUA", cls: "info" },
  change: { text: "MARKER", cls: "miss" },
};

type LogEntry = { tag: State | "result"; ok?: boolean; gate?: string; msg: ReactNode };

export default function DeleteGuardSim() {
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
      setLog((l) => [...l, { tag: step.state, gate: g.l1, msg: rich(step.msg) }]);
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
      if (out.effect === "gone") flashText(layer, 670, 196, "xoá vĩnh viễn", "flash-bad", 1200);
    }
    setLog((l) => [...l, { tag: "result", ok: out.ok, msg: rich(out.result) }]);
    setBusy(false);
  }

  const locked = guard === "gov" || guard === "comp";
  const versioned = guard !== "none";

  return (
    <div className="stage s3x">
      <div className="s3x-row" role="group" aria-label="Cơ chế bảo vệ bucket">
        <span className="s3x-lbl">Bucket</span>
        {GUARDS.map((g) => (
          <button key={g.id} className="chip" aria-pressed={g.id === guard} disabled={busy} onClick={() => { setGuard(g.id); reset(); }}>{g.name}</button>
        ))}
      </div>
      <div className="s3x-row" role="group" aria-label="Chủ thể xoá">
        <span className="s3x-lbl">Chủ thể</span>
        {ACTORS.map((a) => (
          <button key={a.id} className="chip" aria-pressed={a.id === actorId} disabled={busy} onClick={() => { setActorId(a.id); reset(); }}>{a.name}</button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="s3x-req">{actor.request}</code>
        <button className="btn primary" onClick={send} disabled={busy}>Xoá hoá đơn</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 205" role="img" aria-label="Request xoá hoá đơn đi qua versioning, MFA Delete và Object Lock trước khi tới object trong bucket S3">
          <path className="s3x-wire" d={`M60 ${LANE} H530 V${OBJ[1]} H${OBJ[0]}`} />
          <g transform={`translate(60 ${LANE})`} aria-hidden="true">
            <circle className="user" cy={-9} r={7} />
            <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="s3x-t" x={60} y={LANE + 40} textAnchor="middle">Chủ thể xoá</text>
          {GATES.map((g, i) => (
            <g key={g.id} className={`s3x-node ${lit[g.id] ?? ""}`}>
              <rect x={GX(i) - 46} y={LANE - 35} width={92} height={70} rx={8} />
              <text className="s3x-t" x={GX(i)} y={LANE - 3} textAnchor="middle">{g.l1}</text>
              <text className="s3x-s" x={GX(i)} y={LANE + 13} textAnchor="middle">{g.l2}</text>
            </g>
          ))}
          <rect className="s3x-box" x={510} y={30} width={300} height={186} rx={12} />
          <text className="s3x-m" x={524} y={48}>bucket shopviet-hoadon</text>
          {effect === "marker" && (
            <g className="s3x-node warn s3x-pop">
              <rect x={OBJ[0]} y={66} width={220} height={34} rx={7} />
              <text className="s3x-t" x={OBJ[0] + 110} y={88} textAnchor="middle">delete marker (mới nhất)</text>
            </g>
          )}
          <g className={`s3x-node ${effect === "gone" ? "bad" : effect === "kept" ? "ok" : effect === "marker" ? "ok" : "on"}`}>
            <rect x={OBJ[0]} y={OBJ[1] - 22} width={220} height={44} rx={7} />
            <text className="s3x-t" x={OBJ[0] + 110} y={OBJ[1] - 3} textAnchor="middle">hd-0815.pdf · v1</text>
            <text className="s3x-s" x={OBJ[0] + 110} y={OBJ[1] + 13} textAnchor="middle">
              {effect === "gone" ? "đã bị xoá" : versioned ? "phiên bản được giữ lại" : "bản duy nhất"}
            </text>
            {effect === "gone" && <line className="s3x-strike" x1={OBJ[0] + 14} y1={OBJ[1]} x2={OBJ[0] + 206} y2={OBJ[1]} />}
          </g>
          <text className="s3x-m" x={OBJ[0] + 110} y={180} textAnchor="middle">
            {locked ? `${guard === "gov" ? "Governance" : "Compliance"} · giữ tới 2033` : guard === "hold" ? "legal hold: giữ tới khi được gỡ" : ""}
          </text>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="s3x-hint">Chọn cơ chế bảo vệ và chủ thể xoá, sau đó nhấn <b>Xoá hoá đơn</b>. Thay đổi lựa chọn và thực hiện lại để so sánh kết quả.</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag === "result" ? (
                <li key={i} className={`s3x-result ${e.ok ? "ok" : "bad"}`}>{e.msg}</li>
              ) : (
                <li key={i}>
                  <span className={`tag ${TAG[e.tag].cls}`}>{TAG[e.tag].text}</span>
                  <span><b>{e.gate}:</b> {e.msg}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
