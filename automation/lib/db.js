import { readFileSync, existsSync } from "node:fs";
import admin from "firebase-admin";

// الموقع يستخدم مشروعَي Firebase:
//  - gallery: الأخبار والشخصيات والخلفيات (images, news)
//  - videos : الأنميات والحلقات (anime, episodes)
const DATABASES = {
  gallery: {
    url: "https://anime-gallery-b0a34-default-rtdb.firebaseio.com/",
    env: "FIREBASE_SERVICE_ACCOUNT",
    file: "service-account.json",
  },
  videos: {
    url: "https://anime-studio-videos-default-rtdb.firebaseio.com/",
    env: "FIREBASE_SERVICE_ACCOUNT_VIDEOS",
    file: "service-account-videos.json",
  },
};

const DRY_RUN = process.env.DRY_RUN === "1";
const apps = {};

function db(name) {
  if (apps[name]) return apps[name].database();
  const cfg = DATABASES[name];
  const raw = process.env[cfg.env] || (existsSync(cfg.file) ? readFileSync(cfg.file, "utf8") : null);
  if (!raw) throw new Error(`مفتاح الخدمة ${cfg.env} غير موجود`);
  apps[name] = admin.initializeApp(
    { credential: admin.credential.cert(JSON.parse(raw)), databaseURL: cfg.url },
    name,
  );
  return apps[name].database();
}

// يعيد كل العناصر في عقدة ما كمصفوفة { id, ...data }
export async function readAll(dbName, node) {
  if (DRY_RUN) return [];
  const snap = await db(dbName).ref(node).once("value");
  const items = [];
  snap.forEach((child) => { items.push({ ...child.val(), id: child.key }); });
  return items;
}

// يضيف عنصرًا جديدًا ويعيد المفتاح الذي أنشأه Firebase
export async function push(dbName, node, data) {
  if (DRY_RUN) {
    console.log(`[dry-run] push ${dbName}/${node}:`, JSON.stringify(data).slice(0, 160));
    return `dry-${Math.random().toString(36).slice(2, 10)}`;
  }
  const ref = await db(dbName).ref(node).push(data);
  return ref.key;
}

export async function update(dbName, node, data) {
  if (DRY_RUN) return console.log(`[dry-run] update ${dbName}/${node}:`, JSON.stringify(data).slice(0, 160));
  await db(dbName).ref(node).update(data);
}

export async function remove(dbName, node) {
  if (DRY_RUN) return console.log(`[dry-run] remove ${dbName}/${node}`);
  await db(dbName).ref(node).remove();
}

export async function close() {
  await Promise.all(Object.values(apps).map((a) => a.delete()));
}
