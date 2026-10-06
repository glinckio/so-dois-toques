# Etapa 2: Plano técnico

## Modelo de dados (Prisma)

| Tabela         | Campos principais                                                                                                                                                                                        | Restrições                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `Aluno`        | nome, `nomeBusca` (sem acento, minúsculo), telefone (dígitos), nascimento, contato de emergência, e-mail, observações, responsável, consentimento (quando, quem, registrado por), ativo, `anonimizadoEm` | Índices em `nomeBusca` e `telefone`                         |
| `Local`        | nome, tipo (`PARCEIRA` ou `PROPRIA`), endereço, ativo                                                                                                                                                    | Nome único                                                  |
| `Turma`        | nome, nível, local, professor (`Usuario`), vagas, ativa, `encerradaEm`                                                                                                                                   | `vagas` entre 1 e 40 (CHECK)                                |
| `HorarioTurma` | turma, dia da semana (0 = domingo), início e fim em minutos desde 00:00                                                                                                                                  | CHECK `inicio >= 300`, `fim <= 1439`, `fim > inicio`        |
| `Matricula`    | aluno, turma, início, fim (datas)                                                                                                                                                                        | Índice único parcial `(alunoId, turmaId) WHERE fim IS NULL` |
| `Presenca`     | turma, aluno, data, presente, registrada por, registrada em                                                                                                                                              | Único `(turmaId, alunoId, data)`                            |

Datas de matrícula e de aula são `DATE` no calendário de São Paulo. Uma matrícula vale na data D quando `inicio <= D` e (`fim` vazio ou `fim > D`).

## Regras puras (`apps/api/src/aulas/regras.ts`)

- `normalizarTelefone`, `normalizarBusca` (sem acento, minúsculo), `idadeEm(nascimento, data)`, `exigeResponsavel`.
- `hojeEmSaoPaulo(agora)` e validação de data `AAAA-MM-DD`.
- `horariosSobrepostos(a, b)` e `conflitosDeHorario(novos, existentes)`.
- `dataTemAula(data, horarios)` e `validarDataDePresenca(data, horarios, criadaEm, hoje)`.
- `matriculaValeEm(matricula, data)`.
- `dadosAnonimizados()`.

## API (NestJS, módulo `aulas`)

Todas as rotas exigem a área `aulas` (Administrador e Professor). As de cadastro exigem também o perfil Administrador, com o novo decorador `@SomenteAdministrador()` no `PerfisGuard` (negação auditada como `ACESSO_NEGADO`). O escopo do professor (só as turmas dele e os alunos com matrícula aberta nelas) é aplicado nas consultas; fora do escopo a resposta é 404, para não revelar se o registro existe, e a tentativa é auditada.

| Rota                                               | Quem         | O que faz                                                |
| -------------------------------------------------- | ------------ | -------------------------------------------------------- |
| `GET /alunos?busca=&situacao=&pagina=`             | Admin, Prof. | Lista e busca (professor: só os alunos dele)             |
| `POST /alunos`                                     | Admin        | Cadastra com consentimento                               |
| `GET /alunos/:id`                                  | Admin, Prof. | Detalhe com matrículas                                   |
| `PATCH /alunos/:id`                                | Admin        | Edita                                                    |
| `POST /alunos/:id/inativar` / `reativar`           | Admin        | Muda a situação; inativar encerra matrículas             |
| `GET /alunos/:id/exportacao`                       | Admin        | Dados do aluno em JSON (LGPD)                            |
| `POST /alunos/:id/anonimizar`                      | Admin        | Anonimiza (irreversível)                                 |
| `GET /locais`, `POST /locais`, `PATCH /locais/:id` | Admin        | Locais                                                   |
| `GET /professores`                                 | Admin        | Usuários que podem dar aula                              |
| `GET /turmas`, `GET /turmas/:id`                   | Admin, Prof. | Turmas com vagas ocupadas (professor: só as dele)        |
| `POST /turmas`, `PATCH /turmas/:id`                | Admin        | Cadastra e edita, com checagem de conflito do professor  |
| `POST /turmas/:id/encerrar`                        | Admin        | Encerra a turma e as matrículas                          |
| `POST /turmas/:id/matriculas`                      | Admin        | Matricula (trava a turma com `FOR UPDATE` para as vagas) |
| `POST /matriculas/:id/encerrar`                    | Admin        | Encerra a matrícula                                      |
| `GET /turmas/:id/presencas/:data`                  | Admin, Prof. | Lista de presença da aula                                |
| `PUT /turmas/:id/presencas/:data`                  | Admin, Prof. | Registra ou corrige a presença                           |

Concorrência: matrícula trava a linha da turma (`SELECT … FOR UPDATE`) antes de contar as vagas; cadastro e edição de turma usam um lock consultivo por professor para a checagem de conflito.

Auditoria: novas ações `ALUNO_CRIADO`, `ALUNO_ALTERADO`, `ALUNO_INATIVADO`, `ALUNO_REATIVADO`, `ALUNO_EXPORTADO`, `ALUNO_ANONIMIZADO`, `LOCAL_CRIADO`, `LOCAL_ALTERADO`, `TURMA_CRIADA`, `TURMA_ALTERADA`, `TURMA_ENCERRADA`, `MATRICULA_CRIADA`, `MATRICULA_ENCERRADA`, `PRESENCA_REGISTRADA`. Os detalhes de eventos de aluno guardam só ids e nomes dos campos alterados, nunca os valores, para que a anonimização não deixe dados pessoais na auditoria.

## Web (Next.js)

- `/aulas`: turmas (admin: todas; professor: as dele), com atalhos para Alunos e Locais (admin).
- `/aulas/turmas/nova` e `/aulas/turmas/[id]`: dados, horários, matriculados, matricular, encerrar.
- `/aulas/turmas/[id]/presenca?data=`: lista com botões grandes Presente/Ausente, pensada para o celular.
- `/aulas/alunos`, `/aulas/alunos/novo`, `/aulas/alunos/[id]`: busca, cadastro com consentimento, edição, inativar, exportar e anonimizar (com confirmação digitada).
- `/aulas/locais`: lista e cadastro.
- `/aulas/alunos/[id]/exportar`: route handler que baixa o JSON vindo da API.

## Testes

- Unidade: regras puras e utilitários do web (formatação de horário, telefone).
- Integração (PostgreSQL): AULAS-CA-01 a 22, incluindo matrículas simultâneas para a última vaga.
- Ponta a ponta: cadastro de local, turma e aluno, matrícula, presença no celular, escopo do professor.

## Riscos

- Busca sem acento: feita com a coluna `nomeBusca` preenchida pela API, sem depender da extensão `unaccent` do PostgreSQL.
- Fuso: todas as datas de calendário são calculadas em America/Sao_Paulo antes de ir ao banco.
