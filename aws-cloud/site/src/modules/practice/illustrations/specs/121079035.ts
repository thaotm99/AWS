// Practice test 3, question 52: validate JWTs from a third-party OIDC provider with an API Gateway HTTP API's
// native JWT authorizer. Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const token: StepSpec = {
  flow: ["idp", "client"],
  back: true,
  badge: "JWT",
  caption: {
    vi: "Ứng dụng web và mobile xác thực người dùng với nhà cung cấp danh tính bên thứ ba tuân thủ OIDC và nhận JSON Web Token (JWT).",
    en: "The web and mobile apps authenticate users with a third-party OIDC-compliant identity provider and receive a JSON Web Token (JWT).",
  },
};

const spec: IllustrationSpec = {
  questionId: 121079035,
  cols: 4.3,
  rows: 2.4,
  nodes: [
    { id: "idp", label: "OIDC provider", sub: { vi: "bên thứ ba", en: "third party" }, kind: "onprem", at: [0, 0.1] },
    { id: "client", label: "Web / mobile app", kind: "actor", at: [0, 1.4] },
    { id: "http", label: "HTTP API", sub: "JWT authorizer", at: [1.6, 1.4] },
    { id: "rest", label: "REST API", sub: "API Gateway", at: [1.6, 1.4] },
    { id: "ws", label: "WebSocket API", sub: "API Gateway", at: [1.6, 1.4] },
    { id: "runner", label: "AWS App Runner", at: [1.6, 1.4] },
    { id: "authFn", label: "Lambda authorizer", sub: { vi: "mã tự viết", en: "custom code" }, at: [1.6, 0.3] },
    { id: "backend", label: { vi: "Backend API", en: "Backend APIs" }, sub: "serverless", at: [3.2, 1.4] },
    { id: "ecs", label: "gRPC on Fargate", sub: { vi: "tự kiểm JWT", en: "JWT checks in code" }, at: [3.2, 1.4] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["rest", "ws", "runner", "authFn", "ecs"],
      steps: [
        token,
        {
          flow: ["client", "http"],
          badge: { vi: "kiểm JWT", en: "JWT validated" },
          caption: {
            vi: "HTTP API hỗ trợ JWT authorizer gốc: API tự động xác thực token do nhà cung cấp OIDC phát hành và kiểm soát truy cập theo claim, không cần logic xác thực tự viết trong Lambda.",
            en: "HTTP APIs support native JWT authorizers: the API automatically validates tokens issued by the OIDC provider and applies claim-based access control, with no custom authentication logic in Lambda.",
          },
        },
        {
          flow: ["http", "backend"],
          caption: {
            vi: "Chỉ request hợp lệ tới backend. HTTP API được tối ưu cho độ trễ thấp và rẻ hơn REST API.",
            en: "Only valid requests reach the backend. HTTP APIs are optimised for low latency and are more cost-effective than REST APIs.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Xác thực JWT gốc, được quản lý hoàn toàn.", en: "Native, fully managed JWT validation." } },
    },
    {
      option: "b",
      hide: ["http", "ws", "runner", "ecs"],
      steps: [
        token,
        {
          flow: ["client", "rest", "authFn"],
          tone: "warn",
          caption: {
            vi: "REST API gọi một Lambda authorizer tuỳ chỉnh để tự xác thực JWT.",
            en: "The REST API calls a custom Lambda authorizer that validates the JWT itself.",
          },
        },
        {
          mark: "authFn",
          tone: "bad",
          caption: {
            vi: "Phải viết, triển khai và bảo trì logic xác thực trong Lambda, làm tăng độ trễ và chi phí, trái với yêu cầu một giải pháp gốc không cần viết mã.",
            en: "Authentication logic must be written, deployed and maintained in Lambda, adding latency and cost, against the requirement for a native no-code solution.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Cần logic xác thực tự viết.", en: "Custom authentication logic." } },
    },
    {
      option: "c",
      hide: ["http", "rest", "runner", "ecs"],
      steps: [
        token,
        {
          flow: ["client", "ws", "authFn"],
          tone: "warn",
          badge: "$connect",
          caption: {
            vi: "WebSocket API dành cho giao tiếp hai chiều; Lambda authorizer chỉ kiểm tra token ở pha $connect.",
            en: "WebSocket APIs are for bidirectional communication; a Lambda authorizer inspects the token during the $connect phase.",
          },
        },
        {
          mark: "ws",
          tone: "bad",
          caption: {
            vi: "WebSocket API không hỗ trợ JWT authorizer gốc và việc phân quyền không áp dụng cho từng message, nên thiếu xác thực token theo từng request.",
            en: "WebSocket APIs do not natively support JWT authorizers and authorization is not enforced per message, so there is no per-request token validation.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không kiểm token theo từng request.", en: "No per-request token checks." } },
    },
    {
      option: "d",
      hide: ["http", "rest", "ws", "authFn", "backend"],
      steps: [
        token,
        {
          flow: ["client", "runner", "ecs"],
          tone: "warn",
          caption: {
            vi: "Backend gRPC trên ECS Fargate được công bố qua App Runner; JWT được kiểm tra trong mã của container.",
            en: "A gRPC backend on ECS Fargate is exposed through App Runner; JWTs are checked inside the container code.",
          },
        },
        {
          mark: "ecs",
          tone: "bad",
          caption: {
            vi: "Trách nhiệm xác thực chuyển xuống tầng ứng dụng, làm tăng độ phức tạp và trái với yêu cầu xác thực JWT được quản lý hoàn toàn.",
            en: "Authentication moves to the application layer, which adds complexity and violates the requirement for fully managed JWT validation.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Xác thực nằm trong mã ứng dụng.", en: "Authentication lives in app code." } },
    },
  ],
};

export default spec;
