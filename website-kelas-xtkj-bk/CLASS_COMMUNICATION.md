# CLASS COMMUNICATION — web-kelas-xtkj-bk

Dokumentasi arsitektur fitur komunikasi & interaksi kelas (Phase 11).

## Ringkasan Arsitektur

Semua fitur memakai pola yang sama dengan sistem existing (Phase 3–10):

- **Auth**: session cookie HMAC aplikasi sendiri → `getSessionUser()` / `requirePermission()`
- **Authorization**: permission matrix di `src/lib/roles.ts` (server-side source of truth)
- **Database**: PostgreSQL Supabase via Prisma; RLS aktif dengan policy hanya untuk role privat `app_webkelas` (anon/authenticated default-deny)
- **Validasi**: zod per endpoint, field error per-field; error generik via `handleApiError`
- **Audit**: activity log untuk aksi moderasi & pengelolaan konten

## Supabase Tables (baru Phase 11)

Migration: `prisma/migrations/20260924140000_class_communication/migration.sql`

| Tabel | Kolom kunci | Index | FK |
|---|---|---|---|
| `DiscussionPost` | userId, content (1–2000) | `(createdAt DESC)` | → User CASCADE |
| `DiscussionReply` | postId, userId, content (1–1000) | `(postId, createdAt)` | → DiscussionPost CASCADE, → User CASCADE |
| `ClassEvent` | title, eventDate, startTime/endTime ("HH:MM"), location, createdById | `(eventDate)` | → User CASCADE |
| `Notification` | userId, type, message (≤200), link, targetType/targetId, isRead | `(userId, isRead, createdAt DESC)` | → User CASCADE |
| `Announcement.pinned` | Boolean default false (ALTER) | — | — |

RLS: 4 tabel baru `ENABLE ROW LEVEL SECURITY` + policy `app_full_access FOR ALL TO app_webkelas`.
GRANT: `SELECT, INSERT, UPDATE, DELETE` + `USAGE, SELECT` pada sequences untuk `app_webkelas`
(**penting**: tabel baru dari migration butuh GRANT eksplisit — tabel Phase 9 di-GRANT terpisah saat setup; tanpa ini muncul `permission denied for table`).

## Announcement System

- CRUD existing (Phase 3) dipertahankan; urutan feed kini `pinned DESC, createdAt DESC`.
- **Pin/unpin**: `PUT /api/announcements/[id]` menerima `pinned: boolean`; permission `announcements:update` + ownership wali (wali hanya pin miliknya, developer bebas).
- **Search**: `GET ?q=` — `contains insensitive` pada title+content (bekerja untuk publik & dashboard).
- **Notifikasi**: pengumuman baru berstatus PUBLISHED → fan-out ke semua user aktif (kecuali penulis). Draft tidak menotifikasi (anti spam).

## Discussion Architecture

- `GET /api/discussions?q=` (login semua role): 50 post terbaru + balasan berurutan, author + avatar.
- `POST /api/discussions`: zod 1–2000 char + rate limit **5 post/menit per user** (429 + Retry-After).
- `POST /api/discussions/[id]/replies`: 1–1000 char + rate limit **10/menit per user**; notifikasi ke pemilik posting (bukan saat membalas sendiri).
- `DELETE /api/discussions/[id]` & `.../replies`: **pemilik selalu boleh**; role dengan `discussions:moderate` (developer & wali) boleh hapus milik orang lain → tercatat `DISCUSSION_MODERATE` di activity log. Hapus post = cascade balasannya.
- Kedalaman diskusi sengaja 1 level (post → balasan), tanpa realtime/chat.

## Event Architecture

- `GET /api/events?scope=upcoming|past&q=` — login semua role; `upcoming` = eventDate ≥ now, `past` < now.
- `POST/PUT/DELETE` — permission `events:*` (developer & wali). Validasi: title 3–120, eventDate `YYYY-MM-DD`, jam `HH:MM` regex, location ≤120, description ≤2000.
- Activity log: `EVENT_CREATE/UPDATE/DELETE`.
- **Notifikasi**: event baru → fan-out semua user aktif (kecuali pembuat).

## Notification Architecture

- Tipe: `ANNOUNCEMENT`, `DISCUSSION_REPLY`, `EVENT`, `GALLERY`.
- Fan-out via `src/lib/notify.ts`: `notifyUsers({roles?, excludeUserId, ...})` (maks **50 penerima**, self-notify dilewati, best-effort — gagal tidak menggagalkan aksi utama) dan `notifyUser()` untuk target tunggal.
- API self-only: `GET /api/notifications` (30 terbaru + unreadCount), `PATCH` `{id}` (updateMany dengan `userId` di where → ID milik orang lain 404, tak bisa disentuh) atau `{all:true}`.
- UI: `NotificationBell` — badge unread, dropdown 30 item, polling **60 detik**, klik item → mark-as-read + navigasi ke `link`, "Tandai semua dibaca". Tidak ada email/push (in-app saja, anti spam).

## Search

| Objek | Endpoint | Field | Case |
|---|---|---|---|
| Pengumuman | `GET /api/announcements?q=` | title, content | insensitive |
| Diskusi | `GET /api/discussions?q=` | content | insensitive |
| Agenda | `GET /api/events?q=` | title, description, location | insensitive |

Tidak ada pencarian user/profile global — data anggota hanya via halaman Members yang sudah memiliki permission masing-masing (prinsip least-exposure).

## Moderation

| Aksi | Anggota | Wali Kelas | Developer |
|---|---|---|---|
| Baca diskusi/agenda/pengumuman | ✓ | ✓ | ✓ |
| Posting & balas diskusi | ✓ | ✓ | ✓ |
| Hapus konten **milik sendiri** | ✓ (post & reply & foto galeri) | ✓ | ✓ |
| Hapus konten **milik orang lain** | ✗ 403 | ✓ diskusi (log `DISCUSSION_MODERATE`) | ✓ semua |
| Buat/edit/hapus agenda | ✗ 403 | ✓ | ✓ |
| Pin/unpin pengumuman | ✗ | hanya miliknya | ✓ |
| Moderate galeri | ✗ | ✓ | ✓ |

Semua divalidasi server-side (`requirePermission` + ownership check), frontend hanya menyembunyikan tombol.

## Security Notes

- Rate limit posting/balasan per-user (bukan hanya per-IP) karena semua user login.
- Notifikasi & balasan tidak pernah memasukkan password/secret; message dipotong 200 char.
- RLS tidak longgar: hanya role privat `app_webkelas` yang punya policy; koneksi anon/authenticated Supabase tetap ditolak penuh.
- Semua ID path divalidasi integer positif sebelum query.
