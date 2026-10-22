// Practice test 2, question 3: EC2 instances reach S3 and DynamoDB with an IAM role instead of stored credentials.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const storedCaption: Bilingual = {
  vi: "Giữ AWS credentials trên EC2 instance, dù ở dạng văn bản thô hay đã mã hoá, là thực hành bảo mật kém: phải tự phân phối credential dài hạn tới từng instance và cập nhật từng instance mỗi lần xoay vòng.",
  en: "Keeping AWS credentials on the EC2 instance, encrypted or in plain text, is a bad security practice: long-term credentials must be distributed to each instance and updated on every instance at rotation time.",
};

const stored = (option: string, via: string, flowCaption: Bilingual): ScenarioSpec => ({
  option,
  hide: ["role", "cfg", "cli", "enc"].filter((id) => id !== via),
  steps: [
    { flow: [["app", via, "s3"], ["app", via, "ddb"]], tone: "warn", caption: flowCaption },
    { mark: via, tone: "bad", badge: { vi: "credential dài hạn", en: "long-term creds" }, caption: storedCaption },
  ],
  verdict: { works: false, caption: { vi: "Credential dài hạn nằm trên instance.", en: "Long-term credentials live on the instance." } },
});

const spec: IllustrationSpec = {
  questionId: 119516073,
  cols: 3.6,
  rows: 2.3,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng web", en: "Web app" }, sub: "EC2 instances", at: [0, 0.65] },
    { id: "role", label: "IAM role", sub: "instance profile", at: [1.3, 0.65] },
    { id: "cfg", label: "Access keys", sub: { vi: "trong file cấu hình", en: "in a config file" }, kind: "ghost", at: [1.3, 0.65] },
    { id: "cli", label: "AWS CLI", sub: { vi: "credential IAM user", en: "IAM user credentials" }, kind: "ghost", at: [1.3, 0.65] },
    { id: "enc", label: { vi: "Key đã mã hoá", en: "Encrypted keys" }, sub: { vi: "thư viện tự viết", en: "custom library" }, kind: "ghost", at: [1.3, 0.65] },
    { id: "s3", label: "Amazon S3", sub: { vi: "ảnh tải lên", en: "uploaded photos" }, kind: "data", at: [2.6, 0] },
    { id: "ddb", label: "Amazon DynamoDB", sub: "leaderboard", kind: "data", at: [2.6, 1.3] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["cfg", "cli", "enc"],
      steps: [
        {
          flow: ["app", "role"],
          badge: { vi: "tạm thời", en: "temporary" },
          caption: {
            vi: "Khi khởi chạy EC2 instance, bạn gắn một IAM role qua instance profile; role cung cấp credential tạm thời cho ứng dụng chạy trên instance.",
            en: "When the EC2 instance is launched, an IAM role is associated through the instance profile; the role supplies temporary credentials to the applications on the instance.",
          },
        },
        {
          flow: [["role", "s3"], ["role", "ddb"]],
          caption: {
            vi: "Ứng dụng dùng credential tạm thời đó để ký các API request tới Amazon S3 và DynamoDB; không có credential dài hạn nào phải phân phối hay xoay vòng thủ công.",
            en: "Applications sign their API requests to Amazon S3 and DynamoDB with those temporary credentials; no long-term credentials are distributed or rotated by hand.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Credential tạm thời, không lưu trên instance.", en: "Temporary credentials, nothing stored on the instance." } },
    },
    stored("b", "cfg", {
      vi: "Access key ID và secret access key nằm trong file cấu hình của code ứng dụng; instance dùng chúng để gọi S3 và DynamoDB.",
      en: "The access key ID and secret access key sit in a configuration file in the application code; the instances use them to call S3 and DynamoDB.",
    }),
    stored("c", "cli", {
      vi: "AWS CLI được cấu hình bằng credential của một IAM user; code gọi shell script để truy cập S3 và DynamoDB.",
      en: "The AWS CLI is configured with an IAM user's credentials; the code invokes shell scripts to reach S3 and DynamoDB.",
    }),
    stored("d", "enc", {
      vi: "Credential được mã hoá bằng thư viện tự viết và lưu trong thư mục bí mật; ứng dụng giải mã rồi gọi API.",
      en: "The credentials are encrypted with a custom library and kept in a secret directory; the application decrypts them and calls the APIs.",
    }),
  ],
};

export default spec;
