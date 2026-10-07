# Dados pessoais e LGPD

Este documento descreve os dados pessoais que o sistema Só Dois Toques guarda, para quê, por quanto tempo e como atender a um pedido do titular. Vale para a versão 1.0.0.

## Quem é quem

- **Controlador:** Só Dois Toques (o negócio), que decide para que os dados servem.
- **Quem opera:** a equipe com login no sistema (administradores, professores e atendentes), cada um vendo só o que o perfil permite.
- **Encarregado (DPO):** a definir pelo dono. Até lá, pedidos de titulares vão ao administrador.

## Dados guardados

| De quem                   | Dados                                                                                           | Para quê                                            | Base legal (LGPD, art. 7º)                              | Por quanto tempo                                       |
| ------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| Aluno                     | Nome, telefone, data de nascimento, e-mail e observações (opcionais), contato de emergência     | Matrícula, presença, cobrança e segurança na quadra | Execução de contrato (V) e consentimento registrado (I) | Enquanto for aluno; depois, até pedido de anonimização |
| Responsável (aluno menor) | Nome e telefone do responsável; consentimento dado por ele                                      | Autorização e contato                               | Consentimento do responsável (art. 14)                  | Igual ao aluno                                         |
| Cliente de quadra         | Nome e telefone                                                                                 | Atendimento da reserva                              | Execução de contrato (V)                                | 12 meses depois da reserva; depois, anonimização       |
| Equipe (usuários)         | Nome, e-mail, perfil, hash da senha (Argon2id), sessões com IP e navegador, tentativas de login | Login, segurança e auditoria                        | Legítimo interesse (IX) e obrigação de segurança        | Enquanto ativo; sessões expiram em até 7 dias          |
| Todos                     | Registros de auditoria (quem fez o quê, quando e de qual IP)                                    | Rastrear alterações e prevenir fraude               | Legítimo interesse (IX)                                 | Permanente (a auditoria não pode ser apagada)          |

Dinheiro (mensalidades, pagamentos, vendas, lançamentos do Caixa) não é dado pessoal por si só, mas fica ligado ao aluno ou à reserva. Esses registros nunca são apagados, por obrigação contábil: na anonimização, eles ficam e só o nome e o contato somem.

O sistema não coleta CPF, endereço, foto, dados de saúde ou de cartão. O pagamento é registrado à mão, sem integração com maquininha ou banco.

## Pedidos do titular

| Pedido                           | Como atender                                                                                                                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Saber quais dados temos (acesso) | Aulas → Alunos → abra o aluno → **Exportar dados (LGPD)**. Gera um arquivo JSON com cadastro, consentimento, matrículas e presenças. Fica na auditoria.                                                                                                                                |
| Corrigir dados                   | Aulas → Alunos → abra o aluno → **Editar**.                                                                                                                                                                                                                                            |
| Apagar (eliminação)              | Aulas → Alunos → abra o aluno → **Anonimizar aluno** (digite ANONIMIZAR para confirmar). Nome, telefone, e-mail, nascimento, observações, contato de emergência e responsável somem; matrículas são encerradas; presenças e pagamentos ficam sem identificação. Não pode ser desfeito. |
| Cliente de quadra                | Horários → **Privacidade**: anonimiza de uma vez os clientes de reservas com mais de 12 meses. Para um cliente específico antes disso, peça ao administrador.                                                                                                                          |
| Revogar consentimento            | Mesmo caminho da eliminação (anonimizar).                                                                                                                                                                                                                                              |

Prazo legal de resposta: 15 dias (art. 19, II). Registre a data do pedido.

## Segurança

- Login obrigatório, senha com hash Argon2id, bloqueio após 5 erros no mesmo e-mail ou 20 no mesmo IP em 15 minutos.
- Cada perfil só vê a sua área; a checagem acontece no servidor da API.
- Conexões só por https em produção; cookies `HttpOnly`, `Secure` e `SameSite`.
- Cópias do banco (`pnpm db:backup`) contêm todos os dados pessoais: guarde-as em lugar com acesso restrito e apague as que passarem de 30 dias.
- Os registros de auditoria guardam o nome do aluno em alguns detalhes (por exemplo, "aluno cadastrado"). Eles não são apagados na anonimização, porque a auditoria é imutável; o acesso a eles é só do administrador.

## Incidentes

Se houver suspeita de vazamento (login indevido, cópia do banco perdida): troque a `INTERNAL_API_KEY` e as senhas dos administradores, encerre as sessões (inativar e reativar o usuário encerra as dele), confira a auditoria e avalie a comunicação à ANPD e aos titulares (art. 48).
