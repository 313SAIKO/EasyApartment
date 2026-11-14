// src/contracts/contracts.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { Contract, ContractDocument } from './schemas/contract.schema';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
// ต้อง import Room Schema เข้ามาด้วยเพื่อให้ TypeScript รู้จัก Type
// import { Room, RoomDocument } from '../rooms/schemas/room.schema';

@Injectable()
export class ContractsService {
  constructor(
    @InjectModel(Contract.name)
    private contractModel: Model<ContractDocument>,

    // 🔥 เพิ่มการ Inject Room Model เพื่อใช้จัดการสถานะห้อง
    @InjectModel('Room')
    private roomModel: Model<any>,
  ) {}

  async create(createDto: CreateContractDto) {
    // 1. ตรวจสอบก่อนว่าห้องมีอยู่จริงไหม
    const room = await this.roomModel.findById(createDto.roomId);
    if (!room) {
      throw new NotFoundException('ไม่พบข้อมูลห้องพักที่ระบุ');
    }

    // 2. สร้าง Contract ใหม่
    const contract = new this.contractModel({
      roomId: createDto.roomId,
      tenantId: createDto.tenantId,
      type: createDto.type,
      startDate: createDto.startDate,
      endDate: createDto.endDate,
      status: createDto.status || 'active',
      financials: {
        deposit: createDto.financials.deposit,
        advancePayment: createDto.financials.advancePayment,
      },
    });

    const savedContract = await contract.save();

    // 🔥 3. อัปเดตสถานะห้องพัก (Room) ทันทีหลังจากสร้างสัญญาสำเร็จ
    // - เปลี่ยน status เป็น occupied
    // - ผูก tenantId เข้ากับห้อง
    await this.roomModel.findByIdAndUpdate(
      createDto.roomId,
      {
        $set: {
          status: 'occupied',
          currentTenant: createDto.tenantId, // เก็บ ID ผู้เช่าไว้ที่ห้อง
        },
      },
      { new: true }, // คืนค่าข้อมูลที่อัปเดตแล้ว
    );

    return savedContract;
  }

  async findAll() {
    return this.contractModel
      .find()
      .populate('roomId')
      .populate('tenantId')
      .exec();
  }

  async findOne(id: string, user: JwtPayload) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Contract not found');
    }

    const filter =
      user.role === 'admin' ? { _id: id } : { _id: id, tenantId: user.sub };
    const contract = await this.contractModel
      .findOne(filter)
      .populate('roomId')
      .populate('tenantId')
      .exec();

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    return contract;
  }

  async findByTenantId(tenantId: string) {
    const contract = await this.contractModel
      .findOne({ tenantId, status: 'active' })
      .populate('roomId')
      .populate('tenantId')
      .exec();

    if (!contract) {
      throw new NotFoundException('Active contract not found for this tenant');
    }

    return contract;
  }

  async update(id: string, updateDto: UpdateContractDto) {
    const updatedContract = await this.contractModel.findByIdAndUpdate(
      id,
      { $set: updateDto },
      { new: true },
    );

    if (!updatedContract) {
      throw new NotFoundException('Contract not found');
    }

    return updatedContract;
  }

  async remove(id: string) {
    const contract = await this.contractModel.findById(id);
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    // 💡 แถม: ถ้าลบสัญญา ควรกลับไปเปลี่ยนสถานะห้องให้เป็น available ด้วย
    await this.roomModel.findByIdAndUpdate(contract.roomId, {
      $set: { status: 'available', currentTenant: null },
    });

    await this.contractModel.findByIdAndDelete(id);
    return {
      message: 'Contract deleted successfully and Room is now available',
    };
  }
}
