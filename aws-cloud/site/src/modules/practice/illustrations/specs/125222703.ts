// Practice test 1, question 10: IAM Identity Center with AD Connector to the on-premises Active Directory.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222703,
  cols: 4,
  rows: 2.4,
  nodes: [
    { id: "dev", label: { vi: "Lập trình viên", en: "Developers" }, kind: "actor", at: [0, 0.2] },
    { id: "idc", label: "IAM Identity Center", sub: "permission sets", at: [1.45, 0.2] },
    { id: "idp", label: "Open-source IdP", sub: { vi: "trên EC2", en: "on EC2" }, at: [1.45, 0.2] },
    { id: "ct", label: "AWS Control Tower", sub: { vi: "role tạo tay", en: "hand-made roles" }, at: [1.45, 0.2] },
    { id: "adc", label: "AD Connector", sub: "proxy", at: [1.45, 1.4] },
    { id: "mad", label: "AWS Managed AD", sub: { vi: "trust với on-prem", en: "trust to on-prem" }, at: [1.45, 1.4] },
    { id: "ad", label: "Active Directory", sub: "on-premises", kind: "onprem", at: [2.9, 1.4] },
    { id: "accts", label: { vi: "Các tài khoản AWS", en: "AWS accounts" }, sub: "AWS Organizations", kind: "data", at: [2.9, 0.2] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["idp", "ct", "mad"],
      steps: [
        { flow: ["dev", "idc"], badge: "SSO", caption: { vi: "Lập trình viên đăng nhập qua cổng single sign-on của IAM Identity Center.", en: "Developers sign in through the IAM Identity Center single sign-on portal." } },
        {
          flow: ["idc", "adc", "ad"],
          caption: {
            vi: "AD Connector làm proxy tới Active Directory on-premises, nên không phải triển khai hay quản lý thêm directory nào trên cloud.",
            en: "AD Connector acts as a proxy to the on-premises Active Directory, so no separate directory has to be deployed or managed in the cloud.",
          },
        },
        {
          flow: ["idc", "accts"],
          badge: { vi: "theo nhóm AD", en: "by AD group" },
          caption: {
            vi: "Permission set gán quyền vào các tài khoản AWS dựa trên thành viên nhóm AD hiện có; quản lý tập trung cho mọi tài khoản trong AWS Organizations.",
            en: "Permission sets grant access to AWS accounts based on existing AD group membership, managed centrally for every account in AWS Organizations.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Tập trung, ít công vận hành nhất.", en: "Centralised, least operational effort." } },
    },
    {
      option: "a",
      hide: ["idp", "ct", "adc", "idc"],
      steps: [
        { flow: ["mad", "ad"], tone: "warn", badge: "trust", caption: { vi: "AWS Managed Microsoft AD trên AWS được thiết lập trust với AD on-premises; IAM role gắn với nhóm AD.", en: "AWS Managed Microsoft AD is set up in AWS with a trust to the on-premises AD; IAM roles are linked to AD groups." } },
        { flow: ["dev", "accts"], tone: "warn", caption: { vi: "Đáp ứng được về kỹ thuật.", en: "It meets the technical need." } },
        {
          mark: "mad",
          tone: "bad",
          badge: { vi: "thêm directory", en: "extra directory" },
          caption: {
            vi: "Nhưng phải duy trì thêm một directory, theo dõi trust và tự ánh xạ role — thêm chi phí và công bảo trì so với IAM Identity Center.",
            en: "But another directory must be maintained, the trust monitored and role mappings managed by hand — more cost and maintenance than IAM Identity Center.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Tốn công vận hành hơn.", en: "More operational overhead." } },
    },
    {
      option: "c",
      hide: ["idc", "ct", "adc", "mad"],
      steps: [
        { flow: [["dev", "idp", "accts"], ["idp", "ad"]], tone: "warn", caption: { vi: "IdP mã nguồn mở trên EC2 đồng bộ với AD và liên kết vào các tài khoản bằng SAML.", en: "An open-source IdP on EC2 syncs with AD and federates into the accounts with SAML." } },
        {
          mark: "idp",
          tone: "bad",
          badge: { vi: "vá · HA · đồng bộ", en: "patch · HA · sync" },
          caption: {
            vi: "Phải tự mở rộng, vá lỗi, đảm bảo tính sẵn sàng cao và đồng bộ với AD; không có permission set hay tầm nhìn đa tài khoản như IAM Identity Center.",
            en: "Scaling, patching, high availability and AD sync are on the company, with no permission sets or multi-account visibility like IAM Identity Center.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "IdP tự vận hành.", en: "A self-run IdP." } },
    },
    {
      option: "d",
      hide: ["idc", "idp", "adc", "mad", "ad"],
      steps: [
        { flow: ["dev", "ct", "accts"], tone: "warn", badge: "CLI assume-role", caption: { vi: "Control Tower dựng môi trường nhiều tài khoản; IAM role được tạo và gán quyền thủ công ở từng tài khoản.", en: "Control Tower sets up the multi-account environment; IAM roles are created and assigned by hand in each account." } },
        {
          mark: "accts",
          tone: "bad",
          badge: { vi: "từng tài khoản", en: "per account" },
          caption: {
            vi: "Cách này không mở rộng được, dễ sai và không có quản lý quyền tập trung giữa các tài khoản.",
            en: "It does not scale, is error-prone and has no central access management across accounts.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Thủ công, không tập trung.", en: "Manual, not centralised." } },
    },
  ],
};

export default spec;
