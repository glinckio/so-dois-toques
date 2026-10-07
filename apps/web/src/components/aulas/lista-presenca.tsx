"use client";

import { useActionState, useState } from "react";
import { salvarPresenca } from "@/app/acoes/aulas";
import { ESTADO_INICIAL } from "@/app/acoes/estado";
import { Avatar } from "@/components/base/avatar";
import { BotaoEnviar } from "@/components/base/enviar";
import { Icone } from "@/components/icones";
import { Aviso, classeBotaoSecundario } from "@/components/ui";
import { contarPresenca, type Marca } from "@/lib/aulas/presenca";
import type { ListaPresenca as Lista } from "@/lib/aulas/tipos";
import { AnelDaPresenca } from "./anel-da-presenca";

/**
 * AULAS-CA-17 e VIVO-CA-09: a presença feita para tocar com uma mão na quadra. No
 * topo, o anel e o contador acompanham cada toque; cada aluno é um cartão grande
 * com Presente e Ausente, e a marca se desenha quando escolhida; a barra de salvar
 * fica presa embaixo (no celular, acima da barra de abas).
 */
export function ListaPresenca({ lista }: { lista: Lista }) {
  const [estado, acao, enviando] = useActionState(salvarPresenca, ESTADO_INICIAL);
  const [marcas, setMarcas] = useState<Record<string, Marca | undefined>>(() =>
    Object.fromEntries(
      lista.alunos.map((a) => [
        a.alunoId,
        a.presente === null ? undefined : a.presente ? "presente" : "ausente",
      ]),
    ),
  );
  const contagem = contarPresenca(lista.alunos.map((a) => marcas[a.alunoId]));
  const marcar = (alunoId: string, marca: Marca) =>
    setMarcas((atuais) => ({ ...atuais, [alunoId]: marca }));
  const todosPresentes = () =>
    setMarcas(Object.fromEntries(lista.alunos.map((a) => [a.alunoId, "presente" as const])));

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="turmaId" value={lista.turmaId} />
      <input type="hidden" name="data" value={lista.data} />

      <section
        aria-label="Resumo da presença"
        className="superficie-destaque relative flex flex-col items-center gap-5 overflow-hidden rounded-[2rem] p-5 sm:flex-row sm:p-6"
      >
        <span
          aria-hidden="true"
          className="bg-sucesso/10 pointer-events-none absolute -top-20 -left-16 size-64 rounded-full blur-3xl"
        />
        <AnelDaPresenca contagem={contagem} />
        <div className="relative flex w-full min-w-0 flex-1 flex-col gap-3 max-sm:items-center max-sm:text-center">
          <p
            className="text-2xl font-extrabold tracking-tight tabular-nums sm:text-3xl"
            data-testid="contador-presenca"
            aria-live="polite"
          >
            {contagem.texto}
          </p>
          <ul className="flex flex-wrap gap-2 max-sm:justify-center" aria-label="Contagem">
            <li className="bg-sucesso/12 text-sucesso inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
              <Icone nome="check" width={13} height={13} strokeWidth={3} />
              {contagem.presentes} {contagem.presentes === 1 ? "presente" : "presentes"}
            </li>
            <li className="bg-perigo/12 text-perigo inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
              <Icone nome="fechar" width={13} height={13} strokeWidth={3} />
              {contagem.ausentes} {contagem.ausentes === 1 ? "ausente" : "ausentes"}
            </li>
            <li className="bg-elevado text-suave inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
              <span
                className="border-apagado size-2.5 rounded-full border border-dashed"
                aria-hidden="true"
              />
              {contagem.semMarca} sem marcar
            </li>
          </ul>
          {lista.ativa && contagem.presentes < contagem.total && (
            <button
              type="button"
              onClick={todosPresentes}
              className={`${classeBotaoSecundario} self-start max-sm:self-center`}
            >
              <Icone
                nome="check"
                width={17}
                height={17}
                strokeWidth={2.4}
                className="text-sucesso"
              />
              Marcar todos como presentes
            </button>
          )}
          {!lista.ativa && (
            <p className="text-apagado text-sm">
              A turma está encerrada: a lista é só para consulta.
            </p>
          )}
        </div>
      </section>

      <ul className="grid gap-3 md:grid-cols-2" aria-label="Lista de presença">
        {lista.alunos.map((a, i) => (
          <CartaoDoAluno
            key={a.alunoId}
            indice={i}
            aluno={a}
            marca={marcas[a.alunoId]}
            ativa={lista.ativa}
            aoMarcar={(m) => marcar(a.alunoId, m)}
          />
        ))}
      </ul>

      {lista.ativa && lista.alunos.length > 0 && (
        <div className="sticky bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.5rem)] z-20 flex flex-col gap-2 lg:bottom-4">
          {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
          {estado.sucesso && <Aviso tipo="sucesso">{estado.sucesso}</Aviso>}
          <div className="vidro flex items-center gap-3 rounded-full py-2 pr-2 pl-5 shadow-[0_20px_50px_-12px_rgb(0_0_0_/_0.9)]">
            <span className="text-suave min-w-0 flex-1 truncate text-sm font-semibold">
              {contagem.semMarca === 0 ? (
                <span className="text-sucesso inline-flex items-center gap-1.5">
                  <Icone nome="check" width={15} height={15} strokeWidth={3} />
                  Todos marcados
                </span>
              ) : (
                `Falta marcar ${contagem.semMarca}`
              )}
            </span>
            <BotaoEnviar enviando={enviando} textoEnviando="Salvando...">
              Salvar presença
            </BotaoEnviar>
          </div>
        </div>
      )}
    </form>
  );
}

function CartaoDoAluno({
  aluno,
  marca,
  ativa,
  indice,
  aoMarcar,
}: {
  aluno: Lista["alunos"][number];
  marca: Marca | undefined;
  ativa: boolean;
  indice: number;
  aoMarcar: (marca: Marca) => void;
}) {
  const moldura =
    marca === "presente"
      ? "border-sucesso/45 bg-sucesso/[0.06]"
      : marca === "ausente"
        ? "border-perigo/40 bg-perigo/[0.05]"
        : "border-borda bg-cartao";
  return (
    <li
      className={`animate-entrar flex flex-col gap-3 rounded-[1.6rem] border p-4 transition-colors duration-300 atraso-${Math.min(24, indice + 2)} ${moldura}`}
    >
      <div className="flex items-center gap-3">
        <Avatar nome={aluno.nome} tamanho="g" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-lg font-bold">{aluno.nome}</span>
          {aluno.registradaPor ? (
            <span className="text-apagado truncate text-xs">Marcado por {aluno.registradaPor}</span>
          ) : (
            <span className="text-apagado text-xs">Ainda sem registro</span>
          )}
        </span>
        <MarcaDesenhada marca={marca} />
      </div>
      {marca && <input type="hidden" name={`presenca:${aluno.alunoId}`} value={marca} />}
      <div className="grid grid-cols-2 gap-2" role="group" aria-label={`Presença de ${aluno.nome}`}>
        {(["presente", "ausente"] as const).map((valor) => {
          const escolhido = marca === valor;
          const presente = valor === "presente";
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={escolhido}
              disabled={!ativa}
              onClick={() => aoMarcar(valor)}
              className={`ease-mola inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border text-base font-bold transition duration-200 select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 ${
                escolhido
                  ? presente
                    ? "border-sucesso bg-sucesso text-fundo shadow-[0_10px_26px_-12px_rgb(52_211_153_/_0.9)]"
                    : "border-perigo bg-perigo text-fundo shadow-[0_10px_26px_-12px_rgb(248_113_113_/_0.9)]"
                  : "border-borda bg-elevado/50 text-suave hover:text-texto hover:border-[#3a2f6b]"
              }`}
            >
              <Icone
                key={`${valor}-${escolhido}`}
                nome={presente ? "check" : "fechar"}
                width={18}
                height={18}
                strokeWidth={2.6}
                className={escolhido ? "animate-marcar" : ""}
              />
              {presente ? "Presente" : "Ausente"}
            </button>
          );
        })}
      </div>
    </li>
  );
}

/**
 * A marca do aluno no canto do cartão: um "check" verde ou um "x" vermelho que se
 * desenham ao tocar (o traço remonta a cada troca e a animação recomeça); sem marca,
 * um círculo tracejado.
 */
function MarcaDesenhada({ marca }: { marca: Marca | undefined }) {
  if (!marca) {
    return (
      <span
        className="border-borda size-11 shrink-0 rounded-full border-2 border-dashed"
        aria-hidden="true"
      />
    );
  }
  const presente = marca === "presente";
  return (
    <span
      key={marca}
      aria-hidden="true"
      className={`animate-marcar grid size-11 shrink-0 place-items-center rounded-full ${
        presente ? "bg-sucesso/20 text-sucesso" : "bg-perigo/20 text-perigo"
      }`}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
        {presente ? (
          <path
            d="m5 12.5 4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={100}
            strokeDasharray="100 200"
            className="animate-desenhar [animation-delay:80ms]"
          />
        ) : (
          <>
            <path
              d="M7 7l10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100 200"
              className="animate-desenhar [animation-delay:80ms]"
            />
            <path
              d="M17 7 7 17"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100 200"
              className="animate-desenhar [animation-delay:260ms]"
            />
          </>
        )}
      </svg>
    </span>
  );
}
