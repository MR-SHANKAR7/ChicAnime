import { readAll, push, update } from "../lib/db.js";
import { gql, sleep } from "../lib/anilist.js";
import { fetchJikanAnimeCharacters } from "../lib/jikan.js";
import { isUsableImage } from "../lib/images.js";
import { toArabicMany, stripHtml } from "../lib/translate.js";

// شخصيات كل أنمي في الموقع (الرئيسية أولًا)، تُضاف إلى معرض الشخصيات مرة واحدة لكل أنمي
const ANIME_PER_RUN = Number(process.env.ANIME_CHARACTERS_PER_RUN || 5);
const CHARACTERS_PER_ANIME = 8;

const QUERY = `
query ($id: Int, $perPage: Int) {
  Media(id: $id, type: ANIME) {
    title { romaji english }
    startDate { year }
    characters(sort: [ROLE, FAVOURITES_DESC], perPage: $perPage) {
      edges { role node { id name { full } image { large } description(asHtml: false) dateOfBirth { month day } } }
    }
  }
}`;

const MONTHS_AR = ["", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const ROLE_AR = { MAIN: "رئيسية", SUPPORTING: "مساندة", BACKGROUND: "ثانوية" };
const JIKAN_ROLE_AR = { Main: "رئيسية", Supporting: "مساندة" };

async function filterUsableEdges(edges) {
  const valid = [];
  for (const edge of edges) {
    if (edge.node.image?.large && await isUsableImage(edge.node.image.large)) valid.push(edge);
  }
  return valid;
}

export async function runAnimeCharacters() {
  const pending = (await readAll("videos", "anime"))
    .filter((a) => a.sourceId?.startsWith("anilist-anime:") && !a.charactersSynced)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, ANIME_PER_RUN);
  const existing = new Set((await readAll("gallery", "images")).map((i) => i.sourceId).filter(Boolean));
  console.log(`شخصيات الأنميات: ${pending.length} أنمي بانتظار المزامنة`);

  for (const anime of pending) {
    const id = Number(anime.sourceId.split(":")[1]);
    let Media = null;
    let edges = [];
    let source = "AniList";

    try {
      const result = await gql(QUERY, { id, perPage: CHARACTERS_PER_ANIME });
      Media = result.Media;
      edges = Media?.characters?.edges || [];
      edges = await filterUsableEdges(edges);
      if (!edges.length) {
        throw new Error("AniList returned no usable character images");
      }
      edges = edges.map((edge) => ({ ...edge, sourceId: `anilist-char:${edge.node.id}` }));
    } catch (error) {
      if (!anime.malId) {
        throw new Error(`AniList character lookup failed for ${anime.title}, and no MAL ID is saved for fallback: ${error.message}`);
      }
      console.warn(`AniList characters unavailable for ${anime.title}; trying Jikan: ${error.message}`);
      const fallback = await fetchJikanAnimeCharacters(anime.malId);
      const usableFallback = [];
      for (const character of fallback) {
        if (await isUsableImage(character.image)) usableFallback.push(character);
      }
      if (!usableFallback.length) {
        throw new Error(`Jikan returned no usable character images for ${anime.title}; leaving this anime pending for a later retry.`);
      }
      source = "Jikan";
      edges = usableFallback.slice(0, CHARACTERS_PER_ANIME).map((character) => ({
        sourceId: character.sourceId,
        role: character.role,
        node: {
          id: character.id,
          name: { full: character.name },
          image: { large: character.image },
          description: character.description,
          dateOfBirth: null,
        },
      }));
    }

    const fresh = edges.filter((edge) => edge.node.image?.large && !existing.has(edge.sourceId));
    const names = await toArabicMany(fresh.map((edge) => edge.node.name.full));
    const details = await toArabicMany(fresh.map((edge) => stripHtml(edge.node.description || "").slice(0, 1200)));
    const animeTitle = anime.title;

    for (const [i, edge] of fresh.entries()) {
      const c = edge.node;
      await push("gallery", "images", {
        title: `${names[i]} - ${c.name.full}`,
        anime: animeTitle,
        animeId: anime.id,
        role: ROLE_AR[edge.role] || JIKAN_ROLE_AR[edge.role] || "",
        type: "character",
        birthdate: c.dateOfBirth?.month ? `${c.dateOfBirth.day || ""} ${MONTHS_AR[c.dateOfBirth.month]}`.trim() : "غير معروف",
        seasons: animeTitle,
        start_date: Media?.startDate?.year ? String(Media.startDate.year) : "",
        details: details[i] || "",
        image: c.image.large,
        uploadedAt: new Date().toISOString(),
        uploadedBy: "auto",
        sourceId: edge.sourceId,
      });
      existing.add(edge.sourceId);
    }

    await update("videos", `anime/${anime.id}`, {
      charactersSynced: true,
      charactersSource: source,
      charactersSyncedAt: new Date().toISOString(),
    });
    console.log(`أُضيفت ${fresh.length} شخصية لـ ${animeTitle} (المصدر: ${source})`);
    await sleep(700);
  }
}
