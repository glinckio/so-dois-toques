import { IsString, IsNotEmpty, IsBoolean, MaxLength } from "class-validator";

export class UpdateBlockStatusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  @IsBoolean()
  status: boolean;
}
