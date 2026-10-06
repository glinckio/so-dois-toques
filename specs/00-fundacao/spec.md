# Etapa 0: Fundação

**Status:** implementada

## Objetivo

Criar a base técnica do sistema Só Dois Toques para que todas as etapas seguintes sejam desenvolvidas com segurança, testes automáticos e revisão por PR. Esta etapa não entrega nenhuma tela de negócio; entrega o "chão" onde as telas serão construídas.

## Por quê

O sistema vai guardar dados de alunos (LGPD) e dinheiro (mensalidades, caixa). Erros nessas áreas custam caro, então a proteção precisa existir antes da primeira funcionalidade, e não depois.

## Histórias de usuário

- Como dono do negócio, quero que nenhuma mudança entre no sistema sem passar por testes automáticos, para não descobrir erros na frente do cliente.
- Como dono do negócio, quero que cada regra combinada numa spec tenha um teste que a comprove, para ter certeza de que o sistema faz o que foi pedido.
- Como usuário, quero abrir o sistema no celular ou no computador, em português.

## Critérios de aceite

- **FUND-CA-01**: Dado que alguém acessa o endereço do sistema, quando a página inicial carrega no celular ou no computador, então ela aparece em português (`lang="pt-BR"`), com o nome "Só Dois Toques" e os módulos previstos (Aulas, Horários, Estoque, Contábil), sem erros no navegador.
- **FUND-CA-02**: Dado qualquer acesso a uma página, então a resposta traz cabeçalhos de segurança: Content-Security-Policy com nonce novo a cada requisição, HSTS, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, política de referência e de permissões, e não revela a tecnologia do servidor (`X-Powered-By`).
- **FUND-CA-03**: Dado que uma variável de ambiente obrigatória está ausente ou inválida, quando o sistema inicia, então ele recusa iniciar e a mensagem cita o nome da variável, nunca o valor.
- **FUND-CA-04**: Dado o endereço `/api/health`, então ele informa se o banco de dados está acessível, sem cache e sem expor mensagens de erro, endereço ou usuário do banco.
- **FUND-CA-05**: Dado um critério de aceite em qualquer spec do repositório, quando o CI roda, então ele falha se o critério não aparecer em nenhum teste. A exigência vale para specs com status `implementada` (ou sem status); specs em `rascunho` ou `aprovada` ainda não têm código. Critérios marcados com `[manual]` são verificados na revisão.
- **FUND-CA-06** [manual]: Dado um PR para a `main`, então o merge só é possível com todas as verificações do CI verdes e aprovação do dono do repositório; push direto na `main` é bloqueado.

## Fora do escopo

- Login e perfis de usuário (Etapa 1).
- Qualquer tabela de negócio no banco (a partir da Etapa 1).
- Deploy em produção (marco v0.1).
