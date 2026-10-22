// Practice test 6, question 48: lift-and-shift with AWS Application Migration Service (MGN): agent, replication,
// test instances, then cutover. Captions follow the question's explanation. Additional source:
// - Workflow: install the agent, block-level replication to a replication server in the staging area, launch test
//   instances, confirm no lag, launch a cutover instance:
//   https://docs.aws.amazon.com/mgn/latest/ug/migration-workflow-gs.html
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const replicate: StepSpec[] = [
  {
    flow: ["vm", "staging"],
    badge: "block-level",
    caption: {
      vi: "AWS Replication Agent được cài trên từng VM nguồn và sao chép liên tục dữ liệu (ở mức block) tới replication server trong staging area trên AWS.",
      en: "The AWS Replication Agent is installed on each source VM and continuously replicates its data (at block level) to a replication server in the staging area on AWS.",
    },
  },
];

const test: StepSpec[] = [
  {
    flow: ["staging", "test"],
    badge: "Test Mode",
    caption: {
      vi: "Sau lần đồng bộ ban đầu, khởi chạy test instance để kiểm thử chấp nhận và xác nhận VM đã di chuyển hoạt động đúng trước khi cutover.",
      en: "After the initial sync, test instances are launched for acceptance testing, to confirm the migrated VMs work before cutover.",
    },
  },
];

const cutover: StepSpec[] = [
  {
    flow: ["vm", "staging"],
    badge: { vi: "không lag", en: "no lag" },
    caption: {
      vi: "Kiểm thử xong, xác nhận replication đã cập nhật đầy đủ, không còn độ trễ.",
      en: "Once testing passes, confirm that replication is up to date, with no lag.",
    },
  },
  {
    flow: ["staging", "cutover"],
    badge: "cutover",
    caption: {
      vi: "Khởi chạy cutover instance để đưa vào production; VM gốc có thể ngừng sử dụng khi EC2 instance chạy ổn định.",
      en: "A cutover instance is launched to go live in production; the original VM can be retired once the EC2 instance works as intended.",
    },
  },
];

const ok = (vi: string, en: string) => ({ works: true, caption: { vi, en } as Bilingual });

const spec: IllustrationSpec = {
  questionId: 130168919,
  cols: 4,
  rows: 2.45,
  nodes: [
    { id: "vm", label: { vi: "VM nguồn", en: "Source VM" }, sub: { vi: "ứng dụng cũ", en: "legacy app" }, kind: "onprem", at: [0.05, 0.8] },
    { id: "staging", label: "Replication server", sub: "staging area", at: [1.5, 0.8] },
    { id: "dr", label: "CloudEndure DR", sub: { vi: "công cụ DR", en: "DR tooling" }, at: [1.5, 0.8] },
    { id: "asg", label: "EC2 Auto Scaling", sub: { vi: "không nhập VM", en: "no VM import" }, kind: "ghost", at: [1.5, 0.8] },
    { id: "ami", label: { vi: "AMI tạo tay", en: "Manual AMI" }, at: [1.5, 0.8] },
    { id: "test", label: "Test instance", at: [3, 0.1] },
    { id: "cutover", label: "Cutover instance", sub: "production", at: [3, 1.5] },
  ],
  zones: [
    { id: "dc", label: { vi: "Data center", en: "Data center" }, tone: "onprem", from: [0.05, 0.8], to: [0.05, 0.8], pad: 20 },
    { id: "aws", label: "AWS", tone: "region", from: [1.5, 0.1], to: [3, 1.5], pad: 12 },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["dr", "asg", "ami", "test", "cutover"],
      steps: replicate,
      verdict: ok("MGN rehost nhanh, không cần refactor ứng dụng.", "MGN rehosts quickly, with no application refactoring."),
    },
    {
      option: "e",
      hide: ["dr", "asg", "ami", "cutover"],
      steps: [...replicate, ...test],
      verdict: ok("Kiểm thử trước khi cutover giảm rủi ro sau di chuyển.", "Testing before cutover lowers the risk after migration."),
    },
    {
      option: "f",
      hide: ["dr", "asg", "ami"],
      steps: [...replicate, ...test, ...cutover],
      verdict: ok("Bước cuối của quy trình MGN.", "The final step of the MGN workflow."),
    },
    {
      option: "a",
      hide: ["staging", "asg", "ami", "test"],
      steps: [
        {
          flow: ["vm", "dr", "cutover"],
          tone: "warn",
          caption: {
            vi: "CloudEndure Disaster Recovery sao chép liên tục và failover nhanh sang AWS, nhưng chủ yếu dành cho khôi phục thảm hoạ.",
            en: "CloudEndure Disaster Recovery replicates continuously and fails over quickly to AWS, but it is meant mainly for disaster recovery.",
          },
        },
        {
          mark: "dr",
          tone: "bad",
          caption: {
            vi: "Nó thiếu quy trình kiểm thử tích hợp sẵn của MGN, công cụ được tối ưu cho di chuyển; dùng công cụ DR để di chuyển thêm độ phức tạp.",
            en: "It lacks the built-in testing workflow of MGN, the tool optimized for migration; using DR tooling for a migration adds complexity.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Sai công cụ cho việc lift-and-shift.",
          en: "The wrong tool for a lift-and-shift.",
        },
      },
    },
    {
      option: "b",
      hide: ["staging", "dr", "ami", "test", "cutover"],
      steps: [
        {
          stop: ["vm", "asg"],
          caption: {
            vi: "EC2 Auto Scaling dùng để scale ngang theo các chỉ số hiệu năng; nó không nhập hay sao chép VM on-premises.",
            en: "EC2 Auto Scaling scales horizontally on performance metrics; it does not import or replicate on-premises VMs.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không phải cơ chế di chuyển.",
          en: "Not a migration mechanism.",
        },
      },
    },
    {
      option: "d",
      hide: ["staging", "dr", "asg", "test"],
      steps: [
        {
          mark: "vm",
          tone: "bad",
          badge: { vi: "tắt", en: "shut down" },
          caption: {
            vi: "Tắt VM nguồn trước gây gián đoạn dịch vụ.",
            en: "Shutting the source VMs down first causes downtime.",
          },
        },
        {
          flow: ["vm", "ami", "cutover"],
          tone: "warn",
          caption: {
            vi: "Tạo AMI thủ công và cấu hình lại bằng tay tăng rủi ro sai lệch giữa nguồn và đích, không phù hợp với tiến độ gấp.",
            en: "Manual AMI creation and reconfiguration raise the risk of mismatch between source and target, a poor fit for a tight deadline.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Có downtime và nhiều công sức thủ công.",
          en: "Downtime and heavy manual effort.",
        },
      },
    },
  ],
};

export default spec;
