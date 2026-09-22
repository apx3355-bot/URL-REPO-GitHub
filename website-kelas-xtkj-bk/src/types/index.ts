export interface ClassMember {
  id: number;
  name: string;
  photo: string | null;
  position: string | null;
  nisn?: string;
}

export interface ClassStructure {
  id: number;
  name: string;
  position: string;
  photo: string | null;
  order: number;
  tier: "teacher" | "leader" | "deputy" | "secretary" | "treasurer" | "section";
  description?: string;
}

export interface GalleryItem {
  id: number;
  title: string;
  image: string;
  category: GalleryCategory;
  date: string;
  description?: string;
}

export type GalleryCategory =
  | "Kegiatan Kelas"
  | "Praktik"
  | "Acara Sekolah"
  | "Lainnya";

export interface ClassInfo {
  name: string;
  jurusan: string;
  waliKelas: string;
  tahunAjaran: string;
  totalAnggota: number;
  sekolah: string;
  angkatan: string;
}
