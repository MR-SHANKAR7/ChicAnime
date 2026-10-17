import { readAll, push } from "../lib/db.js";
import { latestNews, fetchArticle } from "../lib/ann.js";
import { toArabic } from "../lib/translate.js";

const MAX_PER_RUN = Number(process.env.NEWS_PER_RUN || 5);

export async function runNews() {
  const existing = new Set((await readAll("news")).map((n) => n.sourceId).filter(Boolean));
  const items = (await latestNews(20)).filter((it) => !existing.has(it.guid)).slice(0, MAX_PER_RUN);
  console.log(`الأخبار: ${items.length} خبر جديد`);

  for (const it of items) {
    const article = await fetchArticle(it.link);
    if (!article.image) { console.log("تخطي (بدون صورة):", it.title); continue; }

    const [title, excerpt, content] = await Promise.all([
      toArabic(it.title),
      toArabic(it.excerpt || it.title),
      toArabic(article.text || it.excerpt || it.title),
    ]);

    await push("news", {
      title,
      excerpt,
      content: `${content}\n\nالمصدر: ${it.link}`,
      category: "أخبار",
      tags: ["أنمي", "أخبار"],
      imageUrl: article.image,
      date: it.isoDate,
      author: "auto",
      sourceId: it.guid,
      sourceUrl: it.link,
    });
    console.log("أُضيف:", title);
  }
}
