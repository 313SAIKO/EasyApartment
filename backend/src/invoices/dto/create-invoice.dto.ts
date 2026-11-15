import {
  IsNotEmpty,
  IsString,
  IsNumber,
  ValidateNested,
  IsUUID,
  Min,
  Matches,
  IsDefined,
} from 'class-validator';
import { Type } from 'class-transformer';

class MeterCurrentDto {
  @IsNumber()
  @Min(0)
  current: number;
}

class MetersDto {
  @ValidateNested()
  @IsDefined()
  @Type(() => MeterCurrentDto)
  water: MeterCurrentDto;

  @ValidateNested()
  @IsDefined()
  @Type(() => MeterCurrentDto)
  electric: MeterCurrentDto;
}

class AmountsDto {
  @IsNumber()
  @Min(0)
  rent: number;

  @IsNumber()
  @Min(0)
  serviceFee: number;
}

export class CreateInvoiceDto {
  @IsNotEmpty()
  @IsUUID()
  contractId: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  billingPeriod: string;

  @ValidateNested()
  @IsDefined()
  @Type(() => MetersDto)
  meters: MetersDto;

  @ValidateNested()
  @IsDefined()
  @Type(() => AmountsDto)
  amounts: AmountsDto;
}
