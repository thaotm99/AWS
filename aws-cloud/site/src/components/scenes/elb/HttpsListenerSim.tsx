import { useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./elb-sims.css";

// MFTECH serves checkout.mftech.vn, www.mftech.vn and mftech.com.vn/{profile,search} over
// HTTPS from one ALB. The learner sets three independent things and sees every client's result:
// - certificates: one certificate, a wildcard *.mftech.vn (one subdomain level, not the apex,
//   not another domain), or a certificate list chosen by SNI (https-listener-certificates.html);
// - an HTTP :80 listener whose default rule redirects to HTTPS (rule-action-types.html);
// - the security policy: protocols and ciphers only. ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09
//   (console default) supports TLS 1.3 and 1.2; ELBSecurityPolicy-2016-08 (CLI/CloudFormation
//   default) supports TLS 1.2, 1.1 and 1.0, not 1.3 (describe-ssl-policies.html).

type Cert = "one" | "wild" | "sni";
type Policy = "res" | "old";
type Verdict = "ok" | "bad" | "warn";

const CERT_NAMES: Record<Cert, string[]> = {
  one: ["www.mftech.vn"],
  wild: ["*.mftech.vn"],
  sni: ["*.mftech.vn", "mftech.com.vn"],
};

// "*.d" covers exactly one extra label in front of d; it does not cover d itself.
const covers = (names: string[], host: string) =>
  names.some((n) => {
    if (!n.startsWith("*.")) return n === host;
    const base = n.slice(2);
    if (!host.endsWith("." + base)) return false;
    const label = host.slice(0, host.length - base.length - 1);
    return label.length > 0 && !label.includes(".");
  });

interface Client { url: string; host: string; who: Bi; tls: "1.3" | "1.0"; http?: boolean }

const CLIENTS: Client[] = [
  { url: "https://checkout.mftech.vn/", host: "checkout.mftech.vn", who: { vi: "Trình duyệt (TLS 1.3)", en: "Browser (TLS 1.3)" }, tls: "1.3" },
  { url: "https://www.mftech.vn/", host: "www.mftech.vn", who: { vi: "Trình duyệt (TLS 1.3)", en: "Browser (TLS 1.3)" }, tls: "1.3" },
  { url: "https://mftech.com.vn/profile", host: "mftech.com.vn", who: { vi: "Trình duyệt (TLS 1.3)", en: "Browser (TLS 1.3)" }, tls: "1.3" },
  { url: "https://mftech.com.vn/search", host: "mftech.com.vn", who: { vi: "Trình duyệt (TLS 1.3)", en: "Browser (TLS 1.3)" }, tls: "1.3" },
  { url: "http://www.mftech.vn/", host: "www.mftech.vn", who: { vi: "Người dùng gõ http://", en: "User types http://" }, tls: "1.3", http: true },
  { url: "https://checkout.mftech.vn/", host: "checkout.mftech.vn", who: { vi: "Máy POS cũ (chỉ TLS 1.0)", en: "Old POS terminal (TLS 1.0 only)" }, tls: "1.0" },
];

function judge(c: Client, cert: Cert, redirect: boolean, policy: Policy): { v: Verdict; label: Bi; why: Bi } {
  if (c.http && !redirect) {
    return { v: "warn", label: { vi: "HTTP, không mã hoá", en: "HTTP, unencrypted" },
      why: { vi: "Listener :80 chuyển tiếp request tới target group; trang được tải qua HTTP, dữ liệu không được mã hoá khi truyền. Cần default rule **redirect** sang HTTPS.", en: "The :80 listener forwards the request to the target group; the page loads over HTTP and data is not encrypted in transit. Add a default **redirect** rule to HTTPS." } };
  }
  const names = CERT_NAMES[cert];
  const prefix: Bi = c.http
    ? { vi: "Listener :80 trả về redirect 301 sang `https://www.mftech.vn/`. ", en: "The :80 listener returns a 301 redirect to `https://www.mftech.vn/`. " }
    : { vi: "", en: "" };
  if (policy === "res" && c.tls === "1.0") {
    return { v: "bad", label: { vi: "Handshake thất bại", en: "Handshake fails" },
      why: { vi: "Security policy `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` chỉ chấp nhận TLS 1.3 và TLS 1.2; thiết bị chỉ hỗ trợ TLS 1.0 không thương lượng được kết nối. Chứng chỉ không liên quan tới lỗi này.", en: "The `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09` security policy accepts only TLS 1.3 and TLS 1.2; a device that supports only TLS 1.0 cannot negotiate a connection. The certificate is not the cause." } };
  }
  if (!covers(names, c.host)) {
    const why: Bi = cert === "wild"
      ? { vi: `Wildcard \`*.mftech.vn\` chỉ bảo vệ một cấp subdomain của mftech.vn; \`${c.host}\` là tên miền khác nên trình duyệt báo lỗi chứng chỉ.`, en: `The wildcard \`*.mftech.vn\` protects only one subdomain level of mftech.vn; \`${c.host}\` is a different domain, so the browser shows a certificate error.` }
      : { vi: `Không chứng chỉ nào khớp \`${c.host}\`; ALB trả về default certificate \`www.mftech.vn\` và trình duyệt báo lỗi chứng chỉ.`, en: `No certificate matches \`${c.host}\`; the ALB presents the default certificate \`www.mftech.vn\` and the browser shows a certificate error.` };
    return { v: "bad", label: { vi: "Lỗi chứng chỉ", en: "Certificate error" }, why: { vi: prefix.vi + why.vi, en: prefix.en + why.en } };
  }
  const match = names.find((n) => covers([n], c.host))!;
  const proto = c.tls === "1.0" ? "TLS 1.0" : policy === "res" ? "TLS 1.3" : "TLS 1.2";
  const how: Bi = cert === "sni"
    ? { vi: `Client gửi \`${c.host}\` qua SNI; ALB chọn \`${match}\` trong certificate list.`, en: `The client sends \`${c.host}\` through SNI; the ALB picks \`${match}\` from the certificate list.` }
    : { vi: `Chứng chỉ \`${match}\` khớp \`${c.host}\`.`, en: `The certificate \`${match}\` matches \`${c.host}\`.` };
  const tail: Bi = c.tls === "1.0"
    ? { vi: " Kết nối dùng TLS 1.0 do `ELBSecurityPolicy-2016-08` vẫn cho phép giao thức cũ này.", en: " The connection uses TLS 1.0 because `ELBSecurityPolicy-2016-08` still allows this old protocol." }
    : policy === "old"
      ? { vi: " `ELBSecurityPolicy-2016-08` không hỗ trợ TLS 1.3 nên kết nối dùng TLS 1.2.", en: " `ELBSecurityPolicy-2016-08` does not support TLS 1.3, so the connection uses TLS 1.2." }
      : { vi: "", en: "" };
  return { v: c.tls === "1.0" ? "warn" : "ok", label: { vi: `HTTPS · ${proto}`, en: `HTTPS · ${proto}` },
    why: { vi: prefix.vi + how.vi + tail.vi, en: prefix.en + how.en + tail.en } };
}

export default function HttpsListenerSim() {
  const L = useLang();
  const [cert, setCert] = useState<Cert>("one");
  const [redirect, setRedirect] = useState(false);
  const [policy, setPolicy] = useState<Policy>("res");
  const rows = CLIENTS.map((c) => ({ c, r: judge(c, cert, redirect, policy) }));
  const browsers = rows.filter((x) => x.c.tls === "1.3");
  const good = browsers.filter((x) => x.r.v === "ok").length;

  return (
    <div className="stage">
      <p className="m-0 px-3.5 pt-2.5 pb-0 text-step--1">{rich(L({ vi: "Yêu cầu: mọi URL của MFTECH chạy HTTPS trên **một** ALB, với cấu hình tối thiểu.", en: "Requirement: every MFTECH URL runs over HTTPS on **one** ALB, with minimal configuration." }))}</p>
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-0 pt-3" role="group" aria-label={L({ vi: "Chứng chỉ trên listener HTTPS", en: "Certificates on the HTTPS listener" })}>
        <span className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">{L({ vi: "Chứng chỉ", en: "Certificates" })}</span>
        <button className="chip" aria-pressed={cert === "one"} onClick={() => setCert("one")}>www.mftech.vn</button>
        <button className="chip" aria-pressed={cert === "wild"} onClick={() => setCert("wild")}>{L({ vi: "Wildcard *.mftech.vn", en: "Wildcard *.mftech.vn" })}</button>
        <button className="chip" aria-pressed={cert === "sni"} onClick={() => setCert("sni")}>{L({ vi: "Certificate list + SNI", en: "Certificate list + SNI" })}</button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-0 pt-2" role="group" aria-label={L({ vi: "Listener HTTP", en: "HTTP listener" })}>
        <span className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">Listener :80</span>
        <button className="chip" aria-pressed={!redirect} onClick={() => setRedirect(false)}>{L({ vi: "Forward tới target group", en: "Forward to target group" })}</button>
        <button className="chip" aria-pressed={redirect} onClick={() => setRedirect(true)}>{L({ vi: "Redirect HTTP → HTTPS", en: "Redirect HTTP → HTTPS" })}</button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 px-3.5 pb-0 pt-2" role="group" aria-label="Security policy">
        <span className="mr-1 text-[0.72rem] font-semibold tracking-[0.08em] text-muted uppercase">Security policy</span>
        <button className="chip" aria-pressed={policy === "res"} onClick={() => setPolicy("res")}>TLS13-1-2-Res-PQ-2025-09</button>
        <button className="chip" aria-pressed={policy === "old"} onClick={() => setPolicy("old")}>2016-08</button>
      </div>
      <ul className="m-0 grid list-none gap-1.5 px-3.5 py-3" aria-live="polite">
        {rows.map(({ c, r }, i) => (
          <li key={i} className={`elbx-result ${r.v}`}>
            <span className="grid min-w-0 gap-0.5"><code className="text-[0.75rem] wrap-anywhere">{c.url}</code><span className="text-[0.75rem] text-muted">{L(c.who)}</span></span>
            <span className="elbx-verdict">{L(r.label)}</span>
            <span className="min-w-0 wrap-anywhere max-sm:col-span-full">{rich(L(r.why))}</span>
          </li>
        ))}
      </ul>
      <p className="px-3.5 pt-0 pb-3 text-step--1 font-semibold">
        {L({ vi: `Trình duyệt truy cập được qua HTTPS hợp lệ: ${good}/${browsers.length} URL.`, en: `Browsers reach over valid HTTPS: ${good}/${browsers.length} URLs.` })}
        {good === browsers.length ? L({ vi: " Đạt yêu cầu.", en: " Requirement met." }) : ""}
      </p>
    </div>
  );
}
