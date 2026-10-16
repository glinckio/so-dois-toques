import { IsString, IsNotEmpty, IsIn, MaxLength } from "class-validator";

export class SendPresenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  @IsString()
  @IsIn(["composing", "recording", "paused", "available", "unavailable"])
  presence: "composing" | "recording" | "paused" | "available" | "unavailable";

  /** delay em ms (opcional) */
  delay?: number;
}
