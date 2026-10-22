import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./asg-sims.css";

// When does the Auto Scaling group replace an instance, and in which order?
// EC2 status check impaired (waits a few minutes), ALB health check failing with the
// group's health check type EC2 vs ELB, a custom health check (SetInstanceHealth),
// health check replacement (terminate, then launch; or launch first with an instance
// maintenance policy) and AZ rebalancing (launch before terminate).

type State = "ok" | "impaired" | "oos" | "unhealthy" | "terminating" | "pending";
interface Inst { id: string; az: "AZ-A" | "AZ-B"; state: State; note?: Bi }
interface Step { msg: Bi; inst: Inst[] }
interface Case {
  id: string;
  name: Bi;
  intro: Bi;
  toggle?: [Bi, Bi];
  desired?: number;
  steps: (on: boolean) => Step[];
  result: (on: boolean) => { ok: boolean; text: Bi };
}

const base = (): Inst[] => [
  { id: "i-1", az: "AZ-A", state: "ok" },
  { id: "i-2", az: "AZ-A", state: "ok" },
  { id: "i-3", az: "AZ-B", state: "ok" },
  { id: "i-4", az: "AZ-B", state: "ok" },
];
/** Copy of `list` with instance `id` changed (or removed when patch is null). */
function set(list: Inst[], id: string, patch: Partial<Inst> | null): Inst[] {
  return patch === null ? list.filter((i) => i.id !== id) : list.map((i) => (i.id === id ? { ...i, ...patch } : i));
}
const add = (list: Inst[], inst: Inst) => [...list, inst];

const CASES: Case[] = [
  {
    id: "impaired",
    name: { vi: "EC2 status check: impaired", en: "EC2 status check: impaired" },
    intro: { vi: "Phần cứng phía dưới i-2 gặp sự cố, status check của EC2 chuyển sang impaired. ASG dùng health check type EC2 (mặc định).", en: "The hardware under i-2 has a problem and its EC2 status check becomes impaired. The ASG uses the EC2 health check type (the default)." },
    toggle: [{ vi: "Status check tự phục hồi sau vài phút", en: "The status check recovers after a few minutes" }, { vi: "Status check vẫn impaired", en: "The status check stays impaired" }],
    steps: (recovers) => {
      const s1 = set(base(), "i-2", { state: "impaired", note: { vi: "status check: impaired", en: "status check: impaired" } });
      const steps: Step[] = [
        { msg: { vi: "Status check của i-2 trả về **impaired**.", en: "i-2's status check returns **impaired**." }, inst: s1 },
        { msg: { vi: "ASG **không** đánh dấu Unhealthy ngay: Auto Scaling chờ vài phút để AWS khắc phục sự cố. Status check trả về insufficient-data cũng không bị coi là Unhealthy.", en: "The ASG does **not** mark it Unhealthy right away: Auto Scaling waits a few minutes for AWS to fix the issue. A status check returning insufficient-data is not treated as Unhealthy either." }, inst: set(s1, "i-2", { note: { vi: "ASG đang chờ", en: "ASG waiting" } }) },
      ];
      if (recovers) {
        steps.push({ msg: { vi: "Status check trở lại ok. i-2 tiếp tục InService, không có instance nào bị thay thế.", en: "The status check returns to ok. i-2 stays InService and no instance is replaced." }, inst: base() });
      } else {
        const u = set(s1, "i-2", { state: "unhealthy", note: undefined });
        steps.push(
          { msg: { vi: "Sau thời gian chờ, status check vẫn impaired: ASG đánh dấu i-2 **Unhealthy**.", en: "After the wait, the status check is still impaired: the ASG marks i-2 **Unhealthy**." }, inst: u },
          { msg: { vi: "Scaling activity thứ nhất terminate i-2.", en: "A first scaling activity terminates i-2." }, inst: set(u, "i-2", { state: "terminating" }) },
          { msg: { vi: "Scaling activity thứ hai launch i-5 để duy trì desired capacity.", en: "A second scaling activity launches i-5 to maintain desired capacity." }, inst: add(set(u, "i-2", null), { id: "i-5", az: "AZ-A", state: "pending" }) },
          { msg: { vi: "i-5 InService. Nhóm trở lại 4 instance.", en: "i-5 is InService. The group is back to 4 instances." }, inst: add(set(base(), "i-2", null), { id: "i-5", az: "AZ-A", state: "ok" }) },
        );
      }
      return steps;
    },
    result: (recovers) => recovers
      ? { ok: true, text: { vi: "Lỗi tạm thời của status check không làm ASG terminate instance. Đây là một lý do ASG chưa thay thế một instance đang impaired.", en: "A temporary status check failure does not make the ASG terminate the instance. This is one reason an ASG has not yet replaced an impaired instance." } }
      : { ok: true, text: { vi: "Status check impaired kéo dài: ASG thay thế instance sau thời gian chờ. Khác với trường hợp instance không còn ở trạng thái running (stopped, terminated…), khi đó ASG thay thế ngay.", en: "A lasting impaired status: the ASG replaces the instance after the wait. Unlike an instance that is no longer running (stopped, terminated…), which the ASG replaces immediately." } },
  },
  {
    id: "elb",
    name: { vi: "ALB health check thất bại", en: "ALB health check fails" },
    intro: { vi: "Ứng dụng trên i-3 bị treo: EC2 status check vẫn ok nhưng ALB nhận lỗi khi gọi /health.", en: "The application on i-3 hangs: the EC2 status check is still ok, but the ALB gets errors calling /health." },
    toggle: [{ vi: "Health check type của ASG: ELB", en: "ASG health check type: ELB" }, { vi: "Health check type của ASG: EC2 (mặc định)", en: "ASG health check type: EC2 (default)" }],
    steps: (elb) => {
      const s1 = set(base(), "i-3", { state: "oos", note: { vi: "ALB: unhealthy", en: "ALB: unhealthy" } });
      const steps: Step[] = [{ msg: { vi: "ALB đánh dấu i-3 unhealthy và ngừng định tuyến request tới instance này.", en: "The ALB marks i-3 unhealthy and stops routing requests to it." }, inst: s1 }];
      if (!elb) {
        steps.push({ msg: { vi: "Health check type là EC2: mặc định Auto Scaling **bỏ qua** kết quả health check của ELB. i-3 vẫn Healthy trong ASG.", en: "The health check type is EC2: by default Auto Scaling **ignores** the ELB health check results. i-3 is still Healthy in the ASG." }, inst: set(s1, "i-3", { note: { vi: "ALB: unhealthy · ASG: Healthy", en: "ALB: unhealthy · ASG: Healthy" } }) });
      } else {
        const u = set(s1, "i-3", { state: "unhealthy", note: undefined });
        steps.push(
          { msg: { vi: "Đã bật ELB health check: ở lần kiểm tra định kỳ tiếp theo, ASG đánh dấu i-3 **Unhealthy**.", en: "ELB health checks are on: on its next periodic health check, the ASG marks i-3 **Unhealthy**." }, inst: u },
          { msg: { vi: "ASG chờ request đang xử lý hoàn tất (deregistration delay) rồi terminate i-3.", en: "The ASG waits for in-flight requests to complete (deregistration delay), then terminates i-3." }, inst: set(u, "i-3", { state: "terminating" }) },
          { msg: { vi: "ASG launch i-5 tại AZ-B và đăng ký vào target group.", en: "The ASG launches i-5 in AZ-B and registers it with the target group." }, inst: add(set(u, "i-3", null), { id: "i-5", az: "AZ-B", state: "ok" }) },
        );
      }
      return steps;
    },
    result: (elb) => elb
      ? { ok: true, text: { vi: "Với ELB health check, ASG thay thế instance mà load balancer báo lỗi.", en: "With ELB health checks, the ASG replaces the instance the load balancer reports as failed." } }
      : { ok: false, text: { vi: "Instance lỗi không bị thay thế, nhóm chạy thiếu capacity. Cần bật ELB health check cho ASG.", en: "The failed instance is not replaced and the group runs short of capacity. Turn on ELB health checks for the ASG." } },
  },
  {
    id: "custom",
    name: { vi: "Custom health check", en: "Custom health check" },
    intro: { vi: "Worker i-4 đọc đơn hàng từ SQS, không nhận request từ ALB. Script giám sát của ShopViet phát hiện worker ngừng xử lý message và gọi `SetInstanceHealth` với trạng thái Unhealthy.", en: "Worker i-4 reads orders from SQS and receives no ALB requests. ShopViet's monitoring script detects that the worker stopped processing messages and calls `SetInstanceHealth` with status Unhealthy." },
    toggle: [{ vi: "i-4 vừa launch, còn trong health check grace period", en: "i-4 just launched and is within the health check grace period" }, { vi: "i-4 đã qua health check grace period", en: "i-4 is past the health check grace period" }],
    steps: (grace) => {
      const s1 = set(base(), "i-4", { state: grace ? "pending" : "ok", note: { vi: "set-instance-health: Unhealthy", en: "set-instance-health: Unhealthy" } });
      if (grace) return [
        { msg: { vi: "Script gọi `aws autoscaling set-instance-health --health-status Unhealthy`.", en: "The script calls `aws autoscaling set-instance-health --health-status Unhealthy`." }, inst: s1 },
        { msg: { vi: "Mặc định lệnh này **tôn trọng health check grace period**: i-4 chưa bị thay thế. Có thể bỏ qua grace period bằng tuỳ chọn `--no-should-respect-grace-period`.", en: "By default this command **respects the health check grace period**: i-4 is not replaced yet. The grace period can be skipped with the `--no-should-respect-grace-period` option." }, inst: set(s1, "i-4", { note: { vi: "trong grace period", en: "in grace period" } }) },
      ];
      const u = set(s1, "i-4", { state: "unhealthy", note: undefined });
      return [
        { msg: { vi: "Script gọi `aws autoscaling set-instance-health --health-status Unhealthy`.", en: "The script calls `aws autoscaling set-instance-health --health-status Unhealthy`." }, inst: s1 },
        { msg: { vi: "ASG ghi nhận i-4 **Unhealthy** và thay thế **ngay**, không chờ như với status check impaired.", en: "The ASG records i-4 as **Unhealthy** and replaces it **immediately**, without the wait used for an impaired status check." }, inst: u },
        { msg: { vi: "i-4 bị terminate, i-5 được launch tại AZ-B. Activity history ghi nguyên nhân: \"in response to a user health-check\".", en: "i-4 is terminated and i-5 launches in AZ-B. The activity history records the cause: \"in response to a user health-check\"." }, inst: add(set(u, "i-4", null), { id: "i-5", az: "AZ-B", state: "ok" }) },
      ];
    },
    result: (grace) => grace
      ? { ok: true, text: { vi: "Custom health check cũng chịu health check grace period theo mặc định.", en: "A custom health check is also subject to the health check grace period by default." } }
      : { ok: true, text: { vi: "ASG **có** terminate instance bị custom health check đánh dấu Unhealthy. Custom health check bổ sung cho các loại health check sẵn có, phù hợp với worker không đứng sau load balancer.", en: "The ASG **does** terminate an instance marked Unhealthy by a custom health check. Custom health checks complement the built-in types and suit workers that are not behind a load balancer." } },
  },
  {
    id: "order",
    name: { vi: "Thứ tự thay thế instance lỗi", en: "Order of replacing a failed instance" },
    intro: { vi: "i-1 bị đánh dấu Unhealthy. Quan sát thứ tự terminate và launch, và số instance InService trong lúc thay thế.", en: "i-1 is marked Unhealthy. Watch the order of terminate and launch, and how many instances are InService during the replacement." },
    toggle: [{ vi: "Có instance maintenance policy: launch trước", en: "Instance maintenance policy: launch first" }, { vi: "Mặc định (không có instance maintenance policy)", en: "Default (no instance maintenance policy)" }],
    steps: (launchFirst) => {
      const u = set(base(), "i-1", { state: "unhealthy" });
      if (launchFirst) return [
        { msg: { vi: "i-1 Unhealthy.", en: "i-1 is Unhealthy." }, inst: u },
        { msg: { vi: "Với instance maintenance policy được cấu hình để launch trước, ASG launch i-5 **trước**.", en: "With an instance maintenance policy set to launch first, the ASG launches i-5 **first**." }, inst: add(u, { id: "i-5", az: "AZ-A", state: "pending" }) },
        { msg: { vi: "ASG chờ i-5 sẵn sàng hoàn toàn.", en: "The ASG waits for i-5 to be fully ready." }, inst: add(u, { id: "i-5", az: "AZ-A", state: "ok" }) },
        { msg: { vi: "Sau đó mới terminate i-1.", en: "Only then does it terminate i-1." }, inst: add(set(u, "i-1", { state: "terminating" }), { id: "i-5", az: "AZ-A", state: "ok" }) },
        { msg: { vi: "Hoàn tất: 4 instance InService.", en: "Done: 4 instances InService." }, inst: add(set(base(), "i-1", null), { id: "i-5", az: "AZ-A", state: "ok" }) },
      ];
      return [
        { msg: { vi: "i-1 Unhealthy.", en: "i-1 is Unhealthy." }, inst: u },
        { msg: { vi: "Mặc định: ASG tạo một scaling activity để **terminate** i-1 trước.", en: "By default: the ASG creates a scaling activity that **terminates** i-1 first." }, inst: set(u, "i-1", { state: "terminating" }) },
        { msg: { vi: "Trong khi i-1 đang terminate, một scaling activity khác **launch** i-5.", en: "While i-1 is terminating, another scaling activity **launches** i-5." }, inst: add(set(u, "i-1", { state: "terminating" }), { id: "i-5", az: "AZ-A", state: "pending" }) },
        { msg: { vi: "i-5 InService. Trong lúc thay thế, nhóm chỉ có 3 instance phục vụ.", en: "i-5 is InService. During the replacement, only 3 instances were serving." }, inst: add(set(base(), "i-1", null), { id: "i-5", az: "AZ-A", state: "ok" }) },
      ];
    },
    result: (launchFirst) => launchFirst
      ? { ok: true, text: { vi: "Launch trước, terminate sau: capacity không giảm trong lúc thay thế. Hữu ích cho nhóm nhỏ.", en: "Launch first, terminate after: capacity never drops during the replacement. Useful for small groups." } }
      : { ok: true, text: { vi: "Health check replacement mặc định: **terminate trước, launch sau**. Ngược với AZ rebalancing.", en: "Default health check replacement: **terminate first, then launch**. The opposite of AZ rebalancing." } },
  },
  {
    id: "rebalance",
    name: { vi: "AZ rebalancing", en: "AZ rebalancing" },
    desired: 2,
    intro: { vi: "Trong một đợt kiểm thử, kỹ sư terminate i-1 và i-2 tại AZ-A, đồng thời giảm desired capacity xuống 2. Quan sát cách ASG cân bằng lại giữa hai AZ.", en: "During a test, an engineer terminates i-1 and i-2 in AZ-A and decrements desired capacity to 2. Watch how the ASG rebalances the two AZs." },
    steps: () => {
      const s1 = set(set(base(), "i-1", null), "i-2", null);
      const l1 = add(s1, { id: "i-5", az: "AZ-A", state: "pending" });
      const l2 = add(s1, { id: "i-5", az: "AZ-A", state: "ok" });
      return [
        { msg: { vi: "Sau khi terminate, nhóm lệch: AZ-A 0 instance, AZ-B 2 instance.", en: "After the terminations, the group is unbalanced: AZ-A 0 instances, AZ-B 2 instances." }, inst: s1 },
        { msg: { vi: "AZ rebalancing **launch trước**: i-5 tại AZ-A. Nếu nhóm đang ở hoặc gần maximum capacity, nhóm được phép tạm vượt maximum (mặc định 10% hoặc 1 instance, lấy giá trị lớn hơn).", en: "AZ rebalancing **launches first**: i-5 in AZ-A. If the group is at or near maximum capacity, it may temporarily exceed the maximum (by default by 10% or one instance, whichever is greater)." }, inst: l1 },
        { msg: { vi: "i-5 InService, sau đó ASG **terminate** một instance tại AZ-B.", en: "i-5 is InService, then the ASG **terminates** an instance in AZ-B." }, inst: set(l2, "i-4", { state: "terminating" }) },
        { msg: { vi: "Nhóm cân bằng 1/1 và không lúc nào có ít hơn 2 instance phục vụ.", en: "The group is balanced 1/1 and never had fewer than 2 instances serving." }, inst: set(l2, "i-4", null) },
      ];
    },
    result: () => ({ ok: true, text: { vi: "AZ rebalancing: **launch trước, terminate sau**, để quá trình cân bằng không ảnh hưởng tới hiệu năng và tính sẵn sàng.", en: "AZ rebalancing: **launch first, terminate after**, so rebalancing does not compromise performance or availability." } }),
  },
];

const STATE_LABEL: Record<State, Bi> = {
  ok: { vi: "InService", en: "InService" },
  impaired: { vi: "InService · impaired", en: "InService · impaired" },
  oos: { vi: "InService", en: "InService" },
  unhealthy: { vi: "Unhealthy", en: "Unhealthy" },
  terminating: { vi: "Terminating", en: "Terminating" },
  pending: { vi: "Pending", en: "Pending" },
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function HealthReplaceSim() {
  const L = useLang();
  const alive = useRef(true);
  const gen = useRef(0);
  const [ci, setCi] = useState(0);
  const [on, setOn] = useState(false);
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const c = CASES[ci];
  const steps = c.steps(on);
  const inst = shown ? steps[shown - 1].inst : base();
  const desired = shown && c.desired ? c.desired : 4;
  const serving = inst.filter((i) => i.state === "ok" || i.state === "impaired").length;
  const done = shown === steps.length;
  const res = c.result(on);

  function pick(fn: () => void) {
    if (busy) return;
    gen.current++;
    fn();
    setShown(0);
  }

  async function play() {
    if (busy) return;
    const my = ++gen.current;
    setBusy(true);
    try {
      setShown(0);
      const fast = prefersReducedMotion();
      for (let s = 1; s <= steps.length; s++) {
        if (!fast) await sleep(s === 1 ? 150 : 1100);
        if (!alive.current || gen.current !== my) return;
        setShown(s);
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return (
    <div className="stage hrs">
      <div className="sps-row" role="group" aria-label={L({ vi: "Tình huống", en: "Situation" })}>
        {CASES.map((x, i) => (
          <button key={x.id} className="chip" aria-pressed={i === ci} disabled={busy && i !== ci} onClick={() => pick(() => { setCi(i); setOn(false); })}>{L(x.name)}</button>
        ))}
      </div>
      <div className="stage-bar">
        {c.toggle && (
          <button className="btn check" aria-pressed={on} disabled={busy} onClick={() => pick(() => setOn(!on))}>
            <span className="box">{on ? "✓" : ""}</span>{L(on ? c.toggle[0] : c.toggle[1])}
          </button>
        )}
        <button className="btn primary hrs-play" onClick={play} disabled={busy}>{L({ vi: "Chạy tình huống", en: "Run the situation" })}</button>
      </div>
      <p className="sps-about">{rich(L(c.intro))}</p>
      <div className="hrs-grid">
        {(["AZ-A", "AZ-B"] as const).map((az) => (
          <div key={az} className="term-az">
            <b>{az}</b>
            <div className="term-list">
              {inst.filter((i) => i.az === az).map((i) => (
                <div key={i.id} className={`hrs-inst ${i.state}`}>
                  <span className="term-id">{i.id}</span>
                  <span>{L(STATE_LABEL[i.state])}</span>
                  {i.note && <span className="term-meta">{L(i.note)}</span>}
                </div>
              ))}
              {!inst.some((i) => i.az === az) && <span className="term-meta">{L({ vi: "không có instance", en: "no instances" })}</span>}
            </div>
          </div>
        ))}
      </div>
      <div className="readout" aria-live="polite">
        <div className="status">
          <span className="count">{L({ vi: `Desired capacity ${desired} · đang phục vụ: ${serving}`, en: `Desired capacity ${desired} · serving: ${serving}` })}</span>
          {shown > 0 && <span className="count">{L({ vi: `Bước ${shown}/${steps.length}`, en: `Step ${shown}/${steps.length}` })}</span>}
        </div>
        {shown === 0 ? (
          <p className="sps-hint">{L({ vi: "Chọn tình huống và tuỳ chọn, sau đó nhấn Chạy tình huống. Chạy lại với tuỳ chọn còn lại để so sánh.", en: "Choose a situation and an option, then press Run the situation. Run it again with the other option to compare." })}</p>
        ) : (
          <ol className="dps-log">
            {steps.slice(0, shown).map((s, i) => <li key={i}>{rich(L(s.msg))}</li>)}
          </ol>
        )}
        {done && <p className={`sps-result ${res.ok ? "ok" : "bad"}`}>{rich(L(res.text))}</p>}
      </div>
    </div>
  );
}
