// نظام المتابعة والإشعارات
//  - "تابع" أي أنمي: يُحفظ في المتصفح (localStorage) دون تسجيل دخول
//  - جرس في القائمة يعرض الحلقات الجديدة للأنميات المتابَعة منذ آخر زيارة
//  - إشعار متصفح محلي عند فتح الموقع، وإشعار Push حقيقي عبر FCM إن ضُبط مفتاح VAPID في firebase-apps.js
(function () {
  const DB = 'https://anime-studio-videos-default-rtdb.firebaseio.com';
  const KEY = 'chic_follows';      // { animeId: { title, thumbnail, seenAt } }
  const TOKEN_KEY = 'chic_push_token';

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = (f) => localStorage.setItem(KEY, JSON.stringify(f));
  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeHttpUrl = (value) => {
    try {
      const url = new URL(String(value || ''), window.location.href);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
    } catch { return ''; }
  };
  const api = {
    isFollowing: (id) => Boolean(load()[id]),
    list: () => load(),
    toggle(id, meta = {}) {
      const f = load();
      if (f[id]) delete f[id]; else f[id] = { title: meta.title || '', thumbnail: meta.thumbnail || '', seenAt: Date.now() };
      save(f);
      document.querySelectorAll('[data-follow]').forEach((btn) => { if (btn.dataset.follow === String(id)) paint(btn); });
      refresh();
      if (f[id]) requestPermission();
      syncPush();
      return Boolean(f[id]);
    },
    // زر متابعة جاهز للإدراج في أي بطاقة
    button: (id, meta = {}, cls = '') =>
      `<button type="button" class="follow-btn ${esc(cls)}" data-follow="${esc(id)}" data-title="${esc(meta.title)}" data-thumb="${esc(safeHttpUrl(meta.thumbnail))}" title="متابعة"><i class="fas fa-heart"></i><span></span></button>`,
    paintAll: () => document.querySelectorAll('[data-follow]').forEach((btn) => { bindButton(btn); paint(btn); }),
    refresh,
  };
  window.ChicFollow = api;

  function bindButton(btn) {
    if (btn.dataset.followBound === 'true') return;
    btn.dataset.followBound = 'true';
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      api.toggle(btn.dataset.follow, btn.dataset.title ? { title: btn.dataset.title, thumbnail: btn.dataset.thumb } : {});
    });
  }

  function paint(btn) {
    const on = api.isFollowing(btn.dataset.follow);
    btn.classList.toggle('active', on);
    const label = btn.querySelector('span');
    if (label) label.textContent = btn.classList.contains('with-text') ? (on ? ' متابَع' : ' تابع') : '';
  }

  // ===== الجرس =====
  const style = document.createElement('style');
  style.textContent = `
    .follow-btn { background: transparent; border: 1px solid var(--primary-color, #e53935); color: var(--primary-color, #e53935); border-radius: 20px; padding: 8px 12px; cursor: pointer; font-family: inherit; font-weight: 600; transition: all .3s; }
    .follow-btn.active, .follow-btn:hover { background: var(--primary-color, #e53935); color: #fff; }
    .follow-btn.card-follow { position: absolute; bottom: 10px; left: 10px; border-radius: 50%; width: 36px; height: 36px; padding: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.6); border-color: transparent; color: #fff; }
    .follow-btn.card-follow.active { background: var(--primary-color, #e53935); }
    .bell-wrap { position: relative; }
    .bell-btn { background: none; border: 0; color: inherit; cursor: pointer; font-size: 1.1rem; padding: 8px 12px; position: relative; font-family: inherit; }
    .bell-btn .badge { position: absolute; top: 0; right: 4px; background: var(--primary-color, #e53935); color: #fff; font-size: .7rem; min-width: 18px; height: 18px; border-radius: 9px; display: none; align-items: center; justify-content: center; padding: 0 4px; }
    .bell-btn .badge.show { display: flex; }
    .bell-panel { position: absolute; top: 110%; left: 0; width: 320px; max-width: 90vw; background: var(--card-bg, #2a2320); color: inherit; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.4); display: none; z-index: 1000; overflow: hidden; }
    .bell-panel.open { display: block; }
    .bell-head { display: flex; justify-content: space-between; align-items: center; padding: 12px 15px; border-bottom: 1px solid rgba(255,255,255,.08); font-weight: 700; }
    .bell-head button { background: none; border: 0; color: var(--primary-color, #e53935); cursor: pointer; font-family: inherit; font-size: .85rem; }
    .bell-list { max-height: 360px; overflow-y: auto; }
    .bell-item { display: flex; gap: 10px; padding: 10px 15px; text-decoration: none; color: inherit; border-bottom: 1px solid rgba(255,255,255,.05); align-items: center; }
    .bell-item:hover { background: rgba(255,255,255,.05); }
    .bell-item img { width: 42px; height: 56px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
    .bell-item .t { font-size: .9rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .bell-item .s { font-size: .8rem; opacity: .75; }
    .bell-item.new .s { color: var(--primary-color, #e53935); opacity: 1; font-weight: 600; }
    .bell-empty { padding: 25px; text-align: center; opacity: .7; font-size: .9rem; }
    @media (max-width: 1150px) { .nav-list { gap: 8px; } .nav-link { padding: 8px 9px; font-size: .95rem; } }
    @media (max-width: 768px) { .bell-panel { left: auto; right: 0; } }
  `;
  document.head.appendChild(style);

  function mountBell() {
    const nav = document.querySelector('.nav-list');
    if (!nav || document.querySelector('.bell-wrap')) return;
    const li = document.createElement('li');
    li.className = 'bell-wrap';
    li.innerHTML = `
      <button class="bell-btn" aria-label="الإشعارات"><i class="fas fa-bell"></i><span class="badge"></span></button>
      <div class="bell-panel">
        <div class="bell-head"><span><i class="fas fa-heart"></i> متابعاتي</span><button type="button" data-act="read">تعليم الكل كمقروء</button></div>
        <div class="bell-list"></div>
      </div>`;
    nav.appendChild(li);
    li.querySelector('.bell-btn').addEventListener('click', (e) => { e.stopPropagation(); li.querySelector('.bell-panel').classList.toggle('open'); });
    li.querySelector('[data-act="read"]').addEventListener('click', markAllRead);
    document.addEventListener('click', () => li.querySelector('.bell-panel').classList.remove('open'));
    li.querySelector('.bell-panel').addEventListener('click', (e) => e.stopPropagation());
  }

  let cache = {}; // animeId -> بيانات حية من القاعدة

  async function refresh() {
    mountBell();
    const follows = load();
    const ids = Object.keys(follows);
    const list = document.querySelector('.bell-list');
    const badge = document.querySelector('.bell-btn .badge');
    if (!list) return;
    if (!ids.length) { list.innerHTML = '<div class="bell-empty">لم تتابع أي أنمي بعد.<br>اضغط ♥ على أي أنمي لتصلك حلقاته الجديدة.</div>'; badge.classList.remove('show'); return; }

    await Promise.all(ids.map(async (id) => {
      if (cache[id]) return;
      try { cache[id] = await (await fetch(`${DB}/anime/${id}.json`)).json(); } catch { cache[id] = null; }
    }));

    let unread = 0;
    const items = ids.map((id) => {
      const a = cache[id] || {};
      const f = follows[id];
      const rel = a.lastReleased;
      const isNew = rel && rel.at > (f.seenAt || 0);
      if (isNew) unread++;
      let status = '';
      if (isNew) status = `صدرت الحلقة ${rel.episode}`;
      else if (a.nextAiring && a.nextAiring.airingAt > Date.now()) status = `الحلقة ${a.nextAiring.episode} ${countdown(a.nextAiring.airingAt)}`;
      else if (a.status === 'completed') status = 'مكتمل';
      else status = 'لا جديد';
      return { id, a, f, isNew, status, at: isNew ? rel.at : (a.nextAiring ? -a.nextAiring.airingAt : -Infinity) };
    }).sort((x, y) => (y.isNew - x.isNew) || (y.at - x.at));

    list.innerHTML = items.map(({ id, a, f, isNew, status }) => `
      <a class="bell-item ${isNew ? 'new' : ''}" href="anime.html?id=${encodeURIComponent(id)}">
        <img src="${esc(safeHttpUrl(a.thumbnail || f.thumbnail))}" alt="">
        <div><div class="t">${esc(a.title_ar || a.title || f.title)}</div><div class="s">${esc(status)}</div></div>
      </a>`).join('');
    badge.textContent = unread;
    badge.classList.toggle('show', unread > 0);

    notifyLocally(items.filter((i) => i.isNew));
  }

  function markAllRead() {
    const f = load();
    Object.keys(f).forEach((id) => { f[id].seenAt = Date.now(); });
    save(f); refresh();
  }

  function countdown(at) {
    const diff = at - Date.now();
    if (diff <= 0) return 'الآن';
    const d = Math.floor(diff / 86400000), h = Math.floor(diff % 86400000 / 3600000);
    return d > 0 ? `بعد ${d} يوم` : `بعد ${h} ساعة`;
  }

  // ===== إشعار محلي عند فتح الموقع =====
  function requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  }
  function notifyLocally(newItems) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !newItems.length) return;
    const notified = JSON.parse(sessionStorage.getItem('chic_notified') || '[]');
    newItems.filter((i) => !notified.includes(i.id)).slice(0, 3).forEach((i) => {
      new Notification(i.a.title_ar || i.a.title, { body: i.status, icon: i.a.thumbnail, tag: `chic-${i.id}` })
        .onclick = () => { location.href = `anime.html?id=${encodeURIComponent(i.id)}`; };
      notified.push(i.id);
    });
    sessionStorage.setItem('chic_notified', JSON.stringify(notified));
  }

  // ===== Push حقيقي عبر Firebase Cloud Messaging (يعمل فقط إذا ضُبط window.CHIC_VAPID_KEY) =====
  async function syncPush() {
    if (!window.CHIC_VAPID_KEY || !('serviceWorker' in navigator) || !window.CHIC_FIREBASE_VIDEOS) return;
    try {
      if (Notification.permission !== 'granted') return;
      await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
      await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');
      const app = firebase.apps.find((a) => a.name === 'push') || firebase.initializeApp(window.CHIC_FIREBASE_VIDEOS, 'push');
      const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js');
      const token = await app.messaging().getToken({ vapidKey: window.CHIC_VAPID_KEY, serviceWorkerRegistration: reg });
      if (!token) return;
      const anime = {};
      Object.keys(load()).forEach((id) => { anime[id] = true; });
      await fetch(`${DB}/pushSubscriptions/${token}.json`, {
        method: Object.keys(anime).length ? 'PUT' : 'DELETE',
        body: Object.keys(anime).length ? JSON.stringify({ anime, updatedAt: Date.now() }) : undefined,
      });
      localStorage.setItem(TOKEN_KEY, token);
    } catch (err) { console.warn('Push غير متاح:', err.message); }
  }
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }

  document.addEventListener('DOMContentLoaded', () => { refresh(); api.paintAll(); syncPush(); });
})();
