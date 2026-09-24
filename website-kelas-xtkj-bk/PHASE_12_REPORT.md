# PHASE 12 REPORT — ACADEMIC & CLASS MANAGEMENT

**Tanggal:** 24 September 2026
**Stack:** Next.js 15.5 (App Router) + Prisma 6 + PostgreSQL Supabase + Vercel
**Dokumentasi teknis:** `ACADEMIC_SYSTEM.md`

## Status Phase 12: ✅ SELESAI

| Komponen | Status |
|---|---|
| Materials/Resources | ✅ PASS |
| Assignments/Tugas | ✅ PASS |
| Submissions | ✅ PASS |
| Grading/Nilai | ✅ PASS |
| Class Schedule (integrasi) | ✅ PASS |
| Academic Dashboard | ✅ PASS |
| Notification Integration | ✅ PASS |
| Supabase Database + RLS | ✅ PASS |
| Developer Account (§12–13) | ✅ PASS |
| Production build + deploy | ✅ PASS |

## Fitur yang Dibuat

1. **Materials** — CRUD + search insensitive + filter subject + lampiran file (magic bytes) + link eksternal + status PUBLISHED/DRAFT. Wali = miliknya saja; Developer = semua; Anggota = read PUBLISHED + unduh lampiran.
2. **Assignments** — CRUD + deadline validation (wajib masa depan) + scope Aktif/Lewat Deadline + lampiran + notifikasi.
3. **Submissions** — kumpul/revisi (unique per murid per tugas), `isLate` server-side, kunci setelah dinilai (409), file ≤3 MB tervalidasi, ownership ketat (murid tak bisa lihat submission orang lain / unduh file-nya).
4. **Grading** — nilai 0–100 + feedback, tercatat `gradedById/gradedAt`, notifikasi GRADE ke murid, murid 403.
5. **Schedule** — sistem Phase 3 dipertahankan; ditambah notifikasi saat create/update.
6. **Academic Dashboard** — `AcademicSummary` server component di bawah dashboard ketiga role (anggota: tugas aktif/belum dikumpulkan/materi/nilai terbaru; wali & developer: total/aktif/submission/belum dinilai + deadline terdekat).
7. **Notifications** — tipe baru MATERIAL, ASSIGNMENT, SUBMISSION, GRADE, SCHEDULE memakai sistem Phase 11 (fan-out anti-spam, self-notify dilewati, draft tidak menotifikasi).

## Developer Account (§12–13)

- Username: `developer` · Role: DEVELOPER · 1 akun (unik)
- Initial password (user-instruksi) di-set **hash bcrypt** langsung ke DB via script one-shot yang dihapus setelah dipakai — password tidak pernah masuk source/git/report/bundle.
- Login 200 ✓ → redirect `/dashboard` ✓ → role terbaca DEVELOPER ✓ → permission sesuai matrix ✓ → logout ✓ → session replay 401 ✓ → login ulang ✓.
- Mekanisme ganti password tersedia (halaman Profil, Phase 10).

## Database Changes

Migration `prisma/migrations/20260924150000_academic_system/migration.sql` (di-apply ke Supabase production via `apply_migration`):
- Tabel `Material`, `Assignment`, `Submission` (kolom lengkap di ACADEMIC_SYSTEM.md)
- FK: author→User (RESTRICT), assignment (CASCADE), student→User (CASCADE), gradedBy→User (SET NULL)
- Unique `Submission(assignmentId, studentId)`; 3 index query
- RLS enabled + policy `app_full_access` (role privat `app_webkelas`) + GRANT DML/sequences
- **Security advisor: 0 temuan**

## Storage Changes

Tidak ada bucket baru (konsisten keputusan Phase 10; tidak ada tool Storage MCP). Lampiran disimpan base64 di DB dengan batas ketat (materi/tugas ≤2 MB, submission ≤3 MB) + download ber-permission. Supabase Storage = FUTURE IMPROVEMENT.

## RLS/Security Changes

Policy baru 3 tabel (pola existing, tanpa allow-all); GRANT eksplisit; validasi magic bytes; ownership server-side; guest 401; role escalation via API ditolak.

## Testing Result

| Suite | Hasil | Lingkup |
|---|---|---|
| Matrix akademik HTTP (lokal) | **35/35 PASS** | login 3 role, CRUD, permission 403/401, deadline validasi, EXE ditolak, isLate, revisi/lock, grade bounds, notifikasi, search, cleanup |
| §13 Developer security (lokal) | **9/9 PASS** | login, dashboard, role, permission, ACCESS DENIED murid, escalation, logout, replay, login ulang |
| Matrix akademik (production Vercel) | **35/35 PASS** | sama, di https://website-kelas-xtkj-bk.vercel.app |
| §13 (production) | **9/9 PASS** | sama |
| tsc --noEmit | 0 error | |
| eslint | 0 warning baru (1 warning pre-existing di NotificationBell) | |
| next build | exit 0 (38 halaman) | |
| Visual browser | landing, login, tugas (empty→kumpul→terkumpul→nilai), dashboard anggota + AcademicSummary, mobile 320px overflow 0 | |

## Bugs Ditemukan & Diperbaiki

1. **Proses** (HIGH) — saya sempat menimpa API jadwal Phase 3; **dipulihkan dari Git** dan diintegrasikan lewat penambahan notifikasi saja.
2. **`params` Promise Next 15** (HIGH) — 12 error TS di route `[id]` baru; fix `await params` di semua handler.
3. **Narrowing TS** — `role === "ANGGOTA"` di ternary nested materials; refactor ke `const isAnggota`.
4. **Modal tugas tak dirender** (MED) — state modal ada tapi UI-nya hilang di penulisan awal; ditambahkan + tombol Edit/Hapus/Submission untuk grader.
5. **Style `.agenda-tabs` ter-scope halaman Agenda** (MED) — pola bug Phase 11 berulang; dipindah ke DashCSS global.
6. **Password seed usang** (MED) — `.env` berisi password lama yang sudah dirotasi Phase 9; reset via script one-shot (nilai hanya di memori/DB, file dihapus).
7. Rate limiter login menembak test beruntun (429) — expected behavior, bukan bug; test diulang setelah window reset.

## Issue yang Masih Ada / Remaining

- Lampiran tersimpan di DB (base64) — batas 2–3 MB; untuk file besar → Supabase Storage (future).
- Notifikasi "deadline mendekat" (cron/hari-H) belum ada — butuh scheduler, di luar scope.
- Warning eslint pre-existing: `setLoading` di NotificationBell (Phase 11, kosmetik).
- Kolom `Notification.type` bertipe string bebas — tipe baru tidak butuh migration, tapi pembatasan enum bisa jadi hardening nanti.

## Blocked Items

Tidak ada.

## Deployment Compatibility

- **Build produksi sukses** → **deploy ke Vercel sukses** (`Production: https://website-kelas-xtkj-78dyrricz-apx3355-bot.vercel.app`, alias stabil `https://website-kelas-xtkj-bk.vercel.app` terverifikasi `/api/health` = `{"status":"ok","database":"connected"}`).
- Tidak ada env var / dependency baru; tidak ada filesystem; kompatibel serverless penuh.
- Migration sudah applied di Supabase production; data uji production dibersihkan (0 materi/0 tugas uji tersisa).

## Files Changed / Created

**Baru:**
- `src/lib/fileValidation.ts` — validasi magic bytes dokumen
- `src/app/api/materials/route.ts`, `src/app/api/materials/[id]/route.ts`, `src/app/api/materials/[id]/file/route.ts`
- `src/app/api/assignments/route.ts`, `src/app/api/assignments/[id]/route.ts`, `src/app/api/assignments/[id]/file/route.ts`, `src/app/api/assignments/[id]/submissions/route.ts`
- `src/app/api/submissions/[id]/file/route.ts`, `src/app/api/submissions/[id]/grade/route.ts`
- `src/app/dashboard/materi/page.tsx`, `src/app/dashboard/tugas/page.tsx`
- `src/app/dashboard/AcademicSummary.tsx`
- `prisma/migrations/20260924150000_academic_system/migration.sql`
- `ACADEMIC_SYSTEM.md`, `PHASE_12_REPORT.md`

**Diubah:**
- `prisma/schema.prisma` — 3 model baru
- `src/lib/roles.ts` — permission materials/assignments/submissions (+action `grade` sebelumnya sudah ada)
- `src/app/dashboard/DashboardShell.tsx` — menu Materi & Tugas (3 role)
- `src/app/dashboard/page.tsx` — render AcademicSummary per role
- `src/components/Icons.tsx` — BookIcon, ClipboardIcon
- `src/components/dashboard/SharedUI.tsx` — style agenda-tabs global
- `src/app/api/schedules/route.ts`, `src/app/api/schedules/[id]/route.ts` — +notifikasi (perilaku existing dipertahankan)

## Rekomendasi Titik Awal Phase 13

1. Commit semua perubahan Phase 7–12 (masih uncommitted).
2. Supabase Storage untuk lampiran & galeri (hapus batas 2–3 MB, hemat DB).
3. Reminder deadline otomatis (cron/Vercel Scheduler) — notifikasi H-1.
4. Rekap nilai per murid (tabel nilai lengkap + ekspor CSV).
5. Auto-deploy Git→Vercel (saat ini deploy manual via CLI).
