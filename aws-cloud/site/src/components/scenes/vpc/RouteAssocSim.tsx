import { useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./vpc-sims.css";

// Subnet route table association (vpc/latest/userguide/subnet-route-tables.html): every subnet is
// associated with exactly one route table at a time; a subnet without an explicit association uses
// the main route table; many subnets can share one route table. Gateway route tables cannot be main.
// Source questions: exam5_q63, exam4_q38.

type Rt = "main" | "rtPublic" | "rtPrivate";
type Subnet = "web" | "app" | "batch";

const TABLES: Record<Rt, { name: string; note: Bi; routes: [string, string][]; internet: "igw" | "nat" | null }> = {
  main: { name: "rtb-main", note: { vi: "main route table (tạo cùng VPC)", en: "main route table (created with the VPC)" }, routes: [["10.0.0.0/16", "local"]], internet: null },
  rtPublic: { name: "rtb-public", note: { vi: "custom route table", en: "custom route table" }, routes: [["10.0.0.0/16", "local"], ["0.0.0.0/0", "igw-0a1b"]], internet: "igw" },
  rtPrivate: { name: "rtb-private", note: { vi: "custom route table", en: "custom route table" }, routes: [["10.0.0.0/16", "local"], ["0.0.0.0/0", "nat-0c2d"]], internet: "nat" },
};

const SUBNETS: { id: Subnet; name: string; cidr: string; ec2: string }[] = [
  { id: "web", name: "subnet-web", cidr: "10.0.1.0/24", ec2: "web-1 · 54.x.x.x" },
  { id: "app", name: "subnet-app", cidr: "10.0.2.0/24", ec2: "app-1 · 10.0.2.15" },
  { id: "batch", name: "subnet-batch", cidr: "10.0.3.0/24", ec2: "batch-1 · 10.0.3.9" },
];

export default function RouteAssocSim() {
  const L = useLang();
  // null = no explicit association, so the subnet implicitly uses the main route table.
  const [assoc, setAssoc] = useState<Record<Subnet, Rt | null>>({ web: null, app: "rtPrivate", batch: null });
  const [sel, setSel] = useState<Subnet>("web");
  const [msg, setMsg] = useState<{ ok: boolean; text: Bi } | null>(null);

  const eff = (s: Subnet): Rt => assoc[s] ?? "main";

  function associate(rt: Rt | null) {
    const before = assoc[sel];
    setAssoc((a) => ({ ...a, [sel]: rt }));
    const name = SUBNETS.find((x) => x.id === sel)!.name;
    if (rt === null) {
      setMsg({ ok: true, text: { vi: `Đã gỡ association tường minh: \`${name}\` quay về **main route table** (association ngầm định).`, en: `Explicit association removed: \`${name}\` falls back to the **main route table** (implicit association).` } });
    } else if (before && before !== rt) {
      setMsg({ ok: true, text: { vi: `\`${name}\` chỉ gắn được với **một** route table tại một thời điểm: association mới **thay thế** \`${TABLES[before].name}\`, không cộng thêm.`, en: `\`${name}\` can be associated with only **one** route table at a time: the new association **replaces** \`${TABLES[before].name}\`; it is not added.` } });
    } else {
      setMsg({ ok: true, text: { vi: `\`${name}\` được gắn tường minh với \`${TABLES[rt].name}\`. Một route table có thể gắn với nhiều subnet.`, en: `\`${name}\` is explicitly associated with \`${TABLES[rt].name}\`. One route table can be associated with many subnets.` } });
    }
  }

  function test() {
    const s = SUBNETS.find((x) => x.id === sel)!;
    const t = TABLES[eff(sel)];
    const how = assoc[sel] ? { vi: "gắn tường minh", en: "explicit association" } : { vi: "ngầm định qua main route table", en: "implicit, through the main route table" };
    if (t.internet === null) {
      setMsg({ ok: false, text: { vi: `\`${s.name}\` dùng \`${t.name}\` (${how.vi}). Bảng chỉ có route \`local\` nên traffic tới \`0.0.0.0/0\` không có đích: subnet không ra được internet.`, en: `\`${s.name}\` uses \`${t.name}\` (${how.en}). The table has only the \`local\` route, so traffic to \`0.0.0.0/0\` has no target: the subnet cannot reach the internet.` } });
    } else if (t.internet === "igw" && s.id !== "web") {
      setMsg({ ok: false, text: { vi: `\`${t.name}\` có route tới internet gateway, nhưng \`${s.ec2.split(" · ")[0]}\` chỉ có private IP. Internet gateway chỉ thực hiện NAT cho instance có public IP hoặc Elastic IP.`, en: `\`${t.name}\` has a route to the internet gateway, but \`${s.ec2.split(" · ")[0]}\` has only a private IP. The internet gateway performs NAT only for instances with a public IP or Elastic IP.` } });
    } else if (t.internet === "igw") {
      setMsg({ ok: true, text: { vi: `\`${s.name}\` dùng \`${t.name}\` (${how.vi}): route \`0.0.0.0/0 → igw\` và instance có public IP. Bước còn lại: NACL cho phép cả hai chiều, security group cho phép inbound (phần 1).`, en: `\`${s.name}\` uses \`${t.name}\` (${how.en}): route \`0.0.0.0/0 → igw\` and the instance has a public IP. What remains: the NACL allows both directions and the security group allows inbound (part 1).` } });
    } else {
      setMsg({ ok: true, text: { vi: `\`${s.name}\` dùng \`${t.name}\` (${how.vi}): kết nối đi ra qua NAT gateway; internet không khởi tạo được kết nối vào.`, en: `\`${s.name}\` uses \`${t.name}\` (${how.en}): outbound connections go through the NAT gateway; the internet cannot initiate connections in.` } });
    }
  }

  return (
    <div className="stage">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 px-3.5 py-3 max-sm:grid-cols-1">
        <div className="grid content-start gap-1.5" role="group" aria-label={L({ vi: "Subnet", en: "Subnets" })}>
          <span className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">Subnet</span>
          {SUBNETS.map((s) => (
            <button key={s.id} className="grid cursor-pointer gap-0.5 rounded-[12px] border border-line bg-surface px-2.5 py-2 text-left text-step--1 text-ink aria-pressed:border-accent aria-pressed:shadow-[0_0_0_1px_var(--color-accent)]" aria-pressed={sel === s.id} onClick={() => { setSel(s.id); setMsg(null); }}>
              <b>{s.name}</b> <code>{s.cidr}</code>
              <small className="text-muted">{s.ec2}</small>
              <small className={assoc[s.id] ? "text-accent" : "text-edge"}>
                → {TABLES[eff(s.id)].name} {assoc[s.id] ? L({ vi: "(tường minh)", en: "(explicit)" }) : L({ vi: "(ngầm định, main)", en: "(implicit, main)" })}
              </small>
            </button>
          ))}
        </div>
        <div className="grid content-start gap-1.5">
          <span className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">Route table</span>
          {(Object.keys(TABLES) as Rt[]).map((id) => {
            const t = TABLES[id];
            const users = SUBNETS.filter((s) => eff(s.id) === id).map((s) => s.name.replace("subnet-", ""));
            return (
              <div key={id} className={"grid gap-1 rounded-[12px] border px-2.5 py-2 text-step--1 " + (eff(sel) === id ? "border-accent bg-accent-soft" : "border-line bg-bg")}>
                <div><b>{t.name}</b> <small className="text-muted">{L(t.note)}</small></div>
                <table className="border-collapse [&_td]:py-px [&_td]:pr-2.5 [&_td]:pl-0"><tbody>{t.routes.map(([d, g]) => <tr key={d}><td><code>{d}</code></td><td><code>{g}</code></td></tr>)}</tbody></table>
                <small className="text-muted">{L({ vi: "Subnet đang dùng: ", en: "Used by: " })}{users.length ? users.join(", ") : "—"}</small>
              </div>
            );
          })}
        </div>
      </div>
      <div className="stage-bar">
        <span className="label">{L({ vi: "Gắn subnet đang chọn với:", en: "Associate the selected subnet with:" })}</span>
        <button className="btn" onClick={() => associate("rtPublic")}>rtb-public</button>
        <button className="btn" onClick={() => associate("rtPrivate")}>rtb-private</button>
        <button className="btn" onClick={() => associate(null)}>{L({ vi: "Gỡ association", en: "Remove association" })}</button>
        <span className="sep" />
        <button className="btn primary" onClick={test}>{L({ vi: "Thử kết nối internet", en: "Test internet access" })}</button>
      </div>
      <div className="readout" aria-live="polite">
        {msg ? (
          <p style={{ margin: 0 }}><span className={"pill " + (msg.ok ? "ok" : "bad")}><i />{msg.ok ? "OK" : L({ vi: "Không ra được internet", en: "No internet access" })}</span> {rich(L(msg.text))}</p>
        ) : (
          <p style={{ margin: 0 }}>{L({ vi: "Chọn một subnet, gắn nó với route table khác hoặc gỡ association, sau đó thử kết nối internet. subnet-web và subnet-batch chưa có association tường minh.", en: "Pick a subnet, associate it with another route table or remove the association, then test internet access. subnet-web and subnet-batch have no explicit association yet." })}</p>
        )}
      </div>
    </div>
  );
}
