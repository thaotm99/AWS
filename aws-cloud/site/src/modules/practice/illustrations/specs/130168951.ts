// Practice test 6, question 64: a gateway VPC endpoint for S3 keeps the private application's S3 traffic off the
// internet at no extra charge. Captions follow the question's explanation and its references:
//   https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
//   https://docs.aws.amazon.com/AmazonS3/latest/userguide/privatelink-interface-endpoints.html#types-of-vpc-endpoints-for-s3
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168951,
  cols: 4.6,
  rows: 3,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, sub: "private subnet", at: [0, 1.2] },
    { id: "gwe", label: "Gateway endpoint", sub: "route table", at: [1.5, 1.2] },
    { id: "ife", label: "Interface endpoint", sub: "ENI · PrivateLink", at: [1.5, 1.2] },
    { id: "nat", label: "NAT gateway", sub: "Elastic IP", at: [1.1, 0.1] },
    { id: "igw", label: "Internet gateway", at: [2.3, 0.1] },
    { id: "proxy", label: { vi: "EC2 proxy", en: "EC2 proxy" }, sub: { vi: "VPC peering", en: "peered VPC" }, at: [1.5, 2.3] },
    { id: "s3", label: "Amazon S3", sub: { vi: "báo cáo y tế", en: "medical reports" }, kind: "data", at: [3.6, 1.2] },
  ],
  zones: [{ id: "vpc", label: "VPC", tone: "vpc", from: [0, 0.1], to: [2.3, 1.2], pad: 10 }],
  scenarios: [
    {
      option: "c",
      hide: ["ife", "proxy"],
      steps: [
        {
          flow: ["app", "gwe"],
          badge: "S3 prefix list",
          caption: {
            vi: "Route table của private subnet có route cho lưu lượng S3 với target là gateway endpoint.",
            en: "The private subnet's route table has a route for S3 traffic whose target is the gateway endpoint.",
          },
        },
        {
          flow: ["gwe", "s3"],
          caption: {
            vi: "Lưu lượng tới S3 đi trong mạng riêng của AWS, không qua NAT gateway hay internet gateway, đúng chính sách tuân thủ.",
            en: "S3 traffic stays on the AWS private network, bypassing the NAT gateway and internet gateway, as the compliance policy requires.",
          },
        },
        {
          mark: "gwe",
          tone: "ok",
          badge: "$0",
          caption: {
            vi: "Gateway endpoint không tính phí theo giờ hay theo GB dữ liệu xử lý.",
            en: "Gateway endpoints have no hourly or per-GB data processing charges.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Tuân thủ chính sách và tiết kiệm chi phí nhất.",
          en: "Compliant and the most cost-effective.",
        },
      },
    },
    {
      option: "a",
      hide: ["gwe", "proxy"],
      steps: [
        {
          flow: ["app", "ife", "s3"],
          caption: {
            vi: "Interface endpoint (PrivateLink) cũng giữ lưu lượng S3 trong mạng riêng.",
            en: "An interface endpoint (PrivateLink) also keeps S3 traffic private.",
          },
        },
        {
          mark: "ife",
          tone: "warn",
          badge: "$/h + $/GB",
          caption: {
            vi: "Nhưng interface endpoint cho S3 tính phí theo giờ và theo GB dữ liệu xử lý, trong khi gateway endpoint thì không.",
            en: "But an S3 interface endpoint has hourly and per-GB data processing charges, while a gateway endpoint does not.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Tuân thủ nhưng không tiết kiệm nhất.",
          en: "Compliant, but not the most cost-effective.",
        },
      },
    },
    {
      option: "b",
      hide: ["gwe", "ife", "proxy"],
      steps: [
        {
          flow: ["app", "nat", "igw", "s3"],
          tone: "bad",
          badge: "internet",
          caption: {
            vi: "Bucket policy chỉ giới hạn nguồn request theo Elastic IP của NAT gateway; lưu lượng S3 vẫn đi qua internet.",
            en: "The bucket policy only limits requests to the NAT gateway's Elastic IP; S3 traffic still traverses the internet.",
          },
        },
        {
          mark: "nat",
          tone: "bad",
          badge: "$/GB",
          caption: {
            vi: "Đồng thời phát sinh phí xử lý dữ liệu của NAT gateway.",
            en: "It also incurs NAT gateway data processing charges.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Vi phạm chính sách cấm lưu lượng qua internet.",
          en: "It breaks the no-internet policy.",
        },
      },
    },
    {
      option: "d",
      hide: ["gwe", "ife"],
      steps: [
        {
          flow: ["app", "proxy", "s3"],
          tone: "warn",
          caption: {
            vi: "Request S3 được chuyển qua EC2 proxy trong một VPC khác, kết nối bằng VPC peering. VPC peering không hỗ trợ định tuyến bắc cầu, nên phải tự quản lý các proxy này.",
            en: "S3 requests are forwarded through EC2 proxies in another VPC connected by VPC peering. VPC peering does not support transitive routing, so these proxies have to be managed.",
          },
        },
        {
          mark: "proxy",
          tone: "bad",
          caption: {
            vi: "Thêm độ trễ, điểm nghẽn và chi phí vận hành EC2.",
            en: "It adds latency, bottlenecks and EC2 operating cost.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Phức tạp và tốn kém.",
          en: "Complex and expensive.",
        },
      },
    },
  ],
};

export default spec;
