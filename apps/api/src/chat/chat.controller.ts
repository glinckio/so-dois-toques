import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Sse,
  type MessageEvent,
} from "@nestjs/common";
import { filter, interval, map, merge, type Observable } from "rxjs";
import type { z } from "zod";
import type { Ator } from "../aulas/comum.js";
import { ExigeArea, IpCliente, SomenteAdministrador, UsuarioAtual } from "../comum/decoradores.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { ZodPipe } from "../comum/zod.pipe.js";
import { ChatService } from "./chat.service.js";
import {
  consultaContatosSchema,
  consultaMensagensSchema,
  contatoSchema,
  consultaMidiaSchema,
  envioSchema,
  numeroSchema,
  reacaoSchema,
  type Envio,
} from "./esquemas.js";
import { EventosDoChat } from "./eventos.service.js";

const ator = (u: UsuarioAutenticado, ip?: string): Ator => ({ id: u.id, perfil: u.perfil, ip });
const numero = new ZodPipe(numeroSchema);

/** Mantém a conexão de eventos aberta através de proxies. */
const PING_MS = 25_000;

/** Etapa 20: chat do WhatsApp. Administrador e atendente; a conexão do número é só do administrador. */
@ExigeArea("chat")
@Controller("chat")
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly eventos: EventosDoChat,
  ) {}

  /** CHAT-CA-03 e 12 */
  @Get("conexao")
  conexao() {
    return this.chat.conexao();
  }

  @Post("conexao")
  @SomenteAdministrador()
  @HttpCode(HttpStatus.OK)
  conectar(@UsuarioAtual() usuario: UsuarioAutenticado, @IpCliente() ip: string | undefined) {
    return this.chat.conectar(ator(usuario, ip));
  }

  @Delete("conexao")
  @SomenteAdministrador()
  desconectar(@UsuarioAtual() usuario: UsuarioAutenticado, @IpCliente() ip: string | undefined) {
    return this.chat.desconectar(ator(usuario, ip));
  }

  /** CHAT-CA-04 */
  @Get("conversas")
  conversas() {
    return this.chat.conversas();
  }

  /** CHAT-CA-14 */
  @Get("contatos")
  contatos(
    @Query(new ZodPipe(consultaContatosSchema)) consulta: z.infer<typeof consultaContatosSchema>,
  ) {
    return this.chat.contatos(consulta.busca);
  }

  @Post("contatos")
  salvarContato(
    @Body(new ZodPipe(contatoSchema)) dados: z.infer<typeof contatoSchema>,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.chat.salvarContato(ator(usuario, ip), dados);
  }

  /** CHAT-CA-11 */
  @Get("numeros/:numero")
  verificarNumero(@Param("numero") digitado: string) {
    return this.chat.verificarNumero(digitado);
  }

  /** CHAT-CA-05 */
  @Get("conversas/:numero/mensagens")
  mensagens(
    @Param("numero", numero) n: string,
    @Query(new ZodPipe(consultaMensagensSchema)) consulta: z.infer<typeof consultaMensagensSchema>,
  ) {
    return this.chat.mensagens(n, consulta.pagina);
  }

  @Post("conversas/:numero/lidas")
  @HttpCode(HttpStatus.OK)
  marcarLidas(@Param("numero", numero) n: string) {
    return this.chat.marcarLidas(n);
  }

  /** CHAT-CA-06 e 09 */
  @Post("conversas/:numero/mensagens")
  enviar(
    @Param("numero", numero) n: string,
    @Body(new ZodPipe(envioSchema)) envio: Envio,
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @IpCliente() ip: string | undefined,
  ) {
    return this.chat.enviar(ator(usuario, ip), n, envio);
  }

  @Post("conversas/:numero/reacoes")
  reagir(
    @Param("numero", numero) n: string,
    @Body(new ZodPipe(reacaoSchema)) dados: z.infer<typeof reacaoSchema>,
  ) {
    return this.chat.reagir(n, dados);
  }

  /** CHAT-CA-10: só com sessão e acesso ao Chat; nunca por endereço público. */
  @Get("midias/:mensagemId")
  midia(
    @Param("mensagemId", new ZodPipe(reacaoSchema.shape.mensagemId)) mensagemId: string,
    @Query(new ZodPipe(consultaMidiaSchema)) _consulta: z.infer<typeof consultaMidiaSchema>,
  ) {
    return this.chat.midia(mensagemId);
  }

  @Get("fotos/:numero")
  foto(@Param("numero", numero) n: string) {
    return this.chat.foto(n);
  }

  /** CHAT-CA-08: mensagens novas, situação e conexão; o QR code só para o administrador. */
  @Sse("eventos")
  eventosAoVivo(@UsuarioAtual() usuario: UsuarioAutenticado): Observable<MessageEvent> {
    const admin = usuario.perfil === "ADMINISTRADOR";
    return merge(
      this.eventos.eventos$.pipe(
        filter((e) => admin || e.tipo !== "qrcode"),
        map((e) => ({ data: e })),
      ),
      interval(PING_MS).pipe(map(() => ({ data: { tipo: "ping" } }))),
    );
  }
}
