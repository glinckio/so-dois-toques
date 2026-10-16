import { IsString, IsNotEmpty, IsArray, ValidateNested, MaxLength } from "class-validator";
import { Type } from "class-transformer";

export class LastMessageKeyDto {
  @IsString()
  remoteJid: string;
  @IsString()
  fromMe: boolean;
  @IsString()
  id: string;
}

export class MarkUnreadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LastMessageKeyDto)
  lastMessage: LastMessageKeyDto[];

  @IsString()
  chat: string;
}
