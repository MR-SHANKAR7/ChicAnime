# التحديث التلقائي لمحتوى ChicAnime

سكربت يعمل عبر GitHub Actions كل 6 ساعات ويضيف إلى قاعدة بيانات Firebase نفسها التي يقرأ منها الموقع:

| العقدة | المصدر | ما يُضاف |
|---|---|---|
| `news` | Anime News Network (RSS) | آخر الأخبار مترجمة إلى العربية مع صورة الخبر |
| `images` | AniList | أشهر شخصيات الأنمي: الصورة، الاسم، تاريخ الميلاد، نبذة بالعربية |
| `anime` + `episodes` | AniList | الأنميات المعروضة حاليًا وحلقاتها مع رابط المشاهدة الرسمي |

لا يُعدَّل أي ملف من ملفات الموقع. كل عنصر يحمل حقل `sourceId` لمنع التكرار بين التشغيلات.

## الإعداد (مرة واحدة)

1. من Firebase Console: **Project settings → Service accounts → Generate new private key** ونزّل ملف JSON.
2. في مستودع GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - الاسم: `FIREBASE_SERVICE_ACCOUNT`
   - القيمة: محتوى ملف JSON كاملًا.
3. من تبويب **Actions** شغّل "تحديث المحتوى تلقائيًا" يدويًا للمرة الأولى (Run workflow).

## التشغيل محليًا

```bash
cd automation
npm install
DRY_RUN=1 npm run update          # تجربة دون كتابة في Firebase
# أو ضع service-account.json هنا ثم:
npm run update
```

متغيرات اختيارية: `JOBS=news,characters,episodes`، `NEWS_PER_RUN`، `CHARACTERS_PER_RUN`، `ANIME_COUNT`.
