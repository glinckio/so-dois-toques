# Etapa 10: Identidade visual

**Status:** implementada

## Objetivo

Dar ao sistema a cara do Só Dois Toques: o logo, as cores da marca (fundo escuro, roxo e dourado), menu lateral com ícones e um Início que mostra os números do dia em cartões e gráficos, no celular e no computador.

## Por quê

As telas funcionavam, mas eram genéricas: texto sobre fundo branco, sem marca, sem números à vista. O dono pediu um visual com identidade, inspirado em painéis financeiros escuros com cartões, destaques coloridos e gráficos. A equipe usa o sistema no celular, na quadra, e no computador, na recepção.

## Regras

### Marca

- Logo do Só Dois Toques (enviado pelo dono em 07/10/2026) no login, no menu e como ícone do site.
- Cores tiradas do logo: fundo azul-noite quase preto, roxo da bola como cor principal, dourado das estrelas como destaque.
- Texto sempre legível: contraste mínimo de 4,5:1 (WCAG AA) para texto comum sobre o fundo e sobre os cartões, e para o texto dos botões.

### Menu

- Computador: menu lateral fixo com logo, ícone e nome de cada área do perfil, e no rodapé o nome, o perfil, "Trocar senha" e "Sair".
- Celular: barra no topo com logo e o menu de áreas deslizando na horizontal, sempre visível.
- A área aberta fica marcada no menu. Os menus internos (Turmas, Alunos...) viram abas, com a aba aberta marcada.

### Início

Cada perfil vê os cartões das áreas que acessa:

- Contábil (administrador): receitas, despesas, resultado e a receber do mês, com a variação em relação ao mês anterior, e gráfico de receitas e despesas dos últimos 12 meses.
- Caixa: saldo do dia, entradas e saídas, e se há turno aberto; total de mensalidades em atraso.
- Horários: reservas de hoje nas quadras e as próximas da agenda.
- Estoque: produtos abaixo do mínimo.
- Aulas: turmas com aula hoje e vagas livres.

### Gráficos

- Cores das séries validadas para daltonismo sobre o fundo dos cartões (roxo para receitas, dourado escuro para despesas).
- Todo gráfico tem legenda, valores ao passar o dedo ou o mouse, e uma tabela com os mesmos números.
- Nada de estilo inline: a política de segurança (CSP) continua bloqueando estilos sem nonce.

## Critérios de aceite

- **VIS-CA-01**: As cores do tema garantem contraste de pelo menos 4,5:1 para texto principal e secundário sobre o fundo e os cartões, e para o texto dos botões; as séries dos gráficos têm pelo menos 3:1 sobre o cartão.
- **VIS-CA-02**: Há um único menu principal com as áreas do perfil, e a área aberta fica marcada (`aria-current="page"`), no celular e no computador.
- **VIS-CA-03**: O logo aparece no login e no menu, e o ícone do site é o logo.
- **VIS-CA-04**: No Início, o administrador vê receitas, despesas, resultado e a receber do mês, e o gráfico dos últimos 12 meses com tabela equivalente.
- **VIS-CA-05**: No Início, o atendente vê o caixa do dia, as reservas de hoje e o estoque, sem cartões do Contábil; o professor vê as turmas de hoje e nada de Caixa.
- **VIS-CA-06**: O Contábil mostra os gráficos dos 12 meses e das receitas por origem, com legenda e tabela, sem erro de CSP no navegador.
- **VIS-CA-07** [manual]: O visual fica coerente com o logo e com as referências enviadas, no celular e no computador.

## Decisões registradas

- 07/10/2026: o dono enviou duas referências de painel (escuras, com cartões e gráficos) e o logo. Tema escuro único (sem modo claro), porque a marca é escura; o contraste AA garante leitura no sol.
- Fonte Plus Jakarta Sans, servida pelo próprio site (sem chamar o Google no navegador).
- Os dados do Início vêm das rotas que já existem na API; nenhuma rota nova.
