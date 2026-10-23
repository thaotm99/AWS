import { useEffect, useRef, useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./elb-sims.css";

// MFTech's ALB has two listeners. HTTP :80 has only a default rule that redirects to HTTPS
// (redirect action, HTTP 301; HTTPS to HTTP is not allowed). HTTPS :443 has rules with the six
// condition types (host-header, http-header, http-request-method, path-pattern, query-string,
// source-ip), evaluated from the lowest priority value to the highest, the default rule last.
// A path pattern is applied only to the path, not to the query string; source-ip is the address
// that opens the connection (a proxy's address when the client is behind a proxy).
// Sources: elasticloadbalancing/latest/application/rule-condition-types.html,
// rule-action-types.html, listener-rules.html.

interface Req {
  method: string;
  scheme: "http" | "https";
  path: string;
  query?: string;
  header?: [string, string];
  ip: string;
}

type CondKind = "source-ip" | "path-pattern" | "http-header" | "query-string" | "http-request-method";
interface Cond { kind: CondKind; value: string; test(r: Req): boolean }
interface Rule { pri: string; conds: Cond[]; action: Bi; result: Bi }

const glob = (pattern: string) => new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");
const path = (p: string): Cond => ({ kind: "path-pattern", value: p, test: (r) => glob(p).test(r.path) });

const OFFICE = "203.0.113.0/24";

const HTTP_RULES: Rule[] = [
  { pri: "default", conds: [],
    action: { vi: "redirect 301 → HTTPS :443", en: "redirect 301 → HTTPS :443" },
    result: { vi: "Listener HTTP :80 chỉ có default rule với action **redirect** (HTTP 301) tới `https://#{host}:443/#{path}?#{query}`; host, path và query string được giữ nguyên. Trình duyệt gửi lại request qua HTTPS và listener :443 đánh giá rule như bên dưới.",
      en: "The HTTP :80 listener has only a default rule with a **redirect** action (HTTP 301) to `https://#{host}:443/#{path}?#{query}`; the host, path and query string are kept. The browser sends the request again over HTTPS and the :443 listener evaluates its rules below." } },
];

const HTTPS_RULES: Rule[] = [
  { pri: "10", conds: [{ kind: "source-ip", value: OFFICE, test: (r) => r.ip.startsWith("203.0.113.") }, path("/admin/*")],
    action: { vi: "forward → TG admin", en: "forward → TG admin" },
    result: { vi: "Request tới `/admin/*` xuất phát từ dải IP văn phòng (**source-ip**, dạng CIDR): chuyển tới target group admin.", en: "A request to `/admin/*` from the office IP range (**source-ip**, in CIDR form): forwarded to the admin target group." } },
  { pri: "20", conds: [path("/admin/*")],
    action: { vi: "fixed-response 403", en: "fixed-response 403" },
    result: { vi: "IP nguồn không thuộc văn phòng nên rule 10 không khớp; rule 20 trả về **fixed-response** 403 ngay tại ALB, request không tới target nào.", en: "The source IP is not in the office range, so rule 10 does not match; rule 20 returns a **fixed-response** 403 at the ALB and the request reaches no target." } },
  { pri: "30", conds: [{ kind: "http-header", value: "X-App-Platform: mobile", test: (r) => r.header?.[0] === "X-App-Platform" && r.header[1].toLowerCase() === "mobile" }],
    action: { vi: "forward → TG mobile-api", en: "forward → TG mobile-api" },
    result: { vi: "Ứng dụng di động gửi header tuỳ chỉnh `X-App-Platform: mobile`; rule **http-header** chuyển request tới backend dành cho ứng dụng di động, dù path giống trang web.", en: "The mobile app sends the custom header `X-App-Platform: mobile`; the **http-header** rule sends the request to the mobile backend even though the path is the same as on the website." } },
  { pri: "40", conds: [{ kind: "query-string", value: "version=beta", test: (r) => (r.query ?? "").toLowerCase().split("&").includes("version=beta") }],
    action: { vi: "forward → TG products-beta", en: "forward → TG products-beta" },
    result: { vi: "Rule **query-string** khớp cặp key/value `version=beta`: người dùng thử nghiệm được chuyển tới phiên bản beta. Rule path `/products/*` (70) cũng khớp nhưng có priority thấp hơn nên không được xét tới.", en: "The **query-string** rule matches the key/value pair `version=beta`: test users go to the beta version. The path rule `/products/*` (70) also matches but comes later in priority order, so it is never reached." } },
  { pri: "50", conds: [{ kind: "http-request-method", value: "POST", test: (r) => r.method === "POST" }, path("/orders/*")],
    action: { vi: "forward → TG orders-write", en: "forward → TG orders-write" },
    result: { vi: "Rule **http-request-method** (`POST`, so khớp chính xác, phân biệt hoa thường) kết hợp path: thao tác tạo đơn hàng được chuyển tới target group orders-write.", en: "The **http-request-method** rule (`POST`, exact and case-sensitive match) combined with a path: order creation goes to the orders-write target group." } },
  { pri: "60", conds: [path("/orders/*")],
    action: { vi: "forward → TG orders", en: "forward → TG orders" },
    result: { vi: "Request đọc đơn hàng khớp rule **path-pattern** `/orders/*`.", en: "The order read request matches the **path-pattern** rule `/orders/*`." } },
  { pri: "70", conds: [path("/products/*")],
    action: { vi: "forward → TG products", en: "forward → TG products" },
    result: { vi: "Khớp rule **path-pattern** `/products/*` (path-based routing).", en: "Matches the **path-pattern** rule `/products/*` (path-based routing)." } },
  { pri: "default", conds: [],
    action: { vi: "forward → TG web", en: "forward → TG web" },
    result: { vi: "Không rule nào khớp; **default rule**, luôn được đánh giá cuối cùng, chuyển request tới target group web.", en: "No rule matches; the **default rule**, always evaluated last, forwards the request to the web target group." } },
];

const PRESETS: { name: Bi; req: Req; note?: Bi }[] = [
  { name: { vi: "Gõ địa chỉ http://", en: "Typed an http:// address" }, req: { method: "GET", scheme: "http", path: "/products/ao-thun", ip: "198.51.100.7" } },
  { name: { vi: "Trang sản phẩm", en: "Product page" }, req: { method: "GET", scheme: "https", path: "/products/ao-thun", ip: "198.51.100.7" } },
  { name: { vi: "Thử phiên bản beta", en: "Try the beta version" }, req: { method: "GET", scheme: "https", path: "/products/ao-thun", query: "version=beta", ip: "198.51.100.7" } },
  { name: { vi: "Ứng dụng di động", en: "Mobile app" }, req: { method: "GET", scheme: "https", path: "/orders/1024", header: ["X-App-Platform", "mobile"], ip: "198.51.100.7" } },
  { name: { vi: "Tạo đơn hàng", en: "Create an order" }, req: { method: "POST", scheme: "https", path: "/orders/checkout", ip: "198.51.100.7" } },
  { name: { vi: "Admin tại văn phòng", en: "Admin from the office" }, req: { method: "GET", scheme: "https", path: "/admin/report", ip: "203.0.113.25" } },
  { name: { vi: "Admin từ bên ngoài", en: "Admin from outside" }, req: { method: "GET", scheme: "https", path: "/admin/report", ip: "198.51.100.7" } },
  { name: { vi: "Trang chủ", en: "Home page" }, req: { method: "GET", scheme: "https", path: "/", ip: "198.51.100.7" } },
];

type RowState = "check" | "miss" | "match";
type Marks = Record<string, { row: RowState; conds: boolean[] }>;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function RuleMatchSim() {
  const L = useLang();
  const gen = useRef(0);
  const [pick, setPick] = useState(1);
  const [busy, setBusy] = useState(false);
  const [marks, setMarks] = useState<Marks>({});
  const [log, setLog] = useState<{ tag: string; msg: Bi }[]>([]);
  const [scheme, setScheme] = useState<"http" | "https">(PRESETS[1].req.scheme);

  useEffect(() => () => { gen.current++; }, []);

  const preset = PRESETS[pick];
  const r = { ...preset.req, scheme };
  const url = `${r.scheme}://mftech.vn${r.path}${r.query ? "?" + r.query : ""}`;

  function choose(i: number) {
    gen.current++;
    setBusy(false);
    setPick(i);
    setScheme(PRESETS[i].req.scheme);
    setMarks({});
    setLog([]);
  }

  async function walk(rules: Rule[], key: string, req: Req, g: number): Promise<Rule | null> {
    for (const rule of rules) {
      const id = key + rule.pri;
      setMarks((m) => ({ ...m, [id]: { row: "check", conds: [] } }));
      await wait(420);
      if (g !== gen.current) return null;
      const conds = rule.conds.map((c) => c.test(req));
      const ok = conds.every(Boolean);
      setMarks((m) => ({ ...m, [id]: { row: ok ? "match" : "miss", conds } }));
      if (ok) return rule;
      await wait(160);
      if (g !== gen.current) return null;
    }
    return null;
  }

  async function run() {
    if (busy) return;
    const g = ++gen.current;
    setBusy(true);
    setMarks({});
    setLog([]);
    try {
      let req = { ...preset.req };
      if (req.scheme === "http") {
        const hit = await walk(HTTP_RULES, "h", req, g);
        if (!hit || g !== gen.current) return;
        setLog([{ tag: ":80", msg: hit.result }]);
        await wait(500);
        if (g !== gen.current) return;
        req = { ...req, scheme: "https" };
        setScheme("https");
      }
      const hit = await walk(HTTPS_RULES, "s", req, g);
      if (!hit || g !== gen.current) return;
      setLog((l) => [...l, { tag: ":443", msg: hit.result }]);
    } finally {
      if (g === gen.current) setBusy(false);
    }
  }

  // Condition chip of a rule; turns green or red once evaluated.
  const COND = "rounded-[10px] border border-line bg-bg px-1.5 py-px text-[0.75rem] wrap-anywhere";
  const table = (title: string, rules: Rule[], key: string, active: boolean) => (
    <div className={"grid gap-1 px-3.5 pt-2.5 pb-0" + (active ? "" : " opacity-70")}>
      <div className="flex justify-between gap-2 text-[0.75rem] font-semibold text-muted"><span>{title}</span><span>{L({ vi: "priority · điều kiện · action", en: "priority · conditions · action" })}</span></div>
      {rules.map((rule) => {
        const m = marks[key + rule.pri];
        return (
          <div key={rule.pri} className={"elbx-rule " + (m?.row ?? "")}>
            <span className="font-mono text-[0.75rem] text-muted">{rule.pri}</span>
            <span className="flex min-w-0 flex-wrap gap-1">
              {rule.conds.length === 0
                ? <code className={COND}>{L({ vi: "(mọi request còn lại)", en: "(every remaining request)" })}</code>
                : rule.conds.map((c, i) => (
                  <code key={i} className={`${COND} ${m && m.conds.length ? (m.conds[i] ? "border-ok text-ok" : "border-bad text-bad") : ""}`}>{c.kind}: {c.value}</code>
                ))}
            </span>
            <span className="wrap-anywhere max-sm:col-start-2 max-sm:col-end-3 max-sm:row-start-2 max-sm:text-muted">{L(rule.action)}</span>
            <span className="elbx-st" aria-hidden="true">{m?.row === "match" ? "✓" : m?.row === "miss" ? "✗" : m?.row === "check" ? "…" : ""}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="stage">
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-0 pt-3" role="group" aria-label={L({ vi: "Request", en: "Request" })}>
        <span className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">Request</span>
        {PRESETS.map((p, i) => (
          <button key={i} className="chip" aria-pressed={i === pick} onClick={() => choose(i)}>{L(p.name)}</button>
        ))}
      </div>
      <div className="stage-bar mt-3 border-t border-line">
        <span className="grid min-w-0 gap-0.5">
          <code className="text-[0.8125rem] wrap-anywhere">{r.method} {url}</code>
          <span className="text-[0.75rem] wrap-anywhere text-muted">
            {L({ vi: "IP nguồn", en: "Source IP" })}: {r.ip}{r.ip.startsWith("203.0.113.") ? L({ vi: " (văn phòng)", en: " (office)" }) : ""}
            {r.header ? ` · ${r.header[0]}: ${r.header[1]}` : ""}
          </span>
        </span>
        <button className="btn primary ml-auto" onClick={run} disabled={busy}>{L({ vi: "Đánh giá rule", en: "Evaluate rules" })}</button>
      </div>
      {table("Listener HTTP :80", HTTP_RULES, "h", preset.req.scheme === "http")}
      {table("Listener HTTPS :443", HTTPS_RULES, "s", true)}
      <div className="readout mt-3">
        {log.length === 0 ? (
          <p className="m-0 text-step--1 text-muted">{L({ vi: "Chọn một request, sau đó nhấn Đánh giá rule. ALB xét các rule theo priority từ giá trị nhỏ tới lớn và dừng ở rule đầu tiên khớp mọi điều kiện.", en: "Pick a request, then press Evaluate rules. The ALB checks rules from the lowest priority value to the highest and stops at the first rule whose conditions all match." })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((m, i) => (
              <li key={i}><span className="tag hit">{m.tag}</span><span>{rich(L(m.msg))}</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
