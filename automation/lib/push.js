import admin from "firebase-admin";
import { readAll, remove } from "./db.js";

// إرسال إشعار Push لمتابعي أنمي معيّن عبر Firebase Cloud Messaging
// الاشتراكات في videos/pushSubscriptions/{token} = { anime: { animeId: true }, updatedAt }
let subsCache = null;

export async function notifyFollowers(anime, episode) {
  if (process.env.DRY_RUN === "1") return console.log(`[dry-run] push: ${anime.title} الحلقة ${episode}`);
  subsCache ??= await readAll("videos", "pushSubscriptions");
  const tokens = subsCache.filter((s) => s.anime?.[anime.id]).map((s) => s.id);
  if (!tokens.length) return;

  const messaging = admin.app("videos").messaging();
  const url = `https://mr-shankar7.github.io/ChicAnime/anime.html?id=${anime.id}`;
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: anime.title_ar || anime.title, body: `صدرت الحلقة ${episode} الآن`, image: anime.thumbnail },
    data: { url, animeId: anime.id },
    webpush: { fcmOptions: { link: url }, notification: { icon: anime.thumbnail, dir: "rtl", lang: "ar" } },
  });

  // حذف الرموز الميتة (متصفح أزال الإذن أو انتهت صلاحيته)
  for (const [i, r] of res.responses.entries()) {
    const code = r.error?.code || "";
    if (code.includes("registration-token-not-registered") || code.includes("invalid-argument")) {
      await remove("videos", `pushSubscriptions/${tokens[i]}`);
    }
  }
  console.log(`Push: ${anime.title} الحلقة ${episode} → ${res.successCount}/${tokens.length}`);
}
