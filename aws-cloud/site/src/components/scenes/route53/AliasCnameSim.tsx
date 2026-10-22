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
  { id: "ext", x: 560, y: 180, w: 230, l1: "shopviet.wordpress.com", l2: "bên ngoài AWS" },
];
const Y: Record<Target, number> = { cf: 29, www: 87, alb: 145, ext: 203 };
const via = (t: Target): P[] => [[480, 120], [480, Y[t]]];
const LINKS: CaseLink[] = [
  { a: "user", b: "r53" },
  ...(Object.keys(Y) as Target[]).map((t) => ({ a: "r53", b: t, via: via(t) })),
];
const TYPE = { label: "Loại record", options: ["Alias", "CNAME"], initial: 1 };
const base = { nodes: NODES, links: LINKS, start: "user", choices: TYPE };

const APEX_NO_CNAME = { at: "r53", state: "block" as const, flash: "CNAME?", msg: "Không tạo được: Route 53 **không cho phép tạo CNAME tại zone apex** (`shopviet.vn`)." };

const SCENARIOS: CaseScenario[] = [
  {
    ...base,
    name: "shopviet.vn → CloudFront",
    request: "dig shopviet.vn",
    from: "tên miền chính trỏ tới website tĩnh",
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: "Alias được phép tại zone apex." },
            { at: "cf", via: via("cf"), state: "pass", msg: "Route 53 tự động lấy IP của distribution và trả về trực tiếp. Truy vấn Alias tới tài nguyên AWS **không tính phí**." },
          ],
          ok: true, result: "Truy cập shopviet.vn được định tuyến tới CloudFront." }
      : { steps: [APEX_NO_CNAME], ok: false, result: "Tên miền chính không trỏ được tới đích. Sử dụng Alias." },
  },
  {
    ...base,
    name: "shopviet.vn → www.shopviet.vn",
    request: "dig shopviet.vn",
    from: "chuyển mọi truy cập về www",
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: "Alias tại zone apex trỏ tới một record khác trong **cùng hosted zone** và cùng loại (A/AAAA); www không được là CNAME." },
            { at: "www", via: via("www"), state: "pass", msg: "Trả về địa chỉ của www.shopviet.vn." },
          ],
          ok: true, result: "Phương án có chi phí thấp và đơn giản nhất để shopviet.vn trỏ theo www." }
      : { steps: [APEX_NO_CNAME], ok: false, result: "Không tạo được record. Tại zone apex không tạo được CNAME; sử dụng Alias." },
  },
  {
    ...base,
    name: "www.shopviet.vn → ALB",
    request: "dig www.shopviet.vn",
    from: "subdomain trỏ tới load balancer",
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: "Alias sử dụng được cho subdomain." },
            { at: "alb", via: via("alb"), state: "pass", msg: "Trả về trực tiếp IP của ALB, tự động cập nhật khi IP của ALB thay đổi. Không tính phí truy vấn." },
          ],
          ok: true, result: "Hoạt động được, và là lựa chọn phù hợp hơn khi đích là tài nguyên AWS." }
      : { steps: [
            { at: "r53", state: "pass", msg: "www là subdomain, không phải apex, nên CNAME hợp lệ." },
            { at: "alb", via: via("alb"), state: "change", tag: "THÊM BƯỚC", msg: "Trả về tên DNS của ALB; DNS resolver phải phân giải thêm tên này. Route 53 tính phí truy vấn CNAME." },
          ],
          ok: true, result: "Hoạt động được. Alias vẫn có ưu thế: Route 53 trả về trực tiếp địa chỉ của ALB và không tính phí truy vấn Alias tới tài nguyên AWS." },
  },
  {
    ...base,
    name: "blog.shopviet.vn → WordPress",
    request: "dig blog.shopviet.vn",
    from: "blog lưu trữ tại dịch vụ bên ngoài",
    run: (v) => v === 0
      ? { steps: [{ at: "r53", state: "block", flash: "Alias?", msg: "Alias chỉ trỏ tới **tài nguyên AWS** (CloudFront, ALB, S3 website…) hoặc record trong cùng hosted zone." }],
          ok: false, result: "Không tạo được Alias tới tên miền bên ngoài. Sử dụng CNAME." }
      : { steps: [
            { at: "r53", state: "pass", msg: "blog là subdomain, CNAME hợp lệ." },
            { at: "ext", via: via("ext"), state: "pass", msg: "Record trỏ tới shopviet.wordpress.com." },
          ],
          ok: true, result: "Truy cập blog.shopviet.vn được chuyển tới trang WordPress." },
  },
];

export default function AliasCnameSim() {
  return <CaseSim scenarios={SCENARIOS} label="Route 53 phản hồi truy vấn bằng Alias hoặc CNAME" action="Tạo record và truy vấn" />;
}
