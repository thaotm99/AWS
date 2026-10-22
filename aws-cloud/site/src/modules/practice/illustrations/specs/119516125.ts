// Practice test 2, question 59: Route 53 failover from the data center to an ALB + Auto Scaling group already running.
// Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const normal: StepSpec[] = [
  {
    flow: ["users", "r53", "dc"],
    caption: {
      vi: "Route 53 failover record đưa người dùng tới web server on-premises khi nó khoẻ mạnh.",
      en: "A Route 53 failover record sends users to the on-premises web servers while they are healthy.",
    },
  },
  {
    flow: ["dc", "sgw", "s3"],
    badge: "backup",
    caption: {
      vi: "AWS Storage Gateway với stored volumes sao lưu dữ liệu lên Amazon S3, chỉ gửi phần dữ liệu thay đổi.",
      en: "AWS Storage Gateway with stored volumes backs data up to Amazon S3, sending only changed data.",
    },
  },
  {
    mark: "dc",
    tone: "bad",
    badge: { vi: "sự cố", en: "down" },
    caption: { vi: "Trung tâm dữ liệu gặp sự cố.", en: "The data center fails." },
  },
];

const cfnSlow = {
  vi: "CloudFormation cần thời gian để tạo tài nguyên, nên trong lúc đó Route 53 chưa có đích khoẻ mạnh để chuyển sang; không phải giải pháp có downtime ít nhất.",
  en: "CloudFormation takes time to provision resources, so meanwhile Route 53 has no healthy target to fail over to; not the least-downtime solution.",
};

const spec: IllustrationSpec = {
  questionId: 119516125,
  cols: 4.6,
  rows: 3,
  nodes: [
    { id: "users", label: { vi: "Người dùng", en: "Users" }, kind: "actor", at: [0, 1.1] },
    { id: "r53", label: "Route 53", sub: "failover record", at: [1.15, 1.1] },
    { id: "dc", label: "Web servers", sub: "on-premises", kind: "onprem", at: [2.4, 0.1] },
    { id: "sgw", label: "Storage Gateway", sub: "stored volumes", kind: "onprem", at: [3.6, 0.1] },
    { id: "s3", label: "Amazon S3", kind: "data", at: [3.6, 1.1] },
    { id: "alb", label: "Application LB", at: [2.4, 2.0] },
    { id: "asg", label: "EC2 · Auto Scaling", sub: { vi: "đang chạy sẵn", en: "already running" }, at: [3.6, 2.0] },
    { id: "two", label: "2 × EC2", at: [2.4, 2.0] },
    { id: "cfn", label: "CloudFormation", sub: { vi: "chạy từ script", en: "run from a script" }, at: [1.15, 2.0] },
    { id: "lamcfn", label: "Lambda → CFN", sub: { vi: "tạo tài nguyên", en: "creates resources" }, at: [1.15, 2.0] },
  ],
  zones: [{ id: "dcz", label: { vi: "Trung tâm dữ liệu", en: "Data center" }, tone: "onprem", from: [2.4, 0.1], to: [3.6, 0.1], pad: 22 }],
  scenarios: [
    {
      option: "b",
      hide: ["two", "cfn", "lamcfn"],
      steps: [
        ...normal,
        {
          flow: ["users", "r53", "alb", "asg"],
          badge: { vi: "sẵn sàng", en: "ready" },
          caption: {
            vi: "Route 53 chuyển lưu lượng từ tài nguyên không khoẻ mạnh sang tài nguyên khoẻ mạnh: ALB và Auto Scaling group đã chạy sẵn trên AWS, nên downtime ít nhất.",
            en: "Route 53 routes traffic from the unhealthy resource to a healthy one: the ALB and Auto Scaling group are already running on AWS, so downtime is minimal.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Môi trường dự phòng chạy sẵn.", en: "The failover environment is already running." } },
    },
    {
      option: "a",
      hide: ["two", "lamcfn"],
      steps: [
        ...normal,
        { flow: ["cfn", "alb", "asg"], tone: "warn", badge: { vi: "đang tạo…", en: "provisioning…" }, caption: { vi: "Script chạy CloudFormation template để tạo EC2 và ALB sau khi sự cố xảy ra.", en: "A script runs a CloudFormation template to create EC2 and the ALB after the failure." } },
        { stop: ["r53", "alb"], caption: cfnSlow },
      ],
      verdict: { works: false, caption: { vi: "Phải chờ CloudFormation tạo tài nguyên.", en: "Waits for CloudFormation to provision." } },
    },
    {
      option: "c",
      hide: ["two", "cfn", "sgw", "s3"],
      steps: [
        { flow: ["users", "r53", "dc"], caption: { vi: "Route 53 failover record trỏ tới web server on-premises; Auto Scaling group đã chạy trên EC2.", en: "A Route 53 failover record points to the on-premises web servers; an Auto Scaling group runs on EC2." } },
        { mark: "dc", tone: "bad", badge: { vi: "sự cố", en: "down" }, caption: { vi: "Trung tâm dữ liệu gặp sự cố.", en: "The data center fails." } },
        { flow: ["lamcfn", "alb"], tone: "warn", badge: { vi: "đang tạo ALB…", en: "creating ALB…" }, caption: { vi: "Lambda function chạy CloudFormation template để tạo Application Load Balancer.", en: "A Lambda function runs a CloudFormation template to create the Application Load Balancer." } },
        { stop: ["r53", "alb"], caption: cfnSlow },
      ],
      verdict: { works: false, caption: { vi: "Phải chờ CloudFormation tạo ALB.", en: "Waits for CloudFormation to create the ALB." } },
    },
    {
      option: "d",
      hide: ["alb", "asg", "cfn"],
      steps: [
        ...normal,
        { flow: ["lamcfn", "two"], tone: "warn", badge: { vi: "đang tạo…", en: "provisioning…" }, caption: { vi: "Lambda function chạy CloudFormation template để khởi chạy hai EC2 instance.", en: "A Lambda function runs a CloudFormation template to launch two EC2 instances." } },
        { stop: ["r53", "two"], caption: cfnSlow },
      ],
      verdict: { works: false, caption: { vi: "Phải chờ CloudFormation tạo EC2.", en: "Waits for CloudFormation to launch EC2." } },
    },
  ],
};

export default spec;
