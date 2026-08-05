// Converts source PNG/JPG assets into optimized WebP files consumed by the app.
//
// Idempotent by default: each source file's SHA-256 hash is recorded in
// `.convert-assets-cache.json` (tracked in git, next to this script) after a
// successful conversion. On subsequent runs, if a source's hash still matches
// the cache AND its output file(s) still exist on disk, the conversion is
// skipped entirely rather than re-run through sharp. This matters because
// sharp/libvips isn't perfectly byte-deterministic across runs -- re-encoding
// unchanged sources produces spurious diffs under public/images/.
//
// Run with: pnpm convert-assets
// Pass --force to bypass the cache and re-convert every asset unconditionally
// (e.g. after a sharp/libvips upgrade, when fresh output is wanted for all
// assets): pnpm convert-assets -- --force
import sharp from "sharp";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CACHE_PATH = join(__dirname, ".convert-assets-cache.json");
const FORCE = process.argv.includes("--force");

function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    console.warn(`[warn] could not parse ${CACHE_PATH}, starting with an empty cache`);
    return {};
  }
}

const cache = loadCache();
let cacheDirty = false;

function saveCache() {
  if (!cacheDirty) return;
  const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(CACHE_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

function hashFile(absPath) {
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

const FRAME_SOURCES = [
  { src: "Assets/Reduced_Size_Assets/frame_assets/1.png", out: "public/images/model/frame-1.webp" },
  { src: "Assets/Reduced_Size_Assets/frame_assets/2.png", out: "public/images/model/frame-2.webp" },
  { src: "Assets/Reduced_Size_Assets/frame_assets/3.png", out: "public/images/model/frame-3.webp" },
];

const MEAL_SOURCES = [
  // olive
  {
    src: "Assets/Meals/Healthy Meals/chicken_gyro_bowl.jpg",
    out: "public/images/meals/healthy/chicken-gyro-bowl.webp",
  },
  {
    src: "Assets/Meals/Healthy Meals/Burger_bowl.jpg",
    out: "public/images/meals/healthy/burger-bowl.webp",
  },
  {
    src: "Assets/Meals/Healthy Meals/chicken_salad_bowl.jpg",
    out: "public/images/meals/healthy/chicken-salad-bowl.webp",
  },
  // persimmon
  {
    src: "Assets/Meals/Chicken Meals/peri_peri_chicken.jpg",
    out: "public/images/meals/chicken/peri-peri-chicken.webp",
  },
  {
    src: "Assets/Meals/Chicken Meals/bbq_chicken.jpg",
    out: "public/images/meals/chicken/bbq-chicken.webp",
  },
  {
    src: "Assets/Meals/Chicken Meals/roasted_chicken.jpg",
    out: "public/images/meals/chicken/roasted-chicken.webp",
  },
  // espresso
  {
    src: "Assets/Meals/Beef and Meat Premium Meals/steak_and_chips.jpg",
    out: "public/images/meals/beef-premium/steak-and-chips.webp",
  },
  {
    src: "Assets/Meals/Beef and Meat Premium Meals/oxtail_stew.jpg",
    out: "public/images/meals/beef-premium/oxtail-stew.webp",
  },
  {
    src: "Assets/Meals/Beef and Meat Premium Meals/lamb_chops.jpg",
    out: "public/images/meals/beef-premium/lamb-chops.webp",
  },
  // vanilla
  {
    src: "Assets/Meals/Overnight Oats/overnight_oats.jpg",
    out: "public/images/meals/breakfast/overnight-oats.webp",
  },
  // strawberry
  {
    src: "Assets/Meals/Pasta Bakes and Kid Friendly/beef_lasagne.jpg",
    out: "public/images/meals/pasta-bakes/beef-lasagne.webp",
  },
  {
    src: "Assets/Meals/Pasta Bakes and Kid Friendly/Meatball_pasta.jpg",
    out: "public/images/meals/pasta-bakes/meatball-pasta.webp",
  },
  {
    src: "Assets/Meals/Pasta Bakes and Kid Friendly/cheesy_mince_pasta.jpg",
    out: "public/images/meals/pasta-bakes/cheesy-mince-pasta.webp",
  },
  // blood-red
  {
    src: "Assets/Meals/Seven Colours - Sunday Lunch/Roast_chicken_seven_colours(1).jpg",
    out: "public/images/meals/sunday-lunch/roast-chicken-seven-colours.webp",
  },
  {
    src: "Assets/Meals/Seven Colours - Sunday Lunch/Oxtail_seven_colours.jpg",
    out: "public/images/meals/sunday-lunch/oxtail-seven-colours.webp",
  },
  {
    src: "Assets/Meals/Seven Colours - Sunday Lunch/Chicken_seven_colours.jpg",
    out: "public/images/meals/sunday-lunch/chicken-seven-colours.webp",
  },
];

const INTRO_SOURCES = [
  {
    src: "Assets/Accompanying Designs/Accompanying Designs/Prepping.png",
    out: "public/images/intro/prepping.webp",
  },
  {
    src: "Assets/Accompanying Designs/Accompanying Designs/Cooking.png",
    out: "public/images/intro/cooking.webp",
  },
  {
    src: "Assets/Accompanying Designs/Accompanying Designs/Garnishing.png",
    out: "public/images/intro/garnishing.webp",
  },
  {
    src: "Assets/Accompanying Designs/Accompanying Designs/Relaxing.png",
    out: "public/images/intro/relaxing.webp",
  },
];

const GOAL_TILE_SOURCES = [
  {
    src: "Assets/Tiles/chefmate-build-muscle-transparent.png",
    out: "public/images/goals/build-muscle.webp",
  },
  {
    src: "Assets/Tiles/chefmate-anti-inflammatory-transparent.png",
    out: "public/images/goals/anti-inflammatory.webp",
  },
  {
    src: "Assets/Tiles/chefmate-post-partum-transparent.png",
    out: "public/images/goals/post-partum.webp",
  },
  {
    src: "Assets/Tiles/chefmate-mediterranean-transparent.png",
    out: "public/images/goals/mediterranean.webp",
  },
  {
    src: "Assets/Tiles/chefmate-just-good-food-transparent.png",
    out: "public/images/goals/just-good-food.webp",
  },
];

const HOW_IT_WORKS_SOURCES = [
  {
    src: "Assets/Get Your Time Back/Choose What You're Craving.png",
    out: "public/images/how-it-works/choose-what-youre-craving.webp",
  },
  {
    src: "Assets/Get Your Time Back/Book a Time.png",
    out: "public/images/how-it-works/book-a-time.webp",
  },
  {
    src: "Assets/Get Your Time Back/Shop with Confidence.png",
    out: "public/images/how-it-works/shop-with-confidence.webp",
  },
  {
    src: "Assets/Get Your Time Back/We Match You.png",
    out: "public/images/how-it-works/we-match-you.webp",
  },
  {
    src: "Assets/Get Your Time Back/Your Chef Arrives.png",
    out: "public/images/how-it-works/your-chef-arrives.webp",
  },
  {
    src: "Assets/Get Your Time Back/Freshly Cooked.png",
    out: "public/images/how-it-works/freshly-cooked.webp",
  },
  {
    src: "Assets/Get Your Time Back/Kitchen Left Spotless.png",
    out: "public/images/how-it-works/kitchen-left-spotless.webp",
  },
  {
    src: "Assets/Get Your Time Back/Enjoy Your Evening.png",
    out: "public/images/how-it-works/enjoy-your-evening.webp",
  },
];

const SHOWCASE_SOURCES = [
  {
    src: "Assets/Slide_prototype/both hands below.png",
    out: "public/images/showcase/hands-below.webp",
  },
  {
    src: "Assets/Slide_prototype/both_hands_above.png",
    out: "public/images/showcase/hands-above.webp",
  },
  {
    src: "Assets/Slide_prototype/hand_below_left.png",
    out: "public/images/showcase/hand-below-left.webp",
  },
  {
    src: "Assets/Slide_prototype/hand_below_right.png",
    out: "public/images/showcase/hand-below-right.webp",
  },
  {
    src: "Assets/Slide_prototype/hand_above_left.png",
    out: "public/images/showcase/hand-above-left.webp",
  },
  {
    src: "Assets/Slide_prototype/hand_above_right.png",
    out: "public/images/showcase/hand-above-right.webp",
  },
];

// Landing-page hero carousel "story" images (LANDING_ASSETS in
// src/features/landing/content.ts) are full-bleed photographic PNGs with no
// alpha channel, all matching the same 1448x1086 (4:3) frame so the carousel
// can swap between them under object-fit: cover without per-slide cropping.
const HERO_STORY_SOURCES = [
  {
    src: "Assets/Tiniefied New Landing Page/come_home_switchoff.jpg",
    out: "public/images/chefmate/story-after-work.png",
  },
];

const LOOP_SOURCES = [
  { src: "Assets/Design/1.png", out: "public/images/loop/meal-1.webp" },
  { src: "Assets/Design/2.png", out: "public/images/loop/meal-2.webp" },
  { src: "Assets/Design/3.png", out: "public/images/loop/meal-3.webp" },
  { src: "Assets/Design/4.png", out: "public/images/loop/meal-4.webp" },
  { src: "Assets/Design/5.png", out: "public/images/loop/meal-5.webp" },
  { src: "Assets/Design/6.png", out: "public/images/loop/meal-6.webp" },
  { src: "Assets/Design/7.png", out: "public/images/loop/meal-7.webp" },
  { src: "Assets/Design/8.png", out: "public/images/loop/meal-8.webp" },
  { src: "Assets/Design/9.png", out: "public/images/loop/meal-9.webp" },
];

const SHOWCASE_PLATE_SOURCES = [
  { src: "Assets/Design/1.png", out: "public/images/showcase/plate-1.webp" },
  { src: "Assets/Design/2.png", out: "public/images/showcase/plate-2.webp" },
  { src: "Assets/Design/3.png", out: "public/images/showcase/plate-3.webp" },
  { src: "Assets/Design/4.png", out: "public/images/showcase/plate-4.webp" },
  { src: "Assets/Design/5.png", out: "public/images/showcase/plate-5.webp" },
  { src: "Assets/Design/6.png", out: "public/images/showcase/plate-6.webp" },
  { src: "Assets/Design/7.png", out: "public/images/showcase/plate-7.webp" },
  { src: "Assets/Design/8.png", out: "public/images/showcase/plate-8.webp" },
  { src: "Assets/Design/9.png", out: "public/images/showcase/plate-9.webp" },
];

// Meal catalog photography imported from the live EasyChef site
// (dev.easychefapp.co.za) rather than a local Assets/ source drop. Unlike
// every other converter above, there is no local file to hash for
// idempotency, so this pipeline fetches each remote JPEG, hashes the
// downloaded bytes, and stores that hash in the same on-disk cache keyed by
// `remote:<imageUrl>` instead of a repo-relative path (see convertIfChanged's
// path-based cache for the alternative used elsewhere in this file). This
// keeps the import reproducible/offline-safe for re-runs where nothing
// changed (skips the sharp re-encode), while deliberately NOT vendoring the
// original JPEGs into Assets/ -- that would require touching a source tree
// outside this script's owned output paths for no real benefit, since the
// canonical source of truth for these images is the live EasyChef API/CDN,
// not this repo.
const CATALOG_BASE_URL = "https://dev.easychefapp.co.za";

// menuId -> live-site image path + alt text, captured from
// GET /api/meals?limit=500&page=1 on the EasyChef dev API (2026-08-04).
// `alt` falls back to a hand-written description where the API's
// `websiteAltText` was null.
const CATALOG_SOURCES = [
  { menuId: "EC-001", imageUrl: "/meal-images/Chicken Meals/chicken_stew_rice.jpg", alt: "Chicken stew and rice served as a South African home supper" },
  { menuId: "EC-002", imageUrl: "/meal-images/Beef and Meat Premium Meals/beef_stew_and_rice.jpg", alt: "Beef stew and rice served as a South African home supper" },
  { menuId: "EC-003", imageUrl: "/meal-images/Chicken Meals/chicken_curry.jpg", alt: "Chicken curry and rice served as a South African home supper" },
  { menuId: "EC-004", imageUrl: "/meal-images/Beef and Meat Premium Meals/mince_curry_rice.jpg", alt: "Mince curry and rice served as a South African home supper" },
  { menuId: "EC-005", imageUrl: "/meal-images/Beef and Meat Premium Meals/wors_pap_and_chakalaka.jpg", alt: "Wors, pap and chakalaka served as a South African home supper" },
  { menuId: "EC-006", imageUrl: "/meal-images/Chicken Meals/chicken_stew.jpg", alt: "Chicken livers and pap served as a South African home supper" },
  { menuId: "EC-008", imageUrl: "/meal-images/Chicken Meals/fried_chicken.jpg", alt: "Fried chicken, chips and salad served as a South African home supper" },
  { menuId: "EC-049", imageUrl: "/meal-images/chicken_shwarma_wrap.jpg", alt: "Chicken shawarma wraps with garlic yoghurt sauce and sumac onions" },
  { menuId: "EC-009", imageUrl: "/meal-images/Traditional Favorites/Mogodu_and_pap.jpg", alt: "Mogodu and pap served as a South African home supper" },
  { menuId: "EC-010", imageUrl: "/meal-images/Traditional Favorites/Mala_Mogodu.jpg", alt: "Mala mogodu and pap served as a South African home supper" },
  { menuId: "EC-011", imageUrl: "/meal-images/Traditional Favorites/Oxtail_and_dombolo.jpg", alt: "Oxtail and dombolo served as a South African home supper" },
  { menuId: "EC-012", imageUrl: "/meal-images/Traditional Favorites/Beef_stew_and_dombolo.jpg", alt: "Beef stew and dombolo served as a South African home supper" },
  { menuId: "EC-013", imageUrl: "/meal-images/Traditional Favorites/Chicken_stew_and_dombolo.jpg", alt: "Chicken stew and dombolo served as a South African home supper" },
  { menuId: "EC-014", imageUrl: "/meal-images/Traditional Favorites/umleqwa_and_pap.jpg", alt: "Hardbody chicken / umleqwa and pap served as a South African home supper" },
  { menuId: "EC-015", imageUrl: "/meal-images/Traditional Favorites/Amanqina_cow_heels_and_pap.jpg", alt: "Amanqina / cow heels and pap served as a South African home supper" },
  { menuId: "EC-016", imageUrl: "/meal-images/Traditional Favorites/Trotters_stew_and_pap.jpg", alt: "Trotters stew and pap served as a South African home supper" },
  { menuId: "EC-024", imageUrl: "/meal-images/Beef and Meat Premium Meals/beef_stew_and_pap.jpg", alt: "Pap, beef stew and cabbage served as a South African home supper" },
  { menuId: "EC-025", imageUrl: "/meal-images/Traditional Favorites/Mogodu_and_pap.jpg", alt: "Pap, mogodu and chakalaka served as a South African home supper" },
  { menuId: "EC-026", imageUrl: "/meal-images/Beef and Meat Premium Meals/beef_stew_and_samp.jpg", alt: "Samp and beans with beef stew served as a South African home supper" },
  { menuId: "EC-028", imageUrl: "/meal-images/Beef and Meat Premium Meals/lamb_stew.jpg", alt: "Dombolo with lamb stew served as a South African home supper" },
  { menuId: "EC-017", imageUrl: "/meal-images/Seven Colours - Sunday Lunch/Roast_chicken_seven_colours.jpg", alt: "Roast chicken seven colours served as a South African home supper" },
  { menuId: "EC-018", imageUrl: "/meal-images/Seven Colours - Sunday Lunch/Fried_chicken_seven_colours.jpg", alt: "Fried chicken seven colours served as a South African home supper" },
  { menuId: "EC-019", imageUrl: "/meal-images/Seven Colours - Sunday Lunch/Roast_chicken_seven_colours(1).jpg", alt: "Beef stew seven colours served as a South African home supper" },
  { menuId: "EC-020", imageUrl: "/meal-images/Seven Colours - Sunday Lunch/Oxtail_seven_colours.jpg", alt: "Oxtail seven colours served as a South African home supper" },
  { menuId: "EC-021", imageUrl: "/meal-images/Seven Colours - Sunday Lunch/Chicken_curry_seven_colours.jpg", alt: "Chicken curry seven colours served as a South African home supper" },
  { menuId: "EC-022", imageUrl: "/meal-images/Seven Colours - Sunday Lunch/Sunday_mixed_plate_seven_colours.jpg", alt: "Sunday mixed plate served as a South African home supper" },
  { menuId: "EC-030", imageUrl: "/meal-images/Chicken Meals/peri_peri_chicken.jpg", alt: "Peri-peri chicken and rice served as a South African home supper" },
  { menuId: "EC-031", imageUrl: "/meal-images/Chicken Meals/bbq_chicken.jpg", alt: "BBQ chicken pieces and pap served as a South African home supper" },
  { menuId: "EC-032", imageUrl: "/meal-images/Chicken Meals/chicken_wings.jpg", alt: "Chicken wings, chips and coleslaw served as a South African home supper" },
  { menuId: "EC-035", imageUrl: "/meal-images/Beef and Meat Premium Meals/lamb_curry_and_rice.jpg", alt: "Lamb curry and rice served as a South African home supper" },
  { menuId: "EC-036", imageUrl: "/meal-images/Beef and Meat Premium Meals/Lamb_chops_pap_and_chakalaka.jpg", alt: "Lamb chops, pap and chakalaka served as a South African home supper" },
  { menuId: "EC-038", imageUrl: "/meal-images/Pasta Bakes and Kid Friendly/cottage_pie.jpg", alt: "Cottage pie served as a South African home supper" },
  { menuId: "EC-039", imageUrl: "/meal-images/Pasta Bakes and Kid Friendly/beef_lasagne.jpg", alt: "Beef lasagne served as a South African home supper" },
  { menuId: "EC-040", imageUrl: "/meal-images/Pasta Bakes and Kid Friendly/Meatball_pasta.jpg", alt: "Meatballs and spaghetti served as a South African home supper" },
  { menuId: "EC-124", imageUrl: "/meal-images/shwarma_steak.jpg", alt: "Shawarma-spiced steak, sliced and served with fresh salad" },
  { menuId: "EC-029", imageUrl: "/meal-images/Chicken Meals/roasted_chicken.jpg", alt: "Roast chicken and vegetables served as a South African home supper" },
  { menuId: "EC-033", imageUrl: "/meal-images/Chicken Meals/chicken_stir_fry_rice.jpg", alt: "Chicken stir-fry with rice served as a South African home supper" },
  { menuId: "EC-034", imageUrl: "/meal-images/Chicken Meals/creamy_chicken.jpg", alt: "Chicken à la king and rice served as a South African home supper" },
  { menuId: "EC-037", imageUrl: "/meal-images/Beef and Meat Premium Meals/steak_and_chips.jpg", alt: "Steak, chips and salad served as a South African home supper" },
  { menuId: "EC-041", imageUrl: "/meal-images/Charcuterie_1.jpg", alt: "Charcuterie board with cured meats, cheeses, olives, nuts and dried fruit" },
  { menuId: "EC-048", imageUrl: "/meal-images/chicken_gyro_bowl.jpg", alt: "Chicken gyro bowl with rice, salad and tzatziki" },
  { menuId: "EC-051", imageUrl: "/meal-images/Burger_bowl.jpg", alt: "Big Mac-style burger bowl with beef, lettuce and burger sauce" },
  { menuId: "EC-052", imageUrl: "/meal-images/GREEK_CHICKEN_TZATZIKI_BOWLS.jpg", alt: "Greek chicken tzatziki bowl with rice and fresh salad" },
  { menuId: "EC-050", imageUrl: "/meal-images/overnight_oats.jpg", alt: "Trio of overnight oats jars with fruit and toppings" },
  { menuId: "EC-DESSERT-001", imageUrl: "/meal-images/malva_pudding.webp", alt: "Warm malva pudding served with custard or cream" },
];

async function fetchWithRetry(url, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
      }
    }
  }
  throw lastErr;
}

async function convertCatalogMeal({ menuId, imageUrl, alt }) {
  const out = `public/images/meals/catalog/${menuId.toLowerCase()}.webp`;
  const outPath = join(ROOT, out);
  const encodedPath = imageUrl
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const url = `${CATALOG_BASE_URL}${encodedPath}`;
  const cacheKey = `remote:${imageUrl}`;

  try {
    const buffer = await fetchWithRetry(url);
    const hash = createHash("sha256").update(buffer).digest("hex");

    if (!FORCE && cache[cacheKey] === hash && existsSync(outPath)) {
      console.log(`[skipped, unchanged] ${imageUrl}`);
      const meta = await sharp(outPath).metadata();
      return { menuId, out, alt, ok: true, width: meta.width, height: meta.height };
    }

    await ensureDir(outPath);
    await sharp(buffer)
      .resize({ width: 1000, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outPath);
    const meta = await sharp(outPath).metadata();
    cache[cacheKey] = hash;
    cacheDirty = true;
    console.log(`[ok] ${out} (${meta.width}x${meta.height})`);
    return { menuId, out, alt, ok: true, width: meta.width, height: meta.height };
  } catch (err) {
    console.error(`[failed] ${menuId} (${imageUrl}): ${err.message}`);
    return { menuId, out, alt, ok: false, error: err.message };
  }
}

async function convertCatalogMeals() {
  const results = [];
  for (const source of CATALOG_SOURCES) {
    results.push(await convertCatalogMeal(source));
  }

  const manifestPath = join(ROOT, "public/images/meals/catalog/manifest.json");
  let existingManifest = {};
  if (existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      console.warn(`[warn] could not parse ${manifestPath}, starting merge from an empty manifest`);
      existingManifest = {};
    }
  }

  // Merge this run's fresh results on top of the existing manifest rather than
  // replacing it wholesale: any menuId that failed to (re-)fetch/convert this
  // run keeps whatever entry it had on disk from a prior successful run,
  // instead of being silently dropped.
  const manifest = { ...existingManifest };
  const failures = [];
  for (const result of results) {
    if (result.ok) {
      manifest[result.menuId] = {
        src: `/images/meals/catalog/${result.menuId.toLowerCase()}.webp`,
        width: result.width,
        height: result.height,
        alt: result.alt,
      };
    } else {
      failures.push({ menuId: result.menuId, error: result.error });
    }
  }

  await ensureDir(manifestPath);
  const sortedManifest = Object.fromEntries(
    Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(manifestPath, `${JSON.stringify(sortedManifest, null, 2)}\n`, "utf8");
  console.log(`[ok] public/images/meals/catalog/manifest.json (${Object.keys(manifest).length} entries)`);

  if (failures.length > 0) {
    console.warn(`[warn] ${failures.length} catalog meal image(s) failed to import:`);
    for (const failure of failures) {
      console.warn(`  - ${failure.menuId}: ${failure.error}`);
    }
  }

  return { succeeded: results.filter((r) => r.ok).length, failed: failures, manifestEntries: Object.keys(manifest).length };
}

async function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

/**
 * Shared skip-if-unchanged gate. Every converter funnels its actual sharp
 * pipeline through `run()`; this wrapper only decides whether `run()` needs
 * to execute at all, and updates the on-disk cache when it does.
 *
 * `src` is a single repo-relative source path. `outs` is one or more
 * repo-relative output paths that `run()` is expected to produce from that
 * source (most converters produce exactly one; convertBrandLogo produces
 * several from a single source). The source is skipped only if its hash
 * matches the cached hash AND every one of `outs` still exists on disk.
 * `cacheVersion` invalidates outputs when converter logic changes.
 */
async function convertIfChanged(src, outs, run, cacheVersion = "") {
  const srcPath = join(ROOT, src);
  if (!existsSync(srcPath)) {
    console.warn(`[skip] missing source: ${src}`);
    return;
  }

  const outList = Array.isArray(outs) ? outs : [outs];
  const sourceHash = hashFile(srcPath);
  const hash = cacheVersion ? `${sourceHash}:${cacheVersion}` : sourceHash;
  const allOutputsExist = outList.every((out) => existsSync(join(ROOT, out)));

  if (!FORCE && cache[src] === hash && allOutputsExist) {
    console.log(`[skipped, unchanged] ${src}`);
    return;
  }

  await run();
  cache[src] = hash;
  cacheDirty = true;
}

async function convertFrame({ src, out }) {
  await convertIfChanged(src, out, async () => {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);
    await ensureDir(outPath);
    const image = sharp(srcPath, { ensureAlpha: true }).resize({
      width: 1200,
      withoutEnlargement: true,
    });
    await image.webp({ quality: 82, alphaQuality: 100 }).toFile(outPath);
    const meta = await sharp(outPath).metadata();
    console.log(`[ok] ${out} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
  });
}

async function convertShowcaseHands({ src, out }) {
  await convertIfChanged(src, out, async () => {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);
    await ensureDir(outPath);
    const image = sharp(srcPath, { ensureAlpha: true }).resize({
      width: 1280,
      withoutEnlargement: true,
    });
    await image.webp({ quality: 82, alphaQuality: 100 }).toFile(outPath);
    const meta = await sharp(outPath).metadata();
    console.log(`[ok] ${out} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
  });
}

async function convertHeroStory({ src, out }) {
  await convertIfChanged(src, out, async () => {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);
    await ensureDir(outPath);
    await sharp(srcPath)
      .resize({ width: 1448, withoutEnlargement: true })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png({ compressionLevel: 9, quality: 80, palette: true })
      .toFile(outPath);
    const meta = await sharp(outPath).metadata();
    console.log(`[ok] ${out} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
  });
}

async function convertMeal({ src, out }) {
  await convertIfChanged(src, out, async () => {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);
    await ensureDir(outPath);
    await sharp(srcPath)
      .resize({ width: 1000, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outPath);
    console.log(`[ok] ${out}`);
  });
}

/**
 * Menu-showcase plate assets, trimmed to their opaque bounding box (no
 * transparent padding). The menu-showcase feature positions plates with
 * fixed percentage-based sizing (PLATE_HEIGHT_PCT/PLATE_BOTTOM_PCT in
 * src/features/menu-showcase/constants/showcaseTransitions.ts) that assumes
 * the source image IS the visible plate circle — the untrimmed hero-loop
 * assets (public/images/loop/meal-N.webp) have ~20-40% internal transparent
 * padding that silently shrinks/mispositions the plate under that math.
 */
async function convertShowcasePlate({ src, out }) {
  await convertIfChanged(src, out, async () => {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);
    await ensureDir(outPath);
    await sharp(srcPath, { ensureAlpha: true })
      .trim({ threshold: 10 })
      .resize({ width: 1000, withoutEnlargement: true })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(outPath);
    const meta = await sharp(outPath).metadata();
    console.log(`[ok] ${out} (${meta.width}x${meta.height})`);
  });
}

async function convertIllustration({ src, out }) {
  await convertIfChanged(src, out, async () => {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);
    await ensureDir(outPath);
    await sharp(srcPath)
      .resize({ width: 900, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(outPath);
    console.log(`[ok] ${out}`);
  });
}

async function convertIntro({ src, out }) {
  await convertIfChanged(src, out, async () => {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);
    await ensureDir(outPath);
    // Some source frames (Cooking, Garnishing) have the photo centered on a
    // white canvas with padding on the sides rather than filling it edge to
    // edge like Prepping/Relaxing. Trimming that uniform border first keeps
    // every frame filling the banner edge-to-edge under object-fit: cover,
    // instead of showing a pillarboxed gray gap where the scrim meets the
    // untrimmed white padding.
    await sharp(srcPath)
      .trim({ threshold: 10 })
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);
    const meta = await sharp(outPath).metadata();
    console.log(`[ok] ${out} (${meta.width}x${meta.height})`);
  });
}

/**
 * The lose-weight goal tile source (Assets/goal-icons/png/new_lose_weight.jpg)
 * is a flattened JPG with a solid black background rather than a true
 * transparent PNG like the other goal tile sources, so it needs a manual
 * chroma-key pass (near-black -> transparent) before trim/resize/encode.
 */
async function convertGoalTileChromaKey({ src, out }) {
  await convertIfChanged(src, out, async () => {
    const srcPath = join(ROOT, src);
    const outPath = join(ROOT, out);
    await ensureDir(outPath);
    const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const r = data[i * channels];
      const g = data[i * channels + 1];
      const b = data[i * channels + 2];
      rgba[i * 4] = r;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = b;
      rgba[i * 4 + 3] = Math.max(r, g, b) < 25 ? 0 : 255;
    }
    await sharp(rgba, { raw: { width, height, channels: 4 } })
      .trim({ threshold: 10 })
      .resize({ width: 900, withoutEnlargement: true })
      .webp({ quality: 85, alphaQuality: 100 })
      .toFile(outPath);
    const meta = await sharp(outPath).metadata();
    console.log(`[ok] ${out} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
  });
}

async function convertBrandLogo() {
  const src = "Assets/Logo/chef_logo_1.png";
  const cacheVersion = "brand-logo-horizontal-wordmark-v2";
  const outs = [
    "public/images/brand/logo.webp",
    "public/images/brand/logo-icon.webp",
    "public/images/brand/logo-wordmark.webp",
    "src/app/icon.png",
  ];

  await convertIfChanged(
    src,
    outs,
    async () => {
      const srcPath = join(ROOT, src);

      // Source is a true transparent PNG on an oversized square canvas, so trim
      // just tightens the bounding box to the actual lockup content (no
      // white-background removal needed, unlike earlier logo sources). Doing
      // this once into a buffer (rather than re-reading the file per output)
      // means the icon crop below can be computed proportionally from the
      // trimmed lockup's own dimensions instead of hardcoded pixel coordinates.
      const { data: trimmed, info: trimmedInfo } = await sharp(srcPath)
        .trim({ threshold: 10 })
        .toBuffer({ resolveWithObject: true });

      // Full lockup (icon + baked-in "chef" / "mate" stacked wordmark) — this is
      // what actually renders in the header now, since the wordmark's baked-in
      // typography doesn't match rendering it as separate live text.
      const fullOut = join(ROOT, "public/images/brand/logo.webp");
      await ensureDir(fullOut);
      await sharp(trimmed)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile(fullOut);
      console.log("[ok] public/images/brand/logo.webp");

      // Icon-only crop (the pot + spoon mark), for contexts needing just the
      // icon. Occupies the left ~36.8% of the trimmed lockup's width, full
      // height. sharp's extract() can't be chained directly into trim() in the
      // same pipeline (throws "bad extract area"), so the extracted region is
      // materialized to its own buffer first, then re-trimmed from a fresh
      // sharp() call to drop any residual margin next to the wordmark.
      const iconWidth = Math.round(trimmedInfo.width * 0.368);
      const iconExtracted = await sharp(trimmed)
        .extract({ left: 0, top: 0, width: iconWidth, height: trimmedInfo.height })
        .toBuffer();
      const iconTrimmed = await sharp(iconExtracted).trim({ threshold: 10 }).toBuffer();

      const iconOut = join(ROOT, "public/images/brand/logo-icon.webp");
      await sharp(iconTrimmed)
        .resize({ width: 240, withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile(iconOut);
      console.log("[ok] public/images/brand/logo-icon.webp");

      // Horizontal wordmark crop, preserving the exact baked-in "chef" and
      // "mate" letterforms while placing them on one baseline for inline text.
      const wordmarkExtracted = await sharp(trimmed)
        .extract({
          left: iconWidth,
          top: 0,
          width: trimmedInfo.width - iconWidth,
          height: trimmedInfo.height,
        })
        .toBuffer();
      const wordmarkTrimmed = await sharp(wordmarkExtracted)
        .trim({ threshold: 10 })
        .png()
        .toBuffer();
      const { data: wordmarkRaw, info: wordmarkInfo } = await sharp(wordmarkTrimmed)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const rowClusters = [];
      let clusterStart = null;
      let previousInkRow = null;
      for (let y = 0; y < wordmarkInfo.height; y += 1) {
        let rowHasInk = false;
        for (let x = 0; x < wordmarkInfo.width; x += 1) {
          if (wordmarkRaw[(y * wordmarkInfo.width + x) * 4 + 3] > 10) {
            rowHasInk = true;
            break;
          }
        }

        if (!rowHasInk) continue;
        if (clusterStart === null) {
          clusterStart = y;
        } else if (previousInkRow !== null && y > previousInkRow + 1) {
          rowClusters.push([clusterStart, previousInkRow]);
          clusterStart = y;
        }
        previousInkRow = y;
      }
      if (clusterStart !== null && previousInkRow !== null) {
        rowClusters.push([clusterStart, previousInkRow]);
      }
      if (rowClusters.length < 2) {
        throw new Error("Expected the Chefmate wordmark to contain stacked chef and mate rows");
      }

      const wordPieces = [];
      for (const [top, bottom] of rowClusters.slice(0, 2)) {
        const extractedPiece = await sharp(wordmarkTrimmed)
          .extract({ left: 0, top, width: wordmarkInfo.width, height: bottom - top + 1 })
          .png()
          .toBuffer();
        const { data: pieceData, info: pieceInfo } = await sharp(extractedPiece)
          .trim({ threshold: 10 })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        wordPieces.push({ data: pieceData, width: pieceInfo.width, height: pieceInfo.height });
      }

      const [chefWord, mateWord] = wordPieces;
      const wordGap = Math.round(Math.max(chefWord.height, mateWord.height) * 0.04);
      const inlineWordmarkWidth = chefWord.width + wordGap + mateWord.width;
      const inlineWordmarkHeight = Math.max(chefWord.height, mateWord.height);
      const inlineWordmark = Buffer.alloc(inlineWordmarkWidth * inlineWordmarkHeight * 4);
      const copyWord = (word, left, top) => {
        for (let y = 0; y < word.height; y += 1) {
          word.data.copy(
            inlineWordmark,
            ((top + y) * inlineWordmarkWidth + left) * 4,
            y * word.width * 4,
            (y + 1) * word.width * 4,
          );
        }
      };

      copyWord(chefWord, 0, inlineWordmarkHeight - chefWord.height);
      copyWord(mateWord, chefWord.width + wordGap, inlineWordmarkHeight - mateWord.height);

      const wordmarkOut = join(ROOT, "public/images/brand/logo-wordmark.webp");
      await sharp(inlineWordmark, {
        raw: { width: inlineWordmarkWidth, height: inlineWordmarkHeight, channels: 4 },
      })
        .trim({ threshold: 10 })
        .resize({ width: 720, withoutEnlargement: true })
        .webp({ quality: 90, alphaQuality: 100 })
        .toFile(wordmarkOut);
      console.log("[ok] public/images/brand/logo-wordmark.webp");

      // App Router favicon/tab icon (src/app/icon.png is auto-served by Next.js).
      // Composited onto a white square canvas since the icon crop has no alpha.
      const faviconOut = join(ROOT, "src/app/icon.png");
      await sharp(iconTrimmed)
        .resize({
          width: 512,
          height: 512,
          fit: "contain",
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png()
        .toFile(faviconOut);
      console.log("[ok] src/app/icon.png");
    },
    cacheVersion,
  );
}

async function main() {
  if (FORCE) {
    console.log("--force passed: bypassing the cache and re-converting every asset.");
  }

  console.log("Converting model frames...");
  for (const frame of FRAME_SOURCES) {
    await convertFrame(frame);
  }
  console.log("Converting meal photography...");
  for (const meal of MEAL_SOURCES) {
    await convertMeal(meal);
  }
  console.log("Converting brand logo...");
  await convertBrandLogo();
  console.log("Converting how-it-works illustrations...");
  for (const illustration of HOW_IT_WORKS_SOURCES) {
    await convertIllustration(illustration);
  }
  console.log("Converting goal tile illustrations...");
  for (const tile of GOAL_TILE_SOURCES) {
    await convertIllustration(tile);
  }
  console.log("Converting lose-weight goal tile (chroma-key)...");
  await convertGoalTileChromaKey({
    src: "Assets/goal-icons/png/new_lose_weight.jpg",
    out: "public/images/goals/lose-weight.webp",
  });
  console.log("Converting intro banner images...");
  for (const intro of INTRO_SOURCES) {
    await convertIntro(intro);
  }
  console.log("Converting landing hero story images...");
  for (const heroStory of HERO_STORY_SOURCES) {
    await convertHeroStory(heroStory);
  }
  console.log("Converting hero loop meals...");
  for (const loop of LOOP_SOURCES) {
    await convertMeal(loop);
  }
  console.log("Converting menu showcase hands...");
  for (const showcase of SHOWCASE_SOURCES) {
    await convertShowcaseHands(showcase);
  }
  console.log("Converting menu showcase plates (trimmed)...");
  for (const plate of SHOWCASE_PLATE_SOURCES) {
    await convertShowcasePlate(plate);
  }
  console.log("Converting meal catalog photography (remote import)...");
  const catalogResult = await convertCatalogMeals();
  console.log(
    `Catalog import: ${catalogResult.succeeded}/${CATALOG_SOURCES.length} succeeded, ${catalogResult.failed.length} failed, manifest has ${catalogResult.manifestEntries} entries.`,
  );
  if (catalogResult.failed.length > 0) {
    console.warn(
      `[warn] ${catalogResult.failed.length} catalog meal image(s) failed this run; manifest.json was merged with prior entries for those menuIds, but the underlying fetch/convert failure should be investigated.`,
    );
    process.exitCode = 1;
  }
  console.log("Done.");
  saveCache();
}

main().catch((err) => {
  console.error(err);
  saveCache();
  process.exit(1);
});
