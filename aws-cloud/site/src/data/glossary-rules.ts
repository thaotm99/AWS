// Small glossary helpers safe for browser code: importing glossary.ts would ship every term.

/** An alias in capitals only (optionally a plural "s") is an acronym and matches with its exact case. */
export const ACRONYM = /^[A-Z0-9][A-Z0-9-]*s?$/;

/** Tokens in a term's `flow` drawn as connectors rather than boxes. */
export const FLOW_ARROWS = ["→", "←", "⇄", "⊃", "+", "=", "∩"];

/** Every spelling of a term; the display name counts unless it carries brackets or a slash. */
export function spellings(t: { name: string; aliases: string[] }): string[] {
  return [...(/[(/]/.test(t.name) ? [] : [t.name]), ...t.aliases];
}
