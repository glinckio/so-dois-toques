"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { centavosDe, formatarReais } from "@/lib/mensalidades/formatacao";
import { chamarApi, type RespostaApi } from "@/lib/servidor/api";
import type { EstadoFormulario } from "./estado";
import { erroComValores } from "./formulario";

// As regras e a permissão de cada ação ficam na API; aqui só montamos o pedido.

const id = z.uuid();
const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const numero = (form: FormData, campo: string) => Number(texto(form, campo) || Number.NaN);

function erroDe(resposta: Extract<RespostaApi<unknown>, { ok: false }>): EstadoFormulario {
  return { erro: resposta.campos?.[0]?.mensagem ?? resposta.mensagem };
}

const CAMPOS_RESERVA = [
  "tipo",
  "repeticao",
  "quadraId",
  "data",
  "dataFim",
  "horaInicio",
  "duracao",
  "clienteNome",
  "clienteTelefone",
  "motivo",
] as const;
const CAMPOS_FAIXA = ["horaInicio", "horaFim", "valor"] as const;

/** HOR-CA-03, 05 e 06: reserva ou bloqueio, avulso ou semanal. */
export async function criarReserva(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const tipo = texto(form, "tipo") === "BLOQUEIO" ? "BLOQUEIO" : "RESERVA";
  const semanal = texto(form, "repeticao") === "SEMANAL";
  const quem =
    tipo === "RESERVA"
      ? {
          clienteNome: texto(form, "clienteNome"),
          clienteTelefone: texto(form, "clienteTelefone") || null,
        }
      : { motivo: texto(form, "motivo") };
  const quando = semanal
    ? { repeticao: "SEMANAL", dataInicio: texto(form, "data"), dataFim: texto(form, "dataFim") }
    : { repeticao: "AVULSA", data: texto(form, "data") };
  const resposta = await chamarApi<{ id: string; reservas: number }>("/horarios/reservas", {
    metodo: "POST",
    corpo: {
      tipo,
      ...quem,
      ...quando,
      quadraId: texto(form, "quadraId"),
      horaInicio: numero(form, "horaInicio"),
      duracao: numero(form, "duracao"),
    },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_RESERVA);
  redirect(`/horarios/reservas/${resposta.dados.id}?criada=${resposta.dados.reservas}`);
}

/** HOR-CA-07 */
export async function pagarReserva(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const reservaId = id.safeParse(form.get("reservaId"));
  if (!reservaId.success) return { erro: "Reserva inválida." };
  const resposta = await chamarApi<{ semTurno: boolean }>(
    `/horarios/reservas/${reservaId.data}/pagar`,
    { metodo: "POST", corpo: { forma: texto(form, "forma") } },
  );
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return {
    sucesso: resposta.dados.semTurno
      ? "Pagamento registrado fora de turno: o caixa está fechado."
      : "Pagamento registrado no caixa.",
  };
}

export async function estornarPagamentoReserva(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const reservaId = id.safeParse(form.get("reservaId"));
  if (!reservaId.success) return { erro: "Reserva inválida." };
  const resposta = await chamarApi(`/horarios/reservas/${reservaId.data}/estornar-pagamento`, {
    metodo: "POST",
    corpo: { motivo: texto(form, "motivo") },
  });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Pagamento estornado." };
}

/** HOR-CA-08 */
export async function cancelarReserva(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const reservaId = id.safeParse(form.get("reservaId"));
  if (!reservaId.success) return { erro: "Reserva inválida." };
  const resposta = await chamarApi<{ estornoLancamentoId: string | null }>(
    `/horarios/reservas/${reservaId.data}/cancelar`,
    { metodo: "POST", corpo: { motivo: texto(form, "motivo") } },
  );
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return {
    sucesso: resposta.dados.estornoLancamentoId
      ? "Reserva cancelada e pagamento devolvido."
      : "Reserva cancelada. O horário está livre.",
  };
}

/** HOR-CA-05 */
export async function encerrarSerie(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const serieId = id.safeParse(form.get("serieId"));
  if (!serieId.success) return { erro: "Reserva fixa inválida." };
  const resposta = await chamarApi<{ canceladas: number; mantidas: number }>(
    `/horarios/series/${serieId.data}/encerrar`,
    { metodo: "POST", corpo: {} },
  );
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  const { canceladas, mantidas } = resposta.dados;
  return {
    sucesso:
      `Reserva fixa encerrada: ${canceladas} ${canceladas === 1 ? "data cancelada" : "datas canceladas"}` +
      (mantidas > 0
        ? `, ${mantidas} mantida${mantidas === 1 ? "" : "s"} (paga ou perto demais).`
        : "."),
  };
}

/** HOR-CA-01 */
export async function criarFaixas(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const dias = form
    .getAll("dias")
    .map(Number)
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  const valorHoraCentavos = centavosDe(texto(form, "valor"));
  if (valorHoraCentavos === null) {
    return erroComValores({ erro: "Valor inválido: use o formato 80,00." }, form, CAMPOS_FAIXA);
  }
  const resposta = await chamarApi("/horarios/faixas", {
    metodo: "POST",
    corpo: {
      dias,
      horaInicio: numero(form, "horaInicio"),
      horaFim: numero(form, "horaFim"),
      valorHoraCentavos,
    },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, CAMPOS_FAIXA);
  refresh();
  return { sucesso: `Faixa de ${formatarReais(valorHoraCentavos)} por hora criada.` };
}

export async function removerFaixa(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const faixaId = id.safeParse(form.get("faixaId"));
  if (!faixaId.success) return { erro: "Faixa inválida." };
  const resposta = await chamarApi(`/horarios/faixas/${faixaId.data}`, { metodo: "DELETE" });
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  return { sucesso: "Faixa removida." };
}

export async function renomearQuadra(
  _: EstadoFormulario,
  form: FormData,
): Promise<EstadoFormulario> {
  const quadraId = id.safeParse(form.get("quadraId"));
  if (!quadraId.success) return { erro: "Quadra inválida." };
  const resposta = await chamarApi(`/horarios/quadras/${quadraId.data}`, {
    metodo: "PATCH",
    corpo: { nome: texto(form, "nome") },
  });
  if (!resposta.ok) return erroComValores(erroDe(resposta), form, ["nome"]);
  refresh();
  return { sucesso: "Nome da quadra salvo." };
}

/** LANC-CA-07: anonimiza os clientes das reservas além do prazo de guarda. */
export async function anonimizarClientes(): Promise<EstadoFormulario> {
  const resposta = await chamarApi<{ reservas: number; series: number }>(
    "/horarios/clientes/anonimizar",
    { metodo: "POST", corpo: { confirmar: true } },
  );
  if (!resposta.ok) return erroDe(resposta);
  refresh();
  const { reservas, series } = resposta.dados;
  return {
    sucesso: `Clientes anonimizados: ${reservas} ${reservas === 1 ? "reserva" : "reservas"} e ${series} ${series === 1 ? "reserva fixa" : "reservas fixas"}.`,
  };
}
