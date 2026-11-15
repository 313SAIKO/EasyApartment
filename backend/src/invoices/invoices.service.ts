import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../database/prisma.service';
import { roomResponse, tenantResponse } from '../database/responses';
import { UploadService } from '../upload/upload.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

const include = { room: true, tenant: true, contract: true } as const;
type InvoiceRecord = Prisma.InvoiceGetPayload<{ include: typeof include }>;
function response(invoice: InvoiceRecord) {
  return {
    _id: invoice.id,
    roomId: roomResponse(invoice.room),
    tenantId: tenantResponse(invoice.tenant),
    contractId: { _id: invoice.contractId },
    billingPeriod: invoice.billingPeriod,
    meters: {
      water: {
        previous: Number(invoice.waterPrevious),
        current: Number(invoice.waterCurrent),
        unitPrice: Number(invoice.waterUnitPrice),
      },
      electric: {
        previous: Number(invoice.electricPrevious),
        current: Number(invoice.electricCurrent),
        unitPrice: Number(invoice.electricUnitPrice),
      },
    },
    amounts: {
      rent: Number(invoice.rent),
      serviceFee: Number(invoice.serviceFee),
      waterTotal: Number(invoice.waterTotal),
      electricTotal: Number(invoice.electricTotal),
      grandTotal: Number(invoice.grandTotal),
    },
    payment: {
      status: invoice.status,
      slipUrl: invoice.slipUrl,
      slipId: invoice.slipId,
      paidAt: invoice.paidAt,
      confirmedBy: invoice.confirmedById,
      confirmedAt: invoice.confirmedAt,
    },
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);
  constructor(
    private readonly db: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async create(dto: CreateInvoiceDto) {
    const invoice = await this.db.$transaction(
      async (tx) => {
        const contract = await tx.contract.findUnique({
          where: { id: dto.contractId },
          include: { room: true },
        });
        if (!contract || contract.status !== 'active')
          throw new BadRequestException('Active contract required');
        const room = contract.room;
        const waterCurrent = new Prisma.Decimal(dto.meters.water.current);
        const electricCurrent = new Prisma.Decimal(dto.meters.electric.current);
        const waterUsed = waterCurrent.minus(room.waterMeter);
        const electricUsed = electricCurrent.minus(room.electricMeter);
        if (waterUsed.isNegative() || electricUsed.isNegative())
          throw new BadRequestException('Meter cannot decrease');
        const waterTotal = waterUsed.mul(10).toDecimalPlaces(2);
        const electricTotal = electricUsed.mul(8).toDecimalPlaces(2);
        const result = await tx.invoice.create({
          data: {
            contractId: contract.id,
            roomId: room.id,
            tenantId: contract.tenantId,
            billingPeriod: dto.billingPeriod,
            waterPrevious: room.waterMeter,
            waterCurrent,
            waterUnitPrice: 10,
            electricPrevious: room.electricMeter,
            electricCurrent,
            electricUnitPrice: 8,
            rent: dto.amounts.rent,
            serviceFee: dto.amounts.serviceFee,
            waterTotal,
            electricTotal,
            grandTotal: waterTotal
              .plus(electricTotal)
              .plus(dto.amounts.rent)
              .plus(dto.amounts.serviceFee),
          },
          include,
        });
        const updatedRoom = await tx.room.update({
          where: { id: room.id },
          data: {
            waterMeter: waterCurrent,
            electricMeter: electricCurrent,
            meterUpdatedAt: new Date(),
          },
        });
        return { ...result, room: updatedRoom };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return response(invoice);
  }

  async pay(
    id: string,
    tenantId: string,
    file: Express.Multer.File,
    paidAt: string,
  ) {
    if (!isUUID(id)) throw new NotFoundException('Invoice not found');
    const invoice = await this.db.invoice.findFirst({
      where: { id, tenantId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!['pending', 'rejected', 'overdue'].includes(invoice.status))
      throw new ConflictException('Invoice cannot accept a payment');
    if (!file) throw new BadRequestException('File is required');
    const upload = await this.uploadService.uploadImage(file, 'invoice-slips');
    try {
      const updated = await this.db.invoice.updateMany({
        where: {
          id,
          tenantId,
          status: invoice.status,
          updatedAt: invoice.updatedAt,
        },
        data: {
          status: 'paid_pending_review',
          slipUrl: upload.secure_url,
          slipId: upload.public_id,
          paidAt: new Date(paidAt),
          confirmedAt: null,
          confirmedById: null,
        },
      });
      if (updated.count !== 1)
        throw new ConflictException('Invoice changed; reload and retry');
    } catch (error) {
      await this.uploadService
        .deleteImage(upload.public_id)
        .catch(() => this.logger.warn('Slip cleanup failed'));
      throw error;
    }
    if (invoice.slipId)
      await this.uploadService
        .deleteImage(invoice.slipId)
        .catch(() => this.logger.warn('Previous slip cleanup failed'));
    return this.findOne(id, { sub: tenantId, role: 'tenant', email: '' });
  }

  async confirm(id: string, adminId: string, status: 'paid' | 'rejected') {
    if (!isUUID(id)) throw new NotFoundException('Invoice not found');
    const result = await this.db.invoice.updateMany({
      where: { id, status: 'paid_pending_review' },
      data: { status, confirmedById: adminId, confirmedAt: new Date() },
    });
    if (!result.count)
      throw new ConflictException('Invoice is not awaiting review');
    return this.findOne(id, { sub: adminId, role: 'admin', email: '' });
  }

  async findAll() {
    return (
      await this.db.invoice.findMany({
        include,
        orderBy: { createdAt: 'desc' },
      })
    ).map(response);
  }

  async findOne(id: string, user: JwtPayload) {
    if (!isUUID(id)) throw new NotFoundException('Invoice not found');
    const invoice = await this.db.invoice.findFirst({
      where: { id, ...(user.role === 'admin' ? {} : { tenantId: user.sub }) },
      include,
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return response(invoice);
  }

  async getInvoicesByTenant(tenantId: string) {
    return (
      await this.db.invoice.findMany({
        where: { tenantId },
        include,
        orderBy: { createdAt: 'desc' },
      })
    ).map(response);
  }

  async remove(id: string) {
    if (!isUUID(id)) throw new NotFoundException('Invoice not found');
    await this.db.$transaction(
      async (tx) => {
        const invoice = await tx.invoice.findUnique({ where: { id } });
        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== 'pending' || invoice.slipId) {
          throw new ConflictException(
            'Only unpaid invoices without payment evidence can be deleted',
          );
        }
        const newer = await tx.invoice.findFirst({
          where: {
            roomId: invoice.roomId,
            createdAt: { gt: invoice.createdAt },
          },
        });
        if (newer)
          throw new ConflictException(
            'Delete the latest room invoice first to preserve meter readings',
          );
        const room = await tx.room.findUniqueOrThrow({
          where: { id: invoice.roomId },
        });
        if (
          !room.waterMeter.equals(invoice.waterCurrent) ||
          !room.electricMeter.equals(invoice.electricCurrent)
        ) {
          throw new ConflictException('Room meter readings have changed');
        }
        await tx.invoice.delete({ where: { id } });
        await tx.room.update({
          where: { id: room.id },
          data: {
            waterMeter: invoice.waterPrevious,
            electricMeter: invoice.electricPrevious,
            meterUpdatedAt: new Date(),
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return { message: 'Invoice deleted' };
  }
}
