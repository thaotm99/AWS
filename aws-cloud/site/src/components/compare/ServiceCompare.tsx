import { useState } from "react";
import { useI18n } from "../../app/i18n";
import { compareById, recommend, type Text } from "../../lib/compare";

/** Table cells; cells in the recommended service's column are tinted (data-rec). */
const CELL = "border-t border-line px-3 py-2.5 text-left align-top data-rec:bg-accent-soft";
const HEAD = "bg-surface px-3 py-2.5 text-left align-top text-[0.875rem] data-rec:bg-accent-soft";
const ROW_HEAD = `${CELL} w-[24%]`;

interface Link {
  href: string;
  vi: string;
  en: string;
}

/** Pick the requirements of a situation; the table marks the service that fits and says why. */
export default function ServiceCompare({ id, learn }: { id: string; learn: Link }) {
  const { t, locale } = useI18n();
  const set = compareById(id)!;
  const [picked, setPicked] = useState<string[]>([]);
  const L = (x: Text) => x[locale] || x.vi;
  const rec = recommend(set, picked);
  const name = (sid: string) => set.services.find((s) => s.id === sid)!.name;
  const toggle = (nid: string) => setPicked((p) => (p.includes(nid) ? p.filter((x) => x !== nid) : [...p, nid]));
  const needs = set.needs.filter((n) => picked.includes(n.id));

  return (
    <div className="mb-10 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-[0.8125rem]" role="group" aria-label={t("shell.compare.needs")}>
        <span className="mr-1 text-muted">{t("shell.compare.pick")}</span>
        {set.needs.map((n) => (
          <button key={n.id} type="button" className="min-h-10 cursor-pointer rounded-[20px] border-2 border-line bg-surface px-3.5 py-1.5 text-left text-ink hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:font-semibold aria-pressed:shadow-[0_3px_0] aria-pressed:shadow-accent-strong" aria-pressed={picked.includes(n.id)} onClick={() => toggle(n.id)}>{L(n.text)}</button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-line">
        <table className="w-full min-w-[640px] border-collapse text-[0.8125rem] leading-[1.5]">
          <thead>
            <tr>
              <th scope="col" className={HEAD}>{t("shell.compare.feature")}</th>
              {set.services.map((s) => (
                <th key={s.id} scope="col" className={HEAD} data-rec={rec?.id === s.id || undefined}>
                  {s.name}
                  {rec?.id === s.id && <small className="block text-[0.75rem] font-medium text-accent">{rec.full ? t("shell.compare.fits") : t("shell.compare.partly")}</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {needs.map((n) => (
              <tr key={n.id}>
                <th scope="row" className={`${ROW_HEAD} font-semibold text-ink`}>{L(n.text)}</th>
                {set.services.map((s) => (
                  <td key={s.id} className={`${CELL} group`} data-rec={rec?.id === s.id || undefined} data-fit={n.fit[s.id].fit}>
                    <b className="font-bold group-data-[fit=no]:text-bad group-data-[fit=partial]:text-edge group-data-[fit=yes]:text-ok">{t(`shell.compare.fit.${n.fit[s.id].fit}`)}</b> {L(n.fit[s.id].why)}
                  </td>
                ))}
              </tr>
            ))}
            {set.rows.map((r, i) => (
              <tr key={i}>
                <th scope="row" className={`${ROW_HEAD} font-medium text-muted`}>{L(r.label)}</th>
                {set.services.map((s) => (
                  <td key={s.id} className={CELL} data-rec={rec?.id === s.id || undefined}>{L(r.cells[s.id])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 rounded-[18px] border-2 border-line bg-surface px-4 py-3.5 text-[0.9rem] leading-[1.6]" aria-live="polite">
        {!picked.length ? (
          <p className="m-0">{t("shell.compare.hint")}</p>
        ) : rec ? (
          <>
            <b>{t(rec.full ? "shell.compare.best" : "shell.compare.bestPartial", { name: name(rec.id) })}</b>
            <ul className="m-0 pl-[1.2em] text-muted">
              {needs.map((n) => <li key={n.id}>{L(n.fit[rec.id].why)}</li>)}
            </ul>
            {!rec.full && <p className="m-0">{L(set.combine)}</p>}
          </>
        ) : (
          <>
            <b>{t("shell.compare.none")}</b>
            <p className="m-0">{L(set.combine)}</p>
          </>
        )}
        <a href={learn.href}>{t("shell.compare.read", { part: L(learn) })}</a>
      </div>
    </div>
  );
}
