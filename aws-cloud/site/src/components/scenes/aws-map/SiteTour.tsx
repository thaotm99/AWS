import { useState } from "react";
import { useLang, type Bi } from "../../../lib/lang";
import "./aws-map.css";

type Part = "kw" | "text" | "sim" | "take" | "foot";

const STEPS: { part: Part; title: Bi; sub: Bi; note: Bi }[] = [
  { part: "kw", title: { vi: "Từ khóa của phần", en: "Key terms" }, sub: { vi: "Đọc nghĩa trước khi vào bài", en: "Read the meanings first" },
    note: { vi: "Mỗi phần mở đầu bằng các thuật ngữ nó giới thiệu. Chọn một từ để xem định nghĩa theo tài liệu AWS, sau đó đánh dấu “Tôi đã hiểu từ này”; lựa chọn được ghi nhớ cho mọi bài.", en: "Each section opens with the terms it introduces. Pick one to read the AWS-documentation definition, then mark “I understand this term”; the choice carries over to every lesson." } },
  { part: "text", title: { vi: "Câu mở đầu và nội dung", en: "Opening and text" }, sub: { vi: "Vấn đề cần giải quyết", en: "The problem to solve" },
    note: { vi: "Câu đầu tiên nói phần này giải quyết vấn đề gì của MFTech. Từ gạch chân chấm là thuật ngữ: chọn để xem lại nghĩa ngay tại chỗ.", en: "The first sentence says which MFTech problem the section solves. Dotted words are terms: pick one to see its meaning in place." } },
  { part: "sim", title: { vi: "Mô phỏng", en: "Simulation" }, sub: { vi: "Thử, quan sát, rút ra kết luận", en: "Try, watch, conclude" },
    note: { vi: "Mỗi phần có một mô phỏng: đổi cấu hình, gửi request hoặc tạo sự cố để quan sát kết quả thay vì chỉ đọc mô tả.", en: "Each section has a simulation: change the configuration, send a request or cause a failure and watch what happens instead of only reading about it." } },
  { part: "take", title: { vi: "Ghi nhớ", en: "Key point" }, sub: { vi: "Kết luận cần mang theo", en: "What to take away" },
    note: { vi: "Khung “Ghi nhớ” cuối mỗi phần tóm tắt nguyên tắc rút ra từ mô phỏng.", en: "The “Key point” box at the end of each section sums up the rule the simulation showed." } },
  { part: "foot", title: { vi: "Hoàn thành và tra cứu", en: "Finish and look up" }, sub: { vi: "Kiểm tra, đánh dấu, Thuật ngữ", en: "Quiz, mark done, glossary" },
    note: { vi: "Cuối bài có bài tập và bộ câu hỏi kiểm tra. Đánh dấu hoàn thành để theo dõi tiến độ trên lộ trình; trang Thuật ngữ dùng để tra cứu bất cứ lúc nào.", en: "Each lesson ends with an exercise and a question set. Mark it done to track progress on the study path; the glossary page is there whenever you need to look something up." } },
];

// Dotted term underline and the footer buttons of the mock section.
const U = "font-semibold text-map-amber underline decoration-dotted underline-offset-3";
const FOOT = "rounded-[12px] border border-map-line bg-map-panel px-2.5 py-[5px] text-[0.72rem] font-semibold";

/** Lesson 0, part 4: a guided tour of a lesson section, lighting up one part at a time. */
export default function SiteTour() {
  const L = useLang();
  const [i, setI] = useState(0);
  const lit = (p: Part) => (STEPS[i].part === p ? "lit" : undefined);
  return (
    <div className="am-stage">
      <div className="grid grid-cols-[minmax(200px,260px)_minmax(0,1fr)] gap-[18px] max-md:grid-cols-1">
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {STEPS.map((s, k) => (
            <li key={s.part}>
              <button type="button" className="am-step" aria-pressed={k === i} onClick={() => setI(k)}>
                <em>{k + 1}</em>
                <span className="flex flex-col gap-0.5 text-[0.84rem] leading-[1.4]"><b>{L(s.title)}</b><small className="text-map-muted">{L(s.sub)}</small></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="am-mock focus relative flex flex-col gap-2.5 rounded-[24px] border border-map-line bg-map-bg p-4 text-map-ink" aria-hidden="true">
          <div>
            <small className="font-mono text-[0.66rem] tracking-[.08em] text-map-cyan">{L({ vi: "PHẦN 2/9", en: "PART 2/9" })}</small>
            <b className="block text-[0.95rem]">{L({ vi: "Truy cập từ internet", en: "Access from the internet" })}</b>
          </div>
          <div className={`flex flex-wrap gap-[5px] border border-map-kw-line bg-map-kw px-2.5 py-2 ${lit("kw") ?? ""}`}>
            {["Internet gateway", "Security group", "Stateful"].map((k) => <span key={k} className="rounded-[99px] border border-map-kw-chip-line bg-map-kw-chip px-[9px] py-[3px] text-[0.72rem] font-semibold text-map-kw-ink">{k}</span>)}
          </div>
          <p className={`m-0 px-1.5 py-1 text-[0.8rem] leading-[1.55] ${lit("text") ?? ""}`}>
            {L({ vi: "Để request từ internet tới được web server, nó phải đi qua ", en: "To reach a web server, a request from the internet passes " })}
            <u className={U}>internet gateway</u>, <u className={U}>network ACL</u> {L({ vi: "và", en: "and the" })} <u className={U}>security group</u>.
          </p>
          <div className={`grid h-16 place-items-center border border-dashed border-map-line bg-map-panel text-[0.72rem] text-map-muted ${lit("sim") ?? ""}`}>{L({ vi: "[ mô phỏng: gửi request, bật tắt điều kiện ]", en: "[ simulation: send requests, toggle conditions ]" })}</div>
          <div className={`border-l-[3px] border-map-cyan bg-map-glow px-2.5 py-2 text-[0.76rem] ${lit("take") ?? ""}`}><b className="text-map-cyan">{L({ vi: "Ghi nhớ:", en: "Key point:" })}</b> {L({ vi: "Security group là stateful.", en: "Security groups are stateful." })}</div>
          <div className={`flex gap-2 ${lit("foot") ?? ""}`}>
            <span className={FOOT}>{L({ vi: "Đánh dấu hoàn thành", en: "Mark as done" })}</span>
            <span className={FOOT}>{L({ vi: "Kiểm tra", en: "Quiz" })}</span>
            <span className={FOOT}>{L({ vi: "Thuật ngữ", en: "Glossary" })}</span>
          </div>
        </div>
      </div>
      <p className="mx-0 mt-3 mb-0 animate-[am-in_.4s_ease_both] text-[0.9rem] text-map-soft" key={i} aria-live="polite">{L(STEPS[i].note)}</p>
    </div>
  );
}
