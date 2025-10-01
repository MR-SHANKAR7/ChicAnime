
// دالة لجلب البيانات من Firebase
function fetchImagesFromFirebase() {
  const database = firebase.database();
  const galleryGrid = document.getElementById('galleryGrid');
  
  galleryGrid.innerHTML = '<div class="loading">جاري تحميل الصور...</div>';
  
  database.ref('images').once('value')
    .then((snapshot) => {
      const data = [];
      snapshot.forEach((childSnapshot) => {
        data.push({ id: childSnapshot.key, ...childSnapshot.val() });
      });
      
      window.imagesData = data;
      
      if (galleryGrid) {
        renderGallery(data, galleryGrid);
      }
    })
    .catch((error) => {
      console.error('حدث خطأ في تحميل الصور:', error);
      if (galleryGrid) {
        galleryGrid.innerHTML = '<p class="error-message">حدث خطأ في تحميل الصور. يرجى المحاولة لاحقًا.</p>';
      }
    });
}

// دالة لعرض المعرض
function renderGallery(data, galleryElement) {
  galleryElement.innerHTML = '';
  
  if (!data || data.length === 0) {
    galleryElement.innerHTML = '<p class="no-results">لم يتم العثور على صور</p>';
    return;
  }
  
  data.forEach((image, index) => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.setAttribute('data-type', image.type || 'character');
    card.setAttribute('data-date', image.uploadedAt || '');
    
    // استخدام الحقل الصحيح للصورة
    const imageUrl = image.image || image.url || image.secure_url;
    
    card.innerHTML = `
      <div class="card-img">
        <img src="${imageUrl}" alt="${image.title || 'صورة أنمي'}" loading="lazy">
      </div>
      <div class="card-content">
        <h3>${image.title || 'بدون عنوان'}</h3>
        <p>${image.anime || 'غير معروف'}</p>
        <div class="card-actions">
          <button class="btn-view" onclick="viewDetails('${image.id || index}')">عرض التفاصيل</button>
          <button class="btn-download" onclick="viewDetails('${image.id || index}')"> 
            <i class="fas fa-download"></i>
          </button>
        </div>
      </div>
    `;
    
    galleryElement.appendChild(card);
  });
  
  // تفعيل التحميل الكسول للصور
  if ('IntersectionObserver' in window) {
    lazyLoadImages();
  }
}

// دالة لعرض التفاصيل
function viewDetails(id) {
  const image = window.imagesData.find(img => img.id == id) || window.imagesData[id];
  if (image) {
    // حفظ البيانات مؤقتاً للوصول إليها في صفحة التفاصيل
    sessionStorage.setItem('currentImage', JSON.stringify(image));
    window.location.href = `details.html?id=${image.id || id}`;
  }
}

// دالة لتحميل الصورة
function downloadImage(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_')}.jpg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// دالة للتصفية
function filterGallery(type) {
  const cards = document.querySelectorAll('.card');
  
  cards.forEach(card => {
    if (type === 'all') {
      card.style.display = 'block';
    } else {
      const cardType = card.getAttribute('data-type');
      if (cardType === type) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    }
  });
}

// دالة للفرز
function sortGallery(method) {
  if (!window.imagesData) return;
  
  let sortedData = [...window.imagesData];
  
  switch(method) {
    case 'newest':
      sortedData.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      break;
    case 'oldest':
      sortedData.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
      break;
    case 'az':
      sortedData.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    case 'za':
      sortedData.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      break;
  }
  
  renderGallery(sortedData, document.getElementById('galleryGrid'));
}

// التحميل الكسول للصور
function lazyLoadImages() {
  const lazyImages = document.querySelectorAll('.card-img img');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src || img.src;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });
  
  lazyImages.forEach(img => {
    if (img.complete) return;
    imageObserver.observe(img);
  });
}

// تحميل المزيد من الصور
document.getElementById('loadMoreBtn')?.addEventListener('click', function() {
  // في الواقع، يجب جلب المزيد من البيانات من Firebase
  // لكن لأغراض العرض، سنقوم بمحاكاة التحميل
  this.textContent = 'جاري التحميل...';
  this.disabled = true;
  
  setTimeout(() => {
    // محاكاة جلب المزيد من البيانات
    this.textContent = 'تحميل المزيد';
    this.disabled = false;
    
    // إظهار رسالة أنه تم تحميل جميع المحتويات (في حالة واقعية، سيكون هناك تحقق من وجود المزيد من البيانات)
    alert('تم تحميل جميع المحتويات المتاحة');
  }, 1500);
});

// تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', function() {
  fetchImagesFromFirebase();
});