import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./iac-sims.css";

// A CloudFormation stack of MFTECH, event by event. Create: every database comes
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
    name: "Đổi volume io1 sang gp3 để giảm chi phí",
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
      { line: "      VolumeType: gp3", mark: "add" },
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
    result: "Volume io1 chiếm 90% chi phí trong khi CloudWatch cho thấy I/O chỉ tăng cao không thường xuyên. gp3 là loại SSD volume có chi phí thấp nhất của EBS, cung cấp baseline 3.000 IOPS và có thể provision thêm IOPS khi cần (gp2 thế hệ trước dùng I/O credit để burst). Thay đổi được thực hiện trong template và áp dụng qua update stack, không chỉnh sửa thủ công, để template luôn phản ánh đúng hạ tầng thực tế. CloudFormation không tính phí bổ sung với tài nguyên AWS::*; chỉ tài nguyên AWS được tạo mới bị tính phí.",
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
    result: "Theo mặc định, stack rollback và chuyển về ROLLBACK_COMPLETE: CloudFormation xoá các tài nguyên đã tạo, không để lại hệ thống ở trạng thái dở dang. Cần sửa template và tạo lại.",
  },
];

const RDS_TEMPLATE_EN: Scenario["template"] = RDS_TEMPLATE.map((l) =>
  l.line.includes("DbSecurityGroup:  #") ? { ...l, line: "  DbSecurityGroup:  # allows only 5432 from sg-app" }
  : l.line.includes("DbSubnetGroup:    #") ? { ...l, line: "  DbSubnetGroup:    # two private subnets, two AZs" }
  : l);

const SCENARIOS_EN: Scenario[] = [
  {
    name: "Create a database to the standard",
    action: "Create stack",
    stack: "orders-db",
    template: RDS_TEMPLATE_EN,
    resources: DB_RES,
    start: "none",
    events: [
      { res: "DbSecurityGroup", status: "progress", text: "CREATE_IN_PROGRESS" },
      { res: "DbSecurityGroup", status: "done", text: "CREATE_COMPLETE" },
      { res: "DbSubnetGroup", status: "progress", text: "CREATE_IN_PROGRESS" },
      { res: "DbSubnetGroup", status: "done", text: "CREATE_COMPLETE" },
      { res: "Database", status: "progress", text: "CREATE_IN_PROGRESS", reason: "Refs the security group and subnet group, so it waits until both are created" },
      { res: "Database", status: "done", text: "CREATE_COMPLETE" },
    ],
    ok: true,
    result: "Every database created has the same configuration: Multi-AZ, encryption, 7-day backups, protection against accidental deletion. New employees only choose an instance class from the allowed list. The template is stored in Git and reviewed like code.",
  },
  {
    name: "Change io1 volume to gp3 to cut cost",
    action: "Update stack",
    stack: "report-server",
    template: SCENARIOS[1].template,
    resources: SCENARIOS[1].resources,
    start: "done",
    changeSet: "Change set: **Modify** `DataVolume` (VolumeType, Iops) · Replacement: **False**. `ReportServer` does not change.",
    events: [
      { res: "DataVolume", status: "updating", text: "UPDATE_IN_PROGRESS", reason: "Elastic Volumes changes the volume type while the volume stays attached" },
      { res: "DataVolume", status: "done", text: "UPDATE_COMPLETE" },
    ],
    ok: true,
    result: "The io1 volume accounts for 90% of the cost while CloudWatch shows I/O is high only occasionally. gp3 is the lowest-cost EBS SSD volume type, provides a baseline of 3,000 IOPS and can provision additional IOPS when needed (the previous-generation gp2 uses I/O credits to burst). The change is made in the template and applied through an update stack, not edited manually, so that the template always reflects the actual infrastructure. CloudFormation incurs no additional charge for AWS::* resources; only the AWS resources created are charged.",
  },
  {
    name: "Failure during creation",
    action: "Create stack",
    stack: "orders-db-test",
    template: RDS_TEMPLATE_EN.map((l) => (l.line.includes("DBInstanceClass") ? { line: "      DBInstanceClass: db.x9.huge  # typo", mark: "bad" as const } : l)),
    resources: DB_RES,
    start: "none",
    events: [
      { res: "DbSecurityGroup", status: "progress", text: "CREATE_IN_PROGRESS" },
      { res: "DbSecurityGroup", status: "done", text: "CREATE_COMPLETE" },
      { res: "DbSubnetGroup", status: "progress", text: "CREATE_IN_PROGRESS" },
      { res: "DbSubnetGroup", status: "done", text: "CREATE_COMPLETE" },
      { res: "Database", status: "progress", text: "CREATE_IN_PROGRESS" },
      { res: "Database", status: "failed", text: "CREATE_FAILED", reason: "Invalid DB instance class" },
      { res: "DbSubnetGroup", status: "deleting", text: "DELETE_IN_PROGRESS", reason: "ROLLBACK_IN_PROGRESS" },
      { res: "DbSubnetGroup", status: "deleted", text: "DELETE_COMPLETE" },
      { res: "DbSecurityGroup", status: "deleting", text: "DELETE_IN_PROGRESS" },
      { res: "DbSecurityGroup", status: "deleted", text: "DELETE_COMPLETE" },
    ],
    ok: false,
    result: "By default, the stack rolls back and ends in ROLLBACK_COMPLETE: CloudFormation deletes the resources it created and does not leave the system half-built. Fix the template and create the stack again.",
  },
];

const STATUS_CLASS: Record<Status, string> = {
  none: "", progress: "progress", done: "done", failed: "failed", deleting: "progress", deleted: "deleted", updating: "progress",
};
const STATUS_TEXT: Record<Status, Bi> = {
  none: { vi: "chưa tạo", en: "not created" },
  progress: { vi: "đang tạo", en: "creating" },
  done: { vi: "hoàn tất", en: "complete" },
  failed: { vi: "lỗi", en: "failed" },
  deleting: { vi: "đang xoá", en: "deleting" },
  deleted: { vi: "đã xoá", en: "deleted" },
  updating: { vi: "đang cập nhật", en: "updating" },
};
const TAG: Record<Status, string> = {
  none: "info", progress: "info", done: "hit", failed: "bad", deleting: "miss", deleted: "miss", updating: "info",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function StackSim() {
  const L = useLang();
  const alive = useRef(true);
  const [index, setIndex] = useState(0);
  const sc = L({ vi: SCENARIOS, en: SCENARIOS_EN })[index];
  const [shown, setShown] = useState(-1);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

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
    <div className="stage">
      <div className="flex flex-wrap gap-1.5 px-3.5 pt-3 pb-0" role="group" aria-label={L({ vi: "Tình huống", en: "Scenarios" })}>
        {L({ vi: SCENARIOS, en: SCENARIOS_EN }).map((s, i) => (
          <button key={i} className="chip" aria-pressed={i === index} disabled={busy && i !== index} onClick={() => pick(i)}>{s.name}</button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="label">Stack</span>
        <code>{sc.stack}</code>
        <span className={"rounded-[10px] border px-2 py-0.5 font-mono text-[0.8125rem] font-semibold " + (stackStatus.startsWith("ROLLBACK") ? "border-bad bg-bad-soft text-bad" : stackStatus.endsWith("COMPLETE") ? "border-ok bg-ok-soft text-ok" : "border-line bg-bg text-muted")}>{stackStatus}</span>
        <button className="btn primary ml-auto" onClick={play} disabled={busy}>{sc.action}</button>
      </div>
      <pre className="mx-3.5 mt-3 mb-0 rounded-[12px] bg-bg overflow-x-auto border border-line px-3 py-2.5 font-mono text-[0.8125rem] leading-[1.5] text-ink" aria-label="Template">
        {sc.template.map((l, i) => (
          <span key={i} className={"sks-line" + (l.mark ? " " + l.mark : "")}>{(l.mark === "add" ? "+ " : l.mark === "del" ? "- " : l.mark === "bad" ? "! " : "  ") + l.line}{"\n"}</span>
        ))}
      </pre>
      <div className="svg-wrap">
        <svg viewBox="0 0 820 150" role="img" aria-label={L({ vi: `Các resource trong stack ${sc.stack} và trạng thái của từng resource`, en: `The resources in stack ${sc.stack} and the status of each resource` })}>
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
                <text className="sks-st" x={x + cardW / 2} y={109} textAnchor="middle">{L(STATUS_TEXT[st])}</text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {sc.changeSet && <p className="mx-0 mt-0 mb-2 rounded-[12px] bg-accent-soft px-2.5 py-1.5 text-step--1">{rich(sc.changeSet)}</p>}
        {shown < 0 ? (
          <p className="m-0 text-step--1 text-muted">{L({ vi: <>Chọn <b>{sc.action}</b> để xem lần lượt các stack event.</>, en: <>Choose <b>{sc.action}</b> to see the stack events one by one.</> })}</p>
        ) : (
          <ul className="log">
            {sc.events.slice(0, shown + 1).map((e, i) => (
              <li key={i}>
                <span className={"tag " + TAG[e.status]}>{e.text}</span>
                <span><b>{e.res}</b>{e.reason ? `: ${e.reason}` : ""}</span>
              </li>
            ))}
            {done && <li className={"mt-1.5 block rounded-[12px] px-2.5 py-2 " + (sc.ok ? "bg-ok-soft" : "bg-bad-soft")}>{rich(sc.result)}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
