import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateQuoteDto {
  @ApiProperty({ enum: ['BUY', 'SELL'] })
  @IsIn(['BUY', 'SELL'])
  side!: 'BUY' | 'SELL';

  /**
   * Exactly one of the two (PRD §6.2). Both are decimal strings — a
   * JavaScript number never holds money, and that includes the wire.
   */
  @ApiProperty({ required: false, example: '100' })
  @IsOptional()
  @IsNumberString()
  usdtAmount?: string;

  @ApiProperty({ required: false, example: '9700' })
  @IsOptional()
  @IsNumberString()
  inrAmount?: string;
}

export class ConfirmOrderDto {
  @ApiProperty()
  @IsString()
  quoteId!: string;
}

export class SubmitUtrDto {
  @ApiProperty({ example: 'UTR123456789' })
  @IsString()
  @MaxLength(64)
  utr!: string;
}
