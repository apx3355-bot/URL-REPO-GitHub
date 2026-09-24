# CLASS VISUAL EXPERIENCE — web-kelas-xtkj-bk

Dokumentasi teknis Phase 13: pengalaman visual & interaktif homepage (beranda).

## Ringkasan

Homepage dibangun ulang menjadi pengalaman visual yang hidup tanpa mengorbankan performa:
**Hero animasi → Stacked Member Slider → Class Gallery slider + All Photos grid → section reveal**.
Semua data berasal dari sistem database yang sudah ada (ClassMember, GalleryItem Phase 5) —
tidak ada database baru, tidak ada mock data pengganti, tidak ada upload system kedua.

## Data Source (satu sumber kebenaran)

| Section | Model | Query |
|---|---|---|
| Member slider | `ClassMember` (sistem anggota existing) | `prisma.classMember.findMany` — urut jabatan (non-null dulu) lalu nama, take 60 |
| Class Gallery + All Photos | `GalleryItem` (sistem galeri Phase 5) | `prisma.galleryItem.findMany where status=APPROVED`, urut `approvedAt desc`, take 60 |

- **Fallback**: bila DB kosong → section menampilkan empty-state informatif ("Belum ada data anggota"
  / "Belum ada foto ... setelah diunggah dan disetujui moderator"). Bila DB error → query di-catch →
  empty state juga (homepage tetap render). Tidak ada profil/foto palsu yang dibuat-buat.
- **Moderasi tetap berlaku**: hanya foto APPROVED (moderasi Developer/Wali Kelas) yang tampil di
  beranda — persis aturan galeri publik Phase 5.
- **Data sensitif tidak tampil**: kartu member hanya memuat nama, jabatan (jika ada), dan avatar.
  Tidak ada NISN, telepon, bio, passwordHash, atau field privat lain.

## Member Stacked Slider (`MemberStackSlider.tsx`)

- **Struktur**: 1 kartu utama di depan + maksimal 2 kartu di belakang (scale 0.88, opacity 0.55,
  offset ±26px/-16px, z-index 3/2/1) — efek kedalaman stack.
- **Navigasi**: tombol prev/next, dots indicator (klik lompat), swipe/drag (Pointer Events,
  window listeners — mouse & touch), keyboard (stage `tabIndex=0`, ArrowLeft/ArrowRight).
- **Drag**: pointerdown → window pointermove/pointerup; threshold swipe 48px; geser <48px snap balik.
- **Click-through protection**: setelah drag ≥8px, klik berikutnya diblokir via `onClickCapture`
  agar swipe tidak memicu navigasi Link.
- **Link kartu utama** → `/anggota` (route daftar anggota existing). Tidak ada route profil
  publik per-user di project ini (sistem profile Phase 10 = self-service), jadi TIDAK dibuat
  sistem kedua; kartu mengarahkan ke halaman anggota yang ada.
- **Graceful fallback**:
  - 1 anggota → 1 kartu tanpa kontrol/dots/counter (tidak ada UI mati).
  - 2 anggota → 2 kartu (1 utama + 1 belakang, tanpa duplikat orang yang sama).
  - 0 anggota → empty-state (ditangani parent di page.tsx).
- **Counter `aria-live="polite"`**: "1 / 3 · Nama" untuk screen reader.

## Class Gallery Slider (`GallerySlider.tsx`)

- Carousel flex-track + `transform: translate3d` (GPU-friendly), swipe/drag + tombol + dots.
- **Windowing**: hanya slide aktif ±1 yang me-render `<img>` (hemat DOM & network); slide di
  luar jendela berupa placeholder kosong, gambar dimuat saat mendekat.
- Slide aktif `loading="eager"`, lainnya lazy (via `PhotoImg`).
- Caption overlay gradien; counter "n / total".

## Photo Viewer (`PhotoViewer.tsx`)

- Modal `role="dialog" aria-modal` — foto besar (object-fit contain, max-height 62vh/560px).
- **Buka dari dua tempat**: Class Gallery slider & All Photos grid — viewer yang sama.
- **Tutup**: tombol ✕, tombol Escape, klik area overlay di luar dialog.
- **Navigasi**: tombol prev/next overlay, ArrowLeft/ArrowRight, swipe (Touch Events).
- **Tidak menyentuh browser history** (bukan route, tanpa pushState).
- Scroll body dikunci saat terbuka, dikembalikan ke nilai lama saat tutup.
- Fokus dikembalikan ke elemen pemicu saat menutup (a11y).
- `PhotoImg` di dalam viewer: foto hilang/ corrupt → fallback "Foto tidak tersedia".

## All Photos (`AllPhotos.tsx`)

- Masonry ringan via CSS `columns` (tanpa library), item `break-inside: avoid`.
- **Batch 8 foto**: "Muat lebih banyak (n lagi)" — foto jauh di bawah lipatan tidak dimuat
  sekaligus; `<img loading="lazy">` native.
- Timestamp tampil per item (format id-ID).

## Animated Hero Brand (`HeroBrand.tsx`)

- **Entrance** (sekali, <1s): fade-up logo + dua ring dekoratif scale-in (CSS `hx-fade-up`,
  `hx-ring-in`).
- **Idle** (terus berjalan, subtle): logo float ±6px 5.5s, ring "breathe" scale 1↔1.07 + opacity,
  reverse antar-ring.
- **Interaksi**:
  - Desktop (pointer mouse/pen): parallax cursor — nilai ternormalisasi −1..1 ditulis ke CSS var
    `--hx-px/--hx-py` (tanpa re-render React), dipakai `transform: translate3d(±8px, ±6px)`.
  - Mobile (touch): respons ringan — brand "terangkat" + glow shadow menguat saat disentuh.
- Semua gerak **hanya transform/opacity** (GPU-friendly, zero layout shift).
- Reduced motion: CSS memaksa semua animasi off (lihat §Accessibility); JS juga skip.

## Homepage Animation System

- **Section reveal** (`Reveal.tsx`): IntersectionObserver (rootMargin −60px, threshold 0.08),
  sekali jalan (disconnect setelah visible), fallback langsung tampil bila IO tak tersedia.
  Stagger via prop `delay` → `transition-delay`.
- **Entrance stagger hero**: delay inline 0.1s–0.44s pada label/judul/tagline/deskripsi/CTA.
- Semua class animasi berprefix `hx-` dan didefinisikan **di `globals.css`** (bukan `<style>`
  scoped) — pelajaran bug Phase 11/12 (class page-scoped tidak apply lintas halaman).

## HOMEPAGE ONLY

Komponen `src/components/home/*` HANYA diimpor oleh `src/app/page.tsx`. Dashboard, login, admin,
akademik, form tidak memuat komponen ini dan tetap memakai DashCSS terpisah — halaman sistem
tetap cepat (transisi ringan saja, seperti semula).

## Responsive

| Viewport | Perilaku |
|---|---|
| Desktop ≥1024 | Stack 3 kartu terlihat penuh, slider lebar, masonry 3 kolom (auto via columns) |
| Tablet 640–1023 | Layout menyusut proporsional |
| Mobile 375 | Kartu `min(320px, 78vw)` tidak keluar layar, swipe touch utama, viewer fit (diverifikasi 343×365 di 375×667), dots & tombol terjangkau |

- Tidak ada horizontal overflow (diverifikasi: scrollWidth == clientWidth di 633px & 365px).
- Text ellipsis (`hx-stack-name`, `hx-masonry-title`) mencegah clipping.

## Accessibility

- **prefers-reduced-motion**: blok CSS global mematikan reveal/entrance/float/ring/parallax;
  elemen langsung terlihat penuh (opacity 1), slider tetap berfungsi (instan tanpa animasi),
  semua informasi & fungsi tetap tersedia.
- Keyboard: slider (stage focusable + arrow keys), viewer (Escape/arrows), dots `role=tab`,
  tombol berlabel aria.
- Screen reader: counter `aria-live`, `aria-label` deskriptif di semua kontrol, kartu belakang
  `aria-hidden`, slide non-aktif `aria-hidden`.
- Tema terang/gelap: semua komponen memakai design token (`--color-*`) — terverifikasi kontras
  di kedua tema.

## Performance

- **Tanpa library animasi** — murni CSS keyframes + IntersectionObserver + Pointer/Touch Events.
- Animasi hanya transform/opacity; `will-change` dibatasi; parallax via CSS var tanpa re-render.
- Image: lazy loading default, windowing slider (±1), batch 8 di All Photos, `decoding=async`.
- DOM: slider member render maksimal 3 kartu; gallery slider render gambar maksimal 3 slide.
- Event listener: window listeners dipasang saat drag dan dilepas di pointerup/cancel (tidak
  menumpuk).
- Build: homepage tetap dynamic (force-dynamic, data DB), First Load JS shared 103 kB.

## Storage & Security

- **Storage**: tetap filesystem `public/uploads/gallery/` (sistem Phase 5 — TIDAK diganti;
  Supabase Storage tetap future improvement sesuai keputusan Phase 10/12). Path file acak
  (`test13-<ts>-<rand>.png` pattern: `Date.now() + crypto.randomBytes`).
- Upload tidak berubah: magic bytes JPG/PNG/WEBP, maks 5 MB, semua upload murid → PENDING.
- Moderasi tetap: hanya APPROVED tampil di beranda & galeri publik.
- Tidak ada secret di client; tidak ada service-role key; tidak ada query baru yang melebarkan
  akses (server-side Prisma dengan permission model existing).
- Foto hilang dari disk (kasus Vercel ephemeral FS) → fallback visual, bukan gambar pecah.
