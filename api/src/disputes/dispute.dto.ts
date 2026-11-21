import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class OpenDisputeDto {
  @ApiProperty({ example: 'the rupees never arrived' })
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class ResolveDisputeDto {
  @ApiProperty({
    enum: ['RELEASE', 'REFUND', 'SPLIT', 'REFUND_WITH_PENALTY'],
    description: 'PRD §6.10. A closed list, not a free-text decision.',
  })
  @IsIn(['RELEASE', 'REFUND', 'SPLIT', 'REFUND_WITH_PENALTY'])
  outcome!: 'RELEASE' | 'REFUND' | 'SPLIT' | 'REFUND_WITH_PENALTY';

  /** PRD §9.4: every privileged action carries a typed reason, stored. */
  @ApiProperty({ example: 'bank statement shows no transfer' })
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiProperty({ required: false, example: '40' })
  @IsOptional()
  @IsNumberString()
  counterpartyAmount?: string;
}
