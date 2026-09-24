# Website Kelas X TKJ BK

Website resmi kelas X Teknik Komputer dan Jaringan (BK) — portal informasi
kelas dengan sistem authentication, role-based access control, dashboard,
CRUD, galeri dengan moderasi, dan activity log.

## Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Prisma ORM 6** + **SQLite** (mudah dimigrasi ke Postgres/Supabase)
- **Tailwind CSS 4** + design tokens custom (dark/light theme)
- **bcryptjs** (password hashing), **zod** (validasi input)

## Installation

```bash
npm install
cp .env.example .env   # lalu isi nilai di .env
npx prisma db push     # buat schema database
npx prisma generate
node --experimental-strip-types prisma/seed.ts   # data awal (opsional)
npm run dev
```

## Environment Variables

Lihat `.env.example`. Semua wajib, tidak ada yang di-commit:

| Variable | Keterangan |
|---|---|
| `DATABASE_URL` | Path database SQLite, mis. `file:./dev.db` |
| `SESSION_SECRET` | Secret signing session cookie (min. 32 karakter acak) |
| `SEED_DEVELOPER_PASSWORD` | Password akun developer saat seed |
| `SEED_WALI_KELAS_PASSWORD` | Password akun wali kelas saat seed |
| `SEED_ANGGOTA_PASSWORD` | Password akun murid saat seed |

## Database Setup

Schema: `prisma/schema.prisma` — tabel `User`, `Profile`, `ClassMember`,
`Announcement`, `ClassStructure`, `Schedule`, `GalleryItem`, `ActivityLog`
(dengan relasi & foreign key). Perubahan schema:

```bash
npx prisma db push && npx prisma generate
```

## Authentication

- Session cookie **HttpOnly + SameSite=Lax + Secure (produksi)**, ditandatangani
  HMAC-SHA256 dengan `SESSION_SECRET`, kedaluwarsa 7 hari.
- Password di-hash **bcrypt (cost 12)** — tidak pernah disimpan/dikirim plaintext.
- Middleware edge memverifikasi tanda tangan cookie untuk `/dashboard/*`;
  verifikasi lengkap (user aktif, role, permission) dilakukan server-side
  di layout dan setiap API.
- Login memverifikasi **role pilihan user terhadap database** — mismatch
  ditolak (403), pilihan frontend tidak pernah menentukan role.
- **Logout meng-elevasi `tokenVersion`** user → cookie lama tidak bisa dipakai
  ulang (termasuk via tombol Back/replay). Reset password juga meng-elevasi
  version sehingga semua sesi aktif target ikut ter-logout.
- **Session cookie memuat tokenVersion** — verifikasi dilakukan di
  `getSessionUser()` (server) dan tanda tangan di middleware (edge).

## Settings & Quota (Phase 6)

- Tabel `Setting` (key-value) menyimpan konfigurasi **non-secret**:
  `member_quota_max` dan `registration_open`.
- **Kuota anggota**: pendaftaran murid baru ditolak saat jumlah akun murid
  aktif >= kuota ("Kuota anggota kelas saat ini sudah penuh."). Validasi
  dijalankan **dua kali** — sebelum create dan di dalam transaksi (anti
  race condition). Bisa diubah Developer di `/dashboard/settings`.
- **Registrasi publik** bisa dibuka/ditutup dari Settings; status publik
  tersedia di `GET /api/register-status` (agregat, tanpa data sensitif).
- Secret (API key, token, database URL) **tidak pernah** dikelola via dashboard.

## Role System & Permission Matrix

| Fitur | Developer | Wali Kelas | Murid |
|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ |
| User Management (create/role/status/reset password) | ✓ | ✗ | ✗ |
| Settings & Quota Management | ✓ | ✗ | ✗ |
| Class Members | ✓ CRUD | ✓ read/update | view |
| Class Structure | ✓ CRUD | ✓ read/update | view |
| Announcements | ✓ CRUD | ✓ create/update (miliknya) | view |
| Schedule | ✓ CRUD | ✓ create/update | view |
| Gallery | ✓ kelola + moderasi | ✓ moderasi | upload + hapus miliknya |
| Activity Logs | ✓ | ✗ | ✗ |
| Profil sendiri | ✓ | ✓ | ✓ |
| Logout | ✓ | ✓ | ✓ |

Registrasi publik **hanya membuat akun Murid**. Akun Developer/Wali Kelas
dibuat oleh Developer lewat **User Management** (`/dashboard/users`) atau seed.

## Gallery System

- Murid mengunggah foto (JPG/PNG/WEBP, maks 5 MB) via `/dashboard/gallery`.
- Validasi: ukuran, MIME, **magic bytes** (isi file diperiksa, bukan cuma
  extension), filename diganti nama acak.
- Upload berstatus **PENDING** → Developer/Wali Kelas **approve/reject** di
  halaman yang sama → hanya **APPROVED** tampil di galeri publik.
- File disimpan di `public/uploads/gallery/` (bukan binary di database).

## Development

```bash
npm run dev    # http://localhost:3000
npm run lint
npx tsc --noEmit
```

## Production Build

```bash
npx next build
npx next start
```

## Deployment Notes

Panduan lengkap (Vercel + Postgres, VPS + SQLite/Postgres, seed, backup,
troubleshooting): **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

Ringkasan:

- Isi `SESSION_SECRET` dengan nilai acak kuat di environment production
  (`openssl rand -base64 48`).
- SQLite cocok untuk skala kecil; untuk multi-instance gunakan Postgres —
  cukup ganti `provider` di schema + `DATABASE_URL`.
- Aplikasi menulis file ke `public/uploads/gallery` — pada platform read-only
  (Vercel dkk.) gunakan object storage (S3/Supabase Storage) dan sesuaikan
  `src/lib/upload.ts`.
- Setelah seed production, segera ganti semua password seed via User
  Management.

## Backup / Recovery

```bash
# Backup database + upload
cp prisma/dev.db backup/dev-$(date +%F).db
tar czf backup/uploads-$(date +%F).tgz public/uploads
```

Restore: timpa file `.db` dan ekstrak arsip uploads, lalu jalankan
`npx prisma generate`.
