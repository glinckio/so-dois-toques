# Etapa 6: Plano técnico

## Modelo de dados (Prisma)

| Tabela             | Campos principais                                                                                                                    | Restrições                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| `Produto`          | nome, `precoCentavos`, `estoqueMinimo`, `saldo`, `custoMedioCentavos`, ativo                                                         | Nome único; CHECK de faixas e `saldo >= 0` |
| `Venda`            | forma, total, lançamento, estorno (quando, quem, motivo, lançamento), quem vendeu                                                    | Lançamentos únicos                         |
| `ItemVenda`        | venda, produto, quantidade, `precoCentavos`, `custoCentavos`                                                                         | CHECK quantidade > 0                       |
| `Compra`           | produto, quantidade, total, forma, data, lançamento, estorno                                                                         | CHECK quantidade e total > 0               |
| `MovimentoEstoque` | produto, tipo (`COMPRA`, `VENDA`, `AJUSTE`, `ESTORNO_VENDA`, `ESTORNO_COMPRA`), quantidade (com sinal), saldo depois, motivo, origem | Gatilho impede UPDATE e DELETE             |
| `Lancamento`       | novas categorias `VENDA` e `COMPRA_ESTOQUE`                                                                                          | Continua imutável                          |

## Regras puras (`apps/api/src/estoque/regras.ts`)

- `custoMedio(saldo, custoAtual, quantidade, total)`.
- `totalDaVenda(itens)`.
- `agruparItens(itens)`: soma quantidades repetidas do mesmo produto.
- `abaixoDoMinimo(produto)`.

## API (NestJS, módulo `estoque`, área estoque)

| Rota                                    | Quem             | O que faz                                  |
| --------------------------------------- | ---------------- | ------------------------------------------ |
| `GET /produtos`                         | Admin, Atendente | Lista com saldo, custo médio e mínimo      |
| `POST /produtos`, `PATCH /produtos/:id` | Admin            | Cadastro e alteração                       |
| `GET /produtos/:id/movimentos`          | Admin, Atendente | Extrato                                    |
| `POST /estoque/compras`                 | Admin, Atendente | Compra + movimento + lançamento de saída   |
| `POST /estoque/vendas`                  | Admin, Atendente | Venda + movimentos + lançamento de entrada |
| `GET /estoque/vendas?data=`             | Admin, Atendente | Vendas do dia                              |
| `POST /estoque/ajustes`                 | Admin            | Ajuste com motivo                          |
| `POST /estoque/vendas/:id/estornar`     | Admin            | Estorno de venda                           |
| `POST /estoque/compras/:id/estornar`    | Admin            | Estorno de compra                          |

Concorrência: cada operação trava as linhas dos produtos (`SELECT … FOR UPDATE`, em ordem de id para não haver impasse) antes de ler o saldo; o CHECK `saldo >= 0` é a última barreira. Estornos travam a venda ou a compra.

Auditoria: `PRODUTO_CRIADO`, `PRODUTO_ALTERADO`, `COMPRA_REGISTRADA`, `VENDA_REGISTRADA`, `ESTOQUE_AJUSTADO`, `VENDA_ESTORNADA`, `COMPRA_ESTORNADA`.

## Web (Next.js)

- `/estoque`: produtos com saldo e alerta de mínimo; cadastro (admin).
- `/estoque/venda`: carrinho com produtos ativos, forma e total.
- `/estoque/compra`: entrada de mercadoria.
- `/estoque/produtos/[id]`: extrato, edição e ajuste (admin).
- `/estoque/vendas`: vendas do dia, com estorno (admin).

## Testes

- Unidade: custo médio, total, agrupamento, mínimo.
- Integração (PostgreSQL): ESTQ-CA-01 a 09, com vendas simultâneas.
- Ponta a ponta: produto → compra → venda (com caixa aberto) → extrato; atendente sem ajuste; professor sem acesso.
