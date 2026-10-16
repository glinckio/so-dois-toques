import { IsString, IsNotEmpty, IsObject, IsBoolean, MaxLength } from "class-validator";

export class ArchiveChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsObject()
  lastMessage: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
  };

  @IsBoolean()
  archive: boolean;

  @IsString()
  chat: string;
}
