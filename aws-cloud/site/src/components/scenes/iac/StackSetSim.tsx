import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./iac-sims.css";

// MFTech now has several AWS accounts in AWS Organizations, in several Regions.
// The same baseline template (allowed EC2 types, standard IAM roles for Lambda) must
// land everywhere. A plain stack only reaches one account and one Region; a StackSet
// deploys the template to every target, and with automatic deployment it also reaches
// an account that joins the OU later. AWS RAM shares resources, it does not deploy.

type Mode = "stack" | "stackset" | "ram";

const ACCOUNTS = ["mftech-prod", "mftech-dev", "mftech-data"];
const NEW_ACCOUNT = "mftech-japan";
const REGIONS = ["ap-southeast-1", "us-east-1", "ap-northeast-1"];

const MODES: { id: Mode; name: Bi }[] = [
  { id: "stack", name: { vi: "Một stack thông thường", en: "One regular stack" } },
  { id: "stackset", name: { vi: "StackSet", en: "StackSet" } },
  { id: "ram", name: { vi: "AWS RAM", en: "AWS RAM" } },
];

const NOTE: Record<Mode, Bi> = {
  stack: { vi: "Một **stack** chỉ thuộc một account và một Region. Để triển khai tới 9 vị trí, phải đăng nhập 9 lần và tạo thủ công, dễ dẫn tới sai lệch cấu hình.",
    en: "A **stack** belongs to only one account and one Region. To deploy to 9 locations, you have to sign in 9 times and create them manually, which easily leads to configuration drift." },
  stackset: { vi: "**StackSet** sử dụng một template để tạo stack trong mọi account và Region đã chọn bằng một thao tác. Khi template được cập nhật một lần, mọi stack instance được cập nhật theo.",
    en: "A **StackSet** uses one template to create stacks in every selected account and Region with a single operation. When the template is updated once, every stack instance is updated accordingly." },
  ram: { vi: "**AWS RAM** chia sẻ tài nguyên hiện có (subnet, Transit Gateway…) cho account khác sử dụng; dịch vụ này không triển khai template.",
    en: "**AWS RAM** shares existing resources (subnets, Transit Gateway…) with other accounts; this service does not deploy templates." },
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const key = (a: string, r: string) => `${a}|${r}`;

export default function StackSetSim() {
  const L = useLang();
  const alive = useRef(true);
  const [mode, setMode] = useState<Mode>("stack");
  const [auto, setAuto] = useState(true);
  const [joined, setJoined] = useState(false);
  const [cells, setCells] = useState<Record<string, "busy" | "done">>({});
  const [busy, setBusy] = useState(false);
  const [ran, setRan] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

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
    <div className="stage">
      <div className="stage-bar" role="group" aria-label={L({ vi: "Phương án triển khai", en: "Deployment approach" })}>
        <span className="label">{L({ vi: "Phương án triển khai", en: "Deployment approach" })}</span>
        {MODES.map((m) => (
          <button key={m.id} className="btn" aria-pressed={m.id === mode} disabled={busy && m.id !== mode} onClick={() => pick(m.id)}>{L(m.name)}</button>
        ))}
        <button className="btn primary ml-auto" onClick={deploy} disabled={busy}>{L({ vi: "Triển khai template baseline", en: "Deploy baseline template" })}</button>
      </div>
      {ran && (
        <div className="stage-bar">
          <span className="label">{L({ vi: "Tháng tiếp theo", en: "Next month" })}</span>
          {mode === "stackset" && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-step--1">
              <input type="checkbox" checked={auto} disabled={busy || joined} onChange={(e) => setAuto(e.target.checked)} />
              {L({ vi: "Automatic deployment cho OU", en: "Automatic deployment for the OU" })}
            </label>
          )}
          <button className="btn" onClick={join} disabled={busy || joined}>{L({ vi: `Thêm account ${NEW_ACCOUNT} vào OU`, en: `Add account ${NEW_ACCOUNT} to the OU` })}</button>
        </div>
      )}
      <div className="svg-wrap">
        <svg viewBox={`0 0 ${X0 + REGIONS.length * CW + 10} ${h}`} role="img" aria-label={L({ vi: "Bảng account và Region, ô được đánh dấu khi có stack của template baseline", en: "Grid of accounts and Regions; a cell is marked when it has a stack from the baseline template" })}>
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
                      {st === "done" ? "baseline ✓" : st === "busy" ? L({ vi: "đang tạo…", en: "creating…" }) : L({ vi: "chưa có", en: "none" })}
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
          <p className="m-0 text-step--1 text-muted">{L({ vi: "Chọn phương án triển khai, sau đó chọn nút triển khai. Template baseline quy định EC2 instance type được phép sử dụng và IAM role tiêu chuẩn cho Lambda.", en: "Choose a deployment approach, then choose the deploy button. The baseline template defines the allowed EC2 instance types and the standard IAM role for Lambda." })}</p>
        ) : (
          <>
            <div className="status">
              <span className="count">{count}/{accounts.length * REGIONS.length} {L({ vi: "vị trí có baseline", en: "locations with the baseline" })}</span>
              <span className={"pill " + (count === accounts.length * REGIONS.length ? "ok" : "bad")}><i />{count === accounts.length * REGIONS.length ? L({ vi: "Đồng nhất", en: "Consistent" }) : L({ vi: "Chưa đầy đủ", en: "Incomplete" })}</span>
            </div>
            {ran && <p className={"mx-0 mt-2.5 mb-0 rounded-[12px] px-2.5 py-2 text-step--1 " + (mode === "stackset" ? "bg-ok-soft" : "bg-bad-soft")}>{rich(L(NOTE[mode]))}</p>}
            {joined && !busy && (
              <p className={"mx-0 mt-2.5 mb-0 rounded-[12px] px-2.5 py-2 text-step--1 " + (mode === "stackset" && auto ? "bg-ok-soft" : "bg-bad-soft")}>
                {rich(mode === "stackset" && auto
                  ? L({ vi: "Ngay khi account mới gia nhập OU, StackSet tự động tạo stack tại mọi Region đã chọn mà không cần thao tác thủ công.", en: "As soon as the new account joins the OU, the StackSet automatically creates stacks in every selected Region with no manual action." })
                  : mode === "stackset"
                    ? L({ vi: "Khi tắt automatic deployment, account mới phải được thêm vào StackSet thủ công.", en: "With automatic deployment turned off, the new account must be added to the StackSet manually." })
                    : L({ vi: "Account mới không có baseline; việc triển khai lại phụ thuộc vào thao tác thủ công.", en: "The new account has no baseline; deploying again depends on manual action." }))}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
