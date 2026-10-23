-- GASTO-CA-04: o contrato guarda o último mês já lançado. O lançamento automático só
-- olha para ele, e não para as linhas do caixa: um mês lançado não volta a entrar
-- quando o lançamento dele é mexido ou some do banco.
ALTER TABLE "ContratoQuadra" ADD COLUMN "lancadoAte" DATE;

-- Os meses que já venceram até hoje contam como lançados (o lançamento roda a cada
-- hora), e também qualquer mês que já tenha lançamento, mesmo com a chave alterada.
WITH hoje AS (
  SELECT (now() AT TIME ZONE 'America/Sao_Paulo')::date AS dia
),
vencido AS (
  SELECT c."id",
    LEAST(
      (date_trunc('month', h.dia)
        - CASE WHEN extract(day FROM h.dia) >= c."diaPagamento"
            THEN interval '0' ELSE interval '1 month' END)::date,
      COALESCE((c."fim" - interval '1 month')::date, 'infinity'::date)
    ) AS mes
  FROM "ContratoQuadra" c CROSS JOIN hoje h
),
ja_lancado AS (
  SELECT c."id", max(to_date(split_part(l."origemId", ':', 2), 'YYYY-MM')) AS mes
  FROM "ContratoQuadra" c
  JOIN "Lancamento" l
    ON l."categoria" = 'ALUGUEL_MENSAL' AND l."origemId" LIKE c."id"::text || ':____-__%'
  GROUP BY c."id"
)
UPDATE "ContratoQuadra" c
SET "lancadoAte" = GREATEST(CASE WHEN v."mes" >= c."inicio" THEN v."mes" END, j."mes")
FROM vencido v
LEFT JOIN ja_lancado j ON j."id" = v."id"
WHERE v."id" = c."id";
