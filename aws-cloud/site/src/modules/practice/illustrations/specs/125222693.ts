// Practice test 1, question 18: S3 Transfer Acceleration and multipart upload for faster uploads from overseas.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const noSpeedup = (option: string, via: string, flowCaption: Bilingual, badge: Bilingual, caption: Bilingual): ScenarioSpec => ({
  option,
  hide: ["edge", "vpn", "dx", "ga"].filter((n) => n !== via),
  steps: [
    { flow: ["office", via, "s3"], tone: "warn", caption: flowCaption },
    { mark: via, tone: "bad", badge, caption },
  ],
  verdict: { works: false, caption: { vi: "Không phải cách tăng tốc tiết kiệm.", en: "Not a cost-effective speed-up." } },
});

const spec: IllustrationSpec = {
  questionId: 125222693,
  cols: 3.8,
  rows: 2.4,
  nodes: [
    { id: "office", label: { vi: "Văn phòng", en: "Branch office" }, sub: { vi: "châu Âu / châu Á", en: "Europe / Asia" }, kind: "onprem", at: [0, 0.7] },
    { id: "edge", label: "Edge location", sub: "S3 Transfer Acceleration", at: [1.4, 0] },
    { id: "ga", label: "Global Accelerator", at: [1.4, 0] },
    { id: "vpn", label: "Site-to-Site VPN", sub: "IPsec · internet", at: [1.4, 1.4] },
    { id: "dx", label: "Direct Connect", sub: { vi: "kết nối riêng", en: "dedicated link" }, at: [1.4, 1.4] },
    { id: "s3", label: "Amazon S3", sub: { vi: "bucket ở Mỹ", en: "US bucket" }, kind: "data", at: [2.8, 0.7] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["ga", "vpn", "dx"],
      steps: [
        {
          flow: ["office", "edge"],
          badge: { vi: "gần nhất", en: "nearest" },
          caption: {
            vi: "S3 Transfer Acceleration dùng các edge location phân bố toàn cầu của CloudFront: dữ liệu vào edge location gần văn phòng.",
            en: "S3 Transfer Acceleration uses CloudFront's globally distributed edge locations: data enters an edge location near the office.",
          },
        },
        {
          flow: ["edge", "s3"],
          badge: { vi: "đường tối ưu", en: "optimised path" },
          caption: {
            vi: "Từ edge location, dữ liệu được định tuyến tới S3 qua đường mạng tối ưu, giúp truyền file nhanh qua khoảng cách xa.",
            en: "From the edge location, data is routed to S3 over an optimised network path, speeding up long-distance transfers.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Nhanh hơn qua khoảng cách xa.", en: "Faster over long distances." } },
    },
    {
      option: "d",
      hide: ["edge", "ga", "vpn", "dx"],
      steps: [
        {
          flow: ["office", "s3"],
          times: 4,
          badge: { vi: "các phần", en: "parts" },
          caption: {
            vi: "Multipart upload tải một object thành nhiều phần độc lập, theo bất kỳ thứ tự nào; phần nào lỗi thì chỉ gửi lại phần đó. Nên cân nhắc khi object từ 100 MB.",
            en: "Multipart upload sends one object as independent parts in any order; a failed part is retransmitted alone. Consider it once objects reach 100 MB.",
          },
        },
        {
          mark: "s3",
          tone: "ok",
          badge: { vi: "ghép lại", en: "assembled" },
          caption: { vi: "Tải xong mọi phần, S3 ghép thành object. Throughput cao hơn nên tải nhanh hơn.", en: "Once all parts arrive, S3 assembles the object. Higher throughput means faster uploads." },
        },
      ],
      verdict: { works: true, caption: { vi: "Song song và chịu lỗi tốt hơn.", en: "Parallel and more resilient." } },
    },
    noSpeedup(
      "a",
      "vpn",
      { vi: "Site-to-Site VPN dùng IPsec mã hoá qua internet.", en: "Site-to-Site VPN uses IPsec over the internet." },
      { vi: "không tăng tốc", en: "no speed-up" },
      {
        vi: "VPN hợp với băng thông thấp đến vừa và chấp nhận biến động của internet; nó không giúp tăng tốc truyền file vào S3 ở đây.",
        en: "VPN suits low to modest bandwidth and tolerates internet variability; it does not speed up transfers into S3 here.",
      },
    ),
    noSpeedup(
      "b",
      "dx",
      { vi: "Direct Connect là kết nối mạng riêng tới một Direct Connect location.", en: "Direct Connect is a dedicated network connection to a Direct Connect location." },
      { vi: "quá mức", en: "overkill" },
      {
        vi: "Direct Connect mất nhiều thời gian để cấp phát và là quá mức cần thiết cho việc tải file lên S3.",
        en: "Direct Connect takes significant time to provision and is overkill for uploading files to S3.",
      },
    ),
    noSpeedup(
      "e",
      "ga",
      { vi: "Global Accelerator cung cấp static IP làm điểm vào cho ALB, NLB hoặc EC2.", en: "Global Accelerator provides static IPs as entry points for ALBs, NLBs or EC2 instances." },
      { vi: "không dành cho S3", en: "not for S3" },
      {
        vi: "Global Accelerator không giúp tăng tốc truyền file vào S3 trong trường hợp này.",
        en: "Global Accelerator does not speed up file transfers into S3 in this case.",
      },
    ),
  ],
};

export default spec;
