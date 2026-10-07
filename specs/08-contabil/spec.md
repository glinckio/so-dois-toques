# Etapa 8: Painel contábil

**Status:** aprovada

## Objetivo

Mostrar ao administrador, num só lugar, de onde vem e para onde vai o dinheiro: receita de cada frente do negócio, despesas, resultado, margem, ocupação das quadras e o que está para receber.

## Por quê

Até aqui cada área mostra só os próprios números. Para decidir preço, horário e compra, o dono precisa ver tudo junto, mês a mês, com a certeza de que os números batem com o Caixa. O Contábil só lê o que as outras áreas gravaram: ele nunca grava nada (fora a auditoria da exportação).

## Quem faz o quê

| Ação                                | Administrador | Atendente | Professor |
| ----------------------------------- | ------------- | --------- | --------- |
| Ver o painel contábil               | Sim           | Não       | Não       |
| Exportar os lançamentos em planilha | Sim           | Não       | Não       |

A checagem vale na API; as telas só escondem o que o perfil não pode usar.

## Histórias de usuário

- Como administrador, quero ver quanto entrou no mês com aulas, aluguel de quadra e lanchonete, e quanto saiu com estoque, quadras parceiras e outras despesas.
- Como administrador, quero comparar os últimos 12 meses para ver se o negócio está crescendo.
- Como administrador, quero saber quanto as quadras ficam ocupadas de manhã, de tarde e de noite.
- Como administrador, quero saber quanto tenho a receber de mensalidades atrasadas e reservas não pagas.
- Como administrador, quero baixar os lançamentos para mandar ao contador.

## Regras de negócio

### Período

- O painel mostra um mês (o atual, se nada for escolhido) ou um intervalo de datas de até 366 dias.
- Regime de caixa, como na Etapa 4: cada lançamento entra pela data em que o dinheiro entrou ou saiu, no horário de São Paulo.

### Receitas, despesas e resultado

- Receitas por origem: Aulas (mensalidades), Locação (aluguel de quadra), Lanchonete (vendas) e Outras receitas (receita avulsa).
- Despesas por tipo: Estoque (compra de estoque), Quadras parceiras e Outras despesas (despesa avulsa).
- Um estorno é descontado da origem do lançamento que ele estorna, na data do estorno.
- Suprimento e sangria só mudam dinheiro de lugar: não são receita nem despesa. Aparecem à parte como "movimentação da gaveta".
- Resultado = receitas − despesas. Margem = resultado ÷ receitas, em porcentagem com uma casa; sem receita, não há margem.

### Conferência com o Caixa

- Receitas − despesas + movimentação da gaveta é igual a entradas − saídas de todos os lançamentos do período. O painel mostra essa conta e se ela confere.

### Comparativo mensal

- Receitas, despesas e resultado de cada um dos 12 meses que terminam no mês do fim do período.

### Lanchonete

- Vendido, custo do vendido (pelo custo médio guardado em cada item na hora da venda) e margem bruta das vendas feitas no período que não foram estornadas.

### Ocupação das quadras

- Para cada quadra e turno (manhã antes das 12h, tarde das 12h às 18h, noite a partir das 18h): horas abertas no período pelas faixas de preço atuais, menos as horas bloqueadas, e horas reservadas (reservas não canceladas).
- Ocupação = horas reservadas ÷ horas disponíveis, em porcentagem com uma casa.

### A receber

- Mensalidades vencidas e não pagas até hoje: quantidade e valor.
- Reservas do período que já começaram e não estão pagas: quantidade e valor.

### Formas de pagamento

- Entradas, saídas e saldo de cada forma (Pix, dinheiro, débito, crédito) no período.

### Exportação

- Planilha CSV com os lançamentos do período: data, tipo, categoria, forma, valor, descrição e se é estorno. Separada por ponto e vírgula, valores com vírgula e acentos legíveis no Excel em português.
- Célula que começaria com `=`, `+`, `-` ou `@` recebe um apóstrofo na frente, para não virar fórmula.
- Cada exportação fica na auditoria.

## Critérios de aceite

- **CONT-CA-01**: O painel soma as receitas por origem e as despesas por tipo do período, desconta os estornos da origem do lançamento original e mostra resultado e margem.
- **CONT-CA-02**: Receitas − despesas + movimentação da gaveta é igual a entradas − saídas dos lançamentos do Caixa no período, e o painel mostra que confere.
- **CONT-CA-03**: O período é um mês (o atual por padrão) ou um intervalo de até 366 dias; data inválida, início depois do fim e intervalo maior são recusados.
- **CONT-CA-04**: O comparativo mostra receitas, despesas e resultado dos 12 meses que terminam no mês do fim do período.
- **CONT-CA-05**: A lanchonete mostra vendido, custo do vendido e margem bruta do período, sem as vendas estornadas.
- **CONT-CA-06**: A ocupação de cada quadra por turno é horas reservadas sobre horas abertas menos bloqueadas, sem reservas canceladas.
- **CONT-CA-07**: A receber mostra as mensalidades vencidas e não pagas e as reservas do período já começadas e não pagas, com quantidade e valor.
- **CONT-CA-08**: Os totais por forma de pagamento mostram entradas, saídas e saldo.
- **CONT-CA-09**: A exportação gera um CSV dos lançamentos do período em formato brasileiro, protegido contra fórmulas, e fica na auditoria.
- **CONT-CA-10**: Só o administrador acessa o Contábil, pela tela e pela API.
- **CONT-CA-11** [manual]: O painel e a exportação funcionam no celular e no computador, em português.

## Fora do escopo

- Regime de competência, DRE formal, impostos e nota fiscal.
- Contas a pagar, fluxo de caixa projetado e orçamento.
- Integração com banco ou sistema do contador.
- Ocupação calculada com as faixas de preço de cada época (usa as atuais).

## Decisões registradas

- 07/10/2026: o dono pediu para seguir sem esperar revisão ("Eu vou testar depois, pode ir seguindo e fazendo tudo"). Ficam valendo estes padrões, que podem mudar depois sem mexer na arquitetura:
  - Regime de caixa, como no Resultado das aulas (Etapa 4).
  - Suprimento e sangria fora do resultado.
  - Turnos da ocupação: manhã antes das 12h, tarde das 12h às 18h, noite depois.
  - Exportação em CSV no padrão do Excel em português (ponto e vírgula e vírgula decimal).
