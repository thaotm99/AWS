import { useLang } from "../../../lib/lang";
import CaseSim, { type CaseScenario } from "../global-infra/CaseSim";

type Lang = ReturnType<typeof useLang>;

// MFTech staff sign in to many AWS accounts with the identities the company already has.
// Compares IAM users per account, an IAM SAML identity provider per account, and IAM Identity Center
// with an AD Connector / AWS Managed Microsoft AD / external IdP identity source.
// Facts: IAM best practices (federation + IAM Identity Center for human users), IAM SAML provider must
// be in the same account as the role (id_roles_providers_create_saml.html), permission sets create
// roles in each assigned account (permissionsetsconcept.html), AD Connector has no transitive trusts and
// one connector per domain (directory_ad_connector.html), Identity Center connects one AD Connector or one
// Managed AD at a time and needs AWS Managed Microsoft AD for several domains/forests
// (manage-your-identity-source-ad.html), two-way trust required for IAM Identity Center
// (ms_ad_setup_trust.html), SAML cannot query the IdP so users/groups must be provisioned (SCIM or
// manual) before assignments (manage-your-identity-source-idp.html).

function scenarios(L: Lang): CaseScenario[] {
  return [
    {
      name: L({ vi: "Nhân viên đăng nhập 6 account bằng tài khoản AD", en: "Staff sign in to 6 accounts with their AD account" }),
      request: L({ vi: "Đăng nhập account prod", en: "Sign in to the prod account" }),
      from: L({ vi: "nhân viên có tài khoản trong AD on-premises", en: "an employee with an account in on-premises AD" }),
      nodes: [
        { id: "emp", x: 20, y: 97, w: 80, l1: L({ vi: "Nhân viên", en: "Employee" }), user: true },
        { id: "ad", x: 130, y: 97, w: 150, l1: "Active Directory", l2: "on-premises" },
        { id: "adc", x: 315, y: 97, w: 160, l1: "AD Connector", l2: L({ vi: "chuyển tiếp xác thực", en: "forwards authentication" }) },
        { id: "saml", x: 315, y: 97, w: 160, l1: "IAM SAML IdP", l2: L({ vi: "tạo tại từng account", en: "created in each account" }) },
        { id: "iamu", x: 315, y: 97, w: 160, l1: "IAM user", l2: L({ vi: "tạo tại từng account", en: "created in each account" }) },
        { id: "idc", x: 505, y: 97, w: 160, l1: "IAM Identity Center", l2: "permission set" },
        { id: "role", x: 505, y: 97, w: 160, l1: "IAM role + policy", l2: L({ vi: "tạo tại từng account", en: "created in each account" }) },
        { id: "accts", x: 695, y: 97, w: 115, l1: L({ vi: "6 account", en: "6 accounts" }), l2: "dev · prod · …" },
      ],
      links: [
        { a: "emp", b: "ad" }, { a: "ad", b: "adc" }, { a: "ad", b: "saml" }, { a: "emp", b: "iamu" },
        { a: "adc", b: "idc" }, { a: "saml", b: "role" }, { a: "iamu", b: "accts" },
        { a: "idc", b: "accts" }, { a: "role", b: "accts" },
      ],
      start: "emp",
      choices: {
        label: L({ vi: "Phương án", en: "Option" }),
        options: [L({ vi: "IAM user tại từng account", en: "IAM users in each account" }), L({ vi: "IAM SAML 2.0 federation", en: "IAM SAML 2.0 federation" }), "IAM Identity Center + AD Connector"],
        initial: 0,
      },
      run: (v) => v === 0
        ? { hide: ["ad", "adc", "saml", "idc", "role"], back: false, steps: [
              { at: "iamu", state: "change", tag: "x6", msg: L({ vi: "Mỗi nhân viên có 6 IAM user với 6 mật khẩu riêng, tách rời tài khoản AD. Access key của IAM user là credentials dài hạn.", en: "Each employee has 6 IAM users with 6 separate passwords, detached from their AD account. An IAM user's access keys are long-term credentials." }) },
              { at: "accts", state: "pass", msg: L({ vi: "Đăng nhập được, nhưng khi nhân viên nghỉ việc, quản trị viên phải xoá user tại cả 6 account.", en: "Sign-in works, but when an employee leaves, administrators must delete the user in all 6 accounts." }) },
            ],
            ok: false, result: L({ vi: "Danh tính bị nhân bản ở mọi account. AWS khuyến nghị người dùng là con người truy cập qua federation với credentials tạm thời, không dùng IAM user.", en: "Identities are duplicated in every account. AWS recommends that human users access AWS through federation with temporary credentials, not IAM users." }) }
        : v === 1
          ? { hide: ["adc", "idc", "iamu"], back: false, steps: [
                { at: "ad", state: "pass", msg: L({ vi: "IdP SAML 2.0 của công ty (ví dụ AD FS) xác thực nhân viên bằng tài khoản AD và phát SAML assertion.", en: "The company's SAML 2.0 IdP (for example AD FS) authenticates the employee with the AD account and issues a SAML assertion." }) },
                { at: "saml", state: "change", tag: "x6", msg: L({ vi: "SAML identity provider dùng trong trust policy của role **phải nằm cùng account với role**, nên phải tạo IdP tại cả 6 account.", en: "A SAML identity provider used in a role's trust policy **must be in the same account as the role**, so the IdP must be created in all 6 accounts." }) },
                { at: "role", state: "change", tag: "x6", msg: L({ vi: "Mỗi account cần role và policy riêng, duy trì thủ công. `AssumeRoleWithSAML` của STS trả về credentials tạm thời.", en: "Each account needs its own roles and policies, maintained by hand. STS `AssumeRoleWithSAML` returns temporary credentials." }) },
                { at: "accts", state: "pass", msg: L({ vi: "Nhân viên vào được account bằng tài khoản AD.", en: "The employee reaches the account with the AD account." }) },
              ],
              ok: false, result: L({ vi: "Đúng về bảo mật (không có IAM user, credentials tạm thời), nhưng mỗi account mới lại phải lặp lại IdP, role và policy. Với nhiều account trong Organizations, chi phí vận hành cao hơn IAM Identity Center.", en: "Secure (no IAM users, temporary credentials), but every new account repeats the IdP, roles and policies. With many accounts in Organizations, the operational effort is higher than IAM Identity Center." }) }
          : { hide: ["saml", "role", "iamu"], steps: [
                { at: "ad", state: "pass", msg: L({ vi: "Tài khoản, group và chính sách mật khẩu vẫn quản lý tại AD on-premises.", en: "Accounts, groups and password policies stay in on-premises AD." }) },
                { at: "adc", state: "pass", msg: L({ vi: "Là **directory gateway**: chuyển tiếp yêu cầu xác thực tới AD on-premises, không cache thông tin trên cloud.", en: "A **directory gateway**: it redirects authentication requests to on-premises AD without caching any information in the cloud." }) },
                { at: "idc", state: "pass", msg: L({ vi: "Identity Center đồng bộ user, group từ AD (không đồng bộ mật khẩu). Group AD được gán **permission set** cho các account cần truy cập.", en: "Identity Center synchronizes users and groups from AD (no passwords). AD groups are assigned **permission sets** for the accounts they need." }) },
                { at: "accts", state: "pass", msg: L({ vi: "Identity Center tự tạo IAM role tương ứng tại từng account được gán, và cập nhật role khi permission set thay đổi.", en: "Identity Center creates the matching IAM roles in each assigned account and updates them when the permission set changes." }) },
              ],
              ok: true, result: L({ vi: "Một nơi quản lý quyền cho mọi account, đăng nhập một lần qua AWS access portal. Nhân viên nghỉ việc: vô hiệu hoá tài khoản AD là đủ.", en: "One place to manage access for every account, single sign-on through the AWS access portal. When an employee leaves, disabling the AD account is enough." }) },
    },
    {
      name: L({ vi: "AD có hai forest sau sáp nhập", en: "AD with two forests after a merger" }),
      request: L({ vi: "Đăng nhập AWS access portal", en: "Sign in to the AWS access portal" }),
      from: L({ vi: "user thuộc forest thứ hai", en: "a user in the second forest" }),
      nodes: [
        { id: "emp", x: 20, y: 97, w: 80, l1: L({ vi: "Nhân viên", en: "Employee" }), user: true },
        { id: "idc", x: 135, y: 97, w: 170, l1: "IAM Identity Center", l2: L({ vi: "identity source", en: "identity source" }) },
        { id: "adc", x: 340, y: 97, w: 200, l1: "AD Connector", l2: L({ vi: "1 connector cho 1 domain", en: "1 connector per domain" }) },
        { id: "mad", x: 340, y: 97, w: 200, l1: "AWS Managed Microsoft AD", l2: L({ vi: "trust với AD on-premises", en: "trust with on-premises AD" }) },
        { id: "onp", x: 590, y: 97, w: 210, l1: L({ vi: "AD on-premises", en: "On-premises AD" }), l2: L({ vi: "forest A · forest B", en: "forest A · forest B" }) },
      ],
      links: [{ a: "emp", b: "idc" }, { a: "idc", b: "adc" }, { a: "idc", b: "mad" }, { a: "adc", b: "onp" }, { a: "mad", b: "onp" }],
      start: "emp",
      choices: {
        label: "Directory",
        options: ["AD Connector", L({ vi: "Managed AD + one-way trust", en: "Managed AD + one-way trust" }), L({ vi: "Managed AD + two-way trust", en: "Managed AD + two-way trust" })],
        initial: 0,
      },
      run: (v) => v === 0
        ? { hide: ["mad"], steps: [
              { at: "idc", state: "pass", msg: L({ vi: "Identity Center chỉ kết nối **một** AD Connector hoặc một AWS Managed Microsoft AD tại một thời điểm.", en: "Identity Center connects **one** AD Connector or one AWS Managed Microsoft AD at a time." }) },
              { at: "adc", state: "block", msg: L({ vi: "AD Connector không hỗ trợ transitive trust; mỗi domain cần một AD Connector riêng. User của forest B không xác thực được qua connector của forest A.", en: "AD Connector does not support transitive trusts; each domain needs its own AD Connector. A forest B user cannot authenticate through forest A's connector." }) },
            ],
            ok: false, result: L({ vi: "Với một domain duy nhất, AD Connector là phương án gọn nhất. Cần nhiều domain hoặc forest: dùng AWS Managed Microsoft AD.", en: "With a single domain, AD Connector is the lightest option. For several domains or forests: use AWS Managed Microsoft AD." }) }
        : v === 1
          ? { hide: ["adc"], marks: { "mad-onp": "change" }, steps: [
                { at: "idc", state: "pass", msg: L({ vi: "Identity Center dùng AWS Managed Microsoft AD làm identity source.", en: "Identity Center uses AWS Managed Microsoft AD as its identity source." }) },
                { at: "mad", state: "block", msg: L({ vi: "IAM Identity Center **yêu cầu two-way trust**: AWS Managed Microsoft AD phải truy vấn được user và group trong AD on-premises. EC2, RDS và FSx làm việc được với one-way trust, Identity Center thì không.", en: "IAM Identity Center **requires a two-way trust**: AWS Managed Microsoft AD must be able to query users and groups in on-premises AD. EC2, RDS and FSx work with a one-way trust; Identity Center does not." }) },
              ],
              ok: false, result: L({ vi: "Chuyển trust sang Two-way.", en: "Change the trust to Two-way." }) }
          : { hide: ["adc"], steps: [
                { at: "idc", state: "pass", msg: L({ vi: "Identity Center dùng AWS Managed Microsoft AD làm identity source.", en: "Identity Center uses AWS Managed Microsoft AD as its identity source." }) },
                { at: "mad", state: "pass", msg: L({ vi: "Identity Center làm việc với user của AWS Managed Microsoft AD và của **mọi domain kết nối qua trust**.", en: "Identity Center works with users from AWS Managed Microsoft AD and from **any domain connected through a trust**." }) },
                { at: "onp", state: "pass", msg: L({ vi: "Xác thực pass-through tại AD on-premises; mật khẩu không được đồng bộ lên AWS.", en: "Pass-through authentication at on-premises AD; passwords are not synchronized to AWS." }) },
              ],
              ok: true, result: L({ vi: "User của cả hai forest đăng nhập được, danh tính vẫn quản lý tại AD on-premises.", en: "Users of both forests can sign in, and identities are still managed in on-premises AD." }) },
    },
    {
      name: L({ vi: "Nhân sự quản lý trên Microsoft Entra ID", en: "Staff managed in Microsoft Entra ID" }),
      request: L({ vi: "Gán permission set cho group Finance", en: "Assign a permission set to the Finance group" }),
      from: L({ vi: "từ quản trị viên", en: "from an administrator" }),
      nodes: [
        { id: "admin", x: 20, y: 97, w: 80, l1: L({ vi: "Quản trị viên", en: "Administrator" }), user: true },
        { id: "idp", x: 150, y: 97, w: 180, l1: "Microsoft Entra ID", l2: L({ vi: "IdP bên ngoài", en: "external IdP" }) },
        { id: "idc", x: 390, y: 97, w: 180, l1: "IAM Identity Center", l2: "permission set" },
        { id: "accts", x: 640, y: 97, w: 160, l1: L({ vi: "Các account", en: "Accounts" }), l2: L({ vi: "trong Organizations", en: "in Organizations" }) },
      ],
      links: [{ a: "admin", b: "idp" }, { a: "idp", b: "idc" }, { a: "idc", b: "accts" }],
      start: "admin",
      choices: { label: L({ vi: "Kết nối", en: "Connection" }), options: [L({ vi: "Chỉ SAML 2.0", en: "SAML 2.0 only" }), "SAML 2.0 + SCIM"], initial: 0 },
      run: (v) => v === 0
        ? { steps: [
              { at: "idp", state: "pass", msg: L({ vi: "SAML 2.0 xác thực user khi đăng nhập AWS access portal.", en: "SAML 2.0 authenticates users when they sign in to the AWS access portal." }) },
              { at: "idc", state: "block", msg: L({ vi: "SAML không cung cấp cách truy vấn IdP để biết user và group. Group Finance **chưa được provision** vào Identity Center nên chưa gán được permission set.", en: "SAML provides no way to query the IdP for users and groups. The Finance group has **not been provisioned** into Identity Center, so no permission set can be assigned yet." }) },
            ],
            ok: false, result: L({ vi: "User và group phải được provision vào Identity Center (SCIM hoặc thủ công) trước khi gán quyền.", en: "Users and groups must be provisioned into Identity Center (SCIM or manually) before assignments." }) }
        : { steps: [
              { at: "idp", state: "pass", msg: L({ vi: "**SCIM** tự động provision user và group từ Entra ID sang Identity Center; **SAML 2.0** xác thực khi đăng nhập.", en: "**SCIM** automatically provisions users and groups from Entra ID into Identity Center; **SAML 2.0** authenticates at sign-in." }) },
              { at: "idc", state: "pass", msg: L({ vi: "Group Finance được gán permission set least privilege cho RDS và S3.", en: "The Finance group is assigned a least-privilege permission set for RDS and S3." }) },
              { at: "accts", state: "pass", msg: L({ vi: "Nhân viên đăng nhập bằng tài khoản Entra ID; AWS CLI nhận credentials ngắn hạn, tự động xoay vòng.", en: "Staff sign in with their Entra ID account; the AWS CLI gets short-term credentials that rotate automatically." }) },
            ],
            ok: true, result: L({ vi: "Thêm hoặc chuyển nhân viên giữa các nhóm trên Entra ID, quyền AWS thay đổi theo.", en: "Adding or moving staff between groups in Entra ID changes their AWS access accordingly." }) },
    },
  ];
}

export default function FederationSim() {
  const L = useLang();
  return <CaseSim scenarios={scenarios(L)} label={L({ vi: "Truy cập tập trung cho nhân sự MFTech", en: "Central workforce access for MFTech" })} action={L({ vi: "Chạy mô phỏng", en: "Run simulation" })} />;
}
