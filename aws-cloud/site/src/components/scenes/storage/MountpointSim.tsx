import { useEffect, useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./storage-sims.css";

// The MFTECH data team mounts an S3 bucket with Mountpoint for Amazon S3 and runs everyday file
// operations against it, then repeats them on Amazon EFS. Mountpoint reads large files at S3 throughput
// and can create new files, but cannot modify existing files, delete directories, lock files, or run on
// Windows (AmazonS3/latest/userguide/mountpoint.html). EFS: NFSv4 with file locking; no Windows clients
// (efs/latest/ug/whatisefs.html, features.html).
// Source questions: exam3_q5, exam4_q24, exam5_q28, exam5_q47.

type Target = "mp" | "efs";
type Op = "read" | "create" | "append" | "rmdir" | "lock" | "windows";
type Verdict = { ok: boolean; at: "app" | "client" | "store"; msg: Bi };

const OPS: { id: Op; cmd: string; label: Bi }[] = [
  { id: "read", cmd: "cat train/part-0001.parquet", label: { vi: "Đọc tệp dữ liệu lớn", en: "Read a large data file" } },
  { id: "create", cmd: "cp report.csv /mnt/shop/", label: { vi: "Tạo tệp mới", en: "Create a new file" } },
  { id: "append", cmd: "echo … >> orders.log", label: { vi: "Ghi nối vào tệp có sẵn", en: "Append to an existing file" } },
  { id: "rmdir", cmd: "rm -r /mnt/shop/tmp/", label: { vi: "Xoá thư mục", en: "Delete a directory" } },
  { id: "lock", cmd: "flock orders.lock", label: { vi: "Khoá tệp", en: "Lock a file" } },
  { id: "windows", cmd: "Windows Server", label: { vi: "Mount từ Windows", en: "Mount from Windows" } },
];

const RESULT: Record<Target, Record<Op, Verdict>> = {
  mp: {
    read: { ok: true, at: "store", msg: { vi: "Mountpoint chuyển lệnh `open`/`read` thành lời gọi S3 API và đọc với throughput co giãn của S3; đọc được tệp tới 50 TB.", en: "Mountpoint translates `open`/`read` into S3 API calls and reads at S3's elastic throughput; it can read files up to 50 TB." } },
    create: { ok: true, at: "store", msg: { vi: "Mountpoint tạo được tệp mới; tệp được lưu thành object trong bucket.", en: "Mountpoint can create new files; the file is stored as an object in the bucket." } },
    append: { ok: false, at: "client", msg: { vi: "Mountpoint **không sửa được tệp đã có**. Ứng dụng ghi log nối tiếp phải ghi ra tệp mới hoặc dùng file system khác.", en: "Mountpoint **cannot modify existing files**. An application that appends to a log must write new files or use another file system." } },
    rmdir: { ok: false, at: "client", msg: { vi: "Mountpoint **không xoá được thư mục**.", en: "Mountpoint **cannot delete directories**." } },
    lock: { ok: false, at: "client", msg: { vi: "Mountpoint **không hỗ trợ file locking** (và symbolic link). Ứng dụng cần khoá tệp để phối hợp ghi không chạy đúng.", en: "Mountpoint **does not support file locking** (or symbolic links). An application that relies on locks to coordinate writes does not work correctly." } },
    windows: { ok: false, at: "app", msg: { vi: "Mountpoint for Amazon S3 **chỉ chạy trên Linux**.", en: "Mountpoint for Amazon S3 is available **only for Linux**." } },
  },
  efs: {
    read: { ok: true, at: "store", msg: { vi: "EFS đọc qua NFS tại mount target cùng AZ.", en: "EFS reads over NFS through the mount target in the same AZ." } },
    create: { ok: true, at: "store", msg: { vi: "Tạo tệp mới như trên local file system; mọi instance mount cùng file system đều thấy tệp.", en: "Creates the file as on a local file system; every instance that mounts the file system sees it." } },
    append: { ok: true, at: "store", msg: { vi: "Sửa và ghi nối tệp có sẵn theo ngữ nghĩa NFS (close-to-open consistency).", en: "Modifies and appends to existing files with NFS semantics (close-to-open consistency)." } },
    rmdir: { ok: true, at: "store", msg: { vi: "Xoá thư mục như trên file system thông thường; quyền truy cập theo POSIX permission.", en: "Deletes the directory as on a regular file system; access follows POSIX permissions." } },
    lock: { ok: true, at: "store", msg: { vi: "EFS hỗ trợ NFSv4 file locking (kể cả byte-range locking), dạng advisory lock.", en: "EFS supports NFSv4 file locking (including byte-range locking) as advisory locks." } },
    windows: { ok: false, at: "app", msg: { vi: "EFS **không hỗ trợ** EC2 chạy Windows. File share cho Windows: FSx for Windows File Server (phần 4).", en: "EFS is **not supported** on Windows-based EC2 instances. A Windows file share: FSx for Windows File Server (part 4)." } },
  },
};

const Y = 96;
const APP: Pt = [95, Y];
const CLI: Pt = [400, Y];
const STORE: Pt = [690, Y];

type LogEntry = { ok: boolean; cmd: string; msg: Bi };

export default function MountpointSim() {
  const tr = useLang();
  const pk = useRef<SVGGElement>(null);
  const gen = useRef(0);
  const [target, setTarget] = useState<Target>("mp");
  const [busy, setBusy] = useState(false);
  const [win, setWin] = useState(false);
  const [lit, setLit] = useState<Partial<Record<"app" | "client" | "store", string>>>({});
  const [log, setLog] = useState<LogEntry[]>([]);

  useEffect(() => () => { gen.current++; }, []);

  function pickTarget(t: Target) {
    gen.current++;
    setTarget(t);
    setLit({});
    setLog([]);
  }

  async function runOp(op: Op) {
    const L = pk.current;
    if (!L || busy) return;
    const g = ++gen.current;
    setBusy(true);
    setLit({});
    setWin(op === "windows");
    try {
      const v = RESULT[target][op];
      const o = OPS.find((x) => x.id === op)!;
      setLit({ app: v.at === "app" ? "bad" : "on" });
      if (v.at === "app") {
        flashText(L, APP[0], Y - 40, "✗", "flash-bad", 900);
      } else {
        await travel(L, [[APP[0] + 75, Y], [CLI[0] - 85, Y]], 450, v.ok ? "pkt" : "pkt-bad");
        if (g !== gen.current) return;
        setLit((s) => ({ ...s, client: v.ok ? "ok" : "bad" }));
        if (!v.ok) {
          flashText(L, CLI[0], Y - 40, "✗", "flash-bad", 900);
          await travel(L, [[CLI[0] - 85, Y], [APP[0] + 75, Y]], 400, "pkt-bad");
        } else {
          await travel(L, [[CLI[0] + 85, Y], [STORE[0] - 95, Y]], 450, "pkt-edge");
          if (g !== gen.current) return;
          setLit((s) => ({ ...s, store: "ok" }));
          await travel(L, [[STORE[0] - 95, Y], [APP[0] + 75, Y]], 650, "pkt-back");
        }
      }
      if (g !== gen.current) return;
      setLog((l) => [{ ok: v.ok, cmd: o.id === "windows" ? tr(o.label) : o.cmd, msg: v.msg }, ...l].slice(0, 4));
    } finally {
      if (g === gen.current) setBusy(false);
    }
  }

  const mp = target === "mp";
  const node = (id: "app" | "client" | "store", [cx, cy]: Pt, w: number, t1: string, t2: string) => (
    <g className={`stx-node ${lit[id] ?? ""}`}>
      <rect x={cx - w / 2} y={cy - 30} width={w} height={60} rx={8} />
      <text className="stx-t" x={cx} y={cy - 4} textAnchor="middle">{t1}</text>
      <text className="stx-s" x={cx} y={cy + 13} textAnchor="middle">{t2}</text>
    </g>
  );

  return (
    <div className="stage">
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-0 pt-3" role="group" aria-label={tr({ vi: "Nơi lưu dữ liệu", en: "Where the data lives" })}>
        <span className="mr-1 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">{tr({ vi: "Mount", en: "Mount" })}</span>
        <button className="chip" aria-pressed={mp} disabled={busy} onClick={() => pickTarget("mp")}>Mountpoint for Amazon S3</button>
        <button className="chip" aria-pressed={!mp} disabled={busy} onClick={() => pickTarget("efs")}>Amazon EFS</button>
      </div>
      <div className="flex flex-wrap gap-1.5 px-3.5 pt-2.5 pb-0" role="group" aria-label={tr({ vi: "Thao tác tệp", en: "File operations" })}>
        {OPS.map((o) => (
          <button key={o.id} className="chip" disabled={busy} onClick={() => runOp(o.id)}>{tr(o.label)}</button>
        ))}
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 30 820 140" role="img" aria-label={tr({ vi: "Ứng dụng gửi thao tác tệp qua client tới nơi lưu dữ liệu", en: "The application sends file operations through the client to the storage" })}>
          <path className="stx-wire" d={`M${APP[0] + 75} ${Y} H${STORE[0] - 95}`} />
          {node("app", APP, 150, tr({ vi: "Ứng dụng", en: "Application" }), win ? "EC2 Windows Server" : "EC2 Linux · /mnt/shop")}
          {node("client", CLI, 170, mp ? "Mountpoint client" : "NFS client", mp ? tr({ vi: "thao tác tệp → S3 API", en: "file operation → S3 API" }) : tr({ vi: "NFSv4.1 → mount target", en: "NFSv4.1 → mount target" }))}
          {node("store", STORE, 190, mp ? "S3 bucket" : "Amazon EFS", mp ? tr({ vi: "object · throughput co giãn", en: "objects · elastic throughput" }) : tr({ vi: "file system dùng chung", en: "shared file system" }))}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="m-0 text-step--1 text-muted">{tr({ vi: <>Chọn nơi mount, sau đó chạy lần lượt từng thao tác. Lặp lại với <b>Amazon EFS</b> để so sánh.</>, en: <>Choose what to mount, then run each operation in turn. Repeat with <b>Amazon EFS</b> to compare.</> })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) => (
              <li key={log.length - i}>
                <span className={`tag ${e.ok ? "hit" : "bad"}`}>{e.ok ? "OK" : tr({ vi: "LỖI", en: "FAIL" })}</span>
                <span><code>{e.cmd}</code> {rich(tr(e.msg))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
