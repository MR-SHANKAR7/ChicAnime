import { readAll, push } from "../lib/db.js";
import { gql, sleep } from "../lib/anilist.js";
import { toArabic, stripHtml } from "../lib/translate.js";

const MAX_PER_RUN = Number(process.env.CHARACTERS_PER_RUN || 6);

const QUERY = `
query ($page: Int) {
  Page(page: $page, perPage: 25) {
    characters(sort: FAVOURITES_DESC) {
      id
      name { full native }
      image { large }
      description(asHtml: false)
      dateOfBirth { month day }
      media(type: ANIME, sort: POPULARITY_DESC, perPage: 1) {
        nodes { title { romaji english } startDate { year } }
      }
    }
  }
}`;

const MONTHS_AR = ["", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export async function runCharacters() {
  const existing = new Set((await readAll("images")).map((i) => i.sourceId).filter(Boolean));
  const picked = [];

  // نتصفح الشخصيات الأكثر شعبية حتى نجد العدد المطلوب من الشخصيات غير المنشورة
  for (let page = 1; page <= 20 && picked.length < MAX_PER_RUN; page++) {
    const { Page } = await gql(QUERY, { page });
    for (const c of Page.characters) {
      if (picked.length >= MAX_PER_RUN) break;
      if (existing.has(`anilist-char:${c.id}`) || !c.image?.large || !c.description) continue;
      picked.push(c);
    }
    await sleep(700);
  }
  console.log(`الشخصيات: ${picked.length} شخصية جديدة`);

  for (const c of picked) {
    const anime = c.media?.nodes?.[0];
    const animeTitle = anime?.title?.english || anime?.title?.romaji || "غير معروف";
    const [nameAr, details] = await Promise.all([
      toArabic(c.name.full),
      toArabic(stripHtml(c.description).slice(0, 1500)),
    ]);
    const birthdate = c.dateOfBirth?.month ? `${c.dateOfBirth.day || ""} ${MONTHS_AR[c.dateOfBirth.month]}`.trim() : "غير معروف";

    await push("images", {
      title: `${nameAr} - ${c.name.full}`,
      anime: animeTitle,
      type: "character",
      birthdate,
      seasons: animeTitle,
      start_date: anime?.startDate?.year ? String(anime.startDate.year) : "",
      details,
      image: c.image.large,
      uploadedAt: new Date().toISOString(),
      uploadedBy: "auto",
      sourceId: `anilist-char:${c.id}`,
    });
    console.log("أُضيفت:", c.name.full);
  }
}
