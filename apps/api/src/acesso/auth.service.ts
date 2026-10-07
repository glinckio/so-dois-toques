import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import type { UsuarioAutenticado } from "../comum/requisicao.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  BLOQUEIO_JANELA_MS,
  BLOQUEIO_TENTATIVAS_EMAIL,
  bloqueioEmailAte,
  gerarTokenSessao,
  hashToken,
  ipBloqueado,
  MENSAGENS_SENHA,
  normalizarEmail,
  SESSAO_DURACAO_MAXIMA_MS,
  validarSenha,
} from "./regras.js";
import { gerarHashSenha, verificarSenha } from "./senhas.js";

export const MENSAGEM_LOGIN_INVALIDO = "E-mail ou senha incorretos";
export const MENSAGEM_MUITAS_TENTATIVAS = "Muitas tentativas. Tente novamente em alguns minutos.";

export type ResultadoLogin = {
  token: string;
  expiraEm: string;
  usuario: UsuarioAutenticado;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async login(
    dados: { email: string; senha: string },
    contexto: { ip?: string; agente?: string },
  ): Promise<ResultadoLogin> {
    const email = normalizarEmail(dados.email);
    const ip = contexto.ip ?? null;
    const agora = new Date();
    const inicioJanela = new Date(agora.getTime() - BLOQUEIO_JANELA_MS);

    // Sem IP (acesso direto, sem proxy), as tentativas contam juntas num só balde,
    // para o limite por IP nunca ser pulado (revisão de segurança da Etapa 9).
    const falhasIp = await this.prisma.tentativaLogin.count({
      where: { ip, sucesso: false, criadaEm: { gte: inicioJanela } },
    });
    if (ipBloqueado(falhasIp)) {
      await this.auditoria.registrar({
        acao: "LOGIN_BLOQUEADO",
        ip,
        detalhes: { email, motivo: "ip" },
      });
      throw new HttpException(MENSAGEM_MUITAS_TENTATIVAS, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Uma tentativa por e-mail de cada vez: a trava do banco impede que várias
    // tentativas simultâneas leiam a contagem antes de qualquer uma ser gravada.
    const token = gerarTokenSessao();
    const expiraEm = new Date(agora.getTime() + SESSAO_DURACAO_MAXIMA_MS);
    const resultado = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`login:${email}`}))`;
        const ultimasTentativas = () =>
          tx.tentativaLogin.findMany({
            where: { email },
            orderBy: { id: "desc" },
            take: BLOQUEIO_TENTATIVAS_EMAIL,
            select: { sucesso: true, criadaEm: true },
          });

        if (bloqueioEmailAte(await ultimasTentativas(), agora)) {
          await this.auditoria.registrar(
            { acao: "LOGIN_BLOQUEADO", ip, detalhes: { email, motivo: "email" } },
            tx,
          );
          return { tipo: "bloqueado" as const };
        }

        const usuario = await tx.usuario.findUnique({ where: { email } });
        const senhaConfere = await verificarSenha(dados.senha, usuario?.senhaHash ?? null);

        if (!usuario || !usuario.ativo || !senhaConfere) {
          await tx.tentativaLogin.create({ data: { email, ip, sucesso: false } });
          await this.auditoria.registrar(
            { acao: "LOGIN_RECUSADO", atorId: usuario?.id, ip, detalhes: { email } },
            tx,
          );
          if (bloqueioEmailAte(await ultimasTentativas(), new Date())) {
            await this.auditoria.registrar(
              {
                acao: "LOGIN_BLOQUEADO",
                atorId: usuario?.id,
                ip,
                detalhes: { email, motivo: "email" },
              },
              tx,
            );
          }
          return { tipo: "recusado" as const };
        }

        await tx.tentativaLogin.create({ data: { email, ip, sucesso: true } });
        await tx.sessao.create({
          data: {
            tokenHash: hashToken(token),
            usuarioId: usuario.id,
            expiraEm,
            ip,
            agente: contexto.agente?.slice(0, 300) ?? null,
          },
        });
        await this.auditoria.registrar({ acao: "LOGIN_SUCESSO", atorId: usuario.id, ip }, tx);
        return { tipo: "ok" as const, usuario };
      },
      { timeout: 15_000 },
    );

    if (resultado.tipo === "bloqueado") {
      throw new HttpException(MENSAGEM_MUITAS_TENTATIVAS, HttpStatus.TOO_MANY_REQUESTS);
    }
    if (resultado.tipo === "recusado") throw new UnauthorizedException(MENSAGEM_LOGIN_INVALIDO);
    const { usuario } = resultado;

    return {
      token,
      expiraEm: expiraEm.toISOString(),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        trocarSenha: usuario.trocarSenha,
      },
    };
  }

  async logout(sessaoId: string, usuarioId: string, ip?: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.sessao.deleteMany({ where: { id: sessaoId } });
      await this.auditoria.registrar({ acao: "LOGOUT", atorId: usuarioId, ip }, tx);
    });
  }

  /** Troca da própria senha (ACESSO-CA-13 e 17): encerra as outras sessões. */
  async trocarSenha(
    usuarioId: string,
    sessaoId: string,
    dados: { senhaAtual: string; novaSenha: string },
    ip?: string,
  ): Promise<void> {
    const usuario = await this.prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    if (!(await verificarSenha(dados.senhaAtual, usuario.senhaHash))) {
      throw new BadRequestException("A senha atual não confere.");
    }
    const problema = validarSenha(dados.novaSenha, usuario.email);
    if (problema) throw new BadRequestException(MENSAGENS_SENHA[problema]);
    if (await verificarSenha(dados.novaSenha, usuario.senhaHash)) {
      throw new BadRequestException("A nova senha precisa ser diferente da atual.");
    }

    const senhaHash = await gerarHashSenha(dados.novaSenha);
    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuarioId },
        data: { senhaHash, trocarSenha: false },
      });
      await tx.sessao.deleteMany({ where: { usuarioId, id: { not: sessaoId } } });
      await this.auditoria.registrar(
        { acao: "SENHA_TROCADA", atorId: usuarioId, alvoTipo: "Usuario", alvoId: usuarioId, ip },
        tx,
      );
    });
  }
}
