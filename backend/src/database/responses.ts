import type { Contract, Room, User } from '@prisma/client';

export function tenantResponse(user: User) {
  return {
    _id: user.id,
    email: user.email,
    role: user.role,
    profile: { fullName: user.fullName, phone: user.phone },
  };
}

export function roomResponse(room: Room) {
  return {
    _id: room.id,
    roomNumber: room.roomNumber,
    floor: room.floor,
    roomType: room.roomType,
    prices: Number(room.prices),
    monthlyPrice: Number(room.prices),
    status: room.status,
    amenities: room.amenities,
    furniture: room.amenities,
    lastMeterReading: {
      water: Number(room.waterMeter),
      electric: Number(room.electricMeter),
      updatedAt: room.meterUpdatedAt,
    },
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

export function contractResponse(
  contract: Contract & { room: Room; tenant: User },
) {
  return {
    _id: contract.id,
    roomId: roomResponse(contract.room),
    tenantId: {
      ...tenantResponse(contract.tenant),
      profile: {
        ...tenantResponse(contract.tenant).profile,
        idCardNumber: contract.tenant.idCardNumber,
        birthDate: contract.tenant.birthDate,
      },
    },
    type: contract.type,
    status: contract.status,
    startDate: contract.startDate,
    endDate: contract.endDate,
    financials: {
      deposit: Number(contract.deposit),
      advancePayment: Number(contract.advancePayment),
    },
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}
