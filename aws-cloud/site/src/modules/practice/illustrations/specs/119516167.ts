// Practice test 2, question 30: block one malicious IP with an AWS WAF IP match condition on CloudFront.
// Captions follow the question's explanation.
import type { Bilingual, FlowStepSpec, IllustrationSpec, ScenarioSpec } from "../types";

const attack: FlowStepSpec = {
  flow: ["attacker", "cf", "alb", "ec2"],
  tone: "bad",
  times: 3,
  caption: {
    vi: "Request từ IP độc hại vẫn đi qua CloudFront và ALB tới các EC2 instance.",
    en: "Requests from the malicious IP still pass through CloudFront and the ALB to the EC2 instances.",
  },
};

const noEffect = (option: string, badge: Bilingual, caption: Bilingual, verdict: Bilingual): ScenarioSpec => ({
  option,
  hide: ["user"],
  steps: [attack, { mark: "ec2", tone: "bad", badge, caption }],
  verdict: { works: false, caption: verdict },
});

const spec: IllustrationSpec = {
  questionId: 119516167,
  cols: 4.2,
  rows: 2.4,
  nodes: [
    { id: "attacker", label: { vi: "IP độc hại", en: "Malicious IP" }, kind: "actor", at: [0, 0] },
    { id: "user", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 1.4] },
    { id: "cf", label: "CloudFront", sub: "AWS WAF", at: [1.1, 0.7] },
    { id: "alb", label: "Application LB", sub: "custom origin", at: [2.15, 0.7] },
    { id: "ec2", label: "EC2 instances", sub: { vi: "dữ liệu nhạy cảm", en: "sensitive data" }, kind: "data", at: [3.2, 0.7] },
  ],
  scenarios: [
    {
      option: "c",
      steps: [
        {
          stop: ["attacker", "cf"],
          badge: "IP match",
          caption: {
            vi: "AWS WAF gắn với CloudFront distribution kiểm soát cách lưu lượng tới ứng dụng; IP match condition liệt kê địa chỉ IP nguồn để chặn, nên request từ IP độc hại bị chặn ngay tại CloudFront.",
            en: "AWS WAF on the CloudFront distribution controls how traffic reaches the application; an IP match condition lists the source IPs to block, so requests from the malicious IP are blocked at CloudFront.",
          },
        },
        {
          flow: ["user", "cf", "alb", "ec2"],
          caption: {
            vi: "Request từ các địa chỉ IP khác tiếp tục tới ALB và EC2 như bình thường.",
            en: "Requests from other IP addresses continue to the ALB and EC2 as usual.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Chặn tại biên, trước khi tới ứng dụng.", en: "Blocked at the edge, before the application." } },
    },
    noEffect(
      "a",
      { vi: "NACL không gắn với instance", en: "NACLs are not per-instance" },
      {
        vi: "Network ACL không được gắn với instance, nên không thể tạo deny rule trong network ACL \"của từng instance\" như phương án mô tả.",
        en: "Network ACLs are not associated with instances, so a deny rule in the network ACL \"of each instance\" cannot be created as described.",
      },
      { vi: "NACL không gắn với instance.", en: "NACLs are not associated with instances." },
    ),
    noEffect(
      "b",
      { vi: "SG không có deny", en: "no deny in SGs" },
      {
        vi: "Security group không có rule từ chối; mọi rule đều là cho phép, nên không thể chặn riêng một IP bằng security group.",
        en: "Security groups have no deny rules; every rule is an allow, so one IP cannot be blocked with a security group.",
      },
      { vi: "Security group không có deny rule.", en: "Security groups cannot deny." },
    ),
    noEffect(
      "d",
      { vi: "trách nhiệm của bạn", en: "your responsibility" },
      {
        vi: "Bảo mật ứng dụng là trách nhiệm của khách hàng, không phải của AWS, nên mở ticket với AWS Support không ngăn được tấn công.",
        en: "Securing the application is the customer's responsibility, not AWS's, so a ticket with AWS Support does not stop the attacks.",
      },
      { vi: "Bảo mật ứng dụng là việc của bạn.", en: "Application security is your job." },
    ),
  ],
};

export default spec;
