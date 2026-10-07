import { EsqueletoTela } from "@/components/base/esqueleto";

/** Enquanto a tela de Aulas carrega: cabeçalho, cartões de turma e a lista, com brilho. */
export default function CarregandoAulas() {
  return <EsqueletoTela cartoes={4} linhas={5} />;
}
