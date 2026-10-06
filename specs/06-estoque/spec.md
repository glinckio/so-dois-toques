# Etapa 6: Estoque da lanchonete

**Status:** implementada

## Objetivo

Saber quanto tem de cada produto da lanchonete, vender pelo balcão com o dinheiro entrando no Caixa, registrar as compras com o dinheiro saindo dele e enxergar o que está acabando.

## Por quê

Sem controle, o estoque só é conferido quando o produto falta, e não dá para saber quanto se gasta nem quanto se ganha com a lanchonete. Esta etapa liga cada venda e cada compra ao livro-razão, o que alimenta o Contábil (Etapa 8).

## Quem faz o quê

| Ação                                         | Administrador | Atendente | Professor |
| -------------------------------------------- | ------------- | --------- | --------- |
| Cadastrar e alterar produtos e preços        | Sim           | Não       | Não       |
| Ver produtos, saldos e extrato               | Sim           | Sim       | Não       |
| Registrar venda                              | Sim           | Sim       | Não       |
| Registrar compra (entrada de mercadoria)     | Sim           | Sim       | Não       |
| Ajustar estoque (perda, consumo, inventário) | Sim           | Não       | Não       |
| Estornar venda ou compra                     | Sim           | Não       | Não       |

A checagem vale na API; as telas só escondem o que o perfil não pode usar.

## Histórias de usuário

- Como administrador, quero cadastrar os produtos com preço de venda e estoque mínimo.
- Como atendente, quero registrar uma venda com vários produtos de uma vez e receber em Pix, dinheiro ou cartão.
- Como atendente, quero dar entrada nas mercadorias que chegaram, com o valor pago.
- Como administrador, quero ver o que está abaixo do mínimo e o histórico de cada produto.
- Como administrador, quero ajustar o estoque quando algo estraga ou some, com motivo.

## Regras de negócio

### Produtos

- Produto tem nome (único), preço de venda (R$ 0,01 a R$ 1.000,00), estoque mínimo (0 a 10.000 unidades), situação (ativo ou inativo), saldo em unidades e custo médio.
- Quantidades são unidades inteiras. O saldo nunca fica negativo.
- Mudar o preço vale para as vendas seguintes; as já feitas guardam o preço que tinham.
- Produto inativo não aparece para venda nem para compra, mas o histórico fica.

### Compra

- Entrada de mercadoria: produto, quantidade (1 a 10.000) e valor total pago, com forma e data (hoje ou antes).
- Soma a quantidade ao saldo e recalcula o custo médio ponderado (arredondado ao centavo).
- Gera, na mesma transação, um lançamento de saída no Caixa, categoria "Compra de estoque".

### Venda

- Uma venda tem de 1 a 20 itens (produto e quantidade), uma forma de pagamento e precisa de caixa aberto. A data é hoje.
- Cada item usa o preço atual do produto e guarda também o custo médio do momento.
- Se algum item não tem saldo suficiente, a venda inteira é recusada. Duas vendas ao mesmo tempo nunca vendem a mesma unidade.
- Gera, na mesma transação, um lançamento de entrada no Caixa, categoria "Venda", com o total da venda, ligado ao turno.

### Ajuste

- O administrador ajusta o saldo para mais ou para menos, com motivo (perda, consumo interno, inventário). Não mexe no Caixa nem no custo médio.

### Estornos

- O administrador estorna uma venda com motivo e caixa aberto: as quantidades voltam ao estoque e um lançamento de saída de mesmo valor é criado, ligado ao original.
- O administrador estorna uma compra com motivo: as quantidades saem do estoque (só se houver saldo) e um lançamento de entrada de mesmo valor é criado, ligado ao original. O custo médio não é recalculado.
- Uma venda ou compra só pode ser estornada uma vez.

### Histórico

- Toda mudança de saldo é uma movimentação (compra, venda, ajuste, estorno) com quantidade, saldo depois, quem fez e quando. Movimentações não são alteradas nem apagadas.

## Critérios de aceite

- **ESTQ-CA-01**: O administrador cadastra e altera produto com nome, preço e estoque mínimo; nome repetido e valores fora da faixa são recusados; mudar o preço não muda as vendas já feitas.
- **ESTQ-CA-02**: Registrar compra soma ao saldo, recalcula o custo médio ponderado e cria, na mesma transação, um lançamento de saída no Caixa com o valor total; data futura, produto inativo ou quantidade inválida são recusados.
- **ESTQ-CA-03**: Registrar venda com vários itens baixa o saldo de cada produto, guarda preço e custo de cada item e cria um lançamento de entrada com o total, ligado ao turno; sem caixa aberto, sem saldo suficiente ou com produto inativo, a venda inteira é recusada.
- **ESTQ-CA-04**: Duas vendas ao mesmo tempo do último item de um produto: só uma passa e o saldo nunca fica negativo.
- **ESTQ-CA-05**: O administrador ajusta o saldo com motivo; ajuste que deixaria o saldo negativo é recusado.
- **ESTQ-CA-06**: O administrador estorna venda (com caixa aberto) e compra (com saldo suficiente) com motivo: o estoque volta ou sai, um lançamento contrário de mesmo valor é criado e estornar de novo é recusado.
- **ESTQ-CA-07**: A lista de produtos mostra saldo, custo médio e quem está abaixo do mínimo; o extrato do produto mostra as movimentações com saldo depois de cada uma.
- **ESTQ-CA-08**: O atendente vê o estoque e registra venda e compra, mas não cadastra produto, não ajusta e não estorna; o professor não acessa o estoque, pela tela nem pela API.
- **ESTQ-CA-09**: Cadastro e alteração de produto, compra, venda, ajuste e estornos ficam na auditoria com autor, data e IP.
- **ESTQ-CA-10** [manual]: As telas de produtos, venda, compra e extrato funcionam no celular e no computador, em português.

## Fora do escopo

- Código de barras, leitor e impressora de cupom.
- Fornecedores cadastrados, contas a pagar e compra a prazo.
- Nota fiscal.
- Venda fiado ou para aluno em conta.
- Produto composto (combo) e fração de unidade.

## Decisões registradas

- 06/10/2026: o dono pediu para seguir sem esperar revisão ("Eu vou testar depois, pode ir seguindo e fazendo tudo"). Ficam valendo estes padrões das decisões em aberto do plano, que podem mudar depois sem mexer na arquitetura:
  - Venda só com caixa aberto; compra é paga na hora e entra no turno, se houver um aberto.
  - Custo médio ponderado para o Contábil.
  - Atendente vende e dá entrada em compra; ajuste e estornos são do administrador.
