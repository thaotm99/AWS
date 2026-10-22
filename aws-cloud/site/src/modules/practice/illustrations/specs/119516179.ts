// Practice test 2, question 11: DataSync over Direct Connect (private VIF) to an EFS interface endpoint.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516179,
  cols: 5.2,
  rows: 2.3,
  nodes: [
    { id: "nfs", label: "NFS file system", sub: { vi: "video mới", en: "new video files" }, kind: "onprem", at: [0, 1.2] },
    { id: "agent", label: "DataSync agent", kind: "onprem", at: [1.05, 1.2] },
    { id: "dx", label: "Direct Connect", sub: "private VIF", at: [2.1, 1.2] },
    { id: "dxpub", label: "Direct Connect", sub: "public VIF", at: [2.1, 1.2] },
    { id: "vpce", label: "Interface endpoint", sub: "PrivateLink · EFS", at: [3.2, 1.2] },
    { id: "peer", label: "VPC peering endpoint", sub: { vi: "không dùng được", en: "not usable" }, kind: "ghost", at: [3.2, 1.2] },
    { id: "gwe", label: "S3 gateway endpoint", sub: { vi: "trong VPC", en: "inside the VPC" }, kind: "ghost", at: [3.2, 0] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [3.2, 0] },
    { id: "lam", label: "AWS Lambda", sub: { vi: "chép sang EFS", en: "copies to EFS" }, at: [4.2, 0] },
    { id: "efs", label: "Amazon EFS", kind: "data", at: [4.2, 1.2] },
  ],
  zones: [{ id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, tone: "onprem", from: [0, 1.2], to: [1.05, 1.2], pad: 10 }],
  scenarios: [
    {
      option: "c",
      hide: ["dxpub", "peer", "gwe", "s3", "lam"],
      steps: [
        {
          flow: ["nfs", "agent"],
          caption: {
            vi: "DataSync agent chạy trên máy chủ on-premises có quyền truy cập NFS file system.",
            en: "The DataSync agent runs on an on-premises server with access to the NFS file system.",
          },
        },
        {
          flow: ["agent", "dx", "vpce"],
          badge: "PrivateLink",
          caption: {
            vi: "Dữ liệu đi qua Direct Connect bằng private VIF tới interface VPC endpoint cho Amazon EFS; endpoint này truy cập được từ on-premises qua Direct Connect.",
            en: "Data travels over Direct Connect through a private VIF to an interface VPC endpoint for Amazon EFS, which on-premises networks can reach over Direct Connect.",
          },
        },
        {
          flow: ["vpce", "efs"],
          times: 3,
          badge: { vi: "mỗi 24 giờ", en: "every 24 h" },
          caption: {
            vi: "DataSync scheduled task định kỳ chạy tác vụ chuyển dữ liệu, gửi các file video vào Amazon EFS mỗi 24 giờ.",
            en: "A DataSync scheduled task periodically runs the transfer, sending the video files to Amazon EFS every 24 hours.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Một luồng được quản lý, đi thẳng vào EFS.", en: "One managed path straight into EFS." } },
    },
    {
      option: "a",
      hide: ["dxpub", "vpce", "gwe", "s3", "lam"],
      steps: [
        { flow: ["nfs", "agent", "dx"], caption: { vi: "Agent gửi dữ liệu qua Direct Connect bằng private VIF.", en: "The agent sends data over Direct Connect through a private VIF." } },
        {
          stop: ["dx", "peer"],
          caption: {
            vi: "VPC peering là kết nối mạng giữa hai VPC; không thể dùng nó để chuyển dữ liệu từ on-premises qua Direct Connect vào AWS.",
            en: "A VPC peering connection links two VPCs; it cannot carry data from on-premises over Direct Connect into AWS.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không có đường từ Direct Connect qua VPC peering.", en: "VPC peering is not a path from Direct Connect." } },
    },
    {
      option: "b",
      hide: ["dx", "vpce", "peer", "gwe"],
      steps: [
        {
          flow: ["nfs", "agent", "dxpub", "s3"],
          tone: "warn",
          badge: "public VIF",
          caption: {
            vi: "Public VIF kết nối tới tài nguyên có địa chỉ IP công khai như S3 bucket, nên DataSync có thể gửi file vào S3.",
            en: "A public VIF reaches resources with public IP addresses such as an S3 bucket, so DataSync can send the files to S3.",
          },
        },
        {
          flow: ["s3", "lam", "efs"],
          tone: "warn",
          caption: {
            vi: "S3 event notification kích hoạt Lambda function để chép từng file từ S3 sang EFS.",
            en: "S3 event notifications trigger a Lambda function that copies each file from S3 to EFS.",
          },
        },
        {
          mark: "lam",
          tone: "bad",
          badge: { vi: "thêm chặng", en: "extra hop" },
          caption: {
            vi: "Về lý thuyết có thể làm được, nhưng đi vòng qua S3 rồi Lambda không phải cách hiệu quả nhất về vận hành.",
            en: "Theoretically possible, but routing through S3 and then Lambda is not the most operationally efficient way.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Được nhưng vòng vèo.", en: "Works, but roundabout." } },
    },
    {
      option: "d",
      hide: ["dxpub", "vpce", "peer", "s3", "lam"],
      steps: [
        { flow: ["nfs", "agent", "dx"], caption: { vi: "Agent gửi dữ liệu qua Direct Connect.", en: "The agent sends data over Direct Connect." } },
        {
          stop: ["dx", "gwe"],
          caption: {
            vi: "Gateway VPC endpoint cho phép truy cập S3 từ bên trong VPC, nhưng không thể dùng nó để chuyển dữ liệu từ on-premises qua Direct Connect vào S3.",
            en: "A gateway VPC endpoint gives access to S3 from inside the VPC, but it cannot be used to transfer data from on-premises over Direct Connect into S3.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Gateway endpoint không nhận lưu lượng từ on-premises.", en: "The gateway endpoint does not serve on-premises traffic." } },
    },
  ],
};

export default spec;
