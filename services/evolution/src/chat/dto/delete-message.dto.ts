import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from "class-validator";

export class DeleteMessageForEveryoneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsString()
  id: string;

  @IsString()
  remoteJid: string;

  @IsBoolean()
  fromMe: boolean;

  /** Para mensagens em grupo: JID do participante. Para DM pode ser o próprio remoteJid. */
  @IsString()
  @IsOptional()
  participant?: string;
}
