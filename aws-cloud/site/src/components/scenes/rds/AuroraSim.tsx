import { useRef, useState, type ReactNode } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";
import "./rds-sims.css";

// ShopViet's Aurora cluster: one shared cluster volume (6 copies over 3 AZs), a writer and
// readers behind the cluster and reader endpoints. Try writes, spread reads, Auto Scaling,
// writer failover, then Aurora Global Database and a Region outage.
// Cross-Region read replica for Aurora MySQL: AuroraMySQL.Replication.CrossRegion.html (exam2_q6).
// Source questions: exam5_q3, exam2_q52, exam3_q50, exam2_q5, exam1_q7, exam2_q61, exam6_q23, exam6_q17, exam2_q53, exam4_q2, exam6_q5, exam5_q7.

type Inst = "i1" | "i2" | "i3" | "i4";
const INST: Record<Inst, { x: number; y: number; az: string }> = {
  i1: { x: 308, y: 100, az: "a" },
  i2: { x: 418, y: 100, az: "b" },
  i3: { x: 528, y: 100, az: "c" },
  i4: { x: 308, y: 160, az: "a" },
};
const APP: Pt = [55, 125];
const WEP: Pt = [185, 85];
const REP: Pt = [185, 170];
const VOL_Y = 232;
const TOKYO: Pt = [705, 100];
const COPIES = [285, 331, 395, 441, 505, 551];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const INTRO: Bi<ReactNode> = { vi: "Writer tại AZ a, hai reader tại AZ b và c, tất cả dùng chung một cluster volume. Thực hiện lần lượt từng thao tác phía trên.", en: "A writer in AZ a and two readers in AZ b and c, all sharing one cluster volume. Try each action above in turn." };

export default function AuroraSim() {
  const tr = useLang();
  const pk = useRef<SVGGElement>(null);
  const [writer, setWriter] = useState<Inst>("i1");
  const [down, setDown] = useState<Inst | null>(null);
  const [hasR3, setHasR3] = useState(false);
  const [global, setGlobal] = useState(false);
  const [regionDown, setRegionDown] = useState(false);
  const [hot, setHot] = useState<Partial<Record<Inst | "tokyo", boolean>>>({});
  const [copies, setCopies] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Bi<ReactNode>>(INTRO);

  const live = (Object.keys(INST) as Inst[]).filter((i) => (i !== "i4" || hasR3) && i !== down);
  const readers = live.filter((i) => i !== writer);
  const top = (i: Inst): Pt => [INST[i].x, INST[i].y - 22];

  async function act(fn: (L: SVGGElement) => Promise<void>) {
    const L = pk.current;
    if (!L || busy) return;
    setBusy(true);
    await fn(L);
    setBusy(false);
  }

  const flashHot = (id: Inst | "tokyo") => {
    setHot((h) => ({ ...h, [id]: true }));
    setTimeout(() => setHot((h) => ({ ...h, [id]: false })), 600);
  };

  const write = () => act(async (L) => {
    if (regionDown) {
      await travel(L, [[APP[0], APP[1] + 25], [APP[0], 280], [TOKYO[0], 280], [TOKYO[0], TOKYO[1] + 22]], 900, "pkt");
      flashHot("tokyo");
      setNote({ vi: <>Đơn hàng hiện được ghi vào cluster tại <b>Tokyo</b>, cluster này đã trở thành primary.</>, en: <>Orders are now written to the cluster in <b>Tokyo</b>, which has become the primary.</> });
      return;
    }
    const w = INST[writer];
    await travel(L, [[APP[0] + 45, APP[1] - 10], [WEP[0] - 60, WEP[1]]], 350, "pkt");
    await travel(L, [[WEP[0] + 60, WEP[1]], [250, 70], [w.x, 70], top(writer)], 450, "pkt");
    flashHot(writer);
    await travel(L, [[w.x + 30, w.y + 22], [w.x + 30, VOL_Y - 25]], 350, "pkt");
    for (let k = 1; k <= 6; k++) { setCopies(k); await wait(60); }
    flashText(L, 418, VOL_Y - 30, tr({ vi: "ghi vào cluster volume", en: "written to cluster volume" }), "rdx-flash-ok", 1300);
    if (global) await travel(L, [[578, VOL_Y], [615, VOL_Y]], 500, "pkt-edge", 5);
    await travel(L, [[w.x + 30, VOL_Y - 25], [w.x + 30, w.y + 22]], 300, "pkt-back");
    await travel(L, [top(writer), [w.x, 70], [250, 70], [WEP[0] + 60, WEP[1]], [APP[0] + 45, APP[1] - 10]], 600, "pkt-back");
    setTimeout(() => setCopies(0), 900);
    setNote({ vi: <>Request ghi đi qua <b>cluster endpoint</b> tới writer. Dữ liệu được ghi vào <b>cluster volume</b> dùng chung, gồm 6 bản sao trên 3 AZ. Reader đọc cùng volume nên replica lag thường thấp hơn nhiều so với 100 mili giây.{global ? <> Volume cũng được sao chép sang Tokyo, thường dưới 1 giây.</> : null}</>, en: <>The write request goes through the <b>cluster endpoint</b> to the writer. Data is written to the shared <b>cluster volume</b>, which keeps 6 copies across 3 AZs. Readers read the same volume, so replica lag is usually much less than 100 milliseconds.{global ? <> The volume is also replicated to Tokyo, usually in under 1 second.</> : null}</> });
  });

  const read = () => act(async (L) => {
    if (regionDown) {
      await travel(L, [[APP[0], APP[1] + 25], [APP[0], 280], [TOKYO[0], 280], [TOKYO[0], TOKYO[1] + 22]], 900, "pkt");
      flashHot("tokyo");
      setNote({ vi: <>Region Singapore đang gặp sự cố; toàn bộ request đọc và ghi được chuyển tới Tokyo.</>, en: <>The Singapore Region is down; all read and write requests go to Tokyo.</> });
      return;
    }
    await Promise.all([0, 1, 2, 3, 4, 5].map(async (k) => {
      await wait(k * 160);
      const r = readers[k % readers.length];
      const t = INST[r];
      await travel(L, [[APP[0] + 45, APP[1] + 10], [REP[0] - 60, REP[1]]], 300, "pkt");
      const entry: Pt[] = t.y > 120 ? [[REP[0] + 60, REP[1]], [250, 130], [t.x, 130], [t.x, t.y - 22]] : [[REP[0] + 60, REP[1]], [250, 130], [t.x, 130], [t.x, t.y + 22]];
      await travel(L, entry, 400, "pkt");
      flashHot(r);
    }));
    setNote({ vi: <><b>Reader endpoint</b> phân phối kết nối đọc cho {readers.length} reader. Ứng dụng chỉ cần một endpoint đọc, không cần biết số lượng replica.</>, en: <>The <b>reader endpoint</b> distributes read connections across {readers.length} readers. The application needs only one read endpoint and does not need to know how many replicas there are.</> });
  });

  const surge = () => act(async (L) => {
    readers.forEach((r) => flashText(L, INST[r].x, INST[r].y - 30, "CPU 80%", "flash-bad", 1100));
    await wait(1000);
    if (!hasR3) {
      setHasR3(true);
      flashText(L, INST.i4.x, INST.i4.y - 30, tr({ vi: "+ reader mới", en: "+ new reader" }), "rdx-flash-ok", 1100);
      setNote({ vi: <><b>Aurora Auto Scaling</b> phát hiện CPU của các reader vượt ngưỡng và bổ sung một Aurora Replica. Sau thời điểm cao điểm, các replica dư thừa được loại bỏ.</>, en: <><b>Aurora Auto Scaling</b> detects that reader CPU is over the threshold and adds an Aurora Replica. After the peak, the extra replicas are removed.</> });
    } else {
      setNote({ vi: <>Auto Scaling đã bổ sung reader. Số lượng replica được duy trì trong khoảng min/max đã cấu hình.</>, en: <>Auto Scaling has already added a reader. The number of replicas stays within the configured min/max range.</> });
    }
  });

  const failWriter = () => act(async (L) => {
    const old = writer;
    setDown(old);
    flashText(L, INST[old].x, INST[old].y - 30, tr({ vi: "writer lỗi", en: "writer fails" }), "flash-bad", 1300);
    await wait(1100);
    const next = (["i2", "i3", "i4", "i1"] as Inst[]).find((i) => i !== old && (i !== "i4" || hasR3))!;
    setWriter(next);
    flashText(L, INST[next].x, INST[next].y - 30, "promote", "rdx-flash-ok", 1100);
    await travel(L, [[WEP[0] + 60, WEP[1]], [250, 70], [INST[next].x, 70], top(next)], 600, "pkt");
    setNote({ vi: <>Aurora <b>promote một reader</b> thành writer; dịch vụ thường được khôi phục trong vòng dưới 60 giây, nhiều trường hợp dưới 30 giây, và <b>cluster endpoint</b> tự động trỏ tới writer mới. AWS khuyến nghị tạo Aurora Replica tại hai AZ khác nhau trở lên.</>, en: <>Aurora <b>promotes a reader</b> to writer; service is usually restored in under 60 seconds, often in under 30 seconds, and the <b>cluster endpoint</b> automatically points to the new writer. AWS recommends creating Aurora Replicas in two or more different AZs.</> });
  });

  const addGlobal = () => act(async (L) => {
    setGlobal(true);
    await wait(300);
    await travel(L, [[578, VOL_Y], [615, VOL_Y]], 600, "pkt-edge", 5);
    flashText(L, 597, VOL_Y - 18, tr({ vi: "< 1 giây", en: "< 1 s" }), "rdx-flash-ok", 1200);
    setNote({ vi: <><b>Aurora Global Database</b> sao chép ở tầng storage sang Region Tokyo, độ trễ thường dưới 1 giây. Người dùng tại Nhật Bản đọc dữ liệu tại Region gần nhất với độ trễ thấp; Tokyo đồng thời là Region dự phòng. Aurora MySQL còn hỗ trợ <b>cross-Region read replica</b> (một DB cluster ở Region khác, sao chép bằng binlog, tối đa 5 cluster), độ trễ cao hơn Global Database. Multi-AZ chỉ trải trên các AZ của một Region nên không đưa dữ liệu tới gần người dùng ở Region khác.</>, en: <><b>Aurora Global Database</b> replicates at the storage layer to the Tokyo Region, usually with under 1 second of lag. Users in Japan read data from the nearest Region with low latency; Tokyo is also the standby Region. Aurora MySQL also supports <b>cross-Region read replicas</b> (a DB cluster in another Region, replicated with binlog, up to 5 clusters), with more lag than Global Database. Multi-AZ spans only the AZs of one Region, so it does not bring data closer to users in another Region.</> });
  });

  const failRegion = () => act(async (L) => {
    setRegionDown(true);
    flashText(L, 350, 46, tr({ vi: "Region Singapore sự cố", en: "Singapore Region outage" }), "flash-bad", 1400);
    await wait(1200);
    flashText(L, TOKYO[0], TOKYO[1] - 30, "promote", "rdx-flash-ok", 1200);
    await travel(L, [[APP[0], APP[1] + 25], [APP[0], 280], [TOKYO[0], 280], [TOKYO[0], TOKYO[1] + 22]], 900, "pkt");
    flashHot("tokyo");
    setNote({ vi: <>Cluster tại Tokyo được promote thành primary (cross-Region failover của Global Database). <b>RPO thường tính bằng giây, RTO có thể tính bằng phút</b>. Với chuyển đổi có kế hoạch, dùng <b>switchover</b> (RPO = 0). Phương án copy snapshot sang Region khác chậm hơn đáng kể.</>, en: <>The Tokyo cluster is promoted to primary (Global Database cross-Region failover). <b>RPO is typically measured in seconds, and RTO can be measured in minutes</b>. For a planned change, use a <b>switchover</b> (RPO = 0). Copying snapshots to another Region is significantly slower.</> });
  });

  function reset() {
    setWriter("i1");
    setDown(null);
    setHasR3(false);
    setGlobal(false);
    setRegionDown(false);
    setHot({});
    setCopies(0);
    setNote(INTRO);
  }

  const inst = (i: Inst) => {
    if (i === "i4" && !hasR3) return null;
    const { x, y, az } = INST[i];
    const isDown = down === i || regionDown;
    const role = down === i ? tr({ vi: "Lỗi", en: "Failed" }) : i === writer ? "Writer" : "Reader";
    const cls = isDown ? "bad" : hot[i] ? "ok" : i === writer ? "on" : "";
    return (
      <g key={i} className={`rdx-node ${cls}${i === "i4" ? " rdx-pop" : ""}`}>
        <rect x={x - 46} y={y - 22} width={92} height={44} rx={8} />
        <text className="rdx-t" x={x} y={y - 3} textAnchor="middle">{role}</text>
        <text className="rdx-s" x={x} y={y + 13} textAnchor="middle">AZ {az}</text>
      </g>
    );
  };

  return (
    <div className="stage rdx">
      <div className="stage-bar">
        <button className="btn primary" onClick={write} disabled={busy}>{tr({ vi: "Ghi đơn hàng", en: "Write order" })}</button>
        <button className="btn" onClick={read} disabled={busy}>{tr({ vi: "6 lượt đọc", en: "6 reads" })}</button>
        <button className="btn" onClick={surge} disabled={busy || regionDown}>{tr({ vi: "Tải đọc tăng đột biến", en: "Read traffic spike" })}</button>
        <button className="btn danger" onClick={failWriter} disabled={busy || !!down || regionDown}>{tr({ vi: "Sự cố writer", en: "Writer failure" })}</button>
        <button className="btn" onClick={addGlobal} disabled={busy || global}>{tr({ vi: "Thêm Region Tokyo", en: "Add Tokyo Region" })}</button>
        <button className="btn danger" onClick={failRegion} disabled={busy || !global || regionDown}>{tr({ vi: "Sự cố Region Singapore", en: "Singapore Region outage" })}</button>
        <button className="btn" onClick={reset} disabled={busy}>{tr({ vi: "Đặt lại", en: "Reset" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 820 270" role="img" aria-label={tr({ vi: "Aurora cluster: cluster endpoint và reader endpoint, writer và các reader tại ba AZ dùng chung cluster volume; tuỳ chọn bổ sung Region Tokyo", en: "Aurora cluster: cluster endpoint and reader endpoint, a writer and readers in three AZs sharing a cluster volume; optionally add the Tokyo Region" })}>
          <rect className={`rdx-region ${regionDown ? "down" : ""}`} x={115} y={28} width={472} height={242} rx={12} />
          <text className="rdx-m" x={127} y={262}>{tr({ vi: "Region Singapore · Aurora cluster", en: "Singapore Region · Aurora cluster" })}</text>
          {["a", "b", "c"].map((az, k) => (
            <g key={az}>
              <rect className="rdx-az" x={258 + k * 110} y={52} width={100} height={150} rx={8} />
              <text className="rdx-m" x={266 + k * 110} y={196}>AZ {az}</text>
            </g>
          ))}
          <path className="rdx-wire" d={`M100 115 L125 ${WEP[1]} M100 135 L125 ${REP[1]}`} />
          <path className="rdx-wire dash" d={`M245 ${WEP[1]} L250 70 H${INST[writer].x} V78 M245 ${REP[1]} L250 130 H528`} />
          <g className="rdx-node on">
            <rect x={APP[0] - 45} y={APP[1] - 25} width={90} height={50} rx={8} />
            <text className="rdx-t" x={APP[0]} y={APP[1] + 4} textAnchor="middle">{tr({ vi: "Ứng dụng", en: "App" })}</text>
          </g>
          <g className="rdx-node">
            <rect x={WEP[0] - 60} y={WEP[1] - 22} width={120} height={44} rx={8} />
            <text className="rdx-t" x={WEP[0]} y={WEP[1] - 3} textAnchor="middle">Cluster endpoint</text>
            <text className="rdx-s" x={WEP[0]} y={WEP[1] + 13} textAnchor="middle">{tr({ vi: "ghi → AZ ", en: "writes → AZ " })}{INST[writer].az}</text>
          </g>
          <g className="rdx-node">
            <rect x={REP[0] - 60} y={REP[1] - 22} width={120} height={44} rx={8} />
            <text className="rdx-t" x={REP[0]} y={REP[1] - 3} textAnchor="middle">Reader endpoint</text>
            <text className="rdx-s" x={REP[0]} y={REP[1] + 13} textAnchor="middle">{tr({ vi: `tới ${readers.length} reader`, en: `to ${readers.length} readers` })}</text>
          </g>
          {(Object.keys(INST) as Inst[]).map(inst)}
          <g className={`rdx-node ${regionDown ? "bad" : ""}`}>
            <rect x={258} y={VOL_Y - 25} width={320} height={44} rx={8} />
            <text className="rdx-s" x={418} y={VOL_Y - 10} textAnchor="middle">{tr({ vi: "cluster volume dùng chung · 6 bản trên 3 AZ", en: "shared cluster volume · 6 copies across 3 AZs" })}</text>
            {COPIES.map((x, k) => <rect key={x} className={`rdx-copy ${k < copies ? "hit" : ""}`} x={x - 11} y={VOL_Y} width={22} height={10} rx={2} />)}
          </g>
          {global && (
            <g className="rdx-pop">
              <rect className="rdx-region" x={600} y={28} width={210} height={242} rx={12} />
              <text className="rdx-m" x={612} y={262}>{tr({ vi: "Region Tokyo · secondary", en: "Tokyo Region · secondary" })}</text>
              <g className={`rdx-node ${hot.tokyo ? "ok" : regionDown ? "on" : ""}`}>
                <rect x={TOKYO[0] - 70} y={TOKYO[1] - 22} width={140} height={44} rx={8} />
                <text className="rdx-t" x={TOKYO[0]} y={TOKYO[1] - 3} textAnchor="middle">{regionDown ? tr({ vi: "Writer mới", en: "New writer" }) : "Reader"}</text>
                <text className="rdx-s" x={TOKYO[0]} y={TOKYO[1] + 13} textAnchor="middle">{regionDown ? tr({ vi: "đã promote", en: "promoted" }) : tr({ vi: "đọc tại Nhật Bản", en: "reads in Japan" })}</text>
              </g>
              <g className="rdx-node">
                <rect x={615} y={VOL_Y - 25} width={180} height={44} rx={8} />
                <text className="rdx-s" x={705} y={VOL_Y + 2} textAnchor="middle">cluster volume · Tokyo</text>
              </g>
            </g>
          )}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">{tr(note)}</div>
    </div>
  );
}
