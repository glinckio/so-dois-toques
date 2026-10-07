import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { ExigeArea, IpCliente, SomenteAdministrador, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { motivoSchema } from "../mensalidades/esquemas.js";
import {
  anonimizarClientesSchema,
  consultaGradeSchema,
  faixasSchema,
  pagamentoReservaSchema,
  quadraSchema,
  reservaSchema,
} from "./esquemas.js";
import { HorariosService } from "./horarios.service.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

/** Horários das quadras: Administrador e Atendente (HOR-CA-09). */
@ExigeArea("horarios")
@Controller("horarios")
export class HorariosController {
  constructor(private readonly horarios: HorariosService) {}

  @Get("quadras")
  quadras() {
    return this.horarios.quadras();
  }

  @SomenteAdministrador()
  @Patch("quadras/:id")
  renomearQuadra(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(quadraSchema)) dados: z.infer<typeof quadraSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.renomearQuadra(ator(usuario, ip), id, dados.nome);
  }

  @Get("faixas")
  faixas() {
    return this.horarios.faixas();
  }

  @SomenteAdministrador()
  @Post("faixas")
  criarFaixas(
    @Body(new ZodPipe(faixasSchema)) dados: z.infer<typeof faixasSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.criarFaixas(ator(usuario, ip), dados);
  }

  @SomenteAdministrador()
  @Delete("faixas/:id")
  removerFaixa(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.removerFaixa(ator(usuario, ip), id);
  }

  @Get("grade")
  grade(@Query(new ZodPipe(consultaGradeSchema)) filtro: z.infer<typeof consultaGradeSchema>) {
    return this.horarios.grade(filtro.data);
  }

  @Post("reservas")
  criar(
    @Body(new ZodPipe(reservaSchema)) dados: z.infer<typeof reservaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.criar(ator(usuario, ip), dados);
  }

  @Get("reservas/:id")
  reserva(@Param("id", ParseUUIDPipe) id: string) {
    return this.horarios.reserva(id);
  }

  @HttpCode(200)
  @Post("reservas/:id/pagar")
  pagar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(pagamentoReservaSchema)) dados: z.infer<typeof pagamentoReservaSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.pagar(ator(usuario, ip), id, dados.forma);
  }

  @SomenteAdministrador()
  @HttpCode(200)
  @Post("reservas/:id/estornar-pagamento")
  estornarPagamento(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(motivoSchema)) dados: z.infer<typeof motivoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.estornarPagamento(ator(usuario, ip), id, dados.motivo);
  }

  @HttpCode(200)
  @Post("reservas/:id/cancelar")
  cancelar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body(new ZodPipe(motivoSchema)) dados: z.infer<typeof motivoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.cancelar(ator(usuario, ip), id, dados.motivo);
  }

  @Get("series")
  series() {
    return this.horarios.series();
  }

  @HttpCode(200)
  @Post("series/:id/encerrar")
  encerrarSerie(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.encerrarSerie(ator(usuario, ip), id);
  }

  /** Prazo de guarda dos clientes das quadras (LANC-CA-07 e 08). */
  @SomenteAdministrador()
  @Get("clientes/anonimizaveis")
  clientesAnonimizaveis() {
    return this.horarios.clientesAnonimizaveis();
  }

  @SomenteAdministrador()
  @HttpCode(200)
  @Post("clientes/anonimizar")
  anonimizarClientes(
    @Body(new ZodPipe(anonimizarClientesSchema)) _dados: z.infer<typeof anonimizarClientesSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.horarios.anonimizarClientes(ator(usuario, ip));
  }
}
