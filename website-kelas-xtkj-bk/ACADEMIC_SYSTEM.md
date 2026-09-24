# ACADEMIC SYSTEM — web-kelas-xtkj-bk

Dokumentasi sistem akademik & pengelolaan kelas (Phase 12).

## Ringkasan Arsitektur

Sama dengan pola sistem existing (Phase 3–11):

- **Auth**: session cookie HMAC milik aplikasi → `getSessionUser()` / `requirePermission()`
- **Authorization**: permission matrix di `src/lib/roles.ts` (server-side source of truth)
- **Database**: PostgreSQL Supabase via Prisma; **RLS aktif** dengan policy `app_full_access` hanya untuk role privat `app_webkelas` (anon/authenticated Supabase = default-deny penuh)
- **Notifikasi**: helper `notifyUsers()` / `notifyUser()` dari Phase 11 — TIDAK ada sistem notifikasi kedua
- **File**: lampiran disimpan base64 di kolom `fileData` (bukan object storage), diunduh lewat endpoint ber-permission dengan header `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff` — akses dikontrol saat download, file tidak pernah publik

## Fitur

### 1. Materials / Materi (`/dashboard/materi`)

| Aksi | DEVELOPER | WALI_KELAS | ANGGOTA |
|---|---|---|---|
| Lihat daftar + detail | semua (termasuk DRAFT) | semua (termasuk DRAFT) | hanya PUBLISHED |
| Buat / edit / hapus | semua materi | hanya materi miliknya sendiri | ✗ |
| Unduh lampiran | ✓ | ✓ | hanya dari materi PUBLISHED |
| Cari (`?q=`) + filter subject | ✓ | ✓ | ✓ |

Field: `title` (3–160), `description` (≤4000), `subject` (≤80), `externalUrl` (wajib http/https), `status` PUBLISHED/DRAFT, lampiran file (≤2 MB: PDF/PNG/JPG/ZIP/DOCX/PPTX/XLSX — divalidasi **magic bytes** server-side), `authorId`, timestamp.

Notifikasi: materi PUBLISHED baru → semua user aktif kecuali pembuat (draft tidak menotifikasi). Activity log: `MATERIAL_CREATE/UPDATE/DELETE`.

### 2. Assignments / Tugas (`/dashboard/tugas`)

| Aksi | DEVELOPER | WALI_KELAS | ANGGOTA |
|---|---|---|---|
| Lihat daftar + detail | semua | semua | hanya PUBLISHED |
| Buat / edit / hapus | semua tugas | hanya tugas miliknya sendiri | ✗ |
| Lihat semua submission | ✓ | ✓ | ✗ (403) |
| Unduh lampiran tugas | ✓ | ✓ | hanya tugas PUBLISHED |

Field: `title`, `description` (5–4000), `dueDate` (**wajib masa depan** saat create), `status`, lampiran (≤2 MB), `authorId`, timestamp.

Notifikasi: tugas PUBLISHED baru → semua user aktif. Activity log: `ASSIGNMENT_CREATE/UPDATE/DELETE`. Hapus tugas = cascade hapus semua submission-nya.

### 3. Submissions / Pengumpulan

- Murid: `POST /api/assignments/[id]/submissions` — kumpul pertama (201) atau revisi (200, satu submission per tugas per murid via unique constraint `assignmentId+studentId`).
- Wajib: catatan (≤4000) **atau** file (≤3 MB, validasi magic bytes sama).
- `isLate` dihitung **server-side** terhadap `dueDate` saat ini (revisi setelah deadline = terlambat).
- Setelah dinilai (`gradedAt` terisi): submission **dikunci** — revisi ditolak 409.
- Murid melihat status/nilai/feedback miliknya **hanya** via `mySubmissions`/detail; daftar submission semua murid = 403; file submission hanya bisa diunduh wali/developer (`/api/submissions/[id]/file`).

Notifikasi: submit/revisi → pembuat tugas (role WALI_KELAS & DEVELOPER). Activity log: `SUBMISSION_CREATE/UPDATE`.

### 4. Grading / Nilai

- `POST /api/submissions/[id]/grade` — hanya WALI_KELAS & DEVELOPER (`submissions:grade`).
- `grade` 0–100 integer (zod), `feedback` ≤2000, otomatis mencatat `gradedById` + `gradedAt`.
- Notifikasi ke murid pemilik submission; activity log `SUBMISSION_GRADE` / `SUBMISSION_REGRADE`.
- Murid tidak bisa mengubah nilai miliknya (403) — nilai hanya bisa diubah via endpoint ber-permission.

### 5. Schedule / Jadwal (Phase 3, diintegrasikan)

Sistem jadwal existing (GET/POST/PUT/DELETE, validasi hari+jam, urutan hari) **tidak dirombak** — Phase 12 hanya menambahkan **notifikasi** `SCHEDULE` saat jadwal dibuat/diubah.

## Role Permission (src/lib/roles.ts)

```
materials:    DEVELOPER [read,create,update,delete] · WALI_KELAS [read,create,update,delete] · ANGGOTA [read]
assignments:  DEVELOPER [read,create,update,delete] · WALI_KELAS [read,create,update,delete] · ANGGOTA [read]
submissions:  DEVELOPER [read,grade,delete] · WALI_KELAS [read,grade,delete] · ANGGOTA [create]
```

Ownership rule (server-side): WALI_KELAS hanya boleh mengubah/menghapus materi/tugas miliknya sendiri; DEVELOPER mengelola semuanya. Tidak ada permission yang hanya diefeskan di frontend.

## Database (Supabase PostgreSQL)

Tabel baru Phase 12 (migration `20260924150000_academic_system`):

- **Material** — id, title, description, subject, externalUrl, fileName/fileMime/fileData/fileSize, status, authorId→User, createdAt/updatedAt
- **Assignment** — id, title, description, dueDate, fileName/fileMime/fileData/fileSize, status, authorId→User, createdAt/updatedAt
- **Submission** — id, assignmentId→Assignment (cascade), studentId→User (cascade), note, fileName/fileMime/fileData/fileSize, submittedAt, isLate, grade (0–100, nullable), feedback, gradedById→User (set null), gradedAt, updatedAt
- Unique: `Submission(assignmentId, studentId)`
- Index: `Material(status, createdAt DESC)`, `Assignment(status, dueDate)`, `Submission(studentId)`

## RLS / Security

- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` di ketiga tabel + policy `app_full_access FOR ALL TO app_webkelas` — pola identik Phase 9/11.
- `GRANT SELECT, INSERT, UPDATE, DELETE` + `GRANT USAGE, SELECT ON SEQUENCE` untuk `app_webkelas` (tanpa ini: `permission denied` — pelajaran Phase 11).
- Security advisor Supabase setelah migration: **0 temuan**.
- Validasi file memakai magic bytes (bukan extension/MIME klaim); EXE/mock-disguise ditolak 400.
- Semua endpoint: auth (401) → permission (403) → validasi input (400) → ownership (403) → database.
- Guest = 401; murid tidak bisa akses CRUD pengelolaan (403 teruji).

## Cara Penggunaan (ringkas)

1. **Wali/Developer**: buat Materi (dengan/dengan tanpa lampiran; DRAFT untuk review) → notifikasi terkirim saat PUBLISHED.
2. **Wali/Developer**: buat Tugas (deadline datetime-local, lampiran opsional) → murid dapat notifikasi.
3. **Murid**: `/dashboard/tugas` → Kumpulkan (catatan dan/atau file) → bisa Revisi sampai dinilai.
4. **Wali/Developer**: tombol "Submission (n)" → lihat semua, unduh file, Beri Nilai (0–100 + feedback).
5. **Murid**: nilai + feedback muncul di kartu tugas, dashboard (Nilai Terbaru), dan notifikasi.

## Catatan Konfigurasi

- Tidak ada environment variable baru; tidak ada dependency baru.
- Lampiran disimpan di DB (batas 2–3 MB) — untuk file besar nanti, migrasi ke Supabase Storage tercatat sebagai FUTURE IMPROVEMENT (bukan scope Phase 12).
- Vercel-compatible penuh (tidak ada filesystem).
