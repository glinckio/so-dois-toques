import type { Metadata } from "next";
import { connection } from "next/server";
import { FormReserva } from "@/components/horarios/form-reserva";
import { Aviso } from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { Quadra } from "@/lib/horarios/tipos";
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
  const quadras = await chamarApi<Quadra[]>("/horarios/quadras");
  const horaPedida = typeof hora === "string" && /^\d{1,2}$/.test(hora) ? hora : "";
  return (
    <>
      <h1 className="text-2xl font-semibold">Nova reserva</h1>
      {!quadras.ok ? (
        <Aviso tipo="erro">{quadras.mensagem}</Aviso>
      ) : (
        <FormReserva
          quadras={quadras.dados}
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
