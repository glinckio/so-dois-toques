# Etapa 12: Foco em aulas

**Status:** rascunho

## Objetivo

Deixar o sistema só com o que o dono vai usar: as aulas na única quadra própria. Saem o Estoque, o Caixa (turnos, avulsos e a tela), as quadras parceiras e o aluguel de quadra para clientes. Ficam alunos, turmas, presença, planos, mensalidades, a agenda da quadra, o Contábil, usuários e auditoria.

## Por quê

O dono decidiu não usar mais a lanchonete, o caixa com turnos nem o aluguel avulso da quadra. Ele tem uma quadra só e quer controlar nela os horários das turmas e dos alunos, junto com plano e mensalidade. Telas e regras que ninguém usa confundem a equipe, deixam o menu cheio e custam manutenção e testes.

O sistema ainda não tem dados reais dessas partes, então as tabelas podem ser apagadas.

## O que sai

| Parte                                    | Sai                                                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estoque (Etapa 6)                        | Tudo: produtos, vendas, compras, movimentos, telas, rotas e o resumo no Início                                                                        |
| Caixa (Etapa 5 e parte da 3)             | Abertura e fechamento de turno, suprimento, sangria, despesa e receita avulsa, estorno de avulso, relatório do turno, tela do Caixa e status do caixa |
| Quadras parceiras (Etapa 4)              | Valor da hora do local, horas e custo previsto, pagamento à quadra, custo por turma e o tipo de local "parceira"                                      |
| Aluguel de quadra (Etapa 7)              | Reserva de cliente avulsa e fixa (mensalista), faixas de preço, pagamento e estorno de reserva, segunda quadra                                        |
| Anonimização de clientes de reservas (9) | A tela e a rota, porque não há mais cliente de reserva                                                                                                |
| Contábil (Etapa 8)                       | Despesas, conferência da gaveta, lanchonete, ocupação das quadras e reservas a receber                                                                |

## O que fica e como fica

### Aulas, planos e mensalidades

- Alunos, turmas, matrículas, presença, planos, assinaturas e mensalidades continuam com as mesmas regras das Etapas 2 e 3.
- Toda turma acontece na quadra. O cadastro de locais sai e a turma deixa de ter campo de local.
- O pagamento da mensalidade continua gerando, na mesma transação, um lançamento de entrada no livro-razão, com recibo e estorno pelo administrador. O lançamento não tem mais turno.
- O livro-razão continua imutável: só entra lançamento de mensalidade e de estorno.

### Agenda da quadra (Horários)

- Uma quadra só, com o nome que o administrador escolher (2 a 40 caracteres). Nasce como "Quadra".
- A grade de um dia mostra, das 05h às 24h, os horários das turmas ativas naquele dia (nome da turma, professor, vagas ocupadas) e os bloqueios.
- A aula aparece na grade a partir do dia de início da turma e até o dia anterior ao encerramento, sem cadastro à mão.
- A quadra tem um dono por horário: duas turmas ativas não podem ter horários sobrepostos no mesmo dia da semana, mesmo com professores diferentes. A regra de não sobrepor turmas do mesmo professor (AULAS-CA-12) continua.
- O administrador bloqueia um horário (avulso ou semanal, até 26 semanas) com motivo, por exemplo "Manutenção" ou "Evento". Bloqueio é de horas inteiras, entre 05h e 24h.
- Bloqueio que cai sobre aula de turma ativa é recusado e as datas em conflito são informadas. Turma nova ou horário novo de turma que cai sobre bloqueio futuro também é recusado, com as datas.
- O bloqueio se cancela com motivo; horário que já começou não cancela.
- Na grade, o administrador e o atendente veem todas as turmas; o professor vê a grade e destaca as turmas dele.

### Contábil

- Mostra, no período: mensalidades recebidas, estornos, resultado (recebido menos estornos), totais por forma de pagamento, mensalidades vencidas e não pagas (quantidade e valor) e o comparativo dos 12 meses.
- A exportação em CSV dos lançamentos do período continua igual.
- Só o administrador acessa.

### Início e menu

- O Início deixa de mostrar caixa e estoque. Mostra as aulas de hoje, as mensalidades atrasadas e o recebido no mês (este último só para o administrador).
- Menu: Início, Aulas, Horários, Contábil, Usuários e Auditoria. A busca rápida perde "Registrar venda", "Lançar no caixa" e "Nova reserva" e ganha "Bloquear horário" para o administrador.

### Banco de dados

- Uma migração apaga as tabelas, colunas e valores de enum das partes que saem.
- A migração para sem mexer em nada se encontrar algum produto, venda, compra, turno de caixa, lançamento que não seja de mensalidade ou estorno de mensalidade, pagamento a quadra parceira, reserva de cliente, local parceiro ou turma em local diferente do primeiro local próprio. A mensagem diz o que foi encontrado. Assim um banco com dados reais nunca perde nada em silêncio.

### Specs antigas

- As Etapas 4, 5 e 6 passam ao status `substituída`, com uma linha apontando para esta etapa. A verificação `pnpm check:specs` aceita esse status e não cobra testes delas.
- Nas Etapas 2, 3, 7, 8, 9 e 11, cada critério que deixou de valer recebe a marca `[removido]` e a verificação deixa de cobrá-lo. Os critérios que mudaram de sentido são reescritos nesta spec.
- Manual, LGPD e guia de implantação (`docs/`) são atualizados.

## Quem faz o quê

| Ação                                    | Administrador | Atendente | Professor |
| --------------------------------------- | ------------- | --------- | --------- |
| Ver a grade da quadra                   | Sim           | Sim       | Sim       |
| Bloquear e cancelar bloqueio            | Sim           | Não       | Não       |
| Renomear a quadra                       | Sim           | Não       | Não       |
| Mensalidades: ver e registrar pagamento | Sim           | Sim       | Não       |
| Contábil                                | Sim           | Não       | Não       |

A checagem vale na API; as telas só escondem o que o perfil não pode usar.

## Critérios de aceite

- **FOCO-CA-01**: As rotas da API de estoque, caixa, custos de quadras parceiras, faixas de preço, reservas, séries de reserva e anonimização de clientes de reservas não existem mais (respondem 404), e as telas correspondentes do web também.
- **FOCO-CA-02**: O menu, a barra do celular e a busca rápida de cada perfil não mostram Estoque, Caixa nem ações de venda, caixa ou reserva.
- **FOCO-CA-03**: Pagar uma mensalidade cria o lançamento de entrada sem turno; estornar cria o lançamento de saída ligado ao original; o livro-razão continua recusando alteração e exclusão.
- **FOCO-CA-04**: A turma é cadastrada sem local; duas turmas ativas com horários sobrepostos no mesmo dia da semana são recusadas, mesmo com professores diferentes, inclusive ao alterar os horários de uma turma.
- **FOCO-CA-05**: A grade de um dia mostra os horários das turmas ativas naquele dia, só entre o início e o encerramento de cada turma, e os bloqueios não cancelados.
- **FOCO-CA-06**: O administrador bloqueia horário avulso ou semanal com motivo; bloqueio sobre aula de turma ativa ou sobre outro bloqueio é recusado com as datas em conflito; turma ou horário de turma que cai sobre bloqueio futuro é recusado com as datas.
- **FOCO-CA-07**: O bloqueio é cancelado com motivo; bloqueio já começado não cancela; o horário volta a ficar livre.
- **FOCO-CA-08**: Administrador, atendente e professor veem a grade; só o administrador bloqueia, cancela bloqueio e renomeia a quadra, pela tela e pela API.
- **FOCO-CA-09**: O Contábil mostra recebido, estornos, resultado, totais por forma, mensalidades vencidas não pagas e o comparativo de 12 meses, e o resultado confere com entradas menos saídas do livro-razão no período.
- **FOCO-CA-10**: O Início não mostra caixa nem estoque; mostra as aulas de hoje e as mensalidades atrasadas, e o recebido no mês só para o administrador.
- **FOCO-CA-11**: A migração, num banco com dados de alguma parte que sai, para sem alterar nada e diz o que encontrou; num banco só com dados de aulas e mensalidades, apaga as partes que saem e mantém alunos, turmas, presenças, mensalidades, pagamentos e lançamentos.
- **FOCO-CA-12**: `pnpm check:specs` aceita o status `substituída` e a marca `[removido]` sem cobrar testes, e continua cobrando os demais critérios.
- **FOCO-CA-13**: Renomear a quadra, bloquear e cancelar bloqueio ficam na auditoria com autor, data e IP.
- **FOCO-CA-14** [manual]: A grade, o bloqueio, as turmas, o Início e o Contábil funcionam no celular e no computador, em português.
- **FOCO-CA-15** [manual]: `docs/manual.md`, `docs/lgpd.md` e `docs/implantacao.md` não citam mais estoque, caixa, quadras parceiras nem clientes de reserva.

## Fora do escopo

- Reserva de horário pelo aluno ou por cliente.
- Reposição de aula, aula experimental e lista de espera de turma.
- Despesas no Contábil (por exemplo, conta de luz da quadra).
- Guardar os dados antigos das partes que saem: não há dados reais.

## Decisões registradas

- 15/10/2026: o dono pediu para tirar estoque e caixa e ficar só com aulas, controlando os horários da única quadra e os horários, planos e mensalidades dos alunos. Respostas dele:
  - O Contábil fica.
  - Na quadra não há aluguel para clientes: a agenda tem só aulas e bloqueios.
  - Não há mais aulas em quadras parceiras.
  - O banco de produção não tem dados reais de caixa nem de estoque; as tabelas podem ser apagadas.
- Grade das 05h às 24h, o mesmo limite dos horários de turma, em vez de configurar horário de funcionamento.
