import { useRef, useState, type ReactNode } from "react";
import { travel } from "../../lib/animate";

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

const NOTES: Record<Step, ReactNode> = {
  0: <>Server <code>web-1</code> của ShopViet đang chạy tại Region Singapore. Yêu cầu: chuẩn bị sẵn phương án khôi phục tại Region Tokyo khi Singapore gặp sự cố. Thực hiện lần lượt các bước phía trên.</>,
  1: <>Snapshot lưu lại trạng thái EBS volume của <code>web-1</code>. Snapshot là tài nguyên cấp Region: snapshot chỉ tồn tại tại Singapore.</>,
  2: <>AMI là template dùng để launch server; AMI tham chiếu tới snapshot bên dưới. AMI cũng là tài nguyên cấp Region.</>,
  3: <>Copy AMI sang Tokyo. AWS <b>tự động tạo một snapshot tại Tokyo</b>, vì AMI luôn yêu cầu snapshot nằm trong cùng Region.</>,
  4: <>Launch <code>web-1b</code> từ AMI tại Tokyo. Region Tokyo hiện có <b>1 EC2, 1 AMI và 1 snapshot</b>.</>,
};

export default function AmiCopySim() {
  const [step, setStep] = useState<Step>(0);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const pk = useRef<SVGGElement>(null);

  async function next() {
    setError(false);
    if (step === 2 && pk.current) {
      setBusy(true);
      await travel(pk.current, [[340, 182], [420, 182]], 900, "pkt", 7);
      setBusy(false);
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

  const labels = ["1. Tạo snapshot", "2. Tạo AMI", "3. Copy AMI sang Tokyo", "4. Launch EC2 tại Tokyo"];
  const inTokyo = [step >= 4 ? "1 EC2" : "0 EC2", step >= 3 ? "1 AMI" : "0 AMI", step >= 3 ? "1 snapshot" : "0 snapshot"];

  return (
    <div className="stage">
      <div className="stage-bar">
        {step < 4 ? (
          <button className="btn primary" onClick={next} disabled={busy}>{labels[step]}</button>
        ) : (
          <button className="btn" onClick={reset}>Đặt lại</button>
        )}
        {step < 3 && (
          <button className="btn danger" onClick={launchWithoutCopy}>Launch EC2 tại Tokyo khi chưa copy</button>
        )}
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 0 760 290" role="img" aria-label="Hai Region Singapore và Tokyo; AMI được copy từ Singapore sang Tokyo">
          <rect className="region" x={20} y={20} width={330} height={250} rx={12} />
          <text className="t" x={38} y={46}>Region Singapore</text>
          <text className="ts" x={38} y={62}>ap-southeast-1</text>
          <rect className="region" x={410} y={20} width={330} height={250} rx={12} />
          <text className="t" x={428} y={46}>Region Tokyo</text>
          <text className="ts" x={428} y={62}>ap-northeast-1</text>
          <text className="ts" x={575} y={258} textAnchor="middle">Tài nguyên tại Tokyo: {inTokyo.join(" · ")}</text>

          <Res x={40} y={90} label="EC2 web-1" sub="đang chạy" kind="ec2" />
          {step >= 1 && <Res x={40} y={160} label="Snapshot" sub="EBS volume của web-1" kind="snap" />}
          {step >= 2 && <Res x={200} y={160} label="AMI" sub="từ snapshot" kind="ami" />}
          {step >= 2 && <line x1={170} y1={182} x2={200} y2={182} className="dep" />}

          {step >= 3 && <Res x={430} y={160} label="AMI (bản copy)" sub="Region Tokyo" kind="ami" />}
          {step >= 3 && <Res x={590} y={160} label="Snapshot" sub="tự động tạo khi copy" kind="snap" />}
          {step >= 3 && <line x1={560} y1={182} x2={590} y2={182} className="dep" />}
          {step >= 4 && <Res x={430} y={90} label="EC2 web-1b" sub="launch từ AMI" kind="ec2" />}
          {error && (
            <g className="pop">
              <rect x={430} y={90} width={290} height={44} rx={7} className="err-box" />
              <text className="err-t" x={444} y={117}>Lỗi: AMI không tồn tại tại Tokyo</text>
            </g>
          )}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {error
          ? <>Launch thất bại: AMI tại Singapore không sử dụng được tại Tokyo. Tài nguyên cấp Region không tự động khả dụng tại Region khác; tài nguyên phải được <b>copy</b> sang Region đích.</>
          : NOTES[step]}
      </div>
    </div>
  );
}
