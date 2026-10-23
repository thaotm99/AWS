import { useId, useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./vpc-sims.css";

// CIDR notation on MFTech's address plan: what range a block covers, whether it can be a VPC or
// subnet (/16 to /28, vpc-cidr-blocks.html, subnet-sizing.html), the five addresses AWS reserves in
// every subnet, and how a bucket policy reads IpAddress + NotIpAddress (both conditions are ANDed;
// AmazonS3/latest/userguide/amazon-s3-policy-keys.html, IAM condition logic).
// Source questions: exam4_q8.

const PRESETS: { ip: string; p: number; label: Bi }[] = [
  { ip: "10.0.0.0", p: 16, label: { vi: "VPC MFTech", en: "MFTech VPC" } },
  { ip: "10.0.1.0", p: 24, label: { vi: "Public subnet", en: "Public subnet" } },
  { ip: "192.0.2.0", p: 24, label: { vi: "Mạng kho đối tác", en: "Partner warehouse network" } },
  { ip: "192.0.2.188", p: 32, label: { vi: "Một máy kiosk", en: "One kiosk machine" } },
];

function parse(ip: string): number | null {
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some((x) => x > 255)) return null;
  return ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3];
}
const fmt = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const maskOf = (p: number) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
const inBlock = (ip: number, net: number, p: number) => ((ip & maskOf(p)) >>> 0) === net;

export default function CidrSim() {
  const L = useLang();
  const uid = useId().replace(/:/g, "");
  const [base, setBase] = useState("10.0.1.0");
  const [p, setP] = useState(24);
  const [test, setTest] = useState("10.0.1.25");

  const b = parse(base);
  const t = parse(test);
  const net = b === null ? null : (b & maskOf(p)) >>> 0;
  const size = 2 ** (32 - p);
  const last = net === null ? null : net + size - 1;
  const vpcOk = p >= 16 && p <= 28;

  // Bucket policy from AWS docs: IpAddress 192.0.2.0/24 AND NotIpAddress 192.0.2.188/32.
  const pNet = parse("192.0.2.0")!;
  const pOne = parse("192.0.2.188")!;
  const inRange = t !== null && inBlock(t, pNet, 24);
  const isOne = t !== null && t === pOne;

  const bits = b === null ? [] : Array.from({ length: 32 }, (_, i) => (b >>> (31 - i)) & 1);

  return (
    <div className="stage">
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3 pb-0" role="group" aria-label={L({ vi: "Khối địa chỉ mẫu", en: "Sample address blocks" })}>
        <span className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">{L({ vi: "Mẫu", en: "Presets" })}</span>
        {PRESETS.map((x) => (
          <button key={x.ip + x.p} className="chip" aria-pressed={base === x.ip && p === x.p} onClick={() => { setBase(x.ip); setP(x.p); }}>
            {L(x.label)} <code className="text-[0.75rem]">{x.ip}/{x.p}</code>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3 pb-0">
        <label className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase" htmlFor={`${uid}-base`}>{L({ vi: "Địa chỉ", en: "Address" })}</label>
        <input id={`${uid}-base`} className="w-[10.5rem] max-w-full rounded-[10px] border border-line bg-bg px-2 py-1 font-mono text-[0.875rem] text-ink" value={base} onChange={(e) => setBase(e.target.value)} spellCheck={false} inputMode="decimal" />
        <label className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase" htmlFor={`${uid}-p`}>{L({ vi: "Prefix", en: "Prefix" })} /{p}</label>
        <input id={`${uid}-p`} type="range" min={8} max={32} value={p} onChange={(e) => setP(Number(e.target.value))} />
      </div>

      {b === null ? (
        <div className="readout"><p className="m-0">{L({ vi: "Địa chỉ IPv4 không hợp lệ (dạng a.b.c.d, mỗi số 0–255).", en: "Invalid IPv4 address (format a.b.c.d, each number 0–255)." })}</p></div>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(32,minmax(0,1fr))] gap-0.5 px-3.5 pt-3.5 pb-1 text-center font-mono text-[0.7rem] max-sm:grid-cols-[repeat(16,minmax(0,1fr))] max-sm:gap-y-1.5 max-sm:px-2.5 max-sm:pt-3 max-sm:text-[0.72rem]" aria-label={L({ vi: `${p} bit đầu cố định, ${32 - p} bit sau thay đổi`, en: `The first ${p} bits are fixed, the last ${32 - p} bits vary` })} role="img">
            {bits.map((v, i) => (
              <span key={i} className={"rounded-[3px] py-[3px] " + (i < p ? "bg-accent-soft font-bold text-accent" : "border border-dashed border-line bg-bg text-muted") + (i % 8 === 7 && i < 31 ? " mr-1 max-sm:mr-[3px]" : "")}>{i < p ? v : "·"}</span>
            ))}
          </div>
          <div className="flex flex-wrap gap-3.5 px-3.5 pt-1 pb-0 text-step--1 text-muted">
            <span><i className="mr-1.5 inline-block size-2.5 rounded-[2px] bg-accent align-[-1px]" />{L({ vi: `${p} bit mạng (cố định)`, en: `${p} network bits (fixed)` })}</span>
            <span><i className="mr-1.5 inline-block size-2.5 rounded-[2px] border border-dashed border-muted align-[-1px]" />{L({ vi: `${32 - p} bit host → ${size.toLocaleString("en-US")} địa chỉ`, en: `${32 - p} host bits → ${size.toLocaleString("en-US")} ${size === 1 ? "address" : "addresses"}` })}</span>
          </div>
          <dl className="vpx-facts">
            <div><dt>{L({ vi: "Khối (dạng chuẩn)", en: "Block (canonical)" })}</dt><dd><code>{fmt(net!)}/{p}</code>{fmt(net!) !== base.trim() && <small> {L({ vi: `(AWS đổi ${base.trim()}/${p} về dạng này)`, en: `(AWS converts ${base.trim()}/${p} to this form)` })}</small>}</dd></div>
            <div><dt>{L({ vi: "Phạm vi", en: "Range" })}</dt><dd><code>{fmt(net!)}</code> – <code>{fmt(last!)}</code></dd></div>
            <div><dt>{L({ vi: "Làm VPC / subnet", en: "As a VPC / subnet" })}</dt><dd>
              {vpcOk
                ? rich(L({ vi: `Hợp lệ (cho phép từ /16 tới /28). Subnet này có **${(size - 5).toLocaleString("en-US")}** địa chỉ gán được cho tài nguyên.`, en: `Valid (allowed from /16 to /28). As a subnet it has **${(size - 5).toLocaleString("en-US")}** addresses you can assign to resources.` }))
                : rich(L({ vi: "Không hợp lệ: VPC và subnet chỉ nhận khối từ **/16** (65.536 địa chỉ) tới **/28** (16 địa chỉ). Khối này vẫn dùng được trong rule của security group, NACL hoặc policy.", en: "Not valid: a VPC or subnet accepts only blocks from **/16** (65,536 addresses) to **/28** (16 addresses). The block can still be used in security group, NACL or policy rules." }))}
            </dd></div>
          </dl>
          {vpcOk && (
            <ul className="mx-3.5 mt-2 mb-0 grid list-none gap-0.5 rounded-[12px] bg-bg px-2.5 py-2 text-step--1" aria-label={L({ vi: "Năm địa chỉ AWS giữ lại trong mỗi subnet", en: "Five addresses AWS reserves in every subnet" })}>
              {[
                [net!, { vi: "địa chỉ mạng", en: "network address" }],
                [net! + 1, { vi: "VPC router", en: "VPC router" }],
                [net! + 2, { vi: "DNS (Route 53 Resolver)", en: "DNS (Route 53 Resolver)" }],
                [net! + 3, { vi: "dự phòng cho tương lai", en: "reserved for future use" }],
                [last!, { vi: "broadcast (VPC không hỗ trợ broadcast)", en: "broadcast (VPC does not support broadcast)" }],
              ].map(([a, why]) => (
                <li key={String(a)} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-2"><code>{fmt(a as number)}</code> {L(why as Bi)}</li>
              ))}
            </ul>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pt-3 pb-0 mt-3 border-t border-line pb-3">
        <label className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase" htmlFor={`${uid}-test`}>{L({ vi: "IP nguồn cần kiểm tra", en: "Source IP to test" })}</label>
        <input id={`${uid}-test`} className="w-[10.5rem] max-w-full rounded-[10px] border border-line bg-bg px-2 py-1 font-mono text-[0.875rem] text-ink" value={test} onChange={(e) => setTest(e.target.value)} spellCheck={false} inputMode="decimal" />
        {["10.0.1.25", "192.0.2.10", "192.0.2.188", "198.51.100.7"].map((x) => (
          <button key={x} className="chip" aria-pressed={test === x} onClick={() => setTest(x)}><code className="text-[0.75rem]">{x}</code></button>
        ))}
      </div>
      <div className="readout" aria-live="polite">
        {t === null ? (
          <p className="m-0">{L({ vi: "Nhập một địa chỉ IPv4 hợp lệ.", en: "Enter a valid IPv4 address." })}</p>
        ) : (
          <>
            {net !== null && (
              <p className="m-0">
                <span className={"pill " + (inBlock(t, net, p) ? "ok" : "bad")}><i />{inBlock(t, net, p) ? L({ vi: "Thuộc khối", en: "Inside the block" }) : L({ vi: "Ngoài khối", en: "Outside the block" })}</span>{" "}
                <code>{fmt(t)}</code> {L({ vi: "so với", en: "vs" })} <code>{fmt(net)}/{p}</code>
              </p>
            )}
            <div className="mt-2.5 grid gap-1.5">
              <code className="block overflow-x-auto rounded-[10px] border border-line bg-bg px-2 py-1.5 text-[0.75rem] whitespace-pre">{`"Condition": {\n  "IpAddress":    { "aws:SourceIp": "192.0.2.0/24" },\n  "NotIpAddress": { "aws:SourceIp": "192.0.2.188/32" }\n}`}</code>
              <p className="m-0">
                <span className={"pill " + (inRange && !isOne ? "ok" : "bad")}><i />{inRange && !isOne ? L({ vi: "Được phép", en: "Allowed" }) : L({ vi: "Không được phép", en: "Not allowed" })}</span>{" "}
                {rich(L(
                  !inRange
                    ? { vi: `\`${fmt(t)}\` không thuộc \`192.0.2.0/24\` nên điều kiện \`IpAddress\` không khớp.`, en: `\`${fmt(t)}\` is not in \`192.0.2.0/24\`, so the \`IpAddress\` condition does not match.` }
                    : isOne
                      ? { vi: "Địa chỉ thuộc /24 nhưng chính là `192.0.2.188/32` (đúng một địa chỉ), nên `NotIpAddress` không khớp. Hai điều kiện được kết hợp bằng **AND**: toàn bộ dải /24 trừ một IP.", en: "The address is in the /24 but is exactly `192.0.2.188/32` (a single address), so `NotIpAddress` does not match. The two conditions are combined with **AND**: the whole /24 range except one IP." }
                      : { vi: "Thuộc `192.0.2.0/24` (256 địa chỉ) và khác `192.0.2.188`: cả hai điều kiện đều khớp.", en: "In `192.0.2.0/24` (256 addresses) and not `192.0.2.188`: both conditions match." },
                ))}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
