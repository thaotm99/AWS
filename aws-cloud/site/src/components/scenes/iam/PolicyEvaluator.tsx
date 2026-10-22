import { useState } from "react";

// Which layers must allow a request, for a real request: SCPs (exam3_q59), permissions
// boundaries (exam1_q25, exam2_q39) and cross-account resource policies (exam2_q16).
type Principal = "user" | "root" | "slr";
type Tri = "allow" | "deny" | "none";
type Mode = "same" | "cross";

const TRI_LABEL: Record<Tri, string> = { allow: "Allow", deny: "Deny", none: "Không nhắc tới" };

interface Gate { name: string; state: "pass" | "fail" | "skip"; why: string }

function evaluate(mode: Mode, who: Principal, scp: Tri, boundary: Tri | "unset", identity: Tri, resource: Tri): { allowed: boolean; gates: Gate[] } {
  const gates: Gate[] = [];
  // An explicit Deny in any layer that applies to this principal wins over everything.
  const applicable: (Tri | "unset")[] = [];
  if (who !== "slr") applicable.push(scp);
  if (who === "user") applicable.push(identity);
  if (who === "user" && mode === "cross") applicable.push(resource);
  const explicitDeny = applicable.includes("deny");
  // SCP
  if (who === "slr") gates.push({ name: "SCP", state: "skip", why: "SCP không ảnh hưởng service-linked role." });
  else if (scp === "allow") gates.push({ name: "SCP", state: "pass", why: who === "root" ? "SCP áp dụng cả root user của member account, và nó đang cho phép." : "SCP cho phép action này." });
  else gates.push({ name: "SCP", state: "fail", why: scp === "deny" ? "SCP từ chối rõ ràng. Không quyền nào ở account vượt qua được, kể cả root của member account." : "SCP không cho phép action này nên mọi user, role và cả root của member account đều không làm được." });
  // Boundary
  if (who !== "user") gates.push({ name: "Permissions boundary", state: "skip", why: "Boundary chỉ gắn được cho IAM user và role." });
  else if (boundary === "unset") gates.push({ name: "Permissions boundary", state: "skip", why: "Không đặt boundary." });
  else if (boundary === "allow") gates.push({ name: "Permissions boundary", state: "pass", why: "Action nằm trong giới hạn tối đa của boundary." });
  else gates.push({ name: "Permissions boundary", state: "fail", why: "Boundary đặt quyền tối đa. Action ngoài boundary thì bị chặn dù identity policy cho phép." });
  // Identity policy
  if (who === "root") gates.push({ name: "Identity policy", state: "skip", why: "Root user có toàn quyền trong account, chỉ bị SCP giới hạn." });
  else if (who === "slr") gates.push({ name: "Identity policy", state: "pass", why: "Service-linked role có sẵn quyền do dịch vụ AWS định nghĩa." });
  else gates.push({ name: "Identity policy", state: identity === "allow" ? "pass" : "fail", why: identity === "allow" ? "Policy gắn vào user/role cho phép." : identity === "deny" ? "Có Deny rõ ràng." : "Không có Allow nào: bị từ chối ngầm định." });
  // Resource policy (cross-account only)
  if (mode === "cross" && who === "user") {
    gates.push({ name: "Resource policy (account B)", state: resource === "allow" ? "pass" : "fail",
      why: resource === "allow" ? "Bucket policy ở account B cho phép principal từ account A." : "Khác account thì tài nguyên ở account B cũng phải cho phép. Chỉ identity policy ở account A là chưa đủ." });
  }
  const allowed = !explicitDeny && gates.every((g) => g.state !== "fail");
  return { allowed, gates };
}

function Choice<T extends string>({ label, value, options, onChange, disabled }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void; disabled?: boolean }) {
  return (
    <div className="eval-row">
      <span className="label">{label}</span>
      <div className="eval-opts">
        {options.map(([v, t]) => (
          <button key={v} className="btn" aria-pressed={v === value} onClick={() => onChange(v)} disabled={disabled}>{t}</button>
        ))}
      </div>
    </div>
  );
}

export default function PolicyEvaluator() {
  const [mode, setMode] = useState<Mode>("same");
  const [who, setWho] = useState<Principal>("user");
  const [scp, setScp] = useState<Tri>("allow");
  const [boundary, setBoundary] = useState<Tri | "unset">("unset");
  const [identity, setIdentity] = useState<Tri>("allow");
  const [resource, setResource] = useState<Tri>("none");
  const tri: [Tri, string][] = (["allow", "deny", "none"] as Tri[]).map((t) => [t, TRI_LABEL[t]]);
  const { allowed, gates } = evaluate(mode, who, scp, boundary, identity, resource);

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">Tình huống</span>
        <button className="btn" aria-pressed={mode === "same"} onClick={() => setMode("same")}>Cùng account</button>
        <button className="btn" aria-pressed={mode === "cross"} onClick={() => { setMode("cross"); setWho("user"); }}>Lambda ở account A đọc S3 ở account B</button>
      </div>
      <div className="eval-grid">
        <div className="eval-inputs">
          <Choice label="Ai gọi" value={who} onChange={setWho} disabled={mode === "cross"}
            options={[["user", "IAM user / role"], ["root", "Root của member account"], ["slr", "Service-linked role"]]} />
          <Choice label="SCP (Organizations)" value={scp} onChange={setScp} options={tri} />
          <Choice label="Permissions boundary" value={boundary} onChange={setBoundary} options={[["unset", "Không đặt"], ["allow", "Có chứa action"], ["none", "Không chứa action"]]} />
          <Choice label="Identity policy" value={identity} onChange={setIdentity} options={tri} />
          {mode === "cross" && <Choice label="Bucket policy ở account B" value={resource} onChange={setResource} options={tri} />}
        </div>
        <ol className="eval-gates" aria-live="polite">
          {gates.map((g) => (
            <li key={g.name} className={`gate-${g.state}`}>
              <span className="gate-mark" aria-hidden="true">{g.state === "pass" ? "✓" : g.state === "fail" ? "✕" : "–"}</span>
              <div><b>{g.name}</b><span>{g.why}</span></div>
            </li>
          ))}
        </ol>
      </div>
      <div className="readout">
        <span className={"pill " + (allowed ? "ok" : "bad")}><i />{allowed ? "Được phép" : "Bị từ chối"}</span>
        <p style={{ margin: "8px 0 0" }}>
          Quy tắc: một Deny rõ ràng ở bất kỳ đâu thắng tất cả. Ngoài ra mọi lớp áp dụng đều phải cho phép; lớp nào không nhắc tới action thì coi như từ chối ngầm định.
        </p>
      </div>
    </div>
  );
}
