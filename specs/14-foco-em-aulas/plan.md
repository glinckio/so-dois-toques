# Etapa 14: Plano técnico

## Modelo de dados (Prisma)

| Tabela ou tipo                                                | Mudança                                                                                                                             |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `Produto`, `Venda`, `ItemVenda`, `Compra`, `MovimentoEstoque` | Apagadas, com `TipoMovimento` e o gatilho de imutabilidade do estoque                                                               |
| `SessaoCaixa`                                                 | Apagada, com o gatilho do turno fechado; sai `Lancamento.sessaoId`                                                                  |
| `PagamentoQuadra`, `Local`, `TipoLocal`                       | Apagados; sai `Turma.localId`                                                                                                       |
| `FaixaPreco`, `PagamentoReserva`, `TipoReserva`               | Apagados                                                                                                                            |
| `Reserva` → `Bloqueio`                                        | Renomeada; saem `tipo`, `quadraId`, cliente e valor; `motivo` obrigatório; exclusão por data e horas entre bloqueios não cancelados |
| `SerieReserva` → `SerieBloqueio`                              | Renomeada; saem `tipo`, `quadraId` e cliente; `motivo` obrigatório                                                                  |
| `Quadra`                                                      | Fica uma linha ("Quadra 1" vira "Quadra"); sai `ordem`                                                                              |
| `CategoriaLancamento`                                         | Recriado só com `MENSALIDADE` e `ESTORNO`                                                                                           |

Migração escrita à mão (`20261015120000_foco_em_aulas`), conferida com `prisma migrate diff` (sem diferença para o schema). Ela começa com um bloco `DO $$ … $$` que conta o que seria perdido e dá `RAISE EXCEPTION` com a lista quando há algo (FOCO-CA-11). Como a migração roda numa transação, nada muda nesse caso. O gatilho do livro-razão continua; o enum é trocado com `ALTER COLUMN … TYPE … USING`, que não dispara gatilho de linha.

## API

- Saem os módulos `estoque`, `caixa` e `custos`; `turnoParaLancamento` some dos serviços.
- Área `caixa` vira `mensalidades` (Administrador e Atendente). `GET /caixa/lancamentos` sai. Professor ganha `horarios`.
- `aulas`: saem as rotas de locais e `localId` do esquema da turma. `validarTurma` trava a agenda (`pg_advisory_xact_lock(hashtext('agenda-quadra'))`), confere sobreposição com todas as turmas ativas (FOCO-CA-04) e com bloqueios futuros (FOCO-CA-06), além da regra do professor.
- `horarios` reescrito:

| Rota                                                         | Quem          | O que faz                                                |
| ------------------------------------------------------------ | ------------- | -------------------------------------------------------- |
| `GET /horarios/quadra`, `PATCH /horarios/quadra`             | Todos / Admin | Nome da quadra                                           |
| `GET /horarios/grade?data=`                                  | Todos         | Aulas das turmas ativas no dia e bloqueios (FOCO-CA-05)  |
| `POST /horarios/bloqueios`                                   | Admin         | Bloqueio avulso ou semanal, conferindo aulas e bloqueios |
| `GET /horarios/bloqueios/:id`                                | Todos         | Detalhe                                                  |
| `POST /horarios/bloqueios/:id/cancelar`                      | Admin         | Cancela com motivo                                       |
| `GET /horarios/series`, `POST /horarios/series/:id/encerrar` | Todos / Admin | Bloqueios semanais em vigor e encerramento               |

- Regras puras novas em `horarios/regras.ts`: `aulasDoDia(turmas, data)` e `conflitosComAulas(datas, horaInicio, horaFim, turmas)`; ficam `datasDaSerie`, `inicioDaHora`, `somarDias`.
- `contabil`: `resumoFinanceiro` passa a somar só mensalidades (estorno descontado); saem despesas, gaveta, lanchonete, ocupação e reservas a receber.
- `rotas.e2e-spec.ts` (LANC-CA-03) continua listando as rotas e confere que nenhuma das que saíram existe (FOCO-CA-01).

## Web

- Saem `/caixa`, `/estoque`, `/aulas/custos`, `/aulas/locais`, `/horarios/faixas`, `/horarios/nova` (vira `/horarios/bloquear`), `/horarios/reservas/*`, `/horarios/privacidade`.
- `/mensalidades`, `/mensalidades/[id]`, `/mensalidades/inadimplentes`, `/mensalidades/recibos/[id]`: as páginas que estavam em `/caixa`.
- `/horarios`: grade de uma quadra com aulas e bloqueios; `/horarios/bloqueios/[id]`; `/horarios/fixas` só com bloqueios semanais.
- Menu, barra do celular, busca rápida e Início sem caixa e estoque; o Início mostra aulas de hoje, mensalidades atrasadas e o recebido no mês (administrador).
- Saem os componentes e bibliotecas de caixa, estoque e custos, e as partes de reserva dos horários.

## Specs e verificação

- `scripts/spec-coverage.ts`: usa o status `removida` e a marca `[removido` da Etapa 13.
- Etapas 4, 5, 6 e 13: `removida`. Etapas 2, 3, 7, 8, 9, 10, 11 e 12: `[removido]` nos critérios que saíram.

## Testes

- Unidade: cobertura do `spec-coverage`, regras novas da agenda, Contábil só com mensalidades, menu e busca por perfil.
- Integração: migração com e sem dados das partes que saem (FOCO-CA-11), turmas e bloqueios (FOCO-CA-04 a 08, 13), mensalidade sem turno (FOCO-CA-03), Contábil (FOCO-CA-09), rotas que saíram (FOCO-CA-01).
- Ponta a ponta: menu por perfil, grade com aula e bloqueio, mensalidades na área nova, Início.
