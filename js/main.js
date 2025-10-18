import { db } from './firebase.js';
import { doc, getDoc, collection, query, orderBy, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { driveUrlToDirect, formatDateISO } from './utils.js';

// Mobile nav
const navToggle = document.getElementById('navToggle');
const mobileMenu = document.getElementById('mobileMenu');
navToggle?.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  mobileMenu.hidden = expanded;
  mobileMenu.style.display = expanded ? 'none' : 'flex';
});

// Counters demo
const animateCount = (el, to, duration=1200) => {
  const start = 0;
  const startTime = performance.now();
  const tick = now => {
    const p = Math.min((now - startTime) / duration, 1);
    const val = Math.floor(start + (to - start) * p);
    el.textContent = val.toLocaleString('id-ID');
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
window.addEventListener('load', () => {
  animateCount(document.getElementById('statKegiatan'), 24);
  animateCount(document.getElementById('statRelawan'), 85);
  animateCount(document.getElementById('statRtRw'), 11);
  document.getElementById('year').textContent = new Date().getFullYear();
});

// ===== HERO VIDEO (TikTok) =====
(async function loadHeroVideo(){
  try{
    const snap = await getDoc(doc(db, 'settings', 'heroVideo'));
    const url = snap.exists() ? (snap.data().videoUrl || '') : '';
    const iframe = document.getElementById('heroIframe');
    if(url){
      // Accept either full tiktok URL or /embed/ form
      const embed = url.includes('/embed/') ? url : url.replace('/video/', '/embed/');
      iframe.src = embed;
    }else{
      // fallback: TikTok dummy embed (still no image preview)
      iframe.src = 'https://www.tiktok.com/embed/7286012345678901234';
    }
  }catch(e){
    console.warn('Gagal memuat hero video:', e);
    const iframe = document.getElementById('heroIframe');
    iframe.src = 'https://www.tiktok.com/embed/7286012345678901234';
  }
})();

// ===== PROGRAM =====
const programGrid = document.getElementById('programGrid');
(function loadPrograms(){
  const qy = query(collection(db,'program'), orderBy('urutan','asc'));
  onSnapshot(qy, snap => {
    programGrid.innerHTML = '';
    snap.forEach(d => {
      const p = d.data();
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `<h3>${p.judul||'-'}</h3><p class="muted">${p.deskripsi||''}</p>`;
      programGrid.appendChild(card);
    });
  });
})();

// ===== BERITA =====
const newsList = document.getElementById('newsList');
const loadMoreBtn = document.getElementById('loadMore');
let allNews=[]; let renderIndex=0; const pageSize=6;
function renderNews(){
  const slice = allNews.slice(renderIndex, renderIndex+pageSize);
  slice.forEach(n => {
    const card = document.createElement('article');
    card.className='card';
    const docLink = n.linkDokumen ? `<a class="btn outline" href="${n.linkDokumen}" target="_blank" rel="noopener">Dokumen</a>` : '';
    card.innerHTML = `
      <h3>${n.judul||'-'}</h3>
      <p class="muted">${formatDateISO(n.tanggal?.toDate ? n.tanggal.toDate() : n.tanggal)}</p>
      <p>${n.ringkasan||''}</p>
      <div class="socials">${docLink}</div>`;
    newsList.appendChild(card);
  });
  renderIndex += slice.length;
  if(renderIndex>=allNews.length) loadMoreBtn.style.display='none';
}
(function loadNews(){
  const qy = query(collection(db,'berita'), orderBy('tanggal','desc'));
  onSnapshot(qy, snap => {
    allNews = snap.docs.map(d=>({id:d.id, ...d.data()}));
    newsList.innerHTML=''; renderIndex=0;
    if(allNews.length===0){ newsList.innerHTML='<p class="muted">Belum ada berita.</p>'; loadMoreBtn.style.display='none'; }
    else { loadMoreBtn.style.display='inline-block'; renderNews(); }
  });
})();
loadMoreBtn.addEventListener('click', renderNews);

// ===== GALERI =====
const gallery = document.getElementById('gallery');
const lightbox = document.getElementById('lightbox');
const lightImg = document.getElementById('lightbox-img');
const lightCap = document.getElementById('lightbox-caption');
const btnClose = document.querySelector('.lightbox-close');
(function loadGallery(){
  const qy = query(collection(db,'galeri'), orderBy('createdAt','desc'));
  onSnapshot(qy, snap => {
    gallery.innerHTML='';
    snap.forEach(d => {
      const g = d.data();
      const url = driveUrlToDirect(g.gambar||'');
      const img = document.createElement('img');
      img.className='tile'; img.src=url; img.alt=g.caption||'Galeri'; img.loading='lazy';
      gallery.appendChild(img);
    });
  });
})();
gallery.addEventListener('click', (e)=>{
  const t = e.target; if(t.tagName==='IMG'){ lightImg.src=t.src; lightCap.textContent=t.alt; lightbox.hidden=false; }
});
btnClose.addEventListener('click', ()=> lightbox.hidden=true);
lightbox.addEventListener('click', (e)=>{ if(e.target===lightbox) lightbox.hidden=true; });
