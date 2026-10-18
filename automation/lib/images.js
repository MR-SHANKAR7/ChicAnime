// تمرير الصور الخارجية عبر CDN مجاني (images.weserv.nl) لتفادي منع الربط المباشر وتسريع التحميل
export function cdnImage(url, width = 800) {
  if (!url) return "";
  const bare = url.replace(/^https?:\/\//, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(bare)}&w=${width}&output=webp&q=82`;
}
