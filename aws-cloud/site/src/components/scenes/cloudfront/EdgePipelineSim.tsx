import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";

type Lang = ReturnType<typeof useLang>;

// One request of MFTech walks through the checks CloudFront runs at the edge,
// then reaches an origin. Each scenario turns on the feature that solves one real
// problem: HTTPS certificate, WAF, geo restriction, signed cookies, field-level
// encryption, cache behaviors and origin-group failover.

type GateId = "tls" | "waf" | "geo" | "sign" | "fle" | "route";
type OriginId = "s3a" | "s3b" | "alb";
type State = "pass" | "block" | "skip" | "change";

const GATES: { id: GateId; l1: string; l2: string | Bi }[] = [
  // Gate boxes are 68 units wide; a "\n" splits a sub-label that is too long for one line.
  { id: "tls", l1: "TLS", l2: { vi: "chứng chỉ\nACM", en: "ACM cert" } },
  { id: "waf", l1: "AWS WAF", l2: "web ACL" },
  { id: "geo", l1: "Geo", l2: "restriction" },
  { id: "sign", l1: "Signed", l2: "URL/cookie" },
  { id: "fle", l1: "Field-level", l2: "encryption" },
  { id: "route", l1: "Cache", l2: "behavior" },
];
const GX = (i: number) => 180 + i * 75;
const LANE = 150;
const USER: Pt = [60, LANE];
const ORIGINS: Record<OriginId, { y: number; l1: string; l2: Bi }> = {
  s3a: { y: 69, l1: "S3 Singapore", l2: { vi: "origin chính", en: "primary origin" } },
  s3b: { y: 127, l1: "S3 Tokyo", l2: { vi: "origin dự phòng", en: "secondary origin" } },
  alb: { y: 219, l1: "ALB → API", l2: { vi: "tầng ứng dụng", en: "application tier" } },
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

function scenarios(L: Lang): Scenario[] {
const PASS_TLS = { state: "pass" as const, msg: L({ vi: "TLS termination bằng chứng chỉ ACM của **mftech.vn** (us-east-1).", en: "TLS termination with the ACM certificate for **mftech.vn** (us-east-1)." }) };
const PASS_WAF = { state: "pass" as const, msg: L({ vi: "Request không khớp rule chặn nào trong web ACL.", en: "The request matches no blocking rule in the web ACL." }) };
const PASS_GEO = { state: "pass" as const, msg: L({ vi: "Quốc gia nguồn (VN) thuộc allow list.", en: "The source country (VN) is on the allow list." }) };
const OPEN = { state: "skip" as const, msg: L({ vi: "Nội dung công khai, không yêu cầu chữ ký.", en: "Public content, no signature required." }) };
const NO_FIELD = { state: "skip" as const, msg: L({ vi: "Request không chứa trường dữ liệu cần mã hoá.", en: "The request contains no data field to encrypt." }) };

return [
  {
    name: L({ vi: "Truy xuất ảnh sản phẩm", en: "Fetch a product image" }),
    request: "GET /images/ao-thun.jpg",
    from: L({ vi: "Việt Nam", en: "Vietnam" }),
    run: () => ({
      gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
        route: { state: "pass", msg: L({ vi: "Path `/images/*` khớp cache behavior trỏ tới origin **S3**.", en: "Path `/images/*` matches the cache behavior that points to the **S3** origin." }) } },
      origin: "s3a", ok: true,
      result: L({ vi: "200 OK: object được trả về và lưu tại edge cache; các request tiếp theo trong thời gian TTL được phục vụ từ cache.", en: "200 OK: the object is returned and stored in the edge cache; later requests within the TTL are served from the cache." }),
    }),
  },
  {
    name: L({ vi: "Tấn công SQL injection", en: "SQL injection attack" }),
    request: "GET /api/search?q=' OR 1=1 --",
    from: L({ vi: "không xác định", en: "unknown" }),
    toggle: { label: L({ vi: "Kích hoạt managed rule SQL injection", en: "Enable SQL injection managed rule" }), initial: true },
    run: (on) => on
      ? { gates: { tls: PASS_TLS, waf: { state: "block", msg: L({ vi: "Managed rule **SQL injection** khớp payload `' OR 1=1`; request bị chặn tại edge.", en: "The **SQL injection** managed rule matches the payload `' OR 1=1`; the request is blocked at the edge." }) } },
          ok: true, result: L({ vi: "403 Forbidden: request độc hại bị loại bỏ tại edge, không phát sinh tải cho tầng ứng dụng.", en: "403 Forbidden: the malicious request is dropped at the edge and puts no load on the application tier." }) }
      : { gates: { tls: PASS_TLS, waf: { state: "pass", msg: L({ vi: "Không có rule nào phát hiện payload.", en: "No rule detects the payload." }) }, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
            route: { state: "pass", msg: L({ vi: "Path `/api/*` khớp cache behavior trỏ tới **ALB**.", en: "Path `/api/*` matches the cache behavior that points to the **ALB**." }) } },
          origin: "alb", ok: false, result: L({ vi: "Request độc hại được chuyển tới tầng ứng dụng. Cần liên kết AWS WAF web ACL với distribution để lọc tại edge.", en: "The malicious request is forwarded to the application tier. An AWS WAF web ACL must be associated with the distribution to filter at the edge." }) },
  },
  {
    name: L({ vi: "Truy cập từ quốc gia bị giới hạn", en: "Access from a restricted country" }),
    request: "GET /videos/khoa-hoc-1.mp4",
    from: L({ vi: "quốc gia ngoài phạm vi bản quyền", en: "a country outside the licensed territory" }),
    toggle: { label: L({ vi: "Request xuất phát từ Việt Nam", en: "Request comes from Vietnam" }), initial: false },
    run: (on) => on
      ? { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: { state: "pass", msg: L({ vi: "Signed cookie hợp lệ: người dùng có quyền truy cập khoá học.", en: "Valid signed cookie: the user is entitled to the course." }) }, fle: NO_FIELD,
            route: { state: "pass", msg: L({ vi: "Path `/videos/*` khớp cache behavior trỏ tới **S3**.", en: "Path `/videos/*` matches the cache behavior that points to **S3**." }) } },
          origin: "s3a", ok: true, result: L({ vi: "200 OK: nội dung video được phân phối.", en: "200 OK: the video content is delivered." }) }
      : { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: { state: "block", msg: L({ vi: "Quốc gia nguồn thuộc block list của **geo restriction**.", en: "The source country is on the **geo restriction** block list." }) } },
          ok: true, result: L({ vi: "403 Forbidden: CloudFront từ chối tại edge theo điều khoản bản quyền.", en: "403 Forbidden: CloudFront denies the request at the edge under the licensing terms." }) },
  },
  {
    name: L({ vi: "Nội dung trả phí", en: "Paid content" }),
    request: "GET /videos/khoa-hoc-1.mp4",
    from: L({ vi: "Việt Nam", en: "Vietnam" }),
    toggle: { label: L({ vi: "Người dùng đã mua khoá học", en: "User has bought the course" }), initial: false },
    run: (on) => on
      ? { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO,
            sign: { state: "pass", msg: L({ vi: "**Signed cookie** hợp lệ; một cookie cấp quyền cho nhiều object mà không thay đổi URL.", en: "Valid **signed cookie**; one cookie grants access to many objects without changing the URLs." }) }, fle: NO_FIELD,
            route: { state: "pass", msg: L({ vi: "Path `/videos/*` khớp cache behavior trỏ tới **S3**.", en: "Path `/videos/*` matches the cache behavior that points to **S3**." }) } },
          origin: "s3a", ok: true, result: L({ vi: "200 OK: nội dung được phân phối. Trường hợp cấp quyền cho một object riêng lẻ, sử dụng **signed URL**.", en: "200 OK: the content is delivered. To grant access to a single object, use a **signed URL**." }) }
      : { gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: { state: "block", msg: L({ vi: "Request không kèm signed URL hoặc signed cookie hợp lệ.", en: "The request carries no valid signed URL or signed cookie." }) } },
          ok: true, result: L({ vi: "403 Forbidden: người dùng không có quyền không truy cập được nội dung, kể cả khi biết URL.", en: "403 Forbidden: users without entitlement cannot access the content, even if they know the URL." }) },
  },
  {
    name: L({ vi: "Dữ liệu thanh toán", en: "Payment data" }),
    request: "POST /api/checkout  card=4111…",
    from: L({ vi: "Việt Nam", en: "Vietnam" }),
    run: () => ({
      gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN,
        fle: { state: "change", msg: L({ vi: "**Field-level encryption** mã hoá trường `card` của form POST (`application/x-www-form-urlencoded`) bằng public key tại edge.", en: "**Field-level encryption** encrypts the `card` field of the POST form (`application/x-www-form-urlencoded`) with a public key at the edge." }) },
        route: { state: "pass", msg: L({ vi: "Path `/api/*` khớp cache behavior trỏ tới **ALB**.", en: "Path `/api/*` matches the cache behavior that points to the **ALB**." }) } },
      origin: "alb", ok: true,
      result: L({ vi: "200 OK: load balancer, log và các thành phần trung gian chỉ tiếp nhận giá trị đã mã hoá; chỉ dịch vụ thanh toán nắm private key mới giải mã được.", en: "200 OK: the load balancer, logs and intermediate components receive only the encrypted value; only the payment service, which holds the private key, can decrypt it." }),
    }),
  },
  {
    name: L({ vi: "Sự cố origin chính", en: "Primary origin failure" }),
    request: "GET /images/banner.jpg",
    from: L({ vi: "Việt Nam", en: "Vietnam" }),
    toggle: { label: L({ vi: "Origin S3 Singapore lỗi", en: "S3 Singapore origin fails" }), initial: true },
    run: (on) => ({
      gates: { tls: PASS_TLS, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
        route: { state: "pass", msg: L({ vi: "Cache behavior trỏ tới **origin group**: S3 Singapore (primary) và S3 Tokyo (secondary).", en: "The cache behavior points to an **origin group**: S3 Singapore (primary) and S3 Tokyo (secondary)." }) } },
      origin: on ? "s3b" : "s3a", failover: on, ok: true,
      result: on
        ? L({ vi: "200 OK: origin primary trả về 5xx, CloudFront tự động gửi lại request tới origin secondary; người dùng không nhận lỗi.", en: "200 OK: the primary origin returns 5xx, CloudFront automatically retries the request on the secondary origin; users get no error." })
        : L({ vi: "200 OK: origin primary phản hồi bình thường; origin secondary không được sử dụng.", en: "200 OK: the primary origin responds normally; the secondary origin is not used." }),
    }),
  },
  {
    name: L({ vi: "Tên miền tuỳ chỉnh", en: "Custom domain name" }),
    request: "GET https://mftech.vn/",
    from: L({ vi: "Việt Nam", en: "Vietnam" }),
    toggle: { label: L({ vi: "Chứng chỉ ACM tạo tại us-east-1", en: "ACM certificate created in us-east-1" }), initial: false },
    run: (on) => on
      ? { gates: { tls: { state: "pass", msg: L({ vi: "Chứng chỉ ACM tại **us-east-1** (N. Virginia) được liên kết với distribution.", en: "An ACM certificate in **us-east-1** (N. Virginia) is associated with the distribution." }) }, waf: PASS_WAF, geo: PASS_GEO, sign: OPEN, fle: NO_FIELD,
            route: { state: "pass", msg: L({ vi: "Default behavior `*` trỏ tới **S3**.", en: "The default behavior `*` points to **S3**." }) } },
          origin: "s3a", ok: true, result: L({ vi: "200 OK: trang chủ được phục vụ qua HTTPS với tên miền tuỳ chỉnh.", en: "200 OK: the home page is served over HTTPS with the custom domain name." }) }
      : { gates: { tls: { state: "block", msg: L({ vi: "Chứng chỉ tạo ở ap-southeast-1. CloudFront chỉ nhận chứng chỉ ACM ở **us-east-1**, dù origin ở Region nào.", en: "The certificate was created in ap-southeast-1. CloudFront accepts only ACM certificates in **us-east-1**, whatever the origin's Region." }) } },
          ok: false, result: L({ vi: "Trình duyệt báo lỗi chứng chỉ. Cần tạo chứng chỉ ACM tại us-east-1 và liên kết với distribution.", en: "The browser reports a certificate error. An ACM certificate must be created in us-east-1 and associated with the distribution." }) },
  },
];
}

const TAG: Record<State, { text: Bi; cls: string }> = {
  pass: { text: { vi: "QUA", en: "PASS" }, cls: "hit" },
  block: { text: { vi: "CHẶN", en: "BLOCKED" }, cls: "bad" },
  skip: { text: { vi: "BỎ QUA", en: "SKIPPED" }, cls: "info" },
  change: { text: { vi: "MÃ HOÁ", en: "ENCRYPTED" }, cls: "miss" },
};

export default function EdgePipelineSim() {
  const L = useLang();
  const sub = (g: (typeof GATES)[number]) => (typeof g.l2 === "string" ? g.l2 : L(g.l2)).split("\n");
  const SCENARIOS = scenarios(L);
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
      setLog((l) => [...l, { tag: step.state, gate: `${g.l1} ${sub(g).join(" ")}`, msg: rich(step.msg) }]);
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
      <div className="cfp-scenarios" role="tablist" aria-label={L({ vi: "Tình huống", en: "Scenario" })}>
        {SCENARIOS.map((s, i) => (
          <button key={s.name} role="tab" aria-selected={i === index} className="chip" onClick={() => pick(i)} disabled={busy && i !== index}>
            {s.name}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="cfp-req">{sc.request}</code>
        <span className="cfp-from">{L({ vi: "nguồn: ", en: "source: " })}{sc.from}</span>
        {sc.toggle && (
          <label className="cfp-toggle">
            <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(); }} />
            {sc.toggle.label}
          </label>
        )}
        <button className="btn primary" onClick={send} disabled={busy}>{L({ vi: "Gửi request", en: "Send request" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 30 820 222" role="img" aria-label={L({ vi: "Request đi từ viewer qua các bước xử lý của CloudFront tại edge location, rồi tới origin S3 hoặc ALB", en: "The request goes from the viewer through CloudFront's processing steps at the edge location, then to the S3 or ALB origin" })}>
          <path d={`M60 ${LANE} H610`} stroke="var(--line)" strokeWidth={2} fill="none" />
          {(Object.keys(ORIGINS) as OriginId[]).map((id) => (
            <path key={id} d={`M610 ${LANE} V${ORIGINS[id].y} H640`} stroke="var(--line)" strokeWidth={2} fill="none" />
          ))}
          <rect className="cfp-edge" x={138} y={52} width={460} height={190} rx={12} />
          <text className="edge-t" x={150} y={72}>{L({ vi: "CloudFront · edge location gần người dùng", en: "CloudFront · edge location near users" })}</text>
          <g transform={`translate(60 ${LANE})`} aria-hidden="true">
            <circle className="user" cy={-9} r={7} />
            <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="t" x={60} y={LANE + 40} textAnchor="middle">{L({ vi: "Người dùng", en: "Users" })}</text>
          {GATES.map((g, i) => (
            <g key={g.id} className={`cfp-gate ${lit[g.id] ?? ""}`}>
              <rect x={GX(i) - 34} y={LANE - 37} width={68} height={74} rx={8} />
              {(() => {
                const lines = sub(g);
                // Two sub-label lines: move the block up so it stays centred in the box.
                const top = lines.length > 1 ? LANE - 12 : LANE - 4;
                return (
                  <>
                    <text className="cfp-gt" x={GX(i)} y={top} textAnchor="middle">{g.l1}</text>
                    {lines.map((line, k) => (
                      <text key={k} className="cfp-gs" x={GX(i)} y={top + 16 + k * 13} textAnchor="middle">{line}</text>
                    ))}
                  </>
                );
              })()}
            </g>
          ))}
          <rect className="cfp-group" x={632} y={38} width={180} height={124} rx={10} />
          <text className="ts" x={722} y={176} textAnchor="middle">origin group</text>
          {(Object.keys(ORIGINS) as OriginId[]).map((id) => (
            <g key={id} className={`cfp-origin ${origins[id] ?? ""}`}>
              <rect x={640} y={ORIGINS[id].y - 23} width={164} height={46} rx={8} />
              <text className="cfp-gt" x={722} y={ORIGINS[id].y - 3} textAnchor="middle">{ORIGINS[id].l1}</text>
              <text className="cfp-gs" x={722} y={ORIGINS[id].y + 13} textAnchor="middle">{L(ORIGINS[id].l2)}</text>
            </g>
          ))}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="cfp-hint">{L({
            vi: <>Nhấn <b>{L({ vi: "Gửi request", en: "Send request" })}</b> để quan sát từng bước xử lý tại edge.{sc.toggle ? " Thay đổi cấu hình và gửi lại để so sánh kết quả." : ""}</>,
            en: <>Press <b>Send request</b> to watch each processing step at the edge.{sc.toggle ? " Change the configuration and send again to compare the results." : ""}</>,
          })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag === "result" ? (
                <li key={i} className={`cfp-result ${e.ok ? "ok" : "bad"}`}>{e.msg}</li>
              ) : (
                <li key={i}>
                  <span className={`tag ${TAG[e.tag].cls}`}>{L(TAG[e.tag].text)}</span>
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
