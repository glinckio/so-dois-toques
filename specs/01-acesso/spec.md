# Etapa 1: Acesso e auditoria

**Status:** implementada

## Objetivo

Só pessoas da equipe, com login próprio, entram no sistema, e cada uma vê apenas o que o seu perfil permite. Toda ação importante fica registrada com quem fez e quando.

## Por quê

As próximas etapas guardam dados pessoais de alunos (LGPD) e dinheiro. Sem login, perfis e registro de quem fez o quê, não há como proteger esses dados nem descobrir a origem de um erro no caixa.

## Perfis

| Perfil        | Pode acessar                                        | Não pode acessar                   |
| ------------- | --------------------------------------------------- | ---------------------------------- |
| Administrador | Tudo, incluindo usuários e o painel Contábil        | —                                  |
| Professor     | Aulas (alunos, turmas, presença) e a própria agenda | Contábil, Caixa, Estoque, usuários |
| Atendente     | Horários, Estoque, Caixa                            | Contábil, usuários                 |

O que cada perfil pode fazer dentro de cada módulo é detalhado na spec do módulo. Esta etapa cria os perfis e a checagem; as telas dos módulos ainda não existem. A checagem de permissão vale na API (que é quem guarda os dados); as telas só escondem o que o perfil não pode usar.

## Histórias de usuário

- Como administrador, quero cadastrar as pessoas da equipe com um perfil, para que cada uma tenha seu próprio acesso.
- Como membro da equipe, quero entrar com e-mail e senha pelo celular ou pelo computador.
- Como administrador, quero desativar o acesso de alguém que saiu da equipe sem perder o histórico do que essa pessoa fez.
- Como administrador, quero ver quem entrou no sistema e quem alterou cadastros, para investigar qualquer problema.

## Regras de negócio

- Não existe cadastro aberto. O primeiro administrador é criado por um comando no servidor; os demais usuários são criados por um administrador.
- Usuário é identificado pelo e-mail (único, sem diferenciar maiúsculas). Guardamos só nome, e-mail, perfil e situação (ativo ou desativado).
- Senha com no mínimo 10 caracteres, que não esteja numa lista de senhas comuns e não seja igual ao e-mail. Sem exigência de símbolos ou números (recomendação atual do NIST).
- Usuário criado pelo administrador recebe uma senha temporária e é obrigado a trocá-la no primeiro acesso.
- Usuários nunca são apagados, apenas desativados, para preservar o histórico.
- Sessão expira após 12 horas sem uso e, no máximo, 7 dias após o login.
- Depois de um bloqueio por senha errada, enquanto não houver um acesso com sucesso, cada nova senha errada bloqueia o e-mail por mais 15 minutos.
- O bloqueio vale para qualquer e-mail digitado, exista ele ou não, para que o sistema não revele quais e-mails estão cadastrados.

## Critérios de aceite

### Login e sessão

- **ACESSO-CA-01**: Dado um usuário ativo, quando ele informa e-mail e senha corretos, então entra no sistema e é levado à página inicial.
- **ACESSO-CA-02**: Dado e-mail inexistente ou senha errada, então a mensagem é sempre "E-mail ou senha incorretos", sem indicar qual dos dois está errado, e o tempo de resposta é equivalente nos dois casos.
- **ACESSO-CA-03**: Dadas 5 tentativas erradas seguidas para o mesmo e-mail, então o acesso a esse e-mail fica bloqueado por 15 minutos, mesmo com a senha certa, e o bloqueio é registrado na auditoria.
- **ACESSO-CA-04**: Dadas 20 tentativas erradas vindas do mesmo endereço IP em 15 minutos, então novas tentativas desse IP são recusadas até o fim do período.
- **ACESSO-CA-05**: Dado um visitante sem sessão, quando ele acessa qualquer página do sistema (exceto login), então é levado para a tela de login; e qualquer chamada à API (exceto login e health check) responde 401.
- **ACESSO-CA-06**: Dada uma sessão sem uso por 12 horas, ou com 7 dias desde o login, então ela deixa de valer e o usuário precisa entrar de novo.
- **ACESSO-CA-07**: Quando o usuário sai do sistema, então a sessão é invalidada no servidor, e reutilizar o cookie antigo não dá acesso.
- **ACESSO-CA-08**: O cookie de sessão é `HttpOnly`, `Secure` (em produção) e `SameSite=Lax`, e guarda só um identificador aleatório; o banco guarda apenas o hash desse identificador.
- **ACESSO-CA-09**: Senhas são guardadas apenas como hash Argon2id; nenhuma senha aparece em log, auditoria ou resposta.

### Perfis e permissões

- **ACESSO-CA-10**: Dado um Professor ou Atendente, quando ele tenta acessar uma área fora do seu perfil, seja pela tela, pelo endereço digitado ou chamando a API diretamente, então recebe "Acesso negado" e a tentativa é registrada na auditoria.
- **ACESSO-CA-11**: Os itens de menu mostram apenas as áreas que o perfil pode acessar.

### Gestão de usuários (somente Administrador)

- **ACESSO-CA-12**: O administrador cadastra um usuário com nome, e-mail e perfil; o sistema gera uma senha temporária exibida uma única vez.
- **ACESSO-CA-13**: No primeiro acesso com senha temporária, o usuário só consegue usar o sistema depois de definir uma senha nova que siga as regras.
- **ACESSO-CA-14**: Ao desativar um usuário, todas as sessões dele são encerradas na hora e ele não consegue mais entrar; o histórico dele continua visível.
- **ACESSO-CA-15**: O administrador pode alterar o perfil de um usuário e gerar uma nova senha temporária; as sessões abertas desse usuário são encerradas.
- **ACESSO-CA-16**: O sistema nunca fica sem administrador ativo: desativar ou rebaixar o último administrador é recusado.
- **ACESSO-CA-17**: Ao trocar a própria senha, o usuário confirma a senha atual, e as outras sessões dele são encerradas.

### Auditoria

- **ACESSO-CA-18**: São registrados, com autor, data e hora, endereço IP e detalhe: login com sucesso, login recusado, bloqueio, saída, acesso negado, criação e alteração de usuário, desativação, troca e redefinição de senha.
- **ACESSO-CA-19**: Registros de auditoria não podem ser alterados nem apagados, nem pelo sistema nem por consulta direta ao banco feita pela aplicação.
- **ACESSO-CA-20**: O administrador consulta a auditoria filtrando por período, usuário e tipo de ação, com paginação.

### Primeiro administrador

- **ACESSO-CA-21**: O comando `pnpm admin:criar` cria o primeiro administrador pedindo nome, e-mail e senha no terminal; se já existir um administrador ativo, ele recusa.
- **ACESSO-CA-22** [manual]: As telas de login, troca de senha, usuários e auditoria funcionam no celular e no computador, em português.

## Fora do escopo

- Login com Google ou outro provedor.
- Recuperação de senha por e-mail (o administrador redefine). Pode entrar depois, quando houver envio de e-mail.
- Autenticação em dois fatores. Recomendada para o perfil Administrador numa etapa futura.
- Acesso de alunos ao sistema.

## Decisões registradas

- 06/10/2026: o dono pediu para seguir sem esperar revisão; ficam valendo os tempos de sessão propostos (12 horas sem uso, 7 dias no máximo). Podem ser ajustados depois sem mudar a arquitetura.
- O primeiro administrador (nome e e-mail) é definido na hora de colocar em produção.
