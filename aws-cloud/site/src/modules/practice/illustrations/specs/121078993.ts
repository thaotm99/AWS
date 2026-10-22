// Practice test 3, question 23: an application on EC2 reaches DynamoDB through an IAM role assigned with an
// instance profile. Captions follow the question's explanation. Additional source:
// - "Have the application retrieve a set of temporary credentials and use them.":
//   https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html
import type { IllustrationSpec, StepSpec } from "../types";

const badPractice = {
  vi: "Không bao giờ lưu access credentials của IAM user trong Amazon S3, ổ lưu trữ cục bộ hay cơ sở dữ liệu; đó là cách làm kém an toàn. Nên dùng IAM role để cấp quyền cho EC2 truy cập tài nguyên AWS khác.",
  en: "Never store an IAM user's access credentials in Amazon S3, local storage or a database; it is a security bad practice. Use IAM roles to give EC2 instances access to other AWS resources.",
};
const keysVerdict = { works: false, caption: { vi: "Credentials dài hạn bị lưu kèm ứng dụng.", en: "Long-term credentials are stored with the app." } };
const keysCall: StepSpec = {
  flow: ["app", "ddb"],
  tone: "warn",
  caption: {
    vi: "Ứng dụng dùng access key của IAM user để gọi bảng DynamoDB.",
    en: "The application calls the DynamoDB table with the IAM user's access keys.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121078993,
  cols: 4.2,
  rows: 2.8,
  nodes: [
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, sub: "EC2 instance", kind: "actor", at: [0, 1] },
    { id: "prof", label: "Instance profile", sub: { vi: "chứa IAM role", en: "holds an IAM role" }, at: [1.6, 1] },
    { id: "s3", label: "S3 bucket", sub: { vi: "access key của user", en: "user's access keys" }, kind: "ghost", at: [1.6, 0.1] },
    { id: "disk", label: { vi: "Ổ cục bộ", en: "Local storage" }, sub: { vi: "access key của user", en: "user's access keys" }, kind: "ghost", at: [1.6, 1.9] },
    { id: "trust", label: "Trust policy", sub: { vi: "+ EC2 instance?", en: "+ EC2 instance?" }, kind: "ghost", at: [1.6, 0.1] },
    { id: "ddb", label: "Amazon DynamoDB", sub: "table", kind: "data", at: [3.2, 1] },
  ],
  scenarios: [
    {
      option: "d",
      hide: ["s3", "disk", "trust"],
      steps: [
        {
          mark: "prof",
          tone: "ok",
          badge: "service role",
          caption: {
            vi: "Một IAM service role có quyền trên bảng DynamoDB. Để dùng với EC2, role được đặt trong instance profile, một container cho role gắn vào instance.",
            en: "An IAM service role holds permissions on the DynamoDB table. To use it with EC2, the role is stored in an instance profile, a container for a role attached to the instance.",
          },
        },
        {
          flow: ["prof", "app"],
          back: true,
          badge: { vi: "credentials tạm thời", en: "temporary credentials" },
          caption: {
            vi: "Ứng dụng trên instance lấy một bộ credentials tạm thời của role và dùng chúng để ký request.",
            en: "The application on the instance retrieves a set of temporary credentials for the role and uses them to sign requests.",
          },
        },
        {
          flow: ["app", "ddb"],
          caption: {
            vi: "Ứng dụng truy cập bảng DynamoDB với quyền của role; không có access key nào được lưu trong mã hay trên ổ đĩa.",
            en: "The application accesses the DynamoDB table with the role's permissions; no access keys are stored in code or on disk.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: { vi: "Service role gán qua instance profile.", en: "A service role assigned through an instance profile." } },
    },
    {
      option: "a",
      hide: ["prof", "disk", "trust"],
      steps: [
        {
          flow: ["s3", "app"],
          tone: "warn",
          badge: "access key",
          caption: {
            vi: "Credentials của một IAM user được lưu trong S3 bucket và ứng dụng đọc trực tiếp chúng.",
            en: "An IAM user's credentials are stored in an S3 bucket and the application reads them directly.",
          },
        },
        keysCall,
        { mark: "s3", tone: "bad", caption: badPractice },
      ],
      verdict: keysVerdict,
    },
    {
      option: "b",
      hide: ["prof", "s3", "trust"],
      steps: [
        {
          flow: ["disk", "app"],
          tone: "warn",
          badge: "access key",
          caption: {
            vi: "Credentials của một IAM user được lưu trên ổ cục bộ và ứng dụng đọc trực tiếp chúng.",
            en: "An IAM user's credentials are stored on local storage and the application reads them directly.",
          },
        },
        keysCall,
        { mark: "disk", tone: "bad", caption: badPractice },
      ],
      verdict: keysVerdict,
    },
    {
      option: "c",
      hide: ["s3", "disk"],
      steps: [
        {
          mark: "trust",
          tone: "bad",
          caption: {
            vi: "Không cần thêm EC2 instance vào trust policy: khi tạo IAM service role cho EC2, role đã tự động có Amazon EC2 là trusted entity.",
            en: "There is no need to add the EC2 instance to the trust policy: a service role created for EC2 automatically has Amazon EC2 as a trusted entity.",
          },
        },
        {
          mark: "prof",
          tone: "warn",
          caption: {
            vi: "Bước cần làm là đặt role trong instance profile và gắn profile đó vào instance.",
            en: "What is needed is to store the role in an instance profile and attach that profile to the instance.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Bước trust policy là không cần thiết.", en: "The trust policy step is unnecessary." } },
    },
  ],
};

export default spec;
