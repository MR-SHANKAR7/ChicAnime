import { readAll, push } from "../lib/db.js";

// ملخص أسبوعي: مقال يجمع أبرز أخبار الأسبوع (يُنشر مرة واحدة لكل أسبوع)
export async function runDigest() {
  const now = new Date();
  if (now.getUTCDay() !== 5 && !process.env.FORCE_DIGEST) return console.log("الملخص يُنشر يوم الجمعة فقط");
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const weekKey = `digest:${now.getUTCFullYear()}-W${isoWeek(now)}`;

  const news = await readAll("gallery", "news");
  if (news.some((n) => n.sourceId === weekKey)) return console.log("الملخص الأسبوعي منشور مسبقًا");

  const picks = news
    .filter((n) => n.author === "auto" && new Date(n.date) >= weekAgo)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7);
  if (picks.length < 3) return console.log("أخبار الأسبوع غير كافية للملخص");

  const fmt = new Intl.DateTimeFormat("ar-MA", { day: "numeric", month: "long" });
  const title = `أبرز أخبار الأنمي هذا الأسبوع (${fmt.format(weekAgo)} - ${fmt.format(now)})`;
  const body = picks
    .map((n, i) => `${i + 1}. ${n.title}\n${(n.excerpt || "").slice(0, 200)}`)
    .join("\n\n");

  await push("gallery", "news", {
    title,
    excerpt: `ملخص لأهم ${picks.length} أخبار في عالم الأنمي خلال الأسبوع الماضي.`,
    content: `${body}\n\nتابع التفاصيل الكاملة لكل خبر في قسم الأخبار.`,
    category: "ملخص الأسبوع",
    tags: ["أنمي", "أخبار", "ملخص أسبوعي"],
    imageUrl: picks[0].imageUrl,
    date: now.toISOString(),
    author: "auto",
    sourceId: weekKey,
  });
  console.log("نُشر الملخص الأسبوعي:", title);
}

function isoWeek(d) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}
