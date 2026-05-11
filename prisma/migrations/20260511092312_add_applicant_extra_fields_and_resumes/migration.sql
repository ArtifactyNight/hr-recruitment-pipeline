-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN     "certificates" JSONB[] DEFAULT ARRAY[]::JSONB[],
ADD COLUMN     "educations" JSONB[] DEFAULT ARRAY[]::JSONB[],
ADD COLUMN     "experiences" JSONB[] DEFAULT ARRAY[]::JSONB[],
ADD COLUMN     "jobPostingUrl" TEXT;

-- CreateTable
CREATE TABLE "ApplicantResume" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "size" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicantResume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicantResume_applicantId_idx" ON "ApplicantResume"("applicantId");

-- AddForeignKey
ALTER TABLE "ApplicantResume" ADD CONSTRAINT "ApplicantResume_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
