# PHASE 13 REPORT — CLASS VISUAL EXPERIENCE & INTERACTIVE HOMEPAGE

**Tanggal:** 24 September 2026
**Stack:** Next.js 15.5 (App Router) + React 19 + TypeScript + Prisma 6 + PostgreSQL Supabase + Tailwind 4 + Vercel
**Dokumentasi teknis:** `CLASS_VISUAL_EXPERIENCE.md`

## Status Phase 13: ✅ SELESAI

| Komponen | Status |
|---|---|
| Interactive Member Structure (data DB) | ✅ PASS |
| Stacked Profile Slider | ✅ PASS |
| Class Gallery slider | ✅ PASS |
| Photo Viewer | ✅ PASS |
| All Photos grid (masonry + batch) | ✅ PASS |
| Animated Hero Brand (entrance + idle + interaksi) | ✅ PASS |
| Homepage section reveal | ✅ PASS |
| Reduced motion | ✅ PASS |
| Responsive (desktop/tablet/mobile) | ✅ PASS |
| Security & regression | ✅ PASS (25/25 efektif) |
| Production build | ✅ exit 0 |
| Deploy Vercel production | ✅ alias sehat |
| Database/storage migration | TIDAK DIPERLUKAN (memakai sistem existing) |

## Fitur yang Dibuat

1. **Homepage dari data nyata** — anggota dari `ClassMember`, galeri dari `GalleryItem APPROVED`
   (query server-side Prisma). Data statis `@/data/*` tidak lagi dipakai di beranda.
2. **Member Stacked Slider** — 1 kartu utama + 2 belakang (scale/opacity/offset/depth), navigasi
   tombol/dots/swipe/keyboard, click-through protection, kartu utama link ke `/anggota`.
3. **Class Gallery slider** — carousel transform-based, windowing ±1 slide, swipe + tombol + dots,
   caption overlay.
4. **Photo Viewer** — modal foto besar, close (tombol/Escape/klik-luar), next/prev (tombol/keyboard/
   swipe), tanpa menyentuh browser history, focus restore, scroll lock.
5. **All Photos** — masonry CSS columns, batch 8 + "Muat lebih banyak", lazy loading, viewer sama.
6. **Animated Hero Brand** — entrance fade-up <1s, idle float + ring breathe (CSS), parallax cursor
   desktop via CSS var (tanpa re-render), respons sentuh mobile.
7. **Homepage animation system** — Reveal (IntersectionObserver, sekali jalan), stagger entrance
   hero, semua CSS murni (tanpa library animasi).
8. **Empty-state informatif** — anggota kosong & galeri kosong (kondisi nyata saat ini) tampil
   dengan pesan jelas, bukan blank/error.

## File Created

- `src/components/home/Reveal.tsx` — wrapper reveal-on-scroll (IO)
- `src/components/home/HeroBrand.tsx` — hero brand animasi + parallax
- `src/components/home/MemberStackSlider.tsx` — stacked profile slider
- `src/components/home/GallerySlider.tsx` — class gallery carousel
- `src/components/home/PhotoViewer.tsx` — modal viewer
- `src/components/home/AllPhotos.tsx` — masonry grid + load more
- `src/components/home/PhotoImg.tsx` — img galeri + fallback broken image
- `src/components/home/HomeGallery.tsx` — wrapper slider + all photos + viewer
- `CLASS_VISUAL_EXPERIENCE.md`, `PHASE_13_REPORT.md`

## File Changed

- `src/app/page.tsx` — rewrite total: data DB, hero animasi, member slider, galeri, reveal
- `src/app/globals.css` — blok CSS `hx-*` (reveal, hero, stack, slider, viewer, masonry) +
  blok `prefers-reduced-motion` khusus komponen hx- (di globals sesuai pelajaran bug Phase 11/12)

## Database / Storage yang Digunakan

- **Tidak ada migration, tabel, kolom, bucket baru.** Murni membaca sistem existing:
  - `ClassMember` (3 baris) — nama, jabatan, foto
  - `GalleryItem where status=APPROVED` — saat ini **0 baris** (galeri beranda tampil empty-state)
- Storage tetap `public/uploads/gallery/` (filesystem, sistem Phase 5). Supabase Storage tetap
  future improvement (keputusan Phase 10/12 dipertahankan).
- State DB akhir = state awal Phase 13 (0 foto, 3 anggota) — data uji dibersihkan penuh.

## Animation System

- CSS keyframes (`hx-fade-up`, `hx-float`, `hx-ring-in`, `hx-ring-breathe`, `hx-viewer-in/pop`)
  + transition transform/opacity; IntersectionObserver untuk reveal; Pointer/Touch Events untuk
  gestur; CSS var untuk parallax. `requestAnimationFrame` tidak diperlukan. Tanpa library eksternal.

## Testing Result

**Browser (desktop 1280, mobile 375×667, tema gelap & terang):**

| Uji | Hasil |
|---|---|
| Member card data DB (3 anggota: Wali/Developer/Anggota Kelas) | ✅ |
| Stack depth: transform matrix utama (1,0,0,1,-160,-130) vs belakang (0.88 scale, opacity 0.55) | ✅ |
| Next/prev tombol (1→2→3), dots klik, counter live "n / 3 · Nama" | ✅ |
| Keyboard ArrowRight/ArrowLeft pada stage | ✅ |
| Swipe member stack (pointer events, geser kiri → kartu berikut) | ✅ |
| Fallback **1 anggota** (nyata via DB): 1 kartu, kontrol tersembunyi | ✅ |
| Fallback **2 anggota** (nyata via DB): 2 kartu unik tanpa duplikat + kontrol | ✅ |
| Gallery slider 10 foto, next, dots, counter, windowing (8 img dimuat untuk masonry batch) | ✅ |
| Load more 8→10, hilang setelah semua tampil | ✅ |
| Viewer: buka dari slider & masonry, next/keyboard, close tombol/Escape/klik-luar, counter, scroll-lock restore, history tidak bertambah (len 1) | ✅ |
| Swipe viewer (Touch Events) → foto berikut | ✅ |
| Broken image (imagePath diarahkan ke file tidak ada): fallback di slider **dan** viewer | ✅ |
| Hero: entrance selesai, parallax mouse (transform 6.4/-3.6 = var×8/×6), 2 ring breathe, touch respons | ✅ |
| Reveal section: konten ada di DOM sejak render, tampil saat masuk viewport | ✅ |
| No horizontal overflow: 633px & 365px → scrollWidth == clientWidth | ✅ |
| Viewer fit mobile: dialog 343×365 dalam 375×667, tombol terjangkau | ✅ |
| Tema terang: token warna benar (bg #f8fafc, teks #0b1220) | ✅ |
| Console: hanya 401 guest yang expected (fetch auth saat belum login) | ✅ |

**Security & regression HTTP (script one-shot, dihapus setelahnya):**
24/25 PASS; 1 FAIL ternyata salah asumsi field di script test itu sendiri (`database` top-level vs
`components.database`) — endpoint health sendiri benar (`{"status":"ok","components":{...}}`),
diverifikasi terpisah → **efektif 25/25**:
- Guest: gallery publik 200 hanya APPROVED; `?mine=1`, members, POST/PUT/DELETE → 401
- JSON publik tidak bocorkan passwordHash/tokenVersion/nisn/phone; users API juga aman
- Login password salah 401; developer approve moderasi tetap 200 (Phase 5 utuh)
- Halaman publik 200 (/, /anggota, /struktur, /galeri, /tentang, /login), 404 page bekerja
- /dashboard* guest → redirect (middleware utuh, Phase 1–12 regression OK)
- File galeri APPROVED terserve; komponen `home/*` hanya diimpor `src/app/page.tsx` (HOMEPAGE ONLY)

**Static:** `tsc --noEmit` 0 error; `eslint` 0 warning/error baru (5 warning pre-existing dari
phase sebelumnya); `next build` exit 0.

## Performance

- Tanpa library animasi (CSS + native API); bundle tidak bertambah dependency.
- Lazy image + windowing slider + batch masonry + `decoding=async`.
- Animasi transform/opacity saja → tanpa layout shift; parallax via CSS var tanpa re-render React.
- Window listener dibersihkan tiap gesture; DOM slider maksimal 3 kartu/3 slide bergambar.

## Accessibility

- `prefers-reduced-motion`: global kill-switch + blok hx- khusus (konten langsung terlihat,
  slider/viewer tetap berfungsi instan).
- Keyboard lengkap (stage, viewer, dots), `aria-live` counter, label aria semua kontrol,
  `aria-hidden` kartu/slide non-aktif, focus restore viewer, skip-link existing tetap.

## Security

- Hanya `GalleryItem APPROVED` tampil publik; moderasi & permission Phase 5 tidak berubah.
- Kartu member hanya field aman (nama, jabatan, avatar) — tanpa NISN/telepon/bio.
- Tidak ada secret/service-role key di client; tidak ada endpoint baru; RLS & policy DB tidak
  disentuh (tidak ada migration).
- Kredensial uji: script bcrypt one-shot pattern Phase 12 — file env & script dihapus; password
  developer dikembalikan ke nilai standar instruksi user (bcrypt-only di DB, tidak pernah
  ditulis di source/git/dokumen); `tokenVersion` dinaikkan → semua session uji invalid otomatis.

## Bugs Ditemukan & Diperbaiki

1. **`setPointerCapture` memblokir klik** (HIGH) — click event ter-redirect ke container saat
   drag di Pointer Events, sehingga tombol slide & Link kartu tak berfungsi. Fix: window listeners
   tanpa capture di kedua slider.
2. **Click-through setelah swipe** (MED) — geser singkat memicu klik navigasi/viewer. Fix:
   `suppressClick` + `onClickCapture` bila |dx| ≥ 8px.
3. **Centering ganda kartu stack** (MED) — margin negatif + translate −50% bertumpuk (kartu
   melenceng). Fix: centering via transform saja.
4. **Kartu duplikat pada 2 anggota** (LOW) — offset −1 memunculkan orang sama dua kali. Fix:
   hanya render offset yang ada angkanya.
5. **Error TS union ref di Reveal** (LOW) — cast aman `as unknown as "div"` (runtime tetap tag as).

## Issue yang Tersisa

- Galeri beranda & `/galeri` saat ini **empty-state** karena memang belum ada foto APPROVED di DB
  (0 foto). Diverifikasi bekerja penuh dengan 10 foto uji lalu dibersihkan. Pengisian foto nyata
  adalah aktivitas operasional (upload via dashboard + moderasi), bukan kode.
- Foto galeri tersimpan di filesystem server (ephemeral di Vercel) — batasan pre-existing Phase 5,
  solusi tetap Supabase Storage (future).
- Parallax hero bergantung `pointermove` (diuji via synthetic pointer events; gesture fisik
  perangkat sentuh nyata tidak dapat diuji dari lingkungan ini — kode touch path mengikuti pola
  yang sama dan fallback-nya aman).
- Warning eslint pre-existing (4 file, phase lama) — tidak disentuh.

## Blocked Items

- Tidak ada yang blocked. Deploy sempat gagal 2× karena masalah infrastruktur CLI upload
  (`missing_files` saat dev server masih menyisakan proses, lalu `fetch failed` jaringan) —
  percobaan berikutnya sukses; production terverifikasi.

## Deployment

- `next build` exit 0 → `vercel deploy --prod` sukses.
- Alias stabil `https://website-kelas-xtkj-bk.vercel.app`: `/api/health` =
  `{"status":"ok","components":{"api":"operational","database":"connected"}}`, `/` HTTP 200,
  dan HTML produksi memuat marker Phase 13 (`hx-hero-brand`, `hx-stack-stage`).

## Kesimpulan

Semua item checklist Phase 13 terpenuhi dan terverifikasi. **Phase 13 SELESAI — STOP,
tidak melanjutkan ke Phase 14.**
