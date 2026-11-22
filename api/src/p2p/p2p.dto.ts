import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
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

  /**
   * SELL only: which of the customer's payment methods receives the rupees.
   * Omitted means their default. (PRD §6.3.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;
}

export class AcceptOrderDto {
  /**
   * BUY only: which of the merchant's payment methods receives the rupees.
   * Omitted means their default. (PRD §6.4.)
   */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;
}

export class SubmitUtrDto {
  @ApiProperty({ example: 'UTR123456789' })
  @IsString()
  @MaxLength(64)
  utr!: string;
}

export class OpenDeskDto {
  @ApiProperty({ example: 'Bandra Desk' })
  @IsString()
  @MaxLength(80)
  deskName!: string;
}
