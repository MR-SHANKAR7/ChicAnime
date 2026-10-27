// Image URL helpers shared by automation jobs.
export function cdnImage(url, width = 800) {
  if (!url) return "";
  let parsed;
  try { parsed = new URL(String(url)); } catch { return ""; }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
  const bare = parsed.href.replace(/^https?:\\/\\//, "");
  return `https://images.weserv.nl/?url=${encodeURIComponent(bare)}&w=${width}&output=webp&q=82`;
}

// Validate that the URL returns an actual image, not just a non-empty string.
export async function isUsableImage(url, { fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  let parsed;
  try { parsed = new URL(String(url || "")); } catch { return false; }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  try {
    const response = await fetchImpl(parsed.href, {
      method: "GET",
      headers: { Range: "bytes=0-1023", "User-Agent": "Mozilla/5.0 (compatible; ChicAnimeBot/1.0)" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const type = response.headers?.get?.("content-type") || "";
    if (!response.ok || !type.toLowerCase().startsWith("image/")) return false;
    if (response.body && typeof response.body.cancel === "function") await response.body.cancel().catch(() => {});
    return true;
  } catch { return false; }
}
