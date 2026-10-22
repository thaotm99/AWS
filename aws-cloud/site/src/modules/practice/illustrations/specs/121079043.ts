// Practice test 3, question 48: cut S3 data transfer out costs for a popular S3-hosted website with CloudFront.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 121079043,
  cols: 4,
  rows: 2.4,
  nodes: [
    { id: "users", label: { vi: "Học viên", en: "Learners" }, sub: { vi: "request ×3", en: "requests ×3" }, kind: "actor", at: [0, 1] },
    { id: "cf", label: "Amazon CloudFront", sub: "edge location", at: [1.4, 1] },
    { id: "ec2", label: "Amazon EC2", sub: { vi: "web server", en: "web server" }, at: [1.4, 1] },
    { id: "s3", label: "Amazon S3", sub: "website", kind: "data", at: [2.9, 1] },
    { id: "ebs", label: "Amazon EBS", sub: "volume", kind: "data", at: [2.9, 1] },
    { id: "efs", label: "Amazon EFS", sub: "NFS", kind: "data", at: [2.9, 1] },
    { id: "batch", label: "S3 Batch", sub: "Operations", kind: "ghost", at: [2.9, 0.05] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["ec2", "ebs", "efs", "batch"],
      steps: [
        {
          flow: ["users", "cf", "s3"],
          badge: "miss",
          caption: {
            vi: "Request tới Edge Location gần nhất; nếu chưa có bản cache, CloudFront lấy file từ origin S3. Không có phí truyền dữ liệu từ S3 tới CloudFront.",
            en: "Requests go to a nearby edge location; if there is no cached copy, CloudFront retrieves the file from the S3 origin. There is no data transfer fee from S3 to CloudFront.",
          },
        },
        {
          flow: ["s3", "cf", "users"],
          back: true,
          caption: { vi: "File được trả về và lưu cache tại edge.", en: "The file is returned and cached at the edge." },
        },
        {
          flow: ["cf", "users"],
          back: true,
          times: 3,
          badge: "HIT",
          caption: {
            vi: "Các request sau được phục vụ từ cache với độ trễ thấp, giảm tải cho S3 bucket. Chỉ trả tiền cho dữ liệu CloudFront phân phối ra internet cùng phí request.",
            en: "Later requests are served from the cache with low latency, reducing load on the S3 bucket. You pay only for what CloudFront delivers to the internet, plus request fees.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Giảm chi phí và giữ độ trễ thấp.", en: "Lower cost with low latency." } },
    },
    {
      option: "a",
      hide: ["cf", "s3", "efs", "batch"],
      steps: [
        {
          flow: ["users", "ec2", "ebs"],
          tone: "warn",
          caption: {
            vi: "Website chuyển sang EC2 với dữ liệu trên EBS volume. EBS nhanh và khá rẻ, nhưng Amazon S3 vẫn rẻ hơn.",
            en: "The site moves to EC2 with data on an EBS volume. EBS is fast and relatively cheap, though Amazon S3 is still cheaper.",
          },
        },
        {
          mark: "ebs",
          tone: "bad",
          caption: {
            vi: "EBS volume chỉ truy cập được qua EC2 instance và bị giới hạn trong một Region.",
            en: "EBS volumes are accessible only through EC2 instances and are bound to a specific Region.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không giải quyết chi phí phân phối.", en: "It does not address delivery cost." } },
    },
    {
      option: "b",
      hide: ["cf", "s3", "ebs", "batch"],
      steps: [
        {
          flow: ["users", "ec2", "efs"],
          tone: "warn",
          caption: {
            vi: "EFS là file system dùng chung, gắn được vào các EC2 instance.",
            en: "EFS is a shareable file system that can be mounted onto EC2 instances.",
          },
        },
        {
          mark: "efs",
          tone: "bad",
          caption: {
            vi: "EFS đắt hơn EBS, nên không phải giải pháp khi công ty muốn giảm chi phí.",
            en: "EFS is costlier than EBS, so it is not a solution for reducing costs.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Đắt hơn.", en: "More expensive." } },
    },
    {
      option: "d",
      hide: ["cf", "ec2", "ebs", "efs"],
      steps: [
        {
          flow: ["users", "s3"],
          tone: "warn",
          times: 3,
          caption: {
            vi: "Người dùng vẫn tải trực tiếp từ S3, nên phí truyền dữ liệu ra từ S3 vẫn như cũ.",
            en: "Users still download straight from S3, so the S3 data transfer out stays the same.",
          },
        },
        {
          mark: "batch",
          tone: "bad",
          caption: {
            vi: "S3 Batch Operations thực hiện các thao tác hàng loạt quy mô lớn trên object; nó không liên quan gì tới phân phối nội dung.",
            en: "S3 Batch Operations performs large-scale batch operations on objects; it has nothing to do with content distribution.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không liên quan tới phân phối nội dung.", en: "Unrelated to content delivery." } },
    },
  ],
};

export default spec;
