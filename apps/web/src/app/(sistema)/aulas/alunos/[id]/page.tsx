import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { LinkVoltar } from "@/components/aulas/link-voltar";
import type { ReactNode } from "react";
import { inativarAluno, reativarAluno } from "@/app/acoes/aulas";
import { encerrarAssinatura } from "@/app/acoes/mensalidades";
import { FormAnonimizar } from "@/components/aulas/form-anonimizar";
import { SeloNivel } from "@/components/aulas/selo-nivel";
import { Avatar } from "@/components/base/avatar";
import { Cartao, CabecalhoCartao } from "@/components/base/cartao";
import { Selo } from "@/components/base/selo";
import { Valor } from "@/components/base/valor";
import { Vazio } from "@/components/base/vazio";
import { BotaoAcao } from "@/components/botao-acao";
import { Icone, type NomeIcone } from "@/components/icones";
import { FormAssinatura } from "@/components/mensalidades/form-assinatura";
import {
  AcessoNegado,
  Aviso,
  classeBotaoFantasma,
  classeBotaoPerigo,
  classeBotaoSecundario,
} from "@/components/ui";
import { formatarData, formatarTelefone, hojeEmSaoPaulo } from "@/lib/aulas/formatacao";
import type { AlunoDetalhe } from "@/lib/aulas/tipos";
import { idadeEm, linkDoWhatsApp } from "@/lib/aulas/visual";
import { formatarDataHora } from "@/lib/acesso/auditoria";
import {
  competenciaAtual,
  deslocarMes,
  formatarReais,
  nomeDoMes,
} from "@/lib/mensalidades/formatacao";
import type { Assinaturas, Plano } from "@/lib/mensalidades/tipos";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Aluno | Só Dois Toques" };

const classeAtalho =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[0.95rem] font-semibold transition duration-200 ease-mola select-none active:scale-[0.97]";

function Dado({ icone, rotulo, valor }: { icone: NomeIcone; rotulo: string; valor: ReactNode }) {
  if (!valor) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl px-2 py-2.5">
      <span className="bg-elevado text-suave grid size-9 shrink-0 place-items-center rounded-xl">
        <Icone nome={icone} width={17} height={17} />
      </span>
      <div className="flex min-w-0 flex-col">
        <dt className="text-apagado text-xs font-semibold">{rotulo}</dt>
        <dd className="break-words">{valor}</dd>
      </div>
    </div>
  );
}

/**
 * O aluno: cartão de perfil com avatar grande e os atalhos de WhatsApp e ligação,
 * os dados, as turmas e, para o administrador, o plano e o cadastro.
 */
export default async function PaginaAluno({
  params,
  searchParams,
}: PageProps<"/aulas/alunos/[id]">) {
  await connection();
  const { usuario, permitido } = await exigirArea("aulas");
  if (!permitido) return <AcessoNegado />;
  const { id } = await params;
  const { salvo } = await searchParams;
  const resposta = await chamarApi<AlunoDetalhe>(`/alunos/${encodeURIComponent(id)}`);
  if (!resposta.ok) return <Aviso tipo="erro">{resposta.mensagem}</Aviso>;
  const aluno = resposta.dados;
  const admin = usuario.perfil === "ADMINISTRADOR";
  const whatsapp = aluno.anonimizado ? null : linkDoWhatsApp(aluno.telefone);
  const idade = idadeEm(aluno.nascimento, hojeEmSaoPaulo());
  const abertas = aluno.matriculas.filter((m) => !m.fim).length;

  return (
    <>
      {salvo && <Aviso tipo="sucesso">Aluno salvo.</Aviso>}
      <LinkVoltar href="/aulas/alunos">Voltar para os alunos</LinkVoltar>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="flex flex-col gap-4">
          <header className="superficie-destaque relative flex flex-col items-center gap-4 overflow-hidden rounded-[2rem] p-6 text-center sm:p-8">
            <span
              aria-hidden="true"
              className="bg-roxo/30 pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full blur-3xl"
            />
            <span className="relative">
              <span
                aria-hidden="true"
                className="from-roxo to-ouro absolute -inset-1.5 rounded-full bg-linear-to-br opacity-70"
              />
              <span aria-hidden="true" className="bg-cartao absolute -inset-0.5 rounded-full" />
              <Avatar nome={aluno.nome} tamanho="gg" className="relative" />
            </span>
            <div className="relative flex flex-col items-center gap-2">
              <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-balance">
                {aluno.nome}
              </h1>
              <p className="flex flex-wrap justify-center gap-2">
                {aluno.anonimizado ? (
                  <Selo tom="neutro">Anonimizado</Selo>
                ) : aluno.ativo ? (
                  <Selo tom="sucesso">Ativo</Selo>
                ) : (
                  <Selo tom="neutro">Inativo</Selo>
                )}
                {!aluno.anonimizado && (
                  <Selo tom="roxo" semPonto>
                    {abertas === 0
                      ? "sem turma"
                      : `${abertas} ${abertas === 1 ? "turma" : "turmas"}`}
                  </Selo>
                )}
              </p>
              {!aluno.anonimizado && aluno.telefone && (
                <p className="text-suave inline-flex items-center gap-1.5 tabular-nums">
                  <Icone nome="telefone" width={16} height={16} />
                  {formatarTelefone(aluno.telefone)}
                </p>
              )}
            </div>
            {whatsapp && (
              <div className="relative flex flex-wrap justify-center gap-2">
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${classeAtalho} border-sucesso/40 bg-sucesso/15 text-sucesso hover:bg-sucesso/25 border shadow-[0_12px_30px_-16px_rgb(52_211_153_/_0.9)]`}
                >
                  <Icone nome="whatsapp" width={19} height={19} />
                  WhatsApp
                  <span className="sr-only"> (abre em nova aba)</span>
                </a>
                <a
                  href={`tel:+55${aluno.telefone.replace(/\D/g, "")}`}
                  className={`${classeAtalho} border-borda bg-elevado/60 hover:border-roxo/50 border`}
                >
                  <Icone nome="telefone" width={18} height={18} />
                  Ligar
                </a>
              </div>
            )}
          </header>

          {!aluno.anonimizado && (
            <Cartao aria-labelledby="titulo-dados" className="flex flex-col gap-3">
              <CabecalhoCartao id="titulo-dados" icone="pessoa" titulo="Dados do aluno" />
              <dl className="flex flex-col">
                <Dado
                  icone="calendario"
                  rotulo="Nascimento"
                  valor={
                    aluno.nascimento &&
                    `${formatarData(aluno.nascimento)}${idade !== null ? ` · ${idade} anos` : ""}`
                  }
                />
                <Dado icone="email" rotulo="E-mail" valor={aluno.email} />
                <Dado
                  icone="alerta"
                  rotulo="Contato de emergência"
                  valor={
                    aluno.emergenciaNome &&
                    `${aluno.emergenciaNome}, ${formatarTelefone(aluno.emergenciaTelefone)}`
                  }
                />
                <Dado
                  icone="usuarios"
                  rotulo="Responsável"
                  valor={
                    aluno.responsavelNome &&
                    `${aluno.responsavelNome}, ${formatarTelefone(aluno.responsavelTelefone)}`
                  }
                />
                <Dado icone="lista" rotulo="Observações" valor={aluno.observacoes} />
                {aluno.consentimentoEm && (
                  <Dado
                    icone="escudo"
                    rotulo="Consentimento"
                    valor={`Dado pelo ${aluno.consentimentoPor === "RESPONSAVEL" ? "responsável" : "aluno"} em ${formatarDataHora(aluno.consentimentoEm)}, registrado por ${aluno.consentimentoRegistradoPor}`}
                  />
                )}
              </dl>
            </Cartao>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <Cartao aria-labelledby="titulo-turmas" className="flex flex-col gap-3">
            <CabecalhoCartao
              id="titulo-turmas"
              icone="aulas"
              titulo="Turmas"
              descricao={
                aluno.matriculas.length === 0
                  ? undefined
                  : `${abertas} ${abertas === 1 ? "matrícula aberta" : "matrículas abertas"}`
              }
            />
            {aluno.matriculas.length === 0 ? (
              <Vazio compacto titulo="Sem matrículas.">
                A matrícula é feita na página da turma.
              </Vazio>
            ) : (
              <ul className="flex flex-col gap-1" aria-label="Matrículas">
                {aluno.matriculas.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/aulas/turmas/${m.turma.id}`}
                      className={`group hover:bg-elevado/60 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl px-2 py-2.5 transition-colors ${m.fim ? "opacity-70" : ""}`}
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-semibold group-hover:underline">
                          {m.turma.nome}
                        </span>
                        <span className="text-apagado text-sm">
                          desde {formatarData(m.inicio)}
                          {m.fim ? `, saiu em ${formatarData(m.fim)}` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <SeloNivel nivel={m.turma.nivel} />
                        {m.fim && <Selo tom="neutro">encerrada</Selo>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          {admin && <SecaoPlano alunoId={aluno.id} ativo={aluno.ativo && !aluno.anonimizado} />}
        </div>
      </div>

      {admin && !aluno.anonimizado && (
        <section
          aria-labelledby="titulo-cadastro"
          className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
        >
          <Cartao className="flex flex-col gap-4">
            <CabecalhoCartao
              id="titulo-cadastro"
              icone="editar"
              tom="neutro"
              titulo="Cadastro"
              descricao="Alterar, inativar ou exportar os dados do aluno."
            />
            <div className="flex flex-wrap items-start gap-2">
              <Link href={`/aulas/alunos/${aluno.id}/editar`} className={classeBotaoSecundario}>
                <Icone nome="editar" width={17} height={17} />
                Editar
              </Link>
              {aluno.ativo ? (
                <BotaoAcao
                  acao={inativarAluno}
                  campos={{ id: aluno.id }}
                  rotulo="Inativar"
                  confirmar="Inativar o aluno? As matrículas abertas serão encerradas."
                  className={classeBotaoPerigo}
                />
              ) : (
                <BotaoAcao acao={reativarAluno} campos={{ id: aluno.id }} rotulo="Reativar" />
              )}
              <a
                href={`/aulas/alunos/${aluno.id}/exportar`}
                className={classeBotaoFantasma}
                download
              >
                <Icone nome="abaixo" width={17} height={17} />
                Exportar dados (LGPD)
              </a>
            </div>
          </Cartao>
          <FormAnonimizar id={aluno.id} />
        </section>
      )}
    </>
  );
}

/** MENS-CA-02 a 04: plano vigente, histórico e troca (só o administrador). */
async function SecaoPlano({ alunoId, ativo }: { alunoId: string; ativo: boolean }) {
  const [assinaturas, planos] = await Promise.all([
    chamarApi<Assinaturas>(`/alunos/${alunoId}/assinaturas`),
    chamarApi<Plano[]>("/planos"),
  ]);
  if (!assinaturas.ok) return <Aviso tipo="erro">{assinaturas.mensagem}</Aviso>;
  const { vigente, historico } = assinaturas.dados;
  const mesAtual = competenciaAtual();
  const meses = [0, 1, 2].map((n) => deslocarMes(mesAtual, n));
  const anteriores = historico.filter((a) => a.id !== vigente?.id);
  return (
    <Cartao aria-labelledby="titulo-plano" className="flex flex-col gap-4">
      <CabecalhoCartao id="titulo-plano" icone="recibo" tom="ouro" titulo="Plano" />
      {vigente ? (
        <div className="border-ouro/30 via-cartao to-cartao relative flex flex-col gap-3 overflow-hidden rounded-[1.5rem] border bg-linear-to-br from-[#2b2008] p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-ouro text-xs font-bold tracking-[0.14em] uppercase">
                Plano vigente
              </span>
              <span className="truncate text-lg font-bold">{vigente.plano.nome}</span>
            </div>
            <span
              className="border-ouro/35 flex shrink-0 flex-col items-center overflow-hidden rounded-xl border text-center"
              aria-hidden="true"
            >
              <span className="bg-ouro text-fundo w-full px-2 text-[0.6rem] font-extrabold tracking-wider uppercase">
                vence
              </span>
              <span className="px-2.5 py-0.5 text-lg font-extrabold tabular-nums">
                {vigente.diaVencimento}
              </span>
            </span>
          </div>
          <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Valor
              centavos={vigente.valorCentavos}
              className="text-3xl leading-none font-extrabold tracking-tight"
            />{" "}
            <span className="text-suave text-sm">
              por mês · vence todo dia {vigente.diaVencimento} · desde {nomeDoMes(vigente.inicio)}
            </span>
          </p>
          {vigente.descontoCentavos > 0 && (
            <p className="text-suave flex items-center gap-2 text-sm">
              <Icone nome="porcentagem" width={15} height={15} className="text-ouro" />
              Desconto de {formatarReais(vigente.descontoCentavos)}: {vigente.motivoDesconto}
            </p>
          )}
          <div className="flex">
            <BotaoAcao
              acao={encerrarAssinatura}
              campos={{ alunoId }}
              rotulo="Encerrar plano"
              confirmar="Encerrar o plano? O aluno deixa de receber mensalidade a partir do mês que vem."
              className={classeBotaoFantasma}
            />
          </div>
        </div>
      ) : (
        <p className="border-borda text-suave rounded-2xl border border-dashed px-4 py-3 text-sm">
          Sem plano: o aluno não recebe mensalidade.
        </p>
      )}
      {ativo && planos.ok && (
        <FormAssinatura alunoId={alunoId} planos={planos.dados} vigente={vigente} meses={meses} />
      )}
      {anteriores.length > 0 && (
        <details className="group">
          <summary className="text-roxo-claro hover:text-texto inline-flex min-h-10 items-center gap-2 text-sm font-semibold">
            <Icone
              nome="abaixo"
              width={16}
              height={16}
              className="transition-transform group-open:rotate-180"
            />
            Planos anteriores
          </summary>
          <ol className="animate-entrar border-borda mt-2 ml-2 flex flex-col gap-3 border-l pl-4 text-sm">
            {anteriores.map((a) => (
              <li key={a.id} className="relative">
                <span
                  aria-hidden="true"
                  className="bg-elevado border-borda absolute top-1.5 -left-[1.36rem] size-2.5 rounded-full border"
                />
                <span className="font-semibold">{a.plano.nome}</span> ·{" "}
                {formatarReais(a.valorCentavos)} · de {nomeDoMes(a.inicio)}
                {a.fim ? ` até antes de ${nomeDoMes(a.fim)}` : ""}
              </li>
            ))}
          </ol>
        </details>
      )}
    </Cartao>
  );
}
