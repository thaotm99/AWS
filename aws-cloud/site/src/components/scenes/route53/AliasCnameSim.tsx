import CaseSim, { type CaseLink, type CaseNode, type CaseScenario } from "../global-infra/CaseSim";

// ShopViet creates the records for its domain. Pick Alias or CNAME for each one,
// create it and send a DNS query: the zone apex refuses a CNAME, an Alias only
// points to AWS resources or records in the same hosted zone.

type P = [number, number];
type Target = "cf" | "www" | "alb" | "ext";
const NODES: CaseNode[] = [
  { id: "user", x: 20, y: 97, w: 60, l1: "Trình duyệt", user: true },
  { id: "r53", x: 170, y: 97, w: 180, l1: "Route 53", l2: "hosted zone shopviet.vn" },
  { id: "cf", x: 560, y: 6, w: 230, l1: "CloudFront", l2: "d111.cloudfront.net · AWS" },
  { id: "www", x: 560, y: 64, w: 230, l1: "www.shopviet.vn", l2: "record cùng hosted zone" },
  { id: "alb", x: 560, y: 122, w: 230, l1: "ALB", l2: "shop-alb-123.elb… · AWS" },
  { id: "ext", x: 560, y: 180, w: 230, l1: "shopviet.wordpress.com", l2: "ngoài AWS" },
];
const Y: Record<Target, number> = { cf: 29, www: 87, alb: 145, ext: 203 };
const via = (t: Target): P[] => [[480, 120], [480, Y[t]]];
const LINKS: CaseLink[] = [
  { a: "user", b: "r53" },
  ...(Object.keys(Y) as Target[]).map((t) => ({ a: "r53", b: t, via: via(t) })),
];
const TYPE = { label: "Loại record", options: ["Alias", "CNAME"], initial: 1 };
const base = { nodes: NODES, links: LINKS, start: "user", choices: TYPE };

const APEX_NO_CNAME = { at: "r53", state: "block" as const, flash: "CNAME?", msg: "Không tạo được: **CNAME không đặt được ở zone apex** (`shopviet.vn`), vì tên gốc đã có record SOA và NS." };

const SCENARIOS: CaseScenario[] = [
  {
    ...base,
    name: "shopviet.vn → CloudFront",
    request: "dig shopviet.vn",
    from: "tên miền chính trỏ tới web tĩnh",
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: "Alias được phép ở zone apex." },
            { at: "cf", via: via("cf"), state: "pass", msg: "Route 53 tự lấy IP của distribution và trả thẳng về. Truy vấn Alias tới tài nguyên AWS **không tính phí**." },
          ],
          ok: true, result: "Khách gõ shopviet.vn là vào CloudFront." }
      : { steps: [APEX_NO_CNAME], ok: false, result: "Tên miền chính không trỏ được. Dùng Alias." },
  },
  {
    ...base,
    name: "shopviet.vn → www.shopviet.vn",
    request: "dig shopviet.vn",
    from: "gom mọi truy cập về www",
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: "Alias ở zone apex trỏ tới một record khác trong **cùng hosted zone**." },
            { at: "www", via: via("www"), state: "pass", msg: "Trả về đúng địa chỉ của www.shopviet.vn." },
          ],
          ok: true, result: "Cách rẻ và gọn nhất để shopviet.vn đi theo www." }
      : { steps: [APEX_NO_CNAME], ok: false, result: "Không tạo được record. Ở apex chỉ dùng Alias." },
  },
  {
    ...base,
    name: "www.shopviet.vn → ALB",
    request: "dig www.shopviet.vn",
    from: "subdomain trỏ tới load balancer",
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: "Alias dùng được cho subdomain." },
            { at: "alb", via: via("alb"), state: "pass", msg: "Trả thẳng IP của ALB, tự cập nhật khi IP của ALB đổi. Không tính phí truy vấn." },
          ],
          ok: true, result: "Chạy được, và là lựa chọn tốt hơn khi đích là tài nguyên AWS." }
      : { steps: [
            { at: "r53", state: "pass", msg: "www là subdomain, không phải apex, nên CNAME hợp lệ." },
            { at: "alb", via: via("alb"), state: "change", tag: "THÊM BƯỚC", msg: "Trả về tên DNS của ALB, trình duyệt phải phân giải thêm một lần." },
          ],
          ok: true, result: "Chạy được. Alias vẫn tốt hơn một chút: một bước phân giải và không tính phí truy vấn." },
  },
  {
    ...base,
    name: "blog.shopviet.vn → WordPress",
    request: "dig blog.shopviet.vn",
    from: "blog đặt ở dịch vụ ngoài",
    run: (v) => v === 0
      ? { steps: [{ at: "r53", state: "block", flash: "Alias?", msg: "Alias chỉ trỏ tới **tài nguyên AWS** (CloudFront, ALB, S3 website…) hoặc record trong cùng hosted zone." }],
          ok: false, result: "Không tạo được Alias tới tên miền bên ngoài. Dùng CNAME." }
      : { steps: [
            { at: "r53", state: "pass", msg: "blog là subdomain, CNAME hợp lệ." },
            { at: "ext", via: via("ext"), state: "pass", msg: "Trỏ tới shopviet.wordpress.com." },
          ],
          ok: true, result: "Khách vào blog.shopviet.vn là tới trang WordPress." },
  },
];

export default function AliasCnameSim() {
  return <CaseSim scenarios={SCENARIOS} label="Route 53 trả lời truy vấn bằng Alias hoặc CNAME" action="Tạo record và truy vấn" />;
}
