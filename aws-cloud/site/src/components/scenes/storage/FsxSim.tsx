import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./storage-sims.css";

// Four ShopViet teams each need a shared file system. Pick a team and a file system,
// then "mount" it: the request passes the team's three must-haves one by one and either
// reaches the file system or stops at the first requirement it cannot meet.
// Source questions: exam2_q12, exam2_q56, exam1_q65, exam3_q5, exam3_q43, exam3_q56, exam1_q24, exam3_q61, exam3_q26.

type Fs = "efs" | "win" | "lustre" | "ontap";
type State = "pass" | "block";
type Tone = "ok" | "warn" | "bad";

const FS: { id: Fs; l1: string; l2: string }[] = [
  { id: "efs", l1: "Amazon EFS", l2: "NFS cho Linux" },
  { id: "win", l1: "FSx for Windows", l2: "File Server · SMB" },
  { id: "lustre", l1: "FSx for Lustre", l2: "file system song song" },
  { id: "ontap", l1: "FSx for NetApp ONTAP", l2: "NFS · SMB · iSCSI" },
];

interface Team {
  name: string;
  client: [string, string];
  gates: [string, string][];
  /** For each file system: one verdict per gate (stops at the first block) and the result. */
  fit: Record<Fs, { steps: [State, string][]; tone: Tone; result: string }>;
}

const TEAMS: Team[] = [
  {
    name: "Kế toán: Windows + AD",
    client: ["Máy Windows", "phòng kế toán"],
    gates: [["SMB", "giao thức Windows"], ["Quyền NTFS", "ACL từng thư mục"], ["Active Directory", "xác thực domain"]],
    fit: {
      efs: { steps: [["block", "EFS chỉ hỗ trợ **NFS**; máy Windows không mount được."]], tone: "bad", result: "Không đáp ứng được yêu cầu file share Windows." },
      win: { steps: [["pass", "Hỗ trợ đầy đủ file share **SMB**."], ["pass", "Giữ nguyên **NTFS ACL** của từng thư mục."], ["pass", "Join **Active Directory** (AWS Managed Microsoft AD hoặc AD tại văn phòng)."]],
        tone: "ok", result: "**FSx for Windows File Server** là file server Windows đầy đủ chức năng. Dịch vụ hỗ trợ DFS Namespaces nên thay thế được cụm DFS hiện có; máy Linux cũng mount được qua SMB." },
      lustre: { steps: [["block", "Lustre yêu cầu client Lustre trên Linux, không hỗ trợ SMB."]], tone: "bad", result: "Không đáp ứng được yêu cầu cho máy Windows." },
      ontap: { steps: [["pass", "ONTAP hỗ trợ **SMB**."], ["pass", "Hỗ trợ quyền NTFS."], ["pass", "Join được Active Directory."]],
        tone: "warn", result: "Đáp ứng được yêu cầu. Tuy nhiên, nếu không cần tính năng của NetApp, **FSx for Windows File Server** là lựa chọn phù hợp và đơn giản hơn." },
    },
  },
  {
    name: "Mô phỏng HPC trên 200 node",
    client: ["Cụm HPC", "200 node Linux"],
    gates: [["Song song", "nhiều server lưu"], ["Nạp từ S3", "data repository"], ["Độ trễ thấp", "dưới mili giây"]],
    fit: {
      efs: { steps: [["block", "EFS là file system NFS dùng chung, không phải parallel file system cho HPC."]], tone: "bad", result: "Không đáp ứng yêu cầu tính toán hiệu năng cao." },
      win: { steps: [["block", "File share SMB cho văn phòng, không được thiết kế cho HPC."]], tone: "bad", result: "Không đáp ứng yêu cầu tính toán hiệu năng cao." },
      lustre: { steps: [["pass", "Lustre phân tán tệp trên nhiều server lưu trữ; 200 node đọc **song song**."], ["pass", "Liên kết với bucket **S3**: dữ liệu được nạp tự động khi đọc, kết quả được ghi ngược về S3."], ["pass", "Độ trễ **dưới mili giây**, throughput tăng theo dung lượng."]],
        tone: "ok", result: "**FSx for Lustre** phù hợp cho HPC, machine learning và thiết kế chip. Sau khi tác vụ hoàn tất, có thể xoá file system; dữ liệu vẫn được lưu trên S3." },
      ontap: { steps: [["block", "ONTAP là file system đa giao thức, không phải parallel file system."]], tone: "bad", result: "Không đáp ứng yêu cầu tính toán hiệu năng cao." },
    },
  },
  {
    name: "Kho hàng đang dùng NetApp",
    client: ["NetApp tại kho", "đang dùng ONTAP"],
    gates: [["Đa giao thức", "NFS + SMB + iSCSI"], ["SnapMirror", "sao chép dữ liệu"], ["Công cụ ONTAP", "giữ quy trình"]],
    fit: {
      efs: { steps: [["block", "EFS chỉ hỗ trợ NFS, không hỗ trợ SMB hoặc iSCSI."]], tone: "bad", result: "Các ứng dụng tại kho phải thay đổi phương thức truy cập dữ liệu." },
      win: { steps: [["block", "Chỉ hỗ trợ SMB, không hỗ trợ NFS hoặc iSCSI."]], tone: "bad", result: "Các ứng dụng tại kho phải thay đổi phương thức truy cập dữ liệu." },
      lustre: { steps: [["block", "Chỉ hỗ trợ client Lustre."]], tone: "bad", result: "Không phù hợp cho ứng dụng doanh nghiệp đa giao thức." },
      ontap: { steps: [["pass", "Hỗ trợ đồng thời **NFS, SMB và iSCSI**."], ["pass", "Sử dụng **SnapMirror** để sao chép dữ liệu từ hệ thống NetApp hiện có."], ["pass", "Đội vận hành giữ nguyên lệnh và công cụ ONTAP."]],
        tone: "ok", result: "**FSx for NetApp ONTAP**: chuyển lên AWS mà không phải thay đổi kỹ năng vận hành. AWS quản lý phần cứng và vận hành hạ tầng." },
    },
  },
  {
    name: "Web server Linux: thư mục dùng chung",
    client: ["Web server", "EC2 Linux"],
    gates: [["NFS", "mount trên Linux"], ["Nhiều AZ", "chịu lỗi cấp AZ"], ["Tự co giãn", "không cấp trước"]],
    fit: {
      efs: { steps: [["pass", "Mount bằng **NFS** như một thư mục thông thường."], ["pass", "Lưu trữ tại **nhiều AZ**, mỗi AZ một mount target."], ["pass", "Dung lượng **tự động co giãn**, tính phí theo dung lượng sử dụng."]],
        tone: "ok", result: "**Amazon EFS** là lựa chọn đơn giản nhất cho thư mục dùng chung trên Linux." },
      win: { steps: [["block", "Chỉ hỗ trợ SMB. Linux mount được qua SMB, nhưng không qua NFS."]], tone: "bad", result: "Không phù hợp cho thư mục NFS dùng chung." },
      lustre: { steps: [["block", "Yêu cầu client Lustre, không phải NFS."]], tone: "bad", result: "Vượt quá nhu cầu và không đúng giao thức cho web server." },
      ontap: { steps: [["pass", "ONTAP hỗ trợ **NFS**."], ["pass", "Có tuỳ chọn triển khai **Multi-AZ**."], ["block", "Phải **cấp phát trước** dung lượng SSD và quản lý volume."]],
        tone: "bad", result: "Sử dụng được nhưng đòi hỏi nhiều công sức quản lý hơn. Thư mục dùng chung đơn giản cho Linux: **EFS**." },
    },
  },
];

const LANE = 135;
const CLIENT: Pt = [80, LANE];
const GX = (i: number) => 232 + i * 110;
const BUS = 548;
const FY = (i: number) => 42 + i * 62;
const FX = 590;

const TAG: Record<State, { text: string; cls: string }> = { pass: { text: "ĐẠT", cls: "hit" }, block: { text: "KHÔNG", cls: "bad" } };
type LogEntry = { state: State; gate: string; msg: ReactNode };

export default function FsxSim() {
  const pk = useRef<SVGGElement>(null);
  const [teamIx, setTeamIx] = useState(0);
  const [fs, setFs] = useState<Fs>("efs");
  const team = TEAMS[teamIx];
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Record<number, State>>({});
  const [fsState, setFsState] = useState<Tone | "">("");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ tone: Tone; msg: ReactNode } | null>(null);

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
      setLog((l) => [...l, { state, gate: team.gates[i][0], msg: rich(msg) }]);
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
    setResult({ tone: fit.tone, msg: rich(fit.result) });
    setBusy(false);
  }

  return (
    <div className="stage stx">
      <div className="stx-row" role="group" aria-label="Nhóm người dùng">
        <span className="stx-lbl">Nhóm</span>
        {TEAMS.map((t, i) => (
          <button key={t.name} className="chip" aria-pressed={i === teamIx} disabled={busy} onClick={() => { setTeamIx(i); reset(); }}>{t.name}</button>
        ))}
      </div>
      <div className="stx-row" role="group" aria-label="File system">
        <span className="stx-lbl">File system</span>
        {FS.map((f) => (
          <button key={f.id} className="chip" aria-pressed={f.id === fs} disabled={busy} onClick={() => { setFs(f.id); reset(); }}>{f.l1}</button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="stx-hint">Ba yêu cầu bắt buộc: {team.gates.map((g) => g[0]).join(" · ")}</span>
        <button className="btn primary" onClick={mount} disabled={busy}>Mount thử</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 10 820 250" role="img" aria-label="Request mount đi từ máy của nhóm qua ba yêu cầu bắt buộc rồi tới file system được chọn">
          <path className="stx-wire" d={`M145 ${LANE} H${BUS} M${BUS} ${FY(0)} V${FY(3)}`} />
          {FS.map((_, i) => <path key={i} className="stx-wire" d={`M${BUS} ${FY(i)} H${FX}`} />)}
          <g className="stx-node on">
            <rect x={CLIENT[0] - 65} y={LANE - 28} width={130} height={56} rx={8} />
            <text className="stx-t" x={CLIENT[0]} y={LANE - 4} textAnchor="middle">{team.client[0]}</text>
            <text className="stx-s" x={CLIENT[0]} y={LANE + 13} textAnchor="middle">{team.client[1]}</text>
          </g>
          {team.gates.map(([l1, l2], i) => (
            <g key={i} className={`stx-node ${lit[i] ?? ""}`}>
              <rect x={GX(i) - 50} y={LANE - 35} width={100} height={70} rx={8} />
              <text className="stx-t" x={GX(i)} y={LANE - 3} textAnchor="middle">{l1}</text>
              <text className="stx-s" x={GX(i)} y={LANE + 13} textAnchor="middle">{l2}</text>
            </g>
          ))}
          {FS.map((f, i) => (
            <g key={f.id} className={`stx-node ${f.id === fs ? fsState || "pick" : "off"}`}>
              <rect x={FX} y={FY(i) - 24} width={220} height={48} rx={8} />
              <text className="stx-t" x={FX + 110} y={FY(i) - 4} textAnchor="middle">{f.l1}</text>
              <text className="stx-s" x={FX + 110} y={FY(i) + 12} textAnchor="middle">{f.l2}</text>
            </g>
          ))}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="stx-hint">Chọn một nhóm và một file system, sau đó nhấn <b>Mount thử</b>. Thử lần lượt cả bốn file system để xác định lý do mỗi nhóm phù hợp với một loại.</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) => (
              <li key={i}>
                <span className={`tag ${TAG[e.state].cls}`}>{TAG[e.state].text}</span>
                <span><b>{e.gate}:</b> {e.msg}</span>
              </li>
            ))}
            {result && <li className={`stx-result ${result.tone}`}>{result.msg}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
