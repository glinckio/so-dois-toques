import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { ExigeArea, IpCliente, SomenteAdministrador, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { motivoSchema } from "../mensalidades/esquemas.js";
import { CaixaService } from "./caixa.service.js";
import { aberturaSchema, avulsoSchema, fechamentoSchema } from "./esquemas.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

/** Turnos do caixa e lançamentos avulsos: Administrador e Atendente (CAIXA-CA-07). */
@ExigeArea("caixa")
@Controller("caixa")
export class CaixaController {
  constructor(private readonly caixa: CaixaService) {}

  @Get("sessao")
  turnoAtual() {
    return this.caixa.turnoAtual();
  }

  @Get("sessoes")
  listar() {
    return this.caixa.listar();
  }

  @Get("sessoes/:id")
  relatorio(@Param("id", ParseUUIDPipe) id: string) {
    return this.caixa.relatorio(id);
  }

  @Post("sessoes")
  abrir(
    @Body(new ZodPipe(aberturaSchema)) dados: z.infer<typeof aberturaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.caixa.abrir(ator(usuario, ip), dados.trocoInicialCentavos);
  }

  @HttpCode(200)
  @Post("sessoes/:id/fechar")
  fechar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(fechamentoSchema)) dados: z.infer<typeof fechamentoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.caixa.fechar(ator(usuario, ip), id, dados);
  }

  @Post("avulsos")
  lancarAvulso(
    @Body(new ZodPipe(avulsoSchema)) dados: z.infer<typeof avulsoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.caixa.lancarAvulso(ator(usuario, ip), dados);
  }

  @SomenteAdministrador()
  @HttpCode(200)
  @Post("avulsos/:id/estornar")
  estornarAvulso(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(motivoSchema)) dados: z.infer<typeof motivoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.caixa.estornarAvulso(ator(usuario, ip), id, dados.motivo);
  }
}
