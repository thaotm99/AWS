// Practice test 6, question 25: AWS Site-to-Site VPN for a quick, low-cost, low-traffic link from a data center to AWS.
// Captions follow the question's explanation and its reference:
//   https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 130168959,
  cols: 4.45,
  rows: 1.7,
  nodes: [
    { id: "dc", label: { vi: "Data center", en: "Data center" }, sub: "customer gateway", kind: "onprem", at: [0, 0.4] },
    { id: "inet", label: "Internet", kind: "actor", at: [1.2, 0.4] },
    { id: "dx", label: "Direct Connect", sub: { vi: "kết nối chuyên dụng", en: "dedicated link" }, at: [1.2, 0.4] },
    { id: "vgw", label: "Virtual private GW", at: [2.3, 0.4] },
    { id: "igw", label: "Internet gateway", kind: "ghost", at: [2.3, 0.4] },
    { id: "app", label: { vi: "Ứng dụng", en: "Application" }, sub: "EC2", at: [3.4, 0.4] },
    { id: "bastion", label: "Bastion host", sub: "EC2", kind: "ghost", at: [3.4, 0.4] },
  ],
  zones: [{ id: "vpc", label: "VPC", tone: "vpc", from: [2.3, 0.4], to: [3.4, 0.4], pad: 20 }],
  scenarios: [
    {
      option: "c",
      hide: ["dx", "igw", "bastion"],
      steps: [
        {
          flow: ["dc", "inet", "vgw"],
          badge: { vi: "2 tunnel", en: "2 tunnels" },
          caption: {
            vi: "Site-to-Site VPN tạo hai VPN tunnel giữa customer gateway ở data center và virtual private gateway gắn với VPC, qua kết nối internet sẵn có.",
            en: "Site-to-Site VPN sets up two VPN tunnels between the customer gateway in the data center and the virtual private gateway attached to the VPC, over the existing internet link.",
          },
        },
        {
          flow: ["vgw", "app"],
          caption: {
            vi: "Sau khi cấu hình định tuyến qua kết nối VPN, lưu lượng ít ỏi từ data center tới được các instance trong VPC.",
            en: "With routing configured through the VPN connection, the small amount of traffic from the data center reaches the instances in the VPC.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "Kết nối bảo mật, dựng nhanh và tiết kiệm chi phí cho lưu lượng nhỏ.",
          en: "A secure link that is quick to set up and cost-effective for little traffic.",
        },
      },
    },
    {
      option: "b",
      hide: ["inet", "igw", "bastion"],
      steps: [
        {
          flow: ["dc", "dx", "vgw", "app"],
          tone: "warn",
          caption: {
            vi: "Direct Connect là kết nối mạng riêng, chuyên dụng cho các workload cần tốc độ cao hoặc độ trễ thấp hơn internet.",
            en: "Direct Connect is a private, dedicated network connection for workloads that need higher speed or lower latency than the internet.",
          },
        },
        {
          mark: "dx",
          tone: "bad",
          badge: { vi: "lâu", en: "slow setup" },
          caption: {
            vi: "Việc cấp phát kết nối Direct Connect mất nhiều thời gian, nên không đáp ứng yêu cầu dựng nhanh; băng thông cao cũng không cần thiết.",
            en: "Provisioning a Direct Connect connection takes a long time, so it misses the quick-turnaround requirement; the high bandwidth is not needed either.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không nhanh và không tiết kiệm nhất cho lưu lượng nhỏ.",
          en: "Neither quick nor the most cost-effective for little traffic.",
        },
      },
    },
    {
      option: "a",
      hide: ["dx", "vgw", "igw", "app"],
      steps: [
        {
          flow: ["dc", "inet"],
          tone: "warn",
          caption: {
            vi: "Bastion host là EC2 instance, thường ở public subnet, cho phép truy cập (ví dụ SSH) từ mạng bên ngoài vào mạng riêng.",
            en: "A bastion host is an EC2 instance, typically in a public subnet, that gives access (for example SSH) from an external network into a private network.",
          },
        },
        {
          stop: ["inet", "bastion"],
          caption: {
            vi: "Nó không thiết lập kết nối giữa mạng data center và AWS Cloud.",
            en: "It does not set up a connection between the data center network and AWS Cloud.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không phải kết nối giữa data center và AWS.",
          en: "Not a data-center-to-AWS connection.",
        },
      },
    },
    {
      option: "d",
      hide: ["dx", "vgw", "bastion"],
      steps: [
        {
          flow: ["dc", "inet"],
          tone: "warn",
          caption: {
            vi: "Lưu lượng từ data center đi ra internet công cộng.",
            en: "Traffic from the data center goes out to the public internet.",
          },
        },
        {
          stop: ["inet", "igw"],
          caption: {
            vi: "Internet gateway cho phép VPC giao tiếp với internet; nó không thể dùng để thiết lập kết nối giữa data center và AWS Cloud.",
            en: "An internet gateway lets a VPC communicate with the internet; it cannot be used to set up a connection between the data center and AWS Cloud.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không tạo được kết nối bảo mật tới data center.",
          en: "It does not create a secure link to the data center.",
        },
      },
    },
  ],
};

export default spec;
