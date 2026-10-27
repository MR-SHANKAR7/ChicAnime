import { readAll, remove } from "../lib/db.js";
import { isUsableImage } from "../lib/images.js";

// One-time maintenance task. It only targets automatically imported character records.
// Set CLEAN_BAD_IMAGES=1 to actually delete invalid records; otherwise it reports a dry run.
export async function runImageHealth({
  readAllFn = readAll,
  removeFn = remove,
  validateImageFn = isUsableImage,
  clean = process.env.CLEAN_BAD_IMAGES === "1",
} = {}) {
  const images = await readAllFn("gallery", "images");
  const candidates = images.filter((item) =>
    item.type === "character" &&
    (item.uploadedBy === "auto" || /^(anilist-char|jikan-char):/.test(item.sourceId || ""))
  );
  const invalid = [];

  for (const item of candidates) {
    if (!item.image || !(await validateImageFn(item.image))) {
      invalid.push(item);
      console.warn(`[image-health] صورة شخصية غير صالحة: ${item.title || item.id} (id=${item.id})`);
      if (clean && item.id) await removeFn("gallery", `images/${item.id}`);
    }
  }

  const result = { scanned: candidates.length, invalid: invalid.length, deleted: clean ? invalid.filter((item) => item.id).length : 0, dryRun: !clean };
  console.log(`[image-health] ${JSON.stringify(result)}`);
  return result;
}
