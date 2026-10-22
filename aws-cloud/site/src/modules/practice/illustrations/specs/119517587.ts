// Practice test 5, question 24: a gateway VPC endpoint keeps EC2 → S3 uploads off the public S3 endpoint.
// Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const today: StepSpec = {
  flow: ["ec2", "igw", "inet", "s3"],
  tone: "warn",
  badge: { vi: "endpoint công khai", en: "public endpoint" },
  caption: {
    vi: "Hiện tại, file được tải lên qua internet tới endpoint công khai của S3.",
    en: "Today the files are uploaded over the internet to S3's public endpoint.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119517587,
  cols: 4.4,
  rows: 3.1,
  nodes: [
    { id: "ec2", label: "EC2 instance", sub: "public subnet", at: [0, 1.1] },
    { id: "gwe", label: "Gateway endpoint", sub: "Amazon S3", at: [1.3, 1.1] },
    { id: "nat", label: "NAT gateway", at: [1.3, 1.1] },
    { id: "igw", label: "Internet gateway", at: [1.3, 0.05] },
    { id: "inet", label: "Internet", kind: "ghost", at: [2.5, 0.05] },
    { id: "ap", label: "S3 Access Point", sub: "alias", at: [2.5, 1.1] },
    { id: "onprem", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, kind: "onprem", at: [0, 2.3] },
    { id: "dx", label: "Direct Connect", at: [1.3, 2.3] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [3.4, 1.1] },
  ],
  zones: [{ id: "vpc", label: "VPC", tone: "vpc", from: [0, 0.05], to: [1.3, 1.1], pad: 10 }],
  scenarios: [
    {
      option: "a",
      hide: ["nat", "ap", "onprem", "dx"],
      steps: [
        today,
        {
          flow: ["ec2", "gwe", "s3"],
          caption: {
            vi: "Với gateway VPC endpoint và route trong route table của subnet, lưu lượng tới S3 đi qua endpoint trong mạng nội bộ AWS, không qua internet gateway hay NAT.",
            en: "With a gateway VPC endpoint and a route in the subnet's route table, S3 traffic goes through the endpoint inside the AWS network, without an internet gateway or NAT.",
          },
        },
        {
          mark: "gwe",
          tone: "ok",
          badge: { vi: "miễn phí", en: "no charge" },
          caption: {
            vi: "IAM policy hoặc bucket policy có thể giới hạn chỉ cho phép truy cập qua endpoint. Gateway endpoint không tính thêm phí và ứng dụng không cần thay đổi.",
            en: "IAM or bucket policies can allow access only through the endpoint. Gateway endpoints have no additional charge, and the application needs no change.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Tải lên private, không dùng endpoint công khai của S3.",
          en: "Private uploads that avoid the public S3 endpoint.",
        },
      },
    },
    {
      option: "b",
      hide: ["gwe", "nat", "onprem", "dx"],
      steps: [
        {
          flow: ["ec2", "igw", "inet", "ap", "s3"],
          tone: "bad",
          caption: {
            vi: "S3 access point giúp quản lý quyền truy cập bucket dùng chung, nhưng không thay đổi đường mạng; không có VPC endpoint thì lưu lượng vẫn đi qua internet công cộng.",
            en: "S3 access points simplify access to shared buckets but do not change the network path; without a VPC endpoint, traffic still crosses the public internet.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Vẫn đi qua internet công cộng.", en: "Still over the public internet." },
      },
    },
    {
      option: "c",
      hide: ["gwe", "ap", "onprem", "dx"],
      steps: [
        {
          flow: ["ec2", "nat", "igw", "inet", "s3"],
          tone: "bad",
          caption: {
            vi: "NAT gateway định tuyến lưu lượng ra internet, không tạo truy cập private tới S3: lưu lượng vẫn dùng endpoint công khai và phát sinh phí truyền dữ liệu.",
            en: "A NAT gateway routes traffic to the internet and gives no private access to S3: traffic still uses public endpoints and incurs data transfer charges.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Vẫn dùng endpoint công khai của S3.", en: "Still uses the public S3 endpoint." },
      },
    },
    {
      option: "d",
      hide: ["gwe", "nat", "ap"],
      steps: [
        {
          flow: ["onprem", "dx", "s3"],
          tone: "warn",
          caption: {
            vi: "Direct Connect phù hợp cho lưu lượng hybrid từ on-premises tới AWS, với thông lượng cao và độ trễ thấp.",
            en: "Direct Connect suits high-throughput, low-latency hybrid traffic from on-premises to AWS.",
          },
        },
        today,
        {
          mark: "dx",
          tone: "bad",
          badge: { vi: "không cần thiết", en: "unnecessary" },
          caption: {
            vi: "Ở đây lưu lượng cần bảo vệ là giữa EC2 và S3, đều nằm trong AWS, nên một đường Direct Connect riêng là không cần thiết cho trường hợp này.",
            en: "The traffic to protect here runs between EC2 and S3, both inside AWS, so a dedicated Direct Connect link is unnecessary for this use case.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Direct Connect dành cho kết nối on-premises, không dùng cho EC2 tới S3.",
          en: "Direct Connect is for on-premises links, not EC2 to S3.",
        },
      },
    },
  ],
};

export default spec;
