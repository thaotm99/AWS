// Cloud City: MFTECH as a city. Each AWS service is a building, request traffic is the city's
// population, and every day brings an event (a storm, a sale, an attack) that the city survives or not
// depending on what was built. Buildings unlock as the learner studies the lessons. Pure rules here;
// the island (components/city/CityGame.tsx) draws them. Kept in this browser.

export type Text = { vi: string; en: string };
const t = (vi: string, en: string): Text => ({ vi, en });

export type BuildingId =
  | "factory" | "router" | "bank" | "standby" | "warehouse" | "gate" | "wall" | "cafe" | "post" | "temp" | "crew" | "tower";
export type SlotKind = "gate" | "router" | "zone" | "city" | "wall";
export type Zone = "a" | "b";

export interface Building {
  name: Text;
  aws: string;
  /** What it does in the city, in city terms. */
  role: Text;
  /** Lesson that unlocks it; none: available from the start. */
  lesson?: string;
  price: number;
  /** Upkeep per day. */
  upkeep: number;
  slots: SlotKind[];
}

export const BUILDINGS: Record<BuildingId, Building> = {
  factory: { name: t("Nhà máy", "Factory"), aws: "EC2", role: t("Xử lý request; mỗi nhà máy phục vụ khoảng 800 dân mỗi giây", "Handles requests; each factory serves about 800 residents a second"), price: 120, upkeep: 12, slots: ["zone"] },
  router: { name: t("Trạm điều phối", "Dispatch station"), aws: "Application Load Balancer", role: t("Chia xe tới nhà máy ở cả hai khu; thiếu trạm, chỉ khu A nhận xe", "Sends traffic to factories in both districts; without it, only district A gets traffic"), price: 80, upkeep: 6, slots: ["router"] },
  bank: { name: t("Ngân hàng chính", "Main bank"), aws: "RDS primary", role: t("Ghi nhận đơn hàng; mỗi ngân hàng chịu khoảng 1.500 lượt đọc ghi mỗi giây", "Records orders; handles about 1,500 reads and writes a second"), price: 150, upkeep: 15, slots: ["zone"] },
  standby: { name: t("Ngân hàng dự phòng", "Standby bank"), aws: "RDS Multi-AZ standby", role: t("Bản sao đồng bộ ở khu kia, tự tiếp quản khi khu của ngân hàng chính mất điện", "A synchronous copy in the other district that takes over when the main bank's district loses power"), lesson: "rds", price: 150, upkeep: 15, slots: ["zone"] },
  warehouse: { name: t("Kho hàng", "Warehouse"), aws: "Amazon S3", role: t("Giữ ảnh sản phẩm và hoá đơn, không bao giờ đầy", "Keeps product images and invoices, never fills up"), price: 40, upkeep: 2, slots: ["city"] },
  gate: { name: t("Cổng thành", "City gate"), aws: "CloudFront", role: t("Phát ảnh từ điểm gần khách; khách ở xa không còn chờ lâu, nhà máy bớt việc", "Serves images close to customers; distant visitors stop waiting and factories do less"), lesson: "cloudfront", price: 90, upkeep: 8, slots: ["gate"] },
  wall: { name: t("Tường thành", "City wall"), aws: "AWS WAF", role: t("Chặn bot và các kiểu tấn công web phổ biến trước khi chúng vào thành phố", "Stops bots and common web attacks before they enter the city"), lesson: "security", price: 60, upkeep: 5, slots: ["wall"] },
  cafe: { name: t("Quán cà phê nhanh", "Express café"), aws: "ElastiCache", role: t("Trả lời các câu hỏi lặp lại trong tích tắc, ngân hàng bớt tải ba lần", "Answers repeated questions instantly; the bank's load drops threefold"), lesson: "analytics", price: 70, upkeep: 6, slots: ["zone", "city"] },
  post: { name: t("Bưu điện", "Post office"), aws: "Amazon SQS", role: t("Giữ thư (đơn hàng) khi kho tạm đóng cửa và giao lại khi kho mở", "Keeps letters (orders) while the warehouse is closed and delivers them when it reopens"), lesson: "messaging", price: 30, upkeep: 2, slots: ["city"] },
  temp: { name: t("Thợ thời vụ", "Seasonal workers"), aws: "AWS Lambda", role: t("Gánh thêm 600 dân mỗi giây lúc đông, chỉ trả tiền khi có việc", "Take on 600 more residents a second at busy times, paid only when there is work"), lesson: "lambda", price: 40, upkeep: 2, slots: ["city"] },
  crew: { name: t("Đội xây nhanh", "Rapid build crew"), aws: "EC2 Auto Scaling", role: t("Tự dựng thêm nhà máy tạm khi quá tải (thêm 50% sức chứa)", "Puts up temporary factories when overloaded (50% more capacity)"), lesson: "asg", price: 60, upkeep: 4, slots: ["city"] },
  tower: { name: t("Tháp quan sát", "Watchtower"), aws: "Amazon CloudWatch", role: t("Báo trước sự kiện của ngày mai để kịp chuẩn bị", "Warns of tomorrow's event so the city can prepare"), lesson: "monitoring", price: 30, upkeep: 2, slots: ["city"] },
};

export interface Slot {
  id: string;
  kind: SlotKind;
  zone?: Zone;
}

export const SLOTS: Slot[] = [
  { id: "gate", kind: "gate" },
  { id: "router", kind: "router" },
  { id: "wall", kind: "wall" },
  ...(["a", "b"] as Zone[]).flatMap((zone) => [1, 2, 3].map((n) => ({ id: `${zone}${n}`, kind: "zone" as const, zone }))),
  ...[1, 2, 3, 4].map((n) => ({ id: `c${n}`, kind: "city" as const })),
];

export type Placed = Partial<Record<string, BuildingId>>;

/** What the day's event does to the city. */
export interface Conditions {
  demand: number;
  /** A district without power. */
  down?: Zone;
  attack?: boolean;
  warehouseClosed?: boolean;
  /** Visitors from far away. */
  far?: boolean;
  /** Reads hitting the bank, as a share of demand (normally 0.6). */
  dbShare?: number;
  /** Extra capacity bought for the day. */
  extra?: number;
}

export interface DayResult {
  demand: number;
  capacity: number;
  served: number;
  latency: number;
  /** Share of requests that failed (0–1). */
  errors: number;
  ordersLost: number;
  income: number;
  upkeep: number;
  bankDown: boolean;
}

const count = (p: Placed, b: BuildingId, zone?: Zone) => SLOTS.filter((s) => p[s.id] === b && (!zone || s.zone === zone)).length;
export const has = (p: Placed, b: BuildingId) => count(p, b) > 0;

/** One day of the city under the day's conditions. */
export function simulate(p: Placed, c: Conditions): DayResult {
  const up = (z: Zone) => c.down !== z;
  const reach: Zone[] = has(p, "router") ? ["a", "b"] : ["a"];
  let capacity = reach.filter(up).reduce((s, z) => s + 800 * count(p, "factory", z), 0);
  if (has(p, "crew") && capacity > 0) capacity *= 1.5;
  if (has(p, "temp")) capacity += 600;
  capacity += c.extra ?? 0;
  // A gate (CDN) answers image requests at the edge: the factories see 30% less.
  const attackLoad = c.attack && !has(p, "wall") ? 0.5 : 0;
  const demand = Math.round(c.demand * (1 + attackLoad));
  const load = demand * (has(p, "gate") ? 0.7 : 1);
  const served = Math.min(load, capacity);
  const overload = capacity > 0 ? Math.max(0, load / capacity - 1) : 1;

  // The bank: one in a district with power, or the standby taking over in the other district.
  const banks = (["a", "b"] as Zone[]).filter((z) => up(z) && (count(p, "bank", z) > 0 || count(p, "standby", z) > 0)).length;
  const bankDown = banks === 0;
  const dbCap = 1500 * Math.max(1, count(p, "bank")) * (has(p, "cafe") ? 3 : 1);
  const dbLoad = demand * (c.dbShare ?? 0.6);
  const dbOver = Math.max(0, dbLoad / dbCap - 1);

  let latency = 120 + 900 * overload + 600 * dbOver;
  if (c.far && !has(p, "gate")) latency += 250;
  if (has(p, "cafe")) latency *= 0.85;
  latency = Math.round(Math.min(latency, 5000));

  let errors = load > 0 ? 1 - served / load : 0;
  if (bankDown) errors = Math.max(errors, 0.6);
  if (c.attack && !has(p, "wall")) errors = Math.min(1, errors + 0.05);
  errors = Math.round(Math.min(1, errors) * 1000) / 1000;

  const orders = served * 0.05 * (1 - (bankDown ? 0.6 : 0));
  const ordersLost = Math.round(c.warehouseClosed && !has(p, "post") ? orders * 0.4 : 0);
  const upkeep = SLOTS.reduce((s, sl) => s + (p[sl.id] ? BUILDINGS[p[sl.id]!].upkeep : 0), 0);
  // Happy residents buy: income falls with latency above 300 ms.
  const mood = latency <= 300 ? 1 : Math.max(0.3, 300 / latency);
  const income = Math.round((orders - ordersLost) * 4 * mood);
  return { demand, capacity: Math.round(capacity), served: Math.round(served), latency, errors, ordersLost, income, upkeep, bankDown };
}

// ---------- events ----------

export interface Choice {
  text: Text;
  /** Paid now. */
  cost?: number;
  /** Build this right away (if unlocked and a slot is free). */
  build?: BuildingId;
  /** Needs this building already standing; otherwise the choice is not offered. */
  needs?: BuildingId;
  /** Changes to the day's conditions. */
  change?: Partial<Conditions>;
  verdict: "good" | "partial" | "bad";
  outcome: Text;
}

export interface CityEvent {
  id: string;
  /** City level from which it can happen. */
  level: number;
  title: Text;
  story: Text;
  conditions: (base: number) => Conditions;
  choices: Choice[];
  learn: { lesson: string; part: string };
}

export const EVENTS: CityEvent[] = [
  {
    id: "rush",
    level: 1,
    title: t("Giờ cao điểm khuyến mãi", "A sale at rush hour"),
    story: t("MFTECH giảm giá 50%. Dân cư đổ về gấp 3 lần trong 10 phút.", "MFTECH takes 50% off. Three times the usual residents arrive within 10 minutes."),
    conditions: (base) => ({ demand: base * 3 }),
    choices: [
      { text: t("Thuê nhà máy tạm cho hôm nay", "Hire temporary factories for the day"), cost: 120, change: { extra: 1600 }, verdict: "good", outcome: t("Thêm sức chứa trước khi dân đông nhất. Lần sau, Đội xây nhanh (Auto Scaling) làm việc này tự động.", "Capacity arrives before the peak. Next time a rapid build crew (Auto Scaling) does this on its own.") },
      { text: t("Giữ nguyên, đợi dân tự giảm", "Do nothing and wait it out"), verdict: "bad", outcome: t("Nhà máy quá tải, dân chờ lâu và bỏ đi giữa chừng.", "The factories overflow; residents wait and leave halfway.") },
      { text: t("Gọi Đội xây nhanh", "Call the rapid build crew"), needs: "crew", verdict: "good", outcome: t("Đội xây nhanh dựng thêm nhà máy tạm theo tải, không phải trả trước.", "The crew adds temporary factories as load grows, with nothing paid up front.") },
    ],
    learn: { lesson: "asg", part: "scaling-policies" },
  },
  {
    id: "far",
    level: 1,
    title: t("Khách ở Sydney và Tokyo than chậm", "Visitors from Sydney and Tokyo say it is slow"),
    story: t("Một chiến dịch quảng cáo đưa khách từ xa tới. Ảnh sản phẩm tải mất vài giây.", "An ad campaign brings visitors from far away. Product images take seconds to load."),
    conditions: (base) => ({ demand: base * 1.5, far: true }),
    choices: [
      { text: t("Xây Cổng thành (CloudFront)", "Build the city gate (CloudFront)"), build: "gate", verdict: "good", outcome: t("Ảnh được phát từ điểm gần khách; độ trễ giảm mạnh và nhà máy bớt việc.", "Images are served near the visitors; latency drops and the factories do less.") },
      { text: t("Mua nhà máy lớn hơn", "Buy bigger factories"), cost: 100, change: { extra: 800 }, verdict: "partial", outcome: t("Thêm sức chứa nhưng không rút ngắn quãng đường tới khách ở xa.", "More capacity, but the distance to faraway visitors stays the same.") },
      { text: t("Bỏ qua khách ở xa", "Ignore the faraway visitors"), verdict: "bad", outcome: t("Khách ở xa chờ lâu và không quay lại.", "Faraway visitors wait and do not come back.") },
    ],
    learn: { lesson: "cloudfront", part: "request-flow" },
  },
  {
    id: "bots",
    level: 3,
    title: t("Bot dò lỗ hổng cửa sau", "Bots probe the back door"),
    story: t("Hàng nghìn bot gửi request chứa SQL injection vào trang tìm kiếm.", "Thousands of bots send SQL injection requests to the search page."),
    conditions: (base) => ({ demand: base, attack: true }),
    choices: [
      { text: t("Dựng Tường thành (AWS WAF) với managed rules", "Raise the city wall (AWS WAF) with managed rules"), build: "wall", verdict: "good", outcome: t("Request độc hại bị chặn ở tường thành, nhà máy chỉ xử lý dân thật.", "Malicious requests stop at the wall; factories serve only real residents.") },
      { text: t("Chặn từng IP bằng tay", "Block IPs one by one"), cost: 20, change: { attack: false, demand: 0 }, verdict: "partial", outcome: t("Chặn được hôm nay, nhưng bot đổi IP liên tục; ngày mai lại gặp.", "It works today, but bots keep changing IPs; they will be back tomorrow.") },
      { text: t("Mặc kệ", "Ignore it"), verdict: "bad", outcome: t("Bot chiếm sức chứa của nhà máy và có request lọt tới ngân hàng.", "Bots take factory capacity and some requests reach the bank.") },
    ],
    learn: { lesson: "security", part: "aws-waf" },
  },
  {
    id: "storm",
    level: 4,
    title: t("Bão làm khu A mất điện", "A storm cuts power to district A"),
    story: t("Khu A (AZ ap-southeast-1a) mất điện giữa giờ cao điểm.", "District A (AZ ap-southeast-1a) loses power at peak time."),
    conditions: (base) => ({ demand: base * 1.5, down: "a" }),
    choices: [
      { text: t("Xây thêm nhà máy ở khu B ngay", "Build another factory in district B right away"), build: "factory", verdict: "good", outcome: t("Khu B gánh toàn bộ dân. Thiết kế tốt hơn: mỗi khu luôn đủ sức gánh một mình.", "District B carries everyone. Better still: keep enough in each district to carry the city alone.") },
      { text: t("Chờ điện khu A có lại", "Wait for district A's power"), verdict: "bad", outcome: t("Mất điện kéo dài hàng giờ; dân dồn về khu B đang quá tải.", "The outage lasts hours; residents pile into an overloaded district B.") },
      { text: t("Dời cả thành phố sang Region khác", "Move the whole city to another Region"), cost: 900, change: { down: undefined }, verdict: "partial", outcome: t("Thành phố chạy lại nhưng tốn kém; một AZ sập không cần tới phương án này nếu có đủ hai khu.", "The city runs again at great cost; one AZ down does not call for this when both districts are built.") },
    ],
    learn: { lesson: "rds", part: "multi-az-read-replicas" },
  },
  {
    id: "bank",
    level: 5,
    title: t("Ngân hàng quá tải ngày sale", "The bank is overloaded on sale day"),
    story: t("Ai cũng xem đi xem lại cùng một trang sản phẩm; ngân hàng trả lời cùng câu hỏi hàng nghìn lần.", "Everyone reloads the same product pages; the bank answers the same question thousands of times."),
    conditions: (base) => ({ demand: base * 2, dbShare: 1.2 }),
    choices: [
      { text: t("Mở Quán cà phê nhanh (ElastiCache)", "Open the express café (ElastiCache)"), build: "cafe", verdict: "good", outcome: t("Câu hỏi lặp lại được trả lời từ bộ nhớ; ngân hàng bớt tải ba lần.", "Repeated questions are answered from memory; the bank's load drops threefold.") },
      { text: t("Nâng cấp ngân hàng giữa ngày sale", "Upgrade the bank in the middle of the sale"), cost: 200, change: { down: undefined, dbShare: 0.7 }, verdict: "partial", outcome: t("Ngân hàng mạnh hơn nhưng nâng cấp gây gián đoạn; nên làm trong giờ bảo trì.", "A stronger bank, but the upgrade means downtime; do it in a maintenance window.") },
      { text: t("Đợi hết sale", "Wait for the sale to end"), verdict: "bad", outcome: t("Ngân hàng chậm, mọi trang đều chậm theo.", "The bank slows down and every page with it.") },
    ],
    learn: { lesson: "analytics", part: "database-cache" },
  },
  {
    id: "closed",
    level: 6,
    title: t("Kho tạm đóng cửa để bảo trì", "The warehouse closes for maintenance"),
    story: t("Dịch vụ kho bảo trì 2 giờ. Đơn hàng vẫn tới liên tục.", "The warehouse service is down for 2 hours of maintenance. Orders keep coming."),
    conditions: (base) => ({ demand: base, warehouseClosed: true }),
    choices: [
      { text: t("Cho đơn chờ ở Bưu điện (SQS)", "Let orders wait at the post office (SQS)"), build: "post", verdict: "good", outcome: t("Đơn nằm ở bưu điện tới khi kho mở lại; không mất đơn nào.", "Orders wait at the post office until the warehouse reopens; none are lost.") },
      { text: t("Tạm ngừng nhận đơn", "Stop taking orders"), change: { demand: 0 }, verdict: "partial", outcome: t("Không mất đơn, nhưng cũng không bán được gì trong 2 giờ.", "Nothing is lost, but nothing is sold for 2 hours either.") },
      { text: t("Cứ gửi thẳng vào kho", "Keep sending orders straight to the warehouse"), verdict: "bad", outcome: t("Đơn gửi tới kho đang đóng thì mất.", "Orders sent to a closed warehouse are lost.") },
    ],
    learn: { lesson: "messaging", part: "queues" },
  },
];

// ---------- levels ----------

export const LEVELS: Text[] = [
  t("Làng", "Village"), t("Thị trấn nhỏ", "Small town"), t("Thị trấn", "Town"), t("Thị xã", "Borough"),
  t("Thành phố", "City"), t("Đô thị", "Metropolis"), t("Đại đô thị", "Megacity"),
];

/** Level 1–7: one more for each curriculum layer the learner has started. */
export function cityLevel(layers: string[][], studied: Set<string>): number {
  return Math.min(LEVELS.length, 1 + layers.slice(1).filter((ids) => ids.some((id) => studied.has(id))).length);
}

export const unlocked = (b: BuildingId, studied: Set<string>) => !BUILDINGS[b].lesson || studied.has(BUILDINGS[b].lesson!);

// ---------- the game ----------

export interface CityState {
  placed: Placed;
  money: number;
  day: number;
  /** Events seen, so each comes round before any repeats. */
  seen: string[];
  /** Buildings the learner has already been told about. */
  known: BuildingId[];
  best: { uptime: number; days: number };
  history: { day: number; event: string; verdict: Choice["verdict"]; errors: number; latency: number; income: number }[];
}

export const START: CityState = {
  placed: { a1: "factory", b1: "factory", a2: "bank", router: "router", c1: "warehouse" },
  money: 400,
  day: 1,
  seen: [],
  known: [],
  best: { uptime: 0, days: 0 },
  history: [],
};

/** Residents per second on an ordinary day at a level. */
export const baseDemand = (level: number) => 300 + 150 * level;

/** The next event: the first one at or below the level not seen in this round. */
export function nextEvent(state: CityState, level: number): CityEvent {
  const open = EVENTS.filter((e) => e.level <= level);
  const fresh = open.filter((e) => !state.seen.includes(e.id));
  return (fresh.length ? fresh : open)[state.day % (fresh.length || open.length)];
}

/** A free slot where a building can go. Zone buildings prefer district B when A already has one. */
export function freeSlot(p: Placed, b: BuildingId): Slot | undefined {
  const kinds = BUILDINGS[b].slots;
  const free = SLOTS.filter((s) => kinds.includes(s.kind) && !p[s.id]);
  if (b === "standby") return free.find((s) => s.zone && !SLOTS.some((x) => x.zone === s.zone && p[x.id] === "bank")) ?? free[0];
  if (b === "factory") return free.find((s) => s.zone === "b") ?? free[0];
  return free[0];
}

/** Choices that can be taken now: needs met, and anything to build is unlocked, affordable and has room. */
export function available(choice: Choice, state: CityState, studied: Set<string>): boolean {
  if (choice.needs && !has(state.placed, choice.needs)) return false;
  if (choice.build) {
    const b = choice.build;
    if (!unlocked(b, studied) || state.money < BUILDINGS[b].price || !freeSlot(state.placed, b)) return false;
  }
  return state.money >= (choice.cost ?? 0);
}

/** Play the day: apply the choice, run the city under the event, and settle the money. */
export function playDay(state: CityState, event: CityEvent, choice: Choice, level: number): { state: CityState; result: DayResult; before: DayResult } {
  const base = event.conditions(baseDemand(level));
  const before = simulate(state.placed, base);
  const placed = { ...state.placed };
  let money = state.money - (choice.cost ?? 0);
  if (choice.build) {
    const slot = freeSlot(placed, choice.build)!;
    placed[slot.id] = choice.build;
    money -= BUILDINGS[choice.build].price;
  }
  const conditions: Conditions = { ...base, ...choice.change };
  if (choice.change && "down" in choice.change && choice.change.down === undefined) delete conditions.down;
  const result = simulate(placed, conditions);
  money += result.income - result.upkeep;
  const history = [...state.history, { day: state.day, event: event.id, verdict: choice.verdict, errors: result.errors, latency: result.latency, income: result.income - result.upkeep }];
  const uptime = 1 - history.reduce((s, h) => s + h.errors, 0) / history.length;
  const seen = state.seen.includes(event.id) ? state.seen : [...state.seen, event.id];
  return {
    before,
    result,
    state: {
      ...state,
      placed,
      money: Math.round(money),
      day: state.day + 1,
      seen: seen.length >= EVENTS.length ? [] : seen,
      history: history.slice(-30),
      best: { uptime: Math.max(state.best.uptime, uptime), days: Math.max(state.best.days, state.day) },
    },
  };
}

/** Build on an empty slot, paying the price. */
export function build(state: CityState, slot: string, b: BuildingId): CityState | null {
  const s = SLOTS.find((x) => x.id === slot);
  if (!s || state.placed[slot] || !BUILDINGS[b].slots.includes(s.kind) || state.money < BUILDINGS[b].price) return null;
  return { ...state, placed: { ...state.placed, [slot]: b }, money: state.money - BUILDINGS[b].price };
}

/** Pull a building down: half its price comes back. */
export function demolish(state: CityState, slot: string): CityState {
  const b = state.placed[slot];
  if (!b) return state;
  const placed = { ...state.placed };
  delete placed[slot];
  return { ...state, placed, money: state.money + Math.round(BUILDINGS[b].price / 2) };
}

const KEY = "city";
export function readCity(): CityState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return v && typeof v === "object" && v.placed && typeof v.money === "number" ? { ...START, ...v } : START;
  } catch {
    return START;
  }
}

export function writeCity(s: CityState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: the city lasts for this visit */
  }
}
