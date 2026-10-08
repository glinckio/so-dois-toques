import { EsqueletoTela } from "@/components/base/esqueleto";

/** Enquanto a tela do estoque carrega: o cabeçalho, os cartões dos produtos e as linhas. */
export default function CarregandoEstoque() {
  return <EsqueletoTela cartoes={3} linhas={4} />;
}
