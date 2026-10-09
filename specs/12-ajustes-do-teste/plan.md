# Etapa 12: Plano técnico

- `lib/base/mascaras.ts`: funções puras `mascararTelefone`, `mascararReais` e `posicaoDoCursor` (o cursor fica depois do mesmo dígito ao corrigir no meio), com teste de unidade.
- `components/base/campos-com-mascara.tsx`: `CampoTelefone` e `CampoReais`, feitos sobre o `Campo` comum. O campo continua não controlado: a máscara é aplicada no próprio elemento antes de repassar o `onChange`, então a prévia do avulso e a diferença do fechamento já leem o texto formatado.
- Cadastro de local: o cartão vira `@container` e os blocos de tipo só ficam lado a lado a partir de `@md` (28rem). Nome do local na lista quebra linha em vez de cortar com reticências.
- Fechamento: `TOM_DA_DIFERENCA` em `lib/caixa/painel.ts` decide a cor de cada situação; o cartão da diferença expõe `data-tom` para o teste ponta a ponta.
