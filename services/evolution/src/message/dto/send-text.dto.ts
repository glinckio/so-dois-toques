import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsBoolean,
  IsArray,
  IsObject,
} from "class-validator";

/** Mensagem citada (reply) — repassada como `quoted` ao Evolution. */
export class QuotedMessageDto {
  @IsObject()
  key: { id: string; remoteJid?: string; fromMe?: boolean };
  /** Conteúdo Baileys da citada (ex.: { conversation } ou { imageMessage }). */
  @IsOptional()
  message?: Record<string, unknown>;
}

export class SendTextDto {
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
  text: string;

  @IsOptional()
  delay?: number;

  @IsOptional()
  @IsBoolean()
  linkPreview?: boolean;

  @IsOptional()
  @IsBoolean()
  mentionsEveryOne?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentioned?: string[];

  @IsOptional()
  @IsObject()
  quoted?: QuotedMessageDto;

  @IsOptional()
  @IsBoolean()
  isForwarded?: boolean;
}
