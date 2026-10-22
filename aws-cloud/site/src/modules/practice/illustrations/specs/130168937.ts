// Practice test 6, question 57: a single-instance monolith that recovers from an AZ failure: an Auto Scaling group
// (min = max = desired = 1) across two AZs, an Elastic IP attached by the user data script, and an instance role.
// Captions follow the question's explanation. Additional source:
// - An Elastic IP can be remapped to another instance to mask a failure:
//   https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
import type { Bilingual, IllustrationSpec, StepSpec } from "../types";

const recover = (focus: "asg" | "eip" | "role"): StepSpec[] => [
  {
    flow: ["users", "eip", "ec2a"],
    caption: {
      vi: "Ứng dụng monolith chạy trên đúng một web server, nhận lưu lượng qua Elastic IP.",
      en: "The monolith runs on exactly one web server and takes traffic through an Elastic IP.",
    },
  },
  {
    mark: "ec2a",
    tone: "bad",
    badge: { vi: "AZ hỏng", en: "AZ down" },
    caption: {
      vi: "AZ a gặp sự cố, instance mất.",
      en: "AZ a fails and the instance is lost.",
    },
  },
  {
    mark: "ec2b",
    tone: "ok",
    badge: focus === "asg" ? "desired = 1" : { vi: "mới", en: "new" },
    caption:
      focus === "asg"
        ? {
            vi: "Auto Scaling group trải trên 2 AZ với min = max = desired = 1 không bao giờ để số instance dưới mức tối thiểu: nó tự tạo lại instance ở AZ b.",
            en: "An Auto Scaling group across 2 AZs with min = max = desired = 1 never drops below its minimum: it recreates the instance in AZ b.",
          }
        : {
            vi: "Auto Scaling group tạo lại instance ở AZ b.",
            en: "The Auto Scaling group recreates the instance in AZ b.",
          },
  },
  {
    flow: ["ec2b", "role"],
    badge: focus === "role" ? "IAM" : undefined,
    caption:
      focus === "role"
        ? {
            vi: "Để gọi API gắn Elastic IP, instance cần quyền IAM tương ứng: đó là việc của EC2 instance role.",
            en: "To call the API that attaches the Elastic IP, the instance needs the right IAM permissions: that is the EC2 instance role's job.",
          }
        : {
            vi: "Instance role cấp quyền IAM cho lệnh gọi API.",
            en: "The instance role grants the IAM permissions for the API call.",
          },
  },
  {
    flow: ["ec2b", "eip"],
    badge: focus === "eip" ? "user data" : undefined,
    caption:
      focus === "eip"
        ? {
            vi: "Khi khởi động, script user data gắn Elastic IP vào instance mới. Elastic IP che giấu sự cố bằng cách nhanh chóng ánh xạ lại địa chỉ sang instance khác.",
            en: "At boot, the user data script attaches the Elastic IP to the new instance. An Elastic IP masks a failure by quickly remapping the address to another instance.",
          }
        : {
            vi: "Script user data gắn Elastic IP vào instance mới.",
            en: "The user data script attaches the Elastic IP to the new instance.",
          },
  },
  {
    flow: ["users", "eip", "ec2b"],
    caption: {
      vi: "Người dùng tiếp tục dùng cùng địa chỉ; không phải trả phí cho load balancer chỉ phục vụ một instance.",
      en: "Users keep the same address; there is no load balancer to pay for in front of a single instance.",
    },
  },
];

const verdictOk = (vi: string, en: string) => ({ works: true, caption: { vi, en } as Bilingual });

const spec: IllustrationSpec = {
  questionId: 130168937,
  cols: 4.5,
  rows: 3.3,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 1.15] },
    { id: "eip", label: "Elastic IP", at: [1.3, 1.15] },
    { id: "alb", label: "ALB", at: [1.3, 1.15] },
    { id: "ec2a", label: "EC2", sub: { vi: "web server", en: "web server" }, at: [2.6, 0.3] },
    { id: "ec2b", label: "EC2", sub: { vi: "web server", en: "web server" }, at: [2.6, 2] },
    { id: "role", label: "Instance role", sub: "IAM", at: [3.7, 1.15] },
  ],
  zones: [
    { id: "asg", label: "Auto Scaling group", tone: "group", from: [2.6, 0.3], to: [2.6, 2], pad: 40 },
    { id: "aza", label: "AZ a", tone: "az", from: [2.6, 0.3], to: [2.6, 0.3], pad: 20 },
    { id: "azb", label: "AZ b", tone: "az", from: [2.6, 2], to: [2.6, 2], pad: 20 },
  ],
  scenarios: [
    {
      option: "a",
      hide: ["alb"],
      steps: recover("asg"),
      verdict: verdictOk("Tự phục hồi sau sự cố AZ với đúng một instance.", "Automatic recovery from an AZ failure with exactly one instance."),
    },
    {
      option: "b",
      hide: ["alb"],
      steps: recover("role"),
      verdict: verdictOk("Instance có quyền tự gắn Elastic IP.", "The instance is allowed to attach the Elastic IP itself."),
    },
    {
      option: "c",
      hide: ["alb"],
      steps: recover("eip"),
      verdict: verdictOk("Địa chỉ cố định với chi phí thấp nhất.", "A fixed address at the lowest cost."),
    },
    {
      option: "d",
      hide: ["alb", "role"],
      steps: [
        {
          flow: ["users", "eip", "ec2a"],
          tone: "warn",
          badge: "Spot",
          caption: {
            vi: "Spot Fleet chạy Spot Instance, là dung lượng EC2 chưa dùng với giá thấp.",
            en: "A Spot Fleet runs Spot Instances, unused EC2 capacity at a discount.",
          },
        },
        {
          mark: "ec2a",
          tone: "bad",
          badge: { vi: "bị thu hồi", en: "interrupted" },
          caption: {
            vi: "Spot Instance có thể bị chấm dứt, không phù hợp với ứng dụng quan trọng.",
            en: "Spot Instances can be terminated, which does not suit a critical application.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không phù hợp cho ứng dụng quan trọng.",
          en: "Not suitable for a critical application.",
        },
      },
    },
    {
      option: "e",
      hide: ["eip", "role"],
      steps: [
        {
          flow: ["users", "alb", "ec2a"],
          tone: "warn",
          caption: {
            vi: "ALB với target group chứa instance của Auto Scaling group vẫn hoạt động...",
            en: "An ALB with a target group of the Auto Scaling group's instance still works...",
          },
        },
        {
          mark: "alb",
          tone: "warn",
          badge: "$",
          caption: {
            vi: "...nhưng phải trả phí cho một ALB chỉ gửi lưu lượng tới một EC2 instance; Elastic IP rẻ hơn.",
            en: "...but you pay for a provisioned ALB that sends traffic to only one EC2 instance; an Elastic IP is cheaper.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Không phải giải pháp tiết kiệm chi phí nhất.",
          en: "Not the most cost-efficient solution.",
        },
      },
    },
    {
      option: "f",
      hide: ["alb", "role"],
      steps: [
        {
          flow: [["eip", "ec2a"], ["eip", "ec2b"]],
          tone: "bad",
          badge: "×2",
          caption: {
            vi: "Desired = 2 tạo ra hai instance cùng lúc, nhưng ứng dụng monolith không được thiết kế để chạy phân tán trên hai instance.",
            en: "Desired = 2 creates two instances at once, but the monolith was not built to run distributed across two instances.",
          },
        },
      ],
      verdict: {
        works: false,
        caption: {
          vi: "Vi phạm ràng buộc chỉ một web server.",
          en: "It breaks the single-web-server constraint.",
        },
      },
    },
  ],
};

export default spec;
