// Converts source PNG/JPG assets into optimized WebP files consumed by the app.
// Run with: pnpm convert-assets
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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

async function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function convertFrame({ src, out }) {
  const srcPath = join(ROOT, src);
  const outPath = join(ROOT, out);
  if (!existsSync(srcPath)) {
    console.warn(`[skip] missing source: ${src}`);
    return;
  }
  await ensureDir(outPath);
  const image = sharp(srcPath, { ensureAlpha: true }).resize({
    width: 1200,
    withoutEnlargement: true,
  });
  await image.webp({ quality: 82, alphaQuality: 100 }).toFile(outPath);
  const meta = await sharp(outPath).metadata();
  console.log(`[ok] ${out} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
}

async function convertShowcaseHands({ src, out }) {
  const srcPath = join(ROOT, src);
  const outPath = join(ROOT, out);
  if (!existsSync(srcPath)) {
    console.warn(`[skip] missing source: ${src}`);
    return;
  }
  await ensureDir(outPath);
  const image = sharp(srcPath, { ensureAlpha: true }).resize({
    width: 1280,
    withoutEnlargement: true,
  });
  await image.webp({ quality: 82, alphaQuality: 100 }).toFile(outPath);
  const meta = await sharp(outPath).metadata();
  console.log(`[ok] ${out} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
}

async function convertHeroStory({ src, out }) {
  const srcPath = join(ROOT, src);
  const outPath = join(ROOT, out);
  if (!existsSync(srcPath)) {
    console.warn(`[skip] missing source: ${src}`);
    return;
  }
  await ensureDir(outPath);
  await sharp(srcPath)
    .resize({ width: 1448, withoutEnlargement: true })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ compressionLevel: 9, quality: 80, palette: true })
    .toFile(outPath);
  const meta = await sharp(outPath).metadata();
  console.log(`[ok] ${out} (${meta.width}x${meta.height}, alpha=${meta.hasAlpha})`);
}

async function convertMeal({ src, out }) {
  const srcPath = join(ROOT, src);
  const outPath = join(ROOT, out);
  if (!existsSync(srcPath)) {
    console.warn(`[skip] missing source: ${src}`);
    return;
  }
  await ensureDir(outPath);
  await sharp(srcPath)
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(outPath);
  console.log(`[ok] ${out}`);
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
  const srcPath = join(ROOT, src);
  const outPath = join(ROOT, out);
  if (!existsSync(srcPath)) {
    console.warn(`[skip] missing source: ${src}`);
    return;
  }
  await ensureDir(outPath);
  await sharp(srcPath, { ensureAlpha: true })
    .trim({ threshold: 10 })
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(outPath);
  const meta = await sharp(outPath).metadata();
  console.log(`[ok] ${out} (${meta.width}x${meta.height})`);
}

async function convertIllustration({ src, out }) {
  const srcPath = join(ROOT, src);
  const outPath = join(ROOT, out);
  if (!existsSync(srcPath)) {
    console.warn(`[skip] missing source: ${src}`);
    return;
  }
  await ensureDir(outPath);
  await sharp(srcPath)
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(outPath);
  console.log(`[ok] ${out}`);
}

async function convertIntro({ src, out }) {
  const srcPath = join(ROOT, src);
  const outPath = join(ROOT, out);
  if (!existsSync(srcPath)) {
    console.warn(`[skip] missing source: ${src}`);
    return;
  }
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
}

/**
 * The lose-weight goal tile source (Assets/goal-icons/png/new_lose_weight.jpg)
 * is a flattened JPG with a solid black background rather than a true
 * transparent PNG like the other goal tile sources, so it needs a manual
 * chroma-key pass (near-black -> transparent) before trim/resize/encode.
 */
async function convertGoalTileChromaKey({ src, out }) {
  const srcPath = join(ROOT, src);
  const outPath = join(ROOT, out);
  if (!existsSync(srcPath)) {
    console.warn(`[skip] missing source: ${src}`);
    return;
  }
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
}

async function convertBrandLogo() {
  const srcPath = join(ROOT, "Assets/Logo/chef_logo_1.png");
  if (!existsSync(srcPath)) {
    console.warn("[skip] missing brand logo source");
    return;
  }
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
}

async function main() {
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
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
