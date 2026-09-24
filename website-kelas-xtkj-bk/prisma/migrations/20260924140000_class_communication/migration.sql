-- Phase 11: Class Communication & Interaction
-- Tabel baru: DiscussionPost, DiscussionReply, ClassEvent, Notification
-- Kolom baru: Announcement.pinned
-- RLS: mengikuti pola Phase 9 — policy app_full_access hanya untuk role privat
-- app_webkelas; anon/authenticated Supabase tetap default-deny.

-- CreateTable
CREATE TABLE "DiscussionPost" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscussionPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionReply" (
    "id" SERIAL NOT NULL,
    "postId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "targetType" TEXT,
    "targetId" INTEGER,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscussionPost_createdAt_idx" ON "DiscussionPost"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "DiscussionReply_postId_createdAt_idx" ON "DiscussionReply"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassEvent_eventDate_idx" ON "ClassEvent"("eventDate");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionReply" ADD CONSTRAINT "DiscussionReply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "DiscussionPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionReply" ADD CONSTRAINT "DiscussionReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEvent" ADD CONSTRAINT "ClassEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: pin pengumuman (Phase 11)
ALTER TABLE "Announcement" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;

-- ===================================
-- RLS: 4 tabel baru mengikuti pola tabel existing
-- ===================================
ALTER TABLE "DiscussionPost" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscussionReply" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ClassEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_full_access" ON "DiscussionPost" FOR ALL TO "app_webkelas" USING (true) WITH CHECK (true);
CREATE POLICY "app_full_access" ON "DiscussionReply" FOR ALL TO "app_webkelas" USING (true) WITH CHECK (true);
CREATE POLICY "app_full_access" ON "ClassEvent" FOR ALL TO "app_webkelas" USING (true) WITH CHECK (true);
CREATE POLICY "app_full_access" ON "Notification" FOR ALL TO "app_webkelas" USING (true) WITH CHECK (true);

-- Hak DML untuk role aplikasi (pola sama dengan tabel Phase 9):
-- RLS + policy membatasi BARIS yang terlihat; GRANT memberi hak akses TABEL.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "DiscussionPost", "DiscussionReply", "ClassEvent", "Notification" TO "app_webkelas";
GRANT USAGE, SELECT ON SEQUENCE "DiscussionPost_id_seq", "DiscussionReply_id_seq", "ClassEvent_id_seq", "Notification_id_seq" TO "app_webkelas";
