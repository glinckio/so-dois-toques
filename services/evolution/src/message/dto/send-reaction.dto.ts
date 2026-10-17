import { IsString, IsNotEmpty, IsOptional, MaxLength, IsBoolean } from "class-validator";

export class SendReactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  /**
   * JID exato do chat (phone@s.whatsapp.net OU @lid — usar o mesmo remoteJid
   * que chegou no webhook da mensagem; JIDs construídos falham em chats LID).
   */
  @IsString()
  @IsNotEmpty()
  remoteJid: string;

  /** ID da mensagem a reagir */
  @IsString()
  @IsNotEmpty()
  messageId: string;

  /** true se a mensagem reagida foi enviada por nós; false se do contato */
  @IsBoolean()
  fromMe: boolean;

  /** Emoji (ex.: 👍). Envie vazio para remover reação */
  @IsString()
  reaction: string;

  @IsOptional()
  delay?: number;
}
