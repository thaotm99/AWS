type Handler<E> = (event: E) => void | Promise<void>;

/** Typed publish/subscribe. The UI only emits events; controllers subscribe and act. */
export class EventBus<E extends { type: string }> {
  private readonly handlers = new Map<E["type"], Set<Handler<E>>>();

  on<T extends E["type"]>(type: T, handler: Handler<Extract<E, { type: T }>>): () => void {
    let set = this.handlers.get(type);
    if (!set) this.handlers.set(type, (set = new Set()));
    set.add(handler as Handler<E>);
    return () => set.delete(handler as Handler<E>);
  }

  emit(event: E): void {
    for (const handler of this.handlers.get(event.type as E["type"]) ?? []) {
      Promise.resolve(handler(event)).catch((e) => console.error(`[practice] ${event.type} failed`, e));
    }
  }
}
