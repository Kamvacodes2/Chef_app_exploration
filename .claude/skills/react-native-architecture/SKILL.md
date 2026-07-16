---
name: react-native-architecture
description: Canonical React Native + Expo folder structure, path aliases, navigation typing, feature modules, state boundaries, API layer, theming, env config, and anti-patterns — derived from production TAP Mobile patterns for agent-driven design and review.
origin: ECC
---

# React Native Architecture Reference

Prescriptive guide for building and maintaining **Expo / React Native** frontends that are easy to update, scale, debug, and evolve. Patterns are grounded in a real multi-product app structure (TAP Mobile) and extended with **target-state** rules where the reference codebase mixed approaches.

Use this skill when **designing** a new RN app, **structuring** features, **reviewing** PRs, **migrating** legacy screens, or **debugging** navigation, imports, or state ownership — regardless of the specific PRD or product.

## When to Activate

- Scaffolding or restructuring `src/` (folders, modules, navigators)
- Adding path aliases, Metro/Babel/Jest/TS config
- Implementing or refactoring **React Navigation** (stacks, tabs, typed params)
- Choosing where state lives (Redux vs TanStack Query vs Context)
- Consolidating HTTP clients and API services
- Theming, colors, and avoiding one-off styling drift
- Expo `app.json` / EAS env and `apiConfig` patterns
- Code review: “Does this match our RN architecture?”

---

## 1. Canonical folder structure

### 1.1 Project root (Expo)

| Path | Purpose |
|------|---------|
| `index.ts` | Entry: load i18n, then `registerRootComponent(App)` |
| `App.tsx` | Root tree: providers, splash/loading gate, `NavigationContainer`, root navigator |
| `app.json` / `app.config.*` | Expo config; `extra` for environment URLs and non-secret build metadata |
| `eas.json` | EAS build profiles |
| `assets/` | Icons, splash — **only** assets referenced from Expo config |
| `android/`, `ios/` | Native projects (prebuild / dev client) |
| `scripts/` | Preflight scripts (e.g. import alias validation) |
| `patches/` | `patch-package` overrides |

**Avoid:** Duplicate trees like `assets copy/` inside the repo; backup files (`*.old`) under `src/`.

### 1.2 `src/` application source

| Path | Purpose |
|------|---------|
| `src/modules/` | **Primary feature architecture** — see §5 |
| `src/components/` | Shared, cross-feature UI (not tied to one product feature) |
| `src/navigation/` | Top-level navigators, product shells, shared animation configs |
| `src/store/` | Redux store — `index.ts`, typed hooks, `slice/*` |
| `src/context/` | Global React contexts (theme, auth shell, purchases, cart, etc.) |
| `src/services/` | **Legacy** global services — target: fold into `modules/core` + feature services |
| `src/configs/` | App config; `configs/theme/` (e.g. `colors.ts`) |
| `src/constants/` | App-wide constants (if small); prefer `modules/core/models/constants` for domain |
| `src/hooks/` | Shared hooks (`useX`) |
| `src/helper/` | Small pure helpers (path alias often `@helper`) |
| `src/utils/` | Broader utilities (files, URLs, certificates, etc.) |
| `src/assets/` | In-bundle images (png, svg, webp) |
| `src/locales/` | `i18n.ts` + per-locale JSON namespaces |
| `src/types/` | **Ambient / global augments only** (e.g. `svg.d.ts`) — not main domain types |
| `src/queryClient.ts` | Single TanStack Query client instance |
| `src/__mocks__/` | Jest mocks |

### 1.3 `src/modules/` layout (target)

```
src/modules/
├── core/                    # Platform shared layer
│   ├── component/ui/        # Design-system primitives → @ui-components
│   ├── helper/
│   ├── hooks/
│   ├── models/              # types, enums, constants, interfaces
│   ├── presentation/        # Optional shared presenters
│   └── services/            # API client, interceptors, platform services
├── navigation/types/        # Shared navigator param types, barrels
├── features/<FeatureName>/  # Vertical slices
│   ├── pages/               # Screen-level routes (PascalCase screens)
│   ├── containers/          # Wiring: hooks + navigation + composition
│   ├── presentation/      # Feature-specific presentational components
│   ├── hooks/
│   ├── services/            # Thin API modules using core HTTP client
│   └── components/        # Optional; only if not using presentation/ name
├── shared/                  # Cross-product flows (settings, certificates, …)
├── public/                  # Unauthenticated marketing / browse flows
└── auth/                    # Auth feature (or under features/auth)
```

**Rule:** New screens live under **`modules/**/pages/`**, not under a long-lived `src/screens/` tree. Migrate legacy `src/screens/*` into the matching module over time.

---

## 2. File naming conventions

| Kind | Convention | Examples |
|------|------------|----------|
| Components, screens, navigators | **PascalCase** | `DashboardScreen.tsx`, `RootNavigator.tsx`, `ThemeContext.tsx` |
| Hooks, utils, non-component modules | **camelCase** | `useDashboardCustomization.ts`, `urlUtils.ts` |
| Redux slices | **PascalCase** + `Slice` or consistent suffix | `UserDetailSlice.ts` — avoid mixed `*.slice.ts` vs `*Slice.ts` in one project |
| Types / enums | **camelCase** file + dot suffix | `user.types.ts`, `auth.types.ts`, `url.enum.ts` |
| Barrels | **`index.ts`** at module root and sometimes `pages/<Screen>/index.ts` | Re-export public API of a folder |

**Do not** leave `Something.tsx.old` in `src/`. Use git history or a `legacy/` folder outside the bundle path.

---

## 3. Path aliases (TypeScript, Babel, Metro, Jest)

### 3.1 Recommended alias set

Align **`tsconfig.json` `paths`**, **`babel.config.js`** (`babel-plugin-module-resolver`), **`metro.config.js`** (if `extraNodeModules` / resolver customizations are used), and **`jest.config.js` `moduleNameMapper`** to the **same** logical map.

Typical aliases:

- `@modules/*` → `src/modules/*`
- `@components/*` → `src/components/*`
- `@navigation/*` → `src/navigation/*`
- `@store/*` → `src/store/*`
- `@context/*` → `src/context/*`
- `@hooks/*` → `src/hooks/*`
- `@utils/*` → `src/utils/*`
- `@helper/*` → `src/helper/*`
- `@services/*` → `src/services/*` (until migrated)
- `@configs/*` → `src/configs/*`
- `@assets/*` → `src/assets/*`
- `@locales/*` → `src/locales/*`
- `@types/*` → `src/types/*`
- `@constants/*` → `src/constants/*`
- `@ui-components/*` → `src/modules/core/component/ui/*` (or your design-system root)
- `@apiConfig` → single file, e.g. `src/services/apiConfig.ts`

### 3.2 Parity rules

1. **Every** alias used in production code must resolve in **Metro** at runtime.
2. **Every** alias must appear in **Jest** `moduleNameMapper` if tests import it (including `@ui-components`).
3. Prefer **one** prefix style: document `@foo` in README; avoid mixing `@/` with `@modules` unless `paths` explicitly define `@/*` — comments and examples must match real config.
4. Add a **`check-imports`** (or similar) script in `package.json` **`prestart` / `preandroid` / `preios`** that validates imports against the same map to catch drift before native bundling.

---

## 4. Navigation architecture

### 4.1 Layering

1. **`NavigationContainer`** at app root — theme colors/fonts aligned with app theme.
2. **`RootNavigator`** — first split: e.g. **Authenticated `Main` vs Unauthenticated `Public`**, driven by auth state; wrap sensitive subtrees in **ErrorBoundary** where appropriate.
3. **`MainNavigator`** — profile/product selection and **product shell** routes (each product mounts its own navigator).
4. **Product navigators** — typically **bottom tabs** + nested **stack** per product; param lists are **large and explicit** for deep links (course id, lesson id, etc.).
5. **`PublicNavigator`** / **`AuthNavigator`** — stacks and/or tabs for marketing, login, signup, OTP.

### 4.2 Typing (required)

- Use **generics** on every navigator factory:

```typescript
const Stack = createStackNavigator<MainStackParamList>()
```

- **Avoid** `createStackNavigator()` with no type parameter on production stacks.
- Centralize param types under **`src/modules/navigation/types/`** and re-export barrels.
- **Target:** declare a **merged `RootParamList`** (React Navigation pattern) for type-safe `navigation.navigate` from shared utilities — reduces stringly-typed routes.

### 4.3 Shared behavior

- **Animation configs** — colocate under `src/navigation/animations/` and import from product navigators for consistency.
- **Deep linking** — document param shapes next to `*ParamList` definitions; keep route names stable when possible.

---

## 5. Module / feature architecture

### 5.1 Roles

| Layer | Responsibility |
|-------|----------------|
| **`modules/core`** | HTTP client, interceptors, shared models, design-system UI primitives, cross-cutting hooks |
| **`modules/features/<Name>`** | One vertical feature: pages, data fetching hooks, feature services |
| **`modules/shared`** | Flows used by multiple products (certificates, notifications, theme settings, …) |
| **`modules/public`** | Logged-out catalog, policies, help — often with its own context/services |
| **`modules/auth`** | Login, signup, password flows |

### 5.2 Feature internal pattern

- **`pages/`** — route components; keep them thin: call hooks, render containers or presentation.
- **`containers/`** — connect Redux/Query/navigation; minimal presentational markup.
- **`presentation/`** — dumb components receiving props.
- **`hooks/`** — `useFeatureData`, mutation hooks, etc.
- **`services/`** — functions that call the shared HTTP client (no second `fetch` wrapper).

### 5.3 Dependency rules

- Features may depend on **`core`** and **`navigation/types`**.
- **Do not** import one feature’s internals from another feature — expose a **minimal public API** via `index.ts` or move shared pieces to **`core`** or **`shared`**.

### 5.4 Duplication to eliminate over time

- Avoid parallel folders for the same product (e.g. `modules/tap_business/screens` vs `modules/features/TAPBusiness`) — **one** canonical home per product.

---

## 6. Component design

| Location | Holds |
|----------|--------|
| `src/components/` | App-wide widgets: tab bars, global modals, gamification chrome, headers — **no** feature business rules |
| `modules/core/component/ui/` | Buttons, inputs, typography, layout primitives — **`@ui-components`** |
| `modules/features/X/presentation/` | Feature-specific UI |

**Scaling:** When a primitive is used in 3+ features, promote it to **`@ui-components`**.

**Debugging:** Favor React DevTools + clear `displayName` on exported components in design-system files.

---

## 7. State management boundaries

| Mechanism | Owns |
|-----------|------|
| **Redux Toolkit + redux-persist** | Client global state that must survive restarts: auth tokens presence, user preferences, theme mode, selected profile/product, onboarding flags — **not** raw server lists unless no Query |
| **TanStack Query** | Server state: lists, detail entities, pagination, mutations with cache invalidate |
| **React Context** | Tree-local and cross-cutting providers: theme runtime, purchase SDK, parental controls, fragment/product switcher — avoid stuffing entire API responses here |

### Rules

1. **Single source of truth:** Do not mirror the same entity in Redux and Query; prefer **Query** for anything that maps to an API.
2. Use **typed** `useAppDispatch` and `useAppSelector` from `store/hooks.ts` — not raw `useDispatch`/`useSelector` — for correct typings.
3. Name **slice keys** and imports consistently; typos in `combineReducers` keys (`dashboarBuilder`) cause subtle bugs — catch with tests or exhaustive reducer typing.

---

## 8. API / service layer (target: one client)

### 8.1 Problems to avoid

- Parallel **class-based `fetch` client** and **axios** interceptors without a documented split.
- Legacy “god” `ApiService.tsx` beside modern feature services — agents should **converge** new code on one path.

### 8.2 Target pattern

1. **One axios instance** in `modules/core/services/Interceptors.tsx` (or `apiClient.ts`): base URL from `@apiConfig`, **SecureStore** (or equivalent) for tokens, refresh flow, optional auth event bus.
2. **Feature services** are thin: `getThing()`, `updateThing()` — no duplicate base URL logic.
3. **`queryClient.ts`** — single `QueryClient`; pass to `QueryClientProvider` in `App.tsx`.
4. **Invalidate** React Query cache on logout from interceptors when session dies — coordinate with Redux reset if needed.

### 8.3 Configuration

- **`apiConfig`** reads `expo.extra` (environment map) and normalizes base URL (trailing slashes). Log resolved URL only in `__DEV__`.

---

## 9. TypeScript conventions

- **Domain types:** `modules/core/models/types/*.types.ts`, `enums/*.ts`, `interfaces/*`.
- **Feature types:** colocated, e.g. `passport.types.ts` next to the feature.
- **Navigation types:** `modules/navigation/types/*`.
- **`src/types/`:** module declarations and ambient augments only.

**Strictness:** Prefer **`"strict": true`**. If migrating incrementally, enable **`strictNullChecks`** first, then `strict`. Avoid `any`; use `unknown` + narrowing or explicit DTO types from API.

---

## 10. Styling and theming

- **Single source of truth** for palettes: `src/configs/theme/colors.ts` (document in file header).
- Components consume colors via **`useTheme()`** / theme context — **not** scattered hex strings.
- Default to **`StyleSheet.create`** for static styles; inline styles only for **dynamic** values or one-off layout experiments.
- Align **`NavigationContainer` theme** with the same tokens as the rest of the app.
- If **React Native Paper** (or similar) grows, bridge Paper theme to the same color object.

**Lint/review:** Flag new inline hex in PR review unless mapped to theme constants.

---

## 11. Configuration and environment

- **`app.json` `expo.extra`:** `currentEnvironment` key + **`environments`** object (`production` / `uat` / `development`) with **`baseURL`**, timeouts — **no secrets** in committed JSON when avoidable.
- **Secrets:** EAS **secrets** / env vars for CI and production; `googlePlacesKey`-style keys empty in repo templates.
- **`react-native-dotenv`:** Babel plugin for `@env`; extend **`env.d.ts`** for each variable (pattern from existing `REACT_APP_*`).
- **Advanced:** `app.config.js` for dynamic `extra` per EAS profile if UAT/prod must switch without manual file edits.

---

## 12. Bootstrap / entry pattern

### 12.1 `index.ts`

```text
import "./src/locales/i18n"
registerRootComponent(App)
```

Load **i18n before** any screen renders.

### 12.2 `App.tsx` provider order (illustrative)

Keep a consistent order; typical:

1. `Redux` `Provider`
2. `PersistGate` (wait for rehydration before routing decisions that depend on persisted auth)
3. `QueryClientProvider`
4. `SafeAreaProvider`
5. Product/context providers (auth, theme, API context, purchases, …)
6. `NavigationContainer` + `RootNavigator`

**Splash / loading:** Replace arbitrary **`setTimeout`** splash delays with a **readiness gate**: fonts loaded, i18n ready, persist rehydrated (and optionally minimal auth check). Reduces flicker and race conditions.

---

## 13. Tooling checklist

| Area | Recommendation |
|------|----------------|
| ESLint | `eslint-config-expo/flat` + TypeScript resolver; `import/no-unresolved` with ignore only for explicit virtual modules (`^@env$`) |
| Preflight | `npm run check-imports` before `expo start` / native run |
| Jest | `moduleNameMapper` matches **all** TS path aliases; include `@ui-components` |
| Coverage | `collectCoverageFrom` scoped to `src/**/*` (exclude tests/mocks) — not a single feature subtree unless intentional |
| TS | Move toward `strict`; keep `skipLibCheck` if needed for dependency noise |

---

## 14. Anti-pattern catalog

Agents should **reject or refactor** these patterns in new work:

| Anti-pattern | Why | Fix |
|--------------|-----|-----|
| **Two HTTP stacks** (`fetch` client + axios) without documented boundary | Double interceptors, inconsistent errors | One axios (or one fetch) + feature services |
| **Untyped navigators** | Broken refactors, bad deep links | `createStackNavigator<ParamList>()` everywhere |
| **Same entity in Redux + Query** | Stale data, sync bugs | Query owns server entity; Redux owns client prefs |
| **New screens only in `src/screens/`** | Splits architecture | `modules/features/.../pages` |
| **Alias only in tsconfig** | Metro/Jest runtime failures | Parity across TS, Babel, Metro, Jest |
| **Secrets in `app.json`** | Leakage, bad rotation | EAS secrets + `extra` from env |
| **Fixed splash `setTimeout`** | Races on slow devices | Readiness-based splash |
| **Typo’d reducer keys** | Silent missing state | Tests + naming review |
| **`*.old`, `assets copy/` under app tree** | Confusion, bundle risk | Delete or move out of repo |
| **Raw `useDispatch` in app code** | Weak typings | `useAppDispatch` / `useAppSelector` |
| **Inline hex everywhere** | Theme drift | `colors.ts` + `useTheme` |

---

## Agent output cheatsheet

When applying this skill to a task, briefly state:

1. **Which folder** new files belong in (`modules/features/X/...` vs `core` vs `components`).
2. **Navigation:** which `ParamList` is extended and whether types are exported from `navigation/types`.
3. **State:** Redux vs Query vs Context for the data touched.
4. **HTTP:** only the shared client from `core` services.

This keeps PRs consistent and debuggable across products and PRDs.
