import { Controller, Get, Query } from "@nestjs/common";
import { z } from "zod";
import { ExigeArea } from "../comum/decoradores.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { ACOES, AuditoriaService } from "./auditoria.service.js";

const consultaSchema = z
  .object({
    inicio: z.coerce.date().optional(),
    fim: z.coerce.date().optional(),
    usuarioId: z.string().uuid().optional(),
    acao: z.enum(ACOES).optional(),
    pagina: z.coerce.number().int().min(1).max(100000).default(1),
    tamanho: z.coerce.number().int().min(1).max(100).default(50),
  })
  .refine((f) => !f.inicio || !f.fim || f.inicio <= f.fim, {
    message: "O início precisa ser antes do fim",
    path: ["inicio"],
  });

@ExigeArea("auditoria")
@Controller("auditoria")
export class AuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}

  /** ACESSO-CA-20: filtros por período, usuário e ação, com paginação. */
  @Get()
  consultar(@Query(new ZodPipe(consultaSchema)) filtro: z.infer<typeof consultaSchema>) {
    return this.auditoria.consultar(filtro);
  }
}
