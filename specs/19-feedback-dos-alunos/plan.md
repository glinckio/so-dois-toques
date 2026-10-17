# Etapa 19: Plano técnico

## Banco (migration `20261017120000_feedback`)

- `RespostaFeedback`: nota (1 a 5), comentário e melhoria (até 1.000), turma (opcional, `SET NULL`), nome (opcional, até 120), `lidaEm` e `criadaEm`. Índice por `criadaEm`.
- `EnvioFeedback`: só o hash do IP (HMAC-SHA256 com a chave interna) e a data, para o limite de 5 por hora. Envios com mais de 1 hora são apagados a cada novo envio. Não tem ligação com a resposta.
- `FormularioFeedback`: uma linha só (`id = 1`) com `pausado`, criada pela migration.
- Remover resposta é `DELETE` (não é lançamento financeiro); a auditoria guarda a nota e a data, não o texto.

## Regras puras (`apps/api/src/feedback/regras.ts`)

- `limiteAtingido(enviosNaHora)`: 5 por hora.
- `textoOpcional(texto)`: tira espaços e caracteres de controle; vazio vira `null`.
- `resumoDasNotas(notas)`: quantidade, média (uma casa) e distribuição de 1 a 5.
- `mediasMensais(respostas, meses)`: média e quantidade por mês (São Paulo).

## API

- `FeedbackPublicoController` (`@Publico`, só com a chave interna): `GET /feedback/formulario` (pausado e turmas ativas) e `POST /feedback/respostas`.
- `FeedbackController` (`@ExigeArea("feedback")`, área só do administrador): `GET /feedback/painel`, `GET /feedback/nao-lidas`, `POST /feedback/respostas/:id/lida`, `POST /feedback/respostas/lidas`, `DELETE /feedback/respostas/:id`, `POST /feedback/formulario` (pausar e retomar).
- Nova área `feedback` só no perfil Administrador. Auditoria: `FEEDBACK_REMOVIDO`, `FEEDBACK_PAUSADO`, `FEEDBACK_RETOMADO`.

## Web

- `/avaliar`: página pública (fora do grupo `(sistema)`), na lista de rotas sem sessão do `proxy.ts`. Server Action chama a API sem sessão.
- `/feedback`: painel com filtros, médias, distribuição, média mensal, lista, marcar como lida, remover com confirmação, copiar link e pausar/retomar.
- Menu: Feedback no grupo Gestão. Início do administrador: cartão com as respostas não lidas.

## Testes

- Unidade: regras do feedback e áreas.
- Integração: FEED-CA-01 a 08.
- Ponta a ponta: responder o formulário sem login e ver a resposta no painel.
