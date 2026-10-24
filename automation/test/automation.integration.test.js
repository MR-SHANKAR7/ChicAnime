import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fetchSource } from "../lib/sources.js";
import { gql } from "../lib/anilist.js";
import { runNews } from "../jobs/news.js";
import { purgeExcluded } from "../jobs/catalog.js";
import { toArabic, toArabicMany } from "../lib/translate.js";

test("RSS integration parses a feed and preserves its source ID", async () => {
  const xml = `<?xml version="1.0"?>
  <rss version="2.0"><channel><title>Fixture</title><link>https://example.test</link><description>Fixture feed</description>
  <item><title>Anime news</title><link>https://example.test/news/1</link><guid>fixture-1</guid><description>Summary</description><pubDate>Mon, 20 Oct 2025 10:00:00 GMT</pubDate></item>
  </channel></rss>`;
  const items = await fetchSource(
    { name: "Fixture RSS", url: "https://example.test/feed.xml", accept: () => true },
    10,
    { fetchImpl: async () => ({ ok: true, status: 200, text: async () => xml }) },
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].guid, "fixture-1");
  assert.equal(items[0].title, "Anime news");
});

test("RSS HTTP and network failures are surfaced, not treated as empty feeds", async () => {
  await assert.rejects(
    fetchSource({ name: "Offline RSS", url: "https://example.test/feed", accept: () => true }, 10, {
      fetchImpl: async () => ({ ok: false, status: 503, text: async () => "offline" }),
    }),
    /HTTP 503/,
  );
  await assert.rejects(
    fetchSource({ name: "Offline RSS", url: "https://example.test/feed", accept: () => true }, 10, {
      fetchImpl: async () => { throw new TypeError("network down"); },
    }),
    /network down/,
  );
});

test("AniList retries a transient network failure and returns valid GraphQL data", async () => {
  let attempts = 0;
  const data = await gql("query { test }", {}, {
    sleepFn: async () => {},
    fetchImpl: async () => {
      attempts++;
      if (attempts === 1) throw new TypeError("connection reset");
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => ({ data: { result: 42 } }) };
    },
  });
  assert.equal(attempts, 2);
  assert.equal(data.result, 42);
});

test("AniList reports a clear error after repeated network outages", async () => {
  let attempts = 0;
  await assert.rejects(
    gql("query { test }", {}, {
      sleepFn: async () => {},
      fetchImpl: async () => { attempts++; throw new TypeError("network down"); },
    }),
    /AniList network failure after 3 attempts/,
  );
  assert.equal(attempts, 3);
});

test("news job tolerates one failed source, reports partial failure, and deduplicates RSS IDs", async () => {
  const item = {
    guid: "same-guid",
    link: "https://example.test/news/1",
    title: "خبر أنمي",
    excerpt: "ملخص",
    html: '<img src="https://example.test/news.jpg"><p>نص الخبر</p>',
    categories: [],
    isoDate: "2026-10-20T10:00:00.000Z",
  };
  const pushed = [];
  const result = await runNews({
    sources: [
      { name: "Broken source", lang: "ar" },
      { name: "Working source", lang: "ar" },
    ],
    fetchSourceFn: async (source) => {
      if (source.name === "Broken source") throw new Error("temporary outage");
      return [item, item];
    },
    readAllFn: async () => [],
    pushFn: async (_db, _node, record) => pushed.push(record),
    cdnImageFn: (url) => url,
  });
  assert.equal(result.successfulSources, 1);
  assert.equal(result.failedSources.length, 1);
  assert.equal(result.total, 1);
  assert.equal(pushed.length, 1);
  assert.equal(pushed[0].sourceId, "same-guid");
});

test("news job fails clearly when every RSS source is unavailable", async () => {
  await assert.rejects(
    runNews({
      sources: [{ name: "RSS A" }, { name: "RSS B" }],
      fetchSourceFn: async () => { throw new Error("offline"); },
      readAllFn: async () => [],
      pushFn: async () => assert.fail("No item should be written"),
    }),
    /فشلت جميع مصادر الأخبار/,
  );
});

test("excluded-anime cleanup deletes only provably automatic episodes", async () => {
  const episodes = [
    { id: "auto-1", animeId: "anime-1", sourceId: "anilist-anime:42:ep:1" },
    { id: "manual-no-source", animeId: "anime-1" },
    { id: "manual-source", animeId: "anime-1", sourceId: "manual-import:ep:2" },
    { id: "other-anime", animeId: "anime-2", sourceId: "anilist-anime:42:ep:3" },
    { id: "malformed-auto", animeId: "anime-1", sourceId: "anilist-anime:42:ep:xyz" },
  ];
  const removed = [];
  const result = await purgeExcluded(
    [{ id: 42, genres: ["Hentai"] }],
    [{ id: "anime-1", title: "Excluded anime", sourceId: "anilist-anime:42" }],
    {
      readAllFn: async (_db, node) => node === "episodes" ? episodes : [],
      removeFn: async (_db, path) => removed.push(path),
    },
  );
  assert.deepEqual(removed, []);
  assert.deepEqual(result, { animeRemoved: 0, episodesRemoved: 0, skippedAnime: 1 });
});

test("excluded anime with only verified automatic episodes can be safely removed", async () => {
  const removed = [];
  const result = await purgeExcluded(
    [{ id: 7 }],
    [{ id: "anime-7", title: "Automatic anime", sourceId: "anilist-anime:7" }],
    {
      readAllFn: async () => [
        { id: "episode-1", animeId: "anime-7", sourceId: "anilist-anime:7:ep:1" },
        { id: "episode-2", animeId: "anime-7", sourceId: "anilist-anime:7:ep:2" },
      ],
      removeFn: async (_db, path) => removed.push(path),
    },
  );
  assert.deepEqual(removed.sort(), ["anime/anime-7", "episodes/episode-1", "episodes/episode-2"].sort());
  assert.deepEqual(result, { animeRemoved: 1, episodesRemoved: 2, skippedAnime: 0 });
});

test("translation fallback returns original text and handles batches during outages", async () => {
  const original = "A title that cannot be translated";
  assert.equal(await toArabic(original, { translateFn: async () => { throw new Error("translator offline"); } }), original);
  assert.deepEqual(
    await toArabicMany([original, ""], { translateFn: async () => { throw new Error("translator offline"); } }),
    [original, ""],
  );
});

test("Telegram workflow encodes a real newline and fails on API errors", async () => {
  const workflow = await readFile(new URL("../../.github/workflows/auto-update.yml", import.meta.url), "utf8");
  assert.doesNotMatch(workflow, /%0A/);
  assert.match(workflow, /MESSAGE=\$\(printf/);
  assert.match(workflow, /--data-urlencode "text=\$\{MESSAGE\}"/);
  assert.match(workflow, /curl --fail-with-body --silent --show-error/);
});

test("Firebase temporary-node round trip (explicit opt-in only)", { skip: process.env.FIREBASE_INTEGRATION !== "1" }, async () => {
  const { push, readAll, remove, close } = await import("../lib/db.js");
  const marker = `automation-test:${Date.now()}`;
  let key;
  try {
    key = await push("gallery", "_automation_test", { sourceId: marker, value: "round-trip" });
    const rows = await readAll("gallery", "_automation_test");
    assert.ok(rows.some((row) => row.id === key && row.sourceId === marker && row.value === "round-trip"));
  } finally {
    if (key) await remove("gallery", `_automation_test/${key}`);
    await close();
  }
});
