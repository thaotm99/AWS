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

/**
 * One architecture lab: pick a service, then a slot (or drag the service onto it), and check the design
 * against ShopViet's requirements. The design is kept in this browser.
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
        <div key={slot.id} className="lab-slot fixed">
          <small>{L(slot.label)}</small>
          <b>{name}</b>
        </div>
      );
    }
    const label = service
      ? t("shell.lab.slotFilled", { slot: L(slot.label), service: name! })
      : picked
        ? t("shell.lab.slotPlace", { slot: L(slot.label), service: SERVICES[picked].name })
        : t("shell.lab.slotEmpty", { slot: L(slot.label) });
    return (
      <button key={slot.id} type="button" className="lab-slot" data-filled={service ? "" : undefined} data-target={picked ? "" : undefined}
        aria-label={label} title={label}
        onClick={() => {
          if (picked) {
            put(slot, picked);
            setPicked(null);
          } else if (service) put(slot, null);
        }}
        onDragOver={(e) => e.preventDefault()} onDrop={onDrop(slot)}>
        <small>{L(slot.label)}</small>
        <b>{name ?? (picked ? t("shell.lab.placeHere") : t("shell.lab.empty"))}</b>
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
    <div className="lab">
      <aside className="lab-side">
        <section aria-labelledby="lab-req">
          <h2 id="lab-req" className="lab-h">{t("shell.lab.requirements")}</h2>
          <ul className="lab-rules">
            {lab.rules.map((r, i) => (
              <li key={i} data-state={result ? (result[i] ? "pass" : "fail") : undefined}>
                <span className="lab-rule-state">{result ? (result[i] ? t("shell.lab.pass") : t("shell.lab.fail")) : `${i + 1}`}</span>
                <span>{L(r.text)}</span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="lab-svc">
          <h2 id="lab-svc" className="lab-h">{t("shell.lab.services")}</h2>
          <div className="lab-palette">
            {lab.services.map((s) => (
              <button key={s} type="button" className="lab-svc" aria-pressed={picked === s} draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", s);
                  setPicked(s);
                }}
                onClick={() => setPicked(picked === s ? null : s)}>
                <b>{SERVICES[s].name}</b>
                <small>{L(SERVICES[s].hint)}</small>
              </button>
            ))}
          </div>
          <p className="lab-tip" aria-live="polite">{picked ? t("shell.lab.pickedTip", { service: SERVICES[picked].name }) : t("shell.lab.tip")}</p>
        </section>
      </aside>

      <div className="lab-main">
        <div className="lab-board">
          {edge.length > 0 && <div className="lab-row lab-edge">{edge.map(slotView)}</div>}
          <div className="lab-region">
            <span className="lab-region-label">{t("shell.lab.region")}</span>
            {tiers.length > 0 && (
              <div className="lab-azs">
                {(["a", "b"] as const).map((z) => (
                  <div key={z} className="lab-az">
                    <span className="lab-az-label">AZ ap-southeast-1{z}</span>
                    {tiers.map((tier) => {
                      const slots = lab.slots.filter((s) => s.tier === tier && s.zone === z);
                      return slots.length ? slots.map(slotView) : <div key={tier} className="lab-slot none" aria-hidden="true" />;
                    })}
                  </div>
                ))}
              </div>
            )}
            {regional.length > 0 && <div className="lab-row">{regional.map(slotView)}</div>}
          </div>
        </div>

        <div className="lab-actions">
          <button type="button" className="btn primary" onClick={check}>{result ? t("shell.lab.recheck") : t("shell.lab.check")}</button>
          <button type="button" className="btn" onClick={() => setHint(true)}>{t("shell.lab.hint")}</button>
          <button type="button" className="btn" onClick={reset} disabled={!Object.keys(placement).length}>{t("shell.lab.reset")}</button>
          {done && !result && <span className="lab-done-tag">{t("shell.lab.doneBefore")}</span>}
        </div>

        <div aria-live="polite">
          {hint && !result?.every(Boolean) && <p className="lab-hint">{L(hintRule.hint)}</p>}
          {result && (
            <div className="lab-result" data-ok={result.every(Boolean) || undefined}>
              <b>{result.every(Boolean) ? t("shell.lab.allPass") : t("shell.lab.some", { n: passed, total: result.length })}</b>
              {result.every(Boolean) ? (
                <>
                  <p>{L(lab.done)}</p>
                  <p className="lab-links">
                    <a href={learn.href}>{t("shell.lab.read", { part: L(learn) })}</a>
                    {next ? <a className="btn primary" href={next.href}>{t("shell.lab.next", { title: L(next) })}</a> : <a className="btn" href="/lab/">{t("shell.lab.back")}</a>}
                  </p>
                </>
              ) : (
                <>
                  <p>{L(lab.rules[firstFail].why)}</p>
                  <p className="lab-links"><a href={learn.href}>{t("shell.lab.read", { part: L(learn) })}</a></p>
                </>
              )}
            </div>
          )}
        </div>
        <p className="lab-count">{t("shell.lab.count", { n, total })}</p>
      </div>
    </div>
  );
}
