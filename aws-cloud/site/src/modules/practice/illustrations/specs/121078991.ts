// Practice test 3, question 53: per-client rate limits and quotas with API Gateway usage plans and API keys.
// Captions follow the question's explanation. Additional source:
// - Throttled clients "may receive 429 Too Many Requests error responses":
//   https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
import type { IllustrationSpec, StepSpec } from "../types";

const flood = (lb: string): StepSpec => ({
  flow: [
    ["cA", lb, "backend"],
    ["cB", lb, "backend"],
  ],
  tone: "warn",
  times: 3,
  caption: {
    vi: "Client A gửi dồn dập request; tất cả đều đi tiếp tới backend.",
    en: "Client A floods requests; all of them pass through to the backend.",
  },
});

const spec: IllustrationSpec = {
  questionId: 121078991,
  cols: 4.2,
  rows: 2.7,
  nodes: [
    { id: "cA", label: "Client A", sub: "API key A", kind: "actor", at: [0, 0.2] },
    { id: "cB", label: "Client B", sub: "API key B", kind: "actor", at: [0, 1.8] },
    { id: "apigw", label: "API Gateway", sub: "usage plans", at: [1.5, 1] },
    { id: "alb", label: "Application LB", sub: "listener rules", at: [1.5, 1] },
    { id: "gwlb", label: "Gateway LB", sub: "L3/L4 appliances", at: [1.5, 1] },
    { id: "nlb", label: "Network LB", sub: "TLS · L4", at: [1.5, 1] },
    { id: "backend", label: "Backend", sub: { vi: "Lambda · dịch vụ", en: "Lambda · services" }, at: [3.1, 1] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["alb", "gwlb", "nlb"],
      steps: [
        {
          flow: [
            ["cA", "apigw", "backend"],
            ["cB", "apigw", "backend"],
          ],
          caption: {
            vi: "Mỗi client có một API key gắn với một usage plan, quy định số request mỗi giây (rate) và tổng số request trong một khoảng thời gian (quota).",
            en: "Each client has an API key associated with a usage plan that sets requests per second (rate) and total requests over a period (quota).",
          },
        },
        {
          flow: ["cA", "apigw"],
          times: 4,
          caption: {
            vi: "Client A vượt giới hạn trong usage plan của mình.",
            en: "Client A exceeds the limits in its usage plan.",
          },
        },
        {
          stop: ["cA", "apigw"],
          badge: "429",
          caption: {
            vi: "Throttling được áp dụng tại tầng API Gateway: request vượt mức của client A bị từ chối với 429 Too Many Requests, bảo vệ tài nguyên phía sau.",
            en: "Throttling is enforced at the API Gateway layer: client A's excess requests get 429 Too Many Requests, protecting downstream resources.",
          },
        },
        {
          flow: ["cB", "apigw", "backend"],
          caption: {
            vi: "Client B vẫn được phục vụ trong giới hạn của mình, đảm bảo sử dụng công bằng giữa các client.",
            en: "Client B is still served within its own limits, keeping usage fair across clients.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Rate limit và quota theo từng client.", en: "Per-client rate limits and quotas." } },
    },
    {
      option: "a",
      hide: ["apigw", "gwlb", "nlb"],
      steps: [
        flood("alb"),
        {
          mark: "alb",
          tone: "bad",
          caption: {
            vi: "ALB định tuyến theo path và host nhưng không có sẵn rate limiting hay throttling; WAF rule cũng không có usage plan hay quota theo từng client.",
            en: "An ALB routes by path and host but has no built-in rate limiting or throttling; WAF rules lack per-client usage plans or quota control.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không có throttling theo client.", en: "No per-client throttling." } },
    },
    {
      option: "c",
      hide: ["apigw", "alb", "nlb"],
      steps: [
        flood("gwlb"),
        {
          mark: "gwlb",
          tone: "bad",
          caption: {
            vi: "Gateway Load Balancer tích hợp với thiết bị bảo mật bên thứ ba và hoạt động ở Layer 3/4; nó không cung cấp rate limiting tầng ứng dụng hay quota cho client.",
            en: "A Gateway Load Balancer integrates third-party security appliances and works at Layer 3/4; it provides no application-layer rate limiting or client quotas.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không quản lý quota API.", en: "No API quota management." } },
    },
    {
      option: "d",
      hide: ["apigw", "alb", "gwlb"],
      steps: [
        flood("nlb"),
        {
          mark: "backend",
          tone: "bad",
          caption: {
            vi: "NLB hoạt động ở Layer 4 và không có sẵn khả năng throttle; rate limiting phải viết trong ứng dụng trên EC2, mất đi tính tập trung và thêm độ phức tạp.",
            en: "An NLB works at Layer 4 with no built-in throttling; rate limiting would live in the application on EC2, which defeats centralised control and adds complexity.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Giới hạn phải tự viết trong backend.", en: "Limits must be coded in the backend." } },
    },
  ],
};

export default spec;
