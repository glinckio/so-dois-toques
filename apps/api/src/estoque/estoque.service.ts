import { randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Ator } from "../aulas/comum.js";
import { deDataDoBanco, hojeEmSaoPaulo, paraDataDoBanco } from "../aulas/regras.js";
import { AuditoriaService } from "../auditoria/auditoria.service.js";
import { turnoParaLancamento } from "../caixa/sessao.js";
import { Prisma } from "../generated/prisma/client.js";
import type { FormaPagamento } from "../mensalidades/regras.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { abaixoDoMinimo, agruparItens, custoMedio, totalDaVenda } from "./regras.js";

type Tx = Prisma.TransactionClient;

export type DadosProduto = {
  nome: string;
  precoCentavos: number;
  estoqueMinimo: number;
  ativo: boolean;
};

export type DadosCompra = {
  produtoId: string;
  quantidade: number;
  totalCentavos: number;
  forma: FormaPagamento;
  data: string;
};

const NOME = { select: { nome: true } } as const;
const ehUnico = (erro: unknown) =>
  erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === "P2002";

/** Trava as linhas dos produtos em ordem de id, para duas operações não se cruzarem. */
async function travarProdutos(tx: Tx, ids: string[]) {
  const ordenados = [...new Set(ids)].sort();
  await tx.$queryRaw`SELECT id FROM "Produto" WHERE id = ANY(${ordenados}::uuid[]) ORDER BY id FOR UPDATE`;
  return tx.produto.findMany({ where: { id: { in: ordenados } } });
}

@Injectable()
export class EstoqueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Produtos (ESTQ-CA-01, 07) ----------

  async listar() {
    const produtos = await this.prisma.produto.findMany({
      orderBy: [{ ativo: "desc" }, { nome: "asc" }],
    });
    return produtos.map((p) => ({
      id: p.id,
      nome: p.nome,
      precoCentavos: p.precoCentavos,
      estoqueMinimo: p.estoqueMinimo,
      saldo: p.saldo,
      custoMedioCentavos: p.custoMedioCentavos,
      ativo: p.ativo,
      abaixoDoMinimo: p.ativo && abaixoDoMinimo(p),
    }));
  }

  async criar(ator: Ator, dados: DadosProduto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const produto = await tx.produto.create({ data: dados });
        await this.auditoria.registrar(
          {
            acao: "PRODUTO_CRIADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Produto",
            alvoId: produto.id,
            detalhes: { nome: produto.nome, precoCentavos: produto.precoCentavos },
          },
          tx,
        );
        return { id: produto.id };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException("Já existe um produto com esse nome.");
      throw erro;
    }
  }

  async alterar(ator: Ator, id: string, dados: DadosProduto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const atual = await tx.produto.findUnique({ where: { id } });
        if (!atual) throw new NotFoundException("Produto não encontrado.");
        await tx.produto.update({ where: { id }, data: dados });
        const campos = (Object.keys(dados) as (keyof DadosProduto)[]).filter(
          (campo) => dados[campo] !== atual[campo],
        );
        await this.auditoria.registrar(
          {
            acao: "PRODUTO_ALTERADO",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Produto",
            alvoId: id,
            detalhes: {
              campos,
              ...(campos.includes("precoCentavos")
                ? { precoAnterior: atual.precoCentavos, precoNovo: dados.precoCentavos }
                : {}),
            },
          },
          tx,
        );
        return { id };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException("Já existe um produto com esse nome.");
      throw erro;
    }
  }

  async movimentos(id: string) {
    const produto = await this.prisma.produto.findUnique({ where: { id } });
    if (!produto) throw new NotFoundException("Produto não encontrado.");
    const movimentos = await this.prisma.movimentoEstoque.findMany({
      where: { produtoId: id },
      include: { criadoPor: NOME },
      orderBy: { criadoEm: "desc" },
      take: 200,
    });
    return {
      produto: {
        id: produto.id,
        nome: produto.nome,
        precoCentavos: produto.precoCentavos,
        estoqueMinimo: produto.estoqueMinimo,
        saldo: produto.saldo,
        custoMedioCentavos: produto.custoMedioCentavos,
        ativo: produto.ativo,
        abaixoDoMinimo: produto.ativo && abaixoDoMinimo(produto),
      },
      movimentos: movimentos.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        quantidade: m.quantidade,
        saldoDepois: m.saldoDepois,
        motivo: m.motivo,
        origemId: m.origemId,
        criadoPor: m.criadoPor.nome,
        criadoEm: m.criadoEm.toISOString(),
      })),
    };
  }

  // ---------- Compra (ESTQ-CA-02) ----------

  async comprar(ator: Ator, dados: DadosCompra) {
    if (dados.data > hojeEmSaoPaulo(new Date())) {
      throw new BadRequestException("A data da compra não pode ser no futuro.");
    }
    return this.prisma.$transaction(async (tx) => {
      const [produto] = await travarProdutos(tx, [dados.produtoId]);
      if (!produto) throw new NotFoundException("Produto não encontrado.");
      if (!produto.ativo) throw new BadRequestException("Produto inativo não recebe compra.");
      const compraId = randomUUID();
      const sessaoId = await turnoParaLancamento(tx);
      const lancamento = await tx.lancamento.create({
        data: {
          sessaoId,
          tipo: "SAIDA",
          valorCentavos: dados.totalCentavos,
          forma: dados.forma,
          data: paraDataDoBanco(dados.data),
          categoria: "COMPRA_ESTOQUE",
          descricao: `Compra: ${dados.quantidade} × ${produto.nome}`,
          origemTipo: "Compra",
          origemId: compraId,
          criadoPorId: ator.id,
        },
      });
      await tx.compra.create({
        data: {
          id: compraId,
          produtoId: produto.id,
          quantidade: dados.quantidade,
          totalCentavos: dados.totalCentavos,
          forma: dados.forma,
          data: paraDataDoBanco(dados.data),
          feitaPorId: ator.id,
          lancamentoId: lancamento.id,
        },
      });
      const atualizado = await tx.produto.update({
        where: { id: produto.id },
        data: {
          saldo: { increment: dados.quantidade },
          custoMedioCentavos: custoMedio(
            produto.saldo,
            produto.custoMedioCentavos,
            dados.quantidade,
            dados.totalCentavos,
          ),
        },
      });
      await tx.movimentoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: "COMPRA",
          quantidade: dados.quantidade,
          saldoDepois: atualizado.saldo,
          origemId: compraId,
          criadoPorId: ator.id,
        },
      });
      await this.auditoria.registrar(
        {
          acao: "COMPRA_REGISTRADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Produto",
          alvoId: produto.id,
          detalhes: {
            compraId,
            quantidade: dados.quantidade,
            totalCentavos: dados.totalCentavos,
            forma: dados.forma,
            lancamentoId: lancamento.id,
          },
        },
        tx,
      );
      return { id: compraId, lancamentoId: lancamento.id };
    });
  }

  // ---------- Venda (ESTQ-CA-03, 04) ----------

  async vender(
    ator: Ator,
    dados: { itens: { produtoId: string; quantidade: number }[]; forma: FormaPagamento },
  ) {
    const itens = agruparItens(dados.itens);
    return this.prisma.$transaction(async (tx) => {
      const sessaoId = await turnoParaLancamento(tx);
      if (!sessaoId) throw new ConflictException("Abra o caixa antes de vender.");
      const produtos = new Map(
        (
          await travarProdutos(
            tx,
            itens.map((i) => i.produtoId),
          )
        ).map((p) => [p.id, p]),
      );
      const linhas = itens.map((item) => {
        const produto = produtos.get(item.produtoId);
        if (!produto || !produto.ativo) {
          throw new BadRequestException("Um dos produtos não está disponível para venda.");
        }
        if (produto.saldo < item.quantidade) {
          throw new ConflictException(
            `Saldo insuficiente de ${produto.nome}: ${produto.saldo === 1 ? "resta 1 unidade" : `restam ${produto.saldo} unidades`}.`,
          );
        }
        return {
          produto,
          quantidade: item.quantidade,
          precoCentavos: produto.precoCentavos,
          custoCentavos: produto.custoMedioCentavos,
        };
      });
      const total = totalDaVenda(linhas);
      const vendaId = randomUUID();
      const descricao = `Venda: ${linhas.map((l) => `${l.quantidade} × ${l.produto.nome}`).join(", ")}`;
      const lancamento = await tx.lancamento.create({
        data: {
          sessaoId,
          tipo: "ENTRADA",
          valorCentavos: total,
          forma: dados.forma,
          data: paraDataDoBanco(hojeEmSaoPaulo(new Date())),
          categoria: "VENDA",
          descricao: descricao.length > 200 ? `${descricao.slice(0, 197)}...` : descricao,
          origemTipo: "Venda",
          origemId: vendaId,
          criadoPorId: ator.id,
        },
      });
      await tx.venda.create({
        data: {
          id: vendaId,
          totalCentavos: total,
          forma: dados.forma,
          feitaPorId: ator.id,
          lancamentoId: lancamento.id,
          itens: {
            create: linhas.map((l) => ({
              produtoId: l.produto.id,
              quantidade: l.quantidade,
              precoCentavos: l.precoCentavos,
              custoCentavos: l.custoCentavos,
            })),
          },
        },
      });
      for (const l of linhas) {
        const atualizado = await tx.produto.update({
          where: { id: l.produto.id },
          data: { saldo: { decrement: l.quantidade } },
        });
        await tx.movimentoEstoque.create({
          data: {
            produtoId: l.produto.id,
            tipo: "VENDA",
            quantidade: -l.quantidade,
            saldoDepois: atualizado.saldo,
            origemId: vendaId,
            criadoPorId: ator.id,
          },
        });
      }
      await this.auditoria.registrar(
        {
          acao: "VENDA_REGISTRADA",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Venda",
          alvoId: vendaId,
          detalhes: {
            totalCentavos: total,
            forma: dados.forma,
            itens: linhas.map((l) => ({ produtoId: l.produto.id, quantidade: l.quantidade })),
            lancamentoId: lancamento.id,
          },
        },
        tx,
      );
      return { id: vendaId, totalCentavos: total, lancamentoId: lancamento.id };
    });
  }

  async vendasDoDia(data?: string) {
    const dia = data ?? hojeEmSaoPaulo(new Date());
    const vendas = await this.prisma.venda.findMany({
      where: { lancamento: { data: paraDataDoBanco(dia) } },
      include: {
        feitaPor: NOME,
        itens: { include: { produto: NOME } },
      },
      orderBy: { feitaEm: "desc" },
    });
    return {
      data: dia,
      totalCentavos: vendas
        .filter((v) => !v.estornadaEm)
        .reduce((soma, v) => soma + v.totalCentavos, 0),
      vendas: vendas.map((v) => ({
        id: v.id,
        totalCentavos: v.totalCentavos,
        forma: v.forma,
        feitaPor: v.feitaPor.nome,
        feitaEm: v.feitaEm.toISOString(),
        estornadaEm: v.estornadaEm?.toISOString() ?? null,
        motivoEstorno: v.motivoEstorno,
        itens: v.itens.map((i) => ({
          produto: i.produto.nome,
          quantidade: i.quantidade,
          precoCentavos: i.precoCentavos,
        })),
      })),
    };
  }

  // ---------- Ajuste (ESTQ-CA-05) ----------

  async ajustar(ator: Ator, dados: { produtoId: string; quantidade: number; motivo: string }) {
    return this.prisma.$transaction(async (tx) => {
      const [produto] = await travarProdutos(tx, [dados.produtoId]);
      if (!produto) throw new NotFoundException("Produto não encontrado.");
      if (produto.saldo + dados.quantidade < 0) {
        throw new ConflictException(
          `O ajuste deixaria o saldo negativo: há ${produto.saldo} em estoque.`,
        );
      }
      const atualizado = await tx.produto.update({
        where: { id: produto.id },
        data: { saldo: { increment: dados.quantidade } },
      });
      const movimento = await tx.movimentoEstoque.create({
        data: {
          produtoId: produto.id,
          tipo: "AJUSTE",
          quantidade: dados.quantidade,
          saldoDepois: atualizado.saldo,
          motivo: dados.motivo,
          criadoPorId: ator.id,
        },
      });
      await this.auditoria.registrar(
        {
          acao: "ESTOQUE_AJUSTADO",
          atorId: ator.id,
          ip: ator.ip,
          alvoTipo: "Produto",
          alvoId: produto.id,
          detalhes: {
            quantidade: dados.quantidade,
            saldoDepois: atualizado.saldo,
            motivo: dados.motivo,
          },
        },
        tx,
      );
      return { id: movimento.id, saldo: atualizado.saldo };
    });
  }

  // ---------- Estornos (ESTQ-CA-06) ----------

  async estornarVenda(ator: Ator, id: string, motivo: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sessaoId = await turnoParaLancamento(tx);
        if (!sessaoId) throw new ConflictException("Abra o caixa antes de estornar uma venda.");
        await tx.$queryRaw`SELECT id FROM "Venda" WHERE id = ${id}::uuid FOR UPDATE`;
        const venda = await tx.venda.findUnique({ where: { id }, include: { itens: true } });
        if (!venda) throw new NotFoundException("Venda não encontrada.");
        if (venda.estornadaEm) throw new ConflictException("Esta venda já foi estornada.");
        await travarProdutos(
          tx,
          venda.itens.map((i) => i.produtoId),
        );
        for (const item of venda.itens) {
          const atualizado = await tx.produto.update({
            where: { id: item.produtoId },
            data: { saldo: { increment: item.quantidade } },
          });
          await tx.movimentoEstoque.create({
            data: {
              produtoId: item.produtoId,
              tipo: "ESTORNO_VENDA",
              quantidade: item.quantidade,
              saldoDepois: atualizado.saldo,
              motivo,
              origemId: venda.id,
              criadoPorId: ator.id,
            },
          });
        }
        const estorno = await tx.lancamento.create({
          data: {
            sessaoId,
            tipo: "SAIDA",
            valorCentavos: venda.totalCentavos,
            forma: venda.forma,
            data: paraDataDoBanco(hojeEmSaoPaulo(new Date())),
            categoria: "ESTORNO",
            descricao: "Estorno de venda da lanchonete",
            origemTipo: "Venda",
            origemId: venda.id,
            estornoDeId: venda.lancamentoId,
            criadoPorId: ator.id,
          },
        });
        await tx.venda.update({
          where: { id },
          data: {
            estornadaEm: new Date(),
            estornadaPorId: ator.id,
            motivoEstorno: motivo,
            estornoLancamentoId: estorno.id,
          },
        });
        await this.auditoria.registrar(
          {
            acao: "VENDA_ESTORNADA",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Venda",
            alvoId: id,
            detalhes: { totalCentavos: venda.totalCentavos, lancamentoId: estorno.id, motivo },
          },
          tx,
        );
        return { id, estornoLancamentoId: estorno.id };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException("Esta venda já foi estornada.");
      throw erro;
    }
  }

  async estornarCompra(ator: Ator, id: string, motivo: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Compra" WHERE id = ${id}::uuid FOR UPDATE`;
        const compra = await tx.compra.findUnique({ where: { id } });
        if (!compra) throw new NotFoundException("Compra não encontrada.");
        if (compra.estornadaEm) throw new ConflictException("Esta compra já foi estornada.");
        const [produto] = await travarProdutos(tx, [compra.produtoId]);
        if (!produto || produto.saldo < compra.quantidade) {
          throw new ConflictException(
            `Não há saldo para desfazer a compra: há ${produto?.saldo ?? 0} em estoque.`,
          );
        }
        const atualizado = await tx.produto.update({
          where: { id: produto.id },
          data: { saldo: { decrement: compra.quantidade } },
        });
        await tx.movimentoEstoque.create({
          data: {
            produtoId: produto.id,
            tipo: "ESTORNO_COMPRA",
            quantidade: -compra.quantidade,
            saldoDepois: atualizado.saldo,
            motivo,
            origemId: compra.id,
            criadoPorId: ator.id,
          },
        });
        const sessaoId = await turnoParaLancamento(tx);
        const estorno = await tx.lancamento.create({
          data: {
            sessaoId,
            tipo: "ENTRADA",
            valorCentavos: compra.totalCentavos,
            forma: compra.forma,
            data: paraDataDoBanco(hojeEmSaoPaulo(new Date())),
            categoria: "ESTORNO",
            descricao: `Estorno de compra: ${compra.quantidade} × ${produto.nome}`,
            origemTipo: "Compra",
            origemId: compra.id,
            estornoDeId: compra.lancamentoId,
            criadoPorId: ator.id,
          },
        });
        await tx.compra.update({
          where: { id },
          data: {
            estornadaEm: new Date(),
            estornadaPorId: ator.id,
            motivoEstorno: motivo,
            estornoLancamentoId: estorno.id,
          },
        });
        await this.auditoria.registrar(
          {
            acao: "COMPRA_ESTORNADA",
            atorId: ator.id,
            ip: ator.ip,
            alvoTipo: "Produto",
            alvoId: produto.id,
            detalhes: { compraId: id, totalCentavos: compra.totalCentavos, motivo },
          },
          tx,
        );
        return { id, estornoLancamentoId: estorno.id };
      });
    } catch (erro) {
      if (ehUnico(erro)) throw new ConflictException("Esta compra já foi estornada.");
      throw erro;
    }
  }

  /** Compras de um produto, para o extrato (com estorno). */
  async comprasDoProduto(produtoId: string) {
    const compras = await this.prisma.compra.findMany({
      where: { produtoId },
      include: { feitaPor: NOME },
      orderBy: { feitaEm: "desc" },
      take: 50,
    });
    return compras.map((c) => ({
      id: c.id,
      quantidade: c.quantidade,
      totalCentavos: c.totalCentavos,
      forma: c.forma,
      data: deDataDoBanco(c.data),
      feitaPor: c.feitaPor.nome,
      estornadaEm: c.estornadaEm?.toISOString() ?? null,
      motivoEstorno: c.motivoEstorno,
    }));
  }
}
