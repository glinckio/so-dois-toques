import { EsqueletoTela } from "@/components/base/esqueleto";

/** Enquanto o Caixa carrega: o painel do turno, os números do dia e a linha do tempo. */
export default function CarregandoCaixa() {
  return <EsqueletoTela cartoes={3} linhas={6} />;
}
