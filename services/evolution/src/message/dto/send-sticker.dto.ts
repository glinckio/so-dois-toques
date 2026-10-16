import { IsString, IsNotEmpty, IsOptional, MaxLength, IsObject } from "class-validator";
import { QuotedMessageDto } from "./send-text.dto";

export class SendStickerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  /** URL ou base64 do sticker (WebP) */
  @IsString()
  @IsNotEmpty()
  sticker: string;

  @IsOptional()
  delay?: number;

  @IsOptional()
  @IsObject()
  quoted?: QuotedMessageDto;
}
