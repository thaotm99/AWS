import { useState } from "react";
import { useI18n } from "../../app/i18n";
import { HOURS_PER_MONTH, NAT, PRICES_CHECKED, REGION_NAMES, S3_CLASSES, natMonthly, s3Monthly, type PriceRegion } from "../../lib/pricing";

/** Monthly cost of a design choice, with the inputs that drive it. Prices: lib/pricing.ts. */
export default function CostEstimator({ preset }: { preset: "nat-endpoint" | "s3-classes" }) {
  return preset === "nat-endpoint" ? <NatVsEndpoint /> : <S3Classes />;
}

function useMoney() {
  const { locale } = useI18n();
  return (n: number) => `$${n.toLocaleString(locale === "en" ? "en-US" : "vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Footnote({ page }: { page: string }) {
  const { t } = useI18n();
  return (
    <p className="ce-note">
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
    <figure className="ce">
      <figcaption className="ce-title">{t("shell.cost.natTitle")}</figcaption>
      <div className="ce-inputs">
        <label className="ce-range">
          <span>{t("shell.cost.dataMonth")} <b>{num(tb)} TB</b></span>
          <input type="range" min={0} max={20} step={0.5} value={tb} onChange={(e) => setTb(Number(e.target.value))} />
        </label>
        <div className="ce-choice" role="group" aria-label={t("shell.cost.region")}>
          <span>{t("shell.cost.region")}</span>
          {(Object.keys(NAT) as PriceRegion[]).map((r) => (
            <button key={r} type="button" aria-pressed={region === r} onClick={() => setRegion(r)}>{REGION_NAMES[r][locale] || REGION_NAMES[r].vi}</button>
          ))}
        </div>
        <div className="ce-choice" role="group" aria-label={t("shell.cost.gateways")}>
          <span>{t("shell.cost.gateways")}</span>
          {[1, 2, 3].map((n) => (
            <button key={n} type="button" aria-pressed={gateways === n} onClick={() => setGateways(n)}>{n}</button>
          ))}
        </div>
      </div>
      <div className="ce-options">
        <div className="ce-option" data-tone="cost">
          <div className="ce-head"><b>NAT gateway</b><span className="ce-total">{money(nat.total)}</span></div>
          <div className="ce-bar"><i style={{ width: `${(nat.total / max) * 100}%` }} /></div>
          <dl>
            <div><dt>{t("shell.cost.natHours", { n: gateways, hours: HOURS_PER_MONTH, price: money(p.hour) })}</dt><dd>{money(nat.hours)}</dd></div>
            <div><dt>{t("shell.cost.natData", { gb: num(gb), price: money(p.gb) })}</dt><dd>{money(nat.data)}</dd></div>
          </dl>
        </div>
        <div className="ce-option" data-tone="save">
          <div className="ce-head"><b>{t("shell.cost.gateway")}</b><span className="ce-total">{money(0)}</span></div>
          <div className="ce-bar"><i style={{ width: "0%" }} /></div>
          <dl>
            <div><dt>{t("shell.cost.gatewayFree")}</dt><dd>{money(0)}</dd></div>
          </dl>
        </div>
      </div>
      <p className="ce-result" aria-live="polite">{t("shell.cost.natResult", { tb: num(tb), save: money(nat.data) , hours: money(nat.hours) })}</p>
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
    <figure className="ce">
      <figcaption className="ce-title">{t("shell.cost.s3Title")}</figcaption>
      <div className="ce-inputs">
        <label className="ce-range">
          <span>{t("shell.cost.stored")} <b>{num(tb)} TB</b></span>
          <input type="range" min={1} max={500} step={1} value={tb} onChange={(e) => setTb(Number(e.target.value))} />
        </label>
        <label className="ce-range">
          <span>{t("shell.cost.readShare")} <b>{read}%</b></span>
          <input type="range" min={0} max={100} step={1} value={read} onChange={(e) => setRead(Number(e.target.value))} />
        </label>
      </div>
      <table className="ce-table">
        <thead>
          <tr><th scope="col">{t("shell.cost.class")}</th><th scope="col">{t("shell.cost.storage")}</th><th scope="col">{t("shell.cost.retrieval")}</th><th scope="col">{t("shell.cost.month")}</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.c.id} data-best={r === best || undefined}>
              <th scope="row">
                {r.c.name}
                <small>
                  {r.c.restore ? t("shell.cost.restore") : r.c.minDays ? t("shell.cost.minDays", { n: r.c.minDays }) : t("shell.cost.instant")}
                  {r.c.id === "onezone-ia" && ` · ${t("shell.cost.oneAz")}`}
                </small>
              </th>
              <td>{money(r.storage)}</td>
              <td>{money(r.retrieval)}</td>
              <td><span className="ce-cell-bar"><i style={{ width: `${(r.total / max) * 100}%` }} /></span>{money(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ce-result" aria-live="polite">
        {t("shell.cost.s3Result", { name: best.c.name, cost: money(best.total) })}
        {archive.total < best.total && ` ${t("shell.cost.s3Archive", { name: archive.c.name, cost: money(archive.total) })}`}
      </p>
      <p className="ce-note">{t("shell.cost.s3Region")}</p>
      <Footnote page="https://aws.amazon.com/s3/pricing/" />
    </figure>
  );
}
