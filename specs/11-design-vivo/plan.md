# Etapa 11: Plano técnico

## Movimento sem estilo embutido

- Animações em CSS (`@keyframes` no `@theme` do Tailwind 4): entrar, surgir, crescer, desenhar, pulsar, flutuar, girar, balançar e brilho.
- Anéis, barras e linhas animam por atributos SVG (`pathLength`, `stroke-dasharray`) e classes; nada de `style=""` no HTML, que a CSP bloqueia.
- Quando o componente precisa de posição medida (pílula das abas), o JavaScript ajusta pelo CSSOM depois de carregar.
- Números sobem até o valor só quando a tela é aberta pelo menu (renderização no navegador); na primeira carga já vêm prontos.
- `@media (prefers-reduced-motion: reduce)` zera animações e transições (VIVO-CA-01).
- `app/(sistema)/template.tsx`: o conteúdo de cada tela entra em cascata.

## Componentes de base (`src/components/base/`)

- Cabeçalho, cartão, botões (com bola girando ao enviar), valor, número animado, anel, barra de nível, linha de lista, avatar, selo, escolha em blocos, faixa de dias, vazio, confirmação (`<dialog>` com `showModal`) e aviso animado.
- `components/marca/bola.tsx`: a bola do logo em SVG, usada no carregamento, no vazio e no destaque.
- Gráficos (`components/graficos/`): barras arredondadas com mês em destaque, rosca e mini-gráfico de linha.

## Moldura (`app/(sistema)/layout.tsx`)

- Menu lateral em cartão com grupos; barra do topo com busca rápida, data e avatar.
- Celular: barra de abas embaixo com até quatro áreas e "Mais" (folha com `popover`).
- Menu da pessoa com `popover` nativo (sem JavaScript para abrir e fechar).
- Busca rápida: `<dialog>` com lista filtrada pelo teclado, montada no servidor com as áreas e ações do perfil.
- `loading.tsx` por área com esqueleto.

## Regras puras com teste de unidade

- `lib/base/`: cor do avatar e iniciais, semana da faixa de dias, força da senha, tempo aberto do caixa, itens da busca rápida, frases da leitura do mês, arco da rosca.

## Telas

- Cada área refeita com os componentes de base, mantendo rotas, ações e rótulos.

## Testes

- Unidade para as regras puras.
- Ponta a ponta: menu agrupado e "Mais", busca rápida, confirmação, menu da pessoa, faixa de dias e bloco da reserva, botões da venda, tempo do caixa, presença, mostrar senha e força, todas as telas sem erro de CSP, reduzir movimento.
