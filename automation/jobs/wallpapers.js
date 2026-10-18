import { readAll, push } from "../lib/db.js";
import { gql, sleep } from "../lib/anilist.js";
import { toArabic } from "../lib/translate.js";

const MAX_PER_RUN = Number(process.env.WALLPAPERS_PER_RUN || 6);

// صور البانر والأغلفة الرسمية للأنميات الأكثر شعبية
const QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 25) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      id
      title { romaji english }
      bannerImage
      coverImage { extraLarge }
      seasonYear
    }
  }
}`;

export async function runWallpapers() {
  const existing = new Set((await readAll("gallery", "images")).map((i) => i.sourceId).filter(Boolean));
  const picked = [];

  for (let page = 1; page <= 10 && picked.length < MAX_PER_RUN; page++) {
    const { Page } = await gql(QUERY, { page });
    for (const m of Page.media) {
      if (picked.length >= MAX_PER_RUN) break;
      const title = m.title.english || m.title.romaji;
      if (m.bannerImage && !existing.has(`anilist-banner:${m.id}`)) {
        picked.push({ sourceId: `anilist-banner:${m.id}`, image: m.bannerImage, title, year: m.seasonYear, kind: "بانر" });
      }
      if (picked.length < MAX_PER_RUN && m.coverImage?.extraLarge && !existing.has(`anilist-cover:${m.id}`)) {
        picked.push({ sourceId: `anilist-cover:${m.id}`, image: m.coverImage.extraLarge, title, year: m.seasonYear, kind: "غلاف" });
      }
    }
    await sleep(700);
  }
  console.log(`الخلفيات: ${picked.length} خلفية جديدة`);

  for (const w of picked) {
    const titleAr = await toArabic(w.title);
    await push("gallery", "images", {
      title: `خلفية ${w.kind} - ${titleAr}`,
      anime: w.title,
      type: "wallpaper",
      details: `${w.kind} رسمي لأنمي ${w.title}${w.year ? ` (${w.year})` : ""}.`,
      image: w.image,
      uploadedAt: new Date().toISOString(),
      uploadedBy: "auto",
      sourceId: w.sourceId,
    });
    console.log("أُضيفت:", w.title, w.kind);
  }
}
