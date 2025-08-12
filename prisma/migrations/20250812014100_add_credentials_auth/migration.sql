-- CreateEnum
CREATE TYPE "BuildingType" AS ENUM ('PEB', 'LGS');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "buildingType" "BuildingType";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);
