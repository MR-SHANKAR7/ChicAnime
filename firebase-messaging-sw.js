// Service Worker لاستقبال إشعارات Push عندما يكون الموقع مغلقًا (يعمل بعد ضبط مفتاح VAPID)
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCyx5DUHCK7tzSrwIB_DF33xExfCh0EbCo",
  authDomain: "anime-studio-videos.firebaseapp.com",
  projectId: "anime-studio-videos",
  messagingSenderId: "593166797912",
  appId: "1:593166797912:web:b5bcdab817f1baecb70e2d",
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(({ notification, data }) => {
  self.registration.showNotification(notification.title, {
    body: notification.body,
    icon: notification.image || 'images/ChicAnime.png',
    data: { url: data && data.url },
  });
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.notification.data && e.notification.data.url) e.waitUntil(clients.openWindow(e.notification.data.url));
});
