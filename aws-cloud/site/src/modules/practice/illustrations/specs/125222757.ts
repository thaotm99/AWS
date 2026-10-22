// Practice test 1, question 48: ALB path-based routing to two microservices.
// Captions follow the question's explanation. Additional source:
// - Rule condition types and path conditions ("path-based routing"):
//   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-condition-types.html
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const notByPath = (option: string, badge: string, how: Bilingual, why: Bilingual): ScenarioSpec => ({
  option,
  steps: [
    { flow: ["client", "alb"], tone: "warn", badge, caption: how },
    { stop: ["alb", "orders"], caption: why },
  ],
  verdict: {
    works: false,
    caption: {
      vi: "Điều kiện này không dựa trên đường dẫn URL.",
      en: "This condition is not based on the URL path.",
    },
  },
});

const spec: IllustrationSpec = {
  questionId: 125222757,
  cols: 4,
  rows: 2.6,
  nodes: [
    { id: "client", label: { vi: "Người dùng", en: "Users" }, sub: "www.example.com", kind: "actor", at: [0, 1.05] },
    { id: "alb", label: "ALB", sub: "listener rules", at: [1.4, 1.05] },
    { id: "orders", label: "orders", sub: "microservice", kind: "data", at: [3, 0.3] },
    { id: "products", label: "products", sub: "microservice", kind: "data", at: [3, 1.8] },
  ],
  links: [["alb", "products"]],
  scenarios: [
    {
      option: "d",
      steps: [
        {
          flow: ["client", "alb"],
          badge: "/orders",
          caption: {
            vi: "Request https://www.example.com/orders tới listener của ALB. Path condition so khớp đường dẫn URL của request, không xét tham số truy vấn (path-based routing).",
            en: "A request for https://www.example.com/orders reaches the ALB listener. A path condition matches the URL path of the request, not its query parameters (path-based routing).",
          },
        },
        {
          flow: ["alb", "orders"],
          caption: {
            vi: "Rule có path pattern /orders chuyển request tới microservice orders.",
            en: "The rule with the /orders path pattern forwards the request to the orders microservice.",
          },
        },
        {
          flow: ["client", "alb"],
          badge: "/products",
          caption: {
            vi: "Request https://www.example.com/products khớp rule thứ hai, có path pattern /products.",
            en: "A request for https://www.example.com/products matches the second rule, with the /products path pattern.",
          },
        },
        {
          flow: ["alb", "products"],
          caption: {
            vi: "Request được chuyển tới microservice products.",
            en: "The request is forwarded to the products microservice.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Path-based routing định tuyến theo đường dẫn URL, đúng yêu cầu.",
          en: "Path-based routing routes on the URL path, as required.",
        },
      },
    },
    notByPath(
      "a",
      "?query",
      {
        vi: "Query string parameter-based routing định tuyến theo chuỗi truy vấn (query string) của URL, không theo đường dẫn.",
        en: "Query string parameter-based routing routes on the URL's query string, not on its path.",
      },
      {
        vi: "Hai request /orders và /products khác nhau ở đường dẫn URL, nên điều kiện theo query string không tách được chúng sang hai microservice.",
        en: "The /orders and /products requests differ in their URL path, so a query string condition cannot send them to different microservices.",
      },
    ),
    notByPath(
      "b",
      "header",
      {
        vi: "HTTP header-based routing so khớp giá trị của một HTTP header tiêu chuẩn hoặc tuỳ chỉnh, không phải đường dẫn URL.",
        en: "HTTP header-based routing matches the value of a standard or custom HTTP header, not the URL path.",
      },
      {
        vi: "Điều kiện theo header không dựa trên đường dẫn /orders hay /products, nên không đáp ứng cách định tuyến được yêu cầu.",
        en: "A header condition is not based on the /orders or /products path, so it does not provide the routing that is required.",
      },
    ),
    notByPath(
      "c",
      "Host",
      {
        vi: "Host-based routing so khớp trường Host của HTTP header, dùng để định tuyến nhiều domain trên cùng một load balancer.",
        en: "Host-based routing matches the Host field of the HTTP header, to route several domains from one load balancer.",
      },
      {
        vi: "Cả hai request đều có Host là www.example.com, nên điều kiện theo host không phân biệt được /orders và /products.",
        en: "Both requests have the Host www.example.com, so a host condition cannot tell /orders from /products.",
      },
    ),
  ],
};

export default spec;
