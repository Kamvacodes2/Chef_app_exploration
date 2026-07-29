import { describe, expect, it } from "vitest";
import {
  detectStrategies,
  FakeClock,
  findPostgresBinDir,
  POSTGIS_IMAGE,
  ProvisioningError,
  provisionDisposablePostgres,
  SequentialIdGenerator,
} from "../../src/index.js";

describe("FakeClock", () => {
  it("starts at a fixed instant and returns copies", () => {
    const clock = new FakeClock("2026-07-28T10:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2026-07-28T10:00:00.000Z");

    const first = clock.now();
    first.setFullYear(1999);
    expect(clock.now().getUTCFullYear()).toBe(2026);
  });

  it("advances and resets deterministically", () => {
    const clock = new FakeClock("2026-01-01T00:00:00.000Z");
    clock.advanceMs(90_000);
    expect(clock.now().toISOString()).toBe("2026-01-01T00:01:30.000Z");

    clock.set(new Date("2027-03-04T05:06:07.000Z"));
    expect(clock.now().toISOString()).toBe("2027-03-04T05:06:07.000Z");
    clock.set("2028-01-01T00:00:00.000Z");
    expect(clock.now().getUTCFullYear()).toBe(2028);
  });

  it("defaults to a stable epoch", () => {
    expect(new FakeClock().now().toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("SequentialIdGenerator", () => {
  it("produces stable, ordered identifiers", () => {
    const ids = new SequentialIdGenerator();
    expect(ids.next()).toBe("test-00000001");
    expect(ids.next()).toBe("test-00000002");
  });

  it("accepts a prefix", () => {
    expect(new SequentialIdGenerator("order").next()).toBe("order-00000001");
  });
});

describe("disposable database provisioning", () => {
  it("pins the PostGIS image rather than tracking latest", () => {
    expect(POSTGIS_IMAGE).toBe("postgis/postgis:16-3.4");
    expect(POSTGIS_IMAGE).not.toContain("latest");
  });

  it("reports which strategies are available on this machine", async () => {
    const strategies = await detectStrategies({});
    expect(typeof strategies.docker).toBe("boolean");
    expect(typeof strategies.localCluster).toBe("boolean");
    expect(strategies.external).toBe(false);
  });

  it("detects an externally supplied server", async () => {
    const strategies = await detectStrategies({
      CHEFMATE_TEST_PG_URL: "postgresql://u@127.0.0.1:5432/postgres",
    });
    expect(strategies.external).toBe(true);
  });

  it("honours an explicit CHEFMATE_PG_BIN override", async () => {
    await expect(findPostgresBinDir({ CHEFMATE_PG_BIN: "/opt/pg/bin" })).resolves.toBe(
      "/opt/pg/bin",
    );
  });

  /**
   * The single most important behaviour of the provisioner: when no database
   * source exists it must fail, never quietly hand back something unusable.
   */
  it("fails loudly when a requested strategy is unavailable", async () => {
    await expect(
      provisionDisposablePostgres({
        strategy: "external",
        env: {},
        log: () => undefined,
      }),
    ).rejects.toBeInstanceOf(ProvisioningError);
  });

  it("names every alternative in its failure message", async () => {
    await expect(
      provisionDisposablePostgres({ strategy: "external", env: {}, log: () => undefined }),
    ).rejects.toThrow(/CHEFMATE_TEST_PG_URL[\s\S]*container runtime[\s\S]*CHEFMATE_PG_BIN/);
  });
});
