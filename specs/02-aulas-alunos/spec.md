# Etapa 2: Aulas, alunos e turmas

**Status:** aprovada

## Objetivo

Organizar as aulas que já acontecem nas quadras parceiras: quem são os alunos, em que turmas estão, onde e quando cada turma treina, quem dá a aula e quem compareceu.

## Por quê

Hoje as aulas já geram receita, mas os alunos, as turmas e a presença ficam espalhados. Esta etapa cria a base que as mensalidades (Etapa 3) e o custo das quadras parceiras (Etapa 4) vão usar. Como guarda dados pessoais, ela também aplica a LGPD desde o primeiro cadastro.

## Quem faz o quê

| Ação                                                       | Administrador   | Professor                    | Atendente |
| ---------------------------------------------------------- | --------------- | ---------------------------- | --------- |
| Cadastrar e editar alunos, locais e turmas                 | Sim             | Não                          | Não       |
| Matricular aluno em turma e encerrar matrícula             | Sim             | Não                          | Não       |
| Ver turmas                                                 | Todas           | Só as que ele dá             | Não       |
| Ver alunos (nome, telefone, contato de emergência, turmas) | Todos           | Só os alunos das turmas dele | Não       |
| Registrar presença                                         | Todas as turmas | Só nas turmas dele           | Não       |
| Exportar ou anonimizar os dados de um aluno (LGPD)         | Sim             | Não                          | Não       |

A checagem vale na API; as telas só escondem o que o perfil não pode usar.

## Histórias de usuário

- Como administrador, quero cadastrar alunos com o mínimo de dados e o consentimento registrado, para cumprir a LGPD.
- Como administrador, quero cadastrar os locais onde damos aula (quadras parceiras ou próprias) e as turmas, com nível, professor, dias, horários e número de vagas.
- Como administrador, quero matricular um aluno em uma ou mais turmas e saber quantas vagas sobram.
- Como professor, quero abrir a minha turma no celular, na quadra, e marcar quem veio.
- Como administrador, quero achar um aluno rápido pelo nome ou pelo telefone.
- Como aluno (por meio do administrador), quero receber uma cópia dos meus dados ou pedir que eles sejam apagados.

## Regras de negócio

### Alunos

- Dados guardados: nome, telefone com DDD, data de nascimento, contato de emergência (nome e telefone), e-mail (opcional) e observações (opcional, até 500 caracteres; não é lugar para dado de saúde detalhado). CPF não é coletado nesta etapa.
- Aluno com menos de 18 anos na data do cadastro precisa de responsável (nome e telefone), e o consentimento é dado pelo responsável.
- O cadastro só é salvo com o consentimento marcado: "o aluno (ou o responsável) autorizou o uso destes dados para a organização das aulas". O sistema guarda quando o consentimento foi registrado, quem consentiu (aluno ou responsável) e qual usuário registrou.
- Telefone é guardado só com dígitos (10 ou 11, com DDD). Dois alunos podem ter o mesmo telefone (irmãos com o telefone dos pais).
- Aluno nunca é apagado: fica ativo ou inativo. Aluno inativo não pode ser matriculado, e inativar encerra as matrículas abertas dele.
- A pedido do aluno (LGPD), o administrador pode exportar os dados dele (arquivo JSON) ou anonimizá-lo. A anonimização troca nome, telefones, e-mail, data de nascimento, responsável e observações por valores vazios ou genéricos ("Aluno anonimizado"), encerra as matrículas e não pode ser desfeita. A presença registrada continua existindo, sem identificar a pessoa, para não distorcer os números das turmas.

### Locais

- Local tem nome (único), tipo (quadra parceira ou própria), endereço (opcional) e situação (ativo ou inativo). Local inativo não recebe turma nova.
- O valor pago por hora à quadra parceira entra na Etapa 4.

### Turmas

- Turma tem nome, nível (iniciante, intermediário ou avançado), local, professor, número de vagas (de 1 a 40) e um ou mais horários semanais (dia da semana, hora de início e de fim, entre 05:00 e 23:59, com o fim depois do início).
- O professor da turma é um usuário ativo com perfil Professor ou Administrador.
- Um professor não pode ter duas turmas ativas com horários que se sobreponham no mesmo dia da semana.
- Turma nunca é apagada: fica ativa ou encerrada. Turma encerrada não aceita matrícula nem presença nova, e encerrar a turma encerra as matrículas abertas.
- Diminuir as vagas para menos do que o número de alunos matriculados é recusado.

### Matrículas

- Um aluno pode estar em várias turmas, mas só uma vez em cada (enquanto a matrícula estiver aberta).
- A turma não aceita matrícula além do número de vagas, mesmo com duas matrículas feitas ao mesmo tempo.
- Encerrar uma matrícula guarda a data de saída; o histórico fica.

### Presença

- Uma aula é uma turma em uma data em que ela tem horário (o dia da semana bate com um dos horários da turma). Não dá para registrar presença em data futura nem em data anterior à criação da turma.
- A lista de presença mostra os alunos com matrícula aberta naquela data. Para cada um, o professor marca presente ou ausente.
- A presença pode ser corrigida depois; cada registro guarda quem marcou e quando, e a correção fica na auditoria.

## Critérios de aceite

### Alunos

- **AULAS-CA-01**: Dado um administrador, quando ele cadastra um aluno com nome, telefone, data de nascimento, contato de emergência e consentimento, então o aluno fica salvo com a data do consentimento e quem registrou.
- **AULAS-CA-02**: Sem o consentimento marcado, o cadastro é recusado com uma mensagem clara.
- **AULAS-CA-03**: Dado um aluno com menos de 18 anos, o cadastro só é aceito com nome e telefone do responsável, e o consentimento fica registrado como dado pelo responsável.
- **AULAS-CA-04**: Telefone com formatação ("(21) 99876-5432") é guardado só com dígitos; telefone sem DDD ou com número de dígitos errado é recusado.
- **AULAS-CA-05**: A busca encontra alunos por parte do nome, sem diferenciar acentos nem maiúsculas ("joao" acha "João"), ou por parte do telefone.
- **AULAS-CA-06**: Inativar um aluno encerra as matrículas abertas dele, e aluno inativo não pode ser matriculado.
- **AULAS-CA-07**: O administrador exporta os dados de um aluno em JSON, com cadastro, consentimento, matrículas e presenças, e a exportação fica na auditoria.
- **AULAS-CA-08**: O administrador anonimiza um aluno: os dados pessoais somem de todas as telas e respostas, as matrículas são encerradas, as presenças continuam contando, e a ação fica na auditoria e não pode ser desfeita.

### Locais e turmas

- **AULAS-CA-09**: O administrador cadastra locais (quadra parceira ou própria); nome repetido é recusado, e local inativo não aparece para turma nova.
- **AULAS-CA-10**: O administrador cadastra uma turma com nível, local, professor, vagas e horários semanais; horário com fim antes do início, fora de 05:00–23:59 ou sem nenhum dia é recusado.
- **AULAS-CA-11**: Uma turma não pode ter como professor um usuário inativo ou com perfil Atendente.
- **AULAS-CA-12**: O mesmo professor não pode ter duas turmas ativas com horários sobrepostos no mesmo dia.
- **AULAS-CA-13**: Encerrar uma turma encerra as matrículas abertas, e turma encerrada não aceita matrícula nem presença nova.

### Matrículas

- **AULAS-CA-14**: Turma cheia recusa nova matrícula com "Turma sem vagas", inclusive quando duas matrículas para a última vaga chegam ao mesmo tempo.
- **AULAS-CA-15**: O mesmo aluno pode estar em mais de uma turma, mas não duas vezes na mesma; a tela da turma mostra vagas ocupadas e livres.
- **AULAS-CA-16**: Diminuir as vagas de uma turma para menos do que os matriculados é recusado.

### Presença

- **AULAS-CA-17**: O professor registra a presença da aula de uma data: a lista traz os alunos matriculados naquela data, e cada um fica presente ou ausente.
- **AULAS-CA-18**: Presença em data futura, em dia da semana sem aula da turma ou antes da criação da turma é recusada.
- **AULAS-CA-19**: A presença pode ser corrigida; o registro guarda quem marcou e quando, e a correção aparece na auditoria.

### Permissões

- **AULAS-CA-20**: O professor vê e registra presença só nas turmas que ele dá, e vê só os alunos dessas turmas; tentar outra turma ou outro aluno, pela tela ou pela API, dá "Acesso negado" (ou "não encontrado") e fica na auditoria.
- **AULAS-CA-21**: Professor e atendente não conseguem cadastrar ou alterar alunos, locais, turmas e matrículas, nem exportar ou anonimizar, pela tela nem pela API.
- **AULAS-CA-22**: Cadastro, alteração, inativação, exportação e anonimização de aluno, cadastro e alteração de local e turma, matrícula e encerramento ficam na auditoria com autor, data e IP.

### Telas

- **AULAS-CA-23** [manual]: As telas de alunos, turmas e presença funcionam no celular e no computador, em português; a presença dá para marcar com uma mão, na quadra.

## Fora do escopo

- Mensalidades, planos e pagamentos (Etapa 3).
- Valor da hora nas quadras parceiras e resultado por turma (Etapa 4).
- Reposição de aula, lista de espera e aulas avulsas (experimentais).
- Acesso do próprio aluno ao sistema e envio de mensagens.
- Documentos e fotos do aluno, CPF e dados de saúde detalhados.

## Decisões registradas

- 06/10/2026: o dono pediu para seguir sem esperar revisão. Ficam valendo os padrões abaixo, que podem mudar depois sem mexer na arquitetura:
  - Só o administrador cadastra alunos, locais, turmas e matrículas; o professor vê as próprias turmas e registra presença.
  - Menores de 18 anos são aceitos, com responsável obrigatório.
  - Os dados coletados são os do plano (nome, telefone, nascimento, contato de emergência), mais e-mail e observações opcionais.
