const BASE = "https://api.jikan.moe/v4";
const USER_AGENT = "ChicAnime/1.0 (anime metadata client)";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches character metadata for an anime from Jikan (MyAnimeList data).
 * This is a metadata fallback only; it does not fetch or resolve video streams.
 */
export async function fetchJikanAnimeCharacters(
  malId,
  { fetchImpl = fetch, sleepFn = sleep, timeoutMs = 12000 } = {},
) {
  const id = Number(malId);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Jikan requires a valid MyAnimeList anime ID");
  }

  const url = `${BASE}/anime/${id}/characters`;
  let lastError;

  for (let attempt = 0; attempt < 3; attempt++) {
    // Jikan's published rate limits can change; keep requests deliberately spaced.
    await sleepFn(350);

    try {
      const response = await fetchImpl(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Number(response.headers?.get?.("Retry-After") || 0);
        if (attempt < 2) {
          await sleepFn(Math.max(retryAfter * 1000, 700 * (attempt + 1)));
          continue;
        }
      }

      if (!response.ok) {
        throw new Error(`Jikan HTTP ${response.status} for anime ${id}`);
      }

      const payload = await response.json();
      if (!Array.isArray(payload.data)) {
        throw new Error("Jikan returned an unexpected characters response");
      }

      return payload.data.map((entry) => {
        const character = entry.character || {};
        return {
          id: Number(character.mal_id),
          name: String(character.name || "").trim(),
          image: character.images?.webp?.image_url || character.images?.jpg?.image_url || "",
          role: String(entry.role || ""),
          description: String(character.about || ""),
          sourceId: `jikan-char:${id}:${character.mal_id}`,
        };
      }).filter((character) => character.id > 0 && character.name && character.image);
    } catch (error) {
      lastError = error;
      if (attempt === 2) break;
      await sleepFn(500 * (attempt + 1));
    }
  }

  throw new Error(`Jikan character lookup failed for anime ${id}: ${lastError?.message || "unknown error"}`);
}

// Fetch a single character image by MAL character ID for repairing old gallery records.
export async function fetchJikanCharacterImage(characterId, { fetchImpl = fetch, timeoutMs = 12000 } = {}) {
  const id = Number(characterId);
  if (!Number.isInteger(id) || id <= 0) return "";
  await sleep(350);
  const response = await fetchImpl(`${BASE}/characters/${id}/full`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Jikan character image HTTP ${response.status} for ${id}`);
  const payload = await response.json();
  return payload.data?.images?.webp?.image_url || payload.data?.images?.jpg?.image_url || "";
}
