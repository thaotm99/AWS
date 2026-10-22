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
    name: "Báo cáo cuối tháng làm chậm website",
    client: ["Web + báo cáo", "kế toán chạy SQL"],
    toggle: "Bổ sung Read Replica cùng Region",
    shows: (on) => (on ? ["replica"] : []),
    async run({ L, on, log, light, meter }) {
      const orders = Promise.all([0, 1, 2].map(async (i) => { await wait(i * 350); await travel(L, toPrimary, 600, "pkt"); }));
      if (!on) {
        await Promise.all([orders, Promise.all([0, 1, 2].map(async (i) => { await wait(100 + i * 300); await travel(L, toPrimary, 700, "pkt-edge", 8); }))]);
        meter("cpu", 95, "95%");
        light("primary", "bad");
        flashText(L, PRIMARY[0], PRIMARY[1] - 38, "đơn hàng chậm", "flash-bad", 1200);
        log("CPU", "bad", "Truy vấn báo cáo tải nặng chạy cùng tác vụ đơn hàng trên **primary**: CPU 95%.");
        return { tone: "bad", msg: "Thời gian phản hồi khi đặt hàng tăng cao. Cần tách tải đọc của báo cáo sang **Read Replica**." };
      }
      await Promise.all([orders, Promise.all([0, 1, 2].map(async (i) => { await wait(100 + i * 300); await travel(L, toReplica, 700, "pkt-edge", 8); }))]);
      light("replica", "ok");
      light("primary", "ok");
      meter("cpu", 35, "35%");
      log("ĐỌC", "hit", "Báo cáo kết nối tới **endpoint của Read Replica**; primary chỉ xử lý đơn hàng.");
      log("PHÍ", "info", "Replica cùng Region không tính phí truyền dữ liệu replication. Replica nên có cùng cấu hình compute và storage với primary để tránh replication lag.");
      return { tone: "ok", msg: "Hiệu năng website được khôi phục, báo cáo vẫn hoạt động. Read Replica là phương án chi phí thấp nhất để tách tải đọc." };
    },
  },
  {
    name: "Flash sale: 2.000 Lambda mở kết nối",
    client: ["Lambda × 2.000", "1 kết nối/lần gọi"],
    toggle: "Triển khai RDS Proxy phía trước",
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
        log("KẾT NỐI", "bad", "Mỗi Lambda mở một kết nối mới. Database đạt giới hạn **max_connections**; các kết nối mới bị từ chối.");
        return { tone: "bad", msg: "Đơn hàng bị lỗi đúng thời điểm lưu lượng cao nhất. Cần triển khai **RDS Proxy** để gộp kết nối." };
      }
      light("proxy", "on");
      await Promise.all(dots.map(async (i) => { await wait(i * 110); await travel(L, viaProxy, 400, "pkt", 5); }));
      light("proxy", "ok");
      await Promise.all([0, 1].map(async (i) => { await wait(i * 200); await travel(L, proxyToPrimary, 450, "pkt-back", 6); }));
      meter("conn", 12, "120 / 1.000");
      light("primary", "ok");
      log("PROXY", "hit", "**RDS Proxy** tiếp nhận 2.000 kết nối từ Lambda và dùng chung một nhóm nhỏ kết nối tới database (connection pooling).");
      return { tone: "ok", msg: "Database chỉ tiếp nhận khoảng 120 kết nối. Proxy còn duy trì kết nối khi failover, giúp giảm gián đoạn cho ứng dụng." };
    },
  },
  {
    name: "Ổ đĩa database sắp đầy",
    client: ["Web bán hàng", "đơn hàng tăng gấp đôi"],
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
        log("Ổ ĐĨA", "bad", "Dung lượng cấp phát đã hết; instance chuyển sang trạng thái **storage-full** và không thể ghi thêm dữ liệu.");
        return { tone: "bad", msg: "Hệ thống không tiếp nhận đơn hàng mới cho tới khi dung lượng được tăng thủ công. Bật **storage auto scaling** để RDS tự động xử lý." };
      }
      flashText(L, PRIMARY[0], PRIMARY[1] - 38, "+ dung lượng", "rdx-flash-ok", 1200);
      await wait(500);
      meter("disk", 65, "65% / 750 GB");
      light("primary", "ok");
      await travel(L, toPrimary, 400, "pkt");
      log("Ổ ĐĨA", "hit", "Khi dung lượng gần đầy, RDS **tự động tăng dung lượng** tới mức tối đa đã cấu hình, không phát sinh downtime và không cần giám sát thủ công.");
      return { tone: "ok", msg: "Đơn hàng vẫn được ghi bình thường. Cấu hình maximum storage threshold để giới hạn chi phí." };
    },
  },
  {
    name: "Region Singapore gặp sự cố",
    client: ["Web bán hàng", "người dùng Đông Nam Á"],
    toggle: "Bổ sung cross-Region Read Replica tại Tokyo",
    shows: (on) => (on ? ["tokyo"] : []),
    async run({ L, on, log, light }) {
      if (on) {
        await travel(L, [[PRIMARY[0] + 75, PRIMARY[1] + 10], [TOKYO[0] - 70, TOKYO[1]]], 700, "pkt-edge", 5);
        log("SAO CHÉP", "info", "Dữ liệu được sao chép **bất đồng bộ** sang replica tại Tokyo, đồng thời automated backup được copy sang Tokyo.");
      }
      light("sg", "down");
      light("primary", "bad");
      flashText(L, 470, 238, "Region Singapore sự cố", "flash-bad", 1300);
      await wait(700);
      if (!on) {
        await travel(L, toPrimary, 600, "pkt-bad");
        await travel(L, rev(toPrimary), 400, "pkt-bad");
        log("DR", "bad", "Multi-AZ chỉ bảo vệ trong phạm vi một Region. Không có bản sao nào tại Region khác.");
        return { tone: "bad", msg: "Website ngừng hoạt động cho tới khi Region phục hồi. Cần **cross-Region Read Replica** và copy backup sang Region khác cho disaster recovery." };
      }
      flashText(L, TOKYO[0], TOKYO[1] - 38, "promote", "rdx-flash-ok", 1100);
      light("tokyo", "ok");
      await travel(L, toTokyo, 900, "pkt");
      log("DR", "hit", "**Promote** replica tại Tokyo thành database độc lập và chuyển ứng dụng sang endpoint mới.");
      return { tone: "ok", msg: "Website hoạt động trở lại từ Tokyo. Lượng dữ liệu mất tối đa là phần chưa kịp sao chép (replication lag)." };
    },
  },
  {
    name: "Oracle: cài agent vào OS",
    client: ["Đội DBA", "cài agent giám sát"],
    toggle: "Sử dụng RDS Custom for Oracle",
    shows: () => [],
    primary: (on) => (on ? "RDS Custom · Oracle" : "RDS for Oracle"),
    async run({ L, on, log, light }) {
      if (!on) {
        await travel(L, toPrimary, 600, "pkt-bad");
        light("primary", "bad");
        flashText(L, PRIMARY[0], PRIMARY[1] - 38, "không truy cập được OS", "flash-bad", 1200);
        await travel(L, rev(toPrimary), 400, "pkt-bad");
        log("OS", "bad", "Với RDS tiêu chuẩn, AWS quản lý hệ điều hành: không hỗ trợ SSH và không cài đặt được phần mềm lên máy chủ.");
        return { tone: "bad", msg: "Khi cần tuỳ chỉnh OS mà vẫn được AWS quản lý backup, vá lỗi và Multi-AZ, sử dụng **RDS Custom**." };
      }
      await travel(L, toPrimary, 600, "pkt");
      light("primary", "ok");
      log("OS", "hit", "**RDS Custom** cho phép truy cập hệ điều hành và môi trường database, đồng thời vẫn hỗ trợ automated backup và Multi-AZ.");
      return { tone: "ok", msg: "Đội DBA cài đặt được agent. Khi không cần tuỳ chỉnh OS, sử dụng RDS tiêu chuẩn để giảm khối lượng vận hành." };
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
        <svg viewBox="0 20 820 255" role="img" aria-label="Ứng dụng kết nối database RDS tại Region Singapore; tuỳ tình huống có RDS Proxy, Read Replica hoặc replica tại Tokyo">
          <rect className={`rdx-region ${lit.sg === "down" ? "down" : ""}`} x={150} y={30} width={480} height={220} rx={12} />
          <text className="rdx-m" x={162} y={240}>Region Singapore</text>
          <path className="rdx-wire" d="M135 140 H300 V105 H335" />
          {shown.includes("replica") && <path className="rdx-wire dash" d={`M${PRIMARY[0] + 75} 95 L${REPLICA[0] - 65} 72`} />}
          {node("app", APP, 136, 56, sc.client[0], sc.client[1], "on")}
          {shown.includes("proxy") && node("proxy", PROXY, 110, 46, "RDS Proxy", on ? "connection pool" : "chưa sử dụng", on ? "" : "off")}
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
              {node("tokyo", TOKYO, 140, 52, lit.tokyo === "ok" ? "Primary mới" : "Read Replica", on ? "cross-Region" : "chưa triển khai")}
            </g>
          )}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 && !result ? (
          <p className="rdx-hint">Chọn một sự cố và nhấn <b>Chạy</b> để quan sát hậu quả. Sau đó bật tính năng tương ứng và chạy lại.</p>
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
