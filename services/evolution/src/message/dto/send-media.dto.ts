import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength, IsObject } from "class-validator";
import { QuotedMessageDto } from "./send-text.dto";

/** Tipos de mídia: image, video, document, audio. */
export type MediaType = "image" | "video" | "document" | "audio";

export class SendMediaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  /** image | video | document | audio */
  @IsString()
  @IsNotEmpty()
  mediatype: string;

  /** Ex.: image/png, application/pdf */
  @IsString()
  @IsNotEmpty()
  mimetype: string;

  /** URL ou base64 do arquivo */
  @IsString()
  @IsNotEmpty()
  media: string;

  /** Nome do arquivo (ex.: Image.png) */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsOptional()
  caption?: string;

  @IsOptional()
  delay?: number;

  @IsOptional()
  @IsBoolean()
  isForwarded?: boolean;

  @IsOptional()
  @IsObject()
  quoted?: QuotedMessageDto;
}
