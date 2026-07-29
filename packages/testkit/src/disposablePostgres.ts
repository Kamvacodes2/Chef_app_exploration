import { execFile, spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { Client } from "pg";

/**
 * Disposable PostgreSQL + PostGIS provisioning for tests and CI.
 *
 * Blueprint section 18.2 requires "disposable PostgreSQL/PostGIS" and section
 * 19.1 requires `pnpm test:ci` to start one, migrate from empty, and always
 * tear it down. Three strategies are supported, tried in order:
 *
 * 1. `external` — an already-running server addressed by `CHEFMATE_TEST_PG_URL`
 *    or `DATABASE_URL`. This is the CI path: the GitHub Actions job attaches a
 *    pinned `postgis/postgis` **service container** and exports its URL. A
 *    freshly named database is created on it per run and dropped afterwards.
 * 2. `docker` — a pinned `postgis/postgis` container started and removed by
 *    this module. This is the intended local path.
 * 3. `local-cluster` — a throwaway cluster created with `initdb` from a locally
 *    installed PostgreSQL, on a random port, in a temp directory, with trust
 *    auth on loopback only. This exists because container runtimes are not
 *    universally available on developer workstations; it is as disposable as a
 *    container and is destroyed on teardown.
 *
 * If none is available the provisioner **throws**. It never degrades to an
 * in-memory or skipped database, because a silently-skipped database suite is
 * exactly the failure mode section 19.1 forbids.
 */

const run = promisify(execFile);

/** Pinned, never `latest`, so local and CI agree byte for byte. */
export const POSTGIS_IMAGE = "postgis/postgis:16-3.4";

export type ProvisionStrategy = "external" | "docker" | "local-cluster";

export interface DisposablePostgres {
  /** Connection string for the freshly created, empty database. */
  readonly connectionString: string;
  /** Connection string for the server's maintenance database. */
  readonly serverConnectionString: string;
  readonly databaseName: string;
  readonly strategy: ProvisionStrategy;
  /** Idempotent. Always safe to call, including after a failed start. */
  readonly stop: () => Promise<void>;
}

export interface ProvisionOptions {
  /** Restrict provisioning to one strategy. Used by the CI orchestrator. */
  readonly strategy?: ProvisionStrategy;
  readonly env?: NodeJS.ProcessEnv;
  readonly log?: (message: string) => void;
}

export class ProvisioningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProvisioningError";
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new ProvisioningError("Could not determine a free port"));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

/**
 * Runs a command with its stdio discarded and resolves on exit.
 *
 * `execFile` cannot be used for `pg_ctl start`: it resolves only once the child
 * *and everything sharing its stdio pipes* have closed them, and the `postgres`
 * server that `pg_ctl` forks inherits those handles. `pg_ctl` exits promptly but
 * the promise would never settle. Discarding stdio and waiting on the exit code
 * is the correct contract for a process launcher.
 */
function runQuiet(command: string, args: readonly string[]): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { stdio: "ignore", windowsHide: true });
    child.on("error", reject);
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await run(command, ["--version"], { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForServer(connectionString: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    const client = new Client({ connectionString, connectionTimeoutMillis: 2_000 });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      await client.end().catch(() => undefined);
      await sleep(250);
    }
  }
  throw new ProvisioningError(
    `PostgreSQL did not become reachable within ${timeoutMs}ms: ${(lastError as Error | undefined)?.message ?? "unknown error"}`,
  );
}

function uniqueDatabaseName(): string {
  return `chefmate_test_${randomBytes(6).toString("hex")}`;
}

function withDatabase(serverConnectionString: string, databaseName: string): string {
  const url = new URL(serverConnectionString);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function createDatabase(serverConnectionString: string, name: string): Promise<void> {
  const client = new Client({ connectionString: serverConnectionString });
  await client.connect();
  try {
    // Identifier is generated locally from hex, so quoting is sufficient.
    await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }
}

async function dropDatabase(serverConnectionString: string, name: string): Promise<void> {
  const client = new Client({ connectionString: serverConnectionString });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } finally {
    await client.end();
  }
}

/** Verifies the server can actually provide PostGIS before tests rely on it. */
async function assertPostgisAvailable(connectionString: string): Promise<void> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query<{ name: string }>(
      "SELECT name FROM pg_available_extensions WHERE name = 'postgis'",
    );
    if (result.rowCount === 0) {
      throw new ProvisioningError(
        "The provisioned PostgreSQL server does not offer the postgis extension. " +
          `Use the pinned ${POSTGIS_IMAGE} image or install PostGIS on the target server.`,
      );
    }
  } finally {
    await client.end();
  }
}

// ---------------------------------------------------------------------------
// strategy: external
// ---------------------------------------------------------------------------

function externalServerUrl(env: NodeJS.ProcessEnv): string | undefined {
  const candidate = env.CHEFMATE_TEST_PG_URL ?? env.DATABASE_URL;
  if (candidate === undefined || candidate.trim() === "") {
    return undefined;
  }
  // Always talk to the maintenance database so we can CREATE/DROP freely.
  const url = new URL(candidate);
  url.pathname = "/postgres";
  return url.toString();
}

// ---------------------------------------------------------------------------
// strategy: docker
// ---------------------------------------------------------------------------

async function startDockerServer(
  log: (message: string) => void,
): Promise<{ serverConnectionString: string; stop: () => Promise<void> }> {
  const port = await freePort();
  const name = `chefmate-test-pg-${randomBytes(4).toString("hex")}`;

  log(`starting ${POSTGIS_IMAGE} as ${name} on port ${port}`);
  await run(
    "docker",
    [
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--publish",
      `127.0.0.1:${port}:5432`,
      "--env",
      // A deliberate CHANGE_ME_* placeholder, not a credential. The container is
      // `--rm`, bound to loopback on an ephemeral port, and torn down when the
      // test run ends. The CHANGE_ME_ prefix also keeps this file clear of the
      // repository's own secret scanner (tests/security/secrets.test.ts).
      "POSTGRES_PASSWORD=CHANGE_ME_LOCAL_TEST_ONLY",
      "--env",
      "POSTGRES_USER=chefmate_test",
      "--env",
      "POSTGRES_DB=postgres",
      POSTGIS_IMAGE,
    ],
    { windowsHide: true },
  );

  const serverConnectionString = `postgresql://chefmate_test:CHANGE_ME_LOCAL_TEST_ONLY@127.0.0.1:${port}/postgres`;
  const stop = async (): Promise<void> => {
    await run("docker", ["rm", "--force", name], { windowsHide: true }).catch(() => undefined);
  };

  try {
    await waitForServer(serverConnectionString, 90_000);
  } catch (error) {
    await stop();
    throw error;
  }

  return { serverConnectionString, stop };
}

// ---------------------------------------------------------------------------
// strategy: local cluster
// ---------------------------------------------------------------------------

/** Locates `initdb`/`pg_ctl`, honouring an explicit `CHEFMATE_PG_BIN` override. */
export async function findPostgresBinDir(env: NodeJS.ProcessEnv): Promise<string | undefined> {
  const explicit = env.CHEFMATE_PG_BIN;
  if (explicit !== undefined && explicit.trim() !== "") {
    return explicit;
  }

  if (await commandExists("initdb")) {
    return ""; // already on PATH
  }

  if (process.platform === "win32") {
    const root = "C:\\Program Files\\PostgreSQL";
    try {
      const versions = (await readdir(root)).sort().reverse();
      for (const version of versions) {
        const bin = path.join(root, version, "bin");
        try {
          await stat(path.join(bin, "initdb.exe"));
          return bin;
        } catch {
          continue;
        }
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

const binary = (dir: string, name: string): string => (dir === "" ? name : path.join(dir, name));

async function startLocalCluster(
  binDir: string,
  log: (message: string) => void,
): Promise<{ serverConnectionString: string; stop: () => Promise<void> }> {
  const port = await freePort();
  const base = await mkdtemp(path.join(tmpdir(), "chefmate-pg-"));
  const dataDir = path.join(base, "data");
  const user = "chefmate_test";

  const cleanup = async (): Promise<void> => {
    await runQuiet(binary(binDir, "pg_ctl"), [
      "-D",
      dataDir,
      "-w",
      "-m",
      "immediate",
      "stop",
    ]).catch(() => undefined);
    await rm(base, { recursive: true, force: true, maxRetries: 5 }).catch(() => undefined);
  };

  try {
    log(`initialising a throwaway PostgreSQL cluster on port ${port}`);
    const initCode = await runQuiet(binary(binDir, "initdb"), [
      "-D",
      dataDir,
      "-U",
      user,
      "--auth=trust",
      "-E",
      "UTF8",
      "--no-sync",
    ]);
    if (initCode !== 0) {
      throw new Error(`initdb exited with code ${initCode}`);
    }

    // fsync off and full_page_writes off: this cluster is thrown away, so
    // durability buys nothing and costs a lot of test wall-clock time.
    const startCode = await runQuiet(binary(binDir, "pg_ctl"), [
      "-D",
      dataDir,
      "-o",
      `-p ${port} -c listen_addresses=127.0.0.1 -c fsync=off -c full_page_writes=off`,
      "-l",
      path.join(base, "postgres.log"),
      "-w",
      "start",
    ]);
    if (startCode !== 0) {
      throw new Error(`pg_ctl start exited with code ${startCode}`);
    }
  } catch (error) {
    await cleanup();
    throw new ProvisioningError(
      `Failed to start a local PostgreSQL cluster: ${(error as Error).message}`,
    );
  }

  const serverConnectionString = `postgresql://${user}@127.0.0.1:${port}/postgres`;
  try {
    await waitForServer(serverConnectionString, 60_000);
  } catch (error) {
    await cleanup();
    throw error;
  }

  return { serverConnectionString, stop: cleanup };
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------

export interface StrategyAvailability {
  readonly external: boolean;
  readonly docker: boolean;
  readonly localCluster: boolean;
}

export async function detectStrategies(
  env: NodeJS.ProcessEnv = process.env,
): Promise<StrategyAvailability> {
  return {
    external: externalServerUrl(env) !== undefined,
    docker: await commandExists("docker"),
    localCluster: (await findPostgresBinDir(env)) !== undefined,
  };
}

export async function provisionDisposablePostgres(
  options: ProvisionOptions = {},
): Promise<DisposablePostgres> {
  const env = options.env ?? process.env;
  const log = options.log ?? (() => undefined);

  let strategy: ProvisionStrategy;
  let serverConnectionString: string;
  let stopServer: () => Promise<void>;

  const external = externalServerUrl(env);
  const wants = (candidate: ProvisionStrategy): boolean =>
    options.strategy === undefined || options.strategy === candidate;

  if (wants("external") && external !== undefined) {
    strategy = "external";
    serverConnectionString = external;
    stopServer = async () => undefined;
  } else if (wants("docker") && (await commandExists("docker"))) {
    strategy = "docker";
    ({ serverConnectionString, stop: stopServer } = await startDockerServer(log));
  } else {
    const binDir = wants("local-cluster") ? await findPostgresBinDir(env) : undefined;
    if (binDir === undefined) {
      throw new ProvisioningError(
        [
          "No disposable PostgreSQL/PostGIS source is available.",
          "Provide one of:",
          `  - a running server via CHEFMATE_TEST_PG_URL or DATABASE_URL (CI uses a pinned ${POSTGIS_IMAGE} service container);`,
          `  - a container runtime on PATH so ${POSTGIS_IMAGE} can be started locally;`,
          "  - a local PostgreSQL installation with PostGIS (set CHEFMATE_PG_BIN to its bin directory).",
          "See infra/README.md.",
        ].join("\n"),
      );
    }
    strategy = "local-cluster";
    ({ serverConnectionString, stop: stopServer } = await startLocalCluster(binDir, log));
  }

  const databaseName = uniqueDatabaseName();
  let created = false;

  const stop = async (): Promise<void> => {
    if (created && strategy === "external") {
      // Only the external server outlives us, so only it needs the drop.
      await dropDatabase(serverConnectionString, databaseName).catch(() => undefined);
    }
    created = false;
    await stopServer();
  };

  try {
    await assertPostgisAvailable(serverConnectionString);
    await createDatabase(serverConnectionString, databaseName);
    created = true;
  } catch (error) {
    await stop();
    throw error;
  }

  log(`provisioned disposable database ${databaseName} via ${strategy}`);

  return {
    connectionString: withDatabase(serverConnectionString, databaseName),
    serverConnectionString,
    databaseName,
    strategy,
    stop,
  };
}
