import { readAll, push } from "../lib/db.js";
import { SOURCES, fetchSource, fetchArticle, htmlToText, firstImage } from "../lib/sources.js";
import { toArabic } from "../lib/translate.js";
import { cdnImage } from "../lib/images.js";

const MAX_PER_SOURCE = Number(process.env.NEWS_PER_RUN || 5);

export async function runNews() {
  const existing = new Set((await readAll("gallery", "news")).map((n) => n.sourceId).filter(Boolean));
  let total = 0;

  for (const src of SOURCES) {
    let items;
    try { items = await fetchSource(src); } catch (err) { console.warn(`تعذر جلب ${src.name}:`, err.message); continue; }
    items = items.filter((it) => !existing.has(it.guid)).slice(0, MAX_PER_SOURCE);
    console.log(`${src.name}: ${items.length} خبر جديد`);

    for (const it of items) {
      const record = src.lang === "ar" ? await arabicRecord(it) : await translatedRecord(it);
      if (!record) { console.log("تخطي (بدون صورة):", it.title); continue; }
      await push("gallery", "news", {
        ...record,
        category: "أخبار",
        tags: ["أنمي", "أخبار", ...it.categories.filter((c) => c.length < 25).slice(0, 4)],
        date: it.isoDate,
        author: "auto",
        source: src.name,
        sourceId: it.guid,
        sourceUrl: it.link,
      });
      total++;
      console.log("أُضيف:", record.title);
    }
  }
  console.log(`الأخبار: ${total} خبر جديد إجمالًا`);
}

// مصدر عربي: ننشر العنوان والملخص وجزءًا من النص مع الإحالة إلى المصدر
async function arabicRecord(it) {
  let image = firstImage(it.html);
  if (!image) {
    try { image = (await fetchArticle(it.link)).image; } catch { /* بدون صورة */ }
  }
  if (!image) return null;
  const text = htmlToText(it.html).slice(0, 900);
  return {
    title: it.title,
    excerpt: it.excerpt.slice(0, 220) || it.title,
    content: `${text}${text.length >= 900 ? "…" : ""}\n\nالمصدر: ${it.link}`,
    imageUrl: cdnImage(image),
  };
}

// مصدر إنجليزي: نجلب المقال ونترجمه
async function translatedRecord(it) {
  const article = await fetchArticle(it.link);
  if (!article.image) return null;
  const [title, excerpt, content] = await Promise.all([
    toArabic(it.title),
    toArabic(it.excerpt || it.title),
    toArabic(article.text || it.excerpt || it.title),
  ]);
  return { title, excerpt, content: `${content}\n\nالمصدر: ${it.link}`, imageUrl: cdnImage(article.image) };
}
