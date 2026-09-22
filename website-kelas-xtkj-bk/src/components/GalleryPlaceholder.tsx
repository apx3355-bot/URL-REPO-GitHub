// Placeholder gambar galeri — sebuah block warna solid dengan label
// Ganti src dengan URL Supabase Storage pada Phase 3

interface GalleryPlaceholderProps {
  title: string;
  category: string;
  index: number;
}

const categoryColors: Record<string, string> = {
  "Kegiatan Kelas": "#dbeafe",
  Praktik: "#dcfce7",
  "Acara Sekolah": "#fef3c7",
  Lainnya: "#f3f4f6",
};

const categoryTextColors: Record<string, string> = {
  "Kegiatan Kelas": "#1e40af",
  Praktik: "#166534",
  "Acara Sekolah": "#92400e",
  Lainnya: "#374151",
};

export default function GalleryPlaceholder({
  title,
  category,
  index,
}: GalleryPlaceholderProps) {
  const bg = categoryColors[category] ?? "#f3f4f6";
  const textColor = categoryTextColors[category] ?? "#374151";
  // Create slight tone variation by index
  const opacity = 0.6 + (index % 4) * 0.1;

  return (
    <div
      role="img"
      aria-label={title}
      style={{
        width: "100%",
        aspectRatio: "4/3",
        background: bg,
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        borderRadius: "4px",
      }}
    >
      <span
        style={{
          fontSize: "0.65rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: textColor,
          opacity: 0.7,
        }}
      >
        {category}
      </span>
      <span
        style={{
          fontSize: "0.8rem",
          fontWeight: 500,
          color: textColor,
          textAlign: "center",
          padding: "0 1rem",
        }}
      >
        {title}
      </span>
    </div>
  );
}
