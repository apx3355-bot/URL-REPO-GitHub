import type { Metadata } from "next";
import { classInfo, getClassInfo } from "@/data/classInfo";
import { classMembers as staticMembers } from "@/data/classMembers";
import { prisma } from "@/lib/prisma";
import PublicLayout from "@/components/PublicLayout";
import AnggotaClient from "./AnggotaClient";
import type { ClassMember } from "@/types";

export const metadata: Metadata = {
  title: "Anggota",
  description: `Daftar anggota kelas ${classInfo.name} — ${classInfo.totalAnggota} siswa tahun ajaran ${classInfo.tahunAjaran}.`,
};

export const dynamic = "force-dynamic";

// Ambil anggota dari database; fallback ke data statis jika DB kosong/gagal.
// Foto: ClassMember.photo dulu; jika kosong, pakai foto profil akun yang
// ter-link (ClassMember → User → Profile.photo) — field sensitif tidak di-select.
async function getMembers(): Promise<ClassMember[]> {
  try {
    const rows = await prisma.classMember.findMany({
      orderBy: [{ position: { sort: "desc", nulls: "last" } }, { fullName: "asc" }],
      take: 200,
      include: {
        user: { select: { profile: { select: { fullName: true, photo: true } } } },
      },
    });
    if (rows.length === 0) return staticMembers;
    return rows.map((r) => ({
      id: r.id,
      name: r.fullName,
      photo: r.photo ?? r.user?.profile?.photo ?? null,
      position: r.position,
      nisn: r.nisn ?? undefined,
    }));
  } catch {
    return staticMembers;
  }
}

export default async function AnggotaPage() {
  const members = await getMembers();
  // Jumlah anggota mengikuti konfigurasi (Settings) — bukan angka hardcoded
  const info = await getClassInfo();
  return (
    <PublicLayout>
      <AnggotaClient
        members={members}
        totalLabel={`${info.totalAnggota} siswa kelas ${info.name} tahun ajaran ${info.tahunAjaran}.`}
      />
    </PublicLayout>
  );
}
