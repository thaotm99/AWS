import { useState } from "react";
import { useLang } from "../../../lib/lang";

type Lang = ReturnType<typeof useLang>;

// Which layers must allow a request, for a real request: SCPs (exam3_q59), permissions
// boundaries (exam1_q25, exam2_q39) and cross-account resource policies (exam2_q16).
type Principal = "user" | "root" | "slr";
type Tri = "allow" | "deny" | "none";
type Mode = "same" | "cross";

const triLabel = (L: Lang): Record<Tri, string> => ({ allow: "Allow", deny: "Deny", none: L({ vi: "Không đề cập", en: "Not mentioned" }) });

interface Gate { name: string; state: "pass" | "fail" | "skip"; why: string }

function evaluate(L: Lang, mode: Mode, who: Principal, scp: Tri, boundary: Tri | "unset", identity: Tri, resource: Tri): { allowed: boolean; gates: Gate[] } {
  const gates: Gate[] = [];
  // An explicit Deny in any layer that applies to this principal wins over everything.
  const applicable: (Tri | "unset")[] = [];
  if (who !== "slr") applicable.push(scp);
  if (who === "user") applicable.push(identity);
  if (who === "user" && mode === "cross") applicable.push(resource);
  const explicitDeny = applicable.includes("deny");
  // SCP
  if (who === "slr") gates.push({ name: "SCP", state: "skip", why: L({ vi: "SCP không ảnh hưởng service-linked role.", en: "SCPs do not affect service-linked roles." }) });
  else if (scp === "allow") gates.push({ name: "SCP", state: "pass", why: who === "root" ? L({ vi: "SCP áp dụng cả với root user của member account, và SCP hiện cho phép action này.", en: "SCPs apply even to the root user of a member account, and the SCP currently allows this action." }) : L({ vi: "SCP cho phép action này.", en: "The SCP allows this action." }) });
  else gates.push({ name: "SCP", state: "fail", why: scp === "deny" ? L({ vi: "SCP từ chối tường minh (explicit deny). Không quyền nào trong account vượt qua được, kể cả root user của member account.", en: "The SCP explicitly denies the action (explicit deny). No permission in the account can override it, not even the root user of a member account." }) : L({ vi: "SCP không cho phép action này nên mọi user, role và cả root user của member account đều không thực hiện được.", en: "The SCP does not allow this action, so no user, no role and not even the root user of a member account can perform it." }) });
  // Boundary
  if (who !== "user") gates.push({ name: "Permissions boundary", state: "skip", why: L({ vi: "Permissions boundary chỉ gắn được cho IAM user và role.", en: "A permissions boundary can be set only on IAM users and roles." }) });
  else if (boundary === "unset") gates.push({ name: "Permissions boundary", state: "skip", why: L({ vi: "Không thiết lập permissions boundary.", en: "No permissions boundary is set." }) });
  else if (boundary === "allow") gates.push({ name: "Permissions boundary", state: "pass", why: L({ vi: "Action nằm trong giới hạn quyền tối đa của boundary.", en: "The action is within the boundary's maximum permissions." }) });
  else gates.push({ name: "Permissions boundary", state: "fail", why: L({ vi: "Boundary xác định quyền tối đa. Action nằm ngoài boundary bị chặn dù identity policy cho phép.", en: "The boundary defines the maximum permissions. An action outside the boundary is blocked even if the identity policy allows it." }) });
  // Identity policy
  if (who === "root") gates.push({ name: "Identity policy", state: "skip", why: L({ vi: "Root user có toàn quyền trong account và không bị giới hạn bằng identity policy. Root user của member account vẫn bị giới hạn bởi SCP, RCP và explicit deny trong resource-based policy.", en: "The root user has full access in the account and is not limited by identity policies. The root user of a member account is still limited by SCPs, RCPs and explicit denies in resource-based policies." }) });
  else if (who === "slr") gates.push({ name: "Identity policy", state: "pass", why: L({ vi: "Service-linked role có sẵn quyền do dịch vụ AWS định nghĩa.", en: "A service-linked role has predefined permissions defined by the AWS service." }) });
  else gates.push({ name: "Identity policy", state: identity === "allow" ? "pass" : "fail", why: identity === "allow" ? L({ vi: "Policy gắn vào user/role cho phép action.", en: "The policy attached to the user/role allows the action." }) : identity === "deny" ? L({ vi: "Có explicit deny.", en: "There is an explicit deny." }) : L({ vi: "Không có statement Allow nào: request bị từ chối ngầm định.", en: "There is no Allow statement: the request is implicitly denied." }) });
  // Resource policy (cross-account only)
  if (mode === "cross" && who === "user") {
    gates.push({ name: "Resource policy (account B)", state: resource === "allow" ? "pass" : "fail",
      why: resource === "allow" ? L({ vi: "Bucket policy tại account B cho phép principal từ account A.", en: "The bucket policy in account B allows the principal from account A." }) : L({ vi: "Với truy cập cross-account, tài nguyên tại account B cũng phải cho phép; chỉ identity policy tại account A là chưa đủ.", en: "For cross-account access, the resource in account B must also allow it; an identity policy in account A alone is not enough." }) });
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
  const L = useLang();
  const TRI_LABEL = triLabel(L);
  const tri: [Tri, string][] = (["allow", "deny", "none"] as Tri[]).map((t) => [t, TRI_LABEL[t]]);
  const { allowed, gates } = evaluate(L, mode, who, scp, boundary, identity, resource);

  return (
    <div className="stage">
      <div className="stage-bar">
        <span className="label">{L({ vi: "Tình huống", en: "Scenario" })}</span>
        <button className="btn" aria-pressed={mode === "same"} onClick={() => setMode("same")}>{L({ vi: "Cùng account", en: "Same account" })}</button>
        <button className="btn" aria-pressed={mode === "cross"} onClick={() => { setMode("cross"); setWho("user"); }}>{L({ vi: "Lambda tại account A đọc S3 tại account B", en: "Lambda in account A reads S3 in account B" })}</button>
      </div>
      <div className="eval-grid">
        <div className="eval-inputs">
          <Choice label="Principal" value={who} onChange={setWho} disabled={mode === "cross"}
            options={[["user", "IAM user / role"], ["root", L({ vi: "Root user của member account", en: "Root user of a member account" })], ["slr", "Service-linked role"]]} />
          <Choice label="SCP (Organizations)" value={scp} onChange={setScp} options={tri} />
          <Choice label="Permissions boundary" value={boundary} onChange={setBoundary} options={[["unset", L({ vi: "Không thiết lập", en: "Not set" })], ["allow", L({ vi: "Chứa action", en: "Contains the action" })], ["none", L({ vi: "Không chứa action", en: "Does not contain the action" })]]} />
          <Choice label="Identity policy" value={identity} onChange={setIdentity} options={tri} />
          {mode === "cross" && <Choice label={L({ vi: "Bucket policy tại account B", en: "Bucket policy in account B" })} value={resource} onChange={setResource} options={tri} />}
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
        <span className={"pill " + (allowed ? "ok" : "bad")}><i />{allowed ? L({ vi: "Được phép", en: "Allowed" }) : L({ vi: "Bị từ chối", en: "Denied" })}</span>
        <p style={{ margin: "8px 0 0" }}>
          {L({
            vi: "Quy tắc: một explicit deny tại bất kỳ lớp nào luôn được ưu tiên. Ngoài ra, mọi lớp áp dụng đều phải cho phép; lớp không đề cập tới action được xem là từ chối ngầm định.",
            en: "Rule: an explicit deny at any layer always takes precedence. Beyond that, every applicable layer must allow the action; a layer that does not mention the action counts as an implicit deny.",
          })}
        </p>
      </div>
    </div>
  );
}
