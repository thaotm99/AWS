// Practice test 2, question 4: SFTP uploads from legacy vendors into an S3 data lake with AWS Transfer Family.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516157,
  cols: 4.6,
  rows: 2.3,
  nodes: [
    { id: "vendor", label: { vi: "Nhà cung cấp", en: "Vendors" }, sub: { vi: "SFTP client cũ", en: "legacy SFTP clients" }, kind: "onprem", at: [0, 1.2] },
    { id: "tf", label: "Transfer Family", sub: "SFTP endpoint", at: [1.3, 1.2] },
    { id: "ec2", label: "EC2 + OpenSSH", sub: { vi: "cron đẩy lên S3", en: "cron uploads to S3" }, kind: "ghost", at: [1.3, 1.2] },
    { id: "appflow", label: "Amazon AppFlow", sub: { vi: "connector SaaS", en: "SaaS connectors" }, kind: "ghost", at: [1.3, 1.2] },
    { id: "idp", label: "Identity provider", sub: { vi: "Cognito / tuỳ chỉnh", en: "Cognito / custom" }, at: [1.3, 0] },
    { id: "r53", label: "Route 53", sub: "private hosted zone", kind: "ghost", at: [1.3, 0] },
    { id: "role", label: "IAM role", sub: { vi: "theo từng vendor", en: "per vendor" }, at: [2.5, 1.2] },
    { id: "s3", label: "Amazon S3", sub: "s3://…/vendor1/", kind: "data", at: [3.6, 1.2] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["ec2", "appflow", "idp", "r53"],
      steps: [
        {
          flow: ["vendor", "tf"],
          badge: "SFTP",
          caption: {
            vi: "Endpoint AWS Transfer Family bật SFTP và được quản lý hoàn toàn; nhà cung cấp tiếp tục dùng SFTP client hiện có để tải file lên.",
            en: "A fully managed AWS Transfer Family endpoint with SFTP enabled lets vendors keep using their existing SFTP clients to upload files.",
          },
        },
        {
          flow: ["tf", "role", "s3"],
          badge: "vendor1/",
          caption: {
            vi: "Mỗi SFTP user được ánh xạ tới một IAM role chỉ cho phép ghi vào bucket hoặc prefix được chỉ định, đảm bảo đặc quyền tối thiểu và tránh rò rỉ dữ liệu giữa các nhà cung cấp.",
            en: "Each SFTP user maps to an IAM role that only allows its designated bucket or prefix, enforcing least privilege and preventing data leakage between vendors.",
          },
        },
        {
          mark: "s3",
          tone: "ok",
          badge: "CloudTrail",
          caption: {
            vi: "File được lưu trực tiếp vào Amazon S3; mô hình dựa trên role còn cho phép kiểm toán qua AWS CloudTrail.",
            en: "Files land directly in Amazon S3, and the role-based model also allows auditing through AWS CloudTrail.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "SFTP được quản lý, ghi thẳng vào S3, phân quyền theo role.", en: "Managed SFTP straight into S3, role-scoped access." } },
    },
    {
      option: "c",
      hide: ["ec2", "appflow", "r53"],
      steps: [
        {
          flow: ["vendor", "tf", "idp"],
          badge: { vi: "liên kết danh tính", en: "federation" },
          caption: {
            vi: "Transfer Family tích hợp với identity provider (Amazon Cognito, SAML 2.0 bên ngoài hoặc hệ thống tuỳ chỉnh); người dùng xác thực qua identity provider đó.",
            en: "Transfer Family integrates with an identity provider (Amazon Cognito, an external SAML 2.0 provider or a custom system); users authenticate through it.",
          },
        },
        {
          flow: ["idp", "role", "s3"],
          badge: "vendor1/",
          caption: {
            vi: "Người dùng được ánh xạ động tới IAM role theo thuộc tính như username hay nhóm; policy của role giới hạn truy cập S3 chi tiết, ví dụ theo thư mục.",
            en: "Users are mapped dynamically to IAM roles by attributes such as username or group; the role's policies enforce fine-grained S3 access, for example per folder.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Quản lý danh tính tập trung, không có máy chủ SFTP.", en: "Central identity management, no SFTP servers." } },
    },
    {
      option: "b",
      hide: ["tf", "appflow", "idp", "r53", "role"],
      steps: [
        {
          flow: ["vendor", "ec2", "s3"],
          tone: "warn",
          caption: {
            vi: "Máy chủ SFTP tự dựng trên EC2 nhận file, rồi cron job đẩy file lên S3. Về kỹ thuật thì khả thi.",
            en: "A self-built SFTP server on EC2 receives the files and cron jobs push them to S3. Technically feasible.",
          },
        },
        {
          mark: "ec2",
          tone: "bad",
          badge: { vi: "vá · HA · backup", en: "patch · HA · backup" },
          caption: {
            vi: "Nhưng phải tự vá lỗi, gia cố bảo mật, đảm bảo tính sẵn sàng cao, sao lưu và mở rộng — không đáp ứng yêu cầu dùng dịch vụ được quản lý hoàn toàn.",
            en: "But patching, security hardening, high availability, backups and scaling are all on the company — it fails the fully managed requirement.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Máy chủ SFTP phải tự vận hành.", en: "An SFTP server to operate." } },
    },
    {
      option: "d",
      hide: ["ec2", "appflow", "idp"],
      steps: [
        {
          flow: ["vendor", "tf", "role", "s3"],
          caption: {
            vi: "Bản thân Transfer Family với SFTP vẫn nhận được file vào S3.",
            en: "Transfer Family with SFTP still gets the files into S3.",
          },
        },
        {
          mark: "r53",
          tone: "bad",
          badge: { vi: "không cần thiết", en: "unnecessary" },
          caption: {
            vi: "Private hosted zone của Route 53 dùng để phân giải DNS nội bộ, không định tuyến subdomain công khai tới endpoint SFTP; Transfer Family đã có sẵn hostname, nên thêm subdomain chỉ tăng độ phức tạp.",
            en: "Route 53 private hosted zones resolve internal DNS and do not route public subdomains to SFTP endpoints; Transfer Family already provides hostnames, so the subdomains only add complexity.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Route 53 không giải quyết việc phân quyền.", en: "Route 53 adds nothing to access control." } },
    },
    {
      option: "e",
      hide: ["tf", "ec2", "idp", "r53", "role"],
      steps: [
        {
          stop: ["vendor", "appflow"],
          caption: {
            vi: "Amazon AppFlow là dịch vụ tích hợp ứng dụng SaaS dựa trên API như Salesforce hay Zendesk; nó không hỗ trợ tích hợp dựa trên SFTP với hệ thống cũ.",
            en: "Amazon AppFlow integrates API-based SaaS applications such as Salesforce or Zendesk; it does not support SFTP-based integrations with legacy systems.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "AppFlow không nhận được SFTP.", en: "AppFlow cannot take SFTP uploads." } },
    },
  ],
};

export default spec;
