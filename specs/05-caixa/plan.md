# Etapa 5: Plano técnico

## Modelo de dados (Prisma)

| Tabela        | Mudança                                                                                                                     | Restrições                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `SessaoCaixa` | troco inicial, aberta por e quando, fechada por e quando, esperado em dinheiro, contado, diferença, observação              | Índice único parcial `((1)) WHERE fechadaEm IS NULL`; CHECK de faixas |
| `Lancamento`  | novo campo `sessaoId` (opcional), gravado na criação; novas categorias `SUPRIMENTO`, `SANGRIA`, `DESPESA`, `RECEITA_AVULSA` | Continua imutável (gatilho da Etapa 3)                                |

## Regras puras (`apps/api/src/caixa/regras.ts`)

- `CATEGORIAS_AVULSAS` com o tipo (entrada ou saída) e se aceita só dinheiro.
- `esperadoEmDinheiro(troco, lancamentos)`.
- `resumoPorCategoria(lancamentos)`.

## API (NestJS, módulo `caixa`, área caixa)

| Rota                               | Quem             | O que faz                                       |
| ---------------------------------- | ---------------- | ----------------------------------------------- |
| `GET /caixa/sessao`                | Admin, Atendente | Turno aberto (ou nulo) com o esperado até agora |
| `POST /caixa/sessoes`              | Admin, Atendente | Abre o caixa                                    |
| `POST /caixa/sessoes/:id/fechar`   | Admin, Atendente | Fecha com o contado e a observação              |
| `GET /caixa/sessoes`               | Admin, Atendente | Turnos, mais recentes primeiro                  |
| `GET /caixa/sessoes/:id`           | Admin, Atendente | Relatório do turno                              |
| `POST /caixa/avulsos`              | Admin, Atendente | Lançamento avulso                               |
| `POST /caixa/avulsos/:id/estornar` | Admin            | Estorno de avulso                               |

Concorrência:

- Quem cria lançamento lê o turno aberto com `FOR SHARE`; o fechamento trava o turno com `FOR UPDATE`. Assim o lançamento entra no turno antes do fechamento ou fica fora dele, nunca no meio.
- O índice único parcial impede dois turnos abertos.
- `estornoDeId` único impede dois estornos.

Mensalidades (pagamento e estorno) e custos (pagamento e estorno) passam a gravar o `sessaoId` do turno aberto, pela mesma função.

Auditoria: novas ações `CAIXA_ABERTO`, `CAIXA_FECHADO`, `LANCAMENTO_AVULSO_REGISTRADO`, `LANCAMENTO_AVULSO_ESTORNADO`.

## Web (Next.js)

- `/caixa`: painel do turno (abrir, esperado até agora, avulso, fechar) acima dos lançamentos do dia; aviso quando não há caixa aberto; estorno de avulso (admin).
- `/caixa/turnos`: lista de turnos.
- `/caixa/turnos/[id]`: relatório do turno, com impressão.

## Testes

- Unidade: esperado em dinheiro, resumo por categoria, regras das categorias.
- Integração (PostgreSQL): CAIXA-CA-01 a 08, com aberturas e fechamentos simultâneos.
- Ponta a ponta: atendente abre, lança avulso, recebe mensalidade em dinheiro e fecha com diferença; relatório; professor sem acesso.

## Riscos

- Os testes de integração compartilham o banco e só pode haver um caixa aberto: cada teste fecha o caixa que abriu.
