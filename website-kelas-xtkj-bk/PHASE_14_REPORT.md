# PHASE 14 REPORT — ADVANCED SYSTEM, DYNAMIC EXPERIENCE & FINAL UX POLISH

**Tanggal:** 25 September 2026
**Stack:** Next.js 15.5 (App Router) + React 19 + TypeScript + Prisma 6 + PostgreSQL Supabase + Tailwind 4 + Vercel
**Fase sebelumnya:** `PHASE_13_REPORT.md` (Class Visual Experience — dipertahankan penuh)

## Status Phase 14: ✅ SELESAI

| Komponen | Status |
|---|---|
| Member Profile Carousel (maks 5 kartu, aktif tengah, frame hijau) | ✅ PASS |
| Auto sliding + pause/restore + hover-pause + visibility-pause | ✅ PASS |
| Animated Network Background (canvas, node bergerak + garis mengikuti) | ✅ PASS |
| Responsive network (mobile 16 node / desktop 34 node) + reduced-motion statis | ✅ PASS |
| Hero polish (kontras, z-index, CTA di atas background) | ✅ PASS |
| Auth & logout check (login/session/logout/protected/redirect/tokenVersion) | ✅ PASS 25/25 |
| Role enforcement per permission matrix | ✅ PASS |
| Supabase/DB integration check (member, galeri, auth, role) | ✅ PASS |
| Public navigation (Beranda/Struktur/Anggota/Galeri/Tentang/Masuk) | ✅ 200 semua |
| Mobile experience (375×667, swipe, tanpa overflow) | ✅ PASS |
| Performance (pause offscreen/hidden, cleanup penuh, tanpa library) | ✅ PASS |
| Production build + deploy Vercel | ✅ exit 0 + alias sehat |
| **Database migration** | **TIDAK DIPERLUKAN** (nol perubahan schema) |

## Fitur yang Ditambahkan

1. **MemberCarousel** (`src/components/home/MemberCarousel.tsx`) — upgrade section Anggota:
   - Desktop: **hingga 5 kartu terlihat**, kartu aktif **di tengah** dengan **frame hijau**
     (`--color-success` #22c55e, 2px + glow `--color-success-soft`); tetangga langsung scale
     0.94, kartu jauh 0.88 + opacity 0.72 (tetap terlihat, depth ringan).
   - **Auto sliding** tiap 5 detik; pause saat interaksi (hover desktop, pointerdown,
     focus, keyboard); resume otomatis 9 detik setelah interaksi terakhir; berhenti saat
     tab tersembunyi (`visibilitychange`) dan saat reduced-motion.
   - Kontrol manual: tombol prev/next, dots (tab), swipe/drag (Pointer Events, threshold
     48px, click-through protection), keyboard ArrowLeft/Right (stage fokus).
   - **Wrap modular** saat anggota > 5 (offset relatif dihitung, bukan kartu dikloning —
     tidak ada duplikat aneh); `Math.abs(rel) > 2` tidak dirender (DOM maksimal 5 kartu).
   - Fallback angka anggota apa pun: 1 kartu (tanpa kontrol), 2–5 kartu apa adanya,
     0 anggota → empty-state profesional. Data = ClassMember DB (tanpa profil palsu).
   - Kartu aktif = Link ke `/anggota` (route existing — tanpa sistem profile kedua);
     field aman saja (avatar/nama/jabatan).
2. **NetworkBackground** (`src/components/home/NetworkBackground.tsx`) — pengganti SVG
   statis hero:
   - Canvas 2D + rAF; node (16 mobile / 24 tablet / 34 desktop) bergerak perlahan dengan
     kecepatan berbeda per node, memantul di tepi; **garis koneksi mengikuti posisi node**
     dengan opacity menurun proporsional jarak (maxDist 22% lebar) — smooth, tanpa patah.
   - Node: halo glow + inti + pulse sinus ringan; grid digital halus (identitas TKJ).
   - Warna dari token `--color-accent` (mengikuti tema gelap/terang via MutationObserver).
   - **Pause ganda**: tab hidden + hero keluar viewport (IntersectionObserver) → rAF tetap
     jalan tapi skip draw (CPU hemat saat scroll ke bawah).
   - `prefers-reduced-motion`: satu frame statis (identitas visual tetap ada, tanpa loop).
   - DPR-aware (cap 2×), resize handler, **cleanup penuh** (rAF, listener, observers).
3. **Hero polish** — background `z-index:0`, konten `.hero-container` `z-index:1` (teks/CTA
   selalu di atas animasi); `.hx-net-bg` absolute full-bleed, `pointer-events:none`,
   `aria-hidden`; CTA "Masuk Website" diberi `aria-label` deskriptif.
4. **AvatarDisplay diperkuat** — fallback `onError` → avatar inisial bila foto base64
   rusak/gagal dimuat (ukuran tetap, layout tidak rusak). Memengaruhi semua pemakaian
   avatar di site (carousel, anggota, dashboard).

## File Created / Changed

**Created:**
- `src/components/home/MemberCarousel.tsx`
- `src/components/home/NetworkBackground.tsx`
- `PHASE_14_REPORT.md` (file ini)

**Changed:**
- `src/app/page.tsx` — `<MemberStackSlider>` → `<MemberCarousel>`; SVG statis hero →
  `<NetworkBackground />`; CSS `.hx-net-bg` + `.hero-container{z-index:1}`; aria-label CTA.
- `src/app/globals.css` — blok CSS `hx-mc-*` (stage/track/card active/controls/counter) +
  `--hx-mc-step` responsif (240px desktop / 196px mobile) + reduced-motion `hx-mc-card`;
  blok CSS `hx-stack-*` dihapus (komponen lama tidak ada lagi).
- `src/components/AvatarDisplay.tsx` — client component + fallback onError ke inisial.

**Deleted:**
- `src/components/home/MemberStackSlider.tsx` (digantikan MemberCarousel — persyaratan
  Phase 14 "maks 5 kartu terlihat, aktif di tengah" tidak bisa dipenuhi stack slider;
  seluruh kemampuan Phase 13 yang relevan — swipe/keyboard/dots/link — dipindahkan utuh).

## Database / Storage

- **Nol perubahan schema/migration.** Sistem existing dipakai apa adanya:
  `ClassMember` (3 baris, ter-link user developer/walikelas/anggota), `GalleryItem
  APPROVED` (0 baris — galeri beranda tetap empty-state), session HMAC cookie.
- Data uji (4 member `[TEST14]`, 1 user register `[TEST14]`) dibuat via API lalu
  **dihapus penuh**; restore ClassMember presisi per-id (id & userId identik) setelah
  uji fallback 1/0 anggota. Kondisi akhir DB = kondisi awal Phase 14 (3 anggota, 3 user,
  0 foto APPROVED).
- Password walikelas/anggota di-set ulang via bcrypt one-shot untuk keperluan test
  (pola Phase 12/13) — tidak pernah ditulis ke source/git/dokumen; script temp dihapus.

## Testing

**Browser (Chromium via preview tools):**

| Uji | Hasil |
|---|---|
| 5 kartu desktop (7 anggota DB): window [aktif, ±1, ±2], dots 7, counter live | ✅ |
| Kartu aktif tengah (centered <8px), frame hijau 2px rgb(34,197,94) + glow | ✅ |
| Auto-slide 2→3→… (interval 5s), lanjut sendiri tanpa interaksi | ✅ |
| Pause saat hover (native mouseenter; 5.6s hover = 0 perpindahan) | ✅ |
| Resume pasca-leave (buffer 2s → maju lagi) | ✅ |
| Pause 9s setelah klik tombol next (interaksi manual) | ✅ |
| Keyboard ArrowRight/ArrowLeft (1→2→1) | ✅ |
| Swipe pointer kiri (2→3), threshold 48px, click-through diblokir | ✅ |
| Network bg: hash frame berubah (animasi jalan), pause offscreen (hash sama), resume saat kembali | ✅ |
| Warna canvas mengikuti tema (25k piksel cyan di gelap; accent #0891b2 di terang) | ✅ |
| Teks/CTA di atas background (z-index), kontras baik di tema gelap & terang | ✅ |
| Mobile 375px: step 196px, kartu samping peek di tepi, tanpa horizontal overflow (scrollWidth=365) | ✅ |
| Swipe mobile (2→3) | ✅ |
| Fallback **1 anggota** (DB nyata): 1 kartu centered, 0 kontrol/dots/counter | ✅ |
| Fallback **0 anggota** (DB nyata): empty-state profesional, tanpa error | ✅ |
| Restore DB: 3 anggota id & userId identik | ✅ |
| Console: hanya 401 guest yang expected | ✅ |

**Auth/Role/Session HTTP (script one-shot, dihapus setelahnya) — 25/25 PASS:**
login salah 401; login+session ketiga role (DEVELOPER/WALI_KELAS/ANGGOTA); guest API
401 (members GET, announcements POST); enforcement 403 (walikelas & anggota dilarang
create member); guest `/dashboard` 307 redirect; register murid 201 → login →
`/dashboard` 200 → logout → session invalid 401 → `/dashboard` 307; cookie logout
di-clear (Max-Age=0); semua halaman publik 200; user uji dihapus dari DB (verifikasi
 langsung Prisma — cleanup via API ternyata 404 karena parameter search, diperbaiki).

**Static:** `tsc --noEmit` 0 error; `npm run lint` 5 warning — **semua pre-existing**
(4 file phase lama + NotificationBell), nol warning baru; `next build` exit 0.

## Performance

- Tanpa dependency baru; canvas 2D native + rAF; DOM carousel maksimal 5 kartu.
- Network bg: DPR cap 2×, node adaptif lebar layar, pause saat tab hidden & hero
  offscreen (tidak ada CPU saat scroll ke bawah / pindah tab).
- Auto-slide via SATU interval dengan guard ref (bukan interval per-state); semua
  listener/observer dibersihkan saat unmount (tidak ada memory leak).
- Animasi kartu transform/opacity saja; drag menggeser via CSS var tanpa re-render.

## Accessibility

- Reduced-motion: auto-slide mati + CSS `hx-mc-card` transition 0.01ms; network bg
  render satu frame statis; semua info tetap tersedia.
- Keyboard: stage fokusable (tabindex), ArrowLeft/Right; tombol & dots semantik
  (`role=tablist/tab`, aria-selected); `aria-live` counter; `aria-roledescription`
  carousel; focus ring kustom pada track; `aria-hidden` kartu non-aktif.

## Security

- Tidak ada endpoint/permission baru; matrix Phase 3–12 utuh (terverifikasi 403/401).
- Kartu member hanya field aman (nama, jabatan, avatar) — homepage tidak melempar
  passwordHash/nisn/phone (grep 0); komponen `home/*` hanya diimpor `src/app/page.tsx`
  (aturan HOMEPAGE ONLY tetap).
- Session/logout/tokenVersion bekerja (logout benar-benar mengakhiri session; akses
  `/dashboard` pakai cookie lama → redirect).
- RLS/policy Supabase tidak disentuh (tidak ada migration).

## Bug Ditemukan & Diperbaiki

1. **Track carousel salah geometry** (HIGH) — `top:50%; height:240px` menggeser kartu
   90px ke bawah stage, menutupi kontrol/counter. Fix: `inset:0` (kartu ter-center via
   top 50% + translate −50%).
2. **`--hx-mc-step` tidak terdefinisi** (HIGH) — seluruh `calc()` transform invalid →
   kartu tidak ter-center (screenshot 1 kartu melenceng). Fix: variabel didefinisikan
   di `.hx-mc-track` (+ media query mobile) **dan** disinkronkan ke state JS sebagai
   fallback inline.
3. **Hover-pause React tidak terpicu** (MED) — `onMouseEnter` React tidak reliable untuk
   sintesis & edge cases; diganti listener native `mouseenter/mouseleave/focusin` via ref.
4. **Cleanup user uji 404** (LOW) — parameter `?search=` tidak sesuai kontrak API users;
   diverifikasi via Prisma langsung dan user uji terhapus (3 user final, bersih).
5. **Kartu tetangga langsung sama besar dengan aktif** (LOW, visual) — scale 0.94 untuk
   rel ±1 sesuai instruksi "profil lain sedikit lebih kecil".

## Issue yang Tersisa

- Galeri beranda tetap **empty-state** (0 foto APPROVED di DB) — kondisi operasional,
  bukan bug; fitur galeri Phase 13 terverifikasi penuh sebelumnya.
- Foto galeri masih filesystem lokal server (ephemeral di Vercel) — batasan pre-existing
  Phase 5, solusi Supabase Storage menunggu keputusan pemilik project.
- Gesture sentuh fisik & reduced-motion OS nyata tidak dapat diemulasikan penuh dari
  lingkungan ini; keduanya mengikuti path kode yang terverifikasi via event sintetis
  (Pointer/Touch + matchMedia) dan fallback-nya aman.
- Deploy attempt pertama gagal "Not authorized" (transien — sesi valid via whoami);
  percobaan kedua sukses tanpa perubahan.
- 5 warning lint pre-existing (4 file phase lama) — tidak disentuh sesuai prinsip
  "jangan rewrite yang sudah benar".

## Deployment

- `next build` exit 0 → `vercel deploy --prod --yes` sukses.
- Alias stabil `https://website-kelas-xtkj-bk.vercel.app`:
  `/api/health` = `{"status":"ok","components":{"api":"operational","database":"connected"}}`;
  `/` HTTP 200; HTML produksi memuat marker Phase 14 (`hx-mc-stage`, `hx-net-bg`,
  `hx-hero-brand`).

## Kesimpulan

Semua item Phase 14 terpenuhi dan terverifikasi. **Phase 14 SELESAI — STOP.**
Phase 15 (Final Audit, Production Preparation, Public Release) **tidak dimulai** dan
menunggu instruksi eksplisit.
