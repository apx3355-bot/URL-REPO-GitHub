# PHASE 7 — TEST REPORT
**Project:** web-kelas-xtkj-bk (Website Kelas X TKJ BK)
**Tanggal:** 23 September 2026
**Lingkup:** Testing, security audit & final integration atas seluruh fitur Phase 1–6. Tidak ada fitur baru.

> Semua hasil di bawah diperoleh dari pengujian nyata: request HTTP via curl terhadap dev server,
> query langsung ke database SQLite via Prisma, dan inspeksi UI via browser (Chromium preview).
> Tidak ada status yang dikarang.

---

## STATUS KESELURUHAN: ✅ COMPLETED

| Kategori | Status |
|---|---|
| Authentication test | ✅ PASS |
| Role & permission test | ✅ PASS |
| Dashboard & navigation test | ✅ PASS |
| Account test | ✅ PASS |
| Quota test | ✅ PASS |
| Gallery test | ✅ PASS (setelah 1 bug diperbaiki) |
| Activity log test | ✅ PASS |
| Security / input validation test | ✅ PASS |
| Database / API integration test | ✅ PASS (setelah 1 bug diperbaiki) |
| UI regression test | ✅ PASS |

---

## 1. AUTHENTICATION TEST — ✅ PASS

| Skenario | Hasil |
|---|---|
| Login Developer / Wali Kelas / Anggota (kredensial benar) | ✅ 200 + cookie session |
| Login password salah | ✅ 401 `"Email atau password salah."` |
| Login username tidak dikenal | ✅ 401 — pesan identik (anti user-enumeration) |
| Role mismatch (murid login memilih Developer) | ✅ 403 `"Akun ini tidak memiliki akses sebagai Developer."` |
| Body kosong / format salah | ✅ 400 + field error |
| Logout | ✅ 200 + cookie dibersihkan + `LOGOUT` tercatat |
| Session setelah logout (cookie lama direplay) | ✅ `/api/auth/me` → 401 |
| Back-button ke `/dashboard` setelah logout | ✅ 307 redirect ke `/login` |
| Akses halaman terproteksi tanpa login | ✅ redirect ke `/login` (middleware) |
| Rate limiting login (10/menit/IP + 5/5-menit/user) | ✅ attempt ke-6+ → 429 + `Retry-After` |

## 2. ROLE & PERMISSION SECURITY — ✅ PASS

Ditegakkan **di server** via `requirePermission()` + guard layout (bukan menu hiding):

| Skenario | Hasil |
|---|---|
| Murid → UI `/dashboard/users`, `/dashboard/settings`, `/dashboard/activity` | ✅ 403 di layout (server-side) |
| Murid → API users/settings/activity-logs (write & read) | ✅ 403 |
| Wali → API users, settings, activity-logs | ✅ 403 |
| Anonim → semua endpoint terproteksi | ✅ 401 |
| Developer → seluruh endpoint sesuai desain | ✅ 200 |
| Wali `members:create` → 403 | ✅ by-design (pembuatan akun hanya via User Management developer) |

## 3. DASHBOARD & NAVIGATION — ✅ PASS

| Skenario | Hasil |
|---|---|
| Login → redirect `/dashboard` (dashboard terpadu, konten per role) | ✅ |
| Semua route dashboard merespons 200 untuk role berwenang | ✅ |
| Akses langsung URL tanpa permission → 403/redirect di server | ✅ |
| Sidebar per role (menu hanya sesuai permission) | ✅ |
| Tidak ada dead link ditemukan pada navigasi utama & footer | ✅ |

## 4. ACCOUNT MANAGEMENT — ✅ PASS

| Skenario | Hasil |
|---|---|
| Murid PATCH profil sendiri (PUT `/api/profile`) | ✅ 200 |
| Murid menyisipkan `"role":"DEVELOPER"` di request profil | ✅ role DIABAIKAN server (zod strip); hanya field profil yang berubah; role tetap `ANGGOTA` |
| Murid/wali PATCH role via `/api/users` | ✅ 403 |
| Search & filter User Management (developer) | ✅ terverifikasi sebelumnya (E2E) |

## 5. QUOTA TEST — ✅ PASS

| Skenario | Hasil |
|---|---|
| Hitungan kuota dari DB (murid aktif), bukan frontend | ✅ |
| Register saat kuota tersedia | ✅ 201 |
| Register saat kuota penuh (max diturunkan sementara) | ✅ 403 `"Kuota anggota kelas saat ini sudah penuh."` |
| Register ke-3 saat max=2 (uji race guard transaksi) | ✅ 403 |
| Kuota dinaikkan → register sukses lagi | ✅ 201 |
| Rate limit register (3/menit/IP) | ✅ 429 pada attempt ke-4 |
| Manipulasi request (field role/quota diinject) | ✅ diabaikan server |
| Akun uji dibersihkan; kuota dikembalikan ke 36 | ✅ DB final: 4 user seed |

## 6. GALLERY TEST — ✅ PASS (1 bug diperbaiki)

| Skenario | Hasil |
|---|---|
| Upload PNG valid (magic bytes check) | ✅ 201 PENDING |
| Upload fake PNG (header palsu) | ✅ 400 ditolak |
| Upload ekstensi `.exe` | ✅ ditolak |
| Murid lihat item miliknya, dev/wali lihat semua | ✅ |
| Moderasi approve/reject (dev) | ✅ 200 |
| **Murid hapus foto miliknya sendiri** | ❌→🔧 **BUG #1 ditemukan & diperbaiki** — 403 karena matrix `ANGGOTA.gallery` tak punya `delete`; guard `requirePermission("gallery","delete")` menolak sebelum ownership check. Fix: guard DELETE dirumput ulang (dev bebas; murid hanya miliknya via `gallery:upload`; wali tanpa hapus). Retest: own 200, IDOR 403, wali 403, dev 200. |
| Murid hapus foto milik orang lain (IDOR) | ✅ 403 |
| Wali hapus | ✅ 403 (sesuai matrix) |
| Alur upload → PENDING → approve → tampil di `/galeri` publik | ❌→🔧 **BUG #2 ditemukan & diperbaiki** (lihat bagian Database/API) |
| Semua file & item uji dibersihkan | ✅ 0 file, 0 item |

## 7. ACTIVITY LOG TEST — ✅ PASS

| Skenario | Hasil |
|---|---|
| `LOGIN` / `LOGIN_FAILED` / `LOGIN_ROLE_MISMATCH` tercatat | ✅ (37 / 11 / 2 event) |
| `LOGOUT` tercatat | ✅ (5 event) |
| `REGISTRATION`, `USER_CREATED`, `ROLE_CHANGE`, `PASSWORD_RESET` tercatat | ✅ |
| `GALLERY_UPLOAD/APPROVE/REJECT/DELETE` tercatat | ✅ |
| `SETTINGS_QUOTA_CHANGE`, `SETTINGS_REGISTRATION_CHANGE` tercatat | ✅ |
| `ANNOUNCEMENT_*`, `MEMBER_*`, `SCHEDULE_UPDATE`, `PROFILE_UPDATE` tercatat | ✅ |
| Baca log: anonim 401, murid 403, developer 200 (`/api/activity-logs`) | ✅ |
| Tidak ada password/hash/secret sebagai **nilai** di log | ✅ — 1 baris ber-action `PASSWORD_RESET` hanya berisi deskripsi tekstual "developer me-reset password akun …", tanpa nilai credential |

## 8. INPUT VALIDATION & BASIC SECURITY — ✅ PASS

| Skenario | Hasil |
|---|---|
| Body kosong `/api/auth/login` | ✅ 400 |
| Judul announcement 5000 karakter | ✅ 400 (max 120) |
| NISN huruf | ✅ 400 (regex 10 digit) |
| Password 3 karakter | ✅ 400 (min 8) |
| Field tidak dikenal (mis. `email`) di payload register | ✅ di-strip diam-diam (zod) — aman, UI juga tidak mengirimnya (konsisten) |
| Request tanpa auth ke endpoint tulis (announcements/users/settings) | ✅ 401 semua |
| IDOR announcement: murid PUT/DELETE `/api/announcements/1` | ✅ 403 |
| Role escalation via PATCH `/api/users` (murid/wali/anonim) | ✅ 403/403/401; data target tak berubah |
| XSS: tidak ada `dangerouslySetInnerHTML` untuk konten user | ✅ (satu-satunya = static theme init script, aman) |
| Secret exposure di HTML publik (5 halaman di-grep) | ✅ 0 kecocokan |
| `SESSION_SECRET` hanya di `session.ts` + `middleware.ts` (server) | ✅ |
| Rate limit 429 bekerja di login & register | ✅ |

## 9. DATABASE / API INTEGRATION — ✅ PASS (1 bug diperbaiki)

| Skenario | Hasil |
|---|---|
| Skema field API ↔ form UI (announcements, schedules, members, structure) | ✅ konsisten (title/content/status; day/startTime/endTime/subject/teacher/room; dll.) |
| `/api/health` → api operational, database connected | ✅ |
| Statistik dashboard = data DB nyata | ✅ (pending galeri 0 setelah cleanup; users 4) |
| Data konsisten setelah login/logout | ✅ |
| **BUG #2 (HIGH): item galeri APPROVED tidak pernah tampil di `/galeri` publik** | 🔧 DIPERBAIKI — `src/app/galeri/page.tsx` melakukan *self-fetch* ke `${NEXT_PUBLIC_SITE_URL}/api/gallery`; env itu tidak pernah diset → `fetch("/api/gallery")` gagal → selalu fallback statis (bug tersembunyi sejak Phase 5 karena fallback membuat halaman tampak normal). Fix: query Prisma langsung di server component (`prisma.galleryItem.findMany({ where: { status: "APPROVED" } })`), fallback statis dipertahankan untuk DB kosong/gagal. Terbukti end-to-end: upload → approve → **muncul di `/galeri`** → delete → hilang. |
| Build production setelah fix | ✅ sukses (tsc 0, lint 0) |

## 10. UI REGRESSION TEST — ✅ PASS

| Skenario | Hasil |
|---|---|
| Landing page dark theme (hero, network pattern, SYSTEM STATUS real dari `/api/health`) | ✅ |
| Galeri publik render + filter kategori | ✅ |
| Dashboard Developer mobile 320px | ✅ tanpa horizontal overflow halaman; tabel log scroll di dalam kontainer (by design) |
| Theme switcher dark ↔ light + persistensi localStorage | ✅ (`data-theme` berubah, tersimpan) |
| Light theme readable (screenshot dashboard) | ✅ |
| Console error penting | ✅ tidak ada (hanya info React DevTools & HMR khas dev) |
| Login, dashboard, galeri, activity log setelah semua perubahan | ✅ fitur Phase 1–6 tetap berjalan |

---

## BUGS DITEMUKAN & DIPERBAIKI

| # | Severity | Bug | Root cause | Fix | Verifikasi |
|---|---|---|---|---|---|
| 1 | **HIGH** | Murid tidak bisa menghapus foto miliknya sendiri (403) | Matrix `ANGGOTA.gallery` tidak memuat `delete`; guard `requirePermission("gallery","delete")` menolak sebelum ownership check yang sebenarnya sudah ada di handler | `src/app/api/gallery/[id]/route.ts`: guard DELETE berlapis — developer (izin `gallery:delete`) hapus bebas; murid boleh hapus miliknya via izin `gallery:upload`; wali tetap tanpa hapus | Retest: own 200 ✅, IDOR 403 ✅, wali 403 ✅, dev 200 ✅; tsc 0 error |
| 2 | **HIGH** | Item galeri APPROVED tidak pernah tampil di `/galeri` publik | Self-fetch `fetch(NEXT_PUBLIC_SITE_URL + "/api/gallery")` — env tidak pernah diset sehingga URL fetch `"/api/gallery"` invalid → catch → selalu fallback statis. Fallback menutupi bug sejak Phase 5 | `src/app/galeri/page.tsx`: ganti self-fetch dengan query Prisma langsung di server component; fallback statis dipertahankan bila DB kosong/gagal | E2E via HTTP: upload → approve → item tampil di `/galeri` ✅ |

*(Catatan proses: beberapa "kegagalan" awal selama testing ternyata salah pada script test, bukan aplikasi — password seed env name, path `/api/activity` vs `/api/activity-logs`, PATCH `/api/users/{id}` vs PATCH `/api/users` body, NISN 8 vs 10 digit, path file upload Windows. Semua sudah dikoreksi dan tidak masuk daftar bug.)*

## BUGS MASIH TERSISA

Tidak ada bug terbuka. Catatan desain (bukan bug):
- Rate limiter in-memory: efektif single-process; multi-instance perlu store eksternal (Redis) — sudah terdokumentasi.
- Tabel activity log di viewport sangat sempit memerlukan scroll horizontal internal — pola yang disengaja.

## FILE YANG DIUBAH (Phase 7)

| File | Perubahan |
|---|---|
| `src/app/api/gallery/[id]/route.ts` | 🔧 Fix bug #1 — guard DELETE berlapis (ownership murid) |
| `src/app/galeri/page.tsx` | 🔧 Fix bug #2 — query Prisma langsung, hapus self-fetch + dependensi `NEXT_PUBLIC_SITE_URL` |
| `PHASE_7_TEST_REPORT.md` | Baru (file ini) |

Tidak ada perubahan schema/database di Phase 7. Data uji (akun, item galeri, file upload) seluruhnya dibersihkan; kondisi akhir DB = 4 user seed, kuota 36, registrasi terbuka, 0 item galeri.

## KESIMPULAN KONDISI PROJECT

Seluruh fitur Phase 1–6 **lolos regression testing** setelah dua bug galeri diperbaiki. Keamanan server-side (authn, RBAC, IDOR, role escalation, quota, upload validation, rate limiting, secret handling) teruji dan konsisten. Production build sukses (tsc 0, lint 0). Kondisi siap melanjutkan ke fase berikutnya.

## REKOMENDASI TITIK AWAL PHASE 8

1. **Commit perubahan Phase 7** (2 file fix + laporan) — saat ini uncommitted.
2. Migrasi storage galeri ke object storage (Vercel filesystem ephemeral) — sudah diantisipasi di `docs/DEPLOYMENT.md`.
3. Rate limiter eksternal (Redis/Upstash) bila deploy multi-instance.
4. Thumbnail/resize gambar saat upload (perlu lib seperti `sharp`).
5. Notifikasi moderasi galeri ke murid (butuh layanan email).

**PHASE 7 SELESAI — berhenti, menunggu instruksi berikutnya.**
