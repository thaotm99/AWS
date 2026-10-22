import { useEffect, useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./rds-sims.css";

// ShopViet adds a copy of its (still unencrypted) RDS for MySQL order database for the reporting team.
// The learner picks the kind of copy (Read Replica or Multi-AZ standby), its size, its encryption and
// its Region, then creates it and points the reports at it.
// Facts: replica of an unencrypted instance cannot be encrypted (Overview.Encryption.html, limitations);
// each read replica should have the same compute and storage as the source (USER_MySQL.Replication.ReadReplicas.html);
// replicas billed as DB instances, no same-Region replication transfer charge (USER_ReadRepl.html);
// standby is in another AZ of the same Region and cannot serve reads (Concepts.MultiAZSingleStandby.html);
// Multi-AZ backups and snapshots are taken from the standby (aws.amazon.com/rds/faqs).
// Source questions: exam6_q46, exam2_q45, exam5_q42, exam6_q49.

type Kind = "rr" | "standby";
type Size = "same" | "half";
type Enc = "follow" | "encrypt";
type Where = "same" | "other";
type Tone = "ok" | "bad" | "warn" | "info";
type Line = { tone: Tone; tag: Bi; msg: Bi };

const SRC: Pt = [140, 105];
const NEAR: Pt = [395, 105];
const FAR: Pt = [690, 105];
const APP: Pt = [140, 205];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function ReplicaLab() {
  const tr = useLang();
  const pk = useRef<SVGGElement>(null);
  const gen = useRef(0);
  const [kind, setKind] = useState<Kind>("rr");
  const [cpu, setCpu] = useState<Size>("half");
  const [disk, setDisk] = useState<Size>("half");
  const [enc, setEnc] = useState<Enc>("encrypt");
  const [where, setWhere] = useState<Where>("same");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "created" | "failed">("idle");
  const [lines, setLines] = useState<Line[]>([]);
  const [verdict, setVerdict] = useState<{ tone: Tone; msg: Bi } | null>(null);

  useEffect(() => () => { gen.current++; }, []);

  const standby = kind === "standby";
  const target: Pt = where === "other" && !standby ? FAR : NEAR;

  function change<T>(set: (v: T) => void, v: T) {
    gen.current++;
    set(v);
    setBusy(false);
    setState("idle");
    setLines([]);
    setVerdict(null);
  }

  function evaluate(): { lines: Line[]; created: boolean; reportOk: boolean; verdict: { tone: Tone; msg: Bi } } {
    const out: Line[] = [];
    if (standby) {
      if (where === "other") {
        out.push({ tone: "bad", tag: { vi: "VỊ TRÍ", en: "PLACEMENT" }, msg: { vi: "Multi-AZ tạo standby ở **một AZ khác trong cùng Region**; không đặt standby sang Region khác được.", en: "Multi-AZ places the standby in **a different AZ of the same Region**; a standby cannot be placed in another Region." } });
        return { lines: out, created: false, reportOk: false, verdict: { tone: "bad", msg: { vi: "Cần bản sao ở Region khác (đọc gần người dùng hoặc DR): dùng **cross-Region read replica**.", en: "A copy in another Region (local reads or DR) calls for a **cross-Region read replica**." } } };
      }
      if (enc === "encrypt") {
        out.push({ tone: "bad", tag: { vi: "MÃ HOÁ", en: "ENCRYPTION" }, msg: { vi: "Bật Multi-AZ là thao tác modify trên DB instance đang có. Encryption **chỉ bật được khi tạo DB instance**, nên Multi-AZ không phải cách mã hoá database.", en: "Turning on Multi-AZ modifies the existing DB instance. Encryption **can be enabled only when a DB instance is created**, so Multi-AZ is not a way to encrypt the database." } });
        return { lines: out, created: false, reportOk: false, verdict: { tone: "bad", msg: { vi: "Mã hoá database đang chạy: snapshot → copy có mã hoá → restore (phần 4).", en: "Encrypting a running database: snapshot → encrypted copy → restore (part 4)." } } };
      }
      out.push({ tone: "info", tag: { vi: "TẠO", en: "CREATE" }, msg: { vi: "RDS tự tạo và quản lý standby đồng bộ ở AZ khác; không chọn cấu hình riêng cho standby.", en: "RDS provisions and maintains the synchronous standby in another AZ; you do not size the standby separately." } });
      out.push({ tone: "ok", tag: { vi: "BACKUP", en: "BACKUP" }, msg: { vi: "Lợi ích thực tế: automated backup và DB snapshot được **lấy từ standby**, nên I/O trên primary không bị tạm dừng trong backup window.", en: "A real benefit: automated backups and DB snapshots are **taken from the standby**, so I/O on the primary is not suspended during the backup window." } });
      out.push({ tone: "bad", tag: { vi: "BÁO CÁO", en: "REPORTS" }, msg: { vi: "Standby của Multi-AZ DB instance deployment **không phục vụ đọc**: không có endpoint để chạy báo cáo trên standby.", en: "The standby of a Multi-AZ DB instance deployment **serves no reads**: there is no endpoint to run reports against it." } });
      return { lines: out, created: true, reportOk: false, verdict: { tone: "bad", msg: { vi: "Multi-AZ DB instance deployment phục vụ tính sẵn sàng cao, không phải mở rộng đọc. Báo cáo cần **Read Replica**.", en: "A Multi-AZ DB instance deployment is for high availability, not read scaling. The reports need a **Read Replica**." } } };
    }
    if (enc === "encrypt") {
      out.push({ tone: "bad", tag: { vi: "MÃ HOÁ", en: "ENCRYPTION" }, msg: { vi: "Không tạo được **read replica mã hoá từ DB instance chưa mã hoá** (và không tạo được replica chưa mã hoá từ instance đã mã hoá). Trạng thái mã hoá của replica theo source.", en: "You **can't have an encrypted read replica of an unencrypted DB instance** (nor an unencrypted replica of an encrypted one). The replica's encryption follows the source." } });
      return { lines: out, created: false, reportOk: false, verdict: { tone: "bad", msg: { vi: "Vì vậy “tạo replica mã hoá rồi promote” không mã hoá được database. Cách đúng: snapshot → copy có mã hoá → restore (phần 4).", en: "So “create an encrypted replica and promote it” cannot encrypt the database. The way to do it: snapshot → encrypted copy → restore (part 4)." } } };
    }
    out.push({ tone: "info", tag: { vi: "MÃ HOÁ", en: "ENCRYPTION" }, msg: { vi: "Replica chưa mã hoá, giống source.", en: "The replica is unencrypted, like the source." } });
    const small = cpu === "half" || disk === "half";
    if (small) {
      out.push({ tone: "bad", tag: { vi: "KÍCH THƯỚC", en: "SIZING" }, msg: { vi: "Replica phải áp dụng **mọi thay đổi ghi** của primary, đồng thời chạy báo cáo. AWS khuyến nghị mỗi read replica có **cùng compute và storage** như source để replication hoạt động hiệu quả.", en: "The replica must apply **every write** from the primary while also running the reports. AWS recommends that each read replica has the **same compute and storage** as the source for replication to operate effectively." } });
    } else {
      out.push({ tone: "ok", tag: { vi: "KÍCH THƯỚC", en: "SIZING" }, msg: { vi: "Cùng instance class và storage như source, đúng khuyến nghị. Khi scale source, scale cả replica.", en: "Same instance class and storage as the source, as recommended. When you scale the source, scale the replica too." } });
    }
    out.push(where === "same"
      ? { tone: "info", tag: { vi: "PHÍ", en: "COST" }, msg: { vi: "Replica tính phí như một DB instance theo instance class của replica; không tính phí truyền dữ liệu replication trong cùng Region.", en: "The replica is billed as a DB instance at its own instance class; replication data transfer within the same Region is free." } }
      : { tone: "info", tag: { vi: "PHÍ", en: "COST" }, msg: { vi: "Replica ở Region khác phát sinh phí truyền dữ liệu giữa các Region; đổi lại có thể promote thành DB instance độc lập khi Region chính gặp sự cố (DR).", en: "A replica in another Region incurs cross-Region data transfer charges; in return it can be promoted to a standalone DB instance if the primary Region fails (DR)." } });
    out.push({ tone: "ok", tag: { vi: "BÁO CÁO", en: "REPORTS" }, msg: { vi: "Báo cáo kết nối tới **endpoint của replica**; primary chỉ xử lý đơn hàng.", en: "Reports connect to the **replica's endpoint**; the primary handles only orders." } });
    return {
      lines: out, created: true, reportOk: true,
      verdict: small
        ? { tone: "warn", msg: { vi: "Báo cáo chạy được, nhưng cấu hình replica nhỏ hơn source không theo khuyến nghị của AWS. Phương án tiết kiệm mà vẫn đúng: **Read Replica cùng Region, cùng compute và storage**.", en: "Reports run, but a replica smaller than the source goes against AWS guidance. The cost-effective and correct option: **a same-Region Read Replica with the same compute and storage**." } }
        : { tone: "ok", msg: where === "same"
          ? { vi: "Cấu hình đúng: tách tải báo cáo khỏi primary với chi phí thấp nhất.", en: "Correct setup: the reporting load moves off the primary at the lowest cost." }
          : { vi: "Cấu hình đúng cho DR hoặc đọc gần người dùng ở Region khác; riêng cho báo cáo nội bộ, replica cùng Region rẻ hơn.", en: "A correct setup for DR or local reads in another Region; for internal reports alone, a same-Region replica costs less." } },
    };
  }

  async function run() {
    const L = pk.current;
    if (!L || busy) return;
    const g = ++gen.current;
    setBusy(true);
    setState("idle");
    setLines([]);
    setVerdict(null);
    try {
      const r = evaluate();
      const path: Pt[] = [[SRC[0] + 80, SRC[1]], [target[0] - 85, target[1]]];
      await travel(L, path, standby || where === "same" ? 600 : 1000, r.created ? "pkt-edge" : "pkt-bad", 6);
      if (g !== gen.current) return;
      if (!r.created) {
        flashText(L, target[0], target[1] - 42, "✗", "flash-bad", 1000);
        setState("failed");
      } else {
        setState("created");
        flashText(L, target[0], target[1] - 42, standby ? "sync" : "async", "rdx-flash-ok", 900);
        await wait(300);
        if (g !== gen.current) return;
        const toTarget: Pt[] = [[APP[0] + 60, APP[1]], [target[0], APP[1]], [target[0], target[1] + 30]];
        await travel(L, toTarget, 700, r.reportOk ? "pkt" : "pkt-bad", 6);
        if (g !== gen.current) return;
        if (!r.reportOk) {
          flashText(L, target[0], target[1] - 42, tr({ vi: "không phục vụ đọc", en: "no reads" }), "flash-bad", 1100);
          await travel(L, [...toTarget].reverse(), 500, "pkt-bad", 6);
        } else {
          await travel(L, [...toTarget].reverse(), 600, "pkt-back", 6);
        }
        if (g !== gen.current) return;
      }
      setLines(r.lines);
      setVerdict(r.verdict);
    } finally {
      if (g === gen.current) setBusy(false);
    }
  }

  const copyName = standby ? "Standby" : "Read Replica";
  const copyClass = standby ? tr({ vi: "do RDS quản lý", en: "managed by RDS" }) : `${cpu === "same" ? "db.r6g.2xlarge" : "db.r6g.xlarge"} · ${disk === "same" ? "500" : "250"} GiB`;
  const copyEnc = enc === "encrypt" ? tr({ vi: "yêu cầu: mã hoá", en: "requested: encrypted" }) : tr({ vi: "chưa mã hoá", en: "unencrypted" });
  const nodeCls = state === "failed" ? "bad" : state === "created" ? (verdict?.tone === "ok" ? "ok" : verdict?.tone === "bad" ? "bad" : "warn") : "on";

  const chips = <T extends string>(label: Bi, value: T, set: (v: T) => void, opts: [T, Bi][], disabled = false) => (
    <div className="rdx-row" role="group" aria-label={tr(label)}>
      <span className="rdx-lbl">{tr(label)}</span>
      {opts.map(([v, l]) => (
        <button key={v} className="chip" aria-pressed={value === v} disabled={busy || disabled} onClick={() => change(set, v)}>{tr(l)}</button>
      ))}
    </div>
  );

  return (
    <div className="stage rdx">
      {chips({ vi: "Loại bản sao", en: "Copy type" }, kind, setKind, [["rr", { vi: "Read Replica", en: "Read Replica" }], ["standby", { vi: "Multi-AZ standby", en: "Multi-AZ standby" }]])}
      {chips({ vi: "Compute", en: "Compute" }, cpu, setCpu, [["same", { vi: "Bằng source", en: "Same as source" }], ["half", { vi: "Một nửa", en: "Half" }]], standby)}
      {chips({ vi: "Storage", en: "Storage" }, disk, setDisk, [["same", { vi: "Bằng source", en: "Same as source" }], ["half", { vi: "Một nửa", en: "Half" }]], standby)}
      {chips({ vi: "Mã hoá", en: "Encryption" }, enc, setEnc, [["follow", { vi: "Giữ như source", en: "Same as source" }], ["encrypt", { vi: "Mã hoá bản sao", en: "Encrypt the copy" }]])}
      {chips({ vi: "Vị trí", en: "Location" }, where, setWhere, [["same", { vi: "Cùng Region", en: "Same Region" }], ["other", { vi: "Region khác", en: "Another Region" }]])}
      <div className="stage-bar">
        <span className="rdx-hint">{tr({ vi: "Source: RDS for MySQL, db.r6g.2xlarge, 500 GiB, chưa mã hoá.", en: "Source: RDS for MySQL, db.r6g.2xlarge, 500 GiB, unencrypted." })}</span>
        <button className="btn primary" onClick={run} disabled={busy}>{tr({ vi: "Tạo bản sao và chạy báo cáo", en: "Create the copy and run reports" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 220" role="img" aria-label={tr({ vi: "DB instance nguồn tại Region Singapore, bản sao cùng Region hoặc ở Region khác, và ứng dụng báo cáo", en: "Source DB instance in the Singapore Region, a copy in the same Region or another Region, and the reporting application" })}>
          <rect className="rdx-region" x={20} y={30} width={510} height={200} rx={12} />
          <text className="rdx-m" x={32} y={48}>{tr({ vi: "Region Singapore", en: "Singapore Region" })}</text>
          <rect className="rdx-az" x={45} y={60} width={190} height={92} rx={8} />
          <text className="rdx-m" x={53} y={146}>AZ a</text>
          <rect className="rdx-az" x={300} y={60} width={190} height={92} rx={8} />
          <text className="rdx-m" x={308} y={146}>AZ b</text>
          <rect className={`rdx-region ${where === "other" && standby && state === "failed" ? "down" : ""}`} x={560} y={30} width={250} height={200} rx={12} />
          <text className="rdx-m" x={572} y={48}>{tr({ vi: "Region khác", en: "Another Region" })}</text>
          <path className="rdx-wire dash" d={`M${SRC[0] + 80} ${SRC[1]} H${target[0] - 85}`} />
          <path className="rdx-wire" d={`M${APP[0] + 60} ${APP[1]} H${target[0]} V${target[1] + 30}`} />
          <g className="rdx-node on">
            <rect x={SRC[0] - 80} y={SRC[1] - 30} width={160} height={60} rx={8} />
            <text className="rdx-t" x={SRC[0]} y={SRC[1] - 9} textAnchor="middle">Primary</text>
            <text className="rdx-s" x={SRC[0]} y={SRC[1] + 7} textAnchor="middle">db.r6g.2xlarge · 500 GiB</text>
            <text className="rdx-s" x={SRC[0]} y={SRC[1] + 21} textAnchor="middle">{tr({ vi: "chưa mã hoá", en: "unencrypted" })}</text>
          </g>
          <g className={`rdx-node ${nodeCls}`}>
            <rect x={target[0] - 85} y={target[1] - 30} width={170} height={60} rx={8} />
            <text className="rdx-t" x={target[0]} y={target[1] - 9} textAnchor="middle">{copyName}</text>
            <text className="rdx-s" x={target[0]} y={target[1] + 7} textAnchor="middle">{copyClass}</text>
            <text className="rdx-s" x={target[0]} y={target[1] + 21} textAnchor="middle">{copyEnc}</text>
          </g>
          <g className="rdx-node">
            <rect x={APP[0] - 60} y={APP[1] - 18} width={120} height={36} rx={8} />
            <text className="rdx-t" x={APP[0]} y={APP[1] + 4} textAnchor="middle">{tr({ vi: "Báo cáo", en: "Reports" })}</text>
          </g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {lines.length === 0 ? (
          <p className="rdx-hint">{tr({ vi: "Phòng kế toán cần một bản sao để chạy báo cáo. Chọn cấu hình, sau đó tạo bản sao. Thử cả các cấu hình sai để xem lý do bị loại.", en: "The accounting team needs a copy to run reports on. Choose a configuration, then create the copy. Try the wrong configurations too to see why they are ruled out." })}</p>
        ) : (
          <>
            <ul className="log">
              {lines.map((l, i) => (
                <li key={i}>
                  <span className={`tag ${l.tone === "ok" ? "hit" : l.tone === "bad" ? "bad" : l.tone === "warn" ? "miss" : "info"}`}>{tr(l.tag)}</span>
                  <span>{rich(tr(l.msg))}</span>
                </li>
              ))}
            </ul>
            {verdict && <p className={`rdx-result ${verdict.tone === "info" ? "warn" : verdict.tone}`}>{rich(tr(verdict.msg))}</p>}
          </>
        )}
      </div>
    </div>
  );
}
