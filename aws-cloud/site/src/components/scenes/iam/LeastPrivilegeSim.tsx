import { useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";

// The MFTech finance team must list the reports bucket and delete old reports, nothing more.
// The current policy only names the bucket ARN, so DeleteObject never matches an object.
// Pick the statement to add and see which requests each one lets through. Matching follows the
// IAM docs: wildcards are allowed inside action names (iam:*AccessKey*) and a trailing * in a
// resource segment also matches "/" (reference_policies_elements_action.html, _resource.html).

interface Stmt { actions: string[]; resources: string[] }
interface Fix { id: string; label: Bi; stmt: Stmt | null; note: Bi }
interface Req { action: string; resource: string; label: Bi; needed: boolean }

const BUCKET = "arn:aws:s3:::mftech-reports";
const BASE: Stmt = { actions: ["s3:ListBucket", "s3:DeleteObject"], resources: [BUCKET] };

const FIXES: Fix[] = [
  { id: "none", label: { vi: "Chưa sửa", en: "No change" }, stmt: null,
    note: { vi: "`s3:DeleteObject` là thao tác trên object, nhưng Resource duy nhất là ARN của bucket. Không statement nào khớp request xoá object nên request bị từ chối ngầm định.", en: "`s3:DeleteObject` is an object operation, but the only Resource is the bucket ARN. No statement matches the delete request, so it is implicitly denied." } },
  { id: "star-object", label: { vi: "s3:*Object trên bucket/*", en: "s3:*Object on bucket/*" }, stmt: { actions: ["s3:*Object"], resources: [BUCKET + "/*"] },
    note: { vi: "Wildcard được phép dùng trong tên action: `s3:*Object` khớp mọi action có tên kết thúc bằng Object, gồm cả `GetObject` và `PutObject`. Nhóm tài chính có thêm quyền đọc và ghi đè báo cáo: **thừa quyền**.", en: "Wildcards are allowed inside action names: `s3:*Object` matches every action whose name ends in Object, including `GetObject` and `PutObject`. The finance team can now also read and overwrite reports: **excess permissions**." } },
  { id: "exact", label: { vi: "s3:DeleteObject trên bucket/*", en: "s3:DeleteObject on bucket/*" }, stmt: { actions: ["s3:DeleteObject"], resources: [BUCKET + "/*"] },
    note: { vi: "Đúng một action cần thiết, trên đúng các object của bucket này. Cùng với `s3:ListBucket` trên ARN của bucket, policy cấp đúng hai quyền nhóm cần: **least privilege**.", en: "Exactly the one action needed, on exactly the objects of this bucket. Together with `s3:ListBucket` on the bucket ARN, the policy grants exactly the two permissions the team needs: **least privilege**." } },
  { id: "prefix", label: { vi: "s3:DeleteObject trên bucket*", en: "s3:DeleteObject on bucket*" }, stmt: { actions: ["s3:DeleteObject"], resources: [BUCKET + "*"] },
    note: { vi: "Dấu `*` ở cuối một segment của ARN khớp mọi ký tự, kể cả `/`. Vì vậy xoá được object trong bucket này, nhưng cũng xoá được object trong **mọi bucket có tên bắt đầu bằng** mftech-reports, như mftech-reports-archive: **thừa quyền**.", en: "A `*` at the end of an ARN segment matches any characters, including `/`. Deleting objects in this bucket works, but so does deleting objects in **every bucket whose name starts with** mftech-reports, such as mftech-reports-archive: **excess permissions**." } },
  { id: "all", label: { vi: "s3:* trên bucket/*", en: "s3:* on bucket/*" }, stmt: { actions: ["s3:*"], resources: [BUCKET + "/*"] },
    note: { vi: "`s3:*` cấp mọi thao tác S3 trên object của bucket: đọc, ghi, đổi ACL, xoá. Nhóm chỉ cần xoá: **thừa quyền**.", en: "`s3:*` grants every S3 operation on the bucket's objects: read, write, change ACLs, delete. The team only needs delete: **excess permissions**." } },
];

const OBJ = BUCKET + "/2026/10/sales.csv";
const REQS: Req[] = [
  { action: "s3:ListBucket", resource: BUCKET, needed: true, label: { vi: "Liệt kê báo cáo trong bucket", en: "List the reports in the bucket" } },
  { action: "s3:DeleteObject", resource: OBJ, needed: true, label: { vi: "Xoá báo cáo cũ", en: "Delete an old report" } },
  { action: "s3:GetObject", resource: OBJ, needed: false, label: { vi: "Tải báo cáo xuống", en: "Download a report" } },
  { action: "s3:PutObject", resource: OBJ, needed: false, label: { vi: "Ghi đè báo cáo", en: "Overwrite a report" } },
  { action: "s3:PutObjectAcl", resource: OBJ, needed: false, label: { vi: "Đổi ACL của báo cáo", en: "Change a report's ACL" } },
  { action: "s3:DeleteObject", resource: "arn:aws:s3:::mftech-reports-archive/2025/q4.csv", needed: false, label: { vi: "Xoá object ở bucket lưu trữ khác", en: "Delete an object in another archive bucket" } },
];

function glob(pattern: string, value: string, caseInsensitive: boolean): boolean {
  const re = "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$";
  return new RegExp(re, caseInsensitive ? "i" : "").test(value);
}

function allows(stmts: Stmt[], r: Req): boolean {
  return stmts.some((s) => s.actions.some((a) => glob(a, r.action, true)) && s.resources.some((p) => glob(p, r.resource, false)));
}

function show(s: Stmt): string {
  const arr = (xs: string[]) => (xs.length === 1 ? `"${xs[0]}"` : `[${xs.map((x) => `"${x}"`).join(", ")}]`);
  return `    { "Effect": "Allow",\n      "Action": ${arr(s.actions)},\n      "Resource": ${arr(s.resources)} }`;
}

export default function LeastPrivilegeSim() {
  const L = useLang();
  const [fi, setFi] = useState(0);
  const fix = FIXES[fi];
  const stmts = fix.stmt ? [BASE, fix.stmt] : [BASE];
  const rows = REQS.map((r) => ({ r, ok: allows(stmts, r) }));
  const missing = rows.filter((x) => x.r.needed && !x.ok).length;
  const excess = rows.filter((x) => !x.r.needed && x.ok).length;
  const exact = missing === 0 && excess === 0;
  const json = `{\n  "Version": "2012-10-17",\n  "Statement": [\n${stmts.map(show).join(",\n")}\n  ]\n}`;

  return (
    <div className="stage">
      <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] max-md:grid-cols-1">
        <pre className="m-0 overflow-x-auto border-r border-line bg-bg px-4 py-3.5 text-[0.8125rem] leading-[1.5] max-md:border-r-0 max-md:border-b"><code>{json}</code></pre>
        <div className="grid content-start gap-1.5 p-3.5" role="group" aria-label={L({ vi: "Statement bổ sung", en: "Statement to add" })}>
          <div className="label text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">{L({ vi: "Statement bổ sung", en: "Statement to add" })}</div>
          {FIXES.map((f, i) => (
            <button key={f.id} className="picker-item" aria-pressed={i === fi} onClick={() => setFi(i)}><code className="bg-transparent p-0 text-[0.78rem] wrap-anywhere">{L(f.label)}</code></button>
          ))}
        </div>
      </div>
      <div className="readout" aria-live="polite">
        <ul className="log">
          {rows.map(({ r, ok }) => {
            const good = ok === r.needed;
            const tag = ok ? (r.needed ? { cls: "hit", t: L({ vi: "CẦN · ALLOW", en: "NEEDED · ALLOW" }) } : { cls: "bad", t: L({ vi: "THỪA · ALLOW", en: "EXCESS · ALLOW" }) })
              : r.needed ? { cls: "bad", t: L({ vi: "THIẾU · DENY", en: "MISSING · DENY" }) } : { cls: "info", t: "DENY" };
            return (
              <li key={r.action + r.resource} className={"flex-wrap items-baseline" + (good ? "" : " [&_b]:text-bad")}>
                <span className={`tag ${tag.cls}`}>{tag.t}</span>
                <span><b>{L(r.label)}</b> <code className="text-[0.72rem] wrap-anywhere text-muted">{r.action} · {r.resource.replace("arn:aws:s3:::", "")}</code></span>
              </li>
            );
          })}
        </ul>
        <p className={`mx-0 mt-2.5 mb-0 rounded-[12px] px-2.5 py-2 text-step--1 ${exact ? "bg-ok-soft" : "bg-bad-soft"}`}>
          {exact
            ? L({ vi: "Đạt least privilege: đủ quyền cần thiết, không có quyền thừa. ", en: "Least privilege reached: every needed permission, nothing extra. " })
            : L({
                vi: [missing ? `Thiếu ${missing} quyền cần thiết` : "", excess ? `${missing ? "thừa" : "Thừa"} ${excess} quyền` : ""].filter(Boolean).join(", ") + ". ",
                en: [missing ? `${missing} needed permission${missing > 1 ? "s" : ""} missing` : "", excess ? `${excess} excess permission${excess > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ") + ". ",
              })}
          {rich(L(fix.note))}
        </p>
      </div>
    </div>
  );
}
