import { useEffect, useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./cloudfront-sims.css";

// Path of a MFTECH request through CloudFront: POP (edge location) → regional edge cache → origin.
// Facts (AmazonCloudFront/latest/DeveloperGuide):
// - HowCloudFrontWorks.html: a POP miss typically goes to the nearest regional edge cache (REC), which has a
//   larger cache; an origin response is cached at both. PUT/POST/PATCH/OPTIONS/DELETE go directly from the POP
//   to the origin; dynamic requests (as determined at request time) skip the REC; an S3 origin in the same
//   Region as the optimal REC is reached directly from the POP.
// - DownloadDistValuesCacheBehavior.html: allowed HTTP methods (GET, HEAD / + OPTIONS / + PUT, POST, PATCH, DELETE);
//   CloudFront caches GET and HEAD (optionally OPTIONS), never the other methods.
// - private-content-restricting-access-to-s3.html: OAC supports PUT/DELETE; bucket policy grants s3:PutObject to
//   cloudfront.amazonaws.com; a website endpoint origin is a custom origin and cannot use OAC.
// - S3 WebsiteEndpoints.html: website endpoints support only GET and HEAD on objects and only public content.
// - controlling-origin-requests.html: query strings, headers and cookies are not in the origin request unless a cache
//   policy or origin request policy includes them; an origin request policy does not change the cache key.
// - using-managed-cache-policies.html: CachingOptimized has no query strings in the cache key, default TTL 24 h,
//   minimum TTL 1 s; CachingDisabled has TTL 0.
// Source questions: exam3_q8, exam5_q15, exam5_q21, exam5_q30, exam4_q53.

type NodeId = "pop" | "rec" | "origin";
type HopState = "hit" | "miss" | "fwd" | "ok" | "bad" | "skip";

interface Hop {
  at: NodeId;
  /** POP → origin without the regional edge cache. */
  direct?: boolean;
  state: HopState;
  msg: string;
}

interface Req {
  line: string;
  hops: Hop[];
  /** The response that comes back to the viewer is correct. */
  ok: boolean;
}

interface Option {
  label: string;
  origin?: { l1: string; l2: string };
  reqs: Req[];
  ok: boolean;
  result: string;
}

interface Scenario {
  name: string;
  origin: { l1: string; l2: string };
  options: Option[];
}

type Lang = ReturnType<typeof useLang>;

function scenarios(L: Lang): Scenario[] {
  const IMG = "GET /images/ao-thun.jpg";
  const PUT = "PUT /uploads/u123/anh.jpg";
  const popMiss = (m?: string): Hop => ({ at: "pop", state: "miss", msg: m ?? L({ vi: "Object không có trong cache của POP.", en: "The object is not in the POP cache." }) });
  const putPop: Hop = { at: "pop", state: "fwd", msg: L({ vi: "PUT nằm trong **Allowed HTTP methods**. PUT, POST, PATCH, OPTIONS, DELETE được POP chuyển **thẳng tới origin**, không qua regional edge cache.", en: "PUT is in the **allowed HTTP methods**. PUT, POST, PATCH, OPTIONS and DELETE go from the POP **directly to the origin**, not through the regional edge cache." }) };
  const recSkip = (m: string): Hop => ({ at: "rec", state: "skip", msg: m });
  const SKIP_PROXY = recSkip(L({ vi: "Không đi qua: method PUT là proxy method.", en: "Not used: PUT is a proxy method." }));

  return [
    {
      name: L({ vi: "Ảnh sản phẩm", en: "Product image" }),
      origin: { l1: "S3 bucket", l2: L({ vi: "origin · OAC", en: "origin · OAC" }) },
      options: [
        {
          label: L({ vi: "Object đang có trong cache của POP", en: "Object is in the POP cache" }),
          reqs: [{ line: IMG, ok: true, hops: [{ at: "pop", state: "hit", msg: L({ vi: "**Cache hit** tại POP gần người dùng nhất.", en: "**Cache hit** at the POP nearest to the user." }) }] }],
          ok: true,
          result: L({ vi: "200 OK từ POP. Nội dung phổ biến được giữ tại POP nên phản hồi nhanh nhất.", en: "200 OK from the POP. Popular content stays at the POP, so the response is fastest." }),
        },
        {
          label: L({ vi: "POP đã loại object vì ít được truy cập", en: "The POP evicted the object (less popular)" }),
          reqs: [{ line: IMG, ok: true, hops: [
            popMiss(L({ vi: "**Cache miss**: POP đã loại object ít được truy cập để nhường chỗ cho nội dung phổ biến hơn.", en: "**Cache miss**: the POP removed this less popular object to make room for more popular content." })),
            { at: "rec", state: "hit", msg: L({ vi: "**Cache hit** tại **regional edge cache**: cache lớn hơn một POP nên object được giữ lâu hơn. POP lưu lại object cho lần sau.", en: "**Cache hit** at the **regional edge cache**: its cache is larger than a POP's, so objects stay longer. The POP stores the object for next time." }) },
          ] }],
          ok: true,
          result: L({ vi: "200 OK, origin không nhận request nào. Ảnh sản phẩm cũ, nội dung do người dùng tải lên, tin tức bất ngờ được quan tâm trở lại là các loại nội dung hưởng lợi nhiều nhất từ regional edge cache.", en: "200 OK, and the origin receives no request. Older product photos, user-generated content and news that suddenly regains interest benefit most from regional edge caches." }),
        },
        {
          label: L({ vi: "Object chưa có ở cả hai tầng cache", en: "Object is in neither cache tier" }),
          reqs: [{ line: IMG, ok: true, hops: [
            popMiss(),
            { at: "rec", state: "miss", msg: L({ vi: "Regional edge cache cũng không có object; request được chuyển tới origin.", en: "The regional edge cache does not have it either; the request goes to the origin." }) },
            { at: "origin", state: "ok", msg: L({ vi: "S3 trả object. CloudFront lưu object tại **cả regional edge cache và POP**; các POP trong cùng khu vực địa lý dùng chung regional edge cache nên giảm số request lặp lại tới origin.", en: "S3 returns the object. CloudFront caches it at **both the regional edge cache and the POP**; the POPs in a geographic area share the regional edge cache, which removes repeated requests to the origin." }) },
          ] }],
          ok: true,
          result: L({ vi: "200 OK. Lần truy cập tiếp theo từ bất kỳ POP nào trong khu vực có thể được phục vụ từ regional edge cache.", en: "200 OK. The next request from any POP in the area can be served from the regional edge cache." }),
        },
        {
          label: L({ vi: "Regional edge cache tối ưu cùng Region với bucket", en: "Optimal regional edge cache is in the bucket's Region" }),
          reqs: [{ line: IMG, ok: true, hops: [
            popMiss(),
            recSkip(L({ vi: "Bỏ qua: origin là S3 và regional edge cache tối ưu nằm cùng AWS Region với bucket.", en: "Skipped: the origin is S3 and the optimal regional edge cache is in the same AWS Region as the bucket." })),
            { at: "origin", direct: true, state: "ok", msg: L({ vi: "POP lấy object **trực tiếp từ bucket S3**.", en: "The POP fetches the object **directly from the S3 bucket**." }) },
          ] }],
          ok: true,
          result: L({ vi: "200 OK. Đây là trường hợp ngoại lệ được AWS mô tả: POP đi thẳng tới bucket thay vì qua regional edge cache.", en: "200 OK. This is a documented exception: the POP goes straight to the bucket instead of the regional edge cache." }),
        },
      ],
    },
    {
      name: L({ vi: "Khách tải ảnh lên", en: "Customer photo upload" }),
      origin: { l1: "S3 bucket", l2: L({ vi: "REST endpoint · OAC", en: "REST endpoint · OAC" }) },
      options: [
        {
          label: "Allowed methods: GET, HEAD",
          reqs: [{ line: PUT, ok: false, hops: [{ at: "pop", state: "bad", msg: L({ vi: "Cache behavior chỉ cho phép **GET, HEAD**; CloudFront không xử lý và không chuyển tiếp PUT tới origin.", en: "The cache behavior allows only **GET, HEAD**; CloudFront does not process or forward the PUT to the origin." }) }] }],
          ok: false,
          result: L({ vi: "Tải lên thất bại. Chọn **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE** cho cache behavior của đường dẫn tải lên.", en: "The upload fails. Choose **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE** for the cache behavior of the upload path." }),
        },
        {
          label: L({ vi: "Cho phép PUT; bucket policy chỉ có s3:GetObject", en: "PUT allowed; bucket policy has only s3:GetObject" }),
          reqs: [{ line: PUT, ok: false, hops: [putPop, SKIP_PROXY,
            { at: "origin", direct: true, state: "bad", msg: L({ vi: "OAC ký request (SigV4) với danh tính `cloudfront.amazonaws.com`, nhưng bucket policy chỉ cấp `s3:GetObject`. S3 từ chối: **Access Denied**.", en: "OAC signs the request (SigV4) as `cloudfront.amazonaws.com`, but the bucket policy grants only `s3:GetObject`. S3 refuses: **Access Denied**." }) }] }],
          ok: false,
          result: L({ vi: "Tải lên thất bại. Bucket policy phải cấp thêm `s3:PutObject` cho service principal `cloudfront.amazonaws.com`, giới hạn bằng điều kiện `AWS:SourceArn` là ARN của distribution.", en: "The upload fails. The bucket policy must also grant `s3:PutObject` to the `cloudfront.amazonaws.com` service principal, limited by an `AWS:SourceArn` condition set to the distribution ARN." }),
        },
        {
          label: L({ vi: "Thêm origin request policy AllViewer (bucket policy giữ nguyên)", en: "Add origin request policy AllViewer (bucket policy unchanged)" }),
          reqs: [{ line: PUT, ok: false, hops: [
            { ...putPop, msg: L({ vi: "Origin request policy **AllViewer** đưa mọi header, cookie và query string của viewer vào origin request. Policy này chỉ quyết định **thông tin gửi kèm**, không cấp quyền.", en: "The **AllViewer** origin request policy puts every viewer header, cookie and query string into the origin request. It only decides **what information is sent**; it grants no permission." }) },
            SKIP_PROXY,
            { at: "origin", direct: true, state: "bad", msg: L({ vi: "Bucket policy vẫn không có `s3:PutObject` cho CloudFront: **Access Denied**.", en: "The bucket policy still has no `s3:PutObject` for CloudFront: **Access Denied**." }) }] }],
          ok: false,
          result: L({ vi: "Tải lên vẫn thất bại. Quyền ghi vào bucket đến từ **OAC + bucket policy**, không đến từ origin request policy hay S3 Object Ownership.", en: "The upload still fails. Write permission on the bucket comes from **OAC + the bucket policy**, not from an origin request policy or S3 Object Ownership." }),
        },
        {
          label: L({ vi: "Cho phép PUT; bucket policy cấp s3:PutObject cho OAC", en: "PUT allowed; bucket policy grants s3:PutObject to OAC" }),
          reqs: [{ line: PUT, ok: true, hops: [putPop, SKIP_PROXY,
            { at: "origin", direct: true, state: "ok", msg: L({ vi: "Bucket policy cho phép `s3:PutObject` từ distribution này; S3 lưu object. Bucket dùng Object Ownership **Bucket owner enforced** (mặc định) theo yêu cầu của OAC.", en: "The bucket policy allows `s3:PutObject` from this distribution; S3 stores the object. The bucket uses Object Ownership **Bucket owner enforced** (the default), as OAC requires." }) }] }],
          ok: true,
          result: L({ vi: "200 OK, object được lưu; CloudFront không cache phản hồi của PUT. Khi mở mọi method, cache behavior cũng nhận DELETE, nên bucket policy không cấp `s3:DeleteObject` nếu khách hàng không được xoá.", en: "200 OK, the object is stored; CloudFront does not cache PUT responses. Allowing all methods also accepts DELETE, so the bucket policy grants no `s3:DeleteObject` unless customers may delete." }),
        },
        {
          label: L({ vi: "Origin là S3 website endpoint", en: "Origin is the S3 website endpoint" }),
          origin: { l1: "S3 website endpoint", l2: "custom origin · HTTP" },
          reqs: [{ line: PUT, ok: false, hops: [putPop, SKIP_PROXY,
            { at: "origin", direct: true, state: "bad", msg: L({ vi: "Website endpoint chỉ hỗ trợ **GET và HEAD** trên object, chỉ phục vụ nội dung public và không hỗ trợ HTTPS. CloudFront xem endpoint này là custom origin nên **không dùng được OAC**.", en: "A website endpoint supports only **GET and HEAD** on objects, serves only public content and does not support HTTPS. CloudFront treats it as a custom origin, so **OAC cannot be used**." }) }] }],
          ok: false,
          result: L({ vi: "Tải lên thất bại. Origin cho luồng tải lên phải là **REST endpoint** của bucket (ví dụ `mftech-uploads.s3.ap-southeast-1.amazonaws.com`) kèm OAC.", en: "The upload fails. The origin for uploads must be the bucket's **REST endpoint** (for example `mftech-uploads.s3.ap-southeast-1.amazonaws.com`) with OAC." }),
        },
      ],
    },
    {
      name: L({ vi: "API theo dõi đơn hàng", en: "Order-tracking API" }),
      origin: { l1: "ALB → API", l2: L({ vi: "dữ liệu thời gian thực", en: "real-time data" }) },
      options: [
        {
          label: L({ vi: "CachingOptimized, không có origin request policy", en: "CachingOptimized, no origin request policy" }),
          reqs: [{ line: "GET /api/track?id=SV123", ok: false, hops: [
            popMiss(L({ vi: "Cache key chỉ gồm `/api/track`: CachingOptimized **không đưa query string vào cache key**.", en: "The cache key is only `/api/track`: CachingOptimized puts **no query strings in the cache key**." })),
            { at: "rec", state: "miss", msg: L({ vi: "Regional edge cache không có object.", en: "The regional edge cache does not have the object." }) },
            { at: "origin", state: "bad", msg: L({ vi: "Origin nhận `/api/track` **không có `?id=SV123`**: query string không thuộc cache key và không có origin request policy nào đưa nó vào origin request.", en: "The origin receives `/api/track` **without `?id=SV123`**: the query string is not in the cache key and no origin request policy adds it to the origin request." }) },
          ] }],
          ok: false,
          result: L({ vi: "API không xác định được đơn hàng. Managed cache policy dành cho nội dung tĩnh không phù hợp với API trả dữ liệu theo từng request.", en: "The API cannot identify the order. A managed cache policy built for static content does not fit an API whose data depends on each request." }),
        },
        {
          label: L({ vi: "CachingOptimized + origin request policy AllViewerExceptHostHeader", en: "CachingOptimized + origin request policy AllViewerExceptHostHeader" }),
          reqs: [
            { line: L({ vi: "Khách A: GET /api/track?id=SV123", en: "Customer A: GET /api/track?id=SV123" }), ok: true, hops: [
              popMiss(L({ vi: "Cache miss với cache key `/api/track`.", en: "Cache miss for cache key `/api/track`." })),
              { at: "rec", state: "miss", msg: L({ vi: "Regional edge cache không có object.", en: "The regional edge cache does not have the object." }) },
              { at: "origin", state: "ok", msg: L({ vi: "Origin request policy gửi kèm query string nên API trả đúng đơn SV123. Phản hồi được cache với key `/api/track` (default TTL 24 giờ nếu origin không gửi `Cache-Control`).", en: "The origin request policy forwards the query string, so the API returns order SV123. The response is cached under `/api/track` (default TTL 24 hours when the origin sends no `Cache-Control`)." }) },
            ] },
            { line: L({ vi: "Khách B: GET /api/track?id=SV456", en: "Customer B: GET /api/track?id=SV456" }), ok: false, hops: [
              { at: "pop", state: "bad", msg: L({ vi: "**Cache hit** với cùng key `/api/track`: khách B nhận **dữ liệu đơn SV123** của khách A. Origin request policy không thay đổi cache key.", en: "**Cache hit** on the same key `/api/track`: customer B receives **customer A's order SV123**. An origin request policy does not change the cache key." }) },
            ] },
          ],
          ok: false,
          result: L({ vi: "Sai dữ liệu và lộ thông tin giữa khách hàng. CachingOptimized có minimum TTL 1 giây, nên phản hồi vẫn được cache kể cả khi origin gửi `Cache-Control: no-cache`.", en: "Wrong data, leaked between customers. CachingOptimized has a minimum TTL of 1 second, so responses are cached even when the origin sends `Cache-Control: no-cache`." }),
        },
        {
          label: L({ vi: "CachingDisabled + origin request policy AllViewerExceptHostHeader", en: "CachingDisabled + origin request policy AllViewerExceptHostHeader" }),
          reqs: ["SV123", "SV456"].map((id, i) => ({
            line: L({ vi: `Khách ${i ? "B" : "A"}: GET /api/track?id=${id}`, en: `Customer ${i ? "B" : "A"}: GET /api/track?id=${id}` }),
            ok: true,
            hops: [
              { at: "pop", state: "fwd", msg: L({ vi: "CachingDisabled: TTL 0, không cache. Query string được gửi kèm origin request.", en: "CachingDisabled: TTL 0, nothing is cached. The query string goes into the origin request." }) },
              recSkip(L({ vi: "Không đi qua: request động (xác định tại thời điểm request) đi thẳng tới origin.", en: "Not used: dynamic requests (as determined at request time) go directly to the origin." })),
              { at: "origin", direct: true, state: "ok", msg: L({ vi: `API trả đúng dữ liệu đơn ${id}.`, en: `The API returns order ${id}.` }) },
            ],
          })),
          ok: true,
          result: L({ vi: "Dữ liệu đúng cho từng khách, nhưng **mọi request đều tới origin**: CloudFront không giảm tải cho tầng ứng dụng, năng lực xử lý vẫn do Auto Scaling group phía sau ALB quyết định. Khi đối tác cần IP tĩnh, giao thức TCP/UDP hoặc failover nhanh giữa các Region, xem AWS Global Accelerator (phần 4).", en: "Correct data for each customer, but **every request reaches the origin**: CloudFront takes no load off the application tier, and capacity still depends on the Auto Scaling group behind the ALB. When partners need static IPs, TCP/UDP or fast failover between Regions, see AWS Global Accelerator (part 4)." }),
        },
      ],
    },
  ];
}

const LANE = 150;
const TOP = 62;
const X: Record<"viewer" | NodeId, number> = { viewer: 62, pop: 255, rec: 470, origin: 705 };
const W: Record<NodeId, number> = { pop: 160, rec: 170, origin: 190 };
const H = 62;

const TAG: Record<HopState, { text: Bi; cls: string }> = {
  hit: { text: { vi: "HIT", en: "HIT" }, cls: "hit" },
  miss: { text: { vi: "MISS", en: "MISS" }, cls: "miss" },
  fwd: { text: { vi: "CHUYỂN TIẾP", en: "FORWARD" }, cls: "info" },
  ok: { text: { vi: "OK", en: "OK" }, cls: "hit" },
  bad: { text: { vi: "LỖI", en: "FAIL" }, cls: "bad" },
  skip: { text: { vi: "BỎ QUA", en: "SKIPPED" }, cls: "info" },
};
const NODE_CLS: Record<HopState, string> = { hit: "ok", ok: "ok", miss: "warn", fwd: "on", bad: "bad", skip: "off" };

type LogEntry = { kind: "req"; text: string } | { kind: "hop"; state: HopState; node: string; msg: string } | { kind: "result"; ok: boolean; msg: string };

export default function TieredPathSim() {
  const L = useLang();
  const SC = scenarios(L);
  const pk = useRef<SVGGElement>(null);
  const gen = useRef(0);
  const [si, setSi] = useState(0);
  const [oi, setOi] = useState(0);
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Partial<Record<NodeId, string>>>({});
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => () => { gen.current++; }, []);

  const sc = SC[si];
  const opt = sc.options[Math.min(oi, sc.options.length - 1)];
  const origin = opt.origin ?? sc.origin;
  const NODE_NAME: Record<NodeId, string> = {
    pop: L({ vi: "POP (edge location)", en: "POP (edge location)" }),
    rec: "Regional edge cache",
    origin: origin.l1,
  };

  function clear() {
    gen.current++;
    pk.current?.replaceChildren();
    setBusy(false);
    setLit({});
    setLog([]);
  }

  function pickScenario(i: number) {
    clear();
    setSi(i);
    setOi(0);
  }

  function pickOption(i: number) {
    clear();
    setOi(i);
  }

  const edgeIn = (n: NodeId): Pt => [X[n] - W[n] / 2, LANE];
  const top = (n: NodeId): Pt => [X[n], LANE - H / 2];

  async function send() {
    const layer = pk.current;
    if (!layer || busy) return;
    const g = ++gen.current;
    setBusy(true);
    setLit({});
    setLog([]);
    try {
      for (const [ri, req] of opt.reqs.entries()) {
        if (ri > 0) setLit({});
        setLog((l) => [...l, { kind: "req", text: req.line }]);
        let path: Pt[] = [[X.viewer + 20, LANE]];
        let last: Pt = path[0];
        for (const hop of req.hops) {
          if (hop.state === "skip") {
            setLit((s) => ({ ...s, [hop.at]: NODE_CLS.skip }));
            setLog((l) => [...l, { kind: "hop", state: hop.state, node: NODE_NAME[hop.at], msg: hop.msg }]);
            continue;
          }
          const seg: Pt[] = hop.direct
            ? [last, top("pop"), [X.pop, TOP], [X.origin, TOP], top("origin")]
            : [last, edgeIn(hop.at), [X[hop.at], LANE]];
          await travel(layer, seg, 340 + seg.length * 90, hop.state === "bad" ? "pkt-bad" : "pkt");
          if (g !== gen.current) return;
          path = path.concat(seg.slice(1));
          last = seg[seg.length - 1];
          setLit((s) => ({ ...s, [hop.at]: NODE_CLS[hop.state] }));
          setLog((l) => [...l, { kind: "hop", state: hop.state, node: NODE_NAME[hop.at], msg: hop.msg }]);
          if (hop.state === "bad") flashText(layer, X[hop.at], LANE - H / 2 - 8, "✗", "flash-bad", 900);
          if (hop.state === "hit" || hop.state === "bad") break;
        }
        await travel(layer, [...path].reverse(), 700, req.ok ? "pkt-back" : "pkt-bad");
        if (g !== gen.current) return;
      }
      setLog((l) => [...l, { kind: "result", ok: opt.ok, msg: opt.result }]);
    } finally {
      if (g === gen.current) setBusy(false);
    }
  }

  const box = (id: NodeId, t1: string, t2: string) => (
    <g className={`cft-node ${lit[id] ?? ""}`}>
      <rect x={X[id] - W[id] / 2} y={LANE - H / 2} width={W[id]} height={H} rx={8} />
      <text className="cft-t" x={X[id]} y={LANE - 4} textAnchor="middle">{t1}</text>
      <text className="cft-s" x={X[id]} y={LANE + 14} textAnchor="middle">{t2}</text>
    </g>
  );

  return (
    <div className="stage">
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3 pb-0" role="group" aria-label={L({ vi: "Tình huống", en: "Scenario" })}>
        <span className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">{L({ vi: "Tình huống", en: "Scenario" })}</span>
        {SC.map((s, i) => (
          <button key={s.name} className="chip disabled:cursor-default disabled:opacity-60" aria-pressed={i === si} disabled={busy} onClick={() => pickScenario(i)}>{s.name}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-2 pb-0" role="group" aria-label={L({ vi: "Cấu hình", en: "Configuration" })}>
        <span className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">{L({ vi: "Cấu hình", en: "Configuration" })}</span>
        {sc.options.map((o, i) => (
          <button key={o.label} className="max-w-full cursor-pointer rounded-[12px] border border-line bg-surface px-2.5 py-1 text-left text-step--1 wrap-anywhere text-ink disabled:cursor-default disabled:opacity-60 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg aria-pressed:disabled:opacity-100" aria-pressed={i === oi} disabled={busy} onClick={() => pickOption(i)}>{o.label}</button>
        ))}
      </div>
      <div className="stage-bar mt-3 flex-wrap border-t border-line">
        <code className="min-w-0 rounded-[10px] border border-line bg-bg px-2 py-[3px] text-[0.8125rem] wrap-anywhere">{opt.reqs.map((r) => r.line).join("  →  ")}</code>
        <button className="btn primary ml-auto" onClick={send} disabled={busy}>{L({ vi: "Gửi request", en: "Send request" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 36 820 168" role="img" aria-label={L({ vi: "Request đi từ người dùng tới POP, regional edge cache và origin", en: "The request goes from the user to the POP, the regional edge cache and the origin" })}>
          <path className="cft-wire" d={`M${X.viewer + 20} ${LANE} H${X.origin - W.origin / 2}`} />
          <path className="cft-wire dash" d={`M${X.pop} ${LANE - H / 2} V${TOP} H${X.origin} V${LANE - H / 2}`} />
          <text className="cft-m" x={(X.pop + X.origin) / 2} y={TOP - 7} textAnchor="middle">{L({ vi: "POP → origin trực tiếp", en: "POP → origin directly" })}</text>
          <g transform={`translate(${X.viewer} ${LANE})`} aria-hidden="true">
            <circle className="user" cy={-9} r={7} />
            <path className="user" d="M-13 13 a13 13 0 0 1 26 0 z" />
          </g>
          <text className="cft-s" x={X.viewer} y={LANE + 36} textAnchor="middle">{L({ vi: "Người dùng", en: "Users" })}</text>
          {box("pop", "POP", L({ vi: "edge location · cache nhỏ", en: "edge location · smaller cache" }))}
          {box("rec", "Regional edge cache", L({ vi: "cache lớn hơn, dùng chung", en: "larger, shared cache" }))}
          {box("origin", origin.l1, origin.l2)}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="m-0 text-step--1 text-muted">{L({
            vi: <>Chọn tình huống và cấu hình, sau đó nhấn <b>Gửi request</b>. Thử lần lượt từng cấu hình để so sánh đường đi và kết quả.</>,
            en: <>Choose a scenario and a configuration, then press <b>Send request</b>. Try each configuration in turn to compare the path and the result.</>,
          })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.kind === "req" ? (
                <li key={i} className="mt-1.5 block! first:mt-0"><code>{e.text}</code></li>
              ) : e.kind === "result" ? (
                <li key={i} className={`mt-1.5 block! rounded-[12px] px-2.5 py-2 ${e.ok ? "bg-ok-soft" : "bg-bad-soft"}`}>{rich(e.msg)}</li>
              ) : (
                <li key={i}>
                  <span className={`tag ${TAG[e.state].cls}`}>{L(TAG[e.state].text)}</span>
                  <span><b>{e.node}:</b> {rich(e.msg)}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
