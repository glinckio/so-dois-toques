# Etapa 21: Entrada manual no caixa

**Status:** implementada

## Objetivo

Lançar à mão um valor que **entra** no caixa, do mesmo jeito que hoje se lança um gasto. Até aqui só entravam no caixa as mensalidades (sozinhas, pelo pagamento) e o saldo inicial; tudo o que se lançava à mão era saída.

## Por quê

Em 21/10/2026 o dono contou: "tem uma coisa que o sistema não faz é lançarmos manualmente um valor para adicionar ao caixa, somente podemos fazer gastos e não adições de valores". Dinheiro que não é mensalidade (uma aula avulsa, um evento, um patrocínio, ou dinheiro que o próprio dono põe no caixa) não tinha onde ser registrado, e o saldo em caixa ficava menor que o dinheiro de verdade.

A Etapa 17 deixou o aporte de fora porque "investimento" era gasto. Esta etapa traz a entrada de volta.

## Tipos de entrada

- **Outra receita:** dinheiro ganho que não é mensalidade, como aula avulsa, evento, torneio ou patrocínio. **É receita**: entra no resultado do Contábil.
- **Aporte:** dinheiro que o dono (ou um sócio) coloca no caixa. **Não é receita**: aumenta o saldo em caixa, mas aparece à parte no Contábil, como o saldo inicial, para não inflar o resultado.

## Lançar uma entrada

- Igual ao gasto: tipo, descrição (3 a 200 caracteres), data (hoje ou antes), valor (R$ 0,01 a R$ 100.000,00, em centavos) e forma de pagamento.
- Lança um lançamento de **entrada** no livro-razão, com a data escolhida.
- Fica na nova aba **Entradas** do Contábil, ao lado de Gastos, com a lista das entradas do mês e o saldo em caixa no topo. O painel do Contábil ganha o atalho **Lançar entrada**, no quadro "Entradas por tipo".
- Lançamento errado não se apaga: o administrador **estorna** com motivo, e entra uma saída do mesmo tipo e valor, ligada à entrada original, com a data de hoje (regra do livro-razão). Estornar de novo é recusado.

## Saldo em caixa

Nada muda na conta: saldo inicial + todas as entradas − todas as saídas a partir da data do saldo inicial. A entrada manual soma no saldo e o estorno dela desconta.

## Contábil

- **Receitas:** mensalidades (menos estornos) e outras receitas (menos estornos).
- **Resultado** = mensalidades − estornos de mensalidade + outras receitas − gastos.
- **Aportes** aparecem à parte, como o saldo inicial, e entram na conferência com o livro-razão (resultado + saldo inicial + aportes = entradas − saídas).
- Um quadro **Entradas por tipo**, ao lado de **Saídas por tipo**, mostra mensalidades, outras receitas, o total de receitas e os aportes.
- O comparativo de 12 meses soma as outras receitas ao que entrou no mês. A planilha (CSV) traz os novos tipos pelo nome.

## Quem faz o quê

| Ação                                  | Administrador | Atendente |
| ------------------------------------- | ------------- | --------- |
| Lançar e estornar entrada             | Sim           | Não       |
| Ver as entradas, o saldo e o Contábil | Sim           | Não       |

A checagem vale na API; as telas só escondem o que o perfil não pode usar. São as mesmas regras do gasto (GASTO-CA-09).

## Critérios de aceite

- **ENTRADA-CA-01**: O administrador lança outra receita ou aporte com descrição, data, valor e forma: entra um lançamento de entrada no livro-razão com esses dados; data futura, valor fora da faixa, descrição curta e tipo desconhecido são recusados.
- **ENTRADA-CA-02**: A entrada aumenta o saldo em caixa no mesmo valor e aparece na lista de entradas do mês.
- **ENTRADA-CA-03**: O administrador estorna a entrada com motivo: entra a saída contrária ligada à original e o saldo volta; estornar de novo é recusado, e estorno de entrada não se estorna.
- **ENTRADA-CA-04**: No Contábil, outras receitas entram nas receitas, no resultado e no comparativo; o aporte fica à parte (não é receita) e entra na conferência, que continua batendo com o livro-razão.
- **ENTRADA-CA-05**: O atendente não lança, não estorna e não vê entradas, pela tela e pela API.
- **ENTRADA-CA-06**: Entradas e estornos de entrada ficam na auditoria com autor, data e IP.
- **ENTRADA-CA-07** [manual]: A aba Entradas funciona no celular e no computador, em português.

## Fora do escopo

- Retirada do dono (saída que não é gasto): continua sendo lançada como "Outro gasto".
- Entrada com data futura ou entrada que se repete todo mês.

## Decisões registradas

- Padrões propostos nesta spec (o dono pode mudar): dois tipos, outra receita (é receita) e aporte (não é receita); mesmas faixas, perfis e regra de estorno do gasto; aba própria no Contábil.
