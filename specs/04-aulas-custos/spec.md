# Etapa 4: Horas e custos das quadras parceiras

**Status:** aprovada

## Objetivo

Saber quanto as aulas custam em aluguel de quadra parceira e quanto cada turma e cada professor deixa de resultado no mês, com números que batem com o Caixa.

## Por quê

Hoje as aulas acontecem em quadras de parceiros, pagas por hora. A receita das mensalidades já está no sistema (Etapa 3), mas sem o custo das quadras não dá para saber se uma turma se paga. Esta etapa fecha o marco v0.1 (Aulas).

## Quem faz o quê

| Ação                                              | Administrador | Atendente | Professor |
| ------------------------------------------------- | ------------- | --------- | --------- |
| Definir o valor da hora de um local parceiro      | Sim           | Não       | Não       |
| Ver horas e custo previsto do mês por local       | Sim           | Não       | Não       |
| Registrar e estornar pagamento à quadra parceira  | Sim           | Não       | Não       |
| Ver o resultado do mês por turma e por professor  | Sim           | Não       | Não       |
| Ver os lançamentos de pagamento à quadra no Caixa | Sim           | Sim       | Não       |

Tudo fica em Aulas e é só do administrador. O atendente continua vendo todos os lançamentos do dia no Caixa (Etapa 3), inclusive os pagamentos às quadras. A checagem vale na API.

## Histórias de usuário

- Como administrador, quero dizer quanto cada quadra parceira cobra por hora.
- Como administrador, quero ver quantas horas de aula cada quadra teve no mês e quanto isso deve custar.
- Como administrador, quero registrar o que paguei à quadra, para o dinheiro sair do Caixa.
- Como administrador, quero ver, mês a mês, a receita, o custo de quadra e o resultado de cada turma e de cada professor.

## Regras de negócio

### Valor da hora

- Cada local parceiro pode ter um valor por hora (R$ 1,00 a R$ 2.000,00, guardado em centavos). Local próprio não tem valor de hora nem pagamento de quadra.
- O valor pode ser mudado ou apagado a qualquer momento; a mudança fica na auditoria.

### Horas e custo previsto

- As horas de um local num mês são a soma da duração de cada aula das turmas daquele local: para cada dia do mês, cada horário da turma naquele dia da semana conta, desde o dia de início da turma até o dia anterior ao encerramento.
- Custo previsto = horas × valor da hora, arredondado ao centavo. Ele é só uma referência: usa o valor da hora atual e não desconta feriado ou aula cancelada.

### Pagamento à quadra

- O pagamento é de um local parceiro num mês (competência), com valor (sugerido pelo custo previsto), forma (Pix, dinheiro, cartão de débito ou de crédito) e data (hoje ou antes). Pode haver mais de um pagamento no mesmo mês (por exemplo, semanal).
- Cada pagamento gera, na mesma transação, um lançamento de saída no Caixa, categoria "Quadra parceira", com a descrição "Quadra <local> de <mês>".
- Estornar exige motivo e gera um lançamento de entrada ligado ao original. O pagamento estornado fica no histórico, marcado como estornado. Estornar duas vezes é recusado.

### Resultado do mês

- O resultado segue o Caixa (regime de caixa): entra no mês o que foi lançado com data naquele mês.
- Receita de uma turma: cada pagamento de mensalidade (menos os estornos) é dividido em partes iguais entre as turmas em que o aluno estava matriculado no mês da mensalidade. Sem matrícula naquele mês, vai para "Sem turma".
- Custo de uma turma: cada pagamento à quadra (menos os estornos) é dividido entre as turmas daquele local na proporção das horas de cada uma no mês do pagamento. Sem turma com horas, vai para "Sem turma".
- As divisões são em centavos inteiros e a soma das partes é sempre igual ao valor dividido.
- Resultado = receita − custo. O resultado do professor é a soma das turmas dele.
- O total de receita e de custo do relatório é igual à soma dos lançamentos do Caixa daquelas categorias no mês.

## Critérios de aceite

- **CUSTO-CA-01**: O administrador define o valor da hora de um local parceiro (R$ 1,00 a R$ 2.000,00) ou o apaga; valor fora da faixa ou local próprio são recusados.
- **CUSTO-CA-02**: As horas do mês de um local somam as aulas das turmas dele naquele mês, a partir do início da turma e até o encerramento, e o custo previsto é horas × valor da hora.
- **CUSTO-CA-03**: Registrar pagamento à quadra cria, na mesma transação, um lançamento de saída no Caixa com o mesmo valor, forma e data, sem dado pessoal na descrição; data futura, local próprio ou mês inválido são recusados.
- **CUSTO-CA-04**: O administrador estorna um pagamento à quadra com motivo: um lançamento de entrada do mesmo valor é criado, ligado ao original, e o pagamento fica marcado como estornado. Estornar duas vezes é recusado.
- **CUSTO-CA-05**: O resultado do mês mostra, por turma, a receita das mensalidades dividida entre as turmas do aluno, o custo das quadras dividido pelas horas e a diferença; o que não tem turma aparece em "Sem turma".
- **CUSTO-CA-06**: A receita e o custo totais do resultado batem, ao centavo, com os lançamentos do Caixa no mês, inclusive com estornos.
- **CUSTO-CA-07**: O resultado do mês mostra o total de cada professor, somando as turmas dele.
- **CUSTO-CA-08**: Atendente e professor não acessam valor da hora, custos, pagamentos à quadra nem o resultado, pela tela nem pela API.
- **CUSTO-CA-09**: Mudança do valor da hora, pagamento e estorno à quadra ficam na auditoria com autor, data e IP.
- **CUSTO-CA-10** [manual]: As telas de custos e de resultado funcionam no celular e no computador, em português.

## Fora do escopo

- Pacote de horas, mensalidade fixa ou porcentagem paga à quadra (só valor por hora).
- Histórico do valor da hora e do local da turma: o previsto e a divisão do custo usam o valor e as turmas atuais do local.
- Pagamento do professor (comissão, salário).
- Feriados e aulas canceladas descontadas automaticamente.
- Relatórios do Contábil (Etapa 8).

## Decisões registradas

- 06/10/2026: o dono pediu para seguir sem esperar revisão ("Eu vou testar depois, pode ir seguindo e fazendo tudo"). Ficam valendo estes padrões das decisões em aberto do plano, que podem mudar depois sem mexer na arquitetura:
  - A quadra parceira cobra por hora, com um valor por local.
  - O resultado segue a data do Caixa (regime de caixa).
  - A receita de um aluno em várias turmas é dividida em partes iguais.
  - Só o administrador vê custos e resultado.
