import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getQuotaStatus } from "@/lib/settings";
import DeveloperDashboard from "./DeveloperDashboard";
import WaliKelasDashboard from "./WaliKelasDashboard";
import AnggotaDashboard from "./AnggotaDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) return null;

  const [memberCount, announcementCount, scheduleCount, structureCount] =
    await Promise.all([
      prisma.classMember.count(),
      prisma.announcement.count({ where: { status: "PUBLISHED" } }),
      prisma.schedule.count(),
      prisma.classStructure.count(),
    ]);

  const latestAnnouncements = await prisma.announcement.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      author: { select: { profile: { select: { fullName: true } } } },
    },
  });

  const schedules = await prisma.schedule.findMany({ take: 200 });

  if (user.role === "DEVELOPER") {
    const [recentLogs, totalUsers, totalMurid, totalWali, totalDeveloper, pendingGallery, quota] =
      await Promise.all([
        prisma.activityLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: { select: { username: true, profile: { select: { fullName: true } } } },
          },
        }),
        prisma.user.count(),
        prisma.user.count({ where: { role: "ANGGOTA" } }),
        prisma.user.count({ where: { role: "WALI_KELAS" } }),
        prisma.user.count({ where: { role: "DEVELOPER" } }),
        prisma.galleryItem.count({ where: { status: "PENDING" } }),
        getQuotaStatus(),
      ]);

    return (
      <DeveloperDashboard
        user={user}
        stats={{
          members: memberCount,
          announcements: announcementCount,
          schedules: scheduleCount,
          structure: structureCount,
        }}
        system={{
          totalUsers,
          totalMurid,
          totalWali,
          totalDeveloper,
          pendingGallery,
          quota,
        }}
        announcements={latestAnnouncements}
        logs={recentLogs}
      />
    );
  }

  if (user.role === "WALI_KELAS") {
    return (
      <WaliKelasDashboard
        user={user}
        stats={{ members: memberCount, announcements: announcementCount, schedules: scheduleCount }}
        announcements={latestAnnouncements}
        schedules={schedules}
      />
    );
  }

  return (
    <AnggotaDashboard
      user={user}
      announcements={latestAnnouncements}
      schedules={schedules}
      structureCount={structureCount}
    />
  );
}
