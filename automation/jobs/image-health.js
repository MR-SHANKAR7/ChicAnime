import { readAll, update, remove } from "../lib/db.js";
import { isUsableImage } from "../lib/images.js";
import { gql } from "../lib/anilist.js";
import { fetchJikanCharacterImage } from "../lib/jikan.js";

// Repair only automatically imported character records with missing or broken images.
// Dry-run by default. CLEAN_BAD_IMAGES=1 allows updating repaired URLs and deleting records
// only when neither source can provide a valid image.
const ANILIST_CHARACTER_IMAGE_QUERY = `query ($id: Int) { Character(id: $id) { image { large } } }`;

export async function runImageHealth({
  readAllFn = readAll,
  updateFn = update,
  removeFn = remove,
  validateImageFn = isUsableImage,
  fetchAniListImageFn = async (id) => (await gql(ANILIST_CHARACTER_IMAGE_QUERY, { id })).Character?.image?.large || "",
  fetchJikanImageFn = fetchJikanCharacterImage,
  clean = process.env.CLEAN_BAD_IMAGES === "1",
} = {}) {
  const images = await readAllFn("gallery", "images");
  const candidates = images.filter((item) =>
    item.type === "character" &&
    (item.uploadedBy === "auto" || /^(anilist-char|jikan-char):/.test(item.sourceId || ""))
  );
  const repaired = [];
  const invalid = [];
  const deleted = [];

  for (const item of candidates) {
    if (item.image && await validateImageFn(item.image)) continue;

    let replacement = "";
    const sourceId = String(item.sourceId || "");
    try {
      if (sourceId.startsWith("anilist-char:")) {
        const id = Number(sourceId.slice("anilist-char:".length));
        if (Number.isInteger(id) && id > 0) replacement = await fetchAniListImageFn(id);
      } else if (sourceId.startsWith("jikan-char:")) {
        const id = Number(sourceId.split(":").at(-1));
        if (Number.isInteger(id) && id > 0) replacement = await fetchJikanImageFn(id);
      }
    } catch (error) {
      console.warn(`[image-health] تعذر جلب صورة بديلة لـ ${item.title || item.id}: ${error.message}`);
    }

    if (replacement && await validateImageFn(replacement)) {
      repaired.push(item);
      console.log(`[image-health] صورة بديلة صالحة: ${item.title || item.id}`);
      if (clean && item.id) await updateFn("gallery", `images/${item.id}`, { image: replacement });
      continue;
    }

    invalid.push(item);
    console.warn(`[image-health] لا توجد صورة صالحة للشخصية: ${item.title || item.id} (id=${item.id})`);
    if (clean && item.id) {
      await removeFn("gallery", `images/${item.id}`);
      deleted.push(item);
    }
  }

  const result = {
    scanned: candidates.length,
    needsRepair: repaired.length + invalid.length,
    repaired: repaired.length,
    unrecoverable: invalid.length,
    deleted: deleted.length,
    dryRun: !clean,
  };
  console.log(`[image-health] ${JSON.stringify(result)}`);
  return result;
}
