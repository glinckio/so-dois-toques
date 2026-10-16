import {
  IsBoolean,
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";

export class ReadMessageKeyDto {
  @IsString()
  remoteJid: string;
  @IsBoolean()
  fromMe: boolean;
  @IsString()
  id: string;
}

export class MarkAsReadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReadMessageKeyDto)
  readMessages: ReadMessageKeyDto[];
}
