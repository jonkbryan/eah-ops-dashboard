-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN     "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
