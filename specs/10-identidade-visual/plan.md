# Etapa 10: Plano técnico

## Tema (`apps/web/src/app/globals.css` e `src/lib/tema.ts`)

- Cores como variáveis do Tailwind 4 (`@theme`): `fundo`, `cartao`, `elevado`, `borda`, `texto`, `suave`, `apagado`, `roxo`, `roxo-forte`, `ouro`, `sucesso`, `perigo`, e as séries `serie-1` e `serie-2`.
- `lib/tema.ts` repete os valores para o teste de contraste (VIS-CA-01), que também confere se o CSS usa os mesmos valores.
- Estilos base para tabelas, listas e campos, para as telas existentes ganharem o visual sem reescrever cada uma.

## Marca

- `public/marca/logo-256.png` e `logo-96.png` gerados do logo enviado; `app/icon.png` e `app/apple-icon.png`.

## Layout

- `components/layout/menu-principal.tsx` (cliente, `usePathname`): o mesmo `<nav aria-label="Menu principal">` é lateral no computador e uma faixa horizontal no celular; `aria-current` na área aberta.
- `components/layout/abas.tsx`: menus internos das áreas como abas, com `aria-current`.
- `components/icones.tsx`: ícones SVG próprios (sem biblioteca nova).

## Início (`app/(sistema)/page.tsx`)

- Busca em paralelo só o que o perfil acessa: `/contabil/painel`, `/caixa/lancamentos`, `/caixa/sessao`, `/mensalidades/inadimplentes`, `/horarios/grade`, `/produtos`, `/turmas`.
- `lib/painel/inicio.ts` (puro): variação mensal, turmas de hoje, próximas reservas.

## Gráficos (`components/graficos/`)

- `barras-agrupadas.tsx`: barras de receitas e despesas por mês em SVG, com dica ao passar o mouse ou tocar (cliente), legenda e tabela.
- `barras-horizontais.tsx`: receitas por origem.
- `lib/graficos/escala.ts` (puro): escala com valores redondos para o eixo.

## Testes

- Unidade: contraste do tema, escala dos gráficos, variação mensal, turmas de hoje.
- Ponta a ponta: menu com área marcada, logo e ícone, Início do administrador, do atendente e do professor, gráficos do Contábil sem erro no console.
