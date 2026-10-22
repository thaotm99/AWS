import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import "./iac-sims.css";

// ShopViet now has several AWS accounts in AWS Organizations, in several Regions.
// The same baseline template (allowed EC2 types, standard IAM roles for Lambda) must
// land everywhere. A plain stack only reaches one account and one Region; a StackSet
// deploys the template to every target, and with automatic deployment it also reaches
// an account that joins the OU later. AWS RAM shares resources, it does not deploy.

type Mode = "stack" | "stackset" | "ram";

const ACCOUNTS = ["shopviet-prod", "shopviet-dev", "shopviet-data"];
const NEW_ACCOUNT = "shopviet-japan";
const REGIONS = ["ap-southeast-1", "us-east-1", "ap-northeast-1"];

const MODES: { id: Mode; name: string }[] = [
  { id: "stack", name: "Một stack thông thường" },
  { id: "stackset", name: "StackSet" },
  { id: "ram", name: "AWS RAM" },
];

const NOTE: Record<Mode, string> = {
  stack: "Một **stack** chỉ thuộc một account và một Region. Để triển khai tới 9 vị trí, phải đăng nhập 9 lần và tạo thủ công, dễ dẫn tới sai lệch cấu hình.",
  stackset: "**StackSet** sử dụng một template để tạo stack trong mọi account và Region đã chọn bằng một thao tác. Khi template được cập nhật một lần, mọi stack instance được cập nhật theo.",
  ram: "**AWS RAM** chia sẻ tài nguyên hiện có (subnet, Transit Gateway…) cho account khác sử dụng; dịch vụ này không triển khai template.",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const key = (a: string, r: string) => `${a}|${r}`;

export default function StackSetSim() {
  const alive = useRef(true);
  const [mode, setMode] = useState<Mode>("stack");
  const [auto, setAuto] = useState(true);
  const [joined, setJoined] = useState(false);
  const [cells, setCells] = useState<Record<string, "busy" | "done">>({});
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);
  useEffect(() => () => { alive.current = false; }, []);

  const accounts = joined ? [...ACCOUNTS, NEW_ACCOUNT] : ACCOUNTS;
  const count = Object.values(cells).filter((v) => v === "done").length;

  function pick(m: Mode) {
    if (busy) return;
    setMode(m);
    setCells({});
    setJoined(false);
    setRan(false);
  }

  async function fill(targets: string[]) {
    const fast = prefersReducedMotion();
    for (const k of targets) {
      if (!alive.current) return;
      setCells((c) => ({ ...c, [k]: "busy" }));
      if (!fast) await sleep(260);
      setCells((c) => ({ ...c, [k]: "done" }));
    }
  }

  async function deploy() {
    if (busy) return;
    setBusy(true);
    setCells({});
    setJoined(false);
    setRan(false);
    if (mode === "stack") await fill([key(ACCOUNTS[0], REGIONS[0])]);
    if (mode === "stackset") await fill(ACCOUNTS.flatMap((a) => REGIONS.map((r) => key(a, r))));
    if (mode === "ram" && !prefersReducedMotion()) await sleep(500);
    setRan(true);
    setBusy(false);
  }

  async function join() {
    if (busy || joined) return;
    setBusy(true);
    setJoined(true);
    if (mode === "stackset" && auto) {
      if (!prefersReducedMotion()) await sleep(400);
      await fill(REGIONS.map((r) => key(NEW_ACCOUNT, r)));
    }
    setBusy(false);
  }

  const CW = 170;
  const RH = 40;
  const X0 = 180;
  const Y0 = 46;
  const h = Y0 + accounts.length * RH + 10;

  return (
    <div className="stage sts">
      <div className="stage-bar" role="group" aria-label="Phương án triển khai">
        <span className="label">Phương án triển khai</span>
        {MODES.map((m) => (
          <button key={m.id} className="btn" aria-pressed={m.id === mode} disabled={busy && m.id !== mode} onClick={() => pick(m.id)}>{m.name}</button>
        ))}
        <button className="btn primary sts-play" onClick={deploy} disabled={busy}>Triển khai template baseline</button>
      </div>
      {ran && (
        <div className="stage-bar">
          <span className="label">Tháng tiếp theo</span>
          {mode === "stackset" && (
            <label className="sts-toggle">
              <input type="checkbox" checked={auto} disabled={busy || joined} onChange={(e) => setAuto(e.target.checked)} />
              Automatic deployment cho OU
            </label>
          )}
          <button className="btn" onClick={join} disabled={busy || joined}>Thêm account {NEW_ACCOUNT} vào OU</button>
        </div>
      )}
      <div className="svg-wrap">
        <svg viewBox={`0 0 ${X0 + REGIONS.length * CW + 10} ${h}`} role="img" aria-label="Bảng account và Region, ô được đánh dấu khi có stack của template baseline">
          {REGIONS.map((r, j) => (
            <text key={r} className="sts-head" x={X0 + j * CW + CW / 2} y={30} textAnchor="middle">{r}</text>
          ))}
          {accounts.map((a, i) => (
            <g key={a}>
              <text className={"sts-acc" + (a === NEW_ACCOUNT ? " new" : "")} x={X0 - 12} y={Y0 + i * RH + RH / 2 + 4} textAnchor="end">{a}</text>
              {REGIONS.map((r, j) => {
                const st = cells[key(a, r)];
                return (
                  <g key={r} className={"sts-cell " + (st ?? "")}>
                    <rect x={X0 + j * CW + 6} y={Y0 + i * RH + 4} width={CW - 12} height={RH - 8} rx={7} />
                    <text x={X0 + j * CW + CW / 2} y={Y0 + i * RH + RH / 2 + 4} textAnchor="middle">
                      {st === "done" ? "baseline ✓" : st === "busy" ? "đang tạo…" : "chưa có"}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {!ran && !busy ? (
          <p className="sts-hint">Chọn phương án triển khai, sau đó chọn nút triển khai. Template baseline quy định loại EC2 được phép sử dụng và IAM role tiêu chuẩn cho Lambda.</p>
        ) : (
          <>
            <div className="status">
              <span className="count">{count}/{accounts.length * REGIONS.length} vị trí có baseline</span>
              <span className={"pill " + (count === accounts.length * REGIONS.length ? "ok" : "bad")}><i />{count === accounts.length * REGIONS.length ? "Đồng nhất" : "Chưa đầy đủ"}</span>
            </div>
            {ran && <p className={"sts-result " + (mode === "stackset" ? "ok" : "bad")}>{rich(NOTE[mode])}</p>}
            {joined && !busy && (
              <p className={"sts-result " + (mode === "stackset" && auto ? "ok" : "bad")}>
                {rich(mode === "stackset" && auto
                  ? "Ngay khi account mới gia nhập OU, StackSet tự động tạo stack tại mọi Region đã chọn mà không cần thao tác thủ công."
                  : mode === "stackset"
                    ? "Khi tắt automatic deployment, account mới phải được thêm vào StackSet thủ công."
                    : "Account mới không có baseline; việc triển khai lại phụ thuộc vào thao tác thủ công.")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
