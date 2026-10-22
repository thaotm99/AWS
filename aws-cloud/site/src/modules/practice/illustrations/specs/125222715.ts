// Practice test 1, question 59: AWS Global Accelerator for a UDP game with fast regional failover and custom DNS.
// Captions follow the question's explanation. Additional sources:
// - Static IP addresses are fixed entry points; on an unhealthy endpoint, traffic for new connections goes to
//   another available endpoint: https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html
// - "Listeners support TCP and UDP protocols.": https://docs.aws.amazon.com/global-accelerator/latest/dg/about-listeners.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222715,
  cols: 4.2,
  rows: 3.3,
  nodes: [
    { id: "dns", label: "Custom DNS", sub: { vi: "DNS riêng của công ty", en: "company's own DNS" }, kind: "onprem", at: [0, 0.3] },
    { id: "r53", label: "Amazon Route 53", sub: "DNS", at: [0, 0.3] },
    { id: "players", label: { vi: "Người chơi", en: "Players" }, sub: "UDP", kind: "actor", at: [0, 1.2] },
    { id: "ga", label: "Global Accelerator", sub: "static IP · edge", at: [1.2, 1.2] },
    { id: "cf", label: "Amazon CloudFront", sub: "edge location", at: [1.2, 1.2] },
    { id: "elb", label: "ELB", sub: "Elastic Load Balancing", at: [2.1, 0.3] },
    { id: "epA", label: "Endpoint", sub: "Region A", kind: "data", at: [3.1, 0.3] },
    { id: "epB", label: "Endpoint", sub: "Region B", kind: "data", at: [3.1, 2.1] },
  ],
  zones: [
    { id: "regA", label: "Region A", tone: "region", from: [2.1, 0.3], to: [3.1, 0.3] },
    { id: "regB", label: "Region B", tone: "region", from: [2.1, 2.1], to: [3.1, 2.1] },
  ],
  links: [["dns", "players"]],
  scenarios: [
    {
      option: "b",
      hide: ["r53", "cf", "elb"],
      steps: [
        {
          flow: ["players", "ga"],
          badge: "UDP",
          caption: {
            vi: "Người chơi gửi lưu lượng UDP tới các static IP address của accelerator. Các địa chỉ này là điểm vào cố định, nên custom DNS hiện có chỉ cần trỏ tên miền tới chúng.",
            en: "Players send UDP traffic to the accelerator's static IP addresses. They are fixed entry points, so the existing custom DNS only needs to point the domain at them.",
          },
        },
        {
          flow: ["ga", "epA"],
          caption: {
            vi: "Global Accelerator nhận gói tại edge location và chuyển qua mạng toàn cầu của AWS tới endpoint ở Region A, giảm latency và jitter so với internet công cộng.",
            en: "Global Accelerator takes the packets in at the edge and carries them over the AWS global network to the endpoint in Region A, with lower latency and jitter than the public internet.",
          },
        },
        {
          mark: "epA",
          tone: "bad",
          badge: "unhealthy",
          caption: {
            vi: "Region A gặp sự cố; Global Accelerator xác định endpoint đang hoạt động không còn khoẻ mạnh.",
            en: "Region A goes down; Global Accelerator determines that the active endpoint is unhealthy.",
          },
        },
        {
          flow: ["players", "ga", "epB"],
          caption: {
            vi: "Lưu lượng của các kết nối mới được chuyển sang endpoint khả dụng ở Region B, trong khi người chơi vẫn dùng cùng các static IP address.",
            en: "Traffic for new connections goes to the available endpoint in Region B, while players keep using the same static IP addresses.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Hỗ trợ UDP, failover nhanh giữa các Region và giữ nguyên custom DNS.",
          en: "UDP support, fast regional failover, and the custom DNS stays.",
        },
      },
    },
    {
      option: "a",
      hide: ["r53", "cf", "ga"],
      steps: [
        {
          flow: ["players", "elb", "epA"],
          caption: {
            vi: "ELB phân phối lưu lượng tới các backend trong Region A.",
            en: "ELB distributes traffic to backends in Region A.",
          },
        },
        {
          mark: ["epA", "elb"],
          tone: "bad",
          caption: {
            vi: "Region A gặp sự cố.",
            en: "Region A goes down.",
          },
        },
        {
          stop: ["elb", "epB"],
          caption: {
            vi: "ELB chỉ cân bằng tải trong phạm vi một Region; quản lý lưu lượng giữa nhiều Region là vai trò của Global Accelerator.",
            en: "ELB balances load within one Region only; managing traffic across Regions is what Global Accelerator does.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không có failover giữa các Region.",
          en: "No failover across Regions.",
        },
      },
    },
    {
      option: "c",
      hide: ["r53", "ga", "elb"],
      steps: [
        {
          flow: ["players", "cf"],
          tone: "warn",
          badge: "UDP",
          caption: {
            vi: "CloudFront tăng tốc phân phối nội dung có thể cache (ảnh, video) và nội dung động (API, website động) qua các edge location.",
            en: "CloudFront speeds up cacheable content (images, videos) and dynamic content (APIs, dynamic sites) through edge locations.",
          },
        },
        {
          mark: "cf",
          tone: "bad",
          caption: {
            vi: "Với các trường hợp không phải HTTP như game dùng UDP, cần failover nhanh giữa các Region, dịch vụ phù hợp là Global Accelerator, vốn cải thiện hiệu năng cho ứng dụng qua TCP hoặc UDP.",
            en: "For non-HTTP use cases such as UDP gaming that need fast regional failover, the fit is Global Accelerator, which improves performance for applications over TCP or UDP.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không phải dịch vụ dành cho lưu lượng UDP với failover giữa các Region.",
          en: "Not the service for UDP traffic with regional failover.",
        },
      },
    },
    {
      option: "d",
      hide: ["dns", "ga", "cf", "elb"],
      steps: [
        {
          flow: ["players", "r53"],
          tone: "warn",
          caption: {
            vi: "Route 53 là dịch vụ DNS: dịch tên miền thành địa chỉ IP để định tuyến người dùng tới ứng dụng.",
            en: "Route 53 is a DNS service: it translates domain names into IP addresses to route users to the application.",
          },
        },
        {
          mark: "r53",
          tone: "bad",
          badge: { vi: "thay DNS riêng", en: "replaces own DNS" },
          caption: {
            vi: "Dùng Route 53 đồng nghĩa với thay custom DNS hiện có, trái với yêu cầu tiếp tục dùng DNS riêng của công ty.",
            en: "Using Route 53 means replacing the existing custom DNS, against the requirement to keep the company's own DNS.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không giữ được custom DNS.",
          en: "The custom DNS is not kept.",
        },
      },
    },
  ],
};

export default spec;
