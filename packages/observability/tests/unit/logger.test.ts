import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger, REDACTED, runWithCorrelation } from "../../src/index.js";

function capture(): { lines: string[]; stream: Writable } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { lines, stream };
}

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe("createLogger", () => {
  it("emits JSON carrying the service name and an ISO timestamp", async () => {
    const { lines, stream } = capture();
    createLogger({ name: "svc", level: "info", destination: stream }).info("hello");
    await flush();

    const parsed = JSON.parse(lines.join("").trim()) as Record<string, unknown>;
    expect(parsed.service).toBe("svc");
    expect(parsed.level).toBe("info");
    expect(parsed.msg).toBe("hello");
    expect(String(parsed.time)).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("honours the configured level", async () => {
    const { lines, stream } = capture();
    const logger = createLogger({ name: "svc", level: "warn", destination: stream });
    logger.info("suppressed");
    logger.warn("emitted");
    await flush();

    const output = lines.join("");
    expect(output).not.toContain("suppressed");
    expect(output).toContain("emitted");
  });

  it("merges caller-supplied base fields", async () => {
    const { lines, stream } = capture();
    createLogger({ name: "svc", destination: stream, base: { region: "af-south-1" } }).info("x");
    await flush();

    expect(JSON.parse(lines.join("").trim())).toMatchObject({ region: "af-south-1" });
  });

  it("redacts sensitive keys without dropping neighbouring fields", async () => {
    const { lines, stream } = capture();
    createLogger({ name: "svc", destination: stream }).info(
      { apiKey: "abcdefghijklmnop", orderRef: "ORD-1" },
      "payload",
    );
    await flush();

    const parsed = JSON.parse(lines.join("").trim()) as Record<string, unknown>;
    expect(parsed.apiKey).toBe(REDACTED);
    expect(parsed.orderRef).toBe("ORD-1");
  });

  it("adds the ambient correlation id", async () => {
    const { lines, stream } = capture();
    const logger = createLogger({ name: "svc", destination: stream });
    runWithCorrelation({ correlationId: "corr-abcdef01" }, () => logger.info("scoped"));
    await flush();

    expect(JSON.parse(lines.join("").trim())).toMatchObject({ correlationId: "corr-abcdef01" });
  });

  it("defaults to info when no level is supplied", async () => {
    const { lines, stream } = capture();
    const logger = createLogger({ name: "svc", destination: stream });
    logger.debug("not emitted");
    logger.info("emitted");
    await flush();

    expect(lines.join("")).not.toContain("not emitted");
  });

  it("can be constructed without a destination", () => {
    expect(() => createLogger({ name: "svc", level: "silent" })).not.toThrow();
  });
});
