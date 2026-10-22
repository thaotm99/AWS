import { useEffect, useRef, useState, type ReactNode } from "react";
import { prefersReducedMotion } from "../../../lib/animate";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./messaging-sims.css";

// The life of one SQS message, played as a short script. Messages are small cards that
// slide between the producer, one or two queue lanes, the workers and the "deleted"
// column. Each scenario is one ShopViet problem and the queue setting that solves it:
// visibility timeout with Spot workers, a dead-letter queue, long polling, a delay
// queue, and two queues for two priorities.

type Place = "src" | "q" | "q2" | "w1" | "w2" | "done";
type Kind = "pro" | "bad";
type WState = "idle" | "busy" | "dead" | "wait";
type Tone = "ok" | "bad" | "info" | "edge";

interface Tok { id: string; label: string; kind?: Kind; place: Place; note?: Bi; dim?: boolean; seq?: number }

interface Frame {
  t: number;
  who: Bi;
  tag: Bi;
  tone: Tone;
  msg: Bi;
  set?: { [id: string]: Partial<Tok> | undefined };
  w?: Partial<Record<"w1" | "w2", WState>>;
  calls?: [all: number, empty: number];
}

interface Setup {
  q: Bi;
  q2?: { label: Bi; kind: "dlq" | "queue"; ghost?: boolean };
  workers: { w1: Bi; w2?: Bi };
  init: Tok[];
  counter?: boolean;
  frames: Frame[];
  ok: boolean;
  result: Bi;
}

interface MScenario {
  name: Bi;
  request: Bi;
  toggle?: { label: Bi; initial: boolean };
  run(on: boolean): Setup;
}

const tok = (id: string, place: Place = "q", kind?: Kind): Tok => ({ id, label: id, place, kind });

/** Same text in both languages (AWS names, ids). */
const same = (s: string): Bi => ({ vi: s, en: s });
const WK = same("Worker");
const QU = same("Queue");
const WEB = same("Web");
const NHAN: Bi = { vi: "NHẬN", en: "RECEIVE" };
const XOA: Bi = { vi: "XOÁ", en: "DELETE" };
const LOI: Bi = { vi: "LỖI", en: "ERROR" };
const HIEN_LAI: Bi = { vi: "HIỆN LẠI", en: "VISIBLE" };
const GUI: Bi = { vi: "GỬI", en: "SEND" };
const RONG: Bi = { vi: "RỖNG", en: "EMPTY" };
const DONE1: Bi = { vi: "Hoàn tất #1.", en: "#1 done." };
const AGAIN: Bi = { vi: "hiện lại", en: "visible again" };
const HIDE60: Bi = { vi: "ẩn 60 s", en: "hidden 60 s" };
const QORDERS: Bi = { vi: "Queue đơn hàng", en: "Order queue" };

/** Receive, fail and come back again: the frames of one failed attempt. */
function attempt(n: number, t: number): Frame[] {
  return [
    { t, who: WK, tag: LOI, tone: "bad", set: { "#7": { place: "w1", note: { vi: `lần ${n}`, en: `try ${n}` } } }, w: { w1: "busy" },
      msg: n === 1
        ? { vi: "Nhận **#7** (lần 1). Đơn hàng chứa mã tỉnh không hợp lệ; mã xử lý phát sinh exception và không xoá message.",
          en: "Receives **#7** (try 1). The order contains an invalid province code; the processing code throws an exception and does not delete the message." }
        : { vi: `Nhận #7 lần ${n}; xử lý tiếp tục thất bại.`, en: `Receives #7, try ${n}; processing fails again.` } },
    { t: t + 30, who: QU, tag: HIEN_LAI, tone: "edge", set: { "#7": { place: "q", note: AGAIN } }, w: { w1: "idle" },
      msg: { vi: "Visibility timeout (30 s) kết thúc; #7 hiển thị lại trong queue.", en: "The visibility timeout (30 s) expires; #7 becomes visible in the queue again." } },
  ];
}

const SCENARIOS: MScenario[] = [
  {
    name: { vi: "Spot Instance bị thu hồi khi đang xử lý", en: "Spot Instance interrupted during processing" },
    request: { vi: "3 message trong queue · visibility timeout 60 s", en: "3 messages in the queue · visibility timeout 60 s" },
    run: () => ({
      q: { vi: "Queue đơn hàng · visibility timeout 60 s", en: "Order queue · visibility timeout 60 s" },
      workers: { w1: same("Worker 1 · Spot"), w2: same("Worker 2 · Spot") },
      init: [tok("#1"), tok("#2"), tok("#3")],
      frames: [
        { t: 0, who: same("Worker 1"), tag: NHAN, tone: "info", set: { "#1": { place: "w1", note: HIDE60 } }, w: { w1: "busy" },
          msg: { vi: "Nhận **#1**. SQS chưa xoá message mà chỉ ẩn message trong khoảng **visibility timeout** để worker khác không nhận trùng.",
            en: "Receives **#1**. SQS does not delete the message yet; it only hides it for the **visibility timeout** so that other workers do not receive it too." } },
        { t: 1, who: same("Worker 2"), tag: NHAN, tone: "info", set: { "#2": { place: "w2", note: HIDE60 } }, w: { w2: "busy" },
          msg: { vi: "Nhận #2; message cũng bị ẩn trong 60 s.", en: "Receives #2; this message is also hidden for 60 s." } },
        { t: 20, who: same("Worker 1"), tag: { vi: "THU HỒI", en: "INTERRUPTED" }, tone: "bad", w: { w1: "dead" },
          msg: { vi: "AWS thu hồi Spot Instance khi #1 đang được xử lý. Worker chưa gọi `DeleteMessage`.",
            en: "AWS interrupts the Spot Instance while #1 is being processed. The worker has not called `DeleteMessage`." } },
        { t: 35, who: same("Worker 2"), tag: XOA, tone: "ok", set: { "#2": { place: "done", note: undefined } }, w: { w2: "idle" },
          msg: { vi: "Worker hoàn tất #2 và gọi `DeleteMessage`. Chỉ tại thời điểm này #2 mới bị xoá khỏi queue.",
            en: "The worker finishes #2 and calls `DeleteMessage`. Only at this point is #2 deleted from the queue." } },
        { t: 36, who: same("Worker 2"), tag: NHAN, tone: "info", set: { "#3": { place: "w2", note: HIDE60 } }, w: { w2: "busy" },
          msg: { vi: "Nhận #3.", en: "Receives #3." } },
        { t: 60, who: QU, tag: HIEN_LAI, tone: "edge", set: { "#1": { place: "q", note: AGAIN } },
          msg: { vi: "Sau 60 s, #1 chưa bị xoá; SQS cho message hiển thị lại trong queue.", en: "After 60 s, #1 has not been deleted; SQS makes the message visible in the queue again." } },
        { t: 70, who: same("Worker 2"), tag: XOA, tone: "ok", set: { "#3": { place: "done", note: undefined }, "#1": { place: "w2", note: { vi: "lần 2", en: "try 2" } } },
          msg: { vi: "Hoàn tất #3, tiếp tục nhận #1 (lần nhận thứ 2).", en: "Finishes #3, then receives #1 (second receive)." } },
        { t: 105, who: same("Worker 2"), tag: XOA, tone: "ok", set: { "#1": { place: "done", note: undefined } }, w: { w1: "idle", w2: "idle" },
          msg: { vi: "Hoàn tất #1. Trong thời gian này, Auto Scaling group đã thay thế Spot Instance bị thu hồi.",
            en: "#1 done. Meanwhile, the Auto Scaling group has replaced the interrupted Spot Instance." } },
      ],
      ok: true,
      result: { vi: "Cả ba message đều được xử lý dù một instance bị thu hồi giữa chừng. Message chỉ bị xoá khi worker gọi lệnh xoá, do đó chạy worker đọc SQS trên **Spot Instances** vừa an toàn vừa tiết kiệm chi phí: tác vụ chưa hoàn tất được tự động xử lý lại.",
        en: "All three messages are processed even though one instance was interrupted midway. A message is deleted only when the worker calls delete, so running SQS workers on **Spot Instances** is both safe and cost-effective: unfinished tasks are processed again automatically." },
    }),
  },
  {
    name: { vi: "Message xử lý thất bại liên tục", en: "A message that keeps failing" },
    request: { vi: "#7 chứa dữ liệu lỗi · visibility timeout 30 s", en: "#7 contains bad data · visibility timeout 30 s" },
    toggle: { label: { vi: "Cấu hình dead-letter queue (maxReceiveCount = 3)", en: "Configure a dead-letter queue (maxReceiveCount = 3)" }, initial: false },
    run: (dlq) => ({
      q: QORDERS,
      q2: { label: dlq ? same("Dead-letter queue") : { vi: "chưa cấu hình dead-letter queue", en: "no dead-letter queue configured" }, kind: "dlq", ghost: !dlq },
      workers: { w1: WK },
      init: [tok("#7", "q", "bad"), tok("#8"), tok("#9")],
      frames: dlq
        ? [
            ...attempt(1, 0), ...attempt(2, 31),
            { t: 62, who: WK, tag: LOI, tone: "bad", set: { "#7": { place: "w1", note: { vi: "lần 3", en: "try 3" } } }, w: { w1: "busy" },
              msg: { vi: "Nhận #7 lần 3; xử lý tiếp tục thất bại.", en: "Receives #7, try 3; processing fails again." } },
            { t: 92, who: QU, tag: same("DLQ"), tone: "edge", set: { "#7": { place: "q2", note: undefined } }, w: { w1: "idle" },
              msg: { vi: "#7 đã được nhận đủ **maxReceiveCount** (3) lần mà chưa bị xoá: SQS chuyển message sang **dead-letter queue**.",
                en: "#7 has been received **maxReceiveCount** (3) times without being deleted: SQS moves the message to the **dead-letter queue**." } },
            { t: 93, who: WK, tag: NHAN, tone: "info", set: { "#8": { place: "w1" } }, w: { w1: "busy" },
              msg: { vi: "Worker được giải phóng để xử lý message khác: nhận #8.", en: "The worker is free to process other messages: receives #8." } },
            { t: 95, who: WK, tag: XOA, tone: "ok", set: { "#8": { place: "done" }, "#9": { place: "w1" } }, msg: { vi: "Hoàn tất #8, nhận #9.", en: "#8 done, receives #9." } },
            { t: 97, who: WK, tag: XOA, tone: "ok", set: { "#9": { place: "done" } }, w: { w1: "idle" }, msg: { vi: "Hoàn tất #9.", en: "#9 done." } },
          ]
        : [
            ...attempt(1, 0), ...attempt(2, 31), ...attempt(3, 62),
            { t: 93, who: WK, tag: LOI, tone: "bad", set: { "#7": { place: "w1", note: { vi: "lần 4", en: "try 4" } } }, w: { w1: "busy" },
              msg: { vi: "Lần 4, 5, 6… Worker tiêu tốn thời gian cho một message không thể xử lý thành công; #8 và #9 phải chờ.",
                en: "Try 4, 5, 6… The worker spends its time on a message that can never be processed successfully; #8 and #9 must wait." } },
          ],
      ok: dlq,
      result: dlq
        ? { vi: "#7 được cô lập trong DLQ để đội phát triển phân tích nguyên nhân lỗi; các message khác được xử lý bình thường. Cấu hình CloudWatch alarm trên số message trong DLQ để nhận cảnh báo ngay.",
          en: "#7 is isolated in the DLQ so the development team can analyze the cause of the failure; other messages are processed normally. Configure a CloudWatch alarm on the number of messages in the DLQ to be alerted right away." }
        : { vi: "#7 liên tục quay lại queue cho tới khi hết **retention period** (mặc định 4 ngày) rồi bị xoá mà không để lại thông tin về nguyên nhân lỗi. Cần cấu hình **dead-letter queue** để cô lập message này.",
          en: "#7 keeps returning to the queue until the **retention period** (4 days by default) ends, then it is deleted without leaving any information about the cause of the failure. Configure a **dead-letter queue** to isolate this message." },
    }),
  },
  {
    name: { vi: "Queue gần như rỗng vào ban đêm", en: "Queue almost empty at night" },
    request: { vi: "2h sáng · 1 message trong 15 giây", en: "2:00 a.m. · 1 message in 15 seconds" },
    toggle: { label: same("Long polling (WaitTimeSeconds = 20)"), initial: false },
    run: (long) => ({
      q: QORDERS,
      workers: { w1: WK },
      init: [tok("#1", "src")],
      counter: true,
      frames: long
        ? [
            { t: 0, who: WK, tag: { vi: "CHỜ", en: "WAITING" }, tone: "info", w: { w1: "wait" }, calls: [1, 0],
              msg: { vi: "`ReceiveMessage` với **WaitTimeSeconds = 20**: SQS giữ kết nối và chờ tối đa 20 s cho tới khi có message.",
                en: "`ReceiveMessage` with **WaitTimeSeconds = 20**: SQS keeps the connection open and waits up to 20 s for a message to arrive." } },
            { t: 14, who: WEB, tag: GUI, tone: "info", set: { "#1": { place: "q" } }, msg: { vi: "Người dùng tạo một đơn hàng.", en: "A user places an order." } },
            { t: 14, who: WK, tag: NHAN, tone: "ok", set: { "#1": { place: "w1" } }, w: { w1: "busy" }, calls: [1, 0],
              msg: { vi: "SQS trả về #1 ngay khi message xuất hiện, không chờ hết 20 s.", en: "SQS returns #1 as soon as the message arrives, without waiting the full 20 s." } },
            { t: 15, who: WK, tag: XOA, tone: "ok", set: { "#1": { place: "done" } }, w: { w1: "idle" }, msg: DONE1 },
          ]
        : [
            { t: 0, who: WK, tag: RONG, tone: "bad", calls: [1, 1],
              msg: { vi: "`ReceiveMessage` trả về kết quả rỗng ngay lập tức (**short polling**, chế độ mặc định).", en: "`ReceiveMessage` returns an empty response immediately (**short polling**, the default)." } },
            { t: 1, who: WK, tag: RONG, tone: "bad", calls: [2, 2], msg: { vi: "Gọi lại; kết quả vẫn rỗng.", en: "Calls again; still empty." } },
            { t: 2, who: WK, tag: RONG, tone: "bad", calls: [3, 3],
              msg: { vi: "Short polling chỉ truy vấn một tập con các server của SQS, do đó có thể trả về rỗng ngay cả khi queue có message.",
                en: "Short polling queries only a subset of the SQS servers, so it can return an empty response even when the queue has messages." } },
            { t: 14, who: WEB, tag: GUI, tone: "info", set: { "#1": { place: "q" } }, calls: [15, 15],
              msg: { vi: "Người dùng tạo một đơn hàng. Worker đã thực hiện 15 lệnh gọi trả về rỗng.", en: "A user places an order. The worker has already made 15 calls that returned empty." } },
            { t: 15, who: WK, tag: NHAN, tone: "ok", set: { "#1": { place: "w1" } }, w: { w1: "busy" }, calls: [16, 15],
              msg: { vi: "Lệnh gọi thứ 16 mới nhận được #1.", en: "Only the 16th call receives #1." } },
            { t: 16, who: WK, tag: XOA, tone: "ok", set: { "#1": { place: "done" } }, w: { w1: "idle" }, msg: DONE1 },
          ],
      ok: long,
      result: long
        ? { vi: "1 lệnh gọi thay vì 16. **Long polling** giảm số lệnh gọi rỗng và do đó giảm chi phí, vì SQS tính phí theo số request.",
          en: "1 call instead of 16. **Long polling** reduces the number of empty responses and therefore the cost, because SQS charges per request." }
        : { vi: "16 lệnh gọi, trong đó 15 lệnh trả về rỗng, cho một message. Lệnh gọi rỗng vẫn bị tính phí; trong cả đêm, số request không cần thiết lên tới hàng chục nghìn. Cần bật **long polling**.",
          en: "16 calls, 15 of them empty, for one message. Empty calls are still charged; over a whole night, unnecessary requests reach tens of thousands. Enable **long polling**." },
    }),
  },
  {
    name: { vi: "Hệ thống kho cần vài giây để cập nhật", en: "Inventory system needs a few seconds to update" },
    request: { vi: "Đơn hàng mới · hệ thống kho cần ~8 s", en: "New order · inventory system needs ~8 s" },
    toggle: { label: same("Delay queue (DelaySeconds = 10)"), initial: false },
    run: (delay) => ({
      q: delay ? { vi: "Queue giao hàng · delay 10 s", en: "Shipping queue · delay 10 s" } : { vi: "Queue giao hàng", en: "Shipping queue" },
      workers: { w1: { vi: "Worker giao hàng", en: "Shipping worker" } },
      init: [tok("#12", "src")],
      frames: delay
        ? [
            { t: 0, who: WEB, tag: { vi: "HOÃN", en: "DELAYED" }, tone: "edge", set: { "#12": { place: "q", dim: true, note: { vi: "hoãn 10 s", en: "delay 10 s" } } },
              msg: { vi: "Đơn #12 được gửi vào **delay queue**: message bị ẩn 10 s ngay từ thời điểm gửi, chưa worker nào nhìn thấy.",
                en: "Order #12 is sent to a **delay queue**: the message is hidden for 10 s from the moment it is sent, and no worker can see it yet." } },
            { t: 10, who: QU, tag: { vi: "HIỆN", en: "VISIBLE" }, tone: "info", set: { "#12": { dim: false, note: undefined } },
              msg: { vi: "Sau 10 s, #12 hiển thị trong queue. Hệ thống kho đã cập nhật xong.", en: "After 10 s, #12 becomes visible in the queue. The inventory system has finished updating." } },
            { t: 10, who: WK, tag: NHAN, tone: "info", set: { "#12": { place: "w1" } }, w: { w1: "busy" }, msg: { vi: "Worker nhận #12.", en: "The worker receives #12." } },
            { t: 11, who: WK, tag: XOA, tone: "ok", set: { "#12": { place: "done" } }, w: { w1: "idle" },
              msg: { vi: "Vận đơn được tạo thành công ngay ở lần xử lý đầu tiên.", en: "The shipping label is created successfully on the first attempt." } },
          ]
        : [
            { t: 0, who: WEB, tag: GUI, tone: "info", set: { "#12": { place: "q" } }, msg: { vi: "Đơn #12 được gửi vào queue.", en: "Order #12 is sent to the queue." } },
            { t: 0, who: WK, tag: NHAN, tone: "info", set: { "#12": { place: "w1" } }, w: { w1: "busy" }, msg: { vi: "Worker nhận message ngay lập tức.", en: "The worker receives the message immediately." } },
            { t: 1, who: WK, tag: LOI, tone: "bad", set: { "#12": { note: { vi: "lỗi", en: "error" } } },
              msg: { vi: "Hệ thống kho chưa cập nhật tồn kho xong; worker không tìm thấy hàng để tạo vận đơn.", en: "The inventory system has not finished updating stock; the worker cannot find the item to create a shipping label." } },
            { t: 31, who: QU, tag: HIEN_LAI, tone: "edge", set: { "#12": { place: "q", note: AGAIN } }, w: { w1: "idle" },
              msg: { vi: "Sau 30 s (visibility timeout), #12 hiển thị lại.", en: "After 30 s (visibility timeout), #12 becomes visible again." } },
            { t: 32, who: WK, tag: XOA, tone: "ok", set: { "#12": { place: "done", note: undefined } }, msg: { vi: "Lần xử lý thứ 2 mới thành công.", en: "Only the second attempt succeeds." } },
          ],
      ok: delay,
      result: delay
        ? { vi: "**Delay queue** trì hoãn message **ngay khi được gửi vào queue**. Điểm khác biệt với visibility timeout: visibility timeout ẩn message **sau khi** một worker đã nhận message.",
          en: "A **delay queue** postpones a message **as soon as it is sent to the queue**. The difference from the visibility timeout: the visibility timeout hides a message **after** a worker has received it." }
        : { vi: "Mọi đơn hàng đều thất bại một lần trước khi thành công, tăng thêm 30 s độ trễ và tạo nhiều log lỗi không thực chất. Cần trì hoãn message ngay từ thời điểm gửi: **delay queue**.",
          en: "Every order fails once before it succeeds, adding 30 s of latency and producing many spurious error logs. Postpone the message from the moment it is sent: a **delay queue**." },
    }),
  },
  {
    name: { vi: "Ưu tiên xử lý ảnh của người dùng Pro", en: "Process Pro users' images first" },
    request: { vi: "3 ảnh Lite được gửi trước, 1 ảnh Pro được gửi sau", en: "3 Lite images sent first, 1 Pro image sent after" },
    toggle: { label: { vi: "Tách thành hai queue: Pro và Lite", en: "Split into two queues: Pro and Lite" }, initial: false },
    run: (two) => {
      const lite = ["L1", "L2", "L3"];
      const order = two ? ["P1", ...lite] : [...lite, "P1"];
      const frames: Frame[] = order.map((id, i) => ({
        t: i * 20, who: WK, tag: { vi: "XỬ LÝ", en: "PROCESS" }, tone: id === "P1" ? "ok" : "info",
        set: { [id]: { place: "w1" }, ...(i ? { [order[i - 1]]: { place: "done" } } : {}) },
        w: { w1: "busy" },
        msg: id === "P1"
          ? two
            ? { vi: "Worker luôn poll **queue Pro** trước; ảnh Pro được xử lý ngay khi xuất hiện.", en: "The worker always polls the **Pro queue** first; a Pro image is processed as soon as it arrives." }
            : { vi: "Ảnh Pro chỉ được xử lý sau khi hoàn tất cả 3 ảnh Lite.", en: "The Pro image is processed only after all 3 Lite images are done." }
          : two && i === 1
            ? { vi: "Chỉ khi queue Pro rỗng, worker mới poll queue Lite.", en: "Only when the Pro queue is empty does the worker poll the Lite queue." }
            : { vi: `Xử lý ảnh ${id}.`, en: `Processes image ${id}.` },
      }));
      frames.push({ t: order.length * 20, who: WK, tag: XOA, tone: "ok", set: { [order[order.length - 1]]: { place: "done" } }, w: { w1: "idle" },
        msg: { vi: "Hoàn tất cả 4 ảnh.", en: "All 4 images done." } });
      return {
        q: two ? { vi: "Queue Pro", en: "Pro queue" } : { vi: "Queue ảnh (dùng chung)", en: "Image queue (shared)" },
        q2: two ? { label: { vi: "Queue Lite", en: "Lite queue" }, kind: "queue" as const } : undefined,
        workers: { w1: { vi: "Worker EC2", en: "EC2 worker" } },
        init: two ? [tok("P1", "q", "pro"), ...lite.map((id) => tok(id, "q2"))] : [...lite.map((id) => tok(id)), tok("P1", "q", "pro")],
        frames,
        ok: two,
        result: two
          ? { vi: "Hai **queue standard** riêng biệt, worker ưu tiên đọc queue Pro. Ảnh Pro không còn phải chờ sau ảnh Lite.",
            en: "Two separate **standard queues**, and the worker reads the Pro queue first. Pro images no longer wait behind Lite images." }
          : { vi: "Người dùng Pro phải chờ 3 lượt xử lý vì mọi ảnh dùng chung một queue. Thay đổi visibility timeout hoặc chế độ polling không tách được hai loại ảnh; tách thành hai queue để worker đọc queue Pro trước.",
            en: "Pro users wait for 3 processing rounds because all images share one queue. Changing the visibility timeout or the polling mode cannot separate the two kinds of images; split them into two queues so the worker reads the Pro queue first." },
      };
    },
  },
];

const LANE_Y = { q: 100, q2: 205 } as const;
const W_Y = { w1: 100, w2: 205 } as const;
const SRC: [number, number] = [70, 100];
const TW = 38;
const TH = 26;

function positions(toks: Tok[]): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  const lane = (p: "q" | "q2") => toks.filter((t) => t.place === p).sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0));
  for (const p of ["q", "q2"] as const) lane(p).forEach((t, i) => (out[t.id] = { x: 455 - i * 46, y: LANE_Y[p] }));
  toks.filter((t) => t.place === "done").sort((a, b) => (a.seq ?? 0) - (b.seq ?? 0))
    .forEach((t, i) => (out[t.id] = { x: 768, y: 62 + i * 34 }));
  for (const t of toks) {
    if (t.place === "src") out[t.id] = { x: SRC[0], y: SRC[1] };
    if (t.place === "w1" || t.place === "w2") out[t.id] = { x: 552, y: W_Y[t.place] };
  }
  return out;
}

const W_TEXT: Record<WState, Bi> = {
  idle: { vi: "sẵn sàng", en: "ready" },
  busy: { vi: "đang xử lý", en: "processing" },
  dead: { vi: "bị thu hồi", en: "interrupted" },
  wait: { vi: "đang chờ message", en: "waiting for messages" },
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type LogLine = { tag?: Bi; tone?: Tone; who?: Bi; t?: number; ok?: boolean; msg: Bi<ReactNode> };

export default function MessageLifeSim() {
  const L = useLang();
  const [index, setIndex] = useState(0);
  const sc = SCENARIOS[index];
  const [on, setOn] = useState(sc.toggle?.initial ?? false);
  const setup = sc.run(on);
  const [toks, setToks] = useState<Tok[]>(() => setup.init.map((t, i) => ({ ...t, seq: i })));
  const [ws, setWs] = useState<Record<string, WState>>({});
  const [clock, setClock] = useState(0);
  const [calls, setCalls] = useState<[number, number]>([0, 0]);
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  function reset(s: Setup = setup) {
    setToks(s.init.map((t, i) => ({ ...t, seq: i })));
    setWs({});
    setClock(0);
    setCalls([0, 0]);
    setLog([]);
  }

  function pick(i: number) {
    if (busy) return;
    const next = SCENARIOS[i];
    const v = next.toggle?.initial ?? false;
    setIndex(i);
    setOn(v);
    reset(next.run(v));
  }

  async function play() {
    if (busy) return;
    setBusy(true);
    reset();
    const fast = prefersReducedMotion();
    await sleep(fast ? 0 : 200);
    let seq = 100;
    for (const f of setup.frames) {
      if (!alive.current) return;
      setToks((cur) => cur.map((t) => {
        const ch = f.set?.[t.id];
        if (!ch) return t;
        const moved = ch.place && ch.place !== t.place;
        return { ...t, ...ch, seq: moved ? seq++ : t.seq };
      }));
      if (f.w) setWs((s) => ({ ...s, ...f.w }));
      setClock(f.t);
      if (f.calls) setCalls(f.calls);
      setLog((l) => [...l, { tag: f.tag, tone: f.tone, who: f.who, t: f.t, msg: { vi: rich(f.msg.vi), en: rich(f.msg.en) } }]);
      await sleep(fast ? 120 : 1050);
    }
    setLog((l) => [...l, { ok: setup.ok, msg: { vi: rich(setup.result.vi), en: rich(setup.result.en) } }]);
    setBusy(false);
  }

  const pos = positions(toks);
  const workers = (["w1", "w2"] as const).filter((w) => setup.workers[w]);
  const q2 = setup.q2;

  return (
    <div className="stage mls">
      <div className="mls-scenarios" role="group" aria-label={L({ vi: "Tình huống", en: "Scenarios" })}>
        {SCENARIOS.map((s, i) => (
          <button key={i} className="chip" aria-pressed={i === index} onClick={() => pick(i)} disabled={busy && i !== index}>
            {L(s.name)}
          </button>
        ))}
      </div>
      <div className="stage-bar">
        <code className="mls-req">{L(sc.request)}</code>
        {sc.toggle && (
          <label className="mls-toggle">
            <input type="checkbox" checked={on} disabled={busy} onChange={(e) => { setOn(e.target.checked); reset(sc.run(e.target.checked)); }} />
            {L(sc.toggle.label)}
          </label>
        )}
        <button className="btn primary" onClick={play} disabled={busy}>{L({ vi: "Chạy mô phỏng", en: "Run simulation" })}</button>
      </div>
      <div className="svg-wrap">
        <svg viewBox="0 30 820 220" role="img" aria-label={L({ vi: "Message được gửi từ web vào queue SQS, chuyển tới worker, sau đó bị xoá hoặc chuyển sang queue khác", en: "Messages are sent from the web tier to an SQS queue, passed to workers, then deleted or moved to another queue" })}>
          <text className="mls-clock" x={14} y={50}>t = {clock} s</text>
          {setup.counter && (
            <text className="mls-counter" x={14} y={240}>ReceiveMessage: {calls[0]} {L({ vi: "lệnh gọi", en: "calls" })} · {calls[1]} {L({ vi: "lệnh rỗng", en: "empty" })}</text>
          )}
          <path className="mls-link" d={`M${SRC[0] + 40} ${LANE_Y.q} H180 M480 ${LANE_Y.q} H${552 - 30}`} />
          {workers.includes("w2") && <path className="mls-link" d={`M500 ${LANE_Y.q} V${W_Y.w2} H522`} />}
          {q2?.kind === "queue" && <path className="mls-link" d={`M${SRC[0]} ${LANE_Y.q + 22} V${LANE_Y.q2} H180 M480 ${LANE_Y.q2} H500 V${LANE_Y.q} H522`} />}
          {q2?.kind === "dlq" && <path className={"mls-link dash" + (q2.ghost ? " ghost" : "")} d={`M330 ${LANE_Y.q + 24} V${LANE_Y.q2 - 24}`} />}
          <g className="mls-src">
            <rect x={SRC[0] - 45} y={SRC[1] - 22} width={90} height={44} rx={8} />
            <text x={SRC[0]} y={SRC[1] + 4} textAnchor="middle">Web</text>
          </g>
          <g className="mls-lane">
            <rect x={180} y={LANE_Y.q - 24} width={300} height={48} rx={10} />
            <text x={186} y={LANE_Y.q - 30}>{L(setup.q)}</text>
          </g>
          {q2 && (
            <g className={`mls-lane ${q2.kind}` + (q2.ghost ? " ghost" : "")}>
              <rect x={180} y={LANE_Y.q2 - 24} width={300} height={48} rx={10} />
              <text x={186} y={LANE_Y.q2 - 30}>{L(q2.label)}</text>
            </g>
          )}
          {workers.map((w) => (
            <g key={w} className={`mls-worker ${ws[w] ?? "idle"}`}>
              <rect x={522} y={W_Y[w] - 26} width={160} height={52} rx={8} />
              <text className="mls-l1" x={632} y={W_Y[w] - 3} textAnchor="middle">{L(setup.workers[w]!)}</text>
              <text className="mls-l2" x={632} y={W_Y[w] + 13} textAnchor="middle">{L(W_TEXT[ws[w] ?? "idle"])}</text>
            </g>
          ))}
          <text className="mls-l2" x={768} y={44} textAnchor="middle">{L({ vi: "đã xoá", en: "deleted" })}</text>
          <line className="mls-sep" x1={720} x2={720} y1={36} y2={240} />
          {toks.map((t) => {
            const p = pos[t.id];
            return (
              <g key={t.id} className={`mls-tok ${t.kind ?? ""}` + (t.place === "src" ? " hidden" : "") + (t.dim ? " dim" : "") + (t.place === "done" ? " done" : "")}
                style={{ transform: `translate(${p.x}px, ${p.y}px)` }}>
                <rect x={-TW / 2} y={-TH / 2} width={TW} height={TH} rx={5} />
                <text y={4} textAnchor="middle">{t.label}</text>
                {t.note && <text className="mls-note" y={-TH / 2 - 5} textAnchor="middle">{L(t.note)}</text>}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="readout">
        {log.length === 0 ? (
          <p className="mls-hint">{L({ vi: <>Chọn <b>Chạy mô phỏng</b> để xem từng bước.{sc.toggle ? " Thay đổi cấu hình và chạy lại để so sánh." : ""}</>, en: <>Choose <b>Run simulation</b> to see each step.{sc.toggle ? " Change the setting and run again to compare." : ""}</> })}</p>
        ) : (
          <ul className="log" aria-live="polite">
            {log.map((e, i) =>
              e.tag === undefined ? (
                <li key={i} className={`mls-result ${e.ok ? "ok" : "bad"}`}>{L(e.msg)}</li>
              ) : (
                <li key={i}>
                  <span className={`tag mls-tag ${e.tone}`}>{L(e.tag)}</span>
                  <span><b>{e.t} s · {e.who && L(e.who)}:</b> {L(e.msg)}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
