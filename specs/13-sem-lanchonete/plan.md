# Etapa 13: Plano técnico

- **API:** sai o módulo `src/estoque` (controller, service, esquemas e regras) e o registro dele no `AppModule`. A área `estoque` sai de `AREAS` e do perfil Atendente em `acesso/regras.ts`; `GET /acesso/estoque` passa a responder 400, como qualquer área desconhecida.
- **Banco:** nenhuma migration. Os modelos `Produto`, `Venda`, `ItemVenda`, `Compra` e `MovimentoEstoque` ficam no `schema.prisma` com um comentário de histórico, porque `Venda` e `Compra` apontam para lançamentos do livro-razão. As categorias `VENDA` e `COMPRA_ESTOQUE` e as ações antigas da auditoria continuam nos enums.
- **Contábil:** em `contabil/regras.ts`, `VENDA` passa a somar em `OUTRAS` (receita) e `COMPRA_ESTOQUE` em `OUTRAS` (despesa); somem as origens `LANCHONETE` e `ESTOQUE` e o bloco `lanchonete` do painel. Estornos seguem a categoria do lançamento original, então caem no mesmo lugar.
- **Web:** saem `app/(sistema)/estoque`, `components/estoque`, `lib/estoque`, `acoes/estoque.ts` e o cartão do Início. A área sai de `lib/acesso/areas.ts` (menu e barra do celular) e de `lib/base/busca.ts`. O cartão "A receber" do Contábil ocupa a linha inteira. Os nomes e ícones de `VENDA` e `COMPRA_ESTOQUE` no Caixa e dos eventos de estoque na auditoria ficam, para o histórico.
- **Testes:** saem os testes do estoque; os do Contábil passam a gravar lançamentos antigos da lanchonete direto no banco. Os projetos `estoque-*` do Playwright saem.
- **Verificação de specs:** `scripts/spec-coverage.ts` aceita o status `removida` e ignora critérios marcados `[removido ...]`.
