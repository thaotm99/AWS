// Practice test 1, question 12: control EFS access with VPC security groups and IAM policies.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const GATES = ["sg", "iam", "nacl", "gd", "root"];

const useless = (option: string, gate: string, badge: Bilingual, caption: Bilingual, verdict: Bilingual): ScenarioSpec => ({
  option,
  hide: GATES.filter((g) => g !== gate),
  steps: [
    { flow: [["ok", gate, "efs"], ["other", gate, "efs"]], tone: "warn", caption: { vi: "Phương án này không phân biệt được instance nào được phép đọc file system.", en: "This option does not decide which instances may read the file system." } },
    { mark: gate, tone: "bad", badge, caption },
  ],
  verdict: { works: false, caption: verdict },
});

const spec: IllustrationSpec = {
  questionId: 125222641,
  cols: 3.6,
  rows: 2.4,
  nodes: [
    { id: "ok", label: "EC2", sub: { vi: "được phép", en: "permitted" }, at: [0, 0] },
    { id: "other", label: "EC2", sub: { vi: "không được phép", en: "not permitted" }, at: [0, 1.4] },
    { id: "sg", label: "Security group", sub: "mount target", at: [1.3, 0.7] },
    { id: "iam", label: "IAM policy", sub: "file system policy", at: [1.3, 0.7] },
    { id: "nacl", label: "Network ACL", sub: { vi: "mức subnet", en: "subnet level" }, at: [1.3, 0.7] },
    { id: "gd", label: "Amazon GuardDuty", sub: { vi: "phát hiện mối đe doạ", en: "threat detection" }, kind: "ghost", at: [1.3, 0.7] },
    { id: "root", label: "Policy root creds", sub: { vi: "không tồn tại", en: "does not exist" }, kind: "ghost", at: [1.3, 0.7] },
    { id: "efs", label: "Amazon EFS", kind: "data", at: [2.6, 0.7] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["iam", "nacl", "gd", "root"],
      steps: [
        {
          flow: ["ok", "sg", "efs"],
          badge: { vi: "cho phép", en: "allowed" },
          caption: { vi: "VPC security group kiểm soát lưu lượng mạng tới và từ file system.", en: "VPC security groups control the network traffic to and from the file system." },
        },
        {
          stop: ["other", "sg"],
          caption: { vi: "Instance không nằm trong rule bị chặn ở mức mạng.", en: "An instance outside the rules is blocked at the network level." },
        },
      ],
      verdict: { works: true, caption: { vi: "Kiểm soát ở mức mạng.", en: "Network-level control." } },
    },
    {
      option: "b",
      hide: ["sg", "nacl", "gd", "root"],
      steps: [
        {
          flow: ["ok", "iam", "efs"],
          badge: "mount ✓",
          caption: {
            vi: "IAM policy gắn vào file system quyết định client nào được mount và với quyền gì; có thể dùng thêm EFS Access Points.",
            en: "An IAM policy on the file system controls which clients can mount it and with what permissions; EFS Access Points can also manage application access.",
          },
        },
        { stop: ["other", "iam"], caption: { vi: "Client không được policy cho phép không mount được.", en: "A client the policy does not allow cannot mount." } },
      ],
      verdict: { works: true, caption: { vi: "Kiểm soát theo danh tính.", en: "Identity-based control." } },
    },
    useless(
      "c",
      "nacl",
      { vi: "mức subnet", en: "subnet level" },
      { vi: "Network ACL hoạt động ở mức subnet, không ở mức instance.", en: "Network ACLs operate at the subnet level, not the instance level." },
      { vi: "Không ở mức instance.", en: "Not instance-level." },
    ),
    useless(
      "d",
      "gd",
      { vi: "không kiểm soát truy cập", en: "no access control" },
      {
        vi: "Amazon GuardDuty giám sát hoạt động độc hại và hành vi trái phép; nó không dùng để kiểm soát truy cập vào EFS.",
        en: "Amazon GuardDuty monitors for malicious activity and unauthorised behaviour; it cannot be used for access control to EFS.",
      },
      { vi: "GuardDuty chỉ phát hiện.", en: "GuardDuty only detects." },
    ),
    useless(
      "e",
      "root",
      { vi: "không tồn tại", en: "does not exist" },
      { vi: "Không có thứ gọi là \"IAM policy root credentials\"; đây chỉ là phương án gây nhiễu.", en: "There is no such thing as \"IAM policy root credentials\"; it is a distractor." },
      { vi: "Không tồn tại.", en: "Does not exist." },
    ),
  ],
};

export default spec;
