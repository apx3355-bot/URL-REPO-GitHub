# PRODUCTION CHECKLIST — web-kelas-xtkj-bk

Checklist siap-deploy. Item deployment aktual dicentang saat benar-benar dilakukan.
Item bersanding dengan ✅ sudah diverifikasi di environment lokal (23 Sep 2026).

## Security & Secrets

- [x] ✅ `.env` tidak masuk repository (terverifikasi via `git ls-files`)
- [x] ✅ `.env.example` hanya berisi nama variable, tanpa secret asli
- [x] ✅ Secret scan source code: tidak ada password/API key/token hardcoded
- [x] ✅ Bundle client (`.next/static`) bebas secret (scan grep)
- [x] ✅ Seed fail-fast tanpa fallback password hardcoded
- [ ] ⬜ Rotasi password seed yang pernah terekspos di riwayat Git (`Dev!…`/`Wali!…`/`Anggota!…`, commit `46ac891`) — lakukan setelah deploy pertama
- [ ] ⬜ `SESSION_SECRET` production dibuat baru (min 32 karakter, tidak sama dengan lokal)
- [ ] ⬜ HTTPS aktif di domain production

## Environment & Configuration

- [x] ✅ Konfigurasi dev/production terpisah (`NODE_ENV`, cookie `Secure` otomatis di production)
- [x] ✅ `SESSION_SECRET` kosong → fail-fast (throw + middleware fail-closed), bukan fallback diam
- [ ] ⬜ Environment variables production diset di platform (Vercel/PM2 ecosystem/VPS `.env`)

## Database

- [x] ✅ Schema valid + index komposit dibuat (`prisma db push`, terverifikasi di sqlite_master)
- [x] ✅ Baseline migration Postgres siap (`prisma/migrations/0_init` + `migration_lock.toml`)
- [x] ✅ Seed idempotent (upsert) + fail-fast tanpa `SEED_*` env
- [x] ✅ Tidak ada dependensi pada data dummy (fallback statis galeri hanya presentation, DB tetap source of truth)
- [ ] ⬜ Database production dibuat + `prisma migrate deploy` / `db push` dijalankan
- [ ] ⬜ Seed production dijalankan + password seed diganti segera setelahnya
- [ ] ⬜ Jadwal backup disiapkan (cron SQLite / `pg_dump` — lihat docs/DEPLOYMENT.md §9)

## Authentication & Authorization

- [x] ✅ Password di-hash bcrypt (cost 12), tidak ada plaintext
- [x] ✅ Session HMAC + tokenVersion; logout/reset password meng-invalidasi sesi lama (teruji Phase 6–7)
- [x] ✅ Protected route & API divalidasi server-side (RBAC `requirePermission`, teruji 10 skenario)
- [x] ✅ Rate limiting login/register aktif

## API & Error Handling

- [x] ✅ Semua endpoint: authn + authz + zod validation + status code konsisten (Phase 7)
- [x] ✅ Error response generik tanpa stack trace (`handleApiError`); halaman 403/404/500 ada
- [x] ✅ Tidak ada endpoint debug/test terbuka

## Build & Frontend

- [x] ✅ `tsc --noEmit` 0 error
- [x] ✅ `next lint` 0 error
- [x] ✅ `next build` sukses (32 halaman, tanpa error)
- [x] ✅ Production smoke test (`next start`): health/landing/login/galeri 200, guest `/dashboard` 307
- [x] ✅ `robots.txt` menyembunyikan `/dashboard` & `/api`; dashboard noindex

## Performance

- [x] ✅ Bundle JS client terkecil ~164–214 KB (framework standar), tanpa asset custom berat
- [x] ✅ Upload dibatasi 5 MB + thumbnail endpoint + `loading="lazy"`
- [x] ✅ Index DB untuk query terpanas (feed publik, moderasi, log)
- [ ] ⬜ Verifikasi ulang di server production nyata

## Responsive

- [x] ✅ 320px / 768px / 1280px tanpa scroll horizontal nyata (terverifikasi browser)

## Deployment (dieksekusi Phase 9 — Vercel + Supabase)

- [x] ✅ Platform: Vercel (Next.js 15.5.26) + Supabase Postgres (ap-southeast-1)
- [x] ✅ Schema production ter-apply via migration + RLS aktif 9 tabel + policy role aplikasi
- [x] ✅ Environment production: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` (tersimpan sebagai secret di Vercel)
- [x] ✅ Seed production: 3 akun (password acak, TIDAK memakai password lama yang terekspos riwayat Git) + settings kuota 36
- [x] ✅ Production URL: https://website-kelas-xtkj-bk.vercel.app
- [x] ✅ Smoke test production: health/auth 3 role/wrong-cred 401/role-mismatch 403/security matrix/CRUD/kuota/activity log/logout invalidation — semua PASS
- [x] ✅ Supabase security advisor: 0 temuan
- [x] ✅ Data uji production dibersihkan (kembali 3 user seed, 0 announcement)
- [ ] ⬜ Ganti password akun seed via dashboard (handoff ke pemilik akun)
- [ ] ⬜ Custom domain (opsional)
- [ ] ⬜ Object storage galeri (upload belum berfungsi di Vercel — filesystem ephemeral)
- [ ] ⬜ Jadwal backup database (Supabase dashboard / pg_dump)
