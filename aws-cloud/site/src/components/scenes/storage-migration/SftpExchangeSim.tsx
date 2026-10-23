import { useRef, useState } from "react";
import { flashText, travel, type Pt } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./migration-sims.css";

// MFTech replaces its two self-managed SFTP servers on EC2 (Elastic IPs, Linux accounts,
// shared file system) with AWS Transfer Family. Pick the endpoint type, how source IPs are
// restricted and the storage behind the server, then let a supplier (allowed IP) and an
// unknown address try to connect.
// Facts (docs.aws.amazon.com/transfer/latest/userguide/):
// - create-server-in-vpc.html: VPC hosted endpoint, Access Internal (private IPs only) or
//   Internet Facing with Elastic IPs; security groups allow only listed source IPs; only SFTP
//   and FTPS on an internet-facing VPC endpoint.
// - create-server-sftp.html: "Public endpoints cannot restrict traffic via security groups."
// - configure-storage.html: storage is Amazon S3 or Amazon EFS; EFS users get a POSIX profile
//   (user ID, group ID, secondary group IDs) checked against file ownership.
// - waf-chapter.html: AWS WAF inspects HTTP(S) requests for CloudFront, API Gateway, ALB, AppSync…

type EpId = "public" | "internal" | "internet";
type FilterId = "sg" | "waf" | "none";
type StoreId = "efs" | "s3" | "lustre";

const EPS: Record<EpId, { name: Bi; sub: Bi }> = {
  public: { name: { vi: "Public", en: "Public" }, sub: { vi: "endpoint công khai", en: "publicly accessible" } },
  internal: { name: { vi: "VPC · Internal", en: "VPC · Internal" }, sub: { vi: "chỉ private IP", en: "private IPs only" } },
  internet: { name: { vi: "VPC · Internet-facing", en: "VPC · Internet-facing" }, sub: { vi: "Elastic IP cố định", en: "fixed Elastic IPs" } },
};
const FILTERS: Record<FilterId, Bi> = {
  sg: { vi: "Security group (IP nhà cung cấp)", en: "Security group (supplier IPs)" },
  waf: { vi: "AWS WAF IP set", en: "AWS WAF IP set" },
  none: { vi: "Không giới hạn", en: "No restriction" },
};
const STORES: Record<StoreId, { name: string; sub: Bi }> = {
  efs: { name: "Amazon EFS", sub: { vi: "POSIX UID/GID", en: "POSIX UID/GID" } },
  s3: { name: "Amazon S3", sub: { vi: "IAM role + session policy", en: "IAM role + session policy" } },
  lustre: { name: "FSx for Lustre", sub: { vi: "không hỗ trợ", en: "not supported" } },
};

const SUP: Pt = [170, 75];
const UNK: Pt = [170, 185];
const EP_X = 310;
const EP_W = 180;
const EP_MID: Pt = [EP_X, 130];
const ST_X = 600;
const ST_IN: Pt = [ST_X, 130];

type Verdict = "ok" | "warn" | "bad";
type Line = { tag: Bi; cls: string; msg: Bi };

function evaluate(ep: EpId, filter: FilterId, store: StoreId) {
  const lines: Line[] = [];
  let supReach = true;
  let unkReach = true;
  if (ep === "internal") {
    supReach = false;
    unkReach = false;
    lines.push({ tag: { vi: "ENDPOINT", en: "ENDPOINT" }, cls: "bad", msg: { vi: "Endpoint **Internal** chỉ nhận kết nối tới private IP trong VPC (hoặc qua VPN, Direct Connect). Nhà cung cấp kết nối từ Internet nên không tới được server.", en: "An **Internal** endpoint only accepts connections to its private IPs inside the VPC (or over VPN or Direct Connect). The supplier connects from the internet, so it cannot reach the server." } });
  } else if (ep === "public") {
    lines.push({ tag: { vi: "ENDPOINT", en: "ENDPOINT" }, cls: "bad", msg: { vi: "Endpoint **public** không gắn được security group, do đó không giới hạn được IP nguồn" + (filter === "sg" ? ": security group đã chọn không có tác dụng." : ".") + " Elastic IP cố định chỉ có ở endpoint đặt trong VPC.", en: "A **public** endpoint cannot use security groups, so it cannot restrict source IPs" + (filter === "sg" ? ": the selected security group has no effect." : ".") + " Fixed Elastic IPs are only available on an endpoint hosted in a VPC." } });
  } else {
    lines.push({ tag: { vi: "ENDPOINT", en: "ENDPOINT" }, cls: "hit", msg: { vi: "Endpoint **VPC, internet-facing**: gắn **Elastic IP** tại mỗi subnet, nhà cung cấp chỉ cần cho phép các địa chỉ cố định này trên firewall của họ. Loại endpoint này chỉ hỗ trợ SFTP và FTPS.", en: "**VPC hosted, internet-facing** endpoint: an **Elastic IP** in each subnet, so the supplier only allows these fixed addresses in its firewall. This endpoint type supports only SFTP and FTPS." } });
    if (filter === "sg") {
      unkReach = false;
      lines.push({ tag: { vi: "IP", en: "IP" }, cls: "hit", msg: { vi: "**Security group** của endpoint chỉ cho phép port 22 từ IP của nhà cung cấp; kết nối từ địa chỉ lạ bị từ chối.", en: "The endpoint's **security group** allows port 22 only from the supplier's IPs; connections from unknown addresses are refused." } });
    }
  }
  if (ep !== "internal" && filter === "waf") {
    lines.push({ tag: { vi: "IP", en: "IP" }, cls: "bad", msg: { vi: "**AWS WAF** kiểm tra request HTTP(S) tới CloudFront, ALB, API Gateway…; WAF không gắn được vào Transfer Family và không lọc lưu lượng SFTP.", en: "**AWS WAF** inspects HTTP(S) requests to CloudFront, ALB, API Gateway and similar resources; it cannot be attached to Transfer Family and does not filter SFTP traffic." } });
  } else if (ep !== "internal" && filter === "none") {
    lines.push({ tag: { vi: "IP", en: "IP" }, cls: "bad", msg: { vi: "Không có allow list: mọi địa chỉ trên Internet đều mở được kết nối tới server.", en: "No allow list: any address on the internet can open a connection to the server." } });
  }
  let store_: Verdict;
  if (store === "efs") {
    store_ = "ok";
    lines.push({ tag: { vi: "LƯU TRỮ", en: "STORAGE" }, cls: "hit", msg: { vi: "**EFS** là file system dùng chung như hiện tại. Mỗi user có **POSIX profile** (user ID, group ID, secondary group ID); EFS so khớp các ID này với quyền sở hữu tệp, giữ nguyên mô hình phân quyền theo tệp của tài khoản Linux. IAM role của user quyết định quyền truy cập file system.", en: "**EFS** is a shared file system, as today. Each user has a **POSIX profile** (user ID, group ID, secondary group IDs); EFS checks these IDs against file ownership, keeping the file-level permission model of the Linux accounts. The user's IAM role controls access to the file system." } });
  } else if (store === "s3") {
    store_ = "warn";
    lines.push({ tag: { vi: "LƯU TRỮ", en: "STORAGE" }, cls: "miss", msg: { vi: "**S3** được hỗ trợ, nhưng quyền của từng user do **IAM role** và **session policy** quyết định (theo bucket và prefix), không theo UID/GID. Các tài khoản Linux và quyền theo tệp hiện có phải thiết kế lại.", en: "**S3** is supported, but each user's permissions come from an **IAM role** and a **session policy** (by bucket and prefix), not from UID/GID. The existing Linux accounts and file-level permissions have to be redesigned." } });
  } else {
    store_ = "bad";
    lines.push({ tag: { vi: "LƯU TRỮ", en: "STORAGE" }, cls: "bad", msg: { vi: "Transfer Family chỉ lưu dữ liệu vào **Amazon S3** hoặc **Amazon EFS**. FSx for Lustre, FSx khác và Storage Gateway không phải lựa chọn storage của server.", en: "Transfer Family stores data only in **Amazon S3** or **Amazon EFS**. FSx for Lustre, other FSx file systems and Storage Gateway are not storage options for the server." } });
  }
  const ok = ep === "internet" && filter === "sg" && store === "efs";
  return { supReach, unkReach, store: store_, ok, lines };
}

export default function SftpExchangeSim() {
  const tr = useLang();
  const pk = useRef<SVGGElement>(null);
  const [ep, setEp] = useState<EpId>("public");
  const [filter, setFilter] = useState<FilterId>("sg");
  const [store, setStore] = useState<StoreId>("s3");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<ReturnType<typeof evaluate> | null>(null);

  const pick = <T,>(set: (v: T) => void) => (v: T) => { set(v); setRes(null); };

  async function run() {
    const L = pk.current;
    if (!L || busy) return;
    setBusy(true);
    setRes(null);
    try {
      const r = evaluate(ep, filter, store);
      const go = async (from: Pt, reach: boolean, cls: string) => {
        await travel(L, [from, EP_MID], 700, cls);
        if (!reach) {
          flashText(L, EP_X - 30, from[1] < 130 ? 100 : 170, tr({ vi: "bị chặn", en: "blocked" }), "mgx-flash-edge", 900);
          return;
        }
        await travel(L, [EP_MID, ST_IN], 700, cls);
        if (r.store === "bad") flashText(L, ST_X + 80, 100, tr({ vi: "không hỗ trợ", en: "not supported" }), "mgx-flash-edge", 900);
      };
      await Promise.all([go(SUP, r.supReach, "pkt"), go(UNK, r.unkReach, "pkt-bad")]);
      setRes(r);
    } finally {
      setBusy(false);
    }
  }

  const epCls = !res ? "on" : res.ok || (ep === "internet" && filter === "sg") ? "ok" : "bad";
  const stCls = !res ? "" : res.store;
  const supCls = !res ? "" : res.supReach ? "ok" : "bad";
  const unkCls = !res ? "" : res.unkReach ? "bad" : "ok";
  const filterLabel = ep === "internal" ? "" : filter === "sg" ? (ep === "public" ? tr({ vi: "SG: không áp dụng", en: "SG: not applicable" }) : "Security group") : filter === "waf" ? tr({ vi: "WAF: không áp dụng", en: "WAF: not applicable" }) : tr({ vi: "không lọc IP", en: "no IP filter" });

  return (
    <div className="stage">
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-0 pt-3">
        <span className="mr-1 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">{tr({ vi: "Yêu cầu", en: "Requirements" })}</span>
        <span className="rounded-[10px] border border-line bg-bg px-2 py-[3px] text-[0.8125rem] wrap-anywhere">{tr({ vi: "dịch vụ được quản lý", en: "managed service" })}</span>
        <span className="rounded-[10px] border border-line bg-bg px-2 py-[3px] text-[0.8125rem] wrap-anywhere">{tr({ vi: "chỉ IP nhà cung cấp", en: "supplier IPs only" })}</span>
        <span className="rounded-[10px] border border-line bg-bg px-2 py-[3px] text-[0.8125rem] wrap-anywhere">{tr({ vi: "IP cố định cho firewall đối tác", en: "fixed IPs for the partner firewall" })}</span>
        <span className="rounded-[10px] border border-line bg-bg px-2 py-[3px] text-[0.8125rem] wrap-anywhere">{tr({ vi: "giữ quyền theo tệp (UID/GID)", en: "keep file-level permissions (UID/GID)" })}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-0 pt-2" role="group" aria-label={tr({ vi: "Loại endpoint", en: "Endpoint type" })}>
        <span className="mr-1 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">Endpoint</span>
        {(Object.keys(EPS) as EpId[]).map((k) => (
          <button key={k} className="chip" aria-pressed={k === ep} disabled={busy} onClick={() => pick(setEp)(k)}>{tr(EPS[k].name)}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-0 pt-2" role="group" aria-label={tr({ vi: "Giới hạn IP nguồn", en: "Source IP restriction" })}>
        <span className="mr-1 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">{tr({ vi: "Giới hạn IP", en: "IP restriction" })}</span>
        {(Object.keys(FILTERS) as FilterId[]).map((k) => (
          <button key={k} className="chip" aria-pressed={k === filter} disabled={busy} onClick={() => pick(setFilter)(k)}>{tr(FILTERS[k])}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-0 pt-2" role="group" aria-label={tr({ vi: "Lưu trữ phía sau server", en: "Storage behind the server" })}>
        <span className="mr-1 text-[0.75rem] font-semibold tracking-[0.08em] text-muted uppercase">{tr({ vi: "Lưu trữ", en: "Storage" })}</span>
        {(Object.keys(STORES) as StoreId[]).map((k) => (
          <button key={k} className="chip" aria-pressed={k === store} disabled={busy} onClick={() => pick(setStore)(k)}>{STORES[k].name}</button>
        ))}
      </div>
      <div className="stage-bar mt-3 border-t border-line">
        <span className="m-0 text-step--1 text-muted">{tr({ vi: "Nhà cung cấp và một địa chỉ lạ cùng thử kết nối SFTP.", en: "The supplier and an unknown address both try to connect over SFTP." })}</span>
        <button className="btn primary ml-auto" onClick={run} disabled={busy}>{tr({ vi: "Thử kết nối", en: "Try to connect" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 20 800 220" role="img" aria-label={tr({ vi: `Nhà cung cấp và một địa chỉ lạ kết nối SFTP tới endpoint ${tr(EPS[ep].name)} của Transfer Family, lưu trữ ${STORES[store].name}`, en: `A supplier and an unknown address connect over SFTP to a ${tr(EPS[ep].name)} Transfer Family endpoint backed by ${STORES[store].name}` })}>
          <path className="mgx-wire" d={`M${SUP[0]} ${SUP[1]} L${EP_MID[0]} ${EP_MID[1]} M${UNK[0]} ${UNK[1]} L${EP_MID[0]} ${EP_MID[1]} M${EP_X + EP_W} ${EP_MID[1]} H${ST_X}`} />
          <g className={`mgx-node ${supCls}`}>
            <rect x={20} y={SUP[1] - 25} width={150} height={50} rx={8} />
            <text className="mgx-t" x={95} y={SUP[1] - 4} textAnchor="middle">{tr({ vi: "Nhà cung cấp", en: "Supplier" })}</text>
            <text className="mgx-m" x={95} y={SUP[1] + 13} textAnchor="middle">203.0.113.10</text>
          </g>
          <g className={`mgx-node ${unkCls}`}>
            <rect x={20} y={UNK[1] - 25} width={150} height={50} rx={8} />
            <text className="mgx-t" x={95} y={UNK[1] - 4} textAnchor="middle">{tr({ vi: "Địa chỉ lạ", en: "Unknown address" })}</text>
            <text className="mgx-m" x={95} y={UNK[1] + 13} textAnchor="middle">198.51.100.7</text>
          </g>
          <g className={`mgx-node ${epCls}`}>
            <rect x={EP_X} y={80} width={EP_W} height={100} rx={10} />
            <text className="mgx-t" x={EP_X + EP_W / 2} y={104} textAnchor="middle">Transfer Family SFTP</text>
            <text className="mgx-s" x={EP_X + EP_W / 2} y={124} textAnchor="middle">{tr(EPS[ep].name)}</text>
            <text className="mgx-s" x={EP_X + EP_W / 2} y={140} textAnchor="middle">{tr(EPS[ep].sub)}</text>
            <text className="mgx-m" x={EP_X + EP_W / 2} y={162} textAnchor="middle">{filterLabel}</text>
          </g>
          <g className={`mgx-node ${stCls}`}>
            <rect x={ST_X} y={95} width={180} height={70} rx={10} />
            <text className="mgx-t" x={ST_X + 90} y={124} textAnchor="middle">{STORES[store].name}</text>
            <text className="mgx-s" x={ST_X + 90} y={142} textAnchor="middle">{tr(STORES[store].sub)}</text>
          </g>
          <g ref={pk} />
        </svg>
      </div>
      <div className="readout" aria-live="polite">
        {!res ? (
          <p className="m-0 text-step--1 text-muted">{tr({ vi: <>Chọn loại endpoint, cách giới hạn IP và nơi lưu trữ, sau đó nhấn <b>Thử kết nối</b>.</>, en: <>Choose the endpoint type, the IP restriction and the storage, then press <b>Try to connect</b>.</> })}</p>
        ) : (
          <ul className="log">
            {res.lines.map((e, i) => (
              <li key={i}><span className={`tag ${e.cls}`}>{tr(e.tag)}</span><span>{rich(tr(e.msg))}</span></li>
            ))}
            <li className={`mgx-result ${res.ok ? "ok" : "bad"}`}>{rich(tr(res.ok
              ? { vi: "Đáp ứng mọi yêu cầu: **Transfer Family SFTP** với endpoint **VPC internet-facing** (Elastic IP + security group) và **EFS** với POSIX profile cho từng user. AWS vận hành server SFTP; MFTech không còn quản lý EC2.", en: "Meets every requirement: **Transfer Family SFTP** with a **VPC hosted, internet-facing** endpoint (Elastic IPs + security group) and **EFS** with a POSIX profile per user. AWS runs the SFTP servers; MFTech no longer manages EC2." }
              : { vi: "Chưa đáp ứng đủ yêu cầu. Xem các dòng màu đỏ hoặc cam ở trên.", en: "Not all requirements are met. See the red or orange lines above." }))}</li>
          </ul>
        )}
      </div>
    </div>
  );
}
