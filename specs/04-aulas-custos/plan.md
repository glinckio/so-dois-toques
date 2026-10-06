# Etapa 4: Plano técnico

## Modelo de dados (Prisma)

| Tabela            | Mudança                                                                                                                                  | Restrições                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `Local`           | novo campo `valorHoraCentavos` (opcional)                                                                                                | CHECK 100–200.000; só local `PARCEIRA` pode ter valor      |
| `PagamentoQuadra` | local, competência (primeiro dia do mês), `valorCentavos`, forma, data, pago por, lançamento, estorno (quando, quem, motivo, lançamento) | CHECK valor > 0 e competência no dia 1; lançamentos únicos |
| `Lancamento`      | nova categoria `QUADRA_PARCEIRA`                                                                                                         | Continua imutável (gatilho da Etapa 3)                     |

## Regras puras (`apps/api/src/custos/regras.ts`)

- `minutosDaTurmaNoMes(turma, competencia)`: dias do mês cujo dia da semana tem horário, entre o início e o encerramento (exclusivo).
- `custoPrevisto(minutos, valorHora)`: `round(minutos × valorHora / 60)`.
- `ratear(total, pesos)`: divisão proporcional pelo maior resto, com sinal (estorno negativo divide igual ao pagamento).
- `ratearIgual(total, n)`.
- `matriculaValeNoMes(matricula, competencia)`.

## API (NestJS, módulo `custos`, área aulas, só administrador)

| Rota                                   | O que faz                                                              |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `PUT /locais/:id/valor-hora`           | Define ou apaga (`null`) o valor da hora                               |
| `GET /custos?competencia=`             | Locais parceiros com valor da hora, horas, previsto, pago e pagamentos |
| `POST /custos/pagamentos`              | Registra pagamento + lançamento de saída (trava o local)               |
| `POST /custos/pagamentos/:id/estornar` | Estorna com motivo + lançamento de entrada                             |
| `GET /custos/resultado?competencia=`   | Resultado por turma e por professor, com totais do Caixa               |

Concorrência: o estorno trava o pagamento (`SELECT … FOR UPDATE`) e `estornoDeId` único no livro-razão é a última barreira.

O resultado lê os lançamentos do mês das categorias `MENSALIDADE`, `QUADRA_PARCEIRA` e os estornos ligados a eles. A origem de cada lançamento (mensalidade ou pagamento à quadra) diz o aluno ou o local; a divisão usa as matrículas e as turmas atuais.

Auditoria: novas ações `LOCAL_VALOR_HORA_ALTERADO`, `PAGAMENTO_QUADRA_REGISTRADO`, `PAGAMENTO_QUADRA_ESTORNADO`.

## Web (Next.js)

- `/aulas/custos?competencia=`: por local parceiro, valor da hora (editável), horas, previsto, pago, pagamentos com estorno e formulário de pagamento.
- `/aulas/resultado?competencia=`: tabela por turma e por professor, com totais.
- Caixa: rótulo da nova categoria.

## Testes

- Unidade: horas do mês, custo previsto, rateios.
- Integração (PostgreSQL): CUSTO-CA-01 a 09.
- Ponta a ponta: valor da hora → previsto → pagamento → Caixa → resultado; professor sem acesso.

## Riscos

- O local e os horários da turma podem mudar; a divisão do custo de meses passados usa os atuais (registrado em "Fora do escopo").
