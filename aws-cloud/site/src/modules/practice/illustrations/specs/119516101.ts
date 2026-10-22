// Practice test 2, question 58: an API Gateway resource policy that denies every IP outside the allow list.
// Captions follow the question's explanation.
import type { Bilingual, IllustrationSpec, ScenarioSpec } from "../types";

const noSg = (option: string, caption: Bilingual): ScenarioSpec => ({
  option,
  hide: ["rp", "outp"],
  steps: [
    { mark: "sg", tone: "bad", badge: { vi: "không áp dụng", en: "not applicable" }, caption },
    {
      flow: ["ext", "api"],
      tone: "bad",
      caption: {
        vi: "Không có resource policy giới hạn IP, nên lưu lượng từ IP bên ngoài vẫn gọi được API.",
        en: "With no resource policy restricting IPs, traffic from external IPs can still invoke the API.",
      },
    },
  ],
  verdict: { works: false, caption: { vi: "API Gateway không dùng security group.", en: "API Gateway does not use security groups." } },
});

const spec: IllustrationSpec = {
  questionId: 119516101,
  cols: 4.4,
  rows: 2.8,
  nodes: [
    { id: "trusted", label: { vi: "Mạng nội bộ", en: "Internal network" }, sub: { vi: "IP tin cậy", en: "trusted IPs" }, kind: "onprem", at: [0, 0.1] },
    { id: "ext", label: { vi: "Client bên ngoài", en: "External client" }, kind: "actor", at: [0, 1.8] },
    { id: "rp", label: "Resource policy", sub: { vi: "deny trừ allow list", en: "deny unless allow-listed" }, at: [1.4, 0.1] },
    { id: "sg", label: "Security group", sub: { vi: "trên API Gateway?", en: "on API Gateway?" }, kind: "ghost", at: [1.4, 0.1] },
    { id: "api", label: "API Gateway", sub: "BI API", at: [2.4, 0.95] },
    { id: "outp", label: "AWS Outposts", sub: { vi: "máy chủ on-premises", en: "on-premises server" }, kind: "ghost", at: [2.4, 0.95] },
    { id: "be", label: { vi: "Dữ liệu phân tích", en: "Analytics data" }, kind: "data", at: [3.4, 0.95] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["sg", "outp"],
      steps: [
        {
          flow: ["trusted", "rp", "api", "be"],
          badge: "allow list",
          caption: {
            vi: "Resource policy là JSON policy kiểu IAM gắn trực tiếp vào API; điều kiện IpAddress/NotIpAddress cho phép request từ dải IP nội bộ tin cậy.",
            en: "A resource policy is an IAM-style JSON policy attached directly to the API; IpAddress/NotIpAddress conditions let requests from the trusted internal ranges through.",
          },
        },
        {
          stop: ["ext", "rp"],
          badge: "explicit deny",
          caption: {
            vi: "Mọi địa chỉ IP khác bị từ chối tường minh. Kiểm soát tập trung, khai báo, không phải thay đổi hạ tầng.",
            en: "Every other IP address is explicitly denied. Central, declarative control with no infrastructure changes.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Chỉ dải IP tin cậy gọi được API.", en: "Only trusted IP ranges can invoke the API." } },
    },
    noSg("b", {
      vi: "API Gateway là dịch vụ được quản lý hoàn toàn, không chạy trong subnet do người dùng tạo, nên không thể gắn nó với subnet hay security group; giới hạn IP phải làm bằng resource policy.",
      en: "API Gateway is fully managed and does not run in user-created subnets, so it cannot be associated with a subnet or a security group; IP restrictions belong in resource policies.",
    }),
    noSg("d", {
      vi: "API Gateway không dùng security group vì nó là dịch vụ được quản lý, mặc định không triển khai vào VPC; security group áp dụng cho tài nguyên như EC2, RDS hay Lambda trong VPC.",
      en: "API Gateway does not use security groups because it is a managed service not deployed into a VPC by default; security groups apply to resources such as EC2, RDS or Lambda in a VPC.",
    }),
    {
      option: "c",
      hide: ["rp", "sg", "api", "ext"],
      steps: [
        { flow: ["trusted", "outp"], tone: "warn", caption: { vi: "API được đưa về máy chủ on-premises qua AWS Outposts, lọc IP bằng firewall trên máy chủ.", en: "The API moves to an on-premises server through AWS Outposts, with host firewall rules filtering IPs." } },
        {
          mark: "outp",
          tone: "bad",
          badge: { vi: "đắt · phức tạp", en: "cost · complexity" },
          caption: {
            vi: "Không cần thiết và lệch với API Gateway — dịch vụ được quản lý trên cloud; chi phí và độ phức tạp vận hành tăng mạnh, cũng không dùng được resource policy.",
            en: "Unnecessary and misaligned with API Gateway as a managed cloud service; cost and operational complexity rise sharply and resource policies no longer apply.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phức tạp và tốn kém hơn nhiều.", en: "Far more complex and costly." } },
    },
  ],
};

export default spec;
