import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Shape only. The field-level rules (IFSC format, VPA format, account digits,
 * and which fields each type requires) live in PaymentMethodService, so there
 * is one source of truth for a valid payee and it is the one the snapshot
 * trusts.
 */
export class AddPaymentMethodDto {
  @ApiProperty({ enum: ['BANK', 'UPI'] })
  @IsIn(['BANK', 'UPI'])
  type!: 'BANK' | 'UPI';

  @ApiProperty({ example: 'Primary HDFC' })
  @IsString()
  @MaxLength(80)
  label!: string;

  @ApiProperty({ example: 'Aarav Sharma' })
  @IsString()
  @MaxLength(140)
  holderName!: string;

  @ApiProperty({ required: false, example: '50100123456789' })
  @IsOptional()
  @IsString()
  @MaxLength(34)
  accountNumber?: string;

  @ApiProperty({ required: false, example: 'HDFC0001234' })
  @IsOptional()
  @IsString()
  @MaxLength(11)
  ifsc?: string;

  @ApiProperty({ required: false, example: 'aarav@okhdfcbank' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  upiVpa?: string;
}
