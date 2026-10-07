# Etapa 7: Plano técnico

## Modelo de dados (Prisma)

| Tabela             | Campos principais                                                                                                   | Restrições                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `Quadra`           | nome, ordem                                                                                                         | Nome único; "Quadra 1" e "Quadra 2" criadas na migração                        |
| `FaixaPreco`       | dia da semana, hora de início e fim, valor da hora                                                                  | CHECK de faixas; exclusão (`btree_gist`): faixas do mesmo dia não se sobrepõem |
| `SerieReserva`     | tipo (`RESERVA` ou `BLOQUEIO`), quadra, dia da semana, horas, cliente ou motivo, data inicial e final, encerramento | CHECK de faixas e de cliente ou motivo conforme o tipo                         |
| `Reserva`          | tipo, quadra, data, horas, cliente (nome e telefone) ou motivo, valor congelado, série, cancelamento                | CHECK; exclusão: duas ativas nunca se sobrepõem na mesma quadra e data         |
| `PagamentoReserva` | reserva, valor, forma, data, lançamento, estorno (quando, quem, motivo, lançamento)                                 | Índice único parcial: um pagamento valendo por reserva                         |
| `Lancamento`       | nova categoria `ALUGUEL_QUADRA`                                                                                     | Continua imutável                                                              |

## Regras puras (`apps/api/src/horarios/regras.ts`)

- `conflitosDeFaixa(novas, existentes)`.
- `valorDaReserva(faixasDoDia, inicio, fim)`: soma hora a hora; null fora do funcionamento.
- `inicioDaHora(data, hora)`: instante em São Paulo (UTC−3).
- `problemaDeData(data, hora, hoje, agora)`: já começou ou além de 180 dias.
- `datasDaSerie(inicio, fim, diaSemana)`.
- `problemaDeCancelamento(inicio, agora, admin)`: regra das 24 horas.

## API (NestJS, módulo `horarios`, área horarios)

| Rota                                             | Quem             | O que faz                                                 |
| ------------------------------------------------ | ---------------- | --------------------------------------------------------- |
| `GET /horarios/quadras`, `PATCH .../quadras/:id` | Todos / Admin    | Lista e renomeia quadras                                  |
| `GET /horarios/faixas`, `POST`, `DELETE .../:id` | Todos / Admin    | Faixas de preço                                           |
| `GET /horarios/grade?data=`                      | Admin, Atendente | Faixas do dia e ocupações de cada quadra, com pago ou não |
| `POST /horarios/reservas`                        | Admin, Atendente | Reserva ou bloqueio (admin), avulso ou semanal            |
| `GET /horarios/reservas/:id`                     | Admin, Atendente | Detalhe com pagamentos                                    |
| `POST /horarios/reservas/:id/pagar`              | Admin, Atendente | Pagamento + lançamento de entrada                         |
| `POST /horarios/reservas/:id/estornar-pagamento` | Admin            | Estorno do pagamento                                      |
| `POST /horarios/reservas/:id/cancelar`           | Admin, Atendente | Cancelamento (24 horas para o atendente), estorna se pago |
| `GET /horarios/series`, `POST .../:id/encerrar`  | Admin, Atendente | Reservas fixas em vigor e encerramento                    |

Concorrência: a restrição de exclusão do PostgreSQL é a garantia contra reserva dobrada (o erro 23P01 vira 409). Pagamento, estorno e cancelamento travam a reserva (`SELECT … FOR UPDATE`); encerrar a série trava a série e as ocorrências em ordem de id.

Auditoria: `FAIXAS_CRIADAS`, `FAIXA_REMOVIDA`, `QUADRA_RENOMEADA`, `RESERVA_CRIADA`, `SERIE_CRIADA`, `SERIE_ENCERRADA`, `RESERVA_CANCELADA`, `RESERVA_PAGA`, `PAGAMENTO_RESERVA_ESTORNADO`. Sem dado pessoal do cliente nos detalhes nem na descrição do lançamento.

## Web (Next.js)

- `/horarios`: grade do dia (hora × quadra), dia anterior e próximo; horário livre leva à reserva.
- `/horarios/nova`: reserva ou bloqueio, avulso ou semanal.
- `/horarios/reservas/[id]`: detalhe, pagamento, estorno (admin) e cancelamento.
- `/horarios/fixas`: reservas fixas e bloqueios semanais, com encerramento.
- `/horarios/faixas`: faixas de preço por dia e nome das quadras (edição só do admin).

## Testes

- Unidade: valor por faixa, sobreposição, datas da série, antecedência, fuso; grade na tela.
- Integração (PostgreSQL): HOR-CA-01 a 10, com reservas simultâneas.
- Ponta a ponta: faixa → reserva pela grade → pagamento → conflito → cancelamento com devolução → bloqueio; atendente sem configuração; professor sem acesso.
