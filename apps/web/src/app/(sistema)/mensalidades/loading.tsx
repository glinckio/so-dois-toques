import { EsqueletoTela } from "@/components/base/esqueleto";

/** Enquanto as mensalidades carregam: os números do mês e a lista. */
export default function CarregandoMensalidades() {
  return <EsqueletoTela cartoes={3} linhas={6} />;
}
