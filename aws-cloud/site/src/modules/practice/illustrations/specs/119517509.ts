// Practice test 5, question 48: DataSync for the bulk migration to S3, then File Gateway for ongoing on-premises access.
// Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const dc = { vi: "Kho file", en: "File servers" };
const apps = { vi: "Ứng dụng", en: "Applications" };
const migrate: StepSpec = {
  flow: ["files", "ds", "s3"],
  times: 3,
  badge: { vi: "di chuyển", en: "migrate" },
  caption: {
    vi: "AWS DataSync tự động hoá và tăng tốc việc chép lượng lớn dữ liệu tới AWS qua internet hoặc Direct Connect, có cơ chế thử lại và kiểm tra toàn vẹn dữ liệu.",
    en: "AWS DataSync automates and accelerates copying large amounts of data to AWS over the internet or Direct Connect, with retries and data integrity verification.",
  },
};
const dsNoUpdates = (from: string): StepSpec => ({
  stop: ["apps", from],
  caption: {
    vi: "DataSync dùng để truyền dữ liệu; nó không giúp ứng dụng on-premises tiếp tục cập nhật các file đã di chuyển.",
    en: "DataSync transfers data; it cannot give on-premises applications ongoing access to update the migrated files.",
  },
});

const spec: IllustrationSpec = {
  questionId: 119517509,
  cols: 4,
  rows: 3,
  nodes: [
    { id: "files", label: dc, sub: { vi: "hàng trăm TB", en: "hundreds of TB" }, kind: "onprem", at: [0, 0.3] },
    { id: "apps", label: apps, sub: "on-premises", kind: "onprem", at: [0, 1.9] },
    { id: "ds", label: "AWS DataSync", sub: "agent", at: [1.4, 0.3] },
    { id: "fgwMig", label: "File Gateway", sub: "Storage Gateway", at: [1.4, 0.3] },
    { id: "s3taMig", label: "S3TA", sub: "Transfer Acceleration", at: [1.4, 0.3] },
    { id: "fgw", label: "File Gateway", sub: { vi: "NFS/SMB · cache cục bộ", en: "NFS/SMB · local cache" }, at: [1.4, 1.9] },
    { id: "dsUpd", label: "AWS DataSync", kind: "ghost", at: [1.4, 1.9] },
    { id: "s3taUpd", label: "S3TA", kind: "ghost", at: [1.4, 1.9] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [3, 1.1] },
  ],
  zones: [{ id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, tone: "onprem", from: [0, 0.3], to: [0, 1.9], pad: 12 }],
  scenarios: [
    {
      option: "d",
      hide: ["fgwMig", "s3taMig", "dsUpd", "s3taUpd"],
      steps: [
        migrate,
        {
          flow: ["apps", "fgw", "s3"],
          badge: { vi: "cập nhật", en: "updates" },
          caption: {
            vi: "Sau đó File Gateway cung cấp truy cập SMB hoặc NFS tới dữ liệu trong Amazon S3, với cache cục bộ cho độ trễ thấp, để ứng dụng on-premises tiếp tục cập nhật.",
            en: "File Gateway then gives SMB or NFS access to the data in Amazon S3, with local caching for low latency, so on-premises applications keep updating it.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "DataSync di chuyển nhanh, File Gateway giữ quyền truy cập liên tục.",
          en: "DataSync migrates fast; File Gateway keeps ongoing access.",
        },
      },
    },
    {
      option: "a",
      hide: ["fgwMig", "s3taMig", "fgw", "s3taUpd"],
      steps: [migrate, dsNoUpdates("dsUpd")],
      verdict: {
        works: false,
        caption: { vi: "Thiếu truy cập liên tục cho ứng dụng.", en: "No ongoing access for the applications." },
      },
    },
    {
      option: "b",
      hide: ["ds", "s3taMig", "fgw", "dsUpd"],
      steps: [
        {
          flow: ["files", "fgwMig", "s3"],
          tone: "warn",
          caption: {
            vi: "File Gateway có thể đưa dữ liệu on-premises lên AWS, nhưng không phải giải pháp tối ưu cho khối lượng lớn; DataSync phù hợp hơn cho việc di chuyển.",
            en: "File Gateway can move on-premises data to AWS, but it is not optimal for high volumes; DataSync is better suited to migration.",
          },
        },
        {
          stop: ["apps", "s3taUpd"],
          caption: {
            vi: "Amazon S3 Transfer Acceleration không giúp ứng dụng on-premises tiếp tục cập nhật các file đã di chuyển.",
            en: "Amazon S3 Transfer Acceleration cannot give on-premises applications ongoing updates to the migrated files.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Di chuyển chậm hơn và thiếu truy cập liên tục.", en: "Slower migration and no ongoing access." },
      },
    },
    {
      option: "c",
      hide: ["ds", "fgwMig", "fgw", "s3taUpd"],
      steps: [
        {
          flow: ["files", "s3taMig", "s3"],
          tone: "warn",
          caption: {
            vi: "S3 Transfer Acceleration tăng thông lượng tải file lớn lên S3 nếu ứng dụng đã tích hợp với S3 API.",
            en: "S3 Transfer Acceleration raises throughput for large files to S3 if the application already uses the S3 API.",
          },
        },
        dsNoUpdates("dsUpd"),
      ],
      verdict: {
        works: false,
        caption: { vi: "DataSync không phục vụ cập nhật liên tục.", en: "DataSync does not serve ongoing updates." },
      },
    },
  ],
};

export default spec;
