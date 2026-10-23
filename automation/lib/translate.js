import translate from "google-translate-api-x";

// ترجمة نص إلى العربية؛ عند الفشل يُعاد النص الأصلي كما هو
export async function toArabic(text) {
  if (!text || !text.trim()) return "";
  try {
    const res = await translate(text, { to: "ar", forceBatch: false });
    return res.text;
  } catch (err) {
    console.warn("فشلت الترجمة، سيُستخدم النص الأصلي:", err.message);
    return text;
  }
}

// ترجمة عدة نصوص دفعة واحدة (أسرع وأقل طلبات)
export async function toArabicMany(texts) {
  const clean = texts.map((t) => (t || "").trim());
  if (!clean.some(Boolean)) return clean;
  try {
    const res = await translate(clean.map((t) => t || "-"), { to: "ar", forceBatch: true });
    return res.map((r, i) => (clean[i] ? r.text : ""));
  } catch (err) {
    console.warn("فشلت الترجمة الجماعية، سيُستخدم النص الأصلي:", err.message);
    return clean;
  }
}

// إزالة وسوم HTML وتنسيق AniList البسيط
export function stripHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/~!|!~/g, "")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
