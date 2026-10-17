import { IsString, IsNotEmpty, IsOptional, MaxLength, IsArray } from "class-validator";

export class ContactDto {
  @IsString()
  fullName: string;
  @IsString()
  wuid: string;
  @IsString()
  @IsOptional()
  phoneNumber?: string;
  @IsString()
  @IsOptional()
  organization?: string;
}

export class SendContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  @IsArray()
  contacts: ContactDto[];

  @IsOptional()
  delay?: number;
}
