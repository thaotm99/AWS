// Practice test 1, question 35: an on-premises File Gateway (NFS) storing files in S3 with lifecycle tiering.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222643,
  cols: 4.4,
  rows: 1.6,
  nodes: [
    { id: "apps", label: { vi: "Workload xử lý lô", en: "Batch workloads" }, sub: { vi: "công cụ NFS", en: "NFS tools" }, kind: "onprem", at: [0, 0.35] },
    { id: "fgw", label: "File Gateway", sub: { vi: "file share NFS", en: "NFS file share" }, kind: "onprem", at: [1.1, 0.35] },
    { id: "vgw", label: "Volume Gateway", sub: "iSCSI · cached", kind: "onprem", at: [1.1, 0.35] },
    { id: "ds", label: "AWS DataSync", at: [1.1, 0.35] },
    { id: "fsx", label: "FSx for Windows", sub: "SMB", at: [1.1, 0.35] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [2.25, 0.35] },
    { id: "efs", label: "EFS One Zone-IA", sub: { vi: "một AZ", en: "single AZ" }, kind: "data", at: [2.25, 0.35] },
    { id: "ia", label: "Standard-IA / Glacier", sub: "S3 Lifecycle", kind: "data", at: [3.4, 0.35] },
  ],
  zones: [{ id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, tone: "onprem", from: [0, 0.35], to: [1.1, 0.35], pad: 10 }],
  scenarios: [
    {
      option: "c",
      hide: ["vgw", "ds", "fsx", "efs"],
      steps: [
        {
          flow: ["apps", "fgw"],
          badge: "NFS",
          caption: { vi: "File Gateway cung cấp giao diện NFS, nên workload hiện tại ghi file như vào máy chủ NFS truyền thống.", en: "File Gateway presents an NFS interface, so existing workloads write files as they would to a traditional NFS server." },
        },
        { flow: ["fgw", "s3"], caption: { vi: "Phía sau, dữ liệu được lưu trong Amazon S3 với khả năng mở rộng gần như không giới hạn.", en: "Behind the scenes, the data is stored in Amazon S3 with virtually unlimited scalability." } },
        {
          flow: ["s3", "ia"],
          badge: "lifecycle",
          caption: { vi: "S3 Lifecycle policy tự chuyển file ít truy cập sang lớp lưu trữ rẻ hơn như S3 Standard-IA hoặc Glacier.", en: "S3 Lifecycle policies move infrequently accessed files to cheaper classes such as S3 Standard-IA or Glacier." },
        },
      ],
      verdict: { works: true, caption: { vi: "Giữ NFS, mở rộng bằng S3, tự phân tầng.", en: "NFS kept, S3 scale, automatic tiering." } },
    },
    {
      option: "a",
      hide: ["fgw", "vgw", "fsx", "s3", "ia"],
      steps: [
        { flow: ["apps", "ds", "efs"], tone: "warn", caption: { vi: "DataSync di chuyển dữ liệu NFS sang EFS One Zone-IA; ứng dụng mount EFS qua NFS.", en: "DataSync migrates the NFS data to EFS One Zone-IA, and the application mounts EFS over NFS." } },
        {
          mark: "efs",
          tone: "bad",
          badge: { vi: "một AZ", en: "single AZ" },
          caption: {
            vi: "EFS không tối ưu chi phí cho mô hình hybrid cần NFS on-premises; One Zone-IA chỉ ở một AZ nên kém bền vững, và phải di chuyển toàn bộ dữ liệu, cấu hình lại ứng dụng.",
            en: "EFS is not cost-optimal for a hybrid setup that needs on-premises NFS; One Zone-IA lives in one AZ, and it means a full migration and reconfiguration.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Đắt hơn và kém bền vững hơn.", en: "Costlier and less resilient." } },
    },
    {
      option: "b",
      hide: ["fgw", "ds", "fsx", "efs", "ia"],
      steps: [
        { flow: ["apps", "vgw", "s3"], tone: "warn", caption: { vi: "Volume Gateway cung cấp block storage iSCSI; NFS phải dựng chồng lên một block volume.", en: "Volume Gateway provides iSCSI block storage; NFS has to be layered on top of a block volume." } },
        {
          mark: "vgw",
          tone: "bad",
          badge: { vi: "block, không phải file", en: "block, not file" },
          caption: {
            vi: "Không tối ưu cho workload NFS hay truy cập object trực tiếp trên S3, và không có S3 Lifecycle để phân tầng — chỉ có snapshot và backup.",
            en: "Not optimised for NFS workloads or direct S3 object access, and no S3 Lifecycle tiering — only snapshots and backups.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Sai loại lưu trữ.", en: "The wrong kind of storage." } },
    },
    {
      option: "d",
      hide: ["fgw", "vgw", "ds", "efs", "s3", "ia"],
      steps: [
        {
          stop: ["apps", "fsx"],
          badge: "SMB",
          caption: {
            vi: "FSx for Windows File Server dành cho workload SMB của Windows, không phải NFS; ứng dụng phải cấu hình lại sang SMB, và không có S3 Lifecycle để phân tầng.",
            en: "FSx for Windows File Server is for Windows SMB workloads, not NFS; the application would be reconfigured for SMB, and there is no S3 Lifecycle tiering.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không giữ được NFS.", en: "NFS is not kept." } },
    },
  ],
};

export default spec;
