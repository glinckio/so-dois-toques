"use client";

import { useActionState, useState } from "react";
import { salvarPresenca } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, classeBotao } from "@/components/ui";
import type { ListaPresenca as Lista } from "@/lib/aulas/tipos";

/** AULAS-CA-17: botões grandes de Presente e Ausente, para marcar com uma mão na quadra. */
export function ListaPresenca({ lista }: { lista: Lista }) {
  const [estado, acao, enviando] = useActionState(salvarPresenca, ESTADO_INICIAL);
  const [marcas, setMarcas] = useState<Record<string, "presente" | "ausente" | undefined>>(() =>
    Object.fromEntries(
      lista.alunos.map((a) => [
        a.alunoId,
        a.presente === null ? undefined : a.presente ? "presente" : "ausente",
      ]),
    ),
  );
  const presentes = Object.values(marcas).filter((m) => m === "presente").length;

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="turmaId" value={lista.turmaId} />
      <input type="hidden" name="data" value={lista.data} />
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
      <p className="text-sm opacity-80">
        {presentes} de {lista.alunos.length} presentes
      </p>
      <ul className="flex flex-col gap-2" aria-label="Lista de presença">
        {lista.alunos.map((a) => {
          const marca = marcas[a.alunoId];
          return (
            <li
              key={a.alunoId}
              className="flex flex-col gap-2 rounded-lg border border-current/15 p-3"
            >
              <span className="font-medium">{a.nome}</span>
              {marca && <input type="hidden" name={`presenca:${a.alunoId}`} value={marca} />}
              <div
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-label={`Presença de ${a.nome}`}
              >
                {(["presente", "ausente"] as const).map((valor) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={marca === valor}
                    disabled={!lista.ativa}
                    onClick={() => setMarcas((atuais) => ({ ...atuais, [a.alunoId]: valor }))}
                    className={`min-h-12 rounded-md border font-medium ${
                      marca === valor
                        ? valor === "presente"
                          ? "border-green-700 bg-green-700 text-white"
                          : "border-red-700 bg-red-700 text-white"
                        : "border-current/25"
                    }`}
                  >
                    {valor === "presente" ? "Presente" : "Ausente"}
                  </button>
                ))}
              </div>
              {a.registradaPor && (
                <span className="text-xs opacity-70">Marcado por {a.registradaPor}</span>
              )}
            </li>
          );
        })}
      </ul>
      {lista.ativa && lista.alunos.length > 0 && (
        <button type="submit" className={`${classeBotao} sticky bottom-3`} disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar presença"}
        </button>
      )}
    </form>
  );
}
