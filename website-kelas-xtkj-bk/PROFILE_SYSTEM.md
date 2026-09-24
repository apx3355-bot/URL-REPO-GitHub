# PROFILE SYSTEM — web-kelas-xtkj-bk

Dokumentasi arsitektur sistem profile (Phase 10).

## Arsitektur

- **Auth**: session cookie HMAC-SHA256 milik aplikasi (bukan Supabase Auth) — dibangun sejak Phase 3. Identitas sesi = `User.id` + `tokenVersion` (invalidasi massal saat ganti password / perubahan role).
- **Username**: identifier login, unik (case-insensitive, dinormalisasi lowercase), disimpan di tabel `User`.
- **Profile**: data tampilan, 1:1 dengan `User` via `Profile.userId` (cascade delete).

```
User (username, passwordHash, role, isActive, tokenVersion)
 └── Profile (fullName, nisn, photo, phone, bio, updatedAt)   ← 1:1
 └── ClassMember (fullName, nisn, position)                    ← data anggota kelas
 └── ActivityLog[]
```

## Database structure (`Profile`)

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | Int @id | PK |
| `userId` | Int @unique | FK → User, onDelete Cascade |
| `fullName` | String | nama tampilan (2–100 char) |
| `nisn` | String? | hanya murid, 10 digit |
| `photo` | String? | avatar, base64 murni (lihat Avatar) |
| `phone` | String? | opsional, format divalidasi |
| `bio` | String? | maks 300 char |
| `updatedAt` | DateTime @updatedAt | diisi Prisma |

RLS Supabase: RLS aktif dengan policy `app_full_access` hanya untuk role privat `app_webkelas` (kredensial aplikasi). Anon/authenticated Supabase → default-deny.

## API

### `GET /api/profile` (login)
Mengembalikan profil milik sendiri saja (tanpa parameter userId).

### `PUT /api/profile` (login)
Body: `{ fullName, username, phone?, bio?, photo? }`

- `username`: aturan identik register — 3–32, `^[a-z0-9_.]+$`, unik (duplikat → 400 per-field). Update ditulis ke `User.username` di dalam satu transaksi dengan upsert profil. **Tidak memengaruhi session** (sesi terikat `User.id`).
- `photo`: data URL. Tiga makna: `undefined` = tidak ada perubahan, `""` = hapus, data URL = set. Validasi **magic bytes** server-side (`src/lib/image.ts`): hanya JPEG/PNG/WEBP, MIME klaim harus cocok signature, base64 maks 200 KB.
- Field asing (`role`, `isActive`, `userId`, dll.) **di-strip zod** — mustahil eskalasi via endpoint ini.
- Activity log: `PROFILE_UPDATE` / `PROFILE_USERNAME_CHANGE` (tanpa data sensitif).

### `POST /api/profile/password` (login)
Body: `{ currentPassword, newPassword, confirmPassword }`

- Verifikasi password lama (bcrypt), tolak sama dengan lama, min 8 char.
- Sukses → `tokenVersion+1` → **semua session (semua perangkat) invalid**; user diarahkan login ulang.
- Password tidak pernah dicatat di log.

## Avatar / Storage

**Keputusan desain**: avatar disimpan sebagai base64 di kolom `Profile.photo` (max ~200 KB, di-resize 256×256 + JPEG q0.85 di client via canvas sebelum dikirim — `src/lib/avatarClient.ts`).

Alasan: bekerja identik di Vercel (filesystem ephemeral — object storage butuh setup terpisah), tanpa secret baru, tanpa bucket. Server tetap memvalidasi magic bytes sehingga payload berbahaya tidak mungkin lolos.

**Rendering**: `src/components/AvatarDisplay.tsx` — foto jika ada, fallback inisial deterministik (`MemberAvatar`). Dipakai di: kartu profil, topbar dashboard, dropdown akun. Supabase Storage tetap direkomendasikan untuk galeri ukuran penuh (lihat Remaining di PHASE_10_REPORT.md).

## Role handling

Role hanya bisa diubah lewat **User Management** (`PATCH /api/users`, permission `users:update` = DEVELOPER saja). Profile self-service tidak menyentuh `role`, `isActive`, `tokenVersion`, `passwordHash`.

## Update flow (ringkas)

```
Client (form + canvas resize)
  → PUT /api/profile (JSON)
    → requireUser (session cookie)
    → zod validation (strip unknown)
    → username conflict check
    → magic bytes validation (jika photo)
    → $transaction [user.update?, profile.upsert]
    → activity log
  ← { profile, username }
→ UI feedback + router.refresh (topbar ikut ter-update)
```
