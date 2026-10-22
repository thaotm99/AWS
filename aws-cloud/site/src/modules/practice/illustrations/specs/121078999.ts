// Practice test 3, question 37: global uploads and downloads of video files up to 10 GB with S3 Transfer
// Acceleration. Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 121078999,
  cols: 4.3,
  rows: 2.3,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Global users" }, sub: { vi: "toàn cầu · tới 10 GB", en: "files up to 10 GB" }, kind: "actor", at: [0, 1] },
    { id: "edge", label: "Edge location", sub: "S3 Transfer Accel.", at: [1.2, 1] },
    { id: "cf", label: "Amazon CloudFront", at: [1.2, 1] },
    { id: "ga", label: "Global Accelerator", at: [1.2, 1] },
    { id: "ec2", label: "EC2", sub: "web app", at: [2.3, 1] },
    { id: "cache", label: "ElastiCache", sub: "in-memory", kind: "data", at: [2.3, 0.1] },
    { id: "s3", label: "Amazon S3", sub: { vi: "web app · video", en: "web app · videos" }, kind: "data", at: [3.3, 1] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["cf", "ga", "ec2", "cache"],
      steps: [
        {
          flow: ["users", "edge"],
          badge: "upload",
          caption: {
            vi: "S3 Transfer Acceleration định tuyến lưu lượng qua các Edge Location phân tán toàn cầu của Amazon CloudFront, gần người dùng.",
            en: "S3 Transfer Acceleration routes traffic through Amazon CloudFront's globally distributed edge locations, close to the users.",
          },
        },
        {
          flow: ["edge", "s3"],
          caption: {
            vi: "Từ edge, dữ liệu đi trên mạng backbone của AWS với các tối ưu giao thức mạng, tránh biến động định tuyến và tắc nghẽn của internet.",
            en: "From the edge, data travels over the AWS backbone with network protocol optimisations, avoiding internet routing variability and congestion.",
          },
        },
        {
          flow: ["s3", "edge", "users"],
          back: true,
          badge: "download",
          caption: {
            vi: "Download cũng được tăng tốc theo cùng đường đó; S3TA rút ngắn về mặt logic khoảng cách tới S3 cho người dùng ở xa.",
            en: "Downloads are accelerated along the same path; S3TA logically shortens the distance to S3 for remote users.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: { vi: "Tăng tốc truyền object lớn, chi phí thấp, mở rộng tốt.", en: "Faster large-object transfers, low cost, scalable." },
      },
    },
    {
      option: "a",
      hide: ["edge", "ga", "ec2", "cache"],
      steps: [
        {
          flow: ["users", "cf", "s3"],
          tone: "warn",
          caption: {
            vi: "S3 cùng CloudFront rất hiệu quả để phân phối nội dung tĩnh với độ trễ thấp cho người dùng ở nhiều nơi.",
            en: "S3 with CloudFront is a powerful way to distribute static content with low latency to dispersed users.",
          },
        },
        {
          mark: "cf",
          tone: "bad",
          badge: "> 1 GB",
          caption: {
            vi: "Theo phần giải thích, PUT/POST qua CloudFront phù hợp với object hoặc tập dữ liệu nhỏ hơn 1 GB; video ở đây lớn hơn 1 GB nên S3 Transfer Acceleration là lựa chọn tốt hơn.",
            en: "Per the explanation, CloudFront PUT/POST suits objects or data sets smaller than 1 GB; these videos are larger than 1 GB, so S3 Transfer Acceleration is the better option.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không tối ưu cho file lớn.", en: "Not the best fit for large files." } },
    },
    {
      option: "b",
      hide: ["edge", "cf", "cache"],
      steps: [
        {
          flow: ["users", "ga", "ec2", "s3"],
          tone: "warn",
          caption: {
            vi: "Global Accelerator đưa lưu lượng người dùng qua hạ tầng mạng toàn cầu của AWS tới ứng dụng, ở đây là EC2.",
            en: "Global Accelerator sends user traffic through the AWS global network to the application, here on EC2.",
          },
        },
        {
          mark: "ga",
          tone: "bad",
          caption: {
            vi: "Global Accelerator dành cho trường hợp sử dụng khác; nó không dùng để tăng tốc upload hoặc download của Amazon S3.",
            en: "Global Accelerator is meant for a different use case; it is not meant to speed up Amazon S3 uploads or downloads.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không tăng tốc truyền tới S3.", en: "It does not accelerate S3 transfers." } },
    },
    {
      option: "c",
      hide: ["edge", "cf", "ga"],
      steps: [
        {
          flow: [
            ["users", "ec2", "s3"],
            ["ec2", "cache"],
          ],
          tone: "warn",
          caption: {
            vi: "Ứng dụng chạy trên EC2, đặt ElastiCache làm kho dữ liệu in-memory và lưu file trong S3.",
            en: "The app runs on EC2 with ElastiCache as an in-memory store and files in S3.",
          },
        },
        {
          mark: "cache",
          tone: "bad",
          caption: {
            vi: "ElastiCache không dùng cho bài toán này; S3 Transfer Acceleration là lựa chọn hiệu quả hơn.",
            en: "ElastiCache is not meant for this use case; S3 Transfer Acceleration performs better.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Cache không rút ngắn đường truyền.", en: "A cache does not shorten the transfer path." } },
    },
  ],
};

export default spec;
