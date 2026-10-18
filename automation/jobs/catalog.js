import { readAll, push, update, remove } from "../lib/db.js";
import { gql, MEDIA_FIELDS, toAnimeRecord, currentSeason, sleep } from "../lib/anilist.js";
import { toArabic, toArabicMany, stripHtml } from "../lib/translate.js";

const DB = "videos";
const CATALOG_SIZE = Number(process.env.CATALOG_SIZE || 150);      // أشهر الأنميات عمومًا
const NEW_ANIME_PER_RUN = Number(process.env.NEW_ANIME_PER_RUN || 25);

const PAGE_QUERY = `
query ($page: Int, $perPage: Int, $sort: [MediaSort], $status: MediaStatus, $season: MediaSeason, $seasonYear: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(type: ANIME, isAdult: false, sort: $sort, status: $status, season: $season, seasonYear: $seasonYear) { ${MEDIA_FIELDS} }
  }
}`;

// أنواع مستبعدة من الموقع (محتوى غير مناسب للجمهور العام)
const EXCLUDED_GENRES = new Set(["Ecchi", "Hentai"]);
const isExcluded = (m) => (m.genres || []).some((g) => EXCLUDED_GENRES.has(g));

const norm = (t = "") => t.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, " ").trim();
const episodeNumber = (title = "", fallback) => Number(title.match(/Episode\s+(\d+)/i)?.[1] || fallback);

async function fetchPages(variables, max) {
  const out = [];
  for (let page = 1; out.length < max; page++) {
    const { Page } = await gql(PAGE_QUERY, { page, perPage: 50, ...variables });
    out.push(...Page.media);
    if (!Page.pageInfo.hasNextPage) break;
    await sleep(700);
  }
  return out.slice(0, max);
}

// يجمع: الموسم الحالي، الموسم القادم، المعروض حاليًا، وأشهر الأنميات
async function collectMedia() {
  const { season, year, nextSeason, nextYear } = currentSeason();
  const sets = [
    fetchPages({ season, seasonYear: year, sort: ["POPULARITY_DESC"] }, 100),
    fetchPages({ season: nextSeason, seasonYear: nextYear, sort: ["POPULARITY_DESC"] }, 50),
    fetchPages({ status: "RELEASING", sort: ["POPULARITY_DESC"] }, 50),
    fetchPages({ sort: ["POPULARITY_DESC"] }, CATALOG_SIZE),
  ];
  const byId = new Map();
  for (const set of sets) for (const m of await set) byId.set(m.id, m);
  return [...byId.values()];
}

export async function runCatalog() {
  const allMedia = await collectMedia();
  const media = allMedia.filter((m) => !isExcluded(m));
  console.log(`الكتالوج: ${media.length} أنمي من AniList (${allMedia.length - media.length} مستبعد)`);

  const animeList = await readAll(DB, "anime");
  await purgeExcluded(allMedia.filter(isExcluded), animeList);
  const bySource = new Map(animeList.filter((a) => a.sourceId).map((a) => [a.sourceId, a]));
  const byTitle = new Map(animeList.map((a) => [norm(a.title), a]));
  const episodeKeys = new Set((await readAll(DB, "episodes")).map((e) => e.sourceId).filter(Boolean));

  let created = 0, updated = 0, episodesAdded = 0;

  for (const m of media) {
    const rec = toAnimeRecord(m);
    const now = new Date().toISOString();
    let anime = bySource.get(rec.sourceId);

    // ربط الأنمي المضاف يدويًا بالاسم نفسه بدل تكراره
    if (!anime) {
      const manual = byTitle.get(norm(rec.title)) || byTitle.get(norm(m.title.romaji));
      if (manual) { anime = manual; console.log("ربط بأنمي موجود:", manual.title); }
    }

    if (anime) {
      // تحديث الحقول المتغيرة فقط، دون لمس العنوان/الوصف/الصورة التي قد يكون المستخدم عدّلها
      const { title, thumbnail, category, ...dynamic } = rec;
      await update(DB, `anime/${anime.id}`, { ...dynamic, updatedAt: now });
      updated++;
    } else {
      if (created >= NEW_ANIME_PER_RUN) continue;
      const [description, title_ar] = await Promise.all([
        toArabic(stripHtml(m.description || "").slice(0, 1200)),
        toArabic(rec.title),
      ]);
      const id = await push(DB, "anime", { ...rec, title_ar, description, createdAt: now, updatedAt: now });
      anime = { id, ...rec };
      created++;
      console.log("أنمي جديد:", rec.title);
    }
    bySource.set(rec.sourceId, anime);

    // الحلقات الرسمية الجديدة، مع ترجمة عناوينها دفعة واحدة
    const fresh = (m.streamingEpisodes || [])
      .map((ep, idx) => ({ ...ep, number: episodeNumber(ep.title, idx + 1) }))
      .filter((ep) => !episodeKeys.has(`${rec.sourceId}:ep:${ep.number}`));
    if (fresh.length) {
      const rawTitles = fresh.map((ep) => ep.title.replace(/^Episode\s+\d+\s*-\s*/i, ""));
      const titlesAr = await toArabicMany(rawTitles);
      for (const [i, ep] of fresh.entries()) {
        await push(DB, "episodes", {
          animeId: anime.id,
          number: ep.number,
          title: titlesAr[i] || rawTitles[i] || `الحلقة ${ep.number}`,
          titleEn: rawTitles[i],
          thumbnail: ep.thumbnail || "",
          servers: { official: { name: "official", qualities: { auto: ep.url } } },
          createdAt: now,
          updatedAt: now,
          sourceId: `${rec.sourceId}:ep:${ep.number}`,
        });
        episodeKeys.add(`${rec.sourceId}:ep:${ep.number}`);
        episodesAdded++;
      }
    }
  }
  console.log(`الكتالوج: ${created} أنمي جديد، ${updated} محدّث، ${episodesAdded} حلقة جديدة`);
}

// حذف أي أنمي (وحلقاته) أُضيف تلقائيًا ثم تبيّن أنه من الأنواع المستبعدة
async function purgeExcluded(excludedMedia, animeList) {
  const ids = new Set(excludedMedia.map((m) => `anilist-anime:${m.id}`));
  const victims = animeList.filter((a) => ids.has(a.sourceId));
  if (!victims.length) return;
  const episodes = await readAll(DB, "episodes");
  for (const a of victims) {
    for (const ep of episodes.filter((e) => e.animeId === a.id)) await remove(DB, `episodes/${ep.id}`);
    await remove(DB, `anime/${a.id}`);
    console.log("حُذف (نوع مستبعد):", a.title);
  }
}
