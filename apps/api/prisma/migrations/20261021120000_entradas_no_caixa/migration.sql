-- Etapa 21: entrada manual no caixa (outra receita e aporte). Só acrescenta valores ao
-- tipo; nenhum lançamento é alterado.
ALTER TYPE "CategoriaLancamento" ADD VALUE 'OUTRA_RECEITA';
ALTER TYPE "CategoriaLancamento" ADD VALUE 'APORTE';
