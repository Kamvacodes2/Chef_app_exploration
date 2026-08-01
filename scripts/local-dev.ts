import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { migrate } from "../packages/database/src/index.js";
import {
  provisionDisposablePostgres,
  type DisposablePostgres,
} from "../packages/testkit/src/index.js";
import { hashPassword } from "../apps/api/src/auth/session.js";
import { repoRoot } from "./lib/dotenv.js";

const apiUrl = process.env.CHEFMATE_LOCAL_API_URL ?? "http://127.0.0.1:4000";
const webUrl = process.env.CHEFMATE_LOCAL_WEB_URL ?? "http://localhost:3000";
const apiAddress = new URL(apiUrl);
const webAddress = new URL(webUrl);
const statusDir = path.join(repoRoot, ".local-dev");
const statusPath = path.join(statusDir, "chefmate-local-dev.json");
const migrationsDir = path.join(repoRoot, "packages", "database", "migrations");

const adminEmail = "admin.local@chefmate.test";
const chefEmail = "chef.lerato.local@chefmate.test";
const sharedPassword = "StrongPass12345";
const bootOnly = process.argv.includes("--boot-only");

interface SeedResult {
  readonly adminUserId: string;
  readonly chefUserId: string;
  readonly pendingReference: string;
  readonly assignedReference: string;
}

interface LocalProcess {
  readonly name: string;
  readonly child: ChildProcess;
}

const runtime: { database?: DisposablePostgres } = {};
let stopping = false;
const children: LocalProcess[] = [];

function log(message: string): void {
  process.stdout.write(`[chefmate-local] ${message}\n`);
}

async function upsertUser(
  client: Client,
  input: {
    readonly email: string;
    readonly displayName: string;
    readonly roles: readonly string[];
  },
): Promise<string> {
  const passwordHash = await hashPassword(sharedPassword);
  const result = await client.query<{ id: string }>(
    `INSERT INTO app.users (email, display_name, password_hash, email_verified_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (email) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       password_hash = EXCLUDED.password_hash,
       email_verified_at = COALESCE(app.users.email_verified_at, now()),
       updated_at = now()
     RETURNING id::text`,
    [input.email, input.displayName, passwordHash],
  );
  const userId = result.rows[0]?.id;
  if (!userId) {
    throw new Error(`Failed to seed user ${input.email}`);
  }
  for (const role of input.roles) {
    await client.query(
      `INSERT INTO app.user_roles (user_id, role)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, role],
    );
  }
  return userId;
}

async function nextReference(client: Client, scheduledDate: string): Promise<string> {
  const result = await client.query<{ value: string }>(
    "SELECT nextval('app.booking_reference_seq')::text AS value",
  );
  const sequence = Number(result.rows[0]?.value ?? 0);
  return `CM-${scheduledDate.slice(0, 4)}-${String(sequence).padStart(6, "0")}`;
}

async function createBooking(
  client: Client,
  input: {
    readonly status: "REQUESTED" | "CHEF_MATCHED";
    readonly scheduledDate: string;
    readonly timeSlot: string;
    readonly area: "Fourways" | "Sandton";
    readonly idempotencyKey: string;
    readonly contactName: string;
  },
): Promise<{ readonly id: string; readonly reference: string }> {
  const reference = await nextReference(client, input.scheduledDate);
  const address = {
    estate: input.area === "Fourways" ? "Dainfern" : "Sandton Village",
    unit: "",
    street: input.area === "Fourways" ? "12 Jacaranda Ave" : "44 Alice Lane",
    area: input.area,
  };
  const contact = {
    name: input.contactName,
    email: `${input.contactName.toLowerCase().replaceAll(" ", ".")}@example.test`,
    phone: "+27821234567",
  };
  const result = await client.query<{ id: string; reference: string }>(
    `INSERT INTO app.bookings
       (reference, status, source, goal_id, main_slug, side_slugs, dessert_slug,
        custom_request, scheduled_date, time_slot, address, contact, gift_code,
        plan_id, plan_selection, subtotal_cents, discount_cents, total_cents,
        chef_payable_cents, platform_revenue_cents, idempotency_key, request_fingerprint)
     VALUES
       ($1, $2, 'landing-order-flow', 'just-good-food', 'chicken-peri-peri',
        ARRAY['side-coleslaw','side-mielies'], 'dessert-malva', NULL, $3, $4,
        $5::jsonb, $6::jsonb, NULL, NULL, NULL, 52785, 0, 61785, 40160, 21625,
        $7, $8)
     ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = now()
     RETURNING id::text, reference`,
    [
      reference,
      input.status,
      input.scheduledDate,
      input.timeSlot,
      JSON.stringify(address),
      JSON.stringify(contact),
      input.idempotencyKey,
      `local-seed-${input.idempotencyKey}`,
    ],
  );
  const booking = result.rows[0];
  if (!booking) {
    throw new Error(`Failed to seed booking ${input.idempotencyKey}`);
  }
  return booking;
}

async function seed(connectionString: string): Promise<SeedResult> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const adminUserId = await upsertUser(client, {
      email: adminEmail,
      displayName: "Local Ops Admin",
      roles: ["CUSTOMER", "ADMIN", "SUPPORT"],
    });
    const chefUserId = await upsertUser(client, {
      email: chefEmail,
      displayName: "Chef Lerato Dlamini",
      roles: ["CHEF"],
    });

    await client.query(
      `INSERT INTO app.chef_profiles
         (user_id, is_available, service_area, service_areas, bio, max_travel_km, availability)
       VALUES
         ($1, true, 'Fourways', ARRAY['Fourways','Sandton'],
          'Approved ChefMate test chef for local dashboard testing.', 25,
          $2::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET
         is_available = EXCLUDED.is_available,
         service_area = EXCLUDED.service_area,
         service_areas = EXCLUDED.service_areas,
         bio = EXCLUDED.bio,
         max_travel_km = EXCLUDED.max_travel_km,
         availability = EXCLUDED.availability,
         updated_at = now()`,
      [chefUserId, JSON.stringify({ notes: "Weekday evenings and Saturday lunches" })],
    );

    await client.query(
      `INSERT INTO app.chef_applications
         (full_name, email, phone, city, service_areas, experience, status,
          interview_conducted_at, admin_notes, invited_user_id, invited_at)
       VALUES
         ('Chef Lerato Dlamini', $1, '+27821234567', 'Johannesburg',
          ARRAY['Fourways','Sandton'], 'Ten years of private dining and family meal prep.',
          'APPROVED', now(), 'Local seed: approved test chef.', $2, now())
       ON CONFLICT DO NOTHING`,
      [chefEmail, chefUserId],
    );

    const pending = await createBooking(client, {
      status: "REQUESTED",
      scheduledDate: "2026-08-15",
      timeSlot: "18:30",
      area: "Fourways",
      idempotencyKey: "local-chef-offer-001",
      contactName: "Thandi Customer",
    });
    await client.query(
      `INSERT INTO app.chef_offers
         (booking_id, chef_user_id, status, rank, chef_payout_cents, expires_at)
       VALUES ($1, $2, 'PENDING', 1, 40160, now() + interval '2 hours')
       ON CONFLICT (booking_id, chef_user_id) DO UPDATE SET
         status = 'PENDING', expires_at = now() + interval '2 hours'`,
      [pending.id, chefUserId],
    );

    const assigned = await createBooking(client, {
      status: "CHEF_MATCHED",
      scheduledDate: "2026-08-16",
      timeSlot: "12:00",
      area: "Sandton",
      idempotencyKey: "local-chef-assigned-001",
      contactName: "Sipho Customer",
    });
    const acceptedOffer = await client.query<{ id: string }>(
      `INSERT INTO app.chef_offers
         (booking_id, chef_user_id, status, rank, chef_payout_cents, expires_at, accepted_at)
       VALUES ($1, $2, 'ACCEPTED', 1, 40160, now() + interval '2 hours', now())
       ON CONFLICT (booking_id, chef_user_id) DO UPDATE SET
         status = 'ACCEPTED', accepted_at = now(), expires_at = now() + interval '2 hours'
       RETURNING id::text`,
      [assigned.id, chefUserId],
    );
    const acceptedOfferId = acceptedOffer.rows[0]?.id;
    if (!acceptedOfferId) {
      throw new Error("Failed to seed accepted chef offer");
    }
    await client.query(
      `INSERT INTO app.booking_assignments (booking_id, chef_user_id, accepted_offer_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (booking_id) DO UPDATE SET
         chef_user_id = EXCLUDED.chef_user_id,
         accepted_offer_id = EXCLUDED.accepted_offer_id,
         assigned_at = now()`,
      [assigned.id, chefUserId, acceptedOfferId],
    );
    await client.query("UPDATE app.bookings SET assigned_chef_user_id = $1 WHERE id = $2", [
      chefUserId,
      assigned.id,
    ]);
    await client.query(
      `INSERT INTO app.booking_transitions
         (booking_id, from_status, to_status, actor, actor_user_id, note, metadata)
       SELECT $1, 'REQUESTED', 'CHEF_MATCHED', 'SYSTEM', $2, 'Local seed assignment', $3::jsonb
       WHERE NOT EXISTS (
         SELECT 1 FROM app.booking_transitions WHERE booking_id = $1 AND to_status = 'CHEF_MATCHED'
       )`,
      [
        assigned.id,
        adminUserId,
        JSON.stringify({ source: "local-seed", offerId: acceptedOfferId }),
      ],
    );

    return {
      adminUserId,
      chefUserId,
      pendingReference: pending.reference,
      assignedReference: assigned.reference,
    };
  } finally {
    await client.end();
  }
}

async function cleanup(): Promise<void> {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const { name, child } of children) {
    try {
      if (!child.killed) {
        log(`stopping ${name}`);
        child.kill();
      }
    } catch {
      // Best-effort cleanup on process exit.
    }
  }
  try {
    await runtime.database?.stop();
  } catch {
    // Best-effort cleanup on process exit.
  }
  try {
    rmSync(statusPath, { force: true });
  } catch {
    // Best-effort cleanup on process exit.
  }
}

function spawnService(name: string, args: readonly string[], env: NodeJS.ProcessEnv): void {
  const child = spawn("pnpm", [...args], {
    cwd: repoRoot,
    shell: true,
    stdio: "inherit",
    env,
  });
  children.push({ name, child });
  child.on("exit", (code, signal) => {
    if (stopping) {
      return;
    }
    const exitCode = typeof code === "number" ? code : signal ? 1 : 0;
    log(`${name} exited with ${code ?? signal ?? "unknown"}`);
    void cleanup().then(() => process.exit(exitCode));
  });
  child.on("error", (error) => {
    if (stopping) {
      return;
    }
    log(`${name} failed: ${error.message}`);
    void cleanup().then(() => process.exit(1));
  });
}

process.on("SIGINT", () => void cleanup().then(() => process.exit(0)));
process.on("SIGTERM", () => void cleanup().then(() => process.exit(0)));
process.on("exit", () => {
  for (const { child } of children) {
    try {
      if (!child.killed) {
        child.kill();
      }
    } catch {
      // Nothing else can be awaited from the sync exit hook.
    }
  }
});

mkdirSync(statusDir, { recursive: true });
log("initialising disposable PostgreSQL/PostGIS for real local backend testing");
runtime.database = await provisionDisposablePostgres({ log });
const database = runtime.database;
log(`migrating ${database.databaseName} via ${database.strategy}`);
await migrate({ connectionString: database.connectionString, migrationsDir });
log("seeding approved admin and chef fixtures");
const seedData = await seed(database.connectionString);

const status = {
  apiUrl,
  webUrl,
  databaseStrategy: database.strategy,
  databaseName: database.databaseName,
  databaseUrl: database.connectionString,
  admin: { email: adminEmail, password: sharedPassword, userId: seedData.adminUserId },
  chef: {
    email: chefEmail,
    password: sharedPassword,
    userId: seedData.chefUserId,
    portalUrl: `${webUrl}/chef/portal`,
    pendingOfferReference: seedData.pendingReference,
    assignedBookingReference: seedData.assignedReference,
  },
  startedAt: new Date().toISOString(),
};
writeFileSync(statusPath, JSON.stringify(status, null, 2));

const apiEnv = {
  ...process.env,
  DEPLOY_ENV: "local",
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  DATABASE_URL: database.connectionString,
  API_HOST: apiAddress.hostname,
  API_PORT: apiAddress.port || "4000",
  CHEFMATE_WEB_APP_URL: webUrl,
  KMS_LOCAL_DEV_KEY: process.env.KMS_LOCAL_DEV_KEY ?? "CHANGE_ME_LOCAL_ONLY_PLATFORM_OPS_DEV_KEY",
  LINK_TOKEN_SECRET: process.env.LINK_TOKEN_SECRET ?? "CHANGE_ME_LOCAL_ONLY_LINK_TOKEN_SECRET",
};
const webEnv = {
  ...process.env,
  NEXT_PUBLIC_CHEFMATE_API_URL: apiUrl,
  NEXT_PUBLIC_MEALS_DATA_SOURCE: "http",
};

log(`status written to ${statusPath}`);
log(`admin login: ${adminEmail} / ${sharedPassword}`);
log(`chef login: ${chefEmail} / ${sharedPassword}`);
log(
  `chef portal fixture: pending ${seedData.pendingReference}, assigned ${seedData.assignedReference}`,
);
if (bootOnly) {
  log("boot-only verification complete; skipping service startup");
  await cleanup();
  process.exit(0);
}

log("starting actual API, worker, and Next.js frontend");

spawnService("api", ["dev:api"], apiEnv);
spawnService("worker", ["dev:worker"], apiEnv);
spawnService(
  "web",
  ["--filter", "@chefmate/web", "exec", "next", "dev", "-p", webAddress.port || "3000"],
  webEnv,
);
