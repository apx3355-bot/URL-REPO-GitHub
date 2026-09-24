# PHASE 6 PROGRESS — CHECKPOINT

**Project:** web-kelas-xtkj-bk (Website Kelas X TKJ BK)
**Tanggal checkpoint:** 23 September 2026
**Dibuat setelah:** Phase 6 selesai + rate limiting (hardening post-Phase 6) + dokumentasi deployment

> Dokumen ini ditulis agar AI agent / developer lain bisa melanjutkan pekerjaan
> besok TANPA mengulang audit Phase 1–6. Semua status di bawah berdasarkan
> pengujian nyata (API via curl, browser preview, tsc/lint/build), bukan asumsi.
> TIDAK ada secret/password asli di file ini — kredensial seed ada di `.env`.

---

## Phase 6 Progress

## Status

**COMPLETED** — seluruh target Phase 6 (role dashboard, control panel, quota & permission management) selesai, teruji, dan production build sukses. Ada satu tambalan kecil post-Phase 6 (rate limiting) yang sudah selesai tapi **belum di-commit**.

---

## Completed

**Semua fitur Phase 1–5 tetap berjalan (regression lulus):**

- Landing page TKJ (dark default + light theme + switcher), halaman publik `/anggota`, `/struktur`, `/galeri`, `/tentang` — semua 200
- Auth: login dengan role selector + verifikasi role di backend, logout dengan invalidasi sesi
- RBAC server-side (`requirePermission` di semua API), guard layout halaman admin
- CRUD lengkap: announcements, members, structure, schedules
- Gallery: upload murid → PENDING → approve/reject (dev/wali) → APPROVED tampil publik; validasi magic bytes, maks 5 MB, filename disanitasi; thumbnail via `/api/gallery/thumb/[id]`

**Fitur baru Phase 6 (semua teruji):**

- **Settings system**: tabel `Setting` (key-value) + API `GET/PUT /api/settings` (developer-only) + halaman `/dashboard/settings` (kuota max + statistik real-time max/registered/remaining/status + progress bar + toggle registrasi publik + modal konfirmasi sebelum simpan)
- **Member quota**: divalidasi di backend dua lapis (pre-check + di dalam transaksi `prisma.$transaction` anti race condition); register ditolak saat penuh dengan pesan `"Kuota anggota kelas saat ini sudah penuh."`; status publik via `GET /api/register-status`
- **User Management upgrade**: `GET /api/users?search=&role=&status=`, `POST` create akun Wali/Developer/Murid (jalur resmi akun ber-privilege), `PATCH` ubah role/status/reset password (reset bump tokenVersion → semua sesi target logout); UI dengan search debounce, filter, modal konfirmasi & modal reset password
- **Developer dashboard**: statistik Total Users/Murid/Wali/Developer, Pending Galeri, card Member Quota, shortcut User Management & Settings
- **Sidebar per role** sesuai spec Phase 6 §3 (Developer 9 item, Wali 8, Murid 7 — termasuk Beranda & Settings) + modal konfirmasi logout + `window.location.replace` (anti back-button cache)
- **Session tokenVersion**: cookie kini `<userId>.<expiresAtMs>.<tokenVersion>.<hmac>`; logout & reset password bump version → token lama invalid (teruji: replay cookie lama → 401, `/dashboard` → 307)
- **Activity log events baru**: `SETTINGS_QUOTA_CHANGE`, `SETTINGS_REGISTRATION_CHANGE`, `USER_CREATED`, `ROLE_CHANGE`, `USER_STATUS_CHANGE`, `PASSWORD_RESET`, `REGISTRATION`, `LOGOUT`, `LOGIN`, `LOGIN_FAILED`
- **Guard layout** `/dashboard/settings` (server-side, hanya DEVELOPER; murid/wali lihat ACCESS DENIED — teruji)
- **Error/empty/loading states** di semua halaman baru; responsive teruji 320px–1280px

**Hardening post-Phase 6 (selesai, BELUM di-commit):**

- **Rate limiting** (`src/lib/rateLimit.ts`): login 10/menit per-IP + 5/5-menit per-username (429 + Retry-After); register 3/menit per-IP. Teruji: attempt 6–12 login → 429, register ke-4 → 429, window reset → normal kembali, login valid dari IP ter-limit → tetap 200. In-memory (single-instance); interface generik siap ditukar ke Redis untuk multi-instance.

**Dokumentasi:**

- `docs/DEPLOYMENT.md` (baru): Vercel+Postgres, VPS+SQLite/Postgres, PM2, Nginx, certbot, seed production, backup/recovery, troubleshooting — README sudah tertaut

---

## In Progress

- **Tidak ada** yang setengah jadi. Semua yang dimulai sudah selesai.

---

## Not Completed

- **Commit terakhir**: perubahan rate limiting + `docs/DEPLOYMENT.md` + update README **belum di-commit** (lihat Files Changed). Commit Phase 1–6 snapshot: `46ac891`.
- Fitur di luar scope Phase 6 (sengaja TIDAK dikerjakan, jangan mulai tanpa instruksi):
  - Object storage untuk galeri (Supabase Storage/S3) — upload masih filesystem lokal
  - Email notifikasi reset password / verifikasi email
  - Manajemen "informasi kelas" dinamis via Settings (nama sekolah dll masih data statis Phase 1 + dashboard)
  - Rate limit store terdistribusi (Redis/Upstash) untuk multi-instance
  - User Management: edit nama/profil user lain (hanya role/status/reset password yang ada)

---

## Known Bugs

**Tidak ada bug terbuka.** Catatan perilaku (bukan bug, sudah dikonfirmasi by-design):

1. **Tabel User Management di viewport super sempit (~310px)**: kolom aksi (Reset Password/Nonaktifkan) terpotong sampai di-scroll — konsekuensi pola horizontal-scroll `.dash-table-wrap`. Halaman tidak overflow; hanya UX minor. Kandidat perbaikan: card view mobile.
2. **Rate limiter in-memory** tidak dibagi antar instance serverless (efektif di single server/VPS; di Vercel multi-instance tetap memperlambat brute force per-instance saja).
3. **Vercel filesystem ephemeral**: file upload galeri hilang saat redeploy (butuh object storage untuk deploy Vercel).

**Bug yang ditemukan & sudah diperbaiki selama Phase 6** (untuk konteks):
- Middleware edge masih verifikasi token 3-bagian setelah token jadi 4-bagian → semua `/dashboard` ter-redirect. Fixed di `src/middleware.ts`.
- Prisma client lama di memori dev server → `Unknown field tokenVersion` 500. Fixed dengan `prisma generate` + restart server.
- Koma ganda di `roles.ts` saat edit → TS1136. Fixed.
- `next build` menimpa cache dev → halaman kosong (chunks 404). Bukan bug kode; fix dengan hapus `.next` + restart dev server.

---

## Files Changed

**Phase 6 (sudah masuk commit `46ac891`):**

Baru:
- `src/lib/settings.ts` — helper settings + `getQuotaStatus()`
- `src/app/api/settings/route.ts` — GET/PUT settings (developer-only)
- `src/app/api/stats/route.ts` — statistik sistem (developer-only)
- `src/app/api/register-status/route.ts` — status publik registrasi & kuota
- `src/app/dashboard/settings/page.tsx` — halaman Settings
- `src/app/dashboard/settings/layout.tsx` — guard DEVELOPER

Diubah:
- `prisma/schema.prisma` — +model `Setting`, +`User.tokenVersion`
- `src/lib/roles.ts` — +`settings: ["read","update"]` (DEVELOPER), +`users: "create"`, +`settings: []` (Wali/Murid)
- `src/lib/session.ts` — format token 4-bagian dengan tokenVersion
- `src/middleware.ts` — verifikasi format token baru
- `src/app/api/auth/login/route.ts`, `logout/route.ts` (bump tokenVersion), `register/route.ts` (quota + transaksi)
- `src/app/api/users/route.ts` — rewrite: GET search/filter, POST create, PATCH update/reset
- `src/app/dashboard/DashboardShell.tsx` — menu per role spec §3, modal konfirmasi logout
- `src/app/dashboard/page.tsx`, `DeveloperDashboard.tsx` — statistik + card quota
- `src/app/dashboard/users/page.tsx` — rewrite UI lengkap
- `src/app/register/RegisterForm.tsx` — status kuota/registrasi ditutup
- `README.md` — bagian Settings & Quota, matrix permission update

**Belum di-commit (uncommitted):**

- `src/lib/rateLimit.ts` (baru) — rate limiter
- `src/app/api/auth/login/route.ts` (diubah) — rate limit login
- `src/app/api/auth/register/route.ts` (diubah) — rate limit register
- `docs/DEPLOYMENT.md` (baru) — dokumentasi deployment
- `README.md` (diubah) — link ke docs/DEPLOYMENT.md
- `PHASE_6_PROGRESS.md` (baru — file ini)
- `tsconfig.tsbuildinfo` (incidental, build artifact)

---

## Database Changes

- **Tabel baru `Setting`**: `key (PK)`, `value`, `updatedAt`, `updatedBy (FK User, SetNull)`
- **Kolom baru `User.tokenVersion Int @default(0)`**
- Diterapkan via `prisma db push` (bukan migrate folder — SQLite lokal). Data existing aman.
- Data settings saat ini: `member_quota_max = "36"`, `registration_open = "true"` (hasil test dikembalikan ke default)
- Data user: 4 akun (developer, walikelas, anggota, murid2) — test accounts sudah dibersihkan
- **Untuk production Postgres**: ganti `provider = "postgresql"` di schema (satu baris) → `prisma db push` / `migrate deploy`. Panduan lengkap di `docs/DEPLOYMENT.md` §2.

---

## Authentication & Authorization

- Session cookie: HttpOnly, SameSite=Lax, Secure di production, HMAC-SHA256 (`SESSION_SECRET`), TTL 7 hari, **format 4-bagian dengan tokenVersion**
- `getSessionUser()` memverifikasi signature + expiry + **tokenVersion vs DB** + isActive + role valid
- Logout: bump tokenVersion → hapus cookie → cookie lama tidak bisa replay (teruji)
- Reset password (oleh developer): hash baru + bump tokenVersion → semua sesi target mati
- Login: error generik anti-enumeration, timing konsisten, verifikasi `expectedRole` vs DB (mismatch → 403 + log `LOGIN_ROLE_MISMATCH`)
- Origin check (anti-CSRF dasar) di login & register
- **Rate limit**: login 10/menit/IP + 5/5-menit/username; register 3/menit/IP → 429 + Retry-After
- Registrasi publik hanya role ANGGOTA (hardcode server-side); akun Wali/Developer hanya via User Management (developer) atau seed
- Permission matrix source of truth: `src/lib/roles.ts`; ditegakkan via `requirePermission` + guard layout
- Security matrix Phase 6 teruji semua 403/401 sesuai harapan (murid→settings/users/create-dev, wali→settings, guest→stats, murid ubah role sendiri)

---

## Quota System

- Tersimpan di `Setting.member_quota_max` (default 36); dihitung atas akun role ANGGOTA **aktif** (dev/wali tidak dihitung)
- Register: cek `registration_open` → cek kuota (pre-check) → username unik → **transaksi**: count ulang + create (anti race; SQLite single-writer)
- Kuota penuh → 403 `"Kuota anggota kelas saat ini sudah penuh."`
- Create akun murid via User Management juga menghormati kuota
- UI: Settings page (edit + statistik + progress bar), register page (status via `/api/register-status`), developer dashboard (card quota read-only)
- Teruji: kuota=2 + 2 murid → register ke-3 ditolak; kuota dinaikkan → sukses; toggle tutup/buka registrasi → ditolak/sukses

---

## Dashboard & Navigation

- Layout shell: sidebar desktop + drawer mobile (animasi slide), topbar dengan nama + badge role berwarna
- Menu per role (spec §3): Developer = Dashboard, User Management, Members, Struktur Kelas, Pengumuman, Jadwal, Galeri, Activity Log, Settings; Wali = + Beranda, tanpa Users/Activity/Settings; Murid = subset read-only + Galeri
- Menu hiding hanya UX — akses langsung URL tetap ditolak server-side (guard layout users/activity/settings — teruji)
- Developer dashboard: 2 baris statistik + card Member Quota + 8 shortcut + pengumuman terbaru + activity log table
- Logout: modal konfirmasi → POST logout → `location.replace("/login?loggedOut=1")`

---

## Gallery

- Tidak berubah dari Phase 5, integrasi tetap jalan: upload murid → PENDING → approve/reject dev/wali → APPROVED publik
- Validasi upload: magic bytes (JPG/PNG/WEBP), maks 5 MB, filename `crypto.randomUUID`, disimpan `public/uploads/gallery/`
- Thumbnail: `/api/gallery/thumb/[id]` + `loading="lazy"`
- Keterbatasan deployment: butuh object storage untuk Vercel (lihat docs/DEPLOYMENT.md)

---

## Activity Log

- Semua aksi penting tercatat dengan `user, action, description, targetType?, targetId?`
- Action Phase 6 baru terverifikasi tercatat nyata: `SETTINGS_QUOTA_CHANGE`, `SETTINGS_REGISTRATION_CHANGE`, `USER_CREATED`, `ROLE_CHANGE`, `USER_STATUS_CHANGE`, `PASSWORD_RESET`, `REGISTRATION`, `LOGOUT`
- Status DB saat checkpoint (hitungan kumulatif): LOGIN:27, LOGIN_FAILED:10, REGISTRATION:7, ANNOUNCEMENT_CREATE:5, SETTINGS_*:8, LOGOUT:4, dst.
- Tidak ada password/token/secret yang dicatat (dicek: description hanya berisi username & nilai konfigurasi non-secret)
- Hanya DEVELOPER yang bisa baca (`requirePermission("activityLogs","read")` — 403 untuk role lain, teruji)

---

## Testing Results

**Terakhir dijalankan (semua NYATA, bukan klaim):**

| Test | Hasil |
|---|---|
| `npx tsc --noEmit` | 0 error |
| `npx next lint` | 0 error |
| `npx next build` (production) | ✅ sukses (middleware 33.6 kB) |
| Security matrix 10 skenario (S1–S10) | semua 403/401/200 sesuai harapan |
| Quota: penuh→403, tutup→403, buka→201 | lulus |
| Logout invalidation L1–L5 (termasuk replay cookie) | lulus |
| User mgmt: create wali 201, search, filter, reset password→login baru 200 | lulus |
| Regression halaman publik (/, /anggota, /struktur, /galeri, /tentang, /login, /register, /api/health) | semua 200 |
| Route protection (guest→dashboard 307; murid→users/settings ACCESS DENIED) | lulus |
| Rate limit login/register (12 attempt, 5 register) | 429 sesuai batas; window reset normal |
| Visual browser: Settings page (simpan kuota, toggle, success feedback), User Management (search live, tabel, desktop+320px), Developer dashboard baru | terverifikasi via screenshot/snapshot |
| `/api/health` | `{"status":"ok","database":"connected"}` |

Data uji sudah dibersihkan (user `rltest*`, `testsuccess`, `wali_test_p6` dihapus; kuota dikembalikan 36).

---

## Remaining Tasks

**Segera (melanjutkan pekerjaan ini):**

1. **Commit perubahan yang belum ter-commit** (rate limiting + docs + checkpoint file). Pesan disarankan: `Add rate limiting to auth endpoints and deployment docs`.
2. Opsional: perbaiki tabel User Management di layar sempit (card view mobile).

**Menunggu keputusan/instruksi (jangan kerjakan tanpa diminta):**

- Object storage galeri (Supabase Storage/S3) — prasyarat deploy Vercel
- Rate limit store terdistribusi (Upstash Redis) — prasyarat multi-instance
- Migrasi ke Postgres production (panduan lengkap ada)
- Manajemen informasi kelas dinamis via Settings
- Email notifikasi reset password

---

## Next Starting Point

**Pekerjaan berhenti tepat setelah:** checkpoint ini dibuat. Kondisi terakhir:

- Dev server **masih berjalan** di `http://localhost:63789` (PID bisa cek `netstat -ano | grep 63789`), health OK, hot-reload aktif
- Semua kode Phase 6 + rate limiting **ada di disk dan berfungsi**; hanya rate limiting/docs/checkpoint yang belum di-commit
- Git: 1 commit project (`46ac891`), working tree berisi 6 file uncommitted (daftar di Files Changed)
- **Langkah pertama besok**: verifikasi server hidup (`curl http://localhost:63789/api/health`), lalu commit sisanya, ATAU langsung kerjakan task dari instruksi user berikutnya

---

## Important Notes

1. **Arsitektur kunci** (jangan dilanggar saat refactor):
   - Security selalu server-side: `requirePermission` di API + guard layout per halaman; menu hiding hanya UX
   - Session = stateless HMAC + `tokenVersion` di DB untuk invalidasi
   - Kuota divalidasi dua lapis dengan transaksi
   - Tidak ada dependency baru di Phase 6; icon/pattern SVG inline (performa)
2. **Restart dev server setelah edit `prisma/schema.prisma`**: `npx prisma generate` saja tidak cukup jika server jalan — kill proses, `npx prisma generate`, start ulang. Dan setelah `next build`, dev server harus di-restart dengan hapus `.next` (cache dev tertimpa → halaman kosong).
3. **Kredensial**: tidak ada secret di repo/checkpoint. Password seed ada di `.env` (`SEED_*_PASSWORD`), formatnya terdokumentasi di `.env.example`. Untuk melihat password seed saat testing, baca `.env` — jangan pernah menuliskannya ke file/commit.
4. **Akun seed**: `developer`, `walikelas`, `anggota`, `murid2` (4 user aktif). Kuota 36, registrasi terbuka.
5. **Windows environment**: gunakan `taskkill //PID <pid> //F` (double slash), Git Bash tersedia. `code_search` tool (ripgrep) bermasalah di environment ini — gunakan `grep` via terminal sebagai gantinya.
6. **Preview browser bridge** kadang tidak stabil (stale uid / interrupted) — re-snapshot sebelum klik; alternatif verifikasi: `curl` + grep HTML.
7. File `untitle.txt` di root project adalah file user (kosong) — jangan dihapus/diubah.
8. **Git repo root ada di `C:/Users/Lenovo/Desktop`** (bukan folder project) — commit project dengan `git -C "C:/Users/Lenovo/Desktop/website-kelas-xtkj-bk" ...` dan path-scoped `-- .`. File non-project di Desktop dibiarkan untracked.
9. **Batas Phase**: Phase 6 SELESAI. Jangan mulai Phase 7 / fitur baru tanpa instruksi eksplisit dari user.
