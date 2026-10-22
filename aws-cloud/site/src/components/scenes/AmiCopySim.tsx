import { useRef, useState, type ReactNode } from "react";
import { travel } from "../../lib/animate";
import { useLang, type Bi } from "../../lib/lang";

// Teaches that AMIs and snapshots are Regional and that copying an AMI also
// creates its backing snapshot in the destination Region (exam1_q41, exam4_q5).
type Step = 0 | 1 | 2 | 3 | 4;

function Res({ x, y, label, sub, kind }: { x: number; y: number; label: string; sub: string; kind: string }) {
  return (
    <g className={`res res-${kind} pop`}>
      <rect x={x} y={y} width={130} height={44} rx={7} />
      <text className="res-t" x={x + 12} y={y + 19}>{label}</text>
      <text className="res-s" x={x + 12} y={y + 35}>{sub}</text>
    </g>
  );
}

const NOTES: Record<Step, Bi<ReactNode>> = {
  0: { vi: <>Server <code>web-1</code> của ShopViet đang chạy tại Region Singapore. Yêu cầu: chuẩn bị sẵn phương án khôi phục tại Region Tokyo khi Singapore gặp sự cố. Thực hiện lần lượt các bước phía trên.</>,
    en: <>ShopViet's server <code>web-1</code> is running in the Singapore Region. Requirement: have a recovery plan ready in the Tokyo Region in case Singapore fails. Perform the steps above in order.</> },
  1: { vi: <>Snapshot lưu lại trạng thái EBS volume của <code>web-1</code>. Snapshot là tài nguyên cấp Region: snapshot chỉ tồn tại tại Singapore.</>,
    en: <>The snapshot saves the state of <code>web-1</code>'s EBS volume. A snapshot is a Regional resource: the snapshot exists only in Singapore.</> },
  2: { vi: <>AMI là template dùng để launch server; AMI tham chiếu tới snapshot bên dưới. AMI cũng là tài nguyên cấp Region.</>,
    en: <>An AMI is the template used to launch servers; the AMI references the snapshot underneath. An AMI is also a Regional resource.</> },
  3: { vi: <>Copy AMI sang Tokyo. AWS <b>tự động tạo một snapshot tại Tokyo</b> làm backing snapshot cho AMI bản copy (với AMI dùng EBS).</>,
    en: <>Copy the AMI to Tokyo. AWS <b>automatically creates a snapshot in Tokyo</b> as the backing snapshot for the copied AMI (for EBS-backed AMIs).</> },
  4: { vi: <>Launch <code>web-1b</code> từ AMI tại Tokyo. Region Tokyo hiện có <b>1 EC2, 1 AMI và 1 snapshot</b>.</>,
    en: <>Launch <code>web-1b</code> from the AMI in Tokyo. The Tokyo Region now has <b>1 EC2 instance, 1 AMI and 1 snapshot</b>.</> },
};

export default function AmiCopySim() {
  const [step, setStep] = useState<Step>(0);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const pk = useRef<SVGGElement>(null);
  const L = useLang();

  async function next() {
    setError(false);
    if (step === 2 && pk.current) {
      setBusy(true);
      try {
        await travel(pk.current, [[340, 182], [420, 182]], 900, "pkt", 7);
      } finally {
        setBusy(false);
      }
      // A failed launch pressed before or during the copy no longer applies once the copy is done.
      setError(false);
    }
    setStep((s) => (s + 1) as Step);
  }

  function launchWithoutCopy() {
    setError(true);
  }

  function reset() {
    setStep(0);
    setError(false);
  }

  const labels = L({
    vi: ["1. Tạo snapshot", "2. Tạo AMI", "3. Copy AMI sang Tokyo", "4. Launch EC2 tại Tokyo"],
    en: ["1. Create snapshot", "2. Create AMI", "3. Copy AMI to Tokyo", "4. Launch EC2 in Tokyo"],
  });
  const inTokyo = [step >= 4 ? "1 EC2" : "0 EC2", step >= 3 ? "1 AMI" : "0 AMI", step >= 3 ? "1 snapshot" : "0 snapshot"];

  return (
    <div className="stage">
      <div className="stage-bar">
        {step < 4 ? (
          <button className="btn primary" onClick={next} disabled={busy}>{labels[step]}</button>
        ) : (
          <button className="btn" onClick={reset}>{L({ vi: "Đặt lại", en: "Reset" })}</button>
        )}
        {step < 3 && (
          <button className="btn danger" onClick={launchWithoutCopy} disabled={busy}>{L({ vi: "Launch EC2 tại Tokyo khi chưa copy", en: "Launch EC2 in Tokyo without copying" })}</button>
        )}
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 290" role="img" aria-label={L({ vi: "Hai Region Singapore và Tokyo; AMI được copy từ Singapore sang Tokyo", en: "Two Regions, Singapore and Tokyo; the AMI is copied from Singapore to Tokyo" })}>
          <rect className="region" x={20} y={20} width={330} height={250} rx={12} />
          <text className="t" x={38} y={46}>{L({ vi: "Region Singapore", en: "Singapore Region" })}</text>
          <text className="ts" x={38} y={62}>ap-southeast-1</text>
          <rect className="region" x={410} y={20} width={330} height={250} rx={12} />
          <text className="t" x={428} y={46}>{L({ vi: "Region Tokyo", en: "Tokyo Region" })}</text>
          <text className="ts" x={428} y={62}>ap-northeast-1</text>
          <text className="ts" x={575} y={258} textAnchor="middle">{L({ vi: "Tài nguyên tại Tokyo: ", en: "Resources in Tokyo: " })}{inTokyo.join(" · ")}</text>

          <Res x={40} y={90} label="EC2 web-1" sub={L({ vi: "đang chạy", en: "running" })} kind="ec2" />
          {step >= 1 && <Res x={40} y={160} label="Snapshot" sub={L({ vi: "EBS volume của web-1", en: "EBS volume of web-1" })} kind="snap" />}
          {step >= 2 && <Res x={200} y={160} label="AMI" sub={L({ vi: "từ snapshot", en: "from snapshot" })} kind="ami" />}
          {step >= 2 && <line x1={170} y1={182} x2={200} y2={182} className="dep" />}

          {step >= 3 && <Res x={430} y={160} label={L({ vi: "AMI (bản copy)", en: "AMI (copy)" })} sub={L({ vi: "Region Tokyo", en: "Tokyo Region" })} kind="ami" />}
          {step >= 3 && <Res x={590} y={160} label="Snapshot" sub={L({ vi: "tự động tạo khi copy", en: "created by the copy" })} kind="snap" />}
          {step >= 3 && <line x1={560} y1={182} x2={590} y2={182} className="dep" />}
          {step >= 4 && <Res x={430} y={90} label="EC2 web-1b" sub={L({ vi: "launch từ AMI", en: "launched from AMI" })} kind="ec2" />}
          {error && (
            <g className="pop">
              <rect x={430} y={90} width={290} height={44} rx={7} className="err-box" />
              <text className="err-t" x={444} y={117}>{L({ vi: "Lỗi: AMI không tồn tại tại Tokyo", en: "Error: AMI does not exist in Tokyo" })}</text>
            </g>
          )}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {error
          ? L({ vi: <>Launch thất bại: AMI tại Singapore không sử dụng được tại Tokyo. Tài nguyên cấp Region không tự động khả dụng tại Region khác; tài nguyên phải được <b>copy</b> sang Region đích.</>,
              en: <>Launch failed: the AMI in Singapore cannot be used in Tokyo. Regional resources are not automatically available in another Region; they must be <b>copied</b> to the destination Region.</> })
          : L(NOTES[step])}
      </div>
    </div>
  );
}
