-- CreateTable
CREATE TABLE "ScreenerHistory" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "jobDescriptionId" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "detectedName" TEXT NOT NULL DEFAULT '',
    "detectedEmail" TEXT NOT NULL DEFAULT '',
    "report" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScreenerHistory_userId_createdAt_idx" ON "ScreenerHistory"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ScreenerHistory" ADD CONSTRAINT "ScreenerHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
