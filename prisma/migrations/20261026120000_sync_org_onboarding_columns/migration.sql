-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionTier_new" AS ENUM ('STARTER', 'PRO', 'BUSINESS');
ALTER TABLE "public"."Subscription" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "tier" TYPE "SubscriptionTier_new" USING ("tier"::text::"SubscriptionTier_new");
ALTER TYPE "SubscriptionTier" RENAME TO "SubscriptionTier_old";
ALTER TYPE "SubscriptionTier_new" RENAME TO "SubscriptionTier";
DROP TYPE "public"."SubscriptionTier_old";
ALTER TABLE "Subscription" ALTER COLUMN "tier" SET DEFAULT 'STARTER';
COMMIT;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "externalUid" TEXT;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "checkInTime" TEXT NOT NULL DEFAULT '15:00',
ADD COLUMN     "checkOutTime" TEXT NOT NULL DEFAULT '11:00',
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "onboardingWalkthroughCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateIndex
CREATE UNIQUE INDEX "Booking_propertyId_externalUid_key" ON "Booking"("propertyId", "externalUid");

