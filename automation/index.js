import { runNews } from "./jobs/news.js";
import { runCharacters } from "./jobs/characters.js";
import { runWallpapers } from "./jobs/wallpapers.js";
import { runEpisodes } from "./jobs/episodes.js";
import { runCleanup } from "./jobs/cleanup.js";
import { close } from "./lib/db.js";

const jobs = { news: runNews, characters: runCharacters, wallpapers: runWallpapers, episodes: runEpisodes, cleanup: runCleanup };
const selected = (process.env.JOBS || "news,characters,wallpapers,episodes").split(",").map((s) => s.trim()).filter(Boolean);

let failed = false;
for (const name of selected) {
  console.log(`\n===== ${name} =====`);
  try {
    if (!jobs[name]) throw new Error("مهمة غير معروفة");
    await jobs[name]();
  } catch (err) {
    failed = true;
    console.error(`فشلت مهمة ${name}:`, err);
  }
}
await close();
process.exit(failed ? 1 : 0);
