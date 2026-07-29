import type { OutboxHandler } from "./types.js";

/**
 * Handler registry.
 *
 * Empty in S02. Registering nothing is deliberate: an unrecognised event type
 * must be an explicit, visible failure rather than a silent discard, so the
 * loop dead-letters it into admin operations instead of acknowledging it.
 */

export class UnknownEventTypeError extends Error {
  public readonly eventType: string;

  constructor(eventType: string) {
    super(`No handler is registered for outbox event type "${eventType}"`);
    this.name = "UnknownEventTypeError";
    this.eventType = eventType;
  }
}

export class HandlerRegistry {
  readonly #handlers = new Map<string, OutboxHandler>();

  register(eventType: string, handler: OutboxHandler): this {
    if (this.#handlers.has(eventType)) {
      throw new Error(`Duplicate handler registration for "${eventType}"`);
    }
    this.#handlers.set(eventType, handler);
    return this;
  }

  has(eventType: string): boolean {
    return this.#handlers.has(eventType);
  }

  resolve(eventType: string): OutboxHandler {
    const handler = this.#handlers.get(eventType);
    if (handler === undefined) {
      throw new UnknownEventTypeError(eventType);
    }
    return handler;
  }

  get size(): number {
    return this.#handlers.size;
  }
}

/** The S02 registry: no job types exist yet. */
export function createHandlerRegistry(): HandlerRegistry {
  return new HandlerRegistry();
}
