import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ContractStatus, Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../database/prisma.service';
import { contractResponse } from '../database/responses';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  constructor(private readonly db: PrismaService) {}

  async create(dto: CreateContractDto) {
    const result = await this.db.$transaction(
      async (tx) => {
        const tenant = await tx.user.findUnique({
          where: { id: dto.tenantId },
        });
        if (tenant?.role !== 'tenant')
          throw new BadRequestException('A tenant account is required');
        if (new Date(dto.endDate) < new Date(dto.startDate))
          throw new BadRequestException('End date must not precede start date');
        const contract = await tx.contract.create({
          data: {
            roomId: dto.roomId,
            tenantId: dto.tenantId,
            type: dto.type,
            status: dto.status as ContractStatus,
            startDate: new Date(dto.startDate),
            endDate: new Date(dto.endDate),
            deposit: dto.financials.deposit,
            advancePayment: dto.financials.advancePayment,
          },
          include: { room: true, tenant: true },
        });
        if (contract.status === 'active')
          contract.room = await tx.room.update({
            where: { id: dto.roomId },
            data: { status: 'occupied' },
          });
        return contract;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return contractResponse(result);
  }

  async findAll() {
    return (
      await this.db.contract.findMany({
        include: { room: true, tenant: true },
        orderBy: { createdAt: 'desc' },
      })
    ).map(contractResponse);
  }

  async findOne(id: string, user: JwtPayload) {
    if (!isUUID(id)) throw new NotFoundException('Contract not found');
    const contract = await this.db.contract.findFirst({
      where: { id, ...(user.role === 'admin' ? {} : { tenantId: user.sub }) },
      include: { room: true, tenant: true },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    return contractResponse(contract);
  }

  async findByTenantId(tenantId: string) {
    const contract = await this.db.contract.findFirst({
      where: { tenantId, status: 'active' },
      include: { room: true, tenant: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!contract) throw new NotFoundException('Active contract not found');
    return contractResponse(contract);
  }

  async update(id: string, dto: UpdateContractDto) {
    if (!isUUID(id)) throw new NotFoundException('Contract not found');
    const result = await this.db.$transaction(
      async (tx) => {
        const existing = await tx.contract.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Contract not found');
        if (
          new Date(dto.endDate ?? existing.endDate) <
          new Date(dto.startDate ?? existing.startDate)
        )
          throw new BadRequestException('End date must not precede start date');
        if (
          (dto.roomId && dto.roomId !== existing.roomId) ||
          (dto.tenantId && dto.tenantId !== existing.tenantId)
        ) {
          if (await tx.invoice.count({ where: { contractId: id } }))
            throw new ConflictException(
              'A billed contract cannot be reassigned; create a new contract',
            );
        }
        if (dto.tenantId) {
          const tenant = await tx.user.findUnique({
            where: { id: dto.tenantId },
          });
          if (tenant?.role !== 'tenant')
            throw new BadRequestException('A tenant account is required');
        }
        const updated = await tx.contract.update({
          where: { id },
          data: {
            roomId: dto.roomId,
            tenantId: dto.tenantId,
            type: dto.type,
            status: dto.status,
            startDate: dto.startDate ? new Date(dto.startDate) : undefined,
            endDate: dto.endDate ? new Date(dto.endDate) : undefined,
            deposit: dto.financials?.deposit,
            advancePayment: dto.financials?.advancePayment,
          },
          include: { room: true, tenant: true },
        });
        for (const roomId of new Set([existing.roomId, updated.roomId])) {
          const occupied = await tx.contract.count({
            where: { roomId, status: 'active' },
          });
          if (occupied)
            await tx.room.update({
              where: { id: roomId },
              data: { status: 'occupied' },
            });
          else
            await tx.room.updateMany({
              where: { id: roomId, status: 'occupied' },
              data: { status: 'available' },
            });
        }
        updated.room = await tx.room.findUniqueOrThrow({
          where: { id: updated.roomId },
        });
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return contractResponse(result);
  }

  async remove(id: string) {
    await this.update(id, { status: 'cancelled' });
    return { message: 'Contract cancelled' };
  }
}
