import type { Metadata } from "next";
import { connection } from "next/server";
import { Cabecalho, Destaque } from "@/components/base/cabecalho";
import { FormBloqueio } from "@/components/horarios/form-bloqueio";
import { AcessoNegado, Aviso } from "@/components/ui";
import { hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { Quadra } from "@/lib/horarios/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Bloquear horário | Só Dois Toques" };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

/** FOCO-CA-06 e 08, GASTO-CA-02: o administrador bloqueia uma quadra num dia ou toda semana. */
export default async function PaginaBloquear({ searchParams }: PageProps<"/horarios/bloquear">) {
  await connection();
  const { usuario } = await exigirArea("horarios");
  if (usuario.perfil !== "ADMINISTRADOR") return <AcessoNegado />;
  const { data, hora, quadra } = await searchParams;
  const hoje = hojeEmSaoPaulo();
  const quadras = await chamarApi<Quadra[]>("/horarios/quadras");
  if (!quadras.ok) return <Aviso tipo="erro">{quadras.mensagem}</Aviso>;
  const ativas = quadras.dados.filter((q) => q.ativa);
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
        quadras={ativas}
        inicial={{
          quadraId:
            typeof quadra === "string" && ativas.some((q) => q.id === quadra) ? quadra : undefined,
          data: typeof data === "string" && DATA.test(data) ? data : hoje,
          horaInicio: typeof hora === "string" && /^\d{1,2}$/.test(hora) ? hora : "",
        }}
      />
    </>
  );
}
