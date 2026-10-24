import translate from "google-translate-api-x";

function logUntranslated(text, reason) {
  const sample = String(text || "").replace(/\s+/g, " ").slice(0, 120);
  console.warn(`نص بقي بلغته الأصلية (${reason}): "${sample}"`);
}

// ترجمة نص إلى العربية؛ لا نخفي فشل الترجمة بل نسجله ونُبقي النص الأصلي
export async function toArabic(text, { translateFn = translate } = {}) {
  if (!text || !text.trim()) return "";
  try {
    const res = await translateFn(text, { to: "ar", forceBatch: false });
    if (res.text.trim() === text.trim() && /[A-Za-z]{3}/.test(text)) {
      logUntranslated(text, "لم يتغير بعد طلب الترجمة");
    }
    return res.text;
  } catch (err) {
    logUntranslated(text, err.message || "خطأ غير معروف");
    return text;
  }
}

// ترجمة عدة نصوص دفعة واحدة (أسرع وأقل طلبات)
export async function toArabicMany(texts, { translateFn = translate } = {}) {
  const clean = texts.map((t) => (t || "").trim());
  if (!clean.some(Boolean)) return clean;
  try {
    const res = await translateFn(clean.map((t) => t || "-"), { to: "ar", forceBatch: true });
    return res.map((r, i) => {
      if (clean[i] && r.text.trim() === clean[i] && /[A-Za-z]{3}/.test(clean[i])) {
        logUntranslated(clean[i], "لم يتغير بعد طلب الترجمة الجماعية");
      }
      return clean[i] ? r.text : "";
    });
  } catch (err) {
    for (const text of clean) if (text) logUntranslated(text, err.message || "فشل طلب الترجمة الجماعية");
    return clean;
  }
}

export function stripHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/~!|!~/g, "")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
