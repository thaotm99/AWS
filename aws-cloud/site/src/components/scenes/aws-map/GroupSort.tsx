import { useState } from "react";
import { useLang, type Bi } from "../../../lib/lang";
import "./aws-map.css";

const GROUPS: { id: string; layer: number; name: Bi; c: string }[] = [
  { id: "net", layer: 1, name: { vi: "Mạng", en: "Networking" }, c: "#4cc2df" },
  { id: "sec", layer: 2, name: { vi: "Bảo mật và danh tính", en: "Security and identity" }, c: "#b29cff" },
  { id: "cmp", layer: 3, name: { vi: "Tính toán", en: "Compute" }, c: "#f0a95a" },
  { id: "sto", layer: 4, name: { vi: "Lưu trữ", en: "Storage" }, c: "#5ccf94" },
  { id: "db", layer: 5, name: { vi: "Database", en: "Database" }, c: "#7fb0ff" },
  { id: "ops", layer: 6, name: { vi: "Tích hợp, vận hành", en: "Integration, operations" }, c: "#f293b8" },
];

const CARDS: { name: string; group: string; hint: Bi }[] = [
  { name: "VPC", group: "net", hint: { vi: "mạng riêng của bạn trên AWS", en: "your private network on AWS" } },
  { name: "CloudFront", group: "net", hint: { vi: "phân phối nội dung từ edge location", en: "delivers content from edge locations" } },
  { name: "IAM", group: "sec", hint: { vi: "ai được làm gì trên tài nguyên nào", en: "who may do what on which resource" } },
  { name: "KMS", group: "sec", hint: { vi: "tạo và quản lý KMS key dùng để mã hoá", en: "creates and manages KMS keys for encryption" } },
  { name: "EC2", group: "cmp", hint: { vi: "máy chủ ảo", en: "virtual servers" } },
  { name: "Lambda", group: "cmp", hint: { vi: "chạy code khi có sự kiện", en: "runs code on events" } },
  { name: "S3", group: "sto", hint: { vi: "object storage, lưu object trong bucket", en: "object storage in buckets" } },
  { name: "EBS", group: "sto", hint: { vi: "block storage volume gắn vào EC2 instance", en: "block storage volumes for EC2 instances" } },
  { name: "RDS", group: "db", hint: { vi: "database quan hệ managed", en: "managed relational database" } },
  { name: "DynamoDB", group: "db", hint: { vi: "database NoSQL serverless", en: "serverless NoSQL database" } },
  { name: "SQS", group: "ops", hint: { vi: "message queue", en: "message queue" } },
  { name: "CloudWatch", group: "ops", hint: { vi: "giám sát metric và log", en: "monitors metrics and logs" } },
];

/** Lesson 0, part 3: sort twelve services into the six groups that are the study path's layers. */
export default function GroupSort() {
  const L = useLang();
  const [placed, setPlaced] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [wrong, setWrong] = useState<{ group: string; n: number } | null>(null);
  const [msg, setMsg] = useState<{ text: string; kind?: "bad" | "done" } | null>(null);

  const pool = CARDS.filter((c) => !placed.includes(c.name));
  const done = pool.length === 0;

  function drop(g: (typeof GROUPS)[number]) {
    const card = CARDS.find((c) => c.name === sel);
    if (!card) {
      setMsg({ text: L({ vi: "Chọn một dịch vụ trước, sau đó chọn nhóm.", en: "Pick a service first, then a group." }) });
      return;
    }
    if (card.group === g.id) {
      const next = [...placed, card.name];
      setPlaced(next);
      setLast(card.name);
      setSel(null);
      setWrong(null);
      setMsg(next.length === CARDS.length
        ? { text: L({ vi: "Hoàn thành: mỗi nhóm là một lớp trong lộ trình học, theo đúng thứ tự từ 1 tới 6.", en: "Done: each group is one layer of the study path, in order from 1 to 6." }), kind: "done" }
        : { text: `${card.name}: ${L(card.hint)}. ${L({ vi: "Học ở Lớp", en: "Studied in layer" })} ${g.layer}.` });
    } else {
      setWrong({ group: g.id, n: (wrong?.n ?? 0) + 1 });
      setMsg({ text: `${card.name} ${L({ vi: "không thuộc nhóm", en: "is not in" })} ${L(g.name)}.`, kind: "bad" });
    }
  }

  return (
    <div className="am-stage">
      <div className="am-sort-head">
        <p className="am-sub" style={{ margin: 0 }}>{L({ vi: "Chọn một dịch vụ, sau đó chọn nhóm của nó.", en: "Pick a service, then pick its group." })}</p>
        <span className="am-progress" aria-label={L({ vi: "Tiến độ", en: "Progress" })}>
          <span><i style={{ width: `${(placed.length / CARDS.length) * 100}%` }} /></span>
          {placed.length}/{CARDS.length}
        </span>
      </div>
      <div className="am-pool" role="group" aria-label={L({ vi: "Dịch vụ chưa xếp", en: "Services to sort" })}>
        {pool.map((c) => (
          <button key={c.name} type="button" className="am-chip" aria-pressed={sel === c.name} onClick={() => { setSel(c.name); setMsg(null); }}>{c.name}</button>
        ))}
      </div>
      <p className={`am-msg${msg?.kind ? ` ${msg.kind}` : ""}`} aria-live="polite">{msg?.text ?? (done ? "" : " ")}</p>
      <div className="am-groups">
        {GROUPS.map((g) => (
          <button
            key={`${g.id}-${wrong?.group === g.id ? wrong.n : 0}`}
            type="button"
            className={`am-group${sel ? " armed" : ""}${wrong?.group === g.id ? " shake" : ""}`}
            style={{ ["--c" as string]: g.c }}
            onClick={() => drop(g)}
          >
            <header><i aria-hidden="true" /><b>{L(g.name)}</b><small>{L({ vi: "LỚP", en: "LAYER" })} {g.layer}</small></header>
            <ul>
              {CARDS.filter((c) => c.group === g.id && placed.includes(c.name)).map((c) => (
                <li key={c.name} className={c.name === last ? "new" : undefined}>{c.name}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}
