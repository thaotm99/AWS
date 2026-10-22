// Practice test 4, question 38: cannot ping an EC2 instance with an Elastic IP in a new VPC's public subnet.
// Captions follow the question's explanation (route to the internet gateway, security group must allow ICMP,
// source/destination check, no secondary internet gateway, AWS Support does not map VPCs to subnets).
import type { IllustrationSpec, StepSpec } from "../types";

const ping: StepSpec = {
  flow: ["admin", "igw", "sg", "ec2"],
  badge: "ICMP",
  caption: {
    vi: "Request ping (ICMP) từ internet đi qua internet gateway tới instance có Elastic IP.",
    en: "The ping (ICMP) request from the internet goes through the internet gateway to the instance with the Elastic IP.",
  },
};

const reply: StepSpec = {
  flow: ["ec2", "rt", "igw", "admin"],
  back: true,
  caption: {
    vi: "Phản hồi ra internet theo route trỏ tới internet gateway trong route table của subnet.",
    en: "The reply leaves via the subnet route table's route to the internet gateway.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119516255,
  cols: 4.6,
  rows: 2.4,
  nodes: [
    { id: "admin", label: "Admin", sub: "ping", kind: "actor", at: [0, 1.2] },
    { id: "support", label: "AWS Support", kind: "ghost", at: [0, 0.1] },
    { id: "igw", label: "Internet gateway", at: [1.2, 1.2] },
    { id: "igw2", label: { vi: "IGW thứ hai", en: "Second IGW" }, kind: "ghost", at: [1.2, 0.1] },
    { id: "rt", label: "Route table", sub: "0.0.0.0/0 → igw", at: [2.4, 0.1] },
    { id: "sg", label: "Security group", sub: { vi: "rule ICMP", en: "ICMP rule" }, at: [2.4, 1.2] },
    { id: "ec2", label: "EC2", sub: "Elastic IP", at: [3.6, 1.2] },
  ],
  zones: [{ id: "vpc", label: "VPC · public subnet", tone: "vpc", from: [2.4, 0.1], to: [3.6, 1.2], pad: 14 }],
  links: [["rt", "ec2"], ["admin", "igw"], ["igw", "sg"], ["sg", "ec2"]],
  scenarios: [
    {
      option: "e",
      hide: ["support", "igw2"],
      steps: [
        {
          mark: "rt",
          tone: "warn",
          badge: { vi: "kiểm tra", en: "check" },
          caption: {
            vi: "Gắn internet gateway vào VPC là chưa đủ: route table của subnet phải có route đưa lưu lượng ra internet tới internet gateway.",
            en: "Attaching the internet gateway is not enough: the subnet's route table must have a route sending internet-bound traffic to it.",
          },
        },
        ping,
        reply,
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Sau khi tạo IGW, phải cập nhật route table.",
          en: "After creating the IGW, the route tables must be updated.",
        },
      },
    },
    {
      option: "b",
      hide: ["support", "igw2"],
      steps: [
        {
          stop: ["igw", "sg"],
          badge: { vi: "chặn ICMP", en: "ICMP blocked" },
          caption: {
            vi: "Security group chỉ có rule cho phép (không có rule từ chối); nếu không có rule cho phép ICMP từ nguồn, request ping bị loại bỏ.",
            en: "Security group rules only allow traffic (there are no deny rules); without a rule allowing ICMP from the source, the ping is dropped.",
          },
        },
        {
          mark: "sg",
          tone: "ok",
          badge: "ICMP ✓",
          caption: {
            vi: "Thêm rule cho phép ping từ nguồn; security group có tính stateful nên phản hồi được tự động cho phép.",
            en: "A rule allowing ping from the source is added; security groups are stateful, so the reply is allowed automatically.",
          },
        },
        ping,
        reply,
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Security group phải cho phép giao thức ICMP cho request ping.",
          en: "The security group must allow ICMP for ping requests.",
        },
      },
    },
    {
      option: "a",
      hide: ["support", "igw2"],
      steps: [
        {
          mark: "ec2",
          tone: "warn",
          badge: "src/dst check",
          caption: {
            vi: "Tắt source/destination check cho phép instance xử lý lưu lượng không gửi tới chính nó, dùng cho NAT, router hay firewall.",
            en: "Disabling source/destination check lets an instance handle traffic not addressed to it, as NAT, routing or firewall instances do.",
          },
        },
        {
          mark: "ec2",
          tone: "bad",
          caption: {
            vi: "Ping tới Elastic IP của instance là lưu lượng gửi tới chính nó, nên thuộc tính này không liên quan.",
            en: "A ping to the instance's own Elastic IP is addressed to it, so this attribute is not relevant.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không liên quan tới ping.", en: "Unrelated to the ping." },
      },
    },
    {
      option: "c",
      hide: ["igw2"],
      steps: [
        {
          stop: ["admin", "support"],
          caption: {
            vi: "Không có thao tác nào như liên hệ AWS Support để “map VPC với subnet”.",
            en: "There is no such thing as contacting AWS Support to map a VPC with a subnet.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không phải một bước khắc phục.", en: "Not a troubleshooting step." },
      },
    },
    {
      option: "d",
      hide: ["support"],
      steps: [
        {
          stop: ["rt", "igw2"],
          caption: {
            vi: "Không tồn tại “secondary internet gateway”; đây là phương án gây nhiễu.",
            en: "There is no such thing as a secondary internet gateway; this option is a distractor.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Thành phần không tồn tại.", en: "It does not exist." },
      },
    },
  ],
};

export default spec;
