# Etapa 18: Desconto de qualquer valor e aluno isento

**Status:** implementada

## Objetivo

O desconto da mensalidade passa a aceitar qualquer valor de R$ 0,00 até o valor inteiro do plano. Com o desconto igual ao plano, o aluno fica **isento**: continua com o plano (e as turmas), mas não recebe mensalidade.

## Por quê

Em 16/10/2026 o dono pediu: "libere para eu por o desconto da mensalidade o valor que eu quiser", e contou que uma aluna é especial e não paga mensalidade. Até aqui o desconto precisava ser menor que o plano, então não havia como registrar um aluno que não paga.

## Regras

- Desconto de R$ 0,00 até o valor do plano; acima do plano é recusado com "O desconto não pode passar do valor do plano.".
- Desconto continua exigindo motivo (por exemplo, "Aluna especial").
- Desconto igual ao plano: a mensalidade do mês fica em R$ 0,00 e a geração não cria mensalidade para esse aluno.
- A ficha do aluno mostra "Isento de mensalidade" quando o desconto cobre o plano inteiro.
- O banco já aceitava esses valores: não há migração.

## Critérios de aceite

- **DESC-CA-01**: O administrador define desconto de qualquer valor até o valor do plano, inclusive o plano inteiro; desconto maior que o plano é recusado.
- **DESC-CA-02**: Aluno com desconto igual ao plano não recebe mensalidade na geração do mês; os outros alunos recebem normalmente.
- **DESC-CA-03** [manual]: A ficha do aluno isento mostra "Isento de mensalidade" e o motivo.

## Efeito em outras etapas

O critério MENS-CA-02 da Etapa 3 dizia "desconto opcional menor que o valor do plano"; a partir desta etapa, o desconto vai até o valor do plano.
