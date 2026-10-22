import { useState } from "react";
import { useLang, type Bi } from "../../../lib/lang";
import { rich } from "../diagram";
import "./ec2-sims.css";

// One ShopViet transcoding instance and what survives each lifecycle action: reboot, stop/start,
// hibernate, CloudWatch recovery, creating an EBS-backed AMI, terminating. Rows: instance ID,
// private / public / Elastic IP, EBS root volume, instance store scratch data, RAM.
// Also the requests EC2 rejects: adding or moving instance store after launch, undoing a terminate.
// Practice-test sources (build-time only): exam1_q2, exam1_q44, exam2_q37, exam3_q57, exam4_q26,
// exam4_q38, exam5_q52, exam6_q42.

type Action = "reboot" | "stop" | "hibernate" | "recover" | "ami" | "addStore" | "moveStore" | "terminate" | "undo";
type Mark = "kept" | "lost" | "changed" | "none";
type Row = "id" | "priv" | "pub" | "eip" | "ebs" | "store" | "ram";
interface Cell { mark: Mark; value: Bi }

const ROWS: Record<Row, Bi> = {
  id: { vi: "Instance ID", en: "Instance ID" },
  priv: { vi: "Private IPv4", en: "Private IPv4 address" },
  pub: { vi: "Public IPv4 (tự gán)", en: "Public IPv4 address (auto-assigned)" },
  eip: { vi: "Elastic IP", en: "Elastic IP address" },
  ebs: { vi: "EBS root volume", en: "EBS root volume" },
  store: { vi: "Instance store (tệp video tạm)", en: "Instance store (temporary video files)" },
  ram: { vi: "RAM (trạng thái ứng dụng)", en: "RAM (application state)" },
};

const ACTIONS: Record<Action, Bi> = {
  reboot: { vi: "Reboot", en: "Reboot" },
  stop: { vi: "Stop rồi Start", en: "Stop, then start" },
  hibernate: { vi: "Hibernate rồi Start", en: "Hibernate, then start" },
  recover: { vi: "Lỗi phần cứng → recover", en: "Hardware failure → recover" },
  ami: { vi: "Tạo AMI, launch instance mới", en: "Create AMI, launch a new instance" },
  addStore: { vi: "Thêm instance store sau khi launch", en: "Add instance store after launch" },
  moveStore: { vi: "Chuyển instance store sang instance khác", en: "Move instance store to another instance" },
  terminate: { vi: "Terminate", en: "Terminate" },
  undo: { vi: "Khôi phục instance đã terminate", en: "Recover a terminated instance" },
};

const k = (vi: string, en = vi): Cell => ({ mark: "kept", value: { vi, en } });
const lost = (vi: string, en: string): Cell => ({ mark: "lost", value: { vi, en } });
const chg = (vi: string, en: string): Cell => ({ mark: "changed", value: { vi, en } });
const none = (vi: string, en: string): Cell => ({ mark: "none", value: { vi, en } });

function baseline(eip: boolean): Record<Row, Cell> {
  return {
    id: k("i-0a1b2c3d"),
    priv: k("10.0.1.25"),
    pub: eip ? none("Không có: đã được thay bằng Elastic IP", "None: replaced by the Elastic IP address") : k("54.169.20.11"),
    eip: eip ? k("13.250.7.7") : none("Chưa gắn", "Not associated"),
    ebs: k("vol-root, 30 GiB", "vol-root, 30 GiB"),
    store: k("120 GB tệp đang xử lý", "120 GB of files in progress"),
    ram: k("Cache đã nạp", "Cache loaded"),
  };
}

interface Outcome { cells: Record<Row, Cell>; ok: boolean; state: Bi; text: Bi }

function outcome(a: Action, eip: boolean): Outcome {
  const b = baseline(eip);
  const pubNew = eip ? b.pub : chg("54.254.8.90 (địa chỉ mới)", "54.254.8.90 (new address)");
  const storeErased = lost("Bị xoá (cryptographically erased)", "Erased (cryptographically erased)");
  switch (a) {
    case "reboot":
      return { ok: true, state: { vi: "running", en: "running" }, cells: { ...b, ram: lost("Hệ điều hành khởi động lại", "Operating system restarts") },
        text: { vi: "Reboot giữ nguyên instance trên cùng host: dữ liệu instance store **được giữ lại**, mọi địa chỉ IP không đổi.",
          en: "A reboot keeps the instance on the same host: instance store data **persists**, and every IP address stays the same." } };
    case "stop":
      return { ok: eip, state: { vi: "stopped → running", en: "stopped → running" },
        cells: { ...b, pub: pubNew, store: storeErased, ram: lost("Bị xoá", "Cleared") },
        text: eip
          ? { vi: "Elastic IP là địa chỉ public **tĩnh**, thuộc account cho tới khi được release, nên đối tác vẫn kết nối được. Instance store vẫn bị xoá khi stop.",
            en: "An Elastic IP address is a **static** public address that belongs to the account until released, so partners can still connect. Instance store is still erased on stop." }
          : { vi: "Public IPv4 tự gán được **release khi stop** và instance nhận địa chỉ mới khi start: allow list của đối tác không còn đúng. Private IP được giữ. Instance store bị xoá. Cần IP cố định: bật Elastic IP và chạy lại.",
            en: "The auto-assigned public IPv4 address is **released on stop**, and the instance gets a new one on start: the partner's allow list is now wrong. The private IP is kept. Instance store is erased. For a fixed IP, turn on the Elastic IP and run again." } };
    case "hibernate":
      return { ok: true, state: { vi: "stopped (hibernated) → running", en: "stopped (hibernated) → running" },
        cells: { ...b, pub: pubNew, store: storeErased, ram: k("Được ghi xuống EBS root và nạp lại", "Saved to the EBS root volume and restored") },
        text: { vi: "Hibernate lưu RAM xuống EBS root volume (root phải là EBS, không phải instance store). Instance store **vẫn bị xoá** như khi stop; public IPv4 tự gán cũng được release.",
          en: "Hibernate saves RAM to the EBS root volume (the root must be EBS, not instance store). Instance store is **still erased**, as with a stop; the auto-assigned public IPv4 address is released too." } };
    case "recover":
      return { ok: true, state: { vi: "running (host mới)", en: "running (new host)" },
        cells: { ...b, store: lost("Bị mất (CloudWatch action based recovery)", "Lost (CloudWatch action based recovery)"), ram: lost("Bị mất", "Lost") },
        text: { vi: "Instance được chuyển sang host khác và **giữ nguyên** instance ID, private IP, public IP, Elastic IP, metadata, placement group và EBS volume. Dữ liệu trong RAM bị mất; với CloudWatch action based recovery, dữ liệu instance store cũng bị mất.",
          en: "The instance moves to another host and **keeps** its instance ID, private, public and Elastic IP addresses, metadata, placement group and EBS volumes. RAM data is lost; with CloudWatch action based recovery, instance store data is lost as well." } };
    case "ami":
      return { ok: false, state: { vi: "instance mới: running", en: "new instance: running" },
        cells: {
          id: chg("i-9f8e7d6c (instance mới)", "i-9f8e7d6c (new instance)"),
          priv: chg("10.0.1.47 (địa chỉ mới)", "10.0.1.47 (new address)"),
          pub: eip ? none("Địa chỉ mới nếu subnet tự gán", "A new one if the subnet auto-assigns") : chg("18.141.3.5 (địa chỉ mới)", "18.141.3.5 (new address)"),
          eip: eip ? none("Vẫn gắn với instance cũ", "Still associated with the old instance") : b.eip,
          ebs: k("Tạo lại từ snapshot trong AMI", "Recreated from the snapshot in the AMI"),
          store: lost("Trống: dữ liệu không nằm trong AMI", "Empty: the data is not in the AMI"),
          ram: none("Ứng dụng khởi động từ đầu", "The application starts from scratch"),
        },
        text: { vi: "AMI dựa trên EBS chỉ chứa snapshot của EBS volume. Dữ liệu trên instance store **không được đưa vào AMI** và không xuất hiện trên instance launch từ AMI đó. Cần giữ dữ liệu tạm: chép sang EBS, S3 hoặc EFS trước.",
          en: "An EBS-backed AMI contains only snapshots of EBS volumes. Instance store data is **not preserved in the AMI** and is not present on instances launched from it. To keep the temporary data, copy it to EBS, S3 or EFS first." } };
    case "addStore":
      return { ok: false, state: { vi: "running", en: "running" }, cells: b,
        text: { vi: "**Bị từ chối.** Instance store volume chỉ được chỉ định **khi launch** (block device mapping trong launch request hoặc AMI); không thể gắn thêm sau khi instance đã chạy. Số lượng và dung lượng do instance type quyết định.",
          en: "**Rejected.** Instance store volumes are specified **only at launch** (block device mapping in the launch request or the AMI); they cannot be attached after the instance is running. The number and size depend on the instance type." } };
    case "moveStore":
      return { ok: false, state: { vi: "running", en: "running" }, cells: b,
        text: { vi: "**Bị từ chối.** Instance store là ổ đĩa gắn vật lý vào host, không thể tách khỏi instance này để gắn sang instance khác. Dữ liệu cần dùng ở nơi khác phải được chép sang EBS, S3 hoặc EFS.",
          en: "**Rejected.** Instance store is disk physically attached to the host; it cannot be detached from this instance and attached to another one. Data needed elsewhere must be copied to EBS, S3 or EFS." } };
    case "terminate":
      return { ok: false, state: { vi: "terminated", en: "terminated" },
        cells: {
          id: lost("Đã terminate", "Terminated"),
          priv: lost("Được release", "Released"),
          pub: eip ? b.pub : lost("Được release", "Released"),
          eip: eip ? chg("Tách khỏi instance, vẫn thuộc account (vẫn tính phí)", "Detached, still allocated to the account (still charged)") : b.eip,
          ebs: lost("Bị xoá (DeleteOnTermination mặc định của root)", "Deleted (root default DeleteOnTermination)"),
          store: lost("Bị xoá vĩnh viễn", "Permanently deleted"),
          ram: lost("Bị xoá", "Erased"),
        },
        text: { vi: "Terminate là **vĩnh viễn và không thể đảo ngược**. EBS volume có DeleteOnTermination = true bị xoá; Elastic IP được tách ra và vẫn tính phí cho tới khi release.",
          en: "Terminating is **permanent and irreversible**. EBS volumes with DeleteOnTermination = true are deleted; the Elastic IP address is detached and is still charged until it is released." } };
    case "undo":
      return { ok: false, state: { vi: "terminated", en: "terminated" },
        cells: { id: lost("Không thể start hoặc recover", "Cannot be started or recovered"), priv: lost("Đã release", "Released"), pub: eip ? b.pub : lost("Đã release", "Released"),
          eip: eip ? chg("Có thể gắn sang instance mới", "Can be associated with a new instance") : b.eip, ebs: lost("Đã xoá", "Deleted"), store: lost("Đã xoá", "Deleted"), ram: lost("Đã xoá", "Erased") },
        text: { vi: "**Không thể.** Instance đã terminate không thể kết nối, start hay recover (kể cả bằng automatic recovery). Cách duy nhất là launch instance **mới** từ AMI và khôi phục dữ liệu từ bản sao lưu.",
          en: "**Not possible.** A terminated instance cannot be connected to, started or recovered (automatic recovery included). The only option is to launch a **new** instance from an AMI and restore data from backups." } };
  }
}

const MARK: Record<Mark, Bi> = {
  kept: { vi: "GIỮ", en: "KEPT" },
  lost: { vi: "MẤT", en: "LOST" },
  changed: { vi: "ĐỔI", en: "CHANGED" },
  none: { vi: "—", en: "—" },
};

export default function Ec2LifecycleSim() {
  const L = useLang();
  const [eip, setEip] = useState(false);
  const [act, setAct] = useState<Action | null>(null);
  const out = act ? outcome(act, eip) : null;
  const cells = out ? out.cells : baseline(eip);

  return (
    <div className="stage">
      <p className="ec2-story">{rich(L({ vi: "Instance **shop-transcode** chuyển mã video sản phẩm. Tệp đang xử lý nằm trên instance store; đối tác CDN đưa địa chỉ public của instance vào allow list. Chọn một thao tác để xem thành phần nào còn lại.",
        en: "The **shop-transcode** instance transcodes product videos. Files in progress are on the instance store; a CDN partner has put the instance's public address on its allow list. Pick an action to see what remains." }))}</p>
      <div className="stage-bar">
        <label className="lc-toggle">
          <input type="checkbox" checked={eip} onChange={(e) => setEip(e.target.checked)} />
          {L({ vi: "Gắn Elastic IP cho instance", en: "Associate an Elastic IP address" })}
        </label>
        <span className="count">{L({ vi: "Trạng thái: ", en: "State: " })}<span className="lc-state">{out ? L(out.state) : "running"}</span></span>
      </div>
      <div className="lc-actions" role="group" aria-label={L({ vi: "Thao tác", en: "Action" })}>
        {(Object.keys(ACTIONS) as Action[]).map((a) => (
          <button key={a} className={"btn" + (a === "terminate" || a === "undo" ? " danger" : "")} aria-pressed={a === act} onClick={() => setAct(a === act ? null : a)}>{L(ACTIONS[a])}</button>
        ))}
      </div>
      <table className="lc-table">
        <tbody>
          {(Object.keys(ROWS) as Row[]).map((r) => (
            <tr key={r}>
              <th scope="row">{L(ROWS[r])}</th>
              <td><span className={"lc-badge " + (out ? cells[r].mark : "none")}>{out ? L(MARK[cells[r].mark]) : L({ vi: "BAN ĐẦU", en: "START" })}</span><code>{L(cells[r].value)}</code></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="readout" aria-live="polite">
        {out ? (
          <>
            <div className="status">
              <span className={"pill " + (out.ok ? "ok" : "bad")}><i />{out.ok ? L({ vi: "Đáp ứng yêu cầu", en: "Meets the need" }) : L({ vi: "Cần lưu ý", en: "Watch out" })}</span>
              <span className="count">{L(ACTIONS[act!])}</span>
            </div>
            <p style={{ margin: "8px 0 0" }}>{rich(L(out.text))}</p>
          </>
        ) : (
          <p style={{ margin: 0 }}>{L({ vi: "Chọn một thao tác ở trên. Bật hoặc tắt Elastic IP để so sánh địa chỉ public tự gán với Elastic IP.",
            en: "Pick an action above. Turn the Elastic IP address on or off to compare an auto-assigned public address with an Elastic IP address." })}</p>
        )}
        <p className="note-small">{L({ vi: "Theo tài liệu AWS: AWS tính phí mọi địa chỉ public IPv4, kể cả Elastic IP chưa gắn; mỗi Region mặc định có quota 5 Elastic IP.",
          en: "According to the AWS documentation: AWS charges for all public IPv4 addresses, including unassociated Elastic IP addresses; each Region has a default quota of 5 Elastic IP addresses." })}</p>
      </div>
    </div>
  );
}
