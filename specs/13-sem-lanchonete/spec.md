# Etapa 13: Sem lanchonete

**Status:** implementada

## Objetivo

Tirar do sistema o estoque e as vendas da lanchonete. O Só Dois Toques passa a cuidar só de alunos e aulas, das quadras e dos horários de locação, com o Caixa e o Contábil para o dinheiro dessas áreas.

## Por quê

Em 13/10/2026 o dono avisou que não vai mais ter lanchonete: "Vamos somente cuidar de horários, quadras, aulas etc. Não teremos mais uma lancheria, só alunos, quadras e horários para locação". Telas, atalhos e números da lanchonete só atrapalham quem usa o sistema no dia a dia.

## O que sai

- A área **Estoque** inteira: produtos, venda no balcão, compra de mercadoria, ajuste, estornos, vendas do dia e extrato do produto. Sai do menu, da busca rápida, das ações do Início e das permissões.
- As rotas da API de produtos e estoque (`/produtos`, `/estoque/...`).
- No **Início**: o cartão "Estoque" e o anel "produtos em dia".
- No **Contábil**: o cartão "Lanchonete" (vendido, custo e margem bruta) e as linhas "Lanchonete" (receita) e "Compras de estoque" (despesa).
- Os textos que falavam de lanchonete, vendas ou estoque (login, cadastro de usuário, Caixa, manual).

## O que fica

- **Caixa**: mensalidades, aluguel de quadra, quadras parceiras, suprimento, sangria, receitas e despesas avulsas. Só a venda de produtos sai.
- **Perfil Atendente**: continua, para quem marca horários e recebe no caixa. Passa a ver Início, Horários e Caixa.
- **Histórico**: lançamentos do livro-razão nunca são apagados nem alterados (regra da Etapa 3). Por isso:
  - as tabelas de produtos, vendas, compras e movimentações ficam no banco, sem tela e sem rota, só como histórico;
  - vendas e compras já lançadas continuam aparecendo no Caixa do dia em que foram feitas, com os nomes "Venda" e "Compra de estoque";
  - no Contábil, essas vendas antigas contam em "Outras receitas" e as compras em "Outras despesas", para o resultado continuar batendo com o Caixa;
  - os eventos antigos da lanchonete continuam legíveis na auditoria.

## Decisões

- 13/10/2026: o pedido também citou "funcionários". O sistema não tem tela com esse nome; o mais próximo é o perfil Atendente. Padrão escolhido, perguntado ao dono no mesmo dia: o Atendente fica, sem o Estoque. A tela de usuários fica, porque o administrador precisa criar as contas de professor.
- Nada é apagado do banco. Apagar as tabelas da lanchonete quebraria o vínculo com lançamentos que, por regra, não podem sumir.
- A Etapa 6 (Estoque) fica com status `removida`: a spec continua como histórico e não exige mais testes. Critérios de outras etapas que dependiam da lanchonete ficam marcados `[removido na Etapa 13]`.

## Critérios de aceite

- **LANCH-CA-01**: A API não tem mais rotas de produtos, estoque ou vendas; chamá-las, mesmo como administrador, responde 404.
- **LANCH-CA-02**: Nenhum perfil tem a área Estoque: ela some do menu e da busca rápida, e o atendente vê Início, Horários e Caixa.
- **LANCH-CA-03**: O Contábil não tem mais a lanchonete; vendas e compras de estoque antigas contam como outras receitas e outras despesas, e a conferência com o Caixa continua batendo.
- **LANCH-CA-04**: Lançamentos antigos de venda e compra de estoque continuam com nome no histórico do Caixa, e os eventos antigos da lanchonete continuam legíveis na auditoria.
- **LANCH-CA-05**: O Início não mostra mais o estoque, e os endereços antigos da lanchonete (`/estoque`, `/estoque/venda`, `/estoque/compra`, `/estoque/vendas`) mostram "Página não encontrada".
- **LANCH-CA-06** [manual]: Login, cadastro de usuário, Caixa e manual do usuário não falam mais de lanchonete, vendas ou estoque.

## Fora do escopo

- Apagar do banco as vendas, compras e produtos já registrados.
- Remover o perfil Atendente (só se o dono pedir).
