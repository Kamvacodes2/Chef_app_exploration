# Chill Chef — Cinematic Hero

A Next.js 15 App Router cinematic hero experience: a chef model crossfades through
4 emotional states (waiting -> browsing -> engaged -> delighted) as a visitor
discovers meals, with per-category ambient palette theming, parallax, and
micro-interactions (steam, cutlery sheen, plate settle).

## Stack

Next.js 15 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Framer Motion ·
CSS keyframes for ambient loops · next/font (Playfair Display + Inter) · Zod ·
Vitest + React Testing Library · Playwright.

## Getting started

```bash
pnpm install
pnpm convert-assets   # regenerate public/images/* from Assets/ (sharp)
pnpm dev
```

Open http://localhost:3000.

## Testing

```bash
pnpm test              # vitest unit + integration
pnpm test:coverage     # coverage report (80%+ lines/branches/statements gate)
pnpm test:e2e          # Playwright (builds + serves the app first)
```

## Project layout

- `src/app` — Next.js App Router entry (server `page.tsx` fetches data via the
  repository and passes plain serializable props to the client `Hero`).
- `src/features/hero` — the hero feature: components, the `useReducer`-based
  state machine (`state/heroReducer.ts`), hooks (navigation, parallax, dwell
  timer, media queries, image preloading), and constants (palettes,
  transition timings, parallax depths).
- `src/data` — schema (Zod), types, and the repository layer
  (`MealsRepository` interface, `LocalMealsRepository`, a stubbed
  `HttpMealsRepository` for a future API swap, and a factory that picks one
  based on `NEXT_PUBLIC_MEALS_DATA_SOURCE`).
- `data/meals.json` — seed content: 6 categories (one per palette) with real
  meal photography converted from `Assets/Meals/*`.
- `scripts/convert-assets.mjs` — sharp-based WebP conversion for the 4 model
  frames and the curated meal photos.
- `tests/unit`, `tests/integration`, `tests/e2e` — Vitest/RTL and Playwright
  suites.

## Data / content notes

- The 4 model frames come from `Assets/Reduced_Size_Assets/Frame_1..4_Asset.png`
  and are converted to WebP in `public/images/model/`.
- Real meal photography already existed under `Assets/Meals/**`, so
  `data/meals.json` uses genuine photos (no placeholder divs were needed).
  6 categories were curated, one per required palette: Healthy EasyChef
  (olive), Chicken Meals (persimmon), Beef & Meat Premium (espresso),
  Overnight Oats (vanilla), Pasta Bakes & Kid Friendly (strawberry), Seven
  Colours Sunday Lunch (blood-red).
- **TODO**: only 3 meals per category (1 for Overnight Oats) were converted to
  keep the seed data manageable — drop additional WebP images into
  `public/images/meals/<category>/` and extend `data/meals.json` to flesh out
  each category further. Re-run `pnpm convert-assets` after adding new source
  files to `scripts/convert-assets.mjs`'s `MEAL_SOURCES` list.

## Known deviations from the original plan

- `src/data/repository/mealsRepository.ts` was renamed to
  `mealsRepositoryFactory.ts` because Windows' case-insensitive filesystem
  collides with the existing `MealsRepository.ts` interface file of the same
  name differing only in the first letter's case. The public API
  (`createMealsRepository`) is unchanged and re-exported from
  `src/data/repository/index.ts`.
