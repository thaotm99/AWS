import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./storage-sims.css";

// Four MFTech teams each need a shared file system. Pick a team and a file system,
// then "mount" it: the request passes the team's three must-haves one by one and either
// reaches the file system or stops at the first requirement it cannot meet.
// Source questions: exam2_q12, exam2_q56, exam1_q65, exam3_q5, exam3_q43, exam3_q56, exam1_q24, exam3_q61, exam3_q26, exam5_q47.
// FSx for OpenZFS: fsx/latest/OpenZFSGuide/what-is-fsx.html; SnapMirror: fsx/latest/ONTAPGuide/scheduled-replication.html.

type Fs = "efs" | "win" | "lustre" | "ontap" | "zfs";
type State = "pass" | "block";
type Tone = "ok" | "warn" | "bad";

const FS: { id: Fs; l1: string; l2: Bi }[] = [
  { id: "efs", l1: "Amazon EFS", l2: { vi: "NFS cho Linux", en: "NFS for Linux" } },
  { id: "win", l1: "FSx for Windows", l2: { vi: "File Server · SMB", en: "File Server · SMB" } },
  { id: "lustre", l1: "FSx for Lustre", l2: { vi: "file system song song", en: "parallel file system" } },
  { id: "ontap", l1: "FSx for NetApp ONTAP", l2: { vi: "NFS · SMB · iSCSI", en: "NFS · SMB · iSCSI" } },
  { id: "zfs", l1: "FSx for OpenZFS", l2: { vi: "chỉ NFS · ZFS, Linux file server", en: "NFS only · ZFS, Linux file servers" } },
];

interface Team {
  name: Bi;
  client: [Bi, Bi];
  gates: [Bi, Bi][];
  /** For each file system: one verdict per gate (stops at the first block) and the result. */
  fit: Record<Fs, { steps: [State, Bi][]; tone: Tone; result: Bi }>;
}

const TEAMS: Team[] = [
  {
    name: { vi: "Kế toán: Windows + AD", en: "Accounting: Windows + AD" },
    client: [{ vi: "Máy Windows", en: "Windows PCs" }, { vi: "phòng kế toán", en: "accounting office" }],
    gates: [[{ vi: "SMB", en: "SMB" }, { vi: "giao thức Windows", en: "Windows protocol" }], [{ vi: "Quyền NTFS", en: "NTFS permissions" }, { vi: "ACL từng thư mục", en: "per-folder ACLs" }], [{ vi: "Active Directory", en: "Active Directory" }, { vi: "xác thực domain", en: "domain auth" }]],
    fit: {
      efs: { steps: [["block", { vi: "EFS chỉ hỗ trợ **NFS**; máy Windows không mount được.", en: "EFS supports only **NFS**; Windows machines cannot mount it." }]], tone: "bad", result: { vi: "Không đáp ứng được yêu cầu file share Windows.", en: "Does not meet the Windows file share requirement." } },
      win: { steps: [["pass", { vi: "Hỗ trợ đầy đủ file share **SMB**.", en: "Full support for **SMB** file shares." }], ["pass", { vi: "Giữ nguyên **NTFS ACL** của từng thư mục.", en: "Keeps the **NTFS ACLs** of every folder." }], ["pass", { vi: "Join **Active Directory** (AWS Managed Microsoft AD hoặc AD tại văn phòng).", en: "Joins **Active Directory** (AWS Managed Microsoft AD or the office AD)." }]],
        tone: "ok", result: { vi: "**FSx for Windows File Server** là file server Windows đầy đủ chức năng. Dịch vụ hỗ trợ DFS Namespaces nên thay thế được hạ tầng DFS hiện có; máy Linux cũng mount được qua SMB.", en: "**FSx for Windows File Server** is a fully featured Windows file server. It supports DFS Namespaces, so it can replace the existing DFS infrastructure; Linux machines can also mount it over SMB." } },
      lustre: { steps: [["block", { vi: "Lustre yêu cầu client Lustre trên Linux, không hỗ trợ SMB.", en: "Lustre requires the Lustre client on Linux and does not support SMB." }]], tone: "bad", result: { vi: "Không đáp ứng được yêu cầu cho máy Windows.", en: "Does not meet the requirements for Windows machines." } },
      ontap: { steps: [["pass", { vi: "ONTAP hỗ trợ **SMB**.", en: "ONTAP supports **SMB**." }], ["pass", { vi: "Hỗ trợ quyền NTFS.", en: "Supports NTFS permissions." }], ["pass", { vi: "Join được Active Directory.", en: "Can join Active Directory." }]],
        tone: "warn", result: { vi: "Đáp ứng được yêu cầu. Tuy nhiên, nếu không cần tính năng của NetApp, **FSx for Windows File Server** là lựa chọn phù hợp và đơn giản hơn.", en: "Meets the requirements. However, if you do not need NetApp features, **FSx for Windows File Server** is the better and simpler choice." } },
      zfs: { steps: [["block", { vi: "FSx for OpenZFS chỉ cung cấp **NFS** (v3, v4.0, v4.1, v4.2), không có SMB. Máy Windows mount được qua NFS client nhưng không có quyền NTFS và Active Directory.", en: "FSx for OpenZFS offers only **NFS** (v3, v4.0, v4.1, v4.2), no SMB. Windows machines can mount it with an NFS client, but get no NTFS permissions or Active Directory." }]], tone: "bad", result: { vi: "Không đáp ứng được yêu cầu file share Windows.", en: "Does not meet the Windows file share requirement." } },
    },
  },
  {
    name: { vi: "Mô phỏng HPC trên 200 node", en: "HPC simulation on 200 nodes" },
    client: [{ vi: "Cụm HPC", en: "HPC cluster" }, { vi: "200 node Linux", en: "200 Linux nodes" }],
    gates: [[{ vi: "Song song", en: "Parallel" }, { vi: "nhiều storage server", en: "many storage servers" }], [{ vi: "Nạp từ S3", en: "Load from S3" }, { vi: "data repository", en: "data repository" }], [{ vi: "Độ trễ thấp", en: "Low latency" }, { vi: "dưới mili giây", en: "sub-millisecond" }]],
    fit: {
      efs: { steps: [["block", { vi: "EFS là file system NFS dùng chung, không phải parallel file system cho HPC.", en: "EFS is a shared NFS file system, not a parallel file system for HPC." }]], tone: "bad", result: { vi: "Không đáp ứng yêu cầu tính toán hiệu năng cao.", en: "Does not meet the high performance computing requirements." } },
      win: { steps: [["block", { vi: "File share SMB cho văn phòng, không được thiết kế cho HPC.", en: "An SMB file share for offices, not designed for HPC." }]], tone: "bad", result: { vi: "Không đáp ứng yêu cầu tính toán hiệu năng cao.", en: "Does not meet the high performance computing requirements." } },
      lustre: { steps: [["pass", { vi: "Lustre phân tán tệp trên nhiều storage server; 200 node đọc **song song**.", en: "Lustre spreads files across many storage servers; the 200 nodes read **in parallel**." }], ["pass", { vi: "Liên kết với bucket **S3**: dữ liệu được nạp tự động khi đọc, kết quả được ghi ngược về S3.", en: "Linked to an **S3** bucket: data is loaded automatically on read, and results are written back to S3." }], ["pass", { vi: "Độ trễ **dưới mili giây**, throughput tăng theo dung lượng.", en: "**Sub-millisecond** latency; throughput scales with capacity." }]],
        tone: "ok", result: { vi: "**FSx for Lustre** phù hợp cho HPC, machine learning và thiết kế chip. Sau khi tác vụ hoàn tất, có thể xoá file system; dữ liệu vẫn được lưu trên S3.", en: "**FSx for Lustre** suits HPC, machine learning and chip design. When the job finishes, you can delete the file system; the data stays in S3." } },
      ontap: { steps: [["block", { vi: "ONTAP là file system đa giao thức, không phải parallel file system.", en: "ONTAP is a multiprotocol file system, not a parallel file system." }]], tone: "bad", result: { vi: "Không đáp ứng yêu cầu tính toán hiệu năng cao.", en: "Does not meet the high performance computing requirements." } },
      zfs: { steps: [["block", { vi: "OpenZFS cho độ trễ thấp (vài trăm micro giây) nhưng không phải parallel file system; với Lustre hoặc parallel file system khác, AWS khuyến nghị FSx for Lustre.", en: "OpenZFS has low latency (hundreds of microseconds) but is not a parallel file system; for Lustre or other parallel file systems, AWS recommends FSx for Lustre." }]], tone: "bad", result: { vi: "Không đáp ứng yêu cầu đọc song song từ 200 node và liên kết S3.", en: "Does not meet the parallel-read and S3-link requirements of the 200 nodes." } },
    },
  },
  {
    name: { vi: "Kho hàng đang dùng NetApp", en: "Warehouse already on NetApp" },
    client: [{ vi: "NetApp tại kho", en: "Warehouse NetApp" }, { vi: "đang dùng ONTAP", en: "running ONTAP" }],
    gates: [[{ vi: "Đa giao thức", en: "Multiprotocol" }, { vi: "NFS + SMB + iSCSI", en: "NFS + SMB + iSCSI" }], [{ vi: "SnapMirror", en: "SnapMirror" }, { vi: "sao chép dữ liệu", en: "data replication" }], [{ vi: "Công cụ ONTAP", en: "ONTAP tools" }, { vi: "giữ quy trình", en: "same processes" }]],
    fit: {
      efs: { steps: [["block", { vi: "EFS chỉ hỗ trợ NFS, không hỗ trợ SMB hoặc iSCSI.", en: "EFS supports only NFS, not SMB or iSCSI." }]], tone: "bad", result: { vi: "Các ứng dụng tại kho phải thay đổi phương thức truy cập dữ liệu.", en: "The warehouse applications would have to change how they access data." } },
      win: { steps: [["block", { vi: "Chỉ hỗ trợ SMB, không hỗ trợ NFS hoặc iSCSI.", en: "Supports only SMB, not NFS or iSCSI." }]], tone: "bad", result: { vi: "Các ứng dụng tại kho phải thay đổi phương thức truy cập dữ liệu.", en: "The warehouse applications would have to change how they access data." } },
      lustre: { steps: [["block", { vi: "Chỉ hỗ trợ client Lustre.", en: "Supports only the Lustre client." }]], tone: "bad", result: { vi: "Không phù hợp cho ứng dụng doanh nghiệp đa giao thức.", en: "Not suitable for multiprotocol enterprise applications." } },
      ontap: { steps: [["pass", { vi: "Hỗ trợ đồng thời **NFS, SMB và iSCSI**.", en: "Supports **NFS, SMB and iSCSI** at the same time." }], ["pass", { vi: "**SnapMirror** sao chép dữ liệu từ NetApp tại kho lên AWS, và sao chép theo lịch (tối đa mỗi 5 phút) giữa hai file system cùng Region hoặc khác Region.", en: "**SnapMirror** replicates data from the warehouse NetApp to AWS, and replicates on a schedule (as often as every 5 minutes) between two file systems in the same or another Region." }], ["pass", { vi: "Đội vận hành giữ nguyên lệnh và công cụ ONTAP.", en: "The operations team keeps the same ONTAP commands and tools." }]],
        tone: "ok", result: { vi: "**FSx for NetApp ONTAP**: chuyển lên AWS mà không phải thay đổi kỹ năng vận hành. AWS quản lý phần cứng và vận hành hạ tầng.", en: "**FSx for NetApp ONTAP**: move to AWS without changing operational skills. AWS manages the hardware and runs the infrastructure." } },
      zfs: { steps: [["block", { vi: "Chỉ hỗ trợ NFS, không hỗ trợ SMB hoặc iSCSI.", en: "Supports only NFS, not SMB or iSCSI." }]], tone: "bad", result: { vi: "Các ứng dụng SMB và iSCSI tại kho phải thay đổi phương thức truy cập dữ liệu. AWS khuyến nghị FSx for NetApp ONTAP khi đang dùng NetApp ONTAP.", en: "The SMB and iSCSI applications at the warehouse would have to change how they access data. AWS recommends FSx for NetApp ONTAP for workloads already on NetApp ONTAP." } },
    },
  },
  {
    name: { vi: "Web server Linux: thư mục dùng chung", en: "Linux web servers: shared folder" },
    client: [{ vi: "Web server", en: "Web servers" }, { vi: "EC2 Linux", en: "EC2 Linux" }],
    gates: [[{ vi: "NFS", en: "NFS" }, { vi: "mount trên Linux", en: "mount on Linux" }], [{ vi: "Nhiều AZ", en: "Multiple AZs" }, { vi: "chịu lỗi cấp AZ", en: "AZ fault tolerance" }], [{ vi: "Tự co giãn", en: "Elastic" }, { vi: "không cấp trước", en: "no provisioning" }]],
    fit: {
      efs: { steps: [["pass", { vi: "Mount bằng **NFS** như một thư mục thông thường.", en: "Mounts over **NFS** like a regular folder." }], ["pass", { vi: "Lưu trữ tại **nhiều AZ**, mỗi AZ một mount target.", en: "Stores data across **multiple AZs**, with one mount target per AZ." }], ["pass", { vi: "Dung lượng **tự động co giãn**, tính phí theo dung lượng sử dụng.", en: "Capacity **scales automatically**; you pay for the storage you use." }]],
        tone: "ok", result: { vi: "**Amazon EFS** là lựa chọn đơn giản nhất cho thư mục dùng chung trên Linux.", en: "**Amazon EFS** is the simplest choice for a shared folder on Linux." } },
      win: { steps: [["block", { vi: "Chỉ hỗ trợ SMB. Linux mount được qua SMB, nhưng không qua NFS.", en: "Supports only SMB. Linux can mount it over SMB, but not over NFS." }]], tone: "bad", result: { vi: "Không phù hợp cho thư mục NFS dùng chung.", en: "Not suitable for a shared NFS folder." } },
      lustre: { steps: [["block", { vi: "Yêu cầu client Lustre, không phải NFS.", en: "Requires the Lustre client, not NFS." }]], tone: "bad", result: { vi: "Vượt quá nhu cầu và không đúng giao thức cho web server.", en: "More than needed, and the wrong protocol for web servers." } },
      ontap: { steps: [["pass", { vi: "ONTAP hỗ trợ **NFS**.", en: "ONTAP supports **NFS**." }], ["pass", { vi: "Có tuỳ chọn triển khai **Multi-AZ**.", en: "Offers a **Multi-AZ** deployment option." }], ["block", { vi: "Phải **cấp phát trước** dung lượng SSD và quản lý volume.", en: "You must **provision** SSD capacity in advance and manage volumes." }]],
        tone: "bad", result: { vi: "Sử dụng được nhưng đòi hỏi nhiều công sức quản lý hơn. Thư mục dùng chung đơn giản cho Linux: **EFS**.", en: "Usable, but it takes more management effort. A simple shared folder for Linux: **EFS**." } },
      zfs: { steps: [["pass", { vi: "Mount bằng **NFS** từ Linux, Windows và macOS.", en: "Mounts over **NFS** from Linux, Windows and macOS." }], ["pass", { vi: "Deployment type **Multi-AZ (HA)** giữ một bản dữ liệu tại mỗi AZ, failover thường hoàn tất trong 60 giây.", en: "The **Multi-AZ (HA)** deployment type keeps a copy of the data in each AZ; failover typically completes within 60 seconds." }], ["pass", { vi: "Storage class **Intelligent-Tiering** co giãn, tính phí theo dữ liệu lưu trữ (SSD storage class thì phải chọn trước dung lượng).", en: "The **Intelligent-Tiering** storage class is elastic and billed for the data stored (the SSD storage class needs a size up front)." }]],
        tone: "warn", result: { vi: "Đáp ứng được khi chọn Multi-AZ và Intelligent-Tiering. FSx for OpenZFS hướng tới việc chuyển file server ZFS hoặc Linux on-premises lên AWS mà không sửa ứng dụng (snapshot, clone, nén dữ liệu). MFTech không có file server như vậy cần chuyển, nên **EFS** (serverless, không chọn deployment type) vẫn là lựa chọn đơn giản nhất.", en: "Meets the requirements with Multi-AZ and Intelligent-Tiering. FSx for OpenZFS targets moving on-premises ZFS or Linux file servers to AWS without changing applications (snapshots, clones, compression). MFTech has no such file server to move, so **EFS** (serverless, no deployment type to choose) is still the simplest choice." } },
    },
  },
];

const LANE = 135;
const CLIENT: Pt = [80, LANE];
const GX = (i: number) => 232 + i * 110;
const BUS = 548;
const FY = (i: number) => 36 + i * 50;
const FX = 590;

const TAG: Record<State, { text: Bi; cls: string }> = { pass: { text: { vi: "ĐẠT", en: "MET" }, cls: "hit" }, block: { text: { vi: "KHÔNG", en: "NOT MET" }, cls: "bad" } };
type LogEntry = { state: State; gate: Bi; msg: Bi };

export default function FsxSim() {
  const tr = useLang();
  const pk = useRef<SVGGElement>(null);
  const [teamIx, setTeamIx] = useState(0);
  const [fs, setFs] = useState<Fs>("efs");
  const team = TEAMS[teamIx];
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Record<number, State>>({});
  const [fsState, setFsState] = useState<Tone | "">("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ tone: Tone; msg: Bi } | null>(null);

  function reset() {
    setLit({});
    setFsState("");
    setLog([]);
    setResult(null);
  }

  async function mount() {
    const L = pk.current;
    if (!L || busy) return;
    setBusy(true);
    reset();
    const fit = team.fit[fs];
    let at: Pt = [CLIENT[0] + 65, LANE];
    let blocked = false;
    for (const [i, [state, msg]] of fit.steps.entries()) {
      const next: Pt = [GX(i), LANE];
      await travel(L, [at, next], i === 0 ? 420 : 280, state === "block" ? "pkt-bad" : "pkt");
      at = next;
      setLit((s) => ({ ...s, [i]: state }));
      setLog((l) => [...l, { state, gate: team.gates[i][0], msg }]);
      if (state === "block") {
        flashText(L, GX(i), LANE - 48, "✗", "flash-bad", 900);
        await travel(L, [at, [CLIENT[0] + 65, LANE]], 450, "pkt-bad");
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      const fi = FS.findIndex((f) => f.id === fs);
      await travel(L, [at, [BUS, LANE], [BUS, FY(fi)], [FX, FY(fi)]], 500, "pkt-edge");
      setFsState(fit.tone);
      flashText(L, FX + 110, FY(fi) - 28, "mounted", "stx-flash-ok", 900);
      await travel(L, [[FX, FY(fi)], [BUS, FY(fi)], [BUS, LANE], [CLIENT[0] + 65, LANE]], 650, "pkt-back");
    } else {
      setFsState("bad");
    }
    setResult({ tone: fit.tone, msg: fit.result });
    setBusy(false);
  }

  return (
    <div className="stage stx">
      <div className="stx-row" role="group" aria-label={tr({ vi: "Nhóm người dùng", en: "User group" })}>
        <span className="stx-lbl">{tr({ vi: "Nhóm", en: "Group" })}</span>
        {TEAMS.map((t, i) => (
          <button key={t.name.vi} className="chip" aria-pressed={i === teamIx} disabled={busy} onClick={() => { setTeamIx(i); reset(); }}>{tr(t.name)}</button>
        ))}
      </div>
      <div className="stx-row" role="group" aria-label="File system">
        <span className="stx-lbl">File system</span>
        {FS.map((f) => (
          <button key={f.id} className="chip" aria-pressed={f.id === fs} disabled={busy} onClick={() => { setFs(f.id); reset(); }}>{f.l1}</button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="stx-hint">{tr({ vi: "Ba yêu cầu bắt buộc: ", en: "Three must-haves: " })}{team.gates.map((g) => tr(g[0])).join(" · ")}</span>
        <button className="btn primary" onClick={mount} disabled={busy}>{tr({ vi: "Mount thử", en: "Try mount" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 10 820 250" role="img" aria-label={tr({ vi: "Request mount đi từ máy của nhóm qua ba yêu cầu bắt buộc rồi tới file system được chọn", en: "The mount request goes from the group’s machines through three must-have requirements to the chosen file system" })}>
          <path className="stx-wire" d={`M145 ${LANE} H${BUS} M${BUS} ${FY(0)} V${FY(FS.length - 1)}`} />
          {FS.map((_, i) => <path key={i} className="stx-wire" d={`M${BUS} ${FY(i)} H${FX}`} />)}
          <g className="stx-node on">
            <rect x={CLIENT[0] - 65} y={LANE - 28} width={130} height={56} rx={8} />
            <text className="stx-t" x={CLIENT[0]} y={LANE - 4} textAnchor="middle">{tr(team.client[0])}</text>
            <text className="stx-s" x={CLIENT[0]} y={LANE + 13} textAnchor="middle">{tr(team.client[1])}</text>
          </g>
          {team.gates.map(([l1, l2], i) => (
            <g key={i} className={`stx-node ${lit[i] ?? ""}`}>
              <rect x={GX(i) - 50} y={LANE - 35} width={100} height={70} rx={8} />
              <text className="stx-t" x={GX(i)} y={LANE - 3} textAnchor="middle">{tr(l1)}</text>
              <text className="stx-s" x={GX(i)} y={LANE + 13} textAnchor="middle">{tr(l2)}</text>
            </g>
          ))}
          {FS.map((f, i) => (
            <g key={f.id} className={`stx-node ${f.id === fs ? fsState || "pick" : "off"}`}>
              <rect x={FX} y={FY(i) - 21} width={220} height={42} rx={8} />
              <text className="stx-t" x={FX + 110} y={FY(i) - 3} textAnchor="middle">{f.l1}</text>
              <text className="stx-s" x={FX + 110} y={FY(i) + 13} textAnchor="middle">{tr(f.l2)}</text>
            </g>
          ))}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="stx-hint">{tr({ vi: <>Chọn một nhóm và một file system, sau đó nhấn <b>Mount thử</b>. Thử lần lượt cả năm file system để xác định lý do mỗi nhóm phù hợp với một loại.</>, en: <>Choose a group and a file system, then press <b>Try mount</b>. Try all five file systems in turn to see why each group fits one type.</> })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) => (
              <li key={i}>
                <span className={`tag ${TAG[e.state].cls}`}>{tr(TAG[e.state].text)}</span>
                <span><b>{tr(e.gate)}:</b> {rich(tr(e.msg))}</span>
              </li>
            ))}
            {result && <li className={`stx-result ${result.tone}`}>{rich(tr(result.msg))}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
