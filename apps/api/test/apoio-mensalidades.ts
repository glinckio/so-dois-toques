import type { INestApplication } from "@nestjs/common";
import { paraDataDoBanco } from "../src/aulas/regras.js";
import {
  competenciaAtual,
  primeiroDia,
  proximaCompetencia,
  vencimentoEm,
} from "../src/mensalidades/regras.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import type { Api } from "./apoio-aulas.js";
import { unico } from "./apoio-aulas.js";

export const mesAtual = () => competenciaAtual(new Date());
export const proximoMes = () => proximaCompetencia(mesAtual());

/** "AAAA-MM" de n meses atrás. */
export function mesesAtras(n: number) {
  const [ano, mes] = mesAtual().split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(ano, mes - 1 - n, 1));
  return d.toISOString().slice(0, 7);
}

export async function criarPlano(api: Api, token: string, extra: Record<string, unknown> = {}) {
  const resposta = await api.post(
    "/planos",
    { nome: unico("Plano"), aulasPorSemana: 2, valorCentavos: 15000, ...extra },
    token,
  );
  if (resposta.status !== 201) throw new Error(`plano: ${resposta.status} ${resposta.text}`);
  return resposta.body.id as string;
}

export async function assinar(
  api: Api,
  token: string,
  alunoId: string,
  planoId: string,
  extra: Record<string, unknown> = {},
) {
  const resposta = await api.put(
    `/alunos/${alunoId}/assinatura`,
    { planoId, diaVencimento: 10, inicio: mesAtual(), ...extra },
    token,
  );
  if (resposta.status !== 200) throw new Error(`assinatura: ${resposta.status} ${resposta.text}`);
  return resposta.body.id as string;
}

/**
 * Mensalidade de um mês passado, gravada direto no banco (a API só aceita plano
 * a partir do mês atual). Serve para testar atraso sem depender da data de hoje.
 */
export async function mensalidadeNoPassado(
  app: INestApplication,
  alunoId: string,
  planoId: string,
  criadaPorId: string,
  competencia: string,
  valorCentavos = 15000,
) {
  const prisma = app.get(PrismaService);
  const assinatura = await prisma.assinatura.create({
    data: {
      alunoId,
      planoId,
      diaVencimento: 10,
      inicio: paraDataDoBanco(primeiroDia(competencia)),
      fim: paraDataDoBanco(primeiroDia(proximaCompetencia(competencia))),
      criadaPorId,
    },
  });
  const mensalidade = await prisma.mensalidade.create({
    data: {
      alunoId,
      assinaturaId: assinatura.id,
      competencia: paraDataDoBanco(primeiroDia(competencia)),
      valorCentavos,
      vencimento: paraDataDoBanco(vencimentoEm(competencia, 10)),
    },
  });
  return mensalidade.id;
}
