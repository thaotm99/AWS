// Practice test 5, question 55: AWS Global Accelerator for lower latency and automatic cross-Region failover.
// Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const elbDown: StepSpec = {
  mark: "elbA",
  tone: "bad",
  badge: { vi: "sự cố", en: "failed" },
  caption: {
    vi: "Elastic Load Balancing ở Region A gặp sự cố, kéo theo lưu lượng của Region đó.",
    en: "Elastic Load Balancing in Region A malfunctions, taking that Region's traffic down with it.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119517523,
  cols: 4.6,
  rows: 3.1,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Global users" }, kind: "actor", at: [0, 1.15] },
    { id: "ga", label: "Global Accelerator", sub: "static anycast IPs", at: [1.3, 1.15] },
    { id: "r53", label: "Route 53", sub: "geoproximity", at: [1.3, 1.15] },
    { id: "cf", label: "CloudFront", sub: "edge location", at: [1.3, 1.15] },
    { id: "dx", label: "Direct Connect", kind: "ghost", at: [1.3, 1.15] },
    { id: "elbA", label: "ELB", sub: "Region A", at: [2.6, 0.3] },
    { id: "elbB", label: "ELB", sub: "Region B", at: [2.6, 2] },
    { id: "ec2A", label: "EC2", kind: "data", at: [3.5, 0.3] },
    { id: "ec2B", label: "EC2", kind: "data", at: [3.5, 2] },
    { id: "s3A", label: "S3 bucket", kind: "data", at: [2.6, 0.3] },
  ],
  zones: [
    { id: "regA", label: "Region A", tone: "region", from: [2.6, 0.3], to: [3.5, 0.3], pad: 18 },
    { id: "regB", label: "Region B", tone: "region", from: [2.6, 2], to: [3.5, 2], pad: 18 },
  ],
  links: [
    ["elbA", "ec2A"],
    ["elbB", "ec2B"],
  ],
  scenarios: [
    {
      option: "d",
      hide: ["r53", "cf", "dx", "s3A"],
      steps: [
        {
          flow: ["users", "ga", "elbA"],
          caption: {
            vi: "Global Accelerator cung cấp hai static IP được anycast từ các edge location, là điểm vào duy nhất của ứng dụng; lưu lượng vào mạng toàn cầu AWS ngay gần người dùng.",
            en: "Global Accelerator provides two static IPs anycast from edge locations, a single entry point to the application; traffic enters the AWS global network close to users.",
          },
        },
        elbDown,
        {
          flow: ["users", "ga", "elbB"],
          caption: {
            vi: "Khi endpoint gặp sự cố, Global Accelerator tự động chuyển các kết nối mới sang endpoint khoẻ mạnh trong vài giây, không cần can thiệp thủ công.",
            en: "When an endpoint fails, Global Accelerator automatically redirects new connections to a healthy endpoint within seconds, with no manual step.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Giảm độ trễ và tự động failover giữa các Region.",
          en: "Lower latency and automatic cross-Region failover.",
        },
      },
    },
    {
      option: "a",
      hide: ["ga", "r53", "cf", "s3A"],
      steps: [
        {
          stop: ["users", "dx"],
          caption: {
            vi: "AWS Direct Connect kết nối hệ thống on-premises tới AWS Cloud cho các trường hợp cần độ trễ rất thấp; nó không thể dùng để phục vụ trực tiếp người dùng.",
            en: "AWS Direct Connect links on-premises systems to the AWS Cloud for very low-latency cases; it cannot serve users directly.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Direct Connect không phục vụ người dùng internet.", en: "Direct Connect does not serve internet users." },
      },
    },
    {
      option: "b",
      hide: ["ga", "r53", "dx", "elbA"],
      steps: [
        {
          flow: ["users", "cf", "s3A"],
          caption: {
            vi: "Nếu phần lớn nội dung là tĩnh, CloudFront với S3 bucket cải thiện hiệu năng.",
            en: "If most content is static, CloudFront with S3 buckets improves performance.",
          },
        },
        {
          mark: "ec2A",
          tone: "bad",
          caption: {
            vi: "Nhưng kiến trúc còn có ELB và EC2 instance, cần được bao gồm trong phương án failover tự động; S3 và CloudFront không giải quyết phần này.",
            en: "But the architecture also has ELBs and EC2 instances that must be covered by automatic failover; S3 and CloudFront do not cover them.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "ELB và EC2 không được failover.", en: "ELBs and EC2 are not failed over." },
      },
    },
    {
      option: "c",
      hide: ["ga", "cf", "dx", "s3A"],
      steps: [
        {
          flow: ["users", "r53", "elbA"],
          tone: "warn",
          caption: {
            vi: "Geoproximity routing để Route 53 định tuyến dựa trên vị trí địa lý của người dùng và tài nguyên.",
            en: "Geoproximity routing lets Route 53 route traffic by the geographic location of users and resources.",
          },
        },
        elbDown,
        {
          mark: "r53",
          tone: "bad",
          caption: {
            vi: "Khác với Global Accelerator, việc quản lý định tuyến tới instance, ELB và tài nguyên khác trở thành gánh nặng vận hành khi số tài nguyên lên tới hàng trăm. Global Accelerator có sẵn static anycast IP, định tuyến theo hiệu năng toàn cầu và TCP termination tại edge.",
            en: "Unlike Global Accelerator, managing routing to instances, ELBs and other resources becomes an operational burden as they reach the hundreds. Global Accelerator has static anycast IPs, global performance-based routing and TCP termination at the edge built in.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Gánh nặng vận hành lớn hơn Global Accelerator.",
          en: "More operational overhead than Global Accelerator.",
        },
      },
    },
  ],
};

export default spec;
