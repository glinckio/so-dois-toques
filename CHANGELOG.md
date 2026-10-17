# Changelog

## Próxima versão

- Etapa 19: feedback dos alunos. Formulário público em `/avaliar` (sem login), com nota de 1 a 5, comentários, turma e nome opcionais, limite de 5 respostas por hora e armadilha para robôs. Área Feedback do administrador com nota média, distribuição, média mensal, filtros, respostas não lidas (também no Início), remover e pausar o formulário.
- Etapa 17: quadras alugadas, gastos e saldo do caixa. Várias quadras (cadastro, renomear, desativar); cada turma e cada bloqueio numa quadra, e a agenda mostra uma quadra por vez. Aluguel mensal de quadra lançado sozinho no dia do pagamento, locação avulsa, equipamentos, investimentos e outros gastos, com estorno. Saldo inicial de R$ 600,00 em 16/10/2026 e saldo em caixa no Contábil e no Início.
- Etapa 13: sem lanchonete. Sai a área Estoque (produtos, vendas e compras), o cartão de estoque do Início e a lanchonete do Contábil. O Atendente fica com Horários e Caixa. Vendas e compras antigas continuam no histórico do Caixa e contam como outras receitas e despesas no Contábil.
- Etapa 14: foco em aulas. Saem Estoque, Caixa (turnos e avulsos), quadras parceiras e aluguel de quadra. Mensalidades ganham área própria; a agenda da única quadra mostra as aulas das turmas e os bloqueios; turmas não dividem horário; o Contábil fica só com mensalidades e estornos. A migration para sem mexer em nada se encontrar dados das partes que saem.
- Etapa 10: identidade visual. Tema escuro com as cores do logo (roxo e dourado), menu lateral com ícones, logo no login, no menu e no ícone do site, Início com painel por perfil (resumo do mês, gráfico de 12 meses, caixa, quadras, aulas e estoque) e gráficos no Contábil.

## 1.0.0 (lançamento)

Todas as telas do sistema: Aulas, Horários, Estoque, Caixa e Contábil.

- Etapa 0: fundação, CI, cabeçalhos de segurança.
- Etapa 1: login, perfis (Administrador, Professor, Atendente), usuários e auditoria.
- Etapa 2: alunos com consentimento LGPD, locais, turmas, matrículas e presença.
- Etapa 3: planos, mensalidades, pagamentos com recibo, inadimplentes e o núcleo do Caixa.
- Etapa 4: custos de quadras parceiras e resultado por turma e professor (marco v0.1).
- Etapa 5: Caixa com turnos, lançamentos avulsos, fechamento com contagem e estornos.
- Etapa 6: Estoque da lanchonete com compras, custo médio, vendas e ajustes.
- Etapa 7: Horários das duas quadras com faixas de preço, reservas avulsas e fixas, bloqueios e pagamento.
- Etapa 8: painel Contábil com receitas, despesas, conferência com o Caixa, ocupação e planilha.
- Etapa 9: produção sem valores de exemplo, inventário de rotas, backup e restauração com conferência, prazo de guarda dos clientes das quadras, revisão de segurança final e documentação (LGPD, manual e implantação).
