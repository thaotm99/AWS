// Practice test 2, question 22: blue/green traffic shifting with Global Accelerator instead of DNS.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516087,
  cols: 3.7,
  rows: 2.4,
  nodes: [
    { id: "phones", label: { vi: "Người dùng di động", en: "Mobile users" }, sub: { vi: "cache DNS", en: "DNS caching" }, kind: "actor", at: [0, 0.7] },
    { id: "ga", label: "Global Accelerator", sub: "static anycast IPs", at: [1.3, 0.7] },
    { id: "r53", label: "Route 53", sub: "weighted routing", at: [1.3, 0.7] },
    { id: "elb", label: "Load balancer", sub: { vi: "trong một Region", en: "within one Region" }, at: [1.3, 0.7] },
    { id: "cd", label: "AWS CodeDeploy", sub: { vi: "triển khai code", en: "deploys code" }, kind: "ghost", at: [1.3, 0.7] },
    { id: "blue", label: "Blue", sub: { vi: "phiên bản hiện tại", en: "current version" }, at: [2.7, 0] },
    { id: "green", label: "Green", sub: { vi: "phiên bản mới", en: "new version" }, at: [2.7, 1.4] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["r53", "elb", "cd"],
      steps: [
        {
          flow: ["phones", "ga"],
          badge: "static IP",
          caption: {
            vi: "Global Accelerator cung cấp hai static anycast IP làm điểm vào cố định cho ứng dụng ở một hoặc nhiều Region.",
            en: "Global Accelerator provides two static anycast IP addresses as a fixed entry point to the application in one or more Regions.",
          },
        },
        {
          flow: [["ga", "blue"], ["ga", "green"]],
          times: 2,
          badge: { vi: "một phần", en: "a portion" },
          caption: {
            vi: "Endpoint weight quyết định tỷ lệ lưu lượng tới từng endpoint, traffic dial quyết định phần trăm tới từng endpoint group, nên có thể chuyển một phần lưu lượng sang green.",
            en: "Endpoint weights set the share of traffic for each endpoint and traffic dials the percentage for each endpoint group, so a portion of traffic can go to green.",
          },
        },
        {
          flow: ["ga", "green"],
          times: 3,
          badge: { vi: "vài giây", en: "seconds" },
          caption: {
            vi: "Thay đổi weight và dial có hiệu lực trong vài giây và không phụ thuộc cache DNS trên thiết bị hay resolver, nên thử nghiệm được trên nhiều người dùng ngay trong 48 giờ.",
            en: "Weight and dial changes take effect within seconds and are not subject to DNS caching on devices or resolvers, so many users can test the deployment within the 48 hours.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Chuyển lưu lượng ngay, không chờ cache DNS.", en: "Traffic shifts at once, no DNS cache in the way." } },
    },
    {
      option: "a",
      hide: ["ga", "elb", "cd"],
      steps: [
        {
          flow: ["phones", "r53", "blue"],
          tone: "warn",
          badge: { vi: "đã cache", en: "cached" },
          caption: {
            vi: "Weighted routing chia lưu lượng theo tỷ lệ giữa các tài nguyên, dùng được để thử phiên bản mới — nhưng điện thoại đã cache câu trả lời DNS cũ.",
            en: "Weighted routing splits traffic between resources and can test new versions — but the phones have cached the old DNS answer.",
          },
        },
        {
          mark: "green",
          tone: "dim",
          badge: { vi: "chờ", en: "waiting" },
          caption: {
            vi: "Sau khi đổi record, không thể biết bao lâu nữa mọi người dùng mới nhận được địa chỉ IP mới; việc chuyển lưu lượng không nhanh và không kiểm soát được.",
            en: "After a record change, there is no knowing how long it takes before all users receive the updated IP addresses; the shift is neither fast nor controlled.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Cache DNS làm chậm việc chuyển lưu lượng.", en: "DNS caching slows the shift." } },
    },
    {
      option: "c",
      hide: ["ga", "r53", "cd"],
      steps: [
        {
          flow: [["phones", "elb", "blue"], ["phones", "elb", "green"]],
          tone: "warn",
          caption: {
            vi: "Weighted target group của ALB không phụ thuộc DNS và dùng được cho blue/green.",
            en: "ALB weighted target groups do not rely on DNS and can be used for blue/green.",
          },
        },
        {
          mark: "elb",
          tone: "bad",
          badge: { vi: "một Region", en: "one Region" },
          caption: {
            vi: "Nhưng đây là ứng dụng toàn cầu cần giải pháp nhiều Region, nên cách này không áp dụng được.",
            en: "But this is a global application that needs a multi-Region solution, so this cannot be used.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không phục vụ được nhiều Region.", en: "Cannot span Regions." } },
    },
    {
      option: "d",
      hide: ["ga", "r53", "elb"],
      steps: [
        {
          stop: ["phones", "cd"],
          caption: {
            vi: "CodeDeploy cài đặt nội dung lên instance và có hỗ trợ kiểu triển khai blue/green, nhưng nó không dùng để phân phối lưu lượng giữa các instance.",
            en: "CodeDeploy installs content on instances and supports blue/green deployments, but it is not meant to distribute traffic across instances.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không phân phối lưu lượng.", en: "Does not distribute traffic." } },
    },
  ],
};

export default spec;
