import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class AddAllowlistAddressDto {
  @ApiProperty({ example: '0x570ec515914CC54da8Ebc50c6AC69f0330727455' })
  @IsString()
  address!: string;

  /** A fresh authenticator code. The session alone is never sufficient. */
  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ required: false, example: 'cold storage' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  label?: string;
}

export class RequestWithdrawalDto {
  @ApiProperty({ example: '0x570ec515914CC54da8Ebc50c6AC69f0330727455' })
  @IsString()
  address!: string;

  /**
   * A decimal string, never a number: PRD §5.1 keeps money out of a
   * JavaScript `number` at every boundary, and this is one.
   */
  @ApiProperty({ example: '25.5' })
  @IsNumberString()
  amount!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}
