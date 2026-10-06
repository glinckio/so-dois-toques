"use client";

import { useActionState } from "react";
import { salvarAluno } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Aviso, Campo, classeBotao, classeCampo } from "@/components/ui";
import { formatarTelefone } from "@/lib/aulas/formatacao";
import type { AlunoDetalhe } from "@/lib/aulas/tipos";

export function FormAluno({ aluno }: { aluno?: AlunoDetalhe }) {
  const [estado, acao, enviando] = useActionState(salvarAluno, ESTADO_INICIAL);
  // Depois de um erro, os campos voltam ao que foi digitado, não ao cadastro salvo.
  const valor = (campo: string, salvo?: string | null) => estado.valores?.[campo] ?? salvo ?? "";
  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {aluno && <input type="hidden" name="id" value={aluno.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Nome"
          id="nome"
          required
          minLength={2}
          maxLength={120}
          defaultValue={valor("nome", aluno?.nome)}
          autoComplete="off"
        />
        <Campo
          rotulo="Telefone (com DDD)"
          id="telefone"
          type="tel"
          inputMode="tel"
          required
          placeholder="(21) 99999-9999"
          defaultValue={valor("telefone", formatarTelefone(aluno?.telefone))}
          autoComplete="off"
        />
        <Campo
          rotulo="Data de nascimento"
          id="nascimento"
          type="date"
          required
          defaultValue={valor("nascimento", aluno?.nascimento)}
        />
        <Campo
          rotulo="E-mail (opcional)"
          id="email"
          type="email"
          maxLength={254}
          defaultValue={valor("email", aluno?.email)}
          autoComplete="off"
        />
      </div>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">Contato de emergência</legend>
        <Campo
          rotulo="Nome do contato"
          id="emergenciaNome"
          required
          maxLength={120}
          defaultValue={valor("emergenciaNome", aluno?.emergenciaNome)}
        />
        <Campo
          rotulo="Telefone do contato"
          id="emergenciaTelefone"
          type="tel"
          inputMode="tel"
          required
          defaultValue={valor("emergenciaTelefone", formatarTelefone(aluno?.emergenciaTelefone))}
        />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-medium">
          Responsável (obrigatório para menores de 18 anos)
        </legend>
        <Campo
          rotulo="Nome do responsável"
          id="responsavelNome"
          maxLength={120}
          defaultValue={valor("responsavelNome", aluno?.responsavelNome)}
        />
        <Campo
          rotulo="Telefone do responsável"
          id="responsavelTelefone"
          type="tel"
          inputMode="tel"
          defaultValue={valor("responsavelTelefone", formatarTelefone(aluno?.responsavelTelefone))}
        />
      </fieldset>
      <div className="flex flex-col gap-1">
        <label htmlFor="observacoes" className="text-sm font-medium">
          Observações (opcional)
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          maxLength={500}
          rows={3}
          className={`${classeCampo} py-2`}
          defaultValue={valor("observacoes", aluno?.observacoes)}
        />
        <p className="text-xs opacity-70">Não registre aqui dados de saúde detalhados.</p>
      </div>
      {!aluno && (
        <label className="flex items-start gap-3 rounded-md border border-current/15 p-3 text-sm">
          <input
            type="checkbox"
            name="consentimento"
            className="mt-1 size-5"
            defaultChecked={estado.valores?.consentimento === "on"}
          />
          <span>
            O aluno (ou o responsável, se for menor de 18 anos) autorizou o uso destes dados para a
            organização das aulas.
          </span>
        </label>
      )}
      <button type="submit" className={`${classeBotao} self-start`} disabled={enviando}>
        {enviando ? "Salvando..." : "Salvar aluno"}
      </button>
    </form>
  );
}
