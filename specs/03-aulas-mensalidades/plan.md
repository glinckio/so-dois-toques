# Etapa 3: Plano técnico

## Modelo de dados (Prisma)

| Tabela        | Campos principais                                                                                                                                                | Restrições                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `Plano`       | nome, aulas por semana, `valorCentavos`, ativo                                                                                                                   | Nome único; CHECK de aulas (1–7) e valor (100–1.000.000)                           |
| `Assinatura`  | aluno, plano, dia de vencimento, `descontoCentavos`, motivo do desconto, `inicio` e `fim` (primeiro dia do mês; `fim` é o primeiro mês que não vale mais)        | Índice único parcial `(alunoId) WHERE fim IS NULL`; CHECK de dia (1–28) e desconto |
| `Mensalidade` | aluno, assinatura, competência (primeiro dia do mês), `valorCentavos`, vencimento, situação (`ABERTA`, `PAGA`, `CANCELADA`), cancelamento (quando, quem, motivo) | Único `(alunoId, competencia)`; CHECK valor > 0                                    |
| `Pagamento`   | mensalidade, `numeroRecibo` (sequência), valor, forma, data, recebido por, lançamento, estorno (quando, quem, motivo, lançamento)                                | Índice único parcial `(mensalidadeId) WHERE estornadoEm IS NULL`                   |
| `Lancamento`  | tipo (`ENTRADA`, `SAIDA`), `valorCentavos`, forma, data, categoria, descrição, origem (tipo e id), `estornoDeId`, criado por                                     | CHECK valor > 0; `estornoDeId` único; trigger impede UPDATE e DELETE               |

"Atrasada" não é guardada: é `ABERTA` com vencimento antes de hoje (São Paulo), calculada na consulta.

## Regras puras (`apps/api/src/mensalidades/regras.ts`)

- `competenciaDe(data)`, `competenciaValida("AAAA-MM")`, `proximaCompetencia`, `competenciaAtual(agora)`.
- `vencimentoEm(competencia, dia)`.
- `valorDaMensalidade(plano, desconto)`.
- `situacaoEm(mensalidade, hoje)` → `EM_ABERTO | ATRASADA | PAGA | CANCELADA`.
- `diasDeAtraso(vencimento, hoje)`.
- `assinaturaValeEm(assinatura, competencia)`.
- `resumoDoCaixa(lancamentos)` → totais por forma e tipo.
- `formatarReais(centavos)` para recibo e mensagens.

## API (NestJS, módulos `mensalidades` e `caixa`)

| Rota                                               | Quem               | O que faz                                                 |
| -------------------------------------------------- | ------------------ | --------------------------------------------------------- |
| `GET /planos`, `POST /planos`, `PATCH /planos/:id` | Admin (área aulas) | Planos                                                    |
| `GET /alunos/:id/assinaturas`                      | Admin (área aulas) | Histórico de assinaturas do aluno                         |
| `PUT /alunos/:id/assinatura`                       | Admin (área aulas) | Define ou troca o plano (encerra a vigente e abre a nova) |
| `DELETE /alunos/:id/assinatura`                    | Admin (área aulas) | Encerra a assinatura vigente (o registro fica)            |
| `POST /mensalidades/geracoes`                      | Admin (área caixa) | Gera as mensalidades de um mês (idempotente)              |
| `GET /mensalidades?competencia=&situacao=&busca=`  | Admin, Atendente   | Lista do mês com totais                                   |
| `GET /mensalidades/inadimplentes`                  | Admin, Atendente   | Alunos com mensalidade atrasada                           |
| `GET /mensalidades/:id`                            | Admin, Atendente   | Detalhe com pagamentos                                    |
| `POST /mensalidades/:id/pagamentos`                | Admin, Atendente   | Registra pagamento + lançamento (trava a mensalidade)     |
| `POST /mensalidades/:id/cancelar`                  | Admin              | Cancela com motivo                                        |
| `POST /pagamentos/:id/estornar`                    | Admin              | Estorna com motivo + lançamento de saída                  |
| `GET /pagamentos/:id/recibo`                       | Admin, Atendente   | Dados do recibo                                           |
| `GET /caixa/lancamentos?data=`                     | Admin, Atendente   | Lançamentos do dia com resumo por forma                   |

O "DELETE" de assinatura só preenche `fim`; nada é apagado.

Concorrência:

- Pagamento e cancelamento travam a mensalidade (`SELECT … FOR UPDATE`); o índice único parcial em `Pagamento` é a última barreira.
- Geração usa `createMany({ skipDuplicates: true })` sobre o único `(alunoId, competencia)`.
- Troca de assinatura trava o aluno (`FOR UPDATE`); o índice único parcial impede duas vigentes.

Geração automática: um serviço inicia com a API e roda a geração do mês corrente na subida e a cada hora (`setInterval` com `unref`). Ela é desligada com `GERACAO_AUTOMATICA=false` (testes de integração). Fica auditada como `MENSALIDADES_GERADAS` sem autor quando cria alguma mensalidade.

Auditoria: novas ações `PLANO_CRIADO`, `PLANO_ALTERADO`, `ASSINATURA_DEFINIDA`, `ASSINATURA_ENCERRADA`, `MENSALIDADES_GERADAS`, `PAGAMENTO_REGISTRADO`, `PAGAMENTO_ESTORNADO`, `MENSALIDADE_CANCELADA`.

Inativar e anonimizar aluno (Etapa 2) passam a encerrar a assinatura vigente na mesma transação.

## Web (Next.js)

- `/aulas/planos`: lista, cadastro e edição (admin).
- `/aulas/alunos/[id]`: bloco "Plano" com a assinatura vigente, o histórico e o formulário de troca (admin).
- `/caixa`: lançamentos do dia (`?data=`) com totais por forma.
- `/caixa/mensalidades?competencia=&situacao=&busca=`: lista do mês, totais, botão "Gerar mensalidades" (admin).
- `/caixa/mensalidades/[id]`: detalhe, registrar pagamento, cancelar (admin), estornar (admin).
- `/caixa/inadimplentes`.
- `/caixa/recibos/[id]`: recibo para imprimir (CSS de impressão).

## Testes

- Unidade: regras puras (competência, vencimento, situação, atraso, resumo do caixa, formatação).
- Integração (PostgreSQL): MENS-CA-01 a 20, incluindo geração e pagamento simultâneos e o trigger do livro-razão.
- Ponta a ponta: plano → assinatura → geração → pagamento → recibo → Caixa; atendente registra pagamento mas não vê estorno.

## Riscos

- Mês corrente e vencimento dependem do fuso: tudo calculado em America/Sao_Paulo antes de ir ao banco, com datas `DATE`.
- A geração automática roda em toda instância da API; a idempotência no banco garante que mais de uma instância não duplica nada.
