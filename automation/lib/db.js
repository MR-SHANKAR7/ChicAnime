import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const DATABASE_URL = "https://anime-gallery-b0a34-default-rtdb.firebaseio.com/";
const DRY_RUN = process.env.DRY_RUN === "1";

let db = null;
if (!DRY_RUN) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || readFileSync("service-account.json", "utf8");
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(raw)),
    databaseURL: DATABASE_URL,
  });
  db = admin.database();
}

// يعيد كل العناصر في عقدة ما كمصفوفة { id, ...data }
export async function readAll(node) {
  if (DRY_RUN) return [];
  const snap = await db.ref(node).once("value");
  const items = [];
  snap.forEach((child) => { items.push({ id: child.key, ...child.val() }); });
  return items;
}

// يضيف عنصرًا جديدًا ويعيد المفتاح الذي أنشأه Firebase
export async function push(node, data) {
  if (DRY_RUN) {
    console.log(`[dry-run] push ${node}:`, JSON.stringify(data).slice(0, 160));
    return `dry-${Math.random().toString(36).slice(2, 10)}`;
  }
  const ref = await db.ref(node).push(data);
  return ref.key;
}

export async function update(node, data) {
  if (DRY_RUN) return console.log(`[dry-run] update ${node}:`, JSON.stringify(data).slice(0, 160));
  await db.ref(node).update(data);
}

export function close() {
  if (db) admin.app().delete();
}
