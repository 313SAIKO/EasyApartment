import { IsEmail } from 'class-validator';

export class ResetTenantPasswordDto {
  @IsEmail()
  email: string;
}
