import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { useLang, type Bi } from "../../../lib/lang";
import "./aws-map.css";

const C = { user: "var(--color-map-ink)", net: "var(--color-map-cyan)", cmp: "var(--color-map-amber)", db: "var(--color-map-blue)", int: "var(--color-map-pink)" };

const STEPS: { name: Bi; mono: string; group: Bi; c: string; text: Bi; lesson?: { id: string } & Bi }[] = [
  { name: { vi: "Khách hàng", en: "Customer" }, mono: "◉", group: { vi: "Người dùng", en: "User" }, c: C.user,
    text: { vi: "gửi request đặt hàng tới mftech.vn.", en: "sends an order request to mftech.vn." } },
  { name: { vi: "Route 53", en: "Route 53" }, mono: "53", group: { vi: "Mạng", en: "Networking" }, c: C.net,
    text: { vi: "phân giải tên miền mftech.vn thành địa chỉ của hệ thống.", en: "resolves mftech.vn to the system's address." },
    lesson: { id: "route53", vi: "Route 53", en: "Route 53" } },
  { name: { vi: "CloudFront", en: "CloudFront" }, mono: "CF", group: { vi: "Mạng", en: "Networking" }, c: C.net,
    text: { vi: "trả ảnh và trang tĩnh từ edge location gần khách, chuyển request đặt hàng tới origin.", en: "serves images and static pages from an edge location near the customer and forwards the order request to the origin." },
    lesson: { id: "cloudfront", vi: "CloudFront", en: "CloudFront" } },
  { name: { vi: "Load balancer", en: "Load balancer" }, mono: "LB", group: { vi: "Tính toán", en: "Compute" }, c: C.cmp,
    text: { vi: "định tuyến request tới một target healthy (EC2 instance đạt health check).", en: "routes the request to a healthy target (an EC2 instance that passes health checks)." },
    lesson: { id: "elb", vi: "Elastic Load Balancing", en: "Elastic Load Balancing" } },
  { name: { vi: "EC2", en: "EC2" }, mono: "EC2", group: { vi: "Tính toán", en: "Compute" }, c: C.cmp,
    text: { vi: "chạy ứng dụng MFTECH: kiểm tra tồn kho và tạo đơn.", en: "runs the MFTECH application: checks stock and creates the order." },
    lesson: { id: "ec2", vi: "EC2", en: "EC2" } },
  { name: { vi: "RDS", en: "RDS" }, mono: "DB", group: { vi: "Database", en: "Database" }, c: C.db,
    text: { vi: "lưu đơn hàng bền vững; AWS đảm nhận sao lưu và failover.", en: "stores the order durably; AWS handles backups and failover." },
    lesson: { id: "rds", vi: "RDS + Aurora", en: "RDS + Aurora" } },
  { name: { vi: "SQS", en: "SQS" }, mono: "Q", group: { vi: "Tích hợp", en: "Integration" }, c: C.int,
    text: { vi: "giữ message “có đơn mới” để các bước sau xử lý riêng, khách không phải chờ.", en: "holds a “new order” message so later steps run separately and the customer does not wait." },
    lesson: { id: "messaging", vi: "SQS + SNS", en: "SQS + SNS" } },
  { name: { vi: "Lambda", en: "Lambda" }, mono: "λ", group: { vi: "Tính toán", en: "Compute" }, c: C.cmp,
    text: { vi: "được kích hoạt khi có message mới và gửi email xác nhận; không có server nào chạy chờ.", en: "is invoked when the message arrives and sends the confirmation email; no server sits waiting." },
    lesson: { id: "lambda", vi: "Lambda", en: "Lambda" } },
];

// Snake layout: steps 0-3 left to right on top, 4-7 right to left below (percent of the track width).
const XS = [12.5, 37.5, 62.5, 87.5];
const TOP = 78, BOTTOM = 202;
const pos = (k: number) => (k < 4 ? { x: XS[k], y: TOP } : { x: XS[7 - k], y: BOTTOM });

/** Lesson 0, part 2: one order travels through seven services; plays on its own while in view. */
export default function OrderJourney() {
  const L = useLang();
  const [i, setI] = useState(0);
  const [play, setPlay] = useState(true);
  const [visible, setVisible] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) setPlay(false);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.4 });
    if (root.current) io.observe(root.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!play || !visible) return;
    const t = setInterval(() => setI((x) => (x + 1) % STEPS.length), 2600);
    return () => clearInterval(t);
  }, [play, visible]);

  const s = STEPS[i];
  const p = pos(i);
  const go = (k: number) => { setI((k + STEPS.length) % STEPS.length); setPlay(false); };
  const row1 = (Math.min(i, 3) / 3) * 75;
  const row2 = i >= 4 ? ((i - 4) / 3) * 75 : 0;

  return (
    <div className="am-stage" ref={root}>
      <p className="mx-0 mt-0 mb-3.5 text-[0.9rem] text-map-muted">{L({ vi: "Khách bấm “Đặt hàng” trên mftech.vn. Theo dõi đơn hàng đi qua từng dịch vụ.", en: "A customer clicks “Place order” on mftech.vn. Follow the order through each service." })}</p>
      <div className="relative h-[280px] rounded-[18px] border border-map-line-soft bg-map-panel/60 max-md:grid max-md:h-auto max-md:gap-2 max-md:p-3" role="img" aria-label={L({ vi: "Đơn hàng đi qua: khách hàng, Route 53, CloudFront, load balancer, EC2, RDS, SQS, Lambda", en: "The order passes through: customer, Route 53, CloudFront, load balancer, EC2, RDS, SQS, Lambda" })}>
        <span className="absolute rounded-[4px] bg-map-line max-md:hidden" style={{ left: "12.5%", width: "75%", top: TOP - 1, height: 2 }} />
        <span className="absolute rounded-[4px] bg-map-line max-md:hidden" style={{ left: "87.5%", width: 2, top: TOP, height: BOTTOM - TOP }} />
        <span className="absolute rounded-[4px] bg-map-line max-md:hidden" style={{ left: "12.5%", width: "75%", top: BOTTOM - 1, height: 2 }} />
        <span className="am-lit" style={{ left: "12.5%", width: `${row1}%`, top: TOP - 2, height: 4, background: "linear-gradient(90deg, var(--color-map-cyan), var(--color-map-amber))" }} />
        <span className="am-lit" style={{ left: "calc(87.5% - 1px)", width: 4, top: TOP, height: i >= 4 ? BOTTOM - TOP : 0, background: "var(--color-map-amber)" }} />
        <span className="am-lit" style={{ left: `${87.5 - row2}%`, width: `${row2}%`, top: BOTTOM - 2, height: 4, background: "linear-gradient(270deg, var(--color-map-amber), var(--color-map-pink))" }} />
        {STEPS.map((n, k) => {
          const q = pos(k);
          return (
            <div key={k} className={`am-node${k <= i ? " on" : ""}${k === i ? " cur" : ""}`} style={{ left: `${q.x}%`, top: q.y, ["--c" as string]: n.c }}>
              <div>
                <em>{n.mono}</em>
                <span className="flex min-w-0 flex-col leading-[1.2]"><b className="truncate text-[0.8rem]">{L(n.name)}</b><small className="text-[0.68rem] text-map-muted">{L(n.group)}</small></span>
              </div>
            </div>
          );
        })}
        <span className="am-packet" aria-hidden="true" style={{ left: `${p.x}%`, top: p.y - 44, boxShadow: `0 0 0 4px color-mix(in srgb, ${s.c} 40%, transparent), 0 0 24px 6px ${s.c}` }} />
      </div>
      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 max-md:grid-cols-1">
        <div className="flex animate-[am-in_.45s_ease_both] flex-col gap-1.5 rounded-[18px] border border-map-line bg-map-panel px-[18px] py-3.5" key={i} aria-live="polite">
          <small className="font-mono text-[0.72rem]" style={{ color: s.c }}>0{i + 1} / 08 · {L(s.group)}</small>
          <p className="m-0 max-w-none text-[1rem] leading-[1.5]"><b>{L(s.name)}</b> {L(s.text)}</p>
          {s.lesson && <a className="text-[0.85rem] font-semibold text-map-cyan no-underline" href={`/concepts/${s.lesson.id}/`}>{L({ vi: "Học kỹ ở bài", en: "Covered in" })} {L(s.lesson)} →</a>}
        </div>
        <div className="flex gap-2">
          <button type="button" className="am-btn w-12 px-0" aria-label={L({ vi: "Bước trước", en: "Previous step" })} onClick={() => go(i - 1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" className="am-btn primary w-12 px-0" aria-label={play ? L({ vi: "Tạm dừng", en: "Pause" }) : L({ vi: "Tự chạy", en: "Play" })} aria-pressed={play} onClick={() => setPlay(!play)}>
            {play
              ? <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10M11 3v10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
              : <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3l8 5-8 5z" fill="currentColor" /></svg>}
          </button>
          <button type="button" className="am-btn w-12 px-0" aria-label={L({ vi: "Bước tiếp", en: "Next step" })} onClick={() => go(i + 1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
