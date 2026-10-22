// Practice test 2, question 5: Aurora Global Database for low-latency local reads in every Region.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516175,
  cols: 2.6,
  rows: 3.1,
  nodes: [
    { id: "us", label: { vi: "Văn phòng Mỹ", en: "US offices" }, kind: "actor", at: [0, 0.3] },
    { id: "eu", label: { vi: "Văn phòng châu Âu", en: "Europe offices" }, kind: "actor", at: [0, 1.95] },
    { id: "dbA", label: "Aurora", sub: { vi: "Region chính", en: "primary Region" }, kind: "data", at: [1.5, 0.3] },
    { id: "dbB", label: "Aurora", sub: { vi: "Region phụ", en: "secondary Region" }, kind: "data", at: [1.5, 1.95] },
    { id: "ddbA", label: "DynamoDB", sub: "global table", kind: "data", at: [1.5, 0.3] },
    { id: "ddbB", label: "DynamoDB", sub: "global table", kind: "data", at: [1.5, 1.95] },
    { id: "rsA", label: "Amazon Redshift", sub: "data warehouse", kind: "data", at: [1.5, 0.3] },
    { id: "rsB", label: "Amazon Redshift", sub: "data warehouse", kind: "data", at: [1.5, 1.95] },
    { id: "ec2A", label: "MySQL on EC2", sub: { vi: "tự quản lý", en: "self-managed" }, kind: "ghost", at: [1.5, 0.3] },
    { id: "ec2B", label: "MySQL on EC2", sub: { vi: "tự quản lý", en: "self-managed" }, kind: "ghost", at: [1.5, 1.95] },
  ],
  zones: [
    { id: "regA", label: "us-east-1", tone: "region", from: [1.5, 0.3], to: [1.5, 0.3], pad: 22 },
    { id: "regB", label: "eu-west-1", tone: "region", from: [1.5, 1.95], to: [1.5, 1.95], pad: 22 },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["ddbA", "ddbB", "rsA", "rsB", "ec2A", "ec2B"],
      steps: [
        {
          flow: ["us", "dbA"],
          caption: {
            vi: "Aurora tương thích MySQL, nên ứng dụng giữ nguyên lược đồ quan hệ hiện có.",
            en: "Aurora is MySQL-compatible, so the application keeps its relational schema.",
          },
        },
        {
          flow: ["dbA", "dbB"],
          badge: { vi: "nhân bản", en: "replicated" },
          caption: {
            vi: "Aurora Global Database cho một cơ sở dữ liệu trải trên nhiều Region và nhân bản dữ liệu mà không ảnh hưởng hiệu năng cơ sở dữ liệu.",
            en: "Aurora Global Database lets one database span multiple Regions and replicates data with no impact on database performance.",
          },
        },
        {
          flow: ["eu", "dbB"],
          times: 3,
          badge: { vi: "đọc cục bộ", en: "local reads" },
          caption: {
            vi: "Văn phòng ở mỗi Region đọc nhanh, độ trễ thấp ngay tại chỗ; Global Database còn hỗ trợ khôi phục sau sự cố cấp Region.",
            en: "Offices in each Region get fast local reads with low latency; the global database also provides disaster recovery from Region-wide outages.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Giữ lược đồ quan hệ, đọc cục bộ toàn cầu.", en: "Relational schema kept, local reads worldwide." } },
    },
    {
      option: "c",
      hide: ["dbA", "dbB", "rsA", "rsB", "ec2A", "ec2B"],
      steps: [
        {
          flow: [["us", "ddbA"], ["eu", "ddbB"]],
          tone: "warn",
          caption: {
            vi: "DynamoDB Global Tables cho đọc và ghi cục bộ nhanh ở mỗi Region, nhân bản tự động giữa các Region.",
            en: "DynamoDB Global Tables give fast local reads and writes in each Region, replicated automatically across Regions.",
          },
        },
        {
          mark: ["ddbA", "ddbB"],
          tone: "bad",
          badge: "NoSQL",
          caption: {
            vi: "Nhưng DynamoDB là cơ sở dữ liệu NoSQL, trong khi yêu cầu là giữ lược đồ cơ sở dữ liệu quan hệ.",
            en: "But DynamoDB is a NoSQL database, while the requirement is to keep the relational database schema.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phải bỏ lược đồ quan hệ.", en: "The relational schema is lost." } },
    },
    {
      option: "d",
      hide: ["dbA", "dbB", "ddbA", "ddbB", "ec2A", "ec2B"],
      steps: [
        {
          flow: [["us", "rsA"], ["eu", "rsB"]],
          tone: "warn",
          caption: {
            vi: "Mỗi Region có một Redshift cluster chứa dữ liệu đã di chuyển sang.",
            en: "Each Region gets a Redshift cluster holding the migrated data.",
          },
        },
        {
          mark: ["rsA", "rsB"],
          tone: "bad",
          badge: { vi: "không giao dịch", en: "not transactional" },
          caption: {
            vi: "Amazon Redshift là data warehouse để lưu trữ và phân tích dữ liệu quy mô lớn, không phù hợp làm cơ sở dữ liệu quan hệ giao dịch cho ứng dụng.",
            en: "Amazon Redshift is a data warehouse for large-scale storage and analysis; it is not suited to be the application's transactional relational database.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Data warehouse không thay được OLTP.", en: "A data warehouse is not a transactional database." } },
    },
    {
      option: "b",
      hide: ["dbA", "dbB", "ddbA", "ddbB", "rsA", "rsB"],
      steps: [
        {
          flow: [["us", "ec2A"], ["eu", "ec2B"]],
          tone: "warn",
          caption: {
            vi: "Mỗi Region có EC2 instance cài MySQL, dữ liệu được di chuyển sang từng nơi.",
            en: "Each Region gets EC2 instances with MySQL installed and the data migrated into them.",
          },
        },
        {
          mark: ["ec2A", "ec2B"],
          tone: "bad",
          badge: { vi: "tự vận hành", en: "self-managed" },
          caption: {
            vi: "Tự quản lý các cơ sở dữ liệu MySQL trên EC2 ở nhiều Region là gánh nặng bảo trì rất lớn.",
            en: "Managing MySQL databases on EC2 by hand in several Regions is a heavy maintenance burden.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Gánh nặng bảo trì nhiều Region.", en: "Maintenance burden in every Region." } },
    },
  ],
};

export default spec;
