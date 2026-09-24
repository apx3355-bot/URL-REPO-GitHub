"use client";

import { useState } from "react";

interface PhotoImgProps {
  src: string;
  alt: string;
  /** eager = jangan lazy (slide aktif / viewer) */
  eager?: boolean;
  className?: string;
}

/**
 * <img> galeri dengan fallback: bila src kosong atau gagal dimuat
 * (file terhapus/missing), tampilkan placeholder "foto tidak tersedia"
 * alih-alih gambar pecah. Lazy by default (performance Phase 13).
 */
export default function PhotoImg({ src, alt, eager = false, className }: PhotoImgProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="hx-photo-broken" role="img" aria-label="Foto tidak tersedia">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
        <span>Foto tidak tersedia</span>
      </div>
    );
  }

  return (
    // Data URL / path publik statis — next/image tidak memberi manfaat di sini.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
