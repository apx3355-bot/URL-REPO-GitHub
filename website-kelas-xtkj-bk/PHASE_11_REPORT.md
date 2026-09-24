# PHASE 11 — CLASS COMMUNICATION & INTERACTION REPORT

**Project:** web-kelas-xtkj-bk · **Tanggal:** 24 September 2026
**Status keseluruhan:** ✅ PASS (lokal + production live)

---

## Announcement

- **Status** — ✅ PASS. CRUD existing dipertahankan; **pin/unpin** baru (`pinned DESC` di urutan feed, badge PINNED, tombol pin; wali hanya miliknya — wali pin milik developer → 403 teruji), **search** baru (`?q=` insensitive), **notifikasi** pengumuman PUBLISHED baru ke semua user aktif (draft tidak menotifikasi; developer tidak self-notify — teruji).
- Detail pengumuman = kartu expandable di dashboard (pola existing dipertahankan, tanpa halaman duplikat).

## Discussion

- **Status** — ✅ PASS. Fitur penuh: posting (1–2000 char), balasan (1–1000 char, kedalaman 1), author + avatar, hapus milik sendiri (semua role), moderasi milik orang lain (wali/developer → tercatat `DISCUSSION_MODERATE`), search, rate limit (5 post/menit, 10 balasan/menit → 429).
- Validasi teruji: kosong → 400, 2001 char → 400, guest → 401.

## Event

- **Status** — ✅ PASS. Agenda kelas: judul, deskripsi, tanggal, jam mulai/selesai, lokasi, pembuat; tab **Mendatang/Selesai** dihitung server-side; search; modal create/edit (developer & wali); delete. Validasi tanggal/jam regex teruji (400 untuk `31-12-2026` & `25:99`). Notifikasi agenda baru terkirim (notified=2).

## Notification

- **Status** — ✅ PASS. In-app: `Notification` (userId, type, message ≤200, link, targetType/targetId, isRead, createdAt) + index `(userId, isRead, createdAt DESC)`. Fan-out helper anti-spam (maks 50 penerima, exclude pembuat, best-effort). API self-only (PATCH milik orang lain → 404), mark one/all. UI bell: badge unread, dropdown, polling 60s, klik → read + navigasi. Terverifikasi E2E: announcement → bell anggota menyala; reply diskusi → pemilik post dinotifikasi; event → semua dinotifikasi.

## Search

- **Status** — ✅ PASS. Pengumuman (title+content), diskusi (content), agenda (title+description+location) — semua `contains insensitive` (🔧 awalnya case-sensitive di Postgres sehingga `praktik` tidak menemukan `Praktik`; diperbaiki). Empty result & invalid input teruji.

## Moderation

- **Status** — ✅ PASS. Matrix lengkap di `CLASS_COMMUNICATION.md`. Anggota: hanya hapus miliknya (403 untuk milik orang lain — teruji post & reply). Wali/developer: moderasi diskusi tercatat di activity log. Role tidak bisa diubah via request (warisan Phase 5–10, tetap teruji 403).

## Supabase / Database Changes

- **4 tabel baru**: `DiscussionPost`, `DiscussionReply`, `ClassEvent`, `Notification` (+ kolom `Announcement.pinned`) via migration `20260924140000_class_communication` (applied ke Supabase; file SQL ada di repo).
- **4 index baru** + 5 FK (semua `ON DELETE CASCADE` kecuali tidak ada SetNull yang dibutuhkan).
- **RLS** di 4 tabel baru + policy `app_full_access FOR ALL TO app_webkelas` (pola Phase 9); **Supabase security advisor: 0 temuan**.
- Data uji dibersihkan sepenuhnya (lokal & production: 0 post/event/announcement/notif sisa).

## RLS / Security Changes

- 🔧 **GRANT DML + sequences** untuk `app_webkelas` pada 4 tabel baru — tanpa ini Prisma mendapat `permission denied for table Notification` (tabel dari migration baru dimiliki `postgres`; tabel Phase 9 di-GRANT manual saat setup). Ini bug deploy yang ditemukan & diperbaiki saat testing nyata.
- Rate limit per-user untuk diskusi; ID path divalidasi; notifikasi self-only; tidak ada secret di payload/log.

## UI Changes

- **Halaman baru**: `/dashboard/discussions` (feed + composer + reply inline + search), `/dashboard/agenda` (tab Mendatang/Selesai + search + modal form).
- **Upgrade**: `/dashboard/announcements` (+ pin button, badge PINNED, search bar), bell notifikasi di topbar semua role.
- **Sidebar** per role: Diskusi & Agenda untuk semua role; tanpa menu baru untuk aksi yang tidak boleh.
- **Shared style**: search bar & header-row dipindah ke `DashCSS` (🔧 fix: style ter-scope per halaman membuat Agenda tak bergaya saat diakses langsung).

## Testing Results

| Area | Lokal | Production |
|---|---|---|
| Announcement (create+notif, pin, unpin ownership, search, empty) | ✅ | ✅ |
| Discussion (post/reply/delete own, moderasi, rate-limit ready, validasi) | ✅ | ✅ |
| Event (CRUD, permission, upcoming/past, search, validasi) | ✅ | ✅ |
| Notification (fan-out, self-only, mark one/all, unreadCount) | ✅ | ✅ |
| Security (guest 401, anggota 403, ownership, self-only) | ✅ | ✅ |
| Halaman render + sidebar + bell | ✅ | ✅ |
| Visual browser (desktop + mobile 320px, overflow 0) | ✅ | — |
| tsc / lint / build | ✅ 0 / 0 / sukses (38 halaman) | ✅ deploy Ready 1m |

Test matrix Phase 11: **45/45 PASS lokal**; **39/39 produksi lulus** sebelum 1 koneksi transien terputus (bukan kegagalan aplikasi — rerun bagian halaman & health → semua PASS).

## Production Verification

- Deploy: `npx vercel deploy --prod` → ✅ Ready, alias **https://website-kelas-xtkj-bk.vercel.app**.
- Smoke test langsung ke production URL: seluruh CRUD/permission/notifikasi lulus; `/api/health` → `database: connected`.
- Migration di-apply ke Supabase production via `apply_migration` (bukan db push).

## Bugs Found & Fixed

| # | Severity | Bug | Fix 🔧 |
|---|---|---|---|
| 1 | **HIGH** | `permission denied for table Notification` — semua operasi notifikasi 500 di production DB | GRANT `SELECT,INSERT,UPDATE,DELETE` + `USAGE,SELECT` sequences pada 4 tabel baru untuk `app_webkelas`; file migration diperbarui agar setup baru benar |
| 2 | LOW | Search case-sensitive (`praktik` ≠ `Praktik`) | `mode: "insensitive"` di 3 endpoint search |
| 3 | LOW | Halaman Agenda tanpa gaya search/header saat diakses langsung (style ter-scope di halaman Diskusi) | Style bersama dipindah ke `DashCSS` global |
| 4 | LOW | TS2345 NotificationBell (argumen salah tipe) + unused import | Diperbaiki saat typecheck |

## Remaining Issues

1. Perubahan Phase 7–11 **belum di-commit** ke Git.
2. Rate limiter tetap in-memory (single-instance) — catatan desain.
3. Notifikasi in-app saja (tanpa email/push) — sesuai batas "jangan spam / jangan realtime kompleks".
4. Warning lint pre-existing `anggota/AnggotaClient.tsx` (Phase 2).
5. Galeri full-size tetap butuh Supabase Storage (warisan Phase 9–10, di luar scope Phase 11).

## Files Changed

**Baru**: `prisma/migrations/20260924140000_class_communication/migration.sql`, `src/lib/notify.ts`, `src/app/api/discussions/route.ts`, `src/app/api/discussions/[id]/route.ts`, `src/app/api/discussions/[id]/replies/route.ts`, `src/app/api/events/route.ts`, `src/app/api/events/[id]/route.ts`, `src/app/api/notifications/route.ts`, `src/app/dashboard/discussions/page.tsx`, `src/app/dashboard/agenda/page.tsx`, `src/components/NotificationBell.tsx`, `CLASS_COMMUNICATION.md`, `PHASE_11_REPORT.md`
**Diubah**: `prisma/schema.prisma` (+4 model, +pinned), `src/lib/roles.ts` (+discussions/events matrix), `src/app/api/announcements/route.ts` (pin, search, notif), `src/app/api/announcements/[id]/route.ts` (pinned), `src/app/api/gallery/[id]/route.ts` (notifikasi moderasi), `src/app/dashboard/DashboardShell.tsx` (menu + bell), `src/app/dashboard/announcements/page.tsx` (pin UI + search), `src/components/dashboard/SharedUI.tsx` (shared search style), `src/components/Icons.tsx` (+Bell/Search/Pin/CalendarPlus/Message)
**Database**: 4 tabel + pinned column + RLS + GRANT (production Supabase, applied via migration).

## Recommended Starting Point Phase 12

1. **Commit seluruh perubahan Phase 7–11** (paling mendesak).
2. Supabase Storage untuk galeri (prasyarat fitur upload di Vercel).
3. `vercel git connect` untuk auto-deploy + CI ringan (tsc/lint/build).
4. Opsional: polling notifikasi → SSE/websocket bila nanti dibutuhkan realtime; email digest mingguan.
5. Opsional: halaman notifikasi penuh (arsip >30 item) jika volume naik.

**STOP** — Phase 12 tidak dimulai, menunggu instruksi.
