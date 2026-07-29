ALTER TABLE "Company"
ADD COLUMN "coverUrl" TEXT,
ADD COLUMN "catalogUrl" TEXT,
ADD COLUMN "sector" TEXT,
ADD COLUMN "city" TEXT,
ADD COLUMN "website" TEXT,
ADD COLUMN "contactEmail" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "establishedYear" INTEGER,
ADD COLUMN "employeeCount" INTEGER;

CREATE INDEX "Company_sector_idx" ON "Company"("sector");
CREATE INDEX "Company_city_idx" ON "Company"("city");
