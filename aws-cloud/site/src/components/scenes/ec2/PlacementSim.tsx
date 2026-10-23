import { useState } from "react";
import { useLang, type Bi } from "../../../lib/lang";
import { rich } from "../diagram";
import "./ec2-sims.css";

// Placement strategies on one Availability Zone drawn as eight racks: cluster packs the
// instances onto neighbouring hardware, partition gives each partition its own racks, spread
// puts every instance on a distinct rack (at most seven running instances per AZ).
// Clicking a rack fails it, so the learner sees how many instances one hardware fault takes down.
// Practice-test sources (build-time only): exam1_q23, exam4_q20, exam4_q60.

type Strategy = "cluster" | "partition" | "spread";
type WorkId = "hpc" | "kafka" | "crit";

const RACKS = 8;
const PARTITIONS = 3;
const SPREAD_MAX = 7;

interface Work {
  name: Bi;
  story: Bi;
  count: number;
  best: Strategy;
  verdict: Record<Strategy, { ok: boolean; text: Bi }>;
}

const WORKS: Record<WorkId, Work> = {
  hpc: {
    name: { vi: "Mô phỏng tồn kho (HPC)", en: "Inventory simulation (HPC)" },
    story: { vi: "8 node chạy mô phỏng dự báo tồn kho, trao đổi dữ liệu liên tục với nhau (tightly coupled). Yêu cầu chính: **độ trễ mạng thấp nhất và thông lượng cao** giữa các node.",
      en: "8 nodes run the inventory forecasting simulation and exchange data with each other constantly (tightly coupled). The key requirement: **the lowest network latency and high throughput** between nodes." },
    count: 8,
    best: "cluster",
    verdict: {
      cluster: { ok: true, text: { vi: "**Cluster placement group** đặt các instance gần nhau trong một AZ, trên cùng phân đoạn mạng high-bisection bandwidth: phù hợp cho giao tiếp node-to-node của HPC. Đánh đổi: một sự cố phần cứng có thể ảnh hưởng nhiều node cùng lúc.",
        en: "A **cluster placement group** packs the instances close together in one AZ, in the same high-bisection bandwidth segment of the network: the right fit for tightly coupled HPC node-to-node communication. Trade-off: one hardware fault can affect several nodes at once." } },
      partition: { ok: false, text: { vi: "Partition placement group tách các nhóm instance lên các rack riêng để giới hạn ảnh hưởng của sự cố phần cứng; nó không đặt các node sát nhau nên không mang lại độ trễ thấp nhất cho HPC.",
        en: "A partition placement group separates groups of instances onto their own racks to contain hardware failures; it does not pack the nodes together, so it does not give HPC the lowest latency." } },
      spread: { ok: false, text: { vi: "Spread placement group đặt mỗi instance trên một rack riêng để giảm sự cố đồng thời, ngược với yêu cầu đặt các node gần nhau. Ngoài ra, mỗi AZ chỉ chạy tối đa 7 instance trong một spread placement group.",
        en: "A spread placement group puts each instance on a distinct rack to reduce simultaneous failures, the opposite of placing nodes close together. Also, a spread placement group runs at most 7 instances per AZ." } },
    },
  },
  kafka: {
    name: { vi: "Cụm Kafka sự kiện đơn hàng", en: "Kafka cluster for order events" },
    story: { vi: "9 broker Kafka lưu sự kiện đơn hàng, mỗi bản ghi được replicate sang broker khác. Ứng dụng biết topology (topology-aware) và cần đặt các bản sao trên **phần cứng tách biệt** để một rack hỏng không làm mất dữ liệu.",
      en: "9 Kafka brokers store order events, and every record is replicated to another broker. The application is topology-aware and needs replicas on **separate hardware** so that one failed rack does not lose data." },
    count: 9,
    best: "partition",
    verdict: {
      cluster: { ok: false, text: { vi: "Cluster dồn các broker lên phần cứng sát nhau: một rack hỏng có thể làm mất cùng lúc nhiều broker, kể cả các bản sao của cùng một dữ liệu.",
        en: "Cluster packs the brokers onto neighbouring hardware: one failed rack can take down several brokers at once, including replicas of the same data." } },
      partition: { ok: true, text: { vi: "**Partition placement group**: mỗi partition có tập rack riêng (nguồn điện và mạng riêng), không partition nào dùng chung rack. Ứng dụng đọc được instance nằm ở partition nào để đặt bản sao ở partition khác. Phù hợp cho workload phân tán, có replicate quy mô lớn như HDFS, HBase, Cassandra, Kafka.",
        en: "**Partition placement group**: each partition has its own set of racks (own power and network), and no two partitions share a rack. The application can see which partition each instance is in and places replicas in another partition. Suited to large distributed and replicated workloads such as HDFS, HBase, Cassandra and Kafka." } },
      spread: { ok: false, text: { vi: "Spread chỉ cho phép tối đa **7 instance đang chạy mỗi AZ** trong một group: broker thứ 8 và 9 không launch được. Spread dành cho số ít instance quan trọng, không dành cho cụm lớn.",
        en: "Spread allows at most **7 running instances per AZ** in a group: brokers 8 and 9 cannot launch. Spread is meant for a small number of critical instances, not a large cluster." } },
    },
  },
  crit: {
    name: { vi: "3 instance điều phối quan trọng", en: "3 critical coordinator instances" },
    story: { vi: "3 instance điều phối thanh toán phải luôn có ít nhất 2 instance hoạt động. Mục tiêu: **không có hai instance nào chịu chung một sự cố phần cứng**.",
      en: "3 payment coordinator instances must always have at least 2 running. The goal: **no two instances share a single hardware failure**." },
    count: 3,
    best: "spread",
    verdict: {
      cluster: { ok: false, text: { vi: "Cluster đặt các instance sát nhau: một rack hỏng có thể làm ngừng 2 trong 3 instance, vi phạm yêu cầu.",
        en: "Cluster places the instances close together: one failed rack can stop 2 of the 3 instances, breaking the requirement." } },
      partition: { ok: true, text: { vi: "Với 3 partition và 3 instance, mỗi instance nằm trên rack riêng nên vẫn đáp ứng. Tuy nhiên AWS khuyến nghị **spread placement group** cho số ít instance quan trọng cần tách biệt từng instance; partition hướng tới các nhóm instance lớn.",
        en: "With 3 partitions and 3 instances, each instance is on its own racks, so this still works. However, AWS recommends a **spread placement group** for a small number of critical instances that must each be kept apart; partition targets large groups of instances." } },
      spread: { ok: true, text: { vi: "**Spread placement group**: mỗi instance trên một rack riêng biệt có nguồn điện và mạng riêng, giảm rủi ro sự cố đồng thời. Giới hạn: 7 instance đang chạy mỗi AZ mỗi group; group có thể trải trên nhiều AZ của Region.",
        en: "**Spread placement group**: each instance is on a distinct rack with its own power and network, reducing the risk of simultaneous failures. Limit: 7 running instances per AZ per group; the group can span multiple AZs in the Region." } },
    },
  },
};

const STRATS: Record<Strategy, Bi> = {
  cluster: { vi: "Cluster", en: "Cluster" },
  partition: { vi: "Partition (3 partition)", en: "Partition (3 partitions)" },
  spread: { vi: "Spread", en: "Spread" },
};

/** Rack index of each instance, or -1 when the instance cannot launch. */
function place(s: Strategy, n: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    if (s === "cluster") return i < Math.ceil(n / 2) ? 3 : 4;
    if (s === "partition") return 2 * (i % PARTITIONS) + (Math.floor(i / PARTITIONS) % 2) + 1;
    return i < SPREAD_MAX ? i : -1;
  });
}

/** Partition that owns a rack in the partition strategy (racks 1-6), or null. */
const partOf = (rack: number) => (rack >= 1 && rack <= 2 * PARTITIONS ? Math.floor((rack - 1) / 2) + 1 : null);

export default function PlacementSim() {
  const L = useLang();
  const [work, setWork] = useState<WorkId>("hpc");
  const [strat, setStrat] = useState<Strategy>("cluster");
  const [down, setDown] = useState<number | null>(null);

  const w = WORKS[work];
  const racks = place(strat, w.count);
  const launched = racks.filter((r) => r >= 0).length;
  const notLaunched = w.count - launched;
  const lost = down === null ? 0 : racks.filter((r) => r === down).length;
  const v = w.verdict[strat];

  function pickWork(id: WorkId) { setWork(id); setDown(null); }
  function pickStrat(s: Strategy) { setStrat(s); setDown(null); }

  const network = strat === "cluster"
    ? { good: true, text: L({ vi: "Độ trễ thấp nhất; single-flow tới 10 Gbps", en: "Lowest latency; single-flow up to 10 Gbps" }) }
    : { good: false, text: L({ vi: "Bình thường; single-flow tới 5 Gbps", en: "Standard; single-flow up to 5 Gbps" }) };
  const scope = strat === "cluster"
    ? L({ vi: "Chỉ 1 AZ", en: "Single AZ only" })
    : strat === "partition"
      ? L({ vi: "Nhiều AZ; tối đa 7 partition mỗi AZ", en: "Multiple AZs; up to 7 partitions per AZ" })
      : L({ vi: "Nhiều AZ; tối đa 7 instance chạy mỗi AZ", en: "Multiple AZs; up to 7 running instances per AZ" });

  return (
    <div className="stage">
      <div className="ec2-chips" role="group" aria-label={L({ vi: "Workload", en: "Workload" })}>
        {(Object.keys(WORKS) as WorkId[]).map((id) => (
          <button key={id} className="chip" aria-pressed={id === work} onClick={() => pickWork(id)}>{L(WORKS[id].name)}</button>
        ))}
      </div>
      <p className="ec2-story">{rich(L(w.story))}</p>
      <div className="stage-bar">
        <span className="label">{L({ vi: "Placement strategy", en: "Placement strategy" })}</span>
        {(Object.keys(STRATS) as Strategy[]).map((s) => (
          <button key={s} className="btn" aria-pressed={s === strat} onClick={() => pickStrat(s)}>{L(STRATS[s])}</button>
        ))}
      </div>
      <div className="pg-az">
        <span className="pg-az-t">{L({ vi: "AZ ap-southeast-1a · 8 rack", en: "AZ ap-southeast-1a · 8 racks" })}</span>
        <div className="pg-racks">
          {Array.from({ length: RACKS }, (_, r) => {
            const here = racks.map((x, i) => [x, i] as const).filter(([x]) => x === r);
            const p = strat === "partition" ? partOf(r) : null;
            return (
              <button key={r} className={"pg-rack" + (down === r ? " down" : "")} onClick={() => setDown(down === r ? null : r)}
                aria-pressed={down === r}
                aria-label={L({ vi: `Rack ${r + 1}: ${here.length} instance. Nhấn để mô phỏng rack hỏng`, en: `Rack ${r + 1}: ${here.length} instances. Press to simulate a rack failure` })}>
                <span className="pg-rack-t">R{r + 1}</span>
                {p !== null && <span className="pg-part">P{p}</span>}
                {here.map(([, i]) => <span key={i} className={"pg-inst" + (down === r ? " lost" : "")} />)}
              </button>
            );
          })}
        </div>
      </div>
      {notLaunched > 0 && (
        <p className="pg-over">{L({ vi: `${notLaunched} instance không launch được: spread placement group đã đủ 7 instance đang chạy trong AZ này.`,
          en: `${notLaunched} instances cannot launch: the spread placement group already has 7 running instances in this AZ.` })}</p>
      )}
      <p className="pg-hint">{L({ vi: "Nhấn vào một rack để mô phỏng sự cố phần cứng (nguồn điện hoặc mạng của rack); nhấn lại để khôi phục.",
        en: "Press a rack to simulate a hardware failure (the rack's power or network); press it again to restore it." })}</p>
      <div className="readout" aria-live="polite">
        <div className="status">
          <span className={"pill " + (v.ok ? "ok" : "bad")}><i />{v.ok
            ? (strat === w.best ? L({ vi: "Phù hợp nhất", en: "Best fit" }) : L({ vi: "Đáp ứng được", en: "Works" }))
            : L({ vi: "Không phù hợp", en: "Not a fit" })}</span>
          <span className="count">{down === null
            ? L({ vi: `${launched}/${w.count} instance đang chạy`, en: `${launched}/${w.count} instances running` })
            : L({ vi: `Rack R${down + 1} hỏng: mất ${lost}/${w.count} instance`, en: `Rack R${down + 1} failed: ${lost}/${w.count} instances lost` })}</span>
        </div>
        <div className="pg-metrics">
          <div className="pg-metric"><span>{L({ vi: "Mạng giữa các instance", en: "Inter-instance network" })}</span><b className={network.good ? "good" : ""}>{network.text}</b></div>
          <div className="pg-metric"><span>{L({ vi: "Phạm vi", en: "Scope" })}</span><b>{scope}</b></div>
          <div className="pg-metric"><span>{L({ vi: "Ảnh hưởng khi 1 rack hỏng", en: "Impact of one failed rack" })}</span><b className={down === null ? "" : lost > 1 ? "bad" : "good"}>{down === null
            ? L({ vi: "Chọn một rack để thử", en: "Pick a rack to test" })
            : L({ vi: `${lost} instance`, en: `${lost} instance${lost === 1 ? "" : "s"}` })}</b></div>
        </div>
        <p style={{ margin: "8px 0 0" }}>{rich(L(v.text))}</p>
        <p className="note-small">{L({ vi: "Số rack và vị trí instance trong hình là minh hoạ. Theo tài liệu AWS, mức single-flow 10 Gbps (trong cluster) và 5 Gbps (ngoài cluster) áp dụng cho instance bật enhanced networking. Tạo placement group không tính phí.",
          en: "The rack count and instance positions are illustrative. According to the AWS documentation, the 10 Gbps (inside a cluster) and 5 Gbps (outside a cluster) single-flow limits apply to instances with enhanced networking. There is no charge for creating a placement group." })}</p>
      </div>
    </div>
  );
}
