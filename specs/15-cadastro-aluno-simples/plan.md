# Etapa 15: Plano técnico

- API (`apps/api/src/aulas/esquemas.ts`): `nascimento` e contato de emergência opcionais (vazio vira `null`); um refine recusa contato pela metade. `exigeResponsavel` devolve `false` sem data.
- `alunos.service.ts`: tipos aceitam `null`; sem data, grava `null`. O banco já aceitava (sem migração).
- Web (`form-aluno.tsx`): campos sem `required` e com "(opcional)" no rótulo e no grupo.
- Testes: unidade (esquema e regra), integração (`aulas-alunos.e2e-spec.ts`).
