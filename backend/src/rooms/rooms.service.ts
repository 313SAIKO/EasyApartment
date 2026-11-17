import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../database/prisma.service';
import { roomResponse, tenantResponse } from '../database/responses';
import { RoomStatus } from './dto/create-room.dto';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  constructor(private readonly db: PrismaService) {}

  async updateAmenities(id: string, amenities: string[]) {
    await this.findOne(id);
    return roomResponse(
      await this.db.room.update({ where: { id }, data: { amenities } }),
    );
  }

  async findAll(status?: RoomStatus) {
    const rooms = await this.db.room.findMany({
      where: { status },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      include: {
        contracts: { where: { status: 'active' }, include: { tenant: true } },
      },
    });
    return rooms.map((room) => {
      const contract = room.contracts[0];
      const tenant = contract ? tenantResponse(contract.tenant) : null;
      return {
        ...roomResponse(room),
        currentTenant: tenant,
        tenantInfo: tenant ? { ...tenant.profile, email: tenant.email } : null,
        contractDetails: contract
          ? {
              startDate: contract.startDate,
              endDate: contract.endDate,
              deposit: Number(contract.deposit),
              advancePayment: Number(contract.advancePayment),
            }
          : null,
      };
    });
  }

  async findByTenant(tenantId: string) {
    const contract = await this.db.contract.findFirst({
      where: { tenantId, status: 'active' },
      include: { room: true },
    });
    if (!contract) throw new NotFoundException('No active room for tenant');
    return roomResponse(contract.room);
  }

  async findOne(id: string) {
    if (!isUUID(id)) throw new NotFoundException('Room not found');
    const room = await this.db.room.findUnique({ where: { id } });
    if (!room) throw new NotFoundException('Room not found');
    return roomResponse(room);
  }

  async create(dto: CreateRoomDto) {
    if (dto.currentTenant || dto.status === RoomStatus.OCCUPIED)
      throw new BadRequestException('Assign tenants through a contract');
    const room = await this.db.room.create({
      data: {
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        roomType: dto.roomType,
        prices: dto.prices,
        status: dto.status,
        amenities: dto.amenities,
        waterMeter: dto.lastMeterReading?.water ?? 0,
        electricMeter: dto.lastMeterReading?.electric ?? 0,
      },
    });
    return roomResponse(room);
  }

  async updateStatus(id: string, status: RoomStatus) {
    if (!isUUID(id)) throw new NotFoundException('Room not found');
    return this.db.$transaction(
      async (tx) => {
        const room = await tx.room.findUnique({ where: { id } });
        if (!room) throw new NotFoundException('Room not found');
        const active = await tx.contract.count({
          where: { roomId: id, status: 'active' },
        });
        if (
          (active > 0 && status !== RoomStatus.OCCUPIED) ||
          (!active && status === RoomStatus.OCCUPIED)
        ) {
          throw new ConflictException(
            'Room occupancy must match its active contract',
          );
        }
        return roomResponse(
          await tx.room.update({ where: { id }, data: { status } }),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createMany(dtos: CreateRoomDto[]) {
    if (
      dtos.some(
        (dto) => dto.currentTenant || dto.status === RoomStatus.OCCUPIED,
      )
    ) {
      throw new BadRequestException('Assign tenants through a contract');
    }
    const rooms = await this.db.$transaction(
      dtos.map((dto) =>
        this.db.room.create({
          data: {
            roomNumber: dto.roomNumber,
            floor: dto.floor,
            roomType: dto.roomType,
            prices: dto.prices,
            status: dto.status,
            amenities: dto.amenities,
            waterMeter: dto.lastMeterReading?.water ?? 0,
            electricMeter: dto.lastMeterReading?.electric ?? 0,
          },
        }),
      ),
    );
    return {
      message: 'Rooms created successfully',
      count: rooms.length,
      data: rooms.map(roomResponse),
    };
  }
}
