import "server-only";
import { cache } from "react";
import type { Turno } from "@/lib/caixa/tipos";
import { chamarApi } from "./api";

/**
 * Turno do caixa aberto agora (ou null). Uma só chamada à API por requisição: o menu
 * lateral, o Início, o Caixa e a venda usam a mesma resposta.
 */
export const sessaoDoCaixa = cache(() => chamarApi<{ turno: Turno | null }>("/caixa/sessao"));
