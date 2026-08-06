#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { glob } from "node:fs/promises";
import { basename, dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMAGES_DIR = join(ROOT, "public", "images");
const MANIFEST_PATH = join(ROOT, "image-manifest.json");
const CACHE_PATH = join(__dirname, ".variants-cache.json");
const FORCE = process.argv.includes("--force");

const VARIANT_WIDTHS = Object.freeze([256, 384, 640, 1080]);
const HASH_LENGTH = 8;

let variantCount = 0;

function hashFile(absPath) {
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

function loadCache() {
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2) + "\n");
}

async function main() {
  const cache = loadCache();
  let cacheDirty = false;
  const manifest = {};

  const files = [];
  for await (const entry of glob("**/*.{webp,jpg,jpeg,png}", { cwd: IMAGES_DIR })) {
    if (/\.\d+w\.webp$/.test(entry)) continue;
    files.push(entry);
  }

  console.log(`Found ${files.length} source images in ${relative(ROOT, IMAGES_DIR)}`);

  for (const rel of files) {
    const absPath = join(IMAGES_DIR, rel);
    const srcHash = hashFile(absPath);
    const shortHash = srcHash.slice(0, HASH_LENGTH);
    const meta = await sharp(absPath).metadata();
    const sourceWidth = meta.width != null ? meta.width : Infinity;

    const publicPath = "/images/" + rel.replace(/\\/g, "/");
    const dir = dirname(join(IMAGES_DIR, rel));
    const availableWidths = {};

    for (const w of VARIANT_WIDTHS) {
      if (w >= sourceWidth) continue;

      const variantName = basename(rel, extname(rel)) + "." + shortHash + "." + w + "w.webp";
      const variantPath = join(dir, variantName);
      const cacheKey = rel + "@" + w + "w";

      if (!FORCE && cache[cacheKey] === srcHash && existsSync(variantPath)) {
        availableWidths[w] = true;
        continue;
      }

      try {
        mkdirSync(dir, { recursive: true });
        await sharp(absPath)
          .resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(variantPath);

        cache[cacheKey] = srcHash;
        cacheDirty = true;
        availableWidths[w] = true;
        variantCount++;
      } catch (err) {
        console.warn(`[skip] failed to generate ${w}w variant for ${publicPath}: ${err.message}`);
      }
    }

    manifest[publicPath] = {
      hash: shortHash,
      widths: availableWidths,
    };
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    `Wrote manifest (${Object.keys(manifest).length} entries) to ${relative(ROOT, MANIFEST_PATH)}`,
  );

  if (cacheDirty) {
    saveCache(cache);
    console.log(`${variantCount} new variant(s) generated`);
  } else {
    console.log("All variants up to date (pass --force to regenerate)");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
