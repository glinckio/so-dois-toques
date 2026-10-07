# Etapa 9: Revisão de segurança final

Revisão feita em 07/10/2026 sobre a `main` com as Etapas 0 a 8, antes da versão 1.0.0, lendo o código da API e do site contra as specs.

## Resultado

Nenhuma pendência alta. Três achados (dois médios, um baixo), todos corrigidos nesta etapa.

| #   | Severidade | Achado                                                                                                                                                                                                                                                                  | Correção                                                                                                                                                              | Teste                                                              |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | Média      | O site pegava o **primeiro** IP do `X-Forwarded-For`, que o visitante pode inventar. Atrás de um proxy que acrescenta ao cabeçalho (Render, Railway), dava para trocar de IP a cada tentativa e escapar do limite de 20 erros por IP. Sem IP, a API pulava esse limite. | O site usa o IP que o proxy da hospedagem acrescentou (`IP_SALTOS_CONFIAVEIS`, padrão 1). Sem IP, as tentativas contam juntas num só grupo, e o limite vale para ele. | `acesso.test.ts` (web), ACESSO-CA-04 em `acesso-login.e2e-spec.ts` |
| 2   | Média      | Em produção, a API e o site aceitavam a chave interna do `.env.example`. Com a API exposta na internet, quem conhecesse o repositório falaria direto com ela.                                                                                                           | Em produção, os dois se recusam a subir com a chave de exemplo; a API também exige `WEB_ORIGIN` com https.                                                            | LANC-CA-01 e 02                                                    |
| 3   | Baixa      | Tentativas de login simultâneas para o mesmo e-mail liam a contagem de erros antes de qualquer uma ser gravada, passando de 5 tentativas antes do bloqueio.                                                                                                             | Uma trava do banco (`pg_advisory_xact_lock`) por e-mail faz as tentativas passarem uma de cada vez.                                                                   | ACESSO-CA-03 em `acesso-login.e2e-spec.ts`                         |

Achado extra desta etapa: o rótulo da ação de auditoria "exportação do Contábil" faltava na tela de Auditoria; foi incluído.

## O que foi conferido e está certo

- Guardas globais na ordem chave interna → sessão → perfil; a chave é comparada em tempo constante. Só `GET /health` dispensa a chave e só `POST /auth/login` dispensa a sessão, agora verificado por teste que percorre todas as rotas (LANC-CA-03).
- Rotas só do administrador: todos os estornos (caixa, venda, compra, mensalidade, reserva, custos), ajuste de estoque, produtos, faixas, quadras, planos, custos, exportação e anonimização de aluno, e as áreas Contábil, Usuários e Auditoria.
- Horários: bloqueios e cancelamento com menos de 24 horas só pelo administrador, checados no servidor.
- Professor vê só as próprias turmas e alunos; tentativa fora disso é negada e auditada.
- Toda entrada (corpo, consulta e parâmetro) passa por Zod ou validação de UUID; dinheiro em centavos inteiros.
- Livro-razão: nenhum `update` ou `delete` em lançamentos no código, e gatilhos do banco impedem alteração e exclusão em lançamentos, auditoria, movimentos de estoque e turnos fechados.
- Senhas com Argon2id (19 MiB, t=2, p=1); tempo de resposta igual para e-mail inexistente; token de sessão de 32 bytes guardado só como hash; sessões encerradas ao trocar ou redefinir a senha e ao inativar o usuário.
- Cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção; sem redirecionamento aberto no login.
- Telas protegidas pelo layout de cada área; as rotas de download validam o id e dependem da API.
- CSP com nonce por requisição e `strict-dynamic`, sem `unsafe-inline` em produção; HSTS, `X-Frame-Options: DENY`, `nosniff`; Helmet na API.
- Planilha CSV protegida contra fórmulas (`= + - @`, tab e retorno).
- Nenhum segredo no repositório; erros de configuração citam só o nome da variável; nenhum `dangerouslySetInnerHTML`.
- Dependências: `pnpm audit --prod` sem vulnerabilidade alta e CodeQL verde no CI.
