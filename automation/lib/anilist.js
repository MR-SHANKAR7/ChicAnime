const ENDPOINT = "https://graphql.anilist.co";

export async function gql(query, variables = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// ترجمة أنواع AniList إلى التصنيفات المستخدمة في لوحة إدارة الموقع
const GENRE_MAP = {
  Action: "أكشن", Adventure: "مغامرة", Comedy: "كوميدي", Drama: "دراما",
  Fantasy: "فانتازيا", Romance: "رومانسي", "Sci-Fi": "خيال علمي", Sports: "رياضة",
};

export function mapGenres(genres = []) {
  const mapped = genres.map((g) => GENRE_MAP[g]).filter(Boolean);
  return mapped.length ? mapped : ["أكشن"];
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
