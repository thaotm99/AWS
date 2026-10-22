import type { Locale, MessageKey, MessageParams } from "./types";

/** Looks up messages of one locale and fills "{name}" placeholders. */
export class Translator<M> {
  constructor(
    readonly locale: Locale,
    private readonly messages: M,
  ) {}

  /** Bound so components can pass `t` around as a plain function. */
  readonly t = (key: MessageKey<M>, params?: MessageParams): string => this.lookup(key, params);

  /** Untyped variant for keys read from the DOM. Unknown keys come back unchanged. */
  readonly lookup = (key: string, params?: MessageParams): string => {
    const raw = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], this.messages);
    if (typeof raw !== "string") return key;
    return params ? raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m)) : raw;
  };

  /** Translator limited to one branch, so a module writes "exam.check" instead of "practice.exam.check". */
  scope<K extends keyof M & string>(namespace: K): Translator<M[K]> {
    return new Translator(this.locale, this.messages[namespace]);
  }
}
