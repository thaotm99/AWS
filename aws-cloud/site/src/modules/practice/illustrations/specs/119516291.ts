// Practice test 4, question 39: short-lived credentials from Lambda to RDS PostgreSQL with IAM database authentication.
// Captions follow the question's explanation (authentication token generated with Signature Version 4, 15-minute
// lifetime, SSL-encrypted traffic, an IAM role attached to the function; SSM, security groups and VPC placement do
// not change the authentication layer).
import type { IllustrationSpec, StepSpec } from "../types";

const role: StepSpec = {
  flow: ["role", "lambda"],
  badge: "IAM role",
  caption: {
    vi: "IAM role được gắn vào Lambda function, cung cấp danh tính và quyền IAM để function xác thực với database.",
    en: "An IAM role is attached to the Lambda function, giving it the IAM identity and permissions to authenticate to the database.",
  },
};

const token: StepSpec = {
  flow: ["lambda", "rds"],
  badge: "token · 15 min",
  caption: {
    vi: "Lambda kết nối bằng authentication token (tạo bằng AWS Signature Version 4, sống 15 phút) thay cho mật khẩu; lưu lượng được mã hoá bằng SSL.",
    en: "Lambda connects with an authentication token (generated with AWS Signature Version 4, valid for 15 minutes) instead of a password; traffic is encrypted with SSL.",
  },
};

const noStore: StepSpec = {
  mark: "rds",
  tone: "ok",
  caption: {
    vi: "Không cần lưu thông tin đăng nhập trong database, vì xác thực được quản lý tập trung bằng IAM.",
    en: "No user credentials are stored in the database, because authentication is managed centrally with IAM.",
  },
};

const password: StepSpec = {
  flow: ["lambda", "rds"],
  tone: "warn",
  badge: "user / password",
  caption: {
    vi: "Lambda vẫn kết nối bằng cặp username và password.",
    en: "Lambda still connects with a username and password.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119516291,
  cols: 4.6,
  rows: 2.2,
  nodes: [
    { id: "api", label: "API Gateway", kind: "actor", at: [0, 1.2] },
    { id: "lambda", label: "AWS Lambda", at: [1.2, 1.2] },
    { id: "role", label: "IAM role", at: [1.2, 0.1] },
    { id: "ssm", label: "Parameter Store", sub: "SSM", kind: "data", at: [1.2, 0.1] },
    { id: "sg", label: "Security group", sub: "RDS", at: [2.4, 1.2] },
    { id: "rds", label: "RDS PostgreSQL", kind: "data", at: [3.6, 1.2] },
  ],
  zones: [{ id: "vpc", label: "VPC", tone: "vpc", from: [1.2, 1.2], to: [3.6, 1.2], pad: 14 }],
  links: [["api", "lambda"]],
  scenarios: [
    {
      option: "b",
      hide: ["ssm", "sg", "vpc"],
      steps: [role, token, noStore],
      verdict: {
        works: true,
        caption: {
          vi: "IAM database authentication thay mật khẩu bằng token ngắn hạn (cần IAM role cho Lambda).",
          en: "IAM database authentication replaces the password with short-lived tokens (with an IAM role on Lambda).",
        },
      },
    },
    {
      option: "e",
      hide: ["ssm", "sg", "vpc"],
      steps: [role, token, noStore],
      verdict: {
        works: true,
        caption: {
          vi: "IAM authentication tới RDS được thực hiện thông qua IAM role gắn vào Lambda.",
          en: "IAM authentication to RDS is achieved by attaching an IAM role to the Lambda function.",
        },
      },
    },
    {
      option: "a",
      hide: ["role", "sg", "vpc"],
      steps: [
        {
          flow: ["ssm", "lambda"],
          tone: "warn",
          caption: {
            vi: "SSM Parameter Store lưu trữ an toàn cấu hình và secret như mật khẩu; Lambda tự viết logic xoay vòng thông tin đăng nhập.",
            en: "SSM Parameter Store securely stores configuration data and secrets such as passwords; Lambda embeds its own rotation logic.",
          },
        },
        password,
        {
          mark: "lambda",
          tone: "bad",
          badge: "overkill",
          caption: {
            vi: "Cách này phức tạp quá mức cần thiết và vẫn dùng mật khẩu, không phải thông tin xác thực ngắn hạn do IAM cấp.",
            en: "This is overkill and still relies on passwords rather than short-lived IAM credentials.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Vẫn xác thực bằng mật khẩu.", en: "Still password authentication." },
      },
    },
    {
      option: "c",
      hide: ["role", "ssm", "vpc"],
      steps: [
        {
          flow: ["lambda", "sg", "rds"],
          tone: "warn",
          badge: "user / password",
          caption: {
            vi: "Giới hạn security group của RDS chỉ cho security group của Lambda làm tăng bảo mật ở tầng mạng.",
            en: "Restricting the RDS security group to the Lambda's security group tightens network-level security.",
          },
        },
        {
          mark: "rds",
          tone: "bad",
          caption: {
            vi: "Nhưng tầng xác thực không đổi: vẫn là username và password.",
            en: "But the authentication layer does not change: it is still a username and password.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không thay đổi cách xác thực.", en: "Authentication is unchanged." },
      },
    },
    {
      option: "d",
      hide: ["role", "ssm", "sg"],
      steps: [
        password,
        {
          mark: "rds",
          tone: "bad",
          caption: {
            vi: "Đặt Lambda trong VPC tăng bảo mật mạng, nhưng tầng xác thực vẫn dùng mật khẩu.",
            en: "Deploying Lambda in a VPC improves network security, but authentication still uses a password.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không thay đổi cách xác thực.", en: "Authentication is unchanged." },
      },
    },
  ],
};

export default spec;
