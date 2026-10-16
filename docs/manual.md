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
| Horários             | Tudo          | Ver a agenda                          |
| Contábil             | Sim           | Não                                   |
| Usuários e Auditoria | Sim           | Não                                   |

## Aulas

- **Turmas:** cada turma é um horário fixo da semana: um dia, o início e o fim, o nível, a categoria (masculino, misto ou feminino) e as vagas. Não tem nome nem professor; aparece como "Terça, 19:00 às 20:00 · Iniciante · Misto". Quem treina duas vezes por semana é matriculado em duas turmas. Duas turmas ativas não podem ter aula no mesmo horário. Abra a turma para matricular alunos (respeitando as vagas) e para a **presença**.
- **Presença (administrador e atendente):** abra a turma → Presença, escolha a data da aula e marque presente ou ausente. Dá para corrigir depois.
- **Alunos (administrador):** cadastro com nome, telefone e consentimento obrigatórios; data de nascimento e contato de emergência são opcionais. Com a data informada, menor de 18 anos exige responsável. A busca acha por parte do nome (sem acento) ou do telefone. Na ficha do aluno ficam o plano, a exportação de dados e a anonimização (ver [LGPD](lgpd.md)).
- **Planos:** valor mensal por quantidade de aulas na semana. Na ficha do aluno, escolha o plano, o dia de vencimento e um desconto, se houver.

## Mensalidades

- **Mensalidades:** as do mês são geradas sozinhas. Abra uma para registrar o pagamento (Pix, dinheiro, cartão de débito ou de crédito); o recibo sai na hora.
- **Inadimplentes:** quem está com mensalidade vencida.
- Nada é apagado: um pagamento errado se corrige com **estorno**, que só o administrador faz.

## Horários

- **Agenda:** a quadra dia a dia, das 05h às 24h. As aulas aparecem sozinhas, pelos horários das turmas.
- **Bloquear horário (administrador):** fecha a quadra num dia ou toda semana (até 26 semanas), com motivo, por exemplo manutenção ou evento. Horário com aula de turma não pode ser bloqueado. Na agenda, toque numa hora livre para bloquear.
- **Bloqueio:** abra o bloqueio na agenda para liberar o horário (com motivo), se ainda não começou.
- **Bloqueios semanais:** os que se repetem; encerrar libera as datas que ainda não começaram.
- O nome da quadra muda no fim da agenda, em "Mudar o nome da quadra" (administrador).

## Contábil (administrador)

Escolha o mês ou um período. O painel mostra as mensalidades recebidas, os estornos, o resultado, o que há a receber (mensalidades vencidas), os totais por forma de pagamento, a conferência com os lançamentos e os últimos 12 meses. **Baixar lançamentos (CSV)** gera a planilha para o contador.

## Usuários e Auditoria (administrador)

- **Usuários:** cadastre a equipe com o perfil certo. O sistema mostra uma senha temporária uma única vez; a pessoa troca no primeiro acesso. Inativar encerra as sessões da pessoa.
- **Auditoria:** quem fez o quê, quando e de qual IP. Filtre por pessoa, ação ou período.
