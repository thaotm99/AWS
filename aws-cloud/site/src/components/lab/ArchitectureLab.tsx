import { useEffect, useState, type DragEvent } from "react";
import { useI18n } from "../../app/i18n";
import { SERVICES, evaluate, labById, readLabs, writeLab, type Placement, type ServiceId, type Slot, type Tier } from "../../lib/labs";

interface Link {
  href: string;
  vi: string;
  en: string;
}

interface Props {
  id: string;
  n: number;
  total: number;
  learn: Link;
  next?: Link;
}

const ZONE_TIERS: Tier[] = ["public", "app", "data"];

/** A slot on the board; its look follows data-filled (a service placed) and data-target (a service picked). */
const SLOT = "flex min-h-16 flex-col justify-center gap-[3px] rounded-[14px] border-[1.5px] px-3 py-2.5 text-left max-sm:min-h-[60px] max-sm:p-2";
const SLOT_OPEN = `${SLOT} cursor-pointer border-dashed border-line bg-surface text-muted data-filled:border-solid data-filled:border-accent data-filled:bg-accent-soft data-filled:text-ink data-target:border-accent data-target:text-ink data-target:ring-3 data-target:ring-accent/25`;
const AREA_LABEL = "font-mono text-[0.75rem] text-muted";
const RESULT_P = "m-0 text-[0.9rem] leading-[1.6] text-muted";
const LINKS = "mx-0 mt-1.5 mb-0 flex flex-wrap items-center gap-3 text-[0.9rem] leading-[1.6] text-muted";

/**
 * One architecture lab: pick a service, then a slot (or drag the service onto it), and check the design
 * against MFTECH's requirements. The design is kept in this browser.
 */
export default function ArchitectureLab({ id, n, total, learn, next }: Props) {
  const { t, locale } = useI18n();
  const lab = labById(id)!;
  const [placement, setPlacement] = useState<Placement>({});
  const [picked, setPicked] = useState<ServiceId | null>(null);
  const [result, setResult] = useState<boolean[] | null>(null);
  const [hint, setHint] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const saved = readLabs()[id];
    if (saved) {
      setPlacement(saved.placement ?? {});
      setDone(!!saved.done);
    }
  }, [id]);

  const L = (x: { vi: string; en: string }) => x[locale] || x.vi;
  const update = (next: Placement) => {
    setPlacement(next);
    setResult(null);
    setHint(false);
    writeLab(id, { placement: next, done });
  };

  function put(slot: Slot, service: ServiceId | null) {
    if (slot.fixed) return;
    const next = { ...placement };
    if (service) next[slot.id] = service;
    else delete next[slot.id];
    update(next);
  }

  function check() {
    const r = evaluate(lab, placement);
    setResult(r);
    setHint(false);
    if (r.every(Boolean)) {
      setDone(true);
      writeLab(id, { placement, done: true });
    }
  }

  function reset() {
    setPicked(null);
    update({});
  }

  const onDrop = (slot: Slot) => (e: DragEvent) => {
    e.preventDefault();
    const s = e.dataTransfer.getData("text/plain") as ServiceId;
    if (SERVICES[s]) put(slot, s);
    setPicked(null);
  };

  function slotView(slot: Slot) {
    const service = slot.fixed ?? placement[slot.id];
    const name = service ? SERVICES[service].name : null;
    if (slot.fixed) {
      return (
        <div key={slot.id} className={`${SLOT} border-solid border-line bg-bg text-ink`}>
          <small className="text-[0.75rem] text-muted">{L(slot.label)}</small>
          <b className="text-[0.875rem] font-semibold">{name}</b>
        </div>
      );
    }
    const label = service
      ? t("shell.lab.slotFilled", { slot: L(slot.label), service: name! })
      : picked
        ? t("shell.lab.slotPlace", { slot: L(slot.label), service: SERVICES[picked].name })
        : t("shell.lab.slotEmpty", { slot: L(slot.label) });
    return (
      <button key={slot.id} type="button" className={SLOT_OPEN} data-filled={service ? "" : undefined} data-target={picked ? "" : undefined}
        aria-label={label} title={label}
        onClick={() => {
          if (picked) {
            put(slot, picked);
            setPicked(null);
          } else if (service) put(slot, null);
        }}
        onDragOver={(e) => e.preventDefault()} onDrop={onDrop(slot)}>
        <small className="text-[0.75rem]">{L(slot.label)}</small>
        <b className="text-[0.875rem] font-semibold">{name ?? (picked ? t("shell.lab.placeHere") : t("shell.lab.empty"))}</b>
      </button>
    );
  }

  const edge = lab.slots.filter((s) => s.tier === "edge");
  const regional = lab.slots.filter((s) => s.tier === "regional");
  const tiers = ZONE_TIERS.filter((tier) => lab.slots.some((s) => s.tier === tier));
  const passed = result?.filter(Boolean).length ?? 0;
  const firstFail = result ? result.findIndex((r) => !r) : -1;
  const hintRule = lab.rules[result ? Math.max(0, firstFail) : evaluate(lab, placement).findIndex((r) => !r)] ?? lab.rules[0];

  return (
    <div className="mb-10 grid grid-cols-[300px_minmax(0,1fr)] items-start gap-6 max-lg:grid-cols-1">
      <aside className="flex flex-col gap-5">
        <section aria-labelledby="lab-req">
          <h2 id="lab-req" className="mb-2.5 text-[0.875rem] font-semibold">{t("shell.lab.requirements")}</h2>
          <ul className="flex flex-col gap-2 text-[0.8125rem] leading-[1.5]">
            {lab.rules.map((r, i) => (
              <li key={i} className="group flex gap-2.5 rounded-[14px] border-2 border-line bg-surface px-3 py-2.5 data-[state=fail]:border-edge data-[state=fail]:bg-edge-soft data-[state=pass]:border-ok data-[state=pass]:bg-ok-soft" data-state={result ? (result[i] ? "pass" : "fail") : undefined}>
                <span className="min-w-[34px] flex-none font-mono font-semibold text-muted group-data-[state=fail]:text-edge group-data-[state=pass]:text-ok">{result ? (result[i] ? t("shell.lab.pass") : t("shell.lab.fail")) : `${i + 1}`}</span>
                <span>{L(r.text)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="lab-svc">
          <h2 id="lab-svc" className="mb-2.5 text-[0.875rem] font-semibold">{t("shell.lab.services")}</h2>
          <div className="grid grid-cols-1 gap-2 max-lg:grid-cols-2">
            {lab.services.map((s) => (
              <button key={s} type="button" className="flex min-h-12 cursor-grab flex-col items-start gap-0.5 rounded-[14px] border-2 border-line bg-surface px-3 py-2 text-left text-ink shadow-[0_4px_0] shadow-line hover:border-accent aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:shadow-none aria-pressed:ring-2 aria-pressed:ring-accent" aria-pressed={picked === s} draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", s);
                  setPicked(s);
                }}
                onClick={() => setPicked(picked === s ? null : s)}>
                <b className="text-[0.875rem]">{SERVICES[s].name}</b>
                <small className="text-[0.75rem] leading-[1.4] text-muted max-sm:hidden">{L(SERVICES[s].hint)}</small>
              </button>
            ))}
          </div>
          <p className="mt-2.5 mb-0 text-[0.75rem] leading-[1.5] text-muted" aria-live="polite">{picked ? t("shell.lab.pickedTip", { service: SERVICES[picked].name }) : t("shell.lab.tip")}</p>
        </section>
      </aside>

      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex flex-col gap-3 rounded-lg border-2 border-line bg-bg p-4 max-sm:p-2.5">
          {edge.length > 0 && <div className="flex flex-wrap gap-3 border-b border-dashed border-line pb-3 *:flex-[1_1_200px]">{edge.map(slotView)}</div>}
          <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-surface p-3.5 max-sm:p-2.5">
            <span className={AREA_LABEL}>{t("shell.lab.region")}</span>
            {tiers.length > 0 && (
              <div className="grid grid-cols-2 gap-3 max-sm:gap-2">
                {(["a", "b"] as const).map((z) => (
                  <div key={z} className="flex flex-col gap-2.5 rounded-[18px] border border-dashed border-muted/45 p-3 max-sm:p-2">
                    <span className={AREA_LABEL}>AZ ap-southeast-1{z}</span>
                    {tiers.map((tier) => {
                      const slots = lab.slots.filter((s) => s.tier === tier && s.zone === z);
                      return slots.length ? slots.map(slotView) : <div key={tier} className={`${SLOT} invisible`} aria-hidden="true" />;
                    })}
                  </div>
                ))}
              </div>
            )}
            {regional.length > 0 && <div className="flex flex-wrap gap-3 *:flex-[1_1_200px]">{regional.map(slotView)}</div>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn primary min-h-11 px-4 py-0" onClick={check}>{result ? t("shell.lab.recheck") : t("shell.lab.check")}</button>
          <button type="button" className="btn min-h-11 px-4 py-0" onClick={() => setHint(true)}>{t("shell.lab.hint")}</button>
          <button type="button" className="btn min-h-11 px-4 py-0" onClick={reset} disabled={!Object.keys(placement).length}>{t("shell.lab.reset")}</button>
          {done && !result && <span className="text-[0.8125rem] font-semibold text-ok">{t("shell.lab.doneBefore")}</span>}
        </div>

        <div aria-live="polite">
          {hint && !result?.every(Boolean) && <p className="m-0 rounded-[14px] bg-accent-soft px-3.5 py-3 text-[0.875rem]">{L(hintRule.hint)}</p>}
          {result && (
            <div className="flex flex-col gap-1.5 rounded-[18px] border border-edge bg-surface px-4 py-3.5 data-ok:border-ok" data-ok={result.every(Boolean) || undefined}>
              <b>{result.every(Boolean) ? t("shell.lab.allPass") : t("shell.lab.some", { n: passed, total: result.length })}</b>
              {result.every(Boolean) ? (
                <>
                  <p className={RESULT_P}>{L(lab.done)}</p>
                  <p className={LINKS}>
                    <a href={learn.href}>{t("shell.lab.read", { part: L(learn) })}</a>
                    {next ? <a className="btn primary min-h-10 no-underline" href={next.href}>{t("shell.lab.next", { title: L(next) })}</a> : <a className="btn min-h-10 no-underline" href="/lab/">{t("shell.lab.back")}</a>}
                  </p>
                </>
              ) : (
                <>
                  <p className={RESULT_P}>{L(lab.rules[firstFail].why)}</p>
                  <p className={LINKS}><a href={learn.href}>{t("shell.lab.read", { part: L(learn) })}</a></p>
                </>
              )}
            </div>
          )}
        </div>
        <p className="m-0 text-[0.75rem] text-muted">{t("shell.lab.count", { n, total })}</p>
      </div>
    </div>
  );
}
