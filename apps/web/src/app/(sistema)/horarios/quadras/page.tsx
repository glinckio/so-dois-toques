import type { Metadata } from "next";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { Selo } from "@/components/base/selo";
import { FormNovaQuadra, FormQuadra } from "@/components/horarios/form-quadra";
import { AcessoNegado, Aviso, classeCartao } from "@/components/ui";
import type { Quadra } from "@/lib/horarios/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Quadras | Só Dois Toques" };

/**
 * GASTO-CA-01: as quadras alugadas onde acontecem as turmas. Quadra desativada não
 * recebe turma, contrato nem locação nova; o que já aconteceu nela fica.
 */
export default async function PaginaQuadras() {
  await connection();
  const { usuario } = await exigirArea("horarios");
  if (usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const resposta = await chamarApi<Quadra[]>("/horarios/quadras");
  return (
    <>
      <Cabecalho
        etiqueta="Horários"
        icone="horarios"
        titulo={
          <>
            Quadras <Destaque>alugadas</Destaque>
          </>
        }
        descricao="Cada turma acontece numa quadra. Desative a quadra que deixou de usar."
      />
      <section aria-labelledby="titulo-nova-quadra" className={`${classeCartao} max-w-2xl`}>
        <h2 id="titulo-nova-quadra" className="mb-3 text-lg font-bold">
          Nova quadra
        </h2>
        <FormNovaQuadra />
      </section>
      {!resposta.ok ? (
        <Aviso tipo="erro">{resposta.mensagem}</Aviso>
      ) : (
        <ul aria-label="Quadras" className="flex max-w-2xl flex-col gap-3">
          {resposta.dados.map((q) => (
            <li key={q.id} className={`${classeCartao} flex flex-col gap-3`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold">{q.nome}</p>
                <Selo tom={q.ativa ? "sucesso" : "neutro"}>{q.ativa ? "Ativa" : "Desativada"}</Selo>
              </div>
              <FormQuadra quadra={q} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
