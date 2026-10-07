# Etapa 7: Horários das quadras

**Status:** aprovada

## Objetivo

Ver na hora quais horários das duas quadras de areia estão livres e quais estão ocupados, reservar para clientes avulsos e mensalistas, bloquear horários para as aulas e receber o aluguel pelo Caixa.

## Por quê

Hoje a agenda das quadras fica no caderno ou no WhatsApp, o que gera reserva dobrada e aluguel esquecido. Esta etapa garante que um horário só tem um dono e liga cada aluguel pago ao livro-razão, o que alimenta o Contábil (Etapa 8).

## Quem faz o quê

| Ação                                                 | Administrador | Atendente               | Professor |
| ---------------------------------------------------- | ------------- | ----------------------- | --------- |
| Ver a grade das quadras                              | Sim           | Sim                     | Não       |
| Reservar (avulsa ou fixa semanal)                    | Sim           | Sim                     | Não       |
| Receber o pagamento da reserva                       | Sim           | Sim                     | Não       |
| Cancelar reserva com 24 horas ou mais de antecedência | Sim           | Sim                     | Não       |
| Cancelar reserva com menos de 24 horas               | Sim           | Não                     | Não       |
| Encerrar série fixa                                  | Sim           | Sim (ocorrências ≥ 24h) | Não       |
| Bloquear horário (aulas, manutenção, evento)         | Sim           | Não                     | Não       |
| Configurar faixas de preço e nome das quadras        | Sim           | Não                     | Não       |
| Estornar pagamento de reserva                        | Sim           | Não                     | Não       |

A checagem vale na API; as telas só escondem o que o perfil não pode usar.

## Histórias de usuário

- Como atendente, quero abrir o dia no celular e ver de relance o que está livre em cada quadra.
- Como atendente, quero reservar um horário para um cliente, com nome e telefone, e receber em Pix, dinheiro ou cartão.
- Como atendente, quero cadastrar um mensalista que joga toda terça às 19h sem marcar semana por semana.
- Como administrador, quero definir o preço da hora por dia da semana e horário (por exemplo, mais caro à noite).
- Como administrador, quero bloquear os horários das aulas para ninguém reservar por cima.

## Regras de negócio

### Quadras e faixas de preço

- São duas quadras, criadas na instalação como "Quadra 1" e "Quadra 2". O administrador pode renomear (2 a 40 caracteres, nome único).
- Faixa de preço: dia da semana, hora de início e de fim (horas inteiras, de 0h a 24h) e valor da hora (R$ 1,00 a R$ 2.000,00). Vale para as duas quadras.
- As faixas definem também o horário de funcionamento: hora sem faixa não pode ser reservada.
- Faixas do mesmo dia não se sobrepõem. O administrador cria a mesma faixa para vários dias de uma vez e remove faixas; mudar faixas não muda o valor de reservas já feitas.

### Reservas

- Reserva: quadra, data, hora de início e duração de 1 a 4 horas inteiras, nome do cliente (2 a 80 caracteres) e telefone opcional (com DDD).
- Só para hoje (horário ainda não começado) ou para frente, até 180 dias. Todas as horas precisam estar dentro das faixas do dia.
- O valor é a soma do preço de cada hora, pela faixa em que ela cai, e fica guardado na reserva.
- Duas reservas ou bloqueios nunca ocupam a mesma quadra no mesmo horário, nem com dois cliques ao mesmo tempo. O banco garante isso.

### Reserva fixa (mensalista)

- Mesma quadra, dia da semana e horário toda semana, de uma data inicial até uma final, no máximo 26 ocorrências.
- Cria todas as ocorrências de uma vez. Se alguma cai num horário ocupado, nada é criado e as datas em conflito são informadas.
- Cada ocorrência é uma reserva comum: paga e cancela uma a uma.
- Encerrar a série cancela as ocorrências futuras ainda não pagas, respeitando a regra das 24 horas para o atendente. As pagas continuam.

### Bloqueios

- O administrador bloqueia um horário (avulso ou semanal, como a reserva fixa) com motivo, por exemplo "Aula turma iniciante". O bloqueio ocupa a grade, não tem valor nem cliente e se cancela como uma reserva.

### Pagamento

- A reserva é paga uma vez, pelo valor dela, com forma de pagamento, na data de hoje. Gera, na mesma transação, um lançamento de entrada no Caixa, categoria "Aluguel de quadra", ligado ao turno aberto, se houver.
- Como na mensalidade, o pagamento é aceito com o caixa fechado (fica fora de turno).
- O administrador estorna o pagamento com motivo: um lançamento de saída de mesmo valor é criado, ligado ao original, e a reserva volta a ficar a pagar.
- A descrição do lançamento não leva dado pessoal do cliente: só a quadra, a data e o horário.

### Cancelamento

- Cancela com motivo. Horário que já começou não cancela.
- Com menos de 24 horas para o início, só o administrador cancela.
- Cancelar reserva paga estorna o pagamento junto, na mesma transação (devolução).
- O horário volta a ficar livre; a reserva cancelada fica no histórico.

## Critérios de aceite

- **HOR-CA-01**: O administrador cria faixas de preço para um ou vários dias e remove faixas; faixa que se sobrepõe a outra do mesmo dia, hora de fim antes do início e valor fora da faixa são recusados.
- **HOR-CA-02**: A grade de um dia mostra, para cada quadra, as horas de funcionamento com reservas e bloqueios (cliente, valor e se está pago); reservas canceladas não aparecem.
- **HOR-CA-03**: Reserva avulsa dentro das faixas é criada com o valor somado pelas faixas; data passada, horário já começado, mais de 180 dias, hora fora das faixas, duração inválida ou horário ocupado são recusados.
- **HOR-CA-04**: Duas reservas ao mesmo tempo para a mesma quadra e horário: só uma passa.
- **HOR-CA-05**: A reserva fixa cria todas as ocorrências semanais até a data final; se alguma conflita, nada é criado e as datas são informadas; encerrar a série cancela as futuras não pagas e mantém as pagas.
- **HOR-CA-06**: O administrador bloqueia horário avulso ou semanal com motivo; o bloqueio ocupa a grade sem valor e impede reservas por cima.
- **HOR-CA-07**: Pagar a reserva cria um lançamento de entrada "Aluguel de quadra" com o valor da reserva, ligado ao turno aberto se houver; pagar de novo é recusado; o administrador estorna com motivo e a reserva volta a ficar a pagar.
- **HOR-CA-08**: Cancelar com motivo libera o horário; com menos de 24 horas só o administrador cancela; horário já começado não cancela; cancelar reserva paga estorna o pagamento junto.
- **HOR-CA-09**: O atendente vê a grade, reserva, recebe e cancela com antecedência, mas não configura faixas, não bloqueia e não estorna; o professor não acessa os horários, pela tela nem pela API.
- **HOR-CA-10**: Faixas, nome de quadra, reservas, séries, bloqueios, pagamentos, estornos e cancelamentos ficam na auditoria com autor, data e IP.
- **HOR-CA-11** [manual]: A grade, a reserva, o detalhe da reserva e as faixas funcionam no celular e no computador, em português.

## Fora do escopo

- Reserva pelo próprio cliente (site ou app) e pagamento online.
- Cadastro de clientes com histórico; o cliente é só nome e telefone na reserva.
- Meia hora, preço por quadra diferente e promoção.
- Sinal ou pagamento parcial, multa por falta.
- Bloqueio automático a partir das turmas de Aulas.

## Decisões registradas

- 06/10/2026: o dono pediu para seguir sem esperar revisão ("Eu vou testar depois, pode ir seguindo e fazendo tudo"). Ficam valendo estes padrões, que podem mudar depois sem mexer na arquitetura:
  - Horas inteiras, de 1 a 4 horas por reserva; mesmo preço nas duas quadras.
  - Cancelamento com menos de 24 horas só pelo administrador; cancelar reserva paga devolve o valor.
  - Reserva fixa de até 26 semanas, paga por ocorrência.
  - Bloqueio das aulas feito à mão pelo administrador, porque o local próprio ainda não está confirmado.
  - Horário de São Paulo sem horário de verão (UTC−3), como é desde 2019.
