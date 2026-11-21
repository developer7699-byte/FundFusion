import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterV1Dto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class EmailCodeDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class MfaCodeDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class ChangeSettingDto {
  /**
   * A number for an integer setting, a decimal string for a money one. Money
   * never arrives as a JavaScript number (PRD §5.1).
   */
  @IsDefined()
  value!: string | number;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}

export class DenyCapabilityDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  capability!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
