# DEPLOYMENT

**Status aktual: DEPLOYED ✅** — Vercel + Supabase Postgres.
**Production URL:** https://website-kelas-xtkj-bk.vercel.app (alias stabil; tiap redeploy juga menghasilkan URL unik per-deployment).

Panduan lengkap untuk skenario lain: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Arsitektur

```
Browser → Vercel (Next.js 15 App Router) → Supabase
                                          ├─ PostgreSQL (tabel aplikasi, RLS aktif)
                                          └─ (Auth & Storage Supabase belum dipakai —
                                              auth = session cookie app sendiri via API)
```

- **Framework**: Next.js 15 + React 19 + TypeScript + Prisma 6
- **Database**: Supabase Postgres (region ap-southeast-1)
- **Auth**: session cookie HttpOnly + HMAC (`SESSION_SECRET`), role divalidasi server-side
- **Koneksi DB**: pooled (PgBouncer, port 6543) untuk runtime; direct (5432) untuk migrasi

## Requirements

- Node.js ≥ 20
- Project Supabase (database + connection string)
- Akun Vercel + Vercel CLI (`npx vercel login`)

## Installation (lokal)

```bash
npm install            # postinstall otomatis menjalankan prisma generate
cp .env.example .env   # isi DATABASE_URL, DIRECT_URL, SESSION_SECRET, SEED_*
npx prisma generate
npm run dev            # http://localhost:3000
```

## Environment Variables

| Variable | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | URL pooled Supabase (port 6543, `pgbouncer=true`) |
| `DIRECT_URL` | ✅ | URL langsung Supabase (port 5432) untuk migrasi |
| `SESSION_SECRET` | ✅ | Acak ≥ 32 karakter; **buat baru untuk production** |
| `SEED_DEVELOPER_PASSWORD` | saat seed | Password awal developer |
| `SEED_WALI_KELAS_PASSWORD` | saat seed | Password awal wali kelas |
| `SEED_ANGGOTA_PASSWORD` | saat seed | Password awal anggota |

Tidak ada secret lain. `.env` di-gitignore; di Vercel diset via dashboard/CLI (`vercel env add`, tersimpan sebagai secret).

## Commands

| Kegunaan | Perintah |
|---|---|
| Development | `npm run dev` |
| Production build | `npm run build` |
| Production start (non-Vercel) | `npm run start` |
| Deploy production | `npx vercel --prod` |
| Migrasi DB | `npx prisma migrate deploy` (atau `npm run db:push`) |
| Seed akun awal | `npm run db:seed` |
| Lint / typecheck | `npm run lint` / `npx tsc --noEmit` |

## Deployment Steps (jalur yang dieksekusi Phase 9)

### 1. Supabase (database production)

1. Buat project di Supabase (region terdekat, mis. ap-southeast-1).
2. Terapkan schema + RLS: jalankan `prisma/migrations/0_init/migration.sql` (via Supabase SQL editor/CLI), lalu:
   - `ALTER TABLE <tabel> ENABLE ROW LEVEL SECURITY;` untuk semua tabel aplikasi;
   - buat role privat aplikasi (mis. `app_webkelas`) + policy `FOR ALL TO app_webkelas`;
   - role anon/authenticated Supabase **default-deny penuh** (tanpa policy permisif).
3. Seed akun awal (upsert) + settings (`member_quota_max=36`, `registration_open=true`).
4. Ambil connection string pooled & direct → set sebagai `DATABASE_URL` & `DIRECT_URL`.

### 2. Vercel (aplikasi)

```bash
npx vercel login
npx vercel link                # hubungkan folder project ke project Vercel
npx vercel env add DATABASE_URL production    # nilai pooled URL
npx vercel env add DIRECT_URL production      # nilai direct URL
npx vercel env add SESSION_SECRET production  # nilai acak baru
npx vercel --prod              # deploy
```

Catatan penting:
- Jangan letakkan `vercel.json` dengan `services` asing di project — akan mengubah framework project menjadi "services" dan merusak build (pernah terjadi di Phase 9; diperbaiki via PATCH project API `{"framework":"nextjs"}`).
- Folder tool/worktree (mis. `.kilo/`) wajib di-exclude (`.vercelignore` + `.gitignore`) agar tidak ikut ter-upload.
- Vercel Deployment Protection (SSO) aktif secara default pada akun baru; matikan via Project Settings → Deployment Protection jika URL harus publik.

### 3. Post-Deployment Verification (sudah dieksekusi Phase 9)

- [x] `GET /api/health` → `{"status":"ok","database":"connected"}`
- [x] Login developer/wali/anggota 200; password salah 401; role mismatch 403
- [x] Security matrix: murid/wali → API developer 403; anonim 401; `/dashboard/settings` untuk murid = ACCESS DENIED
- [x] CRUD announcement (create id=2 → read-back → delete; activity log tercatat di Postgres)
- [x] Register murid → kuota 1→2 (di Supabase); kuota penuh ditolak (teruji Phase 7)
- [x] Logout → replay cookie 401
- [x] `/robots.txt` menyembunyikan `/dashboard` & `/api`
- [x] Landing page production render utuh (dark theme, system status real)

## Troubleshooting Umum

| Masalah | Penyebab & solusi |
|---|---|
| Semua request → 302 ke `vercel.com/sso-api` | Deployment Protection aktif — matikan di Project Settings |
| `FUNCTION_INVOCATION_FAILED` + log menyebut file asing | Folder tool ikut ter-upload — cek `.vercelignore` |
| `framework is set to "services"` saat build | Ada `vercel.json` `services` — hapus + reset framework ke `nextjs` |
| "Vulnerable version of Next.js detected" | Upgrade `next` (Phase 9: 15.3.3 → 15.5.26) |
| 500 saat login | `SESSION_SECRET` kosong/pendek — min 32 karakter |
| `no tenant identifier` saat koneksi pooler | Username pooler Supabase harus `<user>.<project-ref>` |
| Prisma `P1001` / RLS empty result | Policy RLS belum mencakup role aplikasi — lihat langkah Supabase #2 |
| `Unknown field tokenVersion` | `npx prisma generate` + restart server |
| Upload galeri hilang di Vercel | Filesystem ephemeral — gunakan object storage (belum diintegrasikan) |
