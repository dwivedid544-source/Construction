-- CreateTable
CREATE TABLE IF NOT EXISTS "processed_webhook_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processed_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "subscription_orders" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "processed_webhook_events_eventId_key" ON "processed_webhook_events"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_orders_orderId_key" ON "subscription_orders"("orderId");

-- Migration checks to handle existing pushed schema fields
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscription_orders' AND column_name='amount') THEN
        ALTER TABLE "subscription_orders" ADD COLUMN IF NOT EXISTS "amountPaise" INTEGER;
        UPDATE "subscription_orders" SET "amountPaise" = CAST("amount" * 100 AS INTEGER) WHERE "amountPaise" IS NULL;
        ALTER TABLE "subscription_orders" ALTER COLUMN "amountPaise" SET NOT NULL;
        ALTER TABLE "subscription_orders" DROP COLUMN "amount";
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='processed_webhook_events' AND column_name='status') THEN
        ALTER TABLE "processed_webhook_events" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PROCESSING';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='processed_webhook_events' AND column_name='updatedAt') THEN
        ALTER TABLE "processed_webhook_events" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;
