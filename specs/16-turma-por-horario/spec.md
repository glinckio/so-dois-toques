# Etapa 16: Turma é um dia e um horário

**Status:** rascunho

## Objetivo

A turma passa a ser um horário fixo da semana na quadra: um dia, um horário de início e de fim, um nível e as vagas. Some o nome da turma, some o professor da turma e some o perfil Professor do sistema.

## Por quê

Em 16/10/2026 o dono explicou que as turmas são divididas por dia e horário, não por nome, e que os professores são sempre os mesmos: "a turma por si só será dia e horário". Hoje a turma tem nome, professor e vários dias, o que não bate com o jeito como a escola funciona e obriga a cadastrar coisas que ninguém usa.

## Como fica a turma

- Campos: **dia da semana**, **início** e **fim** (horas e minutos, das 05:00 às 23:59), **nível** e **vagas** (1 a 40).
- Não tem nome: na tela, a turma aparece como dia, horário e nível, por exemplo "Terça, 19:00 às 20:00 · Iniciante".
- Uma turma tem um único dia. Quem treina duas vezes por semana é matriculado em duas turmas.
- Continua valendo: duas turmas ativas não dividem a quadra no mesmo horário (FOCO-CA-04), nem caem sobre bloqueio futuro (FOCO-CA-06); vagas não ficam abaixo dos matriculados; encerrar a turma encerra as matrículas.
- Alterar a turma pode mudar dia, horário, nível e vagas, com as mesmas conferências.

## Professor sai do sistema

- O perfil **Professor** deixa de existir. Ficam **Administrador** e **Atendente**.
- Usuários que hoje são Professor passam a **Atendente** na migração, para não perderem o acesso.
- O **atendente** passa a ver as turmas e os alunos delas (sem cadastrar nem alterar) e a **marcar a presença** de qualquer turma. O administrador continua fazendo tudo.
- Cadastro, alteração, encerramento de turma, matrícula, alunos, exportação e anonimização continuam só do administrador.
- Na agenda da quadra, a aula mostra dia, horário, nível e vagas; sai o destaque "Sua aula".

## Migração das turmas que já existem

- Cada turma com mais de um dia vira uma turma por dia, com o mesmo nível, vagas, início e situação (ativa ou encerrada).
- As matrículas são copiadas para cada nova turma (mesmo aluno, mesmas datas).
- Cada presença vai para a turma do dia da semana em que a aula aconteceu.
- Somem o nome da turma, o professor da turma e a tabela de horários da turma.
- Se duas turmas ativas ficarem no mesmo horário depois de divididas (não deveria, por FOCO-CA-04), a migração para sem mudar nada e diz quais são.

## Quem faz o quê

| Ação                                            | Administrador | Atendente |
| ----------------------------------------------- | ------------- | --------- |
| Ver turmas e alunos matriculados                | Sim           | Sim       |
| Marcar presença                                 | Sim           | Sim       |
| Cadastrar, alterar e encerrar turma             | Sim           | Não       |
| Matricular e encerrar matrícula                 | Sim           | Não       |
| Cadastrar, alterar, exportar e anonimizar aluno | Sim           | Não       |

## Critérios de aceite

- **TURMA-CA-01**: A turma é cadastrada só com dia da semana, início, fim, nível e vagas; horário fora de 05:00–23:59, fim antes do início ou vagas fora de 1 a 40 são recusados.
- **TURMA-CA-02**: Duas turmas ativas no mesmo dia e com horários sobrepostos são recusadas, ao cadastrar e ao alterar.
- **TURMA-CA-03**: A lista de turmas e a agenda mostram cada turma como dia, horário e nível, na ordem da semana e da hora, com vagas ocupadas e livres.
- **TURMA-CA-04**: O perfil Professor não existe mais: não aparece no cadastro de usuário e a API recusa criar usuário com ele.
- **TURMA-CA-05**: O atendente vê as turmas e os alunos matriculados e marca a presença de qualquer turma, mas não cadastra, altera nem encerra turma, nem matricula, pela tela e pela API.
- **TURMA-CA-06**: A migração divide a turma de vários dias em uma turma por dia, copia as matrículas, leva cada presença para a turma do dia certo, troca Professor por Atendente e mantém o resto; com turmas ativas no mesmo horário depois de dividir, para sem mudar nada.
- **TURMA-CA-07** [manual]: As telas de turmas, presença e agenda funcionam no celular e no computador, em português.

## Efeito em outras etapas

Critérios das Etapas 1, 2, 11 e 14 que falam do professor (o professor vê só as turmas dele, o menu do professor, a aula dele em destaque na agenda) ganham a marca `[removido]` com o critério que os substitui ao lado.

## Fora do escopo

- Cadastro de professores como pessoas (sem login) ou escala de quem dá cada aula.
- Turma com mais de um dia.

## Decisões registradas

- 16/10/2026, respostas do dono: tirar o perfil Professor do sistema; admin e atendente marcam presença; a turma tem início e fim; turmas de vários dias são divididas na migração, com alunos e presenças.
