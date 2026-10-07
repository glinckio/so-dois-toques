# Manual de uso

Guia curto do sistema Só Dois Toques, versão 1.0.0. Funciona no navegador do celular e do computador; não precisa instalar nada.

## Entrar

1. Abra o endereço do sistema e entre com e-mail e senha.
2. No primeiro acesso (ou depois que o administrador redefinir sua senha), o sistema pede uma senha nova com pelo menos 10 caracteres.
3. Errou a senha 5 vezes seguidas? O e-mail fica bloqueado por 15 minutos.
4. A sessão termina depois de 12 horas sem uso ou 7 dias no total. Use **Sair** em computador compartilhado.

## O que cada perfil vê

| Tela                 | Administrador | Atendente         | Professor             |
| -------------------- | ------------- | ----------------- | --------------------- |
| Início               | Sim           | Sim               | Sim                   |
| Aulas                | Tudo          | Não               | Só as próprias turmas |
| Horários             | Tudo          | Reservas          | Não                   |
| Estoque              | Tudo          | Vender e comprar  | Não                   |
| Caixa                | Tudo          | Sim, sem estornos | Não                   |
| Contábil             | Sim           | Não               | Não                   |
| Usuários e Auditoria | Sim           | Não               | Não                   |

## Aulas

- **Turmas:** cada turma tem local, professor, nível, vagas e horários da semana. Abra a turma para matricular alunos (respeitando as vagas) e para a **presença**.
- **Presença (professor):** abra a turma → Presença, escolha a data da aula e marque presente ou ausente. Dá para corrigir depois.
- **Alunos (administrador):** cadastro com consentimento obrigatório; menor de 18 anos exige responsável. A busca acha por parte do nome (sem acento) ou do telefone. Na ficha do aluno ficam o plano, a exportação de dados e a anonimização (ver [LGPD](lgpd.md)).
- **Locais:** quadras parceiras ou próprias, com o valor da hora cobrado pelo parceiro.
- **Planos:** valor mensal por quantidade de aulas na semana. Na ficha do aluno, escolha o plano, o dia de vencimento e um desconto, se houver.
- **Custos:** horas pagas às quadras parceiras.
- **Resultado:** receita, custo de quadra e margem de cada turma e professor no mês.

## Caixa

- **Caixa do dia:** abra o turno com o troco inicial. Registre suprimento, sangria, despesa ou receita avulsa. No fim, feche informando o dinheiro contado; a diferença fica registrada com observação.
- **Mensalidades:** as do mês são geradas sozinhas. Abra uma para registrar o pagamento (Pix, dinheiro, cartão de débito ou de crédito); o recibo sai na hora.
- **Inadimplentes:** quem está com mensalidade vencida.
- **Turnos:** histórico e relatório de cada turno.
- Nada é apagado: um erro se corrige com **estorno**, que só o administrador faz.

## Horários

- **Grade:** as duas quadras, dia a dia, com horários livres, reservados e bloqueados. Toque num horário livre para reservar.
- **Nova reserva:** avulsa ou semanal (até 26 semanas), de 1 a 4 horas. O valor vem das faixas de preço.
- **Reserva:** registrar pagamento, cancelar (com menos de 24 horas, só o administrador) e, se paga, o cancelamento devolve o valor.
- **Fixas:** reservas semanais; encerrar cancela as próximas que não foram pagas.
- **Preços e quadras (administrador):** faixas de horário com o preço da hora, por dia da semana; elas também definem quando a quadra funciona. Também renomeia as quadras.
- **Privacidade (administrador):** apaga nome e telefone de clientes de reservas com mais de 12 meses.
- **Bloqueio (administrador):** em Nova reserva, escolha "Bloqueio" para reservar horário de aula ou manutenção.

## Estoque

- **Produtos:** itens da lanchonete com estoque atual e mínimo; o que está abaixo do mínimo aparece em destaque.
- **Vender:** precisa do caixa aberto. Escolha os itens e a forma de pagamento; o estoque baixa e o dinheiro entra no Caixa.
- **Compra:** entrada de mercadoria com o custo; o custo médio é recalculado.
- **Ajuste (administrador):** perda, quebra ou contagem.
- **Vendas do dia:** lista das vendas, com estorno pelo administrador.

## Contábil (administrador)

Escolha o mês ou um período. O painel mostra receitas por origem (aulas, locação, lanchonete, outras), despesas por tipo, resultado e margem, a conferência com o Caixa, a margem da lanchonete, a ocupação das quadras por turno, o que há a receber e os últimos 12 meses. **Baixar lançamentos (CSV)** gera a planilha para o contador.

## Usuários e Auditoria (administrador)

- **Usuários:** cadastre a equipe com o perfil certo. O sistema mostra uma senha temporária uma única vez; a pessoa troca no primeiro acesso. Inativar encerra as sessões da pessoa.
- **Auditoria:** quem fez o quê, quando e de qual IP. Filtre por pessoa, ação ou período.
