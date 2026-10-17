import { readAll, push, update } from "../lib/db.js";
import { gql, mapGenres, sleep } from "../lib/anilist.js";
import { toArabic, stripHtml } from "../lib/translate.js";

const ANIME_COUNT = Number(process.env.ANIME_COUNT || 20);

// الأنميات المعروضة حاليًا والأكثر شعبية، مع حلقاتها على المنصات الرسمية
const QUERY = `
query ($perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC, isAdult: false) {
      id
      title { romaji english }
      description(asHtml: false)
      genres
      coverImage { extraLarge large }
      status
      streamingEpisodes { title thumbnail url site }
    }
  }
}`;

function episodeNumber(title = "", fallback) {
  const m = title.match(/Episode\s+(\d+)/i);
  return m ? Number(m[1]) : fallback;
}

export async function runEpisodes() {
  const { Page } = await gql(QUERY, { perPage: ANIME_COUNT });
  const media = Page.media.filter((m) => m.streamingEpisodes?.length);

  const animeList = await readAll("anime");
  const animeBySource = new Map(animeList.filter((a) => a.sourceId).map((a) => [a.sourceId, a]));
  const episodeKeys = new Set((await readAll("episodes")).map((e) => e.sourceId).filter(Boolean));

  let added = 0;
  for (const m of media) {
    const sourceId = `anilist-anime:${m.id}`;
    let anime = animeBySource.get(sourceId);

    if (!anime) {
      const title = m.title.english || m.title.romaji;
      const description = await toArabic(stripHtml(m.description || "").slice(0, 1200));
      const now = new Date().toISOString();
      const id = await push("anime", {
        title,
        status: "ongoing",
        category: mapGenres(m.genres),
        thumbnail: m.coverImage.extraLarge || m.coverImage.large,
        description,
        createdAt: now,
        updatedAt: now,
        sourceId,
      });
      anime = { id, sourceId };
      animeBySource.set(sourceId, anime);
      console.log("أنمي جديد:", title);
    } else if (m.status !== "RELEASING" && anime.status !== "completed") {
      await update(`anime/${anime.id}`, { status: "completed", updatedAt: new Date().toISOString() });
    }

    // حلقات جديدة فقط
    for (const [idx, ep] of m.streamingEpisodes.entries()) {
      const number = episodeNumber(ep.title, idx + 1);
      const epSource = `${sourceId}:ep:${number}`;
      if (episodeKeys.has(epSource)) continue;

      const now = new Date().toISOString();
      await push("episodes", {
        animeId: anime.id,
        number,
        title: ep.title.replace(/^Episode\s+\d+\s*-\s*/i, "") || `الحلقة ${number}`,
        thumbnail: ep.thumbnail || "",
        servers: {
          official: {
            name: "official",
            qualities: { auto: ep.url },
          },
        },
        createdAt: now,
        updatedAt: now,
        sourceId: epSource,
      });
      episodeKeys.add(epSource);
      added++;
    }
    await sleep(700);
  }
  console.log(`الحلقات: ${added} حلقة جديدة`);
}
