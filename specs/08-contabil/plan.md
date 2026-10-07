# Etapa 8: Plano técnico

## Modelo de dados

Nenhuma tabela nova: o Contábil só lê `Lancamento` (com o lançamento estornado, para saber a origem do estorno), `ItemVenda`/`Venda`, `Reserva`/`PagamentoReserva`, `FaixaPreco`, `Quadra` e `Mensalidade`. A exportação grava só na auditoria (`CONTABIL_EXPORTADO`).

## Regras puras (`apps/api/src/contabil/regras.ts`)

- `resumoFinanceiro(lancamentos)`: receitas por origem, despesas por tipo, gaveta, resultado, margem e a conferência entradas − saídas.
- `problemaDePeriodo`, `periodoDoMes`, `datasDoPeriodo`, `mesesAte`.
- `turnoDaHora` e `ocupacaoPorTurno(quadras, datas, faixas, ocupações)`.
- `porcentagem(parte, total)`: uma casa, null sem base.

## API (NestJS, módulo `contabil`, área contabil: só Administrador)

| Rota                                                    | O que faz                                             |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `GET /contabil/painel?competencia=` ou `?de=&ate=`      | Painel do período (CONT-CA-01 a 08)                   |
| `GET /contabil/lancamentos?competencia=` ou `?de=&ate=` | Lançamentos do período para a planilha, com auditoria |

## Web (Next.js)

- `/contabil`: escolha de mês ou período; indicadores (receitas, despesas, resultado, margem); conferência com o Caixa; receitas por origem; despesas por tipo; lanchonete; a receber; ocupação por quadra e turno; formas de pagamento; últimos 12 meses.
- `/contabil/exportar`: rota que monta o CSV (`lib/contabil/formatacao.ts`), com BOM, ponto e vírgula, vírgula decimal e proteção contra fórmula.

## Testes

- Unidade: resumo e conferência, período, meses, turnos e ocupação; consulta do período, porcentagem e CSV na tela.
- Integração (PostgreSQL): CONT-CA-01 a 10, comparando o painel antes e depois de cada lançamento e com a soma direta do banco.
- Ponta a ponta: painel do mês, mês escolhido, período inválido, download da planilha; atendente sem acesso.
