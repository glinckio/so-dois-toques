import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, MaxLength } from "class-validator";

export class SendStatusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  /** text | image | audio */
  @IsString()
  @IsNotEmpty()
  type: "text" | "image" | "audio";

  /** Para image/audio: URL ou base64. Para text: o texto. */
  @IsString()
  @IsNotEmpty()
  content: string;

  /** Opcional para image/audio */
  @IsString()
  @IsOptional()
  caption?: string;

  @IsString()
  @IsOptional()
  backgroundColor?: string;

  @IsOptional()
  font?: number;

  /** true = envia para todos; false = usa statusJidList */
  @IsBoolean()
  @IsOptional()
  allContacts?: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  statusJidList?: string[];

  @IsOptional()
  delay?: number;
}
