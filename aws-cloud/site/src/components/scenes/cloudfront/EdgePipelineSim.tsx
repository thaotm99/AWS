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
  { id: "tls", l1: "HTTPS", l2: "chứng chỉ" },
  { id: "waf", l1: "AWS WAF", l2: "lọc tấn công" },
  { id: "geo", l1: "Geo", l2: "restriction" },
  { id: "sign", l1: "Signed", l2: "URL/cookie" },
  { id: "fle", l1: "Mã hoá", l2: "từng trường" },
  { id: "route", l1: "Cache", l2: "behavior" },
];
const GX = (i: number) => 180 + i * 75;
const LANE = 150;
const USER: Pt = [60, LANE];
const ORIGINS: Record<OriginId, { y: number; l1: string; l2: string }> = {
  s3a: { y: 69, l1: "S3 Singapore", l2: "origin chính" },
  s3b: { y: 127, l1: "S3 Tokyo", l2: "origin dự phòng" },
  alb: { y: 219, l1: "ALB → API", l2: "server ứng dụng" },
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

const PASS_TLS = { state: "pass" as const, msg: "HTTPS với chứng chỉ của **shopviet.vn** (ACM, us-east-1)." };
const PASS_WAF = { state: "pass" as const, msg: "Không khớp rule chặn nào." };
const PASS_GEO = { state: "pass" as const, msg: "Việt Nam nằm trong danh sách được phép." };
const OPEN = { state: "skip" as const, msg: "Nội dung công khai, không cần chữ ký." };
const NO_FIELD = { state: "skip" as const, msg: "Không có trường dữ liệu nhạy cảm." };

const SCENARIOS: Scenario[] = [
  {
    name: "Xem ảnh sản phẩm",
    request: "GET /images/ao-thun.jpg",
    from: "Việt Nam",
    run: () => ({
      gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
        route: { state: "pass", msg: "Path `/images/*` khớp cache behavior trỏ về **S3**." } },
      origin: "s3a", ok: true,
      result: "200: ảnh trả về và được lưu ở edge. Lần sau khách gần đó mở ảnh sẽ nhận ngay từ cache.",
    }),
  },
  {
    name: "Bot dò lỗi SQL",
    request: "GET /api/search?q=' OR 1=1 --",
    from: "không rõ",
    toggle: { label: "Bật rule chống SQL injection", initial: true },
    run: (on) => on
      ? { gates: { tls: PASS_TLS, waf: { state: "block", msg: "Managed rule **SQL injection** khớp chuỗi `' OR 1=1`. Chặn ngay tại edge." } },
          ok: true, result: "403: request độc hại dừng ở edge, server API không phải xử lý gì." }
      : { gates: { tls: PASS_TLS, waf: { state: "pass", msg: "Chưa có rule nào bắt được chuỗi này." }, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
            route: { state: "pass", msg: "Path `/api/*` trỏ về **ALB**." } },
          origin: "alb", ok: false, result: "Request độc hại tới thẳng server API. Gắn AWS WAF vào CloudFront để chặn từ edge." },
  },
  {
    name: "Xem video ở nước chưa có bản quyền",
    request: "GET /videos/khoa-hoc-1.mp4",
    from: "nước chưa mua bản quyền",
    toggle: { label: "Khách đang ở Việt Nam", initial: false },
    run: (on) => on
      ? { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: { state: "pass", msg: "Signed cookie hợp lệ: khách đã mua khoá học." }, fle: NO_FIELD,
            route: { state: "pass", msg: "Path `/videos/*` trỏ về **S3**." } },
          origin: "s3a", ok: true, result: "200: video phát bình thường." }
      : { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: { state: "block", msg: "Quốc gia nằm trong danh sách chặn của **geo restriction**." } },
          ok: true, result: "403: CloudFront từ chối ngay tại edge, đúng điều khoản bản quyền." },
  },
  {
    name: "Mở video của khoá học trả phí",
    request: "GET /videos/khoa-hoc-1.mp4",
    from: "Việt Nam",
    toggle: { label: "Khách đã mua khoá học", initial: false },
    run: (on) => on
      ? { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO,
            sign: { state: "pass", msg: "Có **signed cookie** hợp lệ. Một cookie mở được cả loạt video mà không đổi URL." }, fle: NO_FIELD,
            route: { state: "pass", msg: "Path `/videos/*` trỏ về **S3**." } },
          origin: "s3a", ok: true, result: "200: video phát. Chỉ cần cấp một file thì dùng **signed URL** cho file đó." }
      : { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: { state: "block", msg: "Không có signed URL hay signed cookie hợp lệ." } },
          ok: true, result: "403: người chưa mua không xem được, dù biết đường dẫn video." },
  },
  {
    name: "Thanh toán bằng thẻ",
    request: "POST /api/checkout  { card: 4111… }",
    from: "Việt Nam",
    run: () => ({
      gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN,
        fle: { state: "change", msg: "**Field-level encryption** mã hoá riêng trường `card` bằng public key ngay tại edge." },
        route: { state: "pass", msg: "Path `/api/*` trỏ về **ALB**." } },
      origin: "alb", ok: true,
      result: "200: load balancer, log và các service trung gian chỉ thấy chuỗi đã mã hoá. Chỉ dịch vụ thanh toán giữ private key mới đọc được số thẻ.",
    }),
  },
  {
    name: "Origin chính bị lỗi",
    request: "GET /images/banner.jpg",
    from: "Việt Nam",
    toggle: { label: "S3 Singapore đang lỗi", initial: true },
    run: (on) => ({
      gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
        route: { state: "pass", msg: "Cache behavior trỏ về **origin group** gồm S3 Singapore (chính) và S3 Tokyo (dự phòng)." } },
      origin: on ? "s3b" : "s3a", failover: on, ok: true,
      result: on
        ? "200: origin chính trả lỗi 5xx, CloudFront tự gửi lại sang origin dự phòng. Khách không thấy lỗi."
        : "200: origin chính trả lời bình thường, origin dự phòng không cần dùng.",
    }),
  },
  {
    name: "Gắn tên miền shopviet.vn",
    request: "GET https://shopviet.vn/",
    from: "Việt Nam",
    toggle: { label: "Chứng chỉ ACM tạo ở us-east-1", initial: false },
    run: (on) => on
      ? { gates: { tls: { state: "pass", msg: "Chứng chỉ ACM ở **us-east-1** (N. Virginia) gắn được vào distribution." }, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
            route: { state: "pass", msg: "Behavior mặc định `*` trỏ về **S3**." } },
          origin: "s3a", ok: true, result: "200: trang chủ chạy HTTPS với tên miền riêng." }
      : { gates: { tls: { state: "block", msg: "Chứng chỉ tạo ở ap-southeast-1. CloudFront chỉ nhận chứng chỉ ACM ở **us-east-1**, dù origin ở Region nào." } },
          ok: false, result: "Trình duyệt báo lỗi chứng chỉ. Tạo lại chứng chỉ ACM ở us-east-1 rồi gắn vào distribution." },
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
        <span className="cfp-from">từ {sc.from}</span>
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
          <text className="edge-t" x={150} y={72}>CloudFront · edge location gần khách</text>
          <g transform={`translate(60 ${LANE})`} aria-hidden="true">
            <circle className="user" cy={-9} r={7} />
            <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="t" x={60} y={LANE + 40} textAnchor="middle">Khách</text>
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
          <p className="cfp-hint">Bấm <b>Gửi request</b> để xem request đi qua từng trạm.{sc.toggle ? " Đổi công tắc rồi gửi lại để so sánh." : ""}</p>
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
