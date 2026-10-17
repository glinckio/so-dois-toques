import { IsString, IsNotEmpty, IsArray, IsOptional, MaxLength } from "class-validator";

export class WhatsAppNumbersDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsArray()
  @IsString({ each: true })
  numbers: string[];
}
