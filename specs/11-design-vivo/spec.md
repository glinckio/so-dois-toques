# Etapa 11: Design com vida

**Status:** implementada

## Objetivo

Dar ao sistema um design imersivo e detalhado, com componentes próprios para cada parte e animações onde elas ajudam. Hoje as telas têm as cores da marca, mas são listas e formulários genéricos. O objetivo é que cada tela pareça desenhada para o trabalho que ela resolve.

## Por quê

O dono aprovou as cores da etapa 10 (fundo noite, roxo e dourado), mas achou o sistema "sem vida, parece que um desenvolvedor júnior fez". Ele pediu componentes personalizados e animação para certas ações. Também pediu que cada componente fosse pensado para a parte do sistema onde fica.

Ele mandou quatro referências de painel. Duas são escuras (faturas com destaque verde-limão e o "Finovate" roxo) e duas são claras (o "DoDo", de cursos, e o "AI-BL", de saúde). Dessas referências tiramos:

- **Moldura e títulos:** o aplicativo fica numa moldura arredondada, com o menu lateral como um cartão à parte. Os títulos são grandes, com uma palavra em destaque.
- **Números e gráficos:** anéis de progresso com o percentual no meio, barras arredondadas com uma barra em destaque e o valor num balão, e números grandes com os centavos menores.
- **Navegação:** faixa de dias para escolher a data, abas em pílula, botões redondos de ícone e um botão principal com seta.
- **Cartões:** um cartão em contraste forte destaca o que é mais importante.

## Princípios

1. **Cada componente nasce do trabalho da tela.** A grade das quadras é uma agenda de blocos, a venda é um balcão com botões de + e −, a presença é uma lista de toques grandes e o caixa é um painel ao vivo.
2. **Movimento com propósito.** A animação mostra o que mudou (número que sobe, barra que cresce, marca de presença que se desenha) ou que algo está vivo (caixa aberto pulsando). Nada fica girando à toa. Quem pede "reduzir movimento" no sistema operacional vê tudo parado.
3. **Um destaque por tela.** Cada tela tem um elemento principal, em roxo vivo ou dourado. O resto fica em tons do fundo.
4. **Sem perder o que já funciona.** Mesmas regras, mesmas rotas e mesmos textos dos rótulos, que os testes e a equipe já conhecem. Contraste AA mantido e CSP sem estilos embutidos.

## Componentes por parte do sistema

### Moldura (todas as telas)

- **Computador:** o fundo é a noite mais escura. O menu lateral é um cartão arredondado e flutuante, com o logo, as áreas agrupadas em "Visão geral", "Operação" e "Gestão", e a área aberta numa pílula roxa com brilho. No rodapé ficam o status do caixa (aberto, pulsando, ou fechado), para quem acessa o Caixa, e o cartão da pessoa, que abre um menu com "Trocar senha" e "Sair".
- **Barra do topo:** busca rápida ("Buscar ou ir para…", também com Ctrl+K), a data de hoje numa pílula e o avatar.
- **Celular:** barra do topo com o logo e o avatar. Embaixo fica uma barra de abas flutuante, como num aplicativo, com até quatro áreas. Quando o perfil tem mais áreas, um botão "Mais" abre uma folha com as restantes.
- **Busca rápida:** uma janela que lista as áreas e as ações rápidas do perfil, por exemplo "Nova reserva", "Registrar venda", "Novo aluno" e "Lançar no caixa". Ela também tem "Buscar alunos por …". Funciona pelo teclado.
- **Transição:** ao trocar de tela, o conteúdo entra subindo de leve, em cascata.
- **Carregando:** cada área mostra um esqueleto com brilho no formato da tela, em vez de tela vazia.

### Componentes de base

| Componente | Para quê |
| --- | --- |
| Cabeçalho da tela | Etiqueta da área com ícone, título grande com palavra em destaque, descrição, ações e as abas internas |
| Abas em pílula | Menu interno das áreas e filtros; a pílula ativa desliza até a aba clicada |
| Cartão | Variações: padrão, destaque roxo, contraste dourado e vidro, com cabeçalho de ícone, título e ação |
| Botões | Principal roxo com brilho, ouro (ação de dinheiro), secundário, fantasma e redondo de ícone; todos afundam ao toque e mostram uma bola girando enquanto enviam |
| Valor | Dinheiro com os centavos menores; número que sobe até o valor ao aparecer |
| Anel | Progresso circular com o percentual no meio, que se desenha ao aparecer: vagas da turma, presença, ocupação das quadras |
| Barra de nível | Barra arredondada que cresce, com marca do mínimo: estoque, ocupação, atraso |
| Linha de lista | Ícone em selo colorido ou avatar, título, detalhe e valor à direita: lançamentos, vendas, alunos, auditoria |
| Avatar | Iniciais com cor fixa por pessoa; grupo de avatares empilhados nas turmas |
| Selo de situação | Pago, A pagar, Atrasado, Aberto, Fechado: com ponto colorido e texto, nunca só cor |
| Escolha em blocos | Forma de pagamento (Pix, Dinheiro, Débito, Crédito) e quadra, em blocos com ícone |
| Faixa de dias | Sete dias para escolher a data, com hoje marcado e setas para avançar |
| Vazio | Ilustração da bola, frase curta e a ação que resolve |
| Confirmação | Janela própria do sistema no lugar da janela do navegador, com o risco escrito e os botões Confirmar e Cancelar |
| Aviso | Sucesso e erro entram com animação e ícone; o sucesso desenha um "check" |

### Login e senha

- **Login no computador:** a tela é dividida em duas. À esquerda fica a marca: logo grande com brilho, a bola flutuando e a frase "Do primeiro saque ao fechamento do caixa". À direita fica o formulário num cartão de vidro.
- **Login no celular:** logo em cima e o formulário embaixo.
- **Campos:** e-mail e senha têm ícone, e a senha tem o botão "Mostrar senha". Quando o login é recusado, o cartão balança.
- **Trocar senha:** um medidor de força da senha nova e uma confirmação que mostra na hora se as senhas batem. O servidor continua decidindo o que aceita.

### Início

- **Saudação:** título grande ("Olá, Gabriel! Como está a quadra hoje?") e a data.
- **Ações rápidas** do perfil, em blocos de ícone.
- **Administrador:**
  - Quatro cartões de número com mini-gráfico dos 12 meses e a variação.
  - Gráfico de barras arredondadas dos 12 meses, com o mês atual em destaque.
  - Rosca "De onde veio a receita", com o total no centro.
  - Cartão "Leitura do mês", com a bola brilhando e frases calculadas dos números (por exemplo "O resultado subiu 12% em relação a setembro").
- **Seu dia em números:** anéis com o que o perfil acompanha no dia (quadras ocupadas, presença nas aulas, caixa).
- **Quadras hoje:** mapa do dia com uma faixa por quadra, as reservas como blocos, a hora atual marcada e as próximas reservas.
- **Aulas de hoje:** linha do tempo das turmas do dia, com a aula em andamento marcada.
- **Caixa:** cartão ao vivo com o saldo e o tempo aberto.
- **Estoque:** barras de nível dos produtos abaixo do mínimo.

### Aulas

- **Turmas:** cartões com o selo do nível em cor própria, local e horários em pílulas. O anel de vagas mostra quantas estão ocupadas, e os avatares mostram o professor. Abas em pílula alternam entre Ativas e Encerradas.
- **Turma:** cabeçalho com o anel grande de vagas e os horários, e os alunos com avatar.
- **Presença:**
  - Anel e contador no topo ("8 de 12 presentes"), que se atualizam a cada toque.
  - Cada aluno é um cartão grande com Presente e Ausente, e a marca se desenha ao tocar.
  - A barra de salvar fica presa embaixo.
- **Alunos:** busca com ícone, filtros em pílula e linhas com avatar e telefone.
- **Aluno:** cartão de perfil com avatar grande e atalho de WhatsApp, além das matrículas e do plano.
- **Planos, locais, custos e resultado:** cartões, linhas e barras de comparação.

### Horários

- **Data:** faixa de dias com hoje marcado.
- **Resumo do dia:** anel de ocupação e legenda dos tipos de horário.
- **Grade:** uma agenda de blocos com uma coluna por quadra e o cabeçalho na cor da areia.
  - Cada reserva vira um bloco que ocupa todas as suas horas, colorido pela situação: pago, a pagar, fixa ou bloqueio.
  - O horário livre é uma célula tracejada com "+ Reservar".
  - A hora atual tem uma linha marcada, e as horas passadas ficam apagadas.
- **Nova reserva:** a quadra é escolhida em blocos, e um resumo do preço acompanha a escolha.
- **Reserva:** cartão em forma de ingresso, com a situação e o pagamento.
- **Preços:** as faixas de preço aparecem como faixas na linha do dia.

### Caixa

- **Painel do caixa:** o caixa aberto tem brilho verde, ponto pulsando e "Aberto há 2 h 14 min", atualizando sozinho, além do troco e do esperado em dinheiro. O caixa fechado mostra um cartão para abrir com o troco.
- **Resumo:** entradas, saídas e saldo, e um bloco com ícone para cada forma de pagamento.
- **Lançamentos:** uma linha do tempo com o selo da categoria e o valor em verde ou vermelho. O estorno abre na confirmação.
- **Fechamento:** a diferença entre o contado e o esperado aparece na hora: verde quando bate, vermelho quando não bate.
- **Mensalidades e inadimplentes:**
  - Linhas com selo de situação.
  - Inadimplentes têm uma barra de atraso e o atalho de WhatsApp.
  - O recibo é desenhado como um comprovante e sai em papel branco na impressão.

### Estoque

- **Produtos:** cartões com o nível do estoque e a marca do mínimo. O que está abaixo do mínimo tem um ponto dourado pulsando.
- **Venda:** um balcão.
  - Cada produto é um bloco com botões de − e +, e quantidade que não passa do saldo.
  - O resumo da venda fica preso à tela, com o total animado.
  - A forma de pagamento é escolhida em blocos.
- **Compra, vendas do dia e produto:** as mesmas linhas e a linha do tempo de movimentos.

### Contábil

- **Período:** escolha em pílulas (mês ou período).
- **Números:** cartões com mini-gráfico (receitas, despesas, resultado), a margem num anel, o gráfico de 12 meses, a rosca das receitas por origem e barras das despesas por tipo.
- **Lanchonete:** anel de margem.
- **Ocupação:** barras de ocupação por quadra e turno.
- **Conferência com o Caixa:** um selo com check animado.

### Usuários e Auditoria

- **Usuários:**
  - Cartões com avatar, selo do perfil e situação.
  - Cadastro num cartão próprio.
  - A senha temporária aparece num cartão com botão "Copiar".
- **Auditoria:** linha do tempo agrupada por dia ("Hoje", "Ontem" ou a data), com ícone e cor por tipo de evento (alertas de segurança em vermelho), os detalhes em campos legíveis e o registro completo à mão. Filtros num cartão, com atalhos de período em pílula.

## Critérios de aceite

- **VIVO-CA-01**: Com "reduzir movimento" ligado no sistema, as animações e transições ficam desligadas.
- **VIVO-CA-02**: Menu:
  - No computador, o menu lateral agrupa as áreas em "Visão geral", "Operação" e "Gestão".
  - No celular, a barra de abas mostra até quatro áreas, e "Mais" abre as restantes.
  - A área aberta fica marcada.
- **VIVO-CA-03**: Busca rápida:
  - Abre pelo botão ou por Ctrl+K e lista só as áreas e ações do perfil.
  - Filtra pelo que se digita e abre o item escolhido.
  - "Buscar alunos" leva à lista de alunos filtrada.
- **VIVO-CA-04**: As confirmações usam a janela do sistema: "Cancelar" (ou Esc) não executa a ação e "Confirmar" executa.
- **VIVO-CA-05**: O menu da pessoa (avatar) mostra nome e perfil e leva a "Trocar senha" e "Sair".
- **VIVO-CA-06**: Na grade de Horários, a faixa de dias mostra sete dias com o dia escolhido marcado, e uma reserva de várias horas é um único bloco que ocupa essas horas.
- **VIVO-CA-07**: Na venda, os botões + e − mudam a quantidade sem passar do saldo, e o total acompanha.
- **VIVO-CA-08**: Com o caixa aberto, o painel mostra há quanto tempo ele está aberto.
- **VIVO-CA-09**: Na presença, o contador e o anel acompanham as marcações.
- **VIVO-CA-10**: O login tem "Mostrar senha", e a troca de senha mostra a força da senha nova e se a confirmação bate.
- **VIVO-CA-11**: Nenhuma tela das áreas tem erro de CSP no navegador, no celular e no computador.
- **VIVO-CA-12**: Anéis, barras e números animados têm texto equivalente para leitor de tela (rótulo ou tabela).
- **VIVO-CA-13** [manual]: O visual segue as referências enviadas, com um destaque por tela, no celular e no computador.
- **VIVO-CA-14**: Na auditoria, os registros ficam agrupados por dia ("Hoje", "Ontem" ou a data), cada um com ícone e cor pelo tipo de evento, e os detalhes aparecem como campos legíveis (valores em reais).

## Decisões registradas

- 07/10/2026: o dono enviou mais duas referências claras ("DoDo" e "AI-BL") e disse que gostou das cores. Ficam as cores da etapa 10 e o tema escuro; das referências claras vêm a moldura, os anéis, as barras arredondadas e a faixa de dias.
- Animações só em CSS, e ajustes de posição pelo JavaScript no navegador (CSSOM), porque a CSP não deixa estilo embutido no HTML. Por isso não há biblioteca de animação.
- Sem notificações (sino): o sistema não tem uma fonte de avisos; os alertas (estoque baixo, atrasos) ficam no Início e nas áreas.
- Nenhuma rota nova na API: a busca rápida usa a lista de alunos que já existe.
