# Etapa 16: Plano técnico

## Banco (migration `20261016120000_turma_por_horario`)

- `Turma` ganha `diaSemana`, `horaInicio` e `horaFim` (minutos, CHECK 05:00–23:59 e fim depois do início) e perde `nome` e `professorId`; sai a tabela `HorarioTurma`.
- Turma de vários dias: o primeiro horário fica na turma; cada outro vira uma turma nova (mesmo nível, vagas, início e situação), com as matrículas copiadas; cada presença vai para a turma cujo dia da semana é o da data.
- Antes de tudo, um bloco `DO` para com `RAISE EXCEPTION` se houver horários de turmas ativas sobrepostos (TURMA-CA-06).
- `Perfil` perde `PROFESSOR`: os usuários viram `ATENDENTE` e o enum é recriado.

## API

- `turmaSchema`: `diaSemana`, `horaInicio`, `horaFim`, `nivel`, `vagas`.
- `TurmasService`: sem professor e sem escopo por professor; conflito com qualquer turma ativa no mesmo dia (TURMA-CA-02) e com bloqueios; resposta com `descricao` ("Terça, 19:00 às 20:00 · Iniciante").
- Regras puras: `horarioDaTurma` e `descreverTurma`.
- Atendente ganha a área `aulas`: lê turmas e alunos e marca presença; o resto continua `@SomenteAdministrador`. Sai a rota `/professores`.
- Agenda: a aula vem do horário da turma; sai o professor da grade.

## Web

- Formulário de turma: dia, início, fim, nível e vagas. Cartões, detalhe, presença e agenda mostram dia, horário e nível.
- Sem perfil Professor no cadastro de usuário, na saudação e na agenda ("Sua aula" sai).

## Testes

- Unidade: esquema da turma, `descreverTurma`, permissões.
- Integração: turmas (TURMA-CA-01 a 03, 05), perfil (TURMA-CA-04), migration (TURMA-CA-06).
- Ponta a ponta: turma pela tela, presença pela atendente, agenda.
