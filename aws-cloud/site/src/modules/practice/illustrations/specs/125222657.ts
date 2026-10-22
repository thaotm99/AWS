// Practice test 1, question 2: ALB in front of an Auto Scaling group across AZs, with content-based routing.
// Captions follow the question's explanation. Additional sources:
// - NLB works at layer 4: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html
// - "Each load balancer node routes requests only to the healthy targets":
//   https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
// - Auto Scaling replaces an unhealthy instance to maintain desired capacity:
//   https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-health-checks.html
// - Elastic IP: static public IPv4, associated with an instance or network interface, remapped to mask a failure:
//   https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 125222657,
  cols: 4.2,
  rows: 3.3,
  nodes: [
    { id: "user", label: { vi: "Người dùng", en: "Users" }, sub: "HTTP/HTTPS", kind: "actor", at: [0, 1.2] },
    { id: "alb", label: "Application LB", sub: "Layer 7", at: [1.3, 1.2] },
    { id: "nlb", label: "Network LB", sub: "Layer 4", at: [1.3, 1.2] },
    { id: "asg", label: "Auto Scaling group", sub: { vi: "dùng để phân phối?", en: "as a distributor?" }, kind: "ghost", at: [1.3, 1.2] },
    { id: "eip", label: "Elastic IP", at: [2.1, 0.3] },
    { id: "pip", label: "Public IP", at: [2.1, 0.3] },
    { id: "ec2a", label: "EC2", sub: "instance", at: [3, 0.3] },
    { id: "ec2b", label: "EC2", sub: "instance", at: [3, 2.1] },
  ],
  zones: [
    { id: "group", label: "Auto Scaling group", tone: "group", from: [3, 0.3], to: [3, 2.1], pad: 20 },
    { id: "aza", label: "AZ a", tone: "az", from: [3, 0.3], to: [3, 0.3] },
    { id: "azb", label: "AZ b", tone: "az", from: [3, 2.1], to: [3, 2.1] },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["nlb", "asg", "eip", "pip"],
      steps: [
        {
          flow: ["user", "alb"],
          badge: "L7",
          caption: {
            vi: "ALB hoạt động ở cấp độ từng request (Layer 7) và định tuyến dựa trên nội dung của request, đáp ứng yêu cầu định tuyến theo nội dung.",
            en: "The ALB operates at the individual request level (Layer 7) and routes based on the content of the request, which meets the content-based routing requirement.",
          },
        },
        {
          flow: [["alb", "ec2a"], ["alb", "ec2b"]],
          times: 2,
          caption: {
            vi: "Lưu lượng được phân phối tới các EC2 instance trải trên nhiều Availability Zone, mang lại tính sẵn sàng cao cho toàn bộ kiến trúc.",
            en: "Traffic is distributed to EC2 instances spread across Availability Zones, which gives the architecture high availability.",
          },
        },
        {
          mark: "ec2a",
          tone: "bad",
          badge: "unhealthy",
          caption: {
            vi: "Một instance gặp sự cố và không vượt qua health check. Mỗi node của load balancer chỉ định tuyến request tới các target khoẻ mạnh.",
            en: "One instance fails its health checks. Each load balancer node routes requests only to the healthy targets.",
          },
        },
        {
          flow: ["alb", "ec2b"],
          times: 2,
          caption: {
            vi: "Request tiếp tục được phục vụ bởi instance khoẻ mạnh ở AZ còn lại.",
            en: "Requests keep being served by the healthy instance in the other AZ.",
          },
        },
        {
          mark: "ec2a",
          tone: "ok",
          badge: { vi: "mới", en: "new" },
          caption: {
            vi: "Auto Scaling group thay instance không khoẻ mạnh bằng một instance mới để duy trì desired capacity; sự cố của instance được che giấu khỏi người dùng.",
            en: "The Auto Scaling group replaces the unhealthy instance with a new one to maintain the desired capacity, masking the instance failure from users.",
          },
        },
      ],
      verdict: {
        works: true,
        caption: {
          vi: "ALB đáp ứng định tuyến theo nội dung; nhiều AZ cùng Auto Scaling group mang lại tính sẵn sàng cao.",
          en: "The ALB provides content-based routing; multiple AZs with an Auto Scaling group provide high availability.",
        },
      },
    },
    {
      option: "b",
      hide: ["alb", "asg", "eip", "pip"],
      steps: [
        {
          flow: ["user", "nlb"],
          badge: "L4",
          caption: {
            vi: "Network Load Balancer hoạt động ở tầng thứ tư (Layer 4) của mô hình OSI.",
            en: "A Network Load Balancer functions at the fourth layer (Layer 4) of the OSI model.",
          },
        },
        {
          flow: [["nlb", "ec2a"], ["nlb", "ec2b"]],
          tone: "warn",
          caption: {
            vi: "NLB vẫn phân phối được lưu lượng tới các instance ở nhiều AZ, nhưng không xét nội dung của request.",
            en: "The NLB still spreads traffic across instances in several AZs, but it does not look at request content.",
          },
        },
        {
          mark: "nlb",
          tone: "bad",
          badge: { vi: "không định tuyến theo nội dung", en: "no content-based routing" },
          caption: {
            vi: "Network Load Balancer không hỗ trợ định tuyến dựa trên nội dung, nên không đáp ứng yêu cầu.",
            en: "A Network Load Balancer cannot do content-based routing, so it does not meet the requirement.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Thiếu định tuyến theo nội dung.",
          en: "Content-based routing is missing.",
        },
      },
    },
    {
      option: "c",
      hide: ["alb", "nlb", "pip"],
      steps: [
        {
          stop: ["user", "asg"],
          caption: {
            vi: "Auto Scaling group không phân phối lưu lượng tới các EC2 instance. Để phân phối lưu lượng giữa các AZ, cần gắn một load balancer vào Auto Scaling group.",
            en: "An Auto Scaling group cannot distribute traffic to EC2 instances. To spread incoming traffic across AZs, a load balancer is attached to the group.",
          },
        },
        {
          flow: ["user", "eip", "ec2a"],
          tone: "warn",
          badge: "EIP",
          caption: {
            vi: "Elastic IP là địa chỉ IPv4 công khai, tĩnh, được liên kết với một instance hoặc network interface; lưu lượng chỉ đi tới instance đó.",
            en: "An Elastic IP is a static, public IPv4 address associated with an instance or a network interface; traffic reaches only that instance.",
          },
        },
        {
          mark: "ec2a",
          tone: "bad",
          caption: {
            vi: "Khi instance gặp sự cố, có thể ánh xạ lại Elastic IP sang instance khác để che giấu sự cố, nhưng đó không phải là phân phối lưu lượng và không có định tuyến theo nội dung.",
            en: "When the instance fails, the Elastic IP can be remapped to another instance to mask the failure, but that is not traffic distribution and gives no content-based routing.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Auto Scaling group không được dùng để phân phối lưu lượng.",
          en: "An Auto Scaling group cannot be used to distribute traffic.",
        },
      },
    },
    {
      option: "d",
      hide: ["alb", "nlb", "eip"],
      steps: [
        {
          stop: ["user", "asg"],
          caption: {
            vi: "Auto Scaling group không phân phối lưu lượng tới các EC2 instance; việc này cần một load balancer gắn với Auto Scaling group.",
            en: "An Auto Scaling group cannot distribute traffic to EC2 instances; that needs a load balancer attached to the group.",
          },
        },
        {
          flow: ["user", "pip", "ec2a"],
          tone: "warn",
          caption: {
            vi: "Public IP chỉ đưa lưu lượng tới instance được gán địa chỉ đó; không có thành phần nào phân phối lưu lượng hay định tuyến theo nội dung.",
            en: "A public IP only carries traffic to the instance it belongs to; nothing distributes traffic or routes by content.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Auto Scaling group không được dùng để phân phối lưu lượng.",
          en: "An Auto Scaling group cannot be used to distribute traffic.",
        },
      },
    },
  ],
};

export default spec;
