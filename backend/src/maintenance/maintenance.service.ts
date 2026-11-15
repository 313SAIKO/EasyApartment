import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { MaintenanceStatus, Prisma } from '@prisma/client';
import { isUUID } from 'class-validator';
import { PrismaService } from '../database/prisma.service';
import { tenantResponse, roomResponse } from '../database/responses';
import { UploadService } from '../upload/upload.service';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto';

const include = { room: true, reportedBy: true } as const;
type Record = Prisma.MaintenanceGetPayload<{ include: typeof include }>;
function response(record: Record) {
  return {
    _id: record.id,
    roomId: roomResponse(record.room),
    reportedBy: tenantResponse(record.reportedBy),
    title: record.title,
    description: record.description,
    status: record.status,
    priority: record.priority,
    images: record.images,
    repairLogs: record.repairLogs,
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly db: PrismaService,
    private readonly uploads: UploadService,
  ) {}

  async create(
    dto: CreateMaintenanceDto,
    userId: string,
    files?: Express.Multer.File[],
  ) {
    const contract = await this.db.contract.findFirst({
      where: { tenantId: userId, status: 'active' },
    });
    if (!contract) throw new BadRequestException('No active room for tenant');
    const images: { url: string; publicId: string }[] = [];
    try {
      for (const file of files ?? []) {
        const result = await this.uploads.uploadImage(file, 'maintenance');
        images.push({ url: result.secure_url, publicId: result.public_id });
      }
      const record = await this.db.maintenance.create({
        data: {
          roomId: contract.roomId,
          reportedById: userId,
          title: dto.title,
          description: dto.description,
          priority: dto.priority ?? 'medium',
          images,
          repairLogs: [
            {
              status: 'pending',
              note: 'Request submitted',
              updatedAt: new Date().toISOString(),
            },
          ],
        },
        include,
      });
      return response(record);
    } catch (error) {
      await Promise.allSettled(
        images.map((image) => this.uploads.deleteImage(image.publicId)),
      );
      throw error;
    }
  }

  async findAll() {
    return (
      await this.db.maintenance.findMany({
        include,
        orderBy: { createdAt: 'desc' },
      })
    ).map(response);
  }

  async updateStatus(id: string, status: string) {
    return this.addRepairLog(id, `Status changed to ${status}`, status);
  }

  async addRepairLog(id: string, note: string, status?: string) {
    if (!isUUID(id)) throw new NotFoundException('Maintenance not found');
    if (typeof note !== 'string' || !note.trim())
      throw new BadRequestException('Note is required');
    if (
      status &&
      !Object.values(MaintenanceStatus).includes(status as MaintenanceStatus)
    )
      throw new BadRequestException('Invalid status');
    const updated = await this.db.$transaction(
      async (tx) => {
        const record = await tx.maintenance.findUnique({ where: { id } });
        if (!record) throw new NotFoundException('Maintenance not found');
        const nextStatus = (status ?? record.status) as MaintenanceStatus;
        const logs = Array.isArray(record.repairLogs) ? record.repairLogs : [];
        return tx.maintenance.update({
          where: { id },
          data: {
            status: nextStatus,
            completedAt: nextStatus === 'completed' ? new Date() : null,
            repairLogs: [
              ...logs,
              { status: nextStatus, note, updatedAt: new Date().toISOString() },
            ] as Prisma.InputJsonValue,
          },
          include,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return response(updated);
  }

  async delete(id: string) {
    if (!isUUID(id)) throw new NotFoundException('Maintenance not found');
    const record = await this.db.maintenance.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Maintenance not found');
    await this.db.maintenance.delete({ where: { id } });
    const images = record.images as { url: string; publicId: string }[];
    await Promise.allSettled(
      images.map((image) => this.uploads.deleteImage(image.publicId)),
    );
    return { message: 'Maintenance deleted successfully' };
  }
}
