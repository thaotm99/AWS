import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";

// One request of ShopViet walks through the checks CloudFront runs at the edge,
// then reaches an origin. Each scenario turns on the feature that solves one real
// problem: HTTPS certificate, WAF, geo restriction, signed cookies, field-level
// encryption, cache behaviors and origin-group failover.

type GateId = "tls" | "waf" | "geo" | "sign" | "fle" | "route";
type OriginId = "s3a" | "s3b" | "alb";
type State = "pass" | "block" | "skip" | "change";

const GATES: { id: GateId; l1: string; l2: string }[] = [
  { id: "tls", l1: "TLS", l2: "chứng chỉ ACM" },
  { id: "waf", l1: "AWS WAF", l2: "web ACL" },
  { id: "geo", l1: "Geo", l2: "restriction" },
  { id: "sign", l1: "Signed", l2: "URL/cookie" },
  { id: "fle", l1: "Field-level", l2: "encryption" },
  { id: "route", l1: "Cache", l2: "behavior" },
];
const GX = (i: number) => 180 + i * 75;
const LANE = 150;
const USER: Pt = [60, LANE];
const ORIGINS: Record<OriginId, { y: number; l1: string; l2: string }> = {
  s3a: { y: 69, l1: "S3 Singapore", l2: "origin chính" },
  s3b: { y: 127, l1: "S3 Tokyo", l2: "origin dự phòng" },
  alb: { y: 219, l1: "ALB → API", l2: "tầng ứng dụng" },
};

interface Outcome {
  gates: Partial<Record<GateId, { state: State; msg: string }>>;
  /** Missing when a gate blocks the request. */
  origin?: OriginId;
  failover?: boolean;
  ok: boolean;
  result: string;
}

interface Scenario {
  name: string;
  request: string;
  from: string;
  toggle?: { label: string; initial: boolean };
  run(on: boolean): Outcome;
}

const PASS_TLS = { state: "pass" as const, msg: "TLS termination bằng chứng chỉ ACM của **shopviet.vn** (us-east-1)." };
const PASS_WAF = { state: "pass" as const, msg: "Request không khớp rule chặn nào trong web ACL." };
const PASS_GEO = { state: "pass" as const, msg: "Quốc gia nguồn (VN) thuộc allow list." };
const OPEN = { state: "skip" as const, msg: "Nội dung công khai, không yêu cầu chữ ký." };
const NO_FIELD = { state: "skip" as const, msg: "Request không chứa trường dữ liệu cần mã hoá." };

const SCENARIOS: Scenario[] = [
  {
    name: "Truy xuất ảnh sản phẩm",
    request: "GET /images/ao-thun.jpg",
    from: "Việt Nam",
    run: () => ({
      gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
        route: { state: "pass", msg: "Path `/images/*` khớp cache behavior trỏ tới origin **S3**." } },
      origin: "s3a", ok: true,
      result: "200 OK: object được trả về và lưu tại edge cache; các request tiếp theo trong thời gian TTL được phục vụ từ cache.",
    }),
  },
  {
    name: "Tấn công SQL injection",
    request: "GET /api/search?q=' OR 1=1 --",
    from: "không xác định",
    toggle: { label: "Kích hoạt managed rule SQL injection", initial: true },
    run: (on) => on
      ? { gates: { tls: PASS_TLS, waf: { state: "block", msg: "Managed rule **SQL injection** khớp payload `' OR 1=1`; request bị chặn tại edge." } },
          ok: true, result: "403 Forbidden: request độc hại bị loại bỏ tại edge, không phát sinh tải cho tầng ứng dụng." }
      : { gates: { tls: PASS_TLS, waf: { state: "pass", msg: "Không có rule nào phát hiện payload." }, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
            route: { state: "pass", msg: "Path `/api/*` khớp cache behavior trỏ tới **ALB**." } },
          origin: "alb", ok: false, result: "Request độc hại được chuyển tới tầng ứng dụng. Cần liên kết AWS WAF web ACL với distribution để lọc tại edge." },
  },
  {
    name: "Truy cập từ quốc gia bị giới hạn",
    request: "GET /videos/khoa-hoc-1.mp4",
    from: "quốc gia ngoài phạm vi bản quyền",
    toggle: { label: "Request xuất phát từ Việt Nam", initial: false },
    run: (on) => on
      ? { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: { state: "pass", msg: "Signed cookie hợp lệ: người dùng có quyền truy cập khoá học." }, fle: NO_FIELD,
            route: { state: "pass", msg: "Path `/videos/*` khớp cache behavior trỏ tới **S3**." } },
          origin: "s3a", ok: true, result: "200 OK: nội dung video được phân phối." }
      : { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: { state: "block", msg: "Quốc gia nguồn thuộc block list của **geo restriction**." } },
          ok: true, result: "403 Forbidden: CloudFront từ chối tại edge theo điều khoản bản quyền." },
  },
  {
    name: "Nội dung trả phí",
    request: "GET /videos/khoa-hoc-1.mp4",
    from: "Việt Nam",
    toggle: { label: "Người dùng đã mua khoá học", initial: false },
    run: (on) => on
      ? { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO,
            sign: { state: "pass", msg: "**Signed cookie** hợp lệ; một cookie cấp quyền cho nhiều object mà không thay đổi URL." }, fle: NO_FIELD,
            route: { state: "pass", msg: "Path `/videos/*` khớp cache behavior trỏ tới **S3**." } },
          origin: "s3a", ok: true, result: "200 OK: nội dung được phân phối. Trường hợp cấp quyền cho một object riêng lẻ, sử dụng **signed URL**." }
      : { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: { state: "block", msg: "Request không kèm signed URL hoặc signed cookie hợp lệ." } },
          ok: true, result: "403 Forbidden: người dùng không có quyền không truy cập được nội dung, kể cả khi biết URL." },
  },
  {
    name: "Dữ liệu thanh toán",
    request: "POST /api/checkout  { card: 4111… }",
    from: "Việt Nam",
    run: () => ({
      gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN,
        fle: { state: "change", msg: "**Field-level encryption** mã hoá trường `card` bằng public key tại edge." },
        route: { state: "pass", msg: "Path `/api/*` khớp cache behavior trỏ tới **ALB**." } },
      origin: "alb", ok: true,
      result: "200 OK: load balancer, log và các thành phần trung gian chỉ tiếp nhận giá trị đã mã hoá; chỉ dịch vụ thanh toán nắm private key mới giải mã được.",
    }),
  },
  {
    name: "Sự cố origin chính",
    request: "GET /images/banner.jpg",
    from: "Việt Nam",
    toggle: { label: "Origin S3 Singapore lỗi", initial: true },
    run: (on) => ({
      gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
        route: { state: "pass", msg: "Cache behavior trỏ tới **origin group**: S3 Singapore (primary) và S3 Tokyo (secondary)." } },
      origin: on ? "s3b" : "s3a", failover: on, ok: true,
      result: on
        ? "200 OK: origin primary trả về 5xx, CloudFront tự động gửi lại request tới origin secondary; người dùng không nhận lỗi."
        : "200 OK: origin primary phản hồi bình thường; origin secondary không được sử dụng.",
    }),
  },
  {
    name: "Tên miền tuỳ chỉnh",
    request: "GET https://shopviet.vn/",
    from: "Việt Nam",
    toggle: { label: "Chứng chỉ ACM tạo tại us-east-1", initial: false },
    run: (on) => on
      ? { gates: { tls: { state: "pass", msg: "Chứng chỉ ACM tại **us-east-1** (N. Virginia) được liên kết với distribution." }, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
            route: { state: "pass", msg: "Default behavior `*` trỏ tới **S3**." } },
          origin: "s3a", ok: true, result: "200 OK: trang chủ được phục vụ qua HTTPS với tên miền tuỳ chỉnh." }
      : { gates: { tls: { state: "block", msg: "Chứng chỉ tạo ở ap-southeast-1. CloudFront chỉ nhận chứng chỉ ACM ở **us-east-1**, dù origin ở Region nào." } },
          ok: false, result: "Trình duyệt báo lỗi chứng chỉ. Cần tạo chứng chỉ ACM tại us-east-1 và liên kết với distribution." },
  },
];

const TAG: Record<State, { text: string; cls: string }> = {
  pass: { text: "QUA", cls: "hit" },
  block: { text: "CHẶN", cls: "bad" },
  skip: { text: "BỎ QUA", cls: "info" },
  change: { text: "MÃ HOÁ", cls: "miss" },
};

export default function EdgePipelineSim() {
  const pk = useRef<SVGGElement>(null);
  const [index, setIndex] = useState(0);
  const sc = SCENARIOS[index];
  const [on, setOn] = useState(sc.toggle?.initial ?? false);
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Partial<Record<GateId, State>>>({});
  const [origins, setOrigins] = useState<Partial<Record<OriginId, "ok" | "bad">>>({});
  const [log, setLog] = useState<{ tag: State | "result"; ok?: boolean; gate?: string; msg: ReactNode }[]>([]);

  function pick(i: number) {
    if (busy) return;
    setIndex(i);
    setOn(SCENARIOS[i].toggle?.initial ?? false);
    reset();
  }

  function reset() {
    setLit({});
    setOrigins({});
    setLog([]);
  }

  async function send() {
    const layer = pk.current;
    if (!layer || busy) return;
    setBusy(true);
    reset();
    const out = sc.run(on);
    let at: Pt = USER;
    for (const [i, g] of GATES.entries()) {
      const step = out.gates[g.id];
      if (!step) break;
      const next: Pt = [GX(i), LANE];
      await travel(layer, [at, next], i === 0 ? 420 : 260, step.state === "block" ? "pkt-bad" : "pkt");
      at = next;
      setLit((s) => ({ ...s, [g.id]: step.state }));
      setLog((l) => [...l, { tag: step.state, gate: `${g.l1} ${g.l2}`, msg: rich(step.msg) }]);
      if (step.state === "block") {
        flashText(layer, GX(i), LANE - 50, "403", "flash-bad", 900);
        await travel(layer, [at, USER], 500, "pkt-bad");
        break;
      }
    }
    if (out.origin) {
      const lane: Pt = [610, LANE];
      const target = out.failover ? "s3a" : out.origin;
      await travel(layer, [at, lane, [610, ORIGINS[target].y], [640, ORIGINS[target].y]], 500, "pkt-edge");
      if (out.failover) {
        setOrigins({ s3a: "bad" });
        flashText(layer, 715, ORIGINS.s3a.y - 30, "5xx", "flash-bad", 900);
        await travel(layer, [[640, ORIGINS.s3a.y], [620, ORIGINS.s3a.y], [620, ORIGINS.s3b.y], [640, ORIGINS.s3b.y]], 450, "pkt-edge");
      }
      setOrigins((o) => ({ ...o, [out.origin!]: out.ok ? "ok" : "bad" }));
      await travel(layer, [[640, ORIGINS[out.origin].y], [610, ORIGINS[out.origin].y], lane, USER], 800, out.ok ? "pkt-back" : "pkt-bad");
    }
    setLog((l) => [...l, { tag: "result", ok: out.ok, msg: rich(out.result) }]);
    setBusy(false);
  }

  return (
    <div className="stage cfp">
      <div className="cfp-scenarios" role="tablist" aria-label="Tình huống">
        {SCENARIOS.map((s, i) => (
          <button key={s.name} role="tab" aria-selected={i === index} className="chip" aria-pressed={i === index} onClick={() => pick(i)} disabled={busy && i !== index}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="cfp-req">{sc.request}</code>
        <span className="cfp-from">nguồn: {sc.from}</span>
        {sc.toggle && (
          <label className="cfp-toggle">
            <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(); }} />
            {sc.toggle.label}
          </label>
        )}
        <button className="btn primary" onClick={send} disabled={busy}>Gửi request</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 30 820 222" role="img" aria-label="Request đi từ khách qua các trạm kiểm tra của CloudFront tại edge, rồi tới origin S3 hoặc ALB">
          <path d={`M60 ${LANE} H610`} stroke="var(--line)" strokeWidth={2} fill="none" />
          {(Object.keys(ORIGINS) as OriginId[]).map((id) => (
            <path key={id} d={`M610 ${LANE} V${ORIGINS[id].y} H640`} stroke="var(--line)" strokeWidth={2} fill="none" />
          ))}
          <rect className="cfp-edge" x={138} y={52} width={460} height={190} rx={12} />
          <text className="edge-t" x={150} y={72}>CloudFront · edge location gần người dùng</text>
          <g transform={`translate(60 ${LANE})`} aria-hidden="true">
            <circle className="user" cy={-9} r={7} />
            <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="t" x={60} y={LANE + 40} textAnchor="middle">Người dùng</text>
          {GATES.map((g, i) => (
            <g key={g.id} className={`cfp-gate ${lit[g.id] ?? ""}`}>
              <rect x={GX(i) - 34} y={LANE - 37} width={68} height={74} rx={8} />
              <text className="cfp-gt" x={GX(i)} y={LANE - 4} textAnchor="middle">{g.l1}</text>
              <text className="cfp-gs" x={GX(i)} y={LANE + 12} textAnchor="middle">{g.l2}</text>
            </g>
          ))}
          <rect className="cfp-group" x={632} y={38} width={180} height={124} rx={10} />
          <text className="ts" x={722} y={176} textAnchor="middle">origin group</text>
          {(Object.keys(ORIGINS) as OriginId[]).map((id) => (
            <g key={id} className={`cfp-origin ${origins[id] ?? ""}`}>
              <rect x={640} y={ORIGINS[id].y - 23} width={164} height={46} rx={8} />
              <text className="cfp-gt" x={722} y={ORIGINS[id].y - 3} textAnchor="middle">{ORIGINS[id].l1}</text>
              <text className="cfp-gs" x={722} y={ORIGINS[id].y + 13} textAnchor="middle">{ORIGINS[id].l2}</text>
            </g>
          ))}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="cfp-hint">Nhấn <b>Gửi request</b> để quan sát từng bước xử lý tại edge.{sc.toggle ? " Thay đổi cấu hình và gửi lại để so sánh kết quả." : ""}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag === "result" ? (
                <li key={i} className={`cfp-result ${e.ok ? "ok" : "bad"}`}>{e.msg}</li>
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
