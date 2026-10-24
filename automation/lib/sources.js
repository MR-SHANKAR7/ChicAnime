import Parser from "rss-parser";

const UA = "Mozilla/5.0 (compatible; ChicAnimeBot/1.0)";
const parser = new Parser({ customFields: { item: ["content:encoded"] } });

// مصادر الأخبار: العربية تُنشر كما هي، والإنجليزية تُترجم
export const SOURCES = [
  { id: "gateanime", name: "شبكة أخبار الأنمي", url: "https://gateanime.net/feed/", lang: "ar",
    accept: (it) => (it.categories || []).includes("أخبار أنمي") && !/مترجم|الحلقة \d+/.test(it.title) },
  { id: "arabanime", name: "عرب أنمي", url: "https://www.arabanime.com/feed/", lang: "ar", accept: () => true },
  { id: "ann", name: "Anime News Network", url: "https://www.animenewsnetwork.com/news/rss.xml?ann-edition=us", lang: "en", accept: () => true },
];

const requestOptions = (timeoutMs) => ({
  headers: { "User-Agent": UA },
  signal: AbortSignal.timeout(timeoutMs),
});

export async function fetchSource(src, limit = 15, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const response = await fetchImpl(src.url, requestOptions(timeoutMs));
  if (!response.ok) throw new Error(`RSS ${src.name} HTTP ${response.status}`);
  const feed = await parser.parseString(await response.text());
  return feed.items.filter(src.accept).slice(0, limit).map((it) => ({
    source: src,
    guid: it.guid || it.link,
    link: it.link,
    title: (it.title || "").trim(),
    excerpt: (it.contentSnippet || "").trim(),
    html: it["content:encoded"] || it.content || "",
    categories: it.categories || [],
    isoDate: it.isoDate || new Date().toISOString(),
  }));
}

// يجلب صفحة الخبر ويستخرج الصورة الرئيسية ونص المقال (لمصادر لا توفر المحتوى في RSS)
export async function fetchArticle(url, { fetchImpl = fetch, timeoutMs = 15000 } = {}) {
  const response = await fetchImpl(url, requestOptions(timeoutMs));
  if (!response.ok) throw new Error(`Article HTTP ${response.status}: ${url}`);
  const html = await response.text();
  const image = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || "";
  const body = extractDiv(html, '<div class="meat">');
  return { image, text: htmlToText(body).slice(0, 1800) };
}

export function htmlToText(html = "") {
  return html
    .replace(/<figcaption[\s\S]*?<\/figcaption>/g, "")
    .replace(/<(script|style|iframe)[\s\S]*?<\/\1>/g, "")
    .replace(/<\/p>|<br\s*\/?>|<\/h\d>|<\/li>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&#39;|&#8217;|&rsquo;/g, "'").replace(/&nbsp;|&#160;/g, " ").replace(/&#8220;|&#8221;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

export function firstImage(html = "") {
  const m = html.match(/<img[^>]+src="([^"]+)"/);
  return m ? m[1].replace(/&#038;/g, "&").replace(/\?resize=[^&]*&?/, "?") : "";
}

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
