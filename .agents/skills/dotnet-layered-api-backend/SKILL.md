---
name: dotnet-layered-api-backend
description: >-
  Documents layered ASP.NET Core + EF Core backend architecture (Domain, Application/Services,
  Infrastructure, API), dependency rules, DTO contracts, auth, repositories, and extension
  patterns derived from My_Life_Api. Use when designing or implementing .NET APIs that must stay
  aligned with this codebase, when onboarding agents or engineers to the stack, or when porting
  the same structure to a new product (greenfield) while keeping frontend/API contracts consistent.
---

# Layered .NET API backend (My_Life_Api reference)

This skill captures **principles, project boundaries, and implementation patterns** used under `My_Life_Api/src`. It is written so agents and humans can **reproduce the same architecture** on other projects: same separation of concerns, same API envelope for SPAs/mobile clients, and predictable places to add entities, services, and endpoints.

---

## 1. High-level architecture

The backend is a **four-project layered monolith** (single deployable host, logical boundaries in `.csproj` files).

| Layer | Project (path) | Responsibility |
|-------|----------------|----------------|
| **Presentation (HTTP)** | `Service_Api` (`Presentation/Service_Api`) | ASP.NET Core host: controllers, middleware, Swagger, JWT wiring, CORS, static files, minimal health routes. |
| **Application / domain services** | `Service_Services` (`Service/Service_Services`) | Use cases: orchestration, validation outcomes, DTOs, service interfaces, mapping from entities → API models. **No** `DbContext` type usage in constructors of “pure” services beyond what EF types require for `IQueryable` (see dependencies). |
| **Infrastructure** | `Service_Infrastructure` (`Infrastructure/Service_Infrastructure`) | EF Core `AppDbContext`, Fluent API entity configurations, `GenericRepository<>`, migrations, DB factory + scoped context registration, optional in-memory DB for dev. |
| **Domain** | `Service_Domain` (`Domain/Service_Domain`) | POCO entities, enums, shared constants/extensions. **No** infrastructure references. |

**Dependency graph (project references):**

- `Service_Api` → `Service_Infrastructure`, `Service_Services`
- `Service_Services` → `Service_Domain` (plus NuGet: EF abstractions, auth attributes, etc.)
- `Service_Infrastructure` → `Service_Domain`, `Service_Services` (implements `IGenericRepository<>` and other interfaces **declared under** `Service_Services`)

**Design note:** Repository interfaces live in the **application** assembly (`Service_Services.Interfaces.AppRepositories`), not in Domain. Infrastructure references Services **only** to implement those interfaces. This is a pragmatic variant of “ports and adapters”: the port is defined next to the code that consumes it.

---

## 2. Core principles (portable checklist)

1. **Thin controllers** — Resolve `userId` from claims, call one application service method, map result to `IActionResult` using shared helpers (`OkData`, `PlayerActionResult`, etc.). No business rules in controllers.
2. **Stable API contract for frontends** — Success: `ApiResponse<T>` (`success`, `data`, optional `meta`). Errors: `ApiErrorResponse` (`success`, `error`, `code`, optional `details`). JSON **camelCase** at the serializer level.
3. **Explicit mutation outcomes** — Game “player actions” return `(PlayerActionOutcome, SnapshotDto?)` so the controller can return 200/400/404/409 with a **consistent error body**, not ad-hoc strings.
4. **Single DbContext per HTTP request** — `IDbContextFactory<AppDbContext>` + **scoped** `AppDbContext` resolved from the factory keeps long-lived factory semantics while satisfying Identity/scoped consumers.
5. **Configuration layering** — Repo-root `.env` loaded early; `appsettings` + optional Azure Key Vault; secrets never hardcoded in source.
6. **EF Core as source of truth for schema** — `ApplyConfigurationsFromAssembly` for all `IEntityTypeConfiguration<>` classes; shared `BaseEntity` conventions (Guid, dates, soft-delete FK) via `BaseEntityConfiguration.ConfigureBaseColumns`.
7. **Identity for auth primitives** — `AddIdentityCore<IdentityUser>` + EF stores on `AppDbContext`; JWT for API clients (no cookie redirect to `/Account/Login`).
8. **Observability and safety nets** — Global exception middleware serializing `ApiErrorResponse`; optional rate-limit middleware; health + DB health endpoints.

---

## 3. Composition root (`Program.cs`)

The host application wires everything in a fixed order:

1. **Bootstrap env** — `LocalEnvBootstrap` (in Infrastructure) loads repository `.env` and maps aliases (e.g. connection string / auth key) into ASP.NET Core configuration keys **before** `WebApplication.CreateBuilder` consumes configuration.
2. **Configuration** — `AddAppConfigurations`, then dev vs prod Key Vault extensions.
3. **Auth** — `AddJwtAuthentication`; `AddIdentityCore` + roles + EF stores.
4. **Cross-cutting services** — Memory cache, `HttpClient`, CORS policy (`CORSSettings:AllowedOrigins`), Swagger + JWT security scheme + XML comments.
5. **Data** — `AddApplicationDbContextAndRepositories` (factory + scoped context + generic repository registration).
6. **Application services** — `AddApplicationServices()` extension on `IServiceCollection` registers all feature services as **scoped** (typical for web requests).
7. **MVC** — Controllers + global `ValidateFilter`; JSON camelCase.
8. **Pipeline** — Localization, static files, Swagger (dev), CORS, optional rate limit, HTTPS redirect (non-dev), `ApiExceptionMiddleware`, authentication, authorization, `/health`, `/health/db`, `MapControllers`.
9. **Startup migration** — After `Build()`, a scope runs `Database.MigrateAsync()` when a real SQL connection string exists; gameplay template seeding runs in the same phase.

**Agent takeaway:** When adding a feature, you almost always touch **three** places: DI registration (`DependancyInjectionExtentions` in Services and/or Infrastructure), a **service class**, and a **controller**. Domain + configuration classes if the model changes.

---

## 4. Domain layer (`Service_Domain`)

### 4.1 Entities

- **`BaseEntity`** — `Id`, `Guid` (DB default `NEWID()`), `CreatedDate`, `RecordStatusId` (soft delete / lifecycle), optional audit fields, navigation to `RecordStatus`.
- **Type tables** — Often extend patterns like `BaseTypeEntity` for lookup data (housing, food, transport, etc.).
- **Aggregates** — Example: `Game` with related `GameState` and child collections (debts, investments, flags) modeled as separate entities with FKs.

**Rule:** Domain entities are persistence-friendly POCOs but **do not reference** Infrastructure or HTTP types.

### 4.2 Supporting types

- **Enums** — e.g. localization, game status, categories.
- **Constants** — Azure names, app-wide constants.
- **Extensions** — e.g. `PagedResult<T>` for repository pagination return type.

---

## 5. Infrastructure layer (`Service_Infrastructure`)

### 5.1 `AppDbContext`

- Inherits **`IdentityDbContext`** (Identity tables + app tables).
- **`OnModelCreating`** — `modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly)` so every entity’s mapping lives in a dedicated `IEntityTypeConfiguration<T>` class under `AppContext/Configuration/`.
- **Conventions** — e.g. all `decimal` properties default to precision `(19,6)`.

### 5.2 DbContext lifetime

```text
AddDbContextFactory<AppDbContext>(...)
AddScoped<AppDbContext>(sp => factory.CreateDbContext())
```

- **Factory** — Useful for tooling, background work, or scenarios that need explicit context creation.
- **Scoped context** — One context per HTTP request; shared by all repositories in that request.

**Dev fallback:** If `ConnectionStrings:AppDb` is missing, the app uses **`UseInMemoryDatabase("MyLife_Dev")`** so the API runs without SQL Server (migrations skipped).

### 5.3 Generic repository

- **Interface:** `IGenericRepository<T>` (`Service_Services.Interfaces.AppRepositories`) — CRUD, paging, `GetQueryable`, `SaveChangesAsync`, `DeleteWhereAsync` (bulk delete), includes/order expressions.
- **Implementation:** `GenericRepository<T>` — Takes `AppDbContext`; uses `Set<T>()`; supports no-tracking queries for reads.

**Pattern for transactions across multiple inserts:** `StageForInsert` + single `SaveChangesAsync` at the end of a unit of work in a service (avoids per-row SaveChanges in a loop).

### 5.4 Migrations

- EF migrations live with Infrastructure (typical `AppContext/Migrations` folder).
- Applied automatically on startup when using SQL Server (see `RunApplicationDbContextMigrationAndSeeding`).

---

## 6. Application layer (`Service_Services`)

### 6.1 Feature services

Each major capability has an **interface** under `Interfaces/Services/...` and an implementation under `Services/...`, registered in `DependancyInjectionExtentions.AddApplicationServices`.

Examples from the codebase:

- `IGameService` / `GameService` — game lifecycle, advance cycle, config, snapshots.
- `IGamePlayerActionService` / `GamePlayerActionService` — donate, gamble, lifestyle, investments, etc.; returns structured outcomes.
- `IMonthlyCycleEngine`, `IGameplayDecisionService`, catalog services, leaderboard, schools/classes, stocks.

**Dependencies:** Services inject `IGenericRepository<T>` for entities they need, plus other services (engines, lookups). They contain **business rules**, **JSON** serialization for stored blobs when needed, and **mapping** to DTOs.

### 6.2 DTOs and API contracts

Organize under `ServiceDtos`:

- **`Api/`** — Request/response types consumed by controllers and clients (`CreateGameRequest`, `GameWithStateDto`, `PlayerActionRequests`, mapping helpers like `GameStateSnapshotMapping`).
- **`Common/`** — Shared response wrappers (legacy/alternate DTOs may exist alongside `ApiResponse<T>`).

**Important:** Keep **entities off the wire**. Controllers return DTOs only. Complex state (meters, nested collections) is flattened into JSON-friendly structures matching the **Expo/React** client’s expectations.

### 6.3 Player action outcome pattern

Mutations that can fail for domain reasons return:

- `PlayerActionStatus` — `Ok`, `GameNotFound`, `NotInProgress`, `ValidationError`, `Conflict`, etc.
- `PlayerActionOutcome` — carries `Status` + optional `Error` message.
- Snapshot — e.g. `GameWithStateDto` on success so the client can **hydrate full state** in one round-trip.

The controller centralizes HTTP mapping (e.g. `GamesController.PlayerActionResult`).

**Reusable idea:** Any SPA that does optimistic UI benefits from **either** returning the full aggregate after mutation **or** a clear validation error with stable `code` fields (`ApiErrorCodes`).

### 6.4 Embedded resources

Static gameplay data (ledger rates, catalog JSON) ships as **embedded resources** in `Service_Services` with `LogicalName` — loaded at runtime without external files. Useful for templates that must version with the API.

---

## 7. API layer (`Service_Api`)

### 7.1 Base controller

`ApiV1ControllerBase`:

- `[ApiController]`, `[Produces("application/json")]`
- `OkData<T>(T data)` → wraps in `ApiResponse<T>`
- `UserId` from `ClaimTypes.NameIdentifier` or `sub`

### 7.2 Routing and versioning

- Controllers use **`[Route("api/v1/...")]`** and `[Authorize]` where required.
- `AuthController` allows anonymous for register/login.

### 7.3 Swagger

- `SwaggerOperation(OperationId = "...")` for stable client generation.
- JWT bearer definition; XML comments included when documentation file is generated.

### 7.4 Middleware

- **`ApiExceptionMiddleware`** — Catches unhandled exceptions; responds with JSON `ApiErrorResponse` and camelCase serialization.
- **`RateLimitingMiddleware`** — Gated by configuration flag.
- **`LocalizationMiddleware`** — With `JsonStringLocalizer` for string resources.

### 7.5 Validation

- **FluentValidation** packages referenced; **`ValidateFilter`** applied globally to controllers.
- **`ApiBehaviorOptions.SuppressModelStateInvalidFilter = true`** — invalid model state is handled via the project’s filter/validation approach rather than the default 400 formatter alone.

---

## 8. Security and identity

| Concern | Implementation |
|---------|------------------|
| Password users | ASP.NET Core Identity (`UserManager<IdentityUser>`) |
| API sessions | JWT (`JwtTokenService`); bearer token in `Authorization` header |
| Authorization | `[Authorize]` on controllers/actions; user id from claims |
| CORS | Named policy `AllowedOrigin` from config array + sensible localhost defaults |
| Secrets | Key Vault (dev/prod variants), env vars, `AuthorizationSettings:AuthKey` |

**Agent note:** `AddIdentityCore` is used (not full UI Identity) to avoid redirecting API clients to non-existent Razor login pages.

---

## 9. Frontend integration (contract summary)

Agents working on `frontend_My_Life` should assume:

1. **Base path** — `/api/v1/...` (see individual controllers; some routes use absolute paths like `/api/v1/creategame`).
2. **Success shape** — `{ success: true, data: T, meta?: ... }`.
3. **Error shape** — `{ success: false, error: string, code: string, details?: Record<string,string> }` for many failures.
4. **Naming** — JSON properties are **camelCase** (ASP.NET Core `JsonNamingPolicy.CamelCase`).
5. **Auth** — `Authorization: Bearer <jwt>` after login/register.

When adding an endpoint, **update the TypeScript client** in `data/remote/` and types under `types/` or DTO mirrors as the project does today.

---

## 10. How to extend this backend (step-by-step)

### New persisted entity

1. Add entity class in `Service_Domain/Entities/` (inherit `BaseEntity` if it matches your table pattern).
2. Add `DbSet<>` on `AppDbContext`.
3. Add `YourEntityConfiguration : IEntityTypeConfiguration<YourEntity>` under `Infrastructure/.../Configuration/`; call `ConfigureBaseColumns` when inheriting `BaseEntity`.
4. Add EF migration (from Infrastructure project / startup project as your team prefers).
5. Use `IGenericRepository<YourEntity>` from a service, or add specialized queries via `GetQueryable()`.

### New application capability

1. Define `IYourFeatureService` under `Service_Services/Interfaces/...`.
2. Implement `YourFeatureService` under `Service_Services/Services/...`.
3. Register in `DependancyInjectionExtentions.AddApplicationServices`.
4. Add DTOs under `ServiceDtos/Api/`.
5. Add controller (or action) in `Service_Api/Controllers/`, inject the interface, return `OkData` / domain-specific result pattern.

### New command-style mutation (game actions)

1. Add request DTO to `PlayerActionRequests` (or adjacent file).
2. Add method on `IGamePlayerActionService` + `GamePlayerActionService` using `RunMutationAsync`-style helper if present (load game, validate, mutate, save, return snapshot + outcome).
3. Add POST on `GamesController` delegating to `PlayerActionResult`.

---

## 11. Scaling and reuse beyond this repo

**What transfers cleanly**

- Four-layer project split with **composition root** in the host.
- **ApiResponse / ApiErrorResponse** as a documented contract for any SPA or mobile app.
- **Scoped DbContext** + generic repository for CRUD-heavy domains.
- **Outcome + snapshot** pattern for complex client state sync.
- **EF configurations per entity** instead of giant `OnModelCreating`.

**What to revisit for larger systems**

- **Repository generic** — For heavy read models, consider explicit queries, Dapper, or read replicas instead of one mega-repository interface.
- **Interfaces location** — Some teams move repository interfaces to `Domain` or a dedicated `Application.Abstractions` project to avoid Infrastructure → Application reference; plan extra project if you need stricter dependency rules.
- **Vertical slices** — Alternative folder layout is feature folders per module; the **same principles** apply, only file organization changes.
- **MediatR / CQRS** — Optional; this codebase uses classic service classes.

---

## 12. File map (quick reference)

```text
My_Life_Api/src/
├── Domain/Service_Domain/          # Entities, enums, constants, PagedResult
├── Service/Service_Services/
│   ├── DependancyInjectionExtentions.cs
│   ├── Interfaces/AppRepositories/ # IGenericRepository<>
│   ├── Interfaces/Services/        # IGameService, IGamePlayerActionService, ...
│   ├── ServiceDtos/Api/            # Requests, responses, mapping
│   └── Services/MyLife/            # GameService, GamePlayerActionService, engines, catalogs
├── Infrastructure/Service_Infrastructure/
│   ├── DependancyInjectionExtentions.cs  # DbContext + repositories
│   ├── AppContext/AppDbContext.cs
│   ├── AppContext/Configuration/   # Fluent API per entity
│   ├── AppRepositories/GenericRepository.cs
│   └── Configuration/LocalEnvBootstrap.cs
└── Presentation/Service_Api/
    ├── Program.cs
    ├── Controllers/
    ├── Middleware/
    ├── Extensions/                 # JWT, Azure config, etc.
    └── Services/                   # JwtTokenService, etc.
```

---

## 13. When to load this skill

Load when:

- Implementing or reviewing **My_Life_Api** changes.
- Spinning a **new .NET API** that should mirror this structure and **frontend contracts**.
- Explaining to another agent **where** to put entities, services, DTOs, and DI registration.
- Auditing **separation of concerns** (controller vs service vs repository vs entity).

Do not treat this skill as mandatory for unrelated stacks (Node, Go, etc.); use **section 2 (principles)** as a portable checklist and re-implement with that ecosystem’s idioms.
