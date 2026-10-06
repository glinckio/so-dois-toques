import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { ExigeArea, IpCliente, SomenteAdministrador, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import {
  consultaCaixaSchema,
  consultaMensalidadesSchema,
  geracaoSchema,
  motivoSchema,
  pagamentoSchema,
} from "./esquemas.js";
import { MensalidadesService } from "./mensalidades.service.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

/** Mensalidades e lançamentos: área Caixa (Administrador e Atendente). */
@ExigeArea("caixa")
@Controller()
export class MensalidadesController {
  constructor(private readonly mensalidades: MensalidadesService) {}

  @SomenteAdministrador()
  @Post("mensalidades/geracoes")
  gerar(
    @Body(new ZodPipe(geracaoSchema)) dados: z.infer<typeof geracaoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.mensalidades.gerar(dados.competencia, ator(usuario, ip));
  }

  @Get("mensalidades")
  listar(
    @Query(new ZodPipe(consultaMensalidadesSchema))
    filtro: z.infer<typeof consultaMensalidadesSchema>,
  ) {
    return this.mensalidades.listar(filtro);
  }

  @Get("mensalidades/inadimplentes")
  inadimplentes() {
    return this.mensalidades.inadimplentes();
  }

  @Get("mensalidades/:id")
  buscar(@Param("id", ParseUUIDPipe) id: string) {
    return this.mensalidades.buscar(id);
  }

  @Post("mensalidades/:id/pagamentos")
  pagar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(pagamentoSchema)) dados: z.infer<typeof pagamentoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.mensalidades.pagar(ator(usuario, ip), id, dados);
  }

  @SomenteAdministrador()
  @HttpCode(200)
  @Post("mensalidades/:id/cancelar")
  cancelar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(motivoSchema)) dados: z.infer<typeof motivoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.mensalidades.cancelar(ator(usuario, ip), id, dados.motivo);
  }

  @SomenteAdministrador()
  @HttpCode(200)
  @Post("pagamentos/:id/estornar")
  estornar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(motivoSchema)) dados: z.infer<typeof motivoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.mensalidades.estornar(ator(usuario, ip), id, dados.motivo);
  }

  @Get("pagamentos/:id/recibo")
  recibo(@Param("id", ParseUUIDPipe) id: string) {
    return this.mensalidades.recibo(id);
  }

  @Get("caixa/lancamentos")
  lancamentos(
    @Query(new ZodPipe(consultaCaixaSchema)) filtro: z.infer<typeof consultaCaixaSchema>,
  ) {
    return this.mensalidades.lancamentosDoDia(filtro.data);
  }
}
