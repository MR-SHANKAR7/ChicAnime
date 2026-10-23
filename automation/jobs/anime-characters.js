import { readAll, push, update } from "../lib/db.js";
import { gql, sleep } from "../lib/anilist.js";
import { toArabic, toArabicMany, stripHtml } from "../lib/translate.js";

// شخصيات كل أنمي في الموقع (الرئيسية أولًا)، تُضاف إلى معرض الشخصيات مرة واحدة لكل أنمي
const ANIME_PER_RUN = Number(process.env.ANIME_CHARACTERS_PER_RUN || 5);
const CHARACTERS_PER_ANIME = 8;

const QUERY = `
query ($id: Int, $perPage: Int) {
  Media(id: $id) {
    title { romaji english }
    startDate { year }
    characters(sort: [ROLE, FAVOURITES_DESC], perPage: $perPage) {
      edges { role node { id name { full } image { large } description(asHtml: false) dateOfBirth { month day } } }
    }
  }
}`;

const MONTHS_AR = ["", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const ROLE_AR = { MAIN: "رئيسية", SUPPORTING: "مساندة", BACKGROUND: "ثانوية" };

export async function runAnimeCharacters() {
  const pending = (await readAll("videos", "anime"))
    .filter((a) => a.sourceId?.startsWith("anilist-anime:") && !a.charactersSynced)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, ANIME_PER_RUN);
  const existing = new Set((await readAll("gallery", "images")).map((i) => i.sourceId).filter(Boolean));
  console.log(`شخصيات الأنميات: ${pending.length} أنمي بانتظار المزامنة`);

  for (const anime of pending) {
    const id = Number(anime.sourceId.split(":")[1]);
    const { Media } = await gql(QUERY, { id, perPage: CHARACTERS_PER_ANIME });
    const edges = Media.characters.edges.filter((e) => e.node.image?.large && !existing.has(`anilist-char:${e.node.id}`));
    const animeTitle = anime.title;

    const names = await toArabicMany(edges.map((e) => e.node.name.full));
    const details = await toArabicMany(edges.map((e) => stripHtml(e.node.description || "").slice(0, 1200)));

    for (const [i, e] of edges.entries()) {
      const c = e.node;
      await push("gallery", "images", {
        title: `${names[i]} - ${c.name.full}`,
        anime: animeTitle,
        animeId: anime.id,
        role: ROLE_AR[e.role] || "",
        type: "character",
        birthdate: c.dateOfBirth?.month ? `${c.dateOfBirth.day || ""} ${MONTHS_AR[c.dateOfBirth.month]}`.trim() : "غير معروف",
        seasons: animeTitle,
        start_date: Media.startDate?.year ? String(Media.startDate.year) : "",
        details: details[i] || "",
        image: c.image.large,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "auto",
        sourceId: `anilist-char:${c.id}`,
      });
      existing.add(`anilist-char:${c.id}`);
    }
    await update("videos", `anime/${anime.id}`, { charactersSynced: true });
    console.log(`أُضيفت ${edges.length} شخصية لـ ${animeTitle}`);
    await sleep(700);
  }
}
