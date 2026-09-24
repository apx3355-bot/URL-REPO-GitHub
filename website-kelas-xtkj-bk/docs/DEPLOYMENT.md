# 🚀 Panduan Deployment — Website Kelas X TKJ BK

Dokumentasi lengkap untuk menjalankan website ini di production: **Vercel** (dengan database Postgres) dan **VPS** (dengan SQLite lokal atau Postgres).

---

## Daftar Isi

1. [Persiapan Umum](#1-persiapan-umum)
2. [Migrasi Database: SQLite → PostgreSQL](#2-migrasi-database-sqlite--postgresql)
3. [Opsi A — Deploy ke Vercel](#3-opsi-a--deploy-ke-vercel)
4. [Opsi B — Deploy ke VPS](#4-opsi-b--deploy-ke-vps)
5. [Seed Akun Production](#5-seed-akun-production)
6. [Environment Variables](#6-environment-variables)
7. [HTTPS & Domain](#7-https--domain)
8. [Post-Deployment Checklist](#8-post-deployment-checklist)
9. [Backup & Recovery](#9-backup--recovery)
10. [Update Aplikasi](#10-update-aplikasi)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Persiapan Umum

### Prasyarat

- Node.js **20+** (`node -v`)
- npm 10+
- Git
- Akun GitHub/GitLab (untuk Vercel) atau akses SSH ke VPS
- Database Postgres (untuk Vercel — lihat §2)

### Penting sebelum deploy

> [!WARNING]
> File berikut **tidak boleh** ikut ke production repo:
> - `.env` — berisi `SESSION_SECRET` dan password seed
> - `prisma/dev.db` — database berisi hash password
>
> Keduanya sudah masuk `.gitignore`. Jangan paksa commit.

> [!NOTE]
> **Batasan upload galeri:** aplikasi menyimpan foto galeri di `public/uploads/gallery/`. Di **Vercel**, filesystem bersifat *ephemeral* — file yang diupload saat runtime akan hilang saat redeploy. Untuk Vercel, integrasikan object storage (mis. Supabase Storage / Cloudflare R2 / S3) atau matikan fitur upload murid dengan menutup registrasi & upload. Di **VPS**, filesystem persisten → upload aman.

### Kumpulkan secret yang dibutuhkan

| Variabel | Keterangan | Cara membuat |
|---|---|---|
| `DATABASE_URL` | Koneksi database | Dari provider database (lihat §2) |
| `SESSION_SECRET` | Signing cookie session | `openssl rand -base64 48` |
| `SEED_DEVELOPER_PASSWORD` | Password awal akun developer | Buat password kuat (min 12 karakter) |
| `SEED_WALI_KELAS_PASSWORD` | Password awal akun wali kelas | Idem |
| `SEED_ANGGOTA_PASSWORD` | Password awal akun murid contoh | Idem (atau hapus akunnya setelah seed) |

---

## 2. Migrasi Database: SQLite → PostgreSQL

Schema Prisma saat ini ditulis untuk SQLite (enum sebagai String — kompatibel penuh dengan Postgres). Perubahan yang diperlukan **hanya satu baris** pada `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"   // sebelumnya: "sqlite"
  url      = env("DATABASE_URL")
}
```

### 2.1 Pilih provider Postgres (gratis tersedia)

| Provider | Tier gratis | Cocok untuk |
|---|---|---|
| **Neon** (`neon.tech`) | 0.5 GB, serverless | Kelas — rekomendasi utama |
| **Supabase** (`supabase.com`) | 0.5 GB | Jika nanti mau pakai Supabase Storage juga |
| **Railway** (`railway.app`) | Terbatas/trial | Cepat untuk demo |
| VPS + Docker Postgres | Sesuai spek VPS | Full kontrol di VPS |

### 2.2 Buat database (contoh Neon)

1. Daftar → **Create Project** → pilih region terdekat (Singapore).
2. Salin **connection string**, bentuknya:
   ```
   postgresql://USER:PASSWORD@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
3. Simpan sebagai `DATABASE_URL` — **jangan pernah** di-commit.

### 2.3 Terapkan schema

```bash
# Di lokal, dengan DATABASE_URL menunjuk ke Postgres production:
npx prisma db push
```

> [!TIP]
> Untuk pengelolaan jangka panjang, gunakan `prisma migrate dev --name init`
> (membuat folder `prisma/migrations/` yang bisa di-commit) lalu terapkan di
> production dengan `npx prisma migrate deploy`. `db push` cukup untuk setup awal.

### 2.4 (Opsional) Migrasi data SQLite lama

Jika data dari development (anggota, struktur, jadwal, pengumuman) ingin dibawa:

1. Export data dari SQLite: `npx prisma studio` → export manual per tabel (kecil, cukup manual).
2. Import ke Postgres via script seed kustom atau `prisma studio` di atas database baru.

Untuk kelas dengan data awal yang masih placeholder (`[Nama Siswa 1]`, dst.), **disarankan mulai kosong + seed** (§5), lalu isi data asli lewat dashboard.

---

## 3. Opsi A — Deploy ke Vercel

### 3.1 Siapkan repo

```bash
git add -A
git commit -m "Prepare for deployment"
git push origin main
```

Pastikan di repo ada `prisma/migrations/` (jika pakai migrate) dan schema sudah `postgresql`.

### 3.2 Tambahkan `postinstall` (generate Prisma client di Vercel)

Di `package.json`:

```json
"scripts": {
  "postinstall": "prisma generate"
}
```

### 3.3 Import project ke Vercel

1. **vercel.com** → **Add New → Project** → pilih repo.
2. Framework Preset terdeteksi otomatis: **Next.js**.
3. **Environment Variables** (Production + Preview):

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | `postgresql://...neon.tech/neondb?sslmode=require` |
   | `SESSION_SECRET` | hasil `openssl rand -base64 48` |
   | `SEED_DEVELOPER_PASSWORD` | password kuat |
   | `SEED_WALI_KELAS_PASSWORD` | password kuat |
   | `SEED_ANGGOTA_PASSWORD` | password kuat |

4. **Deploy**.

### 3.4 Jalankan seed & migrasi sekali

Dari lokal (menunjuk database production yang sama):

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy   # jika pakai migrations
DATABASE_URL="postgresql://..." SEED_DEVELOPER_PASSWORD="..." \
  SEED_WALI_KELAS_PASSWORD="..." SEED_ANGGOTA_PASSWORD="..." \
  npx tsx prisma/seed.ts
```

> Alternatif tanpa tsx: `node --experimental-strip-types prisma/seed.ts`
> (Node 20+) — sama seperti yang dipakai di project ini.

### 3.5 Batasan Vercel yang perlu diketahui

| Batasan | Dampak | Solusi |
|---|---|---|
| Filesystem ephemeral | Upload galeri hilang saat redeploy | Object storage (Supabase Storage/R2/S3) atau disable upload |
| Rate limiter in-memory | Tidak dibagi antar instance serverless | Terima batasannya (masih memperlambat brute force per instance) atau pindahkan ke Upstash Redis |
| Cold start | Request pertama lebih lambat | Normal untuk serverless |
| Connection pooling | Neon punya pooling bawaan; Supabase gunakan **pooler** port 6543 | Gunakan connection string pooled |

> [!IMPORTANT]
> Jika memakai Supabase, pakai **connection pooling** untuk `DATABASE_URL`
> di Vercel (port 6543, `?pgbouncer=true`) untuk menghindari kehabisan koneksi.

---

## 4. Opsi B — Deploy ke VPS

Cocok jika ingin upload galeri berjalan tanpa object storage. Contoh: Ubuntu 22.04/24.04.

### 4.1 Persiapan server

```bash
# Update & dependency dasar
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx

# Node.js 20 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# (Opsional) Postgres di VPS yang sama
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres createuser --pwprompt tkj_user
sudo -u postgres createdb -O tkj_user tkj_kelas
# DATABASE_URL: postgresql://tkj_user:PASSWORD@localhost:5432/tkj_kelas
```

Atau tetap pakai **SQLite** di VPS (tanpa Postgres) — cukup set:

```
DATABASE_URL="file:/var/www/tkj/data/prod.db"
```

> SQLite di VPS **sangat layak** untuk skala satu kelas. Pastikan folder
> database di luar folder aplikasi (agar tidak tertimpa saat deploy) dan
> ikut di-backup (§9).

### 4.2 Deploy aplikasi

```bash
# User khusus aplikasi (bukan root)
sudo adduser --system --group tkj
sudo mkdir -p /var/www/tkj
sudo chown tkj:tkj /var/www/tkj

# Clone & build
sudo -u tkj git clone <REPO_URL> /var/www/tkj/app
cd /var/www/tkj/app

sudo -u tkj npm ci
sudo -u tkj npx prisma db push        # atau: prisma migrate deploy
sudo -u tkj npx prisma generate
sudo -u tkj npm run build

# Seed sekali (password dari env, jangan default!)
sudo -u tkj SESSION_SECRET="..." \
  SEED_DEVELOPER_PASSWORD="..." \
  SEED_WALI_KELAS_PASSWORD="..." \
  SEED_ANGGOTA_PASSWORD="..." \
  DATABASE_URL="..." \
  node --experimental-strip-types prisma/seed.ts
```

Buat `/var/www/tkj/app/.env` (akses `tkj` saja):

```bash
sudo -u tkj tee /var/www/tkj/app/.env > /dev/null <<'EOF'
DATABASE_URL="postgresql://tkj_user:PASSWORD@localhost:5432/tkj_kelas"
SESSION_SECRET="<openssl rand -base64 48>"
SEED_DEVELOPER_PASSWORD="<password kuat>"
SEED_WALI_KELAS_PASSWORD="<password kuat>"
SEED_ANGGOTA_PASSWORD="<password kuat>"
EOF
chmod 600 /var/www/tkj/app/.env
```

### 4.3 Jalankan dengan PM2

```bash
sudo npm i -g pm2
sudo -u tkj pm2 start npm --name tkj-web -- start
sudo -u tkj pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u tkj --hp /home/tkj
```

Aplikasi berjalan di port **3000** (ubah dengan `PORT=3001 pm2 start ...`).

### 4.4 Nginx sebagai reverse proxy

`/etc/nginx/sites-available/tkj`:

```nginx
server {
    listen 80;
    server_name kelasxtjbk.example.com;   # ganti domain Anda

    client_max_body_size 10M;             # upload galeri maks 5MB + margin

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/tkj /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> [!NOTE]
> Header `X-Forwarded-For` penting — **rate limiter** membaca IP klien dari
> header ini. Tanpa itu, semua request terlihat dari IP yang sama.

### 4.5 HTTPS dengan Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kelasxtjkbk.example.com
# Auto-renewal sudah disiapkan certbot; verifikasi:
sudo certbot renew --dry-run
```

Cookie session otomatis menjadi `Secure` di production (kode membaca `NODE_ENV=production` — PM2 menjalankan `next start` yang set ini).

### 4.6 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 5. Seed Akun Production

Seed membuat akun `developer`, `walikelas`, dan 36 anggota placeholder. **Wajib dilakukan setelah database production siap** (lihat perintah di §3.4 / §4.2).

Setelah seed:

1. Login sebagai `developer` dengan `SEED_DEVELOPER_PASSWORD`.
2. **Segera ganti password** via User Management → Reset Password (semua sesi lama otomatis logout).
3. Hapus/sunting akun contoh (`anggota`, `murid2`, data `[Nama Siswa X]`) dan isi data asli kelas.
4. Set kuota anggota di **Settings** sesuai jumlah kelas sebenarnya.
5. Ganti placeholder `[Nama Wali Kelas]` / `[Nama Sekolah]` di dashboard.

> [!WARNING]
> Jangan pernah menempelkan password seed ke chat, screenshot, atau dokumentasi.
> Jika terlanjur bocor, reset password dari dashboard (bump tokenVersion → semua sesi lama mati).

---

## 6. Environment Variables (referensi)

| Variabel | Wajib | Contoh | Keterangan |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://...` / `file:./prod.db` | Koneksi database |
| `SESSION_SECRET` | ✅ | random ≥32 karakter | Signing cookie; **rotasi = semua user logout** |
| `SEED_DEVELOPER_PASSWORD` | Untuk seed | password kuat | Hanya dipakai `seed.ts` |
| `SEED_WALI_KELAS_PASSWORD` | Untuk seed | password kuat | Idem |
| `SEED_ANGGOTA_PASSWORD` | Untuk seed | password kuat | Idem |
| `NODE_ENV` | Otomatis | `production` | Diset oleh `next start`/Vercel |

**Tidak ada secret lain** — aplikasi tidak memakai API key pihak ketiga.

---

## 7. HTTPS & Domain

- **Vercel**: HTTPS + domain otomatis (`*.vercel.app`); custom domain tinggal ditambahkan di Project → Domains.
- **VPS**: gunakan certbot (§4.5). Cookie `Secure` + `SameSite=Lax` sudah benar selama HTTPS aktif.
- Wajib HTTPS sejak login digunakan — session cookie tanpa HTTPS rentan disadap.

---

## 8. Post-Deployment Checklist

Setelah deploy, verifikasi berikut (semua punya endpoint/fitur terkait):

- [ ] `GET /api/health` → `{"status":"ok","database":"connected"}`
- [ ] Halaman publik: `/`, `/anggota`, `/struktur`, `/galeri`, `/tentang` → 200
- [ ] Login developer dengan password seed → masuk dashboard
- [ ] Login dengan role mismatch → ditolak (`Akun ini tidak memiliki akses sebagai ...`)
- [ ] **Ganti semua password seed** via User Management
- [ ] Ubah kuota di Settings → tersimpan & tercatat di Activity Log
- [ ] Register murid baru saat kuota tersedia → 201; saat kuota penuh → 403 dengan pesan
- [ ] Upload galeri (murid) → PENDING → approve → tampil di `/galeri`
- [ ] Logout → tombol Back tidak membuka dashboard
- [ ] HTTPS aktif, tidak ada mixed-content warning
- [ ] `robots.txt` memblokir `/dashboard` dan `/api`
- [ ] 404, 403, 500 page tampil dengan gaya TKJ

---

## 9. Backup & Recovery

### SQLite (VPS)

```bash
# Backup harian (crontab) — aman karena Prisma/SQLite mendukung backup file
0 2 * * * sqlite3 /var/www/tkj/data/prod.db ".backup /var/backups/tkj/prod-$(date +\%F).db"

# Upload galeri
0 2 * * * tar -czf /var/backups/tkj/uploads-$(date +\%F).tar.gz /var/www/tkj/app/public/uploads/gallery

# Retensi 30 hari
0 3 * * * find /var/backups/tkj -name "*.db" -mtime +30 -delete
```

Restore: hentikan aplikasi → timpa file `.db` dengan backup → jalankan lagi.

### PostgreSQL (Vercel/Neon/VPS)

```bash
# Backup
pg_dump "$DATABASE_URL" > backup-$(date +%F).sql

# Restore
psql "$DATABASE_URL" < backup-2026-09-23.sql
```

Neon/Supabase memiliki point-in-time recovery pada tier berbayar; tier gratis → backup manual berkala cukup untuk data kelas.

**Catatan**: session tidak perlu di-backup — cookie memuat tokenVersion; setelah restore, user cukup login ulang.

---

## 10. Update Aplikasi

### Vercel

Push ke `main` → deploy otomatis. Migrasi:

```bash
DATABASE_URL="..." npx prisma migrate deploy
```

### VPS

```bash
cd /var/www/tkj/app
sudo -u tkj git pull
sudo -u tkj npm ci
sudo -u tkj npx prisma migrate deploy
sudo -u tkj npm run build
sudo -u tkj pm2 restart tkj-web
```

> [!TIP]
> Backup database **sebelum** menjalankan migrasi.

---

## 11. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| `SESSION_SECRET belum diset atau terlalu pendek` di log | Env tidak terbaca | Cek env vars di platform; pastikan ≥32 karakter |
| Login selalu gagal di production tapi OK lokal | Database production kosong | Jalankan seed (§5) |
| Semua user tiba-tiba logout | `SESSION_SECRET` berubah atau DB di-reset | Normal — login ulang; set secret permanen |
| `429 Terlalu banyak percobaan` saat testing | Rate limiter aktif | Tunggu window (60 s) — perilaku benar |
| Upload galeri gagal >5 MB | Validasi aplikasi | Kompres foto; batas memang 5 MB |
| Upload hilang di Vercel | Filesystem ephemeral | Pakai object storage (lihat §1 catatan) |
| Rate limit tidak berjalan di balik proxy | Header `X-Forwarded-For` tidak diteruskan | Konfigurasi Nginx §4.4 |
| `P1001: Can't reach database` | `DATABASE_URL` salah / firewall | Cek connection string & akses jaringan |
| Gambar galeri 404 setelah deploy | Folder uploads tidak ter-deploy | VPS: pastikan folder persist & permission `tkj`; Vercel: object storage |

---

*Dibuat untuk project `web-kelas-xtkj-bk` — Next.js 15, Prisma 6, React 19. Perbarui dokumen ini saat stack berubah.*
