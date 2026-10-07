# Etapa 9: Lançamento (v1.0.0)

**Status:** implementada

## Objetivo

Deixar o sistema pronto para uso real com todas as telas: configuração de produção que não aceita valores de exemplo, cópia de segurança do banco com restauração testada, retenção dos dados de clientes das quadras, documentação de LGPD, manual curto de uso e guia de implantação.

## Por quê

As Etapas 0 a 8 entregaram as telas. Antes de colocar dinheiro e dados pessoais de verdade no sistema, o dono precisa saber que: um erro de configuração na hospedagem é barrado na subida, e não descoberto depois; um backup existe e volta de fato; nenhuma rota nova da API escapa da checagem de permissão; e os dados pessoais têm regra de guarda e descarte.

## Quem faz o quê

| Ação                                        | Administrador                | Atendente | Professor |
| ------------------------------------------- | ---------------------------- | --------- | --------- |
| Anonimizar clientes de reservas antigas     | Sim                          | Não       | Não       |
| Fazer e restaurar backup (linha de comando) | Quem administra a hospedagem |           |           |

## Histórias de usuário

- Como dono, quero que o sistema se recuse a subir em produção com a chave de exemplo, para não ficar exposto por esquecimento.
- Como dono, quero um comando que faça a cópia do banco e outro que a restaure num banco novo, com uma conferência que mostre que os números batem.
- Como administrador, quero apagar nome e telefone de quem alugou quadra há mais de um ano, mantendo os valores para o Contábil.
- Como equipe, quero um manual curto de cada tela, por perfil.

## Regras de negócio

### Produção

- Com `NODE_ENV=production`, a API não sobe se a `INTERNAL_API_KEY` for a de exemplo (contém "troque-por") ou se o `WEB_ORIGIN` não for `https://` (fora `localhost` e `127.0.0.1`, para teste local). O erro cita só o nome da variável.
- O web, em produção, também recusa a chave de exemplo.

### Rotas da API

- Só `GET /health` responde sem a chave interna; só `POST /auth/login` responde sem sessão.
- Toda rota com sessão declara a área do sistema que exige, menos as da própria conta (sair, quem sou eu, trocar a senha, consultar acesso a uma área).
- As duas listas acima são fixas num teste: rota nova fora delas faz o CI falhar.

### Backup e restauração

- `pnpm db:backup` grava uma cópia completa do banco de `DATABASE_URL` em `backups/so_dois_toques-AAAA-MM-DD-HHMM.dump` (formato do `pg_dump`, horário de São Paulo). A senha do banco não vai na linha de comando do `pg_dump` nem aparece na saída.
- `pnpm db:restaurar <arquivo> <banco>` cria o banco de destino no mesmo servidor (se não existir) e restaura a cópia nele. Recusa restaurar num banco que já tem tabelas, e recusa como destino o próprio banco de `DATABASE_URL`.
- No fim, mostra a conferência do banco restaurado: usuários, alunos, lançamentos, total de entradas e de saídas em centavos e registros de auditoria. `pnpm db:backup` mostra a mesma conferência do banco copiado, para comparar.

### Retenção dos dados de clientes das quadras

- Reserva avulsa ou fixa guarda nome e telefone do cliente só para o atendimento. Depois de 12 meses da data da reserva (ou do fim da série, nas fixas), o administrador pode anonimizá-los: o nome vira "Cliente anonimizado" e o telefone é apagado.
- Valor, horário, quadra, pagamentos e lançamentos continuam iguais, para o Contábil e o Caixa.
- A tela mostra antes quantas reservas e séries serão anonimizadas; a ação pede confirmação, não pode ser desfeita e fica na auditoria com as quantidades.

## Critérios de aceite

### Produção

- **LANC-CA-01**: Com `NODE_ENV=production`, a API recusa iniciar com a `INTERNAL_API_KEY` de exemplo ou com `WEB_ORIGIN` sem https (aceita `localhost` e `127.0.0.1`), e a mensagem cita o nome da variável, nunca o valor.
- **LANC-CA-02**: Em produção, o web recusa a `INTERNAL_API_KEY` de exemplo, citando só o nome da variável.
- **LANC-CA-03**: Todas as rotas da API, listadas pelo próprio Nest, exigem chave interna e sessão, exceto `GET /health` (sem chave) e `POST /auth/login` (sem sessão); toda rota com sessão declara uma área, exceto as quatro da própria conta.

### Backup

- **LANC-CA-04**: O backup gera o arquivo com o nome no horário de São Paulo, sem a senha nos argumentos do `pg_dump`, e mostra a conferência do banco copiado.
- **LANC-CA-05**: A restauração num banco novo mostra uma conferência igual à do banco de origem (usuários, alunos, lançamentos, entradas, saídas, auditoria).
- **LANC-CA-06**: A restauração recusa um banco de destino que já tem tabelas e recusa o próprio banco de `DATABASE_URL`, sem mexer em nada.

### Retenção

- **LANC-CA-07**: O administrador anonimiza os clientes das reservas e séries terminadas há mais de 12 meses: nome "Cliente anonimizado" e telefone vazio; valores, pagamentos e lançamentos não mudam; reservas mais novas não mudam; a ação fica na auditoria com as quantidades.
- **LANC-CA-08**: Atendente e professor não conseguem ver a prévia nem anonimizar, pela tela nem pela API.

### Documentação e revisão

- **LANC-CA-09** [manual]: `docs/lgpd.md` lista cada dado pessoal guardado, para quê, por quanto tempo e como exportar ou anonimizar.
- **LANC-CA-10** [manual]: `docs/manual.md` explica, em poucas páginas, o uso de cada tela por perfil.
- **LANC-CA-11** [manual]: `docs/implantacao.md` guia a hospedagem, as variáveis, o domínio, o primeiro administrador, a rotina de backup e o teste de restauração; a revisão de segurança final (`specs/09-lancamento/revisao-seguranca.md`) não tem pendência alta.

## Fora do escopo

- Contratar hospedagem, configurar o domínio e criar a tag `v1.0.0`: dependem das contas do dono e da decisão dele.
- Monitoramento de erros com serviço externo (Sentry): o sistema não tem integrações externas; os logs da hospedagem cobrem por enquanto.
- Anonimização automática por agendamento: fica manual, por decisão do administrador.

## Decisões registradas

- Prazo de guarda dos clientes das quadras: 12 meses depois da reserva (padrão escolhido; o dono pode mudar).
- Backup pela linha de comando com `pg_dump`/`pg_restore`, que também servem para o backup diário da hospedagem; a hospedagem gerenciada deve manter o backup automático ligado.
- Sem Sentry nesta versão (ver Fora do escopo).
