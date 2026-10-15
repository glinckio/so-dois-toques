import type { Metadata } from "next";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { FormBloqueio } from "@/components/horarios/form-bloqueio";
import { AcessoNegado } from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Bloquear horário | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** FOCO-CA-06 e 08: o administrador bloqueia a quadra num dia ou toda semana. */
export default async function PaginaBloquear({ searchParams }: PageProps<"/horarios/bloquear">) {
  await connection();
  const { usuario } = await exigirArea("horarios");
  if (usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const { data, hora } = await searchParams;
  const hoje = hojeEmSaoPaulo();
  return (
    <>
      <Cabecalho
        etiqueta="Quadra"
        icone="bloqueio"
        titulo={
          <>
            Bloquear <Destaque>horário</Destaque>
          </>
        }
        descricao="Feche a quadra para manutenção ou evento. Horário com aula de turma não pode ser bloqueado."
      />
      <FormBloqueio
        hoje={hoje}
        inicial={{
          data: typeof data === "string" && DATA.test(data) ? data : hoje,
          horaInicio: typeof hora === "string" && /^\d{1,2}$/.test(hora) ? hora : "",
        }}
      />
    </>
  );
}
