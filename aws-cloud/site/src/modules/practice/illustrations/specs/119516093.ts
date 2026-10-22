// Practice test 2, question 21: a shared services VPC behind the Transit Gateway hub.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516093,
  cols: 4.4,
  rows: 2.3,
  nodes: [
    { id: "vpcA", label: "Workload VPC", sub: { vi: "tài khoản A", en: "account A" }, at: [0, 0] },
    { id: "vpcB", label: "Workload VPC", sub: { vi: "tài khoản B", en: "account B" }, at: [0, 1.3] },
    { id: "tgw", label: "Transit Gateway", sub: "hub", at: [1.3, 0.65] },
    { id: "transit", label: "Transit VPC", sub: { vi: "EC2 VPN tự quản lý", en: "self-managed EC2 VPN" }, kind: "ghost", at: [1.3, 0.65] },
    { id: "dx", label: "Direct Connect", sub: { vi: "đường truyền vật lý", en: "physical links" }, at: [1.3, 0.65] },
    { id: "shared", label: "Shared services VPC", sub: { vi: "endpoint · directory", en: "endpoints · directory" }, at: [2.4, 0.65] },
    { id: "svc", label: "AWS services", sub: { vi: "qua VPC endpoint", en: "via VPC endpoints" }, at: [3.4, 0.65] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["transit", "dx"],
      steps: [
        {
          flow: [["vpcA", "tgw", "shared"], ["vpcB", "tgw", "shared"]],
          badge: { vi: "dùng chung", en: "shared" },
          caption: {
            vi: "Các VPC workload đã nối hub-and-spoke qua Transit Gateway. Shared services VPC cung cấp các dịch vụ mà workload ở mọi VPC cần, như directory service hay VPC endpoint.",
            en: "The workload VPCs are already connected hub-and-spoke through the Transit Gateway. A shared services VPC provides what workloads in every VPC need, such as directory services or VPC endpoints.",
          },
        },
        {
          flow: ["shared", "svc"],
          caption: {
            vi: "Với VPC endpoint, lưu lượng tới dịch vụ AWS không rời mạng Amazon, giảm phí truyền dữ liệu ra internet; dùng chung từ một chỗ thay vì dựng ở từng VPC giảm cả chi phí lẫn công quản trị.",
            en: "With VPC endpoints, traffic to AWS services stays on the Amazon network, avoiding internet data transfer charges; sharing them centrally instead of in each VPC cuts both cost and administration.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Dựng một lần, mọi VPC cùng dùng.", en: "Built once, used by every VPC." } },
    },
    {
      option: "b",
      hide: ["tgw", "dx"],
      steps: [
        {
          flow: [["vpcA", "transit", "shared"], ["vpcB", "transit", "shared"]],
          tone: "warn",
          caption: {
            vi: "Transit VPC dùng EC2 VPN instance do khách hàng quản lý trong một VPC trung chuyển có internet gateway.",
            en: "A transit VPC uses customer-managed EC2 VPN instances in a dedicated transit VPC with an internet gateway.",
          },
        },
        {
          mark: "transit",
          tone: "bad",
          badge: { vi: "EC2 · license · phí", en: "EC2 · license · fees" },
          caption: {
            vi: "Phải triển khai, cấu hình, quản lý appliance VPN; tốn thêm chi phí EC2, có thể cả license bên thứ ba, và phí truyền dữ liệu khi đi qua transit VPC.",
            en: "The VPN appliances must be deployed, configured and managed, adding EC2 and possibly third-party licensing costs, plus data transfer charges through the transit VPC.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Tăng cả chi phí lẫn công quản trị.", en: "More cost and more administration." } },
    },
    {
      option: "c",
      hide: ["tgw", "transit", "dx"],
      steps: [
        {
          flow: [["vpcA", "vpcB"], ["vpcA", "shared"], ["vpcB", "shared"]],
          tone: "warn",
          badge: "full mesh",
          caption: {
            vi: "VPC peering full mesh: mỗi cặp VPC có một peering connection, nên mỗi VPC truy cập được tài nguyên của mọi VPC khác.",
            en: "Full-mesh VPC peering: every pair of VPCs gets a peering connection, so each VPC reaches the resources of all the others.",
          },
        },
        {
          mark: ["vpcA", "vpcB", "shared"],
          tone: "bad",
          badge: { vi: "route table", en: "route tables" },
          caption: {
            vi: "Mỗi peering connection đòi sửa route table của các VPC liên quan; số VPC càng tăng càng khó duy trì.",
            en: "Each peering connection needs route table changes in the other VPCs; this gets hard to maintain as the number of VPCs grows.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phức tạp khi số VPC tăng.", en: "Complex as VPCs grow." } },
    },
    {
      option: "d",
      hide: ["tgw", "transit"],
      steps: [
        {
          flow: [["vpcA", "dx", "shared"], ["vpcB", "dx", "shared"]],
          tone: "warn",
          caption: {
            vi: "Nối các VPC qua AWS Direct Connect hợp với nơi đã có sẵn Direct Connect hoặc cần nối nhiều VPC với on-premises.",
            en: "Connecting VPCs through AWS Direct Connect suits customers that already have Direct Connect or need many VPCs connected to on-premises.",
          },
        },
        {
          mark: "dx",
          tone: "bad",
          badge: { vi: "cáp vật lý", en: "physical cabling" },
          caption: {
            vi: "Direct Connect cần đường cáp vật lý và mất thời gian thiết lập, không phù hợp để chia sẻ dịch vụ giữa các VPC trong tình huống này.",
            en: "Direct Connect needs physical cabling and takes time to set up, which does not fit sharing services between VPCs here.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Không phải công cụ cho bài toán này.", en: "Not the tool for this problem." } },
    },
  ],
};

export default spec;
