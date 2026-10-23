import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../app/i18n";
import { NOTES_EVENT, readNotes, removeNote, toMarkdown, updateNote, type Highlight } from "../lib/notes";

/** Lower case without Vietnamese marks, so "do tre" finds "độ trễ". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();

/** /notes/: every highlight and note in this browser, by lesson part, with search and Markdown export. */
export default function NotesPage() {
  const { t, locale } = useI18n();
  const [list, setList] = useState<Highlight[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const sync = () => setList(readNotes());
    sync();
    const onStorage = (e: StorageEvent) => (e.key === "notes" || e.key === null) && sync();
    addEventListener(NOTES_EVENT, sync);
    addEventListener("storage", onStorage);
    return () => {
      removeEventListener(NOTES_EVENT, sync);
      removeEventListener("storage", onStorage);
    };
  }, []);

  const shown = useMemo(() => {
    const k = fold(q.trim());
    return list.filter((h) => !k || fold(`${h.quote} ${h.note} ${h.title.vi} ${h.title.en}`).includes(k)).sort((a, b) => b.at - a.at);
  }, [list, q]);
  const groups = useMemo(() => {
    const m = new Map<string, Highlight[]>();
    for (const h of shown) m.set(`${h.lesson}/${h.part}`, [...(m.get(`${h.lesson}/${h.part}`) ?? []), h]);
    return [...m.values()];
  }, [shown]);

  function exportMd() {
    const md = toMarkdown(list, locale, t("shell.notes.pageHeading"));
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "cloudlab-notes.md" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (!list.length) return <p className="np-empty">{t("shell.notes.none")}</p>;

  return (
    <div className="np">
      <div className="np-tools">
        <label className="gl-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("shell.notes.search")} aria-label={t("shell.notes.search")} />
        </label>
        <button type="button" className="btn" onClick={exportMd}>{t("shell.notes.export")}</button>
      </div>
      <p className="np-count" role="status">{t("shell.notes.count", { n: shown.length })}</p>
      {groups.map((g) => (
        <section key={`${g[0].lesson}/${g[0].part}`} className="np-group">
          <h2><a href={`/concepts/${g[0].lesson}/${g[0].part}/`}>{g[0].title[locale] || g[0].title.vi}</a></h2>
          <ul>
            {g.map((h) => (
              <li key={h.id} data-color={h.color}>
                <blockquote lang={h.lang}>{h.quote}</blockquote>
                <label>
                  <span className="sr-only">{t("shell.notes.note")}</span>
                  <textarea rows={2} defaultValue={h.note} placeholder={t("shell.notes.placeholder")} onChange={(e) => updateNote(h.id, { note: e.target.value })} />
                </label>
                <div className="np-actions">
                  <small>{new Date(h.at).toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN")}</small>
                  <button type="button" onClick={() => removeNote(h.id)}>{t("shell.notes.remove")}</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
