import { useState } from "react";
import { useLang, type Bi } from "../../../lib/lang";
import "./aws-map.css";

type Part = "kw" | "text" | "sim" | "take" | "foot";

const STEPS: { part: Part; title: Bi; sub: Bi; note: Bi }[] = [
  { part: "kw", title: { vi: "Từ khóa của phần", en: "Key terms" }, sub: { vi: "Đọc nghĩa trước khi vào bài", en: "Read the meanings first" },
    note: { vi: "Mỗi phần mở đầu bằng các thuật ngữ nó giới thiệu. Chọn một từ để xem định nghĩa theo tài liệu AWS, sau đó đánh dấu “Tôi đã hiểu từ này”; lựa chọn được ghi nhớ cho mọi bài.", en: "Each section opens with the terms it introduces. Pick one to read the AWS-documentation definition, then mark “I understand this term”; the choice carries over to every lesson." } },
  { part: "text", title: { vi: "Câu mở đầu và nội dung", en: "Opening and text" }, sub: { vi: "Vấn đề cần giải quyết", en: "The problem to solve" },
    note: { vi: "Câu đầu tiên nói phần này giải quyết vấn đề gì của ShopViet. Từ gạch chân chấm là thuật ngữ: chọn để xem lại nghĩa ngay tại chỗ.", en: "The first sentence says which ShopViet problem the section solves. Dotted words are terms: pick one to see its meaning in place." } },
  { part: "sim", title: { vi: "Mô phỏng", en: "Simulation" }, sub: { vi: "Thử, quan sát, rút ra kết luận", en: "Try, watch, conclude" },
    note: { vi: "Mỗi phần có một mô phỏng: đổi cấu hình, gửi request hoặc tạo sự cố để quan sát kết quả thay vì chỉ đọc mô tả.", en: "Each section has a simulation: change the configuration, send a request or cause a failure and watch what happens instead of only reading about it." } },
  { part: "take", title: { vi: "Ghi nhớ", en: "Key point" }, sub: { vi: "Kết luận cần mang theo", en: "What to take away" },
    note: { vi: "Khung “Ghi nhớ” cuối mỗi phần tóm tắt nguyên tắc rút ra từ mô phỏng.", en: "The “Key point” box at the end of each section sums up the rule the simulation showed." } },
  { part: "foot", title: { vi: "Hoàn thành và tra cứu", en: "Finish and look up" }, sub: { vi: "Kiểm tra, đánh dấu, Thuật ngữ", en: "Quiz, mark done, glossary" },
    note: { vi: "Cuối bài có bài tập và bộ câu hỏi kiểm tra. Đánh dấu hoàn thành để theo dõi tiến độ trên lộ trình; trang Thuật ngữ dùng để tra cứu bất cứ lúc nào.", en: "Each lesson ends with an exercise and a question set. Mark it done to track progress on the study path; the glossary page is there whenever you need to look something up." } },
];

/** Lesson 0, part 4: a guided tour of a lesson section, lighting up one part at a time. */
export default function SiteTour() {
  const L = useLang();
  const [i, setI] = useState(0);
  const lit = (p: Part) => (STEPS[i].part === p ? "lit" : undefined);
  return (
    <div className="am-stage">
      <div className="am-tour">
        <ol className="am-steps">
          {STEPS.map((s, k) => (
            <li key={s.part}>
              <button type="button" aria-pressed={k === i} onClick={() => setI(k)}>
                <em>{k + 1}</em>
                <span><b>{L(s.title)}</b><small>{L(s.sub)}</small></span>
              </button>
            </li>
          ))}
        </ol>
        <div className="am-mock focus" aria-hidden="true">
          <div className="am-mock-head">
            <small>{L({ vi: "PHẦN 2/9", en: "PART 2/9" })}</small>
            <b>{L({ vi: "Truy cập từ internet", en: "Access from the internet" })}</b>
          </div>
          <div className={`am-mock-kw ${lit("kw") ?? ""}`}>
            {["Internet gateway", "Security group", "Stateful"].map((k) => <span key={k}>{k}</span>)}
          </div>
          <p className={`am-mock-text ${lit("text") ?? ""}`}>
            {L({ vi: "Để request từ internet tới được web server, nó phải đi qua ", en: "To reach a web server, a request from the internet passes " })}
            <u>internet gateway</u>, <u>network ACL</u> {L({ vi: "và", en: "and the" })} <u>security group</u>.
          </p>
          <div className={`am-mock-sim ${lit("sim") ?? ""}`}>{L({ vi: "[ mô phỏng: gửi request, bật tắt điều kiện ]", en: "[ simulation: send requests, toggle conditions ]" })}</div>
          <div className={`am-mock-take ${lit("take") ?? ""}`}><b>{L({ vi: "Ghi nhớ:", en: "Key point:" })}</b> {L({ vi: "Security group là stateful.", en: "Security groups are stateful." })}</div>
          <div className={`am-mock-foot ${lit("foot") ?? ""}`}>
            <span>{L({ vi: "Đánh dấu hoàn thành", en: "Mark as done" })}</span>
            <span>{L({ vi: "Kiểm tra", en: "Quiz" })}</span>
            <span>{L({ vi: "Thuật ngữ", en: "Glossary" })}</span>
          </div>
        </div>
      </div>
      <p className="am-tour-note" key={i} aria-live="polite">{L(STEPS[i].note)}</p>
    </div>
  );
}
