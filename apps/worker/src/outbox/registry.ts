import type { OutboxHandler } from "./types.js";
import {
  EMAIL_EVENT,
  WHATSAPP_EVENT,
  emailHandler,
  whatsAppHandler,
  type CommunicationHandlerDependencies,
} from "./handlers.js";

/**
 * Handler registry.
 *
 * Registering nothing in bare unit tests is deliberate: an unrecognised event type
 * must be an explicit, visible failure rather than a silent discard, so the
 * loop dead-letters it into admin operations instead of acknowledging it.
 */

export const BOOKING_REQUESTED_EVENT = "booking.requested";
export const BOOKING_REVIEW_REQUESTED_EVENT = "booking.review_requested";

const acknowledgeOnlyHandler: OutboxHandler = async () => undefined;

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

/**
 * Creates the worker handler registry.
 *
 * Tests may call this without dependencies to assert the bare registry behavior;
 * the production worker passes dependencies and receives the communication
 * handlers that send/log email and WhatsApp events.
 */
export function createHandlerRegistry(
  dependencies?: CommunicationHandlerDependencies,
): HandlerRegistry {
  const registry = new HandlerRegistry();
  if (dependencies !== undefined) {
    registry.register(EMAIL_EVENT, emailHandler(dependencies));
    registry.register(WHATSAPP_EVENT, whatsAppHandler(dependencies));
    registry.register(BOOKING_REQUESTED_EVENT, acknowledgeOnlyHandler);
    registry.register(BOOKING_REVIEW_REQUESTED_EVENT, acknowledgeOnlyHandler);
  }
  return registry;
}
