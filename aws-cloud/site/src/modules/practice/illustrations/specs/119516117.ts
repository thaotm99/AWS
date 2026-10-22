// Practice test 2, question 45: encrypt an existing RDS database through an encrypted snapshot copy.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516117,
  cols: 4.3,
  rows: 2.3,
  nodes: [
    { id: "db", label: "RDS DB", sub: { vi: "chưa mã hoá", en: "unencrypted" }, kind: "data", at: [0, 1.2] },
    { id: "snap", label: "DB snapshot", sub: { vi: "chưa mã hoá", en: "unencrypted" }, at: [1.1, 1.2] },
    { id: "rr", label: "Read replica", sub: { vi: "mã hoá?", en: "encrypted?" }, kind: "ghost", at: [1.1, 1.2] },
    { id: "stby", label: "Multi-AZ standby", sub: { vi: "mã hoá?", en: "encrypted?" }, kind: "ghost", at: [1.1, 1.2] },
    { id: "toggle", label: { vi: "Bật mã hoá", en: "Enable encryption" }, sub: { vi: "trên DB đang chạy?", en: "on the running DB?" }, kind: "ghost", at: [1.1, 1.2] },
    { id: "copy", label: "Snapshot copy", sub: { vi: "đã mã hoá", en: "encrypted" }, at: [2.2, 1.2] },
    { id: "newdb", label: "RDS DB", sub: { vi: "đã mã hoá", en: "encrypted" }, kind: "data", at: [3.3, 1.2] },
    { id: "app", label: { vi: "Ứng dụng", en: "Applications" }, kind: "actor", at: [3.3, 0] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["rr", "stby", "toggle"],
      steps: [
        {
          flow: ["db", "snap"],
          badge: "1",
          caption: {
            vi: "Chỉ bật được mã hoá khi tạo DB instance, không phải sau đó. Bước 1: tạo snapshot của database chưa mã hoá.",
            en: "Encryption can only be enabled when a DB instance is created, not afterwards. Step 1: snapshot the unencrypted database.",
          },
        },
        {
          flow: ["snap", "copy"],
          badge: "2",
          caption: { vi: "Bước 2: sao chép snapshot và bật mã hoá cho bản sao.", en: "Step 2: copy the snapshot and enable encryption on the copy." },
        },
        {
          flow: ["copy", "newdb"],
          badge: "3",
          caption: { vi: "Bước 3: khôi phục database từ snapshot đã mã hoá.", en: "Step 3: restore a database from the encrypted snapshot." },
        },
        {
          flow: ["app", "newdb"],
          badge: "4",
          caption: {
            vi: "Bước 4: chuyển ứng dụng sang database mới và xoá database cũ.",
            en: "Step 4: move the applications to the new database and delete the old one.",
          },
        },
        { mark: "db", tone: "dim", badge: { vi: "đã xoá", en: "deleted" }, caption: { vi: "Database cũ chưa mã hoá bị xoá.", en: "The old unencrypted database is removed." } },
      ],
      verdict: { works: true, caption: { vi: "Mã hoá qua bản sao snapshot.", en: "Encrypted via a snapshot copy." } },
    },
    {
      option: "b",
      hide: ["snap", "stby", "toggle", "copy", "newdb", "app"],
      steps: [
        {
          stop: ["db", "rr"],
          caption: {
            vi: "Nếu database chính không được mã hoá thì read replica cũng không thể được mã hoá.",
            en: "If the master is not encrypted, its read replicas cannot be encrypted.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không tạo được replica mã hoá.", en: "No encrypted replica possible." } },
    },
    {
      option: "c",
      hide: ["snap", "rr", "toggle", "copy", "newdb", "app"],
      steps: [
        {
          stop: ["db", "stby"],
          caption: {
            vi: "Multi-AZ phục vụ tính sẵn sàng cao, không phải mã hoá.",
            en: "Multi-AZ is there for high availability, not encryption.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Multi-AZ không mã hoá dữ liệu.", en: "Multi-AZ does not encrypt." } },
    },
    {
      option: "d",
      hide: ["snap", "rr", "stby", "copy", "newdb", "app"],
      steps: [
        {
          stop: ["db", "toggle"],
          caption: {
            vi: "Không có tuỳ chọn nào trong AWS Console để mã hoá trực tiếp một RDS database đã tạo; mã hoá chỉ bật được lúc tạo DB instance.",
            en: "There is no direct console option to encrypt an existing RDS database; encryption can only be enabled when the DB instance is created.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không có tuỳ chọn này.", en: "No such option." } },
    },
  ],
};

export default spec;
