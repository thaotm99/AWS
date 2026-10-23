import { useState } from "react";
import { useI18n } from "../../app/i18n";
import { HOURS_PER_MONTH, NAT, PRICES_CHECKED, REGION_NAMES, S3_CLASSES, natMonthly, s3Monthly, type PriceRegion } from "../../lib/pricing";

/** Monthly cost of a design choice, with the inputs that drive it. Prices: lib/pricing.ts. */
export default function CostEstimator({ preset }: { preset: "nat-endpoint" | "s3-classes" }) {
  return preset === "nat-endpoint" ? <NatVsEndpoint /> : <S3Classes />;
}

// Shared Tailwind class lists for the two estimators.
const FIGURE = "my-4.5 flex flex-col gap-3.5 rounded-[20px] border border-line bg-surface px-4.5 py-4";
const RANGE = "flex flex-col gap-1.5 text-[0.8125rem] text-muted";
const RANGE_HEAD = "flex justify-between gap-3";
const RANGE_INPUT = "min-h-7 w-full accent-accent";
const CHOICE = "flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-muted";
const CHOICE_BUTTON = "min-h-9 min-w-10 cursor-pointer rounded-sm border border-line bg-bg px-3 text-ink aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:font-semibold";
const OPTION = "flex flex-col gap-2.5 rounded-[18px] border bg-bg p-3.5";
const TOTAL = "font-mono text-[1.35rem] font-semibold";
const BAR = "h-2 overflow-hidden rounded-[4px] bg-line";
const BAR_FILL = "block h-full transition-[width] duration-250 ease-[ease]";
const COSTS = "m-0 flex flex-col gap-1 text-[0.8125rem]";
const COST_ROW = "flex justify-between gap-2.5";
const RESULT = "m-0 rounded-[14px] bg-accent-soft px-3 py-2.5 text-[0.875rem] leading-[1.6]";
const CELL = "border-t border-line px-1.5 py-2 align-top";

function useMoney() {
  const { locale } = useI18n();
  return (n: number) => `$${n.toLocaleString(locale === "en" ? "en-US" : "vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Footnote({ page }: { page: string }) {
  const { t } = useI18n();
  return (
    <p className="m-0 text-[0.75rem] text-muted">
      {t("shell.cost.note", { date: PRICES_CHECKED })} <a href={page} target="_blank" rel="noopener">{t("shell.cost.pricing")}</a>
    </p>
  );
}

function NatVsEndpoint() {
  const { t, locale } = useI18n();
  const money = useMoney();
  const [tb, setTb] = useState(2);
  const [region, setRegion] = useState<PriceRegion>("ap-southeast-1");
  const [gateways, setGateways] = useState(1);
  const gb = tb * 1024;
  const nat = natMonthly(region, gateways, gb);
  const p = NAT[region];
  const max = Math.max(nat.total, 1);
  const num = (n: number) => n.toLocaleString(locale === "en" ? "en-US" : "vi-VN");

  return (
    <figure className={FIGURE}>
      <figcaption className="text-[0.95rem] font-bold">{t("shell.cost.natTitle")}</figcaption>
      <div className="flex flex-col gap-3">
        <label className={RANGE}>
          <span className={RANGE_HEAD}>{t("shell.cost.dataMonth")} <b className="font-mono text-ink">{num(tb)} TB</b></span>
          <input type="range" className={RANGE_INPUT} min={0} max={20} step={0.5} value={tb} onChange={(e) => setTb(Number(e.target.value))} />
        </label>
        <div className={CHOICE} role="group" aria-label={t("shell.cost.region")}>
          <span className="mr-1">{t("shell.cost.region")}</span>
          {(Object.keys(NAT) as PriceRegion[]).map((r) => (
            <button key={r} type="button" className={CHOICE_BUTTON} aria-pressed={region === r} onClick={() => setRegion(r)}>{REGION_NAMES[r][locale] || REGION_NAMES[r].vi}</button>
          ))}
        </div>
        <div className={CHOICE} role="group" aria-label={t("shell.cost.gateways")}>
          <span className="mr-1">{t("shell.cost.gateways")}</span>
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" className={CHOICE_BUTTON} aria-pressed={gateways === n} onClick={() => setGateways(n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
        <div className={OPTION + " border-edge"} data-tone="cost">
          <div className="flex items-baseline justify-between gap-2"><b>NAT gateway</b><span className={TOTAL + " text-edge"}>{money(nat.total)}</span></div>
          <div className={BAR}><i className={BAR_FILL + " bg-edge"} style={{ width: `${(nat.total / max) * 100}%` }} /></div>
          <dl className={COSTS}>
            <div className={COST_ROW}><dt className="text-muted">{t("shell.cost.natHours", { n: gateways, hours: HOURS_PER_MONTH, price: money(p.hour) })}</dt><dd className="m-0 font-mono">{money(nat.hours)}</dd></div>
            <div className={COST_ROW}><dt className="text-muted">{t("shell.cost.natData", { gb: num(gb), price: money(p.gb) })}</dt><dd className="m-0 font-mono">{money(nat.data)}</dd></div>
          </dl>
        </div>
        <div className={OPTION + " border-ok"} data-tone="save">
          <div className="flex items-baseline justify-between gap-2"><b>{t("shell.cost.gateway")}</b><span className={TOTAL + " text-ok"}>{money(0)}</span></div>
          <div className={BAR}><i className={BAR_FILL + " bg-edge"} style={{ width: "0%" }} /></div>
          <dl className={COSTS}>
            <div className={COST_ROW}><dt className="text-muted">{t("shell.cost.gatewayFree")}</dt><dd className="m-0 font-mono">{money(0)}</dd></div>
          </dl>
        </div>
      </div>
      <p className={RESULT} aria-live="polite">{t("shell.cost.natResult", { tb: num(tb), save: money(nat.data) , hours: money(nat.hours) })}</p>
      <Footnote page="https://aws.amazon.com/vpc/pricing/" />
    </figure>
  );
}

function S3Classes() {
  const { t, locale } = useI18n();
  const money = useMoney();
  const [tb, setTb] = useState(50);
  const [read, setRead] = useState(5);
  const gb = tb * 1024;
  const rows = S3_CLASSES.map((c) => ({ c, ...s3Monthly(c, gb, read / 100) }));
  const cheapest = (list: typeof rows) => list.reduce((a, b) => (b.total < a.total ? b : a));
  // Objects in the restore classes cannot be read straight away, so they are compared apart.
  const best = cheapest(rows.filter((r) => !r.c.restore));
  const archive = cheapest(rows.filter((r) => r.c.restore));
  const max = Math.max(...rows.map((r) => r.total), 1);
  const num = (n: number) => n.toLocaleString(locale === "en" ? "en-US" : "vi-VN");

  return (
    <figure className={FIGURE}>
      <figcaption className="text-[0.95rem] font-bold">{t("shell.cost.s3Title")}</figcaption>
      <div className="flex flex-col gap-3">
        <label className={RANGE}>
          <span className={RANGE_HEAD}>{t("shell.cost.stored")} <b className="font-mono text-ink">{num(tb)} TB</b></span>
          <input type="range" className={RANGE_INPUT} min={1} max={500} step={1} value={tb} onChange={(e) => setTb(Number(e.target.value))} />
        </label>
        <label className={RANGE}>
          <span className={RANGE_HEAD}>{t("shell.cost.readShare")} <b className="font-mono text-ink">{read}%</b></span>
          <input type="range" className={RANGE_INPUT} min={0} max={100} step={1} value={read} onChange={(e) => setRead(Number(e.target.value))} />
        </label>
      </div>
      <table className="w-full border-collapse text-[0.8125rem] max-sm:text-[0.75rem]">
        <thead>
          <tr className="*:px-1.5 *:py-2 *:align-top *:font-medium *:text-muted">
            <th scope="col" className="text-left">{t("shell.cost.class")}</th>
            <th scope="col" className="text-right">{t("shell.cost.storage")}</th>
            <th scope="col" className="text-right">{t("shell.cost.retrieval")}</th>
            <th scope="col" className="text-right">{t("shell.cost.month")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.c.id} data-best={r === best || undefined} className={r === best ? "text-ok *:font-semibold" : undefined}>
              <th scope="row" className={CELL + " text-left"}>
                {r.c.name}
                <small className="block text-[0.75rem] font-normal text-muted">
                  {r.c.restore ? t("shell.cost.restore") : r.c.minDays ? t("shell.cost.minDays", { n: r.c.minDays }) : t("shell.cost.instant")}
                  {r.c.id === "onezone-ia" && ` · ${t("shell.cost.oneAz")}`}
                </small>
              </th>
              <td className={CELL + " text-right font-mono"}>{money(r.storage)}</td>
              <td className={CELL + " text-right font-mono"}>{money(r.retrieval)}</td>
              <td className={CELL + " text-right font-mono"}><span className={BAR + " mr-2 inline-block w-[60px] align-middle max-sm:hidden"}><i className={BAR_FILL + " bg-accent"} style={{ width: `${(r.total / max) * 100}%` }} /></span>{money(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={RESULT} aria-live="polite">
        {t("shell.cost.s3Result", { name: best.c.name, cost: money(best.total) })}
        {archive.total < best.total && ` ${t("shell.cost.s3Archive", { name: archive.c.name, cost: money(archive.total) })}`}
      </p>
      <p className="m-0 text-[0.75rem] text-muted">{t("shell.cost.s3Region")}</p>
      <Footnote page="https://aws.amazon.com/s3/pricing/" />
    </figure>
  );
}
