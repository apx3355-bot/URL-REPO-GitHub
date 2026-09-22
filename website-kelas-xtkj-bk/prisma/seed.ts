import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const devPass = process.env.SEED_DEVELOPER_PASSWORD || "Dev!XtkjBk2025";
  const waliPass = process.env.SEED_WALI_KELAS_PASSWORD || "Wali!XtkjBk2025";
  const anggotaPass = process.env.SEED_ANGGOTA_PASSWORD || "Anggota!XtkjBk2025";

  // --- USERS ---
  const developer = await prisma.user.upsert({
    where: { username: "developer" },
    update: {},
    create: {
      username: "developer",
      passwordHash: await bcrypt.hash(devPass, 12),
      role: "DEVELOPER",
      profile: {
        create: { fullName: "Developer Kelas" },
      },
    },
  });

  const waliKelas = await prisma.user.upsert({
    where: { username: "walikelas" },
    update: {},
    create: {
      username: "walikelas",
      passwordHash: await bcrypt.hash(waliPass, 12),
      role: "WALI_KELAS",
      profile: {
        create: { fullName: "[Nama Wali Kelas]" },
      },
      member: {
        create: {
          fullName: "[Nama Wali Kelas]",
          position: "Wali Kelas",
        },
      },
    },
  });

  const anggota = await prisma.user.upsert({
    where: { username: "anggota" },
    update: {},
    create: {
      username: "anggota",
      passwordHash: await bcrypt.hash(anggotaPass, 12),
      role: "ANGGOTA",
      profile: {
        create: { fullName: "[Nama Anggota Contoh]", nisn: "0000000001" },
      },
      member: {
        create: {
          fullName: "[Nama Anggota Contoh]",
          nisn: "0000000001",
        },
      },
    },
  });

  // Akun murid kedua untuk uji galeri/moderasi
  await prisma.user.upsert({
    where: { username: "murid2" },
    update: {},
    create: {
      username: "murid2",
      passwordHash: await bcrypt.hash(anggotaPass, 12),
      role: "ANGGOTA",
      profile: {
        create: { fullName: "[Nama Murid Dua]", nisn: "0000000002" },
      },
    },
  });

  // --- ANGGOTA KELAS (36 siswa, placeholder) ---
  const existingMembers = await prisma.classMember.count();
  if (existingMembers === 0) {
    const positions = [
      "Ketua Kelas",
      "Wakil Ketua",
      "Sekretaris I",
      "Sekretaris II",
      "Bendahara I",
      "Bendahara II",
    ];
    const data = Array.from({ length: 36 }, (_, i) => ({
      fullName: `[Nama Siswa ${i + 1}]`,
      position: positions[i] ?? null,
      nisn: null,
    }));
    await prisma.classMember.createMany({ data });
    console.log(`Seeded ${data.length} anggota kelas.`);
  }

  // --- STRUKTUR KELAS ---
  const existingStructure = await prisma.classStructure.count();
  if (existingStructure === 0) {
    await prisma.classStructure.createMany({
      data: [
        {
          name: "[Nama Wali Kelas]",
          position: "Wali Kelas",
          tier: "teacher",
          order: 1,
          description: "Guru pembimbing kelas X TKJ BK",
        },
        { name: "[Nama Ketua]", position: "Ketua Kelas", tier: "leader", order: 2 },
        { name: "[Nama Wakil]", position: "Wakil Ketua", tier: "deputy", order: 3 },
        { name: "[Nama Sekretaris 1]", position: "Sekretaris I", tier: "secretary", order: 4 },
        { name: "[Nama Sekretaris 2]", position: "Sekretaris II", tier: "secretary", order: 5 },
        { name: "[Nama Bendahara 1]", position: "Bendahara I", tier: "treasurer", order: 6 },
        { name: "[Nama Bendahara 2]", position: "Bendahara II", tier: "treasurer", order: 7 },
      ],
    });
    console.log("Seeded struktur kelas.");
  }

  // --- JADWAL ---
  const existingSchedules = await prisma.schedule.count();
  if (existingSchedules === 0) {
    await prisma.schedule.createMany({
      data: [
        { day: "SENIN", startTime: "07:00", endTime: "09:30", subject: "Matematika", teacher: "[Guru Matematika]", room: "R-101" },
        { day: "SENIN", startTime: "10:00", endTime: "12:30", subject: "Bahasa Indonesia", teacher: "[Guru B. Indonesia]", room: "R-101" },
        { day: "SELASA", startTime: "07:00", endTime: "09:30", subject: "Dasar-Dasar TKJ", teacher: "[Guru TKJ]", room: "Lab TKJ" },
        { day: "SELASA", startTime: "10:00", endTime: "12:30", subject: "Pendidikan Agama", teacher: "[Guru Agama]", room: "R-102" },
        { day: "RABU", startTime: "07:00", endTime: "11:30", subject: "Praktik Jaringan", teacher: "[Guru TKJ]", room: "Lab Jaringan" },
        { day: "KAMIS", startTime: "07:00", endTime: "09:30", subject: "Bahasa Inggris", teacher: "[Guru B. Inggris]", room: "R-101" },
        { day: "KAMIS", startTime: "10:00", endTime: "12:30", subject: "PPKn", teacher: "[Guru PPKn]", room: "R-101" },
        { day: "JUMAT", startTime: "07:00", endTime: "09:00", subject: "Informatika", teacher: "[Guru Informatika]", room: "Lab Komputer" },
      ],
    });
    console.log("Seeded jadwal.");
  }

  // --- PENGUMUMAN CONTOH ---
  const existingAnnouncements = await prisma.announcement.count();
  if (existingAnnouncements === 0) {
    await prisma.announcement.createMany({
      data: [
        {
          title: "Selamat Datang di Website Kelas",
          content:
            "Website resmi kelas X TKJ BK telah dirilis. Silakan jelajahi halaman anggota, struktur, dan galeri. Pengumuman penting akan diposting di sini.",
          status: "PUBLISHED",
          authorId: developer.id,
        },
        {
          title: "Jadwal Praktik Jaringan Minggu Ini",
          content:
            "Praktik konfigurasi router dasar akan dilaksanakan Rabu pukul 07:00 di Lab Jaringan. Pastikan membawa modul praktikum.",
          status: "PUBLISHED",
          authorId: waliKelas.id,
        },
      ],
    });
    console.log("Seeded pengumuman.");
  }

  // --- ACTIVITY LOG ---
  const existingLogs = await prisma.activityLog.count();
  if (existingLogs === 0) {
    await prisma.activityLog.createMany({
      data: [developer.id, waliKelas.id, anggota.id].map((userId) => ({
        userId,
        action: "SEED",
        description: "Data awal di-seed ke database",
      })),
    });
  }

  console.log("Seed selesai:", {
    developer: developer.username,
    waliKelas: waliKelas.username,
    anggota: anggota.username,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
