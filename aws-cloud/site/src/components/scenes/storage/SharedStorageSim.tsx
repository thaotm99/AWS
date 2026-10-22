import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./storage-sims.css";

// A customer uploads a product video to one of ShopViet's three web servers (two AZs).
// With EBS only that instance sees it; with EFS or S3 every instance does, and the data
// survives losing an AZ. Source questions: exam2_q29, exam6_q15, exam1_q46, exam1_q9.

type Store = "ebs" | "efs" | "s3";
type Ec2 = "w1" | "w2" | "w3";

const STORES: { id: Store; name: Bi; label: string; sub: Bi }[] = [
  { id: "ebs", name: { vi: "EBS gắn vào web-1", en: "EBS attached to web-1" }, label: "EBS volume", sub: { vi: "block · thuộc AZ a", en: "block · in AZ a" } },
  { id: "efs", name: { vi: "Amazon EFS", en: "Amazon EFS" }, label: "Amazon EFS", sub: { vi: "file (NFS) · lưu trữ tại nhiều AZ · mount target tại mỗi AZ", en: "file (NFS) · stored across multiple AZs · a mount target in each AZ" } },
  { id: "s3", name: { vi: "Amazon S3", en: "Amazon S3" }, label: "Amazon S3", sub: { vi: "object · truy cập qua API · lưu trữ tại ≥ 3 AZ", en: "object · accessed through an API · stored across ≥ 3 AZs" } },
];

const EC2: Record<Ec2, { x: number; az: "a" | "b" }> = { w1: { x: 130, az: "a" }, w2: { x: 300, az: "a" }, w3: { x: 620, az: "b" } };
const EY = 104;
const SY = 222;
const EBS_BOX = { x: 70, w: 120 };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
type LogEntry = { tag: Bi; cls: string; msg: Bi };

export default function SharedStorageSim() {
  const tr = useLang();
  const pk = useRef<SVGGElement>(null);
  const [store, setStore] = useState<Store>("ebs");
  const [azDown, setAzDown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lit, setLit] = useState<Partial<Record<Ec2 | "store", string>>>({});
  const [log, setLog] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<{ ok: boolean; msg: Bi } | null>(null);

  function reset() {
    setLit({});
    setLog([]);
    setResult(null);
  }

  const add = (tag: Bi, cls: string, msg: Bi) => setLog((l) => [...l, { tag, cls, msg }]);
  const light = (id: Ec2 | "store", s: string) => setLit((v) => ({ ...v, [id]: s }));

  // Path from an instance down to the storage it would use.
  function path(id: Ec2): Pt[] {
    const x = EC2[id].x;
    if (store !== "ebs") return [[x, EY + 22], [x, SY - 22]];
    if (id === "w1") return [[x, EY + 22], [x, SY - 22]];
    if (id === "w3") return [[x, EY + 22], [x, 165], [425, 165]];
    return [[x, EY + 22], [x, 165], [EBS_BOX.x + EBS_BOX.w + 8, 165]];
  }

  async function run() {
    const L = pk.current;
    if (!L || busy) return;
    setBusy(true);
    reset();
    const writer: Ec2 = azDown ? "w3" : "w1";
    const alive = (Object.keys(EC2) as Ec2[]).filter((id) => !azDown || EC2[id].az === "b");
    // 1. upload
    await travel(L, [[EC2[writer].x, 30], [EC2[writer].x, EY - 22]], 450, "pkt");
    light(writer, "on");
    const ebsLost = store === "ebs" && azDown;
    if (ebsLost) {
      await travel(L, [[EC2.w3.x, EY + 22], [EC2.w3.x, 165], [430, 165]], 600, "pkt-bad");
      flashText(L, 410, 155, tr({ vi: "AZ a sự cố", en: "AZ a down" }), "flash-bad", 1100);
      light("w3", "bad");
      light("store", "bad");
      add({ vi: "GHI", en: "WRITE" }, "bad", { vi: "web-3 tại AZ b không truy cập được volume: **EBS** thuộc AZ a và chỉ gắn được vào instance cùng AZ.", en: "web-3 in AZ b cannot access the volume: the **EBS** volume is in AZ a and can attach only to instances in the same AZ." });
      setResult({ ok: false, msg: { vi: "Cả video cũ trên volume và video mới đều không sử dụng được cho tới khi AZ a phục hồi hoặc dữ liệu được khôi phục từ snapshot. Dữ liệu lưu trên một ổ block gắn với một AZ là single point of failure.", en: "Neither the existing videos on the volume nor the new video can be used until AZ a recovers or the data is restored from a snapshot. Data on a block volume tied to one AZ is a single point of failure." } });
      setBusy(false);
      return;
    }
    await travel(L, path(writer), 500, "pkt");
    light("store", "ok");
    add({ vi: "GHI", en: "WRITE" }, "hit", { vi: `${writer === "w1" ? "web-1" : "web-3"} tiếp nhận video và ghi vào **${STORES.find((s) => s.id === store)!.label}**.`, en: `${writer === "w1" ? "web-1" : "web-3"} receives the video and writes it to **${STORES.find((s) => s.id === store)!.label}**.` });
    await wait(250);
    // 2. every live server opens the video
    const results = await Promise.all(alive.map(async (id, i) => {
      await wait(i * 120);
      const ok = store !== "ebs" || id === "w1";
      const p = path(id);
      await travel(L, p, 550, ok ? "pkt" : "pkt-bad");
      if (!ok) {
        if (id === "w2") flashText(L, 255, 154, tr({ vi: "đã gắn web-1", en: "on web-1" }), "flash-bad", 1100);
        else flashText(L, 525, 154, tr({ vi: "khác AZ", en: "other AZ" }), "flash-bad", 1100);
        light(id, "bad");
        await travel(L, [...p].reverse(), 400, "pkt-bad");
        return false;
      }
      await travel(L, [...p].reverse(), 450, "pkt-back");
      light(id, "ok");
      return true;
    }));
    const okCount = results.filter(Boolean).length;
    if (store === "ebs") {
      add({ vi: "ĐỌC", en: "READ" }, "bad", { vi: "web-2 và web-3 không truy cập được video. Một EBS volume chỉ gắn vào một instance (Multi-Attach chỉ hỗ trợ io1/io2 và chỉ trong cùng AZ).", en: "web-2 and web-3 cannot access the video. An EBS volume attaches to only one instance (Multi-Attach supports only io1/io2, and only within the same AZ)." });
      setResult({ ok: false, msg: { vi: "Người dùng được định tuyến tới web-2 hoặc web-3 không xem được video vừa tải lên. Dữ liệu dùng chung cần được chuyển sang **EFS** hoặc **S3**. EBS phù hợp làm ổ boot và ổ riêng của từng instance, tính phí theo **dung lượng cấp phát**.", en: "Users routed to web-2 or web-3 cannot watch the video that was just uploaded. Shared data needs to move to **EFS** or **S3**. EBS suits boot volumes and per-instance volumes, and is charged for **provisioned capacity**." } });
    } else if (store === "efs") {
      add({ vi: "ĐỌC", en: "READ" }, "hit", { vi: `${okCount}/${alive.length} server truy cập được video qua **mount target** trong AZ tương ứng.`, en: `${okCount}/${alive.length} servers access the video through the **mount target** in their AZ.` });
      setResult({ ok: true, msg: azDown
        ? { vi: "AZ a gặp sự cố nhưng EFS lưu dữ liệu tại nhiều AZ; web-3 vẫn đọc dữ liệu qua mount target tại AZ b. EFS tính phí theo dung lượng thực tế sử dụng.", en: "AZ a fails, but EFS stores data across multiple AZs; web-3 still reads the data through the mount target in AZ b. EFS charges for the storage actually used." }
        : { vi: "Mọi server truy cập cùng một thư mục, tương tự một ổ mạng dùng chung. EFS tự co giãn và tính phí theo dung lượng dữ liệu thực tế lưu trữ; ứng dụng đọc ghi tệp theo cách thông thường qua NFS.", en: "Every server accesses the same folder, like a shared network drive. EFS scales automatically and charges for the data actually stored; applications read and write files the usual way over NFS." } });
    } else {
      add({ vi: "ĐỌC", en: "READ" }, "hit", { vi: `${okCount}/${alive.length} server truy xuất video qua **S3 API**.`, en: `${okCount}/${alive.length} servers retrieve the video through the **S3 API**.` });
      setResult({ ok: true, msg: azDown
        ? { vi: "S3 Standard lưu dữ liệu tại tối thiểu 3 AZ, không phụ thuộc vào instance hay AZ cụ thể. Video được giữ nguyên.", en: "S3 Standard stores data across at least 3 AZs, independent of any particular instance or AZ. The video is intact." }
        : { vi: "Mọi server đọc cùng một object. S3 Standard lưu dữ liệu tại tối thiểu 3 AZ và tính phí theo dung lượng sử dụng, nhưng ứng dụng phải gọi API thay vì đọc tệp như trên ổ đĩa.", en: "Every server reads the same object. S3 Standard stores data across at least 3 AZs and charges for the storage used, but the application must call an API instead of reading files as on a disk." } });
    }
    setBusy(false);
  }

  const st = STORES.find((s) => s.id === store)!;
  const ec2Node = (id: Ec2) => {
    const { x, az } = EC2[id];
    const down = azDown && az === "a";
    return (
      <g key={id} className={`stx-node ${down ? "down" : lit[id] ?? ""}`}>
        <rect x={x - 60} y={EY - 22} width={120} height={44} rx={8} />
        <text className="stx-t" x={x} y={EY - 3} textAnchor="middle">web-{id.slice(1)}</text>
        <text className="stx-s" x={x} y={EY + 13} textAnchor="middle">{down ? tr({ vi: "sự cố cùng AZ a", en: "down with AZ a" }) : `EC2 · AZ ${az}`}</text>
      </g>
    );
  };

  return (
    <div className="stage stx">
      <div className="stx-row" role="group" aria-label={tr({ vi: "Vị trí lưu video", en: "Where to store the video" })}>
        <span className="stx-lbl">{tr({ vi: "Lưu video tại", en: "Store video on" })}</span>
        {STORES.map((s) => (
          <button key={s.id} className="chip" aria-pressed={s.id === store} disabled={busy} onClick={() => { setStore(s.id); reset(); }}>{tr(s.name)}</button>
        ))}
      </div>
      <div className="stage-bar">
        <label className="stx-toggle">
          <input type="checkbox" checked={azDown} disabled={busy} onChange={(e) => { setAzDown(e.target.checked); reset(); }} />
          {tr({ vi: "AZ a mất nguồn điện", en: "AZ a loses power" })}
        </label>
        <button className="btn primary" onClick={run} disabled={busy}>{tr({ vi: "Người dùng tải lên video", en: "User uploads a video" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 10 820 250" role="img" aria-label={tr({ vi: "Ba web server tại hai AZ cùng cần đọc một video; video được lưu trên EBS, EFS hoặc S3", en: "Three web servers in two AZs all need to read one video; the video is stored on EBS, EFS or S3" })}>
          <rect className="stx-region" x={20} y={40} width={780} height={214} rx={12} />
          <text className="stx-m" x={32} y={57}>{tr({ vi: "Region Singapore · VPC của ShopViet", en: "Singapore Region · ShopViet VPC" })}</text>
          <rect className={`stx-az ${azDown ? "down" : ""}`} x={40} y={66} width={370} height={120} rx={10} />
          <text className="stx-m" x={52} y={82}>AZ a</text>
          <rect className="stx-az" x={430} y={66} width={350} height={120} rx={10} />
          <text className="stx-m" x={442} y={82}>AZ b</text>
          <text className="stx-m" x={azDown ? EC2.w3.x : EC2.w1.x} y={24} textAnchor="middle">{tr({ vi: "người dùng tải lên ↓", en: "user uploads ↓" })}</text>
          {(Object.keys(EC2) as Ec2[]).map(ec2Node)}
          {store === "ebs" ? (
            <g className={`stx-node ${lit.store ?? "on"}`}>
              <path className="stx-wire" d={`M130 ${EY + 22} V${SY - 22}`} />
              <rect x={EBS_BOX.x} y={SY - 22} width={EBS_BOX.w} height={44} rx={8} />
              <text className="stx-t" x={130} y={SY - 3} textAnchor="middle">{st.label}</text>
              <text className="stx-s" x={130} y={SY + 13} textAnchor="middle">{tr({ vi: "gắn vào web-1 · AZ a", en: "attached to web-1 · AZ a" })}</text>
            </g>
          ) : (
            <g className={`stx-node ${lit.store ?? "on"}`}>
              {(Object.keys(EC2) as Ec2[]).map((id) => <path key={id} className="stx-wire dash" d={`M${EC2[id].x} ${EY + 22} V${SY - 22}`} />)}
              {store === "efs" && [[90, 250, "a"], [560, 120, "b"]].map(([x, w, az]) => (
                <g key={az} opacity={azDown && az === "a" ? 0.35 : 1}><rect x={Number(x)} y={158} width={Number(w)} height={20} rx={5} /><text className="stx-s" x={Number(x) + Number(w) / 2} y={172} textAnchor="middle">mount target · AZ {az}</text></g>
              ))}
              <rect x={60} y={SY - 22} width={720} height={44} rx={8} />
              <text className="stx-t" x={420} y={SY - 3} textAnchor="middle">{st.label}</text>
              <text className="stx-s" x={420} y={SY + 13} textAnchor="middle">{tr(st.sub)}</text>
            </g>
          )}
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 && !result ? (
          <p className="stx-hint">{tr({ vi: <>Chọn vị trí lưu video, sau đó nhấn <b>Người dùng tải lên video</b>: video được ghi qua một server, sau đó cả ba server cùng truy cập. Bật <b>AZ a mất nguồn điện</b> để mô phỏng sự cố một AZ.</>, en: <>Choose where to store the video, then press <b>User uploads a video</b>: the video is written through one server, then all three servers access it. Turn on <b>AZ a loses power</b> to simulate an AZ failure.</> })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) => (
              <li key={i}><span className={`tag ${e.cls}`}>{tr(e.tag)}</span><span>{rich(tr(e.msg))}</span></li>
            ))}
            {result && <li className={`stx-result ${result.ok ? "ok" : "bad"}`}>{rich(tr(result.msg))}</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
