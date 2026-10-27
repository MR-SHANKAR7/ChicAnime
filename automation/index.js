import { runNews } from "./jobs/news.js";
import { runCharacters } from "./jobs/characters.js";
import { runAnimeCharacters } from "./jobs/anime-characters.js";
import { runWallpapers } from "./jobs/wallpapers.js";
import { runCatalog } from "./jobs/catalog.js";
import { runDigest } from "./jobs/digest.js";
import { runImageHealth } from "./jobs/image-health.js";
import { close } from "./lib/db.js";

const jobs = {
  news: runNews,
  catalog: runCatalog,
  "anime-characters": runAnimeCharacters,
  characters: runCharacters,
  wallpapers: runWallpapers,
  digest: runDigest,
  "image-health": runImageHealth,
};
export const DEFAULT_JOBS = "news,catalog,anime-characters,characters,wallpapers,digest";
const selected = (process.env.JOBS || DEFAULT_JOBS).split(",").map((s) => s.trim()).filter(Boolean);

const failures = [];
for (const name of selected) {
  console.log(`\n===== ${name} =====`);
  try {
    if (!jobs[name]) throw new Error("مهمة غير معروفة");
    await jobs[name]();
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
    console.error(`فشلت مهمة ${name}:`, err);
  }
}
await close();
if (failures.length) {
  console.error("\nمهام فاشلة:\n" + failures.join("\n"));
  process.exit(1);
}
