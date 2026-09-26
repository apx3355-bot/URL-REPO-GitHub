"use client";

import { useState } from "react";
import MemberAvatar from "@/components/MemberAvatar";

interface AvatarDisplayProps {
  name: string;
  photo?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 44,
  lg: 64,
  xl: 88,
};

// Avatar berlapis: foto profil (jika ada) → fallback inisial (MemberAvatar).
// `photo` berisi base64 murni ATAU data URL lengkap — keduanya valid sebagai <img src>.
// Jika foto ada tapi GAGAL dimuat (base64 rusak / file hilang), jatuh ke
// inisial via onError — layout tidak rusak (ukuran tetap, object-fit cover).
// Mime dideteksi dari magic bytes base64 (PNG/JPEG/WEBP) — upload mengizinkan
// ketiganya, jadi TIDAK boleh diasumsikan JPEG (fallback lama merender PNG
// dengan mime salah — beberapa browser menolak menampilkannya).
function detectImageSrc(photo: string): string {
  if (photo.startsWith("data:")) return photo;
  const mime = photo.startsWith("iVBORw0")
    ? "image/png"
    : photo.startsWith("UklGR")
      ? "image/webp"
      : "image/jpeg";
  return `data:${mime};base64,${photo}`;
}

export default function AvatarDisplay({
  name,
  photo,
  size = "md",
  className = "",
}: AvatarDisplayProps) {
  const [broken, setBroken] = useState(false);

  if (!photo || broken) {
    return <MemberAvatar name={name} size={size} className={className} />;
  }

  const src = detectImageSrc(photo);
  const px = sizeMap[size];

  return (
    // Data URL inline tidak bisa dioptimasi next/image — <img> adalah pilihan yang benar di sini.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Foto profil ${name}`}
      width={px}
      height={px}
      className={className}
      onError={() => setBroken(true)}
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    />
  );
}
