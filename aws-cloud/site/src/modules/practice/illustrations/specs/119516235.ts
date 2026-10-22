// Practice test 4, question 52: allow only the Application Load Balancer to reach the instances by referencing its
// security group. The question's explanation says "only the Auto Scaling group" where the load balancer is meant; the
// captions follow the AWS documentation instead:
// - Security group referencing: "When you specify a security group as the source or destination for a rule, the rule
//   affects all instances that are associated with the security groups":
//   https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
// - Recommended instance rule: inbound from the load balancer's security group:
//   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-update-security-groups.html
// - Security group rules are always permissive (explanation):
//   https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-security-groups.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516235,
  cols: 4,
  rows: 2.6,
  nodes: [
    { id: "user", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 1.6] },
    { id: "alb", label: "Application LB", sub: "sg-alb", at: [1.4, 1.6] },
    { id: "hostA", label: { vi: "Tài nguyên khác", en: "Other resource" }, sub: "10.0.1.x", kind: "ghost", at: [1.4, 0.3] },
    { id: "ec2", label: "EC2 instances", sub: "sg-web · ASG", at: [2.9, 1.6] },
    { id: "hostB", label: { vi: "Host khác", en: "Other host" }, sub: "10.0.4.x", kind: "ghost", at: [2.9, 0.3] },
  ],
  zones: [
    { id: "subA", label: "10.0.1.0/24", tone: "group", from: [1.4, 0.3], to: [1.4, 1.6], pad: 14 },
    { id: "subB", label: "10.0.4.0/22", tone: "group", from: [2.9, 0.3], to: [2.9, 1.6], pad: 14 },
  ],
  links: [["user", "alb"]],
  scenarios: [
    {
      option: "a",
      hide: ["hostB"],
      steps: [
        {
          flow: ["user", "alb", "ec2"],
          badge: "sg-alb ✓",
          caption: {
            vi: "Security group của instance có rule inbound lấy security group của ALB làm nguồn: lưu lượng từ các network interface gắn với sg-alb được cho phép.",
            en: "The instances' security group has an inbound rule whose source is the ALB's security group: traffic from network interfaces associated with sg-alb is allowed.",
          },
        },
        {
          stop: ["hostA", "ec2"],
          caption: {
            vi: "Tài nguyên khác, kể cả nằm cùng subnet với ALB, không gắn với sg-alb nên không khớp rule nào và bị chặn.",
            en: "Any other resource, even one in the ALB's subnet, is not associated with sg-alb, matches no rule and is blocked.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Chỉ lưu lượng từ Application Load Balancer tới được instance.",
          en: "Only traffic from the Application Load Balancer reaches the instances.",
        },
      },
    },
    {
      option: "d",
      hide: ["hostB"],
      steps: [
        {
          flow: ["user", "alb", "ec2"],
          badge: "10.0.1.0/24",
          caption: {
            vi: "Cho phép CIDR 10.0.1.0/24, subnet của ALB, thì lưu lượng từ ALB vẫn tới được instance.",
            en: "Allowing CIDR 10.0.1.0/24, the ALB's subnet, lets the ALB's traffic reach the instances.",
          },
        },
        {
          flow: ["hostA", "ec2"],
          tone: "warn",
          caption: {
            vi: "Nhưng mọi tài nguyên khác trong subnet đó cũng được phép, nên không đảm bảo chỉ ALB truy cập được instance.",
            en: "But every other resource in that subnet is allowed too, so it does not guarantee that only the ALB can reach the instances.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Rộng hơn mức cần thiết.", en: "Broader than needed." },
      },
    },
    {
      option: "b",
      hide: ["hostA"],
      steps: [
        {
          stop: ["alb", "ec2"],
          badge: "10.0.4.0/22",
          caption: {
            vi: "10.0.4.0/22 là subnet của chính các instance; ALB nằm trong 10.0.1.0/24 nên lưu lượng của nó không khớp rule.",
            en: "10.0.4.0/22 is the instances' own subnet; the ALB sits in 10.0.1.0/24, so its traffic does not match the rule.",
          },
        },
        {
          flow: ["hostB", "ec2"],
          tone: "warn",
          caption: {
            vi: "Ngược lại, rule này cho phép các host trong subnet của instance.",
            en: "Instead, the rule allows hosts in the instances' own subnet.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Sai nguồn lưu lượng.", en: "Wrong traffic source." },
      },
    },
    {
      option: "c",
      hide: ["hostA", "hostB"],
      steps: [
        {
          stop: ["alb", "ec2"],
          badge: "sg-web",
          caption: {
            vi: "Rule lấy security group mà chính các instance trong Auto Scaling group đang dùng làm nguồn chỉ cho phép lưu lượng từ các instance đó; ALB không gắn với security group này nên bị chặn.",
            en: "A rule whose source is the security group the Auto Scaling group's instances use only allows traffic from those instances; the ALB is not associated with it, so it is blocked.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Nguồn cần cho phép là security group của ALB.",
          en: "The source to allow is the ALB's security group.",
        },
      },
    },
  ],
};

export default spec;
