import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ButtonDto {
  @IsString()
  title: string; // reply | url | call
  @IsString()
  displayText: string;
  @IsString()
  @IsOptional()
  id?: string;
}

export class SendButtonsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  footer: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ButtonDto)
  buttons: ButtonDto[];

  @IsOptional()
  delay?: number;
}
