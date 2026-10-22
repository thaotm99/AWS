import { useState } from "react";
import { rich } from "../diagram";
import { useLang, type Bi } from "../../../lib/lang";
import "./lambda-sims.css";

// ShopViet sizes a Lambda function for five workloads: memory (CPU is proportional, 1,769 MB = one vCPU),
// /tmp ephemeral storage (512–10,240 MB, per execution environment, not persistent), timeout (default 3 s,
// max 900 s), package type (.zip ≤ 250 MB unzipped including layers; container image ≤ 10 GB in Amazon ECR),
// layers (.zip only, up to 5, immutable versions) and where data that must outlive an invocation lives (EFS).
// Sources: lambda/latest/dg/gettingstarted-limits.html, configuration-memory.html,
// configuration-ephemeral-storage.html, configuration-timeout.html, chapter-layers.html, images-create.html,
// lambda-runtime-environment.html, best-practices.html.

type Pkg = "zip" | "image";
type Store = "tmp" | "layer" | "efs";
type Level = "ok" | "warn" | "bad";

interface Workload {
  id: string;
  name: Bi;
  desc: Bi;
  /** Run time measured in load tests, in seconds. */
  dur: number;
  /** Unzipped size of code and dependencies, in MB. */
  pkg: number;
  minMem?: number;
  tmp?: number;
  shared?: boolean;
  state?: boolean;
}

const WORK: Workload[] = [
  { id: "banner", name: { vi: "Ghép ảnh banner", en: "Compose banners" },
    desc: { vi: "Ghép ảnh banner khuyến mãi, tác vụ nặng về CPU. Load test cho thấy cần tối thiểu 1 vCPU và chạy khoảng 8 giây.", en: "Composes sale banners, a CPU-heavy task. Load tests show it needs at least 1 vCPU and runs for about 8 seconds." },
    dur: 8, pkg: 60, minMem: 1769 },
  { id: "video", name: { vi: "Cắt video review", en: "Trim review videos" },
    desc: { vi: "Tải video gốc 4 GB từ S3 về thư mục /tmp rồi cắt thành đoạn ngắn; chạy khoảng 4 phút.", en: "Downloads a 4 GB source video from S3 to /tmp and trims it into short clips; runs for about 4 minutes." },
    dur: 240, pkg: 90, tmp: 4096 },
  { id: "ml", name: { vi: "Gợi ý sản phẩm (ML)", en: "Product recommendations (ML)" },
    desc: { vi: "Mã nguồn kèm thư viện ML và mô hình, tổng cộng 2,5 GB khi giải nén; mỗi lần gọi chạy khoảng 2 giây.", en: "Code with ML libraries and the model, 2.5 GB in total when unzipped; each invocation runs for about 2 seconds." },
    dur: 2, pkg: 2560 },
  { id: "lib", name: { vi: "Thư viện dùng chung", en: "Shared library" },
    desc: { vi: "12 function của team đơn hàng dùng chung một thư viện nội bộ 40 MB; mỗi function chạy khoảng 1 giây.", en: "The order team's 12 functions share one 40 MB internal library; each function runs for about 1 second." },
    dur: 1, pkg: 45, shared: true },
  { id: "state", name: { vi: "Giữ báo cáo cho lần sau", en: "Keep reports for later" },
    desc: { vi: "Function xuất báo cáo tồn kho; báo cáo phải còn nguyên cho các lần gọi sau và cho function khác đọc.", en: "A function exports stock reports; the reports must stay available to later invocations and to other functions." },
    dur: 5, pkg: 20, state: true },
];

const MEMS = [128, 512, 1769, 3008, 10240];
const TMPS = [512, 2048, 4096, 10240];
const TIMEOUTS = [3, 10, 60, 300, 900];
const ZIP_LIMIT = 250;
const IMAGE_LIMIT = 10240;
const VCPU_MB = 1769;

interface Check { level: Level; label: Bi | string; msg: Bi }

const n = (v: number, vi: boolean) => v.toLocaleString(vi ? "vi-VN" : "en-US");

function evaluate(w: Workload, c: { mem: number; tmp: number; timeout: number; pkg: Pkg; layer: boolean; store: Store }, vi: boolean): Check[] {
  const out: Check[] = [];
  const f = (v: number) => n(v, vi);
  const cpu = (c.mem / VCPU_MB).toLocaleString(vi ? "vi-VN" : "en-US", { maximumFractionDigits: 2 });

  // Package type and size.
  if (c.pkg === "zip") {
    out.push(w.pkg > ZIP_LIMIT
      ? { level: "bad", label: { vi: "Gói .zip", en: ".zip package" },
          msg: { vi: `Gói .zip khi giải nén, **kể cả các layer**, tối đa 250 MB; ${f(w.pkg)} MB vượt giới hạn nên không tạo được function. Đóng gói thành **container image** (tối đa 10 GB).`, en: `A .zip package, unzipped and **including layers**, is limited to 250 MB; ${f(w.pkg)} MB is over the limit, so the function cannot be created. Package it as a **container image** (up to 10 GB).` } }
      : { level: "ok", label: { vi: "Gói .zip", en: ".zip package" },
          msg: { vi: `${f(w.pkg)} MB khi giải nén, trong giới hạn 250 MB (tính cả layer).`, en: `${f(w.pkg)} MB unzipped, within the 250 MB limit (layers included).` } });
  } else {
    out.push({ level: "ok", label: { vi: "Container image", en: "Container image" },
      msg: { vi: `Image ${f(w.pkg)} MB, trong giới hạn **10 GB** (kích thước giải nén, gồm mọi layer của image). Image được đẩy lên Amazon ECR cùng Region với function.`, en: `A ${f(w.pkg)} MB image, within the **10 GB** limit (uncompressed, including all image layers). The image is pushed to Amazon ECR in the same Region as the function.` } });
  }

  // Shared library: layers apply to .zip functions only.
  if (w.shared) {
    if (c.pkg === "image") {
      out.push({ level: "ok", label: { vi: "Thư viện", en: "Library" },
        msg: { vi: "Function dạng container image **không dùng được Lambda layer**; thư viện được đóng gói sẵn trong image.", en: "A container image function **cannot use Lambda layers**; the library is built into the image." } });
    } else if (c.layer) {
      out.push({ level: "ok", label: "Layer",
        msg: { vi: "Thư viện nằm trong một **layer** (được giải nén vào `/opt`), dùng chung cho cả 12 function và cập nhật độc lập với mã function. Mỗi function dùng tối đa 5 layer.", en: "The library lives in a **layer** (extracted to `/opt`), shared by all 12 functions and updated independently of the function code. Each function can use up to 5 layers." } });
    } else {
      out.push({ level: "warn", label: { vi: "Thư viện", en: "Library" },
        msg: { vi: "Mỗi deployment package chứa một bản sao thư viện; khi thư viện thay đổi phải đóng gói lại cả 12 function. Đưa thư viện vào **Lambda layer**.", en: "Every deployment package carries its own copy of the library; a library change means repackaging all 12 functions. Move the library into a **Lambda layer**." } });
    }
  }

  // Memory and CPU.
  if (w.minMem && c.mem < w.minMem) {
    out.push({ level: "bad", label: "Memory",
      msg: { vi: `${f(c.mem)} MB tương đương khoảng ${cpu} vCPU. Lambda cấp CPU **tỷ lệ với memory** (1.769 MB tương đương 1 vCPU); không có thiết lập CPU riêng. Tăng memory lên tối thiểu 1.769 MB.`, en: `${f(c.mem)} MB is about ${cpu} vCPU. Lambda allocates CPU **in proportion to memory** (1,769 MB is the equivalent of one vCPU); there is no separate CPU setting. Raise memory to at least 1,769 MB.` } });
  } else {
    out.push({ level: "ok", label: "Memory",
      msg: { vi: `${f(c.mem)} MB, tương đương khoảng ${cpu} vCPU.`, en: `${f(c.mem)} MB, about ${cpu} vCPU.` } });
  }

  // Ephemeral storage.
  if (w.tmp) {
    out.push(c.tmp < w.tmp
      ? { level: "bad", label: "/tmp",
          msg: { vi: `Video 4 GB không vừa /tmp ${f(c.tmp)} MB; lần gọi lỗi vì hết chỗ ghi. Ephemeral storage cấu hình được từ 512 MB tới 10.240 MB.`, en: `A 4 GB video does not fit in ${f(c.tmp)} MB of /tmp; the invocation fails with no space left. Ephemeral storage can be set from 512 MB to 10,240 MB.` } }
      : { level: "ok", label: "/tmp",
          msg: { vi: `/tmp ${f(c.tmp)} MB đủ chứa video tạm thời trong lúc xử lý.`, en: `${f(c.tmp)} MB of /tmp holds the video temporarily while it is processed.` } });
  }

  // Timeout.
  if (c.timeout < w.dur) {
    out.push({ level: "bad", label: "Timeout",
      msg: { vi: `Tác vụ cần khoảng ${f(w.dur)} giây nhưng timeout là ${f(c.timeout)} giây (mặc định 3 giây): Lambda dừng lần gọi với lỗi timeout.`, en: `The task needs about ${f(w.dur)} seconds but the timeout is ${f(c.timeout)} seconds (default 3 seconds): Lambda stops the invocation with a timeout error.` } });
  } else if (c.timeout > w.dur * 5) {
    out.push({ level: "warn", label: "Timeout",
      msg: { vi: `Timeout ${f(c.timeout)} giây quá cao so với thời gian chạy đo được (${f(w.dur)} giây). Khi một dependency bị treo, mỗi lần gọi giữ môi trường thực thi tới hết timeout: thời gian tính phí và concurrency tăng. Đặt timeout theo kết quả load test.`, en: `A ${f(c.timeout)}-second timeout is far above the measured run time (${f(w.dur)} seconds). When a dependency hangs, each invocation holds its execution environment until the timeout: billed duration and concurrency go up. Set the timeout from load-test results.` } });
  } else {
    out.push({ level: "ok", label: "Timeout",
      msg: { vi: `${f(c.timeout)} giây, có khoảng dự phòng so với thời gian chạy đo được (${f(w.dur)} giây).`, en: `${f(c.timeout)} seconds, with headroom over the measured run time (${f(w.dur)} seconds).` } });
  }

  // Data that must outlive the invocation.
  if (w.state) {
    const m: Record<Store, Check> = {
      tmp: { level: "bad", label: { vi: "Nơi lưu báo cáo", en: "Report storage" },
        msg: { vi: "/tmp là bộ nhớ tạm, **riêng cho từng execution environment**: function khác không đọc được, môi trường mới bắt đầu với /tmp trống, và Lambda thu hồi môi trường sau vài giờ kể cả khi function được gọi liên tục.", en: "/tmp is temporary storage, **unique to each execution environment**: other functions cannot read it, a new environment starts with an empty /tmp, and Lambda terminates environments every few hours even for functions that are invoked continuously." } },
      layer: { level: "bad", label: { vi: "Nơi lưu báo cáo", en: "Report storage" },
        msg: { vi: "Layer dùng cho thư viện, custom runtime và tệp cấu hình. Mỗi **layer version là bản chụp bất biến** tạo khi publish; function không ghi dữ liệu mới vào layer trong lúc chạy.", en: "Layers hold libraries, custom runtimes and configuration files. Each **layer version is an immutable snapshot** created at publish time; a function cannot write new data into a layer while it runs." } },
      efs: { level: "ok", label: { vi: "Nơi lưu báo cáo", en: "Report storage" },
        msg: { vi: "Function mount **Amazon EFS** qua access point: file system dùng chung, mọi lần gọi và các function khác cùng đọc, ghi được.", en: "The function mounts **Amazon EFS** through an access point: a shared file system that every invocation and other functions can read and write." } },
    };
    out.push(m[c.store]);
  }
  return out;
}

export default function FunctionConfigSim() {
  const L = useLang();
  const vi = L({ vi: true, en: false });
  const [wi, setWi] = useState(0);
  const [mem, setMem] = useState(128);
  const [tmp, setTmp] = useState(512);
  const [timeout, setTimeoutS] = useState(3);
  const [pkg, setPkg] = useState<Pkg>("zip");
  const [layer, setLayer] = useState(false);
  const [store, setStore] = useState<Store>("tmp");
  const [checks, setChecks] = useState<Check[] | null>(null);

  const w = WORK[wi];
  const change = <T,>(set: (v: T) => void) => (v: T) => { set(v); setChecks(null); };
  const f = (v: number) => n(v, vi);
  const limit = pkg === "zip" ? ZIP_LIMIT : IMAGE_LIMIT;
  const over = w.pkg > limit;
  const level: Level | null = checks ? (checks.some((c) => c.level === "bad") ? "bad" : checks.some((c) => c.level === "warn") ? "warn" : "ok") : null;

  const meter = (label: string, value: string, pct: number, cls: string, mark?: number) => (
    <div className="lfx-meter">
      <span>{label}</span>
      <span className="lfx-track">
        <span className={`lfx-fill ${cls}`} style={{ width: `${Math.min(100, Math.max(2, pct))}%` }} />
        {mark !== undefined && <span className="lfx-mark" style={{ left: `${Math.min(100, mark)}%` }} />}
      </span>
      <b>{value}</b>
    </div>
  );

  const chips = <T extends string | number>(label: string, opts: readonly T[], cur: T, set: (v: T) => void, show: (v: T) => string) => (
    <div className="lfx-row" role="group" aria-label={label}>
      <span className="lfx-lbl">{label}</span>
      {opts.map((o) => (
        <button key={String(o)} className="chip" aria-pressed={o === cur} onClick={() => set(o)}>{show(o)}</button>
      ))}
    </div>
  );

  return (
    <div className="stage lfx">
      <div className="lfx-row" role="group" aria-label={L({ vi: "Tác vụ", en: "Workload" })}>
        <span className="lfx-lbl">{L({ vi: "Tác vụ", en: "Workload" })}</span>
        {WORK.map((x, i) => (
          <button key={x.id} className="chip" aria-pressed={i === wi} onClick={() => { setWi(i); setChecks(null); }}>{L(x.name)}</button>
        ))}
      </div>
      <p className="lfx-desc">{L(w.desc)}</p>

      <div className="lfx-grid">
        <div className="lfx-controls">
          {chips("Memory", MEMS, mem, change(setMem), (v) => `${f(v)} MB`)}
          {chips(L({ vi: "Ephemeral storage (/tmp)", en: "Ephemeral storage (/tmp)" }), TMPS, tmp, change(setTmp), (v) => `${f(v)} MB`)}
          {chips("Timeout", TIMEOUTS, timeout, change(setTimeoutS), (v) => (v === 3 ? L({ vi: "3 s (mặc định)", en: "3 s (default)" }) : `${f(v)} s`))}
          {chips(L({ vi: "Kiểu đóng gói", en: "Package type" }), ["zip", "image"] as Pkg[], pkg, change(setPkg), (v) => (v === "zip" ? L({ vi: "Tệp .zip", en: ".zip file archive" }) : "Container image"))}
          <div className="lfx-row">
            <label className="lfx-toggle">
              <input type="checkbox" checked={layer && pkg === "zip"} disabled={pkg === "image"} onChange={(e) => { setLayer(e.target.checked); setChecks(null); }} />
              {pkg === "image"
                ? L({ vi: "Lambda layer (không dùng được với container image)", en: "Lambda layer (not available for container images)" })
                : L({ vi: "Đưa thư viện dùng chung vào Lambda layer", en: "Put the shared library in a Lambda layer" })}
            </label>
          </div>
          {w.state && chips(L({ vi: "Lưu báo cáo tại", en: "Store reports in" }), ["tmp", "layer", "efs"] as Store[], store, change(setStore), (v) => (v === "tmp" ? "/tmp" : v === "layer" ? "Lambda layer" : "Amazon EFS"))}
        </div>

        <div className="lfx-env" aria-label={L({ vi: "Môi trường thực thi của function", en: "The function's execution environment" })}>
          <span className="lfx-lbl">{L({ vi: "Môi trường thực thi", en: "Execution environment" })}</span>
          {meter("Memory", `${f(mem)} MB`, (mem / 10240) * 100, "", w.minMem ? (w.minMem / 10240) * 100 : undefined)}
          {meter("CPU", `≈ ${(mem / VCPU_MB).toLocaleString(vi ? "vi-VN" : "en-US", { maximumFractionDigits: 2 })} vCPU`, (mem / 10240) * 100, "cpu")}
          {meter("/tmp", `${f(tmp)} MB`, (tmp / 10240) * 100, w.tmp && tmp < w.tmp ? "bad" : "", w.tmp ? (w.tmp / 10240) * 100 : undefined)}
          {meter(L({ vi: "Gói mã", en: "Package" }), `${f(w.pkg)} / ${f(limit)} MB`, (w.pkg / limit) * 100, over ? "bad" : "pkg")}
          {meter("Timeout", `${f(timeout)} s`, (timeout / 900) * 100, timeout < w.dur ? "bad" : "", (w.dur / 900) * 100)}
          <p className="lfx-note">{L({ vi: "Vạch dọc: mức tác vụ cần. Thang đo theo giới hạn tối đa của Lambda.", en: "Vertical tick: what the workload needs. Scales follow Lambda's maximums." })}</p>
        </div>
      </div>

      <div className="stage-bar lfx-bar">
        <button className="btn primary" onClick={() => setChecks(evaluate(w, { mem, tmp, timeout, pkg, layer: layer && pkg === "zip", store }, vi))}>
          {L({ vi: "Triển khai và chạy thử", en: "Deploy and test" })}
        </button>
      </div>

      <div className="readout">
        {!checks ? (
          <p className="lfx-hint">{L({ vi: "Chọn tác vụ, điều chỉnh cấu hình function, sau đó triển khai và chạy thử. Cấu hình ban đầu là mặc định của Lambda: 128 MB memory, 512 MB /tmp, timeout 3 giây.", en: "Pick a workload, adjust the function configuration, then deploy and test. The starting values are Lambda's defaults: 128 MB memory, 512 MB /tmp, 3-second timeout." })}</p>
        ) : (
          <>
            <ul className="log" aria-live="polite">
              {checks.map((c, i) => (
                <li key={i}>
                  <span className={`tag ${c.level === "ok" ? "hit" : c.level}`}>{c.level === "ok" ? "OK" : c.level === "warn" ? L({ vi: "LƯU Ý", en: "WARN" }) : L({ vi: "LỖI", en: "FAIL" })}</span>
                  <span><b>{typeof c.label === "string" ? c.label : L(c.label)}:</b> {rich(L(c.msg))}</span>
                </li>
              ))}
            </ul>
            <p className={`lfx-result ${level}`}>
              {level === "ok"
                ? L({ vi: "Cấu hình đáp ứng tác vụ.", en: "The configuration fits the workload." })
                : level === "warn"
                  ? L({ vi: "Function chạy được nhưng cấu hình chưa tối ưu; xem các mục LƯU Ý.", en: "The function runs, but the configuration is not optimal; see the WARN lines." })
                  : L({ vi: "Cấu hình chưa đáp ứng tác vụ; sửa các mục LỖI rồi chạy lại.", en: "The configuration does not fit the workload; fix the FAIL lines and run again." })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
