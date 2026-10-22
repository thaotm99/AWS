import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

// Four Route 53 settings that ShopViet can easily get wrong: how an NLB splits
// traffic when cross-zone is off, failover vs weighted, geolocation vs
// geoproximity bias, and the two layers that can block content by country.

const SCENARIOS: CaseScenario[] = [
  {
    name: "NLB phân phối tải không đều giữa hai AZ",
    request: "GET /api/stock",
    from: "1.000 request mỗi giây",
    boxes: [
      { x: 330, y: 4, w: 470, h: 108, label: "AZ-A · 4 target" },
      { x: 330, y: 124, w: 470, h: 108, label: "AZ-B · 6 target" },
    ],
    nodes: [
      { id: "r53", x: 20, y: 97, w: 150, l1: "Route 53", l2: "trả về IP của 2 node NLB" },
      { id: "na", x: 360, y: 40, w: 170, l1: "Node NLB AZ-A", l2: "nhận 50%" },
      { id: "nb", x: 360, y: 160, w: 170, l1: "Node NLB AZ-B", l2: "nhận 50%" },
      { id: "ta", x: 610, y: 40, w: 170, l1: "4 target", l2: "AZ-A" },
      { id: "tb", x: 610, y: 160, w: 170, l1: "6 target", l2: "AZ-B" },
    ],
    links: [
      { a: "r53", b: "na", via: [[250, 120], [250, 63]] }, { a: "r53", b: "nb", via: [[250, 120], [250, 183]] },
      { a: "na", b: "ta" }, { a: "nb", b: "tb" },
      { id: "xa", a: "na", b: "tb", dashed: true }, { id: "xb", a: "nb", b: "ta", dashed: true },
    ],
    start: "r53",
    choices: { label: "Cross-zone load balancing", options: ["Tắt", "Bật"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["xa", "xb"], back: false, steps: [
            { at: "na", via: [[250, 120], [250, 63]], state: "pass", msg: "Route 53 phân phối đều cho node NLB của mỗi AZ: 50%." },
            { at: "ta", state: "change", tag: "12,5%", msg: "Node AZ-A chỉ phân phối cho 4 target trong cùng AZ: 50% ÷ 4 = **12,5%** mỗi target." },
            { at: "tb", via: [[570, 63], [570, 183]], state: "change", tag: "8,33%", msg: "Node AZ-B phân phối cho 6 target: 50% ÷ 6 = **8,33%** mỗi target." },
          ],
          ok: false, result: "Mỗi target tại AZ-A chịu tải lớn hơn target tại AZ-B. Bật cross-zone load balancing để phân phối đều." }
      : { back: false, steps: [
            { at: "na", via: [[250, 120], [250, 63]], state: "pass", msg: "Route 53 vẫn phân phối 50/50 cho hai node." },
            { at: "ta", state: "pass", tag: "10%", msg: "Mỗi node phân phối cho toàn bộ 10 target tại hai AZ." },
            { at: "tb", via: [[570, 63], [570, 183]], state: "pass", tag: "10%", msg: "Mọi target nhận **10%**." },
          ],
          ok: true, result: "Tải được phân phối đều trên mọi target, không phụ thuộc số lượng target tại mỗi AZ." },
  },
  {
    name: "Hiển thị trang thông báo lỗi khi ALB gặp sự cố",
    request: "dig shopviet.vn",
    from: "từ người dùng",
    nodes: [
      { id: "user", x: 20, y: 97, w: 60, l1: "Người dùng", user: true },
      { id: "r53", x: 190, y: 97, w: 170, l1: "Route 53", l2: "có health check" },
      { id: "alb", x: 600, y: 30, w: 190, l1: "ALB", l2: "primary" },
      { id: "s3", x: 600, y: 164, w: 190, l1: "S3: trang thông báo lỗi", l2: "secondary" },
    ],
    links: [{ a: "user", b: "r53" }, { a: "r53", b: "alb", via: [[480, 120], [480, 53]] }, { a: "r53", b: "s3", via: [[480, 120], [480, 187]] }],
    start: "user",
    choices: { label: "Cấu hình", options: ["Weighted 90/10, ALB healthy", "Failover, ALB healthy", "Failover, ALB unhealthy"], initial: 0 },
    run: (v) => {
      if (v === 0) return {
        steps: [
          { at: "r53", state: "change", tag: "10%", msg: "Weighted phân phối theo trọng số, không phụ thuộc trạng thái health của ALB." },
          { at: "s3", via: [[480, 120], [480, 187]], state: "block", flash: "lỗi?", msg: "1 trên 10 người dùng nhận trang thông báo lỗi dù hệ thống đang hoạt động bình thường." },
        ],
        ok: false, result: "Trang lỗi không được hiển thị đúng thời điểm. Sử dụng failover routing." };
      if (v === 1) return {
        steps: [
          { at: "r53", state: "pass", msg: "Health check xác định primary healthy." },
          { at: "alb", via: [[480, 120], [480, 53]], state: "pass", msg: "Mọi request được chuyển tới ALB." },
        ],
        ok: true, result: "Trang lỗi không được sử dụng khi primary còn healthy." };
      return { marks: { alb: "down" },
        steps: [
          { at: "r53", state: "change", tag: "FAILOVER", msg: "Health check xác định primary unhealthy, Route 53 trả về record secondary." },
          { at: "s3", via: [[480, 120], [480, 187]], state: "pass", msg: "Người dùng nhận trang thông báo lỗi tĩnh trên S3 thay vì trang trắng." },
        ],
        ok: true, result: "Failover **active-passive**: tài nguyên dự phòng chỉ được sử dụng khi primary gặp sự cố. Với active-active, Route 53 phản hồi bằng mọi tài nguyên healthy cùng lúc." };
    },
  },
  {
    name: "Mở rộng khu vực phục vụ của Singapore",
    request: "dig shopviet.vn",
    from: "từ người dùng tại Ấn Độ",
    nodes: [
      { id: "user", x: 20, y: 97, w: 60, l1: "Người dùng Ấn Độ", user: true },
      { id: "r53", x: 190, y: 97, w: 170, l1: "Route 53" },
      { id: "sg", x: 600, y: 30, w: 190, l1: "ALB Singapore" },
      { id: "fra", x: 600, y: 164, w: 190, l1: "ALB Frankfurt" },
    ],
    links: [{ a: "user", b: "r53" }, { a: "r53", b: "sg", via: [[480, 120], [480, 53]] }, { a: "r53", b: "fra", via: [[480, 120], [480, 187]] }],
    start: "user",
    choices: { label: "Routing policy", options: ["Geolocation", "Geoproximity, bias +50 cho Singapore"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: "Geolocation định tuyến theo **quốc gia của người dùng**. Record hiện tại: Ấn Độ → Frankfurt." },
            { at: "fra", via: [[480, 120], [480, 187]], state: "pass", msg: "Người dùng vẫn được định tuyến tới Frankfurt." },
          ],
          ok: false, result: "Geolocation không có khái niệm phạm vi khu vực. Để thay đổi, phải sửa record của từng quốc gia." }
      : { steps: [
            { at: "r53", state: "change", tag: "BIAS +50", msg: "Geoproximity định tuyến theo **khoảng cách**; bias dương mở rộng khu vực của Singapore." },
            { at: "sg", via: [[480, 120], [480, 53]], state: "pass", msg: "Người dùng tại Ấn Độ hiện thuộc khu vực của Singapore." },
          ],
          ok: true, result: "Mở rộng hoặc thu hẹp khu vực địa lý của một tài nguyên: geoproximity với bias." },
  },
  {
    name: "Giới hạn video tại quốc gia ngoài phạm vi bản quyền",
    request: "GET https://shopviet.vn/videos/1.mp4",
    from: "từ quốc gia ngoài phạm vi bản quyền",
    nodes: [
      { id: "user", x: 20, y: 97, w: 60, l1: "Người dùng", user: true },
      { id: "r53", x: 180, y: 97, w: 170, l1: "Route 53", l2: "tầng DNS" },
      { id: "cf", x: 420, y: 97, w: 170, l1: "CloudFront", l2: "tầng phân phối" },
      { id: "s3", x: 660, y: 97, w: 140, l1: "S3", l2: "video" },
    ],
    links: [{ a: "user", b: "r53" }, { a: "r53", b: "cf" }, { a: "cf", b: "s3" }],
    start: "user",
    choices: { label: "Cơ chế giới hạn", options: ["Route 53 geolocation", "CloudFront geo restriction"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [{ at: "r53", state: "block", flash: "no answer", msg: "Không có record cho quốc gia này và không có record mặc định: Route 53 không trả về phản hồi." }],
          ok: true, result: "Giới hạn tại **tầng DNS**: client không phân giải được địa chỉ." }
      : { steps: [
            { at: "r53", state: "pass", msg: "Route 53 trả về CloudFront như với mọi người dùng khác." },
            { at: "cf", state: "block", flash: "403", msg: "**Geo restriction** của CloudFront xác định quốc gia nguồn thuộc block list." },
          ],
          ok: true, result: "Giới hạn tại **tầng phân phối nội dung**: CloudFront trả về 403. Hai cơ chế này có thể áp dụng đồng thời." },
  },
];

export default function Route53MythsSim() {
  return <CaseSim scenarios={SCENARIOS} label="Bốn lỗi cấu hình Route 53 thường gặp" action="Chạy mô phỏng" />;
}
