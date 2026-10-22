// Practice test 1, question 42: teams in other Regions open the us-east-1 EFS file over inter-Region VPC peering.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const STORES = ["peer", "efs", "cpAP", "cpEU", "s3", "rds"];
const teamsCaption: Bilingual = {
  vi: "Đội ở châu Á – Thái Bình Dương và châu Âu làm việc qua EC2 ở Region của mình.",
  en: "The Asia Pacific and Europe teams work through EC2 in their own Regions.",
};

const moved = (option: string, store: string, badge: Bilingual, caption: Bilingual): ScenarioSpec => ({
  option,
  hide: STORES.filter((s) => s !== store),
  steps: [
    { flow: [["teamAP", "ec2AP"], ["teamEU", "ec2EU"]], caption: teamsCaption },
    { flow: [["ec2AP", store], ["ec2EU", store]], tone: "warn", caption: { vi: "Bảng tính được chép sang nơi khác.", en: "The spreadsheet is copied elsewhere." } },
    { mark: store, tone: "bad", badge, caption },
  ],
  verdict: { works: false, caption: { vi: "Tốn nhiều công vận hành.", en: "Lots of operational overhead." } },
});

const spec: IllustrationSpec = {
  questionId: 125222701,
  cols: 4.4,
  rows: 2.6,
  nodes: [
    { id: "teamAP", label: { vi: "Đội", en: "Team" }, sub: "Asia Pacific", kind: "actor", at: [0, 0.1] },
    { id: "teamEU", label: { vi: "Đội", en: "Team" }, sub: "Europe", kind: "actor", at: [0, 1.5] },
    { id: "ec2AP", label: "EC2", sub: "ap Region", at: [1.1, 0.1] },
    { id: "ec2EU", label: "EC2", sub: "eu Region", at: [1.1, 1.5] },
    { id: "peer", label: "Inter-Region peering", at: [2.3, 0.8] },
    { id: "efs", label: "Amazon EFS", sub: { vi: "us-east-1 · bảng tính", en: "us-east-1 · spreadsheet" }, kind: "data", at: [3.4, 0.8] },
    { id: "cpAP", label: { vi: "Bản sao EFS", en: "EFS copy" }, sub: "ap Region", kind: "data", at: [2.3, 0.1] },
    { id: "cpEU", label: { vi: "Bản sao EFS", en: "EFS copy" }, sub: "eu Region", kind: "data", at: [2.3, 1.5] },
    { id: "s3", label: "Amazon S3", sub: { vi: "bản sao", en: "copy" }, kind: "data", at: [2.3, 0.8] },
    { id: "rds", label: "RDS for MySQL", kind: "data", at: [2.3, 0.8] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["cpAP", "cpEU", "s3", "rds"],
      steps: [
        { flow: [["teamAP", "ec2AP"], ["teamEU", "ec2EU"]], caption: teamsCaption },
        {
          flow: [["ec2AP", "peer", "efs"], ["ec2EU", "peer", "efs"]],
          badge: { vi: "một file", en: "one file" },
          caption: {
            vi: "EC2 instance ở Region khác kết nối tới file system EFS qua inter-Region VPC peering, nên mọi đội cùng làm việc trên một bảng tính duy nhất.",
            en: "EC2 instances in other Regions connect to the EFS file system over inter-Region VPC peering, so every team works on the same single spreadsheet.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Một file, không phải sao chép.", en: "One file, no copies." } },
    },
    {
      option: "b",
      hide: ["peer", "s3", "rds"],
      steps: [
        { flow: [["teamAP", "ec2AP"], ["teamEU", "ec2EU"]], caption: teamsCaption },
        { flow: [["efs", "cpAP"], ["efs", "cpEU"]], tone: "warn", caption: { vi: "Bảng tính được chép sang EFS ở từng Region.", en: "The spreadsheet is copied to EFS in each Region." } },
        { flow: [["ec2AP", "cpAP"], ["ec2EU", "cpEU"]], tone: "warn", caption: { vi: "Mỗi đội mở bản sao trong Region của mình.", en: "Each team opens the copy in its own Region." } },
        {
          mark: ["cpAP", "cpEU"],
          tone: "bad",
          badge: { vi: "file riêng", en: "own copy" },
          caption: {
            vi: "Mỗi đội làm trên file của riêng mình thay vì một file chung, nên không thể cộng tác; tiền đề EFS không cho truy cập từ Region khác cũng sai.",
            en: "Each team works on its own file instead of one shared file, so there is no collaboration; the premise that EFS cannot be reached from other Regions is also wrong.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không còn cộng tác trên một file.", en: "No collaboration on one file." } },
    },
    moved("c", "s3", { vi: "không sửa tại chỗ", en: "no in-place edits" }, {
      vi: "S3 không cho sửa object tại chỗ và không tuân thủ POSIX; phải viết ứng dụng riêng để \"giả lập\" chỉnh sửa tại chỗ.",
      en: "S3 does not allow in-place edits of an object and is not POSIX compliant; a custom application would be needed to simulate in-place edits.",
    }),
    moved("d", "rds", { vi: "viết code riêng", en: "custom code" }, {
      vi: "Phải viết code riêng để tái tạo chức năng bảng tính trên cơ sở dữ liệu.",
      en: "Custom code would be needed to replicate the spreadsheet functionality on top of the database.",
    }),
  ],
};

export default spec;
