import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import {
  AcessoNegado,
  Aviso,
  classeBotao,
  classeBotaoSecundario,
  classeCampo,
} from "@/components/ui";
import {
  filtroAuditoria,
  formatarDataHora,
  linkPagina,
  ROTULOS_ACOES,
  TAMANHO_PAGINA,
} from "@/lib/acesso/auditoria";
import { chamarApi } from "@/lib/servidor/api";
import { exigirArea } from "@/lib/servidor/sessao";

export const metadata: Metadata = { title: "Auditoria | Só Dois Toques" };

type Registro = {
  id: string;
  criadaEm: string;
  acao: keyof typeof ROTULOS_ACOES;
  atorId: string | null;
  atorNome: string | null;
  alvoTipo: string | null;
  alvoId: string | null;
  ip: string | null;
  detalhes: unknown;
};
type Pagina = { total: number; pagina: number; tamanho: number; itens: Registro[] };

export default async function PaginaAuditoria({ searchParams }: PageProps<"/auditoria">) {
  await connection();
  const { permitido } = await exigirArea("auditoria");
  if (!permitido) return <AcessoNegado />;

  const { filtro, consulta } = filtroAuditoria(await searchParams);
  const [registros, usuarios] = await Promise.all([
    chamarApi<Pagina>(`/auditoria?${consulta.toString()}`),
    chamarApi<{ id: string; nome: string; email: string }[]>("/usuarios"),
  ]);
  const totalPaginas = registros.ok
    ? Math.max(1, Math.ceil(registros.dados.total / TAMANHO_PAGINA))
    : 1;

  return (
    <>
      <h1 className="text-2xl font-semibold">Auditoria</h1>
      <form
        method="get"
        className="border-borda bg-cartao grid gap-3 rounded-2xl border p-4 sm:grid-cols-5 sm:items-end"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="inicio" className="text-sm font-medium">
            De
          </label>
          <input
            id="inicio"
            name="inicio"
            type="date"
            defaultValue={filtro.inicio}
            className={classeCampo}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="fim" className="text-sm font-medium">
            Até
          </label>
          <input
            id="fim"
            name="fim"
            type="date"
            defaultValue={filtro.fim}
            className={classeCampo}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="usuarioId" className="text-sm font-medium">
            Usuário
          </label>
          <select
            id="usuarioId"
            name="usuarioId"
            defaultValue={filtro.usuarioId ?? ""}
            className={classeCampo}
          >
            <option value="">Todos</option>
            {usuarios.ok &&
              usuarios.dados.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.email})
                </option>
              ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="acao" className="text-sm font-medium">
            Ação
          </label>
          <select id="acao" name="acao" defaultValue={filtro.acao ?? ""} className={classeCampo}>
            <option value="">Todas</option>
            {Object.entries(ROTULOS_ACOES).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className={classeBotao}>
          Filtrar
        </button>
      </form>

      {!registros.ok ? (
        <Aviso tipo="erro">{registros.mensagem}</Aviso>
      ) : registros.dados.itens.length === 0 ? (
        <p className="text-suave">Nenhum registro encontrado.</p>
      ) : (
        <>
          <p className="text-suave text-sm">{registros.dados.total} registro(s)</p>
          <ul className="divide-borda flex flex-col divide-y" aria-label="Registros de auditoria">
            {registros.dados.itens.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4">
                <span className="text-suave text-sm whitespace-nowrap tabular-nums">
                  {formatarDataHora(r.criadaEm)}
                </span>
                <span className="flex-1">
                  <strong className="font-medium">{ROTULOS_ACOES[r.acao] ?? r.acao}</strong>
                  {" · "}
                  {r.atorNome ?? "Sistema ou visitante"}
                  {r.ip && <span className="text-apagado"> · IP {r.ip}</span>}
                  {r.detalhes !== null && (
                    <span className="text-apagado block text-xs break-all">
                      {JSON.stringify(r.detalhes)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <nav aria-label="Páginas" className="flex items-center gap-3">
            {filtro.pagina > 1 && (
              <Link href={linkPagina(filtro, filtro.pagina - 1)} className={classeBotaoSecundario}>
                Anterior
              </Link>
            )}
            <span className="text-sm">
              Página {filtro.pagina} de {totalPaginas}
            </span>
            {filtro.pagina < totalPaginas && (
              <Link href={linkPagina(filtro, filtro.pagina + 1)} className={classeBotaoSecundario}>
                Próxima
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  );
}
