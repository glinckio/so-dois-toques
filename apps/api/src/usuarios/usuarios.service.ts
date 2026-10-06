import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  MENSAGENS_SENHA,
  gerarSenhaTemporaria,
  normalizarEmail,
  validarSenha,
  type PerfilUsuario,
} from "../acesso/regras.js";
import { gerarHashSenha } from "../acesso/senhas.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

const CAMPOS_PUBLICOS = {
  id: true,
  nome: true,
  email: true,
  perfil: true,
  ativo: true,
  trocarSenha: true,
  criadoEm: true,
} as const;

export const MENSAGEM_ULTIMO_ADMIN = "O sistema precisa ter pelo menos um administrador ativo.";

type Contexto = { atorId: string; ip?: string };
type Tx = Prisma.TransactionClient;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar() {
    return this.prisma.usuario.findMany({
      select: CAMPOS_PUBLICOS,
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    });
  }

  /** ACESSO-CA-12: devolve a senha temporária uma única vez; só o hash fica guardado. */
  async criar(dados: { nome: string; email: string; perfil: PerfilUsuario }, ctx: Contexto) {
    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await gerarHashSenha(senhaTemporaria);
    try {
      const usuario = await this.prisma.$transaction(async (tx) => {
        const criado = await tx.usuario.create({
          data: {
            nome: dados.nome.trim(),
            email: normalizarEmail(dados.email),
            perfil: dados.perfil,
            senhaHash,
            trocarSenha: true,
          },
          select: CAMPOS_PUBLICOS,
        });
        await this.auditoria.registrar(
          {
            acao: "USUARIO_CRIADO",
            atorId: ctx.atorId,
            alvoTipo: "Usuario",
            alvoId: criado.id,
            ip: ctx.ip,
            detalhes: { nome: criado.nome, email: criado.email, perfil: criado.perfil },
          },
          tx,
        );
        return criado;
      });
      return { usuario, senhaTemporaria };
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002") {
        throw new ConflictException("Já existe um usuário com esse e-mail.");
      }
      throw erro;
    }
  }

  /** ACESSO-CA-15: muda o perfil e encerra as sessões do usuário. */
  async alterarPerfil(id: string, perfil: PerfilUsuario, ctx: Contexto) {
    return this.prisma.$transaction(async (tx) => {
      const alvo = await this.travarEBuscar(tx, id);
      if (alvo.perfil === "ADMINISTRADOR" && perfil !== "ADMINISTRADOR" && alvo.ativo) {
        await this.garantirOutroAdmin(tx, id);
      }
      const usuario = await tx.usuario.update({
        where: { id },
        data: { perfil },
        select: CAMPOS_PUBLICOS,
      });
      await tx.sessao.deleteMany({ where: { usuarioId: id } });
      await this.auditoria.registrar(
        {
          acao: "USUARIO_PERFIL_ALTERADO",
          atorId: ctx.atorId,
          alvoTipo: "Usuario",
          alvoId: id,
          ip: ctx.ip,
          detalhes: { de: alvo.perfil, para: perfil },
        },
        tx,
      );
      return usuario;
    });
  }

  /** ACESSO-CA-15: nova senha temporária, troca obrigatória e sessões encerradas. */
  async redefinirSenha(id: string, ctx: Contexto) {
    const senhaTemporaria = gerarSenhaTemporaria();
    const senhaHash = await gerarHashSenha(senhaTemporaria);
    await this.prisma.$transaction(async (tx) => {
      await this.travarEBuscar(tx, id);
      await tx.usuario.update({ where: { id }, data: { senhaHash, trocarSenha: true } });
      await tx.sessao.deleteMany({ where: { usuarioId: id } });
      await this.auditoria.registrar(
        {
          acao: "SENHA_REDEFINIDA",
          atorId: ctx.atorId,
          alvoTipo: "Usuario",
          alvoId: id,
          ip: ctx.ip,
        },
        tx,
      );
    });
    return { senhaTemporaria };
  }

  /** ACESSO-CA-14 e 16: desativa, encerra as sessões e nunca deixa o sistema sem administrador. */
  async desativar(id: string, ctx: Contexto) {
    return this.prisma.$transaction(async (tx) => {
      const alvo = await this.travarEBuscar(tx, id);
      if (!alvo.ativo) return this.buscarPublico(tx, id);
      if (alvo.perfil === "ADMINISTRADOR") await this.garantirOutroAdmin(tx, id);
      const usuario = await tx.usuario.update({
        where: { id },
        data: { ativo: false },
        select: CAMPOS_PUBLICOS,
      });
      await tx.sessao.deleteMany({ where: { usuarioId: id } });
      await this.auditoria.registrar(
        {
          acao: "USUARIO_DESATIVADO",
          atorId: ctx.atorId,
          alvoTipo: "Usuario",
          alvoId: id,
          ip: ctx.ip,
        },
        tx,
      );
      return usuario;
    });
  }

  /**
   * Trava as linhas de administradores ativos e o alvo, para que duas mudanças
   * simultâneas não removam juntas os dois últimos administradores.
   */
  private async travarEBuscar(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM "Usuario" WHERE (perfil = 'ADMINISTRADOR' AND ativo) OR id = ${id}::uuid ORDER BY id FOR UPDATE`;
    const alvo = await tx.usuario.findUnique({ where: { id } });
    if (!alvo) throw new NotFoundException("Usuário não encontrado.");
    return alvo;
  }

  private async garantirOutroAdmin(tx: Tx, id: string) {
    const outros = await tx.usuario.count({
      where: { perfil: "ADMINISTRADOR", ativo: true, id: { not: id } },
    });
    if (outros === 0) throw new ConflictException(MENSAGEM_ULTIMO_ADMIN);
  }

  private buscarPublico(tx: Tx, id: string) {
    return tx.usuario.findUniqueOrThrow({ where: { id }, select: CAMPOS_PUBLICOS });
  }
}

export class SenhaInvalidaError extends Error {}

/**
 * Cria o primeiro administrador (ACESSO-CA-21). Recusa se já houver um administrador ativo.
 * Um lock consultivo impede que duas execuções simultâneas criem dois.
 */
export async function criarAdminInicial(
  prisma: PrismaService,
  auditoria: AuditoriaService,
  dados: { nome: string; email: string; senha: string },
) {
  const email = normalizarEmail(dados.email);
  const problema = validarSenha(dados.senha, email);
  if (problema) throw new SenhaInvalidaError(MENSAGENS_SENHA[problema]);
  const senhaHash = await gerarHashSenha(dados.senha);
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('criar-admin-inicial'))`;
    const existentes = await tx.usuario.count({ where: { perfil: "ADMINISTRADOR", ativo: true } });
    if (existentes > 0) throw new ConflictException("Já existe um administrador ativo.");
    const usuario = await tx.usuario.create({
      data: {
        nome: dados.nome.trim(),
        email,
        perfil: "ADMINISTRADOR",
        senhaHash,
        trocarSenha: false,
      },
      select: CAMPOS_PUBLICOS,
    });
    await auditoria.registrar(
      {
        acao: "ADMIN_INICIAL_CRIADO",
        alvoTipo: "Usuario",
        alvoId: usuario.id,
        detalhes: { email },
      },
      tx,
    );
    return usuario;
  });
}
