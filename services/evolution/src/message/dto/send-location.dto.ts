import { IsString, IsNotEmpty, IsOptional, MaxLength, IsNumber } from "class-validator";

export class SendLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsOptional()
  delay?: number;
}
