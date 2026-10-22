import { FLOW_ARROWS } from "../../data/glossary-rules";

interface Props {
  flow: string[];
  /** "both" renders each label in both languages for CSS to pick (static pages); otherwise one language. */
  lang: "vi" | "en" | "both";
}

/** "Người dùng|User" → ["Người dùng", "User"]; a plain label is the same in both languages. */
function forms(label: string): [string, string] {
  const [vi, en = vi] = label.split("|");
  return [vi, en];
}

function Label({ label, lang }: { label: string; lang: Props["lang"] }) {
  const [vi, en] = forms(label);
  if (lang === "vi") return <>{vi}</>;
  if (lang === "en") return <>{en}</>;
  return vi === en ? <>{vi}</> : <><span data-lang="vi">{vi}</span><span data-lang="en">{en}</span></>;
}

/** A glossary term's figure: boxes joined by arrows, with a light running along underneath. */
export default function FlowFigure({ flow, lang }: Props) {
  const text = flow.map((f) => forms(f)[lang === "en" ? 1 : 0]).join(" ");
  return (
    <div className="gl-flow" role="img" aria-label={text}>
      <div className="gl-flow-row">
        {flow.map((f, i) =>
          FLOW_ARROWS.includes(f) ? (
            <span key={i} className="gl-flow-arrow" aria-hidden="true">{f}</span>
          ) : (
            <span key={i} className="gl-flow-box"><Label label={f} lang={lang} /></span>
          ),
        )}
      </div>
      <span className="gl-flow-track" aria-hidden="true"><i /></span>
    </div>
  );
}
