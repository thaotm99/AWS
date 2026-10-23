import { useEffect, useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./s3-sims.css";

// The same bucket reached through its REST API endpoint and through its static website
// endpoint. Facts (WebsiteEndpoints.html, CustomErrorDocSupport.html, RoutingToS3Bucket.html):
// website endpoint = public content only, HTML error documents, index document at the root,
// GET and HEAD only, no HTTPS; S3 does not run server-side scripts.
// Source questions: exam5_q15, exam1_q62, exam4_q53, exam5_q56.

type Ep = "rest" | "web";
type Tone = "ok" | "bad" | "warn";

interface Req { id: string; line: string; name: Bi; rest: { tone: Tone; code: string; msg: Bi }; web: { tone: Tone; code: string; msg: Bi } }

const REQS: Req[] = [
  {
    id: "root", line: "GET /", name: { vi: "Mở trang chủ", en: "Open the home page" },
    rest: { tone: "warn", code: "200 · XML", msg: { vi: "REST API endpoint trả về **danh sách key của object** trong bucket (với principal có quyền liệt kê), không trả về trang chủ.", en: "The REST API endpoint returns **a list of the object keys** in the bucket (to a principal allowed to list it), not the home page." } },
    web: { tone: "ok", code: "200 · index.html", msg: { vi: "Website endpoint trả về **index document** đã khai báo trong cấu hình website (index.html).", en: "The website endpoint returns the **index document** set in the website configuration (index.html)." } },
  },
  {
    id: "miss", line: "GET /khuyen-mai/het-han", name: { vi: "Trang khuyến mãi đã gỡ", en: "Removed promo page" },
    rest: { tone: "warn", code: "404 · XML", msg: { vi: "REST API endpoint trả về **thông báo lỗi dạng XML**, không phù hợp để hiển thị cho khách hàng trên trình duyệt.", en: "The REST API endpoint returns an **XML error response**, which is not suitable to show customers in a browser." } },
    web: { tone: "ok", code: "404 · 404.html", msg: { vi: "Website endpoint trả về **tài liệu HTML**; với lỗi nhóm 4XX, S3 trả về **custom error document** (404.html) nếu đã cấu hình.", en: "The website endpoint returns an **HTML document**; for 4XX errors, S3 returns the **custom error document** (404.html) when one is configured." } },
  },
  {
    id: "put", line: "PUT /uploads/anh-khach.jpg", name: { vi: "Khách hàng tải ảnh lên", en: "Customer uploads a photo" },
    rest: { tone: "ok", code: "200", msg: { vi: "REST API endpoint hỗ trợ **mọi thao tác** trên bucket và object, kể cả PUT có xác thực. Đây là origin phù hợp khi CloudFront chuyển request tải lên tới S3 (kết hợp OAC).", en: "The REST API endpoint supports **all bucket and object operations**, including authenticated PUTs. It is the right origin when CloudFront forwards uploads to S3 (with OAC)." } },
    web: { tone: "bad", code: "GET/HEAD only", msg: { vi: "Website endpoint **chỉ hỗ trợ GET và HEAD** trên object. Request PUT không được xử lý, nên không dùng website endpoint làm origin cho luồng tải lên.", en: "The website endpoint **supports only GET and HEAD** requests on objects. A PUT is not served, so a website endpoint cannot be the origin for an upload flow." } },
  },
  {
    id: "https", line: "GET https://…/", name: { vi: "Truy cập qua HTTPS", en: "Access over HTTPS" },
    rest: { tone: "ok", code: "TLS", msg: { vi: "REST API endpoint hỗ trợ kết nối SSL/TLS.", en: "The REST API endpoint supports SSL/TLS connections." } },
    web: { tone: "bad", code: "HTTP only", msg: { vi: "Website endpoint **không hỗ trợ HTTPS**. Để phục vụ website tĩnh qua HTTPS với tên miền riêng, đặt **CloudFront** phía trước hoặc dùng **AWS Amplify Hosting** (phương án AWS khuyến nghị).", en: "The website endpoint **does not support HTTPS**. To serve the static site over HTTPS on a custom domain, put **CloudFront** in front of it or use **AWS Amplify Hosting** (the option AWS recommends)." } },
  },
  {
    id: "private", line: "GET /hoa-don/hd-0815.pdf", name: { vi: "Đọc hoá đơn riêng tư", en: "Read a private invoice" },
    rest: { tone: "ok", code: "200", msg: { vi: "REST API endpoint hỗ trợ cả nội dung công khai và **riêng tư**: request đã ký của principal có quyền được chấp nhận.", en: "The REST API endpoint supports both public and **private** content: a signed request from an authorized principal is accepted." } },
    web: { tone: "bad", code: "403", msg: { vi: "Website endpoint **chỉ phục vụ nội dung đọc công khai**; object không được đọc công khai nhận 403 Forbidden.", en: "The website endpoint **serves only publicly readable content**; an object that is not publicly readable gets 403 Forbidden." } },
  },
  {
    id: "dyn", line: "POST /api/gio-hang", name: { vi: "Thêm vào giỏ hàng (xử lý phía server)", en: "Add to cart (server-side logic)" },
    rest: { tone: "bad", code: "no server code", msg: { vi: "S3 **không hỗ trợ server-side scripting**. Giỏ hàng cần tầng ứng dụng, ví dụ EC2 trong Auto Scaling group phía sau ALB.", en: "S3 **does not support server-side scripting**. A cart needs an application tier, for example EC2 in an Auto Scaling group behind an ALB." } },
    web: { tone: "bad", code: "GET/HEAD only", msg: { vi: "Website tĩnh chỉ gồm trang web và client-side script; S3 **không chạy mã phía server**. Nội dung động thay đổi liên tục cần tầng ứng dụng có khả năng mở rộng.", en: "A static website holds only web pages and client-side scripts; S3 **does not run server-side code**. Content that changes constantly needs a scalable application tier." } },
  },
];

const HOST: Record<Ep, string> = {
  rest: "mftech-promo.s3.ap-southeast-1.amazonaws.com",
  web: "mftech-promo.s3-website-ap-southeast-1.amazonaws.com",
};

const CLIENT: Pt = [80, 110];
const EP: Record<Ep, Pt> = { rest: [330, 60], web: [330, 160] };
const BUCKET: Pt = [640, 110];

export default function WebsiteEndpointSim() {
  const L = useLang();
  const pk = useRef<SVGGElement>(null);
  const [ep, setEp] = useState<Ep>("web");
  const [ri, setRi] = useState(0);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState<{ tone: Tone; code: string; msg: Bi } | null>(null);
  const gen = useRef(0);
  useEffect(() => () => { gen.current++; }, []);

  const req = REQS[ri];

  function choose(fn: () => void) {
    gen.current++;
    fn();
    setOut(null);
    setBusy(false);
  }

  async function send() {
    const layer = pk.current;
    if (!layer || busy) return;
    const my = ++gen.current;
    setBusy(true);
    setOut(null);
    try {
      const r = req[ep];
      const e = EP[ep];
      await travel(layer, [[CLIENT[0] + 60, CLIENT[1]], [200, CLIENT[1]], [200, e[1]], [e[0] - 85, e[1]]], 600, "pkt");
      if (gen.current !== my) return;
      if (r.tone === "bad") {
        flashText(layer, e[0], e[1] - 30, r.code, "flash-bad", 1100);
        await travel(layer, [[e[0] - 85, e[1]], [200, e[1]], [200, CLIENT[1]], [CLIENT[0] + 60, CLIENT[1]]], 500, "pkt-bad");
      } else {
        await travel(layer, [[e[0] + 85, e[1]], [500, e[1]], [500, BUCKET[1]], [BUCKET[0] - 80, BUCKET[1]]], 450, "pkt");
        if (gen.current !== my) return;
        flashText(layer, e[0], e[1] - 30, r.code, r.tone === "ok" ? "s3x-flash-ok" : "s3x-flash-edge", 1100);
        await travel(layer, [[BUCKET[0] - 80, BUCKET[1]], [500, BUCKET[1]], [500, e[1]], [200, e[1]], [200, CLIENT[1]], [CLIENT[0] + 60, CLIENT[1]]], 750, "pkt-back");
      }
      if (gen.current === my) setOut(r);
    } finally {
      if (gen.current === my) setBusy(false);
    }
  }

  return (
    <div className="stage s3x">
      <div className="s3x-row" role="group" aria-label={L({ vi: "Endpoint", en: "Endpoint" })}>
        <span className="s3x-lbl">Endpoint</span>
        <button className="chip" aria-pressed={ep === "rest"} onClick={() => choose(() => setEp("rest"))}>REST API endpoint</button>
        <button className="chip" aria-pressed={ep === "web"} onClick={() => choose(() => setEp("web"))}>Website endpoint</button>
      </div>
      <div className="s3x-row" role="group" aria-label={L({ vi: "Request", en: "Request" })}>
        <span className="s3x-lbl">Request</span>
        {REQS.map((r, i) => (
          <button key={r.id} className="chip" aria-pressed={i === ri} onClick={() => choose(() => setRi(i))}>{L(r.name)}</button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="s3x-req">{`${req.line.replace("https://…", `https://${HOST[ep]}`)}${req.id === "https" ? "" : `  ·  Host: ${HOST[ep]}`}`}</code>
        <button className="btn primary" onClick={send} disabled={busy}>{L({ vi: "Gửi request", en: "Send request" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 10 760 200" role="img" aria-label={L({ vi: "Trình duyệt gửi request tới REST API endpoint hoặc website endpoint của cùng một bucket S3", en: "A browser sends a request to the REST API endpoint or the website endpoint of the same S3 bucket" })}>
          <path className="s3x-wire" d={`M140 110 H200 V60 H245 M200 110 V160 H245 M415 60 H500 V110 H560 M415 160 H500 V110`} />
          <g className="s3x-node on">
            <rect x={CLIENT[0] - 60} y={CLIENT[1] - 26} width={120} height={52} rx={8} />
            <text className="s3x-t" x={CLIENT[0]} y={CLIENT[1] - 3} textAnchor="middle">{L({ vi: "Trình duyệt", en: "Browser" })}</text>
            <text className="s3x-s" x={CLIENT[0]} y={CLIENT[1] + 13} textAnchor="middle">{L({ vi: "khách hàng", en: "customer" })}</text>
          </g>
          {(["rest", "web"] as Ep[]).map((k) => (
            <g key={k} className={`s3x-node ${k === ep ? (out ? out.tone : "on") : "off"}`}>
              <rect x={EP[k][0] - 85} y={EP[k][1] - 22} width={170} height={44} rx={8} />
              <text className="s3x-t" x={EP[k][0]} y={EP[k][1] - 3} textAnchor="middle">{k === "rest" ? "REST API endpoint" : "Website endpoint"}</text>
              <text className="s3x-s" x={EP[k][0]} y={EP[k][1] + 13} textAnchor="middle">{k === "rest" ? "s3.<region>" : "s3-website-<region>"}</text>
            </g>
          ))}
          <g className="s3x-node on">
            <rect x={BUCKET[0] - 80} y={BUCKET[1] - 30} width={160} height={60} rx={8} />
            <text className="s3x-t" x={BUCKET[0]} y={BUCKET[1] - 6} textAnchor="middle">mftech-promo</text>
            <text className="s3x-s" x={BUCKET[0]} y={BUCKET[1] + 10} textAnchor="middle">index.html · 404.html</text>
            <text className="s3x-s" x={BUCKET[0]} y={BUCKET[1] + 23} textAnchor="middle">{L({ vi: "hoa-don/ (riêng tư)", en: "hoa-don/ (private)" })}</text>
          </g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {out ? (
          <p className={`s3x-result ${out.tone}`}><b>{out.code}</b> · {rich(L(out.msg))}</p>
        ) : (
          <p className="s3x-hint">{L({ vi: <>Chọn endpoint và request, sau đó nhấn <b>Gửi request</b>. Gửi cùng request qua endpoint còn lại để so sánh.</>, en: <>Choose an endpoint and a request, then press <b>Send request</b>. Send the same request through the other endpoint to compare.</> })}</p>
        )}
      </div>
    </div>
  );
}
