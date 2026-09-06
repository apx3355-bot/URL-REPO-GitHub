# Migrasi React + PHP

## Struktur baru

- `frontend/`: aplikasi React + Vite.
- `backend/api.php`: API PHP dengan session PHP dan PDO SQLite.
- `database.db`: database lama yang tetap dipakai.

## Menjalankan

PHP 8.4 dan SQLite sudah terpasang. Untuk terminal PowerShell yang sudah terbuka sebelum instalasi PHP, gunakan executable PHP dari PATH baru atau buka terminal baru.

Backend:

```powershell
npm.cmd run backend:lan
```

Jika `php` belum dikenali pada terminal lama, jalankan:

```powershell
$php = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Filter php.exe -Recurse | Select-Object -First 1 -ExpandProperty FullName
& $php -S 0.0.0.0:8000 -t backend backend/router.php
```

Untuk menjalankan backend dan frontend sekaligus dalam satu perintah dari root proyek:

```powershell
npm.cmd run dev:all
```

Perintah ini menjalankan PHP di port 8000 dan React/Vite di port 5173. Tekan `Ctrl+C` untuk menghentikan keduanya.

Frontend dapat dijalankan dari root proyek:

```powershell
npm.cmd --prefix frontend install
npm.cmd run dev:lan
```

Buka `http://localhost:5173` pada server. Untuk perangkat lain satu jaringan, cari IP server dengan:

```powershell
ipconfig
```

Kemudian buka `http://IP-SERVER:5173`, contoh `http://192.168.1.10:5173`.

Pastikan Windows Firewall mengizinkan PHP/Vite pada jaringan Private. Akun `wali_uji` dan `murid_uji` akan dihapus otomatis sekali saat backend dijalankan; akun terdaftar lainnya dipertahankan.

### Penyimpanan perubahan

Semua perubahan yang disimpan dari dashboard langsung ditulis ke `database.db` dan akan tetap tersedia setelah server dihentikan atau dijalankan kembali. Foto profil dan foto galeri disimpan di `public/uploads/profiles` dan `public/uploads/gallery`. Menutup server hanya menghentikan layanan, bukan menghapus data.

Jalankan kembali hosting lokal dengan:

```powershell
npm.cmd run host
```

Catatan: API PHP saat ini mencakup status, login/logout, daftar anggota, dashboard, profil sendiri, serta pengelolaan profil dan label jabatan oleh developer/wali kelas. Endpoint Node lama tetap dipertahankan selama migrasi fitur lain seperti galeri dan pengumuman belum dipindahkan.
