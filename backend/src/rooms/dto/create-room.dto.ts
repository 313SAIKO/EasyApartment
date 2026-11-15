import {
  IsString,
  IsNumber,
  IsInt,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

/* ============================= */
/* ENUMS */
/* ============================= */

export enum RoomType {
  STANDARD = 'standard',
  DELUXE = 'deluxe',
  SUITE = 'suite',
}

export enum RoomStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  CLEANING = 'cleaning',
  MAINTENANCE = 'maintenance',
}

/* ============================= */
/* NESTED DTO */
/* ============================= */

export class LastMeterReadingDto {
  @IsNumber()
  @Min(0)
  water: number;

  @IsNumber()
  @Min(0)
  electric: number;

  @IsOptional()
  updatedAt?: Date;
}

/* ============================= */
/* MAIN DTO */
/* ============================= */

export class CreateRoomDto {
  @IsString()
  roomNumber: string;

  @IsInt()
  @Min(1)
  floor: number;

  @IsEnum(RoomType)
  roomType: RoomType;

  @IsNumber()
  @Min(0)
  prices: number;
  @IsOptional()
  @IsEnum(RoomStatus)
  status: RoomStatus;

  @IsOptional()
  @IsUUID()
  currentTenant?: string;

  @IsArray()
  @IsString({ each: true })
  amenities: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => LastMeterReadingDto)
  lastMeterReading?: LastMeterReadingDto;
}
