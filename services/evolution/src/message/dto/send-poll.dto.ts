import { IsString, IsNotEmpty, IsOptional, MaxLength, IsArray, IsNumber } from "class-validator";

export class SendPollDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  instanceName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number: string;

  /** Título/pergunta da enquete */
  @IsString()
  @IsNotEmpty()
  name: string;

  /** Quantidade de opções que podem ser selecionadas (ex.: 1) */
  @IsNumber()
  selectableCount: number;

  /** Opções da enquete */
  @IsArray()
  @IsString({ each: true })
  values: string[];

  @IsOptional()
  delay?: number;
}
