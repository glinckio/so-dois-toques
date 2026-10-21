# Etapa 21: Plano técnico

- Banco: dois valores novos no enum `CategoriaLancamento` (`OUTRA_RECEITA`, `APORTE`). A migração só acrescenta valores; nada é apagado nem alterado.
- API (`apps/api/src/gastos`): `TIPOS_DE_ENTRADA` nas regras puras; `POST /gastos/entradas` e `GET /gastos/entradas?competencia=` com Zod; o estorno (`POST /gastos/:id/estorno`) passa a aceitar a entrada manual e lança a saída contrária. Auditoria `ENTRADA_REGISTRADA`; o estorno usa `LANCAMENTO_ESTORNADO`.
- Contábil (`apps/api/src/contabil/regras.ts`): `resumoFinanceiro` separa `outrasReceitas` e `aportes`; resultado e conferência incluem os dois; o comparativo traz `outrasReceitas`.
- Web: aba `/contabil/entradas` (formulário, lista e estorno), ação `lancarEntrada`, quadro "Entradas por tipo" no painel, nomes no CSV e rótulos da auditoria (inclusive os da Etapa 17, que faltavam no filtro).
- Testes: unidade das regras do Contábil e dos nomes; integração da API contra PostgreSQL; ponta a ponta da aba Entradas.
