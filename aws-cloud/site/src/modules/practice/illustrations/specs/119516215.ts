// Practice test 4, question 40: several HTTPS domains on one Application Load Balancer with SNI.
// Captions follow the question's explanation (multiple certificates on one secure listener, wildcard certificates
// only cover related subdomains, redirects and security policies do not add endpoints). Additional source:
// - "A security policy is a combination of protocols and ciphers":
//   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/describe-ssl-policies.html
import type { IllustrationSpec, StepSpec } from "../types";

const clients = ["c1", "c2", "c3"];
const route: StepSpec = {
  flow: [["alb", "tg1"], ["alb", "tg2"], ["alb", "tg3"]],
  caption: {
    vi: "Sau khi kết thúc TLS, ALB chuyển từng request tới target group tương ứng với URL.",
    en: "After terminating TLS, the ALB forwards each request to the target group for its URL.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119516215,
  cols: 4.3,
  rows: 3,
  nodes: [
    { id: "c1", label: "Client", sub: "checkout.mycorp.com", kind: "actor", at: [0, 0.2] },
    { id: "c2", label: "Client", sub: "www.mycorp.com", kind: "actor", at: [0, 1.2] },
    { id: "c3", label: "Client", sub: "yourcorp.com/…", kind: "actor", at: [0, 2.2] },
    { id: "alb", label: "Application LB", sub: "HTTPS listener", at: [1.6, 1.2] },
    { id: "certs", label: "Certificates", sub: "mycorp · yourcorp", kind: "data", at: [1.6, 0.1] },
    { id: "wild", label: "Wildcard cert", sub: "*.mycorp.com", kind: "data", at: [1.6, 0.1] },
    { id: "tg1", label: "Target group", sub: "checkout", at: [3.2, 0.2] },
    { id: "tg2", label: "Target group", sub: "www", at: [3.2, 1.2] },
    { id: "tg3", label: "Target group", sub: "profile · search", at: [3.2, 2.2] },
  ],
  links: [
    ["c1", "alb"],
    ["c2", "alb"],
    ["c3", "alb"],
  ],
  scenarios: [
    {
      option: "a",
      hide: ["wild"],
      steps: [
        {
          flow: ["certs", "alb"],
          badge: "SNI",
          caption: {
            vi: "Gắn nhiều chứng chỉ, mỗi domain một chứng chỉ, vào cùng một secure listener của load balancer.",
            en: "Several certificates, one per domain, are bound to the same secure listener of the load balancer.",
          },
        },
        {
          flow: clients.map((c) => [c, "alb"]),
          caption: {
            vi: "Với mỗi client, ALB tự động chọn chứng chỉ TLS phù hợp nhờ Server Name Indication (SNI).",
            en: "For each client, the ALB automatically chooses the right TLS certificate using Server Name Indication (SNI).",
          },
        },
        route,
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Mọi URL đều là HTTPS trên cùng một load balancer, với ít cấu hình nhất.",
          en: "Every URL is HTTPS on the same load balancer with minimal configuration.",
        },
      },
    },
    {
      option: "b",
      hide: ["certs"],
      steps: [
        {
          flow: [["wild", "alb"], ["c1", "alb"], ["c2", "alb"]],
          tone: "warn",
          badge: "*.mycorp.com",
          caption: {
            vi: "Wildcard certificate chỉ dùng được cho các subdomain liên quan khớp một mẫu, như checkout.mycorp.com và www.mycorp.com.",
            en: "A wildcard certificate only works for related subdomains matching a simple pattern, such as checkout.mycorp.com and www.mycorp.com.",
          },
        },
        {
          stop: ["c3", "alb"],
          badge: "yourcorp.com",
          caption: {
            vi: "yourcorp.com là domain khác, nên wildcard certificate của mycorp.com không bảo vệ được.",
            en: "yourcorp.com is a different domain, so the mycorp.com wildcard certificate cannot cover it.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Wildcard không bao được nhiều domain.", en: "A wildcard cannot cover different domains." },
      },
    },
    {
      option: "c",
      hide: ["certs", "wild"],
      steps: [
        {
          flow: clients.map((c) => [c, "alb"]),
          tone: "warn",
          badge: "HTTP → HTTPS",
          caption: {
            vi: "Redirect HTTP sang HTTPS chỉ chuyển hướng request.",
            en: "An HTTP to HTTPS redirect only redirects the requests.",
          },
        },
        {
          mark: "alb",
          tone: "bad",
          caption: {
            vi: "Redirect không cung cấp nhiều HTTPS endpoint cho các URL khác nhau như checkout.mycorp.com hay www.mycorp.com.",
            en: "A redirect does not provide multiple secure endpoints for different URLs such as checkout.mycorp.com or www.mycorp.com.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không có chứng chỉ cho từng domain.", en: "No certificate per domain." },
      },
    },
    {
      option: "d",
      hide: ["certs", "wild"],
      steps: [
        {
          mark: "alb",
          tone: "warn",
          badge: "security policy",
          caption: {
            vi: "SSL security policy là tổ hợp giao thức và cipher dùng để thương lượng kết nối SSL giữa client và load balancer.",
            en: "An SSL security policy is a combination of protocols and ciphers used to negotiate SSL connections between clients and the load balancer.",
          },
        },
        {
          mark: "alb",
          tone: "bad",
          caption: {
            vi: "Đổi security policy không tạo ra HTTPS endpoint cho các URL khác nhau.",
            en: "Changing the security policy does not provide secure endpoints for the different URLs.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không giải quyết nhiều domain.", en: "It does not handle multiple domains." },
      },
    },
  ],
};

export default spec;
