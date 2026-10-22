// Practice test 6, question 62: CloudFront signed URLs and signed cookies restrict content to subscribers; HTTPS to
// the origin does not. Captions follow the question's explanation and its references:
//   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html
//   https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-cookies.html
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const signed = (option: string, badge: string, how: Bilingual, verdict: Bilingual): ScenarioSpec => ({
  option,
  steps: [
    { flow: ["sub", "cf"], badge, caption: how },
    {
      flow: ["origin", "cf", "sub"],
      back: true,
      caption: {
        vi: "Chữ ký hợp lệ: CloudFront phục vụ nội dung cho người đăng ký.",
        en: "The signature is valid: CloudFront serves the content to the subscriber.",
      },
    },
    {
      stop: ["anon", "cf"],
      caption: {
        vi: "Người không đăng ký không có URL hay cookie đã ký, nên không lấy được nội dung bị giới hạn.",
        en: "Non-subscribers have no signed URL or cookie, so they cannot get the restricted content.",
      },
    },
  ],
  verdict: { works: true, caption: verdict },
});

const https = (option: string, badge: string, how: Bilingual): ScenarioSpec => ({
  option,
  steps: [
    { flow: ["cf", "origin"], badge, caption: how },
    {
      flow: ["anon", "cf", "origin"],
      tone: "bad",
      caption: {
        vi: "Ai gửi request tới CloudFront cũng nhận được nội dung: HTTPS không thể dùng để giới hạn quyền truy cập nội dung riêng tư.",
        en: "Anyone who requests the content from CloudFront gets it: HTTPS cannot be used to restrict access to private content.",
      },
    },
  ],
  verdict: {
    works: false,
    caption: {
      vi: "Bảo vệ đường truyền, không giới hạn người xem.",
      en: "It protects the connection, not who may view.",
    },
  },
});

const spec: IllustrationSpec = {
  questionId: 130168947,
  cols: 4,
  rows: 2.5,
  nodes: [
    { id: "sub", label: { vi: "Người đăng ký", en: "Subscribers" }, kind: "actor", at: [0, 0.3] },
    { id: "anon", label: { vi: "Người khác", en: "Non-subscribers" }, kind: "actor", at: [0, 1.7] },
    { id: "cf", label: "CloudFront", at: [1.6, 1] },
    { id: "origin", label: "Origin", sub: "S3 / custom", kind: "data", at: [3, 1] },
  ],
  scenarios: [
    signed(
      "a",
      "signed URL",
      {
        vi: "Người đăng ký nhận một CloudFront signed URL; URL đã ký chứa thêm thông tin như thời điểm hết hạn, giúp kiểm soát quyền truy cập.",
        en: "A subscriber gets a CloudFront signed URL; it carries extra information such as an expiration date and time, for more control over access.",
      },
      { vi: "Chỉ người đăng ký xem được nội dung.", en: "Only subscribers can view the content." },
    ),
    signed(
      "e",
      "signed cookie",
      {
        vi: "Signed cookie cho phép kiểm soát ai truy cập mà không đổi URL hiện tại, hoặc cấp quyền cho nhiều file, ví dụ cả khu vực dành cho người đăng ký.",
        en: "Signed cookies control who can access content without changing current URLs, or for many restricted files, such as a whole subscribers' area.",
      },
      { vi: "Chỉ người đăng ký xem được nội dung.", en: "Only subscribers can view the content." },
    ),
    https("b", "HTTPS", {
      vi: "Yêu cầu HTTPS giữa CloudFront và custom origin chỉ bảo mật đường truyền tới nội dung gốc.",
      en: "Requiring HTTPS between CloudFront and a custom origin only secures access to the underlying content.",
    }),
    https("c", "HTTPS", {
      vi: "Yêu cầu HTTPS giữa CloudFront và S3 origin chỉ bảo mật đường truyền tới nội dung gốc.",
      en: "Requiring HTTPS between CloudFront and an S3 origin only secures access to the underlying content.",
    }),
    https("d", "ECDSA / RSA", {
      vi: "Chuyển tiếp request HTTPS tới origin với cipher ECDSA hoặc RSA vẫn chỉ là chuyện mã hoá đường truyền.",
      en: "Forwarding HTTPS requests to the origin with ECDSA or RSA ciphers is still only about encrypting the connection.",
    }),
  ],
};

export default spec;
