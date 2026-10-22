// Practice test 2, question 29: videos saved on per-instance EBS volumes move to shared storage (S3 or EFS).
// Captions follow the question's explanation. Additional sources:
// - "archived objects are not accessible in real time" (restore first):
//   https://docs.aws.amazon.com/AmazonS3/latest/userguide/archived-objects.html
// - DynamoDB maximum item size is 400 KB:
//   https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
import type { Bilingual, IllustrationSpec, ScenarioSpec, StepSpec } from "../types";

const STORES = ["s3", "efs", "gda", "rds", "ddb"];

const problem: StepSpec[] = [
  {
    flow: ["user", "alb", "ec2a", "ebsA"],
    badge: { vi: "video 1", en: "video 1" },
    caption: {
      vi: "EBS volume gắn cục bộ với EC2 instance, nên video tải lên được lưu trên volume của instance đã nhận request.",
      en: "EBS volumes are attached locally to EC2 instances, so an uploaded video is saved on the volume of whichever instance took the request.",
    },
  },
  {
    flow: ["user", "alb", "ec2b", "ebsB"],
    tone: "warn",
    badge: { vi: "video 2", en: "video 2" },
    caption: {
      vi: "Lần đăng nhập sau, người dùng được đưa tới instance khác và chỉ thấy phần video nằm trên volume của instance đó.",
      en: "On the next login the user lands on another instance and only sees the videos on that instance's volume.",
    },
  },
];

const shared = (option: string, store: string, caption: Bilingual): ScenarioSpec => ({
  option,
  hide: STORES.filter((s) => s !== store),
  steps: [
    ...problem,
    { flow: [["ebsA", store], ["ebsB", store]], badge: { vi: "chép một lần", en: "one-time copy" }, caption: { vi: "Một job chạy một lần chép video từ mọi EBS volume sang nơi lưu trữ dùng chung.", en: "A one-time job copies the videos from every EBS volume to shared storage." } },
    { flow: [["ec2a", store], ["ec2b", store]], badge: { vi: "đủ video", en: "all videos" }, caption },
  ],
  verdict: { works: true, caption: { vi: "Mọi instance cùng thấy toàn bộ video.", en: "Every instance sees every video." } },
});

const unfit = (option: string, store: string, badge: Bilingual, caption: Bilingual): ScenarioSpec => ({
  option,
  hide: STORES.filter((s) => s !== store),
  steps: [
    ...problem,
    { flow: [["ec2a", store], ["ec2b", store]], tone: "warn", caption: { vi: "Ứng dụng được sửa để lưu video vào kho mới.", en: "The application is changed to store the videos in the new store." } },
    { mark: store, tone: "bad", badge, caption },
  ],
  verdict: { works: false, caption: { vi: "Không phù hợp để lưu và phục vụ video.", en: "Not suited to storing and serving videos." } },
});

const spec: IllustrationSpec = {
  questionId: 119516081,
  cols: 4.5,
  rows: 2.6,
  nodes: [
    { id: "user", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 0.8] },
    { id: "alb", label: "Application LB", at: [1.1, 0.8] },
    { id: "ec2a", label: "EC2 #1", at: [2.2, 0] },
    { id: "ec2b", label: "EC2 #2", at: [2.2, 1.6] },
    { id: "ebsA", label: "EBS #1", kind: "data", at: [3.5, 0] },
    { id: "ebsB", label: "EBS #2", kind: "data", at: [3.5, 1.6] },
    { id: "s3", label: "Amazon S3", sub: "Standard", kind: "data", at: [3.5, 0.8] },
    { id: "efs", label: "Amazon EFS", sub: { vi: "mount trên mọi instance", en: "mounted on all instances" }, kind: "data", at: [3.5, 0.8] },
    { id: "gda", label: "Glacier Deep Archive", kind: "data", at: [3.5, 0.8] },
    { id: "rds", label: "Amazon RDS", kind: "data", at: [3.5, 0.8] },
    { id: "ddb", label: "Amazon DynamoDB", kind: "data", at: [3.5, 0.8] },
  ],
  scenarios: [
    shared("b", "s3", {
      vi: "Ứng dụng lưu video vào Amazon S3 Standard; mọi instance đọc cùng một nơi, nên lần đăng nhập nào người dùng cũng thấy đủ video.",
      en: "The application stores videos in Amazon S3 Standard; every instance reads the same place, so users see all their videos on every login.",
    }),
    shared("d", "efs", {
      vi: "Amazon EFS được mount trên mọi EC2 instance; ứng dụng lưu video vào file system dùng chung này, nên instance nào cũng thấy đủ video.",
      en: "Amazon EFS is mounted on every EC2 instance; the application stores videos on this shared file system, so any instance sees them all.",
    }),
    unfit("a", "gda", { vi: "lưu trữ dài hạn", en: "archive" }, {
      vi: "S3 Glacier Deep Archive dành cho lưu trữ dài hạn; object đã lưu trữ không truy cập được theo thời gian thực mà phải khôi phục trước, nên không dùng để phục vụ video qua ứng dụng web.",
      en: "S3 Glacier Deep Archive is for long-term archival; archived objects are not accessible in real time and must be restored first, so it cannot serve videos to a web application.",
    }),
    unfit("c", "rds", { vi: "CSDL quan hệ", en: "relational DB" }, {
      vi: "Amazon RDS là cơ sở dữ liệu quan hệ, không phải lựa chọn phù hợp để lưu video.",
      en: "Amazon RDS is a relational database and not the right candidate for storing videos.",
    }),
    unfit("e", "ddb", { vi: "item tối đa 400 KB", en: "400 KB items" }, {
      vi: "Amazon DynamoDB là cơ sở dữ liệu NoSQL, không phải lựa chọn phù hợp để lưu video; kích thước item tối đa chỉ 400 KB.",
      en: "Amazon DynamoDB is a NoSQL database and not the right candidate for storing videos; its maximum item size is 400 KB.",
    }),
  ],
};

export default spec;
