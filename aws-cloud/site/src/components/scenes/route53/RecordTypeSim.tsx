import { useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";

// MFTech needs one record per situation. Pick a situation, then try record
// types: the readout says what that type does and whether it fits. A, AAAA,
// CNAME, MX, NS and PTR as defined in "Supported DNS record types"; Alias as the
// Route 53 extension (only AWS resources or a record in the same hosted zone).

type T = "A" | "AAAA" | "CNAME" | "Alias" | "MX" | "NS" | "PTR";
const TYPES: T[] = ["A", "AAAA", "CNAME", "Alias", "MX", "NS", "PTR"];

const DEF: Record<T, Bi> = {
  A: { vi: "**A** định tuyến tên miền tới một **địa chỉ IPv4**.", en: "An **A** record routes a name to an **IPv4 address**." },
  AAAA: { vi: "**AAAA** định tuyến tên miền tới một **địa chỉ IPv6**.", en: "An **AAAA** record routes a name to an **IPv6 address**." },
  CNAME: { vi: "**CNAME** ánh xạ tên của record tới **một tên miền khác**; không tạo được tại zone apex.", en: "A **CNAME** record maps the record's name to **another domain name**; it cannot be created at the zone apex." },
  Alias: { vi: "**Alias** là phần mở rộng của Route 53, chỉ trỏ tới **tài nguyên AWS được hỗ trợ** (CloudFront, ELB, S3 website…) hoặc **record khác trong cùng hosted zone**.", en: "An **Alias** record is a Route 53 extension that points only to **supported AWS resources** (CloudFront, ELB, S3 website…) or **another record in the same hosted zone**." },
  MX: { vi: "**MX** chỉ định tên **mail server** và thứ tự ưu tiên giữa các mail server.", en: "An **MX** record specifies the names of **mail servers** and their priority order." },
  NS: { vi: "**NS** xác định **name server** của hosted zone; dùng để ủy quyền một subdomain cho hosted zone khác.", en: "An **NS** record identifies the **name servers** for the hosted zone; it is used to delegate a subdomain to another hosted zone." },
  PTR: { vi: "**PTR** ánh xạ **địa chỉ IP về tên miền** (tra cứu ngược).", en: "A **PTR** record maps an **IP address to a domain name** (reverse lookup)." },
};

interface Need {
  name: Bi;
  detail: Bi;
  answer: T;
  /** Why the right type fits, shown when it is picked. */
  ok: Bi;
  /** Extra text for a tempting wrong type in this situation. */
  why?: Partial<Record<T, Bi>>;
}

const NEEDS: Need[] = [
  {
    name: { vi: "www.mftech.vn → ứng dụng tại nhà cung cấp", en: "www.mftech.vn → app at a hosting provider" },
    detail: { vi: "Ứng dụng đặt tại `mftech.provider.com` (ngoài AWS); người dùng truy cập qua `www.mftech.vn`.", en: "The app runs at `mftech.provider.com` (outside AWS); users access it through `www.mftech.vn`." },
    answer: "CNAME",
    ok: { vi: "`www` là subdomain, đích là một tên miền bên ngoài AWS: CNAME `www.mftech.vn → mftech.provider.com`.", en: "`www` is a subdomain and the target is a domain name outside AWS: CNAME `www.mftech.vn → mftech.provider.com`." },
    why: {
      Alias: { vi: "`mftech.provider.com` không phải tài nguyên AWS và không thuộc hosted zone `mftech.vn`, nên không tạo được Alias.", en: "`mftech.provider.com` is not an AWS resource and is not in the `mftech.vn` hosted zone, so an Alias cannot be created." },
      A: { vi: "Record A chứa địa chỉ IP, không ánh xạ được tới một tên miền khác; IP của nhà cung cấp có thể thay đổi.", en: "An A record holds an IP address and cannot map to another domain name; the provider's IPs can change." },
      PTR: { vi: "PTR là chiều ngược lại (IP → tên), không ánh xạ tên này sang tên khác.", en: "PTR is the opposite direction (IP → name); it does not map one name to another." },
    },
  },
  {
    name: { vi: "mftech.vn → www.mftech.vn", en: "mftech.vn → www.mftech.vn" },
    detail: { vi: "Mọi truy cập vào tên miền chính (zone apex) phải đi theo `www.mftech.vn`, với chi phí thấp nhất.", en: "All traffic to the main domain (zone apex) must follow `www.mftech.vn`, at the lowest cost." },
    answer: "Alias",
    ok: { vi: "Alias tại zone apex trỏ tới record `www` trong cùng hosted zone; Route 53 trả lời trực tiếp bằng địa chỉ của `www`. Đây là loại record duy nhất trỏ được từ zone apex sang một tên khác.", en: "An Alias at the zone apex points to the `www` record in the same hosted zone; Route 53 answers directly with the addresses of `www`. It is the only record type that can point from the zone apex to another name." },
    why: {
      CNAME: { vi: "Giao thức DNS **không cho phép CNAME tại zone apex** (`mftech.vn`). Ở subdomain, một CNAME trỏ tới record khác trong Route 53 còn bị tính phí như hai truy vấn.", en: "The DNS protocol **does not allow a CNAME at the zone apex** (`mftech.vn`). On a subdomain, a CNAME that redirects to another Route 53 record is also charged as two queries." },
      MX: { vi: "MX chỉ phục vụ việc chuyển email, không định tuyến truy cập web.", en: "MX only directs email; it does not route web traffic." },
      NS: { vi: "NS chỉ xác định name server của hosted zone, không định tuyến truy cập web tới `www`.", en: "NS only identifies the hosted zone's name servers; it does not route web traffic to `www`." },
    },
  },
  {
    name: { vi: "legacy.mftech.vn → Elastic IP của EC2", en: "legacy.mftech.vn → an EC2 Elastic IP" },
    detail: { vi: "Hệ thống cũ chạy trên một EC2 instance với Elastic IP `203.0.113.10` (IPv4).", en: "A legacy system runs on one EC2 instance with Elastic IP `203.0.113.10` (IPv4)." },
    answer: "A",
    ok: { vi: "Đích là một địa chỉ IPv4 cố định: record A `legacy.mftech.vn → 203.0.113.10`.", en: "The target is a fixed IPv4 address: A record `legacy.mftech.vn → 203.0.113.10`." },
    why: {
      AAAA: { vi: "AAAA chứa địa chỉ IPv6, trong khi Elastic IP này là IPv4.", en: "AAAA holds an IPv6 address, while this Elastic IP is IPv4." },
      CNAME: { vi: "CNAME trỏ tới một tên miền, không chứa địa chỉ IP.", en: "A CNAME points to a domain name; it does not hold an IP address." },
    },
  },
  {
    name: { vi: "Email gửi tới @mftech.vn", en: "Email sent to @mftech.vn" },
    detail: { vi: "Hai mail server `mx1` và `mx2`; `mx2` chỉ nhận email khi `mx1` không khả dụng.", en: "Two mail servers, `mx1` and `mx2`; `mx2` receives email only when `mx1` is unavailable." },
    answer: "MX",
    ok: { vi: "MX với priority `10 mx1.mftech.vn` và `20 mx2.mftech.vn`: server có giá trị priority **thấp nhất** được ưu tiên; nếu hai giá trị bằng nhau, email được phân phối xấp xỉ đều.", en: "MX with priorities `10 mx1.mftech.vn` and `20 mx2.mftech.vn`: the server with the **lowest** priority value takes precedence; with equal values, email is routed approximately equally." },
    why: {
      A: { vi: "Record A cho biết IP của một host, nhưng không cho hệ thống email biết mail server nào nhận email của tên miền và theo thứ tự nào.", en: "An A record gives a host's IP, but it does not tell mail systems which mail servers accept the domain's email or in what order." },
    },
  },
  {
    name: { vi: "Ủy quyền dev.mftech.vn cho đội phát triển", en: "Delegate dev.mftech.vn to the dev team" },
    detail: { vi: "Đội phát triển tự quản lý mọi record của `dev.mftech.vn` trong một hosted zone riêng.", en: "The dev team manages every record under `dev.mftech.vn` in its own hosted zone." },
    answer: "NS",
    ok: { vi: "Tạo record NS `dev.mftech.vn` trong hosted zone `mftech.vn`, chứa name server của hosted zone mới: subdomain và các subdomain con được định tuyến theo hosted zone đó.", en: "Create an NS record `dev.mftech.vn` in the `mftech.vn` hosted zone with the new hosted zone's name servers: the subdomain and its subdomains are routed by that hosted zone." },
    why: {
      CNAME: { vi: "CNAME chỉ ánh xạ một tên tới tên khác; không chuyển quyền quản lý toàn bộ subdomain sang hosted zone khác.", en: "A CNAME only maps one name to another; it does not hand control of a whole subdomain to another hosted zone." },
    },
  },
  {
    name: { vi: "Tra cứu ngược IP của mail server", en: "Reverse lookup of the mail server's IP" },
    detail: { vi: "Hệ thống nhận email của đối tác tra cứu địa chỉ `192.0.2.25` để xác định tên `mx1.mftech.vn`.", en: "A partner's mail system looks up address `192.0.2.25` to find the name `mx1.mftech.vn`." },
    answer: "PTR",
    ok: { vi: "PTR ánh xạ địa chỉ IP về tên miền (reverse DNS), chiều ngược lại của record A.", en: "PTR maps an IP address to a domain name (reverse DNS), the opposite of an A record." },
    why: {
      A: { vi: "Record A là chiều xuôi (tên → IP), không trả lời truy vấn từ IP về tên.", en: "An A record is the forward direction (name → IP); it does not answer queries from an IP back to a name." },
    },
  },
];

export default function RecordTypeSim() {
  const L = useLang();
  const [n, setN] = useState(0);
  const [pick, setPick] = useState<T | null>(null);
  const need = NEEDS[n];
  const hit = pick === need.answer;
  return (
    <div className="stage">
      <div className="picker">
        <div className="picker-list" role="group" aria-label={L({ vi: "Tình huống", en: "Situation" })}>
          {NEEDS.map((x, i) => (
            <button key={i} className="picker-item" aria-pressed={i === n} onClick={() => { setN(i); setPick(null); }}>
              {L(x.name)}
            </button>
          ))}
        </div>
        <div className="picker-answer" aria-live="polite">
          <span className="label">{L({ vi: "Yêu cầu", en: "Requirement" })}</span>
          <p>{rich(L(need.detail))}</p>
          <span className="label">{L({ vi: "Loại record", en: "Record type" })}</span>
          <div className="mx-0 mt-1 mb-2.5 flex flex-wrap gap-1.5" role="group" aria-label={L({ vi: "Loại record", en: "Record type" })}>
            {TYPES.map((t) => (
              <button key={t} className="chip" aria-pressed={t === pick} onClick={() => setPick(t)}>{t}</button>
            ))}
          </div>
          {pick === null ? (
            <p className="text-muted">{L({ vi: "Chọn một loại record để kiểm tra.", en: "Pick a record type to check it." })}</p>
          ) : (
            <>
              <strong className={hit ? "verdict ok" : "verdict bad"}>
                {hit ? L({ vi: "Phù hợp", en: "Fits" }) : L({ vi: "Không phù hợp", en: "Does not fit" })}
              </strong>
              <p>{rich(L(DEF[pick]))}</p>
              <p>{rich(L(hit ? need.ok : need.why?.[pick] ?? { vi: `Yêu cầu này cần record ${need.answer}, không phải ${pick}.`, en: `This requirement needs a ${need.answer} record, not ${pick}.` }))}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
