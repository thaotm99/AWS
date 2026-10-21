import { useState } from "react";

// Requirement → service, as the six practice tests frame it.
const NEEDS = [
  { need: "Giao thức UDP hoặc TCP không phải HTTP (game, IoT, VoIP)", service: "Global Accelerator",
    why: "CloudFront chỉ phục vụ HTTP/HTTPS. Global Accelerator nhận cả TCP và UDP rồi đưa vào mạng AWS.",
    refs: ["exam1_q59", "exam3_q8", "exam5_q4"] },
  { need: "Cần IP tĩnh để khách hàng whitelist trên firewall", service: "Global Accelerator",
    why: "Global Accelerator cấp 2 IP tĩnh anycast đứng trước các ALB/NLB ở nhiều Region. IP của ALB thì thay đổi.",
    refs: ["exam4_q58", "exam3_q45"] },
  { need: "Failover nhanh sang Region khác, không chờ DNS cache", service: "Global Accelerator",
    why: "Global Accelerator tự chuyển traffic sang endpoint khỏe ở Region khác mà client không phải phân giải DNS lại.",
    refs: ["exam1_q59", "exam5_q55", "exam2_q22"] },
  { need: "API HTTPS ở một Region, khách khắp thế giới gọi bị chậm", service: "Global Accelerator",
    why: "Khách vào mạng AWS ở edge gần nhất thay vì đi đường dài trên internet công cộng tới Region.",
    refs: ["exam5_q30", "exam2_q7"] },
  { need: "Tăng tốc tải trang, ảnh, video cho người dùng ở xa", service: "CloudFront",
    why: "CloudFront cache nội dung tại edge location. Origin có thể là S3, ALB, hoặc server on-premises.",
    refs: ["exam1_q62", "exam6_q5", "exam6_q58"] },
  { need: "Upload file lớn vào S3 từ nhiều nơi trên thế giới", service: "S3 Transfer Acceleration",
    why: "Dữ liệu đi vào edge location gần người upload rồi chạy trên mạng AWS tới bucket. Thường đi kèm multipart upload.",
    refs: ["exam1_q18", "exam3_q37", "exam6_q58"] },
];

export default function EdgePicker() {
  const [active, setActive] = useState(0);
  const item = NEEDS[active];
  return (
    <div className="stage">
      <div className="picker">
        <div className="picker-list" role="group" aria-label="Chọn yêu cầu trong đề">
          {NEEDS.map((n, i) => (
            <button key={i} className="picker-item" aria-pressed={i === active} onClick={() => setActive(i)}>
              {n.need}
            </button>
          ))}
        </div>
        <div className="picker-answer" aria-live="polite">
          <span className="label">Đề chọn</span>
          <strong className="picker-service">{item.service}</strong>
          <p>{item.why}</p>
          <p className="exam-refs"><span>Đề hỏi ở</span>{item.refs.map((r) => <code key={r}>{r}</code>)}</p>
        </div>
      </div>
    </div>
  );
}
