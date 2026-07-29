import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stat } from "node:fs/promises";
import type * as FsPromises from "node:fs/promises";
import path from "node:path";

/**
 * Unit tests for the disposable PostgreSQL provisioner's *inactive* strategies.
 *
 * Which strategy `provisionDisposablePostgres` naturally selects depends
 * entirely on the environment: CI exports `CHEFMATE_TEST_PG_URL` and therefore
 * always takes the `external` path, a workstation with a container runtime takes
 * `docker`, and a workstation with only a local PostgreSQL installation takes
 * `local-cluster`. That made the `docker` and `local-cluster` code paths
 * unmeasured — and unverified — in whichever environment did not happen to pick
 * them.
 *
 * These tests therefore never let the module choose. Each one pins the strategy
 * with `options.strategy`, passes an explicit `options.env` so ambient variables
 * cannot leak in, and mocks the two boundaries the module actually crosses:
 * `node:child_process` (every process launch) and `pg` (every connection). No
 * Docker daemon, no `initdb` binary and no PostgreSQL server is required, so the
 * exact same lines are executed on every machine and in CI.
 */

interface SpawnRecord {
  readonly command: string;
  readonly args: readonly string[];
}

type SpawnOutcome = { readonly code: number } | { readonly error: Error };

const cp = vi.hoisted(() => ({
  execFileCalls: [] as SpawnRecord[],
  spawnCalls: [] as SpawnRecord[],
  /** Decides whether a promisified `execFile` call succeeds. */
  execFileSucceeds: (_command: string, _args: readonly string[]): boolean => true,
  /** Decides how a `spawn`ed process terminates. */
  spawnOutcome: (_command: string, _args: readonly string[]): SpawnOutcome => ({ code: 0 }),
}));

const pg = vi.hoisted(() => ({
  queries: [] as string[],
  connectionStrings: [] as string[],
  endCalls: 0,
  /** Rows returned for the `pg_available_extensions` probe. */
  postgisRows: [{ name: "postgis" }] as { name: string }[],
  /** Invoked on every `connect()`; may throw to simulate an unreachable server. */
  connectHook: null as null | (() => void),
}));

vi.mock("node:child_process", async () => {
  const { EventEmitter } = await import("node:events");

  type Callback = (error: Error | null, stdout?: string, stderr?: string) => void;

  return {
    execFile: (
      command: string,
      args: readonly string[],
      options: unknown,
      callback?: Callback,
    ): unknown => {
      const done = typeof options === "function" ? (options as Callback) : callback;
      cp.execFileCalls.push({ command, args: [...args] });
      const succeeds = cp.execFileSucceeds(command, args);
      process.nextTick(() => {
        if (succeeds) {
          done?.(null, "", "");
        } else {
          done?.(new Error(`${command} failed`));
        }
      });
      return new EventEmitter();
    },
    spawn: (command: string, args: readonly string[]): unknown => {
      cp.spawnCalls.push({ command, args: [...args] });
      const outcome = cp.spawnOutcome(command, args);
      const child = new EventEmitter();
      process.nextTick(() => {
        if ("error" in outcome) {
          child.emit("error", outcome.error);
        } else {
          child.emit("exit", outcome.code);
        }
      });
      return child;
    },
  };
});

/**
 * `node:fs/promises` is only stubbed for the two calls the Windows binary scan
 * makes (`readdir`/`stat`). Everything else — notably `mkdtemp` and `rm`, which
 * the local-cluster tests rely on for real temp-directory behaviour — passes
 * through to the real implementation.
 */
const fs = vi.hoisted(() => ({
  readdirImpl: null as null | ((target: string) => Promise<string[]>),
  statImpl: null as null | ((target: string) => Promise<unknown>),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof FsPromises>();
  return {
    ...actual,
    default: actual,
    readdir: (target: string, ...rest: unknown[]): unknown =>
      fs.readdirImpl
        ? fs.readdirImpl(target)
        : (actual.readdir as (...args: unknown[]) => unknown)(target, ...rest),
    stat: (target: string, ...rest: unknown[]): unknown =>
      fs.statImpl
        ? fs.statImpl(target)
        : (actual.stat as (...args: unknown[]) => unknown)(target, ...rest),
  };
});

vi.mock("pg", () => {
  class FakeClient {
    constructor(config: { connectionString: string }) {
      pg.connectionStrings.push(config.connectionString);
    }

    async connect(): Promise<void> {
      pg.connectHook?.();
    }

    async query(sql: string): Promise<{ rows: unknown[]; rowCount: number }> {
      pg.queries.push(sql);
      if (sql.includes("pg_available_extensions")) {
        return { rows: pg.postgisRows, rowCount: pg.postgisRows.length };
      }
      return { rows: [], rowCount: 0 };
    }

    async end(): Promise<void> {
      pg.endCalls += 1;
    }
  }

  return { Client: FakeClient, default: { Client: FakeClient } };
});

const {
  POSTGIS_IMAGE,
  ProvisioningError,
  detectStrategies,
  findPostgresBinDir,
  provisionDisposablePostgres,
} = await import("../../src/index.js");

const PG_BIN = path.join(path.sep, "opt", "pgbin");

/** An env with no ambient database URL, so `external` can never be chosen. */
const isolatedEnv: NodeJS.ProcessEnv = {};

const findCall = (
  calls: readonly SpawnRecord[],
  command: string,
  firstArg: string,
): SpawnRecord | undefined =>
  calls.find((call) => call.command.endsWith(command) && call.args[0] === firstArg);

beforeEach(() => {
  cp.execFileCalls = [];
  cp.spawnCalls = [];
  cp.execFileSucceeds = () => true;
  cp.spawnOutcome = () => ({ code: 0 });
  pg.queries = [];
  pg.connectionStrings = [];
  pg.endCalls = 0;
  pg.postgisRows = [{ name: "postgis" }];
  pg.connectHook = null;
  // Default: the Windows install root does not exist. This keeps "is a local
  // PostgreSQL available?" answered solely by the mocked `initdb --version`
  // probe, so the tests behave identically on Windows and on Linux CI.
  fs.readdirImpl = () => Promise.reject(new Error("ENOENT"));
  fs.statImpl = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("provisionDisposablePostgres — docker strategy", () => {
  it("starts the pinned image on a loopback-bound ephemeral port and creates a fresh database", async () => {
    const database = await provisionDisposablePostgres({
      strategy: "docker",
      env: isolatedEnv,
    });

    expect(database.strategy).toBe("docker");

    const runCall = findCall(cp.execFileCalls, "docker", "run");
    expect(runCall).toBeDefined();
    const args = runCall?.args ?? [];

    // Disposability and pinning are the whole point of the strategy.
    expect(args).toContain("--detach");
    expect(args).toContain("--rm");
    expect(args).toContain(POSTGIS_IMAGE);
    expect(args).not.toContain("postgis/postgis:latest");

    const publish = args[args.indexOf("--publish") + 1] ?? "";
    expect(publish).toMatch(/^127\.0\.0\.1:\d+:5432$/);
    const port = publish.split(":")[1];
    expect(database.serverConnectionString).toContain(`127.0.0.1:${port}/postgres`);

    // The container name must be unique per run so parallel runs cannot collide.
    const name = args[args.indexOf("--name") + 1] ?? "";
    expect(name).toMatch(/^chefmate-test-pg-[0-9a-f]{8}$/);

    expect(database.databaseName).toMatch(/^chefmate_test_[0-9a-f]{12}$/);
    expect(pg.queries).toContain(`CREATE DATABASE "${database.databaseName}"`);
    expect(database.connectionString).toContain(`/${database.databaseName}`);

    await database.stop();

    const rmCall = findCall(cp.execFileCalls, "docker", "rm");
    expect(rmCall?.args).toEqual(["rm", "--force", name]);
    // The container is destroyed wholesale, so dropping the database first would
    // be pointless work — only the external server needs that.
    expect(pg.queries.some((sql) => sql.startsWith("DROP DATABASE"))).toBe(false);
  });

  it("removes the container when the server never becomes reachable", async () => {
    let clock = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    // Push the clock past the wait deadline on the first failed connection so the
    // retry loop gives up immediately instead of burning 90 seconds.
    pg.connectHook = () => {
      clock += 200_000;
      throw new Error("ECONNREFUSED 127.0.0.1");
    };

    await expect(
      provisionDisposablePostgres({ strategy: "docker", env: isolatedEnv }),
    ).rejects.toThrow(ProvisioningError);

    const rmCall = findCall(cp.execFileCalls, "docker", "rm");
    expect(rmCall).toBeDefined();
    expect(rmCall?.args[1]).toBe("--force");
  });

  it("propagates a failure to start the container without attempting removal", async () => {
    cp.execFileSucceeds = (command, args) => !(command === "docker" && args[0] === "run");

    await expect(
      provisionDisposablePostgres({ strategy: "docker", env: isolatedEnv }),
    ).rejects.toThrow(/docker failed/);

    expect(findCall(cp.execFileCalls, "docker", "rm")).toBeUndefined();
  });

  it("refuses a server without PostGIS and tears the container down", async () => {
    pg.postgisRows = [];

    await expect(
      provisionDisposablePostgres({ strategy: "docker", env: isolatedEnv }),
    ).rejects.toThrow(/does not offer the postgis extension/);

    expect(findCall(cp.execFileCalls, "docker", "rm")).toBeDefined();
    expect(pg.queries.some((sql) => sql.startsWith("CREATE DATABASE"))).toBe(false);
  });
});

describe("provisionDisposablePostgres — local-cluster strategy", () => {
  const localEnv: NodeJS.ProcessEnv = { CHEFMATE_PG_BIN: PG_BIN };

  it("initialises a throwaway cluster with trust auth on loopback and durability off", async () => {
    const database = await provisionDisposablePostgres({
      strategy: "local-cluster",
      env: localEnv,
    });

    expect(database.strategy).toBe("local-cluster");

    const initdb = cp.spawnCalls.find((call) => call.command === path.join(PG_BIN, "initdb"));
    expect(initdb).toBeDefined();
    const dataDir = initdb?.args[initdb.args.indexOf("-D") + 1] ?? "";
    expect(dataDir).toContain("chefmate-pg-");
    expect(initdb?.args).toEqual([
      "-D",
      dataDir,
      "-U",
      "chefmate_test",
      "--auth=trust",
      "-E",
      "UTF8",
      "--no-sync",
    ]);

    const start = cp.spawnCalls.find(
      (call) => call.command === path.join(PG_BIN, "pg_ctl") && call.args.includes("start"),
    );
    expect(start).toBeDefined();
    const serverOptions = start?.args[start.args.indexOf("-o") + 1] ?? "";
    const port = new URL(database.serverConnectionString).port;
    expect(serverOptions).toBe(
      `-p ${port} -c listen_addresses=127.0.0.1 -c fsync=off -c full_page_writes=off`,
    );
    // `-w` makes pg_ctl wait, so a zero exit really means "accepting connections".
    expect(start?.args).toContain("-w");
    expect(database.serverConnectionString).toBe(
      `postgresql://chefmate_test@127.0.0.1:${port}/postgres`,
    );

    await database.stop();

    const stop = cp.spawnCalls.find(
      (call) => call.command === path.join(PG_BIN, "pg_ctl") && call.args.includes("stop"),
    );
    expect(stop?.args).toEqual(["-D", dataDir, "-w", "-m", "immediate", "stop"]);
    // Disposable means gone: the temp tree must not survive teardown.
    await expect(stat(dataDir)).rejects.toThrow();
  });

  it("cleans up when initdb fails", async () => {
    cp.spawnOutcome = (command) => (command.endsWith("initdb") ? { code: 1 } : { code: 0 });

    await expect(
      provisionDisposablePostgres({ strategy: "local-cluster", env: localEnv }),
    ).rejects.toThrow(/Failed to start a local PostgreSQL cluster: initdb exited with code 1/);

    const initdb = cp.spawnCalls.find((call) => call.command.endsWith("initdb"));
    const dataDir = initdb?.args[initdb.args.indexOf("-D") + 1] ?? "";
    expect(dataDir).not.toBe("");
    expect(
      cp.spawnCalls.some((call) => call.command.endsWith("pg_ctl") && call.args.includes("stop")),
    ).toBe(true);
    await expect(stat(dataDir)).rejects.toThrow();
    // A cluster that never initialised must never be started.
    expect(
      cp.spawnCalls.some((call) => call.command.endsWith("pg_ctl") && call.args.includes("start")),
    ).toBe(false);
  });

  it("cleans up when pg_ctl start fails", async () => {
    cp.spawnOutcome = (command, args) =>
      command.endsWith("pg_ctl") && args.includes("start") ? { code: 1 } : { code: 0 };

    await expect(
      provisionDisposablePostgres({ strategy: "local-cluster", env: localEnv }),
    ).rejects.toThrow(/pg_ctl start exited with code 1/);

    const initdb = cp.spawnCalls.find((call) => call.command.endsWith("initdb"));
    const dataDir = initdb?.args[initdb.args.indexOf("-D") + 1] ?? "";
    await expect(stat(dataDir)).rejects.toThrow();
  });

  it("reports a missing pg_ctl binary as a provisioning error", async () => {
    cp.spawnOutcome = (command) =>
      command.endsWith("initdb") ? { error: new Error("spawn ENOENT") } : { code: 0 };

    await expect(
      provisionDisposablePostgres({ strategy: "local-cluster", env: localEnv }),
    ).rejects.toThrow(/Failed to start a local PostgreSQL cluster: spawn ENOENT/);
  });

  it("cleans up when the cluster starts but never accepts connections", async () => {
    let clock = 0;
    vi.spyOn(Date, "now").mockImplementation(() => clock);
    pg.connectHook = () => {
      clock += 200_000;
      throw new Error("ECONNREFUSED 127.0.0.1");
    };

    await expect(
      provisionDisposablePostgres({ strategy: "local-cluster", env: localEnv }),
    ).rejects.toThrow(/did not become reachable/);

    const initdb = cp.spawnCalls.find((call) => call.command.endsWith("initdb"));
    const dataDir = initdb?.args[initdb.args.indexOf("-D") + 1] ?? "";
    expect(
      cp.spawnCalls.some((call) => call.command.endsWith("pg_ctl") && call.args.includes("stop")),
    ).toBe(true);
    await expect(stat(dataDir)).rejects.toThrow();
  });
});

describe("provisionDisposablePostgres — external strategy", () => {
  it("creates and drops a per-run database on a server it must not stop", async () => {
    const env: NodeJS.ProcessEnv = {
      CHEFMATE_TEST_PG_URL: "postgresql://ci:CHANGE_ME_TEST_ONLY@127.0.0.1:5432/some_other_db",
    };

    const database = await provisionDisposablePostgres({ strategy: "external", env });

    expect(database.strategy).toBe("external");
    // Always addressed via the maintenance database so CREATE/DROP are legal.
    expect(database.serverConnectionString).toBe(
      "postgresql://ci:CHANGE_ME_TEST_ONLY@127.0.0.1:5432/postgres",
    );
    expect(pg.queries).toContain(`CREATE DATABASE "${database.databaseName}"`);

    await database.stop();

    expect(pg.queries).toContain(`DROP DATABASE IF EXISTS "${database.databaseName}" WITH (FORCE)`);
    // Nothing was launched, so nothing may be torn down.
    expect(cp.execFileCalls.some((call) => call.command === "docker")).toBe(false);
    expect(cp.spawnCalls).toHaveLength(0);

    // `stop` is documented as idempotent; a second call must not re-drop.
    const dropCount = pg.queries.filter((sql) => sql.startsWith("DROP DATABASE")).length;
    await database.stop();
    expect(pg.queries.filter((sql) => sql.startsWith("DROP DATABASE"))).toHaveLength(dropCount);
  });

  it("ignores a blank database URL", async () => {
    await expect(
      provisionDisposablePostgres({
        strategy: "external",
        env: { CHEFMATE_TEST_PG_URL: "   " },
      }),
    ).rejects.toThrow(ProvisioningError);
  });

  it("falls back to DATABASE_URL", async () => {
    const database = await provisionDisposablePostgres({
      env: { DATABASE_URL: "postgresql://ci:CHANGE_ME_TEST_ONLY@db.internal:6543/app" },
    });
    expect(database.strategy).toBe("external");
    expect(database.serverConnectionString).toBe(
      "postgresql://ci:CHANGE_ME_TEST_ONLY@db.internal:6543/postgres",
    );
    await database.stop();
  });
});

describe("provisionDisposablePostgres — no source available", () => {
  it("throws an actionable error rather than degrading to a skipped database", async () => {
    // No database URL, no container runtime, no PostgreSQL installation.
    cp.execFileSucceeds = () => false;

    await expect(provisionDisposablePostgres({ env: isolatedEnv })).rejects.toThrow(
      /No disposable PostgreSQL\/PostGIS source is available/,
    );
    await expect(provisionDisposablePostgres({ env: isolatedEnv })).rejects.toThrow(
      new RegExp(POSTGIS_IMAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  });
});

describe("findPostgresBinDir", () => {
  it("honours an explicit CHEFMATE_PG_BIN override without probing", async () => {
    expect(await findPostgresBinDir({ CHEFMATE_PG_BIN: PG_BIN })).toBe(PG_BIN);
    expect(cp.execFileCalls).toHaveLength(0);
  });

  it("ignores a blank override and reports an empty string when initdb is on PATH", async () => {
    expect(await findPostgresBinDir({ CHEFMATE_PG_BIN: "  " })).toBe("");
    expect(cp.execFileCalls).toEqual([{ command: "initdb", args: ["--version"] }]);
  });

  it("returns undefined when initdb is neither on PATH nor installed", async () => {
    cp.execFileSucceeds = () => false;
    expect(await findPostgresBinDir({})).toBeUndefined();
  });

  describe("Windows installation scan", () => {
    const originalPlatform = process.platform;

    const forceWin32 = (): void => {
      Object.defineProperty(process, "platform", { value: "win32", configurable: true });
    };

    afterEach(() => {
      Object.defineProperty(process, "platform", {
        value: originalPlatform,
        configurable: true,
      });
    });

    it("prefers the newest installed version that actually contains initdb.exe", async () => {
      forceWin32();
      cp.execFileSucceeds = () => false; // not on PATH
      const root = "C:\\Program Files\\PostgreSQL";
      fs.readdirImpl = () => Promise.resolve(["16", "17", "pgAdmin 4"]);
      // "pgAdmin 4" sorts last and 17 is scanned first, but only 16 is a real
      // server installation — the scan must skip the others, not fail on them.
      fs.statImpl = (target) =>
        target === path.join(root, "16", "bin", "initdb.exe")
          ? Promise.resolve({})
          : Promise.reject(new Error("ENOENT"));

      expect(await findPostgresBinDir({})).toBe(path.join(root, "16", "bin"));
    });

    it("returns undefined when no installed version contains initdb.exe", async () => {
      forceWin32();
      cp.execFileSucceeds = () => false;
      fs.readdirImpl = () => Promise.resolve(["16"]);
      fs.statImpl = () => Promise.reject(new Error("ENOENT"));

      expect(await findPostgresBinDir({})).toBeUndefined();
    });
  });
});

describe("detectStrategies", () => {
  it("reports every strategy the environment can supply", async () => {
    expect(
      await detectStrategies({ CHEFMATE_TEST_PG_URL: "postgresql://ci@localhost:5432/app" }),
    ).toEqual({ external: true, docker: true, localCluster: true });
  });

  it("reports nothing when neither a URL nor any binary is present", async () => {
    cp.execFileSucceeds = () => false;
    expect(await detectStrategies({})).toEqual({
      external: false,
      docker: false,
      localCluster: false,
    });
  });
});
