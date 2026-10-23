// Spaced repetition for the flashcards page (Leitner boxes), kept in this browser.
// A card the learner remembers moves up a box and comes back after a longer gap; one they forget
// drops to box 0 (not learned yet) and comes back in the same session.

/** Days until a card in box n (1-based) is due again. */
export const BOX_DAYS = [1, 3, 7, 14, 30] as const;
export const NEW_PER_SESSION = 10;

export interface CardState {
  /** 0: seen but not remembered yet; 1–5: remembered, each box waiting longer. */
  box: number;
  /** Day the card is due, as days since 1970-01-01 in local time. */
  due: number;
}

export type Deck = Record<string, CardState>;

const KEY = "flashcards";

/** Today as a local day number, so a card due "tomorrow" turns up after midnight, not after 24 hours. */
export function today(now = new Date()): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000);
}

export function readDeck(): Deck {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

export function writeDeck(deck: Deck) {
  try {
    localStorage.setItem(KEY, JSON.stringify(deck));
  } catch {
    /* storage blocked: the session still works, it just isn't remembered */
  }
}

/** Card state after an answer. */
export function grade(state: CardState | undefined, remembered: boolean, day: number): CardState {
  if (!remembered) return { box: 0, due: day };
  const box = Math.min((state?.box ?? 0) + 1, BOX_DAYS.length);
  return { box, due: day + BOX_DAYS[box - 1] };
}

/**
 * A session: cards due today (most overdue first), then up to NEW_PER_SESSION cards never seen,
 * in the order given (study-path order).
 */
export function sessionCards(ids: readonly string[], deck: Deck, day: number): string[] {
  const due = ids.filter((id) => deck[id] && deck[id].due <= day).sort((a, b) => deck[a].due - deck[b].due);
  const fresh = ids.filter((id) => !deck[id]).slice(0, NEW_PER_SESSION);
  return [...due, ...fresh];
}

/** How many of the cards sit in each box (index 0 = never seen or not remembered yet). */
export function boxCounts(ids: readonly string[], deck: Deck): number[] {
  const counts = Array(BOX_DAYS.length + 1).fill(0);
  for (const id of ids) counts[deck[id]?.box ?? 0]++;
  return counts;
}
