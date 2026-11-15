-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('available', 'occupied', 'cleaning', 'maintenance');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('active', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid_pending_review', 'paid', 'rejected', 'overdue');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('pending', 'in_progress', 'completed');

-- CreateTable
CREATE TABLE "Room" (
    "id" UUID NOT NULL,
    "roomNumber" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "roomType" TEXT NOT NULL,
    "prices" DECIMAL(12,2) NOT NULL,
    "status" "RoomStatus" NOT NULL DEFAULT 'available',
    "amenities" TEXT[],
    "waterMeter" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "electricMeter" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "meterUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'active',
    "deposit" DECIMAL(12,2) NOT NULL,
    "advancePayment" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "billingPeriod" TEXT NOT NULL,
    "waterPrevious" DECIMAL(12,3) NOT NULL,
    "waterCurrent" DECIMAL(12,3) NOT NULL,
    "waterUnitPrice" DECIMAL(12,2) NOT NULL,
    "electricPrevious" DECIMAL(12,3) NOT NULL,
    "electricCurrent" DECIMAL(12,3) NOT NULL,
    "electricUnitPrice" DECIMAL(12,2) NOT NULL,
    "rent" DECIMAL(12,2) NOT NULL,
    "serviceFee" DECIMAL(12,2) NOT NULL,
    "waterTotal" DECIMAL(12,2) NOT NULL,
    "electricTotal" DECIMAL(12,2) NOT NULL,
    "grandTotal" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "slipUrl" TEXT,
    "slipId" TEXT,
    "paidAt" TIMESTAMP(3),
    "confirmedById" UUID,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "reportedById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'pending',
    "images" JSONB NOT NULL DEFAULT '[]',
    "repairLogs" JSONB NOT NULL DEFAULT '[]',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_roomNumber_key" ON "Room"("roomNumber");

-- CreateIndex
CREATE INDEX "Contract_tenantId_status_idx" ON "Contract"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_createdAt_idx" ON "Invoice"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_contractId_billingPeriod_key" ON "Invoice"("contractId", "billingPeriod");

-- CreateIndex
CREATE INDEX "Maintenance_roomId_status_idx" ON "Maintenance"("roomId", "status");

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A room can have only one active rental contract.
CREATE UNIQUE INDEX "Contract_active_room_key" ON "Contract" ("roomId") WHERE "status" = 'active';
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_dates_check" CHECK ("endDate" >= "startDate");
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_money_check" CHECK ("deposit" >= 0 AND "advancePayment" >= 0);
ALTER TABLE "Room" ADD CONSTRAINT "Room_values_check" CHECK ("floor" >= 1 AND "prices" >= 0 AND "waterMeter" >= 0 AND "electricMeter" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_values_check" CHECK ("waterCurrent" >= "waterPrevious" AND "electricCurrent" >= "electricPrevious" AND "rent" >= 0 AND "serviceFee" >= 0 AND "grandTotal" >= 0);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_period_check" CHECK ("billingPeriod" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_priority_check" CHECK ("priority" IN ('low', 'medium', 'high'));
