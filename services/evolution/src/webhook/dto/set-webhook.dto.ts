import { IsString, IsNotEmpty, IsBoolean, IsArray, MaxLength } from "class-validator";

export const WEBHOOK_EVENTS = [
  "APPLICATION_STARTUP",
  "QRCODE_UPDATED",
  "MESSAGES_SET",
  "MESSAGES_UPSERT",
  "MESSAGES_UPDATE",
  "MESSAGES_DELETE",
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

export class SetWebhookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsBoolean()
  enabled: boolean;

  @IsBoolean()
  webhookByEvents: boolean;

  @IsBoolean()
  webhookBase64: boolean;

  @IsArray()
  @IsString({ each: true })
  events: string[];
}
