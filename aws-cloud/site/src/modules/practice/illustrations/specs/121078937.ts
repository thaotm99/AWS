// Practice test 3, question 13: an NLB with targets registered by instance ID routes to the primary private IP
// of the instance's primary network interface. Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const toNlb: StepSpec = {
  flow: ["players", "nlb"],
  badge: "TCP",
  caption: {
    vi: "Network Load Balancer hoạt động ở tầng 4 của mô hình OSI; khi nhận yêu cầu kết nối, nó chọn một target trong target group của rule mặc định.",
    en: "A Network Load Balancer works at layer 4 of the OSI model; when it receives a connection request, it selects a target from the target group for the default rule.",
  },
};
const privateIp: StepSpec = {
  flow: ["nlb", "ec2"],
  badge: { vi: "IP private chính", en: "primary private IP" },
  caption: {
    vi: "Khi target được chỉ định bằng instance ID, lưu lượng tới instance qua địa chỉ IP private chính của network interface chính; load balancer ghi lại địa chỉ IP đích trước khi chuyển tiếp.",
    en: "With targets specified by instance ID, traffic reaches the instance at the primary private IP address of its primary network interface; the load balancer rewrites the destination IP before forwarding.",
  },
};

const spec: IllustrationSpec = {
  questionId: 121078937,
  cols: 4.2,
  rows: 1.6,
  nodes: [
    { id: "players", label: { vi: "Người chơi", en: "Players" }, kind: "actor", at: [0, 0.4] },
    { id: "nlb", label: "Network LB", sub: { vi: "target: instance ID", en: "target: instance ID" }, at: [1.1, 0.4] },
    { id: "pub", label: "Public IP", kind: "ghost", at: [2.15, 0.4] },
    { id: "eip", label: "Elastic IP", kind: "ghost", at: [2.15, 0.4] },
    { id: "iid", label: "Instance ID", sub: { vi: "làm địa chỉ?", en: "as an address?" }, kind: "ghost", at: [2.15, 0.4] },
    { id: "ec2", label: "EC2 instance", sub: { vi: "ENI chính", en: "primary ENI" }, at: [3.2, 0.4] },
  ],
  zones: [{ id: "subnet", label: "Public subnet", tone: "vpc", from: [3.2, 0.4], to: [3.2, 0.4], pad: 10 }],
  scenarios: [
    {
      option: "a",
      hide: ["pub", "eip", "iid"],
      steps: [toNlb, privateIp],
      verdict: {
        works: true,
        caption: {
          vi: "Lưu lượng được định tuyến qua địa chỉ IP private chính.",
          en: "Traffic is routed using the primary private IP address.",
        },
      },
    },
    {
      option: "b",
      hide: ["eip", "iid"],
      steps: [
        toNlb,
        {
          stop: ["nlb", "pub"],
          caption: {
            vi: "Với target theo instance ID, lưu lượng đi qua địa chỉ IP private chính, nên không dùng địa chỉ IP public để định tuyến tới instance.",
            en: "With targets by instance ID, traffic uses the primary private IP address, so the public IP address is not used to route to the instance.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "NLB không định tuyến qua IP public.", en: "The NLB does not route through the public IP." } },
    },
    {
      option: "c",
      hide: ["pub", "iid"],
      steps: [
        toNlb,
        {
          stop: ["nlb", "eip"],
          caption: {
            vi: "Với target theo instance ID, lưu lượng đi qua địa chỉ IP private chính, nên không dùng địa chỉ Elastic IP để định tuyến tới instance.",
            en: "With targets by instance ID, traffic uses the primary private IP address, so the Elastic IP address is not used to route to the instance.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "NLB không định tuyến qua Elastic IP.", en: "The NLB does not route through the Elastic IP." } },
    },
    {
      option: "d",
      hide: ["pub", "eip"],
      steps: [
        toNlb,
        {
          stop: ["nlb", "iid"],
          caption: {
            vi: "Instance ID chỉ dùng để đăng ký target; không thể dùng instance ID để định tuyến lưu lượng tới instance.",
            en: "The instance ID only registers the target; you cannot use an instance ID to route traffic to the instance.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Instance ID không phải địa chỉ định tuyến.", en: "An instance ID is not a routing address." } },
    },
  ],
};

export default spec;
