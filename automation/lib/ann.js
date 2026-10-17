import Parser from "rss-parser";

const FEED = "https://www.animenewsnetwork.com/news/rss.xml?ann-edition=us";
const UA = "Mozilla/5.0 (compatible; ChicAnimeBot/1.0)";

export async function latestNews(limit = 10) {
  const feed = await new Parser().parseURL(FEED);
  return feed.items.slice(0, limit).map((it) => ({
    guid: it.guid || it.link,
    link: it.link,
    title: it.title,
    excerpt: it.contentSnippet || "",
    isoDate: it.isoDate || new Date().toISOString(),
  }));
}

// يجلب صفحة الخبر ويستخرج الصورة الرئيسية ونص المقال
export async function fetchArticle(url) {
  const html = await (await fetch(url, { headers: { "User-Agent": UA } })).text();
  const image = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || "";
  const body = extractDiv(html, '<div class="meat">');
  const text = body
    .replace(/<figcaption[\s\S]*?<\/figcaption>/g, "")
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/g, "")
    .replace(/<\/p>|<br\s*\/?>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
  return { image, text: text.slice(0, 1800) };
}

// يستخرج محتوى عنصر div مع مراعاة التداخل
function extractDiv(html, opening) {
  const start = html.indexOf(opening);
  if (start < 0) return "";
  let depth = 0, i = start;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) { i = m.index; break; }
  }
  return html.slice(start + opening.length, i);
}
