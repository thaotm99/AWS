// Practice test 5, question 45: AWS WAF geo match blocks countries; an IP set rule lets the remote team through.
// Captions follow the question's explanation. Additional sources:
// - AWS WAF evaluates rules from the lowest numeric priority up until a match terminates the evaluation:
//   https://docs.aws.amazon.com/waf/latest/developerguide/web-acl-processing-order.html
// - Block action: "By default, your protected AWS resource responds with an HTTP 403 (Forbidden) status code."
//   https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-action.html
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const users = { vi: "Người dùng", en: "Users" };
const allowed: StepSpec = {
  flow: ["other", "waf", "alb", "ec2"],
  caption: {
    vi: "AWS WAF gắn với ALB; request từ các quốc gia không bị chặn đi qua ALB tới EC2.",
    en: "AWS WAF sits on the ALB; requests from countries that are not blocked pass through the ALB to EC2.",
  },
};
const geoBlock: StepSpec = {
  stop: ["blocked", "waf"],
  badge: "403",
  caption: {
    vi: "Geo match statement liệt kê các quốc gia cần chặn; request từ đó bị AWS WAF chặn trước khi tới ALB.",
    en: "A geo match statement lists the countries to block; their requests are blocked by AWS WAF before reaching the ALB.",
  },
};
const ipAllow: StepSpec = {
  flow: ["devs", "waf", "alb", "ec2"],
  caption: {
    vi: "IP set statement chứa địa chỉ IP của nhóm phát triển và cho phép đi tiếp. Rule này có priority thấp hơn nên được đánh giá trước; khi khớp, việc đánh giá dừng lại và geo rule không chặn nhóm.",
    en: "An IP set statement holds the dev team's IP addresses and allows them. It has the lower priority number, so it is evaluated first; once it matches, evaluation stops and the geo rule never blocks them.",
  },
};
const albCannot = (caption: Bilingual): StepSpec[] => [
  {
    flow: ["blocked", "alb", "ec2"],
    tone: "bad",
    caption,
  },
  {
    mark: "alb",
    tone: "bad",
    badge: { vi: "không có rule này", en: "no such rule" },
    caption: {
      vi: "Application Load Balancer định tuyến request theo nội dung ở layer 7; bản thân nó không chặn hay cho phép lưu lượng theo vị trí địa lý hoặc theo IP.",
      en: "An Application Load Balancer routes requests by content at layer 7; it cannot itself block or allow traffic by geography or by IP.",
    },
  },
];
const albVerdict = {
  works: false,
  caption: { vi: "ALB không có geo match hay IP set statement.", en: "An ALB has no geo match or IP set statement." } as Bilingual,
};

const spec: IllustrationSpec = {
  questionId: 119517503,
  cols: 4.45,
  rows: 2.6,
  nodes: [
    { id: "devs", label: { vi: "Nhóm phát triển", en: "Dev team" }, sub: { vi: "ở quốc gia bị chặn", en: "in a blocked country" }, kind: "actor", at: [0, 0.1] },
    { id: "other", label: users, sub: { vi: "quốc gia khác", en: "other countries" }, kind: "actor", at: [0, 1.05] },
    { id: "blocked", label: users, sub: { vi: "quốc gia bị chặn", en: "blocked countries" }, kind: "actor", at: [0, 2] },
    { id: "waf", label: "AWS WAF", sub: "web ACL", at: [1.3, 1.05] },
    { id: "alb", label: "Application LB", at: [2.3, 1.05] },
    { id: "ec2", label: "EC2", sub: "instances", kind: "data", at: [3.3, 1.05] },
  ],
  zones: [{ id: "subnet", label: "subnet · network ACL", tone: "vpc", from: [3.3, 1.05], to: [3.3, 1.05], pad: 26 }],
  scenarios: [
    {
      option: "d",
      hide: ["subnet"],
      steps: [
        allowed,
        geoBlock,
        {
          stop: ["devs", "waf"],
          caption: {
            vi: "Chỉ có geo match thì nhóm phát triển, vốn ở một quốc gia bị chặn, cũng bị chặn; vì vậy cần kết hợp thêm IP set statement.",
            en: "With the geo match alone, the dev team, being in a blocked country, is blocked too; that is why it is combined with an IP set statement.",
          },
        },
        ipAllow,
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Một trong hai lựa chọn đúng: geo match chặn các quốc gia, kết hợp với IP set.",
          en: "One of the two correct choices: geo match blocks the countries, combined with the IP set.",
        },
      },
    },
    {
      option: "e",
      hide: ["subnet"],
      steps: [ipAllow, allowed, geoBlock],
      verdict: {
        works: true,
        caption: {
          vi: "Một trong hai lựa chọn đúng: IP set cho nhóm phát triển đi qua, kết hợp với geo match.",
          en: "One of the two correct choices: the IP set lets the dev team through, combined with geo match.",
        },
      },
    },
    {
      option: "a",
      hide: ["waf"],
      steps: [
        {
          flow: ["blocked", "alb", "ec2"],
          tone: "bad",
          badge: "NACL",
          caption: {
            vi: "Network ACL là lớp bảo mật tuỳ chọn kiểm soát lưu lượng ra vào subnet, nhưng không có khả năng chặn lưu lượng theo điều kiện địa lý.",
            en: "A network ACL is an optional layer of security controlling traffic in and out of subnets, but it cannot block traffic by geographic match conditions.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Network ACL không lọc theo quốc gia.", en: "A network ACL cannot filter by country." },
      },
    },
    {
      option: "b",
      hide: ["waf", "subnet"],
      steps: albCannot({
        vi: "Không có “geo match statement của ALB”; request từ các quốc gia cần chặn vẫn tới ứng dụng.",
        en: "There is no “ALB geo match statement”; requests from the blocked countries still reach the app.",
      }),
      verdict: albVerdict,
    },
    {
      option: "c",
      hide: ["waf", "subnet"],
      steps: albCannot({
        vi: "Không có “IP set statement của ALB”, và cũng không có gì chặn các quốc gia cần chặn.",
        en: "There is no “ALB IP set statement”, and nothing blocks the countries either.",
      }),
      verdict: albVerdict,
    },
  ],
};

export default spec;
