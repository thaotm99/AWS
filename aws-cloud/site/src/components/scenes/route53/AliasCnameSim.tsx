import { useLang } from "../../../lib/lang";
import CaseSim, { type CaseLink, type CaseNode, type CaseScenario } from "../global-infra/CaseSim";

type Lang = ReturnType<typeof useLang>;

// MFTECH creates the records for its domain. Pick Alias or CNAME for each one,
// create it and send a DNS query: the zone apex refuses a CNAME, an Alias only
// points to AWS resources or records in the same hosted zone.

type P = [number, number];
type Target = "cf" | "www" | "alb" | "ext";
const Y: Record<Target, number> = { cf: 29, www: 87, alb: 145, ext: 203 };
const via = (t: Target): P[] => [[480, 120], [480, Y[t]]];

function scenarios(L: Lang): CaseScenario[] {
const NODES: CaseNode[] = [
  { id: "user", x: 20, y: 97, w: 60, l1: L({ vi: "Trình duyệt", en: "Browser" }), user: true },
  { id: "r53", x: 170, y: 97, w: 180, l1: "Route 53", l2: "hosted zone mftech.vn" },
  { id: "cf", x: 560, y: 6, w: 230, l1: "CloudFront", l2: "d111.cloudfront.net · AWS" },
  { id: "www", x: 560, y: 64, w: 230, l1: "www.mftech.vn", l2: L({ vi: "record cùng hosted zone", en: "record in same hosted zone" }) },
  { id: "alb", x: 560, y: 122, w: 230, l1: "ALB", l2: "shop-alb-123.elb… · AWS" },
  { id: "ext", x: 560, y: 180, w: 230, l1: "mftech.wordpress.com", l2: L({ vi: "bên ngoài AWS", en: "outside AWS" }) },
];
const LINKS: CaseLink[] = [
  { a: "user", b: "r53" },
  ...(Object.keys(Y) as Target[]).map((t) => ({ a: "r53", b: t, via: via(t) })),
];
const TYPE = { label: L({ vi: "Loại record", en: "Record type" }), options: ["Alias", "CNAME"], initial: 1 };
const base = { nodes: NODES, links: LINKS, start: "user", choices: TYPE };

const APEX_NO_CNAME = { at: "r53", state: "block" as const, flash: "CNAME?", msg: L({ vi: "Không tạo được: Route 53 **không cho phép tạo CNAME tại zone apex** (`mftech.vn`).", en: "Cannot be created: Route 53 **does not allow a CNAME at the zone apex** (`mftech.vn`)." }) };

return [
  {
    ...base,
    name: "mftech.vn → CloudFront",
    request: "dig mftech.vn",
    from: L({ vi: "tên miền chính trỏ tới website tĩnh", en: "main domain points to the static website" }),
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: L({ vi: "Alias được phép tại zone apex.", en: "Alias is allowed at the zone apex." }) },
            { at: "cf", via: via("cf"), state: "pass", msg: L({ vi: "Route 53 tự động lấy IP của distribution và trả về trực tiếp. Truy vấn Alias tới tài nguyên AWS **không tính phí**.", en: "Route 53 automatically gets the distribution's IPs and returns them directly. Alias queries to AWS resources are **not charged**." }) },
          ],
          ok: true, result: L({ vi: "Truy cập mftech.vn được định tuyến tới CloudFront.", en: "Requests to mftech.vn are routed to CloudFront." }) }
      : { steps: [APEX_NO_CNAME], ok: false, result: L({ vi: "Tên miền chính không trỏ được tới đích. Sử dụng Alias.", en: "The main domain cannot point to the target. Use Alias." }) },
  },
  {
    ...base,
    name: "mftech.vn → www.mftech.vn",
    request: "dig mftech.vn",
    from: L({ vi: "chuyển mọi truy cập về www", en: "send all traffic to www" }),
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: L({ vi: "Alias tại zone apex trỏ tới một record khác trong **cùng hosted zone** và cùng loại (A/AAAA); www không được là CNAME.", en: "An Alias at the zone apex points to another record in the **same hosted zone** of the same type (A/AAAA); www must not be a CNAME." }) },
            { at: "www", via: via("www"), state: "pass", msg: L({ vi: "Trả về địa chỉ của www.mftech.vn.", en: "Returns the address of www.mftech.vn." }) },
          ],
          ok: true, result: L({ vi: "Phương án có chi phí thấp và đơn giản nhất để mftech.vn trỏ theo www.", en: "The lowest-cost and simplest way to make mftech.vn follow www." }) }
      : { steps: [APEX_NO_CNAME], ok: false, result: L({ vi: "Không tạo được record. Tại zone apex không tạo được CNAME; sử dụng Alias.", en: "The record cannot be created. A CNAME cannot be created at the zone apex; use Alias." }) },
  },
  {
    ...base,
    name: "www.mftech.vn → ALB",
    request: "dig www.mftech.vn",
    from: L({ vi: "subdomain trỏ tới load balancer", en: "subdomain points to the load balancer" }),
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: L({ vi: "Alias sử dụng được cho subdomain.", en: "Alias can be used for a subdomain." }) },
            { at: "alb", via: via("alb"), state: "pass", msg: L({ vi: "Trả về trực tiếp IP của ALB, tự động cập nhật khi IP của ALB thay đổi. Không tính phí truy vấn.", en: "Returns the ALB's IPs directly, updated automatically when the ALB's IPs change. No query charge." }) },
          ],
          ok: true, result: L({ vi: "Hoạt động được, và là lựa chọn phù hợp hơn khi đích là tài nguyên AWS.", en: "It works, and it is the better choice when the target is an AWS resource." }) }
      : { steps: [
            { at: "r53", state: "pass", msg: L({ vi: "www là subdomain, không phải apex, nên CNAME hợp lệ.", en: "www is a subdomain, not the apex, so a CNAME is valid." }) },
            { at: "alb", via: via("alb"), state: "change", tag: L({ vi: "THÊM BƯỚC", en: "EXTRA STEP" }), msg: L({ vi: "Trả về tên DNS của ALB; DNS resolver phải phân giải thêm tên này. Route 53 tính phí truy vấn CNAME.", en: "Returns the ALB's DNS name; the DNS resolver must resolve this name as well. Route 53 charges for CNAME queries." }) },
          ],
          ok: true, result: L({ vi: "Hoạt động được. Alias vẫn có ưu thế: Route 53 trả về trực tiếp địa chỉ của ALB và không tính phí truy vấn Alias tới tài nguyên AWS.", en: "It works. Alias still has the advantage: Route 53 returns the ALB's addresses directly and does not charge for Alias queries to AWS resources." }) },
  },
  {
    ...base,
    name: "blog.mftech.vn → WordPress",
    request: "dig blog.mftech.vn",
    from: L({ vi: "blog lưu trữ tại dịch vụ bên ngoài", en: "blog hosted on an external service" }),
    run: (v) => v === 0
      ? { steps: [{ at: "r53", state: "block", flash: "Alias?", msg: L({ vi: "Alias chỉ trỏ tới **tài nguyên AWS** (CloudFront, ALB, S3 website…) hoặc record trong cùng hosted zone.", en: "An Alias points only to **AWS resources** (CloudFront, ALB, S3 website…) or records in the same hosted zone." }) }],
          ok: false, result: L({ vi: "Không tạo được Alias tới tên miền bên ngoài. Sử dụng CNAME.", en: "An Alias to an external domain cannot be created. Use CNAME." }) }
      : { steps: [
            { at: "r53", state: "pass", msg: L({ vi: "blog là subdomain, CNAME hợp lệ.", en: "blog is a subdomain, so a CNAME is valid." }) },
            { at: "ext", via: via("ext"), state: "pass", msg: L({ vi: "Record trỏ tới mftech.wordpress.com.", en: "The record points to mftech.wordpress.com." }) },
          ],
          ok: true, result: L({ vi: "Truy cập blog.mftech.vn được chuyển tới trang WordPress.", en: "Requests to blog.mftech.vn go to the WordPress site." }) },
  },
];
}

export default function AliasCnameSim() {
  const L = useLang();
  return <CaseSim scenarios={scenarios(L)} label={L({ vi: "Route 53 phản hồi truy vấn bằng Alias hoặc CNAME", en: "Route 53 answers queries with an Alias or a CNAME record" })} action={L({ vi: "Tạo record và truy vấn", en: "Create record and query" })} />;
}
