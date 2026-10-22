// Practice test 4, question 54: remove a DynamoDB hot partition without refactoring, using DynamoDB Accelerator (DAX).
// Captions follow the question's explanation (in-memory cache, microsecond reads, transparent to the application,
// caches the hot keys; ElastiCache needs refactoring; Streams and Global Tables do not address hot keys).
import type { IllustrationSpec, StepSpec } from "../types";

const hot: StepSpec = {
  flow: ["app", "ddb"],
  times: 4,
  tone: "warn",
  badge: "hot key",
  caption: {
    vi: "Lượt đọc dồn vào item của các vận động viên nổi tiếng, tạo hot partition dù RCU đã được tăng.",
    en: "Reads pile onto the items of star athletes, creating a hot partition even after the RCUs were raised.",
  },
};

const spec: IllustrationSpec = {
  questionId: 119516221,
  cols: 5,
  rows: 2,
  nodes: [
    { id: "app", label: "AWS Lambda", sub: "via API Gateway", kind: "actor", at: [0, 1] },
    { id: "dax", label: "DynamoDB DAX", sub: "in-memory cache", at: [1.4, 1] },
    { id: "cache", label: "ElastiCache", at: [1.4, 0] },
    { id: "ddb", label: "DynamoDB table", kind: "data", at: [2.8, 1] },
    { id: "streams", label: "DynamoDB Streams", sub: { vi: "thay đổi item", en: "item changes" }, at: [4, 1] },
    { id: "gt", label: "Replica table", sub: "Global Tables", kind: "data", at: [4, 1] },
  ],
  scenarios: [
    {
      option: "c",
      hide: ["cache", "streams", "gt"],
      steps: [
        {
          flow: ["app", "dax", "ddb"],
          badge: "MISS",
          caption: {
            vi: "DAX đứng trước bảng; lần đọc đầu tiên một hot key đi tới DynamoDB và kết quả được cache lại.",
            en: "DAX sits in front of the table; the first read of a hot key goes to DynamoDB and the result is cached.",
          },
        },
        {
          flow: ["app", "dax"],
          times: 4,
          badge: "HIT",
          caption: {
            vi: "Các lượt đọc sau được DAX trả lời từ bộ nhớ, giảm độ trễ từ mili giây xuống micro giây; partition nóng không còn bị dồn tải.",
            en: "Later reads are served from memory by DAX, from milliseconds down to microseconds; the hot partition is no longer hammered.",
          },
        },
        {
          mark: "app",
          tone: "ok",
          caption: {
            vi: "DAX trong suốt với ứng dụng, tự lo invalidation, nạp dữ liệu và quản lý cluster, nên không cần refactor.",
            en: "DAX is transparent to the application and handles cache invalidation, data population and cluster management, so no refactoring is needed.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: { vi: "DAX cache các hot key.", en: "DAX caches the hot keys." },
      },
    },
    {
      option: "a",
      hide: ["dax", "streams", "gt"],
      steps: [
        {
          flow: ["app", "cache"],
          tone: "warn",
          caption: {
            vi: "ElastiCache cũng có thể làm cache cho các hot key.",
            en: "ElastiCache could also cache the hot keys.",
          },
        },
        {
          mark: "app",
          tone: "bad",
          badge: "refactor",
          caption: {
            vi: "Nhưng phải refactor nhiều ở phía Lambda để đọc và ghi cache.",
            en: "But it requires a lot of refactoring on the Lambda side to read and write the cache.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Cần refactor nhiều.", en: "Too much refactoring." },
      },
    },
    {
      option: "b",
      hide: ["dax", "cache", "gt"],
      steps: [
        hot,
        {
          flow: ["ddb", "streams"],
          caption: {
            vi: "DynamoDB Streams ghi lại luồng có thứ tự các thay đổi trên item của bảng.",
            en: "DynamoDB Streams captures an ordered flow of changes to items in the table.",
          },
        },
        {
          mark: "ddb",
          tone: "bad",
          caption: {
            vi: "Lượt đọc vẫn dồn vào cùng các hot key; DynamoDB Streams không giải quyết vấn đề này.",
            en: "Reads still pile onto the same hot keys; DynamoDB Streams cannot address this.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không giải quyết hot partition.", en: "No fix for the hot partition." },
      },
    },
    {
      option: "d",
      hide: ["dax", "cache", "streams"],
      steps: [
        hot,
        {
          flow: ["ddb", "gt"],
          caption: {
            vi: "Global Tables tự động sao chép bảng sang các Region khác để đọc và ghi cục bộ trên toàn cầu.",
            en: "Global Tables replicate the table to other Regions for fast local reads and writes worldwide.",
          },
        },
        {
          mark: "ddb",
          tone: "bad",
          caption: {
            vi: "Lượt đọc vẫn dồn vào cùng các hot key; Global Tables không giải quyết vấn đề này.",
            en: "Reads still pile onto the same hot keys; Global Tables cannot address this.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: { vi: "Không giải quyết hot partition.", en: "No fix for the hot partition." },
      },
    },
  ],
};

export default spec;
