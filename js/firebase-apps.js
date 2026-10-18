// تهيئة مشروعَي Firebase اللذين يعتمد عليهما الموقع (تُستخدم في الصفحات الجديدة)
//  - videosDb : الأنميات والحلقات
//  - galleryDb: الشخصيات والخلفيات والأخبار
(function () {
  const videosApp = firebase.initializeApp({
    apiKey: "AIzaSyCyx5DUHCK7tzSrwIB_DF33xExfCh0EbCo",
    authDomain: "anime-studio-videos.firebaseapp.com",
    databaseURL: "https://anime-studio-videos-default-rtdb.firebaseio.com",
    projectId: "anime-studio-videos",
    appId: "1:593166797912:web:b5bcdab817f1baecb70e2d",
  }, "videos");

  const galleryApp = firebase.initializeApp({
    apiKey: "AIzaSyDPSXK02S0Em-0ZLl2zhH6M6loW3VYpReA",
    authDomain: "anime-gallery-b0a34.firebaseapp.com",
    databaseURL: "https://anime-gallery-b0a34-default-rtdb.firebaseio.com/",
    projectId: "anime-gallery-b0a34",
    appId: "1:39241660436:web:c35efd2748674b5a824f01",
  }, "gallery");

  window.videosDb = videosApp.database();
  window.galleryDb = galleryApp.database();

  // يحوّل لقطة Firebase إلى مصفوفة { id, ...data }
  window.snapToList = function (snap) {
    const list = [];
    snap.forEach((c) => { list.push({ id: c.key, ...c.val() }); });
    return list;
  };
})();
