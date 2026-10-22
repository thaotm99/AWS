// Practice test 3, question 60: static content on S3 behind CloudFront, readable only through CloudFront (OAI) and
// only from supplier IP ranges (AWS WAF on the distribution). Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const viaCf: StepSpec = {
  flow: ["sup", "cf", "s3"],
  caption: {
    vi: "Nhà cung cấp tải nội dung tĩnh qua CloudFront distribution, với S3 bucket làm origin.",
    en: "Suppliers fetch the static content through the CloudFront distribution, with the S3 bucket as its origin.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121078925,
  cols: 4.2,
  rows: 3,
  nodes: [
    { id: "sup", label: { vi: "IP nhà cung cấp", en: "Supplier IPs" }, kind: "actor", at: [0, 0.2] },
    { id: "other", label: { vi: "IP khác", en: "Other IPs" }, kind: "actor", at: [0, 2.0] },
    { id: "cf", label: "Amazon CloudFront", sub: "distribution", at: [1.5, 1.1] },
    { id: "s3", label: "S3 bucket", sub: "bucket policy", kind: "data", at: [3.1, 1.1] },
    { id: "wafS3", label: "AWS WAF ACL", sub: { vi: "gắn bucket policy?", en: "on bucket policy?" }, kind: "ghost", at: [3.1, 2.1] },
    { id: "nacl", label: "Network ACL", sub: { vi: "gắn CloudFront?", en: "on CloudFront?" }, kind: "ghost", at: [1.5, 2.1] },
    { id: "sg", label: "Security group", sub: { vi: "gắn CloudFront?", en: "on CloudFront?" }, kind: "ghost", at: [1.5, 2.1] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["wafS3", "nacl", "sg"],
      steps: [
        {
          ...viaCf,
          badge: "OAI",
          caption: {
            vi: "CloudFront gửi request đã xác thực tới S3 bằng origin access identity (OAI); bucket policy chỉ cho phép OAI đọc object. (AWS hiện khuyến nghị origin access control, OAC.)",
            en: "CloudFront sends authenticated requests to S3 with an origin access identity (OAI); the bucket policy lets only the OAI read objects. (AWS now recommends origin access control, OAC.)",
          },
        },
        {
          stop: ["other", "s3"],
          caption: {
            vi: "Bucket không còn truy cập công khai: người xem không thể lấy nội dung trực tiếp từ bucket, chỉ qua distribution đã chỉ định.",
            en: "The bucket is not publicly accessible: viewers cannot fetch content directly from the bucket, only through the specified distribution.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Chặn đường tắt vào S3; kết hợp với AWS WAF để giới hạn IP.",
          en: "It closes the direct path to S3; combined with AWS WAF for the IP limit.",
        },
      },
    },
    {
      option: "e",
      hide: ["wafS3", "nacl", "sg"],
      steps: [
        {
          flow: ["sup", "cf"],
          badge: "IP match",
          caption: {
            vi: "AWS WAF web ACL gắn với CloudFront distribution có IP match condition chứa các dải IP đang được cho phép trong security group của EC2.",
            en: "An AWS WAF web ACL on the CloudFront distribution has an IP match condition listing the IP ranges allowed in the EC2 security group.",
          },
        },
        {
          flow: ["cf", "s3"],
          caption: {
            vi: "Request từ IP được cho phép đi tiếp tới origin S3.",
            en: "Requests from allowed IPs continue to the S3 origin.",
          },
        },
        {
          stop: ["other", "cf"],
          badge: "403",
          caption: {
            vi: "Request từ IP khác bị AWS WAF chặn; tài nguyên được bảo vệ trả về HTTP 403 (Forbidden) hoặc một phản hồi tuỳ chỉnh.",
            en: "Requests from other IPs are blocked by AWS WAF; the protected resource responds with HTTP 403 (Forbidden) or a custom response.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Chỉ IP nhà cung cấp qua được CloudFront; kết hợp với OAI để chặn truy cập trực tiếp S3.",
          en: "Only supplier IPs get through CloudFront; combined with an OAI to block direct S3 access.",
        },
      },
    },
    {
      option: "a",
      hide: ["nacl", "sg"],
      steps: [
        viaCf,
        {
          stop: ["s3", "wafS3"],
          caption: {
            vi: "Không thể gắn AWS WAF ACL với bucket policy của Amazon S3.",
            en: "You cannot associate an AWS WAF ACL with an Amazon S3 bucket policy.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "WAF không gắn với bucket policy.", en: "WAF cannot attach to a bucket policy." } },
    },
    {
      option: "b",
      hide: ["wafS3", "sg"],
      steps: [
        viaCf,
        {
          stop: ["cf", "nacl"],
          caption: {
            vi: "NACL gắn với subnet trong VPC, còn CloudFront phân phối nội dung qua mạng edge location toàn cầu, nên không thể gắn NACL với distribution.",
            en: "A NACL is associated with a subnet in a VPC, while CloudFront delivers through a worldwide network of edge locations, so a NACL cannot be associated with a distribution.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "CloudFront không dùng NACL.", en: "CloudFront takes no NACL." } },
    },
    {
      option: "c",
      hide: ["wafS3", "nacl"],
      steps: [
        viaCf,
        {
          stop: ["cf", "sg"],
          caption: {
            vi: "Security group là firewall ảo cho EC2 instance, còn CloudFront phân phối qua các edge location, nên không thể gắn security group với distribution.",
            en: "A security group is a virtual firewall for EC2 instances, while CloudFront delivers through edge locations, so a security group cannot be associated with a distribution.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "CloudFront không dùng security group.", en: "CloudFront takes no security group." } },
    },
  ],
};

export default spec;
