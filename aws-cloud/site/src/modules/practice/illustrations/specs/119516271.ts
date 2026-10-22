// Practice test 4, question 23: which services support gateway VPC endpoints (Amazon S3 and Amazon DynamoDB).
// Captions follow the question's explanation (a gateway endpoint is a route table target; an interface endpoint is
// an ENI with a private IP in the subnet; S3 supports both types; the other services use interface endpoints).
import type { IllustrationSpec, ScenarioSpec } from "../types";

const all = ["s3", "ddb", "sqs", "sns", "kin"];

function gateway(option: string, svc: string, name: string): ScenarioSpec {
  return {
    option,
    hide: ["ife", ...all.filter((s) => s !== svc)],
    steps: [
      {
        flow: ["ec2", "rt"],
        caption: {
          vi: `EC2 instance trong private subnet gửi request tới ${name}; route table của subnet có route lấy gateway endpoint làm target.`,
          en: `The EC2 instance in the private subnet calls ${name}; the subnet's route table has a route whose target is the gateway endpoint.`,
        },
      },
      {
        flow: ["rt", "gwe", svc],
        badge: "Gateway",
        caption: {
          vi: `Lưu lượng đi qua gateway endpoint tới ${name} mà không cần internet gateway hay NAT, và không rời khỏi mạng Amazon.`,
          en: `Traffic reaches ${name} through the gateway endpoint without an internet gateway or NAT device, and never leaves the Amazon network.`,
        },
      },
    ],
    verdict: {
      works: true,
      caption: {
        vi: `${name} hỗ trợ gateway endpoint; Amazon S3 và Amazon DynamoDB là hai dịch vụ hỗ trợ loại endpoint này.`,
        en: `${name} supports gateway endpoints; Amazon S3 and Amazon DynamoDB are the two services that do.`,
      },
    },
  };
}

function iface(option: string, svc: string, name: string): ScenarioSpec {
  return {
    option,
    hide: ["rt", ...all.filter((s) => s !== svc)],
    steps: [
      {
        flow: ["ec2", "ife", svc],
        badge: "Interface",
        caption: {
          vi: `${name} được truy cập riêng tư qua interface endpoint: một Elastic Network Interface có private IP trong subnet.`,
          en: `${name} is reached privately through an interface endpoint: an elastic network interface with a private IP address in the subnet.`,
        },
      },
      {
        mark: "gwe",
        tone: "bad",
        badge: { vi: "không hỗ trợ", en: "not supported" },
        caption: {
          vi: `${name} không có gateway endpoint; chỉ Amazon S3 và Amazon DynamoDB hỗ trợ loại endpoint này.`,
          en: `${name} has no gateway endpoint; only Amazon S3 and Amazon DynamoDB support that type.`,
        },
      },
    ],
    verdict: {
      works: false,
      caption: { vi: `${name} dùng interface endpoint.`, en: `${name} uses interface endpoints.` },
    },
  };
}

const spec: IllustrationSpec = {
  questionId: 119516271,
  cols: 4.5,
  rows: 2.75,
  nodes: [
    { id: "ec2", label: "EC2", sub: "private subnet", at: [0, 1] },
    { id: "rt", label: "Route table", sub: "→ vpce", at: [1.15, 0.25] },
    { id: "gwe", label: "Gateway endpoint", at: [2.3, 0.25] },
    { id: "ife", label: "Interface endpoint", sub: "ENI · private IP", at: [1.15, 1.75] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [3.5, 1] },
    { id: "ddb", label: "Amazon DynamoDB", kind: "data", at: [3.5, 1] },
    { id: "sqs", label: "Amazon SQS", at: [3.5, 1] },
    { id: "sns", label: "Amazon SNS", at: [3.5, 1] },
    { id: "kin", label: "Amazon Kinesis", at: [3.5, 1] },
  ],
  zones: [{ id: "vpc", label: "VPC", tone: "vpc", from: [0, 0.25], to: [2.3, 1.75], pad: 12 }],
  scenarios: [
    gateway("c", "ddb", "Amazon DynamoDB"),
    gateway("d", "s3", "Amazon S3"),
    iface("a", "sqs", "Amazon SQS"),
    iface("b", "sns", "Amazon SNS"),
    iface("e", "kin", "Amazon Kinesis"),
  ],
};

export default spec;
