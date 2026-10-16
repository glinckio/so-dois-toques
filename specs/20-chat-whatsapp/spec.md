# Etapa 20: Chat do WhatsApp no sistema

**Status:** aprovada

## Objetivo

Conversar com alunos e interessados pelo **WhatsApp da escola** dentro do sistema, sem precisar do celular: ver as conversas, receber e mandar texto, emojis, áudio, imagens, vídeos, documentos e figurinhas. O sistema passa a usar o microserviço do WhatsApp (Evolution API) que o dono já tinha pronto de outro projeto.

## Por quê

Em 16/10/2026 o dono pediu "uma tela de chat interno no sistema" para "mandar áudio, receber áudio, mandar imagens/vídeos, receber imagens/vídeos, mandar texto, figurinhas, emojis", usando o microserviço do Evolution que já funciona em outro projeto dele. Hoje toda a conversa com aluno acontece no celular de alguém, fora do sistema.

## Como o sistema se liga ao WhatsApp

- O **microserviço** do WhatsApp (`services/evolution`) entra no repositório como um serviço próprio, organizado como o resto do monorepo. Ele fala com o **servidor Evolution API** (self-hosted, `infra/evolution-api`), que é quem conecta ao WhatsApp.
- O servidor Evolution usa a versão oficial **v2.3.7 com a correção de LID** (contatos que aparecem como `@lid` passam a mostrar o número). A correção entra como um patch aplicado na imagem oficial, até ser aceita no projeto original.
- Caminho das chamadas: navegador → Next.js → API → microserviço → Evolution. O navegador nunca fala com o microserviço nem com o Evolution; a API usa a chave do microserviço, que não sai do servidor.
- Mensagens novas chegam pelo webhook do Evolution no microserviço, que só aceita o webhook com o token configurado, e seguem até a tela aberta sem recarregar.
- Um único número de WhatsApp da escola (uma instância).
- Sem o WhatsApp configurado (variáveis vazias), o sistema funciona normalmente e a área Chat mostra "WhatsApp não configurado".

## Conexão do número

- Tela **Chat > Conexão**, só do administrador: mostra o estado (conectado, desconectado, conectando) e o número conectado.
- **Conectar**: mostra o QR code para ler no WhatsApp do celular da escola (Aparelhos conectados), atualizando sozinho até conectar.
- **Desconectar**: pede confirmação e desliga o número do sistema.
- Conectar e desconectar ficam na auditoria.

## Conversas

- Lista de conversas individuais (grupos ficam de fora), da mais recente para a mais antiga, com foto, nome, trecho da última mensagem, horário e quantidade de não lidas.
- Se o número é de um **aluno cadastrado** (telefone igual, com DDD), a conversa mostra o nome do aluno e um link para a ficha; senão, o nome do contato no WhatsApp ou o número.
- Busca por nome ou número.
- **Nova conversa**: por número (com DDD) ou pelo botão **Conversar no WhatsApp** na ficha do aluno. Número que não tem WhatsApp é avisado antes de abrir.
- Mensagens novas aparecem na lista e na conversa aberta em até 5 segundos, sem recarregar; se a conexão em tempo real cair, a tela continua atualizando sozinha.

## Dentro da conversa

- Histórico com as mensagens mais recentes; ao subir, carrega as mais antigas.
- Cada mensagem mostra o horário (America/Sao_Paulo) e, nas enviadas, se foi entregue e lida. As enviadas pelo sistema mostram **quem da equipe enviou**.
- Abrir a conversa marca as mensagens como lidas.
- **Receber**: texto (com emojis e links), imagem, vídeo, áudio (tocar no navegador), documento (baixar), figurinha (inclusive animada), localização e contato (como texto), reação nas mensagens. Tipo que o sistema não mostra aparece como "Mensagem não suportada: abra no celular".
- **Enviar**:
  - texto com seletor de emojis (até 4.000 caracteres);
  - **áudio gravado no navegador** (botão segurar/gravar, cancelar e enviar), que chega como mensagem de voz;
  - imagem e vídeo com legenda opcional;
  - documento (PDF e outros);
  - **figurinha** a partir de uma imagem (PNG, JPG ou WebP) ou reenviando uma figurinha recebida;
  - reação com emoji numa mensagem;
  - responder citando uma mensagem.
- Arquivos de até **10 MB**; maior que isso é recusado com aviso antes de enviar. Tipos aceitos: imagem (JPG, PNG, WebP), vídeo (MP4), áudio (gravação do navegador, OGG, MP3, M4A) e documento (PDF, DOC/DOCX, XLS/XLSX, TXT).
- Falha no envio aparece na mensagem com **Tentar de novo**.
- Mídias recebidas só são baixadas por quem está logado e tem acesso ao Chat; nunca por endereço público.

## Quem faz o quê

| Ação                                      | Administrador | Atendente |
| ----------------------------------------- | ------------- | --------- |
| Ver conversas e mensagens                 | Sim           | Sim       |
| Enviar mensagens, mídias, figurinhas      | Sim           | Sim       |
| Conectar e desconectar o número (QR code) | Sim           | Não       |

## LGPD e segurança

- As conversas ficam no servidor Evolution da escola (self-hosted), não no banco do sistema. O banco do sistema guarda só quem da equipe enviou cada mensagem (identificador da mensagem, usuário e data).
- As chaves do microserviço, do Evolution e o token do webhook ficam só em variáveis de ambiente, nunca no repositório; o microserviço e o Evolution não ficam expostos na internet, só na rede interna.
- Os logs não registram conteúdo de mensagens nem mídias.
- Anonimizar um aluno (Etapa 2) não apaga a conversa do WhatsApp; a conversa continua no celular da escola, como hoje.

## Critérios de aceite

- **CHAT-CA-01**: O microserviço fica em `services/evolution`, dentro do monorepo (pnpm), sem `.env`, `dist`, projeto de exemplo nem cópias do Evolution; sobe com variáveis validadas e recusa iniciar sem a chave interna; o servidor Evolution sobe por `infra/evolution-api` na v2.3.7 com o patch de LID.
- **CHAT-CA-02**: O webhook do microserviço recusa chamada sem o token configurado; as rotas internas recusam chamada sem a chave interna.
- **CHAT-CA-03**: O administrador vê o estado da conexão, gera o QR code e desconecta o número com confirmação; conectar e desconectar ficam na auditoria; o atendente não consegue, pela tela e pela API.
- **CHAT-CA-04**: A lista mostra só conversas individuais, da mais recente para a mais antiga, com última mensagem, horário e não lidas; número igual ao telefone de um aluno mostra o nome e o link da ficha.
- **CHAT-CA-05**: A conversa carrega as mensagens mais recentes e, sob pedido, as mais antigas; abrir a conversa marca as mensagens como lidas.
- **CHAT-CA-06**: O sistema envia texto (até 4.000 caracteres, com emojis), imagem e vídeo com legenda, documento, áudio de voz, figurinha, reação e resposta citando mensagem; texto vazio, arquivo acima de 10 MB ou de tipo não aceito são recusados no servidor.
- **CHAT-CA-07**: Mensagens recebidas de texto, imagem, vídeo, áudio, documento, figurinha, localização, contato e reação aparecem com o tipo certo; tipo desconhecido aparece como "Mensagem não suportada".
- **CHAT-CA-08**: Mensagem recebida aparece na lista e na conversa aberta em até 5 segundos sem recarregar; sem a conexão em tempo real, a tela atualiza sozinha.
- **CHAT-CA-09**: Cada mensagem enviada pelo sistema guarda e mostra quem da equipe enviou.
- **CHAT-CA-10**: Mídia recebida só é entregue a usuário logado com acesso ao Chat; sem sessão, é recusada.
- **CHAT-CA-11**: Nova conversa por número com DDD ou pela ficha do aluno; número sem WhatsApp é avisado.
- **CHAT-CA-12**: Sem o WhatsApp configurado, a API e o web sobem normalmente e o Chat mostra "WhatsApp não configurado".
- **CHAT-CA-13** [manual]: Com um número real conectado, enviar e receber texto, emoji, áudio, imagem, vídeo, documento e figurinha funciona no celular e no computador.

## Fora do escopo

- Grupos, status/stories, enquetes, listas e botões (o microserviço tem, mas o Chat não usa agora).
- Mais de um número de WhatsApp.
- Atribuir conversa a um atendente, etiquetas, respostas rápidas e mensagens automáticas.
- Envio em massa e cobrança de mensalidade pelo WhatsApp.
- Apagar ou editar mensagem enviada.

## Decisões registradas

- 16/10/2026, respostas do dono: administrador e atendente usam o chat, só o administrador conecta o número; o chat fala com qualquer número (não só alunos); o fix de LID entra como patch sobre a v2.3.7 oficial.
- Padrões propostos nesta spec (o dono pode mudar na aprovação): um número só; grupos de fora; arquivos até 10 MB; as conversas ficam no Evolution e o banco do sistema guarda só o autor de cada envio.
