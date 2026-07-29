import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { createLogger, installGracefulShutdown } from "../../src/index.js";

const logger = createLogger({ name: "shutdown-test", level: "silent" });

function harness(hooks: (() => Promise<void> | void)[], graceMs = 1_000) {
  const emitter = new EventEmitter();
  const exit = vi.fn();
  const handle = installGracefulShutdown(hooks, { logger, graceMs, exit, process: emitter });
  return { emitter, exit, handle };
}

describe("installGracefulShutdown", () => {
  it("runs hooks in registration order", async () => {
    const order: string[] = [];
    const { handle } = harness([
      () => {
        order.push("a");
      },
      async () => {
        await Promise.resolve();
        order.push("b");
      },
      () => {
        order.push("c");
      },
    ]);

    await handle.shutdown("manual");
    expect(order).toEqual(["a", "b", "c"]);
    handle.dispose();
  });

  it("reports its state", async () => {
    const { handle } = harness([() => undefined]);
    expect(handle.isShuttingDown()).toBe(false);
    await handle.shutdown("manual");
    expect(handle.isShuttingDown()).toBe(true);
    handle.dispose();
  });

  it("responds to SIGTERM", async () => {
    let called = false;
    const { emitter, handle } = harness([
      () => {
        called = true;
      },
    ]);

    emitter.emit("SIGTERM");
    await handle.shutdown("await");
    expect(called).toBe(true);
    handle.dispose();
  });

  it("responds to SIGINT", async () => {
    let called = false;
    const { emitter, handle } = harness([
      () => {
        called = true;
      },
    ]);

    emitter.emit("SIGINT");
    await handle.shutdown("await");
    expect(called).toBe(true);
    handle.dispose();
  });

  it("runs the hooks exactly once no matter how many signals arrive", async () => {
    let calls = 0;
    const { emitter, handle } = harness([
      () => {
        calls += 1;
      },
    ]);

    emitter.emit("SIGTERM");
    emitter.emit("SIGTERM");
    emitter.emit("SIGINT");
    await handle.shutdown("await");
    await handle.shutdown("await");
    expect(calls).toBe(1);
    handle.dispose();
  });

  it("does not exit when every hook completes inside the grace period", async () => {
    const { exit, handle } = harness([() => undefined]);
    await handle.shutdown("manual");
    expect(exit).not.toHaveBeenCalled();
    handle.dispose();
  });

  it("exits non-zero when a hook hangs past the grace period", async () => {
    const { exit, handle } = harness([() => new Promise<void>(() => undefined)], 25);
    await handle.shutdown("manual");
    expect(exit).toHaveBeenCalledWith(1);
    handle.dispose();
  });

  it("logs and continues when a hook throws", async () => {
    const order: string[] = [];
    const { exit, handle } = harness([
      () => {
        throw new Error("boom");
      },
      () => {
        order.push("later");
      },
    ]);

    await handle.shutdown("manual");
    expect(order).toEqual(["later"]);
    expect(exit).not.toHaveBeenCalled();
    handle.dispose();
  });

  it("detaches its listeners on dispose", () => {
    const { emitter, handle } = harness([() => undefined]);
    expect(emitter.listenerCount("SIGTERM")).toBe(1);
    handle.dispose();
    expect(emitter.listenerCount("SIGTERM")).toBe(0);
  });

  it("honours a custom signal list", () => {
    const emitter = new EventEmitter();
    const handle = installGracefulShutdown([() => undefined], {
      logger,
      graceMs: 100,
      exit: vi.fn(),
      process: emitter,
      signals: ["SIGHUP"],
    });
    expect(emitter.listenerCount("SIGHUP")).toBe(1);
    expect(emitter.listenerCount("SIGTERM")).toBe(0);
    handle.dispose();
  });
});
