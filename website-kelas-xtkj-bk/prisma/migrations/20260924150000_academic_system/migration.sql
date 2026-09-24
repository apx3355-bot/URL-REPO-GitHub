-- Phase 12: Academic & Class Management
-- Tabel baru: Material, Assignment, Submission (nilai terintegrasi)
-- RLS: pola Phase 9/11 — policy app_full_access hanya untuk role privat app_webkelas.

-- CreateTable
CREATE TABLE "Material" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "externalUrl" TEXT,
    "fileName" TEXT,
    "fileMime" TEXT,
    "fileData" TEXT,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "fileName" TEXT,
    "fileMime" TEXT,
    "fileData" TEXT,
    "fileSize" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "authorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "note" TEXT,
    "fileName" TEXT,
    "fileMime" TEXT,
    "fileData" TEXT,
    "fileSize" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "grade" INTEGER,
    "feedback" TEXT,
    "gradedById" INTEGER,
    "gradedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Material_status_createdAt_idx" ON "Material"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Assignment_status_dueDate_idx" ON "Assignment"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Submission_studentId_idx" ON "Submission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_assignmentId_studentId_key" ON "Submission"("assignmentId", "studentId");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_gradedById_fkey" FOREIGN KEY ("gradedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS
ALTER TABLE "Material" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Submission" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_full_access" ON "Material" FOR ALL TO "app_webkelas" USING (true) WITH CHECK (true);
CREATE POLICY "app_full_access" ON "Assignment" FOR ALL TO "app_webkelas" USING (true) WITH CHECK (true);
CREATE POLICY "app_full_access" ON "Submission" FOR ALL TO "app_webkelas" USING (true) WITH CHECK (true);

-- Hak DML + sequences untuk role aplikasi (pola Phase 11 — tanpa ini: permission denied)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "Material", "Assignment", "Submission" TO "app_webkelas";
GRANT USAGE, SELECT ON SEQUENCE "Material_id_seq", "Assignment_id_seq", "Submission_id_seq" TO "app_webkelas";
