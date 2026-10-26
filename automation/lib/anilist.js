const ENDPOINT = "https://graphql.anilist.co";

export async function gql(query, variables = {}, { fetchImpl = fetch, sleepFn = sleep, timeoutMs = 15000 } = {}) {
  let lastNetworkError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429) {
        if (attempt === 2) throw new Error("AniList: تجاوز حد الطلبات بعد 3 محاولات");
        await sleepFn(Number(res.headers.get("retry-after") || 5) * 1000);
        continue;
      }
      if (!res.ok) throw new Error(`AniList HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
      const json = await res.json();
      if (json.errors) throw new Error(`AniList GraphQL: ${JSON.stringify(json.errors)}`);
      return json.data;
    } catch (err) {
      if (err.message?.startsWith("AniList HTTP") || err.message?.startsWith("AniList GraphQL") || err.message?.startsWith("AniList: تجاوز")) throw err;
      lastNetworkError = err;
      if (attempt < 2) await sleepFn(500 * (attempt + 1));
    }
  }
  throw new Error(`AniList network failure after 3 attempts: ${lastNetworkError?.message || "unknown error"}`);
}

// ترجمة أنواع AniList إلى التصنيفات المستخدمة في لوحة إدارة الموقع
const GENRE_MAP = {
  Action: "أكشن", Adventure: "مغامرة", Comedy: "كوميدي", Drama: "دراما",
  Fantasy: "فانتازيا", Romance: "رومانسي", "Sci-Fi": "خيال علمي", Sports: "رياضة",
};
export function mapGenres(genres = []) {
  const mapped = genres.map((g) => GENRE_MAP[g]).filter(Boolean);
  return mapped.length ? mapped : ["أكشن"];
}

export const STATUS_MAP = { RELEASING: "ongoing", FINISHED: "completed", NOT_YET_RELEASED: "upcoming", CANCELLED: "completed", HIATUS: "ongoing" };
export const SEASON_AR = { WINTER: "شتاء", SPRING: "ربيع", SUMMER: "صيف", FALL: "خريف" };
export const FORMAT_AR = { TV: "مسلسل", TV_SHORT: "مسلسل قصير", MOVIE: "فيلم", OVA: "OVA", ONA: "ONA", SPECIAL: "خاص", MUSIC: "موسيقى" };

export const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english }
  description(asHtml: false)
  genres
  coverImage { extraLarge large }
  bannerImage
  status
  format
  season
  seasonYear
  episodes
  averageScore
  popularity
  startDate { year month day }
  trailer { id site }
  nextAiringEpisode { episode airingAt }
  studios(isMain: true) { nodes { name } }
  streamingEpisodes { title thumbnail url site }
`;

export function toAnimeRecord(m) {
  const next = m.nextAiringEpisode;
  return {
    title: m.title.english || m.title.romaji,
    titleRomaji: m.title.romaji,
    malId: m.idMal || null,
    status: STATUS_MAP[m.status] || "ongoing",
    category: mapGenres(m.genres),
    thumbnail: m.coverImage.extraLarge || m.coverImage.large,
    banner: m.bannerImage || "",
    format: FORMAT_AR[m.format] || m.format || "",
    season: m.season ? `${SEASON_AR[m.season]} ${m.seasonYear}` : "",
    seasonKey: m.season ? `${m.seasonYear}-${m.season}` : "",
    episodesTotal: m.episodes || 0,
    score: m.averageScore || 0,
    popularity: m.popularity || 0,
    studio: m.studios?.nodes?.[0]?.name || "",
    startDate: m.startDate?.year ? `${m.startDate.year}-${String(m.startDate.month || 1).padStart(2, "0")}-${String(m.startDate.day || 1).padStart(2, "0")}` : "",
    trailer: m.trailer?.site === "youtube" ? m.trailer.id : "",
    nextAiring: next ? { episode: next.episode, airingAt: next.airingAt * 1000 } : null,
    sourceId: `anilist-anime:${m.id}`,
  };
}

export function currentSeason(date = new Date()) {
  const m = date.getUTCMonth();
  const seasons = ["WINTER", "WINTER", "WINTER", "SPRING", "SPRING", "SPRING", "SUMMER", "SUMMER", "SUMMER", "FALL", "FALL", "FALL"];
  const year = date.getUTCFullYear();
  const season = seasons[m];
  const order = ["WINTER", "SPRING", "SUMMER", "FALL"];
  const ni = (order.indexOf(season) + 1) % 4;
  return { season, year, nextSeason: order[ni], nextYear: ni === 0 ? year + 1 : year };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
