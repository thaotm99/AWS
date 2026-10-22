// Practice test 4, question 5: disaster recovery with a pre-built AMI copied to every Region.
// Captions follow the question's explanation (AMIs are Region-bound; a copy is an identical but distinct AMI with
// its own identifier; user data runs the same 45-minute installation).
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516213,
  cols: 4.5,
  rows: 2.8,
  nodes: [
    { id: "src", label: "EC2 instance", sub: { vi: "đã cài ứng dụng", en: "app installed" }, at: [0, 1] },
    { id: "ami", label: "AMI", sub: "Region A", kind: "data", at: [1.15, 1] },
    { id: "s3", label: "Amazon S3", sub: { vi: "file cài đặt", en: "installation files" }, kind: "data", at: [1.15, 1] },
    { id: "ud", label: "EC2 user data", sub: { vi: "script cài đặt", en: "install script" }, at: [1.15, 1] },
    { id: "amiB", label: { vi: "Bản sao AMI", en: "AMI copy" }, sub: "Region B", kind: "data", at: [2.4, 0.2] },
    { id: "amiC", label: { vi: "Bản sao AMI", en: "AMI copy" }, sub: "Region C", kind: "data", at: [2.4, 1.8] },
    { id: "ec2B", label: "EC2", sub: { vi: "khôi phục", en: "recovery" }, at: [3.5, 0.2] },
    { id: "ec2C", label: "EC2", sub: { vi: "khôi phục", en: "recovery" }, at: [3.5, 1.8] },
  ],
  zones: [
    { id: "regA", label: "Region A", tone: "region", from: [0, 1], to: [1.15, 1] },
    { id: "regB", label: "Region B", tone: "region", from: [2.4, 0.2], to: [3.5, 0.2] },
    { id: "regC", label: "Region C", tone: "region", from: [2.4, 1.8], to: [3.5, 1.8] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["s3", "ud"],
      steps: [
        {
          flow: ["src", "ami"],
          badge: "AMI",
          caption: {
            vi: "Tạo AMI sau khi đã cài phần mềm, nên AMI chứa sẵn toàn bộ application stack.",
            en: "An AMI is created after the software is installed, so it already contains the whole application stack.",
          },
        },
        {
          flow: [["ami", "amiB"], ["ami", "amiC"]],
          caption: {
            vi: "AMI gắn với Region nơi nó được tạo, nên phải sao chép sang mọi Region. Bản sao là một AMI giống hệt nhưng riêng biệt, có định danh riêng.",
            en: "AMIs are bound to the Region they are created in, so the AMI is copied to every Region. Each copy is an identical but distinct AMI with its own identifier.",
          },
        },
        {
          flow: [["amiB", "ec2B"], ["amiC", "ec2C"]],
          caption: {
            vi: "Khi khôi phục, mỗi Region khởi chạy instance từ AMI của chính Region đó; không phải chạy lại quá trình cài đặt 45 phút.",
            en: "During recovery, each Region launches instances from its own Region-specific AMI; the 45-minute installation does not run again.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "AMI dựng sẵn có mặt ở mọi Region giúp khôi phục nhanh, phù hợp RTO 5 phút.",
          en: "A pre-built AMI present in every Region allows fast recovery within the 5-minute RTO.",
        },
      },
    },
    {
      option: "c",
      hide: ["s3", "ud", "amiB", "amiC", "regC", "ec2C"],
      steps: [
        {
          flow: ["src", "ami"],
          badge: "AMI",
          caption: {
            vi: "Tạo AMI sau khi cài phần mềm là đúng hướng.",
            en: "Creating an AMI after installing the software is the right start.",
          },
        },
        {
          stop: ["ami", "ec2B"],
          badge: { vi: "khác Region", en: "other Region" },
          caption: {
            vi: "Nhưng AMI chỉ dùng được trong Region nơi nó được tạo; muốn dùng ở Region khác thì phải sao chép AMI sang Region đó.",
            en: "But an AMI is Region-specific; it must be copied to every Region it is intended to be used in.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "AMI chưa được sao chép sang các Region khác.", en: "The AMI is not copied to the other Regions." },
      },
    },
    {
      option: "a",
      hide: ["src", "ami", "ud", "regA", "amiB", "amiC"],
      steps: [
        {
          flow: [["s3", "ec2B"], ["s3", "ec2C"]],
          tone: "warn",
          caption: {
            vi: "Amazon S3 là dịch vụ lưu trữ: instance tải file cài đặt về nhưng vẫn phải tự chạy quá trình cài đặt.",
            en: "Amazon S3 is a storage service: instances fetch the installation files but still have to run the installation.",
          },
        },
        {
          mark: ["ec2B", "ec2C"],
          tone: "bad",
          badge: { vi: "45 phút", en: "45 min" },
          caption: {
            vi: "Việc cài đặt vẫn mất hơn 45 phút, vượt xa RTO 5 phút.",
            en: "The installation still takes over 45 minutes, far beyond the 5-minute RTO.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không rút ngắn thời gian cài đặt.", en: "It does not shorten the installation." },
      },
    },
    {
      option: "b",
      hide: ["src", "ami", "s3", "regA", "amiB", "amiC"],
      steps: [
        {
          flow: [["ud", "ec2B"], ["ud", "ec2C"]],
          tone: "warn",
          caption: {
            vi: "User data chạy script cấu hình sau khi instance khởi động; ở đây nó chạy đúng script cài đặt cũ.",
            en: "User data runs configuration scripts after the instance starts; here it runs the same installation script.",
          },
        },
        {
          mark: ["ec2B", "ec2C"],
          tone: "bad",
          badge: { vi: "45 phút", en: "45 min" },
          caption: {
            vi: "Script vẫn chạy trong khoảng 45 phút, nên không đạt RTO 5 phút.",
            en: "The script still runs for about 45 minutes, so the 5-minute RTO is missed.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "User data không làm cài đặt nhanh hơn.", en: "User data does not make the installation faster." },
      },
    },
  ],
};

export default spec;
