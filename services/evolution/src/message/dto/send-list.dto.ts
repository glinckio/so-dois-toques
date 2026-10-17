import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class ListRowDto {
  @IsString()
  title: string;
  @IsString()
  @IsOptional()
  description?: string;
  @IsString()
  @IsOptional()
  rowId?: string;
}

export class ListSectionDto {
  @IsString()
  title: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListRowDto)
  rows: ListRowDto[];
}

export class SendListDto {
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
  buttonText: string;

  @IsString()
  @IsNotEmpty()
  footerText: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListSectionDto)
  values: ListSectionDto[];

  @IsOptional()
  delay?: number;
}
