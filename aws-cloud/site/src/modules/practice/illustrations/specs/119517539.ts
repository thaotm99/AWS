// Practice test 5, question 63: an instance reaches the internet only with a route to the internet gateway and a
// network ACL that allows the traffic both ways. Captions follow the question's explanation. Additional sources:
// - A subnet whose route table has a route to an internet gateway is a public subnet; instances need a public IPv4
//   address or Elastic IP: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
// - "NACLs are stateless": https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
// - A subnet not explicitly associated with a route table "is implicitly associated with the main route table":
//   https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const out: StepSpec = {
  flow: ["ec2", "nacl", "rt", "igw", "inet"],
  caption: {
    vi: "Instance có public IP gửi lưu lượng ra; route table của subnet có route 0.0.0.0/0 tới internet gateway.",
    en: "The instance, which has a public IP, sends traffic out; the subnet's route table has a 0.0.0.0/0 route to the internet gateway.",
  },
};
const back: StepSpec = {
  flow: ["inet", "igw", "rt", "nacl", "ec2"],
  back: true,
  caption: {
    vi: "Phản hồi quay về qua internet gateway; network ACL phải cho phép cả chiều vào lẫn chiều ra.",
    en: "Replies come back through the internet gateway; the network ACL must allow traffic in as well as out.",
  },
};
const falseVerdict = (caption: Bilingual) => ({ works: false, caption });

const spec: IllustrationSpec = {
  questionId: 119517539,
  cols: 5,
  rows: 1.6,
  nodes: [
    { id: "ec2", label: "EC2 instance", sub: "public IP", at: [0, 0.5] },
    { id: "nacl", label: "Network ACL", sub: "subnet", at: [1, 0.5] },
    { id: "rt", label: "Route table", sub: "0.0.0.0/0 → igw", at: [2, 0.5] },
    { id: "igw", label: "Internet gateway", at: [3, 0.5] },
    { id: "inet", label: "Internet", kind: "actor", at: [4, 0.5] },
  ],
  zones: [{ id: "vpc", label: "VPC", tone: "vpc", from: [0, 0.5], to: [3, 0.5], pad: 14 }],
  scenarios: [
    {
      option: "b",
      steps: [
        out,
        {
          mark: "nacl",
          tone: "ok",
          badge: { vi: "cho phép vào + ra", en: "allow in + out" },
          caption: {
            vi: "Network ACL là stateless, nên cần rule cho phép lưu lượng cả inbound lẫn outbound của subnet, ví dụ cổng 80 (HTTP) và 443 (HTTPS).",
            en: "Network ACLs are stateless, so the subnet's ACL needs rules allowing both inbound and outbound traffic, for example on ports 80 (HTTP) and 443 (HTTPS).",
          },
        },
        back,
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Một trong hai điều kiện đúng: network ACL cho phép lưu lượng hai chiều.",
          en: "One of the two correct conditions: the network ACL allows traffic both ways.",
        },
      },
    },
    {
      option: "d",
      steps: [
        out,
        {
          mark: "rt",
          tone: "ok",
          badge: { vi: "route tới igw", en: "route to igw" },
          caption: {
            vi: "Route trong route table của subnet hướng lưu lượng tới internet gateway; subnet như vậy được gọi là public subnet.",
            en: "The route in the subnet's route table sends traffic to the internet gateway; such a subnet is called a public subnet.",
          },
        },
        back,
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Một trong hai điều kiện đúng: route table có route tới internet gateway.",
          en: "One of the two correct conditions: the route table has a route to the internet gateway.",
        },
      },
    },
    {
      option: "a",
      steps: [
        {
          mark: "rt",
          tone: "warn",
          badge: { vi: "main (ngầm định)", en: "main (implicit)" },
          caption: {
            vi: "Subnet không thể “không gắn với route table nào”: nếu không gắn tường minh, subnet được gắn ngầm định với main route table.",
            en: "A subnet cannot be “without a route table”: if not explicitly associated, it is implicitly associated with the main route table.",
          },
        },
      ],
      verdict: falseVerdict({ vi: "Subnet luôn gắn với một route table.", en: "A subnet always has a route table." }),
    },
    {
      option: "c",
      steps: [
        {
          mark: "rt",
          tone: "warn",
          badge: { vi: "chỉ một", en: "only one" },
          caption: {
            vi: "Mỗi subnet chỉ gắn với một route table tại một thời điểm, nên không có chuyện nhiều route table xung đột.",
            en: "A subnet is associated with only one route table at a time, so there are no conflicting route tables.",
          },
        },
      ],
      verdict: falseVerdict({ vi: "Mỗi subnet chỉ có một route table.", en: "A subnet has one route table at a time." }),
    },
    {
      option: "e",
      steps: [
        { ...out, tone: "warn" },
        {
          mark: "igw",
          tone: "warn",
          caption: {
            vi: "Public subnet theo định nghĩa có truy cập internet qua internet gateway, nên “public nhưng không có truy cập internet” là mâu thuẫn.",
            en: "A public subnet by definition reaches the internet through the internet gateway, so “public but no internet access” is a contradiction.",
          },
        },
      ],
      verdict: falseVerdict({ vi: "Nhận định tự mâu thuẫn.", en: "The statement contradicts itself." }),
    },
  ],
};

export default spec;
