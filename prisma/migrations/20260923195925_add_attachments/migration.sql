-- CreateEnum
CREATE TYPE "AttachmentModule" AS ENUM ('EXPENSE', 'BOOKING', 'PROPERTY', 'UNIT', 'USER_AVATAR');

-- CreateTable
CREATE TABLE "LegalConsent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tosVersion" TEXT NOT NULL,
    "privacyPolicyVersion" TEXT NOT NULL,
    "consentTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "module" "AttachmentModule" NOT NULL,
    "moduleId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL DEFAULT 'attachments',
    "objectPath" TEXT NOT NULL,
    "supabaseId" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "checksum" TEXT,
    "description" TEXT,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LegalConsent_userId_idx" ON "LegalConsent"("userId");

-- CreateIndex
CREATE INDEX "Attachment_orgId_module_moduleId_idx" ON "Attachment"("orgId", "module", "moduleId");

-- CreateIndex
CREATE INDEX "Attachment_orgId_createdAt_idx" ON "Attachment"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Attachment_orgId_fileSize_idx" ON "Attachment"("orgId", "fileSize");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- AddForeignKey
ALTER TABLE "LegalConsent" ADD CONSTRAINT "LegalConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Expense"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
