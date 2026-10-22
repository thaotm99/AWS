// Practice test 2, question 27: cron scripts as containers, run on Fargate by EventBridge Scheduler.
// Captions follow the question's explanation.
import type { IllustrationSpec } from "../types";

const spec: IllustrationSpec = {
  questionId: 119516059,
  cols: 3.6,
  rows: 1.5,
  nodes: [
    { id: "sched", label: "EventBridge Scheduler", sub: "cron · rate", at: [0, 0.3] },
    { id: "sfn", label: "Step Functions", sub: "Wait state", at: [0, 0.3] },
    { id: "fg", label: "ECS on Fargate", sub: { vi: "task từ container image", en: "task from container image" }, at: [1.3, 0.3] },
    { id: "lam", label: "AWS Lambda", sub: { vi: "mỗi script một function", en: "one function per script" }, at: [1.3, 0.3] },
    { id: "batch", label: "AWS Batch", sub: { vi: "compute env trên EC2", en: "EC2 compute environment" }, at: [1.3, 0.3] },
    { id: "work", label: { vi: "Dọn dẹp · kiểm tra", en: "Cleanup · validation" }, sub: { vi: "tới 30 phút", en: "up to 30 min" }, kind: "data", at: [2.6, 0.3] },
  ],
  scenarios: [
    {
      option: "b",
      hide: ["sfn", "lam", "batch"],
      steps: [
        {
          flow: ["sched", "fg"],
          badge: "cron",
          caption: {
            vi: "EventBridge Scheduler là bộ lập lịch serverless, được quản lý hoàn toàn, định nghĩa được lịch cron và rate mà không phải duy trì hạ tầng lập lịch.",
            en: "EventBridge Scheduler is a fully managed, serverless scheduler for cron and rate-based jobs, with no scheduling infrastructure to maintain.",
          },
        },
        {
          flow: ["fg", "work"],
          badge: { vi: "30 phút ✓", en: "30 min ✓" },
          caption: {
            vi: "Script giữ nguyên, đóng gói thành container và chạy thành ECS Fargate task: không cấp phát EC2, tự mở rộng, sau này có thể chuyển sang kích hoạt theo sự kiện.",
            en: "The scripts are packaged unchanged as containers and run as ECS Fargate tasks: no EC2 to provision, scalable, and ready for event-based triggers later.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Serverless, container, gần như không sửa script.", en: "Serverless containers, scripts barely changed." } },
    },
    {
      option: "a",
      hide: ["sfn", "fg", "batch"],
      steps: [
        { flow: ["sched", "lam"], caption: { vi: "EventBridge Scheduler tích hợp tốt với Lambda.", en: "EventBridge Scheduler integrates well with Lambda." } },
        {
          stop: ["lam", "work"],
          badge: { vi: "tối đa 15 phút", en: "15 min max" },
          caption: {
            vi: "Lambda có timeout cứng 15 phút, không đủ cho script chạy tới 30 phút; chuyển từng script thành Lambda function còn phải sửa nhiều code và dependency.",
            en: "Lambda has a hard 15-minute timeout, too short for scripts that run up to 30 minutes; rewriting each script as a Lambda function also means major code and dependency changes.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Vượt giới hạn thời gian của Lambda.", en: "Exceeds Lambda's time limit." } },
    },
    {
      option: "c",
      hide: ["sched", "sfn", "fg", "lam"],
      steps: [
        { flow: ["batch", "work"], tone: "warn", caption: { vi: "AWS Batch chạy được job dài và có lập lịch.", en: "AWS Batch supports long-running jobs and scheduling." } },
        {
          mark: "batch",
          tone: "bad",
          badge: { vi: "quản lý EC2", en: "EC2 to manage" },
          caption: {
            vi: "Nhưng Batch thiết kế cho job tính toán theo lô với queue và quản lý phụ thuộc, cần nhiều cấu hình hơn; compute environment trên EC2 làm tăng công vận hành.",
            en: "But Batch is designed for batch compute jobs with queues and dependency management and needs more configuration; an EC2 compute environment adds operational overhead.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Nặng hơn mức cần cho cron job.", en: "Heavier than a cron job needs." } },
    },
    {
      option: "d",
      hide: ["sched", "lam", "batch"],
      steps: [
        { flow: ["sfn", "fg", "work"], tone: "warn", caption: { vi: "Step Functions dùng Wait state để trì hoãn rồi chạy task trên ECS Fargate.", en: "Step Functions uses Wait states to delay, then runs tasks on ECS Fargate." } },
        {
          mark: "sfn",
          tone: "bad",
          badge: { vi: "điều phối thừa", en: "extra orchestration" },
          caption: {
            vi: "Cách này thêm độ phức tạp điều phối không cần thiết; Step Functions hợp với workflow nhiều bước, không phải từng job định kỳ đơn lẻ.",
            en: "This adds unnecessary orchestration complexity; Step Functions suits multi-step workflows, not individual recurring jobs.",
          },
        },
      ],
      verdict: { works: false, caption: { vi: "Phức tạp hơn cần thiết.", en: "More complex than needed." } },
    },
  ],
};

export default spec;
