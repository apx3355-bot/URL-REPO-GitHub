"use client";

import { useState } from "react";
import GallerySlider from "./GallerySlider";
import AllPhotos from "./AllPhotos";
import PhotoViewer, { type ViewerPhoto } from "./PhotoViewer";

/**
 * Area galeri homepage (Phase 13) — satu sumber data (galeri APPROVED
 * dari DB, sistem Phase 5): Class Gallery slider + All Photos grid,
 * keduanya membuka PhotoViewer yang sama. Tidak ada database foto kedua.
 */
export default function HomeGallery({ photos }: { photos: ViewerPhoto[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <>
      <GallerySlider photos={photos} onOpenViewer={(i) => setViewerIndex(i)} />

      <div className="hx-allphotos">
        <div className="hx-allphotos-head">
          <h3 className="hx-allphotos-title">Semua Foto</h3>
          <span className="hx-allphotos-count">{photos.length} foto</span>
        </div>
        <AllPhotos photos={photos} onOpenViewer={(i) => setViewerIndex(i)} />
      </div>

      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          index={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onIndexChange={setViewerIndex}
        />
      )}
    </>
  );
}
