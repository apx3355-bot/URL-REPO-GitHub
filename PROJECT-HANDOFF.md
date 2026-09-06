# Project Handoff

## Ringkasan

Website kelas X TKJ menggunakan React + Vite sebagai frontend dan PHP + PDO SQLite sebagai backend utama. Database tetap berada di `database.db` pada root proyek.

## Menjalankan proyek

Dari folder root `website-kelas-ypk-fixed`:

```powershell
npm.cmd run dev:all
```

Perintah tersebut menjalankan:

- PHP API di `http://localhost:8000`
- React/Vite di `http://localhost:5173`
- Akses jaringan lokal di `http://IP-SERVER:5173`

Cari IP server dengan `ipconfig`. Windows Firewall harus mengizinkan koneksi pada jaringan Private.

## Struktur penting

- `frontend/src/App.jsx`: halaman React, login, mode pengunjung, dashboard, anggota, struktur kelas, pengumuman, jadwal, dan galeri.
- `frontend/src/api.js`: helper request API.
- `frontend/src/styles.css`: tema gelap modern dan animasi.
- `frontend/vite.config.js`: proxy API dan upload ke PHP.
- `backend/api.php`: endpoint PHP, autentikasi session, profil, jabatan, struktur kelas, pengumuman, jadwal, dan galeri.
- `backend/router.php`: router PHP untuk API dan file `/uploads`.
- `database.js`: skema SQLite lama dan migrasi kompatibilitas Node.
- `scripts/start-all.ps1`: menjalankan PHP dan Vite bersama-sama.

## Hak akses

- Pengunjung: hanya beranda, informasi kelas, pengumuman, jadwal, dan galeri.
- Murid: profil sendiri dan akses fitur murid.
- Wali kelas: mengubah profil anggota, jabatan, struktur kelas, info kelas, jadwal, pengumuman, dan galeri.
- Developer: seluruh akses wali kelas ditambah reset password dan hapus akun anggota.

## Data tersimpan

- Profil dan jabatan tersimpan di tabel `member_profiles`.
- Struktur kelas tersimpan di tabel `class_structure` dengan posisi `wali_kelas`, `ketua`, `wakil`, dan `sekretaris`.
- Info kelas tersimpan di `class_info`.
- Jadwal tersimpan di `class_schedule`.
- Pengumuman tersimpan di `announcements`.
- Galeri tersimpan di `class_gallery`.
- Upload berada di `public/uploads/profiles` dan `public/uploads/gallery`.
- Kuota gabungan upload adalah 5 GB pada SSD internal laptop. Pemakaian dihitung dari kedua folder tersebut; upload baru ditolak ketika kuota tercapai.

## Catatan akun

Akun `wali_uji` dan `murid_uji` dihapus melalui migrasi satu kali. Akun lain yang terdaftar dipertahankan. Jangan menambahkan seed akun demo baru ke `database.js` atau `backend/api.php`.

## Pemeriksaan sebelum melanjutkan pengembangan

```powershell
npm.cmd run build:frontend
```

Jika mengubah backend PHP, pastikan PHP tersedia dan jalankan:

```powershell
php -l backend/api.php
```

Jangan menambahkan marker patch seperti `*** End Patch` atau awalan `+` ke file JSX.
