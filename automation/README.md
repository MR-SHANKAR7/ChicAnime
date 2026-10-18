# التحديث التلقائي لمحتوى ChicAnime

سكربت يعمل عبر GitHub Actions كل 6 ساعات ويكتب في قواعد Firebase نفسها التي يقرأ منها الموقع.
الموقع يستخدم مشروعَي Firebase، لذا يحتاج السكربت إلى مفتاحين:

| المشروع | العقد | السرّ في GitHub | المحتوى المضاف |
|---|---|---|---|
| `anime-gallery-b0a34` | `news`, `images` | `FIREBASE_SERVICE_ACCOUNT` | أخبار مترجمة للعربية (ANN)، شخصيات وخلفيات (AniList) |
| `anime-studio-videos` | `anime`, `episodes` | `FIREBASE_SERVICE_ACCOUNT_VIDEOS` | الأنميات المعروضة حاليًا وحلقاتها مع رابط المشاهدة الرسمي |

كل عنصر يحمل حقل `sourceId` لمنع التكرار. الأنمي المضاف يدويًا بنفس الاسم يُربط بدل تكراره.

## الإعداد (مرة واحدة)

لكل مشروع من المشروعين: Firebase Console → Project settings → Service accounts → Generate new private key،
ثم أضف محتوى ملف JSON كسرّ في GitHub (Settings → Secrets and variables → Actions) بالاسم المذكور في الجدول.

## التشغيل محليًا

```bash
cd automation && npm install
DRY_RUN=1 npm run update                 # تجربة دون كتابة
JOBS=news,wallpapers npm run update      # مهام محددة (تحتاج ملفات service-account*.json)
```

متغيرات اختيارية: `JOBS`، `NEWS_PER_RUN`، `CHARACTERS_PER_RUN`، `WALLPAPERS_PER_RUN`، `ANIME_COUNT`.
