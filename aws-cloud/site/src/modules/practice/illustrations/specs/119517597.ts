// Practice test 5, question 29: "connection timed out" from the app servers to RDS: the DB security group lacks an
// inbound rule for the application servers. Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const bastionOk: StepSpec = {
  flow: ["bastion", "rds"],
  caption: {
    vi: "Từ bastion host trong public subnet, nhóm phát triển vẫn kết nối và chạy truy vấn trên cơ sở dữ liệu MySQL.",
    en: "From the bastion host in the public subnet, the team can still connect and run queries on the MySQL database.",
  },
};
const users: StepSpec = {
  flow: ["user", "app"],
  caption: {
    vi: "Người dùng cuối gửi request tới các application server.",
    en: "End users send requests to the application servers.",
  },
};
const credsVerdict = {
  works: false,
  caption: {
    vi: "Lỗi là connection timeout, không phải access denied.",
    en: "The error is a connection timeout, not access denied.",
  } as Bilingual,
};
const credsStep = (caption: Bilingual): StepSpec => ({ stop: ["app", "rds"], badge: "timeout", caption });

const spec: IllustrationSpec = {
  questionId: 119517597,
  cols: 4,
  rows: 2.3,
  nodes: [
    { id: "user", label: { vi: "Người dùng", en: "End users" }, kind: "actor", at: [0, 1.25] },
    { id: "bastion", label: "Bastion host", sub: "public subnet", at: [1.4, 0.1] },
    { id: "app", label: "App servers", sub: "public subnet · SG", at: [1.4, 1.25] },
    { id: "rds", label: "RDS MySQL", sub: "private subnet · SG", kind: "data", at: [3, 1.25] },
  ],
  zones: [{ id: "vpc", label: "VPC", tone: "vpc", from: [1.4, 0.1], to: [3, 1.25], pad: 12 }],
  scenarios: [
    {
      option: "a",
      steps: [
        bastionOk,
        users,
        {
          stop: ["app", "rds"],
          badge: "timeout",
          caption: {
            vi: "Security group của DB instance không có inbound rule lấy security group của application server làm nguồn, nên kết nối không được cho phép và ứng dụng báo “connection timed out”.",
            en: "The DB instance's security group has no inbound rule with the application servers' security group as the source, so the connections are not allowed and the app reports “connection timed out”.",
          },
        },
        {
          mark: "rds",
          tone: "ok",
          badge: { vi: "nguồn: SG app", en: "source: app SG" },
          caption: {
            vi: "Cách khắc phục: thêm vào security group của cơ sở dữ liệu một rule chỉ định security group của application server làm nguồn.",
            en: "The fix: add a rule to the database security group that names the application servers' security group as the source.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Đây là nguyên nhân gây lỗi connection timeout.",
          en: "This is what causes the connection timeouts.",
        },
      },
    },
    {
      option: "c",
      steps: [
        bastionOk,
        users,
        {
          stop: ["rds", "app"],
          caption: {
            vi: "Application server không cần nhận kết nối inbound từ DB instance; chính DB instance mới cần inbound rule cho phép application server.",
            en: "The application servers do not need inbound connections from the DB instance; the DB instance needs the inbound rule allowing the application servers.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Sai chiều: inbound rule cần nằm ở phía cơ sở dữ liệu.",
          en: "Wrong direction: the inbound rule belongs on the database side.",
        },
      },
    },
    {
      option: "b",
      steps: [
        bastionOk,
        users,
        credsStep({
          vi: "Sai username hoặc password sẽ cho lỗi bị từ chối truy cập (access denied), không phải “connection timed out”.",
          en: "A wrong username or password would give an access-denied error, not “connection timed out”.",
        }),
      ],
      verdict: credsVerdict,
    },
    {
      option: "d",
      steps: [
        bastionOk,
        users,
        credsStep({
          vi: "Thiếu quyền trên cơ sở dữ liệu cũng cho lỗi access denied, không phải “connection timed out”.",
          en: "Missing database privileges would also give access denied, not “connection timed out”.",
        }),
      ],
      verdict: credsVerdict,
    },
  ],
};

export default spec;
