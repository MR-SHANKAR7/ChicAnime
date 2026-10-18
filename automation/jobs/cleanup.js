import { remove } from "../lib/db.js";

// حذف الأنميات والحلقات التي كُتبت بالخطأ في مشروع المعرض (الموقع يقرأها من مشروع الفيديو)
export async function runCleanup() {
  await remove("gallery", "anime");
  await remove("gallery", "episodes");
  console.log("تم حذف anime و episodes من مشروع المعرض");
}
