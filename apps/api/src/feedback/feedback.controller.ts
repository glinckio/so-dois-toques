import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { ExigeArea, IpCliente, Publico, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { consultaPainelSchema, formularioSchema, respostaSchema } from "./esquemas.js";
import { FeedbackService } from "./feedback.service.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });

/** FEED-CA-01 a 04: o formulário público. Sem sessão, mas só pelo Next.js (chave interna). */
@Publico()
@Controller("feedback")
export class FeedbackPublicoController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get("formulario")
  formulario() {
    return this.feedback.formulario();
  }

  @Post("respostas")
  responder(
    @Body(new ZodPipe(respostaSchema)) dados: z.infer<typeof respostaSchema>,
    @IpCliente() ip: string | undefined,
  ) {
    return this.feedback.responder(dados, ip);
  }
}

/** FEED-CA-05 a 08: o painel, só do administrador. */
@ExigeArea("feedback")
@Controller("feedback")
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get("painel")
  painel(@Query(new ZodPipe(consultaPainelSchema)) consulta: z.infer<typeof consultaPainelSchema>) {
    return this.feedback.painel(consulta);
  }

  @Get("nao-lidas")
  naoLidas() {
    return this.feedback.naoLidas();
  }

  @Post("respostas/lidas")
  @HttpCode(HttpStatus.OK)
  marcarTodasLidas() {
    return this.feedback.marcarTodasLidas();
  }

  @Post("respostas/:id/lida")
  @HttpCode(HttpStatus.OK)
  marcarLida(@Param("id", ParseUUIDPipe) id: string) {
    return this.feedback.marcarLida(id);
  }

  @Delete("respostas/:id")
  remover(
    @Param("id", ParseUUIDPipe) id: string,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.feedback.remover(ator(usuario, ip), id);
  }

  @Post("formulario")
  @HttpCode(HttpStatus.OK)
  definirPausa(
    @Body(new ZodPipe(formularioSchema)) dados: z.infer<typeof formularioSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.feedback.definirPausa(ator(usuario, ip), dados.pausado);
  }
}
