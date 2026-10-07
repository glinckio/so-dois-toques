import type { Metadata } from "next";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { FormReserva } from "@/components/horarios/form-reserva";
import { Aviso } from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { Faixa, Quadra } from "@/lib/horarios/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Nova reserva | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** HOR-CA-03, 05 e 06: reserva avulsa, fixa ou bloqueio. */
export default async function PaginaNovaReserva({ searchParams }: PageProps<"/horarios/nova">) {
  await connection();
  const { usuario } = await exigirArea("horarios");
  const { data, quadra, hora } = await searchParams;
  const hoje = hojeEmSaoPaulo();
  // As faixas só servem para a prévia do valor; sem elas, a reserva funciona igual.
  const [quadras, faixas] = await Promise.all([
    chamarApi<Quadra[]>("/horarios/quadras"),
    chamarApi<Faixa[]>("/horarios/faixas"),
  ]);
  const horaPedida = typeof hora === "string" && /^\d{1,2}$/.test(hora) ? hora : "";
  return (
    <>
      <Cabecalho
        etiqueta="Quadras de areia"
        icone="horarios"
        titulo={
          <>
            Nova <Destaque>reserva</Destaque>
          </>
        }
        descricao="Escolha a quadra, o dia e a hora. O resumo mostra o ingresso e o valor antes de reservar."
      />
      {!quadras.ok ? (
        <Aviso tipo="erro">{quadras.mensagem}</Aviso>
      ) : (
        <FormReserva
          quadras={quadras.dados}
          faixas={faixas.ok ? faixas.dados : null}
          hoje={hoje}
          admin={usuario.perfil === "ADMINISTRADOR"}
          inicial={{
            data: typeof data === "string" && DATA.test(data) ? data : hoje,
            quadraId: typeof quadra === "string" ? quadra : (quadras.dados[0]?.id ?? ""),
            horaInicio: horaPedida,
          }}
        />
      )}
    </>
  );
}
