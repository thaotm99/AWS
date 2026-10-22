import { useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./containers-sims.css";

// Where a ShopViet Kubernetes workload runs, checked against the requirements of each situation.
// Facts: eks/latest/userguide/eks-deployment-options.html (EKS in Regions, Outposts, Hybrid Nodes,
// EKS Anywhere customer-managed and air-gapped), eks-outposts.html (extended vs local clusters,
// control plane fully managed by AWS for both, local clusters for disconnects and data residency),
// hybrid-nodes-overview.html, anywhere.eks.amazonaws.com/docs/overview/faq/ (EKS Anywhere is not
// supported on EC2 instances, including Outposts).
// Source questions: exam1_q27, exam1_q11.

type Req = "onprem" | "awscp" | "offline" | "ownhw" | "nonodes";
type Opt = "region" | "outExt" | "outLocal" | "hybrid" | "anywhere";

const REQ: Record<Req, Bi> = {
  onprem: { vi: "Workload và dữ liệu nằm trong data center", en: "Workloads and data stay in the data center" },
  awscp: { vi: "AWS quản lý control plane (kể cả nâng cấp)", en: "AWS manages the control plane (including upgrades)" },
  offline: { vi: "Vẫn vận hành khi không có kết nối tới Region", en: "Keeps operating without a connection to the Region" },
  ownhw: { vi: "Dùng máy chủ sẵn có của doanh nghiệp", en: "Uses the company's existing servers" },
  nonodes: { vi: "Không có node hay máy chủ cần quản lý", en: "No nodes or servers to manage" },
};

const OPTS: { id: Opt; name: string; has: Record<Req, boolean>; note: Bi }[] = [
  { id: "region", name: "Amazon EKS (Region) + Fargate",
    has: { onprem: false, awscp: true, offline: false, ownhw: false, nonodes: true },
    note: { vi: "Control plane do AWS quản lý trong Region; với Fargate không có node cần vá lỗi hay mở rộng. Workload và dữ liệu nằm trên hạ tầng AWS, không nằm trong data center của doanh nghiệp, dù có Direct Connect.",
      en: "AWS manages the control plane in the Region; with Fargate there are no nodes to patch or scale. Workloads and data live on AWS infrastructure, not in the company's data center, even with Direct Connect." } },
  { id: "outExt", name: "Amazon EKS on Outposts · extended cluster",
    has: { onprem: false, awscp: true, offline: false, ownhw: false, nonodes: false },
    note: { vi: "Node chạy trên Outpost đặt trong data center, nhưng **control plane nằm ở Region**. Cần kết nối ổn định tới Region; khi mất kết nối, cách Kubernetes xử lý việc control plane và node mất liên lạc có thể gây gián đoạn ứng dụng.",
      en: "Nodes run on the Outpost in the data center, but **the control plane is in the Region**. It needs reliable connectivity to the Region; during a disconnect, the way Kubernetes handles the control plane losing contact with nodes can cause application downtime." } },
  { id: "outLocal", name: "Amazon EKS on Outposts · local cluster",
    has: { onprem: true, awscp: true, offline: true, ownhw: false, nonodes: false },
    note: { vi: "Cả control plane và node chạy trên Outpost trong data center; control plane vẫn do AWS quản lý và dùng cùng EKS API, console, công cụ như trên cloud. AWS khuyến nghị local cluster khi cần tiếp tục vận hành lúc mất kết nối tạm thời hoặc khi có **yêu cầu lưu trú dữ liệu** (data residency). Outposts là hạ tầng do AWS quản lý, không phải máy chủ sẵn có.",
      en: "Both the control plane and the nodes run on the Outpost in the data center; AWS still manages the control plane, with the same EKS API, console and tools as in the cloud. AWS recommends local clusters when operations must continue through temporary disconnects or when **data residency** mandates apply. Outposts is AWS-managed infrastructure, not the company's existing servers." } },
  { id: "hybrid", name: "Amazon EKS Hybrid Nodes",
    has: { onprem: false, awscp: true, offline: false, ownhw: true, nonodes: false },
    note: { vi: "Máy chủ vật lý hoặc máy ảo sẵn có của doanh nghiệp trở thành node của cluster EKS; **control plane nằm ở Region** do AWS quản lý. Cần kết nối ổn định tới Region; doanh nghiệp tự quản lý node. Phí tính theo vCPU của hybrid node theo giờ.",
      en: "The company's existing physical or virtual machines become nodes of an EKS cluster; **the control plane is in the Region**, managed by AWS. It needs reliable connectivity to the Region; the company manages the nodes. Billed per hour for the hybrid nodes' vCPU." } },
  { id: "anywhere", name: "Amazon EKS Anywhere",
    has: { onprem: true, awscp: false, offline: true, ownhw: true, nonodes: false },
    note: { vi: "Toàn bộ cluster chạy trên hạ tầng của doanh nghiệp (VMware vSphere, bare metal, Nutanix, Apache CloudStack, AWS Snow) và chạy được trong môi trường **air-gapped**. Đây là sản phẩm **do khách hàng quản lý**: doanh nghiệp chịu trách nhiệm vòng đời cluster (tạo, nâng cấp, mở rộng). EKS Anywhere không hỗ trợ chạy trên EC2 instance, kể cả EC2 trên Outposts.",
      en: "The whole cluster runs on the company's infrastructure (VMware vSphere, bare metal, Nutanix, Apache CloudStack, AWS Snow) and can run in **air-gapped** environments. It is a **customer-managed** product: the company is responsible for cluster lifecycle operations (create, upgrade, scale). EKS Anywhere is not supported on EC2 instances, including EC2 on Outposts." } },
];

const CASES: { name: Bi; story: Bi; needs: Req[]; fit: Opt }[] = [
  { name: { vi: "ShopViet Pay: dữ liệu phải ở lại", en: "ShopViet Pay: data must stay" },
    story: { vi: "Quy định ngành tài chính yêu cầu mọi workload và dữ liệu của ShopViet Pay nằm trong data center. Đội ngũ muốn AWS quản lý control plane, nâng cấp Kubernetes tự động và dùng CloudWatch, IAM.", en: "Financial regulation requires every ShopViet Pay workload and its data to stay in the data center. The team wants AWS to manage the control plane, automate Kubernetes upgrades, and use CloudWatch and IAM." },
    needs: ["onprem", "awscp"], fit: "outLocal" },
  { name: { vi: "Kho hàng không có internet", en: "Warehouse with no internet" },
    story: { vi: "Kho hàng tại khu công nghiệp có mạng nội bộ cách ly hoàn toàn (air-gapped) và sẵn cụm máy chủ VMware vSphere. Cần chạy Kubernetes ngay trên cụm này.", en: "A warehouse in an industrial park has a fully isolated (air-gapped) network and an existing VMware vSphere cluster. Kubernetes must run on that cluster." },
    needs: ["offline", "ownhw"], fit: "anywhere" },
  { name: { vi: "Tận dụng máy chủ cũ", en: "Reuse existing servers" },
    story: { vi: "Văn phòng có máy chủ còn khấu hao và đường Direct Connect ổn định. Đội ngũ muốn dùng các máy chủ này làm node nhưng không muốn vận hành control plane.", en: "The office has servers that are still being depreciated and a stable Direct Connect link. The team wants to use those servers as nodes without running the control plane." },
    needs: ["ownhw", "awscp"], fit: "hybrid" },
  { name: { vi: "Backend thanh toán, không quản lý hạ tầng", en: "Payment backend, no infrastructure" },
    story: { vi: "Backend xử lý giao dịch chạy lâu, cần nhiều CPU và bộ nhớ; không có yêu cầu đặt tại chỗ. Đội ngũ không muốn cấp phát hay vá lỗi máy ảo.", en: "A long-running transaction backend needs plenty of CPU and memory; there is no on-premises requirement. The team does not want to provision or patch virtual machines." },
    needs: ["nonodes", "awscp"], fit: "region" },
];

export default function EksPlacementSim() {
  const L = useLang();
  const [ci, setCi] = useState(0);
  const [sel, setSel] = useState<Opt | null>(null);
  const c = CASES[ci];
  const opt = OPTS.find((o) => o.id === (sel ?? c.fit))!;
  const meets = (o: (typeof OPTS)[number]) => c.needs.every((r) => o.has[r]);

  return (
    <div className="stage ctx">
      <div className="ctx-row" role="group" aria-label={L({ vi: "Tình huống", en: "Situation" })}>
        <span className="ctx-lbl">{L({ vi: "Tình huống", en: "Situation" })}</span>
        {CASES.map((x, i) => (
          <button key={x.name.en} className="chip" aria-pressed={i === ci} onClick={() => { setCi(i); setSel(null); }}>{L(x.name)}</button>
        ))}
      </div>
      <div className="ctx-row">
        <p className="ctx-hint" style={{ color: "var(--ink)" }}>{L(c.story)}</p>
      </div>
      <div className="ctx-row">
        <span className="ctx-lbl">{L({ vi: "Yêu cầu", en: "Requirements" })}</span>
        {c.needs.map((r) => <span key={r} className="ctx-need">{L(REQ[r])}</span>)}
      </div>
      <div className="ctx-opts" role="group" aria-label={L({ vi: "Phương án triển khai", en: "Deployment options" })}>
        {OPTS.map((o) => (
          <button key={o.id} className={`ctx-opt ${sel !== null && o.id === c.fit ? "fit" : ""}`} aria-pressed={sel === o.id} onClick={() => setSel(o.id)}>
            <span className="ctx-opt-name">{o.name}</span>
            <ul className="ctx-checks">
              {c.needs.map((r) => (
                <li key={r}>
                  <span className={`ctx-mark ${o.has[r] ? "y" : "n"}`} aria-hidden="true">{o.has[r] ? "✓" : "✗"}</span>
                  <span>{L(REQ[r])}{o.has[r] ? "" : L({ vi: " (không đáp ứng)", en: " (not met)" })}</span>
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
      <div className="readout ctx-detail" aria-live="polite">
        {sel === null ? (
          <p className="ctx-hint">{L({ vi: "Đọc yêu cầu của tình huống, sau đó chọn phương án đáp ứng mọi yêu cầu. Mỗi thẻ cho biết phương án đáp ứng yêu cầu nào.", en: "Read the situation's requirements, then pick the option that meets all of them. Each card shows which requirements the option meets." })}</p>
        ) : (
          <>
            <strong>{opt.name}<span className={`ctx-verdict ${meets(opt) ? "y" : "n"}`}>{meets(opt) ? L({ vi: "PHÙ HỢP", en: "FITS" }) : L({ vi: "CHƯA PHÙ HỢP", en: "DOES NOT FIT" })}</span></strong>
            <p>{rich(L(opt.note))}</p>
          </>
        )}
      </div>
    </div>
  );
}
