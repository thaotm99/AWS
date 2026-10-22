// Practice test 1, question 38: Route 53 geolocation routing or CloudFront geo restriction for US-only streaming.
// Captions follow the question's explanation. Additional sources:
// - Without a default record, Route 53 returns a "no answer" response for locations with no geolocation record:
//   https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geo.html
// - Geo restriction: "CloudFront returns an HTTP status code 403 (Forbidden) to the user":
//   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/georestrictions.html
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const POLICIES = ["r53geo", "cf", "r53lat", "r53w", "r53fo"];

const noGeo = (option: string, via: string, how: Bilingual): ScenarioSpec => ({
  option,
  hide: POLICIES.filter((p) => p !== via),
  steps: [
    { flow: [["us", via, "origin"], ["other", via, "origin"]], tone: "warn", caption: how },
    {
      mark: "other",
      tone: "bad",
      badge: { vi: "không bị chặn", en: "not blocked" },
      caption: {
        vi: "Chính sách này không dùng để giới hạn nội dung theo nơi có quyền phân phối, nên người xem ngoài Mỹ vẫn xem được.",
        en: "This policy cannot restrict content to the locations with distribution rights, so viewers outside the USA still get the stream.",
      },
    },
  ],
  verdict: { works: false, caption: { vi: "Không giới hạn theo vị trí.", en: "No location-based restriction." } },
});

const spec: IllustrationSpec = {
  questionId: 125222677,
  cols: 3.8,
  rows: 2.4,
  nodes: [
    { id: "us", label: { vi: "Người xem", en: "Viewer" }, sub: { vi: "ở Mỹ", en: "in the USA" }, kind: "actor", at: [0, 0] },
    { id: "other", label: { vi: "Người xem", en: "Viewer" }, sub: { vi: "nước khác", en: "other country" }, kind: "actor", at: [0, 1.4] },
    { id: "r53geo", label: "Route 53", sub: "geolocation routing", at: [1.4, 0.7] },
    { id: "cf", label: "CloudFront", sub: "geo restriction", at: [1.4, 0.7] },
    { id: "r53lat", label: "Route 53", sub: "latency routing", at: [1.4, 0.7] },
    { id: "r53w", label: "Route 53", sub: "weighted routing", at: [1.4, 0.7] },
    { id: "r53fo", label: "Route 53", sub: "failover routing", at: [1.4, 0.7] },
    { id: "origin", label: { vi: "Luồng trực tiếp", en: "Live stream" }, sub: "origin", kind: "data", at: [2.8, 0.7] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["cf", "r53lat", "r53w", "r53fo"],
      steps: [
        {
          flow: ["us", "r53geo", "origin"],
          badge: "US record",
          caption: {
            vi: "Geolocation routing chọn tài nguyên theo vị trí nơi DNS query xuất phát; query từ Mỹ khớp record dành cho Mỹ.",
            en: "Geolocation routing chooses resources by where the DNS query originates; a query from the USA matches the US record.",
          },
        },
        {
          stop: ["other", "r53geo"],
          badge: "no answer",
          caption: {
            vi: "Geolocation routing giới hạn được nội dung ở những nơi có quyền phân phối: không có record cho vị trí đó (và không có default record) thì Route 53 trả về \"no answer\".",
            en: "Geolocation routing can limit content to locations with distribution rights: with no record for that location (and no default record), Route 53 returns \"no answer\".",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Chỉ trả lời cho vị trí được phép.", en: "Answers only for allowed locations." } },
    },
    {
      option: "e",
      hide: ["r53geo", "r53lat", "r53w", "r53fo"],
      steps: [
        {
          flow: ["us", "cf", "origin"],
          badge: { vi: "trong allow list", en: "allow-listed" },
          caption: {
            vi: "CloudFront geo restriction với danh sách quốc gia được phép: người xem ở Mỹ được phục vụ như bình thường.",
            en: "CloudFront geo restriction with an allow list of countries: viewers in the USA are served as usual.",
          },
        },
        {
          stop: ["other", "cf"],
          badge: "403",
          caption: {
            vi: "Người dùng ở quốc gia không được phép bị chặn; CloudFront trả về HTTP 403 (Forbidden).",
            en: "Users in countries that are not allowed are blocked; CloudFront returns HTTP 403 (Forbidden).",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Chặn theo quốc gia tại CloudFront.", en: "Country blocking at CloudFront." } },
    },
    noGeo("a", "r53lat", {
      vi: "Latency routing đưa người dùng tới Region có độ trễ thấp nhất, không xét quyền phân phối.",
      en: "Latency routing sends users to the Region with the lowest latency, regardless of distribution rights.",
    }),
    noGeo("b", "r53w", {
      vi: "Weighted routing chia lưu lượng theo tỷ lệ giữa các tài nguyên, không theo vị trí người dùng.",
      en: "Weighted routing splits traffic by weight between resources, not by user location.",
    }),
    noGeo("c", "r53fo", {
      vi: "Failover routing đưa lưu lượng tới tài nguyên chính khi nó khoẻ mạnh, sang tài nguyên phụ khi không.",
      en: "Failover routing sends traffic to the primary while healthy and to the secondary when not.",
    }),
  ],
};

export default spec;
