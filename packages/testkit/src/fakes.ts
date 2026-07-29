import type { Clock, IdGenerator } from "@chefmate/application";

/**
 * Deterministic implementations of the ambient-capability ports.
 *
 * Section 18 requires tests that freeze time (notably at Johannesburg day
 * boundaries) and produce stable identifiers.
 */

export class FakeClock implements Clock {
  #current: Date;

  constructor(initial: Date | string = "2026-01-01T00:00:00.000Z") {
    this.#current = typeof initial === "string" ? new Date(initial) : new Date(initial);
  }

  now(): Date {
    return new Date(this.#current);
  }

  advanceMs(milliseconds: number): void {
    this.#current = new Date(this.#current.getTime() + milliseconds);
  }

  set(value: Date | string): void {
    this.#current = typeof value === "string" ? new Date(value) : new Date(value);
  }
}

export class SequentialIdGenerator implements IdGenerator {
  #counter = 0;
  readonly #prefix: string;

  constructor(prefix = "test") {
    this.#prefix = prefix;
  }

  next(): string {
    this.#counter += 1;
    return `${this.#prefix}-${String(this.#counter).padStart(8, "0")}`;
  }
}
