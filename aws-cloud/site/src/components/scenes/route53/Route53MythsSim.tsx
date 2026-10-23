import { useLang } from "../../../lib/lang";
import type { Pt } from "../../../lib/animate";
import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

type Lang = ReturnType<typeof useLang>;

// Four Route 53 settings that MFTECH can easily get wrong: how an NLB splits
// traffic when cross-zone is off, failover vs weighted, geolocation vs
// geoproximity bias, the two layers that can block content by country, and
// why a multivalue answer record does not add capacity for a traffic spike.

function scenarios(L: Lang): CaseScenario[] {
return [
  {
    name: L({ vi: "NLB phân phối tải không đều giữa hai AZ", en: "NLB spreads load unevenly across two AZs" }),
    request: "GET /api/stock",
    from: L({ vi: "1.000 request mỗi giây", en: "1,000 requests per second" }),
    boxes: [
      { x: 330, y: 4, w: 470, h: 108, label: L({ vi: "AZ-A · 4 target", en: "AZ-A · 4 targets" }) },
      { x: 330, y: 124, w: 470, h: 108, label: L({ vi: "AZ-B · 6 target", en: "AZ-B · 6 targets" }) },
    ],
    nodes: [
      { id: "r53", x: 20, y: 97, w: 150, l1: "Route 53", l2: L({ vi: "trả về IP của 2 node NLB", en: "returns the IPs of 2 NLB nodes" }) },
      { id: "na", x: 360, y: 40, w: 170, l1: "Node NLB AZ-A", l2: L({ vi: "nhận 50%", en: "receives 50%" }) },
      { id: "nb", x: 360, y: 160, w: 170, l1: "Node NLB AZ-B", l2: L({ vi: "nhận 50%", en: "receives 50%" }) },
      { id: "ta", x: 610, y: 40, w: 170, l1: L({ vi: "4 target", en: "4 targets" }), l2: "AZ-A" },
      { id: "tb", x: 610, y: 160, w: 170, l1: L({ vi: "6 target", en: "6 targets" }), l2: "AZ-B" },
    ],
    links: [
      { a: "r53", b: "na", via: [[250, 120], [250, 63]] }, { a: "r53", b: "nb", via: [[250, 120], [250, 183]] },
      { a: "na", b: "ta" }, { a: "nb", b: "tb" },
      { id: "xa", a: "na", b: "tb", dashed: true }, { id: "xb", a: "nb", b: "ta", dashed: true },
    ],
    start: "r53",
    choices: { label: "Cross-zone load balancing", options: [L({ vi: "Tắt", en: "Off" }), L({ vi: "Bật", en: "On" })], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["xa", "xb"], back: false, steps: [
            { at: "na", via: [[250, 120], [250, 63]], state: "pass", msg: L({ vi: "Route 53 phân phối đều cho node NLB của mỗi AZ: 50%.", en: "Route 53 distributes evenly to the NLB node in each AZ: 50%." }) },
            { at: "ta", state: "change", tag: L({ vi: "12,5%", en: "12.5%" }), msg: L({ vi: "Node AZ-A chỉ phân phối cho 4 target trong cùng AZ: 50% ÷ 4 = **12,5%** mỗi target.", en: "The AZ-A node distributes only to the 4 targets in its own AZ: 50% ÷ 4 = **12.5%** per target." }) },
            { at: "tb", via: [[570, 63], [570, 183]], state: "change", tag: L({ vi: "8,33%", en: "8.33%" }), msg: L({ vi: "Node AZ-B phân phối cho 6 target: 50% ÷ 6 = **8,33%** mỗi target.", en: "The AZ-B node distributes to 6 targets: 50% ÷ 6 = **8.33%** per target." }) },
          ],
          ok: false, result: L({ vi: "Mỗi target tại AZ-A chịu tải lớn hơn target tại AZ-B. Bật cross-zone load balancing để phân phối đều.", en: "Each target in AZ-A carries more load than a target in AZ-B. Turn on cross-zone load balancing to distribute evenly." }) }
      : { back: false, steps: [
            { at: "na", via: [[250, 120], [250, 63]], state: "pass", msg: L({ vi: "Route 53 vẫn phân phối 50/50 cho hai node.", en: "Route 53 still distributes 50/50 to the two nodes." }) },
            { at: "ta", state: "pass", tag: "10%", msg: L({ vi: "Mỗi node phân phối cho toàn bộ 10 target tại hai AZ.", en: "Each node distributes to all 10 targets in both AZs." }) },
            { at: "tb", via: [[570, 63], [570, 183]], state: "pass", tag: "10%", msg: L({ vi: "Mọi target nhận **10%**.", en: "Every target receives **10%**." }) },
          ],
          ok: true, result: L({ vi: "Tải được phân phối đều trên mọi target, không phụ thuộc số lượng target tại mỗi AZ.", en: "Load is distributed evenly across all targets, regardless of the number of targets in each AZ." }) },
  },
  {
    name: L({ vi: "Hiển thị trang thông báo lỗi khi ALB gặp sự cố", en: "Show an error notice page when the ALB fails" }),
    request: "dig mftech.vn",
    from: L({ vi: "từ người dùng", en: "from users" }),
    nodes: [
      { id: "user", x: 20, y: 97, w: 60, l1: L({ vi: "Người dùng", en: "Users" }), user: true },
      { id: "r53", x: 190, y: 97, w: 170, l1: "Route 53", l2: L({ vi: "có health check", en: "with health checks" }) },
      { id: "alb", x: 600, y: 30, w: 190, l1: "ALB", l2: "primary" },
      { id: "s3", x: 600, y: 164, w: 190, l1: L({ vi: "S3: trang thông báo lỗi", en: "S3: error notice page" }), l2: "secondary" },
    ],
    links: [{ a: "user", b: "r53" }, { a: "r53", b: "alb", via: [[480, 120], [480, 53]] }, { a: "r53", b: "s3", via: [[480, 120], [480, 187]] }],
    start: "user",
    choices: { label: L({ vi: "Cấu hình", en: "Configuration" }), options: ["Weighted 90/10, ALB healthy", "Failover, ALB healthy", "Failover, ALB unhealthy"], initial: 0 },
    run: (v) => {
      if (v === 0) return {
        steps: [
          { at: "r53", state: "change", tag: "10%", msg: L({ vi: "Weighted chọn record theo trọng số trong số các record healthy. Health check chỉ loại record unhealthy khỏi câu trả lời; ALB và S3 đều healthy nên record S3 vẫn nhận khoảng 10% truy vấn.", en: "Weighted routing selects records by weight among the healthy records. A health check only removes unhealthy records from responses; the ALB and S3 are both healthy, so the S3 record still receives about 10% of queries." }) },
          { at: "s3", via: [[480, 120], [480, 187]], state: "block", flash: L({ vi: "lỗi?", en: "error?" }), msg: L({ vi: "1 trên 10 người dùng nhận trang thông báo lỗi dù hệ thống đang hoạt động bình thường.", en: "1 in 10 users gets the error notice page even though the system is working normally." }) },
        ],
        ok: false, result: L({ vi: "Trang lỗi không được hiển thị đúng thời điểm. Sử dụng failover routing.", en: "The error page is not shown at the right time. Use failover routing." }) };
      if (v === 1) return {
        steps: [
          { at: "r53", state: "pass", msg: L({ vi: "Health check xác định primary healthy.", en: "The health check marks the primary as healthy." }) },
          { at: "alb", via: [[480, 120], [480, 53]], state: "pass", msg: L({ vi: "Mọi request được chuyển tới ALB.", en: "Every request goes to the ALB." }) },
        ],
        ok: true, result: L({ vi: "Trang lỗi không được sử dụng khi primary còn healthy.", en: "The error page is not used while the primary is healthy." }) };
      return { marks: { alb: "down" },
        steps: [
          { at: "r53", state: "change", tag: "FAILOVER", msg: L({ vi: "Health check xác định primary unhealthy, Route 53 trả về record secondary.", en: "The health check marks the primary as unhealthy, and Route 53 returns the secondary record." }) },
          { at: "s3", via: [[480, 120], [480, 187]], state: "pass", msg: L({ vi: "Người dùng nhận trang thông báo lỗi tĩnh trên S3 thay vì trang trắng.", en: "Users get the static error notice page on S3 instead of a blank page." }) },
        ],
        ok: true, result: L({ vi: "Failover **active-passive**: tài nguyên dự phòng chỉ được sử dụng khi primary gặp sự cố. Với active-active, mọi record healthy đều được sử dụng và Route 53 có thể phản hồi bằng bất kỳ record healthy nào.", en: "**Active-passive** failover: the standby resource is used only when the primary fails. With active-active, every healthy record is used, and Route 53 can respond with any healthy record." }) };
    },
  },
  {
    name: L({ vi: "Mở rộng khu vực phục vụ của Singapore", en: "Expand Singapore's service area" }),
    request: "dig mftech.vn",
    from: L({ vi: "từ người dùng tại Ấn Độ", en: "from users in India" }),
    nodes: [
      { id: "user", x: 20, y: 97, w: 60, l1: L({ vi: "Người dùng Ấn Độ", en: "Users in India" }), user: true },
      { id: "r53", x: 190, y: 97, w: 170, l1: "Route 53" },
      { id: "sg", x: 600, y: 30, w: 190, l1: "ALB Singapore" },
      { id: "fra", x: 600, y: 164, w: 190, l1: "ALB Frankfurt" },
    ],
    links: [{ a: "user", b: "r53" }, { a: "r53", b: "sg", via: [[480, 120], [480, 53]] }, { a: "r53", b: "fra", via: [[480, 120], [480, 187]] }],
    start: "user",
    choices: { label: "Routing policy", options: ["Geolocation", L({ vi: "Geoproximity, bias +50 cho Singapore", en: "Geoproximity, bias +50 for Singapore" })], initial: 0 },
    run: (v) => v === 0
      ? { steps: [
            { at: "r53", state: "pass", msg: L({ vi: "Geolocation định tuyến theo **quốc gia của người dùng**. Record hiện tại: Ấn Độ → Frankfurt.", en: "Geolocation routes by the **user's country**. Current record: India → Frankfurt." }) },
            { at: "fra", via: [[480, 120], [480, 187]], state: "pass", msg: L({ vi: "Người dùng vẫn được định tuyến tới Frankfurt.", en: "Users are still routed to Frankfurt." }) },
          ],
          ok: false, result: L({ vi: "Geolocation không có khái niệm phạm vi khu vực. Để thay đổi, phải sửa record của từng quốc gia.", en: "Geolocation has no notion of the size of a region. To change it, you must edit the record for each country." }) }
      : { steps: [
            { at: "r53", state: "change", tag: "BIAS +50", msg: L({ vi: "Geoproximity định tuyến theo **khoảng cách**; bias dương mở rộng khu vực của Singapore.", en: "Geoproximity routes by **distance**; a positive bias expands Singapore's region." }) },
            { at: "sg", via: [[480, 120], [480, 53]], state: "pass", msg: L({ vi: "Người dùng tại Ấn Độ hiện thuộc khu vực của Singapore.", en: "Users in India now fall within Singapore's region." }) },
          ],
          ok: true, result: L({ vi: "Mở rộng hoặc thu hẹp khu vực địa lý của một tài nguyên: geoproximity với bias.", en: "Expanding or shrinking the geographic region of a resource: geoproximity with bias." }) },
  },
  {
    name: L({ vi: "Giới hạn video tại quốc gia ngoài phạm vi bản quyền", en: "Restrict video in countries outside the licensed territory" }),
    request: "GET https://mftech.vn/videos/1.mp4",
    from: L({ vi: "từ quốc gia ngoài phạm vi bản quyền", en: "from a country outside the licensed territory" }),
    nodes: [
      { id: "user", x: 20, y: 97, w: 60, l1: L({ vi: "Người dùng", en: "Users" }), user: true },
      { id: "r53", x: 180, y: 97, w: 170, l1: "Route 53", l2: L({ vi: "tầng DNS", en: "DNS layer" }) },
      { id: "cf", x: 420, y: 97, w: 170, l1: "CloudFront", l2: L({ vi: "tầng phân phối", en: "delivery layer" }) },
      { id: "s3", x: 660, y: 97, w: 140, l1: "S3", l2: "video" },
    ],
    links: [{ a: "user", b: "r53" }, { a: "r53", b: "cf" }, { a: "cf", b: "s3" }],
    start: "user",
    choices: { label: L({ vi: "Cơ chế giới hạn", en: "Restriction mechanism" }), options: ["Route 53 geolocation", "CloudFront geo restriction"], initial: 0 },
    run: (v) => v === 0
      ? { steps: [{ at: "r53", state: "block", flash: "no answer", msg: L({ vi: "Không có record cho quốc gia này và không có record mặc định: Route 53 không trả về phản hồi.", en: "There is no record for this country and no default record: Route 53 returns no answer." }) }],
          ok: true, result: L({ vi: "Giới hạn tại **tầng DNS**: client không phân giải được địa chỉ.", en: "Restricted at the **DNS layer**: the client cannot resolve the address." }) }
      : { steps: [
            { at: "r53", state: "pass", msg: L({ vi: "Route 53 trả về CloudFront như với mọi người dùng khác.", en: "Route 53 returns CloudFront, as for every other user." }) },
            { at: "cf", state: "block", flash: "403", msg: L({ vi: "**Geo restriction** của CloudFront xác định quốc gia nguồn thuộc block list.", en: "CloudFront **geo restriction** finds the source country on the block list." }) },
          ],
          ok: true, result: L({ vi: "Giới hạn tại **tầng phân phối nội dung**: CloudFront trả về 403. Hai cơ chế này có thể áp dụng đồng thời.", en: "Restricted at the **content delivery layer**: CloudFront returns 403. The two mechanisms can be applied together." }) },
  },
  {
    name: L({ vi: "Flash sale: lưu lượng tăng 10 lần, nội dung động", en: "Flash sale: 10x traffic, dynamic content" }),
    request: "GET https://mftech.vn/flash-sale",
    from: L({ vi: "lưu lượng gấp 10 lần ngày thường", en: "10 times the usual traffic" }),
    nodes: [
      { id: "user", x: 20, y: 97, w: 60, l1: L({ vi: "Người dùng", en: "Users" }), user: true },
      { id: "r53", x: 140, y: 97, w: 150, l1: "Route 53" },
      { id: "alb", x: 350, y: 97, w: 180, l1: "ALB", l2: "Auto Scaling group" },
      { id: "w1", x: 620, y: 6, w: 180, l1: "EC2 web 1" },
      { id: "w2", x: 620, y: 64, w: 180, l1: "EC2 web 2" },
      { id: "w3", x: 620, y: 122, w: 180, l1: "EC2 web 3" },
      { id: "w4", x: 620, y: 180, w: 180, l1: L({ vi: "EC2 web 4…n", en: "EC2 web 4…n" }), l2: L({ vi: "ASG bổ sung", en: "added by the ASG" }) },
    ],
    links: [
      { a: "user", b: "r53" }, { a: "r53", b: "alb" },
      ...[["w1", 29], ["w2", 87], ["w3", 145], ["w4", 203]].map(([w, y]) => ({ a: "alb", b: w as string, via: [[580, 120], [580, y as number]] as Pt[] })),
      ...[["w1", 29], ["w2", 87], ["w3", 145]].map(([w, y]) => ({ id: `m-${w}`, a: "r53", b: w as string, via: [[320, 120], [320, 40], [580, 40], [580, y as number]] as Pt[] })),
    ],
    start: "user",
    choices: { label: L({ vi: "Cấu hình", en: "Configuration" }), options: [L({ vi: "Multivalue answer, 3 EC2 instance", en: "Multivalue answer, 3 EC2 instances" }), "ALB + Auto Scaling group"], initial: 0 },
    run: (v) => v === 0
      ? { hide: ["alb", "w4", "r53-alb", "alb-w1", "alb-w2", "alb-w3", "alb-w4"], back: false, steps: [
            { at: "r53", state: "pass", tag: "MULTIVALUE", msg: L({ vi: "Multivalue answer trả về tối đa **8 record healthy**, mỗi DNS resolver nhận một tập trả lời khác nhau: tải được chia xấp xỉ ngẫu nhiên cho 3 instance.", en: "Multivalue answer returns up to **8 healthy records**, giving different answers to different DNS resolvers: load is shared roughly at random across 3 instances." }) },
            { at: "w1", via: [[320, 120], [320, 40], [580, 40], [580, 29]], state: "block", flash: "CPU 100%", msg: L({ vi: "Lưu lượng gấp 10 lần vẫn đổ vào đúng 3 instance: DNS **không bổ sung năng lực xử lý**. AWS ghi rõ multivalue answer không thay thế được load balancer.", en: "Ten times the traffic still lands on the same 3 instances: DNS **adds no capacity**. AWS states that multivalue answer is not a substitute for a load balancer." }) },
          ],
          ok: false, result: L({ vi: "Hệ thống quá tải. Multivalue answer chỉ cải thiện tính sẵn sàng và chia sẻ tải ở tầng DNS; cần cơ chế tăng số instance.", en: "The system is overloaded. Multivalue answer only improves uptime and load sharing at the DNS layer; a way to add instances is needed." }) }
      : { hide: ["m-w1", "m-w2", "m-w3"], steps: [
            { at: "r53", state: "pass", msg: L({ vi: "Route 53 trả về ALB (Alias).", en: "Route 53 returns the ALB (Alias)." }) },
            { at: "alb", state: "change", tag: "SCALE OUT", msg: L({ vi: "Scaling policy của Auto Scaling group tăng desired capacity trong khoảng min–max và launch thêm instance.", en: "The Auto Scaling group's scaling policy raises the desired capacity between the minimum and maximum and launches more instances." }) },
            { at: "w4", via: [[580, 120], [580, 203]], state: "pass", msg: L({ vi: "ALB phân phối request cho cả các instance mới; nội dung động vẫn được xử lý tại web tier.", en: "The ALB distributes requests to the new instances too; dynamic content is still processed by the web tier." }) },
          ],
          ok: true, result: L({ vi: "Năng lực xử lý tăng theo tải. Chi tiết scaling policy: bài Auto Scaling group.", en: "Capacity grows with the load. Scaling policies in detail: the Auto Scaling group lesson." }) },
  },
];
}

export default function Route53MythsSim() {
  const L = useLang();
  return <CaseSim scenarios={scenarios(L)} label={L({ vi: "Năm lỗi cấu hình Route 53 thường gặp", en: "Five common Route 53 configuration mistakes" })} action={L({ vi: "Chạy mô phỏng", en: "Run simulation" })} />;
}
