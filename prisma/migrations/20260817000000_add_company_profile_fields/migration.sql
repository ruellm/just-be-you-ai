-- Company profile details (business redesign): six optional columns.
ALTER TABLE "companies" ADD COLUMN     "yearFounded" INTEGER,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "headquarters" TEXT,
ADD COLUMN     "type" TEXT,
ADD COLUMN     "industry" TEXT;
