import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import "./rds-sims.css";

// Five days in the life of ShopViet's order database. Each scenario is a real incident;
// the toggle turns on the RDS feature that prevents it (Read Replica, RDS Proxy, storage
// auto scaling, cross-Region read replica, RDS Custom). Meters show CPU, connections, disk.
// Source questions: exam2_q13, exam6_q19, exam6_q46, exam4_q19, exam1_q3, exam1_q55, exam2_q63, exam4_q47, exam5_q42, exam2_q62.

type NodeId = "app" | "proxy" | "primary" | "replica" | "tokyo" | "sg";
type MeterId = "cpu" | "conn" | "disk";
type Tone = "ok" | "bad";

interface Ctx {
  L: SVGGElement;
  on: boolean;
  log(tag: string, cls: string, msg: string): void;
  light(id: NodeId, state: string): void;
  meter(id: MeterId, v: number, label: string): void;
}

interface Scenario {
  name: string;
  client: [string, string];
  toggle: string;
  /** Nodes drawn for this scenario besides app, primary and the Region. */
  shows(on: boolean): NodeId[];
  primary?(on: boolean): string;
  run(c: Ctx): Promise<{ tone: Tone; msg: string }>;
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

const INITIAL: Record<MeterId, { v: number; label: string }> = {
  cpu: { v: 30, label: "30%" },
  conn: { v: 10, label: "100 / 1.000" },
  disk: { v: 70, label: "70% / 500 GB" },
};

const SCENARIOS: Scenario[] = [
  {
    name: "Báo cáo cuối tháng làm chậm web",
    client: ["Web + báo cáo", "kế toán chạy SQL"],
    toggle: "Có Read Replica cùng Region",
    shows: (on) => (on ? ["replica"] : []),
    async run({ L, on, log, light, meter }) {
      const orders = Promise.all([0, 1, 2].map(async (i) => { await wait(i * 350); await travel(L, toPrimary, 600, "pkt"); }));
      if (!on) {
        await Promise.all([orders, Promise.all([0, 1, 2].map(async (i) => { await wait(100 + i * 300); await travel(L, toPrimary, 700, "pkt-edge", 8); }))]);
        meter("cpu", 95, "95%");
        light("primary", "bad");
        flashText(L, PRIMARY[0], PRIMARY[1] - 38, "đơn hàng chậm", "flash-bad", 1200);
        log("CPU", "bad", "Truy vấn báo cáo nặng chạy chung với đơn hàng trên **primary**: CPU 95%.");
        return { tone: "bad", msg: "Khách đặt hàng phải chờ lâu. Tách tải đọc của báo cáo sang **Read Replica**." };
      }
      await Promise.all([orders, Promise.all([0, 1, 2].map(async (i) => { await wait(100 + i * 300); await travel(L, toReplica, 700, "pkt-edge", 8); }))]);
      light("replica", "ok");
      light("primary", "ok");
      meter("cpu", 35, "35%");
      log("ĐỌC", "hit", "Báo cáo trỏ vào **endpoint của Read Replica**; primary chỉ lo đơn hàng.");
      log("PHÍ", "info", "Replica cùng Region không tính phí truyền dữ liệu replication. Nên dùng cùng cấu hình compute và storage với primary để replica theo kịp.");
      return { tone: "ok", msg: "Web nhanh trở lại, báo cáo vẫn chạy. Read Replica là cách rẻ nhất để tách tải đọc." };
    },
  },
  {
    name: "Flash sale: 2.000 Lambda mở kết nối",
    client: ["Lambda × 2.000", "mỗi lần 1 kết nối"],
    toggle: "Đặt RDS Proxy phía trước",
    shows: () => ["proxy"],
    async run({ L, on, log, light, meter }) {
      const dots = [0, 1, 2, 3, 4, 5, 6, 7];
      if (!on) {
        await Promise.all(dots.map(async (i) => {
          await wait(i * 110);
          const bad = i >= 5;
          await travel(L, toPrimary, 600, bad ? "pkt-bad" : "pkt", 5);
          if (i === 4) { meter("conn", 100, "1.000 / 1.000"); meter("cpu", 80, "80%"); light("primary", "bad"); }
          if (bad) {
            if (i === 5) flashText(L, PRIMARY[0], PRIMARY[1] - 38, "too many connections", "flash-bad", 1200);
            await travel(L, rev(toPrimary), 400, "pkt-bad", 5);
          }
        }));
        log("KẾT NỐI", "bad", "Mỗi Lambda mở một kết nối mới. Database chạm **max_connections**, kết nối mới bị từ chối.");
        return { tone: "bad", msg: "Đơn hàng lỗi đúng lúc đông khách nhất. Đặt **RDS Proxy** để gom kết nối." };
      }
      light("proxy", "on");
      await Promise.all(dots.map(async (i) => { await wait(i * 110); await travel(L, viaProxy, 400, "pkt", 5); }));
      light("proxy", "ok");
      await Promise.all([0, 1].map(async (i) => { await wait(i * 200); await travel(L, proxyToPrimary, 450, "pkt-back", 6); }));
      meter("conn", 12, "120 / 1.000");
      light("primary", "ok");
      log("PROXY", "hit", "**RDS Proxy** nhận 2.000 kết nối từ Lambda và dùng chung một nhóm nhỏ kết nối tới database (connection pooling).");
      return { tone: "ok", msg: "Database chỉ thấy khoảng 120 kết nối. Proxy còn giữ kết nối khi failover, nên ứng dụng ít bị gián đoạn hơn." };
    },
  },
  {
    name: "Ổ đĩa database sắp đầy",
    client: ["Web bán hàng", "đơn tăng gấp đôi"],
    toggle: "Bật storage auto scaling",
    shows: () => [],
    async run({ L, on, log, light, meter }) {
      for (const [i, v] of [80, 90, 97].entries()) {
        await travel(L, toPrimary, 450 - i * 60, "pkt");
        meter("disk", v, `${v}% / 500 GB`);
      }
      if (!on) {
        await travel(L, toPrimary, 400, "pkt-bad");
        meter("disk", 100, "100% / 500 GB");
        light("primary", "bad");
        flashText(L, PRIMARY[0], PRIMARY[1] - 38, "storage-full", "flash-bad", 1200);
        log("Ổ ĐĨA", "bad", "Dung lượng cấp phát đã hết, instance chuyển sang trạng thái **storage-full** và không ghi được nữa.");
        return { tone: "bad", msg: "Không nhận đơn mới cho tới khi có người tăng dung lượng bằng tay. Bật **storage auto scaling** để RDS tự lo." };
      }
      flashText(L, PRIMARY[0], PRIMARY[1] - 38, "+ dung lượng", "rdx-flash-ok", 1200);
      await wait(500);
      meter("disk", 65, "65% / 750 GB");
      light("primary", "ok");
      await travel(L, toPrimary, 400, "pkt");
      log("Ổ ĐĨA", "hit", "Gần đầy, RDS **tự tăng dung lượng** tới mức tối đa bạn đặt. Không downtime, không ai phải canh.");
      return { tone: "ok", msg: "Đơn hàng vẫn ghi bình thường. Đặt maximum storage threshold để giới hạn chi phí." };
    },
  },
  {
    name: "Region Singapore gặp sự cố",
    client: ["Web bán hàng", "khách Đông Nam Á"],
    toggle: "Có cross-Region Read Replica ở Tokyo",
    shows: (on) => (on ? ["tokyo"] : []),
    async run({ L, on, log, light }) {
      if (on) {
        await travel(L, [[PRIMARY[0] + 75, PRIMARY[1] + 10], [TOKYO[0] - 70, TOKYO[1]]], 700, "pkt-edge", 5);
        log("SAO CHÉP", "info", "Dữ liệu được sao chép **bất đồng bộ** sang replica ở Tokyo, và automated backup được copy sang Tokyo.");
      }
      light("sg", "down");
      light("primary", "bad");
      flashText(L, 470, 238, "Region Singapore lỗi", "flash-bad", 1300);
      await wait(700);
      if (!on) {
        await travel(L, toPrimary, 600, "pkt-bad");
        await travel(L, rev(toPrimary), 400, "pkt-bad");
        log("DR", "bad", "Multi-AZ chỉ bảo vệ trong một Region. Không có bản sao nào ở Region khác.");
        return { tone: "bad", msg: "Web ngừng bán cho tới khi Region hồi lại. Cần **cross-Region Read Replica** và copy backup sang Region khác cho disaster recovery." };
      }
      flashText(L, TOKYO[0], TOKYO[1] - 38, "promote", "rdx-flash-ok", 1100);
      light("tokyo", "ok");
      await travel(L, toTokyo, 900, "pkt");
      log("DR", "hit", "**Promote** replica ở Tokyo thành database độc lập, đổi ứng dụng sang endpoint mới.");
      return { tone: "ok", msg: "Web bán lại được từ Tokyo. Mất tối đa phần dữ liệu chưa kịp sao chép (độ trễ replication)." };
    },
  },
  {
    name: "Oracle cần cài agent vào OS",
    client: ["Đội DBA", "cài agent giám sát"],
    toggle: "Dùng RDS Custom for Oracle",
    shows: () => [],
    primary: (on) => (on ? "RDS Custom · Oracle" : "RDS for Oracle"),
    async run({ L, on, log, light }) {
      if (!on) {
        await travel(L, toPrimary, 600, "pkt-bad");
        light("primary", "bad");
        flashText(L, PRIMARY[0], PRIMARY[1] - 38, "không vào được OS", "flash-bad", 1200);
        await travel(L, rev(toPrimary), 400, "pkt-bad");
        log("OS", "bad", "RDS thường do AWS quản lý hệ điều hành. Không SSH, không cài phần mềm vào máy chủ.");
        return { tone: "bad", msg: "Muốn sửa OS mà vẫn được AWS lo backup, vá lỗi và Multi-AZ thì dùng **RDS Custom**." };
      }
      await travel(L, toPrimary, 600, "pkt");
      light("primary", "ok");
      log("OS", "hit", "**RDS Custom** cho truy cập hệ điều hành và môi trường database, vẫn có automated backup và Multi-AZ.");
      return { tone: "ok", msg: "Đội DBA cài được agent. Không cần sửa OS thì dùng RDS thường, ít việc vận hành hơn." };
    },
  },
];

const METERS: { id: MeterId; name: string }[] = [
  { id: "cpu", name: "CPU" },
  { id: "conn", name: "Kết nối" },
  { id: "disk", name: "Ổ đĩa" },
];

type LogEntry = { tag: string; cls: string; msg: ReactNode };

export default function RdsOpsSim() {
  const pk = useRef<SVGGElement>(null);
  const [index, setIndex] = useState(0);
  const sc = SCENARIOS[index];
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Partial<Record<NodeId, string>>>({});
  const [meters, setMeters] = useState(INITIAL);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ tone: Tone; msg: ReactNode } | null>(null);

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
      L, on,
      log: (tag, cls, msg) => setLog((l) => [...l, { tag, cls, msg: rich(msg) }]),
      light: (id, state) => setLit((s) => ({ ...s, [id]: state })),
      meter: (id, v, label) => setMeters((m) => ({ ...m, [id]: { v, label } })),
    });
    setResult({ tone: out.tone, msg: rich(out.msg) });
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
    <div className="stage rdx">
      <div className="rdx-row" role="group" aria-label="Tình huống">
        {SCENARIOS.map((s, i) => (
          <button key={s.name} className="chip" aria-pressed={i === index} disabled={busy && i !== index} onClick={() => pick(i)}>{s.name}</button>
        ))}
      </div>
      <div className="stage-bar">
        <label className="rdx-toggle">
          <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(); }} />
          {sc.toggle}
        </label>
        <button className="btn primary" onClick={go} disabled={busy}>Chạy</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 255" role="img" aria-label="Ứng dụng kết nối database RDS ở Region Singapore; tuỳ tình huống có RDS Proxy, Read Replica hoặc replica ở Tokyo">
          <rect className={`rdx-region ${lit.sg === "down" ? "down" : ""}`} x={150} y={30} width={480} height={220} rx={12} />
          <text className="rdx-m" x={162} y={240}>Region Singapore</text>
          <path className="rdx-wire" d="M135 140 H300 V105 H335" />
          {shown.includes("replica") && <path className="rdx-wire dash" d={`M${PRIMARY[0] + 75} 95 L${REPLICA[0] - 65} 72`} />}
          {node("app", APP, 120, 56, sc.client[0], sc.client[1], "on")}
          {shown.includes("proxy") && node("proxy", PROXY, 110, 46, "RDS Proxy", on ? "gom kết nối" : "chưa dùng", on ? "" : "off")}
          {node("primary", PRIMARY, 150, 52, sc.primary?.(on) ?? "Primary", "Multi-AZ · đơn hàng")}
          {shown.includes("replica") && node("replica", REPLICA, 130, 46, "Read Replica", "cùng Region")}
          {METERS.map((m, i) => {
            const y = 152 + i * 24;
            const { v, label } = meters[m.id];
            return (
              <g key={m.id}>
                <text className="rdx-s" x={338} y={y + 9}>{m.name}</text>
                <rect className="rdx-bar-bg" x={385} y={y} width={100} height={10} rx={3} />
                <rect className={`rdx-bar ${v >= 95 ? "bad" : v >= 80 ? "warn" : ""}`} x={385} y={y} width={v} height={10} rx={3} />
                <text className="rdx-m" x={492} y={y + 9}>{label}</text>
              </g>
            );
          })}
          {index === 3 && (
            <g opacity={on ? 1 : 0.4}>
              <rect className="rdx-region" x={645} y={30} width={165} height={220} rx={12} />
              <text className="rdx-m" x={657} y={240}>Region Tokyo</text>
              {node("tokyo", TOKYO, 140, 52, lit.tokyo === "ok" ? "Primary mới" : "Read Replica", on ? "cross-Region" : "chưa có")}
            </g>
          )}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 && !result ? (
          <p className="rdx-hint">Chọn một sự cố, bấm <b>Chạy</b> để xem chuyện gì xảy ra. Sau đó bật công tắc và chạy lại.</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) => (
              <li key={i}><span className={`tag ${e.cls}`}>{e.tag}</span><span>{e.msg}</span></li>
            ))}
            {result && <li className={`rdx-result ${result.tone}`}>{result.msg}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
