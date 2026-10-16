# Etapa 19: Feedback dos alunos

**Status:** aprovada

## Objetivo

Saber o que os alunos estão achando das aulas e o que pode melhorar. A escola ganha um **link aberto** com um formulário curto, que qualquer aluno responde pelo celular sem login, e o administrador vê as respostas, a nota média e a evolução no sistema.

## Por quê

Em 16/10/2026 o dono pediu "uma tela para feedback dos alunos para saber o que estão achando das aulas, se tem algum ponto de melhoria". Os alunos não têm login no sistema; o dono escolheu um link único da escola, que pode ser divulgado no grupo do WhatsApp, no Instagram ou impresso na quadra.

## Formulário (página pública)

- Endereço fixo `https://<sistema>/avaliar`, aberto sem login, no celular e no computador, em português, com o nome e a identidade visual da escola.
- Perguntas:
  - **Nota das aulas** de 1 a 5 (obrigatória), em estrelas.
  - **O que você está achando das aulas?** (opcional, até 1.000 caracteres).
  - **O que podemos melhorar?** (opcional, até 1.000 caracteres).
  - **Qual turma você faz?** (opcional): lista das turmas ativas por dia, horário e nível, mais "Prefiro não dizer".
  - **Seu nome** (opcional, até 120 caracteres). Em branco, a resposta é **anônima**.
- Aviso na página: "Seu nome é opcional. Se preferir, responda sem se identificar." e para que a resposta é usada.
- Depois de enviar, a página agradece e não mostra a resposta de outras pessoas.
- O administrador pode **pausar** o formulário; pausado, a página mostra "No momento não estamos recebendo respostas." e a API recusa novas respostas.

## Proteção contra abuso

- No máximo **5 respostas por hora** do mesmo IP; acima disso, "Muitas respostas em pouco tempo. Tente de novo mais tarde.".
- Campo escondido (armadilha para robôs): resposta com ele preenchido é descartada sem aviso.
- Textos são guardados como texto puro (sem HTML) e exibidos escapados.
- O IP serve só para o limite acima: não fica guardado na resposta.

## Painel (no sistema)

- Nova área **Feedback** no menu, só do administrador.
- Topo: **nota média** do período, quantidade de respostas e a distribuição das notas (quantas de 1 a 5); e a média dos últimos 12 meses mês a mês.
- Filtros: período (padrão: últimos 30 dias), turma e nota.
- Lista das respostas, da mais nova para a mais antiga: data e hora, nota, os dois textos, turma (se informada) e nome (ou "Anônimo").
- Respostas novas aparecem marcadas como **não lidas**; o administrador marca como lida (uma ou todas). O Início do administrador mostra quantas não lidas há.
- **Remover** uma resposta (spam ou ofensa) pede confirmação e fica na auditoria; ela some do painel e das médias.
- O painel mostra o link do formulário com o botão **Copiar link** e o botão **Pausar / Retomar**.

## Quem faz o quê

| Ação                                        | Administrador | Atendente | Público |
| ------------------------------------------- | ------------- | --------- | ------- |
| Responder o formulário                      | Sim           | Sim       | Sim     |
| Ver respostas, médias e o link              | Sim           | Não       | Não     |
| Marcar como lida, remover, pausar e retomar | Sim           | Não       | Não     |

## Critérios de aceite

- **FEED-CA-01**: Sem login, a pessoa envia nota de 1 a 5 com os textos, a turma e o nome opcionais; nota fora de 1 a 5, texto acima do limite ou turma inexistente são recusados; resposta sem nome fica anônima.
- **FEED-CA-02**: A página pública lista só as turmas ativas (dia, horário e nível) e não mostra respostas nem dados de alunos.
- **FEED-CA-03**: O sexto envio do mesmo IP dentro de uma hora é recusado; resposta com o campo armadilha preenchido é descartada; o IP não fica guardado na resposta.
- **FEED-CA-04**: Com o formulário pausado, a página avisa e a API recusa respostas; ao retomar, volta a aceitar.
- **FEED-CA-05**: O painel mostra a nota média, a quantidade e a distribuição das notas do período, e a média mês a mês dos últimos 12 meses, com filtros de período, turma e nota.
- **FEED-CA-06**: Resposta nova chega como não lida; o administrador marca uma ou todas como lidas; o Início mostra a quantidade de não lidas.
- **FEED-CA-07**: O administrador remove uma resposta com confirmação: ela sai do painel e das médias, e a remoção fica na auditoria com autor, data e IP; pausar e retomar também ficam na auditoria.
- **FEED-CA-08**: O atendente não vê a área Feedback nem consegue ler, marcar, remover ou pausar, pela tela e pela API.
- **FEED-CA-09** [manual]: O formulário e o painel funcionam no celular e no computador, em português, e textos com HTML aparecem como texto.

## Fora do escopo

- Link individual por aluno, lembrete automático e envio do link pelo chat do WhatsApp (pode vir depois da Etapa 20).
- Perguntas configuráveis pelo administrador e pesquisa por professor (a Etapa 16 tirou o professor da turma).
- Responder ao aluno pelo sistema.
- CAPTCHA.

## Decisões registradas

- 16/10/2026, respostas do dono: o aluno responde por um **link aberto da escola**, sem login.
- Padrões propostos nesta spec (o dono pode mudar na aprovação): só o administrador vê as respostas; nome opcional (anônimo por padrão); turma opcional; limite de 5 respostas por hora por IP; remover resposta é permitido (não é lançamento financeiro).
