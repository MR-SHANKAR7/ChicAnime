// إخفاء شاشة التحميل بعد تحميل الصفحة
window.addEventListener('load', function() {
  setTimeout(function() {
    document.getElementById('loadingScreen').style.opacity = '0';
    setTimeout(function() {
      document.getElementById('loadingScreen').style.display = 'none';
    }, 500);
  }, 1000);
});

// تبديل وضع الظلام/الفاتح
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

// التحقق من الوضع الحالي
if (localStorage.getItem('theme') === 'light-mode') {
  document.body.classList.add('light-mode');
  themeIcon.classList.remove('fa-moon');
  themeIcon.classList.add('fa-sun');
}

themeToggle.addEventListener('click', function() {
  document.body.classList.toggle('light-mode');
  
  if (document.body.classList.contains('light-mode')) {
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
    localStorage.setItem('theme', 'light-mode');
  } else {
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
    localStorage.setItem('theme', 'dark-mode');
  }
});

// التمرير إلى الأعلى
const scrollTopBtn = document.getElementById('scrollTopBtn');

window.addEventListener('scroll', function() {
  if (window.pageYOffset > 300) {
    scrollTopBtn.style.opacity = '1';
    scrollTopBtn.style.visibility = 'visible';
  } else {
    scrollTopBtn.style.opacity = '0';
    scrollTopBtn.style.visibility = 'hidden';
  }
});

scrollTopBtn.addEventListener('click', function() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});

// القائمة الجوال
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const nav = document.getElementById('nav');

mobileMenuBtn.addEventListener('click', function() {
  nav.classList.toggle('active');
});

// إغلاق القائمة عند النقر على رابط
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', function() {
    nav.classList.remove('active');
  });
});

// التمرير إلى المعرض
function scrollToGallery() {
  document.getElementById('gallery').scrollIntoView({
    behavior: 'smooth'
  });
}

// البحث
function searchCharacter() {
  const searchTerm = document.getElementById('search-bar').value.toLowerCase().trim();
  
  if (!searchTerm) {
    alert('يرجى إدخال مصطلح للبحث');
    return;
  }
  
  // حفظ مصطلح البحث في localStorage للاستخدام في الصفحات الأخرى
  localStorage.setItem('searchTerm', searchTerm);
  
  // توجيه المستخدم إلى صفحة نتائج البحث
  window.location.href = `search.html?q=${encodeURIComponent(searchTerm)}`;
}

// تفعيل الفلاتر
document.querySelectorAll('.category-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    // إزالة النشاط من جميع الأزرار
    document.querySelectorAll('.category-btn').forEach(b => {
      b.classList.remove('active');
    });
    
    // إضافة النشاط للزر الحالي
    this.classList.add('active');
    
    // تطبيق التصفية
    const filter = this.getAttribute('data-filter');
    filterGallery(filter);
  });
});

// تفعيل الفرز
document.getElementById('sort-by').addEventListener('change', function() {
  sortGallery(this.value);
});

// النشرة البريدية
document.querySelector('.newsletter-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = this.querySelector('input').value;
  
  // هنا يمكنك إضافة كود لإرسال البريد الإلكتروني
  alert(`شكراً لك على الاشتراك بالنشرة البريدية باستخدام: ${email}`);
  this.reset();
});