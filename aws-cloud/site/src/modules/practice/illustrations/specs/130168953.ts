// Practice test 6, question 65: one gateway endpoint each for S3 and DynamoDB, added as route table targets.
// Captions follow the question's explanation and its references:
//   https://docs.aws.amazon.com/vpc/latest/userguide/vpc-endpoints.html
//   https://aws.amazon.com/about-aws/whats-new/2024/03/amazon-dynamodb-aws-privatelink/
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const toS3: StepSpec = {
  flow: ["rt", "gwS3", "s3"],
  badge: { vi: "đọc ảnh", en: "read image" },
  caption: {
    vi: "Route tới S3 có target là gateway endpoint: instance đọc ảnh qua mạng riêng, không cần internet gateway hay NAT.",
    en: "The route to S3 targets the gateway endpoint: instances read images privately, with no internet gateway or NAT.",
  },
};

const notARoute: Bilingual = {
  vi: "Interface endpoint là một network interface có IP riêng trong subnet; ứng dụng kết nối tới nó qua địa chỉ IP riêng, không thêm nó làm target trong route table.",
  en: "An interface endpoint is a network interface with a private IP in the subnet; applications connect to it by private IP address, not by adding it as a route table target.",
};

const spec: IllustrationSpec = {
  questionId: 130168953,
  cols: 4.6,
  rows: 2.75,
  nodes: [
    { id: "ec2", label: "EC2", sub: { vi: "xử lý ảnh", en: "image processing" }, at: [0, 1] },
    { id: "rt", label: "Route table", sub: "private subnet", at: [1.1, 1] },
    { id: "gwS3", label: "Gateway endpoint", sub: "S3", at: [2.3, 0.2] },
    { id: "ifS3", label: "Interface endpoint", sub: "S3", kind: "ghost", at: [2.3, 0.2] },
    { id: "oai", label: "OAI", sub: { vi: "của CloudFront", en: "CloudFront only" }, kind: "ghost", at: [2.3, 0.2] },
    { id: "gwDdb", label: "Gateway endpoint", sub: "DynamoDB", at: [2.3, 1.8] },
    { id: "ifDdb", label: "Interface endpoint", sub: "DynamoDB", kind: "ghost", at: [2.3, 1.8] },
    { id: "s3", label: "Amazon S3", sub: { vi: "ảnh", en: "images" }, kind: "data", at: [3.6, 0.2] },
    { id: "ddb", label: "DynamoDB", sub: { vi: "trạng thái", en: "status table" }, kind: "data", at: [3.6, 1.8] },
  ],
  zones: [{ id: "vpc", label: "Custom VPC", tone: "vpc", from: [0, 0.2], to: [2.3, 1.8], pad: 10 }],
  scenarios: [
    {
      option: "b",
      hide: ["ifS3", "oai", "ifDdb"],
      steps: [
        {
          flow: ["ec2", "rt"],
          caption: {
            vi: "S3 và DynamoDB là hai dịch vụ hỗ trợ gateway endpoint: một gateway được chỉ định làm target của route trong route table.",
            en: "S3 and DynamoDB are the services that support gateway endpoints: a gateway you specify as a route target in the route table.",
          },
        },
        toS3,
        {
          flow: ["rt", "gwDdb", "ddb"],
          badge: "completed",
          caption: {
            vi: "Route thứ hai trỏ tới gateway endpoint của DynamoDB: bản ghi được đánh dấu hoàn tất mà lưu lượng không rời mạng Amazon.",
            en: "A second route targets the DynamoDB gateway endpoint: the record is marked completed without traffic leaving the Amazon network.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Truy cập riêng tư tới cả hai dịch vụ chỉ bằng hai route.",
          en: "Private access to both services with just two routes.",
        },
      },
    },
    {
      option: "a",
      hide: ["ifS3", "oai", "gwDdb"],
      steps: [
        { flow: ["ec2", "rt"], caption: { vi: "Instance gửi lưu lượng theo route table.", en: "Instances send traffic by the route table." } },
        toS3,
        { stop: ["rt", "ifDdb"], caption: notARoute },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "DynamoDB hỗ trợ interface endpoint, nhưng không dùng như target trong route table.",
          en: "DynamoDB supports interface endpoints, but not as route table targets.",
        },
      },
    },
    {
      option: "c",
      hide: ["ifS3", "gwS3", "ifDdb"],
      steps: [
        {
          flow: ["ec2", "rt", "gwDdb", "ddb"],
          caption: {
            vi: "Gateway endpoint cho DynamoDB hoạt động như mong đợi.",
            en: "The DynamoDB gateway endpoint works as intended.",
          },
        },
        {
          stop: ["rt", "oai"],
          caption: {
            vi: "Origin access identity (OAI) dùng trong ngữ cảnh CloudFront để giới hạn truy cập S3; không dùng được để truy cập S3 từ VPC.",
            en: "An origin access identity (OAI) is used with CloudFront to restrict S3 access; it cannot provide access to S3 from a VPC.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không có đường riêng tư tới S3.",
          en: "No private path to S3.",
        },
      },
    },
    {
      option: "d",
      hide: ["gwS3", "oai", "gwDdb"],
      steps: [
        { flow: ["ec2", "rt"], caption: { vi: "Instance gửi lưu lượng theo route table.", en: "Instances send traffic by the route table." } },
        { stop: ["rt", "ifS3"], caption: notARoute },
        {
          stop: ["rt", "ifDdb"],
          caption: {
            vi: "Tương tự với interface endpoint của DynamoDB.",
            en: "The same applies to the DynamoDB interface endpoint.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Interface endpoint không phải target của route table.",
          en: "Interface endpoints are not route table targets.",
        },
      },
    },
  ],
};

export default spec;
