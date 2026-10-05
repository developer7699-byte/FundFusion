import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class DepositStartDto {
  @IsIn(['USDT'])
  asset!: 'USDT';

  @IsIn(['TRX', 'ETH', 'BNB'])
  network!: string;
}

export class DepositBroadcastDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,6})?$/)
  amount!: string;
}

export class SendDto {
  @IsIn(['USDT'])
  asset!: 'USDT';

  @IsIn(['TRX', 'ETH', 'BNB'])
  network!: string;

  @IsString()
  @MinLength(8)
  toAddress!: string;

  @IsString()
  @Matches(/^\d+(\.\d{1,6})?$/)
  amount!: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class WithdrawDto extends SendDto {}

export class QuoteDto {
  @IsIn(['BUY', 'SELL', 'CONVERT'])
  side!: 'BUY' | 'SELL' | 'CONVERT';

  @IsString()
  @Matches(/^\d+(\.\d{1,6})?$/)
  amount!: string;

  @IsOptional()
  @IsIn(['USDT', 'INR'])
  fromAsset?: 'USDT' | 'INR';
}
