// src/contracts/dto/create-contract.dto.ts

import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsNumber,
  ValidateNested,
  IsDefined,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FinancialsDto {
  @IsNumber()
  @Min(0)
  deposit: number;

  @IsNumber()
  @Min(0)
  advancePayment: number;
}

export class CreateContractDto {
  @IsUUID()
  roomId: string;

  @IsUUID()
  tenantId: string;

  @IsEnum(['daily', 'monthly'])
  type: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsEnum(['active', 'completed', 'cancelled'])
  status: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => FinancialsDto)
  financials: FinancialsDto;

  @IsOptional()
  @IsDateString()
  createdAt: string;
}
