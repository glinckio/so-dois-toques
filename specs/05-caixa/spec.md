# Etapa 5: Caixa (abertura, fechamento e lançamentos avulsos)

**Status:** implementada

## Objetivo

Controlar o dinheiro do balcão por turno: abrir o caixa com o troco, registrar o que entra e sai fora das mensalidades e fechar conferindo o dinheiro contado com o esperado.

## Por quê

A Etapa 3 criou o livro-razão, mas só as mensalidades (e, na Etapa 4, as quadras parceiras) lançam nele. No balcão também entra e sai dinheiro avulso (troco, sangria, uma compra de material, uma receita qualquer), e no fim do dia alguém precisa conferir a gaveta. Sem abertura e fechamento, uma diferença só aparece quando já não dá para saber de quem foi o turno.

## Quem faz o quê

| Ação                                      | Administrador | Atendente | Professor |
| ----------------------------------------- | ------------- | --------- | --------- |
| Abrir e fechar o caixa                    | Sim           | Sim       | Não       |
| Registrar lançamento avulso               | Sim           | Sim       | Não       |
| Estornar lançamento avulso                | Sim           | Não       | Não       |
| Ver os turnos e o relatório de fechamento | Sim           | Sim       | Não       |

A checagem vale na API; as telas só escondem o que o perfil não pode usar.

## Histórias de usuário

- Como atendente, quero abrir o caixa dizendo quanto tem de troco na gaveta.
- Como atendente, quero registrar um suprimento, uma sangria, uma despesa ou uma receita avulsa.
- Como atendente, quero fechar o caixa contando o dinheiro e ver na hora se bateu.
- Como administrador, quero ver cada turno, quem abriu, quem fechou e a diferença, e desfazer um avulso lançado errado.

## Regras de negócio

### Abertura

- Há um único caixa (um balcão). Só pode existir um turno aberto por vez.
- Abrir registra o troco inicial em dinheiro (de R$ 0,00 a R$ 10.000,00), quem abriu e quando.

### Lançamentos avulsos

- Precisam de caixa aberto. Têm categoria, forma, valor (de R$ 0,01 a R$ 100.000,00) e descrição (3 a 120 caracteres). A data é sempre hoje.
- Categorias:
  - **Suprimento**: entrada de dinheiro na gaveta (por exemplo, mais troco). Só em dinheiro.
  - **Sangria**: saída de dinheiro da gaveta (por exemplo, levar ao cofre ou ao banco). Só em dinheiro.
  - **Despesa**: saída para pagar algo (material, limpeza), em qualquer forma.
  - **Receita avulsa**: entrada que não é mensalidade, em qualquer forma.
- A descrição não deve ter dado pessoal de aluno, porque o lançamento nunca pode ser alterado; a tela avisa.
- O administrador estorna um avulso com motivo, com caixa aberto: um lançamento do tipo contrário e mesmo valor, ligado ao original. Um avulso só pode ser estornado uma vez.

### Lançamentos do turno

- Todo lançamento criado enquanto o caixa está aberto (mensalidade, quadra parceira, avulso e estornos) fica ligado ao turno.
- Pagamentos de mensalidade e de quadra continuam aceitos com o caixa fechado; nesse caso ficam sem turno, e a tela do Caixa avisa que não há caixa aberto.

### Fechamento

- Fechar pede o dinheiro contado na gaveta. O esperado em dinheiro é o troco inicial mais as entradas em dinheiro menos as saídas em dinheiro do turno. A diferença é contado menos esperado.
- Diferença diferente de zero exige observação. A diferença fica registrada no turno; não vira lançamento.
- Turno fechado não muda mais: não recebe lançamento e não é reaberto.
- O relatório do turno mostra abertura, fechamento, troco, esperado, contado, diferença, totais por forma e por categoria e a lista de lançamentos, e pode ser impresso.

## Critérios de aceite

- **CAIXA-CA-01**: Abrir o caixa registra o troco inicial, quem abriu e quando; troco fora da faixa é recusado e não pode haver dois caixas abertos, mesmo com duas aberturas ao mesmo tempo.
- **CAIXA-CA-02**: Com o caixa aberto, registra-se suprimento, sangria, despesa e receita avulsa com o tipo certo no livro-razão; sem caixa aberto, suprimento ou sangria fora do dinheiro, valor fora da faixa ou descrição curta são recusados.
- **CAIXA-CA-03**: Lançamentos de mensalidade, quadra parceira, avulsos e estornos feitos com o caixa aberto ficam ligados ao turno; feitos com o caixa fechado, ficam sem turno.
- **CAIXA-CA-04**: Fechar calcula o esperado em dinheiro (troco + entradas − saídas em dinheiro do turno) e a diferença para o contado; diferença sem observação é recusada; turno fechado não recebe lançamento nem fecha de novo, mesmo com dois fechamentos ao mesmo tempo.
- **CAIXA-CA-05**: O relatório do turno mostra troco, esperado, contado, diferença, totais por forma e por categoria e os lançamentos; a lista de turnos mostra os mais recentes primeiro.
- **CAIXA-CA-06**: O administrador estorna um avulso com motivo e caixa aberto: um lançamento contrário, de mesmo valor, ligado ao original; estornar de novo ou estornar lançamento que não é avulso é recusado.
- **CAIXA-CA-07**: O atendente abre, lança avulsos e fecha, mas não estorna; o professor não acessa o caixa, pela tela nem pela API.
- **CAIXA-CA-08**: Abertura, fechamento, avulso e estorno de avulso ficam na auditoria com autor, data e IP.
- **CAIXA-CA-09** [manual]: As telas de abertura, avulso, fechamento e relatório funcionam no celular e no computador, em português, e o relatório pode ser impresso.

## Fora do escopo

- Mais de um caixa (vários balcões) e transferência entre caixas.
- Exigir caixa aberto para pagamento de mensalidade e de quadra.
- Lançar a diferença do fechamento como quebra de caixa.
- Vendas do estoque no caixa (Etapa 6) e aluguel de quadra (Etapa 7).
- Relatórios contábeis (Etapa 8).

## Decisões registradas

- 06/10/2026: o dono pediu para seguir sem esperar revisão ("Eu vou testar depois, pode ir seguindo e fazendo tudo"). Ficam valendo estes padrões das decisões em aberto do plano, que podem mudar depois sem mexer na arquitetura:
  - Um único caixa, aberto e fechado pelo atendente ou pelo administrador.
  - Categorias avulsas: suprimento, sangria, despesa e receita avulsa.
  - A diferença do fechamento fica só registrada, com observação obrigatória.
  - Pagamentos de mensalidade e quadra não exigem caixa aberto.
