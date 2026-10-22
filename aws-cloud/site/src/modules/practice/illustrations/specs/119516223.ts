// Practice test 4, question 37: extend on-premises storage to AWS with Storage Gateway cached volumes.
// Captions follow the question's explanation (cached vs stored volumes, FSx over VPN, S3 Standard-IA retrieval fees,
// DataSync is not real time).
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516223,
  cols: 4,
  rows: 2,
  nodes: [
    { id: "srv", label: "On-prem servers", sub: { vi: "file system cục bộ", en: "local file systems" }, kind: "onprem", at: [0, 0.6] },
    { id: "cached", label: "Storage Gateway", sub: "cached volumes", at: [1.45, 0.6] },
    { id: "stored", label: "Storage Gateway", sub: "stored volumes", at: [1.45, 0.6] },
    { id: "vpn", label: "Site-to-Site VPN", at: [1.45, 0.6] },
    { id: "ds", label: "AWS DataSync", at: [1.45, 0.6] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [2.95, 0.6] },
    { id: "fsx", label: "FSx for Windows", sub: "File Server", kind: "data", at: [2.95, 0.6] },
    { id: "ia", label: "S3 Standard-IA", kind: "data", at: [2.95, 0.6] },
  ],
  zones: [{ id: "dc", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, tone: "onprem", from: [0, 0.6], to: [1.45, 0.6], pad: 12 }],
  scenarios: [
    {
      option: "c",
      hide: ["stored", "vpn", "ds", "fsx", "ia"],
      steps: [
        {
          flow: ["srv", "cached", "s3"],
          times: 2,
          caption: {
            vi: "Dữ liệu chính được ghi bất đồng bộ lên Amazon S3; dung lượng lưu trữ được mở rộng sang AWS.",
            en: "Primary data is written asynchronously to Amazon S3, extending storage capacity into AWS.",
          },
        },
        {
          flow: ["cached", "srv"],
          back: true,
          times: 3,
          caption: {
            vi: "Chỉ phần dữ liệu truy cập thường xuyên được giữ trong cache cục bộ: truy cập độ trễ thấp và giảm băng thông sử dụng.",
            en: "Only the frequently accessed subset stays in the local cache: low-latency access and less bandwidth used.",
          },
        },
        {
          mark: "s3",
          tone: "ok",
          caption: {
            vi: "Dữ liệu lưu trên S3 qua cached volumes truy cập được mà không mất phí truy xuất.",
            en: "Data stored in S3 through cached volumes is accessible without retrieval charges.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Hybrid: truy cập nhanh tại chỗ, phần lớn dữ liệu nằm trên S3.",
          en: "Hybrid: fast local access, most data in S3.",
        },
      },
    },
    {
      option: "d",
      hide: ["cached", "vpn", "ds", "fsx", "ia"],
      steps: [
        {
          flow: ["srv", "stored"],
          times: 2,
          badge: { vi: "toàn bộ dữ liệu", en: "full dataset" },
          caption: {
            vi: "Stored volumes giữ toàn bộ dữ liệu chính tại on-premises.",
            en: "Stored volumes keep the entire primary dataset on-premises.",
          },
        },
        {
          flow: ["stored", "s3"],
          tone: "warn",
          badge: "snapshots",
          caption: {
            vi: "Chỉ các point-in-time snapshot được sao lưu bất đồng bộ lên S3.",
            en: "Only point-in-time snapshots are backed up asynchronously to S3.",
          },
        },
        {
          mark: "stored",
          tone: "bad",
          caption: {
            vi: "Không giảm nhu cầu lưu trữ tại chỗ, và dữ liệu snapshot trên S3 phải khôi phục về on-premises trước khi dùng được.",
            en: "Local storage needs do not shrink, and snapshot data in S3 must be restored on-premises before it can be used.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không mở rộng dung lượng sang AWS.", en: "It does not extend capacity into AWS." },
      },
    },
    {
      option: "a",
      hide: ["cached", "stored", "ds", "s3", "ia", "dc"],
      steps: [
        {
          flow: ["srv", "vpn", "fsx"],
          times: 3,
          tone: "warn",
          caption: {
            vi: "FSx for Windows File Server làm NAS chính qua VPN: mọi lượt đọc và ghi đều đi qua mạng.",
            en: "FSx for Windows File Server as the primary NAS over VPN: every read and write crosses the network.",
          },
        },
        {
          mark: "fsx",
          tone: "bad",
          caption: {
            vi: "Truy cập cục bộ thường xuyên chịu độ trễ và rủi ro về tính sẵn sàng, đồng thời không tiết kiệm băng thông.",
            en: "Frequent local access suffers latency and availability risks, and bandwidth use is not minimised.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không có truy cập cục bộ nhanh.", en: "No fast local access." },
      },
    },
    {
      option: "b",
      hide: ["cached", "stored", "vpn", "s3", "fsx"],
      steps: [
        {
          flow: ["srv", "ds", "ia"],
          tone: "warn",
          caption: {
            vi: "DataSync sao chép thay đổi định kỳ lên S3 Standard-IA; đây không phải giải pháp thời gian thực.",
            en: "DataSync replicates changes periodically to S3 Standard-IA; it is not a real-time solution.",
          },
        },
        {
          mark: "ia",
          tone: "bad",
          badge: { vi: "phí truy xuất", en: "retrieval fees" },
          caption: {
            vi: "S3 Standard-IA dành cho dữ liệu ít truy cập và tính phí truy xuất cho mỗi lần truy cập.",
            en: "S3 Standard-IA is meant for infrequently accessed data and charges retrieval fees on each access.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Phí truy xuất và độ trễ.", en: "Retrieval fees and latency." },
      },
    },
  ],
};

export default spec;
