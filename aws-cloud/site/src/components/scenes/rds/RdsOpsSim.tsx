import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./rds-sims.css";

// Five days in the life of MFTech's order database. Each scenario is a real incident;
// the toggle turns on the RDS feature that prevents it (Read Replica, RDS Proxy, storage
// auto scaling, cross-Region read replica, RDS Custom). Meters show CPU, connections, disk.
// Source questions: exam2_q13, exam6_q19, exam6_q46, exam4_q19, exam1_q3, exam1_q55, exam2_q63, exam4_q47, exam5_q42, exam2_q62.

type NodeId = "app" | "proxy" | "primary" | "replica" | "tokyo" | "sg";
type MeterId = "cpu" | "conn" | "disk";
type Tone = "ok" | "bad";

interface Ctx {
  L: SVGGElement;
  on: boolean;
  tr<T>(value: Bi<T>): T;
  log(tag: string | Bi, cls: string, msg: Bi): void;
  light(id: NodeId, state: string): void;
  meter(id: MeterId, v: number, label: string | Bi): void;
}

interface Scenario {
  name: Bi;
  client: [Bi, Bi];
  toggle: Bi;
  /** Nodes drawn for this scenario besides app, primary and the Region. */
  shows(on: boolean): NodeId[];
  primary?(on: boolean): string;
  run(c: Ctx): Promise<{ tone: Tone; msg: Bi }>;
}

const APP: Pt = [75, 140];
const PROXY: Pt = [230, 140];
const PRIMARY: Pt = [410, 105];
const REPLICA: Pt = [555, 60];
const TOKYO: Pt = [725, 140];
const toPrimary: Pt[] = [[135, 140], [300, 140], [300, PRIMARY[1]], [PRIMARY[0] - 75, PRIMARY[1]]];
const toReplica: Pt[] = [[135, 128], [160, 128], [160, 60], [REPLICA[0] - 65, 60]];
const viaProxy: Pt[] = [[135, 140], [PROXY[0] - 55, 140]];
const proxyToPrimary: Pt[] = [[PROXY[0] + 55, 140], [300, 140], [300, PRIMARY[1]], [PRIMARY[0] - 75, PRIMARY[1]]];
const toTokyo: Pt[] = [[135, 152], [160, 152], [160, 262], [TOKYO[0], 262], [TOKYO[0], TOKYO[1] + 26]];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const rev = (p: Pt[]) => [...p].reverse();

const INITIAL: Record<MeterId, { v: number; label: string | Bi }> = {
  cpu: { v: 30, label: "30%" },
  conn: { v: 10, label: { vi: "100 / 1.000", en: "100 / 1,000" } },
  disk: { v: 70, label: "70% / 500 GB" },
};

const SCENARIOS: Scenario[] = [
  {
    name: { vi: "Báo cáo cuối tháng làm chậm website", en: "Month-end reports slow the website" },
    client: [{ vi: "Web + báo cáo", en: "Web + reports" }, { vi: "kế toán chạy SQL", en: "accounting runs SQL" }],
    toggle: { vi: "Bổ sung Read Replica cùng Region", en: "Add a same-Region Read Replica" },
    shows: (on) => (on ? ["replica"] : []),
    async run({ L, on, tr, log, light, meter }) {
      const orders = Promise.all([0, 1, 2].map(async (i) => { await wait(i * 350); await travel(L, toPrimary, 600, "pkt"); }));
      if (!on) {
        await Promise.all([orders, Promise.all([0, 1, 2].map(async (i) => { await wait(100 + i * 300); await travel(L, toPrimary, 700, "pkt-edge", 8); }))]);
        meter("cpu", 95, "95%");
        light("primary", "bad");
        flashText(L, PRIMARY[0], PRIMARY[1] - 38, tr({ vi: "đơn hàng chậm", en: "orders slow" }), "flash-bad", 1200);
        log("CPU", "bad", { vi: "Truy vấn báo cáo tải nặng chạy cùng tác vụ đơn hàng trên **primary**: CPU 95%.", en: "Heavy report queries run alongside order processing on the **primary**: CPU 95%." });
        return { tone: "bad", msg: { vi: "Thời gian phản hồi khi đặt hàng tăng cao. Cần tách tải đọc của báo cáo sang **Read Replica**.", en: "Order response times climb. The report read traffic needs to move to a **Read Replica**." } };
      }
      await Promise.all([orders, Promise.all([0, 1, 2].map(async (i) => { await wait(100 + i * 300); await travel(L, toReplica, 700, "pkt-edge", 8); }))]);
      light("replica", "ok");
      light("primary", "ok");
      meter("cpu", 35, "35%");
      log({ vi: "ĐỌC", en: "READ" }, "hit", { vi: "Báo cáo kết nối tới **endpoint của Read Replica**; primary chỉ xử lý đơn hàng.", en: "Reports connect to the **Read Replica endpoint**; the primary handles only orders." });
      log({ vi: "PHÍ", en: "COST" }, "info", { vi: "Replica cùng Region không tính phí truyền dữ liệu replication. Read Replica được tính phí như một DB instance thông thường theo instance class của replica.", en: "A same-Region replica has no charge for replication data transfer. A Read Replica is billed like a standard DB instance, at the replica’s instance class." });
      return { tone: "ok", msg: { vi: "Hiệu năng website được khôi phục, báo cáo vẫn hoạt động. Read Replica tách tải đọc của báo cáo khỏi primary.", en: "Website performance is restored and reports still work. The Read Replica offloads the report reads from the primary." } };
    },
  },
  {
    name: { vi: "Flash sale: 2.000 Lambda invocation đồng thời mở database connection", en: "Flash sale: 2,000 concurrent Lambda invocations open database connections" },
    client: [{ vi: "Lambda × 2.000", en: "Lambda × 2,000" }, { vi: "1 kết nối/lần gọi", en: "1 connection/invoke" }],
    toggle: { vi: "Triển khai RDS Proxy phía trước", en: "Put RDS Proxy in front" },
    shows: () => ["proxy"],
    async run({ L, on, log, light, meter }) {
      const dots = [0, 1, 2, 3, 4, 5, 6, 7];
      if (!on) {
        await Promise.all(dots.map(async (i) => {
          await wait(i * 110);
          const bad = i >= 5;
          await travel(L, toPrimary, 600, bad ? "pkt-bad" : "pkt", 5);
          if (i === 4) { meter("conn", 100, { vi: "1.000 / 1.000", en: "1,000 / 1,000" }); meter("cpu", 80, "80%"); light("primary", "bad"); }
          if (bad) {
            if (i === 5) flashText(L, PRIMARY[0], PRIMARY[1] - 38, "too many connections", "flash-bad", 1200);
            await travel(L, rev(toPrimary), 400, "pkt-bad", 5);
          }
        }));
        log({ vi: "KẾT NỐI", en: "CONNECTIONS" }, "bad", { vi: "Mỗi Lambda invocation mở một database connection mới. DB instance đạt giới hạn **max_connections**; các kết nối mới bị từ chối.", en: "Each Lambda invocation opens a new database connection. The DB instance hits its **max_connections** limit; new connections are refused." });
        return { tone: "bad", msg: { vi: "Đơn hàng bị lỗi đúng thời điểm lưu lượng cao nhất. Cần triển khai **RDS Proxy** để gộp kết nối.", en: "Orders fail right at peak traffic. Deploy **RDS Proxy** to pool connections." } };
      }
      light("proxy", "on");
      await Promise.all(dots.map(async (i) => { await wait(i * 110); await travel(L, viaProxy, 400, "pkt", 5); }));
      light("proxy", "ok");
      await Promise.all([0, 1].map(async (i) => { await wait(i * 200); await travel(L, proxyToPrimary, 450, "pkt-back", 6); }));
      meter("conn", 12, { vi: "120 / 1.000", en: "120 / 1,000" });
      light("primary", "ok");
      log("PROXY", "hit", { vi: "**RDS Proxy** tiếp nhận 2.000 kết nối từ Lambda và dùng chung một nhóm nhỏ kết nối tới database (connection pooling).", en: "**RDS Proxy** accepts the 2,000 connections from Lambda and shares a small pool of connections to the database (connection pooling)." });
      return { tone: "ok", msg: { vi: "Database chỉ tiếp nhận khoảng 120 kết nối. Khi failover, proxy tự động kết nối tới standby và giữ nguyên kết nối của ứng dụng.", en: "The database receives only about 120 connections. On failover, the proxy automatically connects to the standby and preserves the application’s connections." } };
    },
  },
  {
    name: { vi: "Storage của DB instance sắp hết dung lượng", en: "Database storage almost full" },
    client: [{ vi: "Web bán hàng", en: "Store website" }, { vi: "đơn hàng tăng gấp đôi", en: "orders double" }],
    toggle: { vi: "Bật storage autoscaling", en: "Enable storage autoscaling" },
    shows: () => [],
    async run({ L, on, tr, log, light, meter }) {
      for (const [i, v] of [80, 90, 97].entries()) {
        await travel(L, toPrimary, 450 - i * 60, "pkt");
        meter("disk", v, `${v}% / 500 GB`);
      }
      if (!on) {
        await travel(L, toPrimary, 400, "pkt-bad");
        meter("disk", 100, "100% / 500 GB");
        light("primary", "bad");
        flashText(L, PRIMARY[0], PRIMARY[1] - 38, "storage-full", "flash-bad", 1200);
        log({ vi: "STORAGE", en: "STORAGE" }, "bad", { vi: "Dung lượng cấp phát đã hết; instance chuyển sang trạng thái **storage-full** và không thể ghi thêm dữ liệu.", en: "The allocated storage is used up; the instance enters the **storage-full** state and cannot write more data." });
        return { tone: "bad", msg: { vi: "Hệ thống không tiếp nhận đơn hàng mới cho tới khi dung lượng được tăng thủ công. Bật **storage autoscaling** để RDS tự động tăng dung lượng.", en: "The system accepts no new orders until storage is increased manually. Enable **storage autoscaling** so RDS handles it automatically." } };
      }
      flashText(L, PRIMARY[0], PRIMARY[1] - 38, tr({ vi: "+ dung lượng", en: "+ storage" }), "rdx-flash-ok", 1200);
      await wait(500);
      meter("disk", 65, "65% / 750 GB");
      light("primary", "ok");
      await travel(L, toPrimary, 400, "pkt");
      log({ vi: "STORAGE", en: "STORAGE" }, "hit", { vi: "Khi dung lượng trống còn ≤ 10% trong ít nhất 5 phút, RDS **tự động tăng dung lượng** (mỗi lần thêm 10 GiB hoặc 10%, lấy giá trị lớn hơn), tới mức maximum storage threshold đã cấu hình.", en: "When free space is ≤ 10% for at least 5 minutes, RDS **automatically increases storage** (by 10 GiB or 10% each time, whichever is greater), up to the configured maximum storage threshold." });
      return { tone: "ok", msg: { vi: "Đơn hàng vẫn được ghi bình thường. Cấu hình maximum storage threshold để giới hạn chi phí.", en: "Orders keep being written normally. Configure a maximum storage threshold to cap the cost." } };
    },
  },
  {
    name: { vi: "Region Singapore gặp sự cố", en: "Singapore Region outage" },
    client: [{ vi: "Web bán hàng", en: "Store website" }, { vi: "người dùng Đông Nam Á", en: "Southeast Asia users" }],
    toggle: { vi: "Bổ sung cross-Region Read Replica tại Tokyo", en: "Add a cross-Region Read Replica in Tokyo" },
    shows: (on) => (on ? ["tokyo"] : []),
    async run({ L, on, tr, log, light }) {
      if (on) {
        await travel(L, [[PRIMARY[0] + 75, PRIMARY[1] + 10], [TOKYO[0] - 70, TOKYO[1]]], 700, "pkt-edge", 5);
        log({ vi: "SAO CHÉP", en: "REPLICATE" }, "info", { vi: "Dữ liệu được sao chép **bất đồng bộ** sang replica tại Tokyo, đồng thời automated backup được copy sang Tokyo.", en: "Data is replicated **asynchronously** to the replica in Tokyo, and automated backups are also copied to Tokyo." });
      }
      light("sg", "down");
      light("primary", "bad");
      flashText(L, 470, 238, tr({ vi: "Region Singapore sự cố", en: "Singapore Region outage" }), "flash-bad", 1300);
      await wait(700);
      if (!on) {
        await travel(L, toPrimary, 600, "pkt-bad");
        await travel(L, rev(toPrimary), 400, "pkt-bad");
        log("DR", "bad", { vi: "Multi-AZ chỉ bảo vệ trong phạm vi một Region. Không có bản sao nào tại Region khác.", en: "Multi-AZ protects only within one Region. There is no copy in another Region." });
        return { tone: "bad", msg: { vi: "Website ngừng hoạt động cho tới khi Region phục hồi. Cần **cross-Region Read Replica** và copy backup sang Region khác cho disaster recovery.", en: "The website is down until the Region recovers. Disaster recovery needs a **cross-Region Read Replica** and backups copied to another Region." } };
      }
      flashText(L, TOKYO[0], TOKYO[1] - 38, "promote", "rdx-flash-ok", 1100);
      light("tokyo", "ok");
      await travel(L, toTokyo, 900, "pkt");
      log("DR", "hit", { vi: "**Promote** replica tại Tokyo thành DB instance độc lập và chuyển ứng dụng sang endpoint mới.", en: "**Promote** the Tokyo replica to a standalone DB instance and point the application to the new endpoint." });
      return { tone: "ok", msg: { vi: "Website hoạt động trở lại từ Tokyo. Lượng dữ liệu mất tối đa là phần chưa kịp replicate (replica lag).", en: "The website is back up from Tokyo. At most, the data not yet replicated (replica lag) is lost." } };
    },
  },
  {
    name: { vi: "Oracle: cài agent vào OS", en: "Oracle: install an agent on the OS" },
    client: [{ vi: "Đội DBA", en: "DBA team" }, { vi: "cài agent giám sát", en: "adds monitoring agent" }],
    toggle: { vi: "Sử dụng RDS Custom for Oracle", en: "Use RDS Custom for Oracle" },
    shows: () => [],
    primary: (on) => (on ? "RDS Custom · Oracle" : "RDS for Oracle"),
    async run({ L, on, tr, log, light }) {
      if (!on) {
        await travel(L, toPrimary, 600, "pkt-bad");
        light("primary", "bad");
        flashText(L, PRIMARY[0], PRIMARY[1] - 38, tr({ vi: "không truy cập được OS", en: "no OS access" }), "flash-bad", 1200);
        await travel(L, rev(toPrimary), 400, "pkt-bad");
        log("OS", "bad", { vi: "Với RDS tiêu chuẩn, AWS quản lý hệ điều hành: không hỗ trợ SSH và không cài đặt được phần mềm lên host của DB instance.", en: "With standard RDS, AWS manages the operating system: there is no SSH access and you cannot install software on the host." });
        return { tone: "bad", msg: { vi: "Khi cần tuỳ chỉnh OS mà vẫn được AWS quản lý backup, vá lỗi và Multi-AZ, sử dụng **RDS Custom**.", en: "When you need to customize the OS while AWS still manages backups, patching and Multi-AZ, use **RDS Custom**." } };
      }
      await travel(L, toPrimary, 600, "pkt");
      light("primary", "ok");
      log("OS", "hit", { vi: "**RDS Custom** cho phép truy cập hệ điều hành và môi trường database, đồng thời vẫn hỗ trợ automated backup và Multi-AZ.", en: "**RDS Custom** gives access to the operating system and database environment while still supporting automated backups and Multi-AZ." });
      return { tone: "ok", msg: { vi: "Đội DBA cài đặt được agent. Lưu ý: AWS sẽ ngừng hỗ trợ **RDS Custom for Oracle** từ 31/03/2027. Khi không cần tuỳ chỉnh OS, sử dụng RDS tiêu chuẩn để giảm khối lượng vận hành.", en: "The DBA team can install the agent. Note: AWS will end support for **RDS Custom for Oracle** on March 31, 2027. When you do not need to customize the OS, use standard RDS to reduce operational overhead." } };
    },
  },
];

const METERS: { id: MeterId; name: Bi }[] = [
  { id: "cpu", name: { vi: "CPU", en: "CPU" } },
  { id: "conn", name: { vi: "Kết nối", en: "Conns" } },
  { id: "disk", name: { vi: "Storage", en: "Storage" } },
];

type LogEntry = { tag: string | Bi; cls: string; msg: Bi };

export default function RdsOpsSim() {
  const tr = useLang();
  const show = (v: string | Bi) => (typeof v === "string" ? v : tr(v));
  const pk = useRef<SVGGElement>(null);
  const [index, setIndex] = useState(0);
  const sc = SCENARIOS[index];
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Partial<Record<NodeId, string>>>({});
  const [meters, setMeters] = useState(INITIAL);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ tone: Tone; msg: Bi } | null>(null);

  function reset() {
    setLit({});
    setMeters(INITIAL);
    setLog([]);
    setResult(null);
  }

  function pick(i: number) {
    if (busy) return;
    setIndex(i);
    setOn(false);
    reset();
  }

  async function go() {
    const L = pk.current;
    if (!L || busy) return;
    setBusy(true);
    reset();
    const out = await sc.run({
      L, on, tr,
      log: (tag, cls, msg) => setLog((l) => [...l, { tag, cls, msg }]),
      light: (id, state) => setLit((s) => ({ ...s, [id]: state })),
      meter: (id, v, label) => setMeters((m) => ({ ...m, [id]: { v, label } })),
    });
    setResult({ tone: out.tone, msg: out.msg });
    setBusy(false);
  }

  const shown = sc.shows(on);
  const node = (id: NodeId, [x, y]: Pt, w: number, h: number, l1: string, l2: string, base = "") => (
    <g className={`rdx-node ${lit[id] ?? base}`}>
      <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={8} />
      <text className="rdx-t" x={x} y={y - 3} textAnchor="middle">{l1}</text>
      <text className="rdx-s" x={x} y={y + 13} textAnchor="middle">{l2}</text>
    </g>
  );

  return (
    <div className="stage">
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3 pb-0" role="group" aria-label={tr({ vi: "Tình huống", en: "Scenario" })}>
        {SCENARIOS.map((s, i) => (
          <button key={s.name.vi} className="chip" aria-pressed={i === index} disabled={busy && i !== index} onClick={() => pick(i)}>{tr(s.name)}</button>
        ))}
      </div>
      <div className="stage-bar mt-3 border-t border-line">
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-step--1">
          <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(); }} />
          {tr(sc.toggle)}
        </label>
        <button className="btn primary ml-auto" onClick={go} disabled={busy}>{tr({ vi: "Chạy", en: "Run" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 255" role="img" aria-label={tr({ vi: "Ứng dụng kết nối database RDS tại Region Singapore; tuỳ tình huống có RDS Proxy, Read Replica hoặc replica tại Tokyo", en: "The application connects to the RDS database in the Singapore Region; depending on the scenario there is an RDS Proxy, a Read Replica or a replica in Tokyo" })}>
          <rect className={`rdx-region ${lit.sg === "down" ? "down" : ""}`} x={150} y={30} width={480} height={220} rx={12} />
          <text className="rdx-m" x={162} y={240}>{tr({ vi: "Region Singapore", en: "Singapore Region" })}</text>
          <path className="rdx-wire" d="M135 140 H300 V105 H335" />
          {shown.includes("replica") && <path className="rdx-wire dash" d={`M${PRIMARY[0] + 75} 95 L${REPLICA[0] - 65} 72`} />}
          {node("app", APP, 136, 56, tr(sc.client[0]), tr(sc.client[1]), "on")}
          {shown.includes("proxy") && node("proxy", PROXY, 110, 46, "RDS Proxy", on ? "connection pool" : tr({ vi: "chưa sử dụng", en: "not in use" }), on ? "" : "off")}
          {node("primary", PRIMARY, 150, 52, sc.primary?.(on) ?? "Primary", tr({ vi: "Multi-AZ · đơn hàng", en: "Multi-AZ · orders" }))}
          {shown.includes("replica") && node("replica", REPLICA, 130, 46, "Read Replica", tr({ vi: "cùng Region", en: "same Region" }))}
          {METERS.map((m, i) => {
            const y = 152 + i * 24;
            const { v, label } = meters[m.id];
            return (
              <g key={m.id}>
                <text className="rdx-s" x={338} y={y + 9}>{tr(m.name)}</text>
                <rect className="rdx-bar-bg" x={385} y={y} width={100} height={10} rx={3} />
                <rect className={`rdx-bar ${v >= 95 ? "bad" : v >= 80 ? "warn" : ""}`} x={385} y={y} width={v} height={10} rx={3} />
                <text className="rdx-m" x={492} y={y + 9}>{show(label)}</text>
              </g>
            );
          })}
          {index === 3 && (
            <g opacity={on ? 1 : 0.4}>
              <rect className="rdx-region" x={645} y={30} width={165} height={220} rx={12} />
              <text className="rdx-m" x={657} y={240}>{tr({ vi: "Region Tokyo", en: "Tokyo Region" })}</text>
              {node("tokyo", TOKYO, 140, 52, lit.tokyo === "ok" ? tr({ vi: "Primary mới", en: "New primary" }) : "Read Replica", on ? "cross-Region" : tr({ vi: "chưa triển khai", en: "not deployed" }))}
            </g>
          )}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 && !result ? (
          <p className="m-0 text-step--1 text-muted">{tr({ vi: <>Chọn một sự cố và nhấn <b>Chạy</b> để quan sát hậu quả. Sau đó bật tính năng tương ứng và chạy lại.</>, en: <>Choose an incident and press <b>Run</b> to see the impact. Then turn on the matching feature and run again.</> })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) => (
              <li key={i}><span className={`tag ${e.cls}`}>{show(e.tag)}</span><span>{rich(tr(e.msg))}</span></li>
            ))}
            {result && <li className={`rdx-result ${result.tone}`}>{rich(tr(result.msg))}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
