import type { Logger } from "pino";

export type ShutdownHook = () => Promise<void> | void;

export interface GracefulShutdownOptions {
  readonly logger: Logger;
  /** Hard deadline after which the process exits regardless of hook progress. */
  readonly graceMs: number;
  readonly signals?: readonly NodeJS.Signals[];
  /** Injected in tests so the helper can be exercised without killing vitest. */
  readonly exit?: (code: number) => void;
  readonly process?: NodeJS.EventEmitter;
}

export interface GracefulShutdownHandle {
  /** Runs every hook once, in registration order. Safe to call repeatedly. */
  readonly shutdown: (reason: string) => Promise<void>;
  /** Detaches signal listeners without running the hooks. */
  readonly dispose: () => void;
  readonly isShuttingDown: () => boolean;
}

const DEFAULT_SIGNALS: readonly NodeJS.Signals[] = ["SIGTERM", "SIGINT"];

/**
 * Installs SIGTERM/SIGINT handling for a long-lived process.
 *
 * A container runtime sends SIGTERM and then SIGKILLs after its own grace
 * period. Draining in-flight work before the socket closes is what keeps a
 * rolling deploy from dropping a half-finished request or re-delivering an
 * outbox row that had already been sent.
 */
export function installGracefulShutdown(
  hooks: readonly ShutdownHook[],
  options: GracefulShutdownOptions,
): GracefulShutdownHandle {
  const emitter = options.process ?? process;
  const signals = options.signals ?? DEFAULT_SIGNALS;
  const exit = options.exit ?? ((code: number) => process.exit(code));

  let shuttingDown = false;
  let inFlight: Promise<void> | undefined;

  const runHooks = async (reason: string): Promise<void> => {
    options.logger.info({ reason }, "graceful shutdown started");

    let timer: NodeJS.Timeout | undefined;
    const deadline = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => resolve("timeout"), options.graceMs);
      timer.unref?.();
    });

    const drain = (async () => {
      for (const hook of hooks) {
        try {
          await hook();
        } catch (error) {
          options.logger.error({ err: error }, "shutdown hook failed");
        }
      }
      return "drained" as const;
    })();

    const outcome = await Promise.race([drain, deadline]);
    if (timer !== undefined) {
      clearTimeout(timer);
    }

    if (outcome === "timeout") {
      options.logger.error({ reason, graceMs: options.graceMs }, "graceful shutdown timed out");
      exit(1);
      return;
    }

    options.logger.info({ reason }, "graceful shutdown complete");
  };

  const shutdown = async (reason: string): Promise<void> => {
    if (shuttingDown) {
      await inFlight;
      return;
    }
    shuttingDown = true;
    inFlight = runHooks(reason);
    await inFlight;
  };

  const listeners = new Map<NodeJS.Signals, () => void>();
  for (const signal of signals) {
    const listener = (): void => {
      void shutdown(signal);
    };
    listeners.set(signal, listener);
    emitter.on(signal, listener);
  }

  const dispose = (): void => {
    for (const [signal, listener] of listeners) {
      emitter.off(signal, listener);
    }
    listeners.clear();
  };

  return { shutdown, dispose, isShuttingDown: () => shuttingDown };
}
