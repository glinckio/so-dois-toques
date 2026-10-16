# Etapa 15: Cadastro de aluno mais simples

**Status:** implementada

## Objetivo

No cadastro de aluno, a data de nascimento e o contato de emergência deixam de ser obrigatórios. Nome, telefone e consentimento continuam obrigatórios.

## Por quê

Em 16/10/2026 o dono pediu: "Em novo aluno, não precisa ser obrigatório o contato de emergência e não precisa ser obrigatória a data de nascimento". Na hora de matricular, nem sempre se tem esses dados, e o cadastro travava.

## Regras

- **Data de nascimento:** opcional. Se informada, continua tendo que existir, não pode ser futura nem antes de 1900.
- **Menores de idade:** com a data informada e menos de 18 anos, o responsável (nome e telefone) continua obrigatório e o consentimento fica como dado pelo responsável. Sem a data, não dá para saber a idade: o responsável fica opcional e o consentimento é registrado como dado pelo aluno.
- **Contato de emergência:** opcional. Se preencher, informe nome e telefone; só um dos dois é recusado, para não guardar contato que não serve.
- Vale para o cadastro novo e para a alteração do aluno.
- O banco já aceitava esses campos vazios: não há migração.

## Critérios de aceite

- **ALU-CA-01**: Aluno sem data de nascimento é cadastrado e alterado; sem a data, o responsável não é exigido; com a data, ela continua validada e o menor de 18 anos continua exigindo responsável.
- **ALU-CA-02**: Aluno sem contato de emergência é cadastrado; contato só com nome ou só com telefone é recusado com "Informe o nome e o telefone do contato de emergência, ou deixe os dois em branco."
- **ALU-CA-03** [manual]: No formulário de aluno, a data de nascimento e o contato de emergência aparecem como opcionais.

## Efeito em outras etapas

O critério AULAS-CA-01 da Etapa 2 continua valendo: o cadastro completo segue funcionando; os dois campos só deixam de ser exigidos.

## Fora do escopo

- Tornar o telefone do aluno opcional.
