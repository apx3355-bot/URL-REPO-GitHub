"use client";

import { useState } from "react";
import PhotoImg from "./PhotoImg";
import type { ViewerPhoto } from "./PhotoViewer";

interface AllPhotosProps {
  photos: ViewerPhoto[];
  onOpenViewer: (index: number) => void;
}

const PAGE_SIZE = 8;

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * All Photos (Phase 13) — grid/masonry semua foto galeri APPROVED:
 * - CSS columns (masonry ringan) + "Muat lebih banyak" (batch 8) —
 *   foto jauh di bawah lipatan tidak dimuat sekaligus (lazy img native).
 * - Setiap item membuka PhotoViewer yang sama dengan Class Gallery.
 */
export default function AllPhotos({ photos, onOpenViewer }: AllPhotosProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = photos.slice(0, visible);
  const hasMore = photos.length > shown.length;

  return (
    <>
      <div className="hx-masonry">
        {shown.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className="hx-masonry-item"
            onClick={() => onOpenViewer(i)}
            aria-label={`Buka foto: ${p.title}`}
          >
            <PhotoImg src={p.image} alt={p.title} />
            <div className="hx-masonry-caption">
              <p className="hx-masonry-title">{p.title}</p>
              {p.date && <p className="hx-masonry-date">{formatDate(p.date)}</p>}
            </div>
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          className="hx-load-more"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
        >
          Muat lebih banyak ({photos.length - shown.length} lagi)
        </button>
      )}
    </>
  );
}
