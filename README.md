# Karang Taruna Cilosari Barat — v2.2 (Hero TikTok dari Firestore, Tanpa Pratinjau)

**Perubahan utama:** Tidak ada gambar pratinjau di homepage. Hero menampilkan **video TikTok** langsung dari Firestore:
```
/settings/heroVideo
  └─ videoUrl: "https://www.tiktok.com/@akun/video/XXXXXXXXXXXX"
```

## Setup
1) Aktifkan Authentication & Firestore di Firebase.
2) Duplikat `env.sample.js` → rename `env.js` → isi config.
3) Firestore Rules → paste `firebase/firestore.rules` → Publish.
4) Buat akun admin (super_admin atau admin_berita) untuk mengubah hero video.

## Ubah Video TikTok (Admin)
- Buka `/admin.html` → bagian **Video Hero TikTok**.
- Tempel URL TikTok (boleh format biasa). Sistem otomatis ubah ke `/embed/`.
- Simpan → halaman publik otomatis pakai video tersebut.


## v2.3 — Manajemen Akun & Role (Firestore-only)
- Menu baru **"Manajemen Akun & Role"** (khusus `super_admin`)
- Lihat daftar user dari koleksi `/users`
- Tambah/ubah/hapus data user (name/email/role)
- Catatan: ini **tidak** membuat akun Authentication. Buat akun login tetap via Firebase Console, lalu pastikan dokumen `/users/{uid}` ada dan `role`-nya sesuai.


## v2.4 — Buat Akun Authentication dari Dashboard (Super Admin)
Backend **Cloud Functions** ditambahkan:
- `createUserWithRole` (callable): super_admin dapat membuat akun Auth (email+password) dan otomatis membuat dokumen `/users/{uid}` dengan role.

### Deploy Functions
1. Install Firebase CLI dan login: `npm i -g firebase-tools && firebase login`
2. Masuk folder `functions`: `cd functions && npm i`
3. Deploy: `firebase deploy --only functions`
4. Pastikan projectId di `env.js` sama dengan project yang dipakai untuk deploy.

Setelah deploy, di **/admin.html → Manajemen Akun & Role**:
- Isi Nama, Email, Password, Role → **Tambah/Perbarui** → akun Auth + Firestore dibuat sekaligus.
- Mengubah role & menghapus user masih mengelola data di Firestore (tidak menghapus Auth).


## v2.5 — Reset Password + Activity Logs
Fitur baru:
- Tombol **Reset Password** di Manajemen Akun (kirim email reset via Firebase).
- **Activity Logs** tersimpan di Firestore `/logs` dan tampil di dashboard.
- Rules: super_admin bisa baca semua log; admin lain hanya miliknya sendiri (berdasarkan `userUid`).

Cara pakai:
1) Deploy rules terbaru (tab Firestore Rules).
2) Login sebagai super_admin → buka **Manajemen Akun** & **Log Aktivitas**.
3) Gunakan tombol **Reset Password** di baris user, dan filter log di dropdown.
