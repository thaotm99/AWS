// Practice test 5, question 21: CloudFront and S3 Transfer Acceleration speed up uploads and downloads for remote offices.
// Captions follow the question's explanation. Additional source:
// - CloudFront accepts PUT/POST and other methods for uploads:
//   https://aws.amazon.com/blogs/aws/amazon-cloudfront-content-uploads-post-put-other-methods/
import type { Bilingual, IllustrationSpec } from "../types";

const notServerless: Bilingual = {
  vi: "Phương án dùng EC2 instance, trong khi công ty muốn tiếp tục dùng giải pháp lưu trữ serverless như Amazon S3.",
  en: "This uses EC2 instances, while the agency wants to keep a serverless storage solution such as Amazon S3.",
};

const spec: IllustrationSpec = {
  questionId: 119517581,
  cols: 3.9,
  rows: 2.3,
  nodes: [
    { id: "office", label: { vi: "Văn phòng xa", en: "Remote office" }, sub: "video ~500 MB", kind: "actor", at: [0, 1.2] },
    { id: "cf", label: "CloudFront", sub: "edge location", at: [1.3, 1.2] },
    { id: "s3ta", label: "S3TA", sub: "edge location", at: [1.3, 1.2] },
    { id: "local", label: "Amazon S3", sub: { vi: "bucket tại chỗ", en: "local bucket" }, kind: "data", at: [1.3, 1.2] },
    { id: "ec2", label: "EC2", sub: { vi: "Region khác", en: "other Region" }, at: [1.3, 1.2] },
    { id: "ebs", label: "EBS volume", kind: "data", at: [1.3, 0.1] },
    { id: "s3", label: "Amazon S3", sub: { vi: "bucket trung tâm", en: "central bucket" }, kind: "data", at: [2.9, 1.2] },
    { id: "efs", label: "Amazon EFS", sub: "US Region", kind: "data", at: [2.9, 1.2] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["s3ta", "local", "ec2", "ebs", "efs"],
      steps: [
        {
          flow: ["office", "cf", "s3"],
          badge: "PUT",
          caption: {
            vi: "Video được tải lên qua edge location gần nhất của CloudFront rồi tới bucket S3 làm origin.",
            en: "Videos are uploaded through the nearest CloudFront edge location to the S3 bucket origin.",
          },
        },
        {
          flow: ["s3", "cf", "office"],
          back: true,
          caption: {
            vi: "Với lần yêu cầu đầu tiên, object đi từ S3 qua đường truyền của edge location.",
            en: "On the first request, the object travels from S3 through the edge location's transfer path.",
          },
        },
        {
          flow: ["office", "cf"],
          badge: { vi: "edge", en: "edge" },
          caption: {
            vi: "Các lần sau, object được phục vụ từ edge location gần người dùng nhất cho tới khi hết hạn.",
            en: "After that, it is served from the edge location nearest the users until it expires.",
          },
        },
        {
          flow: ["cf", "office"],
          back: true,
          caption: {
            vi: "Nhờ vậy cả tải lên lẫn tải xuống đều nhanh hơn, mà dữ liệu vẫn nằm trong Amazon S3.",
            en: "Both uploads and downloads get faster, and the data stays in Amazon S3.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Một trong hai lựa chọn đúng: CloudFront tăng tốc tải lên và tải xuống.",
          en: "One of the two correct choices: CloudFront speeds up uploads and downloads.",
        },
      },
    },
    {
      option: "d",
      hide: ["cf", "local", "ec2", "ebs", "efs"],
      steps: [
        {
          flow: ["office", "s3ta"],
          badge: "edge",
          caption: {
            vi: "S3 Transfer Acceleration tận dụng các edge location phân bố toàn cầu của Amazon CloudFront.",
            en: "S3 Transfer Acceleration uses Amazon CloudFront's globally distributed edge locations.",
          },
        },
        {
          flow: ["s3ta", "s3"],
          times: 2,
          caption: {
            vi: "Khi dữ liệu tới edge location, nó được định tuyến tới Amazon S3 qua một đường mạng tối ưu; S3TA có thể tăng tốc truyền object lớn ở khoảng cách xa thêm 50–500%.",
            en: "Once data reaches an edge location, it is routed to Amazon S3 over an optimized network path; S3TA can speed up long-distance transfers of larger objects by 50–500%.",
          },
        },
        {
          flow: ["s3", "s3ta", "office"],
          back: true,
          caption: {
            vi: "Tải xuống cũng đi qua đường truyền được tăng tốc này.",
            en: "Downloads use the same accelerated path.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Một trong hai lựa chọn đúng: S3TA tăng tốc tải lên và tải xuống.",
          en: "One of the two correct choices: S3TA speeds up uploads and downloads.",
        },
      },
    },
    {
      option: "a",
      hide: ["cf", "s3ta", "ec2", "ebs", "efs"],
      steps: [
        {
          flow: ["office", "local"],
          tone: "warn",
          caption: {
            vi: "Mỗi văn phòng lưu media vào một bucket riêng ở Region của mình.",
            en: "Each office stores its media in its own bucket in its own Region.",
          },
        },
        {
          mark: "s3",
          tone: "bad",
          badge: { vi: "lưu trữ tập trung", en: "centralized" },
          caption: {
            vi: "Công ty duy trì lưu trữ tập trung, nên tạo bucket ở mọi Region không phải là phương án phù hợp.",
            en: "The agency keeps centralized storage, so a bucket in every Region is not an option.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Phá vỡ mô hình lưu trữ tập trung.",
          en: "It breaks the centralized storage.",
        },
      },
    },
    {
      option: "b",
      hide: ["cf", "s3ta", "local", "ebs", "s3"],
      steps: [
        {
          flow: ["office", "ec2", "efs"],
          tone: "warn",
          badge: "VPC peering",
          caption: {
            vi: "Dữ liệu chuyển sang Amazon EFS ở US Region; EC2 instance ở các Region khác kết nối tới qua inter-region VPC peering.",
            en: "Data moves to Amazon EFS in a US Region; EC2 instances in other Regions connect over inter-region VPC peering.",
          },
        },
        { mark: "ec2", tone: "bad", caption: notServerless },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không còn là lưu trữ serverless.", en: "No longer serverless storage." },
      },
    },
    {
      option: "e",
      hide: ["cf", "s3ta", "local", "efs"],
      steps: [
        {
          flow: ["s3", "ec2", "ebs"],
          tone: "warn",
          badge: { vi: "job hằng ngày", en: "daily job" },
          caption: {
            vi: "Một job hằng ngày chép dữ liệu từ S3 vào EBS volume gắn với EC2 instance ở Region của từng văn phòng.",
            en: "A daily job copies S3 data into EBS volumes attached to EC2 instances in each office's Region.",
          },
        },
        { flow: ["office", "ec2"], tone: "warn", caption: notServerless },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không còn là lưu trữ serverless.", en: "No longer serverless storage." },
      },
    },
  ],
};

export default spec;
