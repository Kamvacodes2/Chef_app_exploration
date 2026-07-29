# Infrastructure (S02)

Local and CI infrastructure only. **No production infrastructure is defined or
deployed in this step** — `staging` and `production` exist as configuration
placeholders in `.env.example` and nothing more.

## Database image

`postgis/postgis:16-3.4` is pinned everywhere: `docker-compose.yml`, the CI
service container, and `packages/testkit`'s Docker strategy. Never `latest`.

## Local development

```bash
pnpm db:up          # start the pinned PostGIS container
pnpm db:migrate     # apply forward migrations
pnpm db:down        # stop and destroy the volume
```

`DATABASE_URL` in your `.env.local` should match the compose credentials.

## Disposable databases for tests

`pnpm test:db`, `pnpm test:integration` and `pnpm test:ci` each provision a
**disposable** database through `packages/testkit`. Three strategies are tried
in order, and provisioning **fails loudly** if none is available — a database
suite never silently skips.

| Strategy        | When it is used                                                                                                                                           | How it is disposed                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `external`      | `CHEFMATE_TEST_PG_URL` or `DATABASE_URL` is set. This is the CI path: the workflow attaches the pinned PostGIS **service container** and exports its URL. | A uniquely named database is created per run and dropped afterwards.                                                                            |
| `docker`        | A container runtime is on `PATH`. The intended local path.                                                                                                | The container is started with `--rm` and force-removed on teardown.                                                                             |
| `local-cluster` | Neither of the above, but a local PostgreSQL installation with PostGIS is present.                                                                        | `initdb` creates a throwaway cluster in a temp directory on a random port with loopback-only trust auth; it is stopped and deleted on teardown. |

### `local-cluster` on Windows

The provisioner auto-discovers `C:\Program Files\PostgreSQL\<version>\bin`.
Override with `CHEFMATE_PG_BIN` if PostgreSQL is installed elsewhere:

```bash
CHEFMATE_PG_BIN="/c/Program Files/PostgreSQL/18/bin" pnpm test:db
```

PostGIS must be available on that installation — the provisioner asserts
`postgis` appears in `pg_available_extensions` before handing back a connection,
so a missing PostGIS is an immediate, explicit failure.

## Deployment posture

Provider-neutral by design:

- **Web** builds to standard Next.js output; no host-specific adapter.
- **API and worker** compile to plain Node and are intended to run as
  OCI-compatible containers. No image is built or published in S02.
- **Database** is addressed only by a `DATABASE_URL` connection string and
  PostgreSQL-compatible SQL, so no managed-Postgres vendor is coupled in.
- **Secrets** come from the environment (GitHub Actions secrets in CI). Nothing
  is committed.
