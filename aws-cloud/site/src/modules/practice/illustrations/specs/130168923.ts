// Practice test 6, question 50: a Cognito identity pool issues temporary AWS credentials for S3, and an S3 gateway
// endpoint keeps the private-subnet application off the internet. Captions follow the question's explanation.
// Additional sources:
// - Identity pools exchange identities for temporary AWS credentials scoped by IAM roles:
//   https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html
// - Gateway endpoints for S3: https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
import type { IllustrationSpec, StepSpec } from "../types";

const signIn: StepSpec = {
  flow: ["user", "app", "pool"],
  badge: "sign-in",
  caption: {
    vi: "Người dùng đăng nhập; Cognito user pool xác thực họ (tên đăng nhập, mật khẩu).",
    en: "The user signs in; the Cognito user pool authenticates them (username, password).",
  },
};

const credentials: StepSpec[] = [
  {
    flow: ["app", "idpool"],
    badge: "token",
    caption: {
      vi: "Identity pool tích hợp với user pool: token của người dùng được đổi lấy thông tin xác thực AWS.",
      en: "The identity pool integrates with the user pool: the user's token is exchanged for AWS credentials.",
    },
  },
  {
    flow: ["idpool", "app"],
    back: true,
    badge: { vi: "tạm thời", en: "temporary" },
    caption: {
      vi: "Identity pool cấp thông tin xác thực AWS tạm thời, giới hạn bởi IAM role và policy, ví dụ chỉ được ghi vào prefix S3 của chính người dùng.",
      en: "The identity pool issues temporary AWS credentials scoped by IAM roles and policies, for example only to the user's own S3 prefix.",
    },
  },
];

const privatePath: StepSpec = {
  flow: ["app", "vpce", "s3"],
  caption: {
    vi: "Ứng dụng ở private subnet không có internet; S3 gateway endpoint cho phép kết nối riêng tư tới S3 qua mạng AWS.",
    en: "The application in the private subnet has no internet access; an S3 gateway endpoint gives it private connectivity to S3 over the AWS network.",
  },
};

const spec: IllustrationSpec = {
  questionId: 130168923,
  cols: 4.8,
  rows: 2.9,
  nodes: [
    { id: "user", label: { vi: "Người dùng", en: "Users" }, sub: { vi: "đã đăng nhập", en: "signed in" }, kind: "actor", at: [0, 1.2] },
    { id: "pool", label: "Cognito user pool", sub: { vi: "xác thực", en: "authentication" }, at: [1.2, 0.1] },
    { id: "idpool", label: "Identity pool", sub: { vi: "thông tin AWS", en: "AWS credentials" }, at: [2.4, 0.1] },
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, sub: "private subnet", at: [1.2, 1.2] },
    { id: "vpce", label: "S3 endpoint", sub: "gateway", at: [2.4, 1.2] },
    { id: "lambda", label: "Lambda proxy", at: [2.4, 2.3] },
    { id: "s3", label: "Amazon S3", sub: { vi: "tài liệu khoá học", en: "course documents" }, kind: "data", at: [3.7, 1.2] },
  ],
  zones: [{ id: "vpc", label: "VPC", tone: "vpc", from: [1.2, 1.2], to: [2.4, 1.2], pad: 20 }],
  scenarios: [
    {
      option: "a",
      hide: ["lambda"],
      steps: [
        signIn,
        ...credentials,
        {
          flow: ["app", "vpce", "s3"],
          caption: {
            vi: "Request tới S3 được ký bằng thông tin xác thực tạm thời đó, nên quyền truy cập chi tiết theo từng người dùng.",
            en: "Requests to S3 are signed with those temporary credentials, so access is fine-grained per user.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Phân quyền S3 chi tiết, không có thông tin xác thực dài hạn.",
          en: "Fine-grained S3 access with no long-lived credentials.",
        },
      },
    },
    {
      option: "c",
      hide: ["lambda"],
      steps: [signIn, ...credentials, privatePath],
      verdict: {
        works: true,
        caption: {
          vi: "Giữ nguyên kiến trúc mạng riêng tư, không đi qua internet.",
          en: "The private network architecture stays; nothing goes over the internet.",
        },
      },
    },
    {
      option: "b",
      hide: ["idpool", "lambda"],
      steps: [
        signIn,
        {
          stop: ["vpce", "s3"],
          badge: { vi: "không có quyền", en: "no AWS creds" },
          caption: {
            vi: "User pool chỉ xác thực, không cấp quyền truy cập tài nguyên AWS như S3; cần identity pool để có thông tin xác thực AWS tạm thời.",
            en: "A user pool provides authentication, not authorization to AWS resources like S3; an identity pool is needed for temporary AWS credentials.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Thiếu bước cấp quyền truy cập S3.",
          en: "The step that grants S3 access is missing.",
        },
      },
    },
    {
      option: "d",
      hide: ["idpool", "vpce"],
      steps: [
        signIn,
        {
          flow: ["app", "lambda", "s3"],
          times: 3,
          tone: "warn",
          badge: "proxy",
          caption: {
            vi: "Mọi lượt tải lên/tải xuống đi qua Lambda proxy: thêm độ trễ, chi phí và độ phức tạp, và không tận dụng tích hợp Cognito + IAM.",
            en: "Every upload and download goes through a Lambda proxy: more latency, cost and complexity, without the native Cognito + IAM integration.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không phải cách có khả năng mở rộng và phân quyền chi tiết.",
          en: "Not a scalable, fine-grained access pattern.",
        },
      },
    },
    {
      option: "e",
      hide: ["idpool", "lambda"],
      steps: [
        signIn,
        {
          flow: ["app", "vpce"],
          tone: "warn",
          badge: "x-user-id",
          caption: {
            vi: "Ứng dụng gửi Cognito user ID trong một HTTP header tuỳ chỉnh.",
            en: "The application sends the Cognito user ID in a custom HTTP header.",
          },
        },
        {
          stop: ["vpce", "s3"],
          caption: {
            vi: "Bucket policy không đánh giá Cognito user ID trong header tuỳ chỉnh; các context key như aws:userid đến từ request đã ký bằng thông tin IAM. Tin vào header do người dùng gửi là rủi ro bảo mật.",
            en: "Bucket policies do not evaluate Cognito user IDs in custom headers; context keys such as aws:userid come from requests signed with IAM credentials. Trusting user-supplied headers is a security risk.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không xác thực danh tính một cách an toàn.",
          en: "Identity is not securely validated.",
        },
      },
    },
  ],
};

export default spec;
