# Manual de uso

Guia curto do sistema Só Dois Toques, versão 1.0.0. Funciona no navegador do celular e do computador; não precisa instalar nada.

## Entrar

1. Abra o endereço do sistema e entre com e-mail e senha.
2. No primeiro acesso (ou depois que o administrador redefinir sua senha), o sistema pede uma senha nova com pelo menos 10 caracteres.
3. Errou a senha 5 vezes seguidas? O e-mail fica bloqueado por 15 minutos.
4. A sessão termina depois de 12 horas sem uso ou 7 dias no total. Use **Sair** em computador compartilhado.

## O que cada perfil vê

| Tela                 | Administrador | Atendente                             |
| -------------------- | ------------- | ------------------------------------- |
| Início               | Sim           | Sim                                   |
| Aulas                | Tudo          | Ver turmas e alunos e marcar presença |
| Mensalidades         | Tudo          | Ver e receber, sem estornos           |
| Horários             | Tudo          | Ver a agenda de cada quadra           |
| Contábil e gastos    | Sim           | Não                                   |
| Usuários e Auditoria | Sim           | Não                                   |

## Aulas

- **Turmas:** cada turma é um horário fixo da semana numa quadra: a quadra, um dia, o início e o fim, o nível, a categoria (masculino, misto ou feminino) e as vagas. Não tem nome nem professor; aparece como "Terça, 19:00 às 20:00 · Iniciante · Misto". Quem treina duas vezes por semana é matriculado em duas turmas. Duas turmas ativas não podem ter aula no mesmo horário na mesma quadra. Abra a turma para matricular alunos (respeitando as vagas) e para a **presença**.
- **Presença (administrador e atendente):** abra a turma → Presença, escolha a data da aula e marque presente ou ausente. Dá para corrigir depois.
- **Alunos (administrador):** cadastro com nome, telefone e consentimento obrigatórios; data de nascimento e contato de emergência são opcionais. Com a data informada, menor de 18 anos exige responsável. A busca acha por parte do nome (sem acento) ou do telefone. Na ficha do aluno ficam o plano, a exportação de dados e a anonimização (ver [LGPD](lgpd.md)).
- **Planos:** valor mensal por quantidade de aulas na semana. Na ficha do aluno, escolha o plano, o dia de vencimento e um desconto, se houver.

## Mensalidades

- **Mensalidades:** as do mês são geradas sozinhas. Abra uma para registrar o pagamento (Pix, dinheiro, cartão de débito ou de crédito); o recibo sai na hora.
- **Inadimplentes:** quem está com mensalidade vencida.
- Nada é apagado: um pagamento errado se corrige com **estorno**, que só o administrador faz.

## Horários

- **Agenda:** uma quadra por vez, dia a dia, das 05h às 24h; com mais de uma quadra ativa, escolha a quadra no topo. As aulas aparecem sozinhas, pelos horários das turmas.
- **Bloquear horário (administrador):** fecha uma quadra num dia ou toda semana (até 26 semanas), com motivo, por exemplo manutenção ou evento. Horário com aula de turma não pode ser bloqueado. Na agenda, toque numa hora livre para bloquear.
- **Bloqueio:** abra o bloqueio na agenda para liberar o horário (com motivo), se ainda não começou.
- **Bloqueios semanais:** os que se repetem; encerrar libera as datas que ainda não começaram.
- **Quadras (administrador):** cadastre as quadras alugadas pelo nome, mude o nome ou desative a que deixou de usar. Quadra desativada não recebe turma, contrato nem locação nova; o histórico dela fica.

## Contábil (administrador)

- **Painel:** escolha o mês ou um período. Mostra o **saldo em caixa** (hoje), as mensalidades recebidas, os estornos, os gastos, o resultado (recebido menos estornos e gastos), o que há a receber (mensalidades vencidas), as saídas por tipo, os totais por forma de pagamento, a conferência com os lançamentos e os últimos 12 meses. **Baixar lançamentos (CSV)** gera a planilha para o contador.
- **Saldo em caixa:** começou com R$ 600,00 em 16/10/2026 (o que sobrou até ali) e sobe ou desce com tudo o que entra e sai a partir dessa data. O saldo inicial não conta como receita do mês.
- **Gastos:** lance a **locação avulsa** de quadra (quadra, dia, valor e forma) e os **outros gastos** (equipamento, investimento ou outro, com descrição). A data é hoje ou antes. Lançamento errado não se apaga: abra-o na lista de saídas e **estorne** com motivo; o valor volta para o caixa.
- **Aluguel mensal:** registre o horário fixo pago por mês (quadra, dia, início e fim, valor, dia do pagamento de 1 a 28, forma e o primeiro mês). Todo mês, no dia do pagamento, o aluguel sai do caixa sozinho, uma vez só. Se o dia do pagamento do primeiro mês já passou, ele sai no dia do registro. Para mudar o valor, encerre o contrato a partir de um mês e registre outro.

## Usuários e Auditoria (administrador)

- **Usuários:** cadastre a equipe com o perfil certo. O sistema mostra uma senha temporária uma única vez; a pessoa troca no primeiro acesso. Inativar encerra as sessões da pessoa.
- **Auditoria:** quem fez o quê, quando e de qual IP. Filtre por pessoa, ação ou período.
