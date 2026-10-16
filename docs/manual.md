# Manual de uso

Guia curto do sistema Só Dois Toques, versão 1.0.0. Funciona no navegador do celular e do computador; não precisa instalar nada.

## Entrar

1. Abra o endereço do sistema e entre com e-mail e senha.
2. No primeiro acesso (ou depois que o administrador redefinir sua senha), o sistema pede uma senha nova com pelo menos 10 caracteres.
3. Errou a senha 5 vezes seguidas? O e-mail fica bloqueado por 15 minutos.
4. A sessão termina depois de 12 horas sem uso ou 7 dias no total. Use **Sair** em computador compartilhado.

## O que cada perfil vê

| Tela                 | Administrador | Atendente                             |
| -------------------- | ------------- | ------------------------------------- |
| Início               | Sim           | Sim                                   |
| Aulas                | Tudo          | Ver turmas e alunos e marcar presença |
| Mensalidades         | Tudo          | Ver e receber, sem estornos           |
| Horários             | Tudo          | Ver a agenda de cada quadra           |
| Chat                 | Tudo          | Conversar (sem conectar o número)     |
| Contábil e gastos    | Sim           | Não                                   |
| Feedback             | Sim           | Não                                   |
| Usuários e Auditoria | Sim           | Não                                   |

## Aulas

- **Turmas:** cada turma é um horário fixo da semana numa quadra: a quadra, um dia, o início e o fim, o nível, a categoria (masculino, misto ou feminino) e as vagas. Não tem nome nem professor; aparece como "Terça, 19:00 às 20:00 · Iniciante · Misto". Quem treina duas vezes por semana é matriculado em duas turmas. Duas turmas ativas não podem ter aula no mesmo horário na mesma quadra. Abra a turma para matricular alunos (respeitando as vagas) e para a **presença**.
- **Presença (administrador e atendente):** abra a turma → Presença, escolha a data da aula e marque presente ou ausente. Dá para corrigir depois.
- **Alunos (administrador):** cadastro com nome, telefone e consentimento obrigatórios; data de nascimento e contato de emergência são opcionais. Com a data informada, menor de 18 anos exige responsável. A busca acha por parte do nome (sem acento) ou do telefone. Na ficha do aluno ficam o plano, a exportação de dados e a anonimização (ver [LGPD](lgpd.md)).
- **Planos:** valor mensal por quantidade de aulas na semana. Na ficha do aluno, escolha o plano, o dia de vencimento e um desconto, se houver.

## Mensalidades

- **Mensalidades:** as do mês são geradas sozinhas. Abra uma para registrar o pagamento (Pix, dinheiro, cartão de débito ou de crédito); o recibo sai na hora.
- **Inadimplentes:** quem está com mensalidade vencida.
- Nada é apagado: um pagamento errado se corrige com **estorno**, que só o administrador faz.

## Horários

- **Agenda:** uma quadra por vez, dia a dia, das 05h às 24h; com mais de uma quadra ativa, escolha a quadra no topo. As aulas aparecem sozinhas, pelos horários das turmas.
- **Bloquear horário (administrador):** fecha uma quadra num dia ou toda semana (até 26 semanas), com motivo, por exemplo manutenção ou evento. Horário com aula de turma não pode ser bloqueado. Na agenda, toque numa hora livre para bloquear.
- **Bloqueio:** abra o bloqueio na agenda para liberar o horário (com motivo), se ainda não começou.
- **Bloqueios semanais:** os que se repetem; encerrar libera as datas que ainda não começaram.
- **Quadras (administrador):** cadastre as quadras alugadas pelo nome, mude o nome ou desative a que deixou de usar. Quadra desativada não recebe turma, contrato nem locação nova; o histórico dela fica.

## Chat

- **Conectar o número (administrador):** Chat → **Conexão do número** → **Conectar pelo QR code**. No celular da escola, abra o WhatsApp → Aparelhos conectados → Conectar um aparelho e leia o código. Para tirar o número do sistema, **Desconectar o número**.
- **Conversas:** a lista mostra as conversas do WhatsApp da escola (grupos ficam de fora), da mais recente para a mais antiga, com as não lidas em verde. Quando o número é de um aluno cadastrado, aparece o nome do aluno e o botão **Ficha do aluno**. Busque por nome ou número. **Nova conversa** abre uma janela: escolha um aluno, um contato salvo ou um contato do WhatsApp (com busca), ou use **Adicionar contato** para salvar nome e número na hora (o sistema avisa se o número não tem WhatsApp). O Chat ocupa a tela toda; o administrador abre a conexão pelo ícone do WhatsApp ao lado de Nova conversa. Na ficha do aluno, **Conversar no sistema** abre a conversa direto.
- **Mandar:** escreva e aperte Enter (Shift+Enter quebra a linha); 😊 abre os emojis; 📎 anexa foto, vídeo, documento ou áudio (até 10 MB, com legenda); 🌟 manda uma imagem como figurinha; o microfone grava um áudio de voz. Para **responder** ou **reagir**, use os três pontinhos ao lado da mensagem; uma figurinha recebida dá para enviar de volta.
- Cada mensagem enviada pelo sistema mostra quem da equipe mandou, a hora e se foi entregue (✓✓) e lida (✓✓ azul). Se o envio falhar, aparece **Tentar de novo**.
- As mensagens novas chegam sozinhas; o ponto verde ao lado de "Conversas" indica que está ao vivo (areia: atualizando a cada poucos segundos).

## Contábil (administrador)

- **Painel:** escolha o mês ou um período. Mostra o **saldo em caixa** (hoje), as mensalidades recebidas, os estornos, os gastos, o resultado (recebido menos estornos e gastos), o que há a receber (mensalidades vencidas), as saídas por tipo, os totais por forma de pagamento, a conferência com os lançamentos e os últimos 12 meses. **Baixar lançamentos (CSV)** gera a planilha para o contador.
- **Saldo em caixa:** começou com R$ 600,00 em 16/10/2026 (o que sobrou até ali) e sobe ou desce com tudo o que entra e sai a partir dessa data. O saldo inicial não conta como receita do mês.
- **Gastos:** lance a **locação avulsa** de quadra (quadra, dia, valor e forma) e os **outros gastos** (equipamento, investimento ou outro, com descrição). A data é hoje ou antes. Lançamento errado não se apaga: abra-o na lista de saídas e **estorne** com motivo; o valor volta para o caixa.
- **Aluguel mensal:** registre o horário fixo pago por mês (quadra, dia, início e fim, valor, dia do pagamento de 1 a 28, forma e o primeiro mês). Todo mês, no dia do pagamento, o aluguel sai do caixa sozinho, uma vez só. Se o dia do pagamento do primeiro mês já passou, ele sai no dia do registro. Para mudar o valor, encerre o contrato a partir de um mês e registre outro.

## Feedback (administrador)

- **Link do formulário:** em Feedback, copie o link (termina em `/avaliar`) e mande para os alunos, no grupo da turma ou no Instagram. O formulário abre sem login: nota de 1 a 5 em estrelas, o que estão achando, o que pode melhorar, a turma e o nome, todos opcionais menos a nota. Sem nome, a resposta é anônima.
- **Painel:** nota média, quantidade e distribuição das notas do período (padrão: últimos 30 dias), a média de cada mês e a lista das respostas. Filtre por período, turma e nota. Respostas novas aparecem como **Nova**; marque como lida uma por uma ou todas de uma vez. O Início avisa quando há respostas não lidas.
- **Remover:** spam ou ofensa pode ser removido (fica na auditoria, sem o texto). **Pausar** fecha o formulário até você retomar.
- Cada aparelho envia até 5 respostas por hora.

## Usuários e Auditoria (administrador)

- **Usuários:** cadastre a equipe com o perfil certo. O sistema mostra uma senha temporária uma única vez; a pessoa troca no primeiro acesso. Inativar encerra as sessões da pessoa.
- **Auditoria:** quem fez o quê, quando e de qual IP. Filtre por pessoa, ação ou período.
