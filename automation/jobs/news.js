import { readAll, push } from "../lib/db.js";
import { SOURCES, fetchSource, fetchArticle, htmlToText, firstImage } from "../lib/sources.js";
import { toArabic } from "../lib/translate.js";
import { cdnImage, isUsableImage } from "../lib/images.js";

const MAX_PER_SOURCE = Number(process.env.NEWS_PER_RUN || 5);

export async function runNews({
  sources = SOURCES,
  fetchSourceFn = fetchSource,
  fetchArticleFn = fetchArticle,
  readAllFn = readAll,
  pushFn = push,
  translateFn = toArabic,
  cdnImageFn = cdnImage,
  validateImageFn = isUsableImage,
} = {}) {
  const existing = new Set((await readAllFn("gallery", "news")).map((n) => n.sourceId).filter(Boolean));
  let total = 0;
  let successfulSources = 0;
  const failedSources = [];

  for (const src of sources) {
    let items;
    try {
      items = await fetchSourceFn(src);
      successfulSources++;
    } catch (err) {
      failedSources.push({ source: src.name, error: err.message });
      console.warn(`تعذر جلب ${src.name}:`, err.message);
      continue;
    }
    const seenInSource = new Set();
    items = items.filter((it) => {
      if (!it.guid || existing.has(it.guid) || seenInSource.has(it.guid)) return false;
      seenInSource.add(it.guid);
      return true;
    }).slice(0, MAX_PER_SOURCE);
    console.log(`${src.name}: ${items.length} خبر جديد`);

    for (const it of items) {
      const record = src.lang === "ar"
        ? await arabicRecord(it, { fetchArticleFn, cdnImageFn })
        : await translatedRecord(it, { fetchArticleFn, translateFn, cdnImageFn });
      if (!record?.imageUrl || !(await validateImageFn(record.imageUrl))) {
        console.log("تخطي (الصورة مفقودة أو غير صالحة):", it.title);
        continue;
      }
      await pushFn("gallery", "news", {
        ...record,
        category: "أخبار",
        tags: ["أنمي", "أخبار", ...it.categories.filter((c) => c.length < 25).slice(0, 4)],
        date: it.isoDate,
        author: "auto",
        source: src.name,
        sourceId: it.guid,
        sourceUrl: it.link,
      });
      existing.add(it.guid);
      total++;
      console.log("أُضيف:", record.title);
    }
  }

  if (sources.length > 0 && successfulSources === 0) {
    throw new Error(`فشلت جميع مصادر الأخبار (${failedSources.length}/${sources.length}): ${failedSources.map((s) => s.source + ": " + s.error).join(" | ")}`);
  }
  if (failedSources.length) {
    console.warn(`تحذير: فشل ${failedSources.length} من أصل ${sources.length} مصادر الأخبار؛ نجح ${successfulSources} مصدر.`);
  }
  console.log(`الأخبار: ${total} خبر جديد إجمالًا؛ ${successfulSources}/${sources.length} مصدر ناجح`);
  return { total, successfulSources, failedSources };
}

// مصدر عربي: ننشر العنوان والملخص وجزءًا من النص مع الإحالة إلى المصدر
async function arabicRecord(it, { fetchArticleFn, cdnImageFn }) {
  let image = firstImage(it.html);
  if (!image) {
    try { image = (await fetchArticleFn(it.link)).image; } catch (err) {
      console.warn(`تعذر جلب مقال الخبر لاستخراج الصورة (${it.link}):`, err.message);
    }
  }
  if (!image) return null;
  const text = htmlToText(it.html).slice(0, 900);
  return {
    title: it.title,
    excerpt: it.excerpt.slice(0, 220) || it.title,
    content: `${text}${text.length >= 900 ? "…" : ""}\n\nالمصدر: ${it.link}`,
    imageUrl: cdnImageFn(image),
  };
}

// مصدر إنجليزي: نجلب المقال ونترجمه
async function translatedRecord(it, { fetchArticleFn, translateFn, cdnImageFn }) {
  const article = await fetchArticleFn(it.link);
  if (!article.image) return null;
  const [title, excerpt, content] = await Promise.all([
    translateFn(it.title),
    translateFn(it.excerpt || it.title),
    translateFn(article.text || it.excerpt || it.title),
  ]);
  return { title, excerpt, content: `${content}\n\nالمصدر: ${it.link}`, imageUrl: cdnImageFn(article.image) };
}
