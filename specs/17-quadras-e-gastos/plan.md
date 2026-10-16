# Etapa 17: Plano técnico

## Banco (migration `20261016140000_quadras_e_gastos`)

- `Quadra`: ganha `ativa`; sai o índice que limitava a uma quadra.
- `Turma`, `Bloqueio` e `SerieBloqueio` ganham `quadraId` (as linhas atuais ficam na quadra que já existe). A exclusão de bloqueios sobrepostos passa a ser por quadra.
- `ContratoQuadra`: quadra, dia da semana, início e fim (minutos), valor por mês, dia do pagamento (1 a 28), forma, mês de início, mês de encerramento, autor e quem encerrou.
- `CategoriaLancamento` ganha `SALDO_INICIAL`, `ALUGUEL_MENSAL`, `LOCACAO_AVULSA`, `EQUIPAMENTO`, `INVESTIMENTO` e `OUTRO_GASTO`.
- Locação avulsa e outros gastos são só lançamentos de saída (a locação guarda a quadra em `origemTipo`/`origemId`). O lançamento mensal do contrato guarda `origemId = <contrato>:<AAAA-MM>`, com índice único parcial: um por mês, mesmo com duas execuções ao mesmo tempo.
- Índice único parcial: um só `SALDO_INICIAL`. A migration cria o de R$ 600,00 em 16/10/2026, em nome do primeiro administrador, se houver.

## Regras puras (`apps/api/src/gastos/regras.ts`)

- `parcelasDevidas(contrato, hoje, registradoEm)`: meses do início até hoje cuja data de pagamento já chegou, com a data do lançamento (o maior entre o vencimento e o dia do registro), parando no encerramento.
- `resumoFinanceiro`: mensalidades e estornos de mensalidade, gastos por tipo (com os estornos descontados do tipo original), saldo inicial à parte e a conferência.
- `saldoEmCaixa`: soma com sinal dos lançamentos a partir da data do saldo inicial.

## API

- `horarios`: `GET /horarios/quadras` (todos), `POST` e `PATCH /horarios/quadras/:id` (admin); grade e bloqueios recebem `quadraId`.
- `aulas`: turma com `quadraId`; conflito só na mesma quadra; quadra desativada recusada.
- `gastos` (área `contabil`, só o administrador): contratos (listar, registrar, encerrar), saídas do período, locação avulsa, outros gastos, estorno de lançamento, saldo inicial e saldo em caixa.
- `LancamentoMensalService`: lança os contratos vencidos na subida da API, a cada hora e ao registrar o contrato.
- Contábil: gastos por tipo, resultado, saldo em caixa e comparativo com gastos.

## Web

- `/horarios/quadras`: cadastro de quadras. Agenda com escolha da quadra; formulário de bloqueio e de turma com quadra.
- `/contabil/gastos`: lançar locação avulsa e outros gastos, lista das saídas com estorno.
- `/contabil/contratos`: contratos mensais, registrar e encerrar.
- Contábil e Início mostram o saldo em caixa e os gastos.

## Testes

- Unidade: parcelas devidas, resumo e saldo.
- Integração: GASTO-CA-01 a 10, com lançamento mensal simultâneo.
- Ponta a ponta: quadra nova, turma nela, contrato, gasto, estorno e saldo.
