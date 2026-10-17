import { runNews } from "./jobs/news.js";
import { runCharacters } from "./jobs/characters.js";
import { runEpisodes } from "./jobs/episodes.js";
import { close } from "./lib/db.js";

const jobs = { news: runNews, characters: runCharacters, episodes: runEpisodes };
const selected = (process.env.JOBS || "news,characters,episodes").split(",").map((s) => s.trim());

let failed = false;
for (const name of selected) {
  console.log(`\n===== ${name} =====`);
  try {
    await jobs[name]();
  } catch (err) {
    failed = true;
    console.error(`فشلت مهمة ${name}:`, err);
  }
}
close();
process.exit(failed ? 1 : 0);
