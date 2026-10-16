# Etapa 17: Quadras alugadas, gastos e saldo do caixa

**Status:** implementada

## Objetivo

Registrar todo o dinheiro que sai, além do que entra com as mensalidades, e saber quanto há em caixa:

- o **saldo inicial** de R$ 600,00 em 16/10/2026, de onde o caixa passa a subir ou descer;
- o **aluguel das quadras**: mensal fixo (tal dia e horário, na quadra X, R$ Y por mês) ou avulso (no dia X, R$ Y de locação da quadra X);
- os **outros gastos**, como equipamentos e investimentos.

As turmas passam a acontecer numa das quadras cadastradas.

## Por quê

Em 16/10/2026 o dono contou que as aulas acontecem em quadras alugadas, algumas por mês e outras por vez, e que sobraram R$ 600,00 em caixa de tudo o que fizeram até agora. Hoje o sistema só conhece a entrada das mensalidades: não mostra o que se gasta nem quanto dinheiro há.

## Quadras

- O administrador cadastra as quadras pelo nome (2 a 40 caracteres, nome único), por exemplo "Arena Beira-Rio, quadra 2". Uma quadra pode ser desativada; quadra desativada não recebe turma, contrato nem locação nova, mas o histórico fica.
- A quadra que já existe no sistema continua, com o nome que tem.
- **Cada turma acontece numa quadra.** As turmas que já existem ficam na quadra atual.
- Duas turmas ativas só não podem ter horário sobreposto **na mesma quadra** (no mesmo dia da semana). Em quadras diferentes, pode.
- A agenda mostra uma quadra por vez, com a escolha da quadra no topo. Bloqueios passam a ser de uma quadra.

## Aluguel mensal (contrato)

- O administrador registra: quadra, dia da semana, início e fim do horário, valor por mês (R$ 1,00 a R$ 20.000,00), dia do pagamento (1 a 28) e o mês de início (do mês atual até 12 meses à frente, para não lançar meses antigos de uma vez).
- **Todo mês, no dia do pagamento, o sistema lança sozinho a saída** do valor no caixa ("Aluguel mensal: quadra X, terça 19:00 às 20:00, outubro de 2026"), na forma de pagamento escolhida no contrato. Nunca lança duas vezes o mesmo mês do mesmo contrato, mesmo com duas execuções ao mesmo tempo.
- Se o contrato começa num mês cujo dia de pagamento já passou, a saída daquele mês é lançada no dia em que o contrato foi registrado.
- O administrador **encerra** o contrato a partir de um mês (o atual ou um seguinte, depois do mês de início): daquele mês em diante não há mais lançamento. Mudar o valor é encerrar e registrar um novo.
- O contrato não ocupa a agenda sozinho: quem ocupa o horário é a turma que acontece nele.

## Aluguel avulso e outros gastos

- **Locação avulsa:** quadra, data (hoje ou antes), valor e forma de pagamento; observação opcional. Lança a saída no caixa nessa data.
- **Outros gastos:** categoria (equipamento, investimento ou outro), descrição (3 a 200 caracteres), data (hoje ou antes), valor e forma. Lança a saída no caixa.
- Valores de R$ 0,01 a R$ 100.000,00, sempre em centavos.
- Lançamento errado não se apaga: o administrador **estorna** com motivo, e entra o lançamento contrário ligado ao original (regra do livro-razão).

## Saldo do caixa

- Um lançamento de entrada **"Saldo inicial"** de R$ 600,00 em 16/10/2026 é criado na migração, com a descrição "Saldo que sobrou até 16/10/2026". Só pode haver um saldo inicial.
- **Saldo em caixa** = saldo inicial + todas as entradas − todas as saídas desde a data do saldo inicial. Lançamentos de antes dessa data não entram no saldo (já estão contados nos R$ 600,00), mas continuam no Contábil do mês deles.
- O saldo aparece no Contábil e no Início do administrador.

## Contábil

- **Entradas:** mensalidades (menos estornos). O saldo inicial aparece à parte e não conta como receita do mês.
- **Saídas:** aluguel mensal de quadra, locação avulsa, equipamentos, investimentos e outros (cada um menos seus estornos).
- **Resultado** do período = entradas − saídas, com a conferência contra o livro-razão.
- O comparativo de 12 meses passa a mostrar entradas, saídas e resultado. A planilha (CSV) traz as novas categorias.

## Quem faz o quê

| Ação                                            | Administrador | Atendente |
| ----------------------------------------------- | ------------- | --------- |
| Cadastrar quadras, contratos, locações e gastos | Sim           | Não       |
| Estornar lançamento                             | Sim           | Não       |
| Ver a agenda de cada quadra                     | Sim           | Sim       |
| Ver contratos, gastos, saldo e Contábil         | Sim           | Não       |

## Critérios de aceite

- **GASTO-CA-01**: O administrador cadastra, renomeia e desativa quadras; nome repetido é recusado; quadra desativada não recebe turma, contrato nem locação nova.
- **GASTO-CA-02**: A turma tem quadra; duas turmas ativas sobrepostas na mesma quadra e no mesmo dia são recusadas, e em quadras diferentes são aceitas; a agenda e os bloqueios são de uma quadra.
- **GASTO-CA-03**: O contrato mensal é registrado com quadra, dia, horário, valor, dia do pagamento, forma e mês de início; dados fora das faixas são recusados.
- **GASTO-CA-04**: No dia do pagamento de cada mês, o sistema lança uma saída do valor do contrato, uma só por mês, mesmo com duas execuções ao mesmo tempo; contrato que começa depois do dia do pagamento lança o primeiro mês no dia do registro; contrato encerrado não lança mais nada a partir do mês do encerramento.
- **GASTO-CA-05**: A locação avulsa e os outros gastos (equipamento, investimento, outro) lançam a saída com data, valor e forma; data futura e valor fora da faixa são recusados.
- **GASTO-CA-06**: O administrador estorna locação, gasto ou mensalidade de contrato com motivo: entra o lançamento contrário ligado ao original; estornar de novo é recusado.
- **GASTO-CA-07**: A migração cria o saldo inicial de R$ 600,00 em 16/10/2026; o saldo em caixa é esse valor mais as entradas menos as saídas a partir dessa data.
- **GASTO-CA-08**: O Contábil mostra entradas (mensalidades), saídas por tipo (aluguel mensal, locação avulsa, equipamentos, investimentos, outros), resultado, saldo em caixa e o comparativo de 12 meses, conferindo com o livro-razão; o saldo inicial não conta como receita.
- **GASTO-CA-09**: O atendente não cadastra nem vê contratos, gastos, saldo nem Contábil, pela tela e pela API.
- **GASTO-CA-10**: Quadras, contratos (registro e encerramento), locações, gastos e estornos ficam na auditoria com autor, data e IP.
- **GASTO-CA-11** [manual]: As telas de quadras, contratos, gastos e saldo funcionam no celular e no computador, em português.

## Fora do escopo

- Aporte de dinheiro de fora (entrada que não é mensalidade): o dono esclareceu que "investimento" é gasto.
- Pagamento parcial de contrato, reajuste automático, multa e juros.
- Contas a pagar com vencimento futuro além dos contratos mensais.

## Decisões registradas

- 16/10/2026, respostas do dono: as quadras alugadas são onde acontecem as turmas (cada turma passa a ter quadra); o aluguel mensal entra no caixa sozinho todo mês; investimento é gasto; o saldo de R$ 600,00 vale a partir de hoje.
- Padrões propostos nesta spec (o dono pode mudar na aprovação): dia de pagamento do contrato de 1 a 28; forma de pagamento escolhida no contrato; mudança de valor = encerrar e registrar outro; categorias de gasto: equipamento, investimento e outro.
