import { auth, db, functions } from './firebase.js';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  collection, addDoc, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, where, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { driveUrlToDirect, formatDateISO } from './utils.js';


import { httpsCallable } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js';
const createUserFn = httpsCallable(functions, 'createUserWithRole');

const el = (q)=>document.querySelector(q);
const show = (q)=> el(q).style.display='block';
const hide = (q)=> el(q).style.display='none';

const authed = el('#authed'); const notAuthed = el('#notAuthed');
const roleBadge = el('#roleBadge'); const emailBadge = el('#emailBadge');

setPersistence(auth, browserLocalPersistence);
onAuthStateChanged(auth, async (user)=>{
  if(user){
    const userDoc = await getDoc(doc(db,'users',user.uid));
    const role = userDoc.exists()? (userDoc.data().role || 'viewer') : 'viewer';
    emailBadge.textContent = user.email||'(tanpa email)'; roleBadge.textContent = role;
    hide('#notAuthed'); show('#authed'); setupRoleUI(role); await renderAll();
    await loadHeroVideoSetting(role);
  }else{ show('#notAuthed'); hide('#authed'); }
});
el('#loginForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  try{
    if(isCreate){
      // create via Cloud Function (keeps admin logged in)
      await createUserFn({ email: v.email, password: v.password, name: v.name || '', role: v.role || 'viewer' });
    } else { await signInWithEmailAndPassword(auth, e.target.email.value.trim(), e.target.password.value); }
  catch(err){ alert('Login gagal: '+err.message); }
});
el('#btnLogout')?.addEventListener('click', ()=> signOut(auth));

function setupRoleUI(role){
  document.querySelectorAll('[data-roles]').forEach(sec=>{
    const allowed = sec.getAttribute('data-roles').split(',').map(s=>s.trim());
    sec.style.display = allowed.includes(role) || role==='super_admin' ? 'block' : 'none';
  });
}

// helpers
const getValues = (form)=> Object.fromEntries(new FormData(form).entries());

// ===== LOGGING =====
async function logAction(action, target){
  try{
    const u = auth.currentUser;
    await addDoc(collection(db,'logs'), {
      user: u?.email || '(anon)',
      userUid: u?.uid || '',
      action, target,
      timestamp: serverTimestamp()
    });
  }catch(e){ console.warn('Gagal tulis log:', e); }
}

const clear = (form)=> form.reset();

// SETTINGS: HERO VIDEO
async function loadHeroVideoSetting(role){
  const input = el('#heroVideoUrl');
  const btnSave = el('#btnSaveHeroVideo');
  if(!input || !btnSave) return;
  try{
    if(isCreate){
      // create via Cloud Function (keeps admin logged in)
      await createUserFn({ email: v.email, password: v.password, name: v.name || '', role: v.role || 'viewer' });
    } else {
    const snap = await getDoc(doc(db,'settings','heroVideo'));
    if(snap.exists()){ input.value = snap.data().videoUrl || ''; }
  }catch(e){ console.warn('Gagal membaca settings:', e); }
  btnSave.addEventListener('click', async ()=>{
    if(!(role==='super_admin' || role==='admin_berita')){ return alert('Tidak punya akses.'); }
    const raw = input.value.trim();
    const url = raw.includes('/embed/') ? raw : raw.replace('/video/', '/embed/');
    try{
    if(isCreate){
      // create via Cloud Function (keeps admin logged in)
      await createUserFn({ email: v.email, password: v.password, name: v.name || '', role: v.role || 'viewer' });
    } else {
      await setDoc(doc(db,'settings','heroVideo'), { videoUrl: url, updatedAt: serverTimestamp() }, { merge: true });
      alert('URL Video TikTok hero berhasil disimpan.');
      await logAction('updateHeroVideo', url);
    }catch(e){ alert('Gagal menyimpan: '+e.message); }
  });
}

// ===== BERITA =====
const beritaForm = el('#formBerita'); const beritaTable = el('#tableBerita tbody');
beritaForm?.addEventListener('submit', async (e)=>{
  e.preventDefault(); const v = getValues(beritaForm);
  try{
    if(isCreate){
      // create via Cloud Function (keeps admin logged in)
      await createUserFn({ email: v.email, password: v.password, name: v.name || '', role: v.role || 'viewer' });
    } else {
    await addDoc(collection(db,'berita'),{
      judul:v.judul, ringkasan:v.ringkasan, linkDokumen:v.linkDokumen||'',
      tanggal: v.tanggal? new Date(v.tanggal) : new Date(), createdAt: serverTimestamp()
    }); clear(beritaForm); await renderBerita();
    await logAction('addNews', v.judul||'(tanpa judul)');
  }catch(err){ alert('Gagal menyimpan berita: '+err.message); }
});
async function renderBerita(){
  const snap = await getDocs(query(collection(db,'berita'), orderBy('tanggal','desc')));
  beritaTable.innerHTML='';
  snap.forEach(d=>{
    const b=d.data(); const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${b.judul||'-'}</td>
      <td>${formatDateISO(b.tanggal?.toDate? b.tanggal.toDate(): b.tanggal)}</td>
      <td>${b.ringkasan||''}</td>
      <td>${b.linkDokumen? `<a href="${b.linkDokumen}" target="_blank">Buka</a>` : '-'}</td>
      <td><button data-id="${d.id}" class="btn small btn-del-berita">Hapus</button></td>`;
    beritaTable.appendChild(tr);
  });
  beritaTable.querySelectorAll('.btn-del-berita').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(confirm('Hapus berita ini?')){ await deleteDoc(doc(db,'berita',btn.getAttribute('data-id'))); await renderBerita(); await logAction('deleteNews', btn.getAttribute('data-id'));
    await logAction('addNews', v.judul||'(tanpa judul)'); }
    });
  });
}

// ===== PROGRAM =====
const programForm = el('#formProgram'); const programTable = el('#tableProgram tbody');
programForm?.addEventListener('submit', async (e)=>{
  e.preventDefault(); const v = getValues(programForm);
  try{
    if(isCreate){
      // create via Cloud Function (keeps admin logged in)
      await createUserFn({ email: v.email, password: v.password, name: v.name || '', role: v.role || 'viewer' });
    } else {
    await addDoc(collection(db,'program'),{ urutan:Number(v.urutan||0), judul:v.judul, deskripsi:v.deskripsi||'', createdAt:serverTimestamp() });
    clear(programForm); await renderProgram();
    await logAction('addProgram', v.judul||'(tanpa judul)');
  }catch(err){ alert('Gagal: '+err.message); }
});
async function renderProgram(){
  const snap = await getDocs(query(collection(db,'program'), orderBy('urutan','asc')));
  programTable.innerHTML='';
  snap.forEach(d=>{
    const p=d.data(); const tr=document.createElement('tr');
    tr.innerHTML=`<td>${p.urutan??0}</td><td>${p.judul||'-'}</td><td>${p.deskripsi||''}</td>
    <td><button data-id="${d.id}" class="btn small btn-del-program">Hapus</button></td>`;
    programTable.appendChild(tr);
  });
  programTable.querySelectorAll('.btn-del-program').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(confirm('Hapus program ini?')){ await deleteDoc(doc(db,'program',btn.getAttribute('data-id'))); await renderProgram(); await logAction('deleteProgram', btn.getAttribute('data-id'));
    await logAction('addProgram', v.judul||'(tanpa judul)'); }
    });
  });
}

// ===== STRUKTUR =====
const strukturForm = el('#formStruktur'); const strukturTable = el('#tableStruktur tbody');
strukturForm?.addEventListener('submit', async (e)=>{
  e.preventDefault(); const v = getValues(strukturForm);
  try{
    if(isCreate){
      // create via Cloud Function (keeps admin logged in)
      await createUserFn({ email: v.email, password: v.password, name: v.name || '', role: v.role || 'viewer' });
    } else {
    await addDoc(collection(db,'struktur'),{ urutan:Number(v.urutan||0), jabatan:v.jabatan, nama:v.nama, foto:v.foto||'', createdAt:serverTimestamp() });
    clear(strukturForm); await renderStruktur();
    await logAction('addStruktur', v.nama||'(tanpa nama)');
  }catch(err){ alert('Gagal: '+err.message); }
});
async function renderStruktur(){
  const snap = await getDocs(query(collection(db,'struktur'), orderBy('urutan','asc')));
  strukturTable.innerHTML='';
  snap.forEach(d=>{
    const s=d.data(); const tr=document.createElement('tr');
    tr.innerHTML=`<td>${s.urutan??0}</td><td>${s.jabatan||'-'}</td><td>${s.nama||'-'}</td>
    <td>${s.foto? `<a href="${driveUrlToDirect(s.foto)}" target="_blank">Lihat Foto</a>`:'-'}</td>
    <td><button data-id="${d.id}" class="btn small btn-del-struktur">Hapus</button></td>`;
    strukturTable.appendChild(tr);
  });
  strukturTable.querySelectorAll('.btn-del-struktur').forEach	btn=>{
    btn.addEventListener('click', async ()=>{
      if(confirm('Hapus data ini?')){ await deleteDoc(doc(db,'struktur',btn.getAttribute('data-id'))); await renderStruktur(); await logAction('deleteStruktur', btn.getAttribute('data-id'));
    await logAction('addStruktur', v.nama||'(tanpa nama)'); }
    });
  });
}

// ===== GALERI =====
const galeriForm = el('#formGaleri'); const galeriTable = el('#tableGaleri tbody');
galeriForm?.addEventListener('submit', async (e)=>{
  e.preventDefault(); const v = getValues(galeriForm);
  try{
    if(isCreate){
      // create via Cloud Function (keeps admin logged in)
      await createUserFn({ email: v.email, password: v.password, name: v.name || '', role: v.role || 'viewer' });
    } else {
    await addDoc(collection(db,'galeri'),{ caption:v.caption||'', gambar:v.gambar||'', createdAt:serverTimestamp() });
    clear(galeriForm); await renderGaleri();
    await logAction('addGaleri', v.caption||'(tanpa caption)');
  }catch(err){ alert('Gagal: '+err.message); }
});
async function renderGaleri(){
  const snap = await getDocs(query(collection(db,'galeri'), orderBy('createdAt','desc')));
  galeriTable.innerHTML='';
  snap.forEach(d=>{
    const g=d.data(); const tr=document.createElement('tr');
    tr.innerHTML=`<td>${g.caption||'-'}</td><td>${g.gambar? `<a href="${driveUrlToDirect(g.gambar)}" target="_blank">Lihat</a>`:'-'}</td>
    <td><button data-id="${d.id}" class="btn small btn-del-galeri">Hapus</button></td>`;
    galeriTable.appendChild(tr);
  });
  galeriTable.querySelectorAll('.btn-del-galeri').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(confirm('Hapus gambar ini?')){ await deleteDoc(doc(db,'galeri',btn.getAttribute('data-id'))); await renderGaleri(); await logAction('deleteGaleri', btn.getAttribute('data-id'));
    await logAction('addGaleri', v.caption||'(tanpa caption)'); }
    });
  });
}


// ===== USERS (Firestore-only Management) =====
const formUser = el('#formUser');
const tableUsers = el('#tableUsers tbody');

formUser?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const v = getValues(formUser);
  const isCreate = !!v.password;
  if(!v.email){ return alert('Email wajib diisi'); }
  try{
    if(isCreate){
      // create via Cloud Function (keeps admin logged in)
      await createUserFn({ email: v.email, password: v.password, name: v.name || '', role: v.role || 'viewer' });
    } else {
    // Try to find existing user doc by email
    const qSnap = await getDocs(collection(db,'users'));
    let targetDoc = null, targetId = null;
    qSnap.forEach(d=>{ const u=d.data(); if((u.email||'').toLowerCase() === v.email.toLowerCase()){ targetDoc = u; targetId = d.id; } });
    }
    // fallback: Firestore-only upsert
    if(targetId){
      await setDoc(doc(db,'users',targetId), { name:v.name||'', email:v.email, role:v.role||'viewer', updatedAt: serverTimestamp() }, { merge:true });
    }else{
      // If unknown UID, create a random doc (admin should later replace doc id with real UID if needed)
      const newRef = doc(collection(db,'users'));
      await setDoc(newRef, { name:v.name||'', email:v.email, role:v.role||'viewer', createdAt: serverTimestamp() });
    }
    formUser.reset();
    await renderUsers();
  await renderLogs(role);
    await logAction('createUser', v.email);
  }catch(err){ alert('Gagal simpan user: '+err.message); }
});

async function renderUsers(){
  tableUsers.innerHTML = '';
  const snap = await getDocs(collection(db,'users'));
  snap.forEach(d=>{
    const u = d.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.name||'-'}</td>
      <td>${u.email||'-'}</td>
      <td>
        <select data-id="${d.id}" class="role-select">
          <option value="viewer" ${u.role==='viewer'?'selected':''}>viewer</option>
          <option value="admin_berita" ${u.role==='admin_berita'?'selected':''}>admin_berita</option>
          <option value="admin_program" ${u.role==='admin_program'?'selected':''}>admin_program</option>
          <option value="admin_pkk" ${u.role==='admin_pkk'?'selected':''}>admin_pkk</option>
          <option value="super_admin" ${u.role==='super_admin'?'selected':''}>super_admin</option>
        </select>
      </td>
      <td>${d.id}</td>
      <td><button class="btn small btn-del-user" data-id="${d.id}">Hapus</button></td>
      <td><button class="btn small btn-reset-pass" data-email="${u.email||"-"}">Reset Password</button></td> class="btn small btn-del-user" data-id="${d.id}">Hapus</button></td>
    `;
    tableUsers.appendChild(tr);
  });


  // change role inline
  tableUsers.querySelectorAll('.role-select').forEach(sel=>{
    sel.addEventListener('change', async ()=>{
      const id = sel.getAttribute('data-id');
      try{
        await setDoc(doc(db,'users',id), { role: sel.value, updatedAt: serverTimestamp() }, { merge: true });
        await logAction('updateRole', id + ' -> ' + sel.value);
      }catch(err){ alert('Gagal ubah role: '+err.message); }
    });
  });
  // delete
  tableUsers.querySelectorAll('.btn-del-user').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(confirm('Hapus user ini dari Firestore? (Tidak menghapus akun di Authentication)')){
        await deleteDoc(doc(db,'users', btn.getAttribute('data-id')));
        await renderUsers();
  await renderLogs(role);
    await logAction('createUser', v.email);
        await logAction('deleteUser', btn.getAttribute('data-id'));
      }
    });
  });
  // reset password
  tableUsers.querySelectorAll('.btn-reset-pass').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const email = btn.getAttribute('data-email');
      if(!email || email==='-') return alert('Email tidak valid');
      try{
        await sendPasswordResetEmail(auth, email);
        alert('Email reset password terkirim ke: ' + email);
        await logAction('resetPassword', email);
      }catch(err){ alert('Gagal kirim reset password: ' + err.message); }
    });
  });

  tableUsers.querySelectorAll('.role-select').forEach(sel=>{
    sel.addEventListener('change', async ()=>{
      const id = sel.getAttribute('data-id');
      try{
    if(isCreate){
      // create via Cloud Function (keeps admin logged in)
      await createUserFn({ email: v.email, password: v.password, name: v.name || '', role: v.role || 'viewer' });
    } else {
        await setDoc(doc(db,'users',id), { role: sel.value, updatedAt: serverTimestamp() }, { merge: true });
      }catch(err){ alert('Gagal ubah role: '+err.message); }
    });
  });
  // delete
  tableUsers.querySelectorAll('.btn-del-user').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      if(confirm('Hapus user ini dari Firestore? (Tidak menghapus akun di Authentication)')){
        await deleteDoc(doc(db,'users', btn.getAttribute('data-id')));
        await renderUsers();
  await renderLogs(role);
    await logAction('createUser', v.email);
      }
    });
  });
}


async function renderUsers(){ /* placeholder will be overwritten above */ }

async function renderAll(){ await Promise.all([renderBerita(), renderProgram(), renderStruktur(), renderGaleri()]);
  await renderUsers();
  await renderLogs(role);
    await logAction('createUser', v.email); }


// ===== LOGS =====
const tableLogs = document.querySelector('#tableLogs tbody');
const logFilter = document.getElementById('logFilter');
const btnRefreshLogs = document.getElementById('btnRefreshLogs');

async function renderLogs(role){
  if(!tableLogs) return;
  tableLogs.innerHTML = '<tr><td colspan="4">Memuat...</td></tr>';
  try{
    let q = collection(db,'logs');
    // super_admin sees all; others filtered by current uid handled by rules;
    // but we add client filter when dropdown set.
    if(logFilter && logFilter.value){
      // apply client-side filter after fetch (simpler for demo)
      const snap = await getDocs(query(q, orderBy('timestamp','desc')));
      tableLogs.innerHTML = '';
      snap.forEach(d=>{
        const L = d.data();
        if(L.action !== logFilter.value) return;
        const tr = document.createElement('tr');
        const ts = L.timestamp?.toDate ? L.timestamp.toDate() : new Date();
        tr.innerHTML = `<td>${ts.toLocaleString('id-ID')}</td><td>${L.user||'-'}</td><td>${L.action||'-'}</td><td>${L.target||'-'}</td>`;
        tableLogs.appendChild(tr);
      });
    }else{
      const snap = await getDocs(query(q, orderBy('timestamp','desc')));
      tableLogs.innerHTML = '';
      snap.forEach(d=>{
        const L = d.data();
        const tr = document.createElement('tr');
        const ts = L.timestamp?.toDate ? L.timestamp.toDate() : new Date();
        tr.innerHTML = `<td>${ts.toLocaleString('id-ID')}</td><td>${L.user||'-'}</td><td>${L.action||'-'}</td><td>${L.target||'-'}</td>`;
        tableLogs.appendChild(tr);
      });
    }
  }catch(e){
    tableLogs.innerHTML = '<tr><td colspan="4">Gagal memuat log.</td></tr>';
    console.warn('renderLogs error:', e);
  }
}
logFilter?.addEventListener('change', ()=> renderLogs());
btnRefreshLogs?.addEventListener('click', ()=> renderLogs());
