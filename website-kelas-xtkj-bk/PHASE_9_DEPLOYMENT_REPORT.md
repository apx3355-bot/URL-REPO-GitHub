# PHASE 9 — DEPLOYMENT REPORT
**Project:** web-kelas-xtkj-bk
**Tanggal:** 23 September 2026
**Lingkup:** Production deployment Vercel + Supabase, security production, smoke test, dokumentasi.

> Semua hasil di bawah berasal dari eksekusi nyata: MCP Supabase, Vercel CLI, request HTTP ke
> production URL, dan browser. Tidak ada URL/hasil yang dikarang. Tidak ada secret yang ditulis
> ke file mana pun.

---

## FINAL STATUS: ✅ DEPLOYMENT SUCCESSFUL

**Production URL (dari Vercel):** https://website-kelas-xtkj-bk.vercel.app
*(alias stabil; URL per-deployment terakhir: `https://website-kelas-xtkj-k29qxcdyo-apx3355-bot.vercel.app`)*

---

## Deployment Stack

| Komponen | Nilai |
|---|---|
| Hosting / Web App | **Vercel** (Next.js 15.5.26 App Router, Node serverless) |
| Database | **Supabase PostgreSQL** — project `web-kelas-xtkj-bk`, ref `fsqisbdjmqgrygmtqtbw`, region `ap-southeast-1` |
| Authentication | Session cookie aplikasi sendiri (HttpOnly + HMAC `SESSION_SECRET` + tokenVersion) via API routes — **bukan Supabase Auth** (tidak diganti/diduplikasi; Supabase Auth memang belum pernah dipakai project ini sejak Phase 3) |
| ORM / Koneksi | Prisma 6 — pooled URL (PgBouncer 6543) untuk runtime, direct URL (5432) untuk migrasi |
| Storage | Belum dipakai (upload galeri masih filesystem lokal — tercatat sebagai keterbatasan) |

## Vercel

| Item | Status | Keterangan |
|---|---|---|
| Build | ✅ PASS | `next build` lokal 0 error lalu deploy; framework `nextjs` |
| Deployment | ✅ PASS | `npx vercel --prod` → Ready; alias `website-kelas-xtkj-bk.vercel.app` |
| Environment variables | ✅ PASS | `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` production (tersimpan sebagai secret, hidden) |
| Routing | ✅ PASS | Halaman publik 200, `/dashboard` guest 307, API berfungsi |
| Deployment Protection | 🔧 FIXED | SSO protection default mengunci situs (semua 302 ke `vercel.com/sso-api`) — dinonaktifkan via Project API |
| Framework setting | 🔧 FIXED | Pernah terpolusi ke `services` oleh `vercel.json` asing — di-reset ke `nextjs` via API |

## Supabase

| Item | Status | Keterangan |
|---|---|---|
| Project | ✅ PASS | Dibuat via MCP (free tier, $0/bulan), status `ACTIVE_HEALTHY` |
| Database schema | ✅ PASS | 9 tabel + 8 index + 7 FK ter-apply via `apply_migration` (`init_schema`) |
| RLS | ✅ PASS | `ENABLE ROW LEVEL SECURITY` di **semua 9 tabel** |
| Policies | ✅ PASS | 1 policy per tabel: `FOR ALL TO app_webkelas` saja — role **anon/authenticated/public tetap default-deny** (tidak ada policy longgar "agar bisa jalan"). Aplikasi mengakses DB lewat role privat `app_webkelas` (least-privilege, bukan superuser postgres) |
| Seed production | ✅ PASS | 3 akun (developer/walikelas/anggota, password acak baru — bukan password lama yang terekspos riwayat Git), profiles, class members, settings (kuota 36, registrasi terbuka) |
| Storage | ⚠️ PARTIAL | Belum diintegrasikan — upload galeri berfungsi lokal tapi tidak di Vercel (filesystem ephemeral). Sesuai instruksi: tidak membuat fitur Storage baru mendadak; tercatat untuk fase berikutnya |
| Security advisor | ✅ PASS | `get_advisors(security)` → **0 temuan** |

## Security (production check)

| Skenario | Hasil |
|---|---|
| Login 3 role (kredensial benar) | ✅ 200/200/200 |
| Password salah | ✅ 401 |
| Role mismatch (murid sebagai Developer) | ✅ 403 |
| Murid → `/api/settings`, `/api/users` | ✅ 403 |
| Wali → `/api/activity-logs` | ✅ 403 |
| Anonim → `/api/activity-logs` | ✅ 401 |
| Murid → halaman `/dashboard/settings` | ✅ dirender "ACCESS DENIED" (bukan form settings) |
| Guest → `/dashboard` | ✅ 307 |
| Logout → replay cookie | ✅ 401 |
| RLS bypass via koneksi langsung | ✅ role `app_webkelas` hanya melewati RLS via policy; anon/authenticated tanpa akses (teruji saat debugging koneksi) |
| Service-role key / secret di bundle | ✅ tidak ada — scan bundle client bersih; DB credential hanya di server env Vercel |
| Password lama yang terekspos riwayat Git | ✅ **tidak dipakai** di production — semua akun memakai password acak baru |

## Production Testing

| Kategori | Hasil |
|---|---|
| Homepage `/` | ✅ 200 + render utuh (screenshot browser: hero TKJ, system status `API Operational / Database Connected` real) |
| `/login`, `/galeri`, `/anggota`, `/struktur`, `/tentang` | ✅ 200 semua |
| `/robots.txt` | ✅ Disallow `/dashboard`, `/api` |
| CSS/assets | ✅ 200 |
| Dashboard per role | ✅ developer 200; akses terlarang = ACCESS DENIED |
| Database CRUD | ✅ announcement create (id=2) → read-back ada → delete; sequence & FK bekerja di Supabase |
| Quota | ✅ `register-status` benar; register murid baru sukses → kuota 1→2 ter-update dari Postgres |
| Activity log | ✅ tercatat di Postgres production: LOGIN(6), LOGIN_FAILED(4), LOGIN_ROLE_MISMATCH, ANNOUNCEMENT_CREATE(2), REGISTRATION, LOGOUT |
| Responsive | ✅ browser production tanpa horizontal overflow |
| Console | ✅ tanpa error penting |
| Data uji dibersihkan | ✅ kembali: 3 user, 0 announcement, 2 settings |

## Bugs / Hambatan Ditemukan & FIXED

| # | Masalah | Akar masalah | Perbaikan |
|---|---|---|---|
| 1 | Semua request production → 302 ke `vercel.com/sso-api` | Vercel Deployment Protection (SSO) default aktif | Nonaktif via Project API (`ssoProtection: null`) |
| 2 | 500 `FUNCTION_INVOCATION_FAILED` + log mengeksekusi `auth.cjs`/`server.cjs` asing | Folder `.kilo/` (worktree tool lain berisi project berbeda) ikut ter-upload & Vercel menjalankan entrypoint-nya | `.vercelignore` dibuat + `.gitignore` ditambah `.kilo`/`.vercel` |
| 3 | Build gagal: `Service "acidic-barnacle" has entrypoint "server.js"` | `vercel.json` asing (dengan `services`) muncul di root saat deploy tadi | File dihapus; setting framework project di-reset ke `nextjs` via API |
| 4 | "Vulnerable version of Next.js detected" → halaman interstitial | Next.js 15.3.3 dianggap rentan oleh Vercel | Upgrade **next 15.3.3 → 15.5.26** + `eslint-config-next`; build & smoke test ulang lulus |
| 5 | Prisma lokal error "URL must start with file:" | Schema masih sqlite saat DATABASE_URL sudah Postgres | Switch permanen `provider = "postgresql"` + `directUrl` di schema (satu sumber kebenaran) |
| 6 | `no tenant identifier` di pooler | Username pooler Supabase butuh format `<user>.<project-ref>` | Connection string diperbaiki (lokal + Vercel) |
| 7 | Prisma via pooler mengembalikan 0 baris | Role DB baru bukan owner → RLS default-deny memblokir | Policy RLS eksplisit `TO app_webkelas` di semua tabel |

## Files Changed (Phase 9)

| File | Perubahan |
|---|---|
| `prisma/schema.prisma` | 🔧 provider `postgresql` + `directUrl` |
| `prisma/migrations/0_init/migration.sql` | (dibuat Phase 8) di-apply ke Supabase |
| `package.json` / `package-lock.json` | 🔧 next & eslint-config-next 15.5.26 |
| `.vercelignore` | 🆕 exclude `.kilo`, `.env`, dll. |
| `.gitignore` | 🔧 +`.kilo`, `.vercel` |
| `.env.example` | 🔧 format Supabase pooled/direct (tanpa secret) |
| `.env` | 🔧 DATABASE_URL/DIRECT_URL Supabase (lokal, di-gitignore) |
| `DEPLOYMENT.md` | 🔧 arsitektur & langkah aktual Vercel+Supabase, troubleshooting baru |
| `PRODUCTION_CHECKLIST.md` | 🔧 item deployment dicentang berdasarkan hasil nyata |
| `PHASE_9_DEPLOYMENT_REPORT.md` | 🆕 file ini |

**Database (Supabase)**: dibuat `init_schema` (9 tabel/index/FK), `enable_rls_lockdown`, policy `app_full_access TO app_webkelas` (applied via migration), role `app_webkelas`, seed 3 akun + settings. Tidak ada data production yang dihapus; semua data uji dibersihkan.

## Environment Variables (produksi, di Vercel)

`DATABASE_URL` (pooled), `DIRECT_URL` (direct), `SESSION_SECRET` (acak baru) — semua hidden/secret, tidak masuk Git. `SEED_*_PASSWORD` tidak disimpan di Vercel (seed dieksekusi terkontrol; password hanya di tangan pemilik).

## Kredensial (handoff — TIDAK ditulis di file)

Password production untuk akun `developer`, `walikelas`, `anggota` dibuat acak di sesi ini dan **hanya ditampilkan satu kali di terminal**. Jika belum tersimpan, reset via dashboard Developer (User Management → Reset Password) atau seed ulang.

## Remaining / Future

- Object storage galeri (Supabase Storage) agar upload berfungsi di Vercel.
- Ganti password akun seed via dashboard oleh pemilik (rotation policy).
- Custom domain + jadwal backup.
- (Opsional) migrasi auth ke Supabase Auth jika diinginkan nanti — saat ini tidak diperlukan.

**PHASE 9 SELESAI — STOP, tidak memulai Phase 10.**
