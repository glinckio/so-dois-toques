import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { ExigeArea, IpCliente, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import {
  consultaGastosSchema,
  contratoSchema,
  encerrarContratoSchema,
  entradaSchema,
  estornoSchema,
  gastoSchema,
  locacaoSchema,
  saldoInicialSchema,
} from "./esquemas.js";
import { GastosService } from "./gastos.service.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

/** Contratos de quadra, gastos, entradas e saldo: só o administrador (GASTO-CA-09, ENTRADA-CA-05). */
@ExigeArea("contabil")
@Controller("gastos")
export class GastosController {
  constructor(private readonly gastos: GastosService) {}

  @Get()
  saidas(@Query(new ZodPipe(consultaGastosSchema)) consulta: z.infer<typeof consultaGastosSchema>) {
    return this.gastos.saidas(consulta.competencia);
  }

  @Post()
  registrarGasto(
    @Body(new ZodPipe(gastoSchema)) dados: z.infer<typeof gastoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.gastos.registrarGasto(ator(usuario, ip), dados);
  }

  @Post("locacoes")
  registrarLocacao(
    @Body(new ZodPipe(locacaoSchema)) dados: z.infer<typeof locacaoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.gastos.registrarLocacao(ator(usuario, ip), dados);
  }

  @Get("entradas")
  entradas(
    @Query(new ZodPipe(consultaGastosSchema)) consulta: z.infer<typeof consultaGastosSchema>,
  ) {
    return this.gastos.entradas(consulta.competencia);
  }

  @Post("entradas")
  registrarEntrada(
    @Body(new ZodPipe(entradaSchema)) dados: z.infer<typeof entradaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.gastos.registrarEntrada(ator(usuario, ip), dados);
  }

  @Post(":id/estorno")
  estornar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(estornoSchema)) dados: z.infer<typeof estornoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.gastos.estornar(ator(usuario, ip), id, dados.motivo);
  }

  @Get("contratos")
  contratos() {
    return this.gastos.contratos();
  }

  @Post("contratos")
  registrarContrato(
    @Body(new ZodPipe(contratoSchema)) dados: z.infer<typeof contratoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.gastos.registrarContrato(ator(usuario, ip), dados);
  }

  @Post("contratos/:id/encerrar")
  encerrarContrato(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(encerrarContratoSchema)) dados: z.infer<typeof encerrarContratoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.gastos.encerrarContrato(ator(usuario, ip), id, dados.fim);
  }

  @Get("saldo")
  saldo() {
    return this.gastos.saldo();
  }

  @Post("saldo-inicial")
  registrarSaldoInicial(
    @Body(new ZodPipe(saldoInicialSchema)) dados: z.infer<typeof saldoInicialSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.gastos.registrarSaldoInicial(ator(usuario, ip), dados);
  }
}
