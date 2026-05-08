-- Internal HR notes on applicant (editable from tracker detail).

ALTER TABLE "Applicant" ADD COLUMN IF NOT EXISTS "notes" TEXT;
