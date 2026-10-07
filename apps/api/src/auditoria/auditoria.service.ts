import { Injectable } from "@nestjs/common";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

export const ACOES = [
  "LOGIN_SUCESSO",
  "LOGIN_RECUSADO",
  "LOGIN_BLOQUEADO",
  "LOGOUT",
  "ACESSO_NEGADO",
  "USUARIO_CRIADO",
  "USUARIO_PERFIL_ALTERADO",
  "USUARIO_DESATIVADO",
  "SENHA_TROCADA",
  "SENHA_REDEFINIDA",
  "ADMIN_INICIAL_CRIADO",
  "ALUNO_CRIADO",
  "ALUNO_ALTERADO",
  "ALUNO_INATIVADO",
  "ALUNO_REATIVADO",
  "ALUNO_EXPORTADO",
  "ALUNO_ANONIMIZADO",
  "LOCAL_CRIADO",
  "LOCAL_ALTERADO",
  "TURMA_CRIADA",
  "TURMA_ALTERADA",
  "TURMA_ENCERRADA",
  "MATRICULA_CRIADA",
  "MATRICULA_ENCERRADA",
  "PRESENCA_REGISTRADA",
  "PLANO_CRIADO",
  "PLANO_ALTERADO",
  "ASSINATURA_DEFINIDA",
  "ASSINATURA_ENCERRADA",
  "MENSALIDADES_GERADAS",
  "PAGAMENTO_REGISTRADO",
  "PAGAMENTO_ESTORNADO",
  "MENSALIDADE_CANCELADA",
  "LOCAL_VALOR_HORA_ALTERADO",
  "PAGAMENTO_QUADRA_REGISTRADO",
  "PAGAMENTO_QUADRA_ESTORNADO",
  "CAIXA_ABERTO",
  "CAIXA_FECHADO",
  "LANCAMENTO_AVULSO_REGISTRADO",
  "LANCAMENTO_AVULSO_ESTORNADO",
  "PRODUTO_CRIADO",
  "PRODUTO_ALTERADO",
  "COMPRA_REGISTRADA",
  "VENDA_REGISTRADA",
  "ESTOQUE_AJUSTADO",
  "VENDA_ESTORNADA",
  "COMPRA_ESTORNADA",
  "FAIXAS_CRIADAS",
  "FAIXA_REMOVIDA",
  "QUADRA_RENOMEADA",
  "RESERVA_CRIADA",
  "SERIE_CRIADA",
  "SERIE_ENCERRADA",
  "RESERVA_CANCELADA",
  "RESERVA_PAGA",
  "PAGAMENTO_RESERVA_ESTORNADO",
  "CONTABIL_EXPORTADO",
] as const;
export type Acao = (typeof ACOES)[number];

export type EventoAuditoria = {
  acao: Acao;
  atorId?: string | null;
  alvoTipo?: string;
  alvoId?: string;
  ip?: string | null;
  detalhes?: Prisma.InputJsonValue;
};

type Cliente = Pick<PrismaService, "auditoria">;

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Grava um evento. Aceita um cliente de transação para gravar junto com a mudança. */
  async registrar(evento: EventoAuditoria, cliente: Cliente = this.prisma): Promise<void> {
    await cliente.auditoria.create({
      data: {
        acao: evento.acao,
        atorId: evento.atorId ?? null,
        alvoTipo: evento.alvoTipo ?? null,
        alvoId: evento.alvoId ?? null,
        ip: evento.ip ?? null,
        detalhes: evento.detalhes,
      },
    });
  }

  async consultar(filtro: {
    inicio?: Date;
    fim?: Date;
    usuarioId?: string;
    acao?: Acao;
    pagina: number;
    tamanho: number;
  }) {
    const where: Prisma.AuditoriaWhereInput = {
      criadaEm: { gte: filtro.inicio, lte: filtro.fim },
      acao: filtro.acao,
      OR: filtro.usuarioId
        ? [{ atorId: filtro.usuarioId }, { alvoId: filtro.usuarioId }]
        : undefined,
    };
    const [total, itens] = await Promise.all([
      this.prisma.auditoria.count({ where }),
      this.prisma.auditoria.findMany({
        where,
        orderBy: { id: "desc" },
        skip: (filtro.pagina - 1) * filtro.tamanho,
        take: filtro.tamanho,
      }),
    ]);
    const atores = await this.prisma.usuario.findMany({
      where: { id: { in: [...new Set(itens.flatMap((i) => (i.atorId ? [i.atorId] : [])))] } },
      select: { id: true, nome: true },
    });
    const nomes = new Map(atores.map((a) => [a.id, a.nome]));
    return {
      total,
      pagina: filtro.pagina,
      tamanho: filtro.tamanho,
      itens: itens.map((i) => ({
        id: i.id.toString(),
        criadaEm: i.criadaEm.toISOString(),
        acao: i.acao,
        atorId: i.atorId,
        atorNome: i.atorId ? (nomes.get(i.atorId) ?? null) : null,
        alvoTipo: i.alvoTipo,
        alvoId: i.alvoId,
        ip: i.ip,
        detalhes: i.detalhes,
      })),
    };
  }
}
