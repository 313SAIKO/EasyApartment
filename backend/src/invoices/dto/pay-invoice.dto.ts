import { IsDateString } from 'class-validator';

export class PayInvoiceDto {
  @IsDateString()
  paidAt: string;
}
