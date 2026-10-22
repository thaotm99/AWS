import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

// Four Route 53 settings that ShopViet can easily get wrong: how an NLB splits
// traffic when cross-zone is off, failover vs weighted, geolocation vs
// geoproximity bias, and the two layers that can block content by country.

const SCENARIOS: CaseScenario[] = [
  {
    name: "NLB chia tải lệch giữa hai AZ",
    request: "GET /api/stock",
    from: "1.000 request mỗi giây",
    boxes: [
      { x: 330, y: 4, w: 470, h: 108, label: "AZ-A · 4 target" },
      { x: 330, y: 124, w: 470, h: 108, label: "AZ-B · 6 target" },
    ],
    nodes: [
      { id: "r53", x: 20, y: 97, w: 150, l1: "Route 53", l2: "trả IP 2 node NLB" },
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
            { at: "na", via: [[250, 120], [250, 63]], state: "pass", msg: "Route 53 chia đều cho node NLB của mỗi AZ: 50%." },
            { at: "ta", state: "change", tag: "12,5%", msg: "Node AZ-A chỉ chia cho 4 target cùng AZ: 50% ÷ 4 = **12,5%** mỗi target." },
            { at: "tb", via: [[570, 63], [570, 183]], state: "change", tag: "8,33%", msg: "Node AZ-B chia cho 6 target: 50% ÷ 6 = **8,33%** mỗi target." },
          ],
          ok: false, result: "Target ở AZ-A gánh nhiều hơn target ở AZ-B. Bật cross-zone để chia đều." }
      : { back: false, steps: [
            { at: "na", via: [[250, 120], [250, 63]], state: "pass", msg: "Route 53 vẫn chia 50/50 cho hai node." },
            { at: "ta", state: "pass", tag: "10%", msg: "Mỗi node chia cho cả 10 target ở hai AZ." },
            { at: "tb", via: [[570, 63], [570, 183]], state: "pass", tag: "10%", msg: "Mọi target nhận **10%**." },
          ],
          ok: true, result: "Tải đều trên mọi target, bất kể mỗi AZ có bao nhiêu target." },
  },
  {
    name: "Hiện trang báo lỗi khi ALB hỏng",
    request: "dig shopviet.vn",
    from: "từ khách",
    nodes: [
      { id: "user", x: 20, y: 97, w: 60, l1: "Khách", user: true },
      { id: "r53", x: 190, y: 97, w: 170, l1: "Route 53", l2: "có health check" },
      { id: "alb", x: 600, y: 30, w: 190, l1: "ALB", l2: "primary" },
      { id: "s3", x: 600, y: 164, w: 190, l1: "S3 trang báo lỗi", l2: "secondary" },
    ],
    links: [{ a: "user", b: "r53" }, { a: "r53", b: "alb", via: [[480, 120], [480, 53]] }, { a: "r53", b: "s3", via: [[480, 120], [480, 187]] }],
    start: "user",
    choices: { label: "Cấu hình", options: ["Weighted 90/10, ALB khỏe", "Failover, ALB khỏe", "Failover, ALB hỏng"], initial: 0 },
    run: (v) => {
      if (v === 0) return {
        steps: [
          { at: "r53", state: "change", tag: "10%", msg: "Weighted chia theo trọng số, không quan tâm ALB có khỏe hay không." },
          { at: "s3", via: [[480, 120], [480, 187]], state: "block", flash: "lỗi?", msg: "1 trên 10 khách thấy trang báo lỗi dù shop đang chạy tốt." },
        ],
        ok: false, result: "Trang lỗi không được hiện đúng lúc. Dùng failover routing." };
      if (v === 1) return {
        steps: [
          { at: "r53", state: "pass", msg: "Health check báo primary khỏe." },
          { at: "alb", via: [[480, 120], [480, 53]], state: "pass", msg: "Mọi khách vào ALB." },
        ],
        ok: true, result: "Trang lỗi không dùng tới khi primary còn khỏe." };
      return { marks: { alb: "down" },
        steps: [
          { at: "r53", state: "change", tag: "FAILOVER", msg: "Health check báo primary hỏng, Route 53 trả về record secondary." },
          { at: "s3", via: [[480, 120], [480, 187]], state: "pass", msg: "Khách thấy trang báo lỗi tĩnh trên S3 thay vì trang trắng." },
        ],
        ok: true, result: "Failover **active-passive**: dự phòng chỉ dùng khi primary hỏng. Active-active thì trả lời bằng mọi tài nguyên khỏe cùng lúc." };
    },
  },
  {
    name: "Cho Singapore nhận thêm khách",
    request: "dig shopviet.vn",
    from: "từ khách ở Ấn Độ",
    nodes: [
      { id: "user", x: 20, y: 97, w: 60, l1: "Khách Ấn Độ", user: true },
      { id: "r53", x: 190, y: 97, w: 170, l1: "Route 53" },
      { id: "sg", x: 600, y: 30, w: 190, l1: "ALB Singapore" },
      { id: "fra", x: 600, y: 164, w: 190, l1: "ALB Frankfurt" },
    ],
    links: [{ a: "user", b: "r53" }, { a: "r53", b: "sg", via: [[480, 120], [480, 53]] }, { a: "r53", b: "fra", via: [[480, 120], [480, 187]] }],
    start: "user",
    choices: { label: "Routing policy", options: ["Geolocation", "Geoproximity, bias +50 cho Singapore"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: "Geolocation chọn theo **quốc gia của khách**. Record hiện tại: Ấn Độ → Frankfurt." },
            { at: "fra", via: [[480, 120], [480, 187]], state: "pass", msg: "Khách vẫn vào Frankfurt." },
          ],
          ok: false, result: "Geolocation không có khái niệm kích thước vùng. Muốn đổi phải sửa record của từng quốc gia." }
      : { steps: [
            { at: "r53", state: "change", tag: "BIAS +50", msg: "Geoproximity chọn theo **khoảng cách**, bias dương nới rộng vùng của Singapore." },
            { at: "sg", via: [[480, 120], [480, 53]], state: "pass", msg: "Khách ở Ấn Độ giờ rơi vào vùng của Singapore." },
          ],
          ok: true, result: "Muốn mở rộng hay thu hẹp vùng địa lý của một tài nguyên: geoproximity với bias." },
  },
  {
    name: "Chặn video ở nước chưa có bản quyền",
    request: "GET https://shopviet.vn/videos/1.mp4",
    from: "từ nước chưa có bản quyền",
    nodes: [
      { id: "user", x: 20, y: 97, w: 60, l1: "Khách", user: true },
      { id: "r53", x: 180, y: 97, w: 170, l1: "Route 53", l2: "tầng DNS" },
      { id: "cf", x: 420, y: 97, w: 170, l1: "CloudFront", l2: "tầng phân phối" },
      { id: "s3", x: 660, y: 97, w: 140, l1: "S3", l2: "video" },
    ],
    links: [{ a: "user", b: "r53" }, { a: "r53", b: "cf" }, { a: "cf", b: "s3" }],
    start: "user",
    choices: { label: "Chặn bằng", options: ["Route 53 geolocation", "CloudFront geo restriction"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [{ at: "r53", state: "block", flash: "no answer", msg: "Không có record cho quốc gia này và không có record mặc định: Route 53 không trả lời." }],
          ok: true, result: "Chặn ở **tầng DNS**: khách không tìm được địa chỉ." }
      : { steps: [
            { at: "r53", state: "pass", msg: "Route 53 trả về CloudFront như mọi khách khác." },
            { at: "cf", state: "block", flash: "403", msg: "**Geo restriction** của CloudFront thấy quốc gia nằm trong danh sách chặn." },
          ],
          ok: true, result: "Chặn ở **tầng phân phối nội dung**: CloudFront trả 403. Hai cách này dùng được cùng lúc." },
  },
];

export default function Route53MythsSim() {
  return <CaseSim scenarios={SCENARIOS} label="Bốn cấu hình Route 53 dễ làm sai" action="Chạy thử" />;
}
