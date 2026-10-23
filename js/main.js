// تهيئة آمنة لعناصر الواجهة المشتركة
// تُحمى جميع العناصر الاختيارية حتى لا تتوقف بقية الصفحة عند غياب عنصر في صفحة أخرى.

window.addEventListener('load', function () {
  const loadingScreen = document.getElementById('loadingScreen');
  if (!loadingScreen) return;

  window.setTimeout(function () {
    loadingScreen.style.opacity = '0';
    window.setTimeout(function () {
      loadingScreen.style.display = 'none';
    }, 500);
  }, 1000);
});

// تبديل الوضع الداكن/الفاتح
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle ? themeToggle.querySelector('i') : null;

function updateThemeIcon(isLight) {
  if (!themeIcon) return;
  themeIcon.classList.toggle('fa-sun', isLight);
  themeIcon.classList.toggle('fa-moon', !isLight);
}

function readStoredTheme() {
  try {
    return window.localStorage.getItem('theme');
  } catch (error) {
    console.warn('تعذر قراءة إعداد المظهر من التخزين المحلي:', error);
    return null;
  }
}

function storeTheme(theme) {
  try {
    window.localStorage.setItem('theme', theme);
  } catch (error) {
    // يعمل تبديل المظهر حتى إذا منع المتصفح التخزين المحلي.
    console.warn('تعذر حفظ إعداد المظهر:', error);
  }
}

if (readStoredTheme() === 'light-mode') {
  document.body.classList.add('light-mode');
  updateThemeIcon(true);
}

if (themeToggle) {
  themeToggle.addEventListener('click', function () {
    const isLight = document.body.classList.toggle('light-mode');
    updateThemeIcon(isLight);
    storeTheme(isLight ? 'light-mode' : 'dark-mode');
  });
}

// زر العودة إلى الأعلى
const scrollTopBtn = document.getElementById('scrollTopBtn');

if (scrollTopBtn) {
  const updateScrollTopVisibility = function () {
    const isVisible = window.pageYOffset > 300;
    scrollTopBtn.style.opacity = isVisible ? '1' : '0';
    scrollTopBtn.style.visibility = isVisible ? 'visible' : 'hidden';
  };

  window.addEventListener('scroll', updateScrollTopVisibility, { passive: true });
  updateScrollTopVisibility();

  scrollTopBtn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// قائمة الجوال: دعم لوحة المفاتيح وإغلاق القائمة بعد الاختيار أو خارجها.
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const nav = document.getElementById('nav');

if (mobileMenuBtn && nav) {
  const setMenuOpen = function (isOpen) {
    nav.classList.toggle('active', isOpen);
    mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
    mobileMenuBtn.setAttribute('aria-label', isOpen ? 'إغلاق القائمة' : 'فتح القائمة');
    if (isOpen) nav.removeAttribute('inert');
    else nav.setAttribute('inert', '');
  };

  setMenuOpen(false);
  mobileMenuBtn.addEventListener('click', function () {
    setMenuOpen(!nav.classList.contains('active'));
  });

  nav.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () { setMenuOpen(false); });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && nav.classList.contains('active')) {
      setMenuOpen(false);
      mobileMenuBtn.focus();
    }
  });

  document.addEventListener('click', function (event) {
    if (nav.classList.contains('active') &&
        !nav.contains(event.target) &&
        !mobileMenuBtn.contains(event.target)) setMenuOpen(false);
  });

  const desktopQuery = window.matchMedia('(min-width: 769px)');
  const resetMenuOnResize = function (event) {
    if (event.matches) setMenuOpen(false);
  };
  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', resetMenuOnResize);
  else if (desktopQuery.addListener) desktopQuery.addListener(resetMenuOnResize);
}

// التمرير إلى المعرض
function scrollToGallery() {
  const gallery = document.getElementById('gallery');
  if (gallery) {
    gallery.scrollIntoView({ behavior: 'smooth' });
  }
}

// البحث في صفحة الأنمي الرئيسية
function searchCharacter() {
  const searchInput = document.getElementById('search-bar');
  const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';

  if (!searchTerm) {
    window.alert('يرجى إدخال مصطلح للبحث');
    if (searchInput) searchInput.focus();
    return;
  }

  try {
    window.localStorage.setItem('searchTerm', searchTerm);
  } catch (error) {
    // يعتمد البحث على معامل URL، لذلك لا يتوقف إذا تعذر التخزين المحلي.
    console.warn('تعذر حفظ مصطلح البحث محليًا:', error);
  }

  window.location.href = `index.html?search=${encodeURIComponent(searchTerm)}`;
}

// تفعيل فلاتر المعرض عند توفرها
document.querySelectorAll('.category-btn').forEach(function (button) {
  button.addEventListener('click', function () {
    document.querySelectorAll('.category-btn').forEach(function (item) {
      item.classList.remove('active');
    });
    button.classList.add('active');

    if (typeof window.filterGallery === 'function') {
      window.filterGallery(button.getAttribute('data-filter'));
    }
  });
});

// تفعيل الفرز عند وجود عنصر الفرز والدالة المطلوبة
const sortByEl = document.getElementById('sort-by');
if (sortByEl) {
  sortByEl.addEventListener('change', function () {
    if (typeof window.sortGallery === 'function') {
      window.sortGallery(this.value);
    }
  });
}

// نموذج النشرة البريدية: لا ندّعي الاشتراك لأن خدمة الإرسال غير مهيأة بعد.
const newsletterForm = document.querySelector('.newsletter-form');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', function (event) {
    event.preventDefault();
    window.alert('ميزة الاشتراك بالبريد الإلكتروني غير مفعّلة حاليًا؛ لم يتم إرسال أي بريد.');
  });
}
