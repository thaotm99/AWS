import { useState } from "react";
import { useI18n } from "../../app/i18n";
import { compareById, recommend, type Text } from "../../lib/compare";

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
    <div className="cmp">
      <div className="cmp-needs" role="group" aria-label={t("shell.compare.needs")}>
        <span>{t("shell.compare.pick")}</span>
        {set.needs.map((n) => (
          <button key={n.id} type="button" aria-pressed={picked.includes(n.id)} onClick={() => toggle(n.id)}>{L(n.text)}</button>
        ))}
      </div>

      <div className="cmp-table-wrap">
        <table className="cmp-table">
          <thead>
            <tr>
              <th scope="col">{t("shell.compare.feature")}</th>
              {set.services.map((s) => (
                <th key={s.id} scope="col" data-rec={rec?.id === s.id || undefined}>
                  {s.name}
                  {rec?.id === s.id && <small>{rec.full ? t("shell.compare.fits") : t("shell.compare.partly")}</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {needs.map((n) => (
              <tr key={n.id} className="cmp-need-row">
                <th scope="row">{L(n.text)}</th>
                {set.services.map((s) => (
                  <td key={s.id} data-rec={rec?.id === s.id || undefined} data-fit={n.fit[s.id].fit}>
                    <b>{t(`shell.compare.fit.${n.fit[s.id].fit}`)}</b> {L(n.fit[s.id].why)}
                  </td>
                ))}
              </tr>
            ))}
            {set.rows.map((r, i) => (
              <tr key={i}>
                <th scope="row">{L(r.label)}</th>
                {set.services.map((s) => (
                  <td key={s.id} data-rec={rec?.id === s.id || undefined}>{L(r.cells[s.id])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cmp-verdict" aria-live="polite">
        {!picked.length ? (
          <p>{t("shell.compare.hint")}</p>
        ) : rec ? (
          <>
            <b>{t(rec.full ? "shell.compare.best" : "shell.compare.bestPartial", { name: name(rec.id) })}</b>
            <ul>
              {needs.map((n) => <li key={n.id}>{L(n.fit[rec.id].why)}</li>)}
            </ul>
            {!rec.full && <p>{L(set.combine)}</p>}
          </>
        ) : (
          <>
            <b>{t("shell.compare.none")}</b>
            <p>{L(set.combine)}</p>
          </>
        )}
        <a href={learn.href}>{t("shell.compare.read", { part: L(learn) })}</a>
      </div>
    </div>
  );
}
