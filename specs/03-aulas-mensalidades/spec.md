# Etapa 3: Mensalidades e núcleo do Caixa

**Status:** aprovada

## Objetivo

Saber, a cada mês, quanto cada aluno deve, quem já pagou e quem está atrasado, e fazer todo pagamento de mensalidade entrar no Caixa como um lançamento que nunca é apagado.

## Por quê

As aulas são a receita de hoje. Sem controle de mensalidades, o atraso só aparece quando alguém lembra de olhar o caderno. Esta etapa também cria o livro-razão do Caixa, que as etapas de Caixa, Estoque, Horários e Contábil vão usar: todo dinheiro que entra ou sai vira um lançamento imutável, e um erro se corrige com estorno.

## Quem faz o quê

| Ação                                                          | Administrador | Atendente | Professor |
| ------------------------------------------------------------- | ------------- | --------- | --------- |
| Cadastrar e alterar planos                                    | Sim           | Não       | Não       |
| Definir o plano, o dia de vencimento e o desconto de um aluno | Sim           | Não       | Não       |
| Gerar as mensalidades do mês                                  | Sim           | Não       | Não       |
| Ver mensalidades e inadimplentes                              | Sim           | Sim       | Não       |
| Registrar pagamento e emitir recibo                           | Sim           | Sim       | Não       |
| Estornar pagamento e cancelar mensalidade                     | Sim           | Não       | Não       |
| Ver os lançamentos do Caixa                                   | Sim           | Sim       | Não       |

As mensalidades ficam na área Caixa (Administrador e Atendente), porque é no balcão que o pagamento é recebido. Os planos e a assinatura de cada aluno ficam em Aulas (Administrador). A checagem vale na API; as telas só escondem o que o perfil não pode usar.

## Histórias de usuário

- Como administrador, quero cadastrar os planos (1x, 2x, 3x por semana) com o valor de cada um.
- Como administrador, quero dizer em que plano cada aluno está, com o dia de vencimento e um desconto, se houver.
- Como administrador, quero que as mensalidades do mês apareçam sozinhas, sem digitar uma por uma.
- Como atendente, quero achar a mensalidade de um aluno, registrar o pagamento em Pix, dinheiro ou cartão e entregar um recibo.
- Como administrador, quero ver quem está atrasado, há quantos dias e quanto deve.
- Como administrador, quero desfazer um pagamento registrado errado sem apagar o histórico.

## Regras de negócio

### Planos

- Plano tem nome (único), aulas por semana (1 a 7), valor mensal em reais (guardado em centavos, de R$ 1,00 a R$ 10.000,00) e situação (ativo ou inativo). Plano inativo não recebe aluno novo.
- Mudar o valor de um plano vale para as mensalidades geradas depois; as já geradas não mudam.

### Plano do aluno (assinatura)

- Um aluno ativo tem no máximo um plano vigente. A assinatura guarda o plano, o dia de vencimento (1 a 28, para existir em todos os meses), um desconto mensal opcional em reais (menor que o valor do plano) com motivo, e o mês de início.
- Trocar o plano, o dia ou o desconto encerra a assinatura vigente e abre outra a partir do mês informado; o histórico fica.
- Inativar ou anonimizar o aluno encerra a assinatura vigente. As mensalidades em aberto continuam devidas até serem pagas ou canceladas.

### Mensalidades

- Uma mensalidade é de um aluno em um mês (competência), com o valor do plano menos o desconto, congelado na geração, e o vencimento no dia escolhido daquele mês.
- O sistema gera as mensalidades do mês para todas as assinaturas vigentes nele. A geração roda sozinha todo dia (fica pronta no dia 1 de cada mês) e também pode ser pedida pelo administrador. Ela pode rodar várias vezes: nunca cria duas mensalidades do mesmo aluno no mesmo mês.
- Não há valor proporcional: o primeiro mês é cobrado inteiro (o administrador pode dar desconto ou cancelar, se combinar outra coisa).
- Situação: **em aberto** até o vencimento, **atrasada** a partir do dia seguinte ao vencimento, **paga** quando o pagamento é registrado, **cancelada** quando o administrador a cancela, com motivo.
- Não há multa nem juros nesta etapa.
- O pagamento é sempre do valor inteiro da mensalidade, com forma (Pix, dinheiro, cartão de débito ou de crédito) e data (hoje ou antes, nunca no futuro). Pagamento parcial não é aceito.
- Cada pagamento gera um recibo numerado em sequência, com aluno, mês, valor, forma, data e quem recebeu.
- Estornar um pagamento exige motivo: gera um lançamento de estorno no Caixa e a mensalidade volta a ficar em aberto (ou atrasada). O pagamento estornado continua no histórico, marcado como estornado.
- Mensalidade paga não pode ser cancelada sem antes estornar o pagamento.

### Caixa (livro-razão)

- Todo dinheiro que entra ou sai é um lançamento: tipo (entrada ou saída), valor em centavos (sempre positivo), forma, data, categoria, descrição, origem (por exemplo, a mensalidade) e quem lançou.
- Lançamentos nunca são alterados nem apagados, nem pela aplicação nem por consulta direta ao banco. Um erro se corrige com um lançamento de estorno, do tipo contrário e mesmo valor, ligado ao original; um lançamento só pode ser estornado uma vez.
- Nesta etapa só as mensalidades lançam no Caixa. A tela do Caixa mostra os lançamentos de um dia com o total por forma de pagamento. Abertura, fechamento e lançamentos avulsos ficam para a Etapa 5.

## Critérios de aceite

### Planos e assinaturas

- **MENS-CA-01**: O administrador cadastra um plano com nome, aulas por semana e valor; nome repetido, valor fora de R$ 1,00 a R$ 10.000,00 ou aulas fora de 1 a 7 são recusados.
- **MENS-CA-02**: O administrador define o plano de um aluno com dia de vencimento de 1 a 28 e desconto opcional menor que o valor do plano; plano inativo, aluno inativo, dia fora da faixa ou desconto sem motivo são recusados.
- **MENS-CA-03**: Trocar o plano de um aluno encerra a assinatura anterior e abre a nova a partir do mês informado; o aluno nunca fica com duas assinaturas vigentes.
- **MENS-CA-04**: Inativar ou anonimizar o aluno encerra a assinatura vigente, e ele não recebe mensalidade nos meses seguintes.

### Geração

- **MENS-CA-05**: Gerar as mensalidades de um mês cria uma para cada assinatura vigente, com o valor do plano menos o desconto e o vencimento no dia escolhido; gerar de novo não duplica nenhuma, mesmo com duas gerações ao mesmo tempo.
- **MENS-CA-06**: Mudar o valor do plano não altera as mensalidades já geradas.
- **MENS-CA-07**: A geração automática diária cria as mensalidades do mês corrente no horário de São Paulo.

### Situação e pagamento

- **MENS-CA-08**: A mensalidade fica em aberto até o dia do vencimento e aparece como atrasada a partir do dia seguinte, no calendário de São Paulo.
- **MENS-CA-09**: Registrar o pagamento com forma e data marca a mensalidade como paga e cria, na mesma transação, um lançamento de entrada no Caixa com o mesmo valor, a mesma forma e a mesma data.
- **MENS-CA-10**: Pagamento com data futura, de mensalidade já paga ou cancelada, ou registrado duas vezes ao mesmo tempo é recusado; só um lançamento é criado.
- **MENS-CA-11**: Cada pagamento tem um recibo com número sequencial, aluno, mês, valor, forma, data e quem recebeu.
- **MENS-CA-12**: O administrador estorna um pagamento com motivo: um lançamento de saída com o mesmo valor é criado, ligado ao original, a mensalidade volta a ficar devida e o pagamento fica marcado como estornado. Estornar duas vezes é recusado.
- **MENS-CA-13**: O administrador cancela uma mensalidade em aberto ou atrasada com motivo; mensalidade paga não pode ser cancelada.
- **MENS-CA-14**: A lista de inadimplentes mostra cada aluno com mensalidade atrasada, quantas são, o total devido e os dias de atraso da mais antiga.
- **MENS-CA-15**: A lista de mensalidades de um mês filtra por situação e busca por nome do aluno, e mostra o total previsto, recebido e em aberto.

### Caixa

- **MENS-CA-16**: Lançamentos não podem ser alterados nem apagados, nem por consulta direta ao banco feita pela aplicação; valor zero ou negativo é recusado pelo banco.
- **MENS-CA-17**: A tela do Caixa mostra os lançamentos de um dia, com o total de entradas, saídas e o saldo por forma de pagamento.

### Permissões e auditoria

- **MENS-CA-18**: O atendente vê mensalidades e inadimplentes e registra pagamentos, mas não estorna, não cancela, não gera mensalidades e não mexe em planos e assinaturas, pela tela nem pela API.
- **MENS-CA-19**: O professor não acessa mensalidades, planos nem o Caixa, pela tela nem pela API.
- **MENS-CA-20**: Cadastro e alteração de plano, mudança de assinatura, geração, pagamento, estorno e cancelamento ficam na auditoria com autor, data e IP.

### Telas

- **MENS-CA-21** [manual]: As telas de planos, mensalidades, recibo e Caixa funcionam no celular e no computador, em português, e o recibo pode ser impresso ou salvo em PDF pelo navegador.

## Fora do escopo

- Multa, juros e desconto por pagamento antecipado.
- Pagamento parcial, crédito do aluno e pagamento adiantado de vários meses.
- Cobrança automática, envio de lembrete e integração com Pix, banco ou maquininha.
- Nota fiscal.
- Abertura e fechamento do Caixa e lançamentos avulsos (Etapa 5).
- Professor ver as mensalidades dos próprios alunos.

## Decisões registradas

- 06/10/2026: o dono pediu para seguir sem esperar revisão. Ficam valendo estes padrões das decisões em aberto do plano, que podem mudar depois sem mexer na arquitetura:
  - Dia de vencimento por aluno (1 a 28), escolhido na assinatura.
  - Sem multa ou juros por atraso; atraso conta a partir do dia seguinte ao vencimento.
  - Aula perdida não gera reposição nem desconto automático.
  - Professor não vê mensalidades.
  - Atendente registra pagamentos; só o administrador estorna e cancela.
