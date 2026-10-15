"use client";

import { useActionState } from "react";
import { salvarAluno } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { CampoTelefone } from "@/components/base/campos-com-mascara";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import { Aviso, Campo, classeCampo, classeRotulo } from "@/components/ui";
import { formatarTelefone } from "@/lib/aulas/formatacao";
import type { AlunoDetalhe } from "@/lib/aulas/tipos";
import { GrupoDoFormulario as Grupo } from "./grupo-do-formulario";

export function FormAluno({ aluno }: { aluno?: AlunoDetalhe }) {
  const [estado, acao, enviando] = useActionState(salvarAluno, ESTADO_INICIAL);
  // Depois de um erro, os campos voltam ao que foi digitado, não ao cadastro salvo.
  const valor = (campo: string, salvo?: string | null) => estado.valores?.[campo] ?? salvo ?? "";
  return (
    <form action={acao} className="flex flex-col gap-4">
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      {aluno && <input type="hidden" name="id" value={aluno.id} />}
      <Grupo legenda="Dados do aluno" icone="pessoa">
        <Campo
          rotulo="Nome"
          id="nome"
          icone="pessoa"
          required
          minLength={2}
          maxLength={120}
          defaultValue={valor("nome", aluno?.nome)}
          autoComplete="off"
        />
        <CampoTelefone
          rotulo="Telefone (com DDD)"
          id="telefone"
          required
          defaultValue={valor("telefone", formatarTelefone(aluno?.telefone))}
        />
        <Campo
          rotulo="Data de nascimento"
          id="nascimento"
          icone="calendario"
          type="date"
          required
          defaultValue={valor("nascimento", aluno?.nascimento)}
        />
        <Campo
          rotulo="E-mail (opcional)"
          id="email"
          icone="email"
          type="email"
          maxLength={254}
          defaultValue={valor("email", aluno?.email)}
          autoComplete="off"
        />
      </Grupo>
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Grupo
          legenda="Contato de emergência"
          icone="alerta"
          tom="perigo"
          dica="Quem avisar se algo acontecer na quadra."
        >
          <Campo
            rotulo="Nome do contato"
            id="emergenciaNome"
            required
            maxLength={120}
            defaultValue={valor("emergenciaNome", aluno?.emergenciaNome)}
          />
          <CampoTelefone
            rotulo="Telefone do contato"
            id="emergenciaTelefone"
            required
            defaultValue={valor("emergenciaTelefone", formatarTelefone(aluno?.emergenciaTelefone))}
          />
        </Grupo>
        <Grupo
          legenda="Responsável (obrigatório para menores de 18 anos)"
          icone="usuarios"
          tom="areia"
        >
          <Campo
            rotulo="Nome do responsável"
            id="responsavelNome"
            maxLength={120}
            defaultValue={valor("responsavelNome", aluno?.responsavelNome)}
          />
          <CampoTelefone
            rotulo="Telefone do responsável"
            id="responsavelTelefone"
            defaultValue={valor(
              "responsavelTelefone",
              formatarTelefone(aluno?.responsavelTelefone),
            )}
          />
        </Grupo>
      </div>
      <div className="superficie flex flex-col gap-1.5 rounded-[1.75rem] p-5 sm:p-6">
        <label htmlFor="observacoes" className={classeRotulo}>
          Observações (opcional)
        </label>
        <textarea
          id="observacoes"
          name="observacoes"
          maxLength={500}
          rows={3}
          className={`${classeCampo} py-3`}
          defaultValue={valor("observacoes", aluno?.observacoes)}
        />
        <p className="text-apagado text-xs">Não registre aqui dados de saúde detalhados.</p>
      </div>
      {!aluno && (
        <label className="group border-borda bg-elevado/40 has-checked:border-sucesso/50 has-checked:bg-sucesso/8 flex cursor-pointer items-start gap-4 rounded-[1.5rem] border p-4 text-sm transition-colors duration-300">
          <span className="bg-elevado text-suave group-has-checked:bg-sucesso/20 group-has-checked:text-sucesso grid size-10 shrink-0 place-items-center rounded-2xl transition-colors">
            <Icone nome="escudo" width={19} height={19} />
          </span>
          <span className="flex-1">
            O aluno (ou o responsável, se for menor de 18 anos) autorizou o uso destes dados para a
            organização das aulas.
          </span>
          <input
            type="checkbox"
            name="consentimento"
            className="mt-1 size-5 shrink-0"
            defaultChecked={estado.valores?.consentimento === "on"}
          />
        </label>
      )}
      <div>
        <BotaoEnviar
          enviando={enviando}
          textoEnviando="Salvando..."
          icone={<Icone nome="check" width={18} height={18} strokeWidth={2.4} />}
        >
          Salvar aluno
        </BotaoEnviar>
      </div>
    </form>
  );
}
