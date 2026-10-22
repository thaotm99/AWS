import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import "./iac-sims.css";

// A CloudFormation stack of ShopViet, event by event. Create: every database comes
// out of the same template with the same safe settings. Update: one line of the
// template changes the EBS volume type, and the change set shows it before it runs.
// Failure: one resource cannot be created, so the stack rolls back and deletes what
// it already made.

type Status = "none" | "progress" | "done" | "failed" | "deleting" | "deleted" | "updating";

interface Res { id: string; type: string }
interface Ev { res: string; status: Status; text: string; reason?: string }

interface Scenario {
  name: string;
  action: string;
  stack: string;
  template: { line: string; mark?: "add" | "del" | "key" | "bad" }[];
  resources: Res[];
  /** Status before the run (an update starts from a stack that already exists). */
  start: Status;
  /** Shown before the events: what CloudFormation will change. */
  changeSet?: string;
  events: Ev[];
  ok: boolean;
  result: string;
}

const RDS_TEMPLATE: Scenario["template"] = [
  { line: "Parameters:" },
  { line: "  DbClass:" },
  { line: "    Type: String", },
  { line: "    AllowedValues: [db.t3.medium, db.r6g.large]", mark: "key" },
  { line: "Resources:" },
  { line: "  DbSecurityGroup:  # chỉ cho phép 5432 từ sg-app" },
  { line: "  DbSubnetGroup:    # hai private subnet, hai AZ" },
  { line: "  Database:" },
  { line: "    Type: AWS::RDS::DBInstance" },
  { line: "    Properties:" },
  { line: "      DBInstanceClass: !Ref DbClass" },
  { line: "      VPCSecurityGroups: [!GetAtt DbSecurityGroup.GroupId]" },
  { line: "      DBSubnetGroupName: !Ref DbSubnetGroup" },
  { line: "      MultiAZ: true", mark: "key" },
  { line: "      StorageEncrypted: true", mark: "key" },
  { line: "      BackupRetentionPeriod: 7", mark: "key" },
  { line: "      DeletionProtection: true", mark: "key" },
];

const DB_RES: Res[] = [
  { id: "DbSecurityGroup", type: "AWS::EC2::SecurityGroup" },
  { id: "DbSubnetGroup", type: "AWS::RDS::DBSubnetGroup" },
  { id: "Database", type: "AWS::RDS::DBInstance" },
];

const SCENARIOS: Scenario[] = [
  {
    name: "Tạo database theo tiêu chuẩn",
    action: "Create stack",
    stack: "orders-db",
    template: RDS_TEMPLATE,
    resources: DB_RES,
    start: "none",
    events: [
      { res: "DbSecurityGroup", status: "progress", text: "CREATE_IN_PROGRESS" },
      { res: "DbSecurityGroup", status: "done", text: "CREATE_COMPLETE" },
      { res: "DbSubnetGroup", status: "progress", text: "CREATE_IN_PROGRESS" },
      { res: "DbSubnetGroup", status: "done", text: "CREATE_COMPLETE" },
      { res: "Database", status: "progress", text: "CREATE_IN_PROGRESS", reason: "Ref tới security group và subnet group, do đó chờ hai tài nguyên này được tạo xong" },
      { res: "Database", status: "done", text: "CREATE_COMPLETE" },
    ],
    ok: true,
    result: "Mọi database được tạo đều có cùng cấu hình: Multi-AZ, mã hoá, backup 7 ngày, có bảo vệ chống xoá nhầm. Nhân sự mới chỉ chọn instance class trong danh sách cho phép. Template được lưu trong Git và review như mã nguồn.",
  },
  {
    name: "Đổi volume io1 sang gp2 để giảm chi phí",
    action: "Update stack",
    stack: "report-server",
    template: [
      { line: "Resources:" },
      { line: "  ReportServer:" },
      { line: "    Type: AWS::EC2::Instance" },
      { line: "  DataVolume:" },
      { line: "    Type: AWS::EC2::Volume" },
      { line: "    Properties:" },
      { line: "      Size: 500" },
      { line: "      VolumeType: io1", mark: "del" },
      { line: "      Iops: 10000", mark: "del" },
      { line: "      VolumeType: gp2", mark: "add" },
    ],
    resources: [
      { id: "ReportServer", type: "AWS::EC2::Instance" },
      { id: "DataVolume", type: "AWS::EC2::Volume" },
    ],
    start: "done",
    changeSet: "Change set: **Modify** `DataVolume` (VolumeType, Iops) · Replacement: **False**. `ReportServer` không thay đổi.",
    events: [
      { res: "DataVolume", status: "updating", text: "UPDATE_IN_PROGRESS", reason: "Elastic Volumes thay đổi loại volume trong khi volume vẫn đang được gắn" },
      { res: "DataVolume", status: "done", text: "UPDATE_COMPLETE" },
    ],
    ok: true,
    result: "Volume io1 chiếm 90% chi phí trong khi CloudWatch cho thấy I/O chỉ tăng cao không thường xuyên. gp2 tích luỹ burst credit cho các thời điểm đó. Thay đổi được thực hiện trong template và áp dụng qua update stack, không chỉnh sửa thủ công, để template luôn phản ánh đúng hạ tầng thực tế. Bản thân CloudFormation không tính phí; chỉ tài nguyên được tạo mới bị tính phí.",
  },
  {
    name: "Lỗi trong quá trình tạo",
    action: "Create stack",
    stack: "orders-db-test",
    template: RDS_TEMPLATE.map((l) => (l.line.includes("DBInstanceClass") ? { line: "      DBInstanceClass: db.x9.huge  # nhập sai", mark: "bad" as const } : l)),
    resources: DB_RES,
    start: "none",
    events: [
      { res: "DbSecurityGroup", status: "progress", text: "CREATE_IN_PROGRESS" },
      { res: "DbSecurityGroup", status: "done", text: "CREATE_COMPLETE" },
      { res: "DbSubnetGroup", status: "progress", text: "CREATE_IN_PROGRESS" },
      { res: "DbSubnetGroup", status: "done", text: "CREATE_COMPLETE" },
      { res: "Database", status: "progress", text: "CREATE_IN_PROGRESS" },
      { res: "Database", status: "failed", text: "CREATE_FAILED", reason: "DB instance class không hợp lệ" },
      { res: "DbSubnetGroup", status: "deleting", text: "DELETE_IN_PROGRESS", reason: "ROLLBACK_IN_PROGRESS" },
      { res: "DbSubnetGroup", status: "deleted", text: "DELETE_COMPLETE" },
      { res: "DbSecurityGroup", status: "deleting", text: "DELETE_IN_PROGRESS" },
      { res: "DbSecurityGroup", status: "deleted", text: "DELETE_COMPLETE" },
    ],
    ok: false,
    result: "Stack chuyển về ROLLBACK_COMPLETE: CloudFormation xoá các tài nguyên đã tạo, không để lại hệ thống ở trạng thái dở dang. Cần sửa template và tạo lại.",
  },
];

const STATUS_CLASS: Record<Status, string> = {
  none: "", progress: "progress", done: "done", failed: "failed", deleting: "progress", deleted: "deleted", updating: "progress",
};
const STATUS_TEXT: Record<Status, string> = {
  none: "chưa tạo", progress: "đang tạo", done: "hoàn tất", failed: "lỗi", deleting: "đang xoá", deleted: "đã xoá", updating: "đang cập nhật",
};
const TAG: Record<Status, string> = {
  none: "info", progress: "info", done: "hit", failed: "bad", deleting: "miss", deleted: "miss", updating: "info",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function StackSim() {
  const alive = useRef(true);
  const [index, setIndex] = useState(0);
  const sc = SCENARIOS[index];
  const [shown, setShown] = useState(-1);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);

  const status: Record<string, Status> = Object.fromEntries(sc.resources.map((r) => [r.id, sc.start]));
  for (const ev of sc.events.slice(0, shown + 1)) status[ev.res] = ev.status;
  const done = shown === sc.events.length - 1;
  const stackStatus = shown < 0
    ? (sc.start === "done" ? "CREATE_COMPLETE" : "—")
    : done
      ? (sc.ok ? (sc.start === "done" ? "UPDATE_COMPLETE" : "CREATE_COMPLETE") : "ROLLBACK_COMPLETE")
      : sc.events.slice(0, shown + 1).some((e) => e.status === "failed")
        ? "ROLLBACK_IN_PROGRESS"
        : sc.start === "done" ? "UPDATE_IN_PROGRESS" : "CREATE_IN_PROGRESS";

  function pick(i: number) {
    if (busy) return;
    setIndex(i);
    setShown(-1);
  }

  async function play() {
    if (busy) return;
    setBusy(true);
    setShown(-1);
    const fast = prefersReducedMotion();
    if (!fast) await sleep(300);
    for (let i = 0; i < sc.events.length; i++) {
      if (!alive.current) return;
      setShown(i);
      if (!fast) await sleep(sc.events[i].status === "progress" || sc.events[i].status === "updating" ? 900 : 550);
    }
    setBusy(false);
  }

  const cardW = 220;
  const gap = 24;
  const rowW = sc.resources.length * cardW + (sc.resources.length - 1) * gap;
  const x0 = (820 - rowW) / 2;

  return (
    <div className="stage sks">
      <div className="sks-row" role="group" aria-label="Tình huống">
        {SCENARIOS.map((s, i) => (
          <button key={s.name} className="chip" aria-pressed={i === index} disabled={busy && i !== index} onClick={() => pick(i)}>{s.name}</button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">Stack</span>
        <code>{sc.stack}</code>
        <span className={"sks-status " + (stackStatus.startsWith("ROLLBACK") ? "bad" : stackStatus.endsWith("COMPLETE") ? "ok" : "")}>{stackStatus}</span>
        <button className="btn primary sks-play" onClick={play} disabled={busy}>{sc.action}</button>
      </div>
      <pre className="sks-template" aria-label="Template">
        {sc.template.map((l, i) => (
          <span key={i} className={"sks-line" + (l.mark ? " " + l.mark : "")}>{(l.mark === "add" ? "+ " : l.mark === "del" ? "- " : l.mark === "bad" ? "! " : "  ") + l.line}{"\n"}</span>
        ))}
      </pre>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 150" role="img" aria-label={`Các resource trong stack ${sc.stack} và trạng thái của từng resource`}>
          <rect className="sks-stack" x={10} y={10} width={800} height={130} rx={12} />
          <text className="sks-stack-label" x={24} y={30}>Stack {sc.stack}</text>
          {sc.resources.map((r, i) => {
            const st = status[r.id];
            const x = x0 + i * (cardW + gap);
            return (
              <g key={r.id} className={"sks-res " + STATUS_CLASS[st]}>
                <rect x={x} y={48} width={cardW} height={72} rx={9} />
                <text className="sks-id" x={x + cardW / 2} y={72} textAnchor="middle">{r.id}</text>
                <text className="sks-type" x={x + cardW / 2} y={90} textAnchor="middle">{r.type}</text>
                <text className="sks-st" x={x + cardW / 2} y={109} textAnchor="middle">{STATUS_TEXT[st]}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {sc.changeSet && <p className="sks-change">{rich(sc.changeSet)}</p>}
        {shown < 0 ? (
          <p className="sks-hint">Chọn <b>{sc.action}</b> để xem lần lượt các stack event.</p>
        ) : (
          <ul className="log">
            {sc.events.slice(0, shown + 1).map((e, i) => (
              <li key={i}>
                <span className={"tag " + TAG[e.status]}>{e.text}</span>
                <span><b>{e.res}</b>{e.reason ? `: ${e.reason}` : ""}</span>
              </li>
            ))}
            {done && <li className={"sks-result " + (sc.ok ? "ok" : "bad")}>{rich(sc.result)}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
