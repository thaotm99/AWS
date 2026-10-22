// Practice test 1, question 32: patch an instance in an Auto Scaling group without it being replaced.
// Captions follow the question's explanation.
import type { IllustrationSpec, StepSpec } from "../types";

const replaced: StepSpec = {
  flow: ["asg", "repl"],
  tone: "bad",
  badge: { vi: "thay thế", en: "replacement" },
  caption: {
    vi: "Health check báo out of service, nên Auto Scaling group lập tức tạo instance thay thế — đúng vấn đề nhóm đang gặp.",
    en: "The health check shows out of service, so the Auto Scaling group immediately provisions a replacement — the very problem the team faces.",
  },
};

const spec: IllustrationSpec = {
  questionId: 125222647,
  cols: 4,
  rows: 2.4,
  nodes: [
    { id: "lb", label: "Load balancer", at: [0, 0.7] },
    { id: "inst", label: "EC2 instance", sub: { vi: "đang vá", en: "being patched" }, at: [1.4, 0] },
    { id: "peer", label: "EC2 instance", sub: "InService", at: [1.4, 1.4] },
    { id: "asg", label: "Auto Scaling group", sub: "step scaling", at: [2.9, 0] },
    { id: "repl", label: { vi: "Instance thay thế", en: "Replacement" }, at: [2.9, 1.4] },
    { id: "ami", label: "New AMI", sub: { vi: "từ snapshot", en: "from a snapshot" }, at: [2.9, 1.4] },
  ],
  links: [["inst", "asg"]],
  scenarios: [
    {
      option: "a",
      hide: ["repl", "ami"],
      steps: [
        {
          mark: "inst",
          tone: "warn",
          badge: "Standby",
          caption: {
            vi: "Đưa instance từ InService sang Standby: nó vẫn thuộc Auto Scaling group nhưng không còn xử lý lưu lượng ứng dụng.",
            en: "The instance moves from InService to Standby: it stays in the Auto Scaling group but no longer handles application traffic.",
          },
        },
        { flow: ["lb", "peer"], times: 2, caption: { vi: "Lưu lượng đi tới các instance còn lại trong khi bản vá được áp dụng.", en: "Traffic goes to the other instances while the patch is applied." } },
        {
          mark: "inst",
          tone: "ok",
          badge: "InService",
          caption: { vi: "Cập nhật xong, thoát Standby và đưa instance trở lại phục vụ.", en: "Once updated, the instance exits Standby and returns to service." },
        },
      ],
      verdict: { works: true, caption: { vi: "Vá tại chỗ, không bị thay thế.", en: "Patched in place, not replaced." } },
    },
    {
      option: "d",
      hide: ["repl", "ami"],
      steps: [
        {
          mark: "asg",
          tone: "dim",
          badge: { vi: "tạm dừng ReplaceUnhealthy", en: "ReplaceUnhealthy suspended" },
          caption: {
            vi: "ReplaceUnhealthy là tiến trình chấm dứt instance bị đánh dấu không khoẻ mạnh rồi thay thế; khi tạm dừng, Auto Scaling ngừng thay thế chúng.",
            en: "ReplaceUnhealthy terminates instances marked unhealthy and replaces them; while it is suspended, Auto Scaling stops replacing them.",
          },
        },
        {
          mark: "inst",
          tone: "bad",
          badge: "unhealthy",
          caption: {
            vi: "Trong lúc vá, instance vẫn bị đánh dấu không khoẻ mạnh khi trượt health check, nhưng không bị thay thế.",
            en: "During the patch, the instance is still marked unhealthy when it fails health checks, but it is not replaced.",
          },
        },
        {
          mark: "inst",
          tone: "ok",
          badge: "healthy",
          caption: {
            vi: "Xong việc, đặt thủ công trạng thái healthy cho instance rồi kích hoạt lại ReplaceUnhealthy.",
            en: "When done, set the instance's health status back to healthy manually and resume ReplaceUnhealthy.",
          },
        },
      ],
      verdict: { works: true, caption: { vi: "Tạm ngừng việc thay thế trong lúc vá.", en: "Replacement paused during the patch." } },
    },
    {
      option: "b",
      hide: ["repl"],
      steps: [
        { flow: ["inst", "ami"], tone: "warn", caption: { vi: "Chụp snapshot, tạo AMI mới, khởi chạy instance mới từ AMI rồi vá instance đó.", en: "Snapshot the instance, build a new AMI, launch a new instance from it and patch that one." } },
        { mark: "ami", tone: "bad", badge: { vi: "tốn thời gian", en: "slow" }, caption: { vi: "Tạo AMI và instance mới chỉ để áp một bản vá không tối ưu về thời gian lẫn tài nguyên.", en: "Building an AMI and a new instance just to apply a patch is not time- or resource-efficient." } },
      ],
      verdict: { works: false, caption: { vi: "Không hiệu quả.", en: "Not efficient." } },
    },
    {
      option: "c",
      hide: ["repl", "ami"],
      steps: [
        { mark: "asg", tone: "bad", badge: { vi: "xoá nhóm", en: "group deleted" }, caption: { vi: "Không nên xoá cả Auto Scaling group chỉ để vá một instance rồi tạo lại nhóm.", en: "Deleting the whole Auto Scaling group to patch one instance, then recreating it, is not recommended." } },
      ],
      verdict: { works: false, caption: { vi: "Quá tay.", en: "Far too drastic." } },
    },
    {
      option: "e",
      hide: ["ami"],
      steps: [
        {
          mark: "asg",
          tone: "dim",
          badge: { vi: "tạm dừng ScheduledActions", en: "ScheduledActions suspended" },
          caption: {
            vi: "Tạm dừng ScheduledActions chỉ khiến Auto Scaling không chạy các scaling action đã lên lịch trong thời gian tạm dừng — không liên quan tới vấn đề này.",
            en: "Suspending ScheduledActions only stops scheduled scaling actions during the suspension — irrelevant to this problem.",
          },
        },
        { mark: "inst", tone: "bad", badge: "out of service", caption: { vi: "Bản vá làm instance trượt health check.", en: "The patch makes the instance fail its health check." } },
        replaced,
      ],
      verdict: { works: false, caption: { vi: "Sai tiến trình.", en: "The wrong process." } },
    },
  ],
};

export default spec;
