// Practice test 4, question 24: lowest-latency EFS access for EC2 across AZs with a mount target in each AZ.
// Captions follow the question's explanation (mount targets are ENIs created by EFS at the VPC level, cross-AZ
// access adds latency and data transfer cost, Mountpoint for Amazon S3 is not a low-latency POSIX file system).
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516225,
  cols: 3.8,
  rows: 2.85,
  nodes: [
    { id: "ec2a", label: "EC2", sub: "HPC · AZ a", at: [0, 0.3] },
    { id: "ec2b", label: "EC2", sub: "HPC · AZ b", at: [0, 1.9] },
    { id: "mtA", label: "Mount target", sub: "ENI · AZ a", at: [1.25, 0.3] },
    { id: "mtB", label: "Mount target", sub: "ENI · AZ b", at: [1.25, 1.9] },
    { id: "fake", label: "EC2 relay", sub: { vi: "làm mount target?", en: "as a mount target?" }, kind: "ghost", at: [1.25, 1.9] },
    { id: "efs", label: "Amazon EFS", sub: { vi: "file system chung", en: "shared file system" }, kind: "data", at: [2.7, 1.1] },
    { id: "s3", label: "Amazon S3", sub: "Mountpoint for S3", kind: "data", at: [2.7, 1.1] },
  ],
  zones: [
    { id: "aza", label: "AZ a", tone: "az", from: [0, 0.3], to: [1.25, 0.3] },
    { id: "azb", label: "AZ b", tone: "az", from: [0, 1.9], to: [1.25, 1.9] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["fake", "s3"],
      steps: [
        {
          flow: [["ec2a", "mtA", "efs"], ["ec2b", "mtB", "efs"]],
          times: 2,
          caption: {
            vi: "Mỗi instance mount EFS qua mount target ở cùng AZ: lưu lượng ở lại trong AZ, độ trễ thấp nhất và không phát sinh phí truyền dữ liệu giữa các AZ.",
            en: "Each instance mounts EFS through the mount target in its own AZ: traffic stays local, latency is lowest and there is no inter-AZ data transfer cost.",
          },
        },
        {
          mark: ["ec2a", "mtA"],
          tone: "bad",
          caption: {
            vi: "Nếu một AZ không khả dụng…",
            en: "If one AZ becomes unavailable…",
          },
        },
        {
          flow: ["ec2b", "mtB", "efs"],
          caption: {
            vi: "…các instance ở AZ khác vẫn truy cập EFS qua mount target của AZ mình.",
            en: "…instances in the other AZ still reach EFS through their local mount target.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Một mount target trong mỗi AZ có EC2 cần truy cập: hiệu năng và tính sẵn sàng tốt nhất.",
          en: "A mount target in each AZ with instances that need access: best performance and availability.",
        },
      },
    },
    {
      option: "b",
      hide: ["mtB", "s3"],
      steps: [
        {
          flow: ["ec2a", "mtA", "efs"],
          caption: {
            vi: "Mount target là Elastic Network Interface do dịch vụ EFS tạo và quản lý ở cấp VPC trong từng AZ.",
            en: "Mount targets are elastic network interfaces created and managed by the EFS service at the VPC level in each AZ.",
          },
        },
        {
          stop: ["ec2b", "fake"],
          caption: {
            vi: "Không thể tạo mount target trên EC2 instance để làm điểm truy cập cho instance khác; phương án nhầm mount point (trên EC2) với mount target (hạ tầng của EFS).",
            en: "Mount targets cannot be created on an EC2 instance to serve other instances; the option confuses mount points (on EC2) with mount targets (EFS infrastructure).",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Mount target không nằm trên EC2.", en: "Mount targets do not live on EC2." },
      },
    },
    {
      option: "c",
      hide: ["mtB", "fake", "s3"],
      steps: [
        {
          flow: ["ec2a", "mtA", "efs"],
          caption: {
            vi: "Instance ở AZ a dùng mount target duy nhất, nằm cùng AZ.",
            en: "The instance in AZ a uses the single mount target, in its own AZ.",
          },
        },
        {
          flow: ["ec2b", "mtA", "efs"],
          tone: "warn",
          times: 2,
          badge: "cross-AZ",
          caption: {
            vi: "Instance ở AZ b phải đi chéo AZ tới mount target đó: tăng độ trễ và phát sinh phí truyền dữ liệu.",
            en: "The instance in AZ b has to cross AZs to reach it: higher latency and data transfer costs.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Lưu lượng chéo AZ làm tăng độ trễ.", en: "Cross-AZ traffic adds latency." },
      },
    },
    {
      option: "d",
      hide: ["mtA", "mtB", "fake", "efs"],
      steps: [
        {
          flow: [["ec2a", "s3"], ["ec2b", "s3"]],
          tone: "warn",
          caption: {
            vi: "Mountpoint for Amazon S3 mount một S3 bucket như file system cục bộ, được tối ưu cho truy cập tuần tự thông lượng cao vào object lớn.",
            en: "Mountpoint for Amazon S3 mounts a bucket as a local file system, optimised for high-throughput sequential access to large objects.",
          },
        },
        {
          mark: "s3",
          tone: "bad",
          badge: "object store",
          caption: {
            vi: "S3 là object store: không cung cấp file system dùng chung chuẩn POSIX với độ trễ thấp và file locking mà workload HPC cần.",
            en: "S3 is an object store: it lacks the low-latency, POSIX-compliant shared file system behaviour and file locking the HPC workload needs.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không thay thế được EFS.", en: "It cannot replace EFS here." },
      },
    },
  ],
};

export default spec;
