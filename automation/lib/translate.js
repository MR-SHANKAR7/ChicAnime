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

// إزالة وسوم HTML وتنسيق AniList البسيط
export function stripHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/~!|!~/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
