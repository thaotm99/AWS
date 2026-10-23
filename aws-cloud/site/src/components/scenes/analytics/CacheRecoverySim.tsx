import { useEffect, useRef, useState } from "react";
import { flashText, prefersReducedMotion, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./cache-recovery-sim.css";

// ShopViet's ElastiCache (Redis OSS, node-based) cluster in front of RDS. The learner picks one
// protection strategy, then the primary node fails at 14:00. The sim shows what ElastiCache does,
// how long writes stop, how much cache data is lost and whether reads continue.
// Facts (docs.aws.amazon.com/AmazonElastiCache/latest/dg/): disaster-recovery-resiliency.html
// (without Multi-AZ: primary taken offline, new primary provisioned, synced from a replica or empty;
// with Multi-AZ: replica with least lag promoted; reads continue from replicas), AutoFailover.html
// (writes resume within seconds, DNS of primary endpoint propagated, asynchronous replication can lose
// a small amount of data, Multi-AZ and AOF mutually exclusive), Replication.html (single-node clusters
// have limited protection (AOF), lose all data if the cluster fails; 1 to 5 read replicas),
// ParameterGroups.Engine.html (appendonly not supported from Redis OSS 2.8.22), backups-automatic.html
// (daily backup, retention up to 35 days, restore into a new cache), backups-manual.html (manual
// backups kept until deleted). Durations on the timeline are illustrative, not measured.
// Source question: exam4_q32.

type Strat = "backup" | "aof" | "replica" | "maz";
type Tone = "ok" | "bad" | "warn" | "info";
type Line = { tone: Tone; tag: Bi | string; msg: Bi };
type Phase = "idle" | "running" | "done";

const APP: Pt = [90, 92];
const PRI: Pt = [295, 92];
const REP: Pt = [470, 92];
const S3: Pt = [700, 92];
const TX = (h: number) => 60 + h * 30;
const FAIL_H = 14;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STRATS: [Strat, Bi][] = [
  ["backup", { vi: "Backup tự động hằng ngày (03:00)", en: "Daily automatic backup (03:00)" }],
  ["aof", { vi: "Bật append-only file (AOF)", en: "Turn on append-only file (AOF)" }],
  ["replica", { vi: "Read replica tại AZ b, không bật Multi-AZ", en: "Read replica in AZ b, Multi-AZ off" }],
  ["maz", { vi: "Multi-AZ với automatic failover", en: "Multi-AZ with automatic failover" }],
];

interface Outcome {
  lines: Line[];
  verdict: { tone: Tone; msg: Bi };
  loss: [number, number];
  lossLabel: Bi;
  outage: number;
  outLabel: Bi;
  pills: { writes: Bi; data: Bi; reads: Bi; tones: [Tone, Tone, Tone] };
}

function outcome(s: Strat): Outcome {
  if (s === "backup") return {
    lines: [
      { tone: "bad", tag: { vi: "SỰ CỐ", en: "FAILURE" }, msg: { vi: "14:00: primary tại AZ a gặp lỗi phần cứng. Cluster chỉ có một node.", en: "14:00: the primary in AZ a has a hardware failure. The cluster has a single node." } },
      { tone: "warn", tag: { vi: "THAY THẾ", en: "REPLACE" }, msg: { vi: "ElastiCache đưa primary ra khỏi cluster và tạo primary mới. Không có replica nên **primary mới khởi động rỗng**.", en: "ElastiCache takes the primary offline and provisions a new one. With no replica, **the new primary starts empty**." } },
      { tone: "warn", tag: { vi: "KHÔI PHỤC", en: "RESTORE" }, msg: { vi: "Để lấy lại dữ liệu, **tạo cluster mới** từ backup gần nhất (lưu trên S3, tạo lúc 03:00), sau đó trỏ ứng dụng sang endpoint của cluster mới.", en: "To get the data back, **create a new cluster** from the most recent backup (stored in S3, taken at 03:00), then point the application at the new cluster's endpoint." } },
      { tone: "bad", tag: { vi: "MẤT", en: "LOST" }, msg: { vi: "Mọi thay đổi sau 03:00 không có trong backup. Trong lúc khôi phục, mọi request chuyển thẳng xuống RDS.", en: "Every change after 03:00 is missing from the backup. While recovering, every request goes straight to RDS." } },
    ],
    verdict: { tone: "bad", msg: { vi: "Backup (automatic backup giữ tối đa 35 ngày, hoặc manual backup giữ tới khi bị xoá) dùng để khôi phục khi dữ liệu hỏng hoặc bị xoá, hoặc để tạo cluster mới có sẵn dữ liệu. Backup không giảm thời gian gián đoạn và vẫn mất dữ liệu kể từ lần backup cuối.", en: "Backups (automatic, kept up to 35 days, or manual, kept until you delete them) are for recovering from corruption or deletion, or for seeding a new cluster. They do not shorten the outage, and the data since the last backup is still lost." } },
    loss: [3, FAIL_H], lossLabel: { vi: "mất từ lần backup 03:00", en: "lost since the 03:00 backup" },
    outage: 4, outLabel: { vi: "tạo cluster mới từ backup", en: "new cluster from backup" },
    pills: { writes: { vi: "Ghi: dừng tới khi có cluster mới", en: "Writes: stopped until a new cluster exists" }, data: { vi: "Mất: khoảng 11 giờ dữ liệu", en: "Lost: about 11 hours of data" }, reads: { vi: "Đọc: không có, dồn xuống RDS", en: "Reads: none, all hit RDS" }, tones: ["bad", "bad", "bad"] },
  };
  if (s === "aof") return {
    lines: [
      { tone: "bad", tag: { vi: "CẤU HÌNH", en: "CONFIG" }, msg: { vi: "Tham số `appendonly` **không được hỗ trợ từ Redis OSS 2.8.22** trở đi; với engine hiện tại không bật được AOF.", en: "The `appendonly` parameter is **not supported from Redis OSS 2.8.22** onward; AOF cannot be turned on with current engines." } },
      { tone: "info", tag: { vi: "GIỚI HẠN", en: "LIMIT" }, msg: { vi: "Kể cả trên engine cũ, AOF và Multi-AZ **loại trừ nhau**: bật một tính năng thì không bật được tính năng còn lại. AOF ghi trên chính node đó nên không bảo vệ được dữ liệu khi node gặp lỗi phần cứng.", en: "Even on old engines, AOF and Multi-AZ are **mutually exclusive**: turning one on prevents the other. AOF is written on that same node, so it cannot protect data from a hardware failure of the node." } },
      { tone: "bad", tag: { vi: "SỰ CỐ", en: "FAILURE" }, msg: { vi: "14:00: node duy nhất gặp lỗi. Cluster một node mất toàn bộ dữ liệu; node mới khởi động rỗng.", en: "14:00: the only node fails. A single-node cluster loses all its data; the new node starts empty." } },
    ],
    verdict: { tone: "bad", msg: { vi: "AOF không phải phương án cho ElastiCache hiện nay. “Manual backup” là snapshot (.rdb) lưu trên S3, không phải AOF, và cũng chỉ khôi phục tới thời điểm tạo backup.", en: "AOF is not an option for ElastiCache today. A “manual backup” is a snapshot (.rdb) stored in S3, not an AOF, and it also restores only up to the moment it was taken." } },
    loss: [0, FAIL_H], lossLabel: { vi: "mất toàn bộ dữ liệu cache", en: "all cache data lost" },
    outage: 2, outLabel: { vi: "tạo primary mới", en: "new primary" },
    pills: { writes: { vi: "Ghi: dừng tới khi có primary mới", en: "Writes: stopped until a new primary exists" }, data: { vi: "Mất: toàn bộ cache", en: "Lost: the whole cache" }, reads: { vi: "Đọc: không có, dồn xuống RDS", en: "Reads: none, all hit RDS" }, tones: ["bad", "bad", "bad"] },
  };
  if (s === "replica") return {
    lines: [
      { tone: "bad", tag: { vi: "SỰ CỐ", en: "FAILURE" }, msg: { vi: "14:00: primary tại AZ a gặp lỗi. Replica tại AZ b vẫn hoạt động.", en: "14:00: the primary in AZ a fails. The replica in AZ b keeps running." } },
      { tone: "warn", tag: { vi: "THAY THẾ", en: "REPLACE" }, msg: { vi: "Không bật Multi-AZ: ElastiCache đưa primary ra khỏi cluster, **tạo primary mới** rồi đồng bộ dữ liệu từ replica. Trong thời gian này ứng dụng **không ghi được**.", en: "Multi-AZ is off: ElastiCache takes the primary offline, **provisions a new primary** and syncs it from the replica. During this time the application **cannot write**." } },
      { tone: "ok", tag: { vi: "ĐỌC", en: "READS" }, msg: { vi: "Ứng dụng vẫn đọc được từ replica trong lúc chờ primary mới.", en: "The application can still read from the replica while waiting for the new primary." } },
      { tone: "warn", tag: { vi: "MẤT", en: "LOST" }, msg: { vi: "Replication là bất đồng bộ: một lượng nhỏ dữ liệu ghi ngay trước sự cố có thể chưa kịp sang replica.", en: "Replication is asynchronous: a small amount of data written just before the failure may not have reached the replica." } },
    ],
    verdict: { tone: "warn", msg: { vi: "Read replica giữ lại gần như toàn bộ dữ liệu và tiếp tục phục vụ đọc, nhưng không tự failover: ghi bị gián đoạn lâu hơn so với promote replica. Replica (tối đa 5 mỗi shard) dùng để mở rộng đọc; muốn tự failover cần bật **Multi-AZ**.", en: "A read replica keeps almost all the data and keeps serving reads, but it does not fail over by itself: writes stop for longer than a replica promotion would take. Replicas (up to 5 per shard) scale reads; automatic failover requires turning on **Multi-AZ**." } },
    loss: [FAIL_H - 0.15, FAIL_H], lossLabel: { vi: "độ trễ replication", en: "replication lag" },
    outage: 1.5, outLabel: { vi: "tạo primary mới, đồng bộ", en: "new primary, sync" },
    pills: { writes: { vi: "Ghi: dừng tới khi có primary mới", en: "Writes: stopped until a new primary exists" }, data: { vi: "Mất: lượng nhỏ (độ trễ replication)", en: "Lost: a small amount (replication lag)" }, reads: { vi: "Đọc: tiếp tục từ replica", en: "Reads: continue from the replica" }, tones: ["warn", "warn", "ok"] },
  };
  return {
    lines: [
      { tone: "bad", tag: { vi: "SỰ CỐ", en: "FAILURE" }, msg: { vi: "14:00: primary tại AZ a gặp lỗi.", en: "14:00: the primary in AZ a fails." } },
      { tone: "ok", tag: "PROMOTE", msg: { vi: "ElastiCache tự động **promote replica có độ trễ replication thấp nhất** (AZ b) thành primary. Ghi tiếp tục được **trong vài giây**.", en: "ElastiCache automatically **promotes the replica with the least replication lag** (AZ b) to primary. Writes resume **within seconds**." } },
      { tone: "ok", tag: "DNS", msg: { vi: "Tên DNS của primary endpoint được chuyển sang node mới, ứng dụng không phải đổi cấu hình.", en: "The primary endpoint's DNS name moves to the new node, so the application needs no configuration change." } },
      { tone: "info", tag: { vi: "BỔ SUNG", en: "REPLACE" }, msg: { vi: "ElastiCache tạo replica thay thế tại AZ a. Replication vẫn bất đồng bộ nên có thể mất một lượng nhỏ dữ liệu ghi ngay trước sự cố.", en: "ElastiCache provisions a replacement replica in AZ a. Replication is still asynchronous, so a small amount of data written just before the failure may be lost." } },
    ],
    verdict: { tone: "ok", msg: { vi: "Thời gian gián đoạn ngắn nhất và lượng dữ liệu mất ít nhất trong các phương án: đây là cấu hình high availability AWS khuyến nghị cho cluster node-based. ElastiCache Serverless tự có kiến trúc Multi-AZ.", en: "The shortest outage and the least data lost of all the options: this is the high-availability configuration AWS recommends for node-based clusters. ElastiCache Serverless has a Multi-AZ architecture built in." } },
    loss: [FAIL_H - 0.15, FAIL_H], lossLabel: { vi: "độ trễ replication", en: "replication lag" },
    outage: 0.15, outLabel: { vi: "vài giây", en: "seconds" },
    pills: { writes: { vi: "Ghi: tiếp tục sau vài giây", en: "Writes: resume within seconds" }, data: { vi: "Mất: lượng nhỏ (độ trễ replication)", en: "Lost: a small amount (replication lag)" }, reads: { vi: "Đọc: tiếp tục", en: "Reads: continue" }, tones: ["ok", "warn", "ok"] },
  };
}

export default function CacheRecoverySim() {
  const L = useLang();
  const pk = useRef<SVGGElement>(null);
  const gen = useRef(0);
  const [strat, setStrat] = useState<Strat>("backup");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [failed, setFailed] = useState(false);
  const [promoted, setPromoted] = useState(false);

  useEffect(() => () => { gen.current++; }, []);

  const hasReplica = strat === "replica" || strat === "maz";
  const o = outcome(strat);

  function pick(s: Strat) {
    gen.current++;
    setStrat(s);
    setBusy(false);
    setPhase("idle");
    setFailed(false);
    setPromoted(false);
  }

  async function run() {
    const layer = pk.current;
    if (!layer || busy) return;
    const g = ++gen.current;
    const fast = prefersReducedMotion();
    const step = (ms: number) => (fast ? Promise.resolve() : wait(ms));
    setBusy(true);
    setPhase("running");
    setFailed(false);
    setPromoted(false);
    try {
      if (strat === "aof") {
        flashText(layer, PRI[0], PRI[1] - 44, "appendonly ✗", "flash-bad", 1100);
        await step(700);
        if (g !== gen.current) return;
      }
      await travel(layer, [[APP[0] + 60, APP[1]], [PRI[0] - 75, PRI[1]]], 500, "pkt", 6);
      if (g !== gen.current) return;
      setFailed(true);
      flashText(layer, PRI[0], PRI[1] - 44, "✗ 14:00", "flash-bad", 1000);
      await step(600);
      if (g !== gen.current) return;
      if (strat === "maz") {
        setPromoted(true);
        flashText(layer, REP[0], REP[1] - 44, "PROMOTE", "crx-flash-ok", 1000);
        await step(400);
        if (g !== gen.current) return;
        await travel(layer, [[APP[0], APP[1] + 22], [APP[0], 150], [REP[0], 150], [REP[0], REP[1] + 22]], 700, "pkt-back", 6);
      } else if (strat === "replica") {
        await travel(layer, [[APP[0], APP[1] + 22], [APP[0], 150], [REP[0], 150], [REP[0], REP[1] + 22]], 700, "pkt-back", 6);
        if (g !== gen.current) return;
        flashText(layer, REP[0], REP[1] - 44, L({ vi: "chỉ đọc", en: "read only" }), "crx-flash-edge", 900);
        await step(500);
        if (g !== gen.current) return;
        await travel(layer, [[REP[0] - 75, REP[1]], [PRI[0] + 75, PRI[1]]], 700, "pkt-edge", 6);
      } else if (strat === "backup") {
        await travel(layer, [[S3[0], S3[1] + 26], [S3[0], 150], [PRI[0], 150], [PRI[0], PRI[1] + 22]], 1000, "pkt-edge", 6);
        if (g !== gen.current) return;
        flashText(layer, PRI[0], PRI[1] - 44, "restore 03:00", "crx-flash-edge", 1000);
      } else {
        await travel(layer, [[PRI[0] - 75, PRI[1] + 10], [APP[0] + 60, APP[1] + 10]], 500, "pkt-bad", 6);
        if (g !== gen.current) return;
        flashText(layer, PRI[0], PRI[1] - 44, L({ vi: "rỗng", en: "empty" }), "flash-bad", 900);
      }
      if (g !== gen.current) return;
      await step(400);
      if (g !== gen.current) return;
      setPhase("done");
    } finally {
      if (g === gen.current) setBusy(false);
    }
  }

  const done = phase === "done";
  const priLabel = failed ? (promoted ? L({ vi: "lỗi · sẽ thay mới", en: "failed · to be replaced" }) : L({ vi: "lỗi phần cứng", en: "hardware failure" })) : L({ vi: "đọc và ghi", en: "read and write" });
  const priCls = failed ? "bad" : "on";
  const repCls = !hasReplica ? "off" : promoted ? "ok" : failed ? "warn" : "";
  const toneCls = (t: Tone) => (t === "ok" ? "ok" : t === "bad" ? "bad" : "warn");
  const lossX0 = TX(o.loss[0]);
  const lossW = Math.max(TX(o.loss[1]) - lossX0, 4);
  const outW = Math.max(o.outage * 30, 4);

  return (
    <div className="stage crx">
      <div className="crx-row" role="group" aria-label={L({ vi: "Phương án bảo vệ cache", en: "Cache protection option" })}>
        <span className="crx-lbl">{L({ vi: "Phương án", en: "Option" })}</span>
        {STRATS.map(([id, name]) => (
          <button key={id} className="chip" aria-pressed={strat === id} disabled={busy} onClick={() => pick(id)}>{L(name)}</button>
        ))}
      </div>
      <div className="stage-bar">
        <span className="crx-hint">{L({ vi: "ElastiCache (Redis OSS, node-based) chứa giỏ hàng và kết quả truy vấn đứng trước RDS.", en: "ElastiCache (Redis OSS, node-based) holds carts and query results in front of RDS." })}</span>
        <button className="btn primary" onClick={run} disabled={busy}>{L({ vi: "Primary gặp lỗi lúc 14:00", en: "Primary fails at 14:00" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 10 820 250" role="img" aria-label={L({ vi: "Ứng dụng ShopViet, cluster ElastiCache gồm primary tại AZ a và replica tại AZ b, backup trên S3, và dòng thời gian 24 giờ của sự cố", en: "The ShopViet application, an ElastiCache cluster with a primary in AZ a and a replica in AZ b, backups in S3, and a 24-hour timeline of the incident" })}>
          <rect className="crx-region" x={200} y={22} width={360} height={146} rx={12} />
          <text className="crx-m" x={212} y={38}>ElastiCache · Region</text>
          <rect className="crx-az" x={215} y={46} width={160} height={112} rx={8} />
          <text className="crx-m" x={223} y={152}>AZ a</text>
          <rect className="crx-az" x={390} y={46} width={160} height={112} rx={8} />
          <text className="crx-m" x={398} y={152}>AZ b</text>
          <path className="crx-wire" d={`M${APP[0] + 60} ${APP[1]} H${PRI[0] - 75}`} />
          {hasReplica && <path className="crx-wire dash" d={`M${PRI[0] + 75} ${PRI[1]} H${REP[0] - 75}`} />}
          {strat === "backup" && <path className="crx-wire dash" d={`M${PRI[0]} ${PRI[1] + 22} V150 H${S3[0]} V${S3[1] + 26}`} />}
          <g className="crx-node">
            <rect x={APP[0] - 60} y={APP[1] - 22} width={120} height={44} rx={8} />
            <text className="crx-t" x={APP[0]} y={APP[1] - 3} textAnchor="middle">{L({ vi: "App ShopViet", en: "ShopViet app" })}</text>
            <text className="crx-s" x={APP[0]} y={APP[1] + 12} textAnchor="middle">EC2</text>
          </g>
          <g className={`crx-node ${priCls}`}>
            <rect x={PRI[0] - 75} y={PRI[1] - 22} width={150} height={44} rx={8} />
            <text className="crx-t" x={PRI[0]} y={PRI[1] - 3} textAnchor="middle">Primary</text>
            <text className="crx-s" x={PRI[0]} y={PRI[1] + 12} textAnchor="middle">{priLabel}</text>
          </g>
          <g className={`crx-node ${repCls}`}>
            <rect x={REP[0] - 75} y={REP[1] - 22} width={150} height={44} rx={8} />
            <text className="crx-t" x={REP[0]} y={REP[1] - 3} textAnchor="middle">{hasReplica ? (promoted ? L({ vi: "Primary mới", en: "New primary" }) : "Replica") : L({ vi: "(không có replica)", en: "(no replica)" })}</text>
            <text className="crx-s" x={REP[0]} y={REP[1] + 12} textAnchor="middle">{hasReplica ? (strat === "maz" ? L({ vi: "Multi-AZ, auto failover", en: "Multi-AZ, auto failover" }) : L({ vi: "chỉ đọc, không failover", en: "read-only, no failover" })) : ""}</text>
          </g>
          <g className={`crx-node ${strat === "backup" ? "" : "off"}`}>
            <rect x={S3[0] - 80} y={S3[1] - 26} width={160} height={52} rx={8} />
            <text className="crx-t" x={S3[0]} y={S3[1] - 6} textAnchor="middle">Amazon S3</text>
            <text className="crx-s" x={S3[0]} y={S3[1] + 10} textAnchor="middle">{strat === "backup" ? L({ vi: "backup lúc 03:00", en: "backup at 03:00" }) : L({ vi: "không có backup", en: "no backup" })}</text>
          </g>
          <line className="crx-axis" x1={TX(0)} x2={TX(24)} y1={212} y2={212} />
          {[0, 6, 12, 18, 24].map((h) => (
            <g key={h}>
              <line className="crx-axis" x1={TX(h)} x2={TX(h)} y1={208} y2={216} />
              <text className="crx-m" x={TX(h)} y={230} textAnchor="middle">{`${String(h).padStart(2, "0")}:00`}</text>
            </g>
          ))}
          {strat === "backup" && <line className="crx-mark" x1={TX(3)} x2={TX(3)} y1={196} y2={216} />}
          <line className="crx-mark bad" x1={TX(FAIL_H)} x2={TX(FAIL_H)} y1={190} y2={216} />
          <text className="crx-m bad" x={TX(FAIL_H)} y={186} textAnchor="middle">{L({ vi: "sự cố 14:00", en: "failure 14:00" })}</text>
          {done && (
            <g className="crx-pop">
              <rect className="crx-loss" x={lossX0} y={203} width={lossW} height={18} rx={2} />
              <rect className={`crx-out ${toneCls(o.pills.tones[0])}`} x={TX(FAIL_H)} y={203} width={outW} height={18} rx={2} />
              <text className="crx-m bad" x={lossX0 + lossW - 4} y={248} textAnchor="end">{L(o.lossLabel)}</text>
              <text className="crx-m edge" x={TX(FAIL_H) + outW + 4} y={248}>{L(o.outLabel)}</text>
            </g>
          )}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {!done ? (
          <p className="crx-hint">{L({ vi: "Chọn một phương án bảo vệ lớp cache, sau đó mô phỏng sự cố primary node lúc 14:00. Dòng thời gian chỉ minh hoạ thứ tự và độ lớn tương đối, không phải số đo thực tế.", en: "Choose a way to protect the cache layer, then simulate a primary node failure at 14:00. The timeline only illustrates order and relative size; it is not a measurement." })}</p>
        ) : (
          <>
            <div className="status">
              <span className={`pill ${o.pills.tones[0]}`}><i />{L(o.pills.writes)}</span>
              <span className={`pill ${o.pills.tones[1]}`}><i />{L(o.pills.data)}</span>
              <span className={`pill ${o.pills.tones[2]}`}><i />{L(o.pills.reads)}</span>
            </div>
            <ul className="log">
              {o.lines.map((l, i) => (
                <li key={i}>
                  <span className={`tag ${l.tone === "ok" ? "hit" : l.tone === "bad" ? "bad" : l.tone === "warn" ? "miss" : "info"}`}>{typeof l.tag === "string" ? l.tag : L(l.tag)}</span>
                  <span>{rich(L(l.msg))}</span>
                </li>
              ))}
            </ul>
            <p className={`crx-result ${toneCls(o.verdict.tone)}`}>{rich(L(o.verdict.msg))}</p>
          </>
        )}
      </div>
    </div>
  );
}
