import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
  IsIn,
} from "class-validator";

/** Eventos de webhook suportados pela Evolution API v2. */
export const WEBHOOK_EVENTS = [
  "APPLICATION_STARTUP",
  "QRCODE_UPDATED",
  "MESSAGES_SET",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "MESSAGES_DELETE",
  "MESSAGES_EDITED",
  "SEND_MESSAGE",
  "CONTACTS_SET",
  "CONTACTS_UPSERT",
  "CONTACTS_UPDATE",
  "PRESENCE_UPDATE",
  "CHATS_SET",
  "CHATS_UPSERT",
  "CHATS_UPDATE",
  "CHATS_DELETE",
  "GROUPS_UPSERT",
  "GROUP_UPDATE",
  "GROUP_PARTICIPANTS_UPDATE",
  "CONNECTION_UPDATE",
  "CALL",
  "NEW_JWT_TOKEN",
  "TYPEBOT_START",
  "TYPEBOT_CHANGE_STATUS",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export class CreateInstanceDto {
  /** Nome único da instância. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  /** Motor WhatsApp: WHATSAPP-BAILEYS (multidevice) ou WHATSAPP-BUSINESS (Cloud API). */
  @IsString()
  @IsIn(["WHATSAPP-BAILEYS", "WHATSAPP-BUSINESS"])
  integration: "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS";

  /** API key da instância (opcional; vazio gera dinamicamente). */
  @IsString()
  @IsOptional()
  @MaxLength(500)
  token?: string;

  /** Gerar QR code automaticamente após criar. */
  @IsBoolean()
  @IsOptional()
  qrcode?: boolean;

  /** Número do dono da instância (código país). */
  @IsString()
  @IsOptional()
  @MaxLength(20)
  number?: string;

  @IsBoolean()
  @IsOptional()
  rejectCall?: boolean;

  @IsString()
  @IsOptional()
  msgCall?: string;

  @IsBoolean()
  @IsOptional()
  groupsIgnore?: boolean;

  @IsBoolean()
  @IsOptional()
  alwaysOnline?: boolean;

  @IsBoolean()
  @IsOptional()
  readMessages?: boolean;

  @IsBoolean()
  @IsOptional()
  readStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  syncFullHistory?: boolean;

  /** Configuração de webhook na criação. */
  @IsOptional()
  @IsObject()
  webhook?: {
    url: string;
    byEvents?: boolean;
    base64?: boolean;
    events?: string[];
    headers?: Record<string, string>;
  };
}
