import type { PracticeTranslator } from "./useT";

/** Exam domains arrive in English ("Design Secure Architectures"); show them in the viewer's language when known. */
export function domainLabel({ lookup }: PracticeTranslator, domain: string): string {
  const key = `domains.${domain}`;
  const label = lookup(key);
  return label === key ? domain : label;
}
