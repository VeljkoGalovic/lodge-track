-- AlterEnum
CREATE TYPE "BookingType" AS ENUM ('WHOLE_UNIT', 'SHARED_BED');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "allowSharedBookings" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "type" "BookingType" NOT NULL DEFAULT 'WHOLE_UNIT',
ADD COLUMN     "bedIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
